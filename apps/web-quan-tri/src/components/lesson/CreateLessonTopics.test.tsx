import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { GRADE_FOUR_TOPICS, heritageCardOf, topicOf } from '../../test/curriculumFixtures';
import { lessonOf, quotaOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Hộp Tạo bài học, bước Chọn di sản: ô "Chủ đề chương trình" theo khối của lớp (nhóm theo chủ đề lớn), di sản của chủ đề, chủ đề "Địa phương em"
// và ẩn ô khi khối không có chủ đề.

const classPage = {
  items: [classOf(1, { name: '7A1' }), classOf(2, { name: '4B1', grade: 4, schoolLevel: 1 })],
  page: 1,
  pageSize: 100,
  totalItems: 2,
  totalPages: 1,
};
const publicCards = [heritageCardOf(31, { name: 'Vịnh Hạ Long' }), heritageCardOf(32, { name: 'Đô thị cổ Hội An' })];
const topicCards = [heritageCardOf(21, { name: 'Hoàng thành Thăng Long' }), heritageCardOf(22, { name: 'Văn Miếu - Quốc Tử Giám' }), heritageCardOf(23, { name: 'Chùa Một Cột' })];

function api(topicsByGrade: Record<number, unknown[]>, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path.startsWith('/teacher/lessons?')) return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quotaOf() });
      if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: classPage });
      const topics = /^\/teacher\/curriculum-topics\?grade=(\d+)$/.exec(call.path);
      if (topics) return envelope(200, { data: { items: topicsByGrade[Number(topics[1])] ?? [] } });
      const heritages = /^\/teacher\/curriculum-topics\/(\d+)\/heritages$/.exec(call.path);
      if (heritages) return envelope(200, { data: { topic: topicOf(Number(heritages[1])), items: topicCards } });
      if (call.path.startsWith('/public/filters')) return envelope(200, { data: { provinces: [{ id: 1, code: '01', name: 'Thành phố Hà Nội', region: 'Bắc' }], regions: [], heritageTypes: [], recognitionLevels: [], periods: [] } });
      if (call.path.startsWith('/public/heritages')) return envelope(200, { data: { items: publicCards, page: 1, pageSize: 12, totalItems: 2, totalPages: 1 } });
      return undefined;
    },
  );
}

async function openHeritageStep(className: string) {
  const user = userEvent.setup();
  renderApp('/giao-vien/bai-hoc');
  await user.click(await screen.findByRole('button', { name: 'Tạo bài học' }));
  const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' });
  await user.click(await within(dialog).findByRole('radio', { name: `Lớp ${className}` }));
  await user.click(within(dialog).getByRole('button', { name: 'Tiếp tục' }));
  return { user, dialog };
}

describe('Tạo bài học — chủ đề chương trình', () => {
  it('hiện ô chủ đề theo khối của lớp, nhóm theo chủ đề lớn; gọi đúng khối', async () => {
    signInAs('TEACHER');
    const calls = api({ 4: GRADE_FOUR_TOPICS });
    const { dialog } = await openHeritageStep('4B1');

    const select = await within(dialog).findByLabelText('Chủ đề chương trình (lớp 4)');
    expect(calls.some((c) => c.path === '/teacher/curriculum-topics?grade=4')).toBe(true);
    const groups = within(select).getAllByRole('group').map((g) => g.getAttribute('label'));
    expect(groups).toEqual(['Địa phương em (tỉnh, thành phố)', 'Đồng bằng Bắc Bộ', 'Bắc Trung Bộ và Nam Trung Bộ']);
    expect(within(select).getByRole('option', { name: 'Thăng Long - Hà Nội · 5 di sản' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Thiên nhiên và con người địa phương (chọn theo tỉnh của trường)' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: /^Không chọn chủ đề/ })).toBeInTheDocument();
  });

  it('chọn chủ đề thì danh sách di sản là di sản của chủ đề; chọn được, lọc theo tên, bỏ chủ đề thì về danh sách thường; tạo bài gửi đúng di sản', async () => {
    signInAs('TEACHER');
    const calls = api({ 4: GRADE_FOUR_TOPICS }, (call) => {
      if (call.path === '/teacher/lessons' && call.method === 'POST') return envelope(201, { data: lessonOf({ id: 77 }), message: 'Tạo bài học thành công.' });
      if (call.path === '/teacher/lessons/77') return envelope(200, { data: lessonOf({ id: 77 }) });
      if (call.path === '/teacher/lessons/77/materials') return envelope(200, { data: { images: [], events: [] } });
      return undefined;
    });
    const { user, dialog } = await openHeritageStep('4B1');

    // Chưa chọn chủ đề: danh sách thường.
    expect(await within(dialog).findByRole('checkbox', { name: 'Vịnh Hạ Long' })).toBeInTheDocument();
    await user.selectOptions(await within(dialog).findByLabelText('Chủ đề chương trình (lớp 4)'), 'Thăng Long - Hà Nội · 5 di sản');

    expect(await within(dialog).findByRole('heading', { name: 'Di sản của chủ đề "Thăng Long - Hà Nội"' })).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/teacher/curriculum-topics/9/heritages')).toBe(true);
    expect(within(dialog).getByText('3 di sản đã xuất bản của chủ đề · chọn được nhiều di sản')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox', { name: 'Vịnh Hạ Long' })).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Tìm trong các di sản của chủ đề'), 'văn miếu');
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(1);
    await user.clear(within(dialog).getByLabelText('Tìm trong các di sản của chủ đề'));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Hoàng thành Thăng Long' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Chùa Một Cột' }));
    expect(within(dialog).getByText('Đã chọn 2 di sản')).toBeInTheDocument();

    // Bỏ chủ đề: về danh sách thường, di sản đã chọn vẫn giữ.
    await user.selectOptions(within(dialog).getByLabelText('Chủ đề chương trình (lớp 4)'), '');
    expect(await within(dialog).findByRole('checkbox', { name: 'Vịnh Hạ Long' })).toBeInTheDocument();
    expect(within(dialog).getByText('Đã chọn 2 di sản')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài học' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.path === '/teacher/lessons')?.body).toEqual({ classId: 2, title: 'Hoàng thành Thăng Long', heritageIds: [21, 23] }));
  });

  it('chủ đề "Địa phương em": nhắc chọn tỉnh của trường và giữ danh sách thường, có ô Tỉnh', async () => {
    signInAs('TEACHER');
    const calls = api({ 4: GRADE_FOUR_TOPICS });
    const { user, dialog } = await openHeritageStep('4B1');

    await user.selectOptions(await within(dialog).findByLabelText('Chủ đề chương trình (lớp 4)'), 'Thiên nhiên và con người địa phương (chọn theo tỉnh của trường)');

    expect(await within(dialog).findByText(/Hãy chọn tỉnh, thành phố của trường ở ô Tỉnh/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Tỉnh')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Vịnh Hạ Long' })).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/teacher/curriculum-topics/1/heritages')).toBe(false);

    await user.selectOptions(within(dialog).getByLabelText('Tỉnh'), 'Thành phố Hà Nội');
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith('/public/heritages')).at(-1)?.path).toContain('provinceId=1'));
  });

  it('khối không có chủ đề (lớp 7 trả danh sách rỗng): ẩn ô chọn, chọn di sản như cũ', async () => {
    signInAs('TEACHER');
    const calls = api({ 7: [] });
    const { dialog } = await openHeritageStep('7A1');

    expect(await within(dialog).findByRole('checkbox', { name: 'Vịnh Hạ Long' })).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/teacher/curriculum-topics?grade=7')).toBe(true);
    expect(within(dialog).queryByLabelText(/Chủ đề chương trình/)).not.toBeInTheDocument();
  });

  it('chủ đề của chủ đề chưa có di sản đã xuất bản: báo rỗng; đổi lớp ở bước một thì bỏ chủ đề đã chọn', async () => {
    signInAs('TEACHER');
    api({ 4: GRADE_FOUR_TOPICS, 7: [topicOf(50, { grade: 7, groupTitle: 'Nhóm lớp 7', title: 'Chủ đề lớp 7' })] }, (call) =>
      call.path === '/teacher/curriculum-topics/8/heritages' ? envelope(200, { data: { topic: topicOf(8), items: [] } }) : undefined,
    );
    const { user, dialog } = await openHeritageStep('4B1');

    await user.selectOptions(await within(dialog).findByLabelText('Chủ đề chương trình (lớp 4)'), 'Sông Hồng và văn minh sông Hồng · 1 di sản');
    expect(await within(dialog).findByText('Chủ đề này chưa có di sản đã xuất bản.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Quay lại' }));
    await user.click(await within(dialog).findByRole('radio', { name: 'Lớp 7A1' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tiếp tục' }));
    const select = await within(dialog).findByLabelText('Chủ đề chương trình (lớp 7)');
    expect(select).toHaveValue('');
    expect(await within(dialog).findByRole('checkbox', { name: 'Vịnh Hạ Long' })).toBeInTheDocument();
  });
});
