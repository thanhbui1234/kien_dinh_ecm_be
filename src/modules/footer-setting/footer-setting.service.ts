import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { UpdateFooterSettingDto } from './dto/footer-setting.dto';
import { UpsertFooterSettingTranslationDto } from '../../common/dto/upsert-translation.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { Prisma, Language } from '@prisma/client';

const DEFAULT_CUSTOMER_SUPPORT_LINKS = [
  { label: 'Tư vấn ngay', href: '/contact' },
  { label: 'Chính sách bảo hành', href: '/warranty-policy' },
  { label: 'Hướng dẫn mua hàng', href: '/shopping-guide' },
  { label: 'Hướng dẫn thanh toán', href: '/payment-guide' },
  { label: 'Đối tác và khách hàng', href: '/partners' },
  { label: 'Về chúng tôi', href: '/about-us' },
];

@Injectable()
export class FooterSettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async invalidateFooterCache() {
    try {
      const keys = await this.redis.client.keys(CACHE_KEYS.FOOTER.PREFIX);
      if (keys.length > 0) await this.redis.client.del(...keys);
    } catch (e) {}
  }

  async getFooterSetting(lang: Language = Language.VI) {
    const cacheKey = CACHE_KEYS.FOOTER.SETTING(lang);
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    let setting = await this.prisma.footerSetting.findUnique({
      where: { id: 'singleton' },
      include: { translations: true },
    });

    if (!setting) {
      setting = await this.prisma.footerSetting.create({
        data: {
          id: 'singleton',
          introText: 'Công ty Cổ Phần Thanh Bằng tự hào là một trong những công ty uy tín nhất hiện nay và sẵn sàng cam kết với khách hàng về các vấn đề chất lượng, nguồn gốc xuất xứ của sản phẩm cũng như các dịch vụ đi kèm khác.',
          facebookUrl: 'https://www.facebook.com/ThanhBangNamDinh',
          youtubeUrl: 'https://www.youtube.com/@congtythanhbang1735',
          salesPhone: '0943.67.68.69',
          feedbackPhone: '0914 161 122',
          warrantyPhone: '0912 01 77 55',
          email: 'maygachbetongtb@gmail.com',
          address: 'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
          customerSupportTitle: 'HỖ TRỢ KHÁCH HÀNG',
          customerSupportLinks: DEFAULT_CUSTOMER_SUPPORT_LINKS as unknown as Prisma.InputJsonValue,
        },
        include: { translations: true },
      });
    }

    const transMap = new Map(setting.translations.map((t) => [t.lang, t]));
    const trans = transMap.get(lang) ?? transMap.get(Language.VI);
    const result = {
      ...setting,
      introText: trans?.introText ?? setting.introText,
      address: trans?.address ?? setting.address,
      customerSupportTitle: trans?.customerSupportTitle ?? setting.customerSupportTitle,
      customerSupportLinks: trans?.customerSupportLinks ?? setting.customerSupportLinks,
    };

    try {
      await this.redis.client.set(cacheKey, result, { ex: CACHE_TTL.TWENTY_FOUR_HOURS });
    } catch (e) {}

    return result;
  }

  async updateFooterSetting(dto: UpdateFooterSettingDto) {
    const updateData: any = { ...dto };
    if (dto.customerSupportLinks !== undefined) {
      updateData.customerSupportLinks = dto.customerSupportLinks as unknown as Prisma.InputJsonValue;
    }

    const setting = await this.prisma.footerSetting.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        introText: dto.introText ?? 'Công ty Cổ Phần Thanh Bằng tự hào là một trong những công ty uy tín nhất hiện nay và sẵn sàng cam kết với khách hàng về các vấn đề chất lượng, nguồn gốc xuất xứ của sản phẩm cũng như các dịch vụ đi kèm khác.',
        facebookUrl: dto.facebookUrl ?? 'https://www.facebook.com/ThanhBangNamDinh',
        youtubeUrl: dto.youtubeUrl ?? 'https://www.youtube.com/@congtythanhbang1735',
        instagramUrl: dto.instagramUrl,
        phone: dto.phone ?? '0943676869',
        email: dto.email ?? 'maygachbetongtb@gmail.com',
        address: dto.address ?? 'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
        salesPhone: dto.salesPhone ?? '0943.67.68.69',
        feedbackPhone: dto.feedbackPhone ?? '0914 161 122',
        warrantyPhone: dto.warrantyPhone ?? '0912 01 77 55',
        customerSupportTitle: dto.customerSupportTitle ?? 'HỖ TRỢ KHÁCH HÀNG',
        customerSupportLinks: (dto.customerSupportLinks ?? DEFAULT_CUSTOMER_SUPPORT_LINKS) as unknown as Prisma.InputJsonValue,
      },
    });

    if (dto.introText) {
      await this.prisma.footerSettingTranslation.upsert({
        where: { settingId_lang: { settingId: 'singleton', lang: Language.VI } },
        update: {
          introText: dto.introText ?? setting.introText,
          address: dto.address ?? setting.address,
          customerSupportTitle: dto.customerSupportTitle ?? setting.customerSupportTitle,
          customerSupportLinks: (dto.customerSupportLinks ?? setting.customerSupportLinks) as Prisma.InputJsonValue,
        },
        create: {
          settingId: 'singleton',
          lang: Language.VI,
          introText: dto.introText ?? setting.introText,
          address: dto.address ?? setting.address,
          customerSupportTitle: dto.customerSupportTitle ?? setting.customerSupportTitle,
          customerSupportLinks: (dto.customerSupportLinks ?? setting.customerSupportLinks) as Prisma.InputJsonValue,
        },
      });
    }

    await this.invalidateFooterCache();
    return setting;
  }

  async upsertFooterSettingTranslation(dto: UpsertFooterSettingTranslationDto) {
    const existing = await this.prisma.footerSetting.findUnique({ where: { id: 'singleton' } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.FOOTER_SETTING.NOT_FOUND,
        errorCode: 'FOOTER_SETTING_NOT_FOUND',
      });
    }

    let translation: Awaited<ReturnType<typeof this.prisma.footerSettingTranslation.upsert>>;
    try {
      translation = await this.prisma.footerSettingTranslation.upsert({
        where: { settingId_lang: { settingId: 'singleton', lang: dto.lang } },
        update: {
          introText: dto.introText,
          address: dto.address,
          customerSupportTitle: dto.customerSupportTitle,
          customerSupportLinks: dto.customerSupportLinks as Prisma.InputJsonValue | undefined,
        },
        create: {
          settingId: 'singleton',
          lang: dto.lang,
          introText: dto.introText,
          address: dto.address,
          customerSupportTitle: dto.customerSupportTitle,
          customerSupportLinks: dto.customerSupportLinks as Prisma.InputJsonValue | undefined,
        },
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

    await this.invalidateFooterCache();
    return translation;
  }
}
