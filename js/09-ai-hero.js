'use strict';
// ============================================================
// 09-ai-hero.js
// ------------------------------------------------------------
// Não anh hùng — cấp độ quyết định cao nhất: cân sức tại chỗ, hào quang cho
// quân xung quanh, chọn đánh hang ổ hay đuổi tướng địch, rút lui, và di sản
// khi chết (fitness chọn lọc đời sau).
// Tách cơ học từ civilization.html một-file, dòng 4671–5246.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Anh hùng
// ============================================================
// Khác lính ở đúng ba chỗ, và cả ba đều do GEN của riêng cá thể đó quyết định:
//   1. Biết SỢ  — tự đọc cục diện quanh mình rồi chọn đánh hay lui (gen braveness)
//   2. Biết CHỈ HUY — phủ hào quang tăng sát thương lên lính xung quanh (gen command)
//   3. Chọn mục tiêu theo THAM VỌNG — đập công trình hay săn người (gen ambition)
// Vì vậy hai anh hùng cùng một bộ lạc, cách nhau vài đời, có thể đánh trận theo
// hai kiểu hoàn toàn khác nhau — thứ chưa từng có ở lính hay dân thường.

// ĐƠN VỊ ĐO SỨC MẠNH DÙNG CHUNG cho mọi quyết định "đánh hay không" của anh hùng.
//
// Cung thủ tính 0,9 (đánh tốt nhưng giòn), máy bắn đá 0,6 (gần như vô hại với
// người). Không cào bằng theo isMilitary: anh hùng đọc cục diện để quyết sống
// chết, mà một đội hình toàn máy bắn đá thì KHÔNG nguy hiểm với anh ta, và đánh
// giá nó ngang bộ binh sẽ làm anh ta bỏ chạy vô cớ.
//
// Tách thành một bảng DÙNG CHUNG chứ không chép vào từng chỗ: bốn quyết định khác
// nhau (lui hay đánh, có đuổi không, có đi dọn hang không, hộ tống mạnh cỡ nào)
// mà cân bằng bốn cái cân khác nhau thì chúng sẽ mâu thuẫn nhau — anh hùng dám đi
// tới một cái hang rồi tới nơi lại thấy "yếu thế" và lui ngay, mãi mãi.
const COMBAT_WEIGHT = { hero: 2.5, soldier: 1, archer: 0.9, catapult: 0.6, knight: 1.9, horsearcher: 1.5 };
function combatWeight(o) {
  if (o.type === 'monster') return o.threat;
  const w = COMBAT_WEIGHT[o.type];
  return w === undefined ? 0.15 : w;
}

// Cân lực lượng trong tầm cảm nhận. Có tính cả công trình phòng thủ: lao thẳng
// vào ổ tháp canh là kiểu chết ngu ngốc nhất, mà nếu chỉ đếm quân thì anh hùng
// sẽ thấy khu vực đó "trống trải".
function heroLocalBalance(u) {
  const R = CONFIG.HERO.SENSE_R;
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((u.x - R) / B), x1 = Math.floor((u.x + R) / B);
  const y0 = Math.floor((u.y - R) / B), y1 = Math.floor((u.y + R) / B);
  let ally = 0, foe = 0;
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o.hp <= 0) continue;
        if (dist(o.x, o.y, u.x, u.y) > R) continue;
        // Cung thủ tính 0,9 (đánh tốt nhưng giòn), máy bắn đá 0,6 (gần như vô hại
        // với người). Không cào bằng theo isMilitary: anh hùng đọc cục diện để
        // quyết sống chết, mà một đội hình toàn máy bắn đá thì KHÔNG nguy hiểm
        // với anh ta, và đánh giá nó ngang bộ binh sẽ làm anh ta bỏ chạy vô cớ.
        const w = combatWeight(o);
        if (o.tribeId === u.tribeId) ally += w; else foe += w;
      }
    }
  }
  for (const b of buildings) {
    if (b.hp <= 0 || !b.done) continue;
    const spec = CONFIG.BUILD[b.type];
    if (!spec.range) continue;
    if (dist(b.x, b.y, u.x, u.y) > R + b.size) continue;
    const w = b.type === 'town' ? 2 : 1.5;
    if (b.tribeId === u.tribeId) ally += w; else foe += w;
  }
  return { ally, foe };
}

// Hào quang chỉ huy — đặt hạn dùng tới TICK SAU, không phải tick này. Lý do:
// các đơn vị được duyệt theo thứ tự mảng, nên một người lính đứng trước anh hùng
// trong mảng sẽ đánh XONG rồi hào quang mới được phủ; nếu hạn dùng chỉ đúng tick
// hiện tại thì nửa đạo quân được buff còn nửa kia không, tuỳ thứ tự ngẫu nhiên.
function applyHeroAura(u) {
  if (u.commandMult <= 1.001) return;
  const R = u.auraR;
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((u.x - R) / B), x1 = Math.floor((u.x + R) / B);
  const y0 = Math.floor((u.y - R) / B), y1 = Math.floor((u.y + R) / B);
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o === u || o.tribeId !== u.tribeId || o.hp <= 0) continue;
        if (!isMilitary(o.type)) continue;
        if (dist(o.x, o.y, u.x, u.y) > R) continue;
        o.auraUntil = tick + 1;
        o.auraMult = u.commandMult;
      }
    }
  }
}

// Chọn giữa "đập công trình" và "chém người" theo gen tham vọng. Cùng một cặp
// mục tiêu, anh hùng tham vọng 0.9 sẽ đi thêm nửa bản đồ để phá trại lính, còn
// anh hùng tham vọng 0.1 quay lại giết người dân ngay cạnh mình.
function heroPickTarget(u, building, enemy) {
  if (!building) return enemy;
  if (!enemy) return building;
  const g = u.genes;
  const db = dist(u.x, u.y, building.x, building.y) * (1.6 - g.ambition * 1.3);
  const de = dist(u.x, u.y, enemy.x, enemy.y) * (0.7 + g.ambition * 0.9);
  return db <= de ? building : enemy;
}

function findNearestOwnSoldier(u) {
  let best = null, bestD = Infinity;
  for (const o of units) {
    if (o.tribeId !== u.tribeId || !isMilitary(o.type) || o.hp <= 0) continue;
    const d = dist(u.x, u.y, o.x, o.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// ============================================================
// ANH HÙNG BIẾT LƯỢNG SỨC — "đi một mình có ăn nổi cái này không"
// ============================================================
// Trước bản này, việc chọn mục tiêu của anh hùng chỉ hỏi ĐÚNG MỘT câu: "cái gì
// gần nhất". Bán kính dọn hang còn nới tới 60 ô theo gen `tham vọng`. Hậu quả đo
// được ở nửa đầu mỗi kỷ nguyên: một anh hùng đời 1 (chỉ số thời đại 1, chưa có
// món đồ nào) đi bộ ba mươi ô tới một hang gấu, đánh một mình, tụt xuống dưới
// ngưỡng máu, rút lui về nhà băng bó, rồi lặp lại. Nó không chết — nên chọn lọc
// cá thể cũng không đọc được gì — nó chỉ không bao giờ làm được việc gì.
//
// Ba cửa mới, và cả ba đều đo bằng CÙNG một thang (xem COMBAT_WEIGHT):
//   1. Sức của chính mình, tính theo máu hiện tại và sát thương thực.
//   2. Sức của quân nhà đang đứng quanh — "có ai đi cùng không".
//   3. Sức của cái hang: tổng threat lũ quái CÒN SỐNG thuộc hang đó + cấp hang.
// Biên an toàn do gen `dũng cảm` quyết định, nên đây không phải là làm anh hùng
// nhát đi: nó là làm cho gen `dũng cảm` CÓ NGHĨA. Trước đây mọi anh hùng đều lao
// vào mọi thứ như nhau rồi mới lui, tức là quyết định nằm ở ngưỡng máu chứ không
// nằm ở gen; giờ kẻ liều nhận những trận mà kẻ nhát bỏ qua.
function heroSelfWeight(u) {
  return COMBAT_WEIGHT.hero
       * (0.35 + 0.65 * clamp(u.hp / u.maxHp, 0, 1))
       * clamp(effAttack(u) / CONFIG.UNIT.HERO.attack, 0.5, 3);
}

// Quân nhà đang ở quanh anh hùng — CHỈ quân sự. Dân thường không đi đánh nhau,
// mà một anh hùng đứng giữa làng thì có bốn chục người dân quanh mình: đếm cả họ
// vào là ra kết luận "ta đông lắm" ở đúng nơi không có lấy một người lính.
function heroEscort(u, R) {
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((u.x - R) / B), x1 = Math.floor((u.x + R) / B);
  const y0 = Math.floor((u.y - R) / B), y1 = Math.floor((u.y + R) / B);
  let w = 0;
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o === u || o.hp <= 0 || o.tribeId !== u.tribeId) continue;
        if (!isMilitary(o.type)) continue;
        if (dist(o.x, o.y, u.x, u.y) > R) continue;
        w += combatWeight(o);
      }
    }
  }
  return w;
}

// Bảng tình báo hang ổ, dựng ĐÚNG MỘT LẦN mỗi tick cho toàn bộ bản đồ.
//
// Kiểu ngây thơ là để mỗi anh hùng tự quét: 4 anh hùng × 9 hang × 300 đơn vị =
// hơn mười nghìn phép so sánh mỗi tick, và nó tăng theo TÍCH của ba con số đó —
// đúng thứ đã làm tụt khung hình ở Phase 3.3. Gộp lại thành một lượt duyệt duy
// nhất thì chi phí không phụ thuộc vào số anh hùng đang hỏi.
let lairIntelTick = -1, lairIntelMap = null;
const LAIR_HELP_R = 14;
function lairIntel() {
  if (lairIntelTick === tick) return lairIntelMap;
  lairIntelTick = tick;
  lairIntelMap = new Map();
  for (const l of lairs) {
    if (l.hp > 0) lairIntelMap.set(l.id, { threat: 1 + l.tier * 1.2, help: [0, 0, 0, 0] });
  }
  if (!lairIntelMap.size) return lairIntelMap;
  for (const o of units) {
    if (o.hp <= 0) continue;
    if (o.type === 'monster') {
      const e = lairIntelMap.get(o.lairId);
      if (e) e.threat += o.threat;
      continue;
    }
    if (o.tribeId < 0 || !isMilitary(o.type)) continue;
    for (const l of lairs) {
      if (l.hp <= 0) continue;
      if (dist(o.x, o.y, l.x, l.y) > LAIR_HELP_R) continue;
      const e = lairIntelMap.get(l.id);
      if (e) e.help[o.tribeId] += combatWeight(o);
    }
  }
  return lairIntelMap;
}

// Chọn hang để đi dọn — hoặc null nếu không hang nào đáng.
function heroPickLair(u, g, escort) {
  const intel = lairIntel();
  if (!intel.size) return null;
  const R = 20 + (g.greed + g.ambition) * 40;
  const self = heroSelfWeight(u);
  // 1,9 (nhát) .. 1,1 (liều). Trên 1 ở cả hai đầu vì quái được đánh trên SÂN NHÀ
  // của chúng: hang nhả thêm quái trong lúc đánh, nên ngang sức là thua.
  const margin = 1.9 - g.braveness * 0.8;
  let best = null, bestSc = -Infinity;
  for (const l of lairs) {
    if (l.hp <= 0) continue;
    const d = dist(u.x, u.y, l.x, l.y);
    if (d > R) continue;
    const e = intel.get(l.id);
    if (!e) continue;
    // Quân nhà ĐANG đứng ở hang đó tính vào cả hai vế: nó vừa là lực lượng thật,
    // vừa là lý do nên chọn hang này thay vì mở một mặt trận thứ hai một mình.
    const help = e.help[u.tribeId];
    if (self + escort + help < e.threat * margin) continue;
    const sc = help * 4 - d * 0.2;
    if (sc > bestSc) { bestSc = sc; best = l; }
  }
  return best;
}

// "Có đáng đuổi theo cái này không" cho lượt quét TẦM XA. Lượt quét sát sườn
// (bán kính 3) KHÔNG đi qua đây: bị chém thì luôn đánh trả, không lượng sức.
function heroDareChase(u, o, escort, g) {
  const w = combatWeight(o);
  if (w <= 1.2) return true;                 // dân, lính lẻ, sói — không cần cân nhắc
  const margin = 1.6 - g.braveness * 0.7;
  return heroSelfWeight(u) + escort >= w * margin;
}

function heroRetreat(u, tribe) {
  // ĐÁNH TRẢ KẺ ĐANG BÁM SÁT LƯNG. Bản cũ đặt `combatTarget = null` rồi return
  // vô điều kiện, nghĩa là một anh hùng đang lui thì đứng yên cho người ta chém
  // suốt cả quãng đường về — mà chính điều đó lại kéo máu xuống, và máu thấp là
  // điều kiện GIỮ anh ta trong trạng thái rút lui. Trạng thái tự nuôi lấy nguyên
  // nhân của nó: đó là hình dạng của mọi ca "kẹt" trong file này.
  //
  // Bán kính 1,5 = đúng tầm với cận chiến, không hơn. Rộng hơn thì "rút lui" biến
  // thành "vừa chạy vừa đuổi đánh" và cả gen `dũng cảm` mất hết ý nghĩa.
  const biter = findNearestEnemyUnit(u.x, u.y, u.tribeId, 1.5);
  u.combatTarget = biter || null;
  if (biter && u.cooldown === 0) {
    dealDamage(u, biter, false);
    u.cooldown = CONFIG.UNIT.ATTACK_COOLDOWN;
  }
  const d = dist(u.x, u.y, tribe.home.x, tribe.home.y);
  if (d > 4 && u.speed > 0) {
    const W = CONFIG.GRID_WIDTH;
    const fv = tribe.homeField ? tribe.homeField[u.y * W + u.x] : -1;
    if (fv > 0) stepDownField(u, tribe.homeField);
    else moveToward(u, tribe.home.x, tribe.home.y);
  }
  // Về được tới đất nhà thì băng bó. Chính cơ chế hồi máu này làm cho "hèn nhát"
  // trở thành một chiến lược SỐNG ĐƯỢC chứ không chỉ là trì hoãn cái chết — và
  // đó là điều kiện cần để chọn lọc cá thể có cái mà ưa chuộng.
  //
  // Hồi theo % máu tối đa (có sàn tuyệt đối) chứ không theo một lượng cố định —
  // xem CONFIG.HERO.HEAL_FRAC để biết vì sao con số cũ chính là nguyên nhân của
  // "anh hùng đứng im giữa sân nhà nửa đời người".
  if (d <= CONFIG.HERO.HEAL_RANGE && u.hp < u.maxHp) {
    if (!findNearestEnemyUnit(u.x, u.y, u.tribeId, CONFIG.HERO.HEAL_BLOCK_R)) {
      const rate = Math.max(CONFIG.HERO.HEAL_RATE, u.maxHp * CONFIG.HERO.HEAL_FRAC);
      u.hp = Math.min(u.maxHp, u.hp + rate);
    }
  }
}

function tickHero(u, tribe) {
  if (u.cooldown > 0) u.cooldown--;

  // Chết già. Đặt ở đầu hàm và đi qua hp = 0 như mọi cái chết khác, để vòng dọn
  // xác trong simulationTick gọi onHeroDeath() đúng một lần — không tự gọi ở đây,
  // nếu không dòng dõi sẽ được ghi sổ hai lần cho cùng một người.
  if (tick - u.born >= CONFIG.HERO.MAX_AGE) {
    u.hp = 0;
    logEvent(`🕯 Anh hùng ${u.name} của ${tribe.name} qua đời vì tuổi già`, tribe.color, true);
    return;
  }

  // Tốc độ phân số: rút phần nguyên ra khỏi tín dụng tích luỹ (xem spawnUnit).
  u.speedCredit += u.speedMult;
  u.speed = Math.floor(u.speedCredit);
  u.speedCredit -= u.speed;

  applyHeroAura(u);

  const g = u.genes;
  const bal = heroLocalBalance(u);
  const ratio = (bal.ally + 1) / (bal.foe + 1);
  const hpFrac = u.hp / u.maxHp;
  // Hộ tống: tính MỘT LẦN mỗi tick rồi dùng cho cả ba quyết định lượng sức bên
  // dưới (đuổi, dọn hang, và — gián tiếp — bám lấy quân nhà khi rảnh). Ba chỗ mà
  // tự đếm lại thì vừa tốn ba lượt quét lưới, vừa mở đường cho ba con số lệch nhau.
  const escort = heroEscort(u, 12);
  // braveness = 1 -> dám đánh cả khi yếu hơn 5 lần, đánh tới lúc còn 15% máu.
  // braveness = 0 -> phải áp đảo 1.7 lần mới đánh, và lui ngay khi xuống 60% máu.
  const needRatio = 1.7 - g.braveness * 1.5;
  const hpFloor = 0.6 - g.braveness * 0.45;

  // Trễ (hysteresis) hai chiều: đã lui thì phải khoẻ hơn HẲN ngưỡng mới quay lại.
  // Không có nó, anh hùng đứng đúng ranh giới sẽ tiến-lui liên tục mỗi tick và
  // trông như bị co giật giữa chiến trường.
  //
  // BA cửa ra thay vì một, và hai cửa mới đều được thêm sau khi đo cùng một triệu
  // chứng: "anh hùng rút lui mãi không quay lại". Cửa cũ đòi ĐỒNG THỜI hồi đủ máu
  // và cục diện đã lật — hai điều kiện mà chính việc rút lui có thể làm cho vĩnh
  // viễn sai (không đánh thì cục diện không lật; bị vây thì không hồi được máu).
  const homeD = dist(u.x, u.y, tribe.home.x, tribe.home.y);
  if (u.retreating) {
    if (hpFrac > hpFloor + 0.3 && ratio >= needRatio) {
      u.retreating = false;
    } else if (homeD <= CONFIG.HERO.HEAL_RANGE + 2 && hpFrac >= 0.9) {
      // CÙNG ĐƯỜNG Ở SÂN NHÀ. Đứng ngay cạnh kinh đô, máu gần đầy, mà vẫn "lui"
      // thì lui đi đâu nữa? Ở đây có tháp canh, có kinh đô bắn trả, có cả quân
      // mình — nếu không đánh ở chỗ này thì không có chỗ nào đáng đánh hơn. Đây
      // là cửa chữa đúng cảnh người xem thấy: tướng đứng giữa làng đang cháy.
      u.retreating = false;
    } else if (tick - u.retreatSince > CONFIG.HERO.MAX_RETREAT) {
      // Hết kiên nhẫn — đường bỏ cuộc bắt buộc, cùng luật với dân đi hái và lính
      // truy đuổi. Khoá không cho lui lại ngay, nếu không thì tick sau điều kiện
      // vào lại vẫn đúng y nguyên và việc "bỏ cuộc" không đổi được gì cả.
      u.retreating = false;
      u.retreatBlockUntil = tick + CONFIG.HERO.RETREAT_COOLDOWN;
    }
  } else if (bal.foe > 0 && (ratio < needRatio || hpFrac <= hpFloor)
             && tick >= u.retreatBlockUntil) {
    u.retreating = true;
    u.retreatSince = tick;
  }
  if (u.retreating) { heroRetreat(u, tribe); return; }

  tryPickUpItems(u);

  let target = u.combatTarget;
  if (!target || target.hp <= 0) target = null;

  // Báo động trọng yếu huỷ mục tiêu đang đánh dở — y hệt lính, xem khối chú thích
  // dài ở đầu tickSoldier. Với anh hùng thì nó còn cần hơn: anh hùng bám mục tiêu
  // DAI hơn lính (bán kính dọn hang tới 60 ô theo gen `tham vọng`), nên xác suất
  // anh ta tình cờ rảnh tay đúng lúc Kỳ quan bị đánh gần như bằng không.
  const alarmB = defendPick(u, tribe);
  const critical = alarmB && defenseWeight(alarmB) >= CONFIG.DEFENSE.CRITICAL;
  if (critical && target) {
    if (target.size !== undefined) {
      if (!(target.maxHp && target.hp <= target.maxHp * FINISH_HP_FRAC)) target = null;
    } else if (cheb(u.x, u.y, target.x, target.y) > 3) {
      target = null;
    }
  }

  // Y hệt lính: đang đập hang mà quái vây quanh thì quay ra chém quái trước. Anh
  // hùng cần điều này hơn cả lính — nó đi một mình, đắt, và là thứ cả một vòng
  // tiến hoá riêng đang chọn lọc, nên chết vì đứng gõ cửa hang là mất mát kép.
  target = preemptBuildingTarget(u, target, 3);
  if (!target) target = findNearestEnemyUnit(u.x, u.y, u.tribeId, 3);

  // NHÀ ĐANG BỊ ĐÁNH -> về cứu. Đặt TRÊN cả việc đi nhặt đồ, và đó là chỗ quan
  // trọng nhất của cả khối này: nhánh nhặt đồ bên dưới `return` ngay, nên bất cứ
  // thứ gì xếp sau nó đều không chạy khi có một món đồ nằm trong bán kính tham
  // lam. Xếp sai một nấc ở đây là anh hùng đi lượm kiếm trong lúc Kỳ quan sập.
  let defendSpot = null;
  if (!target && alarmB) {
    if (dist(u.x, u.y, alarmB.x, alarmB.y) <= CONFIG.DEFENSE.ENGAGE_R) {
      target = findNearestEnemyUnit(alarmB.x, alarmB.y, u.tribeId, CONFIG.DEFENSE.ENGAGE_R);
    }
    if (!target) defendSpot = alarmB;
  }

  // Đi nhặt đồ. Đặt SAU "địch sát sườn" và TRƯỚC mọi thứ khác: không ai cúi xuống
  // nhặt kiếm khi đang bị chém, nhưng một món đồ cách 30 ô thì đáng bỏ dở việc
  // hành quân. Bán kính chịu đi vòng do gen `tham lam` quyết định — và đó chính
  // là chỗ gen này phải trả giá: đường đi lấy đồ dẫn ra xa quân nhà.
  // `|| canFuse(u)` — hòm đầy KHÔNG còn là dấu chấm hết. Còn nung được một cặp thì
  // vẫn còn chỗ cho món tiếp theo, nên vẫn đáng đi lấy. Không có nửa vế này thì cơ
  // chế hợp nhất tồn tại mà anh hùng không bao giờ chủ động dùng tới nó: nó chỉ
  // kích hoạt khi tình cờ có món rơi trong bán kính 2,5 ô.
  if (!target && !defendSpot && tick >= u.itemGiveUpUntil
      && (u.items.length < CONFIG.ITEM.MAX_HELD || canFuse(u))) {
    // Sàn bán kính nhặt nâng 6->10: "cúi nhặt chiến lợi phẩm" là việc anh hùng nào
    // cũng làm, không cần gen `tham lam` cao. Greed vẫn giữ nguyên ĐỘ TRẢI của nó
    // (10..54 thay vì 6..52) nên nó vẫn là gen quyết định có đi đường VÒNG XA vì đồ
    // hay không — cái đánh đổi mà gen này tồn tại để có.
    const it = findNearestGroundItem(u.x, u.y, 10 + g.greed * 44);
    if (it) {
      // PHẢI có đường bỏ cuộc. Anh hùng đi tới vật phẩm bằng pathfinding THAM LAM
      // (không có flow field cho đồ rơi vãi), nên một món đồ bên kia hồ sẽ khiến
      // anh hùng ép mặt vào bờ nước tới hết đời — và vì nhánh này `return` ngay,
      // nó chặn luôn mọi việc khác: không đánh, không về, không dọn hang. Đo thật
      // ở bản đầu: anh hùng đứng im 6.000 tick với 0 mạng, 0 vật phẩm.
      // Đo theo KỶ LỤC, không theo tick trước — xem noProgress để biết vì sao.
      // Bản cũ ở đây so `d` với `d` của tick liền trước, tức đúng con lỗi đã làm
      // chết bốn chỗ kia, chỉ khác tên biến (`itemStuck`, không phải `stuck`) nên
      // nó sống sót qua lần rà đầu tiên. Và đây là chỗ ĐẮT NHẤT để mắc nó: nhánh
      // `return` ngay bên dưới chặn mọi việc khác, nên một anh hùng dao động cạnh
      // món đồ không nhặt được thì không đánh, không lui, không dọn hang — nó chỉ
      // giật qua giật lại giữa đồng cho tới hết đời, đúng thứ nhìn ra màn hình là
      // "tướng bị kẹt".
      const d = dist(u.x, u.y, it.x, it.y);
      if (u.itemSeekId !== it.id) { u.itemSeekId = it.id; u.itemBestD = d; u.itemStuck = 0; }
      else if (d < u.itemBestD - 0.01) { u.itemBestD = d; u.itemStuck = 0; }
      else u.itemStuck++;
      if (u.itemStuck > 45) {
        u.itemStuck = 0;
        u.itemSeekId = null;
        u.itemGiveUpUntil = tick + 700;
      } else {
        if (u.speed > 0) moveToward(u, it.x, it.y);
        u.combatTarget = null;
        return;
      }
    }
  }

  if (!target && !defendSpot) {
    const intruder = homeIntruder(tribe);
    if (intruder) target = intruder;
  }

  // Hành quân chinh phạt: y hệt lính — trường dẫn đường chỉ dùng để ĐI, mục tiêu
  // luôn nhận lại TẠI CHỖ khi tới nơi. Đây là cái bẫy đã ba lần làm chết mô phỏng
  // (trường luôn dẫn tới cái gần nhất, còn mục tiêu ghi nhớ lại là một cái khác).
  if (!target && !defendSpot && tribe.warTarget !== null && tribe.warField
      && tribe.warFieldTarget === tribe.warTarget) {
    const W = CONFIG.GRID_WIDTH;
    const fv = tribe.warField[u.y * W + u.x];
    if (fv > 2) {
      // Anh hùng cũng phải giữ hàng — và với anh ta thì nó QUAN TRỌNG HƠN cả với
      // lính. Anh hùng đi nhanh nhất trong quân (gen `vigor`, cộng thêm Ngựa
      // chiến), nên ở bản cũ anh ta luôn là kẻ tới trước, một mình, giữa toàn bộ
      // quân địch. Hào quang chỉ huy — lý do tồn tại của gen `command` — buff
      // đúng số không người, vì không có ai kịp theo.
      //
      // Ngưỡng chờ của anh hùng nới thêm theo `braveness`: kẻ liều vẫn được phép
      // dẫn trước xa hơn kẻ nhát. Đây là chỗ gen cấp CÁ THỂ và gen cấp BỘ LẠC
      // cùng viết vào một quyết định — và chúng có thể mâu thuẫn nhau, đúng thứ
      // multi-level selection mà cả cơ chế anh hùng sinh ra để cho xem.
      if (u.speed > 0) {
        const line = tribe.armyLine;
        const lead = 4 + (1 - tribe.policy.discipline) * 26 + g.braveness * 10;
        if (line > 0 && fv < line - lead) stepUpField(u, tribe.warField);
        else stepDownField(u, tribe.warField);
      }
      u.combatTarget = null;
      return;
    }
    target = heroPickTarget(u,
      findNearestEnemyBuilding(u.x, u.y, u.tribeId, tribe.warTarget),
      findNearestEnemyUnitOfTribe(u.x, u.y, tribe.warTarget));
  }

  // `tick >= u.chaseBlockedUntil` — anh hùng thiếu đúng một dòng này so với lính, và
  // đó là nửa còn lại của lỗi "kẹt ở góc". Nhánh dưới cùng hàm ĐÃ biết bỏ mục tiêu khi
  // `u.stuck > 30`, nhưng bỏ xong thì tick ngay sau đó hai lượt quét này nhặt lại ĐÚNG
  // cái mục tiêu vừa bỏ — nó vẫn là thứ gần nhất theo đường chim bay, kể cả khi nó nằm
  // bên kia hồ. Việc "bỏ cuộc" vì thế không đổi được gì cả. Lính đã có nghỉ truy đuổi
  // 240 tick từ lâu (xem tickSoldier); anh hùng thì không, và anh hùng lại là đơn vị
  // duy nhất có speed 2 nên cũng là đơn vị duy nhất không tự trượt ra khỏi bờ nước được.
  // Hai thiếu sót gặp nhau thành một anh hùng đứng ép mặt vào hồ tới hết kỷ nguyên.
  //
  // KHÔNG chặn lượt quét bán kính 3 ở đầu hàm: bị chém sát sườn thì luôn đánh trả,
  // nghỉ truy đuổi không bao giờ có nghĩa là đứng yên cho người ta giết.
  // Lượt quét TẦM XA giờ có lượng sức: chỉ đuổi thứ mình ăn nổi. Không có cửa này
  // thì một anh hùng đời 1 thấy con gấu cách 16 ô là đi, và cả nửa đầu kỷ nguyên
  // của anh ta là một vòng lặp đánh-lui-băng bó-đánh lại. Xem heroDareChase.
  if (!target && !defendSpot && tick >= u.chaseBlockedUntil) {
    const foe = findNearestEnemyUnit(u.x, u.y, u.tribeId, CONFIG.UNIT.SOLDIER_VISION + 4);
    if (foe && heroDareChase(u, foe, escort, g)) target = foe;
  }

  // Dọn hang ổ — xếp SAU lượt quét đơn vị ở trên để anh hùng giết đám quái canh
  // hang trước rồi mới đập hang, chứ không đứng gõ cửa hang giữa một bầy sói.
  // Và giờ chọn hang theo SỨC, ưu tiên hang quân nhà đã có mặt (xem heroPickLair).
  if (!target && !defendSpot && tick >= u.chaseBlockedUntil) {
    const lair = heroPickLair(u, g, escort);
    if (lair) target = lair;
  }

  u.combatTarget = target;

  if (!target) {
    // Đang được triệu về cứu nhà thì đi thẳng về đó — trên cả trạm xá, y như lính.
    if (defendSpot) {
      if (dist(u.x, u.y, defendSpot.x, defendSpot.y) > defendSpot.size + 1.5) {
        marchToDefend(u, tribe, defendSpot);
      }
      return;
    }
    // Kiệt sức thì về trạm xá, y như lính. Anh hùng vốn đã tự hồi máu khi đứng
    // trên đất nhà (HERO.HEAL_RATE), nhưng nhà y tế nhanh gấp đôi và không đòi
    // phải về tận kinh đô — với một đơn vị mà cái chết khép lại cả một thế hệ
    // tiến hoá, rút ngắn quãng đường về là thứ đáng giá nhất.
    if (seekMedic(u, tribe)) return;
    // Thời bình thì bám lấy quân mình chứ không đứng riêng một góc: hào quang chỉ
    // huy chỉ có giá trị khi có người đứng trong đó.
    const mate = findNearestOwnSoldier(u);
    const gx = mate ? mate.x : tribe.rally.x;
    const gy = mate ? mate.y : tribe.rally.y;
    // Qua walkHome chứ không moveToward thẳng: y hệt lỗi ba cung thủ kẹt trước dải
    // rừng, chỉ khác là anh hùng đi một mình nên nhìn ra màn hình còn rõ hơn. Khi ở
    // xa nhà thì trường dẫn về nhà — mà quân mình cũng đang tập kết ở đó — nên nó
    // không mâu thuẫn với ý đồ "bám lấy quân mình" của nhánh này.
    if (dist(u.x, u.y, gx, gy) > 4 && u.speed > 0) walkHome(u, tribe, gx, gy);
    return;
  }

  const isBuilding = target.size !== undefined;
  const reach = isBuilding ? target.size : 1;
  if (cheb(u.x, u.y, target.x, target.y) <= reach) {
    u.stuck = 0;
    if (u.cooldown === 0) {
      dealDamage(u, target, isBuilding);
      u.cooldown = CONFIG.UNIT.ATTACK_COOLDOWN;
    }
  } else if (u.speed > 0) {
    moveToward(u, target.x, target.y);
    if (noProgress(u, target.id, dist(u.x, u.y, target.x, target.y), 30)) {
      u.stuck = 0;
      u.combatTarget = null;
      u.chaseBlockedUntil = tick + 240;   // nghỉ truy đuổi, y hệt lính — xem chú thích trên
    }
  }
}

// Fitness của một CÁ THỂ anh hùng — hai cách tính, và cả trò chơi trí tuệ nằm
// ở chỗ chúng không cùng chỉ về một hướng.
function heroFitness(u, lifespan) {
  if (CONFIG.HERO.FITNESS_MODE === 'tribe') {
    return u.heroKills * 2 + u.heroRazed * 20 + lifespan / 400;
  }
  return lifespan / 100 + u.heroKills * 0.5;
}

function onHeroDeath(u) {
  const tribe = tribes[u.tribeId];
  const line = tribe.heroLine;
  const lifespan = tick - u.born;
  const fitness = heroFitness(u, lifespan);

  line.history.push({ gen: u.heroGen, genes: u.genes, fitness, lifespan, kills: u.heroKills, razed: u.heroRazed });
  if (line.history.length > 40) line.history.shift();
  line.braveTrend.push(u.genes.braveness);
  if (line.braveTrend.length > 60) line.braveTrend.shift();

  if (!line.best || fitness > line.best.fitness) {
    line.best = { genes: u.genes, fitness, gen: u.heroGen };
  }
  line.genes = mutateHeroGenes(line.best.genes);
  tribe.heroCooldownUntil = tick + CONFIG.HERO.RESPAWN_DELAY;
  addHotspot(u.x, u.y, 6, `${u.name} ngã xuống`);

  // Đồ đạc rơi lại. Đây là chỗ luật chơi nói thẳng ra điều quan trọng nhất của cả
  // hệ thống: GEN thì truyền cho đời sau, VẬT PHẨM thì không. Người kế nhiệm thừa
  // hưởng tính cách của tổ tiên nhưng phải tự đi nhặt lại thanh đao — hoặc để bộ
  // lạc khác nhặt mất.
  //
  // NGOẠI LỆ cho THÁNH VẬT — và nó không tuỳ tiện mà theo ĐỊA LÝ nơi ngã xuống:
  //   · Ngã trên ĐẤT NHÀ  → thánh vật được đưa về đền (enshrinedRelics), đời sau
  //     thừa kế. Thánh vật là di sản của cả nền văn minh, không phải đồ nghề cá nhân
  //     — nên trên đất nhà nó không lăn lóc giữa đồng chờ tan biến, mà về đền.
  //   · Ngã trên ĐẤT ĐỊCH/HOANG → rơi thành chiến lợi phẩm tranh chấp tại chỗ, y
  //     như đồ thường. "Chết trên đất nó thì nó nhặt được" là cái giá THOẢ ĐÁNG về
  //     nghĩa — thánh vật thất lạc đúng nơi người mang nó gục xuống.
  // Đồ nghề thường (đao/giáp/giày/cờ) thì luôn rơi vãi tại chỗ, không đổi.
  const C = CONFIG.TERRITORY.CELL;
  const onHomeSoil = terrOwnerAt(Math.floor(u.x / C), Math.floor(u.y / C)) === u.tribeId;
  for (const it of u.items) {
    if (it.key === 'relic' && onHomeSoil && tribe.enshrinedRelics.length < CONFIG.ITEM.MAX_HELD) {
      // Cấp đi theo món vào tận đền: một Thánh vật III mà đời sau nhận lại thành
      // cấp 1 thì cả công nung của người trước bị xoá đúng ở chỗ mà cơ chế này
      // sinh ra để KHÔNG xoá — "di sản của cả nền văn minh".
      tribe.enshrinedRelics.push({ key: it.key, lv: it.lv || 1 });
      const tag = it.lv > 1 ? ' ' + CONFIG.ITEM.LEVEL_TAG[it.lv] : '';
      logEvent(`💎 Thánh vật${tag} của ${u.name} được rước về đền ${tribe.name}`, tribe.color, true);
    } else {
      dropItem(u.x + Math.round(randRange(-2, 2)), u.y + Math.round(randRange(-2, 2)), it.key, it.lv);
    }
  }
}

