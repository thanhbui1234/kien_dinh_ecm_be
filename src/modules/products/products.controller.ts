import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  @ApiBearerAuth('JWT-auth')
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (có phân trang & lọc)' })
  @Public()
  @Get()
  findAll(@Query() filterDto: GetProductsFilterDto) {
    return this.productsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm liên quan (cùng danh mục)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng sản phẩm lấy (mặc định 5)' })
  @Public()
  @Get(':id/related')
  findRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.productsService.findRelated(id, limit || 5);
  }

  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: 'Xóa sản phẩm' })
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
