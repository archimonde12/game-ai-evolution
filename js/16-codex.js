'use strict';
// ============================================================
// 16-codex.js
// ------------------------------------------------------------
// THƯ KHỐ — bách khoa tra cứu mở từ trang bìa: quái vật, quân lính, công trình,
// anh hùng & thánh vật.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung một
// global scope như khi còn một file. Thẻ <script> này phải nằm SAU 13-render-world
// (dùng drawUnit/drawBuilding/drawMonster/withCanvas) và SAU 15-input-boot
// (dùng UNIT_LABEL, showMenu).
// ============================================================
//
// LUẬT CỦA CẢ FILE, và cũng là lý do nó đáng tồn tại:
// KHÔNG MỘT NÉT NÀO ĐƯỢC VẼ LẠI Ở ĐÂY.
//
// Mọi hình trong Thư khố đi qua đúng drawUnit / drawBuilding / drawMonster mà bản
// đồ chính đang gọi, chỉ khác cái canvas nhận nét (xem withCanvas trong
// 13-render-world). Mọi con số đi thẳng từ CONFIG, không có một hằng số nào chép
// tay sang đây.
//
// Vì sao khắt khe đến vậy: một cuốn bách khoa vẽ lại bằng tay thì đúng đúng một
// ngày — ngày viết nó — rồi sai dần từ hôm sau, bởi mỗi lần chỉnh sprite hay cân
// lại chỉ số sẽ không ai nhớ có bản thứ hai cần sửa. Và một cuốn sách mô tả SAI
// chính trò chơi mà nó mô tả thì tệ hơn hẳn là không có cuốn nào: người đọc không
// những không học được gì, họ còn học phải điều sai và tin chắc vào nó.
//
// Hệ quả cố ý: nếu ngày mai có ai đổi hình con Phi long hay hạ máu Kỵ sĩ, Thư khố
// tự đúng theo mà không cần một dòng nào ở file này thay đổi.

// ============================================================
// Sinh CÁ THỂ GIẢ để làm mẫu vẽ
// ============================================================
// Ba hàm dưới đây là chỗ duy nhất trong file có quyền biết cấu trúc một đơn vị/
// công trình/quái trông như thế nào — và chúng chỉ dựng đủ số trường mà đường vẽ
// đọc tới, không dựng một bản sao đầy đủ.
//
// Bộ lạc mẫu KHÔNG lấy từ `tribes`: Thư khố mở được từ trang bìa, tức là ở thời
// điểm chưa có một kỷ nguyên nào bắt đầu và `tribes` còn là mảng rỗng. Đây đúng
// là loại phụ thuộc ngầm chỉ vỡ ở một đường vào cụ thể — mở Thư khố GIỮA ván thì
// chạy tốt, mở từ trang bìa thì nổ.
function codexTribe(age) {
  const tpl = TRIBE_TEMPLATES[1];
  return {
    id: 1, name: tpl.name, color: tpl.color, dark: tpl.dark,
    age: age || 3,
    // Cấp nâng cấp 0: Thư khố tả đơn vị GỐC, không tả một bộ lạc đã nghiên cứu
    // tới đâu. Ai muốn xem giáp cấp 3 thì click người lính thật trên bản đồ.
    upgrades: emptyUpgrades(),
    heroLine: { dynasty: 'Thương Lang', gen: 1 },
    // Ba trường của hiệu ứng "trùng tu khi vừa lên đời". Không phải trang trí thừa:
    // drawAgeUpSweep tính mốc quét từ `ageFlashAt` và khoảng cách tới `home`, nên
    // thiếu chúng thì phép trừ ra NaN và createLinearGradient ném lỗi thật — cả tờ
    // Công trình trắng bóc. Đây là lần thứ ba trong dự án một `undefined` lặng lẽ
    // hoá NaN rồi làm vỡ thứ ở cách đó vài lớp (trước: viền lãnh thổ, rồi đội hình).
    // Số ÂM LỚN chứ không phải 0: với 0 thì ở những aTick đầu tiên sau khi tải
    // trang, `k` rơi đúng vào khoảng 0..1 và mọi công trình trong sách sẽ loé sáng
    // như vừa được trùng tu — cùng lý do `hitTick` phải là -99999 chứ không phải 0.
    ageFlashAt: -99999,
    ageFlashEnd: -99999,
    home: { x: 0, y: 0 }
  };
}

function codexUnit(type, tribe) {
  const base = unitSpec(type);
  return {
    id: 900 + type.length * 7, tribeId: tribe.id, type,
    x: 0, y: 0, rx: 0, ry: 0,
    hp: base.hp, maxHp: base.hp,
    attack: base.attack, defense: base.defense || 0,
    speed: 1, speedMult: base.speedMult || 0, speedCredit: 0,
    range: base.range || 0, minRange: base.minRange || 0, splash: base.splash || 0,
    // BA NĂNG LỰC THIÊN TRIỀU. Bỏ sót chúng thì luật của file này ("dựng đủ số
    // trường mà ĐƯỜNG VẼ đọc tới") bị vi phạm mà không ném lỗi nào, và nó đã sai
    // thật ở hai chỗ:
    //   · `pierce` — `siegeOf()` dùng nó để nhận ra một cỗ máy công thành. Thiếu
    //     nó thì nỏ thần của Thư khố vô hình trước nhánh Công thành: `effScale`
    //     trả về 1 mãi mãi, nên một cỗ máy cấp 3 vẽ đúng bằng cấp 0. Lỗi nằm im
    //     được vì bộ lạc mẫu của Thư khố chưa bao giờ có `siegeBonus` — hai cái
    //     thiếu che cho nhau, và cái đầu tiên được vá sẽ làm cái thứ hai lộ ra.
    //   · `rallyR` — drawUnit vẽ vòng cổ vũ của Quân kỳ theo đúng bán kính THẬT.
    //     Thiếu nó thì thẻ Quân kỳ mất đúng thứ khiến nó là Quân kỳ.
    pierce: base.pierce || 0, pierceWidth: base.pierceWidth || 0,
    trample: base.trample || 0, trampleR: base.trampleR || 0,
    rallyR: base.rallyR || 0, rallyAtk: base.rallyAtk || 0, rallySpeed: base.rallySpeed || 0,
    rallyUntil: 0, rallySpd: 0,
    atkCooldown: base.cooldown || CONFIG.UNIT.ATTACK_COOLDOWN,
    facingX: 1, facingY: 0, cooldown: 0, born: 0,
    job: null, task: 'idle', carry: { type: null, amount: 0 },
    combatTarget: null, lungeUntil: 0, swingAt: 0, fleeTimer: 0,
    auraUntil: 0, auraMult: 1, slowUntil: 0, venomUntil: 0,
    mending: false, healing: null, healed: 0,
    // Anh hùng: dựng đủ phần mà drawHero đọc. `retreating` false để mẫu là dáng
    // đang tiến, không phải dáng đang bỏ chạy — cuốn sách tả nhân vật, không tả
    // một tình huống.
    name: 'Thương Lang đời 1', retreating: false,
    items: [], genes: null, heroGen: 1,
    auraR: CONFIG.HERO.AURA_R || 5, commandMult: 1.2,
    flash: 0
  };
}

function codexMonster(mType) {
  const spec = CONFIG.MONSTER.TYPES[mType];
  return {
    id: 800 + mType.length * 5, tribeId: -1, type: 'monster', mType,
    x: 0, y: 0, rx: 0, ry: 0,
    hp: spec.hp, maxHp: spec.hp,
    attack: spec.attack, defense: spec.defense || 0,
    speedMult: spec.speedMult, speed: 1, speedCredit: 0,
    cooldown: 0, cd: spec.cooldown, born: 0, threat: spec.threat,
    facingX: 1, facingY: 0, lungeUntil: 0, swingAt: 0,
    combatTarget: null, auraUntil: 0, auraMult: 1,
    carry: { type: null, amount: 0 }, fleeTimer: 0, roam: 20,
    fly: !!spec.fly, range: spec.range || 0, minRange: spec.minRange || 0,
    splash: spec.splash || 0, venom: spec.venom || null,
    split: spec.split || null, splitGen: 0,
    // `aura: null` cho Chúa Hang, cùng một lý lẽ với `buried: false` ngay dưới đây.
    // Hào quang vẽ ra là một vầng đỏ bán kính `aura.r` Ô — với Chúa Hang là 6 ô,
    // tức là gấp mấy lần bề ngang cái khung 84px. Vòng tự căn khung sẽ làm đúng
    // việc của nó: thu nhỏ cho tới khi VẦNG SÁNG vừa khung, và con quái tụt xuống
    // còn vài pixel ở chính giữa. Đo thật: đây là thẻ DUY NHẤT trong 31 thẻ không
    // hội tụ, vết mực chiếm tròn 100% khung ở cả bốn lượt.
    //
    // Cuốn sách tả CON QUÁI, không tả cái vùng ảnh hưởng của nó — vùng ảnh hưởng
    // đã có một dòng chữ nói rõ hơn hình bao giờ hết ("+35% sát thương trong 6 ô").
    aura: null,
    ambush: spec.ambush || null,
    // `buried: false` dù Rết Cát sinh ra là đã vùi. Vùi thì drawMonster vẽ một ụ
    // đất — đúng với trò chơi, và vô dụng với một cuốn sách tra: người đọc mở mục
    // "Rết Cát" ra để biết CON RẾT trông thế nào, không phải để nhìn cái ụ. Phần
    // "nó nằm dưới đất" thì dòng động từ nói bằng chữ, rõ hơn hình.
    buried: false, burstUntil: 0, rehideAt: 0,
    slow: spec.slow || null, heal: spec.heal || null, siege: spec.siege || 0,
    raidTribe: -1, raidUntil: 0, assault: false, scale: 1, flash: 0
  };
}

function codexBuilding(type, tribe) {
  const spec = CONFIG.BUILD[type];
  return {
    id: 700 + type.length * 3, tribeId: tribe.id, type,
    x: 0, y: 0, size: spec.size,
    hp: spec.hp, maxHp: spec.hp,
    done: true, progress: spec.buildTicks, buildTicks: spec.buildTicks,
    cooldown: 0, hitTick: -99999, farmCells: [],
    wonderDoneAt: 0
  };
}

// ============================================================
// Vẽ một ô mẫu
// ============================================================
// Ô vuông 84px, và cỡ ô (`cs`) suy NGƯỢC từ bề ngang của thứ được vẽ chứ không
// đặt cứng: Kỳ quan chiếm 5 ô còn con sói chiếm 1, dùng chung một cs thì hoặc Kỳ
// quan tràn ra ngoài khung hoặc con sói chỉ còn là một chấm ở giữa một khoảng
// trắng. Chia cho (size + đệm) là cách duy nhất để mọi mục trong sách chiếm
// khoảng giấy như nhau — mà "chiếm khoảng giấy như nhau" chính là thứ khiến một
// lưới thẻ đọc được thành một BẢNG chứ không thành một đống hình lộn xộn.
const CX_BOX = 84;

// SỐ HIỆU BỘ LẠC MẪU. drawUnit/drawBuilding không nhận bộ lạc làm tham số — chúng
// tra `tribes[u.tribeId]` từ mảng TOÀN CỤC. Nên "dựng một bộ lạc giả rồi truyền
// vào" là bất khả thi: phải thay đúng ô số 1 của `tribes` trong lúc vẽ, rồi trả
// lại nguyên trạng.
//
// Đây là chỗ đã cắn thật khi chạy thử, và nó chỉ cắn ở MỘT đường vào: mở Thư khố
// từ trang bìa thì `tribes` còn là mảng rỗng, `tribes[1]` là undefined, và
// `tribe.dark` nổ ngay dòng đầu drawUnit. Mở giữa ván thì chạy trơn tru — vì tình
// cờ có sẵn một bộ lạc thật ở đúng ô đó. Loại lỗi tệ nhất trong bảng: nó không
// phải là "sai", nó là "đúng nhờ một thứ mình không hề yêu cầu".
//
// Và kể cả khi có ván đang chạy thì vẫn PHẢI thay: bộ lạc thật đã nghiên cứu tới
// đâu thì lính vẽ ra giáp tới đó, mà cuốn sách thì nhận là đang tả đơn vị GỐC.
const CX_TRIBE_ID = 1;

// ============================================================
// TỰ CĂN KHUNG — đo vết mực thật rồi vẽ lại cho vừa
// ============================================================
// Bản đầu căn hình bằng công thức: đặt Ô của đơn vị vào giữa khung, cỡ ô suy ra
// từ `size` trong config. Nhìn ảnh chụp thì máy bắn đá bị cắt cụt bên trái, hai
// loại kỵ binh cụt cả trái lẫn dưới, và con Sói thì nằm lệch hẳn xuống góc.
//
// Lý do là một giả định sai mà chính dự án này đã bắt được hai lần rồi (Phase 3.5
// "hit-test tưởng sprite ≡ footprint", Phase 3.19 "ba thứ neo vào ô lưới cùng vỡ
// khi sprite tràn ra khỏi ô"): SPRITE KHÔNG TRÙNG VỚI Ô CỦA NÓ. Con ngựa thò ra
// hai bên, càng máy bắn đá thò ra phía trước, mái nhà vươn lên trên. Căn theo ô
// là căn theo một hình chữ nhật mà không hàm vẽ nào hứa sẽ tôn trọng.
//
// Nên: vẽ một lần, ĐỌC PIXEL để biết vết mực thật nằm ở đâu, rồi vẽ lại đúng một
// lần nữa với độ dịch và tỉ lệ đã tính. Không có bảng bù trừ chép tay cho từng
// loại — thứ đó sẽ sai ngay lần đầu ai đó chỉnh một sprite, mà đúng cái đó là
// điều cả file này sinh ra để tránh.
//
// Giá: hai lần vẽ + một getImageData cho mỗi thẻ, chạy một lần lúc mở tờ. Với ~30
// thẻ thì không đo được trên đồng hồ.
function codexInkBox(c2, w, h) {
  const d = c2.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] <= 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function codexDraw(canvas, kind, key, opt) {
  const c2 = canvas.getContext('2d');
  const tribe = codexTribe(opt && opt.age);
  // Cất và trả lại MỌI trạng thái vẽ toàn cục mà đường vẽ đọc tới. camX/camY phải
  // về 0 vì các hàm vẽ tính toạ độ sợi chỉ/hào quang từ chúng; CELL_SIZE thì
  // drawBuilding đọc để tính chiều cao mái.
  //
  // TOÀN BỘ nằm trong try/finally, và bản đầu thì không — nó trả lại trạng thái
  // bằng ba dòng đặt sau lời gọi withCanvas. Lần chạy thử đầu tiên ném lỗi giữa
  // chừng, ba dòng đó bị nhảy qua, và CONFIG.CELL_SIZE ở lại giá trị 17,14 của một
  // cái thẻ 84px: cả bản đồ chính vẽ những frame sau bằng cỡ ô của Thư khố. Đúng
  // cái bẫy mà chú thích của withCanvas đã tự viết ra để cảnh báo — rồi chính hàm
  // gọi nó lại mắc, ở ba biến khác.
  const sCS = CONFIG.CELL_SIZE, sX = camX, sY = camY;
  const sTribe = tribes[CX_TRIBE_ID], sLen = tribes.length;
  try {
    camX = 0; camY = 0;
    tribe.id = CX_TRIBE_ID;
    tribes[CX_TRIBE_ID] = tribe;
    const W = canvas.width, H = canvas.height;
    // Cỡ ô KHỞI ĐIỂM — chỉ là một phỏng đoán để lượt vẽ đo đạc có cái mà đo. Nó
    // không cần đúng; vòng căn khung bên dưới sẽ sửa lại bằng số liệu thật.
    const span = kind === 'build' ? CONFIG.BUILD[key].size + 1.9
               : kind === 'monster' ? CONFIG.MONSTER.TYPES[key].size + 1.15
               : 1.9;
    let cs = CX_BOX / span;

    // Vẽ MỘT cá thể ở (px, py) với cỡ ô cs. Đóng gói thành closure để gọi lại
    // được nguyên vẹn ở lượt hai — hai lượt phải vẽ ĐÚNG cùng một thứ, khác mỗi
    // vị trí và tỉ lệ, nếu không thì cái đo được ở lượt một không nói gì về lượt hai.
    const paint = (size, ox, oy) => {
      CONFIG.CELL_SIZE = size;
      if (kind === 'build') {
        const b = codexBuilding(key, tribe);
        const px = ox - b.size * size / 2, py = oy - b.size * size / 2;
        b.x = px / size; b.y = py / size;
        drawBuilding(b, px, py, size);
      } else {
        const u = kind === 'monster' ? codexMonster(key) : codexUnit(key, tribe);
        const px = ox - size / 2, py = oy - size / 2;
        u.x = px / size; u.y = py / size; u.rx = u.x; u.ry = u.y;
        drawUnit(u, px, py, size);
      }
    };

    withCanvas(c2, () => {
      // LẶP tới khi vừa, tối đa 4 lượt — KHÔNG phải một lượt đo rồi một lượt vẽ.
      //
      // Bản hai-lượt đã chạy đúng cho 27/31 thẻ rồi kẹt ở đúng bốn cái to nhất
      // (Nhà chính, Đền thờ, Kỳ quan, Chúa Hang): chúng vẫn bị cắt. Lý do là phép
      // suy "vẽ to gấp k lần thì vết mực cũng to gấp k lần" KHÔNG đúng — trong
      // các hàm vẽ có hàng chục chỗ `Math.max(1, s * 0.06)` và vài chi tiết chỉ
      // hiện ra khi `cs` vượt ngưỡng (`if (cs >= 11)`), nên hình ở cỡ nhỏ không
      // phải là bản thu nhỏ của hình ở cỡ lớn. Đo một lần rồi ngoại suy là tin vào
      // một quan hệ tuyến tính không ai hứa.
      //
      // Lặp thì không cần quan hệ đó: mỗi lượt chỉ dùng số liệu ĐO ĐƯỢC của chính
      // cỡ vừa vẽ. Bốn lượt là trần cứng — thà một thẻ hơi nhỏ còn hơn một vòng
      // lặp có thể không dừng nằm trên đường mở giao diện.
      let size = cs / 2.4;
      let ox = W / 2, oy = H / 2;
      for (let pass = 0; pass < 4; pass++) {
        c2.clearRect(0, 0, W, H);
        paint(size, ox, oy);
        const box = codexInkBox(c2, W, H);
        if (!box) break;
        const clipped = box.x0 <= 0 || box.y0 <= 0 || box.x1 >= W - 1 || box.y1 >= H - 1;
        // Vết mực chiếm 86% khung: chừa một vành thở, và quan trọng hơn là để mọi
        // thẻ trong lưới có cùng mật độ hình — thứ khiến một lưới thẻ đọc ra thành
        // bảng chứ thành một đống hình lộn xộn.
        const k = Math.min(W * 0.86 / box.w, H * 0.86 / box.h);
        if (!clipped && k > 0.94 && k < 1.06) break;   // đã vừa, dừng
        // Dịch điểm vẽ ngược đúng phần tâm vết mực đang lệch (tính ở tỉ lệ mới).
        const inkCx = (box.x0 + box.x1 + 1) / 2, inkCy = (box.y0 + box.y1 + 1) / 2;
        ox = W / 2 + (ox - inkCx) * k;
        oy = H / 2 + (oy - inkCy) * k;
        size *= k;
      }
    });
  } finally {
    CONFIG.CELL_SIZE = sCS; camX = sX; camY = sY;
    // Trả lại ĐÚNG chiều dài cũ, không phải "cắt về CX_TRIBE_ID". Bản đầu viết
    // `tribes.length = Math.min(len, CX_TRIBE_ID)` và để lại một mảng dài 1 ở nơi
    // trước đó là mảng rỗng — đo ra ngay: mở Thư khố từ trang bìa xong thì
    // `tribes.length === 1`. Không vô hại: `tribes.length` khác 0 là dấu hiệu mà
    // vài chỗ khác đọc thành "đã có một kỷ nguyên đang chạy".
    tribes[CX_TRIBE_ID] = sTribe;
    tribes.length = sLen;
  }
}

// ============================================================
// Mảnh HTML dùng chung
// ============================================================
function cxCost(cost) {
  const NAME = { food: 'lương', wood: 'gỗ', gold: 'vàng', stone: 'đá' };
  const parts = [];
  for (const k in cost) parts.push(`<b>${cost[k]}</b> ${NAME[k] || k}`);
  return parts.join(' · ') || '—';
}

function cxCard(kind, key, opt) {
  const o = opt || {};
  const stats = (o.stats || []).map(s => `<span>${s}</span>`).join('');
  return `<div class="cx-card">
    <canvas width="${CX_BOX}" height="${CX_BOX}" data-kind="${kind}" data-key="${key}"${o.age ? ` data-age="${o.age}"` : ''}></canvas>
    <div class="cx-info">
      <div class="cx-name">${o.name}</div>
      <div class="cx-sub">${o.sub || ''}</div>
      ${stats ? `<div class="cx-stats">${stats}</div>` : ''}
      ${o.verb ? `<div class="cx-verb">${o.verb}</div>` : ''}
      ${o.blurb ? `<div class="cx-blurb">${o.blurb}</div>` : ''}
    </div>
  </div>`;
}

// ============================================================
// TỜ 1 — QUÁI VẬT
// ============================================================
// Mỗi loài được tả bằng ĐỘNG TỪ của nó trước, chỉ số sau — cùng nguyên tắc đã
// dùng khi thêm loài vào CONFIG.MONSTER.TYPES ("một loài mới chỉ được vào nếu nó
// mang một động từ chưa ai có"). Nếu cuốn sách xếp chúng theo máu và sát thương
// thì nó dạy người đọc một cách nhìn SAI về chính bảng loài này: mười hai con
// quái không khác nhau ở bảng số, chúng khác nhau ở việc chúng LÀM GÌ.
function codexMonsterVerb(spec) {
  const v = [];
  if (spec.fly) v.push('<b>BAY</b> — bỏ qua rừng, đi đường thẳng');
  if (spec.range > 0) v.push(`<b>BẮN XA</b> ${spec.range} ô (lùi ra khi bị áp sát dưới ${spec.minRange})`);
  if (spec.venom) v.push(`<b>ĐỘC</b> — ${spec.venom.dps}/tick trong ${spec.venom.ticks} tick sau khi cắn`);
  if (spec.splash > 0) v.push(`<b>SÁT THƯƠNG LAN</b> ${spec.splash} ô`);
  if (spec.aura) v.push(`<b>HÀO QUANG</b> +${Math.round((spec.aura.mult - 1) * 100)}% sát thương cho quái trong ${spec.aura.r} ô`);
  if (spec.split) v.push(`<b>PHÂN ĐÔI</b> — chết thì tách thành ${spec.split.count} con ${Math.round(spec.split.scale * 100)}% (con nhỏ không tách nữa)`);
  if (spec.ambush) v.push(`<b>PHỤC KÍCH</b> — nằm vùi, không ai nhắm được, trồi lên trong ${spec.ambush.r} ô và đòn đầu ×${spec.ambush.mult}`);
  if (spec.slow) v.push(`<b>LÀM CHẬM</b> — vết cắn cắt tốc độ ×${spec.slow.mult} trong ${spec.slow.ticks} tick`);
  if (spec.heal) v.push(`<b>HỒI MÁU</b> ${spec.heal.amount} máu/${spec.heal.every} tick cho quái trong ${spec.heal.r} ô`);
  if (spec.siege > 0) v.push(`<b>CÔNG THÀNH</b> ×${spec.siege} sát thương lên công trình`);
  if (spec.worldBoss) {
    const L = CONFIG.WORLD_BOSS.LOOT;
    const R = CONFIG.WORLD_BOSS.RAMP;
    const lo = worldBossScaled(0), hi = worldBossScaled(R.PEAK_TICK);
    v.push(`<b>MẠNH DẦN THEO THỜI GIAN</b> — thả càng muộn càng dữ, đỉnh ở tick ${R.PEAK_TICK.toLocaleString('vi-VN')}: `
         + `${lo.rank} ${lo.hp.toLocaleString('vi-VN')} máu / đòn ${Math.round(lo.attack)} `
         + `→ ${hi.rank} ${hi.hp.toLocaleString('vi-VN')} máu / đòn ${Math.round(hi.attack)}`);
    v.push(`<b>SĂN KẺ DẪN ĐẦU</b> — hành quân thẳng tới bộ lạc đang đứng nhất bảng, nhắm lại mỗi ${CONFIG.WORLD_BOSS.RETARGET} tick`);
    v.push(`<b>KHO BÁU</b> — bộ lạc ra đòn cuối nhận ${L.food} lương · ${L.wood} gỗ · ${L.stone} đá · ${L.gold} vàng ở bậc gốc, NHÂN theo đúng hệ số con quái (tới ${Math.round(L.food * R.PEAK)} lương ở bậc đỉnh); Chúa Tể được hoàn ${CONFIG.WORLD_BOSS.FAITH_REFUND} Đức Tin`);
    v.push(`<b>THÁNH VẬT CẤP ${CONFIG.ITEM.LEVEL_TAG[CONFIG.ITEM.MAX_LEVEL]}</b> — con đường duy nhất tới món đồ mạnh nhất game mà không phải nung bốn món cấp 1 lại`);
    v.push(`<b>MỘT CẤP NGHIÊN CỨU</b> — nhánh đang làm dở xong ngay, hoặc cộng thẳng một cấp vào nhánh đang cao nhất; áp tức thì cho cả đạo quân đang sống`);
  }
  if (!v.length) v.push('<b>ĐUỔI</b> — bám và cắn, không có mẹo nào khác');
  return v.join('<br>');
}

function codexTabMonsters() {
  const T = CONFIG.MONSTER.TYPES;
  // Xếp theo mức nguy hiểm để cuốn sách đọc ra một cái THANG, không phải một danh
  // sách theo thứ tự tình cờ của object literal trong config.
  const keys = Object.keys(T).sort((a, b) => T[a].threat - T[b].threat);
  const cards = keys.map(k => {
    const s = T[k];
    return cxCard('monster', k, {
      name: s.label,
      // THIÊN MA không ra từ hang nào cả — nó chỉ tồn tại khi người xem thả nó
      // xuống. Ghi đúng nguồn gốc ở dòng phụ, nếu không thì người đọc sẽ đi tìm
      // nó trong bảng ladder bên dưới và không bao giờ thấy.
      sub: s.worldBoss ? `nguy hiểm ${s.threat}× · do CHÚA TỂ thả xuống, không ra từ hang`
                       : `nguy hiểm ${s.threat}× · quái hoang dã`,
      stats: [
        // Thiên Ma không có MỘT con số máu nữa — nó có một DẢI. In con số gốc ở đây
        // là in con số của một con quái chưa từng tồn tại (hệ số ở tick 0 đã là 0,62).
        s.worldBoss
          ? `máu <b>${worldBossScaled(0).hp.toLocaleString('vi-VN')}–${worldBossScaled(CONFIG.WORLD_BOSS.RAMP.PEAK_TICK).hp.toLocaleString('vi-VN')}</b>`
          : `máu <b>${s.hp}</b>`,
        s.worldBoss
          ? `đánh <b>${Math.round(worldBossScaled(0).attack)}–${Math.round(worldBossScaled(CONFIG.WORLD_BOSS.RAMP.PEAK_TICK).attack)}</b>`
          : `đánh <b>${s.attack}</b>`,
        s.defense ? `giáp <b>${s.defense}</b>` : '',
        `tốc <b>${s.speedMult}</b>`, `nhịp <b>${s.cooldown}</b> tick`,
        `rơi đồ <b>${Math.round(s.drop * 100)}%</b>`
      ].filter(Boolean),
      verb: codexMonsterVerb(s)
    });
  }).join('');

  // Hang ổ nằm CÙNG tờ với quái, không tách riêng: hang không phải một loại công
  // trình mà là NGUỒN của mọi con quái trên tờ này, và cấp hang mới là thứ quyết
  // định người xem có bao giờ gặp được loài dữ hay không.
  const tiers = CONFIG.MONSTER.TIERS.map((t, i) => {
    // `ladder` là danh sách quay vòng, có LẶP (Tổ Quỷ ghi 'troll' hai lần để tăng
    // mật độ). Khử trùng khi in ra: người đọc cần biết "cấp này ra được những loài
    // nào", còn tỉ lệ thì đọc từ dòng threat của từng loài ở trên.
    const spawn = [...new Set(t.ladder || [])].map(k => T[k] ? T[k].label : k).join(' · ');
    return `<div class="cx-card"><div class="cx-info">
      <div class="cx-name">${t.name}</div>
      <div class="cx-sub">cấp ${i + 1}${CONFIG.MONSTER.FEED.TIER_AT[i] !== undefined ? ` · lên cấp ở ${CONFIG.MONSTER.FEED.TIER_AT[i]} điểm nuôi` : ' · cấp cao nhất'}</div>
      <div class="cx-stats"><span>trần quái <b>${t.cap}</b></span><span>lảng vảng <b>${t.roam}</b> ô</span>${t.raidEvery > 0 ? `<span>đi cướp mỗi <b>${t.raidEvery}</b> tick</span>` : ''}</div>
      <div class="cx-verb">nhả ra: ${spawn || '—'}</div>
    </div></div>`;
  }).join('');

  return `<div class="cx-intro">Quái vật là <b>phe thứ năm</b> — không thuộc bộ lạc nào và tấn công tất cả.
    Mỗi loài mang đúng <b>một động từ</b> mà những loài khác không có; bảng chỉ số chỉ là hệ quả.
    Hang ổ <b>lớn lên bằng thứ nó giết được</b>: bỏ mặc một cái hang là tự tay mở khoá những loài dữ hơn cho chính mình.</div>
    <div class="cx-grid">${cards}</div>
    <div class="cx-sect">Hang ổ — nguồn của tất cả</div>
    <div class="cx-grid">${tiers}</div>`;
}

// ============================================================
// TỜ 2 — QUÂN LÍNH
// ============================================================
const CX_UNIT_ORDER = ['villager', 'soldier', 'archer', 'medic', 'quarter', 'knight', 'horsearcher', 'catapult',
                       'ballista', 'elephant', 'standard', 'hero'];
const CX_UNIT_BLURB = {
  villager: 'Hái quả, đốn gỗ, đào vàng, đục đá và xây mọi thứ. Thấy lính địch trong 7 ô là bỏ chạy — họ không phải quân.',
  soldier: 'Xương sống của mọi đạo quân. Rẻ, có giáp sẵn, và là loại duy nhất có mặt từ tick đầu tới tick cuối.',
  archer: 'Bắn trước khi bị chạm, nhưng 42 máu thì bị kỵ binh sát vào là tan. Chính tầm bắn tạo ra <b>đội hình</b>: có lý do để đứng sau.',
  medic: 'Không có ô sát thương. Đi tìm thương binh nặng nhất quanh mình và vá lại <b>ngay giữa trận</b> — đưa hậu phương ra tiền tuyến thay vì bắt thương binh đi bộ về.',
  quarter: `Không có ô sát thương. Nó dựng <b>Trại tiếp tế</b> giữa đất địch — cái trại nuôi <b>${CONFIG.SUPPLY.CAMP.SLOTS} suất</b> quân lương một lúc trong bán kính <b>${CONFIG.SUPPLY.CAMP.R} ô</b> rồi tự nhổ sau <b>${CONFIG.SUPPLY.CAMP.TTL} tick</b>. Là đơn vị hỗ trợ thứ ba, và ba đơn vị ấy nằm trên ba trục vuông góc: thầy lang mua <b>thời gian</b>, quân kỳ mua <b>cường độ</b>, hậu cần mua <b>khoảng cách</b>.`,
  knight: 'Nặng, nhanh, thắng dã chiến — nhưng đập tường rất chậm. Đắt gấp rưỡi mỗi suất và ăn lương gấp đôi.',
  horsearcher: 'Bắn trên lưng ngựa: giữ được khoảng cách với thứ đuổi mình. Loại quân mở khoá muộn nhất trong cả bảng.',
  catapult: 'Loại quân <b>duy nhất</b> được miễn hình phạt đập nhà — và đó là toàn bộ lý do nó tồn tại. Thua dã chiến, chậm, đắt; đổi lại nó là câu trả lời cho một câu hỏi mà không ai khác trả lời được.',
  ballista: 'Bắn một mũi lao <b>xuyên thẳng</b>, trúng mọi kẻ địch trên đường đạn. Máy bắn đá lan theo <b>hình tròn</b> nên né nó bằng cách đứng thưa; nỏ thần đi theo <b>đường thẳng</b> nên né nó bằng cách đứng lệch hàng — và một đạo quân không thể vừa thưa vừa lệch hàng. Bộ lạc kỷ luật cao xếp hàng đẹp, và chính vì thế ăn trọn một phát.',
  elephant: 'Gây sát thương cho mọi kẻ địch nó <b>đi ngang qua</b>, không cần lệnh, không có hồi chiêu. Mọi đơn vị khác gây sát thương bằng cách DỪNG LẠI và nhắm; voi gây sát thương bằng cách ĐI. Chặn đường nó bằng một khối quân đông thì chính sự đông đúc đó là thứ giết mình.',
  standard: 'Không đánh ai. Đồng đội quanh nó đánh mạnh hơn và đi nhanh hơn. Là anh em đối xứng của Thầy lang: thầy lang mua <b>thời gian</b>, quân kỳ mua <b>cường độ</b>. Hào quang <b>không cộng dồn</b> — hai lá cờ đứng cạnh nhau chỉ bằng một, nên gom cờ không phải một chiến lược.',
  hero: 'Mỗi bộ lạc nhiều nhất MỘT người còn sống, và là đơn vị <b>duy nhất có gen riêng của cá thể</b> — xem tờ Anh hùng.'
};

function codexTabUnits() {
  const tribe = codexTribe(4);
  const cards = CX_UNIT_ORDER.map(k => {
    const s = unitSpec(k);
    const age = CONFIG.AGE.UNLOCK_UNIT[k] || 1;
    const src = TRAIN_SOURCE[k];
    return cxCard('unit', k, {
      age: 4,
      name: UNIT_LABEL[k] || k,
      sub: `${CONFIG.AGE.NAMES[age]} · ${src ? CONFIG.BUILD[src].label : '—'}`,
      stats: [
        `máu <b>${s.hp}</b>`,
        s.attack ? `đánh <b>${s.attack}</b>` : '<b>không đánh</b>',
        // Đập tường in cạnh sức đánh thường, luôn luôn, kể cả khi hai số bằng nhau
        // — vì chính khoảng cách giữa chúng là thứ tờ này phải dạy được.
        s.attack ? `đập tường <b style="color:${s.siege ? 'var(--gold)' : 'inherit'}">${
          (s.attack * (s.siege ? CONFIG.UNIT.BUILDING_DAMAGE_MULT : CONFIG.UNIT.BUILD_PENALTY)).toFixed(1)
        }</b>` : '',
        s.defense ? `giáp <b>${s.defense}</b>` : '',
        s.range ? `tầm <b>${s.range}</b> ô` : '',
        s.speedMult ? `tốc <b>${s.speedMult}</b> ô/tick` : '',
        // GIÁ ĐỌC QUA trainCost — cùng con số mà bộ não thật sự trả, không phải
        // bảng gốc. Từ 3.30 phần lương thực của giá quân được hoàn phần lớn vì
        // suất đó đã nuốt một dân thường; in bảng gốc ở đây là dạy người đọc một
        // con số mà không chỗ nào trong trò chơi dùng tới.
        `giá ${cxCost(trainCost(k))}`,
        k !== 'villager' && k !== 'hero' ? `+ <b style="color:var(--gold)">1 dân thường</b>` : '',
        `lò <b>${s.trainTicks}</b> tick`
      ].filter(Boolean),
      // Mỗi loại quân MỘT động từ, và thứ tự xét ở đây là thứ tự "nét nào định
      // nghĩa loại này". Một loại chỉ được in MỘT động từ: hai dòng in đậm cạnh
      // nhau thì không dòng nào còn là câu trả lời cho "loại này để làm gì".
      verb: s.trample ? `<b>GIẪM ĐẠP</b> — gây <b>${s.trample}</b> sát thương mỗi tick cho mọi kẻ địch trong <b>${s.trampleR}</b> ô quanh mình, không cần nhắm và không có hồi chiêu. Đơn vị duy nhất trong game gây sát thương bằng việc <b>di chuyển</b>.`
          : s.pierce ? `<b>XUYÊN THẤU</b> — mũi lao đi hết <b>${s.pierce}</b> ô theo đường thẳng, mọi kẻ địch nằm trên đường đạn đều dính đòn (80% sát thương). Đội hình càng thẳng hàng càng thiệt.`
          : s.rallyR ? `<b>CỔ VŨ</b> — quân nhà trong <b>${s.rallyR}</b> ô đánh mạnh thêm <b>${Math.round(s.rallyAtk * 100)}%</b> và đi nhanh thêm <b>${Math.round(s.rallySpeed * 100)}%</b>. Nhiều lá cờ <b>không cộng dồn</b>: chỉ lấy lá mạnh nhất.`
          : s.siege ? '<b>CÔNG THÀNH</b> — miễn hình phạt đập nhà: chạm vào tường bằng <b>'
              + CONFIG.UNIT.BUILDING_DAMAGE_MULT + '×</b> sức đánh thường, trong khi mọi loại khác chỉ còn '
              + Math.round(CONFIG.UNIT.BUILD_PENALTY * 100) + '%.' : '',
      blurb: CX_UNIT_BLURB[k]
    });
  }).join('');
  return `<div class="cx-intro">Thời đại chỉ <b>MỞ KHOÁ</b> một loại quân — muốn có nó thật thì vẫn phải bỏ tài nguyên dựng đúng công trình ra lò.
    Vì thế hai bộ lạc cùng lên Hoàng Kim vẫn có thể có hai đạo quân không giống nhau chút nào.
    Hình dưới đây vẽ ở <b>cấp nâng cấp 0</b>; giáp, vũ khí và mũ sẽ đổi hình theo năm nhánh nghiên cứu.
    <span class="cx-locked">(Chỉ số chưa nhân hệ số thời đại.)</span>
    <br><br><b>ĐẬP TƯỜNG LÀ MỘT CHỈ SỐ RIÊNG.</b> Bộ binh, cung thủ, kỵ binh và cả anh hùng chỉ chạm được
    <b>${Math.round(CONFIG.UNIT.BUILD_PENALTY * 100)}%</b> sức đánh của mình vào công trình; <b>vũ khí công thành</b>
    thì ngược lại, đánh <b>${CONFIG.UNIT.BUILDING_DAMAGE_MULT}×</b>. Một cỗ máy bắn đá đập tường bằng <b>60</b>,
    một kỵ sĩ bằng <b>2,6</b> — nhìn hai ô &ldquo;đánh&rdquo; (20 với 13) thì không đoán ra khoảng cách 23 lần đó.
    Muốn <b>phá thành</b> thì phải dựng Xưởng thợ; một đạo quân đông tới mấy cũng chỉ gặm được tường rất chậm.</div>
    <div class="cx-grid">${cards}</div>`;
}

// ============================================================
// TỜ 3 — CÔNG TRÌNH
// ============================================================
const CX_BUILD_BLURB = {
  town: 'Kinh đô. Ra dân, nhận hàng, tự bắn trả, và là thứ mất đi thì thua kỷ nguyên. <b>San phẳng kinh đô địch</b> thì được <b>quyền lập đô</b> trên chính nền đất đó — một bộ lạc có thể có tới <b>3</b> kinh đô, và biên giới chuyển chủ ngay tại chỗ vừa đánh xong. Quyền đó <b>hết hạn sau 5.000 tick</b>, và dám dùng hay không thì do gen <b>lập đô</b> quyết.',
  house: 'Nới trần dân số. Không có nó thì mọi thứ khác đều vô nghĩa: không có chỗ ở là không tuyển được ai.',
  farm: 'Đổi gỗ lấy một dòng lương thực <b>ổn định nhưng rất nhỏ</b>: 9 ô × 0,085 = <b>0,77 lương/tick</b>, thấp hơn cả mức MỘT người hái được. Nó là cái <b>đệm</b> giữ bộ lạc không chết đói giữa hai chuyến đi xa, không phải cái vòi — phần lớn lương thực vẫn phải đi kiếm về. Khoá tới <b>Đồ Đồng</b>, nên trọn giai đoạn Đồ Đá chỉ có một nguồn ăn: bụi quả ngoài kia.',
  depot: 'Nơi nhận hàng thứ hai ngoài kinh đô. Mỏ nào cũng nằm ngoài vành 16 ô quanh nhà, nên quãng gánh mặc định là 22-35 ô mỗi chiều; một cái kho đặt đúng chỗ cắt nó xuống còn 3. Giá trị của nó nằm ở <b>vị trí</b>, không ở số lượng — hai cái kho cạnh kinh đô đúng bằng không có cái nào.',
  barracks: 'Ra bộ binh và quân kỳ. Cửa vào của gần như mọi thứ còn lại trong bảng này. Từ bản này <b>mỗi công trình là một cái lò riêng chạy song song</b> — cái trại thứ hai thật sự rút đôi thời gian ra quân, và đó là lý do gen <b>số lò quân</b> tồn tại.',
  heroHall: 'Cửa <b>duy nhất</b> ra Anh hùng — trước bản này anh hùng ra lò từ trại lính, tức là ai muốn đánh nhau đều tự động có tướng. Tách riêng thì "có nuôi tướng không" mới là một <b>quyết định</b>: 110 gỗ + 70 vàng bằng gần một trại lính thứ hai. Bộ lạc gen <b>đầu tư anh hùng</b> thấp đi hết kỷ nguyên không có tướng, và đó là một ván chơi hợp lệ. Phá được nó là cắt đứt dòng dõi của địch tới hết kỷ nguyên.',
  tower: 'Bắn trả trong <b>10</b> ô — xa hơn máy bắn đá (9), nên không còn bị phá miễn phí từ ngoài tầm với. Cũng là <b>điều kiện lên đời</b>: cần <b>2</b> tháp để lên Đồ Sắt, <b>4</b> cho Hoàng Kim, <b>7</b> cho Thiên Triều. Từ bản này còn <b>xây chồng được</b>: đặt một cái tháp lên chính cái tháp cũ, tối đa <b>3 tầng</b>, mỗi tầng ×<b>1,5</b> cả <b>máu · tầm bắn · sức đánh</b> — tầng 3 bắn xa <b>22,5</b> ô và cao gấp đôi trên bản đồ. Giá leo ×1,7 mỗi tầng nên xây chồng luôn <b>lỗ</b> nếu tính bằng sức mạnh trên mỗi đồng: cái nó mua là <b>sự tập trung</b>. Suốt lúc lên tầng thì tháp <b>ngừng bắn</b> và không tính vào hạn ngạch lên đời.',
  workshop: 'Mở nhánh tầm xa: cung thủ, rồi máy bắn đá. Một bộ lạc không xây nó thì vĩnh viễn chỉ có bộ binh.',
  stable: 'Mở nhánh kỵ binh. Cùng khuôn với xưởng thợ nhưng đọc gen KHÁC — nên cây công nghệ tách đôi theo hai hướng độc lập.',
  infirmary: 'Vừa là bệnh viện hậu phương (hồi máu cho quân đứng quanh, chỉ khi sạch địch), vừa là lò ra <b>Thầy lang</b>. Phá được nó là cắt cả hai.',
  shrine: 'Tín ngưỡng dân gian — rẻ, nhỏ, có ngay từ Đồ Đá. Sinh Đức Tin cho Chúa Tể. Từ Phase 3.33 nó còn là <b>lò ra Đội hậu cần</b> và là nhà chủ quản của nhánh <b>Quân nhu</b>: cái cổng rẻ nhất trong cả bảng, và cố tình thế — cơ chế quân lương chạy từ tick đầu tiên, nên cách chữa nó không được phép khoá sau nửa cây công nghệ.',
  camp: 'Không do dân xây, không có móng, không cần thợ: một <b>Đội hậu cần</b> cắm nó xuống trong <b>một tick</b> giữa đất địch, và nó <b>tự nhổ</b> sau khi hết hạn. Đó là cả thiết kế — bỏ hạn dùng thì sau ba trận đánh cả bản đồ rải trại và cơ chế quân lương tắt ngóm. Mềm nhất bản đồ (130 máu, không giáp), nên phá nó là cắt đường tiếp tế của cả một chiến dịch.',
  temple: 'Quốc giáo. Tính bằng hai nhà cầu nguyện khi đếm nhịp dâng tế, và là nơi <b>cất thánh vật</b> để truyền cho anh hùng đời sau.',
  wonder: 'Đường thắng thứ hai của cả trò chơi: xây xong rồi <b>giữ</b> được nó đứng là thắng ngay, bất kể quân đội ai mạnh hơn. Nhưng tài nguyên <b>không đủ để được xây</b>: phải <b>san phẳng kinh đô của một bộ lạc khác</b> trước đã (Thiên mệnh), và cả bản đồ <b>chỉ được có một Kỳ quan</b> — ai đặt móng trước thì ba bên kia muốn xây phải phá cái đó xuống.'
};

// Hoisted để con số trên nút tờ đọc CÙNG một danh sách với nội dung tờ. Bản cũ
// viết cứng `count: () => 11` trong khi tờ có 13 thẻ — một cái nhãn nói sai mà
// không ai phát hiện, vì hai con số nằm cách nhau 100 dòng.
const CX_BUILD_ORDER = ['town', 'house', 'farm', 'depot', 'barracks', 'heroHall', 'tower',
                        'workshop', 'stable', 'infirmary', 'shrine', 'camp', 'temple', 'wonder'];

function codexTabBuilds() {
  const order = CX_BUILD_ORDER;
  const cards = order.map(k => {
    const s = CONFIG.BUILD[k];
    const age = CONFIG.AGE.UNLOCK_BUILD[k] || 1;
    return cxCard('build', k, {
      age: Math.max(age, 3),
      name: s.label,
      sub: `${CONFIG.AGE.NAMES[age]} · ${s.size}×${s.size} ô`,
      stats: [
        `máu <b>${s.hp}</b>`,
        // Công trình leo sức chứa theo thời đại thì phải nói ra CẢ DÃY, không phải
        // con số Đồ Đá: "+5 dân" trên một cái nhà ở Hoàng Kim chứa 17 người là sai,
        // và Thư khố là chỗ duy nhất người xem tra ra được luật chơi.
        s.popByAge ? `+<b>${s.popByAge.slice(1).join('/')}</b> dân theo đời`
          : s.pop ? `+<b>${s.pop}</b> dân` : '',
        s.range ? `bắn <b>${s.attack}</b> trong <b>${s.range}</b> ô` : '',
        `giá ${cxCost(s.cost)}`,
        // "xây 0 tick" là một câu vô nghĩa, và trại tiếp tế là công trình duy nhất
        // rơi vào đó. Nói thẳng ra "dựng tức thì" thì con số 0 trở thành một LUẬT
        // đọc được, thay vì một chỗ trông như quên điền.
        s.buildTicks > 0 ? `xây <b>${s.buildTicks}</b> tick`
                         : `dựng <b style="color:var(--gold)">tức thì</b>, không cần thợ`,
        k === 'camp' ? `sống <b>${CONFIG.SUPPLY.CAMP.TTL}</b> tick rồi tự nhổ` : ''
      ].filter(Boolean),
      blurb: CX_BUILD_BLURB[k]
    });
  }).join('');
  // TƯỜNG THÀNH không nằm trong CONFIG.BUILD nên nó không thể là một thẻ như mười
  // ba thứ kia — nó không có giá, không có thời gian xây, không ai đặt móng. Viết
  // tay một thẻ riêng chứ không nhét một mục giả vào bảng BUILD: nhét vào đó là mở
  // đúng sáu cánh cửa mà chú thích của `wallCells` đã liệt kê ra để tránh.
  const W = CONFIG.WALL;
  const wallCard = `<div class="cx-card"><div class="cx-info">
    <div class="cx-name">🧱 Tường thành</div>
    <div class="cx-sub">${CONFIG.AGE.NAMES[W.MIN_AGE]} trở lên · không ai xây, không ai đặt móng</div>
    <div class="cx-stats"><span>vành bán kính <b>${W.RADIUS.slice(W.MIN_AGE).join('/')}</b> ô theo đời</span>
      <span>máu mỗi ô <b>${W.HP.slice(W.MIN_AGE).join('/')}</b></span>
      <span>cổng <b>${W.GATE_SPAN}</b> ô giữa mỗi cạnh: <b>${W.GATE_DOOR_SPAN}</b> ô cánh cửa (<b>${Math.round(W.GATE_HP * 100)}%</b> máu) + <b>2</b> lầu cổng dày như thường</span>
      <span>tự sửa <b>${(W.REGEN_FRAC * 100).toFixed(1)}%</b> máu/tick, tốn <b>${W.REGEN_STONE}</b> đá mỗi ô</span>
      <span>dưới <b>${W.REGEN_RESERVE}</b> đá thì chỉ còn <b>${Math.round(W.REGEN_POOR * 100)}%</b> tốc độ</span>
      <span>thủng thì hở <b>${W.RUBBLE}</b> tick</span></div>
    <div class="cx-blurb">Vật cản <b>có phe</b> đầu tiên của trò chơi: quân nhà đi xuyên qua, <b>quân địch và quái vật</b>
      đứng lại. Nhờ vậy nó tạo ra thứ mà một dải rừng không tạo nổi — một <b>bên trong</b> và một <b>bên ngoài</b>.
      Nó <b>tự mọc</b> quanh mỗi kinh đô và <b>dựng lại cả vành</b> ở bán kính mới mỗi lần lên đời (không đắp thêm
      lớp thứ hai, nếu không sau bốn đời nó thành một mê cung).
      <br><b>Năm bậc, một bậc mỗi đời</b> — ${W.TIERS.slice(1).map(t => t.name).join(' → ')} — và mỗi bậc đổi cả
      <b>đường bao</b> lẫn vật liệu, không chỉ đổi màu: cả bức tường lên bậc cùng một lúc nên không bao giờ có
      mẫu cũ đứng cạnh để so màu. Bốn <b>góc</b> là tháp vuông cao hơn thân; ${W.GATE_SPAN} ô
      <b>chính giữa mỗi cạnh</b> là một <b>cổng thành</b> — ${W.GATE_DOOR_SPAN} ô cánh cửa gỗ đóng đinh tán nằm
      dưới một vòm cuốn liền ba ô có <b>đá khoá đỉnh</b> màu bộ lạc, kẹp giữa <b>hai lầu cổng</b> có mái vát và
      lỗ châu mai. Đường bao của cả cụm chạy <em>thấp&#8202;·&#8202;CAO&#8202;·&#8202;thấp&#8202;·&#8202;CAO&#8202;·&#8202;thấp</em>,
      và chính cái nhịp ấy — chứ không phải màu — là thứ đọc được từ xa. Chỉ ${W.GATE_DOOR_SPAN} ô cánh cửa là
      mỏng máu: nới cổng rộng ra <b>không</b> làm bức tường dễ vỡ hơn, nó chỉ làm chỗ vỡ đọc được hơn. Đó là lý
      do &ldquo;trận đánh ở cổng Nam&rdquo; là một câu kể được.
      <br>Từ Phase 3.30 nó <b>ăn đá</b> để tự lành: mỗi ô đang vá rút ${W.REGEN_STONE} đá khỏi kho mỗi tick, và
      dưới ngưỡng ${W.REGEN_RESERVE} đá thì nó vẫn vá — chỉ chậm còn ${Math.round(W.REGEN_POOR * 100)}%, để bức
      tường không bao giờ ăn mất viên đá cuối cùng lẽ ra thành tháp canh hay Kỳ quan.
      Bộ binh đấm vào tường gần như vô hại
      (×${CONFIG.UNIT.BUILD_PENALTY}) — phá thành là việc của <b>máy bắn đá</b> (×${CONFIG.UNIT.BUILDING_DAMAGE_MULT}),
      và đó là <b>lý do thứ hai</b> để tồn tại một Xưởng thợ, sau Kỳ quan. Bộ lạc <b>bành trướng</b> rộng thì
      vĩnh viễn có nhà nằm ngoài tường: đó là cái giá đúng đắn, không phải một lỗi.</div>
  </div></div>`;

  return `<div class="cx-intro">Công trình <b>không chặn đường đi</b> — quân đi xuyên qua nhà. Đó là một đánh đổi cố ý:
    chặn thì với cách tìm đường tham lam của trò chơi này, dân sẽ kẹt cứng quanh cụm nhà.
    Ngoại lệ duy nhất là <b>tường thành</b> ở cuối trang: nó chặn, nhưng chỉ chặn người của phe khác.
    Hình vẽ ở <b>Đồ Sắt</b> trở lên, nên mái đã mang vật liệu của thời đại đó — lên đời thì cả <b>đường bao</b> của công trình đổi, không chỉ đổi màu.</div>
    <div class="cx-grid">${cards}${wallCard}</div>`;
}

// ============================================================
// TỜ 4 — ANH HÙNG & THÁNH VẬT
// ============================================================
// Tờ này KHÔNG có hình mẫu cho từng mục, và đó là chủ ý. Gen anh hùng không có
// hình: `braveness` 0,7 với `braveness` 0,3 trông y hệt nhau đứng yên — cái khác
// nhau là họ QUYẾT ĐỊNH gì khi thấy địch. Vẽ ra một hình giống hệt nhau cho mười
// mục là dạy người đọc rằng ở đây không có gì để phân biệt.
const CX_GENE_BLURB = {
  braveness: 'Ngưỡng dám giao chiến khi đang ở thế yếu. Cao thì chết sớm nhưng để lại chiến công; thấp thì sống lâu mà không làm gì.',
  command: 'Hào quang buff lính quanh mình <b>đổi lấy</b> sức đánh của chính mình. Một ông tướng hay một chiến binh — không thể cả hai.',
  ambition: 'Thích công thành <b>đổi lấy</b> thích săn người. Quyết định anh hùng đi về phía nhà cửa hay về phía đám đông.',
  vigor: 'Máu dày <b>đổi lấy</b> nhanh nhẹn và đấm mạnh.',
  greed: 'Chịu đi vòng bao xa để nhặt vật phẩm, và có dám bỏ đội hình đi săn quái không. Đánh đổi thuần tình huống.'
};

function codexTabHero() {
  const H = CONFIG.HERO;
  const genes = Object.keys(HERO_GENE_SPEC).map(k => {
    const g = HERO_GENE_SPEC[k];
    return `<div class="cx-card"><div class="cx-info">
      <div class="cx-name">${k}</div>
      <div class="cx-sub">khởi tạo ${g.range[0]}–${g.range[1]} · giới hạn ${g.bounds[0]}–${g.bounds[1]}</div>
      <div class="cx-blurb">${CX_GENE_BLURB[k] || ''}</div>
    </div></div>`;
  }).join('');

  const items = Object.keys(CONFIG.ITEM.TYPES).map(k => {
    const it = CONFIG.ITEM.TYPES[k];
    const st = [];
    if (it.attack) st.push(`đánh +<b>${it.attack}</b>`);
    if (it.maxHp) st.push(`máu +<b>${it.maxHp}</b>`);
    if (it.speedMult) st.push(`tốc +<b>${it.speedMult}</b>`);
    if (it.auraR) st.push(`bán kính hào quang +<b>${it.auraR}</b>`);
    if (it.auraMult) st.push(`hào quang +<b>${Math.round(it.auraMult * 100)}%</b>`);
    return `<div class="cx-card"><div class="cx-info">
      <div class="cx-name">${it.icon} ${it.label}</div>
      <div class="cx-sub">vật phẩm — chỉ anh hùng nhặt được</div>
      <div class="cx-stats">${st.map(s => `<span>${s}</span>`).join('')}</div>
      <div class="cx-blurb">${it.blurb}</div>
    </div></div>`;
  }).join('');

  const lv = CONFIG.ITEM.LEVEL_MULT.slice(1).map((m, i) =>
    `<span>cấp <b>${CONFIG.ITEM.LEVEL_TAG[i + 1] || 'I'}</b> = ×<b>${m}</b></span>`).join('');

  return `<div class="cx-intro">Anh hùng là <b>vòng tiến hoá thứ hai</b>, lồng bên trong vòng tiến hoá của bộ lạc.
    Gen bộ lạc được chọn lọc qua từng <b>kỷ nguyên</b>; gen anh hùng chạy trọn một vòng <b>bên trong một kỷ nguyên</b> —
    người kế nhiệm luôn đột biến từ tổ tiên có điểm cao nhất, không phải từ người vừa chết.
    Vì thế anh hùng <b>chết già</b> là cơ chế, không phải hình phạt: chính cái chết là thứ khiến vòng tiến hoá kia quay.</div>
    <div class="cx-sect">Năm gen của cá thể</div>
    <div class="cx-grid">${genes}</div>
    <div class="cx-sect">Vật phẩm — nhặt trên xác quái và trong hang</div>
    <div class="cx-intro" style="margin-bottom:12px;">Vật phẩm <b>KHÔNG di truyền</b>: đồ nghề cá nhân mất theo người chết.
    Ngoại lệ duy nhất là <b>Thánh vật</b> — ngã trên đất nhà thì nó được rước về đền và trao lại cho người kế nhiệm.
    Nhặt trúng đồ trùng thì hai món <b>hợp nhất</b> lên cấp, và đường cong cố ý vượt phép cộng: ${lv}.
    Hòm chứa tối đa <b>${CONFIG.ITEM.MAX_HELD}</b> món.</div>
    <div class="cx-grid">${items}</div>
    <div class="cx-sect">Luật của dòng dõi</div>
    <div class="cx-grid"><div class="cx-card"><div class="cx-info">
      <div class="cx-name">Một người một lúc</div>
      <div class="cx-stats"><span>tuổi thọ <b>${H.MAX_AGE}</b> tick</span><span>hồi máu trên đất nhà <b>${H.HEAL_RATE}</b>/tick</span><span>nuôi <b>${H.UPKEEP}</b> lương/tick</span></div>
      <div class="cx-blurb">Mỗi bộ lạc nhiều nhất một anh hùng còn sống. Chết rồi thì trại lính chiêu mộ đời tiếp theo sau một quãng nghỉ.</div>
    </div></div></div>`;
}

// ============================================================
// TỜ 5 — NÂNG CẤP
// ============================================================
// Bảng nâng cấp là hệ thống DUY NHẤT trong game mà người xem không đọc ra được
// từ bản đồ. Một cái tháp cao lên thì nhìn thấy; một bộ lạc vừa lên Giáp trụ cấp
// 3 thì trông y hệt như trước, chỉ là quân của nó bỗng không chết nữa. Thư khố là
// chỗ duy nhất trả lời được "vì sao bên kia đột nhiên dai như thế".
//
// Con số hiện ra là con số CỘNG DỒN TỚI CẤP TRẦN, không phải mỗi cấp, và giá cũng
// là TỔNG cả ba cấp: người đọc đang hỏi "nhánh này đáng bao nhiêu", không hỏi
// "một bước của nó đáng bao nhiêu".
const CX_UP_BLURB = {
  melee: 'Nhánh rẻ nhất và cũng là nhánh chạm tới nhiều người nhất — bộ binh là loại quân đông nhất mọi chiến trường.',
  armor: 'Trừ THẲNG vào mỗi cú chạm, nên nó có lợi tương đối nhất cho quân rẻ: một cú đòn 7 mất 3 giáp là mất gần một nửa.',
  ranged: 'Chỉ có nghĩa nếu bộ lạc đã có Xưởng thợ — nên nó là nhánh đầu tiên trong bảng đứng sau một quyết định xây dựng.',
  cavalry: 'Đắt, và chỉ chạm tới hai loại quân. Đổi lại nó cộng vào đúng thứ đã mạnh sẵn — kỵ binh là quân đắt nhất bảng.',
  medicine: 'Không cộng một điểm sát thương nào. Nó nhân số máu mà thầy lang vá lại được giữa trận — thứ duy nhất trong bảng làm quân đã ra lò <b>quay lại được</b>.',
  siege: 'Sát thương lan, tầm bắn, và cả KÍCH THƯỚC của cỗ máy trên màn hình — nhánh duy nhất chảy từ bảng nâng cấp ra tới hình vẽ. <b>+14% mỗi cấp</b>: một cỗ máy bắn đá cấp 3 rộng <b>3,05 ô</b>, vượt cả voi chiến (2,6) để thành hình lớn nhất nhóm quân — chỗ mà một cỗ máy vừa ra lò <em>chưa</em> có. Mỗi cấp còn đóng thêm một dấu vào hình bóng để đọc được cấp mà không cần đứng cạnh cái khác: <b>I</b> vành sắt ở bánh xe + đai sắt bọc sàn · <b>II</b> mộc chắn che kíp vận hành · <b>III</b> cờ đuôi nheo dựng ở đuôi xe.',
  supplyline: `Nhánh duy nhất mua <b>BÁN KÍNH HOẠT ĐỘNG</b>. Tám nhánh kia trả lời "đơn vị này mạnh tới đâu"; nhánh này trả lời "đạo quân này <b>đi được bao xa</b>". Ba con số của nó đúng là ba chỗ mà một Trại tiếp tế bị nghẽn: hồi <b>${CONFIG.SUPPLY.CAMP.RATE}</b> → <b>${(CONFIG.SUPPLY.CAMP.RATE + CONFIG.UPGRADE.LINES.supplyline.rate * CONFIG.UPGRADE.MAX_LEVEL).toFixed(1)}</b> quân lương/tick, nuôi <b>${CONFIG.SUPPLY.CAMP.SLOTS}</b> → <b>${CONFIG.SUPPLY.CAMP.SLOTS + CONFIG.UPGRADE.LINES.supplyline.slots * CONFIG.UPGRADE.MAX_LEVEL}</b> suất cùng lúc, bán kính <b>${CONFIG.SUPPLY.CAMP.R}</b> → <b>${CONFIG.SUPPLY.CAMP.R + CONFIG.UPGRADE.LINES.supplyline.reach * CONFIG.UPGRADE.MAX_LEVEL}</b> ô. <b>Tuổi thọ</b> cái trại thì KHÔNG nằm ở đây — nó leo theo <b>thời đại</b>. Hai nguồn tiến bộ tách hẳn, để đọc được cái nào vừa đổi: lên đời thì trại đứng lâu hơn, nghiên cứu thì trại nuôi được nhiều người hơn.`,
  masonry: 'Nhánh duy nhất <b>không chạm tới một người nào</b>: nó cộng phần trăm máu cho <b>mọi công trình</b>, kể cả tháp canh. Cũng là nhánh duy nhất có ích cho bộ lạc <b>đang thua</b> — sáu nhánh quân sự đều nhân với số quân đang cầm, nên kẻ vừa mất quân được thưởng ít nhất. Ở Kinh đô nên nó <b>không đứng sau cửa nào</b>. <b>Tường thành đã rời khỏi nhánh này</b> ở Phase 3.30: tường lên bậc theo <b>thời đại</b>, không theo nghiên cứu — trộn hai đồng hồ vào một con số thì người xem nhìn tường dày lên mà không biết vì sao.'
};

function codexTabUpgrades() {
  const U = CONFIG.UPGRADE;
  const cards = Object.keys(U.LINES).map(k => {
    const L = U.LINES[k];
    const max = U.MAX_LEVEL;
    const st = [];
    if (L.atk) st.push(`đánh +<b>${(L.atk * max).toFixed(1)}</b>`);
    if (L.def) st.push(`giáp +<b>${(L.def * max).toFixed(1)}</b>`);
    if (L.hp) st.push(`máu +<b>${L.hp * max}</b>`);
    if (L.bhp) st.push(`máu công trình +<b>${Math.round(L.bhp * max * 100)}%</b>`);
    if (L.heal) st.push(`chữa +<b>${(L.heal * max).toFixed(2)}</b>/tick`);
    if (L.heals) st.push(`chữa <b>${1 + L.heals * max}</b> người một lúc`);
    // `reach` mang HAI nghĩa tuỳ nhánh (tầm chữa của thầy lang / bán kính trại), và
    // hai nhánh không bao giờ cùng khai nó — nên phân nhánh theo `L.slots`, thứ chỉ
    // Quân nhu có. In "tầm chữa" cho một cái trại tiếp tế là dạy người đọc sai đúng
    // con số mà cả nhánh sinh ra để nói.
    if (L.reach) st.push(`${L.slots ? 'bán kính trại' : 'tầm chữa'} +<b>${(L.reach * max).toFixed(1)}</b> ô`);
    if (L.rate) st.push(`tiếp tế +<b>${(L.rate * max).toFixed(2)}</b>/tick`);
    if (L.slots) st.push(`nuôi <b>${CONFIG.SUPPLY.CAMP.SLOTS + L.slots * max}</b> suất một lúc`);
    if (L.splash) st.push(`lan +<b>${(L.splash * max).toFixed(2)}</b> ô`);
    if (L.range) st.push(`tầm +<b>${(L.range * max).toFixed(1)}</b> ô`);
    if (L.scale) st.push(`to +<b>${Math.round(L.scale * max * 100)}%</b>`);
    // Giá TỔNG cả ba cấp: nhân bảng gốc với tổng hệ số leo (1 + 1,85 + 3,1).
    const stepSum = U.COST_STEP.reduce((a, b) => a + b, 0);
    const total = {};
    for (const r in L.cost) total[r] = Math.round(L.cost[r] * stepSum);
    const tickSum = U.TICKS.slice(1).reduce((a, b) => a + b, 0);
    return `<div class="cx-card"><div class="cx-info">
      <div class="cx-name">${L.icon} ${L.label}</div>
      <div class="cx-sub">${CONFIG.BUILD[L.build].label} · ${CONFIG.AGE.NAMES[L.age]} · ${max} cấp</div>
      <div class="cx-stats"><span>áp cho <b>${L.scope}</b></span>${st.map(s => `<span>${s}</span>`).join('')}
        <span>trọn 3 cấp: ${cxCost(total)}</span><span><b>${tickSum}</b> tick nghiên cứu</span></div>
      <div class="cx-blurb">${CX_UP_BLURB[k] || ''}</div>
    </div></div>`;
  }).join('');
  return `<div class="cx-intro">Mỗi nhánh gắn với <b>đúng một công trình</b>, và phá công trình đó giữa chừng là
    bộ lạc <b>mất trắng</b> nhánh đang nghiên cứu dở. Chỉ nghiên cứu được <b>một nhánh mỗi lúc</b> — nên bảng này
    không phải một danh sách để mua hết, nó là một <b>thứ tự</b>. Con số dưới đây là mức <b>cộng dồn tới cấp 3</b>
    và giá của <b>cả ba cấp</b> (giá leo ×${CONFIG.UPGRADE.COST_STEP.join(' · ×')} theo cấp).
    Nâng cấp <b>cộng</b> chứ không nhân, nên nó có lợi tương đối nhiều nhất cho loại quân <b>rẻ nhất</b> — trừ
    <b>Nề đá</b>, ngoại lệ duy nhất, vì máu công trình trải từ 150 tới 2.600.</div>
    <div class="cx-grid">${cards}</div>`;
}

// ============================================================
// Khung tờ + mở/đóng
// ============================================================
const CODEX_TABS = [
  { key: 'monsters', label: 'Quái vật', build: codexTabMonsters, count: () => Object.keys(CONFIG.MONSTER.TYPES).length },
  { key: 'units', label: 'Quân lính', build: codexTabUnits, count: () => CX_UNIT_ORDER.length },
  { key: 'builds', label: 'Công trình', build: codexTabBuilds, count: () => CX_BUILD_ORDER.length + 1 },
  { key: 'upgrades', label: 'Nâng cấp', build: codexTabUpgrades, count: () => Object.keys(CONFIG.UPGRADE.LINES).length },
  { key: 'hero', label: 'Anh hùng & Thánh vật', build: codexTabHero, count: () => Object.keys(HERO_GENE_SPEC).length + Object.keys(CONFIG.ITEM.TYPES).length }
];
let codexTab = 'monsters';
let codexOpen = false;

function renderCodexTabs() {
  el('codexTabs').innerHTML = CODEX_TABS.map(t =>
    `<button type="button" class="cx-tab${t.key === codexTab ? ' on' : ''}" role="tab" data-tab="${t.key}"
       aria-selected="${t.key === codexTab}">${t.label}<span class="cx-n">${t.count()}</span></button>`).join('');
}

function renderCodexBody() {
  const tab = CODEX_TABS.find(t => t.key === codexTab) || CODEX_TABS[0];
  const body = el('codexBody');
  body.innerHTML = tab.build();
  body.scrollTop = 0;
  // VẼ SAU KHI ĐÃ GẮN VÀO DOM VÀ TỜ ĐÃ HIỆN — không phải vì canvas cần layout
  // (bề rộng đặt cứng bằng thuộc tính width, không lấy từ CSS), mà vì đây là chỗ
  // duy nhất chắc chắn mọi thẻ đã tồn tại. Cùng bài học với "canvas trong
  // display:none có bề ngang 0": thứ tự giữa dựng DOM và vẽ là một phụ thuộc
  // thật, chỉ là lần này nó được trả đúng thứ tự ngay từ đầu.
  for (const c of body.querySelectorAll('canvas[data-kind]')) {
    codexDraw(c, c.dataset.kind, c.dataset.key, { age: c.dataset.age ? Number(c.dataset.age) : 0 });
  }
}

function openCodex(tabKey) {
  if (tabKey) codexTab = tabKey;
  codexOpen = true;
  el('codexScreen').classList.add('open');
  renderCodexTabs();
  renderCodexBody();
  el('codexClose').focus();
}

function closeCodex() {
  codexOpen = false;
  el('codexScreen').classList.remove('open');
}

el('menuCodex').addEventListener('click', () => openCodex());
el('chipCodex').addEventListener('click', () => openCodex());
el('codexClose').addEventListener('click', closeCodex);
// Bắt ở cấp hàng tờ, không gắn lên từng nút: hàng tờ bị dựng lại bằng innerHTML
// mỗi lần đổi tờ, nên trình nghe gắn trực tiếp lên nút sẽ bốc hơi cùng cái nút đó
// — đúng họ lỗi "13 panel bị innerHTML dựng lại 10 lần/giây" đã bắt ở bảng bộ lạc.
el('codexTabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  codexTab = b.dataset.tab;
  renderCodexTabs();
  renderCodexBody();
});
// Click ra nền tối thì đóng — nhưng CHỈ khi trúng đúng lớp nền, không phải khi
// nhả chuột trên nền sau một cú kéo bắt đầu từ bên trong (kéo chọn chữ trong thẻ).
el('codexScreen').addEventListener('mousedown', (e) => {
  if (e.target === el('codexScreen')) closeCodex();
});
