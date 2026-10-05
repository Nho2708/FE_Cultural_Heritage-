import { LESSON_LIMITS, LESSON_SECTION_LABEL, cn, countLessonWords } from '@dsvhvn/dung-chung';
import type { LessonEventOption, LessonFrame, LessonImageOption } from '@dsvhvn/dung-chung/api';
import { Button, Icon, SelectField, TextAreaField, TextField } from '@dsvhvn/dung-chung/ui';
import { creditLine, type SectionState } from './lessonForm';

// Một phần nội dung của bài trên màn hình Soạn bài học. Mỗi loại phần có ô nhập riêng theo khung của cấp: bước câu chuyện (cấp 1:
// đoạn truyện, câu ngắn kèm hình, hình bắt buộc), hình và chú thích, đoạn văn, mốc thời gian (năm, nối với sự kiện của di sản),
// đoạn trích tư liệu gốc (nguồn bắt buộc), câu hỏi gợi suy nghĩ. Phần thuộc khung của cấp khác hiện cảnh báo và chỉ xóa được.

interface SectionCardProps {
  section: SectionState;
  /** Số thứ tự trong các phần cùng loại (bước 1, đoạn trích 2...). */
  ordinal: number;
  position: number;
  total: number;
  frame: LessonFrame;
  readOnly: boolean;
  error?: string;
  events: LessonEventOption[];
  images: LessonImageOption[];
  onChange: (patch: Partial<SectionState>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onPickImage: () => void;
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  window.speechSynthesis.speak(utterance);
}

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function ImageBlock({
  section,
  required,
  readOnly,
  onPick,
}: {
  section: SectionState;
  required: boolean;
  readOnly: boolean;
  onPick: () => void;
}) {
  const credit = section.image ? creditLine(section.image) : '';
  return (
    <div className="flex flex-col gap-2 dsvsm:w-48 dsvsm:shrink-0">
      {section.imageUrl ? (
        <img src={section.imageUrl} alt="" className="h-32 w-full rounded-sm object-cover" />
      ) : (
        <div
          className={cn(
            'flex h-32 w-full items-center justify-center rounded-sm border border-dashed text-center type-body-s',
            required ? 'border-danger text-danger' : 'border-border-strong text-on-surface-variant',
          )}
        >
          {required ? 'Bắt buộc có hình' : 'Chưa có hình'}
        </div>
      )}
      {credit && <p className="type-body-s text-on-surface-variant">{credit}</p>}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={onPick} className="self-start text-link">
          <Icon name="image" size={16} />
          {section.imageUrl ? 'Chọn hình khác' : 'Chọn hình'}
        </Button>
      )}
    </div>
  );
}

export function SectionCard(props: SectionCardProps) {
  const { section, ordinal, position, total, frame, readOnly, error, events, onChange, onMove, onRemove, onPickImage } = props;
  const outside = !frame.allowedTypes.includes(section.type);
  const words = countLessonWords(section.body);
  const label = LESSON_SECTION_LABEL[section.type];
  const heading = section.type === 'STORY' ? `Bước ${ordinal}` : section.type === 'SOURCE_EXCERPT' ? `Đoạn trích ${ordinal}` : label;

  let meta = '';
  if (section.type === 'STORY') meta = `${words} từ · tối đa ${LESSON_LIMITS.level1StepMaxWords} từ · bắt buộc có hình`;
  else if (section.type === 'SOURCE_EXCERPT') meta = `${words} từ · tối đa ${LESSON_LIMITS.level3ExcerptMaxWords} từ · bắt buộc ghi nguồn`;
  else if (section.type === 'READING') meta = `${words} từ`;

  const chooseEvent = (value: string) => {
    if (value === '') return onChange({ eventId: null });
    const event = events.find((e) => String(e.eventId) === value);
    if (!event) return;
    onChange({
      eventId: event.eventId,
      milestoneYear: String(event.startYear),
      title: event.dateLabel,
      body: section.body.trim() === '' ? (event.name ?? '') : section.body,
    });
  };

  return (
    <li
      className={cn(
        'rounded-md border bg-surface p-4',
        outside || error ? 'border-warning' : 'border-border',
      )}
      aria-label={`${heading}, phần ${position + 1} trên ${total}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="type-label text-on-surface">{heading}</h4>
        <span className="type-body-s text-on-surface-variant">
          phần {position + 1}
          {meta && ` · ${meta}`}
        </span>
        {!readOnly && (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={position === 0} aria-label={`Đưa ${heading} lên trên`} onClick={() => onMove(-1)}>
              <Icon name="arrow-up" size={18} />
            </Button>
            <Button variant="ghost" size="icon" disabled={position === total - 1} aria-label={`Đưa ${heading} xuống dưới`} onClick={() => onMove(1)}>
              <Icon name="arrow-down" size={18} />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Xóa ${heading}`} onClick={onRemove}>
              <Icon name="trash" size={18} />
            </Button>
          </div>
        )}
      </div>

      {outside && (
        <p className="mt-2 type-body-s text-on-warning-container">
          Loại phần này thuộc khung của cấp khác; học sinh lớp cấp {frame.level} sẽ không thấy. Hãy xóa phần này trước khi lưu.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 type-body-s text-danger">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {section.type === 'STORY' && (
          <div className="flex flex-col gap-3 dsvsm:flex-row">
            <ImageBlock section={section} required readOnly={readOnly} onPick={onPickImage} />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <TextAreaField
                label="Đoạn truyện"
                rows={3}
                readOnly={readOnly}
                value={section.body}
                onChange={(e) => onChange({ body: e.target.value })}
              />
              <TextField
                label="Câu ngắn kèm hình"
                readOnly={readOnly}
                value={section.title}
                maxLength={LESSON_LIMITS.sectionTitleMaxLength}
                onChange={(e) => onChange({ title: e.target.value })}
              />
              {canSpeak() && section.body.trim() !== '' && (
                <Button variant="ghost" size="sm" className="self-start text-link" onClick={() => speak(section.body)}>
                  <Icon name="volume" size={16} />
                  Nghe thử giọng đọc
                </Button>
              )}
            </div>
          </div>
        )}

        {section.type === 'IMAGE' && (
          <div className="flex flex-col gap-3 dsvsm:flex-row">
            <ImageBlock section={section} required={false} readOnly={readOnly} onPick={onPickImage} />
            <TextAreaField
              label="Chú thích"
              rows={2}
              readOnly={readOnly}
              value={section.body}
              containerClassName="min-w-0 flex-1"
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </div>
        )}

        {section.type === 'READING' && (
          <>
            <TextField
              label="Tiêu đề phần"
              readOnly={readOnly}
              value={section.title}
              maxLength={LESSON_LIMITS.sectionTitleMaxLength}
              hint="Không bắt buộc, ví dụ: Bối cảnh, Ý nghĩa."
              onChange={(e) => onChange({ title: e.target.value })}
            />
            <TextAreaField
              label="Đoạn văn"
              rows={frame.level === 3 ? 7 : 5}
              readOnly={readOnly}
              value={section.body}
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </>
        )}

        {section.type === 'MILESTONE' && (
          <div className="grid gap-3 dsvmd:grid-cols-[120px_1fr_1.4fr]">
            <TextField
              label="Năm"
              inputMode="numeric"
              readOnly={readOnly}
              value={section.milestoneYear}
              hint="Năm âm là trước Công nguyên."
              onChange={(e) => onChange({ milestoneYear: e.target.value.replace(/[^\d-]/g, '') })}
            />
            <SelectField
              label="Nối với sự kiện của di sản"
              disabled={readOnly}
              value={section.eventId === null ? '' : String(section.eventId)}
              onChange={(e) => chooseEvent(e.target.value)}
              options={[
                { value: '', label: 'Nhập tay, không nối' },
                ...events.map((e) => ({ value: String(e.eventId), label: `${e.dateLabel} · ${e.name ?? ''}` })),
              ]}
            />
            <TextField
              label="Nội dung mốc"
              readOnly={readOnly}
              value={section.body}
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </div>
        )}

        {section.type === 'SOURCE_EXCERPT' && (
          <>
            <TextAreaField
              label="Đoạn trích"
              rows={3}
              readOnly={readOnly}
              value={section.body}
              onChange={(e) => onChange({ body: e.target.value })}
            />
            <TextField
              label="Nguồn"
              readOnly={readOnly}
              value={section.sourceCitation}
              maxLength={LESSON_LIMITS.sourceCitationMaxLength}
              hint="Bắt buộc: ghi tác phẩm, tác giả hoặc tài liệu của đoạn trích."
              onChange={(e) => onChange({ sourceCitation: e.target.value })}
            />
          </>
        )}

        {section.type === 'REFLECTION' && (
          <TextAreaField
            label="Câu hỏi"
            rows={2}
            readOnly={readOnly}
            value={section.body}
            hint="Câu hỏi chỉ để học sinh suy nghĩ: không chấm điểm."
            onChange={(e) => onChange({ body: e.target.value })}
          />
        )}
      </div>
    </li>
  );
}
