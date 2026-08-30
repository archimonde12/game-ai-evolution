// ============================================================
// BỘ ĐO KHÔNG CẦN rAF — dán cả tệp này vào console của civilization.html
// ============================================================
// Vì sao cần: rAF KHÔNG chạy khi Browser pane bị ẩn, nên `running = true` không
// làm mô phỏng nhúc nhích. Bộ đo này tự gọi simulationTick() trong vòng lặp, và
// tự sang kỷ nguyên mới khi eraState chuyển sang 'ended'.
//
// Giá phải trả, đo ở lần dùng đầu (Phase 3.44): đầu kỷ nguyên 0,47 ms/tick, cuối
// kỷ nguyên 3,05 ms/tick (735 đơn vị / 241 công trình). Tám kỷ nguyên / 155.055
// tick tốn chừng 10 phút đồng hồ thật.
//
// Chia thành từng khúc 4.000 tick nối nhau bằng setTimeout, chứ không chạy một
// vòng lặp dài: một lệnh javascript_tool chạy quá lâu sẽ trả về lỗi và MẤT kết
// quả, dù vòng lặp trong trang vẫn chạy tiếp. Chia khúc thì lúc nào hỏi cũng có
// số để đọc.
//
// Dùng:  __measure.start('conquest', 8)   rồi   __measure.report()
// ============================================================
window.__measure = (function () {
  const M = { eras: [], cur: null, bg: { on: false, target: 0, chunks: 0 } };

  // Mọi kinh đô sập đều đi qua destroyBuilding — kể cả do quái vật, tức là kể cả
  // những cái KHÔNG tính vào townsRazed của bộ lạc nào.
  if (!window.__measure_hooked) {
    window.__measure_hooked = true;
    const _db = destroyBuilding;
    window.destroyBuilding = function (b) {
      if (b && b.type === 'town' && M.cur) M.cur.townDeaths++;
      return _db.apply(this, arguments);
    };
  }

  function newEra() {
    M.cur = { era, townDeaths: 0, probeSamples: 0, probeSiege: 0, minTownHp: 1, wonderSeen: 0, block: {} };
  }

  // Lấy mẫu mỗi 100 tick. `wonderBlock()` là hàm CỦA GAME, không phải bản dựng
  // lại — hỏi nó thì không thể lệch khỏi luật thật.
  function probe() {
    const c = M.cur; if (!c) return;
    c.probeSamples++;
    let siege = 0;
    for (const b of buildings) {
      if (b.type !== 'town' || b.hp <= 0 || !b.done) continue;
      const frac = b.hp / b.maxHp;
      if (frac < c.minTownHp) c.minTownHp = frac;
      for (const u of units) {
        if (u.hp <= 0 || u.tribeId === b.tribeId || u.tribeId < 0) continue;
        if (!isMilitary(u.type) && u.type !== 'hero') continue;
        if (Math.hypot(u.x - b.x, u.y - b.y) < 15) { siege = 1; break; }
      }
      if (siege) break;
    }
    c.probeSiege += siege;
    if (buildings.some(b => b.type === 'wonder')) c.wonderSeen = 1;
    for (const t of tribes) {
      if (!t.alive) continue;
      const b = wonderBlock(t);
      const k = b === null ? '(mở)' : String(b);
      c.block[k] = (c.block[k] || 0) + 1;
    }
  }

  function closeEra() {
    const c = M.cur; if (!c) return;
    c.endTick = tick;
    c.reason = (eraHistory[0] && eraHistory[0].reason) ? eraHistory[0].reason.kind : '?';
    c.tribes = tribes.map(t => ({ n: t.name, razed: t.razed, towns: t.townsRazed, alive: t.alive, age: t.age }));
    c.totalTownsRazed = tribes.reduce((s, t) => s + t.townsRazed, 0);
    c.mandateTribes = tribes.filter(t => t.townsRazed >= CONFIG.WONDER.NEED_TOWNS).length;
    M.eras.push(c);
    M.cur = null;
  }

  function run(budget) {
    let n = 0;
    while (n < budget) {
      simulationTick(); n++;
      if (tick % 100 === 0) probe();
      if (eraState === 'ended') {
        closeEra();
        if (M.eras.length >= M.bg.target) return n;
        beginNextEra();
        running = false;      // rAF không được phép tick chồng lên vòng lặp này
        newEra();
      }
    }
    return n;
  }

  return {
    start(mode, eras) {
      enterGame(mode || 'conquest');
      running = false;
      M.eras = []; M.bg = { on: true, target: eras || 8, chunks: 0 };
      newEra();
      (function step() {
        if (!M.bg.on) return;
        run(4000);
        M.bg.chunks++;
        if (M.eras.length >= M.bg.target) { M.bg.on = false; return; }
        setTimeout(step, 0);
      })();
      return { started: true, mode: gameMode, target: M.bg.target };
    },
    stop() { M.bg.on = false; return { stopped: true, erasDone: M.eras.length }; },
    report() {
      const E = M.eras;
      const ticks = E.reduce((s, e) => s + e.endTick, 0);
      const razed = E.reduce((s, e) => s + e.totalTownsRazed, 0);
      const agg = {}; let tot = 0;
      for (const e of E) for (const k in e.block) { agg[k] = (agg[k] || 0) + e.block[k]; tot += e.block[k]; }
      return {
        dangChay: M.bg.on, eras: E.length, ticks, townsRazed: razed,
        per10k: +(10000 * razed / Math.max(1, ticks)).toFixed(2),
        erasCoRaze: E.filter(e => e.totalTownsRazed > 0).length,
        erasThangBangKyQuan: E.filter(e => e.reason === 'wonder').length,
        tungKyNguyen: E.map(e => ({ e: e.era, end: e.endTick, reason: e.reason, towns: e.totalTownsRazed, wonder: e.wonderSeen })),
        chanCuaKyQuan: Object.entries(agg).sort((a, b) => b[1] - a[1])
          .map(([k, v]) => ({ ly_do: k, pct: +(100 * v / tot).toFixed(1) }))
      };
    },
    _raw: M
  };
})();
