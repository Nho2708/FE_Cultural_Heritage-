import { vi } from 'vitest';

// Công cụ test dùng chung: API giả theo khuôn phản hồi của backend. Chỉ import trong test.

/** Phản hồi theo khuôn { success, data, message, errorCode, traceId, errors } của backend. */
export function envelope(
  status: number,
  body: { data?: unknown; message?: string | null; errorCode?: string | null; errors?: Record<string, string> } = {},
) {
  const success = status >= 200 && status < 300;
  return new Response(
    JSON.stringify({
      success,
      data: body.data ?? null,
      message: body.message ?? null,
      errorCode: body.errorCode ?? null,
      traceId: 'test-trace',
      ...(body.errors ? { errors: body.errors } : {}),
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

export interface FetchCall {
  method: string;
  /** Đường dẫn sau gốc API, kể cả query, ví dụ "/org/teachers?page=1". */
  path: string;
  body: unknown;
  authorization: string | undefined;
}

/** Nội dung gửi đi: JSON được đọc lại, FormData đổi thành đối tượng (tệp thành { fileName, size }). */
function readBody(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const fields: Record<string, unknown> = {};
    body.forEach((value, key) => {
      fields[key] = typeof value === 'string' ? value : { fileName: value.name, size: value.size };
    });
    return fields;
  }
  return JSON.parse(String(body));
}

type Route = (call: FetchCall) => Response | Promise<Response> | undefined;

/**
 * Thay fetch bằng bộ định tuyến giả: `routes` thử lần lượt, trả undefined để nhường route sau. Không khớp route nào
 * thì trả 404 như máy chủ. Trả về danh sách lời gọi để kiểm.
 */
export function mockApi(...routes: Route[]) {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async (input, init) => {
      const url = new URL(String(input));
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const call: FetchCall = {
        method: init?.method ?? 'GET',
        path: `${url.pathname.replace(/^\/api\/v1/, '')}${url.search}`,
        body: readBody(init?.body),
        authorization: headers.Authorization,
      };
      calls.push(call);
      for (const route of routes) {
        const response = await route(call);
        if (response) return response;
      }
      return envelope(404, { errorCode: 'BLOCKED', message: 'Không thể thực hiện. Không tìm thấy dữ liệu.' });
    }),
  );
  return calls;
}

/** Storage trong bộ nhớ cho test phiên đăng nhập. */
export function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}
