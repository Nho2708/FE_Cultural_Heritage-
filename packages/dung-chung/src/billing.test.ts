import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatMoneyPlain,
  formatPlanRange,
  parseMoney,
  validatePlanAiRequests,
  validatePlanDuration,
  validatePlanName,
  validatePlanPrice,
  validatePlanTeachers,
} from './billing';
import { MESSAGES } from './messages';

describe('Tiền của gói', () => {
  it('định dạng số nguyên đồng có dấu chấm ngăn nhóm nghìn', () => {
    expect(formatMoneyPlain(1_990_000)).toBe('1.990.000');
    expect(formatMoneyPlain(0)).toBe('0');
    expect(formatMoneyPlain(999)).toBe('999');
    expect(formatMoney(3_990_000)).toBe('3.990.000 ₫');
    expect(formatMoney(null)).toBe('');
  });

  it('đọc số tiền gõ có hoặc không có dấu chấm', () => {
    expect(parseMoney('1990000')).toBe(1_990_000);
    expect(parseMoney('1.990.000')).toBe(1_990_000);
    expect(parseMoney(' 1 990 000 ')).toBe(1_990_000);
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('19.90')).toBeNull();
    expect(parseMoney('1,990,000')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
  });
});

describe('Kiểm tra biểu mẫu gói', () => {
  it('tên gói bắt buộc và tối đa 100 ký tự', () => {
    expect(validatePlanName('')).toBe(MESSAGES.required('tên gói'));
    expect(validatePlanName('Cơ bản')).toBeNull();
    expect(validatePlanName('a'.repeat(101))).toBe(MESSAGES.invalid('Tên gói', 'tối đa 100 ký tự'));
  });

  it('giá nguyên đồng từ 0 đến 999.999.999; gói trả phí phải lớn hơn 0', () => {
    const rule = 'phải là số nguyên đồng từ 0 đến 999.999.999';
    expect(validatePlanPrice('', false)).toBe(MESSAGES.required('giá gói'));
    expect(validatePlanPrice('1.990.000', false)).toBeNull();
    expect(validatePlanPrice('999999999', false)).toBeNull();
    expect(validatePlanPrice('1000000000', false)).toBe(MESSAGES.invalid('Giá gói', rule));
    expect(validatePlanPrice('12.5', false)).toBe(MESSAGES.invalid('Giá gói', rule));
    expect(validatePlanPrice('0', false)).toBe(
      MESSAGES.invalid('Giá gói', 'gói Miễn phí là gói giá 0 duy nhất, các gói khác phải có giá lớn hơn 0'),
    );
  });

  it('gói Miễn phí luôn giá 0', () => {
    expect(validatePlanPrice('0', true)).toBeNull();
    expect(validatePlanPrice('500000', true)).toBe(MESSAGES.invalid('Giá gói', 'gói Miễn phí luôn có giá 0'));
  });

  it('thời hạn 1-730 ngày, giáo viên 1-10000, lượt AI 0-1000000', () => {
    expect(validatePlanDuration('365')).toBeNull();
    expect(validatePlanDuration('0')).toBe(MESSAGES.invalid('Thời hạn', 'phải là số nguyên từ 1 đến 730 ngày'));
    expect(validatePlanDuration('731')).not.toBeNull();
    expect(validatePlanDuration('')).toBe(MESSAGES.required('thời hạn'));
    expect(validatePlanDuration('3.5')).not.toBeNull();
    expect(validatePlanTeachers('10')).toBeNull();
    expect(validatePlanTeachers('0')).toBe(MESSAGES.invalid('Số giáo viên tối đa', 'phải là số nguyên từ 1 đến 10000'));
    expect(validatePlanAiRequests('0')).toBeNull();
    expect(validatePlanAiRequests('1000001')).toBe(MESSAGES.invalid('Số lượt AI mỗi kỳ', 'phải là số nguyên từ 0 đến 1000000'));
    expect(validatePlanAiRequests('-1')).not.toBeNull();
  });
});

describe('Khoảng ngày của gói', () => {
  it('hiện ngày bắt đầu và ngày hết hạn theo ngày/tháng/năm', () => {
    expect(formatPlanRange('2026-09-29', '2027-09-28')).toBe('29/09/2026 – 28/09/2027');
    expect(formatPlanRange(null, null)).toBe('');
  });
});
