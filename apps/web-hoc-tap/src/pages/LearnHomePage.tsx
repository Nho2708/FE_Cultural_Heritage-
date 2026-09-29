import { MESSAGES } from '@dsvhvn/dung-chung';
import { studentCodeOf } from '@dsvhvn/dung-chung/api';
import { SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';
import { ButtonLink, InlineMessage } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { useAuth } from '../lib/auth/context';
import { useLearningTheme } from '../theme/context';
import { Illustration } from '../theme/Illustration';

// Trang học của em (bản khung): trang đầu sau khi đăng nhập. Đầu trang có họ tên, mã học sinh, lớp, khối, cấp học,
// giáo viên, trường; hình chào lấy từ bộ hình của bộ giao diện theo cấp. Các khối bài kiểm tra đang chờ, bài học của em,
// gợi ý và huy hiệu làm cùng chức năng học tập; tới lúc đó trang hiện lời nhắc nhập mã bài học.

export function LearnHomePage() {
  const { user } = useAuth();
  const theme = useLearningTheme();
  if (!user) return null; // route guard đã chặn Khách

  const facts: Array<[string, string | null | undefined]> = [
    ['Mã học sinh', studentCodeOf(user)],
    ['Lớp', user.class?.name],
    ['Khối', user.class ? String(user.class.grade) : null],
    ['Cấp học', theme.level ? SCHOOL_LEVEL_LABEL[theme.level] : null],
    ['Giáo viên', user.teacherName],
    ['Trường', user.organization?.name],
  ];

  return (
    <section className="dsv-content dsv-section">
      <title>Trang học của em · Học di sản</title>
      <div className="flex flex-col gap-(--dsv-block-gap)">
        <div className="flex flex-col items-start gap-(--dsv-inline-gap) dsvsm:flex-row dsvsm:items-center">
          <Illustration state="chao" />
          <div>
            <p className="type-label-kicker text-on-surface-muted">TRANG HỌC CỦA EM</p>
            <h1 className="mt-1 type-h1 text-on-surface">Chào {user.fullName ?? 'em'}</h1>
          </div>
        </div>

        <dl className="grid max-w-[640px] grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-md bg-surface-container-low p-(--dsv-inline-gap) type-body-m">
          {facts
            .filter((fact): fact is [string, string] => Boolean(fact[1]))
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-on-surface-variant">{label}</dt>
                <dd className="text-on-surface">{value}</dd>
              </div>
            ))}
        </dl>

        <InlineMessage tone="info" className="max-w-[640px]">
          {MESSAGES.studentNoAttemptsYet}
        </InlineMessage>
        <div>
          <ButtonLink to={pathOf('enterCode')} size="lg">
            Nhập mã bài học
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
