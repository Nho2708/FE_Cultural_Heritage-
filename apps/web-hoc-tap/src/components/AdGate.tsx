import { Button, Icon, InlineMessage } from '@dsvhvn/dung-chung/ui';
import { UNLOCK_HOURS_FALLBACK, useAdsConfig } from '../ads/adsData';
import type { UnlockPhase, UnlockProblem } from '../ads/useRewardedUnlock';
import { useI18n } from '../i18n/context';

// Lời mời xem quảng cáo trong hộp thoại tóm tắt: hiện thay nội dung khi máy chủ báo di sản chưa được mở khóa trên thiết bị này (403 AD_UNLOCK_REQUIRED).
// Nói rõ việc đổi lấy: xem một quảng cáo ngắn để mở tóm tắt và nghe thuyết minh của đúng di sản này trong 24 giờ; mọi nội dung khác vẫn miễn phí.
// Quảng cáo chỉ chạy sau khi khách bấm nút; hết hạn mở khóa thì hộp thoại quay lại đúng lời mời này.

const BUSY: ReadonlySet<UnlockPhase> = new Set(['starting', 'loading', 'watching', 'verifying']);

function ProblemText({ problem }: { problem: UnlockProblem }) {
  const { t } = useI18n();
  const text = t.ads.problem;
  return <>{problem.kind === 'rateLimited' ? text.rateLimited(problem.minutes) : text[problem.kind]}</>;
}

export function AdGate({
  name,
  phase,
  problem,
  onWatch,
  onResend,
  onLater,
}: {
  name: string;
  phase: UnlockPhase;
  problem: UnlockProblem | null;
  onWatch: () => void;
  onResend: () => void;
  onLater: () => void;
}) {
  const { t } = useI18n();
  const config = useAdsConfig(true);
  const hours = config.data?.unlockHours ?? UNLOCK_HOURS_FALLBACK;
  const busy = BUSY.has(phase);
  const status = phase === 'starting' ? t.ads.starting : phase === 'loading' ? t.ads.loading : phase === 'watching' ? t.ads.watching : phase === 'verifying' ? t.ads.verifying : null;
  const resend = problem?.kind === 'resend';

  return (
    <section aria-labelledby="mo-khoa-quang-cao" className="flex flex-col gap-4 rounded-md border border-border bg-surface-container-low p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Icon name="headphones" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id="mo-khoa-quang-cao" className="type-h3 text-on-surface">
            {t.ads.gateTitle}
          </h3>
          <p className="type-body-m text-on-surface-variant">{t.ads.gateBody(name, hours)}</p>
          <p className="type-body-s text-on-surface-variant">{t.ads.freeNote}</p>
        </div>
      </div>

      {problem && (
        <InlineMessage
          tone={problem.kind === 'closed' ? 'info' : 'warning'}
          action={
            resend && (
              <Button variant="secondary" size="sm" onClick={onResend} disabled={busy}>
                {t.ads.resend}
              </Button>
            )
          }
        >
          <ProblemText problem={problem} />
        </InlineMessage>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!resend && (
          <Button onClick={onWatch} loading={busy}>
            <Icon name="play" size={20} />
            {problem ? t.ads.watchAgain : t.ads.watch}
          </Button>
        )}
        <Button variant="ghost" onClick={onLater} disabled={busy}>
          {t.ads.later}
        </Button>
        <output aria-live="polite" className="type-label text-on-surface-variant">
          {status}
        </output>
      </div>

      <p className="type-label text-on-surface-variant">{t.ads.providedByGoogle}</p>
    </section>
  );
}
