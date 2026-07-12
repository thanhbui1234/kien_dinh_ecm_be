import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductImageDto {
  @ApiProperty({ description: 'URL hình ảnh' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Có phải ảnh chính không', default: false })
  @IsBoolean()
  @IsOptional()
  isMain?: boolean;

  @ApiPropertyOptional({ description: 'Thứ tự ảnh', default: 0 })
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Slug định danh' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ description: 'Giá sản phẩm' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Ảnh thu nhỏ (Thumbnail)' })
  @IsString()
  @IsNotEmpty()
  thumbnailUrl: string;

  @ApiPropertyOptional({ description: 'Là sản phẩm nổi bật?', default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Trạng thái hiển thị', default: true })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiProperty({ description: 'ID Danh mục' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ description: 'ID Sản phẩm cha (nếu là sản phẩm thuộc máy chính)' })
  @IsString()
  @IsOptional()
  parentId?: string;

  // --- Chi tiết sản phẩm ---
  @ApiPropertyOptional({ description: 'Nội dung chi tiết (HTML)' })
  @IsString()
  @IsOptional()
  contentDetail?: string;

  @ApiPropertyOptional({ description: 'Thông số kỹ thuật dạng JSON' })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, any>;

  // --- Hình ảnh ---
  @ApiPropertyOptional({ type: [CreateProductImageDto], description: 'Danh sách ảnh' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  @IsOptional()
  images?: CreateProductImageDto[];
}
