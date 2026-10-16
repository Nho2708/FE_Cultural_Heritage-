import { cn } from '@dsvhvn/dung-chung';
import { studentCodeOf, type StudentClassDetail, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { Illustration, SpeakButton } from '@dsvhvn/dung-chung/lesson';
import { classFacts } from './classroom';
import { LearningSections } from './LearningSections';

// Trang học của em — bản cấp 1 (khối 1-5): một cột, nút to, ít chữ, nhiều hình, nút loa đọc to. Chỉ có khối chào, thẻ lớp
// của em, nút "Nhập mã bài học" và các khối bài chơi đang chờ, bài học của em, huy hiệu gần đây (LearningSections). Không có
// bảng, biểu đồ hay điểm số.

export function LevelOne({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const name = user.fullName ?? 'em';
  const greeting = `Chào ${name}! Hôm nay mình cùng khám phá nhé!`;
  const facts = classFacts(classroom).filter((f) => ['Lớp', 'Giáo viên', 'Trường'].includes(f.label));

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Trang học của em · Vietnam Heritage</title>
      <div className="mx-auto flex max-w-[860px] flex-col gap-(--dsv-block-gap)">
        {/* Banner lời chào sinh động */}
        <div className="dsv-hero-banner relative flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-6 sm:p-8 overflow-hidden">
          <div className="dsv-mascot-avatar relative flex size-24 sm:size-28 shrink-0 items-center justify-center p-2">
            <Illustration state="chao" className="size-full bg-transparent text-primary" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1 font-black text-xs uppercase tracking-wider text-amber-950 shadow-2xs mb-2 border border-amber-300">
              ⭐ Nhà thám hiểm nhí
            </span>
            <h1 className="type-h1 font-black text-blue-950 tracking-tight leading-tight">{greeting}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold text-blue-900 border-2 border-blue-200 shadow-2xs">
                🎒 Lớp {classroom.name}
              </span>
              {classroom.teacherName && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold text-amber-950 border-2 border-amber-200 shadow-2xs">
                  👩‍🏫 Thầy cô: {classroom.teacherName}
                </span>
              )}
            </div>
          </div>
          <SpeakButton
            text={greeting}
            label="Nghe lời chào"
            size="md"
            className="dsv-speak-btn shrink-0"
          />
        </div>

        {/* Khối nhiệm vụ: Nhập mã bài học */}
        <div className="dsv-mission-card relative overflow-hidden p-6 sm:p-7 text-white group">
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-amber-300 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <Icon name="key" size={30} />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-amber-300">
                  ✨ Mở khóa bài học
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">Em đã có mã bài học chưa?</h2>
                <p className="mt-0.5 text-sm sm:text-base text-blue-100 font-medium">
                  Nhập mã thầy cô đưa để vào học bài và thử sức làm bài kiểm tra ngay nhé!
                </p>
              </div>
            </div>
            <ButtonLink
              to={pathOf('enterCode')}
              size="lg"
              className="dsv-mission-btn shrink-0 px-7 py-3.5 flex items-center justify-center gap-2"
            >
              <Icon name="key" size={20} />
              Nhập mã bài học
            </ButtonLink>
          </div>
        </div>

        {/* Thẻ học sinh: Lớp của em */}
        <section aria-labelledby="lop-cua-em" className="dsv-school-card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-amber-200/60">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-200/80 text-amber-900 text-xl shadow-xs" aria-hidden="true">
                🎒
              </span>
              <h2 id="lop-cua-em" className="type-h2 font-black text-on-surface">
                Lớp của em
              </h2>
            </div>
            <SpeakButton
              text={`Em học lớp ${classroom.name}. ${classroom.teacherName ? `Thầy cô phụ trách là ${classroom.teacherName}.` : ''}`}
              label="Nghe thông tin lớp của em"
              size="sm"
              className="dsv-speak-btn"
            />
          </div>

          <dl className="mt-5 grid gap-3.5 sm:grid-cols-3">
            {facts.map((fact) => {
              const isClass = fact.label === 'Lớp';
              const isTeacher = fact.label === 'Giáo viên';
              const icon = isClass ? '📚' : isTeacher ? '👩‍🏫' : '🏫';
              const cardClass = isClass
                ? 'dsv-info-badge-class text-sky-950'
                : isTeacher
                  ? 'dsv-info-badge-teacher text-rose-950'
                  : 'dsv-info-badge-school text-amber-950';

              return (
                <div key={fact.label} className={cn('p-4 transition-transform hover:-translate-y-0.5', cardClass)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{icon}</span>
                    <dt className="type-label font-black uppercase tracking-wider opacity-80">{fact.label}</dt>
                  </div>
                  <dd className="mt-2 type-h3 font-black text-on-surface line-clamp-2">{fact.value}</dd>
                </div>
              );
            })}
          </dl>

          <div className="dsv-code-badge mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" aria-hidden="true">🎫</span>
              <span className="type-body-m font-black text-blue-950">Mã học sinh của em:</span>
              <span className="dsv-code-pill px-4 py-1.5 font-mono font-black text-base">
                {studentCodeOf(user)}
              </span>
            </div>
            <span className="text-xs text-amber-950 font-bold">
              💡 Dùng mã này để đăng nhập vào trang học nha!
            </span>
          </div>
        </section>

        <LearningSections level={1} />
      </div>
    </section>
  );
}
