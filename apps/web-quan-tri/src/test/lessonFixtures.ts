import type {
  AiQuota,
  LessonDetail,
  LessonDraft,
  LessonFrame,
  LessonMaterials,
  LessonRow,
  LessonSection,
  SchoolLevel,
} from '@dsvhvn/dung-chung/api';

// Dữ liệu mẫu của luồng Bài học theo cấp, dựng theo dạng máy chủ trả.

const FRAMES: Record<SchoolLevel, LessonFrame> = {
  1: {
    level: 1,
    name: 'Cấp 1',
    minWords: 150,
    maxWords: 250,
    shortWords: 150,
    mediumWords: 200,
    detailedWords: 250,
    allowedTypes: ['STORY', 'IMAGE'],
    layout: 'STEP_BY_STEP',
    sequentialFlow: true,
    flow: [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'VIEW_IMAGES', label: 'Xem hình' },
      { key: 'PLAY', label: 'Chơi' },
      { key: 'EARN_STARS', label: 'Nhận sao' },
    ],
  },
  2: {
    level: 2,
    name: 'Cấp 2',
    minWords: 300,
    maxWords: 500,
    shortWords: 300,
    mediumWords: 400,
    detailedWords: 500,
    allowedTypes: ['READING', 'IMAGE', 'MILESTONE'],
    layout: 'FREE_STEPS',
    sequentialFlow: false,
    flow: [
      { key: 'READ', label: 'Đọc bài' },
      { key: 'TIMELINE', label: 'Xem dòng thời gian' },
      { key: 'QUIZ', label: 'Làm bài kiểm tra' },
      { key: 'EXPLANATION', label: 'Xem giải thích' },
    ],
  },
  3: {
    level: 3,
    name: 'Cấp 3',
    minWords: 600,
    maxWords: 900,
    shortWords: 600,
    mediumWords: 750,
    detailedWords: 900,
    allowedTypes: ['READING', 'SOURCE_EXCERPT', 'MILESTONE', 'REFLECTION'],
    layout: 'DOCUMENT',
    sequentialFlow: false,
    flow: [
      { key: 'DOCUMENT', label: 'Đọc tài liệu' },
      { key: 'TIMED_QUIZ', label: 'Làm bài kiểm tra có giờ' },
      { key: 'RESULT_ANALYSIS', label: 'Xem phân tích kết quả' },
    ],
  },
};

export const frameOf = (level: SchoolLevel): LessonFrame => FRAMES[level];

export function quotaOf(overrides: Partial<AiQuota> = {}): AiQuota {
  return {
    hasEffectivePlan: true,
    planName: 'Gói Trường học',
    used: 268,
    max: 300,
    remaining: 32,
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    ...overrides,
  };
}

export function sectionOf(overrides: Partial<LessonSection> = {}): LessonSection {
  return {
    id: null,
    type: 'READING',
    typeLabel: 'Đoạn bài đọc',
    title: null,
    body: 'Nội dung đoạn.',
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

const SCHOOL_LEVEL_NAME: Record<SchoolLevel, string> = {
  1: 'Cấp 1 (Tiểu học)',
  2: 'Cấp 2 (Trung học cơ sở)',
  3: 'Cấp 3 (Trung học phổ thông)',
};

export function lessonOf(overrides: Partial<LessonDetail> & { level?: SchoolLevel } = {}): LessonDetail {
  const { level = 2, ...rest } = overrides;
  return {
    id: 5,
    title: 'Ngọ Môn và Kinh thành Huế',
    classId: 1,
    className: level === 1 ? '4B1' : level === 3 ? '10A1' : '7A1',
    grade: level === 1 ? 4 : level === 3 ? 10 : 7,
    schoolLevel: level,
    schoolLevelName: SCHOOL_LEVEL_NAME[level],
    status: 'DRAFT',
    accessCode: null,
    accessPath: null,
    summary: 'Kinh thành Huế được xây dựng từ năm 1805.',
    keyPoints: ['Kinh thành Huế khởi công năm 1805.'],
    sections: [],
    heritages: [{ id: 11, slug: 'quan-the-co-do-hue', name: 'Quần thể di tích Cố đô Huế', thumbnailUrl: null, status: 'PUBLISHED' }],
    frame: FRAMES[level],
    wordCount: 8,
    readiness: { isReady: false, missing: [], warnings: [] },
    quizCount: 0,
    aiQuota: quotaOf(),
    createdAt: '2026-10-05T01:00:00Z',
    updatedAt: '2026-10-05T02:00:00Z',
    ...rest,
  };
}

export function lessonRowOf(id: number, overrides: Partial<LessonRow> = {}): LessonRow {
  return {
    id,
    title: `Bài học số ${id}`,
    classId: 1,
    className: '7A1',
    grade: 7,
    schoolLevel: 2,
    status: 'DRAFT',
    accessCode: null,
    heritages: [{ id: 11, slug: 'quan-the-co-do-hue', name: 'Quần thể di tích Cố đô Huế', thumbnailUrl: null, status: 'PUBLISHED' }],
    quizCount: 0,
    createdAt: '2026-10-05T01:00:00Z',
    updatedAt: '2026-10-05T02:00:00Z',
    ...overrides,
  };
}

export function draftOf(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    generationId: 9,
    level: 2,
    length: 'MEDIUM',
    lengthLabel: 'Vừa',
    summary: 'Bản nháp do AI soạn.',
    keyPoints: ['Ý một.', 'Ý hai.', 'Ý ba.'],
    sections: [
      sectionOf({ type: 'MILESTONE', title: '1805', body: 'Khởi công xây Kinh thành.', milestoneYear: 1805, milestoneLabel: '1805', sortOrder: 1 }),
    ],
    wordCount: 5,
    warnings: [],
    model: 'simulated-v1',
    aiQuota: quotaOf({ used: 269, remaining: 31 }),
    message: 'Đã soạn bản nháp nội dung bài cấp 2. Hãy kiểm tra độ chính xác trước khi dùng.',
    ...overrides,
  };
}

export function materialsOf(overrides: Partial<LessonMaterials> = {}): LessonMaterials {
  return {
    images: [
      {
        mediaId: 1,
        url: 'https://anh.test/ngo-mon.jpg',
        caption: 'Ngọ Môn nhìn từ phía nam.',
        credit: 'Quần thể di tích Cố đô Huế',
        author: null,
        license: 'CC BY-SA',
        source: null,
        heritageId: 11,
        heritageName: 'Quần thể di tích Cố đô Huế',
        eventId: null,
      },
    ],
    events: [
      { eventId: 21, heritageId: 11, heritageName: 'Quần thể di tích Cố đô Huế', phaseName: 'Nhà Nguyễn', name: 'Khởi công xây Kinh thành', startYear: 1805, dateLabel: '1805' },
    ],
    ...overrides,
  };
}
