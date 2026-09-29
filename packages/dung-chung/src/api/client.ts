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
  samePassword: 'SAME_PASSWORD',
  duplicate: 'DUPLICATE',
  invalidCredentials: 'INVALID_CREDENTIALS',
  accountBlocked: 'ACCOUNT_BLOCKED',
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
  body?: unknown;
  /** Tham số query; giá trị rỗng, null, undefined bị bỏ qua. */
  query?: Record<string, QueryValue>;
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

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>>;
}

function correlationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
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

export function createApiClient({ baseUrl, getAccessToken, onUnauthorized }: ApiClientOptions): ApiClient {
  async function send(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Correlation-Id': correlationId(),
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      return await fetch(`${baseUrl}${withQuery(path, options.query)}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(0, ERROR_CODES.systemError, MESSAGES.systemError);
    }
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const needsAuth = options.auth ?? true;
    let token: string | null = null;
    if (needsAuth) {
      token = getAccessToken();
      // Chưa đăng nhập hoặc token đã quá hạn: không gọi mạng, route guard sẽ đưa về màn hình đăng nhập.
      if (!token) throw new ApiError(401, ERROR_CODES.forbidden, MESSAGES.forbidden);
    }

    const response = await send(path, options, token);
    const envelope = await readEnvelope<T>(response);
    if (response.ok && envelope?.success) return { data: envelope.data as T, message: envelope.message };

    if (token && response.status === 401) {
      onUnauthorized?.({ token, errorCode: envelope?.errorCode ?? null, message: envelope?.message ?? null });
    }
    if (!envelope) throw new ApiError(response.status, ERROR_CODES.systemError, MESSAGES.systemError);
    throw new ApiError(
      response.status,
      envelope.errorCode ?? ERROR_CODES.systemError,
      envelope.message ?? MESSAGES.systemError,
      envelope.errors ?? {},
      envelope.traceId,
    );
  }

  return { request };
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
