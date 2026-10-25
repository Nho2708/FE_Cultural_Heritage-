import type { StudentLesson, StudentSection } from '@dsvhvn/dung-chung/api';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { LevelThreeLesson, LevelTwoLesson } from './LevelLessons';

// Bố cục bài học cấp 2, 3 vẽ bằng bộ vẽ của React Native với dữ liệu giống máy chủ trả: cấp 2 chuyển qua lại giữa các bước, cấp 3 là trang tài liệu.
// Bài học cấp 1 kiểm ở levelOne/LevelOneLesson.test.tsx.

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
  /** Gạt công tắc theo nhãn trợ năng. */
  const toggle = async (label: string, value: boolean) => {
    const found = tree.root.findAll((node: ReactTestInstance) => typeof node.props.onValueChange === 'function' && node.props.accessibilityLabel === label);
    if (found.length === 0) throw new Error(`Không thấy công tắc ${label}`);
    await act(async () => found[0]!.props.onValueChange(value));
  };
  /** Giá trị của thanh tiến trình. */
  const progress = () => tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityRole === 'progressbar')[0]?.props.accessibilityValue;
  return { has, press, toggle, progress };
}

describe('bố cục bài học theo cấp', () => {
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
