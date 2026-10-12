import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Table, Td, Th, Tr } from './DataTable';

// Bảng khu quản trị: khung cuộn ngang hiện dải mờ ở mép còn cột khuất. jsdom không đo kích thước nên gán tay scrollWidth,
// clientWidth, scrollLeft của khung rồi phát sự kiện cuộn.

afterEach(cleanup);

function layout(element: HTMLElement, values: Partial<Record<'scrollWidth' | 'clientWidth' | 'scrollLeft', number>>) {
  for (const [key, value] of Object.entries(values)) Object.defineProperty(element, key, { configurable: true, value });
}

function show() {
  const view = render(
    <Table caption="Danh sách di sản">
      <thead>
        <tr>
          <Th>Tên</Th>
        </tr>
      </thead>
      <tbody>
        <Tr>
          <Td>Cố đô Huế</Td>
        </Tr>
      </tbody>
    </Table>,
  );
  const scroller = view.container.querySelector('.overflow-x-auto') as HTMLElement;
  const hint = (side: 'left' | 'right') => view.container.querySelector(`[data-scroll-hint="${side}"]`) as HTMLElement;
  return { ...view, scroller, hint };
}

describe('dấu hiệu bảng còn cột khuất', () => {
  it('bảng vừa khung thì không có dải mờ nào', () => {
    const { hint } = show();
    expect(hint('left').className).toContain('opacity-0');
    expect(hint('right').className).toContain('opacity-0');
  });

  it('bảng rộng hơn khung: dải phải hiện khi còn cột bên phải, dải trái hiện khi đã cuộn qua cột bên trái', () => {
    const { scroller, hint } = show();
    layout(scroller, { scrollWidth: 1200, clientWidth: 800, scrollLeft: 0 });
    fireEvent.scroll(scroller);
    expect(hint('right').className).toContain('opacity-100');
    expect(hint('left').className).toContain('opacity-0');

    layout(scroller, { scrollLeft: 200 });
    fireEvent.scroll(scroller);
    expect(hint('right').className).toContain('opacity-100');
    expect(hint('left').className).toContain('opacity-100');

    layout(scroller, { scrollLeft: 400 });
    fireEvent.scroll(scroller);
    expect(hint('right').className).toContain('opacity-0');
    expect(hint('left').className).toContain('opacity-100');
  });

  it('dải mờ không chắn thao tác và không đọc bằng trình đọc màn hình; cờ bận nằm trên khung bảng', () => {
    const { container, hint } = show();
    expect(hint('right').className).toContain('pointer-events-none');
    expect(hint('right').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[aria-busy]')).toBeNull();
    cleanup();
    const busy = render(
      <Table caption="Đang tải" busy>
        <tbody />
      </Table>,
    );
    expect(busy.container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
