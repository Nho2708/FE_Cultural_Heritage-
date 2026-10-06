import type { StudentLesson, StudentSection } from '@dsvhvn/dung-chung/api';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { LevelOneLesson, LevelThreeLesson, LevelTwoLesson } from './LevelLessons';

// Ba bố cục bài học vẽ bằng bộ vẽ của React Native với dữ liệu giống máy chủ trả: cấp 1 đi từng bước, cấp 2 chuyển qua lại giữa các bước, cấp 3 là trang tài liệu.

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function section(overrides: Partial<StudentSection>): StudentSection {
  return { type: 'READING', title: null, body: null, imageUrl: null, image: null, milestoneYear: null, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 0, ...overrides };
}

function lessonOf(level: 1 | 2 | 3, steps: Array<{ key: string; label: string }>, sections: StudentSection[]): StudentLesson {
  return {
    id: 1,
    accessCode: 'BH12345A',
    title: 'Hoàng thành Thăng Long',
    className: '8A1',
    teacherName: 'Cô Linh',
    schoolLevel: level,
    schoolLevelName: `Cấp ${level}`,
    layout: { layout: level === 1 ? 'STEP_BY_STEP' : level === 2 ? 'FREE_STEPS' : 'DOCUMENT', sequentialFlow: level === 1, steps },
    summary: 'Tóm tắt của bài.\nĐoạn hai của tóm tắt.',
    keyPoints: ['Ý chính một', 'Ý chính hai'],
    sections,
    heritages: [{ id: 5, slug: 'hoang-thanh', name: 'Hoàng thành Thăng Long', shortDescription: null, thumbnailUrl: null, provinceName: 'Hà Nội', latitude: 21, longitude: 105, hasTimeline: true }],
    quizzes: [
      { id: 11, name: 'Đố vui', description: null, openAt: null, closeAt: null, timeLimitMinutes: null, questionCount: 4, state: 'OPEN', stateLabel: 'Đang mở' },
      { id: 12, name: 'Kiểm tra', description: 'Đọc kỹ từng câu', openAt: null, closeAt: null, timeLimitMinutes: 15, questionCount: 8, state: 'SUBMITTED', stateLabel: 'Đã nộp' },
    ],
  };
}

async function render(level: 1 | 2 | 3, element: React.ReactElement) {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={themeForLevel(level)}>{element}</ThemeContext.Provider>
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string | RegExp) => texts().some((item) => (typeof text === 'string' ? item.includes(text) : text.test(item)));
  /** Chạm nút theo nhãn trợ năng hoặc theo chữ hiển thị bên trong. */
  const press = async (label: string) => {
    const found = tree.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.props.onPress === 'function' &&
        (node.props.accessibilityLabel === label || node.findAll((child) => (child.type as unknown) === 'Text' && [child.props.children].flat().join('') === label).length > 0),
    );
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => found[0]!.props.onPress());
  };
  return { has, press };
}

describe('bố cục bài học theo cấp', () => {
  const story = [
    section({ type: 'STORY', title: 'Hình một', body: 'Đoạn một của câu chuyện.', imageUrl: 'https://img.test/a.jpg', sortOrder: 1 }),
    section({ type: 'STORY', body: 'Đoạn hai của câu chuyện.', sortOrder: 2 }),
  ];

  it('cấp 1 đi lần lượt Nghe chuyện → Xem hình → Chơi → Nhận sao và nhớ vị trí', async () => {
    const steps = [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'VIEW_IMAGES', label: 'Xem hình' },
      { key: 'PLAY', label: 'Chơi' },
      { key: 'EARN_STARS', label: 'Nhận sao' },
    ];
    const positions: Array<{ step: number; part: number }> = [];
    const view = await render(1, <LevelOneLesson lesson={lessonOf(1, steps, story)} onPositionChange={(position) => positions.push(position)} />);
    expect(view.has('Đoạn một của câu chuyện.')).toBe(true);
    expect(view.has('Đoạn 1 / 2')).toBe(true);
    await view.press('Tiếp nhé');
    expect(view.has('Đoạn hai của câu chuyện.')).toBe(true);
    await view.press('Tiếp nhé');
    await view.press('Tiếp nhé');
    expect(view.has('Bài chơi của em')).toBe(true);
    expect(view.has('Đố vui')).toBe(true);
    await view.press('Tiếp nhé');
    expect(view.has('Em học xong rồi! Giỏi quá!')).toBe(true);
    expect(view.has('Ý chính một')).toBe(true);
    expect(positions.at(-1)).toEqual({ step: 3, part: 0 });
  });

  it('cấp 1 mở lại đúng bước đang dừng', async () => {
    const steps = [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'PLAY', label: 'Chơi' },
    ];
    const view = await render(1, <LevelOneLesson lesson={lessonOf(1, steps, story)} initial={{ step: 1, part: 0 }} />);
    expect(view.has('Bài chơi của em')).toBe(true);
  });

  it('cấp 2 chuyển qua lại giữa Đọc bài, Dòng thời gian và Bài kiểm tra', async () => {
    const steps = [
      { key: 'READ', label: 'Đọc bài' },
      { key: 'TIMELINE', label: 'Dòng thời gian' },
      { key: 'QUIZ', label: 'Bài kiểm tra' },
    ];
    const sections = [section({ type: 'READING', title: 'Phần một', body: 'Nội dung phần một.' }), section({ type: 'MILESTONE', milestoneYear: 1010, milestoneLabel: '1010', body: 'Dời đô.' })];
    const view = await render(2, <LevelTwoLesson lesson={lessonOf(2, steps, sections)} />);
    expect(view.has('Nội dung phần một.')).toBe(true);
    expect(view.has('Ý chính hai')).toBe(true);
    await view.press('Dòng thời gian của bài');
    expect(view.has('Dời đô.')).toBe(true);
    await view.press('Bài kiểm tra của bài');
    expect(view.has('Mỗi em chỉ làm mỗi bài kiểm tra một lần.')).toBe(true);
    expect(view.has('Đang mở')).toBe(true);
    expect(view.has('Đã nộp')).toBe(true);
  });

  it('cấp 3 là trang tài liệu: nội dung, mốc, tư liệu gốc, câu hỏi gợi suy nghĩ, ý chính, bài kiểm tra', async () => {
    const sections = [
      section({ type: 'READING', title: 'Bối cảnh', body: 'Nội dung bối cảnh.' }),
      section({ type: 'MILESTONE', milestoneLabel: '1010', milestoneYear: 1010, body: 'Dời đô về Thăng Long.' }),
      section({ type: 'SOURCE_EXCERPT', body: 'Mùa thu năm Canh Tuất', sourceCitation: 'Đại Việt sử ký toàn thư' }),
      section({ type: 'REFLECTION', body: 'Vì sao dời đô?' }),
    ];
    const view = await render(3, <LevelThreeLesson lesson={lessonOf(3, [], sections)} />);
    for (const text of ['Nội dung chính', 'Bối cảnh', 'Các mốc thời gian', 'Dời đô về Thăng Long.', 'Tư liệu gốc', 'Nguồn: Đại Việt sử ký toàn thư', 'Câu hỏi gợi suy nghĩ', 'Vì sao dời đô?', 'Ý chính', 'Bài kiểm tra của bài']) {
      expect(view.has(text)).toBe(true);
    }
  });
});
