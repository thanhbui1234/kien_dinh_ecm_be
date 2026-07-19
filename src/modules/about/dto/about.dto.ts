import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

// ─── Company Info ─────────────────────────────────────────────────────────────

export class CreateCompanyInfoDto {
  @ApiProperty({ description: 'Nhãn hiển thị', example: 'Thành lập' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Giá trị', example: '1919' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class UpdateCompanyInfoDto extends PartialType(CreateCompanyInfoDto) {}

export class CompanyInfoResponseDto extends CreateCompanyInfoDto {
  @ApiProperty({ description: 'ID' })
  id: string;
}

// ─── Facility ─────────────────────────────────────────────────────────────────

export class CreateFacilityDto {
  @ApiProperty({ description: 'Khu vực / vùng lãnh thổ', example: 'Đông Nam Á' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ description: 'Quốc gia', example: 'Việt Nam' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Tên cơ sở', example: 'Nhà máy Hà Nội' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Địa chỉ', example: 'KCN Bắc Thăng Long, Hà Nội' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Số điện thoại', example: '024 1234 5678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'URL hình ảnh cơ sở', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {}

export class FacilityResponseDto extends CreateFacilityDto {
  @ApiProperty({ description: 'ID' })
  id: string;
}

// ─── Company History Event ────────────────────────────────────────────────────

export class CreateCompanyHistoryEventDto {
  @ApiProperty({ description: 'Giai đoạn', example: '1919 - 1950' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ description: 'Năm', example: '1919' })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({ description: 'Nội dung sự kiện', example: 'Thành lập công ty tại Nagoya.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'URL hình ảnh', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class UpdateCompanyHistoryEventDto extends PartialType(CreateCompanyHistoryEventDto) {}

export class CompanyHistoryEventResponseDto extends CreateCompanyHistoryEventDto {
  @ApiProperty({ description: 'ID' })
  id: string;
}
