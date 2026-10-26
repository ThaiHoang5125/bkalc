/** Đồng ý chính sách quyền riêng tư: lưu theo máy (không theo tài khoản). Tăng PRIVACY_VERSION khi nội dung chính sách đổi để hỏi lại. */
export const PRIVACY_KEY = 'hcmut-gpa-privacy-ok';
export const PRIVACY_VERSION = 2;
export const hasAcceptedPrivacy = (): boolean => { try { return Number(localStorage.getItem(PRIVACY_KEY)) === PRIVACY_VERSION; } catch { return false; } };
export const acceptPrivacy = () => { try { localStorage.setItem(PRIVACY_KEY, String(PRIVACY_VERSION)); } catch { /* bỏ qua */ } };

/** Nội dung chính sách (khóa i18n là chính câu tiếng Việt, dịch trong locales/en.ts). Sửa nội dung thì tăng PRIVACY_VERSION. */
export const PRIVACY_SUMMARY = 'Dữ liệu của bạn chỉ nằm trên máy này. BKalc không có máy chủ, không gửi dữ liệu đi đâu, không quảng cáo và không theo dõi hành vi.';
const ITEM_DESKTOP = 'Dữ liệu của mỗi tài khoản được mã hóa bằng mật khẩu của chính tài khoản đó và lưu cục bộ tại thư mục %APPDATA%\\BKalc. BKalc không có chức năng đăng ký trực tuyến.';
const ITEM_WEB = 'Dữ liệu của mỗi tài khoản được mã hóa bằng mật khẩu của chính tài khoản đó và lưu cục bộ trong trình duyệt của bạn. Xóa dữ liệu duyệt web hoặc đổi trình duyệt sẽ làm mất dữ liệu nếu chưa sao lưu. BKalc không có chức năng đăng ký trực tuyến.';

/** Mục 1 phụ thuộc nơi lưu: bản máy tính (Electron) hay bản web (trình duyệt). */
export const privacyItems = (): string[] => [
  typeof window !== 'undefined' && window.gpaApi ? ITEM_DESKTOP : ITEM_WEB,
  'Bảng điểm PDF/ảnh được xử lý hoàn toàn trên thiết bị của bạn và không bao giờ được tải lên máy chủ.',
  'Mật khẩu không thể khôi phục. Nếu quên, bạn chỉ có thể xóa tài khoản rồi tạo lại hoặc nạp dữ liệu từ file sao lưu.',
  'File sao lưu JSON và file Excel xuất ra không được mã hóa. Vui lòng bảo quản cẩn thận và không đăng tải công khai.',
  'BKalc là công cụ cá nhân, không phải sản phẩm chính thức của Trường ĐH Bách khoa – ĐHQG-HCM. Kết quả chỉ mang tính tham khảo.',
];
