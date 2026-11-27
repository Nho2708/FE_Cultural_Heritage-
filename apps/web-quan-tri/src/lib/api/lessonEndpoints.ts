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
  type LessonSampleResult,
  type NotifyClassResult,
  type Paged,
  type PublishLessonResult,
  type RewriteSectionBody,
  type RewriteSectionResult,
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
  /** Gửi thông báo cho cả lớp về bài đã xuất bản; lời nhắn để trống thì dùng câu mặc định. */
  notifyClass: (lessonId: number, message: string | null) =>
    apiRequest<NotifyClassResult>(`/teacher/lessons/${lessonId}/notify-class`, { method: 'POST', body: { message } }),

  archive: (lessonId: number) => apiRequest<LessonDetail>(`/teacher/lessons/${lessonId}/archive`, { method: 'POST' }),

  /** `includeQuizzes`: chép kèm mọi bài kiểm tra chưa xóa thành bản nháp (bỏ giờ mở, giờ đóng, câu ẩn và câu không hợp cấp lớp đích). */
  duplicate: (lessonId: number, targetClassId: number, includeQuizzes = false) =>
    apiRequest<DuplicateLessonResult>(`/teacher/lessons/${lessonId}/duplicate`, { method: 'POST', body: { targetClassId, includeQuizzes } }),

  /** Ảnh và sự kiện của các di sản của bài, để chọn hình và mốc thời gian. */
  materials: (lessonId: number) => apiRequest<LessonMaterials>(`/teacher/lessons/${lessonId}/materials`),

  /**
   * AI soạn bản nháp đúng cấp của lớp; không tự lưu hay xuất bản. `instructions` là yêu cầu thêm của giáo viên (cắt khoảng trắng,
   * tối đa 500 ký tự); để trống thì không gửi.
   */
  compose: (lessonId: number, length: LessonLength, instructions?: string) => {
    const note = instructions?.trim();
    return apiRequest<LessonDraft>(`/teacher/lessons/${lessonId}/ai/compose`, {
      method: 'POST',
      body: note ? { length, instructions: note } : { length },
    });
  },

  /** AI viết lại riêng một phần (chữ đang sửa, chưa cần lưu); không lưu vào bài, mỗi lần tính một lượt AI. */
  rewriteSection: (lessonId: number, body: RewriteSectionBody) =>
    apiRequest<RewriteSectionResult>(`/teacher/lessons/${lessonId}/ai/rewrite-section`, { method: 'POST', body }),

  /** Đề xuất bài đã xuất bản vào thư viện bài mẫu (chờ quản trị hệ thống duyệt). */
  requestSample: (lessonId: number) =>
    apiRequest<LessonSampleResult>(`/teacher/lessons/${lessonId}/sample-request`, { method: 'POST' }),

  /** Rút bài khỏi thư viện bài mẫu (từ chờ duyệt, trong thư viện hoặc bị từ chối). */
  withdrawSample: (lessonId: number) =>
    apiRequest<LessonSampleResult>(`/teacher/lessons/${lessonId}/sample-request`, { method: 'DELETE' }),

  /** "Xem như học sinh": bài đúng như học sinh của lớp thấy, kể cả bài Nháp; chỉ đọc, không ghi gì. */
  previewAsStudent: (lessonId: number) => apiRequest<LessonPreview>(`/teacher/lessons/${lessonId}/preview`),

  aiQuota: () => apiRequest<AiQuota>('/teacher/lessons/ai-quota'),
};

/**
 * Di sản đã xuất bản để chọn cho bài học, câu hỏi, thống kê: dùng API công khai (chỉ trả di sản đã xuất bản). Web quản trị chỉ có
 * tiếng Việt nên luôn xin bản tiếng Việt; không đặt thì máy chủ chọn theo Accept-Language của trình duyệt (trình duyệt tiếng Anh
 * sẽ nhận "[en] Đô thị cổ Hội An").
 */
export const publishedHeritagesApi = createDiscoveryApi(apiClient, { lang: 'vi' });
