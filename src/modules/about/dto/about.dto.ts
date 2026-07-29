import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Company Profile ──────────────────────────────────────────────────────────

export class UpdateCompanyProfileDto {
  @ApiProperty({ description: 'Nội dung HTML giới thiệu công ty', required: false })
  @IsOptional()
  @IsString()
  introHtml?: string;

  @ApiProperty({ description: 'URL ảnh thumbnail trang About', required: false })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CompanyProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  introHtml: string;

  @ApiProperty({ required: false })
  thumbnailUrl?: string;
}

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

  @ApiProperty({ description: 'URL ảnh minh họa', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

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

export class UpdateHistoryEventOrderDto {
  @ApiProperty({ description: 'ID của sự kiện lịch sử' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Thứ tự mới' })
  @IsNumber()
  orderIndex: number;
}

export class UpdateHistoryEventOrdersDto {
  @ApiProperty({ type: [UpdateHistoryEventOrderDto], description: 'Danh sách sự kiện với thứ tự mới' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateHistoryEventOrderDto)
  events: UpdateHistoryEventOrderDto[];
}

// ─── Company Location ─────────────────────────────────────────────────────────

export class CreateCompanyLocationDto {
  @ApiProperty({ description: 'Tiêu đề vị trí', example: 'Vị trí nhà máy' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Nhãn địa chỉ', example: 'ĐỊA CHỈ NHÀ MÁY' })
  @IsString()
  @IsNotEmpty()
  addressLabel: string;

  @ApiProperty({
    description: 'Địa chỉ chi tiết',
    example: 'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Đường dẫn liên kết chỉ đường Google Maps',
    example: 'https://maps.google.com/?q=...',
    required: false,
  })
  @IsOptional()
  @IsString()
  directionsUrl?: string;

  @ApiProperty({
    description: 'Đường dẫn URL nhúng bản đồ Google Maps (iframe src hoặc chuỗi HTML iframe)',
    example: 'https://www.google.com/maps/embed?pb=...',
    required: false,
  })
  @IsOptional()
  @IsString()
  mapUrl?: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class UpdateCompanyLocationDto extends PartialType(CreateCompanyLocationDto) {}

export class CompanyLocationResponseDto extends CreateCompanyLocationDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Thời gian cập nhật' })
  updatedAt: Date;
}

export class UpdateCompanyLocationOrderDto {
  @ApiProperty({ description: 'ID của vị trí công ty' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Thứ tự mới' })
  @IsNumber()
  orderIndex: number;
}

export class UpdateCompanyLocationOrdersDto {
  @ApiProperty({
    type: [UpdateCompanyLocationOrderDto],
    description: 'Danh sách vị trí với thứ tự mới',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyLocationOrderDto)
  locations: UpdateCompanyLocationOrderDto[];
}

