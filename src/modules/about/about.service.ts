import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CACHE_KEYS } from '../../common/constants/cache.constant';
import {
  CreateCompanyInfoDto,
  UpdateCompanyInfoDto,
  CreateFacilityDto,
  UpdateFacilityDto,
} from './dto/about.dto';

@Injectable()
export class AboutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

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
      await this.redis.client.set(CACHE_KEYS.ABOUT.COMPANY_INFO, items);
    } catch (e) {}

    return items;
  }

  async createCompanyInfo(dto: CreateCompanyInfoDto) {
    if (dto.orderIndex === undefined) {
      const max = await this.prisma.companyInfo.aggregate({
        _max: { orderIndex: true },
      });
      dto.orderIndex = (max._max.orderIndex ?? 0) + 1;
    }
    const result = await this.prisma.companyInfo.create({ data: dto });
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
      await this.redis.client.set(CACHE_KEYS.ABOUT.FACILITIES, items);
    } catch (e) {}

    return items;
  }

  async createFacility(dto: CreateFacilityDto) {
    if (dto.orderIndex === undefined) {
      const max = await this.prisma.facility.aggregate({
        _max: { orderIndex: true },
      });
      dto.orderIndex = (max._max.orderIndex ?? 0) + 1;
    }
    const result = await this.prisma.facility.create({ data: dto });
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
}
