import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Trang Giới thiệu (5 ngôn ngữ) và trang Dành cho nhà trường (chỉ tiếng Việt): công khai, không gọi API, liên kết đúng
// trang đã có, biểu tượng chuyển động hoặc tĩnh khi người dùng bật giảm chuyển động, không có khung video khi chưa cấu hình.

function chooseLanguage(code: string) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

/** Giả lập cài đặt "giảm chuyển động" của hệ điều hành. */
function prefersReducedMotion(reduce: boolean) {
  const query = (media: string) => ({
    matches: reduce && media.includes('prefers-reduced-motion'),
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', { value: query, configurable: true, writable: true });
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('trang Giới thiệu', () => {
  it('khách mở được không cần đăng nhập; ba tính năng, ghi chú quảng cáo 24 giờ và bản dịch máy, nguồn thông tin, liên kết sang trang đã có', async () => {
    const calls = mockApi();
    renderApp('/gioi-thieu');

    expect(await screen.findByRole('heading', { level: 1, name: 'Di sản Việt Nam, kể bằng ngôn ngữ của bạn' })).toBeInTheDocument();
    expect(document.title).toBe('Giới thiệu · DiViet');
    expect(screen.getByRole('link', { name: 'Bắt đầu khám phá' })).toHaveAttribute('href', '/di-san');

    const features = screen.getByRole('region', { name: 'Bạn làm được gì với DiViet' });
    expect(within(features).getAllByRole('listitem')).toHaveLength(3);
    expect(within(features).getByRole('heading', { level: 3, name: 'Tìm di sản gần bạn trên bản đồ' })).toBeInTheDocument();
    expect(within(features).getByRole('link', { name: 'Mở bản đồ di sản' })).toHaveAttribute('href', '/ban-do');
    expect(within(features).getByRole('link', { name: 'Xem dòng thời gian' })).toHaveAttribute('href', '/dong-thoi-gian');
    expect(within(features).getByRole('note')).toHaveTextContent(/một quảng cáo ngắn, dùng được trong 24 giờ.*Bản tiếng Hàn, Trung và Nhật là bản dịch máy/);

    expect(screen.getByText(/Thông tin dựa trên dữ liệu của Cục Di sản văn hóa \(dsvh\.gov\.vn\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem trang dành cho nhà trường' })).toHaveAttribute('href', '/nha-truong');

    // Chưa có tệp cài đặt Android và chưa cấu hình video: không có nút tải, không có khung video.
    expect(screen.getByText(/Không cần cài đặt/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tải tệp cài đặt cho Android/ })).not.toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
    expect(calls.every((call) => call.authorization === undefined)).toBe(true);
  });

  it('hiện bằng ngôn ngữ khách đã chọn (tiếng Anh)', async () => {
    chooseLanguage('en');
    mockApi();
    renderApp('/gioi-thieu');

    expect(await screen.findByRole('heading', { level: 1, name: "Viet Nam's heritage, told in your language" })).toBeInTheDocument();
    expect(document.title).toBe('About · DiViet');
    expect(screen.getByRole('link', { name: 'Start exploring' })).toHaveAttribute('href', '/di-san');
    expect(screen.getByText(/unlock with one short ad and stay open for 24 hours/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the page for schools' })).toHaveAttribute('href', '/nha-truong');
  });

  it('biểu tượng chuyển động một lần, là hình trang trí; tên DiViet viết bằng chữ ngay dưới', async () => {
    mockApi();
    renderApp('/gioi-thieu');
    const hero = (await screen.findByRole('heading', { level: 1 })).closest('section');
    if (!hero) throw new Error('Không thấy khối đầu trang');

    expect(within(hero).getByText('DiViet')).toBeInTheDocument();
    expect(within(hero).queryByRole('img')).not.toBeInTheDocument();
    const logo = hero.querySelector('[data-logo-motion]');
    if (!logo) throw new Error('Không thấy biểu tượng chuyển động');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(logo.querySelectorAll('path')).toHaveLength(4);
  });

  it('người dùng bật giảm chuyển động: hiện biểu tượng tĩnh, các khối hiện ngay không chờ cuộn', async () => {
    prefersReducedMotion(true);
    mockApi();
    renderApp('/gioi-thieu');
    const hero = (await screen.findByRole('heading', { level: 1 })).closest('section');
    if (!hero) throw new Error('Không thấy khối đầu trang');

    expect(within(hero).getByText('DiViet')).toBeInTheDocument();
    expect(within(hero).queryByRole('img')).not.toBeInTheDocument();
    expect(hero.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(hero.querySelector('[data-logo-motion]')).toBeNull();
    for (const group of document.querySelectorAll('[data-reveal]')) expect(group).toHaveAttribute('data-reveal', 'static');
  });
});

describe('trang Dành cho nhà trường', () => {
  it('bốn bước của giáo viên, ba cấp học, gói Miễn phí, lối đăng nhập web quản trị; không đăng email hay số điện thoại', async () => {
    mockApi();
    renderApp('/nha-truong');

    expect(await screen.findByRole('heading', { level: 1, name: 'Dạy di sản Việt Nam, soạn nhanh, học theo cấp' })).toBeInTheDocument();
    expect(document.title).toBe('Dành cho nhà trường · DiViet');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    const steps = screen.getByRole('region', { name: 'Bốn bước làm việc của giáo viên' });
    const items = within(steps).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Bước 1: Quản trị trường tạo tài khoản giáo viên');
    expect(items[2]).toHaveTextContent(/Nhờ AI soạn.*ngân hàng câu hỏi 8 dạng/);

    const levels = screen.getByRole('region', { name: 'Ba cấp học, ba cách học' });
    expect(within(levels).getAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByText(/Trường mới bắt đầu với gói Miễn phí/)).toBeInTheDocument();
    expect(screen.getByText(/do quản trị hệ thống DiViet tạo theo đề nghị của nhà trường/)).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: /Đăng nhập web quản trị/ })) expect(link).toHaveAttribute('href', 'http://quantri.test');

    const main = screen.getByRole('main');
    expect(main.textContent).not.toMatch(/@|\b0\d{9}\b/);
    expect(document.querySelector('video')).toBeNull();
  });

  it('khách đang dùng tiếng Anh thấy ghi chú bằng tiếng Anh, nội dung trang giữ tiếng Việt', async () => {
    chooseLanguage('en');
    mockApi();
    renderApp('/nha-truong');

    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent('This page is only available in Vietnamese.');
    expect(note).toHaveAttribute('lang', 'en');
    const heading = screen.getByRole('heading', { level: 1, name: 'Dạy di sản Việt Nam, soạn nhanh, học theo cấp' });
    expect(heading.closest('[lang]')).toHaveAttribute('lang', 'vi');
  });
});

describe('chân trang', () => {
  it('có cột Về DiViet với Giới thiệu, Dành cho nhà trường và Chính sách quyền riêng tư, theo ngôn ngữ đang chọn', async () => {
    chooseLanguage('en');
    mockApi();
    renderApp('/gioi-thieu');

    const column = await screen.findByRole('navigation', { name: 'About DiViet' });
    expect(within(column).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/gioi-thieu');
    expect(within(column).getByRole('link', { name: 'For schools' })).toHaveAttribute('href', '/nha-truong');
    expect(within(column).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/chinh-sach-quyen-rieng-tu');
  });
});
