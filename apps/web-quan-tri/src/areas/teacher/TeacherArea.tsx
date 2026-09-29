import type { ReactNode } from 'react';
import { AREA_ROOT } from '../../access/screens';
import { AreaLayout } from '../../components/layout/AreaLayout';
import { teacherNav } from '../../components/layout/navigation';
import { useAuth } from '../../lib/auth/context';

// Khu giáo viên /giao-vien. Tải lười: chunk này chỉ tải khi người dùng là giáo viên.
// Thanh bên: Lớp học · Bài học · Ngân hàng câu hỏi · Bài kiểm tra. Thanh báo gói hết hiệu lực thêm khi có API cho giáo
// viên đọc gói của trường (cùng đồng hồ hạn mức AI).
export default function TeacherArea({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return (
    <AreaLayout title="Khu giáo viên" context={user?.organization?.name} root={AREA_ROOT.teacher} items={teacherNav(user?.role)}>
      {children}
    </AreaLayout>
  );
}
