import type {
  AdminLessonLibraryDetail,
  AdminLessonLibraryQuery,
  AdminLessonLibraryResult,
  AdminLessonLibraryRow,
  DuplicateLessonResult,
  LessonLibraryDetail,
  LessonLibraryFilter,
  LessonLibraryItem,
  Paged,
  UseLibraryLessonBody,
} from '@dsvhvn/dung-chung/api';
import { apiRequest } from './client';

// Endpoint của thư viện bài mẫu. Giáo viên: xem danh sách và xem trước các bài đã được duyệt của mọi trường, dùng một bài cho lớp của
// mình (tạo bài Nháp mới, không tốn lượt AI). Quản trị hệ thống: duyệt, từ chối hoặc gỡ bài. Quản trị trường không dùng thư viện.

export const lessonLibraryApi = {
  list: (filter: LessonLibraryFilter) =>
    apiRequest<Paged<LessonLibraryItem>>('/teacher/lesson-library', {
      query: {
        level: filter.level === '' ? undefined : filter.level,
        grade: filter.grade === '' ? undefined : filter.grade,
        heritageId: filter.heritageId === '' ? undefined : filter.heritageId,
        topicId: filter.topicId === '' ? undefined : filter.topicId,
        keyword: filter.keyword || undefined,
        sort: filter.sort || undefined,
        page: filter.page,
        pageSize: filter.pageSize,
      },
    }),

  get: (lessonId: number) => apiRequest<LessonLibraryDetail>(`/teacher/lesson-library/${lessonId}`),

  /** Tạo bài Nháp mới ở lớp của giáo viên từ bài mẫu; cần gói hiệu lực. `includeQuizzes`: chép kèm các bài kiểm tra của bài mẫu. */
  use: (lessonId: number, body: UseLibraryLessonBody) =>
    apiRequest<DuplicateLessonResult>(`/teacher/lesson-library/${lessonId}/use`, { method: 'POST', body }),
};

export const adminLessonLibraryApi = {
  list: (query: AdminLessonLibraryQuery) =>
    apiRequest<Paged<AdminLessonLibraryRow>>('/admin/lesson-library', {
      query: {
        status: query.status || undefined,
        level: query.level === '' ? undefined : query.level,
        keyword: query.keyword || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    }),

  get: (lessonId: number) => apiRequest<AdminLessonLibraryDetail>(`/admin/lesson-library/${lessonId}`),

  approve: (lessonId: number) => apiRequest<AdminLessonLibraryResult>(`/admin/lesson-library/${lessonId}/approve`, { method: 'POST' }),

  /** Từ chối bài chờ duyệt hoặc gỡ bài khỏi thư viện: bắt buộc lý do 1-500 ký tự. */
  reject: (lessonId: number, note: string) =>
    apiRequest<AdminLessonLibraryResult>(`/admin/lesson-library/${lessonId}/reject`, { method: 'POST', body: { note } }),
};
