import { useQuery } from '@tanstack/react-query';
import { useAuth, useServices } from '../state/AppProvider';

// Truy vấn của chế độ Học sinh. Khóa có mã học sinh để đổi người dùng thì không dùng lại dữ liệu của người trước.

function useStudentKey(): number | null {
  return useAuth().session?.user.id ?? null;
}

export function useStudentHome() {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({ queryKey: ['student', user, 'home'], enabled: user !== null, staleTime: 0, queryFn: async () => (await studentApi.home()).data });
}

export function useStudentProgress() {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({ queryKey: ['student', user, 'progress'], enabled: user !== null, queryFn: async () => (await studentApi.progress()).data });
}

export function useStudentHistory(page = 1) {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({ queryKey: ['student', user, 'history', page], enabled: user !== null, queryFn: async () => (await studentApi.history(page, 10)).data });
}

export function useStudentRecommendations() {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({ queryKey: ['student', user, 'recommendations'], enabled: user !== null, queryFn: async () => (await studentApi.recommendations()).data });
}

/** Mở bài học bằng mã. Mã sai tính vào giới hạn nhập sai của máy chủ nên không tự thử lại. */
export function useLessonByCode(code: string | undefined) {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({
    queryKey: ['student', user, 'lesson', code],
    enabled: user !== null && Boolean(code),
    retry: false,
    queryFn: async () => (await studentApi.lessonByCode(code!)).data,
  });
}
