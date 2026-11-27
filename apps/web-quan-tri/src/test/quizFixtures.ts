import type { QuizCandidate, QuizCandidatePage, QuizDetail, QuizQuestion, QuizRow, SchoolLevel } from '@dsvhvn/dung-chung/api';
import { questionRowOf } from './questionFixtures';

// Dữ liệu mẫu của luồng Bài kiểm tra, dựng theo dạng máy chủ trả.

const LEVEL_NAME: Record<SchoolLevel, string> = {
  1: 'Cấp 1 (Tiểu học)',
  2: 'Cấp 2 (Trung học cơ sở)',
  3: 'Cấp 3 (Trung học phổ thông)',
};

export function quizRowOf(id: number, overrides: Partial<QuizRow> = {}): QuizRow {
  return {
    id,
    name: `Bài kiểm tra số ${id}`,
    lessonId: 5,
    lessonTitle: 'Ngọ Môn và Kinh thành Huế',
    classId: 1,
    className: '7A1',
    grade: 7,
    schoolLevel: 2,
    status: 'DRAFT',
    statusLabel: 'Nháp',
    openState: 'NONE',
    openStateLabel: '',
    openAt: null,
    closeAt: null,
    timeLimitMinutes: null,
    difficultyLevel: null,
    questionCount: 0,
    totalPoint: 0,
    submittedCount: 0,
    studentCount: 32,
    publishedAt: null,
    createdAt: '2026-10-05T01:00:00Z',
    updatedAt: '2026-10-05T02:00:00Z',
    ...overrides,
  };
}

export function quizQuestionOf(questionId: number, sortOrder: number, overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    questionId,
    sortOrder,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: `Câu hỏi số ${questionId} về Hoàng thành Thăng Long?`,
    imageUrl: null,
    difficultyLevel: 'MEDIUM',
    heritageId: 11,
    heritageName: 'Hoàng thành Thăng Long',
    levelMin: 2,
    levelMax: 3,
    isUsable: true,
    unusableReason: null,
    ...overrides,
  };
}

export function quizOf(overrides: Partial<QuizDetail> & { level?: SchoolLevel } = {}): QuizDetail {
  const { level = 2, ...rest } = overrides;
  const questions = rest.questions ?? [];
  return {
    id: 9,
    name: 'Kiểm tra 15 phút: Kinh thành Huế',
    description: 'Các em đọc kỹ từng câu.',
    lessonId: 5,
    lessonTitle: 'Ngọ Môn và Kinh thành Huế',
    lessonStatus: 'PUBLISHED',
    accessCode: null,
    lessonAccessCode: 'BH7F3K2Q',
    classId: 1,
    className: level === 1 ? '4B1' : level === 3 ? '10A1' : '7A1',
    grade: level === 1 ? 4 : level === 3 ? 10 : 7,
    schoolLevel: level,
    schoolLevelName: LEVEL_NAME[level],
    difficultyLevel: 'MEDIUM',
    timeLimitMinutes: level === 2 ? 15 : null,
    timeLimitRule: level === 1 ? 'NOT_ALLOWED' : level === 2 ? 'OPTIONAL' : 'REQUIRED',
    timeLimitRuleText: '',
    openAt: '2026-10-06T00:00:00Z',
    closeAt: '2026-10-07T10:00:00Z',
    shuffleQuestions: true,
    showAnswersAfterSubmit: false,
    totalPoint: questions.reduce((total, q) => total + q.point, 0),
    status: 'DRAFT',
    statusLabel: 'Nháp',
    openState: 'NONE',
    openStateLabel: '',
    publishedAt: null,
    questions,
    questionCount: questions.length,
    readiness: { isReady: true, missing: [], warnings: [] },
    access: { canEditSettings: true, canEditCloseTime: true, canEditQuestions: true, canPublish: true, canClose: false, canDelete: true, canDuplicate: true },
    submittedCount: 0,
    studentCount: 32,
    publishNotice: 'Sau khi phát hành, danh sách câu hỏi và điểm sẽ bị khóa. Học sinh lớp 7A1 làm được bài kiểm tra qua mã bài học BH7F3K2Q từ 07:00 06/10/2026 đến 17:00 07/10/2026.',
    createdAt: '2026-10-05T01:00:00Z',
    updatedAt: '2026-10-05T14:10:00Z',
    ...rest,
  };
}

/** Bài đã phát hành, đang nhận bài: mọi trường khóa trừ tên, mô tả, giờ đóng. */
export function publishedQuizOf(overrides: Partial<QuizDetail> = {}): QuizDetail {
  return quizOf({
    status: 'PUBLISHED',
    statusLabel: 'Đang phát hành',
    openState: 'OPEN',
    openStateLabel: 'Đang nhận bài',
    publishedAt: '2026-10-05T14:20:00Z',
    submittedCount: 18,
    publishNotice: null,
    access: { canEditSettings: false, canEditCloseTime: true, canEditQuestions: false, canPublish: false, canClose: true, canDelete: false, canDuplicate: true },
    ...overrides,
  });
}

export function candidateOf(id: number, overrides: Partial<QuizCandidate> = {}): QuizCandidate {
  return { question: questionRowOf(id), inQuiz: false, ...overrides };
}

export function candidatePageOf(items: QuizCandidate[], overrides: Partial<QuizCandidatePage> = {}): QuizCandidatePage {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
    level: 2,
    allowedTypes: ['SINGLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'FILL_BLANK'],
    ...overrides,
  };
}
