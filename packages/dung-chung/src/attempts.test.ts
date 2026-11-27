import { describe, expect, it } from 'vitest';
import type { AttemptQuestion } from './api';
import {
  averagePercent,
  badgeBoard,
  clampStars,
  clearMatch,
  clockOffsetMs,
  fillNextBlank,
  formatClock,
  formatDuration,
  formatPercent,
  formatScore,
  hasAnswer,
  moveOrderItem,
  passageGroup,
  secondsLeft,
  setBlank,
  setMatch,
  setStatement,
  splitBlanks,
  submissionToSave,
  toggleOrderItem,
  unansweredPositions,
} from './attempts';

function question(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: 1,
    position: 1,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: 'Câu hỏi?',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [],
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: false,
    answer: null,
    checked: false,
    ...overrides,
  };
}

describe('đồng hồ', () => {
  it('đo độ lệch với giờ máy chủ và đếm ngược theo giờ máy chủ', () => {
    const offset = clockOffsetMs('2026-10-06T08:00:10Z', Date.parse('2026-10-06T08:00:00Z'));
    expect(offset).toBe(10_000);
    // Máy em chạy chậm 10 giây: tới đúng hạn khi giờ máy chủ chạm hạn nộp.
    expect(secondsLeft('2026-10-06T08:10:10Z', offset, Date.parse('2026-10-06T08:00:00Z'))).toBe(600);
    expect(secondsLeft('2026-10-06T08:10:10Z', offset, Date.parse('2026-10-06T08:20:00Z'))).toBe(0);
  });

  it('không có hạn nộp thì không có đồng hồ', () => {
    expect(secondsLeft(null, 0, Date.now())).toBeNull();
    expect(clockOffsetMs('không phải ngày', 5)).toBe(0);
  });

  it('chữ đồng hồ và thời lượng', () => {
    expect(formatClock(765)).toBe('12:45');
    expect(formatClock(5400)).toBe('90:00');
    expect(formatClock(-3)).toBe('00:00');
    expect(formatDuration(750)).toBe('12 phút 30 giây');
    expect(formatDuration(45)).toBe('45 giây');
    expect(formatDuration(3900)).toBe('1 giờ 5 phút');
    expect(formatDuration(null)).toBe('');
  });
});

describe('điểm và sao', () => {
  it('định dạng điểm kiểu Việt Nam', () => {
    expect(formatScore(8, 10)).toBe('8/10');
    expect(formatScore(7.5, 10)).toBe('7,5/10');
    expect(formatScore(null, 10)).toBe('');
    expect(formatPercent(77.5)).toBe('77,5%');
    expect(formatPercent(null)).toBe('');
  });

  it('sao luôn trong khoảng 0-3 và điểm trung bình bỏ lượt không có điểm', () => {
    expect([clampStars(5), clampStars(-1), clampStars(null), clampStars(2)]).toEqual([3, 0, 0, 2]);
    expect(averagePercent([{ percent: 90 }, { percent: 62.5 }, { percent: 80 }, { percent: null }])).toBe(77.5);
    expect(averagePercent([{ percent: null }])).toBeNull();
  });
});

describe('trạng thái từng câu', () => {
  it('nhận biết câu đã trả lời theo từng dạng', () => {
    expect(hasAnswer(question(), { selectedIndex: 0 })).toBe(true);
    expect(hasAnswer(question(), {})).toBe(false);
    expect(hasAnswer(question(), null)).toBe(false);
    const matching = question({ questionType: 'MATCHING', leftItems: [{ content: 'a', imageUrl: null }], rightItems: ['x'] });
    expect(hasAnswer(matching, { matches: [null] })).toBe(false);
    expect(hasAnswer(matching, { matches: [0] })).toBe(true);
    const blank = question({ questionType: 'FILL_BLANK', blankCount: 2 });
    expect(hasAnswer(blank, { blanks: ['  ', null] })).toBe(false);
    expect(hasAnswer(blank, { blanks: [null, 'năm 1010'] })).toBe(true);
    const multi = question({ questionType: 'MULTI_TRUE_FALSE', statements: ['a', 'b'] });
    expect(hasAnswer(multi, { statements: [null, false] })).toBe(true);
  });

  it('câu sắp xếp chỉ tính khi đã đặt đủ mọi mục', () => {
    const ordering = question({ questionType: 'ORDERING', items: ['a', 'b', 'c'] });
    expect(hasAnswer(ordering, { order: [2, 0] })).toBe(false);
    expect(hasAnswer(ordering, { order: [2, 0, 1] })).toBe(true);
    expect(submissionToSave(ordering, { order: [2, 0] })).toEqual({});
    expect(submissionToSave(ordering, { order: [2, 0, 1] })).toEqual({ order: [2, 0, 1] });
  });

  it('thân gửi lên gọn đúng dạng; câu trống gửi {} để xóa', () => {
    expect(submissionToSave(question(), { selectedIndex: 2, order: [1] })).toEqual({ selectedIndex: 2 });
    expect(submissionToSave(question(), null)).toEqual({});
    const matching = question({
      questionType: 'MATCHING',
      leftItems: [
        { content: 'a', imageUrl: null },
        { content: 'b', imageUrl: null },
      ],
      rightItems: ['x', 'y'],
    });
    expect(submissionToSave(matching, { matches: [1] })).toEqual({ matches: [1, null] });
    const blank = question({ questionType: 'FILL_BLANK', blankCount: 2 });
    expect(submissionToSave(blank, { blanks: [' Lý Thái Tổ ', ''] })).toEqual({ blanks: ['Lý Thái Tổ', null] });
    const multi = question({ questionType: 'MULTI_TRUE_FALSE', statements: ['a', 'b', 'c'] });
    expect(submissionToSave(multi, { statements: [true] })).toEqual({ statements: [true, null, null] });
  });

  it('liệt kê vị trí các câu chưa trả lời', () => {
    const questions = [question({ questionId: 1 }), question({ questionId: 2 }), question({ questionId: 3 })];
    expect(unansweredPositions(questions, { 1: { selectedIndex: 0 }, 3: null })).toEqual([2, 3]);
  });

  it('nhóm các câu liền nhau dùng chung đoạn tư liệu', () => {
    const questions = [
      question({ passage: null }),
      question({ passage: 'Chiếu dời đô' }),
      question({ passage: 'Chiếu dời đô' }),
      question({ passage: 'Chiếu dời đô' }),
      question({ passage: 'Khác' }),
    ];
    expect(passageGroup(questions, 2)).toEqual({ first: 2, last: 4 });
    expect(passageGroup(questions, 4)).toEqual({ first: 5, last: 5 });
    expect(passageGroup(questions, 0)).toBeNull();
  });
});

describe('ghép cặp', () => {
  it('mỗi tên chỉ nối một hình: nối lại thì gỡ chỗ cũ', () => {
    expect(setMatch(null, 3, 0, 2)).toEqual([2, null, null]);
    expect(setMatch([2, null, null], 3, 1, 2)).toEqual([null, 2, null]);
    expect(clearMatch([2, 0, null], 3, 0)).toEqual([null, 0, null]);
  });
});

describe('sắp xếp', () => {
  it('chạm để đặt vào cuối hàng, chạm lần nữa để nhấc ra', () => {
    expect(toggleOrderItem(null, 2)).toEqual([2]);
    expect(toggleOrderItem([2, 0], 1)).toEqual([2, 0, 1]);
    expect(toggleOrderItem([2, 0, 1], 0)).toEqual([2, 1]);
  });

  it('đổi chỗ với mục kề, không vượt biên', () => {
    expect(moveOrderItem([2, 0, 1], 1, -1)).toEqual([0, 2, 1]);
    expect(moveOrderItem([2, 0, 1], 2, 1)).toEqual([2, 0, 1]);
  });
});

describe('điền từ và nhiều mệnh đề', () => {
  it('tách lời câu theo chỗ trống', () => {
    expect(splitBlanks('Vua ___ dời đô về ___ năm 1010.')).toEqual(['Vua ', ' dời đô về ', ' năm 1010.']);
    expect(splitBlanks('Không có chỗ trống')).toEqual(['Không có chỗ trống']);
  });

  it('điền từ vào chỗ trống đầu tiên còn trống, sửa từng chỗ', () => {
    expect(fillNextBlank(null, 2, 'Lý Thái Tổ')).toEqual(['Lý Thái Tổ', null]);
    expect(fillNextBlank(['Lý Thái Tổ', null], 2, 'Thăng Long')).toEqual(['Lý Thái Tổ', 'Thăng Long']);
    expect(fillNextBlank(['a', 'b'], 2, 'c')).toEqual(['a', 'b']);
    expect(setBlank(['a', 'b'], 2, 0, '')).toEqual([null, 'b']);
  });

  it('chọn Đúng hoặc Sai từng mệnh đề', () => {
    expect(setStatement(null, 3, 1, false)).toEqual([null, false, null]);
    expect(setStatement([true, null, null], 3, 0, false)).toEqual([false, null, null]);
  });
});

describe('huy hiệu', () => {
  it('luôn đủ bốn huy hiệu, huy hiệu chưa đạt không có lượt đạt', () => {
    const board = badgeBoard([
      { code: 'ON_TIME', name: 'Nộp đúng hạn', description: '', count: 2, lastEarnedAt: '2026-09-29T01:00:00Z', lastAttemptId: 4 },
    ]);
    expect(board.map((b) => b.code)).toEqual(['EXCELLENT', 'ON_TIME', 'PERFECT_SCORE', 'PERSEVERANCE']);
    expect(board.filter((b) => b.earned).map((b) => b.code)).toEqual(['ON_TIME']);
  });
});
