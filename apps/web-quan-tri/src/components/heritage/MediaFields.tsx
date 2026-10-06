import type { MediaField, MediaValues } from '@dsvhvn/dung-chung';
import { LICENSE_SUGGESTIONS, MEDIA_TYPE_LABEL } from '@dsvhvn/dung-chung';
import type { MediaType } from '@dsvhvn/dung-chung/api';
import { SelectField, TextField } from '@dsvhvn/dung-chung/ui';
import { useId } from 'react';

// Các ô của một ảnh / video / âm thanh minh họa: đường dẫn (ảnh có sẵn trên mạng; tải tệp lên thì ẩn ô này), chú thích và ghi công bắt buộc đủ ba
// phần "tác giả · giấy phép · nguồn". Dùng ở tab Ảnh và media và trong Biểu mẫu giai đoạn và sự kiện.

const TYPE_OPTIONS = (Object.keys(MEDIA_TYPE_LABEL) as MediaType[]).map((value) => ({ value, label: MEDIA_TYPE_LABEL[value] }));

interface MediaFieldsProps {
  values: MediaValues;
  errors: Partial<Record<MediaField, string>>;
  onChange: (field: MediaField, value: string) => void;
  /** Ẩn ô chọn loại khi loại đã cố định. */
  showType?: boolean;
  /** Ẩn ô đường dẫn khi ảnh được tải lên (đường dẫn do hệ thống sinh). */
  showUrl?: boolean;
}

export function MediaFields({ values, errors, onChange, showType = true, showUrl = true }: MediaFieldsProps) {
  const licenseListId = useId();
  return (
    <>
      {showType && (
        <SelectField
          label="Loại"
          name="mediaType"
          value={values.mediaType}
          options={TYPE_OPTIONS}
          onChange={(e) => onChange('mediaType', e.target.value)}
          error={errors.mediaType}
        />
      )}
      {showUrl && (
        <TextField
          label="Đường dẫn"
          name="url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={values.url}
          onChange={(e) => onChange('url', e.target.value)}
          error={errors.url}
          hint="Đường dẫn http hoặc https của tệp đã có sẵn trên mạng. Muốn lưu tệp ở hệ thống thì dùng Tải ảnh lên."
        />
      )}
      <TextField
        label="Chú thích"
        name="caption"
        value={values.caption}
        onChange={(e) => onChange('caption', e.target.value)}
        error={errors.caption}
        hint="Không bắt buộc."
      />
      <div className="grid gap-5 dsvsm:grid-cols-2">
        <TextField
          label="Tác giả"
          name="author"
          autoComplete="off"
          value={values.author}
          onChange={(e) => onChange('author', e.target.value)}
          error={errors.author}
        />
        <TextField
          label="Giấy phép"
          name="license"
          autoComplete="off"
          list={licenseListId}
          value={values.license}
          onChange={(e) => onChange('license', e.target.value)}
          error={errors.license}
          hint="CC0, CC BY, CC BY-SA, phạm vi công cộng hoặc ảnh nhóm tự chụp."
        />
      </div>
      <datalist id={licenseListId}>
        {LICENSE_SUGGESTIONS.map((license) => (
          <option key={license} value={license}>
            {license}
          </option>
        ))}
      </datalist>
      <TextField
        label="Nguồn"
        name="source"
        autoComplete="off"
        value={values.source}
        onChange={(e) => onChange('source', e.target.value)}
        error={errors.source}
        hint="Đường dẫn hoặc tên nơi đăng, ví dụ Wikimedia Commons. Ghi công hiển thị: tác giả · giấy phép · nguồn."
      />
    </>
  );
}
