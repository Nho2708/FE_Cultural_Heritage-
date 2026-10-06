import { MESSAGES } from '../messages';
import type { ApiEnvelope } from './types';

// Tầng gọi API dùng chung cho web quản trị, web học tập (và app mobile về sau): khuôn phản hồi chung
// { success, data, message, errorCode, traceId, errors }, header X-Correlation-Id, gắn access token.
// Chỉ có access token, không có refresh token: máy chủ trả 401 (token hết hạn, tài khoản bị khóa, trường bị ngừng,
// mật khẩu đã đổi ở nơi khác) thì ứng dụng kết thúc phiên trên máy này. Không có bước làm mới phiên.

/** Mã thông báo trong `errorCode` — đặt theo nghĩa, trùng MessageCodes của backend. */
export const ERROR_CODES = {
  required: 'REQUIRED',
  invalid: 'INVALID',
  passwordPolicy: 'PASSWORD_POLICY',
  passwordMismatch: 'PASSWORD_MISMATCH',
  samePassword: 'SAME_PASSWORD',
  duplicate: 'DUPLICATE',
  invalidCredentials: 'INVALID_CREDENTIALS',
  accountBlocked: 'ACCOUNT_BLOCKED',
  studentInvalidCredentials: 'STUDENT_INVALID_CREDENTIALS',
  studentAccountBlocked: 'STUDENT_ACCOUNT_BLOCKED',
  passwordChangeRequired: 'PASSWORD_CHANGE_REQUIRED',
  classLevelChangeNeedsConfirmation: 'CLASS_LEVEL_CHANGE_NEEDS_CONFIRMATION',
  passwordLinkInvalid: 'PASSWORD_LINK_INVALID',
  forbidden: 'FORBIDDEN',
  blocked: 'BLOCKED',
  teacherLimitReached: 'TEACHER_LIMIT_REACHED',
  notReady: 'NOT_READY',
  systemError: 'SYSTEM_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  readonly status: number;
  /** `errorCode` của backend, hoặc SYSTEM_ERROR khi lỗi mạng / phản hồi không đúng khuôn. */
  readonly code: string;
  /** Lỗi theo trường, khóa camelCase trùng tên trường của request; biểu mẫu lồng nhau nối bằng dấu chấm. */
  readonly fieldErrors: Record<string, string>;
  readonly traceId: string | null;

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}, traceId: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.traceId = traceId;
  }
}

export interface ApiResult<T> {
  data: T;
  /** Câu thông báo của backend khi thành công, ví dụ "Lưu hồ sơ thành công." */
  message: string | null;
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Dữ liệu gửi đi: đối tượng gửi dạng JSON, hoặc FormData (tải tệp lên, trình duyệt tự đặt Content-Type). */
  body?: unknown;
  /** Tham số query; giá trị rỗng, null, undefined bị bỏ qua. */
  query?: Record<string, QueryValue>;
  /** Chỉ khi gửi FormData: gọi mỗi khi có thêm byte được gửi đi, `fraction` từ 0 đến 1 (dùng XMLHttpRequest vì fetch không báo tiến độ gửi). */
  onUploadProgress?: (fraction: number) => void;
  /** Endpoint cần đăng nhập: gắn Bearer. Mặc định true. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Máy chủ từ chối token vừa gửi (401). */
export interface UnauthorizedResponse {
  /** Token đã gửi — ứng dụng chỉ kết thúc phiên nếu đây vẫn là token của phiên hiện tại. */
  token: string;
  errorCode: string | null;
  message: string | null;
}

export interface ApiClientOptions {
  /** Gốc API gồm cả tiền tố `/api/v1`, không có `/` ở cuối. */
  baseUrl: string;
  /** Access token của phiên hiện tại; null khi chưa đăng nhập hoặc token đã quá hạn. */
  getAccessToken: () => string | null;
  /** Máy chủ trả 401 cho một yêu cầu có token: ứng dụng kết thúc phiên. */
  onUnauthorized?: (response: UnauthorizedResponse) => void;
}

/** Tệp tải về từ máy chủ (tệp mẫu danh sách học sinh). */
export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>>;
  /** Tải một tệp (phản hồi không theo khuôn JSON). Lỗi vẫn theo khuôn phản hồi chung như `request`. */
  download(path: string, options?: RequestOptions, fallbackFileName?: string): Promise<DownloadedFile>;
}

function correlationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Tên tệp trong header Content-Disposition (ưu tiên dạng filename*=UTF-8''…); null nếu không đọc được (trình duyệt chỉ cho đọc header máy chủ đã công bố). */
export function fileNameOf(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    } catch {
      // rơi xuống tên thường
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1]?.trim() ?? null;
}

export function withQuery(path: string, query: Record<string, QueryValue> | undefined): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' && 'success' in body ? (body as ApiEnvelope<T>) : null;
  } catch {
    return null;
  }
}

/** Gửi FormData bằng XMLHttpRequest để có tiến độ tải lên; trả về một Response như fetch để phần còn lại của tầng này dùng chung. */
function sendWithProgress(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: FormData,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(1, event.loaded / event.total));
    };
    xhr.onload = () => {
      onProgress(1);
      // Mã 204/205 không được có thân trong Response.
      const empty = xhr.status === 204 || xhr.status === 205;
      resolve(new Response(empty ? null : xhr.responseText, { status: xhr.status, headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') ?? 'application/json' } }));
    };
    xhr.onerror = () => reject(new ApiError(0, ERROR_CODES.systemError, MESSAGES.systemError));
    xhr.ontimeout = xhr.onerror;
    xhr.onabort = () => reject(new DOMException('Đã hủy.', 'AbortError'));
    if (signal) {
      if (signal.aborted) return reject(new DOMException('Đã hủy.', 'AbortError'));
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(body);
  });
}

export function createApiClient({ baseUrl, getAccessToken, onUnauthorized }: ApiClientOptions): ApiClient {
  async function send(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Correlation-Id': correlationId(),
    };
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const url = `${baseUrl}${withQuery(path, options.query)}`;
    if (isForm && options.onUploadProgress && typeof XMLHttpRequest !== 'undefined') {
      return sendWithProgress(url, options.method ?? 'POST', headers, options.body as FormData, options.onUploadProgress, options.signal);
    }
    try {
      return await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(0, ERROR_CODES.systemError, MESSAGES.systemError);
    }
  }

  /** Gửi yêu cầu kèm token (nếu endpoint cần) và đổi phản hồi lỗi thành ApiError; trả phản hồi khi thành công. */
  async function exchange(path: string, options: RequestOptions): Promise<{ response: Response; token: string | null }> {
    const needsAuth = options.auth ?? true;
    let token: string | null = null;
    if (needsAuth) {
      token = getAccessToken();
      // Chưa đăng nhập hoặc token đã quá hạn: không gọi mạng, route guard sẽ đưa về màn hình đăng nhập.
      if (!token) throw new ApiError(401, ERROR_CODES.forbidden, MESSAGES.forbidden);
    }
    return { response: await send(path, options, token), token };
  }

  function fail(response: Response, token: string | null, envelope: ApiEnvelope<unknown> | null): never {
    if (token && response.status === 401) {
      onUnauthorized?.({ token, errorCode: envelope?.errorCode ?? null, message: envelope?.message ?? null });
    }
    if (!envelope) {
      // Máy chủ cắt yêu cầu quá cỡ trước khi tới ứng dụng nên không có khuôn phản hồi.
      const tooLarge = response.status === 413;
      throw new ApiError(response.status, tooLarge ? ERROR_CODES.invalid : ERROR_CODES.systemError, tooLarge ? MESSAGES.invalid('Tệp tải lên', 'vượt quá dung lượng cho phép') : MESSAGES.systemError);
    }
    throw new ApiError(
      response.status,
      envelope.errorCode ?? ERROR_CODES.systemError,
      envelope.message ?? MESSAGES.systemError,
      envelope.errors ?? {},
      envelope.traceId,
    );
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const { response, token } = await exchange(path, options);
    const envelope = await readEnvelope<T>(response);
    if (response.ok && envelope?.success) return { data: envelope.data as T, message: envelope.message };
    return fail(response, token, envelope);
  }

  async function download(path: string, options: RequestOptions = {}, fallbackFileName = 'tep-tai-ve'): Promise<DownloadedFile> {
    const { response, token } = await exchange(path, options);
    if (response.ok) {
      return { blob: await response.blob(), fileName: fileNameOf(response.headers.get('Content-Disposition')) ?? fallbackFileName };
    }
    return fail(response, token, await readEnvelope<unknown>(response));
  }

  return { request, download };
}

/** Câu hiển thị cho một lỗi bất kỳ: câu thông báo của backend, hoặc câu lỗi hệ thống. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : MESSAGES.systemError;
}

/**
 * Câu hiện trên màn hình đăng nhập khi máy chủ kết thúc phiên: tài khoản bị chặn thì giữ lý do của máy chủ, còn lại
 * (token hết hạn, mật khẩu đổi ở nơi khác) là câu "phiên đăng nhập đã hết".
 */
export function sessionEndNotice(response: Pick<UnauthorizedResponse, 'errorCode' | 'message'>): string {
  return response.errorCode === ERROR_CODES.accountBlocked && response.message ? response.message : MESSAGES.sessionExpired;
}
