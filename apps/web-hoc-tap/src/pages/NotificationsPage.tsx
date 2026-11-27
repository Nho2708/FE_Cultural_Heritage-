import { formatDateTime } from '@dsvhvn/dung-chung';
import { errorMessage, type StudentNotification } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, Icon, InlineMessage, LoadingState } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { studentApi } from '../lib/api/client';
import { NOTIFICATIONS_REFRESH_MS, notificationTarget, notificationsQueryFn, notificationsQueryKey } from '../notifications/notificationData';

// Thông báo của em: bài học, bài kiểm tra thầy cô giao cho lớp, mới nhất trước. Bấm một thông báo thì đánh dấu đã đọc và mở bài ngay, không phải gõ mã.

function Item({ item, onOpen }: { item: StudentNotification; onOpen: (item: StudentNotification) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full items-start gap-3 rounded-md border border-border bg-surface p-4 text-left hover:bg-surface-container-low"
      >
        <Icon name={item.kind === 'QUIZ' ? 'list' : 'book-open'} size={20} className="mt-1 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block type-label text-on-surface">{item.title}</span>
          <span className="mt-1 block type-body-m text-on-surface-variant">{item.body}</span>
          {item.createdAt && <span className="mt-1 block type-body-s text-on-surface-muted">{formatDateTime(item.createdAt)}</span>}
        </span>
        {!item.isRead && (
          <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary">
            <span className="sr-only">Chưa đọc</span>
          </span>
        )}
      </button>
    </li>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const query = useQuery({ queryKey: notificationsQueryKey, queryFn: notificationsQueryFn, refetchInterval: NOTIFICATIONS_REFRESH_MS });
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey });

  const open = async (item: StudentNotification) => {
    setFailure(null);
    try {
      if (!item.isRead) await studentApi.markNotificationRead(item.id);
      await refresh();
      const target = notificationTarget(item);
      if (target) void navigate(target);
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };

  const readAll = async () => {
    setFailure(null);
    try {
      await studentApi.markAllNotificationsRead();
      await refresh();
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };

  return (
    <section className="dsv-content dsv-section">
      <title>Thông báo · DiViet</title>
      <div className="mx-auto flex max-w-[720px] flex-col gap-(--dsv-block-gap)">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="type-h1 text-on-surface">Thông báo</h1>
            <p className="mt-2 type-body-m text-on-surface-variant">Bài học và bài kiểm tra thầy cô giao cho lớp em.</p>
          </div>
          {(query.data?.unreadCount ?? 0) > 0 && (
            <Button variant="secondary" onClick={() => void readAll()}>
              Đánh dấu đã đọc hết
            </Button>
          )}
        </header>
        {failure && <InlineMessage tone="danger">{failure}</InlineMessage>}
        {query.isPending ? (
          <LoadingState rows={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState icon="bell" title="Em chưa có thông báo nào.">
            Khi thầy cô giao bài, thông báo sẽ hiện ở đây.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {query.data.items.map((item) => (
              <Item key={item.id} item={item} onOpen={(chosen) => void open(chosen)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
