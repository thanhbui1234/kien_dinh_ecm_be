import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PageOptionsDto } from '../../../common/dto/pagination.dto';
import { Language } from '@prisma/client';

export class GetProductsFilterDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: Language, description: 'Ngôn ngữ hiển thị (VI | EN)', default: Language.VI })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(Language)
  @IsOptional()
  lang?: Language = Language.VI;


  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID danh mục' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hiển thị (true/false)' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiPropertyOptional({ description: 'Lọc sản phẩm nổi bật (true/false)' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Sắp xếp theo (VD: category, price, createdAt, viewCount)', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;
}
