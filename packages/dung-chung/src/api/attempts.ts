import type { ApiClient } from './client';
import type { StudentQuizState } from './lessons';
import type { QuestionPreviewOption, QuestionSubmission, QuestionType } from './questions';
import type { Paged } from './types';

// Luồng Học tập của học sinh theo cấp: kiểu dữ liệu và lớp gọi API làm bài kiểm tra (web học tập và app mobile dùng chung).
// JSON camelCase, enum là chuỗi viết HOA như máy chủ. Mọi vị trí trong câu trả lời tính theo thứ tự đang hiện trên màn hình của em.

export const ATTEMPT_ENDPOINTS = {
  home: '/student/home',
  progress: '/student/progress',
  history: '/student/attempts',
  quiz: (quizId: number) => `/student/quizzes/${quizId}`,
  start: (quizId: number) => `/student/quizzes/${quizId}/attempts`,
  attempt: (attemptId: number) => `/student/attempts/${attemptId}`,
  answer: (attemptId: number, questionId: number) => `/student/attempts/${attemptId}/answers/${questionId}`,
  submit: (attemptId: number) => `/student/attempts/${attemptId}/submit`,
  result: (attemptId: number) => `/student/attempts/${attemptId}/result`,
} as const;

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

/** Việc em làm được với một bài kiểm tra lúc này; nhãn nút theo giá trị này. */
export type StudentQuizAction = 'START' | 'CONTINUE' | 'VIEW_RESULT' | 'NOT_OPEN' | 'CLOSED';

export type BadgeCode = 'PERFECT_SCORE' | 'EXCELLENT' | 'ON_TIME' | 'PERSEVERANCE';

export type MasteryLevel = 'INSUFFICIENT_DATA' | 'NEEDS_REVIEW' | 'FAIR' | 'MASTERED';

/** Một câu trong lượt làm bài, đúng như em thấy: không có đáp án đúng, các cột đã xáo cố định theo lượt. */
export interface AttemptQuestion {
  questionId: number;
  position: number;
  /** Null với lớp cấp 1 (không điểm). */
  point: number | null;
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
  partsTotal: number;
  answered: boolean;
  answer: QuestionSubmission | null;
}

export interface StudentAttempt {
  id: number;
  quizId: number;
  quizName: string | null;
  lessonId: number;
  lessonTitle: string | null;
  level: 1 | 2 | 3;
  layout: string;
  readAloud: boolean;
  showsClock: boolean;
  status: AttemptStatus;
  startedAt: string;
  deadline: string | null;
  remainingSeconds: number | null;
  serverTime: string;
  timeLimitMinutes: number | null;
  questionCount: number;
  answeredCount: number;
  totalPoint: number | null;
  questions: AttemptQuestion[];
}

export interface StudentQuizIntro {
  id: number;
  name: string | null;
  description: string | null;
  lessonId: number;
  lessonTitle: string | null;
  level: 1 | 2 | 3;
  levelName: string;
  layout: string;
  questionCount: number;
  totalPoint: number | null;
  timeLimitMinutes: number | null;
  showsClock: boolean;
  openAt: string | null;
  closeAt: string | null;
  state: StudentQuizState;
  stateLabel: string;
  action: StudentQuizAction;
  actionLabel: string;
  attemptId: number | null;
  attemptStatus: AttemptStatus | null;
  notice: string | null;
}

export interface SavedAnswer {
  questionId: number;
  answered: boolean;
  savedAt: string;
  answeredCount: number;
  questionCount: number;
  remainingSeconds: number | null;
}

export interface StudentBadge {
  code: BadgeCode;
  name: string;
  description: string;
}

export interface StudentTopic {
  heritageId: number | null;
  questionType: QuestionType | null;
  name: string;
  answered: number;
  correct: number;
  ratePercent: number;
}

export interface StudentAnalysis {
  byHeritage: StudentTopic[];
  byQuestionType: StudentTopic[];
  heritagesToReview: StudentTopic[];
  partsCorrect: number;
  partsTotal: number;
}

/** Một câu trong phần xem lại. Cấp 1 không có đúng sai, số phần, điểm (các trường đó là null). */
export interface StudentQuestionReview {
  question: AttemptQuestion;
  correctAnswer: QuestionSubmission;
  explanation: string | null;
  isCorrect: boolean | null;
  partsCorrect: number | null;
  partsTotal: number | null;
  pointEarned: number | null;
}

export type ResultView = string;

/** Kết quả một lượt đã nộp, trình bày theo cấp hiện tại của lớp. */
export interface StudentAttemptResult {
  attemptId: number;
  quizId: number;
  quizName: string | null;
  lessonId: number;
  lessonTitle: string | null;
  level: 1 | 2 | 3;
  levelName: string;
  resultView: ResultView;
  status: AttemptStatus;
  statusLabel: string;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  stars: number | null;
  praise: string | null;
  score: number | null;
  totalPoint: number | null;
  percent: number | null;
  correctCount: number | null;
  wrongCount: number | null;
  blankCount: number | null;
  totalQuestions: number;
  badges: StudentBadge[];
  answersShown: boolean;
  questions: StudentQuestionReview[] | null;
  analysis: StudentAnalysis | null;
}

export interface StudentAttemptRow {
  attemptId: number;
  quizId: number;
  quizName: string | null;
  lessonId: number;
  lessonTitle: string | null;
  status: AttemptStatus;
  statusLabel: string;
  submittedAt: string | null;
  stars: number | null;
  score: number | null;
  totalPoint: number | null;
  percent: number | null;
  badges: StudentBadge[];
}

export interface StudentMastery {
  heritageId: number;
  name: string | null;
  answered: number;
  correct: number;
  percent: number | null;
  level: MasteryLevel;
  label: string;
  stars: number;
}

export interface StudentEarnedBadge {
  code: BadgeCode;
  name: string;
  description: string;
  count: number;
  lastEarnedAt: string | null;
  lastAttemptId: number | null;
}

export interface StudentProgress {
  level: 1 | 2 | 3;
  levelName: string;
  quizzesSubmitted: number;
  quizzesPublished: number;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsWithQuiz: number;
  finishedAttempts: number;
  totalStars: number | null;
  mastery: StudentMastery[];
  badges: StudentEarnedBadge[];
}

export interface StudentInProgress {
  attemptId: number;
  quizId: number;
  quizName: string | null;
  lessonId: number;
  lessonTitle: string | null;
  startedAt: string;
  deadline: string | null;
  remainingSeconds: number | null;
}

export interface StudentOpenQuiz {
  quizId: number;
  name: string | null;
  lessonId: number;
  lessonTitle: string | null;
  openAt: string | null;
  closeAt: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  /** Bật khi em chưa có lượt nào ở bài học này (nhãn "Cần mã bài học"). */
  needsLessonCode: boolean;
  label: string | null;
}

export interface StudentLessonRef {
  lessonId: number;
  title: string | null;
  accessCode: string | null;
  quizzesDone: number;
  quizzesPublished: number;
  lastAttemptAt: string | null;
}

export interface StudentRecentBadge {
  code: BadgeCode;
  name: string;
  attemptId: number;
  quizName: string | null;
  earnedAt: string | null;
}

export interface StudentHome {
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
  className: string | null;
  grade: number;
  level: 1 | 2 | 3;
  levelName: string;
  layout: string;
  teacherName: string | null;
  totalStars: number | null;
  inProgress: StudentInProgress[];
  openQuizzes: StudentOpenQuiz[];
  myLessons: StudentLessonRef[];
  recentBadges: StudentRecentBadge[];
  streakDays?: number | null;
  cheer?: string | null;
}

export function createAttemptsApi(client: ApiClient) {
  return {
    /** Trang học của em: lượt đang làm, bài kiểm tra còn mở, bài học của em, huy hiệu gần đây. */
    home: () => client.request<StudentHome>(ATTEMPT_ENDPOINTS.home),

    /** Tiến độ của em: quiz đã nộp, bài học hoàn thành, mức thành thạo theo di sản, huy hiệu. */
    progress: () => client.request<StudentProgress>(ATTEMPT_ENDPOINTS.progress),

    /** Lịch sử các lượt đã nộp, mới nhất trước. */
    history: (page = 1, pageSize = 10) => client.request<Paged<StudentAttemptRow>>(ATTEMPT_ENDPOINTS.history, { query: { page, pageSize } }),

    /** Trang trước khi bắt đầu một bài kiểm tra và việc em làm được lúc này. */
    quizIntro: (quizId: number) => client.request<StudentQuizIntro>(ATTEMPT_ENDPOINTS.quiz(quizId)),

    /** Bắt đầu làm bài: lượt mới (201) hoặc vào tiếp lượt đang làm dở (200). Đã nộp là 409; chưa mở hoặc đã đóng là 422. */
    startAttempt: (quizId: number) => client.request<StudentAttempt>(ATTEMPT_ENDPOINTS.start(quizId), { method: 'POST' }),

    /** Lượt đang làm dở (vào tiếp sau khi tải lại). Lượt đã nộp là 409. */
    attempt: (attemptId: number) => client.request<StudentAttempt>(ATTEMPT_ENDPOINTS.attempt(attemptId)),

    /** Lưu cả câu trả lời của một câu; thân `{}` là xóa. */
    saveAnswer: (attemptId: number, questionId: number, answer: QuestionSubmission) =>
      client.request<SavedAnswer>(ATTEMPT_ENDPOINTS.answer(attemptId, questionId), { method: 'PUT', body: answer }),

    /** Nộp bài. Nộp lần hai trả lại kết quả cũ. */
    submit: (attemptId: number) => client.request<StudentAttemptResult>(ATTEMPT_ENDPOINTS.submit(attemptId), { method: 'POST' }),

    /** Kết quả của lượt đã nộp theo cấp hiện tại của lớp. Lượt còn đang làm là 409. */
    result: (attemptId: number) => client.request<StudentAttemptResult>(ATTEMPT_ENDPOINTS.result(attemptId)),
  };
}

export type AttemptsApi = ReturnType<typeof createAttemptsApi>;
