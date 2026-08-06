import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { AppMessages } from '../../common/constants/messages.constant';
import { Prisma, Language } from '@prisma/client';
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
import {
  UpsertCompanyProfileTranslationDto,
  UpsertCompanyInfoTranslationDto,
  UpsertFacilityTranslationDto,
  UpsertHistoryEventTranslationDto,
  UpsertCompanyLocationTranslationDto,
} from '../../common/dto/upsert-translation.dto';

@Injectable()
export class AboutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private extractMapUrl(input?: string): string | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : trimmed;
  }

  private async invalidateAboutCache() {
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.ABOUT.LIST_PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
    try {
      const aiKeys = await this.redis.client.keys('ai:tool:getAboutCompany:*');
      if (aiKeys.length > 0) await this.redis.client.del(...aiKeys);
    } catch (e) {}
  }

  // ─── Company Profile ────────────────────────────────────────────────────────

  async getCompanyProfile(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.ABOUT.COMPANY_PROFILE(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const profile = await this.prisma.companyProfile.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
      include: { translations: true },
    });

    const transMap = new Map(profile.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);
    const result = {
      ...profile,
      introHtml: trans?.introHtml || '',
    };

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return result;
  }

  async updateCompanyProfile(dto: UpdateCompanyProfileDto) {
    const { introHtml, ...profileData } = dto;

    await this.prisma.companyProfile.upsert({
      where: { id: 'singleton' },
      update: profileData,
      create: { id: 'singleton', ...profileData },
    });

    if (introHtml !== undefined) {
      await this.prisma.companyProfileTranslation.upsert({
        where: { profileId_lang: { profileId: 'singleton', lang: Language.VI } },
        update: { introHtml },
        create: { profileId: 'singleton', lang: Language.VI, introHtml },
      });
    }

    await this.invalidateAboutCache();

    // Re-fetch after upsert so introHtml in response is up-to-date
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: 'singleton' },
      include: { translations: true },
    });
    const transMap = new Map(profile!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(Language.VI);
    return { ...profile!, introHtml: trans?.introHtml || '' };
  }

  async upsertCompanyProfileTranslation(dto: UpsertCompanyProfileTranslationDto) {
    const profile = await this.prisma.companyProfile.findUnique({ where: { id: 'singleton' } });
    if (!profile) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_PROFILE.NOT_FOUND,
        errorCode: 'COMPANY_PROFILE_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.companyProfileTranslation.upsert>>;
    try {
      translation = await this.prisma.companyProfileTranslation.upsert({
        where: { profileId_lang: { profileId: 'singleton', lang: dto.lang } },
        update: { introHtml: dto.introHtml },
        create: { profileId: 'singleton', lang: dto.lang, introHtml: dto.introHtml },
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

    await this.invalidateAboutCache();
    return translation;
  }

  // ─── Company Info ───────────────────────────────────────────────────────────

  async getCompanyInfo(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.ABOUT.COMPANY_INFO(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.companyInfo.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = items.map((item) => {
      const transMap = new Map(item.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...item,
        label: trans?.label || '',
        value: trans?.value || '',
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localized;
  }

  async createCompanyInfo(dto: CreateCompanyInfoDto) {
    const { label, value, ...companyInfoData } = dto;
    const result = await this.prisma.$transaction(async (tx) => {
      if (companyInfoData.orderIndex === undefined) {
        const max = await tx.companyInfo.aggregate({ _max: { orderIndex: true } });
        companyInfoData.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.companyInfo.create({
        data: {
          ...companyInfoData,
          translations: {
            create: [{ lang: Language.VI, label, value }],
          },
        },
        include: { translations: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.invalidateAboutCache();
    return result;
  }

  async updateCompanyInfo(id: string, dto: UpdateCompanyInfoDto) {
    const existing = await this.prisma.companyInfo.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_INFO.NOT_FOUND,
        errorCode: 'COMPANY_INFO_NOT_FOUND',
      });
    }
    const currentViTranslation = existing.translations.find((t) => t.lang === Language.VI);
    const { label, value, ...companyInfoData } = dto;
    await this.prisma.companyInfo.update({ where: { id }, data: companyInfoData });

    if (label !== undefined || value !== undefined) {
      await this.prisma.companyInfoTranslation.upsert({
        where: { companyInfoId_lang: { companyInfoId: id, lang: Language.VI } },
        update: { label: label ?? currentViTranslation?.label, value: value ?? currentViTranslation?.value },
        create: {
          companyInfoId: id,
          lang: Language.VI,
          label: label ?? currentViTranslation?.label ?? '',
          value: value ?? currentViTranslation?.value ?? '',
        },
      });
    }

    await this.invalidateAboutCache();

    const updated = await this.prisma.companyInfo.findUnique({
      where: { id },
      include: { translations: true },
    });
    const transMap = new Map(updated!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(Language.VI);
    return { ...updated!, label: trans?.label || '', value: trans?.value || '' };
  }

  async upsertCompanyInfoTranslation(id: string, dto: UpsertCompanyInfoTranslationDto) {
    const existing = await this.prisma.companyInfo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_INFO.NOT_FOUND,
        errorCode: 'COMPANY_INFO_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.companyInfoTranslation.upsert>>;
    try {
      translation = await this.prisma.companyInfoTranslation.upsert({
        where: { companyInfoId_lang: { companyInfoId: id, lang: dto.lang } },
        update: { label: dto.label, value: dto.value },
        create: { companyInfoId: id, lang: dto.lang, label: dto.label, value: dto.value },
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

    await this.invalidateAboutCache();
    return translation;
  }

  async deleteCompanyInfo(id: string) {
    const existing = await this.prisma.companyInfo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_INFO.NOT_FOUND,
        errorCode: 'COMPANY_INFO_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyInfo.delete({ where: { id } });
    await this.invalidateAboutCache();
    return result;
  }

  // ─── Facilities ─────────────────────────────────────────────────────────────

  async getFacilities(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.ABOUT.FACILITIES(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.facility.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = items.map((item) => {
      const transMap = new Map(item.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...item,
        name: trans?.name || '',
        country: trans?.country || '',
        address: trans?.address || '',
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localized;
  }

  async createFacility(dto: CreateFacilityDto) {
    const { name, country, address, ...facilityData } = dto;
    const result = await this.prisma.$transaction(async (tx) => {
      if (facilityData.orderIndex === undefined) {
        const max = await tx.facility.aggregate({ _max: { orderIndex: true } });
        facilityData.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.facility.create({
        data: {
          ...facilityData,
          translations: {
            create: [{ lang: Language.VI, name, country, address }],
          },
        },
        include: { translations: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.invalidateAboutCache();
    return result;
  }

  async updateFacility(id: string, dto: UpdateFacilityDto) {
    const existing = await this.prisma.facility.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.FACILITY.NOT_FOUND,
        errorCode: 'FACILITY_NOT_FOUND',
      });
    }
    const currentViTranslation = existing.translations.find((t) => t.lang === Language.VI);
    const { name, country, address, ...facilityData } = dto;
    await this.prisma.facility.update({ where: { id }, data: facilityData });

    if (name !== undefined || country !== undefined || address !== undefined) {
      await this.prisma.facilityTranslation.upsert({
        where: { facilityId_lang: { facilityId: id, lang: Language.VI } },
        update: {
          name: name ?? currentViTranslation?.name,
          country: country ?? currentViTranslation?.country,
          address: address ?? currentViTranslation?.address,
        },
        create: {
          facilityId: id,
          lang: Language.VI,
          name: name ?? currentViTranslation?.name ?? '',
          country: country ?? currentViTranslation?.country ?? '',
          address: address ?? currentViTranslation?.address ?? '',
        },
      });
    }

    await this.invalidateAboutCache();

    const updated = await this.prisma.facility.findUnique({
      where: { id },
      include: { translations: true },
    });
    const transMap = new Map(updated!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(Language.VI);
    return { ...updated!, name: trans?.name || '', country: trans?.country || '', address: trans?.address || '' };
  }

  async upsertFacilityTranslation(id: string, dto: UpsertFacilityTranslationDto) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.FACILITY.NOT_FOUND,
        errorCode: 'FACILITY_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.facilityTranslation.upsert>>;
    try {
      translation = await this.prisma.facilityTranslation.upsert({
        where: { facilityId_lang: { facilityId: id, lang: dto.lang } },
        update: { name: dto.name, country: dto.country, address: dto.address },
        create: { facilityId: id, lang: dto.lang, name: dto.name, country: dto.country, address: dto.address },
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

    await this.invalidateAboutCache();
    return translation;
  }

  async deleteFacility(id: string) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.FACILITY.NOT_FOUND,
        errorCode: 'FACILITY_NOT_FOUND',
      });
    }
    const result = await this.prisma.facility.delete({ where: { id } });
    await this.invalidateAboutCache();
    return result;
  }

  // ─── Company History Events ──────────────────────────────────────────────────

  async getHistoryEvents(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.ABOUT.HISTORY_EVENTS(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.companyHistoryEvent.findMany({
      orderBy: [{ year: 'asc' }, { orderIndex: 'asc' }],
      include: { translations: true },
    });

    const localized = items.map((item) => {
      const transMap = new Map(item.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...item,
        period: trans?.period || '',
        text: trans?.text || '',
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localized;
  }

  async createHistoryEvent(dto: CreateCompanyHistoryEventDto) {
    const { period, text, ...eventData } = dto;
    const result = await this.prisma.$transaction(async (tx) => {
      if (eventData.orderIndex === undefined) {
        const max = await tx.companyHistoryEvent.aggregate({ _max: { orderIndex: true } });
        eventData.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.companyHistoryEvent.create({
        data: {
          ...eventData,
          translations: {
            create: [{ lang: Language.VI, period, text }],
          },
        },
        include: { translations: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.invalidateAboutCache();
    return result;
  }

  async updateHistoryEvent(id: string, dto: UpdateCompanyHistoryEventDto) {
    const existing = await this.prisma.companyHistoryEvent.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.HISTORY_EVENT.NOT_FOUND,
        errorCode: 'HISTORY_EVENT_NOT_FOUND',
      });
    }
    const currentViTranslation = existing.translations.find((t) => t.lang === Language.VI);
    const { period, text, ...eventData } = dto;
    await this.prisma.companyHistoryEvent.update({ where: { id }, data: eventData });

    if (period !== undefined || text !== undefined) {
      await this.prisma.companyHistoryEventTranslation.upsert({
        where: { eventId_lang: { eventId: id, lang: Language.VI } },
        update: { period: period ?? currentViTranslation?.period, text: text ?? currentViTranslation?.text },
        create: {
          eventId: id,
          lang: Language.VI,
          period: period ?? currentViTranslation?.period ?? '',
          text: text ?? currentViTranslation?.text ?? '',
        },
      });
    }

    await this.invalidateAboutCache();

    const updated = await this.prisma.companyHistoryEvent.findUnique({
      where: { id },
      include: { translations: true },
    });
    const transMap = new Map(updated!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(Language.VI);
    return { ...updated!, period: trans?.period || '', text: trans?.text || '' };
  }

  async upsertHistoryEventTranslation(id: string, dto: UpsertHistoryEventTranslationDto) {
    const existing = await this.prisma.companyHistoryEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.HISTORY_EVENT.NOT_FOUND,
        errorCode: 'HISTORY_EVENT_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.companyHistoryEventTranslation.upsert>>;
    try {
      translation = await this.prisma.companyHistoryEventTranslation.upsert({
        where: { eventId_lang: { eventId: id, lang: dto.lang } },
        update: { period: dto.period, text: dto.text },
        create: { eventId: id, lang: dto.lang, period: dto.period, text: dto.text },
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

    await this.invalidateAboutCache();
    return translation;
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
    await this.invalidateAboutCache();
    return result;
  }

  async deleteHistoryEvent(id: string) {
    const existing = await this.prisma.companyHistoryEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.HISTORY_EVENT.NOT_FOUND,
        errorCode: 'HISTORY_EVENT_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyHistoryEvent.delete({ where: { id } });
    await this.invalidateAboutCache();
    return result;
  }

  // ─── Company Locations ───────────────────────────────────────────────────────

  async getCompanyLocations(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.ABOUT.COMPANY_LOCATIONS(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const items = await this.prisma.companyLocation.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { translations: true },
    });

    const localized = items.map((item) => {
      const transMap = new Map(item.translations.map((t) => [t.lang, t]));
      const trans = transMap.get(lang) ?? transMap.get(Language.VI);
      return {
        ...item,
        title: trans?.title || '',
        addressLabel: trans?.addressLabel || '',
        address: trans?.address || '',
      };
    });

    try {
      await this.redis.client.set(cacheKey, localized, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return localized;
  }

  async createCompanyLocation(dto: CreateCompanyLocationDto) {
    const { title, addressLabel, address, ...locationData } = dto;
    if (locationData.mapUrl !== undefined) {
      locationData.mapUrl = this.extractMapUrl(locationData.mapUrl);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (locationData.orderIndex === undefined) {
        const max = await tx.companyLocation.aggregate({ _max: { orderIndex: true } });
        locationData.orderIndex = (max._max.orderIndex ?? 0) + 1;
      }
      return tx.companyLocation.create({
        data: {
          ...locationData,
          translations: {
            create: [{
              lang: Language.VI,
              title,
              addressLabel,
              address,
            }],
          },
        },
        include: { translations: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.invalidateAboutCache();
    return result;
  }

  async updateCompanyLocation(id: string, dto: UpdateCompanyLocationDto) {
    const existing = await this.prisma.companyLocation.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_LOCATION.NOT_FOUND,
        errorCode: 'COMPANY_LOCATION_NOT_FOUND',
      });
    }
    const currentViTranslation = existing.translations.find((t) => t.lang === Language.VI);

    const { title, addressLabel, address, ...locationData } = dto;
    if (locationData.mapUrl !== undefined) {
      locationData.mapUrl = this.extractMapUrl(locationData.mapUrl);
    }

    await this.prisma.companyLocation.update({ where: { id }, data: locationData });

    if (title !== undefined || addressLabel !== undefined || address !== undefined) {
      await this.prisma.companyLocationTranslation.upsert({
        where: { locationId_lang: { locationId: id, lang: Language.VI } },
        update: {
          title: title ?? currentViTranslation?.title,
          addressLabel: addressLabel ?? currentViTranslation?.addressLabel,
          address: address ?? currentViTranslation?.address,
        },
        create: {
          locationId: id,
          lang: Language.VI,
          title: title ?? currentViTranslation?.title ?? '',
          addressLabel: addressLabel ?? currentViTranslation?.addressLabel ?? '',
          address: address ?? currentViTranslation?.address ?? '',
        },
      });
    }

    await this.invalidateAboutCache();

    const updated = await this.prisma.companyLocation.findUnique({
      where: { id },
      include: { translations: true },
    });
    const transMap = new Map(updated!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(Language.VI);
    return {
      ...updated!,
      title: trans?.title || '',
      addressLabel: trans?.addressLabel || '',
      address: trans?.address || '',
    };
  }

  async upsertCompanyLocationTranslation(id: string, dto: UpsertCompanyLocationTranslationDto) {
    const existing = await this.prisma.companyLocation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_LOCATION.NOT_FOUND,
        errorCode: 'COMPANY_LOCATION_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.companyLocationTranslation.upsert>>;
    try {
      translation = await this.prisma.companyLocationTranslation.upsert({
        where: { locationId_lang: { locationId: id, lang: dto.lang } },
        update: { title: dto.title, addressLabel: dto.addressLabel, address: dto.address },
        create: { locationId: id, lang: dto.lang, title: dto.title, addressLabel: dto.addressLabel, address: dto.address },
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

    await this.invalidateAboutCache();
    return translation;
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
    await this.invalidateAboutCache();
    return result;
  }

  async deleteCompanyLocation(id: string) {
    const existing = await this.prisma.companyLocation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.COMPANY_LOCATION.NOT_FOUND,
        errorCode: 'COMPANY_LOCATION_NOT_FOUND',
      });
    }
    const result = await this.prisma.companyLocation.delete({ where: { id } });
    await this.invalidateAboutCache();
    return result;
  }
}
