import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { pinOf } from '../test/discoveryFixtures';
import HeritageMap from './HeritageMap';

// Bản Leaflet thật trong jsdom: nền OpenStreetMap có ghi công, hai quần đảo Hoàng Sa và Trường Sa thuộc Việt Nam luôn được
// vẽ, ghim và nhóm ghim, chọn ghim thì mở popup do React dựng.

beforeAll(() => {
  // jsdom không có SVG hình học; Leaflet cần createSVGRect để chọn bộ vẽ SVG cho chấm đảo.
  Object.defineProperty(SVGElement.prototype, 'createSVGRect', { value: () => ({}), configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 900, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 600, configurable: true });
});

const HUE = pinOf();
const DA_NANG = pinOf({ id: 5, slug: 'do-thi-co-hoi-an', name: 'Đô thị cổ Hội An', latitude: 15.88, longitude: 108.33, hasTimeline: false });

describe('Bản đồ Leaflet', () => {
  it('có ghi công OpenStreetMap, nhãn hai quần đảo thuộc Việt Nam và nhãn Biển Đông', async () => {
    const { container } = render(
      <HeritageMap pins={[]} selectedSlug={null} onSelect={vi.fn<(slug: string | null) => void>()} fitKey="1" fitToPins={false} renderPopup={() => null} />,
    );

    await waitFor(() => expect(container.querySelector('.leaflet-container')).not.toBeNull());
    expect(screen.getByText('Quần đảo Hoàng Sa (Việt Nam)')).toBeInTheDocument();
    expect(screen.getByText('Quần đảo Trường Sa (Việt Nam)')).toBeInTheDocument();
    expect(screen.getByText('BIỂN ĐÔNG')).toBeInTheDocument();

    const attribution = container.querySelector('.leaflet-control-attribution');
    expect(attribution).toHaveTextContent('Bản đồ nền © Những người đóng góp OpenStreetMap');
    expect(attribution?.querySelector('a[href="https://www.openstreetmap.org/copyright"]')).not.toBeNull();
    // Ô bản đồ lấy từ máy chủ ô của OpenStreetMap.
    const tiles = [...container.querySelectorAll<HTMLImageElement>('.leaflet-tile')].map((tile) => tile.src);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((src) => src.startsWith('https://tile.openstreetmap.org/'))).toBe(true);
    // Chấm các đảo chính của hai quần đảo.
    expect(container.querySelectorAll('.dsv-island').length).toBeGreaterThanOrEqual(12);
    // Nút phóng to, thu nhỏ bằng tiếng Việt.
    expect(screen.getByTitle('Phóng to')).toBeInTheDocument();
    expect(screen.getByTitle('Thu nhỏ')).toBeInTheDocument();
  });

  it('vẽ mỗi ghim một nút có tên di sản; chọn ghim thì báo lên và mở popup có nội dung React', async () => {
    const onSelect = vi.fn<(slug: string | null) => void>();
    const { rerender } = render(
      <HeritageMap pins={[HUE, DA_NANG]} selectedSlug={null} onSelect={onSelect} fitKey="1" fitToPins renderPopup={(pin) => <p>{`Thẻ ${pin.name}`}</p>} />,
    );

    const marker = await screen.findByRole('button', { name: 'Quần thể di tích Cố đô Huế' });
    act(() => marker.click());
    expect(onSelect).toHaveBeenCalledWith('quan-the-di-tich-co-do-hue');

    // Địa chỉ trang là nguồn sự thật: cha đặt ghim đang chọn thì popup mở.
    rerender(
      <HeritageMap pins={[HUE, DA_NANG]} selectedSlug={HUE.slug} onSelect={onSelect} fitKey="1" fitToPins renderPopup={(pin) => <p>{`Thẻ ${pin.name}`}</p>} />,
    );
    expect(await screen.findByText('Thẻ Quần thể di tích Cố đô Huế')).toBeInTheDocument();
    expect(document.querySelector('.leaflet-popup-close-button')).toHaveAttribute('aria-label', 'Đóng thẻ di sản');
    expect(document.querySelector('.dsv-pin--selected')).not.toBeNull();
  });

  it('vị trí của khách ("Gần bạn") vẽ một chấm có tên và bị gỡ khi không còn vị trí', async () => {
    const props = { pins: [HUE], selectedSlug: null, onSelect: vi.fn<(slug: string | null) => void>(), fitKey: '1', fitToPins: false, renderPopup: () => null };
    const { rerender, container } = render(<HeritageMap {...props} userPosition={null} userLabel="Gần bạn" />);
    await screen.findByRole('button', { name: 'Quần thể di tích Cố đô Huế' });
    expect(container.querySelector('.leaflet-overlay-pane path[fill="#1a56db"]')).toBeNull();

    rerender(<HeritageMap {...props} userPosition={{ latitude: 16.464, longitude: 107.591 }} userLabel="Gần bạn" />);
    await waitFor(() => expect(container.querySelector('.leaflet-overlay-pane path[fill="#1a56db"]')).not.toBeNull());

    rerender(<HeritageMap {...props} userPosition={null} userLabel="Gần bạn" />);
    await waitFor(() => expect(container.querySelector('.leaflet-overlay-pane path[fill="#1a56db"]')).toBeNull());
  });

  it('đệm mép trên theo lớp nổi thì khung nhìn cả nước dời xuống, không bị thanh bộ lọc che', async () => {
    const props = { pins: [], selectedSlug: null, onSelect: vi.fn<(slug: string | null) => void>(), fitKey: '1', fitToPins: false, renderPopup: () => null };
    const labelY = (container: HTMLElement) => {
      const label = container.querySelector<HTMLElement>('.dsv-map-label-wrap');
      // jsdom không có biến đổi 3D nên Leaflet đặt vị trí bằng top/left; trình duyệt thật đặt translate3d(x, y, 0).
      const transformed = /translate(?:3d)?\([^,]+, (-?[\d.]+)px/.exec(label?.style.transform ?? '')?.[1];
      return transformed === undefined ? Number.parseFloat(label?.style.top ?? '') : Number(transformed);
    };
    const plain = render(<HeritageMap {...props} />);
    await waitFor(() => expect(plain.container.querySelector('.dsv-map-label-wrap')).not.toBeNull());
    const withoutPadding = labelY(plain.container);
    plain.unmount();

    const padded = render(<HeritageMap {...props} fitPadding={{ top: 200, bottom: 0 }} />);
    await waitFor(() => expect(padded.container.querySelector('.dsv-map-label-wrap')).not.toBeNull());
    expect(labelY(padded.container)).toBeGreaterThan(withoutPadding);
  });

  it('dữ liệu ghim đổi thì ghim cũ bị thay bằng ghim mới', async () => {
    const props = { selectedSlug: null, onSelect: vi.fn<(slug: string | null) => void>(), fitKey: '1', fitToPins: false, renderPopup: () => null };
    const { rerender } = render(<HeritageMap pins={[HUE]} {...props} />);
    await screen.findByRole('button', { name: 'Quần thể di tích Cố đô Huế' });

    rerender(<HeritageMap pins={[DA_NANG]} {...props} fitKey="2" />);
    await screen.findByRole('button', { name: 'Đô thị cổ Hội An' });
    expect(screen.queryByRole('button', { name: 'Quần thể di tích Cố đô Huế' })).not.toBeInTheDocument();
  });
});
