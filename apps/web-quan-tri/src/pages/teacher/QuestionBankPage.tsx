import { DIFFICULTIES, DIFFICULTY_LABEL, MESSAGES, QUESTION_TYPES, QUESTION_TYPE_LABEL, formatDate } from '@dsvhvn/dung-chung';
import {
  errorMessage,
  type QuestionDifficulty,
  type QuestionRow,
  type QuestionScope,
  type QuestionSource,
  type QuestionType,
  type QuestionReviewStatus,
} from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Button,
  CheckboxField,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Modal,
  Pagination,
  SearchForm,
  SelectField,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '../../access/screens';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { DifficultyBadge, LevelRangeBadge, ReviewStatusBadge } from '../../components/question/QuestionBits';
import { QuestionFormDialog } from '../../components/question/QuestionFormDialog';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { questionsApi } from '../../lib/api/questionEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Ngân hàng câu hỏi — giáo viên. Ba tab: Dùng chung (câu đã duyệt của mọi trường), Của tôi (mọi trạng thái), Chờ duyệt (câu AI sinh,
// có số đếm). Tìm theo từ khóa, lọc theo dạng, cấp, độ khó, nguồn (và trạng thái ở tab Của tôi). Xem, sửa, duyệt, nhân bản mở
// trong hộp thoại Biểu mẫu câu hỏi; câu đã nằm trong bài kiểm tra hoặc của người khác chỉ xem được và có "Nhân bản". Bộ lọc nằm trên URL.

type TabId = 'dung-chung' | 'cua-toi' | 'cho-duyet';
const SCOPE_OF: Record<TabId, QuestionScope> = { 'dung-chung': 'SHARED', 'cua-toi': 'MINE', 'cho-duyet': 'PENDING' };

const TYPE_SLUG = slugMap<QuestionType>({
  SINGLE_CHOICE: 'mot-dap-an',
  TRUE_FALSE: 'dung-sai',
  IMAGE_CHOICE: 'chon-hinh',
  MATCHING: 'ghep-cap',
  ORDERING: 'sap-xep',
  FILL_BLANK: 'dien-tu',
  MULTI_TRUE_FALSE: 'nhieu-menh-de',
  SOURCE_READING: 'doc-tu-lieu',
});
const DIFFICULTY_SLUG = slugMap<QuestionDifficulty>({ EASY: 'de', MEDIUM: 'trung-binh', HARD: 'kho' });
const SOURCE_SLUG = slugMap<QuestionSource>({ MANUAL: 'tu-tao', AI: 'ai' });
const STATUS_SLUG = slugMap<QuestionReviewStatus>({ PENDING: 'cho-duyet', APPROVED: 'da-duyet', REJECTED: 'bi-loai' });

const TYPE_OPTIONS = [{ value: '', label: 'Tất cả dạng câu' }, ...QUESTION_TYPES.map((t) => ({ value: TYPE_SLUG.toSlug(t), label: QUESTION_TYPE_LABEL[t] }))];
const LEVEL_OPTIONS = [{ value: '', label: 'Tất cả cấp' }, ...[1, 2, 3].map((l) => ({ value: String(l), label: `Cấp ${l}` }))];
const DIFFICULTY_OPTIONS = [{ value: '', label: 'Tất cả độ khó' }, ...DIFFICULTIES.map((d) => ({ value: DIFFICULTY_SLUG.toSlug(d), label: DIFFICULTY_LABEL[d] }))];
const SOURCE_OPTIONS = [
  { value: '', label: 'Mọi nguồn' },
  { value: 'tu-tao', label: 'Tự tạo' },
  { value: 'ai', label: 'Do AI sinh' },
];
const STATUS_OPTIONS = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'cho-duyet', label: 'Chờ duyệt' },
  { value: 'da-duyet', label: 'Đã duyệt' },
  { value: 'bi-loai', label: 'Bị loại' },
];

type DialogState = { kind: 'form'; id: number | null } | { kind: 'ai' } | null;

/** Chọn bài học để sinh câu hỏi bằng AI, rồi chuyển sang màn hình Sinh và duyệt câu hỏi bằng AI. */
function PickLessonDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [lessonId, setLessonId] = useState('');
  const lessons = useQuery({
    queryKey: queryKeys.lessonList({ page: 1, pageSize: 100 }),
    queryFn: () => lessonsApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const items = (lessons.data?.items ?? []).filter((l) => l.status !== 'ARCHIVED');
  return (
    <Modal
      open
      title="Sinh câu hỏi bằng AI"
      description="Chọn bài học; AI sinh câu đúng dạng và cấp của lớp có bài học đó."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={lessonId === ''} onClick={() => void navigate(PATHS.lessonAiQuestions(Number(lessonId)))}>
            Tiếp tục
          </Button>
        </>
      }
    >
      {lessons.isPending ? (
        <LoadingState rows={1} />
      ) : lessons.isError ? (
        <ErrorState error={lessons.error} onRetry={() => void lessons.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="book-open" title="Thầy cô chưa có bài học nào để sinh câu hỏi." />
      ) : (
        <SelectField
          label="Bài học"
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          options={[{ value: '', label: 'Chọn bài học' }, ...items.map((l) => ({ value: String(l.id), label: `${l.title ?? 'Bài học chưa có tiêu đề'} · lớp ${l.className}` }))]}
        />
      )}
    </Modal>
  );
}

export default function QuestionBankPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const tab = (['dung-chung', 'cua-toi', 'cho-duyet'].includes(params.get('tab') ?? '') ? params.get('tab') : 'dung-chung') as TabId;
  const questionType = TYPE_SLUG.fromSlug(params.get('dang'));
  const level = params.get('cap') ?? '';
  const difficultyLevel = DIFFICULTY_SLUG.fromSlug(params.get('do-kho'));
  const source = SOURCE_SLUG.fromSlug(params.get('nguon'));
  const status = tab === 'cua-toi' ? STATUS_SLUG.fromSlug(params.get('trang-thai')) : '';
  const keyword = params.get('tu-khoa') ?? '';
  const filter = {
    scope: SCOPE_OF[tab],
    questionType,
    level: level ? Number(level) : ('' as const),
    difficultyLevel,
    source,
    status,
    keyword,
    page,
    pageSize: PAGE_SIZE,
  };

  const list = useQuery({
    queryKey: queryKeys.questionList(filter),
    queryFn: () => questionsApi.list(filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const counts = useQuery({ queryKey: queryKeys.questionCounts, queryFn: () => questionsApi.counts().then((r) => r.data) });

  const [dialog, setDialog] = useState<DialogState>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [approving, setApproving] = useState(false);

  const rows = list.data?.items ?? [];
  const filtered = Boolean(questionType || level || difficultyLevel || source || status || keyword);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.questions });

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const approveSelected = async () => {
    setApproving(true);
    try {
      const { data } = await questionsApi.approveMany([...selected]);
      toast.success(data.skipped.length > 0 ? `${data.message} ${data.skipped.length} câu chưa duyệt được: ${data.skipped[0]?.reason ?? ''}` : data.message);
      setSelected(new Set());
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setApproving(false);
      void refresh();
    }
  };

  const duplicate = async (row: QuestionRow) => {
    try {
      const { data, message } = await questionsApi.duplicate(row.id);
      toast.success(message ?? MESSAGES.success('Nhân bản câu hỏi'));
      void refresh();
      setDialog({ kind: 'form', id: data.id });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const tabItems = [
    { id: 'dung-chung' as const, label: counts.data ? `Dùng chung (${counts.data.shared})` : 'Dùng chung' },
    { id: 'cua-toi' as const, label: counts.data ? `Của tôi (${counts.data.mine})` : 'Của tôi' },
    { id: 'cho-duyet' as const, label: counts.data ? `Chờ duyệt (${counts.data.pending})` : 'Chờ duyệt' },
  ];

  const emptyText =
    tab === 'cho-duyet'
      ? 'Không có câu nào chờ duyệt. Câu do AI sinh nằm ở đây cho tới khi thầy cô duyệt.'
      : tab === 'cua-toi'
        ? 'Thầy cô chưa có câu hỏi nào. Bấm "Tạo câu hỏi" hoặc nhờ AI sinh câu từ một bài học.'
        : 'Ngân hàng chưa có câu đã duyệt nào.';

  return (
    <AreaPage>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description="Câu hỏi đã duyệt dùng chung cho thầy cô mọi trường. Tự tạo câu, nhờ AI sinh rồi duyệt, hoặc nhân bản câu của người khác để sửa."
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'ai' })}>
              <Icon name="sparkles" size={16} />
              Sinh câu bằng AI
            </Button>
            <Button onClick={() => setDialog({ kind: 'form', id: null })}>
              <Icon name="plus" size={16} />
              Tạo câu hỏi
            </Button>
          </>
        }
      />

      <Tabs
        idPrefix="ngan-hang"
        label="Ngân hàng câu hỏi"
        items={tabItems}
        value={tab}
        onChange={(next) => {
          setSelected(new Set());
          update({ tab: next === 'dung-chung' ? null : next, 'trang-thai': null });
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 dsvsm:grid-cols-2 dsvmd:grid-cols-5">
          <SelectField label="Dạng câu" value={TYPE_SLUG.toSlug(questionType)} options={TYPE_OPTIONS} onChange={(e) => update({ dang: e.target.value })} />
          <SelectField label="Cấp phù hợp" value={level} options={LEVEL_OPTIONS} onChange={(e) => update({ cap: e.target.value })} />
          <SelectField label="Độ khó" value={DIFFICULTY_SLUG.toSlug(difficultyLevel)} options={DIFFICULTY_OPTIONS} onChange={(e) => update({ 'do-kho': e.target.value })} />
          <SelectField label="Nguồn" value={SOURCE_SLUG.toSlug(source)} options={SOURCE_OPTIONS} onChange={(e) => update({ nguon: e.target.value })} />
          {tab === 'cua-toi' && (
            <SelectField label="Trạng thái" value={STATUS_SLUG.toSlug(status)} options={STATUS_OPTIONS} onChange={(e) => update({ 'trang-thai': e.target.value })} />
          )}
        </div>
        <SearchForm key={keyword} label="Tìm trong lời câu" placeholder="Ví dụ: Hoa Lư" value={keyword} onSearch={(v) => update({ 'tu-khoa': v })} />
      </div>

      {tab === 'cho-duyet' && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={selected.size === 0} loading={approving} onClick={() => void approveSelected()}>
            <Icon name="check" size={16} />
            Duyệt {selected.size > 0 ? `${selected.size} câu đã chọn` : 'các câu đã chọn'}
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set(rows.map((r) => r.id)))}>
            Chọn cả trang
          </Button>
        </div>
      )}

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button variant="secondary" onClick={() => update({ dang: null, cap: null, 'do-kho': null, nguon: null, 'trang-thai': null, 'tu-khoa': null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="file-text" title={emptyText} />
        )
      ) : (
        <div>
          <Table caption="Câu hỏi trong ngân hàng" busy={list.isFetching}>
            <thead>
              <tr>
                {tab === 'cho-duyet' && <Th className="w-10">Chọn</Th>}
                <Th>Câu hỏi</Th>
                <Th>Dạng</Th>
                <Th>Cấp</Th>
                <Th>Độ khó</Th>
                <Th>{tab === 'dung-chung' ? 'Người tạo' : 'Trạng thái'}</Th>
                <Th>Ngày sửa</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const readOnly = !row.isMine || row.quizCount > 0 || row.isHidden;
                return (
                  <Tr key={row.id}>
                    {tab === 'cho-duyet' && (
                      <Td>
                        <CheckboxField label="" aria-label={`Chọn câu ${row.id}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                      </Td>
                    )}
                    <Td className="max-w-[420px]">
                      <button type="button" className="text-left font-medium text-link hover:underline" onClick={() => setDialog({ kind: 'form', id: row.id })}>
                        {row.content}
                      </button>
                      <p className="type-body-s text-on-surface-variant">{row.heritageName}</p>
                    </Td>
                    <Td className="whitespace-nowrap">{row.typeName}</Td>
                    <Td>
                      <LevelRangeBadge min={row.levelMin} max={row.levelMax} />
                    </Td>
                    <Td>
                      <DifficultyBadge value={row.difficultyLevel} />
                    </Td>
                    <Td>
                      {tab === 'dung-chung' ? (
                        <>
                          <span className="block">{row.isMine ? 'Của tôi' : (row.creatorName ?? '')}</span>
                          <span className="block type-body-s text-on-surface-variant">{row.organizationName}</span>
                        </>
                      ) : (
                        <span className="flex flex-wrap items-center gap-1">
                          <ReviewStatusBadge status={row.reviewStatus} hidden={row.isHidden} />
                          {row.source === 'AI' && <Badge>AI</Badge>}
                          {row.isMine && row.quizCount > 0 && <Badge>Chỉ đọc · trong {row.quizCount} bài kiểm tra</Badge>}
                        </span>
                      )}
                    </Td>
                    <Td className="type-mono-label whitespace-nowrap">{formatDate(row.updatedAt ?? row.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={`${readOnly ? 'Xem' : 'Sửa'} câu "${row.content}"`} onClick={() => setDialog({ kind: 'form', id: row.id })}>
                          <Icon name={readOnly ? 'eye' : 'pencil'} size={18} />
                        </Button>
                        {row.reviewStatus === 'APPROVED' && !row.isHidden && (
                          <Button variant="ghost" size="icon" aria-label={`Nhân bản câu "${row.content}"`} onClick={() => void duplicate(row)}>
                            <Icon name="copy" size={18} />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination
            label="câu hỏi"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}

      {dialog?.kind === 'form' && (
        <QuestionFormDialog
          key={dialog.id ?? 'moi'}
          questionId={dialog.id}
          initialType={questionType || undefined}
          onClose={() => setDialog(null)}
          onChanged={() => void refresh()}
          onOpen={(id) => setDialog({ kind: 'form', id })}
        />
      )}
      {dialog?.kind === 'ai' && <PickLessonDialog onClose={() => setDialog(null)} />}
    </AreaPage>
  );
}
