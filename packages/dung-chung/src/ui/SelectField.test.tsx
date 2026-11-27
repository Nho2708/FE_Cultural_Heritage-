import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SelectField } from './Input';

// Ô chọn có nhóm: các mục liền nhau cùng `group` chung một nhóm; mục không có nhóm đứng riêng ở đầu.

afterEach(cleanup);

describe('SelectField có nhóm', () => {
  it('gom các mục liền nhau cùng nhóm vào một optgroup, giữ thứ tự', () => {
    render(
      <SelectField
        label="Chủ đề"
        value=""
        onChange={() => undefined}
        options={[
          { value: '', label: 'Tất cả chủ đề' },
          { value: '1', label: 'Thiên nhiên', group: 'Nam Bộ' },
          { value: '2', label: 'Địa đạo Củ Chi', group: 'Nam Bộ' },
          { value: '3', label: 'Thăng Long - Hà Nội', group: 'Đồng bằng Bắc Bộ' },
        ]}
      />,
    );
    const select = screen.getByLabelText('Chủ đề');
    const groups = within(select).getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('label'))).toEqual(['Nam Bộ', 'Đồng bằng Bắc Bộ']);
    expect(within(groups[0]!).getAllByRole('option').map((o) => o.textContent)).toEqual(['Thiên nhiên', 'Địa đạo Củ Chi']);
    expect(within(select).getAllByRole('option')).toHaveLength(4);
    expect(within(select).getAllByRole('option')[0]?.textContent).toBe('Tất cả chủ đề');
  });

  it('không có nhóm thì vẫn là danh sách phẳng như trước', () => {
    render(<SelectField label="Khối" value="" onChange={() => undefined} options={[{ value: '', label: 'Tất cả' }, { value: '1', label: 'Khối 1' }]} />);
    expect(within(screen.getByLabelText('Khối')).queryAllByRole('group')).toHaveLength(0);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});
