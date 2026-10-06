import { describe, expect, it } from 'vitest';
import type { OverviewClass } from './api/overview';
import {
  averageOnTen,
  classLabel,
  formatCount,
  formatPrice,
  isNearLimit,
  questionRateLabel,
  shiftDay,
  sortClassesByAverage,
  trendPeriodFull,
  trendPeriodLabel,
  trendRange,
  usagePercent,
  vietnamDay,
} from './overview';

const classOf = (id: number, name: string | null, avg: number | null, level: 1 | 2 | 3 = 2): OverviewClass => ({
  classId: id,
  className: name,
  grade: 6,
  schoolLevel: level,
  schoolLevelName: `Cấp ${level}`,
  schoolYear: '2026-2027',
  activeStudents: 30,
  finishedAttempts: avg === null ? 0 : 10,
  averagePercent: avg,
});

describe('điểm trung bình và hạn mức', () => {
  it('đổi phần trăm sang thang 10 kiểu Việt Nam; chưa có lượt thì để trống', () => {
    expect(averageOnTen(73)).toBe('7,3');
    expect(averageOnTen(100)).toBe('10');
    expect(averageOnTen(null)).toBe('');
  });

  it('tỉ lệ dùng hạn mức giữ trong 0 đến 100, không có hạn mức thì null', () => {
    expect(usagePercent(468, 500)).toBe(94);
    expect(usagePercent(600, 500)).toBe(100);
    expect(usagePercent(5, null)).toBeNull();
    expect(usagePercent(5, 0)).toBeNull();
    expect(isNearLimit(468, 500)).toBe(true);
    expect(isNearLimit(100, 500)).toBe(false);
    expect(isNearLimit(10, null)).toBe(false);
  });
});

describe('sắp xếp lớp', () => {
  it('điểm cao trước, lớp chưa có lượt nộp cuối cùng, lọc được theo cấp', () => {
    const classes = [classOf(1, '6A2', 75), classOf(2, '6A1', 82), classOf(3, '7A1', null), classOf(4, '1A', 90, 1)];
    expect(sortClassesByAverage(classes).map((c) => c.classId)).toEqual([4, 2, 1, 3]);
    expect(sortClassesByAverage(classes, 2).map((c) => c.classId)).toEqual([2, 1, 3]);
    expect(sortClassesByAverage(classes, 3)).toEqual([]);
  });

  it('lớp chưa đặt tên hiện theo khối', () => {
    expect(classLabel({ className: ' ', grade: 7 })).toBe('Lớp khối 7');
    expect(classLabel({ className: '7A1', grade: 7 })).toBe('7A1');
  });
});

describe('kỳ của biểu đồ theo giờ Việt Nam', () => {
  it('ngày Việt Nam đi trước UTC bảy giờ', () => {
    expect(vietnamDay(new Date('2026-10-06T18:30:00Z'))).toBe('2026-10-07');
    expect(vietnamDay(new Date('2026-10-06T16:30:00Z'))).toBe('2026-10-06');
  });

  it('lùi ngày qua tháng và năm', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('khoảng chọn sẵn gồm cả hai đầu', () => {
    const now = new Date('2026-10-07T03:00:00Z');
    expect(trendRange('30', now)).toEqual({ from: '2026-09-08', to: '2026-10-07' });
    expect(trendRange('365', now)).toEqual({ from: '2025-10-08', to: '2026-10-07' });
  });

  it('nhãn kỳ theo ngày và theo tháng', () => {
    expect(trendPeriodLabel('2026-09-27', 'DAY')).toBe('27/09');
    expect(trendPeriodLabel('2026-09', 'MONTH')).toBe('09/2026');
    expect(trendPeriodFull('2026-09-27', 'DAY')).toBe('ngày 27/09/2026');
    expect(trendPeriodFull('2026-09', 'MONTH')).toBe('tháng 09/2026');
  });
});

describe('định dạng', () => {
  it('số đếm, giá gói và tỉ lệ đúng', () => {
    expect(formatCount(3260)).toBe('3.260');
    expect(formatPrice(1990000)).toBe('1.990.000 ₫');
    expect(formatPrice(0)).toBe('0 ₫');
    expect(questionRateLabel(null)).toBe('Chưa có lượt');
    expect(questionRateLabel(25)).toBe('25%');
  });
});
