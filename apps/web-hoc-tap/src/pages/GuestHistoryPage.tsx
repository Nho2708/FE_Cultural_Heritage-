import { cn } from '@dsvhvn/dung-chung';
import type { GuestActivityType, GuestHistoryItem } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, ConfirmDialog, EmptyState, Icon, TabPanel, Tabs, useToast } from '@dsvhvn/dung-chung/ui';
import { provinceName } from '@dsvhvn/dung-chung/i18n';
import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { ListNotes } from '../components/ListNotes';
import { PublicErrorState } from '../components/PublicErrorState';
import { useErrorText } from '../components/useErrorText';
import { FILTER_PARAM } from '../discovery/filters';
import { heritagePath } from '../discovery/paths';
import { Thumbnail } from '../discovery/Thumbnail';
import { flattenHistory, useDeleteHistory, useDeleteHistoryItem, useGuestHistory } from '../guest/guestData';
import { useNearby } from '../guest/useNearby';
import { useI18n } from '../i18n/context';
import { formatDateTime, listFlags } from '../i18n/format';
import { LanguageDialog } from '../i18n/LanguageDialog';
import { languageOption } from '../i18n/languages';

// Lịch sử và cài đặt của khách (chỉ khách; học sinh đã đăng nhập được đưa về trang học). Tab Lịch sử: từ khóa đã tìm, di sản đã xem, tóm tắt đã đọc, đã nghe,
// mô hình 3D đã xem, mới nhất trước, xóa từng mục hoặc xóa tất cả (xóa thật trên máy chủ; gợi ý quay về di sản nổi bật). Tab Cài đặt: ngôn ngữ, dùng vị trí
// cho "Gần bạn", và lời giải thích mã thiết bị ẩn danh. Tab nằm trên địa chỉ trang (`?tab=cai-dat`).

type TabId = 'lich-su' | 'cai-dat';

const GROUP_ORDER: readonly GuestActivityType[] = ['SEARCH', 'VIEW', 'READ_SUMMARY', 'LISTEN', 'VIEW_3D'];

const tabOf = (value: string | null): TabId => (value === 'cai-dat' ? 'cai-dat' : 'lich-su');

function HistoryRow({ item, onRemove, removing }: { item: GuestHistoryItem; onRemove: () => void; removing: boolean }) {
  const { language, t } = useI18n();
  const h = t.guest.history;
  const when = formatDateTime(item.createdAt, language);

  if (item.type === 'SEARCH') {
    const keyword = item.query ?? '';
    return (
      <li className="flex items-center gap-3 py-3">
        <Link
          to={{ pathname: pathOf('search'), search: `?${FILTER_PARAM.keyword}=${encodeURIComponent(keyword)}` }}
          aria-label={h.searchAgain(keyword)}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-sm"
        >
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-surface-container text-on-surface-variant">
            <Icon name="search" size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate type-h4 text-on-background">{keyword}</span>
            <span className="type-body-s text-on-surface-variant">{when}</span>
          </span>
        </Link>
        <Button variant="ghost" size="icon" aria-label={h.remove(keyword)} disabled={removing} onClick={onRemove}>
          <Icon name="trash" size={20} />
        </Button>
      </li>
    );
  }

  const card = item.heritage;
  if (!card) return null;
  const province = provinceName(card.provinceName, language);
  return (
    <li className="flex items-center gap-3 py-3">
      <Link to={heritagePath(card.slug)} className="flex min-w-0 flex-1 items-center gap-4 rounded-sm">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-(--dsv-card-placeholder-bg)">
          <Thumbnail url={card.thumbnailUrl} width={160} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate type-h4 text-on-background">{card.name}</span>
          <span className="type-body-s text-on-surface-variant">{[province, when].filter(Boolean).join(' · ')}</span>
        </span>
      </Link>
      <Button variant="ghost" size="icon" aria-label={h.remove(card.name)} disabled={removing} onClick={onRemove}>
        <Icon name="trash" size={20} />
      </Button>
    </li>
  );
}

function HistoryTab() {
  const { t } = useI18n();
  const h = t.guest.history;
  const toast = useToast();
  const errorText = useErrorText();
  const history = useGuestHistory();
  const removeOne = useDeleteHistoryItem();
  const removeAll = useDeleteHistory();
  const [confirmClear, setConfirmClear] = useState(false);
  const items = flattenHistory(history.data?.pages).filter((item) => item.type === 'SEARCH' || item.heritage !== null);

  if (history.isPending) {
    return (
      <output aria-busy="true" className="block type-body-m text-on-surface-variant">
        {h.loading}
      </output>
    );
  }
  if (history.isError && !history.data) return <PublicErrorState error={history.error} onRetry={() => void history.refetch()} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon="clock"
        title={h.empty}
        action={<ButtonLink to={pathOf('search')}>{h.exploreCta}</ButtonLink>}
      >
        {h.retention}
      </EmptyState>
    );
  }

  const groups = GROUP_ORDER.map((type) => ({ type, items: items.filter((item) => item.type === type) })).filter((group) => group.items.length > 0);
  const flags = listFlags(items.flatMap((item) => (item.heritage ? [item.heritage] : [])));

  const clearAll = () =>
    removeAll.mutate(undefined, {
      onSuccess: () => {
        setConfirmClear(false);
        toast.success(h.cleared);
      },
      onError: (error) => {
        setConfirmClear(false);
        toast.error(errorText(error));
      },
    });
  const remove = (id: number) =>
    removeOne.mutate(id, {
      onSuccess: () => toast.success(h.removed),
      onError: (error) => toast.error(errorText(error)),
    });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-s text-on-surface-variant">{h.retention}</p>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>
          {h.clearAll}
        </Button>
      </div>
      <ListNotes flags={flags} />
      {groups.map((group) => (
        <section key={group.type} aria-labelledby={`nhom-${group.type}`}>
          <h2 id={`nhom-${group.type}`} className="type-h3 text-on-background">
            {h.groups[group.type]}
          </h2>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {group.items.map((item) => (
              <HistoryRow key={item.id} item={item} removing={removeOne.isPending && removeOne.variables === item.id} onRemove={() => remove(item.id)} />
            ))}
          </ul>
        </section>
      ))}
      {history.hasNextPage && (
        <div>
          <Button variant="secondary" loading={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
            {h.loadMore}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmClear}
        title={h.clearTitle}
        confirmLabel={h.clearConfirm}
        cancelLabel={h.cancel}
        tone="danger"
        confirming={removeAll.isPending}
        onConfirm={clearAll}
        onClose={() => setConfirmClear(false)}
      >
        {h.clearText}
      </ConfirmDialog>
    </div>
  );
}

function SettingRow({ title, text, control, children }: { title: string; text?: string; control: ReactNode; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-6 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 max-w-[620px] flex-col gap-1">
          <h2 className="type-h4 text-on-background">{title}</h2>
          {text && <p className="type-body-s text-on-surface-variant">{text}</p>}
        </div>
        {control}
      </div>
      {children}
    </section>
  );
}

function SettingsTab() {
  const { language, t } = useI18n();
  const s = t.guest.settings;
  const [languageOpen, setLanguageOpen] = useState(false);
  const nearby = useNearby({ auto: false });
  const blocked = nearby.permission === 'denied' || nearby.status === 'denied';
  const unsupported = nearby.permission === 'unsupported';
  const busy = nearby.status === 'locating' || nearby.status === 'loading';
  const on = nearby.remembered && !blocked;

  return (
    <div className="flex max-w-[860px] flex-col">
      <SettingRow
        title={s.language}
        text={languageOption(language).nativeName}
        control={
          <Button variant="secondary" onClick={() => setLanguageOpen(true)} aria-haspopup="dialog">
            <Icon name="languages" size={18} />
            {s.changeLanguage}
          </Button>
        }
      />
      <LanguageDialog open={languageOpen} onClose={() => setLanguageOpen(false)} />

      {!unsupported && (
        <SettingRow
          title={s.location}
          text={s.locationText}
          control={
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={s.location}
              disabled={blocked || busy || nearby.loadingFlag}
              onClick={() => (on ? nearby.stop() : nearby.locate())}
              className={cn(
                'inline-flex h-11 items-center gap-3 rounded-full border px-4 type-control transition-colors disabled:opacity-50',
                on ? 'border-primary bg-primary-container text-on-primary-container' : 'border-border-strong bg-surface text-on-surface hover:bg-surface-container-low',
              )}
            >
              <span aria-hidden="true" className={cn('size-3 rounded-full', on ? 'bg-primary' : 'bg-on-surface-muted')} />
              {on ? s.on : s.off}
            </button>
          }
        >
          {blocked && <p className="type-body-s text-on-surface-variant">{t.guest.nearby.denied}</p>}
          {nearby.status === 'unavailable' && <p className="type-body-s text-on-surface-variant">{t.guest.nearby.unavailable}</p>}
        </SettingRow>
      )}

      <SettingRow title={s.privacyTitle} text={s.privacyText} control={null} />
    </div>
  );
}

export function GuestHistoryPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get('tab'));
  const h = t.guest.history;

  return (
    <>
      <title>{t.documentTitle(h.title)}</title>
      <section aria-labelledby="tieu-de-lich-su" className="bg-surface-container-low pt-12 pb-8">
        <div className="dsv-content flex max-w-[760px] flex-col gap-3">
          <h1 id="tieu-de-lich-su" className="type-display-l text-on-background">
            {h.title}
          </h1>
          <p className="type-body-l text-on-surface-variant">{h.lead}</p>
        </div>
      </section>
      <section className="dsv-content pb-16">
        <Tabs
          idPrefix="lich-su"
          label={h.tabs}
          items={[
            { id: 'lich-su', label: h.tabHistory },
            { id: 'cai-dat', label: h.tabSettings },
          ]}
          value={tab}
          onChange={(next) => setParams(next === 'lich-su' ? new URLSearchParams() : new URLSearchParams({ tab: next }), { replace: true })}
        />
        <TabPanel idPrefix="lich-su" id={tab}>
          {tab === 'lich-su' ? <HistoryTab /> : <SettingsTab />}
        </TabPanel>
      </section>
    </>
  );
}
