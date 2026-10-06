import { formatDateTime } from '@dsvhvn/dung-chung';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { cellOf, generatedOverview, overviewOf } from '../../test/translationFixtures';
import { envelope, heritageDetailOf, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Tab Bản dịch và tóm tắt của Biên tập di sản: bảng năm ngôn ngữ × hai đơn vị duyệt, dải nhắc cần dịch lại, "Dịch và tóm tắt bằng AI".

const PATH = '/quan-tri/di-san/1?tab=ban-dich';

function api(state: { overview: ReturnType<typeof overviewOf>; detail?: ReturnType<typeof heritageDetailOf> }, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/provinces') return envelope(200, { data: [] });
      if (call.path === '/admin/heritages/1' && call.method === 'GET') return envelope(200, { data: state.detail ?? heritageDetailOf({ status: 'PUBLISHED', translationState: 'NONE' }) });
      if (call.path === '/admin/heritages/1/translations' && call.method === 'GET') return envelope(200, { data: state.overview });
      if (call.path.startsWith('/admin/heritages?')) return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      return undefined;
    },
  );
}

describe('Biên tập di sản — tab Bản dịch và tóm tắt', () => {
  it('có tab thứ năm; mở bằng ?tab=ban-dich hiện bảng năm ngôn ngữ, tiếng Việt là bản gốc và chỉ có tóm tắt', async () => {
    signInAs('ADMIN');
    api({ overview: overviewOf() });
    renderApp(PATH);

    expect(await screen.findByRole('tab', { name: 'Bản dịch và tóm tắt', selected: true })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Bản dịch và tóm tắt theo ngôn ngữ' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(6);
    expect(within(rows[1]!).getByText('Tiếng Việt')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Bản gốc')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Bản gốc tiếng Việt, không cần dịch')).toBeInTheDocument();
    for (const name of ['English', '한국어', '简体中文', '日本語']) expect(within(table).getByText(name)).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Chưa dịch')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Chưa tạo tóm tắt')).toBeInTheDocument();
  });

  it('di sản đã xuất bản mà chưa có bản dịch: nhắc ở mọi tab và trong tab', async () => {
    signInAs('ADMIN');
    api({ overview: overviewOf() });
    const { router } = renderApp('/quan-tri/di-san/1');

    expect(await screen.findByText(/Di sản đã xuất bản nhưng chưa có bản dịch/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mở tab Bản dịch và tóm tắt' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=ban-dich'));
    expect(await screen.findByRole('table', { name: 'Bản dịch và tóm tắt theo ngôn ngữ' })).toBeInTheDocument();
  });

  it('trạng thái từng ô: chờ duyệt có liên kết Duyệt, đã duyệt kèm người duyệt, bản dịch máy kèm nhãn, cần dịch lại giữ bản cũ', async () => {
    signInAs('ADMIN');
    const overview = generatedOverview({
      outdatedCount: 2,
      outdatedNotice: 'Nội dung tiếng Việt đã được sửa sau khi dịch. 2 bản dịch và tóm tắt cần dịch lại; các bản cũ vẫn hiện cho khách.',
      translations: [
        cellOf('TRANSLATION', 'en', 'PENDING'),
        cellOf('TRANSLATION', 'ko', 'MACHINE', { isOutdated: true }),
        cellOf('TRANSLATION', 'zh-Hans', 'MACHINE'),
        cellOf('TRANSLATION', 'ja', 'MACHINE'),
      ],
      summaries: [
        cellOf('SUMMARY', 'vi', 'REJECTED'),
        cellOf('SUMMARY', 'en', 'APPROVED'),
        cellOf('SUMMARY', 'ko', 'MACHINE', { isOutdated: true }),
        cellOf('SUMMARY', 'zh-Hans', null),
        cellOf('SUMMARY', 'ja', 'MACHINE'),
      ],
    });
    api({ overview, detail: heritageDetailOf({ status: 'PUBLISHED', translationState: 'OUTDATED' }) });
    renderApp(PATH);

    expect(await screen.findByText(/2 bản dịch và tóm tắt cần dịch lại/)).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Bản dịch và tóm tắt theo ngôn ngữ' });
    const [, vi, en, ko, zh, ja] = within(table).getAllByRole('row');
    expect(within(vi!).getByText('Bị từ chối')).toBeInTheDocument();
    expect(within(en!).getByRole('link', { name: 'Duyệt' })).toHaveAttribute('href', '/quan-tri/ban-dich?tab=cho-duyet&muc=1.ban-dich.en');
    expect(within(en!).getByText(`Duyệt bởi Lê Thu Hà, ${formatDateTime('2026-10-02T03:00:00Z')}`)).toBeInTheDocument();
    expect(within(en!).getByRole('link', { name: /Xem và sửa/ })).toHaveAttribute('href', '/quan-tri/ban-dich?tab=da-duyet&muc=1.tom-tat.en');
    expect(within(ko!).getAllByText('Cần dịch lại')).toHaveLength(2);
    expect(within(ko!).getAllByText(/Bản cũ vẫn hiện cho khách/).length).toBeGreaterThan(0);
    expect(within(zh!).getByText('Chưa có')).toBeInTheDocument();
    expect(within(ja!).getAllByText('Hiện ngay kèm nhãn bản dịch máy')).toHaveLength(2);
  });

  it('"Dịch và tóm tắt bằng AI": trạng thái đang xử lý, gửi yêu cầu, hiện bảng mới và thông báo thành công', async () => {
    signInAs('ADMIN');
    const state = { overview: overviewOf() };
    let release: (() => void) | undefined;
    const calls = api(state, (call) => {
      if (call.path === '/admin/heritages/1/translations/generate' && call.method === 'POST') {
        return new Promise<Response>((resolve) => {
          release = () => {
            state.overview = generatedOverview();
            resolve(envelope(200, { data: state.overview, message: 'Đã dịch và tóm tắt di sản. Bản tiếng Việt và tiếng Anh đang chờ duyệt.' }));
          };
        }) as unknown as Response;
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(PATH);

    await user.click(await screen.findByRole('button', { name: 'Dịch và tóm tắt bằng AI' }));
    expect(await screen.findByText(/AI đang xử lý, vui lòng đợi trong giây lát/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dịch và tóm tắt bằng AI' })).toBeDisabled();
    await waitFor(() => expect(release).toBeDefined());
    release!();

    expect(await screen.findByText('Đã dịch và tóm tắt di sản. Bản tiếng Việt và tiếng Anh đang chờ duyệt.')).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/admin/heritages/1/translations/generate')).toHaveLength(1);
    const table = screen.getByRole('table', { name: 'Bản dịch và tóm tắt theo ngôn ngữ' });
    expect(within(within(table).getAllByRole('row')[2]!).getAllByText('Chờ duyệt').length).toBe(2);
    expect(screen.queryByText(/AI đang xử lý/)).not.toBeInTheDocument();
  });

  it('Dịch vụ AI lỗi (503): báo lỗi, bản cũ giữ nguyên, có nút Thử lại', async () => {
    signInAs('ADMIN');
    const overview = generatedOverview();
    const calls = api({ overview }, (call) =>
      call.path === '/admin/heritages/1/translations/generate'
        ? envelope(503, { errorCode: 'AI_UNAVAILABLE', message: 'Dịch vụ AI đang bận. Bản dịch và tóm tắt hiện có được giữ nguyên và lần này không tính lượt AI của trường. Bạn có thể thử lại sau.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp(PATH);

    await user.click(await screen.findByRole('button', { name: 'Dịch và tóm tắt bằng AI' }));
    expect((await screen.findAllByText(/Dịch vụ AI đang bận/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Bản dịch và tóm tắt theo ngôn ngữ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/heritages/1/translations/generate')).toHaveLength(2));
  });

  it('chưa có nội dung tiếng Việt hoặc đang ẩn: nút khóa kèm lý do', async () => {
    signInAs('ADMIN');
    api({ overview: overviewOf({ canGenerate: false, cannotGenerateReason: 'Di sản chưa có nội dung tiếng Việt để dịch.' }) });
    renderApp(PATH);

    expect(await screen.findByRole('button', { name: 'Dịch và tóm tắt bằng AI' })).toBeDisabled();
    expect(screen.getByText('Di sản chưa có nội dung tiếng Việt để dịch.')).toBeInTheDocument();
  });

  it('đang có lần dịch khác chạy (409): báo đúng câu của máy chủ', async () => {
    signInAs('ADMIN');
    api({ overview: overviewOf() }, (call) =>
      call.path === '/admin/heritages/1/translations/generate'
        ? envelope(409, { errorCode: 'TRANSLATION_BUSY', message: 'Di sản này đang được dịch và tóm tắt. Vui lòng chờ lần chạy hiện tại xong rồi thử lại.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp(PATH);

    await user.click(await screen.findByRole('button', { name: 'Dịch và tóm tắt bằng AI' }));
    expect((await screen.findAllByText('Di sản này đang được dịch và tóm tắt. Vui lòng chờ lần chạy hiện tại xong rồi thử lại.')).length).toBeGreaterThan(0);
  });
});
