'use strict';
// ============================================================
// 13-render-terrain.js
// ------------------------------------------------------------
// Camera/toạ độ (withCanvas, clampCamera, setZoom, focusOn, worldToPx) + lớp
// địa hình (elevation, basin, pigment noise) + sprite tài nguyên (cây, quả,
// vàng, đá) + hiệu ứng dùng chung (drawShadow, drawHitFlash, getInkGrain).
// Tách từ 13-render-world.js (Phase 3.43) theo đúng 1 trong 4 mốc mà chính
// file gốc đã ghi sẵn ở đầu: "camera+địa hình / sprite tĩnh / sprite chiến
// đấu / HUD". Cùng global scope với phần còn lại — xem CLAUDE.md.
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
// Đây là CỬA RA CHUNG của drawUnit — cả mười hai nhánh theo loại quân, kể cả nhánh
// quái vật và nhánh bộ binh mặc định, đều kết thúc bằng đúng lời gọi này. Nên dấu
// kiệt sức được móc vào đây thay vì vào drawUnit: gọi ở drawUnit thì nó nằm DƯỚI
// hình vẽ (mọi nhánh đều vẽ xong rồi mới return), mà ba giọt mồ hôi bị cái mũ sắt
// che thì không phải một dấu hiệu. Tên hàm không còn tả đúng nội dung — đổi lại là
// một chỗ duy nhất phải nhớ, thay vì mười hai chỗ có thể quên. Cùng đánh đổi đã
// chọn ở `tickSpeed`.
function drawHitFlash(u, px, py, cs) {
  drawExhaustion(u, px + cs / 2, py + cs / 2, cs);
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

