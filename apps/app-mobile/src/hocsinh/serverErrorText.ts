import { ApiError } from '@dsvhvn/dung-chung/api';

/**
 * Câu hiện cho em khi một lệnh gọi máy chủ hỏng: lời của máy chủ nếu máy chủ đã trả lời; còn mất kết nối (không có phản hồi nào,
 * thư viện gọi mạng đặt trạng thái 0) hay lỗi lạ thì dùng câu `fallback` bằng lời của em, thay vì câu chung "liên hệ quản trị viên".
 */
export function serverErrorText(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status > 0 ? error.message : fallback;
}
