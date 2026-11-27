import type { LessonLibraryItem } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { GRADE_FOUR_TOPICS, topicRefOf } from '../../test/curriculumFixtures';
import { libraryItemOf, quotaOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Thư viện bài mẫu của giáo viên: nhãn chủ đề trên thẻ và bộ lọc chủ đề theo khối đang lọc (nằm trên URL).

function api(items: LessonLibraryItem[], topicsByGrade: Record<number, unknown[]> = { 4: GRADE_FOUR_TOPICS }) {
  return mockApi((call) => {
    if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
    if (call.path.startsWith('/teacher/lesson-library?')) return envelope(200, { data: { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 } });
    if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quotaOf() });
    if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: { items: [classOf(1)], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } });
    const topics = /^\/teacher\/curriculum-topics\?grade=(\d+)$/.exec(call.path);
    if (topics) return envelope(200, { data: { items: topicsByGrade[Number(topics[1])] ?? [] } });
    return undefined;
  });
}

const lastList = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/teacher/lesson-library?')).at(-1)?.path ?? '';

describe('Thư viện bài mẫu — chủ đề chương trình', () => {
  it('thẻ bài hiện nhãn chủ đề; bài không có chủ đề thì không có dòng nhãn', async () => {
    signInAs('TEACHER');
    api([
      libraryItemOf(1, { title: 'Hoàng thành Thăng Long', grade: 4, schoolLevel: 1, curriculumTopics: [topicRefOf(9)] }),
      libraryItemOf(2, { title: 'Vịnh Hạ Long', curriculumTopics: [] }),
    ]);
    renderApp('/giao-vien/thu-vien-bai-mau');

    const cards = await screen.findAllByRole('listitem', { name: /Hoàng thành|Vịnh Hạ Long/ });
    expect(within(cards[0]!).getByText('Đồng bằng Bắc Bộ: Thăng Long - Hà Nội')).toBeInTheDocument();
    expect(within(cards[1]!).queryByText('Chủ đề chương trình')).not.toBeInTheDocument();
  });

  it('chỉ hiện ô lọc chủ đề khi đã chọn một khối có chủ đề; chọn chủ đề gửi topicId và lưu trên URL; đổi khối thì bỏ chủ đề', async () => {
    signInAs('TEACHER');
    const calls = api([libraryItemOf(1)]);
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/thu-vien-bai-mau');

    await screen.findByRole('listitem', { name: 'Bài mẫu số 1' });
    expect(screen.queryByLabelText(/Chủ đề chương trình/)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Khối'), '4');
    const select = await screen.findByLabelText('Chủ đề chương trình (khối 4)');
    expect(within(select).getAllByRole('group')).toHaveLength(3);
    await user.selectOptions(select, 'Thăng Long - Hà Nội · 5 di sản');

    await waitFor(() => expect(lastList(calls)).toMatch(/topicId=9/));
    expect(lastList(calls)).toMatch(/grade=4/);
    expect(router.state.location.search).toContain('chu-de=9');

    await user.selectOptions(screen.getByLabelText('Khối'), '7');
    await waitFor(() => expect(lastList(calls)).not.toMatch(/topicId/));
    expect(router.state.location.search).not.toContain('chu-de');
    expect(screen.queryByLabelText(/Chủ đề chương trình/)).not.toBeInTheDocument();
  });

  it('lọc theo chủ đề không có kết quả: có nút Bỏ bộ lọc xóa luôn chủ đề', async () => {
    signInAs('TEACHER');
    api([]);
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/thu-vien-bai-mau?khoi=4&chu-de=9');

    await screen.findByText(/Không tìm thấy kết quả phù hợp/);
    await user.click(screen.getByRole('button', { name: 'Bỏ bộ lọc' }));
    expect(await screen.findByText('Thư viện chưa có bài mẫu nào.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });
});
