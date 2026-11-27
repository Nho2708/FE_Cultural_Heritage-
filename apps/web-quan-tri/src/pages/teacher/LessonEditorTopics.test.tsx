import type { LessonDetail } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf } from '../../test/fixtures';
import { topicRefOf } from '../../test/curriculumFixtures';
import { lessonOf, materialsOf, quotaOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Soạn bài học: dòng nhãn "Chủ đề chương trình" (chỉ đọc) dưới thông tin lớp, tính từ di sản của bài.

function api(lesson: LessonDetail) {
  return mockApi((call) => {
    if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
    if (call.path === `/teacher/lessons/${lesson.id}` && call.method === 'GET') return envelope(200, { data: lesson });
    if (call.path === `/teacher/lessons/${lesson.id}/materials`) return envelope(200, { data: materialsOf() });
    if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quotaOf() });
    if (call.path.startsWith('/teacher/quizzes?')) return envelope(200, { data: { items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } });
    if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: { items: [classOf(1)], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } });
    return undefined;
  });
}

describe('Soạn bài học — nhãn chủ đề chương trình', () => {
  it('hiện mỗi chủ đề là một nhãn "Chủ đề lớn: Nội dung" ngay dưới ô Lớp', async () => {
    signInAs('TEACHER');
    api(
      lessonOf({
        level: 1,
        curriculumTopics: [
          topicRefOf(9, { groupTitle: 'Đồng bằng Bắc Bộ', title: 'Thăng Long - Hà Nội' }),
          topicRefOf(10, { groupTitle: 'Đồng bằng Bắc Bộ', title: 'Văn Miếu - Quốc Tử Giám' }),
        ],
      }),
    );
    renderApp('/giao-vien/bai-hoc/5');

    const labels = await screen.findByRole('list', { name: 'Chủ đề chương trình' });
    expect(within(labels).getByText('Đồng bằng Bắc Bộ: Thăng Long - Hà Nội')).toBeInTheDocument();
    expect(within(labels).getByText('Đồng bằng Bắc Bộ: Văn Miếu - Quốc Tử Giám')).toBeInTheDocument();
    expect(screen.getByLabelText('Lớp')).toHaveValue('4B1 · Khối 4 · Cấp 1 (Tiểu học)');
  });

  it('bài không thuộc chủ đề nào hoặc máy chủ chưa trả chủ đề: không hiện dòng nhãn', async () => {
    signInAs('TEACHER');
    api(lessonOf({ curriculumTopics: [] }));
    renderApp('/giao-vien/bai-hoc/5');

    await screen.findByLabelText('Lớp');
    expect(screen.queryByText('Chủ đề chương trình')).not.toBeInTheDocument();
  });
});
