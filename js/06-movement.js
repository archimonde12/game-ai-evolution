'use strict';
// ============================================================
// 06-movement.js
// ------------------------------------------------------------
// Di chuyển: bước né vật cản, flow field BFS (chiến trường/về nhà/thủ thành),
// đội hình 3 hàng, trạm quân y, chỉ mục không gian tìm địch, chọn mục tiêu
// khi công trình bị đánh.
// Tách cơ học từ civilization.html một-file, dòng 3324–3984.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Di chuyển
// ============================================================
// avoidX/avoidY (tuỳ chọn): ô CẤM bước vào lượt này. Bỏ trống thì `nx === undefined`
// luôn false nên mọi lời gọi cũ giữ nguyên hành vi — xem moveToward để biết vì sao cần.
function tryStep(u, dx, dy, avoidX, avoidY) {
  const attempts = [[dx, dy], [dx, 0], [0, dy]];
  for (const [adx, ady] of attempts) {
    if (adx === 0 && ady === 0) continue;
    const nx = clamp(u.x + adx, 0, CONFIG.GRID_WIDTH - 1);
    const ny = clamp(u.y + ady, 0, CONFIG.GRID_HEIGHT - 1);
    if (nx === avoidX && ny === avoidY) continue;
    // `u.fly === true` là toàn bộ chi phí của cơ chế bay trên đường đi nóng nhất
    // của cả file. blockedCells = cây + NƯỚC, nên một dòng này cho loài bay đi
    // xuyên rừng và vượt hồ mà không cần một hệ thống đường đi thứ hai.
    if ((nx !== u.x || ny !== u.y) && (u.fly === true || !isBlocked(nx, ny))) {
      u.x = nx; u.y = ny; u.facingX = adx; u.facingY = ady;
      return true;
    }
  }
  return false;
}

// Pathfinding tham lam (không A*): đi thẳng về đích, bị chặn thì thử lệch 90°
// để "men theo" mép rừng. Không tối ưu nhưng đủ tốt vì rừng là cụm rời rạc chứ
// không phải mê cung kín — và rẻ hơn A* rất nhiều ở 240 quân x 60 tick/frame.
// TỰ HUỶ BƯỚC CỦA CHÍNH MÌNH — lỗi tìm ra 2026-07-23 từ phản hồi "anh hùng hay lính
// hay bị kẹt ở góc". Đo 7.000 tick: 422 lần một đơn vị gọi hàm này mà đứng nguyên tại
// chỗ, trong đó **412 lần (98%) là bước sang ngang rồi bước ngược về đúng ô cũ NGAY
// TRONG CÙNG MỘT LẦN GỌI**, và 413/422 rơi vào `speed = 2` — tức gần như chỉ anh hùng.
//
// Cơ chế: vòng lặp chạy `u.speed` bước, mỗi bước tự quyết một cách độc lập. Gặp bờ
// nước thì bước 1 dùng nhánh dự phòng "men theo mép" và đi ngang. Sang bước 2, hướng
// tham lam được tính lại từ vị trí MỚI — và nó chỉ thẳng về đúng ô vừa rời đi, vì ô
// đó gần đích hơn. Đơn vị speed 1 không bao giờ gặp: nó chỉ đi một bước mỗi tick nên
// cú bước ngang được GIỮ LẠI và tick sau nó trượt tiếp dọc bờ. Đơn vị speed 2 thì tự
// xoá cú bước ngang của mình, mỗi lần, mãi mãi. Mẫu đo được đúng như thế:
// `290,92 -> 290,91 -> 290,92`, lặp lại tới khi hết kỷ nguyên.
//
// Sửa: cấm quay lại ô vừa rời TRONG CÙNG lần gọi. Cú bước ngang được giữ, và anh hùng
// trượt dọc bờ nước y như lính — chỉ nhanh gấp đôi, đúng như tốc độ của họ đáng lẽ phải thế.
//
// Đây KHÔNG phải chuyện chỉ của anh hùng: bất kỳ ai được ban phước tăng tốc hay mang
// giày, và mọi loài quái speedMult > 1 (sói 1,5 · nhện 1,75 · phi long 1,8) đều dính
// cùng lỗi này. Nó chỉ chưa lộ ra vì quái có dây xích kéo chúng về hang.
// MEN THEO MỘT PHÍA (wall-following có trí nhớ) — nửa còn lại của lỗi "kẹt ở góc".
//
// Bản trước, khi bước thẳng bị chặn thì LUÔN thử rẽ trái (-dy,dx) trước rồi mới
// rẽ phải. Ở một góc lõm hình chữ V, đơn vị rẽ trái để thoát mép này rồi tick sau
// hướng thẳng lại đổi và nó rẽ phải để thoát mép kia — lắc qua lắc lại quanh đáy
// chữ V mà không bao giờ vòng ra. Cách sửa của mọi thuật men-tường: NHỚ chiều rẽ
// (`u.wallSide`) và giữ nguyên chiều đó cho tới khi lại đi thẳng được. Nhờ vậy đơn
// vị men dọc HẲN một phía bờ nước/rừng thay vì dao động tại chỗ. Đi thẳng được một
// bước là quên mép đang men (wallSide=0) để chướng ngại sau chọn phía mới từ đầu.
function moveToward(u, tx, ty) {
  let px = -1, py = -1;                       // ô vừa rời khỏi, chỉ tính trong lần gọi này
  for (let i = 0; i < u.speed; i++) {
    if (u.x === tx && u.y === ty) break;
    const ox = u.x, oy = u.y;
    const dx = Math.sign(tx - u.x), dy = Math.sign(ty - u.y);
    if (tryStep(u, dx, dy, px, py)) {
      u.wallSide = 0;                          // thẳng được -> hết men tường
    } else {
      // side=+1 ưu tiên rẽ trái, -1 ưu tiên rẽ phải. Giữ chiều của lần kẹt trước.
      const side = u.wallSide || 1;
      if (tryStep(u, -dy * side, dx * side, px, py)) u.wallSide = side;
      else if (tryStep(u, dy * side, -dx * side, px, py)) u.wallSide = -side;
    }
    // Bước này hỏng hoàn toàn -> mọi thứ quyết định bước sau (vị trí, đích, bản đồ,
    // ô cấm) đều y hệt, nên nó chắc chắn hỏng y như vậy. Dừng luôn cho đỡ phí.
    if (u.x === ox && u.y === oy) break;
    px = ox; py = oy;
  }
}

// "Có tiến được không" đo theo KỶ LỤC — khoảng cách GẦN NHẤT từng đạt tới mục
// tiêu này — chứ không theo tick liền trước.
//
// Bản cũ (bốn chỗ, y hệt nhau) so với tick trước:
//     const before = dist(...); moveToward(...);
//     if (dist(...) >= before - 0.01) u.stuck++; else u.stuck = 0;
//     if (u.stuck > 25) { ...bỏ mục tiêu... }
// và nhánh bỏ mục tiêu đó là MÃ CHẾT trong đúng cái trường hợp nó sinh ra để xử
// lý. Một đơn vị dao động giữa hai ô thì bước lùi làm stuck++, bước tiến lấy lại
// đúng khoảng vừa mất nên stuck=0 — chuỗi đọc được là 1,0,1,0,1,0... mãi mãi,
// không bao giờ chạm ngưỡng. Đo thật (2026-07-25): một tiều phu đứng cách cây
// mục tiêu 2 ô với một cây KHÁC chắn đúng giữa, nhảy (86,168)<->(87,168) vô hạn,
// 15/65 đơn vị trong một kỷ nguyên ở tình trạng "bước mỗi tick, dịch chuyển ròng
// bằng 0". Đây là thứ người xem thấy và gọi là "kẹt".
//
// Kỷ lục thì không lùi được. Chỉ khi đơn vị tới GẦN HƠN BAO GIỜ HẾT mới tính là
// có tiến, nên mọi vòng lặp kín — 2 ô, 3 ô, hay men cả một mép rừng rồi quay về
// — đều đếm đều tới ngưỡng và cơ chế bỏ cuộc chạy thật.
//
// `key` là DANH TÍNH mục tiêu. Đổi mục tiêu thì kỷ lục cũ vô nghĩa, phải xoá —
// nếu không, một đơn vị vừa đuổi hụt kẻ địch ở xa sẽ mang kỷ lục cũ sang mục tiêu
// mới và bỏ cuộc gần như ngay lập tức.
function noProgress(u, key, d, limit) {
  if (u.progKey !== key) { u.progKey = key; u.progBest = d; u.stuck = 0; return false; }
  if (d < u.progBest - 0.01) { u.progBest = d; u.stuck = 0; return false; }
  return ++u.stuck > limit;
}

// ------------------------------------------------------------
// Flow field cho quân chinh phạt
// ------------------------------------------------------------
// Đi tham lam đủ dùng khi vật cản chỉ là cây rải rác, nhưng KHÔNG đủ khi bản đồ
// có hồ lớn: bờ hồ lõm biến thành cái bẫy, quân ép mặt vào đó vĩnh viễn. Đo thật:
// từ tick 10000 trở đi cả ba bộ lạc đang tuyên chiến đứng im, 10.000 tick không
// thêm một mạng nào — cuộc chiến chết lặng chứ không phải kết thúc.
//
// Cách sửa đúng của thể loại RTS: không cho mỗi lính tự tìm đường, mà tính MỘT
// bản đồ khoảng cách BFS từ toàn bộ công trình của kẻ địch, rồi mọi lính chỉ
// việc bước xuống ô có số nhỏ hơn. Một lần BFS dùng chung cho cả đạo quân, và
// vì nó là BFS thật nên đường vòng quanh hồ luôn được tìm ra nếu có tồn tại.
//
// CẬP NHẬT: hồ đã bị bỏ khỏi bản đồ (địa hình không còn chặn ai), nên cái bẫy
// nguyên bản mô tả ở trên không còn tồn tại. Flow field VẪN GIỮ, và giữ có lý do:
// vật cản còn lại là RỪNG, và một dải rừng rậm cũng đủ tạo túi lõm cỡ nhỏ — chỉ
// khác là bây giờ túi ấy chặt được nên nó tự tan sau vài trăm tick thay vì tồn
// tại vĩnh viễn. Nói cách khác: bỏ nước hạ hậu quả của "kẹt" từ VĨNH VIỄN xuống
// TẠM THỜI; flow field là thứ hạ tần suất. Mọi ghi chú nhắc tới "hồ" bên dưới
// đọc như lịch sử — chúng giải thích vì sao đoạn mã này ra đời, không phải bản
// đồ hôm nay trông thế nào.
const WAR_FIELD_REFRESH = 300;
const HOME_FIELD_REFRESH = 400;
// Ngắn hơn hai cái kia rất nhiều: báo động phòng thủ là chuyện KHẨN, và toà nhà
// được gieo mầm có thể sập bất cứ lúc nào — một trường cũ dẫn cả đạo quân tới một
// đống đổ nát thì tệ hơn là không có trường nào.
const DEFEND_FIELD_REFRESH = 200;

function bfsFieldFromBuildings(filterFn) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  const field = new Int32Array(W * H).fill(-1);
  const queue = [];
  for (const b of buildings) {
    if (!filterFn(b)) continue;
    const r = b.size;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const x = b.x + dx, y = b.y + dy;
        if (!inBounds(x, y) || isBlocked(x, y)) continue;
        const i = y * W + x;
        if (field[i] === -1) { field[i] = 0; queue.push(i); }
      }
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % W, y = (i - x) / W;
    const nd = field[i] + 1;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (field[j] !== -1 || blockedCells.has(nx + ',' + ny)) continue;
        field[j] = nd;
        queue.push(j);
      }
    }
  }
  return field;
}

function computeWarField(tribe) {
  // Khi mục tiêu đang có Kỳ quan đếm ngược, trường tiến quân gieo mầm CHỈ TỪ KỲ
  // QUAN thay vì từ mọi công trình của họ.
  //
  // Không phải để "đi thẳng vào mục tiêu quan trọng" — mà vì luật cũ dẫn quân tới
  // công trình GẦN NHẤT, nên ba đạo quân đến từ ba hướng sẽ dừng lại gặm ba cụm
  // nhà ở rìa, mỗi bên một góc, trong khi đồng hồ vẫn chạy. Hệ quả không phải là
  // "hơi chậm", mà là cơ chế Kỳ quan chưa từng có cơ hội bị chặn. Gieo mầm từ một
  // điểm biến ba mũi tiến công rời rạc thành một trận hội chiến ở đúng chỗ đáng xem.
  const wonderSiege = wonderWatch && wonderWatch.tribeId === tribe.warTarget;
  tribe.warField = wonderSiege
    ? bfsFieldFromBuildings(b => b.id === wonderWatch.buildingId && b.hp > 0)
    : bfsFieldFromBuildings(b => b.tribeId === tribe.warTarget && b.hp > 0);
  tribe.warFieldTick = tick;
  tribe.warFieldTarget = tribe.warTarget;
  tribe.warFieldWonder = !!wonderSiege;
}

// Bản đồ khoảng cách từ chính nhà mình. Dùng cho HAI việc:
//  1. Lọc mục tiêu thu hoạch: chỉ nhắm những mỏ THẬT SỰ đi bộ tới được. Không có
//     bước lọc này, dân cứ nhắm bụi quả gần nhất theo đường chim bay — kể cả khi
//     nó nằm bên kia hồ — đi tới bờ, kẹt, chọn lại, và chọn đúng cái cũ. Vòng lặp
//     đó làm cả nền kinh tế đứng hình: đo thật, không bộ lạc nào lên nổi thời đại 2.
//  2. Đường về kho: đi xuống theo trường là đường ngắn nhất thật sự, vòng được hồ.
function computeHomeField(tribe) {
  tribe.homeField = bfsFieldFromBuildings(b => b.tribeId === tribe.id && b.hp > 0 && b.done);
  tribe.homeFieldTick = tick;
}

// Ô tài nguyên coi là tới được nếu chính nó hoặc một ô kề nó nằm trong trường
// (bản thân ô cây là ô chặn, nên không bao giờ có mặt trong trường).
function reachableIn(field, x, y) {
  if (!field) return true;
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  if (field[y * W + x] >= 0) return true;
  if (x > 0 && field[y * W + x - 1] >= 0) return true;
  if (x < W - 1 && field[y * W + x + 1] >= 0) return true;
  if (y > 0 && field[(y - 1) * W + x] >= 0) return true;
  if (y < H - 1 && field[(y + 1) * W + x] >= 0) return true;
  return false;
}

// Bước xuống ô có khoảng cách nhỏ hơn. Trả về false nếu đang đứng ở chỗ không
// nối được tới địch (khi đó gọi lại cách đi tham lam để ít nhất còn nhúc nhích).
function stepDownField(u, field) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  let moved = false;
  for (let step = 0; step < u.speed; step++) {
    const here = field[u.y * W + u.x];
    if (here < 0) return moved;
    if (here === 0) return true;
    let bx = -1, by = -1, bv = here;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = u.x + dx, ny = u.y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const v = field[ny * W + nx];
        if (v >= 0 && v < bv) { bv = v; bx = nx; by = ny; }
      }
    }
    if (bx < 0) return moved;
    u.facingX = Math.sign(bx - u.x); u.facingY = Math.sign(by - u.y);
    u.x = bx; u.y = by;
    moved = true;
  }
  return moved;
}

// Về nhà / về điểm tập kết bằng TRƯỜNG KHOẢNG CÁCH, không đi tham lam.
//
// Điểm tập kết nằm ngay dưới kinh đô (xem startEra), mà `homeField` là BFS từ
// chính các công trình của bộ lạc — nên đi xuống theo trường là đi về đúng chỗ đó
// bằng một ĐƯỜNG ĐI THẬT, vòng được rừng. Đi tham lam thì không.
//
// Đo thật 2026-07-25: BA cung thủ cùng đứng dao động (166,177)<->(166,176) suốt
// 800/800 tick, vì điểm tập kết cách 98 ô về phía đông và giữa đường có một dải
// rừng. Cả ba đều `combatTarget = null`, `stuck = 0` — không một cơ chế bỏ cuộc
// nào chạm tới được, bởi ở đây chẳng có mục tiêu nào để mà bỏ. Đây chính là lệnh
// moveToward CUỐI CÙNG trong mã lính còn chạy trần: mọi lối đi xa khác đã có
// trường dẫn đường (hành quân, về kho) hoặc có đường bỏ cuộc (truy đuổi, tìm mỏ,
// nhặt đồ), nên mọi ca kẹt còn sót lại đều dồn hết về đúng nhánh này.
//
// Còn gần nhà (fv <= 3) thì vẫn đi tham lam: mấy bước cuối là sân nhà trống, và
// trường ở đó đã bằng 0 nên không còn dốc để tụt xuống nữa.
// ============================================================
// NHÀ Y TẾ — tìm về, và hồi máu
// ============================================================
// `tribe.medics` được dựng lại mỗi lần bộ não chạy (computeTribeStats), nên hai
// hàm dưới đây chỉ duyệt một mảng 0-3 phần tử chứ không quét toàn bộ `buildings`
// — chúng nằm trên đường đi nóng, gọi cho mỗi người lính rảnh mỗi tick.
function nearestMedic(u, tribe) {
  let best = null, bestD = Infinity;
  for (const b of tribe.medics) {
    const d = dist(u.x, u.y, b.x, b.y);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// Hồi máu nếu đang đứng trong bán kính một trạm xá VÀ quanh đó sạch địch.
function healAtMedic(u, tribe) {
  if (u.hp >= u.maxHp || !tribe.medics.length) return false;
  const M = CONFIG.MEDIC;
  const m = nearestMedic(u, tribe);
  if (!m || dist(u.x, u.y, m.x, m.y) > M.RANGE + m.size) return false;
  if (findNearestEnemyUnit(u.x, u.y, u.tribeId, M.SAFE_R)) return false;
  u.hp = Math.min(u.maxHp, u.hp + M.RATE);
  return true;
}

// Kiệt sức -> bỏ trận về trạm xá. Trả về true nếu tick này đã dành cho việc đó.
//
// Cờ `u.mending` là thứ giữ cho quyết định này DÍNH: không có nó, một người lính
// hồi lên đúng 45% máu sẽ lập tức quay lại trận, ăn một đòn, rồi lại quay đầu —
// cùng họ với lỗi rung đã bắt ở hang ổ lên/xuống cấp. Cờ chỉ tắt ở LEAVE_HP (90%).
function seekMedic(u, tribe) {
  const M = CONFIG.MEDIC;
  if (!tribe.medics.length) { u.mending = false; return false; }
  const frac = u.hp / u.maxHp;
  if (u.mending) { if (frac >= M.LEAVE_HP) { u.mending = false; return false; } }
  else if (frac < M.SEEK_HP) u.mending = true;
  else return false;

  const m = nearestMedic(u, tribe);
  if (!m) { u.mending = false; return false; }
  if (dist(u.x, u.y, m.x, m.y) > M.RANGE) walkHome(u, tribe, m.x, m.y);
  else healAtMedic(u, tribe);
  return true;
}

// ============================================================
// ĐỘI HÌNH — quân đi thành khối, không phải bốn chục cá thể cùng hướng
// ============================================================
// Trước Phase 3.17, "đạo quân" là một từ không có thật trong mô phỏng này: mỗi
// người lính tự bước xuống flow field với tốc độ của riêng mình, nên kẻ ở gần
// tiền tuyến nhất tới nơi trước cả trăm tick và chết một mình, rồi kẻ tiếp theo
// tới và chết một mình. Một trận "công thành" thật ra là hai chục trận tay đôi
// rải dọc đường hành quân. Kỵ binh 1,7 ô/tick còn làm nó tệ hơn hẳn: giờ có một
// loại quân bỏ xa phần còn lại theo đúng nghĩa đen.
//
// HÀNG NGŨ ĐO BẰNG GIÁ TRỊ TRƯỜNG, KHÔNG BẰNG KHOẢNG CÁCH — đây là chi tiết
// quyết định cả cơ chế có chạy được hay không. Cách hiển nhiên là "ai cách trọng
// tâm quá xa thì quay lại", nhưng trọng tâm là một điểm hình học có thể rơi vào
// giữa rừng, và tệ hơn: hai nửa đạo quân đi vòng hai bên một khu rừng thì trọng
// tâm nằm giữa RỪNG, và cả hai nửa cùng quay đầu đâm vào cây. Giá trị flow field
// thì đo bằng SỐ BƯỚC CÒN LẠI tới đích, nên nó là "ai đang dẫn trước" theo đúng
// nghĩa hành quân, và nó không bao giờ trỏ vào chỗ không đi được.
//
// Và ngưỡng lấy theo TRUNG VỊ của cả đạo quân, nên không thể tắc: chỉ kẻ ĐI
// TRƯỚC trung vị mới phải chờ, kẻ đi sau luôn được đi tiếp — mà kẻ đi sau tiến
// lên thì trung vị cũng tiến theo, và người đang chờ lại được đi. Nếu lấy ngưỡng
// theo người dẫn đầu thì cả đạo quân đứng chờ đúng một người và không ai nhúc nhích.
function computeArmyLine(tribe) {
  const field = tribe.warField;
  if (!field) { tribe.armyLine = -1; return; }
  const W = CONFIG.GRID_WIDTH;
  const vals = [];
  for (const u of units) {
    if (u.tribeId !== tribe.id || u.hp <= 0 || !isMilitary(u.type)) continue;
    const fv = field[u.y * W + u.x];
    if (fv > 0) vals.push(fv);
  }
  if (vals.length < 3) { tribe.armyLine = -1; return; }   // vài người thì không có "hàng ngũ" nào để giữ
  vals.sort((a, b) => a - b);
  tribe.armyLine = vals[Math.floor(vals.length / 2)];
}

// Lớp trong đội hình: 0 = tiền quân (chịu đòn), 1 = tuyến bắn, 2 = công thành.
// Đây là toàn bộ "chiến thuật" của bản này và nó cố tình chỉ có ba số: thứ tạo ra
// đội hình hai lớp ở Phase 3.6 không phải là một lệnh dàn trận mà là TẦM BẮN —
// bảng này chỉ nói rõ ra cái vốn đã đúng, để lúc ĐỨNG CHỜ chúng cũng đứng đúng chỗ.
const ORDER_ROW = { soldier: 0, knight: 0, hero: 0, archer: 1, horsearcher: 1, catapult: 2 };

// Hành quân theo đội hình. Trả về true nếu đã tự lo xong việc di chuyển tick này.
function marchWithFormation(u, tribe) {
  const field = tribe.warField;
  const W = CONFIG.GRID_WIDTH;
  const fv = field[u.y * W + u.x];
  if (fv <= 2) return false;                       // tới nơi rồi -> nhường cho luật chọn mục tiêu

  const line = tribe.armyLine;
  if (line > 0) {
    // Được phép dẫn trước bao nhiêu BƯỚC so với trung vị. Kỷ luật 1 -> 4 bước
    // (một khối chặt); kỷ luật 0 -> 30 bước, tức là gần như nguyên hành vi cũ.
    const lead = 4 + (1 - tribe.policy.discipline) * 26;
    if (fv < line - lead) {
      // Đi trước quá xa: KHÔNG đứng chôn chân — đứng im giữa đường là một bia
      // đỡ đạn, và nhìn ra màn hình thì nó đọc thành "quân bị treo". Lùi về phía
      // trung vị (tức là ngược dòng flow field) là một hành động đọc được ngay:
      // hàng đầu chững lại chờ hàng sau bắt kịp.
      stepUpField(u, field);
      return true;
    }
  }
  return stepDownField(u, field);
}

// Ngược của stepDownField: bước sang ô có giá trị trường CAO hơn (xa đích hơn).
function stepUpField(u, field) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  const here = field[u.y * W + u.x];
  let bx = -1, by = -1, best = here;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = u.x + dx, ny = u.y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const v = field[ny * W + nx];
      if (v > 0 && v > best && !isBlocked(nx, ny)) { best = v; bx = dx; by = dy; }
    }
  }
  if (bx === -1) return false;
  tryStep(u, bx, by);
  return true;
}

// Chỗ đứng của một đơn vị lúc KHÔNG có gì để đánh.
//
// Bản cũ: `rally + randRange(-6, 6)` mỗi lần gọi — tức là chỗ đứng bốc lại từ đầu
// liên tục, nên đám quân nghỉ ngơi rung lắc tại chỗ vĩnh viễn và trông như một
// đàn ruồi. Bản này neo vào `u.formSlot` (cấp một lần lúc sinh ra, không đổi),
// nên mỗi người có ĐÚNG MỘT chỗ của mình và cả đám đứng yên khi đã vào hàng.
//
// `discipline` điều khiển hai thứ cùng lúc: hàng chặt tới đâu, và có thẳng hàng
// hay không. Ở kỷ luật thấp, độ nhiễu cộng vào lớn tới mức nó trở lại thành một
// đám tụ tập lộn xộn — nhưng là một đám lộn xộn ĐỨNG YÊN, không rung.
function formationSpot(u, tribe) {
  const p = tribe.policy;
  const row = ORDER_ROW[u.type] || 0;
  const perRow = 5 + Math.round(p.discipline * 7);
  const gap = 1 + p.discipline * 1.2;
  const col = (u.formSlot % perRow) - (perRow - 1) / 2;
  const depth = Math.floor(u.formSlot / perRow);
  // Nhiễu tất định theo id: cùng một người luôn ra cùng một lệch, nên chỗ đứng
  // vẫn cố định. Dùng Math.random() ở đây là quay lại đúng lỗi rung của bản cũ.
  const jitter = (1 - p.discipline) * 7;
  const jx = (((u.id * 37) % 100) / 100 - 0.5) * jitter;
  const jy = (((u.id * 61) % 100) / 100 - 0.5) * jitter;
  return {
    x: Math.round(tribe.rally.x + col * gap + jx),
    y: Math.round(tribe.rally.y + (row * 2.4 + depth * gap) + jy)
  };
}

function walkHome(u, tribe, gx, gy) {
  const W = CONFIG.GRID_WIDTH;
  const fv = tribe.homeField ? tribe.homeField[u.y * W + u.x] : -1;
  if (fv > 3 && stepDownField(u, tribe.homeField)) return;
  moveToward(u, gx, gy);
}

function moveAwayFrom(u, tx, ty) {
  const dx = Math.sign(u.x - tx) || (Math.random() < 0.5 ? 1 : -1);
  const dy = Math.sign(u.y - ty) || (Math.random() < 0.5 ? 1 : -1);
  for (let i = 0; i < u.speed; i++) {
    if (!tryStep(u, dx, dy)) tryStep(u, dy, dx);
  }
}

// ============================================================
// Tìm địch (dùng lưới băm dựng lại mỗi tick)
// ============================================================
// Cả tìm-kho-của-mình lẫn tìm-nhà-địch đều duyệt TOÀN BỘ danh sách công trình,
// mỗi quân mỗi tick. Ở cuối kỷ nguyên (~300 quân, ~140 công trình) đó là hàng
// chục nghìn phép so sánh/tick chỉ để lọc ra đúng nhóm của một bộ lạc. Tách sẵn
// theo bộ lạc một lần mỗi tick thì mỗi lượt tìm chỉ còn duyệt ~1/4 danh sách.
function rebuildTribeBuildings() {
  tribeBuildings = [];
  for (let i = 0; i < CONFIG.TRIBE_COUNT; i++) tribeBuildings.push([]);
  for (const b of buildings) if (b.hp > 0) tribeBuildings[b.tribeId].push(b);
}

function rebuildUnitBuckets() {
  unitBuckets.clear();
  for (const u of units) {
    const k = bKey(u.x, u.y);
    let arr = unitBuckets.get(k);
    if (!arr) { arr = []; unitBuckets.set(k, arr); }
    arr.push(u);
  }
}

function findNearestEnemyUnit(x, y, tribeId, range, soldiersOnly) {
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((x - range) / B), x1 = Math.floor((x + range) / B);
  const y0 = Math.floor((y - range) / B), y1 = Math.floor((y + range) / B);
  let best = null, bestD = Infinity;
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o.tribeId === tribeId || o.hp <= 0) continue;
        // soldiersOnly = "kẻ có vũ khí" chứ không phải đúng type 'soldier': dân
        // thường phải bỏ chạy khỏi anh hùng địch nữa, nếu không họ sẽ thản nhiên
        // hái quả bên cạnh người vừa một mình phá sập trại lính của họ.
        if (soldiersOnly && o.type === 'villager') continue;
        const d = dist(x, y, o.x, o.y);
        if (d <= range && d < bestD) { bestD = d; best = o; }
      }
    }
  }
  return best;
}

// Đầu tướng địch là mục tiêu đáng giá nhất chiến trường: lính VÀ tháp canh đều
// ưu tiên anh hùng hơn mọi mục tiêu khác trong tầm.
//
// Không có luật này thì "dũng cảm" gần như miễn phí — đo thật ở bản trước: 29
// trên 37 anh hùng chết vì TUỔI GIÀ chứ không phải vì trận mạc, nên kẻ liều lĩnh
// và kẻ hèn nhát sống thọ xấp xỉ nhau (1077 so với 1287 tick) và chọn lọc cá thể
// gần như không có gì để bám vào. Bị cả chiến trường tập trung đánh thì xông lên
// mới thật sự là một canh bạc — điều kiện cần để đánh đổi trở nên có thật.
// Duyệt heroIndex (nhiều nhất 4 phần tử) chứ KHÔNG duyệt cả mảng units. Bản đầu
// quét toàn bộ units, mà hàm này được gọi 2 lần cho MỖI người lính MỖI tick: đo
// thật là 13.688 lần trong 300 tick, và chi phí tăng theo tích (số lính × số đơn
// vị) — đúng thứ phình nhanh nhất về cuối kỷ nguyên.
let heroIndex = [];
function rebuildHeroIndex() {
  heroIndex.length = 0;
  for (const u of units) if (u.type === 'hero' && u.hp > 0) heroIndex.push(u);
}

function findNearestEnemyHero(x, y, tribeId, range) {
  let best = null, bestD = range;
  for (const o of heroIndex) {
    if (o.tribeId === tribeId || o.hp <= 0) continue;
    const d = dist(x, y, o.x, o.y);
    if (d <= bestD) { bestD = d; best = o; }
  }
  return best;
}

// "Có địch nào mò tới gần nhà không?" — câu hỏi này GIỐNG HỆT nhau với mọi người
// lính cùng một bộ lạc trong cùng một tick, nhưng bản đầu để mỗi người tự hỏi
// lại từ đầu. Trả lời một lần rồi dùng chung cho cả đạo quân.
function homeIntruder(tribe) {
  if (tribe.intruderTick !== tick) {
    tribe.intruderTick = tick;
    tribe.intruderCache = findNearestEnemyUnit(tribe.home.x, tribe.home.y, tribe.id, 26);
  }
  return tribe.intruderCache;
}

// ============================================================
// BÁO ĐỘNG PHÒNG THỦ
// ============================================================
// Danh sách "nhà tôi đang bị đánh" của một bộ lạc. Cùng khuôn với homeIntruder:
// câu hỏi giống hệt nhau với mọi người lính cùng bộ lạc trong cùng một tick, nên
// trả lời một lần rồi dùng chung — nếu không thì đây là một vòng duyệt toàn bộ
// công trình cho mỗi lính mỗi tick, đúng loại chi phí đã làm tụt khung hình ở
// Phase 3.3.
function alarmedBuildings(tribe) {
  if (tribe.alarmTick === tick) return tribe.alarmCache;
  tribe.alarmTick = tick;
  const out = [];
  const mem = CONFIG.DEFENSE.MEMORY;
  for (const b of (tribeBuildings[tribe.id] || [])) {
    if (b.hp <= 0 || tick - b.hitTick > mem) continue;
    out.push(b);
  }
  tribe.alarmCache = out;
  return out;
}

function defenseWeight(b) {
  return CONFIG.DEFENSE.WEIGHT[b.type] ?? CONFIG.DEFENSE.DEFAULT_WEIGHT;
}

// Toà nhà mà ĐƠN VỊ NÀY nên bỏ việc đang làm để về cứu — hoặc null.
//
// Hai luật, và sự khác nhau giữa chúng là toàn bộ nội dung của hàm:
//  · Công trình TRỌNG YẾU (Kỳ quan, kinh đô): bán kính triệu hồi vô hạn. Mất một
//    trong hai là thua kỷ nguyên, nên không có khoảng cách nào đủ xa để đáng
//    tiếp tục việc khác. Đây là thứ mà bản cũ hoàn toàn không có.
//  · Mọi thứ còn lại: bán kính triệu hồi TỈ LỆ với giá trị toà nhà (xem
//    RECALL_PER_WEIGHT). Ruộng kéo được người đứng cách 10 ô, trại lính kéo được
//    người cách 49 — chứ không phải mọi thứ kéo mọi người.
//
// Điểm = trọng số / khoảng cách đã làm mềm. Chia cho (d + 40) chứ không phải d:
// với mẫu số trần, hai toà nhà cách nhau vài ô sẽ cho hai điểm chênh nhau hàng
// chục lần và cả đạo quân đảo mục tiêu mỗi khi kẻ địch dịch sang toà bên cạnh.
function defendPick(u, tribe) {
  const D = CONFIG.DEFENSE;
  const list = alarmedBuildings(tribe);
  if (!list.length) return null;
  let pick = null, pickScore = 0;
  for (const b of list) {
    const w = defenseWeight(b);
    const d = dist(u.x, u.y, b.x, b.y);
    if (w < D.CRITICAL && d > Math.min(D.RECALL_R, w * D.RECALL_PER_WEIGHT)) continue;
    const sc = w / (d + 40);
    if (sc > pickScore) { pickScore = sc; pick = b; }
  }
  return pick;
}

// Toà nhà đáng cứu nhất của CẢ bộ lạc, không phụ thuộc ai đang đứng ở đâu. Chỉ
// dùng để quyết định gieo mầm trường dẫn đường phòng thủ (một BFS cho cả bộ lạc,
// không thể có một cái cho mỗi người lính).
function tribeTopAlarm(tribe) {
  if (tribe.topAlarmTick === tick) return tribe.topAlarmCache;
  tribe.topAlarmTick = tick;
  let best = null, bestW = 0;
  for (const b of alarmedBuildings(tribe)) {
    const w = defenseWeight(b);
    if (w > bestW) { bestW = w; best = b; }
  }
  tribe.topAlarmCache = best;
  return best;
}

// ĐI VỀ CỨU MỘT TOÀ NHÀ CỤ THỂ.
//
// KHÔNG dùng walkHome cho việc này, và lý do là một con lỗi đã đo được: walkHome
// đi xuống `homeField`, mà homeField được gieo mầm từ MỌI công trình của bộ lạc —
// nó dẫn tới cái GẦN NHẤT, không tới cái ta đang muốn cứu. Người lính đứng cách
// nhà kho 4 bước và cách Kỳ quan 41 bước sẽ bị trường kéo về nhà kho; tới nơi thì
// trường = 3, nhánh dự phòng `moveToward` bật lên và đẩy anh ta ra xa lại; bước ra
// thì trường = 4 và trường lại kéo về. Đo thật: cả đạo quân đứng dao động ở đúng
// khoảng cách 41 ô suốt 800 tick trong khi Kỳ quan bị đánh.
//
// Đây là lần thứ TƯ họ lỗi "trường dẫn tới cái gần nhất, mục tiêu lại là một cái
// cụ thể" trong dự án này. Chữa đúng cách là gieo mầm một trường RIÊNG từ đúng
// toà nhà đó — cùng thủ thuật computeWarField đã dùng khi vây Kỳ quan địch.
function marchToDefend(u, tribe, b) {
  if (u.speed <= 0) return;
  if (tribe.defendField && tribe.defendFieldId === b.id) {
    const fv = tribe.defendField[u.y * CONFIG.GRID_WIDTH + u.x];
    if (fv > 0 && stepDownField(u, tribe.defendField)) return;
  }
  // Chưa có trường (báo động vừa bật, bộ não chưa tới nhịp) hoặc toà nhà này không
  // phải cái được gieo mầm: đi tham lam. Chấp nhận được vì mọi báo động KHÔNG trọng
  // yếu đều có bán kính triệu hồi ngắn (<= 49 ô), và vật cản duy nhất còn lại trên
  // bản đồ là rừng — chặt được, nên túi lõm chỉ là tạm thời.
  moveToward(u, b.x, b.y);
}

function findNearestEnemyBuilding(x, y, tribeId, onlyTribe) {
  let best = null, bestD = Infinity;
  const lists = (onlyTribe !== null && onlyTribe !== undefined)
    ? [tribeBuildings[onlyTribe] || []]
    : tribeBuildings.filter((_, i) => i !== tribeId);
  for (const list of lists) {
    for (const b of list) {
      if (b.tribeId === tribeId || b.hp <= 0) continue;
      const d = dist(x, y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
  }
  return best;
}

// KHO GẦN NHẤT — đo tới MÉP toà nhà, không tới TÂM. Trả về cả khoảng cách mép để
// người gọi khỏi phải tính lại (và khỏi tính lại bằng một công thức KHÁC — đó
// đúng là chỗ đã hỏng, xem dưới).
//
// Bản cũ dùng `dist` (đường chim bay tới tâm) rồi người gọi so với
// `DEPOSIT_RANGE + size/2`. Hai công thức, hai hình học khác nhau — và giữa chúng
// có một cái khe mà 56/135 đơn vị rơi vào (đo 2026-07-25, tick 3695):
//
//   * `homeField` gieo mầm 0 cho mọi ô có cheb <= b.size -> vùng 0 là HÌNH VUÔNG.
//   * điều kiện trả hàng là euclid <= 2 + size/2 -> vùng nhận hàng là HÌNH TRÒN.
//
// Bốn góc chéo của hình vuông nằm NGOÀI hình tròn: với kinh đô size 3, ô góc cách
// tâm cheb 3 nhưng euclid 4,24 > ngưỡng 3,5. Người dân đi xuống trường tới đó thì
// `stepDownField` thấy `here === 0` và trả về true MÀ KHÔNG BƯỚC — nên nhánh dự
// phòng `moveToward` không bao giờ chạy — còn điều kiện trả hàng thì vĩnh viễn
// sai. Kết quả: ôm đủ 15 hàng, đứng ngay trong sân nhà mình, bất động tới hết kỷ
// nguyên. Đây là thứ người xem gọi là "dân vẫn bị kẹt".
//
// Ba cơ chế đều "gần đúng" mới ra được lỗi này; sửa đúng chỗ là DÙNG CHUNG MỘT
// HÌNH HỌC với cái đã dựng nên trường. Đo theo mép thì mọi ô có trường = 0 đều
// có edge <= 0, tức luôn trả được hàng — cái khe không còn tồn tại về mặt toán học
// chứ không phải vì đã nới ngưỡng cho rộng ra.
//
// Đo theo mép cũng là thứ CONFIG nói từ đầu: "đứng cách nhà <= 2 ô". Trước đây câu
// đó không đúng — nó đo tới tâm, nên nhà càng to thì càng phải đứng lọt vào trong.
//
// `depotEdge` là khoảng cách tới mép của toà nhà vừa trả về. Biến toàn cục thay vì
// trả về một object: hàm này chạy cho mỗi người dân đang về kho mỗi tick, cấp phát
// một object ở đó là rác sinh ra 60 lần/giây x 100 người.
let depotEdge = Infinity;
function findNearestOwnBuilding(x, y, tribeId) {
  let best = null, bestD = Infinity;
  for (const b of (tribeBuildings[tribeId] || [])) {
    if (!b.done || b.hp <= 0) continue;
    const d = cheb(x, y, b.x, b.y) - b.size;   // <= 0 = đang đứng trên móng
    if (d < bestD) { bestD = d; best = b; }
  }
  depotEdge = bestD;
  return best;
}

