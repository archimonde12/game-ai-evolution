'use strict';
// ============================================================
// 05-entities.js
// ------------------------------------------------------------
// startEra dựng thế giới mới; bảng loại đơn vị/nơi ra lò; hệ nâng cấp 5 nhánh;
// sinh và huỷ đơn vị/công trình.
// Tách cơ học từ civilization.html một-file, dòng 2825–3323.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Khởi tạo kỷ nguyên
// ============================================================
function startEra(policies) {
  tick = 0;
  units = [];
  buildings = [];
  fx = [];
  ruins = [];
  lairs = [];
  groundItems = [];
  hotspots = [];
  waveNumber = 0;
  nextWaveTick = CONFIG.DEFEND.FIRST_WAVE_AT;
  waveTargetTribe = -1;
  wonderWatch = null;
  wonderWinnerTribe = -1;
  monsterField = null;
  monsterFieldTick = -99999;
  territoryOwner = null;
  selected = null;
  eraState = 'playing';
  eraBannerFrames = 0;
  lastWarSpot = null;
  history.ticks.length = 0;
  for (let i = 0; i < 4; i++) { history.pop[i].length = 0; history.food[i].length = 0; }

  generateMap();

  // 4 điểm xuất phát ở 4 góc phần tư — cách đều nhau để không ai bị kẹp ngay từ đầu.
  const quadrants = [
    { x: 0.22, y: 0.25 }, { x: 0.78, y: 0.25 },
    { x: 0.22, y: 0.75 }, { x: 0.78, y: 0.75 }
  ];
  const spots = quadrants.map(q => ({
    x: clamp(Math.round(q.x * CONFIG.GRID_WIDTH + randRange(-8, 8)), 10, CONFIG.GRID_WIDTH - 11),
    y: clamp(Math.round(q.y * CONFIG.GRID_HEIGHT + randRange(-8, 8)), 10, CONFIG.GRID_HEIGHT - 11)
  }));
  for (const s of spots) clearArea(s.x, s.y, 7);
  spawnLairs(spots);

  // Tên dòng dõi anh hùng bốc KHÔNG LẶP cho 4 bộ lạc. Bốc độc lập thì hai bộ lạc
  // hoàn toàn có thể cùng ra "Thương Lang đời 1" (đã gặp khi chạy thử) — mà tên
  // riêng tồn tại chỉ để người xem phân biệt được nhân vật, trùng tên là hỏng đúng
  // cái công dụng duy nhất của nó.
  const dynastyPool = HERO_DYNASTIES.slice();
  for (let i = dynastyPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dynastyPool[i], dynastyPool[j]] = [dynastyPool[j], dynastyPool[i]];
  }

  tribes = [];
  for (let i = 0; i < CONFIG.TRIBE_COUNT; i++) {
    const tpl = TRIBE_TEMPLATES[i];
    const hx = spots[i].x, hy = spots[i].y;

    const tribe = {
      id: i,
      name: tpl.name,
      color: tpl.color,
      dark: tpl.dark,
      policy: policies[i],
      lineage: policies[i].__lineage || 'khởi tổ',
      res: { food: CONFIG.START.food, wood: CONFIG.START.wood, gold: CONFIG.START.gold, stone: CONFIG.START.stone },
      age: 1,
      alive: true,
      home: { x: hx, y: hy },
      kills: 0,
      losses: 0,
      peakPop: 0,
      warTarget: null,
      trainQueue: emptyTrainCounter(),
      trainTimer: emptyTrainCounter(),
      // Nâng cấp quân sự — cấp hiện tại của từng nhánh, và nhánh đang nghiên cứu.
      // `upBonus` là bảng cộng dồn ĐÃ TÍNH SẴN theo loại quân (xem rebuildUpBonus):
      // effAttack/effDefense chạy hàng chục nghìn lần mỗi giây, không thể để chúng
      // duyệt qua 5 nhánh × mảng `applies` mỗi lần.
      upgrades: emptyUpgrades(),
      upBonus: null,       // rebuildUpBonus() điền ngay bên dưới
      research: null,      // { line, until, paid } — mỗi bộ lạc chỉ một nhánh một lúc
      jobCounts: { food: 0, wood: 0, gold: 0, stone: 0 },
      stats: null,
      // Cả hai được computeTribeStats/computeArmyLine điền lại mỗi nhịp bộ não.
      // Khởi tạo tường minh ở đây chứ không để `undefined`: seekMedic đọc
      // `tribe.medics.length` ngay từ tick đầu, trước khi bộ não kịp chạy lần nào.
      medics: [],
      // Trường dẫn đường về CỨU NHÀ. Chỉ tồn tại khi có báo động trọng yếu; xem
      // marchToDefend để biết vì sao nó không thể dùng chung với homeField.
      defendField: null,
      defendFieldId: -1,
      defendFieldTick: -99999,
      armyLine: -1,
      nextFormSlot: 0,   // cấp số thứ tự chỗ đứng trong hàng cho quân mới ra lò
      starving: false,
      diedAtTick: 0,
      ageUpAt: [],        // tick lên từng thời đại — dùng cho thẻ tổng kết kỷ nguyên
      // Đồng hồ HOẠT HÌNH (aTick, 60 khung ảo/giây) của đợt "trùng tu" khi vừa lên
      // thời đại. Cố tình KHÔNG dùng `tick`: ở 600 tick/s một hiệu ứng dài 46 tick
      // chỉ sống 0,08 giây — tức là biến mất đúng ở tốc độ mà người xem dễ bỏ lỡ
      // biến cố nhất. Đo bằng aTick thì nó luôn dài đúng ngần ấy phần giây THẬT.
      ageFlashAt: 0,
      ageFlashEnd: 0,
      wonderStarted: false,
      // Thờ cúng
      piety: 0,           // điểm thành tâm tích luỹ trong kỷ nguyên này
      offers: 0,          // số lần đã dâng tế
      lastOfferTick: 0,
      // 0 chứ không phải -9999: lời khẩn cầu đầu tiên phải chờ trọn một chu kỳ.
      // Với -9999 thì cửa mở sẵn từ tick 0 và cả bốn bộ lạc cùng cầu xin trong
      // những giây đầu lập quốc — trước cả khi có gì đáng để cầu.
      lastPrayerTick: 0,
      prayer: null,       // { kind, born, until } — lời khẩn cầu đang chờ Chúa Tể đáp
      blessUntil: 0,      // hạn dùng của phước lành đang có
      blessKind: null,
      blessMult: 1,
      // Dòng dõi anh hùng: vòng tiến hoá NHANH, chạy trọn vẹn bên trong một kỷ
      // nguyên. `best` là tổ tiên có điểm cao nhất từng có — đời kế tiếp luôn
      // đột biến từ `best` chứ không từ người vừa chết (leo đồi có tinh hoa).
      // Không giữ `best` thì một đời xui xẻo chết sớm sẽ xoá sạch tiến bộ đã có.
      heroLine: {
        dynasty: dynastyPool[i],
        gen: 0,
        genes: policies[i].__heroSeed ? mutateHeroGenes(policies[i].__heroSeed) : randomHeroGenes(),
        best: null,
        history: [],       // [{gen, genes, fitness, lifespan, kills, razed}]
        braveTrend: []     // chỉ gen dũng cảm, để vẽ biểu đồ cho gọn
      },
      heroCooldownUntil: 0,
      // Thánh vật được đưa về đền khi anh hùng chết TRÊN ĐẤT NHÀ. Khác đồ nghề
      // thường (mất theo người chết), thánh vật là di sản của CẢ nền văn minh: cất ở
      // đây rồi trao cho người kế nhiệm khi chiêu mộ. Trần bằng số món giữ tối đa.
      enshrinedRelics: []
    };
    delete tribe.policy.__lineage;
    delete tribe.policy.__heroSeed;
    rebuildUpBonus(tribe);
    tribes.push(tribe);

    const town = spawnBuilding(tribe, 'town', hx, hy, true);
    tribe.rally = { x: town.x, y: town.y + 4 };
    // Cờ tập kết GỐC, cất sẵn để trả về sau khi hết phải giữ Kỳ quan (xem tribeBrain).
    tribe.baseRally = null;

    for (let v = 0; v < CONFIG.START.villagers; v++) {
      spawnUnit(tribe, 'villager', hx + Math.round(randRange(-3, 3)), hy + Math.round(randRange(-3, 3)));
    }
  }

  computeTerritory();
  camX = (CONFIG.GRID_WIDTH - CONFIG.VIEWPORT_WIDTH) / 2;
  camY = (CONFIG.GRID_HEIGHT - CONFIG.VIEWPORT_HEIGHT) / 2;
  clampCamera();

  mapToasts = [];
  logEvent(`Kỷ nguyên ${era} — bốn bộ lạc lập quốc`, '#d8a544', true);
}

// Tra chỉ số gốc theo type. MỘT chỗ duy nhất — trước bản này chỗ này là một chuỗi
// ba nhánh tam nguyên, và thêm loại quân thứ tư vào một chuỗi như thế thì loại mới
// sẽ lặng lẽ rơi vào nhánh mặc định (dân thường) thay vì báo lỗi.
const UNIT_SPEC = {
  villager: 'VILLAGER', soldier: 'SOLDIER', hero: 'HERO', archer: 'ARCHER', catapult: 'CATAPULT',
  knight: 'KNIGHT', horsearcher: 'HORSEARCHER'
};
function unitSpec(type) { return CONFIG.UNIT[UNIT_SPEC[type]] || CONFIG.UNIT.VILLAGER; }

// "Quân sự" = mọi thứ cầm vũ khí và ăn lương lính. Dùng ở đếm dân, tính nuôi quân,
// tính sức mạnh, và ở mọi chỗ trước đây viết `u.type === 'soldier'`.
//
// Tra BẢNG chứ không nối thêm `||` vào chuỗi so sánh cũ: hàm này nằm trên đường
// đi nóng (mỗi hào quang, mỗi lần đếm dân) và quan trọng hơn — thêm loại quân thứ
// sáu vào một chuỗi bốn nhánh `===` là đúng cái kiểu lỗi mà chú thích UNIT_SPEC ở
// trên đã cảnh báo: quên một nhánh thì loại mới lặng lẽ bị tính là dân thường.
const MILITARY_TYPES = ['soldier', 'archer', 'catapult', 'knight', 'horsearcher'];
const MILITARY_SET = { soldier: 1, archer: 1, catapult: 1, knight: 1, horsearcher: 1 };
function isMilitary(type) { return MILITARY_SET[type] === 1; }
// Kỵ binh — dùng ở vẽ hình, ở nâng cấp "Mã thuật", và ở bảng quân của bộ lạc.
const CAVALRY_SET = { knight: 1, horsearcher: 1 };
function isCavalry(type) { return CAVALRY_SET[type] === 1; }

// Loại quân nào ra lò từ công trình nào. Bảng này chính là lý do Xưởng thợ và
// Chuồng ngựa đáng tồn tại: lên thời đại chỉ MỞ KHOÁ cung thủ/kỵ binh, còn muốn
// có chúng thật thì vẫn phải bỏ tài nguyên và hàng trăm tick ra dựng nhà.
const TRAIN_SOURCE = {
  villager: 'town', soldier: 'barracks', hero: 'barracks',
  archer: 'workshop', catapult: 'workshop',
  knight: 'stable', horsearcher: 'stable'
};
// Mọi loại có thể nằm trong hàng đợi huấn luyện. MỘT mảng duy nhất, dùng ở khởi
// tạo bộ lạc, ở vòng huấn luyện, và ở chỗ đếm quân đang trong lò — ba chỗ mà bản
// cũ viết tay ba danh sách riêng, và một loại quân mới phải nhớ sửa cả ba.
const TRAINABLE_TYPES = ['villager', 'soldier', 'hero', 'archer', 'catapult', 'knight', 'horsearcher'];
function emptyTrainCounter() {
  const o = {};
  for (const t of TRAINABLE_TYPES) o[t] = 0;
  return o;
}

// ============================================================
// NÂNG CẤP — bộ máy
// ============================================================
const UPGRADE_LINES = Object.keys(CONFIG.UPGRADE.LINES);
function emptyUpgrades() {
  const o = {};
  for (const k of UPGRADE_LINES) o[k] = 0;
  return o;
}

// Giá của CẤP KẾ TIẾP. Nhân bảng giá gốc với hệ số leo theo cấp, làm tròn để
// bảng hiển thị không ra "127,4999 vàng".
function upgradeCost(line, nextLevel) {
  const L = CONFIG.UPGRADE.LINES[line];
  const step = CONFIG.UPGRADE.COST_STEP[nextLevel - 1] || 1;
  const c = {};
  for (const k in L.cost) c[k] = Math.round(L.cost[k] * step);
  return c;
}

// Gộp 5 nhánh × cấp thành MỘT bảng {loại quân -> {atk, def, hp}}, tính lại đúng
// một lần mỗi khi có nhánh nghiên cứu xong.
//
// Vì sao phải có bước gộp này thay vì để effAttack tự cộng: effAttack chạy trên
// mỗi đòn đánh của mỗi đơn vị của bốn bộ lạc — ở tốc độ tua thì đó là hàng trăm
// nghìn lần mỗi giây. Duyệt 5 nhánh và tìm kiếm trong mảng `applies` ở đó là biến
// một phép tra bảng thành một vòng lặp lồng nhau, và đây đúng là kiểu chi phí đã
// từng làm tụt khung hình ở Phase 3.3 (vòng lặp thử lại của dân thường).
function rebuildUpBonus(tribe) {
  const out = {};
  for (const t of TRAINABLE_TYPES) out[t] = { atk: 0, def: 0, hp: 0 };
  for (const line of UPGRADE_LINES) {
    const lv = tribe.upgrades[line];
    if (!lv) continue;
    const L = CONFIG.UPGRADE.LINES[line];
    for (const type of L.applies) {
      const o = out[type];
      if (!o) continue;                        // loại quân đã bị xoá khỏi game
      o.atk += (L.atk || 0) * lv;
      o.def += (L.def || 0) * lv;
      o.hp  += (L.hp  || 0) * lv;
    }
  }
  tribe.upBonus = out;
}

// Có ít nhất một công trình loại này ĐÃ XÂY XONG và còn đứng.
//
// KHÔNG dùng s.bcount: nó đếm cả công trình đang xây dở (nó sinh ra để trả lời
// "đã đặt móng chưa", dùng cho quyết định có xây thêm nữa không). Cùng cái bẫy đã
// bắt được ở tickWorship, nhưng ở đây hậu quả nặng hơn hẳn: tribeBrain sẽ TRẢ
// TIỀN để bắt đầu nghiên cứu tại một cái trại lính mới đặt móng, rồi tickResearch
// ở tick kế tiếp không tìm thấy công trình nào `done` và huỷ luôn nhánh đó —
// tài nguyên bốc hơi, và cứ 20 tick một lần lại bốc hơi tiếp.
function hasDoneBuilding(tribe, type) {
  for (const b of buildings) {
    if (b.tribeId === tribe.id && b.type === type && b.hp > 0 && b.done) return true;
  }
  return false;
}

// Nhánh này đã lên trần chưa / có đủ điều kiện để bắt đầu nghiên cứu chưa.
function upgradeAvailable(tribe, line) {
  const L = CONFIG.UPGRADE.LINES[line];
  if (tribe.upgrades[line] >= CONFIG.UPGRADE.MAX_LEVEL) return false;
  if (tribe.age < L.age) return false;
  return hasDoneBuilding(tribe, L.build);
}

function startResearch(tribe, line) {
  const next = tribe.upgrades[line] + 1;
  const cost = upgradeCost(line, next);
  if (!canAfford(tribe, cost)) return false;
  pay(tribe, cost);
  tribe.research = { line, until: tick + CONFIG.UPGRADE.TICKS[next], level: next };
  const L = CONFIG.UPGRADE.LINES[line];
  logEvent(`${L.icon} ${tribe.name} bắt đầu nghiên cứu ${L.label} cấp ${next}`, tribe.color);
  return true;
}

// Chạy mỗi tick cho từng bộ lạc còn sống. Hai phép so sánh rồi thoát khi không
// nghiên cứu gì — cùng khuôn với tickWorship.
function tickResearch(tribe) {
  const r = tribe.research;
  if (!r) return;
  const L = CONFIG.UPGRADE.LINES[r.line];
  // Công trình chủ quản bị san phẳng giữa chừng -> mất trắng. Cùng luật với hàng
  // đợi tuyển quân (xem tribeBrain), và cùng lý do: tài nguyên đã trả trước cho
  // một cơ sở không còn tồn tại. Khác một điểm — chỗ này CÓ dòng nhật ký, vì mất
  // một nhánh nghiên cứu là biến cố hiếm và đáng để người xem biết vì sao bảng
  // nâng cấp của bộ lạc đó bỗng đứng im.
  const hasBuild = buildings.some(b => b.tribeId === tribe.id && b.type === L.build && b.hp > 0 && b.done);
  if (!hasBuild) {
    tribe.research = null;
    logEvent(`✖ ${tribe.name} mất ${L.label} cấp ${r.level} — ${CONFIG.BUILD[L.build].label} bị phá`, tribe.color);
    return;
  }
  if (tick < r.until) return;
  tribe.research = null;
  applyUpgrade(tribe, r.line, r.level);
}

function applyUpgrade(tribe, line, level) {
  tribe.upgrades[line] = level;
  rebuildUpBonus(tribe);
  const L = CONFIG.UPGRADE.LINES[line];
  // Anh hùng phải được TÍNH LẠI, không chỉ được cộng vào bảng. Máu tối đa và tốc
  // độ của anh hùng không đi qua effAttack/effDefense — chúng là những con số cứng
  // trên cá thể (u.maxHp, u.speedMult), sinh ra từ gen + vật phẩm. Bỏ khối này thì
  // "Binh thư" cộng sát thương và giáp bình thường nhưng phần +55 máu lặng lẽ vô hiệu.
  //
  // Điều kiện là "nhánh này có chạm tới anh hùng không", KHÔNG phải "nhánh này có
  // cộng máu không": bản đầu viết `if (L.hp)` và nó đúng cho tới đúng lúc nhánh
  // Ngựa chiến ra đời — một nhánh chạm anh hùng qua `speed` chứ không qua `hp`.
  // Nhánh đó nay đã bị bỏ (ngựa gắn vào thời đại, xem CONFIG.HERO.MOUNT_AGE),
  // nhưng điều kiện thì giữ nguyên dạng tổng quát: nó đúng cho mọi nhánh sau này.
  if (L.applies.indexOf('hero') >= 0) {
    for (const u of units) {
      if (u.tribeId === tribe.id && u.type === 'hero' && u.hp > 0) recomputeHeroStats(u);
    }
  }
  logEvent(`${L.icon} ${tribe.name} hoàn thành ${L.label} cấp ${level}`, tribe.color, true);
  addHotspot(tribe.home.x, tribe.home.y, 3, `${tribe.name}: ${L.label} ${level}`);
}

function spawnUnit(tribe, type, x, y) {
  const base = unitSpec(type);
  const bonus = CONFIG.AGE.BONUS[tribe.age];
  const maxHp = Math.round(base.hp * bonus.hp);
  const u = {
    id: nextId++, tribeId: tribe.id, type,
    x: clamp(Math.round(x), 0, CONFIG.GRID_WIDTH - 1),
    y: clamp(Math.round(y), 0, CONFIG.GRID_HEIGHT - 1),
    hp: maxHp, maxHp,
    attack: base.attack * bonus.atk,
    // GIÁP KHÔNG nhân theo thời đại, và đây là một lựa chọn thiết kế chứ không
    // phải một chỗ quên. Thời đại là trục "quân mới tốt hơn quân cũ"; nâng cấp là
    // trục "cả đạo quân tốt lên cùng lúc". Nếu giáp cũng leo theo thời đại thì hai
    // trục chồng lên nhau và người xem không đọc được cái nào đang có tác dụng.
    // Giáp chỉ đến từ hai nguồn: bảng chỉ số gốc, và nhánh nghiên cứu "Giáp trụ".
    defense: base.defense || 0,
    gatherMult: bonus.gather,
    speed: base.speed,
    // Tốc độ PHÂN SỐ: chỉ kỵ binh có (và anh hùng, theo đường riêng của nó). Đơn
    // vị nào không khai báo thì speedMult = 0 và cả khối tín dụng ở tickSoldier bị
    // bỏ qua — không đơn vị nào phải trả giá cho một cơ chế nó không dùng.
    speedMult: base.speedMult || 0,
    speedCredit: 0,
    facingX: 1, facingY: 0,
    cooldown: 0,
    born: tick,
    // dân thường
    job: null, task: 'idle', resTarget: null, buildTarget: null, depot: null,
    carry: { type: null, amount: 0 }, fleeTimer: 0, stuck: 0, progKey: null, progBest: Infinity, avoid: [], searchBackoff: 0,
    // lính
    combatTarget: null, lungeUntil: 0, swingAt: 0, chaseBlockedUntil: 0,
    // tầm xa: 0 = cận chiến. minRange = cự ly mà quân tầm xa thấy quá gần và LÙI RA.
    // Không có nó, cung thủ sẽ đứng dí sát mặt đối phương và mọi lợi thế tầm bắn
    // biến mất — nhìn ra màn hình thì y hệt bộ binh, chỉ là bộ binh yếu hơn.
    range: base.range || 0,
    minRange: base.minRange || 0,
    splash: base.splash || 0,
    atkCooldown: base.cooldown || CONFIG.UNIT.ATTACK_COOLDOWN,
    // được hào quang chỉ huy của anh hùng buff (mọi đơn vị đều có thể nhận)
    auraUntil: 0, auraMult: 1,
    // Chỗ đứng CỐ ĐỊNH trong hàng (xem formationSpot). Cấp một lần lúc sinh ra và
    // không bao giờ đổi — nếu tính lại theo chỉ số trong mảng `units` thì mỗi lần
    // một người chết là cả đạo quân đổi chỗ đứng cùng lúc, và đội hình sẽ xáo trộn
    // đúng vào lúc nó cần đứng yên nhất.
    formSlot: tribe.nextFormSlot++,
    mending: false,     // đang trên đường về trạm xá / đang nằm viện
    // Toạ độ VẼ (float). Mô phỏng không bao giờ đọc hai trường này; chúng chỉ
    // trượt mềm về phía (x, y) mỗi frame để mắt thấy đường đi liên tục.
    rx: 0, ry: 0, flash: 0
  };
  u.rx = u.x; u.ry = u.y;

  if (type === 'hero') {
    const line = tribe.heroLine;
    line.gen++;
    const g = line.genes;
    u.genes = g;
    u.heroGen = line.gen;
    u.name = `${line.dynasty} đời ${line.gen}`;
    // Giữ lại hệ số thời đại lúc SINH RA: quân sinh sau khi lên thời đại mới có
    // chỉ số mới, quân cũ giữ chỉ số cũ (luật chung của game) — mà anh hùng phải
    // tính lại chỉ số mỗi lần nhặt đồ, nên cần nhớ hệ số của chính mình.
    u.ageBonus = bonus;
    u.items = [];
    // Thừa hưởng thánh vật đã được đưa về đền. Đây là ngoại lệ CÓ CHỦ Ý của luật
    // "vật phẩm không di truyền": đồ nghề cá nhân thì mất theo người, nhưng THÁNH VẬT
    // là của cả nền văn minh — nó chờ ở đền và được trao cho người kế nhiệm. Lấy tối
    // đa MAX_HELD, phần dư (hiếm) vẫn nằm ở đền cho đời sau nữa.
    if (tribe.enshrinedRelics.length) {
      const take = tribe.enshrinedRelics.splice(0, CONFIG.ITEM.MAX_HELD);
      for (const r of take) u.items.push({ key: r.key, lv: r.lv || 1 });
      logEvent(`💎 ${u.name} thừa kế ${take.length} thánh vật từ đền ${tribe.name}`, tribe.color, true);
    }
    u.itemSeekId = null;
    u.itemBestD = Infinity;
    u.itemStuck = 0;
    u.itemGiveUpUntil = 0;
    recomputeHeroStats(u);
    u.hp = u.maxHp;
    // Tốc độ phân số trên một lưới nguyên: moveToward/stepDownField dùng u.speed
    // làm SỐ BƯỚC mỗi tick, nên muốn 1.35 ô/tick thì phải cộng dồn tín dụng rồi
    // rút ra phần nguyên mỗi tick. Không làm vậy thì speed chỉ có thể là 1 hoặc 2
    // — tức là gen `vigor` sẽ chẳng ảnh hưởng gì tới tốc độ trong hầu hết dải giá trị.
    u.speedCredit = 0;
    u.speed = 1;
    u.heroKills = 0;
    u.heroRazed = 0;
    u.retreating = false;
    // Đồng hồ của trạng thái rút lui: `retreatSince` để biết đã lui bao lâu (hết
    // MAX_RETREAT thì ép ra trận), `retreatBlockUntil` là quãng cấm lui ngay sau
    // một lần bị ép ra — không có nó thì tick kế tiếp điều kiện vào lại vẫn đúng
    // y nguyên và "đường bỏ cuộc" không đổi được gì cả.
    u.retreatSince = tick;
    u.retreatBlockUntil = 0;
    logEvent(`⚔ ${tribe.name} chiêu mộ anh hùng ${u.name}`, tribe.color, true);
    addHotspot(u.x, u.y, 3, `Anh hùng ${u.name} xuất thế`);
  }

  units.push(u);
  return u;
}

function spawnBuilding(tribe, type, x, y, instant) {
  const spec = CONFIG.BUILD[type];
  const b = {
    id: nextId++, tribeId: tribe.id, type,
    x: clamp(Math.round(x), 1, CONFIG.GRID_WIDTH - 2),
    y: clamp(Math.round(y), 1, CONFIG.GRID_HEIGHT - 2),
    size: spec.size,
    hp: instant ? spec.hp : Math.round(spec.hp * 0.25),
    maxHp: spec.hp,
    done: !!instant,
    progress: instant ? spec.buildTicks : 0,
    buildTicks: spec.buildTicks,
    cooldown: 0,
    // Lần cuối toà nhà này ăn đòn. Đóng dấu trong dealDamage — cửa duy nhất mọi
    // sát thương đi qua — và đọc bởi alarmedBuildings(). Số âm lớn chứ không phải
    // 0: ở tick 0 mọi công trình sẽ được coi là "vừa bị đánh" và cả bốn bộ lạc
    // đứng dồn vào sân nhà ngay từ giây lập quốc.
    hitTick: -99999,
    farmCells: []
  };
  buildings.push(b);
  if (instant) onBuildingComplete(b, tribe);
  return b;
}

function onBuildingComplete(b, tribe) {
  b.done = true;
  b.hp = b.maxHp;
  if (b.type === 'farm') {
    // Ruộng = vài ô "thức ăn" tái tạo nhanh quanh công trình. Dùng lại NGUYÊN
    // đường ống thu hoạch của bụi quả, không cần logic riêng cho ruộng.
    const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [2, 0], [-2, 0], [0, -2]];
    for (const [dx, dy] of offsets) {
      if (b.farmCells.length >= CONFIG.FARM.CELLS) break;
      const c = addResource(b.x + dx, b.y + dy, 'food', CONFIG.FARM.AMOUNT, { regrow: CONFIG.FARM.REGROW, farmOf: b.id });
      if (c) b.farmCells.push(c);
    }
  }
  if (b.type === 'wonder') {
    // Đồng hồ đếm ngược bắt đầu chạy TỪ ĐÂY, không phải từ lúc đặt móng. Nếu tính
    // từ lúc đặt móng thì cả 820 tick xây dựng — quãng thời gian toà nhà mong manh
    // nhất và đáng xem nhất — sẽ trôi qua mà không ai có lý do phải phản ứng.
    // Mốc thời gian sống ĐÚNG MỘT CHỖ: trên chính toà nhà. wonderWatch bên dưới chỉ
    // là bản dựng lại mỗi tick từ danh sách công trình đang đứng (xem updateWonderRace).
    // Giữ một bản sao trong biến toàn cục rồi cập nhật bằng tay chính là họ lỗi
    // "snapshot vs live reference" đã cắn ở camera đạo diễn và ở flow field.
    b.wonderDoneAt = tick;
    logEvent(`🏛 ${tribe.name} KHÁNH THÀNH KỲ QUAN! Giữ được ${CONFIG.WONDER.HOLD_TICKS} tick nữa là thống nhất thiên hạ.`, tribe.color, true);
    addHotspot(b.x, b.y, 14, `Kỳ quan của ${tribe.name}`);
  }
}

function destroyBuilding(b) {
  for (const c of b.farmCells) if (resourceCells.has(c.key)) removeResource(c);
  // Kỳ quan sụp -> bộ lạc đó được phép khởi công lại từ đầu. KHÔNG đụng gì tới
  // wonderWatch ở đây: nó được dựng lại từ đầu mỗi tick trong updateWonderRace, nên
  // toà nhà biến mất khỏi `buildings` là đủ để đồng hồ của nó biến mất theo. Hai bộ
  // lạc hoàn toàn có thể cùng đang đếm ngược, và cách này xử lý đúng mà không cần
  // một dòng nào cho trường hợp đó.
  if (b.type === 'wonder') {
    if (tribes[b.tribeId]) {
      tribes[b.tribeId].wonderStarted = false;
      if (b.done) logEvent(`🏛 KỲ QUAN của ${tribes[b.tribeId].name} ĐỔ NÁT — đồng hồ dừng lại.`, '#d05a44', true);
      else logEvent(`${tribes[b.tribeId].name} bị phá Kỳ quan khi còn dang dở`, '#d05a44');
    }
  }
  if (b.hp <= 0 || b.done) {
    ruins.push({ x: b.x, y: b.y, size: b.size, color: tribes[b.tribeId].dark, born: tick });
    if (ruins.length > 120) ruins.shift();
    addFx({ type: 'boom', x: b.x, y: b.y, life: 26, maxLife: 26, r: b.size });
  }
  b.hp = 0;
}

