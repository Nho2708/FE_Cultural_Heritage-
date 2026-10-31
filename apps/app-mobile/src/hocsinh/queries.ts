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

export function useStudentRecommendations(enabled = true) {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({ queryKey: ['student', user, 'recommendations'], enabled: enabled && user !== null, queryFn: async () => (await studentApi.recommendations()).data });
}

/** Cấp 1: album di sản của em (thẻ đã có trước, rồi thẻ chưa có theo thứ tự bài học). */
export function useStudentAlbum() {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({ queryKey: ['student', user, 'album'], enabled: user !== null, staleTime: 0, queryFn: async () => (await studentApi.album()).data });
}

/** Thông báo của em: dùng chung cho nút chuông và màn hình Thông báo, tự làm mới mỗi phút để thấy bài thầy cô vừa giao. */
export function useStudentNotifications() {
  const { studentApi } = useServices();
  const user = useStudentKey();
  return useQuery({
    queryKey: ['student', user, 'notifications'],
    enabled: user !== null,
    refetchInterval: 60_000,
    queryFn: async () => (await studentApi.notifications()).data,
  });
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
