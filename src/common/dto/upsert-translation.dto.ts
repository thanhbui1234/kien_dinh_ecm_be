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
