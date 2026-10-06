import type { MasteryLevel, QuizStudentStatus } from './api';

// Thống kê của giáo viên: nhãn và mức màu dùng chung cho các bảng, thanh tỉ lệ và bảng nhiệt. Ngưỡng trùng với máy chủ:
// từ 80% là Thành thạo, từ 50% tới dưới 80% là Đạt, dưới 50% là Cần ôn, dưới 3 câu đã trả lời là Chưa đủ dữ liệu.

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  MASTERED: 'Thành thạo',
  FAIR: 'Đạt',
  NEEDS_REVIEW: 'Cần ôn',
  INSUFFICIENT_DATA: 'Chưa đủ dữ liệu',
};

export type MasteryTone = 'good' | 'fair' | 'weak' | 'none';

export const MASTERY_TONE: Record<MasteryLevel, MasteryTone> = {
  MASTERED: 'good',
  FAIR: 'fair',
  NEEDS_REVIEW: 'weak',
  INSUFFICIENT_DATA: 'none',
};

/** Số câu tối thiểu để kết luận mức thành thạo. */
export const MIN_ANSWERS_FOR_MASTERY = 3;

/** Mức thành thạo từ tỉ lệ đúng (phần trăm) và số câu đã trả lời. */
export function masteryOf(ratePercent: number | null | undefined, answered: number): MasteryLevel {
  if (ratePercent === null || ratePercent === undefined || answered < MIN_ANSWERS_FOR_MASTERY) return 'INSUFFICIENT_DATA';
  if (ratePercent >= 80) return 'MASTERED';
  if (ratePercent >= 50) return 'FAIR';
  return 'NEEDS_REVIEW';
}

/** Câu có tỉ lệ đúng dưới 50% được tô cảnh báo ở tab Từng câu. */
export const LOW_RATE_PERCENT = 50;

export const QUIZ_STUDENT_STATUS_LABEL: Record<QuizStudentStatus, string> = {
  SUBMITTED: 'Đã nộp',
  EXPIRED: 'Hết giờ, tự nộp',
  IN_PROGRESS: 'Đang làm',
  NOT_STARTED: 'Chưa làm',
};

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export const QUIZ_STUDENT_STATUS_TONE: Record<QuizStudentStatus, StatusTone> = {
  SUBMITTED: 'success',
  EXPIRED: 'warning',
  IN_PROGRESS: 'danger',
  NOT_STARTED: 'neutral',
};

/** Lượt đã có điểm (đã nộp hoặc hết giờ tự nộp). */
export function isFinishedStatus(status: QuizStudentStatus): boolean {
  return status === 'SUBMITTED' || status === 'EXPIRED';
}

/** Điểm trên thang 10 từ phần trăm, làm tròn một chữ số thập phân (biểu đồ điểm theo thời gian). */
export function percentToTen(percent: number): number {
  return Math.round(percent) / 10;
}

/** Khoảng thời gian của tab Gợi ý: số ngày gần đây, hoặc không giới hạn. */
export const SUGGESTION_RANGES = [
  { id: '30', label: '30 ngày gần đây', days: 30 },
  { id: '7', label: '7 ngày gần đây', days: 7 },
  { id: '90', label: '90 ngày gần đây', days: 90 },
  { id: 'all', label: 'Từ đầu đến nay', days: null },
] as const;

export type SuggestionRangeId = (typeof SUGGESTION_RANGES)[number]['id'];

/** Mốc bắt đầu (ISO 8601 UTC) của khoảng thời gian; null là không giới hạn. */
export function rangeFrom(id: SuggestionRangeId, now: Date = new Date()): string | undefined {
  const days = SUGGESTION_RANGES.find((r) => r.id === id)?.days;
  if (!days) return undefined;
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}
