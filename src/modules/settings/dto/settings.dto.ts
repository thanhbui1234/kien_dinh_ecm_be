import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
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

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
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
  @ApiProperty({ description: 'Tiêu đề banner', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Mô tả banner', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Đường dẫn liên kết', required: false })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiProperty({ description: 'URL hình ảnh banner' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class UpdateBannerDto extends PartialType(BannerDto) {
  @ApiProperty({ description: 'Trạng thái hiển thị', required: false })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}

export class BannerResponseDto extends BannerDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: 'Trạng thái hiển thị' })
  status: boolean;
}

export class UpdateBannerOrderDto {
  @ApiProperty({ description: 'ID của banner' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Thứ tự mới' })
  @IsNumber()
  orderIndex: number;
}

export class UpdateBannerOrdersDto {
  @ApiProperty({ type: [UpdateBannerOrderDto], description: 'Danh sách banner với thứ tự mới' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBannerOrderDto)
  banners: UpdateBannerOrderDto[];
}
