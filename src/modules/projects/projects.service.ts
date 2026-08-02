import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { UpsertProjectTranslationDto } from '../../common/dto/upsert-translation.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma, Language } from '@prisma/client';
import { generateSlug } from '../../common/utils/string.util';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const { contentDetail, productIds, categoryIds, images, videoUrls, ...projectData } = createProjectDto;

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
      translations: {
        create: [
          {
            lang: Language.VI,
            name: projectData.name,
            slug: projectData.slug as string,
            description: projectData.description || '',
            contentDetail: contentDetail || '',
          },
        ],
      },
    };

    const hasDetail = !!contentDetail || (images && images.length > 0) || (videoUrls && videoUrls.length > 0);
    if (hasDetail) {
      createData.detail = {
        create: {
          contentDetail: contentDetail ?? '',
          images: images ?? [],
          videoUrls: videoUrls ?? [],
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
        translations: true,
      },
    });

    try { 
      const keys = await this.redis.client.keys('cache:project*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }

  async findAll(filterDto: GetProjectsFilterDto & { lang?: Language }) {
    const { search, status, isFeatured, lang = Language.VI } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { translations: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (status !== undefined) {
      where.status = status === 'true' as any ? true : (status === 'false' as any ? false : status);
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true' as any ? true : (isFeatured === 'false' as any ? false : isFeatured);
    }

    const cacheKey = `cache:projects:list:${lang}:${JSON.stringify(filterDto)}`;

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) {
        return cached as PageDto<any>;
      }
    } catch (e) {}

    const [rawProjects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { translations: true },
      }),
      this.prisma.project.count({ where }),
    ]);

    const projects = rawProjects.map((proj) => {
      const trans = proj.translations.find((t) => t.lang === lang) || proj.translations.find((t) => t.lang === Language.VI);
      return {
        ...proj,
        name: trans?.name || proj.name,
        slug: trans?.slug || proj.slug,
        description: trans?.description || proj.description,
        alternates: {
          viSlug: proj.translations.find((t) => t.lang === Language.VI)?.slug || proj.slug,
          enSlug: proj.translations.find((t) => t.lang === Language.EN)?.slug || null,
        },
      };
    });

    const pageMetaDto = new PageMetaDto(total, filterDto, projects.length);
    const result = new PageDto(projects, pageMetaDto);

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.SEVEN_DAYS });
    } catch (e) {}

    return result;
  }

  async findOne(idOrSlug: string, lang: Language = Language.VI) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
    const cacheKey = `cache:project:detail:${lang}:${idOrSlug}`;

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const project = await this.prisma.project.findFirst({
      where: isUuid
        ? { id: idOrSlug }
        : { OR: [{ slug: idOrSlug }, { translations: { some: { slug: idOrSlug } } }] },
      include: {
        detail: true,
        translations: true,
        products: {
          include: {
            product: {
              include: { translations: true },
            },
          },
        },
        categories: { select: { categoryId: true } },
      },
    });

    if (!project) {
      throw new NotFoundException({
        message: 'Không tìm thấy dự án',
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const trans = project.translations.find((t) => t.lang === lang) || project.translations.find((t) => t.lang === Language.VI);

    const formattedProject = {
      id: project.id,
      name: trans?.name || project.name,
      slug: trans?.slug || project.slug,
      description: trans?.description || project.description,
      coverImage: project.coverImage,
      status: project.status,
      isFeatured: project.isFeatured,
      createdAt: project.createdAt,
      detail: { contentDetail: trans?.contentDetail || project.detail?.contentDetail || '' },
      images: project.detail?.images ?? [],
      videoUrls: project.detail?.videoUrls ?? [],
      productIds: project.products.map(p => p.productId),
      categoryIds: project.categories.map(c => c.categoryId),
      relatedProducts: project.products.map(p => {
        const prodTrans = p.product.translations.find((t) => t.lang === lang) || p.product.translations.find((t) => t.lang === Language.VI);
        return {
          id: p.product.id,
          name: prodTrans?.name || p.product.name,
          slug: prodTrans?.slug || p.product.slug,
          thumbnailUrl: p.product.thumbnailUrl,
          price: p.product.price,
          isFeatured: p.product.isFeatured,
          status: p.product.status,
          categoryId: p.product.categoryId,
          viewCount: p.product.viewCount,
          createdAt: p.product.createdAt,
        };
      }),
      alternates: {
        viSlug: project.translations.find((t) => t.lang === Language.VI)?.slug || project.slug,
        enSlug: project.translations.find((t) => t.lang === Language.EN)?.slug || null,
      },
    };

    try {
      await this.redis.client.set(cacheKey, formattedProject, { ex: CACHE_TTL.SEVEN_DAYS });
    } catch (e) {}

    return formattedProject;
  }

  async upsertTranslation(projectId: string, dto: UpsertProjectTranslationDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException({
        message: 'Không tìm thấy dự án',
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const slug = dto.slug?.trim() ? dto.slug.trim() : generateSlug(dto.name);

    const translation = await this.prisma.projectTranslation.upsert({
      where: {
        projectId_lang: { projectId, lang: dto.lang },
      },
      update: {
        name: dto.name,
        slug,
        description: dto.description !== undefined ? dto.description : project.description,
        contentDetail: dto.contentDetail !== undefined ? dto.contentDetail : undefined,
      },
      create: {
        projectId,
        lang: dto.lang,
        name: dto.name,
        slug,
        description: dto.description || project.description || '',
        contentDetail: dto.contentDetail || '',
      },
    });

    try {
      const keys = await this.redis.client.keys('cache:project*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return translation;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { slug: true },
    });

    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy dự án',
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const { contentDetail, productIds, categoryIds, images, videoUrls, ...projectData } = updateProjectDto;

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

    if (contentDetail !== undefined || images !== undefined || videoUrls !== undefined) {
      updateData.detail = {
        upsert: {
          create: {
            contentDetail: contentDetail ?? '',
            images: images ?? [],
            videoUrls: videoUrls ?? [],
          },
          update: {
            ...(contentDetail !== undefined && { contentDetail }),
            ...(images !== undefined && { images }),
            ...(videoUrls !== undefined && { videoUrls }),
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
      include: { translations: true },
    });

    // Update VI translation if name changed
    if (projectData.name) {
      const slug = projectData.slug || generateSlug(projectData.name);
      await this.prisma.projectTranslation.upsert({
        where: { projectId_lang: { projectId: id, lang: Language.VI } },
        update: { name: projectData.name, slug, description: projectData.description || result.description, contentDetail: contentDetail || '' },
        create: { projectId: id, lang: Language.VI, name: projectData.name, slug, description: projectData.description || result.description || '', contentDetail: contentDetail || '' },
      });
    }

    try {
      const keys = await this.redis.client.keys('cache:project*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { slug: true },
    });

    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy dự án',
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const result = await this.prisma.project.delete({ where: { id } });

    try {
      const keys = await this.redis.client.keys('cache:project*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }
}
