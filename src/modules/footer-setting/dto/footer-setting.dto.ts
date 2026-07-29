import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerSupportLinkDto {
  @ApiProperty({ description: 'Nhãn liên kết', example: 'Tư vấn ngay' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Đường dẫn URL', example: '/contact' })
  @IsString()
  href: string;
}

export class UpdateFooterSettingDto {
  @ApiProperty({
    description: 'Đoạn giới thiệu công ty ở footer',
    example:
      'Công ty Cổ Phần Thanh Bằng tự hào là một trong những công ty uy tín nhất hiện nay và sẵn sàng cam kết với khách hàng về các vấn đề chất lượng, nguồn gốc xuất xứ của sản phẩm cũng như các dịch vụ đi kèm khác.',
    required: false,
  })
  @IsOptional()
  @IsString()
  introText?: string;

  @ApiProperty({
    description: 'Trang Facebook',
    example: 'https://www.facebook.com/ThanhBangNamDinh',
    required: false,
  })
  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @ApiProperty({
    description: 'Kênh YouTube',
    example: 'https://www.youtube.com/@congtythanhbang1735',
    required: false,
  })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiProperty({
    description: 'Kênh Instagram',
    example: 'https://instagram.com/...',
    required: false,
  })
  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @ApiProperty({
    description: 'Số điện thoại hotline chính',
    example: '0943676869',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Địa chỉ Email liên hệ',
    example: 'maygachbetongtb@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Địa chỉ trụ sở/nhà máy',
    example:
      'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Số điện thoại liên hệ mua hàng',
    example: '0943.67.68.69',
    required: false,
  })
  @IsOptional()
  @IsString()
  salesPhone?: string;

  @ApiProperty({
    description: 'Số điện thoại đóng góp ý kiến',
    example: '0914 161 122',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedbackPhone?: string;

  @ApiProperty({
    description: 'Số điện thoại bảo hành',
    example: '0912 01 77 55',
    required: false,
  })
  @IsOptional()
  @IsString()
  warrantyPhone?: string;

  @ApiProperty({
    description: 'Tiêu đề cột hỗ trợ khách hàng',
    example: 'HỖ TRỢ KHÁCH HÀNG',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerSupportTitle?: string;

  @ApiProperty({
    type: [CustomerSupportLinkDto],
    description: 'Danh sách đường dẫn hỗ trợ khách hàng',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerSupportLinkDto)
  customerSupportLinks?: CustomerSupportLinkDto[];
}

export class FooterSettingResponseDto {
  @ApiProperty({ description: 'ID singleton', example: 'singleton' })
  id: string;

  @ApiProperty({ description: 'Nội dung giới thiệu công ty' })
  introText: string;

  @ApiProperty({ description: 'Facebook URL', required: false })
  facebookUrl?: string;

  @ApiProperty({ description: 'YouTube URL', required: false })
  youtubeUrl?: string;

  @ApiProperty({ description: 'Instagram URL', required: false })
  instagramUrl?: string;

  @ApiProperty({ description: 'Số điện thoại chính', required: false })
  phone?: string;

  @ApiProperty({ description: 'Email liên hệ', required: false })
  email?: string;

  @ApiProperty({ description: 'Địa chỉ công ty', required: false })
  address?: string;

  @ApiProperty({ description: 'Hotline Mua hàng', required: false })
  salesPhone?: string;

  @ApiProperty({ description: 'Hotline Góp ý', required: false })
  feedbackPhone?: string;

  @ApiProperty({ description: 'Hotline Bảo hành', required: false })
  warrantyPhone?: string;

  @ApiProperty({ description: 'Tiêu đề cột Hỗ trợ khách hàng', required: false })
  customerSupportTitle?: string;

  @ApiProperty({
    type: [CustomerSupportLinkDto],
    description: 'Danh sách liên kết Hỗ trợ khách hàng',
    required: false,
  })
  customerSupportLinks?: CustomerSupportLinkDto[];

  @ApiProperty({ description: 'Thời gian cập nhật' })
  updatedAt: Date;
}
