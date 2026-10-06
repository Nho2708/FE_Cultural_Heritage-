import {
  averageOnTen,
  classLabel,
  formatCount,
  formatDateTime,
  formatPlanDate,
  isNearLimit,
  sortClassesByAverage,
  usagePercent,
} from '@dsvhvn/dung-chung';
import type { SchoolOverview } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, EmptyState, ErrorState, Icon, InlineMessage, LoadingState, SelectField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { pathOf } from '../../access/screens';
import { SubscriptionBadge } from '../../components/account/SubscriptionSummary';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { BarList, MetricTile, UsageBar } from '../../components/overview/OverviewBits';
import { Block } from '../../components/statistics/StatBits';
import { overviewApi } from '../../lib/api/overviewEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Tổng quan trường — quản trị trường. Chỉ có số tổng của trường mình: giáo viên so với hạn mức, lớp theo cấp, học sinh (đã và chưa đăng
// nhập), bài học, bài kiểm tra đã phát hành, lượt nộp, lượt AI so với hạn mức trong kỳ, điểm trung bình toàn trường và theo lớp, gói hiện tại
// kèm lời nhắc gia hạn. Không có tên học sinh hay giáo viên, không có bài làm từng em.

const TOP_CLASSES = 8;

function TeacherTile({ data }: { data: SchoolOverview }) {
  const { used, max, planName } = data.teachers;
  return (
    <MetricTile
      label="Giáo viên"
      value={max === null ? formatCount(used) : `${formatCount(used)} / ${formatCount(max)}`}
      note={
        max === null
          ? 'Trường chưa có gói hiệu lực nên chưa có hạn mức giáo viên.'
          : `Còn ${formatCount(Math.max(0, max - used))} tài khoản giáo viên trong gói ${planName ?? ''}`.trim()
      }
    >
      <UsageBar percent={usagePercent(used, max)} label="Giáo viên so với hạn mức của gói" />
    </MetricTile>
  );
}

function AiTile({ data }: { data: SchoolOverview }) {
  const { ai } = data;
  const percent = usagePercent(ai.used, ai.max);
  const near = isNearLimit(ai.used, ai.max);
  return (
    <MetricTile
      label="Lượt AI trong kỳ"
      value={ai.max === null ? formatCount(ai.used) : `${formatCount(ai.used)} / ${formatCount(ai.max)}`}
      note={
        !ai.hasEffectivePlan ? (
          'Trường chưa có gói hiệu lực nên chưa có hạn mức lượt AI.'
        ) : near ? (
          <span className="inline-flex items-start gap-1 text-warning-text">
            <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
            <span>
              {ai.remaining === 0 ? 'Đã hết lượt AI' : 'Sắp hết lượt AI'}
              {ai.periodEnd ? `; kỳ hiện tại kết thúc ngày ${formatPlanDate(ai.periodEnd)}` : ''}
            </span>
          </span>
        ) : ai.periodEnd ? (
          `Kỳ hiện tại kết thúc ngày ${formatPlanDate(ai.periodEnd)}`
        ) : undefined
      }
    >
      <UsageBar percent={percent} tone={near ? 'warning' : 'ok'} label="Lượt AI đã dùng so với hạn mức trong kỳ" />
    </MetricTile>
  );
}

function ClassAverages({ data }: { data: SchoolOverview }) {
  const [level, setLevel] = useState('');
  const [showAll, setShowAll] = useState(false);
  const sorted = sortClassesByAverage(data.classes, level ? Number(level) : null);
  const shown = showAll ? sorted : sorted.slice(0, TOP_CLASSES);
  const levelOptions = [
    { value: '', label: 'Tất cả cấp' },
    ...data.levels.filter((l) => l.classCount > 0).map((l) => ({ value: String(l.schoolLevel), label: l.schoolLevelName })),
  ];
  return (
    <Block
      title="Điểm trung bình theo lớp"
      hint="Thang điểm 10, trung bình điểm từng lượt đã nộp của học sinh đang hoạt động."
      actions={
        <div className="w-full dsvsm:w-56">
          <SelectField
            label="Lọc theo cấp"
            value={level}
            options={levelOptions}
            onChange={(e) => {
              setLevel(e.target.value);
              setShowAll(false);
            }}
          />
        </div>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState icon="users" title={data.classCount === 0 ? 'Trường chưa có lớp nào.' : 'Không có lớp nào ở cấp này.'} />
      ) : (
        <>
          <BarList
            caption="Điểm trung bình theo lớp"
            rows={shown.map((c) => ({
              key: c.classId,
              label: classLabel(c),
              percent: c.averagePercent,
              valueLabel: averageOnTen(c.averagePercent),
              hint: `${formatCount(c.finishedAttempts)} lượt nộp`,
            }))}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 type-body-s text-on-surface-variant">
            <p>
              Hiển thị {shown.length} trên {sorted.length} lớp, lớp điểm cao xếp trước. Trang này chỉ có số liệu tổng, không có bài làm của từng học
              sinh.
            </p>
            {sorted.length > TOP_CLASSES && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Chỉ hiện 8 lớp đầu' : `Hiện cả ${sorted.length} lớp`}
              </Button>
            )}
          </div>
        </>
      )}
    </Block>
  );
}

function PlanCard({ data }: { data: SchoolOverview }) {
  const { plan, planNotice } = data;
  return (
    <section aria-labelledby="goi-hien-tai-tong-quan" className="flex flex-col rounded-md border border-border bg-surface p-5">
      <p id="goi-hien-tai-tong-quan" className="type-label-kicker text-on-surface-muted">
        GÓI HIỆN TẠI
      </p>
      {plan ? (
        <>
          <p className="mt-2 flex flex-wrap items-center gap-2 type-h2 text-on-surface">
            {plan.planName}
            <SubscriptionBadge status={plan.status} effective={plan.isEffective} />
          </p>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 type-body-s">
            <dt className="text-on-surface-variant">Ngày bắt đầu</dt>
            <dd className="type-mono-label text-on-surface">{formatPlanDate(plan.startDate) || '—'}</dd>
            <dt className="text-on-surface-variant">Ngày hết hạn</dt>
            <dd className="type-mono-label text-on-surface">{formatPlanDate(plan.endDate) || '—'}</dd>
            {planNotice.daysLeft !== null && (
              <>
                <dt className="text-on-surface-variant">Còn lại</dt>
                <dd className="type-mono-label text-on-surface">{planNotice.daysLeft} ngày</dd>
              </>
            )}
            <dt className="text-on-surface-variant">Giáo viên</dt>
            <dd className="type-mono-label text-on-surface">
              {data.teachers.max === null ? data.teachers.used : `${data.teachers.used} / ${data.teachers.max}`}
            </dd>
            <dt className="text-on-surface-variant">Lượt AI trong kỳ</dt>
            <dd className="type-mono-label text-on-surface">{data.ai.max === null ? data.ai.used : `${data.ai.used} / ${data.ai.max}`}</dd>
          </dl>
        </>
      ) : (
        <p className="mt-3 type-body-m text-on-surface-variant">Trường chưa có gói dịch vụ nào.</p>
      )}
      {planNotice.kind !== 'NONE' && planNotice.message && (
        <div className="mt-4">
          <InlineMessage tone="warning">{planNotice.message}</InlineMessage>
        </div>
      )}
      <ButtonLink to={pathOf('schoolInfo')} variant="secondary" className="mt-5 justify-center">
        Xem gói và hóa đơn
      </ButtonLink>
    </section>
  );
}

function levelNote(data: SchoolOverview): string {
  const parts = data.levels.filter((l) => l.classCount > 0).map((l) => `Cấp ${l.schoolLevel}: ${formatCount(l.classCount)} lớp`);
  return parts.length > 0 ? parts.join(' · ') : 'Chưa có lớp nào';
}

export default function SchoolOverviewPage() {
  const overview = useQuery({ queryKey: queryKeys.schoolOverview, queryFn: () => overviewApi.school().then((r) => r.data) });
  const data = overview.data;
  return (
    <AreaPage>
      <PageHeader
        title="Tổng quan trường"
        description={data ? `Số liệu tổng của ${data.organizationName}. Cập nhật lúc ${formatDateTime(data.generatedAt)}.` : 'Số liệu tổng của trường.'}
        actions={
          <Button variant="secondary" onClick={() => void overview.refetch()} loading={overview.isFetching && !overview.isPending}>
            <Icon name="refresh" size={16} />
            Làm mới
          </Button>
        }
      />

      {overview.isPending ? (
        <LoadingState rows={4} />
      ) : overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      ) : (
        data && (
          <>
            {data.planNotice.kind === 'EXPIRING_SOON' && data.planNotice.message && (
              <InlineMessage
                tone="warning"
                action={
                  <ButtonLink to={pathOf('schoolInfo')} variant="secondary" size="sm">
                    Xem gói
                  </ButtonLink>
                }
              >
                {data.planNotice.message}
              </InlineMessage>
            )}

            <section aria-label="Số liệu của trường" className="grid gap-4 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
              <TeacherTile data={data} />
              <MetricTile label="Lớp" value={formatCount(data.classCount)} note={levelNote(data)} />
              <MetricTile
                label="Học sinh"
                value={formatCount(data.students.active)}
                note={`${formatCount(data.students.loggedIn)} em đã đăng nhập ít nhất một lần, ${formatCount(data.students.neverLoggedIn)} em chưa đăng nhập`}
              />
              <MetricTile label="Bài học" value={formatCount(data.lessons.total)} note={`${formatCount(data.lessons.published)} bài đã xuất bản`} />
              <MetricTile
                label="Bài kiểm tra đã phát hành"
                value={formatCount(data.quizzes.published)}
                note={`${formatCount(data.quizzes.open)} bài đang mở cho học sinh làm`}
              />
              <MetricTile label="Lượt nộp" value={formatCount(data.attempts.finished)} note="Gồm cả bài hết giờ tự nộp" />
              <AiTile data={data} />
              <MetricTile
                label="Điểm trung bình toàn trường"
                value={data.attempts.averagePercent === null ? '—' : averageOnTen(data.attempts.averagePercent)}
                note={data.attempts.averagePercent === null ? 'Chưa có lượt nộp nào.' : 'Thang điểm 10, trung bình điểm từng lượt đã nộp'}
              />
            </section>

            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 dsvlg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <ClassAverages data={data} />
              <PlanCard data={data} />
            </div>
          </>
        )
      )}
    </AreaPage>
  );
}
