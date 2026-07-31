# 📘 HƯỚNG DẪN TÍCH HỢP BẢO MẬT & ĐỊNH DANH THIẾT BỊ CHO FRONTEND (FE)

Tài liệu này dành cho Developer Frontend (React / Next.js) để tích hợp hệ thống **Định danh thiết bị lai (Hybrid Device Fingerprinting)** và **Giới hạn 3 thiết bị (Anti-Account-Sharing)** với Backend.

---

## 🛠️ 1. CÀI ĐẶT THƯ VIỆN & CHUẨN BỊ TRÊN FRONTEND

### Bước 1: Cài đặt thư viện FingerprintJS
```bash
npm install @fingerprintjs/fingerprintjs
# hoặc
pnpm add @fingerprintjs/fingerprintjs
```

### Bước 2: Tạo Helper lấy `deviceId` và `fingerprint` (`src/lib/device-id.ts`)
```ts
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceInfo {
  deviceId: string;
  fingerprint: string;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  // 1. Lấy hoặc tạo UUID trong localStorage (Định danh theo Browser)
  let deviceId = localStorage.getItem('app_device_uuid');
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `uuid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('app_device_uuid', deviceId);
  }

  // 2. Lấy Vân tay phần cứng Canvas/WebGL qua FingerprintJS (Định danh theo Phần cứng)
  let fingerprint = 'unknown_fp';
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    fingerprint = result.visitorId;
  } catch (error) {
    console.error('Failed to load FingerprintJS:', error);
  }

  return {
    deviceId,
    fingerprint,
  };
}
```

---

## 🔑 2. TÍCH HỢP VÀO TRANG ĐĂNG NHẬP (LOGIN PAGE)

Khi người dùng nhấn nút **"Đăng nhập"**, FE cần đính kèm 2 tham số `deviceId` và `fingerprint` vào Body gửi sang Backend:

```ts
import { getDeviceInfo } from '@/lib/device-id';

async function handleLogin(email, password) {
  const deviceInfo = await getDeviceInfo();

  const payload = {
    email,
    password,
    deviceId: deviceInfo.deviceId,         // VD: "uuid_12345678"
    fingerprint: deviceInfo.fingerprint,   // VD: "a8f9c2d1e3b4"
  };

  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Xử lý thông báo lỗi (VD: Tài khoản bị khóa do quá 3 thiết bị)
      alert(data.message || 'Đăng nhập thất bại!');
      return;
    }

    // Đăng nhập thành công -> Lưu AccessToken và điều hướng
    localStorage.setItem('accessToken', data.accessToken);
    window.location.href = '/dashboard';
  } catch (err) {
    console.error('Login error:', err);
  }
}
```

---

## 🚨 3. XỬ LÝ CÁC MÃ LỖI TỪ BACKEND (ERROR CODES)

Khi API bị lỗi (Response `status >= 400`), Backend sẽ luôn trả về Cấu trúc JSON chuẩn dạng:

```json
{
  "success": false,
  "statusCode": 401,
  "errorCode": "ACCOUNT_LOCKED",
  "message": "Tài khoản vi phạm đăng nhập quá 3 thiết bị độc nhất...",
  "timestamp": "2026-07-31T02:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### Bảng Mã Lỗi (Error Codes) Phân Biệt Cho FE:

| Status Code | `errorCode` | Ý Nghĩa / Nguyên Nhân | Hành Động Gợi Ý Cho FE |
| :--- | :--- | :--- | :--- |
| **401** | `ACCOUNT_LOCKED` | Tài khoản đã bị khóa do dính **thiết bị độc nhất thứ 3**! | Hiển thị Modal/Popup thông báo: *"Tài khoản của bạn đã bị khóa do đăng nhập ở quá 3 thiết bị. Vui lòng liên hệ Super Admin để mở khóa!"* |
| **401** | `SESSION_REVOKED` | Phiên đăng nhập đã bị Super Admin **Kick** hoặc bị vô hiệu hóa! | Xóa Token trong localStorage, ngắt kết nối và chuyển hướng người dùng về `/login?reason=kicked`. |
| **401** | `INVALID_CREDENTIALS` | Mật khẩu hoặc Email không chính xác. | Hiển thị dòng thông báo đỏ dưới form: *"Email hoặc mật khẩu không đúng!"*. |
| **401** | `UNAUTHORIZED` | Token hết hạn hoặc không hợp lệ. | Tự động gọi API `/auth/refresh` hoặc chuyển về trang `/login`. |
| **403** | `FORBIDDEN_RESOURCE` | Người dùng không đủ quyền (VD: Admin thường đòi xóa Super Admin). | Báo lỗi Toast: *"Bạn không có quyền thực hiện thao tác này!"*. |

---

## ⚡ 4. LUỒNG XỬ LÝ KICK TỨC THÌ (INTERCEPTOR API)

Trong axios/fetch interceptor của FE, khi nhận được response **401 Unauthorized** từ bất kỳ API nào:

```ts
// Axios Interceptor Example
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Xóa Token và đẩy về Login
      localStorage.removeItem('accessToken');
      window.location.href = '/login?reason=kicked';
    }
    return Promise.reject(error);
  }
);
```

---

## 🔓 5. DÀNH CHO SUPER ADMIN: MỞ KHÓA TÀI KHOẢN (RESET PASS)

Khi 1 tài khoản bị khóa do vượt 3 thiết bị, Super Admin vào trang Quản trị chọn **"Reset Mật khẩu & Mở khóa"**:
- API: `PATCH /api/v1/users/:userId/reset-password`
- Body: `{ "newPassword": "PasswordMoi123!@#" }`
- **Kết quả:** Backend tự động xóa cờ `isLocked`, đổi pass mới, và **xóa sạch lịch sử 3 thiết bị cũ** trên Redis để User có thể dùng lại như mới.
