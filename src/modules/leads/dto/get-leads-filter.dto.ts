import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOptionsDto } from '../../../common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetLeadsFilterDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên, số điện thoại, email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái (PENDING, CONTACTED, SPAM)' })
  @IsOptional()
  @IsString()
  status?: string;
}
