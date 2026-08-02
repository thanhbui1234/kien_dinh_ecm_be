import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetJobsFilterDto } from './dto/get-jobs-filter.dto';
import { UpsertJobPostTranslationDto } from '../../common/dto/upsert-translation.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma, Language } from '@prisma/client';
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
          sections: sections || [],
        },
      },
      translations: {
        create: [
          {
            lang: Language.VI,
            title: jobData.title,
            slug: jobData.slug as string,
            salary: jobData.salary || 'Cạnh tranh',
            sections: sections || [],
          },
        ],
      },
    };

    const result = await this.prisma.jobPost.create({
      data: createData,
      include: {
        detail: true,
        translations: true,
      },
    });
    
    try { 
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } catch (e) {}
    
    return result;
  }

  async findAll(filterDto: GetJobsFilterDto & { lang?: Language }) {
    const { search, status, lang = Language.VI } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.JobPostWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { translations: { some: { title: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const cacheKey = `cache:jobs:list:${lang}:${JSON.stringify(filterDto)}`;

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) {
        return cached as PageDto<any>;
      }
    } catch (e) {}

    const [rawJobs, total] = await this.prisma.$transaction([
      this.prisma.jobPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { translations: true },
      }),
      this.prisma.jobPost.count({ where }),
    ]);

    const jobs = rawJobs.map((job) => {
      const trans = job.translations.find((t) => t.lang === lang) || job.translations.find((t) => t.lang === Language.VI);
      return {
        ...job,
        title: trans?.title || job.title,
        slug: trans?.slug || job.slug,
        salary: trans?.salary || job.salary,
        alternates: {
          viSlug: job.translations.find((t) => t.lang === Language.VI)?.slug || job.slug,
          enSlug: job.translations.find((t) => t.lang === Language.EN)?.slug || null,
        },
      };
    });

    const pageMetaDto = new PageMetaDto(total, filterDto, jobs.length);
    const result = new PageDto(jobs, pageMetaDto);

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return result;
  }

  async findOne(idOrSlug: string, lang: Language = Language.VI) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);
    const cacheKey = `cache:job:detail:${lang}:${idOrSlug}`;

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const job = await this.prisma.jobPost.findFirst({
      where: isUuid
        ? { id: idOrSlug }
        : { OR: [{ slug: idOrSlug }, { translations: { some: { slug: idOrSlug } } }] },
      include: { detail: true, translations: true },
    });

    if (!job) {
      throw new NotFoundException({
        message: 'Không tìm thấy bài tuyển dụng',
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    const trans = job.translations.find((t) => t.lang === lang) || job.translations.find((t) => t.lang === Language.VI);

    const localizedJob = {
      ...job,
      title: trans?.title || job.title,
      slug: trans?.slug || job.slug,
      salary: trans?.salary || job.salary,
      detail: {
        ...job.detail,
        sections: trans?.sections || job.detail?.sections || [],
      },
      alternates: {
        viSlug: job.translations.find((t) => t.lang === Language.VI)?.slug || job.slug,
        enSlug: job.translations.find((t) => t.lang === Language.EN)?.slug || null,
      },
    };

    try {
      await this.redis.client.set(cacheKey, localizedJob, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localizedJob;
  }

  async upsertTranslation(jobId: string, dto: UpsertJobPostTranslationDto) {
    const job = await this.prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({
        message: 'Không tìm thấy bài tuyển dụng',
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    const slug = dto.slug?.trim() ? dto.slug.trim() : generateSlug(dto.title);

    const translation = await this.prisma.jobPostTranslation.upsert({
      where: {
        jobId_lang: { jobId, lang: dto.lang },
      },
      update: {
        title: dto.title,
        slug,
        salary: dto.salary !== undefined ? dto.salary : job.salary,
        sections: dto.sections !== undefined ? dto.sections : undefined,
      },
      create: {
        jobId,
        lang: dto.lang,
        title: dto.title,
        slug,
        salary: dto.salary || job.salary,
        sections: dto.sections || [],
      },
    });

    try {
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return translation;
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
      include: { detail: true, translations: true },
    });

    // Update VI translation if title changed
    if (jobData.title) {
      const slug = jobData.slug || generateSlug(jobData.title);
      await this.prisma.jobPostTranslation.upsert({
        where: { jobId_lang: { jobId: id, lang: Language.VI } },
        update: { title: jobData.title, slug, salary: jobData.salary || result.salary, sections: sections || [] },
        create: { jobId: id, lang: Language.VI, title: jobData.title, slug, salary: jobData.salary || result.salary, sections: sections || [] },
      });
    }

    try {
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) await this.redis.client.del(...keys);
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
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}

    return result;
  }
}
