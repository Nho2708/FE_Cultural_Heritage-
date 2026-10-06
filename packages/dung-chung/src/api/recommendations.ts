import type { ApiClient } from './client';
import type { QuestionDifficulty } from './questions';

// Luồng Thống kê và gợi ý: kiểu dữ liệu và lớp gọi API của "Gợi ý cho em" (học sinh) và gợi ý ôn tập cho lớp (giáo viên).
// JSON camelCase, enum là chuỗi viết HOA như máy chủ. Gợi ý tính khi hiển thị từ lượt làm bài, không có bảng gợi ý riêng.

export const RECOMMENDATION_ENDPOINTS = {
  student: '/student/recommendations',
  attempt: (attemptId: number) => `/student/attempts/${attemptId}/recommendations`,
  quiz: (quizId: number) => `/teacher/quizzes/${quizId}/results/recommendations`,
  classRoom: (classId: number) => `/teacher/classes/${classId}/recommendations`,
} as const;

/** Thẻ di sản được gợi ý (chỉ di sản đã xuất bản). `slug` để mở trang di sản công khai. */
export interface RecommendedHeritage {
  heritageId: number;
  slug: string | null;
  name: string | null;
  thumbnailUrl: string | null;
  shortDescription: string | null;
  provinceName: string | null;
  typeName: string | null;
  reason: string;
}

/** Bài kiểm tra nên làm tiếp. `needsLessonCode` true khi em chưa có lượt nào ở bài học của bài kiểm tra. */
export interface RecommendedQuiz {
  quizId: number;
  name: string | null;
  lessonId: number;
  lessonTitle: string | null;
  closeAt: string | null;
  difficultyLevel: QuestionDifficulty | null;
  difficultyName: string | null;
  needsLessonCode: boolean;
  label: string | null;
  reason: string;
}

/** Bài học được gợi ý. Bài nên ôn lại có mã bài học; bài mới chỉ có tiêu đề và `hint`, `accessCode` luôn null. */
export interface RecommendedLesson {
  lessonId: number;
  title: string | null;
  accessCode: string | null;
  hint: string | null;
  reason: string;
}

/** Gợi ý cho em, đủ năm phần, cùng nội dung ở mọi cấp (cấp 1 chỉ bỏ số liệu khỏi câu lý do). */
export interface StudentRecommendations {
  level: 1 | 2 | 3;
  levelName: string;
  layout: string;
  attemptId: number | null;
  targetDifficulty: QuestionDifficulty;
  targetDifficultyName: string;
  nextQuizzes: RecommendedQuiz[];
  lessonsToReview: RecommendedLesson[];
  heritagesToReview: RecommendedHeritage[];
  relatedHeritages: RecommendedHeritage[];
  newLessons: RecommendedLesson[];
  /** Có khi em làm đúng hết nên phần nên ôn thay bằng lời khen. */
  reviewPraise: string | null;
  /** Lời mời nhập mã bài học khi em chưa có lượt nào hoặc lớp chưa có bài nào xuất bản. */
  message: string | null;
  relatedFromFallback: boolean;
}

/** Di sản nên ôn của lớp. */
export interface ClassReviewHeritage {
  heritageId: number;
  slug: string | null;
  name: string | null;
  thumbnailUrl: string | null;
  shortDescription: string | null;
  provinceName: string | null;
  typeName: string | null;
  answered: number;
  wrong: number;
  wrongPercent: number;
  reason: string;
}

/** Gợi ý ôn tập cho lớp: di sản nên ôn (tối đa 5) và di sản liên quan (tối đa 5). */
export interface ClassRecommendations {
  classId: number;
  className: string | null;
  level: 1 | 2 | 3;
  quizId: number | null;
  from: string | null;
  to: string | null;
  submittedAttempts: number;
  answeredQuestions: number;
  heritagesToReview: ClassReviewHeritage[];
  relatedHeritages: RecommendedHeritage[];
  suggestedHeritageIds: number[];
  message: string | null;
  relatedFromFallback: boolean;
}

export interface ClassRecommendationFilter {
  quizId?: number | '';
  /** ISO 8601 có múi giờ. */
  from?: string;
  to?: string;
}


/** Gợi ý của học sinh (dùng chung web học tập và app mobile). */
export function createStudentRecommendationsApi(client: ApiClient) {
  return {
    /** "Gợi ý cho em" ở trang học. */
    recommendations: () => client.request<StudentRecommendations>(RECOMMENDATION_ENDPOINTS.student),

    /** Như trên nhưng phần di sản nên ôn chỉ tính từ lượt đang xem. Lượt của em khác là 404, lượt còn đang làm là 409. */
    attemptRecommendations: (attemptId: number) => client.request<StudentRecommendations>(RECOMMENDATION_ENDPOINTS.attempt(attemptId)),
  };
}

/** Gợi ý ôn tập cho lớp (khu giáo viên). */
export function createClassRecommendationsApi(client: ApiClient) {
  const query = (filter: ClassRecommendationFilter) => ({
    quizId: filter.quizId === '' ? undefined : filter.quizId,
    from: filter.from || undefined,
    to: filter.to || undefined,
  });
  return {
    /** Gợi ý riêng cho một bài kiểm tra, trong khoảng thời gian tùy chọn. */
    forQuiz: (quizId: number, filter: Omit<ClassRecommendationFilter, 'quizId'> = {}) =>
      client.request<ClassRecommendations>(RECOMMENDATION_ENDPOINTS.quiz(quizId), { query: query(filter) }),

    /** Gợi ý cho cả lớp; có thể thu hẹp theo một bài kiểm tra và khoảng thời gian. */
    forClass: (classId: number, filter: ClassRecommendationFilter = {}) =>
      client.request<ClassRecommendations>(RECOMMENDATION_ENDPOINTS.classRoom(classId), { query: query(filter) }),
  };
}
