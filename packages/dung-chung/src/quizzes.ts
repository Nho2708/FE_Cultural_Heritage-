import type { QuestionDifficulty } from './api/questions';
import type { CreateQuizBody, QuizDetail, QuizOpenState, QuizStatus, TimeLimitRule, UpdateQuizBody } from './api/quizzes';
import { formatDateTime, parseVietnameseDate } from './format';
import { MESSAGES } from './messages';

// Logic thuần của luồng Bài kiểm tra: nhãn, giới hạn khớp máy chủ (QuizRules), điểm theo bước 0,25, giờ Việt Nam nhập tay,
// trạng thái biểu mẫu soạn và đổi qua lại với nội dung gửi lên. Máy chủ vẫn là nơi kiểm cuối cùng (cấp của lớp, trạng thái bài).

export const QUIZ_STATUS_LABEL: Record<QuizStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đang phát hành',
  CLOSED: 'Đã đóng',
};

export const QUIZ_STATUSES: readonly QuizStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED'];

export const QUIZ_OPEN_STATE_LABEL: Record<QuizOpenState, string> = {
  NONE: '',
  NOT_OPEN: 'Chưa tới giờ mở',
  OPEN: 'Đang nhận bài',
  ENDED: 'Đã hết hạn nhận bài',
};

/** Giới hạn khớp máy chủ (QuizRules). */
export const QUIZ_LIMITS = {
  nameMaxLength: 255,
  descriptionMaxLength: 4000,
  minQuestions: 1,
  maxQuestions: 50,
  minPoint: 0.25,
  maxPoint: 100,
  pointStep: 0.25,
  timeLimitMin: 1,
  timeLimitMax: 180,
} as const;

// ---- Điểm ----

/** Điểm hợp lệ: lớn hơn 0, không quá 100, theo bước 0,25. */
export function isValidPoint(value: number): boolean {
  if (!Number.isFinite(value) || value <= 0 || value > QUIZ_LIMITS.maxPoint) return false;
  const steps = value / QUIZ_LIMITS.pointStep;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/** Điểm người dùng gõ ("2", "0,25", "1.5") sang số; null khi không phải số. */
export function parsePoint(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Điểm hiển thị kiểu Việt: 2, 0,25, 1,5. */
export function formatPoint(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** "10 điểm", "0,5 điểm". */
export function formatPoints(value: number): string {
  return `${formatPoint(value)} điểm`;
}

export const POINT_RULE_TEXT = 'Điểm lớn hơn 0, không quá 100, theo bước 0,25.';

/** Tổng điểm của các câu, làm tròn theo bước 0,25 nên không sai số. */
export function sumPoints(items: ReadonlyArray<{ point: number }>): number {
  return Math.round(items.reduce((total, item) => total + item.point, 0) * 100) / 100;
}

// ---- Thời gian làm theo cấp của lớp ----

export function timeLimitRuleOf(level: number): TimeLimitRule {
  return level === 1 ? 'NOT_ALLOWED' : level === 2 ? 'OPTIONAL' : 'REQUIRED';
}

/** Gợi ý dưới ô thời gian làm theo cấp. */
export function timeLimitHint(level: number): string {
  if (level === 1) return 'Lớp cấp 1 làm bài không giới hạn thời gian; ô này bị khóa.';
  if (level === 2) return 'Lớp cấp 2: tùy chọn, để trống là không giới hạn.';
  return 'Lớp cấp 3: bắt buộc nhập khi phát hành (1-180 phút).';
}

export const TIME_LIMIT_REQUIRED_TEXT = 'Lớp cấp 3 bắt buộc nhập thời gian làm.';

/** "15 phút" hoặc "không giới hạn". */
export function timeLimitLabel(minutes: number | null | undefined): string {
  return minutes ? `${minutes} phút` : 'không giới hạn';
}

// ---- Giờ Việt Nam nhập tay (dạng 07:00 06/10/2026) ----

/** Mốc ISO sang chữ trong ô nhập: 07:00 06/10/2026 (giờ Việt Nam); trống nếu không có giờ. */
export function formatDateTimeInput(iso: string | null | undefined): string {
  return formatDateTime(iso);
}

/**
 * Chữ người dùng gõ ("07:00 06/10/2026", "7:5 6/10/2026") sang mốc ISO có độ lệch +07:00; null nếu sai dạng hoặc không
 * có ngày giờ đó. Không dùng ô chọn ngày giờ của trình duyệt vì trình duyệt tiếng Anh hiện dạng tháng/ngày/năm.
 */
export function parseDateTimeInput(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2}\/\d{1,2}\/\d{4})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const day = parseVietnameseDate(match[3]!);
  if (!day) return null;
  return `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`;
}

// ---- Biểu mẫu thiết lập ----

export interface QuizDraft {
  name: string;
  description: string;
  difficultyLevel: QuestionDifficulty | '';
  /** Số phút, dạng chữ trong ô nhập. */
  timeLimitMinutes: string;
  /** Giờ mở, dạng chữ trong ô nhập (07:00 06/10/2026). */
  openAt: string;
  closeAt: string;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
}

export type QuizDraftField = 'name' | 'description' | 'timeLimitMinutes' | 'openAt' | 'closeAt';
export type QuizDraftErrors = Partial<Record<QuizDraftField, string>>;

export function emptyQuizDraft(name = ''): QuizDraft {
  return {
    name,
    description: '',
    difficultyLevel: '',
    timeLimitMinutes: '',
    openAt: '',
    closeAt: '',
    shuffleQuestions: false,
    showAnswersAfterSubmit: false,
  };
}

export function draftFromQuiz(quiz: QuizDetail): QuizDraft {
  return {
    name: quiz.name ?? '',
    description: quiz.description ?? '',
    difficultyLevel: quiz.difficultyLevel ?? '',
    timeLimitMinutes: quiz.timeLimitMinutes === null ? '' : String(quiz.timeLimitMinutes),
    openAt: formatDateTimeInput(quiz.openAt),
    closeAt: formatDateTimeInput(quiz.closeAt),
    shuffleQuestions: quiz.shuffleQuestions,
    showAnswersAfterSubmit: quiz.showAnswersAfterSubmit,
  };
}

/** Số phút trong ô: null khi trống; NaN khi không phải số nguyên. */
function minutesOf(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/**
 * Kiểm thiết lập trước khi gửi. `forPublish` thêm điều kiện phát hành (đủ giờ mở, giờ đóng, cấp 3 có thời gian làm); khi soạn
 * thì giờ và thời gian làm cấp 3 được để trống. Cấp 1 không được nhập thời gian làm.
 */
export function validateQuizDraft(draft: QuizDraft, level: number, options: { forPublish?: boolean } = {}): QuizDraftErrors {
  const errors: QuizDraftErrors = {};
  const name = draft.name.trim();
  if (name === '') errors.name = MESSAGES.required('tên bài kiểm tra');
  else if (name.length > QUIZ_LIMITS.nameMaxLength) errors.name = MESSAGES.invalid('Tên bài kiểm tra', `tối đa ${QUIZ_LIMITS.nameMaxLength} ký tự`);
  if (draft.description.trim().length > QUIZ_LIMITS.descriptionMaxLength) {
    errors.description = MESSAGES.invalid('Mô tả', `tối đa ${QUIZ_LIMITS.descriptionMaxLength} ký tự`);
  }

  const minutes = minutesOf(draft.timeLimitMinutes);
  if (level === 1) {
    if (minutes !== null) errors.timeLimitMinutes = 'Lớp cấp 1 làm bài không giới hạn thời gian nên không nhập thời gian làm.';
  } else if (minutes !== null) {
    if (Number.isNaN(minutes) || minutes < QUIZ_LIMITS.timeLimitMin || minutes > QUIZ_LIMITS.timeLimitMax) {
      errors.timeLimitMinutes = MESSAGES.invalid('Thời gian làm bài', `từ ${QUIZ_LIMITS.timeLimitMin} đến ${QUIZ_LIMITS.timeLimitMax} phút`);
    }
  } else if (level === 3 && options.forPublish) {
    errors.timeLimitMinutes = TIME_LIMIT_REQUIRED_TEXT;
  }

  const open = draft.openAt.trim() === '' ? null : parseDateTimeInput(draft.openAt);
  const close = draft.closeAt.trim() === '' ? null : parseDateTimeInput(draft.closeAt);
  const timeFormat = 'Giờ viết theo dạng giờ:phút ngày/tháng/năm, ví dụ 07:00 06/10/2026.';
  if (draft.openAt.trim() !== '' && open === null) errors.openAt = timeFormat;
  if (draft.closeAt.trim() !== '' && close === null) errors.closeAt = timeFormat;
  if (options.forPublish) {
    if (draft.openAt.trim() === '') errors.openAt = MESSAGES.required('giờ mở');
    if (draft.closeAt.trim() === '') errors.closeAt = MESSAGES.required('giờ đóng');
  }
  if (open && close && Date.parse(open) >= Date.parse(close)) errors.closeAt = 'Giờ đóng phải sau giờ mở.';
  return errors;
}

/**
 * Nội dung lưu thiết lập: gửi đủ mọi trường. Ô giờ giữ nguyên chữ như lúc tải thì gửi lại đúng mốc cũ của máy chủ (bài đã phát
 * hành bắt gửi lại nguyên giá trị các trường khóa, không được lệch vì làm tròn giây).
 */
export function quizDraftToBody(draft: QuizDraft, original?: Pick<QuizDetail, 'openAt' | 'closeAt'>): UpdateQuizBody {
  const timeOf = (text: string, originalIso: string | null | undefined) => {
    if (text.trim() === '') return null;
    if (originalIso && formatDateTimeInput(originalIso) === text.trim()) return originalIso;
    return parseDateTimeInput(text);
  };
  const minutes = minutesOf(draft.timeLimitMinutes);
  return {
    name: draft.name.trim(),
    description: draft.description.trim() === '' ? null : draft.description.trim(),
    difficultyLevel: draft.difficultyLevel === '' ? null : draft.difficultyLevel,
    timeLimitMinutes: minutes === null || Number.isNaN(minutes) ? null : minutes,
    openAt: timeOf(draft.openAt, original?.openAt),
    closeAt: timeOf(draft.closeAt, original?.closeAt),
    shuffleQuestions: draft.shuffleQuestions,
    showAnswersAfterSubmit: draft.showAnswersAfterSubmit,
  };
}

/** Nội dung tạo bài nháp từ hộp thoại: chỉ cần bài học và tên. */
export function createQuizBody(lessonId: number, name: string): CreateQuizBody {
  return { lessonId, name: name.trim() };
}

export function sameQuizDraft(a: QuizDraft, b: QuizDraft): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.difficultyLevel === b.difficultyLevel &&
    a.timeLimitMinutes === b.timeLimitMinutes &&
    a.openAt === b.openAt &&
    a.closeAt === b.closeAt &&
    a.shuffleQuestions === b.shuffleQuestions &&
    a.showAnswersAfterSubmit === b.showAnswersAfterSubmit
  );
}

/** Bài còn nhận bài hoặc chưa tới giờ mở: đang chạy, chặn lưu trữ bài học. */
export function isQuizRunning(quiz: Pick<{ status: QuizStatus | null; openState: QuizOpenState }, 'status' | 'openState'>): boolean {
  return quiz.status === 'PUBLISHED' && quiz.openState !== 'ENDED';
}

/** Tỉ lệ đã nộp trên sĩ số, 0 đến 1 (sĩ số 0 thì 0). */
export function submissionRatio(submitted: number, students: number): number {
  return students > 0 ? Math.min(1, submitted / students) : 0;
}
