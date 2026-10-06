import type { InvoiceStatus, PaymentStatus, PurchaseKind } from './api/billing';
import { formatPlanDate } from './format';
import { MESSAGES } from './messages';
import { validateRequiredText } from './validation/fields';

// Gói dịch vụ, hóa đơn và thanh toán: nhãn tiếng Việt, định dạng tiền và kiểm tra biểu mẫu gói phía giao diện. Cùng luật
// và cùng câu với PlanRequestValidator của backend; backend vẫn là nơi quyết định.

/** Giới hạn của gói (BillingRules của backend). */
export const PLAN_RULES = {
  nameMax: 100,
  priceMax: 999_999_999,
  durationMin: 1,
  durationMax: 730,
  teachersMin: 1,
  teachersMax: 10_000,
  aiMin: 0,
  aiMax: 1_000_000,
} as const;

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Đang chờ',
  SUCCEEDED: 'Thành công',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const PURCHASE_KIND_LABEL: Record<PurchaseKind, string> = {
  PURCHASE: 'Mua gói',
  RENEW: 'Gia hạn',
  UPGRADE: 'Nâng cấp',
};

/** Số nguyên đồng có dấu chấm ngăn nhóm nghìn: 1.990.000. */
export function formatMoneyPlain(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '';
  return String(Math.trunc(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Tiền kèm ký hiệu đồng: 1.990.000 ₫. Không có giá trị thì chuỗi rỗng. */
export function formatMoney(amount: number | null | undefined): string {
  const text = formatMoneyPlain(amount);
  return text === '' ? '' : `${text} ₫`;
}

/**
 * Số tiền người dùng gõ ("1990000", "1.990.000", "1 990 000") sang số nguyên đồng; null nếu có ký tự khác chữ số,
 * dấu chấm và khoảng trắng, hoặc dấu chấm không đúng nhóm nghìn.
 */
export function parseMoney(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const grouped = trimmed.replace(/\s+/g, '');
  if (/^\d{1,3}(\.\d{3})+$/.test(grouped)) return Number(grouped.replaceAll('.', ''));
  if (/^\d+$/.test(grouped)) return Number(grouped);
  return null;
}

const PRICE_RULE = `phải là số nguyên đồng từ 0 đến ${formatMoneyPlain(PLAN_RULES.priceMax)}`;

export function validatePlanName(value: string): string | null {
  return validateRequiredText(value, 'tên gói', 'Tên gói', PLAN_RULES.nameMax);
}

/** Giá nhập ở ô; `free` true khi sửa gói Miễn phí (luôn giá 0). Gói trả phí phải có giá lớn hơn 0. */
export function validatePlanPrice(value: string, free: boolean): string | null {
  if (value.trim() === '') return MESSAGES.required('giá gói');
  const price = parseMoney(value);
  if (price === null || price > PLAN_RULES.priceMax) return MESSAGES.invalid('Giá gói', PRICE_RULE);
  if (free) return price === 0 ? null : MESSAGES.invalid('Giá gói', 'gói Miễn phí luôn có giá 0');
  return price > 0
    ? null
    : MESSAGES.invalid('Giá gói', 'gói Miễn phí là gói giá 0 duy nhất, các gói khác phải có giá lớn hơn 0');
}

/** Số nguyên bắt buộc trong khoảng đóng [min, max], dùng cho thời hạn, số giáo viên và lượt AI. */
export function validatePlanCount(value: string, field: string, label: string, min: number, max: number, unit = ''): string | null {
  if (value.trim() === '') return MESSAGES.required(field);
  const n = /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
  return Number.isInteger(n) && n >= min && n <= max ? null : MESSAGES.invalid(label, `phải là số nguyên từ ${min} đến ${max}${unit}`);
}

export const validatePlanDuration = (value: string) =>
  validatePlanCount(value, 'thời hạn', 'Thời hạn', PLAN_RULES.durationMin, PLAN_RULES.durationMax, ' ngày');

export const validatePlanTeachers = (value: string) =>
  validatePlanCount(value, 'số giáo viên tối đa', 'Số giáo viên tối đa', PLAN_RULES.teachersMin, PLAN_RULES.teachersMax);

export const validatePlanAiRequests = (value: string) =>
  validatePlanCount(value, 'số lượt AI mỗi kỳ', 'Số lượt AI mỗi kỳ', PLAN_RULES.aiMin, PLAN_RULES.aiMax);

/** Khoảng ngày hiệu lực của gói: "29/09/2026 – 28/09/2027". */
export function formatPlanRange(start: string | null | undefined, end: string | null | undefined): string {
  const from = formatPlanDate(start);
  const to = formatPlanDate(end);
  return from && to ? `${from} – ${to}` : from || to;
}
