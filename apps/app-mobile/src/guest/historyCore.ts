import type { HeritageType } from '@dsvhvn/dung-chung/api';

// Lịch sử của khách: lưu trên chính máy này (không gửi lên máy chủ), gồm từ khóa đã tìm và di sản đã xem, nghe, xem 3D. Tự xóa sau 90 ngày, giữ tối đa 200 mục.
// Lịch sử là nguồn cho "Gợi ý cho bạn". Đây là các hàm thuần để kiểm bằng test đơn vị.

export type HistoryKind = 'search' | 'view' | 'listen' | 'model';

export interface HistoryEntry {
  kind: HistoryKind;
  /** Từ khóa (kind = search) hoặc mã di sản (các loại còn lại). */
  key: string;
  /** Tên hiển thị tại thời điểm ghi (từ khóa hoặc tên di sản). */
  label: string;
  thumbnailUrl: string | null;
  heritageType: HeritageType | null;
  provinceName: string | null;
  /** Thời điểm ghi, mili giây kể từ epoch. */
  at: number;
}

export const HISTORY_RETENTION_DAYS = 90;
export const HISTORY_MAX_ENTRIES = 200;
export const SEARCH_KEYWORD_MAX = 100;
/** Một di sản chỉ giữ tối đa chừng này lần xem gần nhất (đủ để biết "đã xem nhiều lần"). */
const VIEWS_KEPT_PER_HERITAGE = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

const KINDS: readonly HistoryKind[] = ['search', 'view', 'listen', 'model'];

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.kind === 'string' &&
    (KINDS as readonly string[]).includes(v.kind) &&
    typeof v.key === 'string' &&
    typeof v.label === 'string' &&
    typeof v.at === 'number' &&
    Number.isFinite(v.at)
  );
}

/** Bỏ mục quá 90 ngày, giữ mục mới nhất trước và tối đa 200 mục. */
export function prune(entries: readonly HistoryEntry[], now: number): HistoryEntry[] {
  const oldest = now - HISTORY_RETENTION_DAYS * DAY_MS;
  return entries
    .filter((entry) => entry.at >= oldest)
    .sort((a, b) => b.at - a.at)
    .slice(0, HISTORY_MAX_ENTRIES);
}

/** Đọc lại danh sách đã lưu: bỏ mục hỏng và mục quá 90 ngày. */
export function parseHistory(raw: string | null, now: number): HistoryEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return prune(value.filter(isHistoryEntry), now);
  } catch {
    return [];
  }
}

export type NewEntry = Omit<HistoryEntry, 'at'>;

/**
 * Ghi một hành động. Từ khóa tìm cắt tối đa 100 ký tự và bỏ từ khóa ngắn hơn 2 ký tự; cùng một từ khóa (hoặc cùng một di sản được nghe, xem 3D) chỉ giữ mục mới nhất.
 * Mục "xem" của một di sản giữ tối đa 5 lần gần nhất để đếm được "đã xem nhiều lần".
 */
export function record(entries: readonly HistoryEntry[], entry: NewEntry, now: number): HistoryEntry[] {
  const key = entry.kind === 'search' ? entry.key.trim().slice(0, SEARCH_KEYWORD_MAX) : entry.key;
  if (entry.kind === 'search' && key.length < 2) return prune(entries, now);
  const next: HistoryEntry = { ...entry, key, label: entry.kind === 'search' ? key : entry.label, at: now };
  let kept = [...entries];
  if (entry.kind === 'search') {
    kept = kept.filter((item) => !(item.kind === 'search' && item.key.toLowerCase() === key.toLowerCase()));
  } else if (entry.kind === 'view') {
    const sameHeritage = kept.filter((item) => item.kind === 'view' && item.key === key).sort((a, b) => b.at - a.at);
    const drop = new Set(sameHeritage.slice(VIEWS_KEPT_PER_HERITAGE - 1));
    kept = kept.filter((item) => !drop.has(item));
  } else {
    kept = kept.filter((item) => !(item.kind === entry.kind && item.key === key));
  }
  return prune([next, ...kept], now);
}

export function removeEntry(entries: readonly HistoryEntry[], target: HistoryEntry): HistoryEntry[] {
  return entries.filter((entry) => entry !== target);
}

/** Số lần đã xem từng di sản. */
export function viewCounts(entries: readonly HistoryEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) if (entry.kind === 'view') counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
  return counts;
}

const WEIGHT: Record<HistoryKind, number> = { search: 0, view: 1, listen: 2, model: 2 };

/** Loại di sản khách quan tâm nhất: tính theo hành động có di sản (nghe và xem 3D nặng hơn xem), mới hơn nặng hơn. Chưa có lịch sử thì trả danh sách rỗng. */
export function topTypes(entries: readonly HistoryEntry[], now: number): HeritageType[] {
  const score = new Map<HeritageType, number>();
  for (const entry of entries) {
    if (!entry.heritageType || WEIGHT[entry.kind] === 0) continue;
    const ageDays = Math.max(0, (now - entry.at) / DAY_MS);
    const recency = 1 / (1 + ageDays / 14);
    score.set(entry.heritageType, (score.get(entry.heritageType) ?? 0) + WEIGHT[entry.kind] * recency);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type);
}

/** Từ khóa tìm gần đây (mới nhất trước, không trùng). */
export function recentSearches(entries: readonly HistoryEntry[], limit = 8): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'search') continue;
    const lower = entry.key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(entry.key);
    if (result.length >= limit) break;
  }
  return result;
}
