import { MESSAGES } from '../messages';

// Mã học sinh: tiền tố "HS" + 6 ký tự lấy từ bảng 32 ký tự (chữ số 2-9, chữ in hoa A-Z bỏ O và I), ví dụ HS8K2QX7.
// Mã học sinh cũng là tên đăng nhập của học sinh. Khi nhận mã do người dùng gõ, bỏ khoảng trắng và dấu gạch, đổi chữ
// thường thành chữ hoa rồi mới so khớp — "hs 8k2-qx7" vẫn đúng. Máy chủ chuẩn hóa lại, không dựa vào giao diện.

export const STUDENT_CODE_PATTERN = /^HS[2-9A-HJ-NP-Z]{6}$/;

/** Bỏ khoảng trắng, dấu gạch (kể cả gạch dài), đổi sang chữ hoa. */
export function normalizeCode(value: string): string {
  return value.replace(/[\s\-‐-―]/gu, '').toLocaleUpperCase('en-US');
}

/**
 * Ô "Mã học sinh" của màn hình đăng nhập: chỉ kiểm bắt buộc nhập. Mã sai dạng vẫn gửi lên để máy chủ trả cùng một câu
 * "mã học sinh hoặc mật khẩu chưa đúng", không cho biết sai ô nào.
 */
export function validateStudentCodeInput(value: string): string | null {
  return normalizeCode(value) === '' ? MESSAGES.required('mã học sinh') : null;
}
