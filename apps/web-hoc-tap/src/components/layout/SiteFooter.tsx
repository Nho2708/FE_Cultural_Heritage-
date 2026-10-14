import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { pathOf } from '../../access/screens';
import { ANDROID_APP_URL } from '../../config/env';
import { useAuth } from '../../lib/auth/context';
import { useI18n } from '../../i18n/context';

// Chân trang của web học tập: liên kết khám phá, liên kết học sinh, liên kết về Vietnam Heritage (Giới thiệu, Dành cho nhà
// trường), dòng ghi nguồn nội dung di sản và ghi công ảnh.
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
  const { t } = useI18n();
  const f = t.footer;
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface">
      <div className="dsv-content flex flex-col gap-8 py-12">
        <div className="flex flex-col justify-between gap-8 dsvmd:flex-row">
          <div className="flex max-w-[420px] flex-col gap-2">
            <p className="type-h3">{t.brandName}</p>
            <p className="type-body-s">{f.about}</p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <Column title={f.explore}>
              <Link to={pathOf('search')} className={LINK}>
                {f.search}
              </Link>
              <Link to={pathOf('map')} className={LINK}>
                {f.map}
              </Link>
              <Link to={pathOf('timeline')} className={LINK}>
                {f.timeline}
              </Link>
            </Column>
            <Column title={f.students}>
              {user ? (
                <Link to={pathOf('learnHome')} className={LINK}>
                  {f.studentHome}
                </Link>
              ) : (
                <Link to={pathOf('login')} className={LINK}>
                  {f.signIn}
                </Link>
              )}
              {ANDROID_APP_URL && (
                <a href={ANDROID_APP_URL} className={LINK}>
                  {f.android}
                </a>
              )}
            </Column>
            <Column title={f.aboutColumn}>
              <Link to={pathOf('about')} className={LINK}>
                {f.intro}
              </Link>
              <Link to={pathOf('forSchools')} className={LINK}>
                {f.forSchools}
              </Link>
            </Column>
          </div>
        </div>
        <hr className="border-0 border-t border-inverse-on-surface/30" />
        <div className="flex flex-col justify-between gap-2 type-body-s dsvmd:flex-row">
          <p>{f.source}</p>
          <p className="shrink-0">{f.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
