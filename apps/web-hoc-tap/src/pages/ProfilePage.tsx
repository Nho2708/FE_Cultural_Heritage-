import { daysLearnedText } from '@dsvhvn/dung-chung';
import { studentCodeOf, type StudentClassDetail, type StudentHome, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { Illustration, LevelOneButtonLink, LevelOneSpeak } from '@dsvhvn/dung-chung/lesson';
import { ButtonLink, ErrorState, Icon, LoadingState, type IconName } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, useClassroom } from '../learn-home/classroom';
import { useStudentHome } from '../learn-home/useStudentHome';
import { useAuth } from '../lib/auth/context';

// Hồ sơ của em (Trang hồ sơ học sinh).
// Cấp 1: thẻ học sinh của em dùng một bộ màu cấp 1 như trang học (xanh chính, nền kem, khối vàng nhạt), không emoji, chữ từ 14px trở lên,
// không điểm số hay phần trăm: tên và mã học sinh, nút loa đọc to, trường lớp, ba ô thành tích (sao, ngày đã học, huy hiệu), huy hiệu gần đây.
// Cấp 2 và 3: Thẻ học sinh điện tử (Digital Student ID Badge) chuẩn mực học đường THCS / THPT,
// trang trọng, hiện đại, không dùng hình tượng hoạt hình hoặc emoji trẻ em.

/** Số ngày đã học: lấy từ máy chủ, hoặc tính từ các ngày thực tế em đã nộp bài (nghỉ không bị mất ngày). */
function daysLearnedOf(home: StudentHome | undefined): number {
  if (home?.streakDays && home.streakDays > 0) return home.streakDays;
  const dates = (home?.myLessons ?? [])
    .map((l) => l.lastAttemptAt)
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 10));
  const unique = new Set(dates);
  if (unique.size > 0) return unique.size;
  return (home?.totalStars ?? 0) > 0 ? 1 : 0;
}

function AchievementTile({ to, icon, value, label, title, filled }: { to: string; icon: IconName; value: number; label: string; title: string; filled?: boolean }) {
  return (
    <Link
      to={to}
      title={title}
      className="flex min-h-28 min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] border-2 border-secondary-container bg-surface-container-low px-2 py-3 text-center no-underline hover:bg-surface"
    >
      <Icon name={icon} size={28} className={filled ? 'fill-current text-secondary-container stroke-on-secondary-container/40' : 'text-primary'} />
      <span className="text-[28px] leading-none font-bold text-on-surface tabular-nums">{value}</span>
      <span className="text-[16px] leading-tight font-medium text-on-surface-variant">{label}</span>
    </Link>
  );
}

function ProfileLevelOne({
  user,
  classroom,
}: {
  user: StudentProfile;
  classroom: StudentClassDetail;
}) {
  const { data: home } = useStudentHome();
  const name = user.fullName ?? 'Em';
  const code = studentCodeOf(user);
  const days = daysLearnedOf(home);
  const stars = home?.totalStars ?? 0;
  const badges = home?.recentBadges ?? [];
  const teacher = classroom.teacherName ?? 'Đang cập nhật';
  const school = classroom.organization?.name ?? 'Trường Tiểu học';

  const speechIntro = `Thẻ học sinh của em. Họ và tên: ${name}. Mã học sinh: ${code}. Học sinh lớp ${classroom.name}, trường ${classroom.organization?.name ?? 'Trường học'}. Thầy cô giáo: ${classroom.teacherName ?? 'đang cập nhật'}. Em đã đạt được ${stars} ngôi sao và ${daysLearnedText(days)}. Chúc em học thật vui!`;

  const classRows: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: 'users', label: 'Lớp', value: classroom.name },
    { icon: 'user', label: 'Thầy cô', value: teacher },
    { icon: 'building', label: 'Trường', value: school },
  ];

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Thẻ học sinh của em · DiViet</title>
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
        {/* Thẻ học sinh: linh vật, tên, mã học sinh và nút nghe */}
        <header className="flex items-center gap-4 rounded-[24px] border-2 border-secondary-container bg-surface-container-low p-4 sm:p-5">
          <Illustration state="chao" className="size-16 shrink-0 rounded-full bg-surface sm:size-[72px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-on-surface-variant">Thẻ học sinh của em</p>
            <h1 className="text-[30px] leading-tight font-bold break-words text-on-surface">{name}</h1>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[16px] text-on-surface-variant">
              Mã học sinh
              <span className="font-mono text-[18px] font-bold text-on-surface">{code}</span>
            </p>
          </div>
          <LevelOneSpeak text={speechIntro} label="Nghe thông tin hồ sơ của em" size={56} />
        </header>

        {/* Trường và lớp của em */}
        <section aria-labelledby="truong-lop-cua-em" className="rounded-[20px] border-2 border-border bg-surface p-4">
          <h2 id="truong-lop-cua-em" className="text-[20px] font-bold text-on-surface">
            Trường &amp; Lớp của em
          </h2>
          <dl className="mt-2 flex flex-col divide-y divide-border">
            {classRows.map((row) => (
              <div key={row.label} className="flex items-center gap-3 py-2.5">
                <Icon name={row.icon} size={24} className="shrink-0 text-primary" />
                <dt className="w-24 shrink-0 text-[16px] text-on-surface-variant">{row.label}</dt>
                <dd className="min-w-0 flex-1 text-right text-[18px] font-bold break-words text-on-surface">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Thành tích: ba ô dẫn sang trang Sao của em */}
        <section aria-labelledby="thanh-tich-cua-em" className="flex flex-col gap-3">
          <h2 id="thanh-tich-cua-em" className="text-[22px] font-bold text-on-surface">
            Thành tích của em
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <AchievementTile to={pathOf('progress')} icon="star" value={stars} label="Sao tích lũy" title="Xem tổng sao đạt được" filled />
            <AchievementTile to={pathOf('progress')} icon="calendar" value={days} label="Ngày đã học" title="Xem những ngày em đã học" />
            <AchievementTile to={`${pathOf('progress')}?tab=sao`} icon="shield-check" value={badges.length} label="Huy hiệu" title="Xem bộ sưu tập huy hiệu" />
          </div>
        </section>

        {/* Huy hiệu em đã đạt */}
        <section aria-labelledby="huy-hieu-em-da-dat" className="rounded-[20px] border-2 border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="huy-hieu-em-da-dat" className="text-[20px] font-bold text-on-surface">
              Huy hiệu em đã đạt
            </h2>
            <Link to={`${pathOf('progress')}?tab=sao`} className="inline-flex min-h-12 items-center gap-1 text-[16px] font-bold text-primary no-underline hover:underline">
              Xem tất cả
              <Icon name="chevron-right" size={20} />
            </Link>
          </div>
          {badges.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {badges.slice(0, 4).map((badge) => (
                <li key={`${badge.code}-${badge.attemptId}`} className="flex flex-col items-center gap-1 rounded-[16px] bg-surface-container-low p-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <Icon name="star" size={26} className="fill-current" />
                  </span>
                  <p className="line-clamp-2 text-[18px] leading-tight font-bold text-on-surface">{badge.name}</p>
                  <p className="line-clamp-2 text-[14px] leading-tight text-on-surface-variant">{badge.quizName}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-[16px] bg-surface-container-low p-4 text-center text-[18px] leading-snug text-on-surface">Em làm bài để nhận thật nhiều huy hiệu nhé!</p>
          )}
        </section>

        {/* Về trang học và đổi mật khẩu */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <LevelOneButtonLink to={pathOf('learnHome')}>
            <Icon name="home" size={24} />
            Về trang học
          </LevelOneButtonLink>
          <LevelOneButtonLink to={pathOf('changePassword')} variant="secondary" size="md">
            <Icon name="key" size={22} />
            Đổi mật khẩu
          </LevelOneButtonLink>
        </div>
      </div>
    </section>
  );
}

function ProfileLevelGeneral({
  user,
  classroom,
}: {
  user: StudentProfile;
  classroom: StudentClassDetail;
}) {
  const { data: home } = useStudentHome();
  const code = studentCodeOf(user);
  const facts = classFacts(classroom);
  const myLessons = home?.myLessons ?? [];
  const pendingCount = (home?.inProgress.length ?? 0) + (home?.openQuizzes.length ?? 0);

  // Số ngày học thực tế
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

  const isHighSchool = classroom.schoolLevel === 3;
  const levelTitle = isHighSchool ? 'CẤP 3 · TRUNG HỌC PHỔ THÔNG' : 'CẤP 2 · TRUNG HỌC CƠ SỞ';

  return (
    <section className="dsv-content dsv-section">
      <title>Hồ sơ học sinh · DiViet</title>
      <div className="mx-auto w-full max-w-[800px] flex flex-col gap-6">

        {/* THẺ HỌC SINH ĐIỆN TỬ (Digital Student ID Card — Chuẩn quy học đường, trang trọng, hiện đại) */}
        <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
          {/* Dải đầu thẻ: Header trường & hệ thống DiViet */}
          <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                HỆ THỐNG GIÁO DỤC DI SẢN VIỆT NAM · DIVIET
              </p>
              <p className="text-sm font-black uppercase tracking-wider text-white mt-0.5">
                THẺ HỌC SINH ĐIỆN TỬ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Đang học
              </span>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200 border border-white/20">
                {levelTitle}
              </span>
            </div>
          </div>

          {/* Thân thẻ: Ảnh chân dung mô phỏng + Thông tin định danh học sinh */}
          <div className="p-6 sm:p-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-border bg-surface">
            {/* Khung ảnh thẻ 3x4 tiêu chuẩn học đường kèm mã vạch */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-24 h-32 rounded-lg bg-surface-container-high border-2 border-border flex flex-col items-center justify-center text-on-surface-muted shadow-2xs">
                <Icon name="user" size={40} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold text-on-surface-muted mt-2 uppercase tracking-wider">
                  Ảnh thẻ 3×4
                </span>
              </div>
              <div className="mt-2.5 text-center" aria-hidden="true">
                <span className="font-mono text-[10px] tracking-[0.25em] text-on-surface-muted select-none">
                  ||| | |||| || | ||| ||
                </span>
              </div>
            </div>

            {/* Thông tin chính thức của học sinh */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="type-h1 text-on-surface font-black tracking-tight">
                    {user.fullName ?? 'Học sinh'}
                  </h1>
                  <p className="type-mono-label text-on-surface-variant mt-1.5 flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-medium">Mã học sinh:</span>
                    <span className="font-mono font-bold text-sm text-on-surface bg-surface-container-high px-2 py-0.5 rounded-md border border-border">
                      {code}
                    </span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center justify-center sm:justify-end">
                  <ButtonLink to={pathOf('changePassword')} variant="secondary" size="md">
                    <Icon name="key" size={16} />
                    Đổi mật khẩu
                  </ButtonLink>
                </div>
              </div>

              {/* Thông tin bổ trợ trường lớp dạng tag hiện đại */}
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <span className="rounded-md bg-surface-container px-2.5 py-1 font-bold text-on-surface border border-border">
                  Lớp {classroom.name}
                </span>
                <span className="rounded-md bg-surface-container px-2.5 py-1 font-bold text-on-surface border border-border">
                  Khối {classroom.grade}
                </span>
                {classroom.schoolYear && (
                  <span className="rounded-md bg-surface-container px-2.5 py-1 font-medium text-on-surface-variant border border-border">
                    Niên khóa: {classroom.schoolYear}
                  </span>
                )}
                {classroom.organization && (
                  <span className="rounded-md bg-surface-container px-2.5 py-1 font-medium text-on-surface-variant border border-border">
                    {classroom.organization.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dải Báo cáo chỉ số học tập tổng hợp (Academic Performance Overview — Không dùng emoji) */}
          <div className="p-5 bg-surface-container-low border-b border-border">
            <p className="type-label text-on-surface-muted font-bold text-xs uppercase tracking-wider mb-3">
              Báo cáo tiến độ học tập tích lũy
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to={pathOf('progress')}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
                title="Xem ngày học chuyên cần"
              >
                <div className="flex items-center justify-between text-on-surface-muted">
                  <span className="text-xs font-semibold">Chuyên cần</span>
                  <Icon name="calendar" size={15} />
                </div>
                <p className="mt-2 text-lg font-bold text-on-surface tabular-nums">
                  {activeDays} <span className="text-xs font-normal text-on-surface-variant">ngày</span>
                </p>
              </Link>

              <Link
                to={pathOf('progress')}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
                title="Xem bài học đã kích hoạt"
              >
                <div className="flex items-center justify-between text-on-surface-muted">
                  <span className="text-xs font-semibold">Bài học</span>
                  <Icon name="book-open" size={15} />
                </div>
                <p className="mt-2 text-lg font-bold text-on-surface tabular-nums">
                  {myLessons.length} <span className="text-xs font-normal text-on-surface-variant">bài học</span>
                </p>
              </Link>

              <Link
                to={`${pathOf('progress')}?tab=huy-hieu`}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
                title="Xem danh hiệu đạt được"
              >
                <div className="flex items-center justify-between text-on-surface-muted">
                  <span className="text-xs font-semibold">Danh hiệu</span>
                  <Icon name="shield-check" size={15} />
                </div>
                <p className="mt-2 text-lg font-bold text-on-surface tabular-nums">
                  {home?.recentBadges?.length ?? 0} <span className="text-xs font-normal text-on-surface-variant">huy hiệu</span>
                </p>
              </Link>

              <Link
                to={pathOf('progress')}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors no-underline flex flex-col justify-between"
                title="Xem bài kiểm tra chờ làm"
              >
                <div className="flex items-center justify-between text-on-surface-muted">
                  <span className="text-xs font-semibold">Bài kiểm tra chờ</span>
                  <Icon name="clock" size={15} />
                </div>
                <p className="mt-2 text-lg font-bold text-on-surface tabular-nums">
                  {pendingCount} <span className="text-xs font-normal text-on-surface-variant">bài</span>
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* Khối Thông tin lớp học */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-2xs">
          <h2 className="type-h3 text-on-surface font-bold mb-4">Thông tin lớp học</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {facts.map((fact) => (
              <div key={fact.label} className="p-3.5 rounded-lg bg-surface-container-low border border-border/70 flex flex-col justify-between">
                <dt className="type-label text-on-surface-muted text-xs">{fact.label}</dt>
                <dd className="type-body-m font-bold text-on-surface mt-1">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Khối Tiến độ và kết quả học tập */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 sm:p-6 rounded-xl border border-border bg-surface shadow-2xs">
          <div>
            <p className="type-body-m font-bold text-on-surface">Tiến độ và kết quả học tập</p>
            <p className="type-body-s text-on-surface-variant mt-0.5">
              Xem chi tiết các bài kiểm tra đã làm và huy hiệu đạt được
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <ButtonLink to={pathOf('progress')} variant="primary" size="md" className="w-full sm:w-auto justify-center">
              Xem tiến độ
            </ButtonLink>
          </div>
        </div>

        {/* Hàng nút hành động quay lại trang học */}
        <div className="flex justify-center mt-1">
          <ButtonLink to={pathOf('learnHome')} variant="secondary" size="md" className="px-6">
            Trang học của em
          </ButtonLink>
        </div>

      </div>
    </section>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const classroom = useClassroom();

  if (!user) return null;

  if (classroom.isPending) {
    return (
      <section className="dsv-content dsv-section">
        <title>Hồ sơ của em · DiViet</title>
        <LoadingState rows={3} />
      </section>
    );
  }

  if (classroom.isError) {
    return (
      <section className="dsv-content dsv-section">
        <title>Hồ sơ của em · DiViet</title>
        <ErrorState error={classroom.error} onRetry={() => void classroom.refetch()} />
      </section>
    );
  }

  if (classroom.data.schoolLevel === 1) {
    return <ProfileLevelOne user={user} classroom={classroom.data} />;
  }

  return <ProfileLevelGeneral user={user} classroom={classroom.data} />;
}
