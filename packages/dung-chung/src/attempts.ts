import type { AttemptQuestion, BadgeCode, QuestionSubmission, StudentAttemptRow, StudentEarnedBadge } from './api';

// Logic thuần của việc làm bài kiểm tra: đồng hồ theo giờ máy chủ, trạng thái từng câu, các thao tác ghép cặp, sắp xếp và
// điền từ, chữ hiển thị điểm, sao và thời gian. Quy tắc chấm do máy chủ làm; ở đây chỉ dựng và đọc câu trả lời đúng cấu trúc
// máy chủ nhận (mọi vị trí tính theo thứ tự đang hiện trên màn hình của em).

// ---- Đồng hồ ----

/** Độ lệch (ms) giữa đồng hồ máy chủ và đồng hồ máy em, đo lúc tải lượt làm bài. */
export function clockOffsetMs(serverTimeIso: string, clientNowMs: number): number {
  const server = Date.parse(serverTimeIso);
  return Number.isNaN(server) ? 0 : server - clientNowMs;
}

/** Số giây còn lại tới hạn nộp tính theo giờ máy chủ; null nếu không có hạn nộp. Không âm. */
export function secondsLeft(deadlineIso: string | null, offsetMs: number, clientNowMs: number): number | null {
  if (!deadlineIso) return null;
  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) return null;
  return Math.max(0, Math.ceil((deadline - (clientNowMs + offsetMs)) / 1000));
}

/** Đồng hồ đếm ngược dạng 12:45 (phút không giới hạn ở 59: bài 90 phút hiện 90:00). */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Ngưỡng sắp hết giờ: dưới 1 phút đồng hồ chuyển màu cảnh báo. */
export const CLOCK_WARNING_SECONDS = 60;

/** Thời lượng bằng lời: "12 phút 30 giây", "45 giây", "1 giờ 5 phút". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return '';
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  if (minutes > 0) return rest > 0 ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
  return `${rest} giây`;
}

// ---- Điểm và sao ----

const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/** Số theo kiểu Việt Nam: 7,5. */
export function formatNumber(value: number): string {
  return decimal.format(value);
}

/** "8/10" (dấu phẩy thập phân kiểu Việt Nam). */
export function formatScore(score: number | null | undefined, total: number | null | undefined): string {
  if (score === null || score === undefined || total === null || total === undefined) return '';
  return `${formatNumber(score)}/${formatNumber(total)}`;
}

/** "77,5%". */
export function formatPercent(percent: number | null | undefined): string {
  return percent === null || percent === undefined ? '' : `${formatNumber(percent)}%`;
}

/** Số sao của cấp 1 giữ trong 0..3 (hàng sao luôn đủ 3 ô). */
export function clampStars(stars: number | null | undefined, max = 3): number {
  return Math.min(Math.max(Math.round(stars ?? 0), 0), max);
}

/** Điểm trung bình (phần trăm) của các lượt đã nộp có điểm; null khi không có lượt nào. */
export function averagePercent(rows: readonly Pick<StudentAttemptRow, 'percent'>[]): number | null {
  const values = rows.map((r) => r.percent).filter((p): p is number => p !== null && p !== undefined);
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

// ---- Trạng thái từng câu ----

/** Câu trả lời đã có nội dung chưa (câu trả lời rỗng thì gửi `{}` để xóa). */
export function hasAnswer(question: AttemptQuestion, answer: QuestionSubmission | null | undefined): boolean {
  if (!answer) return false;
  switch (question.questionType) {
    case 'MATCHING':
      return (answer.matches ?? []).some((m) => m !== null && m !== undefined);
    case 'ORDERING':
      // Câu sắp xếp chỉ tính là đã trả lời khi em đã đặt đủ mọi mục (máy chủ chỉ nhận thứ tự đầy đủ).
      return (answer.order ?? []).length === question.items.length && question.items.length > 0;
    case 'FILL_BLANK':
      return (answer.blanks ?? []).some((b) => (b ?? '').trim() !== '');
    case 'MULTI_TRUE_FALSE':
      return (answer.statements ?? []).some((s) => s !== null && s !== undefined);
    default:
      return answer.selectedIndex !== null && answer.selectedIndex !== undefined;
  }
}

/** Phần thân gửi lên máy chủ: câu trả lời gọn đúng dạng, hoặc `{}` nếu trống. Câu sắp xếp chưa đủ mục coi như chưa trả lời (`{}`). */
export function submissionToSave(question: AttemptQuestion, answer: QuestionSubmission | null | undefined): QuestionSubmission {
  if (!hasAnswer(question, answer) || !answer) return {};
  switch (question.questionType) {
    case 'MATCHING':
      return { matches: question.leftItems.map((_, i) => answer.matches?.[i] ?? null) };
    case 'ORDERING':
      return { order: [...(answer.order ?? [])] };
    case 'FILL_BLANK':
      return { blanks: Array.from({ length: question.blankCount }, (_, i) => (answer.blanks?.[i] ?? '').trim() || null) };
    case 'MULTI_TRUE_FALSE':
      return { statements: question.statements.map((_, i) => answer.statements?.[i] ?? null) };
    default:
      return { selectedIndex: answer.selectedIndex ?? null };
  }
}

/** Vị trí (từ 1) các câu em chưa trả lời, theo thứ tự đang hiện. */
export function unansweredPositions(
  questions: readonly AttemptQuestion[],
  answers: Readonly<Record<number, QuestionSubmission | null>>,
): number[] {
  return questions.flatMap((q, index) => (hasAnswer(q, answers[q.questionId]) ? [] : [index + 1]));
}

/** Các câu nối tiếp nhau dùng chung một đoạn tư liệu: vị trí đầu và cuối (từ 1) của nhóm chứa câu `index`. */
export function passageGroup(questions: readonly Pick<AttemptQuestion, 'passage'>[], index: number): { first: number; last: number } | null {
  const passage = questions[index]?.passage;
  if (!passage) return null;
  let first = index;
  let last = index;
  while (first > 0 && questions[first - 1]?.passage === passage) first--;
  while (last < questions.length - 1 && questions[last + 1]?.passage === passage) last++;
  return { first: first + 1, last: last + 1 };
}

// ---- Ghép cặp ----

/** Nối hình `left` với tên `right`; mỗi tên chỉ nối một lần nên tên đang nối ở hình khác bị gỡ khỏi hình đó. */
export function setMatch(matches: ReadonlyArray<number | null | undefined> | null | undefined, count: number, left: number, right: number): Array<number | null> {
  const next = Array.from({ length: count }, (_, i) => matches?.[i] ?? null);
  for (let i = 0; i < next.length; i++) if (next[i] === right) next[i] = null;
  next[left] = right;
  return next;
}

export function clearMatch(matches: ReadonlyArray<number | null | undefined> | null | undefined, count: number, left: number): Array<number | null> {
  const next = Array.from({ length: count }, (_, i) => matches?.[i] ?? null);
  next[left] = null;
  return next;
}

// ---- Sắp xếp ----

/** Em chạm một mục: chưa đặt thì đặt vào cuối hàng; đã đặt thì nhấc ra (các mục sau tự dồn lên). */
export function toggleOrderItem(order: readonly number[] | null | undefined, item: number): number[] {
  const current = order ?? [];
  return current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
}

/** Đổi chỗ mục ở vị trí `index` với mục kề trên (-1) hoặc kề dưới (+1) trong hàng đã đặt. */
export function moveOrderItem(order: readonly number[], index: number, direction: -1 | 1): number[] {
  const target = index + direction;
  if (target < 0 || target >= order.length) return [...order];
  const next = [...order];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

// ---- Điền từ ----

/** Tách lời câu theo chỗ trống (cụm gạch dưới liền nhau từ ba dấu trở lên): n chỗ trống cho n + 1 đoạn chữ. */
export function splitBlanks(content: string): string[] {
  return content.split(/_{3,}/u);
}

/** Điền từ vừa chọn vào chỗ trống đầu tiên còn trống; hết chỗ thì giữ nguyên. */
export function fillNextBlank(blanks: ReadonlyArray<string | null | undefined> | null | undefined, count: number, word: string): Array<string | null> {
  const next = Array.from({ length: count }, (_, i) => blanks?.[i] ?? null);
  const slot = next.findIndex((b) => b === null || b.trim() === '');
  if (slot >= 0) next[slot] = word;
  return next;
}

export function setBlank(blanks: ReadonlyArray<string | null | undefined> | null | undefined, count: number, index: number, value: string): Array<string | null> {
  const next = Array.from({ length: count }, (_, i) => blanks?.[i] ?? null);
  next[index] = value === '' ? null : value;
  return next;
}

// ---- Câu nhiều mệnh đề ----

export function setStatement(statements: ReadonlyArray<boolean | null | undefined> | null | undefined, count: number, index: number, value: boolean): Array<boolean | null> {
  const next = Array.from({ length: count }, (_, i) => statements?.[i] ?? null);
  next[index] = value;
  return next;
}

// ---- Chữ cái phương án ----

/** A, B, C… cho phương án thứ `index` (từ 0). */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

// ---- Huy hiệu ----

/** Bốn huy hiệu theo thứ tự hiện trên màn hình Tiến độ; tên và mô tả trùng với máy chủ (dùng cho huy hiệu em chưa đạt). */
export const BADGE_CATALOG: ReadonlyArray<{ code: BadgeCode; name: string; description: string; hint: string }> = [
  { code: 'EXCELLENT', name: 'Xuất sắc', description: 'Em đạt từ 90% số điểm của bài kiểm tra.', hint: 'Đạt từ 90% số điểm của một bài kiểm tra' },
  { code: 'ON_TIME', name: 'Nộp đúng hạn', description: 'Em tự nộp bài trước khi hết giờ.', hint: 'Tự nộp bài trước khi hết giờ' },
  { code: 'PERFECT_SCORE', name: 'Điểm tuyệt đối', description: 'Em làm đúng tất cả các câu của bài kiểm tra.', hint: 'Làm đúng tất cả các câu của một bài kiểm tra' },
  { code: 'PERSEVERANCE', name: 'Kiên trì', description: 'Em đã nộp từ 5 bài kiểm tra.', hint: 'Nộp từ 5 bài kiểm tra' },
];

/** Huy hiệu em đã đạt (nếu có) cho từng mã trong danh mục. */
export function badgeBoard(earned: readonly StudentEarnedBadge[]) {
  return BADGE_CATALOG.map((badge) => ({ ...badge, earned: earned.find((e) => e.code === badge.code) ?? null }));
}
