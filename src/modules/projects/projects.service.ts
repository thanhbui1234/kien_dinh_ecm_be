import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { generateSlug } from '../../common/utils/string.util';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const { contentDetail, productIds, categoryIds, images, ...projectData } = createProjectDto;

    if (!projectData.slug && projectData.name) {
      projectData.slug = generateSlug(projectData.name);
    }

    const existingProject = await this.prisma.project.findUnique({
      where: { slug: projectData.slug },
    });

    if (existingProject) {
      if (!createProjectDto.slug) {
        projectData.slug = `${projectData.slug}-${Date.now()}`;
      } else {
        throw new ConflictException({
          message: 'Slug dự án đã tồn tại',
          errorCode: 'PROJECT_SLUG_EXISTS',
        });
      }
    }

    const createData: Prisma.ProjectCreateInput = {
      ...projectData,
      slug: projectData.slug as string,
    };

    const hasDetail = !!contentDetail || (images && images.length > 0);
    if (hasDetail) {
      createData.detail = {
        create: {
          contentDetail: contentDetail ?? '',
          images: images ?? [],
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
    const { search, status, isFeatured } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (status !== undefined) {
      where.status = status === 'true' as any ? true : (status === 'false' as any ? false : status);
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true' as any ? true : (isFeatured === 'false' as any ? false : isFeatured);
    }

    const isCacheable = !search;
    const cacheKey = CACHE_KEYS.PROJECTS.GET_RECENT(skip, limit, status, isFeatured);

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

  async findOne(idOrSlug: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
    const cacheKey = CACHE_KEYS.PROJECTS.DETAIL(idOrSlug);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const project = await this.prisma.project.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        detail: true,
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnailUrl: true,
                price: true,
                isFeatured: true,
                status: true,
                categoryId: true,
                viewCount: true,
                createdAt: true,
              },
            },
          },
        },
        categories: true,
      },
    });

    if (!project) {
      throw new NotFoundException({
        message: 'Không tìm thấy dự án',
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const formattedProject = {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      coverImage: project.coverImage,
      status: project.status,
      isFeatured: project.isFeatured,
      createdAt: project.createdAt,
      detail: project.detail ? { contentDetail: project.detail.contentDetail } : null,
      images: project.detail?.images ?? [],
      productIds: project.products.map(p => p.productId),
      categoryIds: project.categories.map(c => c.categoryId),
      relatedProducts: project.products.map(p => p.product),
    };

    try {
      const otherKey = isUuid ? project.slug : project.id;
      await this.redis.client.set(cacheKey, formattedProject, { ex: CACHE_TTL.SEVEN_DAYS });
      await this.redis.client.set(CACHE_KEYS.PROJECTS.DETAIL(otherKey), formattedProject, { ex: CACHE_TTL.SEVEN_DAYS });
    } catch (e) {}

    return formattedProject;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const existing = await this.findOne(id);

    const { contentDetail, productIds, categoryIds, images, ...projectData } = updateProjectDto;

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

    if (contentDetail !== undefined || images !== undefined) {
      updateData.detail = {
        upsert: {
          create: {
            contentDetail: contentDetail ?? '',
            images: images ?? [],
          },
          update: {
            ...(contentDetail !== undefined && { contentDetail }),
            ...(images !== undefined && { images }),
          },
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
      await this.redis.client.del(CACHE_KEYS.PROJECTS.DETAIL((existing as any).slug));
      if (result.slug !== (existing as any).slug) {
        await this.redis.client.del(CACHE_KEYS.PROJECTS.DETAIL(result.slug));
      }
      const keys = await this.redis.client.keys(CACHE_KEYS.PROJECTS.RECENT_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    const result = await this.prisma.project.delete({
      where: { id },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.PROJECTS.DETAIL(id));
      await this.redis.client.del(CACHE_KEYS.PROJECTS.DETAIL((existing as any).slug));
      const keys = await this.redis.client.keys(CACHE_KEYS.PROJECTS.RECENT_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }
}
