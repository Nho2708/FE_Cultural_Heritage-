import { ERROR_CODES, type AdminCurriculumTopicHeritage, type HeritageSummary } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { adminTopicHeritageOf, adminTopicOf } from '../../test/curriculumFixtures';
import { envelope, heritageSummaryOf, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Trang con Di sản của chủ đề chương trình: danh sách hiện có, tìm thêm, bỏ, lưu thay toàn bộ, rời trang khi chưa lưu.

const TOPIC = adminTopicOf(9, { title: 'Thăng Long - Hà Nội' });
const CURRENT: AdminCurriculumTopicHeritage[] = [
  adminTopicHeritageOf(21, { name: 'Hoàng thành Thăng Long' }),
  adminTopicHeritageOf(22, { name: 'Văn Miếu - Quốc Tử Giám', status: 'DRAFT' }),
];
const FOUND: HeritageSummary[] = [
  heritageSummaryOf(21, { name: 'Hoàng thành Thăng Long', provinceName: 'Thành phố Hà Nội', status: 'PUBLISHED' }),
  heritageSummaryOf(40, { name: 'Chùa Một Cột', provinceName: 'Thành phố Hà Nội', status: 'PUBLISHED' }),
  heritageSummaryOf(41, { name: 'Đền Ngọc Sơn', provinceName: 'Thành phố Hà Nội', status: 'ARCHIVED' }),
];

/** `state.items` là danh sách hiện tại của chủ đề trên máy chủ: GET trả về nó, PUT ghi đè bằng danh sách gửi lên. */
function api(extra?: (call: FetchCall) => Response | undefined, state = { items: CURRENT }) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/curriculum-topics/9/heritages' && call.method === 'GET') return envelope(200, { data: { topic: TOPIC, items: state.items } });
      if (call.path.startsWith('/admin/heritages?')) return envelope(200, { data: { items: FOUND, page: 1, pageSize: 8, totalItems: 3, totalPages: 1 } });
      return undefined;
    },
  );
}

const PAGE = '/quan-tri/chu-de-chuong-trinh/9/di-san';

describe('Di sản của chủ đề chương trình', () => {
  it('hiện thông tin chủ đề và danh sách di sản hiện có (kể cả nháp); chưa đổi gì thì không lưu được', async () => {
    signInAs('ADMIN');
    api();
    renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'Thăng Long - Hà Nội' })).toBeInTheDocument();
    expect(screen.getByText(/Khối 4 · Lịch sử và Địa lí · Đồng bằng Bắc Bộ/)).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Di sản của chủ đề' });
    expect(within(within(table).getByRole('row', { name: /Hoàng thành Thăng Long/ })).getByText('Đã xuất bản')).toBeInTheDocument();
    expect(within(within(table).getByRole('row', { name: /Văn Miếu/ })).getByText('Nháp')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu danh sách' })).toBeDisabled();
    expect(screen.getByRole('link', { name: '← Chủ đề chương trình' })).toHaveAttribute('href', '/quan-tri/chu-de-chuong-trinh');
  });

  it('tìm thêm: cần ít nhất 2 ký tự; di sản đã có hiện "Đã thêm" và không thêm lại; thêm rồi Lưu gửi toàn bộ danh sách', async () => {
    signInAs('ADMIN');
    const server = { items: CURRENT };
    const calls = api((call) => {
      if (call.method !== 'PUT' || call.path !== '/admin/curriculum-topics/9/heritages') return undefined;
      server.items = [...CURRENT, adminTopicHeritageOf(40, { name: 'Chùa Một Cột' })];
      return envelope(200, { data: { topic: { ...TOPIC, heritageCount: 3 }, items: server.items }, message: 'Đã lưu danh sách di sản của chủ đề.' });
    }, server);
    const user = userEvent.setup();
    renderApp(PAGE);

    await screen.findByRole('table', { name: 'Di sản của chủ đề' });
    expect(screen.getByText(/Tìm theo tên di sản trong kho/)).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm di sản theo tên' }), 'hà nội{Enter}');

    const results = await screen.findByRole('list', { name: 'Kết quả tìm di sản' });
    expect(calls.filter((c) => c.path.startsWith('/admin/heritages?')).at(-1)?.path).toContain('keyword=h%C3%A0+n%E1%BB%99i');
    expect(within(results).getByRole('button', { name: '"Hoàng thành Thăng Long" đã có trong chủ đề' })).toBeDisabled();
    expect(within(results).getByText('Đã ẩn')).toBeInTheDocument();
    await user.click(within(results).getByRole('button', { name: 'Thêm "Chùa Một Cột" vào chủ đề' }));

    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (3)' })).toBeInTheDocument();
    expect(within(results).getByRole('button', { name: '"Chùa Một Cột" đã có trong chủ đề' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Lưu danh sách' }));

    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ heritageIds: [21, 22, 40] }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu danh sách' })).toBeDisabled());
    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (3)' })).toBeInTheDocument();
  });

  it('bỏ di sản rồi Hủy thay đổi trả về danh sách của máy chủ; bỏ hết rồi Lưu gửi danh sách rỗng', async () => {
    signInAs('ADMIN');
    const calls = api((call) =>
      call.method === 'PUT' ? envelope(200, { data: { topic: TOPIC, items: [] }, message: 'Đã lưu danh sách di sản của chủ đề.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp(PAGE);

    await screen.findByRole('table', { name: 'Di sản của chủ đề' });
    await user.click(screen.getByRole('button', { name: 'Bỏ "Văn Miếu - Quốc Tử Giám" khỏi chủ đề' }));
    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hủy thay đổi' }));
    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (2)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bỏ "Hoàng thành Thăng Long" khỏi chủ đề' }));
    await user.click(screen.getByRole('button', { name: 'Bỏ "Văn Miếu - Quốc Tử Giám" khỏi chủ đề' }));
    expect(await screen.findByText('Chủ đề chưa có di sản nào.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu danh sách' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ heritageIds: [] }));
  });

  it('lưu lỗi: câu của máy chủ hiện trên trang và các thay đổi vẫn còn', async () => {
    signInAs('ADMIN');
    const reason = 'Không thể lưu. Danh sách di sản của chủ đề không được trùng nhau.';
    api((call) => (call.method === 'PUT' ? envelope(400, { errorCode: ERROR_CODES.invalid, message: reason }) : undefined));
    const user = userEvent.setup();
    renderApp(PAGE);

    await screen.findByRole('table', { name: 'Di sản của chủ đề' });
    await user.click(screen.getByRole('button', { name: 'Bỏ "Văn Miếu - Quốc Tử Giám" khỏi chủ đề' }));
    await user.click(screen.getByRole('button', { name: 'Lưu danh sách' }));

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (1)' })).toBeInTheDocument();
  });

  it('rời trang khi còn thay đổi chưa lưu thì hỏi lại; ở lại thì giữ thay đổi', async () => {
    signInAs('ADMIN');
    api();
    const user = userEvent.setup();
    const { router } = renderApp(PAGE);

    await screen.findByRole('table', { name: 'Di sản của chủ đề' });
    await user.click(screen.getByRole('button', { name: 'Bỏ "Văn Miếu - Quốc Tử Giám" khỏi chủ đề' }));
    await user.click(screen.getByRole('link', { name: '← Chủ đề chương trình' }));

    const confirm = await screen.findByRole('dialog', { name: 'Rời khỏi trang này?' });
    expect(router.state.location.pathname).toBe(PAGE);
    await user.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('heading', { name: 'Di sản của chủ đề (1)' })).toBeInTheDocument();
  });

  it('chủ đề không có: báo không tìm thấy', async () => {
    signInAs('ADMIN');
    api((call) =>
      call.path === '/admin/curriculum-topics/9/heritages' ? envelope(404, { errorCode: ERROR_CODES.notFound, message: 'Không tìm thấy chủ đề.' }) : undefined,
    );
    renderApp(PAGE);
    expect(await screen.findByText('Không tìm thấy chủ đề.')).toBeInTheDocument();
  });
});
