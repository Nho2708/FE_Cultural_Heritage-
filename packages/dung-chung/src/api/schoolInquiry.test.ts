import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { ApiError, createApiClient, ERROR_CODES } from './client';
import { createSchoolInquiryApi } from './schoolInquiry';

const api = createSchoolInquiryApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'access-dang-nhap' }));

const INPUT = {
  schoolName: 'Trường THCS Nguyễn Du',
  province: 'Hà Nội',
  contactName: 'Trần Thị Hạnh',
  position: null,
  email: 'hanh@nguyendu.edu.vn',
  phone: null,
  message: 'Trường em muốn dùng thử.',
  website: '',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('liên hệ của trường', () => {
  it('gửi POST công khai không gắn token và trả câu xác nhận của máy chủ', async () => {
    const calls = mockApi(() => envelope(202, { message: 'Đã gửi. Nhóm sẽ liên hệ lại qua email.' }));

    const message = await api.submit(INPUT);

    expect(message).toBe('Đã gửi. Nhóm sẽ liên hệ lại qua email.');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/public/school-inquiries', authorization: undefined });
    expect(calls[0]!.body).toEqual(INPUT);
  });

  it('lỗi theo trường, quá nhiều lần và chưa gửi được đều thành ApiError', async () => {
    mockApi(() => envelope(400, { errorCode: 'REQUIRED', message: 'Vui lòng nhập tên trường.', errors: { schoolName: 'Vui lòng nhập tên trường.' } }));
    await expect(api.submit(INPUT)).rejects.toMatchObject({ status: 400, fieldErrors: { schoolName: 'Vui lòng nhập tên trường.' } });

    mockApi(() => envelope(429, { errorCode: 'TOO_MANY_REQUESTS', message: 'Có quá nhiều yêu cầu.' }));
    await expect(api.submit(INPUT)).rejects.toMatchObject({ status: 429 });

    mockApi(() => envelope(503, { errorCode: 'SCHOOL_INQUIRY_UNAVAILABLE', message: 'Chưa gửi được, vui lòng thử lại sau.' }));
    const error = await api.submit(INPUT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, message: 'Chưa gửi được, vui lòng thử lại sau.' });
    expect(ERROR_CODES.systemError).toBe('SYSTEM_ERROR');
  });
});
