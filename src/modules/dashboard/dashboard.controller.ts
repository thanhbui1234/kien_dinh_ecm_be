import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Lấy thống kê lưu lượng 30 ngày qua (Liên hệ và Sản phẩm)' })
  @Get('stats')
  get30DaysStats() {
    return this.dashboardService.get30DaysStats();
  }
}
