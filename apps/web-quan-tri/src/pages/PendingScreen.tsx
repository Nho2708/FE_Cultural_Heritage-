import { ButtonLink } from '@dsvhvn/dung-chung/ui';
import { roleHome } from '../access/access';
import type { Screen } from '../access/screens';
import { useAuth } from '../lib/auth/context';

// Chỗ giữ cho màn hình đã có route và quyền truy cập nhưng chưa được dựng. Khi dựng màn hình, thay phần tử này trong
// BUILT của app/router.tsx, giữ nguyên đường dẫn và guard.

export function PendingScreen({ screen }: { screen: Screen }) {
  const { user } = useAuth();
  const home = user ? roleHome(user.role) : null;
  return (
    <section className="px-4 py-6 dsvmd:px-8 dsvmd:py-8">
      <title>{`${screen.name} · DSVHVN`}</title>
      <div className="max-w-[760px] py-4">
        <p className="type-label-kicker text-on-surface-muted">ĐANG XÂY DỰNG</p>
        <h1 className="mt-2 type-h1 text-on-surface">{screen.name}</h1>
        <p className="mt-3 type-body-m text-on-surface-variant">
          Màn hình này sẽ có trong bản sau. Bản hiện tại có đăng nhập bằng email hoặc tên đăng nhập, đặt mật khẩu qua
          email, hồ sơ cá nhân, quản lý giáo viên của trường, quản lý trường và nhật ký thao tác.
        </p>
        {home && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink to={home} variant="secondary">
              Về trang làm việc của tôi
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}
