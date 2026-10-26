import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildExcel, readExcel } from '../src/excel';
import { summarize } from '../src/engine';
import type { Attempt } from '../src/engine';

const fx = JSON.parse(readFileSync(new URL('./fixtures/transcript.json', import.meta.url), 'utf8'));
const attempts: Attempt[] = fx.attempts;

describe('Excel sheet "Bảng điểm" theo form của trường', () => {
  it('xuất rồi nhập lại giữ nguyên GPA, tín chỉ, mã môn, nhóm, MT/DT', async () => {
    const buf = await buildExcel(attempts, { name: 'A', id: '1' }, 'highest');
    const back = await readExcel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(back.length).toBe(attempts.length);
    const a = summarize(attempts, 'highest'), b = summarize(back, 'highest');
    expect(b.gpa).toBeCloseTo(a.gpa as number, 6);
    expect(b.passedCredits).toBe(a.passedCredits);
    expect(back.filter((x) => x.special).length).toBe(attempts.filter((x) => x.special).length);
    expect(back.every((x) => x.code && x.semester.startsWith('Năm học'))).toBe(true);
  });
});
