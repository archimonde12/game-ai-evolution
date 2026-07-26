'use strict';
// ============================================================
// 03-territory.js
// ------------------------------------------------------------
// Lãnh thổ theo trọng số ảnh hưởng của công trình, lớp màu biên giới, và hàng
// đợi hiệu ứng ngắn (fx) / điểm nóng cho camera đạo diễn.
// Tách cơ học từ civilization.html một-file, dòng 2451–2610.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Lãnh thổ, hiệu ứng, điểm nóng
// ============================================================
// Bảng này PHẢI phủ hết mọi loại công trình trong CONFIG.BUILD. Bốn loại của
// Phase 3.6 (nhà cầu nguyện, xưởng thợ, đền thờ, Kỳ quan) từng bị bỏ quên ở đây,
// và hậu quả không phải là "chúng không góp ảnh hưởng" — mà là XOÁ SẠCH biên giới
// của cả bộ lạc. Cơ chế: thiếu khoá -> w = undefined -> `arr[i] += undefined / d`
// -> NaN, mà NaN thì đầu độc VĨNH VIỄN ô đó (mọi phép cộng sau vẫn NaN) và
// `NaN > bestScore` luôn false nên ô rơi về vô chủ. Nhà cầu nguyện mở khoá ngay
// từ thời đại 1, nên chỉ cần một cái là ~250 ô quanh kinh đô mất chủ — kể cả ảnh
// hưởng của chính toà nhà chính đứng trong vùng đó. Đo lúc tìm ra: 56/4675 ô còn
// chủ, ba trên bốn bộ lạc không còn một mét biên giới nào dù đang sống khoẻ.
const INFLUENCE_WEIGHT = {
  town: 7, wonder: 6, temple: 4, barracks: 3, tower: 3, workshop: 2.5, stable: 2.5,
  infirmary: 2, shrine: 2, farm: 1.4, house: 1
};
// Mặc định cho loại chưa có trong bảng. Bảng này thuần HIỂN THỊ, nên một trọng số
// hơi sai vẫn tốt hơn vô hạn lần so với một bản đồ không còn biên giới; thêm loại
// công trình mới mà quên khai báo thì nó lặng lẽ tính như một căn nhà, chứ không
// thổi bay cả hệ thống lãnh thổ.
const INFLUENCE_DEFAULT = 1;

// Chủ quyền mỗi ô thô = bộ lạc có tổng ảnh hưởng lớn nhất, ảnh hưởng của một
// công trình giảm theo bình phương khoảng cách. Tính lại mỗi RECOMPUTE_INTERVAL
// tick chứ không phải mỗi tick: đây là 2400 ô x ~60 công trình, quá nặng cho
// 60 lần/frame, mà biên giới cũng chẳng nhúc nhích trong vài chục tick.
function computeTerritory() {
  const C = CONFIG.TERRITORY.CELL;
  terrW = Math.ceil(CONFIG.GRID_WIDTH / C);
  terrH = Math.ceil(CONFIG.GRID_HEIGHT / C);
  if (!territoryOwner || territoryOwner.length !== terrW * terrH) {
    territoryOwner = new Int8Array(terrW * terrH);
  }
  // Cách ngây thơ (mỗi ô thô duyệt MỌI công trình) là 2400 x ~200 = 480k phép
  // tính mỗi lần chạy — đo thật thấy nó một mình chiếm phần lớn chi phí thêm vào
  // của bản này. Đảo chiều vòng lặp: mỗi công trình "phun" ảnh hưởng vào vùng
  // lân cận hữu hạn của nó. Ngoài SPLAT_RADIUS ô thì ảnh hưởng đã nhỏ hơn
  // MIN_INFLUENCE ngay cả với nhà chính, nên cắt ở đó không đổi kết quả.
  const SPLAT_RADIUS = 28;
  const n = terrW * terrH;
  if (!computeTerritory._buf || computeTerritory._buf[0].length !== n) {
    computeTerritory._buf = [];
    for (let i = 0; i < CONFIG.TRIBE_COUNT; i++) computeTerritory._buf.push(new Float32Array(n));
  }
  const buf = computeTerritory._buf;
  for (const arr of buf) arr.fill(0);

  const rCells = Math.ceil(SPLAT_RADIUS / C);
  for (const b of buildings) {
    if (b.hp <= 0) continue;
    const w = INFLUENCE_WEIGHT[b.type] ?? INFLUENCE_DEFAULT;
    const btx = Math.floor(b.x / C), bty = Math.floor(b.y / C);
    const arr = buf[b.tribeId];
    for (let ty = Math.max(0, bty - rCells); ty <= Math.min(terrH - 1, bty + rCells); ty++) {
      for (let tx = Math.max(0, btx - rCells); tx <= Math.min(terrW - 1, btx + rCells); tx++) {
        const dx = b.x - (tx * C + C / 2), dy = b.y - (ty * C + C / 2);
        arr[ty * terrW + tx] += w / (dx * dx + dy * dy + 40);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    let best = -1, bestScore = CONFIG.TERRITORY.MIN_INFLUENCE;
    for (let t = 0; t < CONFIG.TRIBE_COUNT; t++) {
      if (buf[t][i] > bestScore) { bestScore = buf[t][i]; best = t; }
    }
    territoryOwner[i] = best;
  }

  // Dọn ĐỐM LẺ. Ngay rìa vùng ảnh hưởng, một ô thô đơn độc thường vượt ngưỡng
  // trong khi cả bốn ô quanh nó thì không — và vì biên giới chỉ được vẽ ở nơi
  // CHỦ QUYỀN ĐỔI, một ô như vậy hiện lên thành đúng MỘT HÌNH CHỮ NHẬT rỗng nằm
  // giữa đồng không, cách xa mọi công trình. Nhìn ra màn hình nó không đọc được
  // là "biên giới": nó đọc được là "cái khung này là cái gì?".
  //
  // Phép mở hình thái học một bước: ô nào có DƯỚI 3 láng giềng cùng chủ (trong 8
  // ô quanh) thì trả về vô chủ. Ngưỡng 3 chứ không phải 1 là có lý do đo được:
  // ngưỡng 1 xoá được đốm đơn độc nhưng KHÔNG xoá được dải rộng đúng một ô — mà
  // dải một ô mới là thứ hay gặp ở rìa vùng ảnh hưởng, và nó vẽ ra đúng cái hình
  // chữ nhật dài rỗng ruột nằm giữa đồng. Vùng lãnh thổ thật thì luôn dày, nên
  // ngưỡng 3 không đụng tới biên giới nào có nghĩa.
  //
  // Chạy trên một BẢN SAO. Đọc-ghi cùng một mảng thì ô vừa bị xoá sẽ khiến ô kế
  // tiếp mất láng giềng, và cả một biên giới hợp lệ tự ăn mòn chính nó theo dây
  // chuyền — cùng họ với lỗi "snapshot vs tham chiếu sống" ở camera đạo diễn,
  // chỉ là lần này chiều nhân quả ngược lại: ở đây bản sao mới là cái đúng.
  const snap = territoryOwner.slice();
  for (let ty = 0; ty < terrH; ty++) {
    for (let tx = 0; tx < terrW; tx++) {
      const i = ty * terrW + tx, o = snap[i];
      if (o < 0) continue;
      let same = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= terrW || ny >= terrH) continue;
          if (snap[ny * terrW + nx] === o) same++;
        }
      }
      if (same < 3) territoryOwner[i] = -1;
    }
  }
  buildTerritoryTint();
}

// Lãnh thổ vẽ SẴN ở 1 px MỖI Ô THÔ rồi phóng to CÓ NỘI SUY — đúng mẹo đã dùng
// cho lớp địa hình, và vì cùng một lý do. Ô thô rộng 4 ô thật, nên tô thẳng ở
// độ phân giải màn hình thì mọi biên giới hiện ra thành bậc thang vuông vức
// rộng gần bốn chục pixel: mắt đọc ra "lưới dữ liệu", không đọc ra "vùng đất".
// Nội suy song tuyến biến đúng cái lưới đó thành mảng màu loang, mà chi phí
// mỗi frame vẫn là MỘT lệnh drawImage thay cho hàng nghìn fillRect. Nét biên
// giới thì vẫn vẽ sắc ở trên: cái cần mềm cho mềm, cái cần sắc giữ sắc.
let territoryTint = document.createElement('canvas');
function buildTerritoryTint() {
  if (territoryTint.width !== terrW || territoryTint.height !== terrH) {
    territoryTint.width = terrW; territoryTint.height = terrH;
  }
  const c = territoryTint.getContext('2d');
  c.clearRect(0, 0, terrW, terrH);
  for (let ty = 0; ty < terrH; ty++) {
    for (let tx = 0; tx < terrW; tx++) {
      const o = territoryOwner[ty * terrW + tx];
      if (o < 0) continue;
      c.fillStyle = tribes[o].color;
      c.fillRect(tx, ty, 1, 1);
    }
  }
}

function terrOwnerAt(tx, ty) {
  if (!territoryOwner || tx < 0 || ty < 0 || tx >= terrW || ty >= terrH) return -1;
  return territoryOwner[ty * terrW + tx];
}

function addFx(f) {
  if (fx.length >= CONFIG.FX_MAX) return; // trần cứng: ở 60x tốc độ, không chặn thì mảng phình vô hạn
  fx.push(f);
}

// Điểm nóng: nơi vừa có đánh nhau. Camera đạo diễn dùng cái này để tự chọn cảnh
// quay. Sự kiện cùng chỗ thì cộng dồn trọng số thay vì tạo điểm mới -> một trận
// đánh lớn kéo dài luôn "nặng ký" hơn một cuộc chạm trán lẻ.
function addHotspot(x, y, weight, label) {
  for (const h of hotspots) {
    // Bán kính gộp nới từ 18 lên 26 theo bản đồ 340x220: một trận công thành trải
    // rộng hơn trước, nếu không gộp thì nó vỡ thành ba bốn điểm nóng nhỏ tranh
    // nhau, camera nhảy qua nhảy lại giữa hai nửa của CÙNG một trận.
    if (dist(h.x, h.y, x, y) < 26) {
      h.weight += weight;
      h.x = (h.x + x) / 2; h.y = (h.y + y) / 2;
      h.tick = tick;
      if (label) h.label = label;
      return;
    }
  }
  hotspots.push({ x, y, weight, tick, label: label || 'Giao tranh' });
  if (hotspots.length > 24) hotspots.shift();
}

