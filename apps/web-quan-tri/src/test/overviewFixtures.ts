import type {
  OverviewClass,
  QuestionQualityPage,
  QuestionQualityRow,
  QuestionRow,
  SchoolOverview,
  SystemOverview,
  SystemTrend,
  SystemTrendPoint,
} from '@dsvhvn/dung-chung/api';
import { questionRowOf } from './questionFixtures';

// Dữ liệu mẫu của luồng Quản trị và tổng quan, dựng theo khuôn máy chủ trả.

export function overviewClassOf(id: number, name: string, averagePercent: number | null, overrides: Partial<OverviewClass> = {}): OverviewClass {
  return {
    classId: id,
    className: name,
    grade: 7,
    schoolLevel: 2,
    schoolLevelName: 'Cấp 2 (Trung học cơ sở)',
    schoolYear: '2026-2027',
    activeStudents: 30,
    finishedAttempts: averagePercent === null ? 0 : 40,
    averagePercent,
    ...overrides,
  };
}

export function schoolOverviewOf(overrides: Partial<SchoolOverview> = {}): SchoolOverview {
  return {
    organizationId: 1,
    organizationName: 'THCS Nguyễn Du',
    generatedAt: '2026-10-07T00:30:00Z',
    plan: { id: 3, planId: 2, planName: 'Cơ bản', status: 'ACTIVE', startDate: '2026-09-29', endDate: '2027-09-28', isEffective: true },
    planNotice: { kind: 'NONE', daysLeft: null, message: null },
    teachers: { used: 8, max: 10, planName: 'Cơ bản', canAddTeacher: true },
    classCount: 3,
    levels: [
      { schoolLevel: 1, schoolLevelName: 'Cấp 1 (Tiểu học)', classCount: 0, activeStudents: 0, finishedAttempts: 0, averagePercent: null },
      { schoolLevel: 2, schoolLevelName: 'Cấp 2 (Trung học cơ sở)', classCount: 3, activeStudents: 90, finishedAttempts: 80, averagePercent: 73 },
      { schoolLevel: 3, schoolLevelName: 'Cấp 3 (Trung học phổ thông)', classCount: 0, activeStudents: 0, finishedAttempts: 0, averagePercent: null },
    ],
    students: { active: 1248, loggedIn: 1106, neverLoggedIn: 142 },
    lessons: { total: 96, published: 80 },
    quizzes: { published: 57, open: 12 },
    attempts: { finished: 4310, averagePercent: 73 },
    classes: [overviewClassOf(1, '6A1', 82), overviewClassOf(2, '7A1', 78), overviewClassOf(3, '8A3', null)],
    ai: { hasEffectivePlan: true, planName: 'Cơ bản', used: 468, max: 500, remaining: 32, periodStart: '2026-09-29', periodEnd: '2026-10-28' },
    ...overrides,
  };
}

export function systemOverviewOf(overrides: Partial<SystemOverview> = {}): SystemOverview {
  return {
    generatedAt: '2026-10-07T00:30:00Z',
    schools: { total: 13, withEffectivePlan: 12, withoutEffectivePlan: 1 },
    teachers: { total: 84, active: 80 },
    activeStudents: 3260,
    content: {
      publishedHeritages: 120,
      lessons: 300,
      publishedLessons: 250,
      publishedQuizzes: 180,
      finishedAttempts: 9000,
      questions: { approved: 1236, pending: 20, hidden: 4 },
    },
    ai: { total: 1482, byTeachers: 1400, byAdmin: 82, thisMonth: 300 },
    plans: [
      { planId: 1, planName: 'Miễn phí', price: 0, isActive: true, activeSchools: 5, expiringSoonSchools: 1 },
      { planId: 2, planName: 'Cơ bản', price: 1990000, isActive: true, activeSchools: 5, expiringSoonSchools: 0 },
      { planId: 3, planName: 'Nâng cao', price: 3990000, isActive: false, activeSchools: 2, expiringSoonSchools: 0 },
    ],
    revenue: { available: false, message: 'Doanh thu theo kỳ sẽ có khi nối gói dịch vụ và thanh toán VNPay. Doanh thu quảng cáo xem ở bảng điều khiển Google.' },
    ...overrides,
  };
}

function pointOf(period: string, overrides: Partial<SystemTrendPoint> = {}): SystemTrendPoint {
  return { period, newSchools: 0, newTeachers: 0, newStudents: 0, lessonsCreated: 0, quizzesPublished: 0, attemptsFinished: 0, aiRequests: 0, ...overrides };
}

export function trendOf(overrides: Partial<SystemTrend> = {}): SystemTrend {
  const points = [pointOf('2026-10-05', { attemptsFinished: 10 }), pointOf('2026-10-06'), pointOf('2026-10-07', { attemptsFinished: 25 })];
  return {
    from: '2026-10-05',
    to: '2026-10-07',
    granularity: 'DAY',
    points,
    totals: pointOf('', { attemptsFinished: 35 }),
    ...overrides,
  };
}

export function qualityRowOf(id: number, overrides: Partial<QuestionQualityRow> = {}, question: Partial<QuestionRow> = {}): QuestionQualityRow {
  return {
    question: questionRowOf(id, { isMine: false, ...question }),
    answered: 40,
    correct: 30,
    correctRatePercent: 75,
    lowQuality: false,
    hiddenAt: null,
    ...overrides,
  };
}

export function qualityPageOf(items: QuestionQualityRow[], overrides: Partial<QuestionQualityPage> = {}): QuestionQualityPage {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
    approvedCount: 1236,
    hiddenCount: 4,
    lowQualityCount: 7,
    minAnswers: 10,
    lowCorrectPercent: 30,
    ...overrides,
  };
}
