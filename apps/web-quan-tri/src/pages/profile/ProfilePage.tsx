import { TabPanel, Tabs, type TabItem } from '@dsvhvn/dung-chung/ui';
import { useSearchParams } from 'react-router';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../lib/auth/context';
import { ChangePasswordTab } from './ChangePasswordTab';
import { ProfileInfoTab } from './ProfileInfoTab';

// Hồ sơ cá nhân (nhiều tab) — dùng chung cho giáo viên, quản trị trường, quản trị hệ thống; hiện trong khu làm việc của
// người đang đăng nhập. Tab đang mở giữ trên URL bằng ?tab= (giá trị chữ Việt không dấu) để quay lại hoặc gửi được
// đúng tab.

type ProfileTab = 'thong-tin' | 'doi-mat-khau';

const ID_PREFIX = 'ho-so';

const ITEMS: TabItem<ProfileTab>[] = [
  { id: 'thong-tin', label: 'Thông tin' },
  { id: 'doi-mat-khau', label: 'Đổi mật khẩu' },
];

export function ProfilePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  if (!user) return null; // route guard đã chặn Khách

  const requested = params.get('tab');
  const tab = ITEMS.find((t) => t.id === requested)?.id ?? 'thong-tin';
  const selectTab = (id: ProfileTab) => setParams(id === 'thong-tin' ? {} : { tab: id }, { replace: true });

  return (
    <AreaPage>
      <PageHeader title="Hồ sơ cá nhân" />
      <div>
        <Tabs idPrefix={ID_PREFIX} label="Hồ sơ cá nhân" items={ITEMS} value={tab} onChange={selectTab} />
        <TabPanel idPrefix={ID_PREFIX} id={tab}>
          {/* key: đổi người dùng (tab khác đăng nhập tài khoản khác) thì dựng lại biểu mẫu từ hồ sơ mới. */}
          {tab === 'thong-tin' && <ProfileInfoTab key={user.id} user={user} />}
          {tab === 'doi-mat-khau' && <ChangePasswordTab key={user.id} />}
        </TabPanel>
      </div>
    </AreaPage>
  );
}
