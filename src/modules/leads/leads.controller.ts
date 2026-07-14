import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { GetLeadsFilterDto } from './dto/get-leads-filter.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { LeadResponseDto } from './dto/lead-response.dto';

@ApiTags('Leads')
@ApiStandardErrors()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @ApiOperation({ summary: 'Gửi yêu cầu liên hệ / báo giá' })
  @ApiSuccessResponse({ model: LeadResponseDto, status: 201, description: 'Gửi yêu cầu thành công' })
  @Public()
  @Post()
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách yêu cầu liên hệ (Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: LeadResponseDto, isPaginated: true, description: 'Lấy danh sách thành công' })
  @Get()
  findAll(@Query() filterDto: GetLeadsFilterDto) {
    return this.leadsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Cập nhật trạng thái xử lý yêu cầu' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: LeadResponseDto, description: 'Cập nhật thành công' })
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() updateDto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, updateDto);
  }
}
