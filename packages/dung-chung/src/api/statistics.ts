import type { AttemptQuestion, AttemptStatus, BadgeCode, MasteryLevel, StudentBadge } from './attempts';
import type { ApiClient } from './client';
import type { HeritageType } from './heritage';
import type { QuestionSubmission, QuestionType } from './questions';
import type { QuizStatus } from './quizzes';

// Luồng Thống kê và gợi ý, phần của giáo viên: kết quả bài kiểm tra của lớp, tiến độ, mức thành thạo, hồ sơ học tập của một học sinh.
// JSON camelCase, enum là chuỗi viết HOA như máy chủ. Chỉ tính lượt đã nộp (đã nộp hoặc hết giờ tự nộp) của học sinh đang hoạt động;
// giáo viên luôn thấy điểm ở mọi cấp (lớp cấp 1 kèm số sao).

export const STATISTICS_ENDPOINTS = {
  overview: (quizId: number) => `/teacher/quizzes/${quizId}/results`,
  questions: (quizId: number) => `/teacher/quizzes/${quizId}/results/questions`,
  students: (quizId: number) => `/teacher/quizzes/${quizId}/results/students`,
  topics: (quizId: number) => `/teacher/quizzes/${quizId}/results/topics`,
  attempt: (attemptId: number) => `/teacher/attempts/${attemptId}`,
  progress: (classId: number) => `/teacher/classes/${classId}/progress`,
  mastery: (classId: number) => `/teacher/classes/${classId}/mastery`,
  profile: (classId: number, studentId: number) => `/teacher/classes/${classId}/students/${studentId}/profile`,
} as const;

/** Trạng thái của một học sinh với một bài kiểm tra. */
export type QuizStudentStatus = 'SUBMITTED' | 'EXPIRED' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface ScoreBin {
  fromPercent: number;
  toPercent: number;
  count: number;
}

/** Tab Tổng quan. Chưa có lượt nào thì các số điểm là null kèm `message`. */
export interface QuizResultsOverview {
  quizId: number;
  name: string | null;
  status: QuizStatus | null;
  lessonId: number;
  lessonTitle: string | null;
  classId: number;
  className: string | null;
  level: 1 | 2 | 3;
  levelName: string;
  totalPoint: number | null;
  questionCount: number;
  enrolled: number;
  submitted: number;
  autoSubmitted: number;
  finished: number;
  inProgress: number;
  notStarted: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  averagePercent: number | null;
  highestPercent: number | null;
  lowestPercent: number | null;
  distribution: ScoreBin[];
  message: string | null;
}

export interface ChoiceStat {
  /** Null là bỏ trống. */
  answerId: number | null;
  content: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
  count: number;
  percent: number;
}

export interface PartStat {
  label: string;
  answered: number;
  correct: number;
  ratePercent: number;
}

export interface QuestionError {
  label: string;
  wrong: number;
  wrongPercent: number;
  mostCommonWrong: string | null;
}

export interface QuestionStat {
  questionId: number;
  position: number;
  content: string | null;
  questionType: QuestionType;
  typeName: string;
  point: number | null;
  heritageId: number;
  heritageName: string | null;
  answered: number;
  correct: number;
  ratePercent: number;
  parts: PartStat[];
  choices: ChoiceStat[];
  mostChosen: ChoiceStat | null;
  commonErrors: QuestionError[];
}

/** Tỉ lệ đúng theo một dạng câu hoặc một di sản, kèm mức thành thạo và cờ "nên ôn" (đúng dưới 50%). */
export interface TopicStat {
  heritageId: number | null;
  questionType: QuestionType | null;
  name: string;
  answered: number;
  correct: number;
  ratePercent: number;
  level: MasteryLevel;
  levelLabel: string;
  needsReview: boolean;
}

export interface QuizQuestionStats {
  quizId: number;
  name: string | null;
  finished: number;
  questions: QuestionStat[];
  byQuestionType: TopicStat[];
  message: string | null;
}

export interface QuizTopicStats {
  quizId: number;
  name: string | null;
  finished: number;
  byHeritage: TopicStat[];
  byQuestionType: TopicStat[];
  message: string | null;
}

export interface QuizStudentRow {
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
  status: QuizStudentStatus;
  statusLabel: string;
  /** Có khi em đã bắt đầu; dùng để mở Chi tiết bài làm. */
  attemptId: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  score: number | null;
  totalPoint: number | null;
  percent: number | null;
  stars: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  badges: StudentBadge[];
}

export interface QuizStudents {
  quizId: number;
  name: string | null;
  level: 1 | 2 | 3;
  students: QuizStudentRow[];
}

/** Một câu trong Chi tiết bài làm: như em đã thấy, câu em trả lời cạnh đáp án đúng. */
export interface TeacherQuestionReview {
  question: AttemptQuestion;
  correctAnswer: QuestionSubmission;
  explanation: string | null;
  isCorrect: boolean | null;
  partsCorrect: number | null;
  partsTotal: number | null;
  pointEarned: number | null;
}

export interface TeacherAttemptDetail {
  attemptId: number;
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
  quizId: number;
  quizName: string | null;
  lessonId: number;
  lessonTitle: string | null;
  className: string | null;
  level: 1 | 2 | 3;
  status: AttemptStatus;
  statusLabel: string;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number | null;
  score: number;
  totalPoint: number;
  percent: number;
  stars: number | null;
  correctCount: number;
  totalQuestions: number;
  badges: StudentBadge[];
  questions: TeacherQuestionReview[];
}

// ---- Lớp ----

/** Một dòng mức thành thạo (theo di sản, tỉnh, loại di sản): số câu đã trả lời, số đúng, tỉ lệ đúng, mức và số sao. */
export interface MasteryRow {
  id: number | null;
  name: string | null;
  answered: number;
  correct: number;
  ratePercent: number;
  level: MasteryLevel;
  levelLabel: string;
  stars: number;
}

export interface ClassQuizProgress {
  quizId: number;
  name: string | null;
  lessonId: number;
  lessonTitle: string | null;
  status: QuizStatus | null;
  openAt: string | null;
  closeAt: string | null;
  submitted: number;
  enrolled: number;
  ratePercent: number;
}

export interface BadgeCount {
  code: BadgeCode;
  name: string;
  count: number;
}

export interface ClassStudentProgress {
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
  neverLoggedIn: boolean;
  quizzesSubmitted: number;
  quizzesPublished: number;
  lessonsCompleted: number;
  lessonsWithQuizzes: number;
  totalStars: number | null;
  averagePercent: number | null;
  badges: BadgeCount[];
}

/** Ô của bảng học sinh × bài kiểm tra: chỉ có khi em đã bắt đầu; ô thiếu là chưa làm. */
export interface ClassProgressCell {
  studentId: number;
  quizId: number;
  attemptId: number;
  status: QuizStudentStatus;
  score: number | null;
  totalPoint: number | null;
  percent: number | null;
  stars: number | null;
}

export interface ClassProgress {
  classId: number;
  className: string | null;
  grade: number;
  level: 1 | 2 | 3;
  levelName: string;
  enrolled: number;
  neverLoggedIn: number;
  quizzesPublished: number;
  submittedTotal: number;
  progressPercent: number;
  quizzes: ClassQuizProgress[];
  students: ClassStudentProgress[];
  cells: ClassProgressCell[];
  message: string | null;
}

export interface HeatmapCell {
  studentId: number;
  heritageId: number;
  answered: number;
  correct: number;
  ratePercent: number;
  level: MasteryLevel;
}

export interface HeatmapStudent {
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
}

export interface ClassMastery {
  classId: number;
  className: string | null;
  provinceId: number | null;
  heritageType: HeritageType | null;
  byHeritage: MasteryRow[];
  byProvince: MasteryRow[];
  byHeritageType: MasteryRow[];
  byQuestionType: TopicStat[];
  heatmapStudents: HeatmapStudent[];
  heatmapCells: HeatmapCell[];
  message: string | null;
}

export interface ClassMasteryFilter {
  provinceId?: number | '';
  heritageType?: HeritageType | '';
}

// ---- Hồ sơ học tập của một học sinh ----

export interface StudentHistoryRow {
  attemptId: number;
  quizId: number;
  quizName: string | null;
  lessonId: number;
  lessonTitle: string | null;
  status: AttemptStatus;
  statusLabel: string;
  submittedAt: string | null;
  score: number;
  totalPoint: number;
  percent: number;
  stars: number | null;
  badges: StudentBadge[];
}

export interface ScorePoint {
  attemptId: number;
  submittedAt: string | null;
  quizName: string | null;
  percent: number;
}

export interface CompletedLesson {
  lessonId: number;
  title: string | null;
  quizzesDone: number;
  quizzesPublished: number;
}

export interface StudentProfileStats {
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
  classId: number;
  className: string | null;
  level: 1 | 2 | 3;
  isActive: boolean;
  lastLoginAt: string | null;
  quizzesSubmitted: number;
  quizzesPublished: number;
  finishedAttempts: number;
  averagePercent: number | null;
  totalStars: number | null;
  history: StudentHistoryRow[];
  scoreTrend: ScorePoint[];
  completedLessons: CompletedLesson[];
  masteryByHeritage: MasteryRow[];
  masteryByProvince: MasteryRow[];
  masteryByHeritageType: MasteryRow[];
  badges: BadgeCount[];
  message: string | null;
}

export function createStatisticsApi(client: ApiClient) {
  const { request } = client;
  return {
    /** Tab Tổng quan của Kết quả bài kiểm tra. */
    quizOverview: (quizId: number) => request<QuizResultsOverview>(STATISTICS_ENDPOINTS.overview(quizId)),
    /** Tab Từng câu. */
    quizQuestions: (quizId: number) => request<QuizQuestionStats>(STATISTICS_ENDPOINTS.questions(quizId)),
    /** Tab Từng học sinh: mỗi học sinh đang hoạt động một dòng, kể cả em chưa làm. */
    quizStudents: (quizId: number) => request<QuizStudents>(STATISTICS_ENDPOINTS.students(quizId)),
    /** Tỉ lệ đúng theo di sản và dạng câu của riêng bài này. */
    quizTopics: (quizId: number) => request<QuizTopicStats>(STATISTICS_ENDPOINTS.topics(quizId)),
    /** Chi tiết bài làm của một học sinh; giáo viên luôn xem được kể cả khi bài không cho em xem đáp án. */
    attempt: (attemptId: number) => request<TeacherAttemptDetail>(STATISTICS_ENDPOINTS.attempt(attemptId)),
    /** Tab Tiến độ của lớp. */
    classProgress: (classId: number) => request<ClassProgress>(STATISTICS_ENDPOINTS.progress(classId)),
    /** Tab Thành thạo của lớp, lọc theo tỉnh và loại di sản. */
    classMastery: (classId: number, filter: ClassMasteryFilter = {}) =>
      request<ClassMastery>(STATISTICS_ENDPOINTS.mastery(classId), {
        query: { provinceId: filter.provinceId === '' ? undefined : filter.provinceId, heritageType: filter.heritageType || undefined },
      }),
    /** Hồ sơ học tập của một học sinh trong lớp. */
    studentProfile: (classId: number, studentId: number) => request<StudentProfileStats>(STATISTICS_ENDPOINTS.profile(classId, studentId)),
  };
}

export type StatisticsApi = ReturnType<typeof createStatisticsApi>;
