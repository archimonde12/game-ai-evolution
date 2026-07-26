'use strict';
// ============================================================
// 04-genes.js
// ------------------------------------------------------------
// HAI vòng tiến hoá lồng nhau: POLICY_SPEC = gen chiến lược của BỘ LẠC (chọn
// lọc cuối mỗi kỷ nguyên) và HERO_GENE_SPEC = gen CÁ NHÂN của anh hùng.
// Tách cơ học từ civilization.html một-file, dòng 2611–2824.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Gen chiến lược của bộ lạc (thứ DUY NHẤT tiến hoá qua các kỷ nguyên)
// ============================================================
const POLICY_SPEC = {
  foodWeight:    { range: [0.5, 2.5], bounds: [0.1, 4] },   // ưu tiên dồn dân vào lương thực
  woodWeight:    { range: [0.5, 2.0], bounds: [0.1, 4] },   // ...vào gỗ
  goldWeight:    { range: [0.2, 1.2], bounds: [0.05, 4] },  // ...vào vàng
  militaryRatio: { range: [0.1, 0.45], bounds: [0, 0.8] },  // tỉ lệ lính mục tiêu trên tổng dân
  aggression:    { range: [0.15, 0.85], bounds: [0, 1] },   // ngưỡng dám tuyên chiến
  expansion:     { range: [32, 88], bounds: [12, 140] },    // bán kính dám đi kiếm ăn/xây nhà quanh nhà chính (nới theo bản đồ 340x220)
  houseBuffer:   { range: [1, 5], bounds: [0, 10] },        // giữ bao nhiêu chỗ trống trong giới hạn dân trước khi xây nhà
  farmTarget:    { range: [1, 6], bounds: [0, 12] },        // số ruộng muốn có
  towerTarget:   { range: [0, 3], bounds: [0, 8] },         // số tháp canh muốn có
  ageRush:       { range: [0.2, 0.9], bounds: [0, 1] },     // càng cao càng nhịn ăn để lên thời đại sớm

  // --- Ba gen của Phase 3.6, đều gắn với cây công nghệ mới ---
  // Ưu tiên dồn dân vào ĐÁ. Đánh đổi sắc nhất trong cả bộ gen: đá hoàn toàn vô
  // dụng ở Đồ Đá (không công trình nào thời đầu cần đến nó), nên stoneWeight cao
  // là ném thẳng công sức xuống sông trong 2.000 tick đầu — nhưng thấp quá thì
  // không bao giờ mở nổi Xưởng thợ, và cả nhánh cung thủ/công thành/Kỳ quan biến
  // mất khỏi ván chơi. Một gen "sai lúc này, đúng lúc kia".
  stoneWeight:   { range: [0.15, 1.0], bounds: [0.02, 3] },
  // Tỉ lệ quân tầm xa trong đạo quân. Đánh đổi thật, không do một con số cố định
  // nào trong code phán: cung thủ bắn 6 ô nên hạ được đối phương trước khi bị
  // chạm, nhưng 42 máu thì bị kỵ sát vào là tan. Giá trị tốt nhất phụ thuộc vào
  // đối thủ đang chơi kiểu gì — tức là nó tiến hoá TRONG một môi trường tự nó
  // cũng đang tiến hoá. Đây là gen đáng theo dõi nhất của bản này.
  rangedRatio:   { range: [0.15, 0.6], bounds: [0, 0.9] },
  // Mức khao khát Kỳ quan: quyết định có dám dồn 680 đá + 620 gỗ + 380 vàng vào
  // một toà nhà KHÔNG đánh nhau được hay không. Xây được là thắng ngay; xây dở
  // dang thì vừa mất kho vừa dựng sẵn một tấm bia cho cả ba bộ lạc còn lại.
  wonderDrive:   { range: [0.1, 0.7], bounds: [0, 1] },
  // THÀNH TÂM: quyết định có xây Đền thờ không, và dâng tế dày hay thưa. Gen duy
  // nhất trong cả bộ mà mức lời/lỗ KHÔNG do một con số nào trong code định đoạt —
  // nó do người đang xem quyết định. Xem CONFIG.WORSHIP.
  piety:         { range: [0.1, 0.7], bounds: [0, 1] },

  // --- Hai gen của Phase 3.17, và cả hai đều nói về TRẬT TỰ ---

  // KỶ LUẬT ĐỘI HÌNH. Cho tới bản này mỗi người lính là một tác nhân độc lập
  // tuyệt đối: tự chọn mục tiêu, tự tìm đường, tự quyết đánh hay lui. Kết quả là
  // một đạo quân không bao giờ TỒN TẠI như một đạo quân — nó là bốn chục cá thể
  // tình cờ cùng đi một hướng, và trận đánh diễn ra thành một chuỗi tay đôi rải
  // dọc nửa bản đồ vì kẻ nhanh chân tới trước chết trước khi kẻ chậm kịp tới.
  //
  // Gen này quyết định một người lính chịu ĐỢI đồng đội tới mức nào (xem
  // marchWithFormation) và đứng vào hàng chặt tới đâu lúc nghỉ. Đánh đổi thật,
  // không do con số nào trong code phán:
  //   · kỷ luật cao — cả khối tới nơi cùng lúc, tập trung hoả lực, nhưng CHẬM: kẻ
  //     nhanh nhất bị ghìm lại theo kẻ chậm nhất, và một khối đông đứng sát nhau
  //     là mồi ngon cho sát thương lan của máy bắn đá.
  //   · kỷ luật thấp — tới rải rác nên không bao giờ dồn đủ lực phá thành, nhưng
  //     phản ứng nhanh, phủ rộng, và không bao giờ mất cả đạo quân trong một cú.
  // Giá trị tốt nhất phụ thuộc vào đối phương đang chơi kiểu gì — tức là nó tiến
  // hoá trong một môi trường tự nó cũng đang tiến hoá, cùng họ với `rangedRatio`.
  discipline:    { range: [0.2, 0.8], bounds: [0, 1] },

  // QUY HOẠCH. Chỗ đặt nhà cho tới nay bốc hoàn toàn ngẫu nhiên trên một vòng
  // xoắn ốc quanh kinh đô, nên mọi bộ lạc ở mọi kỷ nguyên đều mọc ra cùng một thứ:
  // một đám nhà rải như nấm. Bốn nền văn minh trông giống hệt nhau về mặt QUY
  // HOẠCH, và quy hoạch lại là thứ dễ nhìn ra nhất trên một bản đồ nhìn từ trên
  // xuống — nên đó là một trục biểu hiện bị bỏ phí hoàn toàn.
  //
  // Gen này kéo chỗ đặt nhà về một LƯỚI neo ở kinh đô. Đánh đổi có thật chứ không
  // chỉ là thẩm mỹ: bắt lưới thì nhà thẳng hàng, đường đi giữa các nhà ngắn và
  // thông (dân đi làm nhanh hơn), nhưng ô lưới nào bị rừng/đá chiếm là mất luôn
  // — bộ lạc quy hoạch chặt mọc chậm hơn hẳn ở địa hình xấu, trong khi kẻ mọc
  // như nấm nhét được nhà vào mọi kẽ hở.
  cityPlan:      { range: [0.15, 0.85], bounds: [0, 1] }
};

function randomPolicy() {
  const p = {};
  for (const k in POLICY_SPEC) p[k] = randRange(POLICY_SPEC[k].range[0], POLICY_SPEC[k].range[1]);
  return p;
}

function mutatePolicy(parent) {
  const p = {};
  for (const k in POLICY_SPEC) {
    const spec = POLICY_SPEC[k];
    const span = spec.range[1] - spec.range[0];
    p[k] = clamp(parent[k] + gauss(CONFIG.ERA.POLICY_MUTATION * span), spec.bounds[0], spec.bounds[1]);
  }
  return p;
}

// ============================================================
// Gen ANH HÙNG — thứ duy nhất trong game thuộc về một CÁ THỂ
// ============================================================
// Mỗi gen phải có ĐÁNH ĐỔI thật, nếu không thì chọn lọc vô nghĩa: một gen chỉ
// toàn mặt lợi sẽ bị đẩy lên trần trong vài đời rồi đứng yên, và biểu đồ chẳng
// nói lên điều gì. Đánh đổi cụ thể xem trong heroStatsFromGenes().
const HERO_GENE_SPEC = {
  braveness: { range: [0.25, 0.75], bounds: [0, 1] },  // ngưỡng dám giao chiến khi ở thế yếu
  command:   { range: [0.25, 0.75], bounds: [0, 1] },  // hào quang buff lính quanh mình <-> sức đánh của chính mình
  ambition:  { range: [0.25, 0.75], bounds: [0, 1] },  // thích công thành <-> thích săn người
  vigor:     { range: [0.35, 0.65], bounds: [0, 1] },  // máu dày <-> nhanh nhẹn + đấm mạnh
  // Tham lam: chịu đi vòng bao xa để nhặt vật phẩm, và có dám bỏ đội hình đi săn
  // quái không. Đánh đổi thuần TÌNH HUỐNG, không có con số nào trong code quyết
  // định nó tốt hay xấu: đồ tốt thì mạnh lên thật, nhưng đường đi lấy đồ chạy
  // ngang hang quái và xa quân nhà. Chính vì thế nó là gen đáng theo dõi nhất.
  greed:     { range: [0.25, 0.75], bounds: [0, 1] }
};

const HERO_GENE_LABELS = {
  braveness: 'dũng cảm', command: 'chỉ huy', ambition: 'tham vọng', vigor: 'lực lưỡng', greed: 'tham lam'
};

// Tên dòng dõi: mỗi bộ lạc mỗi kỷ nguyên bốc một cái, các đời sau nối "đời N".
// Có tên riêng thì người xem mới nhớ được "à, cái ông hay bỏ chạy đó" — không có
// tên thì anh hùng chỉ là một chấm to hơn.
const HERO_DYNASTIES = [
  'Lôi Vân', 'Bạch Hổ', 'Trấn Sơn', 'Hoả Long', 'Thiết Ưng', 'Huyền Vũ',
  'Kim Đao', 'Phá Quân', 'Tuyết Ảnh', 'Cuồng Phong', 'Thương Lang', 'Địa Chấn'
];

function randomHeroGenes() {
  const g = {};
  for (const k in HERO_GENE_SPEC) g[k] = randRange(HERO_GENE_SPEC[k].range[0], HERO_GENE_SPEC[k].range[1]);
  return g;
}

function mutateHeroGenes(parent) {
  const g = {};
  for (const k in HERO_GENE_SPEC) {
    const spec = HERO_GENE_SPEC[k];
    const span = spec.range[1] - spec.range[0];
    g[k] = clamp(parent[k] + gauss(CONFIG.HERO.MUTATION * span), spec.bounds[0], spec.bounds[1]);
  }
  return g;
}

// Gen -> chỉ số. TẤT CẢ đánh đổi nằm ở đây, đọc một chỗ là hiểu hết luật chơi:
//  vigor   cao: máu dày nhưng đi chậm và đấm nhẹ (lực sĩ nặng nề)
//  command cao: hào quang rộng, buff lính mạnh, nhưng chính mình đánh yếu đi
//               (làm tướng thì bớt làm đấu sĩ)
//  braveness / ambition: không đổi chỉ số, chỉ đổi HÀNH VI — nên chúng là hai gen
//               mà chọn lọc "nói" rõ nhất, vì lợi/hại của chúng hoàn toàn do môi
//               trường quyết định chứ không do một con số cố định trong code.
function heroStatsFromGenes(g, ageBonus) {
  const base = CONFIG.UNIT.HERO;
  return {
    maxHp: Math.round(base.hp * (0.55 + g.vigor * 0.95) * ageBonus.hp),
    attack: base.attack * (1.3 - g.vigor * 0.6) * (1.25 - g.command * 0.5) * ageBonus.atk,
    speedMult: 1.45 - g.vigor * 0.6,
    auraR: 2 + g.command * (CONFIG.HERO.MAX_AURA_R - 2),
    auraMult: 1 + g.command * 0.55
  };
}

// Hệ số chỉ số theo cấp món đồ. Kẹp ở hai đầu để một giá trị lạ (đọc từ một bản
// lưu cũ, hay một chỗ nào đó quên gán `lv`) không bao giờ ra `undefined` rồi thành
// NaN — cùng con lỗi đã xoá sạch biên giới lãnh thổ ở Phase 3.6.
function itemLevelMult(lv) {
  const T = CONFIG.ITEM.LEVEL_MULT;
  return T[clamp(Math.round(lv || 1), 1, CONFIG.ITEM.MAX_LEVEL)];
}

// Chỉ số cuối = GEN (cố định cả đời) + VẬT PHẨM (thay đổi trong đời). Tính lại
// từ đầu mỗi lần nhặt đồ thay vì cộng dồn vào chỉ số hiện tại: cộng dồn thì chỉ
// cần một lần gọi thừa là chỉ số phình vĩnh viễn, mà lỗi kiểu đó không bao giờ
// lộ ra ngay — nó chỉ hiện thành "sao anh hùng đời này mạnh vô lý".
function recomputeHeroStats(u) {
  const b = u.ageBonus;
  const st = heroStatsFromGenes(u.genes, b);
  let attack = st.attack, maxHp = st.maxHp, speedMult = st.speedMult;
  let auraR = st.auraR, auraMult = st.auraMult;
  // `u.items` là mảng {key, lv}. Cấp nhân thẳng vào MỌI chỉ số của món đó — không
  // có món nào "chỉ lên cấp một nửa", vì một bảng ngoại lệ ở đây thì không đọc được
  // từ ngoài màn hình và người xem sẽ không bao giờ suy ra được luật.
  for (const it of u.items) {
    const spec = CONFIG.ITEM.TYPES[it.key];
    if (!spec) continue;                       // loại đồ đã bị xoá khỏi game
    const m = itemLevelMult(it.lv);
    if (spec.attack) attack += spec.attack * m * b.atk;
    if (spec.maxHp) maxHp += spec.maxHp * m * b.hp;
    if (spec.speedMult) speedMult += spec.speedMult * m;
    if (spec.auraR) auraR += spec.auraR * m;
    if (spec.auraMult) auraMult += spec.auraMult * m;
  }
  // Nhánh nghiên cứu "Binh thư" cộng vào MÁU TỐI ĐA ở đây, và CHỈ máu. Sát thương
  // và giáp của nó đi qua effAttack/effDefense như mọi nâng cấp khác — cộng thêm
  // một lần nữa ở đây là tính đúp, mà tính đúp trên một chỉ số được recompute mỗi
  // lần nhặt đồ thì con số sẽ phình thêm sau mỗi món vật phẩm.
  //
  // Cũng KHÔNG nhân với ageBonus.hp: giá trị đó là ảnh chụp thời đại lúc anh hùng
  // ra đời, còn nâng cấp thì áp dụng ngay cho người đang sống — nhân hai thứ khác
  // trục thời gian với nhau là cách chắc chắn để một đời anh hùng mạnh vô lý.
  if (u.tribeId >= 0) {
    const t = tribes[u.tribeId];
    if (t && t.upBonus && t.upBonus.hero) maxHp += t.upBonus.hero.hp;
    // NGỰA CHIẾN cộng thẳng vào tốc độ. Đặt ở đây chứ không trong bảng `upBonus`
    // vì tốc độ của anh hùng không đi qua effAttack/effDefense — nó là một trường
    // riêng được nhân ra `u.speed` mỗi tick (xem tickHero).
    //
    // Điều kiện là THỜI ĐẠI HIỆN TẠI của bộ lạc, không phải `u.ageBonus` chụp lúc
    // sinh ra: con ngựa là tài sản của bộ lạc, nên một anh hùng ra đời ở Đồ Đồng
    // vẫn được lên ngựa ngay khi bộ lạc chạm Đồ Sắt (xem khối lên thời đại trong
    // tribeBrain — nó gọi lại recomputeHeroStats đúng vì lý do này).
    if (t && t.age >= CONFIG.HERO.MOUNT_AGE) speedMult += CONFIG.HERO.MOUNT_SPEED;
  }
  const gained = Math.round(maxHp) - (u.maxHp || 0);
  u.maxHp = Math.round(maxHp);
  u.attack = attack;
  u.speedMult = speedMult;
  u.auraR = Math.min(auraR, CONFIG.HERO.MAX_AURA_R + 4);
  u.commandMult = auraMult;
  // Nhặt giáp thì máu HIỆN TẠI cũng tăng đúng phần vừa thêm, không phải chỉ nới
  // trần rỗng: một anh hùng sắp chết mà nhặt được giáp phải thấy mình sống lại.
  if (gained > 0 && u.hp) u.hp = Math.min(u.maxHp, u.hp + gained);
  if (u.hp > u.maxHp) u.hp = u.maxHp;
}

