import type { HeritageCard, HeritageType } from '@dsvhvn/dung-chung/api';
import { viewCounts, type HistoryEntry } from './historyCore';

// Gợi ý cho khách: tối đa 6 di sản cùng loại với những di sản khách đã xem, nghe, xem 3D gần đây, bỏ di sản đã xem nhiều lần (từ 2 lần) và di sản vừa xem.
// Dựa trên nội dung, tính trên máy, không gọi mô hình ngôn ngữ. Chưa có lịch sử thì dùng di sản nổi bật.

export const RECOMMENDATION_LIMIT = 6;
export const SEEN_TOO_MUCH = 2;

/** Di sản không nên gợi ý lại: đã xem từ 2 lần trở lên, hoặc là di sản khách vừa làm gần nhất. */
export function excludedSlugs(entries: readonly HistoryEntry[]): Set<string> {
  const excluded = new Set<string>();
  for (const [slug, count] of viewCounts(entries)) if (count >= SEEN_TOO_MUCH) excluded.add(slug);
  const latest = entries.find((entry) => entry.kind !== 'search');
  if (latest) excluded.add(latest.key);
  return excluded;
}

/** Ghép các danh sách ứng viên (theo thứ tự ưu tiên của loại), xen kẽ giữa các loại, bỏ trùng và di sản bị loại, cắt còn tối đa 6. */
export function pickRecommendations(candidatesByType: ReadonlyArray<readonly HeritageCard[]>, excluded: ReadonlySet<string>, limit = RECOMMENDATION_LIMIT): HeritageCard[] {
  const result: HeritageCard[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...candidatesByType.map((list) => list.length));
  for (let i = 0; i < longest && result.length < limit; i += 1) {
    for (const list of candidatesByType) {
      const card = list[i];
      if (!card || excluded.has(card.slug) || seen.has(card.slug)) continue;
      seen.add(card.slug);
      result.push(card);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** Hai loại đứng đầu để hỏi máy chủ (đủ rộng để còn ứng viên sau khi loại bớt). */
export function typesToQuery(ranked: readonly HeritageType[]): HeritageType[] {
  return ranked.slice(0, 2);
}
