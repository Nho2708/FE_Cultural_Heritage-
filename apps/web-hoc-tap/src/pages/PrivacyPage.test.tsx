import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { PRIVACY_POLICIES, type PrivacyPolicy } from '../privacy';
import { mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Trang Chính sách quyền riêng tư: công khai, không cần đăng nhập, đủ 11 mục kèm mục lục, email và địa chỉ thành liên kết, bản dịch có
// ghi chú; bốn bản dịch giữ đúng các mục và hình dạng thân mục của bản tiếng Việt.

const shape = (policy: PrivacyPolicy) =>
  policy.sections.map((section) => ({ id: section.id, body: section.body.map((block) => (typeof block === 'string' ? 'p' : block.length)) }));

describe('trang Chính sách quyền riêng tư', () => {
  it('khách mở được không cần đăng nhập; có ngày cập nhật, mục lục, 11 mục, email và địa chỉ thành liên kết', async () => {
    const calls = mockApi();
    renderApp('/chinh-sach-quyen-rieng-tu');

    expect(await screen.findByRole('heading', { level: 1, name: 'Chính sách quyền riêng tư' })).toBeInTheDocument();
    expect(document.title).toBe('Chính sách quyền riêng tư · DiViet');
    const updated = document.querySelector('time');
    expect(updated).toHaveAttribute('dateTime', '2026-10-23');
    expect(updated?.parentElement).toHaveTextContent(/^Cập nhật lần cuối: 23 tháng 10, 2026$/);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    const contents = screen.getByRole('navigation', { name: 'Nội dung' });
    expect(within(contents).getAllByRole('link')).toHaveLength(11);
    expect(within(contents).getByRole('link', { name: '4. Quảng cáo' })).toHaveAttribute('href', '#quang-cao');
    expect(screen.getByRole('heading', { level: 2, name: '9. Học sinh và trẻ em' }).closest('section')).toHaveAttribute('id', 'hoc-sinh-va-tre-em');

    expect(screen.getAllByRole('link', { name: 'support@diviet.id.vn' })[0]).toHaveAttribute('href', 'mailto:support@diviet.id.vn');
    expect(screen.getByRole('link', { name: 'https://policies.google.com/technologies/partner-sites' })).toHaveAttribute(
      'href',
      'https://policies.google.com/technologies/partner-sites',
    );
    // Dấu chấm cuối câu không lọt vào liên kết.
    const site = screen.getAllByRole('link', { name: 'https://diviet.id.vn' });
    expect(site).toHaveLength(2);
    for (const link of site) expect(link).toHaveAttribute('href', 'https://diviet.id.vn');
    // Khung trang có thể gọi API công khai của khách; trang này không cần đăng nhập.
    expect(calls.every((call) => call.authorization === undefined)).toBe(true);
  });

  it('hiện theo ngôn ngữ khách đã chọn, kèm ghi chú bản tiếng Việt được áp dụng', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    mockApi();
    renderApp('/chinh-sach-quyen-rieng-tu');

    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('the Vietnamese version applies');
    expect(screen.getByRole('heading', { level: 2, name: '4. Advertising' })).toBeInTheDocument();
  });

  it('bốn bản dịch có đúng các mục, đúng thứ tự và đúng hình dạng thân mục như bản tiếng Việt, kèm ghi chú bản dịch', () => {
    const { vi: original, ...translations } = PRIVACY_POLICIES;
    expect(original.translationNote).toBeUndefined();
    expect(Object.keys(translations)).toEqual(['en', 'ko', 'zh-Hans', 'ja']);
    for (const policy of Object.values(translations)) {
      expect(shape(policy)).toEqual(shape(original));
      expect(policy.translationNote).toBeTruthy();
    }
  });
});
