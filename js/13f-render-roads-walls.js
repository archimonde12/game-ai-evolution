'use strict';
// ============================================================
// 13f-render-roads-walls.js
// ------------------------------------------------------------
// Mặt đường (phiến đá rời, 4 diện mạo theo thời đại) + tường thành + cổng.
// Tách từ 13-render-world.js (Phase 3.43) — xem 13-render-terrain.js.
// ============================================================
// ============================================================
// ĐƯỜNG CÁI — mặt đường vẽ thành từng PHIẾN ĐÁ RỜI
// ============================================================
// Yêu cầu gốc: "phải xây thành dải nhưng không được xây liền... nhìn đẹp mắt và
// hiệu quả chứ không phải lát hết đường cái toàn khu vực". Ba luật ở phía LOGIC
// (tuyến rộng 1 ô, luật chống phình, trần ngân sách — xem CONFIG.ROAD) lo phần
// "không lát hết khu vực". Hàm này lo phần còn lại: KHÔNG ĐƯỢC TRÔNG NHƯ MỘT DẢI
// BÊ TÔNG.
//
// Cách làm: mỗi ô đường là hai-ba phiến đá nhỏ, xoay lệch và lệch tâm theo một
// hàm băm của chính toạ độ ô. Vì sao băm theo toạ độ chứ không bốc ngẫu nhiên mỗi
// khung hình — nếu bốc mỗi khung thì cả con đường rung lên như nhiễu tivi. Băm
// theo toạ độ thì mỗi viên đá đứng yên vĩnh viễn ở chỗ của nó, mà cả con đường
// vẫn không có hai viên nào giống nhau. Cùng thủ thuật với `pigment` và `hash01`
// đã dùng cho nền bản đồ, và dùng lại luôn hàm đó để hai lớp có cùng "hạt" nhiễu.
//
// Nền đường vẫn được tô một dải mờ liền mạch BÊN DƯỚI đám phiến đá, và đó không
// mâu thuẫn với "không liền": nó là VỆT ĐẤT BỊ GIẪM MÒN, thứ có thật ở mọi con
// đường mòn, và nó là thứ giữ cho con đường đọc ra là một tuyến liên tục ở mức
// zoom xa — chỗ mà từng viên đá đã nhỏ hơn một điểm ảnh.
// ------------------------------------------------------------------
// BỐN DIỆN MẠO, MỘT CHO MỖI THỜI ĐẠI CÓ ĐƯỜNG (Phase 3.28)
// ------------------------------------------------------------------
// Cấp đọc theo thời đại của BỘ LẠC CHỦ, nên cả mạng đường của một bộ lạc đổi mặt
// cùng một lúc ngay tại tick nó lên đời — cùng nhịp với đợt trùng tu nhà cửa.
//
// Vì sao bốn diện mạo mà chỉ ba bậc tốc (xem ROAD.SPEED_BY_AGE): Thiên Triều
// không cần nhanh thêm nữa (2,5 đã ngang kỵ binh) nhưng nếu nó nhìn y hệt Hoàng
// Kim thì với mắt người, bậc năm không tồn tại. Bài học Phase 3.14 đọc theo chiều
// ngược: ở đó một thay đổi NHÌN THẤY mà mô phỏng không có là nói dối; ở đây một
// thay đổi có thật mà không nhìn thấy được thì cũng bằng không có.
//
// Bốn bậc đi theo đúng một trục — MẶT ĐƯỜNG NGÀY CÀNG LIỀN VÀ CÀNG THẲNG:
//   Đồ Đồng   — đường mòn đất: chỉ vệt giẫm mòn + vài hòn sỏi rời, không phiến đá
//   Đồ Sắt    — lát đá: phiến rời xoay lệch (đúng diện mạo của bản trước)
//   Hoàng Kim — đá phiến ghép: phiến to, khít, cộng hai vệt LỀ ĐƯỜNG hai bên
//   Thiên Triều — ngự đạo: như trên, cộng vạch giữa men ngọc chạy dọc tuyến
// Trục đó là trục mà mắt đọc được KHÔNG CẦN VẬT MẪU ĐỨNG CẠNH: "rời rạc hay liền
// mạch" là một phán đoán tại chỗ, còn "màu này đậm hơn màu hôm qua" thì không.
// Tra bằng THỜI ĐẠI (1..5), nên phải có ĐỦ 6 ô kể cả ô 0 bỏ trống — cùng quy ước
// với popByAge, MAX_CELLS và SPEED_BY_AGE.
//
// Bản đầu chỉ có 5 phần tử, và cái lỗi đó không hề ném ra một dòng nào: `ctx.fillStyle
// = undefined` KHÔNG phải lỗi trong canvas, nó lặng lẽ GIỮ NGUYÊN màu đang có — mà
// màu đang có là màu cuối cùng của ô liền trước, tức men ngọc của vạch giữa. Kết quả
// trên màn hình là toàn bộ ngự đạo Thiên Triều bị tô xanh đặc. Cùng họ với ba lần
// NaN im lặng trong dự án này (biên giới lãnh thổ, điểm nâng cấp, đếm kho): một bảng
// tra thiếu đúng một khoá, và cái sai hiện ra ở cách đó vài lớp.
const ROAD_DUST = [
  'rgba(120,102,74,0.30)',   // 0 — không dùng
  'rgba(120,102,74,0.30)',   // 1 — không dùng (MIN_AGE = 2)
  'rgba(120,102,74,0.22)',   // 2 Đồ Đồng   — vệt đất mờ
  'rgba(120,102,74,0.30)',   // 3 Đồ Sắt
  'rgba(108,96,76,0.38)',    // 4 Hoàng Kim — nền sẫm hơn, mặt đường dày
  'rgba(96,88,74,0.44)'      // 5 Thiên Triều
];
const ROAD_SLAB = ['#a2937c', '#8d8069', '#b3a58c'];
const ROAD_KERB = '#7d7259';
const ROAD_JADE = '#3f7f74';
const ROAD_JADE_KERB = '#37675f';   // lề men ngọc của ngự đạo Thiên Triều

// Cấp mặt đường theo thời đại chủ. Kẹp hai đầu vì đúng lý do đã viết ở
// roadSpeedMult: một tribeId lạ không được phép ra `undefined`.
function roadTier(tribeId) {
  const t = tribes[tribeId];
  return clamp(t ? (t.age || CONFIG.ROAD.MIN_AGE) : CONFIG.ROAD.MIN_AGE, 2, 5);
}

function drawRoads(cs) {
  if (!roadCells.size) return;
  // Ở mức zoom rất xa, từng viên đá nhỏ hơn một điểm ảnh — vẽ chúng chỉ tốn tiền
  // để ra một dải xám bẩn. Dưới ngưỡng này chỉ tô vệt đất.
  const detailed = cs >= 5;
  // Cấp tra sẵn MỘT LẦN cho cả khung hình thay vì mỗi ô một lần: hàm này chạy trên
  // vài trăm tới vài nghìn ô mỗi khung, và `tribes[id].age` thì cả nghìn tick mới
  // đổi một lần. Cùng thủ thuật đã dùng cho `tierOf` ở mọi vòng vẽ nóng khác.
  const tierOf = tribes.map((t, i) => roadTier(i));
  for (const r of roadCells.values()) {
    const [px, py] = worldToPx(r.x, r.y);
    if (!inView(px, py, cs * 2)) continue;
    const tier = tierOf[r.tribeId] || 2;
    // `|| ROAD_DUST[2]` là cái lưới an toàn cho đúng lỗi vừa mô tả ở bảng trên: gán
    // một giá trị không hợp lệ cho fillStyle thì canvas im lặng dùng lại màu cũ, nên
    // một khoá thiếu sẽ không bao giờ tự tố cáo. Một dòng, và nó biến "cả con đường
    // sai màu" thành "một cấp đường trông như cấp 2".
    ctx.fillStyle = ROAD_DUST[tier] || ROAD_DUST[2];
    ctx.fillRect(px, py, cs + 0.6, cs + 0.6);      // +0,6 để hai ô kề nhau không hở chỉ
    if (!detailed) continue;
    const h1 = hash01(r.x, r.y), h2 = hash01(r.x + 71, r.y - 13), h3 = hash01(r.x - 29, r.y + 47);

    // ---- Đồ Đồng: ĐƯỜNG MÒN ĐẤT, không có phiến nào -----------------------------
    // Cố tình KHÔNG phải "phiến đá nhỏ hơn": một con đường đất và một con đường lát
    // đá thưa trông giống nhau ở mức zoom chơi thật, và lúc đó bậc một với bậc hai
    // là một. Bỏ hẳn phiến đá đi thì khác biệt nằm ở chỗ CÓ hay KHÔNG, thứ mắt
    // không thể đọc sai.
    if (tier <= 2) {
      if (cs >= 7) {
        ctx.fillStyle = 'rgba(150,134,104,0.30)';
        for (let i = 0; i < 3; i++) {
          const gx = hash01(r.x + i * 13, r.y - i * 29), gy = hash01(r.x - i * 7, r.y + i * 37);
          const gr = Math.max(0.7, cs * (0.05 + gx * 0.05));
          ctx.beginPath();
          ctx.arc(px + cs * (0.15 + gx * 0.7), py + cs * (0.15 + gy * 0.7), gr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      continue;
    }

    // ---- Đồ Sắt trở lên: PHIẾN ĐÁ ------------------------------------------------
    // Bậc 4-5 dùng phiến TO và KHÍT hơn (cùng một vòng lặp, hai bộ hệ số), nên mặt
    // đường đọc ra là một mặt phẳng liên tục chứ không phải một chuỗi hòn đá.
    const paved = tier >= 4;
    const n = paved ? 2 : 2 + (h1 > 0.62 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const hx = hash01(r.x + i * 17, r.y - i * 23);
      const hy = hash01(r.x - i * 31, r.y + i * 11);
      const w = paved ? cs * (0.42 + hx * 0.12) : cs * (0.30 + hx * 0.20);
      const hgt = paved ? cs * (0.34 + hy * 0.10) : cs * (0.24 + hy * 0.18);
      const ox = paved ? cs * (0.26 + hx * 0.48) - w * 0.5 : cs * (0.10 + hx * 0.55) - w * 0.5;
      const oy = paved ? cs * (0.28 + hy * 0.44) - hgt * 0.5 : cs * (0.12 + hy * 0.58) - hgt * 0.5;
      ctx.fillStyle = ROAD_SLAB[Math.floor((h2 + i * 0.33) * 3) % 3];
      ctx.fillRect(px + ox, py + oy, w, hgt);
      // Vệt sáng mép trên: đủ để mắt đọc ra "viên đá có bề dày" chứ không phải
      // "ô vuông màu xám". Một dòng, và nó là khác biệt giữa lát đá và tô màu.
      if (cs >= 8) {
        ctx.fillStyle = 'rgba(255,247,230,0.22)';
        ctx.fillRect(px + ox, py + oy, w, Math.max(0.6, hgt * 0.22));
      }
    }
    // Một viên sẫm hơn hẳn ở vài ô: chỗ đá cũ, rêu bám. Rải thưa (12%) nên nó là
    // gia vị chứ không thành hoa văn. Bậc 4-5 thì thưa hơn nữa — ngự đạo có người quét.
    if (cs >= 8 && h3 > (paved ? 0.95 : 0.88)) {
      ctx.fillStyle = 'rgba(74,86,62,0.34)';
      ctx.fillRect(px + cs * 0.3, py + cs * 0.34, cs * 0.3, cs * 0.24);
    }

    // ---- Hoàng Kim: LỀ ĐƯỜNG · Thiên Triều: VẠCH GIỮA MEN NGỌC -------------------
    //
    // CẢ HAI nét này chạy DỌC THEO TUYẾN, nên cả hai đều phải biết con đường đi
    // hướng nào — và đó là chỗ bản đầu sai. Đường được lưu theo Ô, không theo tuyến
    // (xem chú thích ở roadCells: "hỏi điểm này có đường không" là câu hỏi nóng
    // nhất), nên một cái lề vẽ ở "mép trái và mép phải Ô" chạy VUÔNG GÓC với con
    // đường ngang: ra một cái thang có nấc, không ra một con đường có bờ. Đo ra
    // bằng cách vẽ thử bốn cấp cạnh nhau, và nó lộ ngay từ khung hình đầu tiên.
    //
    // Hướng suy ra từ HAI ô kề: có ô đường bên trái/phải thì tuyến chạy ngang. Rẻ
    // (hai phép tra Map) và luôn đúng theo định nghĩa, vì tuyến rộng đúng 1 ô. Ở
    // khúc cua thì cả hai đều đúng và cả hai nét được vẽ — ra một góc vuông, đúng
    // như một khúc cua thật.
    if (paved) {
      const horiz = roadCells.has((r.x - 1) + ',' + r.y) || roadCells.has((r.x + 1) + ',' + r.y);
      const vert  = roadCells.has(r.x + ',' + (r.y - 1)) || roadCells.has(r.x + ',' + (r.y + 1));
      const kw = Math.max(0.7, cs * 0.09);
      // Thiên Triều lát LỀ bằng men ngọc, không chỉ kẻ vạch giữa. Vạch giữa là nét
      // ĐỨT nên nó biến mất trước tiên khi thu nhỏ — mà mức zoom người ta thật sự
      // ngồi xem (cs 9-14) đã gần đúng chỗ nó biến mất. Cái lề thì chạy LIÊN TỤC
      // qua mọi ô, nên nó còn đọc được ở cỡ mà từng viên đá đã tan hết. Bậc năm
      // cần một tín hiệu sống ở dải zoom đó, không phải một tín hiệu chỉ đẹp lúc
      // soi gần.
      ctx.fillStyle = tier >= 5 ? ROAD_JADE_KERB : ROAD_KERB;
      // Ô lẻ loi (không kề ai) coi như ngang — phải có một mặc định, nếu không thì
      // đúng những ô đầu tuyến sẽ trơ ra không có lề.
      if (horiz || !vert) {
        ctx.fillRect(px, py, cs + 0.6, kw);
        ctx.fillRect(px, py + cs + 0.6 - kw, cs + 0.6, kw);
      }
      if (vert) {
        ctx.fillRect(px, py, kw, cs + 0.6);
        ctx.fillRect(px + cs + 0.6 - kw, py, kw, cs + 0.6);
      }
      // Vạch giữa men ngọc — cùng sắc với mái ngói bậc năm (AGE_MAT[5]). Bậc năm
      // của hai hệ thống khác nhau phải nói cùng một câu, nếu không thì "Thiên
      // Triều" chỉ là một cái tên. Vạch ĐỨT (nửa ô) chứ không liền: liền thì ở
      // zoom xa nó thành một sợi chỉ xanh chạy khắp bản đồ, và mắt đọc ra một lớp
      // giao diện chứ không đọc ra mặt đất.
      if (tier >= 5 && cs >= 7) {
        const jw = Math.max(0.8, cs * 0.085);
        ctx.fillStyle = ROAD_JADE;
        ctx.globalAlpha = 0.66;
        if (horiz || !vert) ctx.fillRect(px + cs * 0.25, py + cs * 0.5 - jw / 2, cs * 0.5, jw);
        if (vert) ctx.fillRect(px + cs * 0.5 - jw / 2, py + cs * 0.25, jw, cs * 0.5);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawCloudShadows(cs) {
  const span = CONFIG.GRID_WIDTH + 200;
  for (const c of CLOUDS) {
    const wx = ((c.x * span + aTick * c.sp) % span) - 100;
    const wy = c.y * CONFIG.GRID_HEIGHT;
    const [px, py] = worldToPx(wx, wy);
    const rp = c.r * cs;
    if (px + rp < 0 || px - rp > simCanvas.width) continue;
    if (py + rp * 0.6 < 0 || py - rp * 0.6 > simCanvas.height) continue;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.55);
    const g = ctx.createRadialGradient(0, 0, rp * 0.12, 0, 0, rp);
    g.addColorStop(0, `rgba(9,14,24,${c.a})`);
    g.addColorStop(0.65, `rgba(9,14,24,${c.a * 0.55})`);
    g.addColorStop(1, 'rgba(9,14,24,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rp, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Cỏ lau đáy đầm. Thay chỗ của lớp "lăn tăn mặt nước" cũ và giữ nguyên cách làm:
// chỉ ~12% số ô trũng (chọn bằng hash tất định nên không nhấp nháy đổi chỗ), gom
// hết vào MỘT path rồi stroke một lần — vài trăm đoạn thẳng trong một lệnh vẽ.
// Đây là lớp ĐỘNG duy nhất của vùng trũng: bụi lau ngả theo gió, nên lòng chảo
// vẫn còn một chuyển động riêng thay vì thành một mảng tối đứng yên.
function drawReedSway(cs) {
  if (cs < 5) return;
  const x0 = Math.floor(camX), y0 = Math.floor(camY);
  const x1 = x0 + CONFIG.VIEWPORT_WIDTH + 1, y1 = y0 + CONFIG.VIEWPORT_HEIGHT + 1;
  ctx.strokeStyle = 'rgba(178,166,118,0.3)';
  ctx.lineWidth = Math.max(1, cs * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isBasinAt(x, y)) continue;
      const h = hash01(x * 1.3, y * 2.7);
      if (h < 0.88) continue;
      const sway = Math.sin(aTick * 0.02 + h * 6.28) * 0.14;
      const [px, py] = worldToPx(x + 0.5, y + 0.8);
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway * cs, py - cs * (0.5 + h * 0.3));
    }
  }
  ctx.stroke();
}

// Vòng báo trận. Câu hỏi mà người xem hỏi nhiều nhất là "đang đánh nhau ở đâu",
// và cho tới 3.7 thì câu trả lời chỉ có trên minimap — tức là phải rời mắt khỏi
// khung hình để tìm chỗ đáng nhìn trong khung hình. Vệt đỏ này trả lời ngay tại
// chỗ, và nó đọc từ chính `hotspots` mà camera đạo diễn dùng, nên thứ nó chỉ vào
// luôn đúng bằng thứ camera sắp cắt tới.
function drawCombatRings(cs) {
  if (!hotspots.length) return;
  const top = hotspots.slice().sort((a, b) => b.weight - a.weight).slice(0, 5);
  for (const h of top) {
    if (h.weight < 5) continue;
    const [px, py] = worldToPx(h.x + 0.5, h.y + 0.5);
    const rp = clamp(3.5 + h.weight * 0.28, 4, 14) * cs;
    if (!inView(px, py, rp)) continue;
    const g = ctx.createRadialGradient(px, py, rp * 0.1, px, py, rp);
    g.addColorStop(0, 'rgba(255,86,70,0.20)');
    g.addColorStop(1, 'rgba(255,86,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px, py, rp, rp * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const ph = ((aTick * 0.012) + i * 0.5) % 1;
      ctx.strokeStyle = `rgba(255,120,90,${0.4 * (1 - ph)})`;
      ctx.lineWidth = Math.max(1.2, cs * 0.16);
      ctx.beginPath();
      ctx.ellipse(px, py, rp * (0.25 + ph * 0.75), rp * (0.25 + ph * 0.75) * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Thanh trạng thái dán đáy khung hình. Đặt trên CANVAS chứ không trong bảng bên
// phải, vì đúng ba con số này (đang chạy hay dừng, nhanh chậm bao nhiêu, kỷ
// nguyên trôi tới đâu) là thứ người xem cần liếc mà KHÔNG được rời mắt khỏi trận.
const HUD_H = 24;
function drawHudBar() {
  const W = simCanvas.width, H = simCanvas.height, y = H - HUD_H;
  ctx.fillStyle = 'rgba(11,9,7,0.86)';
  ctx.fillRect(0, y, W, HUD_H);
  const prog = clamp(tick / CONFIG.ERA.MAX_TICKS, 0, 1);
  ctx.fillStyle = 'rgba(216,165,68,0.10)';
  ctx.fillRect(0, y, W * prog, HUD_H);
  ctx.fillStyle = 'rgba(216,165,68,0.16)';      // sợi vàng chạy suốt = cả kỷ nguyên
  ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = 'rgba(240,207,133,0.8)';      // phần đã trôi qua sáng lên
  ctx.fillRect(0, y, W * prog, 1);

  ctx.font = `600 11.5px ${F_UI}`;
  ctx.textAlign = 'left';
  // `running` bị tắt ở HAI tình huống rất khác nhau: người xem bấm Pause, và
  // kỷ nguyên vừa khép lại (endEra tự tắt để giữ thẻ tổng kết). Gộp cả hai vào
  // một chữ "TẠM DỪNG" thì lúc kỷ nguyên kết thúc, thanh trạng thái nói dối rằng
  // chính người xem đã dừng nó lại và đang có gì đó chờ họ bấm.
  const ended = eraState !== 'playing';
  const state = ended ? T('🏆 KỶ NGUYÊN KẾT THÚC')
              : !running ? T('⏸ TẠM DỪNG')
              : slowmoLeft > 0 ? T('⏳ quay chậm')
              : ticksPerSecond >= 600 ? T('⏭ tua') : '▶';
  ctx.fillStyle = ended ? '#f0cf85' : !running ? '#e09a3c' : slowmoLeft > 0 ? '#7cc2b4' : '#b1a58c';
  ctx.fillText(state, 11, y + 16);
  const sw = ctx.measureText(state).width;
  // Đồng hồ đi bằng chữ MÁY, tên kỷ nguyên đi bằng chữ SÁCH. Hai giọng ngồi
  // cạnh nhau trên cùng một thanh mà không lẫn: một bên là thứ máy đếm được,
  // một bên là thứ chỉ có nghĩa trong thế giới đang được kể.
  ctx.font = `10.5px ${F_DATA}`;
  ctx.fillStyle = '#7b7160';
  ctx.fillText(`${ticksPerSecond} tick/s`, 19 + sw, y + 16);
  const tw = ctx.measureText(`${ticksPerSecond} tick/s`).width;
  ctx.font = `12.5px ${F_DISPLAY}`;
  ctx.fillStyle = '#b1a58c';
  const eraText = T('Kỷ nguyên {n}', { n: era });
  ctx.fillText(eraText, 19 + sw + tw + 14, y + 16);
  const ew = ctx.measureText(eraText).width;
  ctx.font = `10.5px ${F_DATA}`;
  ctx.fillStyle = '#7b7160';
  ctx.fillText(`${locNum(tick)} / ${locNum(CONFIG.ERA.MAX_TICKS)}`,
               19 + sw + tw + 14 + ew + 14, y + 16);

  ctx.textAlign = 'right';
  ctx.fillStyle = fpsAvg < 34 ? '#e05b40' : '#5c5346';
  ctx.fillText(T('{n} quân · {fps} fps', { n: units.length, fps: Math.round(fpsAvg) }), W - 11, y + 16);
  ctx.textAlign = 'left';
}

// Chiều cao thanh Kỳ quan. Một hằng số, đọc từ hai phía: hàm vẽ thanh, và biến
// CSS `--hud-top` mà minimap/nút/bảng phủ cộng vào toạ độ của chúng.
const HUD_BAR_H = 26;

// KÍCH THƯỚC HAI VẬT CẢN Ở MÉP TRÊN, quy về HỆ TOẠ ĐỘ CANVAS.
//
// Hai cái bẫy chồng lên nhau ở đây:
//  1. Hàng nút co giãn (nhãn Đạo diễn mang tên cảnh, dài ngắn tuỳ cảnh) nên phải
//     hỏi DOM — mà `offsetWidth` ép trình duyệt tính lại bố cục, gọi 60 lần/giây
//     là tự bắn vào chân. Nhớ lại mỗi 15 khung hình: hàng nút đổi bề ngang vài
//     lần một phút, còn sai số một phần tư giây thì không ai kịp thấy.
//  2. Chúng đo bằng PIXEL CSS, còn chỗ vẽ đo bằng PIXEL CANVAS. Cửa sổ hẹp thì
//     `max-width:100%` co canvas lại, hai hệ lệch nhau tới 30% — lấy thẳng
//     `minimapCanvas.width` làm bề ngang vật cản là sai đúng vào lúc chật chội
//     nhất, tức là đúng lúc cần nó nhất. Nhân lại bằng tỉ lệ đo được.
let _hudObs = { leftW: 178, chipsH: 32, miniW: 187, miniH: 121 }, _hudObsAt = -999;
function hudObstacles() {
  if (frameCount - _hudObsAt >= 15) {
    _hudObsAt = frameCount;
    const shown = simCanvas.getBoundingClientRect().width;
    const k = shown > 0 ? simCanvas.width / shown : 1;
    const c = document.getElementById('ovChips');
    // `leftW` là HỢP của hàng nút và bảng bộ lạc trên khung hình — hai lớp phủ
    // cùng neo ở mép trái, và bảng bộ lạc rộng gấp đôi hàng nút khi nó mở. Chỉ
    // đo hàng nút thì bật bảng bộ lạc lên là dòng sử lại chạy xuyên qua nó.
    const p = document.getElementById('ovTribes');
    const pW = (p && p.style.display !== 'none') ? p.offsetWidth : 0;
    _hudObs = {
      leftW: Math.max(c ? c.offsetWidth : 178, pW) * k,
      chipsH: (c ? c.offsetHeight : 32) * k,
      miniW: minimapCanvas.offsetWidth * k,
      miniH: minimapCanvas.offsetHeight * k
    };
  }
  return _hudObs;
}

// Cắt chuỗi cho vừa bề ngang, thêm dấu lửng. Dò tuyến tính từ đuôi chứ không
// chia đôi: chuỗi ở đây dài vài chục ký tự và gần như luôn vừa ngay từ đầu, nên
// vòng lặp thường không chạy lần nào.
function fitText(txt, maxW) {
  if (maxW <= 0 || ctx.measureText(txt).width <= maxW) return txt;
  let s = txt;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

// ------------------------------------------------------------
// HÀNG ĐỢI NHÃN CHỮ TRÊN BẢN ĐỒ
// ------------------------------------------------------------
// Tên bộ lạc, tên anh hùng và tên hang ổ đều là chữ nổi trên thế giới, và trước
// đây mỗi chỗ tự vẽ lấy ngay tại chỗ mình đang vẽ hình. Ba hàm không biết nhau
// thì không có cách nào tránh nhau: anh hùng đứng cạnh nhà chính của chính mình
// — chuyện xảy ra suốt, vì đó là nơi anh ta hồi máu và nhận lệnh — là hai dòng
// chữ chồng khít lên nhau thành một mớ không đọc được chữ nào.
//
// Cách chữa không phải là dịch mỗi nhãn lên thêm mấy pixel (số nào cũng sẽ sai ở
// một mức thu phóng nào đó), mà là gom hết vào MỘT hàng đợi rồi xếp chỗ một lượt:
// ai ưu tiên cao xí chỗ trước, ai đến sau mà đụng thì nhích LÊN TRỜI — phía trên
// một vật thể gần như luôn trống — tối đa ba nấc, không còn chỗ thì thôi không vẽ.
// Không vẽ còn hơn vẽ đè: một nhãn thiếu thì người xem click vào là ra, còn hai
// nhãn chồng nhau thì mất cả hai.
const LABEL_PAD = 2;
const labelQueue = [];
function queueLabel(text, cx, baseY, font, color, prio) {
  labelQueue.push({ text, cx, baseY, font, color, prio });
}
// `blockers`: những ô chữ nhật của lớp HUD (hiện tại là mấy dòng sử đóng dấu) mà
// nhãn thế giới phải tránh. Nạp vào hàng đợi như thể chúng đã xí chỗ từ trước —
// nhờ vậy tên bộ lạc tự nhích ra thay vì nằm nửa trong nửa ngoài dưới một tấm
// thẻ đen. Không cần biết chúng là cái gì, chỉ cần biết chỗ đó đã có người.
function flushLabels(blockers) {
  if (!labelQueue.length) return;
  labelQueue.sort((a, b) => b.prio - a.prio);
  const placed = blockers ? blockers.slice() : [];
  ctx.textAlign = 'center';
  for (const L of labelQueue) {
    ctx.font = L.font;
    const m = ctx.measureText(L.text);
    const asc = m.actualBoundingBoxAscent || 10, desc = m.actualBoundingBoxDescent || 3;
    const hw = m.width / 2, h = asc + desc, dy = h + 3;
    // Thử LÊN trước (phía trên một vật thể gần như luôn là trời trống), rồi mới
    // thử XUỐNG. Chỉ đi lên là đủ khi vật cản là một nhãn khác cùng cỡ, nhưng
    // không đủ khi vật cản là một tấm thẻ HUD cao 30px nằm ngay phía trên: leo ba
    // nấc vẫn còn kẹt trong nó, mà xuống một nấc là thoát.
    const tries = [0, -dy, -dy * 2, -dy * 3, dy, dy * 2];
    let y = L.baseY, ok = false;
    for (const off of tries) {
      y = L.baseY + off;
      const x0 = L.cx - hw - LABEL_PAD, x1 = L.cx + hw + LABEL_PAD;
      const y0 = y - asc - LABEL_PAD, y1 = y + desc + LABEL_PAD;
      let hit = false;
      for (const p of placed) {
        if (x0 < p.x1 && x1 > p.x0 && y0 < p.y1 && y1 > p.y0) { hit = true; break; }
      }
      if (!hit) { placed.push({ x0, x1, y0, y1 }); ok = true; break; }
    }
    if (!ok) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText(L.text, L.cx + 1, y + 1);
    ctx.fillStyle = L.color;
    ctx.fillText(L.text, L.cx, y);
  }
  labelQueue.length = 0;
  ctx.textAlign = 'left';
}

// CHỖ ĐỨNG CỦA MẤY DÒNG SỬ, tính TRƯỚC khi vẽ bất cứ chữ nào.
//
// Tách khỏi vòng vẽ vì hai lớp cần cùng một đáp số: lớp nhãn thế giới cần biết
// mấy tấm thẻ này sẽ nằm ở đâu để né, còn chính vòng vẽ thì cần toạ độ để vẽ.
// Tính hai lần bằng hai công thức là cách chắc chắn nhất để chúng lệch nhau.
//
// Dòng sử LÁCH giữa hàng nút (trái) và minimap (phải) chứ không căn giữa khung
// hình: minimap rộng 187px, hàng nút ~178px, nên "giữa khung" không còn là giữa
// chỗ trống — một dòng dài chui thẳng xuống dưới minimap, đo được 52px chữ bị
// nuốt. Khi khe hở không đủ (cửa sổ hẹp, hoặc nhãn Đạo diễn kéo hàng nút dài ra)
// thì KHÔNG cắt chữ cho vừa cái khe: xuống hẳn dưới cả hai vật cản và lấy trọn bề
// ngang. Nhét một dòng sử vào 19px là biến nó thành một dấu lửng. Quyết định một
// lần cho cả cụm theo dòng DÀI NHẤT, để mấy dòng cùng lúc không nằm ở hai độ cao.
function layoutToasts(hudTop) {
  const obs = hudObstacles();
  ctx.font = `15px ${F_DISPLAY}`;
  let needW = 0;
  for (const t of mapToasts) {
    const s = t.count > 1 ? `${Tv(t.text)}  ×${t.count}` : Tv(t.text);
    needW = Math.max(needW, ctx.measureText(s).width);
  }
  needW += 30 + 32;                                            // con dấu + hai lề
  const spanL = 11 + obs.leftW + 10;
  let spanR = simCanvas.width - 10 - obs.miniW - 10;
  let ty = hudTop + 40;
  if (needW > spanR - spanL) {
    // Xuống dưới minimap thì bên PHẢI hết vướng — nhưng bên TRÁI thì không: bảng
    // bộ lạc trên khung hình cao tới 46% khung, đi xuống bao nhiêu cũng vẫn đụng.
    // Vậy chỉ nới mép phải, giữ nguyên mép trái.
    spanR = simCanvas.width - 12;
    ty = hudTop + Math.max(11 + obs.chipsH, 10 + obs.miniH) + 26;
  }
  const cx = (spanL + spanR) / 2;
  const maxText = Math.max(90, spanR - spanL - 30 - 32);
  const rows = [], blockers = [];
  let y = ty;
  for (const t of mapToasts) {
    const txt = fitText(t.count > 1 ? `${Tv(t.text)}  ×${t.count}` : Tv(t.text), maxText);
    const tw = ctx.measureText(txt).width;
    const boxW = 30 + 16 + tw + 16;
    rows.push({ txt, tw, y });
    blockers.push({ x0: cx - boxW / 2 - 4, x1: cx + boxW / 2 + 4, y0: y - 19, y1: y + 19 });
    y += 38;
  }
  return { cx, rows, blockers };
}

// ============================================================
// TƯỜNG THÀNH — vẽ
// ============================================================
// Một ô tường là một khối đá cao 0,62 ô, KHÔNG phải một ô màu trên mặt đất. Lý do
// nằm ở chính luật chơi: tường chặn địch mà không chặn quân nhà, và một dải màu
// phẳng thì người xem đọc ra "vùng ảnh hưởng" — thứ mà lãnh thổ đã dùng — chứ
// không đọc ra "vật cản". Có bóng đổ, có mặt trên sáng hơn mặt trước, và có lỗ
// châu mai: ba tín hiệu này mắt đã biết đọc là "tường" từ trước khi có trò chơi.
//
// BA TRẠNG THÁI, và cả ba đều phải đọc được ở mức zoom xa nhất, vì "thành đã thủng
// chỗ nào" chính là thông tin đắt nhất của cả cơ chế:
//   · lành      — khối liền, lỗ châu mai đều
//   · sứt mẻ    — thấp dần theo máu, lỗ châu mai rụng bớt
//   · vỡ (hp=0) — chỉ còn một đống gạch vụn thấp: một CÁI LỖ nhìn xuyên qua được
// PHASE 3.30 thêm ba trục nữa vào cùng một hàm, và cả ba đều là thứ mắt đọc trước
// khi đọc màu:
//   · HƯỚNG — đoạn tường chạy ngang thì bề mặt trải hết bề ngang ô; đoạn chạy dọc
//     thì nó là một phiến HẸP đứng giữa ô, và răng cưa xếp CHỒNG theo chiều dọc
//     thay vì rải ngang. Bản trước vẽ y hệt nhau cho cả hai, nên hai cạnh trái/phải
//     của thành trông như một dãy khối rời chứ không như một bức tường liền.
//   · CHỖ — góc là một tháp vuông cao hơn thân tường, cổng là ba ô có cánh cửa ở
//     giữa. Cả hai đều là thông tin luật chơi: góc nối hai hướng, cổng là chỗ máu
//     mỏng nhất, và người xem phải đọc ra được điều đó mà không cần bấm vào.
//   · BẬC — năm bậc theo thời đại (WALL.TIERS), đổi cả vật liệu lẫn kiểu đỉnh.
function wallTierSpec(w) {
  const TIERS = CONFIG.WALL.TIERS;
  return TIERS[clamp(w.tier || 1, 1, TIERS.length - 1)];
}

// HỆ SỐ CHIỀU CAO CỦA MỘT Ô TƯỜNG — một hàm, hai chỗ đọc (drawWall và spriteBox).
//
// Trước Phase 3.33 nó là một biểu thức tam nguyên CHÉP HAI LẦN ở hai chỗ cách nhau
// nghìn dòng, và chú thích ở spriteBox đã phải viết hẳn ra rằng nó "đọc lại đúng
// công thức của drawWall, không phải một hằng số chép tay" — tức là cái nguy hiểm
// đã được nhận ra mà cách chữa thì vẫn là "nhớ sửa cả hai chỗ". Bản này thêm bậc
// thứ tư (lầu cổng), nên chỗ nào quên là bấm vào nóc lầu cổng sẽ trượt: đúng con
// lỗi hộp-bấm-lệch-hình, lần thứ bảy.
//
// Bốn bậc, và chênh lệch chiều cao giữa chúng LÀ toàn bộ đường bao của cái cổng:
//     thân tường 1,00 · KHỐI CỬA 1,06 · LẦU CỔNG 1,30 · tháp góc 1,35
// Đọc dọc theo một cạnh thành thì nó ra nhịp bằng-CAO-nhô-CAO-bằng: một khối cổng
// đồ sộ nhô lên khỏi thân tường, và hai cái lầu vượt lên trên nó nữa. Đó là hình
// dạng mà mắt đã biết đọc là "cổng" từ trước khi nhìn thấy cánh cửa.
//
// HAI LẦN PHẢI SỬA CON SỐ NÀY, VÀ CẢ HAI ĐỀU CHỈ LỘ RA KHI VẼ RA MÀ NHÌN:
//   0,72 — hạ thấp ô cửa để làm nhịp hình bóng. Nhưng cái vòm lại được khoét vào
//          chính ô đã hạ, nên ở bậc Rào gỗ lối đi chỉ còn 15px: hai phép hạ độ cao
//          cộng dồn lên cùng một ô.
//   0,88 — vẫn thấp hơn thân tường, và vẫn sai theo cùng chiều.
// 1,06 đảo hẳn chiều: khối cửa NHÔ LÊN chứ không thụt xuống, đúng như một cổng
// thành thật (tường dày lên và cao lên ở chỗ có lối đi), và cái vòm vì thế có chỗ
// để cao. Nhịp hình bóng nay do HAI LẦU CỔNG gánh — chúng mới là thứ phải nhô.
// ============================================================
// PHASE 3.38 — CỔNG PHẢI CAO HƠN GÓC, VÀ TRƯỚC BẢN NÀY NÓ THẤP HƠN
// ============================================================
// Chú thích trên nói đúng ý định ("nhịp hình bóng nay do HAI LẦU CỔNG gánh") nhưng
// ba con số thì phản lại nó. Đo bằng pixel thật ở bậc tường cao nhất, cs = 9 (mức
// thu phóng MẶC ĐỊNH — đo `zoomSelect`, không đoán):
//     thân tường  7,4px
//     lầu cổng    9,6px      <- thứ đáng lẽ phải cao nhất
//     ô góc      10,0px      <- thứ thật sự cao nhất
// Vành thành có BỐN góc và BỐN cổng, cùng cỡ, cách đều nhau — nên "đường bao
// thấp-CAO-thấp" mà cả cái cổng dựa vào để đọc được từ xa đang bị bốn cái góc nói
// át, và mắt không có cách nào biết chỗ nhô lên nào là lối đi. Đó không phải một
// khiếm khuyết thẩm mỹ, nó là tín hiệu SAI: chỗ dễ vỡ nhất của bức tường trông
// giống hệt chỗ chắc nhất.
//
// Chênh 2,2px giữa lầu cổng và thân tường cũng là một con số cần nói thẳng: ở mức
// thu phóng người ta chơi thật, cả "nhịp hình bóng" của bản trước rộng đúng hai
// pixel. Bài học Phase 3.14 — hình bóng đọc được còn màu thì không — chỉ đúng khi
// hình bóng ĐỦ LỚN để có bóng.
//
// Con số mới, đo lại ở cùng điều kiện: thân 7,4 · góc 10,0 · khối cổng 11,4 · lầu
// cổng 15,5. Lầu cổng nay gấp 2,1 lần thân tường và cao hơn góc 55%, tức là bốn
// chỗ cao nhất trên vành thành là bốn cái cổng — đúng thứ tự thông tin.
//
// Ô GÓC GIỮ NGUYÊN 1,35. Hạ góc xuống thì cổng nổi lên mà không phải trả gì, nhưng
// bốn cái góc cũng đang làm việc của chúng (nói cho mắt biết vành thành kết thúc ở
// đâu, và bức tường là một HÌNH chứ không phải bốn đoạn rời). Nâng cổng lên là cộng
// thêm thông tin; hạ góc xuống là đổi thông tin này lấy thông tin kia.
// PHASE 3.39 — NỚI THÊM MỘT NẤC NỮA, và lần này nới theo CHIỀU CÒN LẠI.
//
// Bản 3.38 chỉ có một đòn bẩy: chiều cao. Nó đưa lầu cổng từ 9,6 lên 15,5px ở mức
// thu phóng mặc định, đủ để cổng thắng ô góc — nhưng bề NGANG thì vẫn đúng một ô
// lưới, y hệt một viên tường thường. Một cái tháp cao gấp đôi mà không dày hơn tí
// nào đọc ra là "một viên tường bị kéo dãn", không đọc ra là một công trình; khối
// lượng mới là thứ nói "chỗ này người ta xây kiên cố hơn".
//
// Nên vòng này đi hai chiều cùng lúc: cao 2,10 -> 2,70 và rộng 1,00 -> 1,34 ô
// (GATE_TOWER_W dưới đây). Diện tích bóng của lầu cổng vì thế gấp 1,72 lần bản
// trước, trong khi chiều cao một mình chỉ cho 1,29.
//
// Ô GÓC VẪN GIỮ 1,35, cùng lý do đã viết ở 3.38: hạ góc xuống là đổi thông tin này
// lấy thông tin kia, còn nâng cổng lên là cộng thêm.
function wallHeightMul(w) {
  if (w.corner) return 1.35;
  if (w.door) return 1.80;    // khối cổng — ba ô giữa, nhô rõ trên thân tường
  if (w.gate) return 2.70;    // lầu cổng — hai ô kẹp hai bên, cao nhất vành thành
  return 1;
}

// Bề ngang lầu cổng, tính theo ô lưới. Đứng RIÊNG khỏi wallHeightMul vì nó đi vào
// một biểu thức khác (`bw`), nhưng cùng một luật: cả drawWall lẫn spriteBox phải
// đọc chung một nguồn, nếu không thì hộp bấm lệch khỏi hình vẽ — đúng con lỗi
// "hộp bấm tưởng sprite trùng chân đế" đã cắn bốn lần.
const GATE_TOWER_W = 1.34;

// Hình học CỜ HIỆU trên nóc lầu cổng, MỘT nguồn cho cả hai phía: drawWall vẽ nó,
// spriteBox phải bao được nó. Tách ra thành hàm vì cả ba số đều có SÀN PIXEL
// (`Math.max`) — mà sàn pixel chính là thứ làm mọi phép quy đổi "0,78 ô" sai ở
// đúng mức thu phóng nhỏ nhất, nơi sàn thắng tỉ lệ. Chép tay sang spriteBox thì
// nó đúng ở cs 9 và sai ở cs 4, tức là sai theo kiểu không ai nhìn thấy.
function gatePennant(cs) {
  return {
    poleH: Math.max(3.4, cs * 0.78),
    fw:    Math.max(3.6, cs * 0.56),
    fh:    Math.max(2.9, cs * 0.42)
  };
}

// Bề dày nét vẽ + khử răng cưa ăn thêm ra NGOÀI mọi công thức toạ độ. ĐO chứ không
// suy (bài học 3.31: công thức cho 2,4 ô, vết mực thật chạm 2,54): vẽ lầu cổng lên
// một canvas trống rồi quét kênh alpha ở cả bốn mức thu phóng có thật —
//     cs  4 · 6 · 9 · 14  ->  vết mực vượt công thức 1,3 · 1,1 · 1,4 · 1,9 px
// Không co theo cs, vì phần lớn nó là `Math.max(1, cs*0.07)` cộng một viền AA. Lấy
// 2,2 để hộp bấm phủ hết ở CẢ BỐN mức — thừa 0,3..0,9px thì không ai thấy, thiếu
// 0,2px ở cs 14 thì bấm trúng nóc cờ là bấm vào bãi cỏ.
const INK_SLOP = 2.2;

function drawWall(w, px, py, cs) {
  const t = tribes[w.tribeId];
  if (!t) return;
  const baseY = py + cs;
  const vertical = w.dir === 'v';
  if (w.hp <= 0) {
    // Gạch vụn. Vẽ thấp và tối để cái lỗ đọc ra là lỗ ngay cả khi hai ô bên cạnh
    // vẫn còn nguyên — đó là lúc thông tin này đáng giá nhất. Đống vụn cũng nằm
    // theo hướng: một lỗ trên cạnh dọc phải là một khe DỌC, nếu không thì đúng
    // cái thông tin đắt nhất lại là thứ duy nhất không xoay.
    ctx.fillStyle = 'rgba(58,48,40,0.72)';
    if (vertical) ctx.fillRect(px + cs * 0.30, py + cs * 0.06, cs * 0.40, cs * 0.88);
    else          ctx.fillRect(px + cs * 0.08, baseY - cs * 0.16, cs * 0.84, cs * 0.16);
    ctx.fillStyle = 'rgba(120,104,86,0.6)';
    if (vertical) {
      ctx.fillRect(px + cs * 0.34, py + cs * 0.16, cs * 0.14, cs * 0.22);
      ctx.fillRect(px + cs * 0.52, py + cs * 0.54, cs * 0.12, cs * 0.18);
    } else {
      ctx.fillRect(px + cs * 0.18, baseY - cs * 0.26, cs * 0.24, cs * 0.12);
      ctx.fillRect(px + cs * 0.58, baseY - cs * 0.22, cs * 0.2, cs * 0.1);
    }
    return;
  }
  const spec = wallTierSpec(w);
  const frac = clamp(w.hp / w.maxHp, 0, 1);
  // Chiều cao tụt theo máu nhưng có SÀN 0,45: một bức tường sắp thủng vẫn phải
  // trông như tường. Tụt thẳng về 0 thì hai ô cuối cùng trước khi vỡ đã trông y
  // như đống gạch vụn, và người xem không đọc được khoảnh khắc nó THẬT SỰ vỡ.
  //
  // GÓC cao thêm 35%, CÁNH CỬA thấp đi 28%, LẦU CỔNG cao thêm 30%. Chênh lệch
  // chiều cao là tín hiệu rẻ nhất và đọc được ở mọi mức zoom — rẻ hơn hẳn một hình
  // vẽ riêng, và nó còn đúng cả khi ô chỉ còn vài pixel. Đọc qua wallHeightMul để
  // spriteBox không thể lệch khỏi hình vẽ.
  const hMul = wallHeightMul(w);
  const h = cs * spec.h * hMul * (0.45 + 0.55 * frac);
  const isTowerGate = w.gate && !w.door;   // LẦU CỔNG — hai ô kẹp hai bên cánh cửa

  // ============================================================
  // HAI PHÉP DỰNG HÌNH KHÁC HẲN NHAU CHO HAI HƯỚNG
  // ============================================================
  // Đoạn chạy NGANG (đông-tây) thì các ô nằm CẠNH nhau, nên vẽ mỗi ô một khối cao
  // `h` ở mép dưới là đủ: hai ô liền nhau dính vào nhau theo chiều ngang.
  //
  // Đoạn chạy DỌC (bắc-nam) thì các ô nằm CHỒNG theo chiều sâu, và cùng phép vẽ
  // đó cho ra một dãy khối RỜI: khối của ô y chiếm `h` pixel cuối của ô, còn ô
  // y+1 bắt đầu lại từ đầu ô của nó, nên giữa hai khối hở đúng (cs - h) pixel.
  // Đo tận mắt ở cs=46: bức tường dọc đọc ra là một hàng cọc rời, không phải một
  // bức tường. Đây là lỗi HÌNH CHIẾU, không phải lỗi màu hay cỡ.
  //
  // Cách dựng đúng cho đoạn dọc là ĐÙN KHỐI: mặt trên là trọn footprint của ô
  // nâng lên `h`, mặt trước là dải cao `h` ở mép dưới. Ô y+1 vẽ sau (sắp theo
  // chân) sẽ phủ lên mặt trước của ô y — và điều đó ĐÚNG: mặt trước của một ô bị
  // ô đứng ngay trước nó che khuất, nên cả dãy đọc ra là MỘT dải liền, chỉ ô cuối
  // cùng phía nam còn thấy mặt trước.
  // Lầu cổng phình ra hai bên (xem GATE_TOWER_W). Nó ĐÈ lên 0,17 ô của viên trụ
  // cửa đứng cạnh, và điều đó đúng: chân một cái tháp thì phải chạm vào thứ nó
  // đỡ. Hai công thức cũ (`px` cho ngang, `px + (cs-bw)/2` cho dọc) hoá ra là một
  // khi viết bằng tâm ô — nên gộp lại, thay vì thêm một nhánh thứ ba cho cổng.
  const bw = (vertical ? cs * 0.62 : cs) * ((w.gate && !w.door) ? GATE_TOWER_W : 1);
  const bx = px + cs / 2 - bw / 2;
  // "Dải đỉnh" — vùng mặt trên mà mọi kiểu đỉnh bám vào. Ngang thì nó chỉ là một
  // vạch mỏng ở mép trên khối; dọc thì nó là cả footprint đã nâng lên.
  const capX = bx, capW = bw;
  const capY = vertical ? py - h : baseY - h;
  const capH = vertical ? cs : Math.max(1, cs * 0.14);

  drawShadow(bx + bw * 0.62, baseY - cs * 0.05, bw * 0.5, cs * 0.16);
  if (vertical) {
    ctx.fillStyle = spec.top;
    ctx.fillRect(bx, capY, bw, cs);                       // mặt trên, cả chiều sâu ô
    // Vệt sáng dọc mép TÂY: nguồn sáng của cả bản đồ tới từ trên-trái (xem
    // hillshade), nên mép này phải sáng hơn — không có nó thì dải mặt trên là một
    // vệt màu phẳng và mắt không đọc ra nó đang NẰM NGANG chứ không DỰNG ĐỨNG.
    ctx.fillStyle = 'rgba(255,246,226,0.16)';
    ctx.fillRect(bx, capY, Math.max(1, bw * 0.22), cs);
    const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    g.addColorStop(0, spec.face);
    g.addColorStop(1, t.dark);
    ctx.fillStyle = g;
    ctx.fillRect(bx, baseY - h, bw, h);                   // mặt trước
  } else {
    const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    g.addColorStop(0, spec.face);
    g.addColorStop(1, t.dark);
    ctx.fillStyle = g;
    ctx.fillRect(bx, baseY - h, bw, h);
    ctx.fillStyle = spec.top;
    ctx.globalAlpha = 0.62;
    ctx.fillRect(bx, baseY - h, bw, capH);
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // CỔNG THÀNH (dựng lại ở Phase 3.33) — ba ô cánh cửa + hai lầu cổng
  // ============================================================
  // Bản trước: một ô cửa vòm kẹp giữa hai ô có vệt sáng. Ở mức thu phóng chơi thật
  // (cs 7-11) cái đó đọc ra là "một chỗ tường hơi khác màu" — mà cổng lại đúng là
  // thứ mà cả người xem lẫn kẻ tấn công cần đọc được từ xa, vì cả lý do nó tồn tại
  // là để "trận đánh ở cổng Nam" thành một câu kể được (xem CONFIG.WALL.GATE_SPAN).
  //
  // Bản này dựng nó thành một CÔNG TRÌNH có bốn tầng thông tin, xếp theo thứ tự đọc
  // được từ xa tới gần — nên mỗi mức thu phóng vẫn còn đúng lượng chi tiết nó chở nổi:
  //   1. ĐƯỜNG BAO   (mọi cs): thấp-CAO-thấp-CAO-thấp, làm bởi wallHeightMul
  //   2. LẦU CỔNG    (cs>=3): mái vát + CỜ HIỆU + lỗ châu mai trên hai ô cao
  //   3. VÒM CỬA     (cs>=3): vòm cuốn liền ba ô, có ĐÁ KHOÁ ĐỈNH màu bộ lạc
  //   4. CÁNH CỬA GỖ (cs>=6): hai cánh, đinh tán, then ngang, khe sáng ở giữa
  //
  // NGƯỠNG HẠ XUỐNG Ở PHASE 3.38, và không phải "hạ cho chắc" — đo `zoomSelect` thì
  // game có ĐÚNG BỐN mức thu phóng (4 · 6 · 9 · 14), nên mỗi ngưỡng không phải một
  // dải liên tục mà là một quyết định bật/tắt cho từng mức cụ thể. Bảng cũ:
  //     cs 14 (Rất gần) : đủ 4 tầng
  //     cs  9 (Gần, MẶC ĐỊNH) : đủ 4 tầng, cánh cửa gỗ vừa đúng chạm ngưỡng
  //     cs  6 (Thường)  : mất cánh cửa VÀ mất châu mai
  //     cs  4 (Toàn cảnh): mất SẠCH — cái cổng không được vẽ một nét nào
  // Tức là ở hai trong bốn mức, cổng thành không có cửa; ở một trong bốn, nó không
  // tồn tại. Một ngưỡng đặt ở 5 và 9 nghe như "chỉ vẽ khi còn đọc được", nhưng nó
  // được viết mà không tra bảng thu phóng — và bảng ấy chỉ có bốn giá trị.
  if (w.gate && cs >= 3) {
    if (isTowerGate) {
      // ---- LẦU CỔNG ----
      // Không phải "một cái tháp góc thứ năm": tháp góc có mũ VUÔNG đội trên đỉnh,
      // lầu cổng có MÁI VÁT nghiêng vào phía cửa. Hai đường bao khác nhau, và đó là
      // cách người xem phân biệt bốn góc thành với bốn cổng thành mà không phải đếm.
      // Mái cao theo thân: 0,26 -> 0,36 ô. Giữ 0,26 trên một cái tháp vừa cao thêm
      // 29% và rộng thêm 34% thì cái mái tụt xuống thành một nếp gấp mỏng trên một
      // khối lớn — đúng cái làm nó thôi đọc ra là mái.
      const roofH = cs * 0.36;
      const roofTop = capY - roofH;
      // Hướng vát: nghiêng về phía CÁNH CỬA, đọc từ `gp` (±2) — không suy từ toạ độ.
      const inward = w.gp > 0 ? -1 : 1;
      ctx.fillStyle = mixHex(spec.top, t.dark, 0.35);
      ctx.beginPath();
      if (vertical) {
        // Đoạn dọc: dải đỉnh là cả footprint ô, nên mái vát chạy theo chiều SÂU.
        ctx.moveTo(bx - cs * 0.06, capY + (inward > 0 ? cs : 0));
        ctx.lineTo(bx + bw + cs * 0.06, capY + (inward > 0 ? cs : 0));
        ctx.lineTo(bx + bw * 0.5, roofTop + (inward > 0 ? cs * 0.5 : cs * 0.5));
      } else {
        ctx.moveTo(bx - cs * 0.08, capY + capH);
        ctx.lineTo(bx + bw + cs * 0.08, capY + capH);
        ctx.lineTo(bx + bw * (inward > 0 ? 0.72 : 0.28), roofTop);
      }
      ctx.closePath();
      ctx.fill();
      // Mép mái sáng lên: nguồn sáng trên-trái, thống nhất với cả bản đồ.
      ctx.strokeStyle = 'rgba(255,246,226,0.28)';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.stroke();
      // ---- CỜ HIỆU (Phase 3.38) ----
      // Tầng thông tin thứ năm, và là tầng DUY NHẤT sống sót ở mức Toàn cảnh. Chiều
      // cao giải quyết được "chỗ nào nhô lên", nhưng ở cs 4 thì cả lầu cổng chỉ cao
      // 6,9px và mọi chi tiết bên trong nó đều dưới một pixel — nên thứ còn đọc được
      // phải là MÀU, không phải hình. Đây là chiều ngược của bài học Phase 3.14
      // ("màu chỉ đọc được khi có mẫu đứng cạnh để so"), và nó không mâu thuẫn: ở
      // đây mẫu đối chứng luôn có mặt — cả vành thành xám đá chạy quanh nó.
      //
      // SÀN 2,2px cho bề ngang lá cờ, chứ không để nó co theo cs. Một lá cờ đúng tỉ
      // lệ ở cs 4 rộng 1,8px, tức là nó biến mất đúng ở mức thu phóng sinh ra để
      // nhìn toàn bản đồ — mức mà một dấu hiệu "cổng ở đây" đáng giá nhất. Cùng họ
      // với những `Math.max(1, ...)` rải khắp tầng vẽ này: dưới một ngưỡng pixel thì
      // tỉ lệ đúng không còn là mục tiêu, đọc được mới là.
      //
      // Cờ chĩa RA NGOÀI cổng (đọc `gp`, không suy từ toạ độ — cùng luật đã viết cho
      // hướng mái vát), nên hai lá cờ của một cổng xoè ra hai phía như một cặp.
      const PEN = gatePennant(cs);
      const poleH = PEN.poleH;
      const fx0 = bx + bw * 0.5;
      const fy0 = vertical ? capY + cs * 0.3 : capY;
      ctx.strokeStyle = 'rgba(30,22,15,0.75)';
      ctx.lineWidth = Math.max(1, cs * 0.07);
      ctx.beginPath();
      ctx.moveTo(fx0, fy0);
      ctx.lineTo(fx0, fy0 - poleH);
      ctx.stroke();
      const fw2 = PEN.fw, fh2 = PEN.fh;
      const out = w.gp > 0 ? 1 : -1;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(fx0, fy0 - poleH);
      ctx.lineTo(fx0 + out * fw2, fy0 - poleH + fh2 * 0.44);
      ctx.lineTo(fx0, fy0 - poleH + fh2);
      ctx.closePath();
      ctx.fill();
      // VIỀN CHỈ Ở MỨC "RẤT GẦN", và con số 12 phải đo HAI LẦN mới ra.
      //
      // Bản đầu viền ở mọi cỡ. Đếm pixel màu bộ lạc trong khung quanh lầu cổng:
      //     cs 14 -> 9 px · cs 9 -> 3 px · cs 6 -> 0 px · cs 4 -> 0 px
      // Đúng hai mức thu phóng cần lá cờ nhất thì nó KHÔNG CÓ MỘT PIXEL NÀO. Nguyên
      // nhân là số học: ở cs 4 lá cờ là một tam giác ~2 px², còn nét viền rộng 0,7px
      // chạy hết chu vi của chính nó — nét viền phủ gần trọn phần tô. Một chi tiết
      // trang trí thêm vào để làm rõ hình đã XOÁ mất thứ nó tô điểm.
      //
      // Bản sửa thứ nhất đặt ngưỡng ở 8 và nới sàn kích thước. Đo lại:
      //     cs 14 -> 9 px · cs 9 -> 2 px · cs 6 -> 4 px · cs 4 -> 4 px
      // Hai mức nhỏ đã chữa xong, nhưng cs 9 — mức MẶC ĐỊNH, mức người ta nhìn nhiều
      // nhất — lại tụt xuống thấp hơn cả cs 4. Ngưỡng 8 bật viền cho một lá cờ vẫn
      // còn quá nhỏ (~6 px²) để chịu nổi nó. Bài học: khi một hiệu ứng phụ thuộc
      // kích thước, ngưỡng phải đo Ở TỪNG MỨC THU PHÓNG CÓ THẬT (4 · 6 · 9 · 14),
      // chứ không suy từ "8 thì chắc đủ to".
      //
      // Cùng họ với bài học "hai công thức cùng tả một đường cong" ở đá khoá đỉnh,
      // nhưng ngược chiều: ở đây hai NÉT VẼ tranh nhau cùng một vài pixel, và bên
      // thắng là bên vẽ sau. Dưới một ngưỡng kích thước thì thêm nét là bớt thông tin.
      if (cs >= 12) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = Math.max(0.7, cs * 0.035);
        ctx.stroke();
      }
      // Lỗ châu mai — hai khe tối dọc trên mặt trước. Đây là chi tiết nói "có người
      // đứng gác trong này", và nó chỉ có ở lầu cổng: thân tường thường có răng cưa
      // trên đỉnh, không có khe.
      if (cs >= 6 && !vertical) {
        ctx.fillStyle = 'rgba(26,20,14,0.7)';
        for (const o of [0.3, 0.62]) {
          ctx.fillRect(bx + bw * o, baseY - h * 0.72, Math.max(1, bw * 0.08), h * 0.32);
        }
      }
    } else {
      // ---- CÁNH CỬA (ba ô) ----
      // Vòm cuốn LIỀN BA Ô: mỗi ô vẽ đúng phần vòm của mình, và vì `gp` nói ô này
      // đứng ở đâu (-1, 0, 1) nên ba mảnh khớp nhau thành một đường cong duy nhất
      // mà không ô nào phải biết hai ô kia đang vẽ gì. Bản cũ vẽ trọn một cái vòm
      // trong MỘT ô, nên cái cổng rộng đúng bằng một ô lưới dù nó chiếm ba.
      const gp = w.gp || 0;
      if (vertical) {
        // Đoạn dọc: mặt trước gần như không thấy, nên cửa vẽ thành một KHE TỐI cắt
        // ngang dải mặt trên — giữ nguyên cách bản cũ giải chuyện này, nó vẫn đúng.
        ctx.fillStyle = 'rgba(26,19,13,0.88)';
        ctx.fillRect(bx, py + cs * 0.1 - h, bw, cs * 0.8);
        // Ô giữa mang ĐÁ KHOÁ ĐỈNH; hai ô bên chỉ có khe.
        if (gp === 0) {
          ctx.fillStyle = t.color;
          ctx.fillRect(bx - bw * 0.1, py + cs * 0.38 - h, bw * 1.2, Math.max(1.5, cs * 0.14));
        }
      } else if (gp !== 0) {
        // ---- TRỤ CỬA (hai ô kẹp ngay cạnh lối đi) ----
        // KHÔNG vẽ vòm ở đây, và đó là bản sửa quan trọng nhất của cả cái cổng.
        //
        // Bản trước trải một cái vòm cuốn qua CẢ BA ô cánh cửa, mỗi ô vẽ phần vòm
        // của mình. Về hình học thì ba mảnh ghép khít; nhìn tận mắt thì nó hỏng vì
        // một lý do không nằm trong công thức nào: một bức tường ở phép chiếu này
        // chỉ cao ~0,8 ô, nên một lối đi RỘNG BA Ô là một cái hộp thư tỉ lệ 4:1.
        // Không đường cong nào cứu được tỉ lệ đó.
        //
        // Nên lối đi thu về ĐÚNG MỘT Ô, còn hai ô này thành TRỤ ĐỠ: một dải sáng
        // dọc ở mép trong và một rãnh tối, đủ để mắt đọc ra "cái vòm kia tựa vào
        // đây". Ba ô vẫn giữ nguyên vai trò LUẬT CHƠI của chúng (cùng 55% máu, cùng
        // là chỗ mỏng nhất của vành thành) — cái thu lại chỉ là hình vẽ.
        const inner = gp < 0 ? bx + bw : bx;
        const dir2 = gp < 0 ? -1 : 1;
        ctx.fillStyle = 'rgba(238,226,200,0.20)';
        ctx.fillRect(inner + dir2 * bw * 0.16, baseY - h, bw * 0.16, h);
        ctx.fillStyle = 'rgba(24,17,11,0.34)';
        ctx.fillRect(inner - (dir2 > 0 ? 0 : bw * 0.06), baseY - h, bw * 0.06, h);
        // Bệ chân trụ — một gờ ngang ở đáy, thứ làm cái trụ đứng trên đất thay vì
        // mọc ra từ đó.
        if (cs >= 6) {
          ctx.fillStyle = 'rgba(255,246,226,0.14)';
          ctx.fillRect(bx, baseY - h * 0.14, bw, Math.max(1, cs * 0.07));
        }
      } else {
        // ---- LỐI ĐI: trọn một ô, cao gần trọn KHỐI CỔNG ----
        // 0,88 chứ không 1,0 — còn chừa một dải tường trên vòm, và chính dải ấy làm
        // mắt đọc ra "đi xuyên qua" thay vì "tường bị khuyết". Khối cổng lại cao hơn
        // thân tường (1,06 — xem wallHeightMul), nên cái vòm cao gần bằng trọn bức
        // tường bên cạnh: đúng tỉ lệ của một lối đi.
        const dh = h * 0.88;
        const archTop = baseY - dh;
        // ĐƯỜNG VÒM DỰNG MỘT LẦN, DÙNG HAI LẦN: một lần tô đen làm lòng cổng, một
        // lần làm VÙNG CẮT cho hai cánh cửa gỗ. Bản trước vẽ cửa gỗ bằng một
        // `fillRect` trọn bề ngang ô và ván gỗ TRÀN RA NGOÀI vòm — đúng họ lỗi "hai
        // công thức cùng tả một đường cong" đã cắn hai lần trong một hình vẽ ở 3.32,
        // và cách chữa vẫn là cách cũ: đừng tả lại đường cong, hãy DÙNG LẠI chính nó.
        const archPath = () => {
          ctx.beginPath();
          ctx.moveTo(bx + bw * 0.06, baseY);
          ctx.lineTo(bx + bw * 0.06, archTop + dh * 0.42);
          ctx.quadraticCurveTo(bx + bw * 0.5, archTop - dh * 0.16, bx + bw * 0.94, archTop + dh * 0.42);
          ctx.lineTo(bx + bw * 0.94, baseY);
          ctx.closePath();
        };
        ctx.fillStyle = 'rgba(26,19,13,0.92)';
        archPath();
        ctx.fill();

        // ĐÁ KHOÁ ĐỈNH — một viên hình nêm màu bộ lạc cắm ở đỉnh vòm. Đây là chỗ duy
        // nhất trên cả vành thành mang màu bộ lạc ở độ đậm đầy đủ, nên nó vừa là dấu
        // chủ quyền vừa là điểm neo mắt: nhìn thấy chấm màu ấy là biết mình đang nhìn
        // vào cổng, không phải một lỗ thủng.
        //
        // HAI ĐẦU CỦA VIÊN NÊM PHẢI NẰM TRONG MẶT TƯỜNG. Bản đầu đặt đỉnh nó ở
        // `archTop − 0,16·dh`, chép đúng con số của ĐIỂM ĐIỀU KHIỂN đường bậc hai —
        // nhưng điểm điều khiển KHÔNG nằm trên đường cong: đỉnh thật của cung ở
        // t = 0,5 là `archTop + 0,13·dh`, thấp hơn gần một phần ba dh. Hệ quả nhìn
        // thấy được: viên nêm chọc lên khỏi mép trên bức tường thành một cái chóp
        // nhọn, và ở bậc Tường đá nó đọc ra là một ngọn đuốc. Đây là họ lỗi "hai
        // công thức cùng tả một đường cong" lần thứ ba — lần này tôi lấy tham số
        // của đường cong thay vì lấy GIÁ TRỊ của nó.
        const apexY = archTop + dh * 0.13;    // đỉnh THẬT của cung, tính từ t = 0,5
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.37, apexY + dh * 0.13);
        ctx.lineTo(bx + bw * 0.63, apexY + dh * 0.13);
        ctx.lineTo(bx + bw * 0.58, apexY - dh * 0.12);
        ctx.lineTo(bx + bw * 0.42, apexY - dh * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.42)';
        ctx.lineWidth = Math.max(0.8, cs * 0.045);
        ctx.stroke();

        // ---- CÁNH CỬA GỖ, chỉ khi còn đọc được ----
        // 9 -> 6 ở Phase 3.38. Ngưỡng cũ rơi ĐÚNG BẰNG mức thu phóng mặc định (cs 9),
        // nghĩa là cánh cửa — thứ làm cái cổng trông ra cổng — chỉ tồn tại ở hai
        // trong bốn mức, và ở mức mặc định nó sống sót nhờ một dấu bằng. Khối cổng
        // vừa cao thêm 46% (wallHeightMul 1,06 -> 1,55) nên ở cs 6 lối đi nay cao
        // 4,6px thay vì 3,1px — đủ chỗ cho hai cánh và một then ngang.
        if (cs >= 6) {
          const leafTop = baseY - dh * 0.72;
          // CẮT THEO ĐÚNG ĐƯỜNG VÒM VỪA VẼ, nên ván gỗ không thể tràn ra ngoài lối
          // đi ở bất kỳ bậc thành nào.
          ctx.save();
          archPath();
          ctx.clip();
          ctx.fillStyle = mixHex('#5a4025', t.dark, 0.35);
          ctx.fillRect(bx, leafTop, bw, baseY - leafTop);
          ctx.strokeStyle = 'rgba(28,20,12,0.55)';
          ctx.lineWidth = Math.max(0.8, cs * 0.045);
          for (let i = 1; i < 4; i++) {
            const vx = bx + bw * (i / 4);
            ctx.beginPath(); ctx.moveTo(vx, leafTop); ctx.lineTo(vx, baseY); ctx.stroke();
          }
          // Hai đai sắt ngang + đinh tán. Đinh tán là chi tiết đắt nhất về mặt nhận
          // diện: không có nó thì cái cửa đọc ra là một vạt gỗ, có nó thì nó đọc ra
          // là một thứ được đóng để CHỊU ĐÒN.
          for (const o of [0.24, 0.68]) {
            const by2 = leafTop + (baseY - leafTop) * o;
            ctx.fillStyle = '#3d3831';
            ctx.fillRect(bx, by2, bw, Math.max(1, cs * 0.075));
            if (cs >= 13) {
              ctx.fillStyle = '#7d7568';
              for (let i = 0; i < 4; i++) {
                ctx.fillRect(bx + bw * (0.13 + i * 0.25), by2 + cs * 0.012, Math.max(1, cs * 0.05), Math.max(1, cs * 0.05));
              }
            }
          }
          // KHE SÁNG giữa hai cánh, chạy đúng trục đối xứng. Một vệt sáng mảnh ở đó
          // là thứ nói "cửa này MỞ ĐƯỢC", và đó là khác biệt duy nhất giữa một cái
          // cổng và một mảng tường có hoa văn.
          ctx.fillStyle = 'rgba(236,220,184,0.4)';
          ctx.fillRect(bx + bw * 0.5 - Math.max(0.5, cs * 0.022), leafTop, Math.max(1, cs * 0.045), baseY - leafTop);
          ctx.restore();
        }
      }
    }
  }

  // ---- ĐỈNH TƯỜNG: năm kiểu, một kiểu mỗi thời đại ----
  //
  // Trang trí bám vào DẢI ĐỈNH, và dải đỉnh đổi hình theo hướng — nên cùng một
  // kiểu đỉnh chạy ngang trên đoạn đông-tây và chạy dọc trên đoạn bắc-nam mà
  // không phải viết hai bảng kiểu.
  if (cs >= 5) {
    const teeth = frac > 0.66 ? 3 : frac > 0.33 ? 2 : 1;
    ctx.fillStyle = t.color;
    if (spec.cap === 'stake') {
      // ĐỜI 1 — cọc gỗ vót nhọn. Không có răng cưa: hàng rào không có lỗ châu mai,
      // và đó chính là thứ nói ra rằng bậc này chưa phải một toà thành.
      ctx.fillStyle = spec.top;
      for (let i = 0; i < teeth + 1; i++) {
        const f = (i + 0.5) / (teeth + 1);
        const sx = vertical ? capX + capW * 0.5 : capX + capW * f;
        const sy = vertical ? capY + capH * f : capY;
        ctx.beginPath();
        ctx.moveTo(sx - cs * 0.07, sy + cs * 0.03);
        ctx.lineTo(sx, sy - cs * 0.14);
        ctx.lineTo(sx + cs * 0.07, sy + cs * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    } else if (spec.cap === 'flat') {
      // ĐỜI 2 — đất nện: một dải màu bộ lạc chạy dọc theo đỉnh, không răng.
      if (vertical) ctx.fillRect(capX, capY, Math.max(1, capW * 0.30), capH);
      else          ctx.fillRect(capX, capY - cs * 0.05, capW, Math.max(1, cs * 0.07));
    } else if (spec.cap === 'tile') {
      // ĐỜI 5 — mái ngói men úp lên đỉnh tường + một dải vàng lá dưới mái.
      ctx.fillStyle = '#8fbfa8';
      if (vertical) {
        ctx.fillRect(capX - cs * 0.05, capY, capW + cs * 0.10, capH);
        ctx.fillStyle = '#d8a544';
        ctx.fillRect(capX + capW * 0.42, capY, Math.max(1, capW * 0.20), capH);
      } else {
        ctx.beginPath();
        ctx.moveTo(capX - cs * 0.06, capY + cs * 0.02);
        ctx.lineTo(capX + capW / 2, capY - cs * 0.20);
        ctx.lineTo(capX + capW + cs * 0.06, capY + cs * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d8a544';
        ctx.fillRect(capX, capY + cs * 0.02, capW, Math.max(1, cs * 0.05));
      }
    } else {
      // ĐỜI 3 (răng cưa) và ĐỜI 4 (răng cưa + lỗ châu mai). Số răng là thứ ĐẾM
      // ĐƯỢC, nên nó nói ra mức hư hại chính xác hơn màu — cùng lý do đã viết cho
      // vành lan can của tháp canh.
      for (let i = 0; i < teeth; i++) {
        if (vertical) {
          ctx.fillRect(capX - cs * 0.09, capY + capH * (0.10 + i * 0.30),
                       Math.max(1, cs * 0.12), capH * 0.20);
        } else {
          ctx.fillRect(capX + capW * (0.08 + i * 0.32), capY - cs * 0.12,
                       capW * 0.2, cs * 0.13);
        }
      }
      if (spec.cap === 'slit') {
        ctx.fillStyle = 'rgba(24,18,12,0.72)';
        if (vertical) ctx.fillRect(capX + capW * 0.44, capY + capH * 0.34, Math.max(1, capW * 0.16), capH * 0.30);
        else          ctx.fillRect(capX + capW * 0.44, baseY - h * 0.70, Math.max(1, cs * 0.07), Math.max(1, h * 0.3));
      }
    }
  }

  // ---- Ô GÓC: một cái mũ vuông đè lên đỉnh, đọc ra là "tháp góc" ----
  if (w.corner && cs >= 5) {
    ctx.fillStyle = spec.top;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(px - cs * 0.10, baseY - h - cs * 0.10, cs * 1.20, Math.max(1, cs * 0.14));
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.color;
    ctx.fillRect(px + cs * 0.42, baseY - h - cs * 0.30, Math.max(1, cs * 0.16), cs * 0.22);
  }

  // Chớp trắng khi vừa ăn đòn. Đo bằng `hitTick` chứ không bằng `flash` như quân
  // lính và công trình: `flash` được TRỪ DẦN trong vòng cập nhật khung hình, mà ô
  // tường không nằm trong mảng nào của vòng đó — dùng nó thì ô tường sẽ trắng xoá
  // vĩnh viễn kể từ đòn đầu tiên. Một trường không có ai chăm sóc là một trường
  // không được dùng.
  if (tick - w.hitTick < 3) {
    ctx.fillStyle = 'rgba(255,246,226,0.45)';
    if (vertical) ctx.fillRect(bx, capY, bw, cs + h);
    else          ctx.fillRect(bx, baseY - h, bw, h);
  }
}

