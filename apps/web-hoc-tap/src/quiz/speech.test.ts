import { practiceFeedback } from '@dsvhvn/dung-chung';
import type { AnswerCheck, AttemptQuestion, QuestionType } from '@dsvhvn/dung-chung/api';
import { describe, expect, it } from 'vitest';
import { levelOneSpeech } from './speech';

// Lời đọc to của bài chơi cấp 1. Máy chủ tạo trước tiếng theo đúng chữ này lúc thầy cô phát hành và lúc em bắt đầu lượt, nên chữ phải trùng
// từng ký tự với lời máy chủ dựng. Các câu mẫu ở đây giống hệt câu mẫu trong kiểm thử lời đọc cấp 1 của máy chủ, đổi bên nào thì đổi cả hai.

function question(questionType: QuestionType, content: string, overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: 1,
    position: 1,
    point: null,
    questionType,
    typeName: '',
    content,
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

function check(isCorrect: boolean, tryCount: number, explanation: string | null): AnswerCheck {
  return {
    questionId: 1,
    isCorrect,
    firstTryCorrect: isCorrect,
    tryCount,
    parts: [isCorrect],
    correctAnswer: { selectedIndex: 0 },
    explanation,
    answeredCount: 1,
    questionCount: 1,
  };
}

describe('Lời đọc câu hỏi của bài chơi cấp 1 (trùng với lời máy chủ tạo trước)', () => {
  it('chọn một đáp án: chỗ trống đọc là "chỗ trống", rồi các phương án có chữ cái, rồi lời hướng dẫn', () => {
    const q = question('SINGLE_CHOICE', 'Vua nào dời đô về ___?', {
      options: [
        { content: 'Lý Thái Tổ', imageUrl: null },
        { content: null, imageUrl: 'h.jpg' },
        { content: 'Trần Hưng Đạo', imageUrl: null },
      ],
    });
    expect(levelOneSpeech(q)).toBe('Vua nào dời đô về chỗ trống? A: Lý Thái Tổ. B: hình. C: Trần Hưng Đạo. Em chọn câu trả lời nhé.');
  });

  it('Đúng/Sai và chọn hình không đọc phương án', () => {
    expect(levelOneSpeech(question('TRUE_FALSE', 'Hội Gióng có ở Phù Đổng', { options: [{ content: 'Đúng', imageUrl: null }] }))).toBe(
      'Hội Gióng có ở Phù Đổng. Em chạm Đúng hoặc Sai.',
    );
    expect(levelOneSpeech(question('IMAGE_CHOICE', '  Hình nào là đình làng?  ', { options: [{ content: 'Đình làng', imageUrl: 'a.jpg' }] }))).toBe(
      'Hình nào là đình làng? Em chạm vào hình đúng.',
    );
  });

  it('ghép cặp đọc tên các hình, sắp xếp đọc các bước, theo thứ tự đang hiện', () => {
    expect(levelOneSpeech(question('MATCHING', 'Nối hình với tên', { rightItems: ['Chùa Một Cột', 'Văn Miếu!'] }))).toBe(
      'Nối hình với tên. Chùa Một Cột. Văn Miếu! Em chạm một hình, rồi chạm tên của hình đó.',
    );
    expect(levelOneSpeech(question('ORDERING', 'Xếp các bước làm tranh Đông Hồ:', { items: ['Vẽ mẫu', ' ', 'Khắc ván'] }))).toBe(
      'Xếp các bước làm tranh Đông Hồ: Vẽ mẫu. Khắc ván. Em chạm các bước theo đúng thứ tự.',
    );
  });

  it('lời phản hồi có giải thích: lời khen theo vị trí câu, lời chỉ đáp án khi sai lần hai', () => {
    const second = question('SINGLE_CHOICE', 'Câu hai', { position: 2 });
    expect(practiceFeedback(second, check(true, 1, '  Đình làng có mái cong. '), { last: false }).speech).toBe('Giỏi quá! Đình làng có mái cong.');
    expect(practiceFeedback(second, check(false, 2, '  Đình làng có mái cong. '), { last: false }).speech).toBe(
      'Đáp án đúng ở đây nè! Đình làng có mái cong.',
    );
    const fourth = question('TRUE_FALSE', 'Câu bốn', { position: 4 });
    expect(practiceFeedback(fourth, check(true, 1, 'Đúng vậy.'), { last: true }).speech).toBe('Đúng rồi! Đúng vậy.');
  });
});
