import type { LessonListFilter, QuestionListFilter } from '@dsvhvn/dung-chung/api';
import type { ClassListQuery, StudentListQuery } from './classroomEndpoints';
import type { AuditLogQuery, HeritageListQuery, OrganizationListQuery, TeacherListQuery } from './endpoints';

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

  auditLogs: (query: AuditLogQuery) => ['admin', 'audit-logs', query] as const,
};
