# ⚙️ CHUYÊN ĐỀ BẢO MẬT & WORKFLOW KIẾN TRÚC BACKEND (BE)

Tài liệu này chi tiết hóa toàn bộ luồng hoạt động nội bộ (Internal Workflow), cấu trúc dữ liệu Redis/DB và các thuật toán kiểm soát bảo mật phía Backend (NestJS).

---

## 🏗️ 1. CẤU TRÚC DỮ LIỆU & BỘ NHỚ (DATA STRUCTURES)

### A. Database Schema (PostgreSQL via Neon)
Bảng `User` lưu trữ trạng thái cố định:
- `role`: Enum (`SUPER_ADMIN` | `ADMIN`) - Phân quyền hệ thống.
- `isLocked`: Boolean (mặc định `false`) - Đánh dấu tài khoản bị khóa do vi phạm 3 thiết bị.
- `password`: String (Bị ngẫu nhiên hóa bởi `randomUUID()` khi bị khóa).

### B. Bộ nhớ tạm thời (Redis RAM Storage)
Nhằm đảm bảo tốc độ phản hồi microsecond và không làm quá tải Database:
1. **`user_devices:{userId}`** (Kiểu dữ liệu: **Redis Set**)
   - Chuỗi giá trị: `${deviceId}:${fingerprint}`
   - Mục đích: Lưu vĩnh viễn danh sách các thiết bị độc nhất từng đăng nhập.
2. **`user_sessions:{userId}`** (Kiểu dữ liệu: **Redis Hash**)
   - Key: `${sessionId}`, Value: `${timestamp}`
   - Mục đích: Theo dõi các phiên đăng nhập đang hoạt động. Khi bị xóa -> Lập tức vô hiệu hóa JWT Access Token.

---

## 🔄 2. CHI TIẾT WORKFLOW XỬ LÝ (DETAILED SEQUENTIAL FLOWS)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / FE
    participant Guard as JwtAuthGuard
    participant Auth as AuthService
    participant Redis as Redis Service
    participant DB as Postgres Database

    Note over Client, DB: LUỒNG 1: ĐĂNG NHẬP & KIỂM TRA THIẾT BỊ (LOGIN FLOW)
    Client->>Auth: POST /auth/login (email, password, deviceId, fingerprint)
    Auth->>DB: Query User theo email
    DB-->>Auth: Trả về thông tin User
    
    alt Tài khoản bị khóa (isLocked == true)
        Auth-->>Client: Bắn lỗi 401 (ACCOUNT_LOCKED)
    end

    Auth->>Auth: Compare Password (bcrypt)
    
    Auth->>Redis: SMEMBERS user_devices:{userId}
    Redis-->>Auth: Danh sách các thiết bị độc nhất cũ

    alt Thiết bị mới (Chưa từng có trong Set)
        alt Đã tích lũy >= 2 thiết bị cũ (Đây là thiết bị thứ 3)
            Auth->>DB: Lock User (isLocked = true, Randomize Password)
            Auth->>Redis: DEL user_sessions:{userId} (Kick All)
            Auth-->>Client: Bắn lỗi 401 (ACCOUNT_LOCKED - Khóa tự động)
        else Mới chỉ có 0 hoặc 1 thiết bị cũ
            Auth->>Redis: SADD user_devices:{userId} "deviceId:fingerprint"
        end
    end

    Auth->>Auth: Sinh sessionId = randomUUID()
    Auth->>Redis: HSET user_sessions:{userId} sessionId timestamp
    Auth->>Auth: Đóng gói JWT (sub, email, role, sessionId)
    Auth-->>Client: Trả về AccessToken + RefreshToken + UserInfo
```

---

## 🛡️ 3. LUỒNG XÁC THỰC API & KICK TỨC THÌ (GUARD WORKFLOW)

Mọi API được bảo vệ bởi `JwtAuthGuard` sẽ trải qua quy trình kiểm tra 2 lớp:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / FE
    participant Guard as JwtAuthGuard
    participant Strategy as JwtStrategy
    participant Redis as Redis Service
    participant Controller as API Controller

    Client->>Guard: Gửi Request + Bearer AccessToken
    Guard->>Strategy: Passport Validate JWT Token
    Strategy->>Strategy: Verify Chữ ký JWT & Expire Time
    Strategy-->>Guard: Bóc tách payload { userId, role, sessionId }

    Guard->>Redis: HEXISTS user_sessions:{userId} {sessionId}
    Redis-->>Guard: Trả về 1 (Tồn tại) hoặc 0 (Đã bị xóa/Kick)

    alt Session tồn tại (Response = 1)
        Guard->>Controller: Cho phép truy cập Controller API
        Controller-->>Client: Trả về kết quả thành công (200 OK)
    else Session bị Kick hoặc Xóa (Response = 0)
        Guard-->>Client: Bắn lỗi 401 Unauthorized (Phiên bị vô hiệu hóa)
    end
```

---

## 🔓 4. LUỒNG CỨU HỘ & MỞ KHÓA TÀI KHOẢN (SUPER ADMIN UNLOCK WORKFLOW)

Khi một tài khoản bị khóa do thiết bị thứ 3 đột nhập:

```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin as Super Admin
    participant Controller as UsersController
    participant Service as UsersService
    participant Redis as Redis Service
    participant DB as Postgres Database

    SuperAdmin->>Controller: PATCH /api/v1/users/:id/reset-password (newPassword)
    Controller->>Service: Gọi unlockAndResetPassword(userId, hashNewPassword)
    Service->>DB: UPDATE User SET isLocked = false, password = hashNewPassword
    
    Controller->>Redis: DEL user_devices:{userId} (Clear lịch sử thiết bị)
    Controller->>Redis: DEL user_sessions:{userId} (Clear mọi phiên cũ)
    
    Controller-->>SuperAdmin: Báo mở khóa & Reset Hạn ngạch thành công (200 OK)
```

---

## ⚡ 5. TỐI ƯU HIỆU NĂNG & AN TOÀN BỘ NHỚ (PERFORMANCE & OPTIMIZATION)

1. **Không tạoBottleneck cho Database**:
   - `JwtAuthGuard` kiểm tra `sessionId` thông qua lệnh `HEXISTS` trên Redis. Lệnh này có độ phức tạp thuật toán là $O(1)$, phản hồi trong khoảng **< 1 millisecond**, tuyệt đối không đụng đến PostgreSQL DB.
2. **Quản lý TTL (Time-To-Live)**:
   - Các `sessionId` trên Redis được đồng bộ vòng đời với JWT Access Token.
   - Khi Super Admin thực hiện Kick hoặc Reset Password, lệnh `DEL` xóa tức thì các Redis Key giúp giải phóng RAM ngay lập tức.
