import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ description: 'Trạng thái', example: 'ok' })
  status: string;

  @ApiProperty({ description: 'Thời gian server', example: '2026-07-12T04:00:00.000Z' })
  timestamp: string;
}
