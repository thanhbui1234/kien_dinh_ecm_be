import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { CategoryResponseDto } from './dto/category-response.dto';

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

  @ApiOperation({ summary: 'Lấy danh sách tất cả danh mục' })
  @ApiSuccessResponse({ model: CategoryResponseDto, isArray: true, description: 'Lấy danh sách thành công' })
  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  @ApiSuccessResponse({ model: CategoryResponseDto, description: 'Lấy chi tiết danh mục thành công' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
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
