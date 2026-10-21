import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import type { LessonImageCredit, SchoolLevel, StudentLesson, StudentQuiz } from '../api';
import { LEARNING_THEMES } from '../theme';
import { canOpenQuiz, canTakeQuiz, imageCreditLine, milestonesOf, paragraphsOf, quizActionLabel, sectionsOf } from './lessonData';
import { LessonLinksProvider } from './LessonLinksProvider';
import { NO_LESSON_LINKS, type LessonLinks, type LessonQuizDialogProps } from './lessonLinks';
import { lessonScopeStyle } from './lessonScopeStyle';
import { LessonThemeScope } from './LessonThemeScope';
import { LessonView } from './LessonView';

afterEach(cleanup);

const quiz = (state: StudentQuiz['state']): StudentQuiz => ({
  id: 3,
  name: 'Kiểm tra số 3',
  description: null,
  openAt: null,
  closeAt: null,
  timeLimitMinutes: 15,
  questionCount: 10,
  state,
  stateLabel: 'Đang mở',
});

function lessonOf(level: SchoolLevel, overrides: Partial<StudentLesson> = {}): StudentLesson {
  return {
    id: 5,
    accessCode: 'BH7F3K2Q',
    title: 'Ngọ Môn',
    className: '7A1',
    teacherName: null,
    schoolLevel: level,
    schoolLevelName: `Cấp ${level}`,
    layout: { layout: 'FREE_STEPS', sequentialFlow: false, steps: [{ key: 'READ', label: 'Đọc bài' }, { key: 'QUIZ', label: 'Bài kiểm tra' }] },
    summary: 'Tóm tắt bài.',
    keyPoints: ['Ý chính một.'],
    sections: [],
    heritages: [{ id: 1, slug: 'hue', name: 'Cố đô Huế', shortDescription: null, thumbnailUrl: null, provinceName: 'Huế', latitude: 16, longitude: 107, hasTimeline: true }],
    quizzes: [quiz('OPEN')],
    ...overrides,
  };
}

/** Hộp thoại giả của web học tập: hiện mã bài và mã bài kiểm tra đang mở. */
function QuizDialogStub({ quizId, code }: LessonQuizDialogProps) {
  return quizId === null ? null : <dialog open>{`${code}/${quizId}`}</dialog>;
}

const REAL_LINKS: LessonLinks = {
  heritage: (slug) => `/di-san/${slug}`,
  map: (slug) => `/ban-do?chon=${slug}`,
  timeline: (slug) => `/dong-thoi-gian/${slug}`,
  quizDialog: QuizDialogStub,
  home: '/hoc',
  preview: false,
};

function show(lesson: StudentLesson, links: LessonLinks) {
  return render(
    <MemoryRouter>
      <LessonLinksProvider links={links}>
        <LessonView lesson={lesson} />
      </LessonLinksProvider>
    </MemoryRouter>,
  );
}

describe('hàm thuần của bố cục bài học', () => {
  it('tách đoạn, lọc phần theo loại, sắp mốc theo năm, bài kiểm tra làm được', () => {
    expect(paragraphsOf('Một.\n\nHai.\n  ')).toEqual(['Một.', 'Hai.']);
    expect(paragraphsOf(null)).toEqual([]);
    const lesson = lessonOf(2, {
      sections: [
        { type: 'MILESTONE', title: null, body: 'b', imageUrl: null, image: null, milestoneYear: 1900, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 2 },
        { type: 'MILESTONE', title: null, body: 'a', imageUrl: null, image: null, milestoneYear: 1800, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 1 },
        { type: 'READING', title: null, body: 'c', imageUrl: null, image: null, milestoneYear: null, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 3 },
      ],
    });
    expect(milestonesOf(lesson).map((m) => m.milestoneYear)).toEqual([1800, 1900]);
    expect(sectionsOf(lesson, 'READING')).toHaveLength(1);
    expect(canTakeQuiz(quiz('OPEN'))).toBe(true);
    expect(canTakeQuiz(quiz('IN_PROGRESS'))).toBe(true);
    expect(canTakeQuiz(quiz('CLOSED'))).toBe(false);
    expect(canOpenQuiz(quiz('SUBMITTED'))).toBe(true);
    expect(canOpenQuiz(quiz('NOT_OPEN'))).toBe(false);
    expect(quizActionLabel(quiz('SUBMITTED'))).toBe('Xem kết quả');
  });
});

describe('bố cục theo cấp', () => {
  it.each([
    [1, 'cap-1'],
    [2, 'cap-2'],
    [3, 'cap-3'],
  ] as const)('cấp %i dùng bố cục %s', (level, layout) => {
    const { container } = show(lessonOf(level), REAL_LINKS);
    expect(container.querySelector(`[data-bo-cuc="${layout}"]`)).not.toBeNull();
  });

  it.each([2, 3] as const)('cấp %i có đường dẫn thật: liên kết về trang học và nút làm bài mở hộp thoại', (level) => {
    show(lessonOf(level), REAL_LINKS);
    expect(screen.getAllByRole('link', { name: /Trang học của em/ })[0]?.getAttribute('href')).toBe('/hoc');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /^Làm bài/ })[0]!);
    expect(screen.getByRole('dialog').textContent).toBe('BH7F3K2Q/3');
  });

  it.each([1, 2, 3] as const)('cấp %i xem trước: không liên kết sang di sản, bản đồ, dòng thời gian, trang học hay làm bài', (level) => {
    show(lessonOf(level), NO_LESSON_LINKS);
    for (const link of screen.queryAllByRole('link')) expect(link.getAttribute('href')).toMatch(/^#/);
    expect(screen.queryByRole('link', { name: /Trang học/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Làm bài/ })).toBeNull();
  });

  it('xem trước không đặt tiêu đề trang của khu học', () => {
    show(lessonOf(2), NO_LESSON_LINKS);
    expect(document.title).not.toContain('DiViet');
  });
});

describe('bộ giao diện của một cấp ghi trên một khối', () => {
  it('ghi token ngữ nghĩa của cấp và cả token component mà bố cục dùng', () => {
    const style = lessonScopeStyle(1) as Record<string, string>;
    expect(style['--dsv-color-primary']).toBe(LEARNING_THEMES['cap-1'].color.primary);
    expect(style['--dsv-pill-bg']).toBe(LEARNING_THEMES['cap-1'].color.primary);
    expect(style['--dsv-tab-active-fg']).toBe(LEARNING_THEMES['cap-1'].color.primary);
    expect(style['--dsv-touch-target']).toBe('48px');
    expect((lessonScopeStyle(3) as Record<string, string>)['--dsv-color-primary']).toBe(LEARNING_THEMES['cap-3'].color.primary);
  });

  it('khối bọc mang khóa bộ giao diện và biến CSS của cấp, không đụng vào thẻ html', () => {
    const { container } = render(
      <LessonThemeScope level={2}>
        <p>Nội dung</p>
      </LessonThemeScope>,
    );
    const scope = container.querySelector('[data-bo-giao-dien="cap-2"]') as HTMLElement;
    expect(scope).not.toBeNull();
    expect(scope.style.getPropertyValue('--dsv-color-primary')).toBe(LEARNING_THEMES['cap-2'].color.primary);
    expect(document.documentElement.getAttribute('data-bo-giao-dien')).toBeNull();
  });
});

describe('dòng ghi công của hình', () => {
  const image: LessonImageCredit = { caption: null, credit: 'Daderot · CC0 · Wikimedia Commons', author: 'Daderot', license: 'CC0', source: 'Wikimedia Commons' };

  it('dùng dòng máy chủ đã ghép sẵn, không nối thêm ba phần (tránh lặp "… · Daderot · CC0 · Wikimedia Commons" hai lần)', () => {
    expect(imageCreditLine(image)).toBe('Daderot · CC0 · Wikimedia Commons');
  });

  it('không có dòng ghép sẵn thì ghép từ ba phần, bỏ phần trống; không có hình thì rỗng', () => {
    expect(imageCreditLine({ ...image, credit: null })).toBe('Daderot · CC0 · Wikimedia Commons');
    expect(imageCreditLine({ ...image, credit: '  ', license: null })).toBe('Daderot · Wikimedia Commons');
    // Dữ liệu cũ: dòng ghi công tự do kèm một phần riêng chưa có trong dòng đó thì nối thêm phần đó.
    expect(imageCreditLine({ credit: 'Quần thể di tích Cố đô Huế', author: null, license: 'CC BY-SA', source: null })).toBe('Quần thể di tích Cố đô Huế · CC BY-SA');
    expect(imageCreditLine({ credit: null, author: null, license: null, source: null })).toBe('');
    expect(imageCreditLine(null)).toBe('');
  });

  it('hình trong bài học cấp 2 hiện ghi công đúng một lần', () => {
    const lesson = lessonOf(2, {
      sections: [{ type: 'IMAGE', title: null, body: 'Cổng Ngọ Môn', imageUrl: 'https://anh.test/ngo-mon.jpg', image, milestoneYear: null, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 1 }],
    });
    show(lesson, REAL_LINKS);
    const caption = document.querySelector('figcaption')!;
    expect(caption.textContent).toBe('Cổng Ngọ Môn (Daderot · CC0 · Wikimedia Commons)');
  });
});
