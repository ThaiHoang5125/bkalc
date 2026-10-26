# BKalc (HCMUT GPA)

Ứng dụng desktop (Electron + React + TypeScript) tính GPA tích lũy, GPA từng học kỳ, lập kế hoạch đạt GPA mục tiêu và giả lập cải thiện điểm.
Thay thế file Excel "KD Study" bằng bản sửa các lỗi ở công thức gốc (xem mục Khác biệt).

## Chạy
```bash
npm install
npm test            # 64 test, đối chiếu với 37 môn mẫu của file Excel gốc
npm run electron:dev   # terminal 1: npm run dev ; terminal 2: npm run electron:dev
npm run build && npm run electron   # chạy bản đã build
npm run dist:win    # đóng gói Windows → release/
```
Docker (chỉ để build hoặc chạy bản web): xem đầu file `Dockerfile`.

## Nhập dữ liệu từ PDF của trường
Tab **Dữ liệu → Nhập từ PDF**: chọn/kéo thả file **Bảng điểm** và **Tiến độ hoàn thành chương trình đào tạo** (PDF tải từ cổng sinh viên HCMUT).
- File được đọc ngay trên máy (pdf.js), không gửi đi đâu. Chỉ hỗ trợ PDF có chữ, không hỗ trợ ảnh chụp/scan.
- App tự đối chiếu kết quả tính với số liệu in trên form của trường (GPA, tín chỉ tích lũy, điểm chữ, từng học kỳ) và báo khớp/lệch.
- Bộ đọc dựa trên bố cục form hiện tại (toạ độ cột). Nếu trường đổi giao diện form, sửa các hằng số `COL` trong `src/pdf/transcript.ts` và `src/pdf/progress.ts`.

## Cấu trúc
- `src/engine/` — lõi tính toán thuần TypeScript (không phụ thuộc UI): `scale.ts` (thang điểm dạng dữ liệu), `gpa.ts`, `planner.ts`, `program.ts` (tiến độ theo nhóm kiến thức), `verify.ts` (đối chiếu với trường), `importers.ts`.
- `src/pdf/` — đọc PDF: `lines.ts` (ghép chữ theo toạ độ), `transcript.ts`, `progress.ts`, `extract.ts` (pdf.js).
- `src/components/` — các tab giao diện. `electron/` — main + preload (lưu dữ liệu ra `userData/gpa-data.json`).

## Công thức
- GPA = Σ(TC × điểm 4) / Σ TC. Thang (đã đối chiếu Quy định học vụ, Điều 17 & 20): ≥9.5 A+ 4.0 · ≥8.5 A 4.0 · ≥8 B+ 3.5 · ≥7 B 3.0 · ≥6.5 C+ 2.5 · ≥5.5 C 2.0 · ≥5 D+ 1.5 · ≥4 D 1.0 · <4 F 0.
- Mục tiêu: cần điểm TB trên R TC còn lại = (G·(N+R) − S) / R; mỗi cách phối A + mức thấp hơn được tính chính xác và làm tròn lên.

## Điểm đặc biệt và tín chỉ tích lũy
MT (miễn, in là 12) cộng tín chỉ tích lũy nhưng không vào GPA; DT (21) chỉ ghi nhận đạt; RT (rút môn, 17) và các môn "Không tính TCTL & TBTL" không tính. Môn có cả điểm số và MT chỉ tính một lần (ưu tiên điểm số). Môn 0 tín chỉ (GDTC, Sinh hoạt sinh viên...) không ảnh hưởng GPA.

## Khác biệt so với file Excel gốc
Tự suy ra điểm chữ (file gốc để trống nên mọi thống kê D/F = 0); có D+; xử lý học lại/cải thiện không đếm trùng; GPA từng học kỳ; môn loại trừ khỏi GPA; môn F tính vào GPA nhưng không vào TC tích lũy; báo bất khả thi khi mục tiêu > 4.0.

## Cần tự đối chiếu với quy chế trường
Danh sách môn không tính GPA (GDTC, GDQP...) — đánh dấu "Loại trừ" ở tab "Bảng điểm".
