import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Đang kích hoạt tiến trình rải dữ liệu mồi...');

  // 1. Mã hóa mật khẩu bảo mật cho Admin bằng Bcrypt
  const hashedPassword = await bcrypt.hash('SuperSecurePassword2026', 10);

  // 2. Tạo tài khoản Admin mặc định (Dùng upsert để tránh bị trùng nếu chạy lại nhiều lần)
  const defaultAdmin = await prisma.user.upsert({
    where: { email: 'admin@mazak.com.vn' },
    update: {},
    create: {
      email: 'admin@mazak.com.vn',
      password: hashedPassword,
      fullName: 'Hệ Thống Admin Cốt Lõi',
      role: 'SUPER_ADMIN', // Quyền tối cao
    },
  });

  // 3. Tạo sẵn cấu hình hotline hệ thống mặc định
  await prisma.systemSetting.upsert({
    where: { key: 'ZALO_HOTLINE' },
    update: {},
    create: {
      key: 'ZALO_HOTLINE',
      value: '0901.234.567',
    },
  });

  console.log('✅ Bơm tài khoản Admin mồi lên Neon thành công!');
  console.log(`➡️ Email: ${defaultAdmin.email}`);
  console.log('➡️ Password: SuperSecurePassword2026');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi tiến trình Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ngắt kết nối an toàn sau khi chạy xong
    await prisma.$disconnect();
  });