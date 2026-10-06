import { useState } from 'react';
import { errorMessage, type HeritageDetail } from '@dsvhvn/dung-chung/api';
import { cn } from '@dsvhvn/dung-chung';
import { Button, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { adminHeritagesApi } from '../../lib/api/endpoints';
import { fileUrl } from '../../lib/fileUrl';

// Chọn ảnh đại diện trong thư viện ảnh của chính di sản (để luôn có ghi công). Thư viện chưa có ảnh thì chỉ đường sang
// tab Ảnh và media.

interface ThumbnailPickerDialogProps {
  heritage: HeritageDetail;
  onPicked: (detail: HeritageDetail, message: string | null) => void;
  onOpenMediaTab: () => void;
  onClose: () => void;
}

export function ThumbnailPickerDialog({ heritage, onPicked, onOpenMediaTab, onClose }: ThumbnailPickerDialogProps) {
  const images = heritage.media.filter((m) => m.mediaType === 'IMAGE');
  const [selected, setSelected] = useState<number | null>(images.find((m) => m.isThumbnail)?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (selected === null) return;
    setSaving(true);
    setError(null);
    try {
      const { data, message } = await adminHeritagesApi.setThumbnail(heritage.id, selected);
      onPicked(data, message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Chọn ảnh đại diện"
      description="Ảnh đại diện phải nằm trong thư viện ảnh của di sản để hiện đầy đủ ghi công."
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      {images.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <InlineMessage tone="info">Thư viện chưa có ảnh nào. Hãy thêm ảnh ở tab Ảnh và media trước.</InlineMessage>
          <Button onClick={onOpenMediaTab}>Mở tab Ảnh và media</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {error && <InlineMessage tone="danger">{error}</InlineMessage>}
          <fieldset>
            <legend className="sr-only">Ảnh trong thư viện</legend>
            <ul className="grid gap-3 dsvsm:grid-cols-2">
              {images.map((image) => (
                <li key={image.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-md border p-2',
                      selected === image.id ? 'border-primary bg-surface-container-low' : 'border-border',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="thumbnail"
                        checked={selected === image.id}
                        onChange={() => setSelected(image.id)}
                        className="size-5 accent-primary"
                      />
                      <span className="min-w-0 truncate type-body-s text-on-surface">{image.caption || image.url}</span>
                    </span>
                    <img src={fileUrl(image.previewUrl ?? image.url) ?? ''} alt="" loading="lazy" className="h-32 w-full rounded-sm object-cover" />
                    <span className="truncate type-label text-on-surface-muted">{image.credit}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={selected === null}>
              Lưu ảnh đại diện
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
