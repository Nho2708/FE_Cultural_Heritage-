import { studentCodeOf, type StudentClassDetail, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../lib/api/client';

// Dữ liệu của trang học: lớp của em lấy mới từ máy chủ mỗi lần mở trang (giáo viên có thể vừa sửa khối lớp), hồ sơ trong
// phiên chỉ dùng làm dữ liệu dự phòng khi chờ.

export const classroomQueryKey = ['student', 'class'] as const;

export function useClassroom() {
  return useQuery({
    queryKey: classroomQueryKey,
    queryFn: () => studentApi.classroom().then((r) => r.data),
  });
}

/** Một dòng thông tin của em hoặc của lớp: nhãn và giá trị. */
export interface Fact {
  label: string;
  value: string;
}

/** Thông tin của lớp theo thứ tự hiện trên trang: lớp, khối, cấp học, năm học, giáo viên, trường. */
export function classFacts(classroom: StudentClassDetail): Fact[] {
  const facts: Array<[string, string | null | undefined]> = [
    ['Lớp', classroom.name],
    ['Khối', String(classroom.grade)],
    ['Cấp học', SCHOOL_LEVEL_LABEL[classroom.schoolLevel]],
    ['Năm học', classroom.schoolYear],
    ['Giáo viên', classroom.teacherName],
    ['Trường', classroom.organization?.name],
  ];
  return facts.filter((f): f is [string, string] => Boolean(f[1])).map(([label, value]) => ({ label, value }));
}

/** Dòng giới thiệu ngắn của em: họ tên · mã học sinh. */
export function whoAmI(user: StudentProfile): string {
  return [user.fullName, studentCodeOf(user)].filter(Boolean).join(' · ');
}
