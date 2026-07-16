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

const VALID_ROLES = ['SUPER_ADMIN', 'EDITOR'];

function parseArgs(): { email: string; password: string; role: string; fullName: string } {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (const arg of args) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) parsed[match[1]] = match[2];
  }

  const email = parsed['email'];
  const password = parsed['password'];
  const role = (parsed['role'] || 'EDITOR').toUpperCase();
  const fullName = parsed['name'] || 'Admin User';

  if (!email || !password) {
    console.error('❌ Thiếu tham số bắt buộc.');
    console.error('   Cách dùng: ts-node prisma/create-admin.ts --email=<email> --password=<password> [--role=EDITOR|SUPER_ADMIN] [--name=<fullName>]');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`❌ Email không hợp lệ: ${email}`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Mật khẩu phải có ít nhất 8 ký tự.');
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`❌ Role không hợp lệ: "${role}". Chỉ chấp nhận: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  return { email, password, role, fullName };
}

async function main() {
  const { email, password, role, fullName } = parseArgs();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ Email đã tồn tại trong hệ thống: ${email}`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, fullName, role },
  });

  console.log('✅ Tạo tài khoản admin thành công!');
  console.log(`   Email    : ${user.email}`);
  console.log(`   Họ tên   : ${user.fullName}`);
  console.log(`   Role     : ${user.role}`);
  console.log(`   ID       : ${user.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
