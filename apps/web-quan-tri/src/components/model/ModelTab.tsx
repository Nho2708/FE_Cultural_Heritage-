import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage, type ContentStatus, type HeritageDetail, type HeritageModel } from '@dsvhvn/dung-chung/api';
import { formatDateTime, formatFileSize, MESSAGES } from '@dsvhvn/dung-chung';
import { ModelViewer, type ModelViewerLabels } from '@dsvhvn/dung-chung/model3d';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Icon, InlineMessage, LoadingState, useToast, type BadgeTone } from '@dsvhvn/dung-chung/ui';
import { adminModelsApi } from '../../lib/api/endpoints';
import { fileUrl } from '../../lib/fileUrl';
import { queryKeys } from '../../lib/api/queryKeys';
import { ModelFormDialog } from './ModelFormDialog';
import { ModelReplaceDialog } from './ModelReplaceDialog';

// Tab Mô hình 3D của Biên tập di sản (chỉ quản trị hệ thống): khai báo mô hình 3D của di sản (tải tệp .glb lên hoặc dùng tệp đã lưu trong kho),
// ghi công bắt buộc, xem thử ngay trong trình xem 3D dùng chung, hiện hoặc ẩn, thay tệp, sửa, gỡ. Mỗi di sản chỉ có một mô hình đang hiển thị;
// khách chỉ thấy khi mô hình đang hiển thị và di sản đã xuất bản. Gỡ là xóa mềm, tệp trong kho được giữ lại.

const STATUS_TONE: Record<ContentStatus, BadgeTone> = { DRAFT: 'neutral', PUBLISHED: 'success', ARCHIVED: 'warning' };

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link underline underline-offset-4">
      {children}
      <Icon name="external-link" size={14} />
    </a>
  );
}

const PREVIEW_FAILED = (
  <InlineMessage tone="danger">
    Không tải được mô hình 3D. Hãy kiểm tra tệp .glb và thử lại, hoặc thay bằng tệp khác. Khách sẽ thấy bộ ảnh của di sản thay cho mô hình.
  </InlineMessage>
);

const VIEWER_LABELS = (name: string): ModelViewerLabels => ({
  viewerAria: `Mô hình 3D ${name}`,
  loading: 'Đang tải mô hình 3D…',
  progress: (percent) => `Đang tải mô hình 3D: ${percent}%`,
  resetView: 'Đặt lại góc nhìn',
  hint: 'Kéo để xoay, cuộn hoặc chụm hai ngón để phóng to, thu nhỏ. Có thể dùng phím mũi tên để xoay.',
});

interface ModelTabProps {
  heritage: HeritageDetail;
}

type Dialog =
  | { kind: 'form'; model: HeritageModel | null; source: 'upload' | 'path' }
  | { kind: 'replace'; model: HeritageModel }
  | { kind: 'remove'; model: HeritageModel }
  | null;

export function ModelTab({ heritage }: ModelTabProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: queryKeys.heritageModels(heritage.id),
    queryFn: () => adminModelsApi.list(heritage.id).then((r) => r.data),
  });
  const models = list.data ?? [];
  const visible = models.find((m) => m.status === 'PUBLISHED');
  const published = heritage.status === 'PUBLISHED';

  /** Sau mỗi thay đổi đọc lại danh sách mô hình và danh sách di sản (cột và bộ lọc "có mô hình 3D"). */
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.heritageModels(heritage.id) });
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
  };

  const run = async (action: () => Promise<{ message: string | null }>, fallback: string) => {
    setBusy(true);
    try {
      const { message } = await action();
      toast.success(message ?? fallback);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const saved = (fallback: string) => (message: string | null) => {
    setDialog(null);
    toast.success(message ?? fallback);
    refresh();
  };

  const remove = async () => {
    if (dialog?.kind !== 'remove') return;
    const target = dialog.model;
    setDialog(null);
    if (previewing === target.id) setPreviewing(null);
    await run(() => adminModelsApi.remove(target.id), MESSAGES.success('Gỡ mô hình 3D'));
  };

  return (
    <section aria-labelledby="tab-mo-hinh-tieu-de" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tab-mo-hinh-tieu-de" className="type-body-m text-on-surface-variant">
          {list.isSuccess ? `${models.length} mô hình 3D. ` : ''}Mỗi di sản chỉ có một mô hình đang hiển thị. Di sản không có mô hình thì khách chỉ xem bộ ảnh.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setDialog({ kind: 'form', model: null, source: 'upload' })}>
            <Icon name="upload" size={16} />
            Tải mô hình lên
          </Button>
          <Button variant="secondary" onClick={() => setDialog({ kind: 'form', model: null, source: 'path' })}>
            <Icon name="plus" size={16} />
            Dùng tệp đã lưu
          </Button>
        </div>
      </div>

      {!published && (
        <InlineMessage tone="info">
          Di sản chưa xuất bản (hoặc đang ẩn), nên khách và học sinh chưa thấy nút "Xem 3D" dù mô hình đang hiển thị. Mô hình giữ nguyên trạng thái của nó và tự hiện khi di sản được xuất bản.
        </InlineMessage>
      )}

      {list.isPending ? (
        <LoadingState rows={2} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : models.length === 0 ? (
        <EmptyState icon="box" title="Di sản chưa có mô hình 3D.">
          Tải lên tệp .glb giấy phép mở kèm ghi công đầy đủ, hoặc dùng tệp đã lưu trong kho tệp. Mô hình chỉ tới khách khi bạn bật hiển thị và di sản đã xuất bản.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {models.map((model) => {
            const name = model.title || 'Mô hình chưa đặt tên';
            const isVisible = model.status === 'PUBLISHED';
            return (
              <li key={model.id} className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-surface-container-high text-on-surface-muted">
                      <Icon name="box" size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 type-body-m text-on-surface">
                        <span className="min-w-0 truncate font-medium">{name}</span>
                        <Badge tone={STATUS_TONE[model.status]}>{model.statusLabel}</Badge>
                        {model.isVisibleToPublic && <Badge tone="success">Khách đang thấy</Badge>}
                      </p>
                      <p className="type-body-s text-on-surface-variant">{model.credit}</p>
                      <p className="type-mono-label text-on-surface-muted">
                        {model.fileFormat} · {formatFileSize(model.fileSizeBytes)} · cập nhật {formatDateTime(model.updatedAt ?? model.createdAt)}
                      </p>
                      <p className="flex flex-wrap gap-x-4 type-body-s">
                        {model.licenseUrl && <ExternalLink href={model.licenseUrl}>Xem giấy phép</ExternalLink>}
                        {model.sourceUrl && <ExternalLink href={model.sourceUrl}>Xem nguồn</ExternalLink>}
                      </p>
                      {isVisible && !model.isVisibleToPublic && (
                        <p className="mt-1 type-body-s text-on-surface-variant">Khách chưa thấy mô hình này vì di sản chưa xuất bản hoặc đang ẩn.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" aria-expanded={previewing === model.id} onClick={() => setPreviewing(previewing === model.id ? null : model.id)}>
                      <Icon name="eye" size={16} />
                      {previewing === model.id ? 'Đóng xem thử' : 'Xem thử'}
                    </Button>
                    {isVisible ? (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => adminModelsApi.hide(model.id), MESSAGES.success('Ẩn mô hình 3D'))}>
                        <Icon name="eye-off" size={16} />
                        Ẩn
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy || visible !== undefined}
                        title={visible ? 'Di sản đã có một mô hình đang hiển thị. Hãy ẩn mô hình đó trước.' : undefined}
                        onClick={() => void run(() => adminModelsApi.show(model.id), MESSAGES.success('Hiện mô hình 3D'))}
                      >
                        Hiện
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDialog({ kind: 'replace', model })}>
                      <Icon name="upload" size={16} />
                      Thay tệp
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Sửa ${name}`} onClick={() => setDialog({ kind: 'form', model, source: 'upload' })}>
                      <Icon name="pencil" size={20} />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Gỡ ${name}`} disabled={busy} onClick={() => setDialog({ kind: 'remove', model })}>
                      <Icon name="trash" size={20} />
                    </Button>
                  </div>
                </div>

                {previewing === model.id && (
                  <div className="border-t border-border pt-4">
                    <ModelViewer
                      src={fileUrl(model.fileUrl) ?? model.fileUrl}
                      poster={fileUrl(model.posterUrl)}
                      labels={VIEWER_LABELS(name)}
                      className="h-[min(60dvh,440px)]"
                      fallback={PREVIEW_FAILED}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.kind === 'form' && (
        <ModelFormDialog
          heritageId={heritage.id}
          heritageName={heritage.name ?? ''}
          model={dialog.model}
          initialSource={dialog.source}
          hasVisible={visible !== undefined && visible.id !== dialog.model?.id}
          heritagePublished={published}
          onSaved={saved(MESSAGES.success(dialog.model ? 'Lưu mô hình 3D' : 'Thêm mô hình 3D'))}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'replace' && (
        <ModelReplaceDialog model={dialog.model} onSaved={saved(MESSAGES.success('Thay tệp mô hình 3D'))} onClose={() => setDialog(null)} />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'remove'}
        title="Gỡ mô hình 3D"
        confirmLabel="Gỡ mô hình"
        tone="danger"
        onConfirm={() => void remove()}
        onClose={() => setDialog(null)}
      >
        {dialog?.kind === 'remove' && (
          <>
            <p>{MESSAGES.confirm('gỡ mô hình 3D', dialog.model.title || 'này')}</p>
            <p className="mt-2 type-body-s">Tệp vẫn được giữ trong kho tệp. Nếu mô hình đang hiển thị thì khách sẽ chỉ còn xem bộ ảnh của di sản.</p>
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}
