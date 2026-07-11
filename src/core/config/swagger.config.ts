import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Kiên Định ECM API')
    .setDescription('Tài liệu API cho dự án Kiên Định ECM')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT token',
        in: 'header',
      },
      'JWT-auth', // Tên của security scheme
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Endpoint để xem tài liệu Swagger sẽ là /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Giữ lại token sau khi F5
    },
  });
}
