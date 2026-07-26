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
  const nextAgeStone = (CONFIG.AGE.COST[tribe.age + 1] || {}).stone || 0;
  const wonderStone = (tribe.age >= 4 && !tribe.wonderStarted)
    ? CONFIG.BUILD.wonder.cost.stone * (1 + (1 - p.wonderDrive) * 0.8) : 0;
  const stoneTarget = Math.max(220, nextAgeStone + wonderStone + 150);
  const stoneUse = (tribe.age >= 2 ? 1 : 0.3)
                 * clamp(1.25 - tribe.res.stone / stoneTarget, 0.04, 1);
  const need = {
    food: p.foodWeight * (tribe.res.food < 200 ? 2.5 : 1) * (tribe.starving ? 3 : 1),
    wood: p.woodWeight * (tribe.res.wood < 150 ? 2.2 : 1),
    gold: p.goldWeight * (tribe.age < 3 && tribe.res.gold < 400 ? 1.5 : 1),
    stone: p.stoneWeight * stoneUse
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
      if (!cell || cell.amount < 1 || !resourceCells.has(cell.key)) {
        u.resTarget = null;
        const found = findNearestResource(u.x, u.y, JOB_RES[u.job], tribe.policy.expansion * 1.6, tribe.homeField, u.avoid);
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
      if (!cell || cell.amount < 1 || !resourceCells.has(cell.key)) { u.resTarget = null; u.task = 'seek'; break; }
      if (cheb(u.x, u.y, cell.x, cell.y) > 1) { u.task = 'seek'; break; }
      if (u.avoid.length) u.avoid.length = 0; // đã tới nơi -> quên hết các lần bỏ cuộc cũ
      const rate = (cell.type === 'food' ? CONFIG.ECON.GATHER_FOOD
                   : cell.type === 'wood' ? CONFIG.ECON.GATHER_WOOD
                   : cell.type === 'gold' ? CONFIG.ECON.GATHER_GOLD : CONFIG.ECON.GATHER_STONE)
                   * u.gatherMult * CONFIG.ECON.gatherMult;
      const take = Math.min(rate, cell.amount, CONFIG.ECON.CARRY_CAPACITY - u.carry.amount);
      cell.amount -= take;
      u.carry.type = cell.type;
      u.carry.amount += take;
      // Cây/mỏ cạn thì BIẾN MẤT khỏi bản đồ (rừng bị đốn dần mở ra lối đi mới);
      // bụi quả/ruộng thì ở lại với amount = 0 để còn mọc lại.
      if (cell.amount <= 0.01 && cell.regrow <= 0) removeResource(cell);
      if (u.carry.amount >= CONFIG.ECON.CARRY_CAPACITY || cell.amount < 1) u.task = 'return';
      break;
    }

    case 'return': {
      if (u.carry.amount <= 0) { u.task = 'idle'; break; }
      const W = CONFIG.GRID_WIDTH;
      const fieldVal = tribe.homeField ? tribe.homeField[u.y * W + u.x] : -1;

      // Còn XA nhà: chỉ việc đi xuống theo trường khoảng cách — nó dẫn tới công
      // trình gần nhất theo ĐƯỜNG ĐI THẬT (vòng được hồ), và không tốn một lần
      // quét toàn bộ danh sách công trình nào cho mỗi bước.
      if (fieldVal > 3) {
        if (stepDownField(u, tribe.homeField)) break;
      }

      // Đã tới sát khu dân cư: giờ mới xác định chính xác trả hàng vào đâu.
      // KHÔNG được cache "kho" từ lúc khởi hành rồi so khoảng cách với nó: trường
      // dẫn người ta tới toà nhà GẦN NHẤT, mà cái đó thường không phải toà đã
      // chọn lúc đầu -> điều kiện trả hàng vĩnh viễn sai, dân ôm hàng đứng mãi
      // trong làng. Đây đúng là lỗi vừa làm ba trong bốn nền kinh tế đứng hình.
      const depot = findNearestOwnBuilding(u.x, u.y, u.tribeId);
      if (!depot) { u.task = 'idle'; break; } // mất sạch nhà cửa -> ôm hàng lang thang
      // Đo tới MÉP (depotEdge), cùng một hình học với cái đã gieo mầm homeField.
      // Bản cũ đo euclid tới TÂM và để lọt bốn góc chéo của móng nhà — xem chú
      // thích dài ở findNearestOwnBuilding.
      if (depotEdge <= CONFIG.ECON.DEPOSIT_RANGE) {
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
      if (!(fieldVal > 0 && tribe.homeField && stepDownField(u, tribe.homeField))) {
        // Vẫn ưu tiên TRƯỜNG, kể cả khi đã vào tới sát làng (fieldVal <= 3), rồi
        // mới rơi về đi tham lam. Đây đúng là họ hàng của cái bẫy "trường dẫn tới
        // cái GẦN NHẤT, còn mục tiêu ghi nhớ lại là một cái KHÁC" đã ba lần làm
        // chết mô phỏng: `findNearestOwnBuilding` chọn theo ĐƯỜNG CHIM BAY, nên
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
      // Đo theo depotEdge (khoảng cách tới kho GẦN NHẤT, không phải một toà cụ
      // thể): đi về làng thì số đó giảm đều, nên chỉ một vòng lặp kín thật sự mới
      // đếm được tới 90. Bỏ cuộc = VỨT HÀNG, vì còn ôm hàng thì tick sau lại rơi
      // đúng vào 'return' và vòng lặp tự dựng lại. Mất tối đa 15 tài nguyên, đổi
      // lấy một người dân sống lại — và nếu con số này lớn thì nó là triệu chứng
      // của một lỗi khác, đáng đo, chứ không phải một khoản lỗ đáng cân bằng.
      if (noProgress(u, 'ret', depotEdge, 90)) {
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
      const found = findNearestResource(u.x, u.y, JOB_RES[u.job], tribe.policy.expansion * 1.6, tribe.homeField, u.avoid);
      if (found) { u.resTarget = found; u.task = 'seek'; }
      else {
        // Không còn loại này quanh đây: thử loại khác, không thì lang thang.
        const alt = RES_TYPES.find(j => j !== u.job && findNearestResource(u.x, u.y, j, tribe.policy.expansion * 2, tribe.homeField, u.avoid));
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

