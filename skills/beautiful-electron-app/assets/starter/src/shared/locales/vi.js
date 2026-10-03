'use strict';

// Tiếng Việt — cấu trúc phải giống hệt en.js (test/i18n.test.js kiểm tra).
module.exports = {
  code: 'vi',
  name: 'Tiếng Việt',
  localeTag: 'vi-VN',

  app: { tagline: '__TAGLINE__' },

  durations: {
    indefinitely: 'Cho đến khi tôi tắt',
    minute: '1 phút',
    minutes: '{n} phút',
    hour: '1 giờ',
    hours: '{n} giờ',
    short: { indefinitely: '∞', m: '{n}p', h: '{n}h', hm: '{h}h{mm}' },
  },

  remaining: {
    long: { s: '{s} giây', m: '{m} phút', hm: '{h} giờ {mm} phút' },
    compact: { s: '{s}s', m: '{m}p', hm: '{h}h{mm}' },
  },

  tray: {
    statusOnTimed: '__APP_NAME__ đang bật — còn {remaining}',
    statusOnIndefinite: '__APP_NAME__ đang bật',
    statusOff: '__APP_NAME__ đang tắt',
    turnOn: 'Bật',
    turnOff: 'Tắt',
    turnOnFor: 'Bật trong',
    openWindow: 'Mở __APP_NAME__…',
    learn: 'Tìm hiểu thêm…',
    preferences: 'Tùy chọn…',
    about: 'Giới thiệu __APP_NAME__',
    quit: 'Thoát __APP_NAME__',
    tooltipOn: '__APP_NAME__ — đang bật',
    tooltipOnTimed: '__APP_NAME__ — còn {remaining}',
    tooltipOff: '__APP_NAME__ — đang tắt',
  },

  notifications: {
    finishedTitle: 'Phiên đã kết thúc',
    finishedBody: 'Phiên {duration} của bạn đã kết thúc.',
  },

  appMenu: {
    about: 'Giới thiệu __APP_NAME__',
    preferences: 'Tùy chọn…',
    hide: 'Ẩn __APP_NAME__',
    hideOthers: 'Ẩn ứng dụng khác',
    showAll: 'Hiện tất cả',
    quit: 'Thoát __APP_NAME__',
    edit: 'Sửa',
    undo: 'Hoàn tác',
    redo: 'Làm lại',
    cut: 'Cắt',
    copy: 'Sao chép',
    paste: 'Dán',
    selectAll: 'Chọn tất cả',
    window: 'Cửa sổ',
    minimize: 'Thu nhỏ',
    close: 'Đóng cửa sổ',
    help: 'Trợ giúp',
    learn: 'Tìm hiểu thêm',
  },

  ui: {
    statusOnTitle: 'Đang chạy',
    statusOffTitle: 'Sẵn sàng khi bạn cần',
    statusOnUntil: 'Đến {time} · còn {remaining}',
    statusOnIndefinite: 'Cho đến khi bạn tắt',
    statusOff: 'Nhấn nút để bắt đầu, hoặc chọn thời lượng bên dưới.',
    toggleOn: 'Bắt đầu phiên',
    toggleOff: 'Dừng phiên',
    toggleHint: 'Nhấn để bật hoặc tắt',
    durationLabel: 'Chạy trong',
    optionTitle: 'Tùy chọn mẫu',
    optionHint: 'Thay bằng một cài đặt thật sự quan trọng với app của bạn.',
    trayHintMac: '__APP_NAME__ nằm trên thanh menu. Nhấn biểu tượng để bật/tắt, nhấn chuột phải để xem thêm.',
    trayHintWin: '__APP_NAME__ nằm ở khay hệ thống. Nhấn biểu tượng để bật/tắt, nhấn chuột phải để xem thêm.',
    preferences: 'Tùy chọn',
    about: 'Giới thiệu',
    language: 'Ngôn ngữ',
    heroKicker: 'Chào mừng',
    heroTitle: '__APP_NAME__',
    heroText: '__TAGLINE__',
    learnButton: 'Tìm hiểu thêm',
    artBy: 'Minh họa: {author} · {license}',
    close: 'Đóng',
    showAtStartup: 'Hiện cửa sổ khi khởi động',
  },

  prefs: {
    title: 'Tùy chọn',
    general: 'Chung',
    launchAtLogin: 'Khởi động __APP_NAME__ khi đăng nhập',
    launchAtLoginNoteMac: 'macOS có thể yêu cầu cho phép trong Cài đặt hệ thống › Cài đặt chung › Mục đăng nhập.',
    showWindowOnLaunch: 'Hiện cửa sổ khi khởi động',
    defaultDuration: 'Thời lượng mặc định',
    defaultDurationHint: 'Áp dụng khi bạn nhấn biểu tượng trên thanh menu.',
    notifyWhenFinished: 'Thông báo khi phiên kết thúc',
    exampleOption: 'Tùy chọn mẫu',
    exampleOptionHint: 'Cài đặt được kiểm tra hợp lệ và lưu ngay.',
    menuBarMac: 'Thanh menu',
    menuBarWin: 'Khay hệ thống',
    showCountdown: 'Hiện thời gian còn lại cạnh biểu tượng',
    clickAction: 'Khi nhấn vào biểu tượng',
    clickToggle: 'Bật/tắt',
    clickMenu: 'Mở menu',
    clickHint: 'Nhấn chuột phải (hoặc ⌘-nhấn trên Mac) luôn mở menu.',
    appearance: 'Giao diện & ngôn ngữ',
    language: 'Ngôn ngữ',
    languageAuto: 'Theo hệ thống',
    theme: 'Chủ đề',
    themeSystem: 'Hệ thống',
    themeLight: 'Sáng',
    themeDark: 'Tối',
  },

  about: {
    title: 'Giới thiệu __APP_NAME__',
    version: 'Phiên bản {version}',
    description: '__TAGLINE__',
    builtWith: 'Xây dựng bằng Electron {electron} · Chromium {chrome}',
    license: 'Phát hành theo Giấy phép MIT.',
    credits: 'Phông chữ: Be Vietnam Pro và Fraunces (SIL Open Font License).',
  },

  learn: {
    title: '__APP_NAME__',
    subtitle: 'Hệ thống thiết kế · Thanh menu · Tùy chọn',
    lead: 'Một điểm khởi đầu chỉn chu: hãy thay nội dung này bằng câu chuyện của app bạn.',
    tabs: [
      {
        id: 'overview',
        icon: 'sprout',
        label: 'Tổng quan',
        heading: 'Bắt đầu từ một thứ thật đẹp',
        intro: 'Mọi thứ trong cửa sổ này đều đọc từ dữ liệu: sửa src/shared/locales để đổi chữ, sửa styles.css để đổi giao diện.',
        blocks: [
          {
            type: 'paragraphs',
            items: [
              'Cửa sổ kết hợp một bảng điều khiển gọn gàng với khu vực hình ảnh lớn. Một nút điều khiển đặc trưng, chiếc nút tròn lớn, đảm nhận hành động chính và có chuyển động giữa các trạng thái.',
              'Giao diện sáng và tối được thiết kế riêng bằng biến CSS, phông chữ được đóng gói sẵn, và mọi chuỗi đều có tiếng Anh lẫn tiếng Việt.',
            ],
          },
          {
            type: 'facts',
            items: [
              { label: 'Cửa sổ', value: '980 × 680, sáng và tối' },
              { label: 'Thanh menu', value: 'Biểu tượng template, đếm ngược, menu gốc' },
              { label: 'Ngôn ngữ', value: 'Tiếng Anh và tiếng Việt' },
              { label: 'Chất lượng', value: 'Unit test, Playwright E2E, ảnh chụp màn hình' },
            ],
          },
        ],
      },
      {
        id: 'features',
        icon: 'sparkle',
        label: 'Tính năng',
        heading: 'Có sẵn những gì',
        intro: 'Mỗi thẻ là một mục dữ liệu; màu nhãn là xanh, vàng hoặc xám.',
        blocks: [
          {
            type: 'cards',
            items: [
              { icon: 'palette', title: 'Design tokens', text: 'Màu sắc, bo góc và đổ bóng dưới dạng biến CSS, tinh chỉnh cho cả sáng lẫn tối.', badge: { label: 'Cốt lõi', tone: 'green' } },
              { icon: 'layers', title: 'Hộp thoại & thẻ', text: 'Hộp thoại dễ tiếp cận có giữ tiêu điểm, thẻ điều hướng bằng phím mũi tên.', badge: { label: 'Cốt lõi', tone: 'green' } },
              { icon: 'bell', title: 'Thanh menu & khay', text: 'Biểu tượng template, nhấn để bật/tắt, menu chuột phải, đếm ngược trực tiếp.', badge: { label: 'Gốc', tone: 'gold' } },
              { icon: 'gear', title: 'Tùy chọn', text: 'Cài đặt được kiểm tra và lưu an toàn, khởi động khi đăng nhập, chủ đề và ngôn ngữ.', badge: { label: 'Cốt lõi', tone: 'green' } },
              { icon: 'shield', title: 'An toàn mặc định', text: 'Renderer chạy sandbox, CSP chặt, IPC được kiểm tra, không tải nội dung từ xa.', badge: { label: 'Bảo mật', tone: 'gold' } },
              { icon: 'check', title: 'Có kiểm thử', text: 'Unit test với node:test và kiểm thử đầu-cuối bằng Playwright.', badge: { label: 'Chất lượng', tone: 'gray' } },
            ],
          },
        ],
      },
      {
        id: 'how',
        icon: 'bolt',
        label: 'Cách hoạt động',
        heading: 'Từ ý tưởng đến bộ cài',
        intro: 'Vòng lặp này áp dụng cho mọi app.',
        blocks: [
          {
            type: 'steps',
            items: [
              { icon: 'palette', title: 'Định hướng', text: 'Chọn ý tưởng, bảng màu, phông chữ và một tương tác đặc trưng.' },
              { icon: 'sparkle', title: 'Thương hiệu', text: 'Vẽ logo bằng SVG rồi chạy npm run assets để có mọi kích thước biểu tượng.' },
              { icon: 'layers', title: 'Xây dựng', text: 'Thay phiên làm mẫu bằng tính năng và nội dung của bạn.' },
              { icon: 'check', title: 'Phát hành', text: 'Chụp màn hình, kiểm thử, đóng gói bằng electron-builder và xác minh.' },
            ],
          },
          {
            type: 'callout',
            icon: 'info',
            title: 'Hãy nhìn tận mắt',
            text: 'Chạy npm run screenshots sau mỗi thay đổi giao diện và xem ảnh ở cả hai chủ đề, mọi ngôn ngữ.',
          },
        ],
      },
      {
        id: 'gallery',
        icon: 'image',
        label: 'Thư viện',
        heading: 'Thư viện ảnh',
        intro: 'Nhấn vào ảnh để phóng to. Hãy ghi công mọi hình ảnh không phải do bạn tạo ra.',
        blocks: [
          {
            type: 'gallery',
            items: [
              { src: 'images/hero.svg', caption: 'Minh họa chính (thay bằng tác phẩm của bạn hoặc ảnh có giấy phép).', credit: { author: 'Starter', license: 'MIT', url: '' } },
              { src: 'images/art-dawn.svg', caption: 'Phiên bản bình minh của cùng phong cảnh.', credit: { author: 'Starter', license: 'MIT', url: '' } },
              { src: 'images/art-dusk.svg', caption: 'Phiên bản hoàng hôn cho không khí tối.', credit: { author: 'Starter', license: 'MIT', url: '' } },
            ],
          },
        ],
      },
    ],
  },
};
