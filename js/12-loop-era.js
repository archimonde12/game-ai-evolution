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
    if (u.type === 'villager') tickVillager(u, tribe);
    else if (u.type === 'hero') tickHero(u, tribe);
    else tickSoldier(u, tribe);
  }

  for (const b of buildings) {
    if (b.hp > 0 && CONFIG.BUILD[b.type].range) tickDefender(b, tribes[b.tribeId]);
  }

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
const GOD_POWERS = [
  {
    id: 'lightning', label: '⚡ Sét Trời', name: 'Sét Trời', tone: 'harm', cost: 25,
    hint: 'Click 1 điểm: gây 45 sát thương lên mọi quân và 130 lên nhà cửa trong bán kính 5 ô (không phân biệt phe).',
    apply(x, y) {
      const R = 5;
      for (const u of units) if (dist(u.x, u.y, x, y) <= R) u.hp -= 45;
      for (const b of buildings) if (dist(b.x, b.y, x, y) <= R + b.size) b.hp -= 130;
      addFx({ type: 'bolt', x, y, life: 14, maxLife: 14, seed: tick % 97 });
      addFx({ type: 'boom', x, y, life: 22, maxLife: 22, r: R });
      addHotspot(x, y, 8, 'Sét của Chúa Tể');
      logEvent('⚡ Chúa Tể giáng sét', '#d8a544');
    }
  },
  {
    id: 'rain', label: '🌧 Mưa Lành', name: 'Mưa Lành', tone: 'grow', cost: 20,
    hint: 'Click 1 điểm: mọi bụi quả/ruộng trong bán kính 16 ô đầy lại tức thì.',
    apply(x, y) {
      const R = 16;
      let n = 0;
      for (const c of regrowList) {
        if (dist(c.x, c.y, x, y) <= R && c.amount < c.max) { c.amount = c.max; n++; }
      }
      logEvent(`🌧 Mưa lành hồi sinh ${n} ô lương thực`, '#63b4ad');
    }
  },
  {
    id: 'forest', label: '🌲 Rừng Mọc', name: 'Rừng Mọc', tone: 'grow', cost: 15,
    hint: 'Click 1 điểm: mọc thêm 1 khu rừng nhỏ (gỗ mới, đồng thời chặn đường + chặn tầm nhìn).',
    apply(x, y) {
      let n = 0;
      scatterCluster(x, y, 7, 2, 0.6, (px, py) => { if (addResource(px, py, 'wood', CONFIG.MAP.WOOD_PER_TREE)) n++; });
      logEvent(`🌲 Chúa Tể gieo ${n} gốc cây`, '#5aa07c');
    }
  },
  {
    id: 'bless', label: '✨ Ban Phước', name: 'Ban Phước', tone: 'gift', cost: 35, needTribe: true,
    hint: 'Click 1 quân/nhà: bộ lạc đó nhận +300 lương, +300 gỗ, +150 vàng.',
    apply(x, y, tribe) {
      tribe.res.food += 300; tribe.res.wood += 300; tribe.res.gold += 150;
      logEvent(`✨ ${tribe.name} nhận thiên ân`, tribe.color);
    }
  },
  {
    id: 'plague', label: '☠ Dịch Bệnh', name: 'Dịch Bệnh', tone: 'harm', cost: 30, needTribe: true,
    hint: 'Click 1 quân/nhà: mọi quân của bộ lạc đó mất 45% máu tối đa.',
    apply(x, y, tribe) {
      let n = 0;
      for (const u of units) if (u.tribeId === tribe.id) { u.hp -= u.maxHp * 0.45; n++; }
      logEvent(`☠ Dịch bệnh càn quét ${tribe.name} (${n} người)`, tribe.color);
    }
  }
];

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
  faith -= power.cost;
  power.apply(x, y, tribe);
  return true;
}

