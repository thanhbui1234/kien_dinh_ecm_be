import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { UpdateContactSettingDto } from './dto/contact-setting.dto';
import { UpsertContactSettingTranslationDto } from '../../common/dto/upsert-translation.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { Prisma, Language } from '@prisma/client';

@Injectable()
export class ContactSettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  private extractMapUrl(input?: string): string | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : trimmed;
  }

  private async invalidateContactCache() {
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.CONTACT.PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) { }
  }

  async getContactSetting(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.CONTACT.SETTING(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) { }

    let setting = await this.prisma.contactSetting.findUnique({
      where: { id: 'singleton' },
      include: { translations: true },
    });

    if (!setting) {
      setting = await this.prisma.contactSetting.create({
        data: {
          id: 'singleton',
          hotline: '0374 864 110',
          zalo: '0374 864 110',
          email: 'info@kiendinhecm.com',
          translations: {
            create: [{
              lang: Language.VI,
              title: 'Liên hệ với chúng tôi',
              description: 'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
            }],
          },
        },
        include: { translations: true },
      });
    }

    const transMap = new Map(setting.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);
    const result = {
      ...setting,
      title: trans?.title || '',
      description: trans?.description || '',
      address: trans?.address || '',
      workingHours: trans?.workingHours || '',
    };

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) { }

    return result;
  }

  async updateContactSetting(dto: UpdateContactSettingDto) {
    const { title, description, address, workingHours, ...settingData } = dto;
    if (settingData.mapUrl !== undefined) {
      settingData.mapUrl = this.extractMapUrl(settingData.mapUrl);
    }

    const existing = await this.prisma.contactSetting.findUnique({
      where: { id: 'singleton' },
      include: { translations: true },
    });
    const currentViTranslation = existing?.translations.find((t) => t.lang === Language.VI);

    await this.prisma.contactSetting.upsert({
      where: { id: 'singleton' },
      update: settingData,
      create: {
        id: 'singleton',
        hotline: settingData.hotline ?? '094320676869',
        zalo: settingData.zalo ?? '094320676869',
        email: settingData.email ?? 'info@kiendinhecm.com',
        mapUrl: settingData.mapUrl,
      },
    });

    if (title !== undefined || description !== undefined || address !== undefined || workingHours !== undefined) {
      await this.prisma.contactSettingTranslation.upsert({
        where: { settingId_lang: { settingId: 'singleton', lang: Language.VI } },
        update: {
          title: title ?? currentViTranslation?.title,
          description: description ?? currentViTranslation?.description,
          address: address ?? currentViTranslation?.address,
          workingHours: workingHours ?? currentViTranslation?.workingHours,
        },
        create: {
          settingId: 'singleton',
          lang: Language.VI,
          title: title ?? currentViTranslation?.title ?? 'Liên hệ với chúng tôi',
          description: description ?? currentViTranslation?.description ?? '',
          address: address ?? currentViTranslation?.address,
          workingHours: workingHours ?? currentViTranslation?.workingHours,
        },
      });
    }

    await this.invalidateContactCache();

    const updated = await this.prisma.contactSetting.findUnique({
      where: { id: 'singleton' },
      include: { translations: true },
    });
    const transMap = new Map(updated!.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(Language.VI);
    return {
      ...updated!,
      title: trans?.title || '',
      description: trans?.description || '',
      address: trans?.address || '',
      workingHours: trans?.workingHours || '',
    };
  }

  async upsertContactSettingTranslation(dto: UpsertContactSettingTranslationDto) {
    const existing = await this.prisma.contactSetting.findUnique({ where: { id: 'singleton' } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.CONTACT_SETTING.NOT_FOUND,
        errorCode: 'CONTACT_SETTING_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.contactSettingTranslation.upsert>>;
    try {
      translation = await this.prisma.contactSettingTranslation.upsert({
        where: { settingId_lang: { settingId: 'singleton', lang: dto.lang } },
        update: { title: dto.title, description: dto.description, address: dto.address, workingHours: dto.workingHours },
        create: { settingId: 'singleton', lang: dto.lang, title: dto.title, description: dto.description, address: dto.address, workingHours: dto.workingHours },
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

    await this.invalidateContactCache();
    return translation;
  }
}
