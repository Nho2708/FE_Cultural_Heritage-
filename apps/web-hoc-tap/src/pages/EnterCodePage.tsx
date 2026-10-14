import { isWellFormedLessonCode, normalizeLessonCode } from '@dsvhvn/dung-chung';
import { ApiError, errorMessage } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, TextField } from '@dsvhvn/dung-chung/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { formatDate } from '@dsvhvn/dung-chung';
import { useAuth } from '../lib/auth/context';
import { lessonPath, lessonQueryFn, lessonQueryKey } from '../lessons/lessonData';
import { readRecentLessons } from '../lessons/recent';

// Nhập mã bài học: em gõ tay mã thầy cô đưa cho lớp (không quét mã QR). Mã tự viết hoa, bỏ khoảng trắng và dấu gạch ("bh 7f3-k2q" vẫn
// đúng). Mã sai dạng báo ngay, không gọi máy chủ. Mã đúng dạng thì máy chủ kiểm: mã sai, bài chưa xuất bản hoặc không thuộc lớp của em
// đều nhận cùng một câu (không cho biết mã có ở lớp khác hay không) và tính vào giới hạn nhập sai; nhập sai quá nhiều lần thì bị chặn
// một lúc, mã đúng cũng chưa mở được. Dưới ô nhập là các mã em đã mở gần đây trên máy này.

export function EnterCodePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const recent = useMemo(() => (user ? readRecentLessons(user.id) : []), [user]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBlocked(false);
    const code = normalizeLessonCode(text);
    if (code === '') return setError('Vui lòng nhập mã bài học.');
    if (!isWellFormedLessonCode(code)) {
      return setError('Mã bài học gồm 8 ký tự, bắt đầu bằng BH. Em hãy kiểm tra lại mã thầy cô đã đưa.');
    }
    setError(null);
    setBusy(true);
    try {
      await queryClient.fetchQuery({ queryKey: lessonQueryKey(code), queryFn: lessonQueryFn(code), staleTime: 30_000 });
      void navigate(lessonPath(code));
    } catch (err) {
      setBlocked(err instanceof ApiError && err.status === 429);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dsv-content dsv-section" data-bo-man-hinh="nhap-ma">
      <title>Nhập mã bài học · Vietnam Heritage</title>
      <div className="mx-auto flex max-w-[560px] flex-col gap-(--dsv-block-gap)">
        <header>
          <h1 className="type-h1 text-on-surface">Nhập mã bài học</h1>
          <p className="mt-2 type-body-m text-on-surface-variant">
            Thầy cô đưa mã bài học cho lớp em. Em gõ mã vào ô dưới đây để mở bài học và các bài kiểm tra của bài.
          </p>
        </header>

        <form noValidate onSubmit={submit} className="rounded-lg border border-border bg-surface p-(--dsv-inline-gap)">
          <p className="type-label text-on-surface">Mã bài học</p>
          <p className="mt-1 type-body-s text-on-surface-variant">Mã gồm 8 ký tự, bắt đầu bằng BH.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            <TextField
              label="Mã bài học"
              name="maBaiHoc"
              value={text}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={16}
              placeholder="BH7F3K2Q"
              onChange={(e) => setText(e.target.value.toLocaleUpperCase('en-US'))}
              error={error}
              className="font-mono tracking-[0.2em] uppercase"
              containerClassName="min-w-0 flex-1 [&>label]:sr-only"
            />
            <Button type="submit" size="lg" loading={busy} disabled={blocked} className="sm:mt-0">
              Mở bài học
            </Button>
          </div>
          {!error && (
            <p className="mt-3 flex items-start gap-2 type-body-s text-on-surface-variant">
              <Icon name="info" size={16} className="mt-0.5 shrink-0" />
              Mã tự viết hoa và bỏ khoảng trắng khi em gõ. Mã bài học chỉ mở được bài của lớp em.
            </p>
          )}
          {blocked && (
            <InlineMessage tone="warning" className="mt-3">
              Em chưa nhập mã được lúc này. Em hãy đợi một lúc rồi thử lại.
            </InlineMessage>
          )}
        </form>

        {recent.length > 0 && (
          <section aria-labelledby="ma-gan-day">
            <h2 id="ma-gan-day" className="type-label-kicker text-on-surface-muted">
              MÃ EM ĐÃ NHẬP GẦN ĐÂY TRÊN MÁY NÀY
            </h2>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
              {recent.map((item) => (
                <li key={item.code}>
                  <Link to={lessonPath(item.code)} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low">
                    <span className="type-mono-label text-primary" translate="no">
                      {item.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block type-label text-on-surface">{item.title}</span>
                      <span className="block type-body-s text-on-surface-variant">Mở lần cuối {formatDate(item.openedAt)}</span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}
