import { Module } from '@nestjs/common';
import { FooterSettingService } from './footer-setting.service';
import { FooterSettingController } from './footer-setting.controller';

@Module({
  controllers: [FooterSettingController],
  providers: [FooterSettingService],
  exports: [FooterSettingService],
})
export class FooterSettingModule {}
