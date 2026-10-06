import {
  collectErrors,
  focusFirstInvalid,
  formatMoney,
  formatMoneyPlain,
  MESSAGES,
  parseMoney,
  splitApiError,
  validatePlanAiRequests,
  validatePlanDuration,
  validatePlanName,
  validatePlanPrice,
  validatePlanTeachers,
} from '@dsvhvn/dung-chung';
import { errorMessage, type Plan } from '@dsvhvn/dung-chung/api';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Table,
  Td,
  TextField,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { SaleSwitch } from '../../components/billing/SaleSwitch';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { adminPlansApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Gói dịch vụ — quản trị hệ thống. Bảng gói (tên, giá, thời hạn, số giáo viên tối đa, lượt AI mỗi kỳ, đang bán, số trường đang
// dùng); tạo và sửa trong khung bên phải; bật, tắt bán ngay trên bảng. Tắt bán: không bán mới và không gia hạn, trường đang dùng
// giữ gói tới hết hạn. Gói Miễn phí (giá 0 duy nhất) không tắt, không đổi tên, không đổi giá; không có thao tác xóa gói. Đổi giá
// chỉ áp cho hóa đơn tạo sau đó.

type Field = 'name' | 'price' | 'durationDays' | 'maxTeachers' | 'maxAiRequests';
const FIELDS: readonly Field[] = ['name', 'price', 'durationDays', 'maxTeachers', 'maxAiRequests'];

interface Values {
  name: string;
  price: string;
  durationDays: string;
  maxTeachers: string;
  maxAiRequests: string;
  onSale: boolean;
}

const EMPTY: Values = { name: '', price: '', durationDays: '365', maxTeachers: '', maxAiRequests: '', onSale: true };

const valuesOf = (plan: Plan): Values => ({
  name: plan.name ?? '',
  price: formatMoneyPlain(plan.price ?? 0),
  durationDays: String(plan.durationDays ?? ''),
  maxTeachers: String(plan.maxTeachers ?? ''),
  maxAiRequests: String(plan.maxAiRequests ?? ''),
  onSale: plan.isActive,
});

type Panel = { kind: 'create' } | { kind: 'edit'; id: number } | null;

function PlanForm({ plan, onSaved, onClose }: { plan: Plan | null; onSaved: (plan: Plan) => void; onClose: () => void }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const saved = plan ? valuesOf(plan) : EMPTY;
  const [values, setValues] = useState<Values>(saved);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const free = plan?.isFree ?? false;

  const set = (field: Field) => (event: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<Field>({
      name: validatePlanName(values.name),
      price: validatePlanPrice(values.price, free),
      durationDays: validatePlanDuration(values.durationDays),
      maxTeachers: validatePlanTeachers(values.maxTeachers),
      maxAiRequests: validatePlanAiRequests(values.maxAiRequests),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    const body = {
      name: values.name.trim(),
      price: parseMoney(values.price) ?? 0,
      durationDays: Number(values.durationDays),
      maxTeachers: Number(values.maxTeachers),
      maxAiRequests: Number(values.maxAiRequests),
    };
    setSaving(true);
    try {
      const result = plan ? await adminPlansApi.update(plan.id, body) : await adminPlansApi.create(body);
      let next = result.data;
      // Công tắc "Đang bán" của khung sửa áp cùng lúc với lần lưu: sửa xong mới đổi trạng thái bán.
      if (plan && values.onSale !== next.isActive) {
        next = (values.onSale ? await adminPlansApi.enable(plan.id) : await adminPlansApi.disable(plan.id)).data;
      }
      toast.success(result.message ?? MESSAGES.success('Lưu gói'));
      onSaved(next);
    } catch (error) {
      const failure = splitApiError<Field>(error, FIELDS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (!plan) return onClose();
    setValues(saved);
    setErrors({});
    setFormError(null);
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="khung-goi"
      className="flex flex-col gap-5 rounded-md border border-border bg-surface p-6"
    >
      <div>
        <h2 id="khung-goi" className="type-h3 text-on-surface">
          {plan ? 'Sửa gói' : 'Tạo gói'}
        </h2>
        <p className="mt-1 type-body-s text-on-surface-variant">
          {plan ? `Gói ${plan.name} · ${plan.schoolCount} trường đang dùng` : 'Gói mới tạo xong được bán ngay.'}
        </p>
      </div>
      {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
      <TextField
        label="Tên"
        name="name"
        value={values.name}
        onChange={set('name')}
        error={errors.name}
        readOnly={free}
        hint={free ? 'Gói Miễn phí giữ nguyên tên.' : undefined}
        autoComplete="off"
      />
      <TextField
        label="Giá (đồng)"
        name="price"
        inputMode="numeric"
        value={values.price}
        onChange={set('price')}
        error={errors.price}
        readOnly={free}
        hint={free ? 'Gói Miễn phí luôn có giá 0.' : undefined}
        autoComplete="off"
      />
      <TextField
        label="Thời hạn (ngày)"
        name="durationDays"
        inputMode="numeric"
        value={values.durationDays}
        onChange={set('durationDays')}
        error={errors.durationDays}
        autoComplete="off"
      />
      <TextField
        label="Số giáo viên tối đa"
        name="maxTeachers"
        inputMode="numeric"
        value={values.maxTeachers}
        onChange={set('maxTeachers')}
        error={errors.maxTeachers}
        autoComplete="off"
      />
      <TextField
        label="Lượt AI mỗi kỳ"
        name="maxAiRequests"
        inputMode="numeric"
        value={values.maxAiRequests}
        onChange={set('maxAiRequests')}
        error={errors.maxAiRequests}
        hint="Lượt AI đặt lại khi sang kỳ gói mới."
        autoComplete="off"
      />
      {plan && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-label text-on-surface">Đang bán</p>
            <p className="mt-1 type-body-s text-on-surface-variant">
              {free
                ? 'Gói Miễn phí luôn đang bán, không tắt được.'
                : 'Tắt bán: trường đang dùng giữ gói tới hết hạn, trường khác không mua mới được.'}
            </p>
          </div>
          <SaleSwitch
            checked={values.onSale}
            label="Đang bán"
            disabled={free}
            onChange={(next) => setValues((v) => ({ ...v, onSale: next }))}
          />
        </div>
      )}
      <InlineMessage tone="info">Đổi giá chỉ áp dụng cho lần mua hoặc gia hạn sau; hóa đơn đã tạo giữ nguyên số tiền.</InlineMessage>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" loading={saving}>
          Lưu
        </Button>
      </div>
    </form>
  );
}

export default function PlansPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: queryKeys.plans, queryFn: () => adminPlansApi.list().then((r) => r.data) });
  const [panel, setPanel] = useState<Panel>(null);
  const [switching, setSwitching] = useState<number | null>(null);
  const [disabling, setDisabling] = useState<Plan | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.plans });

  /** Đưa gói vừa lưu vào bảng ngay (thêm hoặc thay dòng), rồi tải lại để số trường đang dùng đúng. */
  const adopt = (plan: Plan) => {
    queryClient.setQueryData<Plan[]>(queryKeys.plans, (old) =>
      old ? (old.some((p) => p.id === plan.id) ? old.map((p) => (p.id === plan.id ? plan : p)) : [...old, plan]) : old,
    );
    void refresh();
  };

  const setSale = async (plan: Plan, on: boolean) => {
    setSwitching(plan.id);
    try {
      const { message } = on ? await adminPlansApi.enable(plan.id) : await adminPlansApi.disable(plan.id);
      toast.success(message ?? MESSAGES.success(on ? 'Bật bán gói' : 'Tắt bán gói'));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSwitching(null);
      setDisabling(null);
      void refresh();
    }
  };

  const plans = list.data;
  const editing = panel?.kind === 'edit' ? (plans?.find((p) => p.id === panel.id) ?? null) : null;

  return (
    <AreaPage>
      <PageHeader
        title="Gói dịch vụ"
        description="Gói bán cho trường. Mỗi gói quy định thời hạn, số giáo viên tối đa và lượt AI mỗi kỳ."
        actions={
          <Button onClick={() => setPanel({ kind: 'create' })}>
            <Icon name="plus" size={16} />
            Tạo gói
          </Button>
        }
      />
      <div className={panel ? 'grid items-start gap-6 dsvlg:grid-cols-[minmax(0,1fr)_360px]' : 'flex flex-col gap-4'}>
        <div className="min-w-0">
          {list.isPending ? (
            <LoadingState />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : plans && plans.length === 0 ? (
            <EmptyState icon="star" title="Chưa có gói nào.">
              Bấm "Tạo gói" để thêm gói bán đầu tiên cho trường.
            </EmptyState>
          ) : (
            <>
              <Table caption="Gói dịch vụ" busy={list.isFetching}>
                <thead>
                  <tr>
                    <Th>Tên</Th>
                    <Th>Giá</Th>
                    <Th className="whitespace-normal!">Thời hạn (ngày)</Th>
                    <Th className="whitespace-normal!">Số giáo viên tối đa</Th>
                    <Th className="whitespace-normal!">Lượt AI mỗi kỳ</Th>
                    <Th>Đang bán</Th>
                    <Th className="whitespace-normal!">Số trường đang dùng</Th>
                  </tr>
                </thead>
                <tbody>
                  {plans?.map((plan) => {
                    const selected = panel?.kind === 'edit' && panel.id === plan.id;
                    return (
                      <Tr key={plan.id} className={selected ? 'bg-primary-soft' : undefined}>
                        <Td>
                          <Button
                            variant="link"
                            aria-label={`Sửa gói ${plan.name}`}
                            aria-current={selected || undefined}
                            onClick={() => setPanel({ kind: 'edit', id: plan.id })}
                          >
                            {plan.name}
                          </Button>
                        </Td>
                        <Td className="whitespace-nowrap">{formatMoney(plan.price)}</Td>
                        <Td className="type-mono-label">{plan.durationDays}</Td>
                        <Td className="type-mono-label">{plan.maxTeachers}</Td>
                        <Td className="type-mono-label">{plan.maxAiRequests}</Td>
                        <Td>
                          <span className="flex items-center gap-2">
                            <SaleSwitch
                              checked={plan.isActive}
                              label={`Đang bán gói ${plan.name}`}
                              disabled={plan.isFree}
                              busy={switching === plan.id}
                              onChange={(next) => (next ? void setSale(plan, true) : setDisabling(plan))}
                            />
                            {plan.isFree && <Icon name="lock" size={16} className="text-on-surface-muted" aria-label="Không tắt bán được" />}
                          </span>
                        </Td>
                        <Td className="type-mono-label">{plan.schoolCount}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <p className="mt-3 flex items-start gap-2 type-body-s text-on-surface-variant">
                <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
                Gói Miễn phí không tắt, không xóa được. Gói tắt bán không bán mới và không gia hạn; trường đang dùng giữ gói tới hết hạn.
              </p>
            </>
          )}
        </div>

        {panel?.kind === 'create' && (
          <PlanForm
            key="moi"
            plan={null}
            onClose={() => setPanel(null)}
            onSaved={(plan) => {
              adopt(plan);
              setPanel({ kind: 'edit', id: plan.id });
            }}
          />
        )}
        {panel?.kind === 'edit' && editing && (
          <PlanForm
            key={`${editing.id}-${editing.price}-${editing.isActive}-${editing.name}-${editing.durationDays}-${editing.maxTeachers}-${editing.maxAiRequests}`}
            plan={editing}
            onClose={() => setPanel(null)}
            onSaved={adopt}
          />
        )}
        {!panel && plans && plans.length > 0 && (
          <p className="type-body-s text-on-surface-variant">Chọn tên một gói trong bảng để sửa, hoặc bấm "Tạo gói" để thêm gói mới.</p>
        )}
      </div>

      <ConfirmDialog
        open={disabling !== null}
        title="Tắt bán gói?"
        confirmLabel="Tắt bán"
        tone="danger"
        confirming={switching !== null}
        onConfirm={() => disabling && void setSale(disabling, false)}
        onClose={() => setDisabling(null)}
      >
        {disabling && MESSAGES.confirm('tắt bán', `gói ${disabling.name}`)} Trường đang dùng gói này giữ gói tới hết hạn; trường khác không mua mới hoặc gia
        hạn được.
      </ConfirmDialog>
    </AreaPage>
  );
}
