import type { Paged, QuestionAccess, QuestionDetail, QuestionPreview, QuestionRow, QuestionTypeTable } from '@dsvhvn/dung-chung/api';

// Dữ liệu mẫu của luồng Ngân hàng câu hỏi, dựng theo dạng máy chủ trả.

export function pageOf<T>(items: T[]): Paged<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

export function questionRowOf(id: number, overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: `Câu hỏi số ${id} về Hoàng thành Thăng Long?`,
    imageUrl: null,
    heritageId: 11,
    heritageName: 'Hoàng thành Thăng Long',
    difficultyLevel: 'MEDIUM',
    levelMin: 2,
    levelMax: 3,
    source: 'MANUAL',
    reviewStatus: 'APPROVED',
    createdBy: 1,
    creatorName: 'Trần Văn Bình',
    organizationName: 'Trường THCS Nguyễn Du',
    isMine: true,
    isHidden: false,
    quizCount: 0,
    createdAt: '2026-10-05T01:00:00Z',
    updatedAt: '2026-10-05T02:00:00Z',
    ...overrides,
  };
}

export function accessOf(overrides: Partial<QuestionAccess> = {}): QuestionAccess {
  return {
    isReadOnly: false,
    reason: null,
    message: null,
    canEdit: true,
    canDelete: true,
    canApprove: false,
    canReject: false,
    canDuplicate: true,
    canHide: false,
    ...overrides,
  };
}

export function questionDetailOf(id: number, overrides: Partial<QuestionDetail> = {}): QuestionDetail {
  return {
    id,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    heritageId: 11,
    heritageName: 'Hoàng thành Thăng Long',
    content: `Câu hỏi số ${id} về Hoàng thành Thăng Long?`,
    explanation: 'Giải thích đáp án.',
    difficultyLevel: 'MEDIUM',
    levelMin: 2,
    levelMax: 3,
    levels: [2, 3],
    imageUrl: null,
    passage: null,
    passageSource: null,
    answerIsTrue: null,
    options: [
      { content: 'Năm 1010', imageUrl: null, isCorrect: true },
      { content: 'Năm 1000', imageUrl: null, isCorrect: false },
      { content: 'Năm 1100', imageUrl: null, isCorrect: false },
      { content: 'Năm 1200', imageUrl: null, isCorrect: false },
    ],
    pairs: [],
    steps: [],
    blanks: [],
    distractors: [],
    wordBank: [],
    statements: [],
    partsTotal: 1,
    images: [],
    source: 'MANUAL',
    reviewStatus: 'APPROVED',
    createdBy: 1,
    creatorName: 'Trần Văn Bình',
    organizationName: 'Trường THCS Nguyễn Du',
    aiGenerationId: null,
    reviewedBy: 1,
    reviewedAt: '2026-10-05T01:00:00Z',
    quizCount: 0,
    access: accessOf(),
    createdAt: '2026-10-05T01:00:00Z',
    updatedAt: '2026-10-05T02:00:00Z',
    ...overrides,
  };
}

export const COUNTS = { shared: 12, mine: 5, pending: 3, rejected: 1 };

export const TYPE_TABLE: QuestionTypeTable = {
  types: [],
  byLevel: {
    '1': ['TRUE_FALSE', 'IMAGE_CHOICE', 'MATCHING', 'ORDERING'],
    '2': ['SINGLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'FILL_BLANK'],
    '3': ['SINGLE_CHOICE', 'MULTI_TRUE_FALSE', 'SOURCE_READING'],
  },
};

export function previewOf(overrides: Partial<QuestionPreview> = {}): QuestionPreview {
  return {
    level: 2,
    layout: 'STANDARD',
    readAloud: false,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: 'Câu hỏi xem trước?',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'Phương án A', imageUrl: null },
      { content: 'Phương án B', imageUrl: null },
    ],
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    ...overrides,
  };
}
