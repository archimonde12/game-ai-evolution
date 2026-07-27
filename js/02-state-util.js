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

// ĐƯỜNG CÁI (Phase 3.27) — "x,y" -> { x, y, tribeId, ns, ew }
//
// Một Map, KHÔNG phải một mảng công trình và cũng không phải một lớp Uint8 trên
// lưới. Lý do cho từng lựa chọn:
//   · không phải `buildings`: mọi thứ trong mảng đó đều có máu, bị nhắm bắn, được
//     đếm vào bảng công trình, sinh ảnh hưởng lãnh thổ và đổ bóng. Đường cái không
//     có thứ nào trong số đó, nên nhét nó vào đấy là mở SÁU cánh cửa để phải nhớ
//     đóng lại — đúng cái dạng lỗi "loại mới lặng lẽ rơi vào nhánh mặc định" đã
//     ghi ở UNIT_SPEC và MILITARY_SET.
//   · không phải Uint8Array(W*H): 144.000 ô cho tối đa ~2.500 ô đường. Map thưa
//     vừa nhẹ hơn vừa cho phép đính kèm hướng (ns/ew) để vẽ mối nối cho đúng.
// Tra bằng `roadCells.has(x + ',' + y)` nằm trên đường đi nóng nhất của cả game
// (mỗi đơn vị mỗi tick), nên nó phải là một phép tra băm trần — xem onRoad.
let roadCells = new Map();

// TƯỜNG THÀNH (Phase 3.29) — "x,y" -> { x, y, key, tribeId, hp, maxHp, hitTick,
//                                       downUntil, isWall }
//
// Cùng lý lẽ với `roadCells` ngay trên, và lần này còn nặng hơn một bậc: một vành
// bán kính 20 có 160 ô, bốn bộ lạc với ba kinh đô là gần hai nghìn vật thể. Nhét
// chúng vào `buildings` là nhân số phần tử của mảng đó lên hơn mười lần, mà
// `buildings` thì bị QUÉT TUYẾN TÍNH ở sáu chỗ trên đường đi nóng
// (findNearestEnemyBuilding, bfsFieldFromBuildings, computeTribeStats, ảnh hưởng
// lãnh thổ, danh sách vẽ, hit-test). Đó là đúng loại chi phí nhân theo tích đã hai
// lần là thủ phạm hiệu năng trong dự án này.
//
// Đổi lại, mọi thứ mà một "công trình" được hưởng thì tường phải tự mang: `hp`,
// `maxHp`, `hitTick` (báo động + hoãn tự sửa) và cờ `isWall` để dealDamage rẽ
// nhánh. Cờ `isWall` đóng đúng vai `isLair` — cùng một chỗ, cùng một lý do: một
// vật CÓ máu và CÓ size-like nhưng KHÔNG nằm trong CONFIG.BUILD, nên mọi chỗ tra
// `CONFIG.BUILD[target.type]` phải đi qua một cái cửa.
//
// `downUntil` là toàn bộ cơ chế "đục thủng rồi thì lỗ mở bao lâu": ô bị phá KHÔNG
// bị xoá khỏi Map (xoá thì không còn ai nhớ chỗ đó từng có tường), nó chỉ ngừng
// chặn đường cho tới mốc ấy rồi mọc lại. Một trường thay cho một hàng đợi phế tích.
let wallCells = new Map();

// Ô này có tường KHÔNG SẬP đang đứng? Trả về vật tường hoặc null.
//
// Trên đường đi NÓNG NHẤT của cả file (mỗi bước của mỗi đơn vị mỗi tick), nên nó
// phải là một phép tra băm trần cộng một phép so sánh — không vòng lặp, không cấp
// phát chuỗi nào ngoài cái khoá.
function wallAt(x, y) {
  const w = wallCells.get(x + ',' + y);
  return w && w.hp > 0 ? w : null;
}

// Ô này có chặn ĐƯỜNG ĐI CỦA NGƯỜI NÀY không — và đây là câu hỏi mà `blockedCells`
// không bao giờ hỏi được, vì cây thì chặn tất cả còn tường thì chặn có chọn lọc.
//
// `tribeId < 0` là quái vật: mọi bức tường đều chặn chúng, kể cả tường của bộ lạc
// đang bị chúng đi cướp. Đó là cả nội dung của "tường chặn địch và quái, không chặn
// quân mình" viết ra thành mã.
//
// KHÔNG có khái niệm đồng minh trong bản này (bốn bộ lạc đều là địch của nhau), nên
// so sánh `tribeId` là đủ. Ngày nào có liên minh thì đây là MỘT chỗ duy nhất phải
// sửa — và đó chính là lý do câu hỏi này là một hàm chứ không phải một biểu thức
// chép ở bốn chỗ gọi.
function wallBlocks(tribeId, x, y) {
  const w = wallCells.get(x + ',' + y);
  return (w && w.hp > 0 && w.tribeId !== tribeId) ? w : null;
}

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

// ============================================================
// ĐƯỜNG CÁI — ba hàm, và cả cơ chế nằm trong `onRoad`
// ============================================================
// `onRoad` chạy cho MỌI đơn vị MỖI tick (240 quân × 12 tick/s, và ở tốc độ tua thì
// gấp nhiều lần). Nên nó phải là đúng một phép tra băm, không hình học, không vòng
// lặp. Đó cũng là lý do đường cái lưu theo Ô chứ không theo TUYẾN: hỏi "điểm này có
// nằm trên tuyến nào không" là một phép chiếu lên từng đoạn thẳng, còn hỏi "ô này
// có phải ô đường không" là một phép tra bảng.
function onRoad(u) { return roadCells.has(u.x + ',' + u.y); }

// Bao nhiêu ô đường đang kề bên (8 hướng). Dùng cho LUẬT CHỐNG PHÌNH: ô ứng viên
// đã có >= ROAD.MAX_NEIGHBORS ô đường xung quanh thì cấm lát, nên hai tuyến chạy
// song song sát nhau sẽ tự dừng thay vì dính lại thành một mảng sân lát đá.
function roadNeighbors(x, y) {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (roadCells.has((x + dx) + ',' + (y + dy))) n++;
    }
  }
  return n;
}

// Lát một ô. Trả về false nếu ô đó không hợp lệ — người gọi dùng giá trị này để
// KHÔNG trừ tiền, nên nó phải trả lời trung thực chứ không "lát cho có".
function pave(x, y, tribeId) {
  if (!inBounds(x, y)) return false;
  const key = x + ',' + y;
  if (roadCells.has(key)) return false;             // đã có đường rồi
  if (blockedCells.has(key)) return false;          // gốc cây — đường phải vòng
  if (roadNeighbors(x, y) >= CONFIG.ROAD.MAX_NEIGHBORS) return false;  // luật chống phình
  roadCells.set(key, { x, y, tribeId });
  return true;
}

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
    farmOf: (opts && opts.farmOf) || null,
    // GIỮ CHỖ — xem CONFIG.ECON.WORKERS_PER_CELL. `worker` là id người đang hái,
    // `workerTick` là lần cuối người đó thật sự đứng đây. Cặp này là toàn bộ cơ
    // chế "một ô một người", và nó tự hết hạn nên không có sổ nào phải dọn.
    worker: -1,
    workerTick: -99999
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
// Ô này đã có người khác nhận chưa? `id` là người đang hỏi — chỗ mình tự giữ thì
// không tính là bận, nếu không thì một người dân sẽ tự đuổi chính mình khỏi mỏ của
// mình mỗi lần rời ra rồi tìm lại.
//
// Hết hạn sau CLAIM_TTL tick kể từ lần cuối người giữ chỗ THẬT SỰ đứng hái. Đây là
// chỗ cố ý không dùng sổ đăng ký: người dân rời một ô theo bốn đường khác nhau
// (chết, đổi nghề, bỏ vì kẹt, mỏ cạn), và một cơ chế phải nhớ xoá ở cả bốn thì chỉ
// cần quên một đường là ô đó bị khoá tới hết kỷ nguyên. Dấu thời gian không có
// đường nào để quên — xem khối chú thích ở CONFIG.ECON.WORKERS_PER_CELL.
function cellTaken(c, id) {
  return c.worker !== -1 && c.worker !== id && tick - c.workerTick < CONFIG.ECON.CLAIM_TTL;
}

function findNearestResource(x, y, type, maxDist, field, avoid, id) {
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
          if (c.amount < CONFIG.ECON.RES_MIN) continue;   // ngưỡng CHUNG — xem CONFIG.ECON.RES_MIN
          const d = dist(x, y, c.x, c.y);
          if (d >= bestD || d > maxDist) continue;
          if (avoid && avoid.indexOf(c.key) >= 0) continue;
          // MỘT Ô — MỘT NGƯỜI. Lọc ngay ở đây chứ không ở chỗ gọi, vì đây là hàm
          // DUY NHẤT trong game trả lời câu "đi hái ở đâu": ba nhánh của tickVillager
          // đều gọi nó, và lọc ở từng nhánh là ba bản sao của cùng một luật.
          if (id !== undefined && cellTaken(c, id)) continue;
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

// Một điểm ngẫu nhiên bên trong góc phần tư `qi` (0 = trên-trái, 1 = trên-phải,
// 2 = dưới-trái, 3 = dưới-phải) — cùng cách đánh số với `quadrants` ở startEra,
// nên góc `i` luôn là góc của bộ lạc `i`.
//
// Biên `margin` để một cụm bốc trúng sát mép không bị cắt mất một nửa ra ngoài
// bản đồ: cụm cắt đôi ở rìa là cách âm thầm nhất để một góc nghèo đi so với ba
// góc kia, mà cả khối FAIR này sinh ra để xoá đúng chuyện đó.
function quadrantPoint(qi, margin) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  const m = margin || 0;
  const x0 = (qi % 2) ? W / 2 : 0;
  const y0 = (qi >= 2) ? H / 2 : 0;
  return {
    x: clamp(Math.floor(x0 + Math.random() * (W / 2)), m, W - 1 - m),
    y: clamp(Math.floor(y0 + Math.random() * (H / 2)), m, H - 1 - m)
  };
}

// ============================================================
// KHUÔN CỤM — cùng một cụm tài nguyên đóng dấu được ở nhiều chỗ
// ============================================================
// scatterCluster bốc từng ô theo xác suất NGAY LÚC RẢI, nên gọi nó bốn lần với
// cùng tham số cho ra bốn cụm khác nhau (đo được: 38 và 57 ô cho cùng một bộ
// tham số). Với phần bản đồ ngẫu nhiên thì đó đúng là điều mong muốn. Với bộ
// khởi đầu thì đó chính là thứ phá vỡ lời hứa công bằng.
//
// Tách làm hai bước — sinh KHUÔN một lần, rồi ĐÓNG DẤU nhiều lần — thì bốn bộ
// lạc nhận đúng cùng một cụm, không phải "cùng phân phối xác suất".
function buildClusterTemplate(radius, spacing, density) {
  const cells = [];
  for (let ox = -radius; ox <= radius; ox += spacing) {
    for (let oy = -radius; oy <= radius; oy += spacing) {
      if (Math.hypot(ox, oy) > radius || Math.random() >= density) continue;
      cells.push({
        dx: Math.round(ox + (Math.random() - 0.5) * spacing),
        dy: Math.round(oy + (Math.random() - 0.5) * spacing)
      });
    }
  }
  return cells;
}

// sx/sy là hệ số lật (±1). Lật CẢ khuôn chứ không chỉ lật vị trí tâm: nếu chỉ
// lật tâm thì bốn cụm vẫn cùng một hình xoay theo cùng một chiều, và ở những chỗ
// cụm bị mép bản đồ hay một cụm khác cắt vào, bốn bộ lạc mất đi những phần khác
// nhau — công bằng lại rò ra ở đúng chỗ khó thấy nhất.
function stampClusterTemplate(cx, cy, tpl, sx, sy, put) {
  for (const c of tpl) put(cx + c.dx * sx, cy + c.dy * sy);
}

// Vị trí một suất khởi đầu của bộ lạc ở góc phần tư `q`, ĐỐI XỨNG GƯƠNG qua tâm
// bản đồ: cùng bán kính `r`, cùng góc `a`, chỉ đổi dấu theo góc phần tư. Bốn bộ
// lạc vì thế cách mỏ của mình đúng một quãng như nhau, mà thế đứng của bốn bên
// vẫn là ảnh gương của nhau chứ không phải bốn bản sao cùng chiều.
function mirroredKitSpot(home, q, a, r, margin) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT, m = margin || 0;
  const sx = (q % 2) ? -1 : 1, sy = (q >= 2) ? -1 : 1;
  return {
    x: clamp(Math.round(home.x + Math.cos(a) * r * sx), m, W - 1 - m),
    y: clamp(Math.round(home.y + Math.sin(a) * r * sy), m, H - 1 - m),
    sx, sy
  };
}

// ĐỤC LỐI QUA RỪNG — chạy SAU KHI mọi cụm đã rải xong.
//
// Thứ tự là bắt buộc và nó là chỗ dễ viết sai nhất của cả hàm: 96 cụm bán kính 9
// trên bản đồ 480x300 thì chồng lấn nhau rất nhiều, nên một lối đục ngay sau khi
// rải cụm A sẽ bị cụm B rải sau lấp lại. Đục hết ở cuối thì mọi lối đều là lối thật.
//
// Đường xuyên tâm với một góc ngẫu nhiên, quét theo bước 0,5 ô để không bỏ sót ô
// nào khi đường gần chéo 45°. Chỉ gỡ ô CÂY: đường đi qua một mỏ vàng thì mỏ vàng
// đứng nguyên, vì vàng không chặn ai.
//
// GÓC ĐỤC CŨNG PHẢI ĐỐI XỨNG với những cụm thuộc bộ khởi đầu, và chỗ này đã bắt
// được bằng một phép thử: tắt hẳn tầng rải ngẫu nhiên rồi so trữ lượng bốn bộ lạc,
// thì quả/vàng/đá giống nhau tuyệt đối còn GỖ lệch 3-8%. Thủ phạm là đúng dòng
// `Math.random()` từng nằm ở đây — bốn cụm rừng sinh ra từ cùng một khuôn, nhưng
// mỗi cụm bị xẻ một nhát dao khác nhau, nên số cây còn lại khác nhau.
// Một lời bảo đảm chỉ chặt bằng mắt xích lỏng nhất của nó, và mắt xích đó thường
// nằm ở BƯỚC XỬ LÝ SAU chứ không nằm ở bước sinh ra.
//
// ...và đúng cái bài học đó lại bắt được một chỗ rò thứ hai của CHÍNH NÓ. Sau khi
// đã đối xứng hoá góc dao, đo lại vẫn còn 1 trên 25 bản đồ lệch 1% ở gỗ. Nguyên
// nhân: lối đục dài `FOREST_RADIUS + 2` = 11 ô tính từ tâm cụm, nên một cụm rừng
// NGẪU NHIÊN nằm ngay sát mép vùng cấm (39 ô) vẫn thò lưỡi dao tới 28 ô — tức là
// vào trong sân nhà, chặt mất cây của bộ khởi đầu, theo một góc ngẫu nhiên không
// hề đối xứng. Vùng cấm chặn được chỗ ĐẶT cụm nhưng không chặn được TẦM VỚI của
// một bước xử lý sau nó.
// Nên: dao của cụm ngẫu nhiên không được phép chạm vào trong vùng cấm. Dao của
// cụm khởi đầu thì vẫn được — nó đã đối xứng, nên nó cắt của bốn bộ lạc như nhau.
function carveForestLanes(centers, homes) {
  const M = CONFIG.MAP;
  const half = M.LANE_HALF, R = M.FOREST_RADIUS + 2;
  const guardR = M.FAIR && M.FAIR.EXCLUSIVE_R ? M.FAIR.EXCLUSIVE_R : 0;
  const protectedCell = (c, x, y) => {
    if (!homes || !homes.length || !guardR) return false;
    if (c.laneA !== undefined) return false;      // dao của bộ khởi đầu: được phép
    for (const h of homes) if (dist(h.x, h.y, x, y) < guardR) return true;
    return false;
  };
  for (const c of centers) {
    for (let k = 0; k < M.FOREST_LANES; k++) {
      // Cụm khởi đầu mang sẵn góc dao dùng chung (`laneA`) + hệ số lật của chủ nó;
      // cụm rải ngẫu nhiên thì bốc góc tại chỗ như cũ.
      const base = (c.laneA !== undefined ? c.laneA : Math.random() * Math.PI)
                 + k * Math.PI / M.FOREST_LANES;
      const sx = c.sx || 1, sy = c.sy || 1;
      const ca = Math.cos(base) * sx, sa = Math.sin(base) * sy;
      for (let t = -R; t <= R; t += 0.5) {
        const px = Math.round(c.x + ca * t), py = Math.round(c.y + sa * t);
        for (let ox = -half; ox <= half; ox++) {
          for (let oy = -half; oy <= half; oy++) {
            const cx = px + ox, cy = py + oy;
            if (protectedCell(c, cx, cy)) continue;
            const cell = resourceCells.get(cellKey(cx, cy));
            if (cell && cell.type === 'wood') removeResource(cell);
          }
        }
      }
    }
  }
}

// `homes` = bốn điểm xuất phát, đã bốc TRƯỚC khi gọi hàm này (xem startEra).
// Thiếu nó thì hàm vẫn chạy đúng, chỉ mất phần bộ khởi đầu — giữ được đường thoát
// đó để một lần gọi quên tham số không làm sập cả kỷ nguyên.
function generateMap(homes) {
  resourceCells = new Map();
  for (const t of RES_TYPES) resBuckets[t] = new Map();
  regrowList = [];
  blockedCells = new Set();
  // Đường cái phải được dọn Ở ĐÂY cùng với mọi lớp bản đồ khác. Bỏ sót thì kỷ
  // nguyên sau mở ra với nguyên mạng đường của kỷ nguyên trước nằm trên một bản
  // đồ hoàn toàn mới — vô chủ, không nối vào công trình nào, và tặng không tốc độ
  // gấp đôi cho những ô ngẫu nhiên. Cùng họ với `blockedCells` ngay trên.
  roadCells = new Map();
  // Tường thành: cùng một dòng, cùng một lý do. Nặng hơn đường cái một bậc vì
  // tường CÓ PHE — một vành tường sót lại từ kỷ nguyên trước sẽ chặn đường đúng ba
  // bộ lạc và cho một bộ lạc đi qua, ở giữa một bản đồ mà bộ lạc ấy chưa từng đặt
  // chân tới.
  wallCells = new Map();
  generateTerrain(); // chạy trước để mọi thứ sau đó có elevMap/moistMap mà dùng
  const M = CONFIG.MAP;
  const forestCenters = [];

  // Mỗi loại tài nguyên khai báo một lần: cách rải, và bao nhiêu cụm.
  const KINDS = {
    wood:  { n: M.FOREST_CLUSTERS, r: M.FOREST_RADIUS, sp: M.TREE_SPACING, d: M.TREE_DENSITY,
             put: (x, y) => addResource(x, y, 'wood', M.WOOD_PER_TREE) },
    food:  { n: M.BERRY_CLUSTERS,  r: M.BERRY_RADIUS,  sp: 1, d: M.BERRY_DENSITY,
             put: (x, y) => addResource(x, y, 'food', M.FOOD_PER_BERRY, { regrow: M.BERRY_REGROW }) },
    gold:  { n: M.GOLD_CLUSTERS,   r: M.GOLD_RADIUS,   sp: 1, d: M.GOLD_DENSITY,
             put: (x, y) => addResource(x, y, 'gold', M.GOLD_PER_ORE) },
    // Mỏ đá: ít cụm, cụm to. Cố ý KHÔNG rải đều — xem chú thích ở CONFIG.MAP.
    stone: { n: M.STONE_CLUSTERS,  r: M.STONE_RADIUS,  sp: 1, d: M.STONE_DENSITY,
             put: (x, y) => addResource(x, y, 'stone', M.STONE_PER_ROCK) }
  };

  const drop = (type, cx, cy) => {
    const K = KINDS[type];
    if (type === 'wood') forestCenters.push({ x: cx, y: cy });
    scatterCluster(cx, cy, K.r, K.sp, K.d, K.put);
  };

  // ---- Tầng 1: BỘ KHỞI ĐẦU — bảo đảm bằng XÂY DỰNG, không phải bằng xác suất ----
  //
  // Vòng lặp xếp theo thứ tự (suất → bộ lạc), KHÔNG phải (bộ lạc → suất), và thứ
  // tự đó là cả cơ chế: khuôn cụm và bán kính được bốc ở vòng NGOÀI, nên cả bốn bộ
  // lạc dùng chung đúng một khuôn và đúng một bán kính. Đảo hai vòng lại thì mỗi
  // bộ lạc bốc riêng, và ta quay về đúng bản cũ — cùng số dòng, cùng hàm, nhưng
  // mất sạch lời bảo đảm.
  const used = { wood: 0, food: 0, gold: 0, stone: 0 };
  if (homes && homes.length) {
    for (const kit of M.FAIR.KIT) {
      const K = KINDS[kit.type];
      for (let i = 0; i < kit.count; i++) {
        const tpl = buildClusterTemplate(K.r, K.sp, K.d);
        const r = kit.ring[0] + Math.random() * (kit.ring[1] - kit.ring[0]);
        const a = Math.random() * Math.PI * 2;
        const laneA = Math.random() * Math.PI;   // dùng chung cho cả bốn — xem carveForestLanes
        for (let q = 0; q < homes.length; q++) {
          const p = mirroredKitSpot(homes[q], q, a, r, K.r);
          stampClusterTemplate(p.x, p.y, tpl, p.sx, p.sy, K.put);
          if (kit.type === 'wood') {
            forestCenters.push({ x: p.x, y: p.y, sx: p.sx, sy: p.sy, laneA });
          }
          used[kit.type]++;
        }
      }
    }
  }

  // ---- Tầng 2: phần còn lại chia ĐỀU cho bốn góc phần tư ----
  //
  // Phần dư (số cụm không chia hết cho 4) bắt đầu từ một góc BỐC NGẪU NHIÊN chứ
  // không phải luôn từ góc 0. Không có dòng đó thì mọi kỷ nguyên, mọi loại tài
  // nguyên, bộ lạc slot 0 đều được cụm lẻ — một thiên vị nhỏ nhưng CÓ HỆ THỐNG,
  // và thiên vị có hệ thống thì tích lại qua các kỷ nguyên thành một tín hiệu giả
  // trong chính cái vòng chọn lọc policy mà cả trò chơi này dùng để kể chuyện.
  // Cụm ngẫu nhiên phải nằm NGOÀI sân nhà của mọi bộ lạc — xem MAP.FAIR.EXCLUSIVE_R.
  // Cộng bán kính cụm vào khoảng cách cấm: xét mỗi tâm cụm thì một cụm rừng bán
  // kính 9 đặt tâm ở 31 ô vẫn thò 8 ô vào trong vùng lẽ ra phải thuần bộ khởi đầu.
  const keepOut = (type, x, y) => {
    if (!homes || !homes.length) return false;
    const R = (M.FAIR.EXCLUSIVE_R || 0) + KINDS[type].r;
    for (const h of homes) if (dist(h.x, h.y, x, y) < R) return true;
    return false;
  };
  for (const type in KINDS) {
    const rest = Math.max(0, KINDS[type].n - used[type]);
    const base = Math.floor(rest / 4), extra = rest % 4;
    const offset = Math.floor(Math.random() * 4);
    for (let q = 0; q < 4; q++) {
      const count = base + (((q - offset + 4) % 4) < extra ? 1 : 0);
      for (let i = 0; i < count; i++) {
        // Bốc lại tối đa 40 lần rồi CHỊU THUA và đặt luôn, chứ không bỏ cụm. Bỏ cụm
        // thì số cụm thật ít hơn số đã khai trong CONFIG mà không có lỗi nào để lần
        // theo — đúng dạng hỏng lặng lẽ đã cắn ở spawnLairs, nơi trần thử 4000 lần
        // hết hạn và bản đồ nhận ít hang hơn khai báo mà không ai biết.
        let p = null;
        for (let k = 0; k < 40; k++) {
          p = quadrantPoint(q, KINDS[type].r);
          if (!keepOut(type, p.x, p.y)) break;
        }
        drop(type, p.x, p.y);
      }
    }
  }

  carveForestLanes(forestCenters, homes);
}

// Dọn quang một vùng để đặt nhà chính: chặt cây. Bản cũ còn phải RÚT CẠN NƯỚC ở
// đây — không phải cho đẹp mà vì noise hoàn toàn có thể đặt điểm xuất phát của
// một bộ lạc xuống giữa hồ và họ chết ngay khi lập quốc. Địa hình hết chặn thì
// cả nỗi lo đó biến mất: đầm cạn dựng nhà được như mọi ô khác.
// Dọn quang MỌI loại tài nguyên, không chỉ cây.
//
// Trước Phase 3.25 hàm này chỉ chặt cây, vì cây là thứ duy nhất chặn ĐƯỜNG ĐI và
// chỗ trống để đi lại là tất cả những gì kinh đô cần. Từ khi ô tài nguyên chặn cả
// CHỖ XÂY (xem findBuildSpot), câu hỏi đổi hẳn: một kinh đô đặt giữa vạt quả mật
// độ 88% sẽ không tìm nổi chỗ cho cái nhà thứ hai, dù đi lại vẫn thoải mái.
//
// Xoá hẳn chứ không chuyển đi: tài nguyên trong bán kính này coi như đã bị san ủi
// lúc lập quốc. Đó cũng là lý do vành đai bộ khởi đầu phải nằm NGOÀI bán kính này
// (xem MAP.FAIR.KIT) — nếu không thì chính hàm này ăn mất phần vừa bảo đảm.
function clearArea(cx, cy, radius) {
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (!inBounds(x, y) || dist(x, y, cx, cy) > radius) continue;
      const c = resourceCells.get(cellKey(x, y));
      if (c) removeResource(c);
    }
  }
}

// CHỈ CHẶT CÂY trong một vùng tròn — anh em với clearArea ở trên nhưng trả lời
// một câu hỏi khác hẳn, và đó là lý do nó là hàm riêng chứ không phải một tham số
// của clearArea.
//   · clearArea = "san ủi chỗ này để DỰNG NHÀ" -> phải xoá mọi thứ, kể cả quặng,
//     vì tài nguyên cũng chặn chỗ xây (xem findBuildSpot).
//   · clearTrees = "mở đường ĐI QUA chỗ này" -> chỉ xoá thứ thật sự chặn đường,
//     mà từ Phase 3.15 thì thứ đó chỉ còn đúng một loại: cây.
// Gộp hai việc vào một hàm thì vành quặng canh hang (CONFIG.MONSTER.LODE) sẽ bị
// chính hàm dọn đường ăn mất — cùng cái bẫy "một hàm mang hai nghĩa" đã phải tách
// ra ở `medics` -> `infirmaries`/`healers`.
// Trả về số ô đã gỡ, để chỗ gọi ĐO ĐƯỢC nó có làm gì không thay vì phải tin.
function clearTrees(cx, cy, radius) {
  let n = 0;
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (!inBounds(x, y) || dist(x, y, cx, cy) > radius) continue;
      const c = resourceCells.get(cellKey(x, y));
      if (c && c.type === 'wood') { removeResource(c); n++; }
    }
  }
  return n;
}

// Rải một cụm tài nguyên rời, dùng lại đúng bộ tham số của bản đồ chính. Tách ra
// vì mỏ canh hang (xem spawnLairLodes) cần đúng cùng hình dạng cụm với mỏ thường —
// nếu tự viết một vòng rải thứ hai thì hai loại mỏ sẽ lệch dần nhau từ lần chỉnh
// tham số đầu tiên, và người xem sẽ đọc ra "mỏ ở đây trông khác" mà không hiểu vì sao.
function scatterResourceCluster(type, cx, cy, richMult, radiusMult) {
  const M = CONFIG.MAP;
  const mult = richMult || 1;
  const SPEC = {
    wood:  [M.FOREST_RADIUS, M.TREE_SPACING, M.TREE_DENSITY, M.WOOD_PER_TREE],
    food:  [M.BERRY_RADIUS, 1, M.BERRY_DENSITY, M.FOOD_PER_BERRY],
    gold:  [M.GOLD_RADIUS, 1, M.GOLD_DENSITY, M.GOLD_PER_ORE],
    stone: [M.STONE_RADIUS, 1, M.STONE_DENSITY, M.STONE_PER_ROCK]
  }[type];
  if (!SPEC) return;
  const [r0, sp, d, amount] = SPEC;
  const r = Math.max(1, r0 * (radiusMult || 1));
  // Trả về SỐ Ô THẬT SỰ ĐẶT ĐƯỢC, không phải void. `addResource` từ chối ô đã có
  // chủ và ô ngoài biên, còn `scatterCluster` thì bốc từng ô theo xác suất — nên
  // một cụm hoàn toàn có thể ra 0 ô mà không ai biết. Người gọi nào có LỜI HỨA
  // phải giữ (vd "mỗi hang ít nhất một vỉa mỗi loại") cần biết điều đó để thử lại.
  let placed = 0;
  scatterCluster(cx, cy, r, sp, d, (x, y) => {
    if (addResource(x, y, type, Math.round(amount * mult),
        type === 'food' ? { regrow: M.BERRY_REGROW } : undefined)) placed++;
  });
  return placed;
}

