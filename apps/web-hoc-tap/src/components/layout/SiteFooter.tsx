import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { pathOf } from '../../access/screens';
import { ANDROID_APP_URL } from '../../config/env';
import { useAuth } from '../../lib/auth/context';
import { APP_NAME } from './TopBar';

// Chân trang của web học tập: liên kết khám phá, liên kết học sinh, dòng ghi nguồn nội dung di sản và ghi công ảnh.
// Chỉ đặt liên kết tới trang đã có; "Tải app cho Android" chỉ hiện khi đã cấu hình địa chỉ tệp cài đặt.

const LINK = 'rounded-xs type-body-s text-inverse-on-surface hover:underline underline-offset-4';

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <p className="type-label-kicker">{title}</p>
      {children}
    </nav>
  );
}

export function SiteFooter() {
  const { user } = useAuth();
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface">
      <div className="dsv-content flex flex-col gap-8 py-12">
        <div className="flex flex-col justify-between gap-8 dsvmd:flex-row">
          <div className="flex max-w-[420px] flex-col gap-2">
            <p className="type-h3">{APP_NAME}</p>
            <p className="type-body-s">
              Nền tảng để trường học và giáo viên tạo bài học, bài kiểm tra về di sản Việt Nam; ai cũng có thể khám phá di sản.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <Column title="Khám phá">
              <Link to={pathOf('search')} className={LINK}>
                Tìm kiếm di sản
              </Link>
              <Link to={pathOf('map')} className={LINK}>
                Bản đồ di sản
              </Link>
              <Link to={pathOf('timeline')} className={LINK}>
                Dòng thời gian
              </Link>
            </Column>
            <Column title="Học sinh">
              {user ? (
                <Link to={pathOf('learnHome')} className={LINK}>
                  Trang học của em
                </Link>
              ) : (
                <Link to={pathOf('login')} className={LINK}>
                  Đăng nhập
                </Link>
              )}
              {ANDROID_APP_URL && (
                <a href={ANDROID_APP_URL} className={LINK}>
                  Tải app cho Android
                </a>
              )}
            </Column>
          </div>
        </div>
        <hr className="border-0 border-t border-inverse-on-surface/30" />
        <div className="flex flex-col justify-between gap-2 type-body-s dsvmd:flex-row">
          <p>Nội dung di sản tham khảo từ Cục Di sản văn hóa (dsvh.gov.vn). Ảnh từ Wikimedia Commons, ghi công theo từng ảnh.</p>
          <p className="shrink-0">© 2026 {APP_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
