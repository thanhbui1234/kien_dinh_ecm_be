import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('Fetching products and leads...');
  const products = await prisma.product.findMany();
  const leads = await prisma.contactRequest.findMany();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const now = new Date();

  for (const product of products) {
    const fakeViewCount = Math.floor(Math.random() * 5000) + 100;
    const fakeDate = randomDate(thirtyDaysAgo, now);
    
    await prisma.product.update({
      where: { id: product.id },
      data: {
        viewCount: fakeViewCount,
        createdAt: fakeDate
      }
    });
  }
  console.log('Updated products with fake view counts and dates.');

  if (leads.length > 0) {
    for (const lead of leads) {
      const fakeDate = randomDate(thirtyDaysAgo, now);
      await prisma.contactRequest.update({
        where: { id: lead.id },
        data: {
          createdAt: fakeDate
        }
      });
    }
  } else {
    const fakeNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'];
    const statuses = ['PENDING', 'CONTACTED', 'SPAM'];
    const priorities = ['HIGH', 'MEDIUM', 'LOW'];
    
    for (let i = 0; i < 20; i++) {
      const fakeDate = randomDate(thirtyDaysAgo, now);
      await prisma.contactRequest.create({
        data: {
          fullName: fakeNames[Math.floor(Math.random() * fakeNames.length)],
          email: `test${i}@example.com`,
          phoneNumber: `098765432${i%10}`,
          message: 'Cho mình hỏi báo giá máy CNC này',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)] as any,
          createdAt: fakeDate,
        }
      });
    }
  }
  console.log('Fake data generation complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
