import { ApiError, ERROR_CODES, type PublicHeritageDetail, type PublicModel } from '@dsvhvn/dung-chung/api';
import { resolveFileUrl } from '@dsvhvn/dung-chung';
import { ModelViewer, type ModelViewerLabels } from '@dsvhvn/dung-chung/model3d';
import { Button, Icon, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { API_BASE_URL } from '../config/env';
import { creditLine, safeUrl } from '../discovery/format';
import { currentConnection, formatModelSize, shouldWarnBeforeLoad } from '../discovery/modelData';
import { Thumbnail } from '../discovery/Thumbnail';
import { useI18n } from '../i18n/context';
import { discoveryApi } from '../lib/api/client';
import { previewApi } from '../lib/api/previewClient';
import { PublicErrorState } from './PublicErrorState';

// Xem mô hình 3D (hộp thoại toàn màn hình) mở từ nút "Xem 3D" ở chi tiết di sản và ở trang xem trước bản nháp. Xem 3D miễn phí, không cần
// đăng nhập, không qua quảng cáo. Trình xem là thành phần dùng chung với web quản trị (`<model-viewer>` chính thức): kéo để xoay, cuộn hoặc chụm để phóng
// to, "Đặt lại góc nhìn", thanh tiến trình khi tải, ghi công hiện ngay trong hộp thoại (tác giả, giấy phép, nguồn không dịch). Mô hình nặng mà đang
// dùng mạng di động thì hỏi trước khi tải. Không có mô hình hiển thị, tải lỗi hoặc thiết bị không hỗ trợ 3D thì quay về bộ ảnh của di sản kèm một câu thông báo.

/** Mô hình lấy từ đâu: trang công khai (theo slug) hay trang xem trước bản nháp (theo mã xem trước). */
export type ModelSource = { kind: 'public' } | { kind: 'preview'; code: string };

const POSTER_COUNT = 6;

function useModel(detail: PublicHeritageDetail, source: ModelSource, enabled: boolean) {
  const preview = source.kind === 'preview';
  return useQuery({
    queryKey: preview ? ['preview', 'model', source.code] : ['discovery', 'model', detail.slug],
    queryFn: ({ signal }) => (preview ? previewApi.model(source.code, { signal }) : discoveryApi.model(detail.slug, { signal })),
    enabled,
    retry: false,
    // Bản nháp không giữ lại: mô hình vừa đổi phải hiện đúng ngay lần xem trước kế tiếp.
    gcTime: preview ? 0 : undefined,
    staleTime: preview ? 0 : 60_000,
  });
}

/** Quay về bộ ảnh của di sản kèm câu thông báo (không có mô hình, tải lỗi hoặc thiết bị không hỗ trợ). */
function PhotoFallback({ detail, retry }: { detail: PublicHeritageDetail; retry?: () => void }) {
  const { t } = useI18n();
  const images = detail.media.filter((m) => m.mediaType === 'IMAGE' && safeUrl(m.url)).slice(0, POSTER_COUNT);
  return (
    <div className="flex flex-col gap-5">
      <InlineMessage
        tone="warning"
        action={
          retry && (
            <Button variant="secondary" size="sm" onClick={retry}>
              {t.common.retry}
            </Button>
          )
        }
      >
        {t.model.unavailable}
      </InlineMessage>
      <section aria-labelledby="bo-anh-thay-the" className="flex flex-col gap-3">
        <h3 id="bo-anh-thay-the" className="type-h3 text-on-surface">
          {t.model.photos}
        </h3>
        {images.length === 0 ? (
          <p className="type-body-m text-on-surface-variant">{t.model.noPhotos}</p>
        ) : (
          <ul className="grid gap-4 dsvsm:grid-cols-2 dsvmd:grid-cols-3">
            {images.map((image) => (
              <li key={image.id}>
                <figure className="flex flex-col gap-2">
                  <div className="relative h-[180px] overflow-hidden rounded-md bg-(--dsv-card-placeholder-bg)">
                    <Thumbnail url={image.url} alt={image.caption ?? ''} />
                  </div>
                  <figcaption className="flex flex-col gap-0.5">
                    {image.caption && <span className="type-body-s text-on-surface">{image.caption}</span>}
                    {creditLine(image, t.common.photoCredit) && <span className="type-label text-on-surface-variant">{creditLine(image, t.common.photoCredit)}</span>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Credit({ model }: { model: PublicModel }) {
  const { t } = useI18n();
  const license = safeUrl(model.licenseUrl);
  const source = safeUrl(model.sourceUrl);
  return (
    <section aria-label={t.model.credit} className="flex flex-col gap-2 border-t border-border pt-4">
      {/* Tác giả, giấy phép và nguồn là tên riêng: giữ nguyên ở mọi ngôn ngữ. */}
      <p className="type-body-s text-on-surface">
        <span className="font-medium">{t.model.credit}: </span>
        {model.credit}
      </p>
      {(license || source) && (
        <p className="flex flex-wrap gap-x-5 gap-y-1 type-body-s">
          {license && (
            <a href={license} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link underline underline-offset-4">
              {t.model.license}
              <Icon name="external-link" size={14} />
            </a>
          )}
          {source && (
            <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link underline underline-offset-4">
              {t.model.source}
              <Icon name="external-link" size={14} />
            </a>
          )}
        </p>
      )}
    </section>
  );
}

function Body({ detail, source }: { detail: PublicHeritageDetail; source: ModelSource }) {
  const { language, t } = useI18n();
  const query = useModel(detail, source, true);
  const [accepted, setAccepted] = useState(false);
  const model = query.data;

  const labels = useMemo<ModelViewerLabels>(
    () => ({
      viewerAria: t.model.viewerAria(model?.title?.trim() || detail.name),
      loading: t.model.loading,
      progress: t.model.progress,
      resetView: t.model.resetView,
      hint: t.model.hint,
    }),
    [t, model?.title, detail.name],
  );

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <p className="type-body-m text-on-surface-variant">{t.model.loading}</p>
        <div className="h-[min(62dvh,560px)] animate-pulse rounded-md bg-surface-container-high" />
      </div>
    );
  }
  if (query.isError || !model) {
    // 404 MODEL_UNAVAILABLE: di sản không có mô hình hiển thị (hoặc vừa bị ẩn): về bộ ảnh. Lỗi mạng hay lỗi máy chủ thì cho thử lại.
    const unavailable = query.error instanceof ApiError && query.error.code === ERROR_CODES.modelUnavailable;
    const other = !unavailable && !(query.error instanceof ApiError && query.error.status === 404);
    return (
      <div className="flex flex-col gap-4">
        {other && <PublicErrorState error={query.error} />}
        <PhotoFallback detail={detail} retry={other ? () => void query.refetch() : undefined} />
      </div>
    );
  }

  const name = model.title?.trim() || detail.name;
  const size = formatModelSize(model.fileSizeBytes, language);
  const heavy = !accepted && shouldWarnBeforeLoad(model.fileSizeBytes, currentConnection());
  const src = resolveFileUrl(model.fileUrl, API_BASE_URL) ?? model.fileUrl;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="type-h2 text-on-surface">{name}</p>
        {name !== detail.name && <p className="type-body-s text-on-surface-variant">{detail.name}</p>}
      </div>
      {heavy ? (
        <InlineMessage
          tone="warning"
          action={
            <Button variant="secondary" size="sm" onClick={() => setAccepted(true)}>
              {t.model.loadAnyway}
            </Button>
          }
        >
          <strong className="block">{t.model.heavyTitle}</strong>
          {t.model.heavyText(size)}
        </InlineMessage>
      ) : (
        <ModelViewer
          src={src}
          poster={safeUrl(model.posterUrl)}
          labels={labels}
          className="h-[min(62dvh,600px)]"
          fallback={<PhotoFallback detail={detail} />}
        />
      )}
      <Credit model={model} />
    </div>
  );
}

export function ModelDialog({ detail, source, open, onClose }: { detail: PublicHeritageDetail; source: ModelSource; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal open={open} title={t.model.kicker} size="full" closeLabel={t.common.close} onClose={onClose}>
      {open && <Body detail={detail} source={source} />}
    </Modal>
  );
}
