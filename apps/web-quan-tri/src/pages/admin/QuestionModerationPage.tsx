import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  MESSAGES,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  cn,
  formatCount,
  questionRateLabel,
} from '@dsvhvn/dung-chung';
import type { QuestionDifficulty, QuestionQualityRow, QuestionQualitySort, QuestionType } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Button,
  CheckboxField,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  SearchForm,
  SelectField,
  Table,
  Td,
  Th,
  Tr,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { ModerationConfirmDialog, ModerationDetailDialog, type ModerationAction } from '../../components/question/ModerationDialogs';
import { LevelRangeBadge, DifficultyBadge } from '../../components/question/QuestionBits';
import { HeritageSelect } from '../../components/question/QuestionPickers';
import { adminOrganizationsApi } from '../../lib/api/endpoints';
import { adminQuestionsApi } from '../../lib/api/overviewEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Kiểm duyệt ngân hàng câu hỏi — quản trị hệ thống. Bảng câu đã duyệt (và câu đã bị ẩn) của mọi trường kèm số lượt trả lời, tỉ lệ đúng và dấu
// "Cần xem lại" (đủ số lượt trả lời mà tỉ lệ đúng quá thấp, tính từ lượt đã nộp). Xem câu chỉ đọc, ẩn câu (câu không còn chọn được vào bài kiểm tra mới,
// bài đã phát hành và kết quả cũ giữ nguyên) và hiện lại câu đã ẩn. Bộ lọc nằm trên URL.

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
type ModerationStatus = 'APPROVED' | 'REJECTED';
const STATUS_SLUG = slugMap<ModerationStatus>({ APPROVED: 'dang-dung', REJECTED: 'da-an' });
const SORT_SLUG = slugMap<QuestionQualitySort>({ NEWEST: 'moi-nhat', LOWEST_RATE: 'ti-le-dung-thap' });

const TYPE_OPTIONS = [{ value: '', label: 'Tất cả dạng câu' }, ...QUESTION_TYPES.map((t) => ({ value: TYPE_SLUG.toSlug(t), label: QUESTION_TYPE_LABEL[t] }))];
const LEVEL_OPTIONS = [{ value: '', label: 'Tất cả cấp' }, ...[1, 2, 3].map((l) => ({ value: String(l), label: `Cấp ${l}` }))];
const DIFFICULTY_OPTIONS = [{ value: '', label: 'Tất cả độ khó' }, ...DIFFICULTIES.map((d) => ({ value: DIFFICULTY_SLUG.toSlug(d), label: DIFFICULTY_LABEL[d] }))];
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'dang-dung', label: 'Đang trong ngân hàng' },
  { value: 'da-an', label: 'Đã ẩn' },
];
const SORT_OPTIONS = [
  { value: '', label: 'Mới nhất trước' },
  { value: 'ti-le-dung-thap', label: 'Tỉ lệ đúng thấp nhất trước' },
];

type DialogState = { kind: 'detail'; row: QuestionQualityRow } | { kind: 'confirm'; action: ModerationAction; row: QuestionQualityRow } | null;

function SummaryButton({ label, value, active, onClick, note }: { label: string; value: number; active?: boolean; onClick?: () => void; note?: string }) {
  const content = (
    <>
      <span className="type-label text-on-surface-variant">{label}</span>
      <span className="type-h2 tabular-nums text-on-surface">{formatCount(value)}</span>
      {note && <span className="type-body-s text-on-surface-variant">{note}</span>}
    </>
  );
  const base = 'flex flex-col items-start gap-1 rounded-md border bg-surface p-4 text-left';
  return onClick ? (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn(base, active ? 'border-2 border-primary' : 'border-border hover:bg-surface-container-low')}>
      {content}
    </button>
  ) : (
    <div className={cn(base, 'border-border')}>{content}</div>
  );
}

export default function QuestionModerationPage() {
  const { params, update, page } = useListParams();
  const questionType = TYPE_SLUG.fromSlug(params.get('dang'));
  const level = params.get('cap') ?? '';
  const difficultyLevel = DIFFICULTY_SLUG.fromSlug(params.get('do-kho'));
  const status = STATUS_SLUG.fromSlug(params.get('trang-thai'));
  const sort = SORT_SLUG.fromSlug(params.get('sap-xep')) || 'NEWEST';
  const lowQualityOnly = params.get('can-xem-lai') === '1';
  const organization = params.get('truong') ?? '';
  const keyword = params.get('tu-khoa') ?? '';
  const heritageParam = params.get('di-san') ?? '';
  const heritageName = params.get('ten-di-san') ?? '';

  const filter = {
    status,
    lowQualityOnly,
    sort,
    questionType,
    level: level ? Number(level) : ('' as const),
    difficultyLevel,
    heritageId: heritageParam ? Number(heritageParam) : ('' as const),
    organizationId: organization ? Number(organization) : ('' as const),
    keyword,
    page,
    pageSize: PAGE_SIZE,
  };

  const list = useQuery({
    queryKey: queryKeys.moderationList(filter),
    queryFn: () => adminQuestionsApi.quality(filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const schools = useQuery({
    queryKey: queryKeys.organizationList({ page: 1, pageSize: 100 }),
    queryFn: () => adminOrganizationsApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });

  const [dialog, setDialog] = useState<DialogState>(null);
  const rows = list.data?.items ?? [];
  const filtered = Boolean(questionType || level || difficultyLevel || status || lowQualityOnly || organization || keyword || heritageParam);
  const schoolOptions = [{ value: '', label: 'Tất cả trường' }, ...(schools.data?.items ?? []).map((s) => ({ value: String(s.id), label: s.name }))];
  const clearAll = () =>
    update({ dang: null, cap: null, 'do-kho': null, 'trang-thai': null, 'can-xem-lai': null, truong: null, 'tu-khoa': null, 'di-san': null, 'ten-di-san': null });

  return (
    <AreaPage>
      <PageHeader
        title="Kiểm duyệt câu hỏi"
        description="Câu hỏi đã duyệt của mọi trường. Ẩn câu khi nội dung sai hoặc không phù hợp; câu đã ẩn không chọn được vào bài kiểm tra mới, bài đã phát hành và kết quả cũ giữ nguyên."
      />

      {list.data && (
        <section aria-label="Số đếm của ngân hàng" className="grid gap-3 dsvsm:grid-cols-3">
          <SummaryButton
            label="Đang trong ngân hàng"
            value={list.data.approvedCount}
            active={status === 'APPROVED'}
            onClick={() => update({ 'trang-thai': status === 'APPROVED' ? null : 'dang-dung' })}
          />
          <SummaryButton
            label="Đã ẩn"
            value={list.data.hiddenCount}
            active={status === 'REJECTED'}
            onClick={() => update({ 'trang-thai': status === 'REJECTED' ? null : 'da-an' })}
          />
          <SummaryButton
            label="Cần xem lại"
            value={list.data.lowQualityCount}
            note={`Từ ${list.data.minAnswers} lượt trả lời mà đúng dưới ${list.data.lowCorrectPercent}%`}
            active={lowQualityOnly}
            onClick={() => update({ 'can-xem-lai': lowQualityOnly ? null : '1' })}
          />
        </section>
      )}

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
          <SelectField label="Trường của người tạo" value={organization} options={schoolOptions} onChange={(e) => update({ truong: e.target.value })} />
          <SelectField label="Dạng câu" value={TYPE_SLUG.toSlug(questionType)} options={TYPE_OPTIONS} onChange={(e) => update({ dang: e.target.value })} />
          <SelectField label="Cấp phù hợp" value={level} options={LEVEL_OPTIONS} onChange={(e) => update({ cap: e.target.value })} />
          <SelectField label="Độ khó" value={DIFFICULTY_SLUG.toSlug(difficultyLevel)} options={DIFFICULTY_OPTIONS} onChange={(e) => update({ 'do-kho': e.target.value })} />
          <SelectField label="Trạng thái" value={STATUS_SLUG.toSlug(status)} options={STATUS_OPTIONS} onChange={(e) => update({ 'trang-thai': e.target.value })} />
          <SelectField
            label="Sắp xếp"
            value={sort === 'NEWEST' ? '' : SORT_SLUG.toSlug(sort)}
            options={SORT_OPTIONS}
            onChange={(e) => update({ 'sap-xep': e.target.value })}
          />
          <CheckboxField
            label="Chỉ câu cần xem lại"
            checked={lowQualityOnly}
            onChange={(e) => update({ 'can-xem-lai': e.target.checked ? '1' : null })}
            containerClassName="justify-end"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <HeritageSelect
            heritageId={heritageParam ? Number(heritageParam) : null}
            heritageName={heritageName}
            label="Lọc theo di sản"
            onChange={(id, name) => update({ 'di-san': String(id), 'ten-di-san': name })}
          />
          {heritageParam && (
            <Button variant="ghost" size="sm" onClick={() => update({ 'di-san': null, 'ten-di-san': null })}>
              <Icon name="x" size={16} />
              Bỏ lọc di sản
            </Button>
          )}
        </div>
        <SearchForm key={keyword} label="Tìm trong lời câu" placeholder="Ví dụ: Kinh thành Huế" value={keyword} onSearch={(v) => update({ 'tu-khoa': v })} />
      </div>

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
              <Button variant="secondary" onClick={clearAll}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="shield-check" title="Ngân hàng chưa có câu đã duyệt nào." />
        )
      ) : (
        <div>
          <Table caption="Câu hỏi cần kiểm duyệt" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Nội dung</Th>
                <Th>Người tạo và trường</Th>
                <Th>Dạng câu</Th>
                <Th>Cấp và độ khó</Th>
                <Th>Lượt trả lời</Th>
                <Th>Tỉ lệ đúng</Th>
                <Th>Bài kiểm tra</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const q = row.question;
                return (
                  <Tr key={q.id}>
                    <Td className="max-w-[360px]">
                      <button
                        type="button"
                        className="text-left font-medium text-link hover:underline"
                        onClick={() => setDialog({ kind: 'detail', row })}
                      >
                        {q.content}
                      </button>
                      <p className="type-body-s text-on-surface-variant">{q.heritageName}</p>
                      {q.isHidden && (
                        <span className="mt-1 inline-block">
                          <Badge tone="danger">Đã ẩn</Badge>
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="block">{q.creatorName}</span>
                      <span className="block type-body-s text-on-surface-variant">{q.organizationName}</span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Badge>{q.typeName}</Badge>
                    </Td>
                    <Td>
                      <span className="flex flex-wrap items-center gap-1">
                        <LevelRangeBadge min={q.levelMin} max={q.levelMax} />
                        <DifficultyBadge value={q.difficultyLevel} />
                      </span>
                    </Td>
                    <Td className="tabular-nums">{formatCount(row.answered)}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="tabular-nums">{questionRateLabel(row.correctRatePercent)}</span>
                      {row.lowQuality && (
                        <span className="ml-2 inline-block">
                          <Badge tone="warning">Cần xem lại</Badge>
                        </span>
                      )}
                    </Td>
                    <Td className="tabular-nums">{q.quizCount}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Xem câu "${q.content}"`} onClick={() => setDialog({ kind: 'detail', row })}>
                          <Icon name="eye" size={18} />
                        </Button>
                        {q.isHidden ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hiện lại câu "${q.content}"`}
                            onClick={() => setDialog({ kind: 'confirm', action: 'restore', row })}
                          >
                            <Icon name="refresh" size={18} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ẩn câu "${q.content}"`}
                            onClick={() => setDialog({ kind: 'confirm', action: 'hide', row })}
                          >
                            <Icon name="eye-off" size={18} />
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

      {dialog?.kind === 'detail' && (
        <ModerationDetailDialog
          key={dialog.row.question.id}
          row={dialog.row}
          minAnswers={list.data?.minAnswers ?? 10}
          lowCorrectPercent={list.data?.lowCorrectPercent ?? 30}
          onClose={() => setDialog(null)}
          onAction={(action) => setDialog({ kind: 'confirm', action, row: dialog.row })}
        />
      )}
      {dialog?.kind === 'confirm' && (
        <ModerationConfirmDialog
          key={`${dialog.action}-${dialog.row.question.id}`}
          action={dialog.action}
          questionId={dialog.row.question.id}
          content={dialog.row.question.content}
          onClose={() => setDialog(null)}
          onDone={() => setDialog(null)}
        />
      )}
    </AreaPage>
  );
}
