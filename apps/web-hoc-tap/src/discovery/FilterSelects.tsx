import { cn } from '@dsvhvn/dung-chung';
import type { DiscoveryFilter, FilterCatalog, HeritagePeriod, HeritageType, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import { Icon } from '@dsvhvn/dung-chung/ui';
import { useI18n, useT } from '../i18n/context';
import { periodRangeText } from '../i18n/format';
import { HERITAGE_TYPE_NAME, PERIOD_NAME, provinceName, RECOGNITION_LEVEL_NAME, REGION_NAME, type RegionValue } from '../i18n/taxonomy';
import { hasActiveFilter } from './filters';

// Các ô lọc dùng chung cho trang tìm kiếm và bản đồ: tỉnh, vùng, loại, cấp xếp hạng, thời kỳ. Mỗi ô là <select> thật
// (bàn phím, gõ chữ đầu để nhảy tới mục, trình đọc màn hình đọc đúng) phủ trong suốt lên khung hiển thị theo thiết kế
// "Nhãn: giá trị đang chọn".

interface Option {
  value: string;
  label: string;
  /** Chữ trong danh sách chọn, dài hơn nhãn hiển thị trên ô (ví dụ kèm khoảng năm). */
  menuLabel?: string;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const selected = options.find((option) => option.value === value);
  const active = value !== '';
  return (
    <div
      className={cn(
        'relative min-w-0 rounded-sm has-[select:focus-visible]:shadow-[0_0_0_2px_var(--dsv-color-focus-ring-offset),0_0_0_4px_var(--dsv-color-focus-ring)]',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'flex h-11 items-center gap-2 rounded-sm border bg-(--dsv-input-bg) pr-2 pl-3 type-body-s text-on-surface',
          active ? 'border-primary' : 'border-(--dsv-input-border)',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {label}: {selected?.label ?? ''}
        </span>
        <Icon name="chevron-down" size={20} className="shrink-0" />
      </div>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0 focus-visible:shadow-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.menuLabel ?? option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterSelectsProps {
  catalog: FilterCatalog | undefined;
  filter: DiscoveryFilter;
  onChange: (next: DiscoveryFilter) => void;
  className?: string;
  /** Độ rộng của từng ô; mặc định co giãn theo lưới cha. */
  itemClassName?: string;
}

function isRegion(value: string): value is RegionValue {
  return value === 'Bắc' || value === 'Trung' || value === 'Nam';
}

export function FilterSelects({ catalog, filter, onChange, className, itemClassName }: FilterSelectsProps) {
  const { language, t } = useI18n();
  // Danh mục bộ lọc của máy chủ chỉ có tên tiếng Việt: giá trị (enum, mã vùng, mã thời kỳ) giữ nguyên để lọc, nhãn lấy từ tệp chuỗi.
  const ALL: Option = { value: '', label: t.filters.all };
  const named = <T extends string>(table: Record<T, string>, options: ReadonlyArray<{ value: string; label: string }> | undefined): Option[] =>
    (options ?? []).map((option) => ({ value: option.value, label: table[option.value as T] ?? option.label }));
  const provinces: Option[] = [ALL, ...(catalog?.provinces ?? []).map((p) => ({ value: String(p.id), label: provinceName(p.name, language) ?? '' }))];
  const regions: Option[] = [
    ALL,
    ...(catalog?.regions ?? []).map((option) => ({ value: option.value, label: isRegion(option.value) ? REGION_NAME[language][option.value] : option.label })),
  ];
  const types: Option[] = [ALL, ...named(HERITAGE_TYPE_NAME[language], catalog?.heritageTypes)];
  const levels: Option[] = [ALL, ...named(RECOGNITION_LEVEL_NAME[language], catalog?.recognitionLevels)];
  const periods: Option[] = [
    ALL,
    ...(catalog?.periods ?? []).map((period) => {
      const label = PERIOD_NAME[language][period.value as keyof (typeof PERIOD_NAME)['vi']] ?? period.label;
      return { value: period.value, label, menuLabel: `${label} (${periodRangeText(period, t, language)})` };
    }),
  ];
  const item = cn('min-w-0', itemClassName);
  const set = (patch: Partial<DiscoveryFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className={className}>
      <div className={item}>
        <FilterSelect
          label={t.filters.province}
          value={filter.provinceId ? String(filter.provinceId) : ''}
          options={provinces}
          onChange={(value) => set({ provinceId: value ? Number(value) : undefined })}
        />
      </div>
      <div className={item}>
        <FilterSelect label={t.filters.region} value={filter.region ?? ''} options={regions} onChange={(value) => set({ region: value || undefined })} />
      </div>
      <div className={item}>
        <FilterSelect
          label={t.filters.type}
          value={filter.heritageType ?? ''}
          options={types}
          onChange={(value) => set({ heritageType: (value || undefined) as HeritageType | undefined })}
        />
      </div>
      <div className={item}>
        <FilterSelect
          label={t.filters.level}
          value={filter.recognitionLevel ?? ''}
          options={levels}
          onChange={(value) => set({ recognitionLevel: (value || undefined) as RecognitionLevel | undefined })}
        />
      </div>
      <div className={item}>
        <FilterSelect
          label={t.filters.period}
          value={filter.period ?? ''}
          options={periods}
          onChange={(value) => set({ period: (value || undefined) as HeritagePeriod | undefined })}
        />
      </div>
    </div>
  );
}

/** Nút "Xóa bộ lọc": chỉ hiện khi có từ khóa hoặc ô lọc nào đang chọn. */
export function ClearFilters({ filter, onClear, className }: { filter: DiscoveryFilter; onClear: () => void; className?: string }) {
  const t = useT();
  if (!hasActiveFilter(filter)) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className={cn('rounded-xs px-2 type-control text-link underline underline-offset-4 hover:bg-link-hover-bg', className)}
    >
      {t.common.clearFilters}
    </button>
  );
}
