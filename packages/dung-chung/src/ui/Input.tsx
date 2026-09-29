import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icon } from './Icon';

// Ô nhập của biểu mẫu: nhãn LUÔN ở trên (không dùng nhãn nổi vì dấu tiếng Việt bị cắt),
// lỗi gắn aria-describedby, lấy đúng câu của danh mục thông báo và luôn kèm icon cảnh báo.
// Viền nghỉ 1px border-strong, focus 2px primary, lỗi 2px danger — lỗi thắng focus.

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="type-label text-on-surface-variant">
        {label}
      </label>
      {children({ inputId, describedBy, invalid: !!error })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 type-body-s text-danger">
          <Icon name="alert-triangle" size={16} className="mt-[3px] shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="type-label text-on-surface-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClasses = (invalid: boolean, extra?: string) =>
  cn(
    'h-11 w-full rounded-sm border bg-(--dsv-input-bg) px-3 type-body-m text-on-surface',
    'placeholder:text-(--dsv-input-placeholder-fg)',
    'transition-[border-color,box-shadow] duration-(--dsv-duration-fast) ease-fade',
    'disabled:bg-(--dsv-input-disabled-bg) disabled:text-on-surface-disabled [&:read-only:not(select)]:bg-surface-container-low',
    invalid
      ? 'border-(--dsv-input-border-error) shadow-[inset_0_0_0_1px_var(--dsv-input-border-error)] focus:shadow-[inset_0_0_0_1px_var(--dsv-input-border-error)]'
      : 'border-(--dsv-input-border) hover:border-(--dsv-input-border-hover) focus:border-(--dsv-input-border-focus) focus:shadow-[inset_0_0_0_1px_var(--dsv-input-border-focus)]',
    'focus:outline-none focus-visible:outline-none',
    extra,
  );

type InputProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  containerClassName?: string;
};

export function TextField({ label, hint, error, containerClassName, className, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <input
          id={inputId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={inputClasses(invalid, className)}
          {...rest}
        />
      )}
    </Field>
  );
}

/** Ô mật khẩu có nút Hiện/Ẩn để người dùng kiểm tra lại, thay cho ô nhập lại mật khẩu. */
export function PasswordField({ label, hint, error, containerClassName, className, ...rest }: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={inputId}
            type={visible ? 'text' : 'password'}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClasses(invalid, cn('pr-12', className))}
            autoCapitalize="none"
            spellCheck={false}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={inputId}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-sm text-on-surface-variant hover:text-on-surface"
          >
            <Icon name={visible ? 'eye-off' : 'eye'} size={20} />
          </button>
        </div>
      )}
    </Field>
  );
}

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
  containerClassName?: string;
};

export function SelectField({ label, hint, error, options, containerClassName, className, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={inputId}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={inputClasses(invalid, cn('appearance-none pr-10', className))}
            {...rest}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            size={20}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-on-surface-variant"
          />
        </div>
      )}
    </Field>
  );
}

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'id'> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  containerClassName?: string;
};

/** Ô nhập nhiều dòng (mô tả, nội dung): cùng khuôn nhãn, gợi ý và lỗi với ô một dòng. */
export function TextAreaField({ label, hint, error, containerClassName, className, rows = 4, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} error={error} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          id={inputId}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={inputClasses(invalid, cn('h-auto min-h-11 resize-y py-2.5 leading-6', className))}
          {...rest}
        />
      )}
    </Field>
  );
}

type CheckboxProps = Omit<ComponentProps<'input'>, 'id' | 'type'> & {
  label: string;
  hint?: ReactNode;
  containerClassName?: string;
};

/** Ô chọn có nhãn đứng cạnh; vùng bấm là cả dòng nhãn. */
export function CheckboxField({ label, hint, containerClassName, className, ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 type-body-m text-on-surface">
        <input id={id} type="checkbox" className={cn('size-5 shrink-0 accent-primary', className)} {...rest} />
        {label}
      </label>
      {hint && <p className="pl-8 type-label text-on-surface-muted">{hint}</p>}
    </div>
  );
}
