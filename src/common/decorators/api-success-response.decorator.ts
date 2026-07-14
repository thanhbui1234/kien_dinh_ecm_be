import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto, ApiErrorResponseDto } from '../dto/api-response.dto';
import { PageDto } from '../dto/pagination.dto';

/**
 * Decorator chuẩn hóa định dạng Swagger trả về thành công (200/201).
 * Hỗ trợ Data Object hoặc Data Array.
 */
export const ApiSuccessResponse = <TModel extends Type<any>>(
  options: {
    model: TModel;
    isArray?: boolean;
    isPaginated?: boolean;
    description?: string;
    status?: number;
  }
) => {
  const { model, isArray = false, isPaginated = false, description = 'Success', status = 200 } = options;

  let dataSchema: any;

  if (isPaginated) {
    dataSchema = {
      allOf: [
        { $ref: getSchemaPath(PageDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(model) },
            },
          },
        },
      ],
    };
  } else if (isArray) {
    dataSchema = {
      type: 'array',
      items: { $ref: getSchemaPath(model) },
    };
  } else {
    dataSchema = { $ref: getSchemaPath(model) };
  }

  const decorators = [
    ApiExtraModels(ApiResponseDto, ApiErrorResponseDto, PageDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: dataSchema,
            },
          },
        ],
      },
    }),
  ];

  return applyDecorators(...decorators);
};

/**
 * Decorator đính kèm các mã lỗi chung (400, 401, 403, 404, 500) vào Swagger
 */
export const ApiStandardErrors = () => {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Dữ liệu không hợp lệ',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Token không hợp lệ hoặc đã hết hạn',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Không có quyền truy cập',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Không tìm thấy dữ liệu',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - Lỗi hệ thống',
      type: ApiErrorResponseDto,
    })
  );
};
