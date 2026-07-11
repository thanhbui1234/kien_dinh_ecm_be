import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './core/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  // Cấu hình CORS cho phép Frontend truy cập (Mặc định tạm thời mở Full cho môi trường dev)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Khởi tạo Swagger (API Docs)
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
