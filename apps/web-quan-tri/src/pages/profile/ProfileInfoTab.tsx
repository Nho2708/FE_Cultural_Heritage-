import {
  IMAGE_UPLOAD,
  MESSAGES,
  ROLE_LABEL,
  collectErrors,
  focusFirstInvalid,
  formatDate,
  formatDateTime,
  formatFileSize,
  splitApiError,
  trimToNull,
  validateFullName,
  validateImageFile,
  validateOptionalPhone,
} from '@dsvhvn/dung-chung';
import type { StaffProfile } from '@dsvhvn/dung-chung/api';
import { Blank, Button, Icon, InlineMessage, TextField, useToast } from '@dsvhvn/dung-chung/ui';
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { UserAvatar } from '../../components/UserAvatar';
import { profileApi } from '../../lib/api/endpoints';
import { useAuth } from '../../lib/auth/context';

// Tab Thông tin của Hồ sơ cá nhân: sửa được họ tên, số điện thoại, ảnh đại diện; email, tên đăng nhập, vai trò, trường
// chỉ đọc (không đổi vai trò, không chuyển trường; email và tên đăng nhập do người tạo tài khoản đặt).
// Ảnh đại diện đổi bằng cách tải ảnh từ máy lên (không dán đường dẫn): chọn ảnh, kiểm ngay (định dạng, 5 MB), xem trước,
// bấm "Tải ảnh lên" để gửi; "Gỡ ảnh" đưa về chữ cái đầu của họ tên. Backend kiểm lại theo nội dung tệp, bỏ EXIF, cắt vuông.

type Field = 'fullName' | 'phone';

const valuesOf = (user: StaffProfile): Record<Field, string> => ({
  fullName: user.fullName ?? '',
  phone: user.phone ?? '',
});

export function ProfileInfoTab({ user }: { user: StaffProfile }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(() => valuesOf(user));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = valuesOf(user);
  const dirty = (Object.keys(values) as Field[]).some((k) => values[k].trim() !== saved[k]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<Field>({
      fullName: validateFullName(values.fullName),
      phone: validateOptionalPhone(values.phone),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await profileApi.update({
        fullName: values.fullName.trim(),
        phone: trimToNull(values.phone),
      });
      updateUser(data);
      setValues(valuesOf(data));
      toast.success(message ?? MESSAGES.success('Lưu hồ sơ'));
    } catch (err) {
      const failure = splitApiError<Field>(err, ['fullName', 'phone']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-10 dsvmd:flex-row dsvmd:items-start">
      <div className="flex w-full max-w-[480px] flex-col gap-8">
        <AvatarEditor user={user} />
        <form ref={formRef} noValidate onSubmit={onSubmit} className="flex w-full flex-col gap-6">
          {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
          <TextField
            label="Họ và tên"
            name="fullName"
            autoComplete="name"
            value={values.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
          />
          <TextField
            label="Số điện thoại"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={set('phone')}
            error={errors.phone}
            hint="Không bắt buộc."
          />
          <div>
            <Button type="submit" size="lg" loading={saving} disabled={!dirty}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>

      <dl className="grid w-full max-w-[360px] grid-cols-[max-content_1fr] gap-x-6 gap-y-3 rounded-md bg-surface-container-low p-6 type-body-s">
        <dt className="text-on-surface-variant">Email</dt>
        <dd className="break-all text-on-surface">{user.email ?? <Blank />}</dd>
        <dt className="text-on-surface-variant">Tên đăng nhập</dt>
        <dd className="break-all text-on-surface">{user.username ?? <Blank />}</dd>
        <dt className="text-on-surface-variant">Vai trò</dt>
        <dd className="text-on-surface">{ROLE_LABEL[user.role]}</dd>
        {user.organization && (
          <>
            <dt className="text-on-surface-variant">Trường</dt>
            <dd className="text-on-surface">{user.organization.name}</dd>
          </>
        )}
        {user.lastLoginAt && (
          <>
            <dt className="text-on-surface-variant">Đăng nhập gần nhất</dt>
            <dd className="text-on-surface">{formatDateTime(user.lastLoginAt)}</dd>
          </>
        )}
        {user.createdAt && (
          <>
            <dt className="text-on-surface-variant">Ngày tạo tài khoản</dt>
            <dd className="text-on-surface">{formatDate(user.createdAt)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function previewUrlOf(file: File): string | null {
  try {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
  } catch {
    return null; // không tạo được địa chỉ xem trước thì vẫn tải lên bình thường
  }
}

// Ảnh đại diện: kiểm tệp ngay khi chọn (tệp không hợp lệ không được giữ, ảnh hiện tại vẫn nguyên), xem trước, tải lên có
// tiến độ, gỡ ảnh. Thành công thì cập nhật phiên (ảnh ở menu tài khoản đổi theo) và báo bằng thông báo của máy chủ.
function AvatarEditor({ user }: { user: StaffProfile }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [progress, setProgress] = useState(0);

  const releasePreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  };

  // Đóng trang giữa chừng thì thu hồi địa chỉ xem trước và hủy lần gửi đang chạy.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const pick = (picked: File | null) => {
    releasePreview();
    const problem = picked ? validateImageFile(picked) : null;
    setError(problem);
    previewRef.current = picked && !problem ? previewUrlOf(picked) : null;
    setPreview(previewRef.current);
    setFile(picked && !problem ? picked : null);
  };

  const onChoose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Cho phép chọn lại đúng tệp vừa bỏ.
    event.target.value = '';
    if (picked) pick(picked);
  };

  const fail = (err: unknown) => {
    const failure = splitApiError<'file'>(err, ['file']);
    setError(failure.fields.file ?? failure.form);
  };

  const upload = async () => {
    if (!file || busy) return;
    const body = new FormData();
    body.append('file', file);
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy('upload');
    setProgress(0);
    setError(null);
    try {
      const { data, message } = await profileApi.uploadAvatar(body, { onProgress: setProgress, signal: controller.signal });
      updateUser(data);
      toast.success(message ?? MESSAGES.success('Cập nhật ảnh đại diện'));
      releasePreview();
      setPreview(null);
      setFile(null);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) fail(err);
    } finally {
      abortRef.current = null;
      setBusy(null);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy('remove');
    setError(null);
    try {
      const { data, message } = await profileApi.removeAvatar();
      updateUser(data);
      toast.success(message ?? MESSAGES.success('Gỡ ảnh đại diện'));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const percent = Math.round(progress * 100);

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="type-label text-on-surface-variant">
        Ảnh đại diện
      </h2>
      <div className="flex flex-wrap items-center gap-5">
        {preview ? (
          <img src={preview} alt="Ảnh đại diện mới (xem trước)" className="size-24 shrink-0 rounded-full bg-surface-container-high object-cover" />
        ) : (
          <UserAvatar fullName={user.fullName} avatarUrl={user.avatarUrl} className="size-24 type-h2" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {file ? (
            <>
              <p className="truncate type-body-s text-on-surface">
                {file.name} <span className="text-on-surface-muted">({formatFileSize(file.size)})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={busy === 'upload'} disabled={busy !== null} onClick={upload}>
                  Tải ảnh lên
                </Button>
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => pick(null)}>
                  Hủy
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => inputRef.current?.click()}>
                <Icon name="upload" size={16} />
                Chọn ảnh
              </Button>
              {user.avatarUrl && (
                <Button size="sm" variant="ghost" loading={busy === 'remove'} disabled={busy !== null} onClick={remove}>
                  <Icon name="trash" size={16} />
                  Gỡ ảnh
                </Button>
              )}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            name="avatar"
            accept={IMAGE_UPLOAD.accept}
            hidden
            disabled={busy !== null}
            aria-label="Chọn tệp ảnh đại diện"
            onChange={onChoose}
          />
        </div>
      </div>
      {busy === 'upload' && (
        <div className="flex flex-col gap-1">
          <progress
            aria-label="Tiến độ tải ảnh đại diện"
            max={100}
            value={percent}
            className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-container-high [&::-webkit-progress-value]:bg-primary"
          />
          <p className="type-label text-on-surface-muted" aria-live="polite">
            {percent < 100 ? `Đang tải lên… ${percent}%` : 'Đã gửi xong, máy chủ đang xử lý ảnh…'}
          </p>
        </div>
      )}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 type-body-s text-danger">
          <Icon name="alert-triangle" size={16} className="mt-[3px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        <p className="type-label text-on-surface-muted">
          JPG, PNG hoặc WEBP, tối đa 5 MB. Ảnh được cắt vuông ở giữa và xóa dữ liệu EXIF khi lưu.
        </p>
      )}
    </section>
  );
}
