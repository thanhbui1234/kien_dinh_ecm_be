import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpsertCategoryTranslationDto } from '../../common/dto/upsert-translation.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { ErrorCode } from '../../common/constants/error-codes.constant';
import { generateSlug } from '../../common/utils/string.util';
import { Prisma, Language } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...categoryData } = createCategoryDto;

    const slug = categoryData.slug?.trim() ? categoryData.slug.trim() : generateSlug(categoryData.name);
    const data: any = { 
      ...categoryData, 
      slug,
      translations: {
        create: [
          {
            lang: Language.VI,
            name: categoryData.name,
            slug,
          },
        ],
      },
    };

    if (parentId && parentId.trim() !== '') {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new BadRequestException({
          message: AppMessages.CATEGORY.PARENT_NOT_FOUND,
          errorCode: 'PARENT_CATEGORY_NOT_FOUND',
        });
      }
      data.parent = { connect: { id: parentId } };
    }

    let newCategory: Awaited<ReturnType<typeof this.prisma.category.create>>;
    try {
      newCategory = await this.prisma.category.create({ 
        data,
        include: { translations: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: AppMessages.CATEGORY.SLUG_EXISTS,
          errorCode: 'CATEGORY_SLUG_EXISTS',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys('cache:categories:*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }
    return newCategory;
  }

  async findAll(lang: Language = Language.VI) {
    const cacheKey = `cache:categories:flat:${lang}`;
    try {
      const cachedFlat = await this.redis.client.get<any[]>(cacheKey);
      if (cachedFlat) {
        return cachedFlat;
      }
    } catch (error) { }

    const flatCategories = await this.prisma.category.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = flatCategories.map((cat) => {
      const trans = cat.translations.find((t) => t.lang === lang) || cat.translations.find((t) => t.lang === Language.VI);
      return {
        ...cat,
        name: trans?.name || cat.name,
        slug: trans?.slug || cat.slug,
        alternates: {
          viSlug: cat.translations.find((t) => t.lang === Language.VI)?.slug || cat.slug,
          enSlug: cat.translations.find((t) => t.lang === Language.EN)?.slug || null,
        },
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (error) { }

    return localized;
  }

  async findOne(idOrSlug: string, lang: Language = Language.VI) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
    const category = await this.prisma.category.findFirst({
      where: isUuid
        ? { id: idOrSlug }
        : { OR: [{ slug: idOrSlug }, { translations: { some: { slug: idOrSlug } } }] },
      include: {
        parent: { include: { translations: true } },
        subCategories: { include: { translations: true } },
        translations: true,
      },
    });

    if (!category) {
      throw new NotFoundException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    const trans = category.translations.find((t) => t.lang === lang) || category.translations.find((t) => t.lang === Language.VI);
    return {
      ...category,
      name: trans?.name || category.name,
      slug: trans?.slug || category.slug,
      alternates: {
        viSlug: category.translations.find((t) => t.lang === Language.VI)?.slug || category.slug,
        enSlug: category.translations.find((t) => t.lang === Language.EN)?.slug || null,
      },
    };
  }

  async upsertTranslation(categoryId: string, dto: UpsertCategoryTranslationDto) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    const slug = dto.slug?.trim() ? dto.slug.trim() : generateSlug(dto.name);

    const translation = await this.prisma.categoryTranslation.upsert({
      where: {
        categoryId_lang: { categoryId, lang: dto.lang },
      },
      update: {
        name: dto.name,
        slug,
      },
      create: {
        categoryId,
        lang: dto.lang,
        name: dto.name,
        slug,
      },
    });

    try {
      const keys = await this.redis.client.keys('cache:categories:*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return translation;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const { parentId, ...categoryData } = updateCategoryDto;

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    if (categoryData.slug === '') {
      delete categoryData.slug;
    }

    if (categoryData.slug && categoryData.slug !== category.slug) {
      const existingSlug = await this.prisma.category.findUnique({
        where: { slug: categoryData.slug },
      });
      if (existingSlug) {
        throw new ConflictException({
          message: AppMessages.CATEGORY.SLUG_EXISTS,
          errorCode: 'CATEGORY_SLUG_EXISTS',
        });
      }
    }

    const data: any = { ...categoryData };

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException({
          message: AppMessages.CATEGORY.CIRCULAR_PARENT,
          errorCode: 'CATEGORY_CIRCULAR_PARENT',
        });
      }

      if (parentId === null || parentId.trim() === '') {
        data.parent = { disconnect: true };
      } else {
        const parent = await this.prisma.category.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          throw new BadRequestException({
            message: AppMessages.CATEGORY.PARENT_NOT_FOUND,
            errorCode: 'PARENT_CATEGORY_NOT_FOUND',
          });
        }
        data.parent = { connect: { id: parentId } };
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data,
      include: { translations: true },
    });

    // Sync VI translation if name changed
    if (categoryData.name) {
      const slug = categoryData.slug || generateSlug(categoryData.name);
      await this.prisma.categoryTranslation.upsert({
        where: { categoryId_lang: { categoryId: id, lang: Language.VI } },
        update: { name: categoryData.name, slug },
        create: { categoryId: id, lang: Language.VI, name: categoryData.name, slug },
      });
    }

    try {
      const keys = await this.redis.client.keys('cache:categories:*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }
    return updatedCategory;
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subCategories: true, products: true, projectMappings: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    if (category._count.subCategories > 0) {
      throw new BadRequestException({
        message: AppMessages.CATEGORY.HAS_CHILDREN,
        errorCode: 'CATEGORY_HAS_CHILDREN',
      });
    }

    if (category._count.products > 0 || category._count.projectMappings > 0) {
      throw new BadRequestException({
        message: AppMessages.CATEGORY.HAS_RELATIONS,
        errorCode: 'CATEGORY_HAS_RELATIONS',
      });
    }

    await this.prisma.category.delete({ where: { id } });
    try {
      const keys = await this.redis.client.keys('cache:categories:*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return { message: AppMessages.CATEGORY.DELETE_SUCCESS };
  }
}
