import { studentCodeOf, type StudentClassDetail, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { Illustration, SpeakButton } from '@dsvhvn/dung-chung/lesson';
import { ButtonLink, ErrorState, Icon, LoadingState } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, useClassroom } from '../learn-home/classroom';
import { useStudentHome } from '../learn-home/useStudentHome';
import { useAuth } from '../lib/auth/context';

// Hồ sơ của em (Trang hồ sơ học sinh).
// Cấp 1: Giao diện Hộ chiếu Di sản Nhí (Heritage Passport), phong cách tươi sáng, bo tròn mềm mại,
// không điểm số/%, tập trung vào Sao ⭐, Chuỗi ngày chăm chỉ 🔥, Huy hiệu 🏆 và nút loa đọc to.
// Cấp 2 và 3: Thẻ học sinh điện tử (Digital Student ID Badge) chuẩn mực, hiện đại, tích hợp dải chỉ số thành tích và thông tin trường lớp.

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

  // Số ngày chăm chỉ: lấy từ máy chủ, hoặc tính từ các ngày thực tế em đã hoàn thành bài học (không bị mất ngày khi nghỉ)
  const activeDays = (() => {
    if (home?.streakDays && home.streakDays > 0) return home.streakDays;
    const dates = (home?.myLessons ?? [])
      .map((l) => l.lastAttemptAt)
      .filter((d): d is string => Boolean(d))
      .map((d) => d.slice(0, 10));
    const unique = new Set(dates);
    if (unique.size > 0) return unique.size;
    return (home?.totalStars ?? 0) > 0 ? 1 : 0;
  })();

  const speechIntro = `Thẻ học sinh của em. Họ và tên: ${name}. Mã học sinh: ${code}. Học sinh lớp ${classroom.name}, trường ${classroom.organization?.name ?? 'Trường học'}. Thầy cô giáo: ${classroom.teacherName ?? 'đang cập nhật'}. Em đã đạt được ${home?.totalStars ?? 0} ngôi sao và ${activeDays} ngày chăm chỉ. Chúc em học thật vui!`;

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Thẻ học sinh của em · DiViet</title>
      <div className="mx-auto w-full max-w-[640px] flex flex-col gap-6">

        {/* THẺ HỌC SINH CỦA EM (Thiết kế dạng Thẻ học sinh thông minh, tinh gọn, thân thiện lứa tuổi tiểu học) */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border-2 border-emerald-300">
          
          {/* Header thẻ: Tông Xanh Ngọc Di Sản có logo / dải băng */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" aria-hidden="true">🇻🇳</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                  DI SẢN VIỆT NAM
                </p>
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-300">
                  THẺ HỌC SINH CỦA EM
                </h2>
              </div>
            </div>

            <SpeakButton
              text={speechIntro}
              label="Nghe thông tin hồ sơ của em"
              size="sm"
              className="dsv-speak-btn bg-white/20 hover:bg-white/30 text-white border-white/30"
            />
          </div>

          {/* Thân thẻ: Ảnh đại diện + Tên + Mã số + Thông tin trường lớp */}
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            
            {/* Ảnh đại diện em học sinh */}
            <div className="relative mb-3">
              <div className="size-24 rounded-full bg-emerald-50 p-2 shadow-inner border-4 border-amber-300 flex items-center justify-center">
                <Illustration state="chao" className="size-full text-emerald-800 drop-shadow-xs" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-amber-400 text-sm shadow-md border-2 border-white" title="Thám hiểm nhí">
                🎒
              </span>
            </div>

            {/* Họ và tên học sinh */}
            <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
              {name}
            </h1>

            {/* Mã học sinh */}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50/80 px-4 py-1 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800">Mã học sinh:</span>
              <span className="font-mono font-black text-sm text-emerald-950 tracking-wider">
                {code}
              </span>
            </div>

            {/* Thông tin trường & lớp — gọn gàng, tự nhiên, không rườm rà hành chính */}
            <section aria-label="Trường & Lớp của em" className="mt-5 w-full rounded-2xl bg-slate-50/80 border border-slate-200/80 p-3.5 flex flex-col sm:flex-row items-center justify-around gap-2 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="text-base" aria-hidden="true">🏫</span>
                <span>Lớp: <strong className="text-emerald-900 font-black">{classroom.name}</strong></span>
              </div>
              <span className="hidden sm:inline text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-base" aria-hidden="true">👩‍🏫</span>
                <span>Giáo viên: <strong className="text-emerald-900 font-black">{classroom.teacherName ?? 'Đang cập nhật'}</strong></span>
              </div>
              <span className="hidden sm:inline text-slate-300">|</span>
              <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={classroom.organization?.name}>
                <span className="text-base" aria-hidden="true">📍</span>
                <span className="truncate">{classroom.organization?.name ?? 'Trường Tiểu học'}</span>
              </div>
            </section>

          </div>

          {/* Dải chân thẻ: 3 Chỉ số thành tích khích lệ */}
          <div className="border-t border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-emerald-50/30 p-4 sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900/60 mb-2.5 text-center">
              THÀNH TÍCH HỌC TẬP CỦA EM
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Link
                to={pathOf('progress')}
                className="flex flex-col items-center justify-between min-h-[104px] py-3.5 px-2 rounded-2xl bg-orange-50 border border-orange-200 border-b-3 border-b-orange-400 transition-all hover:-translate-y-0.5 active:translate-y-0.5 no-underline cursor-pointer group text-center min-w-0"
                title="Xem ngày chăm chỉ"
              >
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform leading-none" aria-hidden="true">🔥</span>
                <span className="text-xl sm:text-2xl font-black text-orange-600 leading-tight my-1">
                  {activeDays}
                </span>
                <span className="text-[11px] font-bold text-orange-950/70 uppercase tracking-wide leading-none">
                  Chăm chỉ
                </span>
              </Link>

              <Link
                to={pathOf('progress')}
                className="flex flex-col items-center justify-between min-h-[104px] py-3.5 px-2 rounded-2xl bg-amber-50 border border-amber-200 border-b-3 border-b-amber-400 transition-all hover:-translate-y-0.5 active:translate-y-0.5 no-underline cursor-pointer group text-center min-w-0"
                title="Xem tổng sao đạt được"
              >
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform leading-none" aria-hidden="true">⭐</span>
                <span className="text-xl sm:text-2xl font-black text-amber-700 leading-tight my-1">
                  {home?.totalStars ?? 0}
                </span>
                <span className="text-[11px] font-bold text-amber-950/70 uppercase tracking-wide leading-none">
                  Sao tích lũy
                </span>
              </Link>

              <Link
                to={`${pathOf('progress')}?tab=huy-hieu`}
                className="flex flex-col items-center justify-between min-h-[104px] py-3.5 px-2 rounded-2xl bg-purple-50 border border-purple-200 border-b-3 border-b-purple-400 transition-all hover:-translate-y-0.5 active:translate-y-0.5 no-underline cursor-pointer group text-center min-w-0"
                title="Xem bộ sưu tập huy hiệu"
              >
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform leading-none" aria-hidden="true">🏆</span>
                <span className="text-xl sm:text-2xl font-black text-purple-700 leading-tight my-1">
                  {home?.recentBadges?.length ?? 0}
                </span>
                <span className="text-[11px] font-bold text-purple-950/70 uppercase tracking-wide leading-none">
                  Huy hiệu
                </span>
              </Link>
            </div>
          </div>

        </div>

        {/* Khối Huy hiệu em đã đạt */}
        <div className="w-full duo-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🏆</span>
              <h3 className="text-sm font-black text-emerald-950">
                Huy hiệu em đã đạt
              </h3>
            </div>
            <Link
              to={`${pathOf('progress')}?tab=huy-hieu`}
              className="text-xs font-black text-emerald-700 hover:underline"
            >
              Xem tất cả ▶
            </Link>
          </div>

          {home?.recentBadges && home.recentBadges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {home.recentBadges.slice(0, 4).map((badge) => (
                <div
                  key={`${badge.code}-${badge.attemptId}`}
                  className="rounded-2xl border border-purple-200 bg-purple-50/60 p-2.5 flex flex-col items-center text-center gap-1"
                >
                  <span className="text-2xl" aria-hidden="true">🎖️</span>
                  <p className="text-xs font-black text-purple-950 line-clamp-1">{badge.name}</p>
                  <span className="text-[10px] font-bold text-purple-700/80 line-clamp-1">
                    {badge.quizName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 gap-1.5">
              <span className="text-2xl" aria-hidden="true">🌟</span>
              <p className="text-xs font-bold text-emerald-900">
                Em hãy vượt qua các bài thử thách để thu thập thật nhiều huy hiệu di sản xinh xắn nhé!
              </p>
            </div>
          )}
        </div>

        {/* Hàng nút hành động: Về trang học + Đổi mật khẩu */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <ButtonLink
            to={pathOf('learnHome')}
            className="duo-btn-green w-full sm:w-auto px-8 py-3 text-sm font-black no-underline flex items-center justify-center gap-2 shadow-md"
          >
            🏠 Về trang học
          </ButtonLink>
          <ButtonLink
            to={pathOf('changePassword')}
            className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 text-xs font-bold no-underline flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Icon name="key" size={16} />
            Đổi mật khẩu
          </ButtonLink>
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

        {/* THẺ HỌC SINH ĐIỆN TỬ (Digital Student ID Badge) */}
        <div className="relative overflow-hidden rounded-3xl bg-surface border-2 border-border shadow-md">
          {/* Dải đầu thẻ: Header trường & hệ thống DiViet */}
          <div className="bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" aria-hidden="true">🇻🇳</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  HỆ THỐNG GIÁO DỤC DI SẢN VIỆT NAM · DIVIET
                </p>
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                  THẺ HỌC SINH ĐIỆN TỬ
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white border border-white/20">
                {levelTitle}
              </span>
            </div>
          </div>

          {/* Thân thẻ: Thông tin danh tính học sinh */}
          <div className="p-6 sm:p-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-border/80 bg-surface">
            {/* Ảnh đại diện / Monogram huy hiệu học sinh */}
            <div className="relative shrink-0">
              <div className="size-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white text-3xl font-black shadow-inner border-2 border-white">
                {(user.fullName ?? 'H')[0]?.toUpperCase() ?? 'H'}
              </div>
              <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-surface border border-border text-sm shadow-2xs" title="Học sinh DiViet">
                {isHighSchool ? '🎓' : '🧭'}
              </span>
            </div>

            {/* Thông tin chính */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="type-h1 text-on-surface font-black tracking-tight">
                    {user.fullName ?? 'Học sinh'}
                  </h1>
                  <p className="type-mono-label text-on-surface-variant mt-1.5 flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-medium">Mã học sinh:</span>
                    <span className="font-mono font-black text-sm text-primary px-2.5 py-0.5 rounded-lg bg-primary-container/40 border border-primary/20">
                      {code}
                    </span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center justify-center sm:justify-end">
                  <ButtonLink to={pathOf('changePassword')} variant="secondary" size="md">
                    <Icon name="key" size={18} />
                    Đổi mật khẩu
                  </ButtonLink>
                </div>
              </div>

              {/* Thông tin bổ trợ trường lớp dạng tag */}
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <span className="rounded-md bg-surface-container-high px-2.5 py-1 font-bold text-on-surface border border-border">
                  Lớp {classroom.name}
                </span>
                <span className="rounded-md bg-surface-container-high px-2.5 py-1 font-bold text-on-surface border border-border">
                  Khối {classroom.grade}
                </span>
                {classroom.organization && (
                  <span className="rounded-md bg-surface-container px-2.5 py-1 font-medium text-on-surface-variant border border-border">
                    🏫 {classroom.organization.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dải Thành tích học tập thực tế */}
          <div className="p-5 bg-surface-container-low/60 border-b border-border/80">
            <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-muted mb-3 text-center sm:text-left">
              THÀNH TÍCH HỌC TẬP TÍCH LŨY
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to={pathOf('progress')}
                className="p-3 rounded-xl bg-surface border border-border hover:border-orange-400/60 shadow-2xs transition-all no-underline flex items-center gap-3 group"
                title="Xem ngày chăm chỉ"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-xl border border-orange-200 group-hover:scale-105 transition-transform" aria-hidden="true">
                  🔥
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant font-bold truncate">Chăm chỉ</p>
                  <p className="text-base font-black text-on-surface">{activeDays} ngày</p>
                </div>
              </Link>

              <Link
                to={`${pathOf('progress')}?tab=huy-hieu`}
                className="p-3 rounded-xl bg-surface border border-border hover:border-purple-400/60 shadow-2xs transition-all no-underline flex items-center gap-3 group"
                title="Xem bộ sưu tập huy hiệu"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-xl border border-purple-200 group-hover:scale-105 transition-transform" aria-hidden="true">
                  🏆
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant font-bold truncate">Huy hiệu</p>
                  <p className="text-base font-black text-on-surface">{home?.recentBadges?.length ?? 0}</p>
                </div>
              </Link>

              <Link
                to={pathOf('progress')}
                className="p-3 rounded-xl bg-surface border border-border hover:border-emerald-400/60 shadow-2xs transition-all no-underline flex items-center gap-3 group"
                title="Xem bài học đã kích hoạt"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-xl border border-emerald-200 group-hover:scale-105 transition-transform" aria-hidden="true">
                  📚
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant font-bold truncate">Bài đã mở</p>
                  <p className="text-base font-black text-on-surface">{myLessons.length}</p>
                </div>
              </Link>

              <Link
                to={pathOf('progress')}
                className="p-3 rounded-xl bg-surface border border-border hover:border-amber-400/60 shadow-2xs transition-all no-underline flex items-center gap-3 group"
                title="Xem điểm sao tích lũy"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-xl border border-amber-200 group-hover:scale-105 transition-transform" aria-hidden="true">
                  ⭐
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant font-bold truncate">Sao tích lũy</p>
                  <p className="text-base font-black text-on-surface">{home?.totalStars ?? 0}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Khối Thông tin lớp học */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/80">
            <span className="text-xl" aria-hidden="true">🏫</span>
            <h2 className="type-h3 text-on-surface font-black">Thông tin lớp học</h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {facts.map((fact) => (
              <div key={fact.label} className="p-3.5 rounded-xl bg-surface-container-low border border-border/70 flex flex-col justify-between">
                <dt className="type-label text-on-surface-muted text-xs font-semibold">{fact.label}</dt>
                <dd className="type-body-m font-bold text-on-surface mt-1">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Khối Tiến độ và kết quả học tập */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs">
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/40 text-2xl text-primary border border-primary/20" aria-hidden="true">
              📈
            </span>
            <div>
              <p className="type-body-m font-bold text-on-surface">Tiến độ và kết quả học tập</p>
              <p className="type-body-s text-on-surface-variant mt-0.5">
                Xem chi tiết các bài kiểm tra đã làm và huy hiệu đạt được
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <ButtonLink to={pathOf('progress')} variant="primary" size="md" className="w-full sm:w-auto justify-center">
              Xem tiến độ
            </ButtonLink>
          </div>
        </div>

        {/* Hàng nút hành động quay lại trang học */}
        <div className="flex justify-center mt-2">
          <ButtonLink to={pathOf('learnHome')} variant="secondary" size="md" className="px-6">
            🏠 Về trang học của em
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
