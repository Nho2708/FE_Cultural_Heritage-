import type {
  AccessToken,
  Account,
  ActorRole,
  AuditAction,
  AuditLog,
  ContentStatus,
  EventInput,
  HeritageDetail,
  HeritagePreviewLink,
  HeritageEvent,
  HeritageInput,
  HeritageMedia,
  HeritageReference,
  HeritageSummary,
  HeritageTimeline,
  HeritageType,
  LoginResult,
  MediaInput,
  MyOrganization,
  NewAccount,
  OrganizationDetail,
  OrganizationInfo,
  OrganizationState,
  OrganizationSummary,
  Paged,
  PasswordTokenInfo,
  Province,
  QueryValue,
  RecognitionLevel,
  ReferenceInput,
  StaffProfile,
  TeacherList,
  TimelineInput,
  UserStatus,
} from '@dsvhvn/dung-chung/api';
import { apiRequest } from './client';

// Endpoint backend mà web quản trị dùng, đường dẫn tương đối so với VITE_API_BASE_URL (…/api/v1).

export interface UploadOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export const authApi = {
  /** Màn hình Đăng nhập: một ô nhận email hoặc tên đăng nhập. Tài khoản học sinh nhận cùng câu sai thông tin. */
  login: (body: { emailOrUsername: string; password: string }) =>
    apiRequest<LoginResult<StaffProfile>>('/auth/login', { method: 'POST', body, auth: false }),

  /** Quên mật khẩu: luôn nhận cùng một câu dù email có thuộc tài khoản nào hay không. */
  forgotPassword: (email: string) =>
    apiRequest<null>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  /** Đặt mật khẩu: kiểm liên kết trước khi hiện ô nhập mật khẩu. */
  checkPasswordToken: (token: string) =>
    apiRequest<PasswordTokenInfo>('/auth/password-token/check', { method: 'POST', body: { token }, auth: false }),

  /** Đặt mật khẩu: dùng cho cả đặt mật khẩu lần đầu và đặt lại sau khi quên. */
  setPassword: (body: { token: string; newPassword: string }) =>
    apiRequest<null>('/auth/set-password', { method: 'POST', body, auth: false }),
};

export const profileApi = {
  get: () => apiRequest<StaffProfile>('/me'),

  update: (body: { fullName: string; phone: string | null; avatarUrl: string | null }) =>
    apiRequest<StaffProfile>('/me', { method: 'PUT', body }),

  /** Mật khẩu mới phải khác mật khẩu hiện tại. Token cũ hết dùng được; phiên hiện tại nhận access token mới. */
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest<AccessToken>('/me/password', { method: 'PUT', body }),
};

export interface OrganizationListQuery extends PageQuery {
  keyword?: string;
  status?: OrganizationState | '';
}

/** Khu quản trị hệ thống: Quản lý trường, Chi tiết trường, biểu mẫu tài khoản quản trị trường. */
export const adminOrganizationsApi = {
  list: (query: OrganizationListQuery) =>
    apiRequest<Paged<OrganizationSummary>>('/admin/organizations', { query: { ...query } }),

  create: (body: OrganizationInfo & { orgAdmin: NewAccount }) =>
    apiRequest<OrganizationDetail>('/admin/organizations', { method: 'POST', body }),

  get: (id: number) => apiRequest<OrganizationDetail>(`/admin/organizations/${id}`),

  update: (id: number, body: OrganizationInfo) =>
    apiRequest<OrganizationDetail>(`/admin/organizations/${id}`, { method: 'PUT', body }),

  /** Ngừng trường (xóa mềm). */
  deactivate: (id: number) => apiRequest<null>(`/admin/organizations/${id}`, { method: 'DELETE' }),

  addOrgAdmin: (id: number, body: NewAccount) =>
    apiRequest<Account>(`/admin/organizations/${id}/org-admins`, { method: 'POST', body }),

  lockOrgAdmin: (id: number, userId: number) =>
    apiRequest<Account>(`/admin/organizations/${id}/org-admins/${userId}/lock`, { method: 'POST' }),

  unlockOrgAdmin: (id: number, userId: number) =>
    apiRequest<Account>(`/admin/organizations/${id}/org-admins/${userId}/unlock`, { method: 'POST' }),
};

export interface TeacherListQuery extends PageQuery {
  keyword?: string;
  status?: UserStatus | '';
}

/** Khu quản trị trường: tab Thông tin trường, Giáo viên của trường, biểu mẫu tài khoản giáo viên. Luôn là trường của người gọi. */
export const orgApi = {
  get: () => apiRequest<MyOrganization>('/org'),

  updateContact: (body: Omit<OrganizationInfo, 'name'>) =>
    apiRequest<MyOrganization>('/org', { method: 'PUT', body }),

  listTeachers: (query: TeacherListQuery) => apiRequest<TeacherList>('/org/teachers', { query: { ...query } }),

  createTeacher: (body: NewAccount) => apiRequest<Account>('/org/teachers', { method: 'POST', body }),

  lockTeacher: (id: number) => apiRequest<Account>(`/org/teachers/${id}/lock`, { method: 'POST' }),

  unlockTeacher: (id: number) => apiRequest<Account>(`/org/teachers/${id}/unlock`, { method: 'POST' }),

  /** Xóa mềm: lớp, bài học, câu hỏi, bài kiểm tra, kết quả của giáo viên giữ nguyên. */
  deleteTeacher: (id: number) => apiRequest<null>(`/org/teachers/${id}`, { method: 'DELETE' }),
};

export interface AuditLogQuery extends PageQuery {
  /** Từ khóa tên đăng nhập hoặc họ tên người làm. */
  actor?: string;
  actorRole?: ActorRole | '';
  action?: AuditAction | '';
  targetType?: string;
  targetId?: number;
  /** ISO 8601 có múi giờ. */
  from?: string;
  to?: string;
}

/** Nhật ký thao tác: chỉ đọc, không vai trò nào sửa hay xóa được. */
export const auditLogsApi = {
  list: (query: AuditLogQuery) =>
    apiRequest<Paged<AuditLog>>('/admin/audit-logs', { query: { ...query } as Record<string, QueryValue> }),
};

export interface HeritageListQuery extends PageQuery {
  /** Tên di sản, không phân biệt hoa thường và dấu. */
  keyword?: string;
  provinceId?: number | '';
  heritageType?: HeritageType | '';
  recognitionLevel?: RecognitionLevel | '';
  status?: ContentStatus | '';
}

const order = (ids: readonly number[]) => ({ method: 'PUT', body: { ids } }) as const;

/** Kho di sản (quản trị hệ thống): danh mục tỉnh, di sản, chuyển trạng thái. */
export const adminHeritagesApi = {
  provinces: () => apiRequest<Province[]>('/admin/provinces'),

  list: (query: HeritageListQuery) =>
    apiRequest<Paged<HeritageSummary>>('/admin/heritages', { query: { ...query } as Record<string, QueryValue> }),

  /** Đường dẫn gợi ý từ tên, không trùng di sản khác (`heritageId` loại chính di sản đang sửa). */
  suggestSlug: (name: string, heritageId?: number) =>
    apiRequest<string>('/admin/heritages/suggest-slug', { query: { name, heritageId } }),

  create: (body: HeritageInput) => apiRequest<HeritageDetail>('/admin/heritages', { method: 'POST', body }),

  get: (id: number) => apiRequest<HeritageDetail>(`/admin/heritages/${id}`),

  update: (id: number, body: HeritageInput) =>
    apiRequest<HeritageDetail>(`/admin/heritages/${id}`, { method: 'PUT', body }),

  /** Xóa mềm: chỉ di sản nháp hoặc đã ẩn và chưa gắn với bài học hay câu hỏi nào. */
  remove: (id: number) => apiRequest<null>(`/admin/heritages/${id}`, { method: 'DELETE' }),

  /** `mediaId` null là bỏ ảnh đại diện. */
  setThumbnail: (id: number, mediaId: number | null) =>
    apiRequest<HeritageDetail>(`/admin/heritages/${id}/thumbnail`, { method: 'PUT', body: { mediaId } }),

  publish: (id: number) => apiRequest<HeritageDetail>(`/admin/heritages/${id}/publish`, { method: 'POST' }),

  archive: (id: number) => apiRequest<HeritageDetail>(`/admin/heritages/${id}/archive`, { method: 'POST' }),

  restore: (id: number) => apiRequest<HeritageDetail>(`/admin/heritages/${id}/restore`, { method: 'POST' }),

  /** Xin mã xem trước bản nháp (hết hạn sau ít phút). Di sản đã xuất bản không cấp (422): mở trang công khai. */
  issuePreview: (id: number) => apiRequest<HeritagePreviewLink>(`/admin/heritages/${id}/preview`, { method: 'POST' }),
};

/** Giai đoạn và sự kiện của một di sản (Biểu mẫu giai đoạn và sự kiện, tab Dòng thời gian). */
export const adminTimelinesApi = {
  createTimeline: (heritageId: number, body: TimelineInput) =>
    apiRequest<HeritageTimeline>(`/admin/heritages/${heritageId}/timelines`, { method: 'POST', body }),

  updateTimeline: (id: number, body: TimelineInput) =>
    apiRequest<HeritageTimeline>(`/admin/timelines/${id}`, { method: 'PUT', body }),

  /** Xóa luôn các sự kiện và ảnh của sự kiện. */
  deleteTimeline: (id: number) => apiRequest<null>(`/admin/timelines/${id}`, { method: 'DELETE' }),

  orderTimelines: (heritageId: number, ids: readonly number[]) =>
    apiRequest<HeritageTimeline[]>(`/admin/heritages/${heritageId}/timelines/order`, order(ids)),

  createEvent: (timelineId: number, body: EventInput) =>
    apiRequest<HeritageEvent>(`/admin/timelines/${timelineId}/events`, { method: 'POST', body }),

  updateEvent: (id: number, body: EventInput) => apiRequest<HeritageEvent>(`/admin/events/${id}`, { method: 'PUT', body }),

  /** Xóa luôn ảnh của sự kiện. */
  deleteEvent: (id: number) => apiRequest<null>(`/admin/events/${id}`, { method: 'DELETE' }),

  orderEvents: (timelineId: number, ids: readonly number[]) =>
    apiRequest<HeritageEvent[]>(`/admin/timelines/${timelineId}/events/order`, order(ids)),
};

/** Ảnh, video, âm thanh minh họa (đường dẫn, kèm ghi công bắt buộc) của di sản hoặc của sự kiện. */
export const adminMediaApi = {
  createForHeritage: (heritageId: number, body: MediaInput) =>
    apiRequest<HeritageMedia>(`/admin/heritages/${heritageId}/media`, { method: 'POST', body }),

  createForEvent: (eventId: number, body: MediaInput) =>
    apiRequest<HeritageMedia>(`/admin/events/${eventId}/media`, { method: 'POST', body }),

  /**
   * Tải ảnh lên (multipart): `file` cùng `author`, `license`, `source` bắt buộc, `caption`, `sortOrder`, `setAsThumbnail`.
   * `onProgress` nhận tỷ lệ đã gửi từ 0 đến 1; `signal` để hủy giữa chừng.
   */
  uploadForHeritage: (heritageId: number, body: FormData, options: UploadOptions = {}) =>
    apiRequest<HeritageMedia>(`/admin/heritages/${heritageId}/media/upload`, {
      method: 'POST',
      body,
      onUploadProgress: options.onProgress,
      signal: options.signal,
    }),

  /** Ảnh minh họa của sự kiện: cùng quy tắc, không chọn làm ảnh đại diện được. */
  uploadForEvent: (eventId: number, body: FormData, options: UploadOptions = {}) =>
    apiRequest<HeritageMedia>(`/admin/events/${eventId}/media/upload`, {
      method: 'POST',
      body,
      onUploadProgress: options.onProgress,
      signal: options.signal,
    }),

  update: (id: number, body: MediaInput) => apiRequest<HeritageMedia>(`/admin/media/${id}`, { method: 'PUT', body }),

  remove: (id: number) => apiRequest<null>(`/admin/media/${id}`, { method: 'DELETE' }),

  orderForHeritage: (heritageId: number, ids: readonly number[]) =>
    apiRequest<HeritageMedia[]>(`/admin/heritages/${heritageId}/media/order`, order(ids)),

  orderForEvent: (eventId: number, ids: readonly number[]) =>
    apiRequest<HeritageMedia[]>(`/admin/events/${eventId}/media/order`, order(ids)),
};

/** Nguồn tham chiếu của di sản. */
export const adminReferencesApi = {
  create: (heritageId: number, body: ReferenceInput) =>
    apiRequest<HeritageReference>(`/admin/heritages/${heritageId}/references`, { method: 'POST', body }),

  update: (id: number, body: ReferenceInput) =>
    apiRequest<HeritageReference>(`/admin/heritage-references/${id}`, { method: 'PUT', body }),

  remove: (id: number) => apiRequest<null>(`/admin/heritage-references/${id}`, { method: 'DELETE' }),
};
