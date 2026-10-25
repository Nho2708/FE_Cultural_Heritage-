import { ATTEMPT_ENDPOINTS, type StudentAlbum } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { albumCardOf, albumOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Album di sản của em (cấp 1): thẻ đã có (ảnh, tên, nhóm, nhãn "Mới"), thẻ chưa có (dấu "?", tên bài sẽ mở thẻ), lọc theo nhóm, chạm thẻ
// mở mẩu chuyện có nút nghe; album trống thì nói em học xong một bài là có thẻ đầu tiên.

function open(album: StudentAlbum) {
  const student = studentOf(2);
  signInAs(student);
  mockApi((call) => (call.path === ATTEMPT_ENDPOINTS.album ? envelope(200, { data: album }) : undefined), studentServer(student));
  return renderApp('/hoc/album');
}

const fresh = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();

const album = albumOf([
  albumCardOf(1, { name: 'Chùa Một Cột', slug: 'chua-mot-cot', collectedAt: fresh, shortDescription: 'Chùa đứng trên một cây cột đá giữa hồ.' }),
  albumCardOf(2, { name: 'Múa rối nước', groupName: 'Lễ hội, nghề và làn điệu', collectedAt: '2026-09-01T01:00:00Z' }),
  albumCardOf(3, { name: 'Vịnh Hạ Long', groupName: 'Cảnh đẹp thiên nhiên', collected: false, collectedAt: null, lessonTitle: 'Vịnh Hạ Long kỳ thú' }),
]);

describe('Album di sản', () => {
  it('đầu trang có lối về trang học và số thẻ; thẻ đã có và thẻ chưa có; nhãn Mới chỉ ở thẻ nhận trong 7 ngày', async () => {
    open(album);
    expect(await screen.findByRole('heading', { level: 1, name: 'Album di sản' })).toBeInTheDocument();
    expect(await screen.findByText('2 / 3 thẻ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang học' })).toHaveAttribute('href', '/hoc');
    const cards = screen.getByRole('list', { name: 'Các thẻ di sản' });
    expect(within(cards).getByRole('button', { name: 'Chùa Một Cột, thẻ mới. Chạm để xem mẩu chuyện' })).toBeInTheDocument();
    expect(within(cards).getByRole('button', { name: 'Múa rối nước. Chạm để xem mẩu chuyện' })).toBeInTheDocument();
    expect(within(cards).getAllByText('Mới')).toHaveLength(1);
    expect(within(cards).getByText('Học bài “Vịnh Hạ Long kỳ thú” để mở')).toBeInTheDocument();
    expect(screen.queryByText('Em học xong một bài là có thẻ đầu tiên!')).not.toBeInTheDocument();
  });

  it('hàng chip lọc theo nhóm của máy chủ, "Tất cả" đứng đầu', async () => {
    const user = userEvent.setup();
    open(album);
    const filters = await screen.findByRole('group', { name: 'Lọc theo nhóm' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tất cả',
      'Di tích và đồ vật xưa',
      'Lễ hội, nghề và làn điệu',
      'Cảnh đẹp thiên nhiên',
    ]);
    await user.click(within(filters).getByRole('button', { name: 'Lễ hội, nghề và làn điệu' }));
    expect(within(filters).getByRole('button', { name: 'Lễ hội, nghề và làn điệu' })).toHaveAttribute('aria-pressed', 'true');
    const cards = screen.getByRole('list', { name: 'Các thẻ di sản' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(1);
    expect(within(cards).getByText('Múa rối nước')).toBeInTheDocument();
  });

  it('chạm thẻ đã có: hộp thoại có ảnh, mẩu chuyện, nút nghe và liên kết xem về di sản', async () => {
    const user = userEvent.setup();
    open(album);
    await user.click(await screen.findByRole('button', { name: /^Chùa Một Cột, thẻ mới/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Chùa Một Cột' });
    expect(within(dialog).getByText('Chùa đứng trên một cây cột đá giữa hồ.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Nghe mẩu chuyện về Chùa Một Cột' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Xem về di sản này' })).toHaveAttribute('href', '/di-san/chua-mot-cot');
  });

  it('chưa có thẻ nào: câu nhắc em học xong một bài là có thẻ đầu tiên', async () => {
    open(albumOf([albumCardOf(3, { collected: false, collectedAt: null })]));
    expect(await screen.findByText('Em học xong một bài là có thẻ đầu tiên!')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 thẻ')).toBeInTheDocument();
  });
});
