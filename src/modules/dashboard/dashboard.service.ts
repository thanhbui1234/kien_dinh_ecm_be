import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get30DaysStats() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [leadsRaw, productsRaw] = await Promise.all([
      this.prisma.$queryRaw<{ date: Date; count: number }[]>`
        SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh') as date, CAST(COUNT(*) AS INTEGER) as count
        FROM "ContactRequest"
        WHERE "createdAt" >= ${thirtyDaysAgo} AND "createdAt" <= ${today}
        GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ORDER BY date ASC;
      `,
      this.prisma.$queryRaw<{ date: Date; count: number }[]>`
        SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh') as date, CAST(COUNT(*) AS INTEGER) as count
        FROM "Product"
        WHERE "createdAt" >= ${thirtyDaysAgo} AND "createdAt" <= ${today}
        GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ORDER BY date ASC;
      `,
    ]);

    const leadMap = new Map<string, number>();
    leadsRaw.forEach(item => {
      const d = new Date(item.date);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      leadMap.set(key, Number(item.count));
    });

    const productMap = new Map<string, number>();
    productsRaw.forEach(item => {
      const d = new Date(item.date);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      productMap.set(key, Number(item.count));
    });

    const result: { date: string; leads: number; products: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      result.push({
        date: key,
        leads: leadMap.get(key) || 0,
        products: productMap.get(key) || 0,
      });
    }

    return result;
  }
}
