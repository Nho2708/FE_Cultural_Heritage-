import { STUDENT_ENDPOINTS } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { cardOf, detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi, studentOf } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Trang chủ khám phá: công khai, dữ liệu từ /public/home, không có ô nhập mã bài học.

const withDetail = () => (call: { path: string }) =>
  call.path === `/public/heritages/${HUE.slug}` ? envelope(200, { data: detailOf() }) : undefined;

describe('Trang chủ', () => {
  it('khách thấy ảnh lớn đầu trang, di sản nổi bật, khám phá theo vùng và loại; không có ô nhập mã bài học', async () => {
    const calls = mockApi(withDetail(), publicApi());
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Khám phá di sản Việt Nam' })).toBeInTheDocument();
    expect(await screen.findByText(/Tìm hiểu 20 di sản văn hóa và thiên nhiên/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' })).toBeInTheDocument();

    const featured = screen.getByRole('link', { name: /Dân ca Quan họ Bắc Ninh/ });
    expect(featured).toHaveAttribute('href', '/di-san/dan-ca-quan-ho-bac-ninh');
    expect(screen.getByRole('link', { name: /Xem tất cả 20 di sản/ })).toHaveAttribute('href', '/di-san');

    // Vùng và loại dẫn tới danh sách đã lọc sẵn, kèm số di sản.
    expect(screen.getByRole('link', { name: /11 DI SẢNs*Miền Bắc/ })).toHaveAttribute('href', `/di-san?vung=${encodeURIComponent('Bắc')}`);
    expect(screen.getByRole('link', { name: /6 DI SẢNs*Phi vật thể/ })).toHaveAttribute('href', '/di-san?loai=INTANGIBLE');

    expect(screen.getAllByRole('link', { name: /Học sinh đăng nhập/ }).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/mã bài học/i)).not.toBeInTheDocument();
    expect(calls.every((call) => call.authorization === undefined)).toBe(true);
  });

  it('chân trang có liên kết khám phá, lời ghi nguồn nội dung và ghi công ảnh; không có liên kết Android khi chưa có tệp', async () => {
    mockApi(withDetail(), publicApi());
    renderApp('/');

    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Bản đồ di sản' })).toHaveAttribute('href', '/ban-do');
    expect(within(footer).getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/dang-nhap');
    expect(within(footer).getByText(/Nội dung di sản tham khảo từ Cục Di sản văn hóa \(dsvh\.gov\.vn\)\. Ảnh từ Wikimedia Commons, ghi công theo từng ảnh\./)).toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: 'Tải app cho Android' })).not.toBeInTheDocument();
  });

  it('ảnh đầu trang có dòng ghi công của ảnh', async () => {
    mockApi(withDetail(), publicApi());
    renderApp('/');
    expect(await screen.findByText(/Ảnh: Vyacheslav Argenberg · CC BY 4\.0 · Wikimedia Commons/)).toBeInTheDocument();
  });

  it('ảnh Wikimedia Commons hiện bằng bản thu nhỏ', async () => {
    mockApi(withDetail(), publicApi());
    renderApp('/');
    await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' });
    const sources = [...document.querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src?.includes('/commons/thumb/'))).toBe(true);
  });

  it('tìm kiếm ở trang chủ chuyển sang trang tìm kiếm với từ khóa', async () => {
    mockApi(withDetail(), publicApi());
    const user = userEvent.setup();
    const { router } = renderApp('/');

    await user.type(await screen.findByRole('searchbox', { name: 'Từ khóa' }), 'thang long');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/di-san'));
    expect(router.state.location.search).toBe('?tu-khoa=thang+long');
  });

  it('gợi ý nhanh dẫn tới tìm kiếm theo từ khóa hoặc theo loại', async () => {
    mockApi(withDetail(), publicApi());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: 'Vịnh Hạ Long' })).toHaveAttribute('href', `/di-san?tu-khoa=${encodeURIComponent('Vịnh Hạ Long').replace(/%20/g, '+')}`);
    expect(screen.getByRole('link', { name: 'Phi vật thể' })).toHaveAttribute('href', '/di-san?loai=INTANGIBLE');
  });

  it('từ khóa một ký tự báo lỗi ngay dưới ô và không chuyển trang', async () => {
    mockApi(withDetail(), publicApi());
    const user = userEvent.setup();
    const { router } = renderApp('/');

    await user.type(await screen.findByRole('searchbox', { name: 'Từ khóa' }), 'a');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Từ khóa không hợp lệ: phải dài 2-100 ký tự.');
    expect(router.state.location.pathname).toBe('/');
  });

  it('học sinh đã đăng nhập thấy nút vào trang học; trang này vẫn dùng bộ giao diện mặc định', async () => {
    signInAs(studentOf(5));
    mockApi((call) => (call.path === STUDENT_ENDPOINTS.profile ? envelope(200, { data: studentOf(5) }) : undefined), withDetail(), publicApi());
    renderApp('/');

    const enter = await screen.findByRole('link', { name: 'Vào trang học của em' });
    expect(enter).toHaveAttribute('href', '/hoc');
    expect(screen.queryByRole('link', { name: 'Học sinh đăng nhập' })).not.toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-bo-giao-dien', 'mac-dinh');
  });

  it('chưa có tệp cài đặt Android thì ghi rõ thay vì hiện nút không dẫn đi đâu', async () => {
    mockApi(withDetail(), publicApi());
    renderApp('/');
    expect(await screen.findByText('Tệp cài đặt cho Android sẽ có ở đây khi app hoàn thành.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tải tệp cài đặt cho Android/ })).not.toBeInTheDocument();
  });

  it('máy chủ lỗi thì báo lỗi kèm nút thử lại, phần còn lại của trang vẫn dùng được', async () => {
    let fail = true;
    mockApi(
      (call) =>
        call.path === '/public/home' && fail ? envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ quản trị viên.' }) : undefined,
      publicApi(),
    );
    const user = userEvent.setup();
    renderApp('/');

    // Lỗi máy chủ được thử lại một lần (sau khoảng 1 giây) rồi mới báo.
    const alert = await screen.findByRole('alert', undefined, { timeout: 4000 });
    expect(alert).toHaveTextContent('Đã có lỗi xảy ra.');
    expect(screen.getByRole('heading', { level: 1, name: 'Khám phá di sản Việt Nam' })).toBeInTheDocument();

    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' })).toBeInTheDocument();
  }, 10_000);

  it('thẻ nổi bật ghi tỉnh và cấp xếp hạng kèm năm', async () => {
    mockApi(withDetail(), publicApi({ '/public/home': () => envelope(200, { data: { featured: [cardOf()], totalHeritages: 1, byType: [], byRegion: [] } }) }));
    renderApp('/');
    expect(await screen.findByText('Thành phố Huế · Di sản thế giới (UNESCO) 1993')).toBeInTheDocument();
  });
});
