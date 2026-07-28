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
  lord:   ['relic'],
  // Năm loài của 3.22. Bảng rơi đồ bám theo ĐỘNG TỪ của loài chứ không rải đều:
  // thứ chạy nhanh rơi giày, thứ dày da rơi giáp, thứ phép thuật rơi cờ/thánh vật.
  // Quên một khoá ở đây là `table[...]` đọc trên `undefined` và cả mô phỏng dừng
  // ngay lần đầu loài đó chết — cùng họ với lỗi bảng threat rời đã bỏ ở 3.7.
  slime:    ['boots', 'boots', 'sword'],
  burrower: ['sword', 'boots', 'armor'],
  serpent:  ['boots', 'sword', 'relic'],
  shaman:   ['banner', 'banner', 'relic'],
  ent:      ['armor', 'armor', 'relic'],
  // Thiên Ma rơi Thánh vật (drop 1,0). Phần thưởng THẬT của nó là kho báu trong
  // onWorldBossSlain — món đồ này chỉ là phần cho riêng anh hùng nào đứng đó.
  worldboss: ['relic']
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
  // SÂN HANG — chặt trụi cây quanh mỗi ổ. Xem CONFIG.MONSTER.LAIR_CLEAR_R.
  //
  // THỨ TỰ là cả nội dung của ba dòng này, đúng cùng bài học đã trả giá hai lần ở
  // carveForestLanes và ở chính spawnLairLodes ngay dưới đây: dọn cây NGAY SAU mỗi
  // lần đặt hang thì cái hang đặt sau vẫn nằm giữa rừng của nó, còn dọn ở đây —
  // sau khi cả 16 hang đã có chỗ — thì mọi cái sân đều là sân thật.
  //
  // Và phải đứng TRƯỚC spawnLairLodes: `addResource` từ chối ô đã có chủ, nên một
  // gốc cây còn nằm đó sẽ lặng lẽ ăn mất một ô quặng của vỉa canh hang.
  for (const l of lairs) clearTrees(l.x, l.y, CONFIG.MONSTER.LAIR_CLEAR_R);
  spawnLairLodes();
}

// MỎ CANH HANG — vàng và đá mọc quanh mỗi ổ quái. Xem CONFIG.MONSTER.LODE.
//
// Chạy SAU khi đã đặt xong toàn bộ hang, cùng lý do với carveForestLanes: nếu rải
// mỏ ngay sau mỗi hang thì cái hang đặt sau có thể rơi trúng mỏ của hang trước và
// hai ổ dùng chung một vỉa — mà cả cơ chế này dựa trên "mỗi ổ canh phần của nó".
//
// Bảo đảm TỐI THIỂU một mỏ mỗi loại: bốc `[min, max]` chứ không bốc xác suất, vì
// "thường thì có" đúng là thứ đã hỏng ở bộ khởi đầu tài nguyên (đo ra 13/100 bộ
// lạc trắng tay đá). Một cơ chế mà người xem phải may mới thấy thì với phần lớn
// ván chơi nó không tồn tại.
function spawnLairLodes() {
  const L = CONFIG.MONSTER.LODE;
  if (!L) return;
  for (const lair of lairs) {
    for (const [type, range] of [['gold', L.GOLD], ['stone', L.STONE]]) {
      const n = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
      let placed = 0;
      // `tries` chứ không phải `n` vòng: một vỉa rơi trúng chỗ đã có mỏ khác (hoặc
      // bị biên bản đồ kẹp ra ngoài) thì `scatterResourceCluster` đặt được 0 ô và
      // cái hang đó lặng lẽ không có quặng. Đo bản không có vòng thử lại: 1/128
      // hang trắng đá — nhỏ, nhưng "ít nhất một mỏ mỗi loại" là một LỜI HỨA, và
      // một lời hứa đúng 99,2% số lần thì nó là một xác suất, không phải lời hứa.
      // Cùng bài học đã trả giá ở bộ khởi đầu tài nguyên (13/100 bộ lạc trắng đá).
      for (let tries = 0; tries < 24 && (placed === 0 || tries < n); tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = L.RING[0] + Math.random() * (L.RING[1] - L.RING[0]);
        const x = clamp(Math.round(lair.x + Math.cos(a) * r), 4, CONFIG.GRID_WIDTH - 5);
        const y = clamp(Math.round(lair.y + Math.sin(a) * r), 4, CONFIG.GRID_HEIGHT - 5);
        placed += scatterResourceCluster(type, x, y, L.RICH, L.RADIUS_MULT);
      }
    }
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
  const TIERS = CONFIG.MONSTER.TIERS;
  if (l.tier >= TIERS.length) return;
  const next = TIERS[l.tier];         // 0-based: phần tử thứ `tier` chính là cấp kế tiếp
  l.tier++;
  // Máu CỘNG THÊM chứ không đặt lại: một cái hang đã bị đánh dở dang mà lên cấp
  // được hồi đầy máu thì mọi nỗ lực công phá trước đó bị xoá, và bộ lạc nào đang
  // đánh dở sẽ vĩnh viễn không bao giờ phá xong — đúng kiểu bế tắc mà người xem
  // đọc ra là "game ăn gian" chứ không phải "leo thang".
  const add = next.hpBonus - (TIERS[l.tier - 2] ? TIERS[l.tier - 2].hpBonus : 0);
  l.maxHp += add;
  l.hp += add;
  // Bán kính lảng vảng nở ra theo cấp — và phải cập nhật cho CẢ ĐÀN đang sống,
  // không chỉ con sinh sau. `u.roam` là bản sao chép xuống cá thể (để tránh tra
  // `lairs.find` mỗi tick cho mỗi con quái); mọi bản sao đều có cái giá của nó là
  // phải nhớ đồng bộ đúng ở đây. Quên dòng này thì vòng tím trên bản đồ nở ra mà
  // đàn quái vẫn bị xích ở bán kính cũ — người xem thấy một lời hứa không có thật.
  for (const u of units) if (u.type === 'monster' && u.lairId === l.id) u.roam = next.roam;
  addFx({ type: 'boom', x: l.x, y: l.y, life: 34, maxLife: 34, r: 5 });
  addHotspot(l.x, l.y, l.tier >= 3 ? 12 : 7, TL('Hang ổ lên {tier}', { tier: () => next.name }));
  logEvent(l.tier >= 3
    ? TL('👹 Một hang ổ đã hoá thành TỔ QUỶ — Chúa Hang thức giấc!')
    : TL('🕳 Một hang ổ đã lớn thành {tier}', { tier: () => next.name }), '#b783cc', l.tier >= 3);
}

// Hang teo lại. Đối xứng với promoteLair nhưng KHÔNG đối xứng ở một chỗ: máu tối
// đa tụt xuống, còn máu hiện tại chỉ bị KẸP xuống trần mới chứ không bị trừ đúng
// bằng khoản đã cộng. Nếu trừ thẳng thì một cái hang vừa bị đánh gần chết mà tụt
// cấp sẽ chết ngay lập tức mà không ai đánh nốt — công lao thuộc về đồng hồ, không
// thuộc về ai cả, và người xem không đọc ra được vì sao nó sập.
function demoteLair(l) {
  const TIERS = CONFIG.MONSTER.TIERS;
  const oldBonus = TIERS[l.tier - 1].hpBonus;
  l.tier--;
  const newBonus = TIERS[l.tier - 1].hpBonus;
  l.maxHp -= (oldBonus - newBonus);
  l.hp = Math.min(l.hp, l.maxHp);
  for (const u of units) if (u.type === 'monster' && u.lairId === l.id) u.roam = TIERS[l.tier - 1].roam;
  logEvent(TL('🌤 Một hang ổ đã suy yếu, tụt về {tier}', { tier: () => TIERS[l.tier - 1].name }), '#8d9490');
}

function spawnMonster(lair, forceKey) {
  const TIER = lairTierSpec(lair);
  const key = forceKey || TIER.ladder[lair.spawnedTotal % TIER.ladder.length];
  const spec = CONFIG.MONSTER.TYPES[key];
  lair.spawnedTotal++;
  const m = TIER.statMult;
  const u = {
    id: nextId++, tribeId: -1, type: 'monster', mType: key,
    x: clamp(lair.x + Math.round(randRange(-3, 3)), 0, CONFIG.GRID_WIDTH - 1),
    y: clamp(lair.y + Math.round(randRange(-3, 3)), 0, CONFIG.GRID_HEIGHT - 1),
    hp: Math.round(spec.hp * m), maxHp: Math.round(spec.hp * m),
    attack: spec.attack * m, defense: spec.defense || 0,
    speedMult: spec.speedMult, speedCredit: 0, speed: 1,
    maxStam: 0, stam: 0, stamX: undefined, stamY: undefined,   // thể lực — xem tickStamina
    cooldown: 0, cd: spec.cooldown, born: tick,
    facingX: 1, facingY: 0, lungeUntil: 0, swingAt: 0,
    lairId: lair.id, lairX: lair.x, lairY: lair.y,
    threat: spec.threat * m,
    combatTarget: null, stuck: 0, progKey: null, progBest: Infinity, roam: TIER.roam,
    // Quái không nhận hào quang, nhưng vẫn cần hai trường này vì effAttack() dùng chung.
    auraUntil: 0, auraMult: 1,
    carry: { type: null, amount: 0 }, fleeTimer: 0,
    // Ba trường sao chép TỪ SPEC xuống cá thể thay vì tra spec mỗi lần dùng: cả
    // ba nằm trên đường đi nóng nhất (tryStep gọi vài trăm nghìn lần mỗi giây),
    // và quan trọng hơn — quái của SÓNG thủ thành cũng phải có đúng các trường
    // này, nên để chúng ở cá thể thì hai đường sinh quái dùng chung một luật.
    fly: !!spec.fly, range: spec.range || 0, minRange: spec.minRange || 0,
    splash: spec.splash || 0, venom: spec.venom || null, aura: spec.aura || null,
    // --- Phase 3.22 --- năm động từ mới, cùng một luật sao-chép-xuống-cá-thể như
    // sáu trường trên: đường đi nóng đọc `u.xxx`, không tra `spec` lại mỗi tick.
    split: spec.split || null, splitGen: 0,
    ambush: spec.ambush || null, buried: !!spec.ambush, burstUntil: 0, rehideAt: 0,
    slow: spec.slow || null, heal: spec.heal || null, siege: spec.siege || 0,
    raidTribe: -1, raidUntil: 0,
    rx: 0, ry: 0, flash: 0
  };
  u.rx = u.x; u.ry = u.y;
  units.push(u);
  return u;
}

// PHÂN ĐÔI — gọi từ onMonsterDeath, tức là sau khi máu đã về 0 nhưng TRƯỚC lượt
// lọc xác ở cuối simulationTick. Con mới được đẩy thẳng vào `units` trong lúc
// vòng for-of đang chạy trên chính mảng đó; chúng có hp > 0 nên vòng lặp gặp lại
// là bỏ qua ngay, và `units.filter` ngay sau đó giữ chúng lại. An toàn, nhưng chỉ
// vì cả hai điều kiện ấy cùng đúng — đổi thứ tự hai khối kia là mất con.
//
// splitGen chặn ở đời 1. Không có nó thì mỗi con là một cây nhị phân vô hạn: một
// con Nhớt sinh 2, hai con sinh 4... trần quân số của hang KHÔNG chặn được vì
// tickLair chỉ đếm khi ĐỊNH nhả con mới, còn phân đôi thì không đi qua cửa đó.
function splitMonster(u, spec) {
  const S = spec.split;
  for (let i = 0; i < S.count; i++) {
    const c = spawnMonster({ id: -1, x: u.x, y: u.y, tier: 1, spawnedTotal: 0 }, u.mType);
    c.lairId = u.lairId; c.lairX = u.lairX; c.lairY = u.lairY; c.roam = u.roam;
    c.splitGen = u.splitGen + 1;
    c.split = null;                       // đời con KHÔNG tách nữa
    // Nhân từ chỉ số THẬT CỦA CHA, không từ bảng gốc. spawnMonster vừa dựng con
    // này bằng một cái hang giả cấp 1 (statMult 1,0), nên nếu lấy chỉ số nó tự
    // tính thì một con Nhớt của Tổ Quỷ sẽ đẻ ra hai con yếu hơn đáng lẽ 35% —
    // sai lặng lẽ, và chỉ lộ ra ở đúng cái hang hiếm gặp nhất bản đồ.
    c.maxHp = Math.max(1, Math.round(u.maxHp * S.scale));
    c.hp = c.maxHp;
    c.attack = u.attack * (S.scale + 0.25);   // nhỏ đi thì yếu đi, nhưng không tỉ lệ thẳng
    c.threat = u.threat * S.scale;
    c.scale = S.scale;                    // hình vẽ đọc lại đúng con số này
    // Toả ra hai bên chứ không chồng lên nhau: hai con sinh ra ở đúng một ô thì
    // mắt đọc thành MỘT con, và cả cơ chế phân đôi trở nên vô hình.
    const a = (i / S.count) * Math.PI * 2 + u.id;
    c.x = clamp(u.x + Math.round(Math.cos(a) * 2), 0, CONFIG.GRID_WIDTH - 1);
    c.y = clamp(u.y + Math.round(Math.sin(a) * 2), 0, CONFIG.GRID_HEIGHT - 1);
    c.rx = c.x; c.ry = c.y;
    // Thừa hưởng nhiệm vụ đang dở. Một con Nhớt đang đi cướp mà chết giữa làng
    // người ta, hai con nhỏ lại quay đầu về hang thì cơ chế đọc ra là "nó biến
    // mất", không phải "nó nhân đôi".
    c.assault = u.assault; c.raidTribe = u.raidTribe; c.raidUntil = u.raidUntil;
  }
  addFx({ type: 'boom', x: u.x, y: u.y, life: 16, maxLife: 16, r: 1.6 });
}

// HỒI MÁU quanh Thầy Mo. Khuôn y hệt applyLordAura (quét bucket, lệch pha theo
// id) và cùng lý do không gộp chung: thân hàm khác nhau đúng một dòng, nhưng đó
// là dòng nằm trong vòng lặp trên từng phần tử của từng bucket.
//
// KHÔNG hồi cho chính nó. Nếu tự hồi thì một Thầy Mo đứng một mình gần như bất
// tử trước cung thủ (2,4 máu mỗi 10 tick so với 6 sát thương mỗi 15 tick), và
// "vá máu cho đồng đội" biến thành "một con quái tự hồi máu" — mất hẳn cái quyết
// định thứ tự mục tiêu vốn là toàn bộ lý do loài này tồn tại.
function applyMonsterHeal(u) {
  const R = u.heal.r;
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((u.x - R) / B), x1 = Math.floor((u.x + R) / B);
  const y0 = Math.floor((u.y - R) / B), y1 = Math.floor((u.y + R) / B);
  let healed = 0;
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o === u || o.type !== 'monster' || o.hp <= 0 || o.hp >= o.maxHp) continue;
        if (dist(o.x, o.y, u.x, u.y) > R) continue;
        o.hp = Math.min(o.maxHp, o.hp + u.heal.amount);
        o.healedAt = tick;               // hình vẽ đọc con số này để nháy quầng xanh
        healed++;
      }
    }
  }
  // Chỉ báo hiệu khi THẬT SỰ vá được ai đó. Một Thầy Mo đứng một mình mà vẫn phát
  // sáng đều đặn thì người xem học sai luật: họ sẽ tưởng đó là hào quang buff.
  if (healed) u.chantAt = tick;
}

function tickLair(lair) {
  if (lair.hp <= 0) return;
  const TIER = lairTierSpec(lair);
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
  if (lair.tier >= M.RAID.MIN_TIER && TIER.raidEvery > 0) {
    if (++lair.raidTimer >= TIER.raidEvery) { lair.raidTimer = 0; launchRaid(lair); }
  }

  // --- nhả quái thường ---
  lair.timer++;
  if (lair.timer < TIER.interval) return;
  lair.timer = 0;
  let alive = 0;
  for (const u of units) {
    if (u.type === 'monster' && u.lairId === lair.id && u.hp > 0 && u.mType !== 'lord') alive++;
  }
  if (alive >= TIER.cap) return;
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
  logEvent(TL('🩸 {n} quái vật rời hang đi cướp {tribe}!', { n: raiders.length, tribe: t.name }), '#b783cc', lair.tier >= 3);
  addHotspot(lair.x, lair.y, 9, TL('Quái rời hang đi cướp'));
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

// SĂN NGƯỜI SỐNG SÓT — bậc CUỐI của thang mục tiêu, và bậc duy nhất không hỏi
// "công trình nào".
//
// Đo được (thủ thành, seed 7, tick 20.000): ba bộ lạc diệt vong, bộ lạc thứ tư
// còn đúng một người dân và KHÔNG còn một toà nhà nào. Kết quả: 391 con quái còn
// sống, **0 con có mục tiêu**, `waveTargetTribe = -1`, và kỷ nguyên chạy tới hết
// giờ. Người xem nhìn ra màn hình thấy đúng một câu: "quái vật không tấn công
// được". Nguyên nhân không nằm ở đường đi mà nằm ở CÂU HỎI: mọi bậc trong thang
// mục tiêu của quái đều hỏi "công trình nào gần nhất", nên khi bản đồ không còn
// công trình nào thì cả thang trả lời null và 391 con quái không có việc gì làm.
//
// Đây đúng họ lỗi "một cơ chế viết đúng nhưng không bao giờ chạy" đọc theo chiều
// ngược: cơ chế chạy đúng, nhưng nó không có bậc nào cho một trạng thái mà ván
// chơi hoàn toàn có thể rơi vào.
//
// Quét tuyến tính `units` chứ không dùng findNearestEnemyUnit: hàm đó đi theo ô
// lưới không gian, và với tầm 9999 thì vòng lặp ô của nó duyệt hàng trăm nghìn ô
// rỗng — đắt hơn hẳn một lượt quét 400 phần tử. Nhớ mục tiêu và chỉ dò lại mỗi 24
// tick, lệch pha theo id.
function huntSurvivors(u) {
  if (!u.huntTarget || u.huntTarget.hp <= 0 || (tick + u.id) % 24 === 0) {
    let best = null, bestD = Infinity;
    for (const o of units) {
      if (o.tribeId < 0 || o.hp <= 0) continue;
      const d = dist(u.x, u.y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    u.huntTarget = best;
  }
  const h = u.huntTarget;
  if (!h) return null;
  if (cheb(u.x, u.y, h.x, h.y) <= (u.range > 0 ? u.range : 1)) return h;
  if (u.speed > 0) moveToward(u, h.x, h.y);
  return null;
}

function tickMonster(u) {
  if (u.cooldown > 0) u.cooldown--;
  // Quái đục tường bằng ĐÚNG hệ số phá nhà của chúng (MONSTER.BUILD_DMG, không bị
  // BUILD_PENALTY của bộ binh) — xem dealDamage. Đó là chỗ tường thành trả lời
  // được câu hỏi của chế độ thủ thành: một đợt sóng không còn tràn thẳng vào giữa
  // làng nữa, nó phải dừng lại ở vành ngoài và ăn đạn tháp canh trong lúc đục.
  bashWall(u);
  // Cùng một cửa tính tốc độ với đơn vị bộ lạc (xem tickSpeed), và tickSpeed tự
  // biết bỏ qua đường cái cho `tribeId < 0` — luật "quái không hưởng đường" nằm
  // đúng MỘT chỗ thay vì được nhớ ở mỗi chỗ gọi.
  //
  // Thể lực của quái là 900 ô (Thiên Ma 4.000): gấp gần bảy lần một người lính,
  // nên trong gần hết các tình huống nó vô hình. Nó chỉ hiện ra ở đúng cảnh mà
  // người xem cũng thấy vô lý — một con sói đuổi một người dân vòng quanh bản đồ
  // tới hết kỷ nguyên. Giờ cả hai cùng đuối, và kẻ có sức chứa lớn hơn thắng.
  u.speed = tickSpeed(u, u.speedMult);
  if (u.aura && (tick + u.id) % 4 === 0) applyLordAura(u);
  if (u.heal && (tick + u.id) % u.heal.every === 0) applyMonsterHeal(u);

  // PHỤC KÍCH — nằm im dưới đất. Đặt TRƯỚC cả dây xích về hang: một con đang vùi
  // thì không di chuyển, không tìm mục tiêu, và không tồn tại với mắt ai cả.
  if (u.ambush && u.buried) {
    const prey = findNearestEnemyUnit(u.x, u.y, -1, u.ambush.r);
    if (!prey) return;
    u.buried = false;
    u.burstUntil = tick + 12;                 // đòn đầu tiên trong quãng này được nhân
    u.rehideAt = tick + u.ambush.rehide;
    u.combatTarget = prey;
    addFx({ type: 'boom', x: u.x, y: u.y, life: 14, maxLife: 14, r: 1.4 });
  }

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
        } else {
          target = huntSurvivors(u);
          if (!target) { u.combatTarget = null; return; }
        }
      } else if (!field) {
        // Trường chưa kịp tính (bộ lạc mới, hoặc vừa mất sạch nhà): đi tham lam.
        const b = findNearestBuildingInRange(u.x, u.y, 9999);
        if (b) {
          if (u.speed > 0) moveToward(u, b.x, b.y);
          u.combatTarget = null;
          return;
        }
        target = huntSurvivors(u);
        if (!target) { u.combatTarget = null; return; }
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
        else if (!b) target = huntSurvivors(u);
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
    // VÙI LẠI. Không có nhánh này thì phục kích là một cơ chế dùng ĐÚNG MỘT LẦN
    // trong cả đời con quái: trồi lên, đánh xong, rồi đứng phơi giữa đồng như một
    // con sói chậm. Cơ chế chỉ tồn tại nếu nó lặp lại được.
    if (u.ambush && !u.buried && tick > u.rehideAt) {
      u.buried = true;
      addFx({ type: 'spark', x: u.x, y: u.y, life: 10, maxLife: 10, color: '#c98f4a' });
      return;
    }
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
      // ĐÒN PHỤC KÍCH — nhân đúng MỘT lần rồi đóng cửa ngay tại đây, không đợi
      // đồng hồ `burstUntil` hết hạn. Nếu chỉ dựa vào đồng hồ thì một con Rết Cát
      // đánh nhanh (cd 14) vẫn kịp hai đòn nhân trong 12 tick ở vài nhịp tốc độ,
      // và "cú đầu tiên" âm thầm thành "cú đầu tiên hoặc hai".
      const burst = u.burstUntil > tick;
      if (burst) u.burstUntil = 0;
      const opts = burst ? { mult: u.ambush.mult } : undefined;
      if (u.range > 0) rangedStrike(u, target, isBuilding);
      else dealDamage(u, target, isBuilding, opts);
      // Nọc độc bám vào NGƯỜI, không bám vào tường. Áp sau đòn đánh chứ không
      // trong dealDamage: dealDamage là cửa chung của cả bốn phe, nhét trạng thái
      // riêng của một loài quái vào đó thì mọi cú đánh trong game phải trả tiền
      // cho một nhánh if mà 99% trường hợp là false.
      if (u.venom && !isBuilding && target.hp > 0) {
        target.venomUntil = tick + u.venom.ticks;
        target.venomDps = u.venom.dps;
      }
      // LÀM CHẬM — cùng chỗ, cùng lý do, cùng luật "không bám vào tường".
      if (u.slow && !isBuilding && target.hp > 0) {
        target.slowUntil = tick + u.slow.ticks;
        target.slowMult = u.slow.mult;
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
  // PHÂN ĐÔI đọc `u.split` (bản sao trên cá thể) chứ không đọc `spec.split`: đời
  // con được gán `split = null` để chặn tách vô hạn, mà bảng spec thì cả cha lẫn
  // con dùng chung — tra vào đó là mọi đời đều tách được.
  if (u.split) splitMonster(u, spec);
  // THIÊN MA. Trao kho báu ở ĐÂY chứ không ở nhánh `hp <= 0` của dealDamage, và
  // bản đầu đã làm ngược lại rồi phải sửa vì một phép đo: 3 ván thả boss thì 2 ván
  // nó chết mà KHÔNG ai nhận được gì. Lý do là dealDamage KHÔNG phải cửa duy nhất
  // mà mọi cái chết đi qua — tickDefender (tháp canh) trừ thẳng vào máu, và một
  // con quái hành quân tới tận kinh đô thì kẻ ra đòn cuối rất thường là cái tháp.
  // onMonsterDeath thì đúng là cửa duy nhất, và nó chỉ chạy MỘT lần mỗi cái chết
  // (lượt lọc xác cuối tick) nên cũng không cần cờ chống trao hai lần.
  if (u.worldBoss) onWorldBossSlain(u, u.lastHitTribe);
  if (spec.boss) {
    // Đồng hồ hồi sinh đếm từ lúc trùm CHẾT, ghi lên chính cái hang. Nếu để hang
    // tự dò "có trùm chưa" mà không có đồng hồ thì tick ngay sau cái chết nó gọi
    // con mới ra liền — giết trùm sẽ chẳng đổi được gì trong đúng một tick, và
    // cả chiến dịch đi đánh Tổ Quỷ không có phần thưởng nào cả.
    const l = u.lairId >= 0 ? lairs.find(x => x.id === u.lairId) : null;
    if (l) l.lordDeadAt = tick;
    logEvent(TL('⚔️ CHÚA HANG đã bị hạ gục!'), '#e07a56', true);
    addHotspot(u.x, u.y, 12, TL('Chúa Hang gục ngã'));
  }
  if (Math.random() > spec.drop) return;
  const table = MONSTER_DROPS[u.mType];
  // THIÊN MA rơi Thánh vật ở CẤP CAO NHẤT, không phải cấp 1 như mọi con khác. Đây
  // là con đường duy nhất trong game tới một món cấp III mà không phải nung bốn món
  // cấp 1 lại — và nó phải là một con đường riêng, vì hợp nhất đòi anh hùng sống đủ
  // lâu để nhặt trúng bốn món trùng khoá, thứ mà đo được là gần như không xảy ra
  // (xem phân bố số món trong hòm ở CONFIG.ITEM). Trước bản này con quái đắt nhất
  // mà Chúa Tể mua được rơi ra đúng cùng một món với một con sói.
  dropItem(u.x, u.y, table[Math.floor(Math.random() * table.length)],
           u.worldBoss ? CONFIG.ITEM.MAX_LEVEL : 1);
}

function onLairDestroyed(lair, attacker) {
  lair.hp = 0;
  addFx({ type: 'boom', x: lair.x, y: lair.y, life: 30, maxLife: 30, r: 4 });
  addHotspot(lair.x, lair.y, 8, TL('Hang ổ bị phá'));
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
  // Đọc lại tên bậc LÚC VẼ chứ không chụp một chuỗi ở đây: dòng nhật ký sống lâu
  // hơn khoảnh khắc nó được ghi, và `lairTierSpec(...).name` là nhãn dữ liệu bị vá
  // theo ngôn ngữ. Chụp lại thì đổi ngôn ngữ để lại "destroyed a TỔ QUỶ lair".
  const tname = () => lairTierSpec(lair).name.toUpperCase();
  logEvent(who ? TL('🏆 {tribe} phá huỷ một {tier} quái vật', { tribe: who.name, tier: tname })
                : TL('🏆 Một {tier} quái vật bị phá huỷ', { tier: tname }),
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
      logEvent(TL('⚗ {hero} hợp nhất hai {from} thành {to}', { hero: u.name,
             from: () => spec.label + (lv > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[lv] : ''),
             to: () => spec.label + ' ' + CONFIG.ITEM.LEVEL_TAG[twin.lv] }), t.color, true);
      addFx({ type: 'spark', x: u.x, y: u.y, life: 24, maxLife: 24, color: spec.color });
      return;
    }

    // 2. Không trùng mà hòm ĐẦY -> nung một cặp có sẵn để lấy chỗ. Thứ tự nung
    //    TRƯỚC, nhặt SAU là bắt buộc: đảo lại thì hòm tràn một ngăn ở giữa hai bước.
    if (u.items.length >= CONFIG.ITEM.MAX_HELD) {
      const fused = fuseHeldItems(u);
      if (!fused) return;                // không nung được: bỏ qua, để món nằm đó
      const fs = CONFIG.ITEM.TYPES[fused.key];
      logEvent(TL('⚗ {hero} hợp nhất hai {from} thành {to}', { hero: u.name, from: () => fs.label,
             to: () => fs.label + ' ' + CONFIG.ITEM.LEVEL_TAG[fused.lv] }), t.color, true);
      addFx({ type: 'spark', x: u.x, y: u.y, life: 22, maxLife: 22, color: fs.color });
    }
    groundItems.splice(i, 1);
    u.items.push({ key: it.key, lv });
    recomputeHeroStats(u);
    const tag = lv > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[lv] : '';
    logEvent(TL('{icon} {hero} nhặt được {item}', { icon: spec.icon, hero: u.name, item: () => spec.label + tag }), t.color);
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
  if (alive.length) return alive.slice().sort((a, b) => tribeScore(b) - tribeScore(a))[0].id;
  // KHÔNG AI CÒN CÔNG TRÌNH thì nhắm bộ lạc còn NGƯỜI. Bậc này sinh ra từ một ván
  // đo được: tick 20.000, ba bộ lạc đã diệt vong, bộ lạc thứ tư còn đúng MỘT người
  // dân và không còn một toà nhà nào — 391 con quái đứng đầy bản đồ với 0 con có
  // mục tiêu, và kỷ nguyên chạy tới hết giờ. Cả hệ thống sóng chỉ biết hỏi "nhà ai
  // đáng đánh nhất", nên khi câu trả lời là "không nhà nào" thì nó trả lời -1 và
  // mọi thứ phía sau đứng lại. Xem huntSurvivors cho nửa còn lại của bản sửa.
  const left = tribes.filter(t => t.alive && units.some(u => u.tribeId === t.id && u.hp > 0));
  return left.length ? left[0].id : -1;
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
  //
  // RẾT CÁT cố tình KHÔNG có trong bảng này, và đó là quyết định thiết kế chứ
  // không phải bỏ sót. Động từ của nó là nằm im chờ người đi qua; một con quái
  // của sóng thì luôn có đích hành quân, nên nó sẽ không bao giờ vùi lại và cả
  // loài rút gọn thành "một con bọ đánh mạnh". Tệ hơn: nếu để nó sinh ra ở trạng
  // thái vùi thì nó đứng nguyên tại điểm tập kết tới hết kỷ nguyên — mỗi con là
  // một suất của đợt sóng bốc hơi lặng lẽ. Loài không hợp với một chế độ thì để
  // nó ở ngoài, đừng cắt tiết nó cho vừa.
  const pLord    = wave >= 10 ? 0.035 : 0;                 // trùm: hiếm, và chỉ ở cuối
  const pEnt     = clamp((wave - 8) / 16, 0, 0.085);
  const pWyvern  = clamp((wave - 6) / 14, 0, 0.12);
  const pTroll   = clamp((wave - 4) / 12, 0, 0.17);
  const pShaman  = clamp((wave - 3) / 10, 0, 0.085);
  const pWisp    = clamp((wave - 2) / 10, 0, 0.105);
  const pSerpent = clamp((wave - 1) / 9,  0, 0.10);
  const pBear    = clamp((wave - 1) / 8,  0, 0.13);
  const pSlime   = 0.075;                                  // có mặt ngay từ đợt 1
  const pSpider  = 0.07;
  // Tổng ở đợt cao là ~0,975, nên Sói vẫn còn một khe ~2,5%. Cộng dồn quá 1 thì
  // mọi loài ở CUỐI danh sách lặng lẽ biến mất — bảng cũ (tổng 1,095) đã đúng như
  // thế, và không có gì trên màn hình nói cho ai biết cả.
  const r = Math.random();
  let acc = pLord;                if (r < acc) return 'lord';
  acc += pEnt;                    if (r < acc) return 'ent';
  acc += pWyvern;                 if (r < acc) return 'wyvern';
  acc += pTroll;                  if (r < acc) return 'troll';
  acc += pShaman;                 if (r < acc) return 'shaman';
  acc += pWisp;                   if (r < acc) return 'wisp';
  acc += pSerpent;                if (r < acc) return 'serpent';
  acc += pBear;                   if (r < acc) return 'bear';
  acc += pSlime;                  if (r < acc) return 'slime';
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
  // Mốc chia mũi kéo sớm lại: 6/12/(không có) -> 4/9/15. Đây là nửa còn lại của
  // bản sửa "tụ quân giờ đã dễ", và nó khác hẳn về BẢN CHẤT với việc cộng thêm máu:
  // một đạo quân gom về một chỗ vẫn đỡ được mọi thứ đi tới chỗ đó, dù đông tới đâu.
  // Chia mũi buộc bên thủ phải CHỌN bỏ hướng nào — mà "phải chọn" mới là thứ làm
  // nên độ khó. Đo được: qua 18 đợt bên thủ chỉ mất 7 công trình, tức là gần như
  // không có con quái nào chạm được vào phần kinh tế.
  const fronts = wave >= 15 ? 4 : wave >= 9 ? 3 : wave >= 4 ? 2 : 1;
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

// Số quái của đợt tới. Tách ra khỏi spawnWave vì nó có HAI vế và vế thứ hai đọc
// trạng thái bên thủ — xem khối PRESSURE trong CONFIG.DEFEND.
//
// Người gọi phải chọn `waveTargetTribe` TRƯỚC khi gọi hàm này, và đó không phải
// một chi tiết sắp xếp: bản cũ chọn mục tiêu ở CUỐI spawnWave, nên đọc thẳng vào
// đây sẽ lấy quân số của bộ lạc bị đánh ở đợt TRƯỚC — một đợt cân theo sức của
// người khác. Đúng họ lỗi "ảnh chụp thay cho tham chiếu sống" đã cắn ở camera đạo
// diễn và ở flow field; lần này bắt được lúc viết chứ không lúc chơi.
// `stats` có thể còn null trong vài tick đầu kỷ nguyên (bộ não chưa chạy lần nào)
// — khi ấy sàn bằng 0 và chỉ còn nền tuyến tính, đúng như bản cũ.
function waveCount(wave) {
  const D = CONFIG.DEFEND;
  const base = D.BASE_COUNT + Math.floor(wave * D.COUNT_GROWTH);
  const t = waveTargetTribe >= 0 ? tribes[waveTargetTribe] : null;
  const army = t && t.alive && t.stats ? t.stats.soldiers : 0;
  const P = D.PRESSURE;
  const rate = Math.min(P.MAX, P.START + wave * P.PER_WAVE);
  return Math.max(base, Math.round(army * rate));
}

function spawnWave() {
  const D = CONFIG.DEFEND;
  waveNumber++;
  // Chọn mục tiêu Ở ĐÂY, trước cả khi biết đợt này đông bao nhiêu — vì chính quân
  // số của kẻ bị nhắm quyết định con số đó (xem waveCount). Trước bản này dòng
  // chọn mục tiêu nằm ở cuối hàm, ngay trên computeMonsterField.
  waveTargetTribe = pickWaveTarget();
  const count = waveCount(waveNumber);
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
      maxStam: 0, stam: 0, stamX: undefined, stamY: undefined,   // thể lực — xem tickStamina
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
      // Bốn động từ của 3.22 mà sóng thủ thành CÓ dùng. `ambush` không nằm ở đây
      // (xem rollWaveMonsterType), và `buried: false` được ghi tường minh chứ
      // không bỏ trống: đây là bản sao chép tay thứ hai của cùng một cấu trúc đơn
      // vị, và mọi trường bỏ quên ở một trong hai bản đều là một cơ chế chỉ chạy
      // ở nửa số chế độ chơi — đúng loại lỗi mà chú thích ngay trên đầu hàm chọn
      // loài đã phải viết ra để nhắc.
      split: spec.split || null, splitGen: 0,
      ambush: null, buried: false, burstUntil: 0, rehideAt: 0,
      slow: spec.slow || null, heal: spec.heal || null, siege: spec.siege || 0,
      // raidTribe = -1 -> tickMonster hiểu đây là quái của SÓNG và dùng
      // monsterField toàn cục, không phải homeField của một bộ lạc cụ thể.
      raidTribe: -1, raidUntil: 0,
      rx: 0, ry: 0, flash: 0
    };
    u.rx = u.x; u.ry = u.y;
    units.push(u);
    spawned++;
  }

  // Trường dẫn đường tính SAU khi đàn đã đứng trên bản đồ, để cả đợt vừa sinh ra
  // đã có chung đích. Mục tiêu thì đã chốt từ đầu hàm (xem waveCount).
  computeMonsterField();
  // Nhịp rút dần theo số đợt — xem khối INTERVAL_TIGHTEN trong CONFIG.DEFEND.
  nextWaveTick = tick + Math.max(D.INTERVAL_MIN, D.WAVE_INTERVAL - waveNumber * D.INTERVAL_TIGHTEN);
  const victim = waveTargetTribe >= 0 ? tribes[waveTargetTribe] : null;
  logEvent(victim
    ? TL('🌊 ĐỢT {wave} — {n} quái vật tràn vào {tribe} từ {dirs} hướng!', { wave: waveNumber, n: spawned, tribe: victim.name, dirs: staging.length })
    : TL('🌊 ĐỢT {wave} — {n} quái vật tràn tới!', { wave: waveNumber, n: spawned }), '#b783cc', true);
  // Điểm nóng ngay tại chỗ tập kết để camera đạo diễn cắt sang xem đàn quái đổ bộ.
  // Weight đặt cao hẳn vì đây là biến cố lớn nhất của chế độ này.
  for (const st of staging) addHotspot(st.x, st.y, 14, TL('Đợt {wave} đổ bộ', { wave: waveNumber }));
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
  // TẦM và SỨC ĐÁNH nhân theo tầng tháp — hai trong ba chỉ số của TOWER_STACK
  // (cái thứ ba, máu, đã nằm trong buildingMaxHp). Đọc từ `b.level` mỗi lần bắn
  // chứ không nướng vào toà nhà lúc xây xong, đúng cùng lý do đã viết ở effAttack:
  // một cái tháp lên tầng giữa lúc đang bắn phải đổi ngay, không đợi xây lại.
  const stack = b.type === 'tower' ? towerStackMult(b.level) : 1;
  const range = spec.range * stack;
  const enemy = findNearestEnemyHero(b.x, b.y, b.tribeId, range)
             || findNearestEnemyUnit(b.x, b.y, b.tribeId, range);
  if (!enemy) return;
  // Mũi tên của tháp cũng bị GIÁP chặn, y như đòn của quân. Nếu bỏ qua giáp ở
  // đây thì công trình phòng thủ trở thành đường duy nhất trong game không bị luật
  // giáp chi phối — và kỵ sĩ giáp 4, thứ được thiết kế để lao vào chỗ nguy hiểm
  // nhất, sẽ bị chính cái nó khắc chế được đốn hạ y như một người lính trần.
  // HỆ SỐ THÁP THEO THỜI ĐẠI (Phase 3.35) — chỉ tháp canh, KHÔNG kinh đô.
  // Yêu cầu nói "chòi", và ranh giới đó có nghĩa: kinh đô bắn trả là thứ giữ cho
  // công thành là một chiến dịch chứ không phải vài người lính gõ cửa (xem chú
  // thích đầu hàm này). Hạ cả hai thì cái vế đó cũng đổ theo, mà nó không nằm
  // trong điều đang cần sửa.
  // `towerAgeMult` — CÙNG hàm mà bảng giá đọc (xem buildCost). Đó là ràng buộc của
  // cả cơ chế: giá một cái tháp luôn đúng bằng tỉ lệ sức mạnh nó đang có, và cách
  // duy nhất giữ được điều đó là hai chỗ gọi chung một hàm.
  const ageAtk = b.type === 'tower' ? towerAgeMult(tribe.age) : 1;
  // NỎ LIÊN CHÂU (Phase 3.38) — sát thương +20%/cấp, và SỐ MŨI TÊN. Đọc từ bảng bộ
  // lạc mỗi phát bắn, cùng lý do đã viết ba dòng trên cho `b.level`: một nhánh
  // nghiên cứu xong giữa lúc tháp đang bắn phải ăn ngay, không đợi xây lại.
  const vb = (b.type === 'tower' && tribe.towerBonus) ? tribe.towerBonus : null;
  const raw = spec.attack * stack * ageAtk * CONFIG.AGE.BONUS[tribe.age].atk * (1 + (vb ? vb.atk : 0));
  // HAI MỤC TIÊU KHÁC NHAU, không phải hai phát vào cùng một người. Hai mũi vào một
  // đầu là một phép nhân sát thương — thứ đã có sẵn ở `tatk`, và cộng hai lần cùng
  // một hiệu ứng thì bảng cân bằng nói dối. Hai mũi vào hai đầu đổi thứ khác hẳn:
  // tháp canh lần đầu tiên GHÌM ĐƯỢC một đội hình thay vì gặm từng người, và trên
  // màn hình nó đọc ra ngay — hai vệt tên toả ra hai hướng từ một nóc tháp. Cùng
  // thước đo đã dùng cho mũi tiến công ở chân tường: người xem phải thấy được luật
  // chơi mà không cần một dòng chữ nào.
  const shots = 1 + (vb ? vb.shots : 0);
  const hit = [enemy];
  for (let k = 1; k < shots; k++) {
    // Mục tiêu thứ hai tìm bằng CHÍNH hai hàm của phát thứ nhất, chỉ loại kẻ đã
    // trúng. Không viết một vòng quét riêng: hai chỗ cùng tả "địch gần nhất trong
    // tầm" là đúng họ lỗi hai-nguồn-sự-thật, và ở đây hậu quả sẽ là mũi tên thứ hai
    // bay theo một luật ngắm khác mũi thứ nhất.
    // `false` ở khe `soldiersOnly` là BẮT BUỘC phải viết ra, không được bỏ trống:
    // `skip` là tham số thứ SÁU của findNearestEnemyUnit. Truyền `hit` vào khe thứ
    // năm thì nó thành một mảng truthy, và mũi tên thứ hai lặng lẽ ngừng bắn dân
    // thường — một luật chơi khác, không một dòng lỗi nào.
    const nx = findNearestEnemyHero(b.x, b.y, b.tribeId, range, hit)
            || findNearestEnemyUnit(b.x, b.y, b.tribeId, range, false, hit);
    if (!nx) break;
    hit.push(nx);
  }
  for (const e of hit) {
    e.hp -= Math.max(raw * CONFIG.UNIT.ARMOR_FLOOR, raw - effDefense(e));
    // AI VỪA CHẠM VÀO NÓ. Dòng này tồn tại vì tháp canh là đường sát thương DUY
    // NHẤT trong game không đi qua `dealDamage` — nó trừ thẳng vào máu ở ngay trên.
    // Mọi thứ dựa vào "cửa duy nhất mà mọi cái chết đi qua" vì thế đều có một lỗ
    // đúng ở đây, và kho báu Thiên Ma là thứ đầu tiên rơi vào lỗ đó: đo 3 ván thì
    // 2 ván con boss chết mà KHÔNG bộ lạc nào nhận được gì, vì kẻ ra đòn cuối là
    // một cái tháp. Ghi lại người chạm cuối cùng ngay tại đây rẻ hơn nhiều so với
    // việc bắt tickDefender đi vòng qua dealDamage (nó cố ý không đi vòng: mũi tên
    // tháp có luật giáp riêng và không có hồi chiêu của đơn vị).
    //
    // Nằm TRONG vòng lặp, không nằm sau nó: với nỏ liên châu, mũi tên thứ hai có
    // thể là cú kết liễu — và ghi công cho một mình mục tiêu thứ nhất là dựng lại
    // đúng cái lỗ vừa mô tả, chỉ hẹp hơn một nửa.
    e.lastHitTribe = b.tribeId;
    // Tháp bắn MŨI TÊN bay có thời gian bay, không phải tia sáng tức thời — đây là
    // hiệu ứng dễ đọc nhất trên bản đồ: nhìn hướng tên là biết ai đang thủ ai. Một
    // vệt cho MỖI mũi: đó là toàn bộ cách người xem nhận ra một cái tháp đã lên
    // liên châu, và nếu chỉ vẽ một vệt thì nhánh nghiên cứu đắt nhất bảng trở thành
    // một con số trong bảng chỉ số — đúng lý do nhánh Ngựa chiến đã bị xoá.
    addFx({ type: 'arrow', x1: b.x, y1: b.y, x2: e.x, y2: e.y, life: 9, maxLife: 9, color: tribe.color });
    addFx({ type: 'spark', x: e.x, y: e.y, life: 7, maxLife: 7, color: '#e07a56' });
    if (e.hp <= 0) { tribe.kills++; if (e.tribeId >= 0) tribes[e.tribeId].losses++; }
  }
  b.cooldown = spec.cooldown;
  addHotspot(enemy.x, enemy.y, 1.5, b.type === 'town' ? TL('Kinh đô cố thủ') : TL('Tháp canh khai hoả'));
}

