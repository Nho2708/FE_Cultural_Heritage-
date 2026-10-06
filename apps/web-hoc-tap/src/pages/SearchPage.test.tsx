import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HUE, pagedOf, publicApi, QUAN_HO, THANG_LONG } from '../test/discoveryFixtures';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Tìm kiếm và lọc di sản: từ khóa và bộ lọc nằm trên địa chỉ trang, gửi đúng tham số cho /public/heritages.

const searchCalls = (calls: FetchCall[]) => calls.filter((call) => call.path.startsWith('/public/heritages?') || call.path === '/public/heritages');
const paramsOf = (call: FetchCall) => Object.fromEntries(new URL(`http://x${call.path}`).searchParams);

describe('Tìm kiếm và lọc di sản', () => {
  it('lưới thẻ có tên, tỉnh, nhãn loại và liên kết tới chi tiết; số kết quả và phân trang', async () => {
    mockApi(publicApi({ '/public/heritages': () => envelope(200, { data: pagedOf([HUE, THANG_LONG, QUAN_HO], { totalItems: 20, totalPages: 2 }) }) }));
    renderApp('/di-san');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tìm kiếm và lọc di sản' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: '20 di sản' })).toBeInTheDocument();

    const card = screen.getByRole('link', { name: /Dân ca Quan họ Bắc Ninh/ });
    expect(card).toHaveAttribute('href', '/di-san/dan-ca-quan-ho-bac-ninh');
    expect(within(card).getByText('Tỉnh Bắc Ninh')).toBeInTheDocument();
    expect(within(card).getByText('Phi vật thể')).toBeInTheDocument();

    expect(screen.getByText('Hiển thị 1–12 trên 20 di sản')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
  });

  it('địa chỉ trang mang đủ bộ lọc thì gửi đúng tham số, kể cả tìm không dấu', async () => {
    const calls = mockApi(publicApi());
    renderApp(`/di-san?tu-khoa=thang%20long&vung=${encodeURIComponent('Bắc')}&loai=TANGIBLE&cap=UNESCO&thoi-ky=INDEPENDENT_FEUDAL&tinh=1&trang=2`);

    await screen.findByRole('heading', { level: 2, name: '3 di sản' });
    expect(paramsOf(searchCalls(calls)[0]!)).toEqual({
      keyword: 'thang long',
      provinceId: '1',
      region: 'Bắc',
      heritageType: 'TANGIBLE',
      recognitionLevel: 'UNESCO',
      period: 'INDEPENDENT_FEUDAL',
      page: '2',
      pageSize: '12',
      lang: 'vi',
    });
    expect(screen.getByRole('searchbox', { name: 'Từ khóa' })).toHaveValue('thang long');
  });

  it('chọn bộ lọc thì cập nhật địa chỉ trang, về trang 1 và gọi lại máy chủ', async () => {
    const calls = mockApi(publicApi());
    const user = userEvent.setup();
    const { router } = renderApp('/di-san?trang=2');

    await screen.findByRole('heading', { level: 2, name: '3 di sản' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Loại' }), 'INTANGIBLE');

    await waitFor(() => expect(router.state.location.search).toBe('?loai=INTANGIBLE'));
    await waitFor(() => expect(searchCalls(calls).some((call) => paramsOf(call).heritageType === 'INTANGIBLE')).toBe(true));
    expect(screen.getByText('Loại: Phi vật thể')).toBeInTheDocument();
  });

  it('gửi từ khóa bằng nút Tìm kiếm rồi "Xóa bộ lọc" đưa về trạng thái ban đầu', async () => {
    mockApi(publicApi());
    const user = userEvent.setup();
    const { router } = renderApp('/di-san');

    await user.type(await screen.findByRole('searchbox', { name: 'Từ khóa' }), 'cồng chiêng');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(router.state.location.search).toBe(`?tu-khoa=${encodeURIComponent('cồng chiêng').replace(/%20/g, '+')}`));

    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('searchbox', { name: 'Từ khóa' })).toHaveValue('');
  });

  it('từ khóa một ký tự báo lỗi cùng câu với máy chủ và không gọi tìm kiếm', async () => {
    const calls = mockApi(publicApi());
    const user = userEvent.setup();
    renderApp('/di-san');

    await screen.findByRole('heading', { level: 2, name: '3 di sản' });
    const before = searchCalls(calls).length;
    await user.type(screen.getByRole('searchbox', { name: 'Từ khóa' }), 'a');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Từ khóa không hợp lệ: phải dài 2-100 ký tự.');
    expect(searchCalls(calls)).toHaveLength(before);
  });

  it('từ khóa sai độ dài trên địa chỉ trang cũng báo lỗi mà không gọi máy chủ', async () => {
    const calls = mockApi(publicApi());
    renderApp('/di-san?tu-khoa=a');

    expect(await screen.findByRole('alert')).toHaveTextContent('Từ khóa không hợp lệ: phải dài 2-100 ký tự.');
    expect(searchCalls(calls)).toHaveLength(0);
  });

  it('không có kết quả thì báo và gợi ý bớt bộ lọc, có nút xóa bộ lọc', async () => {
    mockApi(publicApi({ '/public/heritages': () => envelope(200, { data: pagedOf([], { totalItems: 0, totalPages: 0 }) }) }));
    renderApp('/di-san?tu-khoa=zzzz');

    expect(await screen.findByText('Không tìm thấy kết quả phù hợp. Hãy bớt tiêu chí lọc hoặc thử từ khóa khác.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xóa bộ lọc' }).length).toBeGreaterThan(0);
  });

  it('"Xem trên bản đồ" giữ nguyên từ khóa và bộ lọc', async () => {
    mockApi(publicApi());
    renderApp(`/di-san?tu-khoa=hue&loai=TANGIBLE&trang=2`);

    const link = await screen.findByRole('link', { name: 'Xem trên bản đồ' });
    expect(link).toHaveAttribute('href', '/ban-do?tu-khoa=hue&loai=TANGIBLE');
  });

  it('lỗi máy chủ báo bằng câu của máy chủ kèm nút thử lại', async () => {
    mockApi(publicApi({ '/public/heritages': () => envelope(429, { errorCode: 'TOO_MANY_REQUESTS', message: 'Có quá nhiều yêu cầu gửi tới trong thời gian ngắn. Vui lòng thử lại sau 30 giây.' }) }));
    renderApp('/di-san');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Có quá nhiều yêu cầu gửi tới trong thời gian ngắn. Vui lòng thử lại sau 30 giây.');
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('các ô lọc lấy danh mục từ máy chủ, thời kỳ có nhãn của máy chủ', async () => {
    mockApi(publicApi());
    renderApp('/di-san');

    const period = await screen.findByRole('combobox', { name: 'Thời kỳ' });
    await waitFor(() => expect(within(period).getByRole('option', { name: 'Bắc thuộc (179 TCN – 938)' })).toBeInTheDocument());
    expect(within(screen.getByRole('combobox', { name: 'Tỉnh, thành phố' })).getByRole('option', { name: 'Thành phố Huế' })).toBeInTheDocument();
  });
});
