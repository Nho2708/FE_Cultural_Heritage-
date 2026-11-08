import type { PublicSummary } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Tóm tắt và thuyết minh mở thẳng cho mọi người: khách hay học sinh bấm "Tóm tắt" là thấy nội dung ngay, không có lời mời hay bước chặn nào.

vi.mock('../discovery/LocationMap', () => ({ default: () => <div data-testid="ban-do-nho" /> }));

const SUMMARY_TEXT = 'Đoạn chi tiết thứ nhất về Cố đô Huế.';

const summary: PublicSummary = {
  heritageId: 1,
  slug: HUE.slug,
  name: HUE.name,
  localization: { requestedLanguage: 'vi', language: 'vi', isFallback: false, isMachineTranslated: false },
  shortText: 'Kinh thành Huế khởi công năm 1805. Đây là trung tâm của triều Nguyễn.',
  detailedText: `${SUMMARY_TEXT}\n\nĐoạn chi tiết thứ hai về lăng tẩm.`,
};

function setup() {
  return mockApi(
    publicApi({
      [`/public/heritages/${HUE.slug}`]: () => envelope(200, { data: detailOf({ hasSummary: true }) }),
      [`/public/heritages/${HUE.slug}/summary`]: () => envelope(200, { data: summary }),
    }),
  );
}

describe('hộp thoại tóm tắt', () => {
  it('khách bấm "Tóm tắt" thì thấy nội dung ngay, không có bước chặn nào', async () => {
    const calls = setup();
    renderApp(`/di-san/${HUE.slug}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tóm tắt' }));

    const dialog = await screen.findByRole('dialog', { name: 'TÓM TẮT VÀ THUYẾT MINH' });
    expect(await within(dialog).findByText(SUMMARY_TEXT)).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: 'Nghe' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/quảng cáo|mở khóa/i)).not.toBeInTheDocument();
    expect(calls.some((call) => call.path.split('?')[0]!.startsWith('/public/ads'))).toBe(false);
  });

  it('học sinh đã đăng nhập cũng thấy nội dung ngay', async () => {
    signInAs();
    setup();
    renderApp(`/di-san/${HUE.slug}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tóm tắt' }));

    const dialog = await screen.findByRole('dialog', { name: 'TÓM TẮT VÀ THUYẾT MINH' });
    expect(await within(dialog).findByText(SUMMARY_TEXT)).toBeInTheDocument();
  });
});
