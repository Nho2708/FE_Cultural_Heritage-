import type { KeyValueStore } from '../storage/keyValue';
import { MAX_RECENT_LESSONS, parseRecentLessons, readRecentLessons, rememberLesson, withOpenedLesson, type RecentLesson } from './recentLessons';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => void data.set(key, value),
    remove: async (key) => void data.delete(key),
  };
}

const NOW = new Date('2026-10-12T03:00:00Z');
const lesson = (n: number) => ({ code: `BH${String(n).padStart(6, '0')}`, title: `Bài ${n}` });

describe('recent lesson codes on the phone', () => {
  it('puts the lesson just opened first and drops the older copy of the same code', () => {
    let list: RecentLesson[] = [];
    list = withOpenedLesson(list, lesson(1), NOW);
    list = withOpenedLesson(list, lesson(2), new Date(NOW.getTime() + 1000));
    list = withOpenedLesson(list, lesson(1), new Date(NOW.getTime() + 2000));
    expect(list.map((item) => item.code)).toEqual([lesson(1).code, lesson(2).code]);
    expect(list[0]!.openedAt).toBe('2026-10-12T03:00:02.000Z');
  });

  it('keeps at most five codes', () => {
    let list: RecentLesson[] = [];
    for (let n = 1; n <= 8; n += 1) list = withOpenedLesson(list, lesson(n), NOW);
    expect(list).toHaveLength(MAX_RECENT_LESSONS);
    expect(list[0]!.code).toBe(lesson(8).code);
  });

  it('ignores broken or foreign saved data', () => {
    expect(parseRecentLessons(null)).toEqual([]);
    expect(parseRecentLessons('không phải JSON')).toEqual([]);
    expect(parseRecentLessons('{"code":"BH1"}')).toEqual([]);
    const raw = JSON.stringify([{ code: 'BH000001', title: 'Hợp lệ', openedAt: NOW.toISOString() }, { code: 5 }, { code: '', title: 'x', openedAt: 'y' }, null]);
    expect(parseRecentLessons(raw).map((item) => item.code)).toEqual(['BH000001']);
  });

  it('saves and reads back through the phone storage, one list per student', async () => {
    const store = memoryStore();
    await rememberLesson(store, 7, lesson(1), NOW);
    await rememberLesson(store, 7, lesson(2), NOW);
    await rememberLesson(store, 9, lesson(3), NOW);
    expect((await readRecentLessons(store, 7)).map((item) => item.code)).toEqual([lesson(2).code, lesson(1).code]);
    expect((await readRecentLessons(store, 9)).map((item) => item.code)).toEqual([lesson(3).code]);
    expect(await readRecentLessons(store, 11)).toEqual([]);
  });

  it('stores only the code, the title and the time of opening', async () => {
    const store = memoryStore();
    await rememberLesson(store, 7, { code: 'BH000001', title: 'Hoàng thành' }, NOW);
    const [saved] = [...store.data.values()];
    expect(JSON.parse(saved!)).toEqual([{ code: 'BH000001', title: 'Hoàng thành', openedAt: NOW.toISOString() }]);
  });
});
