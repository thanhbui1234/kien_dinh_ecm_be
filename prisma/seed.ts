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
  const hashedPassword = await bcrypt.hash('phamducngu123', 10);

  // 2. Tạo tài khoản Admin mặc định
  const defaultAdmin = await prisma.user.upsert({
    where: { email: 'admin@kiendinh.com' },
    update: {},
    create: {
      email: 'admin@kiendinh.com',
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

  // --- SEED CATEGORY ---
  const cat1 = await prisma.category.upsert({
    where: { slug: 'may-phay-cnc' },
    update: {},
    create: {
      name: 'Máy Phay CNC',
      slug: 'may-phay-cnc',
      orderIndex: 1,
      imageUrl: 'https://placehold.co/400x400/101010/ffffff?text=May+Phay+CNC',
    },
  });

  const cat2 = await prisma.category.upsert({
    where: { slug: 'may-tien-cnc' },
    update: {},
    create: {
      name: 'Máy Tiện CNC',
      slug: 'may-tien-cnc',
      orderIndex: 2,
      imageUrl: 'https://placehold.co/400x400/101010/ffffff?text=May+Tien+CNC',
    },
  });

  const cat3 = await prisma.category.upsert({
    where: { slug: 'may-cat-laser' },
    update: {},
    create: {
      name: 'Máy Cắt Laser',
      slug: 'may-cat-laser',
      orderIndex: 3,
      imageUrl: 'https://placehold.co/400x400/101010/ffffff?text=May+Cat+Laser',
    },
  });

  // --- SEED PRODUCT ---
  const prod1 = await prisma.product.upsert({
    where: { slug: 'mazak-integrex-i-200' },
    update: {},
    create: {
      name: 'Mazak INTEGREX i-200',
      slug: 'mazak-integrex-i-200',
      categoryId: cat1.id,
      thumbnailUrl: 'https://placehold.co/600x400/blue/white?text=Mazak+INTEGREX',
      isFeatured: true,
      price: 1500000000,
      detail: {
        create: {
          contentDetail: '<p>Máy đa nhiệm cao cấp từ Mazak với khả năng gia công 5 trục đồng thời. Thiết kế thông minh cho phép tiện và phay trên cùng một nguyên công, giảm thiểu tối đa thời gian gá đặt.</p>',
          specifications: { axes: 5, chuckSize: 8, maxSpeed: 5000 },
          features: ["Gia công đồng thời 5 trục", "Hệ thống làm mát thông minh", "Trục chính mạnh mẽ 22kW"],
        },
      },
    },
  });

  const prod2 = await prisma.product.upsert({
    where: { slug: 'mazak-quick-turn-250' },
    update: {},
    create: {
      name: 'Mazak QUICK TURN 250',
      slug: 'mazak-quick-turn-250',
      categoryId: cat2.id,
      thumbnailUrl: 'https://placehold.co/600x400/darkred/white?text=QUICK+TURN+250',
      isFeatured: true,
      price: 850000000,
      detail: {
        create: {
          contentDetail: '<p>Dòng máy tiện bán chạy nhất toàn cầu. Cung cấp hiệu suất gia công tuyệt vời, độ chính xác cao và dễ dàng vận hành thông qua hệ điều hành SmoothG.</p>',
          specifications: { axes: 2, chuckSize: 10, maxSpeed: 4000 },
          features: ["Tốc độ trục chính cực cao", "Hệ thống Smooth CNC", "Tiết kiệm 30% điện năng"],
        },
      },
    },
  });

  const prod3 = await prisma.product.upsert({
    where: { slug: 'mazak-optiplex-3015' },
    update: {},
    create: {
      name: 'Mazak OPTIPLEX 3015',
      slug: 'mazak-optiplex-3015',
      categoryId: cat3.id,
      thumbnailUrl: 'https://placehold.co/600x400/green/white?text=OPTIPLEX+3015',
      isFeatured: false,
      price: 2100000000,
      detail: {
        create: {
          contentDetail: '<p>Máy cắt Laser Fiber tốc độ siêu tốc dành cho kim loại tấm. Công nghệ tự động lấy nét giúp nâng cao chất lượng đường cắt.</p>',
          specifications: { laserPower: "6kW", bedSize: "3000x1500", material: "Thép/Inox/Nhôm" },
          features: ["Động cơ tuyến tính siêu nhanh", "Auto Focus", "Đầu cắt thông minh"],
        },
      },
    },
  });

  await prisma.project.upsert({
    where: { slug: 'du-an-nha-may-vinfast' },
    update: { isFeatured: true },
    create: {
      name: 'Dự án Cung cấp CNC Nhà Máy Vinfast',
      slug: 'du-an-nha-may-vinfast',
      description: 'Cung cấp hệ thống 10 máy tiện CNC cao cấp cho dây chuyền sản xuất xe điện.',
      coverImage: 'https://placehold.co/800x400/purple/white?text=Project+Vinfast',
      isFeatured: true,
      detail: {
        create: {
          contentDetail: '<p>Chi tiết quá trình bàn giao và lắp đặt máy Mazak tại nhà máy Hải Phòng. Đội ngũ kỹ sư Mazak đã làm việc liên tục để đảm bảo tiến độ bàn giao trong vòng 3 tháng.</p>',
        },
      },
      products: {
        create: [
          { productId: prod1.id },
          { productId: prod2.id }
        ],
      },
      categories: {
        create: [
          { categoryId: cat1.id },
          { categoryId: cat2.id }
        ],
      },
    },
  });

  await prisma.project.upsert({
    where: { slug: 'du-an-nha-may-samsung-thai-nguyen' },
    update: { isFeatured: false },
    create: {
      name: 'Dự án Samsung Thái Nguyên (SEVT)',
      slug: 'du-an-nha-may-samsung-thai-nguyen',
      description: 'Trang bị dây chuyền máy phay và máy cắt laser chuyên dụng cho khuôn mẫu.',
      coverImage: 'https://placehold.co/800x400/navy/white?text=Samsung+SEVT',
      detail: {
        create: {
          contentDetail: '<p>Cung cấp giải pháp gia công khuôn vỏ điện thoại với độ chính xác phần nghìn milimet. Đưa vào hoạt động hơn 5 máy Optiplex.</p>',
        },
      },
      products: {
        create: [
          { productId: prod1.id },
          { productId: prod3.id }
        ],
      },
      categories: {
        create: [
          { categoryId: cat1.id },
          { categoryId: cat3.id }
        ],
      },
    },
  });

  // --- SEED JOB POST ---
  await prisma.jobPost.upsert({
    where: { slug: 'sales-engineer' },
    update: {},
    create: {
      title: 'SALES ENGINEER',
      slug: 'sales-engineer',
      salary: 'Cạnh tranh',
      detail: {
        create: {
          sections: [
            {
              title: 'Job Description',
              contents: [
                'Develop sales plans; prospect, secure and expedite orders with existing and new accounts; conclude business contracts; maintain business growth.',
                'Conduct studies/analysis on market trend, competitors, products’ applications and technology, service needs.',
                'Participate at internal and external events such as fairs and exhibitions, customer events, workshops, etc.',
              ],
            },
            {
              title: 'Requirement',
              contents: [
                '01- 02 year experience in technical sales & service environment for CNC machines.',
                'Degree in Engineering or related discipline is required.',
                'Fluent in English.',
              ],
            },
          ],
        },
      },
    },
  });

  // --- SEED ABOUT US (Xóa dữ liệu cũ nếu chạy nhiều lần) ---
  await prisma.banner.deleteMany();
  await prisma.companySlogan.deleteMany();
  await prisma.companyInfo.deleteMany();
  await prisma.facility.deleteMany();

  // Banners
  const bannerData = [
    { title: 'Mazak Việt Nam', description: 'Cung cấp giải pháp gia công hàng đầu', imageUrl: 'https://placehold.co/1200x500/101010/ffffff?text=Mazak+Vietnam', orderIndex: 1 },
    { title: 'Tự Động Hóa 4.0', description: 'Định hình tương lai của sản xuất thông minh', imageUrl: 'https://placehold.co/1200x500/003366/ffffff?text=Smart+Factory', orderIndex: 2 }
  ];
  for (const b of bannerData) {
    await prisma.banner.create({ data: b });
  }

  // Company Slogan
  const sloganData = [
    { title: 'Giải pháp tối ưu', description: 'Cung cấp các công nghệ máy móc tiên tiến nhất thế giới.', icon: 'Settings', orderIndex: 1 },
    { title: 'Hỗ trợ toàn diện', description: 'Đội ngũ kỹ sư tận tâm đồng hành cùng doanh nghiệp.', icon: 'Users', orderIndex: 2 },
    { title: 'Chất lượng Nhật Bản', description: 'Sản phẩm vượt qua mọi tiêu chuẩn kiểm định khắt khe nhất.', icon: 'Award', orderIndex: 3 },
  ];
  for (const s of sloganData) {
    await prisma.companySlogan.create({ data: s });
  }

  // Company Info
  const companyInfoData = [
    { label: 'Tên công ty', value: 'Yamazaki Mazak Vietnam', orderIndex: 1 },
    { label: 'Trụ sở toàn cầu', value: 'Nagoya, Aichi, Nhật Bản', orderIndex: 2 },
    { label: 'Lĩnh vực', value: 'Máy Công Cụ, Tự Động Hóa CNC, Cắt Laser', orderIndex: 3 },
    { label: 'Nhân sự toàn cầu', value: 'Hơn 8,000 nhân viên', orderIndex: 4 },
  ];
  for (const c of companyInfoData) {
    await prisma.companyInfo.create({ data: c });
  }

  // Facility
  const facilityData = [
    { region: 'Nhật Bản', country: 'Nhật Bản', name: 'Nhà máy Oguchi (Trụ sở chính)', address: '1-131 Takeda, Oguchi-cho, Niwa-gun, Aichi-pref.', phone: '+81 587-95-1131', imageUrl: 'https://placehold.co/500x300/e0e0e0/000000?text=Oguchi+Plant', orderIndex: 1 },
    { region: 'Châu Á', country: 'Singapore', name: 'Nhà máy & Trung tâm Đông Nam Á', address: '21 Joo Koon Circle, Singapore 629053', phone: '+65 6861 6811', imageUrl: 'https://placehold.co/500x300/e0e0e0/000000?text=Singapore+Tech+Center', orderIndex: 2 },
    { region: 'Châu Á', country: 'Việt Nam', name: 'Trung tâm kỹ thuật Mazak Hà Nội', address: 'KCN Bắc Thăng Long, Đông Anh, Hà Nội', phone: '+84 24 3959 0001', imageUrl: 'https://placehold.co/500x300/e0e0e0/000000?text=Hanoi+Tech+Center', orderIndex: 3 },
    { region: 'Châu Á', country: 'Việt Nam', name: 'Văn phòng đại diện Hồ Chí Minh', address: 'Quận Tân Bình, TP. Hồ Chí Minh', phone: '+84 28 3811 1123', imageUrl: 'https://placehold.co/500x300/e0e0e0/000000?text=HCM+Branch', orderIndex: 4 },
  ];
  for (const f of facilityData) {
    await prisma.facility.create({ data: f });
  }

  console.log('✅ Bơm tài khoản Admin và Dữ liệu mẫu (gồm About/Enterprise modules) thành công!');
  console.log(`➡️ Email: ${defaultAdmin.email}`);
  console.log('➡️ Password: phamducngu123');
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