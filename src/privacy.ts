/** Đồng ý chính sách quyền riêng tư: lưu theo máy (không theo tài khoản). Tăng PRIVACY_VERSION khi nội dung chính sách đổi để hỏi lại. */
export const PRIVACY_KEY = 'hcmut-gpa-privacy-ok';
export const PRIVACY_VERSION = 1;
export const hasAcceptedPrivacy = (): boolean => { try { return Number(localStorage.getItem(PRIVACY_KEY)) === PRIVACY_VERSION; } catch { return false; } };
export const acceptPrivacy = () => { try { localStorage.setItem(PRIVACY_KEY, String(PRIVACY_VERSION)); } catch { /* bỏ qua */ } };

/** Nội dung chính sách (khóa i18n là chính câu tiếng Việt, dịch trong locales/en.ts). Sửa nội dung thì tăng PRIVACY_VERSION. */
export const PRIVACY_SUMMARY = 'Dữ liệu của bạn chỉ nằm trên máy này. BKalc không có máy chủ, không gửi dữ liệu đi đâu, không quảng cáo và không theo dõi hành vi.';
export const PRIVACY_ITEMS = [
  'Dữ liệu mỗi tài khoản được mã hóa bằng mật khẩu của tài khoản đó và lưu trong thư mục %APPDATA%\\HCMUT GPA (tên thư mục cũ của BKalc). Không có đăng ký trực tuyến.',
  'Bảng điểm PDF/ảnh được đọc ngay trên máy, không tải lên đâu cả.',
  'Quên mật khẩu thì không ai khôi phục được, chỉ có thể xóa tài khoản rồi tạo lại hoặc nạp từ file sao lưu.',
  'File sao lưu JSON và file Excel xuất ra không được mã hóa, hãy cất cẩn thận, đừng đăng công khai.',
  'BKalc là công cụ cá nhân, không phải sản phẩm chính thức của Trường ĐH Bách khoa – ĐHQG-HCM; kết quả chỉ để tham khảo.',
];
