import { describe, expect, it, vi } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { ApiError, createApiClient, fileNameOf } from './client';
import { createStudentApi, toStudentProfile, type StudentProfileWire } from './studentApi';

const BASE = 'http://api.test/api/v1';

const WIRE: StudentProfileWire = {
  userId: 101,
  studentId: 7,
  studentCode: 'HS8K2QX7',
  fullName: 'Nguyễn Minh An',
  mustChangePassword: true,
  schoolLevel: 2,
  class: {
    id: 5,
    name: '7A1',
    grade: 7,
    schoolLevel: 2,
    schoolLevelName: 'Cấp 2',
    schoolYear: '2026-2027',
    teacherName: 'Trần Văn Bình',
    organization: { id: 10, name: 'Trường THCS Nguyễn Du' },
  },
  lastLoginAt: null,
  createdAt: '2026-10-06T01:00:00Z',
};

function clientWith(token: string | null) {
  return createApiClient({ baseUrl: BASE, getAccessToken: () => token });
}

describe('hồ sơ học sinh của máy chủ', () => {
  it('đổi sang hồ sơ dùng chung: mã học sinh là tên đăng nhập, không email, lớp và trường lấy từ lớp', () => {
    expect(toStudentProfile(WIRE)).toMatchObject({
      id: 101,
      username: 'HS8K2QX7',
      studentCode: 'HS8K2QX7',
      email: null,
      role: 'STUDENT',
      mustChangePassword: true,
      schoolLevel: 2,
      class: { id: 5, name: '7A1', grade: 7, schoolYear: '2026-2027' },
      teacherName: 'Trần Văn Bình',
      organization: { id: 10, name: 'Trường THCS Nguyễn Du' },
    });
  });

  it('đăng nhập: đúng đường dẫn, không gắn token, kết quả đổi student thành user', async () => {
    const calls = mockApi(() =>
      envelope(200, { data: { tokenType: 'Bearer', accessToken: 'tk', expiresAt: '2026-10-06T09:00:00Z', student: WIRE } }),
    );
    const api = createStudentApi(clientWith('dang-co-token'));
    const { data } = await api.login({ studentCode: 'HS8K2QX7', password: 'MatKhauTam1' });

    expect(calls[0]).toMatchObject({ method: 'POST', path: '/student/auth/login', authorization: undefined });
    expect(data.accessToken).toBe('tk');
    expect(data.user.studentCode).toBe('HS8K2QX7');
    expect('student' in data).toBe(false);
  });

  it('đổi mật khẩu: gửi mật khẩu mới hai lần và nhận token mới kèm hồ sơ', async () => {
    const calls = mockApi(() =>
      envelope(200, {
        data: { tokenType: 'Bearer', accessToken: 'tk-moi', expiresAt: '2026-10-06T09:00:00Z', student: { ...WIRE, mustChangePassword: false } },
      }),
    );
    const api = createStudentApi(clientWith('tk-cu'));
    const { data } = await api.changePassword({ currentPassword: null, newPassword: 'MatKhauMoi9', confirmNewPassword: 'MatKhauMoi9' });

    expect(calls[0]).toMatchObject({
      method: 'PUT',
      path: '/student/me/password',
      authorization: 'Bearer tk-cu',
      body: { currentPassword: null, newPassword: 'MatKhauMoi9', confirmNewPassword: 'MatKhauMoi9' },
    });
    expect(data.accessToken).toBe('tk-moi');
    expect(data.user.mustChangePassword).toBe(false);
  });
});

describe('tải tệp lên và tải tệp về', () => {
  it('FormData gửi nguyên, không đặt Content-Type để trình duyệt tự thêm ranh giới', async () => {
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => envelope(200, { data: {} }));
    vi.stubGlobal('fetch', fetch);
    const form = new FormData();
    form.append('text', 'Nguyễn Minh Anh');
    await clientWith('tk').request('/x', { method: 'POST', body: form });

    const init = fetch.mock.calls[0]![1]!;
    expect(init.body).toBe(form);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('tải về: trả blob và tên tệp từ header, không đọc được header thì dùng tên dự phòng', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
        new Response('Họ và tên', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="mau.csv"' } }),
      ),
    );
    const file = await clientWith('tk').download('/m', {}, 'du-phong.csv');
    expect(file.fileName).toBe('mau.csv');
    expect(await file.blob.text()).toBe('Họ và tên');

    vi.stubGlobal('fetch', vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response('x', { status: 200 })));
    expect((await clientWith('tk').download('/m', {}, 'du-phong.csv')).fileName).toBe('du-phong.csv');
  });

  it('tải về lỗi: vẫn ném ApiError theo khuôn phản hồi chung', async () => {
    mockApi(() => envelope(400, { errorCode: 'INVALID', message: 'Định dạng tệp mẫu không hợp lệ.' }));
    await expect(clientWith('tk').download('/m')).rejects.toBeInstanceOf(ApiError);
  });

  it('đọc tên tệp từ Content-Disposition', () => {
    expect(fileNameOf("attachment; filename*=UTF-8''m%E1%BA%ABu.csv")).toBe('mẫu.csv');
    expect(fileNameOf('attachment; filename=mau.xlsx')).toBe('mau.xlsx');
    expect(fileNameOf(null)).toBeNull();
  });
});
