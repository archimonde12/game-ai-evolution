'use strict';
// ============================================================
// 13b-render-buildings.js
// ------------------------------------------------------------
// Sprite tĩnh: vật liệu/mái theo thời đại, con dấu kinh đô, trang trí đắp
// theo thời đại (drawCrudeAccents/drawAgeAccents/drawAgeUpSweep), drawBuilding,
// drawRuin. Tách từ 13-render-world.js (Phase 3.43) — xem 13-render-terrain.js.
// ============================================================
// ------------------------------------------------------------
// Công trình
// ------------------------------------------------------------
// Trộn hai màu hex theo tỉ lệ t (0 = a, 1 = b). Dùng cho lớp vật liệu theo thời đại.
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = pa >> 16 & 255, ag = pa >> 8 & 255, ab = pa & 255;
  const br = pb >> 16 & 255, bg = pb >> 8 & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// VẬT LIỆU THEO THỜI ĐẠI — một bảng duy nhất, đọc ở bốn nơi: màu mái, màu gờ/diềm
// mái, ô màu trong bảng bộ lạc, và chú giải. Trước đây ba trong bốn chỗ đó mỗi chỗ
// giữ một bộ hằng số riêng, nên đổi sắc "đồng" ở mái mà quên bảng thì chính cái
// bảng đáng lẽ dạy người xem đọc mái lại dạy sai.
//
//   tint = lực trộn màu bộ lạc vào vật liệu (0 = giữ nguyên vật liệu).
// Phải nhỏ: sắc bộ lạc đã nằm trọn ở THÂN nhà (tribe.color) và ở đường biên lãnh
// thổ rồi. Bản trước trộn tới 0,62–0,75 THEO CHIỀU NGƯỢC LẠI (vật liệu đắp lên
// tribe.dark), nên với Xích Long thì "mái đồng" ra đúng màu mái đỏ cũ — hai thời
// đại liền nhau nhìn y hệt, mà người xem lại không có bậc trước đặt cạnh để so.
const AGE_MAT = [null,
  { name: 'tranh',     roof: '#7d6640', trim: '#93764a', tint: 0.30 },  // Đồ Đá: rơm rạ, mộc
  { name: 'đồng',      roof: '#b5702f', trim: '#d0913f', tint: 0.22 },  // Đồ Đồng: đồng đỏ ấm
  { name: 'đá phiến',  roof: '#6d7684', trim: '#9aa0a6', tint: 0.16 },  // Đồ Sắt: xám lạnh
  { name: 'mạ vàng',   roof: '#c9992f', trim: '#f0cf85', tint: 0.14 },   // Hoàng Kim
  // THIÊN TRIỀU: men ngọc (thanh lưu ly). Bốn bậc trước đi từ ẤM sang LẠNH rồi
  // quay lại ấm chói (rơm → đồng → đá phiến → mạ vàng); bậc năm phải rẽ khỏi cả
  // hai đầu đó, nếu không nó chỉ là "vàng đậm hơn" và người xem không đọc ra. Men
  // ngọc là màu duy nhất trong bảng sơn mài chưa dùng tới, và nó cũng là màu mái
  // ngói của cung điện thật — cùng lúc khác hẳn bậc trước và đúng với cái tên.
  { name: 'men ngọc',  roof: '#3f7f74', trim: '#8fc9ba', tint: 0.13 }];  // Thiên Triều

function ageMat(tribe) { return AGE_MAT[clamp(tribe.age || 1, 1, AGE_MAT.length - 1)]; }

// TÊN VẬT LIỆU MÁI cho phần chữ. Bảng bộ lạc hiện nó trong tooltip ("Đồ Đồng —
// mái đồng"), nên nó là chữ cho người đọc chứ không phải nhãn nội bộ như trông
// có vẻ. Dịch qua Tc() với mã theo BẬC chứ không lấy chính chuỗi làm khoá: 'đồng'
// một mình quá ngắn và quá thường, thêm nó vào từ điển là mở đường cho bộ vá dữ
// liệu chạm nhầm vào một trường khác cũng mang đúng chữ ấy. AGE_MAT giữ nguyên
// tiếng Việt và không bao giờ bị vá.
function roofMatName(age) {
  const a = clamp(age || 1, 1, AGE_MAT.length - 1);
  return Tc('roof.mat.' + a, AGE_MAT[a].name);
}

// MÀU MÁI. Cái MÁI là mảng màu lớn nhất của sprite (~34% chiều cao) nên đổi sắc nó
// thì cả cụm nhà đổi theo, thấy được tới tận minimap. Chỉ đụng MÁI, KHÔNG đụng thân
// — nhờ vậy vẫn đọc ra "bộ lạc nào" qua tường, còn chất liệu mái kể "thời đại nào":
// mái tranh → mái đồng → mái đá phiến → mái mạ vàng.
function ageRoofColor(tribe) {
  const m = ageMat(tribe);
  return mixHex(m.roof, tribe.dark, m.tint);
}

// Con dấu THỜI ĐẠI cắm trên kinh đô: một thẻ chu sa với 1–4 chấm vàng = cấp thời
// đại. Dùng CHẤM chứ không phải chữ số vì chấm đọc được ở cỡ nhỏ hơn nhiều — ở mức
// zoom xa một con "3" chỉ còn là vệt mờ, còn ba chấm thì vẫn đếm được. Buộc thẳng
// vào signature "ấn sử" (chu sa + vàng của thẻ kỷ nguyên), và trả lời tại-chỗ câu
// "kinh đô này đang ở thời đại nào" mà không phải liếc sang cột dữ liệu bên phải.
function drawCapitalSeal(tribe, cx, topY, s) {
  const age = tribe.age || 1;
  const w = s * 0.5, h = s * 0.26, tx = cx - w / 2, ty = topY - h - s * 0.14;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';                       // bóng nhẹ để tách khỏi nền
  ctx.fillRect(tx + 0.6, ty + 0.8, w, h);
  ctx.fillStyle = '#9a2f22';                                // chu sa
  ctx.fillRect(tx, ty, w, h);
  ctx.fillStyle = 'rgba(216,165,68,0.9)';                   // viền vàng mảnh
  ctx.fillRect(tx, ty, w, Math.max(0.7, h * 0.12));
  ctx.fillRect(tx, ty + h - Math.max(0.7, h * 0.12), w, Math.max(0.7, h * 0.12));
  const dot = Math.max(0.9, s * 0.05), gap = (w - age * dot * 2) / (age + 1);
  ctx.fillStyle = '#f0cf85';
  for (let i = 0; i < age; i++) {
    ctx.beginPath();
    ctx.arc(tx + gap * (i + 1) + dot * (i * 2 + 1), ty + h / 2, dot, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Kiểu nhà nào đã TỰ CÓ chóp riêng trên nóc (cột cờ, vọng lâu, quả cầu vàng). Với
// chúng, lớp phủ Hoàng Kim chỉ đắp mái chồng chứ không cắm thêm chóp nhọn — hai cái
// chóp mọc cùng một chỗ chỉ ra một mớ nét chồng nhau.
const OWN_CREST = { town: 1, tower: 1, temple: 1, heroHall: 1 };

// Trang trí THEO THỜI ĐẠI — đắp một lớp phủ chung lên MỌI kiểu nhà tuỳ tribe.age.
// Cố tình dùng ĐÚNG một lớp phủ thay vì vẽ lại từng kiểu nhà cho từng thời đại: bốn
// thời đại × chín kiểu nhà = 36 biến thể là thứ không ai bảo trì nổi.
//
// Bản trước chỉ đổi MÀU (mái + một gờ mảnh + một bệ đá thấp). Đo lại trên màn hình
// thì đó chính là chỗ hỏng: người xem KHÔNG BAO GIỜ có hai thời đại đặt cạnh nhau để
// so — cả bộ lạc lên đời cùng một lúc, nên phán đoán màu phải làm theo TRÍ NHỚ, việc
// mà mắt người làm rất tệ. Thứ mắt đọc được tuyệt đối, không cần vật mẫu, là ĐƯỜNG
// BAO. Nên từ bản này mỗi thời đại đổi luôn hình bóng của căn nhà:
//
//   Đồ Đá     — mái dốc trơn (không đắp gì)
//   Đồ Đồng   — MÁI ĐUA: diềm mái chìa hẳn ra hai bên, hai đầu hếch lên → nhà "nở"
//               ngang ở tầm mái
//   Đồ Sắt    — LAN CAN RĂNG CƯA trên diềm + bệ đá rộng hơn thân → đỉnh lởm chởm
//               như lược, chân bè ra
//   Hoàng Kim — MÁI CHỒNG DIÊM (mái thứ hai nhỏ hơn xếp trên) + chóp nhọn → cao thêm
//               một nấc, có mũi nhọn
//
// Cả ba đều còn đọc được ở cỡ 6 px/ô vì chúng đổi ĐƯỜNG VIỀN NGOÀI chứ không đổi
// hoa văn bên trong — nét bên trong là thứ chết trước nhất khi thu nhỏ.
// ==================================================================
// HAI THỜI ĐẠI ĐẦU PHẢI TRÔNG NGHÈO (Phase 3.28)
// ==================================================================
// Cả cái thang bốn bậc ở trên đi theo chiều CỘNG THÊM: Đồ Đá không đắp gì, mỗi
// bậc sau đắp thêm một lớp. Nghĩa là bậc thấp nhất là "một căn nhà bình thường
// chưa được trang trí" — mà một căn nhà bình thường thì không đọc ra thời đại
// nào cả. Nhìn ra màn hình ở 2.000 tick đầu của mọi kỷ nguyên, bốn bộ lạc đều
// đang ở trong những căn nhà gọn gàng, mái thẳng, tường phẳng, cửa sổ vuông vắn.
//
// Hệ quả không phải chuyện thẩm mỹ: nếu bậc 1 đã trông tử tế thì bậc 2 và 3 chỉ
// còn là "tử tế hơn một chút", và cả cơ chế lên đời mất đi khoảnh khắc đáng giá
// nhất của nó — lần đầu tiên nền văn minh thôi ở lều. Đắp thêm ở đầu trên thì
// mỗi bậc phải chia nhau một dải hẹp; ĐÀO SÂU đầu dưới thì cả thang giãn ra mà
// không bậc nào phải đổi.
//
// Ba nét, và cả ba đều đổi ĐƯỜNG BAO chứ không đổi hoa văn — đúng lý do đã viết
// cho drawAgeAccents (nét bên trong chết trước nhất khi thu nhỏ):
//   · DIỀM TRANH RÁCH — một hàng răng dài ngắn so le rủ xuống dưới chân mái, nên
//     mép dưới của mái từ một đường thẳng thành một đường lởm chởm.
//   · CỘT CHỐNG XIÊU — Đồ Đá: một cây sào chống chéo từ đất lên diềm. Nó phá thế
//     đối xứng của cả sprite, và đối xứng chính là thứ khiến một hình đọc ra là
//     "được xây" thay vì "được dựng tạm".
//   · VÁ MÁI / KẼ VÁN — một mảng sẫm trên mái (Đồ Đá) hoặc hai ba khe dọc trên
//     tường (Đồ Đồng): dấu hiệu vật liệu rời rạc, không phải một khối liền.
//
// Băm theo `b.id` nên mỗi căn nhà xiêu một kiểu và không căn nào tự đổi dáng
// giữa chừng — cùng thủ thuật với mặt đường và nền bản đồ.
function drawCrudeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed) {
  const age = clamp(tribe.age || 1, 1, AGE_MAT.length - 1);
  const eaveY = bodyTop + s * 0.04;
  const h = hash01(b.id * 7 + 3, b.id * 13 + 11);
  // Đồ Đồng đã có MÁI ĐUA chìa ra 0,17s mỗi bên (drawAgeAccents chạy sau hàm này),
  // nên diềm tranh phải rủ xuống từ đúng mép đó — nếu không thì ở bậc 2 nó treo
  // lơ lửng giữa không trung, cách chân mái thật một khoảng bằng cả cái diềm.
  const over = age >= 2 ? s * 0.17 : s * 0.08;
  const fringeY = age >= 2 ? eaveY + Math.max(1.2, s * 0.09) : eaveY;

  // ---- DIỀM TRANH RÁCH ----------------------------------------------------------
  const n = 7, fw = (s + over * 2) / n;
  ctx.fillStyle = age === 1 ? '#6d5c3c' : '#7a6642';
  for (let i = 0; i < n; i++) {
    const fh = s * (0.05 + hash01(b.id + i * 19, i * 7) * (age === 1 ? 0.16 : 0.10));
    ctx.fillRect(x - over + i * fw, fringeY, fw * 0.82, fh);
  }

  if (!detailed) return;

  if (age === 1) {
    // ---- CỘT CHỐNG XIÊU (chỉ Đồ Đá) ---------------------------------------------
    // Bên trái hay bên phải bốc theo băm: hai căn nhà cạnh nhau chống ngược chiều
    // thì cả xóm đọc ra là "mỗi nhà tự dựng", không phải một mẫu nhà lặp lại.
    const sgn = h > 0.5 ? 1 : -1;
    const footX = x + s * (0.5 + sgn * 0.72);
    const headX = x + s * (0.5 + sgn * 0.42);
    ctx.strokeStyle = '#7b6242';
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(footX, baseY);
    ctx.lineTo(headX, fringeY + s * 0.06);
    ctx.stroke();
    // ---- MẢNG MÁI VÁ -------------------------------------------------------------
    ctx.fillStyle = 'rgba(38,30,20,0.34)';
    ctx.beginPath();
    ctx.moveTo(x + s * (0.28 + h * 0.2), bodyTop + s * 0.02);
    ctx.lineTo(x + s * (0.5 + h * 0.06), apexY + s * 0.1);
    ctx.lineTo(x + s * (0.6 + h * 0.16), bodyTop + s * 0.02);
    ctx.closePath(); ctx.fill();
    // ---- VÁCH ĐẤT TRÉT ------------------------------------------------------------
    // Hai vệt đứng màu bùn trên tường: nó xoá cái mặt phẳng gradient sạch sẽ mà
    // thân nhà vốn có, và đó chính là thứ khiến bậc 1 trông "chưa được trát".
    ctx.fillStyle = 'rgba(92,74,50,0.38)';
    for (let i = 0; i < 2; i++) {
      const wx = x + s * (0.18 + i * 0.44 + h * 0.1);
      ctx.fillRect(wx, bodyTop + bodyH * 0.25, s * 0.13, bodyH * 0.7);
    }
  } else {
    // ---- KẼ VÁN (Đồ Đồng) ---------------------------------------------------------
    // Tường ván ghép: ba khe dọc tối màu. Thẳng hàng và đều nhau — khác hẳn hai vệt
    // bùn loang lổ của bậc 1, nên hai bậc vẫn phân biệt được dù cùng thuộc nhóm
    // "chưa ra dáng". Đó là điều kiện để bậc 2 không bị đọc thành bậc 1.
    ctx.fillStyle = 'rgba(30,22,14,0.26)';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + s * (i * 0.25) - s * 0.02, bodyTop + s * 0.02, Math.max(0.7, s * 0.04), bodyH - s * 0.02);
    }
  }
}

function drawAgeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed) {
  const age = clamp(tribe.age || 1, 1, AGE_MAT.length - 1);
  if (age <= 1) return;                                  // Đồ Đá: để mộc
  const M = AGE_MAT[age];
  const trim = M.trim, eaveY = bodyTop + s * 0.04;

  // ---- Đồ Đồng trở lên: MÁI ĐUA ------------------------------------------------
  // Tấm diềm chạy dài hơn thân 0,17s mỗi bên. Đây là nét làm việc nặng nhất trong
  // cả hàm: nó nới đường bao ngang thêm ~28%, thứ đọc được cả khi căn nhà chỉ còn
  // mươi pixel — đúng dải zoom mà người ta thật sự ngồi xem.
  const over = s * 0.17;
  const eh = Math.max(1.2, s * 0.09);
  ctx.fillStyle = trim;
  ctx.fillRect(x - over, eaveY, s + over * 2, eh);
  ctx.fillStyle = 'rgba(0,0,0,0.24)';                    // gờ tối dưới diềm -> có dày
  ctx.fillRect(x - over, eaveY + eh, s + over * 2, Math.max(0.7, eh * 0.34));
  // Hai đầu đao hếch lên: cùng một tam giác nhỏ, soi gương qua trục giữa.
  ctx.fillStyle = trim;
  for (const sgn of [-1, 1]) {
    const ex = sgn < 0 ? x - over : x + s + over;
    ctx.beginPath();
    ctx.moveTo(ex, eaveY + eh);
    ctx.lineTo(ex + sgn * s * 0.1, eaveY - s * 0.13);
    ctx.lineTo(ex - sgn * s * 0.04, eaveY);
    ctx.closePath(); ctx.fill();
  }

  // ---- Đồ Sắt trở lên: BỆ ĐÁ + LAN CAN RĂNG CƯA ---------------------------------
  if (age >= 3) {
    // Bệ đá rộng HƠN thân (0,06s mỗi bên): nhà hoá đá thì phải bè chân ra, nếu bệ
    // trùng khít mép thân thì nó chỉ là một vệt xám chứ không phải một cái bệ.
    const pw = s * 0.06;
    const ph = Math.min(bodyH * 0.36, s * 0.26);
    ctx.fillStyle = '#4c525b';
    ctx.fillRect(x - pw, baseY - ph, s + pw * 2, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x - pw, baseY - ph, s + pw * 2, Math.max(1, ph * 0.2));
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.fillRect(x - pw, baseY - Math.max(1, ph * 0.16), s + pw * 2, Math.max(1, ph * 0.16));
    if (detailed) {                                      // mạch đá dọc giữa bệ
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, baseY - ph); ctx.lineTo(x + s * 0.5, baseY);
      ctx.stroke();
    }
    // Răng cưa đứng TRÊN diềm, che một phần chân mái: đường bao trên cùng của căn
    // nhà từ một cạnh xiên trơn biến thành một cái lược. Năm răng là số ít nhất còn
    // đọc ra "lởm chởm" chứ không ra "sứt một miếng".
    const n = 5, mw = (s + over * 2) / (n * 2 - 1);
    const mh = Math.max(1.2, s * 0.15);
    ctx.fillStyle = '#8b9299';
    for (let i = 0; i < n; i++) ctx.fillRect(x - over + i * mw * 2, eaveY - mh, mw, mh);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < n; i++) ctx.fillRect(x - over + i * mw * 2, eaveY - mh, mw, Math.max(0.7, mh * 0.24));
  }

  // ---- Hoàng Kim: MÁI CHỒNG DIÊM + CHÓP -----------------------------------------
  if (age >= 4) {
    const topY2 = apexY - s * 0.30;
    ctx.fillStyle = ageRoofColor(tribe);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, apexY + s * 0.07);
    ctx.lineTo(x + s * 0.5, topY2);
    ctx.lineTo(x + s * 0.8, apexY + s * 0.07);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = trim;                                 // diềm của mái trên
    ctx.fillRect(x + s * 0.17, apexY + s * 0.05, s * 0.66, Math.max(1, s * 0.05));
    if (!OWN_CREST[b.type]) {
      // Chóp nhọn: cột vàng mảnh + hạt châu. Cộng thêm ~0,52s chiều cao, và
      // buildingSpriteHeight đã tính đúng phần này (nếu không thì mọi thứ đọc chiều
      // cao — culling, hit-test, nhãn tên — sẽ cắt cụt đúng cái mũi nhọn đó).
      ctx.strokeStyle = '#d8a544';
      ctx.lineWidth = Math.max(1, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, topY2); ctx.lineTo(x + s * 0.5, topY2 - s * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#f0cf85';
      ctx.beginPath();
      ctx.arc(x + s * 0.5, topY2 - s * 0.22, Math.max(1.2, s * 0.075), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Thiên Triều: HÀNH LANG CỘT quanh chân nhà -------------------------------
  // Bốn bậc trước đều thêm nét ở phần TRÊN (diềm, răng cưa, mái chồng, chóp), nên
  // đường bao cứ cao dần mãi và bậc thứ năm mà đi tiếp hướng đó thì mọi căn nhà
  // biến thành một cái tháp. Bậc này rẽ xuống DƯỚI: một hàng cột chống dưới diềm,
  // làm căn nhà BÈ RA thay vì cao lên.
  //
  // Vì sao chỗ đó đọc được: bậc 3 đã cho căn nhà một cái bệ đá bè chân. Hàng cột
  // đứng đúng trên cái bệ ấy nên nó có chỗ để tựa vào về mặt thị giác — và khoảng
  // trống giữa các cột là thứ duy nhất trong cả sprite mà người xem NHÌN XUYÊN QUA
  // được. Một hình bóng có lỗ thì khác hẳn mọi bậc trước, kể cả ở mươi pixel.
  if (age >= 5 && detailed) {
    const pw = s * 0.06;
    const colTop = eaveY + Math.max(1.2, s * 0.09);
    const colBot = baseY - Math.min(bodyH * 0.36, s * 0.26);
    if (colBot > colTop + 1) {
      const n = 4, gap = (s + pw * 2) / n;
      const cw = Math.max(1, gap * 0.34);
      ctx.fillStyle = trim;
      for (let i = 0; i < n; i++) {
        ctx.fillRect(x - pw + i * gap + (gap - cw) / 2, colTop, cw, colBot - colTop);
      }
      // Xà ngang nối đầu cột: thiếu nó thì bốn cái cột đọc ra là bốn vệt sọc trên
      // tường, không đọc ra là một hàng hiên.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x - pw, colBot - Math.max(0.8, s * 0.03), s + pw * 2, Math.max(0.8, s * 0.03));
    }
  }
}

// Đợt TRÙNG TU khi bộ lạc vừa lên thời đại: một dải sáng vàng chạy dọc thân nhà từ
// chân lên nóc, lan từ kinh đô ra ngoại vi theo khoảng cách. Nó trả lời đúng câu hỏi
// mà lớp phủ tĩnh ở trên không trả lời được — "vừa mới đổi, ngay lúc này" — và vì
// sóng chạy từ tâm ra nên nó cũng vẽ luôn hình hài lãnh thổ của bộ lạc đó.
const AGE_SWEEP_FRAMES = 40;   // khung ảo (60/giây) mỗi căn nhà sáng
const AGE_SWEEP_SPAN = 90;     // độ trễ tối đa giữa nhà gần nhất và xa nhất

function drawAgeUpSweep(b, tribe, x, s, baseY, topY) {
  // Một phép so số trước khi làm bất cứ gì khác: hàm này chạy cho MỌI công trình ở
  // MỌI khung hình, mà 99% thời gian không có đợt trùng tu nào đang diễn ra.
  if (aTick > tribe.ageFlashEnd) return;
  const d = tribe.home ? dist(b.x, b.y, tribe.home.x, tribe.home.y) : 0;
  const k = (aTick - tribe.ageFlashAt - Math.min(AGE_SWEEP_SPAN, d * 0.7)) / AGE_SWEEP_FRAMES;
  if (k < 0 || k > 1) return;

  const e = Math.sin(k * Math.PI);                 // 0 -> 1 -> 0
  const h = baseY - topY;
  const bandY = baseY - h * k;
  const bandH = Math.max(2, h * 0.26);
  // Cộng sáng ('lighter') chứ không tô đè: dải sáng phải trông như ÁNH SÁNG quét
  // qua vật liệu, còn tô đè thì nó ra một mảnh giấy vàng dán lên mặt nhà.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, bandY - bandH, 0, bandY + bandH * 0.4);
  g.addColorStop(0, 'rgba(240,207,133,0)');
  g.addColorStop(0.55, `rgba(240,207,133,${(e * 0.75).toFixed(3)})`);
  g.addColorStop(1, 'rgba(240,207,133,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - s * 0.3, bandY - bandH, s * 1.6, bandH * 1.4);
  ctx.restore();

  // Viền vàng bao quanh cả sprite, đậm nhất giữa đợt: nó là thứ khiến căn nhà được
  // ĐÓNG KHUNG trong một khoảnh khắc, kể cả khi dải sáng đang ở ngoài tầm mắt.
  ctx.globalAlpha = e * 0.55;
  ctx.strokeStyle = '#f0cf85';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.strokeRect(x - s * 0.12, topY, s * 1.24, h);
  ctx.globalAlpha = 1;
}

function drawBuilding(b, px, py, cs) {
  const tribe = tribes[b.tribeId];
  const s = b.size * cs;
  const x = px + cs / 2 - s / 2, y = py + cs / 2 - s / 2;
  const detailed = cs >= 6;

  // Toàn bộ hình được dựng từ CHÂN nhà đi lên, không phải từ mép trên footprint đi
  // xuống. Nhờ vậy đổi hệ số chiều cao chỉ kéo dài phần thân, còn vị trí nhà đứng
  // trên mặt đất thì không xê dịch một pixel nào.
  const hMul = buildingHeightMul(b);   // tháp canh cao lên theo tầng — xem hàm đó
  const baseY = y + s;                 // chân nhà, trùng mép dưới footprint
  const bodyH = s * 0.72 * hMul;
  const bodyTop = baseY - bodyH;
  const roofH = s * 0.34 * hMul;
  const apexY = bodyTop + s * 0.04 - roofH;
  const topY = baseY - buildingSpriteHeight(b) * cs;

  // Bóng đổ dài ra theo chiều cao. Đây là tín hiệu chiều cao MẠNH HƠN cả bản thân
  // khối nhà: mắt đọc bóng trước khi đọc phối cảnh.
  const grow = 0.72 + 0.28 * hMul;     // = 1 khi hMul = 1, giữ nguyên diện mạo cũ
  drawShadow(x + s * 0.55 * grow, baseY - s * 0.08, s * 0.55 * grow, s * 0.2);

  if (!b.done) {
    // Đang xây: giàn giáo gỗ + phần thân mọc dần từ dưới lên theo tiến độ.
    // Giàn giáo dựng sẵn ĐỦ CHIỀU CAO của nhà thành phẩm, thân mọc dần lên trong đó.
    // Nếu giàn giáo chỉ cao bằng footprint thì lúc xây xong nhà sẽ "bật" cao lên một
    // nấc — một cú giật rất lộ khi camera đạo diễn đang nhìn thẳng vào công trường.
    const prog = clamp(b.progress / b.buildTicks, 0, 1);

    // NỀN MÓNG: một vạt đất đã dọn. Trước bản này công trường chỉ là một khung
    // rỗng có dấu ✕ — nhìn ra màn hình nó không đọc được là "đang xây", nó đọc
    // được là "cái hộp này là cái gì?". Nền móng là thứ nói ngay rằng chỗ này đã
    // có người động vào, kể cả khi tiến độ còn 0%.
    ctx.fillStyle = 'rgba(96, 78, 54, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x + s / 2, baseY - s * 0.06, s * 0.56, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tribe.dark;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, baseY - bodyH * prog, s, bodyH * prog);
    ctx.globalAlpha = 1;

    // Giàn giáo: bốn cột đứng + hai xà ngang, thay cho khung vuông có dấu ✕. Cùng
    // một lượng nét vẽ, nhưng hình dạng này mắt đã biết đọc từ trước.
    ctx.strokeStyle = '#a1785a';
    ctx.lineWidth = Math.max(1, cs * 0.11);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const px2 = x + s * (0.05 + i * 0.3);
      ctx.moveTo(px2, baseY); ctx.lineTo(px2, bodyTop - s * 0.05);
    }
    ctx.moveTo(x, bodyTop + bodyH * 0.32); ctx.lineTo(x + s, bodyTop + bodyH * 0.32);
    ctx.moveTo(x, bodyTop - s * 0.03);     ctx.lineTo(x + s, bodyTop - s * 0.03);
    ctx.stroke();

    // Thanh tiến độ nhỏ ngay dưới chân công trường. Người xem hỏi "sắp xong
    // chưa" chứ không hỏi "cao tới đâu rồi", mà chiều cao thân nhà thì chỉ trả
    // lời được câu thứ hai — và với nhà một tầng thì nó gần như không trả lời gì.
    if (detailed) {
      const bw = s * 0.9, bh = Math.max(2, cs * 0.16), bx2 = x + s * 0.05, by2 = baseY + cs * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle = '#e6b46a';
      ctx.fillRect(bx2, by2, bw * prog, bh);
    }
    return;
  }

  // Thân nhà: gradient dọc từ màu bộ lạc xuống màu tối -> có khối, không phẳng.
  // Gradient chạy đúng theo THÂN chứ không theo footprint, nếu không thì nhà càng
  // cao dải chuyển màu càng bị nén lại ở nửa dưới và khối trông bẹt trở lại.
  const g = ctx.createLinearGradient(x, bodyTop, x, baseY);
  g.addColorStop(0, tribe.color);
  g.addColorStop(1, tribe.dark);
  ctx.fillStyle = g;

  if (b.type === 'farm') {
    // Ruộng vẽ như một mảnh đất cày, không phải khối nhà.
    ctx.fillStyle = '#6d5836';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = 'rgba(200,190,120,0.55)';
    ctx.lineWidth = Math.max(0.6, cs * 0.09);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + (s * i) / 4); ctx.lineTo(x + s, y + (s * i) / 4); ctx.stroke();
    }
    ctx.strokeStyle = tribe.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  } else if (b.type === 'wonder') {
    // Kỳ quan có nhánh RIÊNG, không đi qua thân+mái chung. Bản đầu để nó rơi vào
    // nhánh chung rồi vẽ kim tự tháp ĐÈ LÊN, nên trên màn hình nó ra một cái tháp
    // vuông có mái nhọn với vài vạch ngang — không ai đọc ra "kỳ quan", mà đây lại
    // đúng là công trình bắt buộc phải nhận ra được từ mức zoom xa nhất.
    for (let i = 0; i < 5; i++) {
      const w = s * (0.96 - i * 0.17), hh = bodyH * 0.2;
      ctx.fillStyle = i % 2 ? tribe.dark : tribe.color;
      ctx.fillRect(x + s * 0.5 - w / 2, baseY - hh * (i + 1) - s * 0.02, w, hh);
      // Mặt trên mỗi bậc sáng lên: nguồn sáng trên-trái, thống nhất với cả bản đồ.
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x + s * 0.5 - w / 2, baseY - hh * (i + 1) - s * 0.02, w, hh * 0.22);
    }
    const gy = baseY - bodyH - s * 0.02;
    ctx.fillStyle = '#d8a544';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, gy - s * 0.34);
    ctx.lineTo(x + s * 0.66, gy);
    ctx.lineTo(x + s * 0.34, gy);
    ctx.closePath(); ctx.fill();
  } else if (b.type === 'camp') {
    // ============================================================
    // TRẠI TIẾP TẾ — nhánh riêng, và nó PHẢI riêng
    // ============================================================
    // Nhánh chung ở dưới vẽ thân đặc + mái tam giác màu thời đại, tức là nó vẽ ra
    // MỘT CĂN NHÀ. Một căn nhà mọc giữa đất địch rồi biến mất sau 1.200 tick là
    // hình ảnh nói dối về đúng cái tính chất làm nên cơ chế này. Cái lều thì không
    // ai nhầm với một công trình: mái vải chùng, hai cọc chống, không có tường.
    //
    // Cả hình MỜ DẦN theo tuổi. Đây là cách duy nhất để "hạn dùng" là một thứ đọc
    // được trên bản đồ — không có nó thì cái trại đứng nguyên si rồi biến mất
    // không báo trước, và người xem đọc ra là một lỗi vẽ.
    const left = (b.expireAt || 0) - tick;
    const fade = clamp(left / 300, 0.35, 1);
    ctx.globalAlpha = fade;

    const cxx = x + s / 2;
    const tentH = s * 0.62;
    const tentTop = baseY - tentH;
    // Hai cọc chống nhô lên khỏi nóc — đường bao dễ nhận nhất của một cái lều dã
    // chiến, và là thứ vẫn còn đọc được khi cả cái lều chỉ còn vài pixel.
    ctx.strokeStyle = '#6b5233';
    ctx.lineWidth = Math.max(1, cs * 0.09);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.14, baseY); ctx.lineTo(x + s * 0.2, tentTop - s * 0.1);
    ctx.moveTo(x + s * 0.86, baseY); ctx.lineTo(x + s * 0.8, tentTop - s * 0.1);
    ctx.stroke();

    // MÁI VẢI: nóc VÕNG XUỐNG ở giữa (đường bậc hai), không phải tam giác cứng.
    // Chính chỗ võng ấy là thứ mắt đọc ra "vải" thay vì "ngói".
    ctx.beginPath();
    ctx.moveTo(x + s * 0.06, baseY);
    ctx.lineTo(x + s * 0.2, tentTop - s * 0.06);
    ctx.quadraticCurveTo(cxx, tentTop + s * 0.1, x + s * 0.8, tentTop - s * 0.06);
    ctx.lineTo(x + s * 0.94, baseY);
    ctx.closePath();
    ctx.fillStyle = '#ddcba0';
    ctx.fill();
    // Nửa phải tối đi — nguồn sáng trên-trái, thống nhất với cả bản đồ.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(96,80,56,0.3)';
    ctx.fillRect(cxx, tentTop - s * 0.2, s, s);
    // Dải màu bộ lạc chạy dọc sống lều.
    ctx.strokeStyle = tribe.color;
    ctx.lineWidth = Math.max(1.4, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, tentTop - s * 0.04);
    ctx.quadraticCurveTo(cxx, tentTop + s * 0.12, x + s * 0.8, tentTop - s * 0.04);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.34)';
    ctx.lineWidth = Math.max(0.8, cs * 0.05);
    ctx.stroke();

    // CỬA LỀU — một vạt tối hình thang ở giữa. Chỗ duy nhất mắt đọc ra "vào được".
    ctx.fillStyle = 'rgba(44,34,24,0.72)';
    ctx.beginPath();
    ctx.moveTo(cxx - s * 0.15, baseY);
    ctx.lineTo(cxx - s * 0.1, tentTop + s * 0.16);
    ctx.lineTo(cxx + s * 0.1, tentTop + s * 0.16);
    ctx.lineTo(cxx + s * 0.15, baseY);
    ctx.closePath(); ctx.fill();

    if (detailed) {
      // Thùng lương chất bên hông + một bao vải. Đây là chi tiết trả lời "trại gì",
      // và nó phải nằm ngoài mái để không bị vạt tối của cửa nuốt mất.
      ctx.fillStyle = '#8a6a3e';
      ctx.fillRect(x - s * 0.06, baseY - s * 0.22, s * 0.24, s * 0.22);
      ctx.fillStyle = 'rgba(255,246,226,0.2)';
      ctx.fillRect(x - s * 0.06, baseY - s * 0.22, s * 0.24, s * 0.05);
      // Bao vải ở 0,92 chứ không 0,98: ở 0,98 nó vươn tới mép 1,11 cạnh, trong khi
      // hộp bấm chỉ nhô ngang 0,08 — bấm vào cái bao là bấm vào bãi cỏ. Đo bằng
      // pixel mới thấy (lệch 1,6px), vì bán kính của hình elip cộng thêm vào toạ độ
      // tâm là đúng loại phép cộng mà mắt không bắt được khi đọc mã.
      ctx.fillStyle = '#cbb98e';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.92, baseY - s * 0.1, s * 0.13, s * 0.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // ĐANG NUÔI MẤY SUẤT — mấy chấm hổ phách trên nóc, một chấm một suất. Con số
      // này là cả nội dung của nhánh nghiên cứu Quân nhu, nên nó phải nhìn thấy
      // được mà không cần bấm vào; và ĐẾM CHẤM đọc nhanh hơn đọc số ở cỡ này.
      const n = Math.min(b.serving || 0, 8);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = '#e6bd63';
        ctx.beginPath();
        ctx.arc(x + s * (0.24 + i * 0.09), tentTop - s * 0.2, Math.max(1, s * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillRect(x, bodyTop, s, bodyH);
    // Mái: tam giác tối màu hơn thân, phủ hết bề ngang. Màu mái đổi theo THỜI ĐẠI
    // (xem ageRoofColor) — đây là tín hiệu "lên đời" đọc được ở mọi mức zoom.
    ctx.fillStyle = ageRoofColor(tribe);
    ctx.beginPath();
    if ((tribe.age || 1) <= 1) {
      // ĐỒ ĐÁ: NÓC XIÊU. Ba thứ lệch đi so với mái chuẩn — đỉnh THẤP xuống (mái
      // bẹt, lều chứ không nhà), đỉnh LỆCH sang một bên, và hai đầu hiên KHÔNG
      // BẰNG NHAU. Cái thứ ba mới là nét gánh việc: đối xứng là thứ khiến một hình
      // đọc ra "được xây", nên phá đối xứng là cách rẻ nhất để nó đọc ra "dựng tạm".
      //
      // Cả ba đều nằm TRONG hộp bao cũ (đỉnh thấp hơn apexY, hai hiên vẫn đúng
      // 0,08s như buildingSpriteOverhang khai báo cho thời đại 1) — nên hit-test,
      // culling và nhãn tên không phải đổi theo. Bài học Phase 3.19: ba thứ neo
      // vào ô lưới cùng vỡ khi sprite tràn ra khỏi ô đã khai báo.
      const hh = hash01(b.id * 5 + 1, b.id * 3 + 7);
      ctx.moveTo(x - s * 0.08, bodyTop + s * 0.04 + s * 0.05 * hh);
      ctx.lineTo(x + s * (0.5 + (hh - 0.5) * 0.26), apexY + s * 0.09);
      ctx.lineTo(x + s * 1.08, bodyTop + s * 0.04 + s * 0.05 * (1 - hh));
    } else {
      ctx.moveTo(x - s * 0.08, bodyTop + s * 0.04);
      ctx.lineTo(x + s * 0.5, apexY);
      ctx.lineTo(x + s * 1.08, bodyTop + s * 0.04);
    }
    ctx.closePath(); ctx.fill();
    // Vệt sáng cạnh trái = nguồn sáng trên-trái, thống nhất với bóng đổ của cây.
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(x, bodyTop, s * 0.22, bodyH);
    // Cạnh phải tối lại: hai mặt sáng khác nhau mới ra cảm giác KHỐI hộp. Với thân
    // thấp thì thừa, với thân cao thì thiếu nó là mặt tường trông như tờ giấy.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x + s * 0.78, bodyTop, s * 0.22, bodyH);
  }

  if (detailed) {
    ctx.fillStyle = 'rgba(255, 240, 190, 0.85)';
    if (b.type === 'town') {
      // Cột cờ + lá cờ phất theo thời gian -> thủ đô nhìn phát ra ngay.
      ctx.fillStyle = '#efe6d0';
      ctx.fillRect(x + s * 0.46, apexY - s * 0.53, s * 0.07, s * 0.6);
      const wave = Math.sin(aTick * 0.08 + b.id) * s * 0.06;
      ctx.fillStyle = tribe.color;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.53, apexY - s * 0.53);
      ctx.lineTo(x + s * 0.95, apexY - s * 0.40 + wave);
      ctx.lineTo(x + s * 0.53, apexY - s * 0.26);
      ctx.closePath(); ctx.fill();
      // Cửa và cửa sổ neo theo CHÂN nhà: chúng là chi tiết ở tầng trệt, nhà cao lên
      // thì phải đứng yên tại chỗ chứ không trôi lên theo mái.
      ctx.fillStyle = 'rgba(255, 240, 190, 0.9)';
      ctx.fillRect(x + s * 0.32, baseY - s * 0.45, s * 0.16, s * 0.3);  // cửa lớn
      ctx.fillRect(x + s * 0.6, baseY - s * 0.5, s * 0.14, s * 0.14);   // cửa sổ
      // Nhà cao thì có thêm tầng trên — hàng cửa sổ thứ hai, đặt giữa thân.
      if (bodyH > s * 0.95) {
        ctx.fillStyle = 'rgba(255, 240, 190, 0.5)';
        ctx.fillRect(x + s * 0.32, bodyTop + s * 0.22, s * 0.13, s * 0.13);
        ctx.fillRect(x + s * 0.58, bodyTop + s * 0.22, s * 0.13, s * 0.13);
      }
    } else if (b.type === 'house') {
      if ((tribe.age || 1) <= 1) {
        // Đồ Đá: một cái LỖ CỬA tối om, không khung, không cửa sổ. Ô cửa sổ sáng
        // vàng của bản chuẩn là thứ nói "trong này có đèn, có người ngồi" — đúng
        // câu mà một túp lều không được phép nói.
        ctx.fillStyle = 'rgba(18,13,9,0.7)';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.4, baseY);
        ctx.lineTo(x + s * 0.4, baseY - s * 0.3);
        ctx.arc(x + s * 0.5, baseY - s * 0.3, s * 0.1, Math.PI, 0);
        ctx.lineTo(x + s * 0.6, baseY);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(x + s * 0.4, baseY - s * 0.4, s * 0.2, s * 0.4);
        ctx.fillStyle = 'rgba(255, 240, 190, 0.55)';
        ctx.fillRect(x + s * 0.66, baseY - s * 0.55, s * 0.14, s * 0.14);
      }
    } else if (b.type === 'heroHall') {
      // TƯỚNG PHỦ — hai cột soái vượt lên trên mái, một xà ngang nối đầu cột, cờ
      // đuôi nheo treo trên xà, và một cái TRỐNG TRẬN đặt trước cửa.
      //
      // Đường bao "hai cột + xà ngang" là hình duy nhất trong cả bảng công trình
      // có một khoảng TRỐNG NHÌN XUYÊN QUA nằm phía trên mái. Mọi công trình khác
      // đều đặc từ chân lên nóc (kể cả tháp canh, kể cả đền thờ), nên ở mức zoom
      // mà hoa văn đã tan hết, cái khe giữa hai cột vẫn còn đọc được. Cùng lý lẽ
      // với hàng cột Thiên Triều — một hình bóng có lỗ thì khác hẳn mọi hình đặc.
      //
      // Trống trận là nét nhận diện thứ hai, cho mức zoom gần: nó là VÒNG TRÒN duy
      // nhất nằm ở tầng trệt trong cả bảng, và mắt phân loại theo hình trước màu.
      // Hai cột đứng NGOÀI thân nhà, không đè lên mặt tường. Bản đầu vẽ chúng ở
      // 0,14s và 0,86s — tức là nằm TRÊN mặt tiền — và ở cỡ vẽ thật nó đọc ra là
      // "căn nhà có hai vệt sọc", không đọc ra là một cái cổng. Đẩy ra hai mép thì
      // khoảng trống giữa cột và tường mới xuất hiện, và chính khoảng trống ấy là
      // toàn bộ nét nhận diện. Vẫn nằm trong 0,08s mà buildingSpriteOverhang khai.
      const colW = Math.max(1, s * 0.1);
      const colTop = apexY - s * 0.34;
      ctx.fillStyle = '#8a6a3f';
      ctx.fillRect(x - s * 0.07, colTop, colW, baseY - colTop - s * 0.02);
      ctx.fillRect(x + s * 1.07 - colW, colTop, colW, baseY - colTop - s * 0.02);
      ctx.fillStyle = '#a1785a';                       // xà ngang nối đầu cột
      ctx.fillRect(x - s * 0.07, colTop, s * 1.14, Math.max(1, s * 0.09));
      ctx.fillStyle = 'rgba(0,0,0,0.25)';              // gờ tối dưới xà -> có bề dày
      ctx.fillRect(x - s * 0.07, colTop + Math.max(1, s * 0.09), s * 1.14, Math.max(0.7, s * 0.035));
      // Cờ đuôi nheo treo TỪ XÀ xuống, phất theo thời gian — cùng nhịp cờ kinh đô.
      const wv = Math.sin(aTick * 0.07 + b.id) * s * 0.05;
      ctx.fillStyle = tribe.color;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, colTop + s * 0.1);
      ctx.lineTo(x + s * 0.5, colTop + s * 0.46);
      ctx.lineTo(x + s * 0.74, colTop + s * 0.3 + wv);
      ctx.closePath(); ctx.fill();
      // TRỐNG TRẬN đặt cao hơn chân nhà, và đó không phải chuyện bố cục: từ Đồ Sắt
      // trở lên lớp phủ thời đại đắp một cái BỆ ĐÁ cao tới 0,26s lên đúng chân nhà,
      // và nó được vẽ SAU khối này — cái trống đặt ở 0,16s sẽ bị chôn hoàn toàn từ
      // thời đại 3 trở đi. Nét nhận diện chỉ tồn tại ở hai thời đại đầu thì coi như
      // không tồn tại.
      const dx = x + s * 0.5, dy = baseY - s * 0.42, dr = s * 0.16;
      ctx.fillStyle = '#5a3f2a';
      ctx.fillRect(dx - dr, dy - dr * 0.72, dr * 2, dr * 1.44);
      ctx.fillStyle = '#d9c9a4';                        // mặt trống nghiêng về phía người xem
      ctx.beginPath(); ctx.ellipse(dx - dr, dy, dr * 0.36, dr * 0.78, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8a544';                        // đai vàng quanh tang trống
      ctx.fillRect(dx - dr * 0.25, dy - dr * 0.78, Math.max(0.8, dr * 0.18), dr * 1.56);
    } else if (b.type === 'barracks') {
      // Hai thanh chéo = kiếm bắt chéo.
      ctx.strokeStyle = '#e8e2d2';
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.28, baseY - s * 0.15); ctx.lineTo(x + s * 0.72, baseY - s * 0.58);
      ctx.moveTo(x + s * 0.72, baseY - s * 0.15); ctx.lineTo(x + s * 0.28, baseY - s * 0.58);
      ctx.stroke();
    } else if (b.type === 'tower') {
      ctx.fillStyle = tribe.dark;
      ctx.fillRect(x + s * 0.12, apexY - s * 0.16, s * 0.76, s * 0.22); // vọng lâu nhô ra
      ctx.fillStyle = 'rgba(255,240,190,0.8)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + s * (0.18 + i * 0.28), apexY - s * 0.30, s * 0.14, s * 0.16);
      // TẦNG ĐỌC ĐƯỢC: mỗi tầng trên tầng một là một vành lan can cắt ngang thân.
      // Chiều cao thân đã tự nói "cái tháp này cao hơn", nhưng CAO HƠN BAO NHIÊU
      // thì mắt không đo được nếu không có cái khác bên cạnh — đúng bài học đã trả
      // giá ở Phase 3.14 (màu cần mẫu đối chứng). Vành lan can thì ĐẾM được, và
      // đếm thì không cần mẫu đối chứng nào.
      const lv = b.level || 1;
      for (let k = 1; k < lv; k++) {
        const ty2 = baseY - bodyH * (k / lv);
        ctx.fillStyle = tribe.dark;
        ctx.fillRect(x - s * 0.07, ty2 - s * 0.05, s * 1.14, s * 0.1);
        ctx.fillStyle = 'rgba(255,240,190,0.55)';
        ctx.fillRect(x - s * 0.07, ty2 - s * 0.05, s * 1.14, Math.max(1, s * 0.03));
      }
    } else if (b.type === 'workshop') {
      // Bánh xe gỗ + đe: dấu hiệu "chỗ này CHẾ TẠO ra thứ gì đó".
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1, s * 0.055);
      const wx = x + s * 0.32, wy = baseY - s * 0.34, wr = s * 0.17;
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = aTick * 0.02 + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * wr, wy - Math.sin(a) * wr);
        ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9c2b0';
      ctx.fillRect(x + s * 0.6, baseY - s * 0.42, s * 0.26, s * 0.14);
    } else if (b.type === 'stable') {
      // Cửa chuồng mở + hàng rào ngang + móng ngựa treo trên cửa. Ba nét, nhưng
      // MÓNG NGỰA mới là nét gánh cả việc nhận diện: nó là ký hiệu duy nhất trong
      // cả bảng công trình mà người xem đọc ra "ngựa" mà không cần chú giải.
      ctx.fillStyle = 'rgba(20,14,10,0.75)';
      ctx.fillRect(x + s * 0.34, baseY - s * 0.46, s * 0.32, s * 0.46);   // cửa chuồng
      ctx.strokeStyle = '#a1785a';
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const ry = baseY - s * (0.12 + i * 0.16);
        ctx.moveTo(x + s * 0.06, ry); ctx.lineTo(x + s * 0.3, ry);
        ctx.moveTo(x + s * 0.7, ry); ctx.lineTo(x + s * 0.94, ry);
      }
      ctx.stroke();
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath();
      ctx.arc(x + s * 0.5, baseY - s * 0.6, s * 0.12, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();
    } else if (b.type === 'infirmary') {
      // Cối giã thuốc + bó lá. Cố tình KHÔNG dùng chữ thập đỏ: nó là ký hiệu của
      // thế kỷ 19 và đặt vào giữa một bản đồ sơn mài thời đồ đá thì nó hét lên
      // rằng cả bảng màu này chỉ là trang trí. Cối và lá thuốc đọc ra "chỗ chữa
      // bệnh" chậm hơn một nhịp, nhưng đọc ra rồi thì nó thuộc về thế giới này.
      ctx.fillStyle = '#7d9c42';
      for (let i = 0; i < 3; i++) {          // bó lá phơi trên giàn
        const lx = x + s * (0.22 + i * 0.22);
        ctx.beginPath();
        ctx.ellipse(lx, baseY - s * 0.62, s * 0.07, s * 0.15, (i - 1) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#c9c2b0';             // cối đá
      ctx.beginPath();
      ctx.moveTo(x + s * 0.34, baseY - s * 0.34);
      ctx.lineTo(x + s * 0.66, baseY - s * 0.34);
      ctx.lineTo(x + s * 0.58, baseY - s * 0.06);
      ctx.lineTo(x + s * 0.42, baseY - s * 0.06);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8d6e63';           // chày
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.46, baseY - s * 0.3);
      ctx.lineTo(x + s * 0.62, baseY - s * 0.56);
      ctx.stroke();
    } else if (b.type === 'depot') {
      // Hai vựa thóc mái tròn + mấy bao hàng xếp trước cửa. Cố tình KHÔNG dùng
      // dáng nhà-có-mái-dốc như nhà ở: kho thường bị đặt lẻ loi ra tận rìa lãnh
      // thổ, nên ở zoom chơi thật nó hay đứng một mình giữa đồng, và nếu nó chỉ là
      // một cái nhà ở nữa thì người xem đọc ra "có người sống ở đây" — sai hẳn câu
      // chuyện. Vựa tròn đọc ra "chỗ chứa đồ" ngay cả khi chỉ còn vài pixel.
      ctx.fillStyle = '#c9a86a';
      for (let i = 0; i < 2; i++) {
        const gx = x + s * (0.28 + i * 0.42);
        ctx.beginPath();
        ctx.moveTo(gx - s * 0.15, baseY - s * 0.06);
        ctx.lineTo(gx - s * 0.15, baseY - s * 0.42);
        ctx.arc(gx, baseY - s * 0.42, s * 0.15, Math.PI, 0);
        ctx.lineTo(gx + s * 0.15, baseY - s * 0.06);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8d6e63';               // bao hàng chất trước cửa
      ctx.fillRect(x + s * 0.36, baseY - s * 0.18, s * 0.28, s * 0.14);
      ctx.fillRect(x + s * 0.42, baseY - s * 0.3, s * 0.17, s * 0.12);
    } else if (b.type === 'shrine') {
      // Ngọn lửa cúng cháy trên một bệ đá, dưới một cổng vòm hẹp. Cố tình KHÁC
      // dáng đền thờ (cột + trán tường) chứ không chỉ khác cỡ: hai công trình cùng
      // một họ mà chỉ khác kích thước thì ở mức zoom chơi thật sẽ thành một.
      ctx.fillStyle = '#efe6d0';
      ctx.fillRect(x + s * 0.38, baseY - s * 0.42, s * 0.24, s * 0.42);   // cổng vòm
      ctx.fillStyle = '#5c6470';
      ctx.fillRect(x + s * 0.34, apexY + s * 0.06, s * 0.32, s * 0.1);    // bệ đá
      const flick = 0.75 + 0.25 * Math.sin(aTick * 0.24 + b.id * 2.1);
      ctx.fillStyle = '#e09a3c';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, apexY - s * 0.3 * flick);
      ctx.lineTo(x + s * 0.6, apexY + s * 0.06);
      ctx.lineTo(x + s * 0.4, apexY + s * 0.06);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7e3a8';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, apexY - s * 0.16 * flick);
      ctx.lineTo(x + s * 0.55, apexY + s * 0.06);
      ctx.lineTo(x + s * 0.45, apexY + s * 0.06);
      ctx.closePath(); ctx.fill();
    } else if (b.type === 'temple') {
      // Cột + trán tường: một hình dạng mà mắt đọc ra "đền" ngay cả ở 6 px/ô.
      ctx.fillStyle = '#efe6d0';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + s * (0.14 + i * 0.23), bodyTop + s * 0.1, s * 0.09, bodyH - s * 0.12);
      ctx.fillStyle = '#d8a544';
      ctx.beginPath();
      ctx.arc(x + s * 0.5, apexY + s * 0.12, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      // Hào quang thở nhè nhẹ — đền là công trình duy nhất sinh Đức Tin, và người
      // xem cần một tín hiệu rằng thanh Đức Tin của họ đang được nuôi từ đâu.
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(aTick * 0.05 + b.id);
      ctx.fillStyle = '#d8a544';
      ctx.beginPath(); ctx.arc(x + s * 0.5, apexY + s * 0.12, s * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Lớp phủ thời đại: nằm NGOÀI khối `detailed` để bệ đá còn đọc được ở zoom xa,
  // và vẽ SAU chi tiết riêng của từng kiểu nhà nên gờ mái/bệ đá phủ lên trên cùng.
  // Ruộng (nằm phẳng) và Kỳ quan (đã có nhánh vàng riêng, luôn là thời Hoàng Kim)
  // không cần — hai nhánh đó cũng không đi qua thân+mái chung nên biến ở đây vô nghĩa.
  // TRẠI TIẾP TẾ cũng bị loại, và không phải chỉ vì "nó có nhánh riêng". Lớp phủ
  // thời đại (bệ đá, gờ mái, mái chồng diêm, chóp Hoàng Kim) nói đúng một câu:
  // "công trình này thuộc về một nền văn minh đã đi tới đâu". Một cái lều vải dựng
  // trong một buổi, sống 1.200 tick rồi nhổ đi, mà đội mái chồng diêm Thiên Triều
  // là hình ảnh nói dối về đúng cái tính chất làm nên nó.
  if (b.type !== 'farm' && b.type !== 'wonder' && b.type !== 'camp') {
    // Lớp THÔ SƠ vẽ TRƯỚC lớp thời đại, và thứ tự này quan trọng ở đúng bậc 2: diềm
    // tranh rách rủ xuống từ mép mái đua, nên tấm diềm gỗ của Đồ Đồng phải được vẽ
    // ĐÈ LÊN đầu trên của nó — nếu ngược lại thì đám tranh mọc ra từ trên mặt ván.
    if ((tribe.age || 1) <= 2) {
      drawCrudeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed);
    }
    drawAgeAccents(b, tribe, x, s, baseY, bodyTop, bodyH, apexY, detailed);
  }

  // Con dấu thời đại cắm trên KINH ĐÔ. Chỉ nhà chính (một cái mỗi bộ lạc) để không
  // rải dấu khắp bản đồ, và chỉ khi đủ gần để đọc được các chấm (cs>=6). Đây là câu
  // trả lời chắc chắn nhất cho "bộ lạc này đang ở thời đại nào", đọc được ở mọi zoom
  // mà mắt còn thấy được kinh đô.
  if (b.type === 'town' && detailed) {
    drawCapitalSeal(tribe, x + s / 2, topY, s);
  }

  // Đợt trùng tu vẽ SAU CÙNG trong nhóm này: nó phải phủ lên cả lớp phủ thời đại
  // lẫn con dấu, vì thứ nó đang nói là "toàn bộ những gì bạn vừa thấy vừa mới đổi".
  drawAgeUpSweep(b, tribe, x, s, baseY, topY);

  // Cột sáng vàng bốc lên khi đồng hồ Kỳ quan đang chạy: thứ biến một toà nhà
  // thành một CÁI HẸN GIỜ nhìn thấy được. Vẽ NGOÀI khối `detailed` vì ở mức zoom
  // xa (cs < 6) mới là lúc cần nó nhất — khi đó Kỳ quan chỉ còn vài pixel, và cột
  // sáng là thứ duy nhất còn đọc được ở khoảng cách đó.
  if (b.type === 'wonder' && b.done && wonderWatch && wonderWatch.buildingId === b.id) {
    const gy = baseY - bodyH - s * 0.36;
    const beat = 0.3 + 0.28 * Math.sin(aTick * 0.09);
    const grd = ctx.createLinearGradient(0, gy - s * 3, 0, gy);
    grd.addColorStop(0, 'rgba(255,213,79,0)');
    grd.addColorStop(1, `rgba(255,213,79,${beat.toFixed(3)})`);
    ctx.fillStyle = grd;
    ctx.fillRect(x + s * 0.32, gy - s * 3, s * 0.36, s * 3);
  }

  // Khói bếp. Chỉ nhà ở và nhà chính, chỉ khi đã xây xong, và chỉ ~55% số nhà
  // (chọn bằng id nên một căn nhà không tự bật/tắt ống khói giữa chừng).
  //
  // Nó không mang một mẩu thông tin nào về luật chơi — và đó chính là lý do nó
  // đáng có. Cho tới 3.7, thứ DUY NHẤT động đậy trên bản đồ là thứ đang chiến
  // đấu hoặc đang hư hại; một thị trấn yên bình là một bức ảnh chụp. Khói bếp là
  // nhịp thở của lúc KHÔNG có chuyện gì xảy ra, mà phần lớn thời gian của một
  // kỷ nguyên chính là lúc đó.
  if (detailed && b.done && (b.type === 'house' || b.type === 'town') && (b.id % 20) < 11) {
    const sx = x + s * (b.type === 'town' ? 0.74 : 0.68);
    for (let i = 0; i < 2; i++) {
      const ph = ((aTick * 0.011 + i * 0.5 + b.id * 0.13) % 1);
      ctx.globalAlpha = (1 - ph) * 0.22;
      ctx.fillStyle = '#c9c2b0';
      ctx.beginPath();
      ctx.arc(sx + Math.sin(ph * 4 + b.id) * s * 0.12, apexY - s * (0.12 + ph * 1.15),
              s * (0.07 + ph * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Hư hại: khói khi dưới 55% máu, lửa khi dưới 30%. Đây là tín hiệu chiến sự
  // đọc được từ xa mà không cần nhìn thanh máu.
  const hpRatio = b.hp / b.maxHp;
  if (hpRatio < 0.55) {
    const n = hpRatio < 0.3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const ph = (aTick * 0.05 + i * 0.7 + b.id) % 1;
      ctx.globalAlpha = (1 - ph) * 0.5;
      ctx.fillStyle = hpRatio < 0.3 && i === 0 ? '#d9522f' : '#9e9e9e';
      ctx.beginPath();
      // Khói bốc từ MÁI chứ không từ mép trên footprint — với nhà cao, khói ở mép
      // footprint sẽ phun ra từ giữa bức tường.
      ctx.arc(x + s * (0.3 + i * 0.22), apexY - ph * s * 0.9, s * (0.1 + ph * 0.16), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Chớp trắng khi công trình trúng đòn: quét một lớp sáng mỏng lên đúng khối
  // thân + mái. Nhẹ tay hơn hẳn chớp của quân (0,26 so với 0,42) vì diện tích lớn
  // gấp mười — cùng một độ đục, cái to sẽ hoá thành một tấm bảng trắng.
  if (b.flash > 0) {
    ctx.globalAlpha = clamp(b.flash / 9, 0, 1) * 0.26;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, topY, s, baseY - topY);
    ctx.globalAlpha = 1;
  }

  if (b.hp < b.maxHp) {
    // Thanh máu treo trên ĐỈNH sprite, không phải trên footprint: với tháp canh thì
    // hai mốc này cách nhau gần 3 ô, đặt sai là thanh máu nằm đè lên chính vọng lâu.
    const h = Math.max(2, cs * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x, topY - h - 3, s, h);
    ctx.fillStyle = hpRatio > 0.5 ? '#5aa07c' : hpRatio > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(x, topY - h - 3, s * clamp(hpRatio, 0, 1), h);
  }
}

function drawRuin(r, px, py, cs) {
  const age = (tick - r.born) / CONFIG.RUIN_LIFETIME;
  const s = r.size * cs;
  ctx.globalAlpha = clamp(1 - age, 0, 1) * 0.55;
  ctx.fillStyle = '#2b2622';
  ctx.fillRect(px + cs / 2 - s / 2, py + cs / 2 - s / 2, s, s);
  ctx.fillStyle = r.color;
  for (let i = 0; i < 4; i++) {
    const h = hash01(r.x + i, r.y - i);
    ctx.fillRect(px + cs / 2 - s / 2 + h * s * 0.7, py + cs / 2 - s / 2 + hash01(r.y, r.x + i) * s * 0.7, s * 0.22, s * 0.18);
  }
  ctx.globalAlpha = 1;
}

