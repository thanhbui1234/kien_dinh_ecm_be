import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  // Bạn có thể thêm các API quản lý người dùng ở đây trong tương lai.
}
