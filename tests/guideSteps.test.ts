import { describe, expect, it } from 'vitest';
import { STAGES, STEPS, stepsFor } from '../src/guideSteps';

describe('guideSteps', () => {
  it('"Tất cả" có đủ mọi bước theo thứ tự gốc', () => {
    expect(stepsFor('all').map((s) => s.id)).toEqual(STEPS.map((s) => s.id));
  });

  it('mỗi tình huống có ít nhất một bước và là tập con của "Tất cả"', () => {
    const all = stepsFor('all').map((s) => s.id);
    for (const [stage] of STAGES) {
      const ids = stepsFor(stage).map((s) => s.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.every((id) => all.includes(id))).toBe(true);
      expect(ids).toEqual(all.filter((id) => ids.includes(id)));
    }
  });

  it('mỗi bước có tiêu đề, nội dung và id không trùng', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    for (const s of STEPS) {
      expect(s.title).not.toBe('');
      expect(s.lines.length + (s.faq?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('tình huống theo nhu cầu đúng bước', () => {
    expect(stepsFor('goal').map((s) => s.id)).toEqual(['start', 'goals']);
    expect(stepsFor('plan').map((s) => s.id)).toEqual(['semplan', 'timetable']);
    expect(stepsFor('first').map((s) => s.id)).toEqual(['start', 'overview', 'data']);
  });
});
