import { ApiProperty } from '@nestjs/swagger';

export class AiChatResponseDto {
  @ApiProperty({
    description: 'Câu trả lời từ Trợ lý AI',
    example: 'Hiện tại Công ty Thanh Bằng có dòng máy phay CNC...',
  })
  reply: string;

  @ApiProperty({
    description: 'Đánh dấu phản hồi được lấy từ Cache (nhanh hơn & tiết kiệm quota)',
    example: false,
  })
  cached: boolean;

  @ApiProperty({
    description: 'ID phiên hội thoại được cấp hoặc duy trì',
    example: 'c9b4a123-4567-89ab-cdef-0123456789ab',
    required: false,
  })
  sessionId?: string;
}
