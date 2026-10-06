import type { Localization, PublicSummary } from '@dsvhvn/dung-chung/api';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { cardOf, detailOf, eventOf, HUE, mapOf, phaseOf, publicApi, THANG_LONG, timelineOf } from '../test/discoveryFixtures';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Phần công khai 5 ngôn ngữ: chọn ngôn ngữ (nhớ trên máy), nội dung di sản theo ngôn ngữ (`lang`), nhãn bản dịch máy, thông báo thiếu bản dịch,
// học sinh luôn tiếng Việt, tóm tắt và nghe thuyết minh bằng giọng của trình duyệt.

vi.mock('../discovery/LocationMap', () => ({ default: () => <div data-testid="ban-do-nho" /> }));

const localization = (overrides: Partial<Localization> = {}): Localization => ({
  requestedLanguage: 'en',
  language: 'en',
  isFallback: false,
  isMachineTranslated: false,
  ...overrides,
});

const summaryOf = (overrides: Partial<PublicSummary> = {}): PublicSummary => ({
  heritageId: 1,
  slug: HUE.slug,
  name: HUE.name,
  localization: localization({ requestedLanguage: 'vi', language: 'vi' }),
  shortText: 'Kinh thành Huế khởi công năm 1805. Đây là trung tâm của triều Nguyễn. Năm 1993, quần thể được UNESCO ghi danh.',
  detailedText: 'Đoạn chi tiết thứ nhất về Cố đô Huế.\n\nĐoạn chi tiết thứ hai về lăng tẩm.',
  ...overrides,
});

const base = (path: string) => path.split('?')[0] ?? path;
const langOf = (call: FetchCall) => new URL(`http://x${call.path}`).searchParams.get('lang');
const detailCalls = (calls: FetchCall[], slug = HUE.slug) => calls.filter((call) => base(call.path) === `/public/heritages/${slug}`);

function chooseLanguage(code: string) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

interface FakeVoice {
  lang: string;
  name: string;
}

/** Web Speech API giả: ghi lại các câu được đọc; test gọi `finish(i)` để báo câu thứ i đọc xong. */
function installSpeech(voices: FakeVoice[]) {
  const spoken: Array<{ text: string; lang: string; rate: number; onend: (() => void) | null }> = [];
  class FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    voice: FakeVoice | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  const synth = {
    getVoices: () => voices,
    speak: vi.fn<(utterance: FakeUtterance) => void>((utterance) => void spoken.push(utterance)),
    cancel: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
    resume: vi.fn<() => void>(),
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { synth, spoken, finish: (index: number) => act(() => spoken[index]?.onend?.()) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chọn ngôn ngữ', () => {
  it('lần đầu mở theo ngôn ngữ của trình duyệt nếu thuộc năm ngôn ngữ; gửi lang lên máy chủ và đặt lang của trang', async () => {
    Object.defineProperty(window.navigator, 'languages', { value: ['ko-KR', 'en'], configurable: true });
    const calls = mockApi(publicApi());
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: '베트남의 문화유산을 만나 보세요' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko');
    expect(calls.filter((c) => base(c.path) === '/public/home').every((c) => langOf(c) === 'ko')).toBe(true);
    Object.defineProperty(window.navigator, 'languages', { value: ['vi-VN', 'vi'], configurable: true });
  });

  it('ngôn ngữ trình duyệt ngoài năm ngôn ngữ (tiếng Trung phồn thể) thì mặc định tiếng Anh', async () => {
    Object.defineProperty(window.navigator, 'languages', { value: ['zh-TW', 'fr'], configurable: true });
    mockApi(publicApi());
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: "Discover Viet Nam's cultural heritage" })).toBeInTheDocument();
    Object.defineProperty(window.navigator, 'languages', { value: ['vi-VN', 'vi'], configurable: true });
  });

  it('hộp thoại Chọn ngôn ngữ có năm lựa chọn viết bằng chính ngôn ngữ đó, ghi chú bản dịch máy; chọn xong nhớ trên máy và tải lại nội dung', async () => {
    const calls = mockApi(publicApi());
    const user = userEvent.setup();
    renderApp('/');

    await screen.findByRole('heading', { level: 1, name: 'Khám phá di sản Việt Nam' });
    expect(document.documentElement.lang).toBe('vi');
    await user.click(screen.getByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' }));

    const dialog = await screen.findByRole('dialog', { name: 'Chọn ngôn ngữ' });
    expect(within(dialog).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tiếng Việt', 'English', '한국어', '简体中文', '日本語', 'Đóng']);
    expect(within(dialog).getByRole('button', { name: 'Tiếng Việt' })).toHaveAttribute('aria-current', 'true');
    expect(within(dialog).getByText('Bản dịch tiếng Hàn, tiếng Trung và tiếng Nhật là bản dịch máy.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '日本語' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'ベトナムの文化遺産を探そう' })).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    await waitFor(() => expect(calls.some((c) => base(c.path) === '/public/home' && langOf(c) === 'ja')).toBe(true));
    // Thanh điều hướng đổi theo.
    expect(screen.getByRole('button', { name: '言語: 日本語' })).toBeInTheDocument();
  });

  it('lựa chọn đã nhớ được dùng ở lần mở sau, kể cả khi trình duyệt dùng ngôn ngữ khác', async () => {
    chooseLanguage('en');
    mockApi(publicApi());
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: "Discover Viet Nam's cultural heritage" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language: English' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Student sign-in' }).length).toBeGreaterThan(0);
  });

  it('học sinh đã đăng nhập luôn xem tiếng Việt, không có mục Ngôn ngữ, lựa chọn đã nhớ của khách không bị ghi đè', async () => {
    chooseLanguage('ko');
    signInAs();
    const calls = mockApi(publicApi());
    renderApp('/di-san');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tìm kiếm và lọc di sản' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ngôn ngữ/ })).not.toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => base(c.path) === '/public/heritages' && langOf(c) === 'vi')).toBe(true));
    expect(calls.filter((c) => base(c.path) === '/public/heritages').every((c) => langOf(c) === 'vi')).toBe(true);
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ko');
  });
});

describe('nội dung theo ngôn ngữ', () => {
  it('tìm kiếm bằng tiếng Anh: chữ giao diện, tên bộ lọc, tên tỉnh đều bằng tiếng Anh; từ khóa và lang gửi lên máy chủ', async () => {
    chooseLanguage('en');
    const calls = mockApi(publicApi());
    renderApp('/di-san?tu-khoa=hue');

    expect(await screen.findByRole('heading', { level: 1, name: 'Search and filter heritage' })).toBeInTheDocument();
    expect(await screen.findByText('3 sites')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Province, city' })).toBeInTheDocument();
    const provinceSelect = screen.getByRole('combobox', { name: 'Province, city' });
    expect(within(provinceSelect).getAllByRole('option').map((o) => o.textContent)).toEqual(['All', 'Hanoi', 'Hue City']);
    expect(within(screen.getByRole('combobox', { name: 'Type' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['All', 'Tangible', 'Intangible', 'Natural']);
    expect(within(screen.getByRole('combobox', { name: 'Period' })).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All',
      'Northern domination (179 BCE – 938)',
      'Contemporary (from 1945)',
    ]);
    expect(screen.getAllByText('Hue City').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–3 of 3 sites');
    const search = calls.find((c) => base(c.path) === '/public/heritages')!;
    expect(new URL(`http://x${search.path}`).searchParams.get('keyword')).toBe('hue');
    expect(langOf(search)).toBe('en');
  });

  it('thẻ chưa có bản dịch lùi về tiếng Việt: danh sách báo một lần ở đầu', async () => {
    chooseLanguage('en');
    mockApi(
      publicApi({
        '/public/heritages': () =>
          envelope(200, {
            data: {
              items: [cardOf({ isFallback: true }), cardOf({ ...THANG_LONG, name: 'Thang Long Imperial Citadel', isFallback: false })],
              page: 1,
              pageSize: 12,
              totalItems: 2,
              totalPages: 1,
            },
          }),
      }),
    );
    renderApp('/di-san');

    expect(await screen.findByText('Some sites are not yet available in English. Their names and descriptions are shown in Vietnamese.')).toBeInTheDocument();
  });

  it('bản dịch máy (tiếng Hàn): danh sách và trang di sản gắn nhãn bản dịch máy', async () => {
    chooseLanguage('ko');
    mockApi(
      publicApi({
        '/public/heritages': () =>
          envelope(200, { data: { items: [cardOf({ isMachineTranslated: true })], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 } }),
        [`/public/heritages/${HUE.slug}`]: () => envelope(200, { data: detailOf({ localization: localization({ requestedLanguage: 'ko', language: 'ko', isMachineTranslated: true }) }) }),
      }),
    );
    const { unmount } = renderApp('/di-san');
    expect(await screen.findByText('일부 유산의 이름과 설명은 기계 번역이므로 정확하지 않을 수 있습니다.')).toBeInTheDocument();
    unmount();

    renderApp(`/di-san/${HUE.slug}`);
    expect(await screen.findByText('기계 번역이므로 정확하지 않을 수 있습니다.')).toBeInTheDocument();
  });

  it('trang di sản: chưa có bản tiếng Anh thì hiện bản tiếng Việt kèm một thông báo cho cả trang', async () => {
    chooseLanguage('en');
    const calls = mockApi(
      publicApi({
        [`/public/heritages/${HUE.slug}`]: () => envelope(200, { data: detailOf({ localization: localization({ language: 'vi', isFallback: true }) }) }),
      }),
    );
    renderApp(`/di-san/${HUE.slug}`);

    expect(await screen.findByRole('heading', { level: 1, name: HUE.name })).toBeInTheDocument();
    expect(screen.getByText('This content is not yet available in English. Showing the Vietnamese version.')).toBeInTheDocument();
    expect(screen.getAllByText('Hue City').length).toBeGreaterThan(0);
    expect(screen.getAllByText('World Heritage (UNESCO)').length).toBeGreaterThan(0);
    expect(screen.getByText('Recognized in 1993')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open timeline' })).toBeInTheDocument();
    expect(screen.getAllByText('Photo: Vyacheslav Argenberg · CC BY 4.0 · Wikimedia Commons').length).toBeGreaterThan(0);
    expect(detailCalls(calls).every((c) => langOf(c) === 'en')).toBe(true);
  });

  it('dòng thời gian: năm trước Công nguyên và "nay" đổi theo ngôn ngữ', async () => {
    chooseLanguage('ja');
    mockApi(
      publicApi({
        [`/public/heritages/${HUE.slug}/timeline`]: () =>
          envelope(200, {
            data: timelineOf({
              localization: localization({ requestedLanguage: 'ja', language: 'ja', isMachineTranslated: true }),
              phases: [
                phaseOf({ id: 1, rangeLabel: '179 TCN – 938', events: [eventOf({ id: 1, dateLabel: '179 TCN', name: 'Sự kiện cổ' })] }),
                phaseOf({ id: 2, rangeLabel: '1993 – nay', events: [] }),
              ],
            }),
          }),
      }),
    );
    renderApp(`/dong-thoi-gian/${HUE.slug}`);

    expect(await screen.findByText('紀元前179 – 938')).toBeInTheDocument();
    expect(screen.getByText('1993 – 現在')).toBeInTheDocument();
    expect(screen.getByText('紀元前179')).toBeInTheDocument();
    expect(screen.getByText('時代 1')).toBeInTheDocument();
    expect(screen.getByText('機械翻訳のため、正確でない場合があります。')).toBeInTheDocument();
  });

  it('bản đồ: popup và ghi chú theo ngôn ngữ, ghim gửi lang', async () => {
    chooseLanguage('en');
    const calls = mockApi(publicApi({ '/public/heritages/map': () => envelope(200, { data: mapOf() }) }));
    renderApp('/ban-do');

    expect(await screen.findByText('2 sites located on the map')).toBeInTheDocument();
    expect(screen.getByText(/7 sites match the filters but have no location on the map/)).toBeInTheDocument();
    expect(calls.filter((c) => base(c.path) === '/public/heritages/map').every((c) => langOf(c) === 'en')).toBe(true);
  });
});

describe('tóm tắt và nghe thuyết minh', () => {
  const withSummary = (summary: PublicSummary | null, detail = detailOf({ hasSummary: true })) =>
    publicApi({
      [`/public/heritages/${HUE.slug}`]: () => envelope(200, { data: detail }),
      [`/public/heritages/${HUE.slug}/summary`]: () =>
        summary
          ? envelope(200, { data: summary })
          : envelope(404, { errorCode: 'SUMMARY_UNAVAILABLE', message: 'Di sản này chưa có tóm tắt. Bạn vẫn có thể đọc nội dung đầy đủ bên dưới.' }),
    });

  it('"Tóm tắt" mở hộp thoại tab Đọc: bản chi tiết theo từng đoạn, gọi API với lang của ngôn ngữ đang chọn, không gọi AI', async () => {
    const calls = mockApi(withSummary(summaryOf()));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Tóm tắt' }));

    const dialog = await screen.findByRole('dialog', { name: 'TÓM TẮT VÀ THUYẾT MINH' });
    expect(await within(dialog).findByText('Đoạn chi tiết thứ nhất về Cố đô Huế.')).toBeInTheDocument();
    expect(within(dialog).getByText('Đoạn chi tiết thứ hai về lăng tẩm.')).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: 'Đọc', selected: true })).toBeInTheDocument();
    const summaryCall = calls.find((c) => base(c.path) === `/public/heritages/${HUE.slug}/summary`)!;
    expect(summaryCall.method).toBe('GET');
    expect(langOf(summaryCall)).toBe('vi');
    expect(calls.every((c) => !/ai|generate/.test(base(c.path)))).toBe(true);
  });

  it('"Nghe" mở tab Nghe: phát đọc từng câu bằng giọng của ngôn ngữ, tô sáng câu đang đọc, tạm dừng, tiếp tục, dừng và đổi tốc độ', async () => {
    chooseLanguage('ko');
    const speech = installSpeech([{ lang: 'ko-KR', name: 'Korean' }]);
    mockApi(
      withSummary(
        summaryOf({
          localization: localization({ requestedLanguage: 'ko', language: 'ko', isMachineTranslated: true }),
          shortText: '첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.',
          detailedText: '자세한 설명입니다.',
        }),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: '듣기' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('tab', { name: '듣기', selected: true })).toBeInTheDocument();
    expect(within(dialog).getByText('기계 번역이므로 정확하지 않을 수 있습니다.')).toBeInTheDocument();
    expect(within(dialog).getByText('3문장 · 기기 음성')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '재생' }));
    expect(speech.spoken).toHaveLength(1);
    expect(speech.spoken[0]).toMatchObject({ text: '첫 번째 문장입니다.', lang: 'ko-KR', rate: 1 });
    expect(within(dialog).getByText('3문장 중 1번째 문장 읽는 중 · 기기 음성')).toBeInTheDocument();
    expect(within(dialog).getByText('첫 번째 문장입니다.')).toHaveAttribute('aria-current', 'true');

    speech.finish(0);
    await waitFor(() => expect(speech.spoken).toHaveLength(2));
    expect(speech.spoken[1]!.text).toBe('두 번째 문장입니다.');
    expect(within(dialog).getByText('두 번째 문장입니다.')).toHaveAttribute('aria-current', 'true');

    await user.click(within(dialog).getByRole('button', { name: '일시정지' }));
    expect(speech.synth.pause).toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: '계속' }));
    expect(speech.synth.resume).toHaveBeenCalled();

    // Đổi tốc độ khi đang đọc: đọc lại câu hiện tại với tốc độ mới.
    await user.click(within(dialog).getByRole('button', { name: '1.5×' }));
    expect(speech.spoken).toHaveLength(3);
    expect(speech.spoken[2]).toMatchObject({ text: '두 번째 문장입니다.', rate: 1.5 });

    await user.click(within(dialog).getByRole('button', { name: '정지' }));
    expect(speech.synth.cancel).toHaveBeenCalled();
    expect(within(dialog).getByText('3문장 · 기기 음성')).toBeInTheDocument();
    expect(within(dialog).queryByText('두 번째 문장입니다.', { selector: '[aria-current="true"]' })).not.toBeInTheDocument();
  });

  it('đọc hết câu cuối thì về trạng thái chờ', async () => {
    installSpeech([{ lang: 'vi-VN', name: 'Vietnamese' }]);
    const speech = (globalThis as unknown as { speechSynthesis: { speak: { mock: { calls: Array<[{ onend: () => void }]> } } } }).speechSynthesis;
    mockApi(withSummary(summaryOf({ shortText: 'Chỉ một câu.' })));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Nghe' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: 'Phát' }));
    act(() => speech.speak.mock.calls[0]![0].onend());
    await waitFor(() => expect(within(dialog).getByText('1 câu · Giọng đọc của thiết bị')).toBeInTheDocument());
    expect(within(dialog).getByRole('button', { name: 'Phát' })).toBeEnabled();
  });

  it('thiết bị chưa có giọng đọc của ngôn ngữ: báo kèm hướng dẫn cài giọng, khóa nút Phát, vẫn hiện đủ chữ', async () => {
    chooseLanguage('ja');
    const speech = installSpeech([{ lang: 'en-US', name: 'English' }]);
    mockApi(
      withSummary(
        summaryOf({
          localization: localization({ requestedLanguage: 'ja', language: 'ja', isMachineTranslated: true }),
          shortText: '昇龍皇城は世界遺産です。',
          detailedText: '詳しい説明です。',
        }),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: '聞く' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('この端末にはこの言語の音声がありません')).toBeInTheDocument();
    expect(within(dialog).getByText(/日本語の音声をインストールしてから/)).toBeInTheDocument();
    expect(within(dialog).getByText('昇龍皇城は世界遺産です。')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '再生' })).toBeDisabled();
    expect(speech.spoken).toHaveLength(0);
  });

  it('trình duyệt không hỗ trợ đọc to: báo rõ, vẫn hiện chữ, tab Đọc dùng bình thường', async () => {
    chooseLanguage('en');
    mockApi(withSummary(summaryOf({ localization: localization(), shortText: 'The citadel stands in Hue.', detailedText: 'Long text.' })));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Listen' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('This browser does not support reading aloud')).toBeInTheDocument();
    expect(within(dialog).getByText('The citadel stands in Hue.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Play' })).toBeDisabled();
    await user.click(within(dialog).getByRole('tab', { name: 'Read' }));
    expect(within(dialog).getByText('Long text.')).toBeInTheDocument();
  });

  it('ngôn ngữ chưa có tóm tắt hiện hành: hiện tóm tắt tiếng Việt kèm thông báo và đọc bằng giọng tiếng Việt, không dùng giọng ngôn ngữ khác', async () => {
    chooseLanguage('en');
    const speech = installSpeech([
      { lang: 'en-US', name: 'English' },
      { lang: 'vi-VN', name: 'Vietnamese' },
    ]);
    mockApi(withSummary(summaryOf({ localization: localization({ requestedLanguage: 'en', language: 'vi', isFallback: true }) })));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Listen' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('This content is not yet available in English. Showing the Vietnamese version.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Play' }));
    expect(speech.spoken[0]).toMatchObject({ lang: 'vi-VN', text: 'Kinh thành Huế khởi công năm 1805.' });
  });

  it('di sản chưa có tóm tắt tiếng Việt đã duyệt: báo một câu, không mở hộp thoại, không gọi API tóm tắt', async () => {
    const calls = mockApi(withSummary(null, detailOf({ hasSummary: false })));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Tóm tắt' }));
    expect(screen.getByText('Di sản này chưa có tóm tắt. Bạn vẫn có thể đọc nội dung đầy đủ bên dưới.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nghe' }));
    expect(calls.some((c) => base(c.path).endsWith('/summary'))).toBe(false);
    // Nội dung đầy đủ của di sản vẫn đọc được.
    expect(screen.getByText('Kinh thành khởi công năm 1805.')).toBeInTheDocument();
  });

  it('máy chủ trả SUMMARY_UNAVAILABLE thì hộp thoại báo chưa có tóm tắt, không có nút Thử lại', async () => {
    mockApi(withSummary(null));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Tóm tắt' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Di sản này chưa có tóm tắt. Bạn vẫn có thể đọc nội dung đầy đủ bên dưới.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('lỗi khác của máy chủ thì báo lỗi theo ngôn ngữ kèm nút Thử lại', async () => {
    chooseLanguage('en');
    mockApi(
      publicApi({
        [`/public/heritages/${HUE.slug}`]: () => envelope(200, { data: detailOf({ hasSummary: true }) }),
        [`/public/heritages/${HUE.slug}/summary`]: () => envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra.' }),
      }),
    );
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Summary' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('học sinh đã đăng nhập mở tóm tắt thẳng bằng tiếng Việt', async () => {
    chooseLanguage('en');
    signInAs();
    const calls = mockApi(withSummary(summaryOf()));
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Tóm tắt' }));
    expect(await screen.findByText('Đoạn chi tiết thứ nhất về Cố đô Huế.')).toBeInTheDocument();
    expect(langOf(calls.find((c) => base(c.path).endsWith('/summary'))!)).toBe('vi');
  });
});
