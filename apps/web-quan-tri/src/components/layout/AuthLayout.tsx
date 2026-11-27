import { BrandLogo } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';
import { LEARNING_WEB_URL } from '../../config/env';
import type { AuthPhoto } from './authPhotos';

// Khung chung của Đăng nhập, Quên / đặt mật khẩu theo khung Figma: nửa trái là ảnh tư liệu phủ kín với lớp phủ
// chuyển màu và chú thích chữ trắng, nửa phải là biểu mẫu. Dưới 841px chỉ còn biểu mẫu. Dưới biểu mẫu có lối tới trang Chính sách
// quyền riêng tư (nằm ở web học tập, chung cho mọi phần của DiViet).

const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

interface AuthLayoutProps {
  photo: AuthPhoto;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ photo, title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="dsvmd:grid dsvmd:min-h-[calc(100dvh-var(--dsv-topbar-height))] dsvmd:grid-cols-2">
      <title>{`${title} · DiViet`}</title>
      <figure className="relative hidden overflow-hidden bg-(--dsv-card-placeholder-bg) dsvmd:block">
        {/* Chỉ tải ảnh từ 841px: dưới mốc này khung ảnh bị ẩn, <source> theo media query tránh tải thừa trên điện thoại. */}
        <picture>
          <source media="(min-width: 841px)" srcSet={photo.src} />
          <img
            src={BLANK_PIXEL}
            alt={photo.alt}
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-(--dsv-card-scrim-strong) to-(--dsv-card-scrim-top) px-10 pt-24 pb-10 text-(--dsv-card-title-fg)">
          <p className="type-label-kicker">{photo.kicker}</p>
          <p className="mt-2 max-w-[560px] type-display-xl">{photo.title}</p>
          <p className="mt-2 type-label text-on-image-variant">{photo.credit}</p>
        </figcaption>
      </figure>

      <div className="flex justify-center px-4 py-10 dsvmd:items-center dsvmd:px-10 dsvmd:py-16">
        <div className="w-full max-w-[400px]">
          {/* Biểu tượng không có chữ nên tên "DiViet" viết ngay cạnh; biểu tượng chỉ là hình trang trí. */}
          <div className="mb-6 flex items-center gap-3">
            <BrandLogo variant="badge" size={80} decorative />
            <span className="type-h3 text-on-surface">DiViet</span>
          </div>
          <h1 className="type-h2 text-on-surface dsvmd:type-display-l">{title}</h1>
          {subtitle && <p className="mt-2 type-body-m text-on-surface-variant">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          <p className="mt-8 type-body-s text-on-surface-variant">
            <a href={`${LEARNING_WEB_URL}/chinh-sach-quyen-rieng-tu`} className="text-link underline underline-offset-4">
              Chính sách quyền riêng tư
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
