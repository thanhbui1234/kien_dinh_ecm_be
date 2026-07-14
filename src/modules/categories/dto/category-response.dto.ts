import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ description: 'ID danh mục', example: 'uuid-string' })
  id: string;

  @ApiProperty({ description: 'Tên danh mục', example: 'Máy Phay CNC' })
  name: string;

  @ApiProperty({ description: 'Slug URL', example: 'may-phay-cnc' })
  slug: string;

  @ApiPropertyOptional({ description: 'Ảnh đại diện', example: 'https://cloudinary...' })
  imageUrl: string | null;

  @ApiProperty({ description: 'Thứ tự', example: 0 })
  orderIndex: number;

  @ApiProperty({ description: 'Trạng thái hiển thị', example: true })
  status: boolean;

  @ApiPropertyOptional({ description: 'ID Danh mục cha', example: null })
  parentId: string | null;
}
