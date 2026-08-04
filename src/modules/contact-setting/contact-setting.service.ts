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
          title: 'Liên hệ với chúng tôi',
          description: 'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
          hotline: '0374 864 110',
          zalo: '0374 864 110',
          email: 'info@kiendinhecm.com',
        },
        include: { translations: true },
      });
    }

    const transMap = new Map(setting.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);
    const result = {
      ...setting,
      title: trans?.title ?? setting.title,
      description: trans?.description ?? setting.description,
      address: trans?.address ?? setting.address,
      workingHours: trans?.workingHours ?? setting.workingHours,
    };

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) { }

    return result;
  }

  async updateContactSetting(dto: UpdateContactSettingDto) {
    const processedDto = { ...dto };
    if (dto.mapUrl !== undefined) {
      processedDto.mapUrl = this.extractMapUrl(dto.mapUrl);
    }

    const setting = await this.prisma.contactSetting.upsert({
      where: { id: 'singleton' },
      update: { ...processedDto },
      create: {
        id: 'singleton',
        title: processedDto.title ?? 'Liên hệ với chúng tôi',
        description: processedDto.description ?? 'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
        hotline: processedDto.hotline ?? '094320676869',
        zalo: processedDto.zalo ?? '094320676869',
        email: processedDto.email ?? 'info@kiendinhecm.com',
        address: processedDto.address,
        workingHours: processedDto.workingHours,
        mapUrl: processedDto.mapUrl,
      },
    });

    if (processedDto.title || processedDto.description) {
      await this.prisma.contactSettingTranslation.upsert({
        where: { settingId_lang: { settingId: 'singleton', lang: Language.VI } },
        update: {
          title: processedDto.title ?? setting.title,
          description: processedDto.description ?? setting.description,
          address: processedDto.address ?? setting.address,
          workingHours: processedDto.workingHours ?? setting.workingHours,
        },
        create: {
          settingId: 'singleton',
          lang: Language.VI,
          title: processedDto.title ?? setting.title,
          description: processedDto.description ?? setting.description,
          address: processedDto.address ?? setting.address,
          workingHours: processedDto.workingHours ?? setting.workingHours,
        },
      });
    }

    await this.invalidateContactCache();
    return setting;
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
