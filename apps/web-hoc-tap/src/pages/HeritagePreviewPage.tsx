import { formatDateTime } from '@dsvhvn/dung-chung';
import { ApiError } from '@dsvhvn/dung-chung/api';
import { requestPreviewToken } from '@dsvhvn/dung-chung/auth';
import { ErrorState, Icon } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ADMIN_WEB_URL } from '../config/env';
import { previewApi, setPreviewToken } from '../lib/api/previewClient';
import { DetailSkeleton, HeritageDetailView } from './HeritageDetailPage';

// Xem trước bản nháp di sản (`/xem-truoc/di-san/:ma`): đúng giao diện trang chi tiết công khai, đọc bản nháp đang lưu. Chỉ quản
// trị hệ thống mở được: tab này do web quản trị mở, xin token của quản trị ở cửa sổ đã mở nó, rồi đọc cùng mã xem trước còn hạn.
// Không cho máy tìm kiếm lập chỉ mục. Mã hết hạn (sau thời gian ngắn) thì trang báo hết hạn, không hiện nội dung nữa.

class NoOpenerError extends Error {}

const NOINDEX = 'noindex, nofollow, noarchive';

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <section className="dsv-content flex min-h-[50dvh] flex-col items-start justify-center gap-4 py-16">
      <title>{`${title} · Học di sản`}</title>
      <meta name="robots" content={NOINDEX} />
      <p className="type-label-kicker text-on-surface-muted">XEM TRƯỚC</p>
      <h1 className="type-h1 text-on-surface">{title}</h1>
      <p role="alert" className="max-w-[640px] type-body-m text-on-surface-variant">
        {children}
      </p>
    </section>
  );
}

const EXPIRED = 'Bản xem trước chỉ dùng được trong thời gian ngắn. Bạn hãy quay lại trang quản trị và bấm "Xem trước" để mở lại.';

export function HeritagePreviewPage() {
  const code = useParams().ma ?? '';
  const [now, setNow] = useState(() => Date.now());

  const query = useQuery({
    queryKey: ['preview', 'heritage', code],
    queryFn: async ({ signal }) => {
      const token = await requestPreviewToken({ adminOrigin: ADMIN_WEB_URL });
      if (token === null) throw new NoOpenerError();
      setPreviewToken(token);
      return previewApi.heritage(code, { signal });
    },
    enabled: code !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const preview = query.data;
  const expiresAt = preview?.expiresAt;

  // Hết hạn thì ẩn nội dung ngay, không đợi lần đọc sau: hẹn một lần đúng lúc hết hạn.
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining, 2_000_000_000));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);
  const expired = expiresAt !== undefined && now >= new Date(expiresAt).getTime();

  if (query.isError) {
    if (query.error instanceof NoOpenerError) {
      return (
        <Notice title="Không mở được bản xem trước">
          Bản xem trước chỉ mở được từ trang quản trị, bằng nút "Xem trước" ở màn hình Biên tập di sản. Bạn hãy quay lại trang quản trị
          và mở lại.
        </Notice>
      );
    }
    if (query.error instanceof ApiError && [401, 403, 404].includes(query.error.status)) {
      return <Notice title="Bản xem trước đã hết hạn hoặc không dùng được">{EXPIRED}</Notice>;
    }
    return (
      <div className="dsv-content py-12">
        <meta name="robots" content={NOINDEX} />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (!preview) {
    return (
      <>
        <meta name="robots" content={NOINDEX} />
        <DetailSkeleton />
      </>
    );
  }
  if (expired) return <Notice title="Bản xem trước đã hết hạn">{EXPIRED}</Notice>;

  const hidden = preview.status === 'ARCHIVED';
  return (
    <>
      <title>{`Bản xem trước · ${preview.heritage.name}`}</title>
      <meta name="robots" content={NOINDEX} />
      <output className="block bg-secondary-container text-on-secondary-container">
        <p className="dsv-content flex flex-wrap items-center gap-x-3 gap-y-1 py-3 type-label">
          <Icon name="eye" size={18} />
          <strong>Bản xem trước — chưa xuất bản</strong>
          <span className="type-body-s">
            {hidden ? 'Di sản đang ẩn. ' : ''}Chỉ quản trị hệ thống thấy trang này. Hết hạn lúc {formatDateTime(preview.expiresAt)}.
          </span>
        </p>
      </output>
      <HeritageDetailView detail={preview.heritage} preview />
    </>
  );
}
