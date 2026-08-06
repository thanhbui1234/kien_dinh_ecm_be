import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetJobsFilterDto } from './dto/get-jobs-filter.dto';
import { UpsertJobPostTranslationDto } from '../../common/dto/upsert-translation.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma, Language } from '@prisma/client';
import { generateSlug, isUuid } from '../../common/utils/string.util';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  async create(createJobDto: CreateJobDto) {
    const { sections, title, slug: slugInput, salary, ...jobData } = createJobDto;

    let slug = slugInput?.trim() ? slugInput.trim() : generateSlug(title);

    const existingJob = await this.prisma.jobPostTranslation.findUnique({
      where: { lang_slug: { lang: Language.VI, slug } },
    });

    if (existingJob) {
      if (!slugInput) {
        slug = `${slug}-${Date.now()}`;
      } else {
        throw new ConflictException({
          message: AppMessages.JOB.SLUG_EXISTS,
          errorCode: 'JOB_SLUG_EXISTS',
        });
      }
    }

    const createData: Prisma.JobPostCreateInput = {
      ...jobData,
      translations: {
        create: [
          {
            lang: Language.VI,
            title,
            slug,
            salary: salary || 'Cạnh tranh',
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
    } catch (e) { }

    return result;
  }

  async findAll(filterDto: GetJobsFilterDto) {
    const { search, status, lang = Language.VI } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.JobPostWhereInput = {};

    if (search) {
      where.OR = [
        { translations: { some: { title: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const cacheKey = CACHE_KEYS.JOBS.GET_LIST(filterDto, lang);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached as PageDto<any>;
    } catch (e) { }

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
      const transMap = new Map(job.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...job,
        title: trans?.title || '',
        slug: trans?.slug || '',
        salary: trans?.salary || '',
        alternates: {
          viSlug: transMap.get(Language.VI)?.slug || '',
          enSlug: transMap.get(Language.EN)?.slug || null,
        },
      };
    });

    const pageMetaDto = new PageMetaDto(total, filterDto, jobs.length);
    const result = new PageDto(jobs, pageMetaDto);

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) { }

    return result;
  }

  async findOne(idOrSlug: string, lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.JOBS.DETAIL(idOrSlug, lang);

    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) { }

    const job = await this.prisma.jobPost.findFirst({
      where: isUuid(idOrSlug)
        ? { id: idOrSlug }
        : { translations: { some: { slug: idOrSlug } } },
      include: { detail: true, translations: true },
    });

    if (!job) {
      throw new NotFoundException({
        message: AppMessages.JOB.NOT_FOUND,
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    const transMap = new Map(job.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);

    const localizedJob = {
      ...job,
      title: trans?.title || '',
      slug: trans?.slug || '',
      salary: trans?.salary || '',
      detail: {
        sections: trans?.sections || [],
      },
      alternates: {
        viSlug: transMap.get(Language.VI)?.slug || '',
        enSlug: transMap.get(Language.EN)?.slug || null,
      },
    };

    try {
      await this.redis.client.set(cacheKey, localizedJob, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) { }

    return localizedJob;
  }

  async upsertTranslation(jobId: string, dto: UpsertJobPostTranslationDto) {
    const job = await this.prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({
        message: AppMessages.JOB.NOT_FOUND,
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    const slug = dto.slug?.trim() ? dto.slug.trim() : generateSlug(dto.title);

    let translation: Awaited<ReturnType<typeof this.prisma.jobPostTranslation.upsert>>;
    try {
      translation = await this.prisma.jobPostTranslation.upsert({
        where: { jobId_lang: { jobId, lang: dto.lang } },
        update: {
          title: dto.title,
          slug,
          salary: dto.salary !== undefined ? dto.salary : undefined,
          sections: dto.sections !== undefined ? dto.sections : undefined,
        },
        create: {
          jobId,
          lang: dto.lang,
          title: dto.title,
          slug,
          salary: dto.salary || 'Cạnh tranh',
          sections: dto.sections || [],
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
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return translation;
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    const existing = await this.prisma.jobPost.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.JOB.NOT_FOUND,
        errorCode: 'JOB_NOT_FOUND',
      });
    }

    const currentViTranslation = existing.translations.find((t) => t.lang === Language.VI);

    const { sections, title, slug: slugInput, salary, ...jobData } = updateJobDto;

    let slug: string | undefined;
    if (title) {
      slug = generateSlug(title);
    } else if (slugInput?.trim()) {
      slug = slugInput.trim();
    }

    if (slug && slug !== currentViTranslation?.slug) {
      const slugCheck = await this.prisma.jobPostTranslation.findUnique({
        where: { lang_slug: { lang: Language.VI, slug } },
      });
      if (slugCheck && slugCheck.jobId !== id) {
        throw new ConflictException({
          message: AppMessages.JOB.SLUG_EXISTS,
          errorCode: 'JOB_SLUG_EXISTS',
        });
      }
    }

    const updateData: Prisma.JobPostUpdateInput = {
      ...jobData,
    };

    await this.prisma.jobPost.update({
      where: { id },
      data: updateData,
    });

    if (title !== undefined || slug !== undefined || salary !== undefined || sections !== undefined) {
      const finalSlug = slug !== undefined ? (slug || generateSlug(title || currentViTranslation?.title || '')) : (currentViTranslation?.slug || generateSlug(title || currentViTranslation?.title || ''));
      await this.prisma.jobPostTranslation.upsert({
        where: { jobId_lang: { jobId: id, lang: Language.VI } },
        update: {
          ...(title !== undefined ? { title } : {}),
          slug: finalSlug,
          salary: salary !== undefined ? salary : undefined,
          sections: sections !== undefined ? sections : undefined,
        },
        create: {
          jobId: id,
          lang: Language.VI,
          title: title ?? currentViTranslation?.title ?? '',
          slug: finalSlug,
          salary: salary ?? currentViTranslation?.salary ?? 'Cạnh tranh',
          sections: sections ?? [],
        },
      });
    }

    // Re-fetch after upsert and return localized shape matching findOne response
    const updated = await this.prisma.jobPost.findUnique({
      where: { id },
      include: { detail: true, translations: true },
    });

    const transMap2 = new Map(updated!.translations.map((t) => [t.lang, t]));
    const trans2 = transMap2.get(Language.VI);

    try {
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return {
      ...updated!,
      title: trans2?.title || '',
      slug: trans2?.slug || '',
      salary: trans2?.salary || '',
      detail: { sections: trans2?.sections || [] },
      alternates: {
        viSlug: transMap2.get(Language.VI)?.slug || '',
        enSlug: transMap2.get(Language.EN)?.slug || null,
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.jobPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.JOB.NOT_FOUND,
        errorCode: 'JOB_NOT_FOUND',
      });
    }
    const result = await this.prisma.jobPost.delete({
      where: { id },
    });

    try {
      const keys = await this.redis.client.keys('cache:job*');
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }

    return result;
  }
}
