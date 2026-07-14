import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const { contentDetail, productIds, categoryIds, ...projectData } = createProjectDto;

    const existingProject = await this.prisma.project.findUnique({
      where: { slug: projectData.slug },
    });

    if (existingProject) {
      throw new ConflictException({
        message: 'Slug dự án đã tồn tại',
        errorCode: 'PROJECT_SLUG_EXISTS',
      });
    }

    const createData: Prisma.ProjectCreateInput = {
      ...projectData,
    };

    if (contentDetail) {
      createData.detail = {
        create: {
          contentDetail,
        },
      };
    }

    if (productIds && productIds.length > 0) {
      createData.products = {
        create: productIds.map(id => ({
          product: { connect: { id } }
        }))
      };
    }

    if (categoryIds && categoryIds.length > 0) {
      createData.categories = {
        create: categoryIds.map(id => ({
          category: { connect: { id } }
        }))
      };
    }

    const result = await this.prisma.project.create({
      data: createData,
      include: {
        detail: true,
        products: true,
        categories: true,
      },
    });

    try { 
      const keys = await this.redis.client.keys(CACHE_KEYS.PROJECTS.RECENT_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }

  async findAll(filterDto: GetProjectsFilterDto) {
    const { search, status } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (status !== undefined) {
      where.status = status;
    }

    const isCacheable = !search;
    const cacheKey = CACHE_KEYS.PROJECTS.GET_RECENT(skip, limit, status);

    if (isCacheable) {
      try {
        const cached = await this.redis.client.get(cacheKey);
        if (cached) {
          return cached as PageDto<any>;
        }
      } catch (e) {}
    }

    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // Do not include detail to optimize list fetching
      }),
      this.prisma.project.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto(total, filterDto, projects.length);
    const result = new PageDto(projects, pageMetaDto);

    if (isCacheable) {
      try {
        await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.SEVEN_DAYS });
      } catch (e) {}
    }

    return result;
  }

  async findOne(id: string) {
    const cacheKey = CACHE_KEYS.PROJECTS.DETAIL(id);
    
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        detail: true,
        products: { include: { product: true } },
        categories: { include: { category: true } },
      },
    });

    if (!project) {
      throw new NotFoundException({
        message: 'Không tìm thấy dự án',
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    // Flatten logic for output
    const formattedProject = {
      ...project,
      productIds: project.products.map(p => p.productId),
      categoryIds: project.categories.map(c => c.categoryId),
    };

    try {
      await this.redis.client.set(cacheKey, formattedProject, { ex: CACHE_TTL.SEVEN_DAYS });
    } catch (e) {}

    return formattedProject;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    await this.findOne(id); // Check existence

    const { contentDetail, productIds, categoryIds, ...projectData } = updateProjectDto;

    if (projectData.slug) {
      const existingProject = await this.prisma.project.findFirst({
        where: { slug: projectData.slug, id: { not: id } },
      });
      if (existingProject) {
        throw new ConflictException({
          message: 'Slug dự án đã tồn tại',
          errorCode: 'PROJECT_SLUG_EXISTS',
        });
      }
    }

    const updateData: Prisma.ProjectUpdateInput = {
      ...projectData,
    };

    if (contentDetail !== undefined) {
      updateData.detail = {
        upsert: {
          create: { contentDetail },
          update: { contentDetail },
        },
      };
    }

    if (productIds !== undefined) {
      updateData.products = {
        deleteMany: {}, // Clean existing
        create: productIds.map(pId => ({
          product: { connect: { id: pId } }
        }))
      };
    }

    if (categoryIds !== undefined) {
      updateData.categories = {
        deleteMany: {},
        create: categoryIds.map(cId => ({
          category: { connect: { id: cId } }
        }))
      };
    }

    const result = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    try {
      await this.redis.client.del(CACHE_KEYS.PROJECTS.DETAIL(id));
      const keys = await this.redis.client.keys(CACHE_KEYS.PROJECTS.RECENT_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    const result = await this.prisma.project.delete({
      where: { id },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.PROJECTS.DETAIL(id));
      const keys = await this.redis.client.keys(CACHE_KEYS.PROJECTS.RECENT_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }
}
