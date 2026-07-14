import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty({ description: 'ID ảnh' })
  id: string;

  @ApiProperty({ description: 'Đường dẫn ảnh' })
  imageUrl: string;

  @ApiProperty({ description: 'Là ảnh chính' })
  isMain: boolean;

  @ApiProperty({ description: 'Thứ tự hiển thị' })
  orderIndex: number;
}

export class ProductDetailResponseDto {
  @ApiProperty({ description: 'Nội dung mô tả HTML' })
  contentDetail: string;

  @ApiProperty({ description: 'Thông số kỹ thuật JSON', type: Object })
  specifications: any;

  @ApiPropertyOptional({ description: 'Cấu hình SEO', type: Object })
  seoMeta: any;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  id: string;

  @ApiProperty({ description: 'Tên sản phẩm' })
  name: string;

  @ApiProperty({ description: 'Slug định danh' })
  slug: string;

  @ApiPropertyOptional({ description: 'Giá bán (nếu có)' })
  price: number | null;

  @ApiProperty({ description: 'URL ảnh thu nhỏ' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Sản phẩm nổi bật?' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Trạng thái hiển thị' })
  status: boolean;

  @ApiProperty({ description: 'ID danh mục' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'ID máy chính (nếu là biến thể)' })
  parentId: string | null;

  @ApiProperty({ description: 'Lượt xem' })
  viewCount: number;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiPropertyOptional({ type: ProductDetailResponseDto, description: 'Chi tiết bài viết (nếu gọi findOne)' })
  detail?: ProductDetailResponseDto;

  @ApiPropertyOptional({ type: [ProductImageResponseDto], description: 'Danh sách ảnh phụ' })
  images?: ProductImageResponseDto[];
}
