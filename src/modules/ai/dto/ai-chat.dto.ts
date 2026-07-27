import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { AI_LIMITS, AI_MESSAGES } from '../constants/ai.constants';

export class AiChatDto {
  @ApiProperty({
    description: `Câu hỏi hoặc tin nhắn gửi cho AI (Tối đa ${AI_LIMITS.MAX_INPUT_LENGTH} ký tự)`,
    example: 'Bên bạn có máy phay CNC nào giá dưới 1 tỷ không?',
    maxLength: AI_LIMITS.MAX_INPUT_LENGTH,
  })
  @IsString({ message: AI_MESSAGES.MSG_MUST_BE_STRING })
  @IsNotEmpty({ message: AI_MESSAGES.MSG_NOT_EMPTY })
  @MaxLength(AI_LIMITS.MAX_INPUT_LENGTH, {
    message: AI_MESSAGES.MSG_MAX_LENGTH_EXCEEDED,
  })
  @Matches(
    /^(?!.*(<script|<iframe|javascript:|SELECT\s+|DROP\s+|DELETE\s+FROM|UNION\s+SELECT)).*$/i,
    {
      message: AI_MESSAGES.UNSAFE_CONTENT,
    },
  )
  message: string;

  @ApiProperty({
    description: 'ID phiên hội thoại (UUID) giúp AI nhớ lịch sử câu hỏi trước đó',
    example: 'c9b4a123-4567-89ab-cdef-0123456789ab',
    required: false,
  })
  @IsOptional()
  @IsString({ message: AI_MESSAGES.SESSION_ID_MUST_BE_STRING })
  sessionId?: string;
}
