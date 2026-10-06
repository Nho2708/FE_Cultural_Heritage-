import type { ApiClient } from './client';
import type { ContentStatus } from './heritage';
import type { QuestionDifficulty, QuestionRow, QuestionType } from './questions';
import type { Paged, SchoolLevel } from './types';

// Luồng Bài kiểm tra của bài học (khu giáo viên của web quản trị): kiểu dữ liệu và lớp gọi API. JSON camelCase, enum là chuỗi viết HOA
// như máy chủ. Giờ gửi lên có độ lệch +07:00 (máy chủ hiểu giờ không kèm múi giờ là giờ Việt Nam); giờ trả về là UTC (`Z`).

export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
/** Giai đoạn nhận bài: bài nháp không có giai đoạn (NONE). */
export type QuizOpenState = 'NONE' | 'NOT_OPEN' | 'OPEN' | 'ENDED';
/** Quy tắc thời gian làm theo cấp của lớp: cấp 1 không có, cấp 2 tùy chọn, cấp 3 bắt buộc khi phát hành. */
export type TimeLimitRule = 'NOT_ALLOWED' | 'OPTIONAL' | 'REQUIRED';

/** Dòng của màn hình Bài kiểm tra của tôi. */
export interface QuizRow {
  id: number;
  name: string | null;
  lessonId: number;
  lessonTitle: string | null;
  classId: number;
  className: string | null;
  grade: number;
  schoolLevel: SchoolLevel;
  status: QuizStatus | null;
  statusLabel: string;
  openState: QuizOpenState;
  openStateLabel: string;
  openAt: string | null;
  closeAt: string | null;
  timeLimitMinutes: number | null;
  difficultyLevel: QuestionDifficulty | null;
  questionCount: number;
  totalPoint: number | null;
  submittedCount: number;
  studentCount: number;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface QuizListFilter {
  lessonId?: number | '';
  classId?: number | '';
  status?: QuizStatus | '';
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** Một câu trong bài kiểm tra. `isUsable` false (kèm `unusableReason`) thì giao diện hiện cảnh báo đỏ và việc phát hành bị chặn. */
export interface QuizQuestion {
  questionId: number;
  sortOrder: number;
  point: number;
  questionType: QuestionType | null;
  typeName: string;
  content: string;
  imageUrl: string | null;
  difficultyLevel: QuestionDifficulty | null;
  heritageId: number;
  heritageName: string | null;
  levelMin: number;
  levelMax: number;
  isUsable: boolean;
  unusableReason: string | null;
}

export interface QuizReadiness {
  isReady: boolean;
  /** Chặn phát hành; liệt kê đủ một lượt. */
  missing: string[];
  /** Chỉ nhắc. */
  warnings: string[];
}

/** Quyền thao tác ở trạng thái hiện tại, để bật tắt ô và nút. */
export interface QuizAccess {
  canEditSettings: boolean;
  canEditCloseTime: boolean;
  canEditQuestions: boolean;
  canPublish: boolean;
  canClose: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
}

export interface QuizDetail {
  id: number;
  name: string | null;
  description: string | null;
  lessonId: number;
  lessonTitle: string | null;
  lessonStatus: ContentStatus | null;
  lessonAccessCode: string | null;
  classId: number;
  className: string | null;
  grade: number;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  difficultyLevel: QuestionDifficulty | null;
  timeLimitMinutes: number | null;
  timeLimitRule: TimeLimitRule;
  timeLimitRuleText: string;
  openAt: string | null;
  closeAt: string | null;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
  totalPoint: number;
  status: QuizStatus | null;
  statusLabel: string;
  openState: QuizOpenState;
  openStateLabel: string;
  publishedAt: string | null;
  questions: QuizQuestion[];
  questionCount: number;
  readiness: QuizReadiness;
  access: QuizAccess;
  submittedCount: number;
  studentCount: number;
  /** Lời xác nhận trước khi phát hành; chỉ có khi bài đủ điều kiện. */
  publishNotice: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateQuizBody {
  lessonId: number;
  name: string;
  description?: string | null;
  difficultyLevel?: QuestionDifficulty | null;
  timeLimitMinutes?: number | null;
  openAt?: string | null;
  closeAt?: string | null;
  shuffleQuestions?: boolean;
  showAnswersAfterSubmit?: boolean;
}

/** Lưu thiết lập: gửi đủ mọi trường, trường để trống là xóa giá trị. Bài đã phát hành phải gửi lại nguyên giá trị các trường khóa. */
export type UpdateQuizBody = Omit<CreateQuizBody, 'lessonId'>;

export interface QuizQuestionItem {
  questionId: number;
  point: number;
}

export interface PublishQuizResult {
  quiz: QuizDetail;
  message: string;
}

export interface CloseQuizResult {
  quiz: QuizDetail;
  /** Số lượt làm bài đang dở được tự nộp khi đóng. */
  expiredAttempts: number;
  message: string;
}

export interface DuplicateQuizResult {
  quiz: QuizDetail;
  skippedQuestions: number;
  message: string;
}

export interface QuizCandidateFilter {
  questionType?: QuestionType | '';
  difficultyLevel?: QuestionDifficulty | '';
  heritageId?: number | '';
  /** Mặc định true: chỉ câu của các di sản của bài học. */
  lessonHeritagesOnly?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** Câu trong hộp chọn câu; `inQuiz` true thì hiện mờ và không chọn lại. */
export interface QuizCandidate {
  question: QuestionRow;
  inQuiz: boolean;
}

export interface QuizCandidatePage extends Paged<QuizCandidate> {
  /** Cấp của lớp làm bài. */
  level: number;
  allowedTypes: QuestionType[];
}

export const QUIZ_ENDPOINTS = {
  list: '/teacher/quizzes',
  one: (id: number) => `/teacher/quizzes/${id}`,
  candidates: (id: number) => `/teacher/quizzes/${id}/question-candidates`,
  questions: (id: number) => `/teacher/quizzes/${id}/questions`,
  question: (id: number, questionId: number) => `/teacher/quizzes/${id}/questions/${questionId}`,
  publish: (id: number) => `/teacher/quizzes/${id}/publish`,
  close: (id: number) => `/teacher/quizzes/${id}/close`,
  duplicate: (id: number) => `/teacher/quizzes/${id}/duplicate`,
} as const;

export function createQuizzesApi(client: ApiClient) {
  const { request } = client;
  return {
    list: (filter: QuizListFilter = {}) =>
      request<Paged<QuizRow>>(QUIZ_ENDPOINTS.list, {
        query: {
          lessonId: filter.lessonId === '' ? undefined : filter.lessonId,
          classId: filter.classId === '' ? undefined : filter.classId,
          status: filter.status || undefined,
          keyword: filter.keyword || undefined,
          page: filter.page,
          pageSize: filter.pageSize,
        },
      }),
    /** Tạo bài nháp cho một bài học của giáo viên; lớp và cấp lấy từ bài học. Cần gói hiệu lực. */
    create: (body: CreateQuizBody) => request<QuizDetail>(QUIZ_ENDPOINTS.list, { method: 'POST', body }),
    get: (id: number) => request<QuizDetail>(QUIZ_ENDPOINTS.one(id)),
    update: (id: number, body: UpdateQuizBody) => request<QuizDetail>(QUIZ_ENDPOINTS.one(id), { method: 'PUT', body }),
    /** Xóa mềm bài nháp. */
    remove: (id: number) => request<null>(QUIZ_ENDPOINTS.one(id), { method: 'DELETE' }),
    candidates: (id: number, filter: QuizCandidateFilter = {}) =>
      request<QuizCandidatePage>(QUIZ_ENDPOINTS.candidates(id), {
        query: {
          questionType: filter.questionType || undefined,
          difficultyLevel: filter.difficultyLevel || undefined,
          heritageId: filter.heritageId === '' ? undefined : filter.heritageId,
          lessonHeritagesOnly: filter.lessonHeritagesOnly,
          keyword: filter.keyword || undefined,
          page: filter.page,
          pageSize: filter.pageSize,
        },
      }),
    /** Thêm câu vào cuối bài nháp; một câu sai thì không thêm câu nào. `point` để trống là 1 điểm mỗi câu. */
    addQuestions: (id: number, questionIds: number[], point?: number) =>
      request<QuizDetail>(QUIZ_ENDPOINTS.questions(id), { method: 'POST', body: { questionIds, point } }),
    /** Danh sách đầy đủ theo thứ tự mới; câu không có trong danh sách bị bỏ khỏi bài. */
    replaceQuestions: (id: number, items: QuizQuestionItem[]) =>
      request<QuizDetail>(QUIZ_ENDPOINTS.questions(id), { method: 'PUT', body: { items } }),
    removeQuestion: (id: number, questionId: number) =>
      request<QuizDetail>(QUIZ_ENDPOINTS.question(id, questionId), { method: 'DELETE' }),
    /** Thiếu điều kiện thì 422 `NOT_READY` kèm danh sách còn thiếu; phát hành khóa danh sách câu. */
    publish: (id: number) => request<PublishQuizResult>(QUIZ_ENDPOINTS.publish(id), { method: 'POST' }),
    /** Đóng không mở lại được; các lượt đang dở được tự nộp. */
    close: (id: number) => request<CloseQuizResult>(QUIZ_ENDPOINTS.close(id), { method: 'POST' }),
    duplicate: (id: number, name?: string) => request<DuplicateQuizResult>(QUIZ_ENDPOINTS.duplicate(id), { method: 'POST', body: { name } }),
  };
}

export type QuizzesApi = ReturnType<typeof createQuizzesApi>;
