import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const adapter = new PrismaNeon({ connectionString });
    super({ adapter });
  }

  // Khi NestJS khởi động module này lên -> Tự động chọc cổng kết nối vào Neon Singapore
  async onModuleInit() {
    await this.$connect();
  }

  // Khi tắt server -> Tự động ngắt kết nối an toàn để không bị chiếm quyền giải phóng bộ nhớ của Neon
  async onModuleDestroy() {
    await this.$disconnect();
  }
}