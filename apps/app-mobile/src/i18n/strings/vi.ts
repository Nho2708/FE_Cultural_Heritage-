// Chữ giao diện của phần công khai trong app (chế độ Khách tham quan) bằng tiếng Việt, là bản gốc: bốn ngôn ngữ còn lại phải đủ đúng các khóa này
// (kiểm bằng kiểu `Strings` và bằng bài kiểm tra đủ khóa). Chỗ chèn giá trị viết `{{tên}}` theo i18next.

export interface Strings {
  appName: string;
  common: {
    back: string;
    close: string;
    retry: string;
    loading: string;
    systemError: string;
    offline: string;
    noResults: string;
    cancel: string;
    confirm: string;
    next: string;
    seeAll: string;
    sites: string;
    photoCredit: string;
    clear: string;
  };
  language: {
    title: string;
    subtitle: string;
    machineNote: string;
    machineLabel: string;
    machineHint: string;
    fallbackPage: string;
    fallbackList: string;
    names: { vi: string; en: string; ko: string; 'zh-Hans': string; ja: string };
  };
  mode: {
    title: string;
    subtitle: string;
    guestTitle: string;
    guestText: string;
    studentTitle: string;
    studentText: string;
    studentLanguageNote: string;
  };
  intro: {
    title: string;
    replay: string;
    replayText: string;
    videoTitle: string;
    videoText: string;
    watchVideo: string;
    videoOffline: string;
    skip: string;
    next: string;
    start: string;
    step: string;
    discover: { title: string; text: string };
    narration: { title: string; text: string };
    model: { title: string; text: string };
    learn: { title: string; text: string };
  };
  tabs: { home: string; search: string; map: string; history: string; timeline: string };
  home: {
    intro: string;
    recommended: string;
    recommendedEmpty: string;
    featured: string;
    byType: string;
    byRegion: string;
    nearby: string;
    nearbyAsk: string;
    nearbyAllow: string;
    nearbyDenied: string;
    nearbyEmpty: string;
    nearbyDistance: string;
    total: string;
    mapText: string;
    timelineText: string;
    nearbyOutside: string;
    nearbyError: string;
    nearbyLocating: string;
  };
  recommend: {
    text: string;
    textFeatured: string;
    because: string;
    reasonsLabel: string;
    reasons: { SAME_TYPE: string; SAME_PROVINCE: string; SAME_REGION: string; SAME_LEVEL: string; OVERLAPPING_ERA: string; SIMILAR_TEXT: string };
    fallbackNote: string;
    loading: string;
  };
  search: {
    title: string;
    placeholder: string;
    filters: string;
    region: string;
    type: string;
    all: string;
    clearFilters: string;
    results: string;
    loadMore: string;
    keywordShort: string;
    moreFilters: string;
    province: string;
    level: string;
    period: string;
    chooseProvince: string;
    anyProvince: string;
  };
  detail: {
    summary: string;
    listen: string;
    view3d: string;
    timeline: string;
    onMap: string;
    gallery: string;
    references: string;
    address: string;
    province: string;
    recognition: string;
    recognizedYear: string;
    noContent: string;
    eraBefore: string;
    present: string;
    phases: string;
    notFound: string;
    notFoundText: string;
    readMore: string;
  };
  timeline: { title: string; empty: string; events: string; pickerText: string; pickerPlaceholder: string };
  summary: {
    title: string;
    detailed: string;
    short: string;
    unavailable: string;
    fallbackOnly: string;
  };
  speech: {
    play: string;
    pause: string;
    resume: string;
    stop: string;
    speed: string;
    missingVoice: string;
    unsupported: string;
    sentence: string;
  };
  ad: {
    title: string;
    text: string;
    watch: string;
    notReady: string;
    reward: string;
    placeholder: string;
    needBuild: string;
    verifying: string;
    closedEarly: string;
    rejected: string;
    network: string;
  };
  model: { title: string; loading: string; unavailable: string; credit: string; license: string; hint: string; backToGallery: string };
  map: { title: string; loading: string; unavailable: string; open: string; listInstead: string; withoutLocation: string };
  history: {
    title: string;
    empty: string;
    searches: string;
    viewed: string;
    listened: string;
    viewed3d: string;
    remove: string;
    clearAll: string;
    clearConfirm: string;
    retention: string;
  };
  settings: {
    title: string;
    language: string;
    location: string;
    locationOn: string;
    locationOff: string;
    ads: string;
    adsText: string;
    mode: string;
    modeText: string;
    switchToStudent: string;
    version: string;
    apiAddress: string;
    adsOptions: string;
    adsNotNeeded: string;
    adsUnavailable: string;
    adsCheckFailed: string;
  };
}

export const vi: Strings = {
  appName: 'Vietnam Heritage',
  common: {
    back: 'Quay lại',
    close: 'Đóng',
    retry: 'Thử lại',
    loading: 'Đang tải…',
    systemError: 'Có lỗi xảy ra. Bạn thử lại sau nhé.',
    offline: 'Không kết nối được với máy chủ. Hãy kiểm tra mạng rồi thử lại.',
    noResults: 'Không có kết quả phù hợp. Hãy bỏ bớt bộ lọc hoặc đổi từ khóa.',
    cancel: 'Hủy',
    confirm: 'Đồng ý',
    next: 'Tiếp tục',
    seeAll: 'Xem tất cả',
    sites: '{{count}} di sản',
    photoCredit: 'Ảnh',
    clear: 'Xóa',
  },
  language: {
    title: 'Chọn ngôn ngữ',
    subtitle: 'Ngôn ngữ dùng cho chữ trên màn hình và nội dung di sản. Bạn đổi lại được trong phần Cài đặt.',
    machineNote: 'Bản tiếng Hàn, tiếng Trung và tiếng Nhật là bản dịch máy.',
    machineLabel: 'Bản dịch máy',
    machineHint: 'Bản dịch máy, có thể chưa chính xác.',
    fallbackPage: 'Nội dung này chưa có bản {{language}}. Đang hiện bản tiếng Việt.',
    fallbackList: 'Một số di sản chưa có bản {{language}}, tên và mô tả hiện bằng tiếng Việt.',
    names: { vi: 'Tiếng Việt', en: 'Tiếng Anh', ko: 'Tiếng Hàn', 'zh-Hans': 'Tiếng Trung', ja: 'Tiếng Nhật' },
  },
  mode: {
    title: 'Bạn dùng app như thế nào?',
    subtitle: 'Chọn một chế độ. Bạn đổi lại được trong Cài đặt.',
    guestTitle: 'Khách tham quan',
    guestText: 'Khám phá di sản, bản đồ, dòng thời gian, nghe thuyết minh và xem 3D. Không cần đăng nhập.',
    studentTitle: 'Học sinh',
    studentText: 'Đăng nhập bằng mã học sinh của em để học bài, nhập mã bài học và làm bài kiểm tra.',
    studentLanguageNote: 'Chế độ Học sinh chỉ dùng tiếng Việt.',
  },
  intro: {
    title: 'Giới thiệu ứng dụng',
    replay: 'Xem lại',
    replayText: 'Xem lại bốn thẻ giới thiệu ngắn về ứng dụng.',
    videoTitle: 'Video giới thiệu',
    videoText: 'Xem video giới thiệu ngắn về ứng dụng, cần kết nối mạng.',
    watchVideo: 'Xem video giới thiệu',
    videoOffline: 'Cần kết nối mạng để xem video',
    skip: 'Bỏ qua',
    next: 'Tiếp',
    start: 'Bắt đầu',
    step: 'Bước {{current}} trên {{total}}',
    discover: { title: 'Khám phá di sản gần bạn', text: 'Mở bản đồ, tìm di sản quanh nơi bạn đứng và đọc tóm tắt từng nơi.' },
    narration: { title: 'Nghe thuyết minh bằng tiếng của bạn', text: 'Chọn một trong năm ngôn ngữ, rồi nghe thuyết minh về từng di sản.' },
    model: { title: 'Xem 3D và dòng thời gian', text: 'Xoay mô hình 3D của di sản và đi theo dòng thời gian lịch sử.' },
    learn: { title: 'Học sinh học theo cấp bằng mã bài học', text: 'Học sinh đăng nhập, nhập mã bài học thầy cô cho và học đúng với cấp của mình.' },
  },
  tabs: { home: 'Trang chủ', search: 'Tìm kiếm', map: 'Bản đồ', history: 'Lịch sử', timeline: 'Thời gian' },
  home: {
    intro: 'Khám phá di sản văn hóa Việt Nam',
    recommended: 'Gợi ý cho bạn',
    recommendedEmpty: 'Di sản nổi bật hôm nay',
    featured: 'Di sản nổi bật',
    byType: 'Theo loại di sản',
    byRegion: 'Theo vùng miền',
    nearby: 'Gần bạn',
    nearbyAsk: 'Cho phép dùng vị trí để xem các di sản gần bạn. Vị trí chỉ dùng để tính khoảng cách, không được lưu.',
    nearbyAllow: 'Cho phép vị trí',
    nearbyDenied: 'Bạn chưa cho phép dùng vị trí. Bạn bật lại được trong cài đặt của điện thoại.',
    nearbyEmpty: 'Chưa tìm thấy di sản có tọa độ gần bạn.',
    nearbyDistance: 'cách {{distance}}',
    total: '{{count}} di sản đã xuất bản',
    mapText: 'Xem vị trí các di sản trên bản đồ Việt Nam, gồm cả quần đảo Hoàng Sa, Trường Sa.',
    timelineText: 'Giai đoạn và sự kiện của từng di sản, theo thứ tự năm.',
    nearbyOutside: 'Chưa dùng được "Gần bạn": bạn đang ở ngoài Việt Nam.',
    nearbyError: 'Không xác định được vị trí của bạn. Hãy thử lại.',
    nearbyLocating: 'Đang xác định vị trí của bạn…',
  },
  recommend: {
    text: 'Di sản giống những gì bạn đã tìm, đã xem hoặc đã nghe gần đây.',
    textFeatured: 'Bạn chưa xem di sản nào. Hãy xem thử vài di sản, mục này sẽ gợi ý theo sở thích của bạn. Trong lúc đó, đây là những di sản nổi bật.',
    because: 'Vì bạn quan tâm đến {{name}}',
    reasonsLabel: 'Điểm chung',
    reasons: {
      SAME_TYPE: 'Cùng loại hình',
      SAME_PROVINCE: 'Cùng tỉnh, thành',
      SAME_REGION: 'Cùng vùng',
      SAME_LEVEL: 'Cùng cấp xếp hạng',
      OVERLAPPING_ERA: 'Cùng thời kỳ',
      SIMILAR_TEXT: 'Nội dung gần giống',
    },
    fallbackNote: 'Gợi ý được chọn theo loại hình và vùng của di sản bạn xem gần nhất.',
    loading: 'Đang tìm gợi ý cho bạn…',
  },
  search: {
    title: 'Tìm kiếm di sản',
    placeholder: 'Tìm theo tên, tỉnh, thời kỳ…',
    filters: 'Bộ lọc',
    region: 'Vùng miền',
    type: 'Loại di sản',
    all: 'Tất cả',
    clearFilters: 'Bỏ bộ lọc',
    results: '{{count}} kết quả',
    loadMore: 'Xem thêm',
    keywordShort: 'Từ khóa cần ít nhất 2 ký tự.',
    moreFilters: 'Thêm bộ lọc',
    province: 'Tỉnh, thành phố',
    level: 'Cấp xếp hạng',
    period: 'Thời kỳ',
    chooseProvince: 'Chọn tỉnh, thành phố',
    anyProvince: 'Mọi tỉnh, thành phố',
  },
  detail: {
    summary: 'Tóm tắt',
    listen: 'Nghe',
    view3d: 'Xem 3D',
    timeline: 'Dòng thời gian',
    onMap: 'Xem trên bản đồ',
    gallery: 'Hình ảnh',
    references: 'Nguồn tham khảo',
    address: 'Địa chỉ',
    province: 'Tỉnh, thành phố',
    recognition: 'Cấp xếp hạng',
    recognizedYear: 'Năm công nhận',
    noContent: 'Di sản này chưa có nội dung chi tiết.',
    eraBefore: 'TCN',
    present: 'nay',
    phases: 'Các giai đoạn',
    notFound: 'Không tìm thấy di sản',
    notFoundText: 'Di sản này không tồn tại hoặc chưa được xuất bản.',
    readMore: 'Đọc tiếp',
  },
  timeline: {
    title: 'Dòng thời gian',
    empty: 'Di sản này chưa có dòng thời gian.',
    events: '{{count}} sự kiện',
    pickerText: 'Mỗi di sản có dòng thời gian riêng. Chọn một di sản để xem các giai đoạn và sự kiện của nó.',
    pickerPlaceholder: 'Tìm nhanh theo tên di sản',
  },
  summary: {
    title: 'Tóm tắt di sản',
    detailed: 'Đọc',
    short: 'Bản ngắn để nghe',
    unavailable: 'Di sản này chưa có tóm tắt.',
    fallbackOnly: 'Chưa có bản {{language}}, đang hiện bản tiếng Việt.',
  },
  speech: {
    play: 'Nghe',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    stop: 'Dừng',
    speed: 'Tốc độ',
    missingVoice: 'Điện thoại chưa có giọng đọc {{language}}. Bạn cài thêm giọng trong cài đặt của điện thoại; nội dung vẫn đọc được bằng chữ.',
    unsupported: 'Thiết bị này không hỗ trợ đọc thành tiếng. Bạn vẫn đọc được nội dung bằng chữ.',
    sentence: 'Câu đang đọc',
  },
  ad: {
    title: 'Mở tóm tắt và nghe thuyết minh',
    text: 'Xem một quảng cáo ngắn của Google để mở tóm tắt và nghe thuyết minh của di sản này trong 24 giờ.',
    watch: 'Xem quảng cáo',
    notReady: 'Quảng cáo chưa sẵn sàng. Bạn thử lại sau nhé.',
    reward: 'Phần thưởng: mở tóm tắt và nghe của di sản này trong 24 giờ.',
    placeholder: 'Bản này chạy trong Expo Go nên chưa có quảng cáo. Tóm tắt và nghe đang mở sẵn.',
    needBuild: 'Cần bản dựng phát triển để xem quảng cáo. Bản này chạy trong Expo Go nên chưa mở được tóm tắt và nghe thuyết minh.',
    verifying: 'Đang chờ xác nhận phần thưởng...',
    closedEarly: 'Bạn chưa xem hết quảng cáo nên chưa mở được.',
    rejected: 'Chưa mở được tóm tắt. Bạn thử lại sau nhé.',
    network: 'Không kết nối được. Bạn kiểm tra mạng rồi thử lại nhé.',
  },
  model: {
    title: 'Mô hình 3D',
    loading: 'Đang tải mô hình…',
    unavailable: 'Di sản này chưa có mô hình 3D, hoặc mô hình không tải được.',
    credit: 'Tác giả',
    license: 'Giấy phép',
    hint: 'Vuốt để xoay, chụm hai ngón để phóng to hoặc thu nhỏ.',
    backToGallery: 'Xem bộ ảnh của di sản',
  },
  map: {
    title: 'Bản đồ di sản',
    loading: 'Đang tải bản đồ…',
    unavailable: 'Không tải được bản đồ. Bạn xem danh sách di sản thay thế.',
    open: 'Mở chi tiết',
    listInstead: 'Xem danh sách di sản',
    withoutLocation: '{{count}} di sản chưa có tọa độ',
  },
  history: {
    title: 'Lịch sử của bạn',
    empty: 'Chưa có lịch sử. Di sản bạn tìm, xem, nghe và xem 3D sẽ hiện ở đây.',
    searches: 'Đã tìm',
    viewed: 'Đã xem',
    listened: 'Đã nghe',
    viewed3d: 'Đã xem 3D',
    remove: 'Xóa mục này',
    clearAll: 'Xóa toàn bộ lịch sử',
    clearConfirm: 'Xóa toàn bộ lịch sử tìm kiếm và xem của thiết bị này? Gợi ý của bạn sẽ trở về mặc định.',
    retention: 'Lịch sử gắn với mã thiết bị ẩn danh, không gắn với tên hay tài khoản, và tự xóa sau 90 ngày. Bạn xóa từng mục hoặc xóa hết là xóa thật.',
  },
  settings: {
    title: 'Cài đặt',
    language: 'Ngôn ngữ',
    location: 'Vị trí',
    locationOn: 'Đang bật: dùng để hiện di sản gần bạn, không lưu vị trí.',
    locationOff: 'Đang tắt.',
    ads: 'Quảng cáo',
    adsText: 'Hộp đồng ý quảng cáo của Google chỉ hiện với khách ở châu Âu và Anh, và chỉ ở bản cài riêng có quảng cáo.',
    mode: 'Chế độ sử dụng',
    modeText: 'Đang dùng chế độ Khách tham quan.',
    switchToStudent: 'Chuyển sang chế độ Học sinh',
    version: 'Phiên bản',
    apiAddress: 'Địa chỉ máy chủ',
    adsOptions: 'Mở lại lựa chọn quảng cáo cá nhân hóa',
    adsNotNeeded: 'Khu vực của bạn không cần hộp đồng ý quảng cáo của Google, nên không có lựa chọn nào để mở lại.',
    adsUnavailable: 'Bản này chưa có quảng cáo của Google nên chưa có lựa chọn nào để mở.',
    adsCheckFailed: 'Không kiểm tra được lựa chọn quảng cáo. Bạn kiểm tra mạng rồi thử lại.',
  },
};
