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

// ============================================================
// ĐÓI THÌ ĐÁNH YẾU ĐI (Phase 3.33)
// ============================================================
// Trả về 1 cho mọi thứ KHÔNG mang quân lương — dân thường (maxSupply 0), quái vật
// (trường không tồn tại), và cả tháp canh khi nó gọi effAttack. Một phép so sánh
// với 0/undefined là toàn bộ chi phí mà những thứ ấy phải trả cho một cơ chế chúng
// không dùng, đúng cùng luật đã viết cho `u.venomUntil` và `u.speedMult`.
//
// Tuyến tính từ ngưỡng HUNGRY xuống 0, không phải một bậc thang. Bậc thang thì cả
// cơ chế chỉ nhìn thấy được ở đúng một tick — cái tick vượt ngưỡng — còn dốc thì
// người xem thấy đạo quân YẾU DẦN, và đó là thứ khiến "đi thêm hai trăm ô nữa" là
// một quyết định có thể cân nhắc thay vì một cái bẫy sập.
function supplyMult(u) {
  if (!u.maxSupply) return 1;
  const S = CONFIG.SUPPLY;
  const f = u.supply / u.maxSupply;
  if (f >= S.HUNGRY) return 1;
  return S.MIN_MULT + (1 - S.MIN_MULT) * (f / S.HUNGRY);
}

function effAttack(u) {
  const b = upgradeBonus(u);
  const base = u.attack + (b ? b.atk : 0);
  let a = u.auraUntil >= tick ? base * u.auraMult : base;
  // Nhân ở ĐÂY, cùng chỗ với hào quang và phước lành, chứ không trừ vào `u.attack`.
  // Cùng lý do đã viết cho hai cái kia: một hệ số CÓ ĐƯỜNG LÙI thì phải nằm ngoài
  // chỉ số gốc, nếu không thì lúc no trở lại không có gì hoàn nguyên nó.
  // Trước hào quang hay sau đều ra cùng một tích — đặt sau để đọc thành đúng thứ
  // tự câu chuyện: đây là người lính, đây là cái hào quang cổ vũ anh ta, và đây là
  // cái bụng rỗng lấy bớt đi một phần.
  a *= supplyMult(u);
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
  // CÔNG THÀNH (Cổ Thụ Quái) nhân chồng lên hệ số phá nhà chung của quái. Nhân
  // chứ không thay thế: nếu đặt thành một hằng số riêng thì lần sau ai chỉnh
  // BUILD_DMG sẽ chỉnh được mọi loài TRỪ đúng cái loài sinh ra để phá nhà.
  //
  // Bên QUÂN LÍNH thì ngược lại — hai hệ số THAY THẾ nhau chứ không nhân nhau, và
  // đó là chỗ dễ viết sai nhất của cả bản này. Nhân (×3 rồi ×0,2) thì bộ binh chỉ
  // bị giảm 40%, không phải 80%, mà 0,6× vẫn đủ để ba chục người đấm tay không
  // nhanh hơn ba cỗ máy — tức là đã sửa mà không đổi được gì. Thay thế thì mỗi hệ
  // số đọc thẳng ra một câu: "phần sức đánh của tôi thật sự chạm được vào tường".
  //   máy bắn đá  20 × 3   = 60   · bộ binh  7 × 0,2 = 1,4  (43 lần)
  // Quái vật đi đường riêng và KHÔNG bị phạt: chúng không có cây công nghệ nào để
  // mà chọn, nên với chúng hình phạt này không tạo ra lựa chọn nào cả — nó chỉ làm
  // cả cơ chế đi cướp im lặng đi, mà Cổ Thụ Quái vừa được thêm vào để cơ chế ấy để
  // lại một CÁI HỐ nhìn thấy được trên bản đồ.
  const bMult = attacker.type === 'monster'
    ? CONFIG.MONSTER.BUILD_DMG * (attacker.siege || 1)
    : isSiege(attacker.type) ? CONFIG.UNIT.BUILDING_DAMAGE_MULT
                             : CONFIG.UNIT.BUILD_PENALTY;
  const mult = (isBuilding ? bMult : 1) * (o.mult === undefined ? 1 : o.mult);
  // Giáp trừ SAU khi đã nhân mọi hệ số (hào quang, phước, sát thương lan), không
  // phải trước. Trừ trước thì sát thương lan của máy bắn đá — vốn đã nhân 0,5 —
  // sẽ bị trừ nguyên một suất giáp trên một đòn đã yếu sẵn, và mọi mảnh văng ra
  // rìa vụ nổ đều rơi thẳng xuống sàn 25% bất kể đối phương mặc gì. Trừ sau thì
  // giáp giữ đúng nghĩa "mỗi cú chạm vào người tôi bị bớt ngần này".
  let dmg = effAttack(attacker) * mult;
  if (!isBuilding) dmg = Math.max(dmg * CONFIG.UNIT.ARMOR_FLOOR, dmg - effDefense(target));
  target.hp -= dmg;
  // AI VỪA CHẠM VÀO NÓ — dùng để trao kho báu Thiên Ma ở onMonsterDeath. Ghi tại
  // ĐÂY chứ không ở nhánh `hp <= 0` bên dưới, vì cùng lý do đã buộc tickDefender
  // phải ghi một dòng y hệt: hai đường sát thương khác nhau, và cái chết được xử
  // ở một chỗ thứ ba (lượt lọc xác cuối tick). Chỉ ghi cho thứ CẦN nó — gán cho
  // mọi mục tiêu là thêm một phép ghi vào đường đi nóng nhất của cả mô phỏng.
  if (target.worldBoss && attacker.tribeId >= 0) target.lastHitTribe = attacker.tribeId;
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
      // Ô tường cũng có `size` nên isBuilding = true, và nó cũng KHÔNG nằm trong
      // CONFIG.BUILD — y hệt hang ổ, y hệt cái bẫy đã ghi ngay dòng trên. Đây là
      // lần thứ hai một vật "có máu, có size, không phải công trình" đi qua cửa
      // này; nếu có lần thứ ba thì chỗ này phải thành một hàm.
      : target.isWall ? 'Công thành'
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
    // TƯỜNG PHẢI THOÁT RA TRƯỚC khối `isBuilding` bên dưới, và đây là dòng quan
    // trọng nhất của cả cơ chế. Rơi xuống dưới thì một ô tường vỡ sẽ chạy
    // destroyBuilding (đẩy phế tích, nổ, và cố đọc `b.farmCells`), cộng `razed` cho
    // kẻ tấn công, và — tệ nhất — một bức tường 160 ô quanh kinh đô sẽ cho kẻ tấn
    // công 160 chiến công, thừa sức mở khoá Thiên mệnh mà không cần hạ nổi một
    // toà nhà nào. Một luật thắng bị lách bởi một cơ chế phòng thủ.
    if (target.isWall) { onWallBreached(target, attacker); return; }

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
      // CHIẾN CÔNG ghi tại đây — cửa duy nhất mà mọi công trình sập đều đi qua,
      // đúng chỗ đã dùng cho `feedLair` và `heroRazed` ngay bên trên. Ghi ở
      // destroyBuilding thì mất người gây ra; ghi ở tickCombat thì sát thương lan
      // của máy bắn đá và đòn của tháp canh không được tính.
      // `owner.id !== target.tribeId` chứ không chỉ `owner`: một cỗ máy bắn đá bắn
      // trượt vào nhà mình vẫn đi qua đây, và tự phá nhà mình mà được tính chiến
      // công thì cả điều kiện Kỳ quan bên dưới trở thành một trò lách luật.
      if (owner && owner.id !== target.tribeId) {
        owner.razed++;
        if (target.type === 'town') {
          owner.townsRazed++;
          // QUYỀN LẬP ĐÔ (Phase 3.28). Ghi tại đây chứ không ở destroyBuilding, và
          // vì đúng lý do đã viết ba dòng trên cho `razed`: chỗ này là chỗ duy nhất
          // còn biết AI đã hạ nó. destroyBuilding chỉ biết toà nhà nào sập.
          //
          // Toạ độ chụp NGAY BÂY GIỜ, không giữ tham chiếu tới `target`: toà nhà sẽ
          // bị lọc khỏi mảng `buildings` ở cuối tick này, và giữ một con trỏ tới một
          // vật đã chết là đúng họ lỗi "snapshot vs live reference" — chỉ có điều ở
          // đây thì chiều ngược lại mới là cái đúng.
          owner.claims.push({ x: target.x, y: target.y, at: tick, from: target.tribeId });
          // Trần 4: quyền lập đô hết hạn sau COLONY.TTL, nhưng một bộ lạc đang thắng
          // như chẻ tre vẫn có thể dồn được cả chục cái trong một đợt. Giữ lại quyền
          // MỚI NHẤT (bỏ cái cũ nhất) vì nền đất mới là nền còn nóng — đúng chỗ quân
          // của nó đang đứng.
          if (owner.claims.length > 4) owner.claims.shift();
          // THIÊN MỆNH: cái kinh đô ĐẦU TIÊN hạ được là thứ mở khoá Kỳ quan. Báo
          // ra dòng sử ngay tại đây, vì nếu không thì người xem chỉ thấy "bỗng
          // nhiên bộ lạc này khởi công được" mà không biết vì sao — một điều kiện
          // không đọc ra được thì với người xem nó không tồn tại.
          if (owner.townsRazed === CONFIG.WONDER.NEED_TOWNS && gameMode !== 'defend') {
            logEvent(`👑 ${owner.name} nhận THIÊN MỆNH — đã đủ chiến công để khởi công Kỳ quan`, owner.color, true);
          }
        }
      }
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
  // ============================================================
  // NỎ THẦN — mũi tên XUYÊN, và vì sao nó không dùng lại khối sát thương lan
  // ============================================================
  // Hai cơ chế nghe giống nhau ("trúng nhiều người một lúc") nhưng HÌNH HỌC ngược
  // nhau, và chính chỗ ngược đó là toàn bộ lý do nỏ thần đáng tồn tại: sát thương
  // lan là một HÌNH TRÒN quanh điểm rơi, nên né nó bằng cách đứng THƯA. Mũi tên
  // xuyên là một ĐOẠN THẲNG từ người bắn tới quá mục tiêu, nên né nó bằng cách
  // đứng LỆCH HÀNG. Một đạo quân không thể vừa thưa vừa lệch hàng.
  //
  // Sát thương KHÔNG giảm dần theo độ sâu (mult 0,8 phẳng cho mọi nạn nhân sau
  // mục tiêu đầu). Giảm dần thì mũi tên xuyên chỉ còn là "sát thương lan hình
  // thuôn", và người xem không đọc ra được gì khác. Phẳng thì một phát bắn dọc
  // theo một hàng quân có thể hạ ba người cùng lúc — hình ảnh đó thì đọc ra ngay.
  if (u.pierce > 0) {
    dealDamage(u, target, isBuilding, { fx: 'arrow' });
    // Hướng đơn vị của tia bắn. Chuẩn hoá từ (người bắn -> mục tiêu); nếu hai bên
    // trùng ô thì không có hướng nào để xuyên, thoát luôn.
    const vx = target.x - u.x, vy = target.y - u.y;
    const len = Math.hypot(vx, vy);
    if (len < 0.001) return;
    const dx = vx / len, dy = vy / len;
    // Cùng bộ trường x1/y1/x2/y2 với 'arrow' và 'rock' — KHÔNG đặt tên trường mới.
    // Ba loại đạn cùng trả lời một câu hỏi ("bay từ đâu tới đâu"), và một loại đạn
    // thứ tư dùng bộ tên khác sẽ buộc hàm vẽ phải phân nhánh trước cả khi biết
    // mình đang vẽ gì. Điểm cuối là ĐẦU KIA CỦA TẦM XUYÊN, không phải mục tiêu:
    // mũi tên đi hết tầm của nó, và người xem phải thấy được nó đi qua khỏi người
    // đầu tiên — đó là toàn bộ chỗ khác biệt của loại quân này.
    addFx({ type: 'bolt', x1: u.x, y1: u.y, x2: u.x + dx * u.pierce, y2: u.y + dy * u.pierce,
            life: 11, maxLife: 11, color: tribes[u.tribeId] ? tribes[u.tribeId].color : '#d8a544' });
    for (const o of units) {
      if (o === target || o.hp <= 0 || o.tribeId === u.tribeId) continue;
      // Chiếu lên tia: `t` là quãng đường dọc tia, `off` là độ lệch ngang. Chỉ
      // trúng khi vừa nằm PHÍA TRƯỚC (t > 0), vừa trong tầm xuyên, vừa đủ sát tia.
      const ox = o.x - u.x, oy = o.y - u.y;
      const t = ox * dx + oy * dy;
      if (t <= 0 || t > u.pierce) continue;
      const off = Math.abs(ox * dy - oy * dx);
      if (off > u.pierceWidth) continue;
      dealDamage(u, o, false, { fx: 'none', mult: 0.8 });
    }
    return;
  }

  const splash = effSplash(u);
  const heavy = splash > 0;
  dealDamage(u, target, isBuilding, { fx: heavy ? 'rock' : 'arrow' });
  if (!heavy) return;
  addFx({ type: 'boom', x: target.x, y: target.y, life: 20, maxLife: 20, r: splash * 0.75 });
  const R = splash;
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
  // TƯỜNG cũng ăn sát thương lan — và việc nó KHÔNG ăn cho tới bản này không phải
  // một lựa chọn cân bằng, nó là hệ quả im lặng của việc tường không nằm trong mảng
  // `buildings`. Cùng một cái sót đã sinh ra "máy bắn đá phải bò vào 1 ô mới bắn
  // được tường" ngay phía trên: hai vòng lặp ngay trên đây tả đúng ý định "một quả
  // đạn rơi vào giữa đám đông thì mọi thứ quanh đó cùng chịu", và tường là thứ duy
  // nhất bị loại khỏi ý định đó mà không ai viết ra lý do.
  //
  // Quét ô vuông quanh ĐIỂM RƠI chứ không duyệt cả `wallCells` (gần hai nghìn phần
  // tử): bán kính lan lớn nhất trong game là 2,4 + nhánh Công thành, nên đây là vài
  // chục lần tra băm cho một quả đạn.
  const wr = Math.ceil(R);
  for (let dx = -wr; dx <= wr; dx++) {
    for (let dy = -wr; dy <= wr; dy++) {
      const w = wallCells.get((target.x + dx) + ',' + (target.y + dy));
      if (!w || w === target || w.hp <= 0 || w.tribeId === u.tribeId) continue;
      if (dist(w.x, w.y, target.x, target.y) > R) continue;
      dealDamage(u, w, true, { fx: 'none', mult: 0.5 });
    }
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

// ĐỤC TƯỜNG — nửa thứ hai của cơ chế tường thành.
//
// Nửa thứ nhất (tryStep/stepDownField) chỉ biết CHẶN. Chặn mà không cho một cách
// đi qua thì bức tường không phải một chướng ngại, nó là một biên giới bất khả —
// và cả đạo quân sẽ đi vòng quanh vành tường mãi mãi, đúng cái mà "trường dẫn tới
// ô gần nhất" đã năm lần biến thành một đám đông đứng im.
//
// Không có bước CHỌN MỤC TIÊU nào ở đây, và đó là điểm mấu chốt: người lính không
// "quyết định đi phá thành". Nó vẫn đang đi tới mục tiêu cũ của mình, đâm phải một
// ô tường, và đánh đúng cái ô vừa chắn mặt nó. Nhờ vậy cơ chế này không đụng một
// dòng nào vào thang ưu tiên của tickSoldier — thang đó đã bị "mục tiêu dính chặt"
// cắn bốn lần, và thêm một bậc nữa vào nó là mời con lỗi ấy quay lại lần thứ năm.
//
// Đọc dấu vết của tick TRƯỚC (u.wallBump được xoá ở đầu mỗi lần gọi moveToward).
// Một tick trễ là vô hình: một đơn vị đã đâm vào tường thì tick sau nó vẫn ở đó.
function bashWall(u) {
  const w = u.wallBump;
  if (!w) return false;
  // Ba lối thoát, theo thứ tự rẻ dần: ô đã thủng rồi (ai đó vừa đục xong — đi qua
  // thôi), tường của chính phe mình (đổi phe giữa chừng không có trong bản này,
  // nhưng một mục tiêu chết rồi vẫn còn nằm trong biến thì có), và đứng quá xa.
  if (w.hp <= 0 || w.tribeId === u.tribeId) { u.wallBump = null; return false; }
  if (u.cooldown > 0) return false;
  if (cheb(u.x, u.y, w.x, w.y) > 1) return false;
  dealDamage(u, w, true, { fx: u.range > 0 ? 'arrow' : 'slash' });
  // HAI TÊN CHO CÙNG MỘT KHÁI NIỆM, và cái bẫy nằm ở chỗ nó im lặng: quân lính
  // giữ nhịp đánh ở `atkCooldown` (spawnUnit), quái vật giữ ở `cd` (spawnMonster).
  // Viết thẳng `u.atkCooldown` thì với quái nó gán `undefined`, mà `undefined > 0`
  // là false nên vòng trừ hồi chiêu không chạy, và `u.cooldown === 0` cũng false —
  // con quái nào đấm tường một lần thì KHÔNG BAO GIỜ đánh được nữa, vĩnh viễn, mà
  // không có một lỗi nào để lần theo. Đúng họ NaN im lặng đã cắn dự án này ba lần
  // (lãnh thổ · upkeepMult · RES_MIN), lần này là undefined thay cho NaN.
  u.cooldown = u.atkCooldown || u.cd || 12;
  return true;
}

// ============================================================
// CÔNG THÀNH TỪ XA — nửa còn thiếu của cơ chế tường thành
// ============================================================
// Tường không nằm trong mảng `buildings` (xem wallCells: gần hai nghìn vật thể trên
// một mảng bị quét tuyến tính ở sáu chỗ nóng là chi phí không trả nổi). Cái giá phải
// trả cho quyết định ấy là: KHÔNG lượt quét chọn mục tiêu nào nhìn thấy tường, nên
// đường duy nhất để một bức tường ăn đòn là bashWall — mà bashWall thì đòi đứng KỀ.
//
// Với bộ binh, "đòi đứng kề" chính là luật đúng. Với quân tầm xa thì nó xoá thẳng
// đặc tính định nghĩa của cả binh chủng. Đo một kỷ nguyên chinh phạt 21.767 tick:
//     đòn trúng tường:  bộ binh 6.024 · kỵ binh 1.753 · CUNG THỦ 1.510 ·
//                       anh hùng 800 · kỵ xạ 527 · MÁY BẮN ĐÁ 176
//     19,1% tổng số unit-tick của quân tầm xa là đang đứng KỀ một bức tường địch
// Dòng cuối cùng của bảng là cả vấn đề gói trong một câu: **một cỗ máy bắn đá có
// tầm 12 ô phải bò vào 1 ô mới bắn được tường.** Nó bò qua trọn vẹn tầm bắn của
// tháp canh (10 ô) để làm việc đó, tức là binh chủng đắt nhất bảng đang tự nộp mình
// cho binh chủng nó sinh ra để khắc chế.
//
// BA quyết định thiết kế, mỗi cái tránh một cái bẫy đã cắn dự án này:
//
// 1. KHÔNG đụng vào `u.combatTarget`. Bức tường không được ghi vào ô mục tiêu, và
//    nấc này nằm SAU địch-sát-sườn, SAU cứu-nhà, SAU thương-binh-về-trạm. "Mục tiêu
//    dính chặt" đã cắn năm lần, luôn cùng một hình dạng: một `target` khác null
//    nuốt trọn cả thang ưu tiên bên dưới nó. Ở đây thang chạy đủ mọi tick và nấc
//    này chỉ nhận những tick người lính thật sự rảnh tay.
//
// 2. TÍNH LẠI MỖI TICK, KHÔNG NHỚ. `u.siegeWall` chỉ là kết quả của tick hiện tại,
//    ghi ra cho thẻ thông tin đọc — không phải một mục tiêu được giữ. Bản đầu làm
//    ngược lại (nhớ bức tường gần nhất rồi bám lấy nó) và phép đo bác bỏ; xem khối
//    chú thích của wallOnPathTo ngay dưới. Chi phí của việc tính lại là một tia
//    quét dài đúng bằng tầm bắn (tối đa 12 ô), chỉ chạy cho quân tầm xa và chỉ ở
//    những tick chúng rảnh — rẻ hơn hẳn cái nó thay thế.
//
// 3. ĐỨNG ĐÚNG TẦM CỦA MÌNH. `standoff` = effRange - 1 (kẹp sàn ở minRange): gần
//    hơn thì lùi, xa hơn thì không tiến. Trừ 1 chứ không đứng đúng mép tầm vì mép
//    tầm là chỗ một bước lệch nào cũng làm mất mục tiêu, và khi đó đơn vị sẽ rung
//    giữa "bắn" và "đi tìm" mãi mãi.
function siegeStandoff(u) {
  return Math.max(u.minRange || 1, effRange(u) - 1);
}

// ============================================================
// "BỨC TƯỜNG CHẶN ĐƯỜNG TÔI", chứ KHÔNG PHẢI "bức tường gần tôi nhất"
// ============================================================
// Bản đầu của cơ chế này hỏi câu thứ hai — quét vòng đồng tâm tìm ô tường địch gần
// nhất trong tầm — và phép đo bác bỏ nó ngay: 58,0% tổng số unit-tick của quân tầm
// xa rơi vào trạng thái đang công thành, ở cự ly trung bình 8,57 ô. Nghe thì đúng ý
// định, nhưng nó đúng QUÁ NHIỀU. Vành tường có hàng trăm ô; đục thủng ô trước mặt
// xong thì ô kế bên vẫn nằm trong tầm 12 của máy bắn đá, nên cung thủ và máy bắn đá
// sẽ gặm sạch cả vành tường mà KHÔNG BAO GIỜ đi qua cái lỗ do chính mình vừa mở.
// Bộ binh tràn vào trong, quân tầm xa ở lại ngoài bắn mãi một cái vòng — đúng cái
// hình dạng "cả đạo quân đứng chôn chân" mà trường dẫn đường đã năm lần tạo ra.
//
// Nên câu hỏi phải là câu thứ nhất, và nó TỰ TẮT: bức tường thôi chặn đường thì hàm
// này trả về null và người lính đi tiếp. `wallBlocks` trả null cho ô đã vỡ
// (hp <= 0 tới hết `downUntil`), nên cái lỗ vừa mở chính là điều kiện dừng bắn —
// không cần một cơ chế "thôi vây" thứ hai nào cả.
//
// Đường đi mô phỏng ĐÚNG cách đơn vị sẽ thật sự bước, chứ không phải một đoạn thẳng
// hình học: bước tham lam bằng Math.sign giống hệt moveToward. Sai một chút so với
// đường đi thật thì hàm sẽ chỉ vào một ô tường mà đơn vị không bao giờ đâm phải —
// và khi ấy nó lại đứng bắn một bức tường không cản nó, tức là quay về đúng lỗi vừa
// bỏ đi, chỉ hiếm hơn.
function wallOnPathTo(u, tx, ty, R) {
  let x = u.x, y = u.y;
  for (let i = 0; i < R; i++) {
    const sx = Math.sign(tx - x), sy = Math.sign(ty - y);
    if (sx === 0 && sy === 0) return null;
    x += sx; y += sy;
    const w = wallBlocks(u.tribeId, x, y);
    if (w) return w;
  }
  return null;
}

// Cùng câu hỏi, nhưng cho quãng HÀNH QUÂN — nơi không có toạ độ đích nào để nhắm,
// chỉ có một trường khoảng cách. Tụt dốc đúng như stepDownField, và cũng như nó,
// việc chọn ô kế tiếp KHÔNG né tường: trường được BFS ra mà không biết gì về tường
// (xem chú thích trong stepDownField — đó là lý do cả đạo quân tự dồn vào cùng một
// cung tường). Hàm này chỉ đi theo cái trường ấy rồi báo lại thứ đang đứng chắn.
function wallOnFieldPath(u, field, R) {
  const W = CONFIG.GRID_WIDTH, H = CONFIG.GRID_HEIGHT;
  let x = u.x, y = u.y, here = field[y * W + x];
  if (!(here > 0)) return null;                 // ngoài trường, hoặc đã tới nơi
  for (let i = 0; i < R; i++) {
    let bx = -1, by = -1, bv = here;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const v = field[ny * W + nx];
        if (v >= 0 && v < bv) { bv = v; bx = nx; by = ny; }
      }
    }
    if (bx < 0) return null;
    const w = wallBlocks(u.tribeId, bx, by);
    if (w) return w;
    x = bx; y = by; here = bv;
  }
  return null;
}

// Trả về true nếu người lính này đã dùng hết lượt của mình vào việc công thành —
// chỗ gọi phải `return` ngay, đúng như mọi nhánh khác của thang ưu tiên.
//
// `dest` là chỗ đơn vị đang muốn tới: một vật có (x, y) khi đã nhắm được cái gì đó,
// hoặc null khi đang hành quân theo trường. Hai chỗ gọi, một hàm — vì "tường có
// chặn đường tôi không" là CÙNG một câu hỏi ở cả hai, và tách làm hai bản là cách
// chắc chắn nhất để một bản được sửa còn bản kia thì không.
function siegeWallFromRange(u, tribe, dest) {
  const R = effRange(u);
  if (R <= 0) return false;              // bộ binh: bashWall đã lo, và đứng kề mới đúng
  // Nhìn xa hơn tầm bắn một chút để còn kịp DỪNG LẠI trước khi bước vào tầm tháp
  // canh; nhưng chỉ bắn khi thật sự trong tầm (kiểm lại ở dưới).
  const look = R + 2;
  const w = dest ? wallOnPathTo(u, Math.round(dest.x), Math.round(dest.y), look)
                 : (tribe.warField ? wallOnFieldPath(u, tribe.warField, look) : null);
  // Thẻ thông tin đọc trường này để nói ra "phá tường · cách N ô" (xem 14-ui-panels).
  // Trên bản đồ thì không cần thêm gì: rangedStrike đã bắn ra đúng vệt tên/đá từ chỗ
  // đứng tới bức tường, nên chuyện này TỰ NÓ nhìn thấy được.
  u.siegeWall = w || null;
  if (!w) return false;
  const d = cheb(u.x, u.y, w.x, w.y);
  const stand = siegeStandoff(u);
  // XA HƠN TẦM thì vẫn phải tiến — trả false để nhường lại cho bước hành quân bên
  // dưới. Không có vế này thì một cỗ máy bắn đá "thấy" bức tường ở 14 ô rồi đứng
  // yên vì nó đang bận công thành, mà đạn thì không tới nơi: một trạng thái bận rộn
  // không sản xuất ra gì cả, đúng họ với "lệnh rút lui được ghi ra mà không ai đọc".
  if (d > R) return false;
  // Bị áp sát bức tường (thường là vì vừa hành quân tới) thì LÙI RA rồi vẫn bắn.
  // Cùng vi thao tác mà quân tầm xa đã dùng với địch sống, chỉ khác là ở đây nó
  // tạo ra hình ảnh mà cả cơ chế này sinh ra để có: bộ binh ôm chân tường, cung thủ
  // và máy bắn đá dàn thành lớp thứ hai phía sau.
  if (d < stand) moveAwayFrom(u, w.x, w.y);
  if (u.cooldown === 0 && cheb(u.x, u.y, w.x, w.y) <= R) {
    rangedStrike(u, w, true);
    u.cooldown = u.atkCooldown;
  }
  return true;
}

function tickSoldier(u, tribe) {
  if (u.cooldown > 0) u.cooldown--;
  bashWall(u);

  // TỐC ĐỘ PHÂN SỐ trên một lưới nguyên (kỵ binh). moveToward/stepDownField dùng
  // u.speed làm SỐ BƯỚC mỗi tick, nên 1,7 ô/tick không thể biểu diễn trực tiếp:
  // phải cộng dồn tín dụng rồi rút phần nguyên ra mỗi tick — 1,1,2,1,2,1,2...
  // Cùng thủ thuật đã dùng cho anh hùng ở spawnUnit, và cùng lý do: không có nó
  // thì speedMult chỉ có thể là 1 hoặc 2, tức là mọi giá trị ở giữa đều làm tròn
  // về 1 và cả đặc điểm ĐỊNH NGHĨA của kỵ binh biến mất không một dấu vết.
  //
  // `speedMult` = 0 với mọi loại quân khác nên chúng bỏ qua nguyên khối này và
  // giữ nguyên u.speed = 1 đã gán lúc sinh ra.
  // ĐƯỜNG CÁI nhân vào TÍN DỤNG, không nhân vào `u.speed` đã làm tròn. Đây là chỗ
  // dễ sai và hậu quả thì im lặng: nhân sau khi làm tròn thì kỵ sĩ 1,7 trên đường
  // đi 1×2 hoặc 2×2, tức 2 hoặc 4 — trung bình 3,4 nhưng NHẢY CÓC, còn bộ binh 1
  // thì thành đúng 2 mỗi tick. Nhân vào tín dụng thì 1,7 × 2 = 3,4 chảy qua đúng
  // cỗ máy cộng dồn đã có, cho nhịp 3,4,3,4,3 — mượt như mọi tốc độ phân số khác.
  // MỘT đường tính tốc độ cho MỌI người lính, thay cho hai nhánh cũ (kỵ binh có
  // tín dụng phân số / bộ binh cứng bằng 1). Phải gộp lại vì từ bản này có tới BA
  // nguồn nhân vào cùng một con số — ngựa, đường cái, cổ vũ của quân kỳ — và tích
  // của chúng gần như không bao giờ là số nguyên. Hai nhánh cũ thì bộ binh trên
  // đường được cổ vũ ra 1 × 2 × 1,2 = 2,4 rồi bị làm tròn xuống 2, tức là phần cổ
  // vũ bốc hơi hoàn toàn với đúng loại quân đông nhất chiến trường. Cỗ máy tín
  // dụng vốn đã có sẵn để giải đúng chuyện đó; nó chỉ chưa được dùng cho bộ binh.
  let base = u.speedMult > 0 ? u.speedMult : 1;
  if (u.rallyUntil >= tick) base *= 1 + u.rallySpd;
  base = roadSpeed(u, base);
  if (base !== 1) {
    u.speedCredit += base;
    u.speed = Math.floor(u.speedCredit);
    u.speedCredit -= u.speed;
  } else {
    u.speed = 1;
  }
  // NỌC MÃNG XÀ. Tính từ tốc độ vừa dựng lại ở trên chứ không nhân dồn lên
  // `u.speed` của tick trước — nếu không thì một tick bị ép về 0 sẽ giữ nguyên 0
  // mãi mãi kể cả sau khi nọc đã tan, vì không có ai gán lại tốc độ cho họ nữa.
  // Khối trên nay gán `u.speed` ở CẢ HAI nhánh, nên điều kiện đó được giữ.
  u.speed = slowedSpeed(u, u.speed);

  // VOI CHIẾN — GIẪM ĐẠP. Chạy ở đây, TRƯỚC mọi logic chọn mục tiêu, và đó là cả
  // nội dung của động từ này: voi gây sát thương vì nó CÓ MẶT, không vì nó quyết
  // định đánh ai. Đặt nó trong nhánh "đã tới tầm đánh" như mọi đơn vị khác thì nó
  // lại thành một đòn đánh nữa, chỉ khác tên.
  //
  // Không có hồi chiêu: sát thương tính theo TICK, nên `trample` 3,2 nghĩa là 3,2
  // máu mỗi tick cho mỗi kẻ địch đứng trong 1,9 ô. Một con voi đi xuyên qua khối
  // hai chục người gây tổng sát thương lớn hơn mọi thứ trong game — nhưng chỉ khi
  // nó ĐI XUYÊN QUA ĐƯỢC. Đứng yên giữa vòng vây thì nó cũng giẫm, và cũng chết.
  //
  // `fx: 'none'` vì nếu mỗi tick mỗi nạn nhân đều nháy một chùm tia thì một con voi
  // giữa đám đông sẽ ngốn sạch ngân sách FX_MAX (400) trong ba tick, và mọi hiệu
  // ứng khác trên bản đồ biến mất. Hình ảnh của cú giẫm nằm ở chỗ khác: bụi bốc
  // lên dưới chân voi, vẽ mỗi khung hình (xem drawElephant).
  // Chia cho ĐÒN GỐC TRONG SPEC, không cho `u.attack`. Hai con số đó khác nhau
  // đúng bằng hệ số thời đại (spawnUnit: `attack: base.attack * bonus.atk`), nên
  // chia cho u.attack sẽ TRIỆT TIÊU chính hệ số đó và cú giẫm của một con voi
  // Thiên Triều mạnh y hệt cú giẫm ở Đồ Sắt. Chia cho đòn gốc thì cú giẫm leo theo
  // thời đại và theo nâng cấp như mọi sát thương khác trong game — cùng một luật,
  // không có ngoại lệ nào phải nhớ.
  if (u.trample > 0) {
    const R = u.trampleR;
    const share = u.trample / Math.max(1, unitSpec(u.type).attack);
    for (const o of units) {
      if (o.hp <= 0 || o.tribeId === u.tribeId) continue;
      if (dist(o.x, o.y, u.x, u.y) > R) continue;
      dealDamage(u, o, false, { fx: 'none', mult: share });
      u.trampledAt = tick;
    }
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

  // 0b. KIỆT SỨC CŨNG HUỶ MỘT CUỘC ĐUỔI Ở XA — cùng khuôn với khối báo động ngay
  //     trên, và phải nằm ở ĐÂY chứ không phải ở bước 2c bên dưới.
  //
  //     Đây là lần thứ BA họ lỗi "mục tiêu dính chặt" cắn dự án này, và lần này
  //     nó cắn ngay chính bản sửa: bước 2c được viết ra để cho thương binh rút về
  //     trước khi hành quân/tuần tra/dọn hang, nhưng nó nằm sau `if (!target...)`
  //     — mà `target` thì thừa hưởng thẳng từ `u.combatTarget` của tick trước ở
  //     đầu hàm. Một người lính 20% máu đang đuổi theo ai đó thì chưa bao giờ có
  //     một tick rảnh tay để bước 2c chạy. Đo sau khi thêm bước 2c: 7.109
  //     unit-tick (41,5% tổng số tick mang cờ `mending`) là những người lính vừa
  //     kiệt sức vừa đang đuổi một mục tiêu NGOÀI tầm với — lệnh rút lui vẫn được
  //     ghi ra và vẫn không ai đọc, y hệt bản trước, chỉ ở một chỗ khác.
  //
  //     Điều kiện chép đúng của khối báo động, kể cả sàn FINISH_HP_FRAC: bỏ dở một
  //     toà nhà chỉ còn một hai đòn nữa là phí sạch công đã đánh, dù đang mang máu
  //     bao nhiêu. Và kẻ đang chém mình trong tầm với thì vẫn giữ — quay lưng bỏ
  //     chạy khỏi một người đang chém mình vẫn là chết, kiệt sức lại càng chết.
  //
  //     `!healerNear`: có thầy lang đi cùng thì không huỷ gì cả. Đây là chỗ thứ hai
  //     (cùng bước 2c) mà hai nửa của hệ thống y tế khoá vào nhau — có người vá máu
  //     tại chỗ thì cuộc đuổi vẫn tiếp tục, và đó chính là thứ bộ lạc mua được khi
  //     bỏ tiền ra dựng Nhà y tế.
  //     Ngưỡng đọc CỜ `u.mending` chứ không đọc lại ngưỡng máu, và bản đầu của
  //     chính khối này đã viết sai đúng chỗ đó. Viết `u.hp < maxHp * SEEK_HP` thì
  //     mất trắng phần TRỄ: cờ `mending` bật ở 45% máu và chỉ tắt ở 90% (xem
  //     seekMedic), nên một người lính đã quyết định rút, hồi được lên 60% rồi
  //     lại thấy địch, sẽ KHÔNG khớp ngưỡng 45% nữa và cuộc đuổi không bị huỷ —
  //     đúng cái vòng rung mà độ trễ ấy sinh ra để dập. Đo bản sai: 3.367 unit-tick
  //     vẫn là thương binh đuổi mục tiêu ở xa, không ai che, không nhà nào sắp sập.
  //     Ngưỡng máu chỉ còn đứng ở vế `||` để bắt đúng tick ĐẦU TIÊN, trước khi
  //     seekMedic của tick đó kịp bật cờ.
  if (target && !critical && tribe.infirmaries.length && !healerNear(u, tribe)
      && (u.mending || u.hp < u.maxHp * CONFIG.MEDIC.SEEK_HP)) {
    if (target.size !== undefined) {
      if (!(target.maxHp && target.hp <= target.maxHp * FINISH_HP_FRAC)) target = null;
    } else if (cheb(u.x, u.y, target.x, target.y) > (u.range > 0 ? u.range : 3)) {
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
  //    `true` ở cuối = soldiersOnly, và nó đã THIẾU ở đây suốt từ khi cơ chế báo
  //    động ra đời. preemptBuildingTarget ngay phía trên đã viết sẵn lý do bằng
  //    đúng số nhiều: "một người dân chạy ngang chân thành cũng kéo được cả đạo
  //    quân đi đuổi, mà dân thì bỏ chạy nên đó là cuộc rượt không hồi kết". Bản
  //    sửa lần đó chỉ áp cho một chỗ gọi. Ở đây nó còn sai thêm một bậc nữa: một
  //    người dân KHÔNG THỂ là thứ đang đánh vào toà nhà này — họ không có ô sát
  //    thương lên công trình — nên đuổi theo họ không cứu được gì cả, trong khi
  //    kẻ thật sự đang gặm bức tường vẫn gặm.
  let defendSpot = null;
  if (!target && alarmB) {
    if (dist(u.x, u.y, alarmB.x, alarmB.y) <= CONFIG.DEFENSE.ENGAGE_R) {
      target = findNearestEnemyUnit(alarmB.x, alarmB.y, u.tribeId, CONFIG.DEFENSE.ENGAGE_R, true);
    }
    if (!target) defendSpot = alarmB;
  }

  // 2b. Địch mò vào sân nhà nhưng chưa đánh vào cái gì (chưa có báo động).
  //     `homeIntruder` cũng chỉ tính KẺ CÓ VŨ KHÍ, cùng lý do với bước 2: một người
  //     dân địch đi lạc vào sân nhà là chuyện thường ngày ở vùng biên, và nếu nó
  //     kéo được cả đạo quân đi đuổi thì chỉ cần một người là khoá được hàng thủ.
  if (!target && !defendSpot && tick >= u.chaseBlockedUntil) {
    const intruder = homeIntruder(tribe);
    if (intruder) target = intruder;
  }

  // 2c. THƯƠNG BINH RÚT VỀ TRẠM XÁ — và vị trí của khối này trong thang ưu tiên
  //     CHÍNH LÀ cả bản sửa, không phải nội dung của nó.
  //
  //     Trước bản này, seekMedic nằm ở tận đáy hàm, trong nhánh `if (!target)`.
  //     Tức là nó chỉ chạy cho một người lính KHÔNG CÓ VIỆC GÌ LÀM — mà bước 3
  //     (hành quân chinh phạt), bước 4 (quét địch trong tầm nhìn 12 ô) và bước 5
  //     (đi dọn hang trong bán kính 55 ô) thì gần như luôn tìm ra một việc. Đo
  //     thật 3 kỷ nguyên: 68,2% số unit-tick có cờ `mending` bật là những tick mà
  //     người lính đó đang cầm một mục tiêu, nên lệnh "về chữa" đã được ghi ra
  //     rồi mà không một dòng nào đọc tới. Cả cơ chế rút lui tồn tại trên giấy.
  //
  //     Đặt ở ĐÂY chứ không cao hơn nữa là có chủ ý, và hai ngoại lệ phía trên
  //     giữ nguyên: kẻ đang bị chém tận mặt (bước 1) vẫn đánh trả — quay lưng bỏ
  //     chạy khỏi một người đang chém mình là chết; và lệnh triệu về cứu nhà
  //     (bước 2) vẫn đi trước, đúng như chú thích ở nhánh defendSpot đã viết.
  //
  //     `!healerNear`: có thầy lang trong 14 ô thì KHÔNG lui. Đây là chỗ hai nửa
  //     của hệ thống y tế khoá vào nhau thay vì làm trùng việc của nhau — cùng
  //     một vết thương, có thầy lang thì tiền tuyến giữ nguyên quân số, không có
  //     thì phải trả bằng quãng đường về.
  //     `u.combatTarget = null` TRƯỚC KHI return, và dòng đó không phải là dọn dẹp
  //     cho gọn — thiếu nó thì cả bản sửa tự vô hiệu hoá mình sau đúng một tick.
  //     Lệnh gán `u.combatTarget = target` nằm ở CUỐI hàm, sau bước 5; mọi nhánh
  //     `return` sớm vì thế phải tự ghi lại trạng thái của mình. Bản đầu của khối
  //     này quên, nên người lính rút lui vẫn giữ nguyên mục tiêu cũ, và tick sau
  //     `let target = u.combatTarget` ở đầu hàm lôi nó dậy lần nữa. Đo bản quên:
  //     203 unit-tick là lính 24% máu vẫn "đang nhắm" một anh hùng địch cách 130 ô
  //     — một mục tiêu mà không lượt quét nào trong hàm này còn nhìn thấy nổi
  //     (findNearestEnemyHero xa nhất chỉ tới 12 ô). Người lính đi về đúng hướng,
  //     nhưng thẻ thông tin ghi "đang giao chiến" và hình vẽ vẫn lao người về phía
  //     một kẻ ở nửa kia bản đồ. Đây là họ lỗi "mục tiêu dính chặt" lần thứ TƯ, và
  //     lần này chính tôi vừa dựng lại nó trong lúc đi sửa nó.
  if (!target && !defendSpot && !healerNear(u, tribe) && seekMedic(u, tribe)) {
    u.combatTarget = null;
    return;
  }

  // 2d. CÔNG THÀNH TỪ XA — xem siegeWallFromRange để biết vì sao nấc này tồn tại và
  //     vì sao nó phải nằm ĐÚNG CHỖ NÀY.
  //
  //     Trên nó: địch sát sườn (1), nhà đang bị đánh (2), thương binh về trạm (2c).
  //     Cả ba đều đúng là những thứ phải cắt ngang một cuộc công thành.
  //     Dưới nó: hành quân (3) và quét địch trong tầm nhìn (4) — và thứ tự ấy mới là
  //     nội dung thật của nấc này. Không có nó thì bước 3 sẽ đẩy người bắn đi tiếp
  //     cho tới khi đâm vào tường, tức là bức tường vẫn quyết định chỗ đứng của quân
  //     tầm xa y như cũ, chỉ khác là giờ nó ăn thêm vài mũi tên trên đường vào.
  //     `u.combatTarget = null` trước khi return: mọi nhánh thoát sớm trong hàm này
  //     phải tự ghi lại trạng thái của mình, vì lệnh gán chính thức nằm ở cuối hàm
  //     (bài học "mục tiêu dính chặt" lần thứ tư đã trả giá đúng ở chỗ này).
  if (!target && !defendSpot && tribe.warTarget !== null && tribe.warField
      && siegeWallFromRange(u, tribe, null)) {
    u.combatTarget = null;
    return;
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
  // Bán kính đọc từ CONFIG (xem UNIT.LAIR_SEEK_R) chứ không viết cứng ở đây nữa:
  // nó phải leo theo cỡ bản đồ, và một hằng số nằm lọt giữa một hàm thì lần sau
  // đổi bản đồ sẽ không ai đi tìm nó. Con số cũ 55 đo được là bậc IM LẶNG NHẤT của
  // cả thang — 78,5% số unit-tick "lính không có việc" rơi vào đúng nó.
  if (!target && !defendSpot && tribe.warTarget === null && tick >= u.chaseBlockedUntil) {
    target = findNearestLairInRange(u.x, u.y, CONFIG.UNIT.LAIR_SEEK_R);
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
    //
    // walkToPoint chứ không phải walkHome, và đây là chỗ sửa đắt nhất của cả bản
    // này dù chỉ đổi một tên hàm: chỗ đứng trong hàng là MỘT ĐIỂM CỤ THỂ, còn
    // homeField thì dẫn tới công trình gần nhất. Đo 9.000 tick trước khi sửa:
    // 58,5% số lính rảnh đang "về hàng" thật ra đang dao động tại chỗ, và một
    // phần ba tổng số unit-tick của lính rơi vào trạng thái này. Xem walkToPoint.
    const spot = formationSpot(u, tribe);
    if (dist(u.x, u.y, spot.x, spot.y) > 1.6) walkToPoint(u, tribe, spot.x, spot.y);
    else healAtMedic(u, tribe);      // đã vào hàng: nếu hàng đặt cạnh trạm xá thì hồi máu luôn
    return;
  }

  const isBuilding = target.size !== undefined;
  // Cận chiến: chạm được là đánh. Tầm xa: tầm bắn tính từ MÉP công trình, không
  // phải từ tâm — Kỳ quan size 5 có tâm cách mép tới 2,5 ô, nên nếu đo từ tâm thì
  // một cỗ máy bắn đá tầm 9 phải bò vào tận chân tường mới chịu nhả đạn.
  const meleeReach = isBuilding ? target.size : 1;
  // effRange, KHÔNG u.range: nhánh Công thành cộng tầm cho máy bắn đá và nỏ thần.
  // Đọc `u.range` ở đây trong khi rangedStrike đọc tầm đã cộng là dựng lại đúng lỗi
  // "hai chỗ đọc hai con số cho cùng một khái niệm" — cỗ máy sẽ đứng ở tầm CŨ và
  // phần tầm vừa mua không bao giờ được dùng tới.
  const uRange = effRange(u);
  const reach = uRange > 0 ? uRange + (isBuilding ? target.size / 2 : 0) : meleeReach;
  const d = cheb(u.x, u.y, target.x, target.y);
  if (d <= reach) {
    u.stuck = 0;
    // Bị áp sát -> lùi ra rồi vẫn bắn. Đây là toàn bộ "vi thao tác" của quân tầm
    // xa trong bản này: không kite tinh vi, chỉ đủ để đội hình tự giãn thành hai
    // lớp mà không cần một dòng nào ra lệnh đội hình.
    if (uRange > 0 && !isBuilding && d < u.minRange) moveAwayFrom(u, target.x, target.y);
    if (u.cooldown === 0) {
      if (uRange > 0) rangedStrike(u, target, isBuilding);
      else dealDamage(u, target, isBuilding);
      u.cooldown = u.atkCooldown;
    }
  } else {
    // CHƯA TỚI TẦM — và trước khi bước tới, hỏi VÌ SAO chưa tới. Nếu cái chắn giữa
    // là một bức tường thì bước tới nghĩa là bò vào tận chân nó, và với quân tầm xa
    // đó chính là hành vi đã phải sửa (xem siegeWallFromRange). Chỗ này là nửa thứ
    // hai của bản sửa: nấc 2d chỉ bắt được quãng HÀNH QUÂN (lúc chưa nhắm ai), còn
    // đây bắt quãng đã nhắm được một toà nhà hay một người cụ thể sau bức tường —
    // mà đó mới đúng là lúc vòng vây đang siết, tức là lúc chuyện này xảy ra nhiều
    // nhất. Thiếu nó thì bản sửa tự tắt đúng vào lúc nó cần chạy.
    if (siegeWallFromRange(u, tribe, target)) return;
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

// ============================================================
// THẦY LANG — đơn vị duy nhất đi tìm NGƯỜI NHÀ thay vì đi tìm địch
// ============================================================
// Bán kính và nhịp thật của MỘT thầy lang, sau khi cộng nhánh Y thuật của bộ lạc.
// Một hàm chứ không phải bốn lần `H.X + tribe.healBonus.X` rải trong tickMedic:
// bốn con số này luôn phải được đọc CÙNG NHAU (tìm xa hơn mà không chữa xa hơn thì
// thầy lang chỉ chạy nhiều hơn chứ không chữa được nhiều hơn), nên để chúng ở một
// chỗ thì lần sau thêm một cấp nữa hay thêm một nguồn buff nữa cũng chỉ sửa đúng đây.
//
// Có nhánh dự phòng khi `healBonus` chưa có: nó được điền trong rebuildUpBonus, mà
// hàm đó chạy lúc lập bộ lạc — nhưng một bộ lạc nạp từ ván cũ hoặc một lời gọi từ
// chỗ chưa nghĩ tới sẽ trả về undefined, và `undefined + số` là NaN. NaN đã hai lần
// im lặng cắn dự án này (biên giới lãnh thổ, điểm chọn nhánh nâng cấp); ở đây nó sẽ
// làm mọi phép so sánh khoảng cách thành false và thầy lang đứng im vĩnh viễn.
function healerStats(tribe) {
  const H = CONFIG.HEALER;
  const b = tribe.healBonus;
  if (!b) return { lv: 0, rate: H.RATE, heals: 1, reach: H.HEAL_R, seek: H.SEEK_R };
  return {
    lv: b.lv,
    rate:  H.RATE + b.rate,
    heals: 1 + b.heals,
    reach: H.HEAL_R + b.reach,
    seek:  H.SEEK_R + b.seek
  };
}

// Chọn bệnh nhân theo THIẾU BAO NHIÊU MÁU tuyệt đối chia cho khoảng cách, không
// theo phần trăm máu và cũng không theo "ai gần nhất".
//
// Phần trăm thì sai vì nó coi một cung thủ 42 máu mất 20 là nặng hơn một kỵ sĩ
// 120 máu mất 50 — trong khi thứ thầy lang thật sự sản xuất ra là MÁU, và 50 vẫn
// nhiều hơn 20. "Ai gần nhất" thì sai theo kiểu tệ hơn: một người lính xước nhẹ
// đứng ngay cạnh sẽ giữ chân thầy lang mãi mãi, còn kẻ đang hấp hối cách 8 ô thì
// chết — cùng họ với lỗi "thang ưu tiên không biết con nào đáng đánh trước" đã
// viết ở chú thích Thầy Mo, chỉ là lần này nó nằm ở phe ta.
//
// Chia cho (khoảng cách + 4) chứ không phải cho khoảng cách: không có số 4 thì
// một vết xước ở cự ly 0,5 ô có điểm cao vô hạn và luật lại quay về "ai gần nhất".
//
// TRẢ VỀ MỘT DANH SÁCH, không phải một người: nhánh Y thuật cho phép vá nhiều
// người một lúc. Vẫn xếp theo đúng thang điểm cũ rồi cắt lấy `k` người đầu — nên
// ở cấp 0 (k = 1) hàm này cho ra ĐÚNG kết quả của bản một-bệnh-nhân cũ, và cả cơ
// chế mới không đổi một hành vi nào của bộ lạc chưa nghiên cứu gì.
function pickPatients(u, tribe, k, seekR) {
  const H = CONFIG.HEALER;
  const found = [];
  for (const o of units) {
    if (o.tribeId !== u.tribeId || o.hp <= 0 || o === u) continue;
    // Dân thường KHÔNG được chữa, và đây là một lựa chọn thiết kế chứ không phải
    // một chỗ quên. Dân bị thương là dân đang bị săn — chữa cho họ là kéo thầy
    // lang vào đúng chỗ vừa có một con quái, mà thầy lang thì không đánh trả được.
    // Anh hùng thì CÓ: họ đứng ở tiền tuyến, và mỗi đời anh hùng sống thêm được
    // vài trăm tick là vòng tiến hoá cấp cá thể có thêm một mẫu dữ liệu tử tế.
    // Thầy lang khác thì CŨNG CÓ (isMilitary sai với chính họ, nên phải kể tên):
    // hai thầy lang đi cùng đạo quân mà không vá nổi cho nhau là đúng cái nghịch
    // lý mà SELF_RATE vừa được thêm vào để xoá, chỉ dịch sang một chỗ khác.
    if (!isMilitary(o.type) && o.type !== 'hero' && o.type !== 'medic') continue;
    if (o.hp / o.maxHp >= H.MIN_WOUND) continue;
    const d = dist(u.x, u.y, o.x, o.y);
    if (d > seekR) continue;
    found.push({ o, score: (o.maxHp - o.hp) / (d + 4) });
  }
  if (!found.length) return found;
  found.sort((a, b) => b.score - a.score);
  return found.length > k ? found.slice(0, k) : found;
}

function tickMedic(u, tribe) {
  const H = CONFIG.HEALER;
  const S = healerStats(tribe);
  u.healing = null;

  // 1. KIỆT SỨC THÌ BỎ TRẬN VỀ TRẠM XÁ. Thầy lang không có ô sát thương: nếu nó
  //    nán lại thì nó chết, và cả đạo quân mất phần vá máu chứ không chỉ mất một
  //    suất dân. Dùng lại nguyên seekMedic của lính (kể cả cờ `mending` dính) —
  //    nó đã giải đúng bài toán "đi và về dứt khoát" rồi, chép lại một bản thứ hai
  //    chỉ để rung theo một kiểu khác.
  if (u.hp < u.maxHp * H.FLEE_HP && tribe.infirmaries.length) {
    if (seekMedic(u, tribe)) return;
  }
  // 2. Địch sát sườn thì lùi ra. Không đánh trả, không đứng yên chịu đòn.
  //    VỪA LÙI VỪA TỰ BĂNG BÓ: đây là tick mà nó cần máu nhất, và tự vá không tốn
  //    một bước chân nào — bỏ qua ở đây thì SELF_RATE chỉ chạy đúng lúc chiến
  //    trường đã yên, tức là đúng lúc không ai cần tới nó.
  const foe = findNearestEnemyUnit(u.x, u.y, u.tribeId, 3);
  if (foe) { selfMend(u, S); moveAwayFrom(u, foe.x, foe.y); return; }

  // 3. TỰ VÁ TRƯỚC KHI LO CHO NGƯỜI KHÁC — nhưng chỉ khi đã xuống dưới SELF_URGENT.
  //    Bậc trung gian giữa "còn khoẻ" và "bỏ chạy": không có nó thì thầy lang đi
  //    thẳng từ 100% máu xuống ngưỡng bỏ trận mà không bao giờ có cơ hội tự gượng.
  const urgent = u.hp < u.maxHp * H.SELF_URGENT;
  if (urgent) selfMend(u, S);

  // 4. Đi tìm thương binh. `S.heals` người một lúc ở nhánh Y thuật cấp cao.
  const list = pickPatients(u, tribe, S.heals, S.seek);
  if (list.length) {
    const lead = list[0].o;
    const d = dist(u.x, u.y, lead.x, lead.y);
    if (d > S.reach) {
      // Đi THAM LAM chứ không qua trường dẫn đường, và ở đây là đúng: bệnh nhân
      // luôn nằm trong SEEK_R (30-54 ô), còn từ Phase 3.15 thì địa hình không chặn
      // đường nữa. Cả họ lỗi "trường dẫn tới cái gần nhất, mục tiêu lại là một
      // cá thể cụ thể" vì thế không chạm tới được hàm này.
      moveToward(u, lead.x, lead.y);
      u.facingX = Math.sign(lead.x - u.x) || u.facingX;
      u.facingY = Math.sign(lead.y - u.y) || u.facingY;
      return;
    }
    // Chỉ vá cho những người ĐÃ nằm trong tầm với. `pickPatients` tìm trong bán
    // kính SEEK, rộng gấp hơn mười lần tầm chữa — không lọc lại ở đây thì một thầy
    // lang cấp 3 sẽ vá cho ba người ở ba đầu chiến trường cùng lúc, mà hình vẽ chỉ
    // nối được tới một người. Cơ chế nào mắt không kiểm chứng được thì nó là phép thuật.
    for (const it of list) {
      const p = it.o;
      if (dist(u.x, u.y, p.x, p.y) > S.reach) continue;
      p.hp = Math.min(p.maxHp, p.hp + S.rate);
      p.healedAt = tick;        // hình vẽ đọc con số này để nháy quầng xanh
      u.healed += S.rate;
      if (!u.healing) u.healing = p;   // THAM CHIẾU sống, không phải toạ độ đã chụp
    }
    if (u.healing) {
      u.facingX = Math.sign(u.healing.x - u.x) || u.facingX;
      u.facingY = Math.sign(u.healing.y - u.y) || u.facingY;
    }
    return;
  }

  // 5. Không có ai để chữa -> tự vá nốt phần của mình rồi ĐI THEO ĐẠO QUÂN.
  if (!urgent) selfMend(u, S);

  // 5a. ĐI CHINH CHIẾN CÙNG QUÂN — và đây là bản sửa đắt nhất của cả khối thầy lang.
  //
  //     Bản trước, thầy lang không có bệnh nhân thì về `formationSpot`, mà chỗ đứng
  //     trong đội hình neo vào `tribe.rally` — cờ tập kết, nằm ngay dưới kinh đô.
  //     Nghĩa là trong khi cả đạo quân hành quân nửa bản đồ đi công thành, thầy
  //     lang đứng ở nhà, và nó chỉ biết là có người bị thương khi trận đánh đã vào
  //     tới trong vòng SEEK_R quanh sân nhà của chính mình.
  //
  //     Đó là ĐÚNG cái bẫy 65,8 ô mà cả đơn vị thầy lang được thêm vào để thoát —
  //     "một cơ chế hồi máu neo vào công trình chỉ hoạt động ở nơi không có ai bị
  //     thương" — chỉ khác là lần này thứ neo nó lại không phải toà nhà mà là cờ
  //     tập kết. Cơ chế đúng, đơn vị đúng, và vẫn đứng sai chỗ.
  //
  //     marchWithFormation là đúng hàm cần dùng chứ không phải một đường đi riêng:
  //     nó bước xuống `warField` giống hệt quân lính và tôn trọng luật giữ hàng
  //     ngũ, nên thầy lang tới nơi CÙNG LÚC với đạo quân chứ không lóc cóc chạy sau.
  //     Và vì ORDER_ROW.medic = 2, chỗ nó dừng lại là hàng sau cùng.
  //     `soldiers >= 3` là điều kiện CÓ QUÂN ĐỂ MÀ ĐI THEO, và nó không thừa:
  //     marchWithFormation vẫn hành quân bình thường khi `armyLine` = -1 (dưới 3
  //     người thì không có "hàng ngũ" nào để giữ — xem computeArmyLine), nên một
  //     bộ lạc vừa mất sạch quân mà lệnh tuyên chiến chưa kịp huỷ sẽ tiễn ông thầy
  //     lang đi một mình sang tận kinh đô địch. Ngưỡng dùng đúng con số của
  //     computeArmyLine để hai chỗ không thể lệch nhau.
  if (tribe.warTarget !== null && tribe.warField
      && tribe.warFieldTarget === tribe.warTarget
      && tribe.stats && tribe.stats.soldiers >= 3
      && marchWithFormation(u, tribe)) return;

  // 6. Hết việc thật thì đứng vào hàng. Cố tình KHÔNG cho nó về đứng cạnh trạm xá:
  //    một thầy lang ở nhà thì đúng bằng không có thầy lang nào.
  const spot = formationSpot(u, tribe);
  if (dist(u.x, u.y, spot.x, spot.y) > 2.2) walkToPoint(u, tribe, spot.x, spot.y);
  else healAtMedic(u, tribe);   // đứng sẵn trong trạm xá thì tự hồi luôn
}

// ============================================================
// QUÂN KỲ — hào quang cổ vũ, và luật KHÔNG CỘNG DỒN
// ============================================================
// Lấy MAX chứ không cộng, và đây là quyết định thiết kế của cả đơn vị này. Nếu cộng
// dồn thì chiến thuật tối ưu là gom mười lá cờ vào một chỗ, và một cơ chế mà câu trả
// lời tối ưu luôn là "càng nhiều càng tốt" thì nó không phải một lựa chọn — nó là
// một nút nhân sát thương có giá bằng tiền. Đúng cái bẫy đã ghi ở Phase 3.17 ("một
// lựa chọn không bao giờ thắng thì không phải một lựa chọn"), chỉ ở chiều ngược lại.
//
// Lấy MAX cũng làm cho quân kỳ chồng lên HÀO QUANG CHỈ HUY của anh hùng đúng cách:
// một đạo quân đứng cạnh cả anh hùng lẫn lá cờ nhận cái mạnh hơn trong hai, không
// nhận tích của cả hai. Nhờ vậy hai cơ chế không nhân nhau thành một con số mà không
// ai dự đoán nổi — và quan trọng hơn: quân kỳ vẫn còn giá trị SAU KHI anh hùng chết,
// đúng lúc đạo quân cần nó nhất.
//
// Dùng `unitBuckets` chứ không quét cả mảng `units`: bản sao gần như nguyên văn của
// applyHeroAura, và cùng lý do — hàm này chạy mỗi tick cho mỗi lá cờ.
function applyRally(u) {
  const R = u.rallyR;
  if (R <= 0) return;
  const B = CONFIG.BUCKET_SIZE;
  const x0 = Math.floor((u.x - R) / B), x1 = Math.floor((u.x + R) / B);
  const y0 = Math.floor((u.y - R) / B), y1 = Math.floor((u.y + R) / B);
  const atk = 1 + u.rallyAtk;
  for (let ix = x0; ix <= x1; ix++) {
    for (let iy = y0; iy <= y1; iy++) {
      const arr = unitBuckets.get(ix + ',' + iy);
      if (!arr) continue;
      for (const o of arr) {
        if (o === u || o.tribeId !== u.tribeId || o.hp <= 0) continue;
        if (!isMilitary(o.type)) continue;
        if (dist(o.x, o.y, u.x, u.y) > R) continue;
        // Hạn dùng tới TICK SAU, không phải tick này — cùng lý do đã viết ở
        // applyHeroAura: đơn vị được duyệt theo thứ tự mảng, nên người đứng trước
        // lá cờ trong mảng sẽ đánh XONG rồi hào quang mới phủ tới.
        const cur = o.auraUntil >= tick ? o.auraMult : 1;
        o.auraMult = Math.max(cur, atk);
        o.auraUntil = tick + 1;
        const curS = o.rallyUntil >= tick ? o.rallySpd : 0;
        o.rallySpd = Math.max(curS, u.rallySpeed);
        o.rallyUntil = tick + 1;
      }
    }
  }
}

// Quân kỳ không đi tìm địch và cũng không đi tìm người nhà — nó đi tìm CHỖ ĐỨNG.
// Ngắn hơn tickMedic rất nhiều vì nó không có một việc riêng nào: cả tác dụng của
// nó là ở chỗ nó đứng, nên hàm này chỉ phải trả lời đúng một câu — đứng đâu.
function tickStandard(u, tribe) {
  u.speed = slowedSpeed(u, roadSpeed(u, 1));
  applyRally(u);

  // 1. Địch sát sườn thì lùi. Không đánh trả (ô sát thương = 0), và giáp 2 chỉ đủ
  //    để sống thêm vài đòn — đúng như thầy lang. Lùi mà VẪN cổ vũ, vì applyRally
  //    đã chạy ở trên: lá cờ rút lui trong khi vẫn phất là một hình ảnh đúng.
  const foe = findNearestEnemyUnit(u.x, u.y, u.tribeId, 4);
  if (foe) { moveAwayFrom(u, foe.x, foe.y); return; }

  // 2. Đi cùng đạo quân, đúng khuôn thầy lang và cùng một lý do đã trả giá đắt ở
  //    đó: một lá cờ đứng ở cờ tập kết trong khi quân đánh nhau nửa bản đồ là một
  //    lá cờ không cổ vũ ai. Điều kiện `soldiers >= 3` cũng chép nguyên — xem
  //    khối chú thích ở tickMedic bước 5a.
  if (tribe.warTarget !== null && tribe.warField
      && tribe.warFieldTarget === tribe.warTarget
      && tribe.stats && tribe.stats.soldiers >= 3
      && marchWithFormation(u, tribe)) return;

  // 3. Hết việc thì về chỗ đứng hàng giữa (ORDER_ROW.standard = 1).
  const spot = formationSpot(u, tribe);
  if (dist(u.x, u.y, spot.x, spot.y) > 2.2) walkToPoint(u, tribe, spot.x, spot.y);
}

// Tự băng bó. Tách thành hàm vì tickMedic gọi nó ở BA nhánh thoát khác nhau (đang
// lùi khỏi địch, đang trên đường tới bệnh nhân, đang rảnh) — và ba nhánh đó đều
// `return` sớm, nên một dòng đặt ở cuối hàm sẽ không bao giờ chạy cho hai nhánh
// đầu. Cùng hình dạng với lỗi "lệnh được ghi ra mà không ai đọc" đã đo được ở
// seekMedic của lính: 68,2% số tick mang cờ rút lui là những tick lệnh bị nuốt.
function selfMend(u, S) {
  if (u.hp >= u.maxHp) return;
  u.hp = Math.min(u.maxHp, u.hp + CONFIG.HEALER.SELF_RATE);
  u.healedAt = tick;
}

// ============================================================
// QUÂN LƯƠNG — hao, hồi, và MỘT phép tra lãnh thổ
// ============================================================
// Gọi từ vòng tick chính cho MỌI đơn vị của bộ lạc trước khi rẽ nhánh theo loại,
// chứ không gọi bên trong tickSoldier/tickMedic/tickStandard/tickHero. Đây không
// phải chuyện gọn gàng: bốn hàm ấy có tổng cộng hơn hai chục nhánh `return` sớm,
// và "một dòng đặt cuối hàm không bao giờ chạy cho nhánh thoát sớm" là lỗi đã đo
// được ở selfMend ngay trên (68,2% số tick lệnh bị nuốt). Một cơ chế mà cứ ba tick
// mới hao một lần, tuỳ hôm đó người lính bận gì, thì không ai đọc ra được luật.
//
// "Đất nhà" = ô LÃNH THỔ thuộc về mình. Không phải bán kính quanh kinh đô, và
// không phải `homeField` — xem khối chú thích ở CONFIG.SUPPLY để biết vì sao đường
// biên nhìn thấy được mới là thứ đáng dùng. Chi phí: hai phép chia và một lần tra
// mảng cho mỗi đơn vị mỗi tick.
function tickSupply(u, tribe) {
  const S = CONFIG.SUPPLY;
  const C = CONFIG.TERRITORY.CELL;
  if (terrOwnerAt(Math.floor(u.x / C), Math.floor(u.y / C)) === u.tribeId) {
    u.supply = Math.min(u.maxSupply, u.supply + S.REFILL);
    u.supplySrc = 'home';
    return;
  }
  u.supply = Math.max(0, u.supply - S.DRAIN);
  // Xoá cờ ở ĐÂY chứ không ở tickCamp: cái trại chạy SAU vòng đơn vị (vòng công
  // trình nằm dưới), nên nếu nó cũng phải tự xoá cờ của mình thì một cái trại vừa
  // bị phá sẽ để lại vạch xanh trên hai chục người lính vĩnh viễn. Một cờ chỉ nên
  // có đúng một chỗ đặt lại về mặc định, và chỗ đó là nơi chạy sớm nhất.
  u.supplySrc = null;
}

// ============================================================
// ĐỘI HẬU CẦN
// ============================================================
// Đếm người nhà đang VƠI lương quanh một điểm. Ngưỡng là PLANT_AT (75%), KHÔNG
// phải HUNGRY (45%) — xem khối chú thích ở CONFIG.SUPPLY.CAMP.PLANT_AT: đếm theo
// mốc "đã ngã" thì cái trại luôn tới sau cuộc khủng hoảng nó sinh ra để ngăn.
//
// Trả về số lượng chứ không phải danh sách: chỗ gọi chỉ hỏi "có đáng dựng trại ở
// đây không", và dựng một mảng tạm cho mỗi đội hậu cần mỗi tick là rác cho bộ gom
// rác mà không đổi lấy gì.
function lowSupplyAround(x, y, tribeId, R) {
  const f = CONFIG.SUPPLY.CAMP.PLANT_AT;
  let n = 0;
  for (const o of units) {
    if (o.tribeId !== tribeId || o.hp <= 0 || !o.maxSupply) continue;
    if (o.supply >= o.maxSupply * f) continue;
    if (dist(o.x, o.y, x, y) > R) continue;
    n++;
  }
  return n;
}

// CHỖ ĐỘI HẬU CẦN NÊN ĐI TỚI — hai câu hỏi, MỘT lượt duyệt.
//
// Ưu tiên 1: người nhà VƠI NHẤT trong tầm, theo đúng thang điểm của pickPatients —
//   thiếu bao nhiêu TUYỆT ĐỐI chia cho khoảng cách đã làm mềm. Lấy tuyệt đối chứ
//   không lấy phần trăm vì thứ đội hậu cần sản xuất ra là QUÂN LƯƠNG, và một kỵ sĩ
//   trần 130 thiếu 90 vẫn cần nhiều hơn một cung thủ trần 70 thiếu 50.
// Ưu tiên 2 (khi CHƯA ai vơi): người nhà gần nhất đang đứng NGOÀI đất nhà. Đây là
//   nửa quan trọng hơn của bản sửa "đội hậu cần không đứng ở nơi có người đói" —
//   nới bán kính chỉ giúp nó ĐUỔI THEO cơn đói, vế này cho nó ĐI TRƯỚC cơn đói.
//   Điều kiện "ngoài đất nhà" chính là bộ lọc: quân trong lãnh thổ đang được tiếp
//   tế miễn phí, nên bám theo họ là bám theo đúng nhóm KHÔNG cần mình — mà nhóm đó
//   lại luôn là đám đông lớn nhất (đội quân đứng ở cờ tập kết).
//
// GỘP HAI HÀM THÀNH MỘT LƯỢT sau khi đo: ba lượt quét `units` cho mỗi đội hậu cần
// mỗi tick ngốn 0,081 ms/tick (9,1% tổng chi phí một tick) với 8 đội và 178 quân.
// Hai trong ba lượt hỏi cùng một danh sách với cùng một bộ lọc phe/máu/quân-lương,
// chỉ khác tiêu chí chọn — nên chúng chia nhau được một vòng for.
//
// Ngưỡng lọc "vơi" dùng CHUNG PLANT_AT với lowSupplyAround, và phải chung: nếu chỗ
// này đi tìm người đã đói còn chỗ kia đếm người đang vơi thì đội hậu cần sẽ đi tới
// đúng chỗ mà nó từ chối cắm trại. Hai ngưỡng cho cùng một khái niệm là họ lỗi
// hai-nguồn-sự-thật, và ở đây nó hiện ra thành "nó cứ đứng đó mà không làm gì".
function supplySeekTarget(u, R) {
  const f = CONFIG.SUPPLY.CAMP.PLANT_AT;
  const C = CONFIG.TERRITORY.CELL;
  let need = null, needScore = 0;
  let away = null, awayD = Infinity;
  for (const o of units) {
    if (o.tribeId !== u.tribeId || o.hp <= 0 || o === u || !o.maxSupply) continue;
    const d = dist(u.x, u.y, o.x, o.y);
    if (d > R) continue;
    if (o.supply < o.maxSupply * f) {
      const sc = (o.maxSupply - o.supply) / (d + 4);
      if (sc > needScore) { needScore = sc; need = o; }
    } else if (!need && d < awayD
               && terrOwnerAt(Math.floor(o.x / C), Math.floor(o.y / C)) !== u.tribeId) {
      // `!need` là một phép cắt ngắn, KHÔNG phải một luật: một khi đã tìm thấy
      // người vơi thì nhánh dự phòng không còn được dùng tới, nên thôi tra lãnh thổ
      // cho những người còn lại. Phép tra ấy là hai phép chia cộng một lần đọc mảng,
      // và nó chạy cho mỗi người nhà trong bán kính 60 ô.
      awayD = d; away = o;
    }
  }
  return need || away;
}

// Cắm trại. `instant` = true nên nó xong ngay trong tick này — không móng, không
// thợ, không hàng đợi xây dựng. Cả đường ống xây dựng bình thường (tìm chỗ quanh
// kinh đô + điều thợ tới) không bao giờ với tới được chỗ này, mà chỗ này mới là
// nơi cái trại có nghĩa.
function plantCamp(u, tribe) {
  const C = CONFIG.SUPPLY.CAMP;
  const cost = CONFIG.BUILD.camp.cost;    // MỘT bảng giá, xem chú thích ở CONFIG.BUILD.camp
  if (!canAfford(tribe, cost)) return false;
  pay(tribe, cost);
  const b = spawnBuilding(tribe, 'camp', u.x, u.y, true);
  b.expireAt = tick + supplyStats(tribe).ttl;
  b.ownerId = u.id;
  u.camp = b;
  u.campReadyAt = tick + C.COOLDOWN;
  addFx({ type: 'spark', x: u.x, y: u.y, life: 16, maxLife: 16, color: '#d8b25c' });
  addHotspot(u.x, u.y, 4, `${tribe.name} dựng trại tiếp tế`);
  return true;
}

// Thang ưu tiên của đội hậu cần. Ngắn hơn tickSoldier rất nhiều vì nó chỉ trả lời
// hai câu: đứng đâu, và có cắm trại ở đây không.
function tickQuarter(u, tribe) {
  const C = CONFIG.SUPPLY.CAMP;
  u.speed = slowedSpeed(u, roadSpeed(u, 1));
  // Trại đã chết (bị phá hoặc hết hạn) thì buông tham chiếu. Kiểm ở đây chứ không
  // ở chỗ cái trại chết: `buildings` bị lọc ở cuối tick và không ai báo cho chủ nó.
  if (u.camp && u.camp.hp <= 0) u.camp = null;

  // 1. Địch sát sườn thì lùi, không đánh trả (ô sát thương = 0) — đúng khuôn thầy
  //    lang và quân kỳ. Bán kính 4 chứ không 3: nó mang theo cả kho trên lưng và đi
  //    ở đầu đoàn, nên nó phải giật mình sớm hơn người đi cuối.
  const foe = findNearestEnemyUnit(u.x, u.y, u.tribeId, 4);
  if (foe) { moveAwayFrom(u, foe.x, foe.y); return; }

  // 2. CẮM TRẠI. Bốn điều kiện, và mỗi điều kiện chặn đúng một cách phí tiền:
  //    · chưa có trại nào của mình còn sống — nếu không thì một đội hậu cần rải
  //      trại suốt dọc đường hành quân và TTL trở thành trang trí;
  //    · đã hết nhịp chờ — chặn đúng cái tick sau khi trại cũ hết hạn;
  //    · đang đứng NGOÀI đất nhà — trong đất nhà thì lãnh thổ đã tiếp tế miễn phí
  //      rồi, cắm trại ở đó là 55 lương mua một thứ đang có sẵn;
  //    · quanh đây có đủ NEED_HUNGRY người đang VƠI lương (dưới PLANT_AT, không
  //      phải dưới HUNGRY) — một cái trại dựng cho một người là ngân sách quân đổ
  //      xuống sông, nhưng một cái trại dựng sau khi họ đã ngã thì vô ích.
  const C4 = CONFIG.TERRITORY.CELL;
  const onHome = terrOwnerAt(Math.floor(u.x / C4), Math.floor(u.y / C4)) === u.tribeId;
  if (!u.camp && tick >= u.campReadyAt && !onHome) {
    const reach = supplyStats(tribe).reach;
    if (lowSupplyAround(u.x, u.y, u.tribeId, reach) >= C.NEED_HUNGRY && plantCamp(u, tribe)) return;
  }

  // 3. Đi về phía người đói nhất trong tầm tìm; CHƯA ai đói thì bám theo người nhà
  //    đang ở ngoài đất nhà. Hai vế, và vế thứ hai mới là vế gánh việc — xem chú
  //    thích ở supplySeekTarget và ở CONFIG.SUPPLY.CAMP.SEEK_R: bản đầu chỉ có vế thứ nhất,
  //    và đo được là ở đúng những nhịp đội hậu cần rảnh tay để dựng trại, số người
  //    đói quanh nó trung bình là 0,03. Nó luôn tới NƠI ĐÃ ĐÓI sau khi cơn đói đã
  //    xảy ra ở chỗ khác.
  //
  //    Đi THAM LAM chứ không qua trường dẫn đường, đúng lý do đã viết ở tickMedic
  //    bước 4: mục tiêu là một CÁ THỂ cụ thể, và từ Phase 3.15 địa hình không chặn.
  //
  //    Dừng lại khi đã vào trong 60% bán kính trại chứ không khi chạm tới người đó:
  //    thứ nó sắp làm là cắm một cái trại phủ cả VÙNG, nên đứng giữa vùng thì đúng
  //    hơn là đứng dí vào một người. Đây là chỗ khác nhau thật giữa nó và thầy lang
  //    — thầy lang phải chạm tới bệnh nhân, hậu cần thì không.
  const reach = supplyStats(tribe).reach;
  const need = supplySeekTarget(u, C.SEEK_R);
  if (need) {
    const d = dist(u.x, u.y, need.x, need.y);
    if (d > reach * 0.6) {
      moveToward(u, need.x, need.y);
      u.facingX = Math.sign(need.x - u.x) || u.facingX;
      u.facingY = Math.sign(need.y - u.y) || u.facingY;
      return;
    }
    // Đã đứng đúng chỗ mà chưa cắm được (hết tiền, còn nhịp chờ, hoặc đang ở đất
    // nhà) thì cứ đứng đây. Quay về hàng lúc này là bỏ đi đúng vào lúc sắp tới lượt.
    return;
  }

  // 4. Không ai đói -> đi cùng đạo quân. Chép nguyên điều kiện của tickMedic bước
  //    5a, kể cả `soldiers >= 3`, và cùng một lý do đã trả giá đắt ở đó: một đơn vị
  //    hậu cần đứng ở cờ tập kết trong khi quân đánh nhau nửa bản đồ là một đơn vị
  //    hậu cần không tiếp tế ai. Với đơn vị NÀY thì lỗi đó còn nặng hơn hẳn, vì cả
  //    nội dung nghề của nó là KHOẢNG CÁCH.
  if (tribe.warTarget !== null && tribe.warField
      && tribe.warFieldTarget === tribe.warTarget
      && tribe.stats && tribe.stats.soldiers >= 3
      && marchWithFormation(u, tribe)) return;

  const spot = formationSpot(u, tribe);
  if (dist(u.x, u.y, spot.x, spot.y) > 2.2) walkToPoint(u, tribe, spot.x, spot.y);
}

// ============================================================
// TRẠI TIẾP TẾ — vòng đời và tiếp tế
// ============================================================
// Chạy ở vòng CÔNG TRÌNH của simulationTick, tức là SAU vòng đơn vị. Thứ tự đó
// quan trọng và nó đúng: người lính hao lương ở nửa đầu tick rồi được bù ở nửa
// sau, nên số dư cuối tick là hiệu của hai vế — đúng như cái vạch trên màn hình.
// Đảo lại thì một người lính đứng trong trại vẫn thấy vạch tụt ở mọi tick.
function tickCamp(b) {
  const tribe = tribes[b.tribeId];
  if (!tribe) return;
  if (tick >= (b.expireAt || 0)) {
    // Hết hạn thì NHỔ TRẠI, không phải bị phá: đánh dấu để hình vẽ và dòng nhật ký
    // không nhầm nó với một công trình bị san phẳng. hp = 0 đủ để lượt lọc xác ở
    // cuối tick dọn nó đi.
    b.hp = 0;
    b.packedUp = true;
    addFx({ type: 'spark', x: b.x, y: b.y, life: 14, maxLife: 14, color: '#9a8358' });
    return;
  }
  const S = supplyStats(tribe);
  // Xếp hạng rồi cắt lấy `slots` người đầu — đúng khuôn pickPatients, và ở đây
  // `slots` chính là con số mà yêu cầu gọi tên ("1 trạm chỉ phục vụ tối đa 5 lính").
  const found = [];
  for (const o of units) {
    if (o.tribeId !== b.tribeId || o.hp <= 0 || !o.maxSupply) continue;
    if (o.supply >= o.maxSupply) continue;
    const d = dist(o.x, o.y, b.x, b.y);
    if (d > S.reach) continue;
    found.push({ o, score: (o.maxSupply - o.supply) / (d + 4) });
  }
  if (!found.length) return;
  found.sort((p, q) => q.score - p.score);
  const n = Math.min(found.length, S.slots);
  for (let i = 0; i < n; i++) {
    const o = found[i].o;
    o.supply = Math.min(o.maxSupply, o.supply + S.rate);
    o.supplySrc = 'camp';
    o.suppliedAt = tick;      // hình vẽ đọc con số này để nháy quầng hổ phách
  }
  b.serving = n;              // bảng thông tin đọc: "đang nuôi n/slots"
}

