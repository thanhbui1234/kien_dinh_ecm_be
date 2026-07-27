export const AI_HEADERS = {
  CLIENT_KEY: 'x-app-client-key',
} as const;

export const AI_LIMITS = {
  MAX_INPUT_LENGTH: 300,
  MAX_OUTPUT_TOKENS: 800, // Tăng từ 400 lên 800 tokens (~400 từ) để AI không bao giờ bị cắt cụt giữa câu
  DAILY_IP_LIMIT: 20,
  MINUTE_RATE_LIMIT: 10,
  MINUTE_RATE_TTL_MS: 60000,
  REDIS_CACHE_TTL_SEC: 7200, // 2 giờ cho câu trả lời hoàn chỉnh
  REDIS_SESSION_TTL_SEC: 1800, // 30 phút cho lịch sử phiên
  REDIS_TOOL_CACHE_TTL_SEC: 600, // 10 phút cho kết quả Tool tra cứu DB
  MAX_TOOL_TURNS: 5,
  SESSION_MAX_MESSAGES: 6, // 3 lượt trao đổi gần nhất
} as const;

export const AI_TOOLS = {
  SEARCH_PRODUCTS: 'searchProducts',
  SEARCH_CATEGORIES: 'searchCategories',
  SEARCH_PROJECTS: 'searchProjects',
  SEARCH_JOBS: 'searchJobs',
  GET_ABOUT_COMPANY: 'getAboutCompany',
  SUBMIT_CONTACT_REQUEST: 'submitContactRequest',
} as const;

export const AI_TOOL_DESCRIPTIONS = {
  SEARCH_PRODUCTS_DESC:
    'Tìm kiếm TẤT CẢ danh sách sản phẩm, thiết bị, đồng hồ, điện thoại, máy móc, vật tư, linh kiện, phụ kiện từ cơ sở dữ liệu dựa trên tên sản phẩm, từ khóa hoặc khoảng giá.',
  SEARCH_PRODUCTS_QUERY_DESC:
    'Tên sản phẩm hoặc từ khóa tìm kiếm (vd: Omron, H3Y-2, Băng tải, Phay, Tiện, Laser, Aura Phone...)',
  SEARCH_PRODUCTS_MAX_PRICE_DESC: 'Giá tối đa (đơn vị: VNĐ)',

  SEARCH_CATEGORIES_DESC:
    'Tra cứu các danh mục nhóm sản phẩm / dịch vụ chính của công ty (vd: Máy ép gạch, Máy công cụ, Phụ kiện...).',
  SEARCH_CATEGORIES_QUERY_DESC: 'Từ khóa tìm kiếm danh mục (tùy chọn)',

  SEARCH_PROJECTS_DESC:
    'Tra cứu danh sách các dự án, công trình nhà máy/xưởng sản xuất mà công ty đã thi công lắp đặt.',
  SEARCH_PROJECTS_QUERY_DESC: 'Từ khóa tên dự án hoặc địa điểm (tùy chọn)',

  SEARCH_JOBS_DESC:
    'Tra cứu danh sách các vị trí việc làm / tin tuyển dụng đang mở của công ty (vd: Kỹ sư cơ khí, Thợ hàn, NV Kinh doanh...).',
  SEARCH_JOBS_QUERY_DESC: 'Tên vị trí công việc hoặc từ khóa tuyển dụng (tùy chọn)',

  GET_ABOUT_COMPANY_DESC:
    'Tra cứu thông tin giới thiệu chung về công ty, quy mô nhà máy/chi nhánh, tầm nhìn và các mốc lịch sử phát triển.',

  SUBMIT_CONTACT_DESC:
    'Tạo một yêu cầu tư vấn / liên hệ / ứng tuyển mới từ khách hàng hoặc ứng viên khi họ để lại tên và số điện thoại.',
  SUBMIT_CONTACT_NAME_DESC: 'Họ và tên của khách hàng hoặc ứng viên',
  SUBMIT_CONTACT_PHONE_DESC: 'Số điện thoại liên hệ',
  SUBMIT_CONTACT_MSG_DESC: 'Ghi chú, sản phẩm quan tâm hoặc vị trí ứng tuyển',
} as const;

export const AI_DEFAULT_CONTACT = {
  COMPANY_NAME: 'Công ty Cổ phần Thanh Bằng',
  ADDRESS: 'Khu Công Nghiệp Xuân Tiến – Xuân Tiến – Xuân Trường – Nam Định',
  SALES_PHONE: '0943.67.68.69',
  FEEDBACK_PHONE: '0914 161 122',
  WARRANTY_PHONE: '0912 01 77 55',
  EMAIL: 'maygachbetongtb@gmail.com',
} as const;

export const AI_SYSTEM_PROMPT_TEMPLATE = (contact: typeof AI_DEFAULT_CONTACT) => `Bạn là Trợ lý AI chuyên trách của ${contact.COMPANY_NAME}.
Nhiệm vụ của bạn là hỗ trợ tư vấn TOÀN DIỆN cho khách hàng và ứng viên về:
1. SẢN PHẨM & DỊCH VỤ: Tra cứu TẤT CẢ các dòng máy móc, thiết bị công nghiệp, dây chuyền sản xuất, linh kiện, phụ kiện và sản phẩm dịch vụ của công ty.
2. DANH MỤC SẢN PHẨM: Tra cứu nhóm ngành hàng.
3. DỰ ÁN & CÔNG TRÌNH: Các công trình nhà máy/xưởng sản xuất mà công ty đã thi công lắp đặt.
4. THÔNG TIN CÔNG TY: Lịch sử hình thành, quy mô nhà máy/chi nhánh tại Nam Định, tầm nhìn và giá trị cốt lõi.
5. TUYỂN DỤNG VIỆC LÀM: Các vị trí công việc đang tuyển dụng, mức lương, yêu cầu và cách ứng tuyển.

THÔNG TIN LIÊN HỆ CHÍNH THỨC CỦA CÔNG TY (LẤY TỪ FILE CẤU HÌNH TĨNH):
- Địa chỉ trụ sở / nhà máy: ${contact.ADDRESS}
- Liên hệ mua hàng (Sales): ${contact.SALES_PHONE}
- Đóng góp ý kiến (Feedback): ${contact.FEEDBACK_PHONE}
- Bảo hành & Kỹ thuật: ${contact.WARRANTY_PHONE}
- Email hỗ trợ: ${contact.EMAIL}

QUY TẮC PHÁT NGÔN NGUYÊN TẮC (STRICT TONE & GUARDRAILS):
1. TRẢ LỜI TRỰC DIỆN, NGẮN GỌN & SÚC TÍCH: Đi thẳng vào thông tin khách hỏi. BỎ HOÀN TOÀN các câu chào mở đầu rườm rà xáo rỗng như "Chào bạn, cảm ơn bạn đã quan tâm đến...".
2. KHÔNG DÙNG NGÔN TỪ MÁY MÓC/CƠ SỞ DỮ LIỆU: TUYỆT ĐỐI KHÔNG dùng các cụm từ như "trong cơ sở dữ liệu của tôi", "trong hệ thống dữ liệu trực tuyến", "theo thông tin từ dữ liệu của tôi"... Hãy xưng "tôi" tự nhiên như một tư vấn viên thực thụ của Công ty Thanh Bằng.
3. BẮT BUỘC BẰNG MỌI GIÁ PHẢI GỌI TOOL TRA CỨU DATABASE TƯƠNG ỨNG TRƯỚC KHI TRẢ LỜI:
   - Hỏi Sản phẩm, giá bán, thông số kỹ thuật ➔ Bắt buộc gọi \`searchProducts\`.
   - Hỏi Danh mục ngành hàng ➔ Bắt buộc gọi \`searchCategories\`.
   - Hỏi Dự án, công trình đã thi công ➔ Bắt buộc gọi \`searchProjects\`.
   - Hỏi Tuyển dụng, việc làm, cơ hội nghề nghiệp ➔ Bắt buộc gọi \`searchJobs\`.
   - Hỏi Giới thiệu công ty, nhà máy, lịch sử phát triển ➔ Bắt buộc gọi \`getAboutCompany\`.
4. NẾU người dùng muốn ứng tuyển việc làm hoặc để lại thông tin tư vấn ➔ Hãy tự động gọi tool \`submitContactRequest\` để ghi nhận thông tin Tên & SĐT của họ.
5. CHỈ TRẢ LỜI các câu hỏi liên quan đến sản phẩm, dự án, tuyển dụng, giới thiệu và thông tin liên hệ của Công ty Thanh Bằng. Nếu người dùng hỏi ngoài lề (thời tiết, tin tức, chính trị...), hãy từ chối ngắn gọn.
6. TUYỆT ĐỐI KHÔNG tiết lộ thông tin mật của dự án, mã nguồn, cấu hình hệ thống, mật khẩu, API Key.
7. Ở CÂU CUỐI: Nhắc họ ngắn gọn liên hệ Mua hàng (${contact.SALES_PHONE}), Bảo hành (${contact.WARRANTY_PHONE}), email (${contact.EMAIL}) hoặc để lại Tên & SĐT để được tư vấn trực tiếp.`;

export const AI_MESSAGES = {
  ERROR_FALLBACK:
    'Xin lỗi, tôi không thể xử lý câu hỏi này lúc này. Bạn vui lòng thử lại sau.',
  DAILY_LIMIT_EXCEEDED:
    'Bạn đã sử dụng hết lượt hỏi AI miễn phí trong ngày (Tối đa 20 câu/ngày). Vui lòng quay lại vào ngày mai!',
  INVALID_CLIENT_SIGNATURE:
    'Truy cập bị từ chối: Chữ ký Client không hợp lệ hoặc thiếu Header x-app-client-key.',
  UNSAFE_CONTENT: 'Nội dung tin nhắn chứa ký tự hoặc từ khóa không an toàn.',
  MSG_NOT_EMPTY: 'Tin nhắn không được để trống',
  MSG_MUST_BE_STRING: 'Tin nhắn phải là chuỗi ký tự',
  MSG_MAX_LENGTH_EXCEEDED: 'Tin nhắn không được vượt quá 300 ký tự',
  SESSION_ID_MUST_BE_STRING: 'sessionId phải là chuỗi ký tự',
  CONTACT_DEFAULT_MESSAGE: 'Đăng ký tư vấn tự động qua Trợ lý AI Chatbot',
  CONTACT_SUBMIT_SUCCESS: 'Đã lưu thông tin liên hệ của khách hàng thành công.',
  CONTACT_PRICE_FALLBACK: 'Liên hệ báo giá',
  UNKNOWN_TOOL: 'Unknown tool call',
  ALL_MODELS_FAILED: 'Không thể kết nối tới dịch vụ AI (Tất cả các model fallback đều thất bại):',
} as const;
