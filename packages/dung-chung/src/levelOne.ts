import type { AnswerCheck, AttemptQuestion, QuestionSubmission, QuestionType, StudentAlbumCard, StudentClassLesson, StudentHome, StudentInProgress } from './api';
import { hasAnswer } from './attempts';

// Logic thuần của khu học cấp 1 (khối 1-5), web học tập và app dùng chung: bài chơi dạng luyện tập (kiểm từng câu, sai thì gợi ý rồi cho thử
// lại, sai lần hai thì chỉ đáp án kèm giải thích), con đường các bài học của lớp, album di sản. Câu chữ ngắn, nói với em, không có chữ "Sai"
// màu chói, không trừ sao. Cấp 1 dùng chung một bố cục cho cả lớp 1 đến lớp 5.

/** Sau khi đổi câu hoặc đóng bảng phản hồi, bỏ qua cú chạm trong khoảng này: trẻ hay chạm lặp vào chỗ cũ khi màn hình vừa đổi. */
export const TAP_LOCK_MS = 400;

/** Thẻ nhận trong vòng 7 ngày hiện nhãn "Mới". */
export const NEW_CARD_DAYS = 7;

// ---- Lời hướng dẫn ----

/** Lời hướng dẫn ngắn dưới câu hỏi, có nút nghe. */
export function levelOneInstruction(type: QuestionType): string {
  switch (type) {
    case 'TRUE_FALSE':
      return 'Em chạm Đúng hoặc Sai.';
    case 'IMAGE_CHOICE':
      return 'Em chạm vào hình đúng.';
    case 'MATCHING':
      return 'Em chạm một hình, rồi chạm tên của hình đó.';
    case 'ORDERING':
      return 'Em chạm các bước theo đúng thứ tự.';
    default:
      return 'Em chọn câu trả lời nhé.';
  }
}

// ---- Khi nào kiểm ----

/** Dạng chọn một phương án: kiểm ngay khi em chạm. Ghép cặp và sắp xếp: em làm xong rồi bấm "Kiểm tra". */
export function checksOnTap(type: QuestionType): boolean {
  return type === 'TRUE_FALSE' || type === 'IMAGE_CHOICE' || type === 'SINGLE_CHOICE' || type === 'SOURCE_READING';
}

/** Câu trả lời đủ để kiểm: ghép cặp phải nối đủ mọi hình, sắp xếp phải đặt đủ mọi mục, dạng chọn phải đã chọn. */
export function readyToCheck(question: AttemptQuestion, answer: QuestionSubmission | null | undefined): boolean {
  if (!answer) return false;
  if (question.questionType === 'MATCHING') {
    const matches = answer.matches ?? [];
    return question.leftItems.length > 0 && question.leftItems.every((_, i) => matches[i] !== null && matches[i] !== undefined);
  }
  return hasAnswer(question, answer);
}

// ---- Phản hồi sau mỗi lần kiểm ----

/** `correct`: đúng. `retry`: sai lần đầu, gợi ý rồi cho thử lại. `reveal`: chỉ đáp án đúng kèm giải thích. */
export type FeedbackTone = 'correct' | 'retry' | 'reveal';

export interface PracticeFeedback {
  tone: FeedbackTone;
  title: string;
  text: string;
  /** Lời đọc to của bảng phản hồi. */
  speech: string;
  /** Nhãn nút của bảng phản hồi: "Thử lại", "Câu tiếp" hoặc "Xong rồi!" ở câu cuối. */
  action: string;
  /** true: câu này đã xong (đúng, hoặc đã chỉ đáp án), em đi tiếp được. */
  done: boolean;
}

const CORRECT_TITLES = ['Đúng rồi!', 'Giỏi quá!', 'Chính xác!'] as const;

function countTrue(parts: readonly boolean[]): number {
  return parts.filter(Boolean).length;
}

/** Câu thay cho giải thích khi câu hỏi chưa có giải thích: nói đáp án đúng bằng lời. */
function answerSentence(question: AttemptQuestion, correct: QuestionSubmission): string {
  switch (question.questionType) {
    case 'MATCHING':
      return 'Các cặp đúng đang hiện trên màn hình.';
    case 'ORDERING':
      return 'Thứ tự đúng đang hiện trên màn hình.';
    case 'IMAGE_CHOICE': {
      const label = question.options[correct.selectedIndex ?? -1]?.content?.trim();
      return label ? `Đáp án đúng là hình “${label}”.` : 'Đáp án đúng là hình đang sáng.';
    }
    default: {
      const label = question.options[correct.selectedIndex ?? -1]?.content?.trim();
      return label ? `Đáp án đúng là: ${label}.` : 'Đáp án đúng đang sáng trên màn hình.';
    }
  }
}

/**
 * Bảng phản hồi sau một lần kiểm. Đúng thì khen và nhắc lại vì sao đúng. Sai lần đầu thì gợi ý rồi cho thử lại (trừ câu Đúng/Sai: chỉ còn một
 * phương án nên chỉ luôn đáp án). Sai từ lần hai thì chỉ đáp án đúng kèm giải thích.
 */
export function practiceFeedback(question: AttemptQuestion, check: AnswerCheck, options: { last: boolean }): PracticeFeedback {
  const next = options.last ? 'Xong rồi!' : 'Câu tiếp';
  const explanation = check.explanation?.trim() || null;

  if (check.isCorrect) {
    const title = CORRECT_TITLES[(question.position - 1 + CORRECT_TITLES.length) % CORRECT_TITLES.length]!;
    const text = explanation ?? 'Em nhớ bài giỏi lắm!';
    return { tone: 'correct', title, text, speech: `${title} ${text}`, action: next, done: true };
  }

  const canRetry = check.tryCount < 2 && question.questionType !== 'TRUE_FALSE';
  if (canRetry) {
    const right = countTrue(check.parts);
    const total = check.parts.length;
    let title = 'Chưa đúng rồi.';
    let text = 'Em nhớ lại câu chuyện rồi thử lại nhé!';
    if (question.questionType === 'IMAGE_CHOICE') {
      title = 'Chưa phải hình này.';
      text = 'Em nhớ lại câu chuyện rồi chọn hình khác nhé!';
    } else if (question.questionType === 'MATCHING') {
      title = right > 0 ? 'Gần đúng rồi!' : 'Chưa đúng rồi.';
      text = right > 0 ? `Em nối đúng ${right} trên ${total} cặp. Các cặp chưa đúng đã được gỡ ra, em nối lại nhé!` : 'Em thử nối lại các cặp nhé!';
    } else if (question.questionType === 'ORDERING') {
      title = right > 0 ? 'Gần đúng rồi!' : 'Chưa đúng rồi.';
      text = right > 0 ? `Em xếp đúng ${right} trên ${total} bước. Em đổi chỗ các bước chưa đúng rồi kiểm tra lại nhé!` : 'Em thử xếp lại các bước nhé!';
    }
    return { tone: 'retry', title, text, speech: `${title} ${text}`, action: 'Thử lại', done: false };
  }

  const title = 'Đáp án đúng ở đây nè!';
  const text = explanation ?? answerSentence(question, check.correctAnswer);
  return { tone: 'reveal', title, text, speech: `${title} ${text}`, action: next, done: true };
}

/**
 * Câu trả lời để em thử lại sau một lần sai: ghép cặp giữ các cặp đúng và gỡ cặp sai; sắp xếp giữ nguyên để em đổi chỗ; dạng chọn một phương
 * án thì bỏ chọn (phương án vừa chọn sai nên làm mờ).
 */
export function retryAnswer(question: AttemptQuestion, answer: QuestionSubmission | null | undefined, check: AnswerCheck): QuestionSubmission | null {
  if (!answer) return null;
  switch (question.questionType) {
    case 'MATCHING':
      return { matches: question.leftItems.map((_, i) => (check.parts[i] ? (answer.matches?.[i] ?? null) : null)) };
    case 'ORDERING':
      return { order: [...(answer.order ?? [])] };
    default:
      return null;
  }
}

// ---- Con đường các bài học ----

/** `done`: em đã học xong. `current`: bài nên học bây giờ (bài đầu tiên chưa xong). `open`: bài khác, vẫn mở được, chỉ nhạt hơn. */
export type StationState = 'done' | 'current' | 'open';

export interface LevelOneStation {
  lesson: StudentClassLesson;
  state: StationState;
}

/** Trạm trên con đường theo đúng thứ tự học máy chủ trả; không khóa bài nào. */
export function levelOneStations(home: Pick<StudentHome, 'classLessons'>): LevelOneStation[] {
  const current = home.classLessons.find((lesson) => !lesson.completed);
  return home.classLessons.map((lesson) => ({
    lesson,
    state: lesson.completed ? 'done' : lesson === current ? 'current' : 'open',
  }));
}

/** Bài nên học bây giờ: bài đầu tiên em chưa học xong; null khi đã xong hết hoặc lớp chưa có bài. */
export function nextLevelOneLesson(home: Pick<StudentHome, 'classLessons'>): StudentClassLesson | null {
  return home.classLessons.find((lesson) => !lesson.completed) ?? null;
}

/** Lượt em đang chơi dở (ưu tiên hiện "Chơi tiếp" trước bài mới). */
export function levelOneResume(home: Pick<StudentHome, 'inProgress'>): StudentInProgress | null {
  return home.inProgress[0] ?? null;
}

/** "12 ngày đã học": tổng số ngày em có nộp bài, nghỉ không bị mất. */
export function daysLearnedText(days: number | null | undefined): string {
  return `${Math.max(0, days ?? 0)} ngày đã học`;
}

// ---- Album di sản ----

/** Thẻ em mới nhận trong 7 ngày gần đây. */
export function isNewCard(card: Pick<StudentAlbumCard, 'collected' | 'collectedAt'>, nowMs: number): boolean {
  if (!card.collected || !card.collectedAt) return false;
  const at = Date.parse(card.collectedAt);
  return !Number.isNaN(at) && nowMs - at <= NEW_CARD_DAYS * 24 * 60 * 60 * 1000;
}

/** Các nhóm có trong album, theo thứ tự xuất hiện; dùng cho hàng chip lọc ("Tất cả" do giao diện thêm). */
export function albumGroups(cards: readonly Pick<StudentAlbumCard, 'groupName'>[]): string[] {
  return [...new Set(cards.map((card) => card.groupName))];
}

/** "Học bài “Chùa Một Cột” để mở" cho thẻ chưa có. */
export function lockedCardHint(card: Pick<StudentAlbumCard, 'lessonTitle'>): string {
  return card.lessonTitle ? `Học bài “${card.lessonTitle}” để mở` : 'Học bài của thầy cô để mở';
}
