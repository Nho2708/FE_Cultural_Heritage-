import type { StaffRole, BillingOverview, Invoice, InvoiceDetail, PaymentResult, PlanOffer, PurchaseQuote } from '@dsvhvn/dung-chung/api';
import { overviewOf, quoteOf, schoolOf } from './billingFixtures';
import { envelope, mockApi, userOf, type FetchCall } from './fixtures';

// API giả của khu quản trị trường cho các màn hình Gói và thanh toán. `extra` được thử trước để một test ghi đè từng route.

export interface BillingState {
  /** Vai trò của người đang đăng nhập (mặc định quản trị trường). */
  role?: StaffRole;
  overview?: BillingOverview;
  offers?: PlanOffer[];
  quotes?: Record<number, PurchaseQuote>;
  invoices?: Invoice[];
  details?: Record<number, InvoiceDetail>;
  payments?: Record<number, PaymentResult>;
}

export function billingApi(state: BillingState = {}, extra?: (call: FetchCall) => Response | Promise<Response> | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      const { path, method } = call;
      const overview = state.overview ?? overviewOf();
      if (path === '/me') return envelope(200, { data: userOf(state.role ?? 'ORG_ADMIN') });
      if (path === '/org') return envelope(200, { data: schoolOf(overview.hasEffectivePlan) });
      if (path === '/org/billing') return envelope(200, { data: overview });
      if (path === '/org/plans') return envelope(200, { data: state.offers ?? [] });
      const quote = /^\/org\/plans\/(\d+)\/quote$/.exec(path);
      if (quote) {
        const found = state.quotes?.[Number(quote[1])] ?? (state.quotes ? undefined : quoteOf());
        return found
          ? envelope(200, { data: found })
          : envelope(422, { errorCode: 'BLOCKED', message: 'Không thể mua gói. Gói không mua được.' });
      }
      if (path.startsWith('/org/invoices?'))
        return envelope(200, {
          data: { items: state.invoices ?? [], page: 1, pageSize: 20, totalItems: state.invoices?.length ?? 0, totalPages: 1 },
        });
      const invoice = /^\/org\/invoices\/(\d+)$/.exec(path);
      if (invoice && method === 'GET') {
        const detail = state.details?.[Number(invoice[1])];
        return detail ? envelope(200, { data: detail }) : envelope(404, { errorCode: 'BLOCKED', message: 'Không thể xem hóa đơn. Không tìm thấy hóa đơn.' });
      }
      const payment = /^\/org\/payments\/(\d+)$/.exec(path);
      if (payment) {
        const found = state.payments?.[Number(payment[1])];
        return found ? envelope(200, { data: found }) : envelope(404, { errorCode: 'BLOCKED', message: 'Không thể xem giao dịch. Không tìm thấy giao dịch.' });
      }
      return undefined;
    },
  );
}
