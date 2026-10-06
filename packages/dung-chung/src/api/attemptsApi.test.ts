import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createAttemptsApi } from './attempts';
import { createApiClient } from './client';

const api = () => createAttemptsApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'tk' }));

describe('lớp gọi API làm bài kiểm tra của học sinh', () => {
  it('trang học, tiến độ và lịch sử có phân trang', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api().home();
    await api().progress();
    await api().history(2, 10);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /student/home',
      'GET /student/progress',
      'GET /student/attempts?page=2&pageSize=10',
    ]);
  });

  it('mở bài, bắt đầu, vào tiếp và nộp dùng đúng endpoint', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api().quizIntro(9);
    await api().startAttempt(9);
    await api().attempt(31);
    await api().submit(31);
    await api().result(31);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /student/quizzes/9',
      'POST /student/quizzes/9/attempts',
      'GET /student/attempts/31',
      'POST /student/attempts/31/submit',
      'GET /student/attempts/31/result',
    ]);
  });

  it('lưu câu trả lời ghi đè cả câu; thân rỗng là xóa', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api().saveAnswer(31, 7, { selectedIndex: 2 });
    await api().saveAnswer(31, 7, {});
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['PUT /student/attempts/31/answers/7', 'PUT /student/attempts/31/answers/7']);
    expect(calls[0]!.body).toEqual({ selectedIndex: 2 });
    expect(calls[1]!.body).toEqual({});
  });
});
