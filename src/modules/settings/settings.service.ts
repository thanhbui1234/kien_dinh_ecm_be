import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import {
  UpdateSettingDto,
  SloganDto,
  UpdateSloganDto,
  UpdateSloganOrdersDto,
  TimelineDto,
  UpdateTimelineDto,
  UpdateTimelineOrdersDto,
  BannerDto,
  UpdateBannerDto,
  UpdateBannerOrdersDto,
} from './dto/settings.dto';
import { CACHE_KEYS } from '../../common/constants/cache.constant';

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
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const settings = await this.prisma.systemSetting.findMany();

    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.SYSTEM, settings);
    } catch (e) {}

    return settings;
  }

  async getSettingByKey(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting ?? { key, value: '' };
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
  async getSlogans() {
    try {
      const cached = await this.redis.client.get(
        CACHE_KEYS.SETTINGS.COMPANY_SLOGANS,
      );
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const slogans = await this.prisma.companySlogan.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS, slogans);
    } catch (e) {}

    return slogans;
  }

  async createSlogan(dto: SloganDto) {
    if (dto.orderIndex === undefined) {
      const maxOrder = await this.prisma.companySlogan.aggregate({
        _max: { orderIndex: true },
      });
      dto.orderIndex = (maxOrder._max.orderIndex || 0) + 1;
    }
    const result = await this.prisma.companySlogan.create({ data: dto });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS);
    } catch (e) {}
    return result;
  }

  async updateSlogan(id: string, dto: UpdateSloganDto) {
    const existing = await this.prisma.companySlogan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy slogan',
        errorCode: 'SLOGAN_NOT_FOUND',
      });
    }
    const result = await this.prisma.companySlogan.update({
      where: { id },
      data: dto as any,
    });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS);
    } catch (e) {}
    return result;
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
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS);
    } catch (e) {}
    return result;
  }

  async deleteSlogan(id: string) {
    const result = await this.prisma.companySlogan.delete({ where: { id } });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS);
    } catch (e) {}
    return result;
  }

  // --- COMPANY TIMELINE ---
  async getTimelines() {
    try {
      const cached = await this.redis.client.get(
        CACHE_KEYS.SETTINGS.COMPANY_TIMELINES,
      );
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const timelines = await this.prisma.companyTimeline.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set(
        CACHE_KEYS.SETTINGS.COMPANY_TIMELINES,
        timelines,
      );
    } catch (e) {}

    return timelines;
  }

  async createTimeline(dto: TimelineDto) {
    if (dto.orderIndex === undefined) {
      const maxOrder = await this.prisma.companyTimeline.aggregate({
        _max: { orderIndex: true },
      });
      dto.orderIndex = (maxOrder._max.orderIndex || 0) + 1;
    }
    const result = await this.prisma.companyTimeline.create({ data: dto });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES);
    } catch (e) {}
    return result;
  }

  async updateTimeline(id: string, dto: UpdateTimelineDto) {
    const existing = await this.prisma.companyTimeline.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy timeline',
        errorCode: 'TIMELINE_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyTimeline.update({
      where: { id },
      data: dto as any,
    });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES);
    } catch (e) {}
    return result;
  }

  async updateTimelineOrders(dto: UpdateTimelineOrdersDto) {
    const result = await this.prisma.$transaction(
      dto.timelines.map((timeline) =>
        this.prisma.companyTimeline.update({
          where: { id: timeline.id },
          data: { orderIndex: timeline.orderIndex },
        }),
      ),
    );
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES);
    } catch (e) {}
    return result;
  }

  async deleteTimeline(id: string) {
    const result = await this.prisma.companyTimeline.delete({ where: { id } });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES);
    } catch (e) {}
    return result;
  }

  // --- BANNERS ---
  async getBanners() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.SETTINGS.BANNERS);
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const banners = await this.prisma.banner.findMany({
      where: { status: true },
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.BANNERS, banners);
    } catch (e) {}

    return banners;
  }

  async createBanner(dto: BannerDto) {
    if (dto.orderIndex === undefined) {
      const maxOrder = await this.prisma.banner.aggregate({
        _max: { orderIndex: true },
      });
      dto.orderIndex = (maxOrder._max.orderIndex || 0) + 1;
    }
    const result = await this.prisma.banner.create({ data: dto as any });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.BANNERS);
    } catch (e) {}
    return result;
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy banner',
        errorCode: 'BANNER_NOT_FOUND',
      });
    }
    const result = await this.prisma.banner.update({
      where: { id },
      data: dto as any,
    });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.BANNERS);
    } catch (e) {}
    return result;
  }

  async deleteBanner(id: string) {
    const result = await this.prisma.banner.delete({ where: { id } });
    try {
      await this.redis.client.del(CACHE_KEYS.SETTINGS.BANNERS);
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
      await this.redis.client.del(CACHE_KEYS.SETTINGS.BANNERS);
    } catch (e) {}
    return result;
  }
}
