import { cn } from '@dsvhvn/dung-chung';
import { Icon } from '@dsvhvn/dung-chung/ui';
import { useId, useState, type FormEvent } from 'react';
import { keywordError } from './filters';

interface KeywordSearchProps {
  /** Từ khóa đang áp dụng; đổi từ bên ngoài thì phần tử cha đổi `key` để ô nhập đồng bộ. */
  value: string;
  placeholder: string;
  onSearch: (keyword: string) => void;
  /** Lỗi từ bên ngoài (từ khóa trên địa chỉ trang sai độ dài). */
  externalError?: string | null;
  large?: boolean;
  className?: string;
}

/**
 * Ô từ khóa của khám phá. Chỉ gửi khi bấm "Tìm kiếm" hoặc Enter (không gọi API theo từng phím gõ). Từ khóa ngoài 2-100 ký
 * tự báo lỗi ngay dưới ô, cùng câu với máy chủ, và không chuyển trang.
 */
export function KeywordSearch({ value, placeholder, onSearch, externalError = null, large = false, className }: KeywordSearchProps) {
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = `${inputId}-loi`;
  const shownError = error ?? externalError;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = text.trim();
    const problem = keywordError(keyword);
    setError(problem);
    if (!problem) onSearch(keyword);
  };

  return (
    <search className={cn('block', className)}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-2">
        <div
          className={cn(
            'flex items-center gap-3 rounded-sm border-[1.5px] bg-surface pr-2 pl-4 has-[input:focus-visible]:shadow-[0_0_0_2px_var(--dsv-color-focus-ring-offset),0_0_0_4px_var(--dsv-color-focus-ring)]',
            large ? 'h-16 gap-4 pl-6' : 'h-14',
            shownError ? 'border-danger' : 'border-border',
          )}
        >
          <Icon name="search" size={large ? 24 : 20} className="shrink-0 text-on-surface-variant" />
          <label htmlFor={inputId} className="sr-only">
            Từ khóa
          </label>
          <input
            id={inputId}
            type="search"
            name="tu-khoa"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            placeholder={placeholder}
            autoComplete="off"
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? errorId : undefined}
            className={cn(
              'min-w-0 flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none focus-visible:shadow-none',
              large ? 'type-body-l' : 'type-body-m',
            )}
          />
          <button
            type="submit"
            className="h-11 shrink-0 rounded-sm bg-primary px-4 type-control text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-active dsvsm:px-6"
          >
            Tìm kiếm
          </button>
        </div>
        {shownError && (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 type-body-s text-danger">
            <Icon name="alert-triangle" size={16} className="mt-[3px] shrink-0" />
            <span>{shownError}</span>
          </p>
        )}
      </form>
    </search>
  );
}
