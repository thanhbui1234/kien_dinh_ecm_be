import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AppMessages } from '../../../common/constants/messages.constant';

export class LoginDto {
  @IsEmail({}, { message: AppMessages.VALIDATION.IS_EMAIL })
  @IsNotEmpty({ message: AppMessages.VALIDATION.IS_NOT_EMPTY })
  email: string;

  @IsString()
  @IsNotEmpty({ message: AppMessages.VALIDATION.IS_NOT_EMPTY })
  @MinLength(6, { message: AppMessages.VALIDATION.MIN_LENGTH(6) })
  password: string;
}
