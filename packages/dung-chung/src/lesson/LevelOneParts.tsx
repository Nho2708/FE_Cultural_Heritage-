import { type ComponentProps, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '../cn';
import type { QuestionPreviewOption, StudentAlbumCard, StudentHeritageCard } from '../api';
import { Icon, type IconName } from '../ui';
import { speakVietnamese } from './speechVoice';

// Phần giao diện dùng chung của khu học cấp 1 (web học tập và xem trước của giáo viên): nút loa to, nút to, các phương án chạm to (Đúng/Sai,
// chọn hình, chọn chữ), thẻ di sản, khối câu mang về nhà, ba sao lớn. Màu chỉ lấy từ token của bộ giao diện
// cấp 1, không emoji. Nút nào nhỏ hơn vùng chạm của cấp thì ghi rõ `min-h-0` vì nền CSS đặt mọi nút cao tối thiểu bằng vùng chạm.

function canSpeak(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof Audio !== 'undefined' || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'))
  );
}

/** Cỡ nút loa (px) → lớp kích thước và cỡ biểu tượng. */
const SPEAK_SIZE = {
  40: { box: 'size-10', icon: 20 },
  48: { box: 'size-12', icon: 24 },
  56: { box: 'size-14', icon: 28 },
  64: { box: 'size-16', icon: 32 },
  72: { box: 'size-18', icon: 36 },
} as const;

export type LevelOneSpeakSize = keyof typeof SPEAK_SIZE;

/** Nút loa tròn của cấp 1: nền xanh (hoặc nhạt với `soft`), đọc to `text` bằng giọng tiếng Việt. Trình duyệt không đọc được thì không hiện. */
export function LevelOneSpeak({
  text,
  label,
  size = 56,
  soft = false,
  className,
}: {
  text: string;
  label: string;
  size?: LevelOneSpeakSize;
  soft?: boolean;
  className?: string;
}) {
  if (!canSpeak() || text.trim() === '') return null;
  const s = SPEAK_SIZE[size];
  return (
    <button
      type="button"
      onClick={() => void speakVietnamese(text)}
      aria-label={label}
      className={cn(
        'flex min-h-0 shrink-0 items-center justify-center rounded-full transition-transform motion-safe:active:scale-95',
        soft ? 'bg-primary-container text-on-primary-container' : 'bg-primary text-on-primary hover:bg-primary-hover',
        s.box,
        className,
      )}
    >
      <Icon name="volume" size={s.icon} />
    </button>
  );
}

// ---- Nút to ----

export type LevelOneButtonVariant = 'primary' | 'secondary';

/** Nút của cấp 1: hình viên thuốc, chữ đậm; `lg` cao 64px (nút chính), `md` cao 56px (nút phụ). */
function levelOneButtonClass(variant: LevelOneButtonVariant = 'primary', size: 'lg' | 'md' = 'lg', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full text-center leading-tight font-bold no-underline select-none',
    'transition-colors motion-safe:active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    size === 'lg' ? 'min-h-16 px-7 py-2 text-[22px]' : 'min-h-14 px-6 py-2 text-[20px]',
    variant === 'primary'
      ? 'bg-primary text-on-primary shadow-[0_4px_0_var(--dsv-color-primary-active)] hover:bg-primary-hover'
      : 'border-2 border-primary/40 bg-surface text-primary hover:bg-primary-container',
    className,
  );
}

export function LevelOneButton({
  variant = 'primary',
  size = 'lg',
  className,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & { variant?: LevelOneButtonVariant; size?: 'lg' | 'md' }) {
  return <button type={type} className={levelOneButtonClass(variant, size, className)} {...rest} />;
}

export function LevelOneButtonLink({
  variant = 'primary',
  size = 'lg',
  className,
  ...rest
}: LinkProps & { variant?: LevelOneButtonVariant; size?: 'lg' | 'md' }) {
  return <Link className={levelOneButtonClass(variant, size, typeof className === 'string' ? className : undefined)} {...rest} />;
}

/** Nút tròn chỉ có biểu tượng (quay về, tạm dừng): 56px, viền nhạt, luôn có nhãn đọc. */
export function LevelOneIconLink({ icon, label, className, ...rest }: Omit<LinkProps, 'children'> & { icon: IconName; label: string }) {
  return (
    <Link
      aria-label={label}
      className={cn(
        'flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface text-primary hover:bg-primary-container',
        typeof className === 'string' ? className : undefined,
      )}
      {...rest}
    >
      <Icon name={icon} size={28} strokeWidth={2.6} />
    </Link>
  );
}

// ---- Phương án chạm to ----

type ChoiceKind = 'TRUE_FALSE' | 'IMAGE_CHOICE' | 'TEXT';

const ORDINAL = ['thứ nhất', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu'];

function trueFalseIcon(content: string | null, index: number): IconName {
  const text = (content ?? '').trim().toLowerCase();
  if (text === 'đúng') return 'check';
  if (text === 'sai') return 'x';
  return index === 0 ? 'check' : 'x';
}

export interface LevelOneChoicesProps {
  kind: ChoiceKind;
  options: readonly QuestionPreviewOption[];
  /** Phương án em vừa chạm (đang chờ kiểm). */
  picked?: number | null;
  /** Phương án em đã chọn chưa đúng: làm mờ và khóa. */
  tried?: ReadonlySet<number>;
  /** Phương án đúng đang được chỉ ra (sáng viền và dấu tích). */
  correct?: number | null;
  disabled?: boolean;
  onPick: (index: number) => void;
  /** Tên nhóm phương án cho trình đọc màn hình. */
  label?: string;
}

function RightMark() {
  return (
    <span aria-hidden="true" className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-success text-on-success shadow-1">
      <Icon name="check" size={22} strokeWidth={3} />
    </span>
  );
}

/** Nhóm phương án: fieldset có chú thích ẩn để trình đọc màn hình đọc tên nhóm. */
function ChoiceGroup({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}

/** Các phương án của câu cấp 1: Đúng/Sai là hai nút to có biểu tượng, chọn hình là thẻ hình to (tối đa 3 cột), còn lại là nút chữ to. */
export function LevelOneChoices({ kind, options, picked = null, tried, correct = null, disabled, onPick, label = 'Các phương án' }: LevelOneChoicesProps) {
  const state = (index: number) => ({
    isTried: tried?.has(index) ?? false,
    isRight: correct === index,
    isPicked: picked === index && correct !== index,
  });
  const tone = (index: number) => {
    const { isTried, isRight, isPicked } = state(index);
    return cn(
      'relative border-[3px] transition-[opacity,transform,border-color,background-color] duration-200 motion-safe:active:translate-y-0.5 disabled:cursor-default',
      isRight
        ? 'border-success bg-success-container text-on-success-container ring-4 ring-success/25'
        : isPicked
          ? 'border-primary bg-primary-container text-on-primary-container'
          : 'border-border bg-surface text-on-surface hover:border-primary/60',
      isTried && 'opacity-40 grayscale',
    );
  };
  const suffix = (index: number) => {
    const { isTried, isRight } = state(index);
    return isRight ? ', đáp án đúng' : isTried ? ', em đã chọn, chưa đúng' : '';
  };

  if (kind === 'TRUE_FALSE') {
    return (
      <ChoiceGroup label={label} className="grid grid-cols-2 gap-4">
        {options.map((option, index) => {
          const { isTried, isRight } = state(index);
          return (
            <button
              key={index}
              type="button"
              disabled={disabled || isTried}
              aria-pressed={picked === index}
              aria-label={`${option.content ?? (index === 0 ? 'Đúng' : 'Sai')}${suffix(index)}`}
              onClick={() => onPick(index)}
              className={cn(tone(index), 'flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[24px] px-3 py-4 shadow-[0_4px_0_var(--dsv-color-border)]')}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-14 items-center justify-center rounded-full',
                  isRight ? 'bg-success text-on-success' : 'bg-primary-container text-on-primary-container',
                )}
              >
                <Icon name={trueFalseIcon(option.content, index)} size={32} strokeWidth={3} />
              </span>
              <span className="text-[24px] leading-tight font-bold">{option.content ?? (index === 0 ? 'Đúng' : 'Sai')}</span>
            </button>
          );
        })}
      </ChoiceGroup>
    );
  }

  if (kind === 'IMAGE_CHOICE') {
    const three = options.length === 3;
    return (
      <ChoiceGroup label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {options.map((option, index) => {
          const { isTried, isRight } = state(index);
          const name = option.content?.trim() || `Hình ${ORDINAL[index] ?? index + 1}`;
          return (
            <button
              key={index}
              type="button"
              disabled={disabled || isTried}
              aria-pressed={picked === index}
              aria-label={`${name}${suffix(index)}`}
              onClick={() => onPick(index)}
              className={cn(
                tone(index),
                'flex min-h-[140px] flex-col overflow-hidden rounded-[22px] p-0 text-left shadow-[0_4px_0_var(--dsv-color-border)]',
                three && index === 2 && 'col-span-2 w-[calc(50%-6px)] justify-self-center sm:col-span-1 sm:w-auto sm:justify-self-stretch',
              )}
            >
              {option.imageUrl ? (
                <img src={option.imageUrl} alt="" className="aspect-[4/3] w-full flex-1 object-cover" />
              ) : (
                <span className="flex aspect-[4/3] w-full flex-1 items-center justify-center bg-image-placeholder text-on-surface-variant">
                  <Icon name="image" size={40} />
                </span>
              )}
              {option.content?.trim() && <span className="block px-3 py-2 text-[18px] leading-snug font-bold">{option.content}</span>}
              {isRight && <RightMark />}
            </button>
          );
        })}
      </ChoiceGroup>
    );
  }

  return (
    <ChoiceGroup label={label} className="flex flex-col gap-3">
      {options.map((option, index) => {
        const { isTried, isRight } = state(index);
        return (
          <button
            key={index}
            type="button"
            disabled={disabled || isTried}
            aria-pressed={picked === index}
            aria-label={`${option.content ?? `Đáp án ${ORDINAL[index] ?? index + 1}`}${suffix(index)}`}
            onClick={() => onPick(index)}
            className={cn(tone(index), 'flex min-h-[72px] w-full items-center gap-4 rounded-[20px] px-4 py-3 text-left shadow-[0_3px_0_var(--dsv-color-border)]')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full text-[18px] font-bold',
                isRight ? 'bg-success text-on-success' : 'bg-primary-container text-on-primary-container',
              )}
            >
              {isRight ? <Icon name="check" size={22} strokeWidth={3} /> : String.fromCharCode(65 + index)}
            </span>
            <span className="min-w-0 flex-1 text-[22px] leading-snug font-bold">{option.content}</span>
          </button>
        );
      })}
    </ChoiceGroup>
  );
}

// ---- Thẻ di sản và câu mang về nhà ----

/** Thẻ di sản nằm ngang: ảnh nhỏ, tên, một dòng phụ (ví dụ "Thẻ mới vào album"). */
export function HeritageCardRow({
  card,
  note,
  className,
}: {
  card: Pick<StudentAlbumCard, 'name' | 'thumbnailUrl'> | Pick<StudentHeritageCard, 'name' | 'thumbnailUrl'>;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 rounded-[20px] border-2 border-secondary-container bg-surface p-2.5 text-left', className)}>
      {card.thumbnailUrl ? (
        <img src={card.thumbnailUrl} alt="" className="aspect-[4/3] w-full rounded-[14px] object-cover" />
      ) : (
        <span className="flex aspect-[4/3] w-full items-center justify-center rounded-[14px] bg-surface-container-low text-primary">
          <Icon name="cards" size={32} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[20px] leading-tight font-bold text-on-surface">{card.name}</p>
        {note && <p className="mt-1 text-[16px] leading-snug text-on-surface-variant">{note}</p>}
      </div>
    </div>
  );
}

/** Khối "Về nhà hỏi bố mẹ nhé": một câu em mang về nhà, có nút nghe. */
export function TakeHomeBox({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text?.trim()) return null;
  const heading = 'Về nhà hỏi bố mẹ nhé';
  return (
    <div className={cn('flex items-start gap-3 rounded-[20px] bg-surface-container-low p-4 text-left', className)}>
      <LevelOneSpeak text={`${heading}. ${text}`} label="Nghe câu hỏi mang về nhà" size={48} soft />
      <p className="min-w-0 flex-1 text-[18px] leading-snug text-on-surface">
        <span className="block font-bold">{heading}</span>
        {text}
      </p>
    </div>
  );
}

/** Ba sao lớn của cấp 1 (sao giữa to hơn); phần hình ẩn với trình đọc màn hình, chữ đọc được ở `sr-only`. */
export function LevelOneStars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-end justify-center gap-1.5', className)}>
      <span className="sr-only">{`${count} trên 3 sao`}</span>
      {[0, 1, 2].map((i) => (
        <Icon
          key={i}
          name="star"
          size={i === 1 ? 68 : 56}
          strokeWidth={1.5}
          className={i < count ? 'fill-current text-secondary-container stroke-on-secondary-container/30' : 'fill-current text-border stroke-border'}
        />
      ))}
    </span>
  );
}
