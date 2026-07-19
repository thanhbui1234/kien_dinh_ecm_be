import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class ProjectDetailResponseDto {
  @ApiProperty({ description: 'Nội dung HTML chi tiết' })
  contentDetail: string;
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'ID dự án' })
  id: string;

  @ApiProperty({ description: 'Tên dự án' })
  name: string;

  @ApiProperty({ description: 'Slug định danh' })
  slug: string;

  @ApiProperty({ description: 'Mô tả ngắn gọn' })
  description: string;

  @ApiProperty({ description: 'Ảnh bìa dự án' })
  coverImage: string;

  @ApiProperty({ description: 'Trạng thái hiển thị' })
  status: boolean;

  @ApiProperty({ description: 'Dự án nổi bật' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiPropertyOptional({ type: ProjectDetailResponseDto, description: 'Chi tiết nội dung' })
  detail?: ProjectDetailResponseDto;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách URL ảnh gallery' })
  images?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID sản phẩm (dùng cho admin)' })
  productIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID danh mục' })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [ProductResponseDto], description: 'Sản phẩm liên quan (dùng cho user FE)' })
  relatedProducts?: ProductResponseDto[];
}
