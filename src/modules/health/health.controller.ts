import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  /**
   * Endpoint kiểm tra trạng thái server.
   * Dùng để UptimeRobot hoặc các service bên ngoài ping định kỳ,
   * giữ cho server không bị "ngủ" trên Render Free Tier.
   */
  @ApiOperation({
    summary: 'Health Check',
    description: 'Kiểm tra server có đang hoạt động không. Không cần xác thực.',
  })
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
