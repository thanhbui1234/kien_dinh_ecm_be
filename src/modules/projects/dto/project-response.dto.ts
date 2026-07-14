import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiPropertyOptional({ type: ProjectDetailResponseDto, description: 'Chi tiết bài viết' })
  detail?: ProjectDetailResponseDto;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID sản phẩm' })
  productIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ID danh mục' })
  categoryIds?: string[];
}
