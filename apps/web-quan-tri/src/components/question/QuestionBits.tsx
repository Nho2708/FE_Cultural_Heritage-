import { DIFFICULTY_LABEL, REVIEW_STATUS_LABEL, levelRangeLabel } from '@dsvhvn/dung-chung';
import type { QuestionDifficulty, QuestionPreview, QuestionReviewStatus } from '@dsvhvn/dung-chung/api';
import { Badge, type BadgeTone } from '@dsvhvn/dung-chung/ui';

// Các mảnh nhỏ dùng chung của khu Ngân hàng câu hỏi: nhãn trạng thái, độ khó, cấp và khung xem trước như học sinh.

const STATUS_TONE: Record<QuestionReviewStatus, BadgeTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

export function ReviewStatusBadge({ status, hidden }: { status: QuestionReviewStatus | null; hidden?: boolean }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status]}>{hidden ? 'Bị ẩn' : REVIEW_STATUS_LABEL[status]}</Badge>;
}

export function DifficultyBadge({ value }: { value: QuestionDifficulty | null }) {
  return value ? <Badge>{DIFFICULTY_LABEL[value]}</Badge> : null;
}

export function LevelRangeBadge({ min, max }: { min: number; max: number }) {
  return <Badge>{levelRangeLabel(min, max)}</Badge>;
}

const LAYOUT_NOTE: Record<QuestionPreview['layout'], string> = {
  LARGE_CARDS: 'thẻ lớn, đọc to lời câu',
  STANDARD: 'bố cục chuẩn',
  COMPACT: 'bố cục gọn',
};

function Picture({ url }: { url: string | null }) {
  return url ? <img src={url} alt="" loading="lazy" className="max-h-40 rounded-md object-cover" /> : null;
}

/** Câu như học sinh của cấp thấy (không có đáp án đúng); chỉ để xem, không chấm. */
export function QuestionPreviewCard({
  preview,
  selectedIndex,
  onSelectOption,
}: {
  preview: QuestionPreview;
  /** Phương án đang chọn khi chấm thử. */
  selectedIndex?: number | null;
  /** Có thì các phương án bấm được để chấm thử đáp án. */
  onSelectOption?: (index: number) => void;
}) {
  const big = preview.layout === 'LARGE_CARDS';
  const text = big ? 'type-h4' : 'type-body-m';
  return (
    <section aria-label={`Xem trước cấp ${preview.level}`} className="rounded-md border border-border bg-surface p-4" data-testid="xem-truoc">
      <p className="type-body-s text-on-surface-variant">
        Cấp {preview.level} · {preview.typeName} · {LAYOUT_NOTE[preview.layout]}
        {preview.readAloud ? ' · có nút nghe' : ''}
      </p>
      {preview.passage && (
        <blockquote className="mt-3 rounded-sm bg-surface-container-low p-3 type-body-m">
          {preview.passage}
          {preview.passageSource && <footer className="mt-1 type-body-s text-on-surface-variant">Nguồn: {preview.passageSource}</footer>}
        </blockquote>
      )}
      <p className={`mt-3 text-on-surface ${text}`}>{preview.content}</p>
      <div className="mt-2">
        <Picture url={preview.imageUrl} />
      </div>

      {preview.options.length > 0 && (
        <ul className={big ? 'mt-3 grid grid-cols-2 gap-3' : 'mt-3 flex flex-col gap-2'}>
          {preview.options.map((o, i) => (
            <li key={i}>
              {onSelectOption ? (
                <button
                  type="button"
                  aria-pressed={selectedIndex === i}
                  aria-label={`Chấm thử phương án ${o.content ?? i + 1}`}
                  onClick={() => onSelectOption(i)}
                  className={`flex w-full items-center gap-3 rounded-md border p-3 text-left ${text} ${selectedIndex === i ? 'border-2 border-primary' : 'border-border hover:bg-surface-container-low'}`}
                >
                  <Picture url={o.imageUrl} />
                  <span>{o.content}</span>
                </button>
              ) : (
                <div className={`flex items-center gap-3 rounded-md border border-border p-3 ${text}`}>
                  <Picture url={o.imageUrl} />
                  <span>{o.content}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {preview.leftItems.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <ul className="flex flex-col gap-2" aria-label="Cột bên trái">
            {preview.leftItems.map((o, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border border-border p-3">
                <Picture url={o.imageUrl} />
                <span>{o.content}</span>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-2" aria-label="Cột bên phải">
            {preview.rightItems.map((r, i) => (
              <li key={i} className="rounded-md border border-dashed border-border-strong p-3">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.items.length > 0 && (
        <ol className="mt-3 flex flex-col gap-2" aria-label="Các mục cần sắp xếp">
          {preview.items.map((item, i) => (
            <li key={i} className="rounded-md border border-border p-3">
              {item}
            </li>
          ))}
        </ol>
      )}

      {preview.blankCount > 0 && (
        <p className="mt-3 type-body-s text-on-surface-variant">
          {preview.blankCount} chỗ trống{preview.wordBank.length > 0 ? ', chọn từ trong kho từ' : ', học sinh gõ chữ'}
        </p>
      )}
      {preview.wordBank.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Kho từ">
          {preview.wordBank.map((w, i) => (
            <li key={i} className="rounded-full border border-border px-3 py-1">
              {w}
            </li>
          ))}
        </ul>
      )}

      {preview.statements.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="Các mệnh đề">
          {preview.statements.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>{s}</span>
              <span className="type-label text-on-surface-variant">Đúng / Sai</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
