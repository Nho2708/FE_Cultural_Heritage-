import { Icon, PillLink, type IconName } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { pathOf, type ScreenKey } from '../access/screens';
import { useAuth } from '../lib/auth/context';
import { Illustration } from '../theme/Illustration';

// Trang chủ khám phá di sản (bản khung). Trang tĩnh: lời giới thiệu, lối vào tìm kiếm, bản đồ, dòng thời gian; nút lớn
// "Học sinh đăng nhập" khi chưa đăng nhập hoặc "Vào trang học của em" khi đã đăng nhập. Không có ô nhập mã: mã bài học
// chỉ nhập sau khi đăng nhập. Khối di sản nổi bật, khám phá theo loại và vùng, giới thiệu app mobile làm cùng chức năng
// khám phá di sản. Học sinh đã đăng nhập thấy trang này theo bộ giao diện của cấp học của em.

const ENTRIES: ReadonlyArray<{ screen: ScreenKey; title: string; text: string; icon: IconName }> = [
  { screen: 'search', title: 'Tìm kiếm di sản', text: 'Tìm theo tên, tỉnh, loại di sản và cấp xếp hạng.', icon: 'search' },
  { screen: 'map', title: 'Bản đồ di sản', text: 'Xem vị trí các di sản trên bản đồ Việt Nam.', icon: 'map-pin' },
  { screen: 'timeline', title: 'Dòng thời gian', text: 'Đi qua các giai đoạn và sự kiện của từng di sản.', icon: 'clock' },
];

export function HomePage() {
  const { user } = useAuth();
  return (
    <>
      <title>Học di sản · DSVHVN</title>
      <section className="dsv-content dsv-section">
        <div className="flex flex-col items-start gap-(--dsv-block-gap) dsvmd:flex-row dsvmd:items-center">
          <Illustration state="chao" />
          <div className="max-w-[760px]">
            <p className="type-label-kicker text-on-surface-muted">DI SẢN VĂN HÓA VIỆT NAM</p>
            <h1 className="mt-2 type-h1 text-on-surface">Khám phá di sản, học cùng lớp của em</h1>
            <p className="mt-3 type-body-m text-on-surface-variant">
              Tìm hiểu các di sản văn hóa Việt Nam qua bản đồ và dòng thời gian. Học sinh đăng nhập bằng mã học sinh để học bài
              và làm bài kiểm tra thầy cô giao cho lớp.
            </p>
            <div className="mt-6">
              {user ? (
                <PillLink to={pathOf('learnHome')}>Vào trang học của em</PillLink>
              ) : (
                <PillLink to={pathOf('login')}>Học sinh đăng nhập</PillLink>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="loi-vao" className="dsv-content pb-16">
        <h2 id="loi-vao" className="type-h2 text-on-surface">
          Bắt đầu khám phá
        </h2>
        <ul className="mt-6 grid gap-(--dsv-inline-gap) dsvmd:grid-cols-3">
          {ENTRIES.map((entry) => (
            <li key={entry.screen}>
              <Link
                to={pathOf(entry.screen)}
                className="flex h-full flex-col gap-2 rounded-md border border-border bg-surface p-(--dsv-inline-gap) transition-colors hover:bg-surface-container-low"
              >
                <Icon name={entry.icon} size={24} className="text-primary" />
                <span className="type-h4 text-on-surface">{entry.title}</span>
                <span className="type-body-m text-on-surface-variant">{entry.text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 type-body-s text-on-surface-muted">Nội dung di sản tham khảo từ Cục Di sản văn hóa.</p>
      </section>
    </>
  );
}
