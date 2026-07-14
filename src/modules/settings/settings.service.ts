import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { UpdateSettingDto, SloganDto, TimelineDto, BannerDto } from './dto/settings.dto';
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
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException({
        message: 'Không tìm thấy cấu hình này',
        errorCode: 'SETTING_NOT_FOUND',
      });
    }
    return setting;
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
      const cached = await this.redis.client.get(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS);
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const slogans = await this.prisma.companySlogan.findMany({ orderBy: { orderIndex: 'asc' } });
    
    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS, slogans);
    } catch (e) {}

    return slogans;
  }

  async createSlogan(dto: SloganDto) {
    const result = await this.prisma.companySlogan.create({ data: dto });
    try { await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS); } catch (e) {}
    return result;
  }

  async deleteSlogan(id: string) {
    const result = await this.prisma.companySlogan.delete({ where: { id } });
    try { await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_SLOGANS); } catch (e) {}
    return result;
  }

  // --- COMPANY TIMELINE ---
  async getTimelines() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES);
      if (cached) {
        return cached;
      }
    } catch (e) {}

    const timelines = await this.prisma.companyTimeline.findMany({ orderBy: { orderIndex: 'asc' } });

    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES, timelines);
    } catch (e) {}

    return timelines;
  }

  async createTimeline(dto: TimelineDto) {
    const result = await this.prisma.companyTimeline.create({ data: dto });
    try { await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES); } catch (e) {}
    return result;
  }

  async deleteTimeline(id: string) {
    const result = await this.prisma.companyTimeline.delete({ where: { id } });
    try { await this.redis.client.del(CACHE_KEYS.SETTINGS.COMPANY_TIMELINES); } catch (e) {}
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
      orderBy: { orderIndex: 'asc' } 
    });

    try {
      await this.redis.client.set(CACHE_KEYS.SETTINGS.BANNERS, banners);
    } catch (e) {}

    return banners;
  }

  async createBanner(dto: BannerDto) {
    const result = await this.prisma.banner.create({ data: dto });
    try { await this.redis.client.del(CACHE_KEYS.SETTINGS.BANNERS); } catch (e) {}
    return result;
  }

  async deleteBanner(id: string) {
    const result = await this.prisma.banner.delete({ where: { id } });
    try { await this.redis.client.del(CACHE_KEYS.SETTINGS.BANNERS); } catch (e) {}
    return result;
  }
}
