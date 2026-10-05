import type { SchoolLevel, StudentHeritageCard, StudentLesson, StudentQuiz, StudentSection } from '@dsvhvn/dung-chung/api';

// Bài học như học sinh nhận từ máy chủ, đã lọc theo khung của cấp lớp em.

const FLOW: Record<SchoolLevel, StudentLesson['layout']> = {
  1: {
    layout: 'STEP_BY_STEP',
    sequentialFlow: true,
    steps: [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'VIEW_IMAGES', label: 'Xem hình' },
      { key: 'PLAY', label: 'Chơi' },
      { key: 'EARN_STARS', label: 'Nhận sao' },
    ],
  },
  2: {
    layout: 'FREE_STEPS',
    sequentialFlow: false,
    steps: [
      { key: 'READ', label: 'Đọc bài' },
      { key: 'TIMELINE', label: 'Xem dòng thời gian' },
      { key: 'QUIZ', label: 'Làm bài kiểm tra' },
      { key: 'EXPLANATION', label: 'Xem giải thích' },
    ],
  },
  3: {
    layout: 'DOCUMENT',
    sequentialFlow: false,
    steps: [
      { key: 'DOCUMENT', label: 'Đọc tài liệu' },
      { key: 'TIMED_QUIZ', label: 'Làm bài kiểm tra có giờ' },
      { key: 'RESULT_ANALYSIS', label: 'Xem phân tích kết quả' },
    ],
  },
};

export function studentSectionOf(overrides: Partial<StudentSection> = {}): StudentSection {
  return {
    type: 'READING',
    title: null,
    body: 'Nội dung.',
    imageUrl: null,
    image: null,
    milestoneYear: null,
    milestoneLabel: null,
    eventId: null,
    sourceCitation: null,
    sortOrder: 1,
    ...overrides,
  };
}

export const heritageCardOf = (overrides: Partial<StudentHeritageCard> = {}): StudentHeritageCard => ({
  id: 11,
  slug: 'quan-the-co-do-hue',
  name: 'Quần thể di tích Cố đô Huế',
  shortDescription: null,
  thumbnailUrl: null,
  provinceName: 'Thành phố Huế',
  latitude: 16.46,
  longitude: 107.58,
  hasTimeline: true,
  ...overrides,
});

export const quizOf = (id: number, overrides: Partial<StudentQuiz> = {}): StudentQuiz => ({
  id,
  name: `Kiểm tra số ${id}`,
  description: null,
  openAt: null,
  closeAt: '2026-10-30T10:00:00Z',
  timeLimitMinutes: 15,
  questionCount: 10,
  state: 'OPEN',
  stateLabel: 'Đang mở',
  ...overrides,
});

export function studentLessonOf(level: SchoolLevel, overrides: Partial<StudentLesson> = {}): StudentLesson {
  return {
    id: 5,
    accessCode: 'BH7F3K2Q',
    title: 'Ngọ Môn và Kinh thành Huế',
    className: level === 1 ? '4A1' : level === 3 ? '10A1' : '7A1',
    teacherName: 'Trần Văn Bình',
    schoolLevel: level,
    schoolLevelName: `Cấp ${level}`,
    layout: FLOW[level],
    summary: 'Kinh thành Huế được xây dựng từ năm 1805.\nNgọ Môn là cổng chính phía nam.',
    keyPoints: ['Kinh thành Huế khởi công năm 1805.', 'Ngọ Môn là cổng chính.'],
    sections: [],
    heritages: [heritageCardOf()],
    quizzes: [],
    ...overrides,
  };
}
