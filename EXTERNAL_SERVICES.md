# External Services & Integrations

Tài liệu này mô tả tất cả các dịch vụ bên ngoài (third-party) mà dự án Kien Dinh ECM Backend đang sử dụng: cách đăng ký, cách lấy credentials, và cách cấu hình vào file `.env`.

---

## Tổng quan

| Service | Mục đích | Free Tier | Liên kết |
|---------|----------|-----------|----------|
| **Neon** | Database PostgreSQL Serverless | ✅ 0.5 GB, 1 project | [neon.tech](https://neon.tech) |
| **Cloudinary** | Upload & quản lý ảnh/video | ✅ 25 GB storage, 25 GB bandwidth/tháng | [cloudinary.com](https://cloudinary.com) |
| **Render** | Deploy & hosting backend | ✅ Free Web Service (cold start sau 15 phút) | [render.com](https://render.com) |
| **UptimeRobot** | Giám sát uptime & tránh cold start | ✅ 50 monitors, 5-phút interval | [uptimerobot.com](https://uptimerobot.com) |

---

## 1. Neon — Serverless PostgreSQL

### Lấy `DATABASE_URL`

1. Vào [neon.tech](https://neon.tech) → Đăng ký / Đăng nhập.
2. Tạo một **Project** mới → Chọn region gần nhất (ví dụ: `ap-southeast-1` Singapore).
3. Vào tab **Dashboard** → Mục **Connection Details**.
4. Chọn **Connection string** → Copy chuỗi kết nối.

```
DATABASE_URL="postgresql://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require"
```

> ⚠️ **Bắt buộc** phải có `?sslmode=require` ở cuối URL — Neon yêu cầu SSL.

### Các lệnh Prisma liên quan

```bash
npx prisma db push          # Đẩy schema lên Neon (dev/prototyping)
npx prisma migrate dev      # Tạo migration có version (nên dùng cho prod)
npx prisma migrate deploy   # Apply migration lên Neon (trong CI/CD hoặc Render)
npx prisma studio           # Mở GUI quản lý DB trực quan
```

### Branching (Neon Pro Feature)
Neon hỗ trợ **Database Branching** (tương tự Git branch) — rất hữu ích để test migration mà không ảnh hưởng data production. Tính năng này có trên gói miễn phí giới hạn.

---

## 2. Cloudinary — Image & Video Management

### Lấy Credentials

1. Vào [cloudinary.com](https://cloudinary.com) → Đăng ký / Đăng nhập.
2. Vào **Dashboard** (trang chủ sau khi login).
3. Nhìn vào mục **Product Environment Credentials** — bạn sẽ thấy ngay 3 giá trị:

| Biến `.env` | Lấy từ |
|-------------|--------|
| `CLOUDINARY_CLOUD_NAME` | **Cloud name** |
| `CLOUDINARY_API_KEY` | **API key** |
| `CLOUDINARY_API_SECRET` | **API secret** (click icon mắt để xem) |

```env
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### Cách hoạt động trong dự án

- File upload đi qua `POST /api/v1/upload` (cần JWT).
- Files được **stream trực tiếp** lên Cloudinary (không lưu disk).
- Folder lưu trữ trên Cloudinary được định nghĩa trong `src/modules/upload/constants/upload.constant.ts`.
- Tùy chọn `bgOption=transparent` sẽ kích hoạt AI xóa background trước khi upload.

### Xem ảnh đã upload
Vào Cloudinary Dashboard → **Media Library** để quản lý toàn bộ ảnh đã upload.

---

## 3. Render — Hosting & Deployment

### Tạo Web Service

1. Vào [render.com](https://render.com) → Đăng ký / Đăng nhập.
2. Click **New +** → **Web Service**.
3. Kết nối GitHub repository của bạn.
4. Cấu hình như sau:

| Trường | Giá trị |
|--------|---------|
| **Name** | `kien-dinh-ecm-be` (hoặc tùy ý) |
| **Region** | Singapore (gần Việt Nam nhất) |
| **Branch** | `master` (hoặc `main`) |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm dlx prisma generate && pnpm run build` |
| **Start Command** | `pnpm run start:prod` |
| **Plan** | `Free` |

### Environment Variables (Render Dashboard → Environment)

Copy đúng các giá trị sau vào tab **Environment** trên Render:

```
NODE_ENV=production
DATABASE_URL=<lấy từ Neon>
JWT_SECRET=<chuỗi bí mật dài, random>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<chuỗi bí mật dài, random khác>
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=<lấy từ Cloudinary>
CLOUDINARY_API_KEY=<lấy từ Cloudinary>
CLOUDINARY_API_SECRET=<lấy từ Cloudinary>
```

> ⚠️ **KHÔNG set `PORT`** — Render tự inject biến này. Set thủ công có thể gây lỗi binding.  
> 💡 Thêm `NODE_VERSION=22` nếu Render báo lỗi Node version không tương thích.

### Auto-Deploy

Mặc định, mỗi khi bạn push code lên branch `master` → Render sẽ tự động **build và deploy lại**. Có thể tắt tính năng này trong Settings → **Auto-Deploy: Off** nếu muốn deploy thủ công.

### Lấy URL Public

Sau khi deploy thành công, Render sẽ cấp một URL dạng:
```
https://kien-dinh-ecm-be.onrender.com
```
API docs: `https://kien-dinh-ecm-be.onrender.com/api/docs`

---

## 4. UptimeRobot — Monitoring & Keep-Alive

Render Free Tier **tự động ngủ** sau 15 phút không có traffic (cold start ~30-50 giây). UptimeRobot ping định kỳ để giữ server luôn thức.

### Tạo Monitor

1. Vào [uptimerobot.com](https://uptimerobot.com) → Đăng ký / Đăng nhập.
2. Click **+ Add New Monitor**.
3. Điền thông tin:

| Trường | Giá trị |
|--------|---------|
| **Monitor Type** | `HTTP(s)` |
| **Friendly Name** | `Kien Dinh ECM API` |
| **URL** | `https://kien-dinh-ecm-be.onrender.com/api/v1/health` |
| **Monitoring Interval** | `14 minutes` |
| **Monitor Timeout** | `30 seconds` |

4. Thêm **Alert Contact** (email của bạn) để nhận thông báo khi server down.
5. Click **Create Monitor**.

### Tại sao là 14 phút?

| Interval | Đánh giá |
|----------|----------|
| 5 phút | ✅ Hoạt động, nhưng dư thừa |
| **14 phút** | ✅ **Tối ưu** — ping trước ngưỡng ngủ 1 phút |
| 15 phút | ⚠️ Rủi ro — server có thể vừa ngủ khi ping đến |
| 20 phút | ❌ Quá muộn |

### Health Check Endpoint

```
GET /api/v1/health
```

```json
{
  "status": "ok",
  "timestamp": "2026-07-12T04:00:00.000Z"
}
```

- Không cần JWT (`@Public()`).
- Không query database.
- Response time thường < 100ms.

---

## File `.env.example` đầy đủ

```env
PORT=8080
NODE_ENV=development

# Neon Serverless PostgreSQL
DATABASE_URL="postgresql://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require"

# JWT
JWT_SECRET="your_access_secret_key_here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your_refresh_secret_key_here"
JWT_REFRESH_EXPIRES_IN="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="name"
CLOUDINARY_API_KEY="key"
CLOUDINARY_API_SECRET="secret"
```

> ✅ File `.env` thật KHÔNG được commit lên Git (đã có trong `.gitignore`).  
> ✅ Chỉ commit `.env.example` với giá trị placeholder.
