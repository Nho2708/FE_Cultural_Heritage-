import type { QuestionQualityPage } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { qualityPageOf, qualityRowOf } from '../../test/overviewFixtures';
import { accessOf, questionDetailOf } from '../../test/questionFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Kiểm duyệt ngân hàng câu hỏi của quản trị hệ thống: bảng kèm chất lượng, bộ lọc trên URL, xem chỉ đọc, ẩn và hiện lại câu có lý do.

function api(page: QuestionQualityPage, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/questions/quality')) return envelope(200, { data: page });
      if (call.path.startsWith('/admin/organizations'))
        return envelope(200, { data: { items: [{ id: 5, name: 'THCS Nguyễn Du' }], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } });
      return undefined;
    },
  );
}

const lastList = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/admin/questions/quality')).at(-1)?.path ?? '';

describe('Kiểm duyệt ngân hàng câu hỏi', () => {
  it('bảng hiện lượt trả lời, tỉ lệ đúng và dấu cần xem lại; ba số đếm của cả ngân hàng', async () => {
    signInAs('ADMIN');
    api(
      qualityPageOf([
        qualityRowOf(1),
        qualityRowOf(2, { answered: 12, correct: 2, correctRatePercent: 16.7, lowQuality: true }),
        qualityRowOf(3, { answered: 0, correct: 0, correctRatePercent: null }),
      ]),
    );
    renderApp('/quan-tri/cau-hoi');

    const table = await screen.findByRole('table', { name: 'Câu hỏi cần kiểm duyệt' });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]!).getByText('75%')).toBeInTheDocument();
    expect(within(rows[1]!).queryByText('Cần xem lại')).not.toBeInTheDocument();
    expect(within(rows[2]!).getByText('16,7%')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Cần xem lại')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Chưa có lượt')).toBeInTheDocument();

    const summary = screen.getByRole('region', { name: 'Số đếm của ngân hàng' });
    expect(within(summary).getByRole('button', { name: /Đang trong ngân hàng/ })).toHaveTextContent('1.236');
    expect(within(summary).getByRole('button', { name: /Đã ẩn/ })).toHaveTextContent('4');
    expect(within(summary).getByRole('button', { name: /Cần xem lại/ })).toHaveTextContent('Từ 10 lượt trả lời mà đúng dưới 30%');
  });

  it('bộ lọc gửi đúng tham số lên máy chủ', async () => {
    signInAs('ADMIN');
    const calls = api(qualityPageOf([qualityRowOf(1)]));
    const user = userEvent.setup();
    renderApp('/quan-tri/cau-hoi');

    await screen.findByRole('table', { name: 'Câu hỏi cần kiểm duyệt' });
    await screen.findByRole('option', { name: 'THCS Nguyễn Du' });
    await user.selectOptions(screen.getByLabelText('Trường của người tạo'), '5');
    await user.selectOptions(screen.getByLabelText('Dạng câu'), 'ghep-cap');
    await user.selectOptions(screen.getByLabelText('Cấp phù hợp'), '2');
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'da-an');
    await user.selectOptions(screen.getByLabelText('Sắp xếp'), 'ti-le-dung-thap');
    await user.click(screen.getByRole('checkbox', { name: 'Chỉ câu cần xem lại' }));

    await waitFor(() => {
      const path = lastList(calls);
      for (const part of ['organizationId=5', 'questionType=MATCHING', 'level=2', 'status=REJECTED', 'sort=LOWEST_RATE', 'lowQualityOnly=true'])
        expect(path).toContain(part);
    });
  });

  it('bấm thẻ Cần xem lại lọc chỉ câu cần xem lại', async () => {
    signInAs('ADMIN');
    const calls = api(qualityPageOf([qualityRowOf(1)]));
    const user = userEvent.setup();
    renderApp('/quan-tri/cau-hoi');
    await user.click(await screen.findByRole('button', { name: /Cần xem lại/ }));
    await waitFor(() => expect(lastList(calls)).toContain('lowQualityOnly=true'));
  });

  it('lọc không ra câu nào hiện trạng thái rỗng có nút bỏ bộ lọc', async () => {
    signInAs('ADMIN');
    api(qualityPageOf([]));
    renderApp('/quan-tri/cau-hoi?tu-khoa=khong-co');
    expect(await screen.findByRole('button', { name: 'Bỏ bộ lọc' })).toBeInTheDocument();
  });

  it('xem câu chỉ đọc: đáp án đúng, giải thích, kết quả làm bài; câu cần xem lại có lời báo', async () => {
    signInAs('ADMIN');
    api(qualityPageOf([qualityRowOf(2, { answered: 12, correct: 2, correctRatePercent: 16.7, lowQuality: true })]), (call) =>
      call.path === '/admin/questions/2'
        ? envelope(200, { data: questionDetailOf(2, { access: accessOf({ isReadOnly: true, canEdit: false, canHide: true }) }) })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/cau-hoi');

    await user.click(await screen.findByRole('button', { name: /^Xem câu/ }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Năm 1010')).toBeInTheDocument();
    expect(within(dialog).getByText('Đáp án đúng')).toBeInTheDocument();
    expect(within(dialog).getByText('Giải thích đáp án.')).toBeInTheDocument();
    expect(within(dialog).getByTestId('chat-luong')).toHaveTextContent('12 lượt trả lời, 2 lượt đúng hoàn toàn (16,7%)');
    expect(within(dialog).getByText(/Câu này cần xem lại: có ít nhất 10 lượt trả lời mà tỉ lệ đúng dưới 30%/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Ẩn câu' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('ẩn câu: hộp xác nhận có ô lý do, gửi lý do rồi tải lại bảng', async () => {
    signInAs('ADMIN');
    const calls = api(qualityPageOf([qualityRowOf(1, {}, { content: 'Kinh thành Huế khởi công dưới triều vua nào?' })]), (call) =>
      call.path === '/admin/questions/1/hide' ? envelope(200, { data: questionDetailOf(1), message: 'Ẩn câu hỏi thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/cau-hoi');

    await user.click(await screen.findByRole('button', { name: /^Ẩn câu "Kinh thành Huế/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Bài kiểm tra đã phát hành và kết quả cũ giữ nguyên/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Lý do/), 'Sai năm khởi công');
    const before = calls.filter((c) => c.path.startsWith('/admin/questions/quality')).length;
    await user.click(within(dialog).getByRole('button', { name: 'Ẩn câu' }));

    await waitFor(() => expect(calls.find((c) => c.path === '/admin/questions/1/hide')?.body).toEqual({ reason: 'Sai năm khởi công' }));
    expect(await screen.findByText('Ẩn câu hỏi thành công.')).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith('/admin/questions/quality')).length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('hiện lại câu đã ẩn: chỉ câu đã ẩn có nút Hiện lại; lý do để trống gửi null', async () => {
    signInAs('ADMIN');
    const calls = api(
      qualityPageOf([
        qualityRowOf(7, { hiddenAt: '2026-10-06T01:00:00Z' }, { isHidden: true, reviewStatus: 'REJECTED', content: 'Câu đã ẩn?' }),
        qualityRowOf(8),
      ]),
      (call) =>
        call.path === '/admin/questions/7/restore'
          ? envelope(200, { data: questionDetailOf(7), message: 'Hiện lại câu hỏi thành công.' })
          : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/cau-hoi');

    expect(await screen.findAllByRole('button', { name: /^Ẩn câu "/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Hiện lại câu "Câu đã ẩn?"' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Hiện lại câu' }));

    await waitFor(() => expect(calls.find((c) => c.path === '/admin/questions/7/restore')?.body).toEqual({ reason: null }));
    expect(await screen.findByText('Hiện lại câu hỏi thành công.')).toBeInTheDocument();
  });

  it('ẩn thất bại (câu đã bị ẩn ở nơi khác): hộp vẫn mở và hiện lời của máy chủ', async () => {
    signInAs('ADMIN');
    api(qualityPageOf([qualityRowOf(1)]), (call) =>
      call.path === '/admin/questions/1/hide' ? envelope(422, { errorCode: 'BLOCKED', message: 'Câu hỏi đã bị ẩn.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/cau-hoi');
    await user.click(await screen.findByRole('button', { name: /^Ẩn câu "/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Ẩn câu' }));
    expect(await within(dialog).findByText('Câu hỏi đã bị ẩn.')).toBeInTheDocument();
  });

  it('giáo viên mở /quan-tri/cau-hoi nhận 403 và không gọi API kiểm duyệt', async () => {
    signInAs('TEACHER');
    const calls = mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
    renderApp('/quan-tri/cau-hoi');
    await screen.findByRole('navigation', { name: 'Khu giáo viên' });
    expect(calls.some((c) => c.path.startsWith('/admin/questions'))).toBe(false);
  });
});
