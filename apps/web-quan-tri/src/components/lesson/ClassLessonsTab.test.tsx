import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf } from '../../test/fixtures';
import { lessonRowOf, quotaOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Tab Bài học của Chi tiết lớp: bài học của riêng lớp; "Tạo bài học" mở với lớp chọn sẵn và khóa (bỏ bước chọn lớp).

describe('Chi tiết lớp — tab Bài học', () => {
  it('liệt kê bài học của lớp và mở hộp thoại Tạo bài học với lớp khóa sẵn', async () => {
    signInAs('TEACHER');
    const calls = mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1, { name: '7A1' }) });
      if (call.path.startsWith('/teacher/lessons?')) {
        return envelope(200, {
          data: { items: [lessonRowOf(4, { title: 'Ngọ Môn', status: 'PUBLISHED', accessCode: 'BH7F3K2Q' })], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
        });
      }
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quotaOf() });
      if (call.path.startsWith('/public/filters')) return envelope(200, { data: { provinces: [], regions: [], heritageTypes: [], recognitionLevels: [], periods: [] } });
      if (call.path.startsWith('/public/heritages')) return envelope(200, { data: { items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1?tab=bai-hoc');

    const table = await screen.findByRole('table', { name: 'Bài học của lớp 7A1' });
    expect(within(table).getByRole('link', { name: 'Ngọ Môn' })).toHaveAttribute('href', '/giao-vien/bai-hoc/4');
    expect(within(table).getByText('BH7F3K2Q')).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.path.includes('classId=1'))).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Tạo bài học' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' });
    expect(within(dialog).getByText('Lớp 7A1 · Khối 7')).toBeInTheDocument();
    expect(within(dialog).getByText(/lớp được chọn sẵn và khóa/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Tiếp tục' })).not.toBeInTheDocument();
  });
});
