// ============================================================================
// SONG NGỮ — nối dây và khởi động (Phase 3.36)
// ----------------------------------------------------------------------------
// Tệp này chạy CUỐI CÙNG, và đó là toàn bộ lý do nó tồn tại thành một tệp riêng.
// i18nInit() phải quét được CONFIG, UNIT_LABEL, GOD_POWERS, PRAYERS, GENE_LABELS
// — mà những thứ đó nằm rải từ tệp 01 tới tệp 15. Gọi sớm một tệp là quét trúng
// một nửa bảng, và nửa còn lại sẽ vĩnh viễn không đổi ngôn ngữ: một lỗi im lặng,
// vì màn hình vẫn hiện chữ, chỉ là chữ tiếng Việt lẫn giữa tiếng Anh.
// ============================================================================

// --- Những chỗ KHÔNG tự dựng lại, phải vẽ lại tay sau mỗi lần đổi ngôn ngữ ---
//
// Phần lớn bảng biểu được dựng lại vài lần mỗi giây nên tự đúng. Danh sách dưới
// đây là những chỗ chỉ dựng ĐÚNG MỘT LẦN lúc tải trang, hoặc chỉ dựng khi người
// xem mở ra — chúng là ngoại lệ, và ngoại lệ thì phải kể tên.
onLangChange(() => {
  // Nút quyền năng: dựng bằng innerHTML ở code top-level của 15-input-boot, một
  // lần duy nhất. Không vẽ lại thì sáu cái nút đắt nhất giao diện đứng nguyên
  // tiếng Việt.
  if (typeof renderGodButtons === 'function') renderGodButtons();

  // Ô chọn tốc độ/thu phóng/camera: nội dung <option> là chữ tĩnh trong HTML,
  // đã có data-i18n lo. Nhưng nhãn "đang chọn" của <select> chỉ được trình duyệt
  // vẽ lại khi option đổi, nên không cần làm gì thêm ở đây.

  // Thanh biên niên dán đỉnh: i18nApply vừa đặt #railAge về chuỗi chờ sẵn (nó có
  // data-i18n), nên phải ghi lại giá trị SỐNG ngay — đợi nhịp vẽ kế tiếp thì có
  // một khoảng thấy "The Stone Age" trong khi thế giới đã sang Đồ Sắt.
  if (typeof renderEraPanel === 'function' && typeof tribes !== 'undefined' && tribes.length) renderEraPanel();

  // Bảng đang mở ở cột phải + các lớp phủ trên khung hình.
  if (typeof renderActiveTab === 'function') renderActiveTab();
  if (typeof renderDefendPanel === 'function') renderDefendPanel();
  if (typeof renderLog === 'function') renderLog();
  if (typeof renderEraHistory === 'function') renderEraHistory();

  // Thư khố: dựng lại toàn bộ nếu đang mở. Nó vẽ cả lên canvas nên không thể vá
  // bằng cách thay chữ. Đóng thì bỏ qua — mở lại là tự dựng bằng ngôn ngữ mới.
  if (typeof codexOpen !== 'undefined' && codexOpen) {
    renderCodexTabs();
    renderCodexBody();
  }

  // Tên anh hùng ĐANG SỐNG. "Thương Lang đời 3" được ghép một lần lúc chiêu mộ
  // rồi cất vào u.name, nên không tự đổi theo ngôn ngữ. Ghép lại từ hai mảnh đã
  // giữ riêng (dynasty + heroGen) — bỏ qua thì họ mang chữ "đời 3" tới lúc chết,
  // mà anh hùng thì sống hàng nghìn tick.
  if (typeof units !== 'undefined') {
    for (const u of units) if (u.type === 'hero' && u.dynasty) u.name = heroDisplayName(u);
  }

  // Nút Tạm dừng/Tiếp tục: nhãn do setPauseUI viết, không phải chữ tĩnh.
  if (typeof setPauseUI === 'function') setPauseUI(running);

  // Bài luật chơi được thay trọn innerHTML, nên con số HOLD_TICKS mà 15-input-boot
  // nhét vào lúc khởi động bị cuốn theo. Ghi lại từ CONFIG chứ không tin vào con
  // số viết cứng trong bản dịch — hai chỗ cùng tả một hằng số thì sớm muộn lệch.
  const hold = el('legendWonderHold');
  if (hold) hold.textContent = CONFIG.WONDER.HOLD_TICKS;

  // Nhãn nút ngôn ngữ + trạng thái "đang bật" của hai nút ở trang bìa.
  syncLangUI();
});

// Công tắc ngôn ngữ chỉ còn ở TRANG BÌA (Phase 3.37 bỏ chip trên khung hình — xem
// chú thích #ovChips). Hai nút thật, nút của ngôn ngữ đang dùng sáng lên; không
// còn cái nút một-ô-xoay-vòng phải đoán "bấm vào sẽ ra tiếng gì".
function syncLangUI() {
  for (const b of document.querySelectorAll('#menuScreen .lang-btn')) {
    b.classList.toggle('on', b.dataset.lang === I18N.lang);
  }
}

for (const b of document.querySelectorAll('#menuScreen .lang-btn')) {
  b.addEventListener('click', () => setLang(b.dataset.lang));
}

// Phím L. Đặt ở đây chứ không nhét vào bộ bắt phím của 15-input-boot vì cả cụm
// ngôn ngữ nên đọc được ở một chỗ; và phím này phải chạy được cả khi đang ở
// trang bìa, tức là ngoài mọi điều kiện `bootDone` của bộ kia.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'l' && e.key !== 'L') return;
  if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  setLang(I18N.lang === 'en' ? 'vi' : 'en');
});

i18nInit();
syncLangUI();
