import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { UpsertProductTranslationDto } from '../../common/dto/upsert-translation.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma, Language } from '@prisma/client';
import { generateSlug, isUuid } from '../../common/utils/string.util';

function isSlugConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

const REDIS_KEY_PRODUCT_VIEWS = 'product:views';
const REDIS_KEY_PRODUCT_VIEWS_PROCESSING = 'product:views:processing';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  async create(createProductDto: CreateProductDto) {
    const { contentDetail, specifications, features, images, parentId, categoryId, seoMeta, videoUrls, name, slug: slugInput, ...productData } = createProductDto;

    const slug = slugInput?.trim() ? slugInput.trim() : generateSlug(name);

    const [category, parent] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: categoryId } }),
      parentId ? this.prisma.product.findUnique({ where: { id: parentId } }) : null,
    ]);

    if (!category) {
      throw new BadRequestException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    if (parentId && !parent) {
      throw new BadRequestException({
        message: AppMessages.PRODUCT.PARENT_NOT_FOUND,
        errorCode: 'PARENT_PRODUCT_NOT_FOUND',
      });
    }

    const createData: Prisma.ProductCreateInput = {
      ...productData,
      category: { connect: { id: categoryId } },
      translations: {
        create: [
          {
            lang: Language.VI,
            name,
            slug,
            contentDetail: contentDetail || '',
            specifications: specifications || {},
            features: features || Prisma.JsonNull,
            seoTitle: seoMeta?.title ?? name,
            seoDescription: seoMeta?.description ?? name,
          },
        ],
      },
    };

    if (parentId) {
      createData.parent = { connect: { id: parentId } };
    }

    if (videoUrls !== undefined && videoUrls.length > 0) {
      createData.detail = {
        create: {
          videoUrls,
        },
      };
    }

    if (images && images.length > 0) {
      createData.images = {
        create: images,
      };
    }

    let newProduct: Awaited<ReturnType<typeof this.prisma.product.create>>;
    try {
      newProduct = await this.prisma.product.create({
        data: createData,
        include: {
          detail: true,
          images: true,
          category: true,
          parent: true,
          translations: true,
        },
      });
    } catch (error) {
      if (isSlugConflict(error)) {
        throw new ConflictException({
          message: AppMessages.PRODUCT.SLUG_EXISTS,
          errorCode: 'PRODUCT_SLUG_EXISTS',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys('cache:product*');
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } catch (error) { }

    return newProduct;
  }

  async copy(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        detail: true,
        images: true,
        translations: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const viTranslation = product.translations.find((t) => t.lang === Language.VI) ?? product.translations[0];
    const newName = `${viTranslation?.name ?? ''} (Copy)`;
    const generatedSlug = generateSlug(newName);

    const createData: Prisma.ProductCreateInput = {
      price: product.price,
      thumbnailUrl: product.thumbnailUrl,
      isFeatured: false,
      status: false,
      category: { connect: { id: product.categoryId } },
      translations: {
        create: [
          {
            lang: Language.VI,
            name: newName,
            slug: generatedSlug,
            contentDetail: viTranslation?.contentDetail || '',
            specifications: viTranslation?.specifications || {},
            features: viTranslation?.features || Prisma.JsonNull,
            seoTitle: viTranslation?.seoTitle ?? newName,
            seoDescription: viTranslation?.seoDescription ?? newName,
          },
        ],
      },
    };

    if (product.parentId) {
      createData.parent = { connect: { id: product.parentId } };
    }

    if (product.detail?.videoUrls?.length) {
      createData.detail = {
        create: {
          videoUrls: product.detail.videoUrls,
        },
      };
    }

    if (product.images && product.images.length > 0) {
      createData.images = {
        create: product.images.map((img) => ({
          imageUrl: img.imageUrl,
          isMain: img.isMain,
          orderIndex: img.orderIndex,
        })),
      };
    }

    let newProduct: Awaited<ReturnType<typeof this.prisma.product.create>>;
    try {
      newProduct = await this.prisma.product.create({
        data: createData,
        include: {
          detail: true,
          images: true,
          category: true,
          parent: true,
          translations: true,
        },
      });
    } catch (error) {
      if (isSlugConflict(error)) {
        throw new ConflictException({
          message: AppMessages.PRODUCT.SLUG_EXISTS,
          errorCode: 'PRODUCT_SLUG_EXISTS',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys('cache:product*');
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } catch (error) { }

    return newProduct;
  }

  async findAll(filterDto: GetProductsFilterDto) {
    const { search, categoryId, status, isFeatured, sortBy, skip, limit, lang = Language.VI } = filterDto;

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        {
          translations: {
            some: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { contentDetail: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (status !== undefined) {
      where.status = status === 'true' as any ? true : (status === 'false' as any ? false : status);
    }
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true' as any ? true : (isFeatured === 'false' as any ? false : isFeatured);
    }

    const cacheKey = CACHE_KEYS.PRODUCTS.GET_LIST(filterDto, lang);

    if (!search) {
      try {
        const cached = await this.redis.client.get(cacheKey);
        if (cached) return cached;
      } catch (error) { }
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = { createdAt: 'desc' };
    if (sortBy === 'category') {
      orderBy = [{ category: { orderIndex: 'asc' } }, { createdAt: 'desc' }];
    } else if (sortBy === 'price') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'viewCount') {
      orderBy = { viewCount: 'desc' };
    }

    const [rawItems, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          translations: true,
          category: { include: { translations: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const targetLang = (lang ? (lang as string).toUpperCase() : Language.VI) as Language;
    const items = rawItems.map((prod) => {
      const transMap = new Map(prod.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(targetLang) ?? transMap.get(Language.VI);
      const catTransMap = prod.category ? new Map(prod.category.translations.map((t) => [t.lang, t])) : null;
      const catTrans = catTransMap ? (catTransMap.get(targetLang) ?? catTransMap.get(Language.VI)) : null;

      return {
        ...prod,
        name: trans?.name || '',
        slug: trans?.slug || '',
        category: prod.category ? {
          id: prod.category.id,
          name: catTrans?.name || '',
          slug: catTrans?.slug || '',
        } : null,
        alternates: {
          viSlug: transMap.get(Language.VI)?.slug || '',
          enSlug: transMap.get(Language.EN)?.slug || null,
        },
      };
    });

    const pageMetaDto = new PageMetaDto(totalItems, filterDto, items.length);
    const result = new PageDto(items, pageMetaDto);

    if (!search) {
      try {
        await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.ONE_HOUR });
      } catch (error) { }
    }

    return result;
  }

  async findOne(idOrSlug: string, lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.PRODUCTS.DETAIL(idOrSlug, lang);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (error) { }

    const product = await this.prisma.product.findFirst({
      where: isUuid(idOrSlug)
        ? { id: idOrSlug }
        : { translations: { some: { slug: idOrSlug } } },
      include: {
        detail: true,
        images: { orderBy: { orderIndex: 'asc' } },
        category: { include: { translations: true } },
        variants: { include: { translations: true } },
        parent: { include: { translations: true } },
        translations: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const targetLang = (lang ? (lang as string).toUpperCase() : Language.VI) as Language;
    const transMap = new Map(product.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(targetLang) ?? transMap.get(Language.VI);
    const catTransMap = product.category ? new Map(product.category.translations.map((t) => [t.lang, t])) : null;
    const catTrans = catTransMap ? (catTransMap.get(targetLang) ?? catTransMap.get(Language.VI)) : null;
    const parentTransMap = product.parent ? new Map(product.parent.translations.map((t) => [t.lang, t])) : null;
    const parentTrans = parentTransMap ? (parentTransMap.get(targetLang) ?? parentTransMap.get(Language.VI)) : null;

    const localizedProduct = {
      ...product,
      name: trans?.name || '',
      slug: trans?.slug || '',
      detail: {
        ...product.detail,
        contentDetail: trans?.contentDetail || '',
        specifications: trans?.specifications || {},
        features: trans?.features || {},
        seoTitle: trans?.seoTitle || trans?.name || '',
        seoDescription: trans?.seoDescription || trans?.name || '',
      },
      category: product.category ? {
        ...product.category,
        name: catTrans?.name || '',
        slug: catTrans?.slug || '',
      } : null,
      parent: product.parent ? {
        ...product.parent,
        name: parentTrans?.name || '',
        slug: parentTrans?.slug || '',
      } : null,
      variants: product.variants.map((v) => {
        const vTransMap = new Map(v.translations.map((t) => [t.lang, t]));
        const vTrans = vTransMap.get(targetLang) ?? vTransMap.get(Language.VI);
        return { ...v, name: vTrans?.name || '', slug: vTrans?.slug || '' };
      }),
      alternates: {
        viSlug: transMap.get(Language.VI)?.slug || '',
        enSlug: transMap.get(Language.EN)?.slug || null,
      },
    };

    try {
      await this.redis.client.set(cacheKey, localizedProduct, { ex: CACHE_TTL.TWELVE_HOURS });
    } catch (error) { }

    return localizedProduct;
  }

  async upsertTranslation(productId: string, dto: UpsertProductTranslationDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const slug = dto.slug?.trim() ? dto.slug.trim() : generateSlug(dto.name);

    let translation: Awaited<ReturnType<typeof this.prisma.productTranslation.upsert>>;
    try {
      translation = await this.prisma.productTranslation.upsert({
        where: { productId_lang: { productId, lang: dto.lang } },
        update: {
          name: dto.name,
          slug,
          contentDetail: dto.contentDetail !== undefined ? dto.contentDetail : undefined,
          specifications: dto.specifications !== undefined ? dto.specifications : undefined,
          features: dto.features !== undefined ? dto.features : undefined,
          seoTitle: dto.seoTitle !== undefined ? dto.seoTitle : dto.name,
          seoDescription: dto.seoDescription !== undefined ? dto.seoDescription : dto.name,
        },
        create: {
          productId,
          lang: dto.lang,
          name: dto.name,
          slug,
          contentDetail: dto.contentDetail || '',
          specifications: dto.specifications || {},
          features: dto.features || Prisma.JsonNull,
          seoTitle: dto.seoTitle || dto.name,
          seoDescription: dto.seoDescription || dto.name,
        },
      });
    } catch (error) {
      if (isSlugConflict(error)) {
        throw new ConflictException({
          message: AppMessages.TRANSLATION.INVALID_LANGUAGE,
          errorCode: 'TRANSLATION_SLUG_EXISTS',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys('cache:product*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (error) { }

    return translation;
  }

  async findRelated(id: string, limit: number = 5) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { categoryId: true },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const relatedProducts = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: id }, // Exclude current product
        status: true,
      },
      take: Number(limit),
      orderBy: { isFeatured: 'desc' }, // Optional: prioritize featured items
      include: {
        translations: true,
        category: { include: { translations: true } },
      },
    });

    return relatedProducts.map((prod) => {
      const transMap = new Map(prod.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(Language.VI);
      const catTransMap = prod.category ? new Map(prod.category.translations.map((t) => [t.lang, t])) : null;
      const catTrans = catTransMap ? catTransMap.get(Language.VI) : null;

      return {
        ...prod,
        name: trans?.name || '',
        slug: trans?.slug || '',
        category: prod.category ? {
          id: prod.category.id,
          name: catTrans?.name || '',
          slug: catTrans?.slug || '',
        } : null,
      };
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { contentDetail, specifications, features, images, parentId, categoryId, seoMeta, videoUrls, name, slug: slugInput, ...productData } = updateProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { detail: true, translations: true },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const currentViTranslation = product.translations.find((t) => t.lang === Language.VI);

    let slug: string | undefined;
    if (name) {
      slug = generateSlug(name);
    } else if (slugInput?.trim()) {
      slug = slugInput.trim();
    }

    const slugCheckPromise =
      slug && slug !== currentViTranslation?.slug
        ? this.prisma.productTranslation.findUnique({ where: { lang_slug: { lang: Language.VI, slug } } })
        : Promise.resolve(null);

    const categoryCheckPromise =
      categoryId && categoryId !== product.categoryId
        ? this.prisma.category.findUnique({ where: { id: categoryId } })
        : Promise.resolve(true);

    const parentCheckPromise =
      parentId !== undefined && parentId !== null && parentId !== '' && parentId !== id
        ? this.prisma.product.findUnique({ where: { id: parentId } })
        : Promise.resolve(true);

    const [existingSlug, category, parent] = await Promise.all([
      slugCheckPromise,
      categoryCheckPromise,
      parentCheckPromise,
    ]);

    if (existingSlug && existingSlug.productId !== id) {
      throw new ConflictException({
        message: AppMessages.PRODUCT.SLUG_EXISTS,
        errorCode: 'PRODUCT_SLUG_EXISTS',
      });
    }

    if (category === null) {
      throw new BadRequestException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException({
          message: AppMessages.PRODUCT.CIRCULAR_PARENT,
          errorCode: 'PRODUCT_CIRCULAR_PARENT',
        });
      }
      if (parentId !== null && parentId !== '' && parent === null) {
        throw new BadRequestException({
          message: AppMessages.PRODUCT.PARENT_NOT_FOUND,
          errorCode: 'PARENT_PRODUCT_NOT_FOUND',
        });
      }
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...productData,
    };

    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    }

    if (parentId !== undefined) {
      if (parentId === null || parentId === '') {
        updateData.parent = { disconnect: true };
      } else {
        updateData.parent = { connect: { id: parentId } };
      }
    }

    if (videoUrls !== undefined) {
      const detailUpdate = {
        videoUrls,
      };

      updateData.detail = {
        upsert: {
          create: detailUpdate,
          update: detailUpdate,
        },
      };
    }

    if (images) {
      updateData.images = {
        deleteMany: {},
        create: images,
      };
    }

    await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    if (name !== undefined || slug !== undefined || contentDetail !== undefined || specifications !== undefined || features !== undefined || seoMeta !== undefined) {
      const finalSlug = slug !== undefined ? (slug || generateSlug(name || currentViTranslation?.name || '')) : (currentViTranslation?.slug || generateSlug(name || currentViTranslation?.name || ''));
      await this.prisma.productTranslation.upsert({
        where: { productId_lang: { productId: id, lang: Language.VI } },
        update: {
          ...(name !== undefined ? { name, seoTitle: seoMeta?.title ?? name, seoDescription: seoMeta?.description ?? name } : {}),
          ...(seoMeta !== undefined && name === undefined ? { seoTitle: seoMeta?.title, seoDescription: seoMeta?.description } : {}),
          slug: finalSlug,
          contentDetail: contentDetail !== undefined ? contentDetail : undefined,
          specifications: specifications !== undefined ? specifications : undefined,
          features: features !== undefined ? features : undefined,
        },
        create: {
          productId: id,
          lang: Language.VI,
          name: name || currentViTranslation?.name || '',
          slug: finalSlug,
          contentDetail: contentDetail || '',
          specifications: specifications || {},
          features: features || Prisma.JsonNull,
          seoTitle: seoMeta?.title ?? name ?? currentViTranslation?.name ?? '',
          seoDescription: seoMeta?.description ?? name ?? currentViTranslation?.name ?? '',
        },
      });
    }

    // Re-fetch after translation upsert so response has up-to-date localized fields
    const updatedProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        detail: true,
        images: true,
        category: { include: { translations: true } },
        parent: { include: { translations: true } },
        variants: { include: { translations: true } },
        translations: true,
      },
    });

    const lang = Language.VI;
    const transMap = new Map(updatedProduct!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);
    const catTransMap = updatedProduct!.category ? new Map(updatedProduct!.category.translations.map((t) => [t.lang, t])) : null;
    const catTrans = catTransMap ? (catTransMap.get(lang) ?? catTransMap.get(Language.VI)) : null;
    const parentTransMap = updatedProduct!.parent ? new Map(updatedProduct!.parent.translations.map((t) => [t.lang, t])) : null;
    const parentTrans = parentTransMap ? (parentTransMap.get(lang) ?? parentTransMap.get(Language.VI)) : null;

    try {
      const slugForCache = currentViTranslation?.slug;
      const delKeys = [
        CACHE_KEYS.PRODUCTS.DETAIL(id),
        ...(slugForCache ? [CACHE_KEYS.PRODUCTS.DETAIL(slugForCache)] : []),
      ];
      const ops: Promise<any>[] = [this.redis.client.del(...delKeys)];
      ops.push(
        this.redis.client.keys(CACHE_KEYS.PRODUCTS.LIST_PREFIX).then((keys) =>
          keys.length > 0 ? this.redis.client.del(...keys) : null
        )
      );
      await Promise.all(ops);
    } catch (error) { }

    return {
      ...updatedProduct!,
      name: trans?.name || '',
      slug: trans?.slug || '',
      detail: {
        ...updatedProduct!.detail,
        contentDetail: trans?.contentDetail || '',
        specifications: trans?.specifications || {},
        features: trans?.features || {},
        seoTitle: trans?.seoTitle || trans?.name || '',
        seoDescription: trans?.seoDescription || trans?.name || '',
      },
      category: updatedProduct!.category ? {
        ...updatedProduct!.category,
        name: catTrans?.name || '',
        slug: catTrans?.slug || '',
      } : null,
      parent: updatedProduct!.parent ? {
        ...updatedProduct!.parent,
        name: parentTrans?.name || '',
        slug: parentTrans?.slug || '',
      } : null,
      variants: updatedProduct!.variants.map((v) => {
        const vTransMap = new Map(v.translations.map((t) => [t.lang, t]));
        const vTrans = vTransMap.get(lang) ?? vTransMap.get(Language.VI);
        return { ...v, name: vTrans?.name || '', slug: vTrans?.slug || '' };
      }),
      alternates: {
        viSlug: transMap.get(Language.VI)?.slug || '',
        enSlug: transMap.get(Language.EN)?.slug || null,
      },
    };
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    await this.prisma.product.delete({ where: { id } });

    try {
      const viSlug = product.translations.find((t) => t.lang === Language.VI)?.slug;
      const delKeys = [
        CACHE_KEYS.PRODUCTS.DETAIL(id),
        ...(viSlug ? [CACHE_KEYS.PRODUCTS.DETAIL(viSlug)] : []),
      ];
      const ops: Promise<any>[] = [this.redis.client.del(...delKeys)];
      ops.push(
        this.redis.client.keys(CACHE_KEYS.PRODUCTS.LIST_PREFIX).then((keys) =>
          keys.length > 0 ? this.redis.client.del(...keys) : null
        )
      );
      await Promise.all(ops);
    } catch (error) { }

    return { message: AppMessages.PRODUCT.DELETE_SUCCESS };
  }

  async incrementViewCount(id: string, ip: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    // 1. Kiểm tra IP trong Redis xem đã view trong 12 tiếng qua chưa (Chống spam)
    const clientIp = ip || 'unknown';
    const ipKey = `product:view:${id}:ip:${clientIp}`;

    // Lưu key với thời gian sống 12 tiếng (43200s), nx: true nghĩa là chỉ set nếu chưa tồn tại
    let isNewView: any = null;
    try {
      isNewView = await this.redis.client.set(ipKey, '1', { ex: 43200, nx: true });
    } catch (e) {
      this.logger.error(`Failed to check IP dedup for product ${id}`, e);
    }

    if (!isNewView) {
      this.logger.log(`IP ${clientIp} already viewed product ${id} recently. Ignored.`);
      return { success: true };
    }

    // 2. Chỉ ghi Delta vào Redis Sorted Set (KHÔNG ghi DB trực tiếp)
    try {
      await this.redis.client.zincrby(REDIS_KEY_PRODUCT_VIEWS, 1, id);
      this.logger.log(`Incremented view delta for product ${id} in Redis`);
    } catch (error) {
      this.logger.error(`Failed to increment view delta for product ${id} in Redis`, error);
    }

    return { success: true };
  }

  /**
   * Cron Job: Đồng bộ lượt xem từ Redis vào Database (Delta Sync Pattern)
   * Chạy mỗi 15 phút.
   *
   * Flow:
   * 1. RENAME key "product:views" -> "product:views:processing" (Atomic, chống race condition)
   * 2. Đọc toàn bộ delta từ key processing
   * 3. Batch update vào DB: viewCount = viewCount + delta
   * 4. Xóa key processing sau khi đồng bộ xong
   */
  @Cron('*/15 * * * *')
  async syncViewCountsToDb() {
    this.logger.log('[CronJob] Starting Delta Sync: product view counts...');

    try {
      // Bước 1: Atomic RENAME để tách key đang nhận request mới ra khỏi key đang xử lý
      // Nếu key product:views chưa tồn tại (chưa có ai view), RENAME sẽ lỗi -> bắt lỗi và return
      try {
        await this.redis.client.rename(REDIS_KEY_PRODUCT_VIEWS, REDIS_KEY_PRODUCT_VIEWS_PROCESSING);
      } catch {
        this.logger.log('[CronJob] No new view deltas to sync. Skipping.');
        return;
      }

      // Bước 2: Đọc toàn bộ member + score từ key processing
      const viewDeltas = await this.redis.client.zrange(REDIS_KEY_PRODUCT_VIEWS_PROCESSING, 0, -1, { withScores: true }) as (string | number)[];

      if (!viewDeltas || viewDeltas.length === 0) {
        await this.redis.client.del(REDIS_KEY_PRODUCT_VIEWS_PROCESSING);
        this.logger.log('[CronJob] No view deltas found after RENAME. Cleaned up.');
        return;
      }

      // Bước 3: Parse kết quả thành mảng { productId, delta }
      // zrange WITHSCORES trả về mảng xen kẽ: [member1, score1, member2, score2, ...]
      const updates: { productId: string; delta: number }[] = [];
      for (let i = 0; i < viewDeltas.length; i += 2) {
        const productId = String(viewDeltas[i]);
        const delta = Number(viewDeltas[i + 1]);
        if (delta > 0) {
          updates.push({ productId, delta });
        }
      }

      // Bước 4: Batch update vào DB bằng Prisma transaction
      if (updates.length > 0) {
        const prismaOps = updates.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId },
            data: { viewCount: { increment: item.delta } },
          }),
        );

        await this.prisma.$transaction(prismaOps);
        this.logger.log(`[CronJob] Synced view counts for ${updates.length} products to DB.`);

        try {
          const cacheDelOps = updates.map((item) =>
            this.redis.client.del(CACHE_KEYS.PRODUCTS.DETAIL(item.productId)),
          );
          await Promise.all(cacheDelOps);
        } catch (error) { }
      }

      // Bước 5: Xóa key processing sau khi đồng bộ xong
      await this.redis.client.del(REDIS_KEY_PRODUCT_VIEWS_PROCESSING);
      this.logger.log('[CronJob] Delta Sync completed successfully.');
    } catch (error) {
      this.logger.error('[CronJob] Delta Sync failed:', error);
      // Nếu lỗi xảy ra sau RENAME nhưng trước khi xóa processing key,
      // lần chạy tiếp theo sẽ tạo key product:views mới (không mất data mới)
      // và key processing cũ sẽ được xử lý lại nếu cần (hoặc xóa thủ công)
    }
  }
}
