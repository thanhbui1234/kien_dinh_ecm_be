import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class LeadResponseDto {
  @ApiProperty({ description: 'ID Lead' })
  id: string;

  @ApiProperty({ description: 'Họ và tên' })
  fullName: string;

  @ApiProperty({ description: 'Số điện thoại' })
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Email' })
  email?: string | null;

  @ApiProperty({ description: 'Nội dung' })
  message: string;

  @ApiProperty({ description: 'Trạng thái xử lý' })
  status: string;

  @ApiPropertyOptional({ description: 'Ghi chú nội bộ' })
  adminNote?: string | null;

  @ApiPropertyOptional({ description: 'ID Sản phẩm quan tâm' })
  targetProductId?: string | null;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiPropertyOptional({ type: ProductResponseDto, description: 'Thông tin sản phẩm' })
  product?: any;
}
