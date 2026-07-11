/**
 * Application-wide messages for consistency and i18n support.
 */
export const AppMessages = {
  // Validation Messages
  VALIDATION: {
    IS_EMAIL: 'Định dạng email không hợp lệ.',
    IS_NOT_EMPTY: 'Trường này không được để trống.',
    MIN_LENGTH: (min: number) => `Vui lòng nhập ít nhất ${min} ký tự.`,
  },

  // Auth Messages
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công.',
    LOGIN_FAILED: 'Email hoặc mật khẩu không chính xác.',
    USER_NOT_FOUND: 'Tài khoản không tồn tại trong hệ thống.',
    INVALID_CREDENTIALS: 'Mật khẩu không chính xác.',
    UNAUTHORIZED_OR_EXPIRED: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.',
    INVALID_REFRESH_TOKEN: 'Refresh token không hợp lệ hoặc đã bị thu hồi.',
    LOGOUT_SUCCESS: 'Đăng xuất thành công.',
    PROFILE_NOT_FOUND: 'Không tìm thấy thông tin tài khoản.',
  },

  // Upload Messages
  UPLOAD: {
    FILE_NOT_FOUND: 'Không tìm thấy file tải lên.',
    INVALID_FORMAT: 'Chỉ chấp nhận file định dạng hình ảnh.',
    BG_REMOVAL_ERROR: 'Lỗi khi xử lý xóa phông hình ảnh.',
    CLOUDINARY_ERROR: 'Lỗi khi tải ảnh lên Cloudinary: ',
  },

  // Database / System Messages
  SYSTEM: {
    INTERNAL_SERVER_ERROR: 'Lỗi hệ thống nội bộ, vui lòng thử lại sau.',
    RECORD_NOT_FOUND: 'Không tìm thấy bản ghi dữ liệu yêu cầu.',
    FOREIGN_KEY_VIOLATION: 'Tham chiếu dữ liệu không hợp lệ (Lỗi khóa ngoại).',
    UNIQUE_CONSTRAINT: (field: string) => `Trùng lặp dữ liệu: Trường '${field}' đã tồn tại.`,
  }
};
