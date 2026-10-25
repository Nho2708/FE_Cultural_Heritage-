import type { LessonCompletion, RecallQuestion } from '@dsvhvn/dung-chung/api';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import * as Speech from 'expo-speech';
import { act } from 'react-test-renderer';
import { LevelOneLesson, type LessonPosition } from './LevelOneLesson';
import { albumCard, levelOneLesson, renderLevelOne, section, textOf } from './testKit';

// Bài học cấp 1: thanh bước vòng tròn chỉ hiện chữ của bước đang ở; Nghe chuyện đọc từng câu và tô sáng câu đang đọc; bước Nhớ lại báo ngay
// (không thử lại) và bị bỏ khi không có câu ôn; bước Nhận thẻ ghi bài đã xong một lần và hiện thẻ, số thẻ, câu mang về nhà.

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const speak = Speech.speak as unknown as jest.Mock;
const PRIMARY_CONTAINER = themeForLevel(1).color.primaryContainer;

const FLOW = [
  { key: 'RECALL', label: 'Nhớ lại' },
  { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
  { key: 'VIEW_IMAGES', label: 'Xem hình' },
  { key: 'PLAY', label: 'Chơi' },
  { key: 'EARN_CARD', label: 'Nhận thẻ' },
];

const STORY = [section({ type: 'STORY', body: 'Giữa hồ có một ngôi chùa nhỏ. Chùa đứng trên một cây cột đá.', sortOrder: 1 }), section({ type: 'STORY', body: 'Đoạn hai của câu chuyện.', sortOrder: 2 })];

const RECALL: RecallQuestion[] = [
  { questionId: 31, questionType: 'TRUE_FALSE', content: 'Bánh chưng hình vuông?', imageUrl: null, options: [{ content: 'Đúng', imageUrl: null }, { content: 'Sai', imageUrl: null }], correctIndex: 0, explanation: 'Bánh chưng hình vuông, gói bằng lá dong.', heritageName: 'Bánh chưng', lessonTitle: 'Bánh chưng ngày Tết' },
  { questionId: 32, questionType: 'IMAGE_CHOICE', content: 'Đâu là đèn ông sao?', imageUrl: null, options: [{ content: 'Đèn ông sao', imageUrl: null }, { content: 'Tò he', imageUrl: null }], correctIndex: 0, explanation: null, heritageName: 'Đèn ông sao', lessonTitle: 'Đèn ông sao' },
];

const COMPLETION: LessonCompletion = {
  lessonId: 1,
  firstTime: true,
  cards: [albumCard(5, { name: 'Chùa Một Cột' })],
  albumCollected: 3,
  albumTotal: 8,
  takeHome: 'Nhà mình đã từng đi thăm Chùa Một Cột hay một di tích nào gần nhà chưa?',
};

/** Câu đang được tô sáng (nền xanh nhạt). */
function highlighted(view: Awaited<ReturnType<typeof renderLevelOne>>): string[] {
  return view.tree.root
    .findAll((node) => (node.type as unknown) === 'Text' && node.props.style && [node.props.style].flat().some((style: { backgroundColor?: string } | undefined) => style?.backgroundColor === PRIMARY_CONTAINER))
    .map(textOf);
}

beforeEach(async () => {
  speak.mockClear();
  mockPush.mockClear();
  const { prefs, KEYS } = jest.requireActual('../../storage/keyValue') as typeof import('../../storage/keyValue');
  await prefs.remove(KEYS.autoRead);
});

describe('bài học cấp 1', () => {
  it('Nghe chuyện đọc từng câu và tô sáng câu đang đọc', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(FLOW.slice(1), STORY)} />);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0]![0]).toBe('Giữa hồ có một ngôi chùa nhỏ.');
    expect(highlighted(view)).toEqual(['Giữa hồ có một ngôi chùa nhỏ. ']);

    // Câu một đọc xong thì sang câu hai, tô sáng theo.
    await act(async () => speak.mock.calls[0]![1].onDone());
    expect(speak.mock.calls[1]![0]).toBe('Chùa đứng trên một cây cột đá.');
    expect(highlighted(view)).toEqual(['Chùa đứng trên một cây cột đá.']);
    expect(view.tree.root.findAll((node) => node.props.accessibilityLabel === 'Đoạn 1 trên 2').length).toBeGreaterThan(0);

    await view.press('Tiếp nhé');
    expect(speak.mock.calls.at(-1)![0]).toBe('Đoạn hai của câu chuyện.');
  });

  it('em tắt tự đọc thì dừng và đoạn sau không tự đọc', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(FLOW.slice(1), STORY)} />);
    await view.toggle('Tự đọc to', false);
    expect(Speech.stop).toHaveBeenCalled();
    const before = speak.mock.calls.length;
    await view.press('Tiếp nhé');
    expect(speak.mock.calls.length).toBe(before);
  });

  it('thanh bước báo bước đang ở bằng chữ "tên bước · bước i trên n"', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(FLOW.slice(1), STORY)} initial={{ step: 2, part: 0 }} />);
    const bar = view.tree.root.findAll((node) => node.props.accessibilityRole === 'progressbar')[0]!;
    expect(bar.props.accessibilityValue).toMatchObject({ min: 1, max: 4, now: 3, text: 'Chơi · bước 3 trên 4' });
    expect(view.has('Chơi · bước 3 trên 4')).toBe(true);
    expect(view.has('Bắt đầu chơi')).toBe(true);
  });

  it('bước Nhớ lại: chạm là báo ngay, không thử lại, rồi sang Nghe chuyện', async () => {
    const recall = jest.fn(async () => ({ questions: RECALL }));
    const positions: LessonPosition[] = [];
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(FLOW, STORY)} services={{ recall }} onPositionChange={(position) => positions.push(position)} />);
    expect(recall).toHaveBeenCalledTimes(1);
    expect(view.has('Nhớ lại bài trước')).toBe(true);
    expect(view.has('Bài “Bánh chưng ngày Tết”')).toBe(true);
    expect(view.has('Nhớ lại · bước 1 trên 5')).toBe(true);

    await view.press('Sai');
    expect(view.has('Đáp án đúng ở đây nè!')).toBe(true);
    expect(view.has('Bánh chưng hình vuông, gói bằng lá dong.')).toBe(true);
    expect(view.canPress('Đúng')).toBe(false);

    await view.press('Câu tiếp');
    expect(view.has('Đâu là đèn ông sao?')).toBe(true);
    await view.press('Đèn ông sao');
    expect(view.has('Giỏi quá!')).toBe(true);
    await view.press('Nghe chuyện mới');
    expect(view.has('Nghe chuyện · bước 2 trên 5')).toBe(true);
    expect(positions.at(-1)).toEqual({ step: 1, part: 0, key: 'LISTEN_STORY' });
  });

  it('không có câu ôn thì bỏ bước Nhớ lại', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(FLOW, STORY)} services={{ recall: async () => ({ questions: [] }) }} />);
    expect(view.has('Nhớ lại bài trước')).toBe(false);
    expect(view.has('Nghe chuyện · bước 1 trên 4')).toBe(true);
  });

  it('mở lại đúng bước đang dừng theo tên bước dù bước Nhớ lại đã ẩn', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(FLOW, STORY)} services={{ recall: async () => ({ questions: [] }) }} initial={{ step: 3, part: 0, key: 'PLAY' }} />);
    expect(view.has('Chơi · bước 3 trên 4')).toBe(true);
  });

  it('bước Nhận thẻ ghi bài đã xong một lần và hiện thẻ, album, câu mang về nhà', async () => {
    const complete = jest.fn(async () => COMPLETION);
    const onCompleted = jest.fn();
    const view = await renderLevelOne(
      <LevelOneLesson lesson={levelOneLesson(FLOW.slice(1), STORY)} services={{ complete }} initial={{ step: 3, part: 0 }} onCompleted={onCompleted} />,
    );
    expect(complete).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledWith(COMPLETION);
    for (const text of ['Chùa Một Cột', 'Thẻ mới vào album', 'Album của em có 3 thẻ', 'Về nhà hỏi bố mẹ nhé', COMPLETION.takeHome!, 'Em nhớ nhé', 'Về con đường', 'Xem album']) {
      expect(view.has(text)).toBe(true);
    }
    expect(view.has('Tiếp nhé')).toBe(false);
    await view.press('Xem album');
    expect(mockPush).toHaveBeenCalledWith('/album');
  });

  it('bài cũ còn bước Nhận sao thì coi như Nhận thẻ; mất mạng thì có nút Thử lại', async () => {
    const complete = jest.fn().mockRejectedValueOnce(new Error('mất mạng')).mockResolvedValueOnce({ ...COMPLETION, firstTime: false });
    const steps = [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'EARN_STARS', label: 'Nhận sao' },
    ];
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(steps, STORY)} services={{ complete }} initial={{ step: 1, part: 0 }} />);
    expect(view.has('Chưa nhận được thẻ. Em bấm Thử lại nhé.')).toBe(true);
    await view.press('Thử lại');
    expect(complete).toHaveBeenCalledTimes(2);
    expect(view.has('Đã có trong album')).toBe(true);
  });
});
