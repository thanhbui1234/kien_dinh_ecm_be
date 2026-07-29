import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateContactSettingDto {
  @ApiProperty({
    description: 'Tiêu đề khối liên hệ',
    example: 'Liên hệ với chúng tôi',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Mô tả ngắn khối liên hệ',
    example:
      'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Số hotline tư vấn',
    example: '0374 864 110',
    required: false,
  })
  @IsOptional()
  @IsString()
  hotline?: string;

  @ApiProperty({
    description: 'Số hoặc liên kết Zalo',
    example: '0374 864 110',
    required: false,
  })
  @IsOptional()
  @IsString()
  zalo?: string;

  @ApiProperty({
    description: 'Địa chỉ Email liên hệ',
    example: 'info@kiendinhecm.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Địa chỉ công ty/văn phòng',
    example: 'Hà Nội, Việt Nam',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Thời gian làm việc',
    example: '8:00 - 17:30 (Thứ 2 - Thứ 6)',
    required: false,
  })
  @IsOptional()
  @IsString()
  workingHours?: string;
}

export class ContactSettingResponseDto {
  @ApiProperty({ description: 'ID singleton', example: 'singleton' })
  id: string;

  @ApiProperty({
    description: 'Tiêu đề khối liên hệ',
    example: 'Liên hệ với chúng tôi',
  })
  title: string;

  @ApiProperty({
    description: 'Mô tả ngắn khối liên hệ',
  })
  description: string;

  @ApiProperty({
    description: 'Hotline tư vấn',
    example: '0374 864 110',
  })
  hotline: string;

  @ApiProperty({
    description: 'Chat Zalo',
    example: '0374 864 110',
  })
  zalo: string;

  @ApiProperty({
    description: 'Email liên hệ',
    example: 'info@kiendinhecm.com',
  })
  email: string;

  @ApiProperty({
    description: 'Địa chỉ',
    required: false,
  })
  address?: string;

  @ApiProperty({
    description: 'Thời gian làm việc',
    required: false,
  })
  workingHours?: string;

  @ApiProperty({ description: 'Thời gian cập nhật' })
  updatedAt: Date;
}
