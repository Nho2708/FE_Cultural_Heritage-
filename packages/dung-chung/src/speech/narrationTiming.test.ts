import { describe, expect, it } from 'vitest';
import { sentenceIndexAt, sentenceStartMs } from './narrationTiming';

// Tìm câu đang đọc theo thời điểm phát của tệp thuyết minh tạo sẵn.

const SENTENCES = [
  { startMs: 150, endMs: 4200 },
  { startMs: 4550, endMs: 9000 },
  { startMs: 9350, endMs: 12800 },
];

describe('câu đang đọc theo thời điểm phát', () => {
  it('thời điểm nằm trong câu nào thì trả câu đó', () => {
    expect(sentenceIndexAt(SENTENCES, 150)).toBe(0);
    expect(sentenceIndexAt(SENTENCES, 2000)).toBe(0);
    expect(sentenceIndexAt(SENTENCES, 4550)).toBe(1);
    expect(sentenceIndexAt(SENTENCES, 8999)).toBe(1);
    expect(sentenceIndexAt(SENTENCES, 12000)).toBe(2);
  });

  it('khoảng lặng đầu tệp là câu đầu; khoảng lặng giữa hai câu vẫn là câu vừa đọc xong; qua câu cuối vẫn là câu cuối', () => {
    expect(sentenceIndexAt(SENTENCES, 0)).toBe(0);
    expect(sentenceIndexAt(SENTENCES, 4300)).toBe(0);
    expect(sentenceIndexAt(SENTENCES, 9100)).toBe(1);
    expect(sentenceIndexAt(SENTENCES, 99999)).toBe(2);
  });

  it('không có câu nào hoặc thời điểm không hợp lệ thì -1', () => {
    expect(sentenceIndexAt([], 1000)).toBe(-1);
    expect(sentenceIndexAt(SENTENCES, Number.NaN)).toBe(-1);
  });

  it('một câu duy nhất luôn là câu 0', () => {
    expect(sentenceIndexAt([{ startMs: 100, endMs: 2000 }], 0)).toBe(0);
    expect(sentenceIndexAt([{ startMs: 100, endMs: 2000 }], 5000)).toBe(0);
  });
});

describe('mốc nhảy tới đầu câu', () => {
  it('lấy mốc bắt đầu của câu; chỉ số ngoài danh sách thì về đầu tệp', () => {
    expect(sentenceStartMs(SENTENCES, 1)).toBe(4550);
    expect(sentenceStartMs(SENTENCES, -1)).toBe(0);
    expect(sentenceStartMs(SENTENCES, 7)).toBe(0);
  });
});
