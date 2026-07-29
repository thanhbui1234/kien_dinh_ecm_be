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
    const setting = await this.prisma.contactSetting.upsert({
      where: { id: 'singleton' },
      update: { ...dto },
      create: {
        id: 'singleton',
        title: dto.title ?? 'Liên hệ với chúng tôi',
        description:
          dto.description ??
          'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
        hotline: dto.hotline ?? '0374 864 110',
        zalo: dto.zalo ?? '0374 864 110',
        email: dto.email ?? 'info@kiendinhecm.com',
        address: dto.address,
        workingHours: dto.workingHours,
      },
    });

    try {
      await this.redis.client.del(CACHE_KEYS.CONTACT.SETTING);
    } catch (e) {}

    return setting;
  }
}
