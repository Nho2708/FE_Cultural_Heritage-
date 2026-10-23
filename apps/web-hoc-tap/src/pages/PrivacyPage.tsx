import { Icon } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';
import { localeOf } from '../i18n/format';
import { useI18n } from '../i18n/context';
import { PRIVACY_POLICIES, PRIVACY_UPDATED_ON, type PrivacyBlock } from '../privacy';

// Trang Chính sách quyền riêng tư (công khai, 5 ngôn ngữ, không cần đăng nhập, không gọi API): Google Play, AdMob và AdSense
// yêu cầu một địa chỉ công khai cố định; app và web quản trị trỏ tới đây. Nội dung theo ngôn ngữ đang chọn; bản dịch có dòng ghi
// chú rằng bản tiếng Việt được áp dụng khi có khác biệt. Địa chỉ trang web và email trong chữ hiện thành liên kết.

// Địa chỉ dài (trang chính sách của Google) được phép ngắt dòng ở bất kỳ đâu để không tràn ngang trên điện thoại.
const LINK = 'rounded-xs text-link underline decoration-1 underline-offset-4 [overflow-wrap:anywhere] hover:bg-link-hover-bg';

// Địa chỉ https://… hoặc email trong một câu; dấu chấm cuối câu không thuộc liên kết.
const LINKABLE = /(https:\/\/[^\s,;()]+[^\s,;().]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

function withLinks(text: string): ReactNode[] {
  return text.split(LINKABLE).map((part, index) => {
    if (index % 2 === 0) return part;
    const href = part.startsWith('https://') ? part : `mailto:${part}`;
    return (
      <a key={index} href={href} className={LINK}>
        {part}
      </a>
    );
  });
}

function Block({ block }: { block: PrivacyBlock }) {
  if (typeof block === 'string') return <p>{withLinks(block)}</p>;
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6">
      {block.map((item) => (
        <li key={item}>{withLinks(item)}</li>
      ))}
    </ul>
  );
}

export function PrivacyPage() {
  const { language, t } = useI18n();
  const policy = PRIVACY_POLICIES[language];
  const updated = new Date(`${PRIVACY_UPDATED_ON}T00:00:00Z`).toLocaleDateString(localeOf(language), {
    dateStyle: 'long',
    timeZone: 'UTC',
  });

  return (
    <article aria-labelledby="chinh-sach-tieu-de" className="bg-background py-10 dsvmd:py-14">
      <title>{t.documentTitle(policy.title)}</title>
      <meta name="description" content={policy.description} />
      <div className="dsv-content">
        <div className="mx-auto flex max-w-[800px] flex-col gap-8 type-body-m text-on-surface">
          <header className="flex flex-col gap-3">
            <h1 id="chinh-sach-tieu-de" className="type-h1 dsvmd:type-display-l">
              {policy.title}
            </h1>
            <p className="type-body-s text-on-surface-variant">
              {policy.updatedLabel}: <time dateTime={PRIVACY_UPDATED_ON}>{updated}</time>
            </p>
            {policy.translationNote && (
              <p role="note" className="flex items-start gap-2 rounded-sm bg-surface-container-low px-3 py-2 type-body-s text-on-surface-variant">
                <Icon name="info" size={16} className="mt-[3px] shrink-0" />
                <span>{policy.translationNote}</span>
              </p>
            )}
            {policy.intro.map((paragraph) => (
              <p key={paragraph}>{withLinks(paragraph)}</p>
            ))}
          </header>

          <nav aria-label={policy.contentsLabel} className="rounded-md border border-border bg-surface p-5">
            <p className="type-label-kicker text-on-surface-variant">{policy.contentsLabel}</p>
            <ol className="mt-3 flex flex-col gap-2">
              {policy.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className={LINK}>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {policy.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-tieu-de`} className="flex scroll-mt-24 flex-col gap-3">
              <h2 id={`${section.id}-tieu-de`} className="type-h2">
                {section.heading}
              </h2>
              {section.body.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
