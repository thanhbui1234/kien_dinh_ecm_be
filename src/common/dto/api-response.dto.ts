import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Trạng thái thành công', example: true })
  success: boolean;

  @ApiProperty({ description: 'HTTP Status Code', example: 200 })
  statusCode: number;

  @ApiProperty({ description: 'Dữ liệu trả về' })
  data: T;

  @ApiPropertyOptional({ description: 'Thông tin bổ sung (nếu có)' })
  meta?: any;

  @ApiProperty({ description: 'Thời gian phản hồi', example: '2026-07-12T04:00:00.000Z' })
  timestamp: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công', example: false })
  success: boolean;

  @ApiProperty({ description: 'HTTP Status Code', example: 400 })
  statusCode: number;

  @ApiProperty({ description: 'Mã lỗi hệ thống', example: 'BAD_REQUEST' })
  errorCode: string;

  @ApiProperty({
    description: 'Thông báo lỗi chi tiết',
    oneOf: [
      { type: 'string', example: 'Dữ liệu không hợp lệ.' },
      { type: 'array', items: { type: 'string' }, example: ['Trường email không được để trống.'] },
    ],
  })
  message: string | string[];

  @ApiProperty({ description: 'Đường dẫn gọi API bị lỗi', example: '/api/v1/auth/login' })
  path: string;

  @ApiProperty({ description: 'Thời gian phản hồi', example: '2026-07-12T04:00:00.000Z' })
  timestamp: string;
}
