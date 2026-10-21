import type { StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, whoAmI } from './classroom';
import { LearningSections } from './LearningSections';
import { useStudentHome } from './useStudentHome';

// Trang học của em — bản cấp 2 (khối 6-9): Phong cách Cổng thông tin học tập Trung học cơ sở (EdTech Secondary Portal).
// Bố cục chuẩn mực, năng động, thanh lịch, không dùng hình tượng hoạt hình trẻ em.
// Cột chính: Thông tin tài khoản, Bảng chỉ số học tập chuyên cần, Các khối chuyên đề và Khối Lớp của em.
// Cột phụ: Nhiệm vụ kích hoạt bài học bằng mã và lối tắt quản lý học tập.

export function LevelTwo({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const { data: home } = useStudentHome();
  const myLessons = home?.myLessons ?? [];

  // Số ngày học thực tế tích lũy
  const activeDays = (() => {
    if (home?.streakDays && home.streakDays > 0) return home.streakDays;
    const dates = myLessons
      .map((l) => l.lastAttemptAt)
      .filter((d): d is string => Boolean(d))
      .map((d) => d.slice(0, 10));
    const unique = new Set(dates);
    if (unique.size > 0) return unique.size;
    return (home?.totalStars ?? 0) > 0 ? 1 : 0;
  })();

  const pendingCount = (home?.inProgress?.length ?? 0) + (home?.openQuizzes?.length ?? 0);

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-2">
      <title>Trang học của em · DiViet</title>

      {/* Đầu trang: Định danh học sinh & Khối lớp */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface-container-high px-2.5 py-0.5 text-xs font-bold text-on-surface border border-border">
            TRUNG HỌC CƠ SỞ · KHỐI {classroom.grade} · LỚP {classroom.name}
          </span>
          {classroom.organization && (
            <span className="text-xs text-on-surface-variant font-medium">
              {classroom.organization.name}
            </span>
          )}
        </div>
        <h1 className="type-h1 text-on-surface font-black tracking-tight mt-1">Trang học của em</h1>
        <p className="type-body-s text-on-surface-variant font-mono">{whoAmI(user)}</p>
      </div>

      {/* Khung tổng quan kế hoạch học tập */}
      <div className="mt-5 rounded-xl border border-border bg-surface-container-low p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="type-h3 text-on-surface font-bold">
            Chào {user.fullName ?? 'em'}!
          </p>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            {home?.cheer ?? 'Theo dõi kế hoạch học tập, hoàn thành các bài kiểm tra chuyên đề và khám phá tư liệu di sản.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ButtonLink to={pathOf('progress')} variant="secondary" size="md">
            Xem tiến độ
          </ButtonLink>
          <ButtonLink to={pathOf('enterCode')} variant="primary" size="md">
            <Icon name="key" size={16} />
            Nhập mã bài học
          </ButtonLink>
        </div>
      </div>

      {/* Dải chỉ số học tập (EdTech Metric Cards - Không dùng emoji hoạt hình) */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to={pathOf('progress')}
          className="rounded-xl border border-border bg-surface p-3.5 hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
          title="Xem ngày học chuyên cần"
        >
          <div className="flex items-center justify-between text-on-surface-muted">
            <span className="text-xs font-semibold">Chuyên cần</span>
            <Icon name="calendar" size={16} />
          </div>
          <p className="mt-2 text-xl font-black text-on-surface tabular-nums">
            {activeDays} <span className="text-xs font-medium text-on-surface-variant">ngày</span>
          </p>
        </Link>

        <Link
          to={pathOf('progress')}
          className="rounded-xl border border-border bg-surface p-3.5 hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
          title="Xem bài học đã kích hoạt"
        >
          <div className="flex items-center justify-between text-on-surface-muted">
            <span className="text-xs font-semibold">Bài học đã mở</span>
            <Icon name="book-open" size={16} />
          </div>
          <p className="mt-2 text-xl font-black text-on-surface tabular-nums">
            {myLessons.length} <span className="text-xs font-medium text-on-surface-variant">chuyên đề</span>
          </p>
        </Link>

        <Link
          to={pathOf('progress')}
          className="rounded-xl border border-border bg-surface p-3.5 hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
          title="Xem bài kiểm tra chờ làm"
        >
          <div className="flex items-center justify-between text-on-surface-muted">
            <span className="text-xs font-semibold">Bài kiểm tra chờ</span>
            <Icon name="clock" size={16} />
          </div>
          <p className="mt-2 text-xl font-black text-on-surface tabular-nums">
            {pendingCount} <span className="text-xs font-medium text-on-surface-variant">bài</span>
          </p>
        </Link>

        <Link
          to={`${pathOf('progress')}?tab=huy-hieu`}
          className="rounded-xl border border-border bg-surface p-3.5 hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
          title="Xem danh hiệu đạt được"
        >
          <div className="flex items-center justify-between text-on-surface-muted">
            <span className="text-xs font-semibold">Huy hiệu đạt được</span>
            <Icon name="shield-check" size={16} />
          </div>
          <p className="mt-2 text-xl font-black text-on-surface tabular-nums">
            {home?.recentBadges?.length ?? 0} <span className="text-xs font-medium text-on-surface-variant">danh hiệu</span>
          </p>
        </Link>
      </div>

      {/* Bố cục 2 cột */}
      <div className="mt-8 grid gap-(--dsv-block-gap) lg:grid-cols-[1fr_320px] items-start">
        {/* CỘT CHÍNH: Các khối học tập + Lớp của em */}
        <div className="flex min-w-0 flex-col gap-(--dsv-block-gap)">
          <LearningSections level={2} />

          <section aria-labelledby="lop-cua-em" className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Icon name="building" size={18} className="text-on-surface-variant" />
                <h2 id="lop-cua-em" className="type-h2 text-on-surface font-bold">
                  Lớp của em
                </h2>
              </div>
              <Link
                to={pathOf('profile')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Hồ sơ học sinh →
              </Link>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classFacts(classroom).map((fact) => (
                <div key={fact.label} className="p-3.5 rounded-lg bg-surface-container-low border border-border/70">
                  <dt className="type-label text-on-surface-muted text-xs">{fact.label}</dt>
                  <dd className="mt-1 font-bold text-on-surface text-sm">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* CỘT PHỤ (Aside): Nhập mã bài học + Lối tắt */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs">
            <h2 className="type-h3 text-on-surface font-bold">Mã bài học</h2>
            <p className="mt-2 type-body-s text-on-surface-variant">
              Nhập mã thầy cô đưa cho lớp em để mở bài học.
            </p>
            <ButtonLink to={pathOf('enterCode')} className="mt-4" fullWidth>
              Nhập mã bài học
            </ButtonLink>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-on-surface-muted">
              <span>Cấp đào tạo:</span>
              <span className="type-label font-bold text-on-surface">{SCHOOL_LEVEL_LABEL[classroom.schoolLevel]}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs flex flex-col gap-1.5">
            <p className="type-label text-on-surface-muted font-bold text-xs uppercase tracking-wider mb-1">
              Lối tắt học tập
            </p>
            <Link
              to={pathOf('progress')}
              className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container-low no-underline transition-colors"
            >
              <span>Xem tiến độ học tập</span>
              <span>→</span>
            </Link>
            <Link
              to={`${pathOf('progress')}?tab=huy-hieu`}
              className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container-low no-underline transition-colors"
            >
              <span>Kho huy hiệu di sản</span>
              <span>→</span>
            </Link>
            <Link
              to={pathOf('changePassword')}
              className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container-low no-underline transition-colors"
            >
              <span>Đổi mật khẩu tài khoản</span>
              <span>→</span>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
