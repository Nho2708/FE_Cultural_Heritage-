import { ButtonLink } from '@dsvhvn/dung-chung/ui';
import { pathOf, type Screen } from '../access/screens';
import { useAuth } from '../lib/auth/context';

// Chỗ giữ cho màn hình đã có route và quyền truy cập nhưng chưa được dựng. Khi dựng màn hình, thay phần tử này trong
// BUILT của app/router.tsx, giữ nguyên đường dẫn và guard.

export function PendingScreen({ screen }: { screen: Screen }) {
  const { user } = useAuth();
  return (
    <section className="dsv-content dsv-section">
      <title>{`${screen.name} · Vietnam Heritage`}</title>
      <div className="max-w-[760px] py-10">
        <p className="type-label-kicker text-on-surface-muted">ĐANG XÂY DỰNG</p>
        <h1 className="mt-2 type-h1 text-on-surface">{screen.name}</h1>
        <p className="mt-3 type-body-m text-on-surface-variant">Trang này sẽ có trong bản sau.</p>
        <div className="mt-8">
          <ButtonLink to={user ? pathOf('learnHome') : '/'} variant="secondary" size="lg">
            {user ? 'Về trang học của em' : 'Về trang chủ'}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
