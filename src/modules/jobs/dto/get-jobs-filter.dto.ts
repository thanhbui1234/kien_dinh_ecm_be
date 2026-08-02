import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOptionsDto } from '../../../common/dto/pagination.dto';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { Language } from '@prisma/client';

export class GetJobsFilterDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: Language, description: 'Ngôn ngữ hiển thị (VI | EN)', default: Language.VI })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(Language)
  @IsOptional()
  lang?: Language = Language.VI;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tiêu đề' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hiển thị (true/false)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  status?: boolean;
}
