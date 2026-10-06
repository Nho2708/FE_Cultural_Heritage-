import type { OverviewClass, SystemTrendPoint, TrendGranularity } from './api/overview';
import { formatNumber, formatPercent } from './attempts';
import { percentToTen } from './statistics';

// Quy tắc hiển thị của luồng Quản trị và tổng quan: nhãn, tỉ lệ dùng hạn mức, kỳ của biểu đồ theo giờ Việt Nam, sắp xếp lớp.

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

/** Điểm trung bình trên thang 10 ("7,3") từ phần trăm; rỗng khi chưa có lượt nộp. */
export function averageOnTen(percent: number | null | undefined): string {
  return percent === null || percent === undefined ? '' : formatNumber(percentToTen(percent));
}

/** Phần trăm đã dùng của một hạn mức, giữ trong 0 đến 100; null khi không có hạn mức hoặc hạn mức bằng 0. */
export function usagePercent(used: number, max: number | null | undefined): number | null {
  if (max === null || max === undefined || max <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((used / max) * 100)));
}

/** Từ 90% hạn mức trở lên thì báo sắp hết. */
export const NEAR_LIMIT_PERCENT = 90;

export function isNearLimit(used: number, max: number | null | undefined): boolean {
  const percent = usagePercent(used, max);
  return percent !== null && percent >= NEAR_LIMIT_PERCENT;
}

/** Tên lớp để hiện: lớp chưa đặt tên hiện theo khối. */
export function classLabel(c: Pick<OverviewClass, 'className' | 'grade'>): string {
  return c.className?.trim() || `Lớp khối ${c.grade}`;
}

/**
 * Các lớp theo điểm trung bình giảm dần (lớp chưa có lượt nộp xếp cuối, rồi theo tên), tùy chọn lọc theo cấp.
 */
export function sortClassesByAverage(classes: readonly OverviewClass[], level?: number | null): OverviewClass[] {
  return classes
    .filter((c) => !level || c.schoolLevel === level)
    .slice()
    .sort((a, b) => {
      if (a.averagePercent === null && b.averagePercent === null) return classLabel(a).localeCompare(classLabel(b), 'vi');
      if (a.averagePercent === null) return 1;
      if (b.averagePercent === null) return -1;
      return b.averagePercent - a.averagePercent || classLabel(a).localeCompare(classLabel(b), 'vi');
    });
}

/** Ngày `yyyy-MM-dd` theo giờ Việt Nam của một thời điểm. */
export function vietnamDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VIETNAM_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Ngày `yyyy-MM-dd` lùi `days` ngày so với ngày đã cho (không phụ thuộc múi giờ máy). */
export function shiftDay(day: string, days: number): string {
  const match = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return day;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Các khoảng chọn sẵn của biểu đồ (tính đến hôm nay theo giờ Việt Nam). 365 ngày thì máy chủ tự gom theo tháng. */
export const TREND_RANGES = [
  { id: '30', label: '30 ngày gần đây', days: 30 },
  { id: '90', label: '90 ngày gần đây', days: 90 },
  { id: '365', label: '12 tháng gần đây', days: 365 },
] as const;

export type TrendRangeId = (typeof TREND_RANGES)[number]['id'];

/** Khoảng `from` đến `to` (gồm cả hai đầu) cho một khoảng chọn sẵn. */
export function trendRange(id: TrendRangeId, now: Date = new Date()): { from: string; to: string } {
  const days = TREND_RANGES.find((r) => r.id === id)?.days ?? 30;
  const to = vietnamDay(now);
  return { from: shiftDay(to, -(days - 1)), to };
}

/** Số liệu của biểu đồ theo thời gian mà quản trị hệ thống chọn xem. */
export const TREND_METRICS = [
  { id: 'attemptsFinished', label: 'Lượt nộp bài' },
  { id: 'newStudents', label: 'Học sinh mới' },
  { id: 'newTeachers', label: 'Giáo viên mới' },
  { id: 'newSchools', label: 'Trường mới' },
  { id: 'lessonsCreated', label: 'Bài học tạo mới' },
  { id: 'quizzesPublished', label: 'Bài kiểm tra phát hành' },
  { id: 'aiRequests', label: 'Lượt gọi AI' },
] as const satisfies ReadonlyArray<{ id: keyof Omit<SystemTrendPoint, 'period'>; label: string }>;

export type TrendMetricId = (typeof TREND_METRICS)[number]['id'];

/** Nhãn của một kỳ: ngày thành "27/09", tháng thành "09/2026". */
export function trendPeriodLabel(period: string, granularity: TrendGranularity): string {
  if (granularity === 'MONTH') {
    const m = period.match(/^(\d{4})-(\d{2})/);
    return m ? `${m[2]}/${m[1]}` : period;
  }
  const d = period.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return d ? `${d[2]}/${d[1]}` : period;
}

/** Nhãn đầy đủ cho trình đọc màn hình: "ngày 27/09/2026" hoặc "tháng 09/2026". */
export function trendPeriodFull(period: string, granularity: TrendGranularity): string {
  if (granularity === 'MONTH') return `tháng ${trendPeriodLabel(period, 'MONTH')}`;
  const d = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return d ? `ngày ${d[3]}/${d[2]}/${d[1]}` : period;
}

/** Số đếm theo kiểu Việt Nam có dấu chấm nghìn: 3.260. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/** Tỉ lệ đúng của câu hỏi ("25%"); "Chưa có lượt" khi chưa ai làm. */
export function questionRateLabel(percent: number | null | undefined): string {
  return percent === null || percent === undefined ? 'Chưa có lượt' : formatPercent(percent);
}

/** Giá gói theo đồng ("1.990.000 ₫", gói miễn phí "0 ₫"). */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '';
  return `${formatCount(price)} ₫`;
}
