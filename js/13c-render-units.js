'use strict';
// ============================================================
// 13c-render-units.js
// ------------------------------------------------------------
// Dụng cụ dân (gather tool) + vệt vung vũ khí (swing trail) + trang bị đọc
// được (gear/armor theo nhánh nâng cấp) + drawUnit (bộ binh/cung/kiếm...) +
// dấu kiệt sức + thầy lang + đội hậu cần. Tách từ 13-render-world.js (Phase
// 3.43) — xem 13-render-terrain.js.
// ============================================================
// ------------------------------------------------------------
// Quân
// ------------------------------------------------------------
const CARRY_COLOR = { food: '#7fa63f', wood: '#a1887f', gold: '#e0a825', stone: '#8c8f89' };

// Dụng cụ lao động — chỉ vẽ ở zoom gần (cs>=9), khi dân ĐANG thu hoạch (task
// 'gather'). Loại dụng cụ đọc theo tài nguyên đang khai thác: đốn cây cầm RÌU,
// đập đá/đào vàng cầm CUỐC CHIM, hái quả cầm LIỀM. Có một nhịp VUNG (sin theo
// aTick) để động tác "gõ / bổ" nhìn thấy được — trước đây dân đứng thu hoạch
// bất động y hệt dân đứng chờ, không đọc ra ai đang làm việc gì.
function drawGatherTool(u, cx, cy, cs, bob) {
  const res = (u.resTarget && u.resTarget.type) || u.job || u.carry.type;
  if (res !== 'wood' && res !== 'stone' && res !== 'gold' && res !== 'food') return;
  const dir = u.facingX >= 0 ? 1 : -1;
  const hx = cx + dir * cs * 0.26, hy = cy + bob - cs * 0.02;      // bàn tay phía quay mặt
  const sw = (Math.sin((aTick + u.id * 9) * 0.34) + 1) * 0.5;      // 0 nhấc cao .. 1 bổ xuống
  ctx.lineCap = 'round';

  if (res === 'food') {
    // Liềm: động tác hái nhẹ, không bổ mạnh như rìu/cuốc.
    const a = -Math.PI * 0.28 + Math.PI * 0.22 * sw;
    const bx = hx + Math.cos(a) * dir * cs * 0.42, by = hy + Math.sin(a) * cs * 0.42;
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = Math.max(1, cs * 0.08);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#d7ccb4'; ctx.lineWidth = Math.max(1, cs * 0.09);
    ctx.beginPath(); ctx.arc(bx, by, cs * 0.19, -0.4, Math.PI * 0.9); ctx.stroke();
    ctx.lineCap = 'butt'; return;
  }

  const ang = -Math.PI * 0.64 + Math.PI * 0.58 * sw;               // góc cán: nhấc -115° .. bổ -10°
  const vx = Math.cos(ang) * dir, vy = Math.sin(ang);             // hướng cán
  const L = cs * 0.6;
  const tx = hx + vx * L, ty = hy + vy * L;                        // đầu cán
  const px = -vy, py = vx;                                         // pháp tuyến của cán
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = Math.max(1.2, cs * 0.1);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();

  if (res === 'wood') {
    // Lưỡi rìu: nêm thép chìa về hướng quay mặt.
    ctx.fillStyle = '#c9c2b0';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + vx * cs * 0.28 + px * cs * 0.15, ty + vy * cs * 0.28 + py * cs * 0.15);
    ctx.lineTo(tx + vx * cs * 0.28 - px * cs * 0.15, ty + vy * cs * 0.28 - py * cs * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  } else {
    // Cuốc chim: đầu thép hai mũi vắt ngang đầu cán (đá & vàng đều đào bằng cuốc).
    ctx.strokeStyle = '#8c8f89'; ctx.lineWidth = Math.max(1.4, cs * 0.12);
    ctx.beginPath();
    ctx.moveTo(tx - px * cs * 0.22 + vx * cs * 0.05, ty - py * cs * 0.22 + vy * cs * 0.05);
    ctx.lineTo(tx + px * cs * 0.22 - vx * cs * 0.02, ty + py * cs * 0.22 - vy * cs * 0.02);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// ------------------------------------------------------------
// Vung vũ khí
// ------------------------------------------------------------
// TIẾN ĐỘ CÚ VUNG, 0..1 trên cả chu kỳ; -1 nghĩa là không đang vung.
//
// Mốc thời gian là `u.swingAt`, đóng ngay trong dealDamage — tức đúng khoảnh khắc
// máu thật sự bị trừ. Nhờ vậy nhát chém trên màn hình không bao giờ lệch pha với
// nhát chém trong luật chơi, và không phải nuôi một biến hoạt ảnh thứ hai để rồi
// phải giữ cho hai bên khớp nhau (đúng cái bẫy mà cần bắn của máy bắn đá tránh được
// bằng cách đọc thẳng u.cooldown).
//
// Độ dài cú vung co giãn theo NHỊP ĐÁNH THẬT quy ra giây: ở 12 tick/s một chu kỳ hồi
// chiêu kéo hơn một giây nên cú vung được vẽ trọn vẹn; ở 600 tick/s nó co lại còn
// vài khung, nếu không thì một cú vung sẽ trùm lên năm cú kế tiếp và cây rìu đứng
// nguyên ở tư thế bổ xuống — nhìn ra thành "đơ", đúng ngược thứ đang muốn thêm vào.
function swingK(u) {
  if (!u.swingAt) return -1;
  const cd = u.atkCooldown || u.cd || CONFIG.UNIT.ATTACK_COOLDOWN;
  const frames = clamp((cd / Math.max(1, ticksPerSecond)) * 60 * 0.62, 5, 20);
  const k = (aTick - u.swingAt) / frames;
  return (k < 0 || k > 1) ? -1 : k;
}

// 0 = giơ cao sau vai (chờ đòn) .. 1 = bổ hết tầm trước mặt.
//
// Cú vung được vẽ TRỄ HƠN đòn đánh: sát thương đã trừ xong rồi mới thấy lưỡi rìu
// bắt đầu hạ xuống. Đó là cố ý, và là cách duy nhất còn lại — muốn thấy phần lấy đà
// TRƯỚC cú đánh thì phải đoán trước lúc nào đối thủ còn đứng trong tầm, mà chuyện
// đó thì tới chính đơn vị đang đánh cũng không biết. Độ trễ chỉ ~0,08 giây, còn cái
// đổi lại là mắt được xem trọn vẹn động tác bổ thay vì thấy lưỡi rìu nhảy cóc.
const SWING_DOWN = 0.34;   // phần đầu chu kỳ dành cho nhát bổ, phần còn lại để nhấc lên
function swingChop(k) {
  if (k < 0) return 0;
  return k < SWING_DOWN
    ? 0.5 - 0.5 * Math.cos((k / SWING_DOWN) * Math.PI)               // bổ xuống
    : 0.5 + 0.5 * Math.cos(((k - SWING_DOWN) / (1 - SWING_DOWN)) * Math.PI);  // nhấc lên
}

// Vệt chém: cung sáng chạy dọc quỹ đạo lưỡi, mọc dài dần theo nhát bổ rồi tan đi.
// Đây mới là thứ mắt đọc ra "vung" — bản thân cây rìu đổi góc thì ở cỡ 10 px chỉ ra
// "cây que vừa nhảy sang chỗ khác". Cung được vẽ TRƯỚC vũ khí nên lưỡi luôn nằm đè
// lên đầu vệt, đúng như một vệt do chính nó để lại.
function drawSwingTrail(k, hx, hy, r, ready, hit, dir, color, w) {
  const kt = k / (SWING_DOWN * 1.7);
  if (k < 0 || kt >= 1) return;
  const lead = ready + (hit - ready) * Math.min(1, k / SWING_DOWN);
  const scr = a => dir > 0 ? a : Math.PI - a;
  ctx.globalAlpha = (1 - kt) * 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(hx, hy, r, scr(ready), scr(lead), dir < 0);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 1;
}

// RÌU CHIẾN của bộ binh. Vác ngược ra sau vai lúc hành quân, bổ chéo xuống trước mặt
// lúc giao chiến. Chọn rìu chứ không phải kiếm là một quyết định về ĐỘ ĐỌC ĐƯỢC: ở
// cỡ 9–14 px một lưỡi kiếm chỉ còn là một nét thẳng y hệt cây cung đã duỗi hay cái
// cán cuốc, còn cái đầu rìu là một khối đặc lệch hẳn về một bên — mắt bắt được ngay
// cả khi không đọc nổi phần còn lại của người lính.
const AXE_READY = -Math.PI * 0.80;   // vác sau vai
const AXE_HIT   =  Math.PI * 0.13;   // bổ xuống trước mặt

// ============================================================
// TRANG BỊ ĐỌC ĐƯỢC — ba nhánh nghiên cứu, ba mảng hình riêng
// ============================================================
// Cho tới 3.21, năm nhánh nâng cấp quân sự trả về đúng một thứ: mấy con số trong
// một cái bảng ở cột phải. Trên bản đồ, một đạo quân đã đổ 600 lương + 400 vàng
// vào "Rèn binh khí cấp 3" trông y hệt một đạo quân vừa ra lò từ trại lính.
//
// Đây chính là bài học đã viết ra khi XOÁ nhánh "Ngựa chiến" (xem CONFIG.UPGRADE):
// một phần thưởng mà người xem không nhìn thấy thì với họ nó không tồn tại. Lần
// đó cách chữa là bỏ nhánh đi; lần này là làm cho nó hiện ra.
//
// Ánh xạ MỘT-ĐỔI-MỘT, và đó là điều kiện để nó đọc được:
//     Giáp trụ  -> KHIÊN (cỡ + vật liệu + hình dáng)
//     Rèn binh khí -> ĐẦU RÌU (cỡ + vật liệu)
//     Cung nỏ   -> CÁNH CUNG (bề dày + vật liệu)
// Một nhánh chạm vào hai mảng hình, hay hai nhánh cùng chạm một mảng, thì người
// xem không bao giờ suy ngược ra được cái gì gây ra cái gì — và thứ họ đọc được
// sẽ chỉ còn là "quân này trông xịn hơn", đúng cái mơ hồ đang phải sửa.
//
// Thang vật liệu da -> đồng -> sắt -> vàng cố ý TRÙNG với thang mái nhà theo thời
// đại (AGE_MAT). Trùng là có lợi: người xem chỉ phải học MỘT lần rằng vàng đứng
// trên sắt, rồi dùng lại được cái luật đó ở cả hai chỗ.
const GEAR_MAT = [
  { metal: '#8d6e63', hi: '#a98a7c' },   // 0 — da bọc gỗ, chưa nghiên cứu gì
  { metal: '#b5702f', hi: '#d0913f' },   // 1 — đồng
  { metal: '#9aa0a6', hi: '#ccd2d5' },   // 2 — sắt
  { metal: '#c9992f', hi: '#f0cf85' }    // 3 — vàng
];
function gearMat(tribe, line) {
  const lv = tribe && tribe.upgrades ? tribe.upgrades[line] : 0;
  return GEAR_MAT[clamp(lv || 0, 0, 3)];
}
function gearLv(tribe, line) {
  return clamp((tribe && tribe.upgrades ? tribe.upgrades[line] : 0) || 0, 0, 3);
}

// ĐANG BƯỚC HAY ĐANG ĐỨNG, 0..1. Đọc từ độ LỆCH giữa vị trí mô phỏng và vị trí
// vẽ — bộ lọc nội suy chỉ tụt lại phía sau khi đơn vị thật sự đang dời chỗ, nên
// hiệu số này đã là một máy đo tốc độ có sẵn, không phải nuôi thêm trạng thái nào.
//
// Vì sao đáng có: bản trước, một người lính đứng gác và một người lính đang chạy
// vào trận vẽ y hệt nhau, chỉ nhấp nhô lên xuống. Cả một đạo quân hành quân qua
// màn hình mà không có lấy một cái chân nào động đậy.
function unitStride(u) {
  if (u.rx === undefined) return 0;
  return Math.min(1, (Math.abs(u.x - u.rx) + Math.abs(u.y - u.ry)) * 1.6);
}

// HAI CHÂN, có bước. Vẽ TRƯỚC thân để chúng chui ra từ dưới vạt áo.
function drawLegs(cx, hipY, footY, cs, w, stride, phase, dark) {
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.3, cs * 0.12);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const sw = Math.sin(phase + (s > 0 ? 0 : Math.PI)) * stride;
    ctx.beginPath();
    ctx.moveTo(cx + s * w * 0.2, hipY);
    // Đứng yên (stride 0) thì hai chân trùng nhau thành một cặp trụ thẳng — đúng
    // tư thế nghỉ, và cũng đúng hình mà bản cũ vẽ, nên không có bước lùi nào.
    ctx.lineTo(cx + s * w * 0.2 + sw * cs * 0.22, footY);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// KHIÊN của bộ binh, cầm ở tay TRÁI (phía ngược hướng nhìn) nên đường bao ngang
// của người lính thành: khiên | thân | rìu. Ba khối tách bạch ở ba độ sáng khác
// nhau là thứ giữ cho hình còn đọc được ở 9-12 px, chỗ mà mọi chi tiết bên trong
// đã nhoè hết.
//
// Cấp 0-1 khiên TRÒN, cấp 2-3 khiên hình GIỌT (dài xuống dưới). Đổi hình chứ
// không chỉ đổi màu là có chủ ý — cùng bài học của công trình lên đời ở 3.14: màu
// cần một mẫu đặt cạnh mới so được, còn đường bao thì đọc ngay một mình.
function drawShield(tribe, cx, cy, cs, bob, bodyW, dir, lv) {
  const M = GEAR_MAT[lv];
  const sx = cx - dir * bodyW * 0.5, sy = cy + bob + cs * 0.02;
  const r = cs * (0.26 + lv * 0.02);
  ctx.beginPath();
  if (lv >= 2) {
    ctx.moveTo(sx, sy - r);
    ctx.quadraticCurveTo(sx + r * 0.95, sy - r * 0.7, sx + r * 0.8, sy + r * 0.15);
    ctx.quadraticCurveTo(sx + r * 0.4, sy + r * 1.15, sx, sy + r * 1.5);
    ctx.quadraticCurveTo(sx - r * 0.4, sy + r * 1.15, sx - r * 0.8, sy + r * 0.15);
    ctx.quadraticCurveTo(sx - r * 0.95, sy - r * 0.7, sx, sy - r);
  } else {
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fillStyle = tribe.color;
  ctx.fill();
  ctx.strokeStyle = M.metal;
  ctx.lineWidth = Math.max(1, cs * 0.09);
  ctx.stroke();
  if (cs >= 11) {
    ctx.fillStyle = M.hi;                       // núm khiên
    ctx.beginPath(); ctx.arc(sx, sy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

// `lv` = cấp nhánh "Rèn binh khí". Đầu rìu to dần và đổi vật liệu; CÁN thì không
// đổi — cán gỗ ở mọi cấp, để chênh lệch dồn hết vào đúng một chỗ mắt đang nhìn.
function drawBattleAxe(u, cx, cy, cs, bob, bodyW, lv) {
  const M = GEAR_MAT[lv || 0];
  const dir = u.facingX >= 0 ? 1 : -1;
  const k = swingK(u);
  const ang = AXE_READY + (AXE_HIT - AXE_READY) * swingChop(k);
  const hx = cx + dir * bodyW * 0.44, hy = cy + bob + cs * 0.02;   // bàn tay
  // Cán NGẮN lại và đầu rìu TO lên so với bản trước (0,74/0,30 -> 0,64/0,38).
  // Ở tỉ lệ cũ, cái cán dài gấp hai lần rưỡi phần lưỡi, nên đường bao ra một cây
  // sào có chấm ở đầu — đọc thành GIÁO, không phải rìu. Mà "cái đầu rìu là một
  // khối đặc lệch hẳn về một bên" chính là toàn bộ lý do chọn rìu thay vì kiếm
  // (xem khối chú thích ngay trên): tỉ lệ sai thì lý do đó tự huỷ.
  const L = cs * 0.64;
  const vx = Math.cos(ang) * dir, vy = Math.sin(ang);
  const tx = hx + vx * L, ty = hy + vy * L;
  const px = -vy * dir, py = vx * dir;                             // pháp tuyến của cán
  const g = 1 + (lv || 0) * 0.13;                                  // đầu rìu to dần theo cấp

  drawSwingTrail(k, hx, hy, L * 1.02, AXE_READY, AXE_HIT, dir,
                 lv >= 3 ? '#f7e3a8' : '#fff0d8', Math.max(1, cs * (0.16 + (lv || 0) * 0.02)));

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b4a2b';                                     // cán gỗ
  ctx.lineWidth = Math.max(1.2, cs * 0.11);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.lineCap = 'butt';

  // Đầu rìu: nêm thép chìa ra khỏi đầu cán, dày về một bên.
  ctx.fillStyle = M.hi;
  ctx.beginPath();
  ctx.moveTo(tx - vx * cs * 0.16, ty - vy * cs * 0.16);
  ctx.lineTo(tx + vx * cs * 0.38 * g + px * cs * 0.30 * g, ty + vy * cs * 0.38 * g + py * cs * 0.30 * g);
  ctx.lineTo(tx + vx * cs * 0.38 * g - px * cs * 0.15 * g, ty + vy * cs * 0.38 * g - py * cs * 0.15 * g);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// CUNG — và cái quan trọng nhất ở đây là DÂY CUNG KÉO THEO NHỊP HỒI CHIÊU.
//
// `u.cooldown` chạy từ `cd` về 0 giữa hai phát bắn, nên `1 - cooldown/cd` chính
// là "đã kéo được bao nhiêu phần dây". Bắn xong là nó rơi thẳng về 0 — dây bật,
// mũi tên biến mất. Đọc thẳng từ cơ chế, đúng thủ thuật của cần bắn máy bắn đá:
// hoạt ảnh KHÔNG THỂ lệch pha với luật chơi vì nó không có đồng hồ riêng để lệch.
//
// Không có mục tiêu thì cung buông (pull = 0) dù đồng hồ hồi chiêu đã đầy: một
// hàng cung thủ đứng gác mà ai cũng giương cung căng hết cỡ vào khoảng không thì
// hình ảnh nói dối về việc có địch ở đó.
function drawBow(u, cx, cy, cs, bob, bodyW, dir, lv) {
  const M = GEAR_MAT[lv || 0];
  const cd = u.atkCooldown || u.cd || CONFIG.UNIT.ATTACK_COOLDOWN;
  const pull = u.combatTarget ? clamp(1 - u.cooldown / cd, 0, 1) : 0;
  const bx = cx + dir * bodyW * 0.62, by = cy + bob;
  const R = cs * (0.42 + (lv || 0) * 0.015);
  ctx.strokeStyle = M.hi;
  ctx.lineWidth = Math.max(1.2, cs * (0.09 + (lv || 0) * 0.012));
  ctx.beginPath();
  ctx.arc(bx, by, R, -Math.PI * 0.45, Math.PI * 0.45, dir < 0);
  ctx.stroke();
  // Dây: một đường gấp khúc, đỉnh lùi về sau theo `pull`.
  const tipY = R * Math.sin(Math.PI * 0.45), tipX = R * Math.cos(Math.PI * 0.45);
  const nx = bx + dir * tipX, kx = bx - dir * (pull * cs * 0.34 - tipX * 0.02);
  ctx.strokeStyle = 'rgba(240,235,222,0.9)';
  ctx.lineWidth = Math.max(0.8, cs * 0.05);
  ctx.beginPath();
  ctx.moveTo(nx, by - tipY);
  ctx.lineTo(kx, by);
  ctx.lineTo(nx, by + tipY);
  ctx.stroke();
  // MŨI TÊN đã lắp — chỉ hiện khi dây đã kéo quá nửa, tức là đúng nhịp sắp buông.
  if (pull > 0.5 && cs >= 11) {
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = Math.max(1, cs * 0.06);
    ctx.beginPath();
    ctx.moveTo(kx, by); ctx.lineTo(bx + dir * cs * 0.44, by);
    ctx.stroke();
    ctx.fillStyle = M.metal;
    ctx.beginPath();
    ctx.moveTo(bx + dir * cs * 0.52, by);
    ctx.lineTo(bx + dir * cs * 0.4, by - cs * 0.06);
    ctx.lineTo(bx + dir * cs * 0.4, by + cs * 0.06);
    ctx.closePath(); ctx.fill();
  }
}

// ỐNG TÊN sau lưng — ba cái ngòi lông chìa lên khỏi vai phía sau. Chi tiết nhỏ
// nhất trong cả nhóm này, nhưng nó là thứ duy nhất phân biệt được cung thủ với
// lính cầm giáo khi cây cung đang khuất sau thân người ở hướng nhìn ngược.
function drawQuiver(cx, cy, cs, bob, bodyW, dir) {
  const qx = cx - dir * bodyW * 0.42, qy = cy + bob - cs * 0.1;
  ctx.fillStyle = '#5d4530';
  ctx.fillRect(qx - cs * 0.09, qy - cs * 0.02, cs * 0.18, cs * 0.34);
  ctx.strokeStyle = '#d7ccb4';
  ctx.lineWidth = Math.max(0.8, cs * 0.05);
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(qx + i * cs * 0.06, qy);
    ctx.lineTo(qx + i * cs * 0.08 - dir * cs * 0.04, qy - cs * 0.2);
  }
  ctx.stroke();
}

// Vác hàng về — mỗi tài nguyên một hình dáng riêng thay cho một khối màu chung:
// bó củi, thỏi vàng ("bê vàng về"), tảng đá, giỏ lương. Đọc được ngay dân đang
// gánh gì mà không cần click vào.
function drawCarriedLoad(u, cx, loadY, cs, bob) {
  const t = u.carry.type, topY = loadY + bob;
  if (t === 'wood') {
    ctx.fillStyle = '#7a5230'; ctx.fillRect(cx - cs * 0.3, topY + cs * 0.06, cs * 0.6, cs * 0.12);
    ctx.fillStyle = '#8f6238'; ctx.fillRect(cx - cs * 0.3, topY + cs * 0.2, cs * 0.6, cs * 0.12);
    ctx.fillStyle = '#c9a06a'; ctx.fillRect(cx - cs * 0.3, topY + cs * 0.06, cs * 0.07, cs * 0.26);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - cs * 0.3, topY + cs * 0.06, cs * 0.6, cs * 0.26);
  } else if (t === 'gold') {
    ctx.fillStyle = '#b9871f';
    ctx.beginPath();
    ctx.moveTo(cx - cs * 0.28, topY + cs * 0.3); ctx.lineTo(cx - cs * 0.18, topY + cs * 0.08);
    ctx.lineTo(cx + cs * 0.18, topY + cs * 0.08); ctx.lineTo(cx + cs * 0.28, topY + cs * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c34a'; ctx.fillRect(cx - cs * 0.16, topY + cs * 0.12, cs * 0.32, cs * 0.1);
    ctx.fillStyle = '#f7e3a8'; ctx.fillRect(cx - cs * 0.14, topY + cs * 0.13, cs * 0.12, cs * 0.04);
  } else if (t === 'stone') {
    ctx.fillStyle = '#5c6066';
    ctx.beginPath(); ctx.arc(cx, topY + cs * 0.2, cs * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8c8f89';
    ctx.beginPath(); ctx.arc(cx - cs * 0.07, topY + cs * 0.14, cs * 0.1, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#6f8f38'; ctx.fillRect(cx - cs * 0.24, topY + cs * 0.08, cs * 0.48, cs * 0.26);
    ctx.fillStyle = '#a7c96b'; ctx.fillRect(cx - cs * 0.24, topY + cs * 0.08, cs * 0.48, cs * 0.09);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - cs * 0.24, topY + cs * 0.08, cs * 0.48, cs * 0.26);
  }
}

// ============================================================
// DẤU KIỆT SỨC — ba giọt mồ hôi bắn ra từ đầu, nhịp thở gấp
// ============================================================
// Đặt Ở ĐÂY, trong hàm điều phối, TRƯỚC mọi nhánh `return` theo loại quân — và đó
// là toàn bộ lý do nó nằm ngoài drawUnit thay vì bên trong nhánh bộ binh như dấu
// nọc Mãng Xà. Hàm dưới có mười một nhánh thoát sớm; một dấu trạng thái vẽ trong
// một nhánh sẽ vô hình với mười loại còn lại, mà thể lực thì đúng là thứ chạm tới
// kỵ binh và anh hùng nhiều nhất.
//
// Vì sao phải vẽ ra: một cơ chế làm đổi HÀNH VI mà không có hình thì người xem đọc
// thành lỗi chứ không đọc thành luật — bài học đã trả giá đúng ở dấu nọc rắn ("đám
// lính bỗng đi chậm hẳn trông y hệt một cú tụt khung hình"). Ở đây còn nặng hơn:
// cảnh mà cơ chế này sinh ra để tạo là một con ngựa bị bộ binh bắt kịp, và không
// có dấu thì đó chỉ là một cảnh vô lý.
//
// Chỉ hiện khi ĐÃ ĐUỐI (dưới ngưỡng TIRED), không vẽ thanh thể lực đầy đủ: ở mức
// zoom thường có hàng trăm đơn vị trên màn, và một chỉ số chỉ đáng chiếm chỗ khi
// nó đang nói ra điều gì đó khác thường.
function drawExhaustion(u, cx, cy, cs) {
  if (cs < 7 || !u.maxStam) return;
  const f = u.stam / u.maxStam;
  if (f >= CONFIG.STAMINA.TIRED) return;
  const deep = 1 - f / CONFIG.STAMINA.TIRED;         // 0 ở ngưỡng, 1 khi cạn sạch
  const ph = aTick * 0.22 + u.id;
  ctx.fillStyle = `rgba(150,200,225,${(0.3 + 0.45 * deep).toFixed(3)})`;
  for (let i = 0; i < 3; i++) {
    const a = -0.9 + i * 0.9;                        // ba hướng bắn ra quanh đỉnh đầu
    const r = cs * (0.34 + 0.16 * (0.5 + 0.5 * Math.sin(ph + i * 2.1)));
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r, cy - cs * 0.78 + Math.sin(a) * r * 0.5,
                cs * 0.055, cs * 0.09, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUnit(u, px, py, cs) {
  if (u.type === 'monster') { drawMonster(u, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  const tribe = tribes[u.tribeId];
  let cx = px + cs / 2, cy = py + cs / 2;

  // Lao người về phía mục tiêu ngay sau cú đánh — chuyển động nhỏ này là thứ làm
  // đám đông trông như đang ĐÁNH NHAU chứ không phải đứng chồng lên nhau.
  if (u.lungeUntil && tick < u.lungeUntil && u.combatTarget) {
    const dx = u.combatTarget.x - u.x, dy = u.combatTarget.y - u.y;
    const len = Math.hypot(dx, dy) || 1;
    cx += (dx / len) * cs * 0.35;
    cy += (dy / len) * cs * 0.35;
  }

  if (u.type === 'hero') { drawHero(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'catapult') { drawCatapult(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  // Ba loại Thiên Triều phải đứng TRƯỚC nhánh chung ở dưới, đúng cùng lý do đã ghi
  // ở UNIT_SPEC / MILITARY_SET / ORDER_ROW: nhánh mặc định vẽ ra một người bộ binh,
  // nên quên một dòng ở đây thì con voi chiến đắt nhất bảng xuất hiện trên chiến
  // trường dưới hình hài một anh lính cầm rìu — chạy đúng, đánh đúng, và vô hình.
  if (u.type === 'ballista') { drawBallista(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'elephant') { drawElephant(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'standard') { drawStandard(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (isCavalry(u.type)) { drawCavalry(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  if (u.type === 'medic') { drawMedic(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }
  // ĐỘI HẬU CẦN — dòng thứ tư của cùng một cảnh báo đã viết ở ba dòng trên: nhánh
  // mặc định phía dưới vẽ ra một người bộ binh, nên quên dòng này thì cả đơn vị
  // mới xuất hiện dưới hình hài một anh lính cầm rìu — chạy đúng, và vô hình.
  if (u.type === 'quarter') { drawQuarter(u, tribe, cx, cy, px, py, cs); drawHitFlash(u, px, py, cs); return; }

  const detailed = cs >= 9;
  const isArcher = u.type === 'archer';
  const isSoldier = u.type === 'soldier' || isArcher;
  drawShadow(cx, cy + cs * 0.5, cs * (isSoldier ? 0.42 : 0.34), cs * 0.17);

  // TRÚNG NỌC MÃNG XÀ — hai vòng cung xám xanh quấn quanh chân, đập chậm. Đây là
  // cùng bài toán với chấm độc trên đầu quái: một trạng thái làm đổi hành vi mà
  // không vẽ ra thì người xem đọc thành lỗi, không đọc thành cơ chế. Ở đây còn
  // nặng hơn — "đám lính bỗng đi chậm hẳn" trông y hệt một cú tụt khung hình.
  if (u.slowUntil > tick && cs >= 7) {
    const p = 0.45 + 0.3 * Math.sin(aTick * 0.12 + u.id);
    ctx.strokeStyle = `rgba(140,175,120,${p.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.09);
    for (const o of [0.34, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + cs * o, cs * 0.3, cs * 0.11, 0, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  if (!detailed) {
    if (isSoldier) {
      const r = cs * 0.66;
      ctx.beginPath();
      if (isArcher) {
        // Cung thủ = TAM GIÁC, lính = hình thoi. Ở mức zoom xa, khác biệt duy nhất
        // mắt còn đọc được là đường viền ngoài; đổi màu ở đây là vô ích vì cả hai
        // đều đã mang màu bộ lạc.
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy + r * 0.7); ctx.lineTo(cx - r * 0.9, cy + r * 0.7);
      } else {
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
      }
      ctx.closePath();
      ctx.fillStyle = tribe.color; ctx.fill();
      ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // Viền tối quanh dân thường. Ở mức zoom xa, một chấm màu bộ lạc đặt trên nền
      // cỏ xanh có độ tương phản thấp nhất trong cả bảng màu — chính là lý do đám
      // dân "biến mất" khỏi khung hình trong khi lính (hình thoi có viền) thì không.
      ctx.fillStyle = tribe.color;
      ctx.beginPath(); ctx.arc(cx, cy, cs * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(8,10,14,0.7)';
      ctx.lineWidth = Math.max(0.8, cs * 0.1);
      ctx.stroke();
      if (u.carry.amount > 0) {
        ctx.fillStyle = CARRY_COLOR[u.carry.type];
        ctx.fillRect(cx - cs * 0.16, cy - cs * 0.6, cs * 0.32, cs * 0.26);
      }
    }
  } else {
    // Zoom gần: vẽ hẳn hình người — chân + thân + đầu, lính thêm mũ, giáp vai,
    // khiên và vũ khí. Xem khối GEAR_MAT phía trên để biết vì sao mỗi nhánh
    // nghiên cứu chỉ được chạm vào đúng MỘT mảng hình.
    // TỈ LỆ THÂN NGƯỜI, viết lại ở 3.22 để có chỗ cho CHÂN.
    //
    // Bản cũ: thân cao 0,68·cs bắt đầu từ cy-0,136·cs, tức là đáy thân rơi xuống
    // cy+0,544·cs — THẤP HƠN cả mặt đất (bóng đổ ở cy+0,5·cs). Người lính là một
    // cái hộp cắm thẳng xuống đất. Thêm hai cái chân vào đó thì chúng dài đúng
    // 0,01·cs: có vẽ, và không ai nhìn thấy bao giờ. Đây là loại lỗi chỉ lộ ra khi
    // đặt cạnh nhau mà xem, không lộ ra khi đọc mã — hình vẫn "đúng", chỉ là bộ
    // phận mới rơi vào một khe rộng bằng không.
    //
    // Tổng chiều cao giữ gần như y hệt (1,11·cs so với 1,09·cs cũ), chỉ chia lại:
    //   đầu  cy-0,61 .. cy-0,15   ·   thân cy-0,20 .. cy+0,30   ·   chân .. cy+0,50
    const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
    const bodyW = cs * (isSoldier ? 0.62 : 0.5), bodyH = cs * 0.5;
    const dir = u.facingX >= 0 ? 1 : -1;
    const topY = cy - cs * 0.2 + bob;
    const headY = cy - cs * 0.38 + bob;
    const armLv = isSoldier ? gearLv(tribe, 'armor') : 0;

    // CHÂN. Cả dân thường cũng có — họ là nhóm đông nhất trên bản đồ và cũng là
    // nhóm đi lại nhiều nhất, nên nếu chỉ lính có chân thì cái sống động vừa thêm
    // vào lại vắng mặt ở đúng chỗ nó dễ thấy nhất.
    drawLegs(cx, topY + bodyH * 0.94, cy + cs * 0.5, cs, bodyW,
             unitStride(u), (aTick + u.id * 11) * 0.3, tribe.dark);

    if (isArcher) drawQuiver(cx, cy, cs, bob, bodyW, dir);

    // THÂN. Vai hơi rộng hơn eo — một hình thang thay cho hình chữ nhật, đủ để
    // đường bao ra dáng người thay vì ra một viên gạch dựng đứng.
    const shW = bodyW * (1 + armLv * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx - shW / 2, topY);
    ctx.lineTo(cx + shW / 2, topY);
    ctx.lineTo(cx + bodyW * 0.42, topY + bodyH);
    ctx.lineTo(cx - bodyW * 0.42, topY + bodyH);
    ctx.closePath();
    ctx.fillStyle = tribe.color; ctx.fill();
    // Nửa thân phía SAU tối đi — không phải một mảng màu trang trí mà là bóng đổ
    // của chính người đó, nên nó lật theo hướng nhìn. Bản cũ luôn tô nửa trái,
    // nên một người lính quay sang phải trông như bị chiếu sáng từ phía sau.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(dir > 0 ? cx - shW : cx, topY, shW, bodyH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (isSoldier && cs >= 11) {
      ctx.fillStyle = 'rgba(30,22,14,0.55)';                       // thắt lưng
      ctx.fillRect(cx - bodyW * 0.46, topY + bodyH * 0.52, bodyW * 0.92, cs * 0.07);
    }
    // GIÁP VAI — chỉ mọc ra khi đã nghiên cứu Giáp trụ. Đây là mảng hình duy nhất
    // trên người lính XUẤT HIỆN TỪ CON SỐ KHÔNG thay vì chỉ đổi màu, nên nó là
    // thứ đọc được nhanh nhất trong ba nhánh.
    if (armLv > 0 && isSoldier) {
      const M = GEAR_MAT[armLv];
      ctx.fillStyle = M.metal;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * shW * 0.5, topY + cs * 0.05, cs * (0.12 + armLv * 0.02), cs * 0.1,
                    s * 0.3, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, headY, cs * 0.23, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.stroke();

    if (isArcher) {
      // Mũ da (không phải mũ sắt) + cây cung cong. Cung vẽ ở phía đang nhìn, nên
      // một hàng cung thủ đang bắn thì cả hàng "chỉ" về cùng một hướng — đội hình
      // hiện ra thành hình mà không cần vẽ thêm gì.
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - cs * 0.24, headY - cs * 0.22, cs * 0.48, cs * 0.13);
      drawBow(u, cx, cy, cs, bob, bodyW, dir, gearLv(tribe, 'ranged'));
    } else if (isSoldier) {
      // MŨ SẮT có SỐNG MŨI, và ở cấp giáp 3 thêm chỏm lông đỏ. Đổi vật liệu thôi
      // thì ở 10 px hai cấp liền nhau không phân biệt nổi; thêm một nét dọc rồi
      // một cái chỏm là đổi luôn đường bao của cái đầu, và đường bao thì đọc được.
      const M = GEAR_MAT[armLv];
      ctx.fillStyle = armLv > 0 ? M.metal : '#c9c2b0';
      ctx.beginPath();
      ctx.moveTo(cx - cs * 0.26, headY + cs * 0.03);
      ctx.quadraticCurveTo(cx, headY - cs * 0.42, cx + cs * 0.26, headY + cs * 0.03);
      ctx.closePath(); ctx.fill();
      if (cs >= 11) {
        ctx.fillStyle = armLv > 0 ? M.hi : '#e2ddd0';
        ctx.fillRect(cx + dir * cs * 0.03 - cs * 0.03, headY - cs * 0.02, cs * 0.06, cs * 0.2); // sống mũi
      }
      if (armLv >= 3) {
        ctx.fillStyle = '#c2412c';                                  // chỏm lông chỉ huy
        ctx.beginPath();
        ctx.moveTo(cx, headY - cs * 0.22);
        ctx.lineTo(cx - dir * cs * 0.24, headY - cs * 0.42);
        ctx.lineTo(cx - dir * cs * 0.05, headY - cs * 0.14);
        ctx.closePath(); ctx.fill();
      }
      drawShield(tribe, cx, cy, cs, bob, bodyW, dir, armLv);
      drawBattleAxe(u, cx, cy, cs, bob, bodyW, gearLv(tribe, 'melee'));
    } else if (u.task === 'gather') {
      // Xét TRƯỚC carry: đang thu hoạch thì carry.amount cũng >0, nhưng ta muốn
      // thấy DỤNG CỤ đang vung, không phải kiện hàng — hàng chỉ hiện lúc gánh về.
      drawGatherTool(u, cx, cy, cs, bob);
    } else if (u.carry.amount > 0) {
      // Kiện hàng ĐỘI TRÊN ĐẦU, nên mốc của nó là đỉnh đầu — không phải chiều cao
      // thân. Tham số thứ ba từng là `bodyH` và mọi toạ độ bên trong suy ra từ đó;
      // sau khi chia lại tỉ lệ ở trên thì cùng công thức ấy đặt bó củi xuống ngang
      // mặt người dân. Truyền thẳng cái mốc mình muốn thì lần sau chỉnh tỉ lệ nữa
      // cũng không kéo theo hậu quả ở một hàm khác.
      drawCarriedLoad(u, cx, headY - cs * 0.34, cs, bob);
    } else if (u.task === 'build') {
      ctx.strokeStyle = '#e6b46a';
      ctx.lineWidth = Math.max(1, cs * 0.09);
      ctx.beginPath();
      ctx.moveTo(cx + cs * 0.2, cy + bob); ctx.lineTo(cx + cs * 0.5, cy - cs * 0.35 + bob);
      ctx.stroke();
    }
    if (u.fleeTimer > 0) {
      ctx.fillStyle = '#f2d55a';
      ctx.font = `bold ${Math.round(cs * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, cy - cs * 0.75);
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.1, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
  drawHitFlash(u, px, py, cs);
}

// ============================================================
// THẦY LANG
// ============================================================
// Bài toán vẽ ở đây KHÔNG phải "làm sao cho đẹp", mà là: trên một bản đồ đã có
// bảy loại người cùng mang màu bộ lạc, làm sao để cái thứ tám đọc ra được ở 10 px
// mà không cần chú giải. Bài học Phase 3.14 (lên đời phải đổi SILHOUETTE, không
// chỉ đổi màu) áp thẳng vào đây, và nặng hơn: người xem không được xem hai cái
// cạnh nhau để so, họ chỉ thấy một cái đang chạy giữa đám đông.
//
// Nên khác biệt phải nằm ở ĐƯỜNG BAO, không ở chi tiết:
//   · Lính/dân  = thân hình thang + HAI CÁI CHÂN, đường bao có khe hở ở dưới.
//   · Thầy lang = áo choàng dài chạm đất, đường bao là một cái CHUÔNG LIỀN.
// Ở mọi mức zoom, "có chân" và "không có chân" là khác biệt duy nhất còn sống sót.
//
// Màu áo là vải mộc sáng (#ece2cc), không phải màu bộ lạc — thầy lang là kẻ duy
// nhất trên bản đồ mà phe phái KHÔNG phải là thông tin quan trọng nhất về nó. Màu
// bộ lạc lùi xuống thành một dải khăn chéo, đủ để trả lời "của ai" khi cần hỏi.
//
// Bầu thuốc và bó lá dùng lại đúng ngôn ngữ hình của Nhà y tế (cối giã + lá phơi),
// nên hai thứ đọc ra là MỘT hệ thống chứ không phải hai thứ tình cờ cùng chữa máu.
function drawMedic(u, tribe, cx, cy, px, py, cs) {
  const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
  const dir = u.facingX >= 0 ? 1 : -1;

  // SỢI CHỈ XANH nối tới bệnh nhân — vẽ TRƯỚC người để nó chạy phía sau, và vẽ
  // bằng toạ độ RENDER (rx/ry) của bệnh nhân chứ không phải toạ độ lưới: cả hai
  // đầu sợi chỉ đang trượt mềm giữa hai ô, nên neo vào lưới thì sợi chỉ giật từng
  // nấc trong khi hai người ở hai đầu thì đi mượt. Đây đúng là họ lỗi "ba thứ neo
  // vào Ô LƯỚI cùng vỡ khi sprite tràn ra khỏi ô" đã bắt ở Phase 3.19.
  const p = u.healing;
  if (p && p.hp > 0) {
    const tx = (p.rx - camX) * cs + cs / 2, ty = (p.ry - camY) * cs + cs / 2;
    const mid = 0.5, sag = cs * 0.55;
    ctx.strokeStyle = `rgba(122,178,124,${(0.5 + 0.28 * Math.sin(aTick * 0.22)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.11);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo((cx + tx) * mid, (cy + ty) * mid - sag, tx, ty);
    ctx.stroke();
    // Ba đốm lá trôi dọc sợi chỉ. Chuyển động là thứ báo "đang có chuyện xảy ra"
    // — một sợi chỉ đứng yên đọc ra là một đường kẻ trang trí.
    for (let i = 0; i < 3; i++) {
      const t = ((aTick * 0.014 + i / 3 + u.id * 0.13) % 1);
      const it = 1 - t;
      const bx = it * it * cx + 2 * it * t * ((cx + tx) * mid) + t * t * tx;
      const by = it * it * cy + 2 * it * t * ((cy + ty) * mid - sag) + t * t * ty;
      ctx.fillStyle = 'rgba(160,205,150,0.85)';
      ctx.beginPath(); ctx.arc(bx, by, cs * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawShadow(cx, cy + cs * 0.5, cs * 0.36, cs * 0.15);

  if (cs < 9) {
    // Zoom xa: vải mộc sáng + lõi xanh thuốc. Không dùng hình thoi (đã là lính)
    // cũng không dùng tròn trơn (đã là dân) — tròn CÓ LÕI là hình thứ ba.
    ctx.fillStyle = '#ece2cc';
    ctx.beginPath(); ctx.arc(cx, cy, cs * 0.44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5f8f57';
    ctx.beginPath(); ctx.arc(cx, cy, cs * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tribe.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.12);
    ctx.beginPath(); ctx.arc(cx, cy, cs * 0.44, 0, Math.PI * 2); ctx.stroke();
  } else {
    const topY = cy - cs * 0.22 + bob;
    const headY = cy - cs * 0.4 + bob;
    const hemY = cy + cs * 0.5;
    const hemW = cs * 0.62;

    // BÓ LÁ THUỐC sau lưng — vẽ trước áo để nó nằm phía sau.
    ctx.fillStyle = '#6f8f3e';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(cx - dir * cs * 0.32, topY + cs * 0.06 + i * cs * 0.09,
                  cs * 0.055, cs * 0.15, i * 0.4 - dir * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ÁO CHOÀNG — loe dần xuống, chạm đất, không có khe chân.
    ctx.beginPath();
    ctx.moveTo(cx - cs * 0.24, topY);
    ctx.lineTo(cx + cs * 0.24, topY);
    ctx.lineTo(cx + hemW / 2, hemY);
    ctx.lineTo(cx - hemW / 2, hemY);
    ctx.closePath();
    ctx.fillStyle = '#ece2cc';
    ctx.fill();
    // Nửa thân sau tối đi, lật theo hướng nhìn — cùng luật với mọi người khác trên
    // bản đồ, nếu không thì thầy lang là kẻ duy nhất được chiếu sáng từ phía sau.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(120,106,84,0.35)';
    ctx.fillRect(dir > 0 ? cx - hemW : cx, topY, hemW, hemY - topY);
    // KHĂN CHÉO màu bộ lạc — câu trả lời cho "của phe nào", và chỉ ngần này thôi.
    ctx.strokeStyle = tribe.color;
    ctx.lineWidth = Math.max(1.4, cs * 0.15);
    ctx.beginPath();
    ctx.moveTo(cx - cs * 0.3, topY + cs * 0.02);
    ctx.lineTo(cx + cs * 0.3, topY + cs * 0.34);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ĐẦU + KHĂN TRÙM. Khăn phủ kín đỉnh đầu và rủ xuống gáy: một đường cong liền,
    // ngược hẳn với cái mũ sắt có sống mũi và chỏm lông của lính.
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, headY, cs * 0.21, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.stroke();
    ctx.fillStyle = '#dcd0b6';
    ctx.beginPath();
    ctx.arc(cx, headY, cs * 0.24, Math.PI * 1.02, Math.PI * 2.1);
    ctx.lineTo(cx - dir * cs * 0.24, headY + cs * 0.2);
    ctx.closePath(); ctx.fill();

    // BẦU THUỐC cầm ở tay trước — quả bầu thắt eo, nút gỗ. Ở cỡ này nó là chi tiết
    // duy nhất còn đọc ra được "nghề gì", nên nó phải nằm ở phía đang nhìn.
    if (cs >= 11) {
      const gx = cx + dir * cs * 0.34, gy = topY + cs * 0.26;
      ctx.fillStyle = '#b98a4e';
      ctx.beginPath();
      ctx.arc(gx, gy + cs * 0.07, cs * 0.13, 0, Math.PI * 2);
      ctx.arc(gx, gy - cs * 0.07, cs * 0.085, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b4b28';
      ctx.fillRect(gx - cs * 0.04, gy - cs * 0.19, cs * 0.08, cs * 0.06);
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.1, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// ĐỘI HẬU CẦN — hình thứ TƯ ở mức thu phóng xa
// ============================================================
// Ở cs < 9 cả bản đồ chỉ còn là những hình khối vài pixel, và tới nay có ba:
//     dân thường  — TRÒN trơn
//     lính        — HÌNH THOI (cung thủ: TAM GIÁC)
//     thầy lang   — TRÒN CÓ LÕI
// Nên đội hậu cần phải là hình thứ tư, và VUÔNG là lựa chọn đúng vì hai lý do:
// nó là hình duy nhất còn lại mà mắt phân biệt được ở bốn pixel, và nó tình cờ
// đúng nghĩa — một cái thùng hàng. Đây không phải chuyện thẩm mỹ: ở mức thu phóng
// chơi thật, ĐƯỜNG BAO là toàn bộ thông tin, và đổi màu ở đó là vô ích vì mọi thứ
// đều đã mang màu bộ lạc.
//
// Ở cs >= 9 thì nó là một người KÉO XE. Cái xe mới là thứ gánh việc nhận diện —
// nó là vật thể duy nhất trên bản đồ có BÁNH XE ngoài hai cỗ máy công thành, mà
// hai cỗ máy đó thì to gấp bốn và không có người đi trước.
// ============================================================
// VẠCH QUÂN LƯƠNG — MỘT chỗ vẽ cho MỌI loại quân
// ============================================================
// Gọi từ vòng `drawables` ngay sau drawUnit, KHÔNG gọi bên trong drawUnit. Lý do
// là số học: có tám hàm vẽ đơn vị và mỗi hàm tự vẽ lấy thanh máu của mình bằng một
// đoạn chép tay (đếm được tám bản `if (u.hp < u.maxHp)` giống hệt nhau trong file
// này). Nhét vạch quân lương vào cùng khuôn ấy là thêm bản chép thứ chín tới thứ
// mười sáu, và bản chép thì lệch dần khỏi bản gốc từ lần sửa thứ hai. Quan trọng
// hơn: loại quân THỨ MƯỜI SÁU thêm vào sau này sẽ lặng lẽ không có vạch, y hệt cái
// bẫy mà UNIT_SPEC/MILITARY_SET đã phải cảnh báo bốn lần.
//
// VỊ TRÍ CỐ ĐỊNH, không xếp khít dưới thanh máu. Xếp khít thì vạch nhảy lên nhảy
// xuống tuỳ người đó có bị thương hay không, và hai thông tin cạnh nhau mà một cái
// nhảy chỗ thì mắt phải đi tìm lại nó mỗi lần.
const SUPPLY_WARN = 0.7;
function drawSupplyMark(u, px, py, cs) {
  if (!u.maxSupply || u.hp <= 0) return;
  const f = u.supply / u.maxSupply;
  if (f >= SUPPLY_WARN) return;                 // còn no thì không chiếm chỗ trên màn hình
  const H = CONFIG.SUPPLY.HUNGRY;
  const cx = px + cs / 2;
  if (cs < 7) {
    // Ở mức thu phóng xa, một cái vạch 2px cạnh một cái vạch 2px khác là hai vệt
    // màu không đọc được. Một CHẤM trên đầu thì vẫn đọc ra là "có chuyện với người
    // này", và đó là toàn bộ thông tin còn giữ được ở cỡ ấy.
    if (f >= H) return;
    ctx.fillStyle = f <= 0.01 ? '#d05a44' : '#e0a33c';
    ctx.beginPath(); ctx.arc(cx, py - cs * 0.2, Math.max(1, cs * 0.2), 0, Math.PI * 2); ctx.fill();
    return;
  }
  const w = cs * 1.1, h = Math.max(1.5, cs * 0.12);
  const barY = py + cs + 2 + Math.max(1.5, cs * 0.14);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(cx - w / 2, barY, w, h);
  // Ba mức màu, và ngưỡng giữa đọc đúng CONFIG.SUPPLY.HUNGRY chứ không phải một
  // con số chép tay: vạch phải đổi màu ở đúng cái tick mà sức đánh bắt đầu tụt.
  // Hai con số nói cùng một sự thật thì con số thứ hai chỉ có một việc là lệch đi.
  const col = f <= 0.01 ? '#d05a44' : f < H ? '#e0a33c' : 'rgba(214,196,150,0.6)';
  ctx.fillStyle = col;
  ctx.fillRect(cx - w / 2, barY, w * clamp(f, 0, 1), h);
  // CẠN SẠCH THÌ ĐÓNG KHUNG ĐỎ. Không có dòng này thì màu đỏ báo nguy KHÔNG BAO GIỜ
  // hiện ra được: bề rộng phần tô là `w × f`, mà đúng ở mức nguy hiểm nhất thì f = 0
  // — nên cái vạch tô đỏ rộng 0 pixel. Đo bằng pixel mới thấy: ở f = 0 đếm được 0
  // phần tử màu, trong khi ở f = 0,3 đếm được 14. Một tín hiệu chỉ tồn tại ở đúng
  // ngưỡng nó không thể hiện ra là một tín hiệu không tồn tại.
  if (f <= 0.01) {
    ctx.strokeStyle = '#d05a44';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 - 0.5, barY - 0.5, w + 1, h + 1);
  }
  // ĐANG ĐƯỢC TIẾP TẾ: viền hổ phách nhấp nháy quanh vạch. Không có nó thì một
  // người lính đứng trong trại và một người lính đứng ngoài trại trông y hệt nhau
  // trong suốt 150 tick — tức là cả cơ chế trại tiếp tế chạy vô hình.
  if (u.supplySrc === 'camp') {
    ctx.strokeStyle = `rgba(230,189,99,${(0.55 + 0.35 * Math.sin(aTick * 0.25)).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 - 0.5, barY - 0.5, w + 1, h + 1);
  }
}

function drawQuarter(u, tribe, cx, cy, px, py, cs) {
  const bob = Math.sin((aTick + u.id * 7) * 0.35) * cs * 0.05;
  const dir = u.facingX >= 0 ? 1 : -1;

  // NHÁY HỔ PHÁCH khi trại của nó vừa tiếp tế cho ai đó — cùng thủ thuật `healedAt`
  // của thầy lang. Không có nó thì cả cơ chế chạy hoàn toàn im lặng: quân lương là
  // một con số, và một con số không bao giờ tự nói ra rằng nó vừa được cộng.
  if (u.camp && u.camp.hp > 0 && cs >= 7) {
    const [bx, by] = worldToPx(u.camp.x, u.camp.y);
    ctx.strokeStyle = `rgba(216,178,92,${(0.22 + 0.16 * Math.sin(aTick * 0.16)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.07);
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bx + cs / 2, by + cs / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawShadow(cx, cy + cs * 0.5, cs * 0.46, cs * 0.16);

  if (cs < 9) {
    const r = cs * 0.4;
    ctx.fillStyle = '#c8a469';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // Dải màu bộ lạc vắt ngang thùng — câu trả lời "của phe nào", và chỉ ngần này.
    ctx.fillStyle = tribe.color;
    ctx.fillRect(cx - r, cy - r * 0.3, r * 2, r * 0.6);
    ctx.strokeStyle = tribe.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.11);
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
    return;
  }

  const topY = cy - cs * 0.2 + bob;
  const headY = cy - cs * 0.4 + bob;
  const bodyW = cs * 0.5, bodyH = cs * 0.5;
  const footY = cy + cs * 0.5;

  // ---- CHIẾC XE, vẽ TRƯỚC người vì nó nằm PHÍA SAU ----
  // Neo vào hướng nhìn: xe luôn ở sau lưng, nên khi đơn vị quay đầu thì cả cái xe
  // lật sang bên kia. Bỏ qua vế này thì có những lúc người đi lùi kéo xe phía trước.
  const cartX = cx - dir * cs * 0.62;
  const cartY = footY - cs * 0.34;
  const cw = cs * 0.62, ch = cs * 0.42;

  // Càng xe nối từ thùng lên vai người.
  ctx.strokeStyle = '#7a5a34';
  ctx.lineWidth = Math.max(1.2, cs * 0.09);
  ctx.beginPath();
  ctx.moveTo(cartX + dir * cw * 0.4, cartY);
  ctx.lineTo(cx + dir * cs * 0.02, topY + cs * 0.1);
  ctx.stroke();

  // Bánh xe — nan hoa chỉ vẽ khi còn đọc được, đúng luật đã dùng cho con ngựa.
  const wr = cs * 0.2;
  const wy = footY - wr * 0.72;
  ctx.fillStyle = '#5c4529';
  ctx.beginPath(); ctx.arc(cartX, wy, wr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6a3e';
  ctx.beginPath(); ctx.arc(cartX, wy, wr * 0.58, 0, Math.PI * 2); ctx.fill();
  if (cs >= 12) {
    ctx.strokeStyle = '#5c4529';
    ctx.lineWidth = Math.max(0.8, cs * 0.045);
    // Nan hoa QUAY theo quãng đường đã đi, không theo đồng hồ: một bánh xe quay
    // đều trong khi đơn vị đứng yên là thứ mắt bắt được ngay và đọc ra là lỗi.
    const spin = (u.x + u.y) * 0.9 + aTick * 0.04 * (u.speed || 0);
    for (let i = 0; i < 4; i++) {
      const a = spin + i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cartX - Math.cos(a) * wr * 0.8, wy - Math.sin(a) * wr * 0.8);
      ctx.lineTo(cartX + Math.cos(a) * wr * 0.8, wy + Math.sin(a) * wr * 0.8);
      ctx.stroke();
    }
  }

  // Thùng xe + hai bao lương chất trên.
  ctx.fillStyle = '#8a6a3e';
  ctx.fillRect(cartX - cw / 2, cartY - ch * 0.2, cw, ch * 0.62);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cartX - cw / 2, cartY + ch * 0.18, cw, ch * 0.24);
  ctx.fillStyle = '#ddcba0';
  for (const o of [-0.24, 0.2]) {
    ctx.beginPath();
    ctx.ellipse(cartX + cw * o, cartY - ch * 0.36, cw * 0.28, ch * 0.3, o * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(0.8, cs * 0.05);
  ctx.strokeRect(cartX - cw / 2, cartY - ch * 0.2, cw, ch * 0.62);
  // Cờ đuôi nheo màu bộ lạc cắm ở thành xe — dấu hiệu duy nhất còn đọc được khi
  // cái xe bị một người lính đứng che mất một nửa.
  ctx.strokeStyle = '#6b4b28';
  ctx.lineWidth = Math.max(1, cs * 0.06);
  ctx.beginPath();
  ctx.moveTo(cartX - dir * cw * 0.44, cartY - ch * 0.2);
  ctx.lineTo(cartX - dir * cw * 0.44, cartY - ch * 0.95);
  ctx.stroke();
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.moveTo(cartX - dir * cw * 0.44, cartY - ch * 0.95);
  ctx.lineTo(cartX - dir * cw * 0.44 - dir * cs * 0.26, cartY - ch * 0.78);
  ctx.lineTo(cartX - dir * cw * 0.44, cartY - ch * 0.6);
  ctx.closePath(); ctx.fill();

  // ---- NGƯỜI KÉO ----
  drawLegs(cx, topY + bodyH * 0.94, footY, cs, bodyW, unitStride(u),
           (aTick + u.id * 11) * 0.3, tribe.dark);

  // Thân NGHIÊNG VỀ PHÍA TRƯỚC: đó là cả nội dung "đang kéo một thứ nặng", và nó
  // là chi tiết duy nhất phân biệt dáng này với một người dân đứng cạnh cái xe.
  const lean = dir * cs * 0.09;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW / 2 + lean, topY);
  ctx.lineTo(cx + bodyW / 2 + lean, topY);
  ctx.lineTo(cx + bodyW * 0.4, topY + bodyH);
  ctx.lineTo(cx - bodyW * 0.4, topY + bodyH);
  ctx.closePath();
  ctx.fillStyle = '#b9a882';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(90,74,52,0.34)';
  ctx.fillRect(dir > 0 ? cx - bodyW : cx, topY, bodyW, bodyH);
  // ĐAI VAI màu bộ lạc, vắt chéo — cùng ngôn ngữ với khăn chéo của thầy lang, để
  // ba đơn vị hỗ trợ đọc ra là một họ chứ không phải ba thứ rời rạc.
  ctx.strokeStyle = tribe.color;
  ctx.lineWidth = Math.max(1.4, cs * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - cs * 0.28 + lean, topY + cs * 0.03);
  ctx.lineTo(cx + cs * 0.28, topY + cs * 0.32);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Đầu + nón lá rộng vành. Vành nón là đường bao riêng của nghề này: lính có mũ
  // sắt có sống mũi, thầy lang có khăn trùm rủ gáy, hậu cần có một cái đĩa ngang.
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(cx + lean * 0.7, headY, cs * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = Math.max(0.8, cs * 0.07);
  ctx.stroke();
  ctx.fillStyle = '#cdb173';
  ctx.beginPath();
  ctx.ellipse(cx + lean * 0.7, headY - cs * 0.09, cs * 0.3, cs * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b89b5f';
  ctx.beginPath();
  ctx.ellipse(cx + lean * 0.7, headY - cs * 0.14, cs * 0.12, cs * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  if (u.hp < u.maxHp) {
    const w = cs * 1.1, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

