import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, heritageSummaryOf, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { generatedOverview, queueItemOf, queuePage, reviewResultOf, summaryDetailOf, translationDetailOf } from '../../test/translationFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Duyệt bản dịch và tóm tắt: hàng chờ theo tab, bộ lọc trên URL, khung hai cột (bản gốc tiếng Việt | bản đang duyệt), sửa tại chỗ, duyệt, từ chối kèm lý do.

const COUNTS = { pending: 12, approved: 3, machine: 6, outdated: 1 };

interface State {
  queue: ReturnType<typeof queuePage>;
}

function api(state: State, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      const path = call.path.split('?')[0];
      if (path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (path === '/admin/translations/counts') return envelope(200, { data: COUNTS });
      if (path === '/admin/translations') return envelope(200, { data: state.queue });
      if (path === '/admin/heritages')
        return envelope(200, {
          data: { items: [heritageSummaryOf(1, { name: 'Quần thể di tích Cố đô Huế' }), heritageSummaryOf(2, { name: 'Vịnh Hạ Long' })], page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
        });
      if (path === '/admin/heritages/1/translations/en/translation') return envelope(200, { data: translationDetailOf() });
      if (path === '/admin/heritages/1/translations/en/summary') return envelope(200, { data: summaryDetailOf() });
      return undefined;
    },
  );
}

const queueCalls = (calls: FetchCall[]) => calls.filter((c) => c.path.split('?')[0] === '/admin/translations');
const paramsOf = (call: FetchCall) => Object.fromEntries(new URL(`http://x${call.path}`).searchParams);

describe('Duyệt bản dịch và tóm tắt — hàng chờ', () => {
  it('có mục Bản dịch ở thanh bên; tab Chờ duyệt có số đếm, bảng có di sản, loại kèm phần nội dung, ngôn ngữ, ngày yêu cầu, trạng thái', async () => {
    signInAs('ADMIN');
    api({
      queue: queuePage([queueItemOf('TRANSLATION', 'en'), queueItemOf('SUMMARY', 'en'), queueItemOf('SUMMARY', 'vi', { heritageId: 2, heritageName: 'Vịnh Hạ Long' })]),
    });
    renderApp('/quan-tri/ban-dich');

    expect(await screen.findByRole('heading', { level: 1, name: 'Duyệt bản dịch và tóm tắt' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Bản dịch' })[0]).toHaveAttribute('href', '/quan-tri/ban-dich');
    expect(await screen.findByRole('tab', { name: 'Chờ duyệt (12)', selected: true })).toBeInTheDocument();
    for (const name of ['Đã duyệt', 'Bản dịch máy', 'Bị từ chối']) expect(screen.getByRole('tab', { name })).toBeInTheDocument();

    const table = await screen.findByRole('table', { name: 'Danh sách chờ duyệt' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByText('Mô tả ngắn, nội dung, giai đoạn, sự kiện, chú thích ảnh')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Bản ngắn và bản chi tiết')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Tiếng Việt')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Chờ duyệt')).toBeInTheDocument();
  });

  it('đổi tab và bộ lọc thì gửi đúng tham số lên máy chủ và ghi lên URL', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/ban-dich');

    await screen.findByRole('table', { name: 'Danh sách chờ duyệt' });
    expect(paramsOf(queueCalls(calls)[0]!)).toMatchObject({ tab: 'PENDING', page: '1', pageSize: '20' });

    await user.selectOptions(screen.getByLabelText('Di sản'), '2');
    await user.selectOptions(screen.getByLabelText('Ngôn ngữ'), 'zh-Hans');
    await user.selectOptions(screen.getByLabelText('Loại'), 'tom-tat');
    await waitFor(() => expect(router.state.location.search).toBe('?di-san=2&ngon-ngu=zh-Hans&loai=tom-tat'));
    await waitFor(() => expect(paramsOf(queueCalls(calls).at(-1)!)).toMatchObject({ heritageId: '2', language: 'zh-Hans', kind: 'SUMMARY', tab: 'PENDING' }));

    await user.click(screen.getByRole('tab', { name: 'Bản dịch máy' }));
    await waitFor(() => expect(router.state.location.search).toContain('tab=ban-dich-may'));
    await waitFor(() => expect(paramsOf(queueCalls(calls).at(-1)!).tab).toBe('MACHINE'));
  });

  it('không có mục nào thì báo rõ; có bộ lọc thì có nút Bỏ bộ lọc', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([]) });
    renderApp('/quan-tri/ban-dich?di-san=2');

    expect(await screen.findByText('Không có mục nào khớp bộ lọc.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bỏ bộ lọc' })).toBeInTheDocument();
  });

  it('quản trị trường và giáo viên không mở được màn hình này', async () => {
    signInAs('TEACHER');
    mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
    renderApp('/quan-tri/ban-dich');

    expect(await screen.findByRole('heading', { level: 1, name: /không có quyền|403/i })).toBeInTheDocument();
  });
});

describe('Duyệt bản dịch và tóm tắt — khung hai cột', () => {
  it('mở một bản dịch: bản gốc tiếng Việt chỉ đọc bên trái, bản chờ duyệt tiếng Anh sửa được bên phải, mọi phần chữ', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/ban-dich');

    await user.click(await screen.findByRole('button', { name: 'Quần thể di tích Cố đô Huế' }));
    await waitFor(() => expect(router.state.location.search).toBe('?muc=1.ban-dich.en'));

    const panel = await screen.findByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    expect(await within(panel).findByRole('heading', { level: 3, name: /Bản gốc tiếng Việt/ })).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { level: 3, name: /Bản chờ duyệt — English/ })).toBeInTheDocument();
    expect(within(panel).getByText('Sửa được tại chỗ')).toBeInTheDocument();
    expect(within(panel).getByText('Hệ thống thành quách, cung điện và lăng tẩm của kinh đô triều Nguyễn.')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Mô tả ngắn')).toHaveValue('The citadels, palaces and tombs of the Nguyen capital.');
    expect(within(panel).getByLabelText('Tên giai đoạn 1')).toHaveValue('Nguyen capital');
    expect(within(panel).getByLabelText('Tên sự kiện 1')).toHaveValue('Citadel built');
    expect(within(panel).getByLabelText('Chú thích ảnh 1')).toHaveValue('Meridian Gate');
    expect(within(panel).getByText('Duyệt bản tiếng Anh thì hệ thống dịch lại bản Hàn, Trung, Nhật từ bản đã duyệt.')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Mở di sản' })).toHaveAttribute('href', '/quan-tri/di-san/1');
    expect(within(panel).getByRole('button', { name: 'Duyệt' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Duyệt cả bản dịch và tóm tắt của ngôn ngữ này' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Từ chối' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Lưu chỉnh sửa' })).not.toBeInTheDocument();
  });

  it('sửa tại chỗ: chỉ gửi ô đã đổi; lưu xong bản vẫn chờ duyệt', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.method === 'PUT' && call.path === '/admin/heritages/1/translations/en/translation'
        ? envelope(200, { data: translationDetailOf({ translated: { ...translationDetailOf().translated, name: 'Hue Monuments' } }), message: 'Lưu bản dịch thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    const panel = await screen.findByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    const name = await within(panel).findByLabelText('Tên');
    await user.clear(name);
    await user.type(name, 'Hue Monuments');
    await user.click(within(panel).getByRole('button', { name: 'Lưu chỉnh sửa' }));

    expect(await screen.findByText('Lưu bản dịch thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ name: 'Hue Monuments' });
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' })).queryByRole('button', { name: 'Lưu chỉnh sửa' })).not.toBeInTheDocument());
  });

  it('"Duyệt" gửi đúng phạm vi bản dịch; thành công thì báo, đóng khung và làm mới hàng chờ', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.method === 'POST' && call.path === '/admin/heritages/1/translations/en/approve'
        ? envelope(200, { data: reviewResultOf(generatedOverview(), { machineTranslationsRefreshed: true }), message: 'Đã duyệt bản dịch tiếng Anh. Nội dung này đã hiện cho khách.' })
        : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    await user.click(await screen.findByRole('button', { name: 'Duyệt' }));

    expect(await screen.findByText('Đã duyệt bản dịch tiếng Anh. Nội dung này đã hiện cho khách.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/approve'))?.body).toEqual({ kind: 'TRANSLATION' });
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' })).not.toBeInTheDocument());
    await waitFor(() => expect(queueCalls(calls).length).toBeGreaterThan(1));
  });

  it('"Duyệt cả bản dịch và tóm tắt của ngôn ngữ này" gửi phạm vi BOTH; cảnh báo dịch lại bản máy được hiện', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.path.endsWith('/approve')
        ? envelope(200, { data: reviewResultOf(generatedOverview(), { warning: 'Đã duyệt bản tiếng Anh nhưng chưa dịch lại được bản tiếng Hàn, Trung, Nhật.' }), message: 'Đã duyệt bản dịch và tóm tắt tiếng Anh.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    await user.click(await screen.findByRole('button', { name: 'Duyệt cả bản dịch và tóm tắt của ngôn ngữ này' }));

    expect(await screen.findByText('Đã duyệt bản dịch và tóm tắt tiếng Anh.')).toBeInTheDocument();
    expect(await screen.findByText('Đã duyệt bản tiếng Anh nhưng chưa dịch lại được bản tiếng Hàn, Trung, Nhật.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/approve'))?.body).toEqual({ kind: 'BOTH' });
  });

  it('đang có chỉnh sửa chưa lưu thì "Duyệt" lưu trước rồi mới duyệt', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) => {
      if (call.method === 'PUT') return envelope(200, { data: translationDetailOf(), message: 'Lưu bản dịch thành công.' });
      if (call.path.endsWith('/approve')) return envelope(200, { data: reviewResultOf(), message: 'Đã duyệt.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    const shortDescription = await screen.findByLabelText('Mô tả ngắn');
    await user.type(shortDescription, ' (đã sửa)');
    await user.click(screen.getByRole('button', { name: 'Duyệt' }));

    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/approve'))).toBe(true));
    const order = calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path.split('/').at(-1)}`);
    expect(order).toEqual(['PUT translation', 'POST approve']);
  });

  it('"Từ chối": hộp thoại có ô lý do (không bắt buộc, tối đa 500 ký tự); gửi kèm lý do, bản ngừng hiện', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.path.endsWith('/reject')
        ? envelope(200, { data: reviewResultOf(), message: 'Đã từ chối bản dịch tiếng Anh. Nội dung này không hiện cho khách.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
    const dialog = await screen.findByRole('dialog', { name: 'Từ chối và yêu cầu dịch lại' });
    expect(within(dialog).getByText('Lý do chỉ lưu ở nhật ký thao tác, không hiện cho khách.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Lý do (không bắt buộc)'), 'Tên giai đoạn dịch sai');
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));

    expect(await screen.findByText('Đã từ chối bản dịch tiếng Anh. Nội dung này không hiện cho khách.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/reject'))?.body).toEqual({ kind: 'TRANSLATION', reason: 'Tên giai đoạn dịch sai' });
  });

  it('từ chối không điền lý do thì gửi reason null; lý do quá 500 ký tự bị chặn', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.path.endsWith('/reject') ? envelope(200, { data: reviewResultOf(), message: 'Đã từ chối.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Lý do (không bắt buộc)'));
    await user.paste('x'.repeat(501));
    expect(within(dialog).getByText('Lý do tối đa 500 ký tự.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Từ chối' })).toBeDisabled();
    await user.clear(within(dialog).getByLabelText('Lý do (không bắt buộc)'));
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));

    await waitFor(() => expect(calls.find((c) => c.path.endsWith('/reject'))?.body).toEqual({ kind: 'TRANSLATION', reason: null }));
  });

  it('lỗi máy chủ khi duyệt (422) báo đúng câu và giữ nguyên khung', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.path.endsWith('/approve') ? envelope(422, { errorCode: 'BLOCKED', message: 'Không thể duyệt. Không có bản nào đang chờ duyệt ở ngôn ngữ này.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    await user.click(await screen.findByRole('button', { name: 'Duyệt' }));
    expect(await screen.findByText('Không thể duyệt. Không có bản nào đang chờ duyệt ở ngôn ngữ này.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' })).toBeInTheDocument();
  });

  it('tóm tắt: bên trái tóm tắt tiếng Việt, bên phải bản ngắn và bản chi tiết sửa được; lưu gửi cả hai phần', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('SUMMARY', 'en')]) }, (call) =>
      call.method === 'PUT' && call.path === '/admin/heritages/1/translations/en/summary'
        ? envelope(200, { data: summaryDetailOf(), message: 'Lưu tóm tắt thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.tom-tat.en');

    const panel = await screen.findByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    expect(await within(panel).findByRole('heading', { level: 3, name: /Tóm tắt tiếng Việt/ })).toBeInTheDocument();
    expect(within(panel).getByText('Tóm tắt ngắn tiếng Việt.')).toBeInTheDocument();
    const shortText = within(panel).getByLabelText('Bản ngắn (để nghe)');
    expect(shortText).toHaveValue('Short English summary.');
    expect(within(panel).queryByRole('button', { name: 'Duyệt cả bản dịch và tóm tắt của ngôn ngữ này' })).toBeInTheDocument();
    await user.type(shortText, ' Edited.');
    await user.click(within(panel).getByRole('button', { name: 'Lưu chỉnh sửa' }));

    expect(await screen.findByText('Lưu tóm tắt thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ shortText: 'Short English summary. Edited.', detailedText: 'Detailed English summary.' });
  });

  it('tóm tắt tiếng Việt: nguồn bên trái là chữ tiếng Việt của di sản; không có nút duyệt cả hai', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([queueItemOf('SUMMARY', 'vi')]) }, (call) =>
      call.path === '/admin/heritages/1/translations/vi/summary'
        ? envelope(200, { data: summaryDetailOf({ language: 'vi', languageLabel: 'Tiếng Việt', viSummary: null, summary: { shortText: 'Bản ngắn.', detailedText: 'Bản chi tiết.' } }) })
        : undefined,
    );
    renderApp('/quan-tri/ban-dich?muc=1.tom-tat.vi');

    const panel = await screen.findByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    expect(await within(panel).findByRole('heading', { level: 3, name: /Nội dung tiếng Việt của di sản/ })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Duyệt cả bản dịch và tóm tắt của ngôn ngữ này' })).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Duyệt' })).toBeInTheDocument();
  });

  it('bản dịch máy (tiếng Hàn): chỉ xem, không sửa, không duyệt, giải thích không có bước duyệt', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([queueItemOf('TRANSLATION', 'ko', { status: 'MACHINE' })]) }, (call) =>
      call.path === '/admin/heritages/1/translations/ko/translation'
        ? envelope(200, { data: translationDetailOf({ language: 'ko', languageLabel: '한국어', status: 'MACHINE', translated: { ...translationDetailOf().translated, name: '후에 고도' } }) })
        : undefined,
    );
    renderApp('/quan-tri/ban-dich?tab=ban-dich-may&muc=1.ban-dich.ko');

    const panel = await screen.findByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    expect(await within(panel).findByText('후에 고도')).toBeInTheDocument();
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument();
    expect(within(panel).getByText(/không có bước duyệt/)).toBeInTheDocument();
  });

  it('tab Đã duyệt: nói rõ sửa bản đã duyệt thì quay về Chờ duyệt; có thể từ chối để gỡ bản đã hiện', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([queueItemOf('TRANSLATION', 'en', { status: 'APPROVED' })]) }, (call) =>
      call.path === '/admin/heritages/1/translations/en/translation'
        ? envelope(200, { data: translationDetailOf({ status: 'APPROVED', reviewedByName: 'Lê Thu Hà', reviewedAt: '2026-10-02T03:00:00Z' }) })
        : undefined,
    );
    renderApp('/quan-tri/ban-dich?tab=da-duyet&muc=1.ban-dich.en');

    const panel = await screen.findByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    expect(await within(panel).findByText(/Sửa bản đã duyệt thì bản đó quay về tab Chờ duyệt/)).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Từ chối' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
  });

  it('mục đang mở không tồn tại thì báo lỗi kèm Thử lại; địa chỉ mục sai bị bỏ qua', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([]) }, (call) => (call.path.includes('/translations/en/translation') ? envelope(404, { errorCode: 'BLOCKED', message: 'Không thể xem bản dịch. Không tìm thấy di sản.' }) : undefined));
    const { unmount } = renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');
    expect(await screen.findByText('Không thể xem bản dịch. Không tìm thấy di sản.')).toBeInTheDocument();
    unmount();

    renderApp('/quan-tri/ban-dich?muc=abc.ban-dich.xx');
    await screen.findByRole('heading', { level: 1, name: 'Duyệt bản dịch và tóm tắt' });
    expect(screen.queryByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' })).not.toBeInTheDocument();
  });

  it('ô bản dịch bị trống thì khóa nút Duyệt và báo rõ trường chưa dịch', async () => {
    signInAs('ADMIN');
    api({ queue: queuePage([queueItemOf('TRANSLATION', 'en')]) }, (call) =>
      call.path === '/admin/heritages/1/translations/en/translation'
        ? envelope(200, {
            data: translationDetailOf({
              translated: {
                ...translationDetailOf().translated,
                timelines: [{ id: 11, name: '', description: '' }],
              },
            }),
          })
        : undefined,
    );
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    const approveBtn = await screen.findByRole('button', { name: 'Duyệt' });
    expect(approveBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Duyệt cả bản dịch và tóm tắt của ngôn ngữ này' })).toBeDisabled();
    expect(screen.getByText('Tên giai đoạn 1 chưa được dịch.')).toBeInTheDocument();
  });

  it('di sản ở trạng thái Cần dịch lại thì khóa Duyệt, có nút "Dịch lại bằng AI" tại chỗ', async () => {
    signInAs('ADMIN');
    const calls = api({ queue: queuePage([queueItemOf('TRANSLATION', 'en', { isOutdated: true })]) }, (call) => {
      if (call.path === '/admin/heritages/1/translations/en/translation') {
        return envelope(200, { data: translationDetailOf({ isOutdated: true }) });
      }
      if (call.path === '/admin/heritages/1/translations/generate') {
        return envelope(200, { data: generatedOverview(), message: 'Đã dịch và tóm tắt di sản.' });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/ban-dich?muc=1.ban-dich.en');

    const approveBtn = await screen.findByRole('button', { name: 'Duyệt' });
    expect(approveBtn).toBeDisabled();
    expect(screen.getByText(/Di sản đang ở trạng thái Cần dịch lại/)).toBeInTheDocument();

    const regenButtons = screen.getAllByRole('button', { name: 'Dịch lại bằng AI' });
    expect(regenButtons.length).toBeGreaterThan(0);
    await user.click(regenButtons[0]!);
    expect(calls.some((c) => c.path === '/admin/heritages/1/translations/generate')).toBe(true);
    expect(await screen.findByText('Đã dịch và tóm tắt di sản.')).toBeInTheDocument();
  });
});
