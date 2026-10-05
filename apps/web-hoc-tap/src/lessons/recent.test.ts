import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPosition, readRecentLessons, rememberLesson, writePosition } from './recent';

describe('mã bài học em đã mở gần đây', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('đưa mã mới mở lên đầu, bỏ bản cũ của cùng mã và giữ tối đa 5 mã', () => {
    for (const code of ['BH222222', 'BH333333', 'BH444444', 'BH555555', 'BH666666', 'BH777777']) {
      rememberLesson(7, { code, title: `Bài ${code}` });
    }
    rememberLesson(7, { code: 'BH444444', title: 'Bài mở lại' });
    const recent = readRecentLessons(7);
    expect(recent).toHaveLength(5);
    expect(recent[0]).toMatchObject({ code: 'BH444444', title: 'Bài mở lại' });
    expect(recent.filter((r) => r.code === 'BH444444')).toHaveLength(1);
    expect(recent.map((r) => r.code)).not.toContain('BH222222');
  });

  it('mỗi học sinh một khóa riêng', () => {
    rememberLesson(1, { code: 'BH222222', title: 'A' });
    expect(readRecentLessons(2)).toEqual([]);
  });

  it('dữ liệu hỏng không làm hỏng màn hình', () => {
    window.localStorage.setItem('dsvhvn.hoc-tap.ma-gan-day.3', '{không phải JSON');
    expect(readRecentLessons(3)).toEqual([]);
    window.localStorage.setItem('dsvhvn.hoc-tap.ma-gan-day.3', JSON.stringify([{ code: 1 }, 'x']));
    expect(readRecentLessons(3)).toEqual([]);
  });

  it('localStorage ném lỗi thì đọc trả rỗng và ghi bị bỏ qua', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bị chặn');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bị chặn');
    });
    expect(readRecentLessons(1)).toEqual([]);
    expect(() => rememberLesson(1, { code: 'BH222222', title: 'A' })).not.toThrow();
    expect(readPosition(1, 'BH222222')).toEqual({ step: 0, part: 0 });
  });

  it('nhớ bước và đoạn em đang dừng', () => {
    writePosition(4, 'BH222222', { step: 1, part: 2 });
    expect(readPosition(4, 'BH222222')).toEqual({ step: 1, part: 2 });
    expect(readPosition(4, 'BH333333')).toEqual({ step: 0, part: 0 });
  });
});
