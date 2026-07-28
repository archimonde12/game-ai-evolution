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
  let ballistas = 0, elephants = 0, standards = 0;
  let heroes = 0, popCap = 0, builders = 0, towersDone = 0;
  // `depot` PHẢI có mặt trong bảng khởi tạo này. Thiếu nó thì `bcount[b.type]++`
  // chạy trên `undefined` ra NaN, và mọi so sánh với NaN đều false — bộ não sẽ tin
  // là mình chưa có cái kho nào và đặt móng mãi mãi. Đây là lần thứ ba NaN im lặng
  // trong dự án này (biên giới lãnh thổ, điểm chọn nhánh nâng cấp), và cả ba đều
  // cùng một hình dạng: một bảng tra thiếu một khoá, không có lỗi nào được ném ra.
  // `camp` cũng PHẢI có mặt ở đây, đúng cùng lý do vừa viết cho `depot` — và với
  // trại thì hậu quả còn khó lần theo hơn, vì nó là loại công trình duy nhất SINH
  // RA VÀ MẤT ĐI liên tục: một NaN ở đây sẽ chỉ xuất hiện sau cái trại đầu tiên,
  // tức là chỉ ở những ván có chiến tranh xa nhà.
  const bcount = { town: 0, house: 0, farm: 0, depot: 0, barracks: 0, tower: 0, shrine: 0, heroHall: 0, workshop: 0, stable: 0, infirmary: 0, temple: 0, wonder: 0, camp: 0 };
  tribe.jobCounts = { food: 0, wood: 0, gold: 0, stone: 0 };
  // Danh sách trạm xá ĐÃ XÂY XONG, dựng lại mỗi nhịp bộ não. Giữ sẵn ở đây thay vì
  // quét `buildings` trong seekMedic: hàm đó chạy cho mỗi người lính rảnh mỗi tick,
  // còn danh sách này thì cả trăm tick mới đổi một lần.
  tribe.infirmaries = [];
  tribe.healers = [];
  let healers = 0, quarters = 0;
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
    // Ba loại Thiên Triều phải được liệt kê TƯỜNG MINH ở đây, đúng như chú thích
    // ngay trên đã cảnh báo cho ba loại trước và cho thầy lang. Quên một dòng thì
    // nó rơi vào nhánh else và bộ não coi một con voi chiến là một người hái quả
    // đang rảnh — bốn quyết định phía sau (tuyển quân, tuyên chiến, phân công lao
    // động, trần dân số) đều lệch theo, và không có gì báo lỗi.
    else if (u.type === 'ballista') ballistas++;
    else if (u.type === 'elephant') elephants++;
    else if (u.type === 'standard') standards++;
    // Thầy lang phải được liệt kê TƯỜNG MINH ở đây, đúng như chú thích ngay trên
    // đã cảnh báo cho ba loại quân sự: nhánh else vừa đếm dân vừa đọc u.job/u.task,
    // nên một loại quên khai báo sẽ lặng lẽ bị tính là một người hái quả đang rảnh
    // — và mọi quyết định tuyển quân của bộ não lệch theo. Ở đây còn nặng thêm một
    // bậc: thầy lang không có `job` nào cả, nên nó sẽ rơi vào ô đếm `jobCounts`
    // của một nghề không tồn tại.
    else if (u.type === 'medic') { healers++; tribe.healers.push(u); }
    // ĐỘI HẬU CẦN — liệt kê TƯỜNG MINH, lần thứ tư cùng một cảnh báo. Nhánh `else`
    // bên dưới vừa đếm dân vừa đọc `u.job`, mà đội hậu cần không có nghề nào cả:
    // quên dòng này thì nó rơi vào ô đếm `jobCounts` của một nghề không tồn tại, và
    // bộ não sẽ vừa tưởng mình có thêm một người hái quả vừa phân công lao động lệch.
    else if (u.type === 'quarter') quarters++;
    else {
      villagers++;
      if (u.task === 'build') builders++;
      else if (u.job) tribe.jobCounts[u.job]++;
    }
  }
  // Bộ đếm "đang nấu" được DỰNG LẠI TỪ ĐẦU mỗi nhịp bộ não — xem chú thích ở
  // `trainActive` trong makeTribe. Đây là chỗ duy nhất ghi vào nó.
  for (const t of TRAINABLE_TYPES) tribe.trainActive[t] = 0;
  let ovenBusy = 0;                     // suất đang nấu, KHÔNG tính anh hùng
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.hp <= 0) continue;
    bcount[b.type]++;
    if (b.trainType) {
      tribe.trainActive[b.trainType]++;
      if (b.trainType !== 'hero') ovenBusy++;
    }
    // Sức chứa đọc theo THỜI ĐẠI của bộ lạc, không phải một hằng số trên spec —
    // xem buildingPop và khối chú thích popByAge trong CONFIG.BUILD. Hệ quả cần
    // biết: trần dân số của một bộ lạc NHẢY LÊN ngay tại tick nó lên đời, không
    // cần xây thêm gì cả, và cả đám nhà đang có bỗng chứa được nhiều người hơn.
    if (b.done) popCap += buildingPop(b.type, tribe.age);
    if (b.done && b.type === 'infirmary') tribe.infirmaries.push(b);
    // Đếm riêng tháp ĐÃ XÂY XONG: `bcount` tính cả móng đang dựng (nó sinh ra để
    // trả lời "đã đặt móng chưa"), mà cổng lên đời hỏi "đã trả giá xong chưa".
    // Cùng cái bẫy `bcount` vs `done` đã sập một lần ở vòng thờ cúng — xem tickWorship.
    if (b.done && b.type === 'tower') towersDone++;
  }
  // `soldiers` giữ nguyên nghĩa CŨ = toàn bộ quân sự, vì hơn chục chỗ trong file
  // đã đọc nó (ngưỡng tuyên chiến, điểm bộ lạc, bảng xếp hạng, cứu hộ...). Ba loại
  // được tách ra thành trường riêng bên cạnh chứ không thay thế nó.
  const soldiers = melee + archers + catapults + knights + horsearchers + ballistas + elephants;
  // Cộng theo TRAINABLE_TYPES thay vì bốn dòng viết tay: bản cũ liệt kê tay đúng
  // bốn loại, nên hai loại kỵ binh mới sẽ không được tính là "đang chiếm suất dân"
  // — và bộ lạc sẽ tuyển vượt trần dân số đúng bằng số ngựa đang trong lò.
  let queued = 0;
  for (const t of TRAINABLE_TYPES) if (t !== 'hero') queued += tribe.trainQueue[t];
  // `ovenBusy` phải cộng vào đây, và đây là cái bẫy trực tiếp của Phase 3.28: từ
  // bản này một suất RỜI hàng đợi ngay khi có lò nhận nó, nên nếu chỉ đếm hàng đợi
  // thì mọi suất đang nấu bỗng biến mất khỏi dân số — bộ lạc sẽ tuyển vượt trần
  // đúng bằng số lò nó đang có, tức là càng xây thêm lò càng sai nhiều hơn.
  // `quarters` phải cộng vào đây: mỗi đội hậu cần nuốt một suất dân như thầy lang
  // và quân kỳ. Thiếu nó thì một bộ lạc viễn chinh cao sẽ vượt trần dân số đúng
  // bằng số đội hậu cần nó nuôi — và vì gen `expedition` là thứ quyết định con số
  // đó, cái lệch sẽ TỈ LỆ THUẬN với chính gen đang được đo. Một sai số bám theo
  // biến độc lập là sai số tệ nhất có thể có trong một thí nghiệm chọn lọc.
  const pop = villagers + soldiers + heroes + healers + standards + quarters + queued + ovenBusy;
  // TRẦN CỨNG THI HÀNH TẠI ĐÂY (Phase 3.30). Trước bản này con số 420 chỉ nằm
  // trong một câu `if` quyết định có xây thêm nhà không — tức là nó chặn NGUỒN
  // sức chứa chứ không chặn sức chứa, và một bộ lạc chiếm được kinh đô thứ hai,
  // thứ ba vẫn vượt qua nó mà không có gì cản. Kẹp ở đây thì mọi thứ đọc
  // `s.popCap` (tuyển quân, xây nhà, bảng bộ lạc) đều thấy cùng một con số.
  popCap = Math.min(popCap, CONFIG.ECON.POP_HARD_CAP);
  tribe.stats = {
    villagers, soldiers, melee, archers, catapults, knights, horsearchers,
    ballistas, elephants, standards,
    cavalry: knights + horsearchers,
    healers, quarters,
    heroes, pop, popCap, builders, bcount, towersDone,
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
    // Nỏ thần 16 và voi chiến 26. Voi là điểm cao nhất bảng và đó là chủ ý: nó
    // gây sát thương bằng cách ĐI, nên trong một trận hỗn chiến nó chạm được nhiều
    // người hơn bất kỳ đơn vị nào — `power` phải nói ra điều đó, nếu không thì một
    // bộ lạc vừa nuôi được đàn voi vẫn tự thấy mình yếu và ngồi im.
    // QUÂN KỲ KHÔNG có mặt trong tổng này, cùng lý do với thầy lang: ô sát thương
    // bằng 0. Nó làm cả đạo quân mạnh lên, nhưng cái đó đã nằm trong điểm của
    // chính đám quân được cổ vũ rồi — cộng lần nữa là đếm hai lần.
    power: melee * 10 + archers * 9 + catapults * 14 + knights * 18 + horsearchers * 17
         + ballistas * 16 + elephants * 26
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
// `forceR` (tuỳ chọn): ghi đè bán kính rải, dùng cho việc LẬP ĐÔ trên đất chiếm.
// Không có nó thì bán kính đọc gen `expansion` (tới 60 ô), và một cái "đô lập trên
// nền kinh đô địch" hoàn toàn có thể mọc cách nền cũ nửa bản đồ — lúc đó nó không
// còn là chiến lợi phẩm nữa, nó chỉ là một cái nhà chính xây ở đâu đó.
function findBuildSpot(tribe, type, biasX, biasY, forceR) {
  const spec = CONFIG.BUILD[type];
  const cx = biasX !== undefined ? biasX : tribe.home.x;
  const cy = biasY !== undefined ? biasY : tribe.home.y;
  const maxR = forceR !== undefined ? forceR : Math.max(10, Math.min(tribe.policy.expansion, 60));
  // Công trình càng to càng khó tìm chỗ: vòng kiểm tra ô trống quét (2·size+1)²,
  // nên Kỳ quan size 5 cần một khoảng đất trống 11x11 KHÔNG có cây, nước hay nhà.
  // Với 90 lượt bốc ngẫu nhiên, một bộ lạc ở giữa rừng có thể trượt liên tục và
  // cả cơ chế Kỳ quan im lặng mà không có lỗi nào để lần theo.
  // Bán kính bị bó hẹp thì số ô hợp lệ ít đi hẳn, nên phải bốc nhiều lượt hơn —
  // nếu không thì việc lập đô sẽ "im lặng thất bại" ở đúng những nền đất chật, và
  // một cơ chế thất bại không tiếng động là một cơ chế không tồn tại.
  const tries = spec.size >= 5 ? 320 : (forceR !== undefined ? 220 : 90);
  const rMin = forceR !== undefined ? 1 : 5;   // đô lập được đặt ngay trên nền cũ
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
    const r = rMin + (attempt / tries) * maxR;
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
        // KHÔNG XÂY LÊN TÀI NGUYÊN (Phase 3.25). Trước đây chỉ hỏi `isBlocked`, mà
        // isBlocked chỉ biết CÂY — nên nhà mọc thoải mái lên mỏ vàng, mỏ đá và bụi
        // quả, chôn vĩnh viễn phần trữ lượng nằm dưới móng.
        //
        // Kiểm cả footprint chứ không chỉ ô tâm, và hỏi `resourceCells` chứ không
        // hỏi `isBlocked`: hai bảng trả lời hai câu khác nhau (đi qua được không /
        // có gì nằm đây không) và từ bản này cả hai đều phải đúng.
        //
        // Hệ quả ngược lại mới là chỗ hay: mỏ cạn thì ô biến mất khỏi resourceCells,
        // nên vạt đất vừa khai thác xong TỰ MỞ RA cho xây dựng. Thành phố lớn lên
        // đúng vào chỗ nó vừa đào rỗng.
        if (isBlocked(x + dx, y + dy) || resourceCells.has(cellKey(x + dx, y + dy))) ok = false;
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

// ============================================================
// AI ĐƯỢC PHÉP KHỞI CÔNG KỲ QUAN? — MỘT nguồn sự thật cho ba chỗ đọc
// ============================================================
// Ba nơi cần đúng câu trả lời này và chúng dễ lệch nhau nhất trong cả dự án:
//   · tribeBrain  — có đặt móng không,
//   · pickJob     — có tích trữ đá cho Kỳ quan không (xem 07-ai-villager),
//   · bảng bộ lạc — hiện dòng "còn thiếu gì" cho người xem.
// Bản đầu tôi viết điều kiện thẳng vào tribeBrain và để hai chỗ kia tự đoán. Đó
// đúng là cách một bộ lạc hiền lành sẽ ngồi ôm 470 đá suốt kỷ nguyên cho một toà
// nhà nó vĩnh viễn không được xây — cùng họ với lỗi "bảng threat rời" đã bỏ ở 3.7.
//
// Trả về LÝ DO BỊ CHẶN (chuỗi) hoặc null nếu được phép, chứ không trả về boolean:
// người xem cần biết vì sao chưa được xây, và một hàm trả boolean thì chỗ hiển thị
// buộc phải dựng lại điều kiện lần thứ hai — tức là lại có hai nguồn sự thật.
// KHÔNG xét tài nguyên ở đây: mức dự trữ phụ thuộc gen `wonderDrive` nên nó là
// quyết định RIÊNG của từng bộ lạc, không phải một cánh cửa của luật chơi.
function wonderBlock(tribe) {
  // Thủ thành không có Kỳ quan: ở đó thước đo là số tick sống sót, một luật thắng
  // tức thì sẽ xoá sạch chính thứ mà chế độ đó sinh ra để đo.
  if (gameMode === 'defend') return T('không có ở chế độ Thủ Thành');
  if (!unlockedBuild(tribe, 'wonder')) return T('chưa tới {age}', { age: CONFIG.AGE.NAMES[CONFIG.AGE.UNLOCK_BUILD.wonder] });
  const need = CONFIG.WONDER.NEED_TOWNS;
  if (tribe.townsRazed < need) {
    return T('chưa hạ đủ kinh đô địch ({have}/{need})', { have: tribe.townsRazed, need });
  }
  // ĐỘC NHẤT — xét cả công trình ĐANG XÂY DỞ (`hp > 0`, không hỏi `done`). Chỉ xét
  // cái đã khánh thành thì ba bộ lạc kia vẫn đặt móng song song được, và luật này
  // chỉ còn cấm đúng một khoảnh khắc không ai gặp.
  const other = buildings.find(b => b.type === 'wonder' && b.hp > 0 && b.tribeId !== tribe.id);
  if (other) return T('{tribe} đang giữ Kỳ quan — phải phá đã', { tribe: tribes[other.tribeId].name });
  return null;
}
function wonderAllowed(tribe) { return wonderBlock(tribe) === null; }

// ============================================================
// CÁI GÌ ĐANG CHẶN CỬA LÊN ĐỜI? — MỘT nguồn sự thật, đúng khuôn wonderBlock
// ============================================================
// Trả về LÝ DO (chuỗi) hoặc null, không trả boolean, và lý do đã viết đầy đủ ở
// wonderBlock ngay trên: hai chỗ đọc câu trả lời này (bộ não quyết định lên đời,
// và bảng bộ lạc hiện cho người xem), nên một hàm trả boolean sẽ buộc chỗ hiển thị
// dựng lại điều kiện lần thứ hai — tức là lại có hai nguồn sự thật, và chúng lệch
// nhau vào đúng lúc người xem đang thắc mắc "sao mãi chưa lên đời".
//
// KHÔNG xét tài nguyên ở đây, cũng đúng như wonderBlock: mức dự trữ phụ thuộc gen
// `ageRush` nên nó là quyết định RIÊNG của từng bộ lạc, không phải luật chơi.
// Hàm này chỉ trả lời về những cánh cửa CỨNG.
// BẬC CUỐI được trả về nguyên văn, KHÔNG qua T(), và đó là cố ý. Bảng bộ lạc
// phải phân biệt "hết đường lên" với "đang bị chặn" để không treo huy hiệu ⛯ lên
// một bộ lạc đã đi hết cây thời đại — mà nó phân biệt bằng cách SO SÁNH giá trị
// trả về. So sánh với một câu đã dịch thì đúng ở tiếng Việt và sai ở tiếng Anh:
// huy hiệu "đang bị chặn" sẽ hiện vĩnh viễn trên kẻ mạnh nhất bàn cờ. Đặt tên
// cho hằng số này để chỗ so sánh đi bằng danh tính chứ không đi bằng chữ.
const AGE_MAXED = 'đã tới bậc cuối';
function ageBlock(tribe) {
  const next = tribe.age + 1;
  if (!CONFIG.AGE.COST[next]) return AGE_MAXED;
  const need = CONFIG.AGE.NEED_TOWERS[next] || 0;
  if (need > 0) {
    // Đếm tháp ĐÃ XÂY XONG. Đếm cả móng đang dựng thì cổng mở ngay lúc đặt móng,
    // và bộ lạc lên đời trong khi hai cái tháp còn là hai đống gỗ — cơ chế mất
    // sạch nghĩa. `done` là khác biệt giữa "đã trả giá" và "đã hứa sẽ trả".
    let have = 0;
    for (const b of buildings) {
      if (b.tribeId === tribe.id && b.type === 'tower' && b.hp > 0 && b.done) have++;
    }
    if (have < need) return T('chưa đủ tháp canh ({have}/{need})', { have, need });
  }
  return null;
}

// ============================================================
// ĐƯỜNG CÁI — chọn tuyến, rồi lát dần từng đoạn
// ============================================================
// Mạng đường có hình NGÔI SAO: mọi tuyến đều nối KINH ĐÔ với một công trình khác
// của chính bộ lạc. Đây là quyết định thiết kế quan trọng nhất của cả cơ chế, và
// nó trả lời thẳng yêu cầu "nhìn đẹp mắt và hiệu quả chứ không lát hết khu vực":
//
//   · HIỆU QUẢ — kinh đô là nơi nhận hàng (xem DEPOT_TYPES) và là điểm xuất phát
//     của mọi đợt hành quân, nên nó là nút có LƯU LƯỢNG cao nhất bản đồ theo đúng
//     nghĩa đen. Một tuyến từ đó đi ra được dùng bởi mọi chuyến gánh và mọi đạo quân.
//   · ĐẸP MẮT — hình sao là hình mà mọi khu định cư thật đều có, và nó đọc ra ngay
//     từ tầm nhìn đạo diễn: người xem thấy một thành phố có TRUNG TÂM, không phải
//     một đám nhà rải đều. Trước bản này bố cục thành phố chỉ nói được một điều
//     (gen `cityPlan` thẳng hàng tới đâu); giờ nó nói thêm điều thứ hai.
//   · KHÔNG LÁT HẾT — số tuyến bị chặn bởi SỐ CÔNG TRÌNH đáng nối (bảng
//     ROAD_TARGETS dưới đây cố tình BỎ nhà ở và ruộng, hai loại đông nhất), và
//     tổng số ô bị chặn cứng bởi ROAD.MAX_CELLS.
//
// Nhà ở và ruộng bị loại khỏi bảng đích không phải vì chúng không đáng — mà vì
// chúng có tới hai chục cái mỗi bộ lạc. Nối hết thì mạng đường không còn là mạng
// đường nữa, nó là một cái sân lát đá hình tròn quanh kinh đô. Đúng cái kết cục
// mà yêu cầu gốc gọi tên.
const ROAD_TARGETS = { depot: 1, barracks: 1, workshop: 1, stable: 1, tower: 1, temple: 1, infirmary: 1, heroHall: 1, wonder: 1 };

// ------------------------------------------------------------------
// NGÂN SÁCH ĐƯỜNG — trần thời đại NHÂN với gen `roadDrive` (Phase 3.28)
// ------------------------------------------------------------------
// Một hàm chứ không phải một phép nhân viết tại chỗ, vì con số này được HỎI Ở HAI
// FILE: tickRoads (còn được lát nữa không) và pickJob bên 07-ai-villager (còn phải
// tích đá cho đường không). Hai chỗ đọc hai công thức khác nhau là đúng cái hình
// dạng lỗi đã cắn ở Phase 3.27 — `foodTarget` và `wealth = food/5000` ở hai file
// không biết nhau, và một nửa quân đội bốc hơi vì thế.
//
// Hệ số 0,35 + gen (0..1) cho ra 35%-135% trần thời đại: bộ lạc `roadDrive` cao
// được phép vượt HƠN trần cũ, nếu không thì gen chỉ có một chiều là "bớt đi" và
// giá trị cao nhất không mua được gì — đúng cái bẫy "một lựa chọn không bao giờ
// thắng thì không phải một lựa chọn".
function roadBudget(tribe) {
  const cap = CONFIG.ROAD.MAX_CELLS[tribe.age] || 0;
  return Math.round(cap * (0.35 + tribe.policy.roadDrive));
}

// ------------------------------------------------------------------
// SỐ THÁP MUỐN CÓ (Phase 3.38) — cùng lý do tồn tại như `roadBudget` ngay trên:
// con số này được HỎI Ở HAI FILE (bộ não đặt móng, và pickJob tích đá cho nó), nên
// nó phải là MỘT hàm. Bản trước để hai chỗ tự tra bảng, và cả hai tra sai theo cùng
// một kiểu — lỗi trùng nhau thì không chỗ nào mâu thuẫn với chỗ nào, và vì thế
// không ai thấy.
//
// ================================================================
// VÌ SAO PHẢI SỬA: nửa "công trình" của gen `fortify` chưa từng chạy
// ================================================================
// Công thức cũ là `max(round(towerTarget + fortify*3), hạn ngạch + 1)`. Nhánh gen
// kịch trần dải khởi tạo chỉ tới `round(3 + 0,7*3) = 5`, trong khi sàn hạn ngạch
// (NEED_TOWERS ×2 từ Phase 3.35) là 5 · 9 · 15 ở đời 2 · 3 · 4. Đo 3 kỷ nguyên
// chinh phạt, ~91.500 tick:
//     đời 0-1 : nhánh gen thắng      581/581    (100%)
//     đời >=2 : sàn hạn ngạch thắng  7.817/7.817 (100%)
// Không phải "hiếm", là KHÔNG MỘT LẦN NÀO trong 7.817 mẫu. Từ Đồ Đồng trở đi, bộ
// lạc `fortify` 0 và bộ lạc `fortify` kịch trần muốn đúng cùng một số tháp — và
// "một lựa chọn không bao giờ thắng thì không phải một lựa chọn" (Phase 3.17).
// Thủ phạm không phải gen: chính bản 3.35 nhân đôi NEED_TOWERS đã nâng sàn vượt
// qua tầm với của một nhánh gen mà không ai đi đo lại.
//
// CHỮA: `fortify` cộng LÊN TRÊN cái sàn thay vì bị `max()` nuốt. Vẫn CỘNG chứ không
// NHÂN vào `towerTarget` — lập luận cũ còn nguyên giá trị: nhân thì bộ lạc
// `towerTarget` 0 vẫn ra 0 dù gen phòng thủ kịch trần, tức là giết đúng đời 0-1,
// nơi duy nhất gen còn sống.
//
// Nhưng lượng CỘNG THÊM thì phải lớn dần theo sàn. Một khoản +3 cố định là 60% ở
// đời 2 và chỉ còn 20% ở đời 4 — nghĩa là gen buông tay đúng lúc ván cờ được quyết.
// Đây là ranh giới "số tuyệt đối vs tỉ lệ" đã trả giá hai lần (sàn quân 3.30, ramp
// quyền năng 3.34): cái gì phải giữ nguyên TRỌNG SỐ khi nền văn minh lớn lên thì
// phải neo vào quy mô, không neo vào một hằng số.
//
// `|| NEED_TOWERS[age]` là vế thứ hai, và nó chữa một lỗi RIÊNG mà phép đo trên vô
// tình lôi ra: ở Hoàng Kim `NEED_TOWERS[6]` không tồn tại, nên sàn rơi từ 15 về 0.
// Đo ở đời 5: bộ lạc đang đứng với 15 tháp mà chỉ còn "muốn" 2,55 — nghĩa là từ
// giây đó trở đi, mọi cái tháp bị phá KHÔNG BAO GIỜ được dựng lại. Vành đai phòng
// thủ lặng lẽ ngừng được bảo trì đúng ở thời đại duy nhất mà đối phương có máy bắn
// đá đủ sức phá nó. Cùng họ "bảng tra thiếu một khoá" đã ba lần cho ra NaN im lặng,
// và cùng cách chữa như `CONFIG.AGE.COST[age + 1] || CONFIG.AGE.COST[age]` trong
// pickJob: lùi về bảng của bậc VỪA ĐẠT TỚI, vì một đế chế ở bậc cuối không bớt cần
// phòng thủ chỉ vì nó hết bậc để leo.
function towerWant(tribe) {
  const p = tribe.policy;
  // `+ 1` để có đệm: tháp bị phá là chuyện thường, và chạm đúng hạn ngạch rồi mất
  // một cái thì cổng thời đại đóng lại giữa chừng.
  const quota = CONFIG.AGE.NEED_TOWERS[tribe.age + 1]
             || CONFIG.AGE.NEED_TOWERS[tribe.age] || 0;
  const floor = quota ? quota + 1 : 0;
  return Math.max(Math.round(p.towerTarget), floor)
       + Math.round((p.fortify || 0) * (3 + floor * 0.5));
}

// ------------------------------------------------------------------
// CHỖ ĐẶT THÁP CANH (Phase 3.38) — bám VÀNH TƯỜNG, không dồn về nhà chính
// ------------------------------------------------------------------
// Trước bản này mọi cái tháp đều đặt bằng `queueBuild(..., home.x, home.y)`, tức
// là bốc ngẫu nhiên trong bán kính `expansion` quanh kinh đô. Hệ quả hình học:
// tháp dày nhất ở TÂM, thưa dần ra ngoài — đúng ngược với việc nó phải làm. Một
// cái tháp tầm 10 ô đứng giữa làng thì vòng tròn sát thương của nó nằm gọn trong
// đất nhà; nó chỉ bắn được khi địch ĐÃ vào tới sân, tức là sau khi tường đã thủng
// và mọi thứ nó lẽ ra bảo vệ đã bị đánh rồi.
//
// Đặt tháp ngay trong vành tường thì cùng cái tầm 10 ô ấy phủ RA NGOÀI — nó bắn
// vào đúng đám đang đục tường, tức là nó tham gia trận công thành thay vì chờ
// trận công thành kết thúc. Đây cũng là điều kiện để vòng này có nghĩa: máu tường
// vừa +50%, mà tường dày hơn chỉ kéo dài thời gian chờ nếu bên thủ không bắn được
// vào kẻ đang đục.
//
// HAI CON SỐ, và ràng buộc giữa chúng là thứ phải đúng: `INSET` 6 ô vào trong,
// `SPREAD` 4 ô bán kính tìm chỗ. Bắt buộc SPREAD < INSET — findBuildSpot tìm trong
// một HÌNH TRÒN quanh điểm neo, nên nếu bán kính tìm lớn hơn độ lún thì có những
// lượt bốc rơi RA NGOÀI vành, và một cái tháp nằm ngoài tường là một cái tháp
// không ai bảo vệ, dựng bằng tiền của bên thủ cho bên công đập. Chênh 2 ô là biên
// an toàn: mọi chỗ hợp lệ nằm trong khoảng Chebyshev [R-10, R-2] tính từ kinh đô.
//
// TWELVE CUNG, và chọn cung THƯA NHẤT. Không phải để đẹp: tháp là thứ đắt và hữu
// hạn (hạn ngạch NEED_TOWERS + gen `fortify`), nên hai cái tháp cạnh nhau là một
// cung trống ở phía đối diện. Đếm lại mỗi lần đặt móng thì vành tự rải đều mà
// không cần một bản quy hoạch nào — cùng cách `pickJob` rải người bằng phép chia
// cho số người đang làm.
//
// TIE-BREAK BẰNG CHỖ TỪNG VỠ, không phải bằng ngẫu nhiên. Cùng lập luận với
// `hitTick` của nhánh xây chồng: chỗ tường từng thủng là cách duy nhất bộ lạc biết
// hướng địch đến mà không cần một bản đồ mối đe doạ nào. Hết hạn sau 4.000 tick vì
// một cuộc chiến đã tàn thì hướng của nó cũng hết là thông tin.
function towerAnchor(tribe) {
  const R = wallRadius(tribe);
  const INSET = 6, SPREAD = 4, SLOTS = 12, MEMORY = 4000;
  const home = tribe.home;
  // Chưa có tường (Đồ Đá) hoặc vành quá hẹp để lún vào -> giữ nguyên nếp cũ.
  if (tribe.age < CONFIG.WALL.MIN_AGE || R <= INSET + SPREAD) {
    return { x: home.x, y: home.y, r: undefined };
  }
  const RR = R - INSET;
  // Điểm thứ i trên vành VUÔNG (Chebyshev — cùng hình học mà ensureWalls dựng, chứ
  // không phải một vòng tròn xấp xỉ): chạy quanh chu vi, mỗi cạnh SLOTS/4 chỗ.
  const at = (i) => {
    const u = (i + 0.5) / SLOTS, s = Math.floor(u * 4) % 4, f = u * 4 - Math.floor(u * 4);
    const a = Math.round(-RR + f * 2 * RR);
    if (s === 0) return { x: home.x + a, y: home.y - RR };
    if (s === 1) return { x: home.x + RR, y: home.y + a };
    if (s === 2) return { x: home.x - a, y: home.y + RR };
    return { x: home.x - RR, y: home.y - a };
  };
  const pts = [], count = new Array(SLOTS).fill(0);
  for (let i = 0; i < SLOTS; i++) pts.push(at(i));
  const nearestSlot = (x, y) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < SLOTS; i++) {
      const d = dist(pts[i].x, pts[i].y, x, y);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  // CHỈ ĐẾM THÁP CÒN GÁC ĐƯỢC VÀNH NÀY. Bản đầu đếm mọi cái tháp của bộ lạc, và đo
  // ra hậu quả ngay: ở Hoàng Kim khoảng cách trung bình từ tháp tới kinh đô là 21,3
  // ô trong khi vành tường đã ra tới 34 — nghĩa là cái tháp trung bình bắn xa 10 ô
  // vẫn với KHÔNG TỚI chân tường của chính nó.
  //
  // Nguyên nhân không nằm ở chỗ đặt móng mà nằm ở THỜI GIAN: vành tường dựng lại ở
  // bán kính mới mỗi lần lên đời (18 -> 22 -> 28 -> 34), còn tháp thì đứng nguyên
  // chỗ nó được xây. Một cái tháp dựng sát vành Đồ Đồng là một cái tháp nằm sâu 12
  // ô bên trong vành Hoàng Kim. Đếm cả nó thì cung ấy trông như đã có người gác, và
  // cái tháp MỚI bị đẩy sang cung khác — vành mới vì thế được lấp bằng những chỗ
  // trống của một vành đã không còn tồn tại.
  //
  // `RELEVANT` = INSET + SPREAD + 2: đúng bằng tầm với của một chỗ đặt hợp lệ quanh
  // điểm neo, cộng hai ô đệm. Tháp xa hơn thế không phải tháp hỏng — nó thành tuyến
  // trong, và đó là một vai có thật. Nó chỉ không còn được tính là đã gác vành ngoài.
  const RELEVANT = INSET + SPREAD + 2;
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.type !== 'tower' || b.hp <= 0) continue;
    const si = nearestSlot(b.x, b.y);
    if (dist(pts[si].x, pts[si].y, b.x, b.y) <= RELEVANT) count[si]++;
  }
  const br = tribe.lastBreach;
  const hot = (br && tick - br.tick < MEMORY) ? nearestSlot(br.x, br.y) : -1;
  let best = 0, bestScore = -Infinity;
  for (let i = 0; i < SLOTS; i++) {
    const score = -count[i] * 10 + (i === hot ? 6 : 0);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return { x: pts[best].x, y: pts[best].y, r: SPREAD };
}

// Tìm tuyến từ (ax,ay) tới (bx,by), né gốc cây. Trả về mảng ô hoặc null.
//
// Đi THAM LAM có men-tường, cùng thuật với moveToward — cố ý dùng lại đúng cách đi
// mà các đơn vị dùng, chứ không viết một A* riêng cho đường. Lý do là một luật đã
// phải học năm lần trong dự án này ("trường dẫn tới cái gần nhất, mục tiêu lại là
// cái khác"): nếu đường được vạch bằng một thuật toán và người thì đi bằng thuật
// toán khác, con đường sẽ chạy ở chỗ không ai đi qua. Cùng thuật thì tuyến đường
// TRÙNG với lối mà người dân vốn đã tự chọn.
//
// `seen` cấm quay lại ô cũ, và đó là thứ bảo đảm hàm này DỪNG: men-tường không có
// trí nhớ thì đi vòng quanh một khóm rừng mãi mãi. Bí thì trả null và bỏ tuyến —
// đường cái là thứ nên-có, không phải thứ phải-có, nên bỏ cuộc là một kết cục hợp lệ.
function roadRouteCells(ax, ay, bx, by, maxLen) {
  const cells = [];
  const seen = new Set();
  let x = ax, y = ay, side = 1;
  const free = (px, py) => inBounds(px, py) && !blockedAt(px, py) && !seen.has(px + ',' + py);
  for (let i = 0; i < maxLen; i++) {
    if (x === bx && y === by) return cells;
    const dx = Math.sign(bx - x), dy = Math.sign(by - y);
    let nx = x + dx, ny = y + dy;
    if (!free(nx, ny)) {
      const lx = x - dy * side, ly = y + dx * side;
      const rx = x + dy * side, ry = y - dx * side;
      if (free(lx, ly)) { nx = lx; ny = ly; }
      else if (free(rx, ry)) { nx = rx; ny = ry; side = -side; }
      else return null;
    }
    x = nx; y = ny;
    seen.add(x + ',' + y);
    cells.push({ x, y });
  }
  return null;   // dài quá maxLen: gần như luôn là đích nằm bên kia một dải rừng
}

function tickRoads(tribe, s) {
  const R = CONFIG.ROAD;
  if (tribe.age < R.MIN_AGE) return;
  if (tribe.roadCount >= roadBudget(tribe)) return;
  const drive = tribe.policy.roadDrive;
  // Nhịp lát và mức đá giữ lại đều đọc gen. Ba con số cùng một gen chứ không phải
  // ba gen: chúng là ba mặt của CÙNG một quyết định ("đá nên chảy vào mặt đường
  // bao nhiêu"), và tách ra thành nhiều gen thì tín hiệu chọn lọc bị chia nhỏ rồi
  // loãng đi — bài học đã ghi ở máy bắn đá và kỵ binh.
  const pavePer = Math.max(1, Math.round(R.PAVE_PER_BRAIN * (0.4 + drive)));
  const reserve = R.STONE_RESERVE * (2 - drive);   // drive 0 -> giữ gấp đôi; drive 1 -> đúng mức cũ

  // ---- Đang lát dở: tiếp tục ----
  if (tribe.roadPlan) {
    const plan = tribe.roadPlan;
    let laid = 0;
    while (laid < pavePer && plan.idx < plan.cells.length) {
      if (tribe.res.stone < reserve + R.STONE_PER_CELL) break;
      const c = plan.cells[plan.idx++];
      // ĐẨY `idx` TRƯỚC KHI hỏi pave, và trả tiền SAU KHI nó nhận. Thứ tự này là
      // thứ giữ cho tuyến không bao giờ đứng hình: một ô bị luật chống-phình từ
      // chối (chạy sát một tuyến cũ) vẫn được bỏ qua và tuyến đi tiếp. Nếu chờ
      // pave thành công mới tăng idx thì một tuyến chạy song song tuyến cũ sẽ
      // quay vòng ở đúng ô đó tới hết kỷ nguyên — không tốn tiền, nhưng khoá luôn
      // ngân sách đường của bộ lạc vì `roadPlan` không bao giờ rỗng.
      if (pave(c.x, c.y, tribe.id)) {
        tribe.res.stone -= R.STONE_PER_CELL;
        tribe.roadCount++;
        laid++;
      }
    }
    if (plan.idx >= plan.cells.length) {
      tribe.roadLinked.push(plan.toId);
      tribe.roadPlan = null;
    }
    return;
  }

  // ---- Chọn tuyến mới ----
  // Chỉ khởi công khi đá đã dư HẲN so với mức dự trữ: một tuyến 40 ô ăn 64 đá, và
  // đá là thứ gác cửa cả thời đại lẫn Kỳ quan. Đường cái không được phép là lý do
  // một bộ lạc đứng lại ở Đồ Sắt.
  if (tribe.res.stone < reserve * 2) return;
  const home = tribe.home;
  let best = null, bestD = -1;
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.hp <= 0 || !b.done) continue;
    if (!ROAD_TARGETS[b.type]) continue;
    if (tribe.roadLinked.includes(b.id)) continue;
    const d = dist(home.x, home.y, b.x, b.y);
    if (d < R.MIN_LEN || d > R.MAX_LEN) continue;
    // XA NHẤT TRƯỚC, không phải gần nhất. Một tuyến dài tiết kiệm được nhiều
    // quãng đường hơn, và quan trọng hơn: nó đi XUYÊN QUA vùng mà các công trình
    // gần hơn đang đứng, nên những công trình đó cũng hưởng ké mà không tốn tuyến
    // riêng nào. Nối gần nhất trước thì được đúng cái ngược lại — một chùm cuống
    // ngắn quanh kinh đô, không cái nào dẫn tới đâu.
    if (d > bestD) { bestD = d; best = b; }
  }
  if (!best) return;
  const cells = roadRouteCells(home.x, home.y, best.x, best.y, R.MAX_LEN + 20);
  if (!cells || cells.length < R.MIN_LEN) {
    // Không vạch nổi tuyến (rừng chắn kín) — ghi vào sổ đã-nối để nhịp bộ não sau
    // không thử lại đúng cái đích đó mãi mãi. Cùng một cách chữa với sổ đen `u.avoid`
    // của người dân bỏ mỏ: không nhớ lần thất bại thì lần chọn sau ra đúng kết quả cũ.
    tribe.roadLinked.push(best.id);
    return;
  }
  tribe.roadPlan = { cells, idx: 0, toId: best.id };
}

// NGƯỜI TRƯỚC, MÓNG SAU (Phase 3.35). Thứ tự cũ là: trả tiền → đặt móng → đi tìm
// thợ → tìm không ra cũng thôi. Đo 42.000 tick: 21% thời gian-móng là công trường
// không có một người thợ nào. Vì `bcount` đếm cả móng dở, bộ não tin rằng mình ĐÃ
// CÓ công trình đó và không bao giờ đặt lại — nên mỗi lần như vậy vừa mất tài
// nguyên vừa nuốt luôn một quyết định xây dựng, cả hai đều không báo gì.
//
// `freeBuilders` hỏi ĐÚNG câu mà assignBuilders sẽ hỏi vài dòng sau, không phải
// một câu gần giống: một bộ lọc thứ hai lệch một điều kiện là cánh cửa lại mở ra
// đúng cái nó vừa đóng. Đó là lý do hai chỗ dùng chung một hàm chứ không chép.
function freeBuilders(tribe) {
  let n = 0;
  for (const u of units) {
    if (u.tribeId === tribe.id && u.type === 'villager' && u.hp > 0 && u.task !== 'build') n++;
  }
  return n;
}

function queueBuild(tribe, type, biasX, biasY, forceR) {
  const spec = CONFIG.BUILD[type];
  if (!unlockedBuild(tribe, type)) return false;
  // GIÁ THẬT của bộ lạc NÀY ở thời đại NÀY — xem buildCost. Tính đúng một lần rồi
  // dùng cho cả ba việc (hỏi đủ tiền · trả tiền · ghi sổ để hoàn): tra lại bảng giá
  // ở mỗi chỗ là mở đường cho ba con số lệch nhau, và với tháp canh thì chúng lệch
  // thật ngay khi bộ lạc lên đời.
  const cost = buildCost(tribe, type);
  if (!canAfford(tribe, cost)) return false;
  // Không có ai rảnh để đi xây thì KHÔNG đặt móng và KHÔNG trả tiền. Hỏi trước cả
  // findBuildSpot vì đây là câu rẻ hơn nhiều và nó phủ định cả hai câu còn lại.
  if (freeBuilders(tribe) === 0) return false;
  const spot = findBuildSpot(tribe, type, biasX, biasY, forceR);
  if (!spot) return false;
  pay(tribe, cost);
  const b = spawnBuilding(tribe, type, spot.x, spot.y, false);
  b.paid = cost;                  // hoàn đúng số đã trả, không tra lại bảng giá
  // Tick mà công trường này lần cuối có người đứng xây. Khởi tạo bằng `tick` chứ
  // không phải 0: khai bằng 0 thì mọi móng vừa đặt đều đã "bỏ hoang 420 tick" ngay
  // ở giây đầu — cùng một cái bẫy mà `hitTick: -99999` đã phải tránh ở spawnBuilding.
  b.tendedAt = tick;
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
  abandonDeadSites(tribe, sites);
}

// ------------------------------------------------------------------
// DỠ MÓNG, HOÀN TIỀN — vế thứ hai của "móng phải có người" (Phase 3.35)
// ------------------------------------------------------------------
// Cơ chế cứu công trường ngay trên chỉ cứu tối đa 5 lượt rồi BỎ MẶC, và cái nó bỏ
// mặc thì nằm lại vĩnh viễn: móng không tự mất, `bcount` vẫn đếm nó, nên bộ lạc
// vừa mất tài nguyên vừa mất luôn quyền đặt lại công trình đó tới hết kỷ nguyên.
// Trần 5 lượt là đúng — nó chặn vòng lặp "chạy vòng mãi mãi" — nhưng nó chỉ giải
// nửa bài toán, và nửa còn lại đứng im ở đó suốt bốn bản.
//
// Đo bằng `tendedAt` (lần cuối có người ĐỨNG trên công trường) chứ không bằng
// "có ai được cử tới không": một cái móng đặt sau một dải rừng kín luôn có người
// được cử, họ chỉ không bao giờ tới nơi. Phân biệt hai chuyện đó chính là toàn bộ
// giá trị của dấu `tendedAt`.
//
// Chỉ dỡ móng ở 0% — đã có một tick lao động nào đổ vào thì đó là một công trường
// thật đang bị gián đoạn, và dỡ nó là ném đi phần đã làm.
function abandonDeadSites(tribe, sites) {
  const LIMIT = CONFIG.BUILD.ABANDON_TICKS;
  for (const b of sites) {
    if (b.progress > 0 || tick - (b.tendedAt || tick) < LIMIT) continue;
    if (b.stacking) {
      // Tháp đang xây chồng thì KHÔNG phá — nó là một cái tháp đang đứng. Trả nó về
      // trạng thái hoạt động ở đúng cấp cũ: một cái tháp tắt điện vĩnh viễn vì công
      // trường tầng hai không ai tới là hậu quả tệ hơn hẳn cái nó đang sửa.
      b.stacking = false;
      b.done = true;
      b.progress = b.buildTicks;
      b.buildTicks = CONFIG.BUILD.tower.buildTicks;
      b.hp = Math.min(b.maxHp, Math.max(b.hp, b.maxHp * 0.5));
      refund(tribe, b.paid || towerStackCost(b.level || 1, tribe));
      logEvent(TL('🏯 {tribe} bỏ dở tầng tháp — tháp cũ trở lại canh gác', { tribe: tribe.name }), tribe.color);
      continue;
    }
    // HOÀN ĐÚNG SỐ ĐÃ TRẢ (`b.paid`), không tra lại bảng giá. Với mười hai loại
    // công trình còn lại thì hai cách cho cùng kết quả, nhưng giá tháp canh nay đổi
    // theo thời đại: một bộ lạc lên đời trong lúc cái móng nằm bỏ hoang sẽ được hoàn
    // NHIỀU HƠN số nó bỏ ra — một cỗ máy in tài nguyên nhỏ, chạy im lặng, và chỉ lộ
    // ra khi ai đó đi đếm kho. `|| cost` để những móng đặt trước bản này (không có
    // trường `paid`) vẫn hoàn được.
    refund(tribe, b.paid || buildCost(tribe, b.type));
    // GỌI destroyBuilding TRƯỚC khi hạ máu, và thứ tự đó làm đúng hai việc cùng lúc:
    //   · Nó dọn những thứ chỉ hàm này biết — quan trọng nhất là `wonderStarted`.
    //     Bỏ qua thì một móng Kỳ quan bị dỡ sẽ khoá bộ lạc đó khỏi Kỳ quan tới hết
    //     kỷ nguyên, và không có gì nói ra điều đó.
    //   · Ở thời điểm gọi, `hp > 0` và `done === false`, nên nhánh phế tích + tiếng
    //     nổ bên trong nó KHÔNG chạy. Đúng như phải thế: một cái móng được dỡ đi
    //     không để lại đống đổ nát, nó chỉ biến mất cùng đám cọc.
    destroyBuilding(b);
    b.hp = 0;                       // vòng lọc cuối tick dọn nó đi, đúng đường mà mọi công trình chết đi qua
    logEvent(TL('🚧 {tribe} dỡ móng {build} bỏ hoang — hoàn lại vật liệu', { tribe: tribe.name, build: () => CONFIG.BUILD[b.type].label }), tribe.color);
  }
}

// Ngược của `pay`. Viết ra thành hàm riêng dù chỉ có ba dòng, vì mọi đường hoàn
// tiền sau này phải cộng vào ĐÚNG những khoá mà bảng giá có — cộng tay ở chỗ gọi
// là cách chắc chắn nhất để một loại tài nguyên bị bỏ quên khi bảng giá đổi.
function refund(tribe, cost) {
  for (const k in cost) tribe.res[k] = (tribe.res[k] || 0) + cost[k];
}

// ============================================================
// DỰNG KHO Ở ĐÂU — quyết định theo QUÃNG ĐƯỜNG THẬT, không theo một chỉ tiêu số
// ============================================================
// Cách hiển nhiên là "muốn N cái kho theo dân số" — cùng khuôn với ruộng và tháp.
// Không làm thế, vì kho khác về bản chất: giá trị của nó không nằm ở SỐ LƯỢNG mà
// nằm ở VỊ TRÍ. Hai cái kho dựng cạnh kinh đô đúng bằng không có cái nào, còn một
// cái đặt đúng giữa vạt quả cách nhà 30 ô thì cắt đôi thời gian của cả đội hái.
// Một chỉ tiêu đếm đầu sẽ hài lòng với hai cái kho vô dụng.
//
// Nên bộ não hỏi đúng câu mà người dân đang chịu: "đám dân đang làm việc của tôi
// phải gánh xa bao nhiêu". Lấy TRỌNG TÂM của những người đang đứng thu hoạch mà
// cách kho gần nhất quá xa, rồi đặt kho ở đó.
//
// Trọng tâm chứ không phải người xa nhất: người xa nhất là một cá thể, hoàn toàn
// có thể là kẻ vừa lang thang sang tận nửa kia bản đồ, và đặt kho theo nó là đặt
// hậu cần vào giữa hư không. Trọng tâm của cả nhóm thì trỏ vào chỗ ĐÔNG NGƯỜI
// nhất — đúng nơi một cái kho trả lời được nhiều chuyến gánh nhất.
//
// Ngưỡng theo `expansion`: bộ lạc co cụm chấp nhận gánh xa hơn trước khi chịu bỏ
// gỗ ra, bộ lạc bành trướng dựng sớm. Lại là một gen đã có được cấp thêm một biểu
// hiện, không phải một gen mới.
// ============================================================
// LẬP ĐÔ TRÊN ĐẤT VỪA CHIẾM — xem CONFIG.COLONY
// ============================================================
// Quyền lập đô được cấp ở dealDamage (chỗ duy nhất còn biết AI đã hạ kinh đô ai)
// và tiêu ở đây. Thứ tự trong hàm là thứ tự "rẻ trước": ba phép so số trước khi
// động tới `findBuildSpot`, hàm đắt nhất trong cả bộ não.
function maybeFoundColony(tribe, s) {
  const C = CONFIG.COLONY;
  if (!tribe.claims.length) return;
  // Phế tích nguội thì hết quyền. Bỏ từ ĐẦU mảng vì mảng được đẩy theo thời gian
  // nên nó đã tự sắp xếp — không cần quét cả mảng mỗi nhịp bộ não.
  while (tribe.claims.length && tick - tribe.claims[0].at > C.TTL) tribe.claims.shift();
  if (!tribe.claims.length) return;
  if (s.bcount.town >= C.MAX_TOWNS) return;
  const p = tribe.policy;
  if (p.colonize < C.MIN_DRIVE) return;

  // ĐỆM TÀI NGUYÊN THEO GEN, không phải một ngưỡng cứng. Cùng cách làm với
  // `cushion` của Kỳ quan, và cùng lý do: một câu `if (colonize > 0.5)` biến gen
  // thành hai trạng thái, mà chọn lọc trên hai trạng thái thì gần như không có
  // gradient để leo. Trộn liên tục thì mỗi nấc gen cho một mức dè dặt khác nhau,
  // và đường trôi của nó qua các kỷ nguyên mới có gì để đọc.
  //
  // Đây cũng là chỗ đánh đổi thật sự nằm: 250 gỗ ngay sau một cuộc chiến là 7 căn
  // nhà ở KHÔNG được xây, đúng vào lúc bộ lạc cần hồi dân số nhất.
  const cushion = 1 + (1 - p.colonize) * 1.6;
  const cost = CONFIG.BUILD.town.cost;
  for (const k in cost) if (tribe.res[k] < cost[k] * cushion) return;

  const c = tribe.claims[0];
  if (queueBuild(tribe, 'town', c.x, c.y, C.SPOT_R)) {
    tribe.claims.shift();
    const victim = tribes[c.from];
    logEvent(TL('🏯 {tribe} LẬP ĐÔ trên nền kinh đô cũ của {victim}', { tribe: tribe.name, victim: victim ? victim.name : () => T('kẻ bại trận') }), tribe.color, true);
    addHotspot(c.x, c.y, 10, TL('{tribe} lập đô trên đất chiếm', { tribe: tribe.name }));
  }
}

// ------------------------------------------------------------------
// NEO LẠI KINH ĐÔ khi cái đô đang neo đã sập
// ------------------------------------------------------------------
// `tribe.home` là mốc của bốn thứ: lưới quy hoạch, cờ tập kết, gốc mọi tuyến
// đường, và tâm vòng xoắn ốc tìm chỗ xây. Trước Phase 3.28 nó chỉ được dời khi
// bộ lạc mất SẠCH nhà chính — đúng, vì bộ lạc chỉ có một cái.
//
// Từ khi có đô lập, "mất nhà chính" và "mất sạch nhà chính" là hai chuyện khác
// nhau: một bộ lạc bị san phẳng kinh đô gốc mà vẫn còn đô tiền tuyến sẽ đi tiếp
// cả kỷ nguyên với `home` trỏ vào một vạt phế tích giữa lãnh thổ đã mất — nó lát
// đường từ hư không, quy hoạch nhà quanh hư không, và dồn quân về hư không.
// Không có gì báo lỗi; nó chỉ trông như một bộ lạc bỗng nhiên chơi rất ngu.
function reanchorHome(tribe) {
  let best = null, bestD = Infinity;
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.hp <= 0 || b.type !== 'town') continue;
    const d = dist(b.x, b.y, tribe.home.x, tribe.home.y);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (!best) return;                       // không còn đô nào — nhánh dựng lại lo
  if (bestD <= 10) return;                 // vẫn còn một cái đô ngay tại mốc cũ
  tribe.home = { x: best.x, y: best.y };
  tribe.rally = { x: best.x, y: best.y + best.size + 1 };
  // Xoá sổ đã-nối: mọi tuyến đường cũ mọc từ mốc cũ, nên từ mốc mới thì không
  // công trình nào còn "đã có đường tới" theo nghĩa đang dùng.
  tribe.roadLinked = [];
  tribe.roadPlan = null;
  logEvent(TL('{tribe} dời đô về {x},{y}', { tribe: tribe.name, x: best.x, y: best.y }), tribe.color);
}

const DEPOT_MIN_HAUL = 18;      // dưới ngần này ô thì gánh thẳng về còn rẻ hơn xây kho
function maybeBuildDepot(tribe, s) {
  if (!unlockedBuild(tribe, 'depot')) return;
  if (!canAfford(tribe, CONFIG.BUILD.depot.cost)) return;
  // Trần mềm theo dân số: mỗi ~14 dân thường nuôi nổi thêm một đầu mối hậu cần.
  // Không có trần thì mỗi lần một nhóm dân đi xa là bộ não lại đặt thêm một móng,
  // và gỗ chảy hết vào kho thay vì vào nhà ở.
  if (s.bcount.depot >= 1 + Math.floor(s.villagers / 14)) return;

  let sx = 0, sy = 0, n = 0;
  for (const u of units) {
    if (u.tribeId !== tribe.id || u.type !== 'villager' || u.hp <= 0) continue;
    if (u.task !== 'gather' && u.task !== 'seek') continue;
    findNearestDepot(u.x, u.y, tribe.id);
    if (depotDropEdge < DEPOT_MIN_HAUL) continue;
    sx += u.x; sy += u.y; n++;
  }
  // Cần một NHÓM, không phải một người: 3 là số nhỏ nhất mà "trọng tâm" còn có
  // nghĩa. Dưới đó thì cái kho phục vụ một hai người và không bao giờ hoàn vốn.
  if (n < 3) return;
  queueBuild(tribe, 'depot', Math.round(sx / n), Math.round(sy / n));
}

function tribeBrain(tribe) {
  const s = computeTribeStats(tribe);
  // Xếp lại hàng ngũ theo số người CÒN SỐNG — xem reassignFormation. Đặt ở đây,
  // đầu nhịp bộ não, vì đây là chỗ duy nhất trong game chạy đúng một lần mỗi
  // BRAIN_INTERVAL cho mỗi bộ lạc còn sống.
  reassignFormation(tribe);

  // ---- Sống còn: mất nhà chính thì ưu tiên tuyệt đối dựng lại ----
  if (s.bcount.town === 0 && s.villagers > 0) {
    const anyVillager = units.find(u => u.tribeId === tribe.id && u.type === 'villager' && u.hp > 0);
    if (anyVillager) {
      tribe.home = { x: anyVillager.x, y: anyVillager.y };
      tribe.rally = { x: anyVillager.x, y: anyVillager.y };
    }
    if (queueBuild(tribe, 'town')) logEvent(TL('{tribe} dựng lại nhà chính ở vùng đất mới', { tribe: tribe.name }), tribe.color);
  } else {
    // Còn ít nhất một đô: kiểm xem cái đang neo `home` có còn đứng không.
    reanchorHome(tribe);
  }
  // Lập đô trên đất chiếm. Đặt ngay sau khối sống-còn ở trên và TRƯỚC mọi việc
  // xây dựng khác: nó là khoản chi gỗ đắt nhất trong cả bộ não (250), mà mỗi lời
  // gọi queueBuild trả tiền NGAY — nên thứ đứng trước ăn gỗ trước. Đứng sau nhà ở
  // và ruộng thì quyền lập đô sẽ hết hạn trước khi tới lượt, ở đúng những bộ lạc
  // đang đánh nhau nhiều nhất (tức là đang xây nhiều nhất).
  maybeFoundColony(tribe, s);

  // ---- Xây dựng ----
  const p = tribe.policy;
  // Nhặt lại thợ cho mọi công trường đang bỏ hoang TRƯỚC khi đặt thêm móng mới:
  // đặt sau thì mấy cái móng vừa đặt xong ở dưới sẽ hút hết dân rảnh, và cái
  // công trường cũ vẫn đứng đó thêm một nhịp bộ não nữa.
  rescueOrphanSites(tribe);
  // TRẦN DÂN SỐ: đọc CONFIG.ECON.POP_HARD_CAP, không phải một con số viết cứng ở
  // đây. Trước 3.30 nó là số 420 gõ thẳng vào dòng if này, trong khi `computeTribeStats`
  // KHÔNG kẹp gì cả — nên "trần" chỉ là một điều kiện ngừng xây nhà, không phải một
  // trần thật: bộ lạc vẫn có thể vượt qua nó bằng cách chiếm thêm kinh đô. Hai chỗ
  // hiểu khác nhau về cùng một luật đúng là họ lỗi hai-nguồn-sự-thật, nên giờ chỉ
  // còn một hằng số và `computeTribeStats` mới là nơi thi hành nó.
  if (s.pop >= s.popCap - p.houseBuffer && s.popCap < CONFIG.ECON.POP_HARD_CAP) {
    queueBuild(tribe, 'house');
  }
  // KHO ĐI TRƯỚC RUỘNG, và thứ tự này là một quyết định chứ không phải sắp xếp cho
  // gọn: mỗi lời gọi queueBuild TRẢ TIỀN NGAY, nên thứ đứng trước ăn gỗ trước. Đo
  // bản đặt kho sau ruộng: cái kho đầu tiên dựng xong ở tick 521-2401 (trung vị
  // 1121), tức là cả nghìn tick đầu của mọi kỷ nguyên trôi qua với dân gánh hàng
  // 22-35 ô mỗi chiều — đúng quãng thời gian mà nền kinh tế còn nhỏ nhất và một
  // chuyến gánh phí phạm đắt nhất.
  //
  // Ruộng thì chờ được: bụi quả trong bộ khởi đầu đủ nuôi vài nghìn tick đầu, và
  // ruộng chỉ thật sự cần khi quả bắt đầu cạn.
  maybeBuildDepot(tribe, s);
  if (s.bcount.farm < Math.round(p.farmTarget) && s.villagers >= 4) queueBuild(tribe, 'farm');
  // Gỗ dư mà không có gì tiêu -> đổi thành ruộng. Bản đầu có bộ lạc tồn kho gần
  // 5000 gỗ trong khi chết đói: gen chiến lược của họ đặt farmTarget thấp, và
  // không có luật nào cho phép vượt qua chính gen đó. Đây là "phản xạ" nằm ngoài
  // gen — mọi bộ lạc đều biết, giữ cho một gen tồi không tự sát ngay lập tức.
  if (tribe.res.wood > 700 && s.bcount.farm < Math.round(p.farmTarget) * 2 + 3 && s.villagers >= 4) {
    queueBuild(tribe, 'farm');
  }
  // ============================================================
  // SỐ LÒ QUÂN — gen `garrison` (Phase 3.28)
  // ============================================================
  // Trước bản này ba dòng dưới đây đều là `=== 0`: mỗi loại đúng MỘT cái, mãi mãi,
  // ở mọi bộ lạc, mọi kỷ nguyên. Đó là hệ quả trực tiếp của việc vòng huấn luyện
  // cũ chỉ dùng một công trình nguồn — xây cái thứ hai không nhanh thêm một tick
  // nào, nên bộ não không có lý do gì để muốn nó.
  //
  // Giờ mỗi công trình là một cái lò riêng, và câu hỏi "muốn ra quân nhanh tới
  // đâu" mới có chỗ để trả lời. Công thức đọc CẢ dân số: một bộ lạc 30 dân không
  // nuôi nổi ba trại lính, còn một bộ lạc 150 dân mà chỉ có một cái thì cả nửa
  // ngân sách quân sự của nó nằm xếp hàng.
  //
  // Trần 4 / 3 / 3 là trần CỨNG, không co giãn. Lý do: qua ngưỡng đó thì cái chặn
  // không còn là tốc độ ra lò nữa mà là tiền và trần dân số — thêm lò thứ năm chỉ
  // là 140 gỗ đổi lấy một toà nhà đứng không. Một khoản chi không mua được gì thì
  // nó không phải một lựa chọn, nó là một cái bẫy cho gen cao.
  const forgeScale = p.garrison * (0.6 + s.pop / 70);
  const wantBarracks = p.militaryRatio > 0.08 ? clamp(Math.round(forgeScale), 1, 4) : 0;
  // Villager gate leo theo SỐ LÒ ĐÃ CÓ: cái đầu tiên cần 8 dân, cái thứ hai 15,
  // thứ ba 22. Không có nó thì một bộ lạc 9 dân với gen cao sẽ đặt móng ba cái
  // trại lính cùng lúc và không cái nào có thợ — đúng cái "công trường mồ côi" mà
  // rescueOrphanSites đang phải dọn.
  if (s.bcount.barracks < wantBarracks && s.villagers >= 8 + s.bcount.barracks * 7) {
    queueBuild(tribe, 'barracks');
  }
  // TƯỚNG PHỦ — cửa duy nhất ra anh hùng từ Phase 3.28.
  //
  // Ngưỡng 0,3 trên `heroDrive` chứ không phải một điều kiện luôn-đúng: đây chính
  // là chỗ "có nuôi anh hùng không" trở thành một quyết định thay vì một thứ tự
  // động bật lên khi đủ tiền. Một bộ lạc gen thấp đi hết kỷ nguyên không có tướng,
  // và đó là một ván chơi hợp lệ.
  //
  // KHÔNG đòi có trại lính trước. Bài học "hai cái cổng thì xác suất NHÂN chứ
  // không cộng" đã trả giá bốn lần trong dự án này, và ở đây nó nặng nhất: chặn
  // thêm một cửa là xoá bớt một phần vòng tiến hoá thứ hai khỏi ván chơi.
  if (s.bcount.heroHall === 0 && CONFIG.HERO.ENABLED && p.heroDrive > 0.3 && s.villagers >= 6) {
    queueBuild(tribe, 'heroHall', tribe.home.x, tribe.home.y);
  }
  // SỐ THÁP MUỐN CÓ = sàn bắt buộc CỘNG phần gen muốn thêm — xem `towerWant`, nơi
  // cả công thức lẫn phép đo đã bác bỏ công thức cũ được ghi lại.
  //
  // Sàn cứng ấy là nửa thứ hai của cơ chế NEED_TOWERS — không có nó thì một bộ lạc
  // `towerTarget` thấp sẽ đứng trước cổng Đồ Sắt với đủ tiền, đủ mọi thứ, và không
  // bao giờ hiểu ra rằng thứ nó thiếu là hai cái tháp mà chính gen của nó bảo đừng
  // xây. Một điều kiện mà AI không biết cách thoả mãn thì nó không phải một cổng,
  // nó là một bức tường — đúng cái phân biệt đã ghi ở bảng AGE.COST.
  //
  // Hai gen vẫn thật sự độc lập: `towerTarget` là sở thích công trình (nó quyết một
  // mình ở đời 0-1, khi chưa có hạn ngạch nào), `fortify` là cả một chiến lược (nó
  // quyết phần vượt sàn, ở mọi thời đại). Một bộ lạc có thể tới cùng con số tháp
  // bằng hai con đường khác hẳn nhau về kinh tế.
  const wantTowers = towerWant(tribe);
  if (s.bcount.tower < wantTowers && s.bcount.barracks > 0) {
    // Neo vành tường TRƯỚC, kinh đô là đường lui. Cái đường lui ấy bắt buộc phải
    // có: `towerAnchor` bó chỗ tìm xuống một hình tròn 4 ô, và một cung vành đầy
    // cây hoặc đã kín nhà sẽ trả về null — mà tháp canh là ĐIỀU KIỆN LÊN ĐỜI
    // (NEED_TOWERS), nên một lần thất bại im lặng ở đây là một bộ lạc đứng mãi
    // trước cổng thời đại. Đúng họ "một cơ chế thất bại không tiếng động là một cơ
    // chế không tồn tại" đã ghi ở chính findBuildSpot.
    //
    // Không sợ trả tiền hai lần: mọi nhánh thoát sớm của queueBuild đều nằm TRƯỚC
    // `pay`, nên lượt hỏng không rút ví.
    const a = towerAnchor(tribe);
    if (!queueBuild(tribe, 'tower', a.x, a.y, a.r)) {
      queueBuild(tribe, 'tower', tribe.home.x, tribe.home.y);
    }
  } else if (s.bcount.tower > 0 && s.bcount.barracks > 0) {
    // ĐÃ ĐỦ SỐ THÁP -> chuyển sang XÂY CHỒNG (xem CONFIG.BUILD.TOWER_STACK).
    //
    // Thứ tự này là cả nội dung của quyết định: rộng trước, cao sau. Cho phép xây
    // chồng khi còn chưa đủ hạn ngạch thì một bộ lạc có thể lên tới tầng 3 mà vẫn
    // đứng trước cổng Đồ Sắt vì thiếu tháp — hạn ngạch NEED_TOWERS đếm SỐ THÁP,
    // và một cái tháp ba tầng vẫn là một cái tháp. Đúng họ "một cơ chế mới lặng lẽ
    // khoá một cơ chế cũ" đã cắn ở hạng mục no đủ của đá.
    //
    // CHỌN CÁI NÀO: cái ĐÃ TỪNG ĂN ĐÒN nhưng ĐANG YÊN. Hai vế đều cần thiết —
    // "từng ăn đòn" là cách duy nhất bộ lạc biết hướng nào là hướng địch đến mà
    // không cần một bản đồ mối đe doạ nào; "đang yên" là vì lên tầng thì tháp câm
    // suốt quãng xây, nên gia cố đúng lúc đang bị vây là tự bịt miệng súng của
    // mình. Người xem đọc được cả hai vế trên bản đồ: cái tháp cao lên là cái tháp
    // ở hướng vừa có trận đánh.
    // QUÃNG NGUỘI trước khi dám gia cố: 600 tick với bộ lạc `fortify` 0, xuống còn
    // 240 với bộ lạc kịch trần. Đây là nửa thứ hai của gen phòng thủ — không chỉ
    // XÂY NHIỀU HƠN mà còn dám gia cố SỚM HƠN sau một trận, tức là chấp nhận rủi
    // ro "tháp câm lặng" mà chú thích ngay dưới vừa cảnh báo.
    const cool = 600 - (p.fortify || 0) * 360;
    let busy = false, cand = null, bestScore = -Infinity;
    for (const b of buildings) {
      if (b.tribeId !== tribe.id || b.type !== 'tower') continue;
      if (b.stacking) { busy = true; break; }
      if (!canStackTower(b)) continue;
      if (tick - b.hitTick < cool) continue;
      const score = (b.hitTick > 0 ? 1000 : 0) - dist(b.x, b.y, tribe.home.x, tribe.home.y);
      if (score > bestScore) { bestScore = score; cand = b; }
    }
    if (!busy && cand) startTowerStack(tribe, cand);
  }
  // Xưởng thợ: chỉ xây nếu gen thật sự muốn quân tầm xa. Đây là chỗ cây công nghệ
  // trở thành một LỰA CHỌN chứ không phải một dãy nút bấm theo thứ tự — một bộ lạc
  // rangedRatio thấp sẽ lên tới Hoàng Kim mà vẫn chỉ có bộ binh, và điều đó có thể
  // đúng hoặc sai tuỳ nó gặp ai.
  //
  // Số lượng đọc `garrison` như trại lính, nhưng nhân 0,7: xưởng thợ đắt hơn
  // (175 gỗ + 55 đá) và loại quân của nó ra lò chậm gấp ba, nên cái xưởng thứ hai
  // trả lời một nút thắt thật, còn cái thứ tư thì không.
  const wantWorkshop = p.rangedRatio > 0.12 ? clamp(Math.round(forgeScale * 0.7), 1, 3) : 0;
  if (s.bcount.workshop < wantWorkshop && s.bcount.barracks > 0
      && s.villagers >= 10 + s.bcount.workshop * 9) {
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
  //
  // Nhân 0,6 — thấp nhất trong ba loại lò. Kỵ binh và voi chiến là quân ĐẮT NHẤT
  // bảng về tài nguyên, nên cái chuồng ngựa thứ hai chỉ đáng khi bộ lạc thật sự
  // nuôi nổi hai dòng ngựa cùng lúc, và điều đó cần cả `garrison` lẫn dân số cao.
  const wantStable = p.militaryRatio > 0.18 ? clamp(Math.round(forgeScale * 0.6), 1, 3) : 0;
  if (s.bcount.stable < wantStable && s.bcount.barracks > 0
      && s.villagers >= 12 + s.bcount.stable * 11) {
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
  //
  // Ngưỡng hạ 0,30 -> 0,22 sau khi đo: trong 3 kỷ nguyên (10.831 tick) chỉ ĐÚNG
  // MỘT trong bốn bộ lạc từng dựng nổi một trạm xá, và đều là bộ lạc thắng cuộc.
  // Không phải vì gen quá thấp mà vì ba cái cổng nhân với nhau — Đồ Đồng × có
  // trại lính × discipline — đúng cùng phép nhân xác suất đã bắt được ở chuồng
  // ngựa (ngưỡng 0,22 -> 0 chuồng nào trong cả kỷ nguyên) và ở đền thờ (khoá ở
  // Đồ Sắt -> 3/4 bộ lạc chưa từng dâng một lễ nào). Một cơ chế mà chỉ kẻ đang
  // thắng mới với tới được thì nó không đổi được kết cục của ván nào cả.
  const wantMedics = s.bcount.barracks > 0 && p.discipline > 0.22
    ? (s.soldiers >= 18 ? 2 : 1) : 0;
  if (s.bcount.infirmary < wantMedics) queueBuild(tribe, 'infirmary', tribe.home.x, tribe.home.y);
  // Đền thờ: số lượng do gen THÀNH TÂM quyết định. Ban đầu tôi cố tình KHÔNG cho
  // nó gen, vì đền thờ chưa có đánh đổi nào đáng chọn. Hệ thống tế phẩm đã tạo ra
  // đánh đổi đó: mỗi Đền thờ là một cỗ máy đều đặn đốt lương thực và vàng để đổi
  // lấy thứ chỉ có giá trị NẾU Chúa Tể đáp lời. Giờ thì gen là chính đáng.
  // Nhà cầu nguyện có từ Đồ Đá nên gen `piety` bắt đầu tốn tiền NGAY từ đầu kỷ
  // nguyên — đúng chỗ mà một gen cần trả giá thì mới có gì để chọn lọc.
  // NHÀ CẦU NGUYỆN NAY CÓ HAI KHÁCH HÀNG, và dòng `Math.max` là thứ giữ cho cơ chế
  // hậu cần khỏi chết trong bụng mẹ. Từ Phase 3.33 công trình này là lò ra ĐỘI HẬU
  // CẦN và là nhà chủ quản của nhánh Quân nhu — nhưng số lượng của nó thì vẫn do
  // gen `piety` quyết. Nghĩa là một bộ lạc `expedition` cao mà `piety` thấp sẽ
  // KHÔNG BAO GIỜ có một đội hậu cần nào, dù nó là bộ lạc cần nhất.
  //
  // Đó đúng là "hai cái cổng thì xác suất NHÂN chứ không cộng" ở dạng tinh vi nhất
  // của nó: cái cổng thứ hai ở đây không phải một điều kiện `if` mà là một GEN
  // KHÁC. Hai gen độc lập cùng phải cao thì tần suất là tích của hai xác suất, và
  // cả cơ chế mới sẽ chỉ xuất hiện ở khoảng một phần tư số bộ lạc — đúng con số đã
  // đo được ở đền thờ (3/4 bộ lạc chưa từng dâng một lễ nào) và ở chuồng ngựa (0
  // cái nào trong cả một kỷ nguyên).
  const wantShrines = Math.max(
    Math.round(p.piety * 4),
    // Một cái là đủ cho cả nhánh nghiên cứu lẫn cái lò — không nhân theo
    // `expedition` ở đây, vì số ĐỘI HẬU CẦN mới là chỗ gen ấy phải nói.
    unlockedUnit(tribe, 'quarter') && p.expedition > 0.3 ? 1 : 0);
  if (s.bcount.shrine < wantShrines && s.villagers >= 5) queueBuild(tribe, 'shrine', tribe.home.x, tribe.home.y);
  const wantTemples = Math.round(p.piety * 2);
  if (s.bcount.temple < wantTemples) queueBuild(tribe, 'temple', tribe.home.x, tribe.home.y);

  tickRoads(tribe, s);

  // ---- Lên thời đại ----
  // ageRush cao = chịu nhịn (giữ dự trữ thấp cũng vẫn lên); ageRush thấp = chỉ lên
  // khi đã dư dả hẳn. Đây là đánh đổi thật: lên sớm thì quân mạnh hơn nhưng cạn
  // kho ngay lúc dễ bị đánh úp nhất.
  const ageCost = CONFIG.AGE.COST[tribe.age + 1];
  if (ageCost && !ageBlock(tribe) && canAfford(tribe, ageCost)) {
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
      // MÁU CÔNG TRÌNH LEO THEO THỜI ĐẠI TỪ PHASE 3.35 — và nó phải được rót vào
      // những toà nhà ĐANG ĐỨNG, không chỉ những toà xây sau. Bỏ dòng này thì thành
      // phố cũ giữ nguyên máu cũ và cả cơ chế chỉ chạm được vào phần mở rộng: một
      // bộ lạc lên đời rồi ngừng xây sẽ không nhận được gì cả. `refreshBuildingHp`
      // đã giải đúng bài này cho nhánh Nề đá (cộng THẲNG vào máu hiện tại, không
      // chỉ nới trần), nên ở đây chỉ cần gọi đúng nó — và đợt trùng tu sáng loá
      // ngay dưới trở thành thứ NÓI RA điều vừa xảy ra thay vì chỉ là hiệu ứng.
      refreshBuildingHp(tribe);
      // Đợt TRÙNG TU: một dải sáng chạy từ kinh đô ra khắp lãnh thổ, quét qua từng
      // mái nhà theo đúng thứ tự xa gần (xem drawAgeUpSweep). Trước bản này việc lên
      // thời đại đổi diện mạo TOÀN BỘ nhà cửa cùng một khung hình, mà không có gì
      // báo rằng nó vừa đổi — người xem chỉ có thể phát hiện bằng cách nhớ được nhà
      // hôm qua trông thế nào, tức là không phát hiện được.
      tribe.ageFlashAt = aTick;
      tribe.ageFlashEnd = aTick + AGE_SWEEP_FRAMES + AGE_SWEEP_SPAN;
      logEvent(TL('{tribe} tiến lên thời đại {age}', { tribe: tribe.name, age: () => CONFIG.AGE.NAMES[tribe.age] }), tribe.color, true);
      addHotspot(tribe.home.x, tribe.home.y, 5, TL('{tribe} lên {age}', { tribe: tribe.name, age: () => CONFIG.AGE.NAMES[tribe.age] }));
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
      hero:    s.heroes * 14 * (0.5 + p.piety),
      // Y THUẬT quy đổi MỘT thầy lang thành ~9 suất lính, và hệ số phải cao vì
      // cùng lý do số học đã viết ngay trên cho nhánh anh hùng: điểm của một nhánh
      // là SỐ QUÂN nó chạm tới, mà thầy lang thì trần cứng 5 người. Để hệ số 1 thì
      // nhánh này thua `melee` (≈18 điểm với một đạo quân bình thường) ở mọi kỷ
      // nguyên với mọi bộ gen — tức là một lựa chọn không bao giờ được chọn, đúng
      // cái đã đo được ở nhánh anh hùng (0/16 bộ lạc, 4 kỷ nguyên) và ở nhánh Ngựa
      // chiến trước khi nó bị xoá.
      //
      // Nhân với `discipline` chứ không phải một hằng số: cùng cái gen đã quyết
      // định bộ lạc này có xây Nhà y tế hay không (xem tribeBrain phía trên). Nhờ
      // vậy nhánh Y thuật không phải một khoản thuế mà mọi bộ lạc đều phải cân
      // nhắc — nó là bước tiếp theo TRÊN CÙNG MỘT CON ĐƯỜNG mà gen ấy đã chọn, và
      // tín hiệu chọn lọc lên `discipline` vì thế mạnh thêm chứ không loãng ra.
      medicine: s.healers * 9 * (0.4 + p.discipline),
      // QUÂN NHU — hệ số 10, cùng họ số học với `hero * 14`, `medicine * 9` và
      // `siege * 7`, và vì đúng cái lý do đã phải viết ba lần ngay trên: điểm của
      // một nhánh là SỐ ĐƠN VỊ nó chạm tới, mà đội hậu cần trần cứng ở 4 người. Ở
      // hệ số 1 nó thua `melee` (≈18 với một đạo quân bình thường) ở mọi kỷ nguyên
      // với mọi bộ gen — thua bằng số học, không bằng may rủi. Nhánh Công thành đã
      // nằm im đúng như thế suốt 4 kỷ nguyên (1/16 bộ lạc) chỉ vì thiếu một dòng
      // trong chính bảng này; lần này dòng ấy được viết cùng lúc với nhánh.
      //
      // Nhân với `expedition` — cùng cái gen đã quyết định bộ lạc này nuôi mấy đội
      // hậu cần. Cùng luật đã viết cho `medicine × discipline`: nhánh nghiên cứu là
      // bước tiếp theo TRÊN CÙNG MỘT CON ĐƯỜNG mà gen ấy đã chọn, nên tín hiệu chọn
      // lọc lên `expedition` mạnh thêm chứ không loãng ra.
      supplyline: s.quarters * 10 * (0.4 + p.expedition),
      // CÔNG THÀNH — thêm ở 3.31, và nó được thêm vì một PHÉP ĐO chứ không vì cảm
      // giác. Trước bản này nhánh `siege` không có mặt trong bảng điểm, nên nó rơi
      // xuống cái lưới an toàn `?? 0,01` ngay bên dưới. Đo 4 kỷ nguyên (16 bộ lạc):
      // **1/16 bộ lạc nghiên cứu nó, tổng cộng 2 cấp**, trong khi Y thuật được 26
      // cấp và Rèn binh khí 20. Tức là toàn bộ hiệu ứng của nhánh này — sát thương
      // lan, tầm bắn, và cỗ máy TO RA trên màn hình — là nội dung gần như không tồn
      // tại. Đúng con lỗi đã ghi ngay phía trên cho nhánh anh hùng (0/16) và nhánh
      // Ngựa chiến, và lời cảnh báo ấy nằm cách chỗ này mười dòng: "một lựa chọn
      // không bao giờ được chọn thì không phải là một lựa chọn". Nó vẫn cắn, vì
      // cảnh báo nằm ở chỗ CHỌN chứ không nằm ở chỗ THÊM MỘT NHÁNH MỚI.
      //
      // Hệ số 7 cùng một họ số học với `hero * 14` và `medicine * 9`: điểm của một
      // nhánh là SỐ QUÂN nó chạm tới, mà hai cỗ máy này trần cứng ở 3-7 chiếc. Ở hệ
      // số 1 nó thua `melee` (≈18 với một đạo quân bình thường) ở mọi kỷ nguyên với
      // mọi bộ gen — thua bằng số học, không phải bằng may rủi.
      //
      // Nhân với `aggression` chứ không phải hằng số, và đây là biểu hiện THỨ TƯ
      // của gen đó (ngưỡng tuyên chiến, số máy bắn đá, đệm tiền nghiên cứu, và giờ
      // là nhánh này) — cùng luật đã viết ba lần trong hàm này: cho gen cũ thêm một
      // biểu hiện thì tín hiệu chọn lọc mạnh lên, thêm gen mới thì nó loãng ra. Và
      // nó đúng về luật chơi: cỗ máy công thành chỉ có nghĩa với kẻ định đi phá
      // tường người khác.
      siege: (s.catapults + s.ballistas) * 7 * (0.5 + p.aggression),
      // NỀ ĐÁ — nhánh này CHƯA TỪNG có mặt trong bảng điểm kể từ khi nó ra đời, nên
      // nó rơi thẳng xuống lưới an toàn `?? 0,01` mười dòng dưới. Hệ quả không phải
      // "hiếm khi được chọn" mà là "chỉ được chọn khi bộ lạc không còn một người
      // lính, một cung thủ, một thầy lang, một cỗ máy nào" — vì lúc đó và chỉ lúc đó
      // mọi điểm khác mới cùng bằng 0 và 0,01 mới thắng nổi `bestScore = 0`.
      //
      // Đây đúng con lỗi mà chú thích ở `?? 0.01` mô tả, và nó bắt được nhánh thứ
      // BA trong dự án (sau Ngựa chiến 0/16 và Công thành 1/16). Điều đáng nói: cả
      // ba lần, cảnh báo đã nằm sẵn ngay cạnh chỗ hỏng — nó nằm ở chỗ CHỌN, còn lỗi
      // thì sinh ra ở chỗ THÊM MỘT NHÁNH MỚI, và hai chỗ đó cách nhau bảy chục dòng.
      //
      // Điểm theo SỐ CÔNG TRÌNH, cùng số học với `siege` (số cỗ máy) và `supplyline`
      // (số trại): Nề đá cộng máu cho MỌI toà nhà, nên số nhà là số quân của nó.
      // Nhân với `fortify` — cùng gen đã quyết bộ lạc này có bao nhiêu thợ đá và bao
      // nhiêu tháp; nhánh nghiên cứu là bước tiếp theo trên CÙNG con đường ấy.
      // Cộng TAY từ `bcount` chứ không đọc một trường `total` — `s.stats` không có
      // trường ấy, và `undefined * 0,5` cho ra NaN, mà `NaN > bestScore` LUÔN false.
      // Nghĩa là một dòng viết ra để CHỮA nhánh chết sẽ tự nó là một nhánh chết, im
      // lặng y hệt, ở đúng chỗ vừa dán ba đoạn cảnh báo về chuyện đó.
      // TƯỜNG THÀNH CỘNG VÀO ĐÂY từ Phase 3.41, cùng lúc với việc Nề đá lấy lại
      // được nó. Không có dòng này thì nhánh vừa được trả lại khách hàng LỚN NHẤT
      // của nó (một vành đời 5 có 320 ô, gấp hơn mười lần số toà nhà) mà bảng điểm
      // vẫn tính như thể nó chưa có — đúng cái hình dạng "một tác dụng có thật mà
      // không nhánh nào biết để chọn" đã giết nhánh Ngựa chiến (0/16) và nhánh Công
      // thành (1/16). Đếm ô tường là một vòng duyệt Map, nhưng bảng điểm chỉ chạy ở
      // NHỊP BỘ NÃO chứ không mỗi tick, nên nó rẻ hơn hẳn mọi lượt quét trong file.
      //
      // Trọng số 0,06 mỗi ô chứ không 0,5 như một toà nhà, và đó không phải một con
      // số bốc: một ô tường 900-3.600 máu đứng cạnh một căn nhà 150 máu thì tưởng là
      // phải NẶNG hơn, nhưng cái đang đếm là "một điểm nữa cộng vào bao nhiêu MÁU
      // TỔNG" — 320 ô × 0,5 sẽ nhấn chìm cả bảy nhánh còn lại và Nề đá thành nhánh
      // luôn thắng ở mọi bộ lạc có tường, tức là lại thành một lựa chọn không phải
      // lựa chọn. 0,06 × 320 ≈ 19, ngang với 38 toà nhà: đáng kể, không áp đảo.
      masonry: ((s.bcount.house + s.bcount.tower + s.bcount.barracks + s.bcount.town
              + s.bcount.depot + s.bcount.farm) * 0.5
              + tribeWallCells(tribe) * 0.06) * (0.4 + p.fortify),
      // NỎ LIÊN CHÂU — viết CÙNG LÚC với nhánh, không để lần sau. Xem ba đoạn trên
      // để biết vì sao dòng này là phần dễ quên nhất và đắt nhất của việc thêm một
      // nhánh.
      //
      // Hệ số 1,2 nhỏ hơn hẳn `siege` (7) hay `hero` (14) vì số đếm ở đây LỚN: một
      // bộ lạc Thiên Triều có 15-22 tháp, trong khi trần cứng của máy bắn đá là 3-7
      // chiếc và anh hùng thì có một. 20 tháp × 1,2 × (0,5+0,5) = 24, tức là ngang
      // ngửa `melee` với một đạo quân bình thường (~18) — đúng chỗ nó nên đứng: một
      // lựa chọn thật, không phải một lựa chọn luôn thắng.
      volley: s.bcount.tower * 1.2 * (0.5 + p.fortify)
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
  // Từ bản này còn hai vế nữa — THIÊN MỆNH và ĐỘC NHẤT — nằm trong wonderAllowed().
  if (wonderAllowed(tribe) && !tribe.wonderStarted
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
      logEvent(TL('🏛 {tribe} khởi công KỲ QUAN', { tribe: tribe.name }), tribe.color, true);
    }
  }

  // ---- Tuyển quân ----
  // Cứu hộ: mất sạch dân thường thì bỏ qua mọi luật dự trữ/giới hạn chỗ ở, dồn
  // hết những gì còn lại để ra bằng được một người — nếu không thì bộ lạc chỉ
  // còn là phế tích chờ luật diệt vong xoá sổ.
  if (s.villagers === 0 && inOven(tribe, 'villager') === 0
      && s.bcount.town > 0 && canAfford(tribe, CONFIG.UNIT.VILLAGER.cost)) {
    pay(tribe, CONFIG.UNIT.VILLAGER.cost);
    tribe.trainQueue.villager++;
    logEvent(TL('{tribe} gắng gượng gây dựng lại từ đầu', { tribe: tribe.name }), tribe.color);
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
  if (tribe.trainQueue.hero > 0 && s.bcount.heroHall === 0) {
    // Tướng phủ bị san phẳng khi anh hùng còn trong hàng đợi: hàng đợi sẽ nằm đó
    // vĩnh viễn (không lò nào nhận), và vì luật là "một anh hùng mỗi bộ lạc" nên
    // bộ lạc đó mất anh hùng đến hết kỷ nguyên. Suất ĐANG NẤU thì không cần dòng
    // nào để dọn: nó sống trên chính toà nhà, nên nó chết cùng toà nhà.
    tribe.trainQueue.hero = 0;
  }
  // NGƯỠNG LƯƠNG ĐỌC GEN `heroDrive`. Bộ lạc gen cao chiêu mộ người kế nhiệm ngay
  // khi vừa đủ tiền; gen thấp đòi một khoản dư dày rồi mới dám. Đây là nửa thứ hai
  // của gen (nửa thứ nhất là có dựng Tướng phủ không), và nó mới là nửa quyết định
  // TỐC ĐỘ QUAY của vòng tiến hoá thứ hai: một bộ lạc dựng phủ rồi để trống nửa kỷ
  // nguyên thì dòng dõi của nó vẫn đứng im.
  const heroCushion = 30 + (1 - p.heroDrive) * 220;
  if (CONFIG.HERO.ENABLED && s.bcount.heroHall > 0 && s.heroes === 0
      && inOven(tribe, 'hero') === 0 && tick >= tribe.heroCooldownUntil
      && tribe.res.food > CONFIG.UNIT.HERO.cost.food + heroCushion
      && canAfford(tribe, CONFIG.UNIT.HERO.cost)) {
    pay(tribe, CONFIG.UNIT.HERO.cost);
    tribe.trainQueue.hero++;
  }

  // Xưởng thợ bị san phẳng khi cung thủ/máy bắn đá còn trong lò -> hàng đợi treo
  // vĩnh viễn và tài nguyên đã trả trước coi như mất. Cùng lỗi đã bắt được với
  // anh hùng + trại lính; lần này viết sẵn thay vì chờ nó xảy ra.
  //
  // Từ Phase 3.28 chỉ còn phải dọn HÀNG ĐỢI, không còn đồng hồ nào của bộ lạc để
  // đặt lại: tiến độ nấu nằm trên chính công trình, nên nó tự biến mất cùng công
  // trình. Danh sách cũng phải nới thêm ba loại Thiên Triều — bản trước liệt kê
  // tay bốn loại và bỏ sót nỏ thần / voi / quân kỳ, nên một bộ lạc mất xưởng thợ
  // vẫn treo vĩnh viễn tiền của một cỗ nỏ thần 210 tick.
  if (s.bcount.workshop === 0) {
    for (const t of ['archer', 'catapult', 'ballista']) tribe.trainQueue[t] = 0;
  }
  if (s.bcount.stable === 0) {
    for (const t of ['knight', 'horsearcher', 'elephant']) tribe.trainQueue[t] = 0;
  }
  if (s.bcount.barracks === 0) { tribe.trainQueue.soldier = 0; tribe.trainQueue.standard = 0; }
  if (s.bcount.infirmary === 0) tribe.trainQueue.medic = 0;
  if (s.bcount.shrine === 0) tribe.trainQueue.quarter = 0;

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
    for (const t of MILITARY_TYPES) army += inOven(tribe, t);
    const needSoldier = s.bcount.barracks > 0 && army < wantSoldiers;
    // Chỉ tuyển khi kho lương còn TRÊN mức dự trữ (xem ECON.FOOD_RESERVE) — đây
    // là thứ giữ cho bộ lạc có đệm chống sốc thay vì luôn sống sát mép vực đói.
    //
    const reserve = CONFIG.ECON.FOOD_RESERVE;
    // ============================================================
    // KHO LƯƠNG KHÔ — cái giá thật của gen `expedition`, và nó chỉ được phép
    // chặn ĐÚNG MỘT thứ
    // ============================================================
    // Hai biểu hiện kia của gen (lính mang nhiều lương hơn, nuôi nhiều đội hậu cần
    // hơn) trông như toàn mặt lợi; nếu chỉ có chúng thì chọn lọc sẽ đẩy gen lên trần
    // trong hai kỷ nguyên rồi đứng im, và đường trôi của nó trên biểu đồ chẳng nói
    // lên điều gì — đúng điều kiện mà POLICY_SPEC tự đặt ra cho chính nó. Lương giữ
    // trong kho là lương KHÔNG thành lính.
    //
    // BẢN ĐẦU CỘNG THẲNG VÀO `reserve`, VÀ ĐÓ LÀ MỘT LỖI ĐO ĐƯỢC. `reserve` gác cả
    // nhánh TUYỂN DÂN THƯỜNG ở cuối thang, nên một bộ lạc `expedition` 0,75 phải có
    // 596 lương trong kho mới dám đẻ một người dân — trong khi cả bộ lạc khởi đầu
    // với 250. Cái giá tôi định đặt là "đạo quân nhỏ hơn"; cái giá thật đo được là
    // "nền văn minh không bao giờ khởi động". Đúng cái hình dạng "cơ chế mới lặng lẽ
    // khoá cơ chế cũ" đã cắn sáu lần trong dự án này, và lần này nó cắn ở khâu nền
    // móng nhất — vòng đẻ dân.
    //
    // Tách làm hai ngưỡng: dân thường và lên đời đi qua `reserve` y như cũ, chỉ
    // QUÂN ĐỘI phải vượt `armyReserve`. Cái giá vẫn thật và vẫn nằm đúng chỗ nó
    // được thiết kế để nằm.
    const armyReserve = reserve + Math.round(p.expedition * 450);

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

    // ============================================================
    // BA BINH CHỦNG THIÊN TRIỀU — cũng KHÔNG có gen riêng nào
    // ============================================================
    // Luật đã viết ba lần trong hàm này (máy bắn đá, kỵ binh, thầy lang) và vẫn
    // đúng: đừng thêm gen thứ mười sáu, hãy cho gen cũ thêm một biểu hiện. Mỗi
    // loại mới đọc đúng cái gen mà nó là câu trả lời cho:
    //   · NỎ THẦN   <- rangedRatio. Nó là quân TẦM XA, và một bộ lạc đã chọn đánh
    //     xa thì nỏ thần là bậc tiếp theo của chính lựa chọn đó.
    //   · VOI CHIẾN <- militaryRatio (qua cavShare). Ra lò từ Chuồng ngựa, đắt
    //     nhất bảng — nó là câu trả lời cho "phần quân đội đó nên NẶNG tới đâu",
    //     đúng câu hỏi mà kỵ binh đã hỏi, chỉ ở một bậc cao hơn.
    //   · QUÂN KỲ   <- discipline. Cùng gen với thầy lang, và cùng lý do: một lá
    //     cờ chỉ có nghĩa với đạo quân ĐỨNG GẦN NHAU. Bộ lạc mạnh ai nấy đi thì
    //     hào quang cổ vũ chạm được vài người, tức là nó tự thấy không đáng mua.
    //
    // Trần TUYỆT ĐỐI cho nỏ thần và voi, không phải tỉ lệ co giãn: cả hai đắt gấp
    // đôi tới ba lần bộ binh và ra lò chậm gấp ba. Một chỉ tiêu co giãn theo dân số
    // sẽ nuốt sạch ngân sách quân sự ở đúng giai đoạn cuối kỷ nguyên — mà đó là lúc
    // bộ lạc cần ĐÔNG chứ không cần tinh. Quân kỳ thì trần còn thấp hơn nữa, và có
    // lý do riêng ở ngay dưới (hào quang không cộng dồn).
    const wantBallistas = hasWorkshop && unlockedUnit(tribe, 'ballista')
      ? Math.round(2 + p.rangedRatio * 5) : 0;
    const wantElephants = hasStable && unlockedUnit(tribe, 'elephant')
      ? Math.round(wantSoldiers * cavShare * 0.35) : 0;
    // HÀO QUANG KHÔNG CỘNG DỒN (xem rallyBonus), nên chỉ tiêu phải tính theo DIỆN
    // TÍCH cần phủ chứ không theo quân số. Một lá cờ phủ bán kính 7,5 ô; một đạo
    // quân 40 người đứng thành khối thì hai lá là đủ, lá thứ ba không thêm gì cả.
    // Đây là chỗ một chỉ tiêu co giãn theo `wantSoldiers` sẽ sai kiểu tệ nhất: bộ
    // lạc càng đông càng mua nhiều cờ, mà cờ thứ n chỉ chồng lên vùng cờ thứ n-1
    // đã phủ. Tiền đổ xuống sông và không ai đo được, vì quân vẫn mạnh lên thật.
    const wantStandards = s.bcount.barracks > 0 && unlockedUnit(tribe, 'standard')
      ? Math.min(3, Math.round(p.discipline * 4)) : 0;

    // THẦY LANG: số lượng suy ra từ SỐ TRẠM XÁ, không từ một gen nào. Cố ý không
    // thêm gen thứ mười sáu — gen đã có (`discipline`) quyết định có xây trạm xá
    // hay không, và số thầy lang cứ theo đó mà ra. Thêm một gen nữa cho cùng một
    // quyết định thì tín hiệu chọn lọc bị chia đôi và loãng đi, đúng lý do đã viết
    // ở máy bắn đá và ở kỵ binh.
    const wantHealers = Math.min(CONFIG.HEALER.MAX,
      s.bcount.infirmary * CONFIG.HEALER.PER_INFIRMARY);

    // ĐỘI HẬU CẦN: đây LÀ chỗ gen `expedition` nói ra con số của nó. Trần tuyệt đối
    // 4 và rất thấp, cùng lý do đã viết cho thầy lang và quân kỳ — thứ đứng đầu
    // thang tuyển quân bắt buộc phải có trần CỨNG, nếu không nó bóp nghẹt quân đội.
    //
    // Nhân với 5 chứ không với 4: ở đầu dưới của dải gen (0,15) kết quả làm tròn về
    // 1, không phải 0. Cố ý — một bộ lạc `expedition` thấp vẫn phải có ĐÚNG MỘT đội
    // hậu cần để người xem thấy được cả hai đầu của trục này trên cùng một bản đồ.
    // Cho nó về 0 thì nửa dưới dải gen không có kiểu hình nào, và một gen không có
    // kiểu hình thì chọn lọc không nhìn thấy nó.
    const wantQuarters = s.bcount.shrine > 0 && unlockedUnit(tribe, 'quarter')
      ? clamp(Math.round(p.expedition * 5), 1, 4) : 0;

    const trainable = (type, want, have) => {
      if (want <= have) return false;
      // Trần hàng đợi đọc TỔNG (đợi + đang nấu), nếu không thì mỗi cái lò mới xây
      // lại nới cái trần này thêm một suất mà không ai cố ý — và một bộ lạc bốn
      // trại lính sẽ tuyển vượt chỉ tiêu gấp đôi.
      if (inOven(tribe, type) >= 2) return false;
      // Giá đọc qua trainCost — cùng con số mà `pay` sẽ trừ. Hai chỗ đọc hai
      // bảng giá khác nhau thì bộ não sẽ xếp hàng những suất nó không trả nổi,
      // hoặc từ chối những suất nó thừa sức — đúng họ lỗi hai-nguồn-sự-thật.
      return canAfford(tribe, trainCost(type));
    };

    // Thứ tự thang: đắt nhất trước. Mỗi lần chạy bộ não chỉ tuyển MỘT suất, nên
    // loại đứng đầu thang được ưu tiên khi tiền eo hẹp — mà đó đúng là những loại
    // sẽ không bao giờ được tuyển nếu tiền cứ chảy vào bộ binh rẻ tiền trước.
    // THẦY LANG ĐỨNG ĐẦU THANG, và nó là ngoại lệ DUY NHẤT của luật "đắt nhất
    // trước" ghi ngay trên. Lý do: thang này chỉ tuyển MỘT suất mỗi nhịp bộ não,
    // nên thứ đứng cuối chỉ được tới lượt khi mọi thứ trên nó đều đã đủ — mà quân
    // đội thì không bao giờ đủ (`wantSoldiers` co giãn theo cả dân số lẫn độ giàu).
    // Một lựa chọn không bao giờ tới lượt thì không phải là một lựa chọn.
    //
    // Đặt nó trên đầu KHÔNG bóp nghẹt quân đội, vì trần của nó là tuyệt đối và rất
    // thấp (2 mỗi trạm xá, tối đa 5): đủ số rồi thì điều kiện tắt vĩnh viễn và cả
    // dòng này biến mất khỏi thang. Đây là khác biệt giữa một trần CỨNG và một
    // mục tiêu co giãn — chỉ loại thứ nhất mới được phép đứng trước.
    if (s.bcount.infirmary > 0 && unlockedUnit(tribe, 'medic') && tribe.res.food > reserve
        && trainable('medic', wantHealers, s.healers + inOven(tribe, 'medic'))) {
      pay(tribe, trainCost('medic'));
      tribe.trainQueue.medic++;
    // ĐỘI HẬU CẦN — ngoại lệ thứ BA của luật "đắt nhất trước", và đủ điều kiện đứng
    // đây vì đúng cùng lý do: trần của nó là TUYỆT ĐỐI và rất thấp (tối đa 4), nên
    // đủ số rồi thì dòng này tắt vĩnh viễn và biến khỏi thang. Đặt nó dưới bộ binh
    // thì nó không bao giờ tới lượt — `wantSoldiers` co giãn theo cả dân số lẫn độ
    // giàu và không bao giờ đủ.
    //
    // KHÔNG kèm điều kiện `tribe.warTarget !== null`. Nghe thì hợp lý ("chỉ cần hậu
    // cần khi đi đánh"), nhưng nó dựng lại đúng cái bẫy thời điểm đã cắn ở máy bắn
    // đá: lệnh tuyên chiến bật lên rồi đạo quân lên đường NGAY, trong khi một suất
    // hậu cần mất 95 tick trong lò cộng quãng đường đuổi theo. Bộ lạc sẽ mãi mãi có
    // hậu cần đúng một nhịp SAU khi cần nó.
    } else if (s.bcount.shrine > 0 && unlockedUnit(tribe, 'quarter') && tribe.res.food > reserve
        && trainable('quarter', wantQuarters, s.quarters + inOven(tribe, 'quarter'))) {
      pay(tribe, trainCost('quarter'));
      tribe.trainQueue.quarter++;
    // QUÂN KỲ đứng ngay sau thầy lang, và là ngoại lệ thứ HAI của luật "đắt nhất
    // trước" — cùng lý do đã viết cho thầy lang ngay trên: trần của nó là TUYỆT ĐỐI
    // và rất thấp (tối đa 3), nên đủ số rồi thì dòng này tắt vĩnh viễn và biến khỏi
    // thang. Đặt nó ở cuối thang thì nó không bao giờ tới lượt, vì `wantSoldiers`
    // co giãn theo dân số và không bao giờ đủ. "Một lựa chọn không bao giờ tới lượt
    // thì không phải một lựa chọn."
    } else if (s.bcount.barracks > 0 && unlockedUnit(tribe, 'standard') && tribe.res.food > reserve
        && trainable('standard', wantStandards, s.standards + inOven(tribe, 'standard'))) {
      pay(tribe, trainCost('standard'));
      tribe.trainQueue.standard++;
    } else if (needSoldier && tribe.res.food > armyReserve
        && trainable('elephant', wantElephants, s.elephants + inOven(tribe, 'elephant'))) {
      pay(tribe, trainCost('elephant'));
      tribe.trainQueue.elephant++;
    } else if (needSoldier && tribe.res.food > armyReserve
        && trainable('ballista', wantBallistas, s.ballistas + inOven(tribe, 'ballista'))) {
      pay(tribe, trainCost('ballista'));
      tribe.trainQueue.ballista++;
    } else if (needSoldier && tribe.res.food > armyReserve
        && trainable('catapult', wantCatapults, s.catapults + inOven(tribe, 'catapult'))) {
      pay(tribe, trainCost('catapult'));
      tribe.trainQueue.catapult++;
    } else if (needSoldier && tribe.res.food > armyReserve
        && trainable('horsearcher', wantHorseArchers, s.horsearchers + inOven(tribe, 'horsearcher'))) {
      pay(tribe, trainCost('horsearcher'));
      tribe.trainQueue.horsearcher++;
    } else if (needSoldier && tribe.res.food > armyReserve
        && trainable('knight', wantKnights, s.knights + inOven(tribe, 'knight'))) {
      pay(tribe, trainCost('knight'));
      tribe.trainQueue.knight++;
    } else if (needSoldier && tribe.res.food > armyReserve
        && trainable('archer', wantArchers, s.archers + inOven(tribe, 'archer'))) {
      pay(tribe, trainCost('archer'));
      tribe.trainQueue.archer++;
    } else if (needSoldier && tribe.res.food > armyReserve && canAfford(tribe, trainCost('soldier')) && inOven(tribe, 'soldier') < 3) {
      pay(tribe, trainCost('soldier'));
      tribe.trainQueue.soldier++;
    } else if (s.villagers + inOven(tribe, 'villager') < (CONFIG.AGE.VILLAGER_CAP[tribe.age] || 90)
               && canAfford(tribe, CONFIG.UNIT.VILLAGER.cost)
               && tribe.res.food > reserve
               && inOven(tribe, 'villager') < 3) {
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
  // TỪ PHASE 3.35 KHỐI NÀY CHẠY NGAY TỪ LÚC ĐẶT MÓNG, không đợi khánh thành —
  // `wonderWatch` nay có cả đoạn 'building' (xem updateWonderRace). Hệ quả là toàn
  // bộ cơ chế "kẻ dẫn đầu phơi mình ra, ba bên còn lại bỏ mọi mâu thuẫn để lao vào"
  // dịch lên sớm hơn ~500 tick, đúng bằng thời gian dựng. Đó là cả điểm của việc
  // kéo dài thời gian xây gấp ba: một cửa sổ chỉ đáng gọi là cửa sổ khi cả hai bên
  // đều biết nó đang mở.
  if (gameMode !== 'defend' && wonderWatch && wonderWatch.tribeId === tribe.id) {
    if (tribe.warTarget !== null) {
      tribe.warTarget = null;
      logEvent(wonderWatch.phase === 'building'
        ? TL('🛡 {tribe} triệu hồi toàn quân về giữ công trường Kỳ quan', { tribe: tribe.name })
        : TL('🛡 {tribe} triệu hồi toàn quân về giữ Kỳ quan', { tribe: tribe.name }), tribe.color, true);
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
      logEvent(wonderWatch.phase === 'building'
        ? TL('⚔ {tribe} kéo quân san phẳng công trường Kỳ quan của {victim}', { tribe: tribe.name, victim: tribes[wonderWatch.tribeId].name })
        : TL('⚔ {tribe} dốc toàn lực chặn Kỳ quan của {victim}', { tribe: tribe.name, victim: tribes[wonderWatch.tribeId].name }), tribe.color, true);
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
      logEvent(TL('⚔ {tribe} tuyên chiến với {victim}', { tribe: tribe.name, victim: bestTarget.name }), tribe.color, true);
    } else if (!bestTarget && tribe.warTarget !== null) {
      tribe.warTarget = null;
      logEvent(TL('{tribe} lui binh, tạm ngừng chinh phạt', { tribe: tribe.name }), tribe.color);
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
  // Thầy lang ăn suất lính đầy đủ dù không đánh nhau, và đó là chỗ nó trả giá.
  // `power` cố tình KHÔNG tính nó (xem isSupport) nên nếu ở đây cũng bỏ qua thì
  // thầy lang trở thành một đơn vị hoàn toàn miễn phí sau khi tuyển — một cơ chế
  // chỉ có mặt tốt thì không phải là một lựa chọn.
  const upkeep = (s.villagers * CONFIG.ECON.UPKEEP_VILLAGER
                  + s.soldiers * CONFIG.ECON.UPKEEP_SOLDIER
                  + s.catapults * CONFIG.ECON.UPKEEP_SOLDIER * 1.5
                  + s.cavalry * CONFIG.ECON.UPKEEP_SOLDIER
                  + s.healers * CONFIG.ECON.UPKEEP_SOLDIER
                  + s.heroes * CONFIG.HERO.UPKEEP)
                 * CONFIG.ECON.upkeepMult;
  tribe.res.food -= upkeep;
  if (tribe.res.food < 0) {
    tribe.res.food = 0;
    if (!tribe.starving) {
      logEvent(TL('{tribe} lâm vào NẠN ĐÓI', { tribe: tribe.name }), '#d05a44', true);
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

  // ============================================================
  // HUẤN LUYỆN — MỖI CÔNG TRÌNH LÀ MỘT CÁI LÒ RIÊNG (Phase 3.28)
  // ============================================================
  // Bản cũ: `buildings.find(...)` lấy ĐÚNG MỘT công trình nguồn rồi đếm giờ trên
  // một cái đồng hồ của BỘ LẠC. Hệ quả là cái trại lính thứ hai không rút ngắn
  // một tick nào — nó chỉ là một mục tiêu mềm thêm cho địch. Nghĩa là quyết định
  // xây dựng trực tiếp nhất mà một trò chơi kiểu này có thể có ("cần quân nhanh
  // hơn thì làm gì") đã không tồn tại suốt 27 bản.
  //
  // Giờ tiến độ nằm trên chính toà nhà (`b.trainType` + `b.trainTimer`), và bốn
  // hệ quả đều là thứ đáng có:
  //   · Bốn trại lính = bốn suất song song. Gen `garrison` mới có việc để làm.
  //   · Một cái lò bị phá thì mất ĐÚNG suất đang nấu trong nó, không mất hàng đợi
  //     — trước đây mất công trình là mất sạch cả hàng đợi lẫn tiền đã trả.
  //   · Không còn đồng hồ nào của bộ lạc để đặt lại khi công trình sập: trạng thái
  //     chết cùng vật mang nó. Cả một họ lỗi bookkeeping biến mất.
  //   · Quân ra lò ở ĐÚNG cái lò sinh ra nó, nên một bộ lạc có trại lính tiền
  //     tuyến sẽ thấy quân đổ ra ngay tại đó. Đọc được từ ngoài màn hình.
  //
  // Thứ tự nhặt suất là ĐẮT NHẤT TRƯỚC (xem TRAIN_BY_SOURCE) — cùng lý lẽ với
  // thang tuyển quân bên trên: bộ binh 55 tick sẽ luôn có sẵn trong hàng đợi, nên
  // nếu nhặt theo thứ tự bảng thì một cỗ voi 240 tick không bao giờ tới lượt.
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.hp <= 0 || !b.done) continue;
    const menu = TRAIN_BY_SOURCE[b.type];
    if (!menu) continue;
    if (!b.trainType) {
      for (const t of menu) {
        if (tribe.trainQueue[t] > 0) {
          // RỜI hàng đợi ngay lúc nhận, không phải lúc ra lò. Nếu để lại thì hai
          // cái lò cùng nhìn thấy một suất và cùng nhận nó — một suất trả tiền
          // một lần ra hai người lính, mà con số đó thì không chỗ nào đối chiếu.
          tribe.trainQueue[t]--;
          b.trainType = t;
          b.trainTimer = 0;
          break;
        }
      }
    }
    if (!b.trainType) continue;
    b.trainTimer++;
    if (b.trainTimer >= unitSpec(b.trainType).trainTicks) {
      const t = b.trainType;
      // ============================================================
      // MỘT NGƯỜI LÍNH = MỘT DÂN THƯỜNG (Phase 3.30)
      // ============================================================
      // Trước bản này quân ra lò từ hư không: trả tài nguyên rồi một người mới
      // xuất hiện. Nghĩa là "dân" và "lính" là hai cái vòi độc lập chảy vào cùng
      // một cái trần, và bộ lạc không bao giờ phải CHỌN giữa chúng — nó chỉ chọn
      // thứ tự tiêu tiền. Giờ mỗi suất quân nuốt một dân thường, nên mỗi người
      // lính có một cái giá thứ hai không quy đổi được ra tài nguyên: một người
      // đang hái lương.
      //
      // KHÔNG CÓ DÂN THÌ SUẤT ĐÓ CHỜ, không huỷ. Huỷ thì tài nguyên đã trả bốc
      // hơi và bộ não sẽ xếp lại đúng suất ấy ở nhịp sau — một vòng lặp đốt tiền
      // câm lặng. Giữ `b.trainType` thì cái lò đứng đó với thanh tiến độ đầy, và
      // người xem bấm vào trại lính đọc ra ngay "đang chờ người".
      const recruit = takeRecruit(tribe, b);
      if (!recruit) { b.trainTimer = unitSpec(t).trainTicks; continue; }
      b.trainType = null;
      b.trainTimer = 0;
      spawnUnit(tribe, t, b.x + Math.round(randRange(-2, 2)), b.y + b.size);
    }
  }
}

// Nhặt một dân thường để đổi thành lính. Trả về người bị nhặt, hoặc null.
//
// ============================================================
// CÁI SÀN, và vì sao nó phải TỈ LỆ chứ không phải một hằng số
// ============================================================
// Bản đầu đặt sàn 6 người. Đo 4 ván 12.000 tick thì con số đó gần như không tồn
// tại: tổng dân của cả bản đồ tụt còn một nửa (115/123/53/79 so với 238/222/107/213),
// và ván seed 44 dừng ở Đồ Sắt với 38 dân, 6 lính, 0 công trình bị phá — trần dân
// số của bốn bộ lạc lần lượt là 33/12/49/47, tức là gần như không ai xây nổi nhà.
//
// Vòng xoáy có hình dạng rất rõ và nó KHÔNG phải chuyện lương thực: nhà ở cần THỢ
// để xây, thợ bị bắt đi lính thì ít nhà hơn, ít nhà thì trần dân thấp hơn, trần
// thấp thì ít thợ hơn nữa. Một cái sàn tuyệt đối 6 người không chạm được vào vòng
// đó vì nó chỉ chặn ở đáy vực, còn vòng xoáy thì đã siết từ lúc bộ lạc có 20 dân.
//
// Sàn tỉ lệ (45% quân số) tự siết đúng chỗ: bộ lạc càng nhiều lính thì sàn càng
// cao, nên tự nó dừng lại ở khoảng 45/55 chứ không cần ai canh. Cộng thêm sàn
// tuyệt đối 12 để BẢO VỆ GIAI ĐOẠN MỞ MÀN — một bộ lạc khởi đầu có ~10 dân, và
// bắt lính từ đó là xoá luôn quãng "kinh tế và vị trí quyết định tất cả" mà cả
// bảng UNLOCK_UNIT được viết ra để giữ.
//
// Anh hùng KHÔNG tốn dân: dòng dõi anh hùng là vòng tiến hoá thứ hai của cả trò
// chơi, và buộc nó cạnh tranh với một suất lính thường sẽ làm tốc độ quay của
// vòng đó phụ thuộc vào một thứ chẳng liên quan gì.
const DRAFT_MIN_ABS = 12;      // sàn cứng — giữ nguyên vẹn giai đoạn mở màn
const DRAFT_MIN_FRAC = 0.45;   // và không bao giờ để dân thường xuống dưới ngần này quân số
// Hai loại KHÔNG nuốt dân. `villager` là loại quan trọng hơn hẳn và nó không phải
// một ngoại lệ về cân bằng mà là một vòng lặp vô nghĩa: đổi một dân thường lấy
// một dân thường thì cái lò chạy 40 tick để trả về đúng con số cũ, và trần dân số
// vĩnh viễn không nhích lên được một người. Viết ra thành bảng chứ không thành
// `!== 'hero'`: loại thứ mười hai thêm vào bảng TRAINABLE_TYPES sẽ tự rơi vào
// nhánh "có nuốt dân", đúng nhánh mặc định nên có.
const DRAFT_EXEMPT = { villager: 1, hero: 1 };
function takeRecruit(tribe, b) {
  if (DRAFT_EXEMPT[b.trainType]) return true;
  let n = 0, best = null, bestD = Infinity;
  for (const u of units) {
    if (u.tribeId !== tribe.id || u.type !== 'villager' || u.hp <= 0) continue;
    n++;
    const d = dist(u.x, u.y, b.x, b.y);
    // Người đang GÁNH HÀNG bị đẩy ra sau: chuyến hàng của họ sẽ mất trắng, mà đó
    // đúng là thứ bộ lạc vừa bỏ công đi lấy. Cộng thêm quãng chứ không loại hẳn —
    // loại hẳn thì ở một bộ lạc mà mọi người đều đang gánh, cả cỗ máy tuyển quân
    // đứng im mà không có gì trên màn hình nói vì sao.
    const score = d + (u.carry && u.carry.amount > 0 ? 25 : 0);
    if (score < bestD) { bestD = score; best = u; }
  }
  const army = (tribe.stats && tribe.stats.soldiers) || 0;
  const floor = Math.max(DRAFT_MIN_ABS, Math.round((n + army) * DRAFT_MIN_FRAC));
  if (!best || n <= floor) return null;
  // hp = 0 -> lượt lọc xác cuối tick dọn đi. KHÔNG gọi bất cứ đường "chết" nào:
  // dân thường không có onDeath, và `losses` chỉ được cộng trong dealDamage — nên
  // người nhập ngũ không bị đếm là một tổn thất, đúng như nó phải thế.
  best.hp = 0;
  best.drafted = true;
  addFx({ type: 'blessing', x: best.x, y: best.y, life: 22, maxLife: 22, color: tribe.color });
  return best;
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
      logEvent(TL('{icon} {tribe} khẩn cầu: {prayer} — {why}', { icon: PRAYERS[kind].icon, tribe: tribe.name, prayer: () => PRAYERS[kind].label, why: () => PRAYERS[kind].desc }), tribe.color);
    }
  }
  if (tribe.prayer && tick > tribe.prayer.until) {
    // Lời cầu không được đáp. Ghi lại thành sự kiện chứ không im lặng biến mất:
    // sự THINH LẶNG của Chúa Tể cũng là một hành động, và nó phải nhìn thấy được.
    logEvent(TL('{tribe} cầu mãi không thấu — lời khẩn cầu tắt lịm', { tribe: tribe.name }), '#6d6454');
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
  addHotspot(home.x, home.y, 9, TL('{tribe} được ban phước', { tribe: tribe.name }));
  logEvent(TL('{who} — {tribe} nhận {prayer} (x{mult})', { who: auto ? () => T('✨ Chúa Tể đoái thương kẻ thành tâm nhất') : () => T('🙏 Chúa Tể đáp lời'),
      tribe: tribe.name, prayer: () => PRAYERS[kind].label.toLowerCase(), mult: m.toFixed(2) }),
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

