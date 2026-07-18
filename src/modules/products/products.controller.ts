import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Ip } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { ProductResponseDto } from './dto/product-response.dto';

@ApiTags('Products')
@ApiStandardErrors()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProductResponseDto, status: 201, description: 'Tạo sản phẩm thành công' })
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @ApiOperation({ summary: 'Nhân bản sản phẩm' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProductResponseDto, status: 201, description: 'Nhân bản sản phẩm thành công' })
  @Post(':id/copy')
  copy(@Param('id') id: string) {
    return this.productsService.copy(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (có phân trang & lọc)' })
  @ApiSuccessResponse({ model: ProductResponseDto, isPaginated: true, description: 'Lấy danh sách sản phẩm thành công' })
  @Public()
  @Get()
  findAll(@Query() filterDto: GetProductsFilterDto) {
    return this.productsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm' })
  @ApiSuccessResponse({ model: ProductResponseDto, description: 'Lấy chi tiết sản phẩm thành công' })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm liên quan (cùng danh mục)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng sản phẩm lấy (mặc định 5)' })
  @ApiSuccessResponse({ model: ProductResponseDto, isArray: true, description: 'Lấy danh sách sản phẩm liên quan thành công' })
  @Public()
  @Get(':id/related')
  findRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.productsService.findRelated(id, limit || 5);
  }

  @ApiOperation({ summary: 'Tăng lượt xem sản phẩm' })
  @ApiSuccessResponse({ model: ProductResponseDto, description: 'Tăng lượt xem thành công' })
  @Public()
  @Patch(':id/view')
  incrementViewCount(@Param('id') id: string, @Ip() ip: string) {
    return this.productsService.incrementViewCount(id, ip);
  }

  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProductResponseDto, description: 'Cập nhật sản phẩm thành công' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: 'Xóa sản phẩm' })
  @ApiBearerAuth('JWT-auth')
  @ApiSuccessResponse({ model: ProductResponseDto, description: 'Xóa sản phẩm thành công' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
