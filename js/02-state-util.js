'use strict';
// ============================================================
// 02-state-util.js
// ------------------------------------------------------------
// Biến trạng thái toàn cục + tiện ích dùng chung (clamp/dist/noise), sinh địa
// hình, quản lý ô tài nguyên và sinh bản đồ.
// Tách cơ học từ civilization.html một-file, dòng 2075–2450.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// State
// ============================================================
let tribes = [];
let units = [];
let buildings = [];
let resourceCells = new Map();          // "x,y" -> cell {x,y,type,amount,max,regrow,farmOf}
const resBuckets = { wood: new Map(), food: new Map(), gold: new Map(), stone: new Map() };
// Bốn loại tài nguyên, một danh sách. Mọi vòng lặp "cho từng loại" phải đọc từ đây
// chứ không viết tay ['food','wood','gold'] — đúng ba chỗ viết tay như vậy là lý do
// thêm loại thứ tư vào một codebase bình thường lại hay sót.
const RES_TYPES = ['food', 'wood', 'gold', 'stone'];
let regrowList = [];                    // các cell có regrow > 0 (bụi quả + ruộng)
let blockedCells = new Set();           // ô chặn đường/tầm nhìn = ô có cây (địa hình không còn chặn ai)
let unitBuckets = new Map();            // dựng lại mỗi tick, dùng cho tìm địch
let tribeBuildings = [];                // chỉ mục công trình theo bộ lạc, dựng lại mỗi tick

// Địa hình: 0 = đầm cạn, 1 = cát, 2 = cỏ. CẢ BA đều đi qua được — địa hình từ bản
// này thuần là màu và ánh sáng, không còn là luật chơi. moistMap để pha màu.
const T_BASIN = 0, T_SAND = 1, T_GRASS = 2;
let terrainMap = null;                  // Uint8Array(W*H)
let moistMap = null;                    // Float32Array(W*H)
let elevMap = null;                     // Float32Array(W*H) — GIỮ LẠI để đổ bóng địa hình
let lastDrawables = [];                 // danh sách vẽ của frame gần nhất, dùng cho hit-test
let terrainCanvas = document.createElement('canvas');
let terrainDirty = true;

// Lãnh thổ (xem CONFIG.TERRITORY)
let terrW = 0, terrH = 0;
let territoryOwner = null;              // Int8Array, -1 = vô chủ
let territoryCanvas = document.createElement('canvas');

let lairs = [];                         // hang ổ quái vật {x,y,hp,maxHp,spawned,timer,id}
let groundItems = [];                   // vật phẩm đang nằm dưới đất, chờ anh hùng nhặt

// Chế độ chơi: 'conquest' = 4 bộ lạc đánh nhau (mặc định), 'defend' = cùng chống sóng quái.
let gameMode = 'conquest';
let waveNumber = 0;
let nextWaveTick = 0;
let waveTargetTribe = -1;               // bộ lạc mà đợt hiện tại đang nhắm vào
let monsterField = null;                // BFS từ công trình của bộ lạc bị nhắm — đường tiến công dùng chung cả sóng
let monsterFieldTick = -99999;
let survivalRecord = 0;                 // kỷ lục sống sót (tick) qua các kỷ nguyên thủ thành

// Kỳ quan — đường thắng thứ hai. Giữ ở đây chứ không trên tribe, vì cả bàn cờ chỉ
// quan tâm đúng một câu hỏi: "toà Kỳ quan nào đang đếm ngược, và còn bao lâu".
let wonderWatch = null;                 // { buildingId, tribeId, doneAt } | null
let wonderWinnerTribe = -1;             // bộ lạc đã hoàn thành đủ thời gian giữ -> thắng kỷ nguyên

let fx = [];                            // hiệu ứng ngắn hạn (tia đánh, tia lửa, mũi tên, chữ nổi)
let ruins = [];                         // vết tích công trình đã bị phá, mờ dần
let hotspots = [];                      // điểm nóng cho camera đạo diễn
let mapToasts = [];                     // thông báo sự kiện lớn, nổi giữa bản đồ

let tick = 0;
let era = 1;
let running = true;

// ============================================================
// ĐỒNG HỒ THẬT — thay cho "tick mỗi frame"
// ============================================================
// Tới hết 3.7 tốc độ đo bằng số tick mỗi FRAME, mặc định 10 — tức 600 tick/giây
// trên màn 60Hz. Hệ quả mà không ai viết ra:
//   · một dân thường đi 1 ô/tick nên nó băng qua khung nhìn 150 ô trong 0,25 giây;
//     mắt không thể bám theo BẤT KỲ AI, và cả trò chơi chỉ còn là đám mây chấm màu;
//   · một tia chém sống 5 tick = 1/120 giây, ngắn hơn một frame — nghĩa là phần
//     lớn hiệu ứng chiến đấu đã được vẽ suốt bao lâu nay mà CHƯA TỪNG hiện ra đủ
//     lâu để nhìn thấy.
// Giờ tốc độ đo bằng TICK MỖI GIÂY THẬT (mặc định 24) và render vẫn 60fps, phần
// giữa hai tick được NỘI SUY (xem updateRenderPositions). Chậm đi 25 lần nhưng
// TRÔNG MƯỢT HƠN, vì mắt được cho đường đi liên tục thay vì chuỗi ảnh nhảy cóc.
// 12, không phải 24 và tuyệt đối không phải 600. Ở 12 tick/s một dân thường mất
// khoảng 8 giây để đi hết chiều ngang khung hình — đủ chậm để mắt CHỌN được một
// người và đi theo họ, mà một kỷ nguyên điển hình vẫn khép lại trong dăm bảy
// phút. Muốn xem chọn lọc qua nhiều kỷ nguyên thì đã có nấc ⏭ tua.
let ticksPerSecond = 12;
let tickAcc = 0;                        // phần tick lẻ chưa chạy, cộng dồn qua các frame
let lastFrameMs = 0;                    // mốc thời gian thật của frame trước
let dtSec = 1 / 60;                     // độ dài frame này tính bằng giây thật, đã kẹp biên
// ĐỒNG HỒ HOẠT ẢNH. Chạy 60 đơn vị mỗi GIÂY THẬT, độc lập hoàn toàn với mô phỏng.
// Mọi dao động thuần trang trí (nhấp nhô bước chân, ngọn lửa, sóng nước, nét đứt
// xoay quanh vùng chọn) đọc từ đây. Nếu chúng đọc `tick` như trước thì ở 6 tick/s
// ngọn lửa sẽ đập chậm như tim người sắp chết, còn lúc tạm dừng thì cả thế giới
// đông cứng thành ảnh chụp — cùng họ với lỗi "đồng hồ tick vs đồng hồ frame" đã
// cắn ở camera đạo diễn, chỉ khác là lần này nó cắn vào toàn bộ phần nhìn.
let aTick = 0;
let eraState = 'playing';               // 'playing' | 'ended'
let eraBannerFrames = 0;
let autoEra = true;

// Quay chậm khoảnh khắc lớn: mỗi thông báo nổi giữa bản đồ (logEvent major) hạ
// tốc độ xuống một nhịp trong chốc lát. Không phải hiệu ứng làm màu — nó giải
// đúng bài toán "tin quan trọng nhất lại trôi qua nhanh nhất": kinh đô bị san
// phẳng và một cú giao tranh lẻ trước đây trôi qua với CÙNG một tốc độ.
let slowmoLeft = 0;                     // giây thật còn lại
let cinematicSlowmo = true;

let camX = 0, camY = 0;
let nextId = 1;
let faith = CONFIG.GOD.FAITH_START;
let armedPower = null;                  // id quyền năng đang "lên đạn", chờ click bản đồ
let selected = null;                    // { kind:'unit'|'building', id }
let eventLog = [];
let eraHistory = [];
let lastWarSpot = null;                 // để camera bám chiến trường

const history = { ticks: [], pop: [[], [], [], []], food: [[], [], [], []] };

// ============================================================
// Tiện ích
// ============================================================
function cellKey(x, y) { return x + ',' + y; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
function gauss(sigma) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function cheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
function isBlocked(x, y) { return blockedCells.has(cellKey(x, y)); }
function inBounds(x, y) { return x >= 0 && y >= 0 && x < CONFIG.GRID_WIDTH && y < CONFIG.GRID_HEIGHT; }

// major = sự kiện đủ lớn để hiện thành thông báo nổi GIỮA BẢN ĐỒ. Người xem đang
// nhìn khung hình, không nhìn cột nhật ký bên phải — biến cố lớn phải tự tìm đến mắt.
function logEvent(text, color, major) {
  eventLog.push({ tick, text, color: color || '#9a8d78' });
  if (eventLog.length > CONFIG.LOG_MAX) eventLog.shift();
  if (major) {
    // 3 dòng chứ không 4, và ngắn hơn. Trước 3.8 tuổi thọ đếm bằng TICK nên ở
    // 600 tick/s một thông báo sống 0,3 giây — chồng bao nhiêu cũng không kịp
    // thấy. Giờ nó sống 2,5 giây THẬT, và bốn dòng chồng lên nhau che mất đúng
    // dải giữa phía trên khung hình, tức là che mất chính cái nó đang báo.
    // Gộp trùng: một bộ lạc có ba nhà chính thì lúc nó sụp đổ, đúng một dòng chữ
    // được đẩy lên ba lần và chiếm trọn cả ngăn thông báo. Trùng thì gia hạn dòng
    // cũ và đếm số lần, thay vì xếp chồng ba bản sao.
    const last = mapToasts[mapToasts.length - 1];
    if (last && last.text === text) {
      last.life = last.maxLife;
      last.count = (last.count || 1) + 1;
    } else {
      mapToasts.push({ text, color: color || '#e7dcc6', life: 150, maxLife: 150, count: 1 });
      if (mapToasts.length > 3) mapToasts.shift();
    }
    // Chỉ quay chậm khi người xem đang THẬT SỰ xem. Ở chế độ tua (>90 tick/s) họ
    // đang cố ý bỏ qua diễn biến để tới cuối kỷ nguyên, và một cú phanh gấp ở đó
    // chỉ là chướng ngại vật.
    if (cinematicSlowmo && ticksPerSecond <= 90) slowmoLeft = Math.max(slowmoLeft, 1.1);
  }
}

// ============================================================
// Địa hình
// ============================================================
// Value noise: rải điểm ngẫu nhiên trên một lưới THƯA rồi nội suy mượt giữa
// chúng. Cộng vài tầng (fbm) với tần số tăng dần / biên độ giảm dần được hình
// dạng tự nhiên: mảng lớn quyết định lục địa và hồ, tầng nhỏ thêm chi tiết bờ.
function makeNoise(nodeSpacing) {
  const gw = Math.ceil(CONFIG.GRID_WIDTH / nodeSpacing) + 2;
  const gh = Math.ceil(CONFIG.GRID_HEIGHT / nodeSpacing) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = Math.random();
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx2 = x / nodeSpacing, fy2 = y / nodeSpacing;
    const x0 = Math.floor(fx2), y0 = Math.floor(fy2);
    const tx = smooth(fx2 - x0), ty = smooth(fy2 - y0);
    const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1];
    const c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
  };
}

function generateTerrain() {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  terrainMap = new Uint8Array(W * H);
  moistMap = new Float32Array(W * H);
  // Trước đây độ cao là biến cục bộ, sinh xong bản đồ là ném đi. Giữ lại thì lớp
  // nền đổ bóng được theo đúng địa hình mà chi phí mỗi frame vẫn là 1 drawImage.
  elevMap = new Float32Array(W * H);
  const elev = elevMap;
  const e1 = makeNoise(46), e2 = makeNoise(19), e3 = makeNoise(8);
  const m1 = makeNoise(30), m2 = makeNoise(11);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      elev[i] = (e1(x, y) + e2(x, y) * 0.5 + e3(x, y) * 0.25) / 1.75;
      moistMap[i] = (m1(x, y) + m2(x, y) * 0.5) / 1.5;
    }
  }

  // Ngưỡng đầm lấy theo PHÂN VỊ của chính bản đồ vừa sinh, không phải một hằng
  // số tuyệt đối. Lý do: fbm của nhiễu đều không cho phân bố đều — đặt cứng
  // 0.37 hoá ra ngập 32% bản đồ thay vì ~12% như dự tính. Hồi còn nước thì đó là
  // thảm hoạ (bốn bộ lạc trên bốn hòn đảo, cả kỷ nguyên không một trận đánh);
  // giờ nó chỉ còn là chuyện màu sắc, nhưng phân vị vẫn đúng hơn nên vẫn giữ.
  const sample = [];
  for (let i = 0; i < elev.length; i += 7) sample.push(elev[i]);
  sample.sort((a, b) => a - b);
  const basinLevel = CONFIG.TERRAIN.BASIN_FRACTION <= 0 ? -Infinity
    : sample[Math.floor(CONFIG.TERRAIN.BASIN_FRACTION * (sample.length - 1))];

  for (let i = 0; i < elev.length; i++) {
    terrainMap[i] = elev[i] < basinLevel ? T_BASIN : T_GRASS;
  }

  // Cát là MÉP ĐẦM, không phải một tầng độ cao. Bản đầu cắt cát theo phân vị độ
  // cao, nên những vùng đồng bằng phẳng nằm sát ngưỡng biến thành sa mạc giữa
  // lục địa — nhìn vô lý và làm bản đồ loang lổ. Giờ cát chỉ mọc quanh mép trũng.
  // Vành cát này là thứ duy nhất còn sót lại của bờ hồ cũ, và giữ nó là có chủ ý:
  // nó là đầu SÁNG NHẤT của bảng màu, bỏ đi thì bản đồ mất luôn khoảng tương phản.
  const beach = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (terrainMap[i] !== T_GRASS) continue;
      let near = false;
      for (let dx = -2; dx <= 2 && !near; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (terrainMap[ny * W + nx] === T_BASIN) { near = true; break; }
        }
      }
      if (near) beach.push(i);
    }
  }
  for (const i of beach) terrainMap[i] = T_SAND;

  // KHÔNG nạp gì vào blockedCells ở đây. Đây là cả nội dung của thay đổi này:
  // trước bản này vòng lặp cuối hàm biến mọi ô nước thành ô chặn, và từ đó sinh
  // ra toàn bộ họ hàng lỗi "kẹt" — quân ép mặt vào vịnh lõm, bộ lạc bị nhốt trên
  // đảo, đồ rơi xuống hồ không ai nhặt được. Giờ địa hình không chặn ai, nên
  // blockedCells chỉ còn đúng một nguồn: cây.
  terrainDirty = true;
}

function terrainAt(x, y) {
  if (!terrainMap || !inBounds(x, y)) return T_GRASS;
  return terrainMap[y * CONFIG.GRID_WIDTH + x];
}

// ============================================================
// Tài nguyên trên bản đồ
// ============================================================
function bKey(x, y) {
  return Math.floor(x / CONFIG.BUCKET_SIZE) + ',' + Math.floor(y / CONFIG.BUCKET_SIZE);
}

function addResource(x, y, type, amount, opts) {
  if (!inBounds(x, y)) return null;
  const key = cellKey(x, y);
  if (resourceCells.has(key)) return null;
  const cell = {
    key, x, y, type, amount, max: amount,
    regrow: (opts && opts.regrow) || 0,
    farmOf: (opts && opts.farmOf) || null
  };
  resourceCells.set(key, cell);
  const bk = bKey(x, y);
  let set = resBuckets[type].get(bk);
  if (!set) { set = new Set(); resBuckets[type].set(bk, set); }
  set.add(cell);
  if (cell.regrow > 0) regrowList.push(cell);
  if (type === 'wood') blockedCells.add(key);
  return cell;
}

function removeResource(cell) {
  resourceCells.delete(cell.key);
  const set = resBuckets[cell.type].get(bKey(cell.x, cell.y));
  if (set) set.delete(cell);
  if (cell.regrow > 0) {
    const i = regrowList.indexOf(cell);
    if (i >= 0) regrowList.splice(i, 1);
  }
  if (cell.type === 'wood') blockedCells.delete(cell.key);
}

// Tìm ô tài nguyên gần nhất theo LOẠI, quét lan từ bucket của chính mình ra
// ngoài từng vòng. Dừng ngay khi vòng hiện tại đã đảm bảo không có gì gần hơn
// kết quả tốt nhất (bestD <= r * BUCKET_SIZE) — nhờ vậy tìm 1 mục tiêu ngay bên
// cạnh chỉ tốn ~1 bucket thay vì quét cả bản đồ.
function findNearestResource(x, y, type, maxDist, field, avoid) {
  const B = CONFIG.BUCKET_SIZE;
  const bx = Math.floor(x / B), by = Math.floor(y / B);
  const maxRing = Math.ceil(maxDist / B) + 1;
  const map = resBuckets[type];
  let best = null, bestD = Infinity;
  for (let r = 0; r <= maxRing; r++) {
    for (let ix = bx - r; ix <= bx + r; ix++) {
      for (let iy = by - r; iy <= by + r; iy++) {
        if (r > 0 && Math.abs(ix - bx) !== r && Math.abs(iy - by) !== r) continue; // chỉ viền vòng r
        const set = map.get(ix + ',' + iy);
        if (!set) continue;
        for (const c of set) {
          if (c.amount < 1) continue;
          const d = dist(x, y, c.x, c.y);
          if (d >= bestD || d > maxDist) continue;
          if (avoid && avoid.indexOf(c.key) >= 0) continue;
          if (field && !reachableIn(field, c.x, c.y)) continue;
          bestD = d; best = c;
        }
      }
    }
    if (best && bestD <= r * B) break;
  }
  return best;
}

// ============================================================
// Sinh bản đồ
// ============================================================
function scatterCluster(cx, cy, radius, spacing, density, fn) {
  for (let ox = cx - radius; ox <= cx + radius; ox += spacing) {
    for (let oy = cy - radius; oy <= cy + radius; oy += spacing) {
      if (dist(ox, oy, cx, cy) > radius || Math.random() >= density) continue;
      const jx = Math.round(ox + (Math.random() - 0.5) * spacing);
      const jy = Math.round(oy + (Math.random() - 0.5) * spacing);
      if (inBounds(jx, jy)) fn(jx, jy);
    }
  }
}

function generateMap() {
  resourceCells = new Map();
  for (const t of RES_TYPES) resBuckets[t] = new Map();
  regrowList = [];
  blockedCells = new Set();
  generateTerrain(); // chạy trước để mọi thứ sau đó có elevMap/moistMap mà dùng
  const M = CONFIG.MAP;

  for (let i = 0; i < M.FOREST_CLUSTERS; i++) {
    const cx = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
    const cy = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
    scatterCluster(cx, cy, M.FOREST_RADIUS, M.TREE_SPACING, M.TREE_DENSITY,
      (x, y) => addResource(x, y, 'wood', M.WOOD_PER_TREE));
  }
  for (let i = 0; i < M.BERRY_CLUSTERS; i++) {
    const cx = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
    const cy = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
    scatterCluster(cx, cy, M.BERRY_RADIUS, 1, M.BERRY_DENSITY,
      (x, y) => addResource(x, y, 'food', M.FOOD_PER_BERRY, { regrow: M.BERRY_REGROW }));
  }
  for (let i = 0; i < M.GOLD_CLUSTERS; i++) {
    const cx = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
    const cy = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
    scatterCluster(cx, cy, M.GOLD_RADIUS, 1, M.GOLD_DENSITY,
      (x, y) => addResource(x, y, 'gold', M.GOLD_PER_ORE));
  }
  // Mỏ đá: ít cụm, cụm to. Cố ý KHÔNG rải đều — xem chú thích ở CONFIG.MAP.
  for (let i = 0; i < M.STONE_CLUSTERS; i++) {
    const cx = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
    const cy = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
    scatterCluster(cx, cy, M.STONE_RADIUS, 1, M.STONE_DENSITY,
      (x, y) => addResource(x, y, 'stone', M.STONE_PER_ROCK));
  }
}

// Dọn quang một vùng để đặt nhà chính: chặt cây. Bản cũ còn phải RÚT CẠN NƯỚC ở
// đây — không phải cho đẹp mà vì noise hoàn toàn có thể đặt điểm xuất phát của
// một bộ lạc xuống giữa hồ và họ chết ngay khi lập quốc. Địa hình hết chặn thì
// cả nỗi lo đó biến mất: đầm cạn dựng nhà được như mọi ô khác.
function clearArea(cx, cy, radius) {
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (!inBounds(x, y) || dist(x, y, cx, cy) > radius) continue;
      const c = resourceCells.get(cellKey(x, y));
      if (c && c.type === 'wood') removeResource(c);
    }
  }
}

