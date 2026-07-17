import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsIn } from 'class-validator';
import { LeadPriority } from '@prisma/client';

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

  @ApiPropertyOptional({ description: 'Mức độ ưu tiên (HIGH, MEDIUM, LOW)', enum: LeadPriority })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;
}
