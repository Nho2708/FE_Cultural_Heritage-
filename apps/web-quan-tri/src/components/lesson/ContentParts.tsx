import { LESSON_LENGTHS, LESSON_LENGTH_LABEL, LESSON_LIMITS, cn } from '@dsvhvn/dung-chung';
import type { AiQuota, LessonFrame, LessonLength } from '@dsvhvn/dung-chung/api';
import { Button, Icon, TextField } from '@dsvhvn/dung-chung/ui';
import { AiQuotaMeter } from './LessonBits';
import { moveItem } from './lessonForm';

// Hai khối của phần "Nội dung bài theo cấp": bảng điều khiển AI (độ dài Ngắn / Vừa / Chi tiết theo khoảng của cấp, nút soạn, lượt
// AI của trường) và danh sách Ý chính (1-10 ý, mỗi ý tối đa 300 ký tự, đóng khung ở cuối bài).

const TARGET_WORDS: Record<LessonLength, keyof Pick<LessonFrame, 'shortWords' | 'mediumWords' | 'detailedWords'>> = {
  SHORT: 'shortWords',
  MEDIUM: 'mediumWords',
  DETAILED: 'detailedWords',
};

interface AiPanelProps {
  frame: LessonFrame;
  quota: AiQuota;
  length: LessonLength;
  onLength: (length: LessonLength) => void;
  hasContent: boolean;
  composing: boolean;
  disabled: boolean;
  onCompose: () => void;
}

export function AiPanel({ frame, quota, length, onLength, hasContent, composing, disabled, onCompose }: AiPanelProps) {
  const noPlan = !quota.hasEffectivePlan;
  const exhausted = quota.hasEffectivePlan && (quota.remaining ?? 0) <= 0;
  const blocked = disabled || noPlan || exhausted;
  const reason = noPlan
    ? 'Trường chưa có gói còn hiệu lực nên chưa dùng được AI.'
    : exhausted
      ? 'Trường đã dùng hết lượt AI trong kỳ của gói. Thầy cô vẫn nhập nội dung bằng tay được.'
      : null;

  return (
    <div className="grid gap-4 dsvmd:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">Độ dài</legend>
          <span className="type-label text-on-surface" aria-hidden="true">
            Độ dài
          </span>
          <div className="inline-flex rounded-full border border-border-strong bg-surface p-0.5">
            {LESSON_LENGTHS.map((value) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="do-dai"
                  value={value}
                  checked={length === value}
                  disabled={disabled || composing}
                  onChange={() => onLength(value)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'block rounded-full px-4 py-1.5 type-label peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                    length === value ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container',
                  )}
                >
                  {LESSON_LENGTH_LABEL[value]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="type-body-s text-on-surface-variant">
          {LESSON_LENGTHS.map((value) => `${LESSON_LENGTH_LABEL[value]} khoảng ${frame[TARGET_WORDS[value]]}`).join(' · ')} từ
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={hasContent ? 'secondary' : 'primary'} loading={composing} disabled={blocked} onClick={onCompose}>
            <Icon name="sparkles" size={16} />
            {hasContent ? 'Tạo lại' : 'Soạn nội dung bằng AI'}
          </Button>
          <p className="min-w-0 flex-1 type-body-s text-on-surface-variant">
            {reason ?? 'Mỗi lần soạn hoặc tạo lại tính một lượt AI của trường.'}
          </p>
        </div>
        {composing && (
          <output className="block type-body-s text-(--dsv-ai-panel-fg)">
            AI đang xử lý, vui lòng đợi trong giây lát. Nội dung tạm khóa đến khi có kết quả.
          </output>
        )}
        {!hasContent && !composing && <p className="type-body-s text-on-surface-variant">Bài chưa có nội dung thì nút là "Soạn nội dung bằng AI".</p>}
      </div>
      <AiQuotaMeter quota={quota} />
    </div>
  );
}

interface KeyPointsEditorProps {
  points: string[];
  readOnly: boolean;
  onChange: (points: string[]) => void;
}

export function KeyPointsEditor({ points, readOnly, onChange }: KeyPointsEditorProps) {
  const set = (index: number, value: string) => onChange(points.map((p, i) => (i === index ? value : p)));
  return (
    <section aria-labelledby="y-chinh" className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 id="y-chinh" className="type-label text-on-surface">
          Ý chính
        </h4>
        <span className="type-body-s text-on-surface-variant">
          đóng khung ở cuối bài · {LESSON_LIMITS.minKeyPoints}-{LESSON_LIMITS.maxKeyPoints} ý · mỗi ý tối đa {LESSON_LIMITS.keyPointMaxLength} ký tự
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {points.map((point, index) => (
          <li key={index} className="flex items-start gap-2">
            <TextField
              label={`Ý chính ${index + 1}`}
              readOnly={readOnly}
              value={point}
              maxLength={LESSON_LIMITS.keyPointMaxLength}
              containerClassName="min-w-0 flex-1 [&>label]:sr-only"
              onChange={(e) => set(index, e.target.value)}
            />
            {!readOnly && (
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="icon" disabled={index === 0} aria-label={`Đưa ý chính ${index + 1} lên trên`} onClick={() => onChange(moveItem(points, index, -1))}>
                  <Icon name="arrow-up" size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === points.length - 1}
                  aria-label={`Đưa ý chính ${index + 1} xuống dưới`}
                  onClick={() => onChange(moveItem(points, index, 1))}
                >
                  <Icon name="arrow-down" size={18} />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Xóa ý chính ${index + 1}`} onClick={() => onChange(points.filter((_, i) => i !== index))}>
                  <Icon name="trash" size={18} />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-link"
          disabled={points.length >= LESSON_LIMITS.maxKeyPoints}
          onClick={() => onChange([...points, ''])}
        >
          <Icon name="plus" size={16} />
          Thêm ý chính
        </Button>
      )}
    </section>
  );
}
