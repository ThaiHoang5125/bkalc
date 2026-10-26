/** Điểm đặc biệt theo chú thích trên bảng điểm HCMUT. */
export type SpecialCode = 'CT' | 'VT' | 'CH' | 'RT' | 'KD' | 'VP' | 'DT' | 'HT' | 'MT';
export type Source = 'manual' | 'paste' | 'excel' | 'transcript' | 'progress';

export interface Attempt {
  id: string;
  /** Mã môn học (EE3017...). Có mã thì học lại/cải thiện được nhận diện theo mã, không theo tên. */
  code?: string;
  name: string;
  /** Có thể bằng 0 (môn Sinh hoạt sinh viên, Bóng đá...) */
  credits: number;
  /** Điểm hệ 10; null = chưa có điểm hoặc điểm đặc biệt */
  score: number | null;
  special?: SpecialCode;
  /** Điểm chữ in trên form của trường (dùng để đối chiếu thang điểm, giao diện vẫn tự tính từ điểm số) */
  officialLetter?: string;
  /** Nhãn học kỳ, dạng "Năm học 2025 - 2026 / Học kỳ 2" hoặc tự đặt */
  semester: string;
  /** Nhóm lớp (L04, DL06...) */
  group?: string;
  note?: string;
  /** Không tính vào GPA / tín chỉ tích lũy (GDTC, GDQP, "Không tính TCTL & TBTL"...) */
  excluded?: boolean;
  source?: Source;
  /** Điểm thành phần của môn đang học (giữa kỳ, thí nghiệm, cuối kỳ...) để tính điểm cần đạt */
  components?: Component[];
  /** Môn đang học được tính vào GPA tích lũy chung khi giả định đạt mức điểm mong muốn */
  inCumulative?: boolean;
  /** Mức điểm chữ mong muốn dùng cho phần cộng dồn (mặc định B) */
  goal?: string;
  /** Cách lấy điểm khi cộng dồn: theo mức chữ (mặc định), theo trung bình các thành phần đã nhập, hoặc điểm tự nhập */
  goalMode?: 'letter' | 'components' | 'score';
  /** Điểm hệ 10 tự nhập khi goalMode = 'score' */
  goalScore?: number;
}

export interface Component {
  id: string;
  name: string;
  /** Trọng số, % (tổng các thành phần của một môn = 100) */
  weight: number;
  /** Điểm đã có (hệ 10); null = chưa có */
  score: number | null;
  /** Điểm dự kiến cho thành phần chưa có điểm (để xem phần còn lại cần bao nhiêu) */
  planned?: number | null;
}

export interface GradeBand {
  min: number; // điểm 10 tối thiểu (>=)
  letter: string;
  point: number; // thang 4
  passed: boolean;
}

export type RetakePolicy = 'highest' | 'latest' | 'all';

export interface Settings {
  totalCredits: number;
  targetGpa: number;
  retakePolicy: RetakePolicy;
}

export interface Student {
  name?: string;
  id?: string;
  className?: string;
  major?: string;
  faculty?: string;
  appliedYear?: string;
  transcriptUpdated?: string;
  progressUpdated?: string;
}

export interface OfficialSemester {
  semester: string;
  cumGpa: number;
  cumCredits: number;
  semGpa?: number;
  semCredits?: number;
}

/** Số liệu chính thức in trên form của trường, dùng để đối chiếu với kết quả app tính. */
export interface Official {
  gpa4?: number;
  avg10?: number;
  credits?: number;
  totalCredits?: number;
  semesters?: OfficialSemester[];
}

export interface ProgramCourse { code: string; name: string; credits: number }
export interface ProgramGroup {
  name: string;
  kind: 'required' | 'elective';
  required: number;
  /** Tín chỉ đã đạt theo form của trường (x trong "x/y") */
  officialEarned?: number;
  /** Nhóm tự chọn tự do / bổ sung: nhận phần dư của nhóm tự chọn và môn ngoài chương trình */
  free?: boolean;
  courses: ProgramCourse[];
}
export interface Program { groups: ProgramGroup[] }

export interface AppData {
  version: 2;
  attempts: Attempt[];
  settings: Settings;
  student?: Student;
  program?: Program;
  official?: Official;
  /** Kế hoạch 15 học kỳ sắp tới */
  plan?: import('./semplan').PlanData;
  /** Thời khóa biểu và danh sách lớp để xếp lịch */
  timetable?: import('./timetable').TimetableData;
  /** Các chuẩn của trường (đăng ký môn, tốt nghiệp): loại chương trình và mục tự xác nhận */
  standards?: import('./standards').StandardsData;
  /** Khóa (mã môn) các môn ngoài chương trình đào tạo mà sinh viên chọn tính vào nhóm Tự chọn tự do */
  freeCourses?: string[];
}

export interface Classification {
  label: string;
  min: number;
}
