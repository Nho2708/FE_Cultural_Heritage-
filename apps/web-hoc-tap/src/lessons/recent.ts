// Bộ nhớ nhỏ trên máy của em: các mã bài học vừa mở (hiện ở màn hình Nhập mã) và bước em đang dừng ở bài cấp 1.
// Chỉ lưu mã, tiêu đề và vị trí, không lưu nội dung bài; mỗi học sinh một khóa riêng nên em khác dùng chung máy không thấy.
// localStorage có thể bị chặn hoặc ném lỗi (cửa sổ riêng tư): mọi đọc, ghi đều bọc try/catch và màn hình vẫn chạy khi không có.

const MAX_RECENT = 5;

export interface RecentLesson {
  code: string;
  title: string;
  openedAt: string;
}

const recentKey = (userId: number) => `dsvhvn.hoc-tap.ma-gan-day.${userId}`;
const positionKey = (userId: number, code: string) => `dsvhvn.hoc-tap.vi-tri.${userId}.${code}`;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Không lưu được thì thôi: chỉ mất tiện ích nhớ bước.
  }
}

export function readRecentLessons(userId: number): RecentLesson[] {
  const value = read(recentKey(userId));
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is RecentLesson =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecentLesson).code === 'string' &&
        typeof (item as RecentLesson).title === 'string' &&
        typeof (item as RecentLesson).openedAt === 'string',
    )
    .slice(0, MAX_RECENT);
}

/** Ghi lại một lần mở bài: đưa lên đầu, bỏ bản cũ của cùng mã, giữ tối đa 5 mã. */
export function rememberLesson(userId: number, lesson: { code: string; title: string }, now: Date = new Date()) {
  const rest = readRecentLessons(userId).filter((item) => item.code !== lesson.code);
  write(recentKey(userId), [{ code: lesson.code, title: lesson.title, openedAt: now.toISOString() }, ...rest].slice(0, MAX_RECENT));
}

export interface LessonPosition {
  step: number;
  part: number;
}

export function readPosition(userId: number, code: string): LessonPosition {
  const value = read(positionKey(userId, code)) as Partial<LessonPosition> | null;
  const whole = (n: unknown) => (typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0);
  return { step: whole(value?.step), part: whole(value?.part) };
}

export function writePosition(userId: number, code: string, position: LessonPosition) {
  write(positionKey(userId, code), position);
}
