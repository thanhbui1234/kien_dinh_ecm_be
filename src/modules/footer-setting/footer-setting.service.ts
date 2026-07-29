import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { UpdateFooterSettingDto } from './dto/footer-setting.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';
import { Prisma } from '@prisma/client';

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

  /**
   * Lấy cấu hình Footer (singleton, có cache Redis 24h)
   */
  async getFooterSetting() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.FOOTER.SETTING);
      if (cached) {
        return cached;
      }
    } catch (e) {}

    let setting = await this.prisma.footerSetting.findUnique({
      where: { id: 'singleton' },
    });

    if (!setting) {
      setting = await this.prisma.footerSetting.create({
        data: {
          id: 'singleton',
          introText:
            'Công ty Cổ Phần Thanh Bằng tự hào là một trong những công ty uy tín nhất hiện nay và sẵn sàng cam kết với khách hàng về các vấn đề chất lượng, nguồn gốc xuất xứ của sản phẩm cũng như các dịch vụ đi kèm khác.',
          facebookUrl: 'https://www.facebook.com/ThanhBangNamDinh',
          youtubeUrl: 'https://www.youtube.com/@congtythanhbang1735',
          salesPhone: '0943.67.68.69',
          feedbackPhone: '0914 161 122',
          warrantyPhone: '0912 01 77 55',
          email: 'maygachbetongtb@gmail.com',
          address:
            'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
          customerSupportTitle: 'HỖ TRỢ KHÁCH HÀNG',
          customerSupportLinks: DEFAULT_CUSTOMER_SUPPORT_LINKS as unknown as Prisma.InputJsonValue,
        },
      });
    }

    try {
      await this.redis.client.set(CACHE_KEYS.FOOTER.SETTING, setting, {
        ex: CACHE_TTL.TWENTY_FOUR_HOURS,
      });
    } catch (e) {}

    return setting;
  }

  /**
   * Cập nhật cấu hình Footer (Admin)
   */
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
        introText:
          dto.introText ??
          'Công ty Cổ Phần Thanh Bằng tự hào là một trong những công ty uy tín nhất hiện nay và sẵn sàng cam kết với khách hàng về các vấn đề chất lượng, nguồn gốc xuất xứ của sản phẩm cũng như các dịch vụ đi kèm khác.',
        facebookUrl: dto.facebookUrl ?? 'https://www.facebook.com/ThanhBangNamDinh',
        youtubeUrl: dto.youtubeUrl ?? 'https://www.youtube.com/@congtythanhbang1735',
        instagramUrl: dto.instagramUrl,
        phone: dto.phone ?? '0943676869',
        email: dto.email ?? 'maygachbetongtb@gmail.com',
        address:
          dto.address ??
          'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
        salesPhone: dto.salesPhone ?? '0943.67.68.69',
        feedbackPhone: dto.feedbackPhone ?? '0914 161 122',
        warrantyPhone: dto.warrantyPhone ?? '0912 01 77 55',
        customerSupportTitle: dto.customerSupportTitle ?? 'HỖ TRỢ KHÁCH HÀNG',
        customerSupportLinks: (dto.customerSupportLinks ??
          DEFAULT_CUSTOMER_SUPPORT_LINKS) as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.FOOTER.SETTING);
    } catch (e) {}

    return setting;
  }
}
