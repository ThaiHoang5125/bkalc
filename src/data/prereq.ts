import { t } from '../i18n';

/** Điều kiện đăng ký học phần: TQ tiên quyết, HT học trước, SH song hành, SHT song hành hoặc đã học trước, KN khuyến nghị. */
export type Cond = { op: 'leaf'; kind: string; code: string } | { op: 'AND' | 'OR' | 'LIST'; items: Cond[] };

export const COND_LABEL: Record<string, string> = {
  TQ: 'tiên quyết', HT: 'học trước', SH: 'song hành', SHT: 'song hành hoặc đã học trước', KN: 'khuyến nghị',
};

/** Đọc chuỗi như "AND(TQ[MT1003], OR(KN[EE2031], KN[EE2033]))", "KN[MT1003]" hoặc "LIST(KN[A], SH[B])". */
export function parseCond(s: string): Cond | null {
  const src = s.replace(/\s+/g, '');
  if (!src) return null;
  let i = 0;
  const expr = (): Cond | null => {
    const m = /^(AND|OR|LIST)\(/.exec(src.slice(i));
    if (m) {
      i += m[0].length;
      const items: Cond[] = [];
      while (i < src.length && src[i] !== ')') {
        const c = expr(); if (!c) return null; items.push(c);
        if (src[i] === ',') i++;
      }
      if (src[i] !== ')') return null;
      i++;
      return { op: m[1] as 'AND' | 'OR' | 'LIST', items };
    }
    const l = /^([A-Z]{2,3})\[([A-Z0-9]+)\]/.exec(src.slice(i));
    if (!l) return null;
    i += l[0].length;
    return { op: 'leaf', kind: l[1], code: l[2] };
  };
  const r = expr();
  return r && i === src.length ? r : null;
}

/** Mô tả bằng chữ, dịch theo ngôn ngữ hiện tại. `name` trả tên môn nếu có (để hiện cạnh mã). */
export function describeCond(c: Cond, name?: (code: string) => string | undefined, top = true): string {
  if (c.op === 'leaf') {
    const nm = name?.(c.code);
    return `${c.code}${nm ? ` ${nm}` : ''} (${t(COND_LABEL[c.kind] ?? c.kind)})`;
  }
  const sep = c.op === 'OR' ? ` ${t('hoặc')} ` : c.op === 'AND' ? ` ${t('và')} ` : '; ';
  const body = c.items.map((x) => describeCond(x, name, false)).join(sep);
  return top || c.op === 'LIST' && top ? body : `(${body})`;
}

export function codesOf(c: Cond): string[] {
  return c.op === 'leaf' ? [c.code] : c.items.flatMap(codesOf);
}
