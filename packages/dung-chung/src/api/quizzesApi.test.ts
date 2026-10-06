import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createApiClient } from './client';
import { createQuizzesApi } from './quizzes';

const api = () => createQuizzesApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'tk' }));
const emptyPage = { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

describe('lớp gọi API bài kiểm tra', () => {
  it('danh sách: gửi lọc đúng tên, bỏ tham số rỗng', async () => {
    const calls = mockApi(() => envelope(200, { data: emptyPage }));
    await api().list({ lessonId: 5, classId: '', status: 'PUBLISHED', keyword: 'huế', page: 2, pageSize: 20 });
    const path = decodeURIComponent(calls[0]!.path);
    expect(calls[0]!.method).toBe('GET');
    for (const part of ['/teacher/quizzes?', 'lessonId=5', 'status=PUBLISHED', 'keyword=huế', 'page=2']) expect(path).toContain(part);
    expect(path).not.toContain('classId');
  });

  it('tạo, lưu và xóa bài nháp', async () => {
    const calls = mockApi(() => envelope(200, { data: null }));
    await api().create({ lessonId: 5, name: 'Bài mới' });
    await api().update(9, { name: 'Đổi tên', timeLimitMinutes: null });
    await api().remove(9);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /teacher/quizzes', 'PUT /teacher/quizzes/9', 'DELETE /teacher/quizzes/9']);
    expect(calls[0]!.body).toEqual({ lessonId: 5, name: 'Bài mới' });
    expect(calls[1]!.body).toEqual({ name: 'Đổi tên', timeLimitMinutes: null });
  });

  it('hộp chọn câu: lọc theo di sản của bài, dạng, độ khó, từ khóa', async () => {
    const calls = mockApi(() => envelope(200, { data: { ...emptyPage, level: 2, allowedTypes: [] } }));
    await api().candidates(9, { questionType: 'FILL_BLANK', difficultyLevel: '', heritageId: 11, lessonHeritagesOnly: false, keyword: 'văn miếu', page: 1, pageSize: 10 });
    const path = decodeURIComponent(calls[0]!.path);
    for (const part of ['/teacher/quizzes/9/question-candidates?', 'questionType=FILL_BLANK', 'heritageId=11', 'lessonHeritagesOnly=false', 'keyword=văn+miếu']) {
      expect(path).toContain(part);
    }
    expect(path).not.toContain('difficultyLevel');
  });

  it('thêm, đặt lại và bỏ câu dùng đúng ba endpoint', async () => {
    const calls = mockApi(() => envelope(200, { data: null }));
    await api().addQuestions(9, [1, 2], 2);
    await api().replaceQuestions(9, [
      { questionId: 2, point: 1 },
      { questionId: 1, point: 0.5 },
    ]);
    await api().removeQuestion(9, 2);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /teacher/quizzes/9/questions',
      'PUT /teacher/quizzes/9/questions',
      'DELETE /teacher/quizzes/9/questions/2',
    ]);
    expect(calls[0]!.body).toEqual({ questionIds: [1, 2], point: 2 });
    expect(calls[1]!.body).toEqual({
      items: [
        { questionId: 2, point: 1 },
        { questionId: 1, point: 0.5 },
      ],
    });
  });

  it('phát hành, đóng và nhân bản', async () => {
    const calls = mockApi(() => envelope(200, { data: null }));
    await api().publish(9);
    await api().close(9);
    await api().duplicate(9, 'Bản mới');
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /teacher/quizzes/9/publish',
      'POST /teacher/quizzes/9/close',
      'POST /teacher/quizzes/9/duplicate',
    ]);
    expect(calls[2]!.body).toEqual({ name: 'Bản mới' });
  });
});
