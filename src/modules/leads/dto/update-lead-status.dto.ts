import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateLeadStatusDto {
  @ApiProperty({ description: 'Trạng thái lead (PENDING, CONTACTED, SPAM)' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'CONTACTED', 'SPAM'])
  status: string;

  @ApiPropertyOptional({ description: 'Ghi chú của admin' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
