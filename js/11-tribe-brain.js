'use strict';
// ============================================================
// 11-tribe-brain.js
// ------------------------------------------------------------
// Não BỘ LẠC: đọc gen policy để quyết xây gì / nuôi lính tỉ lệ nào / lên đời
// lúc nào, kinh tế mỗi tick, và vòng thờ cúng đổi Đức Tin lấy phép lành.
// Tách cơ học từ civilization.html một-file, dòng 6065–6971.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Bộ não bộ lạc — chạy mỗi CONFIG.BRAIN_INTERVAL tick
// ============================================================
function computeTribeStats(tribe) {
  let villagers = 0, melee = 0, archers = 0, catapults = 0, knights = 0, horsearchers = 0;
  let heroes = 0, popCap = 0, builders = 0;
  const bcount = { town: 0, house: 0, farm: 0, barracks: 0, tower: 0, shrine: 0, workshop: 0, stable: 0, infirmary: 0, temple: 0, wonder: 0 };
  tribe.jobCounts = { food: 0, wood: 0, gold: 0, stone: 0 };
  // Danh sách trạm xá ĐÃ XÂY XONG, dựng lại mỗi nhịp bộ não. Giữ sẵn ở đây thay vì
  // quét `buildings` trong seekMedic: hàm đó chạy cho mỗi người lính rảnh mỗi tick,
  // còn danh sách này thì cả trăm tick mới đổi một lần.
  tribe.medics = [];
  for (const u of units) {
    if (u.tribeId !== tribe.id || u.hp <= 0) continue;
    // Anh hùng PHẢI được tách riêng trước nhánh dân thường: nhánh else vừa đếm
    // dân vừa đọc u.job/u.task, nên nếu để lọt thì anh hùng sẽ bị tính là một
    // người dân đang "rảnh" — và mọi quyết định tuyển quân của bộ não lệch theo.
    // Cùng lý do đó, ba loại quân sự phải được liệt kê TƯỜNG MINH: quên một loại
    // thì nó rơi vào nhánh else và bộ não coi máy bắn đá là một người hái quả.
    if (u.type === 'hero') heroes++;
    else if (u.type === 'soldier') melee++;
    else if (u.type === 'archer') archers++;
    else if (u.type === 'catapult') catapults++;
    else if (u.type === 'knight') knights++;
    else if (u.type === 'horsearcher') horsearchers++;
    else {
      villagers++;
      if (u.task === 'build') builders++;
      else if (u.job) tribe.jobCounts[u.job]++;
    }
  }
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.hp <= 0) continue;
    bcount[b.type]++;
    if (b.done) popCap += CONFIG.BUILD[b.type].pop;
    if (b.done && b.type === 'infirmary') tribe.medics.push(b);
  }
  // `soldiers` giữ nguyên nghĩa CŨ = toàn bộ quân sự, vì hơn chục chỗ trong file
  // đã đọc nó (ngưỡng tuyên chiến, điểm bộ lạc, bảng xếp hạng, cứu hộ...). Ba loại
  // được tách ra thành trường riêng bên cạnh chứ không thay thế nó.
  const soldiers = melee + archers + catapults + knights + horsearchers;
  // Cộng theo TRAINABLE_TYPES thay vì bốn dòng viết tay: bản cũ liệt kê tay đúng
  // bốn loại, nên hai loại kỵ binh mới sẽ không được tính là "đang chiếm suất dân"
  // — và bộ lạc sẽ tuyển vượt trần dân số đúng bằng số ngựa đang trong lò.
  let queued = 0;
  for (const t of TRAINABLE_TYPES) if (t !== 'hero') queued += tribe.trainQueue[t];
  const pop = villagers + soldiers + heroes + queued;
  tribe.stats = {
    villagers, soldiers, melee, archers, catapults, knights, horsearchers,
    cavalry: knights + horsearchers,
    heroes, pop, popCap, builders, bcount,
    // Anh hùng tính bằng ~3 lính khi cân sức mạnh: vừa vì bản thân họ dai/mạnh,
    // vừa vì hào quang chỉ huy nhân sát thương cả đám quân xung quanh.
    // Máy bắn đá tính 14 dù đắt gấp ba người lính: nó phá THÀNH giỏi chứ không
    // thắng được một trận dã chiến, mà `power` là thước đo dùng để quyết có dám
    // tuyên chiến hay không. Cho nó điểm cao là đẩy bộ lạc vào những cuộc chiến
    // mà nó tưởng mình mạnh.
    // Kỵ sĩ 18 và kỵ xạ 17: gần gấp đôi bộ binh, đúng như giá tiền. Cố tình cho
    // chúng điểm CAO — `power` là thước đo dùng để quyết có dám tuyên chiến hay
    // không, nên một bộ lạc vừa nuôi được đội kỵ binh phải TỰ THẤY mình mạnh lên
    // và đi đánh. Nếu để chúng ngang bộ binh thì cả nhánh chuồng ngựa chỉ đổi
    // được cách trận đánh diễn ra, không đổi được việc trận đánh có xảy ra không.
    power: melee * 10 + archers * 9 + catapults * 14 + knights * 18 + horsearchers * 17
         + heroes * 30 + bcount.tower * 12
  };
  tribe.peakPop = Math.max(tribe.peakPop, villagers + soldiers + heroes);
  return tribe.stats;
}

function canAfford(tribe, cost) {
  for (const k in cost) if (tribe.res[k] < cost[k]) return false;
  return true;
}
function pay(tribe, cost) { for (const k in cost) tribe.res[k] -= cost[k]; }

// Tìm chỗ đặt nhà: rải theo vòng xoắn ốc quanh nhà chính, tránh đè cây/đè nhà khác.
function findBuildSpot(tribe, type, biasX, biasY) {
  const spec = CONFIG.BUILD[type];
  const cx = biasX !== undefined ? biasX : tribe.home.x;
  const cy = biasY !== undefined ? biasY : tribe.home.y;
  const maxR = Math.max(10, Math.min(tribe.policy.expansion, 60));
  // Công trình càng to càng khó tìm chỗ: vòng kiểm tra ô trống quét (2·size+1)²,
  // nên Kỳ quan size 5 cần một khoảng đất trống 11x11 KHÔNG có cây, nước hay nhà.
  // Với 90 lượt bốc ngẫu nhiên, một bộ lạc ở giữa rừng có thể trượt liên tục và
  // cả cơ chế Kỳ quan im lặng mà không có lỗi nào để lần theo.
  const tries = spec.size >= 5 ? 320 : 90;
  // QUY HOẠCH — gen `cityPlan` kéo chỗ vừa bốc về ô lưới gần nhất.
  //
  // Trộn tuyến tính giữa điểm ngẫu nhiên và điểm đã bắt lưới, chứ không phải một
  // câu `if (cityPlan > 0.5)`. Lý do là điều kiện để nó TIẾN HOÁ ĐƯỢC: một cái
  // ngưỡng biến gen thành hai trạng thái, và chọn lọc trên hai trạng thái thì
  // gần như không có gradient để leo — mọi giá trị 0,51 và 0,99 cho ra cùng một
  // thành phố. Trộn tuyến tính thì mỗi nấc gen cho một mức thẳng hàng khác nhau,
  // và đường trôi của nó qua các kỷ nguyên mới có gì để đọc.
  //
  // Bước lưới 7 không phải số đẹp mà là số NHỎ NHẤT còn hợp lệ: luật chống chồng
  // nhà đòi khoảng cách >= size(a) + size(b) + 1, mà hai công trình size 3 (trại
  // lính, xưởng thợ, đền...) đứng cạnh nhau là đúng 7. Lưới nhỏ hơn thì mọi ô kề
  // nhau đều bị luật chồng nhà loại, và bộ lạc quy hoạch cao sẽ không xây nổi gì.
  const GRID = 7;
  const plan = tribe.policy.cityPlan;
  for (let attempt = 0; attempt < tries; attempt++) {
    const r = 5 + (attempt / tries) * maxR;
    const a = Math.random() * Math.PI * 2;
    let x = Math.round(cx + Math.cos(a) * r);
    let y = Math.round(cy + Math.sin(a) * r);
    if (plan > 0.01) {
      // Lưới neo ở KINH ĐÔ (tribe.home), không ở `cx/cy`: một số lời gọi truyền
      // bias là chỗ khác (dựng lại nhà chính, tháp quanh nhà), và nếu lưới trôi
      // theo bias thì hai đợt xây sẽ dùng hai lưới lệch nhau — thành phố lại
      // thành một mớ lộn xộn đúng ở bộ lạc quy hoạch chặt nhất.
      const gx = tribe.home.x + Math.round((x - tribe.home.x) / GRID) * GRID;
      const gy = tribe.home.y + Math.round((y - tribe.home.y) / GRID) * GRID;
      x = Math.round(x + (gx - x) * plan);
      y = Math.round(y + (gy - y) * plan);
    }
    if (x < 3 || y < 3 || x >= CONFIG.GRID_WIDTH - 3 || y >= CONFIG.GRID_HEIGHT - 3) continue;
    let ok = true;
    for (let dx = -spec.size; dx <= spec.size && ok; dx++) {
      for (let dy = -spec.size; dy <= spec.size && ok; dy++) {
        if (isBlocked(x + dx, y + dy)) ok = false;
      }
    }
    if (!ok) continue;
    for (const b of buildings) {
      if (b.hp <= 0) continue;
      if (dist(b.x, b.y, x, y) < b.size + spec.size + 1) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  return null;
}

// Cổng thời đại. Đặt ngay tại queueBuild/tuyển quân chứ không chỉ ở chỗ gọi: mọi
// nhánh "phản xạ" trong tribeBrain (gỗ dư -> xây thêm ruộng, mất nhà chính -> dựng
// lại) đều đi qua đây, và một phản xạ vô tình xây được công trình chưa mở khoá sẽ
// làm rỗng toàn bộ ý nghĩa của cây công nghệ mà không báo lỗi ở đâu cả.
function unlockedBuild(tribe, type) { return tribe.age >= (CONFIG.AGE.UNLOCK_BUILD[type] || 1); }
function unlockedUnit(tribe, type) { return tribe.age >= (CONFIG.AGE.UNLOCK_UNIT[type] || 1); }

function queueBuild(tribe, type, biasX, biasY) {
  const spec = CONFIG.BUILD[type];
  if (!unlockedBuild(tribe, type)) return false;
  if (!canAfford(tribe, spec.cost)) return false;
  const spot = findBuildSpot(tribe, type, biasX, biasY);
  if (!spot) return false;
  pay(tribe, spec.cost);
  const b = spawnBuilding(tribe, type, spot.x, spot.y, false);
  assignBuilders(tribe, b);
  return true;
}

// Điều tối đa MAX_BUILDERS dân đang rảnh/đang đi kiếm ăn sang xây.
// Kỳ quan là ngoại lệ có chủ ý: 820 tick chia cho 3 thợ thì công trường đứng đó
// gần như cả nửa kỷ nguyên, đủ lâu để mọi kịch tính nguội hết trước khi bắt đầu.
function assignBuilders(tribe, b) {
  const cap = b.type === 'wonder' ? CONFIG.BUILD.WONDER_BUILDERS : CONFIG.BUILD.MAX_BUILDERS;
  let assigned = 0;
  const pool = units.filter(u => u.tribeId === tribe.id && u.type === 'villager' && u.hp > 0 && u.task !== 'build');
  pool.sort((p, q) => dist(p.x, p.y, b.x, b.y) - dist(q.x, q.y, b.x, b.y));
  for (const u of pool) {
    if (assigned >= cap) break;
    u.task = 'build'; u.buildTarget = b; u.resTarget = null;
    assigned++;
  }
  return assigned;
}

// ------------------------------------------------------------------
// CÔNG TRƯỜNG MỒ CÔI — lỗi tiềm ẩn có sẵn từ lâu, chỉ lộ ra ở Phase 3.16
//
// Thợ được điều ĐÚNG MỘT LẦN, ngay lúc đặt móng. Sau đó có ba đường khiến họ bỏ
// đi mà không ai thay: thấy địch thì `task = 'idle'` để bỏ chạy (tickVillager),
// không tới được móng trong 40 tick thì tự bỏ (noProgress), và nạn đói thì cả bộ
// lạc bị điều sang hái lương. Cả ba đều KHÔNG xoá công trình — nó nằm đó ở 0%,
// vĩnh viễn, và vì `bcount` đếm cả công trình đang xây dở nên bộ não tin rằng
// mình ĐÃ CÓ công trình đó và không bao giờ đặt móng lại.
//
// Trước bản này lỗi gần như vô hình: nhà ở/ruộng dựng dở thì không ai để ý, còn
// trại lính và xưởng thợ được đặt móng rất sớm, lúc bản đồ còn yên. Chuồng ngựa
// mở ở Đồ Sắt — tức là luôn được đặt móng vào lúc quái đã đi cướp và chiến tranh
// đã nổ ra — nên nó ăn trọn cả ba đường bỏ việc. Đo lần đầu: 4/4 bộ lạc có chuồng
// ngựa nằm ở 0% suốt 3.000 tick với 0 thợ, trong khi mỗi bộ lạc có 34-82 dân đang
// rảnh. Không một dòng lỗi nào; chỉ là kỵ binh không bao giờ tồn tại.
//
// Quét một lượt qua units rồi một lượt qua buildings — O(n+m), không phải O(n×m).
// ------------------------------------------------------------------
function rescueOrphanSites(tribe) {
  let sites = null;
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.done || b.hp <= 0) continue;
    (sites || (sites = [])).push(b);
  }
  if (!sites) return;
  const manned = new Set();
  for (const u of units) {
    if (u.tribeId !== tribe.id || u.task !== 'build' || !u.buildTarget) continue;
    manned.add(u.buildTarget.id);
  }
  for (const b of sites) {
    if (manned.has(b.id)) { b.rescues = 0; continue; }   // có thợ trở lại -> xoá sổ đen
    // TRẦN SỐ LẦN CỨU. Không có nó, một công trường THẬT SỰ không tới được (móng
    // nằm sau một dải rừng kín) sẽ hút 3 dân cứ mỗi 20 tick, họ đi được 40 tick
    // rồi bỏ cuộc vì noProgress, rồi lại bị điều đi — một vòng lặp vô hạn ngốn
    // đúng 3 lao động của bộ lạc tới hết kỷ nguyên. Đổi một lỗi "đứng im mãi mãi"
    // lấy một lỗi "chạy vòng mãi mãi" thì không phải là sửa.
    //
    // 5 lượt là đủ rộng cho mọi nguyên nhân TẠM THỜI (chạy giặc, nạn đói, thợ chết
    // giữa đường) — những nguyên nhân chiếm gần hết các ca thật — và đủ hẹp để một
    // móng nhà đặt sai chỗ không thành một khoản thuế vĩnh viễn.
    if ((b.rescues || 0) >= 5) continue;
    if (assignBuilders(tribe, b) > 0) b.rescues = (b.rescues || 0) + 1;
  }
}

function tribeBrain(tribe) {
  const s = computeTribeStats(tribe);

  // ---- Sống còn: mất nhà chính thì ưu tiên tuyệt đối dựng lại ----
  if (s.bcount.town === 0 && s.villagers > 0) {
    const anyVillager = units.find(u => u.tribeId === tribe.id && u.type === 'villager' && u.hp > 0);
    if (anyVillager) {
      tribe.home = { x: anyVillager.x, y: anyVillager.y };
      tribe.rally = { x: anyVillager.x, y: anyVillager.y };
    }
    if (queueBuild(tribe, 'town')) logEvent(`${tribe.name} dựng lại nhà chính ở vùng đất mới`, tribe.color);
  }

  // ---- Xây dựng ----
  const p = tribe.policy;
  // Nhặt lại thợ cho mọi công trường đang bỏ hoang TRƯỚC khi đặt thêm móng mới:
  // đặt sau thì mấy cái móng vừa đặt xong ở dưới sẽ hút hết dân rảnh, và cái
  // công trường cũ vẫn đứng đó thêm một nhịp bộ não nữa.
  rescueOrphanSites(tribe);
  if (s.pop >= s.popCap - p.houseBuffer && s.popCap < 200) queueBuild(tribe, 'house');
  if (s.bcount.farm < Math.round(p.farmTarget) && s.villagers >= 4) queueBuild(tribe, 'farm');
  // Gỗ dư mà không có gì tiêu -> đổi thành ruộng. Bản đầu có bộ lạc tồn kho gần
  // 5000 gỗ trong khi chết đói: gen chiến lược của họ đặt farmTarget thấp, và
  // không có luật nào cho phép vượt qua chính gen đó. Đây là "phản xạ" nằm ngoài
  // gen — mọi bộ lạc đều biết, giữ cho một gen tồi không tự sát ngay lập tức.
  if (tribe.res.wood > 700 && s.bcount.farm < Math.round(p.farmTarget) * 2 + 3 && s.villagers >= 4) {
    queueBuild(tribe, 'farm');
  }
  if (s.bcount.barracks === 0 && s.villagers >= 8 && p.militaryRatio > 0.08) queueBuild(tribe, 'barracks');
  if (s.bcount.tower < Math.round(p.towerTarget) && s.bcount.barracks > 0) {
    queueBuild(tribe, 'tower', tribe.home.x, tribe.home.y);
  }
  // Xưởng thợ: chỉ xây nếu gen thật sự muốn quân tầm xa. Đây là chỗ cây công nghệ
  // trở thành một LỰA CHỌN chứ không phải một dãy nút bấm theo thứ tự — một bộ lạc
  // rangedRatio thấp sẽ lên tới Hoàng Kim mà vẫn chỉ có bộ binh, và điều đó có thể
  // đúng hoặc sai tuỳ nó gặp ai.
  if (s.bcount.workshop === 0 && s.bcount.barracks > 0 && p.rangedRatio > 0.12) {
    queueBuild(tribe, 'workshop', tribe.home.x, tribe.home.y);
  }
  // Chuồng ngựa: cùng khuôn với xưởng thợ, nhưng đọc gen KHÁC — `militaryRatio`
  // chứ không phải `rangedRatio`. Đây là chỗ hai công trình quân sự tách đôi cây
  // công nghệ theo hai gen độc lập: một bộ lạc rangedRatio cao mà militaryRatio
  // thấp sẽ có xưởng thợ mà không có ngựa (đội hình mỏng, đứng thủ, bắn xa), còn
  // ngược lại thì có ngựa mà không có cung (đạo quân nặng, đánh nhanh, xông lên).
  // Cùng một cây công nghệ, hai hình dạng quân đội đọc ra được từ ngoài màn hình.
  //
  // Ngưỡng 0,18 cao hơn ngưỡng 0,12 của xưởng thợ vì kỵ binh đắt gấp rưỡi mỗi
  // suất: một bộ lạc chỉ hơi thích quân đội mà xây chuồng ngựa thì sẽ nuôi không
  // nổi thứ nó vừa mở khoá, và cả 160 gỗ + 40 đá + 30 vàng đó là tiền đổ xuống sông.
  //
  // Nhưng KHÔNG cao hơn nữa, và con số này đã phải hạ xuống sau lần đo đầu tiên.
  // Ở ngưỡng 0,22, một kỷ nguyên 9.000 tick chạy hết mà KHÔNG MỘT bộ lạc nào dựng
  // nổi chuồng ngựa — không phải vì gen quá thấp (trung bình khởi tạo là 0,275) mà
  // vì cổng thời đại đã lọc trước: chỉ đúng một bộ lạc chạm tới Đồ Sắt, và bộ lạc
  // ĐÓ tình cờ có militaryRatio thấp. Hai cái cổng nhân với nhau thì xác suất
  // không cộng lại, nó nhân lại — cùng bài học đã rút ra khi Đền thờ bị khoá ở
  // Đồ Sắt và ba trên bốn bộ lạc chưa từng dâng một lễ nào.
  if (s.bcount.stable === 0 && s.bcount.barracks > 0 && p.militaryRatio > 0.18) {
    queueBuild(tribe, 'stable', tribe.home.x, tribe.home.y);
  }
  // Nhà y tế: đọc `discipline` chứ không phải `militaryRatio`, và đó là một liên
  // kết có chủ ý. Trạm xá chỉ đáng tiền khi quân CÓ ĐƯỜNG VỀ — mà một đạo quân
  // kỷ luật cao thì rút lui thành khối và về được thật, còn một đám mạnh ai nấy
  // đi thì thương binh chết dọc đường trước khi tới nơi. Hai cơ chế của cùng một
  // bản vì thế tự bám vào nhau: bộ lạc tiến hoá theo hướng có tổ chức sẽ tự thấy
  // trạm xá đáng xây, bộ lạc hỗn quân thì không — và cả hai đều đúng với chính nó.
  // Xây hai cái khi đã đông quân: một cái ở tiền tuyến là quãng đường về ngắn đi
  // một nửa, mà quãng đường về mới là thứ quyết định thương binh sống hay chết.
  const wantMedics = s.bcount.barracks > 0 && p.discipline > 0.3
    ? (s.soldiers >= 24 ? 2 : 1) : 0;
  if (s.bcount.infirmary < wantMedics) queueBuild(tribe, 'infirmary', tribe.home.x, tribe.home.y);
  // Đền thờ: số lượng do gen THÀNH TÂM quyết định. Ban đầu tôi cố tình KHÔNG cho
  // nó gen, vì đền thờ chưa có đánh đổi nào đáng chọn. Hệ thống tế phẩm đã tạo ra
  // đánh đổi đó: mỗi Đền thờ là một cỗ máy đều đặn đốt lương thực và vàng để đổi
  // lấy thứ chỉ có giá trị NẾU Chúa Tể đáp lời. Giờ thì gen là chính đáng.
  // Nhà cầu nguyện có từ Đồ Đá nên gen `piety` bắt đầu tốn tiền NGAY từ đầu kỷ
  // nguyên — đúng chỗ mà một gen cần trả giá thì mới có gì để chọn lọc.
  const wantShrines = Math.round(p.piety * 4);
  if (s.bcount.shrine < wantShrines && s.villagers >= 5) queueBuild(tribe, 'shrine', tribe.home.x, tribe.home.y);
  const wantTemples = Math.round(p.piety * 2);
  if (s.bcount.temple < wantTemples) queueBuild(tribe, 'temple', tribe.home.x, tribe.home.y);

  // ---- Lên thời đại ----
  // ageRush cao = chịu nhịn (giữ dự trữ thấp cũng vẫn lên); ageRush thấp = chỉ lên
  // khi đã dư dả hẳn. Đây là đánh đổi thật: lên sớm thì quân mạnh hơn nhưng cạn
  // kho ngay lúc dễ bị đánh úp nhất.
  const ageCost = CONFIG.AGE.COST[tribe.age + 1];
  if (ageCost && canAfford(tribe, ageCost)) {
    const cushion = 1 + (1 - p.ageRush) * 1.2;
    // Quét theo KHOÁ CÓ TRONG BẢNG GIÁ, không phải hai dòng food/gold viết tay như
    // bản cũ. Bản cũ bỏ qua gỗ và đá, nên khi bảng giá được bổ sung hai loại đó, bộ
    // lạc sẽ lên thời đại ngay khi vừa đủ tiền — trượt mất toàn bộ ý nghĩa của
    // ageRush với đúng hai tài nguyên khan hiếm nhất.
    let ready = true;
    for (const k in ageCost) if (tribe.res[k] < ageCost[k] * cushion) { ready = false; break; }
    if (ready) {
      pay(tribe, ageCost);
      tribe.age++;
      tribe.ageUpAt.push(tick);
      // Đợt TRÙNG TU: một dải sáng chạy từ kinh đô ra khắp lãnh thổ, quét qua từng
      // mái nhà theo đúng thứ tự xa gần (xem drawAgeUpSweep). Trước bản này việc lên
      // thời đại đổi diện mạo TOÀN BỘ nhà cửa cùng một khung hình, mà không có gì
      // báo rằng nó vừa đổi — người xem chỉ có thể phát hiện bằng cách nhớ được nhà
      // hôm qua trông thế nào, tức là không phát hiện được.
      tribe.ageFlashAt = aTick;
      tribe.ageFlashEnd = aTick + AGE_SWEEP_FRAMES + AGE_SWEEP_SPAN;
      logEvent(`${tribe.name} tiến lên thời đại ${CONFIG.AGE.NAMES[tribe.age]}`, tribe.color, true);
      addHotspot(tribe.home.x, tribe.home.y, 5, `${tribe.name} lên ${CONFIG.AGE.NAMES[tribe.age]}`);
      addFx({ type: 'ageup', x: tribe.home.x, y: tribe.home.y, life: 46, maxLife: 46, color: tribe.color });
      // NGỰA CHIẾN mở ở Đồ Sắt và nó là một con số CỨNG trên cá thể (u.speedMult),
      // không đi qua bảng upBonus, nên không có dòng này thì anh hùng đang sống chỉ
      // lên ngựa ở đời sau — mà "đời sau" có thể là 1.800 tick nữa. Đúng cùng cái
      // bẫy đã bắt được với nhánh Binh thư khi nó còn là nâng cấp (xem applyUpgrade).
      if (tribe.age === CONFIG.HERO.MOUNT_AGE) {
        for (const u of units) {
          if (u.tribeId === tribe.id && u.type === 'hero' && u.hp > 0) recomputeHeroStats(u);
        }
      }
    }
  }

  // ---- Nâng cấp quân sự ----
  // Đặt SAU khối lên thời đại và TRƯỚC khối tuyển quân, và cả hai vị trí đều là
  // quyết định có hậu quả đo được:
  //   · Sau thời đại — thời đại là cổng mở khoá của chính bảng nâng cấp này (nhánh
  //     Giáp trụ đòi Đồ Đồng, Mã thuật và Binh thư đòi Đồ Sắt). Xét nâng cấp trước
  //     thì bộ lạc luôn tiêu sạch kho vào cấp 1 của nhánh rẻ nhất ngay khi vừa đủ
  //     tiền, và không bao giờ tích nổi tiền lên đời — đúng cái bẫy thứ tự đã bắt
  //     được với anh hùng ở khối bên dưới, chỉ là ngược chiều.
  //   · Trước tuyển quân — vì lý do NGƯỢC LẠI với anh hùng: khối tuyển quân ghìm
  //     kho lương sát ngưỡng dự trữ, nên bất cứ thứ gì xếp sau nó đều không bao
  //     giờ tới lượt. Đứng sau ở đây nghĩa là bảng nâng cấp vĩnh viễn toàn số 0.
  //
  // Đệm theo `aggression`: bộ lạc hiếu chiến chỉ cần vừa đủ tiền là nghiên cứu,
  // bộ lạc hiền phải dư gấp rưỡi. Đây là biểu hiện thứ ba của gen đó (sau ngưỡng
  // tuyên chiến và số máy bắn đá) — thêm một biểu hiện cho gen đã có thì tín hiệu
  // chọn lọc lên nó MẠNH hơn, còn thêm gen thứ mười bốn thì tín hiệu loãng ra.
  if (!tribe.research) {
    const cushion = 1 + (1 - p.aggression) * 0.5;
    // Thứ tự ưu tiên đọc CƠ CẤU QUÂN THẬT chứ không theo một danh sách cứng: bộ
    // lạc nào đang cầm cái gì thì rèn cái đó. Một đạo quân toàn bộ binh mà bỏ tiền
    // nâng "Cung nỏ" là tiền chết — mà đây chính là kiểu lãng phí mà một AI đọc
    // danh sách cứng từ trên xuống sẽ mắc ở mọi kỷ nguyên, giống hệt nhau.
    const score = {
      melee:   s.melee + s.knights * 0.6,
      ranged:  s.archers + s.catapults * 0.8 + s.horsearchers * 0.6,
      cavalry: (s.knights + s.horsearchers) * 1.3,
      // Giáp có ích cho mọi loại nên nó luôn nằm trong cuộc đua, nhưng nhân 0,45
      // để không phải lúc nào cũng thắng chỉ nhờ cộng dồn cả đạo quân.
      armor:   s.soldiers * 0.45,
      // Nhánh anh hùng quy đổi MỘT người thành ~14 suất lính, và hệ số cao như vậy
      // là kết quả đo chứ không phải cảm tính. Ở hệ số 8, đo 4 kỷ nguyên:
      // 0/16 bộ lạc nghiên cứu nhánh anh hùng, 0 lần. Lý do là số học chứ không phải
      // ngẫu nhiên — điểm của một nhánh quân là SỐ QUÂN nó buff (melee ~18 với một
      // đạo quân bình thường), nên bất cứ thứ gì quy đổi một cá thể thành dưới
      // mười suất đều thua vĩnh viễn, ở mọi kỷ nguyên, với mọi bộ gen. Một lựa
      // chọn không bao giờ được chọn thì không phải là một lựa chọn.
      //
      // Hệ số cao là ĐÚNG về luật chứ không phải một cái nạng: anh hùng là đơn vị
      // duy nhất trong game mà cái chết của nó khép lại một thế hệ của vòng tiến
      // hoá cấp cá thể — mất một người lính là mất một suất lương, mất anh hùng là
      // mất cả một nhánh dòng dõi và 260 tick chờ người kế nhiệm.
      hero:    s.heroes * 14 * (0.5 + p.piety)
    };
    let bestLine = null, bestScore = 0;
    for (const line of UPGRADE_LINES) {
      if (!upgradeAvailable(tribe, line)) continue;
      // `?? 0.01` chứ không phải `score[line]` trần: thêm một nhánh vào
      // CONFIG.UPGRADE.LINES mà quên khai báo điểm ở bảng trên thì `undefined / n`
      // ra NaN, và `NaN > bestScore` LUÔN false — nhánh đó lặng lẽ không bao giờ
      // được chọn, không lỗi, không dấu vết. Đã sập đúng như vậy với chính nhánh
      // Ngựa chiến ở lần đo đầu (0/16 bộ lạc nghiên cứu nó trong 4 kỷ nguyên), và
      // đây là lần thứ hai NaN im lặng cắn dự án này sau lỗi biên giới lãnh thổ.
      // 0,01 = "gần như không muốn, nhưng vẫn hơn không bao giờ".
      const v = (score[line] ?? 0.01) / (tribe.upgrades[line] + 1);
      if (v > bestScore) { bestScore = v; bestLine = line; }
    }
    if (bestLine) {
      const cost = upgradeCost(bestLine, tribe.upgrades[bestLine] + 1);
      // QUỸ LÊN ĐỜI — phần kho KHÔNG được đụng tới, cân theo gen `ageRush`.
      //
      // Đây là chỗ sửa quan trọng nhất của cả Phase 3.16, và nó được thêm vào SAU
      // khi đo. Bản không có nó chạy 5 kỷ nguyên liền và KHÔNG kỷ nguyên nào chạm
      // tới Hoàng Kim (thời đại cao nhất: 3, 3, 3, 2, 2) — trong khi tổng số cấp
      // nâng cấp mua được lên tới 20. Nguyên nhân thẳng thừng: bảng giá nâng cấp
      // đòi đúng VÀNG và ĐÁ, hai thứ duy nhất gác cửa Hoàng Kim, và bộ não thì cứ
      // 20 tick lại tiêu sạch phần dư. Cơ chế mới lặng lẽ khoá cơ chế cũ — lần thứ
      // TƯ trong dự án này (tín ngưỡng khoá Kỳ quan, quái phá nhà khoá thời đại,
      // trần MAX_ALIVE khoá leo thang sóng, và giờ là nâng cấp khoá thời đại).
      // Hậu quả nặng gấp đôi bình thường vì kỵ xạ nằm sau đúng cái cổng đó: một
      // loại quân vừa được thêm vào mà không kỷ nguyên nào nhìn thấy nó.
      //
      // Nhân với `ageRush` chứ không phải một hằng số, nên nó là một ĐÁNH ĐỔI chứ
      // không phải một cái phanh: bộ lạc vội lên đời giữ quỹ chặt và leo cây công
      // nghệ (mở kỵ binh, kỵ xạ, Kỳ quan); bộ lạc ageRush thấp tiêu thẳng vào
      // nghiên cứu và mạnh hơn NGAY BÂY GIỜ với đúng đám quân nó đang có. Hai
      // đường thắng khác nhau, và gen quyết định đi đường nào.
      const ageCost = CONFIG.AGE.COST[tribe.age + 1];
      let ready = tribe.res.food > CONFIG.ECON.FOOD_RESERVE;
      for (const k in cost) {
        const fund = ageCost && ageCost[k] ? ageCost[k] * p.ageRush : 0;
        if (tribe.res[k] - cost[k] * cushion < fund) { ready = false; break; }
      }
      if (ready) startResearch(tribe, bestLine);
    }
  }

  // ---- Kỳ quan ----
  // Điều kiện khởi công gồm hai vế, và vế thứ hai mới là vế quan trọng: phải CÒN
  // QUÂN. Không có nó, một bộ lạc kiệt quệ vừa thua trận nhưng còn tồn kho sẽ dốc
  // sạch vào một toà nhà không tự vệ được — thành ra Kỳ quan trở thành hành vi của
  // kẻ thua cuộc, đúng ngược lại thứ muốn thấy.
  // Thủ thành không có Kỳ quan: ở đó thước đo là số tick sống sót, một luật thắng
  // tức thì sẽ xoá sạch chính thứ mà chế độ đó sinh ra để đo.
  if (gameMode !== 'defend' && unlockedBuild(tribe, 'wonder') && !tribe.wonderStarted
      && s.bcount.wonder === 0 && s.soldiers >= CONFIG.WAR_MIN_ARMY) {
    const cost = CONFIG.BUILD.wonder.cost;
    // Hệ số đệm 0,8 chứ không phải 1,6: với 1,6 thì một bộ lạc wonderDrive thấp
    // phải tích 2,44 lần giá — mà GỖ thì gần như không bộ lạc nào giữ tới ngần ấy
    // (kho gỗ thực tế dao động quanh 300), nên vế "chưa đủ đệm" trở thành một cánh
    // cửa KHOÁ CỨNG chứ không phải một sự dè dặt. Đo thật: 0 Kỳ quan trong 3 kỷ
    // nguyên, kể cả kỷ nguyên có bộ lạc ngồi trên 4.498 đá ở thời Hoàng Kim.
    const cushion = 1 + (1 - p.wonderDrive) * 0.8;
    let ready = true;
    for (const k in cost) if (tribe.res[k] < cost[k] * cushion) { ready = false; break; }
    if (ready && queueBuild(tribe, 'wonder', tribe.home.x, tribe.home.y)) {
      tribe.wonderStarted = true;
      logEvent(`🏛 ${tribe.name} khởi công KỲ QUAN`, tribe.color, true);
    }
  }

  // ---- Tuyển quân ----
  // Cứu hộ: mất sạch dân thường thì bỏ qua mọi luật dự trữ/giới hạn chỗ ở, dồn
  // hết những gì còn lại để ra bằng được một người — nếu không thì bộ lạc chỉ
  // còn là phế tích chờ luật diệt vong xoá sổ.
  if (s.villagers === 0 && tribe.trainQueue.villager === 0
      && s.bcount.town > 0 && canAfford(tribe, CONFIG.UNIT.VILLAGER.cost)) {
    pay(tribe, CONFIG.UNIT.VILLAGER.cost);
    tribe.trainQueue.villager++;
    logEvent(`${tribe.name} gắng gượng gây dựng lại từ đầu`, tribe.color);
    return;
  }

  // ---- Chiêu mộ anh hùng ----
  // Phải đứng TRƯỚC khối tuyển quân bên dưới. Đo thật ở bản đặt sau: suốt một kỷ
  // nguyên 15.000 tick, BA TRÊN BỐN bộ lạc không sinh nổi một anh hùng nào. Lý do
  // không phải thiếu tài nguyên mà là thứ tự: bộ não tuyển lính/dân bất cứ khi nào
  // lương vượt mức dự trữ, nên kho lương gần như luôn bị ghìm sát ngưỡng đó — kiểm
  // tra sau cùng thì không bao giờ tới lượt. Một bộ lạc lúc đó có 1.645 vàng mà
  // vẫn không có anh hùng, chỉ vì đứng cuối hàng.
  //
  // Ngưỡng lương cũng riêng, thấp hơn FOOD_RESERVE: anh hùng là khoản đầu tư
  // chiến lược mua một lần, không phải chi phí thường xuyên như quân lính.
  //
  // Anh hùng cũng KHÔNG chiếm suất dân số (đứng ngoài khối freePop): giữa kỷ
  // nguyên thì trần nhà ở lúc nào cũng đầy, bắt tranh chỗ với dân là khoá luôn
  // cả tầng tiến hoá thứ hai. Một cơ chế không bao giờ chạy thì bằng không có.
  if (tribe.trainQueue.hero > 0 && s.bcount.barracks === 0) {
    // Trại lính bị san phẳng khi anh hùng còn trong lò: hàng đợi sẽ nằm đó vĩnh
    // viễn (vòng huấn luyện đòi có trại mới chạy), và vì luật là "một anh hùng
    // mỗi bộ lạc" nên bộ lạc đó mất anh hùng đến hết kỷ nguyên.
    tribe.trainQueue.hero = 0;
    tribe.trainTimer.hero = 0;
  }
  if (CONFIG.HERO.ENABLED && s.bcount.barracks > 0 && s.heroes === 0
      && tribe.trainQueue.hero === 0 && tick >= tribe.heroCooldownUntil
      && tribe.res.food > CONFIG.UNIT.HERO.cost.food + 60
      && canAfford(tribe, CONFIG.UNIT.HERO.cost)) {
    pay(tribe, CONFIG.UNIT.HERO.cost);
    tribe.trainQueue.hero++;
  }

  // Xưởng thợ bị san phẳng khi cung thủ/máy bắn đá còn trong lò -> hàng đợi treo
  // vĩnh viễn và tài nguyên đã trả trước coi như mất. Cùng lỗi đã bắt được với
  // anh hùng + trại lính; lần này viết sẵn thay vì chờ nó xảy ra.
  if (s.bcount.workshop === 0) {
    for (const t of ['archer', 'catapult']) { tribe.trainQueue[t] = 0; tribe.trainTimer[t] = 0; }
  }
  if (s.bcount.stable === 0) {
    for (const t of ['knight', 'horsearcher']) { tribe.trainQueue[t] = 0; tribe.trainTimer[t] = 0; }
  }

  const freePop = s.popCap - s.pop;
  if (freePop > 0) {
    // Tỉ lệ lính mục tiêu được nhân lên theo ĐỘ GIÀU. Không có cái này, một bộ
    // lạc yên ổn sẽ chạm trần dân số rồi chất kho tới hơn 100.000 lương thực mà
    // không tiêu vào đâu — nền kinh tế chết cứng, và không ai đủ mạnh để kết thúc
    // kỷ nguyên. Của cải dư phải chảy vào quân đội thì thế bế tắc mới bị phá vỡ:
    // đế chế giàu trở thành mối đe doạ, đúng như lịch sử thật.
    const wealth = clamp(tribe.res.food / 5000, 0, 1);
    const wantSoldiers = Math.round(s.pop * Math.min(0.7, p.militaryRatio * (1 + wealth)));
    let army = s.soldiers;
    for (const t of MILITARY_TYPES) army += tribe.trainQueue[t];
    const needSoldier = s.bcount.barracks > 0 && army < wantSoldiers;
    // Chỉ tuyển khi kho lương còn TRÊN mức dự trữ (xem ECON.FOOD_RESERVE) — đây
    // là thứ giữ cho bộ lạc có đệm chống sốc thay vì luôn sống sát mép vực đói.
    const reserve = CONFIG.ECON.FOOD_RESERVE;

    // Cơ cấu quân đội. rangedRatio quyết định bao nhiêu phần đạo quân là cung thủ.
    // Số máy bắn đá thì KHÔNG có gen riêng: nó suy ra từ `aggression` và chỉ khác 0
    // khi đang có chiến tranh. Cố ý không thêm gen thứ mười bốn — thay vào đó, một
    // gen đã có được cấp thêm một biểu hiện nữa, nên tín hiệu chọn lọc lên nó MẠNH
    // hơn chứ không loãng đi. Với hai tầng tiến hoá vốn đã chìm trong nhiễu, đó là
    // hướng đúng để đi mỗi khi có thể chọn.
    const hasWorkshop = s.bcount.workshop > 0;
    const hasStable = s.bcount.stable > 0;
    const wantArchers = hasWorkshop && unlockedUnit(tribe, 'archer')
      ? Math.round(wantSoldiers * p.rangedRatio) : 0;
    const wantCatapults = hasWorkshop && unlockedUnit(tribe, 'catapult') && tribe.warTarget !== null
      ? Math.round(1 + p.aggression * 3) : 0;
    // KỴ BINH cũng KHÔNG có gen riêng, cùng lý do đã viết cho máy bắn đá: một gen
    // đã có được cấp thêm biểu hiện thì tín hiệu chọn lọc lên nó mạnh hơn.
    // `militaryRatio` là gen đúng ở đây — nó vốn là "muốn bao nhiêu phần dân số là
    // lính", và kỵ binh là câu trả lời cho "phần đó nên ĐẮT tới đâu". Một bộ lạc
    // militaryRatio 0,7 giờ có hai cách tiêu rất khác nhau cho cùng một tỉ lệ: đông
    // và rẻ, hay ít và nặng. Trần 40% để đạo quân không bao giờ toàn ngựa — kỵ binh
    // đắt gấp rưỡi mà chỉ ra lò từ MỘT công trình, một đạo quân thuần ngựa sẽ chết
    // đói trước khi kịp thành hình.
    const cavShare = clamp((p.militaryRatio - 0.15) * 1.3, 0, 0.45);
    const wantKnights = hasStable && unlockedUnit(tribe, 'knight')
      ? Math.round(wantSoldiers * cavShare * (1 - p.rangedRatio * 0.5)) : 0;
    const wantHorseArchers = hasStable && unlockedUnit(tribe, 'horsearcher')
      ? Math.round(wantSoldiers * cavShare * p.rangedRatio) : 0;

    const trainable = (type, want, have) => {
      if (want <= have) return false;
      if (tribe.trainQueue[type] >= 2) return false;
      return canAfford(tribe, unitSpec(type).cost);
    };

    // Thứ tự thang: đắt nhất trước. Mỗi lần chạy bộ não chỉ tuyển MỘT suất, nên
    // loại đứng đầu thang được ưu tiên khi tiền eo hẹp — mà đó đúng là những loại
    // sẽ không bao giờ được tuyển nếu tiền cứ chảy vào bộ binh rẻ tiền trước.
    if (needSoldier && tribe.res.food > reserve
        && trainable('catapult', wantCatapults, s.catapults + tribe.trainQueue.catapult)) {
      pay(tribe, CONFIG.UNIT.CATAPULT.cost);
      tribe.trainQueue.catapult++;
    } else if (needSoldier && tribe.res.food > reserve
        && trainable('horsearcher', wantHorseArchers, s.horsearchers + tribe.trainQueue.horsearcher)) {
      pay(tribe, CONFIG.UNIT.HORSEARCHER.cost);
      tribe.trainQueue.horsearcher++;
    } else if (needSoldier && tribe.res.food > reserve
        && trainable('knight', wantKnights, s.knights + tribe.trainQueue.knight)) {
      pay(tribe, CONFIG.UNIT.KNIGHT.cost);
      tribe.trainQueue.knight++;
    } else if (needSoldier && tribe.res.food > reserve
        && trainable('archer', wantArchers, s.archers + tribe.trainQueue.archer)) {
      pay(tribe, CONFIG.UNIT.ARCHER.cost);
      tribe.trainQueue.archer++;
    } else if (needSoldier && tribe.res.food > reserve && canAfford(tribe, CONFIG.UNIT.SOLDIER.cost) && tribe.trainQueue.soldier < 3) {
      pay(tribe, CONFIG.UNIT.SOLDIER.cost);
      tribe.trainQueue.soldier++;
    } else if (s.villagers + tribe.trainQueue.villager < 90
               && canAfford(tribe, CONFIG.UNIT.VILLAGER.cost)
               && tribe.res.food > reserve
               && tribe.trainQueue.villager < 3) {
      pay(tribe, CONFIG.UNIT.VILLAGER.cost);
      tribe.trainQueue.villager++;
    }
  }

  // ---- Quyết định chiến tranh ----
  // So sánh sức mạnh quân sự của mình với từng đối thủ; aggression là "hệ số dám
  // liều" — bộ lạc hiếu chiến đánh cả khi chỉ ngang cơ, bộ lạc nhát chỉ đánh khi
  // áp đảo. Vì aggression là gen tiến hoá, sau vài kỷ nguyên bạn sẽ thấy nó bị
  // kéo về giá trị nào là "đúng" trong thế giới này.
  // Thủ thành: KHÔNG bộ lạc nào tuyên chiến với bộ lạc nào. Đây là điều kiện để
  // tín hiệu chọn lọc sạch — nếu vẫn còn đánh nhau thì không phân biệt được một
  // policy sống lâu là vì nó thủ giỏi hay vì nó gặp hàng xóm hiền.
  // ---- Kỳ quan đang đếm ngược: cả thiên hạ quay sang một mục tiêu ----
  // Đây là nửa còn lại của cơ chế Kỳ quan, và là nửa quan trọng hơn. Nếu xây xong
  // rồi cứ thế đợi hết giờ thì nó chỉ là một cái đồng hồ; luật này biến nó thành
  // MỘT LỜI TUYÊN BỐ — mọi ngưỡng "đủ mạnh mới dám đánh" bị bỏ qua, ba bộ lạc còn
  // lại cùng lao vào một chỗ, và trận đánh lớn nhất kỷ nguyên diễn ra ở một điểm
  // ai cũng biết trước. Kể cả kẻ yếu nhất cũng phải thử, vì đứng yên là thua chắc.
  // ---- ...và CHỦ Kỳ quan thì bỏ hết mọi cuộc chinh phạt để về giữ nó ----
  // Nửa còn thiếu của luật trên, và là nguyên nhân trực tiếp của cảnh "quân đứng
  // im nhìn Kỳ quan sập": ba bộ lạc kia quay sang chủ Kỳ quan ngay từ tick nó
  // khánh thành, còn chính chủ thì rơi vào nhánh `else if` bên dưới và VẪN GIỮ
  // mục tiêu chinh phạt cũ của mình. Đạo quân đi đúng theo lệnh — chỉ có điều
  // lệnh đó đang dẫn nó rời khỏi thứ duy nhất quyết định thắng thua.
  //
  // Kéo luôn cờ tập kết về chân Kỳ quan: `rally` là nơi lính RẢNH đứng, mà từ giờ
  // tới hết đồng hồ thì không có chỗ nào khác đáng đứng. Cờ cũ được cất lại để
  // trả về nếu Kỳ quan đổ (`baseRally`).
  if (gameMode !== 'defend' && wonderWatch && wonderWatch.tribeId === tribe.id) {
    if (tribe.warTarget !== null) {
      tribe.warTarget = null;
      logEvent(`🛡 ${tribe.name} triệu hồi toàn quân về giữ Kỳ quan`, tribe.color, true);
    }
    const w = buildings.find(b => b.id === wonderWatch.buildingId && b.hp > 0);
    if (w) {
      if (!tribe.baseRally) tribe.baseRally = tribe.rally;
      tribe.rally = { x: w.x, y: w.y + w.size };
    }
  } else if (gameMode !== 'defend' && wonderWatch && wonderWatch.tribeId !== tribe.id
      && tribes[wonderWatch.tribeId].alive && s.soldiers >= 3) {
    if (tribe.warTarget !== wonderWatch.tribeId) {
      tribe.warTarget = wonderWatch.tribeId;
      logEvent(`⚔ ${tribe.name} dốc toàn lực chặn Kỳ quan của ${tribes[wonderWatch.tribeId].name}`, tribe.color, true);
    }
  } else if (gameMode !== 'defend' && s.soldiers >= CONFIG.WAR_MIN_ARMY) {
    // Ngưỡng dám đánh do gen aggression quyết định: hiếu chiến ~1 thì đánh cả khi
    // chỉ mạnh bằng nửa đối thủ; hiếu chiến ~0 thì phải áp đảo gần gấp đôi mới dám.
    // Khoảng cách KHÔNG được dùng làm cửa ải (bản đầu nhân nó vào điểm số, khiến
    // mọi cặp bộ lạc ở xa nhau đều dưới ngưỡng -> cả kỷ nguyên không ai đánh ai),
    // mà chỉ dùng để chọn mục tiêu nào trong số những kẻ ĐÃ đủ yếu để đánh.
    const required = 1.8 - p.aggression * 1.3;
    let bestTarget = null, bestScore = 0;
    for (const other of tribes) {
      if (other.id === tribe.id || !other.alive || !other.stats) continue;
      const strength = (s.power + 1) / (other.stats.power + 1);
      if (strength < required) continue;
      const closeness = clamp(1 - dist(tribe.home.x, tribe.home.y, other.home.x, other.home.y) / 400, 0.3, 1);
      const score = strength * closeness;
      if (score > bestScore) { bestScore = score; bestTarget = other; }
    }
    if (bestTarget && tribe.warTarget !== bestTarget.id) {
      tribe.warTarget = bestTarget.id;
      logEvent(`⚔ ${tribe.name} tuyên chiến với ${bestTarget.name}`, tribe.color, true);
    } else if (!bestTarget && tribe.warTarget !== null) {
      tribe.warTarget = null;
      logEvent(`${tribe.name} lui binh, tạm ngừng chinh phạt`, tribe.color);
    }
  } else if (tribe.warTarget !== null && s.soldiers < CONFIG.WAR_MIN_ARMY / 2) {
    tribe.warTarget = null;
  }
  if (tribe.warTarget !== null && !tribes[tribe.warTarget].alive) tribe.warTarget = null;

  // Kỳ quan đã đổ (hoặc kỷ nguyên đã đổi chủ Kỳ quan) -> trả cờ tập kết về chỗ cũ.
  // Không có dòng này thì một bộ lạc từng xây Kỳ quan sẽ tập kết quân ở đống đổ nát
  // của nó tới hết kỷ nguyên.
  if (tribe.baseRally && !(wonderWatch && wonderWatch.tribeId === tribe.id)) {
    tribe.rally = tribe.baseRally;
    tribe.baseRally = null;
  }

  // Bản đồ đường tiến quân: tính lại khi đổi mục tiêu, hoặc định kỳ vì kẻ địch
  // vẫn xây thêm/mất dần công trình. Chỉ tính cho bộ lạc ĐANG có chiến tranh nên
  // chi phí thật là 1-2 lần BFS mỗi WAR_FIELD_REFRESH tick, không phải mỗi tick.
  // Trường về-nhà làm mới định kỳ: nhà mới xây/bị phá làm đổi cả vùng với tới được.
  if (!tribe.homeField || tick - tribe.homeFieldTick > HOME_FIELD_REFRESH) computeHomeField(tribe);

  if (tribe.warTarget === null) {
    tribe.warField = null;
  } else if (!tribe.warField || tribe.warFieldTarget !== tribe.warTarget
             || tick - tribe.warFieldTick > WAR_FIELD_REFRESH
             // Kỳ quan vừa khánh thành (hoặc vừa đổ) đổi HẲN cách gieo mầm trường
             // tiến quân. Chờ tới nhịp làm mới định kỳ thì mất tới 300 tick đi
             // nhầm hướng — với đồng hồ 2600 tick thì đó là một phần chín ván cờ.
             || tribe.warFieldWonder !== !!(wonderWatch && wonderWatch.tribeId === tribe.warTarget)) {
    computeWarField(tribe);
  }

  // Trường dẫn đường PHÒNG THỦ — chỉ dựng cho báo động TRỌNG YẾU (Kỳ quan, kinh
  // đô), vì chỉ chúng mới triệu hồi quân từ bên kia bản đồ, tức là chỉ chúng mới
  // cần một đường đi thật sự. Mọi báo động khác có bán kính <= 49 ô và đi tham lam
  // là đủ. Nhờ vậy chi phí thực là 0-1 lần BFS mỗi 200 tick cho cả ván.
  const topAlarm = tribeTopAlarm(tribe);
  if (topAlarm && defenseWeight(topAlarm) >= CONFIG.DEFENSE.CRITICAL) {
    if (!tribe.defendField || tribe.defendFieldId !== topAlarm.id
        || tick - tribe.defendFieldTick > DEFEND_FIELD_REFRESH) {
      tribe.defendField = bfsFieldFromBuildings(b => b.id === topAlarm.id && b.hp > 0);
      tribe.defendFieldId = topAlarm.id;
      tribe.defendFieldTick = tick;
    }
  } else if (tribe.defendField) {
    tribe.defendField = null;
    tribe.defendFieldId = -1;
  }
  // Hàng ngũ tính lại mỗi nhịp bộ não (20 tick), không phải mỗi tick: nó là một
  // phép sắp xếp trên toàn bộ quân của bộ lạc, mà trung vị của một đạo quân thì
  // không nhúc nhích đáng kể trong hai chục bước chân.
  computeArmyLine(tribe);
}

// ============================================================
// Kinh tế + huấn luyện mỗi tick
// ============================================================
function tickTribeEconomy(tribe) {
  const s = tribe.stats;
  if (!s) return;

  // s.soldiers là TỔNG quân sự (gồm cả cung thủ và máy bắn đá), nên dòng đầu đã
  // tính hết; máy bắn đá bị cộng THÊM 1,5 suất nữa — một cỗ máy phải có tổ vận
  // hành, và cái giá nuôi nó là thứ giữ cho "spam máy bắn đá" không thành nước đi
  // hiển nhiên đúng ở mọi ván.
  // Kỵ binh cộng thêm 1 suất nữa: NUÔI NGỰA. Đây là chỗ duy nhất kỵ binh phải trả
  // giá liên tục thay vì trả một lần lúc tuyển, và nó cần thiết vì cái giá một lần
  // thì một bộ lạc giàu sẽ mua đứt rồi không bao giờ phải nghĩ về nó nữa. Với suất
  // nuôi kép, một đạo kỵ binh 30 con là gánh nặng tương đương 60 người lính đứng
  // ăn — nghĩa là bộ lạc phải THẮNG bằng chúng, không thể chỉ tích chúng lại.
  const upkeep = (s.villagers * CONFIG.ECON.UPKEEP_VILLAGER
                  + s.soldiers * CONFIG.ECON.UPKEEP_SOLDIER
                  + s.catapults * CONFIG.ECON.UPKEEP_SOLDIER * 1.5
                  + s.cavalry * CONFIG.ECON.UPKEEP_SOLDIER
                  + s.heroes * CONFIG.HERO.UPKEEP)
                 * CONFIG.ECON.upkeepMult;
  tribe.res.food -= upkeep;
  if (tribe.res.food < 0) {
    tribe.res.food = 0;
    if (!tribe.starving) {
      logEvent(`${tribe.name} lâm vào NẠN ĐÓI`, '#d05a44', true);
      // TOÀN DÂN BỎ VIỆC ĐI KIẾM ĂN. Nếu chỉ đổi pickJob thôi thì một người đang
      // đốn gỗ ở rìa bản đồ phải đi hết chuyến (có khi 60-80 tick) mới hỏi lại
      // "làm nghề gì" — quá chậm so với tốc độ chết đói. Đây là nút bấm khẩn cấp:
      // huỷ ngay việc đang làm của mọi người không thuộc nghề lương thực.
      for (const u of units) {
        if (u.tribeId !== tribe.id || u.type !== 'villager' || u.hp <= 0) continue;
        if (u.job !== 'food' || u.task === 'build') {
          u.job = 'food'; u.task = 'idle'; u.resTarget = null; u.buildTarget = null;
        }
      }
    }
    tribe.starving = true;
  } else if (tribe.res.food > 40) {
    tribe.starving = false;
  }

  // Huấn luyện: nhà chính ra dân, trại lính ra lính. Không có công trình tương
  // ứng thì hàng đợi đứng yên (và tài nguyên coi như đã trả trước — mất luôn nếu
  // nhà bị phá, đúng cảm giác "công trình dở dang bị đốt").
  for (const type of TRAINABLE_TYPES) {
    if (tribe.trainQueue[type] <= 0) continue;
    const src = buildings.find(b => b.tribeId === tribe.id && b.hp > 0 && b.done &&
      b.type === TRAIN_SOURCE[type]);
    if (!src) continue;
    tribe.trainTimer[type]++;
    const need = unitSpec(type).trainTicks;
    if (tribe.trainTimer[type] >= need) {
      tribe.trainTimer[type] = 0;
      tribe.trainQueue[type]--;
      spawnUnit(tribe, type, src.x + Math.round(randRange(-2, 2)), src.y + src.size);
    }
  }
}

// ============================================================
// Thờ cúng — tế phẩm, lời khẩn cầu, phước lành
// ============================================================
// Bốn loại lời cầu. Mỗi loại chỉ được cất lên khi bộ lạc THẬT SỰ ở trong tình
// cảnh đó — không bốc ngẫu nhiên. Nhờ vậy đọc lời cầu là đọc được tình hình:
// "xin ban mưa" nghĩa là kho lương của họ đang cạn, không phải là một dòng chữ
// trang trí. Đây là điều kiện để người xem học được cách nhìn bàn cờ.
const PRAYERS = {
  rain:    { icon: '🌧', label: 'Xin ban mưa',     desc: 'kho lương đang cạn',        color: '#5aa07c' },
  shield:  { icon: '🛡', label: 'Xin che chở',     desc: 'đang bị vây đánh',          color: '#37a6c4' },
  might:   { icon: '⚔', label: 'Xin ban sức mạnh', desc: 'đang lâm trận sinh tử',     color: '#e04b32' },
  wisdom:  { icon: '📜', label: 'Xin ban trí tuệ',  desc: 'muốn tiến lên thời đại mới', color: '#d8a544' }
};

function pickPrayer(tribe) {
  const s = tribe.stats;
  if (!s) return null;
  if (tribe.starving || tribe.res.food < 180) return 'rain';
  if (homeIntruder(tribe)) return 'shield';
  if (tribe.warTarget !== null || (gameMode === 'defend' && waveTargetTribe === tribe.id)) return 'might';
  const ageCost = CONFIG.AGE.COST[tribe.age + 1];
  if (ageCost && tribe.res.gold < ageCost.gold) return 'wisdom';
  return null;
}

// Chạy mỗi tick cho từng bộ lạc còn sống. Rẻ: hai phép so tick, thoát ngay.
function tickWorship(tribe) {
  const s = tribe.stats;
  if (!s) return;
  // Đếm TẠI CHỖ, không đọc s.bcount — và đây là một cái bẫy đã sập thật.
  // `bcount` đếm cả công trình ĐANG XÂY DỞ (nó sinh ra để trả lời "đã đặt móng
  // cái nào chưa", chứ không phải "đã có cái nào chạy chưa"). Đọc nó ở đây làm
  // một nhà cầu nguyện mới đặt móng đã dâng tế được, và hậu quả thì buồn cười
  // theo đúng nghĩa đen: hai lễ vật liên tiếp rút kho lương khởi đầu từ 250 xuống
  // 110, và ở tick 40 cả BỐN bộ lạc cùng ngửa mặt "xin ban mưa" vì đói — cơn đói
  // do chính lễ vật của họ gây ra.
  //
  // Đền thờ tính bằng HAI nhà cầu nguyện.
  // Quét qua CHỈ MỤC theo bộ lạc (dựng lại mỗi tick sẵn rồi) chứ không quét cả
  // `buildings`: bốn bộ lạc × ~60 công trình × mỗi tick là 240 vòng lặp cho một
  // cơ chế mà nhịp chậm nhất là 300 tick.
  const mine = tribeBuildings[tribe.id] || [];
  let holy = 0;
  for (const b of mine) {
    if (!b.done || b.hp <= 0) continue;
    if (b.type === 'shrine') holy += 1;
    else if (b.type === 'temple') holy += 2;
  }
  if (!holy) return;

  // --- Dâng tế ---
  // Nhịp dâng nhanh dần theo số nơi thờ tự. Đây là chỗ gen `piety` biến thành chi
  // phí thật: mỗi lần tế là 55 lương + 20 vàng KHÔNG thành lính.
  const W = CONFIG.WORSHIP;
  if (tick - tribe.lastOfferTick >= W.OFFER_INTERVAL / holy) {
    // Chỉ dâng tế bằng phần DƯ trên mức dự trữ, đúng luật đang áp cho việc tuyển
    // quân. Không có sàn này thì một bộ lạc sùng đạo tế mình vào nạn đói — nghe
    // thì thú vị, nhưng nó xảy ra ở tick 40 chứ không phải ở đỉnh cao tôn giáo,
    // nên nó chỉ là một vòng xoáy chết chứ không phải một câu chuyện.
    // Vẫn còn nguyên đánh đổi: mỗi phần lương dư đem đi tế là một phần lương
    // KHÔNG thành lính.
    // Sàn = 60% mức dự trữ, không phải 100%. Ở mức 100% thì đo ra tế phẩm gần như
    // tắt hẳn (25 lần mỗi kỷ nguyên thay vì 125): bộ lạc luôn bị khối tuyển quân
    // ghìm sát ngay trên ngưỡng dự trữ, nên "phần dư trên dự trữ" gần như không
    // bao giờ tồn tại. Vẫn đủ cao để một bộ lạc sùng đạo không tế mình vào nạn đói.
    if (tribe.res.food > CONFIG.ECON.FOOD_RESERVE * 0.6 && canAfford(tribe, W.OFFER_COST)) {
      pay(tribe, W.OFFER_COST);
      tribe.lastOfferTick = tick;
      tribe.offers++;
      tribe.piety += W.PIETY_PER_OFFER;
      faith = Math.min(CONFIG.GOD.FAITH_MAX, faith + W.FAITH_PER_OFFER);
      const holyB = buildings.find(b => b.tribeId === tribe.id && b.done && b.hp > 0
                                        && (b.type === 'temple' || b.type === 'shrine'));
      if (holyB) addFx({ type: 'offering', x: holyB.x, y: holyB.y, life: 40, maxLife: 40, color: tribe.color });
    }
  }

  // --- Cất lời khẩn cầu ---
  if (!tribe.prayer && tick - tribe.lastPrayerTick >= W.PRAYER_INTERVAL) {
    const kind = pickPrayer(tribe);
    if (kind) {
      tribe.prayer = { kind, born: tick, until: tick + W.PRAYER_TTL };
      tribe.lastPrayerTick = tick;
      logEvent(`${PRAYERS[kind].icon} ${tribe.name} khẩn cầu: ${PRAYERS[kind].label} — ${PRAYERS[kind].desc}`, tribe.color);
    }
  }
  if (tribe.prayer && tick > tribe.prayer.until) {
    // Lời cầu không được đáp. Ghi lại thành sự kiện chứ không im lặng biến mất:
    // sự THINH LẶNG của Chúa Tể cũng là một hành động, và nó phải nhìn thấy được.
    logEvent(`${tribe.name} cầu mãi không thấu — lời khẩn cầu tắt lịm`, '#6d6454');
    tribe.prayer = null;
  }
}

// Hiệu lực của phước lành nhân theo THÀNH TÂM của chính bộ lạc nhận. Một bộ lạc
// chưa từng dâng tế mà được ban phước thì gần như chẳng nhận được gì — đó là toàn
// bộ nghĩa của chữ "ban phước cho người thành tâm".
function blessMultiplier(tribe) {
  // Chia 45 chứ không phải 14: ở mức 14, điểm thành tâm chạm trần chỉ sau ~22 lần
  // dâng tế, mà một bộ lạc sùng đạo dâng tới 75 lần trong một kỷ nguyên. Trần đạt
  // quá sớm thì phần lớn quãng đời của gen `piety` không còn tạo ra khác biệt nào
  // — tức là chọn lọc không còn gì để bám vào ở đúng vùng giá trị hay gặp nhất.
  return 1 + Math.min(1.6, tribe.piety / 45);
}

function grantBlessing(tribe, kind, opts) {
  const m = blessMultiplier(tribe);
  const auto = opts && opts.auto;
  tribe.blessUntil = tick + Math.round(600 * m);
  tribe.blessKind = kind;
  tribe.blessMult = m;

  if (kind === 'rain') {
    tribe.res.food += Math.round(320 * m);
    // Mưa còn làm mọi ô lương thực trên bản đồ đầy lại một phần — hiệu ứng lan ra
    // cả thế giới chứ không chỉ vào kho, nên nó đáng xem chứ không chỉ đáng đọc.
    for (const c of regrowList) c.amount = Math.min(c.max, c.amount + c.max * 0.45);
  } else if (kind === 'shield') {
    for (const u of units) if (u.tribeId === tribe.id) u.hp = Math.min(u.maxHp, u.hp + 40 * m);
    for (const b of buildings) if (b.tribeId === tribe.id) b.hp = Math.min(b.maxHp, b.hp + 220 * m);
  } else if (kind === 'might') {
    // Sức mạnh là buff CÓ HẠN, cài qua đúng đường ống hào quang của anh hùng —
    // không cộng thẳng vào u.attack. Cộng thẳng thì hết hạn không có đường lùi,
    // đúng cái bẫy mà chú thích ở effAttack đã ghi lại từ Phase 3.2.
    tribe.blessAtk = 1 + 0.35 * m;
  } else if (kind === 'wisdom') {
    tribe.res.gold += Math.round(260 * m);
    tribe.res.stone += Math.round(110 * m);
  }

  tribe.piety += 2;   // được đáp lời thì càng thêm thành tâm
  tribe.prayer = null;
  const home = tribe.home;
  addFx({ type: 'blessing', x: home.x, y: home.y, life: 60, maxLife: 60, color: tribe.color });
  addHotspot(home.x, home.y, 9, `${tribe.name} được ban phước`);
  logEvent(`${auto ? '✨ Chúa Tể đoái thương kẻ thành tâm nhất' : '🙏 Chúa Tể đáp lời'} — ${tribe.name} nhận ${PRAYERS[kind].label.toLowerCase()} (x${m.toFixed(2)})`,
           '#d8a544', true);
}

// Ơn trên tự giáng: định kỳ, bộ lạc THÀNH TÂM NHẤT được ban phước dù không ai bấm
// nút. Nhờ vế này, gen `piety` vẫn có kiểu hình trong các lần chạy thí nghiệm
// không người xem — nếu không nó sẽ trôi tự do và mọi so sánh giữa "có người xem"
// và "không người xem" mất luôn điểm tựa.
function divineFavour() {
  const W = CONFIG.WORSHIP;
  let best = null;
  for (const t of tribes) {
    if (!t.alive || t.piety < W.FAVOUR_MIN_PIETY) continue;
    if (!best || t.piety > best.piety) best = t;
  }
  if (!best) return;
  const kind = best.prayer ? best.prayer.kind : (pickPrayer(best) || 'rain');
  grantBlessing(best, kind, { auto: true });
}

