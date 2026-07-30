import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { AppMessages } from '../../../common/constants/messages.constant';

export class LoginDto {
  @IsEmail({}, { message: AppMessages.VALIDATION.IS_EMAIL })
  @IsNotEmpty({ message: AppMessages.VALIDATION.IS_NOT_EMPTY })
  email: string;

  @IsString()
  @IsNotEmpty({ message: AppMessages.VALIDATION.IS_NOT_EMPTY })
  @MinLength(6, { message: AppMessages.VALIDATION.MIN_LENGTH(6) })
  password: string;

  @ApiProperty({ example: 'uuid_12345678', description: 'Mã UUID thiết bị (LocalStorage)', required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({ example: 'fp_a8f9c2d1e3b4', description: 'Mã vân tay phần cứng FingerprintJS', required: false })
  @IsString()
  @IsOptional()
  fingerprint?: string;
}
