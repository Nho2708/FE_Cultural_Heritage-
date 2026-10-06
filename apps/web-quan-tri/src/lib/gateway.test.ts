import { describe, expect, it, vi } from 'vitest';
import { gateway, goToGateway, isGatewayUrl } from './gateway';

describe('Chuyển sang cổng thanh toán', () => {
  it('chỉ nhận địa chỉ http và https hợp lệ', () => {
    expect(isGatewayUrl('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=1')).toBe(true);
    expect(isGatewayUrl('http://localhost:5080/x')).toBe(true);
    expect(isGatewayUrl('javascript:alert(1)')).toBe(false);
    expect(isGatewayUrl('data:text/html,<p>x</p>')).toBe(false);
    expect(isGatewayUrl('//evil.example/pay')).toBe(false);
    expect(isGatewayUrl('')).toBe(false);
  });

  it('địa chỉ hợp lệ thì mở và trả true; địa chỉ lạ thì không mở', () => {
    const open = vi.spyOn(gateway, 'open').mockImplementation(() => undefined);
    expect(goToGateway('https://sandbox.vnpayment.vn/pay')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/pay');
    expect(goToGateway('javascript:alert(1)')).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
  });
});
