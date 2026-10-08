import { ApiError } from '@dsvhvn/dung-chung/api';
import { serverErrorText } from './serverErrorText';

describe('serverErrorText', () => {
  const fallback = 'Không kết nối được. Em kiểm tra mạng rồi thử lại nhé.';

  it('giữ lời của máy chủ khi máy chủ đã trả lời', () => {
    expect(serverErrorText(new ApiError(404, 'NOT_FOUND', 'Không tìm thấy bài học.'), fallback)).toBe('Không tìm thấy bài học.');
  });

  it('dùng câu của em khi mất kết nối (trạng thái 0)', () => {
    expect(serverErrorText(new ApiError(0, 'SYSTEM_ERROR', 'Đã có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ quản trị viên.'), fallback)).toBe(fallback);
  });

  it('dùng câu của em với lỗi không phải của máy chủ', () => {
    expect(serverErrorText(new TypeError('Network request failed'), fallback)).toBe(fallback);
  });
});
