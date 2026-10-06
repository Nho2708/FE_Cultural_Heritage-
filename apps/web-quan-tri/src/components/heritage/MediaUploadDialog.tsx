import { useEffect, useRef, useState, type FormEvent } from 'react';
import { focusFirstInvalid, splitApiError, validateImageFile, validateMediaUpload, type MediaUploadField, type MediaValues } from '@dsvhvn/dung-chung';
import { Button, CheckboxField, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { adminMediaApi } from '../../lib/api/endpoints';
import { EMPTY_MEDIA, MEDIA_UPLOAD_FIELDS, mediaUploadBody } from './mediaForm';
import { ImageFileField } from './ImageFileField';
import { MediaFields } from './MediaFields';

// Tải ảnh từ máy lên thư viện ảnh của di sản (tab Ảnh và media): chọn tệp, xem trước, ghi công đủ ba phần (tác giả, giấy phép,
// nguồn) như thêm bằng đường dẫn. Có thanh tiến độ khi gửi. Tệp được kiểm ngay khi chọn (định dạng, 5 MB); backend kiểm lại
// theo nội dung tệp, bỏ EXIF và tạo ảnh thu nhỏ. Mở dialog bằng cách gắn vào cây khi cần để mỗi lần mở là một biểu mẫu mới.

interface MediaUploadDialogProps {
  heritageId: number;
  heritageName: string;
  /** Có ảnh đại diện rồi thì không tự đề nghị chọn ảnh mới làm ảnh đại diện. */
  hasThumbnail: boolean;
  onSaved: (message: string | null) => void;
  onClose: () => void;
}

export function MediaUploadDialog({ heritageId, heritageName, hasThumbnail, onSaved, onClose }: MediaUploadDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState<MediaValues>(EMPTY_MEDIA);
  const [thumbnail, setThumbnail] = useState(!hasThumbnail);
  const [errors, setErrors] = useState<Partial<Record<MediaUploadField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  // Đóng dialog giữa chừng (chuyển trang) thì hủy lần gửi đang chạy.
  useEffect(() => () => abortRef.current?.abort(), []);

  const pickFile = (picked: File | null) => {
    setFile(picked);
    setFormError(null);
    // Báo lỗi định dạng, dung lượng ngay khi chọn; bỏ chọn thì xóa lỗi.
    setErrors((current) => ({ ...current, file: picked ? (validateImageFile(picked) ?? undefined) : undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateMediaUpload(values, file);
    setErrors(found);
    if (Object.keys(found).length > 0 || !file) return focusFirstInvalid(formRef.current);

    const controller = new AbortController();
    abortRef.current = controller;
    setSaving(true);
    setProgress(0);
    try {
      const { message } = await adminMediaApi.uploadForHeritage(heritageId, mediaUploadBody(values, file, thumbnail ? true : undefined), {
        onProgress: setProgress,
        signal: controller.signal,
      });
      onSaved(message);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const failure = splitApiError<MediaUploadField>(err, MEDIA_UPLOAD_FIELDS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      abortRef.current = null;
      setSaving(false);
    }
  };

  const percent = Math.round(progress * 100);

  return (
    <Modal
      open
      title="Tải ảnh lên"
      description={`Thư viện ảnh của di sản ${heritageName}. Chọn ảnh từ máy và ghi công đầy đủ: tác giả, giấy phép và nguồn.`}
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <ImageFileField file={file} error={errors.file} disabled={saving} onChange={pickFile} />
        <MediaFields
          values={values}
          errors={errors}
          showType={false}
          showUrl={false}
          onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        />
        <CheckboxField
          label="Dùng làm ảnh đại diện của di sản"
          checked={thumbnail}
          disabled={saving}
          onChange={(e) => setThumbnail(e.target.checked)}
        />
        {saving && (
          <div className="flex flex-col gap-1">
            <progress
              aria-label="Tiến độ tải ảnh lên"
              max={100}
              value={percent}
              className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-container-high [&::-webkit-progress-value]:bg-primary"
            />
            <p className="type-label text-on-surface-muted" aria-live="polite">
              {percent < 100 ? `Đang tải lên… ${percent}%` : 'Đã gửi xong, máy chủ đang xử lý ảnh…'}
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Tải lên
          </Button>
        </div>
      </form>
    </Modal>
  );
}
