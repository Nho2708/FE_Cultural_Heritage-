import type { AnswerCheck, AttemptQuestion, StudentAlbumCard, StudentAttempt, StudentClassLesson, StudentHome, StudentLesson, StudentSection } from '@dsvhvn/dung-chung/api';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../../i18n';
import { ThemeContext } from '../../theme/ThemeProvider';

// Dữ liệu mẫu giống máy chủ trả và bộ vẽ thử cho các màn hình cấp 1. Chỉ dùng trong test.

export function attemptQuestion(id: number, overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: id,
    position: id,
    point: null,
    questionType: 'IMAGE_CHOICE',
    typeName: 'Chọn hình đúng',
    content: `Câu ${id}`,
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'Khuê Văn Các', imageUrl: null },
      { content: 'Chùa Một Cột', imageUrl: null },
      { content: 'Cầu Thê Húc', imageUrl: null },
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

export function practiceAttempt(questions: AttemptQuestion[], overrides: Partial<StudentAttempt> = {}): StudentAttempt {
  return {
    id: 7,
    quizId: 3,
    quizName: 'Đố vui Chùa Một Cột',
    lessonId: 1,
    lessonTitle: 'Chùa Một Cột',
    level: 1,
    layout: 'STEP_BY_STEP',
    readAloud: false,
    practiceMode: true,
    showsClock: false,
    status: 'IN_PROGRESS',
    startedAt: '2026-10-25T08:00:00Z',
    deadline: null,
    remainingSeconds: null,
    serverTime: '2026-10-25T08:00:00Z',
    timeLimitMinutes: null,
    questionCount: questions.length,
    answeredCount: 0,
    totalPoint: null,
    questions,
    ...overrides,
  };
}

export function answerCheck(questionId: number, overrides: Partial<AnswerCheck> = {}): AnswerCheck {
  return {
    questionId,
    isCorrect: true,
    firstTryCorrect: true,
    tryCount: 1,
    parts: [true],
    correctAnswer: { selectedIndex: 1 },
    explanation: 'Chùa đứng trên một cây cột đá giữa hồ.',
    answeredCount: 1,
    questionCount: 3,
    ...overrides,
  };
}

export function classLesson(id: number, overrides: Partial<StudentClassLesson> = {}): StudentClassLesson {
  return {
    lessonId: id,
    title: `Bài ${id}`,
    accessCode: `BH${id}`,
    createdAt: '2026-10-01T00:00:00Z',
    thumbnailUrl: null,
    heritageNames: [],
    quizzesPublished: 1,
    quizzesDone: 0,
    stars: null,
    completed: false,
    ...overrides,
  };
}

export function studentHome(overrides: Partial<StudentHome> = {}): StudentHome {
  return {
    studentId: 1,
    studentCode: 'HS8K2QX7',
    fullName: 'Nguyễn Văn Minh',
    className: '2A',
    grade: 2,
    level: 1,
    levelName: 'Cấp 1',
    layout: 'STEP_BY_STEP',
    teacherName: 'Cô Lan',
    totalStars: 12,
    inProgress: [],
    openQuizzes: [],
    myLessons: [],
    recentBadges: [],
    streakDays: 5,
    cheer: 'Hôm nay mình học bài “Chùa Một Cột” nhé!',
    classLessons: [],
    albumCollected: 2,
    albumTotal: 6,
    ...overrides,
  };
}

export function albumCard(id: number, overrides: Partial<StudentAlbumCard> = {}): StudentAlbumCard {
  return {
    heritageId: id,
    slug: `di-san-${id}`,
    name: `Di sản ${id}`,
    shortDescription: null,
    thumbnailUrl: null,
    heritageType: 'TANGIBLE',
    groupName: 'Di tích và đồ vật xưa',
    collected: true,
    collectedAt: '2026-10-01T00:00:00Z',
    lessonId: id,
    lessonTitle: `Bài ${id}`,
    ...overrides,
  };
}

export function section(overrides: Partial<StudentSection>): StudentSection {
  return { type: 'READING', title: null, body: null, imageUrl: null, image: null, milestoneYear: null, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 0, ...overrides };
}

export function levelOneLesson(steps: Array<{ key: string; label: string }>, sections: StudentSection[], overrides: Partial<StudentLesson> = {}): StudentLesson {
  return {
    id: 1,
    accessCode: 'BH12345A',
    title: 'Chùa Một Cột',
    className: '2A',
    teacherName: 'Cô Lan',
    schoolLevel: 1,
    schoolLevelName: 'Cấp 1',
    layout: { layout: 'STEP_BY_STEP', sequentialFlow: true, steps },
    summary: 'Tóm tắt của bài.',
    keyPoints: ['Chùa đứng trên một cây cột'],
    sections,
    heritages: [{ id: 5, slug: 'chua-mot-cot', name: 'Chùa Một Cột', shortDescription: null, thumbnailUrl: null, provinceName: 'Hà Nội', latitude: 21, longitude: 105, hasTimeline: false }],
    quizzes: [{ id: 11, name: 'Đố vui', description: null, openAt: null, closeAt: null, timeLimitMinutes: null, questionCount: 4, state: 'OPEN', stateLabel: 'Đang mở' }],
    ...overrides,
  };
}

/** Chữ hiển thị nối lại của một nút Text. */
export function textOf(node: ReactTestInstance): string {
  return node.children.map((child) => (typeof child === 'string' ? child : textOf(child))).join('');
}

/** Vẽ một thành phần với chữ tiếng Việt và bộ giao diện cấp 1, kèm vài thao tác hay dùng. */
export async function renderLevelOne(element: ReactElement) {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  const wrap = (child: ReactElement) => (
    <I18nextProvider i18n={i18n}>
      <ThemeContext.Provider value={themeForLevel(1)}>{child}</ThemeContext.Provider>
    </I18nextProvider>
  );
  await act(async () => {
    tree = create(wrap(element));
  });
  const textNodes = () => tree.root.findAll((node) => (node.type as unknown) === 'Text');
  /** Chữ của mọi khối Text ngoài cùng (khối lồng trong khối khác đã nằm trong chữ của khối cha). */
  const texts = () => textNodes().map(textOf);
  const has = (text: string | RegExp) => texts().some((item) => (typeof text === 'string' ? item.includes(text) : text.test(item)));
  const pressable = (label: string) =>
    tree.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.props.onPress === 'function' &&
        typeof node.type !== 'string' &&
        (node.props.accessibilityLabel === label || node.findAll((child) => (child.type as unknown) === 'Text' && textOf(child) === label).length > 0),
    );
  const press = async (label: string) => {
    const found = pressable(label);
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => found[0]!.props.onPress());
  };
  const canPress = (label: string) => pressable(label).some((node) => !node.props.disabled);
  const toggle = async (label: string, value: boolean) => {
    const found = tree.root.findAll((node: ReactTestInstance) => typeof node.props.onValueChange === 'function' && node.props.accessibilityLabel === label);
    if (found.length === 0) throw new Error(`Không thấy công tắc ${label}`);
    await act(async () => found[0]!.props.onValueChange(value));
  };
  /** Báo kích thước cho khối có `onLayout` mang nhãn trợ năng này (trình vẽ thử không tự đo). */
  const layout = async (label: string, width: number) => {
    const found = tree.root.findAll((node: ReactTestInstance) => typeof node.props.onLayout === 'function' && node.props.accessibilityLabel === label);
    if (found.length === 0) throw new Error(`Không thấy khối ${label}`);
    await act(async () => found[0]!.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 600 } } }));
  };
  const update = async (next: ReactElement) => {
    await act(async () => tree.update(wrap(next)));
  };
  return { tree, texts, has, press, canPress, toggle, layout, update, unmount: () => act(() => tree.unmount()) };
}
