import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AboutService } from './about.service';
import {
  UpdateCompanyProfileDto,
  CompanyProfileResponseDto,
  CreateCompanyInfoDto,
  UpdateCompanyInfoDto,
  CompanyInfoResponseDto,
  CreateFacilityDto,
  UpdateFacilityDto,
  FacilityResponseDto,
  CreateCompanyHistoryEventDto,
  UpdateCompanyHistoryEventDto,
  CompanyHistoryEventResponseDto,
  UpdateHistoryEventOrdersDto,
} from './dto/about.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiStandardErrors,
} from '../../common/decorators/api-success-response.decorator';

@ApiTags('About')
@ApiStandardErrors()
@Controller('about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  // ─── Company Profile ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lấy thông tin profile trang About' })
  @ApiSuccessResponse({ model: CompanyProfileResponseDto, description: 'Lấy thành công' })
  @Public()
  @Get('profile')
  getCompanyProfile() {
    return this.aboutService.getCompanyProfile();
  }

  @ApiOperation({ summary: 'Cập nhật profile trang About (introHtml, thumbnailUrl)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: CompanyProfileResponseDto, description: 'Cập nhật thành công' })
  @Patch('profile')
  updateCompanyProfile(@Body() dto: UpdateCompanyProfileDto) {
    return this.aboutService.updateCompanyProfile(dto);
  }

  // ─── Company Info ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lấy danh sách thông tin giới thiệu công ty' })
  @ApiSuccessResponse({
    model: CompanyInfoResponseDto,
    isArray: true,
    description: 'Lấy thành công',
  })
  @Public()
  @Get('company-info')
  getCompanyInfo() {
    return this.aboutService.getCompanyInfo();
  }

  @ApiOperation({ summary: 'Thêm thông tin giới thiệu công ty' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyInfoResponseDto,
    status: 201,
    description: 'Thêm thành công',
  })
  @Post('company-info')
  createCompanyInfo(@Body() dto: CreateCompanyInfoDto) {
    return this.aboutService.createCompanyInfo(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin giới thiệu công ty' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyInfoResponseDto,
    description: 'Cập nhật thành công',
  })
  @Patch('company-info/:id')
  updateCompanyInfo(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyInfoDto,
  ) {
    return this.aboutService.updateCompanyInfo(id, dto);
  }

  @ApiOperation({ summary: 'Xóa thông tin giới thiệu công ty' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyInfoResponseDto,
    description: 'Xóa thành công',
  })
  @Delete('company-info/:id')
  deleteCompanyInfo(@Param('id') id: string) {
    return this.aboutService.deleteCompanyInfo(id);
  }

  // ─── Facilities ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lấy danh sách cơ sở sản xuất' })
  @ApiSuccessResponse({
    model: FacilityResponseDto,
    isArray: true,
    description: 'Lấy thành công',
  })
  @Public()
  @Get('facilities')
  getFacilities() {
    return this.aboutService.getFacilities();
  }

  @ApiOperation({ summary: 'Thêm cơ sở sản xuất mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: FacilityResponseDto,
    status: 201,
    description: 'Thêm thành công',
  })
  @Post('facilities')
  createFacility(@Body() dto: CreateFacilityDto) {
    return this.aboutService.createFacility(dto);
  }

  @ApiOperation({ summary: 'Cập nhật cơ sở sản xuất' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: FacilityResponseDto,
    description: 'Cập nhật thành công',
  })
  @Patch('facilities/:id')
  updateFacility(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.aboutService.updateFacility(id, dto);
  }

  @ApiOperation({ summary: 'Xóa cơ sở sản xuất' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: FacilityResponseDto,
    description: 'Xóa thành công',
  })
  @Delete('facilities/:id')
  deleteFacility(@Param('id') id: string) {
    return this.aboutService.deleteFacility(id);
  }

  // ─── Company History Events ──────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lấy danh sách sự kiện lịch sử công ty' })
  @ApiSuccessResponse({
    model: CompanyHistoryEventResponseDto,
    isArray: true,
    description: 'Lấy thành công',
  })
  @Public()
  @Get('history-events')
  getHistoryEvents() {
    return this.aboutService.getHistoryEvents();
  }

  @ApiOperation({ summary: 'Thêm sự kiện lịch sử' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyHistoryEventResponseDto,
    status: 201,
    description: 'Thêm thành công',
  })
  @Post('history-events')
  createHistoryEvent(@Body() dto: CreateCompanyHistoryEventDto) {
    return this.aboutService.createHistoryEvent(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thứ tự sự kiện lịch sử hàng loạt' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyHistoryEventResponseDto,
    isArray: true,
    description: 'Cập nhật thứ tự thành công',
  })
  @Patch('history-events/order')
  updateHistoryEventOrders(@Body() dto: UpdateHistoryEventOrdersDto) {
    return this.aboutService.updateHistoryEventOrders(dto);
  }

  @ApiOperation({ summary: 'Cập nhật sự kiện lịch sử' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyHistoryEventResponseDto,
    description: 'Cập nhật thành công',
  })
  @Patch('history-events/:id')
  updateHistoryEvent(@Param('id') id: string, @Body() dto: UpdateCompanyHistoryEventDto) {
    return this.aboutService.updateHistoryEvent(id, dto);
  }

  @ApiOperation({ summary: 'Xóa sự kiện lịch sử' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyHistoryEventResponseDto,
    description: 'Xóa thành công',
  })
  @Delete('history-events/:id')
  deleteHistoryEvent(@Param('id') id: string) {
    return this.aboutService.deleteHistoryEvent(id);
  }
}
