import { formatDate, formatDateTime, formatMoney } from '@dsvhvn/dung-chung';
import type { Invoice } from '@dsvhvn/dung-chung/api';
import {
  Blank,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  Table,
  Td,
  Th,
  Tr,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { orgBillingApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE } from '../../lib/listParams';
import { InvoiceStatusBadge, PaymentStatusBadge } from './billingUi';
import { usePayInvoice } from './usePayInvoice';

// Tab "Hóa đơn và giao dịch" của Trường và gói — quản trị trường: số hóa đơn, nội dung, số tiền, trạng thái, ngày xuất, hạn;
// mở dòng xem các giao dịch; "Thanh toán" với hóa đơn chưa thanh toán còn trong hạn. Hóa đơn là biên nhận nội bộ của hệ thống,
// không phải hóa đơn giá trị gia tăng. Hóa đơn chưa trả quá hạn thì hệ thống tự hủy.

const COLUMNS = 7;

function PaymentRows({ invoice }: { invoice: Invoice }) {
  const detail = useQuery({
    queryKey: queryKeys.invoiceDetail(invoice.id),
    queryFn: () => orgBillingApi.invoice(invoice.id).then((r) => r.data),
  });
  return (
    <tr>
      <td colSpan={COLUMNS} className="border-b border-(--dsv-table-border) bg-surface-container-low px-6 py-4">
        {detail.isPending ? (
          <LoadingState rows={2} />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        ) : detail.data.payments.length === 0 ? (
          <p className="type-body-s text-on-surface-variant">Hóa đơn chưa có giao dịch nào.</p>
        ) : (
          <div>
            <p className="type-label text-on-surface">Giao dịch của hóa đơn {invoice.invoiceNumber}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {detail.data.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 type-body-s text-on-surface">
                  <span className="min-w-56">
                    {payment.providerTransactionId ? `Mã giao dịch VNPay ${payment.providerTransactionId}` : 'Chưa có mã giao dịch VNPay'}
                  </span>
                  <span className="type-mono-label text-on-surface-variant">{formatDateTime(payment.paidAt ?? payment.createdAt) || '—'}</span>
                  <span className="type-mono-label">{formatMoney(payment.amount)}</span>
                  <span className="ml-auto">
                    <PaymentStatusBadge status={payment.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </td>
    </tr>
  );
}

export function InvoicesTab() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const { pay, payingId } = usePayInvoice();
  const query = { page, pageSize: PAGE_SIZE };
  const list = useQuery({
    queryKey: queryKeys.invoiceList(query),
    queryFn: () => orgBillingApi.invoices(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  if (list.isPending) return <LoadingState />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

  const { items, totalItems, totalPages } = list.data;
  return (
    <div className="flex flex-col gap-4">
      <p className="type-body-s text-on-surface-variant">
        Hóa đơn là biên nhận nội bộ của hệ thống, không phải hóa đơn giá trị gia tăng. Hóa đơn chưa thanh toán được thanh toán lại tới hạn;
        quá hạn thì tự hủy.
      </p>
      {items.length === 0 ? (
        <EmptyState icon="file-text" title="Trường chưa có hóa đơn nào.">
          Hóa đơn được tạo khi trường chọn mua, gia hạn hoặc nâng cấp gói trả phí.
        </EmptyState>
      ) : (
        <>
          <Table caption="Hóa đơn của trường" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Số hóa đơn</Th>
                <Th>Nội dung</Th>
                <Th>Số tiền</Th>
                <Th>Trạng thái</Th>
                <Th>Ngày xuất</Th>
                <Th>Hạn</Th>
                <Th>Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((invoice) => {
                const open = openId === invoice.id;
                return (
                  <Fragment key={invoice.id}>
                    <Tr>
                      <Td className="type-mono-label whitespace-nowrap">{invoice.invoiceNumber ?? <Blank />}</Td>
                      <Td>{invoice.description ?? <Blank />}</Td>
                      <Td className="whitespace-nowrap">{formatMoney(invoice.amount) || <Blank />}</Td>
                      <Td>
                        <InvoiceStatusBadge status={invoice.status} />
                      </Td>
                      <Td className="whitespace-nowrap">{formatDate(invoice.issuedAt) || <Blank />}</Td>
                      <Td className="whitespace-nowrap">{formatDateTime(invoice.dueAt) || <Blank />}</Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-2">
                          {invoice.canPay && (
                            <Button
                              size="sm"
                              aria-label={`Thanh toán hóa đơn ${invoice.invoiceNumber ?? ''}`.trim()}
                              onClick={() => void pay(invoice.id)}
                              loading={payingId === invoice.id}
                              disabled={payingId !== null}
                            >
                              Thanh toán
                            </Button>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            aria-expanded={open}
                            aria-label={`${open ? 'Thu gọn' : 'Xem giao dịch'} của hóa đơn ${invoice.invoiceNumber ?? ''}`.trim()}
                            onClick={() => setOpenId(open ? null : invoice.id)}
                          >
                            <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} />
                            {open ? 'Thu gọn' : 'Xem giao dịch'}
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                    {open && <PaymentRows invoice={invoice} />}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            totalPages={totalPages}
            onChange={setPage}
            label="hóa đơn"
          />
        </>
      )}
    </div>
  );
}
