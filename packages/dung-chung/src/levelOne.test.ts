import { describe, expect, it } from 'vitest';
import { isSpeakableText } from './speech';
import type { AnswerCheck, AttemptQuestion, StudentClassLesson } from './api';
import {
  albumGroups,
  checksOnTap,
  daysLearnedText,
  LEVEL_ONE_FIXED_PHRASES,
  levelOneGreetingSpeech,
  levelOneStarsHeadline,
  isNewCard,
  levelOneInstruction,
  levelOneStations,
  lockedCardHint,
  nextLevelOneLesson,
  practiceFeedback,
  readyToCheck,
  retryAnswer,
} from './levelOne';

function question(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: 1,
    position: 1,
    point: null,
    questionType: 'IMAGE_CHOICE',
    typeName: 'Chọn hình đúng',
    content: 'Đâu là Chùa Một Cột?',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'Khuê Văn Các', imageUrl: 'a.jpg' },
      { content: 'Chùa Một Cột', imageUrl: 'b.jpg' },
      { content: 'Cầu Thê Húc', imageUrl: 'c.jpg' },
    ],
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

function check(overrides: Partial<AnswerCheck> = {}): AnswerCheck {
  return {
    questionId: 1,
    isCorrect: false,
    firstTryCorrect: false,
    tryCount: 1,
    parts: [false],
    correctAnswer: { selectedIndex: 1 },
    explanation: 'Chùa đứng trên một cây cột đá giữa hồ.',
    answeredCount: 1,
    questionCount: 5,
    ...overrides,
  };
}

function lesson(id: number, completed: boolean): StudentClassLesson {
  return {
    lessonId: id,
    title: `Bài ${id}`,
    accessCode: `BH${id}`,
    createdAt: null,
    thumbnailUrl: null,
    heritageNames: [],
    quizzesPublished: 1,
    quizzesDone: completed ? 1 : 0,
    stars: completed ? 3 : null,
    completed,
  };
}

describe('lời hướng dẫn và lúc kiểm', () => {
  it('mỗi dạng câu cấp 1 có lời hướng dẫn riêng', () => {
    expect(levelOneInstruction('IMAGE_CHOICE')).toBe('Em chạm vào hình đúng.');
    expect(levelOneInstruction('TRUE_FALSE')).toBe('Em chạm Đúng hoặc Sai.');
    expect(levelOneInstruction('MATCHING')).toContain('rồi chạm tên');
    expect(levelOneInstruction('ORDERING')).toContain('thứ tự');
  });

  it('dạng chọn kiểm ngay khi chạm, ghép cặp và sắp xếp cần bấm kiểm tra', () => {
    expect(checksOnTap('IMAGE_CHOICE')).toBe(true);
    expect(checksOnTap('TRUE_FALSE')).toBe(true);
    expect(checksOnTap('MATCHING')).toBe(false);
    expect(checksOnTap('ORDERING')).toBe(false);
  });

  it('ghép cặp chỉ kiểm được khi đã nối đủ mọi hình', () => {
    const matching = question({ questionType: 'MATCHING', leftItems: [{ content: 'a', imageUrl: null }, { content: 'b', imageUrl: null }], rightItems: ['x', 'y'] });
    expect(readyToCheck(matching, { matches: [1, null] })).toBe(false);
    expect(readyToCheck(matching, { matches: [1, 0] })).toBe(true);
    expect(readyToCheck(question(), null)).toBe(false);
    expect(readyToCheck(question(), { selectedIndex: 2 })).toBe(true);
  });
});

describe('bảng phản hồi', () => {
  it('đúng: khen và nhắc lại giải thích, câu cuối là "Xong rồi!"', () => {
    const feedback = practiceFeedback(question(), check({ isCorrect: true, parts: [true], firstTryCorrect: true }), { last: true });
    expect(feedback.tone).toBe('correct');
    expect(feedback.title).toBe('Đúng rồi!');
    expect(feedback.text).toBe('Chùa đứng trên một cây cột đá giữa hồ.');
    expect(feedback.action).toBe('Xong rồi!');
    expect(feedback.done).toBe(true);
  });

  it('sai lần đầu: gợi ý và cho thử lại, không nói lộ đáp án', () => {
    const feedback = practiceFeedback(question(), check(), { last: false });
    expect(feedback.tone).toBe('retry');
    expect(feedback.title).toBe('Chưa phải hình này.');
    expect(feedback.action).toBe('Thử lại');
    expect(feedback.done).toBe(false);
    expect(feedback.text).not.toContain('Chùa Một Cột');
  });

  it('sai lần hai: chỉ đáp án kèm giải thích', () => {
    const feedback = practiceFeedback(question(), check({ tryCount: 2 }), { last: false });
    expect(feedback.tone).toBe('reveal');
    expect(feedback.text).toBe('Chùa đứng trên một cây cột đá giữa hồ.');
    expect(feedback.action).toBe('Câu tiếp');
    expect(feedback.done).toBe(true);
  });

  it('câu Đúng/Sai chỉ đáp án ngay từ lần sai đầu', () => {
    const trueFalse = question({ questionType: 'TRUE_FALSE', options: [{ content: 'Đúng', imageUrl: null }, { content: 'Sai', imageUrl: null }] });
    const feedback = practiceFeedback(trueFalse, check({ correctAnswer: { selectedIndex: 0 }, explanation: null }), { last: false });
    expect(feedback.tone).toBe('reveal');
    expect(feedback.text).toBe('Đáp án đúng là: Đúng.');
  });

  it('chưa có giải thích thì nói đáp án bằng lời', () => {
    const feedback = practiceFeedback(question(), check({ tryCount: 2, explanation: '  ' }), { last: false });
    expect(feedback.text).toBe('Đáp án đúng là hình “Chùa Một Cột”.');
  });

  it('ghép cặp sai một phần: báo số cặp đúng', () => {
    const matching = question({ questionType: 'MATCHING' });
    const feedback = practiceFeedback(matching, check({ parts: [true, false, true] }), { last: false });
    expect(feedback.title).toBe('Gần đúng rồi!');
    expect(feedback.text).toContain('Em nối đúng 2 trên 3 cặp');
  });
});

describe('thử lại', () => {
  it('ghép cặp giữ cặp đúng, gỡ cặp sai', () => {
    const matching = question({ questionType: 'MATCHING', leftItems: [{ content: 'a', imageUrl: null }, { content: 'b', imageUrl: null }, { content: 'c', imageUrl: null }] });
    expect(retryAnswer(matching, { matches: [2, 0, 1] }, check({ parts: [true, false, false] }))).toEqual({ matches: [2, null, null] });
  });

  it('dạng chọn bỏ chọn, sắp xếp giữ nguyên', () => {
    expect(retryAnswer(question(), { selectedIndex: 0 }, check())).toBeNull();
    const ordering = question({ questionType: 'ORDERING', items: ['a', 'b', 'c'] });
    expect(retryAnswer(ordering, { order: [2, 0, 1] }, check({ parts: [false, true, false] }))).toEqual({ order: [2, 0, 1] });
  });
});

describe('con đường và album', () => {
  it('trạm đầu tiên chưa xong là trạm hiện tại, trạm sau vẫn mở', () => {
    const home = { classLessons: [lesson(1, true), lesson(2, false), lesson(3, false)] };
    expect(levelOneStations(home).map((s) => s.state)).toEqual(['done', 'current', 'open']);
    expect(nextLevelOneLesson(home)?.lessonId).toBe(2);
    expect(nextLevelOneLesson({ classLessons: [lesson(1, true)] })).toBeNull();
  });

  it('số ngày đã học và thẻ mới', () => {
    expect(daysLearnedText(12)).toBe('12 ngày đã học');
    expect(daysLearnedText(null)).toBe('0 ngày đã học');
    const now = Date.parse('2026-10-25T10:00:00Z');
    expect(isNewCard({ collected: true, collectedAt: '2026-10-20T10:00:00Z' }, now)).toBe(true);
    expect(isNewCard({ collected: true, collectedAt: '2026-10-01T10:00:00Z' }, now)).toBe(false);
    expect(isNewCard({ collected: false, collectedAt: null }, now)).toBe(false);
  });

  it('nhóm thẻ theo thứ tự xuất hiện và lời nhắc thẻ chưa có', () => {
    expect(albumGroups([{ groupName: 'A' }, { groupName: 'B' }, { groupName: 'A' }])).toEqual(['A', 'B']);
    expect(lockedCardHint({ lessonTitle: 'Chùa Một Cột' })).toBe('Học bài “Chùa Một Cột” để mở');
  });
});

describe('câu cố định để máy chủ tạo trước tiếng', () => {
  it('có lời hướng dẫn từng dạng, lời khen không giải thích, gợi ý thử lại và số sao, đều đọc được và không trùng', () => {
    const phrases = [...LEVEL_ONE_FIXED_PHRASES];
    expect(new Set(phrases).size).toBe(phrases.length);
    for (const phrase of phrases) expect(isSpeakableText(phrase)).toBe(true);

    for (const type of ['TRUE_FALSE', 'IMAGE_CHOICE', 'MATCHING', 'ORDERING', 'SINGLE_CHOICE'] as const) {
      expect(phrases).toContain(levelOneInstruction(type));
    }
    expect(phrases).toContain('Em chạm Đúng hoặc Sai.');
    expect(phrases).toContain('Đúng rồi! Em nhớ bài giỏi lắm!');
    expect(phrases).toContain('Giỏi quá! Em nhớ bài giỏi lắm!');
    expect(phrases).toContain('Chưa đúng rồi. Em nhớ lại câu chuyện rồi thử lại nhé!');
    expect(phrases).toContain('Chưa phải hình này. Em nhớ lại câu chuyện rồi chọn hình khác nhé!');
    expect(phrases).toContain('Chưa đúng rồi. Em thử nối lại các cặp nhé!');
    expect(phrases).toContain('Chưa đúng rồi. Em thử xếp lại các bước nhé!');
    expect(phrases).toContain('Em được 1 sao!');
    expect(phrases).toContain('Em được 3 sao!');
  });

  it('lời phản hồi cố định là đúng chữ practiceFeedback đọc to', () => {
    const q = question({ questionType: 'IMAGE_CHOICE', position: 2 });
    const right = practiceFeedback(q, check({ isCorrect: true, explanation: null }), { last: false });
    expect(LEVEL_ONE_FIXED_PHRASES).toContain(right.speech);
    const wrong = practiceFeedback(q, check({ isCorrect: false, tryCount: 1, parts: [false] }), { last: false });
    expect(LEVEL_ONE_FIXED_PHRASES).toContain(wrong.speech);
  });

  it('lời chào đọc to không có tên em', () => {
    expect(levelOneGreetingSpeech('Hôm nay mình học bài “Chùa Một Cột” nhé!')).toBe('Chào em! Hôm nay mình học bài “Chùa Một Cột” nhé!');
    expect(levelOneGreetingSpeech(null)).toBe('Chào em!');
    expect(levelOneGreetingSpeech('  ')).toBe('Chào em!');
    expect(levelOneStarsHeadline(2)).toBe('Em được 2 sao!');
  });
});
