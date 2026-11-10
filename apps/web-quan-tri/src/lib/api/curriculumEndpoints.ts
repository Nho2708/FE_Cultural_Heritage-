import type {
  AdminCurriculumTopic,
  AdminCurriculumTopicHeritages,
  AdminCurriculumTopicQuery,
  CurriculumTopicHeritages,
  CurriculumTopicInput,
  CurriculumTopicList,
} from '@dsvhvn/dung-chung/api';
import { apiRequest } from './client';

// Endpoint của chủ đề chương trình (bản gọn). Giáo viên chỉ thấy chủ đề đang dùng và di sản đang xuất bản; quản trị hệ thống thấy cả chủ đề
// ngừng dùng, thêm, sửa, ngừng, dùng lại chủ đề và thay toàn bộ danh sách di sản của chủ đề.

export const teacherCurriculumApi = {
  /** Chủ đề đang dùng của một khối, theo thứ tự chương trình. */
  list: (grade: number) => apiRequest<CurriculumTopicList>('/teacher/curriculum-topics', { query: { grade } }),

  /** Di sản đang xuất bản của một chủ đề; 404 khi chủ đề ngừng dùng hoặc không có. */
  heritages: (topicId: number) => apiRequest<CurriculumTopicHeritages>(`/teacher/curriculum-topics/${topicId}/heritages`),
};

export const adminCurriculumApi = {
  list: (query: AdminCurriculumTopicQuery) =>
    apiRequest<{ items: AdminCurriculumTopic[] }>('/admin/curriculum-topics', {
      query: {
        grade: query.grade === '' ? undefined : query.grade,
        includeInactive: query.includeInactive ? true : undefined,
      },
    }),

  /** 201; 400 theo trường; 409 khi trùng (khối, môn, chủ đề lớn, nội dung). */
  create: (body: CurriculumTopicInput) => apiRequest<AdminCurriculumTopic>('/admin/curriculum-topics', { method: 'POST', body }),

  update: (id: number, body: CurriculumTopicInput) =>
    apiRequest<AdminCurriculumTopic>(`/admin/curriculum-topics/${id}`, { method: 'PUT', body }),

  /** Ngừng dùng: giáo viên không thấy nữa, liên kết với di sản vẫn giữ. Không xóa cứng chủ đề. */
  deactivate: (id: number) => apiRequest<AdminCurriculumTopic>(`/admin/curriculum-topics/${id}/deactivate`, { method: 'POST' }),

  activate: (id: number) => apiRequest<AdminCurriculumTopic>(`/admin/curriculum-topics/${id}/activate`, { method: 'POST' }),

  heritages: (id: number) => apiRequest<AdminCurriculumTopicHeritages>(`/admin/curriculum-topics/${id}/heritages`),

  /** Thay toàn bộ danh sách di sản của chủ đề (0-200 di sản, không trùng, chưa xóa). */
  setHeritages: (id: number, heritageIds: readonly number[]) =>
    apiRequest<AdminCurriculumTopicHeritages>(`/admin/curriculum-topics/${id}/heritages`, { method: 'PUT', body: { heritageIds } }),
};
