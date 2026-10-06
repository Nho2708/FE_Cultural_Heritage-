import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import CoordinatePicker from './CoordinatePicker';
import { roundCoordinate, type CoordinateLimits } from './coordinates';

const LIMITS: CoordinateLimits = { minLatitude: 8, maxLatitude: 23.5, minLongitude: 102, maxLongitude: 117.5 };

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, 'createSVGRect', { value: () => ({}), configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 400, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 300, configurable: true });
});

describe('Bản đồ chọn tọa độ', () => {
  it('có nền OpenStreetMap, nhãn hai quần đảo và chưa có ghim khi chưa chọn tọa độ', async () => {
    const { container } = render(<CoordinatePicker latitude={null} longitude={null} limits={LIMITS} onChange={() => {}} />);

    await waitFor(() => expect(container.querySelector('.leaflet-control-attribution')).not.toBeNull());
    expect(container.querySelector('.leaflet-control-attribution')?.textContent).toContain('Những người đóng góp OpenStreetMap');
    expect(container.textContent).toContain('Quần đảo Hoàng Sa (Việt Nam)');
    expect(container.textContent).toContain('Quần đảo Trường Sa (Việt Nam)');
    expect(container.querySelector('.dsv-pin--selected')).toBeNull();
  });

  it('đặt ghim đúng chỗ khi đã có tọa độ và đưa ghim cùng bản đồ tới tọa độ mới khi ô nhập đổi', async () => {
    const onChange = vi.fn<(latitude: number, longitude: number) => void>();
    const { container, rerender } = render(
      <CoordinatePicker latitude={16.4694} longitude={107.5778} limits={LIMITS} onChange={onChange} />,
    );
    await waitFor(() => expect(container.querySelector('.dsv-pin--selected')).not.toBeNull());

    // Tọa độ mới nằm ngoài khung đang xem: bản đồ dời tới đó, tâm bản đồ (điểm giữa khung 400 x 300) trùng ghim.
    rerender(<CoordinatePicker latitude={21.0285} longitude={105.8542} limits={LIMITS} onChange={onChange} />);
    await waitFor(() => {
      fireEvent.click(container.querySelector('.leaflet-container') as HTMLElement, { clientX: 200, clientY: 150 });
      expect(onChange).toHaveBeenCalled();
    });
    const [lat, lng] = onChange.mock.calls.at(-1) as [number, number];
    expect(lat).toBeCloseTo(21.0285, 1);
    expect(lng).toBeCloseTo(105.8542, 1);
    expect(container.querySelectorAll('.dsv-pin--selected')).toHaveLength(1);
  });

  it('bỏ ghim khi tọa độ nằm ngoài khoảng cho phép', async () => {
    const { container } = render(<CoordinatePicker latitude={40} longitude={107} limits={LIMITS} onChange={() => {}} />);
    await waitFor(() => expect(container.querySelector('.leaflet-control-attribution')).not.toBeNull());
    expect(container.querySelector('.dsv-pin--selected')).toBeNull();
  });

  it('bấm lên bản đồ báo tọa độ đã làm tròn 6 chữ số, nằm trong khoảng cho phép', async () => {
    const onChange = vi.fn<(latitude: number, longitude: number) => void>();
    const { container } = render(<CoordinatePicker latitude={16} longitude={108} limits={LIMITS} onChange={onChange} />);
    await waitFor(() => expect(container.querySelector('.dsv-pin--selected')).not.toBeNull());

    fireEvent.click(container.querySelector('.leaflet-container') as HTMLElement, { clientX: 200, clientY: 150 });

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const [lat, lng] = onChange.mock.calls[0] as [number, number];
    expect(lat).toBeGreaterThan(15.9);
    expect(lat).toBeLessThan(16.1);
    expect(lng).toBeGreaterThan(107.9);
    expect(lng).toBeLessThan(108.1);
    expect(lat).toBe(roundCoordinate(lat));
    expect(lng).toBe(roundCoordinate(lng));
  });

  it('bấm ra ngoài khoảng cho phép thì không đổi tọa độ mà báo ra ngoài khoảng', async () => {
    const onChange = vi.fn<(latitude: number, longitude: number) => void>();
    const onOutOfRange = vi.fn<() => void>();
    const narrow: CoordinateLimits = { minLatitude: 15.99, maxLatitude: 16.01, minLongitude: 107.99, maxLongitude: 108.01 };
    const { container } = render(
      <CoordinatePicker latitude={16} longitude={108} limits={narrow} onChange={onChange} onOutOfRange={onOutOfRange} />,
    );
    await waitFor(() => expect(container.querySelector('.dsv-pin--selected')).not.toBeNull());

    fireEvent.click(container.querySelector('.leaflet-container') as HTMLElement, { clientX: 20, clientY: 20 });

    await waitFor(() => expect(onOutOfRange).toHaveBeenCalledTimes(1));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('đang khóa thì bấm lên bản đồ không đổi tọa độ', async () => {
    const onChange = vi.fn<(latitude: number, longitude: number) => void>();
    const { container } = render(<CoordinatePicker latitude={16} longitude={108} limits={LIMITS} onChange={onChange} disabled />);
    await waitFor(() => expect(container.querySelector('.dsv-pin--selected')).not.toBeNull());

    fireEvent.click(container.querySelector('.leaflet-container') as HTMLElement, { clientX: 200, clientY: 150 });

    expect(onChange).not.toHaveBeenCalled();
  });
});
