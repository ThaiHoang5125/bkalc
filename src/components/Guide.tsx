import type { ReactNode } from 'react';
import { t } from '../i18n';
import type { Go, Page } from '../App';
import { PageHeader } from './ui';

function Section({ id, title, page, sub, go, children }: { id: string; title: string; page?: Page; sub?: string; go: Go; children: ReactNode }) {
  return (
    <section className="card guide" id={`g-${id}`}>
      <div className="head-row"><h3>{title}</h3>{page && <button className="ghost" onClick={() => go(page, sub)}>{t('Mở trang này →')}</button>}</div>
      {children}
    </section>
  );
}

const Steps = ({ children }: { children: ReactNode }) => <ol className="gsteps">{children}</ol>;

export function Guide({ go }: { go: Go }) {
  const jump = (id: string) => document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const toc: [string, string][] = [['start', t('Bắt đầu nhanh')], ['overview', t('Tổng quan')], ['transcript', t('Bảng điểm')], ['goals', t('Mục tiêu')], ['semplan', t('Kế hoạch')], ['timetable', t('Xếp lịch')], ['data', t('Dữ liệu & cài đặt')], ['faq', t('Hỏi đáp')]];
  return (
    <div className="stack">
      <PageHeader title={t('Hướng dẫn sử dụng')} sub={t('Ứng dụng giúp sinh viên tính GPA, theo dõi tiến độ chương trình đào tạo, lên kế hoạch học kỳ và xếp thời khóa biểu. Mọi dữ liệu chỉ nằm trên máy của bạn.')} />
      <div className="card guidetoc">
        <span className="muted small">{t('Chọn mục cần xem:')}</span>
        <div className="chips">{toc.map(([id, label]) => <button key={id} className="chip btn" onClick={() => jump(id)}>{label}</button>)}</div>
      </div>

      <Section id="start" title={t('Bắt đầu nhanh (3 bước)')} page="data" sub="data" go={go}>
        <ol className="bigsteps">
          <li><b>{t('Tải 2 file PDF')}</b><span>{t('Vào cổng thông tin sinh viên, tải')} <b>{t('Bảng điểm')}</b> {t('và')} <b>{t('Tiến độ học tập')}</b>.</span></li>
          <li><b>{t('Nhập vào ứng dụng')}</b><span>{t('Mở')} <b>{t('Dữ liệu & cài đặt')}</b>{t(', bấm “Chọn file PDF…” (hoặc kéo thả vào khung), xem trước kết quả rồi bấm')} <b>{t('Nhập vào ứng dụng')}</b>{t('. Nhập một trong hai file cũng được.')}</span></li>
          <li><b>{t('Xem kết quả')}</b><span>{t('Xem')} <b>{t('Tổng quan')}</b>{t('. Muốn biết cần cố gắng bao nhiêu thì sang')} <b>{t('Mục tiêu')}</b>{t('; muốn lên kế hoạch các kỳ tới thì sang')} <b>{t('Kế hoạch')}</b>.</span></li>
        </ol>
        <p className="muted small">{t('Mỗi trang có nút ↶ ↷ ở góc phải trên để hoàn tác / làm lại (hoặc Ctrl+Z / Ctrl+Y). Thao tác thành công hiện thông báo nhỏ ở cuối màn hình, có nút “Hoàn tác” trong vài giây.')}</p>
      </Section>

      <Section id="overview" title={t('Tổng quan')} page="overview" go={go}>
        <Steps>
          <li>{t('Bốn thẻ trên cùng: GPA tích lũy và xếp loại, tín chỉ đã tích lũy, môn đang học, mục tiêu GPA.')}</li>
          <li><b>{t('Cần chú ý')}</b>{t(': gom các cảnh báo như kế hoạch vượt trần tín chỉ, cảnh báo chuẩn đăng ký, lịch học trùng giờ, nhắc sao lưu (sau 30 ngày). Mỗi dòng có liên kết tới trang cần xử lý; khung này ẩn khi không có gì cần chú ý.')}</li>
          <li>{t('Biểu đồ GPA từng học kỳ và thẻ “Học kỳ này”.')}</li>
        </Steps>
      </Section>

      <Section id="transcript" title={t('Bảng điểm')} page="transcript" go={go}>
        <Steps>
          <li>{t('Công tắc “Theo học kỳ / Theo nhóm môn”: xem điểm từng học kỳ hoặc tiến độ theo khối kiến thức của chương trình đào tạo (cần file Tiến độ).')}</li>
          <li>{t('Chỉ học kỳ gần nhất được mở sẵn; các học kỳ khác là một dòng tóm tắt, bấm để mở. Ô tìm kiếm và nút “Chỉ môn chưa đạt” giúp lọc nhanh.')}</li>
          <li><b>{t('Thêm môn')}</b>{t(': gõ mã môn (ví dụ EE3017) thì tên và số tín chỉ tự điền. Để trống điểm nếu đang học.')}</li>
          <li><b>{t('Sửa trực tiếp')}</b> {t('mã, tên, điểm, tín chỉ, ghi chú ngay trong bảng. Điểm nhận số 0–10 hoặc ký hiệu MT, DT, RT, CT, VT, CH, KD, VP, HT. Ô')} <b>∅</b> {t('loại môn khỏi GPA và tín chỉ tích lũy; nút')} <b>×</b> {t('xóa môn.')}</li>
        </Steps>
      </Section>

      <Section id="goals" title={t('Mục tiêu')} page="goals" go={go}>
        <Steps>
          <li><b>{t('Điểm cần đạt')}</b>{t(': nhập GPA mục tiêu hoặc bấm nhanh Xuất sắc / Giỏi / Khá. App tính điểm trung bình cần đạt cho số tín chỉ còn lại, nhận định mức khó và gợi ý môn nên cải thiện. Thẻ xét miễn Anh văn (VSTEP / VNU-EPT) và danh sách môn tự chọn tự do nằm ở Bảng điểm → Theo nhóm môn.')}</li>
          <li><b>{t('Tính điểm môn đang học')}</b>{t(': thêm môn, chọn mẫu thành phần (giữa kỳ/cuối kỳ…), nhập điểm đã có hoặc dự kiến để biết phần còn lại cần bao nhiêu. Có thành phần 0 điểm thì môn rớt (F). Đủ điểm thì bấm “Ghi vào bảng điểm”.')}</li>
          <li>{t('Môn đang học trùng mã với môn đã có điểm được tính là học cải thiện: lấy lần điểm cao nhất, tín chỉ không bị cộng hai lần.')}</li>
        </Steps>
      </Section>

      <Section id="semplan" title={t('Kế hoạch')} page="semplan" go={go}>
        <Steps>
          <li>{t('Kế hoạch tính từ học kỳ đầu của khóa (suy ra từ 2 số đầu của MSSV) đến hết 6 năm học, mỗi năm gồm 2 học kỳ chính và 1 học kỳ hè. Mặc định chỉ mở năm học hiện tại và năm kế tiếp; các năm khác thu gọn thành một dòng, bấm để mở.')}</li>
          <li>{t('Thêm môn vào từng học kỳ, hoặc dùng nút chính “Tự xếp các môn bắt buộc còn lại”; “Xếp toàn bộ theo Chương trình đào tạo” nằm trong menu ⋯. App kiểm tra tiên quyết, học trước, song hành (dòng đỏ) và số tín chỉ tối đa mỗi học kỳ.')}</li>
          <li>{t('Dòng vàng nhỏ dưới môn là cảnh báo chuẩn đăng ký, chỉ hiện khi dữ liệu của bạn cho thấy chắc chắn còn thiếu: môn mã 2xxx/3xxx/4xxx cần đủ tín chỉ tích lũy dự kiến (28/56/56) và Anh văn, GDQP, GDTC; thực tập ngoài trường cần ≥ 65% tín chỉ chương trình; đồ án cần ≥ 70% (Đồ án 2) và GPA ≥ 2,0. Thiếu dữ liệu thì app không cảnh báo.')}</li>
        </Steps>
      </Section>

      <Section id="timetable" title={t('Xếp lịch')} page="timetable" go={go}>
        <Steps>
          <li><b>{t('① Nhập dữ liệu')}</b>{t(': dán trang kết quả đăng ký từ MyBK (Ctrl+A, Ctrl+C rồi Ctrl+V vào ô, bấm Đọc đoạn chữ), danh sách lớp để đổi lớp hoặc thêm môn (dán chữ chính xác nhất, hoặc ảnh chụp màn hình), hoặc nhập tay cho môn lẻ.')}</li>
          <li><b>{t('② Lịch của tôi')}</b>{t(': xem thời khóa biểu theo tuần, xuất file .ics (chọn ngày thứ Hai của tuần học đầu tiên). Bật “Kéo thả đổi lớp”, kéo một môn sang ô khác: khung bên phải liệt kê các lớp phù hợp (Phù hợp / Trùng môn khác / Đã đầy); bấm “Áp dụng” để đổi. Cũng ở bước này có “Đổi một môn” và “Thêm môn”.')}</li>
          <li><b>{t('③ Khung giờ mong muốn')}</b>{t(': chọn giờ bắt đầu, kết thúc, ngày muốn nghỉ rồi bấm “Sắp xếp theo khung giờ”: app đề xuất tối đa 5 phương án, ưu tiên đúng khung giờ rồi đến ít môn phải đổi nhất.')}</li>
          <li>{t('Đợt đăng ký hiện tại hiện ở đầu trang. File kết quả đợt 2 (đang ở đợt 3) đã qua đợt đổi lịch nên trang Xếp lịch bị khóa.')}</li>
        </Steps>
      </Section>

      <Section id="data" title={t('Dữ liệu & cài đặt')} page="data" sub="data" go={go}>
        <Steps>
          <li><b>{t('Dữ liệu')}</b>{t(': nhập PDF, ảnh chụp màn hình (nhận dạng chữ ngay trên máy, có thể sai vài ô nên hãy xem lại) hoặc dán từ Excel. Menu ⋯ có nhập/xuất Excel, sao lưu và khôi phục.')}</li>
          <li><b>{t('Cài đặt')}</b>{t(': chế độ Sáng / Tối / Theo hệ thống (có nút chuyển nhanh ở dưới thanh bên), ngôn ngữ, chính sách quyền riêng tư, tổng số tín chỉ chương trình, quy tắc tính điểm và nút xóa toàn bộ dữ liệu.')}</li>
          <li>{t('App không cần tài khoản hay mật khẩu: mở là dùng được. Dữ liệu lưu không mã hóa trên máy này, nên hãy sao lưu (app nhắc sau 30 ngày).')}</li>
        </Steps>
        <p className="warnbox"><b>{t('Quyền riêng tư:')}</b> {t('dữ liệu của bạn chỉ nằm trên máy này. App không gửi dữ liệu đi đâu, không quảng cáo, không theo dõi hành vi. Xem đầy đủ ở Dữ liệu & cài đặt → Cài đặt → Quyền riêng tư.')}</p>
      </Section>

      <Section id="faq" title={t('Hỏi đáp nhanh')} go={go}>
        <dl className="faq">
          <dt>{t('Điểm A+ và A khác gì nhau?')}</dt><dd>{t('Cùng quy đổi 4.0; A+ từ 9,5 điểm trở lên.')}</dd>
          <dt>{t('Học cải thiện có làm GPA giảm không?')}</dt><dd>{t('Không: app lấy lần điểm cao nhất của mỗi môn. Riêng tín chỉ rớt (điểm F) vẫn được cộng cho mỗi lần rớt.')}</dd>
          <dt>{t('Điểm tổng kết làm tròn thế nào?')}</dt><dd>{t('Làm tròn 1 chữ số thập phân (7,95 thành 8,0), sau đó quy ra điểm chữ.')}</dd>
          <dt>{t('Quy tắc hạ bằng 5% ở đâu ra?')}</dt><dd>{t('Đây là quy tắc do người dùng cung cấp khi thiết kế app, không có trong văn bản Quy định học vụ. Hãy đối chiếu quy định mới nhất của trường.')}</dd>
          <dt>{t('Dữ liệu lưu ở đâu?')}</dt><dd>{t('Trên chính máy của bạn, không gửi đi đâu. Nên sao lưu định kỳ ở trang Dữ liệu & cài đặt.')}</dd>
        </dl>
      </Section>
    </div>
  );
}
