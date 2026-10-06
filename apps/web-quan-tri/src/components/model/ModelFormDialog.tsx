import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { HeritageModel } from '@dsvhvn/dung-chung/api';
import {
  composeModelCredit,
  focusFirstInvalid,
  isAllowedModelLicense,
  MODEL_LICENSE_SUGGESTIONS,
  readGlbHeader,
  splitApiError,
  validateModel,
  validateModelFile,
  type ModelField,
  type ModelValues,
} from '@dsvhvn/dung-chung';
import { Button, CheckboxField, InlineMessage, Modal, TextField } from '@dsvhvn/dung-chung/ui';
import { adminModelsApi } from '../../lib/api/endpoints';
import { EMPTY_MODEL, MODEL_FIELDS, modelPathBody, modelUpdateBody, modelUploadBody, modelValuesOf } from './modelForm';
import { ModelFileField } from './ModelFileField';

// Khai báo hoặc sửa mô hình 3D của di sản (tab Mô hình 3D). Thêm mới: tải tệp .glb từ máy lên hoặc dán đường dẫn của tệp đã có trong kho tệp
// của nền tảng; ghi công bắt buộc đủ ba phần (tác giả, giấy phép mở, nguồn). Sửa: thông tin và ghi công; điền đường dẫn tệp khác trong kho thì
// thay tệp, để trống thì giữ tệp. Tệp được kiểm ngay khi chọn (đuôi, 15 MB, đầu tệp glTF 2.0); backend kiểm lại theo nội dung. Mở dialog bằng
// cách gắn vào cây khi cần để mỗi lần mở là một biểu mẫu mới.

type Source = 'upload' | 'path';

interface ModelFormDialogProps {
  heritageId: number;
  heritageName: string;
  /** Mô hình đang sửa; null là thêm mới. */
  model: HeritageModel | null;
  /** Cách khai báo mặc định khi thêm mới. */
  initialSource?: Source;
  /** Di sản đã có mô hình đang hiển thị: không bật "hiện ngay" được. */
  hasVisible: boolean;
  /** Di sản chưa xuất bản: mô hình hiện cho khách khi di sản được xuất bản. */
  heritagePublished: boolean;
  onSaved: (message: string | null) => void;
  onClose: () => void;
}

function SourceChoice({ value, current, label, disabled, onPick }: { value: Source; current: Source; label: string; disabled: boolean; onPick: (value: Source) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 type-body-m text-on-surface">
      <input type="radio" name="cach-khai-bao" className="size-5 accent-primary" checked={current === value} disabled={disabled} onChange={() => onPick(value)} />
      {label}
    </label>
  );
}

export function ModelFormDialog({ heritageId, heritageName, model, initialSource = 'upload', hasVisible, heritagePublished, onSaved, onClose }: ModelFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const licenseListId = useId();
  const [source, setSource] = useState<Source>(initialSource);
  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState<ModelValues>(() => (model ? modelValuesOf(model) : EMPTY_MODEL));
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ModelField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  // Đóng dialog giữa chừng (chuyển trang) thì hủy lần gửi đang chạy.
  useEffect(() => () => abortRef.current?.abort(), []);

  const set = (field: keyof ModelValues) => (event: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const pickFile = async (picked: File | null) => {
    setFile(picked);
    setFormError(null);
    if (!picked) return setErrors((current) => ({ ...current, file: undefined }));
    // Báo lỗi đuôi, dung lượng, đầu tệp ngay khi chọn.
    const first = validateModelFile(picked);
    setErrors((current) => ({ ...current, file: first ?? undefined }));
    if (first) return;
    const header = await readGlbHeader(picked);
    setErrors((current) => ({ ...current, file: header ?? undefined }));
  };

  const editing = model !== null;
  const mode = editing ? ({ kind: 'edit' } as const) : source === 'upload' ? ({ kind: 'upload', file } as const) : ({ kind: 'path' } as const);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateModel(values, mode);
    if (!found.file && !editing && source === 'upload' && file) {
      const header = await readGlbHeader(file);
      if (header) found.file = header;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    const controller = new AbortController();
    abortRef.current = controller;
    setSaving(true);
    setProgress(0);
    try {
      const wantShow = show && !hasVisible;
      const { message } = model
        ? await adminModelsApi.update(model.id, modelUpdateBody(values))
        : source === 'upload' && file
          ? await adminModelsApi.upload(heritageId, modelUploadBody(values, file, wantShow), { onProgress: setProgress, signal: controller.signal })
          : await adminModelsApi.create(heritageId, modelPathBody(values, wantShow));
      onSaved(message);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const failure = splitApiError<ModelField>(err, MODEL_FIELDS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      abortRef.current = null;
      setSaving(false);
    }
  };

  const percent = Math.round(progress * 100);
  const licenseOk = isAllowedModelLicense(values.license);
  const credit =
    values.author.trim() && licenseOk ? composeModelCredit(values.author, values.license, values.sourceUrl) : null;

  return (
    <Modal
      open
      title={editing ? 'Sửa mô hình 3D' : 'Thêm mô hình 3D'}
      description={`Mô hình 3D của di sản ${heritageName}. Chỉ nhận tệp .glb giấy phép mở, kèm ghi công đầy đủ: tác giả, giấy phép và nguồn.`}
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}

        {!editing && (
          <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
            <legend className="mb-1 type-label text-on-surface-variant">Cách khai báo</legend>
            <SourceChoice value="upload" current={source} label="Tải tệp .glb từ máy lên" disabled={saving} onPick={setSource} />
            <SourceChoice value="path" current={source} label="Dán đường dẫn của tệp .glb đã lưu trong kho tệp" disabled={saving} onPick={setSource} />
          </fieldset>
        )}

        {!editing && source === 'upload' && <ModelFileField file={file} error={errors.file} disabled={saving} onChange={(picked) => void pickFile(picked)} />}

        {(editing || source === 'path') && (
          <TextField
            label={editing ? 'Đường dẫn tệp khác (không bắt buộc)' : 'Đường dẫn tệp mô hình'}
            name="fileUrl"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            value={values.fileUrl}
            onChange={set('fileUrl')}
            error={errors.fileUrl}
            disabled={saving}
            hint={
              editing
                ? 'Để trống thì giữ tệp hiện tại. Muốn thay bằng tệp mới từ máy, dùng nút Thay tệp ở danh sách.'
                : 'Chỉ nhận đường dẫn tệp .glb đã nằm trong kho tệp của nền tảng (dạng /files/models/…), không nhận trang ngoài. Dung lượng do máy chủ tự đo.'
            }
          />
        )}

        <TextField
          label="Tên mô hình"
          name="title"
          autoComplete="off"
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          disabled={saving}
          hint="Không bắt buộc, ví dụ Cổng Ngọ Môn."
        />

        <div className="grid gap-5 dsvsm:grid-cols-2">
          <TextField label="Tác giả" name="author" autoComplete="off" value={values.author} onChange={set('author')} error={errors.author} disabled={saving} />
          <TextField
            label="Giấy phép"
            name="license"
            autoComplete="off"
            list={licenseListId}
            value={values.license}
            onChange={set('license')}
            error={errors.license}
            disabled={saving}
            hint="CC0, CC BY, CC BY-SA, phạm vi công cộng hoặc mô hình nhóm tự dựng. Không nhận CC BY-NC, CC BY-ND."
          />
        </div>
        <datalist id={licenseListId}>
          {MODEL_LICENSE_SUGGESTIONS.map((license) => (
            <option key={license} value={license}>
              {license}
            </option>
          ))}
        </datalist>
        <TextField
          label="Đường dẫn giấy phép"
          name="licenseUrl"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={values.licenseUrl}
          onChange={set('licenseUrl')}
          error={errors.licenseUrl}
          disabled={saving}
          hint="Không bắt buộc, ví dụ https://creativecommons.org/licenses/by/4.0/."
        />
        <TextField
          label="Đường dẫn nguồn"
          name="sourceUrl"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={values.sourceUrl}
          onChange={set('sourceUrl')}
          error={errors.sourceUrl}
          disabled={saving}
          hint="Trang nơi tải mô hình. Chỉ mô hình nhóm tự dựng được bỏ trống; khi đó phần nguồn của ghi công là Nhóm thực hiện."
        />
        <TextField
          label="Ảnh xem trước (không bắt buộc)"
          name="posterUrl"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={values.posterUrl}
          onChange={set('posterUrl')}
          error={errors.posterUrl}
          disabled={saving}
          hint="Đường dẫn ảnh hiện trong lúc mô hình đang tải."
        />

        {credit && (
          <p className="rounded-sm bg-surface-container-low px-4 py-3 type-body-s text-on-surface-variant">
            <span className="block type-label text-on-surface-muted">Ghi công hiện trong trình xem (không dịch ở mọi ngôn ngữ)</span>
            {credit}
          </p>
        )}

        {!editing && (
          <CheckboxField
            label="Hiện cho khách và học sinh ngay"
            checked={show && !hasVisible}
            disabled={saving || hasVisible}
            onChange={(e) => setShow(e.target.checked)}
            hint={
              hasVisible
                ? 'Di sản đã có một mô hình đang hiển thị. Hãy ẩn mô hình đó trước.'
                : heritagePublished
                  ? 'Không chọn thì mô hình lưu ở trạng thái Nháp.'
                  : 'Di sản chưa xuất bản nên khách chỉ thấy mô hình sau khi di sản được xuất bản.'
            }
          />
        )}

        {saving && source === 'upload' && !editing && (
          <div className="flex flex-col gap-1">
            <progress
              aria-label="Tiến độ tải mô hình lên"
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
            {editing ? 'Lưu' : source === 'upload' ? 'Tải lên' : 'Thêm'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
