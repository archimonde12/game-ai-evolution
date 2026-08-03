'use strict';
// ============================================================
// 13e-render-monsters.js
// ------------------------------------------------------------
// Bộ đồ nghề vẽ quái dùng chung + 12 silhouette loài, cùng hang ổ. Tách từ
// 13-render-world.js (Phase 3.43) — xem 13-render-terrain.js.
// ============================================================
// ============================================================
// QUÁI VẬT — bộ đồ nghề "dữ tợn" dùng chung, rồi 12 silhouette
// ============================================================
// Tông màu lạnh/tím, hình thù gai góc, KHÔNG mang màu bộ lạc nào — mắt phải phân
// biệt được "phe thứ năm" trong một phần giây, nếu không người xem sẽ tưởng một
// bộ lạc thứ năm vừa xuất hiện.
//
// PHASE 3.22 — VÌ SAO MỘT BỘ ĐỒ NGHỀ CHUNG, KHÔNG PHẢI 12 HÀM VẼ RỜI
//
// Bản 3.7 đã sửa đúng nửa đầu của bài toán "quái nhìn đơn điệu": mỗi loài một
// ĐƯỜNG BAO riêng, vì mắt phân loại theo silhouette trước rồi mới đọc màu. Nửa
// còn lại thì chưa: mỗi con vẫn là MỘT khối màu phẳng có viền, và ở cỡ 10–20 px
// một khối phẳng đọc ra là một cái NHÃN, không phải một con vật. Nó nhận diện
// được nhưng không doạ được ai.
//
// Ba thứ dưới đây là toàn bộ chênh lệch giữa "một cái nhãn" và "một con thú", và
// cả ba đều phải dùng CHUNG thì bầy quái mới ra một loài giống nhau:
//   1. KHỐI — da chuyển sắc dọc (sáng ở lưng, tối ở bụng). Một dòng, và nó là
//      thứ duy nhất nói cho mắt biết vật này có bề dày.
//   2. RĂNG NANH — và cái mõm phải MỞ RA ĐÚNG LÚC CẮN. Mốc thời gian là
//      `u.swingAt`, chính con dấu mà dealDamage đóng lúc máu bị trừ (xem swingK).
//      Không nuôi thêm một biến hoạt ảnh thứ hai: cùng bài học của cú vung rìu —
//      hai đồng hồ thì sớm muộn cũng lệch pha, mà lệch pha ở đây nghĩa là con
//      quái ngoạm vào không khí rồi mới trừ máu ở nhịp sau.
//   3. MẮT PHÁT SÁNG — một quầng nhỏ dưới hai chấm mắt. Trước 3.22 mắt là hai
//      chấm đặc; đặc thì nó chỉ là hai lỗ thủng trên khối màu. Có quầng thì nó
//      là thứ duy nhất trên bản đồ TỰ PHÁT SÁNG, và ở cỡ nhỏ nhất nó là chi tiết
//      cuối cùng còn đọc được.
//
// Chi phí: một gradient mỗi con mỗi khung hình, và chỉ khi cs >= 5. Dưới ngưỡng
// đó cả con quái chỉ còn dăm pixel, chuyển sắc không đọc được — trả tiền cho một
// thứ không ai thấy đúng là định nghĩa của lãng phí.

// Da quái: sáng ở lưng, tối dần xuống bụng.
function monsterHide(spec, cy, S, cs) {
  if (cs < 5) return spec.color;
  const g = ctx.createLinearGradient(0, cy - S * 0.75, 0, cy + S * 0.75);
  g.addColorStop(0, mixHex(spec.color, '#ffffff', 0.34));
  g.addColorStop(0.44, spec.color);
  g.addColorStop(1, mixHex(spec.dark, spec.color, 0.26));
  return g;
}

// ĐỘ MỞ CỦA MÕM, 0..1. Ngậm khi rảnh, hé sẵn khi đang có mục tiêu (con thú nào
// sắp vồ cũng nhe răng trước), ngoạm hết cỡ đúng nhịp cú cắn.
function snarlK(u) {
  const k = swingK(u);
  const idle = u.combatTarget ? 0.22 : 0.06;
  if (k < 0) return idle;
  return Math.max(idle, Math.sin(k * Math.PI));
}

// MÕM ĐẦY RĂNG. Vẽ như một cái nêm hở: hàm trên đứng yên, hàm dưới hạ xuống theo
// `open`. Răng là những tam giác nhỏ mọc ngược nhau từ hai mép — ở cỡ 12 px chúng
// nhoè thành một đường răng cưa, mà một đường răng cưa trắng nằm ở đầu con vật thì
// mắt đọc ngay ra là hàm răng, không cần đếm được từng cái.
function drawMaw(mx, my, w, h, open, dir, dark, cs) {
  const jaw = h * (0.18 + open * 0.95);
  ctx.fillStyle = '#1a0d0c';                       // trong họng: đỏ sẫm gần đen
  ctx.beginPath();
  ctx.moveTo(mx, my - h * 0.35);
  ctx.lineTo(mx + dir * w, my - h * 0.12);
  ctx.lineTo(mx + dir * w * 0.92, my + jaw);
  ctx.lineTo(mx, my + jaw * 0.55);
  ctx.closePath();
  ctx.fill();
  if (cs < 7) return;
  ctx.fillStyle = '#f4ece0';
  const n = 3;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const ux = mx + dir * w * t, uy = my - h * 0.35 + (h * 0.23) * t;
    ctx.beginPath();                               // răng hàm trên chĩa xuống
    ctx.moveTo(ux - dir * w * 0.1, uy);
    ctx.lineTo(ux + dir * w * 0.1, uy);
    ctx.lineTo(ux, uy + h * 0.34);
    ctx.closePath(); ctx.fill();
    const ly = my + jaw - (jaw - my * 0) * 0.02 - (h * 0.06) * t;
    ctx.beginPath();                               // răng hàm dưới chĩa lên
    ctx.moveTo(ux - dir * w * 0.09, ly);
    ctx.lineTo(ux + dir * w * 0.09, ly);
    ctx.lineTo(ux, ly - h * 0.26);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.8, cs * 0.06);
  ctx.beginPath();
  ctx.moveTo(mx, my - h * 0.35); ctx.lineTo(mx + dir * w, my - h * 0.12);
  ctx.stroke();
}

// GAI LƯNG — dãy tam giác mọc dọc một đoạn thẳng. Đây là chi tiết rẻ nhất biến
// một đường bao TRÒN thành một đường bao HUNG DỮ, và nó hoạt động ở mọi cỡ vì nó
// làm đổi chính cái đường bao chứ không thêm hoạ tiết vào bên trong.
function drawRidge(x0, y0, x1, y1, n, hgt, fill, dark, cs) {
  const dx = (x1 - x0) / n, dy = (y1 - y0) / n;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  // Pháp tuyến phải chĩa LÊN. Bản đầu viết ngược dấu — với một đoạn chạy từ trái
  // sang phải thì nó cho ra vector (0,+1), tức là đám gai mọc XUYÊN XUỐNG BỤNG
  // con vật. Nhìn ra màn hình thì con sói có một dải răng cưa trắng chạy dọc
  // bụng, và đọc nhầm ngay thành "cái mõm to bằng nửa thân". Trong hệ toạ độ
  // canvas y hướng xuống, nên "lên" là y ÂM.
  const nx = (y1 - y0) / len, ny = -(x1 - x0) / len;
  ctx.fillStyle = fill;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.8, cs * 0.06);
  for (let i = 0; i < n; i++) {
    const bx = x0 + dx * i, by = y0 + dy * i;
    // Gai giữa cao nhất, hai đầu thấp dần — một hàng gai đều tăm tắp đọc ra là
    // cái lược, không phải sống lưng.
    const h = hgt * (0.45 + 0.55 * Math.sin(((i + 0.5) / n) * Math.PI));
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + nx * h + dx * 0.5, by + ny * h + dy * 0.5);
    ctx.lineTo(bx + dx, by + dy);
    ctx.closePath();
    ctx.fill();
    if (cs >= 8) ctx.stroke();
  }
}

// VUỐT — ba móng cong toả ra từ một đầu chi.
function drawClaws(px0, py0, ang, L, dir, cs, color) {
  ctx.strokeStyle = color || '#efe6d4';
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const a = ang + i * 0.42;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.quadraticCurveTo(px0 + Math.cos(a) * L * 0.6 * dir, py0 + Math.sin(a) * L * 0.6,
                         px0 + Math.cos(a + 0.5) * L * dir, py0 + Math.sin(a + 0.5) * L);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// MẮT PHÁT SÁNG. `n` = số mắt (nhện có 6), `spread` = bề ngang cả cụm.
function monsterEyes(cx, cy, S, cs, o) {
  if (cs < 6) return;
  const col = o.color || '#e04b32';
  const r = Math.max(1, cs * (o.r || 0.09));
  const n = o.n || 2;
  const spread = (o.spread === undefined ? 0.15 : o.spread) * S;
  // Quầng sáng vẽ TRƯỚC, một lần cho cả cụm: n cái quầng chồng nhau ở cỡ nhỏ chỉ
  // ra một vệt sáng bệt, mà lại tốn n lần gradient.
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.5);
  g.addColorStop(0, o.glow || 'rgba(224,75,50,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const rowY = o.rows && i >= n / 2 ? r * 1.5 : 0;
    ctx.beginPath();
    ctx.arc(cx + t * spread, cy + rowY, r * (o.rows && i >= n / 2 ? 0.7 : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  // LÔNG MÀY — hai vạch tối chếch vào giữa. Một chi tiết hai nét, và nó là thứ
  // biến "hai chấm sáng" thành "một cái nhìn". Con người đọc sự giận dữ trên
  // gương mặt bằng góc của cặp lông mày trước mọi thứ khác; ở đây cũng thế.
  if (o.brow !== false && cs >= 8) {
    ctx.strokeStyle = 'rgba(12,6,6,0.85)';
    ctx.lineWidth = Math.max(1, cs * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - spread * 1.5, cy - r * 2.4);
    ctx.lineTo(cx - spread * 0.2, cy - r * 1.1);
    ctx.moveTo(cx + spread * 1.5, cy - r * 2.4);
    ctx.lineTo(cx + spread * 0.2, cy - r * 1.1);
    ctx.stroke();
  }
}

// Ụ ĐẤT của Rết Cát đang vùi. Cố tình vẽ RẤT ÍT: người xem PHẢI có cơ hội bỏ sót
// nó, nếu không thì phục kích chỉ là một con quái đứng im. Nhưng cũng không được
// vô hình hoàn toàn — một cái bẫy không có dấu hiệu nào thì lần thứ hai người xem
// vẫn không học được gì, và cơ chế trở thành ngẫu nhiên thuần.
function drawBurrowMound(u, cx, cy, S, cs, spec) {
  const puff = 0.5 + 0.5 * Math.sin((aTick + u.id * 13) * 0.05);
  ctx.fillStyle = mixHex(spec.dark, '#000000', 0.15);
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.34, S * 0.42, S * 0.17, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = mixHex(spec.color, '#000000', 0.35);
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.3, S * 0.34, S * 0.13, 0, Math.PI, 0);
  ctx.fill();
  if (cs >= 9) {
    ctx.strokeStyle = 'rgba(20,10,4,0.5)';           // nứt đất
    ctx.lineWidth = Math.max(0.8, cs * 0.05);
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(cx + i * S * 0.2, cy + cs * 0.3);
      ctx.lineTo(cx + i * S * 0.3, cy + cs * 0.3 - S * 0.11);
    }
    ctx.stroke();
    // Hai đốm mắt lấp ló, mờ hẳn và thở theo nhịp chậm.
    ctx.globalAlpha = 0.25 + 0.35 * puff;
    monsterEyes(cx, cy + cs * 0.22, S, cs, { r: 0.06, spread: 0.1, brow: false });
    ctx.globalAlpha = 1;
  }
}

function drawMonster(u, px, py, cs) {
  const spec = CONFIG.MONSTER.TYPES[u.mType];
  // `u.scale` chỉ có ở con sinh ra từ PHÂN ĐÔI. Hình phải nhỏ theo chỉ số, nếu
  // không thì hai con nhỏ trông y hệt con mẹ và cơ chế đọc ra là "nó nhân ba".
  const S = cs * spec.size * (u.scale || 1);
  let cx = px + cs / 2, cy = py + cs / 2;
  if (u.lungeUntil && tick < u.lungeUntil && u.combatTarget) {
    const dx = u.combatTarget.x - u.x, dy = u.combatTarget.y - u.y;
    const len = Math.hypot(dx, dy) || 1;
    cx += (dx / len) * cs * 0.3; cy += (dy / len) * cs * 0.3;
  }

  // ĐANG VÙI: thoát sớm hẳn. Không bóng, không vòng đỏ, không thanh máu — cả ba
  // thứ đó đều là biển báo "có quái ở đây", mà nguyên cả cơ chế phục kích nằm ở
  // chỗ KHÔNG có biển báo nào.
  if (u.buried) { drawBurrowMound(u, cx, cy, S, cs, spec); return; }

  drawShadow(cx, cy + cs * 0.5, S * 0.45, S * 0.18);

  // Vòng đỏ mờ dưới chân: nền cỏ xanh và thân quái xám/nâu quá gần nhau về độ
  // sáng, nên nếu không có mảng màu tương phản thì mắt lướt qua không nhận ra.
  // Quái của SÓNG tô đậm hơn hẳn — người xem cần phân biệt ngay "con này canh
  // hang" với "con này đang tràn vào nhà mình".
  ctx.fillStyle = u.assault ? 'rgba(244,67,54,0.42)' : 'rgba(198,40,40,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + cs * 0.5, S * (u.assault ? 0.62 : 0.55), S * (u.assault ? 0.27 : 0.24), 0, 0, Math.PI * 2);
  ctx.fill();

  // VỪA ĐƯỢC THẦY MO VÁ MÁU — quầng xanh chớp lên quanh chân. Không có dấu hiệu
  // này thì cơ chế hồi máu là vô hình: người xem chỉ thấy "đánh mãi không chết",
  // đọc ra thành một con bug chứ không phải một con quái biết chữa thương.
  if (u.healedAt !== undefined && tick - u.healedAt < 14) {
    const t = 1 - (tick - u.healedAt) / 14;
    ctx.strokeStyle = `rgba(126,214,160,${(0.65 * t).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, cs * 0.13);
    ctx.beginPath();
    ctx.ellipse(cx, cy + cs * 0.42, S * (0.5 + 0.35 * (1 - t)), S * (0.2 + 0.14 * (1 - t)), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const bob = Math.sin((aTick + u.id * 5) * 0.4) * cs * 0.05;
  const gait = Math.sin((aTick + u.id * 9) * 0.34);
  const lw = Math.max(1, cs * 0.12);
  const dir = u.facingX >= 0 ? 1 : -1;
  const open = snarlK(u);
  const hide = monsterHide(spec, cy, S, cs);
  ctx.fillStyle = hide;
  ctx.strokeStyle = spec.dark;
  ctx.lineWidth = lw;
  const shape = spec.shape || 'troll';
  let eyeX = cx, eyeY = cy - S * 0.12 + bob, eyeOpt = null;

  // Mỗi loài một SILHOUETTE. Trước 3.7 cả ba loài dùng chung một hình thoi khác
  // cỡ, và đó là nguyên nhân trực tiếp nhất của chữ "đơn điệu": ở zoom thường,
  // một hình thoi xám cỡ 1,15 và một hình thoi nâu cỡ 1,5 là CÙNG MỘT VẬT với
  // mắt người — màu và cỡ chỉ được đọc sau khi hình dạng đã phân loại xong.
  if (shape === 'wolf') {
    // SÓI. Thân dài nằm ngang, bốn chân sải theo nhịp, lưng dựng lông (gai), mõm
    // nhọn mở ra khi cắn. Bản 3.7 chỉ có một bầu dục + một tam giác làm mõm: đủ
    // để đọc ra "con thú bốn chân", nhưng nó không có CHÂN nào cả, nên đứng hay
    // chạy đều y hệt — mà sói thì thứ duy nhất đáng sợ là nó chạy nhanh hơn ta.
    const by = cy + bob;
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(1.2, cs * 0.1);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {                    // chân: hai khúc, lệch pha
      const rear = i < 2;
      const sw = Math.sin((aTick + u.id * 9) * 0.34 + (rear ? 0 : Math.PI) + (i % 2) * 0.7);
      const lx = cx + dir * S * (rear ? -0.28 : 0.24);
      ctx.beginPath();
      ctx.moveTo(lx, by + S * 0.14);
      ctx.lineTo(lx + dir * sw * S * 0.14, by + S * 0.34);
      ctx.lineTo(lx + dir * sw * S * 0.2, by + S * 0.5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                  // đuôi xù
    ctx.moveTo(cx - dir * S * 0.38, by - S * 0.04);
    ctx.quadraticCurveTo(cx - dir * S * 0.78, by - S * 0.2, cx - dir * S * 0.66, by - S * 0.5);
    ctx.quadraticCurveTo(cx - dir * S * 0.58, by - S * 0.2, cx - dir * S * 0.34, by + S * 0.1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // thân
    ctx.ellipse(cx, by, S * 0.46, S * 0.27, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawRidge(cx - dir * S * 0.3, by - S * 0.2, cx + dir * S * 0.22, by - S * 0.26,
              5, S * 0.2, hide, spec.dark, cs);       // lông gáy dựng đứng
    ctx.fillStyle = hide;
    ctx.beginPath();                                  // đầu
    ctx.moveTo(cx + dir * S * 0.26, by - S * 0.26);
    ctx.lineTo(cx + dir * S * 0.72, by - S * 0.14);
    ctx.lineTo(cx + dir * S * 0.7, by + S * 0.16);
    ctx.lineTo(cx + dir * S * 0.24, by + S * 0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {                                    // tai nhọn cụp về sau
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.3, by - S * 0.24);
      ctx.lineTo(cx + dir * S * 0.22, by - S * 0.56);
      ctx.lineTo(cx + dir * S * 0.44, by - S * 0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    drawMaw(cx + dir * S * 0.46, by + S * 0.04, S * 0.3, S * 0.24, open, dir, spec.dark, cs);
    eyeX = cx + dir * S * 0.4; eyeY = by - S * 0.14;
    eyeOpt = { spread: 0.07, r: 0.075 };

  } else if (shape === 'spider') {
    // NHỆN. Tám chân GẤP KHÚC — khớp gối nhô cao hơn thân, đúng dáng nhện thật —
    // hai đốt thân, và một cặp kìm độc xoè ra khi cắn. Chân vẫn vẽ bằng màu THÂN
    // chứ không phải màu viền: nhìn thật ở zoom 40 thì viền #1b5e20 nằm đè lên
    // vòng đỏ dưới chân quái, hai màu tối chồng nhau và tám cái chân biến mất sạch.
    const by = cy + bob;
    // Chân vẽ bằng OLIVE SÁNG, không phải spec.color và cũng không phải spec.dark.
    // Cả hai màu kia đều đã thử và đều hỏng, mỗi cái theo một kiểu: spec.dark
    // (#1b5e20) chìm nghỉm vào vòng đỏ dưới chân quái, còn spec.color (#7d9c42)
    // thì gần như trùng sắc với chính bãi cỏ nó đang đứng — nhìn ra màn hình con
    // nhện thành một cái khuyên tròn không chân. Sáng lên một bậc thì nó tách
    // khỏi CẢ HAI nền cùng lúc, và đó là điều kiện thật sự cần.
    ctx.strokeStyle = mixHex(spec.color, '#ffffff', 0.3);
    ctx.lineWidth = Math.max(1.4, cs * 0.12);
    ctx.lineCap = 'round';
    // BỐN CHÂN MỖI BÊN, toả về trước và về sau, gối nhô cao hơn lưng.
    //
    // Hai bản trước đều toả chân theo GÓC quanh tâm (0..2π) và cả hai đều ra một
    // bụi cỏ, không ra con nhện. Lý do chỉ lộ ra khi vẽ thử ở cỡ lớn: toả đều
    // quanh tâm nghĩa là có chân chĩa thẳng LÊN — mà cả bảng quái này vẽ theo lối
    // NHÌN NGANG (sói, gấu, quỷ đá đều nhìn nghiêng), nên "lên" ở đây là lên
    // trời, không phải ra phía sau. Nhện thì không có chân nào chĩa lên trời.
    // Ép hết chân về hai bên trái/phải rồi mới rải trước-sau thì nó vừa khớp với
    // lối nhìn chung, vừa cho đúng cái đường bao tám nan mà mắt tìm.
    for (let i = 0; i < 8; i++) {
      const sd = i < 4 ? 1 : -1;                       // bên phải / bên trái
      const t = (i % 4) / 3;                           // 0 = chân trước, 1 = chân sau
      const vy = (t - 0.5) * 2;                        // -1 trước .. +1 sau
      const wig = Math.sin(aTick * 0.25 + u.id + i * 1.3) * S * 0.04;
      const fx0 = cx + sd * S * (0.62 + (1 - Math.abs(vy)) * 0.22);
      const fy0 = by + S * (0.12 + vy * 0.3) + wig;
      ctx.beginPath();
      ctx.moveTo(cx + sd * S * 0.1, by + S * vy * 0.08);
      ctx.lineTo(cx + sd * S * 0.36, by + S * vy * 0.2 - S * 0.32);   // gối nhô lên
      ctx.lineTo(fx0, fy0);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    ctx.beginPath();                                  // bụng (đốt sau, to)
    ctx.ellipse(cx - dir * S * 0.22, by + S * 0.02, S * 0.3, S * 0.26, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (cs >= 8) {
      // Hoa văn ĐỒNG HỒ CÁT màu vàng cảnh báo. Hai lựa chọn trước đều hỏng: một
      // hình thoi TỐI ở giữa cái bụng tròn thì mắt đọc thành LỖ THỦNG (con nhện
      // biến thành chiếc khuyên), còn ba vạch ngang thì ra đúng cái biểu tượng
      // menu ba gạch. Sáng-trên-tối và có eo thắt ở giữa thì nó đọc ra là một dấu
      // hiệu trên lưng con vật — và tình cờ cũng đúng thứ mà loài nhện độc thật
      // mang trên bụng, nên nó tự giải thích luôn cái nọc.
      ctx.fillStyle = '#e8d26a';
      const ax = cx - dir * S * 0.22;
      ctx.beginPath();
      ctx.moveTo(ax - S * 0.09, by - S * 0.17);
      ctx.lineTo(ax + S * 0.09, by - S * 0.17);
      ctx.lineTo(ax + S * 0.03, by + S * 0.01);
      ctx.lineTo(ax + S * 0.1, by + S * 0.19);
      ctx.lineTo(ax - S * 0.1, by + S * 0.19);
      ctx.lineTo(ax - S * 0.03, by + S * 0.01);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = hide;
    }
    ctx.beginPath();                                  // ngực (đốt trước, nhỏ)
    ctx.ellipse(cx + dir * S * 0.2, by - S * 0.02, S * 0.19, S * 0.17, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f4ece0';                      // kìm độc, xoè theo cú cắn
    ctx.lineWidth = Math.max(1, cs * 0.08);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.3, by + s * S * 0.05);
      ctx.quadraticCurveTo(cx + dir * S * 0.46, by + s * S * (0.06 + open * 0.18),
                           cx + dir * S * 0.4, by + s * S * (0.16 + open * 0.24));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    eyeX = cx + dir * S * 0.22; eyeY = by - S * 0.08;
    eyeOpt = { n: 6, rows: true, spread: 0.1, r: 0.055, brow: false };

  } else if (shape === 'bear') {
    // GẤU. Khối tròn nặng, có BƯỚU VAI (dấu hiệu nhận dạng số một của gấu thật),
    // bốn chân ngắn mập, vuốt trước, và cái mõm há to khi gầm. Không góc nhọn nào
    // trên thân — sức nặng đọc ra từ tỉ lệ, không từ gai.
    const by = cy + bob;
    ctx.strokeStyle = spec.dark; ctx.lineWidth = Math.max(1.6, cs * 0.14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const rear = i < 2;
      const sw = Math.sin((aTick + u.id * 9) * 0.26 + (rear ? 0 : Math.PI));
      const lx = cx + dir * S * (rear ? -0.26 : 0.22);
      ctx.beginPath();
      ctx.moveTo(lx, by + S * 0.2);
      ctx.lineTo(lx + dir * sw * S * 0.1, by + S * 0.48);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                  // thân + bướu vai liền một nét
    ctx.moveTo(cx - dir * S * 0.44, by + S * 0.16);
    ctx.quadraticCurveTo(cx - dir * S * 0.5, by - S * 0.2, cx - dir * S * 0.16, by - S * 0.34);
    ctx.quadraticCurveTo(cx + dir * S * 0.04, by - S * 0.56, cx + dir * S * 0.3, by - S * 0.3);
    ctx.quadraticCurveTo(cx + dir * S * 0.5, by - S * 0.1, cx + dir * S * 0.44, by + S * 0.22);
    ctx.quadraticCurveTo(cx, by + S * 0.46, cx - dir * S * 0.44, by + S * 0.16);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {
      ctx.beginPath();                                // hai tai tròn nhỏ
      ctx.arc(cx + dir * S * 0.32, by - S * 0.46, S * 0.11, 0, Math.PI * 2);
      ctx.arc(cx + dir * S * 0.08, by - S * 0.5, S * 0.1, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath();                                  // mõm
    ctx.ellipse(cx + dir * S * 0.42, by - S * 0.16, S * 0.17, S * 0.13, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawMaw(cx + dir * S * 0.38, by - S * 0.12, S * 0.26, S * 0.26, open, dir, spec.dark, cs);
    if (cs >= 8) drawClaws(cx + dir * S * 0.3, by + S * 0.42, Math.PI * 0.12, S * 0.22, dir, cs);
    eyeX = cx + dir * S * 0.24; eyeY = by - S * 0.34;
    eyeOpt = { spread: 0.11, r: 0.08 };

  } else if (shape === 'wisp') {
    // BÓNG MA. Giọt lửa lơ lửng — bồng bềnh mạnh hơn hẳn và có quầng sáng, để
    // người xem đọc ra "thứ này không chạm đất" rồi đoán được nó đánh từ xa.
    // 3.22 thêm một cái SỌ mờ bên trong ngọn lửa và mấy dải tà rách bên dưới:
    // trước đó nó là một giọt màu xanh trơn, đọc ra gần với "quả cầu phép" hơn
    // là với một con quái — mà đây là con duy nhất bắn được, nên nó cần một
    // GƯƠNG MẶT để người xem nhớ mặt mà tránh.
    const fl = Math.sin((aTick + u.id * 9) * 0.16) * cs * 0.22;
    const wy = cy - S * 0.1 + fl;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(cx, wy, S * 0.68, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {                     // tà áo rách bay dưới
      const sw = Math.sin((aTick + u.id * 7 + i * 40) * 0.14);
      ctx.globalAlpha = 0.5 - i * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx + (i - 1) * S * 0.2, wy + S * 0.1);
      ctx.quadraticCurveTo(cx + (i - 1) * S * 0.3 + sw * S * 0.18, wy + S * 0.5,
                           cx + (i - 1) * S * 0.16 + sw * S * 0.3, wy + S * 0.86);
      ctx.lineTo(cx + (i - 1) * S * 0.06, wy + S * 0.14);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();                                  // thân lửa
    ctx.moveTo(cx, wy - S * 0.62);
    ctx.quadraticCurveTo(cx + S * 0.42, wy - S * 0.02, cx, wy + S * 0.46);
    ctx.quadraticCurveTo(cx - S * 0.42, wy - S * 0.02, cx, wy - S * 0.62);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 8) {                                    // sọ mờ bên trong
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#eaf6f5';
      ctx.beginPath(); ctx.ellipse(cx, wy - S * 0.1, S * 0.17, S * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d2b2c';
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.11, wy + S * 0.08);       // hàm răng sọ
      ctx.lineTo(cx + S * 0.11, wy + S * 0.08);
      ctx.lineTo(cx + S * 0.07, wy + S * 0.16);
      ctx.lineTo(cx - S * 0.07, wy + S * 0.16);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    cy = wy;
    eyeX = cx; eyeY = wy - S * 0.13;
    eyeOpt = { color: '#dceef0', glow: 'rgba(180,240,238,0.6)', spread: 0.1, r: 0.085 };

  } else if (shape === 'wyvern') {
    // PHI LONG. Vẽ CAO hơn mặt đất hẳn một quãng và bóng đổ nằm lại dưới chân:
    // chiều cao là thứ duy nhất trên bản đồ này nói được "nó đang bay", mà bay
    // lại đúng là năng lực khiến nó nguy hiểm.
    const lift = cs * 0.85 + Math.sin((aTick + u.id * 7) * 0.22) * cs * 0.18;
    const wy = cy - lift;
    const flap = Math.sin((aTick + u.id * 11) * 0.45);
    ctx.beginPath();                                  // hai cánh, có XƯƠNG NGÓN
    ctx.moveTo(cx, wy);
    ctx.quadraticCurveTo(cx - S * 0.75, wy - S * (0.36 + flap * 0.22), cx - S * 1.0, wy + S * 0.16);
    ctx.quadraticCurveTo(cx - S * 0.55, wy + S * 0.04, cx, wy + S * 0.2);
    ctx.moveTo(cx, wy);
    ctx.quadraticCurveTo(cx + S * 0.75, wy - S * (0.36 + flap * 0.22), cx + S * 1.0, wy + S * 0.16);
    ctx.quadraticCurveTo(cx + S * 0.55, wy + S * 0.04, cx, wy + S * 0.2);
    ctx.fill(); ctx.stroke();
    if (cs >= 7) {
      ctx.strokeStyle = mixHex(spec.dark, spec.color, 0.45);
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      for (const s of [-1, 1]) for (let i = 1; i <= 2; i++) {
        ctx.moveTo(cx + s * S * 0.06, wy + S * 0.04);
        ctx.lineTo(cx + s * S * (0.34 + i * 0.3), wy - S * (0.16 - i * 0.08) + flap * S * 0.1);
      }
      ctx.stroke();
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.beginPath();                                  // thân
    ctx.ellipse(cx, wy + S * 0.06, S * 0.2, S * 0.36, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // đuôi có ngạnh
    ctx.moveTo(cx - dir * S * 0.06, wy + S * 0.36);
    ctx.quadraticCurveTo(cx - dir * S * 0.4, wy + S * 0.62, cx - dir * S * 0.66, wy + S * 0.5);
    ctx.lineTo(cx - dir * S * 0.5, wy + S * 0.68);
    ctx.quadraticCurveTo(cx - dir * S * 0.3, wy + S * 0.72, cx + dir * S * 0.02, wy + S * 0.44);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // cổ + đầu
    ctx.moveTo(cx, wy - S * 0.2);
    ctx.quadraticCurveTo(cx + dir * S * 0.24, wy - S * 0.5, cx + dir * S * 0.5, wy - S * 0.44);
    ctx.lineTo(cx + dir * S * 0.46, wy - S * 0.24);
    ctx.quadraticCurveTo(cx + dir * S * 0.2, wy - S * 0.24, cx + dir * S * 0.1, wy - S * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {
      ctx.beginPath();                                // sừng chĩa ngược
      ctx.moveTo(cx + dir * S * 0.3, wy - S * 0.46);
      ctx.lineTo(cx + dir * S * 0.14, wy - S * 0.74);
      ctx.lineTo(cx + dir * S * 0.36, wy - S * 0.54);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    drawMaw(cx + dir * S * 0.42, wy - S * 0.34, S * 0.3, S * 0.2, open, dir, spec.dark, cs);
    cy = wy;
    eyeX = cx + dir * S * 0.36; eyeY = wy - S * 0.42;
    eyeOpt = { spread: 0.05, r: 0.07 };

  } else if (shape === 'lord') {
    // CHÚA HANG. Trước 3.22 nó là hình thoi của quỷ đá phóng to, thêm một cái
    // vương miện gai. Ở cỡ 2,7 ô thì "một hình thoi to" đúng là một hình thoi to:
    // con quái đắt nhất bản đồ, rơi Thánh vật 100%, mà đường bao lại y hệt loài
    // thường gặp nhất. Giờ nó có THÂN NGƯỜI — vai gai, áo choàng, hai tay vuốt —
    // vì thứ duy nhất phân biệt "trùm" với "quái to" là nó trông như một KẺ CẦM
    // QUYỀN, không phải một con thú lớn hơn.
    const R = u.aura ? u.aura.r * cs : 0;
    if (R > 0) {
      // Nhìn thật ở zoom 40: ở alpha 0,16 cái vòng này KHÔNG ĐỌC ĐƯỢC trên nền cỏ
      // — nó có ở đó nhưng mắt không bắt được, tức là bằng không. Thêm một lớp nền
      // đỏ mờ đổ dần rồi mới tới vòng nét đứt.
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      g.addColorStop(0, 'rgba(198,40,40,0.20)');
      g.addColorStop(1, 'rgba(198,40,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.42 + 0.16 * Math.sin(aTick * 0.08);
      ctx.strokeStyle = '#e04b32';
      ctx.lineWidth = Math.max(2, cs * 0.22);
      ctx.setLineDash([cs * 1.2, cs * 0.9]);
      ctx.lineDashOffset = -aTick * 0.6;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = hide; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    const by = cy + bob;
    ctx.fillStyle = mixHex(spec.dark, '#000000', 0.25);
    ctx.beginPath();                                  // áo choàng đổ sau lưng
    ctx.moveTo(cx - S * 0.34, by - S * 0.34);
    ctx.lineTo(cx + S * 0.34, by - S * 0.34);
    ctx.lineTo(cx + S * 0.52 - dir * S * 0.12, by + S * 0.62);
    ctx.lineTo(cx - S * 0.52 - dir * S * 0.12, by + S * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hide;
    ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    ctx.beginPath();                                  // hai chân
    ctx.moveTo(cx - S * 0.22, by + S * 0.14);
    ctx.lineTo(cx - S * 0.3, by + S * 0.58);
    ctx.lineTo(cx - S * 0.06, by + S * 0.58);
    ctx.lineTo(cx - S * 0.02, by + S * 0.14);
    ctx.lineTo(cx + S * 0.02, by + S * 0.14);
    ctx.lineTo(cx + S * 0.06, by + S * 0.58);
    ctx.lineTo(cx + S * 0.3, by + S * 0.58);
    ctx.lineTo(cx + S * 0.22, by + S * 0.14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();                                  // thân hình thang, vai rộng
    ctx.moveTo(cx - S * 0.42, by - S * 0.3);
    ctx.lineTo(cx + S * 0.42, by - S * 0.3);
    ctx.lineTo(cx + S * 0.24, by + S * 0.2);
    ctx.lineTo(cx - S * 0.24, by + S * 0.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawRidge(cx - S * 0.44, by - S * 0.3, cx + S * 0.44, by - S * 0.3,
              5, S * 0.26, mixHex(spec.color, '#000000', 0.2), spec.dark, cs);
    ctx.fillStyle = hide;
    ctx.beginPath();                                  // hai cánh tay dài
    for (const s of [-1, 1]) {
      ctx.moveTo(cx + s * S * 0.36, by - S * 0.24);
      ctx.lineTo(cx + s * S * 0.56, by + S * 0.24);
      ctx.lineTo(cx + s * S * 0.4, by + S * 0.28);
      ctx.lineTo(cx + s * S * 0.24, by - S * 0.2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) for (const s of [-1, 1]) {
      drawClaws(cx + s * S * 0.48, by + S * 0.28, Math.PI * 0.4, S * 0.22, s, cs, '#f0d9a8');
    }
    ctx.fillStyle = hide;
    ctx.beginPath();                                  // đầu
    ctx.ellipse(cx, by - S * 0.44, S * 0.19, S * 0.17, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    drawMaw(cx + dir * S * 0.02, by - S * 0.4, S * 0.18, S * 0.18, open, dir, spec.dark, cs);
    // VƯƠNG MIỆN gai vàng — dấu hiệu "kẻ cầm quyền", và là thứ duy nhất trên
    // người nó mang màu ấm.
    ctx.strokeStyle = '#d8a544';
    ctx.lineWidth = Math.max(1.4, cs * 0.14);
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(cx + i * S * 0.09, by - S * 0.56);
      ctx.lineTo(cx + i * S * 0.13, by - S * (0.72 + Math.abs(i) * 0.03));
    }
    ctx.moveTo(cx - S * 0.2, by - S * 0.56); ctx.lineTo(cx + S * 0.2, by - S * 0.56);
    ctx.stroke();
    eyeX = cx; eyeY = by - S * 0.48;
    eyeOpt = { spread: 0.07, r: 0.1, glow: 'rgba(255,120,60,0.7)' };

  } else if (shape === 'blob') {
    // NHỚT QUỶ. Khối keo TRONG SUỐT — thứ duy nhất trên bản đồ nhìn xuyên qua
    // được, nên nó không thể bị nhầm với bất cứ loài nào khác dù cỡ và màu có
    // gần đến đâu. Bên trong lửng lơ mấy khúc xương của thứ nó đã nuốt: đó vừa
    // là chi tiết ghê nhất của con này, vừa là lời giải thích tại chỗ cho việc
    // giết nó xong lại ra thêm hai con.
    const by = cy + bob * 1.6;
    const wob = Math.sin((aTick + u.id * 6) * 0.13);   // co giãn như một túi nước
    const rw = S * (0.56 + wob * 0.07), rh = S * (0.4 - wob * 0.07);
    // Đường bao phải BÈ RA và có HAI BƯỚU lệch nhau. Bản đầu là một vòm đối xứng
    // đặt trên một đáy phẳng, và ở cỡ nào nó cũng ra đúng hình một CÁI MŨ SẮT —
    // tức là trùng ngôn ngữ hình với người lính, thứ tệ nhất có thể xảy ra với
    // một con quái. Thứ khiến mắt đọc ra "khối keo" là sự BẤT ĐỐI XỨNG và cái
    // đáy loe ra hai bên, không phải màu và cũng không phải độ trong.
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - rw, by + rh * 0.62);
    ctx.quadraticCurveTo(cx - rw * 1.1, by - rh * 0.5, cx - rw * 0.42, by - rh * 0.88);
    ctx.quadraticCurveTo(cx - rw * 0.04, by - rh * 1.16, cx + rw * 0.26, by - rh * 0.8);
    ctx.quadraticCurveTo(cx + rw * 0.72, by - rh * 1.02, cx + rw * 0.9, by - rh * 0.24);
    ctx.quadraticCurveTo(cx + rw * 1.12, by + rh * 0.34, cx + rw, by + rh * 0.62);
    ctx.quadraticCurveTo(cx, by + rh * 1.2, cx - rw, by + rh * 0.62);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
    if (cs >= 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';      // đốm sáng mặt keo
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath();
      ctx.arc(cx - rw * 0.35, by - rh * 0.36, S * 0.13, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(232,226,210,0.75)';        // xương lửng lơ bên trong
      ctx.beginPath();
      ctx.ellipse(cx + rw * 0.2, by + rh * 0.1, S * 0.11, S * 0.08, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - rw * 0.34, by + rh * 0.3, S * 0.2, S * 0.05);
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    // Giọt nhỏ xuống đất — nhịp rất chậm, để nó không thành hoạt ảnh gây rối.
    if (cs >= 9) {
      const dp = ((aTick + u.id * 31) % 140) / 140;
      ctx.fillStyle = mixHex(spec.color, '#000000', 0.1);
      ctx.globalAlpha = 0.7 * (1 - dp);
      ctx.beginPath();
      ctx.arc(cx + rw * 0.5, by + rh * 0.7 + dp * S * 0.5, S * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    eyeX = cx; eyeY = by - rh * 0.2;
    eyeOpt = { spread: 0.14, r: 0.085, color: '#f2d55a', glow: 'rgba(242,213,90,0.5)' };

  } else if (shape === 'burrower') {
    // RẾT CÁT (đã trồi lên). Thân nhiều ĐỐT uốn sóng, mỗi đốt một cặp chân — hình
    // duy nhất trên bản đồ có nhịp lặp theo chiều dài, nên nó đọc ra là "con vật
    // nhiều chân" ngay cả khi chỉ còn mươi pixel. Đầu có hai càng kìm.
    const by = cy + bob;
    const seg = 5;
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(1, cs * 0.07);
    ctx.lineCap = 'round';
    for (let i = 0; i < seg; i++) {                    // chân, vẽ trước
      const t = i / (seg - 1);
      const sx = cx + dir * S * (0.42 - t * 0.86);
      const sy = by + Math.sin(aTick * 0.3 + u.id + i * 1.1) * S * 0.08;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - dir * S * 0.06, sy + s * S * 0.3);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    for (let i = seg - 1; i >= 0; i--) {               // đốt thân, đuôi vẽ trước
      const t = i / (seg - 1);
      const sx = cx + dir * S * (0.42 - t * 0.86);
      const sy = by + Math.sin(aTick * 0.3 + u.id + i * 1.1) * S * 0.08;
      ctx.beginPath();
      ctx.ellipse(sx, sy, S * (0.17 - t * 0.05), S * (0.15 - t * 0.04), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#efe6d4';                       // hai càng kìm, xoè khi cắn
    ctx.lineWidth = Math.max(1.2, cs * 0.09);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.5, by + s * S * 0.06);
      ctx.quadraticCurveTo(cx + dir * S * 0.74, by + s * S * (0.08 + open * 0.22),
                           cx + dir * S * 0.62, by + s * S * (0.2 + open * 0.26));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    eyeX = cx + dir * S * 0.42; eyeY = by - S * 0.06;
    eyeOpt = { spread: 0.06, r: 0.07, color: '#f2d55a', glow: 'rgba(242,213,90,0.55)' };

  } else if (shape === 'serpent') {
    // MÃNG XÀ. Thân cuộn hình S vẽ bằng MỘT đường viền dày thuôn dần, cái đầu
    // ngóc cao có mang bạnh, lưỡi chẻ thò ra. Cuộn tròn nằm sát đất còn đầu thì
    // dựng lên — chênh lệch cao thấp đó là thứ khiến nó đọc ra "sắp mổ" chứ
    // không phải "đang bò".
    const by = cy + bob * 0.6;
    const sway = Math.sin((aTick + u.id * 5) * 0.12);
    ctx.lineCap = 'round';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(2.4, S * 0.3);            // viền tối = bề dày thân
    ctx.beginPath();
    ctx.moveTo(cx - dir * S * 0.6, by + S * 0.34);
    ctx.quadraticCurveTo(cx - dir * S * 0.1, by + S * 0.5, cx + dir * S * 0.16, by + S * 0.2);
    ctx.quadraticCurveTo(cx + dir * S * (0.4 + sway * 0.06), by - S * 0.1, cx + dir * S * 0.2, by - S * 0.4);
    ctx.stroke();
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = Math.max(1.4, S * 0.2);
    ctx.beginPath();
    ctx.moveTo(cx - dir * S * 0.6, by + S * 0.34);
    ctx.quadraticCurveTo(cx - dir * S * 0.1, by + S * 0.5, cx + dir * S * 0.16, by + S * 0.2);
    ctx.quadraticCurveTo(cx + dir * S * (0.4 + sway * 0.06), by - S * 0.1, cx + dir * S * 0.2, by - S * 0.4);
    ctx.stroke();
    ctx.lineCap = 'butt';
    const hx = cx + dir * S * 0.22, hy = by - S * 0.46;
    ctx.fillStyle = hide; ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    ctx.beginPath();                                   // mang bạnh
    ctx.ellipse(hx, hy + S * 0.04, S * 0.28, S * 0.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                   // đầu
    ctx.ellipse(hx + dir * S * 0.08, hy - S * 0.04, S * 0.19, S * 0.13, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (cs >= 8) {                                     // lưỡi chẻ
      const tl = S * (0.16 + open * 0.16);
      ctx.strokeStyle = '#d05a44';
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      ctx.moveTo(hx + dir * S * 0.24, hy);
      ctx.lineTo(hx + dir * (S * 0.24 + tl), hy + S * 0.04);
      ctx.moveTo(hx + dir * (S * 0.24 + tl * 0.6), hy + S * 0.024);
      ctx.lineTo(hx + dir * (S * 0.24 + tl), hy - S * 0.03);
      ctx.stroke();
    }
    drawMaw(hx + dir * S * 0.12, hy + S * 0.02, S * 0.18, S * 0.16, open, dir, spec.dark, cs);
    eyeX = hx + dir * S * 0.06; eyeY = hy - S * 0.08;
    eyeOpt = { spread: 0.05, r: 0.07, color: '#f2d55a', glow: 'rgba(242,213,90,0.55)' };

  } else if (shape === 'shaman') {
    // THẦY MO. Dáng người KHOM trong áo trùm đầu, tay chống một cây gậy có sọ.
    // Đây là loài quái duy nhất mang hình NGƯỜI, và đó là cả chủ đích: người xem
    // phải đọc ra ngay "con này không đánh, con này làm phép", vì thứ tự giết nó
    // mới là quyết định mà nó tạo ra. Ba vòng bùa xoay quanh gậy chỉ sáng lên
    // đúng lúc nó vừa vá máu cho ai đó (`chantAt`), không sáng đều — nếu sáng
    // đều thì người xem học sai thành "nó có hào quang buff".
    const by = cy + bob;
    const chant = u.chantAt !== undefined && tick - u.chantAt < 12
      ? 1 - (tick - u.chantAt) / 12 : 0;
    ctx.fillStyle = hide;
    ctx.beginPath();                                   // áo choàng loe xuống đất
    ctx.moveTo(cx - S * 0.14, by - S * 0.34);
    ctx.quadraticCurveTo(cx - S * 0.34, by, cx - S * 0.4, by + S * 0.5);
    ctx.lineTo(cx + S * 0.4, by + S * 0.5);
    ctx.quadraticCurveTo(cx + S * 0.34, by, cx + S * 0.14, by - S * 0.34);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 8) {                                     // tua rua gấu áo
      ctx.strokeStyle = mixHex(spec.dark, '#000000', 0.2);
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(cx + i * S * 0.11, by + S * 0.5);
        ctx.lineTo(cx + i * S * 0.11, by + S * (0.58 + (i % 2 ? 0.06 : 0)));
      }
      ctx.stroke();
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.fillStyle = mixHex(spec.dark, '#000000', 0.3);
    ctx.beginPath();                                   // mũ trùm, khoét một hốc tối
    ctx.moveTo(cx - S * 0.2, by - S * 0.26);
    ctx.quadraticCurveTo(cx, by - S * 0.72, cx + S * 0.2, by - S * 0.26);
    ctx.quadraticCurveTo(cx, by - S * 0.16, cx - S * 0.2, by - S * 0.26);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // GẬY SỌ
    const gx = cx + dir * S * 0.34;
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = Math.max(1.2, cs * 0.09);
    ctx.beginPath();
    ctx.moveTo(gx, by + S * 0.44); ctx.lineTo(gx - dir * S * 0.04, by - S * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#e8e2d2';
    ctx.beginPath(); ctx.arc(gx - dir * S * 0.04, by - S * 0.66, S * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c22';
    ctx.beginPath();
    ctx.arc(gx - dir * S * 0.075, by - S * 0.68, S * 0.03, 0, Math.PI * 2);
    ctx.arc(gx - dir * S * 0.005, by - S * 0.68, S * 0.03, 0, Math.PI * 2);
    ctx.fill();
    if (chant > 0) {                                   // ba vòng bùa xanh khi đang vá
      ctx.strokeStyle = `rgba(126,214,160,${(0.85 * chant).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, cs * 0.08);
      for (let i = 0; i < 3; i++) {
        const rr = S * (0.16 + i * 0.1), ph = aTick * 0.12 + i * 2;
        ctx.beginPath();
        ctx.ellipse(gx - dir * S * 0.04, by - S * 0.66, rr, rr * 0.34, ph, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    eyeX = cx; eyeY = by - S * 0.34;
    eyeOpt = { spread: 0.08, r: 0.075, color: '#7ed6a0', glow: 'rgba(126,214,160,0.6)', brow: false };

  } else if (shape === 'ent') {
    // CỔ THỤ QUÁI. Thân là một khúc gỗ nứt nẻ, hai rễ làm chân, hai cành làm tay
    // với chùm nhánh nhọn ở đầu, và một vòm lá xác xơ trên đỉnh. Mắt cháy đỏ nằm
    // trong hốc cây.
    //
    // Nó cố tình mượn NGÔN NGỮ HÌNH của cái cây trên bản đồ (xem drawTree): người
    // xem đã học "hình này là cây, cây thì đứng yên và chặt được". Một cái cây
    // ĐANG ĐI về phía làng mình phá vỡ đúng cái luật đó, và không cần một dòng
    // giải thích nào.
    const by = cy + bob * 0.5;
    const step = Math.sin((aTick + u.id * 9) * 0.16);
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(2, cs * 0.2);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {                         // hai chân rễ
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.14, by + S * 0.18);
      ctx.lineTo(cx + s * S * 0.2 + s * step * S * 0.06, by + S * 0.44);
      ctx.lineTo(cx + s * S * 0.28 + s * step * S * 0.1, by + S * 0.62);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                   // thân cây, phình gốc
    ctx.moveTo(cx - S * 0.32, by + S * 0.26);
    ctx.quadraticCurveTo(cx - S * 0.25, by - S * 0.1, cx - S * 0.22, by - S * 0.5);
    ctx.lineTo(cx + S * 0.22, by - S * 0.5);
    ctx.quadraticCurveTo(cx + S * 0.25, by - S * 0.1, cx + S * 0.32, by + S * 0.26);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) {                                     // vân vỏ cây
      ctx.strokeStyle = mixHex(spec.dark, '#000000', 0.2);
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(cx + i * S * 0.11, by + S * 0.2);
        ctx.lineTo(cx + i * S * 0.09, by - S * 0.42);
      }
      ctx.stroke();
      ctx.strokeStyle = spec.dark; ctx.lineWidth = lw;
    }
    ctx.strokeStyle = mixHex(spec.color, '#000000', 0.25);
    ctx.lineWidth = Math.max(1.6, cs * 0.15);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {                         // hai cành tay
      const sw = s * step * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.16, by - S * 0.3);
      ctx.lineTo(cx + s * S * 0.46, by - S * 0.16 + sw * S * 0.2);
      ctx.lineTo(cx + s * S * 0.58, by + S * 0.14 + sw * S * 0.2);
      ctx.stroke();
      if (cs >= 7) drawClaws(cx + s * S * 0.58, by + S * 0.14 + sw * S * 0.2,
                             Math.PI * 0.35, S * 0.2, s, cs, mixHex(spec.dark, '#ffffff', 0.25));
    }
    ctx.lineCap = 'butt';
    // Vòm lá: xanh úa chứ không xanh tươi — cây này chết rồi. Phải TO hơn thân
    // hẳn một quãng, nếu không cả cụm đọc ra là một cái bù nhìn có chổi trên đầu:
    // thứ nói "đây là CÂY" là tỉ lệ tán-trên-thân, không phải màu lá.
    ctx.fillStyle = '#4e5f2c';
    ctx.beginPath();
    ctx.arc(cx - S * 0.24, by - S * 0.6, S * 0.23, 0, Math.PI * 2);
    ctx.arc(cx + S * 0.26, by - S * 0.58, S * 0.21, 0, Math.PI * 2);
    ctx.arc(cx, by - S * 0.76, S * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b4a20';
    ctx.beginPath();                                   // mảng lá tối, cho tán có khối
    ctx.arc(cx + S * 0.1, by - S * 0.52, S * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14100a';
    ctx.beginPath();                                   // hốc cây (mồm)
    ctx.ellipse(cx, by - S * 0.14, S * 0.12, S * (0.07 + open * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
    eyeX = cx; eyeY = by - S * 0.36;
    eyeOpt = { spread: 0.13, r: 0.12, color: '#ffb44e', glow: 'rgba(255,150,50,0.85)' };

  } else if (shape === 'worldboss') {
    // ============================================================
    // THIÊN MA — con quái duy nhất do NGƯỜI XEM thả xuống
    // ============================================================
    // Đường bao phải khác MỌI thứ khác trên bản đồ ngay từ hình khối, vì nó là vật
    // thể duy nhất mà người xem cần tìm thấy trong một khung hình chật kín quân:
    // một thân RẮN CUỘN đứng dựng lên, không có chân — trong khi cả bảng còn lại là
    // thú bốn chân, khối đứng, hoặc hình thoi.
    //
    // BẢN 3.32 VẼ LẠI TOÀN BỘ, và lý do không phải thẩm mỹ. Bản 3.30 đúng về hình
    // KHỐI (thân cuộn đứng) nhưng cả con quái chỉ gồm một nét cong dày + bảy cái
    // gai + một cái đầu tam giác — tức là một đường bao TRƠN, mà đường bao trơn thì
    // đọc ra là "to", không đọc ra là "dữ". Sự dữ tợn nằm ở chỗ đường bao có bao
    // nhiêu MŨI NHỌN chĩa ra ngoài, và nó phải đọc được ở cỡ 9 px/ô, tức là trước
    // khi mắt kịp nhìn thấy bất cứ chi tiết nào bên trong. Bản này thêm bốn thứ,
    // cả bốn đều làm đổi chính cái đường bao:
    //   · ĐÔI CÁNH MÀNG có mép sau răng cưa, đập chậm — thứ duy nhất trên bản đồ
    //     rộng hơn thân của chính nó, và là thứ nhận ra được từ xa nhất.
    //   · HAI TAY VUỐT vươn về phía trước — không con quái nào khác vừa cuộn thân
    //     vừa có chi trước, nên nó không thể bị đọc nhầm thành một con Mãng Xà to.
    //   · VƯƠNG MIỆN BỐN SỪNG thay cho hai sừng cong.
    //   · ĐUÔI CÓ LƯỠI DAO quét ra sau, và một đám TÀN LỬA bay lên từ thân.
    const by = cy + bob;
    const pulse = 0.5 + 0.5 * Math.sin(aTick * 0.13 + u.id);
    // Quầng thần lực — vẽ TRƯỚC mọi thứ để nó là ánh sáng phía sau, không phải một
    // lớp sương phủ lên mặt. Rộng hơn bản cũ vì nó còn phải trùm được cả sải cánh.
    const haloR = S * (1.02 + pulse * 0.20);
    const halo = ctx.createRadialGradient(cx, by, S * 0.1, cx, by, haloR);
    halo.addColorStop(0, 'rgba(183,131,204,0.44)');
    halo.addColorStop(0.55, 'rgba(150,90,190,0.16)');
    halo.addColorStop(1, 'rgba(183,131,204,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, by, haloR, 0, Math.PI * 2);
    ctx.fill();

    // ============================================================
    // ĐƯỜNG SỐNG LƯNG — một cubic bezier, và LÀ NGUỒN SỰ THẬT DUY NHẤT
    // ============================================================
    // Bản nháp đầu của 3.32 đặt dãy gai bằng một công thức riêng ("−0,30 + f·0,52,
    // cộng sin(f·3,1)·0,18") rồi chỉnh tay cho khớp mắt. Nó khớp đúng ở một bộ tỉ
    // lệ, và vừa dày thân từ 0,34 lên 0,40·S là cả dãy gai rơi vào GIỮA lưng — nhìn
    // ra màn hình thành một nắm tam giác trắng vương vãi trên mình con quái chứ
    // không thành sống lưng. Đây đúng họ lỗi "hai công thức cùng mô tả một thứ" đã
    // trả giá nhiều lần trong dự án này (trường dẫn tới cái gần nhất, hộp bấm vs
    // hình vẽ): khi hai bản mô tả cùng tồn tại, bản thứ hai luôn là bản sai.
    // Giờ gai, cánh và đầu đều ĐỌC TOẠ ĐỘ từ chính đường cong này, nên đổi dáng
    // thân bao nhiêu lần cũng không lệch được nữa.
    const B0 = [cx - dir * S * 0.34, by + S * 0.52];
    const B1 = [cx + dir * S * 0.52, by + S * 0.34];
    const B2 = [cx - dir * S * 0.44, by - S * 0.10];
    const B3 = [cx + dir * S * 0.16, by - S * 0.40];
    const bezAt = (t) => {
      const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
      return [a * B0[0] + b * B1[0] + c * B2[0] + d * B3[0],
              a * B0[1] + b * B1[1] + c * B2[1] + d * B3[1]];
    };
    // Pháp tuyến chĩa về phía SAU LƯNG — tức phía ngược với hướng nhìn. Lấy từ tiếp
    // tuyến chứ không đoán: một thân uốn sóng đổi hướng ba lần trên đúng đoạn này.
    const bezNorm = (t) => {
      const m = 1 - t, a = 3 * m * m, b = 6 * m * t, c = 3 * t * t;
      const tx = a * (B1[0] - B0[0]) + b * (B2[0] - B1[0]) + c * (B3[0] - B2[0]);
      const ty = a * (B1[1] - B0[1]) + b * (B2[1] - B1[1]) + c * (B3[1] - B2[1]);
      const L = Math.hypot(tx, ty) || 1;
      let nx = -ty / L, ny = tx / L;
      if (nx * dir > 0) { nx = -nx; ny = -ny; }
      return [nx, ny, tx / L, ty / L];
    };

    // ---- ĐÔI CÁNH ---- vẽ trước thân để thân đè lên gốc cánh: chính chỗ bị che là
    // thứ nói rằng cánh mọc TỪ lưng nó, chứ không phải dán lên hai bên.
    //
    // MÀNG PHẢI TỐI HẲN, và bản nháp đầu đã sai đúng ở đây: nó pha màng 34% về phía
    // màu thân, nên hai cánh và cái thân bệt thành MỘT khối tím duy nhất — con quái
    // đọc ra là một cục, tức là mất trắng cả sải cánh, thứ đắt nhất trong bản vẽ.
    // Ở 12% thì cánh là một bóng tối phía sau và cái thân sáng nổi lên trước nó.
    // Mép sau răng cưa (ba nếp màng) là chi tiết rẻ nhất biến một hình bầu thành
    // một hình dữ — cùng lý lẽ đã viết ở drawRidge.
    // GỐC CÁNH đặt THẤP và LÙI về sau (0,16·S sau lưng, 0,14·S dưới vai) chứ không
    // ngay dưới đầu như bản nháp: ở đó nó trùng đúng chỗ cái đầu vừa được phóng to
    // ngồi lên, nên cánh phía trước bị đầu che gần trọn và con quái chỉ còn MỘT
    // cánh. Một đôi cánh mất một chiếc thì không đọc ra là cánh, nó đọc ra là một
    // mảng tối không rõ của cái gì.
    const flap = Math.sin((aTick + u.id * 7) * 0.15);
    const wsx = cx - dir * S * 0.16, wsy = by - S * 0.14;
    for (const s of [-1, 1]) {
      const span = S * (0.88 + flap * 0.10) * s;
      const rise = S * (0.46 + flap * 0.14);
      ctx.fillStyle = mixHex(spec.dark, spec.color, 0.12);
      ctx.strokeStyle = mixHex(spec.color, '#000000', 0.55);
      ctx.lineWidth = Math.max(1, cs * 0.08);
      ctx.beginPath();
      ctx.moveTo(wsx, wsy);
      ctx.quadraticCurveTo(wsx + span * 0.52, wsy - rise * 1.50, wsx + span, wsy - rise * 0.50);
      ctx.quadraticCurveTo(wsx + span * 0.80, wsy + S * 0.04, wsx + span * 0.66, wsy - S * 0.06);
      ctx.quadraticCurveTo(wsx + span * 0.52, wsy + S * 0.20, wsx + span * 0.38, wsy + S * 0.02);
      ctx.quadraticCurveTo(wsx + span * 0.24, wsy + S * 0.26, wsx, wsy + S * 0.18);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (cs >= 6) {
        // XƯƠNG NGÓN chạy từ gốc cánh TỚI MỘT ĐIỂM NẰM TRÊN CHÍNH MÉP TRƯỚC, lấy
        // bằng cách tính lại đúng cái quadratic vừa vẽ mép ấy. Bản nháp đặt đầu mút
        // bằng một công thức riêng ("0,30 + i·0,18" ngang, "0,50 − i·0,14" dọc) và
        // nó THÒ RA NGOÀI màng — ba vạch sáng lơ lửng cạnh cánh như ba sợi chỉ, vì
        // mép sau của cánh có ba nếp lượn vào trong mà công thức kia không biết.
        // Đây đúng con lỗi "hai công thức cùng tả một đường cong" đã bắt được ở dãy
        // gai lưng trong cùng bản này; lần thứ hai thì chữa bằng cùng một cách.
        const ex0 = wsx, ey0 = wsy;
        const cx1 = wsx + span * 0.52, cy1 = wsy - rise * 1.50;
        const ex1 = wsx + span, ey1 = wsy - rise * 0.50;
        ctx.strokeStyle = mixHex(spec.color, '#ffffff', 0.20);
        ctx.lineWidth = Math.max(0.8, cs * 0.055);
        ctx.beginPath();
        for (const t of [0.40, 0.66, 0.88]) {
          const m = 1 - t;
          ctx.moveTo(ex0, ey0);
          ctx.lineTo(m * m * ex0 + 2 * m * t * cx1 + t * t * ex1,
                     m * m * ey0 + 2 * m * t * cy1 + t * t * ey1);
        }
        ctx.stroke();
      }
    }

    // ---- ĐUÔI ---- quét ra phía sau và tận cùng bằng một LƯỠI DAO. Vẽ trước thân
    // vì gốc đuôi chui vào dưới khúc cuộn dưới cùng.
    const sway = Math.sin((aTick + u.id * 11) * 0.10) * S * 0.10;
    const tipX = cx - dir * S * 0.88, tipY = by + S * 0.22 + sway;
    ctx.strokeStyle = mixHex(spec.dark, spec.color, 0.30);
    ctx.lineWidth = S * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - dir * S * 0.24, by + S * 0.50);
    ctx.quadraticCurveTo(cx - dir * S * 0.68, by + S * 0.60 + sway, tipX, tipY);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#efe0f8';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.06);
    // Lưỡi dao mọc THẲNG từ chót đuôi, theo đúng tiếp tuyến của đường cong ở t=1
    // (hướng ≈ −0,20·S ngang, −0,38·S dọc) — không phải một tam giác đặt cạnh đuôi.
    // Nhỏ hơn bản nháp một phần ba: ở cỡ cũ nó to ngang cái đầu, và hai mũi nhọn
    // cùng cỡ ở hai đầu con vật thì mắt không biết đầu nào là đầu.
    ctx.beginPath();
    ctx.moveTo(tipX + dir * S * 0.04, tipY + S * 0.04);
    ctx.lineTo(tipX - dir * S * 0.11, tipY - S * 0.16);
    ctx.lineTo(tipX - dir * S * 0.01, tipY + S * 0.06);
    ctx.closePath(); ctx.fill();
    if (cs >= 8) ctx.stroke();

    // ---- THÂN CUỘN ---- một dải uốn sóng đi từ đuôi lên đầu, vẽ bằng đường viền
    // dày chứ không bằng đa giác — nét dày cho ra một thân TRÒN mà không phải tính
    // hai mép. Dày hơn bản cũ (0,34 -> 0,42·S) để nó chịu nổi sải cánh phía sau:
    // một thân mảnh giữa hai cánh to đọc ra là con dơi, không phải con rồng.
    ctx.strokeStyle = spec.dark;                       // viền tối vẽ TRƯỚC, nét to hơn
    ctx.lineWidth = S * 0.42 + Math.max(2, cs * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(B0[0], B0[1]);
    ctx.bezierCurveTo(B1[0], B1[1], B2[0], B2[1], B3[0], B3[1]);
    ctx.stroke();
    ctx.strokeStyle = hide;
    ctx.lineWidth = S * 0.42;
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.lineWidth = lw;

    // ---- VÂY LƯNG ---- mười gai bám ĐÚNG mép sau của thân: chân gai đặt ở
    // `nửa bề dày thân` dọc theo pháp tuyến, hai chân lệch nhau dọc theo tiếp
    // tuyến. Nhờ vậy gai luôn vuông góc với thân và luôn mọc ra NGOÀI đường bao —
    // đó là toàn bộ việc của một cái gai, và là thứ bản chép-tay-toạ-độ không giữ
    // được. Cao dần về phía đầu, và mỗi gai có viền tối: không viền thì ở cỡ nhỏ
    // cả dãy bệt thành một vệt sáng liền, tức là đường bao trơn trở lại.
    ctx.fillStyle = '#e8cef7';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(0.8, cs * 0.06);
    for (let i = 0; i < 10; i++) {
      const t = 0.05 + (i / 9) * 0.92;
      const [sx, sy] = bezAt(t);
      const [nx, ny, ux, uy] = bezNorm(t);
      const bx0 = sx + nx * S * 0.19, by0 = sy + ny * S * 0.19;
      const gh = S * (0.12 + t * 0.18), hw = S * 0.085;
      ctx.beginPath();
      ctx.moveTo(bx0 - ux * hw, by0 - uy * hw);
      ctx.lineTo(bx0 + nx * gh - ux * hw * 0.3, by0 + ny * gh - uy * hw * 0.3);
      ctx.lineTo(bx0 + ux * hw, by0 + uy * hw);
      ctx.closePath();
      ctx.fill();
      if (cs >= 8) ctx.stroke();
    }

    // ---- HAI TAY VUỐT ---- vươn về phía đang nhìn. Đây là chi tiết tách nó khỏi
    // MỌI con quái khác: không con nào vừa cuộn thân vừa có chi trước.
    const grasp = Math.sin((aTick + u.id * 5) * 0.18) * S * 0.05;
    for (const s of [-1, 1]) {
      const ax = cx + dir * S * 0.02, ay = by - S * (0.14 - s * 0.12);
      const ex = cx + dir * S * (0.46 + s * 0.06) + grasp, ey = by + S * (0.04 + s * 0.16);
      ctx.strokeStyle = spec.dark;                     // viền tối trước, cùng thủ pháp thân
      ctx.lineWidth = S * 0.12 + Math.max(1.4, cs * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx + dir * S * 0.34, by - S * (0.08 - s * 0.16), ex, ey);
      ctx.stroke();
      ctx.strokeStyle = hide;
      ctx.lineWidth = S * 0.12;
      ctx.stroke();
      // VUỐT NGẮN VÀ DÀY. Bản nháp để dài 0,24·S với nét mảnh cs·0,07 — tỉ lệ dài
      // trên dày quá lớn nên ba cái móng đọc ra thành ba SỢI RÂU bay lơ lửng khỏi
      // bàn tay. Móng vuốt là một thứ NGẮN, DÀY và CONG; cắt còn nửa chiều dài thì
      // chính tỉ lệ ấy nói ra điều đó mà không cần thêm nét nào.
      if (cs >= 6) drawClaws(ex, ey, Math.PI * (s > 0 ? 0.12 : -0.18), S * 0.13, dir, cs, '#efe0f8');
    }
    ctx.lineCap = 'butt';
    ctx.lineWidth = lw;

    // ---- ĐẦU ---- neo vào ĐẦU MÚT của đường sống lưng (B3) chứ không vào một toạ
    // độ riêng, cùng lý do đã viết ở khối bezier: đổi dáng thân thì cái đầu đi theo.
    //
    // TO HẲN so với bản nháp đầu (dài 0,40 -> 0,62·S). Sự dữ tợn sống ở cái ĐẦU, và
    // ở bản trước cái đầu chỉ bằng một khúc thân — nhìn ra màn hình con quái đọc
    // thành "con giun tím có cánh". Có GÒ MÀY nhô hẳn ra trên hốc mắt: đúng cái gờ
    // đó biến một cái đầu thằn lằn thành một cái đầu đang quắc, cùng lý lẽ đã viết
    // cho cặp lông mày ở monsterEyes.
    // Hình đầu là một CÁI NÊM: sọ rộng ở gáy, thuôn dần ra chóp mũi, cộng một gò
    // mày gãy góc. Bản nháp cho nó sáu cạnh gần đều nhau và bo góc bằng nét dày
    // 0,14·cs — ra một khối sáu cạnh tròn cạnh, đọc thành CÁI MŨ SẮT chứ không
    // thành cái đầu. Thứ nói "đầu thú" là chênh lệch bề rộng giữa gáy và mũi, và
    // `lineJoin: miter` để mấy góc còn là góc.
    const hx = B3[0] + dir * S * 0.06, hy = B3[1] - S * 0.06;
    ctx.fillStyle = hide;
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(1.2, cs * 0.10);
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(hx - dir * S * 0.28, hy - S * 0.04);     // gáy
    ctx.lineTo(hx - dir * S * 0.06, hy - S * 0.22);     // đỉnh sọ
    ctx.lineTo(hx + dir * S * 0.13, hy - S * 0.17);     // gò mày nhô ra trên hốc mắt
    ctx.lineTo(hx + dir * S * 0.40, hy - S * 0.01);     // chóp mũi
    ctx.lineTo(hx + dir * S * 0.35, hy + S * 0.11);
    ctx.lineTo(hx + dir * S * 0.02, hy + S * 0.22);     // góc hàm dưới
    ctx.lineTo(hx - dir * S * 0.26, hy + S * 0.13);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineJoin = 'round';

    // ---- VƯƠNG MIỆN BỐN SỪNG ---- hai sừng lớn quét ngược ra sau gáy + hai sừng
    // nhỏ chĩa lên. KHỐI THUÔN chứ không phải nét vẽ, và bản nháp đầu đã sai đúng
    // chỗ đó: ở mức thu phóng chơi thật một nét dày 0,13·cs đọc ra là sợi râu, không
    // đọc ra là sừng — thứ nói "sừng" là cái gốc DÀY thuôn dần về mũi nhọn.
    //
    // NGẮN LẠI so với bản nháp (0,56 -> 0,34·S). Ở chiều dài cũ cặp sừng dài gần
    // bằng nửa thân và hai đầu mút toả ra hai hướng rất khác nhau, nên cả cụm đọc ra
    // là một TIA CHỚP trắng cắm trên đầu chứ không phải một cặp sừng. Một cặp sừng
    // được nhận ra nhờ nó ĐỐI XỨNG và ÔM lấy sọ, không nhờ nó dài.
    ctx.fillStyle = '#efe0f8';
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = Math.max(0.9, cs * 0.07);
    for (const s of [-1, 1]) {
      const rx = hx - dir * S * 0.08, ry = hy - S * (0.13 + s * 0.02);
      const tx2 = hx - dir * S * (0.34 + s * 0.05), ty2 = hy - S * (0.32 + s * 0.12);
      ctx.beginPath();
      ctx.moveTo(rx, ry - S * 0.06);
      ctx.quadraticCurveTo(hx - dir * S * 0.24, hy - S * (0.34 + s * 0.09), tx2, ty2);
      ctx.quadraticCurveTo(hx - dir * S * 0.20, hy - S * (0.22 + s * 0.07), rx, ry + S * 0.06);
      ctx.closePath(); ctx.fill();
      if (cs >= 7) ctx.stroke();
    }
    for (const s of [0, 1]) {                          // hai sừng nhỏ chĩa lên
      const bx0 = hx - dir * S * (0.02 + s * 0.12);
      ctx.beginPath();
      ctx.moveTo(bx0 - S * 0.045, hy - S * 0.15);
      ctx.lineTo(bx0 - dir * S * 0.05, hy - S * (0.34 - s * 0.07));
      ctx.lineTo(bx0 + S * 0.045, hy - S * 0.15);
      ctx.closePath(); ctx.fill();
    }
    // MÕM PHẢI NẰM TRONG CÁI ĐẦU. Bản nháp đặt mõm rộng 0,32·S bắt đầu ở +0,14·S,
    // tức mép ngoài chạm 0,46·S trong khi chóp mũi của khối đầu chỉ tới 0,36·S —
    // nên hàm răng thò hẳn ra ngoài đường bao và đọc thành một cái LƯỢC trắng dán
    // cạnh mặt. Cùng họ lỗi "hai hình cùng tả một thứ mà không đọc chung một nguồn"
    // đã bắt được ở dãy gai ngay trên: giờ cả hai số đều suy từ chóp mũi 0,36·S.
    drawMaw(hx + dir * S * 0.08, hy + S * 0.04, S * 0.25, S * 0.17, open, dir, spec.dark, cs);

    // ---- TÀN LỬA ---- bốn đốm bay lên men theo thân, pha lệch nhau. Nguồn sáng
    // duy nhất trên bản đồ không đến từ mặt trời, và đây là thứ khiến con quái
    // trông như đang CHÁY chứ không chỉ đang phát sáng. Bốn chứ không sáu, và toàn
    // sắc ẤM: bản sáu đốm hai màu rắc thêm chấm tím lên một con quái vốn đã tím,
    // nên nửa số đốm biến thành nhiễu trên chính thân nó.
    // Điểm xuất phát lấy TRÊN sống lưng rồi đẩy ra ngoài theo pháp tuyến — cùng
    // nguồn toạ độ với dãy gai. Bản nháp thả chúng dọc một đường thẳng qua giữa
    // thân, nên bốn đốm lửa nằm ĐÈ LÊN mình con quái và đọc ra thành bốn nốt tàn
    // nhang cam, không ra thành tàn lửa bay lên.
    if (cs >= 6) {
      for (let i = 0; i < 4; i++) {
        const ph = ((aTick * 0.018 + i * 0.29 + u.id * 0.11) % 1);
        const [ox, oy] = bezAt(0.12 + i * 0.24);
        const [nx, ny] = bezNorm(0.12 + i * 0.24);
        const ex = ox + nx * S * 0.42 + Math.sin(ph * 6.0 + i) * S * 0.10;
        const ey = oy + ny * S * 0.42 - ph * S * 0.95;
        ctx.globalAlpha = (1 - ph) * 0.7;
        ctx.fillStyle = i % 2 ? '#ffcf7a' : '#ff9d54';
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(0.8, cs * 0.085 * (1 - ph * 0.5)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // TRẢ LẠI TRẠNG THÁI MẶC ĐỊNH của ngữ cảnh vẽ. Nhánh này là nhánh duy nhất
    // trong drawMonster đụng tới `lineJoin`, và bản 3.30 đặt nó thành 'round' rồi
    // bỏ đấy — mọi hình vẽ sau đó trong cùng khung hình đều thừa hưởng, im lặng.
    // Chưa ai thấy vì Thiên Ma hiếm khi có mặt; đó đúng là loại rò rỉ chỉ lộ ra
    // vào ngày nó có mặt.
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.lineWidth = lw;
    eyeX = hx + dir * S * 0.10; eyeY = hy - S * 0.03;
    eyeOpt = { spread: 0.05, r: 0.10, color: '#ffe08a', glow: 'rgba(255,150,40,0.95)' };

  } else {
    // QUỶ ĐÁ (troll). Bản 3.7 là hình thoi có sừng — hình quen mặt nhất của cả
    // bảng, nên nó được giữ làm KHỐI CHÍNH (đổi hẳn đi thì người xem cũ mất mốc
    // so sánh), nhưng giờ có thêm thân người khom, hai tay dài quét đất, và
    // những phiến đá gai trên lưng. Tên nó là Quỷ ĐÁ mà suốt bốn phiên bản trên
    // người nó không có lấy một hòn đá nào.
    const by = cy + bob;
    ctx.strokeStyle = spec.dark; ctx.lineWidth = Math.max(1.8, cs * 0.16);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {                         // chân trụ
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.16, by + S * 0.2);
      ctx.lineTo(cx + s * S * 0.24, by + S * 0.56);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = hide; ctx.lineWidth = lw;
    ctx.beginPath();                                   // khối thân hình thoi
    ctx.moveTo(cx, by - S * 0.54);
    ctx.lineTo(cx + S * 0.46, by + S * 0.02);
    ctx.lineTo(cx + S * 0.2, by + S * 0.44);
    ctx.lineTo(cx - S * 0.2, by + S * 0.44);
    ctx.lineTo(cx - S * 0.46, by + S * 0.02);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawRidge(cx - S * 0.4, by - S * 0.1, cx + S * 0.4, by - S * 0.1,
              4, S * 0.26, mixHex(spec.color, '#000000', 0.25), spec.dark, cs);
    ctx.fillStyle = hide;
    ctx.beginPath();                                   // hai tay dài quét đất
    for (const s of [-1, 1]) {
      const sw = Math.sin((aTick + u.id * 9) * 0.22 + (s > 0 ? 0 : 1.6)) * 0.16;
      ctx.moveTo(cx + s * S * 0.34, by - S * 0.14);
      ctx.lineTo(cx + s * S * (0.56 + sw), by + S * 0.3);
      ctx.lineTo(cx + s * S * (0.42 + sw), by + S * 0.36);
      ctx.lineTo(cx + s * S * 0.22, by - S * 0.08);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (cs >= 7) for (const s of [-1, 1]) {
      drawClaws(cx + s * S * 0.5, by + S * 0.34, Math.PI * 0.42, S * 0.18, s, cs, '#cdd3cf');
    }
    ctx.strokeStyle = '#c9bcd6';                       // hai sừng
    ctx.lineWidth = Math.max(1.2, cs * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.22, by - S * 0.42); ctx.lineTo(cx - S * 0.4, by - S * 0.76);
    ctx.moveTo(cx + S * 0.22, by - S * 0.42); ctx.lineTo(cx + S * 0.4, by - S * 0.76);
    ctx.stroke();
    ctx.lineCap = 'butt';
    drawMaw(cx + dir * S * 0.04, by - S * 0.2, S * 0.24, S * 0.22, open, dir, spec.dark, cs);
    eyeX = cx; eyeY = by - S * 0.32;
    eyeOpt = { spread: 0.13, r: 0.09 };
  }

  // Mắt vẽ SAU CÙNG, một cửa duy nhất cho cả 12 loài. Mỗi nhánh ở trên chỉ đặt
  // toạ độ và tuỳ chọn rồi thôi — nếu để mỗi nhánh tự vẽ mắt thì 12 bản chép của
  // cùng một đoạn, và lần chỉnh sau sẽ chỉ chỉnh được vài bản trong số đó.
  if (cs >= 8 || (cs >= 5 && S > cs * 1.6)) monsterEyes(eyeX, eyeY, S, cs, eyeOpt || {});

  // Bị trúng độc thì hiện thêm một chấm xanh nhỏ trên đầu — không có dấu hiệu này
  // thì "quân tự tụt máu sau khi đã thắng trận" trông y hệt một con bug.
  if (u.venomUntil > tick && cs >= 8) {
    ctx.fillStyle = '#8fae52';
    ctx.beginPath(); ctx.arc(cx, cy - S * 0.75 + bob, Math.max(1, cs * 0.11), 0, Math.PI * 2); ctx.fill();
  }

  if (u.hp < u.maxHp) {
    const w = S * 1.05, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = '#a86ac6';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// Ba cấp hang có ba bảng màu riêng. Cấp không được phép chỉ là một con số trong
// bảng thông tin: nếu người xem không NHÌN THẤY cái hang đang già đi thì cơ chế
// nuôi hang chỉ là một cột số, và câu chuyện "vạt rừng đó mỗi năm một dữ hơn"
// không bao giờ được kể ra.
const LAIR_TIER_SKIN = [
  { rock: '#2a1f3d', edge: '#7e57c2', glow: '126,87,194', scale: 3.0 },
  { rock: '#3a1030', edge: '#a86ac6', glow: '186,104,200', scale: 3.6 },
  { rock: '#3d0d15', edge: '#e04b32', glow: '244,67,54',   scale: 4.4 }
];
function lairSkin(l) { return LAIR_TIER_SKIN[clamp((l.tier || 1) - 1, 0, 2)]; }

function drawLair(l, px, py, cs) {
  const skin = lairSkin(l);
  const S = cs * skin.scale;
  drawShadow(px + cs / 2, py + cs * 0.9, S * 0.42, S * 0.18);
  // Quầng thở đều: dấu hiệu "vùng đất nguy hiểm" nhìn từ xa. Đây là thứ khiến
  // người xem tự thấy được vì sao một bộ lạc lại vòng tránh cả một vạt rừng giàu gỗ.
  // Bán kính lấy theo CẤP của chính cái hang này, không phải hằng số toàn cục —
  // đó là toàn bộ điểm của việc cho hang lớn lên: vòng nguy hiểm phải nở ra thật.
  const pulse = 0.5 + 0.5 * Math.sin(aTick * 0.05 + l.id);
  const R = lairRoam(l) * cs;
  const grad = ctx.createRadialGradient(px + cs / 2, py + cs / 2, 0, px + cs / 2, py + cs / 2, R);
  grad.addColorStop(0, `rgba(${skin.glow},${0.16 + (l.tier - 1) * 0.05})`);
  grad.addColorStop(0.65, `rgba(${skin.glow},0.06)`);
  grad.addColorStop(1, `rgba(${skin.glow},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, R, 0, Math.PI * 2); ctx.fill();

  const cx = px + cs / 2, cy = py + cs / 2;
  // Gai đá mọc thêm theo cấp — bóng dáng cái hang tự nói ra nó đã già cỡ nào.
  if (l.tier > 1) {
    ctx.fillStyle = skin.rock;
    ctx.strokeStyle = skin.edge;
    ctx.lineWidth = Math.max(1, cs * 0.12);
    const spikes = l.tier === 2 ? 4 : 7;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + l.id * 0.7;
      const bx = cx + Math.cos(a) * S * 0.52, by = cy + S * 0.22 + Math.sin(a) * S * 0.2;
      const h = S * (0.3 + 0.18 * ((i + l.id) % 3));
      ctx.beginPath();
      ctx.moveTo(bx - S * 0.1, by); ctx.lineTo(bx, by - h); ctx.lineTo(bx + S * 0.1, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = skin.rock;
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.5, cy + S * 0.35);
  ctx.quadraticCurveTo(cx, cy - S * 0.55, cx + S * 0.5, cy + S * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = skin.edge;
  ctx.lineWidth = Math.max(1.5, cs * 0.16);
  ctx.stroke();
  // Miệng hang tối om, có ánh mắt đỏ nhấp nháy bên trong.
  ctx.fillStyle = '#0a0710';
  ctx.beginPath();
  ctx.ellipse(cx, cy + S * 0.2, S * 0.26, S * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,82,82,${0.35 + 0.5 * pulse})`;
  ctx.beginPath(); ctx.arc(cx - S * 0.08, cy + S * 0.2, Math.max(1, cs * 0.1), 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + S * 0.08, cy + S * 0.2, Math.max(1, cs * 0.1), 0, Math.PI * 2); ctx.fill();

  const w = S * 0.95, h = Math.max(2, cs * 0.15);
  const r = clamp(l.hp / l.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(cx - w / 2, py - cs * 0.9, w, h);
  ctx.fillStyle = skin.edge;
  ctx.fillRect(cx - w / 2, py - cs * 0.9, w * r, h);

  // Thanh NUÔI nằm ngay dưới thanh máu: người xem thấy được cái hang đang tiến
  // tới cấp sau nhanh cỡ nào, tức là thấy được cái giá của việc bỏ mặc nó. Thiếu
  // thanh này thì mỗi lần lên cấp là một cú giật bất ngờ không có báo trước, và
  // người xem không bao giờ liên hệ được nó với số lính mình vừa mất ở đó.
  const nextAt = CONFIG.MONSTER.FEED.TIER_AT[l.tier];
  if (nextAt !== undefined && cs >= 5) {
    const prevAt = CONFIG.MONSTER.FEED.TIER_AT[l.tier - 1] || 0;
    const fr = clamp((l.feed - prevAt) / (nextAt - prevAt), 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py - cs * 0.9 + h + 1, w, Math.max(1.5, h * 0.6));
    ctx.fillStyle = '#e0a825';
    ctx.fillRect(cx - w / 2, py - cs * 0.9 + h + 1, w * fr, Math.max(1.5, h * 0.6));
  }

  if (cs >= 6) {
    queueLabel(lairTierSpec(l).name, cx, py - cs * 1.3,
               `600 ${Math.max(9, Math.round(cs * 1.2))}px ${F_UI}`, skin.edge, 1);
  }
}

function drawGroundItem(it, px, py, cs) {
  const spec = CONFIG.ITEM.TYPES[it.key];
  const float = Math.sin((aTick + it.id * 11) * 0.12) * cs * 0.25;
  const cx = px + cs / 2, cy = py + cs / 2 + float;
  const age = tick - it.born;
  // Nhấp nháy nhanh dần khi sắp tan biến — người xem biết mình sắp mất món đồ.
  const dying = age > CONFIG.ITEM.LIFETIME - 400;
  if (dying && Math.floor(aTick / 8) % 2 === 0) return;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs * 1.6);
  glow.addColorStop(0, spec.color + '66');
  glow.addColorStop(1, spec.color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, cs * 1.6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = spec.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - cs * 0.5);
  ctx.lineTo(cx + cs * 0.42, cy);
  ctx.lineTo(cx, cy + cs * 0.5);
  ctx.lineTo(cx - cs * 0.42, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (cs >= 9) {
    ctx.textAlign = 'center';
    ctx.font = `${Math.round(cs * 0.9)}px -apple-system, Segoe UI, sans-serif`;
    ctx.fillText(spec.icon, cx, cy + cs * 0.32);
  }
}

// Hào quang chỉ huy vẽ RIÊNG một lượt, trước mọi đơn vị — nếu vẽ trong drawUnit
// thì vòng tròn bán kính 10 ô sẽ đè lên chính đám lính đứng trong nó.
function drawHeroAuras(cs) {
  for (const u of units) {
    if (u.type !== 'hero' || u.commandMult <= 1.001) continue;
    const [px, py] = worldToPx(uRX(u), uRY(u));
    if (!inView(px, py, u.auraR * cs + cs * 2)) continue;
    const cx = px + cs / 2, cy = py + cs / 2;
    const t = tribes[u.tribeId];
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, u.auraR * cs);
    grad.addColorStop(0, t.color + '00');
    grad.addColorStop(0.72, t.color + '00');
    grad.addColorStop(1, t.color + '38');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, u.auraR * cs, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -aTick * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, u.auraR * cs, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

// VÒNG TIẾP TẾ của trại. Vẽ ở lượt MẶT ĐẤT, cùng chỗ với hào quang chỉ huy, chứ
// không vẽ trong drawBuilding — và lý do là thứ tự chiều sâu: drawBuilding chạy
// giữa danh sách đã sắp theo chân, nên một vòng tròn tô ở đó sẽ phủ lên mọi người
// lính đã được vẽ phía trên nó. Cái vòng này là MẶT ĐẤT, và mặt đất thì phải nằm
// dưới tất cả.
//
// Hai lớp, và cả hai đều mang thông tin chứ không phải trang trí: vành tô loang
// nói "tới đây là hết tầm", còn vòng nét đứt CHẠY (lineDashOffset theo aTick) nói
// "cái trại này còn sống". Ở đúng lúc nó sắp hết hạn thì cả hai mờ dần đi — người
// xem đọc được cái đồng hồ mà không cần một con số nào.
function drawCampRings(cs) {
  for (const b of buildings) {
    if (b.type !== 'camp' || b.hp <= 0 || !b.done) continue;
    const t = tribes[b.tribeId];
    if (!t) continue;
    const R = supplyStats(t).reach;
    const [px, py] = worldToPx(b.x, b.y);
    if (!inView(px, py, R * cs + cs * 2)) continue;
    const cx = px + cs / 2, cy = py + cs / 2;
    // Mờ dần trong 260 tick cuối đời. Không tắt phụt: một cái trại biến mất không
    // báo trước đọc ra là một lỗi, còn một cái trại nhạt dần đọc ra là hết lương.
    const left = (b.expireAt || 0) - tick;
    const fade = clamp(left / 260, 0.15, 1);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * cs);
    grad.addColorStop(0, '#d8b25c00');
    grad.addColorStop(0.66, '#d8b25c00');
    grad.addColorStop(1, '#d8b25c2e');
    ctx.globalAlpha = fade;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R * cs, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d8b25c';
    ctx.globalAlpha = 0.34 * fade;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -aTick * 0.2;
    ctx.beginPath(); ctx.arc(cx, cy, R * cs, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------
// Hiệu ứng
// ------------------------------------------------------------
// Một NHÁT CHÉM = một nét bút. Trong sơn mài, đường kiếm không phải một sợi
// chỉ thẳng nối hai chấm — nó là một vệt lưỡi liềm, phồng ở giữa, nhọn ở hai
// đầu, như cú vẩy của một ngọn bút lông. Dựng bằng hai đường bậc hai: mép dẫn
// (phía trước cú vung) phồng ra, mép sau lượn nhẹ trở về; giữa chúng là thân
// lưỡi. Toạ độ dựng trong hệ CỤC BỘ (u dọc theo trục hai mũi, v theo hướng
// đánh) rồi xoay về hướng thật — nhờ vậy một hàm lo được nhát chém ở mọi góc.
function strokeCrescent(cx, cy, ang, L, B, color, alpha) {
  const s = Math.sin(ang), c = Math.cos(ang);
  const P = (u, v) => [cx - u * s + v * c, cy + u * c + v * s];
  const [p0x, p0y] = P(-L, 0);
  const [p1x, p1y] = P(L, 0);
  const [ocx, ocy] = P(0, B);          // mép dẫn — cạnh sáng của lưỡi
  const [icx, icy] = P(0, B * 0.42);   // mép sau — thân lưỡi lượn về
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  ctx.quadraticCurveTo(ocx, ocy, p1x, p1y);
  ctx.quadraticCurveTo(icx, icy, p0x, p0y);
  ctx.fill();
}

function drawFx(f, cs) {
  const t = f.life / f.maxLife;
  const PI2 = Math.PI * 2;
  if (f.type === 'slash') {
    // Nét chém cong, tâm đặt ~70% quãng đường về phía mục tiêu — nơi lưỡi thật
    // sự chạm vào. Hai lớp: một vệt MÀU PHE mềm (bột màu của cú đánh) và một
    // LÕI XƯƠNG SÁNG mảnh hơn nằm trong — cùng cách một nét sơn mài có lớp son
    // lót và lớp bạc phủ. Vung lớn dần trong một phần tư đời rồi cả nhát tàn đi.
    const [ax, ay] = worldToPx(f.x1 + 0.5, f.y1 + 0.5);
    const [bx, by] = worldToPx(f.x2 + 0.5, f.y2 + 0.5);
    const ang = Math.atan2(by - ay, bx - ax);
    const cx = ax + (bx - ax) * 0.72, cy = ay + (by - ay) * 0.72;
    const grow = Math.min(1, (1 - t) / 0.3);
    const L = cs * (0.72 + 0.5 * grow);
    const B = cs * (0.46 + 0.32 * grow);
    strokeCrescent(cx, cy, ang, L * 1.12, B * 1.16, f.color, t * 0.5);
    strokeCrescent(cx, cy, ang, L * 0.88, B * 0.76, '#f3ead2', t * 0.92);
    // Ánh loé tại điểm chạm, chỉ mấy khung đầu — cái chấm sáng nói "trúng ở đây".
    if (t > 0.5) {
      ctx.globalAlpha = (t - 0.5) / 0.5;
      ctx.fillStyle = '#fff6e6';
      ctx.beginPath(); ctx.arc(bx, by, cs * 0.32 * ((t - 0.5) / 0.5), 0, PI2); ctx.fill();
    }
  } else if (f.type === 'death') {
    // Cái chết = bột màu VĂNG RA. Một quầng màu phe loang rộng rồi tắt, và những
    // mảnh sắc tố bắn tung theo hình nan quạt rồi RƠI xuống theo trọng lực — như
    // sơn được hất khỏi đầu bút. Đây là thứ cho một cú hạ gục sức nặng: trước
    // đó, quân biến mất lặng lẽ giữa đám đông và mắt không kịp ghi nhận ai vừa ngã.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const prog = 1 - t, sc = f.scale || 1;
    ctx.globalAlpha = t * 0.5;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(1, cs * 0.2) * t;
    // Math.max(0,…): bán kính âm ném IndexSizeError và làm HỎNG cả khung hình,
    // không chỉ hiệu ứng này — một cái chốt rẻ để một FX lệch giờ không kéo sập
    // toàn bộ bản vẽ.
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, prog * cs * 1.9 * sc), 0, PI2); ctx.stroke();
    ctx.globalAlpha = t;
    ctx.fillStyle = f.color;
    const nD = 8;
    for (let i = 0; i < nD; i++) {
      const a = (i / nD) * PI2 + f.seed;
      const sp = 0.55 + hash01(i, f.seed) * 0.85;
      const d = prog * cs * 2.3 * sc * sp;
      const fall = prog * prog * cs * 1.3 * sc;   // trọng lực kéo mảnh vỡ rơi
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + fall, cs * 0.17 * sc * t + 0.5, 0, PI2);
      ctx.fill();
    }
  } else if (f.type === 'arrow') {
    // Mũi tên bay: nội suy vị trí theo phần đời đã trôi qua.
    const p = 1 - t;
    const ax = f.x1 + (f.x2 - f.x1) * p, ay = f.y1 + (f.y2 - f.y1) * p;
    const [x, y] = worldToPx(ax + 0.5, ay + 0.5);
    const ang = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#f0cda6';
    ctx.lineWidth = Math.max(1, cs * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * cs * 0.5, y - Math.sin(ang) * cs * 0.5);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (f.type === 'bolt') {
    // MŨI LAO XUYÊN của nỏ thần. Khác 'arrow' ở đúng một điểm, và điểm đó là cả
    // cơ chế: nó vẽ TRỌN đoạn thẳng từ người bắn tới hết tầm xuyên, không vẽ một
    // mũi tên nhỏ đang bay dọc đoạn đó. Người xem phải thấy CÁI ĐƯỜNG, vì cái
    // đường mới là thứ quyết định ai trúng — mọi kẻ địch nằm trên nó đều dính đòn.
    // Một chấm đang bay chỉ nói "có bắn"; một vạch sáng nói "cả hàng này vừa ăn đạn".
    const [x1, y1] = worldToPx(f.x1 + 0.5, f.y1 + 0.5);
    const [x2, y2] = worldToPx(f.x2 + 0.5, f.y2 + 0.5);
    // Loé mạnh rồi tắt nhanh. `t` = life/maxLife nên nó chạy 1 -> 0 theo tuổi;
    // bình phương nó cho một cú chớp dứt khoát thay vì một vệt nhạt dần đều —
    // vệt nhạt đều trông như khói, mà đây là một mũi lao.
    ctx.globalAlpha = 0.9 * t * t;
    ctx.strokeStyle = '#f6e7c0';
    ctx.lineWidth = Math.max(1.2, cs * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = f.color || '#d8a544';        // lõi màu bộ lạc: đọc ra của ai
    ctx.lineWidth = Math.max(0.8, cs * 0.09);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (f.type === 'rock') {
    // Đạn đá bay theo VÒNG CUNG, không phải đường thẳng. Đây là khác biệt duy nhất
    // giữa "bắn" và "ném" mà mắt đọc được, và nó đáng giá vì nó nói đúng luật chơi:
    // máy bắn đá bắn qua đầu quân nhà, mũi tên thì không.
    const p = 1 - t;
    const ax = f.x1 + (f.x2 - f.x1) * p, ay = f.y1 + (f.y2 - f.y1) * p;
    const lift = Math.sin(p * Math.PI) * dist(f.x1, f.y1, f.x2, f.y2) * 0.22;
    const [x, y] = worldToPx(ax + 0.5, ay + 0.5 - lift);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#8c8f89';
    ctx.beginPath(); ctx.arc(x, y, cs * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x - cs * 0.1, y - cs * 0.1, cs * 0.13, 0, Math.PI * 2); ctx.fill();
    // Bóng đổ dưới đất chạy theo — thiếu nó thì quả đá trông như đang trượt ngang
    // trên mặt cỏ chứ không phải bay trên trời.
    const [sx, sy] = worldToPx(ax + 0.5, ay + 0.5);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, sy, cs * 0.3, cs * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  } else if (f.type === 'offering') {
    // Tế phẩm: khói vàng bốc lên từ nóc đền. Nhỏ và thường xuyên — nó không phải
    // một sự kiện, nó là NHỊP SỐNG của một bộ lạc sùng đạo, và mắt phải đọc được
    // "bên này thờ cúng nhiều hơn bên kia" mà không cần nhìn bảng số nào.
    const p = 1 - t;
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    ctx.globalAlpha = t * 0.8;
    ctx.fillStyle = '#d8a544';
    for (let i = 0; i < 3; i++) {
      const ph = (p + i * 0.33) % 1;
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 6 + i) * cs * 0.5, y - cs * (1.4 + ph * 2.6), cs * (0.16 + ph * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === 'blessing') {
    // Phước lành: cột sáng từ trời rơi xuống + vòng sáng loang ra. Cố tình vẽ
    // NGƯỢC hướng với tế phẩm (trên xuống, thay vì dưới lên) — hai chiều đó là
    // cách rẻ nhất để hình ảnh nói ra chính cái vòng lặp đang diễn ra.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const p = 1 - t;
    ctx.globalAlpha = t * 0.55;
    const grd = ctx.createLinearGradient(0, y - cs * 30, 0, y);
    grd.addColorStop(0, 'rgba(255,241,118,0)');
    grd.addColorStop(1, 'rgba(255,241,118,0.85)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - cs * 1.6, y - cs * 30, cs * 3.2, cs * 30);
    ctx.globalAlpha = t * 0.9;
    ctx.strokeStyle = '#f7e3a8';
    ctx.lineWidth = Math.max(1.5, cs * 0.3) * t;
    ctx.beginPath(); ctx.ellipse(x, y, p * cs * 9, p * cs * 3.6, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === 'ageup') {
    // Lên thời đại: vòng sáng nở ra từ kinh đô. Trước bản này việc lên thời đại
    // chỉ có một dòng chữ trong nhật ký — sự kiện lớn nhất của nửa đầu kỷ nguyên
    // mà không có gì xảy ra trên màn hình.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const p = 1 - t;
    ctx.globalAlpha = t * 0.85;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(1.5, cs * 0.35) * t;
    ctx.beginPath(); ctx.arc(x, y, p * cs * 11, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d8a544';
    ctx.lineWidth = Math.max(1, cs * 0.2) * t;
    ctx.beginPath(); ctx.arc(x, y, p * cs * 7, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === 'spark') {
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    const prog = 1 - t;
    if (f.dir !== undefined) {
      // ĐÒN TRÚNG. Một chớp trắng nóng ở tâm + những tia mảnh bắn TỚI TRƯỚC theo
      // hướng đánh (nan quạt hẹp quanh f.dir), thon như tia lửa nảy khi thép chạm
      // thép. Đây là thứ tách "một cú va chạm" khỏi "một đốm sáng lơ lửng".
      ctx.globalAlpha = t * 0.9;
      ctx.fillStyle = '#fff3df';
      ctx.beginPath(); ctx.arc(x, y, cs * 0.24 * t + 0.6, 0, PI2); ctx.fill();
      ctx.globalAlpha = t;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = Math.max(1, cs * 0.13) * t;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const nS = 5, seed = f.seed || 1;
      for (let i = 0; i < nS; i++) {
        const a = f.dir + (i / (nS - 1) - 0.5) * 1.5 + (hash01(i, seed) - 0.5) * 0.5;
        const d0 = prog * cs * 0.45, d1 = prog * cs * (1.0 + hash01(i + 3, seed) * 0.8);
        ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
        ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      // Đốm lấp lánh vô hướng: dùng cho lúc hái lượm, quái mới nở… — không phải
      // va chạm, nên giữ nhẹ như bản cũ, chỉ bốn chấm toả tròn.
      ctx.globalAlpha = t;
      ctx.fillStyle = f.color;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI2 + f.life;
        const d = prog * cs * 1.1;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cs * 0.14 * t + 0.5, 0, PI2);
        ctx.fill();
      }
    }
  } else if (f.type === 'boom') {
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    ctx.globalAlpha = t * 0.8;
    ctx.strokeStyle = '#e09a3c';
    ctx.lineWidth = Math.max(1.5, cs * 0.3) * t;
    ctx.beginPath();
    ctx.arc(x, y, (1 - t) * cs * f.r * 2.4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (f.type === 'bolt') {
    // Tia sét của Chúa Tể: đường gãy khúc từ trên trời xuống.
    const [x, y] = worldToPx(f.x + 0.5, f.y + 0.5);
    ctx.globalAlpha = t;
    ctx.strokeStyle = '#f7e3a8';
    ctx.lineWidth = Math.max(2, cs * 0.4);
    ctx.beginPath();
    ctx.moveTo(x, y - cs * 30);
    for (let i = 1; i <= 6; i++) {
      ctx.lineTo(x + (hash01(i, f.seed) - 0.5) * cs * 3, y - cs * 30 + (cs * 30 * i) / 6);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------
// Lãnh thổ
// ------------------------------------------------------------
function renderTerritory(cs) {
  if (!territoryOwner) return;
  const C = CONFIG.TERRITORY.CELL;
  const tx0 = Math.max(0, Math.floor(camX / C) - 1);
  const ty0 = Math.max(0, Math.floor(camY / C) - 1);
  const tx1 = Math.min(terrW - 1, Math.ceil((camX + CONFIG.VIEWPORT_WIDTH) / C));
  const ty1 = Math.min(terrH - 1, Math.ceil((camY + CONFIG.VIEWPORT_HEIGHT) / C));
  const size = C * cs;

  // Ba lớp: RUỘT rất mờ, VIỀN TRONG đậm hơn, rồi mới tới nét biên giới.
  //
  // Hai lần thử trước đều hỏng theo hai hướng đối nhau. Ruột 0,11 / nét 0,75: khi
  // phần thân của lãnh thổ nằm ngoài khung hình thì thứ còn lại trên màn hình là
  // đúng một cái khung rỗng lơ lửng, mắt đọc thành "một vật thể" chứ không thành
  // "mép của một vùng". Ruột 0,15 phẳng: tới lúc một bộ lạc nuốt gần hết bản đồ,
  // cả khung hình bị phủ một lớp màu của nó và mặt đất mất sạch màu thật.
  //
  // Viền trong giải cả hai: gần biên giới thì đậm (nên một mảnh lãnh thổ ở rìa
  // khung hình vẫn đọc ra là một VÙNG), còn sâu trong lòng thì gần như trong suốt
  // (nên phủ kín bản đồ cũng không nhuộm màu bản đồ). Đây cũng đúng cách một tấm
  // bản đồ chính trị vẽ biên giới: đậm ở đường ranh, nhạt dần vào trong.
  const isEdge = (tx, ty, o) =>
    terrOwnerAt(tx + 1, ty) !== o || terrOwnerAt(tx - 1, ty) !== o ||
    terrOwnerAt(tx, ty + 1) !== o || terrOwnerAt(tx, ty - 1) !== o;

  // RUỘT: một lệnh blit lớp tô sẵn, phóng to có nội suy -> mảng màu loang mềm.
  if (territoryTint.width) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.13;
    const [ox, oy] = worldToPx(0, 0);
    ctx.drawImage(territoryTint, 0, 0, terrW, terrH,
                  ox, oy, terrW * C * cs, terrH * C * cs);
    ctx.globalAlpha = 1;
  }

  // VIỀN TRONG: dày lên ở sát biên. Gần biên giới thì đậm (nên một mảnh lãnh
  // thổ ở rìa khung hình vẫn đọc ra là một VÙNG), còn sâu trong lòng thì gần
  // như trong suốt (nên phủ kín bản đồ cũng không nhuộm màu bản đồ).
  ctx.globalAlpha = 0.1;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const owner = terrOwnerAt(tx, ty);
      if (owner < 0 || !isEdge(tx, ty, owner)) continue;
      const [px, py] = worldToPx(tx * C, ty * C);
      ctx.fillStyle = tribes[owner].color;
      ctx.fillRect(px, py, size, size);
    }
  }
  ctx.globalAlpha = 1;

  // Biên giới: chỉ vẽ cạnh nơi chủ quyền ĐỔI, và vẽ HAI LƯỢT — một nét sẫm dày
  // lót dưới, rồi nét màu bộ lạc mảnh hơn đè lên. Nét đơn màu sáng trên nền
  // sáng (bờ cát, ruộng lúa) thì biến mất; có lót sẫm thì biên giới đọc được
  // trên MỌI loại mặt đất, đúng cách một tấm bản đồ in kẻ đường ranh.
  ctx.lineCap = 'square';
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = pass === 0 ? Math.max(2.4, cs * 0.4) : Math.max(1.2, cs * 0.2);
    ctx.globalAlpha = pass === 0 ? 0.3 : 0.85;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const owner = terrOwnerAt(tx, ty);
        if (owner < 0) continue;
        const [px, py] = worldToPx(tx * C, ty * C);
        ctx.strokeStyle = pass === 0 ? '#0d0b09' : tribes[owner].color;
        ctx.beginPath();
        if (terrOwnerAt(tx + 1, ty) !== owner) { ctx.moveTo(px + size, py); ctx.lineTo(px + size, py + size); }
        if (terrOwnerAt(tx - 1, ty) !== owner) { ctx.moveTo(px, py); ctx.lineTo(px, py + size); }
        if (terrOwnerAt(tx, ty + 1) !== owner) { ctx.moveTo(px, py + size); ctx.lineTo(px + size, py + size); }
        if (terrOwnerAt(tx, ty - 1) !== owner) { ctx.moveTo(px, py); ctx.lineTo(px + size, py); }
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

// ------------------------------------------------------------
// Hộp bao của HÌNH VẼ trên màn hình (pixel), không phải của footprint. Dùng chung
// cho hit-test và cho việc phát hiện quân bị khuất.
function spriteBox(d, cs) {
  if (d.kind === 'b') {
    const s = d.o.size * cs;
    const left = d.px + cs / 2 - s / 2;
    const baseY = d.py + cs / 2 + s / 2;
    // Ruộng cao 0 -> lấy sàn bằng chính footprint, nếu không hộp dẹt thành 0 và
    // không bao giờ bấm trúng được.
    const H = Math.max(buildingSpriteHeight(d.o), d.o.size) * cs;
    const ov = buildingSpriteOverhang(d.o);
    return { x0: left - s * ov, x1: left + s * (1 + ov), y0: baseY - H, y1: baseY };
  }
  if (d.kind === 'w') {
    // Không khai ở đây thì nó rơi xuống nhánh QUÂN LÍNH bên dưới, tra
    // `UNIT_BOX[undefined]` và nhận hộp mặc định 1,2 ô đặt sai chỗ — bấm vào tường
    // thì trúng khoảng trời phía trên nó.
    //
    // CHIỀU CAO ĐỌC LẠI ĐÚNG CÔNG THỨC CỦA drawWall, không phải một hằng số chép
    // tay: từ 3.30 nó phụ thuộc bậc thời đại (0,46..0,82) NHÂN với hệ số ô góc
    // (1,35). Chép tay 0,74 thì bấm vào đỉnh một tháp góc Thiên Triều sẽ trượt —
    // đúng con lỗi "hộp bấm tưởng sprite trùng chân đế" của Phase 3.5, lần thứ tư.
    // Ô góc còn tràn ngang 0,10 ô mỗi bên vì cái mũ vuông của nó rộng 1,2 ô.
    const sp = wallTierSpec(d.o);
    // MỘT hàm chung với drawWall — xem chú thích ở wallHeightMul. Biểu thức tam
    // nguyên chép tay ở đây đã đúng bằng may mắn suốt ba bản; bậc thứ tư (lầu cổng)
    // là bậc đầu tiên nó sẽ sai.
    const hMul = wallHeightMul(d.o);
    // Phần dôi lên trên khối, tính bằng PIXEL chứ không bằng phân số ô — vì thứ cao
    // nhất trên lầu cổng là cột cờ, và cột cờ có sàn pixel (xem gatePennant).
    //
    // Mái vát (0,36 ô) và cột cờ (0,78 ô) cùng mọc từ MỘT mốc `capY`, không chồng
    // lên nhau, nên phần dôi là max(hai cái) = cột cờ, KHÔNG phải tổng. Cộng chúng
    // lại là hộp bấm cao thêm nửa ô so với hình — không ai thấy, nhưng nó phá đúng
    // cái bất biến khiến hàm này tồn tại: hộp bấm PHẢI là hình vẽ, không phải một
    // ước lượng rộng rãi quanh nó.
    //
    // Bản 3.38 để 0,34 ô — vừa khít cái mái cũ, tức là đã bỏ quên TRỌN lá cờ suốt
    // một bản: bấm trúng lá cờ là bấm vào bãi cỏ.
    const isGateTower = d.o.gate && !d.o.door;
    const extraPx = isGateTower ? gatePennant(cs).poleH + INK_SLOP
                  : cs * (d.o.corner ? 0.30 : 0.15);
    const h = cs * sp.h * hMul + extraPx;
    // Lầu cổng cũng tràn ngang như tháp góc. 0,08 -> 0,16 sau khi ĐO BẰNG PIXEL:
    // mái vát dựng từ `bx − cs·0,08` tới `bx + bw + cs·0,08`, nhưng nét viền sáng ở
    // mép mái (lineWidth cs·0,07) còn ăn thêm nửa bề dày ra mỗi bên nữa — và bề dày
    // nét vẽ thì không nằm trong bất cứ công thức toạ độ nào. Cùng đúng lý do đã
    // phải ĐO thay vì SUY ở hộp bấm máy bắn đá (3.31): công thức cho 2,4 ô, vết mực
    // thật chạm 2,54.
    // Ở 3.39 con số này thôi là một hằng số: nó DỰNG LẠI đúng biểu thức của drawWall
    //     nửa phần khối phình ra   + mép mái   + nửa bề dày nét  + vết mực đo được
    // Viết thành `cs * 0,33` thì nó đúng ở cs 9 và hụt 0,1px ở cs 14, vì hai số hạng
    // cuối KHÔNG co theo cs. Đây là lần thứ năm trong tệp này một hằng số chép tay
    // suýt tách hộp bấm khỏi hình vẽ.
    const ov = d.o.corner ? cs * 0.10
             : isGateTower ? cs * (GATE_TOWER_W - 1) / 2 + cs * 0.08
                             + Math.max(1, cs * 0.07) / 2 + INK_SLOP
             : 0;
    // Đoạn DỌC được đùn khối: mặt trên phủ trọn footprint ô rồi NÂNG LÊN `h`, nên
    // hình của nó bắt đầu ở `py - h` chứ không ở `py + cs - h`. Lấy hộp của đoạn
    // ngang cho nó thì bấm vào mặt trên một bức tường dọc luôn trượt — cùng con
    // lỗi hộp-bấm-lệch-hình đã cắn bốn lần, lần này do chính phép đùn vừa thêm.
    const y0 = d.o.dir === 'v' ? d.py - h : d.py + cs - h;
    return { x0: d.px - ov, x1: d.px + cs + ov, y0, y1: d.py + cs };
  }
  if (d.kind === 'l') {
    // drawLair vẽ theo skin.scale của CẤP hang, không theo l.size. Hộp bấm phải
    // đọc đúng cùng con số đó — đây là lần thứ hai trong file này hình vẽ và hộp
    // bấm suýt tách khỏi nhau (lần đầu: Phase 3.5, hit-test tưởng sprite ≡ chân đế).
    const S = cs * lairSkin(d.o).scale;
    const cx = d.px + cs / 2, cy = d.py + cs / 2;
    return { x0: cx - S * 0.5, x1: cx + S * 0.5, y0: cy - S * 0.55, y1: cy + S * 0.35 };
  }
  // Quân vẽ nhỏ hơn nhiều so với vùng bấm cũ (bán kính 3 ô). Nới rộng hộp để việc
  // chọn không khó đi so với trước — đây là vùng BẤM, không phải vùng che khuất.
  //
  // KHÔNG còn là một hình vuông chung cho mọi loại quân. Ba loại vẽ cao vượt hẳn
  // ra ngoài ô của mình — anh hùng cưỡi ngựa, kỵ binh, máy bắn đá — và với hộp
  // vuông 1,2 ô thì phần đầu của chúng nằm NGOÀI vùng bấm: bấm vào đúng cái mũ
  // chóp của tướng thì không chọn được tướng. Đây đúng là con lỗi Phase 3.5 (hộp
  // bấm tưởng hình vẽ trùng chân đế) quay lại ở một chỗ khác, và nó quay lại đúng
  // vào lúc mấy hình đó được vẽ to lên.
  // QUÁI VẬT không dùng bảng cố định: cỡ của chúng nằm trong `spec.size`, chạy từ
  // 1,1 (nhện) tới 2,7 (Chúa Hang) — hơn hai lần rưỡi. Một hộp chung 1,2 ô nghĩa
  // là bấm vào thân Chúa Hang thì trượt, còn bấm cạnh con nhện lại trúng. Đây
  // đúng con lỗi Phase 3.5 (hộp bấm tưởng hình vẽ trùng chân đế) lần thứ ba, và
  // lần này nó vào đúng nhóm vừa được vẽ to lên ở 3.22.
  const cx = d.px + cs / 2, cy = d.py + cs / 2;
  if (d.o.type === 'monster') {
    const sp = CONFIG.MONSTER.TYPES[d.o.mType];
    const S = sp.size * (d.o.scale || 1);
    // Loài BAY vẽ cao hơn mặt đất ~0,85 ô (xem nhánh 'wyvern'), nên hộp phải với
    // lên tận đó — nếu không thì bấm vào con phi long là bấm vào bãi cỏ dưới bụng nó.
    const up = S * (sp.boxUp || 0.8) + (sp.fly ? 1.1 : 0);
    // `boxW` — chỉ Thiên Ma khai, vì chỉ nó có thứ vươn ra NGOÀI 0,75·S: sải cánh
    // chạm tới 0,96·S và lưỡi đuôi tới 1,02·S. Để mặc định thì bấm vào cánh nó là
    // bấm vào bãi cỏ — đúng con lỗi "hộp bấm tưởng hình vẽ trùng chân đế" của Phase
    // 3.5, và bản 3.31 đã bắt được nó lần thứ sáu ở hai cỗ máy công thành. Ở đây nó
    // được chặn NGAY TRONG bản vẽ ra cái cánh, chứ không đợi lần thứ bảy.
    const halfW = sp.boxW || 0.75;
    return { x0: cx - cs * S * halfW, x1: cx + cs * S * halfW,
             y0: cy - cs * up, y1: cy + cs * (S * 0.6 + 0.3) };
  }
  const B = UNIT_BOX[d.o.type] || UNIT_BOX._;
  // NHÂN THEO `effScale` — hộp bấm của hai cỗ máy công thành là hộp DUY NHẤT trong
  // bảng này co giãn theo một nhánh nghiên cứu. CONFIG.UPGRADE.LINES.siege đã tự
  // tuyên bố luật này từ 3.27 ("scale ở đây phải chảy vào spriteBox chứ không chỉ
  // vào hàm vẽ") nhưng dòng thi hành thì chưa bao giờ được viết: một cỗ máy cấp 3
  // vẽ to gấp rưỡi mà vẫn mang hộp bấm của cỗ máy cấp 0, nên bấm vào bánh xe của
  // nó là bấm trúng bãi cỏ. Lỗi nằm im được lâu vì nhánh Công thành gần như không
  // bao giờ được nghiên cứu (đo: 1/16 bộ lạc, 4 kỷ nguyên) — không ai từng nhìn
  // thấy một cỗ máy cấp 3 để mà bấm trượt. Đây là "hộp bấm lệch hình" lần thứ sáu,
  // và lần này chính CÁI CHÚ THÍCH ĐÒI SỬA lại là thứ ru ngủ.
  const k = B.siege ? effScale(d.o) : 1;
  return { x0: cx - cs * B.w * k, x1: cx + cs * B.w * k,
           y0: cy - cs * B.up * k, y1: cy + cs * B.down * k };
}

// Nửa rộng / cao lên trên / xuống dưới, tính bằng SỐ Ô. Đọc từ chính hình vẽ:
//  · anh hùng cưỡi ngựa — người nâng lên 0,46·S rồi còn mũ chóp và tên phía trên
//  · kỵ binh — S = 1,95 ô, thân ngựa rộng gần hai ô
//  · máy bắn đá — S = 2,15 ô, cần bắn dựng đứng cao hơn cả khung
//  · voi chiến — S = 2,6 ô; sprite lớn nhất nhóm quân trở lại từ 3.32 (máy bắn đá
//    chỉ vượt nó khi đã ăn đủ ba cấp nhánh Công thành: 3,05 ô)
//  · nỏ thần — S = 1,95 ô, cánh nỏ xoè ngang gần trọn bề rộng
//  · quân kỳ — người cỡ bộ binh nhưng CÁN CỜ cao 1,05·S phía trên đầu, nên `up`
//    của nó phải lớn hơn hẳn bề rộng. Đây đúng cái bẫy Phase 3.5 lần thứ tư: hộp
//    bấm mặc định 1,2 ô sẽ cắt cụt đúng lá cờ — thứ DUY NHẤT người xem nhắm vào
//    khi họ muốn bấm con này.
const UNIT_BOX = {
  _:           { w: 1.2, up: 1.2, down: 1.2 },
  hero:        { w: 1.4, up: 2.5, down: 1.1 },
  knight:      { w: 1.7, up: 1.5, down: 1.2 },
  horsearcher: { w: 1.7, up: 1.5, down: 1.2 },
  // Hai cỗ máy nới ở 3.31 khi sprite lên 2,75/2,45 ô và mọc thêm CÁN CỜ ở đuôi (cấp
  // 3 nhánh Công thành). `siege: true` là cờ bật phép nhân theo effScale trong
  // spriteBox — xem chú thích ở đó. Ba số này đọc thẳng ra từ hàm vẽ:
  //   w    = mũi cờ đuôi nheo ở −0,88·S, xa hơn cả kíp vận hành (±0,60·S)
  //   up   = đầu cần bắn ở −0,80·S lúc nạp đầy (nỏ thần chỉ −0,48·S: cánh nỏ nằm ngang)
  //   down = chân kíp vận hành ở +0,58·S, thấp hơn trục bánh xe
  // Ba số của máy bắn đá KHÔNG suy từ công thức mà ĐO bằng pixel (vẽ ra canvas
  // trong suốt rồi quét vết mực, đúng cách Thư khố tự căn khung). Bản suy-từ-công-
  // thức cho `up: 2,4` và đo ra vết mực chạm tới 2,54 ô — hụt 0,14 ô ở CẢ cấp 0 lẫn
  // cấp 3, tức là đỉnh cần bắn nằm ngoài vùng bấm ở mọi cấp. Lý do công thức sai:
  // đầu cần ở −0,80·S nhưng cái GÀU ở đầu cần còn vươn thêm 0,13·S nữa, và `lineWidth`
  // của nét vẽ thì không nằm trong bất cứ công thức toạ độ nào.
  //
  // 3.32 THU NHỎ CẢ HAI CON SỐ THEO ĐÚNG TỈ LỆ sprite vừa nhỏ đi (2,75->2,15 và
  // 2,45->1,95), chứ không giữ nguyên hộp cũ cho "dễ bấm". Giữ nguyên thì hộp bấm
  // của máy bắn đá phình ra 1,28 lần bề ngang hình vẽ, và bấm vào bãi cỏ cạnh nó sẽ
  // chọn trúng nó — đúng con lỗi hộp-bấm-lệch-hình của Phase 3.5, chỉ là lệch theo
  // chiều ngược lại. Nhân theo tỉ lệ thì phần dư 0,05·S mà phép đo pixel đã mua được
  // vẫn còn nguyên, vì nó vốn được ghi bằng đơn vị S.
  catapult:    { w: 2.03, up: 2.03, down: 1.33, siege: true },
  ballista:    { w: 1.83, up: 1.19, down: 1.35, siege: true },
  elephant:    { w: 1.7, up: 1.9, down: 1.3 },
  standard:    { w: 1.2, up: 2.2, down: 1.2 },
  // ĐỘI HẬU CẦN — người cỡ dân thường nhưng có CÁI XE kéo phía sau, và cái xe mới
  // là thứ người xem nhắm vào khi muốn bấm con này. Ba số đọc thẳng từ drawQuarter:
  //   w  = tâm xe ở −0,62 ô cộng nửa thùng 0,31 cộng cán cờ chìa ra 0,26 → ~1,25;
  //        lấy 1,45 để lề bằng nhau ở cả hai bên bất kể đơn vị đang quay hướng nào
  //        (hộp thì đối xứng, còn cái xe thì lật theo hướng nhìn)
  //   up = đỉnh cờ đuôi nheo ở cartY − 0,95·ch, tức ~0,73 ô trên tâm; nón lá cao
  //        hơn một chút nữa
  //   down = chân người ở +0,5 ô, bánh xe không thấp hơn
  quarter:     { w: 1.45, up: 1.15, down: 1.15 }
};

// Silhouette xuyên tường. Nhà cao lên thì quân đứng phía sau biến mất, mà với một
// sim TỰ CHƠI thì mất dấu quân còn tệ hơn mất chiều sâu — người xem không điều
// khiển được gì, họ chỉ có mỗi việc dõi theo. Quân bị khuất được vẽ lại thành viền
// mờ đè lên tất cả: vẫn thấy vị trí, mà vẫn đọc ra là "đang ở sau nhà".
function drawOccludedUnits(drawables, cs) {
  const occ = [];
  for (const d of drawables) {
    if (d.kind !== 'b' || !d.o.done) continue;
    if (buildingSpriteHeight(d.o) <= 0) continue;      // ruộng không che ai
    const box = spriteBox(d, cs);
    box.base = d.y + d.o.size / 2;
    occ.push(box);
  }
  if (!occ.length) return;

  for (const d of drawables) {
    if (d.kind !== 'u') continue;
    const cx = d.px + cs / 2, cy = d.py + cs / 2;
    let hidden = false;
    for (const o of occ) {
      // Chỉ công trình vẽ SAU quân này mới che được nó — cùng điều kiện với thứ tự
      // sắp xếp ở trên, nếu không sẽ vẽ viền cho cả quân đang đứng chắn trước nhà.
      if (o.base <= d.y) continue;
      if (cx >= o.x0 && cx <= o.x1 && cy >= o.y0 && cy <= o.y1) { hidden = true; break; }
    }
    if (!hidden) continue;

    const u = d.o;
    const color = u.tribeId === -1 ? '#a8483a' : tribes[u.tribeId].color;
    // Viền mờ của cỗ máy công thành phải theo effScale như chính hình vẽ: đây là
    // hình bóng THAY THẾ cho sprite khi nó bị nhà che, nên một bán kính cố định sẽ
    // làm cỗ máy cấp 3 co lại đúng lúc nó khuất — người xem đọc ra là nó vừa đổi
    // loại quân chứ không phải vừa đi ra sau căn nhà.
    const r = cs * (u.type === 'hero' ? 0.6
                  : u.type === 'catapult' ? 0.61 * effScale(u)
                  : u.type === 'ballista' ? 0.56 * effScale(u)
                  : isCavalry(u.type) ? 0.82
                  : isMilitary(u.type) ? 0.48 : 0.38);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, cs * 0.14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------
// Ba lớp "sống" chạy bằng ĐỒNG HỒ THẬT: mây, mặt nước, vòng báo trận
// ------------------------------------------------------------
// Cả ba đọc aTick chứ không đọc tick, nên chúng vẫn động khi mô phỏng tạm dừng
// hoặc đang ở 6 tick/s. Đó là chủ ý: một khung hình đứng chết đọc ra "treo rồi",
// còn một khung hình có mây trôi và mặt nước lăn tăn đọc ra "đang chờ".

// Bóng mây. Bốn vệt tối lớn và mềm trôi ngang bản đồ — thủ thuật cổ điển và rẻ
// nhất để một mặt cỏ phẳng lì bỗng có BẦU TRỜI phía trên nó. Giá phải trả đúng
// bốn gradient mỗi frame.
// Alpha hạ khoảng một phần ba so với bản trước: mặt đất giờ đã đằm hơn, nên
// cùng một cái bóng mây trước kia đọc ra "có trời phía trên" thì nay đọc ra
// "một vũng bùn". Bóng mây phải luôn nhẹ hơn thứ nó phủ lên.
const CLOUDS = [
  { x: 0.05, y: 0.20, r: 44, sp: 0.030, a: 0.11 },
  { x: 0.38, y: 0.62, r: 62, sp: 0.021, a: 0.085 },
  { x: 0.66, y: 0.11, r: 35, sp: 0.043, a: 0.10 },
  { x: 0.84, y: 0.80, r: 54, sp: 0.026, a: 0.08 }
];
