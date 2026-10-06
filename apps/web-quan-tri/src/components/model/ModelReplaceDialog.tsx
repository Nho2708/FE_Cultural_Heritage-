import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorMessage, type HeritageModel } from '@dsvhvn/dung-chung/api';
import { readGlbHeader, validateModelFile } from '@dsvhvn/dung-chung';
import { Button, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { adminModelsApi } from '../../lib/api/endpoints';
import { ModelFileField } from './ModelFileField';
import { modelFileBody } from './modelForm';

// Thay tệp của mô hình bằng tệp .glb tải lên. Thông tin và ghi công giữ nguyên; tệp cũ vẫn nằm trong kho tệp (không xóa). Có thanh tiến độ khi gửi.

interface ModelReplaceDialogProps {
  model: HeritageModel;
  onSaved: (message: string | null) => void;
  onClose: () => void;
}

export function ModelReplaceDialog({ model, onSaved, onClose }: ModelReplaceDialogProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  const check = async (picked: File) => validateModelFile(picked) ?? (await readGlbHeader(picked));

  const pick = async (picked: File | null) => {
    setFile(picked);
    setFormError(null);
    setFileError(picked ? await check(picked) : null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = file ? await check(file) : validateModelFile(null);
    setFileError(found);
    if (found || !file) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setSaving(true);
    setProgress(0);
    try {
      const { message } = await adminModelsApi.replaceFile(model.id, modelFileBody(file), { onProgress: setProgress, signal: controller.signal });
      onSaved(message);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFormError(errorMessage(err));
    } finally {
      abortRef.current = null;
      setSaving(false);
    }
  };

  const percent = Math.round(progress * 100);

  return (
    <Modal
      open
      title="Thay tệp mô hình"
      description={`Thay tệp của mô hình ${model.title || 'chưa đặt tên'}. Thông tin và ghi công giữ nguyên; tệp cũ vẫn được giữ trong kho tệp.`}
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <ModelFileField file={file} error={fileError} disabled={saving} label="Tệp mô hình mới" onChange={(picked) => void pick(picked)} />
        {saving && (
          <div className="flex flex-col gap-1">
            <progress
              aria-label="Tiến độ tải tệp lên"
              max={100}
              value={percent}
              className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-container-high [&::-webkit-progress-value]:bg-primary"
            />
            <p className="type-label text-on-surface-muted" aria-live="polite">
              {percent < 100 ? `Đang tải lên… ${percent}%` : 'Đã gửi xong, máy chủ đang kiểm tra tệp…'}
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Thay tệp
          </Button>
        </div>
      </form>
    </Modal>
  );
}
