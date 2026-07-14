import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Giá trị cấu hình' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class SettingResponseDto {
  @ApiProperty({ description: 'Khóa cấu hình' })
  key: string;

  @ApiProperty({ description: 'Giá trị' })
  value: string;
}

export class SloganDto {
  @ApiProperty({ description: 'Tiêu đề slogan' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Icon định danh' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0 })
  orderIndex: number;
}

export class TimelineDto {
  @ApiProperty({ description: 'Năm' })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({ description: 'Tiêu đề sự kiện' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Mô tả chi tiết' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0 })
  orderIndex: number;
}

export class SloganResponseDto extends SloganDto {
  @ApiProperty({ description: 'ID' })
  id: string;
}

export class TimelineResponseDto extends TimelineDto {
  @ApiProperty({ description: 'ID' })
  id: string;
}

export class BannerDto {
  @ApiProperty({ description: 'URL hình ảnh banner' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0 })
  orderIndex: number;
}

export class BannerResponseDto extends BannerDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: 'Trạng thái hiển thị' })
  status: boolean;
}
