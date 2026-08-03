import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Language } from '@prisma/client';

export class UpsertProductTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tên sản phẩm theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug theo ngôn ngữ (tự sinh nếu không truyền)' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Nội dung chi tiết bài viết' })
  @IsString()
  @IsOptional()
  contentDetail?: string;

  @ApiPropertyOptional({ description: 'Thông số kỹ thuật' })
  @IsOptional()
  specifications?: any;

  @ApiPropertyOptional({ description: 'Tính năng nổi bật' })
  @IsOptional()
  features?: any;

  @ApiPropertyOptional({ description: 'SEO Title' })
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO Description' })
  @IsString()
  @IsOptional()
  seoDescription?: string;
}

export class UpsertCategoryTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tên danh mục theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  slug?: string;
}

export class UpsertProjectTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tên dự án theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Mô tả ngắn' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Nội dung chi tiết' })
  @IsString()
  @IsOptional()
  contentDetail?: string;
}

export class UpsertCompanyInfoTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Nhãn theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Giá trị theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class UpsertFacilityTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tên cơ sở theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Quốc gia theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Địa chỉ theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class UpsertCompanySloganTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tiêu đề slogan theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả slogan theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpsertBannerTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiPropertyOptional({ description: 'Tiêu đề banner theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả banner theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpsertCompanyProfileTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Nội dung introHtml theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  introHtml: string;
}

export class UpsertHistoryEventTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Nhãn giai đoạn theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ description: 'Nội dung sự kiện theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class UpsertCompanyLocationTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tên vị trí theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Nhãn địa chỉ theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  addressLabel: string;

  @ApiProperty({ description: 'Địa chỉ chi tiết theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class UpsertContactSettingTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tiêu đề khối liên hệ theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Mô tả khối liên hệ theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Địa chỉ theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Giờ làm việc theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  workingHours?: string;
}

export class UpsertFooterSettingTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Văn bản giới thiệu footer theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  introText: string;

  @ApiPropertyOptional({ description: 'Địa chỉ theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Tiêu đề hỗ trợ khách hàng theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  customerSupportTitle?: string;

  @ApiPropertyOptional({ description: 'Danh sách liên kết hỗ trợ theo ngôn ngữ [{label, href}]' })
  @IsOptional()
  customerSupportLinks?: any;
}

export class UpsertJobPostTranslationDto {
  @ApiProperty({ enum: Language, description: 'Ngôn ngữ dịch (VI | EN)' })
  @IsEnum(Language)
  lang: Language;

  @ApiProperty({ description: 'Tiêu đề tuyển dụng theo ngôn ngữ' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Slug theo ngôn ngữ' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Mức lương' })
  @IsString()
  @IsOptional()
  salary?: string;

  @ApiPropertyOptional({ description: 'Mô tả công việc & Yêu cầu (sections JSON)' })
  @IsOptional()
  sections?: any;
}
