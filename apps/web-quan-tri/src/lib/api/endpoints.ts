import type {
  AccessToken,
  Account,
  ActorRole,
  AuditAction,
  AuditLog,
  LoginResult,
  MyOrganization,
  NewAccount,
  OrganizationDetail,
  OrganizationInfo,
  OrganizationState,
  OrganizationSummary,
  Paged,
  PasswordTokenInfo,
  QueryValue,
  StaffProfile,
  TeacherList,
  UserStatus,
} from '@dsvhvn/dung-chung/api';
import { apiRequest } from './client';

// Endpoint backend mà web quản trị dùng, đường dẫn tương đối so với VITE_API_BASE_URL (…/api/v1).

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
