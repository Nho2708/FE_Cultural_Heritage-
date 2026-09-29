import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HeritageDetail } from '@dsvhvn/dung-chung/api';
import {
  countWords,
  HERITAGE_LIMITS,
  parseDecimal,
  type HeritageField,
  type HeritageValues,
} from '@dsvhvn/dung-chung';
import { Button, Icon, InlineMessage, SelectField, TextAreaField, TextField } from '@dsvhvn/dung-chung/ui';
import { adminHeritagesApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { HERITAGE_TYPE_OPTIONS, RECOGNITION_LEVEL_OPTIONS } from './heritageForm';
import { ThumbnailPickerDialog } from './ThumbnailPickerDialog';

// Tab Thông tin chung của Biên tập di sản: tên, đường dẫn (tự sinh từ tên, sửa được), mô tả ngắn, nội dung tóm lược lại
// từ nguồn Cục Di sản văn hóa, loại, cấp xếp hạng, năm công nhận, tỉnh (34 đơn vị), địa chỉ, tọa độ, mã tham chiếu ngoài
// và ảnh đại diện (chọn trong thư viện ảnh của di sản). Ô nhập do trang cha giữ để nút Lưu ở đầu trang dùng chung.

export const GENERAL_FORM_ID = 'bieu-mau-thong-tin-chung';

interface GeneralInfoTabProps {
  /** Chi tiết đã lưu; null khi đang tạo mới. */
  heritage: HeritageDetail | null;
  values: HeritageValues;
  errors: Partial<Record<HeritageField, string>>;
  formError: string | null;
  disabled?: boolean;
  onChange: (field: HeritageField, value: string) => void;
  /** Rời ô tên: gợi ý đường dẫn không trùng khi đường dẫn chưa được sửa tay. */
  onNameBlur: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onThumbnailChanged: (detail: HeritageDetail, message: string | null) => void;
  onOpenMediaTab: () => void;
}

function mapUrl(latitude: string, longitude: string): string | null {
  const lat = parseDecimal(latitude);
  const lng = parseDecimal(longitude);
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}

export function GeneralInfoTab({
  heritage,
  values,
  errors,
  formError,
  disabled,
  onChange,
  onNameBlur,
  onSubmit,
  onThumbnailChanged,
  onOpenMediaTab,
}: GeneralInfoTabProps) {
  const provinces = useQuery({
    queryKey: queryKeys.provinces,
    queryFn: () => adminHeritagesApi.provinces().then((r) => r.data),
    staleTime: Infinity,
  });
  const [picking, setPicking] = useState(false);
  const words = countWords(values.content);
  const link = mapUrl(values.latitude, values.longitude);
  const thumbnail = heritage?.media.find((m) => m.isThumbnail) ?? null;

  const provinceOptions = [
    { value: '', label: provinces.isPending ? 'Đang tải danh sách…' : 'Chọn tỉnh, thành phố' },
    ...(provinces.data ?? []).map((p) => ({ value: String(p.id), label: p.name ?? p.code ?? String(p.id) })),
  ];

  return (
    <form
      id={GENERAL_FORM_ID}
      noValidate
      onSubmit={onSubmit}
      aria-label="Thông tin chung"
      className="grid gap-6 dsvlg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] dsvlg:items-start"
    >
      <div className="flex flex-col gap-5 rounded-md border border-border bg-surface p-6">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <TextField
          label="Tên"
          name="name"
          autoComplete="off"
          value={values.name}
          disabled={disabled}
          onChange={(e) => onChange('name', e.target.value)}
          onBlur={onNameBlur}
          error={errors.name}
        />
        <TextField
          label="Đường dẫn"
          name="slug"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={values.slug}
          disabled={disabled}
          onChange={(e) => onChange('slug', e.target.value)}
          error={errors.slug}
          hint="Tự sinh từ tên, sửa được. Chỉ gồm chữ thường không dấu, chữ số và dấu gạch ngang."
        />
        <TextAreaField
          label="Mô tả ngắn"
          name="shortDescription"
          rows={3}
          value={values.shortDescription}
          disabled={disabled}
          onChange={(e) => onChange('shortDescription', e.target.value)}
          error={errors.shortDescription}
          hint={`${values.shortDescription.trim().length} / ${HERITAGE_LIMITS.shortDescription} ký tự. Cần có để xuất bản.`}
        />
        <TextAreaField
          label="Nội dung tóm lược"
          name="content"
          rows={10}
          value={values.content}
          disabled={disabled}
          onChange={(e) => onChange('content', e.target.value)}
          error={errors.content}
          hint={
            <>
              Tóm lược lại từ nguồn Cục Di sản văn hóa bằng lời của mình, không chép nguyên văn; ghi nguồn ở tab Nguồn tham
              chiếu. Hiện có <strong>{words}</strong> từ, cần tối thiểu {HERITAGE_LIMITS.minContentWords} từ để xuất bản.
            </>
          }
        />
        <div className="grid gap-5 dsvsm:grid-cols-2 dsvlg:grid-cols-[1fr_1.5fr_1fr]">
          <SelectField
            label="Loại"
            name="heritageType"
            value={values.heritageType}
            disabled={disabled}
            options={[{ value: '', label: 'Chọn loại' }, ...HERITAGE_TYPE_OPTIONS]}
            onChange={(e) => onChange('heritageType', e.target.value)}
            error={errors.heritageType}
          />
          <SelectField
            label="Cấp xếp hạng"
            name="recognitionLevel"
            value={values.recognitionLevel}
            disabled={disabled}
            options={[{ value: '', label: 'Chọn cấp xếp hạng' }, ...RECOGNITION_LEVEL_OPTIONS]}
            onChange={(e) => onChange('recognitionLevel', e.target.value)}
            error={errors.recognitionLevel}
          />
          <TextField
            label="Năm công nhận"
            name="recognizedYear"
            inputMode="numeric"
            value={values.recognizedYear}
            disabled={disabled}
            onChange={(e) => onChange('recognizedYear', e.target.value)}
            error={errors.recognizedYear}
            hint="Cần khi đã xếp hạng."
          />
        </div>
        <div className="grid gap-5 dsvsm:grid-cols-2">
          <SelectField
            label="Tỉnh, thành phố"
            name="provinceId"
            value={values.provinceId}
            disabled={disabled}
            options={provinceOptions}
            onChange={(e) => onChange('provinceId', e.target.value)}
            error={errors.provinceId}
            hint="Theo 34 đơn vị hành chính cấp tỉnh từ 01/07/2025. Di sản phi vật thể và tư liệu không bắt buộc."
          />
          <TextField
            label="Mã tham chiếu ngoài"
            name="placeId"
            autoComplete="off"
            value={values.placeId}
            disabled={disabled}
            onChange={(e) => onChange('placeId', e.target.value)}
            error={errors.placeId}
            hint="Ví dụ mã Wikidata của di sản. Không bắt buộc."
          />
        </div>
        <TextField
          label="Địa chỉ"
          name="address"
          autoComplete="off"
          value={values.address}
          disabled={disabled}
          onChange={(e) => onChange('address', e.target.value)}
          error={errors.address}
        />
      </div>

      <div className="flex flex-col gap-6">
        <section aria-labelledby="vi-tri-tieu-de" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
          <h2 id="vi-tri-tieu-de" className="type-h4 text-on-surface">
            Vị trí trên bản đồ
          </h2>
          <div className="grid gap-4 dsvsm:grid-cols-2">
            <TextField
              label="Vĩ độ"
              name="latitude"
              inputMode="decimal"
              value={values.latitude}
              disabled={disabled}
              onChange={(e) => onChange('latitude', e.target.value)}
              error={errors.latitude}
            />
            <TextField
              label="Kinh độ"
              name="longitude"
              inputMode="decimal"
              value={values.longitude}
              disabled={disabled}
              onChange={(e) => onChange('longitude', e.target.value)}
              error={errors.longitude}
            />
          </div>
          <p className="type-label text-on-surface-muted">
            Vĩ độ từ 8,0 đến 23,5 và kinh độ từ 102,0 đến 117,5 (lãnh thổ Việt Nam). Nhập đủ cả hai hoặc bỏ trống cả hai;
            di sản vật thể, thiên nhiên và hỗn hợp cần có tọa độ để xuất bản.
          </p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 type-control text-link underline-offset-4 hover:underline"
            >
              <Icon name="external-link" size={16} />
              Xem vị trí trên bản đồ
            </a>
          )}
        </section>

        <section aria-labelledby="anh-dai-dien-tieu-de" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
          <h2 id="anh-dai-dien-tieu-de" className="type-h4 text-on-surface">
            Ảnh đại diện
          </h2>
          {!heritage ? (
            <p className="type-body-s text-on-surface-variant">
              Lưu di sản trước, sau đó thêm ảnh ở tab Ảnh và media và chọn một ảnh làm ảnh đại diện.
            </p>
          ) : heritage.thumbnailUrl ? (
            <>
              <img src={heritage.thumbnailUrl} alt="" className="h-48 w-full rounded-sm bg-surface-container-high object-cover" />
              <div>
                {thumbnail?.caption && <p className="type-body-s text-on-surface">{thumbnail.caption}</p>}
                {thumbnail?.credit && <p className="type-label text-on-surface-muted">{thumbnail.credit}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setPicking(true)}>
                  <Icon name="image" size={16} />
                  Đổi ảnh
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-border-strong text-on-surface-muted">
                <Icon name="image" size={32} />
              </div>
              <p className="type-body-s text-on-surface-variant">Chưa có ảnh đại diện. Chọn một ảnh trong thư viện ảnh của di sản; cần có để xuất bản.</p>
              <div>
                <Button variant="secondary" onClick={() => setPicking(true)}>
                  <Icon name="image" size={16} />
                  Chọn ảnh
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {picking && heritage && (
        <ThumbnailPickerDialog
          heritage={heritage}
          onPicked={(detail, message) => {
            setPicking(false);
            onThumbnailChanged(detail, message);
          }}
          onOpenMediaTab={() => {
            setPicking(false);
            onOpenMediaTab();
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </form>
  );
}
