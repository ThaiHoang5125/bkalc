import { t } from '../i18n';

/** Ba đợt đăng ký học phần của trường (do người dùng cung cấp). */
export function RoundsInfo({ bare }: { bare?: boolean } = {}) {
  const inner = (
    <>
      <div className="rounds">
        <div><b>{t('Đợt 1 · Đăng ký số lượng')}</b><p className="small muted">{t('Chọn các môn sẽ học trong học kỳ (chưa chọn lịch). Dùng kế hoạch ở trang này để biết nên đăng ký môn nào.')}</p></div>
        <div><b>{t('Đợt 2 · Đăng ký thời gian')}</b><p className="small muted">{t('Chọn lớp, khung giờ; có thể đổi lịch học. Đây là lúc dùng trang “Xếp lịch” để đổi lớp và sắp xếp lại các môn.')}</p></div>
        <div><b>{t('Đợt 3 · Bổ sung')}</b><p className="small muted">{t('Chỉ được thêm môn mới, không đổi và không xóa môn đã đăng ký. Trang “Xếp lịch” chỉ gợi ý lớp còn trống giờ để thêm.')}</p></div>
      </div>
    </>
  );
  return bare ? inner : <div className="card"><h3>{t('3 đợt đăng ký môn học')}</h3>{inner}</div>;
}
