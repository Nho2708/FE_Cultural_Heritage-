import type {
  BillingOverview,
  Invoice,
  MyOrganization,
  Payment,
  PaymentResult,
  Plan,
  PlanOffer,
  PurchaseQuote,
  SubscriptionDetail,
} from '@dsvhvn/dung-chung/api';

// Dữ liệu giả cho các màn hình Gói và thanh toán: đặt đúng khuôn phản hồi của backend (BillingDtos).

export function planOf(id: number, overrides: Partial<Plan> = {}): Plan {
  return {
    id,
    name: `Gói số ${id}`,
    price: 1_990_000,
    durationDays: 365,
    maxTeachers: 10,
    maxAiRequests: 300,
    isActive: true,
    isFree: false,
    schoolCount: 0,
    ...overrides,
  };
}

export const FREE_PLAN = planOf(1, {
  name: 'Miễn phí',
  price: 0,
  durationDays: 30,
  maxTeachers: 2,
  maxAiRequests: 20,
  isFree: true,
  schoolCount: 5,
});

export function subscriptionOf(overrides: Partial<SubscriptionDetail> = {}): SubscriptionDetail {
  return {
    id: 5,
    planId: 2,
    planName: 'Cơ bản',
    price: 1_990_000,
    status: 'ACTIVE',
    startDate: '2026-09-29',
    endDate: '2027-09-28',
    isEffective: true,
    isFree: false,
    daysLeft: 364,
    maxTeachers: 10,
    maxAiRequests: 300,
    ...overrides,
  };
}

export function overviewOf(overrides: Partial<BillingOverview> = {}): BillingOverview {
  return {
    current: subscriptionOf(),
    upcoming: null,
    pending: null,
    hasEffectivePlan: true,
    teacherQuota: { used: 8, max: 10, planName: 'Cơ bản', canAddTeacher: true },
    aiQuota: {
      hasEffectivePlan: true,
      planName: 'Cơ bản',
      used: 120,
      max: 300,
      remaining: 180,
      periodStart: '2026-09-29',
      periodEnd: '2026-10-28',
    },
    canActivateFreePlan: false,
    canCancelCurrent: true,
    cancelConfirmation: 'Bạn có chắc muốn hủy gói Cơ bản? Gói sẽ kết thúc ngay, không được hoàn tiền.',
    ...overrides,
  };
}

/** Trường không có gói hiệu lực: gói Miễn phí đã hết hạn, được kích hoạt lại. */
export function noPlanOverview(overrides: Partial<BillingOverview> = {}): BillingOverview {
  return overviewOf({
    current: subscriptionOf({
      id: 3,
      planId: 1,
      planName: 'Miễn phí',
      price: 0,
      status: 'EXPIRED',
      startDate: '2026-08-28',
      endDate: '2026-09-26',
      isEffective: false,
      isFree: true,
      daysLeft: null,
    }),
    hasEffectivePlan: false,
    teacherQuota: { used: 8, max: null, planName: null, canAddTeacher: false },
    aiQuota: { hasEffectivePlan: false, planName: null, used: 0, max: null, remaining: null, periodStart: null, periodEnd: null },
    canActivateFreePlan: true,
    canCancelCurrent: false,
    cancelConfirmation: null,
    ...overrides,
  });
}

export function offerOf(id: number, overrides: Partial<PlanOffer> = {}): PlanOffer {
  return {
    id,
    name: `Gói số ${id}`,
    price: 1_990_000,
    durationDays: 365,
    maxTeachers: 10,
    maxAiRequests: 300,
    isCurrent: false,
    kind: 'PURCHASE',
    available: true,
    unavailableReason: null,
    ...overrides,
  };
}

export function quoteOf(overrides: Partial<PurchaseQuote> = {}): PurchaseQuote {
  return {
    planId: 3,
    planName: 'Nâng cao',
    kind: 'UPGRADE',
    amount: 3_990_000,
    expectedStartDate: '2026-10-07',
    expectedEndDate: '2027-10-06',
    confirmation:
      'Trường sẽ thanh toán 3.990.000 đồng cho gói Nâng cao qua VNPay. Gói mới có hiệu lực ngay, gói hiện tại kết thúc và không được hoàn phần chưa dùng. Tiếp tục?',
    teacherWarning: null,
    ...overrides,
  };
}

export function invoiceOf(id: number, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id,
    organizationId: 10,
    organizationName: 'Trường THCS Nguyễn Du',
    invoiceNumber: `HD20261006-${String(id).padStart(6, '0')}`,
    description: 'Mua gói Cơ bản',
    amount: 1_990_000,
    status: 'PAID',
    issuedAt: '2026-10-06T02:00:00Z',
    dueAt: '2026-10-07T02:00:00Z',
    subscriptionId: 5,
    planName: 'Cơ bản',
    subscriptionStatus: 'ACTIVE',
    canPay: false,
    ...overrides,
  };
}

export function paymentOf(id: number, overrides: Partial<Payment> = {}): Payment {
  return {
    id,
    providerCode: 'VNPAY',
    providerTransactionId: '14571026',
    amount: 1_990_000,
    status: 'SUCCEEDED',
    createdAt: '2026-10-06T02:05:00Z',
    paidAt: '2026-10-06T02:10:00Z',
    ...overrides,
  };
}

export function paymentResultOf(overrides: Partial<PaymentResult> = {}): PaymentResult {
  return {
    outcome: 'PAID',
    message: 'Thanh toán thành công. Gói Nâng cao có hiệu lực từ ngày 07/10/2026 đến hết ngày 06/10/2027.',
    invoice: invoiceOf(31, { description: 'Nâng cấp gói Nâng cao', amount: 3_990_000 }),
    payment: paymentOf(40, { amount: 3_990_000 }),
    subscription: subscriptionOf({ planName: 'Nâng cao' }),
    canPayAgain: false,
    ...overrides,
  };
}

/** Trường của quản trị trường cho thanh báo gói (`/org`). */
export function schoolOf(effective: boolean): MyOrganization {
  return {
    id: 10,
    name: 'Trường THCS Nguyễn Du',
    address: null,
    phone: null,
    email: null,
    subscription: {
      id: 5,
      planId: 2,
      planName: 'Cơ bản',
      status: effective ? 'ACTIVE' : 'EXPIRED',
      startDate: '2026-08-28',
      endDate: '2026-09-26',
      isEffective: effective,
    },
    teacherQuota: { used: 8, max: effective ? 10 : null, planName: effective ? 'Cơ bản' : null, canAddTeacher: effective },
  };
}
