'use strict';
// ============================================================
// 07-ai-villager.js
// ------------------------------------------------------------
// Não dân thường: chọn nghề theo nhu cầu bộ lạc, đi thu hoạch, xây, nộp kho.
// Tách cơ học từ civilization.html một-file, dòng 3985–4243.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Dân thường
// ============================================================
const JOB_RES = { food: 'food', wood: 'wood', gold: 'gold', stone: 'stone' };

// Chọn nghề theo NGUYÊN TẮC TỈ LỆ: nghề nào có (nhu cầu / số người đang làm) cao
// nhất thì nhận người mới. Tự cân bằng dần mà không phải điều động hàng loạt mỗi
// lần bộ não chạy — dân chỉ đổi nghề ở thời điểm vừa trả hàng xong (task 'idle').
function pickJob(tribe) {
  const p = tribe.policy;
  // Đang đói thì MỌI người đi kiếm ăn, bất kể gen chiến lược nói gì. Không có
  // luật đè này, một bộ lạc có woodWeight cao vẫn thản nhiên đi đốn gỗ trong lúc
  // dân chết đói hàng loạt — bản đầu chết y hệt vậy.
  if (tribe.starving || tribe.res.food < 100) { tribe.jobCounts.food++; return 'food'; }
  // Đá bị NHÂN CHÌM khi bộ lạc còn ở Đồ Đá: ở thời đại đó không một công trình nào
  // cần đá, nên người đi đập đá là người bị lấy khỏi việc thật. Hệ số 0,3 chứ không
  // phải 0 là có chủ ý — nó để cho gen stoneWeight cao vẫn tích được ít vốn đá trước
  // giờ G (và vẫn phải TRẢ GIÁ cho việc đó), thay vì biến gen thành một công tắc
  // bật/tắt theo thời đại. Gen chỉ tiến hoá được khi nó có dải giá trị liên tục.
  //
  // Trần tích trữ tính theo NHU CẦU THẬT SẮP TỚI, không phải một hằng số. Bản đầu
  // dùng "trên 700 thì giảm còn 0,35" và đo ra một bộ lạc ngồi trên 4.182 đá trong
  // khi chỉ có 8 lính — tức là hàng chục người đập đá suốt hai nghìn tick cho một
  // kho không bao giờ tiêu tới. Đây là đúng cái bệnh mà FOOD_RESERVE và luật "gỗ dư
  // -> xây thêm ruộng" đã phải chữa cho hai tài nguyên trước: một trọng số cố định
  // không biết khi nào thì đủ.
  //
  // Vế Kỳ quan còn làm một việc thứ hai: nó nối wonderDrive vào tận khâu phân công
  // lao động. Bộ lạc khao khát Kỳ quan chấp nhận khởi công sớm nên cần ít vốn hơn;
  // bộ lạc dè dặt phải gom gấp đôi rồi mới dám — nên gen đó vẫn có một dải liên tục
  // để chọn lọc đọc, thay vì thành một công tắc "có xây / không xây".
  //
  // `wonderAllowed` chứ không phải `tribe.age >= 4`, và đây là chỗ điều kiện
  // THIÊN MỆNH mới (xem wonderBlock) phải chạm tới nếu không muốn nó thành nửa
  // vời: tích đá là công sức của hàng chục người trong hàng nghìn tick. Hỏi mỗi
  // cổng thời đại thì một bộ lạc hiền lành — chưa hạ nổi kinh đô nào, hoặc bị
  // khoá vì bên kia đang giữ Kỳ quan — sẽ đập đá cả kỷ nguyên cho một toà nhà nó
  // không được phép xây, trong khi đúng đám thợ đó lẽ ra đang đốn gỗ dựng nhà.
  // ================================================================
  // PHASE 3.27 — CẢ BỐN TÀI NGUYÊN ĐỀU PHẢI BIẾT KHI NÀO THÌ ĐỦ
  // ================================================================
  // Khối chú thích ngay trên chẩn đoán đúng bệnh — "một trọng số cố định không biết
  // khi nào thì đủ" — rồi chữa cho ĐÚNG MỘT tài nguyên. Ba dòng còn lại của bảng
  // `need` giữ nguyên dạng cũ suốt từ đó, và đo ở tick 9.000 thì hậu quả lộ ra to
  // hơn hẳn cái bệnh ban đầu:
  //     Xích Long  age 4 · lương 37.216 · gỗ 36.964 · đá 763
  //                need.food 1,82 (nguyên trọng số gen) · need.stone 0,022
  //                76 người hái lương · 63 người đốn gỗ · 0 người đập đá
  // 37 nghìn lương và 37 nghìn gỗ nằm không, trong khi 139 người vẫn đi làm đều để
  // chất thêm. Đúng cái hình dạng đã đo được với 4.182 đá và 8 lính — chỉ là gấp
  // chín lần, ở hai tài nguyên chưa ai đi đo.
  //
  // Và đây mới là chỗ đắt: nó GIẢI THÍCH luôn vì sao 98,9% đá trên bản đồ không ai
  // đụng tới. Đá là tài nguyên DUY NHẤT có hạng mục no đủ, nên nó là tài nguyên duy
  // nhất có nhu cầu tụt được về sàn 0,04 — trong khi lương và gỗ vĩnh viễn giữ
  // nguyên trọng số gen. Luật chọn nghề là một cuộc so sánh TƯƠNG ĐỐI
  // (`need / số người đang làm`), nên một dòng biết no giữa ba dòng không biết no
  // thì nó luôn thua. Bản sửa sinh ra để chặn việc ĐẬP ĐÁ QUÁ NHIỀU đã trở thành
  // lý do KHÔNG AI ĐẬP ĐÁ. Cùng một họ với "cơ chế mới lặng lẽ bị cơ chế cũ khoá
  // lại" đã đếm được năm lần, nhưng ở dạng độc nhất: cơ chế tự khoá chính mình khi
  // được áp cho một dòng mà không áp cho những dòng nó phải cạnh tranh.
  //
  // Chữa: MỘT hàm no đủ cho cả bốn, mỗi dòng neo vào NHU CẦU THẬT SẮP TỚI của
  // chính nó. Cùng công thức, cùng sàn 0,04 (không bao giờ để một nghề tắt hẳn —
  // xem lý do ở đoạn về `stoneUse` cũ).
  const R = tribe.res;
  // Ở BẬC CUỐI thì `COST[age + 1]` không tồn tại, và nếu để nó rỗng thì cả bốn cái
  // đích tụt xuống bằng đúng hằng số sàn của chúng — nghĩa là mọi tài nguyên đều
  // "no" cùng lúc, cả bốn dòng `need` cùng rơi về sàn 0,04, và luật chọn nghề mất
  // sạch tín hiệu: nó chỉ còn chia người đều theo số đầu người.
  //
  // Đo được hậu quả ở tick 14.000: bộ lạc thắng cuộc (Thiên Triều, 205 dân) ngồi
  // trên 64.510 GỖ với 100 người vẫn ngày ngày đi đốn. Cái vách đó rơi đúng vào
  // lúc bộ lạc ĐÔNG NHẤT, tức là đúng lúc lãng phí đắt nhất.
  //
  // Lùi về bảng giá của bậc VỪA ĐẠT TỚI: một đế chế ở bậc cuối vẫn có ngần ấy
  // công trình để dựng và ngần ấy quân để nuôi, nên quy mô nhu cầu của nó không
  // rơi về 0 chỉ vì hết bậc để leo. Đây cùng một họ với lỗi "bảng tra thiếu một
  // khoá" đã ba lần cho ra NaN im lặng — chỉ khác là ở đây khoá thiếu cho ra một
  // đối tượng rỗng, và số 0 thì không ném lỗi ở đâu cả.
  const nextAge = CONFIG.AGE.COST[tribe.age + 1] || CONFIG.AGE.COST[tribe.age] || {};
  const sate = (have, target) => clamp(1.25 - have / Math.max(1, target), 0.04, 1);

  // LƯƠNG THỰC là dòng duy nhất bị TIÊU LIÊN TỤC (nuôi quân + huấn luyện), nên
  // đích của nó tính theo DÂN SỐ chứ không theo một khoản chi sắp tới: mỗi suất dân
  // là một miệng ăn vĩnh viễn cộng một khoản huấn luyện. `FOOD_RESERVE` là sàn
  // cứng đã có sẵn ý nghĩa "đệm chống sốc" (xem CONFIG.ECON.FOOD_RESERVE); phần
  // `pop * 14` là chỗ cho vài lượt tuyển quân nữa.
  // `pop * 40` — và con số 40 KHÔNG phải chọn cho đẹp, nó neo vào một hằng số có
  // thật ở chỗ khác. Bản đầu đặt `pop * 14` và đo ra hậu quả ngay: kho lương hết
  // phình thật (37.216 -> ~1.000) nhưng quân đội của cả bốn bộ lạc rơi xuống 40
  // người TỔNG CỘNG. Thủ phạm là khối tuyển quân:
  //     const wealth = clamp(tribe.res.food / 5000, 0, 1);
  //     wantSoldiers = pop * min(0.7, militaryRatio * (1 + wealth))
  // Nó cần TỚI 5.000 lương mới mở hết cỡ chỉ tiêu quân — mà tôi vừa dạy cho thợ
  // hái ngừng tay ở 1.100. Hai hằng số nói về cùng một thứ ("bao nhiêu lương là
  // đủ") nằm ở hai file và không biết nhau: đúng cái họ lỗi "hai ngưỡng gần bằng
  // nhau cho cùng một khái niệm" đã ghi ở ECON.RES_MIN, chỉ khác là ở đây khoảng
  // hở giữa chúng nuốt mất một nửa quân đội chứ không phải vài ô tài nguyên.
  //
  // pop 120 × 40 = 4.800, cộng dự trữ và giá thời đại thì đích ≈ 5.400 — nằm ngay
  // trên ngưỡng `wealth` bão hoà. Nghĩa là bộ lạc vẫn ngừng tích ở khoảng 6.500
  // (sàn 1,25×) thay vì 37.000, mà cỗ máy tuyển quân vẫn được ăn no.
  const pop = (tribe.stats && tribe.stats.pop) || 20;
  const foodTarget = CONFIG.ECON.FOOD_RESERVE + pop * 40 + (nextAge.food || 0);
  // GỖ nuôi nhà ở, ruộng, tháp, kho — những thứ xây liên tục — nên đích của nó là
  // khoản chi thời đại cộng một quỹ xây dựng cố định, không phải chỉ khoản chi.
  const woodTarget = (nextAge.wood || 0) + 700;
  const goldTarget = (nextAge.gold || 0) + 450;

  const nextAgeStone = nextAge.stone || 0;
  const wonderStone = (wonderAllowed(tribe) && !tribe.wonderStarted)
    ? CONFIG.BUILD.wonder.cost.stone * (1 + (1 - p.wonderDrive) * 0.8) : 0;
  // ĐƯỜNG CÁI và THÁP CANH vào thẳng đích tích trữ đá, và không có hai dòng này thì
  // cả hai cơ chế mới của bản này đều bị chính pickJob bóp nghẹt: bộ lạc ngừng đập
  // đá ở 670 trong khi ngân sách đá thật của nó (đường tới trần thời đại + hạn ngạch
  // tháp) là hơn gấp đôi. Đây đúng là bài học "hỏi mỗi cổng thời đại thì bộ lạc tích
  // đá cho một toà nhà nó không được xây" đã ghi ngay dưới, đọc theo chiều ngược:
  // nếu một khoản chi CÓ THẬT mà đích tích trữ không biết tới, thì thợ đá bị gọi về
  // đúng lúc khoản chi đó sắp tới.
  //
  // Đọc `roadBudget(tribe)` — CÙNG hàm mà tickRoads dùng để quyết còn lát nữa hay
  // không (Phase 3.28). Hai chỗ đọc hai công thức khác nhau là đúng hình dạng lỗi
  // đã cắn ở Phase 3.27: `foodTarget` bên này và `wealth = food/5000` bên kia
  // không biết nhau, và một nửa quân đội bốc hơi vì thế. Ở đây hậu quả sẽ là bộ
  // lạc `roadDrive` cao tích đá cho một ngân sách mà tickRoads không cho tiêu, hoặc
  // ngược lại — thợ đá bị gọi về đúng lúc mặt đường sắp cần.
  const roadLeft = roadBudget(tribe) - tribe.roadCount;
  const roadStone = roadLeft > 0
    ? Math.min(180, roadLeft * CONFIG.ROAD.STONE_PER_CELL)
    : 0;
  const towerQuota = CONFIG.AGE.NEED_TOWERS[tribe.age + 1] || 0;
  const towerStone = towerQuota > 0
    ? Math.max(0, towerQuota + 1 - ((tribe.stats && tribe.stats.towersDone) || 0)) * (CONFIG.BUILD.tower.cost.stone || 0)
    : 0;
  // QUỸ VÁ TƯỜNG (Phase 3.30). Từ bản này tường thành tự sửa bằng ĐÁ, và dưới
  // WALL.REGEN_RESERVE thì nó chỉ vá bằng một phần tư tốc độ. Đó là một khoản chi
  // CÓ THẬT và liên tục — nên đích tích trữ đá phải biết tới nó, đúng bài học đã
  // ghi ngay bên trên cho đường cái và tháp canh: một khoản chi mà đích tích trữ
  // không biết thì thợ đá bị gọi về đúng lúc khoản chi đó sắp tới.
  //
  // Đọc THẲNG hằng số của cơ chế vá tường, không chép một con số tương đương —
  // hai chỗ đọc hai công thức khác nhau đúng là hình dạng lỗi foodTarget/wealth
  // của Phase 3.27. Nhân với gen `fortify` (0..1): đây là chỗ chính mà một bộ lạc
  // "thích phòng thủ" biến thành một bộ lạc CÓ NHIỀU THỢ ĐÁ HƠN.
  const wallStone = tribe.age >= CONFIG.WALL.MIN_AGE
    ? CONFIG.WALL.REGEN_RESERVE * (0.5 + (p.fortify || 0) * 1.5)
    : 0;
  const stoneTarget = Math.max(220, nextAgeStone + wonderStone + roadStone + towerStone + wallStone + 150);

  const need = {
    // Hai hệ số khẩn cấp CŨ được giữ nguyên và nhân CHỒNG lên hạng mục no đủ, không
    // thay thế nó: `sate` trả lời "còn cần thêm không", còn `< 200` trả lời "có đang
    // cháy nhà không". Hai câu khác nhau, và bỏ câu thứ hai thì một bộ lạc vừa cạn
    // kho sẽ chỉ thấy nhu cầu tăng tuyến tính trong khi nó cần một cú giật.
    food: p.foodWeight * sate(R.food, foodTarget)
        * (R.food < 200 ? 2.5 : 1) * (tribe.starving ? 3 : 1),
    wood: p.woodWeight * sate(R.wood, woodTarget) * (R.wood < 150 ? 2.2 : 1),
    gold: p.goldWeight * sate(R.gold, goldTarget)
        * (tribe.age < 3 && R.gold < 400 ? 1.5 : 1),
    // Hệ số 0,3 thời Đồ Đá đã BỎ. Câu "ở thời đại đó không một công trình nào cần
    // đá" hết đúng từ bản này: tháp canh — công trình mở khoá ngay từ Đồ Đá và nay
    // là điều kiện lên đời — tốn 30 đá một cái.
    //
    // `fortify` nhân vào ĐÂY chứ không chỉ vào `stoneTarget`, và cần cả hai vì
    // chúng trả lời hai câu khác nhau: đích tích trữ nói "còn cần bao nhiêu nữa",
    // hệ số nói "so với ba nghề kia thì nghề này đáng mấy phần". Chỉ nới đích thì
    // một bộ lạc đã đủ đá sẽ rút sạch thợ đá về ngay cả khi gen của nó bảo đừng —
    // vì chọn nghề là một phép so TƯƠNG ĐỐI (bài học Phase 3.27, hạng mục no đủ
    // của đá: dòng duy nhất biết no thì luôn thua).
    stone: p.stoneWeight * sate(R.stone, stoneTarget) * (0.7 + (p.fortify || 0) * 0.9)
  };
  let best = 'food', bestScore = -1;
  for (const job of RES_TYPES) {
    const score = need[job] / (tribe.jobCounts[job] + 1);
    if (score > bestScore) { bestScore = score; best = job; }
  }
  tribe.jobCounts[best]++;
  return best;
}

function tickVillager(u, tribe) {
  // Dân thường là loại duy nhất KHÔNG tính lại tốc độ mỗi tick — `speed = 1` gán
  // một lần lúc sinh ra rồi thôi. Nên nọc Mãng Xà phải tính từ hằng số 1 chứ
  // không từ `u.speed`: lấy `u.speed` thì tick đầu bị ép về 0 sẽ dính 0 vĩnh viễn.
  // Bị cắn lúc đang bỏ chạy là án tử — và đó đúng là điều loài rắn nói ra.
  // Đường cái nhân TRƯỚC, nọc rắn ăn lên kết quả — xem roadSpeed. Người dân là
  // đối tượng hưởng lợi lớn nhất của đường cái, và đó là chủ ý: cả nền kinh tế của
  // bộ lạc là những chuyến gánh hàng 22-35 ô mỗi chiều (xem BUILD.depot), nên gấp
  // đôi tốc độ đi bộ là gấp đôi năng suất của mỗi người trên đúng quãng đường đó.
  u.speed = slowedSpeed(u, roadSpeed(u, 1));
  if (u.fleeTimer > 0) {
    u.fleeTimer--;
    const threat = findNearestEnemyUnit(u.x, u.y, u.tribeId, CONFIG.UNIT.FLEE_RANGE + 3, true);
    if (threat) moveAwayFrom(u, threat.x, threat.y);
    else walkHome(u, tribe, tribe.rally.x, tribe.rally.y);
    return;
  }
  const threat = findNearestEnemyUnit(u.x, u.y, u.tribeId, CONFIG.UNIT.FLEE_RANGE, true);
  if (threat) {
    u.fleeTimer = CONFIG.UNIT.FLEE_TICKS;
    u.task = 'idle';
    moveAwayFrom(u, threat.x, threat.y);
    return;
  }

  switch (u.task) {
    case 'build': {
      const b = u.buildTarget;
      if (!b || b.hp <= 0 || b.done) { u.buildTarget = null; u.task = 'idle'; break; }
      if (cheb(u.x, u.y, b.x, b.y) <= b.size) {
        b.progress += CONFIG.BUILD.BUILD_RATE;
        b.hp = Math.min(b.maxHp, b.maxHp * (0.25 + 0.75 * b.progress / b.buildTicks));
        if (b.progress >= b.buildTicks) {
          onBuildingComplete(b, tribe);
          logEvent(`${tribe.name} xây xong ${CONFIG.BUILD[b.type].label}`, tribe.color);
          u.buildTarget = null; u.task = 'idle';
        }
      } else {
        // Đường tới công trường cũng phải có lối thoát. Trước đây đây là một
        // moveToward trần: thợ không tới được móng nhà (một khóm rừng mọc chen
        // giữa, hoặc móng đặt trong hốc kín) thì dao động tại chỗ tới hết đời,
        // mà `task = 'build'` lại khoá luôn mọi việc khác — không hái, không đốn,
        // không về kho. Bỏ việc thì công trường vẫn còn đó cho thợ khác nhận, và
        // chính người này quay lại hàng đợi việc ngay tick sau.
        moveToward(u, b.x, b.y);
        if (noProgress(u, 'b' + b.id, dist(u.x, u.y, b.x, b.y), 40)) {
          u.stuck = 0; u.buildTarget = null; u.task = 'idle';
        }
      }
      break;
    }

    case 'seek': {
      const cell = u.resTarget;
      // `cellTaken` phải được hỏi Ở ĐÂY nữa, không chỉ lúc chọn. Hai người xuất
      // phát từ hai đầu bản đồ hoàn toàn có thể cùng nhắm một ô trống trong cùng
      // một tick — lúc chọn thì cả hai đều thấy nó rảnh. Người tới trước cắm chỗ,
      // người tới sau phải đổi mục tiêu Ở GIỮA ĐƯỜNG chứ không phải đi hết quãng
      // rồi mới phát hiện. Đây đúng là cái khe mà mọi cơ chế đặt-chỗ đều rơi vào
      // nếu chỉ kiểm tra một lần lúc quyết định.
      if (!cell || cell.amount < CONFIG.ECON.RES_MIN || !resourceCells.has(cell.key) || cellTaken(cell, u.id)) {
        u.resTarget = null;
        const found = findNearestResource(u.x, u.y, JOB_RES[u.job], tribe.policy.expansion * 1.6, tribe.homeField, u.avoid, u.id);
        if (found) u.resTarget = found;
        else { u.job = null; u.task = 'idle'; } // hết loại tài nguyên này trong tầm -> đổi nghề
        break;
      }
      if (cheb(u.x, u.y, cell.x, cell.y) <= 1) u.task = 'gather';
      else {
        moveToward(u, cell.x, cell.y);
        // Kẹt (25 tick liền không tới gần hơn kỷ lục của chính mình) -> bỏ mỏ này.
        if (noProgress(u, cell.key, dist(u.x, u.y, cell.x, cell.y), 25)) {
          // Ghi vào sổ đen của RIÊNG người này rồi mới bỏ. Nếu chỉ bỏ suông,
          // lần chọn sau lại ra đúng cái mỏ vừa không tới được -> kẹt vĩnh viễn.
          u.stuck = 0;
          u.avoid.push(cell.key);
          if (u.avoid.length > 8) u.avoid.shift();
          u.resTarget = null;
        }
      }
      break;
    }

    case 'gather': {
      const cell = u.resTarget;
      if (!cell || cell.amount < CONFIG.ECON.RES_MIN || !resourceCells.has(cell.key)) { u.resTarget = null; u.task = 'seek'; break; }
      if (cheb(u.x, u.y, cell.x, cell.y) > 1) { u.task = 'seek'; break; }
      // AI TỚI TRƯỚC THÌ CẮM CHỖ, và chỗ đó được gia hạn mỗi tick còn đứng đây.
      // Người thứ hai tới nơi mà thấy đã có chủ thì quay lại 'seek' và hàm tìm sẽ
      // bỏ qua ô này — đó là toàn bộ luật "một ô một người".
      //
      // Đặt SAU điều kiện khoảng cách chứ không trước: giữ chỗ từ lúc mới nhắm thì
      // một người đi 30 ô sẽ khoá một ô suốt 30 tick mà không hái được hạt nào,
      // trong khi người đứng ngay cạnh phải bỏ đi. Chỗ chỉ thuộc về người ĐANG
      // ĐỨNG ĐÓ.
      if (cellTaken(cell, u.id)) { u.resTarget = null; u.task = 'seek'; break; }
      cell.worker = u.id;
      cell.workerTick = tick;
      if (u.avoid.length) u.avoid.length = 0; // đã tới nơi -> quên hết các lần bỏ cuộc cũ
      const rate = (cell.type === 'food' ? CONFIG.ECON.GATHER_FOOD
                   : cell.type === 'wood' ? CONFIG.ECON.GATHER_WOOD
                   : cell.type === 'gold' ? CONFIG.ECON.GATHER_GOLD : CONFIG.ECON.GATHER_STONE)
                   * u.gatherMult * CONFIG.ECON.gatherMult;
      const take = Math.min(rate, cell.amount, CONFIG.ECON.CARRY_CAPACITY - u.carry.amount);
      cell.amount -= take;
      u.carry.type = cell.type;
      u.carry.amount += take;
      // Mỏ cạn thì BIẾN MẤT khỏi bản đồ, và từ Phase 3.25 đó không còn là chuyện
      // dọn dẹp: ô vừa biến mất là ô XÂY NHÀ ĐƯỢC (xem findBuildSpot). Rừng bị đốn
      // dần mở ra lối đi mới, và vạt mỏ vừa moi rỗng mở ra một khu phố mới.
      // Ô của RUỘNG (regrow > 0) thì ở lại với amount = 0 để còn mọc lại.
      //
      // Ngưỡng RES_MIN dùng chung với findNearestResource và với điều kiện rời mỏ
      // ngay dưới — xem khối chú thích ở CONFIG.ECON.RES_MIN. Ba chỗ này TỪNG dùng
      // ba con số khác nhau và khoảng hở giữa chúng nuốt trọn cả cơ chế.
      if (cell.amount < CONFIG.ECON.RES_MIN && cell.regrow <= 0) removeResource(cell);
      if (u.carry.amount >= CONFIG.ECON.CARRY_CAPACITY || cell.amount < CONFIG.ECON.RES_MIN) u.task = 'return';
      break;
    }

    case 'return': {
      if (u.carry.amount <= 0) { u.task = 'idle'; break; }
      const W = CONFIG.GRID_WIDTH;
      // depotField, KHÔNG phải homeField: từ Phase 3.25 chỉ kinh đô và kho hàng
      // nhận hàng, nên trường dùng ở đây phải mọc từ đúng những toà đó. Xem chú
      // thích dài ở computeHomeField — dùng nhầm trường ở đây là dựng lại nguyên
      // con lỗi "dân ôm hàng đứng chết giữa làng".
      const dField = tribe.depotField;
      const fieldVal = dField ? dField[u.y * W + u.x] : -1;

      // Còn XA nhà: chỉ việc đi xuống theo trường khoảng cách — nó dẫn tới công
      // trình gần nhất theo ĐƯỜNG ĐI THẬT (vòng được hồ), và không tốn một lần
      // quét toàn bộ danh sách công trình nào cho mỗi bước.
      if (fieldVal > 3) {
        if (stepDownField(u, dField)) break;
      }

      // Đã tới sát khu dân cư: giờ mới xác định chính xác trả hàng vào đâu.
      // KHÔNG được cache "kho" từ lúc khởi hành rồi so khoảng cách với nó: trường
      // dẫn người ta tới toà nhà GẦN NHẤT, mà cái đó thường không phải toà đã
      // chọn lúc đầu -> điều kiện trả hàng vĩnh viễn sai, dân ôm hàng đứng mãi
      // trong làng. Đây đúng là lỗi vừa làm ba trong bốn nền kinh tế đứng hình.
      const depot = findNearestDepot(u.x, u.y, u.tribeId);
      if (!depot) { u.task = 'idle'; break; } // mất sạch kho -> ôm hàng lang thang
      // Đo tới MÉP (depotDropEdge), cùng một hình học với cái đã gieo mầm depotField.
      // Bản cũ đo euclid tới TÂM và để lọt bốn góc chéo của móng nhà — xem chú
      // thích dài ở findNearestDepot.
      if (depotDropEdge <= CONFIG.ECON.DEPOSIT_RANGE) {
        tribe.res[u.carry.type] += u.carry.amount;
        u.carry.amount = 0; u.carry.type = null;
        // TRẢ HÀNG XONG THÌ HỎI LẠI "GIỜ NÊN LÀM NGHỀ GÌ". Bản trước gán nghề đúng
        // MỘT LẦN trong đời (`if (!u.job)`), nên luật ưu tiên theo tỉ lệ chỉ điều
        // phối được người MỚI SINH — nó không bao giờ giải tán được một đội đã lỡ
        // dồn vào chỗ không còn cần nữa. Đo thật: một bộ lạc ngồi trên 5.201 đá
        // trong khi đội đập đá vẫn đi làm đều, vì không ai trong số họ có lý do để
        // hỏi lại câu đó lần thứ hai. Mọi trọng số động ở pickJob đều vô hiệu.
        //
        // Đặt ở ĐÂY chứ không ở nhánh idle là có lý do: nhánh idle chạy MỖI TICK,
        // mà pickJob có tác dụng phụ (tăng jobCounts), nên gọi lại ở đó sẽ thổi
        // phồng bộ đếm giữa hai lần computeTribeStats và làm hỏng chính luật tỉ lệ.
        // Trả hàng là một sự kiện rời rạc, mỗi chuyến đúng một lần.
        //
        // XÁC SUẤT 12%, KHÔNG PHẢI MỖI CHUYẾN — và đây là chỗ lần sửa đầu đã sai.
        // Cho đổi nghề sau mỗi chuyến thì kho đá hết phình thật, nhưng đo ra 7 kỷ
        // nguyên liền KHÔNG bộ lạc nào lên nổi thời đại 3. Lý do: nghề "dính" hoá
        // ra đang gánh một việc không ai viết ra — nó mã hoá SỰ CHUYÊN MÔN HOÁ THEO
        // VỊ TRÍ. Người đang đứng ở mỏ vàng cách nhà 40 ô mà mỗi chuyến lại bốc
        // nghề mới thì cả đời chỉ đi đường, không bao giờ khấu hao được quãng đường
        // đã đi. 12% cho ra thời gian đổi nghề trung bình ~8 chuyến: đủ chậm để
        // giữ chuyên môn, đủ nhanh để một đội thừa người tan trong vài nghìn tick.
        if (Math.random() < 0.12) u.job = null;
        u.task = 'idle';
        break;
      }

      // `fieldVal > 0` chứ không phải chỉ `tribe.homeField`: ở ô có trường = 0,
      // `stepDownField` trả về TRUE mà KHÔNG bước (nghĩa của nó là "tới đích rồi,
      // đừng đi lang thang"), nên nhánh dự phòng bên dưới không bao giờ chạy và
      // người dân đứng chết. Sau khi sửa hình học ở trên, ô trường = 0 SỐNG luôn
      // kéo theo trả được hàng — nên rơi được tới đây chỉ còn đúng một cách: trường
      // đã CŨ (dựng lại mỗi 400 tick, toà nhà kia vừa bị san phẳng). Lúc đó thà đi
      // tham lam về một toà nhà có thật còn hơn đứng nhìn một cái móng không còn.
      if (!(fieldVal > 0 && dField && stepDownField(u, dField))) {
        // Vẫn ưu tiên TRƯỜNG, kể cả khi đã vào tới sát làng (fieldVal <= 3), rồi
        // mới rơi về đi tham lam. Đây đúng là họ hàng của cái bẫy "trường dẫn tới
        // cái GẦN NHẤT, còn mục tiêu ghi nhớ lại là một cái KHÁC" đã ba lần làm
        // chết mô phỏng: `findNearestDepot` chọn theo ĐƯỜNG CHIM BAY, nên
        // toà nhà nó trả về hoàn toàn có thể là toà nằm bên kia một khóm rừng,
        // trong khi trường lại đang dẫn tới toà bên này. Đi tham lam tới toà bên
        // kia thì kẹt ở mép rừng, mà điều kiện trả hàng đo với đúng toà đó nên
        // không bao giờ đúng — dân ôm hàng dao động ngay giữa làng mình.
        // Trường thì luôn dẫn tới một toà nhà CÓ THẬT bằng đường đi CÓ THẬT.
        moveToward(u, depot.x, depot.y);
      }

      // LƯỚI AN TOÀN — 'return' là việc DUY NHẤT của người dân không có đường bỏ
      // cuộc. 'build' bỏ móng sau 40 tick, 'seek' bỏ mỏ sau 25 và ghi sổ đen,
      // 'idle' có searchBackoff; còn về kho thì cứ thử mãi. Bao lâu nay không lộ
      // ra vì hai nhánh trên đã đủ để giữ người dân đi đúng đường — nhưng đó là
      // "chưa gặp", không phải "không thể", và cái khe hình vuông-hình tròn vừa
      // rồi chứng minh điều đó bằng 56 người đứng chết.
      //
      // Đo theo depotDropEdge (khoảng cách tới kho GẦN NHẤT, không phải một toà cụ
      // thể): đi về làng thì số đó giảm đều, nên chỉ một vòng lặp kín thật sự mới
      // đếm được tới 90. Bỏ cuộc = VỨT HÀNG, vì còn ôm hàng thì tick sau lại rơi
      // đúng vào 'return' và vòng lặp tự dựng lại. Mất tối đa 15 tài nguyên, đổi
      // lấy một người dân sống lại — và nếu con số này lớn thì nó là triệu chứng
      // của một lỗi khác, đáng đo, chứ không phải một khoản lỗ đáng cân bằng.
      if (noProgress(u, 'ret', depotDropEdge, 90)) {
        u.stuck = 0;
        u.carry.amount = 0; u.carry.type = null;
        u.task = 'idle';
      }
      break;
    }

    default: { // idle
      if (!u.job) u.job = pickJob(tribe);
      // NGHỈ TÌM sau một lượt tìm trắng tay. Không có cái này thì một người dân
      // ở vùng đã cạn tài nguyên sẽ chạy tới BỐN lượt quét vòng tròn mỗi tick
      // (1 cho nghề hiện tại + 3 cho nghề thay thế) và lặp lại y hệt ở tick sau,
      // vĩnh viễn. Trên bản đồ cũ điều đó còn giấu được; bản đồ 340x220 với bán
      // kính bành trướng lớn hơn thì mỗi lượt quét đắt hơn nhiều, và đo thật:
      // findNearestResource chiếm 85% toàn bộ thời gian mô phỏng, 7,38 ms/tick.
      if (tick < u.searchBackoff) {
        moveToward(u, tribe.rally.x + Math.round(randRange(-6, 6)), tribe.rally.y + Math.round(randRange(-6, 6)));
        break;
      }
      const found = findNearestResource(u.x, u.y, JOB_RES[u.job], tribe.policy.expansion * 1.6, tribe.homeField, u.avoid, u.id);
      if (found) { u.resTarget = found; u.task = 'seek'; }
      else {
        // Không còn loại này quanh đây: thử loại khác, không thì lang thang.
        const alt = RES_TYPES.find(j => j !== u.job && findNearestResource(u.x, u.y, j, tribe.policy.expansion * 2, tribe.homeField, u.avoid, u.id));
        if (alt) { tribe.jobCounts[u.job] = Math.max(0, tribe.jobCounts[u.job] - 1); u.job = alt; tribe.jobCounts[alt]++; }
        else {
          u.searchBackoff = tick + 40;
          moveToward(u, tribe.rally.x + Math.round(randRange(-6, 6)), tribe.rally.y + Math.round(randRange(-6, 6)));
        }
      }
      break;
    }
  }
}

