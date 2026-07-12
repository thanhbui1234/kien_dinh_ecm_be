import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ApiBearerAuth('JWT-auth')
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách tất cả danh mục' })
  @ApiQuery({ name: 'format', required: false, enum: ['tree', 'flat'], description: 'Format trả về. tree = lồng nhau, flat = danh sách phẳng. Mặc định là flat.' })
  @Public()
  @Get()
  findAll(@Query('format') format?: 'tree' | 'flat') {
    if (format === 'tree') {
      return this.categoriesService.findAllTree();
    }
    return this.categoriesService.findAllFlat();
  }

  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
