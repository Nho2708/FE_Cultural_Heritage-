import type { SchoolLevel } from './types';

// Kiểu dữ liệu của luồng Lớp, học sinh và tài khoản học sinh (giáo viên quản lý). JSON camelCase như các kiểu khác.

/** Dòng và chi tiết lớp của giáo viên. Cấp học suy từ khối lớp, không lưu. */
export interface ClassRoom {
  id: number;
  name: string;
  /** Khối 1-12. */
  grade: number;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  /** Dạng 2026-2027. */
  schoolYear: string;
  /** Số học sinh đang hoạt động. */
  activeStudentCount: number;
  /** Sĩ số tối đa (60). */
  maxStudents: number;
  lessonCount: number;
  /** Số học sinh chưa đăng nhập lần nào. */
  neverLoggedInCount: number;
  createdAt: string | null;
}

/** Biểu mẫu tạo và sửa lớp. `confirmLevelChange` là lời xác nhận khi sửa khối sang cấp khác trong lúc lớp đã có bài học. */
export interface ClassInput {
  name: string;
  grade: number;
  schoolYear: string;
  confirmLevelChange?: boolean;
}

/** Dòng học sinh ở tab Học sinh của Chi tiết lớp. */
export interface ClassStudent {
  id: number;
  studentCode: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  /** Đã đổi mật khẩu lần đầu chưa. */
  passwordChanged: boolean;
  createdAt: string | null;
}

export type StudentStatusFilter = 'all' | 'active' | 'inactive';

export interface ClassStudentList {
  items: ClassStudent[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  /** Số học sinh đang hoạt động. */
  activeCount: number;
  maxStudents: number;
}

/** Một phiếu đăng nhập: mật khẩu chỉ có ở đây, chỉ hiện đúng một lần. */
export interface LoginSheetEntry {
  studentId: number;
  fullName: string;
  className: string;
  studentCode: string;
  /** Mật khẩu ghi trên phiếu: mật khẩu tạm (cấp 2, 3) hoặc mật khẩu dùng luôn gồm 6 chữ số (cấp 1). */
  temporaryPassword: string;
}

/** Dữ liệu in phiếu đăng nhập: các câu chung của mọi phiếu và từng phiếu của mỗi học sinh. */
export interface LoginSheet {
  className: string;
  loginUrl: string;
  appDownloadUrl: string | null;
  instructions: string[];
  firstLoginReminder: string;
  notice: string;
  /**
   * true: mật khẩu tạm, em phải đổi ở lần đăng nhập đầu (lớp cấp 2, 3). false: lớp cấp 1, mật khẩu đơn giản em dùng luôn, không phải đổi;
   * giao diện gọi là "Mật khẩu" thay cho "Mật khẩu tạm".
   */
  passwordIsTemporary: boolean;
  entries: LoginSheetEntry[];
}

/** Kết quả thêm từng em. */
export interface StudentsCreated {
  students: ClassStudent[];
  sheet: LoginSheet;
}

export interface ImportPreviewRow {
  /** Số dòng trong tệp hoặc văn bản gốc (dòng tiêu đề là dòng 1). */
  rowNumber: number;
  fullName: string | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
  remainingCapacity: number;
  maxStudents: number;
}

export interface ImportSkippedRow {
  rowNumber: number;
  fullName: string | null;
  errors: string[];
}

export interface ImportResult {
  addedCount: number;
  skippedCount: number;
  skipped: ImportSkippedRow[];
  message: string;
  created: StudentsCreated;
}

export interface ImportRowBody {
  rowNumber: number;
  fullName: string;
}
