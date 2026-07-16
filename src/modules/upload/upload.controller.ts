import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UPLOAD_CONSTANTS } from './constants/upload.constant';
import { AppMessages } from '../../common/constants/messages.constant';
import { ApiSuccessResponse, ApiStandardErrors } from '../../common/decorators/api-success-response.decorator';
import { UploadResponseDto } from './dto/upload-response.dto';

@ApiTags('Upload')
@ApiStandardErrors()
@ApiBearerAuth('JWT-auth')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload ảnh. Hỗ trợ xoá phông.
   */
  @ApiOperation({
    summary: 'Upload file ảnh',
    description: 'Tải ảnh lên hệ thống (có hỗ trợ xoá phông).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh cần tải lên',
        },
        publicId: {
          type: 'string',
          description: 'Truyền publicId nếu muốn ghi đè (thay thế) ảnh cũ',
        },
      },
    },
  })
  @ApiSuccessResponse({ model: UploadResponseDto, status: 201, description: 'Tải ảnh thành công' })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('publicId') publicId?: string,
  ) {
    if (!file) {
      throw new BadRequestException(AppMessages.UPLOAD.FILE_NOT_FOUND);
    }

    if (!file.mimetype.startsWith(UPLOAD_CONSTANTS.ALLOWED_MIME_PREFIX)) {
      throw new BadRequestException(AppMessages.UPLOAD.INVALID_FORMAT);
    }

    const url = await this.uploadService.uploadFile(file, publicId);
    return { url };
  }

  @ApiOperation({
    summary: 'Lấy danh sách ảnh',
    description: 'Lấy danh sách các file ảnh đã upload lên Cloudinary',
  })
  @ApiQuery({ name: 'nextCursor', required: false, description: 'Cursor để phân trang' })
  @Get()
  async getFiles(@Query('nextCursor') nextCursor?: string) {
    return this.uploadService.getUploadedFiles(nextCursor);
  }

  @ApiOperation({
    summary: 'Xóa ảnh',
    description: 'Xóa vĩnh viễn một ảnh trên Cloudinary dựa vào publicId',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        publicId: { type: 'string', description: 'ID của ảnh trên Cloudinary' },
      },
      required: ['publicId'],
    },
  })
  @Delete()
  async deleteFile(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('publicId là bắt buộc');
    }
    const result = await this.uploadService.deleteFile(publicId);
    return { success: true, result };
  }
}
