import { describe, expect, it } from 'vitest';
import { isFinishedStatus, masteryOf, percentToTen, rangeFrom } from './statistics';

describe('mức thành thạo', () => {
  it('theo ngưỡng 80% và 50%, dưới 3 câu là chưa đủ dữ liệu', () => {
    expect(masteryOf(80, 3)).toBe('MASTERED');
    expect(masteryOf(79.9, 10)).toBe('FAIR');
    expect(masteryOf(50, 10)).toBe('FAIR');
    expect(masteryOf(49, 10)).toBe('NEEDS_REVIEW');
    expect(masteryOf(100, 2)).toBe('INSUFFICIENT_DATA');
    expect(masteryOf(null, 9)).toBe('INSUFFICIENT_DATA');
  });
});

describe('trạng thái và điểm', () => {
  it('chỉ đã nộp và hết giờ tự nộp là đã có điểm', () => {
    expect(isFinishedStatus('SUBMITTED')).toBe(true);
    expect(isFinishedStatus('EXPIRED')).toBe(true);
    expect(isFinishedStatus('IN_PROGRESS')).toBe(false);
    expect(isFinishedStatus('NOT_STARTED')).toBe(false);
  });

  it('phần trăm đổi sang thang 10', () => {
    expect(percentToTen(75)).toBe(7.5);
    expect(percentToTen(100)).toBe(10);
  });
});

describe('khoảng thời gian gợi ý', () => {
  it('lùi đúng số ngày về đầu ngày UTC; "từ đầu đến nay" không có mốc', () => {
    const now = new Date('2026-10-07T05:30:00Z');
    expect(rangeFrom('30', now)).toBe('2026-09-07T00:00:00.000Z');
    expect(rangeFrom('7', now)).toBe('2026-09-30T00:00:00.000Z');
    expect(rangeFrom('all', now)).toBeUndefined();
  });
});
