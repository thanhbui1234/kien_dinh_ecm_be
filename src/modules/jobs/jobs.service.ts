import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetJobsFilterDto } from './dto/get-jobs-filter.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { generateSlug } from '../../common/utils/string.util';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createJobDto: CreateJobDto) {
    const { sections, ...jobData } = createJobDto;

    if (!jobData.slug && jobData.title) {
      jobData.slug = generateSlug(jobData.title);
    }

    const existingJob = await this.prisma.jobPost.findUnique({
      where: { slug: jobData.slug },
    });

    if (existingJob) {
      if (!createJobDto.slug) {
        jobData.slug = `${jobData.slug}-${Date.now()}`;
      } else {
        throw new ConflictException({
          message: 'Slug bài đăng đã tồn tại',
          errorCode: 'JOB_SLUG_EXISTS',
        });
      }
    }

    const createData: Prisma.JobPostCreateInput = {
      ...jobData,
      slug: jobData.slug as string,
      detail: {
        create: {
          sections,
        },
      },
    };

    const result = await this.prisma.jobPost.create({
      data: createData,
      include: {
        detail: true,
      },
    });
    
    try { 
      const keys = await this.redis.client.keys(CACHE_KEYS.JOBS.ACTIVE_LIST_PREFIX);
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } catch (e) {}
    
    return result;
  }

  async findAll(filterDto: GetJobsFilterDto) {
    const { search, status } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.JobPostWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    if (status !== undefined) {
      where.status = status;
    }

    const isCacheable = status === true && !search;
    const cacheKey = CACHE_KEYS.JOBS.GET_ACTIVE_LIST(skip, limit);

    if (isCacheable) {
      try {
        const cached = await this.redis.client.get(cacheKey);
        if (cached) {
          return cached as PageDto<any>;
        }
      } catch (e) {}
    }

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.jobPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobPost.count({ where }),
    ]);

    const pageMetaDto = new PageMetaDto(total, filterDto, jobs.length);
    const result = new PageDto(jobs, pageMetaDto);

    if (isCacheable) {
      try {
        await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
      } catch (e) {}
    }

    return result;
  }

  async findOne(idOrSlug: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
    const cacheKey = CACHE_KEYS.JOBS.DETAIL(idOrSlug);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const job = await this.prisma.jobPost.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: { detail: true },
    });

    if (!job) {
      throw new NotFoundException({
        message: 'Không tìm thấy bài tuyển dụng',
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    try {
      const otherKey = isUuid ? job.slug : job.id;
      await Promise.all([
        this.redis.client.set(cacheKey, job, { ex: CACHE_TTL.TWENTY_FOUR_HOURS }),
        this.redis.client.set(CACHE_KEYS.JOBS.DETAIL(otherKey), job, { ex: CACHE_TTL.TWENTY_FOUR_HOURS }),
      ]);
    } catch (e) {}

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    const existing = await this.prisma.jobPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy bài tuyển dụng',
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    const { sections, ...jobData } = updateJobDto;

    if (jobData.slug) {
      const slugCheck = await this.prisma.jobPost.findFirst({
        where: { slug: jobData.slug, id: { not: id } },
      });
      if (slugCheck) {
        throw new ConflictException({
          message: 'Slug bài đăng đã tồn tại',
          errorCode: 'JOB_SLUG_EXISTS',
        });
      }
    }

    const updateData: Prisma.JobPostUpdateInput = {
      ...jobData,
    };

    if (sections !== undefined) {
      updateData.detail = {
        upsert: {
          create: {
            sections,
          },
          update: {
            sections,
          },
        },
      };
    }

    const result = await this.prisma.jobPost.update({
      where: { id },
      data: updateData,
      include: { detail: true },
    });

    try {
      const delKeys = [
        CACHE_KEYS.JOBS.DETAIL(id),
        CACHE_KEYS.JOBS.DETAIL(existing.slug),
        ...(result.slug !== existing.slug ? [CACHE_KEYS.JOBS.DETAIL(result.slug)] : []),
      ];
      const listKeys = await this.redis.client.keys(CACHE_KEYS.JOBS.ACTIVE_LIST_PREFIX);
      await Promise.all([
        this.redis.client.del(...delKeys),
        ...(listKeys.length > 0 ? [this.redis.client.del(...listKeys)] : []),
      ]);
    } catch (e) {}
    return result;
  }

  async remove(id: string) {
    const existing = await this.prisma.jobPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy bài tuyển dụng',
        errorCode: 'JOB_NOT_FOUND',
      });
    }
    const result = await this.prisma.jobPost.delete({
      where: { id },
    });
    
    try {
      const listKeys = await this.redis.client.keys(CACHE_KEYS.JOBS.ACTIVE_LIST_PREFIX);
      await Promise.all([
        this.redis.client.del(CACHE_KEYS.JOBS.DETAIL(id), CACHE_KEYS.JOBS.DETAIL(existing.slug)),
        ...(listKeys.length > 0 ? [this.redis.client.del(...listKeys)] : []),
      ]);
    } catch (e) {}

    return result;
  }
}
