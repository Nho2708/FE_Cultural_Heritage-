import { KEYS, type KeyValueStore } from '../storage/keyValue';

// Bộ nhớ nhỏ trên máy của em: các mã bài học vừa mở, hiện ở màn hình Nhập mã để em mở lại không phải gõ (như web học tập). Chỉ lưu mã, tiêu đề và thời điểm mở, không lưu nội dung bài;
// mỗi học sinh một khóa riêng nên em khác dùng chung máy không thấy. Nơi lưu hỏng hoặc dữ liệu lạ thì coi như chưa có mã nào, màn hình vẫn chạy.

export const MAX_RECENT_LESSONS = 5;

export interface RecentLesson {
  code: string;
  title: string;
  openedAt: string;
}

const keyOf = (userId: number) => `${KEYS.recentLessons}.${userId}`;

function isRecentLesson(value: unknown): value is RecentLesson {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.code === 'string' && item.code !== '' && typeof item.title === 'string' && typeof item.openedAt === 'string';
}

/** Đọc danh sách đã lưu: chuỗi hỏng hoặc mục sai khuôn bị bỏ, giữ tối đa 5 mã. */
export function parseRecentLessons(raw: string | null): RecentLesson[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isRecentLesson).slice(0, MAX_RECENT_LESSONS) : [];
  } catch {
    return [];
  }
}

/** Ghi một lần mở bài: đưa lên đầu, bỏ bản cũ của cùng mã, giữ tối đa 5 mã. */
export function withOpenedLesson(list: readonly RecentLesson[], lesson: { code: string; title: string }, now: Date): RecentLesson[] {
  const rest = list.filter((item) => item.code !== lesson.code);
  return [{ code: lesson.code, title: lesson.title, openedAt: now.toISOString() }, ...rest].slice(0, MAX_RECENT_LESSONS);
}

export async function readRecentLessons(store: KeyValueStore, userId: number): Promise<RecentLesson[]> {
  return parseRecentLessons(await store.get(keyOf(userId)));
}

export async function rememberLesson(store: KeyValueStore, userId: number, lesson: { code: string; title: string }, now: Date = new Date()): Promise<void> {
  const next = withOpenedLesson(await readRecentLessons(store, userId), lesson, now);
  await store.set(keyOf(userId), JSON.stringify(next));
}
