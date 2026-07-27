import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { ClientKeyGuard } from '../../common/guards/client-key.guard';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiChatResponseDto } from './dto/ai-chat-response.dto';
import { AI_HEADERS, AI_LIMITS } from './constants/ai.constants';

@ApiTags('AI Chat')
@ApiStandardErrors()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({
    summary: 'Gửi câu hỏi cho Trợ lý AI (Hỗ trợ Chat tiếp nối & Bảo vệ 5 Lớp Anti-Spam)',
    description: `API công khai dành cho khách hàng hỏi đáp sản phẩm & dịch vụ. Yêu cầu Header ${AI_HEADERS.CLIENT_KEY}, giới hạn ${AI_LIMITS.MINUTE_RATE_LIMIT} req/phút & tối đa ${AI_LIMITS.DAILY_IP_LIMIT} câu/ngày per IP.`,
  })
  @ApiHeader({
    name: AI_HEADERS.CLIENT_KEY,
    description: 'Secret Key xác thực từ Frontend App',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Xử lý câu hỏi thành công',
    type: AiChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: `Câu hỏi rỗng, quá ${AI_LIMITS.MAX_INPUT_LENGTH} ký tự hoặc chứa mã độc/script`,
  })
  @ApiResponse({
    status: 403,
    description: `Chữ ký Client (${AI_HEADERS.CLIENT_KEY}) không hợp lệ`,
  })
  @ApiResponse({
    status: 429,
    description: `Đã vượt quá giới hạn lượt hỏi (${AI_LIMITS.MINUTE_RATE_LIMIT} req/phút hoặc ${AI_LIMITS.DAILY_IP_LIMIT} req/ngày)`,
  })
  @Public()
  @UseGuards(ClientKeyGuard)
  @Throttle({
    default: {
      limit: AI_LIMITS.MINUTE_RATE_LIMIT,
      ttl: AI_LIMITS.MINUTE_RATE_TTL_MS,
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('chat')
  async chat(
    @Body() dto: AiChatDto,
    @Ip() ip: string,
  ): Promise<AiChatResponseDto> {
    return this.aiService.chat(dto, ip);
  }
}
