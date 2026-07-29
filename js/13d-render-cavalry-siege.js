'use strict';
// ============================================================
// 13d-render-cavalry-siege.js
// ------------------------------------------------------------
// Ngựa + kỵ binh, kíp vận hành khí tài, ba dấu cấp nhánh Công thành, máy
// bắn đá, nỏ thần, voi chiến, quân kỳ. Tách từ 13-render-world.js (Phase
// 3.43) — xem 13-render-terrain.js.
// ============================================================
// ============================================================
// CON NGỰA — một hàm, hai chỗ dùng (kỵ binh và ngựa của anh hùng)
// ============================================================
// Bản trước vẽ ngựa bằng bốn nét: một hình bầu dục làm thân, một tứ giác làm cả
// cổ lẫn đầu, bốn đoạn thẳng làm chân, một nét làm đuôi. Đường bao ra đúng là
// "một khối nằm ngang" — nhận diện được, và đó là việc chính nó phải làm — nhưng
// nhìn gần thì nó không phải con ngựa, nó là một cái bao tải có que.
//
// Cái làm nên SILHOUETTE ngựa, xếp theo mức đóng góp:
//   1. Hai khối mông và vai RÕ RỆT, nối bằng một cái lưng võng xuống ở giữa. Một
//      hình bầu dục đơn thì không bao giờ ra được đường lưng đó.
//   2. Cổ VÁT — dày ở vai, thon dần lên gáy — rồi cái đầu gãy góc xuống, có mõm.
//      Bản cũ để cổ và đầu chung một tứ giác nên không có khớp gáy, và đó chính
//      là chỗ mắt người tìm đầu tiên khi đọc một con vật bốn chân.
//   3. Chân có KHỚP: đùi hướng một đằng, ống chân hướng một nẻo. Bốn đoạn thẳng
//      cho ra hình cái ghế đẩu; hai khúc gãy cho ra hình đang bước.
//   4. Bờm và đuôi có bề dày, không phải một nét kẻ.
//
// Chi tiết nhỏ (mắt, tai, mõm, móng) chỉ vẽ khi còn đọc được — dưới ngưỡng đó
// chúng chỉ làm bẩn đường bao vốn đang làm tốt việc nhận diện.
//
// `p` gom mọi thứ khác nhau giữa hai loại ngựa: màu thân, có giáp ngựa không, có
// chỏm lông không, nhịp chân nhanh hay chậm. Một hàm chứ không hai bản chép: hai
// bản chép thì lần sửa sau sẽ chỉ sửa một trong hai, và trên bản đồ sẽ có hai
// giống ngựa khác nhau mà không ai cố ý tạo ra.
function drawHorse(cx, bodyY, H, dir, gait, p, cs) {
  const hide = p.hide, mane = p.mane;
  const thin = Math.max(1, cs * 0.09);

  // ---- CHÂN (vẽ trước, nằm sau thân) ----
  // Cặp sau ở x = -0.30, cặp trước ở +0.26; trong mỗi cặp hai chân lệch nhau chút
  // ít để đọc ra chiều sâu. Mỗi chân là hai khúc: đùi hơi ngả, ống chân đổ theo
  // nhịp phi. Móng là một vạch dày ở cuối.
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const rear = i < 2;
    const lx = cx + dir * H * ((rear ? -0.30 : 0.26) + (i % 2) * 0.07 * dir);
    const ph = gait * (rear ? 1 : -1);
    const kneeX = lx + ph * H * 0.05, kneeY = bodyY + H * 0.24;
    const footX = lx + ph * H * 0.15, footY = bodyY + H * 0.44;
    ctx.strokeStyle = (i % 2) ? p.legDark : hide;
    ctx.lineWidth = Math.max(1.1, cs * 0.11);
    ctx.beginPath();
    ctx.moveTo(lx, bodyY + H * 0.06);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    if (cs >= 5) {                                   // móng
      ctx.strokeStyle = '#1c1610';
      ctx.lineWidth = Math.max(1.2, cs * 0.13);
      ctx.beginPath();
      ctx.moveTo(footX - dir * H * 0.02, footY);
      ctx.lineTo(footX + dir * H * 0.05, footY);
      ctx.stroke();
    }
  }

  // ---- THÂN: mông + vai + lưng võng ----
  // Ba hình chồng lên nhau, cùng một màu nên chúng hàn thành một khối liền; cái
  // đọc ra được là ĐƯỜNG BAO của tổng ba hình đó, không phải từng hình.
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(cx - dir * H * 0.26, bodyY - H * 0.02, H * 0.21, H * 0.19, 0, 0, Math.PI * 2);  // mông
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + dir * H * 0.22, bodyY - H * 0.01, H * 0.20, H * 0.18, 0, 0, Math.PI * 2);  // vai
  ctx.fill();
  ctx.beginPath();                                                                            // lườn
  ctx.moveTo(cx - dir * H * 0.26, bodyY - H * 0.20);
  ctx.quadraticCurveTo(cx, bodyY - H * 0.13, cx + dir * H * 0.22, bodyY - H * 0.19);
  ctx.lineTo(cx + dir * H * 0.22, bodyY + H * 0.16);
  ctx.quadraticCurveTo(cx, bodyY + H * 0.20, cx - dir * H * 0.26, bodyY + H * 0.16);
  ctx.closePath();
  ctx.fill();

  // YÊN THẢM (chỉ ngựa tướng) — mang màu bộ lạc, nhưng CHỈ một tấm dưới yên chứ
  // không phải một bộ giáp phủ kín. Bản đầu vẽ nó thành một mảng lớn trùm từ vai
  // tới lườn: kết quả là con ngựa vừa được vẽ tử tế xong thì bị chính tấm giáp
  // xoá đi, chỉ còn thò ra bốn cái chân và cái đầu — vẽ to lên bao nhiêu cũng vô
  // ích. Màu bộ lạc ở đây không cần nhiều diện tích: anh hùng đã có tên trên đầu,
  // vòng sáng dưới chân và áo choàng cùng màu rồi.
  if (p.barding) {
    ctx.fillStyle = p.barding;
    ctx.beginPath();
    ctx.moveTo(cx - dir * H * 0.10, bodyY - H * 0.19);
    ctx.lineTo(cx + dir * H * 0.16, bodyY - H * 0.17);
    ctx.lineTo(cx + dir * H * 0.13, bodyY + H * 0.10);
    ctx.lineTo(cx - dir * H * 0.14, bodyY + H * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = thin;
    ctx.stroke();
    // Tấm che ngực — mẩu màu thứ hai ở phía trước, để cụm màu bộ lạc không dồn
    // hết vào một chỗ giữa thân.
    ctx.fillStyle = p.barding;
    ctx.beginPath();
    ctx.moveTo(cx + dir * H * 0.34, bodyY - H * 0.10);
    ctx.lineTo(cx + dir * H * 0.42, bodyY + H * 0.02);
    ctx.lineTo(cx + dir * H * 0.30, bodyY + H * 0.13);
    ctx.closePath();
    ctx.fill();
  }

  // ---- CỔ + ĐẦU ----
  // Cổ là một hình thang VÁT: rộng ở vai (0.30 cao), hẹp ở gáy (0.14). Đầu gãy
  // xuống một góc rõ so với cổ — không có cái góc đó thì cả cụm đọc ra là một cái
  // sừng chứ không phải một cái đầu.
  const nx = cx + dir * H * 0.30, ny = bodyY - H * 0.06;      // gốc cổ (vai)
  const cxTop = cx + dir * H * 0.52, cyTop = bodyY - H * 0.42; // gáy
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.moveTo(nx - dir * H * 0.04, ny - H * 0.12);
  ctx.quadraticCurveTo(cx + dir * H * 0.40, bodyY - H * 0.36, cxTop - dir * H * 0.05, cyTop);
  ctx.lineTo(cxTop + dir * H * 0.10, cyTop + H * 0.04);
  ctx.quadraticCurveTo(cx + dir * H * 0.46, bodyY - H * 0.18, nx + dir * H * 0.06, ny + H * 0.10);
  ctx.closePath();
  ctx.fill();
  // Đầu: một khối gãy về phía trước-xuống, kèm mõm hơi cụp.
  ctx.beginPath();
  ctx.moveTo(cxTop - dir * H * 0.06, cyTop - H * 0.02);
  ctx.lineTo(cxTop + dir * H * 0.20, cyTop - H * 0.05);
  ctx.lineTo(cxTop + dir * H * 0.26, cyTop + H * 0.09);
  ctx.lineTo(cxTop + dir * H * 0.10, cyTop + H * 0.13);
  ctx.closePath();
  ctx.fill();

  // ---- BỜM ----
  // Một dải răng cưa chạy dọc sống cổ. Đây là chi tiết rẻ nhất mà đóng góp nhiều
  // nhất: nó biến cái cổ hình thang thành cổ ngựa.
  ctx.strokeStyle = mane;
  ctx.lineWidth = Math.max(1.3, cs * 0.13);
  ctx.beginPath();
  ctx.moveTo(nx - dir * H * 0.05, ny - H * 0.13);
  ctx.quadraticCurveTo(cx + dir * H * 0.34, bodyY - H * 0.38, cxTop - dir * H * 0.02, cyTop - H * 0.01);
  ctx.stroke();

  // ---- ĐUÔI ---- cong, dày ở gốc, phất theo nhịp
  ctx.strokeStyle = mane;
  ctx.lineWidth = Math.max(1.4, cs * 0.15);
  ctx.beginPath();
  ctx.moveTo(cx - dir * H * 0.44, bodyY - H * 0.14);
  ctx.quadraticCurveTo(cx - dir * H * 0.60, bodyY - H * 0.02 + gait * H * 0.05,
                       cx - dir * H * 0.56, bodyY + H * 0.22 + gait * H * 0.06);
  ctx.stroke();

  // ---- CHI TIẾT ĐẦU ---- chỉ khi còn đọc được
  if (cs >= 5) {
    ctx.fillStyle = mane;                                   // tai
    ctx.beginPath();
    ctx.moveTo(cxTop - dir * H * 0.02, cyTop - H * 0.02);
    ctx.lineTo(cxTop + dir * H * 0.01, cyTop - H * 0.14);
    ctx.lineTo(cxTop + dir * H * 0.07, cyTop - H * 0.03);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#120e0a';                              // mắt
    ctx.beginPath();
    ctx.arc(cxTop + dir * H * 0.10, cyTop + H * 0.03, Math.max(0.8, H * 0.026), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.legDark;                              // mõm
    ctx.beginPath();
    ctx.ellipse(cxTop + dir * H * 0.23, cyTop + H * 0.07, H * 0.05, H * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Chỏm lông trên trán — dấu "ngựa của tướng", đọc được ở mọi mức zoom. Nhỏ và
  // thon: ở 0,26·H nó cao gần bằng cả cái đầu và đọc ra thành một cái sừng.
  if (p.plume) {
    ctx.fillStyle = p.plume;
    ctx.beginPath();
    ctx.moveTo(cxTop + dir * H * 0.03, cyTop - H * 0.03);
    ctx.lineTo(cxTop + dir * H * 0.02, cyTop - H * 0.17);
    ctx.lineTo(cxTop + dir * H * 0.10, cyTop - H * 0.05);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
}

// KỴ BINH — thân ngựa NẰM NGANG, người cưỡi nhô lên trên.
//
// Cả hai loại quân khác đều được vẽ theo TRỤC ĐỨNG (một thân người cao hơn rộng),
// nên thứ làm kỵ binh nhận ra được ngay từ mức zoom xa nhất không phải màu, không
// phải cỡ, mà là TRỤC: một khối nằm ngang giữa một đám khối đứng. Đó là lý do
// hàm này không đi qua nhánh vẽ chung ở drawUnit dù nó cũng chỉ là "người + vũ
// khí": chỉ cần vẽ đúng hình người rồi phóng to lên là ở 7 px/ô nó lại thành một
// người lính hơi to, và cả cơ chế kỵ binh biến mất khỏi màn hình.
//
// Bốn chân chạy theo pha riêng của từng con (u.id) — nếu cùng pha thì cả đội kỵ
// binh nhấp nhô như một, và mắt đọc ra một khối duy nhất chứ không phải một đàn.
function drawCavalry(u, tribe, cx, cy, px, py, cs) {
  // 1,3 -> 1,95 (×1,5). Người + ngựa là hai khối chồng lên nhau nên ở cỡ cũ, phần
  // NGƯỜI — thứ mang màu bộ lạc và cầm vũ khí — nhỏ hơn một người lính bộ đứng
  // cạnh, dù cả cụm thì rộng hơn. Mắt đọc kích cỡ theo chi tiết lớn nhất nhận ra
  // được, không theo đường bao, nên cỗ máy đắt gấp rưỡi bộ binh lại đọc ra là
  // nhỏ hơn. To hơn cũng đúng về luật: đây là đơn vị nặng nhất trên bộ.
  const S = cs * 1.95;
  const dir = u.facingX >= 0 ? 1 : -1;
  const ranged = u.type === 'horsearcher';
  drawShadow(cx, cy + cs * 0.52, S * 0.52, S * 0.19);

  const gait = Math.sin((aTick + u.id * 11) * 0.42);
  const bodyY = cy + S * 0.02;

  // Ngựa kỵ binh mang MÀU BỘ LẠC trên thân — khác ngựa của tướng (thân nâu, chỉ
  // tấm giáp mới mang màu). Lý do: kỵ binh đi thành đàn và thường là thứ duy nhất
  // trong khung hình đang di chuyển nhanh, nên "của phe nào" phải đọc được từ
  // chính cái khối lớn nhất; còn tướng thì đã có tên trên đầu và vòng sáng dưới chân.
  drawHorse(cx, bodyY, S, dir, gait, {
    hide: tribe.color, legDark: tribe.dark, mane: tribe.dark, barding: null, plume: null
  }, cs);

  // Người cưỡi — chỉ vẽ khi còn đọc được. Dưới ngưỡng này mấy nét người chỉ làm
  // bẩn cái silhouette ngang vốn đang làm tốt công việc nhận diện của nó.
  // Ngưỡng hạ 7 -> 5 theo cỡ mới: ở S = 1,95·cs thì người cưỡi ở cs 5 đã to bằng
  // người cưỡi ở cs 7 của bản cũ, nên giữ ngưỡng cũ là giấu đi một phần hình vẽ
  // vẫn còn đọc tốt.
  if (cs >= 5) {
    const ry = bodyY - S * 0.3;
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(cx - S * 0.1, ry - S * 0.16, S * 0.2, S * 0.34);
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(cx, ry - S * 0.26, S * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(0.8, cs * 0.06); ctx.stroke();

    if (ranged) {
      // Cây cung dựng đứng phía trước — cùng ngôn ngữ hình với cung thủ bộ, nên
      // người xem không phải học thêm một ký hiệu nào để đọc ra "đây là quân bắn".
      ctx.strokeStyle = '#d7ccb4';
      ctx.lineWidth = Math.max(1.1, cs * 0.08);
      ctx.beginPath();
      ctx.arc(cx + dir * S * 0.22, ry - S * 0.04, S * 0.28, -Math.PI * 0.5, Math.PI * 0.5, dir < 0);
      ctx.stroke();
    } else {
      // Thanh gươm chĩa tới trước, hếch lên. Vung theo swingAt như bộ binh (xem
      // drawBattleAxe) để cú chém đọc được chứ không chỉ là một cái que đứng yên.
      const sw = u.swingAt && aTick - u.swingAt < 10 ? (aTick - u.swingAt) / 10 : 1;
      const ang = -Math.PI * (0.15 + 0.35 * (1 - sw));
      ctx.strokeStyle = '#e8e2d2';
      ctx.lineWidth = Math.max(1.2, cs * 0.1);
      ctx.beginPath();
      ctx.moveTo(cx + dir * S * 0.12, ry);
      ctx.lineTo(cx + dir * (S * 0.12 + Math.cos(ang) * S * 0.5), ry + Math.sin(ang) * S * 0.5);
      ctx.stroke();
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.6, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// Máy bắn đá: khung gỗ trên hai bánh xe, cần bắn ngả về sau rồi bật lên khi khai
// hoả. Vẽ to gấp rưỡi người — nó chậm và ít, nên nếu vẽ đúng tỉ lệ thì người xem sẽ
// không bao giờ nhận ra cỗ máy đắt nhất trong đạo quân đang có mặt trên bản đồ.
// ============================================================
// KÍP VẬN HÀNH — người đứng bên khí tài (Phase 3.30)
// ============================================================
// Cho tới bản này, máy bắn đá và nỏ thần là hai vật thể TỰ ĐI, tự quay cần, tự
// bắn. Chú thích của chính drawCatapult đã gọi nó là "thứ duy nhất trên bản đồ
// cần cả một tổ vận hành" — mà trên màn hình thì không có ai ở đó. Một câu trong
// chú thích mà hình vẽ không nói ra thì với người xem nó không tồn tại.
//
// HAI người, và vị trí của họ mang thông tin chứ không phải trang trí:
//   · người ĐUÔI vẽ TRƯỚC thân máy nên bị khung xe che một phần — đó là thứ nói
//     rằng anh ta đứng PHÍA SAU, và nhờ vậy cỗ máy có chiều sâu thật;
//   · người ĐẦU vẽ SAU thân máy, đứng lệch về phía bắn.
// Cả hai cúi/ngửa theo `load` — cùng biến điều khiển cần bắn, nên kíp và máy
// không bao giờ lệch pha. Đây đúng nguyên tắc đã ghi ở drawCatapult: lấy pha từ
// cơ chế, không từ một đồng hồ hoạt ảnh riêng phải giữ cho khớp.
//
// Tỉ lệ: 0,46·S ≈ 1,0·cs, tức là ĐÚNG cỡ một người lính đứng cạnh. Vẽ nhỏ hơn thì
// họ thành mấy cái chấm, vẽ to hơn thì cỗ máy tụt xuống thành một cái xe kéo tay.
function drawCrewman(x, footY, h, tribe, lean, dir, cs) {
  if (cs < 4) return;                       // dưới cỡ này thì hai chấm chỉ làm bẩn hình
  // Đầu 0,135·h chứ không 0,17: ở bản đầu đường kính đầu (0,34·h) rộng hơn cả thân
  // (0,30·h), nên phóng to lên thì hai người trông như đồ chơi chứ không như một
  // kíp lính đang gò lưng quay tời. Thân nới lên 0,34 cho cân.
  const w = h * 0.34;
  const headR = h * 0.135;
  const hipY = footY - h * 0.42;
  const shoY = footY - h * 0.78;
  // Nghiêng người: `lean` 0 = đứng thẳng (vừa bắn xong), 1 = chồm tới nạp đạn.
  const tilt = dir * lean * h * 0.20;
  ctx.strokeStyle = '#2a2119';
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();                          // hai chân
  ctx.moveTo(x - w * 0.42, footY); ctx.lineTo(x - w * 0.10, hipY);
  ctx.moveTo(x + w * 0.46, footY); ctx.lineTo(x + w * 0.10, hipY);
  ctx.stroke();
  ctx.fillStyle = tribe.color;               // thân
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, hipY);
  ctx.lineTo(x - w * 0.42 + tilt, shoY);
  ctx.lineTo(x + w * 0.42 + tilt, shoY);
  ctx.lineTo(x + w * 0.5, hipY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tribe.dark; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.stroke();
  ctx.strokeStyle = '#2a2119';               // tay vươn về phía máy
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.beginPath();
  ctx.moveTo(x + tilt, shoY + h * 0.06);
  ctx.lineTo(x + dir * w * 0.85 + tilt * 1.6, shoY + h * (0.20 - lean * 0.10));
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#d8c39a';                 // đầu
  ctx.beginPath(); ctx.arc(x + tilt * 1.2, shoY - headR * 0.75, headR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = tribe.dark; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.stroke();
}

// ============================================================
// BA DẤU CẤP CỦA NHÁNH CÔNG THÀNH — dùng chung cho cả hai cỗ máy
// ============================================================
// Kích thước là tín hiệu chính của nhánh này (lý do đã ghi ở CONFIG.UPGRADE.LINES
// .siege) nhưng nó chỉ đọc được khi có MẪU ĐỐI CHỨNG — và hai cỗ máy của cùng một
// bộ lạc thì LUÔN cùng cấp, nên người xem không bao giờ thấy cấp 1 đứng cạnh cấp 3.
// Đúng cái bẫy Phase 3.14 đã bắt được với công trình lên đời, chỉ đổi chỗ: ở đó là
// màu, ở đây là kích thước, và cả hai đều cần một thứ mà màn hình không cung cấp.
// Nên mỗi cấp thêm một nét vào HÌNH BÓNG, ở ba chỗ KHÁC NHAU của sprite để một cỗ
// máy bị khuất nửa người sau căn nhà vẫn còn đọc được ít nhất một dấu:
//   cấp 1 — ĐAI SẮT   : vành bánh xe sáng + ba đai bọc ngang sàn xe (giữa, thấp)
//   cấp 2 — MỘC CHẮN  : tấm ván nghiêng che kíp phía trước (đầu xe, ngang tầm người)
//   cấp 3 — CỜ ĐUÔI NHEO: cán cờ dựng ở đuôi xe, cao hơn cả đầu người (đuôi, trên cao)
function siegeLevel(u) { const b = siegeOf(u); return b ? b.lv : 0; }

function drawSiegeBanner(tribe, x, footY, S, dir, cs, lv) {
  if (lv < 3 || cs < 4) return;
  const h = S * 0.86;
  // GỖ SÁNG, không phải nâu sẫm. Cán cờ chạy dọc ngay trên nền thân xe (cũng nâu
  // sẫm) nên bản đầu nó lẫn mất hoàn toàn: nhìn ra màn hình chỉ còn một lá cờ TRÔI
  // LƠ LỬNG cạnh cỗ máy, không có gì đỡ. Cùng bài học tương phản đã học ở dải màu
  // bộ lạc trên sàn xe — một chi tiết đúng vị trí mà cùng tông với nền thì bằng
  // không có.
  ctx.strokeStyle = '#a5826f';
  ctx.lineWidth = Math.max(1.4, cs * 0.10);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, footY); ctx.lineTo(x, footY - h); ctx.stroke();
  ctx.lineCap = 'butt';
  // Đuôi nheo phất theo `aTick` (đồng hồ THẬT) chứ không theo `tick` mô phỏng: lá
  // cờ phải bay cả khi người xem bấm tạm dừng — cùng lý do đã viết cho mây và mặt
  // nước, và cùng lý do một khung hình đứng chết đọc ra "treo rồi".
  const w = -dir * S * 0.44, wave = Math.sin(aTick * 0.09 + x) * S * 0.05;
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.moveTo(x, footY - h);
  ctx.lineTo(x + w, footY - h + S * 0.10 + wave);
  ctx.lineTo(x, footY - h + S * 0.26);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tribe.dark; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.stroke();
}

function drawSiegePavise(tribe, x, footY, S, dir, cs, lv) {
  if (lv < 2 || cs < 4) return;
  // GỖ, không phải một khối màu bộ lạc. Bản đầu tô trọn tấm ván bằng `tribe.color`
  // rồi kẻ ba đường ghép ván lên trên: ra màn hình nó thành ba THANH màu xếp chồng —
  // một cái thang dựng cạnh cỗ máy — và khối màu ấy còn to ngang cả dải màu trên sàn
  // xe, tức là hai chỗ cùng hét lên một thông tin. Ván gỗ + MỘT vạch màu vắt ngang
  // dùng lại đúng ngôn ngữ của sàn xe: nền là vật liệu, vạch là phe.
  const h = S * 0.42, hw = S * 0.075, lean = dir * S * 0.07;
  // THANH CHỐNG nối tấm ván ngược về sàn xe, vẽ TRƯỚC nên bị chính tấm ván che một
  // nửa. Bản đầu không có nó và tấm ván đọc ra là một mảnh gỗ ai đó dựng cạnh cỗ
  // máy — cùng một hình, cùng một chỗ, chỉ thiếu đúng thứ NỐI nó vào vật chủ.
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.2, cs * 0.09);
  ctx.beginPath();
  ctx.moveTo(x - dir * S * 0.24, footY - S * 0.05);
  ctx.lineTo(x + lean * 0.5, footY - h * 0.6);
  ctx.stroke();
  const quad = (t0, t1) => {                         // dải ngang của tấm ván, theo độ cao
    ctx.beginPath();
    ctx.moveTo(x - hw + lean * t0, footY - h * t0);
    ctx.lineTo(x - hw + lean * t1, footY - h * t1);
    ctx.lineTo(x + hw + lean * t1, footY - h * t1);
    ctx.lineTo(x + hw + lean * t0, footY - h * t0);
    ctx.closePath();
  };
  ctx.fillStyle = '#8d6e63'; quad(0, 1); ctx.fill();  // ván gỗ
  ctx.fillStyle = tribe.color; quad(0.42, 0.68); ctx.fill();   // vạch màu phe
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = Math.max(1, cs * 0.07);
  quad(0, 1); ctx.stroke();
}

// Ba đai dọc bọc sàn xe. Nhận thẳng hình chữ nhật của sàn chứ không tự tính lại từ
// S: hai cỗ máy có sàn rộng khác nhau (0,92·S và 0,84·S), và một hàm tự đoán lại
// kích thước của hình mà nó vẽ đè lên là đúng cái "hai nguồn sự thật" đã cắn nhiều lần.
function drawSiegeBands(x0, y0, w, h, cs, lv) {
  if (lv < 1 || cs < 5) return;
  ctx.strokeStyle = '#59616a';
  ctx.lineWidth = Math.max(1, cs * 0.08);
  ctx.beginPath();
  for (let k = -1; k <= 1; k++) {
    const x = x0 + w * (0.5 + k * 0.30);
    ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h);
  }
  ctx.stroke();
}

function drawCatapult(u, tribe, cx, cy, px, py, cs) {
  // 1,35 -> 2,15 (3.19) -> 2,75 (3.31) -> 2,15 (3.32, quay lại đúng con số của 3.19).
  //
  // Vì sao lùi lại: 3.31 nâng cỡ CÙNG LÚC với việc cho nhánh Công thành cộng
  // +26%/cấp vào chính con số này, nên hai lần phóng to NHÂN với nhau chứ không
  // cộng — cỗ máy cấp 3 rộng 4,89 ô, bằng trọn chân đế Kỳ quan, và ở mức thu phóng
  // chơi thật (9 px/ô) nó che mất chính cái nó đang bắn. Một khí tài công thành
  // phải ĐỌC RA là to; nó không được phép nuốt mất khung hình quanh nó.
  //
  // 2,15 vẫn giữ nguyên điều mà 3.19 mua được: cỗ máy đắt nhất cây quân sự (150 gỗ
  // + 80 vàng + 70 đá, 195 tick lò, 2,5 suất nuôi, và từ 3.30 còn ăn một dân
  // thường) không còn nhìn ra như một món đồ chơi nhỉnh hơn người lính 35%. Nó
  // KHÔNG còn là sprite lớn nhất nhóm quân ở cấp 0 — voi chiến (2,6) lấy lại chỗ
  // đó — nhưng thứ tự ấy vẫn đọc đúng: một cỗ máy đã ăn trọn ba cấp của nhánh
  // nghiên cứu đắt nhất bảng thì lên 3,05 ô và vượt con voi, còn một cỗ máy vừa ra
  // lò thì chưa.
  // `effScale` — nhánh CÔNG THÀNH vẫn làm cỗ máy TO RA THẬT, nhưng +14% mỗi cấp
  // chứ không +26% (xem CONFIG.UPGRADE.LINES.siege): cấp 3 là +42% -> 3,05 ô.
  const S = cs * 2.15 * effScale(u);
  const lv = siegeLevel(u);
  // BÓNG ĐỔ neo theo S chứ không theo cs. Bản cũ để `cy + cs*0,55` và nó đúng một
  // cách tình cờ khi S ≈ 2,15·cs (trục bánh xe rơi vào cy + 0,82·cs, lệch nửa ô thì
  // mắt bỏ qua). Ở 3.31, một cỗ máy cấp 3 có S = 4,9·cs nên trục bánh xe tụt xuống
  // cy + 1,86·cs, còn cái bóng vẫn nằm ở 0,55·cs — nhìn ra màn hình là một vũng tối
  // lơ lửng NGANG BỤNG cỗ máy. Đây là họ lỗi "hằng số neo vào ô lưới" của Phase
  // 3.19 lần nữa, và nó chỉ lộ ra khi sprite đủ to; ở cỡ cũ nó đã sai sẵn rồi.
  drawShadow(cx, cy + S * 0.40, S * 0.52, S * 0.19);

  // Cần bắn: gập lại ngay sau khi bắn (cooldown gần đầy) rồi từ từ ngả về tư thế
  // sẵn sàng. Đọc từ chính u.cooldown nên hoạt ảnh KHÔNG BAO GIỜ lệch pha với cơ
  // chế — không cần thêm một biến hoạt ảnh riêng để rồi phải giữ cho hai bên khớp.
  const load = u.atkCooldown ? clamp(1 - u.cooldown / u.atkCooldown, 0, 1) : 1;
  const dir = u.facingX >= 0 ? 1 : -1;
  const baseY = cy + S * 0.16;                  // trục bánh xe
  const dark = '#3a2418', wood = '#8d6e63', woodHi = '#a5826f';

  // ---- CỜ ĐUÔI NHEO (cấp 3) ---- vẽ TRƯỚC mọi thứ: cán cờ cắm ở mép sau sàn xe
  // nên phần chân nó phải bị chính sàn xe che, đúng cùng thủ thuật che-để-nói-chiều-sâu
  // đã dùng cho người vận hành phía đuôi.
  drawSiegeBanner(tribe, cx - dir * S * 0.44, baseY + S * 0.26, S, dir, cs, lv);

  // ---- BÁNH XE (vẽ trước, nằm sau khung) ----
  // Có NAN HOA. Ở cỡ cũ hai bánh chỉ là hai chấm nâu; ở cỡ này nan hoa đọc được,
  // và nan hoa là thứ nói "đây là cỗ xe" nhanh hơn bất cứ chi tiết nào khác.
  for (const off of [-0.34, 0.30]) {
    const wx = cx + S * off, wy = baseY + S * 0.22, wr = S * 0.20;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
    if (lv >= 1) {                             // VÀNH SẮT — dấu cấp 1
      ctx.strokeStyle = '#7d868f';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath(); ctx.arc(wx, wy, wr * 0.9, 0, Math.PI * 2); ctx.stroke();
    }
    if (cs >= 5) {
      ctx.strokeStyle = woodHi;
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      // Nan quay theo quãng đường đã đi -> đứng yên thì bánh đứng yên. Lấy pha từ
      // toạ độ chứ không từ aTick: một cỗ máy đang đứng bắn mà bánh vẫn quay tít
      // là chi tiết sai mà mắt bắt được ngay dù không nói ra được sai ở đâu.
      const ph = (u.x + u.y) * 0.9;
      for (let k = 0; k < 3; k++) {
        const a = ph + k * Math.PI / 3;
        ctx.moveTo(wx - Math.cos(a) * wr * 0.82, wy - Math.sin(a) * wr * 0.82);
        ctx.lineTo(wx + Math.cos(a) * wr * 0.82, wy + Math.sin(a) * wr * 0.82);
      }
      ctx.stroke();
    }
    ctx.fillStyle = tribe.dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr * 0.34, 0, Math.PI * 2); ctx.fill();
  }

  // ---- KÍP VẬN HÀNH (người ĐUÔI) ---- vẽ TRƯỚC khung xe để bị che một phần.
  // Xem drawCrewman: chính chỗ bị che là thứ nói rằng anh ta đứng phía sau máy.
  drawCrewman(cx - dir * S * 0.60, baseY + S * 0.40, S * 0.46, tribe, 1 - load, dir, cs);

  // ---- KHUNG GỖ ---- sàn xe + hai thanh chống chữ A đỡ trục cần bắn.
  ctx.fillStyle = wood;
  ctx.fillRect(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.22);
  // DẢI MÀU BỘ LẠC chạy hết bề ngang. Bản đầu để khung nâu sẫm với một mẩu màu bé
  // xíu ở giữa: ở mức zoom chơi thật (6-10 px/ô) nó ra đúng một chấm nâu, không
  // đọc được của phe nào — mà "máy bắn đá của ai đang bò tới thành mình" là thông
  // tin đắt nhất trên bản đồ ở giai đoạn đó.
  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.09);
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, cs * 0.08);
  ctx.strokeRect(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.22);
  drawSiegeBands(cx - S * 0.46, baseY - S * 0.02, S * 0.92, S * 0.22, cs, lv);

  const pivX = cx - dir * S * 0.06, pivY = baseY - S * 0.30;
  ctx.strokeStyle = wood;
  ctx.lineWidth = Math.max(1.4, cs * 0.13);
  ctx.beginPath();                                  // hai thanh chống chữ A
  ctx.moveTo(pivX - S * 0.20, baseY - S * 0.02); ctx.lineTo(pivX, pivY);
  ctx.moveTo(pivX + S * 0.20, baseY - S * 0.02); ctx.lineTo(pivX, pivY);
  ctx.stroke();
  // Dây thừng xoắn ở trục — nguồn lực của cỗ máy, và là chi tiết khiến nó đọc ra
  // "máy" chứ không phải "cái cần câu gắn lên xe".
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.6, cs * 0.15);
  ctx.beginPath(); ctx.arc(pivX, pivY, S * 0.07, 0, Math.PI * 2); ctx.stroke();

  // ---- CẦN BẮN + GÀU ----
  const armA = -Math.PI * (0.16 + 0.52 * load);
  const tipX = pivX + dir * Math.cos(armA) * S * 0.66;
  const tipY = pivY + Math.sin(armA) * S * 0.66;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#c9bda2';
  ctx.lineWidth = Math.max(1.8, cs * 0.16);
  ctx.beginPath();
  ctx.moveTo(pivX - dir * Math.cos(armA) * S * 0.16, pivY - Math.sin(armA) * S * 0.16);  // đuôi cần (đối trọng)
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = dark;                              // đối trọng
  ctx.beginPath();
  ctx.arc(pivX - dir * Math.cos(armA) * S * 0.19, pivY - Math.sin(armA) * S * 0.19, S * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Gàu ở đầu cần: một cái chén hở miệng, không phải một cái chấm.
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.2, cs * 0.1);
  ctx.beginPath();
  ctx.arc(tipX, tipY, S * 0.13, armA - Math.PI * 0.15, armA + Math.PI * 1.15);
  ctx.stroke();
  ctx.lineCap = 'butt';
  if (load > 0.8) {                                  // hòn đá đã nạp
    ctx.fillStyle = '#8c8f89';
    ctx.beginPath(); ctx.arc(tipX, tipY, S * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5f6360'; ctx.lineWidth = 1; ctx.stroke();
  }
  // ---- KÍP VẬN HÀNH (người ĐẦU) ---- vẽ SAU thân máy, đứng lệch về phía bắn.
  drawCrewman(cx + dir * S * 0.56, baseY + S * 0.42, S * 0.44, tribe, load, -dir, cs);
  // ---- MỘC CHẮN (cấp 2) ---- vẽ SAU cả người: tấm ván đứng CHE anh ta tới ngang
  // ngực, và chính chỗ bị che là thứ nói ra công dụng của nó. Cao 0,52·S chứ không
  // cao hơn — che hết cả đầu thì mất luôn người, mà mất người thì mất cái mẫu đối
  // chứng duy nhất cho biết cỗ máy này to tới đâu.
  drawSiegePavise(tribe, cx + dir * S * 0.66, baseY + S * 0.42, S, dir, cs, lv);

  if (u.hp < u.maxHp) {
    const w = S * 0.8, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// NỎ THẦN — cùng bộ khung với máy bắn đá, ngược hẳn về ĐƯỜNG NÉT
// ============================================================
// Hai cỗ máy ra lò từ cùng một Xưởng thợ nên chúng phải trông CÙNG HỌ (cùng bánh
// xe nan hoa, cùng sàn gỗ, cùng dải màu bộ lạc chạy ngang). Nhưng chúng trả lời hai
// câu hỏi khác nhau, nên hình bóng phải khác nhau ở một nét đọc được từ xa:
//   · máy bắn đá — CẦN BẮN CHĨA LÊN TRỜI. Đường cong, đạn bay vòng cầu.
//   · nỏ thần    — CÁNH NỎ NẰM NGANG. Hai vạch thẳng vuông góc nhau, đạn bay thẳng.
// Đứng - nằm là cặp đối lập mà mắt phân biệt được nhanh nhất, kể cả ở tám điểm ảnh,
// và nó cũng ĐÚNG với cơ chế: một cái bắn cầu vồng qua đầu quân nhà, một cái bắn
// xuyên theo đường thẳng.
function drawBallista(u, tribe, cx, cy, px, py, cs) {
  // 1,95 -> 2,45 (3.31) -> 1,95 (3.32). Lùi cùng nhịp với máy bắn đá và cùng một lý
  // do (xem drawCatapult): hai cỗ máy chung nhánh nghiên cứu nên chúng phải chung cả
  // hệ số phóng to, nếu không thì một lần chỉnh cỡ sẽ lặng lẽ đảo tương quan giữa
  // chúng. Khoảng cách 2,15 / 1,95 giữ nguyên điều cần nói: nỏ thần là cỗ máy CHÍNH
  // XÁC, máy bắn đá là cỗ máy NẶNG.
  const S = cs * 1.95 * effScale(u);
  drawShadow(cx, cy + S * 0.38, S * 0.48, S * 0.18);   // neo theo S — xem drawCatapult
  const dir = u.facingX >= 0 ? 1 : -1;
  const baseY = cy + S * 0.18;
  const lv = siegeLevel(u);
  const dark = '#3a2418', wood = '#8d6e63', woodHi = '#a5826f';
  // Dây nỏ kéo căng dần theo hồi chiêu — cùng nguồn `u.cooldown` với cần bắn của
  // máy bắn đá, nên hoạt ảnh không thể lệch pha với cơ chế.
  const load = u.atkCooldown ? clamp(1 - u.cooldown / u.atkCooldown, 0, 1) : 1;

  // ---- CỜ ĐUÔI NHEO (cấp 3) ---- xem drawCatapult: vẽ trước để sàn xe che chân cán.
  drawSiegeBanner(tribe, cx - dir * S * 0.40, baseY + S * 0.24, S, dir, cs, lv);

  // ---- BÁNH XE (hai bánh, cùng ngôn ngữ hình với máy bắn đá) ----
  for (const off of [-0.30, 0.26]) {
    const wx = cx + S * off, wy = baseY + S * 0.20, wr = S * 0.17;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
    if (lv >= 1) {                             // VÀNH SẮT — dấu cấp 1
      ctx.strokeStyle = '#7d868f';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath(); ctx.arc(wx, wy, wr * 0.9, 0, Math.PI * 2); ctx.stroke();
    }
    if (cs >= 5) {
      ctx.strokeStyle = woodHi;
      ctx.lineWidth = Math.max(0.8, cs * 0.05);
      ctx.beginPath();
      const ph = (u.x + u.y) * 0.9;
      for (let k = 0; k < 3; k++) {
        const a = ph + k * Math.PI / 3;
        ctx.moveTo(wx - Math.cos(a) * wr * 0.82, wy - Math.sin(a) * wr * 0.82);
        ctx.lineTo(wx + Math.cos(a) * wr * 0.82, wy + Math.sin(a) * wr * 0.82);
      }
      ctx.stroke();
    }
    ctx.fillStyle = tribe.dark;
    ctx.beginPath(); ctx.arc(wx, wy, wr * 0.34, 0, Math.PI * 2); ctx.fill();
  }

  // ---- KÍP VẬN HÀNH (người ĐUÔI) ---- vẽ TRƯỚC sàn xe, xem drawCrewman.
  drawCrewman(cx - dir * S * 0.58, baseY + S * 0.38, S * 0.48, tribe, 1 - load, dir, cs);

  // ---- SÀN XE + dải màu bộ lạc ----
  ctx.fillStyle = wood;
  ctx.fillRect(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.20);
  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.08);
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, cs * 0.08);
  ctx.strokeRect(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.20);
  drawSiegeBands(cx - S * 0.42, baseY - S * 0.02, S * 0.84, S * 0.20, cs, lv);

  // ---- TRỤ XOAY + MÁNG NGẮM ----
  // Máng nằm NGANG, chĩa theo hướng nhìn: đây là nét định danh của cả cỗ máy.
  const pivX = cx - dir * S * 0.10, pivY = baseY - S * 0.26;
  ctx.strokeStyle = wood;
  ctx.lineWidth = Math.max(1.4, cs * 0.12);
  ctx.beginPath();
  ctx.moveTo(pivX, baseY - S * 0.02); ctx.lineTo(pivX, pivY);
  ctx.stroke();
  ctx.fillStyle = '#c9bda2';
  ctx.fillRect(pivX - (dir < 0 ? S * 0.72 : 0), pivY - S * 0.05, S * 0.72, Math.max(1.4, S * 0.10));

  // ---- CÁNH NỎ ---- hai cánh cong ngược, vuông góc với máng.
  const bowX = pivX + dir * S * 0.30;
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.4, cs * 0.11);
  ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bowX, pivY);
    ctx.quadraticCurveTo(bowX + dir * S * 0.10, pivY + sgn * S * 0.22,
                         bowX - dir * S * 0.04, pivY + sgn * S * 0.40);
    ctx.stroke();
  }
  // DÂY NỎ: kéo về sau khi đang nạp, bật thẳng khi vừa bắn. Khoảng cách giữa dây
  // và cánh nỏ là toàn bộ hoạt ảnh của cỗ máy này — không có nó thì nó là một vật
  // tĩnh, và một vũ khí tĩnh trông như một mảnh xác tàu.
  const draw = (1 - load) * S * 0.30;
  ctx.strokeStyle = '#e8e2d2';
  ctx.lineWidth = Math.max(0.9, cs * 0.055);
  ctx.beginPath();
  ctx.moveTo(bowX - dir * S * 0.04, pivY - S * 0.40);
  ctx.lineTo(bowX - dir * draw, pivY);
  ctx.lineTo(bowX - dir * S * 0.04, pivY + S * 0.40);
  ctx.stroke();
  // Mũi lao đã lắp: một tam giác dài, chĩa đúng hướng bắn.
  if (load > 0.45) {
    ctx.fillStyle = '#d7ccb4';
    ctx.beginPath();
    ctx.moveTo(bowX + dir * S * 0.30, pivY);
    ctx.lineTo(bowX - dir * S * 0.16, pivY - S * 0.055);
    ctx.lineTo(bowX - dir * S * 0.16, pivY + S * 0.055);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
  // ---- KÍP VẬN HÀNH (người ĐẦU) ---- vẽ SAU thân máy, đứng lệch về phía bắn.
  drawCrewman(cx + dir * S * 0.54, baseY + S * 0.40, S * 0.44, tribe, load, -dir, cs);
  // ---- MỘC CHẮN (cấp 2) ---- xem drawCatapult.
  drawSiegePavise(tribe, cx + dir * S * 0.64, baseY + S * 0.40, S, dir, cs, lv);

  if (u.hp < u.maxHp) {
    const w = S * 0.8, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// VOI CHIẾN — sprite lớn nhất trong nhóm quân, và nó PHẢI lớn nhất
// ============================================================
// Vẽ 2,6·cs, hơn cả máy bắn đá (2,15) và ngựa kỵ binh (1,95). Đây không phải
// chuyện phô trương: động từ của con voi là GIẪM ĐẠP MỌI THỨ NÓ ĐI QUA trong bán
// kính 1,9 ô, và người xem chỉ đọc ra được cơ chế đó nếu cái bóng của nó TRÔNG như
// nó phủ ngần ấy chỗ. Một con voi vẽ bằng người lính thì cú giẫm đọc ra là "mấy
// người quanh đó tự nhiên mất máu" — tức là đọc ra một lỗi, không phải một cơ chế.
// Cùng lý lẽ đã viết khi máy bắn đá được phóng từ 1,35 lên 2,15.
function drawElephant(u, tribe, cx, cy, px, py, cs) {
  const S = cs * 2.6;
  const dir = u.facingX >= 0 ? 1 : -1;
  drawShadow(cx, cy + cs * 0.6, S * 0.46, S * 0.17);
  // Nhịp bước: voi lắc chậm và nặng. Chu kỳ dài gần gấp đôi ngựa (0,10 so với
  // 0,19 ở drawHorse) — dáng đi là thứ nói "nặng" trước cả kích thước.
  const moving = unitStride(u) > 0;
  const gait = moving ? Math.sin(aTick * 0.10 + u.id) : 0;
  const bob = gait * S * 0.022;
  // Thân nâng CAO hẳn so với bản đầu (-0,06·S -> -0,22·S). Bản đầu để thân sà
  // xuống nên bốn cái chân chỉ còn thò ra 0,29·cs — nhìn ra màn hình con voi là
  // một cục xám không chân, và "khối nặng có bốn cột chống" mới là thứ nói ra
  // rằng nó GIẪM được. Đây là cùng bài học kích thước ở máy bắn đá, nhưng về
  // TỈ LỆ TRONG sprite chứ không về tổng kích thước.
  const bodyY = cy - S * 0.22 + bob;
  const footY = cy + cs * 0.55;

  const hide = '#6e6a66', hideDark = '#514e4b', hideHi = '#87827c';

  // ---- BỐN CHÂN CỘT ---- hai cặp lệch pha, dày và thẳng đứng.
  ctx.fillStyle = hideDark;
  const legW = S * 0.11, legTop = bodyY + S * 0.10;
  for (const [ox, ph] of [[-0.24, 0], [-0.09, Math.PI], [0.12, Math.PI], [0.26, 0]]) {
    const sw = moving ? Math.sin(aTick * 0.10 + u.id + ph) * S * 0.045 : 0;
    ctx.fillRect(cx + S * ox - legW / 2 + sw, legTop, legW, footY - legTop);
    // Bàn chân bè ra: một gạch ngang dày ở đáy mỗi cột. Không có nó thì bốn cái
    // chân là bốn hình chữ nhật cụt, và con voi trông như đang đứng trên cà kheo.
    ctx.fillRect(cx + S * ox - legW * 0.78 + sw, footY - S * 0.045, legW * 1.56, S * 0.045);
  }

  // ---- THÂN ---- một khối bầu dục lớn, đây là mảng màu chính.
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, S * 0.38, S * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hideHi;                       // vệt sáng lưng
  ctx.beginPath();
  ctx.ellipse(cx - dir * S * 0.05, bodyY - S * 0.10, S * 0.26, S * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // ĐUÔI: một nét mảnh phía sau. Rẻ, và nó cho cái khối một ĐẦU và một ĐUÔI —
  // thiếu nó thì ở cỡ nhỏ con voi đối xứng và mắt không đọc ra nó đang quay hướng nào.
  ctx.strokeStyle = hideDark;
  ctx.lineWidth = Math.max(1, S * 0.035);
  ctx.beginPath();
  ctx.moveTo(cx - dir * S * 0.36, bodyY - S * 0.04);
  ctx.quadraticCurveTo(cx - dir * S * 0.46, bodyY + S * 0.06, cx - dir * S * 0.42, bodyY + S * 0.20);
  ctx.stroke();

  // ---- ĐẦU + TAI + VÒI + NGÀ ---- bốn nét định danh, thứ tự vẽ là một quyết định:
  // tai (sau) -> đầu -> NGÀ -> VÒI (trước cùng). Bản đầu vẽ vòi trước rồi ngà đè
  // lên, và vì hai cái ngà chỉ lệch nhau 0,03·S nên chúng chồng thành MỘT vạch
  // trắng dày nằm ngang che kín cả cái vòi — con voi ra hình một khối xám cắm một
  // que trắng. Ngà phải mảnh, phải TÁCH XA nhau, và phải nằm DƯỚI cái vòi.
  const hx = cx + dir * S * 0.36, hy = bodyY + S * 0.06;
  // TAI: cái đĩa lớn phía sau đầu. Nét đọc-ra-voi nhanh nhất ở cỡ nhỏ, nhanh hơn
  // cả cái vòi — vì nó là một MẢNG, còn vòi chỉ là một đường.
  ctx.fillStyle = hideDark;
  ctx.beginPath();
  ctx.ellipse(hx - dir * S * 0.11, hy - S * 0.03, S * 0.145, S * 0.175, dir * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(hx, hy, S * 0.155, S * 0.175, 0, 0, Math.PI * 2);
  ctx.fill();

  if (cs >= 5) {
    const stomp = u.trampledAt && aTick - u.trampledAt < 14
      ? 1 - (aTick - u.trampledAt) / 14 : 0;
    // NGÀ — mảnh, cong, và tách hẳn nhau: một cái chìa cao, một cái chìa thấp.
    // Hai đường KHÔNG song song là thứ cho cặp ngà chiều sâu ở một sprite phẳng.
    ctx.strokeStyle = '#e6dfcc';
    ctx.lineCap = 'round';
    for (const [drop, len, w] of [[0.02, 0.26, 0.032], [0.09, 0.22, 0.028]]) {
      ctx.lineWidth = Math.max(1, S * w);
      ctx.beginPath();
      ctx.moveTo(hx + dir * S * 0.09, hy + S * (0.06 + drop));
      ctx.quadraticCurveTo(hx + dir * S * (0.09 + len * 0.7), hy + S * (0.12 + drop),
                           hx + dir * S * (0.09 + len), hy + S * (0.04 + drop));
      ctx.stroke();
    }
    // VÒI — vẽ SAU CÙNG nên nó nằm trước cặp ngà, đúng như thật. Buông cong xuống
    // gần tới đất rồi hất lên ở mũi; vung mạnh hơn hẳn khi vừa giẫm ai đó. Hoạt
    // ảnh đọc từ `trampledAt` (đặt trong tickSoldier) nên nó chỉ động đúng lúc cơ
    // chế thật sự chạy, không phải một chuyển động trang trí chạy suốt.
    ctx.strokeStyle = hide;
    ctx.lineWidth = Math.max(1.8, S * 0.085);
    ctx.beginPath();
    ctx.moveTo(hx + dir * S * 0.10, hy + S * 0.02);
    ctx.quadraticCurveTo(hx + dir * S * (0.26 + stomp * 0.06), hy + S * (0.30 - stomp * 0.22),
                         hx + dir * S * (0.30 + stomp * 0.10), hy + S * (0.10 - stomp * 0.34));
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Mắt: một chấm sẫm trên nền xám nhạt của đầu. Nhỏ nhưng nó là thứ biến cái
    // khối thành một con vật.
    ctx.fillStyle = '#241c16';
    ctx.beginPath();
    ctx.arc(hx + dir * S * 0.06, hy - S * 0.07, Math.max(0.9, S * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- BÀNH + CỜ BỘ LẠC ---- màu phe nằm ở ĐÂY, trên lưng, chỗ cao nhất và
  // không bị chân che. Con voi màu xám nên nếu không có tấm bành này thì hai bộ
  // lạc có voi trông y hệt nhau — mà "voi của ai" là thông tin đắt nhất lúc đó.
  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - S * 0.21, bodyY - S * 0.28, S * 0.42, S * 0.16);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(cx - S * 0.21, bodyY - S * 0.14, S * 0.42, Math.max(0.8, S * 0.035));
  if (cs >= 6) {
    ctx.strokeStyle = tribe.dark;                 // khung bành
    ctx.lineWidth = Math.max(0.9, S * 0.03);
    ctx.strokeRect(cx - S * 0.21, bodyY - S * 0.28, S * 0.42, S * 0.16);
    // Người quản tượng: đầu + thân nhỏ ngồi trên bành. Hai hình chứ không một
    // chấm — một chấm đơn độc trên nóc đọc ra là một cái núm, không ra một người.
    ctx.fillStyle = tribe.dark;
    ctx.fillRect(cx + dir * S * 0.02, bodyY - S * 0.40, S * 0.09, S * 0.13);
    ctx.fillStyle = '#e8dcc2';
    ctx.beginPath();
    ctx.arc(cx + dir * S * 0.065, bodyY - S * 0.44, Math.max(1, S * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- BỤI DƯỚI CHÂN khi đang giẫm ---- hình ảnh của cú giẫm nằm ở đây, KHÔNG ở
  // FX: một con voi giữa đám đông gây sát thương cho mọi người mỗi tick, nên nếu
  // mỗi nạn nhân nháy một chùm tia thì ngân sách FX_MAX (400) cháy trong ba tick
  // và mọi hiệu ứng khác trên bản đồ biến mất. Xem chú thích ở khối trample.
  if (u.trampledAt && aTick - u.trampledAt < 16 && cs >= 5) {
    const k = 1 - (aTick - u.trampledAt) / 16;
    ctx.fillStyle = `rgba(150,134,106,${(k * 0.4).toFixed(3)})`;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + u.id;
      const rr = S * (0.30 + (1 - k) * 0.28);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + cs * 0.5 + Math.sin(a) * rr * 0.34,
              S * 0.07 * k + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (u.hp < u.maxHp) {
    const w = cs * 1.9, h = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w / 2, py + cs + 1, w, h);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w / 2, py + cs + 1, w * r, h);
  }
}

// ============================================================
// QUÂN KỲ — người nhỏ, lá cờ to
// ============================================================
// Tỉ lệ cố ý ngược với mọi đơn vị khác: thân người vẽ đúng cỡ bộ binh, còn lá cờ
// cao gần bằng cả cái sprite. Lý do là nó phải đọc được TỪ XA trong lúc đứng lẫn
// giữa ba chục người — mà thứ duy nhất của nó khác người thường là lá cờ, nên toàn
// bộ ngân sách hình ảnh dồn vào đó.
//
// Cờ PHẤT theo aTick chứ không đứng yên: một lá cờ tĩnh trông như một cây gậy có
// miếng vải dính vào. Sóng cờ cũng là thứ duy nhất trên chiến trường chuyển động
// khi mọi thứ khác đứng chờ, nên mắt tự tìm tới nó — đúng chỗ ta muốn mắt nhìn.
function drawStandard(u, tribe, cx, cy, px, py, cs) {
  const S = cs * 1.5;
  const dir = u.facingX >= 0 ? 1 : -1;
  drawShadow(cx, cy + cs * 0.5, cs * 0.36, cs * 0.15);
  // `unitStride` là BIÊN ĐỘ sải chân, còn pha thì truyền riêng — cùng cách gọi với
  // bộ binh ở drawUnit. Trộn hai thứ đó vào một tham số (truyền thẳng một giá trị
  // sin vào ô biên độ) thì chân co giật thay vì bước đều, và lá cờ sẽ đi một kiểu
  // khác với cả hàng quân mà nó đang đứng cùng.
  const amp = unitStride(u);
  const phase = (aTick + u.id * 11) * 0.3;
  const bob = amp > 0 ? Math.abs(Math.sin(phase)) * cs * 0.06 : 0;
  const bodyY = cy - bob;

  // ---- CÁN CỜ ---- dựng hơi nghiêng về sau, như người vác.
  const poleX = cx - dir * S * 0.16;
  const poleTop = bodyY - S * 1.05;
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.1, cs * 0.09);
  ctx.beginPath();
  ctx.moveTo(poleX + dir * S * 0.05, bodyY + S * 0.30);
  ctx.lineTo(poleX, poleTop);
  ctx.stroke();

  // ---- LÁ CỜ ---- ba đoạn sóng, biên độ tăng dần về phía đuôi cờ. Vẽ bằng một
  // đường cong khép kín chứ không phải hình chữ nhật: chữ nhật không bao giờ trông
  // như vải, dù có nghiêng bao nhiêu.
  const w = S * 0.62, h = S * 0.44;
  const ph = aTick * 0.11 + u.id;
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.moveTo(poleX, poleTop);
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    ctx.lineTo(poleX + dir * w * t, poleTop + Math.sin(ph + t * 3.4) * S * 0.05 * t);
  }
  for (let i = 4; i >= 0; i--) {
    const t = i / 4;
    ctx.lineTo(poleX + dir * w * t, poleTop + h + Math.sin(ph + t * 3.4) * S * 0.07 * t);
  }
  ctx.closePath(); ctx.fill();
  // Viền tối phía dưới + một vệt sáng: cho lá vải có mặt sáng mặt tối, tức là có
  // hướng gió. Thiếu nó thì cờ là một mảng màu phẳng.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(poleX, poleTop + h * 0.72, dir * w, h * 0.28);
  if (cs >= 7) {
    // Con dấu bộ lạc giữa cờ — cùng ký hiệu với con dấu trên kinh đô (xem
    // drawCapitalSeal), nên người xem không phải học thêm một biểu tượng nào.
    ctx.fillStyle = tribe.dark;
    ctx.beginPath();
    ctx.arc(poleX + dir * w * 0.45, poleTop + h * 0.42, S * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  // Chóp cán: một mũi nhọn nhỏ, để cây cờ có điểm kết thúc.
  ctx.fillStyle = '#d8a544';
  ctx.beginPath();
  ctx.moveTo(poleX, poleTop - S * 0.13);
  ctx.lineTo(poleX - S * 0.05, poleTop);
  ctx.lineTo(poleX + S * 0.05, poleTop);
  ctx.closePath(); ctx.fill();

  // ---- NGƯỜI VÁC ---- cỡ bộ binh, dùng lại drawLegs để dáng đi khớp với cả hàng.
  drawLegs(cx, bodyY + S * 0.14, cy + cs * 0.5, cs, cs * 0.13, amp, phase, tribe.dark);
  ctx.fillStyle = tribe.color;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, cs * 0.22, cs * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8dcc2';                       // đầu
  ctx.beginPath();
  ctx.arc(cx, bodyY - cs * 0.36, cs * 0.17, 0, Math.PI * 2);
  ctx.fill();

  // ---- HÀO QUANG CỔ VŨ ---- một vòng cung mảnh dưới chân, đập theo nhịp. Nó là
  // thứ DUY NHẤT nói ra rằng lá cờ đang có tác dụng, và bán kính vẽ đúng bằng
  // `u.rallyR` thật — vẽ sai bán kính thì người xem học sai luật chơi, và một cơ
  // chế mà mắt không kiểm chứng được thì nó là phép thuật (xem chú thích thầy lang).
  if (cs >= 5 && u.rallyR > 0) {
    const p = 0.16 + 0.10 * Math.sin(aTick * 0.06 + u.id);
    ctx.strokeStyle = `rgba(216,165,68,${p.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cs * 0.07);
    ctx.beginPath();
    ctx.ellipse(cx, cy + cs * 0.45, u.rallyR * cs, u.rallyR * cs * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (u.hp < u.maxHp) {
    const w2 = cs * 1.4, h2 = Math.max(1.5, cs * 0.14);
    const r = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - w2 / 2, py + cs + 1, w2, h2);
    ctx.fillStyle = r > 0.5 ? '#5aa07c' : r > 0.25 ? '#e09a3c' : '#d05a44';
    ctx.fillRect(cx - w2 / 2, py + cs + 1, w2 * r, h2);
  }
}

// Anh hùng vẽ to hơn hẳn, có áo choàng, mũ chóp, và LUÔN có tên trên đầu. Trong
// một khung hình có hơn hai trăm chấm màu đang di chuyển, thứ duy nhất biến một
// đơn vị thành "nhân vật" là việc người xem gọi được tên nó.
// Ngựa của anh hùng. To hơn ngựa kỵ binh và mang bộ giáp ngựa màu bộ lạc — khi
// một anh hùng cưỡi ngựa đi cạnh một đội kỵ binh, phải đọc ra ngay ai là tướng.
function drawWarHorse(u, tribe, cx, cy, cs, S) {
  const dir = u.facingX >= 0 ? 1 : -1;
  // 1,15 -> 1,62. Ngựa tướng PHẢI to hơn ngựa kỵ binh một cách rõ ràng, và ở hệ số
  // cũ nó không hề: S của anh hùng là 1,55·cs còn của kỵ binh là 1,95·cs, nên
  // 1,15 × 1,55 = 1,78·cs chỉ nhỉnh hơn con ngựa kỵ binh (1,95·cs) có... không,
  // nó còn NHỎ HƠN. Con ngựa của tướng bé hơn ngựa lính là điều ngược hẳn với ý
  // đồ đã viết ngay trong chú thích của chính hàm này. 1,62 × 1,55 = 2,51·cs,
  // tức lớn hơn ngựa kỵ binh khoảng 29% — đủ để đọc ra khi hai con đứng cạnh nhau.
  const H = S * 1.62;
  const bodyY = cy + S * 0.30;
  drawShadow(cx, cy + cs * 0.68, H * 0.55, H * 0.2);

  // Nhịp chân CHẬM hơn kỵ binh (0,30 so với 0,42): ngựa tướng nặng hơn, và nhịp
  // khác nhau là cách phân biệt thứ hai khi cả hai cùng chạy trong một khung hình.
  const gait = Math.sin((aTick + u.id * 11) * 0.30);
  // Ngựa lùi lại một chút so với tâm ô, để NGƯỜI CƯỠI (vẽ ở đúng tâm ô) rơi vào
  // vùng vai-yên chứ không vào giữa lưng. Cổ và đầu ngựa vươn dài về phía trước
  // nên khối lượng hình dồn hẳn về đằng trước; không bù lại thì nhìn ra là ông
  // tướng ngồi trên mông ngựa.
  drawHorse(cx - dir * H * 0.10, bodyY, H, dir, gait, {
    hide: '#4a3a2b', legDark: '#2c2118', mane: '#241b13',
    barding: tribe.color, plume: '#c2412c'
  }, cs);
}

function drawHero(u, tribe, cx, cy, px, py, cs) {
  const S = cs * 1.55;
  // NGỰA CHIẾN: vẽ con ngựa TRƯỚC rồi nâng cả người lên trên lưng nó. Toàn bộ phần
  // còn lại của hàm không biết gì về con ngựa — nó chỉ nhận một `cy` đã dịch lên,
  // nên hình anh hùng (áo choàng, mũ chóp, tên trên đầu) giữ nguyên không sửa một
  // nét nào.
  //
  // Điều kiện giờ là THỜI ĐẠI, không phải một nhánh nghiên cứu. Nhờ vậy con ngựa
  // trở thành thứ đọc được ngay trên bản đồ về TIẾN ĐỘ của một bộ lạc: thấy tướng
  // cưỡi ngựa là biết bộ lạc đó đã qua Đồ Sắt, không cần mở bảng nào.
  const mounted = tribe.age >= CONFIG.HERO.MOUNT_AGE;
  // MẶT ĐẤT giữ lại trước khi nâng người lên lưng ngựa. Bóng đổ và vòng sáng phải
  // ở lại DƯỚI ĐẤT: chúng là hai thứ neo cả cụm hình vào mặt bản đồ, mà một cái
  // bóng bay lơ lửng ngang bụng con ngựa thì phá đúng cái neo đó. Bản trước dùng
  // chung `cy` đã dịch cho cả ba, và ở cỡ ngựa cũ (nhỏ) thì sai số còn nuốt được;
  // với con ngựa mới cao hơn 40% thì nó lộ ra ngay.
  const groundY = cy;
  if (mounted) {
    drawWarHorse(u, tribe, cx, cy, cs, S);
    // 0,34 -> 0,46 theo con ngựa mới. Đặt sao cho đáy thân người chìm khoảng một
    // phần tám vào lưng ngựa — ngồi trên yên thì hai chân phải khuất sau bụng
    // ngựa, chứ đứng hẳn trên lưng thì đọc ra là "người đứng trên con vật".
    cy -= S * 0.46;
  } else {
    drawShadow(cx, cy + cs * 0.55, S * 0.42, S * 0.18);   // ngựa đã tự đổ bóng rồi
  }

  // Vòng sáng dưới chân: vừa để nổi bật, vừa nhấp nháy nhanh hơn khi đang xông trận.
  const pulse = 0.55 + 0.45 * Math.sin(aTick * (u.retreating ? 0.08 : 0.2) + u.id);
  ctx.strokeStyle = tribe.color;
  ctx.globalAlpha = 0.35 + 0.3 * pulse;
  ctx.lineWidth = Math.max(1.5, cs * 0.16);
  ctx.beginPath();
  // "Dưới chân" của một người CƯỠI NGỰA là chỗ móng ngựa chạm đất, không phải mép
  // ô lưới. Con ngựa buông xuống tới groundY + 1,0·S (xem drawWarHorse), nên vẽ
  // vòng sáng ở mép ô là vẽ nó ngang BỤNG ngựa: nhìn ra màn hình thành một cái
  // vòng xỏ qua thân con vật, và nó cắt đúng khúc lườn — phần thân duy nhất còn
  // nhìn thấy được sau khi người cưỡi đã che mất phía trên.
  ctx.ellipse(cx, groundY + (mounted ? S * 1.0 : cs * 0.5),
              S * (mounted ? 0.62 : 0.5), S * (mounted ? 0.2 : 0.22), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const bob = Math.sin((aTick + u.id * 7) * 0.3) * cs * 0.06;
  // NGỒI TRÊN YÊN thì thân ngắn lại: một người ngồi cao bằng hai phần ba người
  // đứng. Không rút ngắn thì cái thân dài nguyên chiếm hết chiều cao con ngựa và
  // cả cụm đọc ra là "một người đứng chắn trước con ngựa".
  const bodyW = S * (mounted ? 0.54 : 0.62), bodyH = S * (mounted ? 0.6 : 0.78);
  const topY = cy - bodyH * 0.25 + bob;

  // CHÂN NGƯỜI CƯỠI, buông xuống sườn ngựa. Vẽ TRƯỚC thân để nó chui ra từ dưới
  // vạt áo. Một chi tiết, hai đoạn thẳng — nhưng nó là thứ biến "một cái hộp đặt
  // trên lưng ngựa" thành "một người đang cưỡi": mắt tìm điểm nối giữa người và
  // con vật, và nếu không có điểm nối nào thì hai khối đọc ra là hai vật rời.
  if (mounted) {
    const dirL = u.facingX >= 0 ? 1 : -1;
    ctx.strokeStyle = tribe.dark;
    ctx.lineWidth = Math.max(1.6, cs * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, topY + bodyH * 0.82);
    ctx.lineTo(cx + dirL * S * 0.17, topY + bodyH * 1.05);
    ctx.lineTo(cx + dirL * S * 0.13, topY + bodyH * 1.42);
    ctx.stroke();
    ctx.strokeStyle = '#2c2118';                    // ủng
    ctx.lineWidth = Math.max(1.8, cs * 0.18);
    ctx.beginPath();
    ctx.moveTo(cx + dirL * S * 0.09, topY + bodyH * 1.44);
    ctx.lineTo(cx + dirL * S * 0.20, topY + bodyH * 1.44);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Áo choàng bay phía sau — chi tiết rẻ nhất tạo cảm giác "tướng" thay vì "lính to".
  //
  // Khi CƯỠI NGỰA thì nó phải là một tấm choàng vai, không phải một cái áo dài
  // chấm đất. Đây là lỗi đo được ngay ở lần vẽ thử đầu tiên: tà áo cũ buông xuống
  // 1,15 lần chiều cao thân và loe ra 1,7 lần bề ngang, tức là nó phủ kín đúng cái
  // bụng ngựa — con ngựa vẽ xong rồi bị chính người cưỡi xoá đi, chỉ còn thò ra
  // bốn cái chân và cái đầu. Vẽ to con ngựa lên mà không sửa chỗ này thì càng to
  // càng không thấy.
  const capeLen = mounted ? 0.58 : 1.15;
  const capeFlare = mounted ? 0.62 : 0.85;
  ctx.fillStyle = tribe.dark;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.55, topY);
  ctx.lineTo(cx + bodyW * 0.55, topY);
  ctx.lineTo(cx + bodyW * capeFlare - u.facingX * bodyW * 0.3, topY + bodyH * capeLen);
  ctx.lineTo(cx - bodyW * capeFlare - u.facingX * bodyW * 0.3, topY + bodyH * capeLen);
  ctx.closePath();
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = tribe.color;
  ctx.fillRect(cx - bodyW / 2, topY, bodyW, bodyH);
  ctx.fillStyle = tribe.dark;
  ctx.fillRect(cx - bodyW / 2, topY, bodyW * 0.42, bodyH);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx - bodyW / 2, topY, bodyW, bodyH);

  ctx.fillStyle = '#f0cda6';
  ctx.beginPath();
  ctx.arc(cx, topY - S * 0.18, S * 0.24, 0, Math.PI * 2);
  ctx.fill();

  // Mũ + chỏm lông vàng: dấu hiệu "cấp bậc" đọc được kể cả ở zoom xa.
  ctx.fillStyle = '#d8a544';
  ctx.fillRect(cx - S * 0.27, topY - S * 0.34, S * 0.54, S * 0.16);
  ctx.beginPath();
  ctx.moveTo(cx, topY - S * 0.34);
  ctx.lineTo(cx - S * 0.1, topY - S * 0.62);
  ctx.lineTo(cx + S * 0.1, topY - S * 0.62);
  ctx.closePath();
  ctx.fill();

  // ĐẠI ĐAO. Lui quân thì dựng đứng bên người (không giao chiến — cây đao phải nói
  // ra điều đó), còn khi đánh thì bổ theo cùng quỹ đạo của rìu bộ binh nhưng dài
  // hơn, nặng hơn, và kéo theo một vệt vàng thay vì vệt trắng: cùng một động tác,
  // nhưng nhìn qua là biết ai trong đám đông kia là anh hùng.
  const dir = u.facingX >= 0 ? 1 : -1;
  const hx = cx + dir * bodyW * 0.5, hy = cy + bob;
  if (u.retreating) {
    ctx.strokeStyle = '#e2ddd0';
    ctx.lineWidth = Math.max(2, cs * 0.17);
    ctx.beginPath();
    ctx.moveTo(hx, hy); ctx.lineTo(cx + dir * bodyW * 0.72, cy - S * 0.9 + bob);
    ctx.stroke();
  } else {
    const k = swingK(u);
    const ang = AXE_READY + (AXE_HIT - AXE_READY) * swingChop(k);
    const L = S * 1.02;
    const vx = Math.cos(ang) * dir, vy = Math.sin(ang);
    const tx = hx + vx * L, ty = hy + vy * L;
    drawSwingTrail(k, hx, hy, L * 0.96, AXE_READY, AXE_HIT, dir,
                   '#f0cf85', Math.max(1.4, cs * 0.24));
    // Lưỡi đao thon: bản dày ở chuôi, vuốt nhọn ở mũi. Vẽ bằng hai nét chồng độ dày
    // khác nhau chứ không bằng một đa giác — ở cỡ này một đa giác bốn đỉnh và một
    // nét vuốt cho ra cùng một chỗ pixel, mà nét thì không có đỉnh để mà lệch.
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8d7358';                                   // chuôi
    ctx.lineWidth = Math.max(1.4, cs * 0.13);
    ctx.beginPath();
    ctx.moveTo(hx - vx * S * 0.16, hy - vy * S * 0.16);
    ctx.lineTo(hx + vx * S * 0.2, hy + vy * S * 0.2);
    ctx.stroke();
    ctx.strokeStyle = '#e2ddd0';                                   // lưỡi
    ctx.lineWidth = Math.max(2, cs * 0.19);
    ctx.beginPath();
    ctx.moveTo(hx + vx * S * 0.2, hy + vy * S * 0.2); ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#fbf5e6';                                   // ánh thép trên sống đao
    ctx.lineWidth = Math.max(0.8, cs * 0.07);
    ctx.beginPath();
    ctx.moveTo(hx + vx * S * 0.32, hy + vy * S * 0.32); ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Tên + đời. Xám khi đang rút lui — nhìn màu chữ là biết ông này đang xông lên
  // hay đang chạy về, không cần mở bảng bên phải.
  if (cs >= 5) {
    queueLabel(u.retreating ? `${u.name} ↩` : u.name, cx, topY - S * 0.75,
               `700 ${Math.max(9, Math.round(cs * 1.15))}px ${F_UI}`,
               u.retreating ? '#8d9490' : '#d8a544', 2);
  }

  // Thanh máu LUÔN hiện (khác lính/dân chỉ hiện khi đã mất máu): tính mạng anh
  // hùng là biến số kịch tính nhất trên bản đồ, giấu đi thì mất hết hồi hộp.
  //
  // Chân thanh máu phải nằm DƯỚI MÓNG NGỰA, không phải dưới ô lưới. `py + cs` là
  // mép dưới của Ô — đúng cho một người đi bộ, sai hẳn cho một người ngồi trên
  // con vật cao gấp rưỡi cái ô: thanh máu rơi vào đúng giữa bụng ngựa và đọc ra
  // thành một cái đai vàng vắt ngang con ngựa. Móng ngựa ở khoảng mặt-đất + 1,0·S
  // (xem drawWarHorse: bodyY = cy + 0,30·S, chân dài 0,44·H, H = 1,62·S).
  const barY = py + cs + 1 + (mounted ? S * 0.72 : 0);
  const w = S * 1.15, h = Math.max(2, cs * 0.16);
  const r = clamp(u.hp / u.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(cx - w / 2, barY, w, h);
  ctx.fillStyle = r > 0.5 ? '#d8a544' : r > 0.25 ? '#e09a3c' : '#d05a44';
  ctx.fillRect(cx - w / 2, barY, w * r, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2, barY, w, h);
}

