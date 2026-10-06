import type { ActorRole, AuditAction, OrganizationState, Role, SubscriptionStatus, UserStatus } from './api/types';

// Nhãn giao diện chỉ tiếng Việt. CSDL và API giữ giá trị enum viết HOA.

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Quản trị hệ thống',
  ORG_ADMIN: 'Quản trị trường',
  TEACHER: 'Giáo viên',
  STUDENT: 'Học sinh',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Bị khóa',
  INACTIVE: 'Ngừng sử dụng',
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  PENDING: 'Chờ thanh toán',
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

export const ORGANIZATION_STATE_LABEL: Record<OrganizationState, string> = {
  ACTIVE: 'Đang hoạt động',
  DEACTIVATED: 'Đã ngừng',
};

/** Nhãn vai trò trong nhật ký, thêm `SYSTEM` (tác vụ nền, cổng thanh toán) — cùng nhãn với AuditLabels của backend. */
export const ACTOR_ROLE_LABEL: Record<ActorRole, string> = {
  ...ROLE_LABEL,
  SYSTEM: 'Hệ thống',
};

/** Nhãn 24 mã thao tác cho bộ lọc của màn hình Nhật ký thao tác (máy chủ trả sẵn nhãn trên từng dòng). */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  LOGIN: 'Đăng nhập web quản trị',
  LOGIN_LOCKED_OUT: 'Tạm khóa đăng nhập do sai 5 lần',
  ORG_CREATED: 'Tạo trường',
  ORG_DEACTIVATED: 'Ngừng trường',
  ACCOUNT_CREATED: 'Tạo tài khoản',
  ACCOUNT_LOCKED: 'Khóa tài khoản',
  ACCOUNT_UNLOCKED: 'Mở khóa tài khoản',
  ACCOUNT_DELETED: 'Xóa tài khoản giáo viên',
  HERITAGE_PUBLISHED: 'Xuất bản di sản',
  HERITAGE_ARCHIVED: 'Ẩn di sản',
  HERITAGE_PREVIEW_ISSUED: 'Cấp liên kết xem trước bản nháp di sản',
  TRANSLATION_APPROVED: 'Duyệt bản dịch hoặc tóm tắt di sản',
  TRANSLATION_REJECTED: 'Từ chối bản dịch hoặc tóm tắt di sản',
  STUDENT_ACCOUNTS_CREATED: 'Thêm học sinh và tạo tài khoản',
  STUDENT_PASSWORD_RESET: 'Đặt lại mật khẩu học sinh',
  STUDENT_DEACTIVATED: 'Vô hiệu hoặc xóa học sinh',
  STUDENT_REACTIVATED: 'Mở lại học sinh',
  QUIZ_PUBLISHED: 'Phát hành bài kiểm tra',
  QUIZ_CLOSED: 'Đóng bài kiểm tra',
  QUESTION_HIDDEN: 'Ẩn câu hỏi',
  PLAN_UPDATED: 'Cập nhật gói dịch vụ',
  SUBSCRIPTION_CHANGED: 'Đổi gói của trường',
  BILLING_STATUS_CHANGED: 'Hệ thống đổi trạng thái gói, hóa đơn, giao dịch',
  IPN_REJECTED: 'Từ chối IPN',
};

/** `audit_logs.target_type` là tên bảng (AuditTargets của backend); giao diện hiện tên tiếng Việt. */
export const AUDIT_TARGET_LABEL: Record<string, string> = {
  users: 'Tài khoản',
  organizations: 'Trường',
  subscriptions: 'Đăng ký gói',
  heritages: 'Di sản',
  heritage_translations: 'Bản dịch di sản',
  heritage_summaries: 'Tóm tắt di sản',
  students: 'Học sinh',
  classes: 'Lớp học',
  quizzes: 'Bài kiểm tra',
  questions: 'Câu hỏi',
  plans: 'Gói dịch vụ',
  invoices: 'Hóa đơn',
  payments: 'Giao dịch',
};

/** Khóa trong `old_value` / `new_value` (JSON rút gọn do backend ghi) sang nhãn tiếng Việt. */
const AUDIT_FIELD_LABEL: Record<string, string> = {
  status: 'Trạng thái',
  username: 'Tên đăng nhập',
  email: 'Email',
  role: 'Vai trò',
  organizationId: 'Mã trường',
  deletedAt: 'Thời điểm xóa',
  lockedMinutes: 'Số phút tạm khóa',
  name: 'Tên',
  plan: 'Gói',
  subscriptionId: 'Mã đăng ký gói',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày hết hạn',
};

export interface AuditField {
  label: string;
  value: string;
}

function auditValueText(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') {
    if (key === 'status' && value in USER_STATUS_LABEL) return USER_STATUS_LABEL[value as UserStatus];
    if (key === 'role' && value in ROLE_LABEL) return ROLE_LABEL[value as Role];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatPlanDate(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Đọc giá trị trước / sau của một dòng nhật ký thành danh sách nhãn — giá trị để hiện dạng bảng nhỏ.
 * Khóa lạ giữ nguyên tên khóa; chuỗi không phải JSON hiện nguyên văn.
 */
export function describeAuditValue(json: string | null): AuditField[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [{ label: 'Giá trị', value: json }];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [{ label: 'Giá trị', value: auditValueText('', parsed) }];
  return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
    label: AUDIT_FIELD_LABEL[key] ?? key,
    value: auditValueText(key, value),
  }));
}

/**
 * Chữ viết tắt cho Avatar: chữ cái đầu của hai từ cuối trong họ tên, giữ dấu
 * ("Nguyễn Trần Quang Nho" → "QN"). Bỏ phần trong ngoặc và ký tự không phải chữ. Không có họ tên thì trả chuỗi rỗng.
 */
export function initials(fullName: string | null | undefined): string {
  const letters = (fullName ?? '')
    .normalize('NFC')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0] ?? '')
    .filter(Boolean);
  return letters.slice(-2).join('').toLocaleUpperCase('vi');
}

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

/** Ngày theo giờ Việt Nam, dạng 26/09/2026 (máy chủ trả UTC, giao diện đổi sang GMT+7). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: VIETNAM_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

/** Ngày giờ theo giờ Việt Nam, dạng 14:05 26/09/2026. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`;
}

/** Ngày của gói (`yyyy-MM-dd`, đã là ngày Việt Nam) sang dạng 26/09/2026, không đổi múi giờ. */
export function formatPlanDate(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/**
 * Ngày người dùng gõ theo dạng ngày/tháng/năm ("26/09/2026", "6/9/2026") sang `yyyy-MM-dd`; null nếu sai dạng hoặc
 * không có ngày đó (31/02). Không dùng `<input type="date">` vì trình duyệt tiếng Anh hiện "mm/dd/yyyy".
 */
export function parseVietnameseDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Ngày `yyyy-MM-dd` (ngày Việt Nam) sang mốc ISO có múi giờ +07:00 cho bộ lọc thời gian: đầu ngày với `from`, cuối
 * ngày với `to`.
 */
export function vietnamDayBoundary(day: string, edge: 'start' | 'end'): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  return edge === 'start' ? `${day}T00:00:00+07:00` : `${day}T23:59:59.999+07:00`;
}

/** Năm dương lịch hiện tại theo giờ Việt Nam (giới hạn năm công nhận, năm của giai đoạn và sự kiện). */
export function currentVietnamYear(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: VIETNAM_TZ, year: 'numeric' }).format(now));
}
