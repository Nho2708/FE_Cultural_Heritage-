import { LESSON_LIMITS, LESSON_SECTION_LABEL, LESSON_STATUS_LABEL, MESSAGES, formatDateTime, splitApiError } from '@dsvhvn/dung-chung';
import { ApiError, errorMessage, type LessonDetail, type LessonImageOption, type LessonLength, type LessonSectionType } from '@dsvhvn/dung-chung/api';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  TextAreaField,
  TextField,
  TextLink,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import { pathOf } from '../../access/screens';
import { AiPanel, KeyPointsEditor } from '../../components/lesson/ContentParts';
import { DuplicateLessonDialog } from '../../components/lesson/DuplicateLessonDialog';
import { ImagePickerDialog } from '../../components/lesson/ImagePickerDialog';
import { CodeDisplay, LessonStatusBadge, PlanNotice } from '../../components/lesson/LessonBits';
import { LessonCodeDialog, type CodeTarget } from '../../components/lesson/LessonCodeDialog';
import {
  addLabel,
  addableTypes,
  applyDraft,
  bodyOf,
  checkForm,
  formOf,
  isDirty,
  mainWordCount,
  moveItem,
  newSection,
  sectionErrors,
  type LessonFormState,
  type SectionState,
} from '../../components/lesson/lessonForm';
import { SectionCard } from '../../components/lesson/SectionCard';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Soạn bài học — giáo viên. Cấp của bài là cấp của lớp (không đổi sau khi tạo), khung nội dung đổi theo cấp: cấp 1 các bước câu
// chuyện mỗi bước một hình; cấp 2 bài đọc, hình có chú thích, mốc thời gian lấy từ dòng thời gian của di sản; cấp 3 bài phân tích, trích
// tư liệu gốc (bắt buộc nguồn), câu hỏi gợi suy nghĩ. AI soạn bản nháp đúng cấp (không tự lưu hay xuất bản); thầy cô sửa, đọc lại
// rồi mới Lưu và Xuất bản. Lần xuất bản đầu sinh mã bài học. Bài Lưu trữ chỉ xem; phải xuất bản lại mới sửa tiếp.

function ProblemMessage({ text }: { text: string }) {
  return <InlineMessage tone="danger">{text}</InlineMessage>;
}

export default function LessonEditorPage() {
  const lessonId = Number(useParams().baiHoc);
  const validId = Number.isInteger(lessonId) && lessonId > 0;
  const detail = useQuery({
    queryKey: queryKeys.lessonDetail(lessonId),
    queryFn: () => lessonsApi.get(lessonId).then((r) => r.data),
    enabled: validId,
    gcTime: 0,
    staleTime: 0,
  });

  const back = <TextLink to={pathOf('lessons')}>← Bài học</TextLink>;

  if (!validId || (detail.isError && detail.error instanceof ApiError && detail.error.status === 404)) {
    return (
      <AreaPage>
        <PageHeader title="Soạn bài học" before={back} />
        <EmptyState icon="info" title="Không tìm thấy bài học.">
          Bài học không tồn tại, đã bị xóa hoặc không phải bài do thầy cô tạo.
        </EmptyState>
      </AreaPage>
    );
  }
  if (detail.isError) {
    return (
      <AreaPage>
        <PageHeader title="Soạn bài học" before={back} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </AreaPage>
    );
  }
  if (!detail.data) {
    return (
      <AreaPage>
        <PageHeader title="Soạn bài học" before={back} />
        <LoadingState />
      </AreaPage>
    );
  }
  // Mỗi bài một bản soạn riêng: đổi sang bài khác thì dựng lại từ dữ liệu máy chủ.
  return <LessonEditor key={detail.data.id} initial={detail.data} />;
}

function LessonEditor({ initial }: { initial: LessonDetail }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lessonId = initial.id;

  const materials = useQuery({
    queryKey: queryKeys.lessonMaterials(lessonId),
    queryFn: () => lessonsApi.materials(lessonId).then((r) => r.data),
  });

  const [lesson, setLesson] = useState<LessonDetail>(initial);
  const [form, setForm] = useState<LessonFormState>(() => formOf(initial));
  const [saved, setSaved] = useState<LessonFormState>(() => formOf(initial));
  const [length, setLength] = useState<LessonLength>('MEDIUM');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [errorsBySection, setErrorsBySection] = useState<Map<number, string>>(new Map());
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const [codeTarget, setCodeTarget] = useState<CodeTarget | null>(null);
  const [copying, setCopying] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmCompose, setConfirmCompose] = useState(false);

  const adopt = (next: LessonDetail) => {
    const state = formOf(next);
    setLesson(next);
    setForm(state);
    setSaved(state);
    setErrorsBySection(new Map());
    queryClient.setQueryData(queryKeys.lessonDetail(next.id), next);
    void queryClient.invalidateQueries({ queryKey: ['teacher', 'lessons', 'list'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
  };

  const dirty = isDirty(form, saved);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const check = useMemo(() => checkForm(form, lesson.frame), [form, lesson.frame]);

  const frame = lesson.frame;
  const readOnly = lesson.status === 'ARCHIVED';
  const busy = saving || publishing || composing || archiveBusy;
  const hasContent = form.summary.trim() !== '' || form.sections.length > 0;
  const publishedHeritages = lesson.heritages.filter((h) => h.status === 'PUBLISHED').length;
  const words = mainWordCount(form, frame);
  const wordsOutside = words > 0 && (words < frame.minWords || words > frame.maxWords);
  const planOk = lesson.aiQuota.hasEffectivePlan;
  const images = materials.data?.images ?? [];
  const events = materials.data?.events ?? [];
  const title = form.title.trim() || lesson.title || 'Bài học chưa có tiêu đề';

  const setSection = (key: string, patch: Partial<SectionState>) =>
    setForm({ ...form, sections: form.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  const save = async (silent = false): Promise<boolean> => {
    setSaving(true);
    setProblem(null);
    setErrorsBySection(new Map());
    try {
      const { data, message } = await lessonsApi.update(lessonId, bodyOf(form));
      adopt(data);
      if (!silent) toast.success(message ?? MESSAGES.success('Lưu bài học'));
      return true;
    } catch (err) {
      const failure = splitApiError<'title' | 'summary' | 'keyPoints'>(err, ['title', 'summary', 'keyPoints']);
      const sectionIssues = err instanceof ApiError ? sectionErrors(err.fieldErrors) : new Map<number, string>();
      setErrorsBySection(sectionIssues);
      const first = Object.values(failure.fields)[0] ?? failure.form ?? (sectionIssues.size > 0 ? [...sectionIssues.values()][0] : null);
      setProblem(first ?? errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setProblem(null);
    const missing = [...check.missing, ...(publishedHeritages === 0 ? ['ít nhất một di sản đã xuất bản'] : [])];
    if (!readOnly && missing.length > 0) {
      setProblem(`Chưa thể xuất bản. Bài học còn thiếu: ${missing.join('; ')}.`);
      return;
    }
    setPublishing(true);
    try {
      if (dirty && !readOnly && !(await save(true))) return;
      const { data: result } = await lessonsApi.publish(lessonId);
      adopt(result.lesson);
      toast.success(result.message);
      if (result.codeCreated) setCodeTarget({ title: result.lesson.title, className: result.lesson.className, accessCode: result.accessCode });
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const archive = async () => {
    setArchiveBusy(true);
    try {
      const { data, message } = await lessonsApi.archive(lessonId);
      adopt(data);
      toast.success(message ?? MESSAGES.success('Lưu trữ bài học'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setArchiveBusy(false);
      setConfirmArchive(false);
    }
  };

  const compose = async () => {
    setConfirmCompose(false);
    setComposing(true);
    setProblem(null);
    try {
      const { data } = await lessonsApi.compose(lessonId, length);
      setForm(applyDraft(form, data));
      setErrorsBySection(new Map());
      setAiWarnings(data.warnings);
      setLesson({ ...lesson, aiQuota: data.aiQuota });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiQuota });
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
      void lessonsApi.aiQuota().then((r) => setLesson((current) => (current ? { ...current, aiQuota: r.data } : current)));
    } finally {
      setComposing(false);
    }
  };

  const addSection = (type: LessonSectionType) => setForm({ ...form, sections: [...form.sections, newSection(type)] });

  const pickImage = (image: LessonImageOption) => {
    if (pickingKey === null || !image.url) return;
    const target = form.sections.find((s) => s.key === pickingKey);
    setSection(pickingKey, {
      imageUrl: image.url,
      image: { caption: image.caption, credit: image.credit, author: image.author, license: image.license, source: image.source },
      ...(target?.type === 'IMAGE' && target.body.trim() === '' ? { body: image.caption ?? '' } : {}),
    });
    setPickingKey(null);
  };

  const ordinalOf = (section: SectionState, index: number) =>
    form.sections.slice(0, index + 1).filter((s) => s.type === section.type).length;

  const saveLabel = lesson.status === 'PUBLISHED' ? 'Lưu thay đổi' : 'Lưu nháp';
  const publishLabel = lesson.status === 'PUBLISHED' ? 'Xuất bản các thay đổi' : lesson.status === 'ARCHIVED' ? 'Xuất bản lại' : 'Xuất bản';
  const pageTitle = form.title.trim() || 'Soạn bài học';

  return (
    <AreaPage>
      <PlanNotice quota={lesson.aiQuota} />
      <PageHeader
        before={
          <span className="type-body-s text-on-surface-variant">
            <TextLink to={pathOf('lessons')}>Bài học</TextLink> / {title}
          </span>
        }
        title={pageTitle}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <LessonStatusBadge status={lesson.status} />
            <span>
              Lớp {lesson.className} · sửa {formatDateTime(lesson.updatedAt)}
            </span>
            {dirty && <span className="text-on-warning-container">Có thay đổi chưa lưu</span>}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={busy || !planOk}
              onClick={() => (dirty ? toast.error('Hãy lưu bài học trước khi nhân bản.') : setCopying(true))}
            >
              <Icon name={planOk ? 'copy' : 'lock'} size={16} />
              Nhân bản sang lớp khác
            </Button>
            {lesson.status === 'PUBLISHED' && (
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmArchive(true)}>
                <Icon name="archive" size={16} />
                Lưu trữ
              </Button>
            )}
            {!readOnly && (
              <Button variant="secondary" loading={saving} disabled={busy || !dirty} onClick={() => void save()}>
                {saveLabel}
              </Button>
            )}
            <Button loading={publishing} disabled={busy || (lesson.status === 'PUBLISHED' && !dirty)} onClick={() => void publish()}>
              {publishLabel}
            </Button>
          </>
        }
      />

      {problem && <ProblemMessage text={problem} />}
      {readOnly && (
        <InlineMessage tone="info">
          Bài học đã lưu trữ nên học sinh không mở được bằng mã nữa và thầy cô chưa sửa được. Bấm "Xuất bản lại" để mở lại cho lớp và sửa tiếp; mã
          bài học vẫn giữ nguyên.
        </InlineMessage>
      )}

      <div className="grid gap-6 dsvlg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="thong-tin" className="rounded-md border border-border bg-surface p-5">
            <h2 id="thong-tin" className="type-h3 text-on-surface">
              Thông tin bài học
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <TextField
                label="Lớp"
                readOnly
                value={`${lesson.className} · Khối ${lesson.grade} · ${lesson.schoolLevelName}`}
                hint="Lớp của bài học không đổi sau khi tạo."
              />
              <TextField
                label="Tiêu đề"
                name="title"
                value={form.title}
                maxLength={LESSON_LIMITS.titleMaxLength}
                readOnly={readOnly}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                hint={`Tối đa ${LESSON_LIMITS.titleMaxLength} ký tự.`}
              />
              <div>
                <p className="type-label text-on-surface-variant">Di sản của bài</p>
                <ul className="mt-2 grid gap-2 dsvsm:grid-cols-2">
                  {lesson.heritages.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 rounded-sm bg-surface-container-low p-2">
                      {h.thumbnailUrl ? (
                        <img src={h.thumbnailUrl} alt="" className="size-10 shrink-0 rounded-xs object-cover" />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-image-placeholder text-on-surface-variant">
                          <Icon name="book-open" size={18} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate type-label text-on-surface">{h.name}</span>
                        {h.status !== 'PUBLISHED' && <span className="type-body-s text-on-warning-container">Di sản đã ẩn</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 type-body-s text-on-surface-variant">
                  Di sản được chọn khi tạo bài; bài đã xuất bản nên không thêm, bớt di sản được.
                </p>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="noi-dung-cap"
            data-cap={frame.level}
            className="rounded-md border border-(--dsv-ai-panel-border) bg-(--dsv-ai-panel-bg) p-5 text-(--dsv-ai-panel-fg)"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Icon name="sparkles" size={20} />
              <h2 id="noi-dung-cap" className="type-h3">
                Nội dung bài theo cấp — Cấp {frame.level}
              </h2>
              <span className="rounded-xs bg-surface px-2 py-0.5 type-label text-on-surface-variant">
                Theo khối {lesson.grade} của lớp {lesson.className}
              </span>
            </div>
            <p className="mt-3 type-body-s">
              Cấp của bài theo cấp của lớp, không chọn tay; AI soạn dựa trên nội dung di sản của Cục Di sản văn hóa. Khung cấp {frame.level}:{' '}
              {frame.level === 1
                ? `câu chuyện ${frame.minWords}-${frame.maxWords} từ chia ${LESSON_LIMITS.level1MinSteps}-${LESSON_LIMITS.level1MaxSteps} bước; mỗi bước một đoạn truyện, một hình của di sản và một câu ngắn để đọc to.`
                : frame.level === 2
                  ? `bài đọc ${frame.minWords}-${frame.maxWords} từ kèm hình có chú thích, ý chính đóng khung và ${LESSON_LIMITS.level2MinMilestones}-${LESSON_LIMITS.level2MaxMilestones} mốc thời gian lấy từ dòng thời gian của di sản.`
                  : `bài phân tích ${frame.minWords}-${frame.maxWords} từ về bối cảnh và ý nghĩa, 1-${LESSON_LIMITS.level3MaxExcerpts} đoạn trích tư liệu gốc (bắt buộc ghi nguồn) và 1-5 câu hỏi gợi suy nghĩ (không chấm điểm).`}
            </p>

            <div className="mt-4 rounded-md bg-surface p-4 text-on-surface">
              <AiPanel
                frame={frame}
                quota={lesson.aiQuota}
                length={length}
                onLength={setLength}
                hasContent={hasContent}
                composing={composing}
                disabled={readOnly || busy}
                onCompose={() => (hasContent ? setConfirmCompose(true) : void compose())}
              />
            </div>

            {aiWarnings.length > 0 && (
              <InlineMessage tone="warning" className="mt-4">
                {aiWarnings.join(' ')}
              </InlineMessage>
            )}
            {check.warnings.length > 0 && (
              <InlineMessage tone="warning" className="mt-4">
                {check.warnings.join(' ')}
              </InlineMessage>
            )}

            <div className="mt-5 flex flex-col gap-5 text-on-surface">
              <div>
                <TextAreaField
                  label="Tóm tắt"
                  name="summary"
                  rows={frame.level === 3 ? 8 : 6}
                  value={form.summary}
                  readOnly={readOnly || composing}
                  maxLength={LESSON_LIMITS.summaryMaxLength}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  hint="Hiện ở đầu bài cho học sinh; thầy cô sửa trực tiếp được."
                />
                <p className={`mt-2 type-body-s ${wordsOutside ? 'text-on-warning-container' : 'text-on-surface-variant'}`} aria-live="polite">
                  {words} từ trong nội dung chính · khoảng của cấp {frame.level}: {frame.minWords}-{frame.maxWords} từ
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="type-h4">{frame.level === 1 ? 'Các bước câu chuyện' : 'Các phần của bài'}</h3>
                  <span className="type-body-s text-on-surface-variant">
                    {form.sections.length} phần
                    {frame.level === 1 && ` · cấp 1 thường ${LESSON_LIMITS.level1MinSteps}-${LESSON_LIMITS.level1MaxSteps} bước`}
                  </span>
                </div>
                {form.sections.length === 0 ? (
                  <p className="mt-3 rounded-md border border-dashed border-border-strong p-4 type-body-s text-on-surface-variant">
                    Chưa có phần nào. Nhờ AI soạn hoặc thêm phần bằng các nút bên dưới.
                  </p>
                ) : (
                  <ol className="mt-3 flex flex-col gap-3">
                    {form.sections.map((section, index) => (
                      <SectionCard
                        key={section.key}
                        section={section}
                        ordinal={ordinalOf(section, index)}
                        position={index}
                        total={form.sections.length}
                        frame={frame}
                        readOnly={readOnly || composing}
                        error={errorsBySection.get(index)}
                        events={events}
                        images={images}
                        onChange={(patch) => setSection(section.key, patch)}
                        onMove={(delta) => setForm({ ...form, sections: moveItem(form.sections, index, delta) })}
                        onRemove={() => setForm({ ...form, sections: form.sections.filter((s) => s.key !== section.key) })}
                        onPickImage={() => setPickingKey(section.key)}
                      />
                    ))}
                  </ol>
                )}
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {addableTypes(frame).map((type) => (
                      <Button
                        key={type}
                        variant="secondary"
                        size="sm"
                        disabled={composing || form.sections.length >= LESSON_LIMITS.maxSections}
                        onClick={() => addSection(type)}
                      >
                        <Icon name="plus" size={16} />
                        {addLabel(type, frame.level)}
                      </Button>
                    ))}
                    <span className="type-body-s text-on-surface-variant">
                      Thêm {frame.allowedTypes.map((t) => LESSON_SECTION_LABEL[t].toLocaleLowerCase('vi-VN')).join(', ')}; dùng nút mũi tên để sắp xếp.
                    </span>
                  </div>
                )}
              </div>

              <KeyPointsEditor points={form.keyPoints} readOnly={readOnly || composing} onChange={(keyPoints) => setForm({ ...form, keyPoints })} />
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Mã bài học và bài kiểm tra">
          <section aria-labelledby="ma-bai-hoc" className="rounded-md border border-border bg-surface p-5">
            <h2 id="ma-bai-hoc" className="type-h3 text-on-surface">
              Mã bài học
            </h2>
            {lesson.accessCode ? (
              <>
                <p className="mt-3 rounded-md bg-surface-container-low px-3 py-5 text-center type-display-l text-on-surface">
                  <CodeDisplay code={lesson.accessCode} />
                </p>
                <p className="mt-3 type-body-s text-on-surface-variant">
                  Học sinh lớp {lesson.className} gõ mã này trên web học tập hoặc ứng dụng để mở bài học và các bài kiểm tra của bài.
                </p>
                <Button
                  variant="secondary"
                  fullWidth
                  className="mt-3"
                  onClick={() => setCodeTarget({ title: lesson.title, className: lesson.className, accessCode: lesson.accessCode! })}
                >
                  <Icon name="eye" size={16} />
                  Hiện mã
                </Button>
              </>
            ) : (
              <p className="mt-3 type-body-s text-on-surface-variant">
                Mã bài học được tạo khi thầy cô xuất bản bài lần đầu, rồi giữ nguyên dù sửa bài hay lưu trữ rồi xuất bản lại.
              </p>
            )}
          </section>

          <section aria-labelledby="dieu-kien" className="rounded-md border border-border bg-surface p-5">
            <h2 id="dieu-kien" className="type-h3 text-on-surface">
              Trước khi xuất bản
            </h2>
            {check.missing.length === 0 && publishedHeritages > 0 ? (
              <p className="mt-3 flex items-start gap-2 type-body-s text-on-surface">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-success" />
                Bài đã đủ điều kiện xuất bản.
              </p>
            ) : (
              <div className="mt-3">
                <p className="type-body-s text-on-surface-variant">Bài còn thiếu:</p>
                <ul className="mt-1 list-disc pl-5 type-body-s text-on-surface">
                  {check.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                  {publishedHeritages === 0 && <li>ít nhất một di sản đã xuất bản</li>}
                </ul>
              </div>
            )}
            <p className="mt-3 type-body-s text-on-surface-variant">
              Số từ, số bước, số mốc ngoài khoảng của cấp chỉ nhắc, không chặn xuất bản. Thầy cô nên đọc lại nội dung AI soạn trước khi dùng.
            </p>
          </section>

          <section aria-labelledby="bai-kiem-tra" className="rounded-md border border-border bg-surface p-5">
            <h2 id="bai-kiem-tra" className="type-h3 text-on-surface">
              Bài kiểm tra của bài
            </h2>
            <p className="mt-3 type-body-m text-on-surface">
              {lesson.quizCount === 0 ? 'Bài học chưa có bài kiểm tra nào.' : `${lesson.quizCount} bài kiểm tra.`}
            </p>
            <p className="mt-2 type-body-s text-on-surface-variant">
              Bài đã có bài kiểm tra thì chỉ lưu trữ được, không xóa. Bài học còn bài kiểm tra đang mở thì chưa lưu trữ được.
            </p>
          </section>

          <p className="type-body-s text-on-surface-variant">
            Trạng thái: {lesson.status ? LESSON_STATUS_LABEL[lesson.status] : ''}.
          </p>
        </aside>
      </div>

      {pickingKey !== null && (
        <ImagePickerDialog
          materials={materials}
          currentUrl={form.sections.find((s) => s.key === pickingKey)?.imageUrl ?? ''}
          onPick={pickImage}
          onClose={() => setPickingKey(null)}
        />
      )}
      {codeTarget && <LessonCodeDialog target={codeTarget} onClose={() => setCodeTarget(null)} />}
      {copying && (
        <DuplicateLessonDialog
          source={{
            id: lesson.id,
            title: lesson.title,
            classId: lesson.classId,
            className: lesson.className,
            schoolLevel: lesson.schoolLevel,
            heritageCount: lesson.heritages.length,
            isPublished: lesson.status === 'PUBLISHED',
          }}
          onDone={(result) => {
            setCopying(false);
            toast.success(result.message);
            void queryClient.invalidateQueries({ queryKey: ['teacher', 'lessons', 'list'] });
            void navigate(`/giao-vien/bai-hoc/${result.lesson.id}`);
          }}
          onClose={() => setCopying(false)}
        />
      )}
      <ConfirmDialog
        open={confirmArchive}
        title={`Lưu trữ bài học "${lesson.title ?? ''}"?`}
        confirmLabel="Lưu trữ"
        confirming={archiveBusy}
        onConfirm={() => void archive()}
        onClose={() => setConfirmArchive(false)}
      >
        Bạn có chắc muốn lưu trữ bài học này? Học sinh lớp {lesson.className} không mở được bài học bằng mã nữa; kết quả các bài đã làm vẫn được giữ.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmCompose}
        title="Soạn lại nội dung bằng AI"
        confirmLabel="Soạn lại"
        confirming={composing}
        onConfirm={() => void compose()}
        onClose={() => setConfirmCompose(false)}
      >
        AI sẽ thay tóm tắt, ý chính và các phần đang có bằng một bản nháp mới; bản nháp chỉ được lưu khi thầy cô bấm "{saveLabel}". Mỗi lần soạn tính
        một lượt AI của trường.
      </ConfirmDialog>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Rời khỏi trang soạn bài?"
        confirmLabel="Rời đi"
        tone="danger"
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
      >
        Bài học còn thay đổi chưa lưu. Nếu rời đi, những thay đổi này sẽ mất.
      </ConfirmDialog>
    </AreaPage>
  );
}
