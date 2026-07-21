import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ description: 'Họ và tên khách hàng' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Số điện thoại liên hệ' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Email khách hàng' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Nội dung tin nhắn / yêu cầu' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'ID Sản phẩm khách hàng quan tâm' })
  @IsOptional()
  @IsString()
  targetProductId?: string;

  @ApiPropertyOptional({ description: 'ID Vị trí tuyển dụng khách hàng muốn ứng tuyển' })
  @IsOptional()
  @IsString()
  targetJobId?: string;
}
