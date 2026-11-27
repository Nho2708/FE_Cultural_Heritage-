import type { AttemptQuestion } from '@dsvhvn/dung-chung/api';
import { createI18n } from '../i18n';
import { studentVi } from '../i18n/strings/hocsinh';
import { parseAutoRead } from './autoRead';
import { clockText, percentText, remainingText, starsText, stepSegments } from './format';
import { answerLines, type ReviewWords } from './reviewText';

const WORDS: ReviewWords = { yes: 'Đúng', no: 'Sai', empty: '(chưa trả lời)', imageN: (letter) => `Hình ${letter}` };

function question(overrides: Partial<AttemptQuestion>): AttemptQuestion {
  return {
    questionId: 1,
    position: 1,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: 'Câu hỏi',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'Hà Nội', imageUrl: null },
      { content: 'Huế', imageUrl: null },
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

describe('chữ hiển thị của khu học', () => {
  it('thời gian còn lại bằng lời', () => {
    expect(remainingText(45)).toBe('45 giây');
    expect(remainingText(725)).toBe('12 phút 05 giây');
    expect(remainingText(3900)).toBe('1 giờ 05 phút');
    expect(remainingText(-5)).toBe('0 giây');
    expect(remainingText(null)).toBe('0 giây');
  });

  it('đồng hồ, sao và phần trăm', () => {
    expect(clockText(65)).toBe('01:05');
    expect(clockText(3725)).toBe('1:02:05');
    expect(starsText(2)).toBe('★★☆');
    expect(starsText(9)).toBe('★★★');
    expect(starsText(null)).toBe('☆☆☆');
    expect(percentText(77.5)).toBe('78%');
    expect(percentText(null)).toBe('');
  });

  it('thanh tiến trình bước ở cấp 1: bước đã qua, bước đang học, bước còn lại', () => {
    expect(stepSegments(0, 4)).toEqual(['current', 'todo', 'todo', 'todo']);
    expect(stepSegments(2, 4)).toEqual(['done', 'done', 'current', 'todo']);
    expect(stepSegments(3, 4)).toEqual(['done', 'done', 'done', 'current']);
    expect(stepSegments(9, 3)).toEqual(['done', 'done', 'current']);
    expect(stepSegments(-1, 2)).toEqual(['current', 'todo']);
    expect(stepSegments(0, 0)).toEqual([]);
  });

  it('tự đọc to mặc định bật, chỉ giá trị "0" đã lưu mới tắt', () => {
    expect(parseAutoRead(null)).toBe(true);
    expect(parseAutoRead('1')).toBe(true);
    expect(parseAutoRead('lạ')).toBe(true);
    expect(parseAutoRead('0')).toBe(false);
  });

  it('khu học chỉ tiếng Việt: ngôn ngữ khác lùi về tiếng Việt, phần công khai theo ngôn ngữ', async () => {
    const instance = createI18n('ko');
    expect(instance.t('hs.login.title')).toBe(studentVi.login.title);
    expect(instance.t('tabs.search')).toBe('검색');
    await instance.changeLanguage('ja');
    expect(instance.t('hs.quiz.true')).toBe('Đúng');
    expect(instance.t('hs.home.hello', { name: 'An' })).toBe('Chào An');
  });
});

describe('xem lại câu trả lời', () => {
  it('chọn một phương án và câu để trống', () => {
    expect(answerLines(question({}), { selectedIndex: 1 }, WORDS)).toEqual(['B. Huế']);
    expect(answerLines(question({}), null, WORDS)).toEqual(['(chưa trả lời)']);
    expect(answerLines(question({}), { selectedIndex: null }, WORDS)).toEqual(['(chưa trả lời)']);
  });

  it('ghép cặp theo thứ tự đang hiện, chỗ chưa nối báo chưa trả lời', () => {
    const q = question({ questionType: 'MATCHING', leftItems: [{ content: 'Chùa Một Cột', imageUrl: null }, { content: null, imageUrl: 'x.jpg' }], rightItems: ['Hà Nội', 'Huế'] });
    expect(answerLines(q, { matches: [1, null] }, WORDS)).toEqual(['Chùa Một Cột → Huế', 'Hình 2 → (chưa trả lời)']);
  });

  it('sắp xếp, điền từ và nhiều mệnh đề', () => {
    expect(answerLines(question({ questionType: 'ORDERING', items: ['Một', 'Hai', 'Ba'] }), { order: [2, 0, 1] }, WORDS)).toEqual(['1. Ba', '2. Một', '3. Hai']);
    expect(answerLines(question({ questionType: 'FILL_BLANK', blankCount: 2 }), { blanks: ['Thăng Long', null] }, WORDS)).toEqual(['1. Thăng Long', '2. (chưa trả lời)']);
    expect(answerLines(question({ questionType: 'MULTI_TRUE_FALSE', statements: ['Ý một', 'Ý hai', 'Ý ba'] }), { statements: [true, false, null] }, WORDS)).toEqual(['a) Ý một: Đúng', 'b) Ý hai: Sai', 'c) Ý ba: (chưa trả lời)']);
  });
});
