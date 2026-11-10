import { LESSON_LIMITS, cn, splitApiError } from '@dsvhvn/dung-chung';
import type { AiQuota, RewriteSectionBody, RewriteSectionResult } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, TextField } from '@dsvhvn/dung-chung/ui';
import { useEffect, useRef, useState } from 'react';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import type { SectionState } from './lessonForm';
import { QUICK_INSTRUCTIONS, isRewritable } from './rewriteSection';

// "Viết lại bằng AI" trên một phần của bài (trừ đoạn trích tư liệu gốc vì phải nguyên văn). Dùng chữ đang sửa trên màn hình, chưa cần lưu.
// Thầy cô ghi yêu cầu ngắn hoặc bấm một yêu cầu chọn nhanh (điền vào ô, chưa gọi AI), bấm "Viết lại", xem bản cũ cạnh bản mới rồi chọn
// "Dùng bản này" (thay chữ trong biểu mẫu, chưa lưu) hoặc "Giữ bản cũ". Mỗi lần viết lại tính một lượt AI của trường.


interface SectionRewriteProps {
  lessonId: number;
  section: SectionState;
  /** Tên của phần dùng trong nhãn nút, ví dụ "Bước 1". */
  heading: string;
  quota: AiQuota;
  /** Khóa khi bài chỉ đọc hoặc đang có thao tác khác. */
  disabled: boolean;
  onQuota: (quota: AiQuota) => void;
  onApply: (patch: Partial<SectionState>) => void;
}

function bodyFor(section: SectionState, instructions: string): RewriteSectionBody | null {
  if (!isRewritable(section.type)) return null;
  const body: RewriteSectionBody = { sectionType: section.type, text: section.body.trim() };
  if (section.title.trim() !== '' && section.type !== 'IMAGE' && section.type !== 'REFLECTION') body.title = section.title.trim();
  if (section.type === 'MILESTONE' && section.milestoneYear.trim() !== '' && Number.isInteger(Number(section.milestoneYear))) {
    body.year = Number(section.milestoneYear);
  }
  if (instructions.trim() !== '') body.instructions = instructions.trim();
  return body;
}

export function SectionRewrite({ lessonId, section, heading, quota, disabled, onQuota, onApply }: SectionRewriteProps) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Bản cũ giữ đúng chữ đã gửi đi, để so với bản mới dù thầy cô sửa tiếp khi chờ.
  const [result, setResult] = useState<{ result: RewriteSectionResult; oldText: string; oldTitle: string } | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) firstField.current?.querySelector('input')?.focus();
  }, [open]);

  const noPlan = !quota.hasEffectivePlan;
  const exhausted = quota.hasEffectivePlan && (quota.remaining ?? 0) <= 0;
  const emptyText = section.body.trim() === '';
  const tooLong = section.body.trim().length > LESSON_LIMITS.rewriteTextMaxLength;
  const blockReason = noPlan
    ? 'Trường chưa có gói còn hiệu lực nên chưa dùng được AI.'
    : exhausted
      ? 'Trường đã dùng hết lượt AI trong kỳ của gói.'
      : emptyText
        ? 'Hãy nhập nội dung cho phần này trước khi nhờ AI viết lại.'
        : tooLong
          ? `Phần này dài quá ${LESSON_LIMITS.rewriteTextMaxLength} ký tự nên AI chưa viết lại được.`
          : null;

  const close = () => {
    setOpen(false);
    setResult(null);
    setProblem(null);
    setFieldError(null);
    openButton.current?.focus();
  };

  const run = async () => {
    const body = bodyFor(section, instructions);
    if (!body || blockReason) return;
    setRunning(true);
    setProblem(null);
    setFieldError(null);
    try {
      const { data } = await lessonsApi.rewriteSection(lessonId, body);
      setResult({ result: data, oldText: section.body, oldTitle: section.title });
      onQuota(data.aiQuota);
    } catch (err) {
      const failure = splitApiError<'instructions' | 'text'>(err, ['instructions', 'text']);
      setFieldError(failure.fields.instructions ?? null);
      setProblem(failure.fields.text ?? failure.form);
      void lessonsApi.aiQuota().then((r) => onQuota(r.data), () => undefined);
    } finally {
      setRunning(false);
    }
  };

  const apply = () => {
    if (!result) return;
    onApply({ body: result.result.text, ...(result.result.title !== null ? { title: result.result.title } : {}) });
    close();
  };

  if (!open) {
    return (
      <div className="mt-3">
        <Button
          ref={openButton}
          variant="ghost"
          size="sm"
          className="text-link"
          disabled={disabled}
          aria-label={`Viết lại bằng AI ${heading}`}
          onClick={() => setOpen(true)}
        >
          <Icon name="sparkles" size={16} />
          Viết lại bằng AI
        </Button>
      </div>
    );
  }

  const newTitle = result?.result.title ?? null;
  return (
    <section
      aria-label={`Viết lại ${heading} bằng AI`}
      className="mt-3 rounded-md border border-(--dsv-ai-panel-border) bg-(--dsv-ai-panel-bg) p-4 text-(--dsv-ai-panel-fg)"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="sparkles" size={18} />
        <h5 className="type-label">Viết lại bằng AI</h5>
        <span className="type-body-s">
          {quota.hasEffectivePlan ? `Còn ${quota.remaining ?? 0} lượt AI trong kỳ; mỗi lần viết lại tính một lượt.` : 'Trường chưa có gói còn hiệu lực.'}
        </span>
      </div>

      {!result && (
        <div className="mt-3 flex flex-col gap-3 text-on-surface">
          <div ref={firstField}>
            <TextField
              label="Yêu cầu cho AI (không bắt buộc)"
              name="rewrite-instructions"
              value={instructions}
              maxLength={LESSON_LIMITS.aiInstructionsMaxLength}
              readOnly={running}
              error={fieldError}
              placeholder="Ví dụ: Ngắn hơn, giữ nguyên các mốc năm"
              hint={`${instructions.length}/${LESSON_LIMITS.aiInstructionsMaxLength} ký tự. AI giữ ý của bản cũ và chỉ dùng dữ kiện có trong tư liệu của di sản.`}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Yêu cầu chọn nhanh</legend>
            {QUICK_INSTRUCTIONS.map((text) => (
              <button
                key={text}
                type="button"
                aria-pressed={instructions === text}
                disabled={running}
                onClick={() => setInstructions(instructions === text ? '' : text)}
                className={cn(
                  'min-h-9 rounded-full border px-4 type-label focus-visible:outline-2 focus-visible:outline-offset-2',
                  instructions === text ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-on-surface hover:bg-surface-container',
                )}
              >
                {text}
              </button>
            ))}
          </fieldset>
          {problem && <InlineMessage tone="danger">{problem}</InlineMessage>}
          {blockReason && !problem && <p className="type-body-s text-on-surface-variant">{blockReason}</p>}
          {running && <output className="block type-body-s">AI đang viết lại, vui lòng đợi trong giây lát.</output>}
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" loading={running} disabled={blockReason !== null} onClick={() => void run()}>
              <Icon name="sparkles" size={16} />
              Viết lại
            </Button>
            <Button size="sm" variant="secondary" disabled={running} onClick={close}>
              Hủy
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3 flex flex-col gap-3 text-on-surface">
          {result.result.warnings.length > 0 && <InlineMessage tone="warning">{result.result.warnings.join(' ')}</InlineMessage>}
          <div className="grid gap-3 dsvmd:grid-cols-2">
            <div className="rounded-sm border border-border bg-surface p-3">
              <h6 className="type-label text-on-surface-variant">Bản cũ</h6>
              {result.oldTitle.trim() !== '' && <p className="mt-1 type-label">{result.oldTitle}</p>}
              <p className="mt-1 whitespace-pre-wrap type-body-m" data-testid="ban-cu">
                {result.oldText}
              </p>
            </div>
            <div className="rounded-sm border-2 border-primary bg-surface p-3">
              <h6 className="type-label text-on-surface-variant">Bản mới</h6>
              {newTitle !== null && newTitle.trim() !== '' && <p className="mt-1 type-label">{newTitle}</p>}
              <p className="mt-1 whitespace-pre-wrap type-body-m" data-testid="ban-moi">
                {result.result.text}
              </p>
            </div>
          </div>
          <p className="type-body-s text-on-surface-variant">
            "Dùng bản này" chỉ thay chữ trong biểu mẫu; thầy cô vẫn cần bấm Lưu để lưu vào bài.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={apply}>
              <Icon name="check" size={16} />
              Dùng bản này
            </Button>
            <Button size="sm" variant="secondary" onClick={close}>
              Giữ bản cũ
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
