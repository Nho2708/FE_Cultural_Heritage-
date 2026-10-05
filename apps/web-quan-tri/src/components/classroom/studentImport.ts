import { CLASS_RULES, MESSAGES } from '@dsvhvn/dung-chung';
import type { ImportPreview, ImportRowBody } from '@dsvhvn/dung-chung/api';

// Chọn tệp danh sách học sinh và lấy các dòng hợp lệ của bước xem trước. Máy chủ kiểm lại mọi thứ; kiểm ở đây để báo sớm.

const EXTENSIONS = ['.xlsx', '.csv'];

/** Câu lỗi nếu tệp không dùng được (sai loại, quá 1 MB, trống), null nếu hợp lệ. */
export function fileProblem(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (!EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return MESSAGES.invalid('Tệp danh sách', 'chỉ nhận tệp Excel (.xlsx) hoặc CSV UTF-8 (.csv)');
  }
  if (file.size === 0) return MESSAGES.invalid('Tệp danh sách', 'tệp đang trống');
  if (file.size > CLASS_RULES.maxImportFileBytes) return MESSAGES.invalid('Tệp danh sách', 'tối đa 1 MB');
  return null;
}

/** Các dòng hợp lệ của bản xem trước, đúng dạng máy chủ nhận khi lưu. */
export function validRowsOf(preview: ImportPreview): ImportRowBody[] {
  return preview.rows.filter((r) => r.isValid && r.fullName).map((r) => ({ rowNumber: r.rowNumber, fullName: r.fullName ?? '' }));
}
