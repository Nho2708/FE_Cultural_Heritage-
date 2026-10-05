import type { ApiClient } from './client';
import type { AiQuota } from './lessons';
import type { Paged } from './types';

// Luồng Ngân hàng câu hỏi theo dạng, AI sinh câu: kiểu dữ liệu và lớp gọi API (khu giáo viên của web quản trị). JSON camelCase,
// enum là chuỗi viết HOA như máy chủ. Cấp học là số 1-3.

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'TRUE_FALSE'
  | 'IMAGE_CHOICE'
  | 'MATCHING'
  | 'ORDERING'
  | 'FILL_BLANK'
  | 'MULTI_TRUE_FALSE'
  | 'SOURCE_READING';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type QuestionSource = 'MANUAL' | 'AI';
/** Ba tab của ngân hàng: Dùng chung, Của tôi, Chờ duyệt. */
export type QuestionScope = 'SHARED' | 'MINE' | 'PENDING';
export type QuestionReadOnlyReason = 'USED_IN_QUIZ' | 'NOT_OWNER' | 'HIDDEN_BY_ADMIN';

export interface QuestionOption {
  content: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
}

export interface QuestionPair {
  left: string | null;
  leftImageUrl: string | null;
  right: string | null;
}

export interface QuestionBlank {
  accepted: string[];
}

export interface QuestionStatement {
  text: string | null;
  isTrue: boolean;
}

/** Nội dung gửi lên khi tạo, sửa, kiểm hợp lệ. Phần đáp án đổi theo dạng; trường của dạng khác bị máy chủ bỏ qua. */
export interface SaveQuestionBody {
  questionType: QuestionType;
  heritageId: number | null;
  content: string | null;
  explanation: string | null;
  difficultyLevel: QuestionDifficulty | null;
  levelMin?: number | null;
  levelMax?: number | null;
  imageUrl?: string | null;
  passage?: string | null;
  passageSource?: string | null;
  answerIsTrue?: boolean | null;
  options?: QuestionOption[];
  pairs?: QuestionPair[];
  steps?: string[];
  blanks?: QuestionBlank[];
  distractors?: string[];
  statements?: QuestionStatement[];
}

export interface QuestionImage {
  url: string;
  caption: string | null;
  credit: string | null;
}

export interface QuestionAccess {
  isReadOnly: boolean;
  reason: QuestionReadOnlyReason | null;
  message: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDuplicate: boolean;
  canHide: boolean;
}

/** Dòng của danh sách ngân hàng câu hỏi. */
export interface QuestionRow {
  id: number;
  questionType: QuestionType;
  typeName: string;
  content: string;
  imageUrl: string | null;
  heritageId: number;
  heritageName: string | null;
  difficultyLevel: QuestionDifficulty | null;
  levelMin: number;
  levelMax: number;
  source: QuestionSource | null;
  reviewStatus: QuestionReviewStatus | null;
  createdBy: number;
  creatorName: string | null;
  organizationName: string | null;
  isMine: boolean;
  isHidden: boolean;
  quizCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface QuestionDetail {
  id: number;
  questionType: QuestionType;
  typeName: string;
  heritageId: number;
  heritageName: string | null;
  content: string | null;
  explanation: string | null;
  difficultyLevel: QuestionDifficulty | null;
  levelMin: number;
  levelMax: number;
  levels: number[];
  imageUrl: string | null;
  passage: string | null;
  passageSource: string | null;
  answerIsTrue: boolean | null;
  options: QuestionOption[];
  pairs: QuestionPair[];
  steps: string[];
  blanks: QuestionBlank[];
  distractors: string[];
  wordBank: string[];
  statements: QuestionStatement[];
  partsTotal: number;
  images: QuestionImage[];
  source: QuestionSource | null;
  reviewStatus: QuestionReviewStatus | null;
  createdBy: number;
  creatorName: string | null;
  organizationName: string | null;
  aiGenerationId: number | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  quizCount: number;
  access: QuestionAccess;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface QuestionListFilter {
  scope?: QuestionScope;
  questionType?: QuestionType | '';
  level?: number | '';
  difficultyLevel?: QuestionDifficulty | '';
  heritageId?: number | '';
  status?: QuestionReviewStatus | '';
  source?: QuestionSource | '';
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface QuestionCounts {
  shared: number;
  mine: number;
  pending: number;
  rejected: number;
}

export interface QuestionTypeInfo {
  type: QuestionType;
  name: string;
  minLevel: number;
  maxLevel: number;
  multiPart: boolean;
}

export interface QuestionTypeTable {
  types: QuestionTypeInfo[];
  byLevel: Record<string, QuestionType[]>;
}

/** Cách học sinh làm câu (theo vị trí trong thứ tự lưu, từ 0). */
export interface QuestionSubmission {
  selectedIndex?: number | null;
  matches?: Array<number | null>;
  order?: number[];
  blanks?: Array<string | null>;
  statements?: Array<boolean | null>;
}

export interface GradeResult {
  partsCorrect: number;
  partsTotal: number;
  parts: boolean[];
  isCorrect: boolean;
  fraction: number;
}

export interface QuestionPreviewOption {
  content: string | null;
  imageUrl: string | null;
}

/** Câu như học sinh của một cấp thấy: không có đáp án đúng. */
export interface QuestionPreview {
  level: number;
  layout: 'LARGE_CARDS' | 'STANDARD' | 'COMPACT';
  readAloud: boolean;
  questionType: QuestionType;
  typeName: string;
  content: string;
  imageUrl: string | null;
  passage: string | null;
  passageSource: string | null;
  options: QuestionPreviewOption[];
  leftItems: QuestionPreviewOption[];
  rightItems: string[];
  items: string[];
  blankCount: number;
  wordBank: string[];
  statements: string[];
}

export interface ValidateQuestionResult {
  isValid: boolean;
  /** Lỗi theo trường, khóa như `options[1].content`, `steps[2]`, `blanks[0].accepted`. */
  errors: Record<string, string>;
  partsTotal: number;
  preview: QuestionPreview | null;
  trial: GradeResult | null;
}

export interface ApproveQuestionsResult {
  approved: number[];
  skipped: Array<{ questionId: number; reason: string }>;
  message: string;
}

export interface GenerateQuestionsBody {
  count?: number;
  difficultyLevel?: QuestionDifficulty;
  types?: QuestionType[];
  heritageId?: number;
}

export interface QuestionBatch {
  generationId: number;
  level: number;
  levelName: string;
  requested: number;
  received: number;
  dropped: number;
  questions: QuestionDetail[];
  aiQuota: AiQuota;
  model: string;
  message: string;
}

export const QUESTION_ENDPOINTS = {
  list: '/teacher/questions',
  counts: '/teacher/questions/counts',
  types: '/teacher/questions/types',
  validate: '/teacher/questions/validate',
  approveMany: '/teacher/questions/approve',
  one: (id: number) => `/teacher/questions/${id}`,
  approve: (id: number) => `/teacher/questions/${id}/approve`,
  reject: (id: number) => `/teacher/questions/${id}/reject`,
  duplicate: (id: number) => `/teacher/questions/${id}/duplicate`,
  preview: (id: number) => `/teacher/questions/${id}/preview`,
  tryGrade: (id: number) => `/teacher/questions/${id}/try-grade`,
  generate: (lessonId: number) => `/teacher/lessons/${lessonId}/ai/questions`,
  quota: (lessonId: number) => `/teacher/lessons/${lessonId}/ai/questions/quota`,
} as const;

export function createQuestionsApi(client: ApiClient) {
  const { request } = client;
  return {
    list: (filter: QuestionListFilter = {}) =>
      request<Paged<QuestionRow>>(QUESTION_ENDPOINTS.list, {
        query: {
          scope: filter.scope,
          questionType: filter.questionType || undefined,
          level: filter.level === '' ? undefined : filter.level,
          difficultyLevel: filter.difficultyLevel || undefined,
          heritageId: filter.heritageId === '' ? undefined : filter.heritageId,
          status: filter.status || undefined,
          source: filter.source || undefined,
          keyword: filter.keyword || undefined,
          page: filter.page,
          pageSize: filter.pageSize,
        },
      }),
    counts: () => request<QuestionCounts>(QUESTION_ENDPOINTS.counts),
    types: () => request<QuestionTypeTable>(QUESTION_ENDPOINTS.types),
    get: (id: number) => request<QuestionDetail>(QUESTION_ENDPOINTS.one(id)),
    create: (body: SaveQuestionBody) => request<QuestionDetail>(QUESTION_ENDPOINTS.list, { method: 'POST', body }),
    update: (id: number, body: SaveQuestionBody) => request<QuestionDetail>(QUESTION_ENDPOINTS.one(id), { method: 'PUT', body }),
    remove: (id: number) => request<null>(QUESTION_ENDPOINTS.one(id), { method: 'DELETE' }),
    /** Kiểm hợp lệ không lưu; câu chưa hợp lệ vẫn trả 200 với `isValid` = false. */
    validate: (question: SaveQuestionBody, options: { previewLevel?: number; submission?: QuestionSubmission } = {}, signal?: AbortSignal) =>
      request<ValidateQuestionResult>(QUESTION_ENDPOINTS.validate, {
        method: 'POST',
        body: { question, previewLevel: options.previewLevel, submission: options.submission },
        signal,
      }),
    approve: (id: number) => request<QuestionDetail>(QUESTION_ENDPOINTS.approve(id), { method: 'POST' }),
    reject: (id: number) => request<QuestionDetail>(QUESTION_ENDPOINTS.reject(id), { method: 'POST' }),
    /** Duyệt nhiều câu (tối đa 100); câu không duyệt được nằm ở `skipped`. */
    approveMany: (questionIds: number[]) =>
      request<ApproveQuestionsResult>(QUESTION_ENDPOINTS.approveMany, { method: 'POST', body: { questionIds } }),
    duplicate: (id: number) => request<QuestionDetail>(QUESTION_ENDPOINTS.duplicate(id), { method: 'POST' }),
    preview: (id: number, level?: number) => request<QuestionPreview>(QUESTION_ENDPOINTS.preview(id), { query: { level } }),
    tryGrade: (id: number, submission: QuestionSubmission) =>
      request<GradeResult>(QUESTION_ENDPOINTS.tryGrade(id), { method: 'POST', body: submission }),
    /** AI sinh câu từ một bài học; mỗi lần gọi là một lượt trong hạn mức của trường. Câu vào ngân hàng ở trạng thái chờ duyệt. */
    generate: (lessonId: number, body: GenerateQuestionsBody) =>
      request<QuestionBatch>(QUESTION_ENDPOINTS.generate(lessonId), { method: 'POST', body }),
    quota: (lessonId: number) => request<AiQuota>(QUESTION_ENDPOINTS.quota(lessonId)),
  };
}

export type QuestionsApi = ReturnType<typeof createQuestionsApi>;
