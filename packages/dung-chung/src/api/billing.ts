import type { AiQuota } from './lessons';
import type { SubscriptionStatus, TeacherQuota } from './types';

// Kiểu dữ liệu của luồng Gói và thanh toán VNPay, trùng DTO của backend (namespace Billing). Tiền là số nguyên đồng;
// ngày của gói là `yyyy-MM-dd` theo giờ Việt Nam; thời điểm là ISO 8601.

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

/** Loại mua do hệ thống tự phân loại: chưa có gói là mua, gói giá cao hơn là nâng cấp, còn lại là gia hạn. */
export type PurchaseKind = 'PURCHASE' | 'RENEW' | 'UPGRADE';

/** Kết quả của một lần thanh toán trên trang Kết quả thanh toán, đọc từ trạng thái do IPN ghi nhận. */
export type PaymentOutcome = 'PAID' | 'UNPAID' | 'PROCESSING';

/** Một dòng của bảng Gói dịch vụ (quản trị hệ thống). */
export interface Plan {
  id: number;
  name: string | null;
  price: number | null;
  durationDays: number | null;
  maxTeachers: number | null;
  maxAiRequests: number | null;
  /** Đang bán. */
  isActive: boolean;
  /** Gói Miễn phí (gói giá 0 duy nhất): không tắt bán, không đổi tên, không đổi giá. */
  isFree: boolean;
  /** Số trường đang dùng (có gói hiệu lực thuộc gói này). */
  schoolCount: number;
}

/** Thân tạo hoặc sửa gói; bật, tắt bán đi qua thao tác riêng. */
export interface PlanInput {
  name: string;
  price: number;
  durationDays: number;
  maxTeachers: number;
  maxAiRequests: number;
}

/** Đăng ký gói của trường kèm thông tin gói. */
export interface SubscriptionDetail {
  id: number;
  planId: number;
  planName: string | null;
  price: number | null;
  status: SubscriptionStatus | null;
  startDate: string | null;
  endDate: string | null;
  isEffective: boolean;
  isFree: boolean;
  daysLeft: number | null;
  maxTeachers: number | null;
  maxAiRequests: number | null;
}

/** Yêu cầu mua đang chờ thanh toán của trường (tối đa một). */
export interface PendingPurchase {
  subscriptionId: number;
  planId: number;
  planName: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  amount: number | null;
  dueAt: string | null;
  /** Còn giao dịch đang chờ VNPay trong thời hạn thanh toán. */
  hasWaitingPayment: boolean;
}

/** Tổng quan tab Gói và hạn mức. */
export interface BillingOverview {
  current: SubscriptionDetail | null;
  /** Gói gia hạn đã trả, chờ bắt đầu. */
  upcoming: SubscriptionDetail | null;
  pending: PendingPurchase | null;
  hasEffectivePlan: boolean;
  teacherQuota: TeacherQuota;
  aiQuota: AiQuota;
  canActivateFreePlan: boolean;
  canCancelCurrent: boolean;
  /** Câu xác nhận hủy gói của backend; null khi không hủy được. */
  cancelConfirmation: string | null;
}

/** Một gói đang bán trên màn hình Chọn gói. */
export interface PlanOffer {
  id: number;
  name: string | null;
  price: number | null;
  durationDays: number | null;
  maxTeachers: number | null;
  maxAiRequests: number | null;
  isCurrent: boolean;
  kind: PurchaseKind | null;
  available: boolean;
  unavailableReason: string | null;
}

/** Khối xác nhận sau khi chọn gói. */
export interface PurchaseQuote {
  planId: number;
  planName: string | null;
  kind: PurchaseKind;
  amount: number;
  expectedStartDate: string;
  expectedEndDate: string;
  /** Câu trong hộp xác nhận trước khi chuyển sang VNPay. */
  confirmation: string;
  /** Cảnh báo khi số giáo viên đang vượt hạn mức của gói mới; null nếu không vượt. */
  teacherWarning: string | null;
}

export interface Invoice {
  id: number;
  organizationId: number;
  organizationName: string | null;
  invoiceNumber: string | null;
  description: string | null;
  amount: number | null;
  status: InvoiceStatus | null;
  issuedAt: string | null;
  dueAt: string | null;
  subscriptionId: number;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  /** Còn thanh toán được (chưa trả, chưa quá hạn, chưa bị hủy). */
  canPay: boolean;
}

export interface Payment {
  id: number;
  providerCode: string | null;
  providerTransactionId: string | null;
  amount: number | null;
  status: PaymentStatus | null;
  createdAt: string | null;
  paidAt: string | null;
}

export interface InvoiceDetail {
  invoice: Invoice;
  payments: Payment[];
}

/** Địa chỉ VNPay để chuyển trình duyệt tới, kèm hóa đơn và giao dịch vừa tạo. */
export interface PaymentStart {
  invoice: Invoice;
  paymentId: number;
  paymentUrl: string;
  expiresAt: string;
  kind: PurchaseKind | null;
}

export interface PaymentResult {
  outcome: PaymentOutcome;
  /** Câu kết quả đã chốt của backend. */
  message: string;
  invoice: Invoice;
  payment: Payment;
  subscription: SubscriptionDetail | null;
  /** Thanh toán lại được ngay trên hóa đơn này. */
  canPayAgain: boolean;
}
