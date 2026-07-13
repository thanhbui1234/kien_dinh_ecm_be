import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { ErrorCode } from '../../common/constants/error-codes.constant';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...categoryData } = createCategoryDto;

    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: categoryData.slug },
    });

    if (existingCategory) {
      throw new ConflictException({
        message: AppMessages.CATEGORY.SLUG_EXISTS,
        errorCode: 'CATEGORY_SLUG_EXISTS',
      });
    }

    const data: any = { ...categoryData };

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

    const newCategory = await this.prisma.category.create({
      data,
    });

    await this.redis.client.del('categories:flat');
    return newCategory;
  }
  async findAll() {
    try {
      const cachedFlat = await this.redis.client.get<any[]>('categories:flat');
      if (cachedFlat) {
        this.logger.log('[Redis] Cache Hit: categories:flat');
        return cachedFlat;
      }
    } catch (error) {}

    this.logger.log('[Redis] Cache Miss: categories:flat');

    const flatCategories = await this.prisma.category.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set('categories:flat', flatCategories, { ex: 86400 });
    } catch (error) {}

    return flatCategories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subCategories: true,
      },
    });

    if (!category) {
      throw new NotFoundException({
        message: AppMessages.CATEGORY.NOT_FOUND,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }
    return category;
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
    });

    await this.redis.client.del('categories:flat');
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
    await this.redis.client.del('categories:flat');
    
    return { message: AppMessages.CATEGORY.DELETE_SUCCESS };
  }
}
