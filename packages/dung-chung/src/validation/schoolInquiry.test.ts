import { describe, expect, it } from 'vitest';
import { schoolInquiryTooManyMessage, validateSchoolInquiry, type SchoolInquiryValues } from './schoolInquiry';

const VALID: SchoolInquiryValues = {
  schoolName: 'Trường THCS Nguyễn Du',
  province: '',
  contactName: 'Trần Thị Hạnh',
  position: '',
  email: 'hanh@nguyendu.edu.vn',
  phone: '',
  message: 'Trường em muốn dùng thử.',
};

describe('kiểm tra biểu mẫu liên hệ của trường', () => {
  it('đủ trường bắt buộc thì hợp lệ, trường tùy chọn được để trống', () => {
    expect(validateSchoolInquiry(VALID)).toEqual({});
    expect(validateSchoolInquiry({ ...VALID, province: 'Hà Nội', position: 'Hiệu trưởng', phone: '0912 345 678' })).toEqual({});
  });

  it('báo từng trường bắt buộc bị bỏ trống bằng câu của danh mục', () => {
    expect(validateSchoolInquiry({ ...VALID, schoolName: ' ', contactName: '', email: '', message: '' })).toEqual({
      schoolName: 'Vui lòng nhập tên trường.',
      contactName: 'Vui lòng nhập họ tên người liên hệ.',
      email: 'Vui lòng nhập email.',
      message: 'Vui lòng nhập nội dung.',
    });
  });

  it('email và số điện thoại sai định dạng, nội dung vượt 2000 ký tự', () => {
    const errors = validateSchoolInquiry({ ...VALID, email: 'khong-phai-email', phone: 'abc', message: 'a'.repeat(2001) });
    expect(errors.email).toContain('Email không hợp lệ');
    expect(errors.phone).toContain('Số điện thoại không hợp lệ');
    expect(errors.message).toBe('Nội dung không hợp lệ: tối đa 2000 ký tự.');
    expect(validateSchoolInquiry({ ...VALID, message: 'a'.repeat(2000) })).toEqual({});
  });

  it('câu khi gửi quá nhiều lần đổi theo thời gian chờ', () => {
    expect(schoolInquiryTooManyMessage(45)).toBe('Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 45 giây.');
    expect(schoolInquiryTooManyMessage(600)).toBe('Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 10 phút.');
    expect(schoolInquiryTooManyMessage(null)).toBe('Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút.');
  });
});
