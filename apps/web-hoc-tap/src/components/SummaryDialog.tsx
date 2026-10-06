import { cn } from '@dsvhvn/dung-chung';
import { ApiError, ERROR_CODES, type PublicSummary } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, Modal, TabPanel, Tabs } from '@dsvhvn/dung-chung/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { serverTime, useAdUnlockStatus, useAtExpiry } from '../ads/adsData';
import { useRewardedUnlock } from '../ads/useRewardedUnlock';
import { SUMMARY_KEY, useHeritageSummary } from '../discovery/queries';
import { useIsGuest, useRecordListen } from '../guest/guestData';
import { useI18n } from '../i18n/context';
import { formatDateTime } from '../i18n/format';
import { languageOption } from '../i18n/languages';
import { SPEEDS, useNarration } from '../narration/useNarration';
import { splitParagraphs, splitSentences } from '../narration/sentences';
import { AdGate } from './AdGate';
import { LocalizationNotice } from './LocalizationNotice';
import { PublicErrorState } from './PublicErrorState';

// Hộp thoại "Tóm tắt và thuyết minh" của chi tiết di sản: tab Đọc (bản tóm tắt chi tiết) và tab Nghe (bản tóm tắt ngắn đọc bằng giọng của
// trình duyệt, có phát, tạm dừng, dừng, tốc độ và tô sáng câu đang đọc). Nội dung lấy từ bản đã lưu theo ngôn ngữ đang chọn, không gọi AI khi xem.
// Ngôn ngữ chưa có tóm tắt hiện hành thì hiện bản tiếng Việt kèm thông báo và đọc bằng giọng tiếng Việt, không dùng giọng của ngôn ngữ khác.
// Khách (chưa đăng nhập) xem tóm tắt và nghe thuyết minh của một di sản sau khi xem một quảng cáo có thưởng (mở 24 giờ trên thiết bị): máy chủ trả 403 khi chưa mở khóa
// thì hộp thoại hiện lời mời xem quảng cáo thay cho nội dung; hết hạn thì tự quay lại lời mời. Học sinh đã đăng nhập không bao giờ thấy quảng cáo.

export type SummaryTab = 'doc' | 'nghe';

const PREFIX = 'tom-tat';

function Narrator({ summary }: { summary: PublicSummary }) {
  const { t } = useI18n();
  // Ngôn ngữ của chữ đang hiện (khác ngôn ngữ yêu cầu khi lùi về tiếng Việt) quyết định giọng đọc.
  const spoken = languageOption(summary.localization.language);
  const sentences = useMemo(() => splitSentences(summary.shortText, spoken.speechTag), [summary.shortText, spoken.speechTag]);
  const narration = useNarration(sentences, spoken.speechTag);
  const { voiceState, status, index } = narration;
  // Nghe chạy trên trình duyệt nên máy chủ không tự biết: ghi một lượt "nghe" vào lịch sử của khách ở lần bấm Phát đầu tiên (học sinh không ghi).
  const recordListen = useRecordListen();
  const listened = useRef(false);
  const play = () => {
    if (!listened.current) {
      listened.current = true;
      recordListen(summary.slug);
    }
    narration.play();
  };
  const blocked = voiceState === 'unsupported' || voiceState === 'missing';

  return (
    <div className="flex flex-col gap-4">
      {blocked && (
        <InlineMessage tone="warning">
          <strong className="block">{voiceState === 'unsupported' ? t.summary.unsupportedTitle : t.summary.noVoiceTitle}</strong>
          {voiceState === 'unsupported' ? t.summary.unsupportedHint : t.summary.noVoiceHint(t.language.names[spoken.code])}
        </InlineMessage>
      )}
      <div className="flex flex-col gap-4 rounded-md border border-border p-5">
        <p lang={spoken.code} className="type-body-l text-on-surface">
          {sentences.map((sentence, position) => (
            <span
              key={position}
              aria-current={position === index ? 'true' : undefined}
              className={cn('rounded-xs', position === index && 'bg-primary-container font-medium text-on-primary-container')}
            >
              {sentence}{' '}
            </span>
          ))}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {status === 'playing' ? (
            <Button onClick={narration.pause} aria-label={t.summary.pause}>
              <Icon name="pause" size={20} />
              {t.summary.pause}
            </Button>
          ) : status === 'paused' ? (
            <Button onClick={narration.resume} aria-label={t.summary.resume}>
              <Icon name="play" size={20} />
              {t.summary.resume}
            </Button>
          ) : (
            <Button onClick={play} disabled={blocked || sentences.length === 0} aria-label={t.summary.play}>
              <Icon name="play" size={20} />
              {t.summary.play}
            </Button>
          )}
          <Button variant="secondary" onClick={narration.stop} disabled={status === 'idle'} aria-label={t.summary.stop}>
            <Icon name="square" size={18} />
            {t.summary.stop}
          </Button>
          <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
            <legend className="float-left mr-2 p-0 type-label text-on-surface-variant">{t.summary.speed}</legend>
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={narration.speed === speed}
                onClick={() => narration.setSpeed(speed)}
                className={cn(
                  'h-9 rounded-full border px-3 type-label transition-colors',
                  narration.speed === speed ? 'border-primary bg-primary-container text-on-primary-container' : 'border-border text-on-surface hover:bg-surface-container-low',
                )}
              >
                {speed.toLocaleString('en-US')}×
              </button>
            ))}
          </fieldset>
        </div>
        <output className="block type-label text-on-surface-variant">
          {status === 'idle' ? t.summary.ready(sentences.length) : t.summary.reading(index + 1, sentences.length)} · {t.summary.deviceVoice}
        </output>
      </div>
    </div>
  );
}

function Reader({ summary }: { summary: PublicSummary }) {
  const paragraphs = splitParagraphs(summary.detailedText);
  return (
    <div lang={summary.localization.language} className="flex flex-col gap-4">
      {paragraphs.map((paragraph, position) => (
        <p key={position} className="type-body-l text-on-surface">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function SummaryDialog({
  slug,
  name,
  open,
  tab,
  onTabChange,
  onClose,
}: {
  slug: string;
  /** Tên di sản theo ngôn ngữ đang chọn, dùng trong lời mời xem quảng cáo. */
  name: string;
  open: boolean;
  tab: SummaryTab;
  onTabChange: (tab: SummaryTab) => void;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const guest = useIsGuest();
  const query = useHeritageSummary(slug, open);
  // Máy chủ báo chưa mở khóa thì không hiện nội dung đã giữ trong bộ nhớ đệm (ví dụ tab để mở quá 24 giờ).
  const locked = guest && query.error instanceof ApiError && query.error.code === ERROR_CODES.adUnlockRequired;
  const summary = locked ? undefined : query.data;
  const unavailable = query.error instanceof ApiError && query.error.code === ERROR_CODES.summaryUnavailable;

  const refetch = query.refetch;
  const unlock = useRewardedUnlock(slug, useCallback(() => void refetch(), [refetch]));

  // Còn mở khóa thì hẹn đúng lúc hết hạn (giờ máy chủ): hỏi lại tóm tắt, máy chủ trả 403 và hộp thoại quay về lời mời xem quảng cáo.
  const status = useAdUnlockStatus(slug, open && guest && Boolean(summary));
  const expiresAt = status.data?.gateRequired && status.data.unlocked ? status.data.expiresAt : null;
  const relock = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ads', 'unlock', slug] });
    void queryClient.resetQueries({ queryKey: SUMMARY_KEY, predicate: (q) => q.queryKey[3] === slug });
  }, [queryClient, slug]);
  useAtExpiry(expiresAt, relock);

  // Khách đóng hộp thoại thì bỏ tóm tắt đã tải: lần mở sau hỏi lại máy chủ, không hiện nội dung đã hết hạn mở khóa.
  useEffect(() => {
    if (!open && guest) void queryClient.resetQueries({ queryKey: SUMMARY_KEY, predicate: (q) => q.queryKey[3] === slug });
  }, [open, guest, queryClient, slug]);

  // Quảng cáo của Google hiện trên trang chứ không nằm trong hộp thoại; hộp thoại ở lớp trên cùng sẽ che mất nó nên tạm đóng trong lúc quảng cáo chạy.
  const adPlaying = unlock.phase === 'watching';

  return (
    <Modal open={open && !adPlaying} title={t.summary.kicker} size="panel" closeLabel={t.common.close} onClose={onClose}>
      {open && (
        <div className="flex flex-col gap-5">
          {summary && <p className="type-h2 text-on-surface">{summary.name}</p>}
          {summary && expiresAt && Number.isFinite(serverTime(expiresAt)) && (
            <p className="-mt-3 inline-flex items-center gap-2 type-label text-on-surface-variant">
              <Icon name="check" size={16} />
              {t.ads.unlockedUntil(formatDateTime(expiresAt, language))}
            </p>
          )}
          {locked && <AdGate name={name} phase={unlock.phase} problem={unlock.problem} onWatch={() => void unlock.start()} onResend={unlock.resend} onLater={onClose} />}
          {summary && <LocalizationNotice localization={summary.localization} />}
          {query.isPending && !locked && (
            <p aria-busy="true" className="type-body-m text-on-surface-variant">
              {t.summary.loading}
            </p>
          )}
          {query.isError &&
            !locked &&
            (unavailable ? <InlineMessage tone="info">{t.summary.unavailable}</InlineMessage> : <PublicErrorState error={query.error} onRetry={() => void query.refetch()} />)}
          {summary && (
            <>
              <Tabs
                idPrefix={PREFIX}
                label={t.summary.tabs}
                items={[
                  { id: 'doc', label: t.summary.read },
                  { id: 'nghe', label: t.summary.listen },
                ]}
                value={tab}
                onChange={onTabChange}
              />
              <TabPanel idPrefix={PREFIX} id={tab}>
                {tab === 'doc' ? <Reader summary={summary} /> : <Narrator key={`${summary.localization.language}:${summary.shortText}`} summary={summary} />}
              </TabPanel>
              <p className="border-t border-border pt-3 type-label text-on-surface-variant">{t.summary.sourceNote}</p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
