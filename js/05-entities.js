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

  // 4 điểm xuất phát ở 4 góc phần tư — cách đều nhau để không ai bị kẹp ngay từ đầu.
  //
  // TÍNH TRƯỚC generateMap, và thứ tự này là cả nội dung của bản sửa chia tài
  // nguyên: bản cũ sinh bản đồ trước rồi mới bốc chỗ đặt kinh đô, nên lúc rải mỏ
  // KHÔNG AI BIẾT bốn bộ lạc sẽ đứng ở đâu — và một cơ chế bảo đảm "mỗi bộ lạc có
  // một mỏ đá gần nhà" là không thể viết ra được. Đảo thứ tự thì generateMap nhận
  // được bốn cái mốc và rải quanh chúng (xem MAP.FAIR).
  const quadrants = [
    { x: 0.22, y: 0.25 }, { x: 0.78, y: 0.25 },
    { x: 0.22, y: 0.75 }, { x: 0.78, y: 0.75 }
  ];
  const spots = quadrants.map(q => ({
    x: clamp(Math.round(q.x * CONFIG.GRID_WIDTH + randRange(-8, 8)), 10, CONFIG.GRID_WIDTH - 11),
    y: clamp(Math.round(q.y * CONFIG.GRID_HEIGHT + randRange(-8, 8)), 10, CONFIG.GRID_HEIGHT - 11)
  }));

  generateMap(spots);

  // Bán kính đọc từ CONFIG (MAP.CLEAR_R = 16, trước là 7 viết cứng), và clearArea
  // giờ dọn CẢ BỐN loại tài nguyên chứ không chỉ chặt cây — xem chú thích ở đó.
  for (const s of spots) clearArea(s.x, s.y, CONFIG.MAP.CLEAR_R);
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
      // CHIẾN CÔNG — sổ riêng của việc PHÁ NHÀ NGƯỜI, tách hẳn khỏi `kills` (giết
      // quân) và `losses` (mất của mình). Cần một sổ riêng vì từ bản này nó là
      // ĐIỀU KIỆN MỞ KHOÁ Kỳ quan (xem WONDER.NEED_TOWNS), chứ không còn là một
      // con số chỉ để khoe trên bảng điểm: `kills` cộng cả mạng quái vật, nên một
      // bộ lạc chưa từng chạm vào bộ lạc nào khác vẫn có thể có 400 `kills`.
      razed: 0,        // công trình của bộ lạc KHÁC do mình san phẳng
      townsRazed: 0,   // trong đó, bao nhiêu cái là KINH ĐÔ
      peakPop: 0,
      // Số tick còn lại của đồng hồ MẤT KINH ĐÔ, 0 = đồng hồ không chạy (Phase
      // 3.35). Xem tickCapitalClock để biết vì sao là "còn lại" chứ không phải
      // "mốc bắt đầu".
      capitalLeft: 0,
      warTarget: null,
      // HÀNG ĐỢI = suất đã TRẢ TIỀN nhưng chưa cái lò nào nhận. Đồng hồ đếm giờ
      // thì nằm trên từng CÔNG TRÌNH (b.trainType / b.trainTimer) từ Phase 3.28 —
      // xem vòng huấn luyện trong tickTribeEconomy.
      trainQueue: emptyTrainCounter(),
      // Suất đang nấu, đếm theo loại. KHÔNG được cập nhật bằng tay ở hai đầu
      // (nhận suất / ra lò): một công trình có thể biến mất giữa chừng mà không
      // đi qua destroyBuilding (vòng dọn xác chỉ gọi nó cho ruộng), nên một bộ
      // đếm tự cộng-trừ sẽ trôi dần và không bao giờ về lại 0. Nó được ĐẾM LẠI
      // TỪ ĐẦU mỗi nhịp bộ não trong computeTribeStats, từ chính đám công trình
      // đang đứng — nguồn sự thật duy nhất, không có gì để lệch.
      trainActive: emptyTrainCounter(),
      // QUYỀN LẬP ĐÔ giành được từ những kinh đô địch đã san phẳng (Phase 3.28).
      // Mỗi phần tử {x, y, at, from}; tiêu đi một cái khi dựng được một đô mới.
      claims: [],
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
      // `tribe.infirmaries.length` ngay từ tick đầu, trước khi bộ não kịp chạy lần nào.
      //
      // HAI danh sách, hai nghĩa, và tên cũ (`medics`) đã phải đổi vì nó nhập nhằng
      // đúng chỗ nguy hiểm nhất: `infirmaries` là các CÔNG TRÌNH đã xây xong,
      // `healers` là các ĐƠN VỊ thầy lang còn sống. Bản trước chỉ có cái đầu và gọi
      // nó là `medics`; thêm đơn vị thầy lang vào mà giữ nguyên tên thì mọi dòng
      // `tribe.medics.length` cũ sẽ vẫn chạy, vẫn không báo lỗi, và trả lời sai
      // một câu hỏi khác hẳn câu nó đang được hỏi.
      infirmaries: [],
      healers: [],
      // Hai trường dẫn đường về nhà, hai câu hỏi khác nhau — xem computeHomeField.
      // `homeField` = "công trình gần nhất" (lính về hàng, thầy lang, quái đi cướp).
      // `depotField` = "chỗ trút hàng gần nhất" (chỉ kinh đô + kho). Khởi tạo tường
      // minh null vì tickVillager đọc `tribe.depotField` ngay từ tick đầu, trước khi
      // bộ não kịp chạy lần nào — cùng lý do đã viết cho `infirmaries` ở trên.
      homeField: null,
      depotField: null,
      homeFieldTick: -99999,
      // Trường dẫn đường về CỨU NHÀ. Chỉ tồn tại khi có báo động trọng yếu; xem
      // marchToDefend để biết vì sao nó không thể dùng chung với homeField.
      defendField: null,
      defendFieldId: -1,
      defendFieldTick: -99999,
      armyLine: -1,
      nextFormSlot: 0,   // cấp số thứ tự chỗ đứng trong hàng cho quân mới ra lò
      // ĐƯỜNG CÁI: tuyến đang lát dở + tổng số ô đã lát (dùng cho trần ROAD.MAX_CELLS).
      // Đếm riêng thay vì đếm lại `roadCells` mỗi nhịp bộ não: bảng đó là bảng CHUNG
      // của cả bản đồ, nên lọc theo tribeId là một vòng quét toàn bộ mạng đường cho
      // mỗi bộ lạc mỗi 20 tick — trong khi con số này chỉ tăng đúng ở một chỗ.
      roadPlan: null,     // { cells: [{x,y}], idx, toId }
      roadCount: 0,
      roadLinked: [],     // id các công trình đã có đường tới — không lát lại lần hai
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
      // ============================================================
      // GIA BẢO — kho đồ chờ người kế nhiệm
      // ============================================================
      // Trước Phase 3.34 kho này tên `enshrinedRelics` và chỉ nhận đúng MỘT loại
      // (Thánh vật), theo một luật ĐỊA LÝ: ngã trên đất nhà thì về đền, ngã trên đất
      // địch thì rơi tại chỗ. Từ bản này luật đổi trục — không còn hỏi NGÃ Ở ĐÂU mà
      // hỏi NGÃ VÌ SAO (xem onHeroDeath) — và kho nhận MỌI loại đồ, nên cái tên cũ
      // đã thành một lời nói dối: một đôi giày nằm trong "enshrinedRelics" thì mọi
      // chỗ đọc nó sẽ tự suy ra một luật không còn tồn tại.
      // Trần bằng số món giữ tối đa của một anh hùng.
      heirloom: []
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
  knight: 'KNIGHT', horsearcher: 'HORSEARCHER', medic: 'MEDIC',
  ballista: 'BALLISTA', elephant: 'ELEPHANT', standard: 'STANDARD', quarter: 'QUARTER'
};
function unitSpec(type) { return CONFIG.UNIT[UNIT_SPEC[type]] || CONFIG.UNIT.VILLAGER; }

// "Quân sự" = mọi thứ cầm vũ khí và ăn lương lính. Dùng ở đếm dân, tính nuôi quân,
// tính sức mạnh, và ở mọi chỗ trước đây viết `u.type === 'soldier'`.
//
// Tra BẢNG chứ không nối thêm `||` vào chuỗi so sánh cũ: hàm này nằm trên đường
// đi nóng (mỗi hào quang, mỗi lần đếm dân) và quan trọng hơn — thêm loại quân thứ
// sáu vào một chuỗi bốn nhánh `===` là đúng cái kiểu lỗi mà chú thích UNIT_SPEC ở
// trên đã cảnh báo: quên một nhánh thì loại mới lặng lẽ bị tính là dân thường.
// NỎ THẦN và VOI CHIẾN nằm trong MILITARY_SET; QUÂN KỲ thì KHÔNG — nó đi cùng
// Thầy lang xuống isSupport ngay dưới, và vì đúng cái lý do đã viết cho thầy lang:
// ô sát thương của nó bằng 0, nên tính nó là quân sự sẽ làm `power` NÓI DỐI và bộ
// lạc tự thấy mình mạnh thêm mấy suất lính không biết đánh. Lần thứ hai gặp đúng
// hình dạng này trong dự án, và lần này thì bắt trước khi nó xảy ra.
const MILITARY_TYPES = ['soldier', 'archer', 'catapult', 'knight', 'horsearcher', 'ballista', 'elephant'];
const MILITARY_SET = { soldier: 1, archer: 1, catapult: 1, knight: 1, horsearcher: 1, ballista: 1, elephant: 1 };
function isMilitary(type) { return MILITARY_SET[type] === 1; }
// Thầy lang KHÔNG nằm trong MILITARY_SET, và đó là chỗ dễ sai nhất của cả bản này.
// `isMilitary` nuôi ba thứ: tiền nuôi quân, điểm `power` dùng để quyết có dám tuyên
// chiến hay không, và ngưỡng "đủ mạnh chưa". Tính thầy lang là quân sự thì một bộ
// lạc nuôi bốn thầy lang sẽ TỰ THẤY mình mạnh thêm bốn suất lính và đi gây chiến
// với bốn cái ô sát thương bằng không — đúng cái lỗi "power nói dối" đã viết ở
// chú thích máy bắn đá, nhưng theo chiều tệ hơn hẳn vì ở đây sát thương là 0 chứ
// không phải thấp. Nó ăn lương lính (theo người, không theo sức đánh) nên phần
// đó được tính riêng ở tickTribeEconomy.
// ĐỘI HẬU CẦN vào đây chứ không vào MILITARY_SET, đúng cùng lý do đã viết cho thầy
// lang và quân kỳ ngay trên: ô sát thương của nó bằng 0, nên tính nó là quân sự sẽ
// làm `power` NÓI DỐI và bộ lạc tự thấy mình mạnh thêm mấy suất lính không biết đánh.
// Lần thứ BA gặp đúng hình dạng này, và lần này nó được viết cùng lúc với đơn vị.
const SUPPORT_SET = { medic: 1, standard: 1, quarter: 1 };
function isSupport(type) { return SUPPORT_SET[type] === 1; }

// ============================================================
// AI PHẢI MANG QUÂN LƯƠNG (Phase 3.33)
// ============================================================
// Mọi thứ của bộ lạc TRỪ dân thường. Viết thành một hàm chứ không rải
// `type !== 'villager'` ở bốn chỗ: câu trả lời này được hỏi ở spawnUnit (cấp trần),
// ở vòng tick (hao/hồi), ở effAttack (phạt đói) và ở hình vẽ (vạch đói) — bốn chỗ
// mà chỉ cần một chỗ trả lời khác là có một loại quân bất tử trước cơn đói, và
// KHÔNG có gì báo lỗi cả. Cùng đúng lý do đã viết cho isSiege.
//
// Quái vật không đi qua hàm này (chúng dựng ở spawnMonster) — và đó là đúng: chúng
// không có tổ quốc để mà rời khỏi.
function needsSupply(type) { return type !== 'villager'; }

// Trần quân lương THẬT của một cá thể. Đọc gen `expedition` của chủ nó — bộ lạc
// viễn chinh cao phát nhiều lương khô hơn cho mỗi người ra khỏi cổng.
//
// Chốt MỘT LẦN lúc sinh ra, không đọc lại mỗi tick: gen policy đứng yên suốt kỷ
// nguyên nên hai cách cho cùng kết quả, nhưng đọc lại mỗi tick là một phép tra
// `tribes[]` cho mỗi đơn vị mỗi tick để nhận về đúng một hằng số — đúng loại chi
// phí "mỗi phần rẻ, nhân lên thì không" đã ghi ở vòng thờ cúng.
function unitMaxSupply(tribe) {
  const p = tribe && tribe.policy;
  const drive = p && p.expedition !== undefined ? p.expedition : 0.4;
  return Math.round(CONFIG.SUPPLY.MAX * (0.7 + drive * 0.6));
}
// Quân kỳ — tra bảng riêng vì hào quang cổ vũ phải tìm được lá cờ gần nhất mỗi tick.
function isStandard(type) { return type === 'standard'; }
// Kỵ binh — dùng ở vẽ hình, ở nâng cấp "Mã thuật", và ở bảng quân của bộ lạc.
const CAVALRY_SET = { knight: 1, horsearcher: 1 };
function isCavalry(type) { return CAVALRY_SET[type] === 1; }

// VŨ KHÍ CÔNG THÀNH — loại được MIỄN hình phạt đập nhà (xem CONFIG.UNIT.BUILD_PENALTY).
//
// Đọc thẳng cờ `siege` trên spec, KHÔNG dựng thêm một bảng tên thứ hai như
// MILITARY_SET/CAVALRY_SET ở trên. Hai bảng đó liệt kê tên vì chúng trả lời câu
// hỏi về CHỦNG LOẠI ("có phải quân sự không", "có phải kỵ binh không") — thứ mà
// bảng chỉ số không nói. Còn "có phá thành được không" thì chính bảng chỉ số phải
// nói, cạnh tầm bắn và sát thương lan, vì nó là một NĂNG LỰC.
//
// Hệ quả cố ý: thêm một loại công thành mới (xe phá thành, máy bắn đá đời sau,
// pháo) chỉ cần một từ `siege: true` trong CONFIG.UNIT — không phải nhớ sửa thêm
// một danh sách nằm ở file khác. Quên danh sách đó thì loại mới lặng lẽ bị phạt
// 80% đúng ở việc mà nó sinh ra để làm, và không có gì báo lỗi cả.
function isSiege(type) { return !!unitSpec(type).siege; }

// Loại quân nào ra lò từ công trình nào. Bảng này chính là lý do Xưởng thợ và
// Chuồng ngựa đáng tồn tại: lên thời đại chỉ MỞ KHOÁ cung thủ/kỵ binh, còn muốn
// có chúng thật thì vẫn phải bỏ tài nguyên và hàng trăm tick ra dựng nhà.
const TRAIN_SOURCE = {
  // Anh hùng dọn từ Trại lính sang TƯỚNG PHỦ ở Phase 3.28 — xem CONFIG.BUILD.heroHall.
  villager: 'town', soldier: 'barracks', hero: 'heroHall',
  archer: 'workshop', catapult: 'workshop', ballista: 'workshop',
  knight: 'stable', horsearcher: 'stable', elephant: 'stable',
  // Quân kỳ ra lò từ TRẠI LÍNH, không phải đền thờ. Đền thờ có vẻ hợp về kể chuyện
  // (cờ xí, nghi lễ) nhưng nó bị khoá sau gen `piety` — mà một bộ lạc thuần chiến
  // tranh, piety thấp, lại đúng là bộ lạc cần lá cờ nhất. Đặt ở đền thờ là dựng lại
  // cái bẫy "ba cổng nhân với nhau" đã phải hạ ngưỡng ba lần để gỡ (chuồng ngựa,
  // trạm xá, đền thờ). Trại lính thì mọi bộ lạc có quân đội đều đã có sẵn.
  standard: 'barracks',
  // Thầy lang ra lò từ chính Nhà y tế. Nhờ vậy công trình này lần đầu có HAI tác
  // dụng đọc được từ ngoài màn hình: một cái giường bệnh đứng yên, và một dòng
  // người áo trắng đi ngược ra tiền tuyến. Phá được trạm xá là cắt cả hai.
  medic: 'infirmary',
  // ĐỘI HẬU CẦN ra lò từ NHÀ CẦU NGUYỆN, không phải Đền thờ — và đây là chỗ tôi cố
  // ý đi lệch khỏi câu chữ của yêu cầu ("mua ở nhà thầy tu") để giữ đúng tinh thần
  // của nó. Hai công trình đều là nhà tu hành, nhưng chúng đứng ở hai chỗ khác hẳn
  // nhau trong cây công nghệ:
  //     Đền thờ         — Đồ Sắt (đời 3) + gen piety > 0,25
  //     Nhà cầu nguyện  — Đồ Đá  (đời 1) + gen piety > 0,125, giá 75 gỗ
  // Đặt ở Đền thờ là dựng lại đúng cái bẫy "hai cái cổng thì xác suất NHÂN chứ không
  // cộng" đã phải trả giá NĂM lần trong dự án này — và ở đây nó còn nặng hơn mọi lần
  // trước, vì cơ chế quân lương chạy từ tick đầu tiên trong khi cách chữa nó lại
  // khoá sau nửa cây công nghệ. Một bộ lạc đói mà không được phép mua hậu cần thì cơ
  // chế mới không phải một lựa chọn, nó là một hình phạt.
  //
  // Đổi lại, Nhà cầu nguyện lần đầu có việc thứ hai để làm: tới nay nó chỉ nhỏ giọt
  // Đức Tin cho người xem. Đúng luật "đừng thêm công trình mới, hãy cho công trình
  // cũ thêm một nghề".
  quarter: 'shrine'
};
// Mọi loại có thể nằm trong hàng đợi huấn luyện. MỘT mảng duy nhất, dùng ở khởi
// tạo bộ lạc, ở vòng huấn luyện, và ở chỗ đếm quân đang trong lò — ba chỗ mà bản
// cũ viết tay ba danh sách riêng, và một loại quân mới phải nhớ sửa cả ba.
const TRAINABLE_TYPES = ['villager', 'soldier', 'hero', 'archer', 'catapult', 'knight', 'horsearcher', 'medic',
                         'ballista', 'elephant', 'standard', 'quarter'];
function emptyTrainCounter() {
  const o = {};
  for (const t of TRAINABLE_TYPES) o[t] = 0;
  return o;
}

// ============================================================
// GIÁ MỘT SUẤT QUÂN, SAU KHI ĐÃ TRẢ BẰNG MỘT CON NGƯỜI (Phase 3.30)
// ============================================================
// Từ bản này mỗi suất quân nuốt một dân thường (xem takeRecruit). Nếu giữ nguyên
// bảng giá cũ thì bộ lạc trả HAI LẦN cho cùng một người: 45 lương để đào tạo anh
// ta thành dân, rồi 55 lương nữa để biến anh ta thành lính. Đo thật 4 ván 12.000
// tick với bảng giá cũ: tổng dân của cả bản đồ 115/123/53/79 so với 238/222/107/213
// — nền văn minh co lại còn một nửa, và hai trên bốn ván không kết thúc nổi trong
// 12.000 tick. Đó không phải cái giá của một lựa chọn, đó là một khoản thu hai lần.
//
// Nên phần LƯƠNG THỰC của giá quân được hoàn phần lớn: con người đã là khoản
// lương thực đó rồi. Phần còn lại của giá — gỗ, vàng, đá — KHÔNG đụng tới, và đó
// chính là chỗ cơ chế mới có nghĩa: giá của một người lính chuyển từ "nuôi một
// miệng ăn" sang "sắm một bộ đồ nghề", còn miệng ăn thì bộ lạc đã nuôi từ trước.
//
// Anh hùng và dân thường không nuốt ai (DRAFT_EXEMPT) nên giá của họ nguyên vẹn.
const DRAFT_FOOD_KEEP = 0.25;
function trainCost(type) {
  const base = unitSpec(type).cost;
  if (!base || !base.food || type === 'villager' || type === 'hero') return base;
  const c = {};
  for (const k in base) c[k] = k === 'food' ? Math.round(base.food * DRAFT_FOOD_KEEP) : base[k];
  return c;
}

// ------------------------------------------------------------------
// BẢNG NGƯỢC: một CÔNG TRÌNH ra được những loại nào — và theo thứ tự nào
// ------------------------------------------------------------------
// Sinh ra từ chính TRAIN_SOURCE thay vì viết tay lần thứ hai: hai bảng nói cùng
// một sự thật thì bảng thứ hai chỉ có một việc duy nhất là lệch đi. Cùng lý do
// đã viết cho TRAINABLE_TYPES ("ba chỗ viết tay ba danh sách riêng").
//
// THỨ TỰ trong mỗi mảng là thứ tự ƯU TIÊN khi một cái lò vừa rảnh và có nhiều
// loại đang xếp hàng: ĐẮT NHẤT (lâu nhất) TRƯỚC. Cùng lý lẽ với thang tuyển quân
// trong tribeBrain — nếu bộ binh 55 tick luôn được nhặt trước, một cỗ voi chiến
// 240 tick sẽ không bao giờ tới lượt ở một bộ lạc đang có chiến tranh, vì hàng
// đợi bộ binh không bao giờ rỗng. Sắp theo `trainTicks` giảm dần thì thứ tự này
// tự đúng mãi mãi, kể cả khi bảng chỉ số đổi.
const TRAIN_BY_SOURCE = (() => {
  const m = {};
  for (const t of TRAINABLE_TYPES) {
    const src = TRAIN_SOURCE[t];
    if (!src) continue;
    (m[src] || (m[src] = [])).push(t);
  }
  for (const k in m) m[k].sort((a, b) => unitSpec(b).trainTicks - unitSpec(a).trainTicks);
  return m;
})();

// Số suất của một loại đang "trong lò" — CỘNG cả hàng đợi chưa ai nhận lẫn suất
// đã có một công trình đang nấu. Từ Phase 3.28 hai con số đó nằm ở hai chỗ khác
// nhau (hàng đợi trên bộ lạc, suất đang nấu trên từng công trình), và mọi quyết
// định tuyển quân đều phải hỏi TỔNG — hỏi thiếu một nửa thì bộ lạc tuyển vượt chỉ
// tiêu đúng bằng số lò nó đang có.
function inOven(tribe, type) {
  return tribe.trainQueue[type] + (tribe.trainActive ? (tribe.trainActive[type] || 0) : 0);
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
  // Y THUẬT đi ĐƯỜNG RIÊNG, không nhét vào bảng `out` ở trên, và đó là một lựa
  // chọn chứ không phải một chỗ lười. Bảng `out` trả lời đúng một câu hỏi — "đơn
  // vị này đánh mạnh và chịu đòn giỏi hơn bao nhiêu" — và nó được đọc trong
  // effAttack/effDefense, tức là trên đường đi nóng nhất của cả mô phỏng. Nhồi
  // thêm bốn trường mà 99% đơn vị không bao giờ dùng vào đúng cái bảng đó là bắt
  // mọi cú đánh của mọi con quái trả tiền cho một cơ chế của thầy lang.
  //
  // Bảng riêng, tra một lần mỗi tick trong tickMedic, và cộng THẲNG vào con số cơ
  // sở ở chỗ dùng. Cùng lý do đã viết ở effAttack: không nướng vào chỉ số của cá
  // thể, để bảng nâng cấp vẫn là NGUỒN SỰ THẬT DUY NHẤT kể cả với thầy lang sinh
  // ra trước khi nghiên cứu xong.
  const M = CONFIG.UPGRADE.LINES.medicine;
  const mlv = tribe.upgrades.medicine || 0;
  tribe.healBonus = {
    lv: mlv,
    rate:  (M.heal  || 0) * mlv,
    heals: (M.heals || 0) * mlv,
    reach: (M.reach || 0) * mlv,
    seek:  (M.seek  || 0) * mlv
  };
  // CÔNG THÀNH đi đường riêng, đúng khuôn Y thuật ngay trên và cùng lý do: ba
  // trường này (splash, range, scale) chỉ có nghĩa với HAI loại quân trong cả bảng,
  // nên nhồi chúng vào `out` là bắt mọi cú đánh của mọi con quái đọc thêm ba ô nhớ
  // mà chúng không bao giờ dùng.
  //
  // `scale` là trường đầu tiên trong dự án đi từ bảng nâng cấp ra tới HÌNH VẼ, và
  // nó phải chảy qua cả spriteBox chứ không chỉ qua hàm vẽ — xem khối chú thích ở
  // CONFIG.UPGRADE.LINES.siege. Ba thứ neo vào ô lưới đã cùng vỡ một lần ở Phase
  // 3.19 khi một sprite tràn ra khỏi ô của nó.
  const S = CONFIG.UPGRADE.LINES.siege;
  const slv = tribe.upgrades.siege || 0;
  tribe.siegeBonus = {
    lv: slv,
    splash: (S.splash || 0) * slv,
    range:  (S.range  || 0) * slv,
    scale:  (S.scale  || 0) * slv
  };
  // QUÂN NHU — đường riêng thứ ba, đúng khuôn Y thuật và Công thành. Ba trường này
  // chỉ có nghĩa với TRẠI TIẾP TẾ (một loại công trình mà phần lớn ván chơi không
  // có cái nào), nên nhồi chúng vào bảng `out` là bắt mọi cú đánh của mọi con quái
  // đọc thêm ba ô nhớ chúng không bao giờ dùng.
  const Q = CONFIG.UPGRADE.LINES.supplyline;
  const qlv = tribe.upgrades.supplyline || 0;
  tribe.supplyBonus = {
    lv: qlv,
    rate:  (Q.rate  || 0) * qlv,
    slots: (Q.slots || 0) * qlv,
    reach: (Q.reach || 0) * qlv
  };
}

// Bán kính / số suất / nhịp hồi THẬT của một trại tiếp tế, sau khi cộng nhánh Quân
// nhu của chủ nó. Cùng khuôn `healerStats`, và cùng lý do phải gom vào một hàm: ba
// con số này luôn phải đọc CÙNG NHAU (nuôi được nhiều người hơn mà bán kính không
// nới thì suất thứ sáu tới thứ mười chỉ nằm trên giấy), nên để chúng ở một chỗ thì
// lần sau thêm một cấp hay thêm một nguồn buff cũng chỉ sửa đúng đây.
//
// Nhánh dự phòng khi `supplyBonus` chưa có: `undefined + số` là NaN, và NaN đã BỐN
// lần im lặng cắn dự án này (biên giới lãnh thổ, điểm chọn nhánh nâng cấp, hào
// quang, thầy lang). Ở đây nó sẽ làm mọi phép so sánh khoảng cách thành false và
// cái trại đứng đó không tiếp tế cho ai — một lỗi không có triệu chứng nào ngoài
// "cơ chế mới hình như không chạy".
function supplyStats(tribe) {
  const C = CONFIG.SUPPLY.CAMP;
  const b = tribe && tribe.supplyBonus;
  const age = (tribe && tribe.age) || 1;
  // TUỔI THỌ leo theo THỜI ĐẠI, ba con số kia leo theo NGHIÊN CỨU. Hai nguồn tiến
  // bộ tách hẳn nhau để người xem đọc được cái nào vừa đổi — xem chú thích ở
  // CONFIG.UPGRADE.LINES.supplyline.
  const ttl = Math.round(C.TTL * (1 + C.TTL_PER_AGE * Math.max(0, age - 2)));
  if (!b) return { lv: 0, rate: C.RATE, slots: C.SLOTS, reach: C.R, ttl };
  return {
    lv: b.lv,
    rate:  C.RATE  + b.rate,
    slots: C.SLOTS + b.slots,
    reach: C.R     + b.reach,
    ttl
  };
}

// Cỗ máy công thành này to/xa/lan tới đâu, sau khi cộng nhánh Công thành của chủ nó.
//
// Đọc bảng của BỘ LẠC chứ không nướng con số vào cá thể lúc sinh ra, đúng cùng lý
// do đã viết ở effAttack và ở healerStats: một cỗ máy ra lò TRƯỚC khi nghiên cứu
// xong vẫn phải hưởng nâng cấp. Nướng vào cá thể thì bảng nâng cấp có hai nguồn sự
// thật, và cỗ máy cũ lặng lẽ giữ chỉ số cũ tới hết đời.
function siegeOf(u) {
  if (!u.splash && !u.pierce) return null;          // không phải máy công thành
  const t = tribes[u.tribeId];
  const b = (t && t.siegeBonus) || { lv: 0, splash: 0, range: 0, scale: 0 };
  return b;
}
function effSplash(u) { const b = siegeOf(u); return u.splash + (b ? b.splash : 0); }
function effRange(u)  { const b = siegeOf(u); return u.range  + (b ? b.range  : 0); }
function effScale(u)  { const b = siegeOf(u); return 1 + (b ? b.scale : 0); }

// Sức chứa dân của MỘT công trình đã xây xong, ở thời đại `age` của chủ nó.
//
// Một hàm chứ không phải `CONFIG.BUILD[t].pop` rải khắp nơi: `pop` vẫn còn đó và
// vẫn đúng cho mọi công trình KHÔNG leo theo thời đại, nên nếu để hai cách đọc
// cùng tồn tại thì chỗ nào quên đổi sẽ lặng lẽ trả về giá trị Đồ Đá mãi mãi — đúng
// họ lỗi "một bảng tra có hai nguồn sự thật" đã cắn ở `medics` vs `infirmaries`.
function buildingPop(type, age) {
  const spec = CONFIG.BUILD[type];
  if (!spec) return 0;
  if (!spec.popByAge) return spec.pop;
  return spec.popByAge[age] !== undefined ? spec.popByAge[age] : spec.pop;
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
  // NỀ ĐÁ chạm vào thứ đã tồn tại từ trước, không phải thứ sắp ra lò — nên nó phải
  // đi ĐƯỜNG RIÊNG, và đây là chỗ khác biệt lớn nhất giữa nó với bảy nhánh kia.
  // Sáu nhánh quân sự chảy qua effAttack/effDefense, tức là chúng được đọc lại ở
  // MỖI đòn đánh và vì thế một người lính sinh ra trước khi nghiên cứu xong vẫn
  // hưởng đủ. Máu công trình thì không có cửa nào như thế: `b.maxHp` là một con số
  // NẰM TRÊN CÁ THỂ, gán một lần lúc đặt móng. Không có dòng này thì nhánh Nề đá
  // chỉ có tác dụng với những toà nhà xây SAU khi nghiên cứu xong — mà bộ lạc đang
  // bị vây, đúng đối tượng nhánh này sinh ra để cứu, thì không xây thêm gì nữa cả.
  if (line === 'masonry') refreshBuildingHp(tribe);
}

// ============================================================
// MÁU CÔNG TRÌNH — MỘT công thức, ba nguồn nhân vào
// ============================================================
// base(loại) × chồng tầng(tháp canh) × nề đá(bộ lạc). Ba nguồn này trước bản này
// nằm ở ba nơi khác nhau hoặc chưa tồn tại; gộp về một hàm vì `maxHp` được đọc ở
// mười mấy chỗ (thanh máu, FINISH_HP_FRAC, tiến độ xây, AI chọn mục tiêu) và mỗi
// chỗ tự nhân lấy là đúng công thức sinh ra lỗi "hai nguồn sự thật" đã cắn ở
// `medics` vs `infirmaries` và ở foodTarget vs wealth.
function masonryMult(tribe) {
  const lv = (tribe && tribe.upgrades) ? (tribe.upgrades.masonry || 0) : 0;
  return 1 + (CONFIG.UPGRADE.LINES.masonry.bhp || 0) * lv;
}

// Hệ số của một cái tháp cấp `level`. MŨ chứ không phải nhân tuyến tính: cấp 3 là
// 1,5² = 2,25 lần, đúng con số đã viết trong chú thích TOWER_STACK. Kẹp sàn 1 để
// một toà nhà cũ chưa có trường `level` (hoặc level 0 do lỗi) không rơi xuống 1/1,5.
function towerStackMult(level) {
  return Math.pow(CONFIG.BUILD.TOWER_STACK.MULT, Math.max(0, (level || 1) - 1));
}

// MÁU THEO THỜI ĐẠI (Phase 3.35). Tra bằng chỉ số KẸP chứ không đọc thẳng
// `T[tribe.age]`: đây đúng là hình dạng đã sinh ra lỗi lãnh thổ NaN ở Phase 3.6 —
// một `undefined` nhân vào máu cho NaN, và một toà nhà máu NaN thì không bao giờ
// chết mà cũng không bao giờ đầy. `tribe` có thể null ở đường gọi của Thư khố.
function ageBuildHp(tribe) {
  const T = CONFIG.AGE.BUILD_HP;
  return T[clamp((tribe && tribe.age) || 1, 1, T.length - 1)];
}

function buildingMaxHp(b, tribe) {
  const spec = CONFIG.BUILD[b.type];
  if (!spec) return b.maxHp;
  const t = tribe || tribes[b.tribeId];
  const stack = b.type === 'tower' ? towerStackMult(b.level) : 1;
  return Math.round(spec.hp * stack * masonryMult(t) * ageBuildHp(t));
}

// Tính lại maxHp cho MỌI công trình và MỌI ô tường của một bộ lạc.
//
// Phần máu tăng thêm được CỘNG THẲNG vào máu hiện tại, không phải chỉ nới trần.
// Nếu chỉ nới trần thì một toà nhà đang đầy máu bỗng nhiên hiện ra là "đã hư hại"
// ngay lúc bộ lạc vừa trả tiền để gia cố nó — người xem đọc ra điều ngược hẳn với
// thứ vừa xảy ra. Cộng thẳng thì nghiên cứu xong = tường dày lên ngay trước mắt.
function refreshBuildingHp(tribe) {
  for (const b of buildings) {
    if (b.tribeId !== tribe.id || b.hp <= 0) continue;
    const nm = buildingMaxHp(b, tribe);
    const d = nm - b.maxHp;
    if (!d) continue;
    b.maxHp = nm;
    if (d > 0) b.hp = Math.min(nm, b.hp + d);
    else b.hp = Math.min(b.hp, nm);
  }
  // TƯỜNG THÀNH KHÔNG CÒN Ở ĐÂY từ Phase 3.30. Nề đá chỉ còn chạm tới thứ có
  // người xây; tường lên bậc theo thời đại và cả vành được dựng lại ở ensureWalls
  // lúc đó, nên nó không cần một đường cập nhật máu thứ hai.
}

// ============================================================
// XÂY CHỒNG THÁP CANH — xem CONFIG.BUILD.TOWER_STACK
// ============================================================
// Một cái tháp đang lên cấp DÙNG LẠI NGUYÊN đường ống công trường: `done = false`
// + `progress = 0` + gán thợ. Không viết một vòng đời thứ hai, và đó là lý do
// chính khiến cơ chế này rẻ: mọi thứ đã có sẵn quanh một công trường — thợ bỏ dở
// thì công trường mồ côi được nhặt lại, nhà bị phá giữa chừng thì tiến độ mất,
// thanh tiến độ vẽ đúng, bảng công trình đếm đúng — đều chạy y nguyên.
//
// HỆ QUẢ CÓ CHỦ Ý: `done = false` nghĩa là tháp NGỪNG BẮN suốt quãng nâng cấp
// (tickDefender bỏ qua nhà chưa xong) và tạm thời KHÔNG tính vào hạn ngạch
// NEED_TOWERS. Đó chính là cái giá đã hứa trong chú thích config — mạnh hơn 50%
// nhưng phải trả bằng một quãng câm lặng, nên xây chồng giữa lúc bị vây là một
// nước đi sai chứ không phải một nút bấm luôn đúng.
//
// KHÔNG hạ máu về 25% như một móng nhà mới. Móng nhà mới mong manh vì nó chưa
// tồn tại; cái tháp này thì đang đứng đó với đầy đủ máu, và làm nó mềm đi trong
// lúc nó vừa ngừng bắn là cộng hai hình phạt cho một quyết định.
// ============================================================
// GIÁ THÁP CANH ĐI THEO ĐÚNG ĐƯỜNG CONG SỨC MẠNH (Phase 3.35, vòng 2)
// ============================================================
// MỘT mảng nuôi cả hai — `AGE.TOWER_ATK`. Không tạo bảng giá thứ hai, và đó là một
// quyết định chứ không phải sự lười: hai mảng cùng tả một đường cong thì chúng SẼ
// lệch nhau, và bài học đó đã phải trả giá hai lần trong cùng MỘT hình vẽ ở Phase
// 3.32 (gai lưng và xương ngón cánh của phi long). Ở đây hậu quả còn lặng lẽ hơn:
// một lần chỉnh cân bằng sức đánh tháp mà quên bảng giá sẽ tạo ra đúng cái nghịch
// lý mà vòng này sinh ra để xoá — một công trình yếu mà đắt.
//
// Ràng buộc đọc thành lời: **giá một cái tháp luôn đúng bằng tỉ lệ sức mạnh mà nó
// đang có.** Đồ Đá 60% sức đánh thì 60% giá; Thiên Triều 100% thì trả đủ. Không thể
// mua rẻ một thứ mạnh, cũng không thể bị bắt trả đủ cho một thứ chưa mạnh.
function towerAgeMult(age) {
  const T = CONFIG.AGE.TOWER_ATK;
  return T[clamp(age || 1, 1, T.length - 1)];
}

// Giá THẬT của một công trình với bộ lạc này, ngay lúc này. Mọi chỗ hỏi giá đều
// phải đi qua đây — `canAfford`, `pay`, đích tích trữ đá của thợ mỏ, và bảng hiển
// thị. Đây chính là hình dạng lỗi `foodTarget` vs `wealth = food/5000` của Phase
// 3.27, đọc theo chiều ngược: một khoản chi mà đích tích trữ tính bằng công thức
// KHÁC thì thợ đá bị gọi về đúng lúc khoản chi sắp tới.
//
// Trả về CHÍNH bảng gốc (không sao chép) với mọi loại trừ tháp: hàm này chạy trong
// vòng quyết định của bộ não, và dựng một object mới cho mười ba loại công trình
// mỗi nhịp là một khoản phí không mua được gì.
function buildCost(tribe, type) {
  const base = CONFIG.BUILD[type].cost;
  if (type !== 'tower') return base;
  const m = towerAgeMult(tribe && tribe.age);
  const c = {};
  for (const k in base) c[k] = Math.round(base[k] * m);
  return c;
}

// Giá xây CHỒNG một tầng nữa. Hai hệ số NHÂN nhau: bậc thời đại (tháp đời sau đắt
// hơn) và bậc tầng (1,7^lv). Nhân chứ không cộng vì chúng tả hai chuyện độc lập —
// "cái tháp này thuộc thời nào" và "nó đã cao mấy tầng" — và một cái tháp ba tầng
// thời Thiên Triều đúng là thứ đắt nhất trong bảng công trình.
function towerStackCost(level, tribe) {
  const step = Math.pow(CONFIG.BUILD.TOWER_STACK.COST_STEP, level) * towerAgeMult(tribe && tribe.age);
  const c = {};
  for (const k in CONFIG.BUILD.tower.cost) c[k] = Math.round(CONFIG.BUILD.tower.cost[k] * step);
  return c;
}

function canStackTower(b) {
  return b.type === 'tower' && b.done && b.hp > 0 && (b.level || 1) < CONFIG.BUILD.TOWER_STACK.MAX;
}

function startTowerStack(tribe, b) {
  const lv = b.level || 1;
  const cost = towerStackCost(lv, tribe);
  if (!canAfford(tribe, cost)) return false;
  // Cùng cánh cửa với queueBuild: không có thợ rảnh thì không khởi công. Ở đây nó
  // còn đáng hơn — cái tháp NGỪNG BẮN suốt thời gian xây chồng, nên một công
  // trường tầng hai không ai tới là tự tay tháo vũ khí phòng thủ của chính mình.
  if (freeBuilders(tribe) === 0) return false;
  pay(tribe, cost);
  b.done = false;
  b.stacking = true;
  b.progress = 0;
  b.tendedAt = tick;
  // GHI LẠI ĐÚNG SỐ ĐÃ TRẢ. Từ vòng này giá tháp đổi theo thời đại, nên hoàn tiền
  // bằng cách tra lại bảng giá là hoàn SAI mỗi khi bộ lạc lên đời giữa lúc xây —
  // đúng loại lỗi im lặng mà không có dòng lỗi nào để lần theo. Xem abandonDeadSites.
  b.paid = cost;
  b.buildTicks = Math.round(CONFIG.BUILD.tower.buildTicks * Math.pow(CONFIG.BUILD.TOWER_STACK.TICK_STEP, lv));
  assignBuilders(tribe, b);
  logEvent(`🏯 ${tribe.name} khởi công tháp canh tầng ${lv + 1}`, tribe.color);
  return true;
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
    // THỂ LỰC (Phase 3.35). Khai ở đây cho MỌI đơn vị dù tickStamina tự dựng được
    // khi thiếu: `maxStam` là mẫu số của thanh thể lực trong bảng thông tin và của
    // staminaMult, nên một đơn vị lọt qua mà không có nó sẽ chia cho undefined và
    // ra NaN — thứ đã hai lần âm thầm xoá cả một cơ chế trong dự án này (lãnh thổ ở
    // 3.6, đội hình ở 3.17). `stamX/stamY` là vị trí tick trước, cách duy nhất đo
    // được quãng đã đi mà không bỏ sót đường di chuyển nào.
    maxStam: 0, stam: 0, stamX: undefined, stamY: undefined,
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
    // BA NĂNG LỰC THIÊN TRIỀU, chép từ spec xuống cá thể như `splash`/`range` ở
    // trên. Chép chứ không tra lại spec mỗi lần dùng, và đó không phải chuyện tối
    // ưu: nhánh nâng cấp Công thành cộng thẳng vào `u.splash`/`u.range` của TỪNG cá
    // thể (xem effRanged), nên hai đơn vị cùng loại của hai bộ lạc phải mang được
    // hai con số khác nhau. Một phép tra spec chung sẽ xoá mất chính điều đó.
    pierce: base.pierce || 0,          // nỏ thần: tầm xuyên của mũi tên
    pierceWidth: base.pierceWidth || 0,
    trample: base.trample || 0,        // voi chiến: sát thương/tick lên mọi địch quanh mình
    trampleR: base.trampleR || 0,
    rallyR: base.rallyR || 0,          // quân kỳ: bán kính + mức cổ vũ
    rallyAtk: base.rallyAtk || 0,
    rallySpeed: base.rallySpeed || 0,
    atkCooldown: base.cooldown || CONFIG.UNIT.ATTACK_COOLDOWN,
    // được hào quang chỉ huy của anh hùng buff (mọi đơn vị đều có thể nhận)
    auraUntil: 0, auraMult: 1,
    // Cổ vũ của QUÂN KỲ. Phần sát thương đi chung đường ống `auraUntil/auraMult`
    // với hào quang chỉ huy (effAttack đã đọc sẵn), nhưng phần TỐC ĐỘ thì phải có
    // đường riêng: hào quang của anh hùng không chạm tới tốc độ, nên nhồi chung sẽ
    // biến một trường "nhân sát thương" thành hai nghĩa tuỳ nguồn. Khởi tạo tường
    // minh cho MỌI đơn vị chứ không chỉ quân sự — tickSoldier đọc `u.rallyUntil`
    // trước cả tick đầu tiên, và `undefined >= tick` là false nhưng `base *=
    // 1 + undefined` là NaN. NaN đã ba lần im lặng cắn dự án này.
    rallyUntil: 0, rallySpd: 0,
    // Chỗ đứng CỐ ĐỊNH trong hàng (xem formationSpot). Cấp một lần lúc sinh ra và
    // không bao giờ đổi — nếu tính lại theo chỉ số trong mảng `units` thì mỗi lần
    // một người chết là cả đạo quân đổi chỗ đứng cùng lúc, và đội hình sẽ xáo trộn
    // đúng vào lúc nó cần đứng yên nhất.
    formSlot: tribe.nextFormSlot++,
    mending: false,     // đang trên đường về trạm xá / đang nằm viện
    // THẦY LANG. Khởi tạo tường minh cho MỌI đơn vị chứ không chỉ cho medic, cùng
    // lý do đã viết ở `tribe.infirmaries`: hình vẽ đọc `u.healing` để biết có kéo
    // sợi chỉ xanh hay không, và nó chạy trước cả tick đầu tiên của bộ não.
    // `healing` giữ THAM CHIẾU tới bệnh nhân, không phải một bản chụp toạ độ —
    // bệnh nhân còn đang chạy, và "chụp lấy toạ độ rồi vẽ theo nó" chính là họ lỗi
    // đã cắn ở camera đạo diễn và ở flow field.
    healing: null, healUntil: 0, healed: 0,
    // QUÂN LƯƠNG. Khai TƯỜNG MINH bằng 0 cho MỌI đơn vị, kể cả dân thường — và số 0
    // ở đây là một GIÁ TRỊ CÓ NGHĨA, không phải chỗ giữ chỗ: `maxSupply === 0` là
    // cách duy nhất supplyMult() nhận ra "đơn vị này được miễn". Để trống thì
    // `u.supply / u.maxSupply` ra NaN, mọi so sánh với NaN đều false, và người đó sẽ
    // vừa không bao giờ đói vừa không bao giờ hiện vạch — im lặng hoàn toàn. NaN đã
    // bốn lần cắn dự án này theo đúng hình dạng ấy.
    supply: 0, maxSupply: 0,
    // Nguồn tiếp tế của tick vừa rồi ('home' | 'camp' | null) — hình vẽ đọc để biết
    // vẽ vạch xanh hay vạch hổ phách, và bảng thông tin đọc để nói ra lý do.
    supplySrc: null,
    // ĐỘI HẬU CẦN: cái trại nó đang nuôi (THAM CHIẾU sống, không phải id) và nhịp
    // chờ tới lần dựng sau. Tham chiếu vì cùng lý do đã viết cho `u.healing`: cái
    // trại có thể bị phá bất cứ lúc nào, và `b.hp <= 0` là câu hỏi rẻ hơn nhiều so
    // với đi tìm lại trong mảng `buildings` mỗi tick.
    camp: null, campReadyAt: 0, supplied: 0,
    // Toạ độ VẼ (float). Mô phỏng không bao giờ đọc hai trường này; chúng chỉ
    // trượt mềm về phía (x, y) mỗi frame để mắt thấy đường đi liên tục.
    rx: 0, ry: 0, flash: 0
  };
  u.rx = u.x; u.ry = u.y;
  // Ra khỏi cổng với BÌNH ĐẦY. Không phải 0: một suất quân vừa ra lò ở giữa kinh đô
  // đứng trên đất nhà nên sẽ đầy lại trong ~110 tick, nhưng bộ lạc vừa tuyển gấp một
  // đợt quân để phản công sẽ tiễn cả đợt ra trận với vạch cạn — một hình phạt không
  // ai chọn và không ai đọc ra nguyên nhân.
  if (needsSupply(type)) { u.maxSupply = unitMaxSupply(tribe); u.supply = u.maxSupply; }

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
    // Thừa hưởng GIA BẢO của dòng dõi. Từ Phase 3.34 đây không còn là "ngoại lệ cho
    // riêng Thánh vật" nữa mà là đường đi bình thường của mọi món đồ: cái quyết định
    // món đồ có sang được đời sau hay không nằm ở CÁI CHẾT của người trước (chết già
    // thì sang trọn bộ, tử trận thì mất một nửa — xem onHeroDeath), chứ không nằm ở
    // loại đồ. Lấy tối đa MAX_HELD, phần dư vẫn nằm lại cho đời sau nữa.
    if (tribe.heirloom.length) {
      const take = tribe.heirloom.splice(0, CONFIG.ITEM.MAX_HELD);
      for (const r of take) u.items.push({ key: r.key, lv: r.lv || 1 });
      logEvent(`🎁 ${u.name} thừa kế ${take.length} món gia bảo của ${tribe.name}`, tribe.color, true);
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

  u.maxStam = staminaCap(u);
  u.stam = u.maxStam;
  u.stamX = u.x; u.stamY = u.y;
  units.push(u);
  return u;
}

function spawnBuilding(tribe, type, x, y, instant) {
  const spec = CONFIG.BUILD[type];
  // Nề đá tính vào NGAY LÚC ĐẶT MÓNG chứ không cộng sau. Hai chỗ phải nhất quán —
  // đây và refreshBuildingHp — nên cả hai đọc chung `masonryMult`; viết thẳng
  // `spec.hp` ở đây thì mọi toà nhà xây sau khi nghiên cứu xong sẽ lặng lẽ mỏng
  // hơn những toà nhà cũ vừa được cộng, và không có lỗi nào để lần theo.
  const maxHp = Math.round(spec.hp * masonryMult(tribe) * ageBuildHp(tribe));
  const b = {
    id: nextId++, tribeId: tribe.id, type,
    x: clamp(Math.round(x), 1, CONFIG.GRID_WIDTH - 2),
    y: clamp(Math.round(y), 1, CONFIG.GRID_HEIGHT - 2),
    size: spec.size,
    hp: instant ? maxHp : Math.round(maxHp * 0.25),
    maxHp,
    // Tầng của tháp canh (xem TOWER_STACK). Khai cho MỌI công trình chứ không chỉ
    // tháp, đúng lý do đã viết cho `trainType` ngay dưới: mọi vật đi qua đây phải
    // có cùng một hình dạng, và `buildingMaxHp` đọc `b.level` không điều kiện.
    level: 1,
    stacking: false,
    done: !!instant,
    progress: instant ? spec.buildTicks : 0,
    buildTicks: spec.buildTicks,
    cooldown: 0,
    // Lần cuối toà nhà này ăn đòn. Đóng dấu trong dealDamage — cửa duy nhất mọi
    // sát thương đi qua — và đọc bởi alarmedBuildings(). Số âm lớn chứ không phải
    // 0: ở tick 0 mọi công trình sẽ được coi là "vừa bị đánh" và cả bốn bộ lạc
    // đứng dồn vào sân nhà ngay từ giây lập quốc.
    hitTick: -99999,
    // LÒ HUẤN LUYỆN của riêng toà nhà này (Phase 3.28). Khai báo tường minh dù
    // `undefined` cũng chạy đúng: mọi công trình đi qua đây phải có CÙNG một hình
    // dạng đối tượng, và `null` nói rõ "chỗ này có thể chứa một suất" trong khi
    // một trường vắng mặt chỉ nói "chưa ai nghĩ tới".
    trainType: null,
    trainTimer: 0,
    // Lần cuối có một người thợ ĐỨNG trên công trường này (Phase 3.35). Đóng dấu
    // trong tickVillager, đọc bởi rescueOrphanSites. `tick` chứ không phải 0 —
    // xem queueBuild để biết vì sao khai bằng 0 lại là một cái bẫy.
    tendedAt: tick,
    // Số tài nguyên THẬT SỰ đã trả cho công trường này (Phase 3.35 vòng 2). Khai
    // tường minh dù `null` cũng chạy: mọi vật đi qua đây phải có cùng hình dạng, và
    // `null` nói rõ "chỗ này chứa một hoá đơn" trong khi một trường vắng mặt chỉ
    // nói "chưa ai nghĩ tới". Xem abandonDeadSites để biết vì sao không tra lại giá.
    paid: null,
    farmCells: []
  };
  buildings.push(b);
  if (instant) onBuildingComplete(b, tribe);
  return b;
}

function onBuildingComplete(b, tribe) {
  b.done = true;
  // TẦNG MỚI ĐƯỢC GHI Ở ĐÂY, không phải lúc khởi công. Ghi lúc khởi công thì suốt
  // quãng xây dở cái tháp đã có tầm bắn và máu của tầng trên — mà nó đang không
  // bắn — nên nếu bị phá giữa chừng, kẻ tấn công phải đục một cái tháp mạnh hơn
  // cái nó nhìn thấy. Cùng họ với "wonderDoneAt tính từ lúc khánh thành".
  if (b.stacking) {
    b.stacking = false;
    b.level = (b.level || 1) + 1;
    b.maxHp = buildingMaxHp(b, tribe);
    b.buildTicks = CONFIG.BUILD.tower.buildTicks;
    logEvent(`🏯 ${tribe.name} hoàn thành tháp canh tầng ${b.level}`, tribe.color, true);
    addHotspot(b.x, b.y, 3, `Tháp canh tầng ${b.level}`);
  }
  b.hp = b.maxHp;
  if (b.type === 'farm') {
    // Ruộng = vài ô "thức ăn" tái tạo nhanh quanh công trình. Dùng lại NGUYÊN
    // đường ống thu hoạch của bụi quả, không cần logic riêng cho ruộng.
    // 12 ô ứng viên cho CONFIG.FARM.CELLS = 9. Danh sách phải luôn DÀI HƠN số ô
    // cần: `addResource` trả null khi ô đã có chủ (một ruộng khác, một bụi quả sót
    // lại), nên vài ứng viên đầu có thể trượt. Bản trước có đúng 8 ứng viên cho 6 ô
    // — dư 2, vừa đủ để không ai nhận ra ràng buộc này tồn tại. Nâng CELLS lên 9 mà
    // quên bảng này thì ruộng lặng lẽ chỉ có 8 ô và cả phép tính dòng lương ở
    // CONFIG.FARM sai 11% mà không có lỗi nào để lần theo.
    const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [2, 0], [-2, 0], [0, -2],
                     [2, 2], [-2, -2], [2, -2], [-2, 2]];
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

// ============================================================
// TƯỜNG THÀNH — vòng đời (xem CONFIG.WALL)
// ============================================================
function wallRadius(tribe) {
  const R = CONFIG.WALL.RADIUS;
  return R[clamp(tribe.age, 1, R.length - 1)] || 0;
}

// Bậc hình của tường = THỜI ĐẠI, không phải một cấp nghiên cứu. Xem WALL.TIERS.
function wallTier(tribe) {
  return clamp(tribe.age, 1, CONFIG.WALL.TIERS.length - 1);
}

// Máu MỘT Ô tường. KHÔNG còn nhân Nề đá từ Phase 3.30 — tường lên bậc theo thời
// đại, không theo bảng nghiên cứu (xem chú thích nhánh masonry trong config).
// Cổng mỏng hơn: cùng một hàm, một tham số, nên không thể có hai nguồn sự thật.
function wallHpFor(tribe, isGate) {
  const H = CONFIG.WALL.HP;
  const base = H[clamp(tribe.age, 1, H.length - 1)] || 0;
  return Math.round(base * (isGate ? CONFIG.WALL.GATE_HP : 1));
}

// Dựng lại TOÀN BỘ vành tường của một bộ lạc khi có gì đó đổi.
//
// "Có gì đó đổi" được cô lại thành một CHỮ KÝ (thời đại + danh sách kinh đô còn
// đứng). So chữ ký rồi thoát sớm là cả cơ chế hiệu năng của hàm này: nó được gọi
// mỗi nhịp bộ não cho bốn bộ lạc, nhưng phần thân thật sự chỉ chạy đúng vài lần
// mỗi kỷ nguyên — lúc lên đời, lúc lập thêm đô, lúc mất một đô.
//
// DỰNG LẠI chứ không đắp thêm: xem chú thích RADIUS trong config. Bốn vành đồng
// tâm là một mê cung, không phải một thành trì.
function ensureWalls(tribe) {
  // BỘ LẠC ĐÃ DIỆT VONG PHẢI DỌN TƯỜNG, và đây không phải một chi tiết dọn dẹp:
  // một vành 160 ô của một bộ lạc không còn ai chặn đường của cả ba bộ lạc còn
  // sống, vĩnh viễn, ở giữa bản đồ — không ai phá được nó vì không ai còn lý do
  // đi tới đó. Thoát sớm bằng `if (!tribe.alive) return` thì cơ chế tự dọn duy
  // nhất là một sự trùng hợp về thứ tự (kinh đô sập trước khi cờ `alive` tắt), và
  // dựa vào trùng hợp thì nó sẽ hỏng đúng lần đầu tiên có ai đổi thứ tự đó.
  if (!tribe.alive) {
    if (tribe.wallSig !== 'dead') {
      tribe.wallSig = 'dead';
      for (const [k, w] of wallCells) if (w.tribeId === tribe.id) wallCells.delete(k);
    }
    return;
  }
  const R = wallRadius(tribe);
  const towns = [];
  for (const b of buildings) {
    if (b.tribeId === tribe.id && b.type === 'town' && b.hp > 0 && b.done) towns.push(b);
  }
  let sig = tribe.age + '|' + R;
  for (const t of towns) sig += ';' + t.id + ',' + t.x + ',' + t.y;
  if (tribe.wallSig === sig) return;
  tribe.wallSig = sig;

  for (const [k, w] of wallCells) if (w.tribeId === tribe.id) wallCells.delete(k);
  if (!R || tribe.age < CONFIG.WALL.MIN_AGE || !towns.length) return;

  // Ô đã có chủ: móng nhà (của BẤT KỲ ai) và hang ổ. Một ô tường mọc đè lên mái
  // nhà thì hai sprite chồng nhau và người xem đọc ra một lỗi hiển thị; tệ hơn,
  // nó biến chính căn nhà đó thành một chỗ không ai đi vào được.
  const taken = new Set();
  for (const b of buildings) {
    if (b.hp <= 0) continue;
    const r = Math.ceil(b.size / 2);
    for (let x = b.x - r; x <= b.x + r; x++) {
      for (let y = b.y - r; y <= b.y + r; y++) taken.add(x + ',' + y);
    }
  }
  for (const l of lairs) {
    for (let x = l.x - 2; x <= l.x + 2; x++) {
      for (let y = l.y - 2; y <= l.y + 2; y++) taken.add(x + ',' + y);
    }
  }

  const hp = wallHpFor(tribe, false);
  const gateHp = wallHpFor(tribe, true);
  const tier = wallTier(tribe);
  const half = Math.floor(CONFIG.WALL.GATE_SPAN / 2);          // 5 ô -> |d| <= 2 là cổng
  const doorHalf = Math.floor(CONFIG.WALL.GATE_DOOR_SPAN / 2); // ...trong đó |d| <= 1 là cánh cửa
  let n = 0;
  for (const t of towns) {
    // Vành Chebyshev bán kính R: bốn cạnh của một hình vuông. Duyệt theo cạnh chứ
    // không quét cả hình vuông rồi lọc — 4×(2R+1) phép thay vì (2R+1)².
    //
    // `d` chạy từ -R tới R, nên |d| nói ngay ba điều mà hình vẽ cần biết mà không
    // phải đo lại hình học ở tầng vẽ:
    //   |d| === R  -> Ô GÓC (bốn góc của hình vuông, mỗi góc thuộc hai cạnh)
    //   |d| <= 2   -> Ô CỔNG (năm ô chính giữa cạnh): |d| <= 1 là CÁNH CỬA,
    //                 |d| === 2 là hai LẦU CỔNG kẹp hai bên
    //   còn lại    -> thân tường, chạy NGANG ở cạnh trên/dưới và DỌC ở cạnh trái/phải
    // Tính ở đây chứ không ở drawWall là có chủ ý: tầng vẽ không được phép suy
    // ngược ra hình học từ toạ độ, vì lúc đó nó phải biết kinh đô nằm ở đâu — và
    // "hai chỗ cùng tính một hình học" đúng là họ lỗi hai-nguồn-sự-thật đã cắn ở
    // hình học kho hàng (ô vuông vs hình tròn).
    for (let d = -R; d <= R; d++) {
      const corner = Math.abs(d) === R;
      const gate = Math.abs(d) <= half;
      // dir = hướng bức tường CHẠY, không phải hướng nó nhìn. Cạnh trên/dưới chạy
      // ngang ('h'), cạnh trái/phải chạy dọc ('v'). Ô góc lấy 'c' — nó không chạy
      // theo hướng nào cả, nó là chỗ hai hướng gặp nhau.
      const ring = [
        [t.x + d, t.y - R, corner ? 'c' : 'h', -1],
        [t.x + d, t.y + R, corner ? 'c' : 'h', 1],
        [t.x - R, t.y + d, corner ? 'c' : 'v', -1],
        [t.x + R, t.y + d, corner ? 'c' : 'v', 1]
      ];
      for (const [x, y, dir, side] of ring) {
        if (n >= CONFIG.WALL.MAX_CELLS) break;
        if (x < 1 || y < 1 || x >= CONFIG.GRID_WIDTH - 1 || y >= CONFIG.GRID_HEIGHT - 1) continue;
        const key = x + ',' + y;
        if (taken.has(key) || wallCells.has(key)) continue;
        // CHẶT CÂY DƯỚI CHÂN TƯỜNG. Không có dòng này thì một gốc cây nằm trên vành
        // là một ô chặn CẢ QUÂN NHÀ — tức là bức tường sinh ra để chỉ chặn địch lại
        // tự thủng một lỗ theo chiều ngược. Cùng hàm mà sân hang ổ đang dùng.
        clearTrees(x, y, 0);
        const isGate = gate && !corner;
        // CÁNH CỬA là ba ô giữa; hai ô còn lại của cổng là LẦU CỔNG và dày như
        // tường thường. Xem chú thích GATE_HP: nới span mà không nới điểm yếu.
        const isDoor = isGate && Math.abs(d) <= doorHalf;
        const h = isDoor ? gateHp : hp;
        wallCells.set(key, {
          x, y, key, tribeId: tribe.id, townId: t.id,
          hp: h, maxHp: h, hitTick: -99999, downUntil: 0, isWall: true, size: 1,
          // `gp` = chỗ đứng của ô này TRONG cổng (-2..2), tính ở đây chứ không suy
          // ngược ở tầng vẽ — cùng đúng lý do đã viết mười dòng trên cho `corner`
          // và `dir`: tầng vẽ không biết kinh đô nằm ở đâu, và "hai chỗ cùng tính
          // một hình học" là họ lỗi hai-nguồn-sự-thật đã cắn ở hình học kho hàng.
          // Nhờ nó, drawWall phân biệt được ô giữa vòm (gp 0), hai cánh (|gp| 1) và
          // hai lầu cổng (|gp| 2) mà không phải đo lại gì.
          tier, dir, corner, gate: isGate, door: isDoor, gp: isGate ? d : null, side
        });
        n++;
      }
    }
  }
}

// Tự sửa + mọc lại. Một vòng duyệt phẳng trên Map, không chia nhịp: cả bản đồ
// tối đa ~4.000 ô và mỗi ô là hai phép so sánh, rẻ hơn hẳn một lần quét `units`.
//
// TỪ PHASE 3.30 NÓ ĂN ĐÁ. Mỗi ô được vá trong tick này rút REGEN_STONE đá khỏi
// kho bộ lạc; hết đá (hoặc tụt xuống dưới REGEN_RESERVE) thì vẫn vá, chỉ còn một
// phần tư tốc độ. Xem chú thích CONFIG.WALL để biết vì sao phải có cái sàn đó.
//
// Ngân sách đá đọc MỘT LẦN cho mỗi bộ lạc trước vòng lặp, không đọc lại
// `tribe.res.stone` ở từng ô: với 300 ô cùng hư hại thì đó là 300 lần đọc-ghi
// vào cùng một ô nhớ mỗi tick, và tệ hơn — kết quả sẽ phụ thuộc vào THỨ TỰ DUYỆT
// của Map, tức là vào việc ô nào được dựng trước. Gom về một mảng chỉ số theo
// tribeId thì luật thành "mỗi tick bộ lạc có ngần này viên đá cho tường", đọc
// được và đo được.
function tickWalls() {
  if (!wallCells.size) return;
  const W = CONFIG.WALL;
  // Số ô mà mỗi bộ lạc còn đủ đá để trả tiền trong tick này.
  const budget = [];
  for (const t of tribes) {
    const spare = t.alive ? (t.res.stone - W.REGEN_RESERVE) : 0;
    budget[t.id] = spare > 0 ? Math.floor(spare / W.REGEN_STONE) : 0;
  }
  const spent = [];
  for (const w of wallCells.values()) {
    if (w.hp <= 0) {
      // LỖ TỰ BỊT LẠI ở REBUILD_HP — không phải máu đầy. Mọc lại đầy máu thì bên
      // công vừa trả giá cả trăm tick để đục xong một ô lại phải đục y hệt từ đầu
      // nếu lỡ nhịp, và "phá thành" không còn là một thành tựu giữ được.
      if (tick >= w.downUntil) {
        w.hp = w.maxHp * W.REBUILD_HP;
        w.hitTick = tick;
      }
      continue;
    }
    if (w.hp >= w.maxHp || tick - w.hitTick <= W.REGEN_DELAY) continue;
    let rate = w.maxHp * W.REGEN_FRAC;
    if (budget[w.tribeId] > 0) {
      budget[w.tribeId]--;
      spent[w.tribeId] = (spent[w.tribeId] || 0) + W.REGEN_STONE;
    } else {
      rate *= W.REGEN_POOR;
    }
    w.hp = Math.min(w.maxHp, w.hp + rate);
  }
  for (const t of tribes) if (spent[t.id]) t.res.stone -= spent[t.id];
}

// Một ô tường vừa thủng. KHÔNG xoá khỏi Map (xem chú thích wallCells): nó chỉ
// ngừng chặn cho tới `downUntil`.
//
// Nhật ký có NHỊP RIÊNG cho mỗi bộ lạc, không mỗi ô một dòng: một đạo quân đục
// đồng loạt năm ô sẽ đẩy năm dòng giống hệt nhau vào sử — đúng cái làm dòng sử
// mất giá trị, vì thứ đáng nhớ ("thành của ai vỡ") chìm trong thứ lặp lại.
function onWallBreached(w, attacker) {
  w.hp = 0;
  w.downUntil = tick + CONFIG.WALL.RUBBLE;
  addFx({ type: 'boom', x: w.x, y: w.y, life: 20, maxLife: 20, r: 1.2 });
  const t = tribes[w.tribeId];
  if (!t) return;
  addHotspot(w.x, w.y, 5, w.gate ? `Cổng thành ${t.name} vỡ` : `Tường thành ${t.name} vỡ`);
  // CỔNG VỠ LUÔN ĐƯỢC MỘT DÒNG SỬ, không đi qua nhịp 400 tick của tường thường.
  // Cả bức tường chỉ có 20 ô cổng trên 320 ô (4 cạnh × GATE_SPAN 5), và ba ô cánh
  // cửa ở chính giữa một cạnh là chỗ mà cả người xem lẫn kẻ tấn công đều biết là
  // chỗ nên đánh — nên "cổng Nam vỡ" là một sự kiện, còn "một ô tường nào đó vỡ"
  // thì không.
  //
  // Điều kiện là `w.gate`, TỨC LÀ CẢ LẦU CỔNG cũng được một dòng sử. Đúng: hai ô
  // lầu cổng dày như tường thường, nên phá được một cái là một chiến công thật, và
  // nó vẫn nằm ở đúng chỗ mà câu chuyện đang diễn ra.
  const by = attacker && attacker.tribeId >= 0 ? tribes[attacker.tribeId] : null;
  if (w.gate) {
    logEvent(by ? `⛩ ${by.name} PHÁ CỔNG THÀNH của ${t.name}!`
                : `⛩ Quái vật PHÁ CỔNG THÀNH của ${t.name}!`,
             by ? by.color : '#b783cc', true);
  } else if (tick - (t.wallLogAt || -99999) > 400) {
    t.wallLogAt = tick;
    logEvent(by ? `🧱 ${by.name} chọc thủng tường thành ${t.name}!`
                : `🧱 Quái vật chọc thủng tường thành ${t.name}!`,
             by ? by.color : '#b783cc', true);
  }
}

