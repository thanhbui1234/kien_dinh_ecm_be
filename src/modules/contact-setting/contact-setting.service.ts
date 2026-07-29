import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { UpdateContactSettingDto } from './dto/contact-setting.dto';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache.constant';

@Injectable()
export class ContactSettingService {
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

  /**
   * Lấy cấu hình khối liên hệ (dạng singleton)
   */
  async getContactSetting() {
    try {
      const cached = await this.redis.client.get(CACHE_KEYS.CONTACT.SETTING);
      if (cached) {
        return cached;
      }
    } catch (e) {}

    let setting = await this.prisma.contactSetting.findUnique({
      where: { id: 'singleton' },
    });

    if (!setting) {
      setting = await this.prisma.contactSetting.create({
        data: {
          id: 'singleton',
          title: 'Liên hệ với chúng tôi',
          description:
            'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
          hotline: '0374 864 110',
          zalo: '0374 864 110',
          email: 'info@kiendinhecm.com',
        },
      });
    }

    try {
      await this.redis.client.set(CACHE_KEYS.CONTACT.SETTING, setting, {
        ex: CACHE_TTL.TWENTY_FOUR_HOURS,
      });
    } catch (e) {}

    return setting;
  }

  /**
   * Cập nhật cấu hình khối liên hệ (Admin)
   */
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
        description:
          processedDto.description ??
          'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
        hotline: processedDto.hotline ?? '0374 864 110',
        zalo: processedDto.zalo ?? '0374 864 110',
        email: processedDto.email ?? 'info@kiendinhecm.com',
        address: processedDto.address,
        workingHours: processedDto.workingHours,
        mapUrl: processedDto.mapUrl,
      },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.CONTACT.SETTING);
    } catch (e) {}

    return setting;
  }
}
