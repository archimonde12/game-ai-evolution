'use strict';
// ============================================================
// 15-input-boot.js
// ------------------------------------------------------------
// Chuột/bàn phím, camera đạo diễn, nội suy vị trí giữa các tick, vòng rAF
// frame(), trang bìa chọn thế cuộc và đoạn boot chạy khi tải trang.
// Tách cơ học từ civilization.html một-file, dòng 11988–12708.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Tương tác
// ============================================================
let isDraggingMinimap = false;
function jumpCameraToMinimap(e) {
  const rect = minimapCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (minimapCanvas.width / rect.width);
  const my = (e.clientY - rect.top) * (minimapCanvas.height / rect.height);
  camX = mx / CONFIG.MINIMAP_SCALE - CONFIG.VIEWPORT_WIDTH / 2;
  camY = my / CONFIG.MINIMAP_SCALE - CONFIG.VIEWPORT_HEIGHT / 2;
  clampCamera();
}
minimapCanvas.addEventListener('mousedown', (e) => { isDraggingMinimap = true; jumpCameraToMinimap(e); e.stopPropagation(); });

let isDraggingCanvas = false, dragStartPx = null, dragStartCam = null, dragMoved = false;
simCanvas.addEventListener('mousedown', (e) => {
  const rect = simCanvas.getBoundingClientRect();
  dragStartPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  dragStartCam = { x: camX, y: camY };
  dragMoved = false;
  isDraggingCanvas = true;
});
window.addEventListener('mousemove', (e) => {
  if (isDraggingMinimap) { jumpCameraToMinimap(e); return; }
  if (!isDraggingCanvas) return;
  const rect = simCanvas.getBoundingClientRect();
  const sx = simCanvas.width / rect.width, sy = simCanvas.height / rect.height;
  const dxPx = ((e.clientX - rect.left) - dragStartPx.x) * sx;
  const dyPx = ((e.clientY - rect.top) - dragStartPx.y) * sy;
  if (Math.abs(dxPx) > 6 || Math.abs(dyPx) > 6) dragMoved = true;
  if (dragMoved) {
    camX = dragStartCam.x - dxPx / CONFIG.CELL_SIZE;
    camY = dragStartCam.y - dyPx / CONFIG.CELL_SIZE;
    clampCamera();
  }
});
window.addEventListener('mouseup', (e) => {
  isDraggingMinimap = false;
  if (!isDraggingCanvas) return;
  isDraggingCanvas = false;
  if (!dragMoved) {
    const rect = simCanvas.getBoundingClientRect();
    const sx = simCanvas.width / rect.width, sy = simCanvas.height / rect.height;
    const gx = camX + ((e.clientX - rect.left) * sx) / CONFIG.CELL_SIZE;
    const gy = camY + ((e.clientY - rect.top) * sy) / CONFIG.CELL_SIZE;
    if (armedPower) {
      if (castPower(armedPower, gx, gy)) {
        armedPower = null;
        simCanvas.classList.remove('god-armed');
        setGodHint('Đã thi triển. Chọn quyền năng khác nếu muốn.');
      }
    } else {
      selectAt(gx, gy);
      renderOverlaySelected();   // phản hồi tức thì, không chờ nhịp render 6 frame
    }
  }
  dragStartPx = null; dragStartCam = null;
});

// Chọn theo HÌNH VẼ, không theo ô.
//
// Từ khi sprite cao hơn footprint, ánh xạ pixel -> ô lệch đi đúng bằng chiều cao
// hình vẽ, và nó sinh ra hai vùng lỗi đối xứng: click vào mái tháp — phần nổi bật
// nhất, thứ người ta nhắm vào — thì trúng ô đất trống phía Bắc; còn click vào ô
// trống đang bị mái phủ thì lại trúng tháp. Không phải "bấm hơi lệch", mà là cả
// phép ánh xạ bị dịch.
//
// Duyệt NGƯỢC thứ tự vẽ nên cái nằm trên cùng được xét trước — đúng bằng thứ tự
// mắt nhìn thấy. Đây là lý do lastDrawables phải là chính mảng đã sắp xếp ở
// renderWorld chứ không phải một danh sách dựng lại: chọn và vẽ dùng chung một
// nguồn thì không thể lệch nhau.
function selectAt(gx, gy) {
  const cs = CONFIG.CELL_SIZE;
  const [mx, my] = worldToPx(gx, gy);
  for (let i = lastDrawables.length - 1; i >= 0; i--) {
    const d = lastDrawables[i];
    if (d.kind === 'i') continue;                    // vật phẩm dưới đất không chọn được
    const box = spriteBox(d, cs);
    if (mx < box.x0 || mx > box.x1 || my < box.y0 || my > box.y1) continue;
    selected = d.kind === 'b' ? { kind: 'building', id: d.o.id }
             : d.kind === 'l' ? { kind: 'lair', id: d.o.id }
             : { kind: 'unit', id: d.o.id };
    return;
  }
  selected = null;
}

const pressedKeys = new Set();
const PAN_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
// Danh sách tốc độ dùng CHUNG cho <select> và cho phím [ ]. Một nguồn sự thật:
// nếu để phím tắt giữ bảng riêng thì bấm phím sẽ đưa tốc độ tới một mức mà ô
// chọn không có, và ô chọn nhảy về rỗng — trạng thái thật và trạng thái hiển thị
// tách đôi ngay ở cái nhỏ nhất.
const SPEED_STEPS = [6, 12, 24, 60, 150, 600, 1600];
function setSpeed(tps) {
  ticksPerSecond = tps;
  el('speedSelect').value = String(tps);
}
function nudgeSpeed(dir) {
  let i = SPEED_STEPS.indexOf(ticksPerSecond);
  if (i < 0) i = SPEED_STEPS.findIndex(v => v >= ticksPerSecond);
  setSpeed(SPEED_STEPS[clamp(i + dir, 0, SPEED_STEPS.length - 1)]);
}
function setCameraMode(m) {
  cameraMode = m;
  el('cameraSelect').value = m;
  if (m !== 'director') { directorTarget = null; }
  if (m === 'free') el('directorLabel').style.display = 'none';
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    armedPower = null;
    simCanvas.classList.remove('god-armed');
    setGodHint('Đã huỷ quyền năng đang chọn.');
  }
  if (PAN_KEYS.includes(k) && document.activeElement.tagName !== 'INPUT') {
    pressedKeys.add(k); e.preventDefault();
  }
  // Phím tắt chỉ ăn khi con trỏ KHÔNG nằm trong ô nhập liệu: bảng "Tham số (live)"
  // toàn ô số, mà Space và [ ] là ký tự hợp lệ trong đó.
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  // Trang bìa đang mở: chỉ M có tác dụng (đóng bìa, trở lại ván nếu đã có một ván).
  // Mọi phím điều khiển mô phỏng khác bị chặn để game không "chạy ngầm" sau tấm bìa.
  if (menuOpen) {
    if (k === 'm' && bootDone) resumeGame();
    return;
  }
  if (k === 'm') { showMenu(); return; }
  // 1-5 đổi tờ cột phải. Đặt TRƯỚC mọi phím điều khiển mô phỏng và return ngay:
  // đây là phím điều hướng giao diện, nó không được kéo theo tác dụng phụ nào.
  if (k >= '1' && k <= '5') { setTab(PANE_TABS[Number(k) - 1]); return; }
  if (k === ' ') {
    e.preventDefault();
    if (eraState === 'playing') {
      running = !running;
      setPauseUI(running);
    }
  } else if (k === '[') { nudgeSpeed(-1); }
  else if (k === ']') { nudgeSpeed(1); }
  else if (k === 'f') {
    // Bám quân đang chọn. Không chọn ai thì bật cũng vô nghĩa — nói thẳng ra thay
    // vì im lặng đổi chế độ rồi để người dùng tự đoán vì sao camera không nhúc nhích.
    if (cameraMode === 'follow') { setCameraMode('director'); }
    else if (getSelected()) { setCameraMode('follow'); }
    else setGodHint('Chọn một quân/công trình trên bản đồ trước rồi bấm F để bám theo.');
  } else if (k === 'c') {
    setCameraMode(cameraMode === 'director' ? 'free' : 'director');
  } else if (k === 'z' || k === 'x') {
    const zs = [4, 6, 9, 14];
    let i = zs.indexOf(CONFIG.CELL_SIZE);
    if (i < 0) i = 2;
    const nz = zs[clamp(i + (k === 'x' ? 1 : -1), 0, zs.length - 1)];
    setZoom(nz);
    el('zoomSelect').value = String(nz);
  }
});
window.addEventListener('keyup', (e) => pressedKeys.delete(e.key.toLowerCase()));

function updateCameraFromKeys() {
  let dx = 0, dy = 0;
  if (pressedKeys.has('arrowleft') || pressedKeys.has('a')) dx -= 1;
  if (pressedKeys.has('arrowright') || pressedKeys.has('d')) dx += 1;
  if (pressedKeys.has('arrowup') || pressedKeys.has('w')) dy -= 1;
  if (pressedKeys.has('arrowdown') || pressedKeys.has('s')) dy += 1;
  if (dx || dy) { camX += dx * CONFIG.CAMERA_PAN_SPEED; camY += dy * CONFIG.CAMERA_PAN_SPEED; clampCamera(); }
}

// ============================================================
// Camera đạo diễn — linh hồn của một game "chỉ ngồi xem"
// ============================================================
// Một bản đồ 240x160 với 4 nền văn minh thì gần như lúc nào cũng có chuyện xảy
// ra ở đâu đó NGOÀI khung nhìn. Nếu bắt người xem tự đi tìm, họ sẽ bỏ lỡ đúng
// những khoảnh khắc đáng xem nhất. Chế độ này chọn cảnh quay giúp: bám điểm nóng
// nặng ký nhất, giữ ít nhất DIRECTOR_MIN_HOLD frame mỗi cảnh (nếu không camera
// sẽ giật liên tục giữa hai trận đánh ngang nhau), và khi thiên hạ thái bình thì
// lững thững đi thăm thủ đô các bộ lạc.
// Toàn bộ các hằng số này tính bằng FRAME (60 frame ≈ 1 giây), không phải tick —
// người xem cảm nhận độ dài cú máy bằng thời gian thật, mà số tick mỗi frame thì
// đổi theo nút tốc độ 1x..60x.
const DIRECTOR_MIN_SHOT = 130;   // ~2,2s — không cắt trước ngần này, dù có gì xảy ra
const DIRECTOR_MIN_HOLD = 420;   // ~7s  — quá ngần này thì buộc phải xét lại cảnh
const DIRECTOR_TOUR_HOLD = 220;  // ~3,7s — cảnh thái bình đi thăm kinh đô thì ngắn hơn
const DIRECTOR_STALE = 400;      // cảnh không có diễn biến mới trong ngần này TICK = đã tàn
const DIRECTOR_CUT_DIST = 55;    // xa hơn ngần này thì CẮT thẳng, không lia máy
const DIRECTOR_MIN_SCENE = 4;    // dưới mức này chưa đáng gọi là một cảnh

let cameraMode = 'free';        // 'free' | 'director'
let directorTarget = null;
let directorHold = 0;
let directorShot = 0;           // số frame đã quay cảnh hiện tại
let directorLabel = '';
let directorTourIndex = 0;

// TRẢ VỀ CHÍNH đối tượng hotspot, không phải bản sao {x,y,label,weight}.
//
// Bản sao là nguyên nhân của cả ba lỗi quay hình: (1) `weight` đóng băng ở giá
// trị lúc chọn, nên khi trận đánh tàn thì camera vẫn tưởng cảnh đang nóng và ngồi
// nhìn bãi đất trống cho hết giờ giữ cảnh; (2) cũng vì `weight` đóng băng, điều
// kiện chèn cảnh so với một con số cũ rất lớn nên gần như không bao giờ đúng —
// đo thật: cảnh đang quay lưu weight 293 trong khi trận lớn nhất thực tế chỉ 105,
// camera bỏ qua hoàn toàn; (3) toạ độ đứng im trong khi trận đánh dịch chuyển.
function pickDirectorTarget() {
  let best = null, bestW = 0;
  for (const h of hotspots) {
    if (h.weight > bestW) { bestW = h.weight; best = h; }
  }
  if (best && bestW >= DIRECTOR_MIN_SCENE) return best;

  // Thái bình: đi vòng thăm thủ đô các bộ lạc còn sống.
  const alive = tribes.filter(t => t.alive);
  if (!alive.length) return null;
  directorTourIndex = (directorTourIndex + 1) % alive.length;
  const t = alive[directorTourIndex];
  const town = buildings.find(b => b.tribeId === t.id && b.type === 'town' && b.hp > 0);
  return { x: town ? town.x : t.home.x, y: town ? town.y : t.home.y,
           label: `Kinh đô ${t.name}`, weight: 0, tour: true };
}

function updateDirectorCamera() {
  if (cameraMode !== 'director' || isDraggingCanvas || isDraggingMinimap) return;
  directorHold--;

  let strongest = 0;
  for (const h of hotspots) if (h.weight > strongest) strongest = h.weight;

  const cur = directorTarget;
  const curW = cur && !cur.tour ? cur.weight : 0;
  // "Cảnh đã tàn" xét bằng ĐỘ CŨ, không bằng weight.
  //
  // Bản trước dùng `weight <= 3` và sai hẳn: weight rụng 25% mỗi 30 tick, mà ở
  // tốc độ 10x thì đó là mỗi 3 frame — chỉ cần một khoảng lặng ngắn giữa hai đợt
  // xung phong là weight tụt từ 100 xuống dưới 3, camera tưởng trận đánh đã xong
  // và cắt đi. Đo thật: mọi cú máy đều bị cắt đúng tại mốc tối thiểu, trung bình
  // 0,95 giây một cảnh. `h.tick` (lần cuối có diễn biến) mới là thứ nói đúng việc
  // trận đánh còn sống hay không, vì nó được làm mới mỗi lần có sát thương gần đó.
  const curDead = cur && !cur.tour &&
    (hotspots.indexOf(cur) < 0 || tick - cur.tick > DIRECTOR_STALE);
  // So với weight HIỆN TẠI của cảnh đang quay (giờ là tham chiếu sống), nên một
  // trận lớn nổ ra ở nơi khác cắt được ngang thật sự.
  const preempt = cur && strongest > Math.max(curW, 1) * 1.8 && strongest >= 6;

  directorShot++;
  // ĐỘ DÀI TỐI THIỂU MỘT CÚ MÁY. Chỉ hết giờ giữ cảnh mới được cắt vô điều kiện;
  // còn "cảnh tàn" và "có trận lớn hơn" phải đợi đủ DIRECTOR_MIN_SHOT frame.
  // Không có luật này thì camera bập bênh giữa cảnh thái bình và mọi cuộc chạm
  // trán lẻ: một điểm nóng vừa chạm ngưỡng 6 là chèn ngang, vài chục frame sau
  // nguội xuống dưới 3 là lại nhảy về — đo thật 11 cú cắt trong 400 frame, tức
  // là cứ 0,6 giây đổi cảnh một lần, không ai kịp nhìn gì.
  const canCutEarly = directorShot >= DIRECTOR_MIN_SHOT;
  if (!cur || directorHold <= 0 || ((preempt || curDead) && canCutEarly)) {
    const next = pickDirectorTarget();
    if (next && next !== cur) {
      const tx = next.x - CONFIG.VIEWPORT_WIDTH / 2;
      const ty = next.y - CONFIG.VIEWPORT_HEIGHT / 2;
      // Đạo diễn thật thì CẮT CẢNH chứ không lia máy qua nửa bản đồ. Trên bản đồ
      // 340x220, lia với hệ số 0.05 mất ~60 frame để tới nơi — tức là tới lúc
      // khung hình ổn định thì trận đánh đã tan, và người xem chỉ thấy cảnh
      // đồng cỏ trôi qua. Đo thật: 64/400 frame camera đang ở giữa đường.
      if (Math.hypot(tx - camX, ty - camY) > DIRECTOR_CUT_DIST) {
        camX = tx; camY = ty; clampCamera();
      }
      directorTarget = next;
      directorLabel = next.label;
      directorHold = next.tour ? DIRECTOR_TOUR_HOLD : DIRECTOR_MIN_HOLD;
      directorShot = 0;
    } else if (next === cur) {
      // Vẫn là cảnh đáng xem nhất: gia hạn thay vì cắt đi rồi quay lại ngay.
      // Một cuộc vây thành kéo dài xứng đáng được quay liền mạch.
      directorHold = Math.max(directorHold, 180);
    }
  }
  if (!directorTarget) return;

  const tx = directorTarget.x - CONFIG.VIEWPORT_WIDTH / 2;
  const ty = directorTarget.y - CONFIG.VIEWPORT_HEIGHT / 2;
  camX += (tx - camX) * 0.09;
  camY += (ty - camY) * 0.09;
  clampCamera();
  const el2 = el('directorLabel');
  if (el2) {
    // PHẢI là 'block', không được là ''. Bảng kiểu có sẵn luật `#directorLabel {
    // display: none }`, nên gán chuỗi rỗng chỉ xoá inline style và luật CSS kia
    // thắng lại — nhãn "🎬 tên cảnh" vì thế chưa từng hiện ra lần nào, dù chữ đã
    // được gán đúng. Người xem không biết camera đang quay cái gì.
    el2.style.display = 'block';
    el2.textContent = '🎬 ' + directorLabel;
  }
}

// ============================================================
// Nhịp hình — nội suy, lão hoá hiệu ứng, camera bám, đo fps
// ============================================================
// Mô phỏng vẫn chạy nguyên vẹn trên LƯỚI Ô NGUYÊN: mọi luật chơi, mọi pathfinding,
// mọi phép đo khoảng cách không đổi một dòng. Thứ duy nhất được nội suy là TOẠ ĐỘ
// ĐỂ VẼ. Tách bạch như vậy là cố ý — nếu để phần nhìn thò tay vào toạ độ thật thì
// "ô" thôi là đơn vị nguyên tử, và mọi thứ đọc `u.x` (tìm địch, BFS, chặn đường)
// bắt đầu phải hỏi "x nào".
const RENDER_TAU = 0.055;    // hằng số thời gian bám (giây): nhỏ = bám sát, lớn = mượt/lết
const RENDER_SNAP = 5;       // lệch xa hơn ngần này ô thì nhảy thẳng, không trượt

function updateRenderPositions(dt) {
  // Ở tốc độ tua, đơn vị đi nhanh hơn cả tốc độ bám của bộ lọc, nên cả đạo quân
  // sẽ lết phía sau vị trí thật cả chục ô — mũi tên bắn ra từ chỗ không có ai.
  // Tua thì siết hằng số thời gian lại; dưới 60 tick/s mới thả cho mượt.
  // Độ trễ ở trạng thái dừng của bộ lọc mũ đúng bằng `tốc độ × tau` ô. Ở 600
  // tick/s mà giữ tau = 0,012 thì trễ 7,2 ô — vượt luôn ngưỡng RENDER_SNAP, nên
  // mọi đơn vị sẽ NHẢY liên tục thay vì trượt, tức là mất hết cái mà nội suy sinh
  // ra. Tua thì phải siết tau xuống dưới `RENDER_SNAP / tốc độ`.
  const tau = ticksPerSecond > 90 ? 0.005 : ticksPerSecond > 40 ? 0.03 : RENDER_TAU;
  const k = 1 - Math.exp(-dt / tau);
  const fade = dt * 60;
  for (const u of units) {
    if (u.rx === undefined) { u.rx = u.x; u.ry = u.y; }
    else {
      const dx = u.x - u.rx, dy = u.y - u.ry;
      // Sinh ra ở nơi khác, bị đẩy về đất liền, hồi sinh — mọi cú dịch chuyển tức
      // thời phải NHẢY. Trượt qua nửa bản đồ thì mắt đọc thành "nó đang bay".
      if (dx * dx + dy * dy > RENDER_SNAP * RENDER_SNAP) { u.rx = u.x; u.ry = u.y; }
      else { u.rx += dx * k; u.ry += dy * k; }
    }
    if (u.flash > 0) u.flash -= fade;
  }
}

function ageEffects(dt) {
  // Đơn vị "frame ảo" 60/giây: giữ nguyên mọi hằng số maxLife đã tinh chỉnh từ
  // trước, vì hồi đó 1 tick đúng bằng 1 frame ở mức 1x.
  //
  // Trên 60 tick/s thì tăng tốc lão hoá theo đúng bội số đó. Lý do đo được: ở
  // 1600 tick/s, hiệu ứng SINH RA nhanh gấp 26 lần trong khi vẫn tàn theo thời
  // gian thật, nên mảng fx dính trần 400 và addFx lặng lẽ vứt bỏ mọi hiệu ứng
  // mới — màn hình đầy tia lửa của quá khứ và không còn chỗ cho cái đang xảy ra.
  // Dưới 60 thì giữ nguyên nhịp thật, vì đó mới là dải tốc độ để NGỒI XEM.
  const f60 = dt * 60 * Math.max(1, ticksPerSecond / 60);
  if (fx.length) {
    for (const f of fx) f.life -= f60;
    fx = fx.filter(f => f.life > 0);
  }
  // Thông báo nổi thì KHÔNG tăng tốc theo. Nó là chữ viết cho người đọc, không
  // phải hiệu ứng của thế giới: tua nhanh gấp 26 lần thì tia lửa cũng nên trôi
  // nhanh gấp 26, nhưng dòng "KINH ĐÔ bị san phẳng" mà chỉ hiện 0,1 giây thì
  // đúng lúc tua nhanh — lúc dễ bỏ lỡ diễn biến nhất — lại là lúc không đọc nổi.
  if (mapToasts.length) {
    const real = dt * 60;
    for (const t of mapToasts) t.life -= real;
    mapToasts = mapToasts.filter(t => t.life > 0);
  }
  // Công trình cũng ăn `flash` từ dealDamage (nó không phân biệt quân với nhà).
  // Không tàn nó ở đây thì trường này kẹt ở 9 vĩnh viễn — hôm nay vô hại vì chưa
  // ai đọc, nhưng một trường "luôn luôn bật" là cái bẫy y hệt `auraUntil` từng
  // gài: người viết sau đọc nó, thấy nó đúng ở lần thử đầu, và không bao giờ
  // biết rằng nó đúng vì nó KHÔNG BAO GIỜ TẮT.
  for (const b of buildings) if (b.flash > 0) b.flash -= f60;
}

// Camera bám: chọn một quân rồi để khung hình đi theo nó. Đây là câu trả lời trực
// tiếp nhất cho "khó theo dõi" — camera đạo diễn kể chuyện của cả thế giới, còn
// cái này kể chuyện của MỘT NGƯỜI: đi hái quả, về kho, bị gọi ra trận, chết.
function updateFollowCamera() {
  if (cameraMode !== 'follow' || isDraggingCanvas || isDraggingMinimap) return;
  const sel = getSelected();
  if (!sel) return;
  const fx0 = (sel.rx !== undefined ? sel.rx : sel.x) - CONFIG.VIEWPORT_WIDTH / 2;
  const fy0 = (sel.ry !== undefined ? sel.ry : sel.y) - CONFIG.VIEWPORT_HEIGHT / 2;
  // Vùng chết ở giữa khung: không có nó thì camera rung theo từng bước chân và
  // cả bản đồ trông như đang động đất.
  const k = 1 - Math.exp(-dtSec / 0.25);
  if (Math.abs(fx0 - camX) > 1.5) camX += (fx0 - camX) * k;
  if (Math.abs(fy0 - camY) > 1.5) camY += (fy0 - camY) * k;
  clampCamera();
  const lab = el('directorLabel');
  lab.style.display = 'block';
  lab.textContent = '🎯 ' + describeSelected(sel);
}

const UNIT_LABEL = {
  villager: 'Dân thường', soldier: 'Lính', archer: 'Cung thủ',
  catapult: 'Máy bắn đá', knight: 'Kỵ sĩ', horsearcher: 'Kỵ xạ', hero: 'Anh hùng'
};
function describeSelected(o) {
  if (o.isLair) return 'Hang ổ cấp ' + (o.tier || 1);
  if (o.type === 'monster') {
    const s = CONFIG.MONSTER.TYPES[o.mType];
    return (s ? s.label : 'Quái vật') + (o.assault ? ' (sóng)' : '');
  }
  if (o.size !== undefined && CONFIG.BUILD[o.type]) {
    return CONFIG.BUILD[o.type].label + ' — ' + (tribes[o.tribeId] ? tribes[o.tribeId].name : '?');
  }
  const t = tribes[o.tribeId];
  const name = o.type === 'hero' && o.name ? '⚔ ' + o.name : (UNIT_LABEL[o.type] || o.type);
  return name + ' — ' + (t ? t.name : '?');
}

// fps đo bằng trung bình trượt: hiện trên thanh HUD để biết ngay khi khung hình
// tụt, thay vì đoán mò "hình như nó hơi giật".
let fpsAvg = 60, fpsLastMs = 0;
function perfSampleFrame(now) {
  if (fpsLastMs) {
    const d = now - fpsLastMs;
    if (d > 0 && d < 500) fpsAvg += ((1000 / d) - fpsAvg) * 0.06;
  }
  fpsLastMs = now;
}

// ============================================================
// Vòng lặp chính
// ============================================================
function frame(nowMs) {
  // ---- đồng hồ thật -------------------------------------------------------
  const now = nowMs || performance.now();
  if (!lastFrameMs) lastFrameMs = now;
  // Kẹp ở 0,1 giây. Tab bị ẩn hay máy khựng một nhịp thì dt có thể là hàng giây;
  // không kẹp thì frame kế tiếp phải trả một món nợ 2.000 tick, làm treo thêm một
  // cú nữa rồi nợ tiếp — vòng xoáy chết kinh điển của mọi vòng lặp theo dt.
  dtSec = Math.min(0.1, Math.max(0, (now - lastFrameMs) / 1000));
  lastFrameMs = now;
  aTick += dtSec * 60;
  if (slowmoLeft > 0) slowmoLeft = Math.max(0, slowmoLeft - dtSec);

  updateCameraFromKeys();

  if (running && eraState === 'playing') {
    tickAcc += dtSec * ticksPerSecond * (slowmoLeft > 0 ? 0.3 : 1);
    let n = Math.floor(tickAcc);
    // Trần cứng mỗi frame. Ở 1600 tick/s trên máy yếu, một frame dài 0,1s đòi 160
    // tick; nếu mô phỏng không kịp thì để nó CHẬM LẠI chứ đừng để nó kẹt.
    if (n > 240) { tickAcc -= n - 240; n = 240; }
    let ran = 0;
    for (let i = 0; i < n; i++) {
      simulationTick(); ran++;
      if (eraState !== 'playing') break;
    }
    tickAcc = eraState === 'playing' ? Math.max(0, tickAcc - ran) : 0;
  } else {
    tickAcc = 0;
  }

  // Hiệu ứng và vị trí vẽ già đi theo THỜI GIAN THẬT, không theo tick: một tia
  // chém phải kéo dài đúng ngần ấy phần giây dù đang xem ở 6 tick/s hay 600.
  ageEffects(dtSec);
  updateRenderPositions(dtSec);
  updateFollowCamera();
  updateDirectorCamera();

  if (eraState === 'ended' && eraBannerFrames > 0) {
    eraBannerFrames--;
    if (eraBannerFrames === 0 && autoEra) beginNextEra();
  }

  // Canvas chính vẽ mỗi frame (mắt nhìn thấy chuyển động). Minimap + các panel
  // HTML thì KHÔNG: dựng lại innerHTML của bảng bộ lạc/nhật ký 60 lần/giây là
  // nguồn nghẽn lớn hơn hẳn bản thân mô phỏng, mà mắt cũng không đọc kịp.
  renderWorld();
  frameCount++;
  perfSampleFrame(now);
  if (frameCount % 4 === 0) renderMinimap();
  if (frameCount % 6 === 0) {
    // Bốn hàm này chạy ở MỌI tờ vì chúng nuôi thứ nằm ngoài hệ thống tờ: thanh
    // biên niên dán đỉnh (kỷ nguyên/tick/Đức Tin), con dấu lời khẩn cầu trên hàng
    // tờ, và thẻ "đang chọn" ghim. renderSelected còn có tác dụng phụ bắt buộc —
    // nó là chỗ duy nhất dọn `selected` khi thứ đang chọn chết mất.
    renderEraPanel();
    renderGodPanel();
    renderPrayerPanel();
    renderSelected();
    // Phần còn lại chỉ dựng cho tờ đang mở — xem renderActiveTab().
    renderActiveTab();
    if (showTribes) renderOverlayTribes();
    if (showLog) renderOverlayLog();
    renderOverlaySelected();
  }
  requestAnimationFrame(frame);
}
let frameCount = 0;

// ============================================================
// UI wiring
// ============================================================
const btnPause = el('btnPause');
// Nhãn nút phải khớp với chữ trong phần phím tắt ("Space tạm dừng") và data-running
// điều khiển dấu play/pause vẽ bằng CSS ::before — nên gom cả hai vào một chỗ.
function setPauseUI(isRunning) {
  btnPause.textContent = isRunning ? 'Tạm dừng' : 'Tiếp tục';
  btnPause.dataset.running = isRunning ? 'true' : 'false';
}
btnPause.addEventListener('click', () => {
  if (eraState !== 'playing') return;
  running = !running;
  setPauseUI(running);
});
el('btnStep').addEventListener('click', () => { if (eraState === 'playing') simulationTick(); });
el('btnNewEra').addEventListener('click', () => {
  if (eraState === 'playing') { for (const t of tribes) computeTribeStats(t); }
  beginNextEra();
});
el('speedSelect').addEventListener('change', (e) => { ticksPerSecond = Number(e.target.value); });
el('zoomSelect').addEventListener('change', (e) => { setZoom(Number(e.target.value)); });
el('chkSlowmo').addEventListener('change', (e) => { cinematicSlowmo = e.target.checked; if (!cinematicSlowmo) slowmoLeft = 0; });

// Click 1 dòng trong bảng bộ lạc -> camera nhảy tới kinh đô của họ. Bảng được
// dựng lại bằng innerHTML mỗi vài frame nên phải bắt sự kiện ở cấp <table>
// (event delegation), không gắn trực tiếp lên từng <tr> vốn bị thay liên tục.
el('tribeBoard').addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-tribe]');
  if (!row) return;
  const t = tribes[Number(row.dataset.tribe)];
  if (!t) return;
  const town = buildings.find(b => b.tribeId === t.id && b.type === 'town' && b.hp > 0);
  focusOn(town ? town.x : t.home.x, town ? town.y : t.home.y);
});
el('chkAutoEra').addEventListener('change', (e) => {
  autoEra = e.target.checked;
  if (autoEra && eraState === 'ended' && eraBannerFrames <= 0) beginNextEra();
});

// ---- Lớp phủ trên khung hình chính (item 1/3/8) ----
el('chipTribes').addEventListener('click', () => {
  showTribes = !showTribes;
  el('chipTribes').classList.toggle('on', showTribes);
  el('ovTribes').style.display = showTribes ? '' : 'none';
  if (showTribes) renderOverlayTribes();
});
el('chipLog').addEventListener('click', () => {
  showLog = !showLog;
  el('chipLog').classList.toggle('on', showLog);
  el('ovLog').style.display = showLog ? '' : 'none';
  if (showLog) renderOverlayLog();
});
// Gập/mở cuốn luật. Mặc định GẬP (class help-collapsed đặt sẵn trong HTML) để màn
// chơi mở ra là sạch; ai muốn tra luật thì mở. Trạng thái nằm ở class trên
// #world-pane, aria-expanded phản chiếu lại cho trình đọc màn hình.
el('helpToggle').addEventListener('click', () => {
  const collapsed = el('world-pane').classList.toggle('help-collapsed');
  el('helpToggle').setAttribute('aria-expanded', String(!collapsed));
});
// Click 1 dòng bảng bộ lạc nổi -> camera nhảy tới kinh đô (như bảng cột phải).
el('ovTribes').addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-tribe]');
  if (!row) return;
  const t = tribes[Number(row.dataset.tribe)];
  if (!t) return;
  const town = buildings.find(b => b.tribeId === t.id && b.type === 'town' && b.hp > 0);
  focusOn(town ? town.x : t.home.x, town ? town.y : t.home.y);
});
// Nút ✕ trên thẻ đang-chọn -> bỏ chọn.
el('inspectBar').addEventListener('click', (e) => {
  if (e.target.closest('.ins-close')) { selected = null; renderOverlaySelected(); }
});
// Đổi tiêu chí chọn lọc anh hùng giữa chừng là HỢP LỆ và rất đáng thử: dòng dõi
// vẫn giữ nguyên lịch sử, nhưng từ cái chết kế tiếp trở đi nó bị kéo về hướng
// khác. Đây là cách nhanh nhất để thấy tận mắt rằng "tiến hoá" không có đích cố
// định — nó chỉ leo lên cái đồi mà ta vừa dựng ra cho nó.
// Vào một thế cuộc từ trang bìa = bắt đầu lại kỷ nguyên với policy NGẪU NHIÊN hoàn
// toàn. Cố ý không mang policy cũ sang: gen đã được chọn lọc để thắng ở môi trường
// này sẽ là điểm xuất phát méo ở môi trường kia, và cái ta muốn xem chính là mỗi
// môi trường tự nó kéo gen về đâu khi bắt đầu từ số không.
let bootDone = false;   // vòng lặp rAF đã chạy chưa — chỉ lần enterGame ĐẦU mới khởi động nó
let menuOpen = true;    // trang bìa hiện ngay khi tải trang
function enterGame(mode) {
  gameMode = mode;
  era = 1;
  survivalRecord = 0;
  eraHistory = [];
  hideEraCard();
  startEra([randomPolicy(), randomPolicy(), randomPolicy(), randomPolicy()]);
  running = true;
  setPauseUI(true);
  el('menuScreen').style.display = 'none';
  menuOpen = false;
  // Cập nhật ngay, không đợi nhịp render 6 frame một lần: bảng của thế cuộc vừa
  // tắt mà còn nằm đó thì người dùng tưởng nút không ăn.
  renderDefendPanel();
  logEvent(mode === 'defend'
    ? '🛡 THỦ THÀNH — bốn bộ lạc ngừng đánh nhau, sóng quái bắt đầu tràn tới.'
    : '⚔ CHINH PHẠT — bốn bộ lạc tranh thiên hạ.', '#d8a544', true);
  // Vòng lặp vẽ chỉ được khởi động ở lần vào game đầu tiên: trước đó chưa có thế
  // giới nào để vẽ, nên startEra + rAF cùng bị hoãn tới đây.
  if (!bootDone) { bootDone = true; requestAnimationFrame(frame); }
}
// Mở trang bìa: dừng mô phỏng và phủ bìa lên. Nút "Trở lại ván đang chơi" chỉ hiện
// khi ĐÃ có một ván đang chạy — không mời người chơi "tiếp tục" cái chưa từng bắt đầu.
function showMenu() {
  running = false;
  if (bootDone) setPauseUI(false);
  el('menuResume').style.display = bootDone ? 'inline-block' : 'none';
  el('menuScreen').style.display = 'flex';
  menuOpen = true;
}
function resumeGame() {
  el('menuScreen').style.display = 'none';
  menuOpen = false;
  running = true;
  setPauseUI(true);
}
document.querySelectorAll('#menuScreen .mode-card').forEach((btn) => {
  btn.addEventListener('click', () => enterGame(btn.dataset.mode));
});
el('menuResume').addEventListener('click', resumeGame);
el('btnMenu').addEventListener('click', showMenu);

el('heroFitnessSelect').addEventListener('change', (e) => {
  CONFIG.HERO.FITNESS_MODE = e.target.value;
  // Điểm cũ được chấm bằng thước cũ nên không so sánh được với thước mới; giữ lại
  // thì tổ tiên "tốt nhất" theo thước cũ sẽ khoá cứng dòng dõi mãi mãi.
  for (const t of tribes) if (t.heroLine) t.heroLine.best = null;
  logEvent(`Chúa Tể đổi tiêu chí chọn lọc anh hùng: ${e.target.value === 'tribe' ? 'vì bộ lạc' : 'cá nhân'}`, '#d8a544', true);
});

el('cameraSelect').addEventListener('change', (e) => {
  cameraMode = e.target.value;
  if (cameraMode === 'follow' && !getSelected()) {
    setGodHint('Chế độ bám: hãy click một quân hoặc công trình để camera đi theo.');
  }
  if (cameraMode !== 'director') {
    directorTarget = null;
    // Nhãn góc trên dùng chung cho cả "🎬 tên cảnh" và "🎯 đang bám ai". Chỉ chế
    // độ TỰ DO mới thật sự không có gì để nói, nên chỉ nó mới được tắt nhãn.
    if (cameraMode !== 'follow') el('directorLabel').style.display = 'none';
  }
});

// Nút quyền năng
// Vạch màu bên trái mã hoá LÃNH VỰC của quyền năng — chu sa cho thứ gây hại, thanh
// lục cho thứ nuôi lớn, vàng cho thứ ban tặng — nên nó là thông tin, không phải trang trí.
el('godButtons').innerHTML = GOD_POWERS.map(p =>
  `<button class="god-btn" id="god_${p.id}" data-tone="${p.tone}">` +
    `<span class="gb-name">${p.name || p.label}</span>` +
    `<span class="gb-cost">${p.cost}<i>đức tin</i></span>` +
  `</button>`
).join('');
for (const p of GOD_POWERS) {
  el('god_' + p.id).addEventListener('click', () => {
    if (armedPower === p.id) {
      armedPower = null;
      simCanvas.classList.remove('god-armed');
      setGodHint('Đã huỷ quyền năng đang chọn.');
    } else {
      armedPower = p.id;
      simCanvas.classList.add('god-armed');
      setGodHint(p.hint);
    }
  });
}

// Nút "Đáp lời" trong bảng khẩn cầu. Uỷ quyền sự kiện lên panel cha chứ không gắn
// vào từng nút: bảng này được dựng lại innerHTML mỗi 6 frame, nên listener gắn
// trực tiếp sẽ bị vứt đi ngay và người xem bấm không ăn — mà lỗi đó im lặng hoàn
// toàn, không có gì trong console để lần theo.
el('prayerPanel').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pray]');
  if (!btn) return;
  const t = tribes[Number(btn.dataset.pray)];
  if (!t || !t.prayer || faith < CONFIG.WORSHIP.BLESS_COST) return;
  faith -= CONFIG.WORSHIP.BLESS_COST;
  grantBlessing(t, t.prayer.kind);
  renderPrayerPanel();
  renderGodPanel();
});

el('chkAutoGod').addEventListener('change', (e) => {
  autoGod = e.target.checked;
  setGodHint(autoGod
    ? 'Chúa Tể tự động: sẽ tự đáp lời kẻ thành tâm nhất, và can thiệp khi Đức Tin vượt ngưỡng.'
    : 'Đã tắt tự động — Đức Tin chỉ tiêu khi bạn bấm.');
});
el('tuneAutoGod').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  if (v >= 10 && v <= 100) autoGodThreshold = v;
});
// Ghi lại giá trị mặc định ĐÈ LÊN thứ trình duyệt tự điền. Trình duyệt khôi phục
// giá trị cũ của input sau khi tải lại trang, nên nếu không đặt lại từ code thì
// CONFIG và ô nhập sẽ nói hai điều khác nhau — đúng cái bẫy đã mất công truy một
// lần rồi ở bảng tham số bên dưới.
el('chkAutoGod').checked = autoGod;
el('tuneAutoGod').value = autoGodThreshold;
el('legendWonderHold').textContent = CONFIG.WONDER.HOLD_TICKS;

// Tham số live. Hai hệ số nhân dưới đây được ĐỌC MỖI TICK trong tickVillager/
// tickTribeEconomy, nên chỉnh là thấy hiệu quả ngay không cần restart kỷ nguyên.
CONFIG.ECON.gatherMult = 1;
CONFIG.ECON.upkeepMult = 1;
const tuneEraTicks = el('tuneEraTicks');
const tuneMutation = el('tuneMutation');
const tuneUpkeep = el('tuneUpkeep');
const tuneGather = el('tuneGather');
tuneEraTicks.value = CONFIG.ERA.MAX_TICKS;
tuneMutation.value = CONFIG.ERA.POLICY_MUTATION;
tuneUpkeep.value = CONFIG.ECON.upkeepMult;
tuneGather.value = CONFIG.ECON.gatherMult;
tuneEraTicks.addEventListener('input', (e) => { const v = Number(e.target.value); if (v >= 1000) CONFIG.ERA.MAX_TICKS = v; });
tuneMutation.addEventListener('input', (e) => { const v = Number(e.target.value); if (v >= 0 && v <= 1) CONFIG.ERA.POLICY_MUTATION = v; });
tuneUpkeep.addEventListener('input', (e) => { const v = Number(e.target.value); if (v >= 0) CONFIG.ECON.upkeepMult = v; });
tuneGather.addEventListener('input', (e) => { const v = Number(e.target.value); if (v > 0) CONFIG.ECON.gatherMult = v; });

// ============================================================
// Boot
// ============================================================
// Ép mọi <select> trạng thái về ĐÚNG giá trị mà code đang giữ, TRƯỚC khi khởi
// động. Trình duyệt khôi phục lựa chọn cũ của ô <select> sau khi tải lại trang,
// và nó làm việc đó SAU khi HTML dựng xong — nên `selected` trong thẻ option
// thua, còn biến trong code thì không hề biết. Đúng cái bẫy đã mất công truy một
// lần ở bảng tham số: người dùng thấy ô ghi "600 tick/s" trong khi mô phỏng chạy
// 12, hoặc ngược lại, và không có cách nào đoán ra bên nào đang nói thật.
el('speedSelect').value = String(ticksPerSecond);
// Và một ca ĐÃ hỏng sẵn từ trước theo đúng kiểu đó, chỉ là chưa ai để ý: ô chọn
// camera để `<option value="director" selected>`, phần chú giải bảo "để camera
// đạo diễn tự đưa bạn tới nơi đang có chuyện", nhưng biến khởi tạo là `'free'`
// và chỉ có sự kiện `change` mới đồng bộ hai bên. Nghĩa là camera đạo diễn —
// linh hồn của một trò chơi "chỉ ngồi xem" — CHƯA TỪNG chạy khi mới mở trang,
// trừ khi người dùng tự tay bấm vào ô rồi chọn lại đúng cái đang hiện.
cameraMode = 'director';
el('cameraSelect').value = cameraMode;
el('chkSlowmo').checked = cinematicSlowmo;
el('chkAutoEra').checked = autoEra;
setZoom(Number(el('zoomSelect').value));
// Không vào thẳng game nữa: trang bìa hiện ra để người chơi chọn thế cuộc trước.
// startEra + vòng lặp rAF được hoãn tới lần enterGame đầu tiên (xem showMenu/enterGame).
showMenu();
