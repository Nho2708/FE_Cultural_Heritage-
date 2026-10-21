import { formatRouteDistance, formatRouteDuration, googleMapsDirectionsUrl, instructionText, stepGlyph, type RoutePoint, type RouteStep, type TravelMode } from '@dsvhvn/dung-chung/map/route';
import { Button, ExternalButtonLink, Icon, InlineMessage, type IconName } from '@dsvhvn/dung-chung/ui';
import { useI18n } from '../i18n/context';
import type { DirectionsController, DirectionsStatus } from './useDirections';

// Bảng chỉ đường tới di sản: chọn cách đi, tóm tắt quãng đường và thời gian, các bước theo ngôn ngữ giao diện, ghi công OSRM và OpenStreetMap, nút mở
// Google Maps luôn có ở mọi trạng thái (kể cả khi không lấy được vị trí hay không tìm được đường). Dùng ở trang chi tiết di sản và trang chỉ đường nhúng cho app.

const MODES: TravelMode[] = ['driving', 'walking'];

/** Hình của một bước: mũi tên xoay theo hướng rẽ; xuất phát, đến nơi, vòng xuyến có biểu tượng riêng. */
function StepGlyph({ step }: { step: RouteStep }) {
  const glyph = stepGlyph(step);
  const icon: IconName = glyph.kind === 'depart' ? 'navigation' : glyph.kind === 'arrive' ? 'map-pin' : glyph.kind === 'roundabout' ? 'refresh' : 'arrow-up';
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface">
      <Icon name={icon} size={16} style={glyph.kind === 'arrow' && glyph.rotate !== 0 ? { transform: `rotate(${glyph.rotate}deg)` } : undefined} />
    </span>
  );
}

function ModeToggle({ mode, onChange }: { mode: TravelMode; onChange: (mode: TravelMode) => void }) {
  const { t } = useI18n();
  const d = t.directions;
  return (
    <fieldset className="m-0 inline-flex self-start rounded-sm border border-border-strong p-0.5">
      <legend className="sr-only">{d.modeAria}</legend>
      {MODES.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={mode === item}
          onClick={() => onChange(item)}
          className={
            mode === item
              ? 'inline-flex h-9 items-center gap-1.5 rounded-xs bg-primary px-4 type-control text-on-primary'
              : 'inline-flex h-9 items-center gap-1.5 rounded-xs px-4 type-control text-on-surface hover:bg-surface-container'
          }
        >
          <Icon name={item === 'driving' ? 'navigation' : 'user'} size={16} />
          {item === 'driving' ? d.driving : d.walking}
        </button>
      ))}
    </fieldset>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <output aria-busy="true" className="flex items-center gap-2 type-body-s text-on-surface-variant">
      <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" />
      {text}
    </output>
  );
}

const RETRYABLE: DirectionsStatus[] = ['denied', 'unavailable', 'service'];

function Problem({ status, onRetry }: { status: Exclude<DirectionsStatus, 'idle' | 'locating' | 'routing' | 'ready'>; onRetry: () => void }) {
  const { t } = useI18n();
  const d = t.directions;
  const text = { denied: d.denied, unavailable: d.unavailable, outside: d.outsideVietnam, 'no-route': d.noRoute, service: d.serviceError }[status];
  const tone = status === 'outside' || status === 'no-route' ? 'info' : 'warning';
  return (
    <InlineMessage
      tone={tone}
      action={
        RETRYABLE.includes(status) ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t.common.retry}
          </Button>
        ) : undefined
      }
    >
      {text}
    </InlineMessage>
  );
}

function Steps({ steps, destinationName, scrollable }: { steps: RouteStep[]; destinationName: string; scrollable: boolean }) {
  const { language, t } = useI18n();
  const d = t.directions;
  return (
    <ol aria-label={d.steps} className={scrollable ? 'flex max-h-[360px] flex-col divide-y divide-border overflow-y-auto' : 'flex flex-col divide-y divide-border'}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={index} className="flex items-start gap-3 py-2.5">
            <StepGlyph step={step} />
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* Tên đường là chữ thuần từ OpenStreetMap; React chèn dưới dạng text nên không thành HTML. */}
              <p className="type-body-s text-on-background">{step.type === 'arrive' ? `${instructionText(step, language)} · ${destinationName}` : instructionText(step, language)}</p>
              {!last && step.distanceMeters > 0 && <p className="type-label text-on-surface-variant">{d.stepDistance(formatRouteDistance(step.distanceMeters, language))}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface DirectionsPanelProps {
  controller: DirectionsController;
  destination: RoutePoint;
  destinationName: string;
  /** Có thì hiện nút ẩn bảng (trang chi tiết); trang nhúng không có. */
  onHide?: () => void;
  /** Trang nhúng: chữ hiện khi chưa có vị trí từ app (trạng thái chưa bắt đầu). */
  idleText?: string;
  /** Danh sách bước cuộn riêng trong khung cao tối đa (trang chi tiết); trang nhúng để cả trang cuộn. */
  scrollableSteps?: boolean;
  className?: string;
}

export function DirectionsPanel({ controller, destination, destinationName, onHide, idleText, scrollableSteps = true, className }: DirectionsPanelProps) {
  const { language, t } = useI18n();
  const d = t.directions;
  const { status, mode, route } = controller;

  const body = () => {
    switch (status) {
      case 'idle':
        return idleText ? <Busy text={idleText} /> : null;
      case 'locating':
        return <Busy text={d.locating} />;
      case 'routing':
        return <Busy text={d.routing} />;
      case 'ready':
        if (!route) return null;
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="type-h4 text-on-background">{d.summary(formatRouteDistance(route.distanceMeters, language), formatRouteDuration(route.durationSeconds, language))}</p>
              <p className="type-body-s text-on-surface-variant">{mode === 'driving' ? d.drivingNote : d.walkingNote}</p>
            </div>
            <Steps steps={route.steps} destinationName={destinationName} scrollable={scrollableSteps} />
          </div>
        );
      default:
        return <Problem status={status} onRetry={controller.retry} />;
    }
  };

  return (
    <section aria-label={d.title} className={className ?? 'flex flex-col gap-4 border-t border-border px-4 py-4'}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-h4 text-on-background">{d.title}</h3>
        {onHide && (
          <Button variant="ghost" size="icon" aria-label={d.hide} onClick={onHide}>
            <Icon name="x" size={18} />
          </Button>
        )}
      </div>
      <ModeToggle mode={mode} onChange={controller.setMode} />
      {body()}
      <div className="flex flex-col gap-2">
        <ExternalButtonLink variant="secondary" href={googleMapsDirectionsUrl({ destination, mode, origin: controller.position })} className="self-start">
          <Icon name="external-link" size={16} />
          {d.openGoogleMaps}
        </ExternalButtonLink>
        <p className="type-label text-on-surface-variant">{d.privacy}</p>
        <p className="type-label text-on-surface-variant">{d.attribution}</p>
      </div>
    </section>
  );
}
