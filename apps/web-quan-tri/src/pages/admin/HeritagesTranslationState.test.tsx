import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, heritageSummaryOf, mockApi, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Quản lý di sản: cột và bộ lọc Bản dịch (chưa dịch / chờ duyệt / đã duyệt / cần dịch lại).

describe('Quản lý di sản — tình trạng bản dịch', () => {
  it('cột Bản dịch hiện tình trạng từng di sản; bộ lọc gửi translationState và ghi lên URL', async () => {
    signInAs('ADMIN');
    const calls = mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/provinces') return envelope(200, { data: [] });
      if (call.path.startsWith('/admin/heritages?'))
        return envelope(200, {
          data: {
            items: [
              heritageSummaryOf(1, { name: 'Cố đô Huế', translationState: 'NONE' }),
              heritageSummaryOf(2, { name: 'Vịnh Hạ Long', translationState: 'PENDING' }),
              heritageSummaryOf(3, { name: 'Hội An', translationState: 'APPROVED' }),
              heritageSummaryOf(4, { name: 'Mỹ Sơn', translationState: 'OUTDATED' }),
            ],
            page: 1,
            pageSize: 20,
            totalItems: 4,
            totalPages: 1,
          },
        });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san');

    const table = await screen.findByRole('table', { name: 'Danh sách di sản' });
    expect(within(table).getByRole('columnheader', { name: 'Bản dịch' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]!).getByText('Chưa dịch')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Chờ duyệt')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Đã duyệt')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('Cần dịch lại')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Bản dịch'), 'can-dich-lai');
    await waitFor(() => expect(router.state.location.search).toBe('?ban-dich=can-dich-lai'));
    await waitFor(() => expect(calls.some((c) => c.path.includes('translationState=OUTDATED'))).toBe(true));
  });
});
