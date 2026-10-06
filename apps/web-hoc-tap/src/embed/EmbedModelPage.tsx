import { resolveFileUrl } from '@dsvhvn/dung-chung';
import { ApiError } from '@dsvhvn/dung-chung/api';
import { ModelViewer, type ModelViewerFailure, type ModelViewerLabels } from '@dsvhvn/dung-chung/model3d';
import { InlineMessage } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { API_BASE_URL } from '../config/env';
import { safeUrl } from '../discovery/format';
import { useI18n } from '../i18n/context';
import { discoveryApi } from '../lib/api/client';
import { postToHost } from './hostMessages';

// Trang xem 3D nhúng cho app mobile: cùng trình xem `<model-viewer>` với hộp thoại "Xem 3D" của web, nhưng chiếm cả khung WebView. Báo tiến trình tải, tải xong và
// lỗi cho app bằng thông điệp; thiết bị không vẽ được 3D hoặc tải lỗi thì app quay về bộ ảnh của di sản. Miễn phí, không cần đăng nhập, không có quảng cáo.

export function EmbedModelPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const query = useQuery({ queryKey: ['discovery', 'model', slug], queryFn: ({ signal }) => discoveryApi.model(slug, { signal }), retry: false, enabled: Boolean(slug) });
  const model = query.data;
  const lastProgress = useRef(-1);

  const labels = useMemo<ModelViewerLabels>(
    () => ({ viewerAria: t.model.viewerAria(model?.title?.trim() || slug), loading: t.model.loading, progress: t.model.progress, resetView: t.model.resetView, hint: t.model.hint }),
    [t, model?.title, slug],
  );

  useEffect(() => {
    if (query.isError) postToHost({ type: 'model-error', version: 1, reason: 'load' });
  }, [query.isError]);

  const onFailure = useCallback((reason: ModelViewerFailure) => postToHost({ type: 'model-error', version: 1, reason: reason === 'unsupported' ? 'webgl' : 'load' }), []);
  const onLoaded = useCallback(() => postToHost({ type: 'model-loaded', version: 1 }), []);
  const onProgress = useCallback((fraction: number) => {
    // Chỉ báo khi tiến trình nhích thêm ít nhất 5% để khỏi gửi từng bước nhỏ.
    if (fraction - lastProgress.current < 0.05 && fraction < 1) return;
    lastProgress.current = fraction;
    postToHost({ type: 'model-progress', version: 1, fraction });
  }, []);

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex size-full items-center justify-center bg-surface-container-low">
        <p className="type-body-m text-on-surface-variant">{t.model.loading}</p>
      </div>
    );
  }
  if (query.isError || !model) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="p-4">
        <InlineMessage tone="warning">{missing ? t.model.unavailable : t.common.systemError}</InlineMessage>
      </div>
    );
  }

  const src = resolveFileUrl(model.fileUrl, API_BASE_URL) ?? model.fileUrl;
  return (
    <div className="flex size-full flex-col gap-2 p-2">
      <title>{t.documentTitle(model.title?.trim() || t.model.kicker)}</title>
      <ModelViewer src={src} poster={safeUrl(model.posterUrl)} labels={labels} className="h-[calc(100dvh-110px)]" fallback={<InlineMessage tone="warning">{t.model.unavailable}</InlineMessage>} onFailure={onFailure} onLoaded={onLoaded} onProgress={onProgress} />
    </div>
  );
}
