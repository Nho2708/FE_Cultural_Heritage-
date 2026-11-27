import { useEffect, useMemo } from 'react';
import { cn } from '../cn';
import { claimReading, readAlongLayout, releaseReading } from '../speech';
import { Button, Icon } from '../ui';
import { READ_ALOUD_LOCALE } from './readAloudPrefetch';
import { useSentenceReader } from './useSpeech';

// Nghe bài đọc của bố cục cấp 2 và cấp 3: nút nhỏ theo kiểu nút của bố cục (nút viền, cỡ vừa) đọc từng câu của một đoạn nội dung, câu đang đọc được tô sáng,
// bấm lại để dừng. Chỉ một đoạn đọc một lúc, rời trang thì dừng. Giọng của máy chủ như cấp 1 (cùng bộ nhớ đệm, lùi về giọng trình duyệt, lời báo khi thiếu giọng).

interface ReadAloudProps {
  /** Nội dung của đoạn (có thể có Markdown). */
  text: string | null | undefined;
  /** Chữ của nút khi chưa đọc, vd "Nghe bài đọc". */
  label: string;
  /** Lớp cho khối chứa các đoạn văn. */
  className?: string;
}

/** Các đoạn văn của một nội dung kèm nút nghe và tô sáng câu đang đọc. Nội dung rỗng thì không vẽ gì. */
export function ReadAloud({ text, label, className }: ReadAloudProps) {
  const layout = useMemo(() => readAlongLayout(text, READ_ALOUD_LOCALE), [text]);
  const reader = useSentenceReader(layout.sentences);
  const { play, stop } = reader;

  useEffect(() => () => releaseReading(stop), [stop]);

  if (layout.sentences.length === 0) return null;

  const toggle = () => {
    if (reader.speaking) {
      stop();
      return;
    }
    claimReading(stop);
    play();
  };

  return (
    <div className="flex flex-col gap-3">
      {reader.supported && (
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggle}
            aria-label={reader.speaking ? 'Dừng nghe' : label}
            aria-busy={reader.preparing || undefined}
          >
            <Icon
              name={reader.preparing ? 'refresh' : reader.speaking ? 'pause' : 'volume'}
              size={16}
              className={reader.preparing ? 'motion-safe:animate-spin' : undefined}
            />
            {reader.speaking ? 'Dừng nghe' : label}
          </Button>
          <span className="sr-only" aria-live="polite">
            {reader.preparing ? 'Đang chuẩn bị giọng đọc' : ''}
          </span>
        </div>
      )}
      <div className={className}>
        {layout.paragraphs.map((pieces, index) => (
          <p key={index}>
            {pieces.map((piece, position) => (
              <span key={position}>
                <span
                  className={cn(
                    'rounded-xs [box-decoration-break:clone] motion-safe:transition-colors',
                    reader.current === piece.sentence && 'bg-primary-container text-on-primary-container',
                  )}
                  aria-current={reader.current === piece.sentence ? 'true' : undefined}
                >
                  {piece.text}
                </span>
                {position < pieces.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
