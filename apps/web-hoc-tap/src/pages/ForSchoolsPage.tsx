import { Icon, type IconName } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { ADMIN_WEB_URL } from '../config/env';
import { useI18n } from '../i18n/context';
import { HeroAnchor, HeroLink, IntroHero, RevealList, SectionTitle } from '../intro/IntroParts';
import { IntroVideo } from '../intro/IntroVideo';
import { revealItem } from '../intro/reveal';

// Trang Dành cho nhà trường (công khai, chỉ tiếng Việt): cho ban giám hiệu, quản trị trường và giáo viên của trường chưa
// dùng Vietnam Heritage. Bốn bước làm việc của giáo viên hiện lần lượt khi cuộn tới, ba cấp học, gói dịch vụ (bắt đầu với gói
// Miễn phí, không ghi giá), lối đăng nhập web quản trị cho người đã có tài khoản và cách để trường có tài khoản (quản trị
// hệ thống tạo theo đề nghị của trường; trang không đăng email hay số điện thoại cá nhân). Khách đang chọn ngôn ngữ khác
// tiếng Việt thấy một dòng ghi chú bằng ngôn ngữ của mình.

interface Step {
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    title: 'Quản trị trường tạo tài khoản giáo viên',
    text: 'Quản trị trường thêm giáo viên trong web quản trị; mỗi thầy cô nhận email để tự đặt mật khẩu.',
  },
  {
    title: 'Giáo viên tạo lớp và tài khoản học sinh',
    text: 'Thêm học sinh vào lớp là có ngay tài khoản: mã học sinh và mật khẩu tạm, in phiếu đăng nhập phát cho cả lớp.',
  },
  {
    title: 'Soạn bài học và bài kiểm tra',
    text: 'Chọn di sản trong kho dữ liệu, bấm "Nhờ AI soạn" để có bản nháp đúng cấp của lớp; thầy cô đọc lại, sửa và quyết định xuất bản. Bài kiểm tra ghép từ ngân hàng câu hỏi 8 dạng; câu do AI sinh phải được duyệt mới dùng.',
  },
  {
    title: 'Học sinh học, thầy cô xem kết quả',
    text: 'Xuất bản xong, bài học có một mã. Học sinh nhập mã để học theo cấp 1, 2, 3 trên web hoặc app điện thoại; thầy cô xem kết quả bài kiểm tra của lớp, tiến độ, mức thành thạo và gợi ý nội dung cần ôn.',
  },
];

interface Level {
  icon: IconName;
  name: string;
  grades: string;
  text: string;
}

const LEVELS: Level[] = [
  {
    icon: 'star',
    name: 'Cấp 1',
    grades: 'Tiểu học, khối 1–5',
    text: 'Bài học kể chuyện từng bước với hình lớn, chữ to, nút lớn và đọc to; đi lần lượt Nghe chuyện, Xem hình, Chơi, Nhận sao.',
  },
  {
    icon: 'book-open',
    name: 'Cấp 2',
    grades: 'Trung học cơ sở, khối 6–9',
    text: 'Bài đọc có ảnh lớn, ý chính đóng khung, dòng thời gian của bài và bài kiểm tra trong cùng một trang.',
  },
  {
    icon: 'file-text',
    name: 'Cấp 3',
    grades: 'Trung học phổ thông, khối 10–12',
    text: 'Trang tài liệu có mục lục, đoạn trích tư liệu gốc kèm nguồn và câu hỏi gợi suy nghĩ.',
  },
];

function VietnameseOnlyNote() {
  const { language, t } = useI18n();
  if (language === 'vi') return null;
  return (
    <div className="bg-surface-container-low">
      <p role="note" lang={language} className="dsv-content flex items-start gap-2 py-3 type-body-s text-on-surface-variant">
        <Icon name="languages" size={16} className="mt-[3px] shrink-0" />
        <span>{t.schoolsNote.onlyVietnamese}</span>
      </p>
    </div>
  );
}

export function ForSchoolsPage() {
  const { language } = useI18n();
  return (
    <>
      <title>Dành cho nhà trường · Vietnam Heritage</title>
      <meta
        name="description"
        content="Vietnam Heritage cho nhà trường: giáo viên soạn bài học và bài kiểm tra về di sản Việt Nam, học sinh học theo cấp 1, 2, 3, thầy cô xem kết quả của lớp."
      />
      <VietnameseOnlyNote />
      <div lang="vi">
        <IntroHero
          headingId="nha-truong-tieu-de"
          kicker="DÀNH CHO NHÀ TRƯỜNG"
          title="Dạy di sản Việt Nam, soạn nhanh, học theo cấp"
          text="Giáo viên soạn bài học và bài kiểm tra về di sản từ kho dữ liệu dựa trên nguồn của Cục Di sản văn hóa. Học sinh có tài khoản riêng, học theo cấp 1, 2, 3 và không thấy quảng cáo."
          actions={
            <>
              <HeroAnchor href={ADMIN_WEB_URL}>
                <Icon name="log-in" size={20} />
                Đăng nhập web quản trị
              </HeroAnchor>
              <HeroAnchor href="#bat-dau" secondary>
                Cách để trường bắt đầu
              </HeroAnchor>
            </>
          }
        />

        <section aria-labelledby="nha-truong-cac-buoc" className="bg-background py-12 dsvmd:py-16">
          <div className="dsv-content flex flex-col gap-8">
            <SectionTitle
              id="nha-truong-cac-buoc"
              title="Bốn bước làm việc của giáo viên"
              text="Mọi việc làm trên web quản trị; học sinh học trên web học tập hoặc app điện thoại."
            />
            <RevealList as="ol" className="flex max-w-[860px] flex-col gap-8">
              {STEPS.map((step, index) => (
                <li key={step.title} {...revealItem(index)} className="relative flex gap-4 dsvmd:gap-6">
                  {index < STEPS.length - 1 && (
                    <span aria-hidden="true" data-reveal-line="" className="absolute top-12 -bottom-8 left-[23px] w-[2px] bg-(--color-brand-gold)" />
                  )}
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--color-brand-navy) type-h3 text-(--color-brand-cream)"
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1 pt-2.5">
                    <h3 className="type-h3 text-on-background">
                      <span className="sr-only">Bước {index + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="type-body-m text-on-surface-variant">{step.text}</p>
                  </div>
                </li>
              ))}
            </RevealList>
          </div>
        </section>

        <section aria-labelledby="nha-truong-ba-cap" className="bg-surface-container-low py-12 dsvmd:py-16">
          <div className="dsv-content flex flex-col gap-8">
            <SectionTitle
              id="nha-truong-ba-cap"
              title="Ba cấp học, ba cách học"
              text="Cùng một di sản, học sinh mỗi cấp học theo cách riêng: bố cục, dạng câu hỏi và cách xem kết quả đều khác nhau."
            />
            <RevealList className="grid gap-6 dsvlg:grid-cols-3">
              {LEVELS.map((level, index) => (
                <li key={level.name} {...revealItem(index)} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
                  <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <Icon name={level.icon} size={24} />
                  </span>
                  <h3 className="type-h3 text-on-surface">
                    {level.name} <span className="type-body-s text-on-surface-variant">· {level.grades}</span>
                  </h3>
                  <p className="type-body-m text-on-surface-variant">{level.text}</p>
                </li>
              ))}
            </RevealList>
          </div>
        </section>

        <IntroVideo
          name="nha-truong-90s"
          edition="vi"
          captions={['vi', 'en']}
          defaultCaption={language === 'vi' ? null : 'en'}
          title="Video giới thiệu cho nhà trường"
          label="Video giới thiệu Vietnam Heritage cho nhà trường"
          noSupport="Trình duyệt này không phát được video."
          headingId="nha-truong-video"
        />

        <section aria-labelledby="bat-dau" className="bg-background py-12 dsvmd:py-16">
          <div className="dsv-content grid gap-6 dsvmd:grid-cols-2">
            <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6 dsvmd:p-10">
              <Icon name="shield-check" size={28} className="text-primary" />
              <h2 id="bat-dau" className="type-h2 text-on-surface">
                Cách để trường bắt đầu
              </h2>
              <p className="type-body-m text-on-surface-variant">
                Tài khoản của trường do quản trị hệ thống Vietnam Heritage tạo theo đề nghị của nhà trường. Người phụ trách được tạo tài khoản quản trị
                trường nhận email để đặt mật khẩu, rồi đăng nhập web quản trị để thêm giáo viên.
              </p>
              <p className="type-body-m text-on-surface-variant">
                Trường mới bắt đầu với gói Miễn phí. Khi cần thêm giáo viên hoặc thêm lượt AI soạn, quản trị trường chọn gói phù hợp và thanh toán
                ngay trong web quản trị.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 rounded-md bg-(--color-brand-navy) p-6 text-(--color-brand-cream) dsvmd:p-10">
              <Icon name="log-in" size={28} className="text-(--color-brand-gold)" />
              <h2 className="type-h2 text-white">Đã có tài khoản?</h2>
              <p className="type-body-m">Giáo viên, quản trị trường và quản trị hệ thống đăng nhập ở web quản trị.</p>
              <HeroAnchor href={ADMIN_WEB_URL} className="mt-auto">
                Đăng nhập web quản trị
              </HeroAnchor>
              <HeroLink to={pathOf('about')} secondary>
                Xem giới thiệu cho khách tham quan
              </HeroLink>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
