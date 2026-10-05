import type {
  ClassInput,
  ClassRoom,
  ClassStudent,
  ClassStudentList,
  DownloadedFile,
  ImportPreview,
  ImportResult,
  ImportRowBody,
  LoginSheet,
  Paged,
  StudentsCreated,
  StudentStatusFilter,
} from '@dsvhvn/dung-chung/api';
import { apiClient, apiRequest } from './client';
import type { PageQuery } from './endpoints';

// Endpoint của luồng Lớp, học sinh và tài khoản học sinh (khu giáo viên). Giáo viên chỉ thấy lớp do mình phụ trách; lớp
// hoặc học sinh của người khác trả 404 như không tồn tại. Mật khẩu tạm chỉ có trong phản hồi tạo hoặc đặt lại.

export interface ClassListQuery extends PageQuery {
  keyword?: string;
  schoolYear?: string;
  grade?: number | '';
}

/** Màn hình Lớp học và hộp thoại sửa lớp. */
export const classesApi = {
  list: (query: ClassListQuery) => apiRequest<Paged<ClassRoom>>('/teacher/classes', { query: { ...query } }),

  create: (body: ClassInput) => apiRequest<ClassRoom>('/teacher/classes', { method: 'POST', body }),

  get: (classId: number) => apiRequest<ClassRoom>(`/teacher/classes/${classId}`),

  /** Sửa khối sang cấp khác khi lớp đã có bài học: máy chủ trả 422 trừ khi có `confirmLevelChange`. */
  update: (classId: number, body: ClassInput) =>
    apiRequest<ClassRoom>(`/teacher/classes/${classId}`, { method: 'PUT', body }),

  /** Xóa mềm lớp và vô hiệu mọi học sinh đang hoạt động; lớp còn bài kiểm tra đang mở thì bị chặn. */
  remove: (classId: number) => apiRequest<null>(`/teacher/classes/${classId}`, { method: 'DELETE' }),
};

export interface StudentListQuery extends PageQuery {
  /** Họ tên hoặc mã học sinh. */
  keyword?: string;
  status?: StudentStatusFilter;
}

/** Tên tệp mẫu khi trình duyệt không đọc được tên máy chủ gửi (header chưa được công bố cho trang khác nguồn). */
export const TEMPLATE_FILE_NAMES = { xlsx: 'mau-danh-sach-hoc-sinh.xlsx', csv: 'mau-danh-sach-hoc-sinh.csv' } as const;

export type TemplateFormat = keyof typeof TEMPLATE_FILE_NAMES;

/** Tab Học sinh của Chi tiết lớp, hộp thoại Thêm học sinh và Phiếu đăng nhập. */
export const studentsApi = {
  list: (classId: number, query: StudentListQuery) =>
    apiRequest<ClassStudentList>(`/teacher/classes/${classId}/students`, { query: { ...query } }),

  /** Thêm từng em: tạo tài khoản và trả phiếu đăng nhập. */
  add: (classId: number, fullName: string) =>
    apiRequest<StudentsCreated>(`/teacher/classes/${classId}/students`, { method: 'POST', body: { fullName } }),

  template: (classId: number, format: TemplateFormat): Promise<DownloadedFile> =>
    apiClient.download(
      `/teacher/classes/${classId}/students/import/template`,
      { query: { format } },
      TEMPLATE_FILE_NAMES[format],
    ),

  /** Xem trước danh sách từ tệp (.xlsx, .csv UTF-8) hoặc từ văn bản dán; chưa lưu gì. */
  preview: (classId: number, source: { file: File } | { text: string }) => {
    const form = new FormData();
    if ('file' in source) form.append('file', source.file);
    else form.append('text', source.text);
    return apiRequest<ImportPreview>(`/teacher/classes/${classId}/students/import/preview`, { method: 'POST', body: form });
  },

  /** Lưu các dòng hợp lệ của bước xem trước trong một giao dịch. */
  import: (classId: number, rows: ImportRowBody[]) =>
    apiRequest<ImportResult>(`/teacher/classes/${classId}/students/import`, { method: 'POST', body: { rows } }),

  /** Đặt lại mật khẩu một hoặc nhiều em đang hoạt động; mọi phiên cũ của các em hết dùng. */
  resetPasswords: (classId: number, studentIds: readonly number[]) =>
    apiRequest<LoginSheet>(`/teacher/classes/${classId}/students/reset-password`, { method: 'POST', body: { studentIds } }),

  rename: (classId: number, studentId: number, fullName: string) =>
    apiRequest<ClassStudent>(`/teacher/classes/${classId}/students/${studentId}`, { method: 'PUT', body: { fullName } }),

  deactivate: (classId: number, studentId: number) =>
    apiRequest<ClassStudent>(`/teacher/classes/${classId}/students/${studentId}/deactivate`, { method: 'POST' }),

  reactivate: (classId: number, studentId: number) =>
    apiRequest<ClassStudent>(`/teacher/classes/${classId}/students/${studentId}/reactivate`, { method: 'POST' }),

  /** Xóa mềm học sinh cùng tài khoản; không mở lại được. */
  remove: (classId: number, studentId: number) =>
    apiRequest<null>(`/teacher/classes/${classId}/students/${studentId}`, { method: 'DELETE' }),
};
