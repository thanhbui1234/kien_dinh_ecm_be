import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { AppMessages } from '../../common/constants/messages.constant';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { UpsertProjectTranslationDto } from '../../common/dto/upsert-translation.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma, Language } from '@prisma/client';
import { generateSlug, isUuid } from '../../common/utils/string.util';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const { contentDetail, productIds, categoryIds, images, videoUrls, name, slug: slugInput, description, ...projectData } = createProjectDto;

    let slug = slugInput?.trim() ? slugInput.trim() : generateSlug(name);

    const existingProject = await this.prisma.projectTranslation.findUnique({
      where: { lang_slug: { lang: Language.VI, slug } },
    });

    if (existingProject) {
      if (!slugInput) {
        slug = `${slug}-${Date.now()}`;
      } else {
        throw new ConflictException({
          message: AppMessages.PROJECT.SLUG_EXISTS,
          errorCode: 'PROJECT_SLUG_EXISTS',
        });
      }
    }

    const createData: Prisma.ProjectCreateInput = {
      ...projectData,
      translations: {
        create: [
          {
            lang: Language.VI,
            name,
            slug,
            description: description || '',
            contentDetail: contentDetail || '',
          },
        ],
      },
    };

    const hasDetail = (images && images.length > 0) || (videoUrls && videoUrls.length > 0);
    if (hasDetail) {
      createData.detail = {
        create: {
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

  async findAll(filterDto: GetProjectsFilterDto) {
    const { search, status, isFeatured, lang = Language.VI } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.OR = [
        { translations: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (status !== undefined) {
      where.status = status === 'true' as any ? true : (status === 'false' as any ? false : status);
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true' as any ? true : (isFeatured === 'false' as any ? false : isFeatured);
    }

    const cacheKey = CACHE_KEYS.PROJECTS.GET_LIST(filterDto, lang);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached as PageDto<any>;
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
      const transMap = new Map(proj.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...proj,
        name: trans?.name || '',
        slug: trans?.slug || '',
        description: trans?.description || '',
        alternates: {
          viSlug: transMap.get(Language.VI)?.slug || '',
          enSlug: transMap.get(Language.EN)?.slug || null,
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
    const cacheKey = CACHE_KEYS.PROJECTS.DETAIL(idOrSlug, lang);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const project = await this.prisma.project.findFirst({
      where: isUuid(idOrSlug)
        ? { id: idOrSlug }
        : { translations: { some: { slug: idOrSlug } } },
      include: {
        detail: true,
        translations: true,
        products: {
          include: {
            product: { include: { translations: true } },
          },
        },
        categories: { select: { categoryId: true } },
      },
    });

    if (!project) {
      throw new NotFoundException({
        message: AppMessages.PROJECT.NOT_FOUND,
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const transMap = new Map(project.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);

    const formattedProject = {
      id: project.id,
      name: trans?.name || '',
      slug: trans?.slug || '',
      description: trans?.description || '',
      coverImage: project.coverImage,
      status: project.status,
      isFeatured: project.isFeatured,
      createdAt: project.createdAt,
      detail: { contentDetail: trans?.contentDetail || '' },
      images: project.detail?.images ?? [],
      videoUrls: project.detail?.videoUrls ?? [],
      productIds: project.products.map(p => p.productId),
      categoryIds: project.categories.map(c => c.categoryId),
      relatedProducts: project.products.map(p => {
        const prodTransMap = new Map(p.product.translations.map((t) => [t.lang, t]));
        const prodTrans = prodTransMap.get(lang) ?? prodTransMap.get(Language.VI);
        return {
          id: p.product.id,
          name: prodTrans?.name || '',
          slug: prodTrans?.slug || '',
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
        viSlug: transMap.get(Language.VI)?.slug || '',
        enSlug: transMap.get(Language.EN)?.slug || null,
      },
      translations: project.translations,
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
        message: AppMessages.PROJECT.NOT_FOUND,
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const slug = dto.slug?.trim() ? dto.slug.trim() : generateSlug(dto.name);

    let translation: Awaited<ReturnType<typeof this.prisma.projectTranslation.upsert>>;
    try {
      translation = await this.prisma.projectTranslation.upsert({
        where: { projectId_lang: { projectId, lang: dto.lang } },
        update: {
          name: dto.name,
          slug,
          description: dto.description !== undefined ? dto.description : undefined,
          contentDetail: dto.contentDetail !== undefined ? dto.contentDetail : undefined,
        },
        create: {
          projectId,
          lang: dto.lang,
          name: dto.name,
          slug,
          description: dto.description || '',
          contentDetail: dto.contentDetail || '',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: AppMessages.TRANSLATION.INVALID_LANGUAGE,
          errorCode: 'TRANSLATION_SLUG_EXISTS',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys('cache:project*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return translation;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.PROJECT.NOT_FOUND,
        errorCode: 'PROJECT_NOT_FOUND',
      });
    }

    const currentViTranslation = existing.translations.find((t) => t.lang === Language.VI);

    const { contentDetail, productIds, categoryIds, images, videoUrls, name, slug: slugInput, description, ...projectData } = updateProjectDto;

    let slug: string | undefined;
    if (name) {
      slug = generateSlug(name);
    } else if (slugInput?.trim()) {
      slug = slugInput.trim();
    }

    if (slug && slug !== currentViTranslation?.slug) {
      const existingSlug = await this.prisma.projectTranslation.findUnique({
        where: { lang_slug: { lang: Language.VI, slug } },
      });
      if (existingSlug && existingSlug.projectId !== id) {
        throw new ConflictException({
          message: AppMessages.PROJECT.SLUG_EXISTS,
          errorCode: 'PROJECT_SLUG_EXISTS',
        });
      }
    }

    const updateData: Prisma.ProjectUpdateInput = {
      ...projectData,
    };

    if (images !== undefined || videoUrls !== undefined) {
      updateData.detail = {
        upsert: {
          create: {
            images: images ?? [],
            videoUrls: videoUrls ?? [],
          },
          update: {
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

    await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    if (name !== undefined || slug !== undefined || description !== undefined || contentDetail !== undefined) {
      const finalSlug = slug !== undefined ? (slug || generateSlug(name || currentViTranslation?.name || '')) : (currentViTranslation?.slug || generateSlug(name || currentViTranslation?.name || ''));
      await this.prisma.projectTranslation.upsert({
        where: { projectId_lang: { projectId: id, lang: Language.VI } },
        update: {
          ...(name !== undefined ? { name } : {}),
          slug: finalSlug,
          description: description !== undefined ? description : undefined,
          contentDetail: contentDetail !== undefined ? contentDetail : undefined,
        },
        create: {
          projectId: id,
          lang: Language.VI,
          name: name ?? currentViTranslation?.name ?? '',
          slug: finalSlug,
          description: description ?? currentViTranslation?.description ?? '',
          contentDetail: contentDetail ?? '',
        },
      });
    }

    // Re-fetch after upsert so response has up-to-date translations
    const result = await this.prisma.project.findUnique({
      where: { id },
      include: { translations: true },
    });

    const transMap2 = new Map(result!.translations.map((t) => [t.lang, t]));
    const trans2 = transMap2.get(Language.VI);

    try {
      const keys = await this.redis.client.keys('cache:project*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return {
      ...result!,
      name: trans2?.name || '',
      slug: trans2?.slug || '',
      description: trans2?.description || '',
      alternates: {
        viSlug: transMap2.get(Language.VI)?.slug || '',
        enSlug: transMap2.get(Language.EN)?.slug || null,
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.PROJECT.NOT_FOUND,
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
