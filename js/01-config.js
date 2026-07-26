'use strict';
// ============================================================
// 01-config.js
// ------------------------------------------------------------
// Toàn bộ số của trò chơi: CONFIG (bản đồ, đơn vị, công trình, thời đại,
// nâng cấp, quái, thần lực) + TRIBE_TEMPLATES. Không có logic, chỉ có hằng số.
// Nạp ĐẦU TIÊN vì nhiều file sau đọc CONFIG ngay lúc tải (vd UPGRADE_LINES).
// Tách cơ học từ civilization.html một-file, dòng 1056–2074.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================

// ============================================================
// CHÚA TỂ — CIVILIZATION SIM
// ------------------------------------------------------------
// Khác hẳn evolution sim ở index.html: đơn vị ở đây KHÔNG tiến hoá theo cá
// thể. Cái tiến hoá là "gen chiến lược" (policy) của CẢ BỘ LẠC — bộ trọng số
// quyết định bộ lạc dồn dân vào gỗ hay lương, nuôi bao nhiêu lính, hiếu chiến
// tới đâu, có vội lên thời đại không. Cuối mỗi kỷ nguyên, policy của bộ lạc
// THẮNG được nhân bản + đột biến thành 3 bộ lạc kỷ nguyên sau (+1 bộ lạc random
// giữ đa dạng). Đây là genetic algorithm chạy ở tầng CHIẾN LƯỢC, không phải
// tầng cá thể — nên xem lâu sẽ thấy "các nền văn minh học được cách chơi".
//
// Người chơi = Chúa Tể: KHÔNG điều khiển ai cả, chỉ xem. Có thể tiêu Đức Tin
// (tự hồi) để giáng sét/ban mưa/gieo dịch — tuỳ thích, không bắt buộc.
// ============================================================
const CONFIG = {
  // Bản đồ 340x220 = 74.800 ô, gấp đôi diện tích bản 240x160. Khung nhìn giữ
  // nguyên 150x100, nên bây giờ mắt chỉ thấy được ~20% thế giới cùng lúc: bản đồ
  // trở thành thứ phải KHÁM PHÁ chứ không còn liếc một cái là nắm hết. Đây là
  // điều kiện cần để quái vật và hang ổ có nghĩa — hiểm hoạ chỉ đáng sợ khi nó
  // nằm ở chỗ ta chưa nhìn tới.
  GRID_WIDTH: 340,
  GRID_HEIGHT: 220,
  VIEWPORT_WIDTH: 150,
  VIEWPORT_HEIGHT: 100,
  CELL_SIZE: 6,
  MINIMAP_SCALE: 0.55,   // hạ theo bản đồ để minimap không phình che mất khung hình
  CAMERA_PAN_SPEED: 1.5,

  // Lưới băm không gian cho tìm-gần-nhất. Nếu quét tuyến tính toàn bộ ~2500 ô
  // tài nguyên cho mỗi lần dân thường cần mục tiêu mới thì ở 60x speed sẽ nghẽn.
  BUCKET_SIZE: 12,

  // Số cụm tài nguyên nhân theo diện tích (~x1.95), giữ nguyên MẬT ĐỘ. Không
  // nhân lên thì bản đồ rộng gấp đôi hoá ra nghèo đi một nửa, và mọi cân bằng
  // kinh tế đã tinh chỉnh ở các bản trước sụp hết.
  MAP: {
    FOREST_CLUSTERS: 50, FOREST_RADIUS: 11, TREE_SPACING: 2, TREE_DENSITY: 0.55, WOOD_PER_TREE: 110,
    BERRY_CLUSTERS: 35, BERRY_RADIUS: 6, BERRY_DENSITY: 0.45, FOOD_PER_BERRY: 110,
    BERRY_REGROW: 0.035,  // bụi quả mọc lại — nguồn thức ăn TÁI TẠO nhưng chậm
    GOLD_CLUSTERS: 21, GOLD_RADIUS: 4, GOLD_DENSITY: 0.5, GOLD_PER_ORE: 90,
    // Vàng KHÔNG tái tạo: đây là ngòi nổ chiến tranh giai đoạn sau — hết mỏ thì
    // muốn có vàng (để lên thời đại + nuôi lính) chỉ còn cách cướp của bộ lạc khác.

    // ĐÁ — tài nguyên thứ tư, và là tài nguyên đầu tiên trong game có PHÂN BỐ
    // KHÔNG ĐỀU CÓ CHỦ Ý: ít cụm hơn vàng (14 so với 21) nhưng mỗi cụm to và dày
    // hơn hẳn. Hệ quả là bản đồ có những vùng thật sự GIÀU ĐÁ và những vùng thật
    // sự KHÔNG CÓ ĐÁ, thay vì rải đều một lớp mỏng khắp nơi.
    //
    // Đó chính là điểm của nó. Đá gác cửa mọi thứ thuộc về hậu kỳ (thời đại 3-4,
    // xưởng thợ, đền thờ, Kỳ quan), nên "nhà anh có mỏ đá gần không" trở thành
    // một sự thật ĐỊA LÝ quyết định số phận cả kỷ nguyên — đúng vai trò mà hồ
    // nước từng giữ ở Phase 3.1. Từ bản bỏ nước, ĐÁ là nguồn bất công địa lý duy
    // nhất còn lại, nên nó gánh một mình cái việc mà trước đây hai thứ cùng gánh.
    // Rải đều thì đá chỉ là một cột số nữa trong bảng; rải cụm thì nó là lý do
    // để đi chiếm đất.
    STONE_CLUSTERS: 14, STONE_RADIUS: 5, STONE_DENSITY: 0.62, STONE_PER_ROCK: 130
  },

  // Địa hình sinh bằng value-noise nhiều tầng (fbm). TỪ BẢN NÀY KHÔNG CÒN NƯỚC:
  // chỗ trũng nhất của bản đồ ra ĐẦM CẠN — vẫn tối, vẫn ẩm, vẫn có viền cát như
  // bờ hồ cũ, nhưng ĐI QUA ĐƯỢC. Lý do bỏ nước không phải thẩm mỹ mà là rủi ro:
  // nước là vùng chặn duy nhất đủ lớn để nhốt cả một bộ lạc hoặc ép một đoàn quân
  // vào một cái vịnh lõm, và mọi thứ chống-kẹt (flow field, eo đất đắp tay, rút
  // cạn nước quanh kinh đô, dạt đồ rơi vào bờ) đều sinh ra chỉ để vá cái đó.
  // Bỏ ô chặn thì cả lớp vá ấy biến mất theo — xem generateTerrain.
  TERRAIN: {
    // Tỉ lệ diện tích là đầm cạn — áp bằng PHÂN VỊ, xem generateTerrain.
    // Đặt 0 thì bản đồ thành một dải cỏ liền không có vùng trũng nào.
    BASIN_FRACTION: 0.12,
    // 10 px/ô thay vì 8. Ở zoom "rất gần" (14 px/ô) lớp nền cũ bị phóng 1,75 lần
    // nên mặt đất nhoè thành một tấm thảm loang lổ; 10 px/ô hạ tỉ lệ phóng xuống
    // 1,4 và đủ chỗ để nướng thêm hoa/sỏi vào nền. Giá: canvas 3400x2200 (~30MB)
    // dựng lại một lần mỗi kỷ nguyên — vẫn là 1 lệnh drawImage mỗi frame.
    LAYER_PX: 10,          // độ phân giải lớp nền vẽ sẵn (px/ô); phóng to hơn thì scale mềm, không vẽ lại
    // Cường độ đổ bóng địa hình. Gradient độ cao qua 2 ô của fbm chỉ cỡ 0,02–0,06
    // nên cần hệ số lớn mới thấy được. Đây là số chỉnh bằng mắt, không có công thức.
    SHADE_STRENGTH: 14
  },

  // Lãnh thổ: mỗi ô thô (TERR_CELL x TERR_CELL ô thật) thuộc về bộ lạc có tổng
  // "ảnh hưởng" từ các công trình lớn nhất. Không ảnh hưởng luật chơi — thuần
  // hiển thị — nhưng là thứ khiến cả bàn cờ đọc được trong một cái liếc mắt.
  TERRITORY: { CELL: 4, RECOMPUTE_INTERVAL: 90, MIN_INFLUENCE: 0.02 },

  FX_MAX: 400,
  RUIN_LIFETIME: 900,

  TRIBE_COUNT: 4,
  START: { food: 250, wood: 250, gold: 60, stone: 0, villagers: 5 },

  ECON: {
    GATHER_FOOD: 0.5, GATHER_WOOD: 0.45, GATHER_GOLD: 0.3, GATHER_STONE: 0.26, // đơn vị/tick khi đang đứng thu hoạch
    CARRY_CAPACITY: 15,
    DEPOSIT_RANGE: 2,      // đứng cách nhà <= ngần này ô là trả được hàng
    // Chi phí nuôi quân/tick. Đây là thứ tạo SỨC CHỨA thật cho nền văn minh:
    // không có nó thì dân số chỉ bị chặn bởi số nhà, và mọi bộ lạc đều phình vô
    // hạn. Có nó thì bành trướng quá nhanh = chết đói (xem starvation ở tickTribeEconomy).
    UPKEEP_VILLAGER: 0.015,
    UPKEEP_SOLDIER: 0.06,
    // Dự trữ tối thiểu phải giữ TRƯỚC KHI được phép tuyển thêm quân. Không có
    // ngưỡng này, bộ não tuyển liên tục cho tới khi kho lương chạm đáy rồi đứng
    // yên ở đó — nên chỉ cần một cú sốc nhỏ (dân bị giết, mỏ cạn) là cả bộ lạc
    // rơi thẳng vào nạn đói dù bản đồ vẫn còn đầy bụi quả. Đây là lỗi cân bằng
    // lớn nhất của bản đầu: 3/4 bộ lạc chết đói giữa một thế giới thừa lương thực.
    FOOD_RESERVE: 260,
    // Đói làm tụt máu, nhưng lính chịu ĐỦ còn dân thường chỉ chịu một nửa — dân
    // thường là cỗ máy hồi phục, giết họ trước là khoá luôn đường thoát, biến mọi
    // đợt đói thành xoáy tử vong một chiều thay vì một cú sốc có thể gượng dậy.
    STARVE_DAMAGE: 0.25
  },

  // ------------------------------------------------------------------
  // PHASE 3.16 — GIÁP (`defense`) và vì sao nó phải có mặt trước cả kỵ binh
  //
  // Cho tới bản này mỗi đơn vị chỉ có ĐÚNG MỘT con số nói về sức chiến đấu:
  // `attack`. Máu thì có, nhưng máu là bể chứa chứ không phải khả năng — nó không
  // trả lời được "một đòn ăn vào người này còn lại bao nhiêu". Hệ quả là mọi so
  // sánh giữa hai loại quân đều quy về "ai đấm mạnh hơn / ai dày máu hơn", tức là
  // MỘT trục. Trên một trục thì không có kéo-búa-bao, chỉ có thang bậc: loại quân
  // mới bao giờ cũng hoặc thừa hoặc vô dụng.
  //
  // Giáp trừ THẲNG vào sát thương mỗi đòn (xem dealDamage), nên nó khuếch đại
  // khác nhau tuỳ NHỊP ĐÁNH: kỵ binh chém 4 giáp gần như miễn nhiễm với cung thủ
  // bắn 6 sát thương, nhưng máy bắn đá đánh 20 một phát thì trừ 4 chẳng đáng gì.
  // Cùng một con số, hai kết cục ngược nhau — đó là trục thứ hai mà bảng chỉ số
  // cũ không có, và cũng là lý do nâng cấp "giáp trụ" đáng tồn tại như một nhánh
  // nghiên cứu riêng chứ không phải một cục +sát thương nữa.
  //
  // Sàn 25%: không bao giờ để giáp vô hiệu hoá HẲN một đòn. Nếu cho phép chạm 0,
  // một đạo cung thủ đứng trước kỵ binh giáp dày sẽ bắn vĩnh viễn mà không hạ nổi
  // một con — và trên màn hình đó không đọc ra là "khắc chế", nó đọc ra là "game
  // treo". Công trình KHÔNG có giáp: chúng đã có hệ số BUILDING_DAMAGE_MULT riêng.
  // ------------------------------------------------------------------
  UNIT: {
    VILLAGER: { hp: 30, attack: 2, defense: 0, speed: 1, cost: { food: 45 }, trainTicks: 35 },
    SOLDIER:  { hp: 65, attack: 7, defense: 2, speed: 1, cost: { food: 55, gold: 20 }, trainTicks: 50 },
    // CUNG THỦ — mở khoá ở Đồ Đồng, huấn luyện tại Xưởng thợ.
    //
    // Vì sao đáng thêm, ngoài chuyện "một loại quân nữa": trước bản này mọi trận
    // đánh đều là hai đám chấm màu chạm nhau rồi trừ máu — không có ĐỘI HÌNH, vì
    // không có lý do gì để một đơn vị muốn đứng ở chỗ khác với đơn vị bên cạnh.
    // Tầm bắn tạo ra lý do đó: cung thủ giòn (42 máu, thua cả dân thường có giáp
    // thời đại) nên phải nấp sau lính cận chiến, và người xem NHÌN THẤY được điều
    // đó thành hình mà không cần ai giải thích.
    ARCHER:   { hp: 42, attack: 6, defense: 0, speed: 1, cost: { food: 40, wood: 45 }, trainTicks: 55,
                range: 6, cooldown: 15, minRange: 2 },
    // ================================================================
    // KỴ BINH — hai loại, Đồ Sắt và Hoàng Kim, đều ra lò từ CHUỒNG NGỰA
    // ================================================================
    // Động từ mới của cả hai: ĐI NHANH HƠN MỌI THỨ KHÁC TRÊN BẢN ĐỒ.
    //
    // Vì sao tốc độ mới là thứ đáng thêm, chứ không phải thêm máu/sát thương:
    // trong bản 3.15 mọi đơn vị của mọi bộ lạc đều đi đúng 1 ô/tick, nên khoảng
    // cách trên bản đồ 340x220 là một hằng số mà KHÔNG AI thay đổi được. Hệ quả
    // là địa lý chỉ có một tác dụng duy nhất — làm mọi thứ chậm đều như nhau.
    // Một đơn vị đi 1,7 ô/tick biến khoảng cách thành thứ có thể MUA: kỵ binh tới
    // được chỗ đánh nhau khi nó còn đang diễn ra, đuổi kịp dân bỏ chạy (thứ chưa
    // ai từng làm được), và rút khỏi trận thua trước khi bị vây. Cùng bảng chỉ số
    // ấy mà để speedMult = 1 thì hai loại này chỉ là "lính đắt tiền".
    //
    // Cái giá phải trả nằm ở CHỖ KHÁC, không nằm trong bảng: chúng đòi một công
    // trình thứ ba (Chuồng ngựa, 160 gỗ + 40 đá) mà bộ lạc phải xây SAU khi đã có
    // trại lính và có thể cả xưởng thợ. Một bộ lạc lên tới Đồ Sắt vẫn hoàn toàn có
    // thể chưa từng thấy con ngựa nào — đúng luật "thời đại mở khoá, không tự cho".

    // KỴ SĨ (Đồ Sắt) — cận chiến, GIÁP DÀY NHẤT trong quân thường (4).
    // Giáp 4 là chỗ nó khắc chế cung thủ: 6 sát thương trừ 4 còn 2, tức cung thủ
    // cần gấp ba số phát để hạ nó so với hạ một người lính. Đây là mắt xích khép
    // vòng kéo-búa-bao: bộ binh < cung thủ (bị bắn trước) < kỵ sĩ (giáp + tốc độ)
    // < bộ binh đông (rẻ gấp đôi, cùng trại lính).
    KNIGHT:   { hp: 120, attack: 13, defense: 4, speed: 1, speedMult: 1.7,
                cost: { food: 80, gold: 50 }, trainTicks: 90 },

    // KỴ XẠ (Hoàng Kim) — bắn 5 ô rồi bỏ chạy. Đơn vị mạnh nhất của cả cây quân
    // sự và cố tình nằm ở bậc thời đại mà rất ít bộ lạc chạm tới: nó là PHẦN
    // THƯỞNG cho một ván chơi đi trọn cây công nghệ, không phải một nấc thang
    // bắt buộc. minRange 2 + tốc độ 1,65 nghĩa là nó tự lùi ra khỏi tầm với của
    // bộ binh trong khi vẫn bắn — thứ duy nhất trên bản đồ làm được điều đó.
    HORSEARCHER: { hp: 80, attack: 9, defense: 1, speed: 1, speedMult: 1.65,
                   cost: { food: 70, wood: 50, gold: 55 }, trainTicks: 100,
                   range: 5, cooldown: 18, minRange: 2 },
    // MÁY BẮN ĐÁ — mở khoá ở Đồ Sắt, huấn luyện tại Xưởng thợ.
    //
    // Vũ khí CÔNG THÀNH: sát thương lên công trình đã nhân 3 như mọi đơn vị, cộng
    // thêm sát thương lan quanh điểm rơi. Chậm, giòn khi bị áp sát, đắt — nên nó
    // là khoản đầu tư chỉ đáng khi ĐANG ĐỊNH PHÁ THÀNH, đúng nghĩa một lựa chọn
    // chiến lược chứ không phải "lính xịn hơn".
    CATAPULT: { hp: 130, attack: 20, defense: 1, speed: 1, cost: { wood: 150, gold: 80, stone: 70 }, trainTicks: 150,
                range: 9, cooldown: 46, minRange: 3, splash: 2.4 },
    // Anh hùng: mỗi bộ lạc nhiều nhất MỘT người còn sống. Đắt, dai, và là đơn vị
    // DUY NHẤT trong game có gen riêng của cá thể — xem HERO_GENE_SPEC.
    HERO:     { hp: 240, attack: 15, defense: 3, speed: 1, cost: { food: 130, gold: 60 }, trainTicks: 110 },
    ATTACK_COOLDOWN: 8,
    BUILDING_DAMAGE_MULT: 3,  // lính đập nhà nhanh hơn đánh người — nếu không thì phá 1 toà nhà mất cả nghìn tick
    // Sàn sát thương sau khi trừ giáp, tính theo % đòn gốc. Xem khối chú thích ở
    // đầu CONFIG.UNIT: không có sàn này thì giáp đủ dày = bất tử trước một loại quân.
    ARMOR_FLOOR: 0.25,
    FLEE_RANGE: 7,            // dân thường thấy lính địch trong tầm này là bỏ chạy
    FLEE_TICKS: 14,
    SOLDIER_VISION: 12
  },

  // ============================================================
  // NÂNG CẤP QUÂN SỰ — trục tiến bộ thứ ba, khác hẳn hai trục đã có
  // ============================================================
  // Trước bản này, một bộ lạc chỉ mạnh lên bằng hai cách và cả hai đều có nhược
  // điểm giống nhau:
  //   · LÊN THỜI ĐẠI — nhân chỉ số, nhưng CHỈ cho quân sinh ra sau đó. Đạo quân
  //     đang đứng ngoài trận không được một điểm nào. Nên nó thưởng cho kẻ đang
  //     xây dựng, và gần như vô nghĩa với kẻ đang đánh nhau.
  //   · MỞ KHOÁ QUÂN MỚI — thay quân cũ bằng quân mới, tức là phải TUYỂN LẠI từ
  //     đầu và trả lại toàn bộ chi phí.
  // Cả hai đều là "vứt cái cũ đi, mua cái mới". Không có cách nào để một đạo quân
  // đã có sẵn tự tốt lên.
  //
  // Nâng cấp là cách đó, và đây là điểm thiết kế quan trọng nhất của cả khối:
  // NÓ ÁP DỤNG NGAY LẬP TỨC CHO CẢ QUÂN ĐANG SỐNG. Một bộ lạc đang thua trận có
  // thể lật thế cờ mà không cần tuyển thêm một người nào — thứ chưa từng xảy ra
  // được trong game này. Nó cũng tạo ra một quyết định mới, thật sự khó: 220
  // lương + 130 vàng đổ vào "Rèn binh khí cấp 2" là 4 người lính KHÔNG được tuyển
  // ngay lúc đang cần người. Sai thời điểm thì mất thành.
  //
  // Mỗi nhánh gắn với MỘT công trình đã có (trừ chuồng ngựa là mới): đó là cách
  // cho những toà nhà cũ một công dụng thứ hai thay vì dựng thêm nhà mới cho mỗi
  // cơ chế mới. Trại lính giờ vừa ra lính vừa rèn vũ khí; đền thờ vừa sinh Đức
  // Tin vừa chép binh thư.
  //
  // Nghiên cứu MỘT nhánh MỘT LÚC, có thời gian chờ, và mất trắng nếu công trình
  // bị san phẳng giữa chừng (cùng luật với hàng đợi tuyển quân — xem tribeBrain).
  // Vì sao không cho nghiên cứu song song: nếu song song thì kẻ giàu mua sạch mọi
  // nhánh và bảng nâng cấp trở thành một hàm của tài nguyên, không phải một lựa
  // chọn. Một-lúc-một-nhánh biến nó thành câu hỏi "cái nào TRƯỚC".
  UPGRADE: {
    MAX_LEVEL: 3,
    // Nhân với số cấp đã có: cấp 1 rẻ, cấp 3 đắt gấp gần ba. Không có leo giá thì
    // cấp trần đến quá sớm và cả cơ chế hết chuyện để kể ở nửa sau kỷ nguyên.
    COST_STEP: [1, 1.85, 3.1],
    TICKS: [0, 330, 430, 540],   // thời gian nghiên cứu theo cấp SẮP đạt tới
    LINES: {
      // atk/def cộng THÊM mỗi cấp (cộng, không nhân — xem effAttack/effDefense).
      // Cộng chứ không nhân là có chủ ý: nhân thì nâng cấp có lợi nhất cho đơn vị
      // vốn đã mạnh nhất, tức là nó khuếch đại chênh lệch sẵn có. Cộng thì nó có
      // lợi TƯƠNG ĐỐI nhiều nhất cho quân rẻ — +1,6 sát thương lên người lính 7
      // đòn là +23%, lên máy bắn đá 20 đòn chỉ là +8%. Nhờ vậy "rèn binh khí" là
      // một chiến lược đi kèm ĐẠO QUÂN ĐÔNG, không phải một khoản thuế phải trả.
      melee:   { label: 'Rèn binh khí', short: 'Binh khí', icon: '⚔', build: 'barracks', age: 1,
                 atk: 1.6, def: 0, applies: ['soldier', 'knight'], scope: 'Bộ binh · Kỵ sĩ',
                 cost: { food: 130, gold: 70 } },
      armor:   { label: 'Giáp trụ',     short: 'Giáp',     icon: '🛡', build: 'barracks', age: 2,
                 atk: 0, def: 1.5, applies: ['soldier', 'archer', 'catapult', 'knight', 'horsearcher', 'hero'],
                 scope: 'Toàn quân · kể cả Anh hùng',
                 cost: { food: 150, gold: 60, stone: 55 } },
      ranged:  { label: 'Cung nỏ',      short: 'Cung nỏ',  icon: '🏹', build: 'workshop', age: 2,
                 atk: 1.4, def: 0, applies: ['archer', 'catapult', 'horsearcher'], scope: 'Cung thủ · Máy bắn đá · Kỵ xạ',
                 cost: { food: 90, wood: 140, gold: 60 } },
      cavalry: { label: 'Mã thuật',     short: 'Mã thuật', icon: '🐎', build: 'stable', age: 3,
                 atk: 2, def: 0.8, applies: ['knight', 'horsearcher'], scope: 'Kỵ sĩ · Kỵ xạ',
                 cost: { food: 170, gold: 110, wood: 70 } },
      // BINH THƯ — nhánh duy nhất chạm tới anh hùng, và cũng là nhánh duy nhất
      // cộng MÁU TỐI ĐA. Đặt ở đền thờ (Đồ Sắt) là có lý do: đền thờ vốn là công
      // trình "không phục vụ chiến tranh lẫn kinh tế", nên gen `piety` cho tới nay
      // chỉ trả về Đức Tin cho người xem. Giờ nó trả về một thứ nữa mà chính bộ
      // lạc dùng được — tức là một gen vốn phụ thuộc hoàn toàn vào hành vi người
      // xem nay có thêm một nửa giá trị TỰ THÂN.
      hero:    { label: 'Binh thư',     short: 'Binh thư', icon: '📜', build: 'temple', age: 3,
                 atk: 4, def: 1, hp: 55, applies: ['hero'], scope: 'Chỉ Anh hùng',
                 cost: { food: 160, gold: 140, stone: 70 } }
      // NGỰA CHIẾN đã bị XOÁ khỏi bảng nâng cấp — xem CONFIG.HERO.MOUNT_AGE.
      // Nó từng là nhánh thứ sáu (Chuồng ngựa, Đồ Sắt, 3 cấp). Lý do bỏ: nó là
      // nhánh DUY NHẤT mà phần thưởng chính là một hình ảnh, không phải một con
      // số — mà một phần thưởng hình ảnh thì hoặc người xem thấy nó, hoặc cả
      // nhánh không tồn tại. Thực tế nó phải qua ba cửa cùng lúc mới hiện ra
      // (Đồ Sắt + có Chuồng ngựa + bộ não chọn đúng nó trước năm nhánh kia),
      // nên phần lớn kỷ nguyên trôi qua mà không ai từng nhìn thấy con ngựa nào.
      // Giờ nó là MỘC MỐC THỜI ĐẠI: tới Đồ Sắt thì anh hùng lên ngựa, hết.
    }
  },

  // Anh hùng — TẦNG TIẾN HOÁ THỨ HAI.
  //
  // Policy bộ lạc chỉ được chọn lọc 1 lần mỗi kỷ nguyên (4.000-11.000 tick): rất
  // chậm và rất nhiễu. Dòng dõi anh hùng thì chọn lọc mỗi lần một anh hùng CHẾT,
  // nên trong đúng một kỷ nguyên đã chạy được cả chục đời. Hai vòng lồng nhau:
  // vòng nhanh (cá thể) nằm trong vòng chậm (bộ lạc).
  //
  // Điểm đáng xem nhất KHÔNG phải là "anh hùng mạnh dần lên", mà là hai vòng này
  // có thể ĐI NGƯỢC NHAU: cái tốt cho bản thân anh hùng (sống lâu) không nhất
  // thiết tốt cho bộ lạc (cần người xông lên phá kinh đô). Đổi FITNESS_MODE để
  // xem trực tiếp sự khác nhau đó — đây là multi-level selection, cùng bài toán
  // với "tế bào ung thư tối ưu cho chính nó nhưng giết cơ thể".
  HERO: {
    ENABLED: true,
    // 'personal' = chọn lọc CÁ THỂ: đời nào sống lâu nhất thì gen đó được nhân bản.
    // 'tribe'    = chọn lọc VÌ BỘ LẠC: tính chiến công (giết địch, phá nhà).
    FITNESS_MODE: 'personal',
    MUTATION: 0.16,        // sigma đột biến gen anh hùng (theo % biên độ mỗi gen)
    RESPAWN_DELAY: 260,    // sau khi anh hùng chết, bao lâu mới được chiêu mộ người kế nhiệm
    // TUỔI THỌ TỐI ĐA — chi tiết quan trọng nhất của cả cơ chế, và nó được thêm
    // vào SAU khi đo lần đầu: bản không có nó chạy hết một kỷ nguyên 5.434 tick
    // mà chỉ sinh ra ĐÚNG MỘT đời anh hùng mỗi bộ lạc. Lý do rất đúng luật: chế
    // độ chọn lọc 'personal' thưởng cho việc sống sót, một anh hùng nhát gan thì
    // không bao giờ chết, mà không ai chết thì không có thế hệ nào khép lại —
    // vòng tiến hoá tự bóp cổ chính nó. Cái chết vì tuổi già bảo đảm luôn có
    // luân chuyển thế hệ, đồng thời KHÔNG xoá mất tín hiệu: kẻ liều chết ở tick
    // 300, kẻ nhát sống trọn 1400, chênh lệch vẫn còn nguyên đó cho chọn lọc đọc.
    MAX_AGE: 1800,
    UPKEEP: 0.12,          // lương nuôi/tick — đắt gấp đôi một người lính
    SENSE_R: 11,           // bán kính "đọc tình hình" để quyết đánh hay lui
    // HỒI MÁU KHI VỀ TỚI SÂN NHÀ — chỗ này từng là nguyên nhân số một của "anh
    // hùng rút lui mãi không quay lại", và nó là lỗi SỐ HỌC chứ không phải lỗi
    // logic. 0,18 máu/tick trên một anh hùng 240 máu tối đa nghĩa là hồi từ 30%
    // lên 90% mất ~800 tick — gần một nửa tuổi thọ (MAX_AGE 1800) đứng im giữa
    // sân nhà. Nhìn ra màn hình thì đó chính xác là "bị kẹt", dù mã đang chạy
    // đúng như viết. Tệ hơn: mọi anh hùng đều hồi cùng một tốc độ tuyệt đối, nên
    // gen `vigor` cao (máu dày) bị PHẠT — càng khoẻ càng nằm viện lâu.
    // HEAL_FRAC sửa cả hai: hồi theo % máu tối đa nên mọi đời anh hùng mất cùng
    // một QUÃNG THỜI GIAN (~170 tick từ kiệt sức lên đầy), không cùng một lượng
    // máu. HEAL_RATE giữ lại làm SÀN cho những đời máu mỏng.
    HEAL_RATE: 0.18,       // sàn hồi máu/tick
    HEAL_FRAC: 0.006,      // hồi máu/tick tính theo % máu tối đa (lấy cái lớn hơn)
    HEAL_RANGE: 7,
    // Bán kính "có địch thì không băng bó nổi". Trước là 9 viết cứng trong
    // heroRetreat — rộng hơn cả tầm cảm nhận thực dụng, nên một con sói lảng vảng
    // cách 8 ô (không hề tấn công ai) đủ để khoá vĩnh viễn đường hồi phục, mà
    // nhánh rút lui thì `return` ngay nên anh hùng cũng không được phép đi giết
    // nó. Đó là một khoá chết hoàn chỉnh: không hồi được, không thoát được trạng
    // thái rút lui, không đánh. Hạ xuống 5 + cho phép đánh trả (xem heroRetreat).
    HEAL_BLOCK_R: 5,
    // ĐƯỜNG BỎ CUỘC cho chính trạng thái rút lui. Cùng một luật đã phải thêm cho
    // dân đi hái, cho lính truy đuổi và cho anh hùng đi nhặt đồ: mọi trạng thái
    // "đang trên đường làm gì đó" đều phải có hạn, vì điều kiện thoát của nó luôn
    // có thể bị chính môi trường làm cho vĩnh viễn sai. Hết hạn thì ép ra trận
    // lại, kèm một quãng KHÔNG ĐƯỢC lui tiếp để không rơi lại vào đúng vòng cũ.
    MAX_RETREAT: 800,
    RETREAT_COOLDOWN: 260,
    // NGỰA CHIẾN — giờ là mốc THỜI ĐẠI, không còn là nhánh nghiên cứu.
    // Tới Đồ Sắt là anh hùng lên ngựa: nhanh hơn, và nhìn ra màn hình là biết
    // ngay bộ lạc đó đã qua nửa cây thời đại. Cộng thẳng vào speedMult chứ không
    // nhân — nhân thì con ngựa có lợi nhất cho anh hùng vốn đã nhanh sẵn, tức là
    // nó khuếch đại gen `vigor` thấp, trong khi cả lý do con ngựa tồn tại là để
    // MỞ ĐƯỜNG THOÁT cho anh hùng lực lưỡng bị gen khoá cứng ở mức chậm chạp.
    MOUNT_AGE: 3,
    MOUNT_SPEED: 0.45,
    MAX_AURA_R: 10         // bán kính hào quang chỉ huy khi gen `command` = 1
  },

  // ============================================================
  // BÁO ĐỘNG PHÒNG THỦ — "nhà tôi đang bị đánh"
  // ============================================================
  // Trước bản này, toàn bộ khả năng phòng thủ của một bộ lạc nằm trong đúng một
  // hàm: homeIntruder() — "có quân địch nào trong bán kính 26 quanh KINH ĐÔ
  // không". Ba lỗ hổng, và cả ba đều lộ ra ở đúng cùng một cảnh:
  //
  //   1. Chỉ quanh KINH ĐÔ. Kỳ quan (size 5, thường đặt ở rìa lãnh thổ vì cần
  //      chỗ trống), chuồng ngựa, xưởng thợ, ruộng xa — mọi thứ ngoài vòng 26
  //      đều có thể bị gặm tới sập mà không một người lính nào nhận được tin.
  //   2. Hỏi "có địch gần nhà không", không hỏi "nhà có đang bị đánh không".
  //      Một cỗ máy bắn đá tầm 9 đứng ngoài vòng 26 nã vào Kỳ quan là vô hình.
  //   3. Không có thứ tự ưu tiên. Kỳ quan — thứ quyết định thắng thua của cả kỷ
  //      nguyên — được coi ngang một cái ruộng.
  //
  // Cộng thêm một lỗi thứ tư nằm ở chỗ khác hẳn (tribeBrain): chủ Kỳ quan KHÔNG
  // hề bỏ cuộc chinh phạt của mình khi Kỳ quan khánh thành. Ba bộ lạc kia lập
  // tức quay sang nó, còn nó thì vẫn đang hành quân đi đánh nơi khác — nên cảnh
  // người xem thấy là "quân đứng im nhìn Kỳ quan sập" trong khi thật ra chúng
  // đang bận đi đánh đúng theo lệnh.
  //
  // Cơ chế mới: mỗi cú đánh vào một công trình đóng dấu thời gian lên chính toà
  // nhà đó (dealDamage — cửa duy nhất mọi sát thương đi qua). Mỗi tick, mỗi bộ
  // lạc gom danh sách "nhà đang bị đánh" một lần rồi dùng chung cho cả đạo quân.
  DEFENSE: {
    MEMORY: 150,      // sau cú đánh cuối bao lâu thì hết coi là "đang bị đánh"
    ENGAGE_R: 20,     // tới trong tầm này thì lính tự tìm địch quanh toà nhà
    // BÁN KÍNH TRIỆU HỒI TỈ LỆ THUẬN VỚI GIÁ TRỊ TOÀ NHÀ, không phải một con số
    // chung. Đây là chi tiết giữ cho cả cơ chế không phản tác dụng: với một bán
    // kính chung đủ rộng để cứu được Kỳ quan, một cái RUỘNG bị con sói gặm cũng
    // kéo cả đạo quân đang vây thành quay về — và không cuộc vây nào kết thúc.
    // Cùng cái bẫy mà chú thích của preemptBuildingTarget đã cảnh báo, chỉ ở quy
    // mô cả bộ lạc. Nhân 3,5 cho ra: ruộng ~10 ô (chỉ ai đứng ngay đó), trại lính
    // ~49, đền thờ ~56, còn kinh đô và Kỳ quan thì vô hạn.
    RECALL_PER_WEIGHT: 3.5,
    RECALL_R: 70,     // trần tuyệt đối cho công trình KHÔNG trọng yếu
    // Từ CRITICAL trở lên thì bán kính triệu hồi là VÔ HẠN: mất một trong hai là
    // thua kỷ nguyên, nên không có khoảng cách nào đủ xa để đáng làm việc khác.
    CRITICAL: 40,
    WEIGHT: {
      wonder: 100, town: 45, temple: 16, barracks: 14, tower: 13,
      workshop: 11, stable: 11, infirmary: 10, shrine: 6, house: 4, farm: 3
    },
    DEFAULT_WEIGHT: 8
  },

  // Quái vật — phe THỨ NĂM, không thuộc bộ lạc nào (tribeId = -1).
  //
  // Trước bản này, nguy hiểm duy nhất trên bản đồ là bộ lạc khác, nên nửa đầu mỗi
  // kỷ nguyên hoàn toàn không có rủi ro: ai cũng yên ổn hái quả cho tới lúc quân
  // đội đủ lớn. Quái vật đặt một nguồn tử vong ĐỘC LẬP với chiến tranh lên bản đồ,
  // và vì chúng đứng yên quanh hang nên chúng biến địa lý thành chiến lược: có
  // những vạt rừng giàu gỗ mà bành trướng sang là chết, cho tới khi đủ mạnh.
  //
  // Chúng cũng là lý do tồn tại thứ hai của anh hùng: đi săn quái là cách kiếm
  // vật phẩm, mà đi săn thì phải rời nhà — tức là gen `dũng cảm` và `tham lam`
  // có thêm một môi trường nữa để bị chọn lọc, không chỉ mỗi chiến trường.
  // ------------------------------------------------------------------
  // PHASE 3.7 — vì sao phải viết lại khối này
  //
  // Đo 5 kỷ nguyên liền của bản 3.6 ra đúng hai con số giết chết cả cơ chế:
  //   · Số hang bị phá mỗi kỷ nguyên: 0, 1, 1, 6, 3 trên 9. Ba kỷ nguyên đầu gần
  //     như KHÔNG AI đi dọn hang — nghĩa là phần thưởng Thánh vật gắn vào việc
  //     phá hang gần như chưa bao giờ được trả.
  //   · Thành phần quái sinh ra mỗi kỷ nguyên: sói 26-27, gấu 13-16, quỷ đá 16-37.
  //     GIỐNG NHAU tới mức nhàm ở cả 5 kỷ nguyên, vì LADDER là một mảng cố định
  //     và mọi hang đều đọc chung một mảng đó.
  //
  // Và chẩn đoán quan trọng nhất: quái KHÔNG yếu về chỉ số (một con quỷ đá 340
  // máu dai gấp 5 người lính, cả bọn giết 50-75 lính mỗi kỷ nguyên). Chúng yếu về
  // CHIẾN LƯỢC — chúng không bao giờ lấy được cái gì của ai. Trong 5 kỷ nguyên
  // chúng phá tổng cộng 18 công trình, còn lại chỉ chém người đi ngang qua. Bỏ
  // mặc một cái hang KHÔNG TỐN GÌ CẢ, vĩnh viễn. Nên chúng không phải kẻ địch,
  // chúng là hàng rào — và hàng rào thì tất nhiên đơn điệu.
  //
  // Hai thứ sửa đúng gốc, chứ không phải cộng thêm máu:
  //   1. HANG Ổ LỚN LÊN (tier 1→3) — bỏ mặc nó giờ có giá, và cái giá tăng dần.
  //   2. HANG Ổ ĐI CƯỚP (raid) — quái tự tìm tới nhà người, không đợi người đi ngang.
  // Cộng thêm 4 loài mới, và mỗi loài mang một ĐỘNG TỪ mới chứ không phải một bảng
  // chỉ số mới: độc (sát thương kéo dài), bắn tầm xa, BAY qua rừng và hồ, và hào
  // quang chỉ huy. Thêm loài thứ tư chỉ khác nhau ở máu thì vẫn là một hàng rào.
  // ------------------------------------------------------------------
  MONSTER: {
    ENABLED: true,
    LAIRS: 9,              // số hang ổ rải trên bản đồ
    LAIR_HP: 700,
    LAIR_MIN_DIST_HOME: 34, // không đặt hang sát kinh đô — bộ lạc chết ngay từ tick 0 thì chẳng có gì để xem
    // SPAWN_INTERVAL và ROAM_RADIUS giờ chỉ còn là mặc định cho quái của SÓNG thủ
    // thành; quái sinh từ hang đọc `interval`/`roam` của CẤP hang. Trần quân số cũ
    // (CAP_PER_LAIR) đã bỏ hẳn — nó nằm lại trong CONFIG mà không ai đọc thì lần
    // sau có người chỉnh nó rồi ngồi tìm mãi không hiểu vì sao chẳng có gì đổi.
    SPAWN_INTERVAL: 260,
    ROAM_RADIUS: 22,       // đi xa hang quá ngần này thì quay về (cấp 1; cấp cao hơn nới ra)
    AGGRO: 9,              // tầm phát hiện mục tiêu
    TYPES: {
      // hp/attack/speed/cooldown + tỉ lệ rơi vật phẩm khi chết
      // size cố tình VẼ TO hơn tỉ lệ thật, đúng như quân lính đã làm: ở zoom
      // thường, một con sói vẽ đúng cỡ sẽ chỉ là một chấm xám lẫn vào cỏ, mà thứ
      // người xem cần thấy ngay là "chỗ đó có nguy hiểm", không phải tỉ lệ sinh học.
      // Tỉ lệ rơi đồ đã hạ mạnh (sói 0,16→0,05 · gấu 0,42→0,18 · quỷ đá 1,00→0,45).
      // Vật phẩm PHẢI là thứ đánh đổi được, không phải thứ nhặt dọc đường: ở mức
      // cũ, riêng quỷ đá đã rơi 100% nên nửa sau kỷ nguyên bản đồ rải đầy đồ và
      // anh hùng nào cũng đủ 3 món mà chẳng cần mạo hiểm gì — tức là gen `tham lam`
      // mất sạch đánh đổi, mà nó tồn tại chỉ để có đánh đổi đó.
      //
      // `shape` quyết định hình vẽ. Trước 3.7 CẢ BA loài dùng chung một hình thoi
      // chỉ khác màu và cỡ, nên "đơn điệu" đúng theo nghĩa đen nhất của từ đó:
      // mắt người đọc SILHOUETTE trước, đọc màu sau. Ba cỡ của cùng một hình thì
      // não vẫn xếp vào một ô "con quái", bất kể bảng chỉ số bên dưới khác nhau.
      wolf:   { hp: 62,  attack: 7,  speedMult: 1.5, cooldown: 7,  drop: 0.05, threat: 0.8,
                label: 'Sói',      color: '#a8aca6', dark: '#3a3d38', size: 1.15, shape: 'wolf' },

      // NHỆN ĐỘC — động từ mới: SÁT THƯƠNG KÉO DÀI. Bản thân nó đánh yếu hơn cả
      // một người lính, nhưng vết cắn còn trừ máu 90 tick sau khi nó đã chết. Ý
      // nghĩa cơ chế: nó là con quái đầu tiên khiến "thắng trận" khác "sống sót" —
      // một toán lính dọn xong ổ nhện vẫn có thể chết trên đường về. Và vì độc
      // không quan tâm giáp hay thời đại, nó là nguồn tử vong không bị công nghệ
      // xoá sổ, đúng chỗ mà quái cũ thất bại.
      spider: { hp: 48,  attack: 4,  speedMult: 1.75, cooldown: 9, drop: 0.06, threat: 1.0,
                venom: { dps: 0.55, ticks: 90 },
                label: 'Nhện độc', color: '#7d9c42', dark: '#1b5e20', size: 1.1,  shape: 'spider' },

      // Giáp của quái (mới ở 3.16) chỉ gắn cho ba loài DA DÀY, không rải đều: giáp
      // trừ thẳng vào từng đòn nên nó trừng phạt nặng nhất thứ đánh nhanh mà nhẹ —
      // tức là cung thủ. Cho cả bầy sói 2 giáp thì cung thủ mất hẳn lý do tồn tại
      // ở nửa đầu kỷ nguyên, mà quái nửa đầu chính là môi trường tập bắn duy nhất.
      bear:   { hp: 175, attack: 14, defense: 2, speedMult: 0.9, cooldown: 12, drop: 0.18, threat: 1.6,
                label: 'Gấu',      color: '#a1887f', dark: '#3e2723', size: 1.5,  shape: 'bear' },

      // BÓNG MA — động từ mới: ĐÁNH TẦM XA. Dùng lại nguyên đường ống của cung thủ
      // (`range`/`minRange` + rangedStrike), nên nó gần như miễn phí về code nhưng
      // đổi hẳn cách một trận đánh quái diễn ra: lần đầu tiên đám quái có ĐỘI HÌNH
      // — thứ đứng sau bắn ra và thứ đứng trước chịu đòn. Cùng lý do đã viết ở
      // CONFIG.UNIT.ARCHER: tầm bắn là thứ tạo ra lý do để hai đơn vị muốn đứng ở
      // hai chỗ khác nhau.
      wisp:   { hp: 78,  attack: 10, speedMult: 1.1, cooldown: 20, drop: 0.14, threat: 1.3,
                range: 5, minRange: 2,
                label: 'Bóng ma',  color: '#63b4ad', dark: '#006064', size: 1.25, shape: 'wisp' },

      troll:  { hp: 360, attack: 22, defense: 5, speedMult: 0.7, cooldown: 16, drop: 0.45, threat: 3,
                label: 'Quỷ đá',   color: '#9575cd', dark: '#311b92', size: 1.95, shape: 'troll' },

      // PHI LONG — động từ mới: BAY. Bỏ qua `isBlocked`, tức là bay thẳng qua
      // RỪNG. Hồi còn nước thì nó còn bay qua hồ nữa, và đó mới là chỗ đắt nhất:
      // "bên kia hồ" luôn đồng nghĩa với "an toàn", nên phi long là thứ duy nhất
      // huỷ được hợp đồng ấy. Bỏ nước lấy đi phân nửa sức nặng của con này —
      // rừng vẫn chặn nhưng rừng thì chặt được. Bay vẫn khiến đường đi tham lam
      // là ĐÚNG tối ưu cho nó (không vật cản thì đường thẳng là ngắn nhất) —
      // không cần flow field.
      wyvern: { hp: 225, attack: 18, speedMult: 1.8, cooldown: 11, drop: 0.30, threat: 2.4,
                fly: true,
                label: 'Phi long', color: '#d9702a', dark: '#3a2418', size: 1.8,  shape: 'wyvern' },

      // CHÚA HANG — trùm, mỗi hang cấp 3 nuôi nhiều nhất MỘT con. Động từ mới:
      // HÀO QUANG. Nó dùng lại đúng cơ chế hào quang chỉ huy của anh hùng
      // (`auraUntil`/`auraMult`, effAttack đã đọc sẵn) nên tổng chi phí là một
      // vòng quét bucket mỗi 4 tick. Vì sao đáng có một con trùm: trước 3.7 không
      // có bất kỳ mục tiêu quái nào ĐÁNG một chiến dịch — giết con nào cũng như
      // con nào, chỉ khác số máu. Một con 1500 máu biết buff cả ổ là thứ duy nhất
      // trên bản đồ bắt cả một đạo quân phải đi cùng nhau, và nó rơi Thánh vật
      // 100% để chuyến đi đó có giá trả.
      lord:   { hp: 1500, attack: 34, defense: 7, speedMult: 0.75, cooldown: 20, drop: 1.0, threat: 6,
                splash: 2.0, aura: { r: 8, mult: 1.35 }, boss: true,
                label: 'Chúa Hang', color: '#b8362a', dark: '#1c0805', size: 2.7, shape: 'lord' }
    },

    // CẤP ĐỘ HANG Ổ — trục leo thang thứ hai, và là trục quan trọng hơn.
    //
    // Bản cũ leo thang theo `spawnedTotal` của riêng từng hang: con thứ 6 trở đi
    // luôn là quỷ đá, mãi mãi. Nên sau ~1500 tick MỌI hang trên bản đồ hội tụ về
    // đúng một trạng thái (4 con quỷ đá đứng im) và không bao giờ rời khỏi đó nữa
    // — đó là nguồn gốc thật sự của cảm giác đơn điệu, chứ không phải số lượng loài.
    //
    // Giờ mỗi cấp có LADDER RIÊNG và ladder được đọc theo vòng tròn (`% length`)
    // chứ không kẹp ở phần tử cuối, nên thành phần một cái ổ luôn là hỗn hợp chứ
    // không phải một loài. Nếu bỏ `% length` mà quay lại kẹp cuối mảng, mọi hang
    // lại hội tụ về một loài duy nhất y như cũ.
    TIERS: [
      // Vì sao BÓNG MA nằm ngay trong ladder cấp 1, và PHI LONG ngay ở cấp 2, thay
      // vì để dành cả hai cho cấp cao nhất: đo 6 kỷ nguyên của bản đầu 3.7 thì độ
      // dài trung vị chỉ ~5.250 tick, mà ở nhịp nuôi lúc đó phần lớn hang chưa kịp
      // lên cấp 2 trước khi kỷ nguyên kết thúc — tức là 4 trên 6 kỷ nguyên KHÔNG
      // MỘT AI nhìn thấy con quái biết bắn hay con quái biết bay. Nội dung chỉ
      // xuất hiện ở đuôi phân phối thì với người xem là nội dung không tồn tại.
      // Nguyên tắc rút ra: mỗi ĐỘNG TỪ mới phải có mặt sớm ít nhất một lần; thứ
      // để dành cho leo thang là ĐỘ ĐẬM ĐẶC của nó, không phải sự tồn tại của nó.
      { name: 'Hang ổ',    cap: 4, roam: 22, hpBonus: 0,    interval: 260, statMult: 1.00, raidEvery: 0,
        ladder: ['wolf', 'spider', 'wolf', 'bear', 'spider', 'wisp', 'bear'] },
      { name: 'Sào huyệt', cap: 6, roam: 28, hpBonus: 700,  interval: 210, statMult: 1.15, raidEvery: 2200,
        ladder: ['bear', 'wisp', 'wolf', 'wyvern', 'troll', 'spider', 'bear'] },
      { name: 'Tổ Quỷ',    cap: 7, roam: 34, hpBonus: 1600, interval: 165, statMult: 1.35, raidEvery: 1500,
        ladder: ['troll', 'wyvern', 'wisp', 'troll', 'wyvern', 'bear', 'troll'] }
    ],

    // NUÔI HANG — hang lớn lên bằng cái nó ăn được, cộng một dòng chảy chậm theo
    // thời gian. Vì sao KHÔNG dùng đồng hồ thuần, và cũng KHÔNG dùng "mạnh theo
    // sức mạnh bộ lạc" (rubber band):
    //   · Đồng hồ thuần thì cả 9 hang leo cấp cùng lúc — lại đồng nhất, chỉ là
    //     đồng nhất ở mức khó hơn.
    //   · Rubber band thì việc bộ lạc mạnh lên bị trừng phạt, và người xem đọc ra
    //     ngay là "game tự gồng", mất hết ý nghĩa của mọi quyết định trước đó.
    // Nuôi bằng chiến lợi phẩm thì cái hang nằm cạnh chiến trường lớn nhanh, cái
    // hang trong xó rừng thì gần như đứng yên — tức là ĐỊA LÝ tự viết ra câu
    // chuyện, đúng thứ dự án này đang tìm. Nó cũng là một vòng phản hồi DƯƠNG (mất
    // lính → hang mạnh → mất thêm lính), cùng họ với vòng thú-mồi ở Phase 1.2, nên
    // nó phải có TRẦN: tối đa cấp 3, không hơn.
    FEED: {
      // ĐIỂM NUÔI RÒ RỈ — chi tiết quan trọng nhất của cả Phase 3.7, và nó được
      // thêm vào SAU khi đo lần thứ ba.
      //
      // Bản không có nó dùng điểm nuôi như một CÁI CHỐT: chỉ tăng, không bao giờ
      // giảm. Đo 10 kỷ nguyên: cột `tiers` ra "222223333", "233333", "333333",
      // "23333333", "333333" — nghĩa là gần như MỌI hang trên MỌI bản đồ đều leo
      // tới trần rồi nằm đó. Tức là tôi vừa dựng lại y nguyên cái lỗi mình đặt ra
      // để sửa: bản 3.6 mọi hang hội tụ về "4 con quỷ đá đứng im", bản 3.7 mọi
      // hang hội tụ về "Tổ Quỷ". Sự HỘI TỤ mới là bệnh, không phải cái mức mà nó
      // hội tụ tới. Hệ quả đo được: kỷ nguyên kéo dài tới 18.440 và 19.097 tick
      // (bản 3.6: 3,4k-14,2k) vì bốn bộ lạc bị đè đều nhau nên không ai thắng nổi ai.
      //
      // Rò rỉ biến cái chốt thành một CÂN BẰNG ĐỘNG: điểm nuôi tự tụt theo tỉ lệ,
      // nên mỗi hang dừng lại ở mức mà nguồn ăn của nó nuôi nổi. Hang ở tiền tuyến
      // ăn đều thì trụ ở cấp cao; hang đã dọn sạch vùng quanh mình thì TỤT CẤP.
      // Đây đúng là dạng cân bằng nguồn-vào/hao-hụt đã gặp ở Phase 0 với trao đổi
      // chất và mức dân số cân bằng — và nó cho một thứ mà cái chốt không bao giờ
      // cho được: đánh lui được quái là một chiến thắng NHÌN THẤY ĐƯỢC, vòng tím
      // trên bản đồ co lại.
      // Chọn DECAY bằng cách giải ngược từ điểm cân bằng chứ không mò: điểm nuôi
      // hội tụ về `nhịp ăn / DECAY`. Dòng chảy thụ động là 1/220 = 0,00455/tick,
      // nên với DECAY = 0,00022 một cái hang KHÔNG ăn được gì sẽ đứng yên ở
      // 0,00455/0,00022 ≈ 20,7 điểm — nằm ngay DƯỚI ngưỡng lên cấp 2 (24). Đó là
      // cả chủ đích: thời gian một mình KHÔNG BAO GIỜ đủ để một cái hang lớn lên,
      // phải có người đi ngang qua và chết ở đó.
      // Lần chỉnh trước để DECAY = 0,0004 (cân bằng thụ động 11,4) thì rò rỉ mạnh
      // tới mức đo 12 kỷ nguyên ra 0 con Chúa Hang nào — lại đúng cái lỗi "cơ chế
      // không bao giờ chạy". Một cơ chế chỉ tồn tại nếu nó thật sự xảy ra.
      DECAY: 0.00022,       // mỗi tick: feed *= (1 - DECAY). Nửa đời ~3.150 tick.
      DEMOTE_MARGIN: 10,    // trễ (hysteresis) để hang không rung lên xuống ở ngưỡng
      PASSIVE_EVERY: 220,   // +1 điểm nuôi mỗi ngần này tick kể cả không ai đụng tới
      // TRẦN của dòng chảy thụ động — và đây là chỗ tôi tự làm sai phép tính của
      // chính mình, bắt được bằng cách đếm xem MỖI cơ chế mới có thật sự chạy không.
      //
      // Bản đầu để dòng thụ động chảy vô hạn, nên điểm nuôi hội tụ về
      // `nhịp thụ động / DECAY` = 0,00455/0,00022 ≈ 20,7. Mà ngưỡng TỤT cấp 2 là
      // 24 - 10 = 14. Điểm nuôi rơi từ trên xuống thì dừng lại ở 20,7 — VĨNH VIỄN
      // không bao giờ chạm nổi 14. Tức là hàm demoteLair() đúng từng dòng nhưng
      // toán học bảo đảm nó không bao giờ được gọi: đo thật 7 kỷ nguyên ra 0 lần
      // tụt cấp, trong khi 11 cơ chế mới còn lại đều chạy hàng chục tới hàng trăm lần.
      //
      // Chặn dòng thụ động ở 12 (dưới mọi ngưỡng tụt) thì ý nghĩa cũng gọn hơn hẳn:
      // thời gian nuôi cái hang tới một MỨC NỀN, còn từ mức nền trở lên thì phải ăn
      // được người thật mới giữ nổi. Đánh lui quái là một chiến thắng có thật.
      PASSIVE_CAP: 12,
      // BỎ ĐÓI — vòng sửa thứ hai của cùng một lỗi. Chặn dòng thụ động ở 12 đã làm
      // cho tụt cấp KHẢ THI về mặt toán, nhưng đo lại vẫn ra 0 lần trên 9 kỷ nguyên:
      // rơi từ 24 xuống ngưỡng 14 bằng rò rỉ đều mất ~2.450 tick, mà một cái hang
      // hiếm khi được yên lâu tới thế trước khi kỷ nguyên kết thúc hoặc chính nó bị
      // phá. "Khả thi" không phải là "có xảy ra" — bài học này lặp lại đủ nhiều lần
      // trong dự án để đáng ghi thành một dòng riêng.
      // Nên: hang không ăn được gì trong 900 tick thì rò rỉ nhanh gấp 4 (24 → 14
      // còn ~612 tick). Điều này cũng đúng hơn về mặt ý nghĩa — một cái ổ suy yếu
      // vì HẾT MỒI, không phải vì đồng hồ chạy.
      STARVE_AFTER: 900,
      STARVE_MULT: 4,
      // Đo trên bản 3.6: một kỷ nguyên 11.3k tick cho ~43 điểm trôi tự nhiên, tức
      // đủ lên cấp 2 vào khoảng tick 7.800 nhưng KHÔNG bao giờ tự lên cấp 3. Cấp 3
      // bắt buộc phải ăn được người thật. Hạ PASSIVE_EVERY xuống là xoá mất chính
      // sự khác biệt giữa hang ở tiền tuyến và hang trong xó.
      // Công trình hạ 4 → 3 → 1. Đây là số hạng duy nhất CHẠY LOẠN được: một
      // chuyến cướp san phẳng cả xóm là 20 công trình trong vài trăm tick. Đo thật:
      // một kỷ nguyên có 447 công trình bị phá — ở mức 3 điểm/cái thì riêng nó đã
      // là 1.341 điểm chia cho 6 hang, gấp 2,3 lần ngưỡng cấp trần. Giết LÍNH thì
      // không chạy loạn được, vì lính phải được tuyển ra mới có mà giết, và tuyển
      // lính lại tốn đúng thứ mà quái vừa cướp.
      KILL: { villager: 1, soldier: 2, archer: 2, knight: 3, horsearcher: 3, catapult: 3, hero: 8, building: 1 },
      // 24 nằm ngay trên cân bằng thụ động 20,7 (một cái hang bị bỏ quên không bao
      // giờ tự lên cấp), 70 đòi nhịp ăn ~1 mạng lính mỗi 180 tick — mức chỉ một
      // cái hang nằm đúng tiền tuyến mới giữ nổi.
      TIER_AT: [0, 24, 70]
    },

    // ĐI CƯỚP — thứ biến hang ổ từ hàng rào thành kẻ địch.
    //
    // Quái đi cướp KHÔNG cần BFS mới: chúng bước xuống `tribe.homeField`, cái
    // trường BFS mà chính bộ lạc đó đã tính sẵn để dân biết đường về kho. Trường
    // đó gieo mầm từ mọi công trình của họ, nên "đường về nhà của dân" và "đường
    // tới nhà nó" là ĐÚNG MỘT bản đồ đọc theo hai chiều. Nếu tự tính trường riêng
    // cho mỗi hang thì tốn 9 lần BFS 340x220 và 2,7 MB, đổi lại đúng con số đã có.
    // SENSE khi đi cướp hẹp hơn hẳn AGGRO thường (5 so với 9). Đây là con số quan
    // trọng nhất của cả cơ chế cướp, tìm ra bằng đo: ở bản đầu raider dùng chung
    // tầm phát hiện với quái giữ hang, nên một chuyến đi cướp thành một cuộc càn
    // quét — đo thật 279 dân bị giết trong MỘT kỷ nguyên (bản 3.6: 5-18), kinh tế
    // không kịp lớn và KHÔNG kỷ nguyên nào lên nổi thời đại 4, tức là Kỳ quan bị
    // khoá lại y hệt cách hệ tín ngưỡng từng làm ở Phase 3.6. Tầm hẹp biến đoàn
    // cướp thành một MŨI TIẾN CÔNG đi thẳng tới nhà — vừa đỡ tàn sát vừa đúng
    // hình ảnh hơn: chúng có mục tiêu, không phải đi săn dạo.
    RAID: { MIN_TIER: 2, SIZE: [0, 3, 5], DURATION: 1700, SENSE: 5 },

    // SÁT THƯƠNG LÊN CÔNG TRÌNH của quái — hệ số RIÊNG, không dùng chung
    // CONFIG.UNIT.BUILDING_DAMAGE_MULT = 3 của quân lính.
    //
    // Đây là lỗi thứ ba cùng một họ trong dự án này, và lần này tôi bắt được nó
    // bằng đúng con số đã dạy ở Phase 3.6: "cơ chế mới lặng lẽ khoá cơ chế cũ".
    // Đo 8 kỷ nguyên với hệ số dùng chung: công trình bị quái phá tăng từ ~4 lên
    // ~70 mỗi kỷ nguyên, và thời đại cao nhất đạt được rơi từ 2 lần chạm 4 trên 5
    // kỷ nguyên xuống 0 trên 8. Cơ chế bị khoá lần này là KỲ QUAN — thứ vừa mở ra
    // ở 3.6 và cũng vừa bị tín ngưỡng khoá mất ở 3.6. Lý do rất thẳng: gạch xây
    // lại nhà lấy từ đúng kho gỗ/đá/vàng gác cửa lên thời đại.
    //
    // Hệ số 3 của lính là để CÔNG THÀNH — quân có mục đích san phẳng một nền văn
    // minh. Quái là thú: chúng cắn người và phá vài mái nhà, chúng không hạ được
    // thành phố. 1,2 giữ nguyên tính răn đe của một chuyến cướp mà không biến mỗi
    // chuyến thành một cuộc diệt chủng kinh tế.
    BUILD_DMG: 1.2,
    LORD_RESPAWN: 900      // Chúa Hang chết rồi, bao lâu hang mới gọi được con khác
  },

  // Chế độ THỦ THÀNH — luật chơi thứ hai, dùng chung toàn bộ mô phỏng.
  //
  // Vì sao đáng làm, ngoài chuyện "thêm một mode": policy bộ lạc là một bộ gen
  // chiến lược được chọn lọc qua các kỷ nguyên. Ở chế độ chinh phạt, thứ được
  // thưởng là ĐÁNH THẮNG BỘ LẠC KHÁC. Ở chế độ thủ thành, bộ lạc không đánh nhau
  // nữa — thứ được thưởng là SỐNG LÂU trước sóng quái. Cùng một bộ gen, hai môi
  // trường chọn lọc hoàn toàn khác nhau, nên có thể so trực tiếp: gen `hiếu chiến`
  // hay `số tháp muốn có` được đẩy lên ở chế độ nào. Đây là cách rẻ nhất để thấy
  // "tiến hoá không có đích cố định, nó chỉ leo cái đồi mà môi trường dựng ra".
  DEFEND: {
    // Đợt đầu lùi từ 800 lên 1100 và bớt 1 con: từ khi cả đợt tụm thành một đàn
    // thay vì rải khắp bản đồ, sát thương dồn vào một chỗ nên nặng hơn hẳn — đo
    // thật là có bộ lạc bị xoá sổ ngay ở đợt 1. Cần đủ thời gian dựng tháp trước.
    FIRST_WAVE_AT: 1100,
    WAVE_INTERVAL: 820,
    BASE_COUNT: 3,
    COUNT_GROWTH: 1.7,      // số quái mỗi đợt = BASE + floor(đợt × GROWTH)
    HP_GROWTH: 0.11,        // mỗi đợt quái dày thêm 11% máu (cộng dồn tuyến tính)
    ATK_GROWTH: 0.08,
    MAX_ALIVE: 260,         // trần an toàn: không để sóng dồn vô hạn làm treo trình duyệt
    FIELD_REFRESH: 320,     // nhịp tính lại trường dẫn đường tiến công
    EDGE_MARGIN: 5
  },

  // Vật phẩm — CHỈ anh hùng nhặt được, tối đa 3 món.
  //
  // Điểm thiết kế quan trọng: vật phẩm KHÔNG DI TRUYỀN. Gen thì truyền cho đời
  // sau, còn đồ đạc thì mất theo người chết. Nhờ vậy trong cùng một trò chơi có
  // hai kiểu "mạnh lên" hoàn toàn khác nhau đứng cạnh nhau để so sánh: một kiểu
  // tích luỹ qua các ĐỜI (tiến hoá), một kiểu tích luỹ trong MỘT đời rồi mất sạch
  // (kinh nghiệm cá nhân). Đó chính là ranh giới giữa di truyền và tập nhiễm.
  ITEM: {
    // 3 -> 6 ngăn (Phase 3.17). Đây không phải chỉ là "cho nhiều đồ hơn": ở 3 ngăn,
    // hòm đồ đầy sau đúng ba món và mọi anh hùng sống đủ lâu đều hội tụ về cùng
    // một bộ đồ tối ưu — tức là chọn lọc trên gen `tham lam` tắt ngóm ở nửa sau
    // mỗi đời. 6 ngăn giữ cho việc "có đáng rời đội hình đi nhặt không" còn là
    // một câu hỏi cho tới tận lúc chết già.
    MAX_HELD: 6,
    LIFETIME: 2600,        // rơi ra mà không ai nhặt thì tan biến
    // `blurb` không phải trang trí: nó là chỗ nói ra CÁCH DÙNG mà con số không nói
    // được — cờ lệnh buff cả đám quân đứng quanh chứ không buff người cầm, giày
    // không làm mạnh thêm một điểm nào nhưng lại là thứ quyết định có kịp chạy khỏi
    // trận thua hay không. Người xem đọc "+0,35 tốc độ" thì không suy ra được điều đó.
    TYPES: {
      sword:  { label: 'Đại đao',    icon: '🗡', color: '#e2ddd0', attack: 6,
                blurb: 'Lưỡi thép dài. Món thuần tấn công — hợp với anh hùng đã dày máu sẵn.' },
      armor:  { label: 'Giáp sắt',   icon: '🛡', color: '#8d9490', maxHp: 90,
                blurb: 'Nhặt lên là hồi ngay đúng phần máu vừa thêm — kể cả khi đang thoi thóp.' },
      boots:  { label: 'Giày gió',   icon: '👢', color: '#9cc49e', speedMult: 0.35,
                blurb: 'Không thêm một điểm sát thương nào, nhưng quyết định có kịp rút khỏi trận thua hay không.' },
      banner: { label: 'Cờ lệnh',    icon: '🚩', color: '#e0a58c', auraR: 3, auraMult: 0.18,
                blurb: 'Buff QUÂN ĐỨNG QUANH chứ không buff người cầm. Vô dụng nếu anh hùng đánh lẻ.' },
      relic:  { label: 'Thánh vật',  icon: '💎', color: '#d8a544', attack: 3, maxHp: 60, auraMult: 0.1,
                blurb: 'Di sản của cả nền văn minh: ngã trên đất nhà thì được rước về đền và trao lại cho người kế nhiệm.' }
    },
    // ============================================================
    // HỢP NHẤT ĐỒ TRÙNG
    // ============================================================
    // Vấn đề gốc là một cái NGÕ CỤT im lặng: bản trước, hai Đại đao trong hòm chỉ
    // là hai lần cộng cùng một con số, và tới 6/6 thì tryPickUpItems `return` ngay
    // — mọi thứ rơi ra sau đó đều vô nghĩa với một anh hùng đã sống lâu. Mà "sống
    // lâu" chính là thứ chế độ chọn lọc 'personal' đang thưởng, nên đúng những cá
    // thể thành công nhất lại là những cá thể sớm hết chuyện để làm nhất.
    //
    // KÍCH HOẠT KHI NHẶT TRÚNG ĐỒ TRÙNG, không phải khi hòm đầy — và đây là chỗ
    // bản này lệch khỏi yêu cầu ban đầu, có lý do đo được. Đo 13.170 tick, 4 kỷ
    // nguyên, phân bố số món trong hòm anh hùng:
    //     0 món 42,2% · 1 món 29,1% · 2 món 11,7% · 3 món 14,9% · 4 món 2,1%
    //     5 món 0% · 6 món 0%
    // Hòm KHÔNG BAO GIỜ đầy. Một cơ chế chỉ chạy lúc 6/6 thì là mã chết: nó đúng,
    // nó chạy được, và không ai từng nhìn thấy nó. Nhặt-trúng-đồ-trùng thì xảy ra
    // thường xuyên (xem MONSTER_DROPS — nhiều loài rơi lặp cùng một khoá).
    //
    // Nhánh "hòm đầy thì nung lấy chỗ" VẪN GIỮ làm van an toàn: một anh hùng thừa
    // kế trọn 6 thánh vật lệch cấp từ đền vẫn có thể rơi vào 6/6.
    MAX_LEVEL: 3,
    // Cấp 2 = 2,3 (giữ rời hai món cấp 1 chỉ được 2,0) · cấp 3 = 5,2 (giữ rời bốn
    // món cấp 1 được 4,0). Đường cong PHẢI vượt phép cộng, nếu không thì hợp nhất
    // là một khoản lỗ và cơ chế mới lại thành một cái bẫy: bản nháp đầu để cấp 3 =
    // 3,6, tức là nung bốn món thành một món YẾU HƠN giữ nguyên bốn món — một
    // "phần thưởng" trừ điểm người chơi vì đã đi săn nhiều hơn.
    LEVEL_MULT: [0, 1, 2.3, 5.2],
    LEVEL_TAG: ['', '', 'II', 'III']
  },

  BUILD: {
    // size = cạnh ô của công trình (chỉ để vẽ + tính khoảng cách tương tác).
    // CỐ TÌNH không chặn đường đi: nếu chặn thì với pathfinding tham lam (greedy,
    // không A*) dân sẽ kẹt cứng quanh cụm nhà. Đổi lại quân đi xuyên qua nhà —
    // chấp nhận được về mặt hình ảnh, tiết kiệm rất nhiều độ phức tạp.
    town:     { hp: 1300, size: 3, cost: { wood: 250 }, buildTicks: 260, pop: 8,  label: 'Nhà chính', range: 7, attack: 9, cooldown: 18 },
    house:    { hp: 200, size: 2, cost: { wood: 35  }, buildTicks: 70,  pop: 5,  label: 'Nhà ở' },
    farm:     { hp: 150, size: 2, cost: { wood: 65  }, buildTicks: 90,  pop: 0,  label: 'Ruộng' },
    barracks: { hp: 500, size: 3, cost: { wood: 140 }, buildTicks: 150, pop: 0,  label: 'Trại lính' },
    tower:    { hp: 420, size: 2, cost: { wood: 90, gold: 30 }, buildTicks: 130, pop: 0, label: 'Tháp canh', range: 8, attack: 11, cooldown: 14 },
    // Xưởng thợ (Đồ Đồng) — nơi ra cung thủ và máy bắn đá. Một bộ lạc không xây nó
    // thì vĩnh viễn chỉ có bộ binh, kể cả khi đã lên Đồ Sắt: thời đại MỞ KHOÁ chứ
    // không TỰ CHO, và khoảng cách giữa hai thứ đó chính là chỗ cho chiến lược.
    workshop: { hp: 460, size: 3, cost: { wood: 175, stone: 55 }, buildTicks: 170, pop: 0, label: 'Xưởng thợ' },
    // CHUỒNG NGỰA (Đồ Sắt) — cửa duy nhất dẫn tới kỵ binh, và cũng là nơi nghiên
    // cứu nhánh "Mã thuật". Đặt ở Đồ Sắt cùng bậc với máy bắn đá là có chủ ý: hai
    // hướng đầu tư song song, cùng giá tiền, ngược hẳn nhau về công dụng — máy bắn
    // đá phá thành nhưng không đánh nổi dã chiến, kỵ binh thắng dã chiến nhưng đập
    // tường rất chậm. Bộ lạc chỉ đủ sức xây một cái, và chọn cái nào là một quyết
    // định thật sự đọc được từ ngoài màn hình.
    stable:   { hp: 480, size: 3, cost: { wood: 160, stone: 40, gold: 30 }, buildTicks: 165, pop: 0, label: 'Chuồng ngựa' },
    // NHÀ Y TẾ (Đồ Đồng) — công trình đầu tiên trả lại thứ đã mất.
    //
    // Cho tới bản này, máu là tài nguyên DUY NHẤT trong game chỉ đi một chiều: quân
    // bị thương thì mang vết thương đó tới lúc chết, và cách duy nhất để "hồi phục"
    // một đạo quân là tuyển người mới thay người cũ. Hệ quả là mọi trận đánh đều
    // có giá bằng nhau — thắng sát nút cũng tốn kém gần bằng thua, vì đám sống sót
    // 15% máu chỉ còn là những cái xác biết đi chờ trận sau.
    //
    // Nhà y tế biến "rút lui" thành một nước đi CÓ LỜI thay vì một sự thất bại
    // chậm. Và vì lính tự tìm về đây khi kiệt sức (xem CONFIG.MEDIC), nó tạo ra
    // một hình ảnh chưa từng có trên bản đồ: dòng thương binh lê về hậu phương
    // trong khi tiền tuyến vẫn đang đánh. Đó là thứ đọc ra được cục diện mà không
    // cần một con số nào.
    infirmary:{ hp: 380, size: 2, cost: { wood: 120, gold: 40 }, buildTicks: 130, pop: 2, label: 'Nhà y tế' },
    // NHÀ CẦU NGUYỆN (Đồ Đá) — rẻ, nhỏ, có ngay từ tick đầu.
    //
    // Ban đầu tôi chỉ làm Đền thờ và khoá nó ở Đồ Sắt. Đo ra: BA TRÊN BỐN bộ lạc
    // đi hết cả kỷ nguyên mà không dâng một lễ nào, vì không ai sống đủ lâu để tới
    // Đồ Sắt. Cả vòng lặp tín ngưỡng — thứ được thêm vào để nối nền văn minh với
    // người xem — chỉ tồn tại ở đoạn kết của những kỷ nguyên may mắn nhất.
    //
    // Tách làm hai bậc chữa đúng chỗ đó: nhà cầu nguyện là tín ngưỡng dân gian,
    // có từ đầu và ai cũng với tới; đền thờ là quốc giáo, đắt, và tính bằng HAI
    // nhà cầu nguyện khi tính nhịp dâng tế.
    shrine:   { hp: 180, size: 2, cost: { wood: 75 }, buildTicks: 95, pop: 2, label: 'Nhà cầu nguyện' },
    // Đền thờ (Đồ Sắt) — công trình đầu tiên KHÔNG phục vụ chiến tranh lẫn kinh tế:
    // nó sinh Đức Tin cho người xem (Chúa Tể) và tăng nhẹ tốc hồi máu quanh nó.
    // Đây cũng là công trình đầu tiên nối bộ lạc với NGƯỜI CHƠI: xây đền = cho
    // người xem thêm quyền năng, nên bộ lạc sùng đạo nhất gián tiếp được bảo hộ.
    temple:   { hp: 520, size: 3, cost: { wood: 150, stone: 110, gold: 70 }, buildTicks: 190, pop: 4, label: 'Đền thờ' },
    // KỲ QUAN (Hoàng Kim) — đường thắng thứ hai của cả trò chơi.
    //
    // Xây xong rồi GIỮ được nó đứng WONDER.HOLD_TICKS tick là thắng kỷ nguyên ngay,
    // bất kể quân đội ai mạnh hơn. Vì sao đáng làm: luật thắng cũ chỉ có "diệt hết"
    // hoặc "dẫn điểm khi hết giờ", nên nửa sau mỗi kỷ nguyên thường là một thế bí
    // kéo dài — đo thật ở Phase 3.4 là 2/4 kỷ nguyên chạm trần 30.000 tick. Kỳ quan
    // đặt một CÁI ĐỒNG HỒ lên bàn cờ: kẻ dẫn đầu buộc phải phơi mình ra, ba bên
    // còn lại buộc phải bỏ mọi mâu thuẫn để lao vào phá. Thế bí tự tan.
    wonder:   { hp: 2600, size: 5, cost: { wood: 430, stone: 470, gold: 270 }, buildTicks: 820, pop: 0, label: 'Kỳ quan' },
    BUILD_RATE: 1,       // tiến độ/tick cho mỗi dân thường đang xây
    MAX_BUILDERS: 3,
    WONDER_BUILDERS: 8   // Kỳ quan được huy động nhiều thợ hơn hẳn — nếu không, 820 tick chia cho 3 thợ là quá dài để kịp xảy ra bất cứ chuyện gì
  },

  // Hệ số chiều cao khi VẼ, không đụng gì tới luật chơi. 1 = đúng như bản phẳng cũ.
  // Nhà cao lên thì che khuất quân nhiều hơn, nên đây là đánh đổi giữa chiều sâu và
  // khả năng theo dõi trận đánh — bù lại bằng silhouette xuyên tường trong renderWorld.
  // Ruộng để 1 vì nó vẽ như mảnh đất cày, không có thân nhà (xem buildingSpriteHeight).
  BUILD_HEIGHT: { town: 1.5, house: 1.35, farm: 1, barracks: 1.4, tower: 1.85,
                  workshop: 1.3, stable: 1.15, infirmary: 1.25, shrine: 1.6, temple: 1.9, wonder: 2.5 },

  // NHÀ Y TẾ — luật hồi phục.
  //
  // Hai con số quan trọng nhất là SEEK_HP và LEAVE_HP, và khoảng cách giữa chúng
  // (0,45 -> 0,9) chính là cơ chế: nếu để chúng gần nhau, một người lính vừa đủ
  // máu để rời trạm xá lại tụt xuống ngưỡng và quay đầu lại ngay — đúng cái vòng
  // rung tại chỗ đã cắn ở lỗi "hang ổ lên/xuống cấp mỗi vài chục tick". Trễ rộng
  // bảo đảm một chuyến về hậu phương là MỘT chuyến, đi và về dứt khoát.
  //
  // RATE 0,4 máu/tick nghĩa là một người lính 65 máu mất ~110 tick để hồi từ kiệt
  // sức lên đầy. Cố tình chậm: nhanh hơn thì rút lui trở thành nước đi luôn đúng,
  // và trận đánh không bao giờ kết thúc. Ở nhịp này, chữa một đạo quân là một
  // quyết định phải TRẢ BẰNG THỜI GIAN — quãng mà đối phương đang tự do làm gì đó.
  MEDIC: {
    RANGE: 6,        // bán kính chữa quanh nhà y tế
    RATE: 0.4,       // máu/tick hồi cho quân đứng trong bán kính
    SEEK_HP: 0.45,   // dưới ngần này thì lính tự bỏ trận về trạm xá
    LEAVE_HP: 0.9,   // hồi tới ngần này thì quay lại chiến trường
    // Chỉ chữa khi quanh đó SẠCH ĐỊCH. Không có điều kiện này thì nhà y tế biến
    // thành một cỗ máy hồi máu giữa trận: kéo địch vào sân nhà rồi đứng đó gặm
    // nhau vô hạn, bên nào có trạm xá thì bên đó thắng mọi trận cầm cự — một luật
    // thắng không ai nhìn ra và cũng không ai phá được.
    SAFE_R: 8
  },

  // Kỳ quan
  WONDER: {
    HOLD_TICKS: 2600,     // giữ được ngần này tick sau khi xây XONG là thắng
    HEAL: 0.5             // tự hồi máu/tick — không có thì một máy bắn đá lẻ cũng gặm chết nó lúc không ai để ý
  },

  // Ruộng = 5 ô "thức ăn" quanh công trình, tái tạo nhanh hơn bụi quả nhiều lần.
  // Chuyển gỗ -> dòng lương thực ỔN ĐỊNH nhưng CÓ TRẦN (0.5 food/tick/ruộng nếu
  // thu hoạch liên tục). Bụi quả thì ngược lại: kho to nhưng hữu hạn + ở xa.
  FARM: { CELLS: 6, AMOUNT: 80, REGROW: 0.18 },

  // THỜI ĐẠI — trước bản này nó chỉ là một hệ số nhân vô hình lên máu/đòn/thu hoạch.
  // Nghĩa là "lên thời đại" không đổi thứ gì người xem NHÌN THẤY, và không đổi thứ
  // gì bộ não bộ lạc phải QUYẾT ĐỊNH: cứ đủ tiền là bấm, không có đánh đổi nào ngoài
  // chuyện tạm cạn kho. Một cơ chế mà quyết định tối ưu luôn là "có thì làm" thì
  // không phải cơ chế, nó là một khoản thuế.
  //
  // Giờ mỗi thời đại MỞ KHOÁ công trình và quân mới. Hệ quả dây chuyền là thứ đáng
  // giá: lên thời đại → được xây Xưởng thợ → mới có cung thủ → mới có đội hình hai
  // lớp. Ba bước đó đều tốn tài nguyên và thời gian, nên một bộ lạc CÓ THỂ lên tới
  // Hoàng Kim mà vẫn đánh nhau bằng bộ binh thời Đồ Đá, nếu gen chiến lược của nó
  // dồn hết vào chỗ khác. Đó mới là một quyết định.
  AGE: {
    NAMES: ['—', 'Đồ Đá', 'Đồ Đồng', 'Đồ Sắt', 'Hoàng Kim'],
    // Giá đã hạ ~15% so với lần chỉnh đầu. Lý do là số đo chứ không phải cảm tính:
    // ở bảng giá cũ, trong 3 kỷ nguyên chạy thử (4.959 / 12.509 / 11.784 tick) chỉ
    // có ĐÚNG MỘT bộ lạc từng chạm tới Hoàng Kim. Một nửa cây công nghệ mà gần như
    // không kỷ nguyên nào nhìn thấy thì bằng chưa viết.
    // Bảng giá nghiêng hẳn về VÀNG và ĐÁ thay vì lương thực, và đó là điều chỉnh
    // quan trọng nhất của cả đợt cân bằng này. Lý do rút ra từ số đo: lương thực
    // KHÔNG BAO GIỜ tích được, vì khối tuyển quân đã tự động biến mọi khoản dư
    // thành lính (`wealth = food/5000` nhân vào tỉ lệ lính mục tiêu). Đòi 2.700
    // lương để lên Hoàng Kim là đòi một thứ mà chính bộ não bộ lạc đang tiêu sạch
    // theo thiết kế — nên không kỷ nguyên nào chạm tới nó. Vàng và đá thì không có
    // đường tiêu nào khác, tích được thật, và vì thế mới là đơn vị đo hợp lý.
    // ----------------------------------------------------------------
    // PHASE 3.16 — lần chỉnh thứ hai, và lần này có số đo chỉ thẳng vào thủ phạm
    //
    // Lần chỉnh trước đã nhận ra ĐÚNG nguyên nhân ("lương thực không bao giờ tích
    // được, vì khối tuyển quân biến mọi khoản dư thành lính") nhưng chỉ hạ giá
    // lương xuống chứ không bỏ hẳn — và hạ 15% một thứ không bao giờ tích được thì
    // vẫn là không bao giờ tích được. Đo trên 122 mẫu, mỗi mẫu là một bộ lạc còn
    // sống ở một mốc 500 tick:
    //     LƯƠNG chặn cửa lên đời  100%   (tồn kho trung bình 161)
    //     vàng                     52%   (382)
    //     gỗ                       43%   (607)
    //     đá                       12%   (30)
    // Một điều kiện đúng 100% số lần đo thì nó không phải một trong bốn điều kiện,
    // nó LÀ điều kiện — ba dòng kia chưa bao giờ được hỏi tới. Và đây là lý do
    // thật sự khiến Đồ Sắt và Hoàng Kim gần như không tồn tại trong trò chơi, chứ
    // không phải "kỷ nguyên quá ngắn": trong 4 kỷ nguyên liên tiếp đo được, KHÔNG
    // bộ lạc nào trong 16 chạm nổi tới Đồ Sắt.
    //
    // Bản này dời gần hết chi phí sang GỖ và VÀNG. Gỗ là lựa chọn quan trọng nhất:
    // tồn kho trung bình 607 nghĩa là nó đang nằm không: bộ lạc chặt về rồi không
    // biết tiêu vào đâu ngoài nhà ở và ruộng. Cho nó gác cửa thời đại là biến một
    // kho chết thành một quyết định, mà không phải thêm bất kỳ cơ chế nào.
    //
    // Lương giữ lại một phần nhỏ chứ không bỏ hẳn: nó vẫn phải là một cú SỐC ngắn
    // (lên đời xong thì đói một lúc, đúng cảm giác dốc kho), chỉ là không còn là
    // bức tường vĩnh viễn nữa.
    COST: [null, null,
      { food: 150, wood: 180, gold: 170 },
      { food: 200, wood: 320, gold: 360, stone: 90 },
      { food: 280, wood: 460, gold: 680, stone: 220 }],
    // Đo lại sau khi dời giá (24 mẫu, chỉ tính bộ lạc ĐÃ ở Đồ Sắt trở lên, tức là
    // đúng những kẻ đang đứng trước cửa Hoàng Kim): gỗ chặn 67%, vàng 50%, đá 46%,
    // lương 29%. Không dòng nào áp đảo — nghĩa là cả BỐN tài nguyên đều thật sự
    // được hỏi tới, và bộ lạc phải giỏi đều mới lên nổi bậc cuối. Đó mới là một
    // cái cổng; con số 100% ở bảng cũ là một bức tường.
    // Chỉ áp dụng cho quân ĐƯỢC SINH RA SAU khi lên thời đại — quân cũ giữ chỉ số cũ.
    BONUS: [null,
      { hp: 1, atk: 1, gather: 1 },
      { hp: 1.25, atk: 1.3, gather: 1.15 },
      { hp: 1.6, atk: 1.7, gather: 1.3 },
      { hp: 2, atk: 2.1, gather: 1.45 }],
    // Cổng mở khoá. Đọc một chỗ là biết cả cây công nghệ.
    //
    // Luật đọc thành lời: ĐỒ ĐÁ chỉ có bộ binh — không cung, không ngựa, không
    // máy móc. Đó là ràng buộc quan trọng nhất của cả bảng này, vì nó quyết định
    // 2.000 tick đầu của mọi kỷ nguyên trông như thế nào: bốn đám bộ binh giống
    // hệt nhau, nên thứ duy nhất phân biệt bốn bộ lạc trong giai đoạn đó là KINH
    // TẾ và VỊ TRÍ, không phải cơ cấu quân. Mọi khác biệt về đội hình chỉ bắt đầu
    // từ Đồ Đồng trở đi, và bắt đầu bằng một quyết định xây nhà.
    //   Đồ Đá     → bộ binh (+ anh hùng)
    //   Đồ Đồng   → cung thủ            (cần Xưởng thợ)
    //   Đồ Sắt    → kỵ sĩ, máy bắn đá   (cần Chuồng ngựa / Xưởng thợ)
    //   Hoàng Kim → kỵ xạ               (cần Chuồng ngựa)
    UNLOCK_BUILD: { town: 1, house: 1, farm: 1, barracks: 1, tower: 1, shrine: 1, workshop: 2, infirmary: 2, stable: 3, temple: 3, wonder: 4 },
    UNLOCK_UNIT:  { villager: 1, soldier: 1, hero: 1, archer: 2, knight: 3, catapult: 3, horsearcher: 4 }
  },

  BRAIN_INTERVAL: 20,     // mỗi N tick bộ não bộ lạc chạy 1 lần (quyết định xây/tuyển/tuyên chiến)
  WAR_MIN_ARMY: 10,       // dưới ngần này lính thì không đi đánh ai, chỉ thủ

  ERA: {
    MAX_TICKS: 30000,
    BANNER_FRAMES: 260,   // số frame hiện thẻ tổng kết "Kỷ nguyên kết thúc" trước khi tự sang kỷ nguyên mới
    POLICY_MUTATION: 0.12 // sigma khi nhân bản policy của bộ lạc thắng
  },

  GOD: {
    FAITH_MAX: 100,
    FAITH_START: 45,
    FAITH_REGEN_TICKS: 20  // +1 Đức Tin mỗi N tick
  },

  // ============================================================
  // THỜ CÚNG — tế phẩm, lời khẩn cầu, và ban phước
  // ============================================================
  // Đây là vòng lặp duy nhất trong cả trò chơi đi TỪ nền văn minh RA tới người xem
  // rồi quay TRỞ LẠI. Mọi thứ khác chạy kín trong mô phỏng; quyền năng Chúa Tể thì
  // có đó nhưng không ai cần tới, vì thế giới không bao giờ HỎI XIN gì cả.
  //
  // Luật: bộ lạc có Đền thờ định kỳ đem lương thực và vàng ra TẾ. Tế phẩm sinh
  // Đức Tin cho bạn và cộng vào điểm THÀNH TÂM của họ. Khi lâm nguy, họ cất lên
  // một LỜI KHẨN CẦU — hiện thành thẻ trong bảng Chúa Tể. Bạn ban phước thì hiệu
  // lực nhân theo điểm thành tâm của chính bộ lạc đó.
  //
  // Vì sao điều này đáng làm hơn "một quyền năng nữa": `piety` là một gen, và mức
  // lời/lỗ của nó KHÔNG nằm trong code. Tế phẩm là lương thực không thành lính.
  // Nó có đáng hay không hoàn toàn phụ thuộc vào việc NGƯỜI ĐANG XEM có đáp lời
  // hay không. Nói cách khác: đây là một gen mà bề mặt chọn lọc của nó là hành vi
  // của bạn. Xem đủ lâu và luôn ban phước cho kẻ sùng đạo, các kỷ nguyên sau sẽ
  // ngày một sùng đạo hơn; ngồi im, và tín ngưỡng sẽ tàn lụi.
  WORSHIP: {
    OFFER_INTERVAL: 300,          // mỗi nơi thờ tự dâng tế sau ngần này tick
    // Tế phẩm chủ yếu là LƯƠNG THỰC, chỉ một chút vàng. Bản đầu lấy 20 vàng mỗi
    // lần và đo ra hậu quả không lường trước: 199 lần dâng tế trong một kỷ nguyên
    // rút gần 4.000 vàng khỏi bốn kho, mà vàng đúng là thứ gác cửa Hoàng Kim —
    // nên tín ngưỡng vừa thêm vào đã lặng lẽ khoá mất Kỳ quan vừa mới mở ra
    // (maxAge tụt về 3 ở cả 3 kỷ nguyên liền, 0 Kỳ quan).
    //
    // Lương thực là lựa chọn đúng về cả hai mặt: nó vẫn là chi phí thật (mỗi phần
    // lương không thành tế phẩm thì thành lính), nhưng nó KHÔNG gác cửa thứ gì —
    // nên tín ngưỡng cạnh tranh với quân đội chứ không cạnh tranh với thời đại.
    OFFER_COST: { food: 70, gold: 8 },
    // 2 chứ không phải 5. Đo thật ở mức 5: với bốn bộ lạc cùng dâng tế, Đức Tin
    // DÍNH TRẦN 100 suốt bốn kỷ nguyên liền — thu vào nhiều hơn mọi cách tiêu ra
    // cộng lại. Một tài nguyên không bao giờ thiếu thì không phải tài nguyên, và
    // mọi quyết định "tiêu vào đâu" của người xem lập tức mất hết trọng lượng.
    FAITH_PER_OFFER: 2,
    PIETY_PER_OFFER: 1,
    PRAYER_INTERVAL: 1700,        // giãn cách tối thiểu giữa hai lời khẩn cầu của cùng một bộ lạc
    PRAYER_TTL: 900,              // không đáp lời trong ngần này tick thì lời cầu tắt
    BLESS_COST: 28,               // Đức Tin phải trả để ban phước
    // Ban phước tự động cho kẻ THÀNH TÂM NHẤT, kể cả khi không có ai ngồi xem.
    // Nếu thiếu vế này thì gen `piety` không có kiểu hình nào trong các lần chạy
    // thí nghiệm không người, và nó sẽ trôi tự do đúng như `aggression` ở chế độ
    // thủ thành — mất luôn khả năng so sánh "có người xem" với "không người xem".
    FAVOUR_INTERVAL: 2400,
    FAVOUR_MIN_PIETY: 4
  },

  CHART_SAMPLE_INTERVAL: 30,
  CHART_HISTORY: 320,
  LOG_MAX: 200
};

// Tên + màu bộ lạc: CỐ ĐỊNH theo slot (0..3) qua mọi kỷ nguyên, để mắt quen màu.
// Cái ĐỔI giữa các kỷ nguyên là POLICY nằm trong slot đó — xem tribe.lineage.
// Bốn màu = bốn thứ BỘT KHOÁNG mà chính tên bộ lạc đã gọi ra. Bản trước dùng
// nguyên bốn ô trong bảng Material Design (#ef5350 / #42a5f5 / #e0a825 /
// #ab47bc) — bốn màu ấy phân biệt tốt, nhưng chúng là màu của giao diện phần
// mềm, nên đặt lên mặt cỏ chúng nổi lên như bốn cái nhãn dán chứ không như
// bốn dân tộc. Chu sa, thanh lục, thư hoàng và tử vẫn cách nhau đúng bằng ấy
// góc trên vòng màu (đỏ / lam-lục / vàng / tím) nên KHÔNG mất một chút khả
// năng phân biệt nào, mà lại thuộc về cùng một thế giới với mặt đất.
const TRIBE_TEMPLATES = [
  { name: 'Xích Long', color: '#e04b32', dark: '#7a2418' },   // chu sa
  { name: 'Thanh Vân', color: '#37a6c4', dark: '#17525f' },   // thanh lục
  { name: 'Hoàng Kim', color: '#f0b53c', dark: '#8a6113' },   // thư hoàng
  { name: 'Tử Vi',     color: '#a86ac6', dark: '#4f2a62' }    // tử
];

