# Chiến Lược Redis Caching (Kien Dinh ECM)

Tài liệu này ghi chú lại ma trận bộ nhớ đệm (Cache) đang được sử dụng trong hệ thống NestJS để tối ưu hóa hiệu năng, giảm tải cho PostgreSQL (NeonDB), và tăng tốc độ phản hồi cho Frontend (Next.js).

---

## ✅ Các phân hệ ĐÃ được Cache (Current Implementation)

### 1. Phân hệ Danh mục (Category)
- **Redis Key:** `categories:flat`
- **Thời gian sống (TTL):** 24 giờ (86400s)
- **Mô tả:** Lưu trữ cấu trúc danh sách phẳng của toàn bộ danh mục sản phẩm. Tránh việc truy vấn cơ sở dữ liệu nhiều lần.
- **Trigger Hủy Cache (Invalidation):**
  - Xóa key khi Admin tạo mới (Create).
  - Xóa key khi Admin sửa đổi tên, đổi thư mục cha, ẩn/hiện (Update).
  - Xóa key khi Admin xóa danh mục (Delete).

### 2. Phân hệ Sản phẩm (Product)
#### A. Chi tiết sản phẩm (Product Detail)
- **Redis Key:** `product:detail:<id>` và `product:detail:<slug>`
- **Thời gian sống (TTL):** 12 giờ (43200s)
- **Mô tả:** Lưu trữ chi tiết một máy CNC (bao gồm `specifications` JSON và bài viết `contentDetail` HTML rất nặng). Frontend có thể gọi qua `:id` hoặc `:slug` đều sẽ hit cache.
- **Trigger Hủy Cache (Invalidation):** 
  - Xóa 2 key tương ứng (theo cả ID và Slug) khi Admin sửa thông số hoặc xóa máy CNC đó.

#### B. Danh sách Sản phẩm (Product List) - *Cache toàn phần (Full-chunk Caching)*
- **Redis Key:** `products:list:<chuỗi_json_của_bộ_lọc>`
- **Thời gian sống (TTL):** 1 giờ (3600s)
- **Mô tả:** Hệ thống sẽ gom tất cả các điều kiện lọc (như trang số mấy, tìm kiếm từ khóa gì, danh mục nào, nổi bật hay không) thành một chuỗi duy nhất để làm Key. Nhờ vậy, **mọi truy vấn danh sách** (dù phức tạp đến đâu) đều được Cache để phản hồi tức thì.
- **Trigger Hủy Cache (Invalidation):**
  - Bất cứ khi nào Admin **Thêm, Sửa (Update), Copy, hoặc Xóa** một sản phẩm bất kỳ, hệ thống sẽ tự động quét và **xóa sạch toàn bộ** các bản Cache danh sách hiện có (`products:list:*`). 

### 3. Phân hệ Cấu hình & Giới thiệu (System Settings)
- **Redis Key:** `system:settings`, `system:company_slogans`, `system:banners`, `about:company_profile`, `about:company_info`, v.v.
- **Thời gian sống (TTL):** 24 giờ (86400s)
- **Mô tả:** Các cấu hình siêu tĩnh, Frontend luôn gọi để render Header/Footer. Dữ liệu được Cache ngay khi có Request đầu tiên.
- **Trigger Hủy Cache (Invalidation):**
  - Tự động xóa key tương ứng khi Admin vào CMS cập nhật nội dung (sửa Hotline, sửa Slogan, thay đổi thông tin giới thiệu).

### 4. Phân hệ Tuyển dụng (JobPost)
- **Redis Key:** `jobs:list:<chuỗi_json_của_bộ_lọc>` và `job:detail:<id>` / `<slug>`
- **Thời gian sống (TTL):** 24 giờ (86400s)
- **Mô tả:** Danh sách các vị trí tuyển dụng đang mở. Sử dụng chiến lược **Cache toàn phần** giống như Sản phẩm.
- **Trigger Hủy Cache (Invalidation):**
  - Khi Admin tạo mới, sửa đổi, hoặc xóa một tin tuyển dụng, hệ thống quét và **xóa sạch toàn bộ** Cache danh sách (`jobs:list:*`) và chi tiết của Job đó.

### 5. Phân hệ Dự án thực tế (Project / Portfolio)
- **Redis Key:** `projects:list:<chuỗi_json_của_bộ_lọc>` và `project:detail:<id>` / `<slug>`
- **Thời gian sống (TTL):** 7 ngày (604800s)
- **Mô tả:** Các bài viết hình ảnh về những dự án lắp đặt máy CNC đã hoàn thành, thường ít thay đổi nội dung sau khi đã đăng. Sử dụng chiến lược **Cache toàn phần**.
- **Trigger Hủy Cache (Invalidation):**
  - Quét và xóa toàn bộ Cache danh sách (`projects:list:*`) và xóa chi tiết dự án tương ứng bất cứ khi nào Admin có thao tác Cập nhật / Xóa.

---

## 🛑 Những dữ liệu TUYỆT ĐỐI KHÔNG Cache (Anti-pattern)

1. **Liên hệ khách hàng (ContactRequest):** 
   - Đây là form Client gửi lên (Write-only). NestJS sẽ lưu thẳng xuống Database và gửi thông báo Telegram/Email. Việc lưu vào Redis không có giá trị gì do Admin luôn cần xem dữ liệu mới nhất (Real-time).
2. **Dữ liệu User / Tài khoản Admin:** 
   - JWT Access Token nằm ở Client Cookie đã có vai trò Cache cho Authorization rồi. Mọi logic phân quyền đọc từ token, không cần gọi DB.
3. **Các tính toán Analytics / Thống kê (ViewCount, Logs):** 
   - View count của sản phẩm có thể cập nhật liên tục (mỗi click). Nếu dùng Redis thì nên dùng dưới dạng *Redis Counter (INCR)* rồi Sync về DB định kỳ bằng CronJob, chứ không nên Cache nguyên cái object sản phẩm chỉ vì cái viewCount.
