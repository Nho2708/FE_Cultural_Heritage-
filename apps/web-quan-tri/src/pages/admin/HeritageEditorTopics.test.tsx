import type { HeritageDetail } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { topicRefOf } from '../../test/curriculumFixtures';
import { envelope, heritageDetailOf, mockApi, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Biên tập di sản: nhãn chủ đề chương trình mà di sản đang thuộc (chỉ đọc), kèm lối sang trang Chủ đề chương trình.

function api(detail: HeritageDetail) {
  return mockApi((call) => {
    if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
    if (call.path === '/admin/provinces') return envelope(200, { data: [{ id: 1, code: '46', name: 'Thành phố Huế', region: 'Trung' }] });
    if (call.path === `/admin/heritages/${detail.id}` && call.method === 'GET') return envelope(200, { data: detail });
    return undefined;
  });
}

describe('Biên tập di sản — chủ đề chương trình', () => {
  it('hiện nhãn các chủ đề kèm khối, chỉ đọc, và liên kết tới trang Chủ đề chương trình', async () => {
    signInAs('ADMIN');
    api(
      heritageDetailOf({
        id: 3,
        curriculumTopics: [
          topicRefOf(9, { grade: 4, groupTitle: 'Đồng bằng Bắc Bộ', title: 'Thăng Long - Hà Nội' }),
          topicRefOf(33, { grade: 10, subject: 'Lịch sử', groupTitle: 'Chuyên đề học tập: Bảo tồn và phát huy giá trị di sản văn hoá ở Việt Nam', title: 'Giới thiệu một số di sản văn hoá vật thể tiêu biểu' }),
        ],
      }),
    );
    renderApp('/quan-tri/di-san/3');

    const labels = await screen.findByRole('list', { name: 'Chủ đề chương trình' });
    expect(within(labels).getByText('Lớp 4 · Đồng bằng Bắc Bộ: Thăng Long - Hà Nội')).toBeInTheDocument();
    expect(within(labels).getAllByRole('listitem')).toHaveLength(2);
    expect(within(labels).queryByRole('textbox')).not.toBeInTheDocument();
    const note = screen.getByText(/Chỉ đọc\. Muốn đổi chủ đề của di sản/);
    expect(within(note).getByRole('link', { name: 'Chủ đề chương trình' })).toHaveAttribute('href', '/quan-tri/chu-de-chuong-trinh');
  });

  it('di sản chưa thuộc chủ đề nào: báo rõ; máy chủ cũ chưa trả chủ đề: không hiện dòng nào', async () => {
    signInAs('ADMIN');
    api(heritageDetailOf({ id: 3, curriculumTopics: [] }));
    const first = renderApp('/quan-tri/di-san/3');
    expect(await screen.findByText('Di sản chưa thuộc chủ đề chương trình nào.')).toBeInTheDocument();
    first.unmount();

    api(heritageDetailOf({ id: 3, curriculumTopics: undefined }));
    renderApp('/quan-tri/di-san/3');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('list', { name: 'Chủ đề chương trình' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Chỉ đọc\. Muốn đổi chủ đề/)).not.toBeInTheDocument();
    expect(screen.queryByText('Di sản chưa thuộc chủ đề chương trình nào.')).not.toBeInTheDocument();
  });
});
