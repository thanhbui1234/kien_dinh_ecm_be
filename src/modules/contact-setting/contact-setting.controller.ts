import { Controller, Get, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactSettingService } from './contact-setting.service';
import {
  UpdateContactSettingDto,
  ContactSettingResponseDto,
} from './dto/contact-setting.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiStandardErrors,
} from '../../common/decorators/api-success-response.decorator';

@ApiTags('Contact Setting')
@ApiStandardErrors()
@Controller('contact-setting')
export class ContactSettingController {
  constructor(
    private readonly contactSettingService: ContactSettingService,
  ) {}

  @ApiOperation({
    summary:
      'Lấy thông tin cấu hình khối liên hệ (tiêu đề, hotline, zalo, email...)',
  })
  @ApiSuccessResponse({
    model: ContactSettingResponseDto,
    description: 'Lấy thông tin thành công',
  })
  @Public()
  @Get()
  getContactSetting() {
    return this.contactSettingService.getContactSetting();
  }

  @ApiOperation({ summary: 'Cập nhật thông tin khối liên hệ (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: ContactSettingResponseDto,
    description: 'Cập nhật thành công',
  })
  @Patch()
  updateContactSetting(@Body() dto: UpdateContactSettingDto) {
    return this.contactSettingService.updateContactSetting(dto);
  }
}
