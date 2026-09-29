import { useRef, useState, type FormEvent } from 'react';
import type { HeritageMedia } from '@dsvhvn/dung-chung/api';
import {
  focusFirstInvalid,
  splitApiError,
  validateMedia,
  type MediaField,
  type MediaValues,
} from '@dsvhvn/dung-chung';
import { Button, CheckboxField, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { adminMediaApi } from '../../lib/api/endpoints';
import { EMPTY_MEDIA, MEDIA_FIELDS, mediaBody, mediaValuesOf } from './mediaForm';
import { MediaFields } from './MediaFields';

// Thêm / sửa ảnh, video, âm thanh trong thư viện của di sản (tab Ảnh và media). Ghi công bắt buộc đủ ba phần; giấy phép
// hạn chế (CC BY-NC, CC BY-ND) bị từ chối. Chỉ ảnh mới chọn được làm ảnh đại diện. Mở dialog bằng cách gắn vào cây khi
// cần (`media` null là thêm mới) để mỗi lần mở là một biểu mẫu mới.

interface MediaFormDialogProps {
  heritageId: number;
  heritageName: string;
  /** Ảnh đang sửa; null là thêm mới. */
  media: HeritageMedia | null;
  onSaved: (message: string | null) => void;
  onClose: () => void;
}

export function MediaFormDialog({ heritageId, heritageName, media, onSaved, onClose }: MediaFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<MediaValues>(() => (media ? mediaValuesOf(media) : EMPTY_MEDIA));
  const [thumbnail, setThumbnail] = useState(media?.isThumbnail ?? false);
  const [errors, setErrors] = useState<Partial<Record<MediaField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isImage = values.mediaType === 'IMAGE';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateMedia(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      // Thêm mới: chỉ gửi khi chọn; sửa: gửi khi đổi so với hiện tại (true chọn, false bỏ chọn).
      const wantThumbnail = isImage && thumbnail;
      const flag = media ? (wantThumbnail !== media.isThumbnail ? wantThumbnail : undefined) : wantThumbnail ? true : undefined;
      const body = mediaBody(values, flag);
      const { message } = media
        ? await adminMediaApi.update(media.id, body)
        : await adminMediaApi.createForHeritage(heritageId, body);
      onSaved(message);
    } catch (err) {
      const failure = splitApiError<MediaField>(err, MEDIA_FIELDS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={media ? 'Sửa ảnh và media' : 'Thêm ảnh và media'}
      description={`Thư viện ảnh của di sản ${heritageName}. Ảnh cần ghi công đầy đủ: tác giả, giấy phép và nguồn.`}
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <MediaFields
          values={values}
          errors={errors}
          onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        />
        {isImage && (
          <CheckboxField
            label="Dùng làm ảnh đại diện của di sản"
            checked={thumbnail}
            onChange={(e) => setThumbnail(e.target.checked)}
          />
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
