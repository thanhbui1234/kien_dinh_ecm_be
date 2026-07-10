import { IsNotEmpty, IsString } from 'class-validator';
import { AppMessages } from '../../../common/constants/messages.constant';

export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: AppMessages.VALIDATION.IS_NOT_EMPTY })
  refreshToken: string;
}
