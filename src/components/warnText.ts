import type { PlanWarning } from '../engine';
import { t } from '../i18n';

/** Câu cảnh báo (một dòng) cho một lưu ý chuẩn đăng ký trong Kế hoạch. */
export function warnText(w: PlanWarning): string {
  switch (w.kind) {
    case 'level-credits': return t('Môn mã {n}xxx thường cần ≥ {need} tín chỉ tích lũy (SV_N{n}); đến kỳ này bạn dự kiến có {have}.', { n: w.level, need: w.need, have: w.have });
    case 'level-english': return t('Môn mã {n}xxx thường cần Anh văn 1–{k} (SV_N{n}); bảng điểm chưa thấy đạt {list}.', { n: w.level, k: w.n, list: w.missing.join(', ') });
    case 'level-gdqp': return t('Môn mã {n}xxx thường cần hoàn thành Giáo dục quốc phòng - An ninh (SV_N{n}); bảng điểm chưa thấy đạt MI1003.', { n: w.level });
    case 'level-gdtc': return t('Môn mã {n}xxx thường cần hoàn thành Giáo dục thể chất (SV_N{n}); bảng điểm chưa thấy đạt PE1001 + PE1002 (hoặc CCGDTC).', { n: w.level });
    case 'pct': return t('Chuẩn {std} thường cần tích lũy ≥ {pct}% số tín chỉ chương trình ({need} tín chỉ); đến kỳ này bạn dự kiến có {have}.', { std: w.std, pct: w.pct, need: w.need, have: w.have });
    case 'gpa': return t('Chuẩn {std} thường cần điểm trung bình tích lũy ≥ 2.0; hiện là {gpa}.', { std: w.std, gpa: w.gpa.toFixed(2) });
  }
}
