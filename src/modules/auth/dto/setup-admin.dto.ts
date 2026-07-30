import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class SetupAdminDto {
  @ApiProperty({ example: 'admin@kiendinhecm.com', description: 'Email quản trị viên' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'Mật khẩu tối thiểu 8 ký tự' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password!: string;

  @ApiProperty({ example: 'Admin User', description: 'Họ và tên (Không bắt buộc)', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 'my-super-secret-key', description: 'Mã bí mật để cấp quyền tạo Admin' })
  @IsString()
  @IsNotEmpty({ message: 'Secret key không được để trống' })
  secretKey!: string;
}
