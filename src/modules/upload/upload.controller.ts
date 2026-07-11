import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { BgOption, UPLOAD_CONSTANTS } from './constants/upload.constant';
import { AppMessages } from '../../common/constants/messages.constant';

@ApiTags('Upload')
@ApiBearerAuth('JWT-auth')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  /**
   * Upload ảnh. Hỗ trợ xoá phông.
   */
  @ApiOperation({ summary: 'Upload file ảnh', description: 'Tải ảnh lên hệ thống (có hỗ trợ xoá phông).' })
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
        bgOption: {
          type: 'string',
          enum: [BgOption.NONE, BgOption.TRANSPARENT, BgOption.CLOUDINARY_WHITE],
          description: 'Tuỳ chọn xử lý phông nền (none | transparent | cloudinary_white)',
          default: BgOption.NONE,
        },
      },
    },
  })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('bgOption') bgOption?: BgOption,
  ) {
    if (!file) {
      throw new BadRequestException(AppMessages.UPLOAD.FILE_NOT_FOUND);
    }

    if (!file.mimetype.startsWith(UPLOAD_CONSTANTS.ALLOWED_MIME_PREFIX)) {
      throw new BadRequestException(AppMessages.UPLOAD.INVALID_FORMAT);
    }

    // Default to NONE if undefined
    const option = bgOption || BgOption.NONE;
    const url = await this.uploadService.uploadFile(file, option);
    return { url };
  }
}
