import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const { contentDetail, specifications, images, parentId, categoryId, seoMeta, ...productData } = createProductDto;

    const existingProduct = await this.prisma.product.findUnique({
      where: { slug: productData.slug },
    });

    if (existingProduct) {
      throw new ConflictException({
        message: AppMessages.PRODUCT.SLUG_EXISTS,
        errorCode: 'PRODUCT_SLUG_EXISTS',
      });
    }

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
      category: { connect: { id: categoryId } },
    };

    if (parentId) {
      createData.parent = { connect: { id: parentId } };
    }

    if (contentDetail !== undefined || specifications !== undefined || seoMeta !== undefined) {
      createData.detail = {
        create: {
          contentDetail: contentDetail || '',
          specifications: specifications || {},
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
    const { contentDetail, specifications, images, parentId, categoryId, seoMeta, ...productData } = updateProductDto;

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

    if (contentDetail !== undefined || specifications !== undefined || seoMeta !== undefined) {
      const detailUpdate = {
        contentDetail: contentDetail !== undefined ? contentDetail : product.detail?.contentDetail || '',
        specifications: specifications !== undefined ? specifications : product.detail?.specifications || {},
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

  async incrementViewCount(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        message: AppMessages.PRODUCT.NOT_FOUND,
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    await this.prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    
    return { success: true };
  }
}
