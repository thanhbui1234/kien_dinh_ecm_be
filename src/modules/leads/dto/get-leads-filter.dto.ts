import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOptionsDto } from '../../../common/dto/pagination.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LeadPriority } from '@prisma/client';

export class GetLeadsFilterDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên, số điện thoại, email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái (PENDING, CONTACTED, SPAM)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Lọc theo mức độ ưu tiên (HIGH, MEDIUM, LOW)', enum: LeadPriority })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'ID Sản phẩm khách hàng quan tâm' })
  @IsOptional()
  @IsString()
  targetProductId?: string;

  @ApiPropertyOptional({ description: 'Sắp xếp theo (VD: createdAt_desc, createdAt_asc)', default: 'createdAt_desc' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
