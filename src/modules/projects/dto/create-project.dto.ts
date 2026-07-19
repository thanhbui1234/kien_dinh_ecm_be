import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Tên dự án' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug định danh (để trống sẽ tự tạo từ tên dự án)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'Mô tả ngắn gọn' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Ảnh bìa dự án' })
  @IsString()
  @IsNotEmpty()
  coverImage: string;

  @ApiPropertyOptional({ description: 'Trạng thái hiển thị', default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ description: 'Dự án nổi bật', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Nội dung chi tiết (HTML)' })
  @IsOptional()
  @IsString()
  contentDetail?: string;

  @ApiPropertyOptional({ description: 'Danh sách ID sản phẩm liên quan', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Danh sách ID danh mục liên quan', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Danh sách URL ảnh gallery dự án', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
