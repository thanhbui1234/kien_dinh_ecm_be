import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { UpsertProjectTranslationDto } from '../../common/dto/upsert-translation.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { ProjectResponseDto } from './dto/project-response.dto';
import { Language } from '@prisma/client';

@ApiTags('Projects')
@ApiStandardErrors()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({ summary: 'Tạo dự án mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProjectResponseDto, status: 201, description: 'Tạo dự án thành công' })
  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách dự án (có lọc ngôn ngữ)' })
  @ApiSuccessResponse({ model: ProjectResponseDto, isPaginated: true, description: 'Lấy danh sách dự án thành công' })
  @Public()
  @Get()
  findAll(@Query() filterDto: GetProjectsFilterDto) {
    return this.projectsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Lấy chi tiết dự án theo ID hoặc slug (có hỗ trợ i18n)' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ hiển thị (VI | EN)' })
  @ApiSuccessResponse({ model: ProjectResponseDto, description: 'Lấy chi tiết dự án thành công' })
  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string, @Query('lang') lang?: Language) {
    return this.projectsService.findOne(idOrSlug, lang || Language.VI);
  }

  @ApiOperation({ summary: 'Thêm/Cập nhật bản dịch dự án' })
  @ApiBearerAuth('JWT-auth')
  @Post(':id/translation')
  upsertTranslation(@Param('id') id: string, @Body() dto: UpsertProjectTranslationDto) {
    return this.projectsService.upsertTranslation(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật dự án' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProjectResponseDto, description: 'Cập nhật dự án thành công' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @ApiOperation({ summary: 'Xóa dự án' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProjectResponseDto, description: 'Xóa dự án thành công' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
