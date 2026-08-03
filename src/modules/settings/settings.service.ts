import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { Prisma, Language } from '@prisma/client';
import {
  UpdateSettingDto,
  SloganDto,
  UpdateSloganDto,
  UpdateSloganOrdersDto,
  BannerDto,
  UpdateBannerDto,
  UpdateBannerOrdersDto,
} from './dto/settings.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import {
  UpsertCompanySloganTranslationDto,
  UpsertBannerTranslationDto,
} from '../../common/dto/upsert-translation.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // --- SYSTEM SETTINGS ---
  async getSettings() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.SETTINGS.SYSTEM);
      if (cached) return cached;
    } catch (e) {}

    const settings = await this.prisma.systemSetting.findMany();

    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.SYSTEM, settings, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return settings;
  }

  async getSettingByKey(key: string) {
    const settings = await this.getSettings() as { key: string; value: string }[];
    const found = Array.isArray(settings) ? settings.find((s) => s.key === key) : null;
    return found ?? { key, value: '' };
  }

  async updateSetting(key: string, updateDto: UpdateSettingDto) {
    const result = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: updateDto.value },
      create: { key, value: updateDto.value },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.SYSTEM);
    } catch (e) {}

    return result;
  }

  // --- COMPANY SLOGANS ---
  async getSlogans(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.SETTINGS.COMPANY_SLOGANS(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const slogans = await this.prisma.companySlogan.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = slogans.map((slogan) => {
      const transMap = new Map(slogan.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...slogan,
        title: trans?.title ?? slogan.title,
        description: trans?.description ?? slogan.description,
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localized;
  }

  async createSlogan(dto: SloganDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.orderIndex === undefined) {
        const maxOrder = await tx.companySlogan.aggregate({ _max: { orderIndex: true } });
        dto.orderIndex = (maxOrder._max.orderIndex || 0) + 1;
      }
      return tx.companySlogan.create({
        data: {
          ...dto,
          translations: {
            create: [{ lang: Language.VI, title: dto.title, description: dto.description }],
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.LIST_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  async updateSlogan(id: string, dto: UpdateSloganDto) {
    const existing = await this.prisma.companySlogan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_SLOGAN.NOT_FOUND,
        errorCode: 'SLOGAN_NOT_FOUND',
      });
    }
    const result = await this.prisma.companySlogan.update({ where: { id }, data: dto as any });

    if (dto.title || dto.description !== undefined) {
      await this.prisma.companySloganTranslation.upsert({
        where: { sloganId_lang: { sloganId: id, lang: Language.VI } },
        update: { title: dto.title ?? existing.title, description: dto.description ?? existing.description },
        create: { sloganId: id, lang: Language.VI, title: dto.title ?? existing.title, description: dto.description ?? existing.description },
      });
    }

    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.LIST_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  async upsertSloganTranslation(id: string, dto: UpsertCompanySloganTranslationDto) {
    const existing = await this.prisma.companySlogan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_SLOGAN.NOT_FOUND,
        errorCode: 'SLOGAN_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.companySloganTranslation.upsert>>;
    try {
      translation = await this.prisma.companySloganTranslation.upsert({
        where: { sloganId_lang: { sloganId: id, lang: dto.lang } },
        update: { title: dto.title, description: dto.description },
        create: { sloganId: id, lang: dto.lang, title: dto.title, description: dto.description },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          message: AppMessages.TRANSLATION.INVALID_LANGUAGE,
          errorCode: 'TRANSLATION_CONFLICT',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.LIST_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return translation;
  }

  async updateSloganOrders(dto: UpdateSloganOrdersDto) {
    const result = await this.prisma.$transaction(
      dto.slogans.map((slogan) =>
        this.prisma.companySlogan.update({
          where: { id: slogan.id },
          data: { orderIndex: slogan.orderIndex },
        }),
      ),
    );
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.LIST_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  async deleteSlogan(id: string) {
    const result = await this.prisma.companySlogan.delete({ where: { id } });
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.LIST_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  // --- BANNERS ---
  async getBanners(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.SETTINGS.BANNERS(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const banners = await this.prisma.banner.findMany({
      where: { status: true },
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = banners.map((banner) => {
      const transMap = new Map(banner.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...banner,
        title: trans?.title ?? banner.title,
        description: trans?.description ?? banner.description,
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localized;
  }

  async createBanner(dto: BannerDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.orderIndex === undefined) {
        const maxOrder = await tx.banner.aggregate({ _max: { orderIndex: true } });
        dto.orderIndex = (maxOrder._max.orderIndex || 0) + 1;
      }
      return tx.banner.create({
        data: {
          ...(dto as any),
          translations: {
            create: [{ lang: Language.VI, title: (dto as any).title, description: (dto as any).description }],
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.BANNERS_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.BANNER.NOT_FOUND,
        errorCode: 'BANNER_NOT_FOUND',
      });
    }
    const result = await this.prisma.banner.update({ where: { id }, data: dto as any });

    if ((dto as any).title !== undefined || (dto as any).description !== undefined) {
      await this.prisma.bannerTranslation.upsert({
        where: { bannerId_lang: { bannerId: id, lang: Language.VI } },
        update: { title: (dto as any).title ?? existing.title, description: (dto as any).description ?? existing.description },
        create: { bannerId: id, lang: Language.VI, title: (dto as any).title ?? existing.title, description: (dto as any).description ?? existing.description },
      });
    }

    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.BANNERS_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  async upsertBannerTranslation(id: string, dto: UpsertBannerTranslationDto) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.BANNER.NOT_FOUND,
        errorCode: 'BANNER_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.bannerTranslation.upsert>>;
    try {
      translation = await this.prisma.bannerTranslation.upsert({
        where: { bannerId_lang: { bannerId: id, lang: dto.lang } },
        update: { title: dto.title, description: dto.description },
        create: { bannerId: id, lang: dto.lang, title: dto.title, description: dto.description },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          message: AppMessages.TRANSLATION.INVALID_LANGUAGE,
          errorCode: 'TRANSLATION_CONFLICT',
        });
      }
      throw error;
    }

    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.BANNERS_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return translation;
  }

  async deleteBanner(id: string) {
    const result = await this.prisma.banner.delete({ where: { id } });
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.BANNERS_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }

  async updateBannerOrders(dto: UpdateBannerOrdersDto) {
    const result = await this.prisma.$transaction(
      dto.banners.map((banner) =>
        this.prisma.banner.update({
          where: { id: banner.id },
          data: { orderIndex: banner.orderIndex },
        }),
      ),
    );
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.SETTINGS.BANNERS_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    return result;
  }
}
