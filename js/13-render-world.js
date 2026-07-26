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
const ctx = simCanvas.getContext('2d');

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
function buildingSpriteHeight(b) {
  if (b.type === 'farm') return 0;                    // ruộng nằm phẳng trên mặt đất
  const hMul = CONFIG.BUILD_HEIGHT[b.type] || 1;
  const apex = b.size * (1.06 * hMul - 0.04);         // chân -> đỉnh mái (thân 0.72 + mái 0.34)
  const crest = b.type === 'town' ? b.size * 0.53     // cột cờ
              : b.type === 'tower' ? b.size * 0.30    // vọng lâu nhô ra
              : b.type === 'temple' ? b.size * 0.14   // quả cầu vàng trên nóc
              : 0;
  // Kỳ quan không dùng công thức thân+mái: nó được vẽ thành kim tự tháp bậc thang
  // cao đúng bodyH, cộng chóp vàng. Trả về theo công thức chung thì hộp bao sẽ cao
  // hơn hình thật gần một ô rưỡi, và hit-test sẽ ăn cả một vạt trời phía trên nó.
  if (b.type === 'wonder') return b.size * (0.72 * hMul + 0.4);
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
  if (b.type === 'farm' || b.type === 'wonder') return 0.08;
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
  { name: 'mạ vàng',   roof: '#c9992f', trim: '#f0cf85', tint: 0.14 }]; // Hoàng Kim

function ageMat(tribe) { return AGE_MAT[clamp(tribe.age || 1, 1, 4)]; }

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
const OWN_CREST = { town: 1, tower: 1, temple: 1 };

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
function drawAgeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed) {
  const age = clamp(tribe.age || 1, 1, 4);
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
  const hMul = CONFIG.BUILD_HEIGHT[b.type] || 1;
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
  } else {
    ctx.fillRect(x, bodyTop, s, bodyH);
    // Mái: tam giác tối màu hơn thân, phủ hết bề ngang. Màu mái đổi theo THỜI ĐẠI
    // (xem ageRoofColor) — đây là tín hiệu "lên đời" đọc được ở mọi mức zoom.
    ctx.fillStyle = ageRoofColor(tribe);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.08, bodyTop + s * 0.04);
    ctx.lineTo(x + s * 0.5, apexY);
    ctx.lineTo(x + s * 1.08, bodyTop + s * 0.04);
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
      ctx.fillRect(x + s * 0.4, baseY - s * 0.4, s * 0.2, s * 0.4);
      ctx.fillStyle = 'rgba(255, 240, 190, 0.55)';
      ctx.fillRect(x + s * 0.66, baseY - s * 0.55, s * 0.14, s * 0.14);
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
  if (b.type !== 'farm' && b.type !== 'wonder') {
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

function drawBattleAxe(u, cx, cy, cs, bob, bodyW) {
  const dir = u.facingX >= 0 ? 1 : -1;
  const k = swingK(u);
  const ang = AXE_READY + (AXE_HIT - AXE_READY) * swingChop(k);
  const hx = cx + dir * bodyW * 0.44, hy = cy + bob - cs * 0.04;   // bàn tay
  const L = cs * 0.74;
  const vx = Math.cos(ang) * dir, vy = Math.sin(ang);
  const tx = hx + vx * L, ty = hy + vy * L;
  const px = -vy * dir, py = vx * dir;                             // pháp tuyến của cán

  drawSwingTrail(k, hx, hy, L * 1.02, AXE_READY, AXE_HIT, dir,
                 '#fff0d8', Math.max(1, cs * 0.16));

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b4a2b';                                     // cán gỗ
  ctx.lineWidth = Math.max(1.2, cs * 0.11);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.lineCap = 'butt';

  // Đầu rìu: nêm thép chìa ra khỏi đầu cán, dày về một bên.
  ctx.fillStyle = '#cfd3d0';
  ctx.beginPath();
  ctx.moveTo(tx - vx * cs * 0.12, ty - vy * cs * 0.12);
  ctx.lineTo(tx + vx * cs * 0.30 + px * cs * 0.24, ty + vy * cs * 0.30 + py * cs * 0.24);
  ctx.lineTo(tx + vx * cs * 0.30 - px * cs * 0.12, ty + vy * cs * 0.30 - py * cs * 0.12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Vác hàng về — mỗi tài nguyên một hình dáng riêng thay cho một khối màu chung:
// bó củi, thỏi vàng ("bê vàng về"), tảng đá, giỏ lương. Đọc được ngay dân đang
// gánh gì mà không cần click vào.
function drawCarriedLoad(u, cx, cy, bodyH, cs, bob) {
  const t = u.carry.type, topY = cy - bodyH * 0.98 + bob;
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
  if (isCavalry(u.type)) { drawCavalry(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }

  const detailed = cs >= 9;
  const isArcher = u.type === 'archer';
  const isSoldier = u.type === 'soldier' || isArcher;
  drawShadow(cx, cy + cs * 0.5, cs * (isSoldier ? 0.42 : 0.34), cs * 0.17);

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
    // Zoom gần: vẽ hẳn hình người — thân + đầu, lính thêm mũ và vũ khí.
    const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
    const bodyW = cs * (isSoldier ? 0.62 : 0.5), bodyH = cs * 0.68;
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(cx - bodyW / 2, cy - bodyH * 0.2 + bob, bodyW, bodyH);
    ctx.fillStyle = tribe.color;
    ctx.fillRect(cx - bodyW / 2, cy - bodyH * 0.2 + bob, bodyW * 0.55, bodyH);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - bodyW / 2, cy - bodyH * 0.2 + bob, bodyW, bodyH);
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, cy - bodyH * 0.42 + bob, cs * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.stroke();

    if (isArcher) {
      // Mũ da (không phải mũ sắt) + cây cung cong. Cung vẽ ở phía đang nhìn, nên
      // một hàng cung thủ đang bắn thì cả hàng "chỉ" về cùng một hướng — đội hình
      // hiện ra thành hình mà không cần vẽ thêm gì.
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - cs * 0.26, cy - bodyH * 0.64 + bob, cs * 0.52, cs * 0.14);
      const dir = u.facingX >= 0 ? 1 : -1;
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1.2, cs * 0.09);
      ctx.beginPath();
      ctx.arc(cx + dir * bodyW * 0.62, cy + bob, cs * 0.42, -Math.PI * 0.45, Math.PI * 0.45, dir < 0);
      ctx.stroke();
    } else if (isSoldier) {
      ctx.fillStyle = '#c9c2b0';
      ctx.fillRect(cx - cs * 0.3, cy - bodyH * 0.66 + bob, cs * 0.6, cs * 0.17); // mũ
      drawBattleAxe(u, cx, cy, cs, bob, bodyW);
    } else if (u.task === 'gather') {
      // Xét TRƯỚC carry: đang thu hoạch thì carry.amount cũng >0, nhưng ta muốn
      // thấy DỤNG CỤ đang vung, không phải kiện hàng — hàng chỉ hiện lúc gánh về.
      drawGatherTool(u, cx, cy, cs, bob);
    } else if (u.carry.amount > 0) {
      drawCarriedLoad(u, cx, cy, bodyH, cs, bob);
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
function drawCatapult(u, tribe, cx, cy, px, py, cs) {
  // 1,35 -> 2,15. Cỗ máy ĐẮT NHẤT trong cả cây quân sự (150 gỗ + 80 vàng + 70 đá,
  // 150 tick huấn luyện, ăn 2,5 suất nuôi) mà vẽ nhỉnh hơn một người lính có 35%
  // thì nhìn ra màn hình nó là một món đồ chơi, không phải một khí tài công thành.
  // So sánh đúng phải là với KỴ BINH (1,95·cs): máy bắn đá phải NẶNG hơn con ngựa,
  // vì đó là thứ duy nhất trên bản đồ cần cả một tổ vận hành.
  const S = cs * 2.15;
  drawShadow(cx, cy + cs * 0.55, S * 0.52, S * 0.19);

  // Cần bắn: gập lại ngay sau khi bắn (cooldown gần đầy) rồi từ từ ngả về tư thế
  // sẵn sàng. Đọc từ chính u.cooldown nên hoạt ảnh KHÔNG BAO GIỜ lệch pha với cơ
  // chế — không cần thêm một biến hoạt ảnh riêng để rồi phải giữ cho hai bên khớp.
  const load = u.atkCooldown ? clamp(1 - u.cooldown / u.atkCooldown, 0, 1) : 1;
  const dir = u.facingX >= 0 ? 1 : -1;
  const baseY = cy + S * 0.16;                  // trục bánh xe
  const dark = '#3a2418', wood = '#8d6e63', woodHi = '#a5826f';

  // ---- BÁNH XE (vẽ trước, nằm sau khung) ----
  // Có NAN HOA. Ở cỡ cũ hai bánh chỉ là hai chấm nâu; ở cỡ này nan hoa đọc được,
  // và nan hoa là thứ nói "đây là cỗ xe" nhanh hơn bất cứ chi tiết nào khác.
  for (const off of [-0.34, 0.30]) {
    const wx = cx + S * off, wy = baseY + S * 0.22, wr = S * 0.20;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
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

  if (u.hp < u.maxHp) {
    const w = cs * 1.7, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
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

// Quái vật: tông màu lạnh/tím, hình thù gai góc, KHÔNG mang màu bộ lạc nào — mắt
// phải phân biệt được "phe thứ năm" trong một phần giây, nếu không người xem sẽ
// tưởng một bộ lạc thứ năm vừa xuất hiện.
function drawMonster(u, px, py, cs) {
  const spec = CONFIG.MONSTER.TYPES[u.mType];
  const S = cs * spec.size;
  let cx = px + cs / 2, cy = py + cs / 2;
  if (u.lungeUntil && tick < u.lungeUntil && u.combatTarget) {
    const dx = u.combatTarget.x - u.x, dy = u.combatTarget.y - u.y;
    const len = Math.hypot(dx, dy) || 1;
    cx += (dx / len) * cs * 0.3; cy += (dy / len) * cs * 0.3;
  }
  drawShadow(cx, cy + cs * 0.5, S * 0.45, S * 0.18);

  // Vòng đỏ mờ dưới chân: nền cỏ xanh và thân quái xám/nâu quá gần nhau về độ
  // sáng, nên nếu không có mảng màu tương phản thì mắt lướt qua không nhận ra.
  // Quái của SÓNG tô đậm hơn hẳn — người xem cần phân biệt ngay "con này canh
  // hang" với "con này đang tràn vào nhà mình".
  ctx.fillStyle = u.assault ? 'rgba(244,67,54,0.42)' : 'rgba(198,40,40,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.5, S * (u.assault ? 0.62 : 0.55), S * (u.assault ? 0.27 : 0.24), 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = Math.sin((aTick + u.id * 5) * 0.4) * cs * 0.05;
  const lw = Math.max(1, cs * 0.12);
  ctx.fillStyle = spec.color;
  ctx.strokeStyle = spec.dark;
  ctx.lineWidth = lw;
  const shape = spec.shape || 'troll';

  // Mỗi loài một SILHOUETTE. Trước 3.7 cả ba loài dùng chung một hình thoi khác
  // cỡ, và đó là nguyên nhân trực tiếp nhất của chữ "đơn điệu": ở zoom thường,
  // một hình thoi xám cỡ 1,15 và một hình thoi nâu cỡ 1,5 là CÙNG MỘT VẬT với
  // mắt người — màu và cỡ chỉ được đọc sau khi hình dạng đã phân loại xong.
  if (shape === 'wolf') {
    // Thân dài nằm ngang + mõm nhọn + hai tai: đọc ra "con thú bốn chân" ngay.
    const f = u.facingX >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, S * 0.46, S * 0.3, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + f * S * 0.34, cy - S * 0.16 + bob);
    ctx.lineTo(cx + f * S * 0.72, cy + bob);
    ctx.lineTo(cx + f * S * 0.34, cy + S * 0.16 + bob);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                   // đuôi
    ctx.moveTo(cx - f * S * 0.42, cy - S * 0.06 + bob);
    ctx.lineTo(cx - f * S * 0.72, cy - S * 0.36 + bob);
    ctx.stroke();
  } else if (shape === 'spider') {
    // Tám chân toả đều — hình duy nhất trên bản đồ có nhiều nan như thế này.
    // Chân vẽ bằng màu THÂN chứ không phải màu viền: nhìn thật ở zoom 40 thì viền
    // #1b5e20 nằm đè lên vòng đỏ dưới chân quái, hai màu tối chồng nhau và tám cái
    // chân biến mất sạch — con nhện lại thành một chấm tròn, đúng thứ đang phải sửa.
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = Math.max(1.2, cs * 0.11);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.sin(aTick * 0.25 + u.id) * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, cy + bob);
      ctx.lineTo(cx + Math.cos(a) * S * 0.62, cy + bob + Math.sin(a) * S * 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, S * 0.3, S * 0.26, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (shape === 'bear') {
    // Khối tròn to có hai tai — nặng nề, không có góc nhọn nào.
    ctx.beginPath();
    ctx.arc(cx - S * 0.26, cy - S * 0.36 + bob, S * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + S * 0.26, cy - S * 0.36 + bob, S * 0.15, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, S * 0.44, S * 0.46, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (shape === 'wisp') {
    // Giọt lửa lơ lửng, bồng bềnh mạnh hơn hẳn và có quầng sáng: người xem phải
    // đọc ra "thứ này không chạm đất" thì mới đoán được nó đánh từ xa.
    const fl = Math.sin((aTick + u.id * 9) * 0.16) * cs * 0.22;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(cx, cy - S * 0.1 + fl, S * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - S * 0.62 + fl);
    ctx.quadraticCurveTo(cx + S * 0.4, cy - S * 0.05 + fl, cx, cy + S * 0.5 + fl);
    ctx.quadraticCurveTo(cx - S * 0.4, cy - S * 0.05 + fl, cx, cy - S * 0.62 + fl);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (shape === 'wyvern') {
    // Vẽ CAO hơn mặt đất hẳn một quãng và bóng đổ nằm lại dưới chân: chiều cao là
    // thứ duy nhất trên bản đồ này nói được "nó đang bay", mà bay lại đúng là
    // năng lực khiến nó nguy hiểm (Phase 3.5 đã dựng sẵn hệ bóng đổ cho việc này).
    const lift = cs * 0.85 + Math.sin((aTick + u.id * 7) * 0.22) * cs * 0.18;
    const wy = cy - lift;
    const flap = Math.sin((aTick + u.id * 11) * 0.45);
    ctx.beginPath();                                   // hai cánh
    ctx.moveTo(cx, wy);
    ctx.quadraticCurveTo(cx - S * 0.75, wy - S * (0.36 + flap * 0.22), cx - S * 1.0, wy + S * 0.16);
    ctx.quadraticCurveTo(cx - S * 0.55, wy + S * 0.04, cx, wy + S * 0.2);
    ctx.moveTo(cx, wy);
    ctx.quadraticCurveTo(cx + S * 0.75, wy - S * (0.36 + flap * 0.22), cx + S * 1.0, wy + S * 0.16);
    ctx.quadraticCurveTo(cx + S * 0.55, wy + S * 0.04, cx, wy + S * 0.2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                   // thân + cổ
    ctx.ellipse(cx, wy + S * 0.06, S * 0.2, S * 0.38, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, wy - S * 0.3); ctx.lineTo(cx + S * 0.28, wy - S * 0.52);
    ctx.stroke();
    cy = wy;                                           // mắt vẽ theo thân, không theo ô đất
  } else if (shape === 'lord') {
    // Trùm: hình thoi cũ nhưng to gấp rưỡi, có VƯƠNG MIỆN gai và một vòng hào
    // quang xoay. Vòng đó không phải trang trí — nó chính là bán kính buff, nên
    // người xem đoán được vì sao đám quái quanh nó đánh đau hơn bình thường.
    const R = u.aura ? u.aura.r * cs : 0;
    if (R > 0) {
      // Nhìn thật ở zoom 40: ở alpha 0,16 cái vòng này KHÔNG ĐỌC ĐƯỢC trên nền cỏ
      // — nó có ở đó nhưng mắt không bắt được, tức là bằng không. Thêm một lớp nền
      // đỏ mờ đổ dần rồi mới tới vòng nét đứt: mảng màu đọc được ở mọi mức zoom,
      // còn nét đứt xoay là thứ nói "nó đang hoạt động".
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
      ctx.fillStyle = spec.color; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - S * 0.6 + bob);
    ctx.lineTo(cx + S * 0.5, cy + bob);
    ctx.lineTo(cx, cy + S * 0.62 + bob);
    ctx.lineTo(cx - S * 0.5, cy + bob);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d8a544';
    ctx.lineWidth = Math.max(1.2, cs * 0.13);
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(cx + i * S * 0.17, cy - S * 0.5 + bob);
      ctx.lineTo(cx + i * S * 0.22, cy - S * 0.78 + bob);
    }
    ctx.stroke();
  } else {
    // troll — giữ nguyên hình thoi có sừng của bản cũ: nó đã là con quái quen mặt
    // nhất, đổi hình nó đi thì người xem cũ mất luôn mốc so sánh.
    ctx.beginPath();
    ctx.moveTo(cx, cy - S * 0.58 + bob);
    ctx.lineTo(cx + S * 0.44, cy + bob);
    ctx.lineTo(cx, cy + S * 0.58 + bob);
    ctx.lineTo(cx - S * 0.44, cy + bob);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9bcd6';
    ctx.lineWidth = Math.max(1, cs * 0.1);
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.3, cy - S * 0.5 + bob); ctx.lineTo(cx - S * 0.42, cy - S * 0.8 + bob);
    ctx.moveTo(cx + S * 0.3, cy - S * 0.5 + bob); ctx.lineTo(cx + S * 0.42, cy - S * 0.8 + bob);
    ctx.stroke();
  }

  if (cs >= 8) {
    // Hai chấm mắt đỏ: thứ duy nhất trên bản đồ có màu này, nên nó đọc được ngay
    // cả khi quái đứng lẫn giữa một đám đông. Bóng ma mắt xanh lam cho khớp thân.
    ctx.fillStyle = shape === 'wisp' ? '#dceef0' : '#e04b32';
    const ex = S * 0.15, ey = shape === 'spider' ? -S * 0.05 : -S * 0.12;
    const er = Math.max(1, cs * (shape === 'lord' ? 0.13 : 0.09));
    ctx.beginPath(); ctx.arc(cx - ex, cy + ey + bob, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex, cy + ey + bob, er, 0, Math.PI * 2); ctx.fill();
  }

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
  const B = UNIT_BOX[d.o.type] || UNIT_BOX._;
  const cx = d.px + cs / 2, cy = d.py + cs / 2;
  return { x0: cx - cs * B.w, x1: cx + cs * B.w, y0: cy - cs * B.up, y1: cy + cs * B.down };
}

// Nửa rộng / cao lên trên / xuống dưới, tính bằng SỐ Ô. Đọc từ chính hình vẽ:
//  · anh hùng cưỡi ngựa — người nâng lên 0,46·S rồi còn mũ chóp và tên phía trên
//  · kỵ binh — S = 1,95 ô, thân ngựa rộng gần hai ô
//  · máy bắn đá — S = 2,15 ô, cần bắn dựng đứng cao hơn cả khung
const UNIT_BOX = {
  _:           { w: 1.2, up: 1.2, down: 1.2 },
  hero:        { w: 1.4, up: 2.5, down: 1.1 },
  knight:      { w: 1.7, up: 1.5, down: 1.2 },
  horsearcher: { w: 1.7, up: 1.5, down: 1.2 },
  catapult:    { w: 1.5, up: 2.0, down: 1.3 }
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
    const r = cs * (u.type === 'hero' ? 0.6 : u.type === 'catapult' ? 0.62
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
    if (inView(px, py, cs * 2)) drawables.push({ y: uRY(u), kind: 'u', o: u, px, py });
  }
  // Sắp theo CHÂN, không theo TÂM. Với sprite phẳng thì hai cách cho kết quả gần
  // như nhau nên sai số này vô hình suốt từ đầu; sprite cao lên bao nhiêu thì nó lộ
  // ra bấy nhiêu. Ví dụ: nhà chính size 3 tâm y=100 có chân ở 101,5; căn nhà size 2
  // nhét vào góc Bắc tâm y=101 lại có chân ở 102 — sắp theo tâm thì căn nhà PHÍA SAU
  // được vẽ ĐÈ LÊN nhà chính. Đây đúng là họ lỗi "điều hướng bằng đại lượng này,
  // so sánh bằng đại lượng khác" đã cắn ở Phase 3.1, lần này là tâm-vs-chân.
  // Cố tình bắt theo d.kind chứ không phải `o.size !== undefined`: hang ổ cũng có
  // size, và duck-typing trên tên trường đã một lần làm vỡ CONFIG.BUILD lookup.
  const baseOf = (d) => (d.kind === 'b' || d.kind === 'l') ? d.y + d.o.size / 2 : d.y;
  drawables.sort((a, b) => baseOf(a) - baseOf(b));
  for (const d of drawables) {
    if (d.kind === 'b') drawBuilding(d.o, d.px, d.py, cs);
    else if (d.kind === 'l') drawLair(d.o, d.px, d.py, cs);
    else if (d.kind === 'i') drawGroundItem(d.o, d.px, d.py, cs);
    else drawUnit(d.o, d.px, d.py, cs);
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
    const w = Math.max(1, s * (u.type === 'catapult' ? 2.4 : isCavalry(u.type) ? 2.9
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

