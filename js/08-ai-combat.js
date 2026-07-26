'use strict';
// ============================================================
// 08-ai-combat.js
// ------------------------------------------------------------
// Sát thương và chỉ số hiệu dụng (effAttack/effDefense đã cộng nâng cấp + hào
// quang), đòn tầm xa, và não lính thường.
// Tách cơ học từ civilization.html một-file, dòng 4244–4670.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Lính
// ============================================================
// Sát thương thực = sát thương gốc x hào quang chỉ huy đang phủ lên mình (nếu có).
// Cố tình KHÔNG cộng thẳng vào u.attack: hào quang phải TẮT ngay khi anh hùng
// chết hoặc đi chỗ khác, mà buff cộng dồn vào chỉ số gốc thì không có đường lùi
// — sau vài trăm tick cả đạo quân sẽ mạnh vĩnh viễn dù tướng đã chết từ lâu.
// ------------------------------------------------------------------
// NÂNG CẤP — tra cứu, và vì sao nó KHÔNG được nướng thẳng vào u.attack
//
// Cả hai hàm dưới đây chạy trên đường đi nóng nhất của mô phỏng, và cách rẻ hơn
// hiển nhiên là cộng một lần vào chỉ số của đơn vị lúc nghiên cứu xong. Không làm
// thế vì đúng một lý do, và nó là lý do đắt: nướng vào chỉ số thì mỗi đơn vị mang
// một "ảnh chụp" bảng nâng cấp tại thời điểm nó được cộng. Chỉ cần MỘT đường sinh
// đơn vị quên gọi hàm cộng (quân cứu hộ, quân của sóng, quân hồi sinh) là loại đó
// vĩnh viễn thiếu nâng cấp mà không có lỗi nào để lần theo — cùng một họ với lỗi
// hào quang cộng dồn đã chú thích ở effAttack. Tra tại chỗ thì bảng nâng cấp là
// NGUỒN SỰ THẬT DUY NHẤT, và mọi đơn vị đọc nó đều đọc được bản mới nhất.
//
// Chi phí thật: hai phép tra mảng cho mỗi đòn đánh. Bảng cộng dồn được tính lại
// đúng một lần mỗi khi nghiên cứu xong (xem applyUpgrade), nên ở đây không có
// vòng lặp nào chạy qua 5 nhánh.
// ------------------------------------------------------------------
function upgradeBonus(u) {
  if (u.tribeId < 0) return null;              // quái vật không có bộ lạc để tra
  const t = tribes[u.tribeId];
  return t && t.upBonus ? t.upBonus[u.type] : null;
}

// Giáp thực = giáp gốc + nhánh "Giáp trụ"/"Mã thuật". Không nhân với hào quang
// hay phước lành: cả hai đều là buff TẤN CÔNG theo thiết kế, và cho chúng chạm
// vào giáp nữa sẽ khiến một anh hùng đứng gần biến cả đội thành bất khả xâm phạm.
function effDefense(u) {
  const b = upgradeBonus(u);
  return (u.defense || 0) + (b ? b.def : 0);
}

function effAttack(u) {
  const b = upgradeBonus(u);
  const base = u.attack + (b ? b.atk : 0);
  let a = u.auraUntil >= tick ? base * u.auraMult : base;
  // Phước "ban sức mạnh" đi đúng đường ống này, không cộng vào u.attack — cùng lý
  // do với hào quang chỉ huy ở trên: buff có hạn mà cộng thẳng vào chỉ số gốc thì
  // không có đường lùi khi hết hạn.
  if (u.tribeId >= 0) {
    const t = tribes[u.tribeId];
    if (t && t.blessKind === 'might' && t.blessUntil >= tick) a *= t.blessAtk || 1;
  }
  return a;
}

// opts.fx  : 'slash' (mặc định) | 'arrow' | 'rock' | 'none'
// opts.mult: hệ số nhân sát thương (sát thương lan của máy bắn đá dùng 0,5)
//
// Vì sao nhét cả tầm xa lẫn sát thương lan vào ĐÚNG hàm này thay vì viết hàm mới:
// toàn bộ sổ sách của một cú chết nằm ở nửa dưới — chiến công của anh hùng, số mạng
// của bộ lạc, phá hang, sập nhà, dòng nhật ký "san phẳng KINH ĐÔ". Một hàm bắn tên
// riêng sẽ phải chép lại tất cả, và bản chép sẽ lệch dần khỏi bản gốc từ lần sửa
// thứ hai trở đi.
function dealDamage(attacker, target, isBuilding, opts) {
  const o = opts || {};
  const kind = o.fx || 'slash';
  const bMult = attacker.type === 'monster' ? CONFIG.MONSTER.BUILD_DMG : CONFIG.UNIT.BUILDING_DAMAGE_MULT;
  const mult = (isBuilding ? bMult : 1) * (o.mult === undefined ? 1 : o.mult);
  // Giáp trừ SAU khi đã nhân mọi hệ số (hào quang, phước, sát thương lan), không
  // phải trước. Trừ trước thì sát thương lan của máy bắn đá — vốn đã nhân 0,5 —
  // sẽ bị trừ nguyên một suất giáp trên một đòn đã yếu sẵn, và mọi mảnh văng ra
  // rìa vụ nổ đều rơi thẳng xuống sàn 25% bất kể đối phương mặc gì. Trừ sau thì
  // giáp giữ đúng nghĩa "mỗi cú chạm vào người tôi bị bớt ngần này".
  let dmg = effAttack(attacker) * mult;
  if (!isBuilding) dmg = Math.max(dmg * CONFIG.UNIT.ARMOR_FLOOR, dmg - effDefense(target));
  target.hp -= dmg;
  // BÁO ĐỘNG PHÒNG THỦ đóng dấu ở đây và chỉ ở đây. Đặt tại cửa chung của mọi sát
  // thương nghĩa là đòn thường, sát thương lan của máy bắn đá, đòn của quái vật và
  // đòn của tháp canh đều tính như nhau — không có kiểu tấn công nào lọt qua mà
  // không báo động. `tribeId >= 0` loại hang ổ quái (tribeId = -1) ra ngoài: hang
  // cũng có `size` nên isBuilding = true, nhưng nó không thuộc bộ lạc nào để cứu.
  if (isBuilding && target.tribeId >= 0) target.hitTick = tick;
  // Chớp trắng khi ăn đòn — tính bằng FRAME ẢO, tàn theo thời gian thật (xem
  // updateRenderPositions). Đây là phản hồi rẻ nhất mà đắt giá nhất: trước bản
  // này, nhìn hai đám quân chồng lên nhau thì không đọc nổi AI đang ăn đòn, chỉ
  // đọc được là "có đánh nhau ở đâu đó trong đống này".
  target.flash = 9;
  // tribeId = -1 là quái vật, không thuộc bộ lạc nào — mọi chỗ tra tribes[] từ
  // đây trở xuống đều phải đi qua cửa này.
  const owner = attacker.tribeId >= 0 ? tribes[attacker.tribeId] : null;
  const teamColor = owner ? owner.color : '#a86ac6';
  if (kind === 'slash') {
    addFx({ type: 'slash', x1: attacker.x, y1: attacker.y, x2: target.x, y2: target.y, life: 7, maxLife: 7, color: teamColor });
    // Lao người sau cú chém — chỉ dành cho cận chiến. Quân tầm xa mà lao lên thì
    // hình ảnh nói ngược lại chính cơ chế đang muốn cho người xem thấy.
    attacker.lungeUntil = tick + 4;
    // Đóng dấu thời gian cho CÚ VUNG (xem swingChop). Đo bằng aTick — đồng hồ hình,
    // 60 khung ảo/giây — chứ không bằng tick: một cú vung dài 4 tick ở 12 tick/s là
    // một phần ba giây, còn ở 600 tick/s là 7 phần nghìn giây. Cùng một hằng số mà
    // ra hai thứ khác hẳn nhau thì nó không phải hằng số của hoạt ảnh.
    attacker.swingAt = aTick;
  } else if (kind === 'arrow') {
    addFx({ type: 'arrow', x1: attacker.x, y1: attacker.y, x2: target.x, y2: target.y, life: 9, maxLife: 9, color: teamColor });
  } else if (kind === 'rock') {
    addFx({ type: 'rock', x1: attacker.x, y1: attacker.y, x2: target.x, y2: target.y, life: 16, maxLife: 16, color: teamColor });
  }
  if (kind !== 'none') {
    // Tia lửa va chạm mang HƯỚNG ĐÁNH (attacker -> target), nên nó bắn tới trước
    // đúng chiều cú đòn thay vì toả đều — cùng một dữ kiện, đọc ra "ai đánh ai".
    const hitDir = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    addFx({ type: 'spark', x: target.x, y: target.y, life: 8, maxLife: 8,
            color: isBuilding ? '#e09a3c' : '#e07a56', dir: hitDir, seed: (tick + (target.id || 0)) % 97 });
    lastWarSpot = { x: target.x, y: target.y };
    // Hang ổ cũng có `size` nên isBuilding = true, nhưng nó KHÔNG nằm trong
    // CONFIG.BUILD — tra thẳng vào đó là `undefined.label` và cả mô phỏng dừng.
    addHotspot(target.x, target.y, isBuilding ? 4 : 1,
      target.isLair ? 'Đánh hang ổ'
      : isBuilding ? `Vây thành ${CONFIG.BUILD[target.type].label}`
      : 'Giao tranh');
  }
  if (target.hp <= 0) {
    if (owner) owner.kills++;
    // Chiến lợi phẩm chảy ngược về hang đã nuôi ra kẻ giết. Đặt ở đây — cửa duy
    // nhất mà mọi cái chết trong game đi qua — nên đòn thường, sát thương lan của
    // Chúa Hang và đòn bắn của Bóng ma đều được tính, không cần ba chỗ nhớ riêng.
    if (attacker.type === 'monster' && attacker.lairId >= 0 && !target.isLair) {
      feedLair(attacker, target, isBuilding);
    }
    // Chiến công ghi vào SỔ RIÊNG của cá thể anh hùng — đây chính là số liệu mà
    // chế độ chọn lọc 'tribe' dùng làm fitness, nên nó phải là công của riêng
    // người đó, không phải tổng của cả bộ lạc.
    if (attacker.type === 'hero') {
      if (target.isLair) attacker.heroRazed += 3;      // phá hang đáng giá hơn hẳn một căn nhà
      else if (isBuilding) attacker.heroRazed++;
      else attacker.heroKills++;
    }

    if (target.isLair) { onLairDestroyed(target, attacker); return; }

    // Bột màu văng ra khi một QUÂN ngã (không phải công trình — nhà có khói/lửa
    // sập riêng). Anh hùng ngã thì quầng to hơn và ngả vàng: một dòng dõi vừa
    // đứt, khoảnh khắc đó đáng được nhìn thấy từ xa.
    if (!isBuilding) {
      const isHero = target.type === 'hero';
      const vc = isHero ? '#f0cf85' : target.tribeId >= 0 ? tribes[target.tribeId].color : '#b783cc';
      addFx({ type: 'death', x: target.x, y: target.y,
              life: isHero ? 30 : 22, maxLife: isHero ? 30 : 22, color: vc,
              scale: isHero ? 1.8 : isMilitary(target.type) ? 1.15 : 0.92,
              seed: (tick + (target.id || 0)) % 97 });
    }

    if (isBuilding) {
      destroyBuilding(target);
      const victim = tribes[target.tribeId];
      victim.losses++;
      if (target.type === 'town' && owner) logEvent(`🔥 ${owner.name} san phẳng KINH ĐÔ của ${victim.name}!`, owner.color, true);
      else if (target.type === 'town') logEvent(`🔥 Quái vật san phẳng KINH ĐÔ của ${victim.name}!`, '#b783cc', true);
    } else if (target.tribeId >= 0) {
      tribes[target.tribeId].losses++;
      if (target.type === 'hero') {
        logEvent(`💀 Anh hùng ${target.name} của ${tribes[target.tribeId].name} tử trận`,
                 owner ? owner.color : '#b783cc', true);
      }
    }
  }
}

// Đòn tầm xa. Máy bắn đá còn gây SÁT THƯƠNG LAN quanh điểm rơi ở mức 50%.
//
// Sát thương lan đi qua chính dealDamage (với fx:'none' để khỏi mỗi viên đá là một
// chùm bốn tia lửa và bốn điểm nóng camera). Nhờ vậy một quả đạn rơi trúng đám đông
// vẫn ghi đúng số mạng cho bộ lạc, đúng chiến công cho anh hùng, và vẫn kích hoạt
// đúng dòng nhật ký "san phẳng KINH ĐÔ" nếu nó tình cờ hạ nốt toà nhà bên cạnh.
function rangedStrike(u, target, isBuilding) {
  const heavy = u.splash > 0;
  dealDamage(u, target, isBuilding, { fx: heavy ? 'rock' : 'arrow' });
  if (!heavy) return;
  addFx({ type: 'boom', x: target.x, y: target.y, life: 20, maxLife: 20, r: u.splash * 0.75 });
  const R = u.splash;
  for (const o of units) {
    if (o === target || o.hp <= 0 || o.tribeId === u.tribeId) continue;
    if (dist(o.x, o.y, target.x, target.y) > R) continue;
    dealDamage(u, o, false, { fx: 'none', mult: 0.5 });
  }
  for (const b of buildings) {
    if (b === target || b.hp <= 0 || b.tribeId === u.tribeId) continue;
    if (dist(b.x, b.y, target.x, target.y) > R + b.size / 2) continue;
    dealDamage(u, b, true, { fx: 'none', mult: 0.5 });
  }
}

// Địch SỐNG giành quyền ưu tiên trước một CÔNG TRÌNH đang bị đánh dở.
//
// Cả tickSoldier lẫn tickHero đều mở đầu bằng `let target = u.combatTarget`, rồi
// mọi lượt quét chọn mục tiêu bên dưới đều nằm sau một `if (!target)`. Nghĩa là
// cái thứ tự ưu tiên viết rất cẩn thận ở dưới CHỈ chạy đúng một lần — cái tick mà
// đơn vị chưa có mục tiêu. Bám được vào hang ổ rồi thì nó bám tới chết: cả bầy
// quái vây quanh đánh, mà nó vẫn quay lưng gõ cửa hang, vì `target` khác null nên
// lượt quét "địch sát sườn thì luôn đánh trả" ở ngay dòng dưới không bao giờ chạy
// nữa. Chú thích của chính hai hàm đó (kể cả câu "chứ không đứng gõ cửa hang giữa
// một bầy sói") mô tả đúng hành vi mong muốn — chỉ có điều mã không hề làm thế.
//
// HAI bán kính, không phải một:
//  · HANG Ổ: quét cả tầm nhìn. Đây là việc thời bình, không vướng luật thắng thua,
//    và thứ cần làm là DỌN SẠCH đám canh hang rồi mới đập hang.
//  · Công trình của bộ lạc địch (đang vây thành): chỉ quét tầm đánh trả. Rộng hơn
//    thì mỗi lính phòng thủ ló ra đều kéo cả đạo quân rời khỏi bức tường và không
//    cuộc vây nào kết thúc — mà vây thành là đường thắng của chế độ chinh phạt.
//
// `soldiersOnly`: chỉ kẻ CÓ VŨ KHÍ mới giành được quyền ưu tiên. Không có nó, một
// người dân chạy ngang chân thành cũng kéo được cả đạo quân đi đuổi, mà dân thì
// bỏ chạy nên đó là cuộc rượt không hồi kết.
//
// Ngoại lệ "sắp sập thì đánh nốt": dưới FINISH_HP_FRAC máu, bỏ dở là phí sạch công
// đã đánh, nên cứ hạ xong đã rồi quay ra.
const FINISH_HP_FRAC = 0.18;
function preemptBuildingTarget(u, target, nearR) {
  if (!target || target.size === undefined) return target;
  if (target.maxHp && target.hp <= target.maxHp * FINISH_HP_FRAC) return target;
  const R = target.isLair ? Math.max(nearR, CONFIG.UNIT.SOLDIER_VISION) : nearR;
  return findNearestEnemyHero(u.x, u.y, u.tribeId, R)
      || findNearestEnemyUnit(u.x, u.y, u.tribeId, R, true)
      || target;
}

function tickSoldier(u, tribe) {
  if (u.cooldown > 0) u.cooldown--;

  // TỐC ĐỘ PHÂN SỐ trên một lưới nguyên (kỵ binh). moveToward/stepDownField dùng
  // u.speed làm SỐ BƯỚC mỗi tick, nên 1,7 ô/tick không thể biểu diễn trực tiếp:
  // phải cộng dồn tín dụng rồi rút phần nguyên ra mỗi tick — 1,1,2,1,2,1,2...
  // Cùng thủ thuật đã dùng cho anh hùng ở spawnUnit, và cùng lý do: không có nó
  // thì speedMult chỉ có thể là 1 hoặc 2, tức là mọi giá trị ở giữa đều làm tròn
  // về 1 và cả đặc điểm ĐỊNH NGHĨA của kỵ binh biến mất không một dấu vết.
  //
  // `speedMult` = 0 với mọi loại quân khác nên chúng bỏ qua nguyên khối này và
  // giữ nguyên u.speed = 1 đã gán lúc sinh ra.
  if (u.speedMult > 0) {
    u.speedCredit += u.speedMult;
    u.speed = Math.floor(u.speedCredit);
    u.speedCredit -= u.speed;
  }

  let target = u.combatTarget;
  if (!target || target.hp <= 0) target = null;

  // 0. BÁO ĐỘNG TRỌNG YẾU (Kỳ quan / Kinh đô) HUỶ mục tiêu đang đánh dở.
  //
  //    Đây là dòng làm cho cả cơ chế phòng thủ tồn tại, và nó được thêm vào SAU
  //    khi đo. Bản không có nó chạy đúng như viết và vẫn để Kỳ quan sập với KHÔNG
  //    MỘT người bảo vệ nào: defendPick trả về đúng Kỳ quan cho cả 24/24 người
  //    lính, nhưng cả 24 đều đang mang sẵn `combatTarget` (một người dân địch
  //    đang bỏ chạy), nên `target` khác null và mọi bước bên dưới — vốn đều nằm
  //    sau `if (!target)` — không bao giờ chạy. Thứ tự ưu tiên viết rất cẩn thận
  //    ở dưới chỉ có hiệu lực đúng ở những tick mà người lính TÌNH CỜ rảnh tay,
  //    mà một đạo quân đang đuổi dân thì không bao giờ có tick như thế.
  //
  //    Đây là lần thứ hai họ lỗi "mục tiêu dính chặt" cắn dự án này (lần trước:
  //    lính lao vào hang ổ, chữa bằng preemptBuildingTarget). Cùng một hình dạng:
  //    một `target` khác null nuốt trọn cả thang ưu tiên bên dưới nó.
  //
  //    CHỈ áp cho báo động trọng yếu. Với một cái trại lính bị đánh, kéo người
  //    đang giao chiến ra khỏi trận là lỗ nhiều hơn lời; với Kỳ quan thì không có
  //    thứ gì đang làm dở đáng giá bằng.
  const alarmB = defendPick(u, tribe);
  const critical = alarmB && defenseWeight(alarmB) >= CONFIG.DEFENSE.CRITICAL;
  if (critical && target) {
    if (target.size !== undefined) {
      // Đang vây một toà nhà: bỏ, TRỪ KHI nó sắp sập — bỏ dở lúc đó là phí sạch
      // công đã đánh, mà "sắp sập" thì chỉ còn một hai đòn nữa (xem FINISH_HP_FRAC).
      if (!(target.maxHp && target.hp <= target.maxHp * FINISH_HP_FRAC)) target = null;
    } else if (cheb(u.x, u.y, target.x, target.y) > (u.range > 0 ? u.range : 3)) {
      // Đang ĐUỔI một kẻ ở xa: bỏ. Kẻ đang thật sự đánh mình (trong tầm với) thì
      // giữ — quay lưng bỏ chạy khỏi một người đang chém mình là chết, không phải
      // là phòng thủ. Ngưỡng dùng đúng bán kính mà bước 1 dưới đây sẽ nhận lại,
      // nên hai bước không thể đá nhau: cái gì bị bỏ ở đây thì bước 1 cũng không
      // nhặt lại, và cái gì bước 1 nhặt lại thì ở đây đã không bỏ.
      target = null;
    }
  }

  // 1. Địch sát sườn thì luôn đánh trả — không ai đứng yên cho người khác chém.
  //    Có anh hùng địch trong tầm với thì bỏ hết, xúm vào chém tướng.
  //    Với quân tầm xa, "tầm với" là tầm BẮN: một cung thủ chỉ phản ứng khi địch
  //    lọt vào 3 ô thì đã bị áp sát mất rồi, và cả tầm bắn 6 ô thành vô nghĩa.
  const nearR = u.range > 0 ? u.range : 3;
  // 1a. ...và điều đó phải đúng CẢ KHI đang bận đánh một toà nhà. Xem
  //     preemptBuildingTarget: đây là dòng khiến thứ tự ưu tiên bên dưới còn hiệu
  //     lực ở mọi tick, chứ không chỉ ở tick đầu tiên.
  target = preemptBuildingTarget(u, target, nearR);
  if (!target) target = findNearestEnemyHero(u.x, u.y, u.tribeId, Math.max(4, u.range))
                     || findNearestEnemyUnit(u.x, u.y, u.tribeId, nearR);

  // 2. NHÀ ĐANG BỊ ĐÁNH -> bỏ hết về cứu. Xếp trên cả chinh phạt: một bộ lạc đổi
  //    được cái trại lính của địch lấy Kỳ quan của mình là một bộ lạc vừa thua.
  //
  //    Hai bước tách rời nhau, và tách là có lý do: nếu ở xa mà đã nhắm sẵn một
  //    kẻ địch cụ thể cạnh toà nhà thì lính sẽ đuổi theo nó bằng pathfinding tham
  //    lam suốt nửa bản đồ — đúng cái bẫy "trường dẫn đường vs mục tiêu ghi nhớ"
  //    đã ba lần làm chết mô phỏng này. Nên: CÒN XA thì chỉ hành quân về (qua
  //    walkHome, tức là có trường dẫn đường); TỚI NƠI rồi mới nhận mục tiêu tại chỗ.
  let defendSpot = null;
  if (!target && alarmB) {
    if (dist(u.x, u.y, alarmB.x, alarmB.y) <= CONFIG.DEFENSE.ENGAGE_R) {
      target = findNearestEnemyUnit(alarmB.x, alarmB.y, u.tribeId, CONFIG.DEFENSE.ENGAGE_R);
    }
    if (!target) defendSpot = alarmB;
  }

  // 2b. Địch mò vào sân nhà nhưng chưa đánh vào cái gì (chưa có báo động).
  if (!target && !defendSpot && tick >= u.chaseBlockedUntil) {
    const intruder = homeIntruder(tribe);
    if (intruder) target = intruder;
  }

  // 3. Chinh phạt. Hành quân đường dài đi theo FLOW FIELD (BFS từ toàn bộ công
  // trình địch) chứ không nhắm sẵn một toà nhà cụ thể từ bên kia bản đồ.
  //
  // Lý do bỏ cách cũ: nhắm sẵn một toà rồi để trường dẫn đường tạo ra đúng cái
  // bẫy đã làm chết hai bản trước — trường luôn dẫn tới công trình GẦN NHẤT, nên
  // lính đứng ngay cạnh một toà nhà địch mà mục tiêu đã ghi lại là toà khác cách
  // đó nửa bản đồ: điều kiện "đủ gần để đánh" không bao giờ đúng, và cả đạo quân
  // đứng chôn chân giữa lòng địch. Đo thật: từ tick 8000 tới 30000, số mạng và
  // số công trình của cả bốn bộ lạc không đổi một đơn vị nào.
  //
  // Giờ thì: còn xa thì CHỈ hành quân (không mục tiêu); tới nơi rồi mới nhận mục
  // tiêu ngay tại chỗ. Hệ quả phụ rất hợp lý: đạo quân ăn dần từ ngoài rìa lãnh
  // thổ địch vào trong, thay vì bay thẳng tới thủ đô.
  if (!target && !defendSpot && tribe.warTarget !== null && tribe.warField
      && tribe.warFieldTarget === tribe.warTarget) {
    // Hành quân giờ đi qua đội hình: kẻ dẫn trước quá xa hàng ngũ sẽ chững lại
    // chờ (xem marchWithFormation). Ở discipline thấp ngưỡng chờ nới tới 30 bước,
    // tức là hành vi cũ vẫn nằm nguyên trong dải gen — bản này không XOÁ cách chơi
    // cũ, nó biến cách chơi cũ thành một đầu của một trục có thể tiến hoá.
    if (marchWithFormation(u, tribe)) {
      u.combatTarget = null;
      return;
    }
    target = findNearestEnemyBuilding(u.x, u.y, u.tribeId, tribe.warTarget)
          || findNearestEnemyUnitOfTribe(u.x, u.y, tribe.warTarget);
  }

  // 4. Thời bình: dọn dẹp địch lảng vảng trong tầm nhìn (tướng địch trước tiên).
  //    `!defendSpot`: đang được triệu về cứu Kỳ quan mà thấy một tên lính lạc cách
  //    12 ô thì vẫn đi tiếp — kẻ sát sườn đã được lượt quét 1 lo rồi, còn mọi thứ
  //    ngoài tầm với chỉ là cái cớ để không bao giờ về tới nơi.
  const vision = Math.max(CONFIG.UNIT.SOLDIER_VISION, u.range + 3);
  if (!target && !defendSpot && tick >= u.chaseBlockedUntil) {
    target = findNearestEnemyHero(u.x, u.y, u.tribeId, vision)
          || findNearestEnemyUnit(u.x, u.y, u.tribeId, vision);
  }

  // 5. Không có chiến tranh mà gần hang quái thì đi dọn hang. Một đạo quân đứng
  //    không ở điểm tập kết là tài nguyên chết; hang ổ thì luôn có sẵn ngay trong
  //    hoặc cạnh lãnh thổ, nên thời bình vẫn có việc để làm và vẫn có cảnh để xem.
  // Bán kính 55 chứ không phải 26: đo thật thì hang gần kinh đô nhất vẫn cách 54
  // ô (bản đồ 340x220 + luật không đặt hang sát nhà), nên bán kính nhỏ khiến
  // KHÔNG MỘT người lính nào từng nhìn thấy hang nào trong suốt 6.000 tick —
  // cả cơ chế dọn hang im lặng hoàn toàn.
  if (!target && !defendSpot && tribe.warTarget === null && tick >= u.chaseBlockedUntil) {
    target = findNearestLairInRange(u.x, u.y, 55);
  }

  u.combatTarget = target;

  if (!target) {
    // ĐANG ĐƯỢC TRIỆU VỀ CỨU NHÀ: đi trước cả trạm xá. Một người lính 30% máu về
    // tới chân Kỳ quan vẫn đáng giá hơn một người lính đầy máu về tới nơi sau khi
    // Kỳ quan đã sập — đây là ngoại lệ duy nhất của luật "kiệt sức thì đi chữa".
    if (defendSpot) {
      // Dừng ở MÉP toà nhà, không dí vào tâm: cùng hình học với mọi chỗ đo tới
      // công trình trong file này (xem chú thích lỗi hình học kho hàng), và một
      // vòng lính ôm lấy tường thì đẹp hơn hẳn một đống chồng lên giữa mái nhà.
      if (dist(u.x, u.y, defendSpot.x, defendSpot.y) > defendSpot.size + 1.5) {
        marchToDefend(u, tribe, defendSpot);
      } else {
        healAtMedic(u, tribe);
      }
      return;
    }
    // Thương binh về trạm xá TRƯỚC khi về hàng: một người lính 20% máu đứng đúng
    // vị trí trong đội hình vẫn là một người sắp chết ở trận sau.
    if (seekMedic(u, tribe)) return;
    // Không có gì để đánh -> về ĐÚNG CHỖ CỦA MÌNH trong hàng, không phải một điểm
    // ngẫu nhiên quanh cờ tập kết.
    const spot = formationSpot(u, tribe);
    if (dist(u.x, u.y, spot.x, spot.y) > 1.6) walkHome(u, tribe, spot.x, spot.y);
    else healAtMedic(u, tribe);      // đã vào hàng: nếu hàng đặt cạnh trạm xá thì hồi máu luôn
    return;
  }

  const isBuilding = target.size !== undefined;
  // Cận chiến: chạm được là đánh. Tầm xa: tầm bắn tính từ MÉP công trình, không
  // phải từ tâm — Kỳ quan size 5 có tâm cách mép tới 2,5 ô, nên nếu đo từ tâm thì
  // một cỗ máy bắn đá tầm 9 phải bò vào tận chân tường mới chịu nhả đạn.
  const meleeReach = isBuilding ? target.size : 1;
  const reach = u.range > 0 ? u.range + (isBuilding ? target.size / 2 : 0) : meleeReach;
  const d = cheb(u.x, u.y, target.x, target.y);
  if (d <= reach) {
    u.stuck = 0;
    // Bị áp sát -> lùi ra rồi vẫn bắn. Đây là toàn bộ "vi thao tác" của quân tầm
    // xa trong bản này: không kite tinh vi, chỉ đủ để đội hình tự giãn thành hai
    // lớp mà không cần một dòng nào ra lệnh đội hình.
    if (u.range > 0 && !isBuilding && d < u.minRange) moveAwayFrom(u, target.x, target.y);
    if (u.cooldown === 0) {
      if (u.range > 0) rangedStrike(u, target, isBuilding);
      else dealDamage(u, target, isBuilding);
      u.cooldown = u.atkCooldown;
    }
  } else {
    // Truy đuổi cự ly gần: đi tham lam. Nhưng phải có lối thoát — con mồi có thể
    // nấp sau một dải rừng, và khi đó lính sẽ ép mặt vào mép rừng mãi.
    moveToward(u, target.x, target.y);
    if (noProgress(u, target.id, dist(u.x, u.y, target.x, target.y), 30)) {
      u.stuck = 0;
      u.combatTarget = null;
      u.chaseBlockedUntil = tick + 240; // nghỉ truy đuổi, về tập kết một lúc
    }
  }
}

function findNearestEnemyUnitOfTribe(x, y, tribeId) {
  let best = null, bestD = Infinity;
  for (const o of units) {
    if (o.tribeId !== tribeId || o.hp <= 0) continue;
    const d = dist(x, y, o.x, o.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

