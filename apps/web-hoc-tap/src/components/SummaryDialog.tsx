import { cn, resolveFileUrl } from '@dsvhvn/dung-chung';
import { ApiError, ERROR_CODES, type PublicNarration, type PublicSummary } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, Modal, TabPanel, Tabs } from '@dsvhvn/dung-chung/ui';
import { Fragment, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config/env';
import { useHeritageSummary } from '../discovery/queries';
import { useRecordListen } from '../guest/guestData';
import { useI18n } from '../i18n/context';
import { languageOption } from '../i18n/languages';
import { useAudioNarration } from '../narration/useAudioNarration';
import { SPEEDS, useNarration } from '../narration/useNarration';
import { splitParagraphs, splitSentences } from '../narration/sentences';
import { LocalizationNotice } from './LocalizationNotice';
import { PublicErrorState } from './PublicErrorState';

// Hộp thoại "Tóm tắt và thuyết minh" của chi tiết di sản: tab Đọc (bản tóm tắt chi tiết) và tab Nghe (bản tóm tắt ngắn, có phát, tạm dừng, dừng,
// tốc độ và tô sáng câu đang đọc). Có thuyết minh tạo sẵn thì phát tệp MP3 giọng tự host theo mốc từng câu; không có hoặc tệp hỏng thì đọc bằng giọng của
// trình duyệt. Nội dung lấy từ bản đã lưu theo ngôn ngữ đang chọn, không gọi AI khi xem.
// Ngôn ngữ chưa có tóm tắt hiện hành thì hiện bản tiếng Việt kèm thông báo và đọc bằng giọng tiếng Việt, không dùng giọng của ngôn ngữ khác.
// Khách (chưa đăng nhập) và học sinh đều xem tóm tắt và nghe thuyết minh trực tiếp, miễn phí, không có bước chặn nào.

export type SummaryTab = 'doc' | 'nghe';

const PREFIX = 'tom-tat';

/** Thuyết minh tạo sẵn dùng được: có tệp và có ít nhất một câu có mốc. */
function usableNarration(summary: PublicSummary): PublicNarration | null {
  const narration = summary.narration;
  return narration && narration.audioUrl && narration.sentences.length > 0 ? narration : null;
}

function Narrator({ summary }: { summary: PublicSummary }) {
  const { t } = useI18n();
  // Ngôn ngữ của chữ đang hiện (khác ngôn ngữ yêu cầu khi lùi về tiếng Việt) quyết định giọng đọc.
  const spoken = languageOption(summary.localization.language);
  const deviceSentences = useMemo(() => splitSentences(summary.shortText, spoken.speechTag), [summary.shortText, spoken.speechTag]);
  const device = useNarration(deviceSentences, spoken.speechTag);
  // Có thuyết minh tạo sẵn thì phát tệp và hiện đúng các câu đã có mốc; tệp hỏng thì lùi về giọng thiết bị, đang nghe dở thì đọc tiếp luôn bằng giọng đó.
  const prepared = usableNarration(summary);
  const devicePlay = device.play;
  const audio = useAudioNarration(
    prepared,
    resolveFileUrl(prepared?.audioUrl, API_BASE_URL),
    useCallback((wasActive: boolean) => wasActive && devicePlay(), [devicePlay]),
  );
  const usingAudio = prepared !== null && !audio.failed;
  const sentences = usingAudio ? prepared.sentences.map((sentence) => sentence.text) : deviceSentences;
  const narration = usingAudio ? audio : device;
  const { voiceState } = device;
  const { status, index } = narration;
  // Nghe chạy trên trình duyệt nên máy chủ không tự biết: ghi một lượt "nghe" vào lịch sử của khách ở lần bấm Phát đầu tiên (học sinh không ghi).
  const recordListen = useRecordListen();
  const listened = useRef(false);
  const markListened = () => {
    if (listened.current) return;
    listened.current = true;
    recordListen(summary.slug);
  };
  const play = () => {
    markListened();
    narration.play();
  };
  const seek = (position: number) => {
    markListened();
    audio.seekTo(position);
  };
  const blocked = !usingAudio && (voiceState === 'unsupported' || voiceState === 'missing');

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
            <Fragment key={position}>
              {usingAudio ? (
                // Bấm vào một câu thì phát từ đầu câu đó (chỉ có với tệp tạo sẵn vì biết mốc từng câu).
                <button
                  type="button"
                  onClick={() => seek(position)}
                  aria-current={position === index ? 'true' : undefined}
                  className={cn(
                    'inline rounded-xs text-left hover:bg-surface-container-low',
                    position === index && 'bg-primary-container font-medium text-on-primary-container hover:bg-primary-container',
                  )}
                >
                  {sentence}
                </button>
              ) : (
                <span
                  aria-current={position === index ? 'true' : undefined}
                  className={cn('rounded-xs', position === index && 'bg-primary-container font-medium text-on-primary-container')}
                >
                  {sentence}
                </span>
              )}{' '}
            </Fragment>
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
          {status === 'idle' ? t.summary.ready(sentences.length) : t.summary.reading(index + 1, sentences.length)}
          {!usingAudio && ` · ${t.summary.deviceVoice}`}
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
  open,
  tab,
  onTabChange,
  onClose,
}: {
  slug: string;
  open: boolean;
  tab: SummaryTab;
  onTabChange: (tab: SummaryTab) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const query = useHeritageSummary(slug, open);
  const summary = query.data;
  const unavailable = query.error instanceof ApiError && query.error.code === ERROR_CODES.summaryUnavailable;

  return (
    <Modal open={open} title={t.summary.kicker} size="panel" closeLabel={t.common.close} onClose={onClose}>
      {open && (
        <div className="flex flex-col gap-5">
          {summary && <p className="type-h2 text-on-surface">{summary.name}</p>}
          {summary && <LocalizationNotice localization={summary.localization} />}
          {query.isPending && (
            <p aria-busy="true" className="type-body-m text-on-surface-variant">
              {t.summary.loading}
            </p>
          )}
          {query.isError &&
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
