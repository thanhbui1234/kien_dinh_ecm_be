import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpsertCategoryTranslationDto } from '../../common/dto/upsert-translation.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { ErrorCode } from '../../common/constants/error-codes.constant';
import { generateSlug, isUuid } from '../../common/utils/string.util';
import { Prisma, Language } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, name, slug: slugInput, ...categoryData } = createCategoryDto;

    const slug = slugInput?.trim() ? slugInput.trim() : generateSlug(name);
    const data: any = {
      ...categoryData,
      translations: {
        create: [
          {
            lang: Language.VI,
            name,
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
    const cacheKey = CACHE_KEYS.CATEGORIES.FLAT(lang);
    try {
      const cachedFlat = await this.redis.client.get<any[]>(cacheKey);
      if (cachedFlat) return cachedFlat;
    } catch (error) { }

    const flatCategories = await this.prisma.category.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = flatCategories.map((cat) => {
      const transMap = new Map(cat.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...cat,
        name: trans?.name || '',
        slug: trans?.slug || '',
        alternates: {
          viSlug: transMap.get(Language.VI)?.slug || '',
          enSlug: transMap.get(Language.EN)?.slug || null,
        },
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (error) { }

    return localized;
  }

  async findOne(idOrSlug: string, lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.CATEGORIES.DETAIL(idOrSlug, lang);

    try {
      const cached = await this.redis.client.get<any>(cacheKey);
      if (cached) return cached;
    } catch (error) { }

    const category = await this.prisma.category.findFirst({
      where: isUuid(idOrSlug)
        ? { id: idOrSlug }
        : { translations: { some: { slug: idOrSlug } } },
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

    const transMap = new Map(category.translations.map((t) => [t.lang, t]));

    const localizeCategory = (cat: typeof category, catLang: Language) => {
      const catTransMap = new Map(cat.translations.map((t) => [t.lang, t]));
      const catTrans = catTransMap.get(catLang) ?? catTransMap.get(Language.VI);
      return { ...cat, name: catTrans?.name || '', slug: catTrans?.slug || '' };
    };

    const result = {
      ...localizeCategory(category, lang),
      parent: category.parent ? localizeCategory(category.parent as typeof category, lang) : null,
      subCategories: category.subCategories.map((sub) => localizeCategory(sub as typeof category, lang)),
      alternates: {
        viSlug: transMap.get(Language.VI)?.slug || '',
        enSlug: transMap.get(Language.EN)?.slug || null,
      },
    };

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (error) { }

    return result;
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

    let translation: Awaited<ReturnType<typeof this.prisma.categoryTranslation.upsert>>;
    try {
      translation = await this.prisma.categoryTranslation.upsert({
        where: { categoryId_lang: { categoryId, lang: dto.lang } },
        update: { name: dto.name, slug },
        create: { categoryId, lang: dto.lang, name: dto.name, slug },
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
      const keys = await this.redis.client.keys('cache:categories:*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return translation;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const { parentId, name, slug: slugInput, ...categoryData } = updateCategoryDto;

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!category) {
      throw new NotFoundException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    const currentViTranslation = category.translations.find((t) => t.lang === Language.VI);
    const slug = slugInput?.trim() ? slugInput.trim() : undefined;

    if (slug && slug !== currentViTranslation?.slug) {
      const existingSlug = await this.prisma.categoryTranslation.findUnique({
        where: { lang_slug: { lang: Language.VI, slug } },
      });
      if (existingSlug && existingSlug.categoryId !== id) {
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

    await this.prisma.category.update({
      where: { id },
      data,
    });

    // Sync VI translation if name or slug changed
    if (name !== undefined || slug !== undefined) {
      const finalSlug = slug !== undefined ? (slug || generateSlug(name || currentViTranslation?.name || '')) : (currentViTranslation?.slug || generateSlug(name || currentViTranslation?.name || ''));
      await this.prisma.categoryTranslation.upsert({
        where: { categoryId_lang: { categoryId: id, lang: Language.VI } },
        update: { ...(name !== undefined ? { name } : {}), slug: finalSlug },
        create: { categoryId: id, lang: Language.VI, name: name ?? '', slug: finalSlug },
      });
    }

    // Re-fetch after upsert so response has up-to-date translations
    const updatedCategory = await this.prisma.category.findUnique({
      where: { id },
      include: { translations: true },
    });

    const transMap2 = new Map(updatedCategory!.translations.map((t) => [t.lang, t]));
    const trans2 = transMap2.get(Language.VI);

    try {
      const keys = await this.redis.client.keys('cache:categories:*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return {
      ...updatedCategory!,
      name: trans2?.name || '',
      slug: trans2?.slug || '',
      alternates: {
        viSlug: transMap2.get(Language.VI)?.slug || '',
        enSlug: transMap2.get(Language.EN)?.slug || null,
      },
    };
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
