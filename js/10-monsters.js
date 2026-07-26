'use strict';
// ============================================================
// 10-monsters.js
// ------------------------------------------------------------
// Thế giới trung lập: hang ổ lớn lên theo thứ nó giết được rồi đi cướp phá,
// 7 loài quái mỗi loài một lối đánh, vật phẩm rơi ra và hợp nhất; kèm sóng
// tấn công của chế độ Thủ Thành và tháp phòng thủ.
// Tách cơ học từ civilization.html một-file, dòng 5247–6064.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Quái vật, hang ổ, vật phẩm
// ============================================================
const MONSTER_DROPS = {
  wolf:   ['boots', 'sword'],
  spider: ['boots', 'boots', 'sword'],
  bear:   ['armor', 'sword', 'banner'],
  wisp:   ['banner', 'relic', 'sword'],
  troll:  ['relic', 'armor', 'banner'],
  wyvern: ['relic', 'sword', 'boots'],
  lord:   ['relic']
};

// Mức nguy hiểm giờ nằm trong chính bảng TYPES (`spec.threat`) thay vì một bảng
// rời. Bảng rời là một danh sách thứ hai phải nhớ cập nhật mỗi lần thêm loài, và
// quên nó thì `heroLocalBalance` đọc ra `undefined` — anh hùng sẽ cộng NaN vào
// cán cân địch/ta và từ đó mọi quyết định đánh hay lui của anh ta đều sai, im
// lặng, không có lấy một dòng lỗi.
function monsterThreat(key) { return CONFIG.MONSTER.TYPES[key].threat; }

// Bậc của một hang, kẹp trong khoảng hợp lệ. Mọi chỗ đọc TIERS đều đi qua đây:
// `lair.tier` là 1-based cho người đọc (cấp 1/2/3) còn mảng là 0-based, và đó
// đúng là kiểu lệch một mà sẽ lặng lẽ trả về `undefined.cap`.
function lairTierSpec(l) {
  return CONFIG.MONSTER.TIERS[clamp((l.tier || 1) - 1, 0, CONFIG.MONSTER.TIERS.length - 1)];
}
function lairRoam(l) { return lairTierSpec(l).roam; }

// Rải hang ổ SAU khi đã biết bốn kinh đô ở đâu: hang mọc cạnh điểm xuất phát thì
// bộ lạc đó chết từ trong trứng và cả kỷ nguyên mất một người chơi — thua vì xui
// địa hình không phải là cái đáng xem.
function spawnLairs(spots) {
  lairs = [];
  if (!CONFIG.MONSTER.ENABLED) return;
  const minHome = CONFIG.MONSTER.LAIR_MIN_DIST_HOME;
  let guard = 0;
  while (lairs.length < CONFIG.MONSTER.LAIRS && guard++ < 4000) {
    const x = Math.floor(randRange(6, CONFIG.GRID_WIDTH - 6));
    const y = Math.floor(randRange(6, CONFIG.GRID_HEIGHT - 6));
    if (isBlocked(x, y)) continue;
    if (spots.some(s => dist(s.x, s.y, x, y) < minHome)) continue;
    if (lairs.some(l => dist(l.x, l.y, x, y) < 34)) continue;
    lairs.push({
      id: nextId++, x, y, size: 2, isLair: true,
      hp: CONFIG.MONSTER.LAIR_HP, maxHp: CONFIG.MONSTER.LAIR_HP,
      spawnedTotal: 0, timer: Math.floor(randRange(0, CONFIG.MONSTER.SPAWN_INTERVAL)),
      // --- Phase 3.7 ---
      tier: 1, feed: 0, feedTimer: 0,
      raidTimer: Math.floor(randRange(0, 900)),   // lệch pha để 9 hang không cùng cướp một lúc
      raidsSent: 0, lordDeadAt: -99999, killCount: 0, lastFeedTick: 0
    });
  }
}

// Một điểm nuôi = một thứ mà đám quái của hang này lấy được của người. Gọi từ
// dealDamage, tức là đi qua ĐÚNG một cửa duy nhất — nếu đếm ở tickMonster thì
// mọi cú giết bằng sát thương lan, bằng nọc độc, hay bằng đòn của Chúa Hang đều
// không được tính, và cái hang hung hãn nhất bản đồ lại là cái lớn chậm nhất.
function feedLair(attacker, target, isBuilding) {
  const l = attacker.lairId >= 0 ? lairs.find(x => x.id === attacker.lairId) : null;
  if (!l || l.hp <= 0) return;
  const F = CONFIG.MONSTER.FEED.KILL;
  l.feed += isBuilding ? (F.building || 1) : (F[target.type] || 1);
  l.lastFeedTick = tick;
  l.killCount++;
}

function promoteLair(l) {
  const T = CONFIG.MONSTER.TIERS;
  if (l.tier >= T.length) return;
  const next = T[l.tier];         // 0-based: phần tử thứ `tier` chính là cấp kế tiếp
  l.tier++;
  // Máu CỘNG THÊM chứ không đặt lại: một cái hang đã bị đánh dở dang mà lên cấp
  // được hồi đầy máu thì mọi nỗ lực công phá trước đó bị xoá, và bộ lạc nào đang
  // đánh dở sẽ vĩnh viễn không bao giờ phá xong — đúng kiểu bế tắc mà người xem
  // đọc ra là "game ăn gian" chứ không phải "leo thang".
  const add = next.hpBonus - (T[l.tier - 2] ? T[l.tier - 2].hpBonus : 0);
  l.maxHp += add;
  l.hp += add;
  // Bán kính lảng vảng nở ra theo cấp — và phải cập nhật cho CẢ ĐÀN đang sống,
  // không chỉ con sinh sau. `u.roam` là bản sao chép xuống cá thể (để tránh tra
  // `lairs.find` mỗi tick cho mỗi con quái); mọi bản sao đều có cái giá của nó là
  // phải nhớ đồng bộ đúng ở đây. Quên dòng này thì vòng tím trên bản đồ nở ra mà
  // đàn quái vẫn bị xích ở bán kính cũ — người xem thấy một lời hứa không có thật.
  for (const u of units) if (u.type === 'monster' && u.lairId === l.id) u.roam = next.roam;
  addFx({ type: 'boom', x: l.x, y: l.y, life: 34, maxLife: 34, r: 5 });
  addHotspot(l.x, l.y, l.tier >= 3 ? 12 : 7, `Hang ổ lên ${next.name}`);
  logEvent(l.tier >= 3
    ? `👹 Một hang ổ đã hoá thành TỔ QUỶ — Chúa Hang thức giấc!`
    : `🕳 Một hang ổ đã lớn thành ${next.name}`, '#b783cc', l.tier >= 3);
}

// Hang teo lại. Đối xứng với promoteLair nhưng KHÔNG đối xứng ở một chỗ: máu tối
// đa tụt xuống, còn máu hiện tại chỉ bị KẸP xuống trần mới chứ không bị trừ đúng
// bằng khoản đã cộng. Nếu trừ thẳng thì một cái hang vừa bị đánh gần chết mà tụt
// cấp sẽ chết ngay lập tức mà không ai đánh nốt — công lao thuộc về đồng hồ, không
// thuộc về ai cả, và người xem không đọc ra được vì sao nó sập.
function demoteLair(l) {
  const T = CONFIG.MONSTER.TIERS;
  const oldBonus = T[l.tier - 1].hpBonus;
  l.tier--;
  const newBonus = T[l.tier - 1].hpBonus;
  l.maxHp -= (oldBonus - newBonus);
  l.hp = Math.min(l.hp, l.maxHp);
  for (const u of units) if (u.type === 'monster' && u.lairId === l.id) u.roam = T[l.tier - 1].roam;
  logEvent(`🌤 Một hang ổ đã suy yếu, tụt về ${T[l.tier - 1].name}`, '#8d9490');
}

function spawnMonster(lair, forceKey) {
  const T = lairTierSpec(lair);
  const key = forceKey || T.ladder[lair.spawnedTotal % T.ladder.length];
  const spec = CONFIG.MONSTER.TYPES[key];
  lair.spawnedTotal++;
  const m = T.statMult;
  const u = {
    id: nextId++, tribeId: -1, type: 'monster', mType: key,
    x: clamp(lair.x + Math.round(randRange(-3, 3)), 0, CONFIG.GRID_WIDTH - 1),
    y: clamp(lair.y + Math.round(randRange(-3, 3)), 0, CONFIG.GRID_HEIGHT - 1),
    hp: Math.round(spec.hp * m), maxHp: Math.round(spec.hp * m),
    attack: spec.attack * m, defense: spec.defense || 0,
    speedMult: spec.speedMult, speedCredit: 0, speed: 1,
    cooldown: 0, cd: spec.cooldown, born: tick,
    facingX: 1, facingY: 0, lungeUntil: 0, swingAt: 0,
    lairId: lair.id, lairX: lair.x, lairY: lair.y,
    threat: spec.threat * m,
    combatTarget: null, stuck: 0, progKey: null, progBest: Infinity, roam: T.roam,
    // Quái không nhận hào quang, nhưng vẫn cần hai trường này vì effAttack() dùng chung.
    auraUntil: 0, auraMult: 1,
    carry: { type: null, amount: 0 }, fleeTimer: 0,
    // Ba trường sao chép TỪ SPEC xuống cá thể thay vì tra spec mỗi lần dùng: cả
    // ba nằm trên đường đi nóng nhất (tryStep gọi vài trăm nghìn lần mỗi giây),
    // và quan trọng hơn — quái của SÓNG thủ thành cũng phải có đúng các trường
    // này, nên để chúng ở cá thể thì hai đường sinh quái dùng chung một luật.
    fly: !!spec.fly, range: spec.range || 0, minRange: spec.minRange || 0,
    splash: spec.splash || 0, venom: spec.venom || null, aura: spec.aura || null,
    raidTribe: -1, raidUntil: 0,
    rx: 0, ry: 0, flash: 0
  };
  u.rx = u.x; u.ry = u.y;
  units.push(u);
  return u;
}

function tickLair(lair) {
  if (lair.hp <= 0) return;
  const T = lairTierSpec(lair);
  const M = CONFIG.MONSTER;

  // --- lớn lên / teo đi ---
  if (++lair.feedTimer >= M.FEED.PASSIVE_EVERY) {
    lair.feedTimer = 0;
    if (lair.feed < M.FEED.PASSIVE_CAP) lair.feed++;
  }
  const starving = tick - lair.lastFeedTick > M.FEED.STARVE_AFTER;
  lair.feed *= 1 - M.FEED.DECAY * (starving ? M.FEED.STARVE_MULT : 1);
  const nextAt = M.FEED.TIER_AT[lair.tier];      // undefined ở cấp trần -> so sánh false, đúng ý
  if (nextAt !== undefined && lair.feed >= nextAt) promoteLair(lair);
  // Tụt cấp: ngưỡng tụt thấp hơn ngưỡng lên đúng DEMOTE_MARGIN. Thiếu cái trễ này
  // thì một hang đứng ngay ngưỡng sẽ lên-xuống mỗi vài chục tick, và mỗi lần lên
  // là một lần cộng máu — hang sẽ phình máu vô hạn bằng cách rung tại chỗ.
  else if (lair.tier > 1 && lair.feed < M.FEED.TIER_AT[lair.tier - 1] - M.FEED.DEMOTE_MARGIN) {
    demoteLair(lair);
  }

  // --- Chúa Hang: ưu tiên trước mọi thứ, và KHÔNG tính vào trần quân số ---
  // Nếu tính vào trần thì một hang cấp 3 nuôi trùm sẽ chỉ còn 8 suất cho lính
  // thường, tức là lên cấp 3 làm ổ MỎNG đi ở đúng lúc nó phải dày nhất.
  if (lair.tier >= M.TIERS.length && tick - lair.lordDeadAt > M.LORD_RESPAWN) {
    let hasLord = false;
    for (const u of units) if (u.type === 'monster' && u.lairId === lair.id && u.mType === 'lord' && u.hp > 0) { hasLord = true; break; }
    if (!hasLord) {
      const lord = spawnMonster(lair, 'lord');
      addFx({ type: 'boom', x: lord.x, y: lord.y, life: 26, maxLife: 26, r: 4 });
    }
  }

  // --- đi cướp ---
  if (lair.tier >= M.RAID.MIN_TIER && T.raidEvery > 0) {
    if (++lair.raidTimer >= T.raidEvery) { lair.raidTimer = 0; launchRaid(lair); }
  }

  // --- nhả quái thường ---
  lair.timer++;
  if (lair.timer < T.interval) return;
  lair.timer = 0;
  let alive = 0;
  for (const u of units) {
    if (u.type === 'monster' && u.lairId === lair.id && u.hp > 0 && u.mType !== 'lord') alive++;
  }
  if (alive >= T.cap) return;
  spawnMonster(lair);
}

// Bộ lạc còn công trình gần hang nhất. Không dùng `pickWaveTarget` (chọn kẻ MẠNH
// nhất) vì đó là luật của chế độ thủ thành, nơi sóng quái là một biến cố toàn cục
// có kịch bản. Ở đây quái là sinh vật: chúng đi tới chỗ gần nhất có mùi người.
function nearestTribeForRaid(x, y) {
  let best = -1, bestD = Infinity;
  for (const b of buildings) {
    if (b.hp <= 0 || !b.done || b.tribeId < 0) continue;
    if (!tribes[b.tribeId] || !tribes[b.tribeId].alive) continue;
    const d = dist(b.x, b.y, x, y);
    if (d < bestD) { bestD = d; best = b.tribeId; }
  }
  return best;
}

function launchRaid(lair) {
  const M = CONFIG.MONSTER;
  const tid = nearestTribeForRaid(lair.x, lair.y);
  if (tid < 0) return;
  const want = M.RAID.SIZE[clamp(lair.tier - 1, 0, M.RAID.SIZE.length - 1)];
  // Chúa Hang KHÔNG bao giờ rời tổ, nên loại NGAY trong vòng lặp chứ không lọc
  // sau: lọc sau thì nó vẫn chiếm một suất trong `want`, và một tổ quỷ đáng lẽ cử
  // 5 con lại chỉ cử 4. Trùm mà đi cướp thì phần thưởng lớn nhất bản đồ tự mang
  // thân tới cửa nhà người ta, và cả lý do đi đánh Tổ Quỷ biến mất.
  const raiders = [];
  for (const u of units) {
    if (u.type !== 'monster' || u.lairId !== lair.id || u.hp <= 0) continue;
    if (u.assault || u.mType === 'lord') continue;   // đang đi cướp rồi thì không gọi lại
    raiders.push(u);
    if (raiders.length >= want) break;
  }
  if (!raiders.length) return;
  for (const u of raiders) {
    u.assault = true;
    u.raidTribe = tid;
    u.raidUntil = tick + M.RAID.DURATION;
    u.combatTarget = null;
  }
  lair.raidsSent++;
  const t = tribes[tid];
  logEvent(`🩸 ${raiders.length} quái vật rời hang đi cướp ${t.name}!`, '#b783cc', lair.tier >= 3);
  addHotspot(lair.x, lair.y, 9, 'Quái rời hang đi cướp');
}

// Công trình gần nhất trong tầm — bản có giới hạn bán kính, dùng riêng cho quái.
// findNearestEnemyBuilding() duyệt TOÀN BỘ công trình của cả bốn bộ lạc, mà quái
// thì chỉ quan tâm cái gì mọc lên sát hang mình.
function findNearestBuildingInRange(x, y, range) {
  let best = null, bestD = range;
  for (const b of buildings) {
    if (b.hp <= 0) continue;
    const d = dist(b.x, b.y, x, y) - b.size;
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// Hào quang Chúa Hang — bản sao gần như nguyên văn của applyHeroAura, đổi điều
// kiện lọc từ "cùng bộ lạc và là quân sự" sang "là quái vật". Cố ý KHÔNG gộp hai
// hàm làm một: gộp lại thì thân hàm phải mang một tham số vị từ, mà nó nằm trong
// vòng lặp bucket chạy mỗi tick cho mỗi anh hùng — chỗ duy nhất trong file này mà
// một callback trên mỗi phần tử là chi phí thật, không phải chi phí tưởng tượng.
function applyLordAura(u) {
  const R = u.aura.r;
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((u.x - R) / B), x1 = Math.floor((u.x + R) / B);
  const y0 = Math.floor((u.y - R) / B), y1 = Math.floor((u.y + R) / B);
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o === u || o.type !== 'monster' || o.hp <= 0) continue;
        if (dist(o.x, o.y, u.x, u.y) > R) continue;
        // Hạn dùng +5 chứ không +1 như hào quang anh hùng: hàm này chỉ chạy mỗi 4
        // tick (trùm to và ít, không cần quét mỗi tick), nên hạn dùng phải phủ hết
        // khoảng nghỉ đó — nếu để +1 thì 3 trong 4 tick cả ổ đánh không có buff và
        // hào quang gần như không tồn tại.
        o.auraUntil = tick + 5;
        o.auraMult = u.aura.mult;
      }
    }
  }
}

function tickMonster(u) {
  if (u.cooldown > 0) u.cooldown--;
  u.speedCredit += u.speedMult;
  u.speed = Math.floor(u.speedCredit);
  u.speedCredit -= u.speed;
  if (u.aura && (tick + u.id) % 4 === 0) applyLordAura(u);

  // Chuyến đi cướp hết hạn: bỏ cờ assault, dây xích về hang có hiệu lực lại ngay
  // ở nhánh dưới và chúng tự lê xác về. Không cho hết hạn thì mọi con quái từng
  // đi cướp sẽ lang thang tới hết kỷ nguyên, và sau ~4 lượt cướp thì hang nào
  // cũng rỗng — chính là cái lỗi "quái dồn hết về một chỗ, vùng có hang sạch bóng"
  // mà dây xích được viết ra để chặn.
  if (u.raidTribe >= 0 && tick > u.raidUntil) {
    u.assault = false; u.raidTribe = -1; u.combatTarget = null;
  }

  const assault = !!u.assault;
  const homeD = assault ? 0 : dist(u.x, u.y, u.lairX, u.lairY);
  // Dây xích: quái GIỮ HANG không đuổi mồi qua nửa bản đồ. Không có giới hạn này
  // thì sau vài nghìn tick toàn bộ quái trên bản đồ dồn hết về chỗ đông người
  // nhất và biến thành một đợt sóng vô nghĩa, còn phần bản đồ có hang thì sạch
  // bóng — mất luôn ý nghĩa "vùng đất nguy hiểm" mà hang ổ sinh ra để tạo.
  // Quái của SÓNG (assault) thì ngược lại: nhiệm vụ của chúng là đi tới tận nơi.
  if (!assault && homeD > u.roam + 8) {
    u.combatTarget = null;
    if (u.speed > 0) moveToward(u, u.lairX, u.lairY);
    return;
  }

  let target = u.combatTarget;
  if (!target || target.hp <= 0) target = null;
  // tribeId = -1 nên findNearestEnemyUnit tự loại quái khác ra (cùng "phe"), và
  // coi mọi đơn vị của cả bốn bộ lạc là mục tiêu. Không cần luật riêng.
  // Quái ĐI CƯỚP có tầm phát hiện hẹp: chúng đang hành quân tới nhà người, không
  // đi săn. Quái của SÓNG thủ thành giữ tầm rộng như cũ — ở đó tràn ngập chính là
  // nội dung của chế độ chơi, không phải tác dụng phụ.
  const senseR = u.raidTribe >= 0 ? CONFIG.MONSTER.RAID.SENSE
               : CONFIG.MONSTER.AGGRO + (assault ? 2 : 0);
  if (!target) target = findNearestEnemyUnit(u.x, u.y, -1, senseR);

  if (assault) {
    if (!target) {
      const W = CONFIG.GRID_WIDTH;
      // Quái ĐI CƯỚP (raid, chế độ chinh phạt) bước xuống homeField của chính bộ
      // lạc bị nhắm — trường BFS mà bộ lạc đó đã tính sẵn cho dân mình biết đường
      // về kho. Quái của SÓNG (chế độ thủ thành) vẫn dùng monsterField toàn cục
      // như cũ. Hai đường ống, một luật đi.
      const field = u.raidTribe >= 0
        ? (tribes[u.raidTribe] ? tribes[u.raidTribe].homeField : null)
        : monsterField;

      // Loài BAY không đi theo trường: trường là BFS trên đất liền, mà thứ bay
      // được thì đường thẳng luôn ngắn hơn mọi đường vòng. Cho nó bước xuống
      // trường là tự nguyện bỏ mất đúng cái năng lực đắt nhất của nó — và tệ hơn,
      // nó sẽ từ chối bước vào ô nước (giá trị -1) đúng như bộ binh.
      if (u.fly) {
        // findNearestBuildingInRange với tầm 9999 duyệt TOÀN BỘ công trình của cả
        // bốn bộ lạc và không có đường thoát sớm. Gọi mỗi tick cho mỗi con phi
        // long là đúng loại chi phí nhân lên theo tích (số phi long × số nhà) đã
        // hai lần là thủ phạm hiệu năng trong file này. Nhớ mục tiêu, chỉ dò lại
        // khi nó chết hoặc mỗi 16 tick.
        if (!u.flyTarget || u.flyTarget.hp <= 0 || (tick + u.id) % 16 === 0) {
          u.flyTarget = findNearestBuildingInRange(u.x, u.y, 9999);
        }
        const b = u.flyTarget;
        if (b) {
          if (cheb(u.x, u.y, b.x, b.y) <= b.size + Math.max(0, u.range - 1)) target = b;
          else if (u.speed > 0) { moveToward(u, b.x, b.y); u.combatTarget = null; return; }
        }
      } else if (!field) {
        // Trường chưa kịp tính (bộ lạc mới, hoặc vừa mất sạch nhà): đi tham lam.
        const b = findNearestBuildingInRange(u.x, u.y, 9999);
        if (b && u.speed > 0) moveToward(u, b.x, b.y);
        u.combatTarget = null;
        return;
      } else {
      const fv = field[u.y * W + u.x];
      if (fv > 2) {
        // Còn xa: CHỈ hành quân, không mang theo mục tiêu nào cả.
        // KHÔNG né nhau khi hành quân — cố ý.
        //
        // Cả đàn cùng tốc độ và cùng luật chọn ô nên chúng chồng lên nhau khá
        // nhiều trên đường đi (bán kính đàn gần 0). Đã thử hai cách giãn đội hình
        // và CẢ HAI đều làm hỏng nặng hơn: bước ngang thay cho bước theo trường
        // (bán kính vọt lên 67 ô), và né sau khi bước đúng đường (vẫn 20-50 ô, vỡ
        // thành 3 cụm). Lý do chung: ranh giới giữa các "lòng chảo" của flow field
        // chỉ dày một ô, nên bất kỳ cú đẩy ngang nào cũng đủ để con quái đổi sang
        // toà nhà đích khác và tách hẳn khỏi đàn. Chồng hình lúc hành quân là cái
        // giá rẻ hơn nhiều so với việc sóng lại tan thành từng con lẻ — mà đó
        // đúng là lỗi đang phải sửa. Tới nơi đánh nhau thì chúng tự tản ra quanh
        // công trình.
        if (u.speed > 0) stepDownField(u, field);
        u.combatTarget = null;
        return;
      }
      if (fv >= 0) {
        // Tới nơi rồi mới nhận mục tiêu, và nhận TẠI CHỖ. Trường luôn dẫn tới
        // công trình gần nhất, nên nếu nhắm sẵn một toà từ bên kia bản đồ thì
        // điều kiện "đủ gần để đánh" sẽ không bao giờ đúng.
        target = findNearestBuildingInRange(u.x, u.y, 18);
      } else if ((tick + u.id) % 12 === 0) {
        // Đứng ngoài vùng BFS (bị nước/rừng cắt rời, hoặc trường đã cũ). Đi tham
        // lam về phía công trình gần nhất còn hơn đứng im tới hết kỷ nguyên.
        const b = findNearestBuildingInRange(u.x, u.y, 9999);
        if (b && u.speed > 0) moveToward(u, b.x, b.y);
      }
      }
    }
  } else if (!target && homeD < u.roam && (tick + u.id) % 12 === 0) {
    // Tìm công trình duyệt tuyến tính cả trăm toà nên chỉ chạy 1 lần mỗi 12 tick,
    // lệch pha theo id để 30 con quái không cùng quét trong một tick.
    target = findNearestBuildingInRange(u.x, u.y, CONFIG.MONSTER.AGGRO);
  }

  u.combatTarget = target;

  if (!target) {
    if (assault) return;   // đã lo phần di chuyển ở nhánh trên
    // Lảng vảng quanh hang cho có sức sống, không đứng như tượng.
    if (u.speed > 0 && (tick + u.id) % 40 < 12) {
      const a = ((u.id * 37 + tick) % 360) * Math.PI / 180;
      moveToward(u, Math.round(u.lairX + Math.cos(a) * 6), Math.round(u.lairY + Math.sin(a) * 6));
    }
    return;
  }

  const isBuilding = target.size !== undefined;
  // Cùng công thức tầm với của quân tầm xa (xem tickSoldier): tầm bắn đo từ MÉP
  // công trình chứ không từ tâm.
  const meleeReach = isBuilding ? target.size : 1;
  const reach = u.range > 0 ? u.range + (isBuilding ? target.size / 2 : 0) : meleeReach;
  const d = cheb(u.x, u.y, target.x, target.y);
  if (d <= reach) {
    u.stuck = 0;
    if (u.range > 0 && !isBuilding && d < u.minRange && u.speed > 0) moveAwayFrom(u, target.x, target.y);
    if (u.cooldown === 0) {
      if (u.range > 0) rangedStrike(u, target, isBuilding);
      else dealDamage(u, target, isBuilding);
      // Nọc độc bám vào NGƯỜI, không bám vào tường. Áp sau đòn đánh chứ không
      // trong dealDamage: dealDamage là cửa chung của cả bốn phe, nhét trạng thái
      // riêng của một loài quái vào đó thì mọi cú đánh trong game phải trả tiền
      // cho một nhánh if mà 99% trường hợp là false.
      if (u.venom && !isBuilding && target.hp > 0) {
        target.venomUntil = tick + u.venom.ticks;
        target.venomDps = u.venom.dps;
      }
      u.cooldown = u.cd;
    }
  } else if (u.speed > 0) {
    moveToward(u, target.x, target.y);
    if (noProgress(u, target.id, dist(u.x, u.y, target.x, target.y), 25)) {
      u.stuck = 0; u.combatTarget = null;
    }
  }
}

// Trước bản này ở đây còn `nudgeToLand`: đồ rơi xuống HỒ thì không ai nhặt được
// (chỉ anh hùng nhặt đồ, mà anh hùng đi bộ), nên xác phi long chết giữa mặt nước
// phải được dạt vào bờ, bằng không mỗi con là một phần thưởng bốc hơi lặng lẽ và
// trần 14 món dưới đất bị chiếm chỗ bởi đồ ma. Hết nước thì hết ô cấm địa: mọi
// điểm trong bản đồ đều tới được, món đồ nằm đâu cũng nhặt được.
function dropItem(x, y, key, lv) {
  const p = { x: clamp(Math.round(x), 0, CONFIG.GRID_WIDTH - 1),
              y: clamp(Math.round(y), 0, CONFIG.GRID_HEIGHT - 1) };
  // `lv` mặc định 1. Món rơi ra từ tay một anh hùng vừa ngã thì GIỮ NGUYÊN CẤP —
  // công sức nung nó không bốc hơi cùng người cầm, nó nằm lại trên đất chờ người
  // sau. Đó cũng là lý do một chiến trường có anh hùng ngã xuống đáng quay lại.
  groundItems.push({ id: nextId++, key, lv: clamp(Math.round(lv || 1), 1, CONFIG.ITEM.MAX_LEVEL), x: p.x, y: p.y, born: tick });
  // Trần 14 món nằm dưới đất cùng lúc (cũ: 60). Đây là trần THẨM MỸ và cũng là
  // trần cơ chế: một bản đồ có 60 món đồ vô chủ thì "đi tìm đồ" không còn là một
  // chuyến đi mạo hiểm, nó chỉ là nhặt thứ gần nhất.
  if (groundItems.length > 14) groundItems.shift();
}

function onMonsterDeath(u) {
  const spec = CONFIG.MONSTER.TYPES[u.mType];
  if (spec.boss) {
    // Đồng hồ hồi sinh đếm từ lúc trùm CHẾT, ghi lên chính cái hang. Nếu để hang
    // tự dò "có trùm chưa" mà không có đồng hồ thì tick ngay sau cái chết nó gọi
    // con mới ra liền — giết trùm sẽ chẳng đổi được gì trong đúng một tick, và
    // cả chiến dịch đi đánh Tổ Quỷ không có phần thưởng nào cả.
    const l = u.lairId >= 0 ? lairs.find(x => x.id === u.lairId) : null;
    if (l) l.lordDeadAt = tick;
    logEvent(`⚔️ CHÚA HANG đã bị hạ gục!`, '#e07a56', true);
    addHotspot(u.x, u.y, 12, 'Chúa Hang gục ngã');
  }
  if (Math.random() > spec.drop) return;
  const table = MONSTER_DROPS[u.mType];
  dropItem(u.x, u.y, table[Math.floor(Math.random() * table.length)]);
}

function onLairDestroyed(lair, attacker) {
  lair.hp = 0;
  addFx({ type: 'boom', x: lair.x, y: lair.y, life: 30, maxLife: 30, r: 4 });
  addHotspot(lair.x, lair.y, 8, 'Hang ổ bị phá');
  // Phá hang luôn ra thánh vật: đây là phần thưởng đáng để cả một đạo quân đi
  // đường vòng, nếu không thì chẳng ai buồn dọn hang và chúng chỉ là phiền toái.
  // ĐÚNG MỘT món, không phải hai như bản trước: hang ổ là mục tiêu khó nhất trên
  // bản đồ, phần thưởng của nó phải là món TỐT NHẤT chứ không phải NHIỀU NHẤT —
  // rơi hai món một lúc thì nó thành cái kho, và mọi món khác mất giá theo.
  dropItem(lair.x, lair.y, 'relic');
  // Hang càng già thì phá càng lời — MỘT món nữa ở cấp 3, không phải một kho.
  // Lý do giữ đúng một món cộng thêm đã viết ở trên: phần thưởng của mục tiêu khó
  // nhất bản đồ phải là món TỐT NHẤT, không phải NHIỀU NHẤT. Nhưng nếu Tổ Quỷ
  // (2.300 máu, có trùm canh) trả đúng bằng một cái hang mới mọc thì cơ chế lớn
  // lên tự phản lại chính nó: chờ cho hang già đi là quyết định thuần lỗ.
  if (lair.tier >= 3) dropItem(lair.x + 2, lair.y, 'armor');
  const who = attacker && attacker.tribeId >= 0 ? tribes[attacker.tribeId] : null;
  const tname = lairTierSpec(lair).name.toUpperCase();
  logEvent(who ? `🏆 ${who.name} phá huỷ một ${tname} quái vật` : `🏆 Một ${tname} quái vật bị phá huỷ`,
           who ? who.color : '#b783cc', true);
  // Quái của hang đó mất nhà: xích chúng vào chỗ cũ để chúng không lang thang vô định.
  for (const u of units) if (u.type === 'monster' && u.lairId === lair.id) u.lairId = -1;
}

// Anh hùng nhặt đồ. CHỈ anh hùng — nếu ai cũng nhặt được thì vật phẩm chỉ là một
// khoản cộng chỉ số dàn đều, không còn là lý do để một CÁ THỂ đi mạo hiểm.
// Nung hai món CÙNG LOẠI CÙNG CẤP trong hòm thành một món cấp cao hơn. Trả về
// tên món đã nung, hoặc null nếu không có cặp nào nung được.
//
// Chọn cặp có cấp CAO NHẤT có thể nung: nếu hòm có hai cấp 1 và hai cấp 2, nung
// cặp cấp 2 trước. Lý do là số học — một cặp cấp 2 thành cấp 3 được +1,4 lần chỉ
// số, một cặp cấp 1 thành cấp 2 chỉ được +0,2. Nung cái đắt trước thì mỗi ngăn
// giải phóng ra đều đáng giá nhất có thể.
function fuseHeldItems(u) {
  const MAXLV = CONFIG.ITEM.MAX_LEVEL;
  let bi = -1, bj = -1, bLv = 0;
  for (let i = 0; i < u.items.length; i++) {
    for (let j = i + 1; j < u.items.length; j++) {
      const a = u.items[i], b = u.items[j];
      if (a.key !== b.key || a.lv !== b.lv || a.lv >= MAXLV) continue;
      if (a.lv > bLv) { bLv = a.lv; bi = i; bj = j; }
    }
  }
  if (bi < 0) return null;
  u.items[bi].lv++;
  u.items.splice(bj, 1);                 // xoá j sau i nên chỉ số i không xê dịch
  return u.items[bi];
}

function tryPickUpItems(u) {
  // KHÔNG có cửa "hòm đầy thì thôi" ở đây, dù nó rẻ. Với luật đồ trùng, một hòm
  // 6/6 toàn món khác loại VẪN nhặt được một món trùng cấp dưới đất (nó nung vào
  // món có sẵn, không đòi ngăn nào). Một cửa chặn sớm dựa trên `canFuse` — vốn chỉ
  // nhìn vào đồ ĐANG CẦM — sẽ bỏ lỡ đúng trường hợp đó. Bãi đồ tối đa 14 món nên
  // quét thẳng chẳng đắt gì.
  for (let i = 0; i < groundItems.length; i++) {
    const it = groundItems[i];
    // Bán kính vơ tay 1.5->2.5: anh hùng đập hang từ cheb=2 (lair.size=2), mà Thánh
    // vật rơi ngay TÂM hang — với 1.5 thì phần thưởng khó nhất bản đồ rơi ngoài tầm
    // với, hero phải đi thêm một vòng seek mới nhặt (và có thể bị việc khác cắt ngang).
    if (dist(it.x, it.y, u.x, u.y) > 2.5) continue;
    const t = tribes[u.tribeId];
    const spec = CONFIG.ITEM.TYPES[it.key];
    const lv = clamp(Math.round(it.lv || 1), 1, CONFIG.ITEM.MAX_LEVEL);

    // 1. NHẶT TRÚNG ĐỒ TRÙNG (cùng loại, cùng cấp, chưa tới trần) -> nung ngay,
    //    không tốn ngăn nào. Đây là đường chạy chính của cả cơ chế.
    const twin = u.items.find(h => h.key === it.key && h.lv === lv && h.lv < CONFIG.ITEM.MAX_LEVEL);
    if (twin) {
      groundItems.splice(i, 1);
      twin.lv++;
      recomputeHeroStats(u);
      logEvent(`⚗ ${u.name} hợp nhất hai ${spec.label}${lv > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[lv] : ''} thành ${spec.label} ${CONFIG.ITEM.LEVEL_TAG[twin.lv]}`, t.color, true);
      addFx({ type: 'spark', x: u.x, y: u.y, life: 24, maxLife: 24, color: spec.color });
      return;
    }

    // 2. Không trùng mà hòm ĐẦY -> nung một cặp có sẵn để lấy chỗ. Thứ tự nung
    //    TRƯỚC, nhặt SAU là bắt buộc: đảo lại thì hòm tràn một ngăn ở giữa hai bước.
    if (u.items.length >= CONFIG.ITEM.MAX_HELD) {
      const fused = fuseHeldItems(u);
      if (!fused) return;                // không nung được: bỏ qua, để món nằm đó
      const fs = CONFIG.ITEM.TYPES[fused.key];
      logEvent(`⚗ ${u.name} hợp nhất hai ${fs.label} thành ${fs.label} ${CONFIG.ITEM.LEVEL_TAG[fused.lv]}`, t.color, true);
      addFx({ type: 'spark', x: u.x, y: u.y, life: 22, maxLife: 22, color: fs.color });
    }
    groundItems.splice(i, 1);
    u.items.push({ key: it.key, lv });
    recomputeHeroStats(u);
    const tag = lv > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[lv] : '';
    logEvent(`${spec.icon} ${u.name} nhặt được ${spec.label}${tag}`, t.color);
    addFx({ type: 'spark', x: u.x, y: u.y, life: 14, maxLife: 14, color: spec.color });
    return;
  }
}

// "Có cặp nào nung được không" — dùng ở cửa vào tryPickUpItems và ở nhánh ĐI TÌM
// đồ trong tickHero, nên phải là một hàm riêng: hai chỗ đó mà hỏi bằng hai công
// thức khác nhau thì sẽ có trạng thái anh hùng lặn lội tới nơi rồi đứng nhìn.
function canFuse(u) {
  const MAXLV = CONFIG.ITEM.MAX_LEVEL;
  const seen = new Map();
  for (const it of u.items) {
    if (it.lv >= MAXLV) continue;
    const k = it.key + '#' + it.lv;
    if (seen.has(k)) return true;
    seen.set(k, 1);
  }
  return false;
}

function findNearestGroundItem(x, y, range) {
  let best = null, bestD = range;
  for (const it of groundItems) {
    const d = dist(it.x, it.y, x, y);
    if (d < bestD) { bestD = d; best = it; }
  }
  return best;
}

// ============================================================
// Chế độ THỦ THÀNH — sóng quái
// ============================================================
// Trường dẫn đường TIẾN CÔNG: BFS từ MỌI công trình của MỌI bộ lạc, tính một lần
// rồi cả sóng dùng chung. Không cho mỗi con quái tự tìm đường vì hai lý do: chi
// phí (một sóng có thể hơn trăm con), và vì đi tham lam sẽ dán cả sóng vào bờ hồ
// đầu tiên gặp phải — đúng cái bẫy đã ba lần làm chết mô phỏng này.
// Mỗi đợt nhắm ĐÚNG MỘT bộ lạc — cụ thể là bộ lạc đang mạnh nhất.
//
// Bản đầu tính trường từ công trình của MỌI bộ lạc, tức là mỗi con quái tự đi
// tới toà nhà gần nó nhất. Nghe thì hợp lý nhưng nó phá tan chính khái niệm
// "đợt": đàn sinh ra ở ranh giới giữa hai vùng ảnh hưởng sẽ tách đôi ngay từ
// bước đi đầu tiên, mỗi nửa bò về một thành phố khác nhau. Đo thật: đàn 8 con
// tản ra bán kính trung bình 117 ô sau 600 tick — người xem lại chỉ thấy quái
// lẻ tẻ, đúng cái lỗi đang phải sửa.
//
// Nhắm một bộ lạc thì đàn tự đi thành khối, và luôn đánh vào kẻ đang dẫn đầu —
// vừa dễ đọc ("đợt này đánh Xích Long"), vừa tự cân bằng: ai vươn lên thì bị
// tập trung đánh, nên không có bộ lạc nào ngồi yên tới hết giờ.
function pickWaveTarget() {
  const alive = tribes.filter(t => t.alive && buildings.some(b => b.tribeId === t.id && b.done && b.hp > 0));
  if (!alive.length) return -1;
  return alive.slice().sort((a, b) => tribeScore(b) - tribeScore(a))[0].id;
}

function computeMonsterField() {
  const t = waveTargetTribe;
  const valid = t >= 0 && tribes[t] && tribes[t].alive
                && buildings.some(b => b.tribeId === t && b.done && b.hp > 0);
  if (!valid) waveTargetTribe = pickWaveTarget();
  const tid = waveTargetTribe;
  // tid < 0 (không còn ai có công trình) thì quay về nhắm tất cả, để quái không
  // đứng chôn chân ngoài vùng BFS rỗng.
  monsterField = bfsFieldFromBuildings(b => b.hp > 0 && b.done && (tid < 0 || b.tribeId === tid));
  monsterFieldTick = tick;
}

// Thành phần một đợt: sói ở đợt đầu, gấu chen vào từ đợt ~2, quỷ đá từ đợt ~5.
// Leo thang phải nằm ở CẢ hai trục — số lượng và chất lượng. Chỉ tăng số lượng
// thì phòng thủ đã dựng xong sẽ bào hết mọi đợt về sau mà không tốn gì thêm.
function rollWaveMonsterType(wave) {
  // Cộng dồn theo thứ tự DỮ NHẤT TRƯỚC, và mỗi loài có mốc đợt riêng để bước vào
  // sân. Bảng này là chỗ duy nhất quyết định chế độ Thủ thành có thấy loài mới hay
  // không — bốn loài mới của 3.7 chỉ tồn tại trong chế độ Chinh phạt nếu quên nó.
  const pLord   = wave >= 10 ? 0.035 : 0;                 // trùm: hiếm, và chỉ ở cuối
  const pWyvern = clamp((wave - 6) / 14, 0, 0.16);
  const pTroll  = clamp((wave - 4) / 12, 0, 0.28);
  const pWisp   = clamp((wave - 2) / 10, 0, 0.18);
  const pBear   = clamp((wave - 1) / 8, 0, 0.26);
  const pSpider = 0.18;                                    // có mặt ngay từ đợt 1
  const r = Math.random();
  let acc = pLord;                if (r < acc) return 'lord';
  acc += pWyvern;                 if (r < acc) return 'wyvern';
  acc += pTroll;                  if (r < acc) return 'troll';
  acc += pWisp;                   if (r < acc) return 'wisp';
  acc += pBear;                   if (r < acc) return 'bear';
  acc += pSpider;                 if (r < acc) return 'spider';
  return 'wolf';
}

// Điểm xuất phát của sóng: ưu tiên các HANG Ổ CÒN SỐNG. Nhờ vậy việc đi dọn hang
// trở thành một quyết định chiến lược thật — phá hang không chặn được sóng, nhưng
// đẩy điểm sinh ra tận rìa bản đồ, tức là quái phải đi xa hơn nhiều mới tới nơi.
// Nếu để "hết hang = hết sóng" thì bộ lạc mạnh sẽ dọn sạch rồi sống mãi, và chế
// độ này không bao giờ kết thúc.
// ĐIỂM TẬP KẾT của một đợt — cả đợt xuất phát từ 1-3 chỗ, KHÔNG phải mỗi con một nơi.
//
// Bản đầu dùng `lairs[index % lairs.length]`, tức là con thứ nhất ở hang 1, con
// thứ hai ở hang 2... nên một "đợt 5 con" thực ra là 5 con đi lẻ từ 5 góc bản đồ
// 340x220, mỗi con tự bò tới một thành phố khác nhau rồi chết một mình. Đo thật:
// 200 tick sau khi báo "ĐỢT 1 — 5 quái vật tràn tới" thì trên bản đồ còn ĐÚNG 0
// con. Người chơi thấy dòng thông báo rồi chẳng thấy gì — đúng như báo lỗi
// "wave quái không xuất hiện". Sóng phải là một KHỐI thì mới đọc ra là sóng.
function pickWaveStagingPoints(wave) {
  const fronts = wave >= 12 ? 3 : wave >= 6 ? 2 : 1;   // càng về sau càng nhiều mũi
  const pts = [];
  for (let k = 0; k < fronts; k++) {
    if (lairs.length) {
      const l = lairs[(wave * 2 + k * 3) % lairs.length];
      pts.push({ x: l.x, y: l.y });
    } else {
      pts.push(pickWaveSpawn(wave + k * 5));
    }
  }
  return pts;
}

function pickWaveSpawn(index) {
  const M = CONFIG.DEFEND.EDGE_MARGIN;
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  for (let attempt = 0; attempt < 60; attempt++) {
    const side = (index + attempt) % 4;
    const x = side === 0 ? M : side === 1 ? W - 1 - M : Math.floor(randRange(M, W - M));
    const y = side === 2 ? M : side === 3 ? H - 1 - M : Math.floor(randRange(M, H - M));
    if (!isBlocked(x, y)) return { x, y };
  }
  return { x: Math.floor(W / 2), y: M };
}

function spawnWave() {
  const D = CONFIG.DEFEND;
  waveNumber++;
  const count = D.BASE_COUNT + Math.floor(waveNumber * D.COUNT_GROWTH);
  const hpMult = 1 + waveNumber * D.HP_GROWTH;
  const atkMult = 1 + waveNumber * D.ATK_GROWTH;

  // DỌN quái lang thang trước khi sinh đợt mới.
  //
  // Trần MAX_ALIVE vốn chỉ để chống treo trình duyệt, nhưng nó chặn nhầm cả phần
  // LEO THANG: khi trần đầy thì đợt mới không sinh được con nào, mà quái đợt sau
  // mới là loại dày máu mạnh tay. Đo thật: có kỷ nguyên chạy tới đợt 36 với 242
  // con trên bản đồ mà bộ lạc cuối vẫn thủ tới hết giờ — vì từ khoảng đợt 20 trở
  // đi không có con nào mới vào sân nữa. Phần lớn số đó là quái bị kẹt ngoài vùng
  // BFS (bên kia hồ) hoặc đi lạc, không đóng góp gì. Dọn chúng đi thì trần gần
  // như không bao giờ chạm tới, và độ khó lại tăng đều theo đợt.
  let alive = 0, pruned = 0;
  for (const u of units) {
    if (u.type !== 'monster') continue;
    // Chỉ dọn quái của SÓNG (`u.wave` có giá trị). Quái ĐI CƯỚP từ hang cũng mang
    // cờ assault, nhưng chúng có nhà để về và có hạn chuyến đi riêng — dọn nhầm
    // thì mỗi lần một đợt sóng sinh ra là một cái hang bị vặt trụi quân.
    if (u.wave !== undefined && u.assault && !u.combatTarget && tick - u.born > 2500) { u.hp = 0; pruned++; continue; }
    alive++;
  }
  if (pruned) units = units.filter(u => u.hp > 0);

  const staging = pickWaveStagingPoints(waveNumber);
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    if (alive + spawned >= D.MAX_ALIVE) break;
    const key = rollWaveMonsterType(waveNumber);
    const spec = CONFIG.MONSTER.TYPES[key];
    // Tụm quanh điểm tập kết trong bán kính 5 ô: đủ để không chồng lên nhau,
    // đủ gần để cả nhóm bước xuống cùng một trường dẫn đường và đi thành đàn.
    const st = staging[i % staging.length];
    const at = { x: st.x + Math.round(randRange(-5, 5)), y: st.y + Math.round(randRange(-5, 5)) };
    const u = {
      id: nextId++, tribeId: -1, type: 'monster', mType: key,
      x: clamp(at.x, 0, CONFIG.GRID_WIDTH - 1), y: clamp(at.y, 0, CONFIG.GRID_HEIGHT - 1),
      hp: Math.round(spec.hp * hpMult), maxHp: Math.round(spec.hp * hpMult),
      attack: spec.attack * atkMult,
      // Giáp KHÔNG leo theo số đợt, khác máu và sát thương. Lý do: sóng thủ thành
      // đã leo thang theo hai trục nhân, thêm trục trừ nữa thì tới đợt ~25 mọi đòn
      // của bộ lạc đều rơi xuống sàn 25% và trận đánh biến thành một phép chia
      // hằng số — độ khó vẫn tăng nhưng CÁCH chơi thì không còn gì để thay đổi.
      defense: spec.defense || 0,
      // Quái của SÓNG đi cùng MỘT tốc độ hành quân, không dùng tốc độ theo loài.
      // Giữ tốc độ riêng thì sói (1,5) bỏ xa gấu (0,9) và quỷ đá (0,7): đo thật
      // là chỉ 250 tick sau khi xuất phát, đàn 9 con đã tản ra bán kính trung
      // bình 106 ô — tức là tới nơi thành từng con lẻ ở những thành phố khác
      // nhau, đúng cái cảm giác "chẳng thấy đợt nào cả". Khác biệt giữa các loài
      // vẫn còn nguyên ở máu, sát thương và nhịp đánh.
      // Ngoại lệ DUY NHẤT: loài BAY giữ nguyên tốc độ của nó. Lý do "cả đàn cùng
      // tốc để không tan thành từng con" ở trên là lý do của ĐƯỜNG ĐI — cả đàn
      // phải bám cùng một flow field trên đất liền. Phi long không đi trên trường
      // đó, nó bay đường thẳng, nên ép nó chậm lại chẳng giữ được đội hình nào cả,
      // chỉ làm mất đúng cái đặc điểm khiến người xem nhận ra nó.
      speedMult: spec.fly ? spec.speedMult : 1.0, speedCredit: 0, speed: 1,
      cooldown: 0, cd: spec.cooldown, born: tick,
      facingX: 1, facingY: 0, lungeUntil: 0, swingAt: 0,
      // assault = quái của sóng: KHÔNG có dây xích về hang, đi bằng trường dẫn đường
      // cho tới khi tới nơi rồi mới nhận mục tiêu tại chỗ.
      assault: true, wave: waveNumber,
      lairId: -1, lairX: at.x, lairY: at.y, roam: CONFIG.MONSTER.ROAM_RADIUS,
      threat: spec.threat * (1 + waveNumber * 0.05),
      combatTarget: null, stuck: 0, progKey: null, progBest: Infinity,
      auraUntil: 0, auraMult: 1,
      carry: { type: null, amount: 0 }, fleeTimer: 0,
      fly: !!spec.fly, range: spec.range || 0, minRange: spec.minRange || 0,
      splash: spec.splash || 0, venom: spec.venom || null, aura: spec.aura || null,
      // raidTribe = -1 -> tickMonster hiểu đây là quái của SÓNG và dùng
      // monsterField toàn cục, không phải homeField của một bộ lạc cụ thể.
      raidTribe: -1, raidUntil: 0,
      rx: 0, ry: 0, flash: 0
    };
    u.rx = u.x; u.ry = u.y;
    units.push(u);
    spawned++;
  }

  // Chọn mục tiêu TRƯỚC khi tính trường, để cả đợt vừa sinh ra đã có chung đích.
  waveTargetTribe = pickWaveTarget();
  computeMonsterField();
  nextWaveTick = tick + CONFIG.DEFEND.WAVE_INTERVAL;
  const victim = waveTargetTribe >= 0 ? tribes[waveTargetTribe] : null;
  logEvent(victim
    ? `🌊 ĐỢT ${waveNumber} — ${spawned} quái vật tràn vào ${victim.name} từ ${staging.length} hướng!`
    : `🌊 ĐỢT ${waveNumber} — ${spawned} quái vật tràn tới!`, '#b783cc', true);
  // Điểm nóng ngay tại chỗ tập kết để camera đạo diễn cắt sang xem đàn quái đổ bộ.
  // Weight đặt cao hẳn vì đây là biến cố lớn nhất của chế độ này.
  for (const st of staging) addHotspot(st.x, st.y, 14, `Đợt ${waveNumber} đổ bộ`);
}

function findNearestLairInRange(x, y, range) {
  let best = null, bestD = range;
  for (const l of lairs) {
    if (l.hp <= 0) continue;
    const d = dist(l.x, l.y, x, y) - l.size;
    if (d < bestD) { bestD = d; best = l; }
  }
  return best;
}

// Dùng chung cho THÁP CANH lẫn NHÀ CHÍNH: bất cứ công trình nào có `range` đều
// tự bắn trả. Kinh đô biết tự vệ là thứ khiến công thành trở thành một chiến dịch
// thật sự thay vì vài người lính gõ cửa — nếu không, kỷ nguyên nào cũng kết thúc
// ở tick ~5000 khi nền văn minh còn chưa qua nổi thời Đồ Đá.
function tickDefender(b, tribe) {
  if (!b.done || b.hp <= 0) return;
  const spec = CONFIG.BUILD[b.type];
  if (!spec.range) return;
  if (b.cooldown > 0) { b.cooldown--; return; }
  const enemy = findNearestEnemyHero(b.x, b.y, b.tribeId, spec.range)
             || findNearestEnemyUnit(b.x, b.y, b.tribeId, spec.range);
  if (!enemy) return;
  // Mũi tên của tháp cũng bị GIÁP chặn, y như đòn của quân. Nếu bỏ qua giáp ở
  // đây thì công trình phòng thủ trở thành đường duy nhất trong game không bị luật
  // giáp chi phối — và kỵ sĩ giáp 4, thứ được thiết kế để lao vào chỗ nguy hiểm
  // nhất, sẽ bị chính cái nó khắc chế được đốn hạ y như một người lính trần.
  const raw = spec.attack * CONFIG.AGE.BONUS[tribe.age].atk;
  enemy.hp -= Math.max(raw * CONFIG.UNIT.ARMOR_FLOOR, raw - effDefense(enemy));
  b.cooldown = spec.cooldown;
  // Tháp bắn MŨI TÊN bay có thời gian bay, không phải tia sáng tức thời — đây là
  // hiệu ứng dễ đọc nhất trên bản đồ: nhìn hướng tên là biết ai đang thủ ai.
  addFx({ type: 'arrow', x1: b.x, y1: b.y, x2: enemy.x, y2: enemy.y, life: 9, maxLife: 9, color: tribe.color });
  addFx({ type: 'spark', x: enemy.x, y: enemy.y, life: 7, maxLife: 7, color: '#e07a56' });
  addHotspot(enemy.x, enemy.y, 1.5, b.type === 'town' ? 'Kinh đô cố thủ' : 'Tháp canh khai hoả');
  if (enemy.hp <= 0) { tribe.kills++; if (enemy.tribeId >= 0) tribes[enemy.tribeId].losses++; }
}

