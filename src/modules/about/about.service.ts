import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { Prisma } from '@prisma/client';
import {
  UpdateCompanyProfileDto,
  CreateCompanyInfoDto,
  UpdateCompanyInfoDto,
  CreateFacilityDto,
  UpdateFacilityDto,
  CreateCompanyHistoryEventDto,
  UpdateCompanyHistoryEventDto,
  UpdateHistoryEventOrdersDto,
  CreateCompanyLocationDto,
  UpdateCompanyLocationDto,
  UpdateCompanyLocationOrdersDto,
} from './dto/about.dto';

@Injectable()
export class AboutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Trích xuất đường dẫn URL src từ mã nhúng iframe (nếu người dùng dán cả thẻ <iframe ...>)
   */
  private extractMapUrl(input?: string): string | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : trimmed;
  }


  // ─── Company Profile ────────────────────────────────────────────────────────

  async getCompanyProfile() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.ABOUT.COMPANY_PROFILE);
      if (cached) return cached;
    } catch (e) {}

    const profile = await this.prisma.companyProfile.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', introHtml: '' },
    });

    try {
      await this.redis.client.set(CACHE_KEYS.ABOUT.COMPANY_PROFILE, profile, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return profile;
  }

  async updateCompanyProfile(dto: UpdateCompanyProfileDto) {
    const result = await this.prisma.companyProfile.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', introHtml: dto.introHtml ?? '', thumbnailUrl: dto.thumbnailUrl },
    });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_PROFILE);
    } catch (e) {}
    return result;
  }

  // ─── Company Info ───────────────────────────────────────────────────────────

  async getCompanyInfo() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.ABOUT.COMPANY_INFO);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.companyInfo.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set(CACHE_KEYS.ABOUT.COMPANY_INFO, items, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return items;
  }

  async createCompanyInfo(dto: CreateCompanyInfoDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.orderIndex === undefined) {
        const max = await tx.companyInfo.aggregate({ _max: { orderIndex: true } });
        dto.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.companyInfo.create({ data: dto });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_INFO);
    } catch (e) {}
    return result;
  }

  async updateCompanyInfo(id: string, dto: UpdateCompanyInfoDto) {
    const existing = await this.prisma.companyInfo.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy thông tin',
        errorCode: 'COMPANY_INFO_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyInfo.update({
      where: { id },
      data: dto,
    });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_INFO);
    } catch (e) {}
    return result;
  }

  async deleteCompanyInfo(id: string) {
    const existing = await this.prisma.companyInfo.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy thông tin',
        errorCode: 'COMPANY_INFO_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyInfo.delete({ where: { id } });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_INFO);
    } catch (e) {}
    return result;
  }

  // ─── Facilities ─────────────────────────────────────────────────────────────

  async getFacilities() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.ABOUT.FACILITIES);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.facility.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set(CACHE_KEYS.ABOUT.FACILITIES, items, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return items;
  }

  async createFacility(dto: CreateFacilityDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.orderIndex === undefined) {
        const max = await tx.facility.aggregate({ _max: { orderIndex: true } });
        dto.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.facility.create({ data: dto });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.FACILITIES);
    } catch (e) {}
    return result;
  }

  async updateFacility(id: string, dto: UpdateFacilityDto) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy cơ sở',
        errorCode: 'FACILITY_NOT_FOUND',
      });
    }
    const result = await this.prisma.facility.update({
      where: { id },
      data: dto,
    });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.FACILITIES);
    } catch (e) {}
    return result;
  }

  async deleteFacility(id: string) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy cơ sở',
        errorCode: 'FACILITY_NOT_FOUND',
      });
    }
    const result = await this.prisma.facility.delete({ where: { id } });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.FACILITIES);
    } catch (e) {}
    return result;
  }

  // ─── Company History Events ──────────────────────────────────────────────────

  async getHistoryEvents() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.ABOUT.HISTORY_EVENTS);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.companyHistoryEvent.findMany({
      orderBy: [{ period: 'asc' }, { orderIndex: 'asc' }],
    });

    try {
      await this.redis.client.set(CACHE_KEYS.ABOUT.HISTORY_EVENTS, items, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return items;
  }

  async createHistoryEvent(dto: CreateCompanyHistoryEventDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.orderIndex === undefined) {
        const max = await tx.companyHistoryEvent.aggregate({ _max: { orderIndex: true } });
        dto.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.companyHistoryEvent.create({ data: dto });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.HISTORY_EVENTS);
    } catch (e) {}
    return result;
  }

  async updateHistoryEvent(id: string, dto: UpdateCompanyHistoryEventDto) {
    const existing = await this.prisma.companyHistoryEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy sự kiện lịch sử',
        errorCode: 'HISTORY_EVENT_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyHistoryEvent.update({ where: { id }, data: dto });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.HISTORY_EVENTS);
    } catch (e) {}
    return result;
  }

  async updateHistoryEventOrders(dto: UpdateHistoryEventOrdersDto) {
    const result = await this.prisma.$transaction(
      dto.events.map((event) =>
        this.prisma.companyHistoryEvent.update({
          where: { id: event.id },
          data: { orderIndex: event.orderIndex },
        }),
      ),
    );
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.HISTORY_EVENTS);
    } catch (e) {}
    return result;
  }

  async deleteHistoryEvent(id: string) {
    const existing = await this.prisma.companyHistoryEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy sự kiện lịch sử',
        errorCode: 'HISTORY_EVENT_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyHistoryEvent.delete({ where: { id } });
    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.HISTORY_EVENTS);
    } catch (e) {}
    return result;
  }

  // ─── Company Locations ───────────────────────────────────────────────────────

  async getCompanyLocations() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.ABOUT.COMPANY_LOCATIONS);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.companyLocation.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    try {
      await this.redis.client.set(CACHE_KEYS.ABOUT.COMPANY_LOCATIONS, items, {
        ex: CACHE_TTL.TWENTY_FOUR_HOURS,
      });
    } catch (e) {}

    return items;
  }

  async createCompanyLocation(dto: CreateCompanyLocationDto) {
    const processedDto = { ...dto };
    if (dto.mapUrl !== undefined) {
      processedDto.mapUrl = this.extractMapUrl(dto.mapUrl);
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        if (processedDto.orderIndex === undefined) {
          const max = await tx.companyLocation.aggregate({
            _max: { orderIndex: true },
          });
          processedDto.orderIndex = (max._max.orderIndex ?? 0) + 1;
        }
        return tx.companyLocation.create({ data: processedDto });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_LOCATIONS);
    } catch (e) {}

    return result;
  }

  async updateCompanyLocation(id: string, dto: UpdateCompanyLocationDto) {
    const existing = await this.prisma.companyLocation.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy vị trí công ty',
        errorCode: 'COMPANY_LOCATION_NOT_FOUND',
      });
    }

    const processedDto = { ...dto };
    if (dto.mapUrl !== undefined) {
      processedDto.mapUrl = this.extractMapUrl(dto.mapUrl);
    }

    const result = await this.prisma.companyLocation.update({
      where: { id },
      data: processedDto,
    });

    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_LOCATIONS);
    } catch (e) {}

    return result;
  }

  async updateCompanyLocationOrders(dto: UpdateCompanyLocationOrdersDto) {
    const result = await this.prisma.$transaction(
      dto.locations.map((item) =>
        this.prisma.companyLocation.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_LOCATIONS);
    } catch (e) {}

    return result;
  }

  async deleteCompanyLocation(id: string) {
    const existing = await this.prisma.companyLocation.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy vị trí công ty',
        errorCode: 'COMPANY_LOCATION_NOT_FOUND',
      });
    }

    const result = await this.prisma.companyLocation.delete({ where: { id } });

    try {
      await this.redis.client.del(CACHE_KEYS.ABOUT.COMPANY_LOCATIONS);
    } catch (e) {}

    return result;
  }
}
