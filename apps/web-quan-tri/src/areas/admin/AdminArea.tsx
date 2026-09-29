import type { ReactNode } from 'react';
import { AREA_ROOT } from '../../access/screens';
import { AreaLayout } from '../../components/layout/AreaLayout';
import { adminNav } from '../../components/layout/navigation';
import { useAuth } from '../../lib/auth/context';

// Khu quản trị hệ thống /quan-tri. Tải lười: chunk này chỉ tải khi người dùng là quản trị hệ thống.
// Khu quản trị hệ thống bật dark mode theo hệ điều hành.
export default function AdminArea({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return (
    <AreaLayout title="Quản trị hệ thống" root={AREA_ROOT.admin} items={adminNav(user?.role)} theme="system">
      {children}
    </AreaLayout>
  );
}
