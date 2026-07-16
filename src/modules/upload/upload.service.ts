import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';



import { AppMessages } from '../../common/constants/messages.constant';
import { UPLOAD_CONSTANTS } from './constants/upload.constant';

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
  async uploadFile(file: Express.Multer.File, publicId?: string): Promise<string> {
    const bufferToUpload = file.buffer;

    return new Promise((resolve, reject) => {
      const options: any = {
        folder: UPLOAD_CONSTANTS.FOLDER,
      };
      
      if (publicId) {
        options.public_id = publicId.replace(`${UPLOAD_CONSTANTS.FOLDER}/`, '');
        options.overwrite = true;
      }

      const upload = cloudinary.uploader.upload_stream(
        options,
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

          const finalUrl = result.secure_url;
          resolve(finalUrl);
        },
      );

      Readable.from(bufferToUpload).pipe(upload);
    });
  }

  /**
   * Lấy danh sách ảnh từ Cloudinary
   */
  async getUploadedFiles(nextCursor?: string, maxResults: number = 30) {
    try {
      let expression = `folder:${UPLOAD_CONSTANTS.FOLDER} AND resource_type:image`;
      const result = await cloudinary.search
        .expression(expression)
        .sort_by('created_at', 'desc')
        .max_results(maxResults)
        .next_cursor(nextCursor || '')
        .execute();

      return {
        resources: result.resources.map((item: any) => ({
          public_id: item.public_id,
          secure_url: item.secure_url,
          format: item.format,
          width: item.width,
          height: item.height,
          bytes: item.bytes,
          created_at: item.created_at,
        })),
        next_cursor: result.next_cursor,
        total_count: result.total_count,
      };
    } catch (error) {
      console.error('Cloudinary Search Error:', error);
      throw new InternalServerErrorException(
        AppMessages.UPLOAD.CLOUDINARY_ERROR + (error.message || JSON.stringify(error))
      );
    }
  }

  /**
   * Xóa ảnh khỏi Cloudinary
   */
  async deleteFile(publicId: string) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary Delete Error:', error);
      throw new InternalServerErrorException(
        AppMessages.UPLOAD.CLOUDINARY_ERROR + (error.message || JSON.stringify(error))
      );
    }
  }
}
