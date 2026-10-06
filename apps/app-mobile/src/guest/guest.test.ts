import type { HeritageCard } from '@dsvhvn/dung-chung/api';
import { HISTORY_MAX_ENTRIES, parseHistory, prune, recentSearches, record, removeEntry, topTypes, viewCounts, type HistoryEntry, type NewEntry } from './historyCore';
import { distanceMeters, nearest } from './nearby';
import { excludedSlugs, pickRecommendations, typesToQuery } from './recommend';

const NOW = Date.UTC(2026, 9, 7);
const DAY = 24 * 60 * 60 * 1000;

function view(key: string, type: NewEntry['heritageType'] = 'TANGIBLE', kind: NewEntry['kind'] = 'view'): NewEntry {
  return { kind, key, label: key, thumbnailUrl: null, heritageType: type, provinceName: null };
}

function card(slug: string): HeritageCard {
  return { id: 1, slug, name: slug, shortDescription: null, thumbnailUrl: null, provinceId: null, provinceName: null, region: null, heritageType: 'TANGIBLE', recognitionLevel: null, recognizedYear: null };
}

describe('lịch sử của khách', () => {
  it('ghi từ khóa tìm đã cắt gọn, bỏ từ khóa quá ngắn và không trùng', () => {
    let entries: HistoryEntry[] = [];
    entries = record(entries, { ...view('x'), kind: 'search' }, NOW);
    expect(entries).toHaveLength(0);
    entries = record(entries, { ...view('  chùa  '), kind: 'search' }, NOW);
    entries = record(entries, { ...view('CHÙA'), kind: 'search' }, NOW + 1000);
    expect(entries.map((e) => e.key)).toEqual(['CHÙA']);
    entries = record(entries, { ...view('a'.repeat(300)), kind: 'search' }, NOW + 2000);
    expect(entries[0]?.key).toHaveLength(100);
  });

  it('nghe và xem 3D chỉ giữ mục mới nhất của mỗi di sản, xem giữ tối đa 5 lần gần nhất', () => {
    let entries: HistoryEntry[] = [];
    for (let i = 0; i < 8; i += 1) entries = record(entries, view('hue'), NOW + i);
    expect(viewCounts(entries).get('hue')).toBe(5);
    entries = record(entries, view('hue', 'TANGIBLE', 'listen'), NOW + 100);
    entries = record(entries, view('hue', 'TANGIBLE', 'listen'), NOW + 200);
    expect(entries.filter((e) => e.kind === 'listen')).toHaveLength(1);
  });

  it('tự xóa mục quá 90 ngày và giữ tối đa 200 mục', () => {
    const old: HistoryEntry = { ...view('cu'), at: NOW - 91 * DAY };
    const fresh: HistoryEntry = { ...view('moi'), at: NOW - 89 * DAY };
    expect(prune([old, fresh], NOW).map((e) => e.key)).toEqual(['moi']);
    const many = Array.from({ length: HISTORY_MAX_ENTRIES + 20 }, (_, i): HistoryEntry => ({ ...view(`k${i}`), at: NOW - i * 1000 }));
    expect(prune(many, NOW)).toHaveLength(HISTORY_MAX_ENTRIES);
  });

  it('đọc lại từ chuỗi đã lưu, bỏ mục hỏng và chuỗi hỏng', () => {
    expect(parseHistory(null, NOW)).toEqual([]);
    expect(parseHistory('không phải JSON', NOW)).toEqual([]);
    expect(parseHistory('{"a":1}', NOW)).toEqual([]);
    const raw = JSON.stringify([{ ...view('hue'), at: NOW }, { kind: 'lạ', key: 1 }]);
    expect(parseHistory(raw, NOW).map((e) => e.key)).toEqual(['hue']);
  });

  it('xóa từng mục', () => {
    const entries = record(record([], view('a1'), NOW), view('b2'), NOW + 1);
    const target = entries[0]!;
    expect(removeEntry(entries, target).map((e) => e.key)).toEqual(['a1']);
  });

  it('từ khóa tìm gần đây không trùng, mới nhất trước', () => {
    let entries: HistoryEntry[] = [];
    entries = record(entries, { ...view('chùa'), kind: 'search' }, NOW);
    entries = record(entries, { ...view('đền'), kind: 'search' }, NOW + 1);
    expect(recentSearches(entries)).toEqual(['đền', 'chùa']);
  });
});

describe('gợi ý cho khách', () => {
  it('xếp loại quan tâm nhất theo trọng số và độ mới', () => {
    let entries: HistoryEntry[] = [];
    entries = record(entries, view('a', 'INTANGIBLE'), NOW - 60 * DAY);
    entries = record(entries, view('b', 'TANGIBLE'), NOW - DAY);
    entries = record(entries, view('c', 'TANGIBLE', 'listen'), NOW - DAY / 2);
    expect(topTypes(entries, NOW)[0]).toBe('TANGIBLE');
    expect(topTypes([], NOW)).toEqual([]);
    expect(typesToQuery(['TANGIBLE', 'NATURAL', 'MIXED'])).toEqual(['TANGIBLE', 'NATURAL']);
  });

  it('bỏ di sản đã xem từ 2 lần và di sản vừa làm gần nhất', () => {
    let entries: HistoryEntry[] = [];
    entries = record(entries, view('hue'), NOW);
    entries = record(entries, view('hue'), NOW + 1);
    entries = record(entries, view('hoi-an'), NOW + 2);
    const excluded = excludedSlugs(entries);
    expect(excluded.has('hue')).toBe(true);
    expect(excluded.has('hoi-an')).toBe(true);
    expect(excluded.has('khac')).toBe(false);
  });

  it('chọn tối đa 6, xen kẽ giữa các loại, không trùng', () => {
    const a = ['a1', 'a2', 'a3', 'a4', 'a5'].map(card);
    const b = ['b1', 'b2', 'a1'].map(card);
    const picked = pickRecommendations([a, b], new Set(['a2']));
    expect(picked.map((c) => c.slug)).toEqual(['a1', 'b1', 'b2', 'a3', 'a4', 'a5']);
    expect(pickRecommendations([], new Set())).toEqual([]);
  });
});

describe('di sản gần bạn', () => {
  const hanoi = { latitude: 21.0285, longitude: 105.8542 };

  it('tính khoảng cách đường chim bay', () => {
    expect(distanceMeters(hanoi, hanoi)).toBeCloseTo(0, 5);
    // Hà Nội - Huế khoảng 540 km.
    const hue = { latitude: 16.4637, longitude: 107.5909 };
    expect(distanceMeters(hanoi, hue) / 1000).toBeGreaterThan(520);
    expect(distanceMeters(hanoi, hue) / 1000).toBeLessThan(560);
  });

  it('lấy các di sản gần nhất và bỏ di sản không có tọa độ', () => {
    const items = [
      { slug: 'xa', latitude: 10.8, longitude: 106.7 },
      { slug: 'gan', latitude: 21.03, longitude: 105.85 },
      { slug: 'khong-co', latitude: null, longitude: null },
      { slug: 'vua', latitude: 20.45, longitude: 106.34 },
    ];
    expect(nearest(hanoi, items, 2).map((x) => x.item.slug)).toEqual(['gan', 'vua']);
    expect(nearest(hanoi, items, 10)).toHaveLength(3);
  });
});
