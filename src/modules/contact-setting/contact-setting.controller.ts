import { Controller, Get, Body, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactSettingService } from './contact-setting.service';
import {
  UpdateContactSettingDto,
  ContactSettingResponseDto,
} from './dto/contact-setting.dto';
import { UpsertContactSettingTranslationDto } from '../../common/dto/upsert-translation.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiStandardErrors,
} from '../../common/decorators/api-success-response.decorator';
import { Language } from '@prisma/client';

@ApiTags('Contact Setting')
@ApiStandardErrors()
@Controller('contact-setting')
export class ContactSettingController {
  constructor(private readonly contactSettingService: ContactSettingService) {}

  @ApiOperation({ summary: 'Lấy cấu hình khối liên hệ' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({ model: ContactSettingResponseDto, description: 'Lấy thành công' })
  @Public()
  @Get()
  getContactSetting(@Query('lang') lang?: Language) {
    return this.contactSettingService.getContactSetting(lang ?? Language.VI);
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình khối liên hệ (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ContactSettingResponseDto, description: 'Cập nhật thành công' })
  @Patch()
  updateContactSetting(@Body() dto: UpdateContactSettingDto) {
    return this.contactSettingService.updateContactSetting(dto);
  }

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch cấu hình liên hệ (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ description: 'Lưu bản dịch thành công' })
  @Post('translation')
  upsertContactSettingTranslation(@Body() dto: UpsertContactSettingTranslationDto) {
    return this.contactSettingService.upsertContactSettingTranslation(dto);
  }
}
