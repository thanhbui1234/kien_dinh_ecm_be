import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ description: 'Tiêu đề tuyển dụng' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Slug định danh (để trống sẽ tự tạo từ tiêu đề)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Mức lương', default: 'Cạnh tranh' })
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hiển thị', default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiProperty({ description: 'Mảng các mục chi tiết (JSON)', type: Object, isArray: true })
  @IsNotEmpty()
  sections: any;
}
