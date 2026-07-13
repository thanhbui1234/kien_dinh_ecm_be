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
  - Xóa 2 key tương ứng khi Admin sửa thông số hoặc xóa máy CNC đó.

#### B. Sản phẩm nổi bật (Featured Products)
- **Redis Key:** `products:featured:<skip>:<limit>` (Mặc định: `products:featured:0:10`)
- **Thời gian sống (TTL):** 1 giờ (3600s)
- **Mô tả:** Chuyên phục vụ cho Trang chủ (Home) nơi có Traffic cực lớn. API trả về danh sách các sản phẩm đang được tick `isFeatured = true`.
- **Trigger Hủy Cache (Invalidation):**
  - Quét và xóa toàn bộ các key có tiền tố `products:featured:*` khi Admin bật/tắt cờ `isFeatured` của bất kỳ sản phẩm nào.

---

## 🚀 Các phân hệ CẦN Cache trong Tương lai (Future Tasks)

Dưới đây là danh sách các tính năng/phân hệ cần được thêm vào Redis ở các chặng (Phase) tiếp theo của dự án:

### 1. Phân hệ Cấu hình & Giới thiệu (System Settings)
- **Mô tả:** Các cấu hình siêu tĩnh, Frontend luôn gọi để render Header/Footer.
- **Redis Key đề xuất:** 
  - `system:settings` (Lưu Hotline, Zalo, link Facebook...)
  - `company:about-us` (Gộp data Slogan và Timeline)
- **TTL đề xuất:** Vô hạn (Không tự hết hạn).
- **Invalidation:** Gọi lệnh `del` khi Admin vào CMS sửa nội dung (sửa Hotline, sửa Slogan).

### 2. Phân hệ Tuyển dụng (JobPost)
- **Mô tả:** Danh sách các vị trí tuyển dụng đang mở. Sẽ có lượng truy cập đột biến khi chạy chiến dịch tuyển dụng.
- **Redis Key đề xuất:** `jobs:list:active`
- **TTL đề xuất:** 2-4 tiếng.
- **Invalidation:** Khi Admin mở/đóng một tin tuyển dụng (status = true/false).

### 3. Phân hệ Dự án thực tế (Project / Portfolio)
- **Mô tả:** Các bài viết hình ảnh về những dự án lắp đặt máy CNC đã hoàn thành, thường ít thay đổi nội dung sau khi đã đăng.
- **Redis Key đề xuất:** `projects:recent` (cho danh sách ngoài trang chủ) và `project:detail:<slug>`.
- **TTL đề xuất:** 12 - 24 tiếng.
- **Invalidation:** Tương tự như Product, chỉ xóa khi Admin sửa thông tin hoặc đăng dự án mới.

---

## 🛑 Những dữ liệu TUYỆT ĐỐI KHÔNG Cache (Anti-pattern)

1. **Liên hệ khách hàng (ContactRequest):** 
   - Đây là form Client gửi lên (Write-only). NestJS sẽ lưu thẳng xuống Database và gửi thông báo Telegram/Email. Việc lưu vào Redis không có giá trị gì do Admin luôn cần xem dữ liệu mới nhất (Real-time).
2. **Dữ liệu User / Tài khoản Admin:** 
   - JWT Access Token nằm ở Client Cookie đã có vai trò Cache cho Authorization rồi. Mọi logic phân quyền đọc từ token, không cần gọi DB.
3. **Các tính toán Analytics / Thống kê (ViewCount, Logs):** 
   - View count của sản phẩm có thể cập nhật liên tục (mỗi click). Nếu dùng Redis thì nên dùng dưới dạng *Redis Counter (INCR)* rồi Sync về DB định kỳ bằng CronJob, chứ không nên Cache nguyên cái object sản phẩm chỉ vì cái viewCount.
