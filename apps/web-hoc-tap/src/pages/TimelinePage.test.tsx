import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { heritageNotFound, HUE, pagedOf, phaseOf, publicApi, QUAN_HO, THANG_LONG, timelineOf } from '../test/discoveryFixtures';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Dòng thời gian di sản: chọn di sản, rồi trục dọc các giai đoạn, mở một giai đoạn để xem sự kiện.

const timelineApi = (timeline = timelineOf()) =>
  mockApi((call) => (call.path === `/public/heritages/${timeline.slug}/timeline` ? envelope(200, { data: timeline }) : undefined), publicApi());

describe('Dòng thời gian di sản — chọn di sản', () => {
  it('chưa chọn di sản: danh sách di sản, mỗi thẻ dẫn tới dòng thời gian của di sản đó', async () => {
    mockApi(publicApi({ '/public/heritages': () => envelope(200, { data: pagedOf([HUE, THANG_LONG, QUAN_HO], { pageSize: 100 }) }) }));
    renderApp('/dong-thoi-gian');

    expect(await screen.findByRole('heading', { level: 1, name: 'Chọn một di sản để xem dòng thời gian' })).toBeInTheDocument();
    const card = await screen.findByRole('link', { name: /Dân ca Quan họ Bắc Ninh/ });
    expect(card).toHaveAttribute('href', '/dong-thoi-gian/dan-ca-quan-ho-bac-ninh');
  });

  it('tìm nhanh theo tên gửi từ khóa (có thể không dấu) và lấy tối đa 100 di sản', async () => {
    const calls: FetchCall[] = mockApi(publicApi());
    const user = userEvent.setup();
    const { router } = renderApp('/dong-thoi-gian');

    await user.type(await screen.findByRole('searchbox', { name: 'Từ khóa' }), 'quan ho');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    await waitFor(() => expect(router.state.location.search).toBe('?tu-khoa=quan+ho'));
    await waitFor(() => expect(calls.some((call) => call.path.includes('keyword=quan+ho') && call.path.includes('pageSize=100'))).toBe(true));
  });

  it('không có di sản nào khớp thì báo', async () => {
    mockApi(publicApi({ '/public/heritages': () => envelope(200, { data: pagedOf([], { totalItems: 0, totalPages: 0 }) }) }));
    renderApp('/dong-thoi-gian?tu-khoa=zzzz');
    expect(await screen.findByText('Không tìm thấy di sản nào')).toBeInTheDocument();
  });
});

describe('Dòng thời gian di sản — trục các giai đoạn', () => {
  it('đầu trang có tên di sản, tỉnh, số giai đoạn và sự kiện; giai đoạn đầu mở sẵn, giai đoạn sau thu gọn', async () => {
    timelineApi();
    renderApp(`/dong-thoi-gian/${HUE.slug}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Quần thể di tích Cố đô Huế' })).toBeInTheDocument();
    expect(screen.getByText('Thành phố Huế · 2 giai đoạn, 5 sự kiện')).toBeInTheDocument();
    expect(screen.getByText('GIAI ĐOẠN 1')).toBeInTheDocument();
    expect(screen.getByText('1558 – 1945')).toBeInTheDocument();
    expect(screen.getByText('1993 – nay')).toBeInTheDocument();

    // Giai đoạn 1 mở: năm hiển thị sẵn của từng sự kiện.
    expect(screen.getByText('Mở đầu gần 400 năm')).toBeInTheDocument();
    expect(screen.getByText('1805 – 1832')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thu gọn' })).toHaveAttribute('aria-expanded', 'true');

    // Giai đoạn 2 thu gọn, chỉ nhắc mốc gần nhất.
    expect(screen.queryByText('UNESCO ghi danh')).not.toBeInTheDocument();
    expect(screen.getByText('Mốc gần nhất: 12/08/2009 — Xếp hạng di tích quốc gia đặc biệt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Xem 2 sự kiện/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('mở và thu gọn từng giai đoạn', async () => {
    timelineApi();
    const user = userEvent.setup();
    renderApp(`/dong-thoi-gian/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: /^Xem 2 sự kiện/ }));
    expect(screen.getByText('UNESCO ghi danh')).toBeInTheDocument();
    expect(screen.getByText('11/12/1993')).toBeInTheDocument();
    expect(screen.queryByText(/^Mốc gần nhất/)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Thu gọn' })[0]!);
    expect(screen.queryByText('Mở đầu gần 400 năm')).not.toBeInTheDocument();
    expect(screen.getByText('Mốc gần nhất: 1833 — Xây Ngọ Môn')).toBeInTheDocument();
  });

  it('ảnh của sự kiện kèm ghi công ba phần', async () => {
    timelineApi();
    renderApp(`/dong-thoi-gian/${HUE.slug}`);
    expect(await screen.findByText('Ảnh: Vyacheslav Argenberg · CC BY 4.0 · Wikimedia Commons')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ngọ Môn' })).toBeInTheDocument();
  });

  it('"Về trang di sản" và "Đổi di sản"', async () => {
    mockApi(
      (call) => (call.path === `/public/heritages/${HUE.slug}/timeline` ? envelope(200, { data: timelineOf() }) : undefined),
      publicApi({ '/public/heritages': () => envelope(200, { data: pagedOf([HUE, THANG_LONG], { pageSize: 100 }) }) }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/dong-thoi-gian/${HUE.slug}`);

    expect(await screen.findByRole('link', { name: /Về trang di sản/ })).toHaveAttribute('href', '/di-san/quan-the-di-tich-co-do-hue');
    const picker = screen.getByRole('combobox', { name: 'Đổi di sản' });
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(2));
    await user.selectOptions(picker, THANG_LONG.slug);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/dong-thoi-gian/${THANG_LONG.slug}`));
  });

  it('di sản chưa có giai đoạn nào vẫn là trang hợp lệ, báo rõ và cho chọn di sản khác', async () => {
    timelineApi(timelineOf({ phases: [] }));
    renderApp(`/dong-thoi-gian/${HUE.slug}`);

    expect(await screen.findByText('Di sản này chưa có dòng thời gian')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chọn di sản khác' })).toHaveAttribute('href', '/dong-thoi-gian');
    expect(screen.getByText('Thành phố Huế · 0 giai đoạn, 0 sự kiện')).toBeInTheDocument();
  });

  it('giai đoạn chưa có sự kiện thì ghi rõ và không có nút mở', async () => {
    timelineApi(timelineOf({ phases: [phaseOf({ events: [] })] }));
    renderApp(`/dong-thoi-gian/${HUE.slug}`);
    expect(await screen.findByText('Giai đoạn này chưa có sự kiện.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sự kiện|Thu gọn/ })).not.toBeInTheDocument();
  });

  it('di sản không xem được → báo không tìm thấy', async () => {
    mockApi(() => heritageNotFound());
    renderApp('/dong-thoi-gian/khong-co');
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy di sản này' })).toBeInTheDocument();
  });
});
