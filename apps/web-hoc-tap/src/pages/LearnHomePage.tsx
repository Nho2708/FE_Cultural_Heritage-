import { ErrorState, LoadingState } from '@dsvhvn/dung-chung/ui';
import { useEffect } from 'react';
import { useClassroom } from '../learn-home/classroom';
import { LevelOne } from '../learn-home/LevelOne';
import { LevelThree } from '../learn-home/LevelThree';
import { LevelTwo } from '../learn-home/LevelTwo';
import { useAuth } from '../lib/auth/context';
import { sessionStore } from '../lib/auth/session';

// Trang học của em: trang đầu sau khi đăng nhập. Ba bản bố cục riêng theo cấp học của lớp (cấp 1: một cột, nút to, ít chữ;
// cấp 2: hai cột cân bằng; cấp 3: gọn như trang tài liệu); bản hiện ra do cấp học trong lớp của em chọn, học sinh không
// chọn tay. Phần của luồng này là thông tin của em và Lớp của em (dữ liệu từ máy chủ); bài kiểm tra đang chờ, bài học của
// em, gợi ý và huy hiệu dựng cùng chức năng học tập.

export function LearnHomePage() {
  const { user } = useAuth();
  const classroom = useClassroom();

  // Giáo viên vừa sửa khối lớp: bộ giao diện (đọc từ hồ sơ trong phiên) đổi theo cấp mới ngay, không đợi lần tải trang sau.
  const level = classroom.data?.schoolLevel;
  useEffect(() => {
    const current = sessionStore.getSession()?.user;
    if (level && current && current.schoolLevel !== level) sessionStore.updateUser({ ...current, schoolLevel: level });
  }, [level]);

  if (!user) return null; // route guard đã chặn Khách

  if (classroom.isPending) {
    return (
      <section className="dsv-content dsv-section">
        <title>Trang học của em · DiViet</title>
        <LoadingState rows={3} />
      </section>
    );
  }
  if (classroom.isError) {
    return (
      <section className="dsv-content dsv-section">
        <title>Trang học của em · DiViet</title>
        <ErrorState error={classroom.error} onRetry={() => void classroom.refetch()} />
      </section>
    );
  }

  const Layout = { 1: LevelOne, 2: LevelTwo, 3: LevelThree }[classroom.data.schoolLevel];
  return <Layout user={user} classroom={classroom.data} />;
}
