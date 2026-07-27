'use strict';
// ============================================================
// 13-render-world.js
// ------------------------------------------------------------
// Vẽ khung hình thế giới: camera/toạ độ, lớp địa hình, mọi sprite (nhà, dân,
// ngựa, kỵ binh, máy bắn đá, anh hùng, quái, hang ổ), hiệu ứng, lãnh thổ,
// che khuất theo chiều cao, thanh HUD, hàng đợi nhãn, minimap.
// FILE LỚN NHẤT — chia tiếp được theo 4 mốc: camera+địa hình / sprite tĩnh /
// sprite chiến đấu / HUD.
// Tách cơ học từ civilization.html một-file, dòng 7467–10915.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Render — bản đồ chính
// ============================================================
// Chữ trên canvas dùng ĐÚNG hai họ chữ của bảng kiểu bên ngoài. Trước đây mọi
// dòng chữ vẽ lên bản đồ đều là `-apple-system` — cùng một phông với thanh
// công cụ của trình duyệt — nên chữ trong thế giới và chữ của phần mềm không
// phân biệt được với nhau. Chữ SÁCH cho những gì thuộc về thế giới (tên bộ
// lạc, biến cố được chép vào sử), chữ máy cho những gì thuộc về đồng hồ (tick,
// fps, tốc độ): hai giọng khác nhau cho hai loại sự thật khác nhau.
const F_DISPLAY = '"Iowan Old Style","Superclarendon",Charter,Palatino,Georgia,serif';
const F_UI = '"Avenir Next","Segoe UI",system-ui,sans-serif';
const F_DATA = '"SF Mono",ui-monospace,Menlo,monospace';

const canvasWrap = document.getElementById('canvasWrap');
const simCanvas = document.getElementById('simCanvas');
simCanvas.width = CONFIG.VIEWPORT_WIDTH * CONFIG.CELL_SIZE;
simCanvas.height = CONFIG.VIEWPORT_HEIGHT * CONFIG.CELL_SIZE;
// `let`, không `const` — và đây là thay đổi cho phép Thư khố tồn tại.
//
// Mọi hàm vẽ trong file này (drawUnit, drawBuilding, drawMonster, drawHero...) đọc
// `ctx` như một biến toàn cục chứ không nhận nó làm tham số. Chừng nào nó còn là
// `const` trỏ vào canvas chính thì không có cách nào vẽ một con quái lên một canvas
// khác — và Thư khố sẽ buộc phải có một bộ hình vẽ THỨ HAI, vẽ lại bằng tay.
//
// Bộ hình thứ hai đó là thứ phải tránh bằng mọi giá: nó đúng vào ngày viết ra và
// sai dần từ ngày hôm sau, vì mỗi lần chỉnh sprite trong game sẽ không ai nhớ sửa
// bản trong sách. Một cuốn bách khoa mô tả sai chính trò chơi mà nó mô tả thì tệ
// hơn là không có cuốn nào.
//
// Đổi một từ khoá thì Thư khố gọi thẳng ĐÚNG các hàm mà bản đồ đang gọi, và không
// bao giờ lệch được. Đổi ngôi an toàn vì JS đơn luồng: withCanvas() đồng bộ từ đầu
// tới cuối, nên vòng lặp rAF không thể chen vào giữa lúc `ctx` đang trỏ đi chỗ khác.
let ctx = simCanvas.getContext('2d');

// Mượn `ctx` cho một canvas khác trong đúng một lượt vẽ, rồi trả lại. `finally` để
// một ngoại lệ giữa chừng không bỏ lại `ctx` trỏ vào canvas của Thư khố — nếu thế
// thì cả bản đồ chính sẽ vẽ vào một ô vuông 64px ở đâu đó và màn hình đứng hình
// mà không một dòng lỗi nào chỉ ra vì sao.
function withCanvas(targetCtx, fn) {
  const prev = ctx;
  ctx = targetCtx;
  try { fn(); } finally { ctx = prev; }
}

const minimapCanvas = document.getElementById('minimapCanvas');
minimapCanvas.width = Math.round(CONFIG.GRID_WIDTH * CONFIG.MINIMAP_SCALE);
minimapCanvas.height = Math.round(CONFIG.GRID_HEIGHT * CONFIG.MINIMAP_SCALE);
const mctx = minimapCanvas.getContext('2d');

function clampCamera() {
  // Math.max(0, ...): ở mức zoom rộng nhất khung nhìn có thể to hơn cả world,
  // khi đó khoảng kéo camera là 0 chứ không phải số âm.
  camX = clamp(camX, 0, Math.max(0, CONFIG.GRID_WIDTH - CONFIG.VIEWPORT_WIDTH));
  camY = clamp(camY, 0, Math.max(0, CONFIG.GRID_HEIGHT - CONFIG.VIEWPORT_HEIGHT));
}

// Zoom = đổi số PX mỗi ô, đồng thời tính lại khung nhìn để canvas giữ nguyên
// kích thước hiển thị (900x600px). Giữ nguyên điểm đang nhìn ở TÂM màn hình
// trước/sau khi zoom, nếu không mỗi lần zoom camera sẽ nhảy lung tung.
// Khung nhìn CO GIÃN theo cửa sổ, thay cho 900x600 cứng.
//
// Kích thước cứng hỏng ở cả hai đầu: trên màn 2560 thì hai phần ba màn hình bỏ
// trống trong khi thứ người ta muốn nhìn lại bị nhốt trong một ô nhỏ; trên laptop
// 1280 thì 900 + bảng bên phải 380 vượt quá chiều ngang, và vì body có
// overflow:hidden nên bảng bị CẮT CỤT trong im lặng — không có thanh cuộn, không
// có dấu hiệu gì, chỉ là một cột số biến mất.
// Trừ 448 để chừa đúng chỗ cho bảng bên phải: bề rộng nội dung tự nhiên của nó
// là ~413 (rộng hơn cái min-width 380 ghi trong CSS — đo thật, không đoán), cộng
// viền, thanh cuộn và một chút đệm.
// `let`, không `const`: trước đây hai số này chốt cứng theo bề rộng cửa sổ LÚC TẢI
// TRANG rồi không đổi nữa — mở file ở cửa sổ hẹp thì khung nhìn kẹt nhỏ mãi, và cột
// dữ liệu bên phải rộng hơn cả bức tranh. Giờ tính lại khi cửa sổ đổi kích thước
// (xem handler 'resize' bên dưới) để thế giới luôn giành đúng phần không gian của nó.
let CANVAS_PX_W = clamp(Math.floor(window.innerWidth - 448), 560, 1180);
let CANVAS_PX_H = clamp(Math.floor(window.innerHeight - 320), 380, 820);
// document.getElementById chứ không phải tiện ích `el()`: `el` là một `const` khai
// báo ở tận phần UI phía dưới, nên gọi nó ở đây rơi vào vùng chết (TDZ) và ném
// ReferenceError — kịch bản tệ nhất là toàn bộ script chết đứng tại dòng này mà
// bảng console của trình duyệt lại không hiện gì cả (đã gặp đúng một lần khi viết
// bản này: trang trắng nửa vời, `frame` có tồn tại, `cameraMode` thì không).
for (const id of ['controls', 'hotkeys', 'legend']) {
  document.getElementById(id).style.maxWidth = CANVAS_PX_W + 'px';
}
function setZoom(cs) {
  const centerX = camX + CONFIG.VIEWPORT_WIDTH / 2;
  const centerY = camY + CONFIG.VIEWPORT_HEIGHT / 2;
  CONFIG.CELL_SIZE = cs;
  CONFIG.VIEWPORT_WIDTH = Math.min(CONFIG.GRID_WIDTH, Math.floor(CANVAS_PX_W / cs));
  CONFIG.VIEWPORT_HEIGHT = Math.min(CONFIG.GRID_HEIGHT, Math.floor(CANVAS_PX_H / cs));
  simCanvas.width = CONFIG.VIEWPORT_WIDTH * cs;
  simCanvas.height = CONFIG.VIEWPORT_HEIGHT * cs;
  camX = centerX - CONFIG.VIEWPORT_WIDTH / 2;
  camY = centerY - CONFIG.VIEWPORT_HEIGHT / 2;
  clampCamera();
}

// Cửa sổ đổi kích thước → tính lại khổ tranh rồi giao cho setZoom suy ra khung nhìn
// và kích thước canvas. Nền địa hình vẽ theo GRID (không theo khung nhìn) nên khỏi
// phải vẽ lại; chỉ vùng đang thấy là đổi. Debounce một nhịp cho khỏi giật khi kéo.
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    CANVAS_PX_W = clamp(Math.floor(window.innerWidth - 448), 560, 1180);
    CANVAS_PX_H = clamp(Math.floor(window.innerHeight - 320), 380, 820);
    for (const id of ['controls', 'hotkeys', 'legend']) {
      document.getElementById(id).style.maxWidth = CANVAS_PX_W + 'px';
    }
    setZoom(CONFIG.CELL_SIZE);
  }, 120);
});

function focusOn(x, y) {
  camX = x - CONFIG.VIEWPORT_WIDTH / 2;
  camY = y - CONFIG.VIEWPORT_HEIGHT / 2;
  clampCamera();
}
// Toạ độ VẼ của một đơn vị. Có nhánh dự phòng về (x, y) vì renderWorld() cũng
// được gọi từ nơi khác ngoài vòng lặp chính (ví dụ ngay sau khi đổi zoom), tức
// có thể chạy trước cả lần updateRenderPositions đầu tiên của một đơn vị vừa sinh.
function uRX(u) { return u.rx === undefined ? u.x : u.rx; }
function uRY(u) { return u.ry === undefined ? u.y : u.ry; }

function worldToPx(wx, wy) {
  return [(wx - camX) * CONFIG.CELL_SIZE, (wy - camY) * CONFIG.CELL_SIZE];
}
function inView(px, py, pad) {
  return px + pad >= 0 && px - pad <= simCanvas.width && py + pad >= 0 && py - pad <= simCanvas.height;
}

// ------------------------------------------------------------
// Lớp nền địa hình — vẽ SẴN một lần mỗi kỷ nguyên vào canvas ngoài màn hình rồi
// mỗi frame chỉ blit vùng đang nhìn. Nhờ vậy nền có thể chi tiết tuỳ thích (pha
// màu theo độ ẩm, vệt mép cát, lòng chảo nông/sâu) mà chi phí mỗi frame vẫn chỉ
// là một lệnh drawImage duy nhất, thay vì 38.400 lần fillRect.
// ------------------------------------------------------------
function isBasinAt(x, y) {
  return inBounds(x, y) && terrainMap[y * CONFIG.GRID_WIDTH + x] === T_BASIN;
}

// Độ cao có kẹp biên: ở mép bản đồ thì lấy ô trong cùng, để gradient không nhảy vọt.
function elevAt(x, y) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  const cx = x < 0 ? 0 : x >= W ? W - 1 : x;
  const cy = y < 0 ? 0 : y >= H ? H - 1 : y;
  return elevMap[cy * W + cx];
}

// Khoảng cách tới mép của từng ô đầm, bằng BFS đa nguồn xuất phát từ TOÀN BỘ ô
// không phải đầm. Đây là thứ biến vùng trũng từ "một mảng nâu phẳng" thành một
// lòng chảo: sát mép thì còn khô và sáng, vào giữa thì lún, ẩm và tối dần. Chạy
// đúng một lần mỗi kỷ nguyên.
let basinDepth = null;
function computeBasinDepth() {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT, N = W * H;
  const d = new Uint8Array(N);
  const q = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) {
    if (terrainMap[i] !== T_BASIN) { d[i] = 0; q[qt++] = i; }
    else d[i] = 255;
  }
  const MAXD = 15;
  while (qh < qt) {
    const i = q[qh++], dv = d[i];
    if (dv >= MAXD) continue;
    const x = i % W, y = (i / W) | 0;
    if (x > 0     && d[i - 1] === 255) { d[i - 1] = dv + 1; q[qt++] = i - 1; }
    if (x < W - 1 && d[i + 1] === 255) { d[i + 1] = dv + 1; q[qt++] = i + 1; }
    if (y > 0     && d[i - W] === 255) { d[i - W] = dv + 1; q[qt++] = i - W; }
    if (y < H - 1 && d[i + W] === 255) { d[i + W] = dv + 1; q[qt++] = i + W; }
  }
  for (let i = 0; i < N; i++) if (d[i] === 255) d[i] = MAXD;
  return d;
}

let baseTintCanvas = document.createElement('canvas');

function renderTerrainLayer() {
  const LP = CONFIG.TERRAIN.LAYER_PX;
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  terrainCanvas.width = W * LP;
  terrainCanvas.height = H * LP;
  const t = terrainCanvas.getContext('2d');
  basinDepth = computeBasinDepth();

  // ── LỚP MÀU NỀN vẽ ở 1 px MỖI Ô, rồi phóng to CÓ NỘI SUY ────────────────
  // Trước 3.8 màu nền được tô thẳng ở độ phân giải lớn: mỗi ô là một hình vuông
  // phẳng lì cạnh 8-10 px, và khi zoom gần thì cả mặt đất hiện ra thành lưới ô
  // vuông đúng nghĩa đen. Vẽ nhỏ rồi phóng to biến chính cái lưới đó thành phép
  // NỘI SUY SONG TUYẾN giữa tâm các ô — màu chuyển mượt, sườn đồi ra sườn đồi,
  // đáy hồ sâu dần chứ không tụt bậc thang.
  //
  // Chi tiết SẮC NÉT (cỏ, hoa, sỏi, gợn sóng, viền bờ) thì vẫn vẽ ở độ phân giải
  // đầy đủ ĐÈ LÊN sau. Đó là cả mẹo: cái cần mượt thì cho mượt, cái cần sắc thì
  // giữ sắc — trộn chung một lớp thì buộc phải hy sinh một trong hai.
  baseTintCanvas.width = W;
  baseTintCanvas.height = H;
  const bt = baseTintCanvas.getContext('2d');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, kind = terrainMap[i], m = moistMap[i];
      const p = pigment(x, y);                       // -1..1, VŨNG bột màu
      const slope = (elevAt(x + 1, y) - elevAt(x - 1, y))
                  + (elevAt(x, y + 1) - elevAt(x, y - 1));
      const shade = clamp(slope * CONFIG.TERRAIN.SHADE_STRENGTH, -1, 1);
      if (kind === T_BASIN) {
        // Ô liu xám ở mép, nâu đất ẩm ở đáy — vẫn tối theo BÌNH PHƯƠNG độ sâu
        // như hồi còn là nước. Cùng một lý do: đáy lòng chảo là chỗ đọng ẩm và
        // đọng bóng, tối tuyến tính thì ra một mảng nâu phẳng dán lên bản đồ,
        // tối bình phương thì mắt đọc ra chiều sâu.
        // Đây là ĐẦU TỐI của cả bảng màu — vị trí mà mặt nước từng giữ. Nếu để
        // vùng trũng sáng ngang mặt cỏ thì bản đồ mất luôn khoảng tương phản và
        // 12% diện tích trở thành 12% không nói gì.
        // Số đo, không phải mắt: bản chỉnh đầu đặt mép đầm ở độ sáng 34% và đo ra
        // độ chói 101 — mặt cỏ là 105. Tức là vành ngoài của lòng chảo TÀNG HÌNH
        // trước mặt cỏ, chỉ khác nhau ở sắc, và cả vùng trũng chỉ hiện ra ở chỗ
        // sâu nhất. Hạ hẳn đầu nông xuống 25% (chói ~72) thì cái hố hiện ra
        // NGUYÊN HÌNH ngay từ mép, và bậc từ vành cát (chói 158) xuống lòng chảo
        // đọc đúng ra một bờ đất tụt xuống.
        const dep = Math.min(basinDepth[i], 15) / 15, dd = dep * dep;
        bt.fillStyle = `hsl(${58 - dd * 22}, ${18 + dd * 7}%, ${25 - dd * 11 + shade * 3 + p * 1.8}%)`;
      } else if (kind === T_SAND) {
        // Cát là mốc SÁNG NHẤT của cả bản đồ. Bản trước nó vàng cam và chỉ nhỉnh
        // hơn mặt cỏ vài phần trăm độ sáng, nên bờ biển tan vào đất liền. Ngả về
        // bột xương và kéo lên hẳn: bức tranh cần một đầu sáng để mọi thứ còn
        // lại có chỗ mà tối đi.
        bt.fillStyle = `hsl(${40 + m * 6}, ${19 + m * 11}%, ${55 + m * 6 + shade * 6 + p * 3}%)`;
      } else {
        // Ô liu khô -> lục khổng tước ẩm, và TÁCH ẤM/LẠNH theo ánh sáng: sườn
        // hứng nắng ngả về vàng, sườn khuất ngả về lam. Đây là mẹo cũ nhất của
        // tranh phong cảnh và nó gần như miễn phí ở đây — một số hạng trong biểu
        // thức hue — nhưng nó là khác biệt giữa "mặt đất được tô một màu xanh"
        // và "mặt đất có ánh sáng chiếu lên".
        // Vũng bột màu đổ phần lớn sức của nó vào SẮC, không vào ĐỘ SÁNG. Lần
        // chỉnh đầu làm ngược lại và mặt đất ra một tấm bạt loang lổ tối om:
        // biến thiên độ sáng ăn thẳng vào độ tương phản của mọi thứ ĐỨNG TRÊN
        // mặt đất (cây, quân, biên giới), còn biến thiên sắc thì không đụng tới
        // ai — nó chỉ làm mặt đất trông như được pha từ nhiều mẻ bột khác nhau,
        // mà đó đúng là thứ cần.
        const wet = clamp(m + p * 0.17, 0, 1);
        const lit = 31 + wet * 13 + shade * 8 + p * 1.8;
        // Sàn 25: bản đồ KHÔ (độ ẩm thấp khắp nơi) cộng bóng mây và vignette thì
        // tụt xuống vùng gần như đen, và mọi thứ đứng trên nó — kể cả bốn màu bộ
        // lạc — đều xỉn đi theo. Cân bằng phải đúng ở bản đồ TỆ NHẤT.
        bt.fillStyle = `hsl(${72 + wet * 66 - shade * 15}, ${21 + wet * 15 + p * 4}%, ${clamp(lit, 25, 50)}%)`;
      }
      bt.fillRect(x, y, 1, 1);
    }
  }
  t.imageSmoothingEnabled = true;
  t.imageSmoothingQuality = 'high';
  t.drawImage(baseTintCanvas, 0, 0, W, H, 0, 0, W * LP, H * LP);

  // ── CHI TIẾT SẮC NÉT ─────────────────────────────────────────────────────
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, kind = terrainMap[i], m = moistMap[i];
      // Chi tiết trang trí, nướng sẵn vào lớp nền nên miễn phí lúc chạy: cụm cỏ
      // trên đồng, hoa dại, sỏi trên cát, vết nứt bùn dưới đáy đầm.
      const d = hash01(x * 3.1, y * 5.7);
      if (kind === T_GRASS && d > 0.78) {
        // Cụm cỏ: dày hơn trước (22% số ô thay vì 10%) và cao thấp khác nhau theo
        // độ ẩm — đồng ẩm thì cỏ rậm, đất khô thì thưa và cụt.
        const lush = 0.55 + m * 0.75;
        t.strokeStyle = `hsla(${84 + m * 44}, ${26 + m * 14}%, ${33 + m * 13}%, 0.72)`;
        t.lineWidth = Math.max(1, LP * 0.1);
        const bx = x * LP + LP * (0.3 + d * 0.45), by = y * LP + LP * 0.78;
        t.beginPath();
        t.moveTo(bx - LP * 0.18, by); t.lineTo(bx - LP * 0.26, by - LP * 0.34 * lush);
        t.moveTo(bx, by); t.lineTo(bx, by - LP * 0.44 * lush);
        t.moveTo(bx + LP * 0.18, by); t.lineTo(bx + LP * 0.27, by - LP * 0.32 * lush);
        t.stroke();
        // Hoa dại: hiếm, và CHỈ ở nơi ẩm. Nó không nói gì về luật chơi, nhưng nó
        // là thứ khiến người ta zoom sát vào nhìn — mà zoom sát vào nhìn chính là
        // điều bản 3.8 này muốn người xem làm.
        const f = hash01(x * 7.3, y * 4.1);
        if (m > 0.5 && f > 0.93) {
          // Hoa dại lấy màu từ đúng ba thứ bột trong bảng màu (bột xương, chu
          // sa, thư hoàng) chứ không phải ba màu pastel bất kỳ. Chi tiết nhỏ
          // nhất trên bản đồ cũng phải thuộc về cùng một hộp màu — bằng không
          // nó là thứ duy nhất lộ ra rằng mọi thứ khác đã được chọn.
          t.fillStyle = f > 0.975 ? 'rgba(238,226,200,0.86)'
                      : f > 0.955 ? 'rgba(214,96,72,0.78)' : 'rgba(228,180,86,0.8)';
          t.beginPath();
          t.arc(bx + LP * 0.05, by - LP * 0.5 * lush, LP * 0.11, 0, Math.PI * 2);
          t.fill();
        }
      } else if (kind === T_GRASS && d < 0.055) {
        // Sỏi lẻ trên đồng: chấm phá tối, phá thế "cả mặt đất chỉ có một loại vật".
        t.fillStyle = 'rgba(62,58,44,0.44)';
        t.beginPath();
        t.ellipse(x * LP + LP * 0.5, y * LP + LP * 0.55, LP * 0.18, LP * 0.12, 0, 0, Math.PI * 2);
        t.fill();
      } else if (kind === T_SAND && d > 0.9) {
        t.fillStyle = 'rgba(126,108,78,0.42)';
        t.fillRect(x * LP + LP * 0.35, y * LP + LP * 0.4, LP * 0.22, LP * 0.18);
      } else if (kind === T_BASIN && d > 0.82) {
        // Vết nứt bùn khô: một nhánh chữ Y lệch, thay đúng chỗ của gợn sóng cũ.
        // Vùng trũng cần MỘT loại vật riêng, bằng không nó chỉ là mặt cỏ bị tối
        // đi — và mắt sẽ đọc ra "chỗ này bị đổ bóng" chứ không phải "chỗ này là
        // lòng chảo". Sát mép (nông) thì nứt nhạt, vào giữa (ẩm) thì đậm hơn.
        const dep = Math.min(basinDepth[i], 15) / 15;
        t.strokeStyle = `rgba(38, 34, 24, ${0.16 + dep * 0.2})`;
        t.lineWidth = Math.max(1, LP * 0.08);
        const cx = x * LP + LP * (0.3 + d * 0.35), cy = y * LP + LP * 0.5;
        t.beginPath();
        t.moveTo(cx - LP * 0.24, cy - LP * 0.2);
        t.lineTo(cx, cy);
        t.lineTo(cx + LP * 0.3, cy + LP * 0.12);
        t.moveTo(cx, cy);
        t.lineTo(cx - LP * 0.06, cy + LP * 0.28);
        t.stroke();
      }
    }
  }

  // ── MÉP ĐẦM ──────────────────────────────────────────────────────────────
  // Bản cũ tô nguyên MỘT Ô VUÔNG sáng cho mỗi ô sát bờ, ở cả hai phía. Hồi lớp
  // nền còn là lưới ô vuông thì không ai để ý; giờ nền đã mượt, chính hai hàng ô
  // vuông đó là thứ DUY NHẤT còn lộ ra cái lưới — nó biến mọi cái hồ thành một
  // bậc thang pixel. Thay bằng: đốm cát TRÒN phía đất (chồng lấn nhau nên mép ra
  // hình vỏ sò, không ra bậc thang) và một đường viền chạy đúng theo MÉP chung
  // giữa ô trũng và ô đất.
  // MỘT path gộp tất cả các đốm rồi fill MỘT lần. Fill từng đốm riêng thì chỗ hai
  // đốm chồng nhau bị cộng alpha hai lần, và cả mép đầm hiện ra thành một dải bọt
  // bong bóng lồi lõm — đúng cái hoa văn mà việc bỏ ô vuông vừa mới xoá đi.
  t.fillStyle = 'rgba(232, 219, 184, 0.3)';
  t.beginPath();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isBasinAt(x, y)) continue;
      let touchesBasin = false;
      for (let dx = -1; dx <= 1 && !touchesBasin; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (isBasinAt(x + dx, y + dy)) { touchesBasin = true; break; }
        }
      }
      if (!touchesBasin) continue;
      t.moveTo(x * LP + LP * 1.26, y * LP + LP * 0.5);
      t.arc(x * LP + LP * 0.5, y * LP + LP * 0.5, LP * 0.76, 0, Math.PI * 2);
    }
  }
  t.fill();
  // Đường bọt sóng cũ đổi thành NGẤN NƯỚC CẠN: cùng một nét, nhưng ngả bột xương
  // và nhạt hơn, nên nó đọc ra "mực nước từng dừng ở đây" thay vì "nước đang vỗ
  // vào đây". Vẫn giữ nét này vì nó là thứ duy nhất cho vùng trũng một CẠNH sắc;
  // bỏ đi thì lòng chảo tan vào mặt cỏ thành một vệt tối không rõ đầu cuối.
  t.strokeStyle = 'rgba(226, 210, 170, 0.3)';
  t.lineWidth = Math.max(1, LP * 0.16);
  t.lineCap = 'round';
  t.beginPath();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isBasinAt(x, y)) continue;
      const X = x * LP, Y = y * LP;
      if (!isBasinAt(x - 1, y)) { t.moveTo(X, Y); t.lineTo(X, Y + LP); }
      if (!isBasinAt(x + 1, y)) { t.moveTo(X + LP, Y); t.lineTo(X + LP, Y + LP); }
      if (!isBasinAt(x, y - 1)) { t.moveTo(X, Y); t.lineTo(X + LP, Y); }
      if (!isBasinAt(x, y + 1)) { t.moveTo(X, Y + LP); t.lineTo(X + LP, Y + LP); }
    }
  }
  t.stroke();
  terrainDirty = false;
  renderMinimapTerrain();
}

let minimapTerrainCanvas = document.createElement('canvas');
function renderMinimapTerrain() {
  const s = CONFIG.MINIMAP_SCALE;
  minimapTerrainCanvas.width = minimapCanvas.width;
  minimapTerrainCanvas.height = minimapCanvas.height;
  const m = minimapTerrainCanvas.getContext('2d');
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = terrainMap[y * W + x];
      // Cùng ba sắc với bản đồ lớn, chỉ dẹt lại: minimap là bản THU NHỎ của
      // cùng một thế giới, không phải một bản đồ khác dùng chung toạ độ.
      m.fillStyle = k === T_BASIN ? '#3a3524' : k === T_SAND ? '#8a7a58' : '#3b4a2c';
      m.fillRect(x * s, y * s, Math.max(1, s), Math.max(1, s));
    }
  }
}

// Nhiễu tất định theo toạ độ: cùng một ô luôn ra cùng một con số, nên cây/bụi
// không "nhấp nháy" đổi hình mỗi frame như khi dùng Math.random() lúc vẽ.
function hash01(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Nhiễu MỀM: bốc hash ở một lưới thưa rồi nội suy song tuyến có làm mượt.
// hash01 thẳng cho ra nhiễu TRẮNG — mỗi ô một giá trị độc lập — và ở 1 px/ô
// nó chỉ là hạt bụi; khi lớp nền được phóng to có nội suy, hạt bụi ấy nhoè
// thành một tấm sương xám đều, tức là công vẽ đổ đi mà không được gì.
// Cái mặt đất cần không phải hạt mà là VŨNG: bột khoáng khi khô đọng lại
// thành từng mảng rộng vài ô, và chính những mảng ấy làm mắt đọc ra "được
// vẽ bằng tay" thay vì "được đổ màu bằng vòng lặp".
function smoothNoise(x, y, freq) {
  const fx = x * freq, fy = y * freq;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);   // smoothstep
  const a = hash01(x0, y0), b = hash01(x0 + 1, y0);
  const c = hash01(x0, y0 + 1), d = hash01(x0 + 1, y0 + 1);
  const top = a + (b - a) * sx, bot = c + (d - c) * sx;
  return top + (bot - top) * sy;
}
// Hai quãng tám: một mảng lớn cỡ 11 ô cho hình thù, một mảng nhỏ cỡ 3 ô cho
// vân. Lệch toạ độ ở quãng tám thứ hai để hai lớp không đỉnh trùng đỉnh.
function pigment(x, y) {
  return (smoothNoise(x, y, 0.09) - 0.5) * 1.34
       + (smoothNoise(x + 71, y + 37, 0.31) - 0.5) * 0.66;
}

// Chiều cao sprite tính bằng Ô, đo từ CHÂN công trình lên đỉnh cao nhất (kể cả
// cột cờ và vọng lâu). MỘT nguồn sự thật duy nhất: culling, hit-test, silhouette,
// thanh máu và nhãn tên bộ lạc đều đọc từ đây nên không bao giờ lệch nhau — chính
// cái lệch đó là thứ sinh ra vùng chết khi click và pop-in ở mép màn hình.
// Hệ số chiều cao THẬT SỰ dùng để vẽ. Tách khỏi bảng CONFIG.BUILD_HEIGHT vì từ
// bản này có một loại công trình mà chiều cao KHÔNG còn là hằng số của loại: tháp
// canh cao lên theo tầng (xem TOWER_STACK). Một hàm chứ không phải hai chỗ tự
// nhân — buildingSpriteHeight và drawBuilding phải đọc CÙNG một con số, lệch nhau
// là hộp bao lệch khỏi hình vẽ, đúng ba thứ đã cùng vỡ ở Phase 3.19.
//
// 0,5 mỗi tầng: tầng 3 = gấp đôi, đúng con số đã hứa trong chú thích config —
// "nhìn từ ngoài là một cái tháp CAO GẤP ĐÔI".
function buildingHeightMul(b) {
  const base = CONFIG.BUILD_HEIGHT[b.type] || 1;
  return b.type === 'tower' ? base * (1 + 0.5 * ((b.level || 1) - 1)) : base;
}

function buildingSpriteHeight(b) {
  if (b.type === 'farm') return 0;                    // ruộng nằm phẳng trên mặt đất
  const hMul = buildingHeightMul(b);
  const apex = b.size * (1.06 * hMul - 0.04);         // chân -> đỉnh mái (thân 0.72 + mái 0.34)
  const crest = b.type === 'town' ? b.size * 0.53     // cột cờ
              : b.type === 'tower' ? b.size * 0.30    // vọng lâu nhô ra
              : b.type === 'temple' ? b.size * 0.14   // quả cầu vàng trên nóc
              // Tướng phủ: hai cột soái mọc CAO HƠN đỉnh mái 0,42 cạnh (xem nhánh
              // heroHall trong drawBuilding). Không khai ở đây thì đúng cái nét
              // nhận diện của nó — khoảng trống giữa hai cột — nằm ngoài hộp bao:
              // bị cắt ở mép màn hình, click vào không trúng, nhãn tên đâm xuyên.
              // Lần thứ ba trong dự án này chiều cao sprite đổi mà hộp bao phải
              // đổi theo; hai lần trước phải trả giá mới biết.
              : b.type === 'heroHall' ? b.size * 0.34
              : 0;
  // Kỳ quan không dùng công thức thân+mái: nó được vẽ thành kim tự tháp bậc thang
  // cao đúng bodyH, cộng chóp vàng. Trả về theo công thức chung thì hộp bao sẽ cao
  // hơn hình thật gần một ô rưỡi, và hit-test sẽ ăn cả một vạt trời phía trên nó.
  if (b.type === 'wonder') return b.size * (0.72 * hMul + 0.4);
  // Trại tiếp tế: mái lều cao 0,62 cạnh, hai cọc chống nhô thêm 0,10 nữa, và nó
  // KHÔNG đi qua lớp phủ thời đại nên không có chóp nào để cộng thêm. Rơi vào công
  // thức chung thì hộp bao cao gần gấp đôi hình thật, và bấm vào bãi cỏ phía trên
  // cái lều sẽ chọn trúng nó — con lỗi hộp-bấm-lệch-hình, chiều ngược lại.
  if (b.type === 'camp') return b.size * 0.78;
  // Mái chồng diêm + chóp của Hoàng Kim (drawAgeAccents) mọc CAO HƠN đỉnh mái chính.
  // Không cộng vào đây thì đúng cái mũi nhọn ấy nằm ngoài hộp bao: nó bị cắt ở mép
  // màn hình, click vào nó không trúng, và nhãn tên bộ lạc đâm xuyên qua nó. Đây là
  // lần thứ hai chiều cao sprite đổi mà hộp bao phải đổi theo — lần trước là mái nhà.
  const t = tribes[b.tribeId];
  const ageCrest = (t && t.age >= 4) ? b.size * (OWN_CREST[b.type] ? 0.30 : 0.52) : 0;
  return apex + Math.max(crest, ageCrest);
}

// Phần NHÔ NGANG của sprite, tính theo tỉ lệ cạnh footprint mỗi bên. Đi cùng cặp với
// buildingSpriteHeight và vì đúng một lý do: mái đua của Đồ Đồng chìa ra 0,17 cạnh
// mỗi bên, rộng hơn hẳn mái dốc 0,08 của Đồ Đá. Để hằng số 0,08 nằm cứng trong
// spriteBox thì hai đầu đao — thứ vừa được thêm vào CHÍNH VÌ nó nới đường bao ra —
// lại nằm ngoài vùng bấm. Ruộng và Kỳ quan không đi qua lớp phủ thời đại.
function buildingSpriteOverhang(b) {
  // Trại tiếp tế nhô ngang 0,06 (mép mái vải ở 0,94 cạnh) và KHÔNG leo theo thời
  // đại — nó không đi qua lớp phủ ấy. Lấy 0,08 cho đủ lề.
  if (b.type === 'farm' || b.type === 'wonder' || b.type === 'camp') return 0.08;
  const t = tribes[b.tribeId];
  return (t && t.age >= 2) ? 0.20 : 0.08;
}

// Chớp trắng khi ăn đòn + một vòng xung nở ra. Vẽ ĐÈ lên sprite chứ không đổi
// màu sprite: làm cách sau thì mỗi loại quân (người, quái, máy bắn đá, anh hùng)
// phải tự biết cách tự tô trắng mình, tức là năm chỗ phải nhớ cùng một luật.
function drawHitFlash(u, px, py, cs) {
  if (!(u.flash > 0)) return;
  const a = clamp(u.flash / 9, 0, 1);
  const cx = px + cs / 2, cy = py + cs / 2;
  ctx.globalAlpha = a * 0.42;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, cs * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = a * 0.7;
  ctx.strokeStyle = '#f6ece0';
  ctx.lineWidth = Math.max(1, cs * 0.1);
  ctx.beginPath(); ctx.arc(cx, cy, cs * (0.45 + (1 - a) * 0.75), 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
}

// Hạt mực cho con dấu, dựng MỘT lần rồi dùng lại mãi dưới dạng pattern. Một
// con dấu gỗ in ra không bao giờ đặc kín — chỗ mực đọng, chỗ mặt gỗ đã mòn —
// và chính những lỗ thủng ấy là thứ phân biệt "được đóng dấu" với "được tô một
// hình chữ nhật đỏ". Giống hệt mặt nạ --ink-grain bên bảng kiểu, để con dấu
// trên canvas và con dấu trong DOM là cùng một vật.
let inkGrain = null;
function getInkGrain() {
  if (inkGrain !== null) return inkGrain;
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  const img = g.createImageData(48, 48);
  for (let i = 0; i < 48 * 48; i++) {
    const on = hash01((i % 48) * 3.7 + 1, ((i / 48) | 0) * 5.3 + 1) > 0.87;
    img.data[i * 4 + 3] = on ? 190 : 0;      // đen, chỉ khác nhau ở độ đục
  }
  g.putImageData(img, 0, 0);
  inkGrain = ctx.createPattern(c, 'repeat');
  return inkGrain;
}

function drawShadow(cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Cây phải là NỐT TỐI trên nền sáng vừa, có một mảng sáng hắt ở đỉnh. Bản
// trước tán dưới đã là #1f5c2c và tán trên #4a9c53 — cả hai đều nằm trong đúng
// khoảng sắc và độ sáng của mặt cỏ, nên rừng biến mất vào đồng cỏ ở mọi mức
// zoom trừ mức gần nhất. Cách chữa không phải là làm cây sáng hơn (thành ra
// bốn màu bộ lạc mất chỗ đứng ở đầu sáng) mà là đẩy tán dưới xuống gần như
// đen và ngả lam: một hình bóng tối trên nền ấm thì đọc được ở mọi cỡ.
// Cây giờ có THÂN thật: một khối gỗ thuôn dần lên đỡ lấy tán, chứ không phải một
// vệt nâu mảnh giấu sau tán như bản trước (nó bị tán phủ gần kín nên nhìn ra chỉ
// còn là một chấm xanh). Tán được nâng lên cao hơn gốc để lộ hẳn phần thân bên
// dưới — mắt đọc ngay ra "cái cây" chứ không phải "bụi tròn". Tán vẫn giữ tông
// tối-lạnh của bản cũ vì lý do tương phản với đồng cỏ ấm đã viết ở trên.
function drawTree(x, y, px, py, cs, ratio) {
  const h = hash01(x, y);
  const cx = px + cs * 0.5;
  const baseY = py + cs * 0.9;                    // gốc chạm đất, sát mép dưới ô
  const r = cs * (0.34 + h * 0.13) * (0.55 + ratio * 0.45);
  const trunkH = cs * (0.36 + h * 0.16);
  const trunkTop = baseY - trunkH;               // nơi tán bắt đầu
  const canopyY = trunkTop - r * 0.32;           // tâm tán, nâng lên để lộ thân
  drawShadow(cx + cs * 0.12, baseY - cs * 0.02, r * 0.95, r * 0.36);

  // Thân: hình thang thuôn dần lên (gốc bè, ngọn thon) + một mặt sáng bên trái để
  // ra khối trụ, đồng bộ nguồn sáng trên-trái với cây/nhà/đá còn lại.
  const tw = cs * 0.17, ttw = cs * 0.1;
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.moveTo(cx - tw * 0.5, baseY);
  ctx.lineTo(cx - ttw * 0.5, trunkTop);
  ctx.lineTo(cx + ttw * 0.5, trunkTop);
  ctx.lineTo(cx + tw * 0.5, baseY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5a4026';                      // mặt sáng của vỏ
  ctx.fillRect(cx - tw * 0.5, trunkTop, Math.max(0.7, tw * 0.36), trunkH);
  // Một nhánh chìa ra ở mức zoom gần, để bóng cây không thành cây kẹo mút.
  if (cs >= 6) {
    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = Math.max(1, cs * 0.075);
    ctx.beginPath();
    ctx.moveTo(cx, trunkTop + trunkH * 0.26);
    ctx.lineTo(cx + (h > 0.5 ? 1 : -1) * cs * 0.22, trunkTop + trunkH * 0.04);
    ctx.stroke();
  }

  const lush = ratio > 0.45;
  ctx.fillStyle = lush ? '#16311f' : '#26301c';                 // bóng tán
  ctx.beginPath(); ctx.arc(cx, canopyY, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lush ? '#2f6b3c' : '#4a5a30';                 // thân tán
  ctx.beginPath(); ctx.arc(cx - r * 0.18, canopyY - r * 0.2, r * 0.74, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lush ? '#5d9a4e' : '#7c8a49';                 // nắng đọng trên ngọn
  ctx.beginPath(); ctx.arc(cx - r * 0.32, canopyY - r * 0.38, r * 0.4, 0, Math.PI * 2); ctx.fill();
}

function drawBerry(x, y, px, py, cs, ratio, isFarm) {
  const cx = px + cs * 0.5, cy = py + cs * 0.55;
  if (ratio < 0.01) { // đã hái sạch, chờ mọc lại
    ctx.fillStyle = 'rgba(90,110,70,0.5)';
    ctx.fillRect(px + cs * 0.35, py + cs * 0.35, cs * 0.3, cs * 0.3);
    return;
  }
  if (isFarm) {
    // Ruộng: luống lúa vàng, cao dần theo lượng còn lại.
    ctx.fillStyle = `hsl(46, 44%, ${27 + ratio * 21}%)`;
    ctx.fillRect(px + cs * 0.1, py + cs * 0.15, cs * 0.8, cs * 0.7);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(0.5, cs * 0.06);
    ctx.beginPath();
    ctx.moveTo(px + cs * 0.1, cy); ctx.lineTo(px + cs * 0.9, cy);
    ctx.stroke();
    return;
  }
  // Bụi quả sinh ra theo CỤM trên một lưới, nên nếu mỗi bụi vẽ y hệt nhau thì
  // cả cụm hiện ra thành một bảng chấm bi — mắt đọc ra "dữ liệu", không đọc ra
  // "bụi cây". Chữa bằng cách cho mỗi bụi lệch tâm, lệch cỡ và lệch số quả
  // theo hash toạ độ: vẫn tất định (không nhấp nháy), mà cụm thì hết đều tăm tắp.
  const h = hash01(x, y), h2 = hash01(y * 1.7, x * 2.3);
  const r = cs * 0.24 * (0.5 + ratio * 0.5) * (0.82 + h * 0.4);
  const ox = (h - 0.5) * cs * 0.22, oy = (h2 - 0.5) * cs * 0.18;
  drawShadow(cx + ox, cy + oy + r * 1.1, r * 1.3, r * 0.45);
  ctx.fillStyle = '#213d22';
  ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a6132';
  ctx.beginPath(); ctx.arc(cx + ox - r * 0.4, cy + oy - r * 0.45, r * 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c4402d';
  const nBerry = 2 + (h2 > 0.6 ? 1 : 0);
  for (let i = 0; i < nBerry; i++) {
    const a = h * 6.28 + i * 2.4;
    ctx.beginPath();
    ctx.arc(cx + ox + Math.cos(a) * r * 0.62, cy + oy + Math.sin(a) * r * 0.5, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGold(x, y, px, py, cs, ratio) {
  const cx = px + cs * 0.5, cy = py + cs * 0.55;
  const r = cs * 0.3 * (0.45 + ratio * 0.55);
  drawShadow(cx, cy + r * 0.7, r, r * 0.4);
  ctx.fillStyle = '#4a4438';                       // đá mẹ, tối hơn hẳn để quặng nảy ra
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0a825';                       // thư hoàng
  ctx.beginPath(); ctx.arc(cx - r * 0.18, cy - r * 0.18, r * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7dc94';                       // ánh vàng lá
  ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.34, r * 0.2, 0, Math.PI * 2); ctx.fill();
}

// Mỏ đá: ba khối xám xếp chồng, mặt trên sáng — nguồn sáng trên-trái, thống nhất
// với cây, nhà và đổ bóng địa hình. Phải KHÁC vàng ở SILHOUETTE chứ không chỉ ở
// màu: ở mức zoom 4 px/ô thì hai chấm tròn khác sắc độ là hai chấm giống hệt nhau.
function drawStone(x, y, px, py, cs, ratio) {
  const cx = px + cs * 0.5, cy = py + cs * 0.6;
  const r = cs * 0.33 * (0.5 + ratio * 0.5);
  drawShadow(cx, cy + r * 0.6, r * 1.1, r * 0.4);
  const h = hash01(x, y);
  ctx.fillStyle = '#4e5253';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r * 0.5);
  ctx.lineTo(cx - r * 0.6, cy - r * 0.6);
  ctx.lineTo(cx + r * (0.3 + h * 0.3), cy - r * 0.85);
  ctx.lineTo(cx + r, cy + r * 0.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8c8f89';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.6, cy - r * 0.6);
  ctx.lineTo(cx + r * (0.3 + h * 0.3), cy - r * 0.85);
  ctx.lineTo(cx + r * 0.1, cy - r * 0.15);
  ctx.closePath(); ctx.fill();
}

// ------------------------------------------------------------
// Công trình
// ------------------------------------------------------------
// Trộn hai màu hex theo tỉ lệ t (0 = a, 1 = b). Dùng cho lớp vật liệu theo thời đại.
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = pa >> 16 & 255, ag = pa >> 8 & 255, ab = pa & 255;
  const br = pb >> 16 & 255, bg = pb >> 8 & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// VẬT LIỆU THEO THỜI ĐẠI — một bảng duy nhất, đọc ở bốn nơi: màu mái, màu gờ/diềm
// mái, ô màu trong bảng bộ lạc, và chú giải. Trước đây ba trong bốn chỗ đó mỗi chỗ
// giữ một bộ hằng số riêng, nên đổi sắc "đồng" ở mái mà quên bảng thì chính cái
// bảng đáng lẽ dạy người xem đọc mái lại dạy sai.
//
//   tint = lực trộn màu bộ lạc vào vật liệu (0 = giữ nguyên vật liệu).
// Phải nhỏ: sắc bộ lạc đã nằm trọn ở THÂN nhà (tribe.color) và ở đường biên lãnh
// thổ rồi. Bản trước trộn tới 0,62–0,75 THEO CHIỀU NGƯỢC LẠI (vật liệu đắp lên
// tribe.dark), nên với Xích Long thì "mái đồng" ra đúng màu mái đỏ cũ — hai thời
// đại liền nhau nhìn y hệt, mà người xem lại không có bậc trước đặt cạnh để so.
const AGE_MAT = [null,
  { name: 'tranh',     roof: '#7d6640', trim: '#93764a', tint: 0.30 },  // Đồ Đá: rơm rạ, mộc
  { name: 'đồng',      roof: '#b5702f', trim: '#d0913f', tint: 0.22 },  // Đồ Đồng: đồng đỏ ấm
  { name: 'đá phiến',  roof: '#6d7684', trim: '#9aa0a6', tint: 0.16 },  // Đồ Sắt: xám lạnh
  { name: 'mạ vàng',   roof: '#c9992f', trim: '#f0cf85', tint: 0.14 },   // Hoàng Kim
  // THIÊN TRIỀU: men ngọc (thanh lưu ly). Bốn bậc trước đi từ ẤM sang LẠNH rồi
  // quay lại ấm chói (rơm → đồng → đá phiến → mạ vàng); bậc năm phải rẽ khỏi cả
  // hai đầu đó, nếu không nó chỉ là "vàng đậm hơn" và người xem không đọc ra. Men
  // ngọc là màu duy nhất trong bảng sơn mài chưa dùng tới, và nó cũng là màu mái
  // ngói của cung điện thật — cùng lúc khác hẳn bậc trước và đúng với cái tên.
  { name: 'men ngọc',  roof: '#3f7f74', trim: '#8fc9ba', tint: 0.13 }];  // Thiên Triều

function ageMat(tribe) { return AGE_MAT[clamp(tribe.age || 1, 1, AGE_MAT.length - 1)]; }

// MÀU MÁI. Cái MÁI là mảng màu lớn nhất của sprite (~34% chiều cao) nên đổi sắc nó
// thì cả cụm nhà đổi theo, thấy được tới tận minimap. Chỉ đụng MÁI, KHÔNG đụng thân
// — nhờ vậy vẫn đọc ra "bộ lạc nào" qua tường, còn chất liệu mái kể "thời đại nào":
// mái tranh → mái đồng → mái đá phiến → mái mạ vàng.
function ageRoofColor(tribe) {
  const m = ageMat(tribe);
  return mixHex(m.roof, tribe.dark, m.tint);
}

// Con dấu THỜI ĐẠI cắm trên kinh đô: một thẻ chu sa với 1–4 chấm vàng = cấp thời
// đại. Dùng CHẤM chứ không phải chữ số vì chấm đọc được ở cỡ nhỏ hơn nhiều — ở mức
// zoom xa một con "3" chỉ còn là vệt mờ, còn ba chấm thì vẫn đếm được. Buộc thẳng
// vào signature "ấn sử" (chu sa + vàng của thẻ kỷ nguyên), và trả lời tại-chỗ câu
// "kinh đô này đang ở thời đại nào" mà không phải liếc sang cột dữ liệu bên phải.
function drawCapitalSeal(tribe, cx, topY, s) {
  const age = tribe.age || 1;
  const w = s * 0.5, h = s * 0.26, tx = cx - w / 2, ty = topY - h - s * 0.14;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';                       // bóng nhẹ để tách khỏi nền
  ctx.fillRect(tx + 0.6, ty + 0.8, w, h);
  ctx.fillStyle = '#9a2f22';                                // chu sa
  ctx.fillRect(tx, ty, w, h);
  ctx.fillStyle = 'rgba(216,165,68,0.9)';                   // viền vàng mảnh
  ctx.fillRect(tx, ty, w, Math.max(0.7, h * 0.12));
  ctx.fillRect(tx, ty + h - Math.max(0.7, h * 0.12), w, Math.max(0.7, h * 0.12));
  const dot = Math.max(0.9, s * 0.05), gap = (w - age * dot * 2) / (age + 1);
  ctx.fillStyle = '#f0cf85';
  for (let i = 0; i < age; i++) {
    ctx.beginPath();
    ctx.arc(tx + gap * (i + 1) + dot * (i * 2 + 1), ty + h / 2, dot, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Kiểu nhà nào đã TỰ CÓ chóp riêng trên nóc (cột cờ, vọng lâu, quả cầu vàng). Với
// chúng, lớp phủ Hoàng Kim chỉ đắp mái chồng chứ không cắm thêm chóp nhọn — hai cái
// chóp mọc cùng một chỗ chỉ ra một mớ nét chồng nhau.
const OWN_CREST = { town: 1, tower: 1, temple: 1, heroHall: 1 };

// Trang trí THEO THỜI ĐẠI — đắp một lớp phủ chung lên MỌI kiểu nhà tuỳ tribe.age.
// Cố tình dùng ĐÚNG một lớp phủ thay vì vẽ lại từng kiểu nhà cho từng thời đại: bốn
// thời đại × chín kiểu nhà = 36 biến thể là thứ không ai bảo trì nổi.
//
// Bản trước chỉ đổi MÀU (mái + một gờ mảnh + một bệ đá thấp). Đo lại trên màn hình
// thì đó chính là chỗ hỏng: người xem KHÔNG BAO GIỜ có hai thời đại đặt cạnh nhau để
// so — cả bộ lạc lên đời cùng một lúc, nên phán đoán màu phải làm theo TRÍ NHỚ, việc
// mà mắt người làm rất tệ. Thứ mắt đọc được tuyệt đối, không cần vật mẫu, là ĐƯỜNG
// BAO. Nên từ bản này mỗi thời đại đổi luôn hình bóng của căn nhà:
//
//   Đồ Đá     — mái dốc trơn (không đắp gì)
//   Đồ Đồng   — MÁI ĐUA: diềm mái chìa hẳn ra hai bên, hai đầu hếch lên → nhà "nở"
//               ngang ở tầm mái
//   Đồ Sắt    — LAN CAN RĂNG CƯA trên diềm + bệ đá rộng hơn thân → đỉnh lởm chởm
//               như lược, chân bè ra
//   Hoàng Kim — MÁI CHỒNG DIÊM (mái thứ hai nhỏ hơn xếp trên) + chóp nhọn → cao thêm
//               một nấc, có mũi nhọn
//
// Cả ba đều còn đọc được ở cỡ 6 px/ô vì chúng đổi ĐƯỜNG VIỀN NGOÀI chứ không đổi
// hoa văn bên trong — nét bên trong là thứ chết trước nhất khi thu nhỏ.
// ==================================================================
// HAI THỜI ĐẠI ĐẦU PHẢI TRÔNG NGHÈO (Phase 3.28)
// ==================================================================
// Cả cái thang bốn bậc ở trên đi theo chiều CỘNG THÊM: Đồ Đá không đắp gì, mỗi
// bậc sau đắp thêm một lớp. Nghĩa là bậc thấp nhất là "một căn nhà bình thường
// chưa được trang trí" — mà một căn nhà bình thường thì không đọc ra thời đại
// nào cả. Nhìn ra màn hình ở 2.000 tick đầu của mọi kỷ nguyên, bốn bộ lạc đều
// đang ở trong những căn nhà gọn gàng, mái thẳng, tường phẳng, cửa sổ vuông vắn.
//
// Hệ quả không phải chuyện thẩm mỹ: nếu bậc 1 đã trông tử tế thì bậc 2 và 3 chỉ
// còn là "tử tế hơn một chút", và cả cơ chế lên đời mất đi khoảnh khắc đáng giá
// nhất của nó — lần đầu tiên nền văn minh thôi ở lều. Đắp thêm ở đầu trên thì
// mỗi bậc phải chia nhau một dải hẹp; ĐÀO SÂU đầu dưới thì cả thang giãn ra mà
// không bậc nào phải đổi.
//
// Ba nét, và cả ba đều đổi ĐƯỜNG BAO chứ không đổi hoa văn — đúng lý do đã viết
// cho drawAgeAccents (nét bên trong chết trước nhất khi thu nhỏ):
//   · DIỀM TRANH RÁCH — một hàng răng dài ngắn so le rủ xuống dưới chân mái, nên
//     mép dưới của mái từ một đường thẳng thành một đường lởm chởm.
//   · CỘT CHỐNG XIÊU — Đồ Đá: một cây sào chống chéo từ đất lên diềm. Nó phá thế
//     đối xứng của cả sprite, và đối xứng chính là thứ khiến một hình đọc ra là
//     "được xây" thay vì "được dựng tạm".
//   · VÁ MÁI / KẼ VÁN — một mảng sẫm trên mái (Đồ Đá) hoặc hai ba khe dọc trên
//     tường (Đồ Đồng): dấu hiệu vật liệu rời rạc, không phải một khối liền.
//
// Băm theo `b.id` nên mỗi căn nhà xiêu một kiểu và không căn nào tự đổi dáng
// giữa chừng — cùng thủ thuật với mặt đường và nền bản đồ.
function drawCrudeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed) {
  const age = clamp(tribe.age || 1, 1, AGE_MAT.length - 1);
  const eaveY = bodyTop + s * 0.04;
  const h = hash01(b.id * 7 + 3, b.id * 13 + 11);
  // Đồ Đồng đã có MÁI ĐUA chìa ra 0,17s mỗi bên (drawAgeAccents chạy sau hàm này),
  // nên diềm tranh phải rủ xuống từ đúng mép đó — nếu không thì ở bậc 2 nó treo
  // lơ lửng giữa không trung, cách chân mái thật một khoảng bằng cả cái diềm.
  const over = age >= 2 ? s * 0.17 : s * 0.08;
  const fringeY = age >= 2 ? eaveY + Math.max(1.2, s * 0.09) : eaveY;

  // ---- DIỀM TRANH RÁCH ----------------------------------------------------------
  const n = 7, fw = (s + over * 2) / n;
  ctx.fillStyle = age === 1 ? '#6d5c3c' : '#7a6642';
  for (let i = 0; i < n; i++) {
    const fh = s * (0.05 + hash01(b.id + i * 19, i * 7) * (age === 1 ? 0.16 : 0.10));
    ctx.fillRect(x - over + i * fw, fringeY, fw * 0.82, fh);
  }

  if (!detailed) return;

  if (age === 1) {
    // ---- CỘT CHỐNG XIÊU (chỉ Đồ Đá) ---------------------------------------------
    // Bên trái hay bên phải bốc theo băm: hai căn nhà cạnh nhau chống ngược chiều
    // thì cả xóm đọc ra là "mỗi nhà tự dựng", không phải một mẫu nhà lặp lại.
    const sgn = h > 0.5 ? 1 : -1;
    const footX = x + s * (0.5 + sgn * 0.72);
    const headX = x + s * (0.5 + sgn * 0.42);
    ctx.strokeStyle = '#7b6242';
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(footX, baseY);
    ctx.lineTo(headX, fringeY + s * 0.06);
    ctx.stroke();
    // ---- MẢNG MÁI VÁ -------------------------------------------------------------
    ctx.fillStyle = 'rgba(38,30,20,0.34)';
    ctx.beginPath();
    ctx.moveTo(x + s * (0.28 + h * 0.2), bodyTop + s * 0.02);
    ctx.lineTo(x + s * (0.5 + h * 0.06), apexY + s * 0.1);
    ctx.lineTo(x + s * (0.6 + h * 0.16), bodyTop + s * 0.02);
    ctx.closePath(); ctx.fill();
    // ---- VÁCH ĐẤT TRÉT ------------------------------------------------------------
    // Hai vệt đứng màu bùn trên tường: nó xoá cái mặt phẳng gradient sạch sẽ mà
    // thân nhà vốn có, và đó chính là thứ khiến bậc 1 trông "chưa được trát".
    ctx.fillStyle = 'rgba(92,74,50,0.38)';
    for (let i = 0; i < 2; i++) {
      const wx = x + s * (0.18 + i * 0.44 + h * 0.1);
      ctx.fillRect(wx, bodyTop + bodyH * 0.25, s * 0.13, bodyH * 0.7);
    }
  } else {
    // ---- KẼ VÁN (Đồ Đồng) ---------------------------------------------------------
    // Tường ván ghép: ba khe dọc tối màu. Thẳng hàng và đều nhau — khác hẳn hai vệt
    // bùn loang lổ của bậc 1, nên hai bậc vẫn phân biệt được dù cùng thuộc nhóm
    // "chưa ra dáng". Đó là điều kiện để bậc 2 không bị đọc thành bậc 1.
    ctx.fillStyle = 'rgba(30,22,14,0.26)';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + s * (i * 0.25) - s * 0.02, bodyTop + s * 0.02, Math.max(0.7, s * 0.04), bodyH - s * 0.02);
    }
  }
}

function drawAgeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed) {
  const age = clamp(tribe.age || 1, 1, AGE_MAT.length - 1);
  if (age <= 1) return;                                  // Đồ Đá: để mộc
  const M = AGE_MAT[age];
  const trim = M.trim, eaveY = bodyTop + s * 0.04;

  // ---- Đồ Đồng trở lên: MÁI ĐUA ------------------------------------------------
  // Tấm diềm chạy dài hơn thân 0,17s mỗi bên. Đây là nét làm việc nặng nhất trong
  // cả hàm: nó nới đường bao ngang thêm ~28%, thứ đọc được cả khi căn nhà chỉ còn
  // mươi pixel — đúng dải zoom mà người ta thật sự ngồi xem.
  const over = s * 0.17;
  const eh = Math.max(1.2, s * 0.09);
  ctx.fillStyle = trim;
  ctx.fillRect(x - over, eaveY, s + over * 2, eh);
  ctx.fillStyle = 'rgba(0,0,0,0.24)';                    // gờ tối dưới diềm -> có dày
  ctx.fillRect(x - over, eaveY + eh, s + over * 2, Math.max(0.7, eh * 0.34));
  // Hai đầu đao hếch lên: cùng một tam giác nhỏ, soi gương qua trục giữa.
  ctx.fillStyle = trim;
  for (const sgn of [-1, 1]) {
    const ex = sgn < 0 ? x - over : x + s + over;
    ctx.beginPath();
    ctx.moveTo(ex, eaveY + eh);
    ctx.lineTo(ex + sgn * s * 0.1, eaveY - s * 0.13);
    ctx.lineTo(ex - sgn * s * 0.04, eaveY);
    ctx.closePath(); ctx.fill();
  }

  // ---- Đồ Sắt trở lên: BỆ ĐÁ + LAN CAN RĂNG CƯA ---------------------------------
  if (age >= 3) {
    // Bệ đá rộng HƠN thân (0,06s mỗi bên): nhà hoá đá thì phải bè chân ra, nếu bệ
    // trùng khít mép thân thì nó chỉ là một vệt xám chứ không phải một cái bệ.
    const pw = s * 0.06;
    const ph = Math.min(bodyH * 0.36, s * 0.26);
    ctx.fillStyle = '#4c525b';
    ctx.fillRect(x - pw, baseY - ph, s + pw * 2, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x - pw, baseY - ph, s + pw * 2, Math.max(1, ph * 0.2));
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.fillRect(x - pw, baseY - Math.max(1, ph * 0.16), s + pw * 2, Math.max(1, ph * 0.16));
    if (detailed) {                                      // mạch đá dọc giữa bệ
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, baseY - ph); ctx.lineTo(x + s * 0.5, baseY);
      ctx.stroke();
    }
    // Răng cưa đứng TRÊN diềm, che một phần chân mái: đường bao trên cùng của căn
    // nhà từ một cạnh xiên trơn biến thành một cái lược. Năm răng là số ít nhất còn
    // đọc ra "lởm chởm" chứ không ra "sứt một miếng".
    const n = 5, mw = (s + over * 2) / (n * 2 - 1);
    const mh = Math.max(1.2, s * 0.15);
    ctx.fillStyle = '#8b9299';
    for (let i = 0; i < n; i++) ctx.fillRect(x - over + i * mw * 2, eaveY - mh, mw, mh);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < n; i++) ctx.fillRect(x - over + i * mw * 2, eaveY - mh, mw, Math.max(0.7, mh * 0.24));
  }

  // ---- Hoàng Kim: MÁI CHỒNG DIÊM + CHÓP -----------------------------------------
  if (age >= 4) {
    const topY2 = apexY - s * 0.30;
    ctx.fillStyle = ageRoofColor(tribe);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, apexY + s * 0.07);
    ctx.lineTo(x + s * 0.5, topY2);
    ctx.lineTo(x + s * 0.8, apexY + s * 0.07);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = trim;                                 // diềm của mái trên
    ctx.fillRect(x + s * 0.17, apexY + s * 0.05, s * 0.66, Math.max(1, s * 0.05));
    if (!OWN_CREST[b.type]) {
      // Chóp nhọn: cột vàng mảnh + hạt châu. Cộng thêm ~0,52s chiều cao, và
      // buildingSpriteHeight đã tính đúng phần này (nếu không thì mọi thứ đọc chiều
      // cao — culling, hit-test, nhãn tên — sẽ cắt cụt đúng cái mũi nhọn đó).
      ctx.strokeStyle = '#d8a544';
      ctx.lineWidth = Math.max(1, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, topY2); ctx.lineTo(x + s * 0.5, topY2 - s * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#f0cf85';
      ctx.beginPath();
      ctx.arc(x + s * 0.5, topY2 - s * 0.22, Math.max(1.2, s * 0.075), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Thiên Triều: HÀNH LANG CỘT quanh chân nhà -------------------------------
  // Bốn bậc trước đều thêm nét ở phần TRÊN (diềm, răng cưa, mái chồng, chóp), nên
  // đường bao cứ cao dần mãi và bậc thứ năm mà đi tiếp hướng đó thì mọi căn nhà
  // biến thành một cái tháp. Bậc này rẽ xuống DƯỚI: một hàng cột chống dưới diềm,
  // làm căn nhà BÈ RA thay vì cao lên.
  //
  // Vì sao chỗ đó đọc được: bậc 3 đã cho căn nhà một cái bệ đá bè chân. Hàng cột
  // đứng đúng trên cái bệ ấy nên nó có chỗ để tựa vào về mặt thị giác — và khoảng
  // trống giữa các cột là thứ duy nhất trong cả sprite mà người xem NHÌN XUYÊN QUA
  // được. Một hình bóng có lỗ thì khác hẳn mọi bậc trước, kể cả ở mươi pixel.
  if (age >= 5 && detailed) {
    const pw = s * 0.06;
    const colTop = eaveY + Math.max(1.2, s * 0.09);
    const colBot = baseY - Math.min(bodyH * 0.36, s * 0.26);
    if (colBot > colTop + 1) {
      const n = 4, gap = (s + pw * 2) / n;
      const cw = Math.max(1, gap * 0.34);
      ctx.fillStyle = trim;
      for (let i = 0; i < n; i++) {
        ctx.fillRect(x - pw + i * gap + (gap - cw) / 2, colTop, cw, colBot - colTop);
      }
      // Xà ngang nối đầu cột: thiếu nó thì bốn cái cột đọc ra là bốn vệt sọc trên
      // tường, không đọc ra là một hàng hiên.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x - pw, colBot - Math.max(0.8, s * 0.03), s + pw * 2, Math.max(0.8, s * 0.03));
    }
  }
}

// Đợt TRÙNG TU khi bộ lạc vừa lên thời đại: một dải sáng vàng chạy dọc thân nhà từ
// chân lên nóc, lan từ kinh đô ra ngoại vi theo khoảng cách. Nó trả lời đúng câu hỏi
// mà lớp phủ tĩnh ở trên không trả lời được — "vừa mới đổi, ngay lúc này" — và vì
// sóng chạy từ tâm ra nên nó cũng vẽ luôn hình hài lãnh thổ của bộ lạc đó.
const AGE_SWEEP_FRAMES = 40;   // khung ảo (60/giây) mỗi căn nhà sáng
const AGE_SWEEP_SPAN = 90;     // độ trễ tối đa giữa nhà gần nhất và xa nhất

function drawAgeUpSweep(b, tribe, x, s, baseY, topY) {
  // Một phép so số trước khi làm bất cứ gì khác: hàm này chạy cho MỌI công trình ở
  // MỌI khung hình, mà 99% thời gian không có đợt trùng tu nào đang diễn ra.
  if (aTick > tribe.ageFlashEnd) return;
  const d = tribe.home ? dist(b.x, b.y, tribe.home.x, tribe.home.y) : 0;
  const k = (aTick - tribe.ageFlashAt - Math.min(AGE_SWEEP_SPAN, d * 0.7)) / AGE_SWEEP_FRAMES;
  if (k < 0 || k > 1) return;

  const e = Math.sin(k * Math.PI);                 // 0 -> 1 -> 0
  const h = baseY - topY;
  const bandY = baseY - h * k;
  const bandH = Math.max(2, h * 0.26);
  // Cộng sáng ('lighter') chứ không tô đè: dải sáng phải trông như ÁNH SÁNG quét
  // qua vật liệu, còn tô đè thì nó ra một mảnh giấy vàng dán lên mặt nhà.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, bandY - bandH, 0, bandY + bandH * 0.4);
  g.addColorStop(0, 'rgba(240,207,133,0)');
  g.addColorStop(0.55, `rgba(240,207,133,${(e * 0.75).toFixed(3)})`);
  g.addColorStop(1, 'rgba(240,207,133,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - s * 0.3, bandY - bandH, s * 1.6, bandH * 1.4);
  ctx.restore();

  // Viền vàng bao quanh cả sprite, đậm nhất giữa đợt: nó là thứ khiến căn nhà được
  // ĐÓNG KHUNG trong một khoảnh khắc, kể cả khi dải sáng đang ở ngoài tầm mắt.
  ctx.globalAlpha = e * 0.55;
  ctx.strokeStyle = '#f0cf85';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.strokeRect(x - s * 0.12, topY, s * 1.24, h);
  ctx.globalAlpha = 1;
}

function drawBuilding(b, px, py, cs) {
  const tribe = tribes[b.tribeId];
  const s = b.size * cs;
  const x = px + cs / 2 - s / 2, y = py + cs / 2 - s / 2;
  const detailed = cs >= 6;

  // Toàn bộ hình được dựng từ CHÂN nhà đi lên, không phải từ mép trên footprint đi
  // xuống. Nhờ vậy đổi hệ số chiều cao chỉ kéo dài phần thân, còn vị trí nhà đứng
  // trên mặt đất thì không xê dịch một pixel nào.
  const hMul = buildingHeightMul(b);   // tháp canh cao lên theo tầng — xem hàm đó
  const baseY = y + s;                 // chân nhà, trùng mép dưới footprint
  const bodyH = s * 0.72 * hMul;
  const bodyTop = baseY - bodyH;
  const roofH = s * 0.34 * hMul;
  const apexY = bodyTop + s * 0.04 - roofH;
  const topY = baseY - buildingSpriteHeight(b) * cs;

  // Bóng đổ dài ra theo chiều cao. Đây là tín hiệu chiều cao MẠNH HƠN cả bản thân
  // khối nhà: mắt đọc bóng trước khi đọc phối cảnh.
  const grow = 0.72 + 0.28 * hMul;     // = 1 khi hMul = 1, giữ nguyên diện mạo cũ
  drawShadow(x + s * 0.55 * grow, baseY - s * 0.08, s * 0.55 * grow, s * 0.2);

  if (!b.done) {
    // Đang xây: giàn giáo gỗ + phần thân mọc dần từ dưới lên theo tiến độ.
    // Giàn giáo dựng sẵn ĐỦ CHIỀU CAO của nhà thành phẩm, thân mọc dần lên trong đó.
    // Nếu giàn giáo chỉ cao bằng footprint thì lúc xây xong nhà sẽ "bật" cao lên một
    // nấc — một cú giật rất lộ khi camera đạo diễn đang nhìn thẳng vào công trường.
    const prog = clamp(b.progress / b.buildTicks, 0, 1);

    // NỀN MÓNG: một vạt đất đã dọn. Trước bản này công trường chỉ là một khung
    // rỗng có dấu ✕ — nhìn ra màn hình nó không đọc được là "đang xây", nó đọc
    // được là "cái hộp này là cái gì?". Nền móng là thứ nói ngay rằng chỗ này đã
    // có người động vào, kể cả khi tiến độ còn 0%.
    ctx.fillStyle = 'rgba(96, 78, 54, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x + s / 2, baseY - s * 0.06, s * 0.56, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tribe.dark;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, baseY - bodyH * prog, s, bodyH * prog);
    ctx.globalAlpha = 1;

    // Giàn giáo: bốn cột đứng + hai xà ngang, thay cho khung vuông có dấu ✕. Cùng
    // một lượng nét vẽ, nhưng hình dạng này mắt đã biết đọc từ trước.
    ctx.strokeStyle = '#a1785a';
    ctx.lineWidth = Math.max(1, cs * 0.11);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const px2 = x + s * (0.05 + i * 0.3);
      ctx.moveTo(px2, baseY); ctx.lineTo(px2, bodyTop - s * 0.05);
    }
    ctx.moveTo(x, bodyTop + bodyH * 0.32); ctx.lineTo(x + s, bodyTop + bodyH * 0.32);
    ctx.moveTo(x, bodyTop - s * 0.03);     ctx.lineTo(x + s, bodyTop - s * 0.03);
    ctx.stroke();

    // Thanh tiến độ nhỏ ngay dưới chân công trường. Người xem hỏi "sắp xong
    // chưa" chứ không hỏi "cao tới đâu rồi", mà chiều cao thân nhà thì chỉ trả
    // lời được câu thứ hai — và với nhà một tầng thì nó gần như không trả lời gì.
    if (detailed) {
      const bw = s * 0.9, bh = Math.max(2, cs * 0.16), bx2 = x + s * 0.05, by2 = baseY + cs * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle = '#e6b46a';
      ctx.fillRect(bx2, by2, bw * prog, bh);
    }
    return;
  }

  // Thân nhà: gradient dọc từ màu bộ lạc xuống màu tối -> có khối, không phẳng.
  // Gradient chạy đúng theo THÂN chứ không theo footprint, nếu không thì nhà càng
  // cao dải chuyển màu càng bị nén lại ở nửa dưới và khối trông bẹt trở lại.
  const g = ctx.createLinearGradient(x, bodyTop, x, baseY);
  g.addColorStop(0, tribe.color);
  g.addColorStop(1, tribe.dark);
  ctx.fillStyle = g;

  if (b.type === 'farm') {
    // Ruộng vẽ như một mảnh đất cày, không phải khối nhà.
    ctx.fillStyle = '#6d5836';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = 'rgba(200,190,120,0.55)';
    ctx.lineWidth = Math.max(0.6, cs * 0.09);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + (s * i) / 4); ctx.lineTo(x + s, y + (s * i) / 4); ctx.stroke();
    }
    ctx.strokeStyle = tribe.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  } else if (b.type === 'wonder') {
    // Kỳ quan có nhánh RIÊNG, không đi qua thân+mái chung. Bản đầu để nó rơi vào
    // nhánh chung rồi vẽ kim tự tháp ĐÈ LÊN, nên trên màn hình nó ra một cái tháp
    // vuông có mái nhọn với vài vạch ngang — không ai đọc ra "kỳ quan", mà đây lại
    // đúng là công trình bắt buộc phải nhận ra được từ mức zoom xa nhất.
    for (let i = 0; i < 5; i++) {
      const w = s * (0.96 - i * 0.17), hh = bodyH * 0.2;
      ctx.fillStyle = i % 2 ? tribe.dark : tribe.color;
      ctx.fillRect(x + s * 0.5 - w / 2, baseY - hh * (i + 1) - s * 0.02, w, hh);
      // Mặt trên mỗi bậc sáng lên: nguồn sáng trên-trái, thống nhất với cả bản đồ.
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x + s * 0.5 - w / 2, baseY - hh * (i + 1) - s * 0.02, w, hh * 0.22);
    }
    const gy = baseY - bodyH - s * 0.02;
    ctx.fillStyle = '#d8a544';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, gy - s * 0.34);
    ctx.lineTo(x + s * 0.66, gy);
    ctx.lineTo(x + s * 0.34, gy);
    ctx.closePath(); ctx.fill();
  } else if (b.type === 'camp') {
    // ============================================================
    // TRẠI TIẾP TẾ — nhánh riêng, và nó PHẢI riêng
    // ============================================================
    // Nhánh chung ở dưới vẽ thân đặc + mái tam giác màu thời đại, tức là nó vẽ ra
    // MỘT CĂN NHÀ. Một căn nhà mọc giữa đất địch rồi biến mất sau 1.200 tick là
    // hình ảnh nói dối về đúng cái tính chất làm nên cơ chế này. Cái lều thì không
    // ai nhầm với một công trình: mái vải chùng, hai cọc chống, không có tường.
    //
    // Cả hình MỜ DẦN theo tuổi. Đây là cách duy nhất để "hạn dùng" là một thứ đọc
    // được trên bản đồ — không có nó thì cái trại đứng nguyên si rồi biến mất
    // không báo trước, và người xem đọc ra là một lỗi vẽ.
    const left = (b.expireAt || 0) - tick;
    const fade = clamp(left / 300, 0.35, 1);
    ctx.globalAlpha = fade;

    const cxx = x + s / 2;
    const tentH = s * 0.62;
    const tentTop = baseY - tentH;
    // Hai cọc chống nhô lên khỏi nóc — đường bao dễ nhận nhất của một cái lều dã
    // chiến, và là thứ vẫn còn đọc được khi cả cái lều chỉ còn vài pixel.
    ctx.strokeStyle = '#6b5233';
    ctx.lineWidth = Math.max(1, cs * 0.09);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.14, baseY); ctx.lineTo(x + s * 0.2, tentTop - s * 0.1);
    ctx.moveTo(x + s * 0.86, baseY); ctx.lineTo(x + s * 0.8, tentTop - s * 0.1);
    ctx.stroke();

    // MÁI VẢI: nóc VÕNG XUỐNG ở giữa (đường bậc hai), không phải tam giác cứng.
    // Chính chỗ võng ấy là thứ mắt đọc ra "vải" thay vì "ngói".
    ctx.beginPath();
    ctx.moveTo(x + s * 0.06, baseY);
    ctx.lineTo(x + s * 0.2, tentTop - s * 0.06);
    ctx.quadraticCurveTo(cxx, tentTop + s * 0.1, x + s * 0.8, tentTop - s * 0.06);
    ctx.lineTo(x + s * 0.94, baseY);
    ctx.closePath();
    ctx.fillStyle = '#ddcba0';
    ctx.fill();
    // Nửa phải tối đi — nguồn sáng trên-trái, thống nhất với cả bản đồ.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(96,80,56,0.3)';
    ctx.fillRect(cxx, tentTop - s * 0.2, s, s);
    // Dải màu bộ lạc chạy dọc sống lều.
    ctx.strokeStyle = tribe.color;
    ctx.lineWidth = Math.max(1.4, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, tentTop - s * 0.04);
    ctx.quadraticCurveTo(cxx, tentTop + s * 0.12, x + s * 0.8, tentTop - s * 0.04);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.34)';
    ctx.lineWidth = Math.max(0.8, cs * 0.05);
    ctx.stroke();

    // CỬA LỀU — một vạt tối hình thang ở giữa. Chỗ duy nhất mắt đọc ra "vào được".
    ctx.fillStyle = 'rgba(44,34,24,0.72)';
    ctx.beginPath();
    ctx.moveTo(cxx - s * 0.15, baseY);
    ctx.lineTo(cxx - s * 0.1, tentTop + s * 0.16);
    ctx.lineTo(cxx + s * 0.1, tentTop + s * 0.16);
    ctx.lineTo(cxx + s * 0.15, baseY);
    ctx.closePath(); ctx.fill();

    if (detailed) {
      // Thùng lương chất bên hông + một bao vải. Đây là chi tiết trả lời "trại gì",
      // và nó phải nằm ngoài mái để không bị vạt tối của cửa nuốt mất.
      ctx.fillStyle = '#8a6a3e';
      ctx.fillRect(x - s * 0.06, baseY - s * 0.22, s * 0.24, s * 0.22);
      ctx.fillStyle = 'rgba(255,246,226,0.2)';
      ctx.fillRect(x - s * 0.06, baseY - s * 0.22, s * 0.24, s * 0.05);
      // Bao vải ở 0,92 chứ không 0,98: ở 0,98 nó vươn tới mép 1,11 cạnh, trong khi
      // hộp bấm chỉ nhô ngang 0,08 — bấm vào cái bao là bấm vào bãi cỏ. Đo bằng
      // pixel mới thấy (lệch 1,6px), vì bán kính của hình elip cộng thêm vào toạ độ
      // tâm là đúng loại phép cộng mà mắt không bắt được khi đọc mã.
      ctx.fillStyle = '#cbb98e';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.92, baseY - s * 0.1, s * 0.13, s * 0.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // ĐANG NUÔI MẤY SUẤT — mấy chấm hổ phách trên nóc, một chấm một suất. Con số
      // này là cả nội dung của nhánh nghiên cứu Quân nhu, nên nó phải nhìn thấy
      // được mà không cần bấm vào; và ĐẾM CHẤM đọc nhanh hơn đọc số ở cỡ này.
      const n = Math.min(b.serving || 0, 8);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = '#e6bd63';
        ctx.beginPath();
        ctx.arc(x + s * (0.24 + i * 0.09), tentTop - s * 0.2, Math.max(1, s * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillRect(x, bodyTop, s, bodyH);
    // Mái: tam giác tối màu hơn thân, phủ hết bề ngang. Màu mái đổi theo THỜI ĐẠI
    // (xem ageRoofColor) — đây là tín hiệu "lên đời" đọc được ở mọi mức zoom.
    ctx.fillStyle = ageRoofColor(tribe);
    ctx.beginPath();
    if ((tribe.age || 1) <= 1) {
      // ĐỒ ĐÁ: NÓC XIÊU. Ba thứ lệch đi so với mái chuẩn — đỉnh THẤP xuống (mái
      // bẹt, lều chứ không nhà), đỉnh LỆCH sang một bên, và hai đầu hiên KHÔNG
      // BẰNG NHAU. Cái thứ ba mới là nét gánh việc: đối xứng là thứ khiến một hình
      // đọc ra "được xây", nên phá đối xứng là cách rẻ nhất để nó đọc ra "dựng tạm".
      //
      // Cả ba đều nằm TRONG hộp bao cũ (đỉnh thấp hơn apexY, hai hiên vẫn đúng
      // 0,08s như buildingSpriteOverhang khai báo cho thời đại 1) — nên hit-test,
      // culling và nhãn tên không phải đổi theo. Bài học Phase 3.19: ba thứ neo
      // vào ô lưới cùng vỡ khi sprite tràn ra khỏi ô đã khai báo.
      const hh = hash01(b.id * 5 + 1, b.id * 3 + 7);
      ctx.moveTo(x - s * 0.08, bodyTop + s * 0.04 + s * 0.05 * hh);
      ctx.lineTo(x + s * (0.5 + (hh - 0.5) * 0.26), apexY + s * 0.09);
      ctx.lineTo(x + s * 1.08, bodyTop + s * 0.04 + s * 0.05 * (1 - hh));
    } else {
      ctx.moveTo(x - s * 0.08, bodyTop + s * 0.04);
      ctx.lineTo(x + s * 0.5, apexY);
      ctx.lineTo(x + s * 1.08, bodyTop + s * 0.04);
    }
    ctx.closePath(); ctx.fill();
    // Vệt sáng cạnh trái = nguồn sáng trên-trái, thống nhất với bóng đổ của cây.
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(x, bodyTop, s * 0.22, bodyH);
    // Cạnh phải tối lại: hai mặt sáng khác nhau mới ra cảm giác KHỐI hộp. Với thân
    // thấp thì thừa, với thân cao thì thiếu nó là mặt tường trông như tờ giấy.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x + s * 0.78, bodyTop, s * 0.22, bodyH);
  }

  if (detailed) {
    ctx.fillStyle = 'rgba(255, 240, 190, 0.85)';
    if (b.type === 'town') {
      // Cột cờ + lá cờ phất theo thời gian -> thủ đô nhìn phát ra ngay.
      ctx.fillStyle = '#efe6d0';
      ctx.fillRect(x + s * 0.46, apexY - s * 0.53, s * 0.07, s * 0.6);
      const wave = Math.sin(aTick * 0.08 + b.id) * s * 0.06;
      ctx.fillStyle = tribe.color;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.53, apexY - s * 0.53);
      ctx.lineTo(x + s * 0.95, apexY - s * 0.40 + wave);
      ctx.lineTo(x + s * 0.53, apexY - s * 0.26);
      ctx.closePath(); ctx.fill();
      // Cửa và cửa sổ neo theo CHÂN nhà: chúng là chi tiết ở tầng trệt, nhà cao lên
      // thì phải đứng yên tại chỗ chứ không trôi lên theo mái.
      ctx.fillStyle = 'rgba(255, 240, 190, 0.9)';
      ctx.fillRect(x + s * 0.32, baseY - s * 0.45, s * 0.16, s * 0.3);  // cửa lớn
      ctx.fillRect(x + s * 0.6, baseY - s * 0.5, s * 0.14, s * 0.14);   // cửa sổ
      // Nhà cao thì có thêm tầng trên — hàng cửa sổ thứ hai, đặt giữa thân.
      if (bodyH > s * 0.95) {
        ctx.fillStyle = 'rgba(255, 240, 190, 0.5)';
        ctx.fillRect(x + s * 0.32, bodyTop + s * 0.22, s * 0.13, s * 0.13);
        ctx.fillRect(x + s * 0.58, bodyTop + s * 0.22, s * 0.13, s * 0.13);
      }
    } else if (b.type === 'house') {
      if ((tribe.age || 1) <= 1) {
        // Đồ Đá: một cái LỖ CỬA tối om, không khung, không cửa sổ. Ô cửa sổ sáng
        // vàng của bản chuẩn là thứ nói "trong này có đèn, có người ngồi" — đúng
        // câu mà một túp lều không được phép nói.
        ctx.fillStyle = 'rgba(18,13,9,0.7)';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.4, baseY);
        ctx.lineTo(x + s * 0.4, baseY - s * 0.3);
        ctx.arc(x + s * 0.5, baseY - s * 0.3, s * 0.1, Math.PI, 0);
        ctx.lineTo(x + s * 0.6, baseY);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(x + s * 0.4, baseY - s * 0.4, s * 0.2, s * 0.4);
        ctx.fillStyle = 'rgba(255, 240, 190, 0.55)';
        ctx.fillRect(x + s * 0.66, baseY - s * 0.55, s * 0.14, s * 0.14);
      }
    } else if (b.type === 'heroHall') {
      // TƯỚNG PHỦ — hai cột soái vượt lên trên mái, một xà ngang nối đầu cột, cờ
      // đuôi nheo treo trên xà, và một cái TRỐNG TRẬN đặt trước cửa.
      //
      // Đường bao "hai cột + xà ngang" là hình duy nhất trong cả bảng công trình
      // có một khoảng TRỐNG NHÌN XUYÊN QUA nằm phía trên mái. Mọi công trình khác
      // đều đặc từ chân lên nóc (kể cả tháp canh, kể cả đền thờ), nên ở mức zoom
      // mà hoa văn đã tan hết, cái khe giữa hai cột vẫn còn đọc được. Cùng lý lẽ
      // với hàng cột Thiên Triều — một hình bóng có lỗ thì khác hẳn mọi hình đặc.
      //
      // Trống trận là nét nhận diện thứ hai, cho mức zoom gần: nó là VÒNG TRÒN duy
      // nhất nằm ở tầng trệt trong cả bảng, và mắt phân loại theo hình trước màu.
      // Hai cột đứng NGOÀI thân nhà, không đè lên mặt tường. Bản đầu vẽ chúng ở
      // 0,14s và 0,86s — tức là nằm TRÊN mặt tiền — và ở cỡ vẽ thật nó đọc ra là
      // "căn nhà có hai vệt sọc", không đọc ra là một cái cổng. Đẩy ra hai mép thì
      // khoảng trống giữa cột và tường mới xuất hiện, và chính khoảng trống ấy là
      // toàn bộ nét nhận diện. Vẫn nằm trong 0,08s mà buildingSpriteOverhang khai.
      const colW = Math.max(1, s * 0.1);
      const colTop = apexY - s * 0.34;
      ctx.fillStyle = '#8a6a3f';
      ctx.fillRect(x - s * 0.07, colTop, colW, baseY - colTop - s * 0.02);
      ctx.fillRect(x + s * 1.07 - colW, colTop, colW, baseY - colTop - s * 0.02);
      ctx.fillStyle = '#a1785a';                       // xà ngang nối đầu cột
      ctx.fillRect(x - s * 0.07, colTop, s * 1.14, Math.max(1, s * 0.09));
      ctx.fillStyle = 'rgba(0,0,0,0.25)';              // gờ tối dưới xà -> có bề dày
      ctx.fillRect(x - s * 0.07, colTop + Math.max(1, s * 0.09), s * 1.14, Math.max(0.7, s * 0.035));
      // Cờ đuôi nheo treo TỪ XÀ xuống, phất theo thời gian — cùng nhịp cờ kinh đô.
      const wv = Math.sin(aTick * 0.07 + b.id) * s * 0.05;
      ctx.fillStyle = tribe.color;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, colTop + s * 0.1);
      ctx.lineTo(x + s * 0.5, colTop + s * 0.46);
      ctx.lineTo(x + s * 0.74, colTop + s * 0.3 + wv);
      ctx.closePath(); ctx.fill();
      // TRỐNG TRẬN đặt cao hơn chân nhà, và đó không phải chuyện bố cục: từ Đồ Sắt
      // trở lên lớp phủ thời đại đắp một cái BỆ ĐÁ cao tới 0,26s lên đúng chân nhà,
      // và nó được vẽ SAU khối này — cái trống đặt ở 0,16s sẽ bị chôn hoàn toàn từ
      // thời đại 3 trở đi. Nét nhận diện chỉ tồn tại ở hai thời đại đầu thì coi như
      // không tồn tại.
      const dx = x + s * 0.5, dy = baseY - s * 0.42, dr = s * 0.16;
      ctx.fillStyle = '#5a3f2a';
      ctx.fillRect(dx - dr, dy - dr * 0.72, dr * 2, dr * 1.44);
      ctx.fillStyle = '#d9c9a4';                        // mặt trống nghiêng về phía người xem
      ctx.beginPath(); ctx.ellipse(dx - dr, dy, dr * 0.36, dr * 0.78, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8a544';                        // đai vàng quanh tang trống
      ctx.fillRect(dx - dr * 0.25, dy - dr * 0.78, Math.max(0.8, dr * 0.18), dr * 1.56);
    } else if (b.type === 'barracks') {
      // Hai thanh chéo = kiếm bắt chéo.
      ctx.strokeStyle = '#e8e2d2';
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.28, baseY - s * 0.15); ctx.lineTo(x + s * 0.72, baseY - s * 0.58);
      ctx.moveTo(x + s * 0.72, baseY - s * 0.15); ctx.lineTo(x + s * 0.28, baseY - s * 0.58);
      ctx.stroke();
    } else if (b.type === 'tower') {
      ctx.fillStyle = tribe.dark;
      ctx.fillRect(x + s * 0.12, apexY - s * 0.16, s * 0.76, s * 0.22); // vọng lâu nhô ra
      ctx.fillStyle = 'rgba(255,240,190,0.8)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + s * (0.18 + i * 0.28), apexY - s * 0.30, s * 0.14, s * 0.16);
      // TẦNG ĐỌC ĐƯỢC: mỗi tầng trên tầng một là một vành lan can cắt ngang thân.
      // Chiều cao thân đã tự nói "cái tháp này cao hơn", nhưng CAO HƠN BAO NHIÊU
      // thì mắt không đo được nếu không có cái khác bên cạnh — đúng bài học đã trả
      // giá ở Phase 3.14 (màu cần mẫu đối chứng). Vành lan can thì ĐẾM được, và
      // đếm thì không cần mẫu đối chứng nào.
      const lv = b.level || 1;
      for (let k = 1; k < lv; k++) {
        const ty2 = baseY - bodyH * (k / lv);
        ctx.fillStyle = tribe.dark;
        ctx.fillRect(x - s * 0.07, ty2 - s * 0.05, s * 1.14, s * 0.1);
        ctx.fillStyle = 'rgba(255,240,190,0.55)';
        ctx.fillRect(x - s * 0.07, ty2 - s * 0.05, s * 1.14, Math.max(1, s * 0.03));
      }
    } else if (b.type === 'workshop') {
      // Bánh xe gỗ + đe: dấu hiệu "chỗ này CHẾ TẠO ra thứ gì đó".
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1, s * 0.055);
      const wx = x + s * 0.32, wy = baseY - s * 0.34, wr = s * 0.17;
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = aTick * 0.02 + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * wr, wy - Math.sin(a) * wr);
        ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9c2b0';
      ctx.fillRect(x + s * 0.6, baseY - s * 0.42, s * 0.26, s * 0.14);
    } else if (b.type === 'stable') {
      // Cửa chuồng mở + hàng rào ngang + móng ngựa treo trên cửa. Ba nét, nhưng
      // MÓNG NGỰA mới là nét gánh cả việc nhận diện: nó là ký hiệu duy nhất trong
      // cả bảng công trình mà người xem đọc ra "ngựa" mà không cần chú giải.
      ctx.fillStyle = 'rgba(20,14,10,0.75)';
      ctx.fillRect(x + s * 0.34, baseY - s * 0.46, s * 0.32, s * 0.46);   // cửa chuồng
      ctx.strokeStyle = '#a1785a';
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const ry = baseY - s * (0.12 + i * 0.16);
        ctx.moveTo(x + s * 0.06, ry); ctx.lineTo(x + s * 0.3, ry);
        ctx.moveTo(x + s * 0.7, ry); ctx.lineTo(x + s * 0.94, ry);
      }
      ctx.stroke();
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath();
      ctx.arc(x + s * 0.5, baseY - s * 0.6, s * 0.12, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();
    } else if (b.type === 'infirmary') {
      // Cối giã thuốc + bó lá. Cố tình KHÔNG dùng chữ thập đỏ: nó là ký hiệu của
      // thế kỷ 19 và đặt vào giữa một bản đồ sơn mài thời đồ đá thì nó hét lên
      // rằng cả bảng màu này chỉ là trang trí. Cối và lá thuốc đọc ra "chỗ chữa
      // bệnh" chậm hơn một nhịp, nhưng đọc ra rồi thì nó thuộc về thế giới này.
      ctx.fillStyle = '#7d9c42';
      for (let i = 0; i < 3; i++) {          // bó lá phơi trên giàn
        const lx = x + s * (0.22 + i * 0.22);
        ctx.beginPath();
        ctx.ellipse(lx, baseY - s * 0.62, s * 0.07, s * 0.15, (i - 1) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#c9c2b0';             // cối đá
      ctx.beginPath();
      ctx.moveTo(x + s * 0.34, baseY - s * 0.34);
      ctx.lineTo(x + s * 0.66, baseY - s * 0.34);
      ctx.lineTo(x + s * 0.58, baseY - s * 0.06);
      ctx.lineTo(x + s * 0.42, baseY - s * 0.06);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8d6e63';           // chày
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.46, baseY - s * 0.3);
      ctx.lineTo(x + s * 0.62, baseY - s * 0.56);
      ctx.stroke();
    } else if (b.type === 'depot') {
      // Hai vựa thóc mái tròn + mấy bao hàng xếp trước cửa. Cố tình KHÔNG dùng
      // dáng nhà-có-mái-dốc như nhà ở: kho thường bị đặt lẻ loi ra tận rìa lãnh
      // thổ, nên ở zoom chơi thật nó hay đứng một mình giữa đồng, và nếu nó chỉ là
      // một cái nhà ở nữa thì người xem đọc ra "có người sống ở đây" — sai hẳn câu
      // chuyện. Vựa tròn đọc ra "chỗ chứa đồ" ngay cả khi chỉ còn vài pixel.
      ctx.fillStyle = '#c9a86a';
      for (let i = 0; i < 2; i++) {
        const gx = x + s * (0.28 + i * 0.42);
        ctx.beginPath();
        ctx.moveTo(gx - s * 0.15, baseY - s * 0.06);
        ctx.lineTo(gx - s * 0.15, baseY - s * 0.42);
        ctx.arc(gx, baseY - s * 0.42, s * 0.15, Math.PI, 0);
        ctx.lineTo(gx + s * 0.15, baseY - s * 0.06);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8d6e63';               // bao hàng chất trước cửa
      ctx.fillRect(x + s * 0.36, baseY - s * 0.18, s * 0.28, s * 0.14);
      ctx.fillRect(x + s * 0.42, baseY - s * 0.3, s * 0.17, s * 0.12);
    } else if (b.type === 'shrine') {
      // Ngọn lửa cúng cháy trên một bệ đá, dưới một cổng vòm hẹp. Cố tình KHÁC
      // dáng đền thờ (cột + trán tường) chứ không chỉ khác cỡ: hai công trình cùng
      // một họ mà chỉ khác kích thước thì ở mức zoom chơi thật sẽ thành một.
      ctx.fillStyle = '#efe6d0';
      ctx.fillRect(x + s * 0.38, baseY - s * 0.42, s * 0.24, s * 0.42);   // cổng vòm
      ctx.fillStyle = '#5c6470';
      ctx.fillRect(x + s * 0.34, apexY + s * 0.06, s * 0.32, s * 0.1);    // bệ đá
      const flick = 0.75 + 0.25 * Math.sin(aTick * 0.24 + b.id * 2.1);
      ctx.fillStyle = '#e09a3c';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, apexY - s * 0.3 * flick);
      ctx.lineTo(x + s * 0.6, apexY + s * 0.06);
      ctx.lineTo(x + s * 0.4, apexY + s * 0.06);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7e3a8';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, apexY - s * 0.16 * flick);
      ctx.lineTo(x + s * 0.55, apexY + s * 0.06);
      ctx.lineTo(x + s * 0.45, apexY + s * 0.06);
      ctx.closePath(); ctx.fill();
    } else if (b.type === 'temple') {
      // Cột + trán tường: một hình dạng mà mắt đọc ra "đền" ngay cả ở 6 px/ô.
      ctx.fillStyle = '#efe6d0';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + s * (0.14 + i * 0.23), bodyTop + s * 0.1, s * 0.09, bodyH - s * 0.12);
      ctx.fillStyle = '#d8a544';
      ctx.beginPath();
      ctx.arc(x + s * 0.5, apexY + s * 0.12, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      // Hào quang thở nhè nhẹ — đền là công trình duy nhất sinh Đức Tin, và người
      // xem cần một tín hiệu rằng thanh Đức Tin của họ đang được nuôi từ đâu.
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(aTick * 0.05 + b.id);
      ctx.fillStyle = '#d8a544';
      ctx.beginPath(); ctx.arc(x + s * 0.5, apexY + s * 0.12, s * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Lớp phủ thời đại: nằm NGOÀI khối `detailed` để bệ đá còn đọc được ở zoom xa,
  // và vẽ SAU chi tiết riêng của từng kiểu nhà nên gờ mái/bệ đá phủ lên trên cùng.
  // Ruộng (nằm phẳng) và Kỳ quan (đã có nhánh vàng riêng, luôn là thời Hoàng Kim)
  // không cần — hai nhánh đó cũng không đi qua thân+mái chung nên biến ở đây vô nghĩa.
  // TRẠI TIẾP TẾ cũng bị loại, và không phải chỉ vì "nó có nhánh riêng". Lớp phủ
  // thời đại (bệ đá, gờ mái, mái chồng diêm, chóp Hoàng Kim) nói đúng một câu:
  // "công trình này thuộc về một nền văn minh đã đi tới đâu". Một cái lều vải dựng
  // trong một buổi, sống 1.200 tick rồi nhổ đi, mà đội mái chồng diêm Thiên Triều
  // là hình ảnh nói dối về đúng cái tính chất làm nên nó.
  if (b.type !== 'farm' && b.type !== 'wonder' && b.type !== 'camp') {
    // Lớp THÔ SƠ vẽ TRƯỚC lớp thời đại, và thứ tự này quan trọng ở đúng bậc 2: diềm
    // tranh rách rủ xuống từ mép mái đua, nên tấm diềm gỗ của Đồ Đồng phải được vẽ
    // ĐÈ LÊN đầu trên của nó — nếu ngược lại thì đám tranh mọc ra từ trên mặt ván.
    if ((tribe.age || 1) <= 2) {
      drawCrudeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed);
    }
    drawAgeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed);
  }

  // Con dấu thời đại cắm trên KINH ĐÔ. Chỉ nhà chính (một cái mỗi bộ lạc) để không
  // rải dấu khắp bản đồ, và chỉ khi đủ gần để đọc được các chấm (cs>=6). Đây là câu
  // trả lời chắc chắn nhất cho "bộ lạc này đang ở thời đại nào", đọc được ở mọi zoom
  // mà mắt còn thấy được kinh đô.
  if (b.type === 'town' && detailed) {
    drawCapitalSeal(tribe, x + s / 2, topY, s);
  }

  // Đợt trùng tu vẽ SAU CÙNG trong nhóm này: nó phải phủ lên cả lớp phủ thời đại
  // lẫn con dấu, vì thứ nó đang nói là "toàn bộ những gì bạn vừa thấy vừa mới đổi".
  drawAgeUpSweep(b, tribe, x, s, baseY, topY);

  // Cột sáng vàng bốc lên khi đồng hồ Kỳ quan đang chạy: thứ biến một toà nhà
  // thành một CÁI HẸN GIỜ nhìn thấy được. Vẽ NGOÀI khối `detailed` vì ở mức zoom
  // xa (cs < 6) mới là lúc cần nó nhất — khi đó Kỳ quan chỉ còn vài pixel, và cột
  // sáng là thứ duy nhất còn đọc được ở khoảng cách đó.
  if (b.type === 'wonder' && b.done && wonderWatch && wonderWatch.buildingId === b.id) {
    const gy = baseY - bodyH - s * 0.36;
    const beat = 0.3 + 0.28 * Math.sin(aTick * 0.09);
    const grd = ctx.createLinearGradient(0, gy - s * 3, 0, gy);
    grd.addColorStop(0, 'rgba(255,213,79,0)');
    grd.addColorStop(1, `rgba(255,213,79,${beat.toFixed(3)})`);
    ctx.fillStyle = grd;
    ctx.fillRect(x + s * 0.32, gy - s * 3, s * 0.36, s * 3);
  }

  // Khói bếp. Chỉ nhà ở và nhà chính, chỉ khi đã xây xong, và chỉ ~55% số nhà
  // (chọn bằng id nên một căn nhà không tự bật/tắt ống khói giữa chừng).
  //
  // Nó không mang một mẩu thông tin nào về luật chơi — và đó chính là lý do nó
  // đáng có. Cho tới 3.7, thứ DUY NHẤT động đậy trên bản đồ là thứ đang chiến
  // đấu hoặc đang hư hại; một thị trấn yên bình là một bức ảnh chụp. Khói bếp là
  // nhịp thở của lúc KHÔNG có chuyện gì xảy ra, mà phần lớn thời gian của một
  // kỷ nguyên chính là lúc đó.
  if (detailed && b.done && (b.type === 'house' || b.type === 'town') && (b.id % 20) < 11) {
    const sx = x + s * (b.type === 'town' ? 0.74 : 0.68);
    for (let i = 0; i < 2; i++) {
      const ph = ((aTick * 0.011 + i * 0.5 + b.id * 0.13) % 1);
      ctx.globalAlpha = (1 - ph) * 0.22;
      ctx.fillStyle = '#c9c2b0';
      ctx.beginPath();
      ctx.arc(sx + Math.sin(ph * 4 + b.id) * s * 0.12, apexY - s * (0.12 + ph * 1.15),
              s * (0.07 + ph * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Hư hại: khói khi dưới 55% máu, lửa khi dưới 30%. Đây là tín hiệu chiến sự
  // đọc được từ xa mà không cần nhìn thanh máu.
  const hpRatio = b.hp / b.maxHp;
  if (hpRatio < 0.55) {
    const n = hpRatio < 0.3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const ph = (aTick * 0.05 + i * 0.7 + b.id) % 1;
      ctx.globalAlpha = (1 - ph) * 0.5;
      ctx.fillStyle = hpRatio < 0.3 && i === 0 ? '#d9522f' : '#9e9e9e';
      ctx.beginPath();
      // Khói bốc từ MÁI chứ không từ mép trên footprint — với nhà cao, khói ở mép
      // footprint sẽ phun ra từ giữa bức tường.
      ctx.arc(x + s * (0.3 + i * 0.22), apexY - ph * s * 0.9, s * (0.1 + ph * 0.16), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Chớp trắng khi công trình trúng đòn: quét một lớp sáng mỏng lên đúng khối
  // thân + mái. Nhẹ tay hơn hẳn chớp của quân (0,26 so với 0,42) vì diện tích lớn
  // gấp mười — cùng một độ đục, cái to sẽ hoá thành một tấm bảng trắng.
  if (b.flash > 0) {
    ctx.globalAlpha = clamp(b.flash / 9, 0, 1) * 0.26;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, topY, s, baseY - topY);
    ctx.globalAlpha = 1;
  }

  if (b.hp < b.maxHp) {
    // Thanh máu treo trên ĐỈNH sprite, không phải trên footprint: với tháp canh thì
    // hai mốc này cách nhau gần 3 ô, đặt sai là thanh máu nằm đè lên chính vọng lâu.
    const h = Math.max(2, cs * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x, topY - h - 3, s, h);
    ctx.fillStyle = hpRatio > 0.5 ? '#5aa07c' : hpRatio > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(x, topY - h - 3, s * clamp(hpRatio, 0, 1), h);
  }
}

function drawRuin(r, px, py, cs) {
  const age = (tick - r.born) / CONFIG.RUIN_LIFETIME;
  const s = r.size * cs;
  ctx.globalAlpha = clamp(1 - age, 0, 1) * 0.55;
  ctx.fillStyle = '#2b2622';
  ctx.fillRect(px + cs / 2 - s / 2, py + cs / 2 - s / 2, s, s);
  ctx.fillStyle = r.color;
  for (let i = 0; i < 4; i++) {
    const h = hash01(r.x + i, r.y - i);
    ctx.fillRect(px + cs / 2 - s / 2 + h * s * 0.7, py + cs / 2 - s / 2 + hash01(r.y, r.x + i) * s * 0.7, s * 0.22, s * 0.18);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------
// Quân
// ------------------------------------------------------------
const CARRY_COLOR = { food: '#7fa63f', wood: '#a1887f', gold: '#e0a825', stone: '#8c8f89' };

// Dụng cụ lao động — chỉ vẽ ở zoom gần (cs>=9), khi dân ĐANG thu hoạch (task
// 'gather'). Loại dụng cụ đọc theo tài nguyên đang khai thác: đốn cây cầm RÌU,
// đập đá/đào vàng cầm CUỐC CHIM, hái quả cầm LIỀM. Có một nhịp VUNG (sin theo
// aTick) để động tác "gõ / bổ" nhìn thấy được — trước đây dân đứng thu hoạch
// bất động y hệt dân đứng chờ, không đọc ra ai đang làm việc gì.
function drawGatherTool(u, cx, cy, cs, bob) {
  const res = (u.resTarget && u.resTarget.type) || u.job || u.carry.type;
  if (res !== 'wood' && res !== 'stone' && res !== 'gold' && res !== 'food') return;
  const dir = u.facingX >= 0 ? 1 : -1;
  const hx = cx + dir * cs * 0.26, hy = cy + bob - cs * 0.02;      // bàn tay phía quay mặt
  const sw = (Math.sin((aTick + u.id * 9) * 0.34) + 1) * 0.5;      // 0 nhấc cao .. 1 bổ xuống
  ctx.lineCap = 'round';

  if (res === 'food') {
    // Liềm: động tác hái nhẹ, không bổ mạnh như rìu/cuốc.
    const a = -Math.PI * 0.28 + Math.PI * 0.22 * sw;
    const bx = hx + Math.cos(a) * dir * cs * 0.42, by = hy + Math.sin(a) * cs * 0.42;
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = Math.max(1, cs * 0.08);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#d7ccb4'; ctx.lineWidth = Math.max(1, cs * 0.09);
    ctx.beginPath(); ctx.arc(bx, by, cs * 0.19, -0.4, Math.PI * 0.9); ctx.stroke();
    ctx.lineCap = 'butt'; return;
  }

  const ang = -Math.PI * 0.64 + Math.PI * 0.58 * sw;               // góc cán: nhấc -115° .. bổ -10°
  const vx = Math.cos(ang) * dir, vy = Math.sin(ang);             // hướng cán
  const L = cs * 0.6;
  const tx = hx + vx * L, ty = hy + vy * L;                        // đầu cán
  const px = -vy, py = vx;                                         // pháp tuyến của cán
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = Math.max(1.2, cs * 0.1);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();

  if (res === 'wood') {
    // Lưỡi rìu: nêm thép chìa về hướng quay mặt.
    ctx.fillStyle = '#c9c2b0';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + vx * cs * 0.28 + px * cs * 0.15, ty + vy * cs * 0.28 + py * cs * 0.15);
    ctx.lineTo(tx + vx * cs * 0.28 - px * cs * 0.15, ty + vy * cs * 0.28 - py * cs * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  } else {
    // Cuốc chim: đầu thép hai mũi vắt ngang đầu cán (đá & vàng đều đào bằng cuốc).
    ctx.strokeStyle = '#8c8f89'; ctx.lineWidth = Math.max(1.4, cs * 0.12);
    ctx.beginPath();
    ctx.moveTo(tx - px * cs * 0.22 + vx * cs * 0.05, ty - py * cs * 0.22 + vy * cs * 0.05);
    ctx.lineTo(tx + px * cs * 0.22 - vx * cs * 0.02, ty + py * cs * 0.22 - vy * cs * 0.02);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// ------------------------------------------------------------
// Vung vũ khí
// ------------------------------------------------------------
// TIẾN ĐỘ CÚ VUNG, 0..1 trên cả chu kỳ; -1 nghĩa là không đang vung.
//
// Mốc thời gian là `u.swingAt`, đóng ngay trong dealDamage — tức đúng khoảnh khắc
// máu thật sự bị trừ. Nhờ vậy nhát chém trên màn hình không bao giờ lệch pha với
// nhát chém trong luật chơi, và không phải nuôi một biến hoạt ảnh thứ hai để rồi
// phải giữ cho hai bên khớp nhau (đúng cái bẫy mà cần bắn của máy bắn đá tránh được
// bằng cách đọc thẳng u.cooldown).
//
// Độ dài cú vung co giãn theo NHỊP ĐÁNH THẬT quy ra giây: ở 12 tick/s một chu kỳ hồi
// chiêu kéo hơn một giây nên cú vung được vẽ trọn vẹn; ở 600 tick/s nó co lại còn
// vài khung, nếu không thì một cú vung sẽ trùm lên năm cú kế tiếp và cây rìu đứng
// nguyên ở tư thế bổ xuống — nhìn ra thành "đơ", đúng ngược thứ đang muốn thêm vào.
function swingK(u) {
  if (!u.swingAt) return -1;
  const cd = u.atkCooldown || u.cd || CONFIG.UNIT.ATTACK_COOLDOWN;
  const frames = clamp((cd / Math.max(1, ticksPerSecond)) * 60 * 0.62, 5, 20);
  const k = (aTick - u.swingAt) / frames;
  return (k < 0 || k > 1) ? -1 : k;
}

// 0 = giơ cao sau vai (chờ đòn) .. 1 = bổ hết tầm trước mặt.
//
// Cú vung được vẽ TRỄ HƠN đòn đánh: sát thương đã trừ xong rồi mới thấy lưỡi rìu
// bắt đầu hạ xuống. Đó là cố ý, và là cách duy nhất còn lại — muốn thấy phần lấy đà
// TRƯỚC cú đánh thì phải đoán trước lúc nào đối thủ còn đứng trong tầm, mà chuyện
// đó thì tới chính đơn vị đang đánh cũng không biết. Độ trễ chỉ ~0,08 giây, còn cái
// đổi lại là mắt được xem trọn vẹn động tác bổ thay vì thấy lưỡi rìu nhảy cóc.
const SWING_DOWN = 0.34;   // phần đầu chu kỳ dành cho nhát bổ, phần còn lại để nhấc lên
function swingChop(k) {
  if (k < 0) return 0;
  return k < SWING_DOWN
    ? 0.5 - 0.5 * Math.cos((k / SWING_DOWN) * Math.PI)               // bổ xuống
    : 0.5 + 0.5 * Math.cos(((k - SWING_DOWN) / (1 - SWING_DOWN)) * Math.PI);  // nhấc lên
}

// Vệt chém: cung sáng chạy dọc quỹ đạo lưỡi, mọc dài dần theo nhát bổ rồi tan đi.
// Đây mới là thứ mắt đọc ra "vung" — bản thân cây rìu đổi góc thì ở cỡ 10 px chỉ ra
// "cây que vừa nhảy sang chỗ khác". Cung được vẽ TRƯỚC vũ khí nên lưỡi luôn nằm đè
// lên đầu vệt, đúng như một vệt do chính nó để lại.
function drawSwingTrail(k, hx, hy, r, ready, hit, dir, color, w) {
  const kt = k / (SWING_DOWN * 1.7);
  if (k < 0 || kt >= 1) return;
  const lead = ready + (hit - ready) * Math.min(1, k / SWING_DOWN);
  const scr = a => dir > 0 ? a : Math.PI - a;
  ctx.globalAlpha = (1 - kt) * 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(hx, hy, r, scr(ready), scr(lead), dir < 0);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 1;
}

// RÌU CHIẾN của bộ binh. Vác ngược ra sau vai lúc hành quân, bổ chéo xuống trước mặt
// lúc giao chiến. Chọn rìu chứ không phải kiếm là một quyết định về ĐỘ ĐỌC ĐƯỢC: ở
// cỡ 9–14 px một lưỡi kiếm chỉ còn là một nét thẳng y hệt cây cung đã duỗi hay cái
// cán cuốc, còn cái đầu rìu là một khối đặc lệch hẳn về một bên — mắt bắt được ngay
// cả khi không đọc nổi phần còn lại của người lính.
const AXE_READY = -Math.PI * 0.80;   // vác sau vai
const AXE_HIT   =  Math.PI * 0.13;   // bổ xuống trước mặt

// ============================================================
// TRANG BỊ ĐỌC ĐƯỢC — ba nhánh nghiên cứu, ba mảng hình riêng
// ============================================================
// Cho tới 3.21, năm nhánh nâng cấp quân sự trả về đúng một thứ: mấy con số trong
// một cái bảng ở cột phải. Trên bản đồ, một đạo quân đã đổ 600 lương + 400 vàng
// vào "Rèn binh khí cấp 3" trông y hệt một đạo quân vừa ra lò từ trại lính.
//
// Đây chính là bài học đã viết ra khi XOÁ nhánh "Ngựa chiến" (xem CONFIG.UPGRADE):
// một phần thưởng mà người xem không nhìn thấy thì với họ nó không tồn tại. Lần
// đó cách chữa là bỏ nhánh đi; lần này là làm cho nó hiện ra.
//
// Ánh xạ MỘT-ĐỔI-MỘT, và đó là điều kiện để nó đọc được:
//     Giáp trụ  -> KHIÊN (cỡ + vật liệu + hình dáng)
//     Rèn binh khí -> ĐẦU RÌU (cỡ + vật liệu)
//     Cung nỏ   -> CÁNH CUNG (bề dày + vật liệu)
// Một nhánh chạm vào hai mảng hình, hay hai nhánh cùng chạm một mảng, thì người
// xem không bao giờ suy ngược ra được cái gì gây ra cái gì — và thứ họ đọc được
// sẽ chỉ còn là "quân này trông xịn hơn", đúng cái mơ hồ đang phải sửa.
//
// Thang vật liệu da -> đồng -> sắt -> vàng cố ý TRÙNG với thang mái nhà theo thời
// đại (AGE_MAT). Trùng là có lợi: người xem chỉ phải học MỘT lần rằng vàng đứng
// trên sắt, rồi dùng lại được cái luật đó ở cả hai chỗ.
const GEAR_MAT = [
  { metal: '#8d6e63', hi: '#a98a7c' },   // 0 — da bọc gỗ, chưa nghiên cứu gì
  { metal: '#b5702f', hi: '#d0913f' },   // 1 — đồng
  { metal: '#9aa0a6', hi: '#ccd2d5' },   // 2 — sắt
  { metal: '#c9992f', hi: '#f0cf85' }    // 3 — vàng
];
function gearMat(tribe, line) {
  const lv = tribe && tribe.upgrades ? tribe.upgrades[line] : 0;
  return GEAR_MAT[clamp(lv || 0, 0, 3)];
}
function gearLv(tribe, line) {
  return clamp((tribe && tribe.upgrades ? tribe.upgrades[line] : 0) || 0, 0, 3);
}

// ĐANG BƯỚC HAY ĐANG ĐỨNG, 0..1. Đọc từ độ LỆCH giữa vị trí mô phỏng và vị trí
// vẽ — bộ lọc nội suy chỉ tụt lại phía sau khi đơn vị thật sự đang dời chỗ, nên
// hiệu số này đã là một máy đo tốc độ có sẵn, không phải nuôi thêm trạng thái nào.
//
// Vì sao đáng có: bản trước, một người lính đứng gác và một người lính đang chạy
// vào trận vẽ y hệt nhau, chỉ nhấp nhô lên xuống. Cả một đạo quân hành quân qua
// màn hình mà không có lấy một cái chân nào động đậy.
function unitStride(u) {
  if (u.rx === undefined) return 0;
  return Math.min(1, (Math.abs(u.x - u.rx) + Math.abs(u.y - u.ry)) * 1.6);
}

// HAI CHÂN, có bước. Vẽ TRƯỚC thân để chúng chui ra từ dưới vạt áo.
function drawLegs(cx, hipY, footY, cs, w, stride, phase, dark) {
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.3, cs * 0.12);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const sw = Math.sin(phase + (s > 0 ? 0 : Math.PI)) * stride;
    ctx.beginPath();
    ctx.moveTo(cx + s * w * 0.2, hipY);
    // Đứng yên (stride 0) thì hai chân trùng nhau thành một cặp trụ thẳng — đúng
    // tư thế nghỉ, và cũng đúng hình mà bản cũ vẽ, nên không có bước lùi nào.
    ctx.lineTo(cx + s * w * 0.2 + sw * cs * 0.22, footY);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// KHIÊN của bộ binh, cầm ở tay TRÁI (phía ngược hướng nhìn) nên đường bao ngang
// của người lính thành: khiên | thân | rìu. Ba khối tách bạch ở ba độ sáng khác
// nhau là thứ giữ cho hình còn đọc được ở 9-12 px, chỗ mà mọi chi tiết bên trong
// đã nhoè hết.
//
// Cấp 0-1 khiên TRÒN, cấp 2-3 khiên hình GIỌT (dài xuống dưới). Đổi hình chứ
// không chỉ đổi màu là có chủ ý — cùng bài học của công trình lên đời ở 3.14: màu
// cần một mẫu đặt cạnh mới so được, còn đường bao thì đọc ngay một mình.
function drawShield(tribe, cx, cy, cs, bob, bodyW, dir, lv) {
  const M = GEAR_MAT[lv];
  const sx = cx - dir * bodyW * 0.5, sy = cy + bob + cs * 0.02;
  const r = cs * (0.26 + lv * 0.02);
  ctx.beginPath();
  if (lv >= 2) {
    ctx.moveTo(sx, sy - r);
    ctx.quadraticCurveTo(sx + r * 0.95, sy - r * 0.7, sx + r * 0.8, sy + r * 0.15);
    ctx.quadraticCurveTo(sx + r * 0.4, sy + r * 1.15, sx, sy + r * 1.5);
    ctx.quadraticCurveTo(sx - r * 0.4, sy + r * 1.15, sx - r * 0.8, sy + r * 0.15);
    ctx.quadraticCurveTo(sx - r * 0.95, sy - r * 0.7, sx, sy - r);
  } else {
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fillStyle = tribe.color;
  ctx.fill();
  ctx.strokeStyle = M.metal;
  ctx.lineWidth = Math.max(1, cs * 0.09);
  ctx.stroke();
  if (cs >= 11) {
    ctx.fillStyle = M.hi;                       // núm khiên
    ctx.beginPath(); ctx.arc(sx, sy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

// `lv` = cấp nhánh "Rèn binh khí". Đầu rìu to dần và đổi vật liệu; CÁN thì không
// đổi — cán gỗ ở mọi cấp, để chênh lệch dồn hết vào đúng một chỗ mắt đang nhìn.
function drawBattleAxe(u, cx, cy, cs, bob, bodyW, lv) {
  const M = GEAR_MAT[lv || 0];
  const dir = u.facingX >= 0 ? 1 : -1;
  const k = swingK(u);
  const ang = AXE_READY + (AXE_HIT - AXE_READY) * swingChop(k);
  const hx = cx + dir * bodyW * 0.44, hy = cy + bob + cs * 0.02;   // bàn tay
  // Cán NGẮN lại và đầu rìu TO lên so với bản trước (0,74/0,30 -> 0,64/0,38).
  // Ở tỉ lệ cũ, cái cán dài gấp hai lần rưỡi phần lưỡi, nên đường bao ra một cây
  // sào có chấm ở đầu — đọc thành GIÁO, không phải rìu. Mà "cái đầu rìu là một
  // khối đặc lệch hẳn về một bên" chính là toàn bộ lý do chọn rìu thay vì kiếm
  // (xem khối chú thích ngay trên): tỉ lệ sai thì lý do đó tự huỷ.
  const L = cs * 0.64;
  const vx = Math.cos(ang) * dir, vy = Math.sin(ang);
  const tx = hx + vx * L, ty = hy + vy * L;
  const px = -vy * dir, py = vx * dir;                             // pháp tuyến của cán
  const g = 1 + (lv || 0) * 0.13;                                  // đầu rìu to dần theo cấp

  drawSwingTrail(k, hx, hy, L * 1.02, AXE_READY, AXE_HIT, dir,
                 lv >= 3 ? '#f7e3a8' : '#fff0d8', Math.max(1, cs * (0.16 + (lv || 0) * 0.02)));

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b4a2b';                                     // cán gỗ
  ctx.lineWidth = Math.max(1.2, cs * 0.11);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.lineCap = 'butt';

  // Đầu rìu: nêm thép chìa ra khỏi đầu cán, dày về một bên.
  ctx.fillStyle = M.hi;
  ctx.beginPath();
  ctx.moveTo(tx - vx * cs * 0.16, ty - vy * cs * 0.16);
  ctx.lineTo(tx + vx * cs * 0.38 * g + px * cs * 0.30 * g, ty + vy * cs * 0.38 * g + py * cs * 0.30 * g);
  ctx.lineTo(tx + vx * cs * 0.38 * g - px * cs * 0.15 * g, ty + vy * cs * 0.38 * g - py * cs * 0.15 * g);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// CUNG — và cái quan trọng nhất ở đây là DÂY CUNG KÉO THEO NHỊP HỒI CHIÊU.
//
// `u.cooldown` chạy từ `cd` về 0 giữa hai phát bắn, nên `1 - cooldown/cd` chính
// là "đã kéo được bao nhiêu phần dây". Bắn xong là nó rơi thẳng về 0 — dây bật,
// mũi tên biến mất. Đọc thẳng từ cơ chế, đúng thủ thuật của cần bắn máy bắn đá:
// hoạt ảnh KHÔNG THỂ lệch pha với luật chơi vì nó không có đồng hồ riêng để lệch.
//
// Không có mục tiêu thì cung buông (pull = 0) dù đồng hồ hồi chiêu đã đầy: một
// hàng cung thủ đứng gác mà ai cũng giương cung căng hết cỡ vào khoảng không thì
// hình ảnh nói dối về việc có địch ở đó.
function drawBow(u, cx, cy, cs, bob, bodyW, dir, lv) {
  const M = GEAR_MAT[lv || 0];
  const cd = u.atkCooldown || u.cd || CONFIG.UNIT.ATTACK_COOLDOWN;
  const pull = u.combatTarget ? clamp(1 - u.cooldown / cd, 0, 1) : 0;
  const bx = cx + dir * bodyW * 0.62, by = cy + bob;
  const R = cs * (0.42 + (lv || 0) * 0.015);
  ctx.strokeStyle = M.hi;
  ctx.lineWidth = Math.max(1.2, cs * (0.09 + (lv || 0) * 0.012));
  ctx.beginPath();
  ctx.arc(bx, by, R, -Math.PI * 0.45, Math.PI * 0.45, dir < 0);
  ctx.stroke();
  // Dây: một đường gấp khúc, đỉnh lùi về sau theo `pull`.
  const tipY = R * Math.sin(Math.PI * 0.45), tipX = R * Math.cos(Math.PI * 0.45);
  const nx = bx + dir * tipX, kx = bx - dir * (pull * cs * 0.34 - tipX * 0.02);
  ctx.strokeStyle = 'rgba(240,235,222,0.9)';
  ctx.lineWidth = Math.max(0.8, cs * 0.05);
  ctx.beginPath();
  ctx.moveTo(nx, by - tipY);
  ctx.lineTo(kx, by);
  ctx.lineTo(nx, by + tipY);
  ctx.stroke();
  // MŨI TÊN đã lắp — chỉ hiện khi dây đã kéo quá nửa, tức là đúng nhịp sắp buông.
  if (pull > 0.5 && cs >= 11) {
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = Math.max(1, cs * 0.06);
    ctx.beginPath();
    ctx.moveTo(kx, by); ctx.lineTo(bx + dir * cs * 0.44, by);
    ctx.stroke();
    ctx.fillStyle = M.metal;
    ctx.beginPath();
    ctx.moveTo(bx + dir * cs * 0.52, by);
    ctx.lineTo(bx + dir * cs * 0.4, by - cs * 0.06);
    ctx.lineTo(bx + dir * cs * 0.4, by + cs * 0.06);
    ctx.closePath(); ctx.fill();
  }
}

// ỐNG TÊN sau lưng — ba cái ngòi lông chìa lên khỏi vai phía sau. Chi tiết nhỏ
// nhất trong cả nhóm này, nhưng nó là thứ duy nhất phân biệt được cung thủ với
// lính cầm giáo khi cây cung đang khuất sau thân người ở hướng nhìn ngược.
function drawQuiver(cx, cy, cs, bob, bodyW, dir) {
  const qx = cx - dir * bodyW * 0.42, qy = cy + bob - cs * 0.1;
  ctx.fillStyle = '#5d4530';
  ctx.fillRect(qx - cs * 0.09, qy - cs * 0.02, cs * 0.18, cs * 0.34);
  ctx.strokeStyle = '#d7ccb4';
  ctx.lineWidth = Math.max(0.8, cs * 0.05);
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(qx + i * cs * 0.06, qy);
    ctx.lineTo(qx + i * cs * 0.08 - dir * cs * 0.04, qy - cs * 0.2);
  }
  ctx.stroke();
}

// Vác hàng về — mỗi tài nguyên một hình dáng riêng thay cho một khối màu chung:
// bó củi, thỏi vàng ("bê vàng về"), tảng đá, giỏ lương. Đọc được ngay dân đang
// gánh gì mà không cần click vào.
function drawCarriedLoad(u, cx, loadY, cs, bob) {
  const t = u.carry.type, topY = loadY + bob;
  if (t === 'wood') {
    ctx.fillStyle = '#7a5230'; ctx.fillRect(cx - cs * 0.3, topY + cs * 0.06, cs * 0.6, cs * 0.12);
    ctx.fillStyle = '#8f6238'; ctx.fillRect(cx - cs * 0.3, topY + cs * 0.2, cs * 0.6, cs * 0.12);
    ctx.fillStyle = '#c9a06a'; ctx.fillRect(cx - cs * 0.3, topY + cs * 0.06, cs * 0.07, cs * 0.26);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - cs * 0.3, topY + cs * 0.06, cs * 0.6, cs * 0.26);
  } else if (t === 'gold') {
    ctx.fillStyle = '#b9871f';
    ctx.beginPath();
    ctx.moveTo(cx - cs * 0.28, topY + cs * 0.3); ctx.lineTo(cx - cs * 0.18, topY + cs * 0.08);
    ctx.lineTo(cx + cs * 0.18, topY + cs * 0.08); ctx.lineTo(cx + cs * 0.28, topY + cs * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c34a'; ctx.fillRect(cx - cs * 0.16, topY + cs * 0.12, cs * 0.32, cs * 0.1);
    ctx.fillStyle = '#f7e3a8'; ctx.fillRect(cx - cs * 0.14, topY + cs * 0.13, cs * 0.12, cs * 0.04);
  } else if (t === 'stone') {
    ctx.fillStyle = '#5c6066';
    ctx.beginPath(); ctx.arc(cx, topY + cs * 0.2, cs * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8c8f89';
    ctx.beginPath(); ctx.arc(cx - cs * 0.07, topY + cs * 0.14, cs * 0.1, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#6f8f38'; ctx.fillRect(cx - cs * 0.24, topY + cs * 0.08, cs * 0.48, cs * 0.26);
    ctx.fillStyle = '#a7c96b'; ctx.fillRect(cx - cs * 0.24, topY + cs * 0.08, cs * 0.48, cs * 0.09);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - cs * 0.24, topY + cs * 0.08, cs * 0.48, cs * 0.26);
  }
}

function drawUnit(u, px, py, cs) {
  if (u.type === 'monster') { drawMonster(u, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  const tribe = tribes[u.tribeId];
  let cx = px + cs / 2, cy = py + cs / 2;

  // Lao người về phía mục tiêu ngay sau cú đánh — chuyển động nhỏ này là thứ làm
  // đám đông trông như đang ĐÁNH NHAU chứ không phải đứng chồng lên nhau.
  if (u.lungeUntil && tick < u.lungeUntil && u.combatTarget) {
    const dx = u.combatTarget.x - u.x, dy = u.combatTarget.y - u.y;
    const len = Math.hypot(dx, dy) || 1;
    cx += (dx / len) * cs * 0.35;
    cy += (dy / len) * cs * 0.35;
  }

  if (u.type === 'hero') { drawHero(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'catapult') { drawCatapult(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  // Ba loại Thiên Triều phải đứng TRƯỚC nhánh chung ở dưới, đúng cùng lý do đã ghi
  // ở UNIT_SPEC / MILITARY_SET / ORDER_ROW: nhánh mặc định vẽ ra một người bộ binh,
  // nên quên một dòng ở đây thì con voi chiến đắt nhất bảng xuất hiện trên chiến
  // trường dưới hình hài một anh lính cầm rìu — chạy đúng, đánh đúng, và vô hình.
  if (u.type === 'ballista') { drawBallista(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'elephant') { drawElephant(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'standard') { drawStandard(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (isCavalry(u.type)) { drawCavalry(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'medic') { drawMedic(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  // ĐỘI HẬU CẦN — dòng thứ tư của cùng một cảnh báo đã viết ở ba dòng trên: nhánh
  // mặc định phía dưới vẽ ra một người bộ binh, nên quên dòng này thì cả đơn vị
  // mới xuất hiện dưới hình hài một anh lính cầm rìu — chạy đúng, và vô hình.
  if (u.type === 'quarter') { drawQuarter(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }

  const detailed = cs >= 9;
  const isArcher = u.type === 'archer';
  const isSoldier = u.type === 'soldier' || isArcher;
  drawShadow(cx, cy + cs * 0.5, cs * (isSoldier ? 0.42 : 0.34), cs * 0.17);

  // TRÚNG NỌC MÃNG XÀ — hai vòng cung xám xanh quấn quanh chân, đập chậm. Đây là
  // cùng bài toán với chấm độc trên đầu quái: một trạng thái làm đổi hành vi mà
  // không vẽ ra thì người xem đọc thành lỗi, không đọc thành cơ chế. Ở đây còn
  // nặng hơn — "đám lính bỗng đi chậm hẳn" trông y hệt một cú tụt khung hình.
  if (u.slowUntil > tick && cs >= 7) {
    const p = 0.45 + 0.3 * Math.sin(aTick * 0.12 + u.id);
    ctx.strokeStyle = `rgba(140,175,120,${p.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.09);
    for (const o of [0.34, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + cs * o, cs * 0.3, cs * 0.11, 0, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  if (!detailed) {
    if (isSoldier) {
      const r = cs * 0.66;
      ctx.beginPath();
      if (isArcher) {
        // Cung thủ = TAM GIÁC, lính = hình thoi. Ở mức zoom xa, khác biệt duy nhất
        // mắt còn đọc được là đường viền ngoài; đổi màu ở đây là vô ích vì cả hai
        // đều đã mang màu bộ lạc.
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy + r * 0.7); ctx.lineTo(cx - r * 0.9, cy + r * 0.7);
      } else {
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
      }
      ctx.closePath();
      ctx.fillStyle = tribe.color; ctx.fill();
      ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // Viền tối quanh dân thường. Ở mức zoom xa, một chấm màu bộ lạc đặt trên nền
      // cỏ xanh có độ tương phản thấp nhất trong cả bảng màu — chính là lý do đám
      // dân "biến mất" khỏi khung hình trong khi lính (hình thoi có viền) thì không.
      ctx.fillStyle = tribe.color;
      ctx.beginPath(); ctx.arc(cx, cy, cs * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(8,10,14,0.7)';
      ctx.lineWidth = Math.max(0.8, cs * 0.1);
      ctx.stroke();
      if (u.carry.amount > 0) {
        ctx.fillStyle = CARRY_COLOR[u.carry.type];
        ctx.fillRect(cx - cs * 0.16, cy - cs * 0.6, cs * 0.32, cs * 0.26);
      }
    }
  } else {
    // Zoom gần: vẽ hẳn hình người — chân + thân + đầu, lính thêm mũ, giáp vai,
    // khiên và vũ khí. Xem khối GEAR_MAT phía trên để biết vì sao mỗi nhánh
    // nghiên cứu chỉ được chạm vào đúng MỘT mảng hình.
    // TỈ LỆ THÂN NGƯỜI, viết lại ở 3.22 để có chỗ cho CHÂN.
    //
    // Bản cũ: thân cao 0,68·cs bắt đầu từ cy-0,136·cs, tức là đáy thân rơi xuống
    // cy+0,544·cs — THẤP HƠN cả mặt đất (bóng đổ ở cy+0,5·cs). Người lính là một
    // cái hộp cắm thẳng xuống đất. Thêm hai cái chân vào đó thì chúng dài đúng
    // 0,01·cs: có vẽ, và không ai nhìn thấy bao giờ. Đây là loại lỗi chỉ lộ ra khi
    // đặt cạnh nhau mà xem, không lộ ra khi đọc mã — hình vẫn "đúng", chỉ là bộ
    // phận mới rơi vào một khe rộng bằng không.
    //
    // Tổng chiều cao giữ gần như y hệt (1,11·cs so với 1,09·cs cũ), chỉ chia lại:
    //   đầu  cy-0,61 .. cy-0,15   ·   thân cy-0,20 .. cy+0,30   ·   chân .. cy+0,50
    const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
    const bodyW = cs * (isSoldier ? 0.62 : 0.5), bodyH = cs * 0.5;
    const dir = u.facingX >= 0 ? 1 : -1;
    const topY = cy - cs * 0.2 + bob;
    const headY = cy - cs * 0.38 + bob;
    const armLv = isSoldier ? gearLv(tribe, 'armor') : 0;

    // CHÂN. Cả dân thường cũng có — họ là nhóm đông nhất trên bản đồ và cũng là
    // nhóm đi lại nhiều nhất, nên nếu chỉ lính có chân thì cái sống động vừa thêm
    // vào lại vắng mặt ở đúng chỗ nó dễ thấy nhất.
    drawLegs(cx, topY + bodyH * 0.94, cy + cs * 0.5, cs, bodyW,
             unitStride(u), (aTick + u.id * 11) * 0.3, tribe.dark);

    if (isArcher) drawQuiver(cx, cy, cs, bob, bodyW, dir);

    // THÂN. Vai hơi rộng hơn eo — một hình thang thay cho hình chữ nhật, đủ để
    // đường bao ra dáng người thay vì ra một viên gạch dựng đứng.
    const shW = bodyW * (1 + armLv * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx - shW / 2, topY);
    ctx.lineTo(cx + shW / 2, topY);
    ctx.lineTo(cx + bodyW * 0.42, topY + bodyH);
    ctx.lineTo(cx - bodyW * 0.42, topY + bodyH);
    ctx.closePath();
    ctx.fillStyle = tribe.color; ctx.fill();
    // Nửa thân phía SAU tối đi — không phải một mảng màu trang trí mà là bóng đổ
    // của chính người đó, nên nó lật theo hướng nhìn. Bản cũ luôn tô nửa trái,
    // nên một người lính quay sang phải trông như bị chiếu sáng từ phía sau.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(dir > 0 ? cx - shW : cx, topY, shW, bodyH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (isSoldier && cs >= 11) {
      ctx.fillStyle = 'rgba(30,22,14,0.55)';                       // thắt lưng
      ctx.fillRect(cx - bodyW * 0.46, topY + bodyH * 0.52, bodyW * 0.92, cs * 0.07);
    }
    // GIÁP VAI — chỉ mọc ra khi đã nghiên cứu Giáp trụ. Đây là mảng hình duy nhất
    // trên người lính XUẤT HIỆN TỪ CON SỐ KHÔNG thay vì chỉ đổi màu, nên nó là
    // thứ đọc được nhanh nhất trong ba nhánh.
    if (armLv > 0 && isSoldier) {
      const M = GEAR_MAT[armLv];
      ctx.fillStyle = M.metal;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * shW * 0.5, topY + cs * 0.05, cs * (0.12 + armLv * 0.02), cs * 0.1,
                    s * 0.3, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, headY, cs * 0.23, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.stroke();

    if (isArcher) {
      // Mũ da (không phải mũ sắt) + cây cung cong. Cung vẽ ở phía đang nhìn, nên
      // một hàng cung thủ đang bắn thì cả hàng "chỉ" về cùng một hướng — đội hình
      // hiện ra thành hình mà không cần vẽ thêm gì.
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - cs * 0.24, headY - cs * 0.22, cs * 0.48, cs * 0.13);
      drawBow(u, cx, cy, cs, bob, bodyW, dir, gearLv(tribe, 'ranged'));
    } else if (isSoldier) {
      // MŨ SẮT có SỐNG MŨI, và ở cấp giáp 3 thêm chỏm lông đỏ. Đổi vật liệu thôi
      // thì ở 10 px hai cấp liền nhau không phân biệt nổi; thêm một nét dọc rồi
      // một cái chỏm là đổi luôn đường bao của cái đầu, và đường bao thì đọc được.
      const M = GEAR_MAT[armLv];
      ctx.fillStyle = armLv > 0 ? M.metal : '#c9c2b0';
      ctx.beginPath();
      ctx.moveTo(cx - cs * 0.26, headY + cs * 0.03);
      ctx.quadraticCurveTo(cx, headY - cs * 0.42, cx + cs * 0.26, headY + cs * 0.03);
      ctx.closePath(); ctx.fill();
      if (cs >= 11) {
        ctx.fillStyle = armLv > 0 ? M.hi : '#e2ddd0';
        ctx.fillRect(cx + dir * cs * 0.03 - cs * 0.03, headY - cs * 0.02, cs * 0.06, cs * 0.2); // sống mũi
      }
      if (armLv >= 3) {
        ctx.fillStyle = '#c2412c';                                  // chỏm lông chỉ huy
        ctx.beginPath();
        ctx.moveTo(cx, headY - cs * 0.22);
        ctx.lineTo(cx - dir * cs * 0.24, headY - cs * 0.42);
        ctx.lineTo(cx - dir * cs * 0.05, headY - cs * 0.14);
        ctx.closePath(); ctx.fill();
      }
      drawShield(tribe, cx, cy, cs, bob, bodyW, dir, armLv);
      drawBattleAxe(u, cx, cy, cs, bob, bodyW, gearLv(tribe, 'melee'));
    } else if (u.task === 'gather') {
      // Xét TRƯỚC carry: đang thu hoạch thì carry.amount cũng >0, nhưng ta muốn
      // thấy DỤNG CỤ đang vung, không phải kiện hàng — hàng chỉ hiện lúc gánh về.
      drawGatherTool(u, cx, cy, cs, bob);
    } else if (u.carry.amount > 0) {
      // Kiện hàng ĐỘI TRÊN ĐẦU, nên mốc của nó là đỉnh đầu — không phải chiều cao
      // thân. Tham số thứ ba từng là `bodyH` và mọi toạ độ bên trong suy ra từ đó;
      // sau khi chia lại tỉ lệ ở trên thì cùng công thức ấy đặt bó củi xuống ngang
      // mặt người dân. Truyền thẳng cái mốc mình muốn thì lần sau chỉnh tỉ lệ nữa
      // cũng không kéo theo hậu quả ở một hàm khác.
      drawCarriedLoad(u, cx, headY - cs * 0.34, cs, bob);
    } else if (u.task === 'build') {
      ctx.strokeStyle = '#e6b46a';
      ctx.lineWidth = Math.max(1, cs * 0.09);
      ctx.beginPath();
      ctx.moveTo(cx + cs * 0.2, cy + bob); ctx.lineTo(cx + cs * 0.5, cy - cs * 0.35 + bob);
      ctx.stroke();
    }
    if (u.fleeTimer > 0) {
      ctx.fillStyle = '#f2d55a';
      ctx.font = `bold ${Math.round(cs * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, cy - cs * 0.75);
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.1, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
  drawHitFlash(u, px, py, cs);
}

// ============================================================
// THẦY LANG
// ============================================================
// Bài toán vẽ ở đây KHÔNG phải "làm sao cho đẹp", mà là: trên một bản đồ đã có
// bảy loại người cùng mang màu bộ lạc, làm sao để cái thứ tám đọc ra được ở 10 px
// mà không cần chú giải. Bài học Phase 3.14 (lên đời phải đổi SILHOUETTE, không
// chỉ đổi màu) áp thẳng vào đây, và nặng hơn: người xem không được xem hai cái
// cạnh nhau để so, họ chỉ thấy một cái đang chạy giữa đám đông.
//
// Nên khác biệt phải nằm ở ĐƯỜNG BAO, không ở chi tiết:
//   · Lính/dân  = thân hình thang + HAI CÁI CHÂN, đường bao có khe hở ở dưới.
//   · Thầy lang = áo choàng dài chạm đất, đường bao là một cái CHUÔNG LIỀN.
// Ở mọi mức zoom, "có chân" và "không có chân" là khác biệt duy nhất còn sống sót.
//
// Màu áo là vải mộc sáng (#ece2cc), không phải màu bộ lạc — thầy lang là kẻ duy
// nhất trên bản đồ mà phe phái KHÔNG phải là thông tin quan trọng nhất về nó. Màu
// bộ lạc lùi xuống thành một dải khăn chéo, đủ để trả lời "của ai" khi cần hỏi.
//
// Bầu thuốc và bó lá dùng lại đúng ngôn ngữ hình của Nhà y tế (cối giã + lá phơi),
// nên hai thứ đọc ra là MỘT hệ thống chứ không phải hai thứ tình cờ cùng chữa máu.
function drawMedic(u, tribe, cx, cy, px, py, cs) {
  const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
  const dir = u.facingX >= 0 ? 1 : -1;

  // SỢI CHỈ XANH nối tới bệnh nhân — vẽ TRƯỚC người để nó chạy phía sau, và vẽ
  // bằng toạ độ RENDER (rx/ry) của bệnh nhân chứ không phải toạ độ lưới: cả hai
  // đầu sợi chỉ đang trượt mềm giữa hai ô, nên neo vào lưới thì sợi chỉ giật từng
  // nấc trong khi hai người ở hai đầu thì đi mượt. Đây đúng là họ lỗi "ba thứ neo
  // vào Ô LƯỚI cùng vỡ khi sprite tràn ra khỏi ô" đã bắt ở Phase 3.19.
  const p = u.healing;
  if (p && p.hp > 0) {
    const tx = (p.rx - camX) * cs + cs / 2, ty = (p.ry - camY) * cs + cs / 2;
    const mid = 0.5, sag = cs * 0.55;
    ctx.strokeStyle = `rgba(122,178,124,${(0.5 + 0.28 * Math.sin(aTick * 0.22)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.11);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo((cx + tx) * mid, (cy + ty) * mid - sag, tx, ty);
    ctx.stroke();
    // Ba đốm lá trôi dọc sợi chỉ. Chuyển động là thứ báo "đang có chuyện xảy ra"
    // — một sợi chỉ đứng yên đọc ra là một đường kẻ trang trí.
    for (let i = 0; i < 3; i++) {
      const t = ((aTick * 0.014 + i / 3 + u.id * 0.13) % 1);
      const it = 1 - t;
      const bx = it * it * cx + 2 * it * t * ((cx + tx) * mid) + t * t * tx;
      const by = it * it * cy + 2 * it * t * ((cy + ty) * mid - sag) + t * t * ty;
      ctx.fillStyle = 'rgba(160,205,150,0.85)';
      ctx.beginPath(); ctx.arc(bx, by, cs * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawShadow(cx, cy + cs * 0.5, cs * 0.36, cs * 0.15);

  if (cs < 9) {
    // Zoom xa: vải mộc sáng + lõi xanh thuốc. Không dùng hình thoi (đã là lính)
    // cũng không dùng tròn trơn (đã là dân) — tròn CÓ LÕI là hình thứ ba.
    ctx.fillStyle = '#ece2cc';
    ctx.beginPath(); ctx.arc(cx, cy, cs * 0.44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5f8f57';
    ctx.beginPath(); ctx.arc(cx, cy, cs * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tribe.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.12);
    ctx.beginPath(); ctx.arc(cx, cy, cs * 0.44, 0, Math.PI * 2); ctx.stroke();
  } else {
    const topY = cy - cs * 0.22 + bob;
    const headY = cy - cs * 0.4 + bob;
    const hemY = cy + cs * 0.5;
    const hemW = cs * 0.62;

    // BÓ LÁ THUỐC sau lưng — vẽ trước áo để nó nằm phía sau.
    ctx.fillStyle = '#6f8f3e';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(cx - dir * cs * 0.32, topY + cs * 0.06 + i * cs * 0.09,
                  cs * 0.055, cs * 0.15, i * 0.4 - dir * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ÁO CHOÀNG — loe dần xuống, chạm đất, không có khe chân.
    ctx.beginPath();
    ctx.moveTo(cx - cs * 0.24, topY);
    ctx.lineTo(cx + cs * 0.24, topY);
    ctx.lineTo(cx + hemW / 2, hemY);
    ctx.lineTo(cx - hemW / 2, hemY);
    ctx.closePath();
    ctx.fillStyle = '#ece2cc';
    ctx.fill();
    // Nửa thân sau tối đi, lật theo hướng nhìn — cùng luật với mọi người khác trên
    // bản đồ, nếu không thì thầy lang là kẻ duy nhất được chiếu sáng từ phía sau.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(120,106,84,0.35)';
    ctx.fillRect(dir > 0 ? cx - hemW : cx, topY, hemW, hemY - topY);
    // KHĂN CHÉO màu bộ lạc — câu trả lời cho "của phe nào", và chỉ ngần này thôi.
    ctx.strokeStyle = tribe.color;
    ctx.lineWidth = Math.max(1.4, cs * 0.15);
    ctx.beginPath();
    ctx.moveTo(cx - cs * 0.3, topY + cs * 0.02);
    ctx.lineTo(cx + cs * 0.3, topY + cs * 0.34);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ĐẦU + KHĂN TRÙM. Khăn phủ kín đỉnh đầu và rủ xuống gáy: một đường cong liền,
    // ngược hẳn với cái mũ sắt có sống mũi và chỏm lông của lính.
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, headY, cs * 0.21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.stroke();
    ctx.fillStyle = '#dcd0b6';
    ctx.beginPath();
    ctx.arc(cx, headY, cs * 0.24, Math.PI * 1.02, Math.PI * 2.1);
    ctx.lineTo(cx - dir * cs * 0.24, headY + cs * 0.2);
    ctx.closePath(); ctx.fill();

    // BẦU THUỐC cầm ở tay trước — quả bầu thắt eo, nút gỗ. Ở cỡ này nó là chi tiết
    // duy nhất còn đọc ra được "nghề gì", nên nó phải nằm ở phía đang nhìn.
    if (cs >= 11) {
      const gx = cx + dir * cs * 0.34, gy = topY + cs * 0.26;
      ctx.fillStyle = '#b98a4e';
      ctx.beginPath();
      ctx.arc(gx, gy + cs * 0.07, cs * 0.13, 0, Math.PI * 2);
      ctx.arc(gx, gy - cs * 0.07, cs * 0.085, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b4b28';
      ctx.fillRect(gx - cs * 0.04, gy - cs * 0.19, cs * 0.08, cs * 0.06);
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.1, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// ĐỘI HẬU CẦN — hình thứ TƯ ở mức thu phóng xa
// ============================================================
// Ở cs < 9 cả bản đồ chỉ còn là những hình khối vài pixel, và tới nay có ba:
//     dân thường  — TRÒN trơn
//     lính        — HÌNH THOI (cung thủ: TAM GIÁC)
//     thầy lang   — TRÒN CÓ LÕI
// Nên đội hậu cần phải là hình thứ tư, và VUÔNG là lựa chọn đúng vì hai lý do:
// nó là hình duy nhất còn lại mà mắt phân biệt được ở bốn pixel, và nó tình cờ
// đúng nghĩa — một cái thùng hàng. Đây không phải chuyện thẩm mỹ: ở mức thu phóng
// chơi thật, ĐƯỜNG BAO là toàn bộ thông tin, và đổi màu ở đó là vô ích vì mọi thứ
// đều đã mang màu bộ lạc.
//
// Ở cs >= 9 thì nó là một người KÉO XE. Cái xe mới là thứ gánh việc nhận diện —
// nó là vật thể duy nhất trên bản đồ có BÁNH XE ngoài hai cỗ máy công thành, mà
// hai cỗ máy đó thì to gấp bốn và không có người đi trước.
// ============================================================
// VẠCH QUÂN LƯƠNG — MỘT chỗ vẽ cho MỌI loại quân
// ============================================================
// Gọi từ vòng `drawables` ngay sau drawUnit, KHÔNG gọi bên trong drawUnit. Lý do
// là số học: có tám hàm vẽ đơn vị và mỗi hàm tự vẽ lấy thanh máu của mình bằng một
// đoạn chép tay (đếm được tám bản `if (u.hp < u.maxHp)` giống hệt nhau trong file
// này). Nhét vạch quân lương vào cùng khuôn ấy là thêm bản chép thứ chín tới thứ
// mười sáu, và bản chép thì lệch dần khỏi bản gốc từ lần sửa thứ hai. Quan trọng
// hơn: loại quân THỨ MƯỜI SÁU thêm vào sau này sẽ lặng lẽ không có vạch, y hệt cái
// bẫy mà UNIT_SPEC/MILITARY_SET đã phải cảnh báo bốn lần.
//
// VỊ TRÍ CỐ ĐỊNH, không xếp khít dưới thanh máu. Xếp khít thì vạch nhảy lên nhảy
// xuống tuỳ người đó có bị thương hay không, và hai thông tin cạnh nhau mà một cái
// nhảy chỗ thì mắt phải đi tìm lại nó mỗi lần.
const SUPPLY_WARN = 0.7;
function drawSupplyMark(u, px, py, cs) {
  if (!u.maxSupply || u.hp <= 0) return;
  const f = u.supply / u.maxSupply;
  if (f >= SUPPLY_WARN) return;                 // còn no thì không chiếm chỗ trên màn hình
  const H = CONFIG.SUPPLY.HUNGRY;
  const cx = px + cs / 2;
  if (cs < 7) {
    // Ở mức thu phóng xa, một cái vạch 2px cạnh một cái vạch 2px khác là hai vệt
    // màu không đọc được. Một CHẤM trên đầu thì vẫn đọc ra là "có chuyện với người
    // này", và đó là toàn bộ thông tin còn giữ được ở cỡ ấy.
    if (f >= H) return;
    ctx.fillStyle = f <= 0.01 ? '#d05a44' : '#e0a33c';
    ctx.beginPath(); ctx.arc(cx, py - cs * 0.2, Math.max(1, cs * 0.2), 0, Math.PI * 2); ctx.fill();
    return;
  }
  const w = cs * 1.1, h = Math.max(1.5, cs * 0.12);
  const barY = py + cs + 2 + Math.max(1.5, cs * 0.14);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(cx - w / 2, barY, w, h);
  // Ba mức màu, và ngưỡng giữa đọc đúng CONFIG.SUPPLY.HUNGRY chứ không phải một
  // con số chép tay: vạch phải đổi màu ở đúng cái tick mà sức đánh bắt đầu tụt.
  // Hai con số nói cùng một sự thật thì con số thứ hai chỉ có một việc là lệch đi.
  const col = f <= 0.01 ? '#d05a44' : f < H ? '#e0a33c' : 'rgba(214,196,150,0.6)';
  ctx.fillStyle = col;
  ctx.fillRect(cx - w / 2, barY, w * clamp(f, 0, 1), h);
  // CẠN SẠCH THÌ ĐÓNG KHUNG ĐỎ. Không có dòng này thì màu đỏ báo nguy KHÔNG BAO GIỜ
  // hiện ra được: bề rộng phần tô là `w × f`, mà đúng ở mức nguy hiểm nhất thì f = 0
  // — nên cái vạch tô đỏ rộng 0 pixel. Đo bằng pixel mới thấy: ở f = 0 đếm được 0
  // phần tử màu, trong khi ở f = 0,3 đếm được 14. Một tín hiệu chỉ tồn tại ở đúng
  // ngưỡng nó không thể hiện ra là một tín hiệu không tồn tại.
  if (f <= 0.01) {
    ctx.strokeStyle = '#d05a44';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 - 0.5, barY - 0.5, w + 1, h + 1);
  }
  // ĐANG ĐƯỢC TIẾP TẾ: viền hổ phách nhấp nháy quanh vạch. Không có nó thì một
  // người lính đứng trong trại và một người lính đứng ngoài trại trông y hệt nhau
  // trong suốt 150 tick — tức là cả cơ chế trại tiếp tế chạy vô hình.
  if (u.supplySrc === 'camp') {
    ctx.strokeStyle = `rgba(230,189,99,${(0.55 + 0.35 * Math.sin(aTick * 0.25)).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 - 0.5, barY - 0.5, w + 1, h + 1);
  }
}

function drawQuarter(u, tribe, cx, cy, px, py, cs) {
  const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
  const dir = u.facingX >= 0 ? 1 : -1;

  // NHÁY HỔ PHÁCH khi trại của nó vừa tiếp tế cho ai đó — cùng thủ thuật `healedAt`
  // của thầy lang. Không có nó thì cả cơ chế chạy hoàn toàn im lặng: quân lương là
  // một con số, và một con số không bao giờ tự nói ra rằng nó vừa được cộng.
  if (u.camp && u.camp.hp > 0 && cs >= 7) {
    const [bx, by] = worldToPx(u.camp.x, u.camp.y);
    ctx.strokeStyle = `rgba(216,178,92,${(0.22 + 0.16 * Math.sin(aTick * 0.16)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.07);
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bx + cs / 2, by + cs / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawShadow(cx, cy + cs * 0.5, cs * 0.46, cs * 0.16);

  if (cs < 9) {
    const r = cs * 0.4;
    ctx.fillStyle = '#c8a469';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // Dải màu bộ lạc vắt ngang thùng — câu trả lời "của phe nào", và chỉ ngần này.
    ctx.fillStyle = tribe.color;
    ctx.fillRect(cx - r, cy - r * 0.3, r * 2, r * 0.6);
    ctx.strokeStyle = tribe.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.11);
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    return;
  }

  const topY = cy - cs * 0.2 + bob;
  const headY = cy - cs * 0.4 + bob;
  const bodyW = cs * 0.5, bodyH = cs * 0.5;
  const footY = cy + cs * 0.5;

  // ---- CHIẾC XE, vẽ TRƯỚC người vì nó nằm PHÍA SAU ----
  // Neo vào hướng nhìn: xe luôn ở sau lưng, nên khi đơn vị quay đầu thì cả cái xe
  // lật sang bên kia. Bỏ qua vế này thì có những lúc người đi lùi kéo xe phía trước.
  const cartX = cx - dir * cs * 0.62;
  const cartY = footY - cs * 0.34;
  const cw = cs * 0.62, ch = cs * 0.42;

  // Càng xe nối từ thùng lên vai người.
  ctx.strokeStyle = '#7a5a34';
  ctx.lineWidth = Math.max(1.2, cs * 0.09);
  ctx.beginPath();
  ctx.moveTo(cartX + dir * cw * 0.4, cartY);
  ctx.lineTo(cx + dir * cs * 0.02, topY + cs * 0.1);
  ctx.stroke();

  // Bánh xe — nan hoa chỉ vẽ khi còn đọc được, đúng luật đã dùng cho con ngựa.
  const wr = cs * 0.2;
  const wy = footY - wr * 0.72;
  ctx.fillStyle = '#5c4529';
  ctx.beginPath(); ctx.arc(cartX, wy, wr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6a3e';
  ctx.beginPath(); ctx.arc(cartX, wy, wr * 0.58, 0, Math.PI * 2); ctx.fill();
  if (cs >= 12) {
    ctx.strokeStyle = '#5c4529';
    ctx.lineWidth = Math.max(0.8, cs * 0.045);
    // Nan hoa QUAY theo quãng đường đã đi, không theo đồng hồ: một bánh xe quay
    // đều trong khi đơn vị đứng yên là thứ mắt bắt được ngay và đọc ra là lỗi.
    const spin = (u.x + u.y) * 0.9 + aTick * 0.04 * (u.speed || 0);
    for (let i = 0; i < 4; i++) {
      const a = spin + i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cartX - Math.cos(a) * wr * 0.8, wy - Math.sin(a) * wr * 0.8);
      ctx.lineTo(cartX + Math.cos(a) * wr * 0.8, wy + Math.sin(a) * wr * 0.8);
      ctx.stroke();
    }
  }

  // Thùng xe + hai bao lương chất trên.
  ctx.fillStyle = '#8a6a3e';
  ctx.fillRect(cartX - cw / 2, cartY - ch * 0.2, cw, ch * 0.62);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cartX - cw / 2, cartY + ch * 0.18, cw, ch * 0.24);
  ctx.fillStyle = '#ddcba0';
  for (const o of [-0.24, 0.2]) {
    ctx.beginPath();
    ctx.ellipse(cartX + cw * o, cartY - ch * 0.36, cw * 0.28, ch * 0.3, o * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(0.8, cs * 0.05);
  ctx.strokeRect(cartX - cw / 2, cartY - ch * 0.2, cw, ch * 0.62);
  // Cờ đuôi nheo màu bộ lạc cắm ở thành xe — dấu hiệu duy nhất còn đọc được khi
  // cái xe bị một người lính đứng che mất một nửa.
  ctx.strokeStyle = '#6b4b28';
  ctx.lineWidth = Math.max(1, cs * 0.06);
  ctx.beginPath();
  ctx.moveTo(cartX - dir * cw * 0.44, cartY - ch * 0.2);
  ctx.lineTo(cartX - dir * cw * 0.44, cartY - ch * 0.95);
  ctx.stroke();
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.moveTo(cartX - dir * cw * 0.44, cartY - ch * 0.95);
  ctx.lineTo(cartX - dir * cw * 0.44 - dir * cs * 0.26, cartY - ch * 0.78);
  ctx.lineTo(cartX - dir * cw * 0.44, cartY - ch * 0.6);
  ctx.closePath(); ctx.fill();

  // ---- NGƯỜI KÉO ----
  drawLegs(cx, topY + bodyH * 0.94, footY, cs, bodyW, unitStride(u),
           (aTick + u.id * 11) * 0.3, tribe.dark);

  // Thân NGHIÊNG VỀ PHÍA TRƯỚC: đó là cả nội dung "đang kéo một thứ nặng", và nó
  // là chi tiết duy nhất phân biệt dáng này với một người dân đứng cạnh cái xe.
  const lean = dir * cs * 0.09;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW / 2 + lean, topY);
  ctx.lineTo(cx + bodyW / 2 + lean, topY);
  ctx.lineTo(cx + bodyW * 0.4, topY + bodyH);
  ctx.lineTo(cx - bodyW * 0.4, topY + bodyH);
  ctx.closePath();
  ctx.fillStyle = '#b9a882';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(90,74,52,0.34)';
  ctx.fillRect(dir > 0 ? cx - bodyW : cx, topY, bodyW, bodyH);
  // ĐAI VAI màu bộ lạc, vắt chéo — cùng ngôn ngữ với khăn chéo của thầy lang, để
  // ba đơn vị hỗ trợ đọc ra là một họ chứ không phải ba thứ rời rạc.
  ctx.strokeStyle = tribe.color;
  ctx.lineWidth = Math.max(1.4, cs * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - cs * 0.28 + lean, topY + cs * 0.03);
  ctx.lineTo(cx + cs * 0.28, topY + cs * 0.32);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Đầu + nón lá rộng vành. Vành nón là đường bao riêng của nghề này: lính có mũ
  // sắt có sống mũi, thầy lang có khăn trùm rủ gáy, hậu cần có một cái đĩa ngang.
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(cx + lean * 0.7, headY, cs * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = Math.max(0.8, cs * 0.07);
  ctx.stroke();
  ctx.fillStyle = '#cdb173';
  ctx.beginPath();
  ctx.ellipse(cx + lean * 0.7, headY - cs * 0.09, cs * 0.3, cs * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b89b5f';
  ctx.beginPath();
  ctx.ellipse(cx + lean * 0.7, headY - cs * 0.14, cs * 0.12, cs * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  if (u.hp < u.maxHp) {
    const w = cs * 1.1, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// CON NGỰA — một hàm, hai chỗ dùng (kỵ binh và ngựa của anh hùng)
// ============================================================
// Bản trước vẽ ngựa bằng bốn nét: một hình bầu dục làm thân, một tứ giác làm cả
// cổ lẫn đầu, bốn đoạn thẳng làm chân, một nét làm đuôi. Đường bao ra đúng là
// "một khối nằm ngang" — nhận diện được, và đó là việc chính nó phải làm — nhưng
// nhìn gần thì nó không phải con ngựa, nó là một cái bao tải có que.
//
// Cái làm nên SILHOUETTE ngựa, xếp theo mức đóng góp:
//   1. Hai khối mông và vai RÕ RỆT, nối bằng một cái lưng võng xuống ở giữa. Một
//      hình bầu dục đơn thì không bao giờ ra được đường lưng đó.
//   2. Cổ VÁT — dày ở vai, thon dần lên gáy — rồi cái đầu gãy góc xuống, có mõm.
//      Bản cũ để cổ và đầu chung một tứ giác nên không có khớp gáy, và đó chính
//      là chỗ mắt người tìm đầu tiên khi đọc một con vật bốn chân.
//   3. Chân có KHỚP: đùi hướng một đằng, ống chân hướng một nẻo. Bốn đoạn thẳng
//      cho ra hình cái ghế đẩu; hai khúc gãy cho ra hình đang bước.
//   4. Bờm và đuôi có bề dày, không phải một nét kẻ.
//
// Chi tiết nhỏ (mắt, tai, mõm, móng) chỉ vẽ khi còn đọc được — dưới ngưỡng đó
// chúng chỉ làm bẩn đường bao vốn đang làm tốt việc nhận diện.
//
// `p` gom mọi thứ khác nhau giữa hai loại ngựa: màu thân, có giáp ngựa không, có
// chỏm lông không, nhịp chân nhanh hay chậm. Một hàm chứ không hai bản chép: hai
// bản chép thì lần sửa sau sẽ chỉ sửa một trong hai, và trên bản đồ sẽ có hai
// giống ngựa khác nhau mà không ai cố ý tạo ra.
function drawHorse(cx, bodyY, H, dir, gait, p, cs) {
  const hide = p.hide, mane = p.mane;
  const thin = Math.max(1, cs * 0.09);

  // ---- CHÂN (vẽ trước, nằm sau thân) ----
  // Cặp sau ở x = -0.30, cặp trước ở +0.26; trong mỗi cặp hai chân lệch nhau chút
  // ít để đọc ra chiều sâu. Mỗi chân là hai khúc: đùi hơi ngả, ống chân đổ theo
  // nhịp phi. Móng là một vạch dày ở cuối.
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const rear = i < 2;
    const lx = cx + dir * H * ((rear ? -0.30 : 0.26) + (i % 2) * 0.07 * dir);
    const ph = gait * (rear ? 1 : -1);
    const kneeX = lx + ph * H * 0.05, kneeY = bodyY + H * 0.24;
    const footX = lx + ph * H * 0.15, footY = bodyY + H * 0.44;
    ctx.strokeStyle = (i % 2) ? p.legDark : hide;
    ctx.lineWidth = Math.max(1.1, cs * 0.11);
    ctx.beginPath();
    ctx.moveTo(lx, bodyY + H * 0.06);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    if (cs >= 5) {                                   // móng
      ctx.strokeStyle = '#1c1610';
      ctx.lineWidth = Math.max(1.2, cs * 0.13);
      ctx.beginPath();
      ctx.moveTo(footX - dir * H * 0.02, footY);
      ctx.lineTo(footX + dir * H * 0.05, footY);
      ctx.stroke();
    }
  }

  // ---- THÂN: mông + vai + lưng võng ----
  // Ba hình chồng lên nhau, cùng một màu nên chúng hàn thành một khối liền; cái
  // đọc ra được là ĐƯỜNG BAO của tổng ba hình đó, không phải từng hình.
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(cx - dir * H * 0.26, bodyY - H * 0.02, H * 0.21, H * 0.19, 0, 0, Math.PI * 2);  // mông
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + dir * H * 0.22, bodyY - H * 0.01, H * 0.20, H * 0.18, 0, 0, Math.PI * 2);  // vai
  ctx.fill();
  ctx.beginPath();                                                                            // lườn
  ctx.moveTo(cx - dir * H * 0.26, bodyY - H * 0.20);
  ctx.quadraticCurveTo(cx, bodyY - H * 0.13, cx + dir * H * 0.22, bodyY - H * 0.19);
  ctx.lineTo(cx + dir * H * 0.22, bodyY + H * 0.16);
  ctx.quadraticCurveTo(cx, bodyY + H * 0.20, cx - dir * H * 0.26, bodyY + H * 0.16);
  ctx.closePath();
  ctx.fill();

  // YÊN THẢM (chỉ ngựa tướng) — mang màu bộ lạc, nhưng CHỈ một tấm dưới yên chứ
  // không phải một bộ giáp phủ kín. Bản đầu vẽ nó thành một mảng lớn trùm từ vai
  // tới lườn: kết quả là con ngựa vừa được vẽ tử tế xong thì bị chính tấm giáp
  // xoá đi, chỉ còn thò ra bốn cái chân và cái đầu — vẽ to lên bao nhiêu cũng vô
  // ích. Màu bộ lạc ở đây không cần nhiều diện tích: anh hùng đã có tên trên đầu,
  // vòng sáng dưới chân và áo choàng cùng màu rồi.
  if (p.barding) {
    ctx.fillStyle = p.barding;
    ctx.beginPath();
    ctx.moveTo(cx - dir * H * 0.10, bodyY - H * 0.19);
    ctx.lineTo(cx + dir * H * 0.16, bodyY - H * 0.17);
    ctx.lineTo(cx + dir * H * 0.13, bodyY + H * 0.10);
    ctx.lineTo(cx - dir * H * 0.14, bodyY + H * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = thin;
    ctx.stroke();
    // Tấm che ngực — mẩu màu thứ hai ở phía trước, để cụm màu bộ lạc không dồn
    // hết vào một chỗ giữa thân.
    ctx.fillStyle = p.barding;
    ctx.beginPath();
    ctx.moveTo(cx + dir * H * 0.34, bodyY - H * 0.10);
    ctx.lineTo(cx + dir * H * 0.42, bodyY + H * 0.02);
    ctx.lineTo(cx + dir * H * 0.30, bodyY + H * 0.13);
    ctx.closePath();
    ctx.fill();
  }

  // ---- CỔ + ĐẦU ----
  // Cổ là một hình thang VÁT: rộng ở vai (0.30 cao), hẹp ở gáy (0.14). Đầu gãy
  // xuống một góc rõ so với cổ — không có cái góc đó thì cả cụm đọc ra là một cái
  // sừng chứ không phải một cái đầu.
  const nx = cx + dir * H * 0.30, ny = bodyY - H * 0.06;      // gốc cổ (vai)
  const cxTop = cx + dir * H * 0.52, cyTop = bodyY - H * 0.42; // gáy
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.moveTo(nx - dir * H * 0.04, ny - H * 0.12);
  ctx.quadraticCurveTo(cx + dir * H * 0.40, bodyY - H * 0.36, cxTop - dir * H * 0.05, cyTop);
  ctx.lineTo(cxTop + dir * H * 0.10, cyTop + H * 0.04);
  ctx.quadraticCurveTo(cx + dir * H * 0.46, bodyY - H * 0.18, nx + dir * H * 0.06, ny + H * 0.10);
  ctx.closePath();
  ctx.fill();
  // Đầu: một khối gãy về phía trước-xuống, kèm mõm hơi cụp.
  ctx.beginPath();
  ctx.moveTo(cxTop - dir * H * 0.06, cyTop - H * 0.02);
  ctx.lineTo(cxTop + dir * H * 0.20, cyTop - H * 0.05);
  ctx.lineTo(cxTop + dir * H * 0.26, cyTop + H * 0.09);
  ctx.lineTo(cxTop + dir * H * 0.10, cyTop + H * 0.13);
  ctx.closePath();
  ctx.fill();

  // ---- BỜM ----
  // Một dải răng cưa chạy dọc sống cổ. Đây là chi tiết rẻ nhất mà đóng góp nhiều
  // nhất: nó biến cái cổ hình thang thành cổ ngựa.
  ctx.strokeStyle = mane;
  ctx.lineWidth = Math.max(1.3, cs * 0.13);
  ctx.beginPath();
  ctx.moveTo(nx - dir * H * 0.05, ny - H * 0.13);
  ctx.quadraticCurveTo(cx + dir * H * 0.34, bodyY - H * 0.38, cxTop - dir * H * 0.02, cyTop - H * 0.01);
  ctx.stroke();

  // ---- ĐUÔI ---- cong, dày ở gốc, phất theo nhịp
  ctx.strokeStyle = mane;
  ctx.lineWidth = Math.max(1.4, cs * 0.15);
  ctx.beginPath();
  ctx.moveTo(cx - dir * H * 0.44, bodyY - H * 0.14);
  ctx.quadraticCurveTo(cx - dir * H * 0.60, bodyY - H * 0.02 + gait * H * 0.05,
                       cx - dir * H * 0.56, bodyY + H * 0.22 + gait * H * 0.06);
  ctx.stroke();

  // ---- CHI TIẾT ĐẦU ---- chỉ khi còn đọc được
  if (cs >= 5) {
    ctx.fillStyle = mane;                                   // tai
    ctx.beginPath();
    ctx.moveTo(cxTop - dir * H * 0.02, cyTop - H * 0.02);
    ctx.lineTo(cxTop + dir * H * 0.01, cyTop - H * 0.14);
    ctx.lineTo(cxTop + dir * H * 0.07, cyTop - H * 0.03);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#120e0a';                              // mắt
    ctx.beginPath();
    ctx.arc(cxTop + dir * H * 0.10, cyTop + H * 0.03, Math.max(0.8, H * 0.026), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.legDark;                              // mõm
    ctx.beginPath();
    ctx.ellipse(cxTop + dir * H * 0.23, cyTop + H * 0.07, H * 0.05, H * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Chỏm lông trên trán — dấu "ngựa của tướng", đọc được ở mọi mức zoom. Nhỏ và
  // thon: ở 0,26·H nó cao gần bằng cả cái đầu và đọc ra thành một cái sừng.
  if (p.plume) {
    ctx.fillStyle = p.plume;
    ctx.beginPath();
    ctx.moveTo(cxTop + dir * H * 0.03, cyTop - H * 0.03);
    ctx.lineTo(cxTop + dir * H * 0.02, cyTop - H * 0.17);
    ctx.lineTo(cxTop + dir * H * 0.10, cyTop - H * 0.05);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
}

// KỴ BINH — thân ngựa NẰM NGANG, người cưỡi nhô lên trên.
//
// Cả hai loại quân khác đều được vẽ theo TRỤC ĐỨNG (một thân người cao hơn rộng),
// nên thứ làm kỵ binh nhận ra được ngay từ mức zoom xa nhất không phải màu, không
// phải cỡ, mà là TRỤC: một khối nằm ngang giữa một đám khối đứng. Đó là lý do
// hàm này không đi qua nhánh vẽ chung ở drawUnit dù nó cũng chỉ là "người + vũ
// khí": chỉ cần vẽ đúng hình người rồi phóng to lên là ở 7 px/ô nó lại thành một
// người lính hơi to, và cả cơ chế kỵ binh biến mất khỏi màn hình.
//
// Bốn chân chạy theo pha riêng của từng con (u.id) — nếu cùng pha thì cả đội kỵ
// binh nhấp nhô như một, và mắt đọc ra một khối duy nhất chứ không phải một đàn.
function drawCavalry(u, tribe, cx, cy, px, py, cs) {
  // 1,3 -> 1,95 (×1,5). Người + ngựa là hai khối chồng lên nhau nên ở cỡ cũ, phần
  // NGƯỜI — thứ mang màu bộ lạc và cầm vũ khí — nhỏ hơn một người lính bộ đứng
  // cạnh, dù cả cụm thì rộng hơn. Mắt đọc kích cỡ theo chi tiết lớn nhất nhận ra
  // được, không theo đường bao, nên cỗ máy đắt gấp rưỡi bộ binh lại đọc ra là
  // nhỏ hơn. To hơn cũng đúng về luật: đây là đơn vị nặng nhất trên bộ.
  const S = cs * 1.95;
  const dir = u.facingX >= 0 ? 1 : -1;
  const ranged = u.type === 'horsearcher';
  drawShadow(cx, cy + cs * 0.52, S * 0.52, S * 0.19);

  const gait = Math.sin((aTick + u.id * 11) * 0.42);
  const bodyY = cy + S * 0.02;

  // Ngựa kỵ binh mang MÀU BỘ LẠC trên thân — khác ngựa của tướng (thân nâu, chỉ
  // tấm giáp mới mang màu). Lý do: kỵ binh đi thành đàn và thường là thứ duy nhất
  // trong khung hình đang di chuyển nhanh, nên "của phe nào" phải đọc được từ
  // chính cái khối lớn nhất; còn tướng thì đã có tên trên đầu và vòng sáng dưới chân.
  drawHorse(cx, bodyY, S, dir, gait, {
    hide: tribe.color, legDark: tribe.dark, mane: tribe.dark, barding: null, plume: null
  }, cs);

  // Người cưỡi — chỉ vẽ khi còn đọc được. Dưới ngưỡng này mấy nét người chỉ làm
  // bẩn cái silhouette ngang vốn đang làm tốt công việc nhận diện của nó.
  // Ngưỡng hạ 7 -> 5 theo cỡ mới: ở S = 1,95·cs thì người cưỡi ở cs 5 đã to bằng
  // người cưỡi ở cs 7 của bản cũ, nên giữ ngưỡng cũ là giấu đi một phần hình vẽ
  // vẫn còn đọc tốt.
  if (cs >= 5) {
    const ry = bodyY - S * 0.3;
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(cx - S * 0.1, ry - S * 0.16, S * 0.2, S * 0.34);
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, ry - S * 0.26, S * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(0.8, cs * 0.06); ctx.stroke();

    if (ranged) {
      // Cây cung dựng đứng phía trước — cùng ngôn ngữ hình với cung thủ bộ, nên
      // người xem không phải học thêm một ký hiệu nào để đọc ra "đây là quân bắn".
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1.1, cs * 0.08);
      ctx.beginPath();
      ctx.arc(cx + dir * S * 0.22, ry - S * 0.04, S * 0.28, -Math.PI * 0.5, Math.PI * 0.5, dir < 0);
      ctx.stroke();
    } else {
      // Thanh gươm chĩa tới trước, hếch lên. Vung theo swingAt như bộ binh (xem
      // drawBattleAxe) để cú chém đọc được chứ không chỉ là một cái que đứng yên.
      const sw = u.swingAt && aTick - u.swingAt < 10 ? (aTick - u.swingAt) / 10 : 1;
      const ang = -Math.PI * (0.15 + 0.35 * (1 - sw));
      ctx.strokeStyle = '#e8e2d2';
      ctx.lineWidth = Math.max(1.2, cs * 0.1);
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.12, ry);
      ctx.lineTo(cx + dir * (S * 0.12 + Math.cos(ang) * S * 0.5), ry + Math.sin(ang) * S * 0.5);
      ctx.stroke();
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.6, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// Máy bắn đá: khung gỗ trên hai bánh xe, cần bắn ngả về sau rồi bật lên khi khai
// hoả. Vẽ to gấp rưỡi người — nó chậm và ít, nên nếu vẽ đúng tỉ lệ thì người xem sẽ
// không bao giờ nhận ra cỗ máy đắt nhất trong đạo quân đang có mặt trên bản đồ.
// ============================================================
// KÍP VẬN HÀNH — người đứng bên khí tài (Phase 3.30)
// ============================================================
// Cho tới bản này, máy bắn đá và nỏ thần là hai vật thể TỰ ĐI, tự quay cần, tự
// bắn. Chú thích của chính drawCatapult đã gọi nó là "thứ duy nhất trên bản đồ
// cần cả một tổ vận hành" — mà trên màn hình thì không có ai ở đó. Một câu trong
// chú thích mà hình vẽ không nói ra thì với người xem nó không tồn tại.
//
// HAI người, và vị trí của họ mang thông tin chứ không phải trang trí:
//   · người ĐUÔI vẽ TRƯỚC thân máy nên bị khung xe che một phần — đó là thứ nói
//     rằng anh ta đứng PHÍA SAU, và nhờ vậy cỗ máy có chiều sâu thật;
//   · người ĐẦU vẽ SAU thân máy, đứng lệch về phía bắn.
// Cả hai cúi/ngửa theo `load` — cùng biến điều khiển cần bắn, nên kíp và máy
// không bao giờ lệch pha. Đây đúng nguyên tắc đã ghi ở drawCatapult: lấy pha từ
// cơ chế, không từ một đồng hồ hoạt ảnh riêng phải giữ cho khớp.
//
// Tỉ lệ: 0,46·S ≈ 1,0·cs, tức là ĐÚNG cỡ một người lính đứng cạnh. Vẽ nhỏ hơn thì
// họ thành mấy cái chấm, vẽ to hơn thì cỗ máy tụt xuống thành một cái xe kéo tay.
function drawCrewman(x, footY, h, tribe, lean, dir, cs) {
  if (cs < 4) return;                       // dưới cỡ này thì hai chấm chỉ làm bẩn hình
  // Đầu 0,135·h chứ không 0,17: ở bản đầu đường kính đầu (0,34·h) rộng hơn cả thân
  // (0,30·h), nên phóng to lên thì hai người trông như đồ chơi chứ không như một
  // kíp lính đang gò lưng quay tời. Thân nới lên 0,34 cho cân.
  const w = h * 0.34;
  const headR = h * 0.135;
  const hipY = footY - h * 0.42;
  const shoY = footY - h * 0.78;
  // Nghiêng người: `lean` 0 = đứng thẳng (vừa bắn xong), 1 = chồm tới nạp đạn.
  const tilt = dir * lean * h * 0.20;
  ctx.strokeStyle = '#2a2119';
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();                          // hai chân
  ctx.moveTo(x - w * 0.42, footY); ctx.lineTo(x - w * 0.10, hipY);
  ctx.moveTo(x + w * 0.46, footY); ctx.lineTo(x + w * 0.10, hipY);
  ctx.stroke();
  ctx.fillStyle = tribe.color;               // thân
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, hipY);
  ctx.lineTo(x - w * 0.42 + tilt, shoY);
  ctx.lineTo(x + w * 0.42 + tilt, shoY);
  ctx.lineTo(x + w * 0.5, hipY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tribe.dark; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.stroke();
  ctx.strokeStyle = '#2a2119';               // tay vươn về phía máy
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.beginPath();
  ctx.moveTo(x + tilt, shoY + h * 0.06);
  ctx.lineTo(x + dir * w * 0.85 + tilt * 1.6, shoY + h * (0.20 - lean * 0.10));
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#d8c39a';                 // đầu
  ctx.beginPath(); ctx.arc(x + tilt * 1.2, shoY - headR * 0.75, headR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = tribe.dark; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.stroke();
}

// ============================================================
// BA DẤU CẤP CỦA NHÁNH CÔNG THÀNH — dùng chung cho cả hai cỗ máy
// ============================================================
// Kích thước là tín hiệu chính của nhánh này (lý do đã ghi ở CONFIG.UPGRADE.LINES
// .siege) nhưng nó chỉ đọc được khi có MẪU ĐỐI CHỨNG — và hai cỗ máy của cùng một
// bộ lạc thì LUÔN cùng cấp, nên người xem không bao giờ thấy cấp 1 đứng cạnh cấp 3.
// Đúng cái bẫy Phase 3.14 đã bắt được với công trình lên đời, chỉ đổi chỗ: ở đó là
// màu, ở đây là kích thước, và cả hai đều cần một thứ mà màn hình không cung cấp.
// Nên mỗi cấp thêm một nét vào HÌNH BÓNG, ở ba chỗ KHÁC NHAU của sprite để một cỗ
// máy bị khuất nửa người sau căn nhà vẫn còn đọc được ít nhất một dấu:
//   cấp 1 — ĐAI SẮT   : vành bánh xe sáng + ba đai bọc ngang sàn xe (giữa, thấp)
//   cấp 2 — MỘC CHẮN  : tấm ván nghiêng che kíp phía trước (đầu xe, ngang tầm người)
//   cấp 3 — CỜ ĐUÔI NHEO: cán cờ dựng ở đuôi xe, cao hơn cả đầu người (đuôi, trên cao)
function siegeLevel(u) { const b = siegeOf(u); return b ? b.lv : 0; }

function drawSiegeBanner(tribe, x, footY, S, dir, cs, lv) {
  if (lv < 3 || cs < 4) return;
  const h = S * 0.86;
  // GỖ SÁNG, không phải nâu sẫm. Cán cờ chạy dọc ngay trên nền thân xe (cũng nâu
  // sẫm) nên bản đầu nó lẫn mất hoàn toàn: nhìn ra màn hình chỉ còn một lá cờ TRÔI
  // LƠ LỬNG cạnh cỗ máy, không có gì đỡ. Cùng bài học tương phản đã học ở dải màu
  // bộ lạc trên sàn xe — một chi tiết đúng vị trí mà cùng tông với nền thì bằng
  // không có.
  ctx.strokeStyle = '#a5826f';
  ctx.lineWidth = Math.max(1.4, cs * 0.10);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, footY); ctx.lineTo(x, footY - h); ctx.stroke();
  ctx.lineCap = 'butt';
  // Đuôi nheo phất theo `aTick` (đồng hồ THẬT) chứ không theo `tick` mô phỏng: lá
  // cờ phải bay cả khi người xem bấm tạm dừng — cùng lý do đã viết cho mây và mặt
  // nước, và cùng lý do một khung hình đứng chết đọc ra "treo rồi".
  const w = -dir * S * 0.44, wave = Math.sin(aTick * 0.09 + x) * S * 0.05;
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.moveTo(x, footY - h);
  ctx.lineTo(x + w, footY - h + S * 0.10 + wave);
  ctx.lineTo(x, footY - h + S * 0.26);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tribe.dark; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.stroke();
}

function drawSiegePavise(tribe, x, footY, S, dir, cs, lv) {
  if (lv < 2 || cs < 4) return;
  // GỖ, không phải một khối màu bộ lạc. Bản đầu tô trọn tấm ván bằng `tribe.color`
  // rồi kẻ ba đường ghép ván lên trên: ra màn hình nó thành ba THANH màu xếp chồng —
  // một cái thang dựng cạnh cỗ máy — và khối màu ấy còn to ngang cả dải màu trên sàn
  // xe, tức là hai chỗ cùng hét lên một thông tin. Ván gỗ + MỘT vạch màu vắt ngang
  // dùng lại đúng ngôn ngữ của sàn xe: nền là vật liệu, vạch là phe.
  const h = S * 0.42, hw = S * 0.075, lean = dir * S * 0.07;
  // THANH CHỐNG nối tấm ván ngược về sàn xe, vẽ TRƯỚC nên bị chính tấm ván che một
  // nửa. Bản đầu không có nó và tấm ván đọc ra là một mảnh gỗ ai đó dựng cạnh cỗ
  // máy — cùng một hình, cùng một chỗ, chỉ thiếu đúng thứ NỐI nó vào vật chủ.
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.2, cs * 0.09);
  ctx.beginPath();
  ctx.moveTo(x - dir * S * 0.24, footY - S * 0.05);
  ctx.lineTo(x + lean * 0.5, footY - h * 0.6);
  ctx.stroke();
  const quad = (t0, t1) => {                         // dải ngang của tấm ván, theo độ cao
    ctx.beginPath();
    ctx.moveTo(x - hw + lean * t0, footY - h * t0);
    ctx.lineTo(x - hw + lean * t1, footY - h * t1);
    ctx.lineTo(x + hw + lean * t1, footY - h * t1);
    ctx.lineTo(x + hw + lean * t0, footY - h * t0);
    ctx.closePath();
  };
  ctx.fillStyle = '#8d6e63'; quad(0, 1); ctx.fill();  // ván gỗ
  ctx.fillStyle = tribe.color; quad(0.42, 0.68); ctx.fill();   // vạch màu phe
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = Math.max(1, cs * 0.07);
  quad(0, 1); ctx.stroke();
}

// Ba đai dọc bọc sàn xe. Nhận thẳng hình chữ nhật của sàn chứ không tự tính lại từ
// S: hai cỗ máy có sàn rộng khác nhau (0,92·S và 0,84·S), và một hàm tự đoán lại
// kích thước của hình mà nó vẽ đè lên là đúng cái "hai nguồn sự thật" đã cắn nhiều lần.
function drawSiegeBands(x0, y0, w, h, cs, lv) {
  if (lv < 1 || cs < 5) return;
  ctx.strokeStyle = '#59616a';
  ctx.lineWidth = Math.max(1, cs * 0.08);
  ctx.beginPath();
  for (let k = -1; k <= 1; k++) {
    const x = x0 + w * (0.5 + k * 0.30);
    ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h);
  }
  ctx.stroke();
}

function drawCatapult(u, tribe, cx, cy, px, py, cs) {
  // 1,35 -> 2,15 (3.19) -> 2,75 (3.31) -> 2,15 (3.32, quay lại đúng con số của 3.19).
  //
  // Vì sao lùi lại: 3.31 nâng cỡ CÙNG LÚC với việc cho nhánh Công thành cộng
  // +26%/cấp vào chính con số này, nên hai lần phóng to NHÂN với nhau chứ không
  // cộng — cỗ máy cấp 3 rộng 4,89 ô, bằng trọn chân đế Kỳ quan, và ở mức thu phóng
  // chơi thật (9 px/ô) nó che mất chính cái nó đang bắn. Một khí tài công thành
  // phải ĐỌC RA là to; nó không được phép nuốt mất khung hình quanh nó.
  //
  // 2,15 vẫn giữ nguyên điều mà 3.19 mua được: cỗ máy đắt nhất cây quân sự (150 gỗ
  // + 80 vàng + 70 đá, 195 tick lò, 2,5 suất nuôi, và từ 3.30 còn ăn một dân
  // thường) không còn nhìn ra như một món đồ chơi nhỉnh hơn người lính 35%. Nó
  // KHÔNG còn là sprite lớn nhất nhóm quân ở cấp 0 — voi chiến (2,6) lấy lại chỗ
  // đó — nhưng thứ tự ấy vẫn đọc đúng: một cỗ máy đã ăn trọn ba cấp của nhánh
  // nghiên cứu đắt nhất bảng thì lên 3,05 ô và vượt con voi, còn một cỗ máy vừa ra
  // lò thì chưa.
  // `effScale` — nhánh CÔNG THÀNH vẫn làm cỗ máy TO RA THẬT, nhưng +14% mỗi cấp
  // chứ không +26% (xem CONFIG.UPGRADE.LINES.siege): cấp 3 là +42% -> 3,05 ô.
  const S = cs * 2.15 * effScale(u);
  const lv = siegeLevel(u);
  // BÓNG ĐỔ neo theo S chứ không theo cs. Bản cũ để `cy + cs*0,55` và nó đúng một
  // cách tình cờ khi S ≈ 2,15·cs (trục bánh xe rơi vào cy + 0,82·cs, lệch nửa ô thì
  // mắt bỏ qua). Ở 3.31, một cỗ máy cấp 3 có S = 4,9·cs nên trục bánh xe tụt xuống
  // cy + 1,86·cs, còn cái bóng vẫn nằm ở 0,55·cs — nhìn ra màn hình là một vũng tối
  // lơ lửng NGANG BỤNG cỗ máy. Đây là họ lỗi "hằng số neo vào ô lưới" của Phase
  // 3.19 lần nữa, và nó chỉ lộ ra khi sprite đủ to; ở cỡ cũ nó đã sai sẵn rồi.
  drawShadow(cx, cy + S * 0.40, S * 0.52, S * 0.19);

  // Cần bắn: gập lại ngay sau khi bắn (cooldown gần đầy) rồi từ từ ngả về tư thế
  // sẵn sàng. Đọc từ chính u.cooldown nên hoạt ảnh KHÔNG BAO GIỜ lệch pha với cơ
  // chế — không cần thêm một biến hoạt ảnh riêng để rồi phải giữ cho hai bên khớp.
  const load = u.atkCooldown ? clamp(1 - u.cooldown / u.atkCooldown, 0, 1) : 1;
  const dir = u.facingX >= 0 ? 1 : -1;
  const baseY = cy + S * 0.16;                  // trục bánh xe
  const dark = '#3a2418', wood = '#8d6e63', woodHi = '#a5826f';

  // ---- CỜ ĐUÔI NHEO (cấp 3) ---- vẽ TRƯỚC mọi thứ: cán cờ cắm ở mép sau sàn xe
  // nên phần chân nó phải bị chính sàn xe che, đúng cùng thủ thuật che-để-nói-chiều-sâu
  // đã dùng cho người vận hành phía đuôi.
  drawSiegeBanner(tribe, cx - dir * S * 0.44, baseY + S * 0.26, S, dir, cs, lv);

  // ---- BÁNH XE (vẽ trước, nằm sau khung) ----
  // Có NAN HOA. Ở cỡ cũ hai bánh chỉ là hai chấm nâu; ở cỡ này nan hoa đọc được,
  // và nan hoa là thứ nói "đây là cỗ xe" nhanh hơn bất cứ chi tiết nào khác.
  for (const off of [-0.34, 0.30]) {
    const wx = cx + S * off, wy = baseY + S * 0.22, wr = S * 0.20;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
    if (lv >= 1) {                             // VÀNH SẮT — dấu cấp 1
      ctx.strokeStyle = '#7d868f';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath(); ctx.arc(wx, wy, wr * 0.9, 0, Math.PI * 2); ctx.stroke();
    }
    if (cs >= 5) {
      ctx.strokeStyle = woodHi;
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      // Nan quay theo quãng đường đã đi -> đứng yên thì bánh đứng yên. Lấy pha từ
      // toạ độ chứ không từ aTick: một cỗ máy đang đứng bắn mà bánh vẫn quay tít
      // là chi tiết sai mà mắt bắt được ngay dù không nói ra được sai ở đâu.
      const ph = (u.x + u.y) * 0.9;
      for (let k = 0; k < 3; k++) {
        const a = ph + k * Math.PI / 3;
        ctx.moveTo(wx - Math.cos(a) * wr * 0.82, wy - Math.sin(a) * wr * 0.82);
        ctx.lineTo(wx + Math.cos(a) * wr * 0.82, wy + Math.sin(a) * wr * 0.82);
      }
      ctx.stroke();
    }
    ctx.fillStyle = tribe.dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr * 0.34, 0, Math.PI * 2); ctx.fill();
  }

  // ---- KÍP VẬN HÀNH (người ĐUÔI) ---- vẽ TRƯỚC khung xe để bị che một phần.
  // Xem drawCrewman: chính chỗ bị che là thứ nói rằng anh ta đứng phía sau máy.
  drawCrewman(cx - dir * S * 0.60, baseY + S * 0.40, S * 0.46, tribe, 1 - load, dir, cs);

  // ---- KHUNG GỖ ---- sàn xe + hai thanh chống chữ A đỡ trục cần bắn.
  ctx.fillStyle = wood;
  ctx.fillRect(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.22);
  // DẢI MÀU BỘ LẠC chạy hết bề ngang. Bản đầu để khung nâu sẫm với một mẩu màu bé
  // xíu ở giữa: ở mức zoom chơi thật (6-10 px/ô) nó ra đúng một chấm nâu, không
  // đọc được của phe nào — mà "máy bắn đá của ai đang bò tới thành mình" là thông
  // tin đắt nhất trên bản đồ ở giai đoạn đó.
  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.09);
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, cs * 0.08);
  ctx.strokeRect(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.22);
  drawSiegeBands(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.22, cs, lv);

  const pivX = cx - dir * S * 0.06, pivY = baseY - S * 0.30;
  ctx.strokeStyle = wood;
  ctx.lineWidth = Math.max(1.4, cs * 0.13);
  ctx.beginPath();                                  // hai thanh chống chữ A
  ctx.moveTo(pivX - S * 0.20, baseY - S * 0.02); ctx.lineTo(pivX, pivY);
  ctx.moveTo(pivX + S * 0.20, baseY - S * 0.02); ctx.lineTo(pivX, pivY);
  ctx.stroke();
  // Dây thừng xoắn ở trục — nguồn lực của cỗ máy, và là chi tiết khiến nó đọc ra
  // "máy" chứ không phải "cái cần câu gắn lên xe".
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.6, cs * 0.15);
  ctx.beginPath(); ctx.arc(pivX, pivY, S * 0.07, 0, Math.PI * 2); ctx.stroke();

  // ---- CẦN BẮN + GÀU ----
  const armA = -Math.PI * (0.16 + 0.52 * load);
  const tipX = pivX + dir * Math.cos(armA) * S * 0.66;
  const tipY = pivY + Math.sin(armA) * S * 0.66;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#c9bda2';
  ctx.lineWidth = Math.max(1.8, cs * 0.16);
  ctx.beginPath();
  ctx.moveTo(pivX - dir * Math.cos(armA) * S * 0.16, pivY - Math.sin(armA) * S * 0.16);  // đuôi cần (đối trọng)
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = dark;                              // đối trọng
  ctx.beginPath();
  ctx.arc(pivX - dir * Math.cos(armA) * S * 0.19, pivY - Math.sin(armA) * S * 0.19, S * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Gàu ở đầu cần: một cái chén hở miệng, không phải một cái chấm.
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.2, cs * 0.1);
  ctx.beginPath();
  ctx.arc(tipX, tipY, S * 0.13, armA - Math.PI * 0.15, armA + Math.PI * 1.15);
  ctx.stroke();
  ctx.lineCap = 'butt';
  if (load > 0.8) {                                  // hòn đá đã nạp
    ctx.fillStyle = '#8c8f89';
    ctx.beginPath(); ctx.arc(tipX, tipY, S * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5f6360'; ctx.lineWidth = 1; ctx.stroke();
  }
  // ---- KÍP VẬN HÀNH (người ĐẦU) ---- vẽ SAU thân máy, đứng lệch về phía bắn.
  drawCrewman(cx + dir * S * 0.56, baseY + S * 0.42, S * 0.44, tribe, load, -dir, cs);
  // ---- MỘC CHẮN (cấp 2) ---- vẽ SAU cả người: tấm ván đứng CHE anh ta tới ngang
  // ngực, và chính chỗ bị che là thứ nói ra công dụng của nó. Cao 0,52·S chứ không
  // cao hơn — che hết cả đầu thì mất luôn người, mà mất người thì mất cái mẫu đối
  // chứng duy nhất cho biết cỗ máy này to tới đâu.
  drawSiegePavise(tribe, cx + dir * S * 0.66, baseY + S * 0.42, S, dir, cs, lv);

  if (u.hp < u.maxHp) {
    const w = S * 0.8, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// NỎ THẦN — cùng bộ khung với máy bắn đá, ngược hẳn về ĐƯỜNG NÉT
// ============================================================
// Hai cỗ máy ra lò từ cùng một Xưởng thợ nên chúng phải trông CÙNG HỌ (cùng bánh
// xe nan hoa, cùng sàn gỗ, cùng dải màu bộ lạc chạy ngang). Nhưng chúng trả lời hai
// câu hỏi khác nhau, nên hình bóng phải khác nhau ở một nét đọc được từ xa:
//   · máy bắn đá — CẦN BẮN CHĨA LÊN TRỜI. Đường cong, đạn bay vòng cầu.
//   · nỏ thần    — CÁNH NỎ NẰM NGANG. Hai vạch thẳng vuông góc nhau, đạn bay thẳng.
// Đứng - nằm là cặp đối lập mà mắt phân biệt được nhanh nhất, kể cả ở tám điểm ảnh,
// và nó cũng ĐÚNG với cơ chế: một cái bắn cầu vồng qua đầu quân nhà, một cái bắn
// xuyên theo đường thẳng.
function drawBallista(u, tribe, cx, cy, px, py, cs) {
  // 1,95 -> 2,45 (3.31) -> 1,95 (3.32). Lùi cùng nhịp với máy bắn đá và cùng một lý
  // do (xem drawCatapult): hai cỗ máy chung nhánh nghiên cứu nên chúng phải chung cả
  // hệ số phóng to, nếu không thì một lần chỉnh cỡ sẽ lặng lẽ đảo tương quan giữa
  // chúng. Khoảng cách 2,15 / 1,95 giữ nguyên điều cần nói: nỏ thần là cỗ máy CHÍNH
  // XÁC, máy bắn đá là cỗ máy NẶNG.
  const S = cs * 1.95 * effScale(u);
  drawShadow(cx, cy + S * 0.38, S * 0.48, S * 0.18);   // neo theo S — xem drawCatapult
  const dir = u.facingX >= 0 ? 1 : -1;
  const baseY = cy + S * 0.18;
  const lv = siegeLevel(u);
  const dark = '#3a2418', wood = '#8d6e63', woodHi = '#a5826f';
  // Dây nỏ kéo căng dần theo hồi chiêu — cùng nguồn `u.cooldown` với cần bắn của
  // máy bắn đá, nên hoạt ảnh không thể lệch pha với cơ chế.
  const load = u.atkCooldown ? clamp(1 - u.cooldown / u.atkCooldown, 0, 1) : 1;

  // ---- CỜ ĐUÔI NHEO (cấp 3) ---- xem drawCatapult: vẽ trước để sàn xe che chân cán.
  drawSiegeBanner(tribe, cx - dir * S * 0.40, baseY + S * 0.24, S, dir, cs, lv);

  // ---- BÁNH XE (hai bánh, cùng ngôn ngữ hình với máy bắn đá) ----
  for (const off of [-0.30, 0.26]) {
    const wx = cx + S * off, wy = baseY + S * 0.20, wr = S * 0.17;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
    if (lv >= 1) {                             // VÀNH SẮT — dấu cấp 1
      ctx.strokeStyle = '#7d868f';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath(); ctx.arc(wx, wy, wr * 0.9, 0, Math.PI * 2); ctx.stroke();
    }
    if (cs >= 5) {
      ctx.strokeStyle = woodHi;
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      const ph = (u.x + u.y) * 0.9;
      for (let k = 0; k < 3; k++) {
        const a = ph + k * Math.PI / 3;
        ctx.moveTo(wx - Math.cos(a) * wr * 0.82, wy - Math.sin(a) * wr * 0.82);
        ctx.lineTo(wx + Math.cos(a) * wr * 0.82, wy + Math.sin(a) * wr * 0.82);
      }
      ctx.stroke();
    }
    ctx.fillStyle = tribe.dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr * 0.34, 0, Math.PI * 2); ctx.fill();
  }

  // ---- KÍP VẬN HÀNH (người ĐUÔI) ---- vẽ TRƯỚC sàn xe, xem drawCrewman.
  drawCrewman(cx - dir * S * 0.58, baseY + S * 0.38, S * 0.48, tribe, 1 - load, dir, cs);

  // ---- SÀN XE + dải màu bộ lạc ----
  ctx.fillStyle = wood;
  ctx.fillRect(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.20);
  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.08);
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, cs * 0.08);
  ctx.strokeRect(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.20);
  drawSiegeBands(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.20, cs, lv);

  // ---- TRỤ XOAY + MÁNG NGẮM ----
  // Máng nằm NGANG, chĩa theo hướng nhìn: đây là nét định danh của cả cỗ máy.
  const pivX = cx - dir * S * 0.10, pivY = baseY - S * 0.26;
  ctx.strokeStyle = wood;
  ctx.lineWidth = Math.max(1.4, cs * 0.12);
  ctx.beginPath();
  ctx.moveTo(pivX, baseY - S * 0.02); ctx.lineTo(pivX, pivY);
  ctx.stroke();
  ctx.fillStyle = '#c9bda2';
  ctx.fillRect(pivX - (dir < 0 ? S * 0.72 : 0), pivY - S * 0.05, S * 0.72, Math.max(1.4, S * 0.10));

  // ---- CÁNH NỎ ---- hai cánh cong ngược, vuông góc với máng.
  const bowX = pivX + dir * S * 0.30;
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.4, cs * 0.11);
  ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bowX, pivY);
    ctx.quadraticCurveTo(bowX + dir * S * 0.10, pivY + sgn * S * 0.22,
                         bowX - dir * S * 0.04, pivY + sgn * S * 0.40);
    ctx.stroke();
  }
  // DÂY NỎ: kéo về sau khi đang nạp, bật thẳng khi vừa bắn. Khoảng cách giữa dây
  // và cánh nỏ là toàn bộ hoạt ảnh của cỗ máy này — không có nó thì nó là một vật
  // tĩnh, và một vũ khí tĩnh trông như một mảnh xác tàu.
  const draw = (1 - load) * S * 0.30;
  ctx.strokeStyle = '#e8e2d2';
  ctx.lineWidth = Math.max(0.9, cs * 0.055);
  ctx.beginPath();
  ctx.moveTo(bowX - dir * S * 0.04, pivY - S * 0.40);
  ctx.lineTo(bowX - dir * draw, pivY);
  ctx.lineTo(bowX - dir * S * 0.04, pivY + S * 0.40);
  ctx.stroke();
  // Mũi lao đã lắp: một tam giác dài, chĩa đúng hướng bắn.
  if (load > 0.45) {
    ctx.fillStyle = '#d7ccb4';
    ctx.beginPath();
    ctx.moveTo(bowX + dir * S * 0.30, pivY);
    ctx.lineTo(bowX - dir * S * 0.16, pivY - S * 0.055);
    ctx.lineTo(bowX - dir * S * 0.16, pivY + S * 0.055);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
  // ---- KÍP VẬN HÀNH (người ĐẦU) ---- vẽ SAU thân máy, đứng lệch về phía bắn.
  drawCrewman(cx + dir * S * 0.54, baseY + S * 0.40, S * 0.44, tribe, load, -dir, cs);
  // ---- MỘC CHẮN (cấp 2) ---- xem drawCatapult.
  drawSiegePavise(tribe, cx + dir * S * 0.64, baseY + S * 0.40, S, dir, cs, lv);

  if (u.hp < u.maxHp) {
    const w = S * 0.8, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// VOI CHIẾN — sprite lớn nhất trong nhóm quân, và nó PHẢI lớn nhất
// ============================================================
// Vẽ 2,6·cs, hơn cả máy bắn đá (2,15) và ngựa kỵ binh (1,95). Đây không phải
// chuyện phô trương: động từ của con voi là GIẪM ĐẠP MỌI THỨ NÓ ĐI QUA trong bán
// kính 1,9 ô, và người xem chỉ đọc ra được cơ chế đó nếu cái bóng của nó TRÔNG như
// nó phủ ngần ấy chỗ. Một con voi vẽ bằng người lính thì cú giẫm đọc ra là "mấy
// người quanh đó tự nhiên mất máu" — tức là đọc ra một lỗi, không phải một cơ chế.
// Cùng lý lẽ đã viết khi máy bắn đá được phóng từ 1,35 lên 2,15.
function drawElephant(u, tribe, cx, cy, px, py, cs) {
  const S = cs * 2.6;
  const dir = u.facingX >= 0 ? 1 : -1;
  drawShadow(cx, cy + cs * 0.6, S * 0.46, S * 0.17);
  // Nhịp bước: voi lắc chậm và nặng. Chu kỳ dài gần gấp đôi ngựa (0,10 so với
  // 0,19 ở drawHorse) — dáng đi là thứ nói "nặng" trước cả kích thước.
  const moving = unitStride(u) > 0;
  const gait = moving ? Math.sin(aTick * 0.10 + u.id) : 0;
  const bob = gait * S * 0.022;
  // Thân nâng CAO hẳn so với bản đầu (-0,06·S -> -0,22·S). Bản đầu để thân sà
  // xuống nên bốn cái chân chỉ còn thò ra 0,29·cs — nhìn ra màn hình con voi là
  // một cục xám không chân, và "khối nặng có bốn cột chống" mới là thứ nói ra
  // rằng nó GIẪM được. Đây là cùng bài học kích thước ở máy bắn đá, nhưng về
  // TỈ LỆ TRONG sprite chứ không về tổng kích thước.
  const bodyY = cy - S * 0.22 + bob;
  const footY = cy + cs * 0.55;

  const hide = '#6e6a66', hideDark = '#514e4b', hideHi = '#87827c';

  // ---- BỐN CHÂN CỘT ---- hai cặp lệch pha, dày và thẳng đứng.
  ctx.fillStyle = hideDark;
  const legW = S * 0.11, legTop = bodyY + S * 0.10;
  for (const [ox, ph] of [[-0.24, 0], [-0.09, Math.PI], [0.12, Math.PI], [0.26, 0]]) {
    const sw = moving ? Math.sin(aTick * 0.10 + u.id + ph) * S * 0.045 : 0;
    ctx.fillRect(cx + S * ox - legW / 2 + sw, legTop, legW, footY - legTop);
    // Bàn chân bè ra: một gạch ngang dày ở đáy mỗi cột. Không có nó thì bốn cái
    // chân là bốn hình chữ nhật cụt, và con voi trông như đang đứng trên cà kheo.
    ctx.fillRect(cx + S * ox - legW * 0.78 + sw, footY - S * 0.045, legW * 1.56, S * 0.045);
  }

  // ---- THÂN ---- một khối bầu dục lớn, đây là mảng màu chính.
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, S * 0.38, S * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hideHi;                       // vệt sáng lưng
  ctx.beginPath();
  ctx.ellipse(cx - dir * S * 0.05, bodyY - S * 0.10, S * 0.26, S * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // ĐUÔI: một nét mảnh phía sau. Rẻ, và nó cho cái khối một ĐẦU và một ĐUÔI —
  // thiếu nó thì ở cỡ nhỏ con voi đối xứng và mắt không đọc ra nó đang quay hướng nào.
  ctx.strokeStyle = hideDark;
  ctx.lineWidth = Math.max(1, S * 0.035);
  ctx.beginPath();
  ctx.moveTo(cx - dir * S * 0.36, bodyY - S * 0.04);
  ctx.quadraticCurveTo(cx - dir * S * 0.46, bodyY + S * 0.06, cx - dir * S * 0.42, bodyY + S * 0.20);
  ctx.stroke();

  // ---- ĐẦU + TAI + VÒI + NGÀ ---- bốn nét định danh, thứ tự vẽ là một quyết định:
  // tai (sau) -> đầu -> NGÀ -> VÒI (trước cùng). Bản đầu vẽ vòi trước rồi ngà đè
  // lên, và vì hai cái ngà chỉ lệch nhau 0,03·S nên chúng chồng thành MỘT vạch
  // trắng dày nằm ngang che kín cả cái vòi — con voi ra hình một khối xám cắm một
  // que trắng. Ngà phải mảnh, phải TÁCH XA nhau, và phải nằm DƯỚI cái vòi.
  const hx = cx + dir * S * 0.36, hy = bodyY + S * 0.06;
  // TAI: cái đĩa lớn phía sau đầu. Nét đọc-ra-voi nhanh nhất ở cỡ nhỏ, nhanh hơn
  // cả cái vòi — vì nó là một MẢNG, còn vòi chỉ là một đường.
  ctx.fillStyle = hideDark;
  ctx.beginPath();
  ctx.ellipse(hx - dir * S * 0.11, hy - S * 0.03, S * 0.145, S * 0.175, dir * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(hx, hy, S * 0.155, S * 0.175, 0, 0, Math.PI * 2);
  ctx.fill();

  if (cs >= 5) {
    const stomp = u.trampledAt && aTick - u.trampledAt < 14
      ? 1 - (aTick - u.trampledAt) / 14 : 0;
    // NGÀ — mảnh, cong, và tách hẳn nhau: một cái chìa cao, một cái chìa thấp.
    // Hai đường KHÔNG song song là thứ cho cặp ngà chiều sâu ở một sprite phẳng.
    ctx.strokeStyle = '#e6dfcc';
    ctx.lineCap = 'round';
    for (const [drop, len, w] of [[0.02, 0.26, 0.032], [0.09, 0.22, 0.028]]) {
      ctx.lineWidth = Math.max(1, S * w);
      ctx.beginPath();
      ctx.moveTo(hx + dir * S * 0.09, hy + S * (0.06 + drop));
      ctx.quadraticCurveTo(hx + dir * S * (0.09 + len * 0.7), hy + S * (0.12 + drop),
                           hx + dir * S * (0.09 + len), hy + S * (0.04 + drop));
      ctx.stroke();
    }
    // VÒI — vẽ SAU CÙNG nên nó nằm trước cặp ngà, đúng như thật. Buông cong xuống
    // gần tới đất rồi hất lên ở mũi; vung mạnh hơn hẳn khi vừa giẫm ai đó. Hoạt
    // ảnh đọc từ `trampledAt` (đặt trong tickSoldier) nên nó chỉ động đúng lúc cơ
    // chế thật sự chạy, không phải một chuyển động trang trí chạy suốt.
    ctx.strokeStyle = hide;
    ctx.lineWidth = Math.max(1.8, S * 0.085);
    ctx.beginPath();
    ctx.moveTo(hx + dir * S * 0.10, hy + S * 0.02);
    ctx.quadraticCurveTo(hx + dir * S * (0.26 + stomp * 0.06), hy + S * (0.30 - stomp * 0.22),
                         hx + dir * S * (0.30 + stomp * 0.10), hy + S * (0.10 - stomp * 0.34));
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Mắt: một chấm sẫm trên nền xám nhạt của đầu. Nhỏ nhưng nó là thứ biến cái
    // khối thành một con vật.
    ctx.fillStyle = '#241c16';
    ctx.beginPath();
    ctx.arc(hx + dir * S * 0.06, hy - S * 0.07, Math.max(0.9, S * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- BÀNH + CỜ BỘ LẠC ---- màu phe nằm ở ĐÂY, trên lưng, chỗ cao nhất và
  // không bị chân che. Con voi màu xám nên nếu không có tấm bành này thì hai bộ
  // lạc có voi trông y hệt nhau — mà "voi của ai" là thông tin đắt nhất lúc đó.
  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - S * 0.21, bodyY - S * 0.28, S * 0.42, S * 0.16);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(cx - S * 0.21, bodyY - S * 0.14, S * 0.42, Math.max(0.8, S * 0.035));
  if (cs >= 6) {
    ctx.strokeStyle = tribe.dark;                 // khung bành
    ctx.lineWidth = Math.max(0.9, S * 0.03);
    ctx.strokeRect(cx - S * 0.21, bodyY - S * 0.28, S * 0.42, S * 0.16);
    // Người quản tượng: đầu + thân nhỏ ngồi trên bành. Hai hình chứ không một
    // chấm — một chấm đơn độc trên nóc đọc ra là một cái núm, không ra một người.
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(cx + dir * S * 0.02, bodyY - S * 0.40, S * 0.09, S * 0.13);
    ctx.fillStyle = '#e8dcc2';
    ctx.beginPath();
    ctx.arc(cx + dir * S * 0.065, bodyY - S * 0.44, Math.max(1, S * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- BỤI DƯỚI CHÂN khi đang giẫm ---- hình ảnh của cú giẫm nằm ở đây, KHÔNG ở
  // FX: một con voi giữa đám đông gây sát thương cho mọi người mỗi tick, nên nếu
  // mỗi nạn nhân nháy một chùm tia thì ngân sách FX_MAX (400) cháy trong ba tick
  // và mọi hiệu ứng khác trên bản đồ biến mất. Xem chú thích ở khối trample.
  if (u.trampledAt && aTick - u.trampledAt < 16 && cs >= 5) {
    const k = 1 - (aTick - u.trampledAt) / 16;
    ctx.fillStyle = `rgba(150,134,106,${(k * 0.4).toFixed(3)})`;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + u.id;
      const rr = S * (0.30 + (1 - k) * 0.28);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + cs * 0.5 + Math.sin(a) * rr * 0.34,
              S * 0.07 * k + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.9, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// QUÂN KỲ — người nhỏ, lá cờ to
// ============================================================
// Tỉ lệ cố ý ngược với mọi đơn vị khác: thân người vẽ đúng cỡ bộ binh, còn lá cờ
// cao gần bằng cả cái sprite. Lý do là nó phải đọc được TỪ XA trong lúc đứng lẫn
// giữa ba chục người — mà thứ duy nhất của nó khác người thường là lá cờ, nên toàn
// bộ ngân sách hình ảnh dồn vào đó.
//
// Cờ PHẤT theo aTick chứ không đứng yên: một lá cờ tĩnh trông như một cây gậy có
// miếng vải dính vào. Sóng cờ cũng là thứ duy nhất trên chiến trường chuyển động
// khi mọi thứ khác đứng chờ, nên mắt tự tìm tới nó — đúng chỗ ta muốn mắt nhìn.
function drawStandard(u, tribe, cx, cy, px, py, cs) {
  const S = cs * 1.5;
  const dir = u.facingX >= 0 ? 1 : -1;
  drawShadow(cx, cy + cs * 0.5, cs * 0.36, cs * 0.15);
  // `unitStride` là BIÊN ĐỘ sải chân, còn pha thì truyền riêng — cùng cách gọi với
  // bộ binh ở drawUnit. Trộn hai thứ đó vào một tham số (truyền thẳng một giá trị
  // sin vào ô biên độ) thì chân co giật thay vì bước đều, và lá cờ sẽ đi một kiểu
  // khác với cả hàng quân mà nó đang đứng cùng.
  const amp = unitStride(u);
  const phase = (aTick + u.id * 11) * 0.3;
  const bob = amp > 0 ? Math.abs(Math.sin(phase)) * cs * 0.06 : 0;
  const bodyY = cy - bob;

  // ---- CÁN CỜ ---- dựng hơi nghiêng về sau, như người vác.
  const poleX = cx - dir * S * 0.16;
  const poleTop = bodyY - S * 1.05;
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.1, cs * 0.09);
  ctx.beginPath();
  ctx.moveTo(poleX + dir * S * 0.05, bodyY + S * 0.30);
  ctx.lineTo(poleX, poleTop);
  ctx.stroke();

  // ---- LÁ CỜ ---- ba đoạn sóng, biên độ tăng dần về phía đuôi cờ. Vẽ bằng một
  // đường cong khép kín chứ không phải hình chữ nhật: chữ nhật không bao giờ trông
  // như vải, dù có nghiêng bao nhiêu.
  const w = S * 0.62, h = S * 0.44;
  const ph = aTick * 0.11 + u.id;
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.moveTo(poleX, poleTop);
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    ctx.lineTo(poleX + dir * w * t, poleTop + Math.sin(ph + t * 3.4) * S * 0.05 * t);
  }
  for (let i = 4; i >= 0; i--) {
    const t = i / 4;
    ctx.lineTo(poleX + dir * w * t, poleTop + h + Math.sin(ph + t * 3.4) * S * 0.07 * t);
  }
  ctx.closePath(); ctx.fill();
  // Viền tối phía dưới + một vệt sáng: cho lá vải có mặt sáng mặt tối, tức là có
  // hướng gió. Thiếu nó thì cờ là một mảng màu phẳng.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(poleX, poleTop + h * 0.72, dir * w, h * 0.28);
  if (cs >= 7) {
    // Con dấu bộ lạc giữa cờ — cùng ký hiệu với con dấu trên kinh đô (xem
    // drawCapitalSeal), nên người xem không phải học thêm một biểu tượng nào.
    ctx.fillStyle = tribe.dark;
    ctx.beginPath();
    ctx.arc(poleX + dir * w * 0.45, poleTop + h * 0.42, S * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  // Chóp cán: một mũi nhọn nhỏ, để cây cờ có điểm kết thúc.
  ctx.fillStyle = '#d8a544';
  ctx.beginPath();
  ctx.moveTo(poleX, poleTop - S * 0.13);
  ctx.lineTo(poleX - S * 0.05, poleTop);
  ctx.lineTo(poleX + S * 0.05, poleTop);
  ctx.closePath(); ctx.fill();

  // ---- NGƯỜI VÁC ---- cỡ bộ binh, dùng lại drawLegs để dáng đi khớp với cả hàng.
  drawLegs(cx, bodyY + S * 0.14, cy + cs * 0.5, cs, cs * 0.13, amp, phase, tribe.dark);
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, cs * 0.22, cs * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8dcc2';                       // đầu
  ctx.beginPath();
  ctx.arc(cx, bodyY - cs * 0.36, cs * 0.17, 0, Math.PI * 2);
  ctx.fill();

  // ---- HÀO QUANG CỔ VŨ ---- một vòng cung mảnh dưới chân, đập theo nhịp. Nó là
  // thứ DUY NHẤT nói ra rằng lá cờ đang có tác dụng, và bán kính vẽ đúng bằng
  // `u.rallyR` thật — vẽ sai bán kính thì người xem học sai luật chơi, và một cơ
  // chế mà mắt không kiểm chứng được thì nó là phép thuật (xem chú thích thầy lang).
  if (cs >= 5 && u.rallyR > 0) {
    const p = 0.16 + 0.10 * Math.sin(aTick * 0.06 + u.id);
    ctx.strokeStyle = `rgba(216,165,68,${p.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.07);
    ctx.beginPath();
    ctx.ellipse(cx, cy + cs * 0.45, u.rallyR * cs, u.rallyR * cs * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (u.hp < u.maxHp) {
    const w2 = cs * 1.4, h2 = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w2 / 2, py + cs + 1, w2, h2);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w2 / 2, py + cs + 1, w2 * r, h2);
  }
}

// Anh hùng vẽ to hơn hẳn, có áo choàng, mũ chóp, và LUÔN có tên trên đầu. Trong
// một khung hình có hơn hai trăm chấm màu đang di chuyển, thứ duy nhất biến một
// đơn vị thành "nhân vật" là việc người xem gọi được tên nó.
// Ngựa của anh hùng. To hơn ngựa kỵ binh và mang bộ giáp ngựa màu bộ lạc — khi
// một anh hùng cưỡi ngựa đi cạnh một đội kỵ binh, phải đọc ra ngay ai là tướng.
function drawWarHorse(u, tribe, cx, cy, cs, S) {
  const dir = u.facingX >= 0 ? 1 : -1;
  // 1,15 -> 1,62. Ngựa tướng PHẢI to hơn ngựa kỵ binh một cách rõ ràng, và ở hệ số
  // cũ nó không hề: S của anh hùng là 1,55·cs còn của kỵ binh là 1,95·cs, nên
  // 1,15 × 1,55 = 1,78·cs chỉ nhỉnh hơn con ngựa kỵ binh (1,95·cs) có... không,
  // nó còn NHỎ HƠN. Con ngựa của tướng bé hơn ngựa lính là điều ngược hẳn với ý
  // đồ đã viết ngay trong chú thích của chính hàm này. 1,62 × 1,55 = 2,51·cs,
  // tức lớn hơn ngựa kỵ binh khoảng 29% — đủ để đọc ra khi hai con đứng cạnh nhau.
  const H = S * 1.62;
  const bodyY = cy + S * 0.30;
  drawShadow(cx, cy + cs * 0.68, H * 0.55, H * 0.2);

  // Nhịp chân CHẬM hơn kỵ binh (0,30 so với 0,42): ngựa tướng nặng hơn, và nhịp
  // khác nhau là cách phân biệt thứ hai khi cả hai cùng chạy trong một khung hình.
  const gait = Math.sin((aTick + u.id * 11) * 0.30);
  // Ngựa lùi lại một chút so với tâm ô, để NGƯỜI CƯỠI (vẽ ở đúng tâm ô) rơi vào
  // vùng vai-yên chứ không vào giữa lưng. Cổ và đầu ngựa vươn dài về phía trước
  // nên khối lượng hình dồn hẳn về đằng trước; không bù lại thì nhìn ra là ông
  // tướng ngồi trên mông ngựa.
  drawHorse(cx - dir * H * 0.10, bodyY, H, dir, gait, {
    hide: '#4a3a2b', legDark: '#2c2118', mane: '#241b13',
    barding: tribe.color, plume: '#c2412c'
  }, cs);
}

function drawHero(u, tribe, cx, cy, px, py, cs) {
  const S = cs * 1.55;
  // NGỰA CHIẾN: vẽ con ngựa TRƯỚC rồi nâng cả người lên trên lưng nó. Toàn bộ phần
  // còn lại của hàm không biết gì về con ngựa — nó chỉ nhận một `cy` đã dịch lên,
  // nên hình anh hùng (áo choàng, mũ chóp, tên trên đầu) giữ nguyên không sửa một
  // nét nào.
  //
  // Điều kiện giờ là THỜI ĐẠI, không phải một nhánh nghiên cứu. Nhờ vậy con ngựa
  // trở thành thứ đọc được ngay trên bản đồ về TIẾN ĐỘ của một bộ lạc: thấy tướng
  // cưỡi ngựa là biết bộ lạc đó đã qua Đồ Sắt, không cần mở bảng nào.
  const mounted = tribe.age >= CONFIG.HERO.MOUNT_AGE;
  // MẶT ĐẤT giữ lại trước khi nâng người lên lưng ngựa. Bóng đổ và vòng sáng phải
  // ở lại DƯỚI ĐẤT: chúng là hai thứ neo cả cụm hình vào mặt bản đồ, mà một cái
  // bóng bay lơ lửng ngang bụng con ngựa thì phá đúng cái neo đó. Bản trước dùng
  // chung `cy` đã dịch cho cả ba, và ở cỡ ngựa cũ (nhỏ) thì sai số còn nuốt được;
  // với con ngựa mới cao hơn 40% thì nó lộ ra ngay.
  const groundY = cy;
  if (mounted) {
    drawWarHorse(u, tribe, cx, cy, cs, S);
    // 0,34 -> 0,46 theo con ngựa mới. Đặt sao cho đáy thân người chìm khoảng một
    // phần tám vào lưng ngựa — ngồi trên yên thì hai chân phải khuất sau bụng
    // ngựa, chứ đứng hẳn trên lưng thì đọc ra là "người đứng trên con vật".
    cy -= S * 0.46;
  } else {
    drawShadow(cx, cy + cs * 0.55, S * 0.42, S * 0.18);   // ngựa đã tự đổ bóng rồi
  }

  // Vòng sáng dưới chân: vừa để nổi bật, vừa nhấp nháy nhanh hơn khi đang xông trận.
  const pulse = 0.55 + 0.45 * Math.sin(aTick * (u.retreating ? 0.08 : 0.2) + u.id);
  ctx.strokeStyle = tribe.color;
  ctx.globalAlpha = 0.35 + 0.3 * pulse;
  ctx.lineWidth = Math.max(1.5, cs * 0.16);
  ctx.beginPath();
  // "Dưới chân" của một người CƯỠI NGỰA là chỗ móng ngựa chạm đất, không phải mép
  // ô lưới. Con ngựa buông xuống tới groundY + 1,0·S (xem drawWarHorse), nên vẽ
  // vòng sáng ở mép ô là vẽ nó ngang BỤNG ngựa: nhìn ra màn hình thành một cái
  // vòng xỏ qua thân con vật, và nó cắt đúng khúc lườn — phần thân duy nhất còn
  // nhìn thấy được sau khi người cưỡi đã che mất phía trên.
  ctx.ellipse(cx, groundY + (mounted ? S * 1.0 : cs * 0.5),
              S * (mounted ? 0.62 : 0.5), S * (mounted ? 0.2 : 0.22), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const bob = Math.sin((aTick + u.id * 7) * 0.3) * cs * 0.06;
  // NGỒI TRÊN YÊN thì thân ngắn lại: một người ngồi cao bằng hai phần ba người
  // đứng. Không rút ngắn thì cái thân dài nguyên chiếm hết chiều cao con ngựa và
  // cả cụm đọc ra là "một người đứng chắn trước con ngựa".
  const bodyW = S * (mounted ? 0.54 : 0.62), bodyH = S * (mounted ? 0.6 : 0.78);
  const topY = cy - bodyH * 0.25 + bob;

  // CHÂN NGƯỜI CƯỠI, buông xuống sườn ngựa. Vẽ TRƯỚC thân để nó chui ra từ dưới
  // vạt áo. Một chi tiết, hai đoạn thẳng — nhưng nó là thứ biến "một cái hộp đặt
  // trên lưng ngựa" thành "một người đang cưỡi": mắt tìm điểm nối giữa người và
  // con vật, và nếu không có điểm nối nào thì hai khối đọc ra là hai vật rời.
  if (mounted) {
    const dirL = u.facingX >= 0 ? 1 : -1;
    ctx.strokeStyle = tribe.dark;
    ctx.lineWidth = Math.max(1.6, cs * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, topY + bodyH * 0.82);
    ctx.lineTo(cx + dirL * S * 0.17, topY + bodyH * 1.05);
    ctx.lineTo(cx + dirL * S * 0.13, topY + bodyH * 1.42);
    ctx.stroke();
    ctx.strokeStyle = '#2c2118';                    // ủng
    ctx.lineWidth = Math.max(1.8, cs * 0.18);
    ctx.beginPath();
    ctx.moveTo(cx + dirL * S * 0.09, topY + bodyH * 1.44);
    ctx.lineTo(cx + dirL * S * 0.20, topY + bodyH * 1.44);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Áo choàng bay phía sau — chi tiết rẻ nhất tạo cảm giác "tướng" thay vì "lính to".
  //
  // Khi CƯỠI NGỰA thì nó phải là một tấm choàng vai, không phải một cái áo dài
  // chấm đất. Đây là lỗi đo được ngay ở lần vẽ thử đầu tiên: tà áo cũ buông xuống
  // 1,15 lần chiều cao thân và loe ra 1,7 lần bề ngang, tức là nó phủ kín đúng cái
  // bụng ngựa — con ngựa vẽ xong rồi bị chính người cưỡi xoá đi, chỉ còn thò ra
  // bốn cái chân và cái đầu. Vẽ to con ngựa lên mà không sửa chỗ này thì càng to
  // càng không thấy.
  const capeLen = mounted ? 0.58 : 1.15;
  const capeFlare = mounted ? 0.62 : 0.85;
  ctx.fillStyle = tribe.dark;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.55, topY);
  ctx.lineTo(cx + bodyW * 0.55, topY);
  ctx.lineTo(cx + bodyW * capeFlare - u.facingX * bodyW * 0.3, topY + bodyH * capeLen);
  ctx.lineTo(cx - bodyW * capeFlare - u.facingX * bodyW * 0.3, topY + bodyH * capeLen);
  ctx.closePath();
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - bodyW / 2, topY, bodyW, bodyH);
  ctx.fillStyle = tribe.dark;
  ctx.fillRect(cx - bodyW / 2, topY, bodyW * 0.42, bodyH);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx - bodyW / 2, topY, bodyW, bodyH);

  ctx.fillStyle = '#f0cda6';
  ctx.beginPath();
  ctx.arc(cx, topY - S * 0.18, S * 0.24, 0, Math.PI * 2);
  ctx.fill();

  // Mũ + chỏm lông vàng: dấu hiệu "cấp bậc" đọc được kể cả ở zoom xa.
  ctx.fillStyle = '#d8a544';
  ctx.fillRect(cx - S * 0.27, topY - S * 0.34, S * 0.54, S * 0.16);
  ctx.beginPath();
  ctx.moveTo(cx, topY - S * 0.34);
  ctx.lineTo(cx - S * 0.1, topY - S * 0.62);
  ctx.lineTo(cx + S * 0.1, topY - S * 0.62);
  ctx.closePath();
  ctx.fill();

  // ĐẠI ĐAO. Lui quân thì dựng đứng bên người (không giao chiến — cây đao phải nói
  // ra điều đó), còn khi đánh thì bổ theo cùng quỹ đạo của rìu bộ binh nhưng dài
  // hơn, nặng hơn, và kéo theo một vệt vàng thay vì vệt trắng: cùng một động tác,
  // nhưng nhìn qua là biết ai trong đám đông kia là anh hùng.
  const dir = u.facingX >= 0 ? 1 : -1;
  const hx = cx + dir * bodyW * 0.5, hy = cy + bob;
  if (u.retreating) {
    ctx.strokeStyle = '#e2ddd0';
    ctx.lineWidth = Math.max(2, cs * 0.17);
    ctx.beginPath();
    ctx.moveTo(hx, hy); ctx.lineTo(cx + dir * bodyW * 0.72, cy - S * 0.9 + bob);
    ctx.stroke();
  } else {
    const k = swingK(u);
    const ang = AXE_READY + (AXE_HIT - AXE_READY) * swingChop(k);
    const L = S * 1.02;
    const vx = Math.cos(ang) * dir, vy = Math.sin(ang);
    const tx = hx + vx * L, ty = hy + vy * L;
    drawSwingTrail(k, hx, hy, L * 0.96, AXE_READY, AXE_HIT, dir,
                   '#f0cf85', Math.max(1.4, cs * 0.24));
    // Lưỡi đao thon: bản dày ở chuôi, vuốt nhọn ở mũi. Vẽ bằng hai nét chồng độ dày
    // khác nhau chứ không bằng một đa giác — ở cỡ này một đa giác bốn đỉnh và một
    // nét vuốt cho ra cùng một chỗ pixel, mà nét thì không có đỉnh để mà lệch.
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8d7358';                                   // chuôi
    ctx.lineWidth = Math.max(1.4, cs * 0.13);
    ctx.beginPath();
    ctx.moveTo(hx - vx * S * 0.16, hy - vy * S * 0.16);
    ctx.lineTo(hx + vx * S * 0.2, hy + vy * S * 0.2);
    ctx.stroke();
    ctx.strokeStyle = '#e2ddd0';                                   // lưỡi
    ctx.lineWidth = Math.max(2, cs * 0.19);
    ctx.beginPath();
    ctx.moveTo(hx + vx * S * 0.2, hy + vy * S * 0.2); ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#fbf5e6';                                   // ánh thép trên sống đao
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.beginPath();
    ctx.moveTo(hx + vx * S * 0.32, hy + vy * S * 0.32); ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Tên + đời. Xám khi đang rút lui — nhìn màu chữ là biết ông này đang xông lên
  // hay đang chạy về, không cần mở bảng bên phải.
  if (cs >= 5) {
    queueLabel(u.retreating ? `${u.name} ↩` : u.name, cx, topY - S * 0.75,
               `700 ${Math.max(9, Math.round(cs * 1.15))}px ${F_UI}`,
               u.retreating ? '#8d9490' : '#d8a544', 2);
  }

  // Thanh máu LUÔN hiện (khác lính/dân chỉ hiện khi đã mất máu): tính mạng anh
  // hùng là biến số kịch tính nhất trên bản đồ, giấu đi thì mất hết hồi hộp.
  //
  // Chân thanh máu phải nằm DƯỚI MÓNG NGỰA, không phải dưới ô lưới. `py + cs` là
  // mép dưới của Ô — đúng cho một người đi bộ, sai hẳn cho một người ngồi trên
  // con vật cao gấp rưỡi cái ô: thanh máu rơi vào đúng giữa bụng ngựa và đọc ra
  // thành một cái đai vàng vắt ngang con ngựa. Móng ngựa ở khoảng mặt-đất + 1,0·S
  // (xem drawWarHorse: bodyY = cy + 0,30·S, chân dài 0,44·H, H = 1,62·S).
  const barY = py + cs + 1 + (mounted ? S * 0.72 : 0);
  const w = S * 1.15, h = Math.max(2, cs * 0.16);
  const r = clamp(u.hp / u.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(cx - w / 2, barY, w, h);
  ctx.fillStyle = r > 0.5 ? '#d8a544' : r > 0.25 ? '#e09a3c' : '#d05a44';
  ctx.fillRect(cx - w / 2, barY, w * r, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2, barY, w, h);
}

// ============================================================
// QUÁI VẬT — bộ đồ nghề "dữ tợn" dùng chung, rồi 12 silhouette
// ============================================================
// Tông màu lạnh/tím, hình thù gai góc, KHÔNG mang màu bộ lạc nào — mắt phải phân
// biệt được "phe thứ năm" trong một phần giây, nếu không người xem sẽ tưởng một
// bộ lạc thứ năm vừa xuất hiện.
//
// PHASE 3.22 — VÌ SAO MỘT BỘ ĐỒ NGHỀ CHUNG, KHÔNG PHẢI 12 HÀM VẼ RỜI
//
// Bản 3.7 đã sửa đúng nửa đầu của bài toán "quái nhìn đơn điệu": mỗi loài một
// ĐƯỜNG BAO riêng, vì mắt phân loại theo silhouette trước rồi mới đọc màu. Nửa
// còn lại thì chưa: mỗi con vẫn là MỘT khối màu phẳng có viền, và ở cỡ 10–20 px
// một khối phẳng đọc ra là một cái NHÃN, không phải một con vật. Nó nhận diện
// được nhưng không doạ được ai.
//
// Ba thứ dưới đây là toàn bộ chênh lệch giữa "một cái nhãn" và "một con thú", và
// cả ba đều phải dùng CHUNG thì bầy quái mới ra một loài giống nhau:
//   1. KHỐI — da chuyển sắc dọc (sáng ở lưng, tối ở bụng). Một dòng, và nó là
//      thứ duy nhất nói cho mắt biết vật này có bề dày.
//   2. RĂNG NANH — và cái mõm phải MỞ RA ĐÚNG LÚC CẮN. Mốc thời gian là
//      `u.swingAt`, chính con dấu mà dealDamage đóng lúc máu bị trừ (xem swingK).
//      Không nuôi thêm một biến hoạt ảnh thứ hai: cùng bài học của cú vung rìu —
//      hai đồng hồ thì sớm muộn cũng lệch pha, mà lệch pha ở đây nghĩa là con
//      quái ngoạm vào không khí rồi mới trừ máu ở nhịp sau.
//   3. MẮT PHÁT SÁNG — một quầng nhỏ dưới hai chấm mắt. Trước 3.22 mắt là hai
//      chấm đặc; đặc thì nó chỉ là hai lỗ thủng trên khối màu. Có quầng thì nó
//      là thứ duy nhất trên bản đồ TỰ PHÁT SÁNG, và ở cỡ nhỏ nhất nó là chi tiết
//      cuối cùng còn đọc được.
//
// Chi phí: một gradient mỗi con mỗi khung hình, và chỉ khi cs >= 5. Dưới ngưỡng
// đó cả con quái chỉ còn dăm pixel, chuyển sắc không đọc được — trả tiền cho một
// thứ không ai thấy đúng là định nghĩa của lãng phí.

// Da quái: sáng ở lưng, tối dần xuống bụng.
function monsterHide(spec, cy, S, cs) {
  if (cs < 5) return spec.color;
  const g = ctx.createLinearGradient(0, cy - S * 0.75, 0, cy + S * 0.75);
  g.addColorStop(0, mixHex(spec.color, '#ffffff', 0.34));
  g.addColorStop(0.44, spec.color);
  g.addColorStop(1, mixHex(spec.dark, spec.color, 0.26));
  return g;
}

// ĐỘ MỞ CỦA MÕM, 0..1. Ngậm khi rảnh, hé sẵn khi đang có mục tiêu (con thú nào
// sắp vồ cũng nhe răng trước), ngoạm hết cỡ đúng nhịp cú cắn.
function snarlK(u) {
  const k = swingK(u);
  const idle = u.combatTarget ? 0.22 : 0.06;
  if (k < 0) return idle;
  return Math.max(idle, Math.sin(k * Math.PI));
}

// MÕM ĐẦY RĂNG. Vẽ như một cái nêm hở: hàm trên đứng yên, hàm dưới hạ xuống theo
// `open`. Răng là những tam giác nhỏ mọc ngược nhau từ hai mép — ở cỡ 12 px chúng
// nhoè thành một đường răng cưa, mà một đường răng cưa trắng nằm ở đầu con vật thì
// mắt đọc ngay ra là hàm răng, không cần đếm được từng cái.
function drawMaw(mx, my, w, h, open, dir, dark, cs) {
  const jaw = h * (0.18 + open * 0.95);
  ctx.fillStyle = '#1a0d0c';                       // trong họng: đỏ sẫm gần đen
  ctx.beginPath();
  ctx.moveTo(mx, my - h * 0.35);
  ctx.lineTo(mx + dir * w, my - h * 0.12);
  ctx.lineTo(mx + dir * w * 0.92, my + jaw);
  ctx.lineTo(mx, my + jaw * 0.55);
  ctx.closePath();
  ctx.fill();
  if (cs < 7) return;
  ctx.fillStyle = '#f4ece0';
  const n = 3;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const ux = mx + dir * w * t, uy = my - h * 0.35 + (h * 0.23) * t;
    ctx.beginPath();                               // răng hàm trên chĩa xuống
    ctx.moveTo(ux - dir * w * 0.1, uy);
    ctx.lineTo(ux + dir * w * 0.1, uy);
    ctx.lineTo(ux, uy + h * 0.34);
    ctx.closePath(); ctx.fill();
    const ly = my + jaw - (jaw - my * 0) * 0.02 - (h * 0.06) * t;
    ctx.beginPath();                               // răng hàm dưới chĩa lên
    ctx.moveTo(ux - dir * w * 0.09, ly);
    ctx.lineTo(ux + dir * w * 0.09, ly);
    ctx.lineTo(ux, ly - h * 0.26);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.8, cs * 0.06);
  ctx.beginPath();
  ctx.moveTo(mx, my - h * 0.35); ctx.lineTo(mx + dir * w, my - h * 0.12);
  ctx.stroke();
}

// GAI LƯNG — dãy tam giác mọc dọc một đoạn thẳng. Đây là chi tiết rẻ nhất biến
// một đường bao TRÒN thành một đường bao HUNG DỮ, và nó hoạt động ở mọi cỡ vì nó
// làm đổi chính cái đường bao chứ không thêm hoạ tiết vào bên trong.
function drawRidge(x0, y0, x1, y1, n, hgt, fill, dark, cs) {
  const dx = (x1 - x0) / n, dy = (y1 - y0) / n;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  // Pháp tuyến phải chĩa LÊN. Bản đầu viết ngược dấu — với một đoạn chạy từ trái
  // sang phải thì nó cho ra vector (0,+1), tức là đám gai mọc XUYÊN XUỐNG BỤNG
  // con vật. Nhìn ra màn hình thì con sói có một dải răng cưa trắng chạy dọc
  // bụng, và đọc nhầm ngay thành "cái mõm to bằng nửa thân". Trong hệ toạ độ
  // canvas y hướng xuống, nên "lên" là y ÂM.
  const nx = (y1 - y0) / len, ny = -(x1 - x0) / len;
  ctx.fillStyle = fill;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.8, cs * 0.06);
  for (let i = 0; i < n; i++) {
    const bx = x0 + dx * i, by = y0 + dy * i;
    // Gai giữa cao nhất, hai đầu thấp dần — một hàng gai đều tăm tắp đọc ra là
    // cái lược, không phải sống lưng.
    const h = hgt * (0.45 + 0.55 * Math.sin(((i + 0.5) / n) * Math.PI));
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + nx * h + dx * 0.5, by + ny * h + dy * 0.5);
    ctx.lineTo(bx + dx, by + dy);
    ctx.closePath();
    ctx.fill();
    if (cs >= 8) ctx.stroke();
  }
}

// VUỐT — ba móng cong toả ra từ một đầu chi.
function drawClaws(px0, py0, ang, L, dir, cs, color) {
  ctx.strokeStyle = color || '#efe6d4';
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const a = ang + i * 0.42;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.quadraticCurveTo(px0 + Math.cos(a) * L * 0.6 * dir, py0 + Math.sin(a) * L * 0.6,
                         px0 + Math.cos(a + 0.5) * L * dir, py0 + Math.sin(a + 0.5) * L);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// MẮT PHÁT SÁNG. `n` = số mắt (nhện có 6), `spread` = bề ngang cả cụm.
function monsterEyes(cx, cy, S, cs, o) {
  if (cs < 6) return;
  const col = o.color || '#e04b32';
  const r = Math.max(1, cs * (o.r || 0.09));
  const n = o.n || 2;
  const spread = (o.spread === undefined ? 0.15 : o.spread) * S;
  // Quầng sáng vẽ TRƯỚC, một lần cho cả cụm: n cái quầng chồng nhau ở cỡ nhỏ chỉ
  // ra một vệt sáng bệt, mà lại tốn n lần gradient.
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.5);
  g.addColorStop(0, o.glow || 'rgba(224,75,50,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const rowY = o.rows && i >= n / 2 ? r * 1.5 : 0;
    ctx.beginPath();
    ctx.arc(cx + t * spread, cy + rowY, r * (o.rows && i >= n / 2 ? 0.7 : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  // LÔNG MÀY — hai vạch tối chếch vào giữa. Một chi tiết hai nét, và nó là thứ
  // biến "hai chấm sáng" thành "một cái nhìn". Con người đọc sự giận dữ trên
  // gương mặt bằng góc của cặp lông mày trước mọi thứ khác; ở đây cũng thế.
  if (o.brow !== false && cs >= 8) {
    ctx.strokeStyle = 'rgba(12,6,6,0.85)';
    ctx.lineWidth = Math.max(1, cs * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - spread * 1.5, cy - r * 2.4);
    ctx.lineTo(cx - spread * 0.2, cy - r * 1.1);
    ctx.moveTo(cx + spread * 1.5, cy - r * 2.4);
    ctx.lineTo(cx + spread * 0.2, cy - r * 1.1);
    ctx.stroke();
  }
}

// Ụ ĐẤT của Rết Cát đang vùi. Cố tình vẽ RẤT ÍT: người xem PHẢI có cơ hội bỏ sót
// nó, nếu không thì phục kích chỉ là một con quái đứng im. Nhưng cũng không được
// vô hình hoàn toàn — một cái bẫy không có dấu hiệu nào thì lần thứ hai người xem
// vẫn không học được gì, và cơ chế trở thành ngẫu nhiên thuần.
function drawBurrowMound(u, cx, cy, S, cs, spec) {
  const puff = 0.5 + 0.5 * Math.sin((aTick + u.id * 13) * 0.05);
  ctx.fillStyle = mixHex(spec.dark, '#000000', 0.15);
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.34, S * 0.42, S * 0.17, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = mixHex(spec.color, '#000000', 0.35);
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.3, S * 0.34, S * 0.13, 0, Math.PI, 0);
  ctx.fill();
  if (cs >= 9) {
    ctx.strokeStyle = 'rgba(20,10,4,0.5)';           // nứt đất
    ctx.lineWidth = Math.max(0.8, cs * 0.05);
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(cx + i * S * 0.2, cy + cs * 0.3);
      ctx.lineTo(cx + i * S * 0.3, cy + cs * 0.3 - S * 0.11);
    }
    ctx.stroke();
    // Hai đốm mắt lấp ló, mờ hẳn và thở theo nhịp chậm.
    ctx.globalAlpha = 0.25 + 0.35 * puff;
    monsterEyes(cx, cy + cs * 0.22, S, cs, { r: 0.06, spread: 0.1, brow: false });
    ctx.globalAlpha = 1;
  }
}

function drawMonster(u, px, py, cs) {
  const spec = CONFIG.MONSTER.TYPES[u.mType];
  // `u.scale` chỉ có ở con sinh ra từ PHÂN ĐÔI. Hình phải nhỏ theo chỉ số, nếu
  // không thì hai con nhỏ trông y hệt con mẹ và cơ chế đọc ra là "nó nhân ba".
  const S = cs * spec.size * (u.scale || 1);
  let cx = px + cs / 2, cy = py + cs / 2;
  if (u.lungeUntil && tick < u.lungeUntil && u.combatTarget) {
    const dx = u.combatTarget.x - u.x, dy = u.combatTarget.y - u.y;
    const len = Math.hypot(dx, dy) || 1;
    cx += (dx / len) * cs * 0.3; cy += (dy / len) * cs * 0.3;
  }

  // ĐANG VÙI: thoát sớm hẳn. Không bóng, không vòng đỏ, không thanh máu — cả ba
  // thứ đó đều là biển báo "có quái ở đây", mà nguyên cả cơ chế phục kích nằm ở
  // chỗ KHÔNG có biển báo nào.
  if (u.buried) { drawBurrowMound(u, cx, cy, S, cs, spec); return; }

  drawShadow(cx, cy + cs * 0.5, S * 0.45, S * 0.18);

  // Vòng đỏ mờ dưới chân: nền cỏ xanh và thân quái xám/nâu quá gần nhau về độ
  // sáng, nên nếu không có mảng màu tương phản thì mắt lướt qua không nhận ra.
  // Quái của SÓNG tô đậm hơn hẳn — người xem cần phân biệt ngay "con này canh
  // hang" với "con này đang tràn vào nhà mình".
  ctx.fillStyle = u.assault ? 'rgba(244,67,54,0.42)' : 'rgba(198,40,40,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.5, S * (u.assault ? 0.62 : 0.55), S * (u.assault ? 0.27 : 0.24), 0, 0, Math.PI * 2);
  ctx.fill();

  // VỪA ĐƯỢC THẦY MO VÁ MÁU — quầng xanh chớp lên quanh chân. Không có dấu hiệu
  // này thì cơ chế hồi máu là vô hình: người xem chỉ thấy "đánh mãi không chết",
  // đọc ra thành một con bug chứ không phải một con quái biết chữa thương.
  if (u.healedAt !== undefined && tick - u.healedAt < 14) {
    const t = 1 - (tick - u.healedAt) / 14;
    ctx.strokeStyle = `rgba(126,214,160,${(0.65 * t).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, cs * 0.13);
    ctx.beginPath();
    ctx.ellipse(cx, cy + cs * 0.42, S * (0.5 + 0.35 * (1 - t)), S * (0.2 + 0.14 * (1 - t)), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const bob = Math.sin((aTick + u.id * 5) * 0.4) * cs * 0.05;
  const gait = Math.sin((aTick + u.id * 9) * 0.34);
  const lw = Math.max(1, cs * 0.12);
  const dir = u.facingX >= 0 ? 1 : -1;
  const open = snarlK(u);
  const hide = monsterHide(spec, cy, S, cs);
  ctx.fillStyle = hide;
  ctx.strokeStyle = spec.dark;
  ctx.lineWidth = lw;
  const shape = spec.shape || 'troll';
  let eyeX = cx, eyeY = cy - S * 0.12 + bob, eyeOpt = null;

  // Mỗi loài một SILHOUETTE. Trước 3.7 cả ba loài dùng chung một hình thoi khác
  // cỡ, và đó là nguyên nhân trực tiếp nhất của chữ "đơn điệu": ở zoom thường,
  // một hình thoi xám cỡ 1,15 và một hình thoi nâu cỡ 1,5 là CÙNG MỘT VẬT với
  // mắt người — màu và cỡ chỉ được đọc sau khi hình dạng đã phân loại xong.
  if (shape === 'wolf') {
    // SÓI. Thân dài nằm ngang, bốn chân sải theo nhịp, lưng dựng lông (gai), mõm
    // nhọn mở ra khi cắn. Bản 3.7 chỉ có một bầu dục + một tam giác làm mõm: đủ
    // để đọc ra "con thú bốn chân", nhưng nó không có CHÂN nào cả, nên đứng hay
    // chạy đều y hệt — mà sói thì thứ duy nhất đáng sợ là nó chạy nhanh hơn ta.
    const by = cy + bob;
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(1.2, cs * 0.1);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {                    // chân: hai khúc, lệch pha
      const rear = i < 2;
      const sw = Math.sin((aTick + u.id * 9) * 0.34 + (rear ? 0 : Math.PI) + (i % 2) * 0.7);
      const lx = cx + dir * S * (rear ? -0.28 : 0.24);
      ctx.beginPath();
      ctx.moveTo(lx, by + S * 0.14);
      ctx.lineTo(lx + dir * sw * S * 0.14, by + S * 0.34);
      ctx.lineTo(lx + dir * sw * S * 0.2, by + S * 0.5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                  // đuôi xù
    ctx.moveTo(cx - dir * S * 0.38, by - S * 0.04);
    ctx.quadraticCurveTo(cx - dir * S * 0.78, by - S * 0.2, cx - dir * S * 0.66, by - S * 0.5);
    ctx.quadraticCurveTo(cx - dir * S * 0.58, by - S * 0.2, cx - dir * S * 0.34, by + S * 0.1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // thân
    ctx.ellipse(cx, by, S * 0.46, S * 0.27, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawRidge(cx - dir * S * 0.3, by - S * 0.2, cx + dir * S * 0.22, by - S * 0.26,
              5, S * 0.2, hide, spec.dark, cs);       // lông gáy dựng đứng
    ctx.fillStyle = hide;
    ctx.beginPath();                                  // đầu
    ctx.moveTo(cx + dir * S * 0.26, by - S * 0.26);
    ctx.lineTo(cx + dir * S * 0.72, by - S * 0.14);
    ctx.lineTo(cx + dir * S * 0.7, by + S * 0.16);
    ctx.lineTo(cx + dir * S * 0.24, by + S * 0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {                                    // tai nhọn cụp về sau
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.3, by - S * 0.24);
      ctx.lineTo(cx + dir * S * 0.22, by - S * 0.56);
      ctx.lineTo(cx + dir * S * 0.44, by - S * 0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    drawMaw(cx + dir * S * 0.46, by + S * 0.04, S * 0.3, S * 0.24, open, dir, spec.dark, cs);
    eyeX = cx + dir * S * 0.4; eyeY = by - S * 0.14;
    eyeOpt = { spread: 0.07, r: 0.075 };

  } else if (shape === 'spider') {
    // NHỆN. Tám chân GẤP KHÚC — khớp gối nhô cao hơn thân, đúng dáng nhện thật —
    // hai đốt thân, và một cặp kìm độc xoè ra khi cắn. Chân vẫn vẽ bằng màu THÂN
    // chứ không phải màu viền: nhìn thật ở zoom 40 thì viền #1b5e20 nằm đè lên
    // vòng đỏ dưới chân quái, hai màu tối chồng nhau và tám cái chân biến mất sạch.
    const by = cy + bob;
    // Chân vẽ bằng OLIVE SÁNG, không phải spec.color và cũng không phải spec.dark.
    // Cả hai màu kia đều đã thử và đều hỏng, mỗi cái theo một kiểu: spec.dark
    // (#1b5e20) chìm nghỉm vào vòng đỏ dưới chân quái, còn spec.color (#7d9c42)
    // thì gần như trùng sắc với chính bãi cỏ nó đang đứng — nhìn ra màn hình con
    // nhện thành một cái khuyên tròn không chân. Sáng lên một bậc thì nó tách
    // khỏi CẢ HAI nền cùng lúc, và đó là điều kiện thật sự cần.
    ctx.strokeStyle = mixHex(spec.color, '#ffffff', 0.3);
    ctx.lineWidth = Math.max(1.4, cs * 0.12);
    ctx.lineCap = 'round';
    // BỐN CHÂN MỖI BÊN, toả về trước và về sau, gối nhô cao hơn lưng.
    //
    // Hai bản trước đều toả chân theo GÓC quanh tâm (0..2π) và cả hai đều ra một
    // bụi cỏ, không ra con nhện. Lý do chỉ lộ ra khi vẽ thử ở cỡ lớn: toả đều
    // quanh tâm nghĩa là có chân chĩa thẳng LÊN — mà cả bảng quái này vẽ theo lối
    // NHÌN NGANG (sói, gấu, quỷ đá đều nhìn nghiêng), nên "lên" ở đây là lên
    // trời, không phải ra phía sau. Nhện thì không có chân nào chĩa lên trời.
    // Ép hết chân về hai bên trái/phải rồi mới rải trước-sau thì nó vừa khớp với
    // lối nhìn chung, vừa cho đúng cái đường bao tám nan mà mắt tìm.
    for (let i = 0; i < 8; i++) {
      const sd = i < 4 ? 1 : -1;                       // bên phải / bên trái
      const t = (i % 4) / 3;                           // 0 = chân trước, 1 = chân sau
      const vy = (t - 0.5) * 2;                        // -1 trước .. +1 sau
      const wig = Math.sin(aTick * 0.25 + u.id + i * 1.3) * S * 0.04;
      const fx0 = cx + sd * S * (0.62 + (1 - Math.abs(vy)) * 0.22);
      const fy0 = by + S * (0.12 + vy * 0.3) + wig;
      ctx.beginPath();
      ctx.moveTo(cx + sd * S * 0.1, by + S * vy * 0.08);
      ctx.lineTo(cx + sd * S * 0.36, by + S * vy * 0.2 - S * 0.32);   // gối nhô lên
      ctx.lineTo(fx0, fy0);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    ctx.beginPath();                                  // bụng (đốt sau, to)
    ctx.ellipse(cx - dir * S * 0.22, by + S * 0.02, S * 0.3, S * 0.26, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (cs >= 8) {
      // Hoa văn ĐỒNG HỒ CÁT màu vàng cảnh báo. Hai lựa chọn trước đều hỏng: một
      // hình thoi TỐI ở giữa cái bụng tròn thì mắt đọc thành LỖ THỦNG (con nhện
      // biến thành chiếc khuyên), còn ba vạch ngang thì ra đúng cái biểu tượng
      // menu ba gạch. Sáng-trên-tối và có eo thắt ở giữa thì nó đọc ra là một dấu
      // hiệu trên lưng con vật — và tình cờ cũng đúng thứ mà loài nhện độc thật
      // mang trên bụng, nên nó tự giải thích luôn cái nọc.
      ctx.fillStyle = '#e8d26a';
      const ax = cx - dir * S * 0.22;
      ctx.beginPath();
      ctx.moveTo(ax - S * 0.09, by - S * 0.17);
      ctx.lineTo(ax + S * 0.09, by - S * 0.17);
      ctx.lineTo(ax + S * 0.03, by + S * 0.01);
      ctx.lineTo(ax + S * 0.1, by + S * 0.19);
      ctx.lineTo(ax - S * 0.1, by + S * 0.19);
      ctx.lineTo(ax - S * 0.03, by + S * 0.01);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = hide;
    }
    ctx.beginPath();                                  // ngực (đốt trước, nhỏ)
    ctx.ellipse(cx + dir * S * 0.2, by - S * 0.02, S * 0.19, S * 0.17, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f4ece0';                      // kìm độc, xoè theo cú cắn
    ctx.lineWidth = Math.max(1, cs * 0.08);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.3, by + s * S * 0.05);
      ctx.quadraticCurveTo(cx + dir * S * 0.46, by + s * S * (0.06 + open * 0.18),
                           cx + dir * S * 0.4, by + s * S * (0.16 + open * 0.24));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    eyeX = cx + dir * S * 0.22; eyeY = by - S * 0.08;
    eyeOpt = { n: 6, rows: true, spread: 0.1, r: 0.055, brow: false };

  } else if (shape === 'bear') {
    // GẤU. Khối tròn nặng, có BƯỚU VAI (dấu hiệu nhận dạng số một của gấu thật),
    // bốn chân ngắn mập, vuốt trước, và cái mõm há to khi gầm. Không góc nhọn nào
    // trên thân — sức nặng đọc ra từ tỉ lệ, không từ gai.
    const by = cy + bob;
    ctx.strokeStyle = spec.dark; ctx.lineWidth = Math.max(1.6, cs * 0.14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const rear = i < 2;
      const sw = Math.sin((aTick + u.id * 9) * 0.26 + (rear ? 0 : Math.PI));
      const lx = cx + dir * S * (rear ? -0.26 : 0.22);
      ctx.beginPath();
      ctx.moveTo(lx, by + S * 0.2);
      ctx.lineTo(lx + dir * sw * S * 0.1, by + S * 0.48);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                  // thân + bướu vai liền một nét
    ctx.moveTo(cx - dir * S * 0.44, by + S * 0.16);
    ctx.quadraticCurveTo(cx - dir * S * 0.5, by - S * 0.2, cx - dir * S * 0.16, by - S * 0.34);
    ctx.quadraticCurveTo(cx + dir * S * 0.04, by - S * 0.56, cx + dir * S * 0.3, by - S * 0.3);
    ctx.quadraticCurveTo(cx + dir * S * 0.5, by - S * 0.1, cx + dir * S * 0.44, by + S * 0.22);
    ctx.quadraticCurveTo(cx, by + S * 0.46, cx - dir * S * 0.44, by + S * 0.16);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {
      ctx.beginPath();                                // hai tai tròn nhỏ
      ctx.arc(cx + dir * S * 0.32, by - S * 0.46, S * 0.11, 0, Math.PI * 2);
      ctx.arc(cx + dir * S * 0.08, by - S * 0.5, S * 0.1, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath();                                  // mõm
    ctx.ellipse(cx + dir * S * 0.42, by - S * 0.16, S * 0.17, S * 0.13, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawMaw(cx + dir * S * 0.38, by - S * 0.12, S * 0.26, S * 0.26, open, dir, spec.dark, cs);
    if (cs >= 8) drawClaws(cx + dir * S * 0.3, by + S * 0.42, Math.PI * 0.12, S * 0.22, dir, cs);
    eyeX = cx + dir * S * 0.24; eyeY = by - S * 0.34;
    eyeOpt = { spread: 0.11, r: 0.08 };

  } else if (shape === 'wisp') {
    // BÓNG MA. Giọt lửa lơ lửng — bồng bềnh mạnh hơn hẳn và có quầng sáng, để
    // người xem đọc ra "thứ này không chạm đất" rồi đoán được nó đánh từ xa.
    // 3.22 thêm một cái SỌ mờ bên trong ngọn lửa và mấy dải tà rách bên dưới:
    // trước đó nó là một giọt màu xanh trơn, đọc ra gần với "quả cầu phép" hơn
    // là với một con quái — mà đây là con duy nhất bắn được, nên nó cần một
    // GƯƠNG MẶT để người xem nhớ mặt mà tránh.
    const fl = Math.sin((aTick + u.id * 9) * 0.16) * cs * 0.22;
    const wy = cy - S * 0.1 + fl;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(cx, wy, S * 0.68, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {                     // tà áo rách bay dưới
      const sw = Math.sin((aTick + u.id * 7 + i * 40) * 0.14);
      ctx.globalAlpha = 0.5 - i * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx + (i - 1) * S * 0.2, wy + S * 0.1);
      ctx.quadraticCurveTo(cx + (i - 1) * S * 0.3 + sw * S * 0.18, wy + S * 0.5,
                           cx + (i - 1) * S * 0.16 + sw * S * 0.3, wy + S * 0.86);
      ctx.lineTo(cx + (i - 1) * S * 0.06, wy + S * 0.14);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();                                  // thân lửa
    ctx.moveTo(cx, wy - S * 0.62);
    ctx.quadraticCurveTo(cx + S * 0.42, wy - S * 0.02, cx, wy + S * 0.46);
    ctx.quadraticCurveTo(cx - S * 0.42, wy - S * 0.02, cx, wy - S * 0.62);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 8) {                                    // sọ mờ bên trong
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#eaf6f5';
      ctx.beginPath(); ctx.ellipse(cx, wy - S * 0.1, S * 0.17, S * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d2b2c';
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.11, wy + S * 0.08);       // hàm răng sọ
      ctx.lineTo(cx + S * 0.11, wy + S * 0.08);
      ctx.lineTo(cx + S * 0.07, wy + S * 0.16);
      ctx.lineTo(cx - S * 0.07, wy + S * 0.16);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    cy = wy;
    eyeX = cx; eyeY = wy - S * 0.13;
    eyeOpt = { color: '#dceef0', glow: 'rgba(180,240,238,0.6)', spread: 0.1, r: 0.085 };

  } else if (shape === 'wyvern') {
    // PHI LONG. Vẽ CAO hơn mặt đất hẳn một quãng và bóng đổ nằm lại dưới chân:
    // chiều cao là thứ duy nhất trên bản đồ này nói được "nó đang bay", mà bay
    // lại đúng là năng lực khiến nó nguy hiểm.
    const lift = cs * 0.85 + Math.sin((aTick + u.id * 7) * 0.22) * cs * 0.18;
    const wy = cy - lift;
    const flap = Math.sin((aTick + u.id * 11) * 0.45);
    ctx.beginPath();                                  // hai cánh, có XƯƠNG NGÓN
    ctx.moveTo(cx, wy);
    ctx.quadraticCurveTo(cx - S * 0.75, wy - S * (0.36 + flap * 0.22), cx - S * 1.0, wy + S * 0.16);
    ctx.quadraticCurveTo(cx - S * 0.55, wy + S * 0.04, cx, wy + S * 0.2);
    ctx.moveTo(cx, wy);
    ctx.quadraticCurveTo(cx + S * 0.75, wy - S * (0.36 + flap * 0.22), cx + S * 1.0, wy + S * 0.16);
    ctx.quadraticCurveTo(cx + S * 0.55, wy + S * 0.04, cx, wy + S * 0.2);
    ctx.fill(); ctx.stroke();
    if (cs >= 7) {
      ctx.strokeStyle = mixHex(spec.dark, spec.color, 0.45);
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      for (const s of [-1, 1]) for (let i = 1; i <= 2; i++) {
        ctx.moveTo(cx + s * S * 0.06, wy + S * 0.04);
        ctx.lineTo(cx + s * S * (0.34 + i * 0.3), wy - S * (0.16 - i * 0.08) + flap * S * 0.1);
      }
      ctx.stroke();
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.beginPath();                                  // thân
    ctx.ellipse(cx, wy + S * 0.06, S * 0.2, S * 0.36, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // đuôi có ngạnh
    ctx.moveTo(cx - dir * S * 0.06, wy + S * 0.36);
    ctx.quadraticCurveTo(cx - dir * S * 0.4, wy + S * 0.62, cx - dir * S * 0.66, wy + S * 0.5);
    ctx.lineTo(cx - dir * S * 0.5, wy + S * 0.68);
    ctx.quadraticCurveTo(cx - dir * S * 0.3, wy + S * 0.72, cx + dir * S * 0.02, wy + S * 0.44);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // cổ + đầu
    ctx.moveTo(cx, wy - S * 0.2);
    ctx.quadraticCurveTo(cx + dir * S * 0.24, wy - S * 0.5, cx + dir * S * 0.5, wy - S * 0.44);
    ctx.lineTo(cx + dir * S * 0.46, wy - S * 0.24);
    ctx.quadraticCurveTo(cx + dir * S * 0.2, wy - S * 0.24, cx + dir * S * 0.1, wy - S * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {
      ctx.beginPath();                                // sừng chĩa ngược
      ctx.moveTo(cx + dir * S * 0.3, wy - S * 0.46);
      ctx.lineTo(cx + dir * S * 0.14, wy - S * 0.74);
      ctx.lineTo(cx + dir * S * 0.36, wy - S * 0.54);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    drawMaw(cx + dir * S * 0.42, wy - S * 0.34, S * 0.3, S * 0.2, open, dir, spec.dark, cs);
    cy = wy;
    eyeX = cx + dir * S * 0.36; eyeY = wy - S * 0.42;
    eyeOpt = { spread: 0.05, r: 0.07 };

  } else if (shape === 'lord') {
    // CHÚA HANG. Trước 3.22 nó là hình thoi của quỷ đá phóng to, thêm một cái
    // vương miện gai. Ở cỡ 2,7 ô thì "một hình thoi to" đúng là một hình thoi to:
    // con quái đắt nhất bản đồ, rơi Thánh vật 100%, mà đường bao lại y hệt loài
    // thường gặp nhất. Giờ nó có THÂN NGƯỜI — vai gai, áo choàng, hai tay vuốt —
    // vì thứ duy nhất phân biệt "trùm" với "quái to" là nó trông như một KẺ CẦM
    // QUYỀN, không phải một con thú lớn hơn.
    const R = u.aura ? u.aura.r * cs : 0;
    if (R > 0) {
      // Nhìn thật ở zoom 40: ở alpha 0,16 cái vòng này KHÔNG ĐỌC ĐƯỢC trên nền cỏ
      // — nó có ở đó nhưng mắt không bắt được, tức là bằng không. Thêm một lớp nền
      // đỏ mờ đổ dần rồi mới tới vòng nét đứt.
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      g.addColorStop(0, 'rgba(198,40,40,0.20)');
      g.addColorStop(1, 'rgba(198,40,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.42 + 0.16 * Math.sin(aTick * 0.08);
      ctx.strokeStyle = '#e04b32';
      ctx.lineWidth = Math.max(2, cs * 0.22);
      ctx.setLineDash([cs * 1.2, cs * 0.9]);
      ctx.lineDashOffset = -aTick * 0.6;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = hide; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    const by = cy + bob;
    ctx.fillStyle = mixHex(spec.dark, '#000000', 0.25);
    ctx.beginPath();                                  // áo choàng đổ sau lưng
    ctx.moveTo(cx - S * 0.34, by - S * 0.34);
    ctx.lineTo(cx + S * 0.34, by - S * 0.34);
    ctx.lineTo(cx + S * 0.52 - dir * S * 0.12, by + S * 0.62);
    ctx.lineTo(cx - S * 0.52 - dir * S * 0.12, by + S * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hide;
    ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    ctx.beginPath();                                  // hai chân
    ctx.moveTo(cx - S * 0.22, by + S * 0.14);
    ctx.lineTo(cx - S * 0.3, by + S * 0.58);
    ctx.lineTo(cx - S * 0.06, by + S * 0.58);
    ctx.lineTo(cx - S * 0.02, by + S * 0.14);
    ctx.lineTo(cx + S * 0.02, by + S * 0.14);
    ctx.lineTo(cx + S * 0.06, by + S * 0.58);
    ctx.lineTo(cx + S * 0.3, by + S * 0.58);
    ctx.lineTo(cx + S * 0.22, by + S * 0.14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // thân hình thang, vai rộng
    ctx.moveTo(cx - S * 0.42, by - S * 0.3);
    ctx.lineTo(cx + S * 0.42, by - S * 0.3);
    ctx.lineTo(cx + S * 0.24, by + S * 0.2);
    ctx.lineTo(cx - S * 0.24, by + S * 0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawRidge(cx - S * 0.44, by - S * 0.3, cx + S * 0.44, by - S * 0.3,
              5, S * 0.26, mixHex(spec.color, '#000000', 0.2), spec.dark, cs);
    ctx.fillStyle = hide;
    ctx.beginPath();                                  // hai cánh tay dài
    for (const s of [-1, 1]) {
      ctx.moveTo(cx + s * S * 0.36, by - S * 0.24);
      ctx.lineTo(cx + s * S * 0.56, by + S * 0.24);
      ctx.lineTo(cx + s * S * 0.4, by + S * 0.28);
      ctx.lineTo(cx + s * S * 0.24, by - S * 0.2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) for (const s of [-1, 1]) {
      drawClaws(cx + s * S * 0.48, by + S * 0.28, Math.PI * 0.4, S * 0.22, s, cs, '#f0d9a8');
    }
    ctx.fillStyle = hide;
    ctx.beginPath();                                  // đầu
    ctx.ellipse(cx, by - S * 0.44, S * 0.19, S * 0.17, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawMaw(cx + dir * S * 0.02, by - S * 0.4, S * 0.18, S * 0.18, open, dir, spec.dark, cs);
    // VƯƠNG MIỆN gai vàng — dấu hiệu "kẻ cầm quyền", và là thứ duy nhất trên
    // người nó mang màu ấm.
    ctx.strokeStyle = '#d8a544';
    ctx.lineWidth = Math.max(1.4, cs * 0.14);
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(cx + i * S * 0.09, by - S * 0.56);
      ctx.lineTo(cx + i * S * 0.13, by - S * (0.72 + Math.abs(i) * 0.03));
    }
    ctx.moveTo(cx - S * 0.2, by - S * 0.56); ctx.lineTo(cx + S * 0.2, by - S * 0.56);
    ctx.stroke();
    eyeX = cx; eyeY = by - S * 0.48;
    eyeOpt = { spread: 0.07, r: 0.1, glow: 'rgba(255,120,60,0.7)' };

  } else if (shape === 'blob') {
    // NHỚT QUỶ. Khối keo TRONG SUỐT — thứ duy nhất trên bản đồ nhìn xuyên qua
    // được, nên nó không thể bị nhầm với bất cứ loài nào khác dù cỡ và màu có
    // gần đến đâu. Bên trong lửng lơ mấy khúc xương của thứ nó đã nuốt: đó vừa
    // là chi tiết ghê nhất của con này, vừa là lời giải thích tại chỗ cho việc
    // giết nó xong lại ra thêm hai con.
    const by = cy + bob * 1.6;
    const wob = Math.sin((aTick + u.id * 6) * 0.13);   // co giãn như một túi nước
    const rw = S * (0.56 + wob * 0.07), rh = S * (0.4 - wob * 0.07);
    // Đường bao phải BÈ RA và có HAI BƯỚU lệch nhau. Bản đầu là một vòm đối xứng
    // đặt trên một đáy phẳng, và ở cỡ nào nó cũng ra đúng hình một CÁI MŨ SẮT —
    // tức là trùng ngôn ngữ hình với người lính, thứ tệ nhất có thể xảy ra với
    // một con quái. Thứ khiến mắt đọc ra "khối keo" là sự BẤT ĐỐI XỨNG và cái
    // đáy loe ra hai bên, không phải màu và cũng không phải độ trong.
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - rw, by + rh * 0.62);
    ctx.quadraticCurveTo(cx - rw * 1.1, by - rh * 0.5, cx - rw * 0.42, by - rh * 0.88);
    ctx.quadraticCurveTo(cx - rw * 0.04, by - rh * 1.16, cx + rw * 0.26, by - rh * 0.8);
    ctx.quadraticCurveTo(cx + rw * 0.72, by - rh * 1.02, cx + rw * 0.9, by - rh * 0.24);
    ctx.quadraticCurveTo(cx + rw * 1.12, by + rh * 0.34, cx + rw, by + rh * 0.62);
    ctx.quadraticCurveTo(cx, by + rh * 1.2, cx - rw, by + rh * 0.62);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
    if (cs >= 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';      // đốm sáng mặt keo
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath();
      ctx.arc(cx - rw * 0.35, by - rh * 0.36, S * 0.13, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(232,226,210,0.75)';        // xương lửng lơ bên trong
      ctx.beginPath();
      ctx.ellipse(cx + rw * 0.2, by + rh * 0.1, S * 0.11, S * 0.08, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - rw * 0.34, by + rh * 0.3, S * 0.2, S * 0.05);
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    // Giọt nhỏ xuống đất — nhịp rất chậm, để nó không thành hoạt ảnh gây rối.
    if (cs >= 9) {
      const dp = ((aTick + u.id * 31) % 140) / 140;
      ctx.fillStyle = mixHex(spec.color, '#000000', 0.1);
      ctx.globalAlpha = 0.7 * (1 - dp);
      ctx.beginPath();
      ctx.arc(cx + rw * 0.5, by + rh * 0.7 + dp * S * 0.5, S * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    eyeX = cx; eyeY = by - rh * 0.2;
    eyeOpt = { spread: 0.14, r: 0.085, color: '#f2d55a', glow: 'rgba(242,213,90,0.5)' };

  } else if (shape === 'burrower') {
    // RẾT CÁT (đã trồi lên). Thân nhiều ĐỐT uốn sóng, mỗi đốt một cặp chân — hình
    // duy nhất trên bản đồ có nhịp lặp theo chiều dài, nên nó đọc ra là "con vật
    // nhiều chân" ngay cả khi chỉ còn mươi pixel. Đầu có hai càng kìm.
    const by = cy + bob;
    const seg = 5;
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(1, cs * 0.07);
    ctx.lineCap = 'round';
    for (let i = 0; i < seg; i++) {                    // chân, vẽ trước
      const t = i / (seg - 1);
      const sx = cx + dir * S * (0.42 - t * 0.86);
      const sy = by + Math.sin(aTick * 0.3 + u.id + i * 1.1) * S * 0.08;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - dir * S * 0.06, sy + s * S * 0.3);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    for (let i = seg - 1; i >= 0; i--) {               // đốt thân, đuôi vẽ trước
      const t = i / (seg - 1);
      const sx = cx + dir * S * (0.42 - t * 0.86);
      const sy = by + Math.sin(aTick * 0.3 + u.id + i * 1.1) * S * 0.08;
      ctx.beginPath();
      ctx.ellipse(sx, sy, S * (0.17 - t * 0.05), S * (0.15 - t * 0.04), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#efe6d4';                       // hai càng kìm, xoè khi cắn
    ctx.lineWidth = Math.max(1.2, cs * 0.09);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.5, by + s * S * 0.06);
      ctx.quadraticCurveTo(cx + dir * S * 0.74, by + s * S * (0.08 + open * 0.22),
                           cx + dir * S * 0.62, by + s * S * (0.2 + open * 0.26));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    eyeX = cx + dir * S * 0.42; eyeY = by - S * 0.06;
    eyeOpt = { spread: 0.06, r: 0.07, color: '#f2d55a', glow: 'rgba(242,213,90,0.55)' };

  } else if (shape === 'serpent') {
    // MÃNG XÀ. Thân cuộn hình S vẽ bằng MỘT đường viền dày thuôn dần, cái đầu
    // ngóc cao có mang bạnh, lưỡi chẻ thò ra. Cuộn tròn nằm sát đất còn đầu thì
    // dựng lên — chênh lệch cao thấp đó là thứ khiến nó đọc ra "sắp mổ" chứ
    // không phải "đang bò".
    const by = cy + bob * 0.6;
    const sway = Math.sin((aTick + u.id * 5) * 0.12);
    ctx.lineCap = 'round';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(2.4, S * 0.3);            // viền tối = bề dày thân
    ctx.beginPath();
    ctx.moveTo(cx - dir * S * 0.6, by + S * 0.34);
    ctx.quadraticCurveTo(cx - dir * S * 0.1, by + S * 0.5, cx + dir * S * 0.16, by + S * 0.2);
    ctx.quadraticCurveTo(cx + dir * S * (0.4 + sway * 0.06), by - S * 0.1, cx + dir * S * 0.2, by - S * 0.4);
    ctx.stroke();
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = Math.max(1.4, S * 0.2);
    ctx.beginPath();
    ctx.moveTo(cx - dir * S * 0.6, by + S * 0.34);
    ctx.quadraticCurveTo(cx - dir * S * 0.1, by + S * 0.5, cx + dir * S * 0.16, by + S * 0.2);
    ctx.quadraticCurveTo(cx + dir * S * (0.4 + sway * 0.06), by - S * 0.1, cx + dir * S * 0.2, by - S * 0.4);
    ctx.stroke();
    ctx.lineCap = 'butt';
    const hx = cx + dir * S * 0.22, hy = by - S * 0.46;
    ctx.fillStyle = hide; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    ctx.beginPath();                                   // mang bạnh
    ctx.ellipse(hx, hy + S * 0.04, S * 0.28, S * 0.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                   // đầu
    ctx.ellipse(hx + dir * S * 0.08, hy - S * 0.04, S * 0.19, S * 0.13, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (cs >= 8) {                                     // lưỡi chẻ
      const tl = S * (0.16 + open * 0.16);
      ctx.strokeStyle = '#d05a44';
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      ctx.moveTo(hx + dir * S * 0.24, hy);
      ctx.lineTo(hx + dir * (S * 0.24 + tl), hy + S * 0.04);
      ctx.moveTo(hx + dir * (S * 0.24 + tl * 0.6), hy + S * 0.024);
      ctx.lineTo(hx + dir * (S * 0.24 + tl), hy - S * 0.03);
      ctx.stroke();
    }
    drawMaw(hx + dir * S * 0.12, hy + S * 0.02, S * 0.18, S * 0.16, open, dir, spec.dark, cs);
    eyeX = hx + dir * S * 0.06; eyeY = hy - S * 0.08;
    eyeOpt = { spread: 0.05, r: 0.07, color: '#f2d55a', glow: 'rgba(242,213,90,0.55)' };

  } else if (shape === 'shaman') {
    // THẦY MO. Dáng người KHOM trong áo trùm đầu, tay chống một cây gậy có sọ.
    // Đây là loài quái duy nhất mang hình NGƯỜI, và đó là cả chủ đích: người xem
    // phải đọc ra ngay "con này không đánh, con này làm phép", vì thứ tự giết nó
    // mới là quyết định mà nó tạo ra. Ba vòng bùa xoay quanh gậy chỉ sáng lên
    // đúng lúc nó vừa vá máu cho ai đó (`chantAt`), không sáng đều — nếu sáng
    // đều thì người xem học sai thành "nó có hào quang buff".
    const by = cy + bob;
    const chant = u.chantAt !== undefined && tick - u.chantAt < 12
      ? 1 - (tick - u.chantAt) / 12 : 0;
    ctx.fillStyle = hide;
    ctx.beginPath();                                   // áo choàng loe xuống đất
    ctx.moveTo(cx - S * 0.14, by - S * 0.34);
    ctx.quadraticCurveTo(cx - S * 0.34, by, cx - S * 0.4, by + S * 0.5);
    ctx.lineTo(cx + S * 0.4, by + S * 0.5);
    ctx.quadraticCurveTo(cx + S * 0.34, by, cx + S * 0.14, by - S * 0.34);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 8) {                                     // tua rua gấu áo
      ctx.strokeStyle = mixHex(spec.dark, '#000000', 0.2);
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(cx + i * S * 0.11, by + S * 0.5);
        ctx.lineTo(cx + i * S * 0.11, by + S * (0.58 + (i % 2 ? 0.06 : 0)));
      }
      ctx.stroke();
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.fillStyle = mixHex(spec.dark, '#000000', 0.3);
    ctx.beginPath();                                   // mũ trùm, khoét một hốc tối
    ctx.moveTo(cx - S * 0.2, by - S * 0.26);
    ctx.quadraticCurveTo(cx, by - S * 0.72, cx + S * 0.2, by - S * 0.26);
    ctx.quadraticCurveTo(cx, by - S * 0.16, cx - S * 0.2, by - S * 0.26);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // GẬY SỌ
    const gx = cx + dir * S * 0.34;
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = Math.max(1.2, cs * 0.09);
    ctx.beginPath();
    ctx.moveTo(gx, by + S * 0.44); ctx.lineTo(gx - dir * S * 0.04, by - S * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#e8e2d2';
    ctx.beginPath(); ctx.arc(gx - dir * S * 0.04, by - S * 0.66, S * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c22';
    ctx.beginPath();
    ctx.arc(gx - dir * S * 0.075, by - S * 0.68, S * 0.03, 0, Math.PI * 2);
    ctx.arc(gx - dir * S * 0.005, by - S * 0.68, S * 0.03, 0, Math.PI * 2);
    ctx.fill();
    if (chant > 0) {                                   // ba vòng bùa xanh khi đang vá
      ctx.strokeStyle = `rgba(126,214,160,${(0.85 * chant).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, cs * 0.08);
      for (let i = 0; i < 3; i++) {
        const rr = S * (0.16 + i * 0.1), ph = aTick * 0.12 + i * 2;
        ctx.beginPath();
        ctx.ellipse(gx - dir * S * 0.04, by - S * 0.66, rr, rr * 0.34, ph, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    eyeX = cx; eyeY = by - S * 0.34;
    eyeOpt = { spread: 0.08, r: 0.075, color: '#7ed6a0', glow: 'rgba(126,214,160,0.6)', brow: false };

  } else if (shape === 'ent') {
    // CỔ THỤ QUÁI. Thân là một khúc gỗ nứt nẻ, hai rễ làm chân, hai cành làm tay
    // với chùm nhánh nhọn ở đầu, và một vòm lá xác xơ trên đỉnh. Mắt cháy đỏ nằm
    // trong hốc cây.
    //
    // Nó cố tình mượn NGÔN NGỮ HÌNH của cái cây trên bản đồ (xem drawTree): người
    // xem đã học "hình này là cây, cây thì đứng yên và chặt được". Một cái cây
    // ĐANG ĐI về phía làng mình phá vỡ đúng cái luật đó, và không cần một dòng
    // giải thích nào.
    const by = cy + bob * 0.5;
    const step = Math.sin((aTick + u.id * 9) * 0.16);
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(2, cs * 0.2);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {                         // hai chân rễ
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.14, by + S * 0.18);
      ctx.lineTo(cx + s * S * 0.2 + s * step * S * 0.06, by + S * 0.44);
      ctx.lineTo(cx + s * S * 0.28 + s * step * S * 0.1, by + S * 0.62);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                   // thân cây, phình gốc
    ctx.moveTo(cx - S * 0.32, by + S * 0.26);
    ctx.quadraticCurveTo(cx - S * 0.25, by - S * 0.1, cx - S * 0.22, by - S * 0.5);
    ctx.lineTo(cx + S * 0.22, by - S * 0.5);
    ctx.quadraticCurveTo(cx + S * 0.25, by - S * 0.1, cx + S * 0.32, by + S * 0.26);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {                                     // vân vỏ cây
      ctx.strokeStyle = mixHex(spec.dark, '#000000', 0.2);
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(cx + i * S * 0.11, by + S * 0.2);
        ctx.lineTo(cx + i * S * 0.09, by - S * 0.42);
      }
      ctx.stroke();
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.strokeStyle = mixHex(spec.color, '#000000', 0.25);
    ctx.lineWidth = Math.max(1.6, cs * 0.15);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {                         // hai cành tay
      const sw = s * step * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.16, by - S * 0.3);
      ctx.lineTo(cx + s * S * 0.46, by - S * 0.16 + sw * S * 0.2);
      ctx.lineTo(cx + s * S * 0.58, by + S * 0.14 + sw * S * 0.2);
      ctx.stroke();
      if (cs >= 7) drawClaws(cx + s * S * 0.58, by + S * 0.14 + sw * S * 0.2,
                             Math.PI * 0.35, S * 0.2, s, cs, mixHex(spec.dark, '#ffffff', 0.25));
    }
    ctx.lineCap = 'butt';
    // Vòm lá: xanh úa chứ không xanh tươi — cây này chết rồi. Phải TO hơn thân
    // hẳn một quãng, nếu không cả cụm đọc ra là một cái bù nhìn có chổi trên đầu:
    // thứ nói "đây là CÂY" là tỉ lệ tán-trên-thân, không phải màu lá.
    ctx.fillStyle = '#4e5f2c';
    ctx.beginPath();
    ctx.arc(cx - S * 0.24, by - S * 0.6, S * 0.23, 0, Math.PI * 2);
    ctx.arc(cx + S * 0.26, by - S * 0.58, S * 0.21, 0, Math.PI * 2);
    ctx.arc(cx, by - S * 0.76, S * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b4a20';
    ctx.beginPath();                                   // mảng lá tối, cho tán có khối
    ctx.arc(cx + S * 0.1, by - S * 0.52, S * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14100a';
    ctx.beginPath();                                   // hốc cây (mồm)
    ctx.ellipse(cx, by - S * 0.14, S * 0.12, S * (0.07 + open * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
    eyeX = cx; eyeY = by - S * 0.36;
    eyeOpt = { spread: 0.13, r: 0.12, color: '#ffb44e', glow: 'rgba(255,150,50,0.85)' };

  } else if (shape === 'worldboss') {
    // ============================================================
    // THIÊN MA — con quái duy nhất do NGƯỜI XEM thả xuống
    // ============================================================
    // Đường bao phải khác MỌI thứ khác trên bản đồ ngay từ hình khối, vì nó là vật
    // thể duy nhất mà người xem cần tìm thấy trong một khung hình chật kín quân:
    // một thân RẮN CUỘN đứng dựng lên, không có chân — trong khi cả bảng còn lại là
    // thú bốn chân, khối đứng, hoặc hình thoi.
    //
    // BẢN 3.32 VẼ LẠI TOÀN BỘ, và lý do không phải thẩm mỹ. Bản 3.30 đúng về hình
    // KHỐI (thân cuộn đứng) nhưng cả con quái chỉ gồm một nét cong dày + bảy cái
    // gai + một cái đầu tam giác — tức là một đường bao TRƠN, mà đường bao trơn thì
    // đọc ra là "to", không đọc ra là "dữ". Sự dữ tợn nằm ở chỗ đường bao có bao
    // nhiêu MŨI NHỌN chĩa ra ngoài, và nó phải đọc được ở cỡ 9 px/ô, tức là trước
    // khi mắt kịp nhìn thấy bất cứ chi tiết nào bên trong. Bản này thêm bốn thứ,
    // cả bốn đều làm đổi chính cái đường bao:
    //   · ĐÔI CÁNH MÀNG có mép sau răng cưa, đập chậm — thứ duy nhất trên bản đồ
    //     rộng hơn thân của chính nó, và là thứ nhận ra được từ xa nhất.
    //   · HAI TAY VUỐT vươn về phía trước — không con quái nào khác vừa cuộn thân
    //     vừa có chi trước, nên nó không thể bị đọc nhầm thành một con Mãng Xà to.
    //   · VƯƠNG MIỆN BỐN SỪNG thay cho hai sừng cong.
    //   · ĐUÔI CÓ LƯỠI DAO quét ra sau, và một đám TÀN LỬA bay lên từ thân.
    const by = cy + bob;
    const pulse = 0.5 + 0.5 * Math.sin(aTick * 0.13 + u.id);
    // Quầng thần lực — vẽ TRƯỚC mọi thứ để nó là ánh sáng phía sau, không phải một
    // lớp sương phủ lên mặt. Rộng hơn bản cũ vì nó còn phải trùm được cả sải cánh.
    const haloR = S * (1.02 + pulse * 0.20);
    const halo = ctx.createRadialGradient(cx, by, S * 0.1, cx, by, haloR);
    halo.addColorStop(0, 'rgba(183,131,204,0.44)');
    halo.addColorStop(0.55, 'rgba(150,90,190,0.16)');
    halo.addColorStop(1, 'rgba(183,131,204,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, by, haloR, 0, Math.PI * 2);
    ctx.fill();

    // ============================================================
    // ĐƯỜNG SỐNG LƯNG — một cubic bezier, và LÀ NGUỒN SỰ THẬT DUY NHẤT
    // ============================================================
    // Bản nháp đầu của 3.32 đặt dãy gai bằng một công thức riêng ("−0,30 + f·0,52,
    // cộng sin(f·3,1)·0,18") rồi chỉnh tay cho khớp mắt. Nó khớp đúng ở một bộ tỉ
    // lệ, và vừa dày thân từ 0,34 lên 0,40·S là cả dãy gai rơi vào GIỮA lưng — nhìn
    // ra màn hình thành một nắm tam giác trắng vương vãi trên mình con quái chứ
    // không thành sống lưng. Đây đúng họ lỗi "hai công thức cùng mô tả một thứ" đã
    // trả giá nhiều lần trong dự án này (trường dẫn tới cái gần nhất, hộp bấm vs
    // hình vẽ): khi hai bản mô tả cùng tồn tại, bản thứ hai luôn là bản sai.
    // Giờ gai, cánh và đầu đều ĐỌC TOẠ ĐỘ từ chính đường cong này, nên đổi dáng
    // thân bao nhiêu lần cũng không lệch được nữa.
    const B0 = [cx - dir * S * 0.34, by + S * 0.52];
    const B1 = [cx + dir * S * 0.52, by + S * 0.34];
    const B2 = [cx - dir * S * 0.44, by - S * 0.10];
    const B3 = [cx + dir * S * 0.16, by - S * 0.40];
    const bezAt = (t) => {
      const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
      return [a * B0[0] + b * B1[0] + c * B2[0] + d * B3[0],
              a * B0[1] + b * B1[1] + c * B2[1] + d * B3[1]];
    };
    // Pháp tuyến chĩa về phía SAU LƯNG — tức phía ngược với hướng nhìn. Lấy từ tiếp
    // tuyến chứ không đoán: một thân uốn sóng đổi hướng ba lần trên đúng đoạn này.
    const bezNorm = (t) => {
      const m = 1 - t, a = 3 * m * m, b = 6 * m * t, c = 3 * t * t;
      const tx = a * (B1[0] - B0[0]) + b * (B2[0] - B1[0]) + c * (B3[0] - B2[0]);
      const ty = a * (B1[1] - B0[1]) + b * (B2[1] - B1[1]) + c * (B3[1] - B2[1]);
      const L = Math.hypot(tx, ty) || 1;
      let nx = -ty / L, ny = tx / L;
      if (nx * dir > 0) { nx = -nx; ny = -ny; }
      return [nx, ny, tx / L, ty / L];
    };

    // ---- ĐÔI CÁNH ---- vẽ trước thân để thân đè lên gốc cánh: chính chỗ bị che là
    // thứ nói rằng cánh mọc TỪ lưng nó, chứ không phải dán lên hai bên.
    //
    // MÀNG PHẢI TỐI HẲN, và bản nháp đầu đã sai đúng ở đây: nó pha màng 34% về phía
    // màu thân, nên hai cánh và cái thân bệt thành MỘT khối tím duy nhất — con quái
    // đọc ra là một cục, tức là mất trắng cả sải cánh, thứ đắt nhất trong bản vẽ.
    // Ở 12% thì cánh là một bóng tối phía sau và cái thân sáng nổi lên trước nó.
    // Mép sau răng cưa (ba nếp màng) là chi tiết rẻ nhất biến một hình bầu thành
    // một hình dữ — cùng lý lẽ đã viết ở drawRidge.
    // GỐC CÁNH đặt THẤP và LÙI về sau (0,16·S sau lưng, 0,14·S dưới vai) chứ không
    // ngay dưới đầu như bản nháp: ở đó nó trùng đúng chỗ cái đầu vừa được phóng to
    // ngồi lên, nên cánh phía trước bị đầu che gần trọn và con quái chỉ còn MỘT
    // cánh. Một đôi cánh mất một chiếc thì không đọc ra là cánh, nó đọc ra là một
    // mảng tối không rõ của cái gì.
    const flap = Math.sin((aTick + u.id * 7) * 0.15);
    const wsx = cx - dir * S * 0.16, wsy = by - S * 0.14;
    for (const s of [-1, 1]) {
      const span = S * (0.88 + flap * 0.10) * s;
      const rise = S * (0.46 + flap * 0.14);
      ctx.fillStyle = mixHex(spec.dark, spec.color, 0.12);
      ctx.strokeStyle = mixHex(spec.color, '#000000', 0.55);
      ctx.lineWidth = Math.max(1, cs * 0.08);
      ctx.beginPath();
      ctx.moveTo(wsx, wsy);
      ctx.quadraticCurveTo(wsx + span * 0.52, wsy - rise * 1.50, wsx + span, wsy - rise * 0.50);
      ctx.quadraticCurveTo(wsx + span * 0.80, wsy + S * 0.04, wsx + span * 0.66, wsy - S * 0.06);
      ctx.quadraticCurveTo(wsx + span * 0.52, wsy + S * 0.20, wsx + span * 0.38, wsy + S * 0.02);
      ctx.quadraticCurveTo(wsx + span * 0.24, wsy + S * 0.26, wsx, wsy + S * 0.18);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (cs >= 6) {
        // XƯƠNG NGÓN chạy từ gốc cánh TỚI MỘT ĐIỂM NẰM TRÊN CHÍNH MÉP TRƯỚC, lấy
        // bằng cách tính lại đúng cái quadratic vừa vẽ mép ấy. Bản nháp đặt đầu mút
        // bằng một công thức riêng ("0,30 + i·0,18" ngang, "0,50 − i·0,14" dọc) và
        // nó THÒ RA NGOÀI màng — ba vạch sáng lơ lửng cạnh cánh như ba sợi chỉ, vì
        // mép sau của cánh có ba nếp lượn vào trong mà công thức kia không biết.
        // Đây đúng con lỗi "hai công thức cùng tả một đường cong" đã bắt được ở dãy
        // gai lưng trong cùng bản này; lần thứ hai thì chữa bằng cùng một cách.
        const ex0 = wsx, ey0 = wsy;
        const cx1 = wsx + span * 0.52, cy1 = wsy - rise * 1.50;
        const ex1 = wsx + span, ey1 = wsy - rise * 0.50;
        ctx.strokeStyle = mixHex(spec.color, '#ffffff', 0.20);
        ctx.lineWidth = Math.max(0.8, cs * 0.055);
        ctx.beginPath();
        for (const t of [0.40, 0.66, 0.88]) {
          const m = 1 - t;
          ctx.moveTo(ex0, ey0);
          ctx.lineTo(m * m * ex0 + 2 * m * t * cx1 + t * t * ex1,
                     m * m * ey0 + 2 * m * t * cy1 + t * t * ey1);
        }
        ctx.stroke();
      }
    }

    // ---- ĐUÔI ---- quét ra phía sau và tận cùng bằng một LƯỠI DAO. Vẽ trước thân
    // vì gốc đuôi chui vào dưới khúc cuộn dưới cùng.
    const sway = Math.sin((aTick + u.id * 11) * 0.10) * S * 0.10;
    const tipX = cx - dir * S * 0.88, tipY = by + S * 0.22 + sway;
    ctx.strokeStyle = mixHex(spec.dark, spec.color, 0.30);
    ctx.lineWidth = S * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - dir * S * 0.24, by + S * 0.50);
    ctx.quadraticCurveTo(cx - dir * S * 0.68, by + S * 0.60 + sway, tipX, tipY);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#efe0f8';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.06);
    // Lưỡi dao mọc THẲNG từ chót đuôi, theo đúng tiếp tuyến của đường cong ở t=1
    // (hướng ≈ −0,20·S ngang, −0,38·S dọc) — không phải một tam giác đặt cạnh đuôi.
    // Nhỏ hơn bản nháp một phần ba: ở cỡ cũ nó to ngang cái đầu, và hai mũi nhọn
    // cùng cỡ ở hai đầu con vật thì mắt không biết đầu nào là đầu.
    ctx.beginPath();
    ctx.moveTo(tipX + dir * S * 0.04, tipY + S * 0.04);
    ctx.lineTo(tipX - dir * S * 0.11, tipY - S * 0.16);
    ctx.lineTo(tipX - dir * S * 0.01, tipY + S * 0.06);
    ctx.closePath(); ctx.fill();
    if (cs >= 8) ctx.stroke();

    // ---- THÂN CUỘN ---- một dải uốn sóng đi từ đuôi lên đầu, vẽ bằng đường viền
    // dày chứ không bằng đa giác — nét dày cho ra một thân TRÒN mà không phải tính
    // hai mép. Dày hơn bản cũ (0,34 -> 0,42·S) để nó chịu nổi sải cánh phía sau:
    // một thân mảnh giữa hai cánh to đọc ra là con dơi, không phải con rồng.
    ctx.strokeStyle = spec.dark;                       // viền tối vẽ TRƯỚC, nét to hơn
    ctx.lineWidth = S * 0.42 + Math.max(2, cs * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(B0[0], B0[1]);
    ctx.bezierCurveTo(B1[0], B1[1], B2[0], B2[1], B3[0], B3[1]);
    ctx.stroke();
    ctx.strokeStyle = hide;
    ctx.lineWidth = S * 0.42;
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.lineWidth = lw;

    // ---- VÂY LƯNG ---- mười gai bám ĐÚNG mép sau của thân: chân gai đặt ở
    // `nửa bề dày thân` dọc theo pháp tuyến, hai chân lệch nhau dọc theo tiếp
    // tuyến. Nhờ vậy gai luôn vuông góc với thân và luôn mọc ra NGOÀI đường bao —
    // đó là toàn bộ việc của một cái gai, và là thứ bản chép-tay-toạ-độ không giữ
    // được. Cao dần về phía đầu, và mỗi gai có viền tối: không viền thì ở cỡ nhỏ
    // cả dãy bệt thành một vệt sáng liền, tức là đường bao trơn trở lại.
    ctx.fillStyle = '#e8cef7';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.06);
    for (let i = 0; i < 10; i++) {
      const t = 0.05 + (i / 9) * 0.92;
      const [sx, sy] = bezAt(t);
      const [nx, ny, ux, uy] = bezNorm(t);
      const bx0 = sx + nx * S * 0.19, by0 = sy + ny * S * 0.19;
      const gh = S * (0.12 + t * 0.18), hw = S * 0.085;
      ctx.beginPath();
      ctx.moveTo(bx0 - ux * hw, by0 - uy * hw);
      ctx.lineTo(bx0 + nx * gh - ux * hw * 0.3, by0 + ny * gh - uy * hw * 0.3);
      ctx.lineTo(bx0 + ux * hw, by0 + uy * hw);
      ctx.closePath();
      ctx.fill();
      if (cs >= 8) ctx.stroke();
    }

    // ---- HAI TAY VUỐT ---- vươn về phía đang nhìn. Đây là chi tiết tách nó khỏi
    // MỌI con quái khác: không con nào vừa cuộn thân vừa có chi trước.
    const grasp = Math.sin((aTick + u.id * 5) * 0.18) * S * 0.05;
    for (const s of [-1, 1]) {
      const ax = cx + dir * S * 0.02, ay = by - S * (0.14 - s * 0.12);
      const ex = cx + dir * S * (0.46 + s * 0.06) + grasp, ey = by + S * (0.04 + s * 0.16);
      ctx.strokeStyle = spec.dark;                     // viền tối trước, cùng thủ pháp thân
      ctx.lineWidth = S * 0.12 + Math.max(1.4, cs * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx + dir * S * 0.34, by - S * (0.08 - s * 0.16), ex, ey);
      ctx.stroke();
      ctx.strokeStyle = hide;
      ctx.lineWidth = S * 0.12;
      ctx.stroke();
      // VUỐT NGẮN VÀ DÀY. Bản nháp để dài 0,24·S với nét mảnh cs·0,07 — tỉ lệ dài
      // trên dày quá lớn nên ba cái móng đọc ra thành ba SỢI RÂU bay lơ lửng khỏi
      // bàn tay. Móng vuốt là một thứ NGẮN, DÀY và CONG; cắt còn nửa chiều dài thì
      // chính tỉ lệ ấy nói ra điều đó mà không cần thêm nét nào.
      if (cs >= 6) drawClaws(ex, ey, Math.PI * (s > 0 ? 0.12 : -0.18), S * 0.13, dir, cs, '#efe0f8');
    }
    ctx.lineCap = 'butt';
    ctx.lineWidth = lw;

    // ---- ĐẦU ---- neo vào ĐẦU MÚT của đường sống lưng (B3) chứ không vào một toạ
    // độ riêng, cùng lý do đã viết ở khối bezier: đổi dáng thân thì cái đầu đi theo.
    //
    // TO HẲN so với bản nháp đầu (dài 0,40 -> 0,62·S). Sự dữ tợn sống ở cái ĐẦU, và
    // ở bản trước cái đầu chỉ bằng một khúc thân — nhìn ra màn hình con quái đọc
    // thành "con giun tím có cánh". Có GÒ MÀY nhô hẳn ra trên hốc mắt: đúng cái gờ
    // đó biến một cái đầu thằn lằn thành một cái đầu đang quắc, cùng lý lẽ đã viết
    // cho cặp lông mày ở monsterEyes.
    // Hình đầu là một CÁI NÊM: sọ rộng ở gáy, thuôn dần ra chóp mũi, cộng một gò
    // mày gãy góc. Bản nháp cho nó sáu cạnh gần đều nhau và bo góc bằng nét dày
    // 0,14·cs — ra một khối sáu cạnh tròn cạnh, đọc thành CÁI MŨ SẮT chứ không
    // thành cái đầu. Thứ nói "đầu thú" là chênh lệch bề rộng giữa gáy và mũi, và
    // `lineJoin: miter` để mấy góc còn là góc.
    const hx = B3[0] + dir * S * 0.06, hy = B3[1] - S * 0.06;
    ctx.fillStyle = hide;
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(1.2, cs * 0.10);
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(hx - dir * S * 0.28, hy - S * 0.04);     // gáy
    ctx.lineTo(hx - dir * S * 0.06, hy - S * 0.22);     // đỉnh sọ
    ctx.lineTo(hx + dir * S * 0.13, hy - S * 0.17);     // gò mày nhô ra trên hốc mắt
    ctx.lineTo(hx + dir * S * 0.40, hy - S * 0.01);     // chóp mũi
    ctx.lineTo(hx + dir * S * 0.35, hy + S * 0.11);
    ctx.lineTo(hx + dir * S * 0.02, hy + S * 0.22);     // góc hàm dưới
    ctx.lineTo(hx - dir * S * 0.26, hy + S * 0.13);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineJoin = 'round';

    // ---- VƯƠNG MIỆN BỐN SỪNG ---- hai sừng lớn quét ngược ra sau gáy + hai sừng
    // nhỏ chĩa lên. KHỐI THUÔN chứ không phải nét vẽ, và bản nháp đầu đã sai đúng
    // chỗ đó: ở mức thu phóng chơi thật một nét dày 0,13·cs đọc ra là sợi râu, không
    // đọc ra là sừng — thứ nói "sừng" là cái gốc DÀY thuôn dần về mũi nhọn.
    //
    // NGẮN LẠI so với bản nháp (0,56 -> 0,34·S). Ở chiều dài cũ cặp sừng dài gần
    // bằng nửa thân và hai đầu mút toả ra hai hướng rất khác nhau, nên cả cụm đọc ra
    // là một TIA CHỚP trắng cắm trên đầu chứ không phải một cặp sừng. Một cặp sừng
    // được nhận ra nhờ nó ĐỐI XỨNG và ÔM lấy sọ, không nhờ nó dài.
    ctx.fillStyle = '#efe0f8';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(0.9, cs * 0.07);
    for (const s of [-1, 1]) {
      const rx = hx - dir * S * 0.08, ry = hy - S * (0.13 + s * 0.02);
      const tx2 = hx - dir * S * (0.34 + s * 0.05), ty2 = hy - S * (0.32 + s * 0.12);
      ctx.beginPath();
      ctx.moveTo(rx, ry - S * 0.06);
      ctx.quadraticCurveTo(hx - dir * S * 0.24, hy - S * (0.34 + s * 0.09), tx2, ty2);
      ctx.quadraticCurveTo(hx - dir * S * 0.20, hy - S * (0.22 + s * 0.07), rx, ry + S * 0.06);
      ctx.closePath(); ctx.fill();
      if (cs >= 7) ctx.stroke();
    }
    for (const s of [0, 1]) {                          // hai sừng nhỏ chĩa lên
      const bx0 = hx - dir * S * (0.02 + s * 0.12);
      ctx.beginPath();
      ctx.moveTo(bx0 - S * 0.045, hy - S * 0.15);
      ctx.lineTo(bx0 - dir * S * 0.05, hy - S * (0.34 - s * 0.07));
      ctx.lineTo(bx0 + S * 0.045, hy - S * 0.15);
      ctx.closePath(); ctx.fill();
    }
    // MÕM PHẢI NẰM TRONG CÁI ĐẦU. Bản nháp đặt mõm rộng 0,32·S bắt đầu ở +0,14·S,
    // tức mép ngoài chạm 0,46·S trong khi chóp mũi của khối đầu chỉ tới 0,36·S —
    // nên hàm răng thò hẳn ra ngoài đường bao và đọc thành một cái LƯỢC trắng dán
    // cạnh mặt. Cùng họ lỗi "hai hình cùng tả một thứ mà không đọc chung một nguồn"
    // đã bắt được ở dãy gai ngay trên: giờ cả hai số đều suy từ chóp mũi 0,36·S.
    drawMaw(hx + dir * S * 0.08, hy + S * 0.04, S * 0.25, S * 0.17, open, dir, spec.dark, cs);

    // ---- TÀN LỬA ---- bốn đốm bay lên men theo thân, pha lệch nhau. Nguồn sáng
    // duy nhất trên bản đồ không đến từ mặt trời, và đây là thứ khiến con quái
    // trông như đang CHÁY chứ không chỉ đang phát sáng. Bốn chứ không sáu, và toàn
    // sắc ẤM: bản sáu đốm hai màu rắc thêm chấm tím lên một con quái vốn đã tím,
    // nên nửa số đốm biến thành nhiễu trên chính thân nó.
    // Điểm xuất phát lấy TRÊN sống lưng rồi đẩy ra ngoài theo pháp tuyến — cùng
    // nguồn toạ độ với dãy gai. Bản nháp thả chúng dọc một đường thẳng qua giữa
    // thân, nên bốn đốm lửa nằm ĐÈ LÊN mình con quái và đọc ra thành bốn nốt tàn
    // nhang cam, không ra thành tàn lửa bay lên.
    if (cs >= 6) {
      for (let i = 0; i < 4; i++) {
        const ph = ((aTick * 0.018 + i * 0.29 + u.id * 0.11) % 1);
        const [ox, oy] = bezAt(0.12 + i * 0.24);
        const [nx, ny] = bezNorm(0.12 + i * 0.24);
        const ex = ox + nx * S * 0.42 + Math.sin(ph * 6.0 + i) * S * 0.10;
        const ey = oy + ny * S * 0.42 - ph * S * 0.95;
        ctx.globalAlpha = (1 - ph) * 0.7;
        ctx.fillStyle = i % 2 ? '#ffcf7a' : '#ff9d54';
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(0.8, cs * 0.085 * (1 - ph * 0.5)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // TRẢ LẠI TRẠNG THÁI MẶC ĐỊNH của ngữ cảnh vẽ. Nhánh này là nhánh duy nhất
    // trong drawMonster đụng tới `lineJoin`, và bản 3.30 đặt nó thành 'round' rồi
    // bỏ đấy — mọi hình vẽ sau đó trong cùng khung hình đều thừa hưởng, im lặng.
    // Chưa ai thấy vì Thiên Ma hiếm khi có mặt; đó đúng là loại rò rỉ chỉ lộ ra
    // vào ngày nó có mặt.
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.lineWidth = lw;
    eyeX = hx + dir * S * 0.10; eyeY = hy - S * 0.03;
    eyeOpt = { spread: 0.05, r: 0.10, color: '#ffe08a', glow: 'rgba(255,150,40,0.95)' };

  } else {
    // QUỶ ĐÁ (troll). Bản 3.7 là hình thoi có sừng — hình quen mặt nhất của cả
    // bảng, nên nó được giữ làm KHỐI CHÍNH (đổi hẳn đi thì người xem cũ mất mốc
    // so sánh), nhưng giờ có thêm thân người khom, hai tay dài quét đất, và
    // những phiến đá gai trên lưng. Tên nó là Quỷ ĐÁ mà suốt bốn phiên bản trên
    // người nó không có lấy một hòn đá nào.
    const by = cy + bob;
    ctx.strokeStyle = spec.dark; ctx.lineWidth = Math.max(1.8, cs * 0.16);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {                         // chân trụ
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.16, by + S * 0.2);
      ctx.lineTo(cx + s * S * 0.24, by + S * 0.56);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                   // khối thân hình thoi
    ctx.moveTo(cx, by - S * 0.54);
    ctx.lineTo(cx + S * 0.46, by + S * 0.02);
    ctx.lineTo(cx + S * 0.2, by + S * 0.44);
    ctx.lineTo(cx - S * 0.2, by + S * 0.44);
    ctx.lineTo(cx - S * 0.46, by + S * 0.02);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawRidge(cx - S * 0.4, by - S * 0.1, cx + S * 0.4, by - S * 0.1,
              4, S * 0.26, mixHex(spec.color, '#000000', 0.25), spec.dark, cs);
    ctx.fillStyle = hide;
    ctx.beginPath();                                   // hai tay dài quét đất
    for (const s of [-1, 1]) {
      const sw = Math.sin((aTick + u.id * 9) * 0.22 + (s > 0 ? 0 : 1.6)) * 0.16;
      ctx.moveTo(cx + s * S * 0.34, by - S * 0.14);
      ctx.lineTo(cx + s * S * (0.56 + sw), by + S * 0.3);
      ctx.lineTo(cx + s * S * (0.42 + sw), by + S * 0.36);
      ctx.lineTo(cx + s * S * 0.22, by - S * 0.08);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) for (const s of [-1, 1]) {
      drawClaws(cx + s * S * 0.5, by + S * 0.34, Math.PI * 0.42, S * 0.18, s, cs, '#cdd3cf');
    }
    ctx.strokeStyle = '#c9bcd6';                       // hai sừng
    ctx.lineWidth = Math.max(1.2, cs * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.22, by - S * 0.42); ctx.lineTo(cx - S * 0.4, by - S * 0.76);
    ctx.moveTo(cx + S * 0.22, by - S * 0.42); ctx.lineTo(cx + S * 0.4, by - S * 0.76);
    ctx.stroke();
    ctx.lineCap = 'butt';
    drawMaw(cx + dir * S * 0.04, by - S * 0.2, S * 0.24, S * 0.22, open, dir, spec.dark, cs);
    eyeX = cx; eyeY = by - S * 0.32;
    eyeOpt = { spread: 0.13, r: 0.09 };
  }

  // Mắt vẽ SAU CÙNG, một cửa duy nhất cho cả 12 loài. Mỗi nhánh ở trên chỉ đặt
  // toạ độ và tuỳ chọn rồi thôi — nếu để mỗi nhánh tự vẽ mắt thì 12 bản chép của
  // cùng một đoạn, và lần chỉnh sau sẽ chỉ chỉnh được vài bản trong số đó.
  if (cs >= 8 || (cs >= 5 && S > cs * 1.6)) monsterEyes(eyeX, eyeY, S, cs, eyeOpt || {});

  // Bị trúng độc thì hiện thêm một chấm xanh nhỏ trên đầu — không có dấu hiệu này
  // thì "quân tự tụt máu sau khi đã thắng trận" trông y hệt một con bug.
  if (u.venomUntil > tick && cs >= 8) {
    ctx.fillStyle = '#8fae52';
    ctx.beginPath(); ctx.arc(cx, cy - S * 0.75 + bob, Math.max(1, cs * 0.11), 0, Math.PI * 2); ctx.fill();
  }

  if (u.hp < u.maxHp) {
    const w = S * 1.05, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = '#a86ac6';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// Ba cấp hang có ba bảng màu riêng. Cấp không được phép chỉ là một con số trong
// bảng thông tin: nếu người xem không NHÌN THẤY cái hang đang già đi thì cơ chế
// nuôi hang chỉ là một cột số, và câu chuyện "vạt rừng đó mỗi năm một dữ hơn"
// không bao giờ được kể ra.
const LAIR_TIER_SKIN = [
  { rock: '#2a1f3d', edge: '#7e57c2', glow: '126,87,194', scale: 3.0 },
  { rock: '#3a1030', edge: '#a86ac6', glow: '186,104,200', scale: 3.6 },
  { rock: '#3d0d15', edge: '#e04b32', glow: '244,67,54',   scale: 4.4 }
];
function lairSkin(l) { return LAIR_TIER_SKIN[clamp((l.tier || 1) - 1, 0, 2)]; }

function drawLair(l, px, py, cs) {
  const skin = lairSkin(l);
  const S = cs * skin.scale;
  drawShadow(px + cs / 2, py + cs * 0.9, S * 0.42, S * 0.18);
  // Quầng thở đều: dấu hiệu "vùng đất nguy hiểm" nhìn từ xa. Đây là thứ khiến
  // người xem tự thấy được vì sao một bộ lạc lại vòng tránh cả một vạt rừng giàu gỗ.
  // Bán kính lấy theo CẤP của chính cái hang này, không phải hằng số toàn cục —
  // đó là toàn bộ điểm của việc cho hang lớn lên: vòng nguy hiểm phải nở ra thật.
  const pulse = 0.5 + 0.5 * Math.sin(aTick * 0.05 + l.id);
  const R = lairRoam(l) * cs;
  const grad = ctx.createRadialGradient(px + cs / 2, py + cs / 2, 0, px + cs / 2, py + cs / 2, R);
  grad.addColorStop(0, `rgba(${skin.glow},${0.16 + (l.tier - 1) * 0.05})`);
  grad.addColorStop(0.65, `rgba(${skin.glow},0.06)`);
  grad.addColorStop(1, `rgba(${skin.glow},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, R, 0, Math.PI * 2); ctx.fill();

  const cx = px + cs / 2, cy = py + cs / 2;
  // Gai đá mọc thêm theo cấp — bóng dáng cái hang tự nói ra nó đã già cỡ nào.
  if (l.tier > 1) {
    ctx.fillStyle = skin.rock;
    ctx.strokeStyle = skin.edge;
    ctx.lineWidth = Math.max(1, cs * 0.12);
    const spikes = l.tier === 2 ? 4 : 7;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + l.id * 0.7;
      const bx = cx + Math.cos(a) * S * 0.52, by = cy + S * 0.22 + Math.sin(a) * S * 0.2;
      const h = S * (0.3 + 0.18 * ((i + l.id) % 3));
      ctx.beginPath();
      ctx.moveTo(bx - S * 0.1, by); ctx.lineTo(bx, by - h); ctx.lineTo(bx + S * 0.1, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = skin.rock;
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.5, cy + S * 0.35);
  ctx.quadraticCurveTo(cx, cy - S * 0.55, cx + S * 0.5, cy + S * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = skin.edge;
  ctx.lineWidth = Math.max(1.5, cs * 0.16);
  ctx.stroke();
  // Miệng hang tối om, có ánh mắt đỏ nhấp nháy bên trong.
  ctx.fillStyle = '#0a0710';
  ctx.beginPath();
  ctx.ellipse(cx, cy + S * 0.2, S * 0.26, S * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,82,82,${0.35 + 0.5 * pulse})`;
  ctx.beginPath(); ctx.arc(cx - S * 0.08, cy + S * 0.2, Math.max(1, cs * 0.1), 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + S * 0.08, cy + S * 0.2, Math.max(1, cs * 0.1), 0, Math.PI * 2); ctx.fill();

  const w = S * 0.95, h = Math.max(2, cs * 0.15);
  const r = clamp(l.hp / l.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(cx - w / 2, py - cs * 0.9, w, h);
  ctx.fillStyle = skin.edge;
  ctx.fillRect(cx - w / 2, py - cs * 0.9, w * r, h);

  // Thanh NUÔI nằm ngay dưới thanh máu: người xem thấy được cái hang đang tiến
  // tới cấp sau nhanh cỡ nào, tức là thấy được cái giá của việc bỏ mặc nó. Thiếu
  // thanh này thì mỗi lần lên cấp là một cú giật bất ngờ không có báo trước, và
  // người xem không bao giờ liên hệ được nó với số lính mình vừa mất ở đó.
  const nextAt = CONFIG.MONSTER.FEED.TIER_AT[l.tier];
  if (nextAt !== undefined && cs >= 5) {
    const prevAt = CONFIG.MONSTER.FEED.TIER_AT[l.tier - 1] || 0;
    const fr = clamp((l.feed - prevAt) / (nextAt - prevAt), 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py - cs * 0.9 + h + 1, w, Math.max(1.5, h * 0.6));
    ctx.fillStyle = '#e0a825';
    ctx.fillRect(cx - w / 2, py - cs * 0.9 + h + 1, w * fr, Math.max(1.5, h * 0.6));
  }

  if (cs >= 6) {
    queueLabel(lairTierSpec(l).name, cx, py - cs * 1.3,
               `600 ${Math.max(9, Math.round(cs * 1.2))}px ${F_UI}`, skin.edge, 1);
  }
}

function drawGroundItem(it, px, py, cs) {
  const spec = CONFIG.ITEM.TYPES[it.key];
  const float = Math.sin((aTick + it.id * 11) * 0.12) * cs * 0.25;
  const cx = px + cs / 2, cy = py + cs / 2 + float;
  const age = tick - it.born;
  // Nhấp nháy nhanh dần khi sắp tan biến — người xem biết mình sắp mất món đồ.
  const dying = age > CONFIG.ITEM.LIFETIME - 400;
  if (dying && Math.floor(aTick / 8) % 2 === 0) return;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs * 1.6);
  glow.addColorStop(0, spec.color + '66');
  glow.addColorStop(1, spec.color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, cs * 1.6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = spec.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - cs * 0.5);
  ctx.lineTo(cx + cs * 0.42, cy);
  ctx.lineTo(cx, cy + cs * 0.5);
  ctx.lineTo(cx - cs * 0.42, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (cs >= 9) {
    ctx.textAlign = 'center';
    ctx.font = `${Math.round(cs * 0.9)}px -apple-system, Segoe UI, sans-serif`;
    ctx.fillText(spec.icon, cx, cy + cs * 0.32);
  }
}

// Hào quang chỉ huy vẽ RIÊNG một lượt, trước mọi đơn vị — nếu vẽ trong drawUnit
// thì vòng tròn bán kính 10 ô sẽ đè lên chính đám lính đứng trong nó.
function drawHeroAuras(cs) {
  for (const u of units) {
    if (u.type !== 'hero' || u.commandMult <= 1.001) continue;
    const [px, py] = worldToPx(uRX(u), uRY(u));
    if (!inView(px, py, u.auraR * cs + cs * 2)) continue;
    const cx = px + cs / 2, cy = py + cs / 2;
    const t = tribes[u.tribeId];
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, u.auraR * cs);
    grad.addColorStop(0, t.color + '00');
    grad.addColorStop(0.72, t.color + '00');
    grad.addColorStop(1, t.color + '38');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, u.auraR * cs, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -aTick * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, u.auraR * cs, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

// VÒNG TIẾP TẾ của trại. Vẽ ở lượt MẶT ĐẤT, cùng chỗ với hào quang chỉ huy, chứ
// không vẽ trong drawBuilding — và lý do là thứ tự chiều sâu: drawBuilding chạy
// giữa danh sách đã sắp theo chân, nên một vòng tròn tô ở đó sẽ phủ lên mọi người
// lính đã được vẽ phía trên nó. Cái vòng này là MẶT ĐẤT, và mặt đất thì phải nằm
// dưới tất cả.
//
// Hai lớp, và cả hai đều mang thông tin chứ không phải trang trí: vành tô loang
// nói "tới đây là hết tầm", còn vòng nét đứt CHẠY (lineDashOffset theo aTick) nói
// "cái trại này còn sống". Ở đúng lúc nó sắp hết hạn thì cả hai mờ dần đi — người
// xem đọc được cái đồng hồ mà không cần một con số nào.
function drawCampRings(cs) {
  for (const b of buildings) {
    if (b.type !== 'camp' || b.hp <= 0 || !b.done) continue;
    const t = tribes[b.tribeId];
    if (!t) continue;
    const R = supplyStats(t).reach;
    const [px, py] = worldToPx(b.x, b.y);
    if (!inView(px, py, R * cs + cs * 2)) continue;
    const cx = px + cs / 2, cy = py + cs / 2;
    // Mờ dần trong 260 tick cuối đời. Không tắt phụt: một cái trại biến mất không
    // báo trước đọc ra là một lỗi, còn một cái trại nhạt dần đọc ra là hết lương.
    const left = (b.expireAt || 0) - tick;
    const fade = clamp(left / 260, 0.15, 1);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * cs);
    grad.addColorStop(0, '#d8b25c00');
    grad.addColorStop(0.66, '#d8b25c00');
    grad.addColorStop(1, '#d8b25c2e');
    ctx.globalAlpha = fade;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R * cs, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d8b25c';
    ctx.globalAlpha = 0.34 * fade;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -aTick * 0.2;
    ctx.beginPath(); ctx.arc(cx, cy, R * cs, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------
// Hiệu ứng
// ------------------------------------------------------------
// Một NHÁT CHÉM = một nét bút. Trong sơn mài, đường kiếm không phải một sợi
// chỉ thẳng nối hai chấm — nó là một vệt lưỡi liềm, phồng ở giữa, nhọn ở hai
// đầu, như cú vẩy của một ngọn bút lông. Dựng bằng hai đường bậc hai: mép dẫn
// (phía trước cú vung) phồng ra, mép sau lượn nhẹ trở về; giữa chúng là thân
// lưỡi. Toạ độ dựng trong hệ CỤC BỘ (u dọc theo trục hai mũi, v theo hướng
// đánh) rồi xoay về hướng thật — nhờ vậy một hàm lo được nhát chém ở mọi góc.
function strokeCrescent(cx, cy, ang, L, B, color, alpha) {
  const s = Math.sin(ang), c = Math.cos(ang);
  const P = (u, v) => [cx - u * s + v * c, cy + u * c + v * s];
  const [p0x, p0y] = P(-L, 0);
  const [p1x, p1y] = P(L, 0);
  const [ocx, ocy] = P(0, B);          // mép dẫn — cạnh sáng của lưỡi
  const [icx, icy] = P(0, B * 0.42);   // mép sau — thân lưỡi lượn về
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  ctx.quadraticCurveTo(ocx, ocy, p1x, p1y);
  ctx.quadraticCurveTo(icx, icy, p0x, p0y);
  ctx.fill();
}

function drawFx(f, cs) {
  const t = f.life / f.maxLife;
  const PI2 = Math.PI * 2;
  if (f.type === 'slash') {
    // Nét chém cong, tâm đặt ~70% quãng đường về phía mục tiêu — nơi lưỡi thật
    // sự chạm vào. Hai lớp: một vệt MÀU PHE mềm (bột màu của cú đánh) và một
    // LÕI XƯƠNG SÁNG mảnh hơn nằm trong — cùng cách một nét sơn mài có lớp son
    // lót và lớp bạc phủ. Vung lớn dần trong một phần tư đời rồi cả nhát tàn đi.
    const [ax, ay] = worldToPx(f.x1 + 0.5, f.y1 + 0.5);
    const [bx, by] = worldToPx(f.x2 + 0.5, f.y2 + 0.5);
    const ang = Math.atan2(by - ay, bx - ax);
    const cx = ax + (bx - ax) * 0.72, cy = ay + (by - ay) * 0.72;
    const grow = Math.min(1, (1 - t) / 0.3);
    const L = cs * (0.72 + 0.5 * grow);
    const B = cs * (0.46 + 0.32 * grow);
    strokeCrescent(cx, cy, ang, L * 1.12, B * 1.16, f.color, t * 0.5);
    strokeCrescent(cx, cy, ang, L * 0.88, B * 0.76, '#f3ead2', t * 0.92);
    // Ánh loé tại điểm chạm, chỉ mấy khung đầu — cái chấm sáng nói "trúng ở đây".
    if (t > 0.5) {
      ctx.globalAlpha = (t - 0.5) / 0.5;
      ctx.fillStyle = '#fff6e6';
      ctx.beginPath(); ctx.arc(bx, by, cs * 0.32 * ((t - 0.5) / 0.5), 0, PI2); ctx.fill();
    }
  } else if (f.type === 'death') {
    // Cái chết = bột màu VĂNG RA. Một quầng màu phe loang rộng rồi tắt, và những
    // mảnh sắc tố bắn tung theo hình nan quạt rồi RƠI xuống theo trọng lực — như
    // sơn được hất khỏi đầu bút. Đây là thứ cho một cú hạ gục sức nặng: trước
    // đó, quân biến mất lặng lẽ giữa đám đông và mắt không kịp ghi nhận ai vừa ngã.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const prog = 1 - t, sc = f.scale || 1;
    ctx.globalAlpha = t * 0.5;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(1, cs * 0.2) * t;
    // Math.max(0,…): bán kính âm ném IndexSizeError và làm HỎNG cả khung hình,
    // không chỉ hiệu ứng này — một cái chốt rẻ để một FX lệch giờ không kéo sập
    // toàn bộ bản vẽ.
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, prog * cs * 1.9 * sc), 0, PI2); ctx.stroke();
    ctx.globalAlpha = t;
    ctx.fillStyle = f.color;
    const nD = 8;
    for (let i = 0; i < nD; i++) {
      const a = (i / nD) * PI2 + f.seed;
      const sp = 0.55 + hash01(i, f.seed) * 0.85;
      const d = prog * cs * 2.3 * sc * sp;
      const fall = prog * prog * cs * 1.3 * sc;   // trọng lực kéo mảnh vỡ rơi
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + fall, cs * 0.17 * sc * t + 0.5, 0, PI2);
      ctx.fill();
    }
  } else if (f.type === 'arrow') {
    // Mũi tên bay: nội suy vị trí theo phần đời đã trôi qua.
    const p = 1 - t;
    const ax = f.x1 + (f.x2 - f.x1) * p, ay = f.y1 + (f.y2 - f.y1) * p;
    const [x, y] = worldToPx(ax + 0.5, ay + 0.5);
    const ang = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#f0cda6';
    ctx.lineWidth = Math.max(1, cs * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * cs * 0.5, y - Math.sin(ang) * cs * 0.5);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (f.type === 'bolt') {
    // MŨI LAO XUYÊN của nỏ thần. Khác 'arrow' ở đúng một điểm, và điểm đó là cả
    // cơ chế: nó vẽ TRỌN đoạn thẳng từ người bắn tới hết tầm xuyên, không vẽ một
    // mũi tên nhỏ đang bay dọc đoạn đó. Người xem phải thấy CÁI ĐƯỜNG, vì cái
    // đường mới là thứ quyết định ai trúng — mọi kẻ địch nằm trên nó đều dính đòn.
    // Một chấm đang bay chỉ nói "có bắn"; một vạch sáng nói "cả hàng này vừa ăn đạn".
    const [x1, y1] = worldToPx(f.x1 + 0.5, f.y1 + 0.5);
    const [x2, y2] = worldToPx(f.x2 + 0.5, f.y2 + 0.5);
    // Loé mạnh rồi tắt nhanh. `t` = life/maxLife nên nó chạy 1 -> 0 theo tuổi;
    // bình phương nó cho một cú chớp dứt khoát thay vì một vệt nhạt dần đều —
    // vệt nhạt đều trông như khói, mà đây là một mũi lao.
    ctx.globalAlpha = 0.9 * t * t;
    ctx.strokeStyle = '#f6e7c0';
    ctx.lineWidth = Math.max(1.2, cs * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = f.color || '#d8a544';        // lõi màu bộ lạc: đọc ra của ai
    ctx.lineWidth = Math.max(0.8, cs * 0.09);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (f.type === 'rock') {
    // Đạn đá bay theo VÒNG CUNG, không phải đường thẳng. Đây là khác biệt duy nhất
    // giữa "bắn" và "ném" mà mắt đọc được, và nó đáng giá vì nó nói đúng luật chơi:
    // máy bắn đá bắn qua đầu quân nhà, mũi tên thì không.
    const p = 1 - t;
    const ax = f.x1 + (f.x2 - f.x1) * p, ay = f.y1 + (f.y2 - f.y1) * p;
    const lift = Math.sin(p * Math.PI) * dist(f.x1, f.y1, f.x2, f.y2) * 0.22;
    const [x, y] = worldToPx(ax + 0.5, ay + 0.5 - lift);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#8c8f89';
    ctx.beginPath(); ctx.arc(x, y, cs * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x - cs * 0.1, y - cs * 0.1, cs * 0.13, 0, Math.PI * 2); ctx.fill();
    // Bóng đổ dưới đất chạy theo — thiếu nó thì quả đá trông như đang trượt ngang
    // trên mặt cỏ chứ không phải bay trên trời.
    const [sx, sy] = worldToPx(ax + 0.5, ay + 0.5);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, sy, cs * 0.3, cs * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  } else if (f.type === 'offering') {
    // Tế phẩm: khói vàng bốc lên từ nóc đền. Nhỏ và thường xuyên — nó không phải
    // một sự kiện, nó là NHỊP SỐNG của một bộ lạc sùng đạo, và mắt phải đọc được
    // "bên này thờ cúng nhiều hơn bên kia" mà không cần nhìn bảng số nào.
    const p = 1 - t;
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    ctx.globalAlpha = t * 0.8;
    ctx.fillStyle = '#d8a544';
    for (let i = 0; i < 3; i++) {
      const ph = (p + i * 0.33) % 1;
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 6 + i) * cs * 0.5, y - cs * (1.4 + ph * 2.6), cs * (0.16 + ph * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === 'blessing') {
    // Phước lành: cột sáng từ trời rơi xuống + vòng sáng loang ra. Cố tình vẽ
    // NGƯỢC hướng với tế phẩm (trên xuống, thay vì dưới lên) — hai chiều đó là
    // cách rẻ nhất để hình ảnh nói ra chính cái vòng lặp đang diễn ra.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const p = 1 - t;
    ctx.globalAlpha = t * 0.55;
    const grd = ctx.createLinearGradient(0, y - cs * 30, 0, y);
    grd.addColorStop(0, 'rgba(255,241,118,0)');
    grd.addColorStop(1, 'rgba(255,241,118,0.85)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - cs * 1.6, y - cs * 30, cs * 3.2, cs * 30);
    ctx.globalAlpha = t * 0.9;
    ctx.strokeStyle = '#f7e3a8';
    ctx.lineWidth = Math.max(1.5, cs * 0.3) * t;
    ctx.beginPath(); ctx.ellipse(x, y, p * cs * 9, p * cs * 3.6, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === 'ageup') {
    // Lên thời đại: vòng sáng nở ra từ kinh đô. Trước bản này việc lên thời đại
    // chỉ có một dòng chữ trong nhật ký — sự kiện lớn nhất của nửa đầu kỷ nguyên
    // mà không có gì xảy ra trên màn hình.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const p = 1 - t;
    ctx.globalAlpha = t * 0.85;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(1.5, cs * 0.35) * t;
    ctx.beginPath(); ctx.arc(x, y, p * cs * 11, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d8a544';
    ctx.lineWidth = Math.max(1, cs * 0.2) * t;
    ctx.beginPath(); ctx.arc(x, y, p * cs * 7, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === 'spark') {
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const prog = 1 - t;
    if (f.dir !== undefined) {
      // ĐÒN TRÚNG. Một chớp trắng nóng ở tâm + những tia mảnh bắn TỚI TRƯỚC theo
      // hướng đánh (nan quạt hẹp quanh f.dir), thon như tia lửa nảy khi thép chạm
      // thép. Đây là thứ tách "một cú va chạm" khỏi "một đốm sáng lơ lửng".
      ctx.globalAlpha = t * 0.9;
      ctx.fillStyle = '#fff3df';
      ctx.beginPath(); ctx.arc(x, y, cs * 0.24 * t + 0.6, 0, PI2); ctx.fill();
      ctx.globalAlpha = t;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = Math.max(1, cs * 0.13) * t;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const nS = 5, seed = f.seed || 1;
      for (let i = 0; i < nS; i++) {
        const a = f.dir + (i / (nS - 1) - 0.5) * 1.5 + (hash01(i, seed) - 0.5) * 0.5;
        const d0 = prog * cs * 0.45, d1 = prog * cs * (1.0 + hash01(i + 3, seed) * 0.8);
        ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
        ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      // Đốm lấp lánh vô hướng: dùng cho lúc hái lượm, quái mới nở… — không phải
      // va chạm, nên giữ nhẹ như bản cũ, chỉ bốn chấm toả tròn.
      ctx.globalAlpha = t;
      ctx.fillStyle = f.color;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI2 + f.life;
        const d = prog * cs * 1.1;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cs * 0.14 * t + 0.5, 0, PI2);
        ctx.fill();
      }
    }
  } else if (f.type === 'boom') {
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    ctx.globalAlpha = t * 0.8;
    ctx.strokeStyle = '#e09a3c';
    ctx.lineWidth = Math.max(1.5, cs * 0.3) * t;
    ctx.beginPath();
    ctx.arc(x, y, (1 - t) * cs * f.r * 2.4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (f.type === 'bolt') {
    // Tia sét của Chúa Tể: đường gãy khúc từ trên trời xuống.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    ctx.globalAlpha = t;
    ctx.strokeStyle = '#f7e3a8';
    ctx.lineWidth = Math.max(2, cs * 0.4);
    ctx.beginPath();
    ctx.moveTo(x, y - cs * 30);
    for (let i = 1; i <= 6; i++) {
      ctx.lineTo(x + (hash01(i, f.seed) - 0.5) * cs * 3, y - cs * 30 + (cs * 30 * i) / 6);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------
// Lãnh thổ
// ------------------------------------------------------------
function renderTerritory(cs) {
  if (!territoryOwner) return;
  const C = CONFIG.TERRITORY.CELL;
  const tx0 = Math.max(0, Math.floor(camX / C) - 1);
  const ty0 = Math.max(0, Math.floor(camY / C) - 1);
  const tx1 = Math.min(terrW - 1, Math.ceil((camX + CONFIG.VIEWPORT_WIDTH) / C));
  const ty1 = Math.min(terrH - 1, Math.ceil((camY + CONFIG.VIEWPORT_HEIGHT) / C));
  const size = C * cs;

  // Ba lớp: RUỘT rất mờ, VIỀN TRONG đậm hơn, rồi mới tới nét biên giới.
  //
  // Hai lần thử trước đều hỏng theo hai hướng đối nhau. Ruột 0,11 / nét 0,75: khi
  // phần thân của lãnh thổ nằm ngoài khung hình thì thứ còn lại trên màn hình là
  // đúng một cái khung rỗng lơ lửng, mắt đọc thành "một vật thể" chứ không thành
  // "mép của một vùng". Ruột 0,15 phẳng: tới lúc một bộ lạc nuốt gần hết bản đồ,
  // cả khung hình bị phủ một lớp màu của nó và mặt đất mất sạch màu thật.
  //
  // Viền trong giải cả hai: gần biên giới thì đậm (nên một mảnh lãnh thổ ở rìa
  // khung hình vẫn đọc ra là một VÙNG), còn sâu trong lòng thì gần như trong suốt
  // (nên phủ kín bản đồ cũng không nhuộm màu bản đồ). Đây cũng đúng cách một tấm
  // bản đồ chính trị vẽ biên giới: đậm ở đường ranh, nhạt dần vào trong.
  const isEdge = (tx, ty, o) =>
    terrOwnerAt(tx + 1, ty) !== o || terrOwnerAt(tx - 1, ty) !== o ||
    terrOwnerAt(tx, ty + 1) !== o || terrOwnerAt(tx, ty - 1) !== o;

  // RUỘT: một lệnh blit lớp tô sẵn, phóng to có nội suy -> mảng màu loang mềm.
  if (territoryTint.width) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.13;
    const [ox, oy] = worldToPx(0, 0);
    ctx.drawImage(territoryTint, 0, 0, terrW, terrH,
                  ox, oy, terrW * C * cs, terrH * C * cs);
    ctx.globalAlpha = 1;
  }

  // VIỀN TRONG: dày lên ở sát biên. Gần biên giới thì đậm (nên một mảnh lãnh
  // thổ ở rìa khung hình vẫn đọc ra là một VÙNG), còn sâu trong lòng thì gần
  // như trong suốt (nên phủ kín bản đồ cũng không nhuộm màu bản đồ).
  ctx.globalAlpha = 0.1;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const owner = terrOwnerAt(tx, ty);
      if (owner < 0 || !isEdge(tx, ty, owner)) continue;
      const [px, py] = worldToPx(tx * C, ty * C);
      ctx.fillStyle = tribes[owner].color;
      ctx.fillRect(px, py, size, size);
    }
  }
  ctx.globalAlpha = 1;

  // Biên giới: chỉ vẽ cạnh nơi chủ quyền ĐỔI, và vẽ HAI LƯỢT — một nét sẫm dày
  // lót dưới, rồi nét màu bộ lạc mảnh hơn đè lên. Nét đơn màu sáng trên nền
  // sáng (bờ cát, ruộng lúa) thì biến mất; có lót sẫm thì biên giới đọc được
  // trên MỌI loại mặt đất, đúng cách một tấm bản đồ in kẻ đường ranh.
  ctx.lineCap = 'square';
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = pass === 0 ? Math.max(2.4, cs * 0.4) : Math.max(1.2, cs * 0.2);
    ctx.globalAlpha = pass === 0 ? 0.3 : 0.85;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const owner = terrOwnerAt(tx, ty);
        if (owner < 0) continue;
        const [px, py] = worldToPx(tx * C, ty * C);
        ctx.strokeStyle = pass === 0 ? '#0d0b09' : tribes[owner].color;
        ctx.beginPath();
        if (terrOwnerAt(tx + 1, ty) !== owner) { ctx.moveTo(px + size, py); ctx.lineTo(px + size, py + size); }
        if (terrOwnerAt(tx - 1, ty) !== owner) { ctx.moveTo(px, py); ctx.lineTo(px, py + size); }
        if (terrOwnerAt(tx, ty + 1) !== owner) { ctx.moveTo(px, py + size); ctx.lineTo(px + size, py + size); }
        if (terrOwnerAt(tx, ty - 1) !== owner) { ctx.moveTo(px, py); ctx.lineTo(px + size, py); }
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

// ------------------------------------------------------------
// Hộp bao của HÌNH VẼ trên màn hình (pixel), không phải của footprint. Dùng chung
// cho hit-test và cho việc phát hiện quân bị khuất.
function spriteBox(d, cs) {
  if (d.kind === 'b') {
    const s = d.o.size * cs;
    const left = d.px + cs / 2 - s / 2;
    const baseY = d.py + cs / 2 + s / 2;
    // Ruộng cao 0 -> lấy sàn bằng chính footprint, nếu không hộp dẹt thành 0 và
    // không bao giờ bấm trúng được.
    const H = Math.max(buildingSpriteHeight(d.o), d.o.size) * cs;
    const ov = buildingSpriteOverhang(d.o);
    return { x0: left - s * ov, x1: left + s * (1 + ov), y0: baseY - H, y1: baseY };
  }
  if (d.kind === 'w') {
    // Không khai ở đây thì nó rơi xuống nhánh QUÂN LÍNH bên dưới, tra
    // `UNIT_BOX[undefined]` và nhận hộp mặc định 1,2 ô đặt sai chỗ — bấm vào tường
    // thì trúng khoảng trời phía trên nó.
    //
    // CHIỀU CAO ĐỌC LẠI ĐÚNG CÔNG THỨC CỦA drawWall, không phải một hằng số chép
    // tay: từ 3.30 nó phụ thuộc bậc thời đại (0,46..0,82) NHÂN với hệ số ô góc
    // (1,35). Chép tay 0,74 thì bấm vào đỉnh một tháp góc Thiên Triều sẽ trượt —
    // đúng con lỗi "hộp bấm tưởng sprite trùng chân đế" của Phase 3.5, lần thứ tư.
    // Ô góc còn tràn ngang 0,10 ô mỗi bên vì cái mũ vuông của nó rộng 1,2 ô.
    const sp = wallTierSpec(d.o);
    // MỘT hàm chung với drawWall — xem chú thích ở wallHeightMul. Biểu thức tam
    // nguyên chép tay ở đây đã đúng bằng may mắn suốt ba bản; bậc thứ tư (lầu cổng)
    // là bậc đầu tiên nó sẽ sai.
    const hMul = wallHeightMul(d.o);
    // Lầu cổng đội một cái mái nhô lên 0,26 ô nữa (xem drawWall) — không cộng vào
    // đây thì bấm đúng cái nóc đó là bấm vào bãi cỏ.
    const extra = d.o.corner ? 0.30 : (d.o.gate && !d.o.door) ? 0.34 : 0.15;
    const h = cs * (sp.h * hMul + extra);
    // Lầu cổng cũng tràn ngang như tháp góc. 0,08 -> 0,16 sau khi ĐO BẰNG PIXEL:
    // mái vát dựng từ `bx − cs·0,08` tới `bx + bw + cs·0,08`, nhưng nét viền sáng ở
    // mép mái (lineWidth cs·0,07) còn ăn thêm nửa bề dày ra mỗi bên nữa — và bề dày
    // nét vẽ thì không nằm trong bất cứ công thức toạ độ nào. Cùng đúng lý do đã
    // phải ĐO thay vì SUY ở hộp bấm máy bắn đá (3.31): công thức cho 2,4 ô, vết mực
    // thật chạm 2,54.
    const ov = d.o.corner ? cs * 0.10 : (d.o.gate && !d.o.door) ? cs * 0.16 : 0;
    // Đoạn DỌC được đùn khối: mặt trên phủ trọn footprint ô rồi NÂNG LÊN `h`, nên
    // hình của nó bắt đầu ở `py - h` chứ không ở `py + cs - h`. Lấy hộp của đoạn
    // ngang cho nó thì bấm vào mặt trên một bức tường dọc luôn trượt — cùng con
    // lỗi hộp-bấm-lệch-hình đã cắn bốn lần, lần này do chính phép đùn vừa thêm.
    const y0 = d.o.dir === 'v' ? d.py - h : d.py + cs - h;
    return { x0: d.px - ov, x1: d.px + cs + ov, y0, y1: d.py + cs };
  }
  if (d.kind === 'l') {
    // drawLair vẽ theo skin.scale của CẤP hang, không theo l.size. Hộp bấm phải
    // đọc đúng cùng con số đó — đây là lần thứ hai trong file này hình vẽ và hộp
    // bấm suýt tách khỏi nhau (lần đầu: Phase 3.5, hit-test tưởng sprite ≡ chân đế).
    const S = cs * lairSkin(d.o).scale;
    const cx = d.px + cs / 2, cy = d.py + cs / 2;
    return { x0: cx - S * 0.5, x1: cx + S * 0.5, y0: cy - S * 0.55, y1: cy + S * 0.35 };
  }
  // Quân vẽ nhỏ hơn nhiều so với vùng bấm cũ (bán kính 3 ô). Nới rộng hộp để việc
  // chọn không khó đi so với trước — đây là vùng BẤM, không phải vùng che khuất.
  //
  // KHÔNG còn là một hình vuông chung cho mọi loại quân. Ba loại vẽ cao vượt hẳn
  // ra ngoài ô của mình — anh hùng cưỡi ngựa, kỵ binh, máy bắn đá — và với hộp
  // vuông 1,2 ô thì phần đầu của chúng nằm NGOÀI vùng bấm: bấm vào đúng cái mũ
  // chóp của tướng thì không chọn được tướng. Đây đúng là con lỗi Phase 3.5 (hộp
  // bấm tưởng hình vẽ trùng chân đế) quay lại ở một chỗ khác, và nó quay lại đúng
  // vào lúc mấy hình đó được vẽ to lên.
  // QUÁI VẬT không dùng bảng cố định: cỡ của chúng nằm trong `spec.size`, chạy từ
  // 1,1 (nhện) tới 2,7 (Chúa Hang) — hơn hai lần rưỡi. Một hộp chung 1,2 ô nghĩa
  // là bấm vào thân Chúa Hang thì trượt, còn bấm cạnh con nhện lại trúng. Đây
  // đúng con lỗi Phase 3.5 (hộp bấm tưởng hình vẽ trùng chân đế) lần thứ ba, và
  // lần này nó vào đúng nhóm vừa được vẽ to lên ở 3.22.
  const cx = d.px + cs / 2, cy = d.py + cs / 2;
  if (d.o.type === 'monster') {
    const sp = CONFIG.MONSTER.TYPES[d.o.mType];
    const S = sp.size * (d.o.scale || 1);
    // Loài BAY vẽ cao hơn mặt đất ~0,85 ô (xem nhánh 'wyvern'), nên hộp phải với
    // lên tận đó — nếu không thì bấm vào con phi long là bấm vào bãi cỏ dưới bụng nó.
    const up = S * (sp.boxUp || 0.8) + (sp.fly ? 1.1 : 0);
    // `boxW` — chỉ Thiên Ma khai, vì chỉ nó có thứ vươn ra NGOÀI 0,75·S: sải cánh
    // chạm tới 0,96·S và lưỡi đuôi tới 1,02·S. Để mặc định thì bấm vào cánh nó là
    // bấm vào bãi cỏ — đúng con lỗi "hộp bấm tưởng hình vẽ trùng chân đế" của Phase
    // 3.5, và bản 3.31 đã bắt được nó lần thứ sáu ở hai cỗ máy công thành. Ở đây nó
    // được chặn NGAY TRONG bản vẽ ra cái cánh, chứ không đợi lần thứ bảy.
    const halfW = sp.boxW || 0.75;
    return { x0: cx - cs * S * halfW, x1: cx + cs * S * halfW,
             y0: cy - cs * up, y1: cy + cs * (S * 0.6 + 0.3) };
  }
  const B = UNIT_BOX[d.o.type] || UNIT_BOX._;
  // NHÂN THEO `effScale` — hộp bấm của hai cỗ máy công thành là hộp DUY NHẤT trong
  // bảng này co giãn theo một nhánh nghiên cứu. CONFIG.UPGRADE.LINES.siege đã tự
  // tuyên bố luật này từ 3.27 ("scale ở đây phải chảy vào spriteBox chứ không chỉ
  // vào hàm vẽ") nhưng dòng thi hành thì chưa bao giờ được viết: một cỗ máy cấp 3
  // vẽ to gấp rưỡi mà vẫn mang hộp bấm của cỗ máy cấp 0, nên bấm vào bánh xe của
  // nó là bấm trúng bãi cỏ. Lỗi nằm im được lâu vì nhánh Công thành gần như không
  // bao giờ được nghiên cứu (đo: 1/16 bộ lạc, 4 kỷ nguyên) — không ai từng nhìn
  // thấy một cỗ máy cấp 3 để mà bấm trượt. Đây là "hộp bấm lệch hình" lần thứ sáu,
  // và lần này chính CÁI CHÚ THÍCH ĐÒI SỬA lại là thứ ru ngủ.
  const k = B.siege ? effScale(d.o) : 1;
  return { x0: cx - cs * B.w * k, x1: cx + cs * B.w * k,
           y0: cy - cs * B.up * k, y1: cy + cs * B.down * k };
}

// Nửa rộng / cao lên trên / xuống dưới, tính bằng SỐ Ô. Đọc từ chính hình vẽ:
//  · anh hùng cưỡi ngựa — người nâng lên 0,46·S rồi còn mũ chóp và tên phía trên
//  · kỵ binh — S = 1,95 ô, thân ngựa rộng gần hai ô
//  · máy bắn đá — S = 2,15 ô, cần bắn dựng đứng cao hơn cả khung
//  · voi chiến — S = 2,6 ô; sprite lớn nhất nhóm quân trở lại từ 3.32 (máy bắn đá
//    chỉ vượt nó khi đã ăn đủ ba cấp nhánh Công thành: 3,05 ô)
//  · nỏ thần — S = 1,95 ô, cánh nỏ xoè ngang gần trọn bề rộng
//  · quân kỳ — người cỡ bộ binh nhưng CÁN CỜ cao 1,05·S phía trên đầu, nên `up`
//    của nó phải lớn hơn hẳn bề rộng. Đây đúng cái bẫy Phase 3.5 lần thứ tư: hộp
//    bấm mặc định 1,2 ô sẽ cắt cụt đúng lá cờ — thứ DUY NHẤT người xem nhắm vào
//    khi họ muốn bấm con này.
const UNIT_BOX = {
  _:           { w: 1.2, up: 1.2, down: 1.2 },
  hero:        { w: 1.4, up: 2.5, down: 1.1 },
  knight:      { w: 1.7, up: 1.5, down: 1.2 },
  horsearcher: { w: 1.7, up: 1.5, down: 1.2 },
  // Hai cỗ máy nới ở 3.31 khi sprite lên 2,75/2,45 ô và mọc thêm CÁN CỜ ở đuôi (cấp
  // 3 nhánh Công thành). `siege: true` là cờ bật phép nhân theo effScale trong
  // spriteBox — xem chú thích ở đó. Ba số này đọc thẳng ra từ hàm vẽ:
  //   w    = mũi cờ đuôi nheo ở −0,88·S, xa hơn cả kíp vận hành (±0,60·S)
  //   up   = đầu cần bắn ở −0,80·S lúc nạp đầy (nỏ thần chỉ −0,48·S: cánh nỏ nằm ngang)
  //   down = chân kíp vận hành ở +0,58·S, thấp hơn trục bánh xe
  // Ba số của máy bắn đá KHÔNG suy từ công thức mà ĐO bằng pixel (vẽ ra canvas
  // trong suốt rồi quét vết mực, đúng cách Thư khố tự căn khung). Bản suy-từ-công-
  // thức cho `up: 2,4` và đo ra vết mực chạm tới 2,54 ô — hụt 0,14 ô ở CẢ cấp 0 lẫn
  // cấp 3, tức là đỉnh cần bắn nằm ngoài vùng bấm ở mọi cấp. Lý do công thức sai:
  // đầu cần ở −0,80·S nhưng cái GÀU ở đầu cần còn vươn thêm 0,13·S nữa, và `lineWidth`
  // của nét vẽ thì không nằm trong bất cứ công thức toạ độ nào.
  //
  // 3.32 THU NHỎ CẢ HAI CON SỐ THEO ĐÚNG TỈ LỆ sprite vừa nhỏ đi (2,75->2,15 và
  // 2,45->1,95), chứ không giữ nguyên hộp cũ cho "dễ bấm". Giữ nguyên thì hộp bấm
  // của máy bắn đá phình ra 1,28 lần bề ngang hình vẽ, và bấm vào bãi cỏ cạnh nó sẽ
  // chọn trúng nó — đúng con lỗi hộp-bấm-lệch-hình của Phase 3.5, chỉ là lệch theo
  // chiều ngược lại. Nhân theo tỉ lệ thì phần dư 0,05·S mà phép đo pixel đã mua được
  // vẫn còn nguyên, vì nó vốn được ghi bằng đơn vị S.
  catapult:    { w: 2.03, up: 2.03, down: 1.33, siege: true },
  ballista:    { w: 1.83, up: 1.19, down: 1.35, siege: true },
  elephant:    { w: 1.7, up: 1.9, down: 1.3 },
  standard:    { w: 1.2, up: 2.2, down: 1.2 },
  // ĐỘI HẬU CẦN — người cỡ dân thường nhưng có CÁI XE kéo phía sau, và cái xe mới
  // là thứ người xem nhắm vào khi muốn bấm con này. Ba số đọc thẳng từ drawQuarter:
  //   w  = tâm xe ở −0,62 ô cộng nửa thùng 0,31 cộng cán cờ chìa ra 0,26 → ~1,25;
  //        lấy 1,45 để lề bằng nhau ở cả hai bên bất kể đơn vị đang quay hướng nào
  //        (hộp thì đối xứng, còn cái xe thì lật theo hướng nhìn)
  //   up = đỉnh cờ đuôi nheo ở cartY − 0,95·ch, tức ~0,73 ô trên tâm; nón lá cao
  //        hơn một chút nữa
  //   down = chân người ở +0,5 ô, bánh xe không thấp hơn
  quarter:     { w: 1.45, up: 1.15, down: 1.15 }
};

// Silhouette xuyên tường. Nhà cao lên thì quân đứng phía sau biến mất, mà với một
// sim TỰ CHƠI thì mất dấu quân còn tệ hơn mất chiều sâu — người xem không điều
// khiển được gì, họ chỉ có mỗi việc dõi theo. Quân bị khuất được vẽ lại thành viền
// mờ đè lên tất cả: vẫn thấy vị trí, mà vẫn đọc ra là "đang ở sau nhà".
function drawOccludedUnits(drawables, cs) {
  const occ = [];
  for (const d of drawables) {
    if (d.kind !== 'b' || !d.o.done) continue;
    if (buildingSpriteHeight(d.o) <= 0) continue;      // ruộng không che ai
    const box = spriteBox(d, cs);
    box.base = d.y + d.o.size / 2;
    occ.push(box);
  }
  if (!occ.length) return;

  for (const d of drawables) {
    if (d.kind !== 'u') continue;
    const cx = d.px + cs / 2, cy = d.py + cs / 2;
    let hidden = false;
    for (const o of occ) {
      // Chỉ công trình vẽ SAU quân này mới che được nó — cùng điều kiện với thứ tự
      // sắp xếp ở trên, nếu không sẽ vẽ viền cho cả quân đang đứng chắn trước nhà.
      if (o.base <= d.y) continue;
      if (cx >= o.x0 && cx <= o.x1 && cy >= o.y0 && cy <= o.y1) { hidden = true; break; }
    }
    if (!hidden) continue;

    const u = d.o;
    const color = u.tribeId === -1 ? '#a8483a' : tribes[u.tribeId].color;
    // Viền mờ của cỗ máy công thành phải theo effScale như chính hình vẽ: đây là
    // hình bóng THAY THẾ cho sprite khi nó bị nhà che, nên một bán kính cố định sẽ
    // làm cỗ máy cấp 3 co lại đúng lúc nó khuất — người xem đọc ra là nó vừa đổi
    // loại quân chứ không phải vừa đi ra sau căn nhà.
    const r = cs * (u.type === 'hero' ? 0.6
                  : u.type === 'catapult' ? 0.61 * effScale(u)
                  : u.type === 'ballista' ? 0.56 * effScale(u)
                  : isCavalry(u.type) ? 0.82
                  : isMilitary(u.type) ? 0.48 : 0.38);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, cs * 0.14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------
// Ba lớp "sống" chạy bằng ĐỒNG HỒ THẬT: mây, mặt nước, vòng báo trận
// ------------------------------------------------------------
// Cả ba đọc aTick chứ không đọc tick, nên chúng vẫn động khi mô phỏng tạm dừng
// hoặc đang ở 6 tick/s. Đó là chủ ý: một khung hình đứng chết đọc ra "treo rồi",
// còn một khung hình có mây trôi và mặt nước lăn tăn đọc ra "đang chờ".

// Bóng mây. Bốn vệt tối lớn và mềm trôi ngang bản đồ — thủ thuật cổ điển và rẻ
// nhất để một mặt cỏ phẳng lì bỗng có BẦU TRỜI phía trên nó. Giá phải trả đúng
// bốn gradient mỗi frame.
// Alpha hạ khoảng một phần ba so với bản trước: mặt đất giờ đã đằm hơn, nên
// cùng một cái bóng mây trước kia đọc ra "có trời phía trên" thì nay đọc ra
// "một vũng bùn". Bóng mây phải luôn nhẹ hơn thứ nó phủ lên.
const CLOUDS = [
  { x: 0.05, y: 0.20, r: 44, sp: 0.030, a: 0.11 },
  { x: 0.38, y: 0.62, r: 62, sp: 0.021, a: 0.085 },
  { x: 0.66, y: 0.11, r: 35, sp: 0.043, a: 0.10 },
  { x: 0.84, y: 0.80, r: 54, sp: 0.026, a: 0.08 }
];
// ============================================================
// ĐƯỜNG CÁI — mặt đường vẽ thành từng PHIẾN ĐÁ RỜI
// ============================================================
// Yêu cầu gốc: "phải xây thành dải nhưng không được xây liền... nhìn đẹp mắt và
// hiệu quả chứ không phải lát hết đường cái toàn khu vực". Ba luật ở phía LOGIC
// (tuyến rộng 1 ô, luật chống phình, trần ngân sách — xem CONFIG.ROAD) lo phần
// "không lát hết khu vực". Hàm này lo phần còn lại: KHÔNG ĐƯỢC TRÔNG NHƯ MỘT DẢI
// BÊ TÔNG.
//
// Cách làm: mỗi ô đường là hai-ba phiến đá nhỏ, xoay lệch và lệch tâm theo một
// hàm băm của chính toạ độ ô. Vì sao băm theo toạ độ chứ không bốc ngẫu nhiên mỗi
// khung hình — nếu bốc mỗi khung thì cả con đường rung lên như nhiễu tivi. Băm
// theo toạ độ thì mỗi viên đá đứng yên vĩnh viễn ở chỗ của nó, mà cả con đường
// vẫn không có hai viên nào giống nhau. Cùng thủ thuật với `pigment` và `hash01`
// đã dùng cho nền bản đồ, và dùng lại luôn hàm đó để hai lớp có cùng "hạt" nhiễu.
//
// Nền đường vẫn được tô một dải mờ liền mạch BÊN DƯỚI đám phiến đá, và đó không
// mâu thuẫn với "không liền": nó là VỆT ĐẤT BỊ GIẪM MÒN, thứ có thật ở mọi con
// đường mòn, và nó là thứ giữ cho con đường đọc ra là một tuyến liên tục ở mức
// zoom xa — chỗ mà từng viên đá đã nhỏ hơn một điểm ảnh.
// ------------------------------------------------------------------
// BỐN DIỆN MẠO, MỘT CHO MỖI THỜI ĐẠI CÓ ĐƯỜNG (Phase 3.28)
// ------------------------------------------------------------------
// Cấp đọc theo thời đại của BỘ LẠC CHỦ, nên cả mạng đường của một bộ lạc đổi mặt
// cùng một lúc ngay tại tick nó lên đời — cùng nhịp với đợt trùng tu nhà cửa.
//
// Vì sao bốn diện mạo mà chỉ ba bậc tốc (xem ROAD.SPEED_BY_AGE): Thiên Triều
// không cần nhanh thêm nữa (2,5 đã ngang kỵ binh) nhưng nếu nó nhìn y hệt Hoàng
// Kim thì với mắt người, bậc năm không tồn tại. Bài học Phase 3.14 đọc theo chiều
// ngược: ở đó một thay đổi NHÌN THẤY mà mô phỏng không có là nói dối; ở đây một
// thay đổi có thật mà không nhìn thấy được thì cũng bằng không có.
//
// Bốn bậc đi theo đúng một trục — MẶT ĐƯỜNG NGÀY CÀNG LIỀN VÀ CÀNG THẲNG:
//   Đồ Đồng   — đường mòn đất: chỉ vệt giẫm mòn + vài hòn sỏi rời, không phiến đá
//   Đồ Sắt    — lát đá: phiến rời xoay lệch (đúng diện mạo của bản trước)
//   Hoàng Kim — đá phiến ghép: phiến to, khít, cộng hai vệt LỀ ĐƯỜNG hai bên
//   Thiên Triều — ngự đạo: như trên, cộng vạch giữa men ngọc chạy dọc tuyến
// Trục đó là trục mà mắt đọc được KHÔNG CẦN VẬT MẪU ĐỨNG CẠNH: "rời rạc hay liền
// mạch" là một phán đoán tại chỗ, còn "màu này đậm hơn màu hôm qua" thì không.
// Tra bằng THỜI ĐẠI (1..5), nên phải có ĐỦ 6 ô kể cả ô 0 bỏ trống — cùng quy ước
// với popByAge, MAX_CELLS và SPEED_BY_AGE.
//
// Bản đầu chỉ có 5 phần tử, và cái lỗi đó không hề ném ra một dòng nào: `ctx.fillStyle
// = undefined` KHÔNG phải lỗi trong canvas, nó lặng lẽ GIỮ NGUYÊN màu đang có — mà
// màu đang có là màu cuối cùng của ô liền trước, tức men ngọc của vạch giữa. Kết quả
// trên màn hình là toàn bộ ngự đạo Thiên Triều bị tô xanh đặc. Cùng họ với ba lần
// NaN im lặng trong dự án này (biên giới lãnh thổ, điểm nâng cấp, đếm kho): một bảng
// tra thiếu đúng một khoá, và cái sai hiện ra ở cách đó vài lớp.
const ROAD_DUST = [
  'rgba(120,102,74,0.30)',   // 0 — không dùng
  'rgba(120,102,74,0.30)',   // 1 — không dùng (MIN_AGE = 2)
  'rgba(120,102,74,0.22)',   // 2 Đồ Đồng   — vệt đất mờ
  'rgba(120,102,74,0.30)',   // 3 Đồ Sắt
  'rgba(108,96,76,0.38)',    // 4 Hoàng Kim — nền sẫm hơn, mặt đường dày
  'rgba(96,88,74,0.44)'      // 5 Thiên Triều
];
const ROAD_SLAB = ['#a2937c', '#8d8069', '#b3a58c'];
const ROAD_KERB = '#7d7259';
const ROAD_JADE = '#3f7f74';
const ROAD_JADE_KERB = '#37675f';   // lề men ngọc của ngự đạo Thiên Triều

// Cấp mặt đường theo thời đại chủ. Kẹp hai đầu vì đúng lý do đã viết ở
// roadSpeedMult: một tribeId lạ không được phép ra `undefined`.
function roadTier(tribeId) {
  const t = tribes[tribeId];
  return clamp(t ? (t.age || CONFIG.ROAD.MIN_AGE) : CONFIG.ROAD.MIN_AGE, 2, 5);
}

function drawRoads(cs) {
  if (!roadCells.size) return;
  // Ở mức zoom rất xa, từng viên đá nhỏ hơn một điểm ảnh — vẽ chúng chỉ tốn tiền
  // để ra một dải xám bẩn. Dưới ngưỡng này chỉ tô vệt đất.
  const detailed = cs >= 5;
  // Cấp tra sẵn MỘT LẦN cho cả khung hình thay vì mỗi ô một lần: hàm này chạy trên
  // vài trăm tới vài nghìn ô mỗi khung, và `tribes[id].age` thì cả nghìn tick mới
  // đổi một lần. Cùng thủ thuật đã dùng cho `tierOf` ở mọi vòng vẽ nóng khác.
  const tierOf = tribes.map((t, i) => roadTier(i));
  for (const r of roadCells.values()) {
    const [px, py] = worldToPx(r.x, r.y);
    if (!inView(px, py, cs * 2)) continue;
    const tier = tierOf[r.tribeId] || 2;
    // `|| ROAD_DUST[2]` là cái lưới an toàn cho đúng lỗi vừa mô tả ở bảng trên: gán
    // một giá trị không hợp lệ cho fillStyle thì canvas im lặng dùng lại màu cũ, nên
    // một khoá thiếu sẽ không bao giờ tự tố cáo. Một dòng, và nó biến "cả con đường
    // sai màu" thành "một cấp đường trông như cấp 2".
    ctx.fillStyle = ROAD_DUST[tier] || ROAD_DUST[2];
    ctx.fillRect(px, py, cs + 0.6, cs + 0.6);      // +0,6 để hai ô kề nhau không hở chỉ
    if (!detailed) continue;
    const h1 = hash01(r.x, r.y), h2 = hash01(r.x + 71, r.y - 13), h3 = hash01(r.x - 29, r.y + 47);

    // ---- Đồ Đồng: ĐƯỜNG MÒN ĐẤT, không có phiến nào -----------------------------
    // Cố tình KHÔNG phải "phiến đá nhỏ hơn": một con đường đất và một con đường lát
    // đá thưa trông giống nhau ở mức zoom chơi thật, và lúc đó bậc một với bậc hai
    // là một. Bỏ hẳn phiến đá đi thì khác biệt nằm ở chỗ CÓ hay KHÔNG, thứ mắt
    // không thể đọc sai.
    if (tier <= 2) {
      if (cs >= 7) {
        ctx.fillStyle = 'rgba(150,134,104,0.30)';
        for (let i = 0; i < 3; i++) {
          const gx = hash01(r.x + i * 13, r.y - i * 29), gy = hash01(r.x - i * 7, r.y + i * 37);
          const gr = Math.max(0.7, cs * (0.05 + gx * 0.05));
          ctx.beginPath();
          ctx.arc(px + cs * (0.15 + gx * 0.7), py + cs * (0.15 + gy * 0.7), gr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      continue;
    }

    // ---- Đồ Sắt trở lên: PHIẾN ĐÁ ------------------------------------------------
    // Bậc 4-5 dùng phiến TO và KHÍT hơn (cùng một vòng lặp, hai bộ hệ số), nên mặt
    // đường đọc ra là một mặt phẳng liên tục chứ không phải một chuỗi hòn đá.
    const paved = tier >= 4;
    const n = paved ? 2 : 2 + (h1 > 0.62 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const hx = hash01(r.x + i * 17, r.y - i * 23);
      const hy = hash01(r.x - i * 31, r.y + i * 11);
      const w = paved ? cs * (0.42 + hx * 0.12) : cs * (0.30 + hx * 0.20);
      const hgt = paved ? cs * (0.34 + hy * 0.10) : cs * (0.24 + hy * 0.18);
      const ox = paved ? cs * (0.26 + hx * 0.48) - w * 0.5 : cs * (0.10 + hx * 0.55) - w * 0.5;
      const oy = paved ? cs * (0.28 + hy * 0.44) - hgt * 0.5 : cs * (0.12 + hy * 0.58) - hgt * 0.5;
      ctx.fillStyle = ROAD_SLAB[Math.floor((h2 + i * 0.33) * 3) % 3];
      ctx.fillRect(px + ox, py + oy, w, hgt);
      // Vệt sáng mép trên: đủ để mắt đọc ra "viên đá có bề dày" chứ không phải
      // "ô vuông màu xám". Một dòng, và nó là khác biệt giữa lát đá và tô màu.
      if (cs >= 8) {
        ctx.fillStyle = 'rgba(255,247,230,0.22)';
        ctx.fillRect(px + ox, py + oy, w, Math.max(0.6, hgt * 0.22));
      }
    }
    // Một viên sẫm hơn hẳn ở vài ô: chỗ đá cũ, rêu bám. Rải thưa (12%) nên nó là
    // gia vị chứ không thành hoa văn. Bậc 4-5 thì thưa hơn nữa — ngự đạo có người quét.
    if (cs >= 8 && h3 > (paved ? 0.95 : 0.88)) {
      ctx.fillStyle = 'rgba(74,86,62,0.34)';
      ctx.fillRect(px + cs * 0.3, py + cs * 0.34, cs * 0.3, cs * 0.24);
    }

    // ---- Hoàng Kim: LỀ ĐƯỜNG · Thiên Triều: VẠCH GIỮA MEN NGỌC -------------------
    //
    // CẢ HAI nét này chạy DỌC THEO TUYẾN, nên cả hai đều phải biết con đường đi
    // hướng nào — và đó là chỗ bản đầu sai. Đường được lưu theo Ô, không theo tuyến
    // (xem chú thích ở roadCells: "hỏi điểm này có đường không" là câu hỏi nóng
    // nhất), nên một cái lề vẽ ở "mép trái và mép phải Ô" chạy VUÔNG GÓC với con
    // đường ngang: ra một cái thang có nấc, không ra một con đường có bờ. Đo ra
    // bằng cách vẽ thử bốn cấp cạnh nhau, và nó lộ ngay từ khung hình đầu tiên.
    //
    // Hướng suy ra từ HAI ô kề: có ô đường bên trái/phải thì tuyến chạy ngang. Rẻ
    // (hai phép tra Map) và luôn đúng theo định nghĩa, vì tuyến rộng đúng 1 ô. Ở
    // khúc cua thì cả hai đều đúng và cả hai nét được vẽ — ra một góc vuông, đúng
    // như một khúc cua thật.
    if (paved) {
      const horiz = roadCells.has((r.x - 1) + ',' + r.y) || roadCells.has((r.x + 1) + ',' + r.y);
      const vert  = roadCells.has(r.x + ',' + (r.y - 1)) || roadCells.has(r.x + ',' + (r.y + 1));
      const kw = Math.max(0.7, cs * 0.09);
      // Thiên Triều lát LỀ bằng men ngọc, không chỉ kẻ vạch giữa. Vạch giữa là nét
      // ĐỨT nên nó biến mất trước tiên khi thu nhỏ — mà mức zoom người ta thật sự
      // ngồi xem (cs 9-14) đã gần đúng chỗ nó biến mất. Cái lề thì chạy LIÊN TỤC
      // qua mọi ô, nên nó còn đọc được ở cỡ mà từng viên đá đã tan hết. Bậc năm
      // cần một tín hiệu sống ở dải zoom đó, không phải một tín hiệu chỉ đẹp lúc
      // soi gần.
      ctx.fillStyle = tier >= 5 ? ROAD_JADE_KERB : ROAD_KERB;
      // Ô lẻ loi (không kề ai) coi như ngang — phải có một mặc định, nếu không thì
      // đúng những ô đầu tuyến sẽ trơ ra không có lề.
      if (horiz || !vert) {
        ctx.fillRect(px, py, cs + 0.6, kw);
        ctx.fillRect(px, py + cs + 0.6 - kw, cs + 0.6, kw);
      }
      if (vert) {
        ctx.fillRect(px, py, kw, cs + 0.6);
        ctx.fillRect(px + cs + 0.6 - kw, py, kw, cs + 0.6);
      }
      // Vạch giữa men ngọc — cùng sắc với mái ngói bậc năm (AGE_MAT[5]). Bậc năm
      // của hai hệ thống khác nhau phải nói cùng một câu, nếu không thì "Thiên
      // Triều" chỉ là một cái tên. Vạch ĐỨT (nửa ô) chứ không liền: liền thì ở
      // zoom xa nó thành một sợi chỉ xanh chạy khắp bản đồ, và mắt đọc ra một lớp
      // giao diện chứ không đọc ra mặt đất.
      if (tier >= 5 && cs >= 7) {
        const jw = Math.max(0.8, cs * 0.085);
        ctx.fillStyle = ROAD_JADE;
        ctx.globalAlpha = 0.66;
        if (horiz || !vert) ctx.fillRect(px + cs * 0.25, py + cs * 0.5 - jw / 2, cs * 0.5, jw);
        if (vert) ctx.fillRect(px + cs * 0.5 - jw / 2, py + cs * 0.25, jw, cs * 0.5);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawCloudShadows(cs) {
  const span = CONFIG.GRID_WIDTH + 200;
  for (const c of CLOUDS) {
    const wx = ((c.x * span + aTick * c.sp) % span) - 100;
    const wy = c.y * CONFIG.GRID_HEIGHT;
    const [px, py] = worldToPx(wx, wy);
    const rp = c.r * cs;
    if (px + rp < 0 || px - rp > simCanvas.width) continue;
    if (py + rp * 0.6 < 0 || py - rp * 0.6 > simCanvas.height) continue;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.55);
    const g = ctx.createRadialGradient(0, 0, rp * 0.12, 0, 0, rp);
    g.addColorStop(0, `rgba(9,14,24,${c.a})`);
    g.addColorStop(0.65, `rgba(9,14,24,${c.a * 0.55})`);
    g.addColorStop(1, 'rgba(9,14,24,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rp, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Cỏ lau đáy đầm. Thay chỗ của lớp "lăn tăn mặt nước" cũ và giữ nguyên cách làm:
// chỉ ~12% số ô trũng (chọn bằng hash tất định nên không nhấp nháy đổi chỗ), gom
// hết vào MỘT path rồi stroke một lần — vài trăm đoạn thẳng trong một lệnh vẽ.
// Đây là lớp ĐỘNG duy nhất của vùng trũng: bụi lau ngả theo gió, nên lòng chảo
// vẫn còn một chuyển động riêng thay vì thành một mảng tối đứng yên.
function drawReedSway(cs) {
  if (cs < 5) return;
  const x0 = Math.floor(camX), y0 = Math.floor(camY);
  const x1 = x0 + CONFIG.VIEWPORT_WIDTH + 1, y1 = y0 + CONFIG.VIEWPORT_HEIGHT + 1;
  ctx.strokeStyle = 'rgba(178,166,118,0.3)';
  ctx.lineWidth = Math.max(1, cs * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isBasinAt(x, y)) continue;
      const h = hash01(x * 1.3, y * 2.7);
      if (h < 0.88) continue;
      const sway = Math.sin(aTick * 0.02 + h * 6.28) * 0.14;
      const [px, py] = worldToPx(x + 0.5, y + 0.8);
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway * cs, py - cs * (0.5 + h * 0.3));
    }
  }
  ctx.stroke();
}

// Vòng báo trận. Câu hỏi mà người xem hỏi nhiều nhất là "đang đánh nhau ở đâu",
// và cho tới 3.7 thì câu trả lời chỉ có trên minimap — tức là phải rời mắt khỏi
// khung hình để tìm chỗ đáng nhìn trong khung hình. Vệt đỏ này trả lời ngay tại
// chỗ, và nó đọc từ chính `hotspots` mà camera đạo diễn dùng, nên thứ nó chỉ vào
// luôn đúng bằng thứ camera sắp cắt tới.
function drawCombatRings(cs) {
  if (!hotspots.length) return;
  const top = hotspots.slice().sort((a, b) => b.weight - a.weight).slice(0, 5);
  for (const h of top) {
    if (h.weight < 5) continue;
    const [px, py] = worldToPx(h.x + 0.5, h.y + 0.5);
    const rp = clamp(3.5 + h.weight * 0.28, 4, 14) * cs;
    if (!inView(px, py, rp)) continue;
    const g = ctx.createRadialGradient(px, py, rp * 0.1, px, py, rp);
    g.addColorStop(0, 'rgba(255,86,70,0.20)');
    g.addColorStop(1, 'rgba(255,86,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px, py, rp, rp * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const ph = ((aTick * 0.012) + i * 0.5) % 1;
      ctx.strokeStyle = `rgba(255,120,90,${0.4 * (1 - ph)})`;
      ctx.lineWidth = Math.max(1.2, cs * 0.16);
      ctx.beginPath();
      ctx.ellipse(px, py, rp * (0.25 + ph * 0.75), rp * (0.25 + ph * 0.75) * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Thanh trạng thái dán đáy khung hình. Đặt trên CANVAS chứ không trong bảng bên
// phải, vì đúng ba con số này (đang chạy hay dừng, nhanh chậm bao nhiêu, kỷ
// nguyên trôi tới đâu) là thứ người xem cần liếc mà KHÔNG được rời mắt khỏi trận.
const HUD_H = 24;
function drawHudBar() {
  const W = simCanvas.width, H = simCanvas.height, y = H - HUD_H;
  ctx.fillStyle = 'rgba(11,9,7,0.86)';
  ctx.fillRect(0, y, W, HUD_H);
  const prog = clamp(tick / CONFIG.ERA.MAX_TICKS, 0, 1);
  ctx.fillStyle = 'rgba(216,165,68,0.10)';
  ctx.fillRect(0, y, W * prog, HUD_H);
  ctx.fillStyle = 'rgba(216,165,68,0.16)';      // sợi vàng chạy suốt = cả kỷ nguyên
  ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = 'rgba(240,207,133,0.8)';      // phần đã trôi qua sáng lên
  ctx.fillRect(0, y, W * prog, 1);

  ctx.font = `600 11.5px ${F_UI}`;
  ctx.textAlign = 'left';
  // `running` bị tắt ở HAI tình huống rất khác nhau: người xem bấm Pause, và
  // kỷ nguyên vừa khép lại (endEra tự tắt để giữ thẻ tổng kết). Gộp cả hai vào
  // một chữ "TẠM DỪNG" thì lúc kỷ nguyên kết thúc, thanh trạng thái nói dối rằng
  // chính người xem đã dừng nó lại và đang có gì đó chờ họ bấm.
  const ended = eraState !== 'playing';
  const state = ended ? '🏆 KỶ NGUYÊN KẾT THÚC'
              : !running ? '⏸ TẠM DỪNG'
              : slowmoLeft > 0 ? '⏳ quay chậm'
              : ticksPerSecond >= 600 ? '⏭ tua' : '▶';
  ctx.fillStyle = ended ? '#f0cf85' : !running ? '#e09a3c' : slowmoLeft > 0 ? '#7cc2b4' : '#b1a58c';
  ctx.fillText(state, 11, y + 16);
  const sw = ctx.measureText(state).width;
  // Đồng hồ đi bằng chữ MÁY, tên kỷ nguyên đi bằng chữ SÁCH. Hai giọng ngồi
  // cạnh nhau trên cùng một thanh mà không lẫn: một bên là thứ máy đếm được,
  // một bên là thứ chỉ có nghĩa trong thế giới đang được kể.
  ctx.font = `10.5px ${F_DATA}`;
  ctx.fillStyle = '#7b7160';
  ctx.fillText(`${ticksPerSecond} tick/s`, 19 + sw, y + 16);
  const tw = ctx.measureText(`${ticksPerSecond} tick/s`).width;
  ctx.font = `12.5px ${F_DISPLAY}`;
  ctx.fillStyle = '#b1a58c';
  ctx.fillText(`Kỷ nguyên ${era}`, 19 + sw + tw + 14, y + 16);
  const ew = ctx.measureText(`Kỷ nguyên ${era}`).width;
  ctx.font = `10.5px ${F_DATA}`;
  ctx.fillStyle = '#7b7160';
  ctx.fillText(`${tick.toLocaleString('vi-VN')} / ${CONFIG.ERA.MAX_TICKS.toLocaleString('vi-VN')}`,
               19 + sw + tw + 14 + ew + 14, y + 16);

  ctx.textAlign = 'right';
  ctx.fillStyle = fpsAvg < 34 ? '#e05b40' : '#5c5346';
  ctx.fillText(`${units.length} quân · ${Math.round(fpsAvg)} fps`, W - 11, y + 16);
  ctx.textAlign = 'left';
}

// Chiều cao thanh Kỳ quan. Một hằng số, đọc từ hai phía: hàm vẽ thanh, và biến
// CSS `--hud-top` mà minimap/nút/bảng phủ cộng vào toạ độ của chúng.
const HUD_BAR_H = 26;

// KÍCH THƯỚC HAI VẬT CẢN Ở MÉP TRÊN, quy về HỆ TOẠ ĐỘ CANVAS.
//
// Hai cái bẫy chồng lên nhau ở đây:
//  1. Hàng nút co giãn (nhãn Đạo diễn mang tên cảnh, dài ngắn tuỳ cảnh) nên phải
//     hỏi DOM — mà `offsetWidth` ép trình duyệt tính lại bố cục, gọi 60 lần/giây
//     là tự bắn vào chân. Nhớ lại mỗi 15 khung hình: hàng nút đổi bề ngang vài
//     lần một phút, còn sai số một phần tư giây thì không ai kịp thấy.
//  2. Chúng đo bằng PIXEL CSS, còn chỗ vẽ đo bằng PIXEL CANVAS. Cửa sổ hẹp thì
//     `max-width:100%` co canvas lại, hai hệ lệch nhau tới 30% — lấy thẳng
//     `minimapCanvas.width` làm bề ngang vật cản là sai đúng vào lúc chật chội
//     nhất, tức là đúng lúc cần nó nhất. Nhân lại bằng tỉ lệ đo được.
let _hudObs = { leftW: 178, chipsH: 32, miniW: 187, miniH: 121 }, _hudObsAt = -999;
function hudObstacles() {
  if (frameCount - _hudObsAt >= 15) {
    _hudObsAt = frameCount;
    const shown = simCanvas.getBoundingClientRect().width;
    const k = shown > 0 ? simCanvas.width / shown : 1;
    const c = document.getElementById('ovChips');
    // `leftW` là HỢP của hàng nút và bảng bộ lạc trên khung hình — hai lớp phủ
    // cùng neo ở mép trái, và bảng bộ lạc rộng gấp đôi hàng nút khi nó mở. Chỉ
    // đo hàng nút thì bật bảng bộ lạc lên là dòng sử lại chạy xuyên qua nó.
    const p = document.getElementById('ovTribes');
    const pW = (p && p.style.display !== 'none') ? p.offsetWidth : 0;
    _hudObs = {
      leftW: Math.max(c ? c.offsetWidth : 178, pW) * k,
      chipsH: (c ? c.offsetHeight : 32) * k,
      miniW: minimapCanvas.offsetWidth * k,
      miniH: minimapCanvas.offsetHeight * k
    };
  }
  return _hudObs;
}

// Cắt chuỗi cho vừa bề ngang, thêm dấu lửng. Dò tuyến tính từ đuôi chứ không
// chia đôi: chuỗi ở đây dài vài chục ký tự và gần như luôn vừa ngay từ đầu, nên
// vòng lặp thường không chạy lần nào.
function fitText(txt, maxW) {
  if (maxW <= 0 || ctx.measureText(txt).width <= maxW) return txt;
  let s = txt;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

// ------------------------------------------------------------
// HÀNG ĐỢI NHÃN CHỮ TRÊN BẢN ĐỒ
// ------------------------------------------------------------
// Tên bộ lạc, tên anh hùng và tên hang ổ đều là chữ nổi trên thế giới, và trước
// đây mỗi chỗ tự vẽ lấy ngay tại chỗ mình đang vẽ hình. Ba hàm không biết nhau
// thì không có cách nào tránh nhau: anh hùng đứng cạnh nhà chính của chính mình
// — chuyện xảy ra suốt, vì đó là nơi anh ta hồi máu và nhận lệnh — là hai dòng
// chữ chồng khít lên nhau thành một mớ không đọc được chữ nào.
//
// Cách chữa không phải là dịch mỗi nhãn lên thêm mấy pixel (số nào cũng sẽ sai ở
// một mức thu phóng nào đó), mà là gom hết vào MỘT hàng đợi rồi xếp chỗ một lượt:
// ai ưu tiên cao xí chỗ trước, ai đến sau mà đụng thì nhích LÊN TRỜI — phía trên
// một vật thể gần như luôn trống — tối đa ba nấc, không còn chỗ thì thôi không vẽ.
// Không vẽ còn hơn vẽ đè: một nhãn thiếu thì người xem click vào là ra, còn hai
// nhãn chồng nhau thì mất cả hai.
const LABEL_PAD = 2;
const labelQueue = [];
function queueLabel(text, cx, baseY, font, color, prio) {
  labelQueue.push({ text, cx, baseY, font, color, prio });
}
// `blockers`: những ô chữ nhật của lớp HUD (hiện tại là mấy dòng sử đóng dấu) mà
// nhãn thế giới phải tránh. Nạp vào hàng đợi như thể chúng đã xí chỗ từ trước —
// nhờ vậy tên bộ lạc tự nhích ra thay vì nằm nửa trong nửa ngoài dưới một tấm
// thẻ đen. Không cần biết chúng là cái gì, chỉ cần biết chỗ đó đã có người.
function flushLabels(blockers) {
  if (!labelQueue.length) return;
  labelQueue.sort((a, b) => b.prio - a.prio);
  const placed = blockers ? blockers.slice() : [];
  ctx.textAlign = 'center';
  for (const L of labelQueue) {
    ctx.font = L.font;
    const m = ctx.measureText(L.text);
    const asc = m.actualBoundingBoxAscent || 10, desc = m.actualBoundingBoxDescent || 3;
    const hw = m.width / 2, h = asc + desc, dy = h + 3;
    // Thử LÊN trước (phía trên một vật thể gần như luôn là trời trống), rồi mới
    // thử XUỐNG. Chỉ đi lên là đủ khi vật cản là một nhãn khác cùng cỡ, nhưng
    // không đủ khi vật cản là một tấm thẻ HUD cao 30px nằm ngay phía trên: leo ba
    // nấc vẫn còn kẹt trong nó, mà xuống một nấc là thoát.
    const tries = [0, -dy, -dy * 2, -dy * 3, dy, dy * 2];
    let y = L.baseY, ok = false;
    for (const off of tries) {
      y = L.baseY + off;
      const x0 = L.cx - hw - LABEL_PAD, x1 = L.cx + hw + LABEL_PAD;
      const y0 = y - asc - LABEL_PAD, y1 = y + desc + LABEL_PAD;
      let hit = false;
      for (const p of placed) {
        if (x0 < p.x1 && x1 > p.x0 && y0 < p.y1 && y1 > p.y0) { hit = true; break; }
      }
      if (!hit) { placed.push({ x0, x1, y0, y1 }); ok = true; break; }
    }
    if (!ok) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText(L.text, L.cx + 1, y + 1);
    ctx.fillStyle = L.color;
    ctx.fillText(L.text, L.cx, y);
  }
  labelQueue.length = 0;
  ctx.textAlign = 'left';
}

// CHỖ ĐỨNG CỦA MẤY DÒNG SỬ, tính TRƯỚC khi vẽ bất cứ chữ nào.
//
// Tách khỏi vòng vẽ vì hai lớp cần cùng một đáp số: lớp nhãn thế giới cần biết
// mấy tấm thẻ này sẽ nằm ở đâu để né, còn chính vòng vẽ thì cần toạ độ để vẽ.
// Tính hai lần bằng hai công thức là cách chắc chắn nhất để chúng lệch nhau.
//
// Dòng sử LÁCH giữa hàng nút (trái) và minimap (phải) chứ không căn giữa khung
// hình: minimap rộng 187px, hàng nút ~178px, nên "giữa khung" không còn là giữa
// chỗ trống — một dòng dài chui thẳng xuống dưới minimap, đo được 52px chữ bị
// nuốt. Khi khe hở không đủ (cửa sổ hẹp, hoặc nhãn Đạo diễn kéo hàng nút dài ra)
// thì KHÔNG cắt chữ cho vừa cái khe: xuống hẳn dưới cả hai vật cản và lấy trọn bề
// ngang. Nhét một dòng sử vào 19px là biến nó thành một dấu lửng. Quyết định một
// lần cho cả cụm theo dòng DÀI NHẤT, để mấy dòng cùng lúc không nằm ở hai độ cao.
function layoutToasts(hudTop) {
  const obs = hudObstacles();
  ctx.font = `15px ${F_DISPLAY}`;
  let needW = 0;
  for (const t of mapToasts) {
    const s = t.count > 1 ? `${t.text}  ×${t.count}` : t.text;
    needW = Math.max(needW, ctx.measureText(s).width);
  }
  needW += 30 + 32;                                            // con dấu + hai lề
  const spanL = 11 + obs.leftW + 10;
  let spanR = simCanvas.width - 10 - obs.miniW - 10;
  let ty = hudTop + 40;
  if (needW > spanR - spanL) {
    // Xuống dưới minimap thì bên PHẢI hết vướng — nhưng bên TRÁI thì không: bảng
    // bộ lạc trên khung hình cao tới 46% khung, đi xuống bao nhiêu cũng vẫn đụng.
    // Vậy chỉ nới mép phải, giữ nguyên mép trái.
    spanR = simCanvas.width - 12;
    ty = hudTop + Math.max(11 + obs.chipsH, 10 + obs.miniH) + 26;
  }
  const cx = (spanL + spanR) / 2;
  const maxText = Math.max(90, spanR - spanL - 30 - 32);
  const rows = [], blockers = [];
  let y = ty;
  for (const t of mapToasts) {
    const txt = fitText(t.count > 1 ? `${t.text}  ×${t.count}` : t.text, maxText);
    const tw = ctx.measureText(txt).width;
    const boxW = 30 + 16 + tw + 16;
    rows.push({ txt, tw, y });
    blockers.push({ x0: cx - boxW / 2 - 4, x1: cx + boxW / 2 + 4, y0: y - 19, y1: y + 19 });
    y += 38;
  }
  return { cx, rows, blockers };
}

// ============================================================
// TƯỜNG THÀNH — vẽ
// ============================================================
// Một ô tường là một khối đá cao 0,62 ô, KHÔNG phải một ô màu trên mặt đất. Lý do
// nằm ở chính luật chơi: tường chặn địch mà không chặn quân nhà, và một dải màu
// phẳng thì người xem đọc ra "vùng ảnh hưởng" — thứ mà lãnh thổ đã dùng — chứ
// không đọc ra "vật cản". Có bóng đổ, có mặt trên sáng hơn mặt trước, và có lỗ
// châu mai: ba tín hiệu này mắt đã biết đọc là "tường" từ trước khi có trò chơi.
//
// BA TRẠNG THÁI, và cả ba đều phải đọc được ở mức zoom xa nhất, vì "thành đã thủng
// chỗ nào" chính là thông tin đắt nhất của cả cơ chế:
//   · lành      — khối liền, lỗ châu mai đều
//   · sứt mẻ    — thấp dần theo máu, lỗ châu mai rụng bớt
//   · vỡ (hp=0) — chỉ còn một đống gạch vụn thấp: một CÁI LỖ nhìn xuyên qua được
// PHASE 3.30 thêm ba trục nữa vào cùng một hàm, và cả ba đều là thứ mắt đọc trước
// khi đọc màu:
//   · HƯỚNG — đoạn tường chạy ngang thì bề mặt trải hết bề ngang ô; đoạn chạy dọc
//     thì nó là một phiến HẸP đứng giữa ô, và răng cưa xếp CHỒNG theo chiều dọc
//     thay vì rải ngang. Bản trước vẽ y hệt nhau cho cả hai, nên hai cạnh trái/phải
//     của thành trông như một dãy khối rời chứ không như một bức tường liền.
//   · CHỖ — góc là một tháp vuông cao hơn thân tường, cổng là ba ô có cánh cửa ở
//     giữa. Cả hai đều là thông tin luật chơi: góc nối hai hướng, cổng là chỗ máu
//     mỏng nhất, và người xem phải đọc ra được điều đó mà không cần bấm vào.
//   · BẬC — năm bậc theo thời đại (WALL.TIERS), đổi cả vật liệu lẫn kiểu đỉnh.
function wallTierSpec(w) {
  const T = CONFIG.WALL.TIERS;
  return T[clamp(w.tier || 1, 1, T.length - 1)];
}

// HỆ SỐ CHIỀU CAO CỦA MỘT Ô TƯỜNG — một hàm, hai chỗ đọc (drawWall và spriteBox).
//
// Trước Phase 3.33 nó là một biểu thức tam nguyên CHÉP HAI LẦN ở hai chỗ cách nhau
// nghìn dòng, và chú thích ở spriteBox đã phải viết hẳn ra rằng nó "đọc lại đúng
// công thức của drawWall, không phải một hằng số chép tay" — tức là cái nguy hiểm
// đã được nhận ra mà cách chữa thì vẫn là "nhớ sửa cả hai chỗ". Bản này thêm bậc
// thứ tư (lầu cổng), nên chỗ nào quên là bấm vào nóc lầu cổng sẽ trượt: đúng con
// lỗi hộp-bấm-lệch-hình, lần thứ bảy.
//
// Bốn bậc, và chênh lệch chiều cao giữa chúng LÀ toàn bộ đường bao của cái cổng:
//     thân tường 1,00 · KHỐI CỬA 1,06 · LẦU CỔNG 1,30 · tháp góc 1,35
// Đọc dọc theo một cạnh thành thì nó ra nhịp bằng-CAO-nhô-CAO-bằng: một khối cổng
// đồ sộ nhô lên khỏi thân tường, và hai cái lầu vượt lên trên nó nữa. Đó là hình
// dạng mà mắt đã biết đọc là "cổng" từ trước khi nhìn thấy cánh cửa.
//
// HAI LẦN PHẢI SỬA CON SỐ NÀY, VÀ CẢ HAI ĐỀU CHỈ LỘ RA KHI VẼ RA MÀ NHÌN:
//   0,72 — hạ thấp ô cửa để làm nhịp hình bóng. Nhưng cái vòm lại được khoét vào
//          chính ô đã hạ, nên ở bậc Rào gỗ lối đi chỉ còn 15px: hai phép hạ độ cao
//          cộng dồn lên cùng một ô.
//   0,88 — vẫn thấp hơn thân tường, và vẫn sai theo cùng chiều.
// 1,06 đảo hẳn chiều: khối cửa NHÔ LÊN chứ không thụt xuống, đúng như một cổng
// thành thật (tường dày lên và cao lên ở chỗ có lối đi), và cái vòm vì thế có chỗ
// để cao. Nhịp hình bóng nay do HAI LẦU CỔNG gánh — chúng mới là thứ phải nhô.
function wallHeightMul(w) {
  if (w.corner) return 1.35;
  if (w.door) return 1.06;    // khối cổng — ba ô giữa, nhô nhẹ trên thân tường
  if (w.gate) return 1.30;    // lầu cổng — hai ô kẹp hai bên khối cổng
  return 1;
}

function drawWall(w, px, py, cs) {
  const t = tribes[w.tribeId];
  if (!t) return;
  const baseY = py + cs;
  const vertical = w.dir === 'v';
  if (w.hp <= 0) {
    // Gạch vụn. Vẽ thấp và tối để cái lỗ đọc ra là lỗ ngay cả khi hai ô bên cạnh
    // vẫn còn nguyên — đó là lúc thông tin này đáng giá nhất. Đống vụn cũng nằm
    // theo hướng: một lỗ trên cạnh dọc phải là một khe DỌC, nếu không thì đúng
    // cái thông tin đắt nhất lại là thứ duy nhất không xoay.
    ctx.fillStyle = 'rgba(58,48,40,0.72)';
    if (vertical) ctx.fillRect(px + cs * 0.30, py + cs * 0.06, cs * 0.40, cs * 0.88);
    else          ctx.fillRect(px + cs * 0.08, baseY - cs * 0.16, cs * 0.84, cs * 0.16);
    ctx.fillStyle = 'rgba(120,104,86,0.6)';
    if (vertical) {
      ctx.fillRect(px + cs * 0.34, py + cs * 0.16, cs * 0.14, cs * 0.22);
      ctx.fillRect(px + cs * 0.52, py + cs * 0.54, cs * 0.12, cs * 0.18);
    } else {
      ctx.fillRect(px + cs * 0.18, baseY - cs * 0.26, cs * 0.24, cs * 0.12);
      ctx.fillRect(px + cs * 0.58, baseY - cs * 0.22, cs * 0.2, cs * 0.1);
    }
    return;
  }
  const spec = wallTierSpec(w);
  const frac = clamp(w.hp / w.maxHp, 0, 1);
  // Chiều cao tụt theo máu nhưng có SÀN 0,45: một bức tường sắp thủng vẫn phải
  // trông như tường. Tụt thẳng về 0 thì hai ô cuối cùng trước khi vỡ đã trông y
  // như đống gạch vụn, và người xem không đọc được khoảnh khắc nó THẬT SỰ vỡ.
  //
  // GÓC cao thêm 35%, CÁNH CỬA thấp đi 28%, LẦU CỔNG cao thêm 30%. Chênh lệch
  // chiều cao là tín hiệu rẻ nhất và đọc được ở mọi mức zoom — rẻ hơn hẳn một hình
  // vẽ riêng, và nó còn đúng cả khi ô chỉ còn vài pixel. Đọc qua wallHeightMul để
  // spriteBox không thể lệch khỏi hình vẽ.
  const hMul = wallHeightMul(w);
  const h = cs * spec.h * hMul * (0.45 + 0.55 * frac);
  const isTowerGate = w.gate && !w.door;   // LẦU CỔNG — hai ô kẹp hai bên cánh cửa

  // ============================================================
  // HAI PHÉP DỰNG HÌNH KHÁC HẲN NHAU CHO HAI HƯỚNG
  // ============================================================
  // Đoạn chạy NGANG (đông-tây) thì các ô nằm CẠNH nhau, nên vẽ mỗi ô một khối cao
  // `h` ở mép dưới là đủ: hai ô liền nhau dính vào nhau theo chiều ngang.
  //
  // Đoạn chạy DỌC (bắc-nam) thì các ô nằm CHỒNG theo chiều sâu, và cùng phép vẽ
  // đó cho ra một dãy khối RỜI: khối của ô y chiếm `h` pixel cuối của ô, còn ô
  // y+1 bắt đầu lại từ đầu ô của nó, nên giữa hai khối hở đúng (cs - h) pixel.
  // Đo tận mắt ở cs=46: bức tường dọc đọc ra là một hàng cọc rời, không phải một
  // bức tường. Đây là lỗi HÌNH CHIẾU, không phải lỗi màu hay cỡ.
  //
  // Cách dựng đúng cho đoạn dọc là ĐÙN KHỐI: mặt trên là trọn footprint của ô
  // nâng lên `h`, mặt trước là dải cao `h` ở mép dưới. Ô y+1 vẽ sau (sắp theo
  // chân) sẽ phủ lên mặt trước của ô y — và điều đó ĐÚNG: mặt trước của một ô bị
  // ô đứng ngay trước nó che khuất, nên cả dãy đọc ra là MỘT dải liền, chỉ ô cuối
  // cùng phía nam còn thấy mặt trước.
  const bw = vertical ? cs * 0.62 : cs;
  const bx = vertical ? px + (cs - bw) / 2 : px;
  // "Dải đỉnh" — vùng mặt trên mà mọi kiểu đỉnh bám vào. Ngang thì nó chỉ là một
  // vạch mỏng ở mép trên khối; dọc thì nó là cả footprint đã nâng lên.
  const capX = bx, capW = bw;
  const capY = vertical ? py - h : baseY - h;
  const capH = vertical ? cs : Math.max(1, cs * 0.14);

  drawShadow(bx + bw * 0.62, baseY - cs * 0.05, bw * 0.5, cs * 0.16);
  if (vertical) {
    ctx.fillStyle = spec.top;
    ctx.fillRect(bx, capY, bw, cs);                       // mặt trên, cả chiều sâu ô
    // Vệt sáng dọc mép TÂY: nguồn sáng của cả bản đồ tới từ trên-trái (xem
    // hillshade), nên mép này phải sáng hơn — không có nó thì dải mặt trên là một
    // vệt màu phẳng và mắt không đọc ra nó đang NẰM NGANG chứ không DỰNG ĐỨNG.
    ctx.fillStyle = 'rgba(255,246,226,0.16)';
    ctx.fillRect(bx, capY, Math.max(1, bw * 0.22), cs);
    const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    g.addColorStop(0, spec.face);
    g.addColorStop(1, t.dark);
    ctx.fillStyle = g;
    ctx.fillRect(bx, baseY - h, bw, h);                   // mặt trước
  } else {
    const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    g.addColorStop(0, spec.face);
    g.addColorStop(1, t.dark);
    ctx.fillStyle = g;
    ctx.fillRect(bx, baseY - h, bw, h);
    ctx.fillStyle = spec.top;
    ctx.globalAlpha = 0.62;
    ctx.fillRect(bx, baseY - h, bw, capH);
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // CỔNG THÀNH (dựng lại ở Phase 3.33) — ba ô cánh cửa + hai lầu cổng
  // ============================================================
  // Bản trước: một ô cửa vòm kẹp giữa hai ô có vệt sáng. Ở mức thu phóng chơi thật
  // (cs 7-11) cái đó đọc ra là "một chỗ tường hơi khác màu" — mà cổng lại đúng là
  // thứ mà cả người xem lẫn kẻ tấn công cần đọc được từ xa, vì cả lý do nó tồn tại
  // là để "trận đánh ở cổng Nam" thành một câu kể được (xem CONFIG.WALL.GATE_SPAN).
  //
  // Bản này dựng nó thành một CÔNG TRÌNH có bốn tầng thông tin, xếp theo thứ tự đọc
  // được từ xa tới gần — nên mỗi mức thu phóng vẫn còn đúng lượng chi tiết nó chở nổi:
  //   1. ĐƯỜNG BAO   (mọi cs): thấp-CAO-thấp-CAO-thấp, làm bởi wallHeightMul
  //   2. LẦU CỔNG    (cs>=5): mái vát + lỗ châu mai trên hai ô cao
  //   3. VÒM CỬA     (cs>=5): vòm cuốn liền ba ô, có ĐÁ KHOÁ ĐỈNH màu bộ lạc
  //   4. CÁNH CỬA GỖ (cs>=9): hai cánh, đinh tán, then ngang, khe sáng ở giữa
  if (w.gate && cs >= 5) {
    if (isTowerGate) {
      // ---- LẦU CỔNG ----
      // Không phải "một cái tháp góc thứ năm": tháp góc có mũ VUÔNG đội trên đỉnh,
      // lầu cổng có MÁI VÁT nghiêng vào phía cửa. Hai đường bao khác nhau, và đó là
      // cách người xem phân biệt bốn góc thành với bốn cổng thành mà không phải đếm.
      const roofH = cs * 0.26;
      const roofTop = capY - roofH;
      // Hướng vát: nghiêng về phía CÁNH CỬA, đọc từ `gp` (±2) — không suy từ toạ độ.
      const inward = w.gp > 0 ? -1 : 1;
      ctx.fillStyle = mixHex(spec.top, t.dark, 0.35);
      ctx.beginPath();
      if (vertical) {
        // Đoạn dọc: dải đỉnh là cả footprint ô, nên mái vát chạy theo chiều SÂU.
        ctx.moveTo(bx - cs * 0.06, capY + (inward > 0 ? cs : 0));
        ctx.lineTo(bx + bw + cs * 0.06, capY + (inward > 0 ? cs : 0));
        ctx.lineTo(bx + bw * 0.5, roofTop + (inward > 0 ? cs * 0.5 : cs * 0.5));
      } else {
        ctx.moveTo(bx - cs * 0.08, capY + capH);
        ctx.lineTo(bx + bw + cs * 0.08, capY + capH);
        ctx.lineTo(bx + bw * (inward > 0 ? 0.72 : 0.28), roofTop);
      }
      ctx.closePath();
      ctx.fill();
      // Mép mái sáng lên: nguồn sáng trên-trái, thống nhất với cả bản đồ.
      ctx.strokeStyle = 'rgba(255,246,226,0.28)';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.stroke();
      // Lỗ châu mai — hai khe tối dọc trên mặt trước. Đây là chi tiết nói "có người
      // đứng gác trong này", và nó chỉ có ở lầu cổng: thân tường thường có răng cưa
      // trên đỉnh, không có khe.
      if (cs >= 8 && !vertical) {
        ctx.fillStyle = 'rgba(26,20,14,0.7)';
        for (const o of [0.3, 0.62]) {
          ctx.fillRect(bx + bw * o, baseY - h * 0.72, Math.max(1, bw * 0.08), h * 0.32);
        }
      }
    } else {
      // ---- CÁNH CỬA (ba ô) ----
      // Vòm cuốn LIỀN BA Ô: mỗi ô vẽ đúng phần vòm của mình, và vì `gp` nói ô này
      // đứng ở đâu (-1, 0, 1) nên ba mảnh khớp nhau thành một đường cong duy nhất
      // mà không ô nào phải biết hai ô kia đang vẽ gì. Bản cũ vẽ trọn một cái vòm
      // trong MỘT ô, nên cái cổng rộng đúng bằng một ô lưới dù nó chiếm ba.
      const gp = w.gp || 0;
      if (vertical) {
        // Đoạn dọc: mặt trước gần như không thấy, nên cửa vẽ thành một KHE TỐI cắt
        // ngang dải mặt trên — giữ nguyên cách bản cũ giải chuyện này, nó vẫn đúng.
        ctx.fillStyle = 'rgba(26,19,13,0.88)';
        ctx.fillRect(bx, py + cs * 0.1 - h, bw, cs * 0.8);
        // Ô giữa mang ĐÁ KHOÁ ĐỈNH; hai ô bên chỉ có khe.
        if (gp === 0) {
          ctx.fillStyle = t.color;
          ctx.fillRect(bx - bw * 0.1, py + cs * 0.38 - h, bw * 1.2, Math.max(1.5, cs * 0.14));
        }
      } else if (gp !== 0) {
        // ---- TRỤ CỬA (hai ô kẹp ngay cạnh lối đi) ----
        // KHÔNG vẽ vòm ở đây, và đó là bản sửa quan trọng nhất của cả cái cổng.
        //
        // Bản trước trải một cái vòm cuốn qua CẢ BA ô cánh cửa, mỗi ô vẽ phần vòm
        // của mình. Về hình học thì ba mảnh ghép khít; nhìn tận mắt thì nó hỏng vì
        // một lý do không nằm trong công thức nào: một bức tường ở phép chiếu này
        // chỉ cao ~0,8 ô, nên một lối đi RỘNG BA Ô là một cái hộp thư tỉ lệ 4:1.
        // Không đường cong nào cứu được tỉ lệ đó.
        //
        // Nên lối đi thu về ĐÚNG MỘT Ô, còn hai ô này thành TRỤ ĐỠ: một dải sáng
        // dọc ở mép trong và một rãnh tối, đủ để mắt đọc ra "cái vòm kia tựa vào
        // đây". Ba ô vẫn giữ nguyên vai trò LUẬT CHƠI của chúng (cùng 55% máu, cùng
        // là chỗ mỏng nhất của vành thành) — cái thu lại chỉ là hình vẽ.
        const inner = gp < 0 ? bx + bw : bx;
        const dir2 = gp < 0 ? -1 : 1;
        ctx.fillStyle = 'rgba(238,226,200,0.20)';
        ctx.fillRect(inner + dir2 * bw * 0.16, baseY - h, bw * 0.16, h);
        ctx.fillStyle = 'rgba(24,17,11,0.34)';
        ctx.fillRect(inner - (dir2 > 0 ? 0 : bw * 0.06), baseY - h, bw * 0.06, h);
        // Bệ chân trụ — một gờ ngang ở đáy, thứ làm cái trụ đứng trên đất thay vì
        // mọc ra từ đó.
        if (cs >= 8) {
          ctx.fillStyle = 'rgba(255,246,226,0.14)';
          ctx.fillRect(bx, baseY - h * 0.14, bw, Math.max(1, cs * 0.07));
        }
      } else {
        // ---- LỐI ĐI: trọn một ô, cao gần trọn KHỐI CỔNG ----
        // 0,88 chứ không 1,0 — còn chừa một dải tường trên vòm, và chính dải ấy làm
        // mắt đọc ra "đi xuyên qua" thay vì "tường bị khuyết". Khối cổng lại cao hơn
        // thân tường (1,06 — xem wallHeightMul), nên cái vòm cao gần bằng trọn bức
        // tường bên cạnh: đúng tỉ lệ của một lối đi.
        const dh = h * 0.88;
        const archTop = baseY - dh;
        // ĐƯỜNG VÒM DỰNG MỘT LẦN, DÙNG HAI LẦN: một lần tô đen làm lòng cổng, một
        // lần làm VÙNG CẮT cho hai cánh cửa gỗ. Bản trước vẽ cửa gỗ bằng một
        // `fillRect` trọn bề ngang ô và ván gỗ TRÀN RA NGOÀI vòm — đúng họ lỗi "hai
        // công thức cùng tả một đường cong" đã cắn hai lần trong một hình vẽ ở 3.32,
        // và cách chữa vẫn là cách cũ: đừng tả lại đường cong, hãy DÙNG LẠI chính nó.
        const archPath = () => {
          ctx.beginPath();
          ctx.moveTo(bx + bw * 0.06, baseY);
          ctx.lineTo(bx + bw * 0.06, archTop + dh * 0.42);
          ctx.quadraticCurveTo(bx + bw * 0.5, archTop - dh * 0.16, bx + bw * 0.94, archTop + dh * 0.42);
          ctx.lineTo(bx + bw * 0.94, baseY);
          ctx.closePath();
        };
        ctx.fillStyle = 'rgba(26,19,13,0.92)';
        archPath();
        ctx.fill();

        // ĐÁ KHOÁ ĐỈNH — một viên hình nêm màu bộ lạc cắm ở đỉnh vòm. Đây là chỗ duy
        // nhất trên cả vành thành mang màu bộ lạc ở độ đậm đầy đủ, nên nó vừa là dấu
        // chủ quyền vừa là điểm neo mắt: nhìn thấy chấm màu ấy là biết mình đang nhìn
        // vào cổng, không phải một lỗ thủng.
        //
        // HAI ĐẦU CỦA VIÊN NÊM PHẢI NẰM TRONG MẶT TƯỜNG. Bản đầu đặt đỉnh nó ở
        // `archTop − 0,16·dh`, chép đúng con số của ĐIỂM ĐIỀU KHIỂN đường bậc hai —
        // nhưng điểm điều khiển KHÔNG nằm trên đường cong: đỉnh thật của cung ở
        // t = 0,5 là `archTop + 0,13·dh`, thấp hơn gần một phần ba dh. Hệ quả nhìn
        // thấy được: viên nêm chọc lên khỏi mép trên bức tường thành một cái chóp
        // nhọn, và ở bậc Tường đá nó đọc ra là một ngọn đuốc. Đây là họ lỗi "hai
        // công thức cùng tả một đường cong" lần thứ ba — lần này tôi lấy tham số
        // của đường cong thay vì lấy GIÁ TRỊ của nó.
        const apexY = archTop + dh * 0.13;    // đỉnh THẬT của cung, tính từ t = 0,5
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.37, apexY + dh * 0.13);
        ctx.lineTo(bx + bw * 0.63, apexY + dh * 0.13);
        ctx.lineTo(bx + bw * 0.58, apexY - dh * 0.12);
        ctx.lineTo(bx + bw * 0.42, apexY - dh * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.42)';
        ctx.lineWidth = Math.max(0.8, cs * 0.045);
        ctx.stroke();

        // ---- CÁNH CỬA GỖ, chỉ khi còn đọc được ----
        if (cs >= 9) {
          const leafTop = baseY - dh * 0.72;
          // CẮT THEO ĐÚNG ĐƯỜNG VÒM VỪA VẼ, nên ván gỗ không thể tràn ra ngoài lối
          // đi ở bất kỳ bậc thành nào.
          ctx.save();
          archPath();
          ctx.clip();
          ctx.fillStyle = mixHex('#5a4025', t.dark, 0.35);
          ctx.fillRect(bx, leafTop, bw, baseY - leafTop);
          ctx.strokeStyle = 'rgba(28,20,12,0.55)';
          ctx.lineWidth = Math.max(0.8, cs * 0.045);
          for (let i = 1; i < 4; i++) {
            const vx = bx + bw * (i / 4);
            ctx.beginPath(); ctx.moveTo(vx, leafTop); ctx.lineTo(vx, baseY); ctx.stroke();
          }
          // Hai đai sắt ngang + đinh tán. Đinh tán là chi tiết đắt nhất về mặt nhận
          // diện: không có nó thì cái cửa đọc ra là một vạt gỗ, có nó thì nó đọc ra
          // là một thứ được đóng để CHỊU ĐÒN.
          for (const o of [0.24, 0.68]) {
            const by2 = leafTop + (baseY - leafTop) * o;
            ctx.fillStyle = '#3d3831';
            ctx.fillRect(bx, by2, bw, Math.max(1, cs * 0.075));
            if (cs >= 13) {
              ctx.fillStyle = '#7d7568';
              for (let i = 0; i < 4; i++) {
                ctx.fillRect(bx + bw * (0.13 + i * 0.25), by2 + cs * 0.012, Math.max(1, cs * 0.05), Math.max(1, cs * 0.05));
              }
            }
          }
          // KHE SÁNG giữa hai cánh, chạy đúng trục đối xứng. Một vệt sáng mảnh ở đó
          // là thứ nói "cửa này MỞ ĐƯỢC", và đó là khác biệt duy nhất giữa một cái
          // cổng và một mảng tường có hoa văn.
          ctx.fillStyle = 'rgba(236,220,184,0.4)';
          ctx.fillRect(bx + bw * 0.5 - Math.max(0.5, cs * 0.022), leafTop, Math.max(1, cs * 0.045), baseY - leafTop);
          ctx.restore();
        }
      }
    }
  }

  // ---- ĐỈNH TƯỜNG: năm kiểu, một kiểu mỗi thời đại ----
  //
  // Trang trí bám vào DẢI ĐỈNH, và dải đỉnh đổi hình theo hướng — nên cùng một
  // kiểu đỉnh chạy ngang trên đoạn đông-tây và chạy dọc trên đoạn bắc-nam mà
  // không phải viết hai bảng kiểu.
  if (cs >= 5) {
    const teeth = frac > 0.66 ? 3 : frac > 0.33 ? 2 : 1;
    ctx.fillStyle = t.color;
    if (spec.cap === 'stake') {
      // ĐỜI 1 — cọc gỗ vót nhọn. Không có răng cưa: hàng rào không có lỗ châu mai,
      // và đó chính là thứ nói ra rằng bậc này chưa phải một toà thành.
      ctx.fillStyle = spec.top;
      for (let i = 0; i < teeth + 1; i++) {
        const f = (i + 0.5) / (teeth + 1);
        const sx = vertical ? capX + capW * 0.5 : capX + capW * f;
        const sy = vertical ? capY + capH * f : capY;
        ctx.beginPath();
        ctx.moveTo(sx - cs * 0.07, sy + cs * 0.03);
        ctx.lineTo(sx, sy - cs * 0.14);
        ctx.lineTo(sx + cs * 0.07, sy + cs * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    } else if (spec.cap === 'flat') {
      // ĐỜI 2 — đất nện: một dải màu bộ lạc chạy dọc theo đỉnh, không răng.
      if (vertical) ctx.fillRect(capX, capY, Math.max(1, capW * 0.30), capH);
      else          ctx.fillRect(capX, capY - cs * 0.05, capW, Math.max(1, cs * 0.07));
    } else if (spec.cap === 'tile') {
      // ĐỜI 5 — mái ngói men úp lên đỉnh tường + một dải vàng lá dưới mái.
      ctx.fillStyle = '#8fbfa8';
      if (vertical) {
        ctx.fillRect(capX - cs * 0.05, capY, capW + cs * 0.10, capH);
        ctx.fillStyle = '#d8a544';
        ctx.fillRect(capX + capW * 0.42, capY, Math.max(1, capW * 0.20), capH);
      } else {
        ctx.beginPath();
        ctx.moveTo(capX - cs * 0.06, capY + cs * 0.02);
        ctx.lineTo(capX + capW / 2, capY - cs * 0.20);
        ctx.lineTo(capX + capW + cs * 0.06, capY + cs * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d8a544';
        ctx.fillRect(capX, capY + cs * 0.02, capW, Math.max(1, cs * 0.05));
      }
    } else {
      // ĐỜI 3 (răng cưa) và ĐỜI 4 (răng cưa + lỗ châu mai). Số răng là thứ ĐẾM
      // ĐƯỢC, nên nó nói ra mức hư hại chính xác hơn màu — cùng lý do đã viết cho
      // vành lan can của tháp canh.
      for (let i = 0; i < teeth; i++) {
        if (vertical) {
          ctx.fillRect(capX - cs * 0.09, capY + capH * (0.10 + i * 0.30),
                       Math.max(1, cs * 0.12), capH * 0.20);
        } else {
          ctx.fillRect(capX + capW * (0.08 + i * 0.32), capY - cs * 0.12,
                       capW * 0.2, cs * 0.13);
        }
      }
      if (spec.cap === 'slit') {
        ctx.fillStyle = 'rgba(24,18,12,0.72)';
        if (vertical) ctx.fillRect(capX + capW * 0.44, capY + capH * 0.34, Math.max(1, capW * 0.16), capH * 0.30);
        else          ctx.fillRect(capX + capW * 0.44, baseY - h * 0.70, Math.max(1, cs * 0.07), Math.max(1, h * 0.3));
      }
    }
  }

  // ---- Ô GÓC: một cái mũ vuông đè lên đỉnh, đọc ra là "tháp góc" ----
  if (w.corner && cs >= 5) {
    ctx.fillStyle = spec.top;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(px - cs * 0.10, baseY - h - cs * 0.10, cs * 1.20, Math.max(1, cs * 0.14));
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.color;
    ctx.fillRect(px + cs * 0.42, baseY - h - cs * 0.30, Math.max(1, cs * 0.16), cs * 0.22);
  }

  // Chớp trắng khi vừa ăn đòn. Đo bằng `hitTick` chứ không bằng `flash` như quân
  // lính và công trình: `flash` được TRỪ DẦN trong vòng cập nhật khung hình, mà ô
  // tường không nằm trong mảng nào của vòng đó — dùng nó thì ô tường sẽ trắng xoá
  // vĩnh viễn kể từ đòn đầu tiên. Một trường không có ai chăm sóc là một trường
  // không được dùng.
  if (tick - w.hitTick < 3) {
    ctx.fillStyle = 'rgba(255,246,226,0.45)';
    if (vertical) ctx.fillRect(bx, capY, bw, cs + h);
    else          ctx.fillRect(bx, baseY - h, bw, h);
  }
}

function renderWorld() {
  labelQueue.length = 0;   // khung hình trước có thể thoát sớm; đừng để nhãn cũ trôi sang

  // DẢI HUD trên đỉnh — một nguồn sự thật duy nhất, dùng cho cả canvas lẫn HTML.
  // Thanh Kỳ quan là thứ duy nhất được phép chiếm mép trên; mọi thứ khác đọc con
  // số này rồi tự tránh ra. Tính ở ĐẦU hàm vì lớp nhãn thế giới (vẽ ở giữa hàm)
  // cũng phải biết mấy tấm thẻ sử sẽ đậu chỗ nào.
  const hudTop = (wonderWatch && eraState === 'playing') ? HUD_BAR_H : 0;
  if (canvasWrap.__hudTop !== hudTop) {
    canvasWrap.style.setProperty('--hud-top', hudTop + 'px');
    canvasWrap.__hudTop = hudTop;
  }
  const toastLay = mapToasts.length ? layoutToasts(hudTop) : null;
  const cs = CONFIG.CELL_SIZE;
  if (terrainDirty) renderTerrainLayer();

  // Nền: một lệnh blit từ lớp địa hình đã vẽ sẵn.
  const LP = CONFIG.TERRAIN.LAYER_PX;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(terrainCanvas,
    camX * LP, camY * LP, CONFIG.VIEWPORT_WIDTH * LP, CONFIG.VIEWPORT_HEIGHT * LP,
    0, 0, simCanvas.width, simCanvas.height);

  // Thứ tự có chủ ý: sóng nước nằm TRÊN mặt nước nhưng DƯỚI bóng mây (mây che cả
  // hồ), và lãnh thổ nằm trên cùng của nhóm nền vì nó là thông tin, không phải
  // cảnh vật — thông tin không được để cảnh vật đè lên.
  drawReedSway(cs);
  // ĐƯỜNG CÁI nằm TRÊN địa hình nhưng DƯỚI bóng mây và DƯỚI lãnh thổ. Cả ba vị trí
  // trong chồng lớp này đều là quyết định:
  //   · trên địa hình — nó là thứ người ta ĐẮP LÊN mặt đất, không phải một loại đất.
  //   · dưới bóng mây — mây phải quét qua cả con đường, nếu không đường trông như
  //     một lớp giao diện dán đè lên cảnh vật chứ không phải một vật thể trong thế giới.
  //   · dưới lãnh thổ — biên giới là THÔNG TIN, và luật đã ghi ở dòng ngay dưới nói
  //     rằng thông tin không được để cảnh vật đè lên. Con đường là cảnh vật.
  drawRoads(cs);
  drawCloudShadows(cs);
  renderTerritory(cs);
  drawCombatRings(cs);

  for (const r of ruins) {
    const [px, py] = worldToPx(r.x, r.y);
    if (!inView(px, py, r.size * cs)) continue;
    drawRuin(r, px, py, cs);
  }

  for (const cell of resourceCells.values()) {
    const [px, py] = worldToPx(cell.x, cell.y);
    if (!inView(px, py, cs * 2)) continue;
    const ratio = cell.max ? cell.amount / cell.max : 0;
    if (cell.type === 'wood') drawTree(cell.x, cell.y, px, py, cs, ratio);
    else if (cell.type === 'food') drawBerry(cell.x, cell.y, px, py, cs, ratio, !!cell.farmOf);
    else if (cell.type === 'gold') drawGold(cell.x, cell.y, px, py, cs, ratio);
    else drawStone(cell.x, cell.y, px, py, cs, ratio);
  }

  drawHeroAuras(cs);
  drawCampRings(cs);

  // Sắp theo y để cái ở dưới vẽ đè cái ở trên — ảo giác chiều sâu kiểu 2.5D,
  // thay vì nhà cửa/quân lính chồng lên nhau theo thứ tự ngẫu nhiên trong mảng.
  const drawables = [];
  for (const b of buildings) {
    const [px, py] = worldToPx(b.x, b.y);
    // Đệm culling phải cộng CHIỀU CAO sprite, không chỉ size. Thiếu nó thì công
    // trình có chân vừa trôi khỏi mép dưới khung hình bị loại luôn, và mái của nó
    // hiện nguyên khối thay vì trồi lên dần — cú pop-in rất lộ khi camera đang lia.
    if (inView(px, py, (b.size + buildingSpriteHeight(b)) * cs + cs * 2)) {
      drawables.push({ y: b.y, kind: 'b', o: b, px, py });
    }
  }
  for (const l of lairs) {
    const [px, py] = worldToPx(l.x, l.y);
    // pad rộng bằng cả vùng quầng tím, nếu không quầng bị cắt cụt ở mép khung hình
    if (inView(px, py, lairRoam(l) * cs)) drawables.push({ y: l.y, kind: 'l', o: l, px, py });
  }
  // TƯỜNG THÀNH đi vào ĐÚNG danh sách sắp theo chiều sâu này, không vẽ thành một
  // lượt riêng trước quân lính. Vẽ trước thì mọi người lính đều nổi lên trên mặt
  // tường, kể cả người đang đứng PHÍA SAU nó — và cả cảm giác "bên trong / bên
  // ngoài", thứ duy nhất mà bức tường sinh ra để tạo, biến mất sạch.
  for (const w of wallCells.values()) {
    const [px, py] = worldToPx(w.x, w.y);
    if (inView(px, py, cs * 2)) drawables.push({ y: w.y, kind: 'w', o: w, px, py });
  }
  for (const it of groundItems) {
    const [px, py] = worldToPx(it.x, it.y);
    if (inView(px, py, cs * 3)) drawables.push({ y: it.y, kind: 'i', o: it, px, py });
  }
  for (const u of units) {
    // Toạ độ VẼ, không phải toạ độ ô. Cả ba thứ dưới đây phải đọc CÙNG một nguồn:
    // vị trí vẽ, khoá sắp xếp theo chiều sâu, và hộp bao dùng cho hit-test — lệch
    // một trong ba là click trượt hoặc quân chui qua nhau. Đây đúng là họ lỗi
    // "điều hướng bằng đại lượng này, so sánh bằng đại lượng khác" đã cắn ở 3.1.
    const [px, py] = worldToPx(uRX(u), uRY(u));
    // Đệm culling phải phủ được sprite CAO NHẤT của nhóm, cùng lý do đã viết cho
    // công trình vài dòng trên. Từ 3.22 nhóm quái có con vẽ tới 2,7 ô và con phi
    // long còn treo thêm gần một ô nữa phía trên — với đệm 2 ô thì chúng bị loại
    // khi chân vừa ra khỏi mép và cả cái đầu biến mất nguyên khối.
    if (inView(px, py, cs * (u.type === 'monster' ? 4.5 : 2))) {
      drawables.push({ y: uRY(u), kind: 'u', o: u, px, py });
    }
  }
  // Sắp theo CHÂN, không theo TÂM. Với sprite phẳng thì hai cách cho kết quả gần
  // như nhau nên sai số này vô hình suốt từ đầu; sprite cao lên bao nhiêu thì nó lộ
  // ra bấy nhiêu. Ví dụ: nhà chính size 3 tâm y=100 có chân ở 101,5; căn nhà size 2
  // nhét vào góc Bắc tâm y=101 lại có chân ở 102 — sắp theo tâm thì căn nhà PHÍA SAU
  // được vẽ ĐÈ LÊN nhà chính. Đây đúng là họ lỗi "điều hướng bằng đại lượng này,
  // so sánh bằng đại lượng khác" đã cắn ở Phase 3.1, lần này là tâm-vs-chân.
  // Cố tình bắt theo d.kind chứ không phải `o.size !== undefined`: hang ổ cũng có
  // size, và duck-typing trên tên trường đã một lần làm vỡ CONFIG.BUILD lookup.
  // Ô tường có size 1 nên chân của nó là y + 0,5 — cùng công thức với công trình,
  // và phải viết ra thay vì rơi vào nhánh `: d.y` của quân lính: lệch nửa ô là
  // người lính đứng NGAY TRƯỚC chân tường bị vẽ chìm sau nó.
  const baseOf = (d) => (d.kind === 'b' || d.kind === 'l') ? d.y + d.o.size / 2
                      : d.kind === 'w' ? d.y + 0.5
                      : d.y;
  drawables.sort((a, b) => baseOf(a) - baseOf(b));
  for (const d of drawables) {
    if (d.kind === 'b') drawBuilding(d.o, d.px, d.py, cs);
    else if (d.kind === 'l') drawLair(d.o, d.px, d.py, cs);
    else if (d.kind === 'i') drawGroundItem(d.o, d.px, d.py, cs);
    else if (d.kind === 'w') drawWall(d.o, d.px, d.py, cs);
    else { drawUnit(d.o, d.px, d.py, cs); drawSupplyMark(d.o, d.px, d.py, cs); }
  }
  lastDrawables = drawables;   // hit-test đọc lại đúng danh sách này, xem selectAt

  drawOccludedUnits(drawables, cs);

  for (const f of fx) drawFx(f, cs);

  // Tên bộ lạc nổi trên thủ đô — biết ai đang ở đâu mà không cần đối chiếu màu.
  // Ưu tiên 3 (cao nhất): nhà chính đứng yên một chỗ suốt kỷ nguyên, nên nhãn của
  // nó là cái mốc; thứ nào di chuyển thì thứ đó phải né.
  if (cs >= 5) {
    const font = `600 ${Math.max(11, Math.round(cs * 1.7))}px ${F_DISPLAY}`;
    for (const b of buildings) {
      if (b.type !== 'town' || !b.done) continue;
      const [px, py] = worldToPx(b.x, b.y);
      if (!inView(px, py, cs * 8)) continue;
      const t = tribes[b.tribeId];
      // Nhãn treo trên ĐỈNH cột cờ. Hằng số -2.4 ô cũ giờ rơi vào giữa thân nhà chính.
      const labelY = py + cs / 2 + (b.size * cs) / 2 - buildingSpriteHeight(b) * cs - cs * 0.9;
      queueLabel(t.name, px + cs / 2, labelY, font, t.color, 3);
    }
  }
  flushLabels(toastLay && toastLay.blockers);

  const sel = getSelected();
  if (sel) {
    const [px, py] = worldToPx(uRX(sel), uRY(sel));
    // Vòng chọn nằm DƯỚI CHÂN vật thể và dẹt theo phối cảnh. Vòng tròn đặt ở tâm ô
    // trông như đang lơ lửng ngang bụng công trình khi nhà đã cao lên.
    const isB = selected.kind === 'building' || selected.kind === 'lair';
    const sz = isB ? sel.size : 1;
    const rx = cs * sz * (isB ? 0.72 : 0.85);
    const gy = py + cs / 2 + (isB ? (sz * cs) / 2 : cs * 0.5);
    ctx.strokeStyle = '#f0cf85';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -aTick * 0.3;
    ctx.beginPath(); ctx.ellipse(px + cs / 2, gy, rx, rx * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (sel.resTarget) {
      const [tx, ty] = worldToPx(sel.resTarget.x + 0.5, sel.resTarget.y + 0.5);
      ctx.strokeStyle = 'rgba(255,235,59,0.6)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px + cs / 2, py + cs / 2); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Biến cố lớn — MỘT DÒNG SỬ ĐƯỢC ĐÓNG DẤU.
  //
  // Đây là chỗ duy nhất trong cả bản này được phép ồn ào, và nó ồn ào có lý
  // do. Trò chơi không có người chơi: bạn chỉ ngồi xem, và thứ bạn thật sự
  // đang xem là một cuốn biên niên sử tự viết lấy. Một thông báo trôi qua bằng
  // chữ sans trên hộp xám thì đọc ra "log của phần mềm"; cùng đúng câu chữ ấy
  // mà được ĐÓNG DẤU xuống bản đồ thì đọc ra "việc này đã được chép lại". Con
  // dấu son mang số kỷ nguyên nên nó còn chở thêm một mẩu thông tin: chuyện
  // này xảy ra ở đời nào.
  //
  // Cú đóng dấu là một phép nhún: hiện ra to hơn 22% rồi sập xuống đúng cỡ
  // trong 9 khung hình, kèm một vòng mực loang bật ra. Không dùng thêm biến
  // hoạt ảnh nào — pha đọc thẳng từ (maxLife - life), nên nó không bao giờ
  // lệch pha với vòng đời của chính thông báo.
  //
  // Chỗ đứng (toạ độ, bề ngang, có phải xuống hàng dưới không) đã tính xong ở đầu
  // hàm bằng `layoutToasts` — xem chú thích ở đó.
  if (toastLay) {
    for (let ti = 0; ti < mapToasts.length; ti++) {
      const t = mapToasts[ti], row = toastLay.rows[ti];
      const a = t.life > t.maxLife - 20 ? (t.maxLife - t.life) / 20
              : t.life < 40 ? t.life / 40 : 1;
      const age = t.maxLife - t.life;
      const stamp = clamp(age / 9, 0, 1);
      const scale = 1 + (1 - stamp) * (1 - stamp) * 0.22;

      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(toastLay.cx, row.y);
      ctx.scale(scale, scale);

      const H = 30, SEAL = H;                       // con dấu vuông, cao bằng khối
      ctx.font = `15px ${F_DISPLAY}`;
      const txt = row.txt, tw = row.tw;
      const W = SEAL + 16 + tw + 16;
      const x0 = -W / 2, y0 = -H / 2;

      // Vòng mực loang lúc dấu vừa chạm xuống
      if (stamp < 1) {
        ctx.globalAlpha = clamp(a, 0, 1) * (1 - stamp) * 0.5;
        ctx.strokeStyle = '#c4402d';
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 - (1 - stamp) * 9, y0 - (1 - stamp) * 9,
                       W + (1 - stamp) * 18, H + (1 - stamp) * 18);
        ctx.globalAlpha = clamp(a, 0, 1);
      }

      ctx.fillStyle = 'rgba(13,11,9,0.9)';          // thân: sơn ta
      ctx.fillRect(x0, y0, W, H);
      ctx.strokeStyle = 'rgba(216,165,68,0.3)';     // sợi vàng lá viền quanh
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, W - 1, H - 1);

      ctx.fillStyle = '#c4402d';                    // con dấu son
      ctx.fillRect(x0, y0, SEAL, H);
      const grain = getInkGrain();
      if (grain) { ctx.fillStyle = grain; ctx.fillRect(x0, y0, SEAL, H); }
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(251,238,224,0.72)';
      ctx.font = `7px ${F_UI}`;
      ctx.fillText('KỶ', x0 + SEAL / 2, y0 + 11);
      ctx.fillStyle = '#fbeee0';
      ctx.font = `700 14px ${F_DISPLAY}`;
      ctx.fillText(String(era), x0 + SEAL / 2, y0 + H - 6);

      ctx.textAlign = 'left';                       // dòng chữ + gạch chân màu phe
      ctx.fillStyle = '#e7dcc6';
      ctx.font = `15px ${F_DISPLAY}`;
      ctx.fillText(txt, x0 + SEAL + 16, y0 + H / 2 + 3);
      ctx.fillStyle = t.color;
      ctx.fillRect(x0 + SEAL + 16, y0 + H - 7, tw, 1.5);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // Đồng hồ Kỳ quan — dải đếm ngược bám sát mép trên khung hình.
  //
  // Đặt trên CANVAS chứ không trong bảng bên phải, và đó là cả điểm của nó: khi
  // đồng hồ chạy thì mọi thứ đáng xem đều đang xảy ra trong khung hình, và người
  // xem không được phải rời mắt khỏi trận đánh để biết còn bao lâu.
  if (wonderWatch && eraState === 'playing') {
    const owner = tribes[wonderWatch.tribeId];
    const left = Math.max(0, CONFIG.WONDER.HOLD_TICKS - (tick - wonderWatch.doneAt));
    const prog = 1 - left / CONFIG.WONDER.HOLD_TICKS;
    const W = simCanvas.width, barH = HUD_BAR_H;
    ctx.fillStyle = 'rgba(11,9,7,0.86)';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillStyle = owner.dark;
    ctx.fillRect(0, 0, W * prog, barH);
    ctx.fillStyle = owner.color;
    ctx.fillRect(0, barH - 2, W * prog, 2);
    ctx.textAlign = 'center';
    ctx.font = `14px ${F_DISPLAY}`;
    ctx.fillStyle = '#f0cf85';
    // Thanh này chiếm trọn bề ngang và minimap/nút đã dịch xuống dưới nó (biến
    // --hud-top), nên căn giữa khung hình giờ đúng nghĩa là giữa chỗ trống. Vẫn
    // cắt cho vừa: ở cửa sổ hẹp, câu đầy đủ dài hơn cả khung.
    ctx.fillText(fitText(`🏛 KỲ QUAN của ${owner.name} — còn ${left} tick là thống nhất thiên hạ`, W - 24),
                 W / 2, barH - 8);
    ctx.textAlign = 'left';
  }

  // Vignette: tối bốn góc lại, kéo mắt vào giữa khung. Rẻ và làm ảnh "có chất phim".
  const vg = ctx.createRadialGradient(
    simCanvas.width / 2, simCanvas.height / 2, simCanvas.height * 0.42,
    simCanvas.width / 2, simCanvas.height / 2, simCanvas.height * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, simCanvas.width, simCanvas.height);

  drawHudBar();
}

function renderMinimap() {
  const s = CONFIG.MINIMAP_SCALE;
  if (minimapTerrainCanvas.width) mctx.drawImage(minimapTerrainCanvas, 0, 0);
  else { mctx.fillStyle = '#1e2b1f'; mctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height); }

  // Lãnh thổ trên minimap: đây mới là chỗ nhìn ra "ai đang thắng" trong một giây.
  if (territoryOwner) {
    const C = CONFIG.TERRITORY.CELL;
    mctx.globalAlpha = 0.5;
    for (let ty = 0; ty < terrH; ty++) {
      for (let tx = 0; tx < terrW; tx++) {
        const owner = territoryOwner[ty * terrW + tx];
        if (owner < 0) continue;
        mctx.fillStyle = tribes[owner].color;
        mctx.fillRect(tx * C * s, ty * C * s, C * s, C * s);
      }
    }
    mctx.globalAlpha = 1;
  }

  for (const b of buildings) {
    mctx.fillStyle = b.type === 'town' ? '#ffffff' : tribes[b.tribeId].color;
    const w = Math.max(2, b.size * s);
    mctx.fillRect(b.x * s - w / 2, b.y * s - w / 2, w, w);
  }
  // Hang ổ trên minimap: người xem phải biết cần tránh chỗ nào TRƯỚC khi đưa quân
  // tới đó, mà bản đồ giờ rộng gấp đôi khung nhìn nên minimap là chỗ duy nhất thấy được.
  for (const l of lairs) {
    const skin = lairSkin(l);
    mctx.fillStyle = `rgba(${skin.glow},${0.22 + l.tier * 0.06})`;
    mctx.beginPath();
    mctx.arc(l.x * s, l.y * s, lairRoam(l) * s, 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = skin.edge;
    const w = Math.max(3, s * (2.6 + l.tier * 0.7));
    mctx.fillRect(l.x * s - w / 2, l.y * s - w / 2, w, w);
  }

  for (const u of units) {
    if (u.type === 'hero') continue;
    if (u.type === 'monster') {
      // Quái của sóng vẽ đỏ và to hơn: trên minimap đây là thông tin quan trọng
      // nhất của chế độ thủ thành — sóng đang tới từ hướng nào.
      mctx.fillStyle = u.assault ? '#e04b32' : '#a86ac6';
      const mw = Math.max(1, s * (u.assault ? 2.4 : 1.6));
      mctx.fillRect(u.x * s, u.y * s, mw, mw);
      continue;
    }
    mctx.fillStyle = tribes[u.tribeId].color;
    // `isSiege` chứ không phải `type === 'catapult'`: nỏ thần vốn rơi xuống nhánh
    // "quân sự thường" (1,8) nên trên minimap nó nhỏ hơn một con ngựa — cùng con lỗi
    // "một bảng tra có hai nguồn sự thật" mà cờ `siege: true` trong CONFIG.UNIT sinh
    // ra để dập tắt. Thêm một loại máy công thành nữa thì chỗ này tự đúng.
    const w = Math.max(1, s * (isSiege(u.type) ? 2.6 : isCavalry(u.type) ? 2.9
                             : isMilitary(u.type) ? 1.8 : 1));
    mctx.fillRect(u.x * s, u.y * s, w, w);
  }
  // Anh hùng vẽ sau cùng, viền vàng: trên minimap chỉ có 4 chấm này là "ai đó"
  // chứ không phải "một đơn vị nào đó", nên chúng không được phép bị đè.
  for (const u of units) {
    if (u.type !== 'hero') continue;
    const w = Math.max(4, s * 3.4);
    mctx.fillStyle = '#d8a544';
    mctx.fillRect(u.x * s - w / 2, u.y * s - w / 2, w, w);
    mctx.fillStyle = tribes[u.tribeId].color;
    mctx.fillRect(u.x * s - w / 2 + 1, u.y * s - w / 2 + 1, w - 2, w - 2);
  }
  // Điểm nóng nhấp nháy = có đánh nhau ở đó ngay lúc này.
  for (const h of hotspots) {
    if (h.weight < 2) continue;
    mctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.4 * Math.sin(aTick * 0.15)})`;
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.arc(h.x * s, h.y * s, 4 + Math.min(6, h.weight * 0.4), 0, Math.PI * 2);
    mctx.stroke();
  }

  mctx.strokeStyle = '#f0cf85';
  mctx.lineWidth = 1;
  mctx.strokeRect(camX * s, camY * s, CONFIG.VIEWPORT_WIDTH * s, CONFIG.VIEWPORT_HEIGHT * s);
}

