import { pathOf } from '../access/screens';
import { studentApi } from '../lib/api/client';

// Dữ liệu của khu Bài học của học sinh: mở bài bằng mã và đường dẫn. Hàm thuần của bố cục (tách đoạn, lọc phần) nằm ở gói
// dùng chung, dùng chung với phần giáo viên xem trước.

export const lessonQueryKey = (code: string) => ['student', 'lesson', code] as const;

/** Mở bài bằng mã đã chuẩn hóa. Mã sai / chưa xuất bản / không thuộc lớp của em đều là cùng một câu 404. */
export const lessonQueryFn = (code: string) => () => studentApi.lessonByCode(code).then((r) => r.data);

export const lessonPath = (code: string) => `${pathOf('lesson').replace(':maBaiHoc', '')}${encodeURIComponent(code)}`;

export const quizPath = (code: string, quizId: number) => `${lessonPath(code)}/kiem-tra/${quizId}`;
