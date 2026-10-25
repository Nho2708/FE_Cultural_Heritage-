import type { StudentAlbum, StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { AlbumScreen } from './AlbumScreen';
import { LevelOneResult } from './LevelOneResult';
import { albumCard, renderLevelOne } from './testKit';

// Album di sản và trang kết quả cấp 1: thẻ đã có mở ra đọc được mẩu chuyện, thẻ chưa có chỉ bài sẽ mở nó, lọc theo nhóm; kết quả có sao, lời
// khen, thẻ đã vào album, câu mang về nhà và phần xem lại thu gọn.

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = Date.parse('2026-10-25T08:00:00Z');

const ALBUM: StudentAlbum = {
  collected: 2,
  total: 3,
  cards: [
    albumCard(1, { name: 'Chùa Một Cột', slug: 'chua-mot-cot', shortDescription: 'Chùa đứng trên một cây cột đá giữa hồ.', collectedAt: '2026-10-24T08:00:00Z' }),
    albumCard(2, { name: 'Đèn ông sao', groupName: 'Lễ hội, nghề và làn điệu', heritageType: 'INTANGIBLE', collectedAt: '2026-09-01T08:00:00Z' }),
    albumCard(3, { name: 'Múa rối nước', groupName: 'Lễ hội, nghề và làn điệu', collected: false, collectedAt: null, lessonTitle: 'Múa rối nước' }),
  ],
};

describe('album di sản', () => {
  it('đầu trang có số thẻ; thẻ mới có nhãn Mới; thẻ chưa có chỉ bài sẽ mở nó', async () => {
    const view = await renderLevelOne(<AlbumScreen album={ALBUM} onBack={jest.fn()} onOpenHeritage={jest.fn()} now={NOW} />);
    expect(view.has('Album di sản')).toBe(true);
    expect(view.has('2 / 3 thẻ')).toBe(true);
    expect(view.texts().filter((text) => text === 'Mới')).toHaveLength(1);
    expect(view.has('Học bài “Múa rối nước” để mở')).toBe(true);
    expect(view.has('Em học xong một bài là có thẻ đầu tiên!')).toBe(false);
  });

  it('lọc theo nhóm', async () => {
    const view = await renderLevelOne(<AlbumScreen album={ALBUM} onBack={jest.fn()} onOpenHeritage={jest.fn()} now={NOW} />);
    await view.press('Lễ hội, nghề và làn điệu');
    expect(view.has('Chùa Một Cột')).toBe(false);
    expect(view.has('Đèn ông sao')).toBe(true);
    await view.press('Tất cả');
    expect(view.has('Chùa Một Cột')).toBe(true);
  });

  it('chạm thẻ đã có mở mẩu chuyện có nút nghe và lối xem về di sản', async () => {
    const onOpenHeritage = jest.fn();
    const view = await renderLevelOne(<AlbumScreen album={ALBUM} onBack={jest.fn()} onOpenHeritage={onOpenHeritage} now={NOW} />);
    await view.press('Xem thẻ Chùa Một Cột, Mới');
    expect(view.has('Chùa đứng trên một cây cột đá giữa hồ.')).toBe(true);
    expect(view.tree.root.findAll((node) => node.props.accessibilityLabel === 'Nghe chuyện về Chùa Một Cột').length).toBeGreaterThan(0);
    await view.press('Xem về di sản này');
    expect(onOpenHeritage).toHaveBeenCalledWith('chua-mot-cot');
  });

  it('chưa có thẻ nào thì nhắc em học xong một bài', async () => {
    const view = await renderLevelOne(<AlbumScreen album={{ collected: 0, total: 1, cards: [ALBUM.cards[2]!] }} onBack={jest.fn()} onOpenHeritage={jest.fn()} now={NOW} />);
    expect(view.has('Em học xong một bài là có thẻ đầu tiên!')).toBe(true);
  });
});

describe('kết quả cấp 1', () => {
  const result = {
    attemptId: 7,
    level: 1,
    stars: 2,
    praise: 'Em nhớ đúng ngay 2 trên 3 câu về Chùa Một Cột!',
    badges: [{ code: 'FIRST_QUIZ', name: 'Bài đầu tiên', description: 'Nộp bài đầu tiên' }],
    answersShown: true,
    questions: [
      {
        question: { questionId: 1, position: 1, content: 'Đâu là Chùa Một Cột?', questionType: 'IMAGE_CHOICE', options: [{ content: 'Chùa Một Cột', imageUrl: null }], answer: { selectedIndex: 0 } },
        isCorrect: false,
        correctAnswer: { selectedIndex: 0 },
        explanation: 'Chùa đứng trên một cây cột.',
        partsCorrect: null,
        partsTotal: null,
      },
    ],
    firstTryCorrect: 2,
    cards: [albumCard(5, { name: 'Chùa Một Cột' })],
    albumCollected: 5,
    albumTotal: 8,
    takeHome: 'Nhà mình đã từng đi thăm Chùa Một Cột chưa?',
  } as unknown as StudentAttemptResult;

  it('sao, lời khen, thẻ đã vào album, câu mang về nhà và nút về con đường', async () => {
    const view = await renderLevelOne(<LevelOneResult result={result} />);
    for (const text of ['Em được 2 sao!', 'Em nhớ đúng ngay 2 trên 3 câu về Chùa Một Cột!', 'Đã vào album của em · 5 thẻ', 'Về nhà hỏi bố mẹ nhé', 'Bài đầu tiên', 'Về con đường', 'Xem album']) {
      expect(view.has(text)).toBe(true);
    }
    expect(view.has('Sai')).toBe(false);
    expect(view.has('Đâu là Chùa Một Cột?')).toBe(false);
    await view.press('Xem lại các câu');
    expect(view.has('Đâu là Chùa Một Cột?')).toBe(true);
    expect(view.has('Chưa đúng')).toBe(true);
    await view.press('Về con đường');
    expect(mockReplace).toHaveBeenCalledWith('/(hoc-sinh)/hoc');
  });
});
