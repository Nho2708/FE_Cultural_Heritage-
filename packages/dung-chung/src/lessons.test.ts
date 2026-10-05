import { describe, expect, it } from 'vitest';
import { countLessonWords, isWellFormedLessonCode, normalizeLessonCode, spacedLessonCode } from './lessons';

describe('mã bài học', () => {
  it('bỏ khoảng trắng, dấu gạch và đổi chữ hoa', () => {
    expect(normalizeLessonCode(' bh 7f3-k2q ')).toBe('BH7F3K2Q');
  });

  it('đúng dạng BH + 6 ký tự của bảng 32 ký tự; O, I, 0, 1 không có trong bảng', () => {
    expect(isWellFormedLessonCode('bh7f3k2q')).toBe(true);
    expect(isWellFormedLessonCode('BH7F3K20')).toBe(false);
    expect(isWellFormedLessonCode('BH7F3K2I')).toBe(false);
    expect(isWellFormedLessonCode('BH7F3K1Q')).toBe(false);
    expect(isWellFormedLessonCode('HS7F3K2Q')).toBe(false);
    expect(isWellFormedLessonCode('BH7F3K2')).toBe(false);
  });

  it('chia nhóm để đọc to; mã sai dạng giữ nguyên', () => {
    expect(spacedLessonCode('BH7F3K2Q')).toBe('BH 7F3 K2Q');
    expect(spacedLessonCode('xyz')).toBe('xyz');
  });
});

describe('đếm từ', () => {
  it('đếm theo khoảng trắng như máy chủ', () => {
    expect(countLessonWords('')).toBe(0);
    expect(countLessonWords(null)).toBe(0);
    expect(countLessonWords('  Ngọ Môn   là cổng\nchính ')).toBe(5);
  });
});
