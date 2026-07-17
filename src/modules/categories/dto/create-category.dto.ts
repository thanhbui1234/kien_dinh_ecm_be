import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug định danh trên URL. Nếu để trống, BE sẽ tự tạo từ tên' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh đại diện của danh mục' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', default: 0 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hiển thị', default: true })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiPropertyOptional({ description: 'ID của danh mục cha (nếu là danh mục con)' })
  @IsString()
  @IsOptional()
  parentId?: string;
}
