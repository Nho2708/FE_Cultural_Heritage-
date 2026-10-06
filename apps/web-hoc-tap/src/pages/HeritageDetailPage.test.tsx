import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { detailOf, heritageNotFound, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Chi tiết di sản (công khai): nội dung, ảnh kèm ghi công tách ba phần, nguồn, vị trí, dòng thời gian rút gọn.

vi.mock('../discovery/LocationMap', () => ({
  default: ({ latitude, longitude, label }: { latitude: number; longitude: number; label: string | null }) => (
    <div data-testid="ban-do-nho">{`${latitude},${longitude},${label}`}</div>
  ),
}));

const detailApi = (detail = detailOf()) =>
  mockApi((call) => (call.path.split('?')[0] === `/public/heritages/${detail.slug}` ? envelope(200, { data: detail }) : undefined), publicApi());

describe('Chi tiết di sản', () => {
  it('tên, nhãn, ghi công ảnh đại diện và nội dung theo tiêu đề', async () => {
    detailApi();
    renderApp(`/di-san/${HUE.slug}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Quần thể di tích Cố đô Huế' })).toBeInTheDocument();
    expect(document.title).toContain('Quần thể di tích Cố đô Huế');
    const chips = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(chips).toEqual(expect.arrayContaining(['Vật thể', 'Di sản thế giới (UNESCO)', 'Năm công nhận 1993', 'Thành phố Huế']));
    const hero = screen.getByRole('region', { name: 'Quần thể di tích Cố đô Huế' });
    expect(within(hero).getByText('Ảnh: Vyacheslav Argenberg · CC BY 4.0 · Wikimedia Commons')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Giới thiệu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Lịch sử hình thành' })).toBeInTheDocument();
    expect(screen.getByText('Kinh thành khởi công năm 1805.')).toBeInTheDocument();
    expect(screen.getByText('Vẽ sơ đồ ba vòng thành')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Đường dẫn' })).toHaveTextContent('Khám phá');
  });

  it('bảng thông tin và bản đồ nhỏ có tọa độ, liên kết "Xem trên bản đồ" mở đúng ghim', async () => {
    detailApi();
    renderApp(`/di-san/${HUE.slug}`);

    const info = await screen.findByRole('region', { name: 'Thông tin' });
    for (const label of ['Loại', 'Cấp xếp hạng', 'Năm công nhận', 'Tỉnh, thành phố', 'Địa chỉ']) {
      expect(within(info).getByText(label)).toBeInTheDocument();
    }
    expect(within(info).getByText('Phường Phú Xuân, Thành phố Huế')).toBeInTheDocument();

    expect(await screen.findByTestId('ban-do-nho')).toHaveTextContent('16.4694,107.5778,Thành phố Huế');
    expect(screen.getByText('16,4694° B · 107,5778° Đ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem trên bản đồ' })).toHaveAttribute('href', '/ban-do?chon=quan-the-di-tich-co-do-hue');
  });

  it('di sản không có tọa độ thì không có bản đồ nhỏ', async () => {
    detailApi(detailOf({ latitude: null, longitude: null }));
    renderApp(`/di-san/${HUE.slug}`);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByTestId('ban-do-nho')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Xem trên bản đồ' })).not.toBeInTheDocument();
  });

  it('thư viện ảnh ghi công tách ba phần dưới từng ảnh; video là liên kết ngoài', async () => {
    detailApi();
    renderApp(`/di-san/${HUE.slug}`);

    const gallery = (await screen.findByRole('heading', { level: 2, name: 'Thư viện ảnh' })).closest('section')!;
    expect(within(gallery).getByText('2 ảnh')).toBeInTheDocument();
    expect(within(gallery).getByText('Ngọ Môn – cổng chính phía nam của Hoàng thành Huế')).toBeInTheDocument();
    expect(within(gallery).getByText('Ảnh: Lưu Ly · Public domain · Wikimedia Commons')).toBeInTheDocument();
    const video = within(gallery).getByRole('link', { name: 'Video giới thiệu' });
    expect(video).toHaveAttribute('href', 'https://example.org/hue.mp4');
    expect(video).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('dòng thời gian rút gọn có tên giai đoạn, số sự kiện và nút mở dòng thời gian', async () => {
    detailApi();
    renderApp(`/di-san/${HUE.slug}`);

    const section = (await screen.findByRole('heading', { level: 2, name: 'Dòng thời gian' })).closest('section')!;
    expect(within(section).getByText('2 giai đoạn · 9 sự kiện')).toBeInTheDocument();
    expect(within(section).getByText('1558 – 1945')).toBeInTheDocument();
    expect(within(section).getByText('Bảo tồn và vinh danh')).toBeInTheDocument();
    expect(within(section).getByText('3 sự kiện')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Mở dòng thời gian' })).toHaveAttribute('href', '/dong-thoi-gian/quan-the-di-tich-co-do-hue');
  });

  it('di sản chưa có dòng thời gian thì không hiện khối này', async () => {
    detailApi(detailOf({ hasTimeline: false, timeline: [] }));
    renderApp(`/di-san/${HUE.slug}`);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { level: 2, name: 'Dòng thời gian' })).not.toBeInTheDocument();
  });

  it('nguồn: dòng tóm tắt theo cơ quan, từng nguồn có đường dẫn; đường dẫn không phải http/https không thành liên kết', async () => {
    detailApi();
    renderApp(`/di-san/${HUE.slug}`);

    const sources = (await screen.findByRole('heading', { level: 2, name: 'Nguồn' })).closest('section')!;
    expect(within(sources).getByText('Nguồn: Cục Di sản văn hóa; UNESCO World Heritage Centre.')).toBeInTheDocument();
    expect(within(sources).getByText('[1] Quần thể di tích Cố đô Huế')).toBeInTheDocument();
    expect(within(sources).getByText('Cơ quan phát hành: Cục Di sản văn hóa')).toBeInTheDocument();
    expect(within(sources).getAllByText('Truy cập: 26/09/2026')).toHaveLength(2);
    const link = within(sources).getByRole('link', { name: 'https://dsvh.gov.vn/quan-the-di-tich-co-do-hue-475' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(within(sources).getAllByRole('link')).toHaveLength(1);
  });

  it('nội dung là chữ thuần: thẻ HTML trong nội dung không được chèn vào trang', async () => {
    detailApi(detailOf({ content: '## Giới thiệu\n<img src=x onerror="window.hacked=1"> và <b>đậm</b>' }));
    renderApp(`/di-san/${HUE.slug}`);

    expect(await screen.findByText('<img src=x onerror="window.hacked=1"> và <b>đậm</b>')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('main b')).toBeNull();
  });

  it('chữ đậm **…** trong nội dung hiện là chữ đậm, không lộ dấu **', async () => {
    detailApi(detailOf({ content: '## Lịch sử\n**Năm 1805.** Kinh thành khởi công.' }));
    renderApp(`/di-san/${HUE.slug}`);

    const bold = await screen.findByText('Năm 1805.');
    expect(bold.tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('nội dung trống thì hiện mô tả ngắn', async () => {
    detailApi(detailOf({ content: null }));
    renderApp(`/di-san/${HUE.slug}`);
    expect(await screen.findByRole('heading', { level: 2, name: 'Giới thiệu' })).toBeInTheDocument();
    expect(screen.getByText('Hệ thống thành quách, cung điện và lăng tẩm của kinh đô triều Nguyễn.')).toBeInTheDocument();
  });

  it('di sản nháp, đã ẩn hoặc không có → báo không tìm thấy kèm lối về tìm kiếm', async () => {
    mockApi(() => heritageNotFound());
    renderApp('/di-san/khong-co');

    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy di sản này' })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Tìm kiếm di sản' })).toHaveAttribute('href', '/di-san');
  });

  it('lỗi máy chủ báo kèm nút thử lại', async () => {
    let fail = true;
    mockApi((call) =>
      call.path.split('?')[0] === `/public/heritages/${HUE.slug}`
        ? fail
          ? envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ quản trị viên.' })
          : envelope(200, { data: detailOf() })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    const alert = await screen.findByRole('alert', undefined, { timeout: 4000 });
    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Quần thể di tích Cố đô Huế' })).toBeInTheDocument();
  }, 10_000);
});
