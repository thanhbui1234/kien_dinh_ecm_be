import { Module } from '@nestjs/common';
import { ContactSettingService } from './contact-setting.service';
import { ContactSettingController } from './contact-setting.controller';

@Module({
  controllers: [ContactSettingController],
  providers: [ContactSettingService],
  exports: [ContactSettingService],
})
export class ContactSettingModule {}
