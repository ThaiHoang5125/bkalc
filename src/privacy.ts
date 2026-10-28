/** Nội dung chính sách (khóa i18n là chính câu tiếng Việt, dịch trong locales/en.ts). */
export const PRIVACY_SUMMARY = 'Dữ liệu của bạn chỉ nằm trên máy này. BKalc không có máy chủ, không gửi dữ liệu đi đâu, không quảng cáo và không theo dõi hành vi.';
const SUMMARY_WEB = 'Dữ liệu học tập của bạn chỉ nằm trên máy này và không bao giờ được gửi đi. Bản web chỉ gửi một tín hiệu ẩn danh “đang mở trang” (mã ngẫu nhiên, không IP, không danh tính) để tác giả đếm số người truy cập; BKalc không quảng cáo và không theo dõi hành vi cá nhân.';
const ITEM_DESKTOP = 'Dữ liệu được lưu cục bộ tại thư mục %APPDATA%\\BKalc, không mã hóa và không cần tài khoản hay mật khẩu. Ai dùng được máy và thư mục này đều đọc được điểm của bạn. BKalc không có chức năng đăng ký trực tuyến.';
const ITEM_WEB = 'Dữ liệu được lưu cục bộ trong trình duyệt của bạn, không mã hóa và không cần tài khoản hay mật khẩu. Ai dùng chung trình duyệt này đều xem được điểm của bạn. Xóa dữ liệu duyệt web hoặc đổi trình duyệt sẽ làm mất dữ liệu nếu chưa sao lưu. BKalc không có chức năng đăng ký trực tuyến.';

/** Tóm tắt phụ thuộc bản chạy: .exe hoàn toàn offline, bản web có tín hiệu đếm truy cập ẩn danh. */
export const privacySummary = (): string => (typeof window !== 'undefined' && window.gpaApi ? PRIVACY_SUMMARY : SUMMARY_WEB);

/** Mục 1 phụ thuộc nơi lưu: bản máy tính (Electron) hay bản web (trình duyệt). */
export const privacyItems = (): string[] => [
  typeof window !== 'undefined' && window.gpaApi ? ITEM_DESKTOP : ITEM_WEB,
  'Bảng điểm PDF/ảnh được xử lý hoàn toàn trên thiết bị của bạn và không bao giờ được tải lên máy chủ.',
  'File sao lưu JSON và file Excel xuất ra không được mã hóa. Vui lòng bảo quản cẩn thận và không đăng tải công khai.',
  'BKalc là công cụ cá nhân, không phải sản phẩm chính thức của Trường ĐH Bách khoa – ĐHQG-HCM. Kết quả chỉ mang tính tham khảo.',
];
