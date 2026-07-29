import { Controller, Get, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FooterSettingService } from './footer-setting.service';
import {
  UpdateFooterSettingDto,
  FooterSettingResponseDto,
} from './dto/footer-setting.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiStandardErrors,
} from '../../common/decorators/api-success-response.decorator';

@ApiTags('Footer Setting')
@ApiStandardErrors()
@Controller('footer-setting')
export class FooterSettingController {
  constructor(
    private readonly footerSettingService: FooterSettingService,
  ) {}

  @ApiOperation({
    summary:
      'Lấy thông tin cấu hình Footer (mạng xã hội, hotline tư vấn, liên kết hỗ trợ...)',
  })
  @ApiSuccessResponse({
    model: FooterSettingResponseDto,
    description: 'Lấy thông tin Footer thành công',
  })
  @Public()
  @Get()
  getFooterSetting() {
    return this.footerSettingService.getFooterSetting();
  }

  @ApiOperation({ summary: 'Cập nhật thông tin cấu hình Footer (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: FooterSettingResponseDto,
    description: 'Cập nhật thành công',
  })
  @Patch()
  updateFooterSetting(@Body() dto: UpdateFooterSettingDto) {
    return this.footerSettingService.updateFooterSetting(dto);
  }
}
