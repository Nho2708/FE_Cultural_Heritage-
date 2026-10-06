import { formatDateTime, formatNumber, formatPercent, initials } from '@dsvhvn/dung-chung';
import { ApiError, type StudentProfileStats } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, Table, Td, TextLink, Th, Tr } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { AreaPage } from '../../components/layout/PageHeader';
import { ScoreTrendChart } from '../../components/statistics/ScoreCharts';
import { AttemptDetailDialog } from '../../components/statistics/AttemptDetailDialog';
import { Block, MasteryBadge, NoResultsNote, RateBar, StarCount, StatCard, StudentStatusBadge } from '../../components/statistics/StatBits';
import { queryKeys } from '../../lib/api/queryKeys';
import { statisticsApi } from '../../lib/api/statisticsEndpoints';

// Hồ sơ học tập của học sinh — giáo viên. Họ tên, mã học sinh, lớp, lần đăng nhập gần nhất; điểm trung bình, bài kiểm tra đã làm, bài học
// đã hoàn thành, huy hiệu; biểu đồ điểm theo thời gian; lịch sử làm bài (bấm một dòng để mở Chi tiết bài làm); bài học đã hoàn thành; mức
// thành thạo theo di sản, tỉnh và loại di sản; huy hiệu tính khi hiển thị. Lớp cấp 1 kèm số sao.

function Profile({ data }: { data: StudentProfileStats }) {
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const stars = data.level === 1;
  const badgeTotal = data.badges.reduce((sum, b) => sum + b.count, 0);
  return (
    <div className="flex flex-col gap-6">
      <NoResultsNote message={data.message} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Điểm trung bình"
          value={data.averagePercent === null ? '—' : formatPercent(data.averagePercent)}
          note={`trên ${data.finishedAttempts} lượt đã nộp`}
        />
        <StatCard
          label="Bài kiểm tra đã làm"
          value={data.quizzesSubmitted}
          note={`trên ${data.quizzesPublished} bài đã phát hành${stars && data.totalStars !== null ? ` · ${data.totalStars} sao` : ''}`}
        />
        <StatCard
          label="Bài học đã hoàn thành"
          value={data.completedLessons.length}
          note={`của lớp ${data.className}`}
        />
        <StatCard label="Huy hiệu" value={badgeTotal} note={data.badges[0] ? `Gần nhất: ${data.badges[0].name}` : 'Chưa có huy hiệu'} />
      </div>

      {data.scoreTrend.length > 0 && (
        <Block title="Điểm theo thời gian" hint={`Thang điểm 10 · ${data.scoreTrend.length} lượt làm bài`}>
          <ScoreTrendChart points={data.scoreTrend} />
        </Block>
      )}

      <section aria-label="Lịch sử làm bài" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="type-h3 text-on-surface">Lịch sử làm bài</h2>
          <p className="type-body-s text-on-surface-variant">Bấm một dòng để mở Chi tiết bài làm</p>
        </div>
        {data.history.length === 0 ? (
          <EmptyState icon="clock" title="Em chưa nộp bài kiểm tra nào." />
        ) : (
          <Table caption="Lịch sử làm bài của học sinh">
            <thead>
              <tr>
                <Th>Bài kiểm tra</Th>
                <Th>Bài học</Th>
                <Th>Ngày nộp</Th>
                <Th>Điểm</Th>
                <Th>Trạng thái</Th>
                <Th className="w-12">
                  <span className="sr-only">Xem bài làm</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => (
                <Tr key={row.attemptId} className="cursor-pointer" onClick={() => setAttemptId(row.attemptId)}>
                  <Td className="font-medium">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttemptId(row.attemptId);
                      }}
                    >
                      {row.quizName}
                    </button>
                  </Td>
                  <Td>{row.lessonTitle}</Td>
                  <Td className="type-mono-label whitespace-nowrap">{formatDateTime(row.submittedAt)}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="inline-flex flex-wrap items-center gap-x-3">
                      <span className="type-label">
                        {formatNumber(row.score)}/{formatNumber(row.totalPoint)}
                      </span>
                      {stars && <StarCount stars={row.stars} />}
                    </span>
                  </Td>
                  <Td>
                    <StudentStatusBadge status={row.status === 'EXPIRED' ? 'EXPIRED' : 'SUBMITTED'} label={row.statusLabel} />
                  </Td>
                  <Td>
                    <Icon name="chevron-right" size={18} className="text-on-surface-variant" />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Block title="Bài học đã hoàn thành" hint="Em đã nộp mọi bài kiểm tra đã phát hành của bài học.">
          {data.completedLessons.length === 0 ? (
            <p className="type-body-s text-on-surface-variant">Chưa hoàn thành bài học nào.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.completedLessons.map((lesson) => (
                <li key={lesson.lessonId} className="flex items-center gap-3 rounded-md bg-surface-container-low px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block type-label text-on-surface">{lesson.title}</span>
                    <span className="type-body-s text-on-surface-variant">
                      {lesson.quizzesDone}/{lesson.quizzesPublished} bài kiểm tra
                    </span>
                  </span>
                  <Icon name="check" size={20} className="text-success" />
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title="Mức thành thạo theo di sản" hint="Tỉ lệ câu trả lời đúng của em theo từng di sản. Xanh từ 80%, vàng từ 50%, đỏ dưới 50%.">
          {data.masteryByHeritage.length === 0 ? (
            <p className="type-body-s text-on-surface-variant">Chưa có dữ liệu.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.masteryByHeritage.map((row) => (
                <li key={row.id} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <span className="min-w-0 type-body-m text-on-surface">{row.name}</span>
                  <RateBar ratePercent={row.ratePercent} answered={row.answered} label={`Tỉ lệ đúng ${row.name}: ${formatPercent(row.ratePercent)}`} />
                  <MasteryBadge level={row.level} />
                </li>
              ))}
            </ul>
          )}
          {(data.masteryByProvince.length > 0 || data.masteryByHeritageType.length > 0) && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {[
                { title: 'Theo tỉnh', rows: data.masteryByProvince },
                { title: 'Theo loại di sản', rows: data.masteryByHeritageType },
              ].map(({ title, rows }) => (
                <div key={title}>
                  <h3 className="type-label text-on-surface-variant">{title}</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {rows.map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-2 type-body-s">
                        <span className="min-w-0">{row.name}</span>
                        <span className="inline-flex items-center gap-2">
                          <span className="tabular-nums">{formatPercent(row.ratePercent)}</span>
                          <MasteryBadge level={row.level} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Block>
      </div>

      <Block title="Huy hiệu" hint="Tính từ kết quả học tập mỗi khi mở trang.">
        {data.badges.length === 0 ? (
          <p className="type-body-s text-on-surface-variant">Chưa có huy hiệu nào.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.badges.map((badge) => (
              <li key={badge.code} className="flex items-center gap-3 rounded-md bg-warning-container px-4 py-3 text-on-warning-container">
                <Icon name="star" size={20} />
                <span className="type-label">{badge.name}</span>
                <Badge className="ml-auto">{badge.count} lần</Badge>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {attemptId !== null && <AttemptDetailDialog attemptId={attemptId} onClose={() => setAttemptId(null)} />}
    </div>
  );
}

export default function StudentRecordPage() {
  const params = useParams();
  const classId = Number(params.lop);
  const studentId = Number(params.hocSinh);
  const valid = Number.isInteger(classId) && classId > 0 && Number.isInteger(studentId) && studentId > 0;
  const query = useQuery({
    queryKey: queryKeys.studentProfile(classId, studentId),
    queryFn: () => statisticsApi.studentProfile(classId, studentId).then((r) => r.data),
    enabled: valid,
  });
  const classLink = valid ? PATHS.classRoom(classId) : pathOf('classes');
  const crumbs = (
    <nav aria-label="Đường dẫn" className="type-body-s text-on-surface-variant">
      <TextLink to={pathOf('classes')}>Lớp học</TextLink>
      {' / '}
      <TextLink to={classLink}>{query.data ? query.data.className : 'Lớp'}</TextLink>
      {' / '}
      <span>{query.data?.fullName ?? 'Học sinh'}</span>
    </nav>
  );

  if (query.isPending && query.fetchStatus !== 'idle') {
    return (
      <AreaPage>
        {crumbs}
        <LoadingState />
      </AreaPage>
    );
  }
  if (query.isError || !query.data) {
    const notFound = !valid || (query.error instanceof ApiError && query.error.status === 404);
    return (
      <AreaPage>
        {crumbs}
        <title>Hồ sơ học tập của học sinh · DSVHVN</title>
        {notFound ? (
          <EmptyState icon="info" title="Không tìm thấy học sinh." action={<Button variant="secondary" onClick={() => history.back()}>Quay lại</Button>}>
            Học sinh không tồn tại, đã bị xóa hoặc không thuộc lớp do thầy cô phụ trách.
          </EmptyState>
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )}
      </AreaPage>
    );
  }

  const data = query.data;
  return (
    <AreaPage>
      <title>{`${data.fullName ?? 'Học sinh'} · Hồ sơ học tập · DSVHVN`}</title>
      {crumbs}
      <header className="flex flex-wrap items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-container type-h3 text-on-primary-container">
          {initials(data.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="type-h1 text-on-surface">{data.fullName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 type-body-m text-on-surface-variant">
            <span>
              Mã học sinh <span className="type-mono-label text-on-surface">{data.studentCode}</span>
            </span>
            <span>Lớp {data.className}</span>
            <span>Đăng nhập gần nhất: {data.lastLoginAt ? formatDateTime(data.lastLoginAt) : 'chưa đăng nhập lần nào'}</span>
            <Badge tone={data.isActive ? 'success' : 'neutral'}>{data.isActive ? 'Hoạt động' : 'Đã vô hiệu'}</Badge>
          </p>
        </div>
        <ButtonLink to={classLink} variant="secondary">
          <Icon name="arrow-left" size={16} />
          Về lớp {data.className}
        </ButtonLink>
      </header>
      <Profile data={data} />
    </AreaPage>
  );
}
