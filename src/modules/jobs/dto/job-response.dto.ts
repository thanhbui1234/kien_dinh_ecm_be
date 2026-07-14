import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobDetailResponseDto {
  @ApiProperty({ description: 'Mảng các mục chi tiết', type: Object, isArray: true })
  sections: any;
}

export class JobResponseDto {
  @ApiProperty({ description: 'ID bài đăng' })
  id: string;

  @ApiProperty({ description: 'Tiêu đề' })
  title: string;

  @ApiProperty({ description: 'Slug định danh' })
  slug: string;

  @ApiProperty({ description: 'Mức lương' })
  salary: string;

  @ApiProperty({ description: 'Trạng thái hiển thị' })
  status: boolean;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiPropertyOptional({ type: JobDetailResponseDto, description: 'Chi tiết nội dung tuyển dụng' })
  detail?: JobDetailResponseDto;
}
