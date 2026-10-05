import {
  BLANK_MARKER,
  PASSAGE_MAX_WORDS,
  countBlankMarkers,
  countLessonWords,
  fieldError,
  markCorrect,
  type QuestionDraft,
} from '@dsvhvn/dung-chung';
import { Button, Icon, SelectField, TextAreaField, TextField } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';
import { ImageField } from './QuestionPickers';

// Phần đáp án của biểu mẫu câu hỏi: đổi theo dạng. Lỗi theo trường lấy từ kiểm hợp lệ của máy chủ (khóa `options[1].content`...).

export interface AnswerFieldsProps {
  draft: QuestionDraft;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (next: QuestionDraft) => void;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="type-h4 text-on-surface">{title}</legend>
      {hint && <p className="type-body-s text-on-surface-variant">{hint}</p>}
      {children}
    </fieldset>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

function remove<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

function replace<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}

function RowActions({
  label,
  index,
  count,
  min,
  disabled,
  onMove,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  min: number;
  disabled: boolean;
  onMove?: (to: number) => void;
  onRemove: () => void;
}) {
  if (disabled) return null;
  return (
    <div className="flex items-end gap-1">
      {onMove && (
        <>
          <Button variant="ghost" size="icon" disabled={index === 0} aria-label={`Đưa ${label} lên`} onClick={() => onMove(index - 1)}>
            <Icon name="arrow-up" size={18} />
          </Button>
          <Button variant="ghost" size="icon" disabled={index === count - 1} aria-label={`Đưa ${label} xuống`} onClick={() => onMove(index + 1)}>
            <Icon name="arrow-down" size={18} />
          </Button>
        </>
      )}
      <Button variant="ghost" size="icon" disabled={count <= min} aria-label={`Xóa ${label}`} onClick={onRemove}>
        <Icon name="trash" size={18} />
      </Button>
    </div>
  );
}

function ChoiceOptions({ draft, errors, disabled, onChange, withImage, max, min }: AnswerFieldsProps & { withImage: boolean; max: number; min: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {draft.options.map((option, i) => {
        const label = withImage ? `thẻ ${i + 1}` : `phương án ${i + 1}`;
        return (
          <li key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="flex items-end gap-3">
              <TextField
                label={withImage ? `Nhãn thẻ ${i + 1}` : `Phương án ${i + 1}`}
                value={option.content}
                disabled={disabled}
                maxLength={withImage ? 50 : 1000}
                error={fieldError(errors, `options[${i}].content`)}
                containerClassName="min-w-0 flex-1"
                onChange={(e) => onChange({ ...draft, options: replace(draft.options, i, { ...option, content: e.target.value }) })}
              />
              <label className="flex h-11 items-center gap-2 type-label whitespace-nowrap">
                <input
                  type="radio"
                  name="dap-an-dung"
                  checked={option.isCorrect}
                  disabled={disabled}
                  aria-label={`Đáp án đúng là ${label}`}
                  onChange={() => onChange({ ...draft, options: markCorrect(draft.options, i) })}
                />
                Đáp án đúng
              </label>
              {max > min && <RowActions label={label} index={i} count={draft.options.length} min={min} disabled={disabled} onRemove={() => onChange({ ...draft, options: remove(draft.options, i) })} />}
            </div>
            {withImage && (
              <ImageField
                label={`Hình thẻ ${i + 1}`}
                value={option.imageUrl}
                heritageId={draft.heritageId}
                heritageName={draft.heritageName}
                disabled={disabled}
                error={fieldError(errors, `options[${i}].imageUrl`)}
                onChange={(url) => onChange({ ...draft, options: replace(draft.options, i, { ...option, imageUrl: url }) })}
              />
            )}
          </li>
        );
      })}
      {fieldError(errors, 'options') && <p className="type-body-s text-danger">{fieldError(errors, 'options')}</p>}
      {!disabled && draft.options.length < max && (
        <li>
          <Button variant="secondary" size="sm" onClick={() => onChange({ ...draft, options: [...draft.options, { content: '', imageUrl: '', isCorrect: false }] })}>
            <Icon name="plus" size={16} />
            {withImage ? 'Thêm thẻ hình' : 'Thêm phương án'}
          </Button>
        </li>
      )}
    </ul>
  );
}

function TrueFalse({ draft, errors, disabled, onChange }: AnswerFieldsProps) {
  const levelOne = draft.levelMin <= 1;
  return (
    <Section title="Đáp án" hint={levelOne ? 'Câu dùng được ở cấp 1 bắt buộc có hình minh họa.' : 'Hình minh họa không bắt buộc.'}>
      <div role="radiogroup" aria-label="Đáp án của câu" className="flex gap-6">
        {[true, false].map((value) => (
          <label key={String(value)} className="flex items-center gap-2 type-body-m">
            <input type="radio" name="dung-sai" checked={draft.answerIsTrue === value} disabled={disabled} onChange={() => onChange({ ...draft, answerIsTrue: value })} />
            {value ? 'Đúng' : 'Sai'}
          </label>
        ))}
      </div>
      <ImageField
        label="Hình minh họa"
        value={draft.imageUrl}
        heritageId={draft.heritageId}
        heritageName={draft.heritageName}
        disabled={disabled}
        error={fieldError(errors, 'imageUrl')}
        onChange={(url) => onChange({ ...draft, imageUrl: url })}
      />
    </Section>
  );
}

function Matching({ draft, errors, disabled, onChange }: AnswerFieldsProps) {
  return (
    <Section title="Các cặp" hint="3-5 cặp. Vế trái là chữ hoặc hình, vế phải là tên (tối đa 50 ký tự). Các vế không được trùng nhau.">
      {draft.pairs.map((pair, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-end gap-3">
            <TextField
              label={`Vế trái ${i + 1} (chữ, nếu không dùng hình)`}
              value={pair.left}
              disabled={disabled}
              error={fieldError(errors, `pairs[${i}].left`)}
              containerClassName="min-w-0 flex-1"
              onChange={(e) => onChange({ ...draft, pairs: replace(draft.pairs, i, { ...pair, left: e.target.value }) })}
            />
            <TextField
              label={`Vế phải ${i + 1}`}
              value={pair.right}
              disabled={disabled}
              maxLength={50}
              error={fieldError(errors, `pairs[${i}].right`)}
              containerClassName="min-w-0 flex-1"
              onChange={(e) => onChange({ ...draft, pairs: replace(draft.pairs, i, { ...pair, right: e.target.value }) })}
            />
            <RowActions label={`cặp ${i + 1}`} index={i} count={draft.pairs.length} min={3} disabled={disabled} onRemove={() => onChange({ ...draft, pairs: remove(draft.pairs, i) })} />
          </div>
          <ImageField
            label={`Hình vế trái ${i + 1}`}
            value={pair.leftImageUrl}
            heritageId={draft.heritageId}
            heritageName={draft.heritageName}
            disabled={disabled}
            error={fieldError(errors, `pairs[${i}].leftImageUrl`)}
            onChange={(url) => onChange({ ...draft, pairs: replace(draft.pairs, i, { ...pair, leftImageUrl: url }) })}
          />
        </div>
      ))}
      {fieldError(errors, 'pairs') && <p className="type-body-s text-danger">{fieldError(errors, 'pairs')}</p>}
      {!disabled && draft.pairs.length < 5 && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange({ ...draft, pairs: [...draft.pairs, { left: '', leftImageUrl: '', right: '' }] })}>
            <Icon name="plus" size={16} />
            Thêm cặp
          </Button>
        </div>
      )}
    </Section>
  );
}

function Ordering({ draft, errors, disabled, onChange }: AnswerFieldsProps) {
  const max = draft.levelMin <= 1 ? 4 : 6;
  return (
    <Section title="Các mục theo thứ tự đúng" hint={`3-${max} mục${max === 4 ? ' (câu dùng được ở cấp 1 tối đa 4 mục)' : ''}. Nhập theo thứ tự đúng; học sinh sẽ thấy các mục đã xáo.`}>
      {draft.steps.map((step, i) => (
        <div key={i} className="flex items-end gap-3">
          <span className="flex h-11 w-8 items-center type-mono-label" aria-hidden="true">
            {i + 1}.
          </span>
          <TextField
            label={`Mục ${i + 1}`}
            value={step}
            disabled={disabled}
            maxLength={200}
            error={fieldError(errors, `steps[${i}]`)}
            containerClassName="min-w-0 flex-1"
            onChange={(e) => onChange({ ...draft, steps: replace(draft.steps, i, e.target.value) })}
          />
          <RowActions
            label={`mục ${i + 1}`}
            index={i}
            count={draft.steps.length}
            min={3}
            disabled={disabled}
            onMove={(to) => onChange({ ...draft, steps: move(draft.steps, i, to) })}
            onRemove={() => onChange({ ...draft, steps: remove(draft.steps, i) })}
          />
        </div>
      ))}
      {fieldError(errors, 'steps') && <p className="type-body-s text-danger">{fieldError(errors, 'steps')}</p>}
      {!disabled && draft.steps.length < max && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange({ ...draft, steps: [...draft.steps, ''] })}>
            <Icon name="plus" size={16} />
            Thêm mục
          </Button>
        </div>
      )}
    </Section>
  );
}

function FillBlank({ draft, errors, disabled, onChange }: AnswerFieldsProps) {
  const markers = countBlankMarkers(draft.content);
  return (
    <Section
      title="Chỗ trống"
      hint={`Viết ${BLANK_MARKER} (ba dấu gạch dưới liền nhau) vào lời câu ở mỗi chỗ trống, tối đa 3 chỗ. Mỗi chỗ nhận 1-5 cách viết đúng, cách nhau bằng dấu chấm phẩy.`}
    >
      <p className="type-body-s text-on-surface-variant" aria-live="polite">
        Lời câu đang có {markers} chỗ trống.
      </p>
      {draft.blanks.map((blank, i) => (
        <TextField
          key={i}
          label={`Cách viết đúng của chỗ trống ${i + 1}`}
          value={blank.accepted}
          disabled={disabled}
          placeholder="Ví dụ: Thăng Long; Hà Nội"
          error={fieldError(errors, `blanks[${i}].accepted`)}
          onChange={(e) => onChange({ ...draft, blanks: replace(draft.blanks, i, { accepted: e.target.value }) })}
        />
      ))}
      <TextField
        label="Từ gây nhiễu (không bắt buộc)"
        value={draft.distractors}
        disabled={disabled}
        hint="Có từ gây nhiễu thì học sinh chọn từ trong kho từ 3-8 từ; để trống thì học sinh gõ chữ."
        error={fieldError(errors, 'distractors')}
        onChange={(e) => onChange({ ...draft, distractors: e.target.value })}
      />
    </Section>
  );
}

function Statements({ draft, errors, disabled, onChange }: AnswerFieldsProps) {
  return (
    <Section title="Các mệnh đề" hint="3-5 mệnh đề (10-500 ký tự). Không để mọi mệnh đề cùng Đúng hoặc cùng Sai.">
      {draft.statements.map((statement, i) => (
        <div key={i} className="flex items-end gap-3">
          <TextAreaField
            label={`Mệnh đề ${i + 1}`}
            rows={2}
            value={statement.text}
            disabled={disabled}
            maxLength={500}
            error={fieldError(errors, `statements[${i}].text`)}
            containerClassName="min-w-0 flex-1"
            onChange={(e) => onChange({ ...draft, statements: replace(draft.statements, i, { ...statement, text: e.target.value }) })}
          />
          <SelectField
            label="Đáp án"
            value={statement.isTrue ? 'dung' : 'sai'}
            disabled={disabled}
            options={[
              { value: 'dung', label: 'Đúng' },
              { value: 'sai', label: 'Sai' },
            ]}
            containerClassName="w-28"
            onChange={(e) => onChange({ ...draft, statements: replace(draft.statements, i, { ...statement, isTrue: e.target.value === 'dung' }) })}
            aria-label={`Đáp án của mệnh đề ${i + 1}`}
          />
          <RowActions label={`mệnh đề ${i + 1}`} index={i} count={draft.statements.length} min={3} disabled={disabled} onRemove={() => onChange({ ...draft, statements: remove(draft.statements, i) })} />
        </div>
      ))}
      {fieldError(errors, 'statements') && <p className="type-body-s text-danger">{fieldError(errors, 'statements')}</p>}
      {!disabled && draft.statements.length < 5 && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange({ ...draft, statements: [...draft.statements, { text: '', isTrue: true }] })}>
            <Icon name="plus" size={16} />
            Thêm mệnh đề
          </Button>
        </div>
      )}
    </Section>
  );
}

function SourceReading({ draft, errors, disabled, onChange }: AnswerFieldsProps) {
  const words = countLessonWords(draft.passage);
  return (
    <>
      <Section title="Tư liệu" hint="Đoạn trích bắt buộc kèm nguồn.">
        <TextAreaField
          label="Đoạn tư liệu"
          rows={5}
          value={draft.passage}
          disabled={disabled}
          hint={`${words} / ${PASSAGE_MAX_WORDS} từ`}
          error={fieldError(errors, 'passage')}
          onChange={(e) => onChange({ ...draft, passage: e.target.value })}
        />
        <TextField
          label="Nguồn của đoạn tư liệu"
          value={draft.passageSource}
          disabled={disabled}
          maxLength={500}
          error={fieldError(errors, 'passageSource')}
          onChange={(e) => onChange({ ...draft, passageSource: e.target.value })}
        />
      </Section>
      <Section title="Phương án của câu hỏi" hint="Đúng 4 phương án, đúng một phương án đúng.">
        <ChoiceOptions draft={draft} errors={errors} disabled={disabled} onChange={onChange} withImage={false} min={4} max={4} />
      </Section>
    </>
  );
}

export function AnswerFields(props: AnswerFieldsProps) {
  switch (props.draft.questionType) {
    case 'SINGLE_CHOICE':
      return (
        <Section title="Phương án" hint="Đúng 4 phương án, đúng một phương án đúng.">
          <ChoiceOptions {...props} withImage={false} min={4} max={4} />
        </Section>
      );
    case 'IMAGE_CHOICE':
      return (
        <Section title="Thẻ hình" hint="3-4 thẻ, mỗi thẻ một hình khác nhau kèm nhãn; đánh dấu một thẻ đúng.">
          <ChoiceOptions {...props} withImage min={3} max={4} />
        </Section>
      );
    case 'TRUE_FALSE':
      return <TrueFalse {...props} />;
    case 'MATCHING':
      return <Matching {...props} />;
    case 'ORDERING':
      return <Ordering {...props} />;
    case 'FILL_BLANK':
      return <FillBlank {...props} />;
    case 'MULTI_TRUE_FALSE':
      return <Statements {...props} />;
    case 'SOURCE_READING':
      return <SourceReading {...props} />;
  }
}
