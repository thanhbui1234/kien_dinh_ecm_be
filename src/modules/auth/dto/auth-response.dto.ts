import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT Access Token', example: 'eyJhbGci...' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh Token', example: 'd3b07384d...' })
  refreshToken: string;
}

export class UserProfileDto {
  @ApiProperty({ description: 'User ID', example: 'uuid-string' })
  id: string;

  @ApiProperty({ description: 'Email đăng nhập', example: 'admin@example.com' })
  email: string;

  @ApiProperty({ description: 'Họ và tên', example: 'Admin User' })
  fullName: string;

  @ApiProperty({ description: 'Vai trò', example: 'SUPER_ADMIN' })
  role: string;
}
