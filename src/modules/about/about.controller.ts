import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  CreateCompanyLocationDto,
  UpdateCompanyLocationDto,
  CompanyLocationResponseDto,
  UpdateCompanyLocationOrdersDto,
} from './dto/about.dto';
import {
  UpsertCompanyProfileTranslationDto,
  UpsertCompanyInfoTranslationDto,
  UpsertFacilityTranslationDto,
  UpsertHistoryEventTranslationDto,
  UpsertCompanyLocationTranslationDto,
} from '../../common/dto/upsert-translation.dto';
import { Language } from '@prisma/client';
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
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({ model: CompanyProfileResponseDto, description: 'Lấy thành công' })
  @Public()
  @Get('profile')
  getCompanyProfile(@Query('lang') lang?: Language) {
    return this.aboutService.getCompanyProfile(lang ?? Language.VI);
  }

  @ApiOperation({ summary: 'Cập nhật profile trang About (introHtml, thumbnailUrl)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: CompanyProfileResponseDto, description: 'Cập nhật thành công' })
  @Patch('profile')
  updateCompanyProfile(@Body() dto: UpdateCompanyProfileDto) {
    return this.aboutService.updateCompanyProfile(dto);
  }

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch profile (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @Post('profile/translation')
  upsertCompanyProfileTranslation(@Body() dto: UpsertCompanyProfileTranslationDto) {
    return this.aboutService.upsertCompanyProfileTranslation(dto);
  }

  // ─── Company Info ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lấy danh sách thông tin giới thiệu công ty' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({
    model: CompanyInfoResponseDto,
    isArray: true,
    description: 'Lấy thành công',
  })
  @Public()
  @Get('company-info')
  getCompanyInfo(@Query('lang') lang?: Language) {
    return this.aboutService.getCompanyInfo(lang ?? Language.VI);
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
  updateCompanyInfo(@Param('id') id: string, @Body() dto: UpdateCompanyInfoDto) {
    return this.aboutService.updateCompanyInfo(id, dto);
  }

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch thông tin công ty (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ description: 'Lưu bản dịch thành công' })
  @Post('company-info/:id/translation')
  upsertCompanyInfoTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertCompanyInfoTranslationDto,
  ) {
    return this.aboutService.upsertCompanyInfoTranslation(id, dto);
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
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({
    model: FacilityResponseDto,
    isArray: true,
    description: 'Lấy thành công',
  })
  @Public()
  @Get('facilities')
  getFacilities(@Query('lang') lang?: Language) {
    return this.aboutService.getFacilities(lang ?? Language.VI);
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

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch cơ sở sản xuất (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ description: 'Lưu bản dịch thành công' })
  @Post('facilities/:id/translation')
  upsertFacilityTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertFacilityTranslationDto,
  ) {
    return this.aboutService.upsertFacilityTranslation(id, dto);
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
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({
    model: CompanyHistoryEventResponseDto,
    isArray: true,
    description: 'Lấy thành công',
  })
  @Public()
  @Get('history-events')
  getHistoryEvents(@Query('lang') lang?: Language) {
    return this.aboutService.getHistoryEvents(lang ?? Language.VI);
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

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch sự kiện lịch sử (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ description: 'Lưu bản dịch thành công' })
  @Post('history-events/:id/translation')
  upsertHistoryEventTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertHistoryEventTranslationDto,
  ) {
    return this.aboutService.upsertHistoryEventTranslation(id, dto);
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

  // ─── Company Locations ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lấy danh sách vị trí công ty / nhà máy' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ (VI | EN)' })
  @ApiSuccessResponse({
    model: CompanyLocationResponseDto,
    isArray: true,
    description: 'Lấy danh sách thành công',
  })
  @Public()
  @Get('locations')
  getCompanyLocations(@Query('lang') lang?: Language) {
    return this.aboutService.getCompanyLocations(lang ?? Language.VI);
  }

  @ApiOperation({ summary: 'Thêm vị trí công ty / nhà máy mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyLocationResponseDto,
    status: 201,
    description: 'Thêm thành công',
  })
  @Post('locations')
  createCompanyLocation(@Body() dto: CreateCompanyLocationDto) {
    return this.aboutService.createCompanyLocation(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thứ tự vị trí công ty hàng loạt' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyLocationResponseDto,
    isArray: true,
    description: 'Cập nhật thứ tự thành công',
  })
  @Patch('locations/order')
  updateCompanyLocationOrders(@Body() dto: UpdateCompanyLocationOrdersDto) {
    return this.aboutService.updateCompanyLocationOrders(dto);
  }

  @ApiOperation({ summary: 'Cập nhật vị trí công ty / nhà máy' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyLocationResponseDto,
    description: 'Cập nhật thành công',
  })
  @Patch('locations/:id')
  updateCompanyLocation(@Param('id') id: string, @Body() dto: UpdateCompanyLocationDto) {
    return this.aboutService.updateCompanyLocation(id, dto);
  }

  @ApiOperation({ summary: 'Thêm/cập nhật bản dịch vị trí công ty (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ description: 'Lưu bản dịch thành công' })
  @Post('locations/:id/translation')
  upsertCompanyLocationTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertCompanyLocationTranslationDto,
  ) {
    return this.aboutService.upsertCompanyLocationTranslation(id, dto);
  }

  @ApiOperation({ summary: 'Xóa vị trí công ty / nhà máy' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({
    model: CompanyLocationResponseDto,
    description: 'Xóa thành công',
  })
  @Delete('locations/:id')
  deleteCompanyLocation(@Param('id') id: string) {
    return this.aboutService.deleteCompanyLocation(id);
  }
}
