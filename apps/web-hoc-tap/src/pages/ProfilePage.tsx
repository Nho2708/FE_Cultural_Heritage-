import { cn } from '@dsvhvn/dung-chung';
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
// Cấp 2 và 3: Thẻ học sinh điện tử chuẩn mực.

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
  const facts = classFacts(classroom);

  const speechIntro = `Hồ sơ học sinh của ${name}. Mã học sinh là ${code}. Học sinh lớp ${classroom.name}, trường ${classroom.organization?.name ?? 'Trường học'}. Em đã đạt được ${home?.totalStars ?? 0} ngôi sao và chuỗi ${home?.streakDays ?? 1} ngày chăm chỉ.`;

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Hồ sơ của em · Vietnam Heritage</title>
      <div className="mx-auto w-full max-w-[960px] flex flex-col gap-6">

        {/* Thẻ Hộ Chiếu Di Sản Cấp 1 — tông Xanh Ngọc Di Sản mịn màng */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white shadow-lg border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative shrink-0">
                <div className="size-24 sm:size-28 rounded-full bg-white p-2.5 shadow-xl border-4 border-amber-300 flex items-center justify-center">
                  <Illustration state="chao" className="size-full text-white drop-shadow-md" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-amber-400 text-base shadow-md border-2 border-white" title="Thám hiểm nhí">
                  🎒
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <span className="rounded-full bg-white/20 backdrop-blur-xs px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-50 border border-white/20">
                    HỘ CHIẾU DI SẢN NHÍ
                  </span>
                  <span className="rounded-full bg-amber-400/90 text-amber-950 px-3 py-0.5 text-xs font-black uppercase">
                    LỚP {classroom.name}
                  </span>
                </div>
                <h1 className="type-h1 font-black text-white tracking-tight leading-tight">
                  {name}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="text-xs font-bold text-emerald-100">
                    Mã học sinh:
                  </span>
                  <span className="inline-block rounded-full bg-white px-4 py-1 font-mono font-black text-sm text-emerald-800 shadow-xs border-2 border-emerald-400">
                    {code}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center gap-2.5 shrink-0">
              <SpeakButton
                text={speechIntro}
                label="Nghe thông tin hồ sơ của em"
                size="md"
                className="dsv-speak-btn shadow-md"
              />
              <ButtonLink
                to={pathOf('learnHome')}
                className="duo-btn-green px-5 py-2.5 text-xs font-black no-underline"
              >
                Trang học ▶
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* 4 Thẻ chỉ số thành tích khích lệ (Gamification chuẩn Tiểu học) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <Link
            to={pathOf('progress')}
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-amber-50 border-2 border-amber-200 border-b-4 border-b-amber-400 transition-all hover:-translate-y-1 active:translate-y-0.5 no-underline cursor-pointer group shadow-xs"
          >
            <span className="text-3xl sm:text-4xl mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">⭐</span>
            <span className="text-xl sm:text-2xl font-black text-amber-800">
              {home?.totalStars ?? 0}
            </span>
            <span className="text-xs font-bold text-amber-950/70 uppercase tracking-wide mt-0.5">
              Sao tích lũy
            </span>
          </Link>

          <Link
            to={pathOf('progress')}
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-orange-50 border-2 border-orange-200 border-b-4 border-b-orange-400 transition-all hover:-translate-y-1 active:translate-y-0.5 no-underline cursor-pointer group shadow-xs"
          >
            <span className="text-3xl sm:text-4xl mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">🔥</span>
            <span className="text-xl sm:text-2xl font-black text-orange-600">
              {home?.streakDays ? `${home.streakDays} ngày` : '1 ngày'}
            </span>
            <span className="text-xs font-bold text-orange-950/70 uppercase tracking-wide mt-0.5">
              Chăm chỉ
            </span>
          </Link>

          <Link
            to={pathOf('learnHome')}
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-emerald-50 border-2 border-emerald-200 border-b-4 border-b-emerald-400 transition-all hover:-translate-y-1 active:translate-y-0.5 no-underline cursor-pointer group shadow-xs"
          >
            <span className="text-3xl sm:text-4xl mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">📖</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800">
              {home?.myLessons?.length ?? 0}
            </span>
            <span className="text-xs font-bold text-emerald-950/70 uppercase tracking-wide mt-0.5">
              Bài đã mở
            </span>
          </Link>

          <Link
            to={`${pathOf('progress')}?tab=huy-hieu`}
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-purple-50 border-2 border-purple-200 border-b-4 border-b-purple-400 transition-all hover:-translate-y-1 active:translate-y-0.5 no-underline cursor-pointer group shadow-xs"
          >
            <span className="text-3xl sm:text-4xl mb-1 group-hover:scale-110 transition-transform" aria-hidden="true">🏆</span>
            <span className="text-xl sm:text-2xl font-black text-purple-700">
              {home?.recentBadges?.length ?? 0}
            </span>
            <span className="text-xs font-bold text-purple-950/70 uppercase tracking-wide mt-0.5">
              Huy hiệu
            </span>
          </Link>
        </div>

        {/* Chi tiết Hộ Chiếu & Trường Lớp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Cột trái: Thông tin Trường & Lớp của em */}
          <section aria-labelledby="thong-tin-truong-lop" className="duo-card p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">🏫</span>
                <h2 id="thong-tin-truong-lop" className="type-h3 font-black text-emerald-950">
                  Trường & Lớp của em
                </h2>
              </div>
              <SpeakButton
                text={`Em học lớp ${classroom.name}, khối ${classroom.grade}. Trường ${classroom.organization?.name ?? 'Trường học'}. Thầy cô phụ trách là ${classroom.teacherName ?? 'đang cập nhật'}.`}
                label="Nghe thông tin trường lớp"
                size="sm"
                className="dsv-speak-btn"
              />
            </div>

            <dl className="flex flex-col gap-3">
              {facts.map((fact) => {
                const isClass = fact.label === 'Lớp';
                const isTeacher = fact.label === 'Giáo viên';
                const isSchool = fact.label === 'Trường';
                const icon = isClass ? '📚' : isTeacher ? '👩‍🏫' : isSchool ? '🏫' : '🗓️';
                const cardClass = isClass
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                  : isTeacher
                    ? 'border-rose-200 bg-rose-50/70 text-rose-950'
                    : isSchool
                      ? 'border-sky-200 bg-sky-50/70 text-sky-950'
                      : 'border-amber-200 bg-amber-50/70 text-amber-950';

                return (
                  <div key={fact.label} className={cn('rounded-2xl border-2 p-3.5 flex items-center justify-between', cardClass)}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl" aria-hidden="true">{icon}</span>
                      <dt className="text-xs font-black uppercase tracking-wider opacity-80">{fact.label}</dt>
                    </div>
                    <dd className="text-sm font-black line-clamp-1">{fact.value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {/* Cột phải: Tủ Huy Hiệu & Thao tác tài khoản */}
          <div className="flex flex-col gap-6">
            
            {/* Tủ Huy Hiệu Di Sản */}
            <section aria-labelledby="tu-huy-hieu" className="duo-card p-6">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" aria-hidden="true">🏆</span>
                  <h2 id="tu-huy-hieu" className="type-h3 font-black text-emerald-950">
                    Bộ sưu tập Huy hiệu
                  </h2>
                </div>
                <Link
                  to={`${pathOf('progress')}?tab=huy-hieu`}
                  className="text-xs font-black text-emerald-700 hover:underline"
                >
                  Xem tất cả ▶
                </Link>
              </div>

              {home?.recentBadges && home.recentBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {home.recentBadges.slice(0, 4).map((badge) => (
                    <div
                      key={`${badge.code}-${badge.attemptId}`}
                      className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-3 flex flex-col items-center text-center gap-1.5"
                    >
                      <span className="text-3xl" aria-hidden="true">🎖️</span>
                      <p className="text-xs font-black text-purple-950 line-clamp-1">{badge.name}</p>
                      <span className="text-[10px] font-bold text-purple-700/80 line-clamp-1">
                        {badge.quizName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 gap-2">
                  <span className="text-3xl" aria-hidden="true">🌟</span>
                  <p className="text-xs font-bold text-emerald-950">
                    Em hãy vượt qua các bài kiểm tra đố vui để mở khóa những chiếc huy hiệu di sản đầu tiên nhé!
                  </p>
                  <ButtonLink
                    to={pathOf('learnHome')}
                    size="sm"
                    className="duo-btn-green mt-1 text-xs py-2 px-4 no-underline"
                  >
                    Khám phá bài học ngay
                  </ButtonLink>
                </div>
              )}
            </section>

            {/* Thao tác tài khoản */}
            <div className="duo-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="type-h4 font-black text-emerald-950 mb-0.5">
                  Bảo mật tài khoản
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Đổi mật khẩu định kỳ để bảo vệ tài khoản học tập của em.
                </p>
              </div>
              <ButtonLink
                to={pathOf('changePassword')}
                className="duo-btn-yellow shrink-0 py-3 px-5 text-xs font-black no-underline flex items-center gap-1.5"
              >
                <Icon name="key" size={16} />
                Đổi mật khẩu
              </ButtonLink>
            </div>

          </div>

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
  const code = studentCodeOf(user);
  const facts = classFacts(classroom);

  return (
    <section className="dsv-content dsv-section">
      <title>Hồ sơ học sinh · Vietnam Heritage</title>
      <div className="mx-auto w-full max-w-[800px] flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="type-h1 text-on-surface">{user.fullName ?? 'Học sinh'}</h1>
            <p className="type-mono-label text-on-surface-variant mt-1">Mã học sinh: {code}</p>
          </div>
          <ButtonLink to={pathOf('changePassword')} variant="secondary" size="md">
            <Icon name="key" size={18} />
            Đổi mật khẩu
          </ButtonLink>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="type-h3 text-on-surface mb-4">Thông tin lớp học</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {facts.map((fact) => (
              <div key={fact.label} className="p-3 rounded-md bg-surface-container-low border border-border">
                <dt className="type-label text-on-surface-muted">{fact.label}</dt>
                <dd className="type-body-m font-bold text-on-surface mt-1">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex justify-between items-center p-4 rounded-lg border border-border bg-surface">
          <div>
            <p className="type-body-m font-bold text-on-surface">Tiến độ và kết quả học tập</p>
            <p className="type-body-s text-on-surface-variant">Xem chi tiết các bài kiểm tra đã làm và huy hiệu đạt được</p>
          </div>
          <ButtonLink to={pathOf('progress')} variant="primary" size="md">
            Xem tiến độ
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
        <title>Hồ sơ của em · Vietnam Heritage</title>
        <LoadingState rows={3} />
      </section>
    );
  }

  if (classroom.isError) {
    return (
      <section className="dsv-content dsv-section">
        <title>Hồ sơ của em · Vietnam Heritage</title>
        <ErrorState error={classroom.error} onRetry={() => void classroom.refetch()} />
      </section>
    );
  }

  if (classroom.data.schoolLevel === 1) {
    return <ProfileLevelOne user={user} classroom={classroom.data} />;
  }

  return <ProfileLevelGeneral user={user} classroom={classroom.data} />;
}
