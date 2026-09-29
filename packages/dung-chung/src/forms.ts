import { ApiError, errorMessage } from './api/client';

/** Đưa focus tới ô lỗi đầu tiên sau khi React vẽ xong thông báo lỗi. */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

export interface SubmitFailure<K extends string> {
  /** Lỗi theo trường (hiện dưới ô nhập). */
  fields: Partial<Record<K, string>>;
  /** Lỗi chung của biểu mẫu (hiện dạng In line), null khi mọi lỗi đã gắn được vào trường. */
  form: string | null;
}

/**
 * Tách lỗi backend thành lỗi theo trường (khóa `errors` của khuôn phản hồi trùng tên trường của request) và lỗi chung.
 * Trường không có trên biểu mẫu thì đưa câu của nó thành lỗi chung.
 */
export function splitApiError<K extends string>(error: unknown, fields: readonly K[]): SubmitFailure<K> {
  if (!(error instanceof ApiError)) return { fields: {}, form: errorMessage(error) };
  const known: Partial<Record<K, string>> = {};
  let unmatched: string | null = null;
  for (const [key, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(key)) known[key as K] = message;
    else unmatched ??= message;
  }
  const hasFieldError = Object.keys(known).length > 0;
  return { fields: known, form: hasFieldError ? unmatched : (unmatched ?? error.message) };
}
