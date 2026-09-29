import { render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import LocationMap from './LocationMap';

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, 'createSVGRect', { value: () => ({}), configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 360, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 220, configurable: true });
});

describe('Bản đồ nhỏ ở trang chi tiết', () => {
  it('có nền OpenStreetMap, ghim đang chọn, nhãn hai quần đảo thuộc Việt Nam và tên địa phương', async () => {
    const { container } = render(<LocationMap latitude={16.4694} longitude={107.5778} label="Thành phố Huế" />);

    await waitFor(() => expect(container.querySelector('.dsv-pin--selected')).not.toBeNull());
    expect(container.querySelector('.leaflet-tooltip')).toHaveTextContent('Thành phố Huế');
    expect(container).toHaveTextContent('Quần đảo Hoàng Sa (Việt Nam)');
    expect(container).toHaveTextContent('Quần đảo Trường Sa (Việt Nam)');
    expect(container.querySelector('.leaflet-control-attribution')).toHaveTextContent('Những người đóng góp OpenStreetMap');
  });

  it('tên địa phương đặt bằng chữ thuần, không chèn HTML', async () => {
    const { container } = render(<LocationMap latitude={16} longitude={107} label={'<img src=x onerror="window.hacked=1">'} />);

    await waitFor(() => expect(container.querySelector('.leaflet-tooltip')).not.toBeNull());
    expect(container.querySelector('.leaflet-tooltip img')).toBeNull();
    expect(container.querySelector('.leaflet-tooltip')?.textContent).toBe('<img src=x onerror="window.hacked=1">');
  });
});
