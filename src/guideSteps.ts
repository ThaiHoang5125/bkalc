import type { Page } from './App';

/** Tình huống người dùng chọn ở đầu trang Hướng dẫn; quyết định những bước nào hiện ra. */
export type Stage = 'all' | 'first' | 'grades' | 'goal' | 'plan';

export interface Shot { src: string; cap: string }
export interface GuideStep {
  id: string;
  title: string;
  stages: Stage[];
  /** Trang mở bằng nút “Mở trang này →”, kèm chế độ xem con nếu có */
  page?: Page;
  sub?: string;
  /** Các dòng mô tả; `**chữ**` được in đậm */
  lines: string[];
  /** Ảnh chụp theo thứ tự thao tác (public/guide/<src>) */
  shots: Shot[];
  faq?: [string, string][];
}

export const STAGES: [Stage, string][] = [
  ['all', 'Tất cả'],
  ['first', 'Mới dùng lần đầu'],
  ['grades', 'Nhập & xem điểm'],
  ['goal', 'Đặt mục tiêu GPA'],
  ['plan', 'Lên kế hoạch & xếp lịch'],
];

export const STEPS: GuideStep[] = [
  {
    id: 'start', title: 'Bắt đầu nhanh: nhập dữ liệu', stages: ['all', 'first', 'grades', 'goal'], page: 'data', sub: 'data',
    lines: [
      'Vào cổng thông tin sinh viên, tải 2 file PDF: **Bảng điểm** và **Tiến độ học tập**.',
      'Mở **Dữ liệu & cài đặt**, bấm “Chọn file PDF…” (hoặc kéo thả vào khung), xem trước kết quả rồi bấm **Nhập vào ứng dụng**. Nhập một trong hai file cũng được.',
    ],
    shots: [
      { src: 'start-1.png', cap: 'Bấm “Dữ liệu & cài đặt” ① rồi “Chọn file PDF…” ② (hoặc kéo thả file vào khung)' },
    ],
  },
  {
    id: 'overview', title: 'Tổng quan', stages: ['all', 'first', 'grades'], page: 'overview',
    lines: [
      'Khối đầu trang: GPA tích lũy, tín chỉ tích lũy, học lực và xếp loại cuối cùng; bên dưới là môn đang học, môn nên cải thiện và mục tiêu GPA.',
      '**Cần chú ý**: gom các cảnh báo như kế hoạch vượt trần tín chỉ, cảnh báo chuẩn đăng ký, lịch học trùng giờ, nhắc sao lưu (sau 30 ngày). Khung này ẩn khi không có gì cần chú ý.',
      'Biểu đồ GPA từng học kỳ và thẻ “Học kỳ này”.',
    ],
    shots: [
      { src: 'overview-1.png', cap: '① GPA, tín chỉ, học lực ② môn đang học ③ môn nên cải thiện ④ mục tiêu GPA' },
      { src: 'overview-2.png', cap: '① Thẻ “Học kỳ này” ② GPA từng học kỳ (kéo xuống để xem)' },
    ],
  },
  {
    id: 'transcript', title: 'Bảng điểm', stages: ['all', 'grades'], page: 'transcript',
    lines: [
      'Công tắc “Theo học kỳ / Theo nhóm môn”: xem điểm từng học kỳ hoặc tiến độ theo khối kiến thức của chương trình đào tạo (cần file Tiến độ).',
      'Chỉ học kỳ gần nhất được mở sẵn; các học kỳ khác là một dòng tóm tắt, bấm để mở. Ô tìm kiếm và nút “Chỉ môn chưa đạt” giúp lọc nhanh.',
      '**Thêm môn**: gõ mã môn (ví dụ EE3017) thì tên và số tín chỉ tự điền. Để trống điểm nếu đang học.',
      '**Sửa trực tiếp** ngay trong bảng. Điểm nhận số 0–10 hoặc ký hiệu MT, DT, RT, CT, VT, CH, KD, VP, HT. Ô “Không tính” loại môn khỏi GPA và tín chỉ tích lũy; nút × xóa môn.',
    ],
    shots: [
      { src: 'transcript-1.png', cap: '① Xem theo học kỳ hoặc theo nhóm môn ② Tìm môn đã học ③ Chỉ hiện môn chưa đạt' },
      { src: 'transcript-2.png', cap: '① Gõ mã hoặc tên môn, chọn từ danh sách gợi ý ② Bấm “Thêm môn”' },
      { src: 'transcript-3.png', cap: '① Bấm vào điểm để sửa ② Tick “Không tính” để loại môn khỏi GPA ③ Bấm × để xóa môn' },
    ],
  },
  {
    id: 'goals', title: 'Mục tiêu', stages: ['all', 'goal'], page: 'goals',
    lines: [
      '**Điểm cần đạt**: nhập GPA mục tiêu hoặc bấm nhanh Xuất sắc / Giỏi / Khá. App tính điểm trung bình cần đạt cho số tín chỉ còn lại, nhận định mức khó và gợi ý môn nên cải thiện.',
      '**Tính điểm môn đang học**: thêm môn, chọn mẫu thành phần (giữa kỳ/cuối kỳ…), nhập điểm đã có hoặc dự kiến để biết phần còn lại cần bao nhiêu. Đủ điểm thì bấm “Ghi vào bảng điểm”.',
      'Môn đang học trùng mã với môn đã có điểm được tính là học cải thiện: lấy lần điểm cao nhất, tín chỉ không bị cộng hai lần.',
    ],
    shots: [
      { src: 'goals-1.png', cap: '① Chọn nhanh Xuất sắc / Giỏi / Khá (hoặc nhập GPA mục tiêu) ② Điểm trung bình cần đạt cho số tín chỉ còn lại' },
      { src: 'goals-2.png', cap: '① Chuyển sang “Tính điểm môn đang học”, thêm môn rồi nhập điểm thành phần' },
    ],
  },
  {
    id: 'semplan', title: 'Kế hoạch', stages: ['all', 'plan'], page: 'semplan',
    lines: [
      'Kế hoạch tính từ học kỳ đầu của khóa (suy ra từ 2 số đầu của MSSV) đến hết 6 năm học, mỗi năm gồm 2 học kỳ chính và 1 học kỳ hè. Mặc định chỉ mở năm học hiện tại và năm kế tiếp; các năm khác thu gọn thành một dòng, bấm để mở.',
      'Thêm môn vào từng học kỳ, hoặc dùng nút chính “Tự xếp các môn bắt buộc còn lại”; “Xếp toàn bộ theo Chương trình đào tạo” nằm trong menu ⋯. App kiểm tra tiên quyết, học trước, song hành (dòng đỏ) và số tín chỉ tối đa mỗi học kỳ.',
      'Dòng vàng nhỏ dưới môn là cảnh báo chuẩn đăng ký, chỉ hiện khi dữ liệu của bạn cho thấy chắc chắn còn thiếu. Thiếu dữ liệu thì app không cảnh báo.',
    ],
    shots: [
      { src: 'semplan-1.png', cap: '① Bấm “Tự xếp các môn bắt buộc còn lại” ② Menu “Thêm thao tác” có thêm cách xếp khác' },
      { src: 'semplan-2.png', cap: '① Mở từng năm học để xem môn của từng học kỳ; dòng đỏ báo lỗi tiên quyết' },
    ],
  },
  {
    id: 'timetable', title: 'Xếp lịch', stages: ['all', 'plan'], page: 'timetable',
    lines: [
      '**① Nhập dữ liệu**: dán trang kết quả đăng ký từ MyBK (Ctrl+A, Ctrl+C rồi Ctrl+V vào ô, bấm Đọc đoạn chữ), danh sách lớp để đổi lớp hoặc thêm môn, hoặc nhập tay cho môn lẻ.',
      '**② Lịch của tôi**: xem thời khóa biểu theo tuần, xuất file .ics. Bật “Kéo thả đổi lớp”, kéo một môn sang ô khác rồi bấm “Áp dụng” để đổi.',
      '**③ Khung giờ mong muốn**: chọn giờ bắt đầu, kết thúc, ngày muốn nghỉ rồi bấm “Sắp xếp theo khung giờ”: app đề xuất tối đa 5 phương án.',
      'Đợt đăng ký hiện tại hiện ở đầu trang. File kết quả đợt 2 (đang ở đợt 3) đã qua đợt đổi lịch nên trang Xếp lịch bị khóa.',
    ],
    shots: [
      { src: 'timetable-1.png', cap: '① Dán trang kết quả đăng ký từ MyBK ② Bấm “Đọc đoạn chữ”' },
      { src: 'timetable-2.png', cap: '① Bước “Lịch của tôi”: thời khóa biểu theo tuần hiện ở đây sau khi nhập dữ liệu' },
      { src: 'timetable-3.png', cap: '① Bước “Khung giờ mong muốn”: chọn giờ, ngày nghỉ rồi bấm “Sắp xếp theo khung giờ”' },
    ],
  },
  {
    id: 'data', title: 'Dữ liệu & cài đặt', stages: ['all', 'first'], page: 'data', sub: 'settings',
    lines: [
      '**Dữ liệu**: nhập PDF, ảnh chụp màn hình (nhận dạng chữ ngay trên máy, có thể sai vài ô nên hãy xem lại) hoặc dán từ Excel. ① Menu “Thêm thao tác”: nhập/xuất Excel, sao lưu, khôi phục.',
      '**Cài đặt**: chế độ Sáng / Tối / Theo hệ thống, ngôn ngữ, chính sách quyền riêng tư, tổng số tín chỉ chương trình, quy tắc tính điểm và nút xóa toàn bộ dữ liệu.',
      'App không cần tài khoản hay mật khẩu: mở là dùng được. Dữ liệu lưu không mã hóa trên máy này, nên hãy sao lưu (app nhắc sau 30 ngày).',
    ],
    shots: [
      { src: 'data-1.png', cap: '① Menu “Thêm thao tác”: nhập/xuất Excel, sao lưu, khôi phục' },
      { src: 'data-2.png', cap: '① Tab “Cài đặt”: chế độ màu, ngôn ngữ, quyền riêng tư, tổng số tín chỉ' },
    ],
  },
  {
    id: 'faq', title: 'Hỏi đáp nhanh', stages: ['all'],
    lines: [
      '**Quyền riêng tư:** dữ liệu của bạn chỉ nằm trên máy này. App không gửi dữ liệu đi đâu, không quảng cáo, không theo dõi hành vi. Xem đầy đủ ở Dữ liệu & cài đặt → Cài đặt → Quyền riêng tư.',
    ],
    shots: [],
    faq: [
      ['Điểm A+ và A khác gì nhau?', 'Cùng quy đổi 4.0; A+ từ 9,5 điểm trở lên.'],
      ['Học cải thiện có làm GPA giảm không?', 'Không: app lấy lần điểm cao nhất của mỗi môn. Riêng tín chỉ rớt (điểm F) vẫn được cộng cho mỗi lần rớt.'],
      ['Điểm tổng kết làm tròn thế nào?', 'Làm tròn 1 chữ số thập phân (7,95 thành 8,0), sau đó quy ra điểm chữ.'],
      ['Quy tắc hạ bằng 5% ở đâu ra?', 'Đây là quy tắc do người dùng cung cấp khi thiết kế app, không có trong văn bản Quy định học vụ. Hãy đối chiếu quy định mới nhất của trường.'],
      ['Dữ liệu lưu ở đâu?', 'Trên chính máy của bạn, không gửi đi đâu. Nên sao lưu định kỳ ở trang Dữ liệu & cài đặt.'],
    ],
  },
];

/** Các bước của một tình huống, giữ nguyên thứ tự gốc. */
export const stepsFor = (stage: Stage): GuideStep[] => STEPS.filter((s) => s.stages.includes(stage));
