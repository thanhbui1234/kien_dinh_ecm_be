import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: 'Đường dẫn ảnh đã tải lên', example: 'https://res.cloudinary.com/...' })
  url: string;
}
