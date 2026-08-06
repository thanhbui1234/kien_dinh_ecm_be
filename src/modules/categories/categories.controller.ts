import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpsertCategoryTranslationDto } from '../../common/dto/upsert-translation.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { CategoryResponseDto } from './dto/category-response.dto';
import { Language } from '@prisma/client';

@ApiTags('Categories')
@ApiStandardErrors()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: CategoryResponseDto, status: 201, description: 'Tạo danh mục thành công' })
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách tất cả danh mục (có lọc theo ngôn ngữ)' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ hiển thị (VI | EN)' })
  @ApiSuccessResponse({ model: CategoryResponseDto, isArray: true, description: 'Lấy danh sách thành công' })
  @Public()
  @Get()
  findAll(@Query('lang') lang?: Language) {
    return this.categoriesService.findAll(lang || Language.VI);
  }

  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  @ApiQuery({ name: 'lang', enum: Language, required: false, description: 'Ngôn ngữ hiển thị (VI | EN)' })
  @ApiSuccessResponse({ model: CategoryResponseDto, description: 'Lấy chi tiết danh mục thành công' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @Query('lang') lang?: Language) {
    return this.categoriesService.findOne(id, lang || Language.VI);
  }

  @ApiOperation({ summary: 'Thêm/Cập nhật bản dịch cho danh mục' })
  @ApiBearerAuth('JWT-auth')
  @Post(':id/translation')
  upsertTranslation(@Param('id') id: string, @Body() dto: UpsertCategoryTranslationDto) {
    return this.categoriesService.upsertTranslation(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: CategoryResponseDto, description: 'Cập nhật danh mục thành công' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: CategoryResponseDto, description: 'Xoá danh mục thành công' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
