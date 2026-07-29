'use strict';
// ============================================================
// 13g-render-frame.js
// ------------------------------------------------------------
// renderWorld() — vòng lặp điều phối MỘT khung hình (gọi mọi hàm vẽ ở 6 file
// 13*.js trên) + renderMinimap(). PHẢI nạp SAU cả 6 file kia. Tách từ
// 13-render-world.js (Phase 3.43) — xem 13-render-terrain.js.
// ============================================================
function renderWorld() {
  labelQueue.length = 0;   // khung hình trước có thể thoát sớm; đừng để nhãn cũ trôi sang

  // DẢI HUD trên đỉnh — một nguồn sự thật duy nhất, dùng cho cả canvas lẫn HTML.
  // Thanh Kỳ quan là thứ duy nhất được phép chiếm mép trên; mọi thứ khác đọc con
  // số này rồi tự tránh ra. Tính ở ĐẦU hàm vì lớp nhãn thế giới (vẽ ở giữa hàm)
  // cũng phải biết mấy tấm thẻ sử sẽ đậu chỗ nào.
  const hudTop = (wonderWatch && eraState === 'playing') ? HUD_BAR_H : 0;
  if (canvasWrap.__hudTop !== hudTop) {
    canvasWrap.style.setProperty('--hud-top', hudTop + 'px');
    canvasWrap.__hudTop = hudTop;
  }
  const toastLay = mapToasts.length ? layoutToasts(hudTop) : null;
  const cs = CONFIG.CELL_SIZE;
  if (terrainDirty) renderTerrainLayer();

  // Nền: một lệnh blit từ lớp địa hình đã vẽ sẵn.
  const LP = CONFIG.TERRAIN.LAYER_PX;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(terrainCanvas,
    camX * LP, camY * LP, CONFIG.VIEWPORT_WIDTH * LP, CONFIG.VIEWPORT_HEIGHT * LP,
    0, 0, simCanvas.width, simCanvas.height);

  // Thứ tự có chủ ý: sóng nước nằm TRÊN mặt nước nhưng DƯỚI bóng mây (mây che cả
  // hồ), và lãnh thổ nằm trên cùng của nhóm nền vì nó là thông tin, không phải
  // cảnh vật — thông tin không được để cảnh vật đè lên.
  drawReedSway(cs);
  // ĐƯỜNG CÁI nằm TRÊN địa hình nhưng DƯỚI bóng mây và DƯỚI lãnh thổ. Cả ba vị trí
  // trong chồng lớp này đều là quyết định:
  //   · trên địa hình — nó là thứ người ta ĐẮP LÊN mặt đất, không phải một loại đất.
  //   · dưới bóng mây — mây phải quét qua cả con đường, nếu không đường trông như
  //     một lớp giao diện dán đè lên cảnh vật chứ không phải một vật thể trong thế giới.
  //   · dưới lãnh thổ — biên giới là THÔNG TIN, và luật đã ghi ở dòng ngay dưới nói
  //     rằng thông tin không được để cảnh vật đè lên. Con đường là cảnh vật.
  drawRoads(cs);
  drawCloudShadows(cs);
  renderTerritory(cs);
  drawCombatRings(cs);

  for (const r of ruins) {
    const [px, py] = worldToPx(r.x, r.y);
    if (!inView(px, py, r.size * cs)) continue;
    drawRuin(r, px, py, cs);
  }

  for (const cell of resourceCells.values()) {
    const [px, py] = worldToPx(cell.x, cell.y);
    if (!inView(px, py, cs * 2)) continue;
    const ratio = cell.max ? cell.amount / cell.max : 0;
    if (cell.type === 'wood') drawTree(cell.x, cell.y, px, py, cs, ratio);
    else if (cell.type === 'food') drawBerry(cell.x, cell.y, px, py, cs, ratio, !!cell.farmOf);
    else if (cell.type === 'gold') drawGold(cell.x, cell.y, px, py, cs, ratio);
    else drawStone(cell.x, cell.y, px, py, cs, ratio);
  }

  drawHeroAuras(cs);
  drawCampRings(cs);

  // Sắp theo y để cái ở dưới vẽ đè cái ở trên — ảo giác chiều sâu kiểu 2.5D,
  // thay vì nhà cửa/quân lính chồng lên nhau theo thứ tự ngẫu nhiên trong mảng.
  const drawables = [];
  for (const b of buildings) {
    const [px, py] = worldToPx(b.x, b.y);
    // Đệm culling phải cộng CHIỀU CAO sprite, không chỉ size. Thiếu nó thì công
    // trình có chân vừa trôi khỏi mép dưới khung hình bị loại luôn, và mái của nó
    // hiện nguyên khối thay vì trồi lên dần — cú pop-in rất lộ khi camera đang lia.
    if (inView(px, py, (b.size + buildingSpriteHeight(b)) * cs + cs * 2)) {
      drawables.push({ y: b.y, kind: 'b', o: b, px, py });
    }
  }
  for (const l of lairs) {
    const [px, py] = worldToPx(l.x, l.y);
    // pad rộng bằng cả vùng quầng tím, nếu không quầng bị cắt cụt ở mép khung hình
    if (inView(px, py, lairRoam(l) * cs)) drawables.push({ y: l.y, kind: 'l', o: l, px, py });
  }
  // TƯỜNG THÀNH đi vào ĐÚNG danh sách sắp theo chiều sâu này, không vẽ thành một
  // lượt riêng trước quân lính. Vẽ trước thì mọi người lính đều nổi lên trên mặt
  // tường, kể cả người đang đứng PHÍA SAU nó — và cả cảm giác "bên trong / bên
  // ngoài", thứ duy nhất mà bức tường sinh ra để tạo, biến mất sạch.
  for (const w of wallCells.values()) {
    const [px, py] = worldToPx(w.x, w.y);
    if (inView(px, py, cs * 2)) drawables.push({ y: w.y, kind: 'w', o: w, px, py });
  }
  for (const it of groundItems) {
    const [px, py] = worldToPx(it.x, it.y);
    if (inView(px, py, cs * 3)) drawables.push({ y: it.y, kind: 'i', o: it, px, py });
  }
  for (const u of units) {
    // Toạ độ VẼ, không phải toạ độ ô. Cả ba thứ dưới đây phải đọc CÙNG một nguồn:
    // vị trí vẽ, khoá sắp xếp theo chiều sâu, và hộp bao dùng cho hit-test — lệch
    // một trong ba là click trượt hoặc quân chui qua nhau. Đây đúng là họ lỗi
    // "điều hướng bằng đại lượng này, so sánh bằng đại lượng khác" đã cắn ở 3.1.
    const [px, py] = worldToPx(uRX(u), uRY(u));
    // Đệm culling phải phủ được sprite CAO NHẤT của nhóm, cùng lý do đã viết cho
    // công trình vài dòng trên. Từ 3.22 nhóm quái có con vẽ tới 2,7 ô và con phi
    // long còn treo thêm gần một ô nữa phía trên — với đệm 2 ô thì chúng bị loại
    // khi chân vừa ra khỏi mép và cả cái đầu biến mất nguyên khối.
    if (inView(px, py, cs * (u.type === 'monster' ? 4.5 : 2))) {
      drawables.push({ y: uRY(u), kind: 'u', o: u, px, py });
    }
  }
  // Sắp theo CHÂN, không theo TÂM. Với sprite phẳng thì hai cách cho kết quả gần
  // như nhau nên sai số này vô hình suốt từ đầu; sprite cao lên bao nhiêu thì nó lộ
  // ra bấy nhiêu. Ví dụ: nhà chính size 3 tâm y=100 có chân ở 101,5; căn nhà size 2
  // nhét vào góc Bắc tâm y=101 lại có chân ở 102 — sắp theo tâm thì căn nhà PHÍA SAU
  // được vẽ ĐÈ LÊN nhà chính. Đây đúng là họ lỗi "điều hướng bằng đại lượng này,
  // so sánh bằng đại lượng khác" đã cắn ở Phase 3.1, lần này là tâm-vs-chân.
  // Cố tình bắt theo d.kind chứ không phải `o.size !== undefined`: hang ổ cũng có
  // size, và duck-typing trên tên trường đã một lần làm vỡ CONFIG.BUILD lookup.
  // Ô tường có size 1 nên chân của nó là y + 0,5 — cùng công thức với công trình,
  // và phải viết ra thay vì rơi vào nhánh `: d.y` của quân lính: lệch nửa ô là
  // người lính đứng NGAY TRƯỚC chân tường bị vẽ chìm sau nó.
  const baseOf = (d) => (d.kind === 'b' || d.kind === 'l') ? d.y + d.o.size / 2
                      : d.kind === 'w' ? d.y + 0.5
                      : d.y;
  drawables.sort((a, b) => baseOf(a) - baseOf(b));
  for (const d of drawables) {
    if (d.kind === 'b') drawBuilding(d.o, d.px, d.py, cs);
    else if (d.kind === 'l') drawLair(d.o, d.px, d.py, cs);
    else if (d.kind === 'i') drawGroundItem(d.o, d.px, d.py, cs);
    else if (d.kind === 'w') drawWall(d.o, d.px, d.py, cs);
    else { drawUnit(d.o, d.px, d.py, cs); drawSupplyMark(d.o, d.px, d.py, cs); }
  }
  lastDrawables = drawables;   // hit-test đọc lại đúng danh sách này, xem selectAt

  drawOccludedUnits(drawables, cs);

  for (const f of fx) drawFx(f, cs);

  // Tên bộ lạc nổi trên thủ đô — biết ai đang ở đâu mà không cần đối chiếu màu.
  // Ưu tiên 3 (cao nhất): nhà chính đứng yên một chỗ suốt kỷ nguyên, nên nhãn của
  // nó là cái mốc; thứ nào di chuyển thì thứ đó phải né.
  if (cs >= 5) {
    const font = `600 ${Math.max(11, Math.round(cs * 1.7))}px ${F_DISPLAY}`;
    for (const b of buildings) {
      if (b.type !== 'town' || !b.done) continue;
      const [px, py] = worldToPx(b.x, b.y);
      if (!inView(px, py, cs * 8)) continue;
      const t = tribes[b.tribeId];
      // Nhãn treo trên ĐỈNH cột cờ. Hằng số -2.4 ô cũ giờ rơi vào giữa thân nhà chính.
      const labelY = py + cs / 2 + (b.size * cs) / 2 - buildingSpriteHeight(b) * cs - cs * 0.9;
      queueLabel(t.name, px + cs / 2, labelY, font, t.color, 3);
    }
  }
  flushLabels(toastLay && toastLay.blockers);

  const sel = getSelected();
  if (sel) {
    const [px, py] = worldToPx(uRX(sel), uRY(sel));
    // Vòng chọn nằm DƯỚI CHÂN vật thể và dẹt theo phối cảnh. Vòng tròn đặt ở tâm ô
    // trông như đang lơ lửng ngang bụng công trình khi nhà đã cao lên.
    const isB = selected.kind === 'building' || selected.kind === 'lair';
    const sz = isB ? sel.size : 1;
    const rx = cs * sz * (isB ? 0.72 : 0.85);
    const gy = py + cs / 2 + (isB ? (sz * cs) / 2 : cs * 0.5);
    ctx.strokeStyle = '#f0cf85';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -aTick * 0.3;
    ctx.beginPath(); ctx.ellipse(px + cs / 2, gy, rx, rx * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (sel.resTarget) {
      const [tx, ty] = worldToPx(sel.resTarget.x + 0.5, sel.resTarget.y + 0.5);
      ctx.strokeStyle = 'rgba(255,235,59,0.6)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px + cs / 2, py + cs / 2); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Biến cố lớn — MỘT DÒNG SỬ ĐƯỢC ĐÓNG DẤU.
  //
  // Đây là chỗ duy nhất trong cả bản này được phép ồn ào, và nó ồn ào có lý
  // do. Trò chơi không có người chơi: bạn chỉ ngồi xem, và thứ bạn thật sự
  // đang xem là một cuốn biên niên sử tự viết lấy. Một thông báo trôi qua bằng
  // chữ sans trên hộp xám thì đọc ra "log của phần mềm"; cùng đúng câu chữ ấy
  // mà được ĐÓNG DẤU xuống bản đồ thì đọc ra "việc này đã được chép lại". Con
  // dấu son mang số kỷ nguyên nên nó còn chở thêm một mẩu thông tin: chuyện
  // này xảy ra ở đời nào.
  //
  // Cú đóng dấu là một phép nhún: hiện ra to hơn 22% rồi sập xuống đúng cỡ
  // trong 9 khung hình, kèm một vòng mực loang bật ra. Không dùng thêm biến
  // hoạt ảnh nào — pha đọc thẳng từ (maxLife - life), nên nó không bao giờ
  // lệch pha với vòng đời của chính thông báo.
  //
  // Chỗ đứng (toạ độ, bề ngang, có phải xuống hàng dưới không) đã tính xong ở đầu
  // hàm bằng `layoutToasts` — xem chú thích ở đó.
  if (toastLay) {
    for (let ti = 0; ti < mapToasts.length; ti++) {
      const t = mapToasts[ti], row = toastLay.rows[ti];
      const a = t.life > t.maxLife - 20 ? (t.maxLife - t.life) / 20
              : t.life < 40 ? t.life / 40 : 1;
      const age = t.maxLife - t.life;
      const stamp = clamp(age / 9, 0, 1);
      const scale = 1 + (1 - stamp) * (1 - stamp) * 0.22;

      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(toastLay.cx, row.y);
      ctx.scale(scale, scale);

      const H = 30, SEAL = H;                       // con dấu vuông, cao bằng khối
      ctx.font = `15px ${F_DISPLAY}`;
      const txt = row.txt, tw = row.tw;
      const W = SEAL + 16 + tw + 16;
      const x0 = -W / 2, y0 = -H / 2;

      // Vòng mực loang lúc dấu vừa chạm xuống
      if (stamp < 1) {
        ctx.globalAlpha = clamp(a, 0, 1) * (1 - stamp) * 0.5;
        ctx.strokeStyle = '#c4402d';
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 - (1 - stamp) * 9, y0 - (1 - stamp) * 9,
                       W + (1 - stamp) * 18, H + (1 - stamp) * 18);
        ctx.globalAlpha = clamp(a, 0, 1);
      }

      ctx.fillStyle = 'rgba(13,11,9,0.9)';          // thân: sơn ta
      ctx.fillRect(x0, y0, W, H);
      ctx.strokeStyle = 'rgba(216,165,68,0.3)';     // sợi vàng lá viền quanh
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, W - 1, H - 1);

      ctx.fillStyle = '#c4402d';                    // con dấu son
      ctx.fillRect(x0, y0, SEAL, H);
      const grain = getInkGrain();
      if (grain) { ctx.fillStyle = grain; ctx.fillRect(x0, y0, SEAL, H); }
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(251,238,224,0.72)';
      ctx.font = `7px ${F_UI}`;
      ctx.fillText(T('KỶ'), x0 + SEAL / 2, y0 + 11);
      ctx.fillStyle = '#fbeee0';
      ctx.font = `700 14px ${F_DISPLAY}`;
      ctx.fillText(String(era), x0 + SEAL / 2, y0 + H - 6);

      ctx.textAlign = 'left';                       // dòng chữ + gạch chân màu phe
      ctx.fillStyle = '#e7dcc6';
      ctx.font = `15px ${F_DISPLAY}`;
      ctx.fillText(txt, x0 + SEAL + 16, y0 + H / 2 + 3);
      ctx.fillStyle = t.color;
      ctx.fillRect(x0 + SEAL + 16, y0 + H - 7, tw, 1.5);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // Đồng hồ Kỳ quan — dải đếm ngược bám sát mép trên khung hình.
  //
  // Đặt trên CANVAS chứ không trong bảng bên phải, và đó là cả điểm của nó: khi
  // đồng hồ chạy thì mọi thứ đáng xem đều đang xảy ra trong khung hình, và người
  // xem không được phải rời mắt khỏi trận đánh để biết còn bao lâu.
  // HAI ĐOẠN, HAI CÂU KHÁC NHAU (Phase 3.35). Dải này nay bật lên ngay từ lúc đặt
  // móng, nên nó phải nói được hai chuyện: "công trường đang lên tới đâu" và "còn
  // bao lâu là thua". Dùng chung một thanh tiến độ cho cả hai mà không đổi chữ thì
  // người xem đọc một cái đồng hồ đếm ngược trong khi thật ra chưa có gì để đếm —
  // tệ hơn hẳn so với không hiện gì.
  if (wonderWatch && eraState === 'playing') {
    const owner = tribes[wonderWatch.tribeId];
    const building = wonderWatch.phase === 'building';
    const left = building ? 0 : Math.max(0, CONFIG.WONDER.HOLD_TICKS - (tick - wonderWatch.doneAt));
    const prog = building ? wonderWatch.progress : 1 - left / CONFIG.WONDER.HOLD_TICKS;
    const W = simCanvas.width, barH = HUD_BAR_H;
    ctx.fillStyle = 'rgba(11,9,7,0.86)';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillStyle = owner.dark;
    ctx.fillRect(0, 0, W * prog, barH);
    ctx.fillStyle = owner.color;
    ctx.fillRect(0, barH - 2, W * prog, 2);
    ctx.textAlign = 'center';
    ctx.font = `14px ${F_DISPLAY}`;
    ctx.fillStyle = building ? '#d9b06a' : '#f0cf85';
    // Thanh này chiếm trọn bề ngang và minimap/nút đã dịch xuống dưới nó (biến
    // --hud-top), nên căn giữa khung hình giờ đúng nghĩa là giữa chỗ trống. Vẫn
    // cắt cho vừa: ở cửa sổ hẹp, câu đầy đủ dài hơn cả khung.
    ctx.fillText(fitText(building
      ? T('🏗 {tribe} ĐANG DỰNG KỲ QUAN — {pct}% · cả thiên hạ kéo tới chặn', { tribe: owner.name, pct: Math.round(prog * 100) })
      : T('🏛 KỲ QUAN của {tribe} — còn {left} tick là thống nhất thiên hạ', { tribe: owner.name, left }), W - 24),
                 W / 2, barH - 8);
    ctx.textAlign = 'left';
  }

  // Vignette: tối bốn góc lại, kéo mắt vào giữa khung. Rẻ và làm ảnh "có chất phim".
  const vg = ctx.createRadialGradient(
    simCanvas.width / 2, simCanvas.height / 2, simCanvas.height * 0.42,
    simCanvas.width / 2, simCanvas.height / 2, simCanvas.height * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, simCanvas.width, simCanvas.height);

  drawHudBar();
}

function renderMinimap() {
  const s = CONFIG.MINIMAP_SCALE;
  if (minimapTerrainCanvas.width) mctx.drawImage(minimapTerrainCanvas, 0, 0);
  else { mctx.fillStyle = '#1e2b1f'; mctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height); }

  // Lãnh thổ trên minimap: đây mới là chỗ nhìn ra "ai đang thắng" trong một giây.
  if (territoryOwner) {
    const C = CONFIG.TERRITORY.CELL;
    mctx.globalAlpha = 0.5;
    for (let ty = 0; ty < terrH; ty++) {
      for (let tx = 0; tx < terrW; tx++) {
        const owner = territoryOwner[ty * terrW + tx];
        if (owner < 0) continue;
        mctx.fillStyle = tribes[owner].color;
        mctx.fillRect(tx * C * s, ty * C * s, C * s, C * s);
      }
    }
    mctx.globalAlpha = 1;
  }

  for (const b of buildings) {
    mctx.fillStyle = b.type === 'town' ? '#ffffff' : tribes[b.tribeId].color;
    const w = Math.max(2, b.size * s);
    mctx.fillRect(b.x * s - w / 2, b.y * s - w / 2, w, w);
  }
  // Hang ổ trên minimap: người xem phải biết cần tránh chỗ nào TRƯỚC khi đưa quân
  // tới đó, mà bản đồ giờ rộng gấp đôi khung nhìn nên minimap là chỗ duy nhất thấy được.
  for (const l of lairs) {
    const skin = lairSkin(l);
    mctx.fillStyle = `rgba(${skin.glow},${0.22 + l.tier * 0.06})`;
    mctx.beginPath();
    mctx.arc(l.x * s, l.y * s, lairRoam(l) * s, 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = skin.edge;
    const w = Math.max(3, s * (2.6 + l.tier * 0.7));
    mctx.fillRect(l.x * s - w / 2, l.y * s - w / 2, w, w);
  }

  for (const u of units) {
    if (u.type === 'hero') continue;
    if (u.type === 'monster') {
      // Quái của sóng vẽ đỏ và to hơn: trên minimap đây là thông tin quan trọng
      // nhất của chế độ thủ thành — sóng đang tới từ hướng nào.
      mctx.fillStyle = u.assault ? '#e04b32' : '#a86ac6';
      const mw = Math.max(1, s * (u.assault ? 2.4 : 1.6));
      mctx.fillRect(u.x * s, u.y * s, mw, mw);
      continue;
    }
    mctx.fillStyle = tribes[u.tribeId].color;
    // `isSiege` chứ không phải `type === 'catapult'`: nỏ thần vốn rơi xuống nhánh
    // "quân sự thường" (1,8) nên trên minimap nó nhỏ hơn một con ngựa — cùng con lỗi
    // "một bảng tra có hai nguồn sự thật" mà cờ `siege: true` trong CONFIG.UNIT sinh
    // ra để dập tắt. Thêm một loại máy công thành nữa thì chỗ này tự đúng.
    const w = Math.max(1, s * (isSiege(u.type) ? 2.6 : isCavalry(u.type) ? 2.9
                             : isMilitary(u.type) ? 1.8 : 1));
    mctx.fillRect(u.x * s, u.y * s, w, w);
  }
  // Anh hùng vẽ sau cùng, viền vàng: trên minimap chỉ có 4 chấm này là "ai đó"
  // chứ không phải "một đơn vị nào đó", nên chúng không được phép bị đè.
  for (const u of units) {
    if (u.type !== 'hero') continue;
    const w = Math.max(4, s * 3.4);
    mctx.fillStyle = '#d8a544';
    mctx.fillRect(u.x * s - w / 2, u.y * s - w / 2, w, w);
    mctx.fillStyle = tribes[u.tribeId].color;
    mctx.fillRect(u.x * s - w / 2 + 1, u.y * s - w / 2 + 1, w - 2, w - 2);
  }
  // Điểm nóng nhấp nháy = có đánh nhau ở đó ngay lúc này.
  for (const h of hotspots) {
    if (h.weight < 2) continue;
    mctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.4 * Math.sin(aTick * 0.15)})`;
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.arc(h.x * s, h.y * s, 4 + Math.min(6, h.weight * 0.4), 0, Math.PI * 2);
    mctx.stroke();
  }

  mctx.strokeStyle = '#f0cf85';
  mctx.lineWidth = 1;
  mctx.strokeRect(camX * s, camY * s, CONFIG.VIEWPORT_WIDTH * s, CONFIG.VIEWPORT_HEIGHT * s);
}

