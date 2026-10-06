import type { LessonListFilter, QuestionListFilter } from '@dsvhvn/dung-chung/api';
import type { ClassListQuery, StudentListQuery } from './classroomEndpoints';
import type { LanguageCode, TranslationQueueQuery } from '@dsvhvn/dung-chung/api';
import type { AuditLogQuery, HeritageListQuery, InvoiceListQuery, OrganizationListQuery, TeacherListQuery } from './endpoints';

// Khóa bộ nhớ đệm của React Query. Khóa cha (ví dụ ['org']) dùng để làm mới cả nhóm sau khi ghi.

export const queryKeys = {
  /** Trường của quản trị trường: thông tin, gói, bộ đếm giáo viên (Trường và gói, Giáo viên của trường, thanh báo gói). */
  org: ['org'] as const,
  teachers: (query: TeacherListQuery) => ['org', 'teachers', query] as const,

  organizations: ['admin', 'organizations'] as const,
  organizationList: (query: OrganizationListQuery) => ['admin', 'organizations', 'list', query] as const,
  organization: (id: number) => ['admin', 'organizations', 'detail', id] as const,

  /** Danh mục 34 tỉnh (chỉ đọc, hầu như không đổi). */
  provinces: ['admin', 'provinces'] as const,
  heritages: ['admin', 'heritages'] as const,
  heritageList: (query: HeritageListQuery) => ['admin', 'heritages', 'list', query] as const,
  heritage: (id: number) => ['admin', 'heritages', 'detail', id] as const,

  /** Mô hình 3D của một di sản (tab Mô hình 3D); làm mới cùng danh sách di sản vì cột và bộ lọc "có mô hình 3D" đọc từ đó. */
  heritageModels: (heritageId: number) => ['admin', 'heritages', 'models', heritageId] as const,

  /** Bản dịch và tóm tắt: bảng của một di sản, hàng chờ duyệt, số đếm các tab, nội dung hai cột (làm mới cả nhóm sau khi dịch, sửa, duyệt, từ chối). */
  translations: ['admin', 'translations'] as const,
  translationOverview: (heritageId: number) => ['admin', 'translations', 'overview', heritageId] as const,
  translationQueue: (query: TranslationQueueQuery) => ['admin', 'translations', 'queue', query] as const,
  translationCounts: ['admin', 'translations', 'counts'] as const,
  translationDetail: (heritageId: number, kind: string, language: LanguageCode) =>
    ['admin', 'translations', 'detail', heritageId, kind, language] as const,
  /** Di sản để chọn ở bộ lọc của màn hình Duyệt bản dịch và tóm tắt. */
  translationHeritages: ['admin', 'translations', 'heritage-options'] as const,

  /** Lớp của giáo viên: danh sách, chi tiết và học sinh của lớp (làm mới cả nhóm sau khi thêm, sửa, xóa). */
  classes: ['teacher', 'classes'] as const,
  classList: (query: ClassListQuery) => ['teacher', 'classes', 'list', query] as const,
  classDetail: (id: number) => ['teacher', 'classes', 'detail', id] as const,
  classStudents: (id: number, query: StudentListQuery) => ['teacher', 'classes', 'students', id, query] as const,

  /** Bài học của giáo viên: danh sách, chi tiết, thư viện ảnh và hạn mức AI (làm mới cả nhóm sau khi ghi). */
  lessons: ['teacher', 'lessons'] as const,
  lessonList: (filter: LessonListFilter) => ['teacher', 'lessons', 'list', filter] as const,
  lessonDetail: (id: number) => ['teacher', 'lessons', 'detail', id] as const,
  lessonMaterials: (id: number) => ['teacher', 'lessons', 'materials', id] as const,
  /** Bài như học sinh của lớp thấy (giáo viên xem trước); không giữ lại khi đóng. */
  lessonPreview: (id: number) => ['teacher', 'lessons', 'preview', id] as const,
  aiQuota: ['teacher', 'lessons', 'ai-quota'] as const,
  /** Di sản đã xuất bản để chọn cho bài học. */
  publishedHeritages: (filter: unknown) => ['teacher', 'published-heritages', filter] as const,
  discoveryFilters: ['teacher', 'discovery-filters'] as const,

  /** Ngân hàng câu hỏi của giáo viên: danh sách, số đếm các tab, bảng dạng câu theo cấp, chi tiết (làm mới cả nhóm sau khi ghi). */
  questions: ['teacher', 'questions'] as const,
  questionList: (filter: QuestionListFilter) => ['teacher', 'questions', 'list', filter] as const,
  questionCounts: ['teacher', 'questions', 'counts'] as const,
  questionTypes: ['teacher', 'questions', 'types'] as const,
  questionDetail: (id: number) => ['teacher', 'questions', 'detail', id] as const,
  questionQuota: (lessonId: number) => ['teacher', 'questions', 'quota', lessonId] as const,
  /** Ảnh trong thư viện của một di sản (để chọn hình cho câu hỏi). */
  heritageImages: (heritageId: number) => ['teacher', 'heritage-images', heritageId] as const,

  /** Gói dịch vụ (quản trị hệ thống). */
  plans: ['admin', 'plans'] as const,

  /** Gói và thanh toán của trường: tổng quan, gói đang bán, báo giá, hóa đơn, kết quả một giao dịch (làm mới cả nhóm sau khi mua, hủy, thanh toán). */
  billing: ['org', 'billing'] as const,
  billingOverview: ['org', 'billing', 'overview'] as const,
  planOffers: ['org', 'billing', 'offers'] as const,
  planQuote: (planId: number) => ['org', 'billing', 'quote', planId] as const,
  invoices: ['org', 'billing', 'invoices'] as const,
  invoiceList: (query: InvoiceListQuery) => ['org', 'billing', 'invoices', 'list', query] as const,
  invoiceDetail: (id: number) => ['org', 'billing', 'invoices', 'detail', id] as const,
  paymentResult: (id: number) => ['org', 'billing', 'payment', id] as const,

  auditLogs: (query: AuditLogQuery) => ['admin', 'audit-logs', query] as const,
};
