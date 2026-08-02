import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { GetJobsFilterDto } from './dto/get-jobs-filter.dto';
import { UpsertJobPostTranslationDto } from '../../common/dto/upsert-translation.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { JobResponseDto } from './dto/job-response.dto';
import { Language } from '@prisma/client';

@ApiTags('Jobs')
@ApiStandardErrors()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: 'Tạo bài đăng tuyển dụng' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: JobResponseDto, status: 201, description: 'Tạo bài đăng thành công' })
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách bài đăng tuyển dụng (có lọc ngôn ngữ)' })
  @ApiSuccessResponse({ model: JobResponseDto, isPaginated: true, description: 'Lấy danh sách thành công' })
  @Public()
  @Get()
  findAll(@Query() filterDto: GetJobsFilterDto) {
    return this.jobsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Lấy chi tiết bài đăng theo ID hoặc slug (có hỗ trợ i18n)' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ hiển thị (VI | EN)' })
  @ApiSuccessResponse({ model: JobResponseDto, description: 'Lấy chi tiết thành công' })
  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string, @Query('lang') lang?: Language) {
    return this.jobsService.findOne(idOrSlug, lang || Language.VI);
  }

  @ApiOperation({ summary: 'Thêm/Cập nhật bản dịch cho bài tuyển dụng' })
  @ApiBearerAuth('JWT-auth')
  @Post(':id/translation')
  upsertTranslation(@Param('id') id: string, @Body() dto: UpsertJobPostTranslationDto) {
    return this.jobsService.upsertTranslation(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật bài đăng' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: JobResponseDto, description: 'Cập nhật thành công' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.update(id, updateJobDto);
  }

  @ApiOperation({ summary: 'Xóa bài đăng' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: JobResponseDto, description: 'Xóa bài đăng thành công' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }
}
