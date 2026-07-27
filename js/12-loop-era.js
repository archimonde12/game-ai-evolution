'use strict';
// ============================================================
// 12-loop-era.js
// ------------------------------------------------------------
// Vòng lặp mô phỏng một tick, điều kiện kết thúc kỷ nguyên + chọn lọc policy
// cho kỷ nguyên sau, danh sách thần lực và auto-god.
// Tách cơ học từ civilization.html một-file, dòng 6972–7466.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Vòng mô phỏng
// ============================================================
function simulationTick() {
  tick++;

  if (tick % CONFIG.BRAIN_INTERVAL === 0) {
    for (const t of tribes) if (t.alive) tribeBrain(t);
  }

  rebuildTribeBuildings();
  rebuildUnitBuckets();
  rebuildHeroIndex();

  if (CONFIG.MONSTER.ENABLED) for (const l of lairs) tickLair(l);

  if (gameMode === 'defend' && eraState === 'playing') {
    if (tick >= nextWaveTick) spawnWave();
    // Trường tiến công phải làm mới định kỳ: nhà cửa bị phá và xây thêm liên tục,
    // trường cũ sẽ dẫn cả sóng tới một đống phế tích.
    if (!monsterField || tick - monsterFieldTick > CONFIG.DEFEND.FIELD_REFRESH) computeMonsterField();
  }

  for (const u of units) {
    if (u.hp <= 0) continue;
    // Nọc nhện. `undefined > tick` là false nên đơn vị chưa từng bị cắn không tốn
    // gì ngoài một phép so sánh — không cần khởi tạo trường này cho cả nghìn đơn
    // vị của bốn bộ lạc chỉ để phục vụ một loài quái.
    if (u.venomUntil > tick) {
      u.hp -= u.venomDps;
      if ((tick + u.id) % 20 === 0) addFx({ type: 'spark', x: u.x, y: u.y, life: 7, maxLife: 7, color: '#8fae52' });
      // Chết vì độc vẫn phải vào sổ tử của bộ lạc. Nếu không, một bộ lạc bị nhện
      // bào mòn sẽ thấy quân số tụt mà cột "tổn thất" đứng yên — và `tribeScore`
      // đọc sai luôn cục diện.
      if (u.hp <= 0) {
        u.venomUntil = 0;
        if (u.tribeId >= 0 && tribes[u.tribeId]) tribes[u.tribeId].losses++;
        continue;
      }
    }
    // Quái vật xử lý TRƯỚC khi tra tribes[]: tribeId của chúng là -1, tra vào là
    // undefined và mọi thứ phía sau nổ.
    if (u.type === 'monster') { tickMonster(u); continue; }
    const tribe = tribes[u.tribeId];
    // QUÂN LƯƠNG chạy TRƯỚC mọi nhánh theo loại, và đó là cả bản thiết kế của nó:
    // bốn hàm tick bên dưới có hơn hai chục nhánh `return` sớm cộng lại, nên một
    // dòng đặt bên trong chúng sẽ chạy hoặc không chạy tuỳ hôm đó người lính đang
    // bận gì. `maxSupply` bằng 0 với dân thường nên họ chỉ trả một phép so sánh.
    if (u.maxSupply > 0) tickSupply(u, tribe);
    if (u.type === 'villager') tickVillager(u, tribe);
    else if (u.type === 'hero') tickHero(u, tribe);
    // Thầy lang phải tách ra TRƯỚC nhánh `else` cuối: nhánh đó là tickSoldier, và
    // một đơn vị attack = 0 chạy qua thang ưu tiên của lính sẽ đi tìm địch, đuổi
    // theo, áp sát rồi đứng đó gõ những cú 0 sát thương cho tới lúc chết.
    else if (u.type === 'medic') tickMedic(u, tribe);
    // QUÂN KỲ cũng phải tách ra trước nhánh `else` cuối, cùng đúng lý do vừa viết
    // cho thầy lang ngay trên: ô sát thương của nó bằng 0. Quên dòng này thì lá cờ
    // sẽ hăng hái đi tìm địch, áp sát, và đứng gõ những cú 0 sát thương cho tới
    // lúc chết — mà nó lẽ ra phải đứng hàng giữa cổ vũ.
    else if (u.type === 'standard') tickStandard(u, tribe);
    // ĐỘI HẬU CẦN — nhánh riêng, TRƯỚC `else` cuối, đúng cùng lý do đã phải viết
    // hai lần ở trên cho thầy lang và quân kỳ: nhánh cuối là tickSoldier, và một
    // đơn vị attack = 0 chạy qua thang ưu tiên của lính sẽ đi tìm địch, áp sát, rồi
    // đứng gõ những cú 0 sát thương cho tới lúc chết. Lần thứ ba cùng một hình dạng.
    else if (u.type === 'quarter') tickQuarter(u, tribe);
    else tickSoldier(u, tribe);
  }

  for (const b of buildings) {
    if (b.hp <= 0) continue;
    if (CONFIG.BUILD[b.type].range) tickDefender(b, tribes[b.tribeId]);
    // `if` riêng chứ không nối `else if` vào dòng trên: hai câu hỏi khác nhau ("có
    // bắn được không" / "có phải trại tiếp tế không"), và nối chúng thành một chuỗi
    // là dựng lại đúng cái bẫy mà chú thích UNIT_SPEC đã cảnh báo — thêm loại thứ N
    // vào một chuỗi `else if` thì loại mới lặng lẽ rơi vào nhánh sai.
    if (b.type === 'camp') tickCamp(b);
  }

  // TƯỜNG THÀNH: tự sửa mỗi tick, dựng lại vành thì thưa hơn nhiều.
  //
  // Hai nhịp khác nhau vì hai câu hỏi khác nhau. "Ô này lành lại chưa" phải hỏi
  // mỗi tick, nếu không thì REGEN 0,35 máu/tick trở thành một con số nói dối.
  // "Vành tường có phải dựng lại không" thì đổi vài lần mỗi kỷ nguyên (lên đời,
  // lập thêm đô, mất một đô) — hỏi nó mỗi tick là dựng một chuỗi chữ ký cho bốn
  // bộ lạc 12 lần mỗi giây để nhận về đúng cùng một câu trả lời.
  tickWalls();
  if (tick % 30 === 0) for (const t of tribes) ensureWalls(t);
  if (tick % 30 === 7) tickWorldBoss();   // lệch pha 7 để hai lượt quét không dồn vào một tick

  for (const t of tribes) {
    if (!t.alive) continue;
    tickTribeEconomy(t);
    tickResearch(t);
    if (t.starving) {
      // Đói -> tụt máu. Đây là cơ chế SỤP ĐỔ thật (không phải chỉ "chậm phát
      // triển"): một nền văn minh bành trướng quá tay có thể tự chết mà không
      // cần ai đánh. Lính chịu đủ, dân thường chịu một nửa (xem STARVE_DAMAGE).
      for (const u of units) {
        if (u.tribeId === t.id && u.hp > 0) {
          u.hp -= CONFIG.ECON.STARVE_DAMAGE * (u.type === 'villager' ? 0.5 : 1);
        }
      }
    }
  }

  // Dọn xác. Công trình phải đi qua destroyBuilding() TRƯỚC khi bị lọc bỏ — nếu
  // không, ruộng bị sét đánh/bị đốt sẽ để lại các ô lương thực mồ côi trên bản đồ
  // (dân vẫn tới thu hoạch được ở chỗ chẳng còn ruộng nào).
  if (units.some(u => u.hp <= 0)) {
    // Anh hùng phải được "kết sổ" TRƯỚC khi bị lọc khỏi mảng: cái chết của họ
    // chính là một thế hệ khép lại của vòng tiến hoá cấp cá thể. Lọc trước rồi
    // mới tìm thì tuổi thọ và chiến công của đời đó biến mất, và dòng dõi đứng im.
    for (const u of units) {
      if (u.hp > 0) continue;
      if (u.type === 'hero') onHeroDeath(u);
      else if (u.type === 'monster') onMonsterDeath(u);
    }
    units = units.filter(u => u.hp > 0);
  }
  if (lairs.length && lairs.some(l => l.hp <= 0)) lairs = lairs.filter(l => l.hp > 0);
  // Đồ rơi ra mà không ai nhặt thì tan biến — nếu không, cuối kỷ nguyên bản đồ
  // rải đầy vật phẩm mồ côi và anh hùng nào cũng full đồ mà chẳng cần mạo hiểm.
  if (groundItems.length && tick % 60 === 0) {
    groundItems = groundItems.filter(it => tick - it.born < CONFIG.ITEM.LIFETIME);
  }
  if (buildings.some(b => b.hp <= 0)) {
    for (const b of buildings) if (b.hp <= 0 && b.farmCells.length) destroyBuilding(b);
    buildings = buildings.filter(b => b.hp > 0);
  }

  // Tái tạo tài nguyên (bụi quả + ruộng)
  for (const c of regrowList) {
    if (c.amount < c.max) c.amount = Math.min(c.max, c.amount + c.regrow);
  }

  // Đức tin hồi. Mỗi Đền thờ đang đứng góp thêm — đây là sợi dây duy nhất nối
  // hành vi của bộ lạc với QUYỀN LỰC CỦA NGƯỜI XEM: thế giới càng sùng đạo thì
  // Chúa Tể càng can thiệp được nhiều.
  if (tick % CONFIG.GOD.FAITH_REGEN_TICKS === 0) {
    let holy = 0;
    for (const b of buildings) {
      if (!b.done || b.hp <= 0) continue;
      if (b.type === 'temple') holy += 0.4;
      else if (b.type === 'shrine') holy += 0.12;
    }
    faith = Math.min(CONFIG.GOD.FAITH_MAX, faith + 1 + holy);
  }

  // Thờ cúng: dâng tế + cất lời khẩn cầu. Chạy SAU vòng kinh tế để lời cầu đọc
  // đúng tình cảnh của tick này (đói hay chưa đói) chứ không phải của tick trước.
  // Nhịp chậm nhất của cơ chế thờ cúng là 300 tick, nên xét lại mỗi 8 tick là
  // thừa độ phân giải. Đây là loại chi phí dễ lọt lưới nhất: mỗi phần riêng lẻ
  // đều rẻ, nhưng "mỗi tick, cho mỗi bộ lạc" là một hệ số nhân âm thầm.
  if (tick % 8 === 0) for (const t of tribes) if (t.alive) tickWorship(t);
  if (tick % CONFIG.WORSHIP.FAVOUR_INTERVAL === 0) divineFavour();
  autoGodTick();

  updateWonderRace();

  // Kiểm tra diệt vong. Không dùng "còn nhà là còn sống": một bộ lạc mất sạch
  // dân nhưng còn 17 căn nhà thì chỉ là ĐỐNG PHẾ TÍCH — không ai đi kiếm ăn, mà
  // muốn ra dân mới thì phải có nhà chính VÀ đủ lương trả cho một người. Bản đầu
  // dùng luật cũ nên 3 bộ lạc xác sống kéo kỷ nguyên chạy vô nghĩa tới hết giờ.
  for (const t of tribes) {
    if (!t.alive) continue;
    const hasUnit = units.some(u => u.tribeId === t.id);
    const canRecover = buildings.some(b => b.tribeId === t.id && b.type === 'town' && b.done && b.hp > 0)
                       && t.res.food >= CONFIG.UNIT.VILLAGER.cost.food;
    if (!hasUnit && !canRecover) {
      t.alive = false;
      t.diedAtTick = tick;   // thước đo duy nhất của chế độ thủ thành
      t.warTarget = null;
      // Nhà cửa của bộ lạc đã diệt vong sụp thành phế tích và biến mất — nếu để
      // lại, lính các bộ lạc khác vẫn kéo tới "công thành" một kẻ đã chết.
      for (const b of buildings) if (b.tribeId === t.id) destroyBuilding(b);
      buildings = buildings.filter(b => b.hp > 0);
      logEvent(`☠ ${t.name} DIỆT VONG`, '#d05a44', true);
    }
  }

  // fx và thông báo nổi KHÔNG già đi ở đây nữa — chúng già theo thời gian THẬT
  // trong ageEffects(). Một tia chém sống 5 tick từng là 1/120 giây ở tốc độ cũ,
  // tức ngắn hơn một frame: cả một hệ hiệu ứng chiến đấu được vẽ ra mà gần như
  // chưa từng có ai nhìn thấy. Buộc tuổi thọ hiệu ứng vào đồng hồ mô phỏng là
  // chỗ sai gốc, vì hiệu ứng nói chuyện với MẮT, không nói chuyện với luật chơi.
  if (ruins.length && tick % 60 === 0) ruins = ruins.filter(r => tick - r.born < CONFIG.RUIN_LIFETIME);
  // Điểm nóng nguội dần: một trận đánh xong thì camera đạo diễn phải thôi bám nó.
  if (tick % 30 === 0 && hotspots.length) {
    for (const h of hotspots) h.weight *= 0.75;
    hotspots = hotspots.filter(h => h.weight > 0.5 && tick - h.tick < 900);
  }
  if (tick % CONFIG.TERRITORY.RECOMPUTE_INTERVAL === 0) computeTerritory();

  if (tick % CONFIG.CHART_SAMPLE_INTERVAL === 0) sampleHistory();

  checkEraEnd();
}

function sampleHistory() {
  history.ticks.push(tick);
  for (const t of tribes) {
    const pop = units.reduce((n, u) => n + (u.tribeId === t.id ? 1 : 0), 0);
    history.pop[t.id].push(pop);
    history.food[t.id].push(Math.round(t.res.food));
  }
  if (history.ticks.length > CONFIG.CHART_HISTORY) {
    history.ticks.shift();
    for (let i = 0; i < 4; i++) { history.pop[i].shift(); history.food[i].shift(); }
  }
}

function tribeScore(t) {
  const s = t.stats || computeTribeStats(t);
  if (!t.alive) return 0;
  return Math.round(
    s.villagers * 3 + s.soldiers * 5 +
    (s.bcount.town * 25 + s.bcount.house * 6 + s.bcount.farm * 8 + s.bcount.barracks * 15 + s.bcount.tower * 12 +
     s.bcount.workshop * 18 + s.bcount.shrine * 7 + s.bcount.temple * 20 + s.bcount.wonder * 120) +
    t.age * 60 + t.kills * 2 +
    (t.res.food + t.res.wood + t.res.gold + t.res.stone) / 40
  );
}

// Chạy mỗi tick. Dựng lại wonderWatch TỪ ĐẦU thay vì bảo trì nó bằng tay ở các
// điểm sự kiện — nhờ vậy "Kỳ quan bị phá", "bộ lạc chủ diệt vong", "hai Kỳ quan
// cùng tồn tại" đều đúng mà không có dòng nào viết riêng cho từng trường hợp.
// Đây là bài học đắt nhất của Phase 3.1 và 3.3: bản sao trạng thái thì phải đồng
// bộ ở MỌI đường ra, còn dẫn xuất thì không bao giờ lệch.
function updateWonderRace() {
  if (gameMode === 'defend') { wonderWatch = null; return; }
  let lead = null;
  for (const b of buildings) {
    if (b.type !== 'wonder' || !b.done || b.hp <= 0) continue;
    if (!tribes[b.tribeId] || !tribes[b.tribeId].alive) continue;
    if (b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + CONFIG.WONDER.HEAL);
    // Toà nào khánh thành TRƯỚC thì đồng hồ của nó gần điểm thắng hơn — đó mới là
    // toà mà cả bàn cờ phải phản ứng.
    if (!lead || b.wonderDoneAt < lead.wonderDoneAt) lead = b;
  }
  wonderWatch = lead ? { buildingId: lead.id, tribeId: lead.tribeId, doneAt: lead.wonderDoneAt } : null;
  if (lead && tick - lead.wonderDoneAt >= CONFIG.WONDER.HOLD_TICKS) wonderWinnerTribe = lead.tribeId;
}

function checkEraEnd() {
  if (eraState !== 'playing') return;
  // Thắng bằng Kỳ quan cắt ngang mọi luật khác — kể cả khi ba bộ lạc kia vẫn còn
  // sống khoẻ. Đó chính là điểm của nó.
  if (wonderWinnerTribe >= 0) { endEra(); return; }
  const alive = tribes.filter(t => t.alive);
  // Thủ thành: bộ lạc KHÔNG đánh nhau, nên "còn đúng 1 bên sống" không phải là
  // kết thúc — đó là chuyện bình thường và ván vẫn tiếp diễn. Ván chỉ hết khi
  // quái vật quét sạch tất cả. Điểm số chính là số tick sống được.
  if (gameMode === 'defend') {
    if (alive.length === 0 || tick >= CONFIG.ERA.MAX_TICKS) endEra();
    return;
  }
  if (alive.length <= 1 || tick >= CONFIG.ERA.MAX_TICKS) endEra();
}

// Ở chế độ thủ thành, thước đo là THỜI GIAN SỐNG SÓT, không phải bảng điểm xây
// dựng. Nhân 100.000 để tick sống sót áp đảo tuyệt đối; tribeScore chỉ còn là
// tiêu chí phụ khi hai bộ lạc cùng trụ tới lúc hết giờ.
function defendScore(t) {
  return (t.alive ? tick : t.diedAtTick) * 100000 + tribeScore(t);
}

function endEra() {
  eraState = 'ended';
  const defend = gameMode === 'defend';
  for (const t of tribes) computeTribeStats(t);
  const ranked = tribes.slice().sort((a, b) => defend ? defendScore(b) - defendScore(a) : tribeScore(b) - tribeScore(a));
  // Thắng bằng Kỳ quan ĐÈ LÊN bảng điểm: kẻ giữ được Kỳ quan là người thắng kể cả
  // khi điểm xây dựng của họ thua. Nếu vẫn xếp theo điểm thì cả cơ chế chỉ còn là
  // một cách kết thúc sớm, chứ không phải một con đường chiến thắng thứ hai.
  const winner = (!defend && wonderWinnerTribe >= 0) ? tribes[wonderWinnerTribe] : ranked[0];
  const survived = winner.alive ? tick : winner.diedAtTick;
  if (defend && tick > survivalRecord) survivalRecord = tick;
  const reason = defend
    ? `trụ được ${survived} tick qua ${waveNumber} đợt`
    : wonderWinnerTribe >= 0 ? 'giữ vững KỲ QUAN'
    : tribes.filter(t => t.alive).length <= 1 ? 'thống nhất thiên hạ' : 'dẫn đầu khi hết kỷ nguyên';

  eraHistory.unshift({
    era, winner: winner.name, color: winner.color, reason, tick,
    score: tribeScore(winner), age: winner.age,
    policy: Object.assign({}, winner.policy)
  });
  if (eraHistory.length > 12) eraHistory.pop();
  logEvent(defend
    ? `★ Kỷ nguyên ${era} kết thúc — cả bốn bộ lạc bị quét sạch ở tick ${tick} (đợt ${waveNumber}). Trụ lâu nhất: ${winner.name}, ${survived} tick.`
    : `★ Kỷ nguyên ${era} kết thúc — ${winner.name} ${reason}`, '#d8a544');

  // Anh hùng đáng nhớ nhất kỷ nguyên — xét cả những người đã chết lẫn người còn
  // đứng lúc màn hạ. Một dòng biên niên sử kiểu này làm cả kỷ nguyên có nhân vật
  // chính, thay vì chỉ có một bảng điểm.
  let fame = null;
  const consider = (name, t, kills, razed, lifespan) => {
    const sc = kills + razed * 8;
    if (sc > 0 && (!fame || sc > fame.sc)) fame = { sc, name, t, kills, razed, lifespan };
  };
  for (const t of tribes) {
    for (const r of t.heroLine.history) {
      consider(`${t.heroLine.dynasty} đời ${r.gen}`, t, r.kills, r.razed, r.lifespan);
    }
  }
  for (const u of units) {
    if (u.type === 'hero') consider(u.name, tribes[u.tribeId], u.heroKills, u.heroRazed, tick - u.born);
  }
  if (fame) {
    logEvent(`🏅 Anh hùng lừng danh nhất: ${fame.name} (${fame.t.name}) — ${fame.kills} mạng, ${fame.razed} công trình, sống ${fame.lifespan} tick`, fame.t.color, true);
  }

  showEraCard(winner, reason);
  eraBannerFrames = CONFIG.ERA.BANNER_FRAMES;
  running = false;
}

// Chọn lọc giữa các kỷ nguyên: policy của bộ lạc thắng được giữ nguyên 1 bản +
// nhân bản đột biến 2 bản, cộng 1 bản hoàn toàn ngẫu nhiên. Bản random giữ cho
// quần thể chiến lược không bị hội tụ sớm về 1 kiểu chơi duy nhất (mất đa dạng
// = không còn tiến hoá được nữa).
function nextEraPolicies() {
  const ranked = tribes.slice().sort((a, b) => tribeScore(b) - tribeScore(a));
  // PHẢI dùng đúng người thắng mà endEra đã công bố. Nếu chỗ này vẫn xếp thuần
  // theo tribeScore thì một bộ lạc thắng bằng Kỳ quan sẽ được xướng tên trên thẻ
  // tổng kết nhưng KHÔNG được truyền lại chiến lược — tức là con đường chiến thắng
  // mới hoàn toàn vô hình đối với chọn lọc, và gen wonderDrive sẽ chỉ trôi tự do
  // y như `aggression` ở chế độ thủ thành. Lỗi kiểu này không làm gì hỏng ngay:
  // nó chỉ lặng lẽ khiến cả cơ chế không tiến hoá được, suốt hàng chục kỷ nguyên.
  const winner = (gameMode !== 'defend' && wonderWinnerTribe >= 0) ? tribes[wonderWinnerTribe] : ranked[0];
  const runnerUp = ranked.find(t => t !== winner) || winner;
  const label = `K${era}·${winner.name}`;
  const out = [];
  const keep = Object.assign({}, winner.policy); keep.__lineage = label + ' (nguyên bản)';
  const m1 = mutatePolicy(winner.policy); m1.__lineage = label + ' (đột biến)';
  const m2 = mutatePolicy(runnerUp.policy); m2.__lineage = `K${era}·${runnerUp.name} (đột biến)`;
  const rnd = randomPolicy(); rnd.__lineage = 'ngẫu nhiên';

  // Gen anh hùng cũng được thừa kế qua kỷ nguyên, nhưng KHÁC policy ở một điểm:
  // không có bản "nguyên bản" nào cả — startEra luôn đột biến từ hạt giống. Vì
  // dòng dõi anh hùng còn tự leo đồi cả chục đời NGAY TRONG kỷ nguyên mới, giữ
  // nguyên si điểm xuất phát chẳng thêm thông tin gì, mà lại làm cả bốn bộ lạc
  // khởi hành từ một điểm giống hệt nhau.
  const bestHero = (t) => (t.heroLine.best ? t.heroLine.best.genes : t.heroLine.genes);
  keep.__heroSeed = bestHero(winner);
  m1.__heroSeed = bestHero(winner);
  m2.__heroSeed = bestHero(runnerUp);
  // rnd cố ý KHÔNG có hạt giống -> gen anh hùng ngẫu nhiên hoàn toàn, giữ đa dạng.

  out.push(keep, m1, m2, rnd);
  // Xáo vị trí để "bộ lạc thắng" không luôn nằm ở slot màu cũ.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function beginNextEra() {
  const policies = nextEraPolicies();
  era++;
  hideEraCard();
  startEra(policies);
  running = true;
  setPauseUI(true);
}

// ============================================================
// Quyền năng chúa tể
// ============================================================
// ============================================================
// CÂN BẰNG LẠI, PHASE 3.30 — và thước đo dùng để cân
// ============================================================
// Đức Tin vào ~1 điểm mỗi 20 tick cộng 2 điểm mỗi lần dâng tế, trần 100. Nghĩa là
// người xem ra quyết định "tiêu vào đâu" khoảng mỗi 400-600 tick. Bảng giá cũ
// (15/20/25/30/35) trải quá hẹp trên một cái ví như thế: chênh lệch 15 so với 35
// không đủ để một lựa chọn nào thật sự PHẢI nhịn cho lựa chọn khác.
//
// Thước đo dùng ở đây là "một điểm Đức Tin đổi được bao nhiêu", và ba nhóm phải
// nằm ở ba bậc rõ rệt:
//   · SỬA CẢNH VẬT (Mưa Lành, Rừng Mọc) — rẻ, hiệu lực dàn đều, không đổi ai
//     đang thắng. Đây là nút bấm thường xuyên.
//   · ĐÁNH VÀO MỘT BỘ LẠC (Sét Trời, Dịch Bệnh, Ban Phước) — trung bình, đổi
//     ngay cán cân giữa hai bên nhưng thế giới trở lại hình dạng cũ sau đó.
//   · ĐỔI CẢ VÁN CỜ (Thiên Ma) — đắt gần trọn cái ví, và nó để lại một VẬT THỂ
//     trên bản đồ chứ không phải một hiệu ứng.
// Ban Phước là thứ bị chỉnh mạnh nhất: 35 Đức Tin đổi lấy 750 tài nguyên là món
// hời nhất bảng theo mọi cách tính, nên nó lên 42 và phần thưởng đổi thành phần —
// bớt vàng, thêm ĐÁ, thứ mà bức tường mới vừa biến thành nút thắt thật.
const GOD_POWERS = [
  {
    id: 'lightning', label: '⚡ Sét Trời', name: 'Sét Trời', tone: 'harm', cost: 24,
    hint: 'Click 1 điểm: gây 75 sát thương lên mọi quân và 220 lên nhà cửa trong bán kính 5 ô (không phân biệt phe).',
    // 45 -> 75. Ở mức cũ, một phát sét vào giữa đạo quân Thiên Triều không giết
    // nổi một người nào (bộ binh đời 5 có hơn 100 máu): người xem trả 25 Đức Tin
    // để nhìn một vòng lửa rồi mọi thứ tiếp diễn y nguyên. 75 thì nó dọn sạch
    // dân thường và hạ được lính đang bị thương — đủ để phát sét là một QUYẾT
    // ĐỊNH, chưa đủ để nó thay thế một trận đánh.
    apply(x, y) {
      const R = 5;
      for (const u of units) if (dist(u.x, u.y, x, y) <= R) u.hp -= 75;
      for (const b of buildings) if (dist(b.x, b.y, x, y) <= R + b.size) b.hp -= 220;
      addFx({ type: 'bolt', x, y, life: 14, maxLife: 14, seed: tick % 97 });
      addFx({ type: 'boom', x, y, life: 22, maxLife: 22, r: R });
      addHotspot(x, y, 8, 'Sét của Chúa Tể');
      logEvent('⚡ Chúa Tể giáng sét', '#d8a544');
    }
  },
  {
    id: 'rain', label: '🌧 Mưa Lành', name: 'Mưa Lành', tone: 'grow', cost: 16,
    hint: 'Click 1 điểm: mọi bụi quả/ruộng trong bán kính 18 ô đầy lại tức thì.',
    apply(x, y) {
      const R = 18;
      let n = 0;
      for (const c of regrowList) {
        if (dist(c.x, c.y, x, y) <= R && c.amount < c.max) { c.amount = c.max; n++; }
      }
      logEvent(`🌧 Mưa lành hồi sinh ${n} ô lương thực`, '#63b4ad');
    }
  },
  {
    id: 'forest', label: '🌲 Rừng Mọc', name: 'Rừng Mọc', tone: 'grow', cost: 12,
    hint: 'Click 1 điểm: mọc thêm 1 khu rừng nhỏ (gỗ mới, đồng thời chặn đường + chặn tầm nhìn).',
    apply(x, y) {
      let n = 0;
      scatterCluster(x, y, 7, 2, 0.6, (px, py) => { if (addResource(px, py, 'wood', CONFIG.MAP.WOOD_PER_TREE)) n++; });
      logEvent(`🌲 Chúa Tể gieo ${n} gốc cây`, '#5aa07c');
    }
  },
  {
    id: 'bless', label: '✨ Ban Phước', name: 'Ban Phước', tone: 'gift', cost: 42, needTribe: true,
    hint: 'Click 1 quân/nhà: bộ lạc đó nhận +260 lương, +240 gỗ, +180 đá, +90 vàng.',
    apply(x, y, tribe) {
      tribe.res.food += 260; tribe.res.wood += 240; tribe.res.stone += 180; tribe.res.gold += 90;
      logEvent(`✨ ${tribe.name} nhận thiên ân`, tribe.color);
    }
  },
  {
    id: 'plague', label: '☠ Dịch Bệnh', name: 'Dịch Bệnh', tone: 'harm', cost: 34, needTribe: true,
    hint: 'Click 1 quân/nhà: mọi quân của bộ lạc đó mất 45% máu tối đa.',
    apply(x, y, tribe) {
      let n = 0;
      for (const u of units) if (u.tribeId === tribe.id) { u.hp -= u.maxHp * 0.45; n++; }
      logEvent(`☠ Dịch bệnh càn quét ${tribe.name} (${n} người)`, tribe.color);
    }
  },
  {
    id: 'worldboss', label: '🐉 Thiên Ma', name: 'Thiên Ma', tone: 'harm', cost: 75,
    // Dòng này ĐỌC TỪ CONFIG chứ không chép tay, và nó phải thế vì bản chép tay đã
    // lệch một lần rồi: nó quảng cáo "5.200 máu" suốt từ 3.30 trong khi con quái
    // thật có 9.000 — bộ số bị nâng ở chính bản đó mà cái nhãn thì không ai sửa.
    // Một lời quảng cáo sai về quyền năng đắt nhất là thứ khiến người xem không bao
    // giờ bấm nút thứ hai.
    // GETTER, không phải một chuỗi dựng sẵn lúc nạp file — và đây là hệ quả trực
    // tiếp của việc con quái nay mạnh dần theo tick. Một chuỗi tính một lần ở tick 0
    // sẽ quảng cáo con số của tick 0 suốt cả kỷ nguyên, tức là đúng cái lỗi chép tay
    // vừa nói ở trên, chỉ khác là lần này nó tự sinh ra chứ không phải do ai quên sửa.
    // `setGodHint(p.hint)` đọc thuộc tính đúng lúc bấm nút, nên chỗ gọi không phải đổi.
    get hint() {
      const S = worldBossScaled();
      return `Thả một con THIÊN MA ở chính giữa bản đồ (click đâu cũng vậy). `
        + `NÓ MẠNH DẦN THEO THỜI GIAN — thả lúc này: bậc ${S.rank}, `
        + `${S.hp.toLocaleString('vi-VN')} máu · đòn ${Math.round(S.attack)} (đỉnh ở tick `
        + `${CONFIG.WORLD_BOSS.RAMP.PEAK_TICK.toLocaleString('vi-VN')}). `
        + `Đập tường thành như một cỗ máy bắn đá, hành quân tới bộ lạc ĐANG DẪN ĐẦU. Bộ lạc nào ra đòn cuối nhận `
        + `${S.loot.food} lương · ${S.loot.wood} gỗ · ${S.loot.stone} đá · ${S.loot.gold} vàng, `
        + `một THÁNH VẬT cấp ${CONFIG.ITEM.LEVEL_TAG[CONFIG.ITEM.MAX_LEVEL]} và MỘT CẤP NGHIÊN CỨU miễn phí; `
        + `Chúa Tể được hoàn ${CONFIG.WORLD_BOSS.FAITH_REFUND} Đức Tin. Chỉ một con trên bản đồ cùng lúc.`;
    },
    apply() { spawnWorldBoss(); }
  }
];

// ============================================================
// THIÊN MA — vòng đời
// ============================================================
// Nó dùng lại NGUYÊN đường ống "quái đi cướp" (raidTribe + assault): bước xuống
// `homeField` của bộ lạc bị nhắm, tầm phát hiện hẹp nên nó hành quân chứ không
// đi săn dọc đường. Không viết một AI thứ hai, và đó là lý do cơ chế này rẻ —
// mọi thứ quanh một con quái đang hành quân đã có sẵn và đã được đo.
//
// KHÁC ở đúng một chỗ: `raidUntil` để vô tận. Quái đi cướp bình thường hết hạn
// rồi lê xác về hang; Thiên Ma không có hang để về (lairId -1), nên nếu để nó hết
// hạn thì nó sẽ đứng chôn chân giữa bản đồ — đúng cái ngõ cụt "quái không còn
// mục tiêu nào" đã phải chữa bằng huntSurvivors ở bản trước.
function worldBossAlive() {
  for (const u of units) if (u.type === 'monster' && u.worldBoss && u.hp > 0) return u;
  return null;
}

// ============================================================
// HỆ SỐ SỨC MẠNH THEO ĐỒNG HỒ KỶ NGUYÊN
// ============================================================
// MỘT hàm, và mọi thứ về con quái đọc qua nó: bảng hint, dòng nhật ký, chỉ số lúc
// sinh, kho báu lúc chết. Bốn chỗ ấy đã từng lệch nhau một lần rồi ("5.200 máu" ở
// hint trong khi bảng có 9.000), và ở đây nguy cơ còn cao hơn hẳn vì con số không
// còn nằm trong CONFIG mà phụ thuộc `tick` — chép tay công thức ở chỗ thứ hai thì
// hai chỗ sẽ lệch nhau ngay tại tick đầu tiên có ai đó sửa một hằng số.
//
// `atTick` cho phép hỏi "nếu thả BÂY GIỜ thì thế nào" mà không cần con quái tồn tại
// (bảng hint hỏi câu đó mỗi lần người xem rê chuột lên nút).
function worldBossPower(atTick) {
  const R = CONFIG.WORLD_BOSS.RAMP;
  const t = clamp((atTick === undefined ? tick : atTick) / R.PEAK_TICK, 0, 1);
  return R.START + (R.PEAK - R.START) * t;
}

function worldBossRank(pow) {
  const T = CONFIG.WORLD_BOSS.RANKS;
  let name = T[0].name;
  for (const r of T) if (pow >= r.at) name = r.name;
  return name;
}

// Bộ chỉ số ĐÃ NHÂN. Trả về cả `pow` để chỗ gọi không phải tính lại — nếu phải tính
// lại thì đã có hai đường tính, đúng cái vừa nói ở trên.
function worldBossScaled(atTick) {
  const spec = CONFIG.MONSTER.TYPES.worldboss;
  const L = CONFIG.WORLD_BOSS.LOOT;
  const pow = worldBossPower(atTick);
  return {
    pow, rank: worldBossRank(pow),
    hp: Math.round(spec.hp * pow),
    attack: spec.attack * pow,
    // Cỡ vẽ leo CHẬM hơn chỉ số nhiều (0,82 + 0,18·pow, tức 0,93 -> 1,13 giữa hai
    // đầu dải). Cố ý: sprite đã chiếm 4,2 ô, và cho nó leo theo đúng hệ số máu thì
    // con quái đỉnh sẽ rộng 7,3 ô — to hơn chân đế Kỳ quan, đúng cái lỗi "hai hệ số
    // phóng to nhân nhau" vừa phải sửa ở máy bắn đá tại 3.32. Ở đây tôi chỉ cần
    // MẮT ĐỌC RA nó to hơn khi đứng cạnh một con của kỷ nguyên trước, và 1,21 lần
    // là đủ cho việc đó.
    scale: 0.82 + 0.18 * pow,
    loot: {
      food:  Math.round(L.food  * pow), wood:  Math.round(L.wood  * pow),
      stone: Math.round(L.stone * pow), gold:  Math.round(L.gold  * pow)
    }
  };
}

// Bộ lạc bị nhắm = bộ lạc ĐANG DẪN ĐẦU. Xem chú thích CONFIG.WORLD_BOSS để biết
// vì sao không phải bộ lạc gần nhất và không phải ngẫu nhiên.
function worldBossTarget() {
  let best = null;
  for (const t of tribes) {
    if (!t.alive) continue;
    if (!best || tribeScore(t) > tribeScore(best)) best = t;
  }
  return best;
}

function spawnWorldBoss() {
  if (worldBossAlive()) { setGodHint('Đã có một Thiên Ma trên bản đồ rồi.'); return false; }
  const cx = Math.floor(CONFIG.GRID_WIDTH / 2), cy = Math.floor(CONFIG.GRID_HEIGHT / 2);
  // Hang giả cấp 1 — cùng thủ thuật mà splitMonster đang dùng, nên chỉ số lấy
  // thẳng từ bảng TYPES với statMult 1,0 chứ không bị nhân theo cấp hang nào.
  const u = spawnMonster({ id: -1, x: cx, y: cy, tier: 1, spawnedTotal: 0 }, 'worldboss');
  u.lairId = -1; u.lairX = cx; u.lairY = cy; u.roam = 9999;
  u.worldBoss = true;
  u.assault = true;
  u.raidUntil = Infinity;
  u.bossRetargetAt = 0;
  // HỆ SỐ ĐÔNG CỨNG NGAY TẠI ĐÂY, vào chính cá thể — không phải một phép nhân đọc
  // lại `tick` mỗi lần dùng. Con quái phải giữ nguyên sức mạnh của cái ngày nó được
  // thả xuống; đọc lại đồng hồ thì một trận đánh kéo dài 900 tick sẽ có con quái
  // KHOẺ DẦN LÊN trong lúc đang bị vây, và không một dòng nào trên màn hình nói ra
  // điều đó. Đây cùng luật với `u.ageBonus` của anh hùng: hệ số thời điểm ra đời.
  const S = worldBossScaled();
  u.bossPow = S.pow;
  u.bossRank = S.rank;
  u.maxHp = S.hp; u.hp = S.hp;
  u.attack = S.attack;
  u.threat = CONFIG.MONSTER.TYPES.worldboss.threat * S.pow;
  // `scale` là trường mà spawnMonster KHÔNG đặt — nó vốn chỉ có ở con sinh ra từ
  // phân đôi. Cả hai chỗ đọc nó đã viết sẵn `|| 1` (drawMonster và spriteBox), nên
  // hình vẽ và hộp bấm cùng phóng to theo đúng một con số. Đây là chỗ mà bài học
  // Phase 3.19 ("ba thứ neo vào ô lưới cùng vỡ khi sprite tràn ra khỏi ô") đã được
  // trả trước: đường ống có sẵn, chỉ cần không dựng một đường thứ hai.
  u.scale = S.scale;
  const t = worldBossTarget();
  u.raidTribe = t ? t.id : -1;
  addFx({ type: 'boom', x: cx, y: cy, life: 40, maxLife: 40, r: 6 });
  addHotspot(cx, cy, 26, `THIÊN MA ${S.rank} giáng thế`);
  logEvent(t ? `🐉 THIÊN MA — ${S.rank}, ${S.hp.toLocaleString('vi-VN')} máu — giáng thế giữa bản đồ, nó đi về phía ${t.name}!`
             : `🐉 THIÊN MA — ${S.rank}, ${S.hp.toLocaleString('vi-VN')} máu — giáng thế giữa bản đồ!`,
           '#b783cc', true);
  return true;
}

// Nhắm lại định kỳ. Chạy trong vòng tick chính, KHÔNG trong tickMonster: nếu để
// trong tickMonster thì nó chỉ chạy khi con quái còn sống và còn được duyệt, mà
// đúng lúc bộ lạc bị nhắm diệt vong là lúc con quái rơi vào nhánh "không có
// trường" và thoát sớm — nhắm lại sẽ không bao giờ tới lượt.
function tickWorldBoss() {
  const u = worldBossAlive();
  if (!u) return;
  const dead = u.raidTribe < 0 || !tribes[u.raidTribe] || !tribes[u.raidTribe].alive;
  if (!dead && tick < u.bossRetargetAt) return;
  u.bossRetargetAt = tick + CONFIG.WORLD_BOSS.RETARGET;
  const t = worldBossTarget();
  if (!t) { u.raidTribe = -1; return; }
  if (t.id === u.raidTribe) return;
  u.raidTribe = t.id;
  u.combatTarget = null;
  logEvent(`🐉 Thiên Ma đổi hướng — nó nhắm vào ${t.name}`, '#b783cc');
}

// Ra đòn cuối thì được kho báu. Gọi từ dealDamage — cửa duy nhất mà mọi cái chết
// đi qua, đúng chỗ đã dùng cho feedLair và heroRazed. Gọi ở onMonsterDeath thì
// mất người gây ra: hàm đó chạy ở lượt lọc xác cuối tick và không biết ai giết.
function onWorldBossSlain(u, tribeId) {
  faith = Math.min(CONFIG.GOD.FAITH_MAX, faith + CONFIG.WORLD_BOSS.FAITH_REFUND);
  addFx({ type: 'boom', x: u.x, y: u.y, life: 44, maxLife: 44, r: 7 });
  addHotspot(u.x, u.y, 26, 'THIÊN MA gục ngã');
  const t = tribeId >= 0 ? tribes[tribeId] : null;
  if (!t) {
    logEvent('🐉 THIÊN MA gục ngã — không bộ lạc nào nhận được kho báu.', '#b783cc', true);
    return;
  }
  // KHO BÁU ĐỌC HỆ SỐ CỦA CHÍNH CON QUÁI VỪA CHẾT (`u.bossPow`), không gọi lại
  // worldBossScaled(). Hai con số đó khác nhau đúng bằng quãng thời gian nó sống:
  // một con thả ở tick 6.000 mà chết ở tick 9.000 sẽ trả thưởng theo mức 9.000 nếu
  // hỏi lại đồng hồ — tức là bộ lạc được thưởng cho một con quái mạnh hơn con nó
  // vừa đánh. Cùng đúng lý do đã đông cứng hệ số vào cá thể lúc thả.
  const L = CONFIG.WORLD_BOSS.LOOT;
  const pow = u.bossPow || 1;
  const loot = {
    food:  Math.round(L.food  * pow), wood:  Math.round(L.wood  * pow),
    stone: Math.round(L.stone * pow), gold:  Math.round(L.gold  * pow)
  };
  t.res.food += loot.food; t.res.wood += loot.wood; t.res.stone += loot.stone; t.res.gold += loot.gold;
  const up = grantBossSpoilUpgrade(t);
  logEvent(`🐉 ${t.name} HẠ ĐƯỢC THIÊN MA ${u.bossRank || ''} — ${loot.food} lương · ${loot.wood} gỗ · ${loot.stone} đá · ${loot.gold} vàng về tay họ!`, t.color, true);
  // Dòng thứ hai, và nó KHÔNG gộp vào dòng trên: hai phần thưởng này chạm vào hai
  // thứ khác hẳn nhau (một cái vào kho, một cái vào cả đạo quân đang đứng), nên gộp
  // lại thành một câu dài là làm mất phần đắt hơn trong hai phần.
  if (up) logEvent(`${up.icon} Chiến lợi phẩm mở ra một bí thuật — ${t.name} nhận ngay ${up.label} cấp ${up.level}`, t.color, true);
}

// ============================================================
// MỘT CẤP NGHIÊN CỨU MIỄN PHÍ cho kẻ hạ được Thiên Ma
// ============================================================
// Vì sao đây là phần đáng giá nhất trong ba phần kho báu, dù nó không có một con
// số nào trong bảng LOOT: nâng cấp là thứ DUY NHẤT trong game áp dụng ngay lập tức
// cho cả đạo quân đang sống, kể cả người đang đứng giữa trận (xem applyUpgrade).
// Kho thì tiêu hết trong vài trăm tick, Thánh vật thì rơi lại trên đất theo người
// cầm nó — còn một cấp nâng cấp thì ở lại tới hết kỷ nguyên.
//
// Hai nhánh, theo đúng thứ tự:
//   · ĐANG NGHIÊN CỨU DỞ -> hoàn thành NGAY. Đây là nhánh đúng về mặt kể chuyện
//     (bí thuật cướp được ghép vào đúng cái đang làm dở) và cũng là nhánh trả
//     thưởng đậm nhất, vì bộ lạc đã trả tiền rồi mà chưa nhận hàng.
//   · KHÔNG nghiên cứu gì -> cộng một cấp vào nhánh ĐANG CAO NHẤT trong số nhánh
//     đủ điều kiện. Cố ý không chọn nhánh thấp nhất: bộ lạc đã tự bỏ phiếu bằng
//     tài nguyên cho hướng đi của mình rồi, và phần thưởng phải khuếch đại lựa
//     chọn đó chứ không được lặng lẽ lái nó sang hướng khác.
// Không đủ điều kiện nhánh nào (chưa có công trình chủ quản, hoặc mọi nhánh đã
// trần) thì trả về null và chỉ mất đúng dòng nhật ký thứ hai — không có nhánh dự
// phòng nào cộng bừa, vì "được thưởng một cấp của nhánh mình không xây nổi" là một
// phần thưởng vô hình.
function grantBossSpoilUpgrade(t) {
  if (t.research) {
    const r = t.research;
    t.research = null;
    applyUpgrade(t, r.line, r.level);
    return Object.assign({ level: r.level }, CONFIG.UPGRADE.LINES[r.line]);
  }
  let best = null;
  for (const k of UPGRADE_LINES) {
    if (!upgradeAvailable(t, k)) continue;
    if (!best || t.upgrades[k] > t.upgrades[best]) best = k;
  }
  if (!best) return null;
  const level = t.upgrades[best] + 1;
  applyUpgrade(t, best, level);
  return Object.assign({ level }, CONFIG.UPGRADE.LINES[best]);
}

function tribeAt(x, y) {
  let best = null, bestD = 6;
  for (const u of units) {
    if (u.tribeId < 0) continue;   // quái vật không có bộ lạc để ban phước/gieo dịch
    const d = dist(u.x, u.y, x, y);
    if (d < bestD) { bestD = d; best = tribes[u.tribeId]; }
  }
  for (const b of buildings) {
    const d = dist(b.x, b.y, x, y) - b.size;
    if (d < bestD) { bestD = d; best = tribes[b.tribeId]; }
  }
  return best;
}

// ============================================================
// CHÚA TỂ TỰ ĐỘNG
// ============================================================
// Bật lên thì Đức Tin được tiêu theo một chính sách CỐ ĐỊNH và đọc được, thay vì
// nằm im tới khi chạm trần 100 rồi lãng phí phần hồi tiếp theo.
//
// Chính sách gồm ba nấc, xếp theo đúng thứ tự ưu tiên:
//   1. ĐÁP LỜI KẺ THÀNH TÂM NHẤT — rẻ nhất và đúng tinh thần nhất.
//   2. GHÌM KẺ DẪN ĐẦU khi nó bỏ xa quá — giữ cho kỷ nguyên còn kịch tính.
//   3. CỨU KẺ SẮP CHẾT — không để một bộ lạc bị xoá khỏi bàn cờ ở tick 3.000.
//
// Vì sao đáng có, ngoài chuyện tiện: nó biến Chúa Tể thành một ÁP LỰC CHỌN LỌC
// ỔN ĐỊNH. Với một người xem thật, gen `piety` chịu một bề mặt chọn lọc thất
// thường (có hôm bạn ban phước, có hôm bạn đi pha cà phê). Với chính sách tự động,
// bề mặt đó cố định và đo được — nên câu hỏi "tín ngưỡng có tiến hoá không" mới
// có thể trả lời bằng số. Bật/tắt nó chính là một phép A/B của cả một áp lực
// chọn lọc, giống hệt cách chế độ thủ thành từng làm với gen `aggression`.
let autoGod = false;
let autoGodThreshold = 60;    // dưới ngưỡng này thì chỉ đáp lời cầu, không tiêu vào quyền năng
let lastAutoGodTick = -9999;
const AUTO_GOD_COOLDOWN = 240;

function autoGodTick() {
  if (!autoGod || eraState !== 'playing') return;

  // --- Nấc 1: đáp lời khẩn cầu, ưu tiên bộ lạc THÀNH TÂM NHẤT ---
  if (faith >= CONFIG.WORSHIP.BLESS_COST) {
    let best = null;
    for (const t of tribes) {
      if (!t.alive || !t.prayer) continue;
      if (!best || t.piety > best.piety) best = t;
    }
    if (best) {
      faith -= CONFIG.WORSHIP.BLESS_COST;
      grantBlessing(best, best.prayer.kind);
      return;
    }
  }

  if (faith < autoGodThreshold || tick - lastAutoGodTick < AUTO_GOD_COOLDOWN) return;

  const alive = tribes.filter(t => t.alive);
  if (alive.length < 2) return;
  const ranked = alive.slice().sort((a, b) => tribeScore(b) - tribeScore(a));
  const lead = ranked[0], second = ranked[1], last = ranked[ranked.length - 1];

  // --- Nấc 2: kẻ dẫn đầu bỏ xa hơn 2,2 lần -> gieo dịch ---
  const plague = GOD_POWERS.find(p => p.id === 'plague');
  if (tribeScore(lead) > tribeScore(second) * 2.2 && faith >= plague.cost && gameMode !== 'defend') {
    faith -= plague.cost;
    plague.apply(lead.home.x, lead.home.y, lead);
    addHotspot(lead.home.x, lead.home.y, 7, `Dịch bệnh giáng xuống ${lead.name}`);
    lastAutoGodTick = tick;
    return;
  }

  // --- Nấc 3: cứu kẻ yếu nhất ---
  if (last.starving) {
    const rain = GOD_POWERS.find(p => p.id === 'rain');
    if (faith >= rain.cost) {
      faith -= rain.cost;
      rain.apply(last.home.x, last.home.y);
      addHotspot(last.home.x, last.home.y, 5, `Mưa lành cho ${last.name}`);
      lastAutoGodTick = tick;
      return;
    }
  }
  if (faith >= CONFIG.GOD.FAITH_MAX - 4) {
    // Đức Tin sắp tràn: phần hồi tiếp theo sẽ mất trắng vì bị chặn trần, nên tiêu
    // là đúng dù không có việc gấp nào.
    const bless = GOD_POWERS.find(p => p.id === 'bless');
    if (faith >= bless.cost) {
      faith -= bless.cost;
      bless.apply(last.home.x, last.home.y, last);
      lastAutoGodTick = tick;
    }
  }
}

function castPower(id, gx, gy) {
  const power = GOD_POWERS.find(p => p.id === id);
  if (!power || faith < power.cost) return false;
  const x = Math.round(gx), y = Math.round(gy);
  let tribe = null;
  if (power.needTribe) {
    tribe = tribeAt(x, y);
    if (!tribe) { setGodHint('Không có bộ lạc nào ở chỗ đó — click vào 1 quân hoặc 1 toà nhà.'); return false; }
  }
  // TRỪ ĐỨC TIN SAU KHI apply THÀNH CÔNG, không phải trước. Thiên Ma là quyền năng
  // đầu tiên có thể TỪ CHỐI thi hành (đã có một con trên bản đồ rồi), và với thứ
  // tự cũ thì cú click bị từ chối vẫn rút trọn 75 Đức Tin — người xem mất gần cả
  // cái ví để đổi lấy một dòng nhắc. `apply` của bốn quyền năng cũ không trả về gì
  // (undefined), nên chỉ `=== false` mới tính là từ chối.
  if (power.apply(x, y, tribe) === false) return false;
  faith -= power.cost;
  return true;
}

