'use strict';
// ============================================================
// 14-ui-panels.js
// ------------------------------------------------------------
// Giao diện DOM ngoài canvas: biểu đồ đường, 5 tờ cột phải, thẻ thông tin khi
// click, hòm đồ anh hùng + tooltip, lớp phủ trên khung hình, thẻ kỷ nguyên.
// Tách cơ học từ civilization.html một-file, dòng 10916–11987.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Render — biểu đồ
// ============================================================
function drawLineChart(canvas, series, shared, heightPx) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 300;
  const H = heightPx || 70;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = width, h = H, pad = 4;
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#191510';
  c.fillRect(0, 0, w, h);

  // Lưới mờ chia canvas làm ba theo chiều dọc: đủ để mắt có mốc đọc độ dốc, không đủ
  // để cạnh tranh với đường dữ liệu. Vẽ TRƯỚC nên đường luôn đè lên trên.
  c.strokeStyle = 'rgba(45,36,25,0.7)';
  c.lineWidth = 1;
  for (let g = 1; g <= 2; g++) {
    const gy = Math.round(h * g / 3) + 0.5;
    c.beginPath(); c.moveTo(pad, gy); c.lineTo(w - pad, gy); c.stroke();
  }

  let gmin = Infinity, gmax = -Infinity;
  if (shared) {
    for (const s of series) for (const v of s.values) { if (v < gmin) gmin = v; if (v > gmax) gmax = v; }
    if (gmin === gmax) { gmin -= 1; gmax += 1; }
  }
  let drawn = 0;
  for (const { values, color } of series) {
    if (values.length < 2) continue;
    let min = gmin, max = gmax;
    if (!shared) {
      min = Math.min(...values); max = Math.max(...values);
      if (min === max) { min -= 1; max += 1; }
    }
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.lineJoin = 'round';
    c.beginPath();
    values.forEach((v, i) => {
      const px = pad + (i / (values.length - 1)) * (w - pad * 2);
      const py = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    });
    c.stroke();
    drawn++;
  }

  // Trạng thái rỗng: một dòng chữ mờ ở giữa, để ô trống đọc ra "đang chờ dữ liệu"
  // chứ không phải "hỏng". Biểu đồ dân số/gen luôn trống ở đầu mỗi kỷ nguyên.
  if (!drawn) {
    c.fillStyle = 'rgba(123,113,96,0.7)';
    c.font = '11px "Avenir Next", system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('chưa đủ dữ liệu để vẽ', w / 2, h / 2);
    c.textAlign = 'start'; c.textBaseline = 'alphabetic';
  }
}

// ============================================================
// Render — panel bên phải
// ============================================================
const el = (id) => document.getElementById(id);

// ============================================================
// GHI HTML VÀO MỘT PANEL MÀ KHÔNG CƯỚP MẤT TRẠNG THÁI :hover
// ============================================================
// Vòng lặp hình vẽ lại mười ba panel mỗi 6 khung hình — khoảng 10 lần/giây — và
// mỗi lần đều bằng `innerHTML = ...`, tức là XOÁ SẠCH rồi dựng lại toàn bộ cây con.
// Hậu quả không nằm ở hiệu năng mà ở CON TRỎ CHUỘT, và nó đo được:
//
//   trước khi dựng lại:  HTML > BODY > #side-pane > #prayerPanel > #prayerBody > .pray-row > DIV > B
//   ngay sau khi dựng:   HTML > BODY > #side-pane > #prayerPanel > #prayerBody
//
// (đo bằng `document.querySelectorAll(':hover')`, cùng một vị trí chuột, chỉ cách
// nhau một lời gọi renderPrayerPanel()). Phần tử mới sinh ra dưới con trỏ KHÔNG
// khớp `:hover` cho tới khi chuột nhúc nhích lần nữa — trình duyệt chỉ tính lại
// chuỗi hover khi con trỏ di chuyển, không tính lại khi DOM đổi dưới chân nó.
//
// Nên ở 10 lần dựng lại mỗi giây, cái viền/nền hover mà người dùng đang ngắm bật
// tắt liên tục: nhích chuột -> sáng lên -> 100ms sau dựng lại -> tắt -> nhích ->
// sáng. Đó chính xác là "hover vào bộ lạc để click nó cứ giật giật".
//
// Hệ quả thứ hai, nặng hơn và im lặng hơn: `mousedown` rơi vào thẻ A, panel dựng
// lại, `mouseup` rơi vào thẻ B mới toanh. Sự kiện `click` chỉ bắn trên tổ tiên
// chung gần nhất của hai thẻ đó — tức là cái CONTAINER, không phải cái nút. Mọi
// listener uỷ quyền trong file này đều lọc bằng `e.target.closest('...')`, mà từ
// container thì `closest` không bao giờ tìm ngược xuống được. Cú bấm bốc hơi
// không một dấu vết. Một cú click của người thật kéo dài 80-150ms, còn nhịp dựng
// lại là 100ms — nên đây không phải trường hợp hiếm.
//
// Đây là cùng một con lỗi mà chú giải vật phẩm đã phải đi vòng ở Phase 3.14 (xem
// syncItemTip: nó bỏ `mouseover` và bám theo `mousemove` + khoá món đồ, chính vì
// lý do này). Lần đó chữa triệu chứng ở đúng một chỗ; đây là chữa cái bệnh.
//
// HAI cửa, và cửa đầu tiên gánh phần lớn:
const PANEL_HOVER_HOLD_MS = 1500;
function setPanelHTML(node, html) {
  // 1. Nội dung y HỆT lần trước -> không đụng vào DOM một chút nào. Bảng nâng cấp,
  //    bảng anh hùng, lịch sử kỷ nguyên, khay quyền năng gần như không đổi giữa hai
  //    lần vẽ, nên riêng dòng này đã xoá hẳn hiện tượng ở phần lớn giao diện — và
  //    nó còn tiết kiệm thật sự, vì parse HTML là phần đắt nhất của mỗi lần vẽ.
  if (node.__panelHTML === html) return;
  // 2. Con trỏ đang nằm TRONG panel -> hoãn. Người dùng đang NGẮM để bấm, và trong
  //    lúc ngắm thì một bảng đứng yên đúng hơn một bảng nhấp nháy. Container không
  //    bao giờ bị thay (chỉ ruột của nó bị), nên chính nó vẫn giữ `:hover` — đó là
  //    lý do phép thử này tin được, và cũng chính là điều mà phép đo ở trên chứng
  //    minh (chuỗi hover đứt Ở DƯỚI #prayerBody, không đứt ở trên nó).
  //
  //    CÓ HẠN, không hoãn vô tận: đặt chuột lên bảng rồi bỏ đấy mà xem bản đồ thì
  //    số liệu phải vẫn chạy. Hoãn tối đa 1,5 giây -> lúc rê chuột để bấm (dưới một
  //    giây) là KHÔNG nháy lần nào, còn lúc để quên chuột ở đó thì bảng vẫn cập
  //    nhật, chỉ chậm lại còn ~0,7 lần/giây.
  if (node.matches(':hover') && performance.now() - (node.__panelAt || 0) < PANEL_HOVER_HOLD_MS) return;
  node.innerHTML = html;
  node.__panelHTML = html;
  node.__panelAt = performance.now();
}

// ============================================================
// NĂM TỜ CỦA CỘT DỮ LIỆU
// ============================================================
// Danh sách này phải khớp từng chữ với `data-tab` trong HTML và với `.tabpane` ở
// CSS — ba chỗ, một sự thật. Thứ tự ở đây cũng là thứ tự phím 1-5.
const PANE_TABS = ['god', 'tribe', 'hero', 'chron', 'tune'];
let activeTab = 'god';
const sidePane = el('side-pane');

function setTab(name) {
  if (!PANE_TABS.includes(name) || name === activeTab) return;
  activeTab = name;
  for (const b of document.querySelectorAll('.pane-tab')) {
    b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false');
  }
  for (const s of document.querySelectorAll('.tabpane')) {
    s.classList.toggle('on', s.dataset.tab === name);
  }
  sidePane.scrollTop = 0;
  // Dựng NGAY, không đợi tới mốc 6 frame kế: 100ms trễ trên một tờ vừa mở ra là
  // 100ms nhìn vào một cái khung rỗng, và mắt đọc đó là "bấm hụt".
  renderPrayerPanel();
  renderActiveTab();
}

// Chỉ dựng lại tờ ĐANG MỞ. Lý do đầu tiên không phải tiết kiệm mà là đúng/sai:
// một canvas nằm trong `display:none` có getBoundingClientRect().width bằng 0, nên
// drawLineChart rơi vào nhánh dự phòng 300px, ghi một backing store 300px rồi để
// CSS kéo giãn nó ra 380px — mở tờ đó lên là thấy biểu đồ nhoè cho tới lần vẽ sau.
// Vẽ đúng lúc mở thì chuyện đó không bao giờ xảy ra.
//
// Không có nhánh 'god': renderPrayerPanel() phải chạy ở MỌI tờ vì nó nuôi con dấu
// trên hàng tờ (xem cuối hàm đó). Không có nhánh 'tune': toàn ô nhập tay.
function renderActiveTab() {
  if (activeTab === 'tribe') { renderTribeBoard(); renderGenomePanel(); renderUpgradePanel(); }
  else if (activeTab === 'hero') { renderHeroPanel(); }
  else if (activeTab === 'chron') { renderLog(); renderEraHistory(); renderCharts(); renderGeneChart(); }
}

el('paneTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.pane-tab');
  if (b) setTab(b.dataset.tab);
});

function renderEraPanel() {
  el('statEra').textContent = era;
  el('statTick').textContent = `${tick.toLocaleString('vi-VN')} / ${CONFIG.ERA.MAX_TICKS.toLocaleString('vi-VN')}`;
  el('eraFill').style.width = (clamp(tick / CONFIG.ERA.MAX_TICKS, 0, 1) * 100).toFixed(2) + '%';
  // Thanh biên niên nói THỜI ĐẠI CAO NHẤT đang có mặt trên bản đồ, không nói
  // thời đại trung bình: câu hỏi người xem thật sự hỏi ở đây là "thế giới này
  // đã đi tới đâu rồi", và câu đó do kẻ dẫn đầu trả lời.
  const live = tribes.filter(t => t.alive);
  const topAge = live.length ? Math.max(...live.map(t => t.age)) : 0;
  el('railAge').textContent = CONFIG.AGE.NAMES[topAge];
  el('statAlive').textContent = tribes.filter(t => t.alive).length;
  let mon = 0, raiding = 0;
  for (const u of units) {
    if (u.type !== 'monster') continue;
    mon++;
    if (u.raidTribe >= 0) raiding++;
  }
  el('statPop').textContent = units.length - mon;
  // Số con đang ĐI CƯỚP quan trọng hơn tổng số quái: tổng số gần như đứng yên cả
  // kỷ nguyên (trần quân số mỗi hang), còn con số này là thứ duy nhất báo cho
  // người xem biết ngay lúc này có ai đang bị tràn vào nhà hay không.
  el('statMonsters').textContent = raiding ? `${mon}  (🩸${raiding} đi cướp)` : mon;
  // Cấp cao nhất trên bản đồ là chỉ số "bản đồ đã nguy hiểm tới đâu" — số hang
  // còn lại một mình không nói được gì, vì nó gần như luôn là 9.
  const maxTier = lairs.length ? Math.max(...lairs.map(l => l.tier)) : 0;
  const t3 = lairs.filter(l => l.tier >= 3).length;
  el('statLairs').textContent = `${lairs.length} / ${CONFIG.MONSTER.LAIRS}` +
    (lairs.length ? `  · cấp cao nhất ${maxTier}${t3 ? ` (${t3} Tổ Quỷ)` : ''}` : '');
  renderDefendPanel();
}

function renderDefendPanel() {
  const on = gameMode === 'defend';
  el('defendTitle').style.display = on ? '' : 'none';
  el('defendPanel').style.display = on ? '' : 'none';
  if (!on) return;
  let assault = 0;
  for (const u of units) if (u.type === 'monster' && u.assault) assault++;
  el('defendSurvived').textContent = tick;
  el('defendRecord').textContent = survivalRecord;
  el('defendWave').textContent = waveNumber;
  el('defendNext').textContent = eraState === 'playing' ? `${Math.max(0, nextWaveTick - tick)} tick` : '—';
  el('defendAssault').textContent = assault;
  el('defendAlive').textContent = `${tribes.filter(t => t.alive).length} / ${CONFIG.TRIBE_COUNT}`;
}

function renderGodPanel() {
  el('faithLabel').textContent = `${Math.floor(faith)} / ${CONFIG.GOD.FAITH_MAX}`;
  el('faithFill').style.width = (faith / CONFIG.GOD.FAITH_MAX * 100) + '%';
  for (const p of GOD_POWERS) {
    const btn = el('god_' + p.id);
    if (!btn) continue;
    btn.disabled = faith < p.cost;
    btn.classList.toggle('armed', armedPower === p.id);
  }
}

function setGodHint(text) { el('godHint').textContent = text; }

// Bảng lời khẩn cầu. Mỗi thẻ là một câu hỏi thật gửi tới người xem, kèm đủ dữ kiện
// để trả lời nó: ai xin, xin gì, vì sao, họ đã dâng tế bao nhiêu lần, và ban phước
// cho họ thì mạnh gấp mấy. Không có ba con số cuối thì "ban phước cho người thành
// tâm" chỉ là một câu khẩu hiệu chứ không phải một quyết định.
function renderPrayerPanel() {
  const rows = [];
  let pending = 0;
  for (const t of tribes) {
    if (!t.alive) continue;
    const m = blessMultiplier(t);
    if (t.prayer) {
      pending++;
      const P = PRAYERS[t.prayer.kind];
      const left = Math.max(0, t.prayer.until - tick);
      const can = faith >= CONFIG.WORSHIP.BLESS_COST;
      rows.push(`<div class="pray-row">
        <div><span class="swatch" style="background:${t.color}"></span><b style="color:${P.color}">${P.label}</b>
          <span style="color:var(--bone-3)">— ${t.name}, ${P.desc}</span></div>
        <div style="font-size:10.5px;color:var(--bone-3);margin-top:3px;line-height:1.5;">
          đã dâng tế <b style="color:var(--gold)">${t.offers}</b> lần · thành tâm ${t.piety.toFixed(0)}
          · ban phước sẽ mạnh <b style="color:var(--gold)">×${m.toFixed(2)}</b> · tắt sau ${left} tick</div>
        <button class="pray-btn" data-pray="${t.id}" ${can ? '' : 'disabled'}>Đáp lời<span class="pb-cost">${CONFIG.WORSHIP.BLESS_COST} đức tin</span></button>
      </div>`);
    } else if (t.blessUntil >= tick) {
      const P = PRAYERS[t.blessKind] || { icon: '✨', label: 'phước lành' };
      rows.push(`<div class="pray-row pray-row--active">
        <span class="swatch" style="background:${t.color}"></span>${t.name}
        <span style="color:var(--gold)">đang mang ${P.label.toLowerCase()}</span>
        <span style="color:var(--bone-3)">— còn ${t.blessUntil - tick} tick</span></div>`);
    }
  }
  // Con dấu chu sa trên tên tờ "Chúa Tể" — hàm này vì thế chạy ở MỌI tờ, không
  // chỉ khi tờ đó đang mở. Lời khẩn cầu TẮT sau vài trăm tick; giấu nó sau một
  // tab mà không có tín hiệu nào ra ngoài là biến một cơ chế có hạn giờ thành
  // một cơ chế người xem chỉ tình cờ bắt gặp.
  const badge = el('badgePray');
  if (badge.__n !== pending) {
    badge.__n = pending;
    badge.textContent = pending || '';
    badge.classList.toggle('on', pending > 0);
  }
  if (activeTab !== 'god') return;
  setPanelHTML(el('prayerBody'), rows.join(''));
  el('prayerHint').style.display = rows.length ? 'none' : '';
}

// Bảng nâng cấp: 4 bộ lạc × 5 nhánh, mỗi ô ba chấm.
//
// Vì sao là một BẢNG CHÉO chứ không phải bốn khối riêng: thứ đáng đọc ở đây không
// phải "bộ lạc A có gì" mà là "bốn bộ lạc đang khác nhau ở chỗ nào". Xếp thành
// lưới thì một cột toàn chấm vàng đọc ra ngay là "cả thiên hạ đang chạy đua rèn
// binh khí", còn một ô sáng lẻ loi là một bộ lạc đang đi đường riêng — và đó
// chính là thứ mà gen chiến lược đang quyết định, hiện ra thành hình.
// ============================================================
// BẢNG NÂNG CẤP — vì sao cột "Đang nghiên cứu" đã bị XOÁ (Phase 3.30)
// ============================================================
// Đo thật: bảng rộng 478px nằm trong một panel 374px — TRÀN 117px ra ngoài, câm
// lặng, vì cột phải có overflow ẩn. Nguyên nhân là số học đơn giản: 8 nhánh × 36px
// (nhánh thứ tám, Nề đá, mới thêm ở 3.29) + tên bộ lạc 81 + "Đang nghiên cứu" 109.
//
// Cách chữa KHÔNG phải thu nhỏ chữ mà là bỏ hẳn cột cuối, vì nó chở một thông tin
// đã có chỗ tốt hơn: nhánh đang chạy vốn đã được tô nền vàng ngay trong lưới. Đưa
// thanh tiến độ vào CHÍNH Ô ĐÓ thì cùng một dữ liệu nằm đúng chỗ nó nói về, và
// bảng gọn lại còn 9 cột. Một cột nói "Rèn binh khí 2" trong khi ô Rèn binh khí
// đang sáng vàng ngay bên trái là một câu lặp lại, không phải một cột.
function renderUpgradePanel() {
  const anyResearch = tribes.some(t => t.alive && t.research);
  const head = UPGRADE_LINES.map(k => {
    const L = CONFIG.UPGRADE.LINES[k];
    return `<th title="${L.label} — ${L.scope}. Mở ở ${CONFIG.AGE.NAMES[L.age]}, nghiên cứu tại ${CONFIG.BUILD[L.build].label}.">${L.icon}</th>`;
  }).join('');
  let html = `<table class="board up-board"><tr><th>Bộ lạc</th>${head}</tr>`;
  for (const t of tribes) {
    const cells = UPGRADE_LINES.map(k => {
      const running = t.research && t.research.line === k;
      let inner = pipHTML(t.upgrades[k]);
      if (running) {
        const total = CONFIG.UPGRADE.TICKS[t.research.level] || 1;
        const left = Math.max(0, t.research.until - tick);
        const pct = ((1 - left / total) * 100).toFixed(0);
        inner += `<span class="bar up-bar" title="đang nghiên cứu ${CONFIG.UPGRADE.LINES[k].label} cấp ${t.research.level} — ${pct}%">
          <div style="width:${pct}%;background:var(--gold)"></div></span>`;
      }
      return `<td class="up-cell${running ? ' on' : ''}">${inner}</td>`;
    }).join('');
    html += `<tr class="${t.alive ? '' : 'dead'}" data-tribe="${t.id}">
      <td><span class="swatch" style="background:${t.color}"></span><span class="tribe-name">${t.name}</span></td>
      ${cells}</tr>`;
  }
  html += '</table>';
  // Trạng thái rỗng: không có nó thì trong ~1.500 tick đầu của mọi kỷ nguyên bảng
  // này là một lưới hai mươi chấm xám không nói gì, và người xem kết luận sai rằng
  // cơ chế đang hỏng. Nói thẳng ra là "chưa tới lúc" thì nó thành một CÁI HẸN.
  if (!anyResearch && tribes.every(t => UPGRADE_LINES.every(k => !t.upgrades[k]))) {
    html += `<div class="hint" style="margin-top:6px;">Chưa bộ lạc nào đủ dư dả để nghiên cứu. Nhánh đầu tiên (${CONFIG.UPGRADE.LINES.melee.icon} Rèn binh khí) mở ngay từ Đồ Đá, nhưng cần Trại lính và kho lương trên mức dự trữ.</div>`;
  }
  setPanelHTML(el('upgradeBody'), html);
}

function renderTribeBoard() {
  // MỘT CỘT CHO CẢ DÂN LẪN QUÂN (Phase 3.30), và nó không chỉ là chuyện chỗ:
  // từ bản này mỗi người lính được ĐỔI RA từ một dân thường, nên "dân" và "quân"
  // là hai phần của CÙNG một cái trần. Để chúng ở hai cột rời là vẽ ra hai cái ví
  // trong khi thực tế chỉ có một, và người xem không đọc được đánh đổi trung tâm
  // của cả nền kinh tế. Ba con số `dân/quân/trần` đọc một lượt bằng một đường mắt.
  //
  // Nhãn tài nguyên đổi thành BIỂU TƯỢNG: bốn chữ "Lương/Gỗ/Vàng/Đá" chiếm bề
  // ngang nhiều hơn chính con số bên dưới chúng, mà đây là bảng bị bó cứng trong
  // 420px. Biểu tượng giữ nguyên nghĩa (giữ `title` cho người chưa quen) và trả
  // lại bề ngang cho thứ đang thực sự thay đổi mỗi tick.
  // Cột thời đại hiện SỐ + ô màu mái, không hiện tên. Tên đầy đủ ("Thiên Triều")
  // rộng hơn cả cột tài nguyên bên cạnh mà nó chỉ chở đúng một con số từ 1 tới 5;
  // ô màu mái là cùng ngôn ngữ hình mà bảng phủ trên khung hình đang dùng, nên hai
  // bảng đọc giống nhau. Tên đầy đủ vẫn còn trong `title`.
  const rows = [`<tr><th>Bộ lạc</th><th title="thời đại 1-5">Đại</th>` +
    `<th title="dân thường / quân đội / trần dân số — cùng MỘT cái trần, vì mỗi người lính được đổi ra từ một dân thường">👥</th>` +
    `<th title="cơ cấu quân: bộ binh / cung thủ / kỵ binh + voi / máy bắn đá + nỏ thần">⚔</th>` +
    `<th title="lương thực">🌾</th><th title="gỗ">🪵</th><th title="vàng">🪙</th><th title="đá">🪨</th>` +
    `<th title="điểm bộ lạc">Điểm</th></tr>`];
  const ranked = tribes.slice().sort((a, b) => tribeScore(b) - tribeScore(a));
  for (const t of ranked) {
    const s = t.stats || { villagers: 0, soldiers: 0, melee: 0, archers: 0, catapults: 0, cavalry: 0, popCap: 0, bcount: {} };
    // Huy hiệu trạng thái gom vào một cụm KHÔNG XUỐNG DÒNG, mỗi cái một ký tự — trước
    // đây cụm chinh phạt còn kéo theo cả TÊN mục tiêu nên ô tên phình ra làm bảng vỡ cột.
    const war = t.warTarget !== null && t.alive ? `<span class="tag" style="color:var(--cinnabar-hi)" title="đang chinh phạt ${tribes[t.warTarget].name}">⚔</span>` : '';
    const starve = t.starving && t.alive ? `<span class="tag" style="color:var(--cinnabar-hi)" title="nạn đói">✖</span>` : '';
    const wonder = s.bcount && s.bcount.wonder ? `<span class="tag" style="color:var(--gold)" title="đang có Kỳ quan">🏛</span>` : '';
    // THIÊN MỆNH — huy hiệu này trả lời một câu mà không có nó thì người xem không
    // có cách nào đọc ra: vì sao bộ lạc giàu nhất bản đồ vẫn không khởi công Kỳ
    // quan. Điều kiện mới (hạ được kinh đô địch) xảy ra ở một trận đánh có thể diễn
    // ra ở góc bản đồ khác, hàng nghìn tick trước.
    const mandate = (gameMode !== 'defend' && t.alive && t.townsRazed >= CONFIG.WONDER.NEED_TOWNS)
      ? `<span class="tag" style="color:var(--gold-hi)" title="đã hạ ${t.townsRazed} kinh đô địch — đủ Thiên mệnh để khởi công Kỳ quan">👑</span>` : '';
    const pray = t.prayer ? `<span class="tag" style="color:var(--gold)" title="đang khẩn cầu: ${PRAYERS[t.prayer.kind].label}">🙏</span>` : '';
    const blessed = t.blessUntil >= tick ? `<span class="tag" style="color:var(--gold-hi)" title="đang mang phước lành">✨</span>` : '';
    // Thầy lang vào cụm HUY HIỆU chứ không thành con số thứ năm của cột quân đội.
    // Cột đó tồn tại để đọc CƠ CẤU quân — thứ mà hai gen rangedRatio/militaryRatio
    // đang điều khiển; nhét vào đó một loại không đánh nhau, trần cứng ở 5, là làm
    // loãng đúng cái tín hiệu nó sinh ra để chở. Ở đây nó trả lời một câu khác:
    // "bộ lạc này có hệ thống y tế chưa", và đó đúng là một trạng thái, như đói
    // hay như đang khẩn cầu. Dùng lá thuốc chứ không dùng chữ thập đỏ — cùng lý do
    // đã viết ở hình vẽ Nhà y tế.
    const heal = s.healers ? `<span class="tag" style="color:#7ab27c" title="${s.healers} thầy lang đang theo quân">🌿${s.healers}</span>` : '';
    // QUÂN KỲ vào cụm huy hiệu cùng thầy lang, và đúng cùng lý lẽ đã viết ngay trên:
    // nó không đánh nhau, trần cứng ở 3, nên nhét vào cột cơ cấu quân là làm loãng
    // tín hiệu mà cột đó chở. Ở đây nó trả lời "bộ lạc này có chỉ huy chiến trường
    // chưa" — một trạng thái, như đói hay như đang khẩn cầu.
    const rally = s.standards ? `<span class="tag" style="color:var(--gold)" title="${s.standards} quân kỳ đang cổ vũ toàn quân">⚑${s.standards}</span>` : '';
    // ĐỘI HẬU CẦN + số TRẠI đang đứng, gộp vào MỘT huy hiệu. Hai con số này chỉ có
    // nghĩa khi đọc cùng nhau: bốn đội hậu cần mà không cái trại nào nghĩa là đạo
    // quân chưa ra khỏi nhà (hoặc bộ lạc hết lương), còn hai đội với hai cái trại là
    // một chiến dịch đang thật sự chạy. Tách làm hai huy hiệu thì phải liếc hai lần
    // để rút ra một kết luận.
    const camps = s.bcount && s.bcount.camp ? `+${s.bcount.camp}⛺` : '';
    const supply = s.quarters
      ? `<span class="tag" style="color:#d8b25c" title="${s.quarters} đội hậu cần${s.bcount && s.bcount.camp ? ` · ${s.bcount.camp} trại tiếp tế đang đứng` : ' · chưa dựng trại nào'}">🎒${s.quarters}${camps}</span>` : '';
    // CÒN THIẾU GÌ ĐỂ LÊN ĐỜI. Đọc `ageBlock` — cùng một nguồn sự thật mà bộ não
    // dùng để quyết định (xem khối chú thích ở đó), nên dòng chữ này không thể nói
    // khác với thứ đang thật sự xảy ra. Chỉ hiện khi CÓ vật cản: một huy hiệu luôn
    // sáng thì mắt thôi nhìn nó sau vài phút.
    const abReason = t.alive ? ageBlock(t) : null;
    const ageWall = abReason && abReason !== 'đã tới bậc cuối'
      ? `<span class="tag" style="color:#c98f6a" title="chưa lên ${CONFIG.AGE.NAMES[t.age + 1]} được: ${abReason}">⛯</span>` : '';
    const tags = (war || starve || wonder || mandate || pray || blessed || heal || rally || supply || ageWall)
      ? `<span class="tags">${war}${starve}${wonder}${mandate}${pray}${blessed}${heal}${rally}${supply}${ageWall}</span>` : '';
    // Quân đội hiện thành BỐN con số chứ không một tổng: cơ cấu quân mới là thứ
    // hai gen rangedRatio và militaryRatio đang điều khiển, mà một cột tổng thì
    // giấu đúng cái đó đi. Kỵ binh tô vàng — nó là cột duy nhất ở đây chỉ xuất
    // hiện từ Đồ Sắt trở đi, nên nó cũng là dấu hiệu "bộ lạc này đã đi xa tới đâu".
    // VOI CHIẾN gộp vào ô KỴ BINH (cùng ra lò từ Chuồng ngựa, cùng vai "quân nặng
    // đắt tiền"), NỎ THẦN gộp vào ô MÁY BẮN ĐÁ (cùng Xưởng thợ, cùng vai khí tài).
    // Cố ý KHÔNG thêm cột thứ năm và thứ sáu: cột này đọc CƠ CẤU quân — thứ mà hai
    // gen rangedRatio/militaryRatio điều khiển — và sáu con số cạnh nhau thì không
    // ai đọc ra tỉ lệ nữa, chỉ đọc ra một dãy số. Bốn ô giữ nguyên bốn VAI TRÒ;
    // loại mới vào đúng vai của nó thay vì mở một ô riêng.
    const siegeN = (s.catapults || 0) + (s.ballistas || 0);
    const heavyN = (s.cavalry || 0) + (s.elephants || 0);
    const army = `${s.melee || 0}<span style="color:var(--bone-3)">/</span>${s.archers || 0}`
      + `<span style="color:var(--bone-3)">/</span><span style="color:${heavyN ? 'var(--gold)' : 'inherit'}" title="kỵ binh ${s.cavalry || 0} · voi chiến ${s.elephants || 0}">${heavyN}</span>`
      + `<span style="color:var(--bone-3)">/</span><span title="máy bắn đá ${s.catapults || 0} · nỏ thần ${s.ballistas || 0}">${siegeN}</span>`;
    rows.push(`<tr class="${t.alive ? '' : 'dead'}" data-tribe="${t.id}" title="Click để camera nhảy tới kinh đô">
      <td><span class="swatch" style="background:${t.color}"></span><span class="tribe-name">${t.name}</span>${tags}</td>
      <td title="${CONFIG.AGE.NAMES[t.age]} — mái ${AGE_MAT[t.age].name}"><span class="swatch" style="background:${AGE_MAT[t.age].roof}"></span>${t.age}</td>
      <td class="pop3" title="${s.villagers} dân thường · ${s.soldiers} quân · trần ${s.popCap}">${s.villagers}<span
        class="sl">/</span><span style="color:var(--gold)">${s.soldiers}</span><span
        class="sl">/</span><span style="color:var(--bone-3)">${s.popCap}</span></td>
      <td>${army}</td>
      <td>${Math.round(t.res.food)}</td>
      <td>${Math.round(t.res.wood)}</td>
      <td>${Math.round(t.res.gold)}</td>
      <td>${Math.round(t.res.stone)}</td>
      <td>${tribeScore(t)}</td>
    </tr>`);
  }
  setPanelHTML(el('tribeBoard'), rows.join(''));
}

// ============================================================
// BỘ GEN ĐANG SỐNG — hai mươi gen của bốn bộ lạc trước mắt
// ============================================================
// Vì sao bảng này đáng tồn tại bên cạnh hai chỗ đã hiện gen: cả hai chỗ kia đều
// nói về QUÁ KHỨ và đều chỉ nói về MỘT bộ lạc. Thẻ tổng kết kỷ nguyên hiện 6 gen
// của nhà vô địch rồi tắt; đồ thị ở tờ Biên niên vẽ 6 gen ấy, một điểm mỗi kỷ
// nguyên. Suốt quãng thời gian người xem thật sự ngồi xem — cả kỷ nguyên đang
// chạy — không có cách nào biết bốn bộ lạc trên bản đồ khác nhau ở chỗ nào, nên
// mọi hành vi đều đọc ra như nhau: bốn cái AI giống hệt. Mà cả trò chơi này nằm ở
// chỗ chúng KHÔNG giống nhau.
//
// ĐỦ 20 GEN, không phải 6 như HEADLINE_GENES. Hai bảng trả lời hai câu khác nhau:
// sáu gen kia được chọn vì đường trôi của chúng qua nhiều kỷ nguyên mang tín hiệu
// CHỌN LỌC (xem khối chú thích ở HEADLINE_GENES) — đó là tiêu chí của một cái đồ
// thị. Ở đây câu hỏi là "bốn nhà này là bốn ai", và với câu đó thì gen nào cũng
// có phần: `expansion` không đáng vẽ đường nhưng nó là thứ giải thích vì sao một
// bộ lạc có nhà nằm ngoài tường thành.
//
// Chuẩn hoá theo `bounds` chứ không theo `range`: `range` là khoảng GIEO ban đầu,
// còn đột biến được phép đi ra ngoài nó (xem mutatePolicy — nó kẹp vào bounds).
// Chuẩn hoá theo range thì một gen đã trôi ra ngoài sẽ cho thanh dài hơn 100% và
// bảng nói dối đúng ở những ca đáng xem nhất.
function renderGenomePanel() {
  const keys = Object.keys(POLICY_SPEC);
  // Mốc so sánh = nhà vô địch kỳ TRƯỚC, tức nguồn gốc của ba trong bốn bộ gen đang
  // sống. eraHistory lưu mới-nhất-trước nên phần tử 0 là kỷ nguyên vừa khép lại.
  const parent = eraHistory.length ? eraHistory[0].policy : null;
  // Bộ lạc đã diệt vong thì mờ cả CỘT, không mờ hàng nào: ở bảng này hàng là gen
  // còn cột mới là bộ lạc. Vẫn giữ chúng trong bảng chứ không xoá — bộ gen của kẻ
  // vừa chết là nửa còn lại của câu chuyện chọn lọc đang diễn ra.
  const head = [`<tr><th></th>` + tribes.map(t =>
    `<th class="${t.alive ? '' : 'dead'}" title="${t.name} — dòng dõi: ${t.lineage}">` +
    `<span class="swatch" style="background:${t.color}"></span>${t.name}` +
    `<span class="lin">${t.lineage}</span></th>`).join('') + `</tr>`];
  for (const k of keys) {
    const spec = POLICY_SPEC[k];
    const span = spec.bounds[1] - spec.bounds[0] || 1;
    const norm = (v) => clamp((v - spec.bounds[0]) / span, 0, 1);
    const mark = parent && parent[k] !== undefined
      ? `<i class="gmark" style="left:${(norm(parent[k]) * 100).toFixed(1)}%"></i>` : '';
    const cells = tribes.map(t => {
      const v = t.policy[k];
      // Số chữ số thập phân theo ĐỘ LỚN của gen, không phải một hằng số: `expansion`
      // chạy 12..140 nên "56,00" tốn hai ký tự để nói không thêm gì, còn `piety`
      // chạy 0..1 nên "0,4" thì mất đúng phần đang biến thiên.
      //
      // Ngưỡng 20 chứ không 10, và bản đầu để 10 rồi bị chính màn hình bác bỏ: ở
      // ngưỡng đó `farmTarget` (0..12) làm tròn thành "4" trong khi `towerTarget`
      // (0..8) ngay dưới nó hiện "2,01" — hai gen ĐẾM CÙNG MỘT THỨ mà đọc ra như hai
      // loại đại lượng khác nhau. Phần lẻ ở đây không phải nhiễu: nó chính là bước
      // đột biến đang trôi, tức là thứ duy nhất bảng này sinh ra để cho thấy.
      const txt = spec.bounds[1] > 20 ? v.toFixed(0) : v.toFixed(2);
      return `<td class="${t.alive ? '' : 'dead'}"><span class="gcell" title="${GENE_LABELS[k]} — ${t.name}: ${v.toFixed(3)}` +
        (parent ? ` · nhà vô địch kỳ trước: ${parent[k].toFixed(3)}` : '') +
        ` · khoảng cho phép ${spec.bounds[0]}–${spec.bounds[1]}">` +
        `<i class="gbar" style="width:${(norm(v) * 100).toFixed(1)}%;background:${t.color}"></i>${mark}` +
        `<span class="gv">${txt}</span></span></td>`;
    }).join('');
    head.push(`<tr><td title="${GENE_LABELS[k]}">${GENE_LABELS[k]}</td>${cells}</tr>`);
  }
  setPanelHTML(el('genomeBody'), head.join(''));
}

// ------------------------------------------------------------
// Hòm đồ của anh hùng
// ------------------------------------------------------------
// Vật phẩm nào rơi ra từ con quái nào — suy NGƯỢC từ MONSTER_DROPS thay vì chép tay
// một bảng thứ hai. Bảng chép tay sẽ đúng ở lần đầu rồi lệch dần từ lần sửa thứ hai,
// và cái lệch đó không bao giờ báo lỗi: nó chỉ lặng lẽ dạy người xem đi săn sai loài.
let ITEM_SOURCES = null;
function itemSources(key) {
  if (!ITEM_SOURCES) {
    ITEM_SOURCES = {};
    for (const m in MONSTER_DROPS) {
      for (const it of MONSTER_DROPS[m]) {
        (ITEM_SOURCES[it] || (ITEM_SOURCES[it] = new Set())).add(CONFIG.MONSTER.TYPES[m].label);
      }
    }
  }
  return ITEM_SOURCES[key] ? [...ITEM_SOURCES[key]] : [];
}

// Các dòng chỉ số của một món đồ. Đọc thẳng từ CONFIG.ITEM.TYPES và nhân đúng cái hệ
// số thời đại mà recomputeHeroStats dùng — nên con số trong chú giải LÀ con số thật
// mà anh hùng này nhận được, không phải một bản chép gần đúng.
function itemStatRows(key, hero, lv) {
  const it = CONFIG.ITEM.TYPES[key];
  const b = hero ? hero.ageBonus : null;
  const m = itemLevelMult(lv);
  const out = [];
  if (it.attack)    out.push(['Sát thương', `+${(it.attack * m * (b ? b.atk : 1)).toFixed(1)}`]);
  if (it.maxHp)     out.push(['Máu tối đa', `+${Math.round(it.maxHp * m * (b ? b.hp : 1))}`]);
  if (it.speedMult) out.push(['Tốc độ đi', `+${(it.speedMult * m * 100).toFixed(0)}%`]);
  if (it.auraR)     out.push(['Tầm hào quang', `+${(it.auraR * m).toFixed(1)} ô`]);
  if (it.auraMult)  out.push(['Lực hào quang', `+${(it.auraMult * m * 100).toFixed(0)}%`]);
  return out;
}

function itemTipHTML(key, hero, lv) {
  const it = CONFIG.ITEM.TYPES[key];
  const L = clamp(Math.round(lv || 1), 1, CONFIG.ITEM.MAX_LEVEL);
  const kv = itemStatRows(key, hero, L)
    .map(([l, v]) => `<span class="l">${l}</span><span class="v">${v}</span>`).join('');
  const src = itemSources(key);
  // Dòng cấp nói ra CÁI GIÁ đã trả để có nó, không chỉ nói con số: người xem cần
  // biết một món cấp III là bốn món cấp I đã bị nung, nếu không thì "III" chỉ là
  // một chữ số trang trí trên ô đồ.
  const lvLine = L > 1
    ? `<div class="ti-src" style="color:var(--gold)">Cấp ${CONFIG.ITEM.LEVEL_TAG[L]} — hợp nhất từ ${1 << (L - 1)} món · chỉ số ×${itemLevelMult(L).toFixed(1)}</div>`
    : `<div class="ti-src">Hòm đầy mà nhặt thêm thì hai món cùng loại cùng cấp tự hợp nhất lên cấp trên.</div>`;
  return `<div class="ti-hd" style="color:${it.color}"><span>${it.icon}</span><span>${it.label}${L > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[L] : ''}</span></div>
    <div class="ti-kv">${kv}</div>
    <div class="ti-note">${it.blurb}</div>
    ${lvLine}
    ${src.length ? `<div class="ti-src">Rơi từ: ${src.join(' · ')}</div>` : ''}
    ${hero ? '' : '<div class="ti-src">Chỉ số chưa nhân hệ số thời đại.</div>'}`;
}

// HÒM ĐỒ. Luôn vẽ đủ MAX_HELD ngăn, kể cả ngăn rỗng: cái người xem cần biết không
// phải "đang cầm gì" mà là "còn chỗ không" — đó mới là thứ quyết định anh hùng có
// đi vòng qua nhặt món đồ đang nằm giữa đồng hay đi thẳng vào trận.
//
// `data-item` + `data-hero` là toàn bộ giao kèo với lớp chú giải bên dưới; nhờ vậy
// cùng một mẩu HTML này dùng được ở cả ba bảng mà không chỗ nào phải tự gắn sự kiện.
// Chỉ phần Ô — tách riêng để dải "đang chọn" dưới bảng điều khiển dùng lại được
// mà không kéo theo tiêu đề và kho đền. Một nguồn duy nhất cho cả hai chỗ, nên
// khi số ngăn đổi (3 -> 6 ở bản này) thì không có chỗ nào bị bỏ sót.
function heroSlotsHTML(hero) {
  const held = hero ? hero.items : [];
  const cells = [];
  for (let i = 0; i < CONFIG.ITEM.MAX_HELD; i++) {
    const h = held[i];
    if (!h) { cells.push('<div class="slot empty"></div>'); continue; }
    const it = CONFIG.ITEM.TYPES[h.key];
    const lv = clamp(Math.round(h.lv || 1), 1, CONFIG.ITEM.MAX_LEVEL);
    // Nhãn cấp là chữ số La Mã ở góc, KHÔNG phải một màu viền khác: màu viền đòi
    // một mẫu đối chiếu đặt cạnh mới đọc được, mà sáu ngăn thì hiếm khi có hai ô
    // cùng loại khác cấp đứng cạnh nhau. Chữ thì đọc được một mình.
    cells.push(`<div class="slot full${lv > 1 ? ' lv' + lv : ''}" data-item="${h.key}" data-lv="${lv}"${hero ? ` data-hero="${hero.id}"` : ''} aria-label="${it.label}${lv > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[lv] : ''}">
      <span class="glow" style="background:${it.color}"></span><span class="ico">${it.icon}</span>${lv > 1 ? `<span class="lvtag">${CONFIG.ITEM.LEVEL_TAG[lv]}</span>` : ''}</div>`);
  }
  return cells.join('');
}

function heroChestHTML(hero, tribe) {
  const held = hero ? hero.items : [];
  const cells = heroSlotsHTML(hero);
  // Kho đền chỉ hiện khi có thánh vật: một hàng ngăn rỗng thường trực sẽ ngụ ý rằng
  // đền LUÔN cất được đồ, trong khi thật ra nó chỉ nhận đúng thánh vật, và chỉ khi
  // anh hùng ngã trên đất nhà.
  const shrine = tribe && tribe.enshrinedRelics.length
    ? `<div class="chest-hd" style="margin-top:7px;"><b>Đền thờ</b><span>người kế nhiệm thừa hưởng</span></div>
       <div class="slots">${tribe.enshrinedRelics.map(r => {
         const sp = CONFIG.ITEM.TYPES[r.key], lv = clamp(Math.round(r.lv || 1), 1, CONFIG.ITEM.MAX_LEVEL);
         return `<div class="slot full shrine-slot${lv > 1 ? ' lv' + lv : ''}" data-item="${r.key}" data-lv="${lv}"><span class="glow" style="background:${sp.color}"></span><span class="ico">${sp.icon}</span>${lv > 1 ? `<span class="lvtag">${CONFIG.ITEM.LEVEL_TAG[lv]}</span>` : ''}</div>`;
       }).join('')}</div>`
    : '';
  return `<div class="chest">
    <div class="chest-hd"><b>Hòm đồ</b><span class="cnt">${held.length}/${CONFIG.ITEM.MAX_HELD}</span></div>
    <div class="slots">${cells}</div>${shrine}</div>`;
}

// Chú giải bám con trỏ. Uỷ quyền sự kiện ở cấp document nên mọi hòm đồ được dựng lại
// sau này vẫn có chú giải mà không phải gắn lại listener, và không rò rỉ listener
// theo mỗi lần dựng.
//
// Trạng thái được giữ bằng KHOÁ MÓN ĐỒ chứ không bằng cái thẻ DOM đang di chuột, và
// mousemove mới là nguồn chính chứ không phải mouseover. Lý do đo được: bảng anh
// hùng dựng lại innerHTML khoảng mười lần mỗi giây, nên cái ô mà con trỏ đang nằm
// trên bị thay bằng một ô mới liên tục. Trình duyệt không bắn lại `mouseover` khi
// phần tử dưới con trỏ biến mất vì DOM bị thay — chỉ khi chuột nhúc nhích. Bản đầu
// chỉ nghe `mouseover` nên chú giải gần như không bao giờ hiện ra trong game thật,
// dù gọi tay thì vẫn đúng.
// Khoá trạng thái gồm CẢ CẤP: cùng một ngăn, cùng một loại đồ, mà vừa được nung
// lên cấp 2 thì chú giải phải đổi theo. Thiếu `lv` trong khoá thì con số trong chú
// giải đứng im ở cấp cũ cho tới khi con trỏ rời ra rồi quay lại — đúng loại sai
// lệch im lặng mà không ai báo lỗi.
let tipKey = null, tipHeroId = 0, tipLv = 0;
function syncItemTip(e) {
  const box = el('itemTip');
  const slot = e.target.closest && e.target.closest('.slot.full[data-item]');
  if (!slot) {
    if (tipKey !== null) { tipKey = null; box.style.display = 'none'; }
    return;
  }
  const key = slot.dataset.item, hid = Number(slot.dataset.hero || 0);
  const lv = Number(slot.dataset.lv || 1);
  if (key !== tipKey || hid !== tipHeroId || lv !== tipLv) {
    tipKey = key; tipHeroId = hid; tipLv = lv;
    box.innerHTML = itemTipHTML(key, hid ? units.find(u => u.id === hid) : null, lv);
    box.style.display = 'block';
  }
  moveItemTip(e.clientX, e.clientY);
}

function moveItemTip(mx, my) {
  const box = el('itemTip');
  // Lật sang trái / lên trên khi chạm mép cửa sổ. Hòm đồ nằm ở cột phải sát mép màn
  // hình, nên nếu không lật thì chú giải bị đẩy ra ngoài đúng chỗ nó hay được mở nhất.
  const w = box.offsetWidth, h = box.offsetHeight;
  const x = mx + 14 + w > innerWidth ? mx - 14 - w : mx + 14;
  const y = my + 12 + h > innerHeight ? Math.max(4, my - 12 - h) : my + 12;
  box.style.left = x + 'px';
  box.style.top = y + 'px';
}

document.addEventListener('mouseover', syncItemTip);
document.addEventListener('mousemove', syncItemTip);

function renderHeroPanel() {
  const rows = [];
  for (const t of tribes) {
    if (!t.alive) continue;
    const line = t.heroLine;
    const h = units.find(u => u.type === 'hero' && u.tribeId === t.id);
    let status;
    if (h) {
      // Công/thủ đứng ngay cạnh máu ở bảng anh hùng, không đợi phải click: đây là
      // bốn nhân vật có tên trong cả trận, và nâng cấp "Binh thư" chỉ chạm tới họ
      // — nếu con số của họ không hiện ở đâu thì cả nhánh đó là một dòng chữ suông.
      status = `<span style="color:${h.retreating ? 'var(--bone-3)' : 'var(--gold)'}">${h.retreating ? '↩ đang rút lui' : '⚔ đang chiến'}</span>
                · ${Math.round(h.hp)}/${h.maxHp} máu · công ${effAttack(h).toFixed(1)} / thủ ${effDefense(h).toFixed(1)}
                · sống ${tick - h.born} tick · ${h.heroKills} mạng, ${h.heroRazed} nhà`;
    } else if (tick < t.heroCooldownUntil) {
      status = `<span style="color:var(--bone-3)">đang tìm người kế nhiệm — còn ${Math.max(0, Math.round(t.heroCooldownUntil - tick))} tick</span>`;
    } else if (!t.stats || t.stats.bcount.heroHall === 0) {
      // Từ Phase 3.28 cửa ra anh hùng là TƯỚNG PHỦ, và dòng này phải nói ra hai
      // trạng thái khác nhau chứ không một: "chưa xây" và "gen không muốn xây".
      // Cái thứ hai không phải một thiếu sót đang chờ được lấp — nó là một lựa
      // chọn chiến lược, và nếu ô này vẫn viết "chưa có" thì người xem sẽ ngồi đợi
      // một thứ không bao giờ tới mà không hiểu vì sao.
      status = t.policy.heroDrive > 0.3
        ? '<span style="color:var(--bone-3)">chưa dựng xong Tướng phủ</span>'
        : `<span style="color:var(--bone-3)">không nuôi tướng (đầu tư anh hùng ${t.policy.heroDrive.toFixed(2)})</span>`;
    } else {
      status = '<span style="color:var(--bone-3)">chưa đủ lương/vàng để chiêu mộ</span>';
    }
    const g = h ? h.genes : line.genes;
    const genes = Object.keys(HERO_GENE_LABELS)
      .map(k => `${HERO_GENE_LABELS[k]} <span style="color:var(--bone-2)">${g[k].toFixed(2)}</span>`).join(' · ');
    const items = heroChestHTML(h, t);
    const best = line.best;
    rows.push(`<div style="padding:5px 0;border-bottom:1px solid #221b15;">
      <div><span class="swatch" style="background:${t.color}"></span><b>${h ? h.name : line.dynasty}</b>
        <span style="color:var(--bone-3)">· đã qua ${line.history.length} đời</span></div>
      <div style="font-size:11px;margin-top:2px;">${status}</div>
      <div style="font-size:11px;color:var(--bone-3);margin-top:2px;">${genes}</div>
      ${items}
      ${best ? `<div style="font-size:10.5px;color:var(--bone-3);margin-top:2px;">tổ tiên tốt nhất: đời ${best.gen}, điểm ${best.fitness.toFixed(1)} — đời sau đột biến từ người này</div>` : ''}
    </div>`);
  }
  setPanelHTML(el('heroBody'), rows.join('') || '<div class="hint">Chưa bộ lạc nào còn sống.</div>');

  drawLineChart(el('chartHero'), tribes.map(t => ({ values: t.heroLine.braveTrend, color: t.color })), true);
  el('labelBrave').textContent = tribes.map(t => {
    const b = t.heroLine.braveTrend;
    return b.length ? b[b.length - 1].toFixed(2) : '—';
  }).join(' / ');
}

function getSelected() {
  if (!selected) return null;
  if (selected.kind === 'unit') return units.find(u => u.id === selected.id) || null;
  if (selected.kind === 'lair') return lairs.find(l => l.id === selected.id) || null;
  // Tường tra bằng KHOÁ Ô, không phải id — nó sống trong một Map (xem selectAt).
  // Ô đã thủng vẫn trả về: "chỗ này vỡ rồi, còn ngần này tick nữa mới lành" đúng
  // là câu người xem hỏi khi họ bấm vào một lỗ thủng.
  if (selected.kind === 'wall') return wallCells.get(selected.key) || null;
  return buildings.find(b => b.id === selected.id) || null;
}

function policyTable(p) {
  const labels = {
    foodWeight: 'ưu tiên lương', woodWeight: 'ưu tiên gỗ', goldWeight: 'ưu tiên vàng',
    militaryRatio: 'tỉ lệ lính', aggression: 'hiếu chiến', expansion: 'bán kính bành trướng',
    houseBuffer: 'đệm chỗ ở', farmTarget: 'số ruộng muốn', towerTarget: 'số tháp muốn', ageRush: 'vội lên thời đại',
    stoneWeight: 'ưu tiên đá', rangedRatio: 'tỉ lệ quân tầm xa', wonderDrive: 'khao khát Kỳ quan',
    piety: 'thành tâm (thờ cúng)', discipline: 'kỷ luật đội hình', cityPlan: 'quy hoạch xây dựng',
    garrison: 'số lò quân', roadDrive: 'ưu tiên đường cái', colonize: 'dám lập đô', heroDrive: 'đầu tư anh hùng',
    fortify: 'thiên về phòng thủ', expedition: 'viễn chinh (hậu cần)'
  };
  let html = '<div class="kv" style="margin-top:6px;">';
  for (const k in labels) {
    const spec = POLICY_SPEC[k];
    const ratio = clamp((p[k] - spec.bounds[0]) / (spec.bounds[1] - spec.bounds[0]), 0, 1);
    html += `<span class="label">${labels[k]}</span><span class="value">${p[k].toFixed(2)}
      <span class="bar" style="display:inline-block;width:44px;vertical-align:middle;margin-left:6px;">
        <div style="width:${(ratio * 100).toFixed(0)}%;background:#63b4ad"></div></span></span>`;
  }
  return html + '</div>';
}

function heroGeneTable(g) {
  let html = '<div class="kv" style="margin-top:6px;">';
  for (const k in HERO_GENE_LABELS) {
    html += `<span class="label">${HERO_GENE_LABELS[k]}</span><span class="value">${g[k].toFixed(2)}
      <span class="bar" style="display:inline-block;width:44px;vertical-align:middle;margin-left:6px;">
        <div style="width:${(clamp(g[k], 0, 1) * 100).toFixed(0)}%;background:#d8a544"></div></span></span>`;
  }
  return html + '</div>';
}

// ------------------------------------------------------------------
// CÔNG / THỦ — hai dòng đắt nhất trong cả thẻ thông tin
//
// Cho tới bản này thẻ "đang chọn" chỉ hiện `Sát thương`, và con số đó là một ngõ
// cụt: nó không so được với gì cả. Người xem đọc "7,0" rồi không biết nó to hay
// nhỏ, vì thứ duy nhất để so là máu của đối phương — mà máu thì tính bằng đơn vị
// khác hẳn. Cặp CÔNG/THỦ sửa đúng chỗ đó: hai con số CÙNG ĐƠN VỊ, đọc cạnh nhau
// thì tự thành một câu ("kỵ sĩ giáp 4 đứng trước cung thủ công 6").
//
// Và quan trọng hơn — phần trong ngoặc TÁCH RIÊNG phần do nâng cấp cộng vào. Nếu
// chỉ hiện tổng thì cả hệ thống nghiên cứu trở nên vô hình: bảng nâng cấp ở cột
// phải nói cấp mấy, còn ĐIỀU ĐÓ CÓ NGHĨA LÀ GÌ trên một người lính cụ thể thì
// không chỗ nào trả lời. Đây là chỗ trả lời.
// ------------------------------------------------------------------
function combatRows(u) {
  const b = upgradeBonus(u);
  const upAtk = b ? b.atk : 0, upDef = b ? b.def : 0;
  const atk = effAttack(u), def = effDefense(u);
  const plus = v => v > 0 ? ` <span style="color:var(--gold)">(+${v.toFixed(1)})</span>` : '';
  const auraTag = u.auraUntil >= tick ? ' <span style="color:var(--gold)">⚑</span>' : '';
  return `<span class="label" title="sát thương mỗi đòn, đã tính nâng cấp và hào quang">Công</span>
    <span class="value">${atk.toFixed(1)}${plus(upAtk)}${auraTag}</span>
    <span class="label" title="trừ thẳng vào mỗi đòn ăn vào người này (sàn ${Math.round(CONFIG.UNIT.ARMOR_FLOOR * 100)}% đòn gốc)">Thủ</span>
    <span class="value">${def.toFixed(1)}${plus(upDef)}</span>
    ${buildDmgRow(u, atk)}`;
}

// SÁT THƯƠNG LÊN TƯỜNG — một hàng riêng, không gộp vào ô "Công".
//
// Đây là con số duy nhất trong thẻ mà người xem KHÔNG suy ra được từ những con số
// còn lại: nó không tỉ lệ với "Công", nó nhảy bậc theo việc đơn vị này có phải vũ
// khí công thành hay không. Một cỗ máy bắn đá đánh 20 đập tường bằng 60, một kỵ sĩ
// đánh 13 đập tường bằng 2,6 — nhìn hai ô "Công" 20 với 13 thì không ai đoán ra
// khoảng cách 23 lần đó.
//
// Bỏ qua với quái vật và với thứ không có ô sát thương: quái đi đường hệ số riêng
// (MONSTER.BUILD_DMG) mà thẻ của chúng đã có dòng CÔNG THÀNH bằng chữ, còn thầy
// lang thì mọi phép nhân đều ra 0.
function buildDmgRow(u, atk) {
  if (u.type === 'monster' || !atk) return '';
  const siege = isSiege(u.type);
  const v = atk * (siege ? CONFIG.UNIT.BUILDING_DAMAGE_MULT : CONFIG.UNIT.BUILD_PENALTY);
  return `<span class="label" title="${siege
    ? 'Vũ khí công thành: đánh vào công trình mạnh gấp ' + CONFIG.UNIT.BUILDING_DAMAGE_MULT + ' lần sức đánh thường.'
    : 'Không phải vũ khí công thành: chỉ ' + Math.round(CONFIG.UNIT.BUILD_PENALTY * 100) + '% sức đánh chạm được vào tường. Muốn phá thành nhanh thì phải có máy bắn đá.'
    }">Đập tường</span>
    <span class="value" style="color:${siege ? 'var(--gold)' : 'var(--bone-3)'}">${v.toFixed(1)}${
      siege ? ` <span style="color:var(--gold)">×${CONFIG.UNIT.BUILDING_DAMAGE_MULT} công thành</span>`
            : ` <span style="color:var(--bone-3)">(−${Math.round((1 - CONFIG.UNIT.BUILD_PENALTY) * 100)}%)</span>`}</span>`;
}

// Nâng cấp nào đang chảy vào chính đơn vị này. Chỉ liệt kê nhánh CÓ tác dụng lên
// nó — một người lính không cần biết bộ lạc đã nghiên cứu "Cung nỏ" tới cấp mấy.
function upgradeCreditHTML(u, tribe) {
  if (!tribe) return '';
  const rows = [];
  for (const line of UPGRADE_LINES) {
    const lv = tribe.upgrades[line];
    if (!lv || CONFIG.UPGRADE.LINES[line].applies.indexOf(u.type) < 0) continue;
    const L = CONFIG.UPGRADE.LINES[line];
    const parts = [];
    if (L.atk) parts.push(`+${(L.atk * lv).toFixed(1)} công`);
    if (L.def) parts.push(`+${(L.def * lv).toFixed(1)} thủ`);
    if (L.hp) parts.push(`+${L.hp * lv} máu`);
    // Nhánh Y thuật không cộng một điểm công/thủ nào, nên nếu chỉ đọc ba trường
    // trên thì ô của nó ra một chuỗi RỖNG: bảng vẫn hiện "🌿 Y thuật 3" rồi im
    // lặng, và người xem kết luận là nâng cấp không có tác dụng gì.
    if (L.heal)  parts.push(`+${(L.heal * lv).toFixed(2)} máu/tick`);
    if (L.heals) parts.push(`+${L.heals * lv} bệnh nhân cùng lúc`);
    if (L.reach) parts.push(`+${(L.reach * lv).toFixed(1)} ô tầm chữa`);
    if (L.seek)  parts.push(`+${L.seek * lv} ô tầm tìm`);
    rows.push(`<span style="color:var(--bone-2)">${L.icon} ${L.short} ${lv}</span>
      <span style="color:var(--bone-3)"> ${parts.join(' · ')}</span>`);
  }
  if (!rows.length) {
    return `<div class="hint" style="margin-top:6px;">Chưa có nâng cấp nào áp dụng cho loại quân này.</div>`;
  }
  return `<div style="margin-top:8px;font-size:11px;line-height:1.65;">
    <span style="color:var(--gold)">NÂNG CẤP ĐANG HƯỞNG</span><br>${rows.join('<br>')}</div>`;
}

// Bảng nghiên cứu của MỘT công trình: nhánh nào ra lò từ đây, đang ở cấp mấy,
// và có đang chạy dở không.
function buildingResearchHTML(b, tribe) {
  if (!tribe) return '';
  const lines = UPGRADE_LINES.filter(k => CONFIG.UPGRADE.LINES[k].build === b.type);
  if (!lines.length) return '';
  const rows = lines.map(line => {
    const L = CONFIG.UPGRADE.LINES[line];
    const lv = tribe.upgrades[line];
    const running = tribe.research && tribe.research.line === line;
    let tail;
    if (running) {
      const total = CONFIG.UPGRADE.TICKS[tribe.research.level] || 1;
      const left = Math.max(0, tribe.research.until - tick);
      tail = `<span style="color:var(--gold)">đang nghiên cứu cấp ${tribe.research.level} — còn ${left} tick</span>
        <span class="bar" style="display:block;margin-top:3px;">
          <div style="width:${((1 - left / total) * 100).toFixed(0)}%;background:var(--gold)"></div></span>`;
    } else if (lv >= CONFIG.UPGRADE.MAX_LEVEL) {
      tail = '<span style="color:var(--bone-3)">đã tới cấp trần</span>';
    } else if (tribe.age < L.age) {
      tail = `<span style="color:var(--bone-3)">khoá tới ${CONFIG.AGE.NAMES[L.age]}</span>`;
    } else {
      const c = upgradeCost(line, lv + 1);
      tail = `<span style="color:var(--bone-3)">cấp ${lv + 1}: ${Object.keys(c).map(k => c[k] + ' ' + RES_LABEL[k]).join(' · ')}</span>`;
    }
    return `<div style="margin-top:5px;">${L.icon} <b style="color:var(--bone-2)">${L.label}</b>
      ${pipHTML(lv)} <span style="color:var(--bone-3)">· ${L.scope}</span><br>${tail}</div>`;
  }).join('');
  return `<div style="margin-top:9px;font-size:11px;line-height:1.55;">
    <span style="color:var(--gold)">NGHIÊN CỨU TẠI ĐÂY</span>${rows}</div>`;
}

const RES_LABEL = { food: 'lương', wood: 'gỗ', gold: 'vàng', stone: 'đá' };

// Ba chấm = ba cấp. Chấm chứ không phải con số vì bảng nâng cấp phải liếc một cái
// là so được bốn bộ lạc với nhau; đọc "2" rồi so với "1" thì mắt phải dừng lại.
function pipHTML(level) {
  let out = '';
  for (let i = 1; i <= CONFIG.UPGRADE.MAX_LEVEL; i++) {
    out += `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-left:2px;vertical-align:middle;
      background:${i <= level ? 'var(--gold)' : 'transparent'};border:1px solid ${i <= level ? 'var(--gold)' : 'var(--bone-3)'};"></span>`;
  }
  return out;
}

function renderSelected() {
  const sel = getSelected();
  // Thẻ chi tiết buông xuống từ dải "Đang chọn" dưới bảng điều khiển (Phase 3.30).
  // Trước đó nó ghim trên đầu cột dữ liệu bên phải; xem chú thích #inspectBar
  // trong civilization.html để biết vì sao hai chỗ cùng nói một chuyện là hỏng.
  const dock = el('selectedPanel');
  if (!sel) {
    if (dock.__selKey !== null) { dock.__selKey = null; dock.style.display = 'none'; }
    if (selected) selected = null;
    return;
  }
  // Kéo về đỉnh đúng MỘT lần cho mỗi lần chọn mới: tấm thẻ tự cuộn bên trong, nên
  // nếu đang cuộn dở thì thẻ của con quân MỚI hiện ra ở giữa chừng. Đặt điều kiện
  // theo id chứ không theo "dock đang ẩn hay hiện" — đổi từ quân này sang quân
  // khác cũng phải kéo về, mà lúc đó dock vẫn đang hiện.
  // Danh tính của tường là KHOÁ Ô ("x,y"), của mọi thứ khác là `id`. Dùng thẳng
  // `sel.id` thì mọi ô tường đều mang cùng một khoá `undefined`, và bấm từ ô tường
  // này sang ô tường khác sẽ không kéo về đỉnh — thẻ mới hiện ra ngoài tầm nhìn.
  const selKey = sel.key !== undefined ? sel.key : sel.id;
  if (dock.__selKey !== selKey) {
    dock.__selKey = selKey;
    dock.style.display = '';
    dock.scrollTop = 0;
    // Bỏ trần cũ khi đổi thứ đang chọn: trần được đo cho một tấm thẻ CỤ THỂ, và
    // giữ nguyên nó cho tấm thẻ tiếp theo là chèn một thanh cuộn vào một tấm thẻ
    // ngắn hơn hẳn.
    dock.style.maxHeight = ''; dock.__room = null;
  }
  // TRẦN CHIỀU CAO ĐO TỪ THỰC TẾ, không phải một con số trong CSS.
  //
  // Tấm thẻ buông xuống từ dải, mà dải nằm trong #world-pane — cột có
  // `overflow:hidden`. Một trần cứng (min(210px,30vh)) thì đúng ở cỡ cửa sổ mình
  // vừa thử và SAI ở cỡ khác, và cái sai đó hoàn toàn im lặng: không thanh cuộn,
  // không dấu hiệu, chỉ là vài dòng cuối biến mất. Đo thật ở cửa sổ 900px cao:
  // thẻ anh hùng chạm 916px, tức 16px cuối bị nuốt. Đây đúng cái bẫy mà chú thích
  // CANVAS_PX_W đã ghi ra cho cột bên phải, lần này ở cột trái.
  //
  // Đo phần TRÀN chứ không đo `top`, và bản đầu đã làm ngược lại rồi phải sửa:
  // hàng tóm tắt phía trên được dựng ở renderOverlaySelected — CHẠY SAU hàm này
  // trong cùng một khung hình — nên lúc đọc `top` thì dải còn đang mang nội dung
  // của khung hình trước và cao thiếu 24px. Trần tính ra thừa đúng 24px, và tấm
  // thẻ vẫn tràn khỏi màn hình y như trước khi có dòng này. Đo phần tràn thì phép
  // đo TỰ SỬA: khung hình sau nó thấy phần tràn thật rồi kẹp lại, và khi không
  // còn tràn thì nó không đụng vào gì nữa.
  const over = Math.round(dock.getBoundingClientRect().bottom - window.innerHeight + 8);
  if (over > 0) {
    const cap = Math.max(90, dock.clientHeight - over);
    if (dock.__room !== cap) { dock.__room = cap; dock.style.maxHeight = cap + 'px'; }
  }

  // Quái vật và hang ổ không thuộc bộ lạc nào, nên phải thoát ra TRƯỚC dòng tra
  // tribes[] bên dưới.
  if (sel.isLair) {
    const T = lairTierSpec(sel);
    const skin = lairSkin(sel);
    let alive = 0, lord = false;
    for (const u of units) {
      if (u.type !== 'monster' || u.lairId !== sel.id) continue;
      if (u.mType === 'lord') lord = true; else alive++;
    }
    const nextAt = CONFIG.MONSTER.FEED.TIER_AT[sel.tier];
    // Làm tròn khi HIỂN THỊ, không làm tròn giá trị: điểm nuôi là số thực vì rò rỉ
    // nhân theo tỉ lệ mỗi tick, và làm tròn nó về số nguyên trong tickLair sẽ giết
    // luôn cơ chế — ở mức feed thấp, một lần `Math.round` mỗi tick đủ để triệt tiêu
    // hoàn toàn phần rò rỉ 0,022%.
    const starving = tick - sel.lastFeedTick > CONFIG.MONSTER.FEED.STARVE_AFTER;
    const feedTxt = (nextAt === undefined
      ? `${Math.round(sel.feed)} — đã đạt cấp cao nhất`
      : `${Math.round(sel.feed)} / ${nextAt} → ${CONFIG.MONSTER.TIERS[sel.tier].name}`)
      + (starving ? ' · đang đói' : '');
    const raidTxt = sel.tier >= CONFIG.MONSTER.RAID.MIN_TIER && T.raidEvery > 0
      ? `còn ${Math.max(0, T.raidEvery - sel.raidTimer)} tick (đã đi ${sel.raidsSent} chuyến)`
      : 'chưa đủ cấp để đi cướp';
    setPanelHTML(el('selectedBody'), `<div style="font-weight:600;color:${skin.edge};margin-bottom:6px;">${T.name} — cấp ${sel.tier}/3</div>
      <div class="kv">
        <span class="label">Máu</span><span class="value">${Math.round(sel.hp)} / ${sel.maxHp}</span>
        <span class="label">Quái đang sống</span><span class="value">${alive} / ${T.cap}${lord ? ' + Chúa Hang' : ''}</span>
        <span class="label">Điểm nuôi</span><span class="value">${feedTxt}</span>
        <span class="label">Đã ăn được</span><span class="value">${sel.killCount} mạng</span>
        <span class="label">Chuyến cướp sau</span><span class="value">${raidTxt}</span>
        <span class="label">Bán kính lảng vảng</span><span class="value">${T.roam} ô</span>
        <span class="label">Đã nhả ra</span><span class="value">${sel.spawnedTotal} con</span>
        <span class="label">Vị trí</span><span class="value">${sel.x}, ${sel.y}</span>
      </div>
      <div class="hint" style="margin-top:8px;">Hang LỚN LÊN bằng thứ nó giết được (+ một dòng chảy chậm theo thời gian). Bỏ mặc thì nó nở rộng vòng nguy hiểm, đẻ ra loài dữ hơn, và từ cấp 2 nó tự cử quái đi cướp. Cấp 3 nuôi một <b>Chúa Hang</b>. Phá hang ra Thánh vật — Tổ Quỷ ra thêm một món nữa.</div>`);
    return;
  }
  if (sel.type === 'monster') {
    const spec = CONFIG.MONSTER.TYPES[sel.mType];
    const traits = [];
    if (sel.fly) traits.push('BAY qua rừng và hồ');
    if (sel.range > 0) traits.push(`đánh tầm xa ${sel.range} ô`);
    if (sel.venom) traits.push(`nọc độc ${sel.venom.dps}/tick × ${sel.venom.ticks}`);
    if (sel.splash > 0) traits.push(`sát thương lan ${sel.splash} ô`);
    if (sel.aura) traits.push(`hào quang +${Math.round((sel.aura.mult - 1) * 100)}% trong ${sel.aura.r} ô`);
    if (sel.split) traits.push(`PHÂN ĐÔI khi chết → ${sel.split.count} con ${Math.round(sel.split.scale * 100)}%`);
    if (sel.ambush) traits.push(`PHỤC KÍCH — vùi đất, đòn đầu ×${sel.ambush.mult}`);
    if (sel.slow) traits.push(`cắn LÀM CHẬM ×${sel.slow.mult} trong ${sel.slow.ticks} tick`);
    if (sel.heal) traits.push(`HỒI ${sel.heal.amount} máu/${sel.heal.every} tick cho quái trong ${sel.heal.r} ô`);
    if (sel.siege > 0) traits.push(`CÔNG THÀNH ×${sel.siege} sát thương lên công trình`);
    const doing = sel.buried ? 'NẰM VÙI CHỜ MỒI'
                : sel.raidTribe >= 0 ? `ĐI CƯỚP ${tribes[sel.raidTribe].name}`
                : sel.assault ? 'tràn theo sóng'
                : sel.combatTarget ? 'đang săn' : 'quanh quẩn giữ hang';
    setPanelHTML(el('selectedBody'), `<div style="font-weight:600;color:${spec.color};margin-bottom:6px;">${spec.label} (quái vật hoang dã)</div>
      <div class="kv">
        <span class="label">Máu</span><span class="value">${Math.round(sel.hp)} / ${sel.maxHp}</span>
        ${combatRows(sel)}
        <span class="label">Mức nguy hiểm</span><span class="value">${sel.threat.toFixed(1)}×</span>
        <span class="label">Tuổi (tick)</span><span class="value">${tick - sel.born}</span>
        <span class="label">Đang làm</span><span class="value">${doing}</span>
      </div>
      ${traits.length ? `<div class="hint" style="margin-top:6px;color:#e09a3c;">⚡ ${traits.join(' · ')}</div>` : ''}
      <div class="hint" style="margin-top:6px;">Không thuộc bộ lạc nào — tấn công tất cả. Ngoài chuyến đi cướp thì chỉ đuổi trong bán kính ${sel.roam} ô quanh hang.</div>`);
    return;
  }

  const t = tribes[sel.tribeId];

  // TƯỜNG THÀNH phải thoát ra TRƯỚC nhánh công trình bên dưới. Ô tường có `size`
  // nên `sel.size !== undefined` là đúng với nó, mà nó lại KHÔNG có `type` — rơi
  // xuống dưới là `CONFIG.BUILD[undefined].label` và cả bảng điều khiển tắt ngóm.
  // Lần thứ ba một vật "có máu, có size, không phải công trình" phải được đón ở
  // cửa (hang ổ · quái · tường); xem cùng chú thích trong dealDamage.
  if (sel.isWall) {
    const R = CONFIG.WALL;
    const brokenFor = Math.max(0, sel.downUntil - tick);
    const spec = R.TIERS[clamp(sel.tier || 1, 1, R.TIERS.length - 1)];
    const kind = sel.corner ? 'Tháp góc' : sel.door ? 'Cánh cổng' : sel.gate ? 'Lầu cổng' : 'Thân tường';
    // ĐỦ ĐÁ HAY KHÔNG là câu hỏi đắt nhất về bức tường từ Phase 3.30, và nó phải
    // đọc lại ĐÚNG điều kiện mà tickWalls dùng — không phải một câu diễn giải gần
    // đúng. Hai chỗ nói hai ngưỡng khác nhau thì tấm thẻ này thành một lời nói dối
    // có thẩm quyền, đúng họ lỗi foodTarget/wealth của Phase 3.27.
    const rich = t.res.stone - R.REGEN_RESERVE >= R.REGEN_STONE;
    const rate = sel.maxHp * R.REGEN_FRAC * (rich ? 1 : R.REGEN_POOR);
    setPanelHTML(el('selectedBody'), `<div style="font-weight:600;color:${t.color};margin-bottom:6px;">Tường thành ${t.name} — ${kind}</div>
      <div class="kv">
        <span class="label">Máu ô này</span><span class="value">${sel.hp <= 0
          ? `<span style="color:#d05a44">ĐÃ VỠ — lành lại sau ${brokenFor} tick</span>`
          : `${Math.round(sel.hp)} / ${sel.maxHp}${sel.door ? ` <span style="color:#d05a44">(cánh cổng ${Math.round(R.GATE_HP * 100)}%)</span>` : sel.gate ? ' <span style="color:var(--gold)">(lầu cổng — dày như tường thường)</span>' : ''}`}</span>
        <span class="label">Bậc thành</span><span class="value"><span style="color:var(--gold)">${spec.name}</span> · ${CONFIG.AGE.NAMES[t.age]}</span>
        <span class="label">Vành thành</span><span class="value">bán kính ${wallRadius(t)} ô quanh kinh đô</span>
        <span class="label">Tự sửa</span><span class="value">${rate.toFixed(2)} máu/tick${rich
          ? ` · <span style="color:var(--gold)">đang trả ${R.REGEN_STONE} đá/ô</span>`
          : ` · <span style="color:#d05a44">thiếu đá, còn ${Math.round(R.REGEN_POOR * 100)}%</span>`} · sau ${R.REGEN_DELAY} tick không bị đánh</span>
        <span class="label">Vị trí</span><span class="value">${sel.x}, ${sel.y}</span>
      </div>
      <div class="hint" style="margin-top:8px;">Không ai xây, không ai đặt móng — nó <b>tự mọc</b> quanh kinh đô ngay từ ${CONFIG.AGE.NAMES[R.MIN_AGE]}, rộng ra và <b>đổi hình</b> mỗi đời (5 bậc). Chặn <b>quân địch và quái vật</b>, không chặn quân nhà. <b>${R.GATE_SPAN} ô giữa mỗi cạnh là cổng thành</b>: ${R.GATE_DOOR_SPAN} ô <b>cánh cửa</b> ở giữa (chỉ ${Math.round(R.GATE_HP * 100)}% máu — chỗ mỏng nhất của cả vành) kẹp giữa <b>hai lầu cổng</b> cao vượt lên, dày như tường thường. Bộ binh gõ vào tường gần như vô hại (×${CONFIG.UNIT.BUILD_PENALTY}); phá thành là việc của <b>máy bắn đá</b> (×${CONFIG.UNIT.BUILDING_DAMAGE_MULT}). Thủng một ô là mở một cửa trong ${R.RUBBLE} tick. Vá tường <b>tốn đá</b>, và dưới ${R.REGEN_RESERVE} đá trong kho thì chỉ vá bằng ${Math.round(R.REGEN_POOR * 100)}% tốc độ.</div>`);
    return;
  }

  let html = `<div style="font-weight:600;color:${t.color};margin-bottom:6px;">${t.name} — `;

  if (sel.size !== undefined) {
    const mLv = t.upgrades.masonry || 0;
    html += `${CONFIG.BUILD[sel.type].label}${sel.type === 'tower' && (sel.level || 1) > 1 ? ` tầng ${sel.level}` : ''}</div><div class="kv">
      <span class="label">Máu</span><span class="value">${Math.round(sel.hp)} / ${sel.maxHp}${mLv ? ` <span style="color:var(--gold)">(Nề đá +${Math.round((masonryMult(t) - 1) * 100)}%)</span>` : ''}</span>
      <span class="label">Trạng thái</span><span class="value">${sel.done ? 'hoàn thành'
        : (sel.stacking ? 'đang lên tầng ' : 'đang xây ') + Math.round(sel.progress / sel.buildTicks * 100) + '%'}</span>
      <span class="label">Vị trí</span><span class="value">${sel.x}, ${sel.y}</span>`;
    // CÔNG TRƯỜNG: ai đang làm, còn bao lâu. Đây là câu hỏi mà người xem hỏi nhiều
    // nhất khi bấm vào một cái móng nhà, và cho tới bản này thẻ chỉ trả lời được
    // "đang xây 34%" — một con số không nói được nó có ĐANG NHÍCH hay không. Số
    // thợ bằng 0 là chẩn đoán trực tiếp cho "công trường mồ côi", đúng con lỗi đã
    // phải viết hẳn một cơ chế nhặt lại ở Phase 3.16.
    if (!sel.done) {
      let crew = 0;
      for (const u of units) if (u.hp > 0 && u.buildTarget === sel) crew++;
      const left = Math.max(0, sel.buildTicks - sel.progress);
      html += `<span class="label">Thợ tại công trường</span><span class="value" style="color:${crew ? 'var(--gold)' : '#d05a44'}">${crew} người</span>
      <span class="label">Còn lại</span><span class="value">${crew
        ? Math.ceil(left / (CONFIG.BUILD.BUILD_RATE * crew)) + ' tick'
        : '<span style="color:#d05a44">đứng im — chưa ai tới</span>'}</span>`;
    }
    if (sel.type === 'wonder' && sel.done) {
      const left = Math.max(0, CONFIG.WONDER.HOLD_TICKS - (tick - sel.wonderDoneAt));
      html += `<span class="label">Còn phải giữ</span><span class="value" style="color:var(--gold)">${left} tick</span>`;
    }
    // Dựng danh sách bằng cách LỌC BẢNG MỞ KHOÁ, không nối chuỗi tam nguyên như bản
    // cũ. Ba loại quân mới vừa cho thấy vì sao: bản cũ viết tay `t.age >= 3` và
    // `t.age >= 4` ngay tại đây, nên mỗi lần bảng UNLOCK_UNIT đổi thì hai dòng này
    // lặng lẽ nói sai — không phải sai một chút, mà là bỏ sót nguyên một binh chủng
    // khỏi cái ô sinh ra để liệt kê binh chủng. Lọc bảng thì nó không thể lệch.
    const madeHere = (bType) => TRAINABLE_TYPES
      .filter(k => TRAIN_SOURCE[k] === bType && k !== 'hero' && t.age >= (CONFIG.AGE.UNLOCK_UNIT[k] || 1))
      .map(k => UNIT_LABEL[k] || k).join(' · ');
    if (sel.type === 'workshop' || sel.type === 'stable' || sel.type === 'barracks') {
      html += `<span class="label">Ra lò</span><span class="value">${madeHere(sel.type) || '—'}</span>`;
    }
    if (sel.type === 'heroHall') {
      html += `<span class="label">Ra lò</span><span class="value">Anh hùng (tối đa 1 người còn sống)</span>`;
    }
    // ĐANG NẤU — dòng này là chỗ duy nhất cơ chế "mỗi công trình một cái lò riêng"
    // (Phase 3.28) hiện ra thành chữ. Không có nó thì người xem thấy bộ lạc dựng
    // ba cái trại lính mà không có cách nào biết được vì sao ba cái lại hơn một —
    // và một cơ chế không đọc được thì với người xem nó không tồn tại.
    if (sel.done && TRAIN_BY_SOURCE[sel.type]) {
      const busy = sel.trainType;
      html += `<span class="label">Đang nấu</span><span class="value">${busy
        ? `${UNIT_LABEL[busy] || busy} — ${Math.round(sel.trainTimer)}/${unitSpec(busy).trainTicks} tick`
        : '<span style="color:var(--bone-3)">lò rảnh</span>'}</span>`;
    }
    if (sel.type === 'tower') {
      // TẦNG THÁP: nói ra cả ba chỉ số đã nhân, không chỉ cái tầng. "Tầng 2" là một
      // con số không có ý nghĩa với người xem cho tới khi họ thấy tầm bắn 10 → 15 —
      // và tầm bắn mới là thứ đổi cục diện (xem chú thích TOWER_STACK).
      const spec = CONFIG.BUILD.tower;
      const st = towerStackMult(sel.level);
      const lv = sel.level || 1;
      html += `<span class="label">Tầng</span><span class="value" style="color:var(--gold)">${lv} / ${CONFIG.BUILD.TOWER_STACK.MAX}${sel.stacking ? ' — đang xây tầng trên, NGỪNG BẮN' : ''}</span>
      <span class="label">Tầm bắn</span><span class="value">${(spec.range * st).toFixed(1)} ô${lv > 1 ? ` <span style="color:var(--bone-3)">(gốc ${spec.range})</span>` : ''}</span>
      <span class="label">Sức đánh</span><span class="value">${(spec.attack * st * CONFIG.AGE.BONUS[t.age].atk).toFixed(1)} mỗi ${spec.cooldown} tick</span>`;
      if (lv < CONFIG.BUILD.TOWER_STACK.MAX && sel.done) {
        const c = towerStackCost(lv);
        html += `<span class="label">Chồng tầng ${lv + 1}</span><span class="value">${Object.keys(c).map(k => `${c[k]} ${k}`).join(' · ')} · ×${CONFIG.BUILD.TOWER_STACK.MULT} sức mạnh</span>`;
      }
      // Tháp canh giờ là ĐIỀU KIỆN lên đời, nên cái thẻ của nó phải nói ra hạn ngạch
      // — nếu không thì người xem thấy bộ lạc xây tháp mà không hiểu vì sao.
      const need = CONFIG.AGE.NEED_TOWERS[t.age + 1] || 0;
      const have = t.stats ? t.stats.towersDone : 0;
      if (need > 0) {
        html += `<span class="label">Hạn ngạch lên đời</span><span class="value" style="color:${have >= need ? 'var(--gold)' : '#c98f6a'}">${have}/${need} tháp cho ${CONFIG.AGE.NAMES[t.age + 1]}</span>`;
      }
    }
    if (sel.type === 'infirmary') {
      const live = t.healers ? t.healers.length : 0;
      html += `<span class="label">Ra lò</span><span class="value">Thầy lang (${live}/${Math.min(CONFIG.HEALER.MAX, (t.stats ? t.stats.bcount.infirmary : 1) * CONFIG.HEALER.PER_INFIRMARY)})</span>
      <span class="label">Chữa tại chỗ</span><span class="value">${CONFIG.MEDIC.RATE} máu/tick trong ${CONFIG.MEDIC.RANGE} ô</span>
      <span class="label">Chỉ khi</span><span class="value">không có địch trong ${CONFIG.MEDIC.SAFE_R} ô</span>`;
    }
    if (sel.type === 'shrine') {
      // Nhà cầu nguyện nay có HAI nghề, và nghề thứ hai không đọc ra được từ hình
      // vẽ. Thẻ này là chỗ duy nhất nói ra nó.
      const q = t.stats ? t.stats.quarters : 0;
      html += `<span class="label">Ra lò</span><span class="value">Đội hậu cần (${q} đang có)</span>
      <span class="label">Đức tin</span><span class="value">+0,12 mỗi nhịp hồi</span>`;
    }
    if (sel.type === 'camp') {
      const QS = supplyStats(t);
      const left = Math.max(0, (sel.expireAt || 0) - tick);
      html += `<span class="label">Còn đứng</span><span class="value" style="color:${left < 300 ? '#e0a33c' : '#d8b25c'}">${left} / ${QS.ttl} tick</span>
      <span class="label">Đang tiếp tế</span><span class="value">${sel.serving || 0} / ${QS.slots} suất</span>
      <span class="label">Nhịp</span><span class="value">${QS.rate.toFixed(2)} quân lương/tick · bán kính ${QS.reach.toFixed(1)} ô</span>`;
    }
    html += '</div>';
    if (sel.type === 'camp') {
      html += `<div class="hint" style="margin-top:8px;">Không do dân xây và <b>không xây lại được</b>: một <b>Đội hậu cần</b> cắm nó xuống trong một tick, giữa đất địch, rồi nó tự nhổ sau khi hết hạn. Chỉ ${CONFIG.BUILD.camp.hp} máu và không giáp — đây là mục tiêu mềm nhất bản đồ, và phá nó là cắt đường tiếp tế của cả một chiến dịch.</div>`;
    }
    // Công trình nào cũng có thể là NƠI NGHIÊN CỨU. Liệt kê ngay trong thẻ của nó
    // là câu trả lời cho "tại sao bộ lạc này đang đứng im mà kho vẫn cạn" — và nó
    // chỉ đúng chỗ ở đây, vì mỗi nhánh gắn với đúng một công trình.
    html += buildingResearchHTML(sel, t);
  } else {
    const kindLabel = sel.type === 'hero' ? `⚔ ${sel.name}` : (UNIT_LABEL[sel.type] || 'Dân thường');
    html += `${kindLabel}</div><div class="kv">
      <span class="label">Máu</span><span class="value">${Math.round(sel.hp)} / ${sel.maxHp}</span>
      ${combatRows(sel)}
      <span class="label">Tuổi (tick)</span><span class="value">${tick - sel.born}</span>`;
    if (sel.type === 'hero') {
      html += `<span class="label">Trạng thái</span><span class="value">${sel.retreating ? '<span style="color:var(--bone-3)">đang rút lui</span>' : '<span style="color:var(--gold)">đang chiến</span>'}</span>
      <span class="label">Chiến công</span><span class="value">${sel.heroKills} mạng · ${sel.heroRazed} công trình</span>
      <span class="label">Hào quang</span><span class="value">bán kính ${sel.auraR.toFixed(1)} ô · x${sel.commandMult.toFixed(2)}</span>`;
    } else if (sel.type === 'villager') {
      html += `<span class="label">Nghề</span><span class="value">${sel.job || '—'}</span>
      <span class="label">Đang làm</span><span class="value">${{ idle: 'rảnh', seek: 'đi tới mỏ', gather: 'thu hoạch', return: 'gánh về', build: 'xây dựng' }[sel.task] || sel.task}${sel.fleeTimer > 0 ? ' (bỏ chạy!)' : ''}</span>
      <span class="label">Đang gánh</span><span class="value">${sel.carry.amount > 0 ? sel.carry.amount.toFixed(1) + ' ' + sel.carry.type : '—'}</span>`;
    } else if (sel.type === 'medic') {
      // Thẻ của thầy lang KHÔNG dùng combatRows/nhịp đánh: mọi con số ở đó đều là
      // 0, và một bảng toàn số 0 đọc ra là "đơn vị hỏng", không đọc ra là "đơn vị
      // không đánh nhau". Thay bằng đúng ba con số nói được nó có làm việc hay không.
      const pat = sel.healing;
      // Đọc chỉ số ĐÃ CỘNG nhánh Y thuật của chính bộ lạc này, không đọc hằng số
      // gốc trong CONFIG. Một thẻ ghi "0,45 máu/tick trong 2,6 ô" trong khi đơn vị
      // thật đang chữa 0,90 trong 4,1 ô là một cái đồng hồ chạy sai — mà cả thẻ này
      // tồn tại chỉ để trả lời "nó có đang làm việc không".
      const HS = t ? healerStats(t) : { rate: CONFIG.HEALER.RATE, reach: CONFIG.HEALER.HEAL_R, seek: CONFIG.HEALER.SEEK_R, heals: 1, lv: 0 };
      html += `<span class="label">Đang chữa</span><span class="value">${pat
        ? `<span style="color:#7ab27c">${UNIT_LABEL[pat.type] || pat.type} · ${Math.round(pat.hp)}/${pat.maxHp} máu</span>`
        : 'chưa có thương binh trong tầm'}</span>
      <span class="label">Đã chữa cả đời</span><span class="value" style="color:var(--gold)">${Math.round(sel.healed)} máu</span>
      <span class="label">Tầm chữa</span><span class="value">${HS.rate.toFixed(2)} máu/tick trong ${HS.reach.toFixed(1)} ô${HS.heals > 1 ? ` · <span style="color:var(--gold)">${HS.heals} người một lúc</span>` : ''}</span>
      <span class="label">Đi tìm trong</span><span class="value">${HS.seek} ô</span>
      <span class="label">Tự băng bó</span><span class="value">${CONFIG.HEALER.SELF_RATE} máu/tick khi rảnh tay</span>`;
    } else if (sel.type === 'quarter') {
      // Cùng lý do đã viết cho thầy lang ngay trên: ô sát thương bằng 0, nên
      // combatRows chỉ in ra một bảng toàn số 0 và người xem đọc ra "đơn vị hỏng".
      // Bốn dòng dưới đây là toàn bộ câu trả lời cho "nó có đang làm việc không".
      const QS = t ? supplyStats(t) : { rate: CONFIG.SUPPLY.CAMP.RATE, slots: CONFIG.SUPPLY.CAMP.SLOTS, reach: CONFIG.SUPPLY.CAMP.R, ttl: CONFIG.SUPPLY.CAMP.TTL, lv: 0 };
      const c = sel.camp && sel.camp.hp > 0 ? sel.camp : null;
      const wait = Math.max(0, sel.campReadyAt - tick);
      html += `<span class="label">Trại đang dựng</span><span class="value">${c
        ? `<span style="color:#d8b25c">còn ${Math.max(0, (c.expireAt || 0) - tick)} tick · đang nuôi ${c.serving || 0}/${QS.slots}</span>`
        : wait > 0 ? `chờ ${wait} tick nữa mới dựng được` : 'chưa có — đang tìm chỗ'}</span>
      <span class="label">Sức trại</span><span class="value">${QS.rate.toFixed(2)} lương/tick · ${QS.slots} suất · bán kính ${QS.reach.toFixed(1)} ô</span>
      <span class="label">Tuổi thọ trại</span><span class="value">${QS.ttl} tick <span style="color:var(--bone-3)">(theo thời đại)</span></span>
      <span class="label">Giá một trại</span><span class="value">${CONFIG.BUILD.camp.cost.food} lương · ${CONFIG.BUILD.camp.cost.wood} gỗ</span>`;
    } else {
      html += `<span class="label">Mục tiêu</span><span class="value">${sel.combatTarget ? (sel.combatTarget.size !== undefined ? 'công thành' : 'giao chiến') : 'chờ lệnh'}</span>`;
      if (sel.range > 0) {
        html += `<span class="label">Tầm bắn</span><span class="value">${sel.range} ô${sel.splash ? ` · lan ${sel.splash} ô` : ''}</span>`;
      }
      html += `<span class="label">Nhịp đánh</span><span class="value">mỗi ${sel.atkCooldown} tick</span>`;
      if (sel.speedMult > 0) {
        html += `<span class="label">Tốc độ</span><span class="value" style="color:var(--gold)">${sel.speedMult.toFixed(2)} ô/tick</span>`;
      }
    }
    html += '</div>';
    // QUÂN LƯƠNG — một dòng cho MỌI đơn vị mang nó, đặt ngoài chuỗi if/else ở trên
    // vì nó đúng với cả lính, cả anh hùng, cả ba loại hỗ trợ. Nhét vào từng nhánh
    // là bảy bản chép, và bản chép thì lệch từ lần sửa thứ hai.
    if (sel.maxSupply > 0) {
      const f = sel.supply / sel.maxSupply;
      const mult = supplyMult(sel);
      const col = f <= 0.01 ? 'var(--cinnabar-hi)' : f < CONFIG.SUPPLY.HUNGRY ? '#e0a33c' : '#7ab27c';
      const src = sel.supplySrc === 'home' ? 'đang trên đất nhà — hồi lại'
                : sel.supplySrc === 'camp' ? 'đang trong trại tiếp tế'
                : 'ngoài lãnh thổ — đang hao';
      html += `<div class="kv" style="margin-top:6px;">
        <span class="label">Quân lương</span><span class="value" style="color:${col}">${Math.round(sel.supply)} / ${sel.maxSupply} <span style="color:var(--bone-3)">(${src})</span></span>
        ${mult < 0.999 ? `<span class="label">Đói</span><span class="value" style="color:var(--cinnabar-hi)">sức đánh còn ${Math.round(mult * 100)}%</span>` : ''}
      </div>`;
    }
    if (sel.type === 'quarter') {
      html += `<div class="hint" style="margin-top:8px;">Ra lò từ <b>Nhà cầu nguyện</b>. Không có vũ khí, không đánh trả — nó đi theo đạo quân và <b>dựng trại tiếp tế</b> ở nơi có ít nhất ${CONFIG.SUPPLY.CAMP.NEED_HUNGRY} người đang đói, <em>bên ngoài lãnh thổ nhà</em> (trong lãnh thổ thì đất nhà đã tiếp tế miễn phí rồi). Mỗi đội nuôi <b>một</b> cái trại một lúc; trại hết hạn thì phải chờ ${CONFIG.SUPPLY.CAMP.COOLDOWN} tick. Nhánh <b>${CONFIG.UPGRADE.LINES.supplyline.icon} Quân nhu</b> ở chính Nhà cầu nguyện nâng cả ba con số của cái trại.</div>`;
    }
    if (sel.type === 'medic') {
      html += `<div class="hint" style="margin-top:8px;">Ra lò từ <b>Nhà y tế</b>. Không có vũ khí, không đánh trả — nó đi tìm thương binh nặng nhất quanh mình và vá lại ngay giữa trận. Có thầy lang trong ${CONFIG.HEALER.COVER_R} ô thì lính bị thương <b>không rút về hậu phương nữa</b>: đó là chỗ đắt nhất của nó, và cũng là lý do bên kia nên đi tìm nó trước.</div>`;
    }
    if (isMilitary(sel.type) || sel.type === 'hero' || sel.type === 'medic') html += upgradeCreditHTML(sel, t);
  }

  if (sel.type === 'hero') {
    html += heroChestHTML(sel, t);
    html += `<div style="margin-top:10px;color:var(--gold);font-size:11px;">GEN RIÊNG của cá thể này — đời ${sel.heroGen} dòng ${t.heroLine.dynasty}</div>`;
    html += heroGeneTable(sel.genes);
  }

  // BẢNG 15 GEN CHIẾN LƯỢC GẬP LẠI MẶC ĐỊNH.
  //
  // Đo trên thẻ thật: bảng này cao 316px, và nó có mặt ở MỌI thứ được chọn thuộc
  // một bộ lạc — nên nó một mình chiếm 57% thẻ dân thường (554px), 53% thẻ lính,
  // và đẩy thẻ anh hùng lên 797px, tức là cao hơn cả phần cột còn trống (765px):
  // click một anh hùng là đẩy trọn cái tờ đang đọc xuống dưới mép màn hình.
  //
  // Nó gập được vì nó là thứ DUY NHẤT trong thẻ không nói gì về cá thể vừa click:
  // mười lăm con số y hệt nhau cho cả bộ lạc, đọc một lần là biết. Tên bộ lạc và
  // dòng dõi vẫn nằm trên nút, nên gập lại không giấu mất thông tin nào — chỉ
  // giấu mười lăm con số mà người xem chưa hỏi tới.
  html += `<button type="button" class="sel-fold" data-fold="policy" aria-expanded="${policyFoldOpen}">
    <span class="sf-chev">▾</span>
    <span>GEN CHIẾN LƯỢC của ${t.name} <span style="color:var(--bone-3)">· dòng dõi ${t.lineage}</span></span></button>`;
  if (policyFoldOpen) html += policyTable(t.policy);
  setPanelHTML(el('selectedBody'), html);
}

// Trạng thái gập sống NGOÀI DOM. Thẻ này được dựng lại 10 lần/giây khi quân đang
// chọn còn cử động (máu, mục tiêu đổi liên tục), nên một `<details open>` sẽ tự
// đóng sập lại ở lần dựng kế tiếp — cùng đúng cái bệnh mà setPanelHTML đang chữa.
let policyFoldOpen = false;
// Uỷ quyền lên panel cha, không gắn vào nút: nút bị vứt đi mỗi lần dựng lại.
el('selectedPanel').addEventListener('click', (e) => {
  if (!e.target.closest('[data-fold]')) return;
  policyFoldOpen = !policyFoldOpen;
  // Con trỏ đang nằm trong panel ngay lúc bấm, nên cửa "hoãn khi hover" của
  // setPanelHTML sẽ nuốt mất lần vẽ này tới 1,5 giây — bấm xong không thấy gì
  // xảy ra. Xoá dấu thời gian để lần vẽ do CHÍNH cú bấm sinh ra luôn được đi qua.
  el('selectedBody').__panelAt = 0;
  renderSelected();
});

function renderCharts() {
  drawLineChart(el('chartPop'), tribes.map(t => ({ values: history.pop[t.id], color: t.color })), true);
  drawLineChart(el('chartFood'), tribes.map(t => ({ values: history.food[t.id], color: t.color })), true);
  el('labelPop').textContent = tribes.map(t => history.pop[t.id][history.pop[t.id].length - 1] || 0).join(' / ');
  el('labelFood').textContent = tribes.map(t => Math.round(t.res.food)).join(' / ');
}

function renderLog() {
  const html = eventLog.slice(-14).reverse()
    .map(e => `<div><span class="t">${e.tick}</span><span style="color:${e.color}">${e.text}</span></div>`).join('');
  setPanelHTML(el('eventLog'), html);
}

// ============================================================
// Lớp phủ trên khung hình chính — bảng bộ lạc / nhật ký / đang chọn
// ============================================================
// Cùng số liệu với các bảng ở cột phải, nhưng RÚT GỌN để liếc một cái là nắm được
// mà không phải rời mắt khỏi bản đồ. Chỉ dựng lại khi đang bật (showTribes/showLog)
// hoặc khi có quân đang chọn — không dựng vô ích mỗi vài frame khi tắt.
let showTribes = false, showLog = false;

function renderOverlayTribes() {
  const ranked = tribes.slice().sort((a, b) => tribeScore(b) - tribeScore(a));
  // Cùng cách gộp với bảng ở cột phải (xem renderTribeBoard): hai bảng nói khác
  // nhau về cùng một trạng thái thì người xem phải tự đoán bên nào đang nói thật.
  let html = '<table><tr><th>Bộ lạc</th><th title="thời đại 1-4">Đại</th>'
    + '<th title="dân thường / quân đội / trần dân số">👥</th>'
    + '<th title="cận/xa/ngựa/máy">⚔</th><th>Điểm</th></tr>';
  for (const t of ranked) {
    const s = t.stats || { villagers: 0, soldiers: 0, popCap: 0, melee: 0, archers: 0, catapults: 0, cavalry: 0 };
    const tg = (t.warTarget !== null && t.alive ? '<span class="tg" style="color:var(--cinnabar-hi)" title="đang chinh phạt">⚔</span>' : '')
      + (t.starving && t.alive ? '<span class="tg" style="color:var(--cinnabar-hi)" title="nạn đói">✖</span>' : '')
      + (s.bcount && s.bcount.wonder ? '<span class="tg" style="color:var(--gold)" title="đang có Kỳ quan">🏛</span>' : '')
      // Cùng huy hiệu Thiên mệnh với bảng ở cột phải — hai bảng nói khác nhau về
      // cùng một trạng thái thì người xem phải tự đoán bên nào đang nói thật.
      + (gameMode !== 'defend' && t.alive && t.townsRazed >= CONFIG.WONDER.NEED_TOWNS
          ? `<span class="tg" style="color:var(--gold-hi)" title="đủ Thiên mệnh — được khởi công Kỳ quan">👑</span>` : '')
      + (t.prayer ? '<span class="tg" style="color:var(--gold)" title="đang khẩn cầu">🙏</span>' : '');
    html += `<tr class="${t.alive ? '' : 'dead'}" data-tribe="${t.id}" title="Click để camera nhảy tới kinh đô">
      <td><span class="sw" style="background:${t.color}"></span>${t.name}${tg}</td>
      <td title="${CONFIG.AGE.NAMES[t.age]} — mái ${AGE_MAT[t.age].name}"><span class="sw" style="background:${AGE_MAT[t.age].roof}"></span>${t.age}</td>
      <td class="pop3" title="${s.villagers} dân · ${s.soldiers || 0} quân · trần ${s.popCap}">${s.villagers}<span class="sl">/</span><span style="color:var(--gold)">${s.soldiers || 0}</span><span class="sl">/</span><span style="color:var(--bone-3)">${s.popCap}</span></td>
      <td>${s.melee || 0}<span style="color:var(--bone-3)">/</span>${s.archers || 0}<span style="color:var(--bone-3)">/</span><span style="color:${s.cavalry ? 'var(--gold)' : 'inherit'}">${s.cavalry || 0}</span><span style="color:var(--bone-3)">/</span>${s.catapults || 0}</td>
      <td>${tribeScore(t)}</td></tr>`;
  }
  setPanelHTML(el('ovTribes'), html + '</table>');
}

function renderOverlayLog() {
  const html = eventLog.slice(-8).reverse()
    .map(e => `<div class="row"><span class="t">${e.tick}</span><span style="color:${e.color}">${e.text}</span></div>`).join('');
  setPanelHTML(el('ovLog'), html || '<div style="color:var(--bone-3)">Chưa có biến cố nào.</div>');
}

// Dải "đang chọn" dưới bảng điều khiển. Hiện tự động khi click một quân/nhà/hang,
// ✕ để bỏ chọn. Cùng dữ liệu với thẻ chi tiết ở cột phải, nhưng RÚT GỌN thành một
// hàng ngang: ở đây thứ cần là liếc một cái biết ngay, còn muốn đọc gen và hòm đồ
// đầy đủ thì đã có bảng "Đang chọn" bên phải.
function renderOverlaySelected() {
  const box = el('inspectBody');
  const hint = el('inspectEmpty');
  const sel = getSelected();
  if (!sel) {
    if (box.style.display !== 'none') { box.style.display = 'none'; hint.style.display = ''; }
    return;
  }
  box.style.display = 'flex';
  hint.style.display = 'none';
  const rows = [];
  const kv = (l, v) => rows.push(`<span><b>${l}</b>${v}</span>`);
  let color = '#b1a58c', title = describeSelected(sel), hpFrac = sel.hp / sel.maxHp;
  let extra = '';   // khối HTML nằm ngoài lưới nhãn/giá trị (hiện chỉ có hòm đồ)

  if (sel.isLair) {
    const T = lairTierSpec(sel); color = lairSkin(sel).edge; title = `${T.name} — cấp ${sel.tier}/3`;
    let alive = 0; for (const m of units) if (m.type === 'monster' && m.lairId === sel.id) alive++;
    kv('Quái sống', `${alive}/${T.cap}`); kv('Đã ăn', `${sel.killCount} mạng`);
  } else if (sel.type === 'monster') {
    const spec = CONFIG.MONSTER.TYPES[sel.mType]; color = spec.color; title = spec.label;
    kv('Công / Thủ', `${effAttack(sel).toFixed(1)} / ${effDefense(sel).toFixed(1)}`);
    kv('Nguy hiểm', sel.threat.toFixed(1) + '×');
    kv('Đang làm', sel.raidTribe >= 0 ? 'đi cướp' : sel.assault ? 'tràn sóng' : sel.combatTarget ? 'đang săn' : 'giữ hang');
  } else if (sel.isWall) {
    // Ô TƯỜNG PHẢI ĐƯỢC ĐÓN Ở CỬA, y như trong renderSelected và trong dealDamage.
    // Nó có `size` nên `sel.size !== undefined` bên dưới là ĐÚNG với nó, mà nó
    // không có `type` — rơi xuống đó là `CONFIG.BUILD[undefined].label` và cả dải
    // này ném lỗi mỗi khi ai bấm vào tường. Lần thứ tư một vật "có máu, có size,
    // không phải công trình" phải có nhánh riêng (hang ổ · quái · tường ở thẻ đầy
    // đủ · tường ở đây). Nhánh này thiếu suốt từ lúc tường ra đời: thẻ đầy đủ có,
    // dải rút gọn không — vì hai chỗ cùng vẽ một thứ thì sửa một chỗ là quên chỗ kia.
    const t = tribes[sel.tribeId]; if (t) color = t.color;
    const T = CONFIG.WALL.TIERS[clamp(sel.tier || 1, 1, CONFIG.WALL.TIERS.length - 1)];
    const kind = sel.corner ? 'Tháp góc' : sel.gate ? 'Cổng thành' : 'Tường thành';
    title = `${kind} · ${t ? t.name : '?'}`;
    kv('Bậc', T.name);
    kv('Trạng thái', sel.hp <= 0
      ? `<span style="color:#d05a44">ĐÃ VỠ — lành lại sau ${Math.max(0, sel.downUntil - tick)} tick</span>`
      : 'còn đứng');
  } else {
    const t = tribes[sel.tribeId]; if (t) color = t.color;
    if (sel.size !== undefined) {
      title = `${CONFIG.BUILD[sel.type].label} · ${t ? t.name : '?'}`;
      kv('Trạng thái', sel.done ? 'hoàn thành' : 'đang xây ' + Math.round(sel.progress / sel.buildTicks * 100) + '%');
      if (sel.type === 'wonder' && sel.done) kv('Còn giữ', Math.max(0, CONFIG.WONDER.HOLD_TICKS - (tick - sel.wonderDoneAt)) + ' tick');
    } else if (sel.type === 'villager') {
      title = `Dân thường · ${t ? t.name : '?'}`;
      kv('Nghề', sel.job || '—');
      kv('Đang làm', { idle: 'rảnh', seek: 'tới mỏ', gather: 'thu hoạch', return: 'gánh về', build: 'xây' }[sel.task] || sel.task);
      if (sel.carry.amount > 0) kv('Đang gánh', sel.carry.amount.toFixed(0) + ' ' + sel.carry.type);
    } else if (sel.type === 'hero') {
      title = `⚔ ${sel.name} · ${t ? t.name : '?'}`;
      kv('Công / Thủ', `${effAttack(sel).toFixed(1)} / ${effDefense(sel).toFixed(1)}`);
      if (sel.speedMult) kv('Tốc độ', sel.speedMult.toFixed(2) + ' ô/tick'
        + (t && t.age >= CONFIG.HERO.MOUNT_AGE ? ' <span style="color:var(--gold)">🐴</span>' : ''));
      kv('Chiến công', `${sel.heroKills} mạng · ${sel.heroRazed} nhà`);
      kv('Trạng thái', sel.mending ? '<span style="color:var(--gold)">về trạm xá</span>'
        : sel.retreating ? 'rút lui' : 'đang chiến');
      // Hòm đồ 6 ngăn dùng bản THU NHỎ ở đây (xem .slots.mini): cỡ 30px vốn dành
      // cho cột phải sẽ chiếm gần một phần tư bề ngang dải và đẩy mọi thứ xuống hàng.
      extra = `<div class="ins-chest"><span class="lb">Hòm đồ</span>
        <div class="slots mini">${heroSlotsHTML(sel)}</div></div>`;
    } else {
      title = `${UNIT_LABEL[sel.type] || sel.type} · ${t ? t.name : '?'}`;
      // Công và thủ gộp MỘT ô ở dải ngang, tách hai dòng ở cột phải. Ở đây thứ cần
      // đọc là TỈ LỆ giữa hai số, và "13,0 / 4,0" nói được điều đó trong một lần
      // liếc mắt mà không tốn thêm một ô nữa trên một hàng vốn đã chật.
      kv('Công / Thủ', `${effAttack(sel).toFixed(1)} / ${effDefense(sel).toFixed(1)}`);
      if (sel.speedMult > 0) kv('Tốc độ', sel.speedMult.toFixed(2) + ' ô/tick');
      kv('Mục tiêu', sel.mending ? '<span style="color:var(--gold)">về trạm xá</span>'
        : sel.combatTarget ? (sel.combatTarget.size !== undefined ? 'công thành' : 'giao chiến') : 'giữ hàng');
    }
  }

  const barColor = hpFrac > 0.5 ? '#5aa07c' : hpFrac > 0.25 ? '#e09a3c' : '#d05a44';
  // Nút ✕ KHÔNG nằm trong khối được dựng lại — nó là một thẻ cố định trong HTML,
  // anh em với #insContent (xem #inspectBar). Đây là điểm khác biệt đáng kể so với
  // các panel khác, và nó cần thiết vì `.ins-close:hover` đòi trạng thái hover nằm
  // trên CHÍNH cái nút: một `<tr>` sống sót thì `tr:hover td` vẫn khớp cho các ô con
  // mới, nhưng một cái nút bị thay thì không gì cứu được nó. Thẻ cố định thì không
  // bao giờ nháy, và cũng không bao giờ nuốt mất một cú bấm (mousedown và mouseup
  // luôn rơi vào cùng một thẻ, dù giữa hai cái đó panel có dựng lại bao nhiêu lần).
  setPanelHTML(el('insContent'), `<span class="ins-name" style="color:${color}">
      <span class="sw" style="background:${color}"></span>${title}</span>
    <span class="ins-hp">
      <span class="bar"><i style="width:${(clamp(hpFrac, 0, 1) * 100).toFixed(0)}%;background:${barColor}"></i></span>
      <span class="num">${Math.round(sel.hp)}/${sel.maxHp}</span></span>
    <span class="ins-kv">${rows.join('')}</span>${extra}`);
}

const GENE_COLORS = {
  aggression: '#e04b32', militaryRatio: '#e09a3c', foodWeight: '#5aa07c',
  woodWeight: '#8d6e63', ageRush: '#63b4ad',
  rangedRatio: '#a86ac6', stoneWeight: '#8d9490', wonderDrive: '#d8a544', piety: '#d4788a',
  discipline: '#7fa8d9', cityPlan: '#c9a227',
  garrison: '#c96a4a', roadDrive: '#9c8f6a', colonize: '#6fae7a', heroDrive: '#c8a2d8',
  fortify: '#8fa9b8', expedition: '#d8b25c'
};

function renderEraHistory() {
  if (!eraHistory.length) return;
  setPanelHTML(el('eraHistory'), eraHistory.map(h => {
    const icon = h.reason.startsWith('thống nhất') ? '👑'
               : h.reason.startsWith('giữ vững') ? '🏛' : '📜';
    return `<div style="padding:3px 0;border-bottom:1px solid #221b15;">
      <span style="color:var(--bone-3)">K${h.era}</span> ${icon}
      <span class="win" style="color:${h.color}">${h.winner}</span>
      <span style="color:var(--bone-3)">— ${h.reason}, ${CONFIG.AGE.NAMES[h.age]}, ${h.score} điểm</span>
      <div style="color:var(--bone-3);font-size:10.5px;">hiếu chiến ${h.policy.aggression.toFixed(2)} · lính ${(h.policy.militaryRatio * 100).toFixed(0)}% · lương ${h.policy.foodWeight.toFixed(1)} · gỗ ${h.policy.woodWeight.toFixed(1)}</div>
    </div>`;
  }).join(''));
}

let geneLegendDrawn = false;
function renderGeneChart() {
  if (!geneLegendDrawn) {
    el('geneLegend').innerHTML = HEADLINE_GENES.map(k =>
      `<span style="font-size:10.5px;margin-right:9px;color:${GENE_COLORS[k]}">■ ${GENE_LABELS[k]}</span>`).join('');
    geneLegendDrawn = true;
  }
  // eraHistory lưu mới-nhất-trước; đảo lại để trục thời gian chạy trái sang phải.
  const chron = eraHistory.slice().reverse();
  const series = HEADLINE_GENES.map(k => {
    const spec = POLICY_SPEC[k];
    return {
      color: GENE_COLORS[k],
      values: chron.map(h => clamp((h.policy[k] - spec.bounds[0]) / (spec.bounds[1] - spec.bounds[0]), 0, 1))
    };
  });
  // shared = true VÀ mọi gen đã chuẩn hoá về 0–1 -> các đường so sánh được với
  // nhau trực tiếp, chứ không phải mỗi đường tự co giãn theo biên độ riêng.
  drawLineChart(el('chartGenes'), series, true, 90);
}

const GENE_LABELS = {
  foodWeight: 'ưu tiên lương', woodWeight: 'ưu tiên gỗ', goldWeight: 'ưu tiên vàng',
  militaryRatio: 'tỉ lệ lính', aggression: 'độ hiếu chiến', expansion: 'bành trướng',
  houseBuffer: 'đệm chỗ ở', farmTarget: 'số ruộng', towerTarget: 'số tháp', ageRush: 'vội lên đời',
  stoneWeight: 'ưu tiên đá', rangedRatio: 'quân tầm xa', wonderDrive: 'khao khát Kỳ quan',
  piety: 'thành tâm', discipline: 'kỷ luật', cityPlan: 'quy hoạch',
  garrison: 'số lò quân', roadDrive: 'đường cái', colonize: 'lập đô', heroDrive: 'đầu tư tướng',
  fortify: 'phòng thủ', expedition: 'viễn chinh'
};
// 6 gen đáng kể nhất để đưa lên thẻ tổng kết — hiện đủ 13 thì thành bảng số vô hồn.
// `woodWeight` bị nhường chỗ cho `rangedRatio`: gỗ đã có mặt từ bản đầu và đường
// trôi của nó thì phẳng suốt hàng chục kỷ nguyên, còn tỉ lệ quân tầm xa là gen duy
// nhất trong bộ mà giá trị tốt nhất phụ thuộc vào việc BA BỘ LẠC KIA đang chơi kiểu
// gì — tức là gen duy nhất có thể dao động thay vì hội tụ. Đó mới là đường đáng vẽ.
// `stoneWeight` nhường chỗ cho `discipline` ở Phase 3.17, cùng một lý lẽ đã dùng
// khi gỗ nhường chỗ cho quân tầm xa: ưu tiên đá là một gen KINH TẾ, và đường trôi
// của nó bị quyết định gần như hoàn toàn bởi việc bản đồ có sinh mỏ đá gần kinh đô
// hay không — tức là phần lớn biến thiên của nó là nhiễu địa hình, không phải chọn
// lọc. Kỷ luật đội hình thì thuộc đúng nhóm đáng vẽ nhất: giá trị tốt nhất của nó
// phụ thuộc vào việc ba bộ lạc kia đang dàn quân kiểu gì.
// `wonderDrive` nhường chỗ cho `garrison` ở Phase 3.28, và lý lẽ đúng bằng lý lẽ
// đã dùng hai lần trước: một đường chỉ đáng vẽ nếu biến thiên của nó là CHỌN LỌC
// chứ không phải nhiễu. Khao khát Kỳ quan chỉ có hậu quả từ Hoàng Kim trở lên, mà
// từ Phase 3.26 nó còn đòi hạ được kinh đô địch trước — nên ở phần lớn kỷ nguyên
// gen này chưa bao giờ được HỎI TỚI, và đường trôi của nó là trôi dạt thuần tuý.
// Số lò quân thì có hậu quả từ tick ~500 của mọi kỷ nguyên, và giá trị tốt nhất của
// nó phụ thuộc vào việc bản đồ này có bao nhiêu trận đánh — tức là vào ba bộ lạc
// kia. Đó đúng là nhóm gen dao động thay vì hội tụ, nhóm đáng vẽ nhất.
const HEADLINE_GENES = ['aggression', 'militaryRatio', 'rangedRatio', 'discipline', 'garrison', 'piety'];

function showEraCard(winner, reason) {
  const s = winner.stats || computeTribeStats(winner);
  // So gen nhà vô địch kỳ này với nhà vô địch kỳ trước: mũi tên lên/xuống chính
  // là "tiến hoá" hiện ra thành hình — thứ đáng xem nhất của cả trò chơi.
  const prev = eraHistory.length > 1 ? eraHistory[1].policy : null;
  const genes = HEADLINE_GENES.map(k => {
    const spec = POLICY_SPEC[k];
    const v = winner.policy[k];
    const pct = clamp((v - spec.bounds[0]) / (spec.bounds[1] - spec.bounds[0]), 0, 1) * 100;
    let delta = '';
    if (prev) {
      const d = v - prev[k];
      if (Math.abs(d) > (spec.range[1] - spec.range[0]) * 0.08) {
        delta = d > 0 ? `<span class="up">▲</span>` : `<span class="down">▼</span>`;
      }
    }
    return `<div class="gene"><span class="n">${GENE_LABELS[k]}</span>
      <span class="track"><i style="width:${pct.toFixed(0)}%"></i></span>
      <span class="v">${v.toFixed(2)} ${delta}</span></div>`;
  }).join('');

  el('eraCard').innerHTML = `<div class="card">
    <div class="seal"><span class="k">KỶ</span><span class="n">${era}</span></div>
    <div class="eyebrow">Kỷ nguyên ${era} khép lại</div>
    <div class="champ" style="color:${winner.color}">${winner.name}</div>
    <div class="how">${reason} · ${CONFIG.AGE.NAMES[winner.age]}</div>
    <div class="facts">
      <div class="fact"><b>${s.villagers + s.soldiers}</b><span>dân số</span></div>
      <div class="fact"><b>${winner.kills}</b><span>chiến công</span></div>
      <div class="fact"><b>${s.bcount.town + s.bcount.house + s.bcount.farm + s.bcount.barracks + s.bcount.tower}</b><span>công trình</span></div>
      <div class="fact"><b>${tribeScore(winner)}</b><span>điểm</span></div>
    </div>
    <div class="dna">
      <div class="dna-title">Gen chiến lược thắng cuộc${prev ? ' — so với nhà vô địch kỳ trước' : ''}</div>
      ${genes}
    </div>
    <div class="next">Bộ gen này sẽ được nhân bản + đột biến thành 3 bộ lạc của kỷ nguyên ${era + 1}…</div>
  </div>`;
  el('eraCard').style.display = 'flex';
}
function hideEraCard() { el('eraCard').style.display = 'none'; }

