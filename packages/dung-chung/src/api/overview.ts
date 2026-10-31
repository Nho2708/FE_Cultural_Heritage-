import type { PaymentStatus } from './billing';
import type { ApiClient } from './client';
import type { AiQuota } from './lessons';
import type { QuestionDetail, QuestionDifficulty, QuestionReviewStatus, QuestionRow, QuestionType } from './questions';
import type { Paged, SchoolLevel, Subscription, TeacherQuota } from './types';

// Luồng Quản trị và tổng quan: Tổng quan trường (quản trị trường), Tổng quan hệ thống và biểu đồ theo thời gian, Kiểm duyệt ngân hàng câu hỏi
// (quản trị hệ thống). JSON camelCase, enum là chuỗi viết HOA như máy chủ. Mọi số liệu máy chủ tính khi hiển thị, chỉ có số tổng, không có tên
// học sinh hay giáo viên. Điểm trung bình là trung bình phần trăm của từng lượt đã nộp (so được các bài có tổng điểm khác nhau).

export const OVERVIEW_ENDPOINTS = {
  school: '/org/overview',
  system: '/admin/overview',
  trend: '/admin/overview/trend',
  payments: '/admin/overview/payments',
  quality: '/admin/questions/quality',
  question: (id: number) => `/admin/questions/${id}`,
  hide: (id: number) => `/admin/questions/${id}/hide`,
  restore: (id: number) => `/admin/questions/${id}/restore`,
} as const;

/** Lời nhắc về gói ở đầu Tổng quan trường: không có, còn không quá 14 ngày, hoặc không có gói hiệu lực. */
export type PlanNoticeKind = 'NONE' | 'EXPIRING_SOON' | 'NO_EFFECTIVE_PLAN';

export interface PlanNotice {
  kind: PlanNoticeKind;
  daysLeft: number | null;
  message: string | null;
}

/** Số đếm theo một cấp học. `averagePercent` null khi chưa có lượt nộp nào. */
export interface OverviewLevel {
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  classCount: number;
  activeStudents: number;
  finishedAttempts: number;
  averagePercent: number | null;
}

/** Một lớp trong tổng quan: chỉ số tổng hợp, không có giáo viên hay danh sách học sinh. */
export interface OverviewClass {
  classId: number;
  className: string | null;
  grade: number;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  schoolYear: string | null;
  activeStudents: number;
  finishedAttempts: number;
  averagePercent: number | null;
}

export interface SchoolOverview {
  organizationId: number;
  organizationName: string;
  generatedAt: string;
  plan: Subscription | null;
  planNotice: PlanNotice;
  teachers: TeacherQuota;
  classCount: number;
  levels: OverviewLevel[];
  students: { active: number; loggedIn: number; neverLoggedIn: number };
  lessons: { total: number; published: number };
  quizzes: { published: number; open: number };
  attempts: { finished: number; averagePercent: number | null };
  classes: OverviewClass[];
  ai: AiQuota;
}

export interface SystemPlanUsage {
  planId: number;
  planName: string | null;
  price: number | null;
  isActive: boolean;
  activeSchools: number;
  expiringSoonSchools: number;
}

export interface SystemOverview {
  generatedAt: string;
  /** Số giao dịch thất bại trong 7 ngày gần nhất, cho mục Cần chú ý. */
  recentFailedPayments: number;
  schools: { total: number; withEffectivePlan: number; withoutEffectivePlan: number };
  teachers: { total: number; active: number };
  activeStudents: number;
  content: {
    publishedHeritages: number;
    lessons: number;
    publishedLessons: number;
    publishedQuizzes: number;
    finishedAttempts: number;
    questions: { approved: number; pending: number; hidden: number };
  };
  ai: { total: number; byTeachers: number; byAdmin: number; thisMonth: number };
  plans: SystemPlanUsage[];
  /**
   * Doanh thu từ giao dịch VNPay thành công theo ngày thanh toán giờ Việt Nam (đồng): từ trước tới nay, tháng này, hôm nay, số giao dịch
   * thành công. `message` nhắc doanh thu quảng cáo xem ở bảng điều khiển của Google.
   */
  revenue: { available: boolean; message: string; total: number; thisMonth: number; today: number; succeededPayments: number };
}

export type TrendGranularity = 'DAY' | 'MONTH';

/** Một kỳ của biểu đồ: ngày `yyyy-MM-dd` hoặc tháng `yyyy-MM` (giờ Việt Nam). */
export interface SystemTrendPoint {
  period: string;
  newSchools: number;
  newTeachers: number;
  newStudents: number;
  lessonsCreated: number;
  quizzesPublished: number;
  attemptsFinished: number;
  aiRequests: number;
  /** Doanh thu (đồng) của giao dịch thành công trả trong kỳ. */
  revenue: number;
}

export interface SystemTrend {
  from: string;
  to: string;
  granularity: TrendGranularity;
  points: SystemTrendPoint[];
  totals: SystemTrendPoint;
}

export interface TrendQuery {
  from?: string;
  to?: string;
  granularity?: TrendGranularity;
}

/** Một giao dịch thanh toán của tab Doanh thu (mọi trường). `paidAt` chỉ có ở giao dịch thành công. */
export interface SystemPayment {
  id: number;
  invoiceId: number;
  invoiceNumber: string | null;
  organizationId: number;
  organizationName: string | null;
  planName: string | null;
  providerCode: string | null;
  providerTransactionId: string | null;
  amount: number | null;
  status: PaymentStatus | null;
  createdAt: string | null;
  paidAt: string | null;
}

/** Lọc danh sách giao dịch: trạng thái, trường, khoảng ngày tạo giao dịch (`yyyy-MM-dd` giờ Việt Nam, gồm cả hai đầu), trang. */
export interface SystemPaymentQuery {
  status?: PaymentStatus | '';
  organizationId?: number | '';
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type QuestionQualitySort = 'NEWEST' | 'LOWEST_RATE';

export interface QuestionQualityFilter {
  /** Chỉ APPROVED (đang trong ngân hàng) hoặc REJECTED (đã bị ẩn); bỏ trống là cả hai. */
  status?: Extract<QuestionReviewStatus, 'APPROVED' | 'REJECTED'> | '';
  lowQualityOnly?: boolean;
  sort?: QuestionQualitySort;
  questionType?: QuestionType | '';
  level?: number | '';
  difficultyLevel?: QuestionDifficulty | '';
  heritageId?: number | '';
  organizationId?: number | '';
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** Dòng kiểm duyệt: dòng câu hỏi kèm chất lượng tính từ lượt đã nộp. `correctRatePercent` null khi chưa ai làm. */
export interface QuestionQualityRow {
  question: QuestionRow;
  answered: number;
  correct: number;
  correctRatePercent: number | null;
  /** Đủ số lượt trả lời mà tỉ lệ đúng quá thấp (ngưỡng ở `minAnswers`, `lowCorrectPercent` của trang). */
  lowQuality: boolean;
  hiddenAt: string | null;
}

export interface QuestionQualityPage extends Paged<QuestionQualityRow> {
  approvedCount: number;
  hiddenCount: number;
  lowQualityCount: number;
  minAnswers: number;
  lowCorrectPercent: number;
}

export function createOverviewApi(client: ApiClient) {
  const { request } = client;
  return {
    /** Quản trị trường: tổng quan của trường mình. */
    school: () => request<SchoolOverview>(OVERVIEW_ENDPOINTS.school),
    /** Quản trị hệ thống: tổng quan toàn nền tảng. */
    system: () => request<SystemOverview>(OVERVIEW_ENDPOINTS.system),
    trend: (query: TrendQuery = {}) =>
      request<SystemTrend>(OVERVIEW_ENDPOINTS.trend, { query: { from: query.from, to: query.to, granularity: query.granularity } }),
    /** Quản trị hệ thống: giao dịch thanh toán của mọi trường, mới nhất trước. */
    payments: (query: SystemPaymentQuery = {}) =>
      request<Paged<SystemPayment>>(OVERVIEW_ENDPOINTS.payments, {
        query: {
          status: query.status || undefined,
          organizationId: query.organizationId === '' ? undefined : query.organizationId,
          from: query.from,
          to: query.to,
          page: query.page,
          pageSize: query.pageSize,
        },
      }),
  };
}

export function createAdminQuestionsApi(client: ApiClient) {
  const { request } = client;
  return {
    quality: (filter: QuestionQualityFilter = {}) =>
      request<QuestionQualityPage>(OVERVIEW_ENDPOINTS.quality, {
        query: {
          status: filter.status || undefined,
          lowQualityOnly: filter.lowQualityOnly ? true : undefined,
          sort: filter.sort,
          questionType: filter.questionType || undefined,
          level: filter.level === '' ? undefined : filter.level,
          difficultyLevel: filter.difficultyLevel || undefined,
          heritageId: filter.heritageId === '' ? undefined : filter.heritageId,
          organizationId: filter.organizationId === '' ? undefined : filter.organizationId,
          keyword: filter.keyword || undefined,
          page: filter.page,
          pageSize: filter.pageSize,
        },
      }),
    get: (id: number) => request<QuestionDetail>(OVERVIEW_ENDPOINTS.question(id)),
    /** Ẩn câu đã duyệt: lý do (tùy chọn) vào nhật ký thao tác. */
    hide: (id: number, reason?: string | null) =>
      request<QuestionDetail>(OVERVIEW_ENDPOINTS.hide(id), { method: 'POST', body: { reason: reason || null } }),
    /** Hiện lại câu đã ẩn: câu về trạng thái đã duyệt của người tạo. */
    restore: (id: number, reason?: string | null) =>
      request<QuestionDetail>(OVERVIEW_ENDPOINTS.restore(id), { method: 'POST', body: { reason: reason || null } }),
  };
}

export type OverviewApi = ReturnType<typeof createOverviewApi>;
export type AdminQuestionsApi = ReturnType<typeof createAdminQuestionsApi>;
