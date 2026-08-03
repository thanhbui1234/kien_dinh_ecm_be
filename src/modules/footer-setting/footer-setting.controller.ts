import { Controller, Get, Body, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FooterSettingService } from './footer-setting.service';
import {
  UpdateFooterSettingDto,
  FooterSettingResponseDto,
} from './dto/footer-setting.dto';
import { UpsertFooterSettingTranslationDto } from '../../common/dto/upsert-translation.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiStandardErrors,
} from '../../common/decorators/api-success-response.decorator';
import { Language } from '@prisma/client';

@ApiTags('Footer Setting')
@ApiStandardErrors()
@Controller('footer-setting')
export class FooterSettingController {
  constructor(private readonly footerSettingService: FooterSettingService) {}

  @ApiOperation({ summary: 'Lấy cấu hình Footer' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({ model: FooterSettingResponseDto, description: 'Lấy thành công' })
  @Public()
  @Get()
  getFooterSetting(@Query('lang') lang?: Language) {
    return this.footerSettingService.getFooterSetting(lang ?? Language.VI);
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình Footer (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: FooterSettingResponseDto, description: 'Cập nhật thành công' })
  @Patch()
  updateFooterSetting(@Body() dto: UpdateFooterSettingDto) {
    return this.footerSettingService.updateFooterSetting(dto);
  }

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch Footer (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ description: 'Lưu bản dịch thành công' })
  @Post('translation')
  upsertFooterSettingTranslation(@Body() dto: UpsertFooterSettingTranslationDto) {
    return this.footerSettingService.upsertFooterSettingTranslation(dto);
  }
}
