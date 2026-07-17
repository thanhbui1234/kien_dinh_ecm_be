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
  CreateCompanyInfoDto,
  UpdateCompanyInfoDto,
  CompanyInfoResponseDto,
  CreateFacilityDto,
  UpdateFacilityDto,
  FacilityResponseDto,
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
}
