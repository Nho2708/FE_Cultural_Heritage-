import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createApiClient } from './client';
import { createClassRecommendationsApi, createStudentRecommendationsApi } from './recommendations';
import { createStatisticsApi } from './statistics';

const client = () => createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'tk' });

describe('lớp gọi API thống kê của giáo viên', () => {
  it('kết quả bài kiểm tra dùng đúng bốn endpoint và chi tiết bài làm', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const api = createStatisticsApi(client());
    await api.quizOverview(9);
    await api.quizQuestions(9);
    await api.quizStudents(9);
    await api.quizTopics(9);
    await api.attempt(31);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /teacher/quizzes/9/results',
      'GET /teacher/quizzes/9/results/questions',
      'GET /teacher/quizzes/9/results/students',
      'GET /teacher/quizzes/9/results/topics',
      'GET /teacher/attempts/31',
    ]);
  });

  it('tiến độ, thành thạo (bộ lọc rỗng bị bỏ) và hồ sơ học sinh', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const api = createStatisticsApi(client());
    await api.classProgress(4);
    await api.classMastery(4);
    await api.classMastery(4, { provinceId: 12, heritageType: 'TANGIBLE' });
    await api.classMastery(4, { provinceId: '', heritageType: '' });
    await api.studentProfile(4, 77);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /teacher/classes/4/progress',
      'GET /teacher/classes/4/mastery',
      'GET /teacher/classes/4/mastery?provinceId=12&heritageType=TANGIBLE',
      'GET /teacher/classes/4/mastery',
      'GET /teacher/classes/4/students/77/profile',
    ]);
  });
});

describe('lớp gọi API gợi ý', () => {
  it('gợi ý cho em ở trang học và ở kết quả của một lượt', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const api = createStudentRecommendationsApi(client());
    await api.recommendations();
    await api.attemptRecommendations(31);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /student/recommendations', 'GET /student/attempts/31/recommendations']);
  });

  it('gợi ý ôn tập cho lớp và cho một bài kiểm tra, có khoảng thời gian', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const api = createClassRecommendationsApi(client());
    await api.forClass(4);
    await api.forClass(4, { quizId: 9, from: '2026-09-07T00:00:00+07:00', to: '2026-10-07T00:00:00+07:00' });
    await api.forClass(4, { quizId: '' });
    await api.forQuiz(9, { from: '2026-09-07T00:00:00+07:00' });
    expect(calls.map((c) => `${c.method} ${decodeURIComponent(c.path)}`)).toEqual([
      'GET /teacher/classes/4/recommendations',
      'GET /teacher/classes/4/recommendations?quizId=9&from=2026-09-07T00:00:00+07:00&to=2026-10-07T00:00:00+07:00',
      'GET /teacher/classes/4/recommendations',
      'GET /teacher/quizzes/9/results/recommendations?from=2026-09-07T00:00:00+07:00',
    ]);
  });
});
