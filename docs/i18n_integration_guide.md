# HƯỚNG DẪN TÍCH HỢP ĐA NGÔN NGỮ (i18n INTEGRATION GUIDE)
**Dành cho Frontend Developers (Admin Portal & Client App)**

Tài liệu này hướng dẫn chi tiết cách kết nối API đa ngôn ngữ (Tiếng Việt `VI` & Tiếng Anh `EN`) từ Backend **`kien_dinh_ecm_be`** lên 2 ứng dụng Frontend:
1. **Client App (`user-next-app` - Next.js App Router)**: Tối ưu SEO đa ngôn ngữ.
2. **Admin Portal (`admin-vite-app` - Vite SPA)**: Quản lý bản dịch Tiếng Anh.

---

## I. TỔNG QUAN HỆ THỐNG API (API OVERVIEW)

### 1. Enum Ngôn ngữ (Language Enum)
- `VI` (Mặc định): Tiếng Việt
- `EN`: Tiếng Anh

### 2. Các thực thể hỗ trợ i18n (4 Entities)
- `Category` (Danh mục)
- `Product` (Sản phẩm & Chi tiết)
- `Project` (Dự án & Chi tiết)
- `JobPost` (Bài đăng tuyển dụng)

---

## II. HƯỚNG DẪN DÀNH CHO CLIENT APP (`user-next-app` - Next.js)

### 1. Định tuyến Sub-Path (Sub-path Routing)
Sử dụng cấu trúc thư mục App Router của Next.js:
`src/app/[lang]/san-pham/[slug]/page.tsx` hoặc `src/app/[lang]/products/[slug]/page.tsx`
- Ví dụ URL Tiếng Việt: `/vi/san-pham/may-phay-cnc`
- Ví dụ URL Tiếng Anh: `/en/products/cnc-milling-machine`

### 2. Gọi API kèm tham số `?lang=`
Khi fetch dữ liệu từ Backend, luôn truyền query parameter `?lang=${lang}`:
- GET `/api/products?lang=en` (Lấy danh sách sản phẩm dịch sẵn Tiếng Anh)
- GET `/api/products/may-phay-cnc?lang=vi`
- GET `/api/products/cnc-milling-machine?lang=en`
- GET `/api/categories?lang=en`
- GET `/api/projects?lang=en`
- GET `/api/jobs?lang=en`

### 3. Cấu trúc Response và Tối ưu SEO (`hreflang` Tags)
Tất cả các API chi tiết (`findOne`) đều trả về trường `alternates`:
```json
{
  "id": "c8a1b2c3-...",
  "name": "CNC Milling Machine",
  "slug": "cnc-milling-machine",
  "detail": {
    "contentDetail": "<p>English detailed specs...</p>",
    "seoTitle": "CNC Milling Machine - High Precision",
    "seoDescription": "Premium CNC Milling Machine for factory automation."
  },
  "category": {
    "id": "cat-123",
    "name": "Milling Machines",
    "slug": "milling-machines"
  },
  "alternates": {
    "viSlug": "may-phay-cnc",
    "enSlug": "cnc-milling-machine"
  }
}
```

### 4. Code mẫu Next.js SSR `generateMetadata` chuẩn SEO Google:
```tsx
import { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: 'vi' | 'en'; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const uppercaseLang = lang.toUpperCase(); // 'VI' | 'EN'

  // Gọi API Backend
  const res = await fetch(`https://api.kiendinhecm.com/products/${slug}?lang=${uppercaseLang}`, {
    next: { revalidate: 3600 }
  });
  const data = await res.json();

  const domain = 'https://kiendinhecm.com';
  const currentUrl = `${domain}/${lang}/${lang === 'vi' ? 'san-pham' : 'products'}/${data.slug}`;

  return {
    title: data.detail?.seoTitle || data.name,
    description: data.detail?.seoDescription || data.name,
    alternates: {
      canonical: currentUrl,
      languages: {
        'vi': `${domain}/vi/san-pham/${data.alternates.viSlug}`,
        'en': `${domain}/en/products/${data.alternates.enSlug || data.slug}`,
        'x-default': `${domain}/vi/san-pham/${data.alternates.viSlug}`,
      },
    },
  };
}
```

---

## III. HƯỚNG DẪN DÀNH CHO ADMIN PORTAL (`admin-vite-app`)

### 1. Tối ưu 1 Request duy nhất cho Admin (Single API Call for Admin)
**Admin KHÔNG CẦN gọi 2 API riêng lẻ (`?lang=vi` và `?lang=en`)**. 
Khi Admin mở Modal xem/chỉnh sửa một Sản phẩm, Danh mục, Dự án hay Bài tuyển dụng:
- Admin chỉ cần gọi **1 request duy nhất**: `GET /api/products/:id` (hoặc `/categories/:id`, `/projects/:id`, `/jobs/:id`).
- Response trả về **luôn kèm sẵn mảng `translations: [...]`** chứa ĐẦY ĐỦ các bản dịch (`VI` và `EN`):

```json
{
  "id": "prod-123",
  "name": "Máy Phay CNC Mazak",
  "slug": "may-phay-cnc-mazak",
  "price": 500000000,
  "thumbnailUrl": "https://...",
  "translations": [
    {
      "lang": "VI",
      "name": "Máy Phay CNC Mazak",
      "slug": "may-phay-cnc-mazak",
      "contentDetail": "<p>Nội dung chi tiết tiếng Việt...</p>",
      "seoTitle": "Máy Phay CNC Mazak"
    },
    {
      "lang": "EN",
      "name": "Mazak CNC Milling Machine",
      "slug": "mazak-cnc-milling-machine",
      "contentDetail": "<p>English detailed specs...</p>",
      "seoTitle": "Mazak CNC Milling Machine"
    }
  ]
}
```

### 2. Cách hiển thị lên 2 Tab trong Admin Form:
- **Tab [Tiếng Việt]**: Điền dữ liệu từ `data.translations.find(t => t.lang === 'VI')` (hoặc các trường mặc định).
- **Tab [Tiếng Anh]**: Điền dữ liệu từ `data.translations.find(t => t.lang === 'EN')`.

---

## IV. ĐỂ ADMIN LƯU BẢN DỊCH (UPSERT TRANSLATION)
Khi Admin nhập xong thông tin Tiếng Anh và nhấn "Lưu bản dịch Tiếng Anh", gọi request POST đến các endpoint tương ứng:

#### A. Bản dịch Sản phẩm (`Product`)
`POST /api/products/:id/translation`
**Headers**: `Authorization: Bearer <token>`
**Body Payload**:
```json
{
  "lang": "EN",
  "name": "Mazak CNC Milling Machine",
  "slug": "mazak-cnc-milling-machine",
  "contentDetail": "<p>English full content...</p>",
  "specifications": { "power": "15kW", "speed": "12000 RPM" },
  "features": ["High Speed", "Precision Spindle"],
  "seoTitle": "Mazak CNC Milling Machine",
  "seoDescription": "Buy Mazak CNC Milling Machine with best price."
}
```

#### B. Bản dịch Danh mục (`Category`)
`POST /api/categories/:id/translation`
```json
{
  "lang": "EN",
  "name": "CNC Milling Machines",
  "slug": "cnc-milling-machines"
}
```

#### C. Bản dịch Dự án (`Project`)
`POST /api/projects/:id/translation`
```json
{
  "lang": "EN",
  "name": "Factory Automation Project 2026",
  "slug": "factory-automation-project-2026",
  "description": "Short English summary...",
  "contentDetail": "<p>Full project case study in English...</p>"
}
```

#### D. Bản dịch Bài tuyển dụng (`JobPost`)
`POST /api/jobs/:id/translation`
```json
{
  "lang": "EN",
  "title": "Senior CNC Mechanical Engineer",
  "slug": "senior-cnc-mechanical-engineer",
  "salary": "Competitive",
  "sections": [
    { "title": "Job Description", "content": "Operating CNC machines..." },
    { "title": "Requirements", "content": "3+ years experience..." }
  ]
}
```

---

## V. THAO TÁC SỬA VÀ XÓA TẠI ADMIN PORTAL (UPDATE & DELETE)

### 1. Thao tác SỬA (UPDATE)
- **Sửa thông tin chung (Giá, Ảnh, Trạng thái, Tiếng Việt)**: Gọi `PATCH /api/products/:id` như bình thường. Bản dịch Tiếng Việt (`VI`) tự động đồng bộ.
- **Sửa / Cập nhật bản dịch Tiếng Anh (`EN`)**: Gọi `POST /api/products/:id/translation` với body `{ lang: "EN", ... }`. Backend tự động `upsert` cập nhật riêng bản `EN`, không chạm đến bản `VI`.

### 2. Thao tác XÓA (DELETE - TỰ ĐỘNG 100%)
- **Admin chỉ cần gọi 1 API xóa duy nhất**: `DELETE /api/products/:id` (hoặc `/categories/:id`, `/projects/:id`, `/jobs/:id`).
- **Cơ chế Cascade Delete**: Trong CSDL PostgreSQL, mối quan hệ giữa bảng gốc và các bảng dịch đã được thiết lập `onDelete: Cascade`.
- **Kết quả**: Khi xóa 1 sản phẩm/dự án/danh mục, **toàn bộ bản dịch Tiếng Việt, Tiếng Anh và dữ liệu liên quan sẽ tự động bị xóa sạch 100%**. Admin không cần phải gọi API xóa bản dịch riêng lẻ!

---

## VI. QUY TRÌNH CHỦ CHỐT & NGUYÊN TẮC AN TOÀN (SAFEGUARDS)
1. **Không ghi đè chéo (Independent Updates)**: Cập nhật bản dịch Tiếng Anh (`EN`) hoàn toàn độc lập, **không làm thay đổi hay đè mất dữ liệu Tiếng Việt (`VI`)**.
2. **Cơ chế Fallback an toàn**: Nếu một sản phẩm chưa kịp nhập bản dịch Tiếng Anh, API `?lang=en` sẽ tự động trả về bản dịch Tiếng Việt mặc định để FE không bị crash hay hiển thị trống.
3. **Tự động làm sạch Redis Cache**: Khi Admin lưu bản dịch mới hoặc xóa sản phẩm, Backend sẽ tự động xóa các key cache liên quan để thông tin cập nhật ngay lập tức.
