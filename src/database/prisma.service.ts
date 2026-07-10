import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
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