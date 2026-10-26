/**
 * Phím mũi tên di chuyển giữa các nút cùng nhóm, dùng chung cho cả app (gắn một lần ở App):
 *  - thanh bên, menu (role="menu"), danh sách gợi ý (.quicklist): ↑ ↓ (Home / End: đầu / cuối)
 *  - nhóm nút chọn chế độ (.seg, role="radiogroup" / "tablist"): ← → và đồng thời chọn nút đó
 * Chỉ tác động khi tiêu điểm đang ở một nút, nên không ảnh hưởng việc gõ trong ô nhập.
 */
const GROUPS: { sel: string; prev: string; next: string; choose: boolean }[] = [
  { sel: '.side', prev: 'ArrowUp', next: 'ArrowDown', choose: false },
  { sel: '[role="menu"]', prev: 'ArrowUp', next: 'ArrowDown', choose: false },
  { sel: '.quicklist', prev: 'ArrowUp', next: 'ArrowDown', choose: false },
  { sel: '.seg, [role="radiogroup"], [role="tablist"]', prev: 'ArrowLeft', next: 'ArrowRight', choose: true },
];

export function arrowNav(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  const el = e.target as HTMLElement | null;
  if (!el || !(el instanceof HTMLButtonElement)) return;
  for (const g of GROUPS) {
    const box = el.closest<HTMLElement>(g.sel);
    if (!box) continue;
    const items = [...box.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && b.offsetParent !== null);
    const i = items.indexOf(el);
    if (i < 0) continue;
    let to = -1;
    if (e.key === g.next) to = (i + 1) % items.length;
    else if (e.key === g.prev) to = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = items.length - 1;
    if (to < 0) continue;
    e.preventDefault();
    items[to].focus();
    if (g.choose && items[to].getAttribute('aria-pressed') !== 'true') items[to].click();
    return;
  }
}
