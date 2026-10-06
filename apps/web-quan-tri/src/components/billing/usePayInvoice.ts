import { MESSAGES } from '@dsvhvn/dung-chung';
import { errorMessage } from '@dsvhvn/dung-chung/api';
import { useToast } from '@dsvhvn/dung-chung/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { orgBillingApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { goToGateway } from '../../lib/gateway';

/**
 * "Thanh toán" một hóa đơn chưa trả (kể cả "Thanh toán lại"): tạo giao dịch mới rồi chuyển trình duyệt sang VNPay. Lỗi
 * (hóa đơn quá hạn, đã trả, cổng chưa sẵn sàng) hiện bằng thông báo và làm mới dữ liệu gói vì trạng thái có thể đã đổi.
 */
export function usePayInvoice() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<number | null>(null);

  const pay = async (invoiceId: number) => {
    setPayingId(invoiceId);
    try {
      const { data } = await orgBillingApi.pay(invoiceId);
      if (goToGateway(data.paymentUrl)) return; // trình duyệt đang rời trang: giữ nút ở trạng thái đang xử lý
      toast.error(MESSAGES.systemError);
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setPayingId(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
  };

  return { pay, payingId };
}
