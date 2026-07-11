import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

import { removeBackground } from '@imgly/background-removal-node';

import { AppMessages } from '../../common/constants/messages.constant';
import { BgOption, UPLOAD_CONSTANTS } from './constants/upload.constant';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload file lên Cloudinary thông qua stream. Hỗ trợ xoá phông.
   */
  async uploadFile(
    file: Express.Multer.File,
    bgOption: BgOption = BgOption.NONE,
  ): Promise<string> {
    let bufferToUpload = file.buffer;

    // Nếu chọn transparent, dùng AI xóa phông cục bộ trước khi upload
    if (bgOption === BgOption.TRANSPARENT) {
      try {
        const inputBlob = new Blob([new Uint8Array(file.buffer)], {
          type: file.mimetype,
        });
        const blob = await removeBackground(inputBlob);
        const arrayBuffer = await blob.arrayBuffer();
        bufferToUpload = Buffer.from(arrayBuffer);
      } catch (err) {
        console.error('Lỗi xóa phông cục bộ:', err);
        throw new InternalServerErrorException(
          AppMessages.UPLOAD.BG_REMOVAL_ERROR,
        );
      }
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: UPLOAD_CONSTANTS.FOLDER,
          ...(bgOption === BgOption.TRANSPARENT && { format: 'png' }),
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(
              new InternalServerErrorException(
                AppMessages.UPLOAD.CLOUDINARY_ERROR +
                  (error.message || JSON.stringify(error)),
              ),
            );
          }

          let finalUrl = result.secure_url;

          // Nếu chọn cloudinary_white, tận dụng tính năng on-the-fly transformation
          if (bgOption === BgOption.CLOUDINARY_WHITE) {
            // Chèn e_background_removal,b_white vào sau /upload/
            finalUrl = finalUrl.replace(
              '/upload/',
              '/upload/e_background_removal,b_white/',
            );
          }

          resolve(finalUrl);
        },
      );

      Readable.from(bufferToUpload).pipe(upload);
    });
  }
}
