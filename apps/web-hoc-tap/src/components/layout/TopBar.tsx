import { cn } from '@dsvhvn/dung-chung';
import { BrandLogo, Icon, PillLink } from '@dsvhvn/dung-chung/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { pathOf } from '../../access/screens';
import { useI18n } from '../../i18n/context';
import { LanguageDialog } from '../../i18n/LanguageDialog';
import { languageOption } from '../../i18n/languages';
import { useAuth } from '../../lib/auth/context';
import { AccountMenu } from './AccountMenu';
import { primaryNav, type NavItem } from './navigation';

// Thanh điều hướng trên của web học tập: cố định, cao 56px. Chưa đăng nhập: Khám phá · Bản đồ · Dòng thời gian · nút
// "Học sinh đăng nhập". Học sinh đã đăng nhập: Trang học · Nhập mã · Tiến độ · Khám phá · Bản đồ · Dòng thời gian ·
// menu tài khoản. Điều hướng ngang chỉ hiện từ 841px; dưới đó gom vào ngăn kéo.

const ROUND_BUTTON =
  'flex size-12 shrink-0 items-center justify-center rounded-full text-(--dsv-topbar-icon) ' +
  'transition-colors duration-(--dsv-duration-control) ease-header hover:bg-(--dsv-topbar-hover-bg)';

const NAV_LINK = 'rounded-xs px-2 py-2.5 type-control transition-colors duration-(--dsv-duration-fast)';

export function Wordmark({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/" className={cn('flex min-w-0 items-center gap-2 rounded-xs px-2 py-1', className)}>
      <BrandLogo variant="emblem" size={32} decorative />
      <span className="flex min-w-0 flex-col justify-center">
        {/* Màn hình hẹp: tên "Vietnam Heritage" xuống hai dòng; hẹp hơn 384 px thì chỉ còn biểu tượng (tên vẫn đọc được bằng trình đọc màn hình) để không chui dưới nút đăng nhập. */}
        <span className="type-h3 leading-5 text-on-surface max-[24rem]:sr-only dsvsm:whitespace-nowrap">{t.brandName}</span>
        <span className="hidden truncate type-label text-on-surface-muted dsvsm:block">{t.brandTagline}</span>
      </span>
    </Link>
  );
}

function NavDrawer({ open, onClose, items, onChooseLanguage }: { open: boolean; onClose: () => void; items: NavItem[]; onChooseLanguage: (() => void) | null }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Bấm vào nền mờ thì đóng: khi đó target là chính <dialog> vì nội dung đã có lớp bọc kín khung. Esc do trình duyệt lo.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('click', onClick);
    return () => dialog.removeEventListener('click', onClick);
  }, [onClose]);

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'ml-[25px] flex h-12 items-center gap-6 rounded-drawer pr-6 pl-4 type-control text-(--dsv-drawer-item-fg)',
      isActive ? 'bg-(--dsv-drawer-item-active-bg)' : 'hover:bg-(--dsv-drawer-item-hover-bg)',
    );

  return (
    <dialog
      ref={ref}
      aria-label={t.nav.menu}
      onClose={onClose}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-(--dsv-drawer-width) max-w-[calc(100%-48px)] bg-(--dsv-drawer-bg) p-0 text-on-surface shadow-drawer backdrop:bg-(--dsv-drawer-scrim)"
    >
      <div className="h-full overflow-y-auto py-2">
        <div className="flex h-12 items-center gap-1 pr-2 pl-1">
          <button type="button" onClick={onClose} aria-label={t.nav.closeMenu} className={ROUND_BUTTON}>
            <Icon name="x" size={24} />
          </button>
          <Wordmark />
        </div>
        <nav aria-label={t.nav.menuItems} className="mt-2">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className={itemClass} onClick={onClose}>
                  {item.icon && <Icon name={item.icon} size={20} />}
                  {item.label}
                </NavLink>
              </li>
            ))}
            {onChooseLanguage && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onChooseLanguage();
                  }}
                  className="ml-[25px] flex h-12 w-[calc(100%-25px)] items-center gap-6 rounded-drawer pr-6 pl-4 text-left type-control text-(--dsv-drawer-item-fg) hover:bg-(--dsv-drawer-item-hover-bg)"
                >
                  <Icon name="languages" size={20} />
                  {t.nav.language}
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </dialog>
  );
}

export function TopBar() {
  const { user } = useAuth();
  const { language, t, canChoose } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  // Ngăn kéo gắn với lần điều hướng lúc mở: chọn một mục (chuyển trang) là tự đóng.
  const location = useLocation();
  const [drawerOpenAt, setDrawerOpenAt] = useState<string | null>(null);
  const drawerOpen = drawerOpenAt === location.key;
  const closeDrawer = useCallback(() => setDrawerOpenAt(null), []);
  const items = primaryNav(user !== null, t);
  const drawerItems: NavItem[] = [
    { to: '/', label: t.nav.home, icon: 'home' },
    ...items,
    ...(user ? [] : [{ to: pathOf('login'), label: t.nav.studentSignIn, icon: 'user' } satisfies NavItem]),
  ];

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-(--dsv-z-topbar) h-(--dsv-topbar-height) bg-(--dsv-topbar-bg) text-(--dsv-topbar-fg)',
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-[calc(100%-3px)] after:h-[3px] after:shadow-topbar after:content-['']",
      )}
    >
      <div className="flex h-full items-center gap-1 px-1 dsvmd:px-2">
        <button
          type="button"
          onClick={() => setDrawerOpenAt(location.key)}
          aria-label={t.nav.openMenu}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className={cn(ROUND_BUTTON, 'dsvmd:hidden')}
        >
          <Icon name="menu" size={24} />
        </button>
        <Wordmark className="mr-auto" />

        <nav aria-label={t.nav.mainMenu} className="hidden items-center gap-1 dsvmd:flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(NAV_LINK, isActive ? 'text-primary' : 'text-(--dsv-topbar-fg) hover:bg-(--dsv-topbar-hover-bg)')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {canChoose && (
          <button
            type="button"
            onClick={() => setLanguageOpen(true)}
            aria-haspopup="dialog"
            aria-label={`${t.nav.language}: ${languageOption(language).nativeName}`}
            className="ml-1 hidden h-11 items-center gap-2 rounded-sm border border-(--dsv-input-border) px-3 type-control text-(--dsv-topbar-fg) transition-colors hover:bg-(--dsv-topbar-hover-bg) dsvmd:flex"
          >
            <Icon name="languages" size={20} />
            <span lang={language}>{languageOption(language).nativeName}</span>
            <Icon name="chevron-down" size={16} />
          </button>
        )}

        {user ? (
          <span className="ml-1 dsvmd:ml-4">
            <AccountMenu />
          </span>
        ) : (
          <PillLink to={pathOf('login')} className="mr-2 ml-1 shrink-0 dsvmd:ml-4">
            {t.nav.studentSignIn}
          </PillLink>
        )}
      </div>
      <NavDrawer open={drawerOpen} onClose={closeDrawer} items={drawerItems} onChooseLanguage={canChoose ? () => setLanguageOpen(true) : null} />
      {canChoose && <LanguageDialog open={languageOpen} onClose={() => setLanguageOpen(false)} />}
    </header>
  );
}
