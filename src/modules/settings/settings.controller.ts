import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, SettingResponseDto, SloganDto, SloganResponseDto, TimelineDto, TimelineResponseDto } from './dto/settings.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';

@ApiTags('Settings')
@ApiStandardErrors()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // --- SYSTEM SETTINGS ---
  @ApiOperation({ summary: 'Lấy tất cả cấu hình hệ thống' })
  @ApiSuccessResponse({ model: SettingResponseDto, isArray: true, description: 'Lấy cấu hình thành công' })
  @Public()
  @Get('system')
  getSettings() {
    return this.settingsService.getSettings();
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: SettingResponseDto, description: 'Cập nhật cấu hình thành công' })
  @Patch('system/:key')
  updateSetting(@Param('key') key: string, @Body() updateDto: UpdateSettingDto) {
    return this.settingsService.updateSetting(key, updateDto);
  }

  // --- COMPANY SLOGANS ---
  @ApiOperation({ summary: 'Lấy danh sách slogan' })
  @ApiSuccessResponse({ model: SloganResponseDto, isArray: true, description: 'Lấy danh sách slogan thành công' })
  @Public()
  @Get('slogans')
  getSlogans() {
    return this.settingsService.getSlogans();
  }

  @ApiOperation({ summary: 'Thêm slogan mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: SloganResponseDto, status: 201, description: 'Thêm slogan thành công' })
  @Post('slogans')
  createSlogan(@Body() dto: SloganDto) {
    return this.settingsService.createSlogan(dto);
  }

  @ApiOperation({ summary: 'Xóa slogan' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: SloganResponseDto, description: 'Xóa slogan thành công' })
  @Delete('slogans/:id')
  deleteSlogan(@Param('id') id: string) {
    return this.settingsService.deleteSlogan(id);
  }

  // --- COMPANY TIMELINE ---
  @ApiOperation({ summary: 'Lấy dòng thời gian lịch sử' })
  @ApiSuccessResponse({ model: TimelineResponseDto, isArray: true, description: 'Lấy danh sách timeline thành công' })
  @Public()
  @Get('timelines')
  getTimelines() {
    return this.settingsService.getTimelines();
  }

  @ApiOperation({ summary: 'Thêm mốc lịch sử mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: TimelineResponseDto, status: 201, description: 'Thêm timeline thành công' })
  @Post('timelines')
  createTimeline(@Body() dto: TimelineDto) {
    return this.settingsService.createTimeline(dto);
  }

  @ApiOperation({ summary: 'Xóa mốc lịch sử' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: TimelineResponseDto, description: 'Xóa timeline thành công' })
  @Delete('timelines/:id')
  deleteTimeline(@Param('id') id: string) {
    return this.settingsService.deleteTimeline(id);
  }
}
