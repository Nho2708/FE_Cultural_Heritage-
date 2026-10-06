// Kiểu dữ liệu của API backend. JSON camelCase, enum là chuỗi viết HOA đúng giá trị trong CSDL, thời gian ISO 8601 UTC
// có `Z`, ngày của gói dạng `yyyy-MM-dd` (ngày Việt Nam). Giao diện tự đổi sang nhãn tiếng Việt (format.ts) và giờ
// Việt Nam. Trường nào cột CSDL được NULL thì backend khai báo nullable và kiểu ở đây cũng vậy, dù dữ liệu do ứng dụng
// ghi luôn có giá trị.

/** `roles.code`: bốn vai trò. Học sinh đăng nhập bằng mã học sinh ở web học tập và app mobile. */
export type Role = 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';

/** Ba vai trò người lớn dùng web quản trị. */
export type StaffRole = Exclude<Role, 'STUDENT'>;

/** `users.status`. Tài khoản học sinh không dùng trạng thái Bị khóa. */
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

/** `subscriptions.status`. */
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

/** Trạng thái trường trên màn hình Quản lý trường: đang hoạt động hoặc đã ngừng (xóa mềm). */
export type OrganizationState = 'ACTIVE' | 'DEACTIVATED';

/** `audit_logs.actor_role`: bốn vai trò và `SYSTEM` (tác vụ nền, cổng thanh toán). */
export type ActorRole = Role | 'SYSTEM';

/** 24 mã thao tác của nhật ký. */
export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_LOCKED_OUT'
  | 'ORG_CREATED'
  | 'ORG_DEACTIVATED'
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'ACCOUNT_DELETED'
  | 'HERITAGE_PUBLISHED'
  | 'HERITAGE_ARCHIVED'
  | 'HERITAGE_PREVIEW_ISSUED'
  | 'TRANSLATION_APPROVED'
  | 'TRANSLATION_REJECTED'
  | 'STUDENT_ACCOUNTS_CREATED'
  | 'STUDENT_PASSWORD_RESET'
  | 'STUDENT_DEACTIVATED'
  | 'STUDENT_REACTIVATED'
  | 'QUIZ_PUBLISHED'
  | 'QUIZ_CLOSED'
  | 'QUESTION_HIDDEN'
  | 'PLAN_UPDATED'
  | 'SUBSCRIPTION_CHANGED'
  | 'BILLING_STATUS_CHANGED'
  | 'IPN_REJECTED';

export interface OrganizationRef {
  id: number;
  name: string;
}

/** Hồ sơ của người đang đăng nhập (`GET /me`, kèm trong kết quả đăng nhập). */
export interface UserProfile {
  id: number;
  username: string | null;
  /** null với tài khoản học sinh (học sinh không có email). */
  email: string | null;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  roleName: string;
  status: UserStatus | null;
  /** Bật khi tài khoản phải đổi mật khẩu trước khi làm việc khác (học sinh mới tạo hoặc vừa được đặt lại). */
  mustChangePassword: boolean;
  /** null với quản trị hệ thống. */
  organization: OrganizationRef | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

/** Hồ sơ trên web quản trị: chỉ ba vai trò người lớn (backend từ chối tài khoản học sinh ở cửa đăng nhập này). */
export interface StaffProfile extends UserProfile {
  role: StaffRole;
}

/** Chỉ access token hạn 8 giờ, không có refresh token. */
export interface AccessToken {
  tokenType: 'Bearer';
  accessToken: string;
  expiresAt: string;
}

/** Kết quả đăng nhập: access token và hồ sơ. */
export interface LoginResult<U = UserProfile> extends AccessToken {
  user: U;
}

/** `POST /auth/password-token/check`: tài khoản sẽ được đặt mật khẩu và hạn của liên kết. */
export interface PasswordTokenInfo {
  username: string | null;
  expiresAt: string | null;
}

/** Phân trang: `page`, `pageSize` (mặc định 20, tối đa 100). */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Tài khoản giáo viên hoặc quản trị trường. */
export interface Account {
  id: number;
  username: string | null;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

/** Biểu mẫu tài khoản: vai trò cố định theo nơi mở (giáo viên hoặc quản trị trường). Người lớn bắt buộc có email. */
export interface NewAccount {
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
}

export interface Subscription {
  id: number;
  planId: number;
  planName: string | null;
  status: SubscriptionStatus | null;
  startDate: string | null;
  endDate: string | null;
  /** Gói hiệu lực: ACTIVE và hôm nay nằm trong [startDate, endDate]. */
  isEffective: boolean;
}

/** Bộ đếm "x / tối đa giáo viên". `max` null khi trường không có gói hiệu lực. */
export interface TeacherQuota {
  used: number;
  max: number | null;
  planName: string | null;
  canAddTeacher: boolean;
}

export interface TeacherList extends Paged<Account> {
  quota: TeacherQuota;
}

/** Dòng của màn hình Quản lý trường. */
export interface OrganizationSummary {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionEndDate: string | null;
  hasEffectivePlan: boolean;
  teacherCount: number;
  status: OrganizationState;
  createdAt: string | null;
  deactivatedAt: string | null;
}

/** Màn hình Chi tiết trường (xem / sửa). */
export interface OrganizationDetail {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: OrganizationState;
  createdAt: string | null;
  updatedAt: string | null;
  deactivatedAt: string | null;
  subscription: Subscription | null;
  teacherQuota: TeacherQuota;
  orgAdmins: Account[];
}

/** Thông tin trường quản trị hệ thống nhập và sửa. */
export interface OrganizationInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

/** Trường của quản trị trường: thông tin, gói và hạn mức giáo viên. */
export interface MyOrganization {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  subscription: Subscription | null;
  teacherQuota: TeacherQuota;
}

/** Dòng của màn hình Nhật ký thao tác (chỉ đọc). Máy chủ trả sẵn nhãn tiếng Việt của vai trò và hành động. */
export interface AuditLog {
  id: number;
  createdAt: string;
  userId: number | null;
  username: string | null;
  fullName: string | null;
  actorRole: ActorRole;
  actorRoleLabel: string;
  action: AuditAction;
  actionLabel: string;
  targetType: string;
  targetId: number | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
}

/** Cấp học suy từ khối lớp: khối 1-5 là cấp 1, 6-9 là cấp 2, 10-12 là cấp 3. */
export type SchoolLevel = 1 | 2 | 3;

/** Lớp trong hồ sơ của học sinh. */
export interface StudentClass {
  id: number;
  name: string;
  /** Khối 1-12. */
  grade: number;
  /** Năm học dạng 2026-2027. */
  schoolYear?: string | null;
}

/**
 * Hồ sơ học sinh sau khi đăng nhập ở web học tập hoặc app mobile: tên đăng nhập là mã học sinh, không có email.
 * Máy chủ trả cấp học để chọn bộ giao diện; giao diện vẫn tự suy được từ khối lớp nếu thiếu. Thiếu `studentCode` thì
 * dùng `username` (cùng giá trị). Hồ sơ này do lớp gọi API dựng từ phản hồi của máy chủ (xem studentApi).
 */
export interface StudentProfile extends UserProfile {
  role: 'STUDENT';
  studentId?: number;
  studentCode?: string | null;
  schoolLevel: SchoolLevel | null;
  class: StudentClass | null;
  teacherName: string | null;
}

/** Lớp của em (màn hình Lớp của em): khối, cấp học, năm học, giáo viên phụ trách, trường. */
export interface StudentClassDetail {
  id: number;
  name: string;
  grade: number;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  schoolYear: string | null;
  teacherName: string | null;
  organization: OrganizationRef | null;
}

/** Khuôn phản hồi chung. `errors` chỉ có khi lỗi theo trường (khóa camelCase, lồng nhau nối bằng dấu chấm). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errorCode: string | null;
  traceId: string | null;
  errors?: Record<string, string>;
}

/** Mã học sinh của hồ sơ: `studentCode`, không có thì tên đăng nhập (mã học sinh cũng là tên đăng nhập). */
export function studentCodeOf(student: Pick<StudentProfile, 'studentCode' | 'username'>): string {
  return student.studentCode ?? student.username ?? '';
}
