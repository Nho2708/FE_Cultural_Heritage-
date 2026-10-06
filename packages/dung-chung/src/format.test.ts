import { describe, expect, it } from 'vitest';
import {
  ACTOR_ROLE_LABEL,
  AUDIT_ACTION_LABEL,
  describeAuditValue,
  formatDate,
  formatDateTime,
  formatPlanDate,
  initials,
  parseVietnameseDate,
  vietnamDayBoundary,
} from './format';

describe('định dạng hiển thị', () => {
  it('Avatar lấy chữ cái đầu của hai từ cuối, giữ dấu', () => {
    expect(initials('Nguyễn Trần Quang Nho')).toBe('QN');
    expect(initials('Nguyễn Thị Ánh')).toBe('TÁ');
    expect(initials('  đức  ')).toBe('Đ');
    expect(initials('Quản trị viên (dev)')).toBe('TV');
    expect(initials(null)).toBe('');
  });

  it('ngày giờ hiển thị theo giờ Việt Nam', () => {
    // 23:30 UTC ngày 22 là 06:30 ngày 23 theo GMT+7.
    expect(formatDate('2026-09-22T23:30:00Z')).toBe('23/09/2026');
    expect(formatDateTime('2026-09-22T23:30:00Z')).toBe('06:30 23/09/2026');
    expect(formatDateTime(null)).toBe('');
  });

  it('ngày của gói (yyyy-MM-dd, đã là ngày Việt Nam) không đổi múi giờ', () => {
    expect(formatPlanDate('2026-09-26')).toBe('26/09/2026');
    expect(formatPlanDate(null)).toBe('');
  });

  it('bộ lọc ngày của nhật ký lấy đầu ngày và cuối ngày theo giờ Việt Nam', () => {
    expect(vietnamDayBoundary('2026-09-26', 'start')).toBe('2026-09-26T00:00:00+07:00');
    expect(vietnamDayBoundary('2026-09-26', 'end')).toBe('2026-09-26T23:59:59.999+07:00');
    expect(vietnamDayBoundary('', 'start')).toBeUndefined();
  });

  it('đọc ngày gõ theo dạng ngày/tháng/năm, từ chối ngày không có thật', () => {
    expect(parseVietnameseDate('26/09/2026')).toBe('2026-09-26');
    expect(parseVietnameseDate(' 6/9/2026 ')).toBe('2026-09-06');
    expect(parseVietnameseDate('31/02/2026')).toBeNull();
    expect(parseVietnameseDate('2026-09-26')).toBeNull();
    expect(parseVietnameseDate('09/26/2026')).toBeNull();
  });

  it('đủ nhãn tiếng Việt cho 21 mã thao tác của nhật ký, cùng nhãn với backend', () => {
    expect(Object.keys(AUDIT_ACTION_LABEL)).toHaveLength(24);
    expect(AUDIT_ACTION_LABEL.LOGIN).toBe('Đăng nhập web quản trị');
    expect(AUDIT_ACTION_LABEL.STUDENT_DEACTIVATED).toBe('Vô hiệu hoặc xóa học sinh');
    expect(ACTOR_ROLE_LABEL.STUDENT).toBe('Học sinh');
  });

  it('giá trị cũ / mới của nhật ký hiện bằng nhãn tiếng Việt, enum đổi sang nhãn', () => {
    expect(describeAuditValue('{"status":"LOCKED"}')).toEqual([{ label: 'Trạng thái', value: 'Bị khóa' }]);
    expect(describeAuditValue('{"username":"gv.an","role":"TEACHER","organizationId":10,"startDate":"2026-09-26"}')).toEqual([
      { label: 'Tên đăng nhập', value: 'gv.an' },
      { label: 'Vai trò', value: 'Giáo viên' },
      { label: 'Mã trường', value: '10' },
      { label: 'Ngày bắt đầu', value: '26/09/2026' },
    ]);
    expect(describeAuditValue(null)).toEqual([]);
    expect(describeAuditValue('khong-phai-json')).toEqual([{ label: 'Giá trị', value: 'khong-phai-json' }]);
  });
});
