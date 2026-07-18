import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { generateSlug } from '../../common/utils/string.util';

const REDIS_KEY_PRODUCT_VIEWS = 'product:views';
const REDIS_KEY_PRODUCT_VIEWS_PROCESSING = 'product:views:processing';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const { contentDetail, specifications, features, images, parentId, categoryId, seoMeta, ...productData } = createProductDto;

    let generatedSlug = generateSlug(productData.name);
    let existingProduct = await this.prisma.product.findUnique({
      where: { slug: generatedSlug },
    });
    
    let counter = 1;
    while (existingProduct) {
      generatedSlug = `${generateSlug(productData.name)}-${counter}`;
      existingProduct = await this.prisma.product.findUnique({
        where: { slug: generatedSlug },
      });
      counter++;
    }
    productData.slug = generatedSlug;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    if (parentId) {
      const parent = await this.prisma.product.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new BadRequestException({
          message: AppMessages.PRODUCT.PARENT_NOT_FOUND,
          errorCode: 'PARENT_PRODUCT_NOT_FOUND',
        });
      }
    }

    const createData: Prisma.ProductCreateInput = {
      ...productData,
      slug: productData.slug as string,
      category: { connect: { id: categoryId } },
    };

    if (parentId) {
      createData.parent = { connect: { id: parentId } };
    }

    if (contentDetail !== undefined || specifications !== undefined || features !== undefined || seoMeta !== undefined) {
      createData.detail = {
        create: {
          contentDetail: contentDetail || '',
          specifications: specifications || {},
          features: features || Prisma.JsonNull,
          seoMeta: seoMeta || Prisma.JsonNull,
        },
      };
    }

    if (images && images.length > 0) {
      createData.images = {
        create: images,
      };
    }

    const newProduct = await this.prisma.product.create({
      data: createData,
      include: {
        detail: true,
        images: true,
        category: true,
        parent: true,
      },
    });

    if (newProduct.isFeatured) {
      try {
        const keys = await this.redis.client.keys(CACHE_KEYS.PRODUCTS.FEATURED_PREFIX);
        if (keys.length > 0) {
          await this.redis.client.del(...keys);
        }
      } catch (error) {}
    }

    return newProduct;
  }

  async copy(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        detail: true,
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const newName = `${product.name} (Copy)`;
    let generatedSlug = generateSlug(newName);
    let existingProduct = await this.prisma.product.findUnique({
      where: { slug: generatedSlug },
    });
    
    let counter = 1;
    while (existingProduct) {
      generatedSlug = `${generateSlug(newName)}-${counter}`;
      existingProduct = await this.prisma.product.findUnique({
        where: { slug: generatedSlug },
      });
      counter++;
    }

    const createData: Prisma.ProductCreateInput = {
      name: newName,
      slug: generatedSlug,
      price: product.price,
      thumbnailUrl: product.thumbnailUrl,
      isFeatured: false,
      status: false,
      category: { connect: { id: product.categoryId } },
    };

    if (product.parentId) {
      createData.parent = { connect: { id: product.parentId } };
    }

    if (product.detail) {
      createData.detail = {
        create: {
          contentDetail: product.detail.contentDetail,
          specifications: product.detail.specifications || {},
          features: product.detail.features || Prisma.JsonNull,
          seoMeta: product.detail.seoMeta || Prisma.JsonNull,
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

    const newProduct = await this.prisma.product.create({
      data: createData,
      include: {
        detail: true,
        images: true,
        category: true,
        parent: true,
      },
    });

    return newProduct;
  }

  async findAll(filterDto: GetProductsFilterDto) {
    const { search, categoryId, status, isFeatured, sortBy, skip, limit } = filterDto;

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
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

    const isCacheable = Object.keys(where).length === 1 && where.isFeatured === true;
    const cacheKey = CACHE_KEYS.PRODUCTS.GET_FEATURED(skip || 0, limit || 10);

    if (isCacheable) {
      try {
        const cached = await this.redis.client.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (error) {}
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = { createdAt: 'desc' };
    if (sortBy === 'category') {
      orderBy = [
        { category: { orderIndex: 'asc' } },
        { createdAt: 'desc' }
      ];
    } else if (sortBy === 'price') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'viewCount') {
      orderBy = { viewCount: 'desc' };
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { select: { id: true, name: true, slug: true, price: true } }
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto(totalItems, filterDto, items.length);
    const result = new PageDto(items, pageMetaDto);

    if (isCacheable) {
      try {
        await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.ONE_HOUR });
      } catch (error) {}
    }

    return result;
  }

  async findOne(idOrSlug: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
    const cacheKey = CACHE_KEYS.PRODUCTS.DETAIL(idOrSlug);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {}

    const product = await this.prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        detail: true,
        images: { orderBy: { orderIndex: 'asc' } },
        category: true,
        variants: true,
        parent: { select: { id: true, name: true, slug: true } }
      },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    try {
      await this.redis.client.set(CACHE_KEYS.PRODUCTS.DETAIL(idOrSlug), product, { ex: CACHE_TTL.TWELVE_HOURS });
      const otherKey = isUuid ? product.slug : product.id;
      if (otherKey) {
        await this.redis.client.set(CACHE_KEYS.PRODUCTS.DETAIL(otherKey), product, { ex: CACHE_TTL.TWELVE_HOURS });
      }
    } catch (error) {}

    return product;
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
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return relatedProducts;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { contentDetail, specifications, features, images, parentId, categoryId, seoMeta, ...productData } = updateProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { detail: true },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    if (productData.slug === '') {
      delete productData.slug;
    }

    if (productData.slug && productData.slug !== product.slug) {
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug: productData.slug },
      });
      if (existingSlug) {
        throw new ConflictException({
          message: AppMessages.PRODUCT.SLUG_EXISTS,
          errorCode: 'PRODUCT_SLUG_EXISTS',
        });
      }
    }

    if (categoryId && categoryId !== product.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new BadRequestException({
          message: AppMessages.CATEGORY.NOT_FOUND,
          errorCode: 'CATEGORY_NOT_FOUND',
        });
      }
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException({
          message: AppMessages.PRODUCT.CIRCULAR_PARENT,
          errorCode: 'PRODUCT_CIRCULAR_PARENT',
        });
      }
      if (parentId !== null && parentId !== '') {
        const parent = await this.prisma.product.findUnique({ where: { id: parentId } });
        if (!parent) {
          throw new BadRequestException({
            message: AppMessages.PRODUCT.PARENT_NOT_FOUND,
            errorCode: 'PARENT_PRODUCT_NOT_FOUND',
          });
        }
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

    if (contentDetail !== undefined || specifications !== undefined || features !== undefined || seoMeta !== undefined) {
      const detailUpdate = {
        contentDetail: contentDetail !== undefined ? contentDetail : product.detail?.contentDetail || '',
        specifications: specifications !== undefined ? specifications : product.detail?.specifications || {},
        features: features !== undefined ? features : product.detail?.features || Prisma.JsonNull,
        seoMeta: seoMeta !== undefined ? seoMeta : product.detail?.seoMeta || Prisma.JsonNull,
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

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        detail: true,
        images: true,
        category: true,
        parent: true,
        variants: true,
      },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.PRODUCTS.DETAIL(id));
      if (product.slug) {
        await this.redis.client.del(CACHE_KEYS.PRODUCTS.DETAIL(product.slug));
      }
      if (updatedProduct.slug && updatedProduct.slug !== product.slug) {
        await this.redis.client.del(CACHE_KEYS.PRODUCTS.DETAIL(updatedProduct.slug));
      }

      if (product.isFeatured || updatedProduct.isFeatured) {
        const keys = await this.redis.client.keys(CACHE_KEYS.PRODUCTS.FEATURED_PREFIX);
        if (keys.length > 0) {
          await this.redis.client.del(...keys);
        }
      }
    } catch (error) {}

    return updatedProduct;
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    await this.prisma.product.delete({ where: { id } });

    try {
      await this.redis.client.del(CACHE_KEYS.PRODUCTS.DETAIL(id));
      if (product.slug) {
        await this.redis.client.del(CACHE_KEYS.PRODUCTS.DETAIL(product.slug));
      }
      if (product.isFeatured) {
        const keys = await this.redis.client.keys(CACHE_KEYS.PRODUCTS.FEATURED_PREFIX);
        if (keys.length > 0) {
          await this.redis.client.del(...keys);
        }
      }
    } catch (error) {}

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
    const isNewView = await this.redis.client.set(ipKey, '1', { ex: 43200, nx: true });

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
