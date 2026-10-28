import { BUCKET_S, RANGES, STEPS, UUID_RE, bucketStart, downsample, fillGaps } from '../src/stats';

describe('stats: ô 5 phút', () => {
  it('bucketStart làm tròn xuống ranh giới 5 phút', () => {
    expect(bucketStart(0)).toBe(0);
    expect(bucketStart(299)).toBe(0);
    expect(bucketStart(300)).toBe(300);
    expect(bucketStart(1_000_000_123)).toBe(1_000_000_123 - (1_000_000_123 % 300));
  });

  it('fillGaps: mỗi ô một điểm, ô trống = 0, giữ peak có sẵn', () => {
    const out = fillGaps([{ ts: 600, peak: 3 }], 290, 905);
    expect(out.map((p) => p.ts)).toEqual([0, 300, 600, 900]);
    expect(out.map((p) => p.peak)).toEqual([0, 0, 3, 0]);
  });

  it('fillGaps: số điểm đúng cho 24h / 7d / 30d', () => {
    const to = 10_000_000;
    for (const k of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
      const n = fillGaps([], to - RANGES[k], to).length;
      expect(n).toBeGreaterThanOrEqual(RANGES[k] / BUCKET_S);
      expect(n).toBeLessThanOrEqual(RANGES[k] / BUCKET_S + 1);
    }
  });

  it('downsample: gom theo bước và lấy peak lớn nhất', () => {
    const pts = [{ ts: 0, peak: 1 }, { ts: 300, peak: 5 }, { ts: 3600, peak: 2 }, { ts: 3900, peak: 0 }];
    expect(downsample(pts, 3600)).toEqual([{ ts: 0, peak: 5 }, { ts: 3600, peak: 2 }]);
    expect(downsample(pts, BUCKET_S)).toEqual(pts);
  });

  it('bước vẽ là bội của ô 5 phút', () => {
    for (const s of Object.values(STEPS)) expect(s % BUCKET_S).toBe(0);
  });

  it('UUID_RE chỉ nhận UUID', () => {
    expect(UUID_RE.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(UUID_RE.test('abc')).toBe(false);
    expect(UUID_RE.test("123e4567-e89b-12d3-a456-426614174000'; DROP")).toBe(false);
  });
});
