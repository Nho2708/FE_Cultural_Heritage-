import { cn } from '@dsvhvn/dung-chung';
import { AnimatedLogo, useRevealOnce } from '@dsvhvn/dung-chung/ui';
import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

// Phần dựng chung của trang Giới thiệu và trang Dành cho nhà trường: khối đầu trang nền xanh than của logo với huy hiệu
// chuyển động, nút trên nền xanh than, tiêu đề mục và nhóm phần tử hiện lên lần lượt khi cuộn tới.

/** Nút trên nền xanh than: nền kem chữ xanh than (9,2:1) hoặc viền kem. Vòng focus dùng kiểu "trên ảnh" để thấy rõ trên nền tối. */
const HERO_ACTION = 'on-image inline-flex h-12 items-center gap-2 rounded-sm px-6 type-control transition-colors';
const HERO_PRIMARY = 'bg-(--color-brand-cream) text-(--color-brand-navy) hover:bg-white';
const HERO_SECONDARY = 'border-[1.5px] border-(--color-brand-cream) text-(--color-brand-cream) hover:bg-white/10';

export function HeroLink({ secondary = false, className, ...rest }: LinkProps & { secondary?: boolean }) {
  return <Link className={cn(HERO_ACTION, secondary ? HERO_SECONDARY : HERO_PRIMARY, typeof className === 'string' ? className : undefined)} {...rest} />;
}

export function HeroAnchor({ secondary = false, className, children, ...rest }: ComponentProps<'a'> & { secondary?: boolean }) {
  return (
    <a className={cn(HERO_ACTION, secondary ? HERO_SECONDARY : HERO_PRIMARY, className)} {...rest}>
      {children}
    </a>
  );
}

interface IntroHeroProps {
  headingId: string;
  kicker: string;
  title: string;
  text: string;
  actions: ReactNode;
}

/** Khối đầu trang: chữ bên trái, huy hiệu chuyển động bên phải (trên điện thoại huy hiệu nằm trên tiêu đề). Huy hiệu không có chữ nên tên "DiViet" viết ngay dưới. */
export function IntroHero({ headingId, kicker, title, text, actions }: IntroHeroProps) {
  return (
    <section aria-labelledby={headingId} className="bg-(--color-brand-navy) text-(--color-brand-cream)">
      <div className="dsv-content grid items-center gap-8 py-12 dsvmd:grid-cols-[minmax(0,1fr)_auto] dsvmd:gap-16 dsvmd:py-20">
        <div className="flex flex-col items-center gap-3 dsvmd:order-2">
          <AnimatedLogo decorative className="size-[136px] dsvmd:size-[240px]" />
          <p className="type-h3 text-white">DiViet</p>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-4 dsvmd:order-1">
          <p className="type-label-kicker text-(--color-brand-gold)">{kicker}</p>
          <span aria-hidden="true" className="dsv-draw-x block h-[3px] w-14 rounded-full bg-(--color-brand-gold)" />
          <h1 id={headingId} className="max-w-[760px] type-display-xl text-white">
            {title}
          </h1>
          <p className="max-w-[640px] type-body-l">{text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>
        </div>
      </div>
    </section>
  );
}

export function SectionTitle({ id, title, text, className }: { id: string; title: string; text?: string; className?: string }) {
  return (
    <div className={cn('max-w-[760px]', className)}>
      <h2 id={id} className="type-h2 text-(--dsv-section-heading-fg) dsvmd:type-display-l">
        {title}
      </h2>
      {text && <p className="mt-2 type-body-m text-(--dsv-section-subheading-fg)">{text}</p>}
    </div>
  );
}

/** Danh sách có các phần tử hiện lên lần lượt một lần khi cuộn tới. */
export function RevealList({ as: Tag = 'ul', className, children }: { as?: 'ul' | 'ol'; className?: string; children: ReactNode }) {
  const { ref, state } = useRevealOnce<HTMLUListElement & HTMLOListElement>();
  return (
    <Tag ref={ref} data-reveal={state} className={className}>
      {children}
    </Tag>
  );
}
