import {
  createDiscoveryApi,
  type AiQuota,
  type CreateLessonBody,
  type DuplicateLessonResult,
  type LessonDetail,
  type LessonDraft,
  type LessonLength,
  type LessonListFilter,
  type LessonMaterials,
  type LessonPreview,
  type LessonRow,
  type Paged,
  type PublishLessonResult,
  type UpdateLessonBody,
} from '@dsvhvn/dung-chung/api';
import { apiClient, apiRequest } from './client';

// Endpoint của luồng Bài học cho lớp theo cấp (khu giáo viên). Giáo viên chỉ thấy và sửa bài do mình tạo ở lớp của mình; bài của
// người khác trả 404. Cấp của bài là cấp của lớp nên không có tham số cấp. Mỗi lần gọi AI là một lượt trong hạn mức của trường.

export const lessonsApi = {
  list: (filter: LessonListFilter) =>
    apiRequest<Paged<LessonRow>>('/teacher/lessons', {
      query: {
        classId: filter.classId === '' ? undefined : filter.classId,
        status: filter.status || undefined,
        heritageType: filter.heritageType || undefined,
        difficulty: filter.difficulty || undefined,
        keyword: filter.keyword || undefined,
        page: filter.page,
        pageSize: filter.pageSize,
      },
    }),

  /** Tạo bài nháp cho một lớp với 1-10 di sản đã xuất bản. Cần gói hiệu lực. */
  create: (body: CreateLessonBody) => apiRequest<LessonDetail>('/teacher/lessons', { method: 'POST', body }),

  get: (lessonId: number) => apiRequest<LessonDetail>(`/teacher/lessons/${lessonId}`),

  update: (lessonId: number, body: UpdateLessonBody) =>
    apiRequest<LessonDetail>(`/teacher/lessons/${lessonId}`, { method: 'PUT', body }),

  /** Xóa mềm bài chưa có bài kiểm tra. */
  remove: (lessonId: number) => apiRequest<null>(`/teacher/lessons/${lessonId}`, { method: 'DELETE' }),

  /** Lần đầu sinh mã bài học; xuất bản lại giữ nguyên mã. */
  publish: (lessonId: number) => apiRequest<PublishLessonResult>(`/teacher/lessons/${lessonId}/publish`, { method: 'POST' }),

  archive: (lessonId: number) => apiRequest<LessonDetail>(`/teacher/lessons/${lessonId}/archive`, { method: 'POST' }),

  /** `includeQuizzes`: chép kèm mọi bài kiểm tra chưa xóa thành bản nháp (bỏ giờ mở, giờ đóng, câu ẩn và câu không hợp cấp lớp đích). */
  duplicate: (lessonId: number, targetClassId: number, includeQuizzes = false) =>
    apiRequest<DuplicateLessonResult>(`/teacher/lessons/${lessonId}/duplicate`, { method: 'POST', body: { targetClassId, includeQuizzes } }),

  /** Ảnh và sự kiện của các di sản của bài, để chọn hình và mốc thời gian. */
  materials: (lessonId: number) => apiRequest<LessonMaterials>(`/teacher/lessons/${lessonId}/materials`),

  /** AI soạn bản nháp đúng cấp của lớp; không tự lưu hay xuất bản. */
  compose: (lessonId: number, length: LessonLength) =>
    apiRequest<LessonDraft>(`/teacher/lessons/${lessonId}/ai/compose`, { method: 'POST', body: { length } }),

  /** "Xem như học sinh": bài đúng như học sinh của lớp thấy, kể cả bài Nháp; chỉ đọc, không ghi gì. */
  previewAsStudent: (lessonId: number) => apiRequest<LessonPreview>(`/teacher/lessons/${lessonId}/preview`),

  aiQuota: () => apiRequest<AiQuota>('/teacher/lessons/ai-quota'),
};

/** Di sản đã xuất bản để chọn cho bài học: dùng API công khai (chỉ trả di sản đã xuất bản). */
export const publishedHeritagesApi = createDiscoveryApi(apiClient);
