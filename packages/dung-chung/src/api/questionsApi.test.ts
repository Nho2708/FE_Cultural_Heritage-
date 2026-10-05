import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createApiClient } from './client';
import { createQuestionsApi } from './questions';

const api = () => createQuestionsApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'tk' }));

describe('lớp gọi API ngân hàng câu hỏi', () => {
  it('danh sách: bỏ tham số rỗng, gửi lọc đúng tên', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }));
    await api().list({
      scope: 'MINE',
      questionType: 'MATCHING',
      level: 1,
      difficultyLevel: '',
      heritageId: '',
      status: 'PENDING',
      keyword: 'hoa lư',
      page: 2,
      pageSize: 20,
    });
    const path = decodeURIComponent(calls[0]!.path);
    expect(calls[0]!.method).toBe('GET');
    expect(path).toContain('/teacher/questions?');
    for (const part of ['scope=MINE', 'questionType=MATCHING', 'level=1', 'status=PENDING', 'keyword=hoa+lư', 'page=2']) {
      expect(path).toContain(part);
    }
    expect(path).not.toContain('difficultyLevel');
    expect(path).not.toContain('heritageId');
  });

  it('kiểm hợp lệ gửi câu, cấp xem trước và cách làm', async () => {
    const calls = mockApi(() =>
      envelope(200, { data: { isValid: false, errors: { 'options[1].content': 'Trùng' }, partsTotal: 1, preview: null, trial: null } }),
    );
    const { data } = await api().validate(
      { questionType: 'SINGLE_CHOICE', heritageId: 1, content: 'x', explanation: null, difficultyLevel: 'EASY' },
      { previewLevel: 2, submission: { selectedIndex: 1 } },
    );
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/teacher/questions/validate' });
    expect(calls[0]!.body).toMatchObject({ previewLevel: 2, submission: { selectedIndex: 1 }, question: { questionType: 'SINGLE_CHOICE' } });
    expect(data.errors['options[1].content']).toBe('Trùng');
  });

  it('duyệt, loại, nhân bản, xem trước theo cấp, chấm thử, duyệt nhiều câu, xóa', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const q = api();
    await q.approve(4);
    await q.reject(4);
    await q.duplicate(4);
    await q.preview(4, 3);
    await q.tryGrade(4, { order: [1, 0, 2] });
    await q.approveMany([1, 2, 3]);
    await q.remove(4);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /teacher/questions/4/approve',
      'POST /teacher/questions/4/reject',
      'POST /teacher/questions/4/duplicate',
      'GET /teacher/questions/4/preview?level=3',
      'POST /teacher/questions/4/try-grade',
      'POST /teacher/questions/approve',
      'DELETE /teacher/questions/4',
    ]);
    expect(calls[4]!.body).toEqual({ order: [1, 0, 2] });
    expect(calls[5]!.body).toEqual({ questionIds: [1, 2, 3] });
  });

  it('AI sinh câu và hạn mức theo bài học', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api().generate(9, { count: 5, difficultyLevel: 'MEDIUM', types: ['ORDERING'] });
    await api().quota(9);
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/teacher/lessons/9/ai/questions' });
    expect(calls[0]!.body).toEqual({ count: 5, difficultyLevel: 'MEDIUM', types: ['ORDERING'] });
    expect(calls[1]).toMatchObject({ method: 'GET', path: '/teacher/lessons/9/ai/questions/quota' });
  });
});
