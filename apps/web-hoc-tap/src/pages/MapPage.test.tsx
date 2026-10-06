import type { HeritagePin } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { mapOf, pinOf, publicApi, THANG_LONG } from '../test/discoveryFixtures';
import { renderApp } from '../test/renderApp';

// Bản đồ di sản: Leaflet được thay bằng khung giả (bản thật kiểm ở HeritageMap.test.tsx); ở đây kiểm bộ lọc, ghi chú số
// di sản, thẻ tóm tắt của ghim và vị trí chọn trên địa chỉ trang.

interface FakeMapProps {
  pins: HeritagePin[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  fitToPins: boolean;
  renderPopup: (pin: HeritagePin) => ReactNode;
}

vi.mock('../discovery/HeritageMap', () => ({
  default: ({ pins, selectedSlug, onSelect, fitToPins, renderPopup }: FakeMapProps) => (
    <div data-testid="ban-do" data-fit={String(fitToPins)}>
      {pins.map((pin) => (
        <button key={pin.slug} type="button" onClick={() => onSelect(pin.slug)}>
          {`Ghim ${pin.name}`}
        </button>
      ))}
      {pins.filter((pin) => pin.slug === selectedSlug).map((pin) => <div key={pin.slug}>{renderPopup(pin)}</div>)}
    </div>
  ),
}));

const mapCalls = (calls: FetchCall[]) => calls.filter((call) => call.path.startsWith('/public/heritages/map'));

describe('Bản đồ di sản', () => {
  it('ghi số di sản có vị trí và số di sản không có vị trí; chú giải ghim', async () => {
    mockApi(publicApi());
    renderApp('/ban-do');

    expect(await screen.findByText('2 di sản có vị trí trên bản đồ')).toBeInTheDocument();
    expect(screen.getByText(/7 di sản khớp bộ lọc nhưng không có vị trí trên bản đồ \(thường là di sản phi vật thể\)/)).toBeInTheDocument();
    expect(screen.getByText('Nhóm di sản gần nhau')).toBeInTheDocument();
    expect(screen.getByText('Đang chọn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem trong danh sách' })).toHaveAttribute('href', '/di-san');
    // Bản đồ chiếm hết chiều cao màn hình nên không có chân trang.
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('bộ lọc trên địa chỉ trang được gửi kèm, không phân trang', async () => {
    const calls = mockApi(publicApi());
    renderApp(`/ban-do?tu-khoa=hue&vung=${encodeURIComponent('Trung')}&loai=TANGIBLE&cap=UNESCO&thoi-ky=MODERN&tinh=20`);

    await screen.findByTestId('ban-do');
    expect(Object.fromEntries(new URL(`http://x${mapCalls(calls)[0]!.path}`).searchParams)).toEqual({
      keyword: 'hue',
      provinceId: '20',
      region: 'Trung',
      heritageType: 'TANGIBLE',
      recognitionLevel: 'UNESCO',
      period: 'MODERN',
      lang: 'vi',
    });
    expect(screen.getByTestId('ban-do')).toHaveAttribute('data-fit', 'true');
    expect(screen.getByRole('button', { name: 'Bỏ từ khóa hue' })).toBeInTheDocument();
  });

  it('không lọc thì bản đồ hiện toàn cảnh, không căn theo ghim', async () => {
    mockApi(publicApi());
    renderApp('/ban-do');
    expect(await screen.findByTestId('ban-do')).toHaveAttribute('data-fit', 'false');
  });

  it('bấm ghim mở thẻ tóm tắt: tên, tỉnh và loại, mô tả, "Xem chi tiết" và "Mở dòng thời gian"; vị trí chọn nằm trên địa chỉ', async () => {
    mockApi(publicApi());
    const user = userEvent.setup();
    const { router } = renderApp('/ban-do');

    await user.click(await screen.findByRole('button', { name: 'Ghim Quần thể di tích Cố đô Huế' }));

    await waitFor(() => expect(router.state.location.search).toBe('?chon=quan-the-di-tich-co-do-hue'));
    const card = screen.getByRole('article');
    expect(within(card).getByRole('heading', { name: 'Quần thể di tích Cố đô Huế' })).toBeInTheDocument();
    expect(within(card).getByText('Thành phố Huế · Vật thể')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute('href', '/di-san/quan-the-di-tich-co-do-hue');
    expect(within(card).getByRole('link', { name: 'Mở dòng thời gian' })).toHaveAttribute('href', '/dong-thoi-gian/quan-the-di-tich-co-do-hue');
  });

  it('di sản chưa có dòng thời gian thì thẻ không có nút "Mở dòng thời gian"', async () => {
    mockApi(publicApi());
    renderApp(`/ban-do?chon=${THANG_LONG.slug}`);

    const card = await screen.findByRole('article');
    expect(within(card).getByRole('link', { name: 'Xem chi tiết' })).toBeInTheDocument();
    expect(within(card).queryByRole('link', { name: 'Mở dòng thời gian' })).not.toBeInTheDocument();
  });

  it('đổi bộ lọc thì bỏ vị trí chọn và gọi lại máy chủ', async () => {
    const calls = mockApi(publicApi());
    const user = userEvent.setup();
    const { router } = renderApp(`/ban-do?chon=${THANG_LONG.slug}`);

    await screen.findByRole('article');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Loại' }), 'NATURAL');

    await waitFor(() => expect(router.state.location.search).toBe('?loai=NATURAL'));
    await waitFor(() => expect(mapCalls(calls).some((call) => call.path.includes('heritageType=NATURAL'))).toBe(true));
  });

  it('không có kết quả thì báo và cho xóa bộ lọc', async () => {
    mockApi(publicApi({ '/public/heritages/map': () => envelope(200, { data: mapOf({ pins: [], totalMatched: 0, withoutLocation: 0 }) }) }));
    const user = userEvent.setup();
    const { router } = renderApp('/ban-do?tu-khoa=zzzz');

    expect(await screen.findByText('Không tìm thấy kết quả phù hợp. Hãy bớt tiêu chí lọc hoặc thử từ khóa khác.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' })[0]!);
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('còn ghim chưa hiện thì nhắc thu hẹp bộ lọc', async () => {
    mockApi(publicApi({ '/public/heritages/map': () => envelope(200, { data: mapOf({ isTruncated: true, totalMatched: 800, withoutLocation: 0, pins: [pinOf()] }) }) }));
    renderApp('/ban-do');
    expect(await screen.findByText('Bản đồ chỉ hiện 500 ghim đầu tiên. Hãy chọn thêm bộ lọc để thu hẹp.')).toBeInTheDocument();
  });

  it('từ khóa sai độ dài báo lỗi và không gọi máy chủ', async () => {
    const calls = mockApi(publicApi());
    renderApp('/ban-do?tu-khoa=a');
    expect(await screen.findByText('Từ khóa không hợp lệ: phải dài 2-100 ký tự.')).toBeInTheDocument();
    expect(mapCalls(calls)).toHaveLength(0);
  });
});
