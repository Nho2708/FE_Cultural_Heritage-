import {
  clearMatch,
  cn,
  fillNextBlank,
  moveOrderItem,
  optionLetter,
  setBlank,
  setMatch,
  setStatement,
  splitBlanks,
  toggleOrderItem,
} from '@dsvhvn/dung-chung';
import type { AttemptQuestion, QuestionSubmission } from '@dsvhvn/dung-chung/api';
import { Icon } from '@dsvhvn/dung-chung/ui';
import { useId, useState } from 'react';
import { dragProps, dropProps, parseDrag } from './dnd';

// Ô trả lời của tám dạng câu. Một bộ component, ba cách trình bày theo cấp học của lớp em (cấp 1 nút to và hình lớn, cấp 2 cân bằng,
// cấp 3 gọn). Mọi vị trí trong câu trả lời tính theo thứ tự đang hiện trên màn hình (máy chủ đã xáo cố định theo lượt). Mỗi thao
// tác trả về cả câu trả lời mới; việc lưu do hook làm bài đảm nhiệm.

export type QuizLevel = 1 | 2 | 3;

export interface QuestionInputProps {
  question: AttemptQuestion;
  answer: QuestionSubmission | null;
  onChange: (next: QuestionSubmission) => void;
  level: QuizLevel;
  disabled?: boolean;
}

const OPTION_SIZE: Record<QuizLevel, string> = {
  1: 'min-h-16 gap-4 p-5 type-h4',
  2: 'min-h-14 gap-3 p-4 type-body-m',
  3: 'min-h-12 gap-3 px-4 py-3 type-body-m',
};

const CHOICE_BASE =
  'flex w-full items-center rounded-(--dsv-option-radius) border-2 text-left transition-colors disabled:cursor-not-allowed';

function choiceClass(level: QuizLevel, selected: boolean) {
  return cn(
    CHOICE_BASE,
    OPTION_SIZE[level],
    selected
      ? 'border-primary bg-primary-container text-on-primary-container'
      : 'border-border bg-surface text-on-surface hover:bg-surface-container-low',
  );
}

function Letter({ index, selected, level }: { index: number; selected: boolean; level: QuizLevel }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full type-label',
        level === 1 ? 'size-11' : 'size-8',
        selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
      )}
    >
      {selected && level === 1 ? <Icon name="check" size={22} /> : optionLetter(index)}
    </span>
  );
}

// ---- Chọn một phương án: Một đáp án đúng, Đúng/Sai, Đọc tư liệu ----

const FOCUS = 'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--dsv-color-focus-ring)';

function OptionsInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const selected = answer?.selectedIndex ?? null;
  const name = useId();
  return (
    <div role="radiogroup" aria-label="Các phương án" className="flex flex-col gap-3">
      {question.options.map((option, index) => (
        <label key={index} className={cn(choiceClass(level, selected === index), FOCUS, 'cursor-pointer')}>
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={selected === index}
            disabled={disabled}
            onChange={() => onChange({ selectedIndex: index })}
          />
          <Letter index={index} selected={selected === index} level={level} />
          <span className="min-w-0 flex-1">{option.content}</span>
        </label>
      ))}
    </div>
  );
}

// ---- Chọn hình đúng (cấp 1) ----

function ImageChoiceInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const selected = answer?.selectedIndex ?? null;
  const name = useId();
  return (
    <div role="radiogroup" aria-label="Các hình" className="grid gap-4 sm:grid-cols-3">
      {question.options.map((option, index) => {
        const on = selected === index;
        return (
          <label
            key={index}
            className={cn(
              'flex cursor-pointer flex-col overflow-hidden rounded-(--dsv-option-radius) border-2 text-left transition-colors',
              FOCUS,
              on ? 'border-primary bg-primary-container' : 'border-border bg-surface hover:bg-surface-container-low',
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={on} disabled={disabled} onChange={() => onChange({ selectedIndex: index })} />
            {option.imageUrl ? (
              <img src={option.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <span className="flex aspect-[4/3] items-center justify-center bg-image-placeholder text-on-surface-variant">
                <Icon name="image" size={40} />
              </span>
            )}
            <span className={cn('flex items-center gap-2 p-3', level === 1 ? 'type-h4' : 'type-label')}>
              <span className="min-w-0 flex-1">{option.content ?? `Hình ${optionLetter(index)}`}</span>
              {on && (
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Icon name="check" size={18} />
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ---- Ghép cặp ----

type Pick = { side: 'left' | 'right'; index: number } | null;

function MatchingInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const count = question.leftItems.length;
  const matches = answer?.matches ?? null;
  const [pick, setPick] = useState<Pick>(null);
  const usedRight = new Set((matches ?? []).filter((m): m is number => m !== null && m !== undefined));

  const commit = (left: number, right: number) => {
    onChange({ matches: setMatch(matches, count, left, right) });
    setPick(null);
  };
  const onLeft = (left: number) => {
    if (pick?.side === 'right') commit(left, pick.index);
    else setPick(pick?.side === 'left' && pick.index === left ? null : { side: 'left', index: left });
  };
  const onRight = (right: number) => {
    if (pick?.side === 'left') commit(pick.index, right);
    else setPick(pick?.side === 'right' && pick.index === right ? null : { side: 'right', index: right });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="type-body-s text-on-surface-variant">
        {level === 1
          ? 'Chạm một hình rồi chạm tên đúng, hoặc kéo tên thả vào hình.'
          : 'Chọn một hình rồi chọn tên tương ứng (hoặc kéo tên thả vào hình). Chọn lại để đổi.'}
      </p>
      <ul aria-label="Các hình cần nối" className={cn('grid gap-4', level === 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {question.leftItems.map((item, left) => {
          const right = matches?.[left] ?? null;
          const picked = pick?.side === 'left' && pick.index === left;
          return (
            <li key={left}>
              <div
                {...dropProps((payload) => {
                  const dragged = parseDrag(payload, 'ten');
                  if (dragged !== null) commit(left, dragged);
                }, !disabled)}
                className={cn(
                  'overflow-hidden rounded-(--dsv-option-radius) border-2',
                  picked ? 'border-primary bg-primary-container' : right !== null ? 'border-success bg-surface' : 'border-border bg-surface',
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={picked}
                  aria-label={`Hình ${left + 1}${item.content ? `: ${item.content}` : ''}${right !== null ? `, đã nối với ${question.rightItems[right] ?? ''}` : ', chưa nối'}`}
                  onClick={() => onLeft(left)}
                  className="block w-full text-left"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <span className="flex aspect-[4/3] items-center justify-center bg-image-placeholder text-on-surface-variant">
                      <Icon name="image" size={36} />
                    </span>
                  )}
                  {item.content && <span className="block px-3 pt-2 type-label text-on-surface-variant">{item.content}</span>}
                </button>
                <div className="flex min-h-12 items-center gap-2 px-3 py-2">
                  {right !== null ? (
                    <>
                      <Icon name="check" size={18} className="text-success" />
                      <span className={cn('min-w-0 flex-1', level === 1 ? 'type-h4' : 'type-label')}>{question.rightItems[right]}</span>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Gỡ tên đã nối ở hình ${left + 1}`}
                        onClick={() => onChange({ matches: clearMatch(matches, count, left) })}
                        className="flex size-9 min-h-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </>
                  ) : (
                    <span className="type-body-s text-on-surface-variant">Chưa nối tên</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ul aria-label="Các tên để nối" className="flex flex-wrap gap-3">
        {question.rightItems.map((name, right) => {
          const used = usedRight.has(right);
          const picked = pick?.side === 'right' && pick.index === right;
          return (
            <li key={right}>
              <button
                type="button"
                disabled={disabled || used}
                aria-pressed={picked}
                onClick={() => onRight(right)}
                {...dragProps(`ten:${right}`, !disabled && !used)}
                className={cn(
                  'rounded-full border-2 px-5 transition-colors disabled:opacity-40',
                  level === 1 ? 'min-h-14 type-h4' : 'min-h-11 type-label',
                  picked ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-on-surface hover:bg-surface-container-low',
                )}
              >
                {name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- Sắp xếp ----

function OrderingInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const order = answer?.order ?? [];
  const total = question.items.length;
  const rank = new Map(order.map((item, position) => [item, position]));
  const complete = order.length === total && total > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body-s text-on-surface-variant">
        Chạm lần lượt các mục theo đúng thứ tự (mục chạm trước đứng trước). Chạm một mục đã chọn để bỏ chọn.
      </p>
      <ul
        aria-label="Các mục cần sắp xếp"
        className="flex flex-col gap-3"
        {...dropProps((payload) => {
          const dragged = parseDrag(payload, 'muc');
          if (dragged !== null && !order.includes(dragged)) onChange({ order: toggleOrderItem(order, dragged) });
        }, !disabled)}
      >
        {question.items.map((text, item) => {
          const position = rank.get(item);
          const placed = position !== undefined;
          return (
            <li key={item} className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={placed}
                aria-label={placed ? `${text}, thứ ${position + 1}` : `${text}, chưa xếp`}
                onClick={() => onChange({ order: toggleOrderItem(order, item) })}
                {...dragProps(`muc:${item}`, !disabled && !placed)}
                className={choiceClass(level, placed)}
              >
                <Icon name="grip" size={18} className="shrink-0 text-on-surface-variant" />
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full border-2 type-label',
                    level === 1 ? 'size-11' : 'size-8',
                    placed ? 'border-primary bg-primary text-on-primary' : 'border-dashed border-border-strong text-transparent',
                  )}
                >
                  {placed ? position + 1 : '·'}
                </span>
                <span className="min-w-0 flex-1">{text}</span>
              </button>
              {placed && level !== 1 && (
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    disabled={disabled || position === 0}
                    aria-label={`Đưa lên: ${text}`}
                    onClick={() => onChange({ order: moveOrderItem(order, position, -1) })}
                    className="flex min-h-0 size-8 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                  >
                    <Icon name="arrow-up" size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || position === order.length - 1}
                    aria-label={`Đưa xuống: ${text}`}
                    onClick={() => onChange({ order: moveOrderItem(order, position, 1) })}
                    className="flex min-h-0 size-8 items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                  >
                    <Icon name="arrow-down" size={16} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3">
        <p className="type-body-s text-on-surface-variant" aria-live="polite">
          {complete ? 'Em đã xếp đủ các mục.' : `Em đã xếp ${order.length} / ${total} mục.`}
        </p>
        {order.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ order: [] })}
            className="rounded-sm px-3 type-label text-link underline underline-offset-4"
          >
            Xếp lại từ đầu
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Điền từ ----

function FillBlankInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const count = question.blankCount;
  const blanks = answer?.blanks ?? null;
  const segments = splitBlanks(question.content);
  const bank = question.wordBank;
  const used = new Map<string, number>();
  for (const b of blanks ?? []) if (b) used.set(b, (used.get(b) ?? 0) + 1);
  const taken = new Map(used);

  return (
    <div className="flex flex-col gap-5">
      <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-3 text-on-surface', level === 1 ? 'type-h3' : 'type-question')}>
        {segments.map((text, index) => (
          <span key={index} className="contents">
            <span>{text}</span>
            {index < count && index < segments.length - 1 && (
              bank.length > 0 ? (
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Chỗ trống số ${index + 1}${blanks?.[index] ? `: ${blanks[index]}, chạm để bỏ` : ', chưa điền'}`}
                  onClick={() => blanks?.[index] && onChange({ blanks: setBlank(blanks, count, index, '') })}
                  {...dropProps((payload) => {
                    const dragged = parseDrag(payload, 'tu');
                    const word = dragged === null ? undefined : bank[dragged];
                    if (word) onChange({ blanks: setBlank(blanks, count, index, word) });
                  }, !disabled)}
                  className={cn(
                    'inline-flex min-h-11 min-w-28 items-center justify-center rounded-sm border-b-2 px-3 type-label',
                    blanks?.[index] ? 'border-primary bg-primary-container text-on-primary-container' : 'border-border-strong bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  {blanks?.[index] || '______'}
                </button>
              ) : (
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={255}
                  disabled={disabled}
                  aria-label={`Chỗ trống số ${index + 1}`}
                  value={blanks?.[index] ?? ''}
                  onChange={(event) => onChange({ blanks: setBlank(blanks, count, index, event.target.value) })}
                  className="min-w-32 rounded-sm border-2 border-border-strong bg-surface px-3 type-body-m text-on-surface"
                />
              )
            )}
          </span>
        ))}
      </p>
      {bank.length > 0 && (
        <div>
          <p className="mb-2 type-label text-on-surface-variant">Kho từ</p>
          <ul aria-label="Kho từ" className="flex flex-wrap gap-3">
            {bank.map((word, index) => {
              const left = taken.get(word) ?? 0;
              const isUsed = left > 0;
              if (isUsed) taken.set(word, left - 1);
              return (
                <li key={index}>
                  <button
                    type="button"
                    disabled={disabled || isUsed}
                    onClick={() => onChange({ blanks: fillNextBlank(blanks, count, word) })}
                    {...dragProps(`tu:${index}`, !disabled && !isUsed)}
                    className="min-h-11 rounded-full border-2 border-border-strong bg-surface px-5 type-label text-on-surface hover:bg-surface-container-low disabled:opacity-40"
                  >
                    {word}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Nhiều mệnh đề Đúng/Sai ----

function MultiTrueFalseInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const count = question.statements.length;
  const statements = answer?.statements ?? null;
  const name = useId();
  return (
    <ol className="flex flex-col gap-3">
      {question.statements.map((text, index) => {
        const value = statements?.[index] ?? null;
        const label = `${String.fromCharCode(97 + index)})`;
        return (
          <li key={index} className="flex flex-wrap items-center gap-3 rounded-(--dsv-option-radius) border-2 border-border bg-surface p-3">
            <span className={cn('min-w-0 flex-1 text-on-surface', OPTION_SIZE[level].split(' ').filter((c) => c.startsWith('type-')).join(' '))}>
              <span className="mr-2 type-label text-on-surface-variant">{label}</span>
              {text}
            </span>
            <div role="radiogroup" aria-label={`Mệnh đề ${label}`} className="flex gap-2">
              {([true, false] as const).map((option) => (
                <label
                  key={String(option)}
                  className={cn(
                    'flex min-h-11 min-w-20 cursor-pointer items-center justify-center rounded-sm border-2 px-4 type-label transition-colors',
                    FOCUS,
                    value === option
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-border-strong bg-surface text-on-surface hover:bg-surface-container-low',
                  )}
                >
                  <input
                    type="radio"
                    name={`${name}-${index}`}
                    className="sr-only"
                    checked={value === option}
                    disabled={disabled}
                    onChange={() => onChange({ statements: setStatement(statements, count, index, option) })}
                  />
                  {option ? 'Đúng' : 'Sai'}
                </label>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Ô trả lời theo dạng của câu. */
export function QuestionInput(props: QuestionInputProps) {
  switch (props.question.questionType) {
    case 'IMAGE_CHOICE':
      return <ImageChoiceInput {...props} />;
    case 'MATCHING':
      return <MatchingInput {...props} />;
    case 'ORDERING':
      return <OrderingInput {...props} />;
    case 'FILL_BLANK':
      return <FillBlankInput {...props} />;
    case 'MULTI_TRUE_FALSE':
      return <MultiTrueFalseInput {...props} />;
    default:
      return <OptionsInput {...props} />;
  }
}
