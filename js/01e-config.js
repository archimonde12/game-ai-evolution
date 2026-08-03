'use strict';
// ============================================================
// 01e-config.js
// ------------------------------------------------------------
// CONFIG (phần 5/5) — đường cái (ROAD), thời đại (AGE), kinh đô, kỷ
// nguyên, quyền năng Chúa Tể (GOD), Thiên Ma (WORLD_BOSS), thờ phụng.
// Ghép CẢ 5 phần thành biến CONFIG thật ở cuối file này — PHẢI nạp SAU
// 01a..01d. Rồi tới TRIBE_TEMPLATES (không thuộc CONFIG, giữ nguyên vị
// trí như file gốc). Xem 01a-config.js.
// ============================================================
const CONFIG_E = {

  // ================================================================
  // ĐƯỜNG CÁI — thứ đầu tiên trong game KHÔNG phải công trình, KHÔNG phải đơn vị
  // ================================================================
  // Không máu, không bị nhắm bắn, không chặn đường, không tính vào bảng công trình.
  // Nó chỉ là một tính chất của MẶT ĐẤT: đứng trên đó thì đi nhanh gấp đôi.
  //
  // Vì sao đáng có mặt: bản đồ 480x300 làm khoảng cách thành hằng số mà chỉ KỴ BINH
  // mua được (speedMult 1,65-1,7, xem CONFIG.UNIT). Đường cái là cách mua khoảng
  // cách bằng KINH TẾ thay vì bằng cơ cấu quân — và nó mua cho MỌI người, kể cả
  // người dân gánh hàng. Nghĩa là nó nối thẳng vào cái nút thắt mà Kho hàng đã gỡ
  // một nửa ở Phase 3.25 (quãng gánh 30 ô), nhưng gỡ theo trục khác: kho rút NGẮN
  // quãng đường, đường cái làm quãng đường RẺ đi.
  //
  // QUÁI KHÔNG ĐƯỢC HƯỞNG. Đây là luật, không phải quên: đường cái là hạ tầng của
  // nền văn minh, và nếu quái cũng đi nhanh gấp đôi trên đó thì mỗi con đường dẫn
  // về kinh đô là một đường ray chở quái tới tận cửa — cơ chế tự phủ định chính nó.
  //
  // "XÂY THÀNH DẢI, KHÔNG XÂY LIỀN MẢNG" — ba luật giữ cho nó không thành sân lát đá:
  //   1. Đường luôn là một TUYẾN nối hai công trình của chính bộ lạc, rộng đúng 1 ô.
  //   2. MAX_NEIGHBORS: một ô ứng viên đã có >= 3 ô đường xung quanh thì BỎ. Đây là
  //      luật chống-phình: hai tuyến chạy song song sát nhau sẽ tự dừng lại thay vì
  //      dính vào nhau thành mảng.
  //   3. MAX_CELLS theo thời đại: tổng ngân sách đường của một bộ lạc có trần cứng,
  //      nên "lát hết khu vực" không phải một chiến lược khả thi ngay cả khi giàu.
  // Mặt đường VẼ thành từng phiến đá rời (xem drawRoad) — hiệu ứng thì liền mạch,
  // còn hình ảnh thì đứt quãng, đúng như một con đường lát đá thật trông từ trên cao.
  // ----------------------------------------------------------------
  // PHASE 3.28 — ĐƯỜNG CÁI LÊN CẤP THEO THỜI ĐẠI
  // ----------------------------------------------------------------
  // Bản trước: một hệ số duy nhất, +100%, từ Đồ Đồng tới Thiên Triều. Nghĩa là
  // đường cái là cơ chế DUY NHẤT trong game hoàn toàn không biết tới thời đại —
  // trong khi mọi thứ khác (máu, đòn, sức chứa nhà, mái nhà, ngân sách đường)
  // đều leo theo. Một con đường đất Đồ Đồng và một con ngự đạo Thiên Triều đi
  // nhanh bằng nhau, và trông y hệt nhau.
  //
  // Cấp đường đọc theo THỜI ĐẠI CỦA BỘ LẠC SỞ HỮU, không phải thời đại lúc lát.
  // Hai cách đều tự nhiên, nhưng cách thứ hai cho ra một mạng đường VÁ CHẰNG VÁ
  // ĐỤP — đoạn đất cạnh đoạn đá cạnh đoạn phiến — và người xem sẽ đọc ra "lỗi
  // hiển thị" chứ không đọc ra "lịch sử". Cách này thì cả mạng đường nâng cấp
  // cùng một lúc ngay tại tick bộ lạc lên đời, đúng cùng nhịp với đợt trùng tu
  // nhà cửa (drawAgeUpSweep) — một khoảnh khắc, cả nền văn minh sáng lên.
  //
  // ĐƯỜNG CỦA ĐỊCH VẪN CHO MÌNH ĐI NHỜ (luật cũ, giữ nguyên): xâm lược một đế
  // chế Thiên Triều nghĩa là được đi trên chính ngự đạo của nó. Đó là cái giá
  // của hạ tầng, và nó cân lại đúng chỗ mà cấp 3 vừa mạnh lên.
  //
  // Tốc: +50% -> +100% -> +150%, ba bậc trên bốn thời đại có đường (2-5).
  // Diện mạo: BỐN bậc, một bậc mỗi thời đại (xem drawRoads). Vì sao lệch nhau —
  // Thiên Triều không cần nhanh thêm nữa (2,5 đã ngang ngửa kỵ binh) nhưng nó
  // vẫn phải NHÌN khác Hoàng Kim, nếu không thì bậc năm không tồn tại với mắt.
  ROAD: {
    // Chỉ số = thời đại của bộ lạc chủ con đường. 0-1 để trống vì MIN_AGE = 2.
    SPEED_BY_AGE: [1, 1, 1.5, 2, 2.5, 2.5],
    STONE_PER_CELL: 1.6,    // giá mỗi ô đường, trả dần theo tiến độ lát
    PAVE_PER_BRAIN: 4,      // mỗi nhịp bộ não lát được ngần này ô
    MAX_NEIGHBORS: 3,       // >= ngần này ô đường kề bên thì cấm lát (luật chống phình)
    MIN_AGE: 2,             // Đồ Đồng mới biết lát đường — cùng bậc với ruộng
    MIN_LEN: 8,             // tuyến ngắn hơn ngần này thì không đáng lát
    MAX_LEN: 90,            // tuyến dài hơn ngần này thì bỏ (thường là đích nằm bên kia rừng)
    // Trần tổng số ô đường mỗi bộ lạc, tra theo thời đại. Chỉ số 0-1 để trống vì
    // MIN_AGE = 2 — giữ chỗ để `MAX_CELLS[age]` là một phép tra thẳng.
    MAX_CELLS: [0, 0, 110, 240, 420, 640],
    STONE_RESERVE: 60       // giữ lại ngần này đá cho việc khác trước khi lát
  },

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
    // THIÊN TRIỀU là bậc thứ năm, thêm ở Phase 3.27. Bốn tên cũ đi theo VẬT LIỆU
    // (đá, đồng, sắt, vàng) — hết vật liệu để leo thì bậc năm phải đổi trục, và nó
    // đổi sang TỔ CHỨC: không phải "làm bằng gì" nữa mà "cai trị tới đâu". Đó cũng
    // đúng là thứ bậc năm mở ra trên bản đồ (đường cái, voi chiến, quân kỳ) —
    // những thứ chỉ một nhà nước đủ lớn mới nuôi nổi.
    NAMES: ['—', 'Đồ Đá', 'Đồ Đồng', 'Đồ Sắt', 'Hoàng Kim', 'Thiên Triều'],
    MAX: 5,
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
    //
    // BẬC 5 (THIÊN TRIỀU) — giá nghiêng hẳn về ĐÁ, và đó là chủ ý của cả Phase 3.27.
    // Đo ra 99,4% đá trên bản đồ chưa ai đụng tới vì không có chỗ nào tiêu nó: bảng
    // giá cũ đòi tối đa 220 đá cho cả cây thời đại, tức là một mỏ rưỡi. 520 đá ở
    // bậc cuối, cộng với đường cái (1,6 đá/ô) và tháp canh (30 đá/cái, giờ là điều
    // kiện lên đời), là ba cái vòi tiêu đá thật sự đầu tiên trong game.
    COST: [null, null,
      { food: 150, wood: 180, gold: 170 },
      { food: 200, wood: 320, gold: 360, stone: 90 },
      { food: 280, wood: 460, gold: 680, stone: 220 },
      { food: 380, wood: 700, gold: 1050, stone: 520 }],
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
      { hp: 2, atk: 2.1, gather: 1.45 },
      { hp: 2.5, atk: 2.6, gather: 1.6 }],
    // ================================================================
    // MÁU CÔNG TRÌNH THEO THỜI ĐẠI (Phase 3.35) — lỗ hổng có từ ngày đầu
    // ================================================================
    // Bảng BONUS ngay trên cho ĐƠN VỊ một đường leo đầy đủ (máu 1 → 2,5 · đòn
    // 1 → 2,6). Công trình thì KHÔNG CÓ GÌ: một căn nhà ở thời Thiên Triều dày đúng
    // 200 máu như căn nhà thời Đồ Đá, trong khi kẻ đang đập nó đánh mạnh gấp 2,6
    // lần. Nghĩa là mỗi bậc thời đại, thành phố lại tan nhanh hơn — thời đại càng
    // cao thì công trình càng gần với đồ trang trí.
    //
    // Không có dòng lỗi nào cho chuyện này vì nó không phải một lỗi, nó là một
    // TRỤC BỊ BỎ QUÊN: `masonryMult` (nhánh nghiên cứu Nề đá) là đường DUY NHẤT
    // làm nhà dày lên, mà nó là một lựa chọn — nên bộ lạc không chọn nó thì cả
    // thành phố đứng yên trong khi thế giới quanh nó leo dốc.
    //
    // 1,0 → 1,4 chứ không phải 1,0 → 2,5 như đơn vị, và độ dốc thấp hơn hẳn đó là
    // có chủ ý: công trình KHÔNG né được, không phản đòn (trừ tháp và kinh đô), và
    // không hồi máu. Cho nó leo ngang với quân đội thì công thành ở hậu kỳ sẽ dài
    // gấp đôi bây giờ, và cái dài ra là quãng đứng gõ tường — phần chán nhất.
    BUILD_HP: [1, 1, 1.1, 1.2, 1.3, 1.4],
    // ================================================================
    // SỨC ĐÁNH THÁP CANH THEO THỜI ĐẠI (Phase 3.35) — hạ 40%, bò về 100% ở đời 5
    // ================================================================
    // Tháp là công trình DUY NHẤT vừa bắt buộc (NEED_TOWERS) vừa bắn trả, và ở
    // Phase 3.27 nó được nâng lên 16 sát thương / hồi 11 = 1,45/tick — bằng đúng
    // hai người lính đứng gác vĩnh viễn, ngay từ Đồ Đá. Đó là quá sớm: hai đạo bộ
    // binh Đồ Đá đánh nhau thì bên nào có tháp gần như tự động thắng, và trận đánh
    // đáng xem nhất của cả kỷ nguyên — trận đầu tiên — bị một công trình quyết định.
    //
    // Nhân vào SÁT THƯƠNG chứ không vào tầm bắn hay máu: tầm 10 là thứ giữ cho tháp
    // không bị phá miễn phí từ ngoài tầm với (xem BUILD.tower), và hạ nó xuống là
    // xoá luôn lý do tháp tồn tại. Hạ sát thương thì cái tháp vẫn CÓ MẶT ở đúng chỗ
    // nó phải có mặt, chỉ là nó chưa đủ sức tự mình quyết định một trận đánh.
    //
    // Bước 10% mỗi đời, đúng cùng nhịp với BUILD_HP ngay trên, và về đúng 1,0 ở
    // Thiên Triều: tới bậc đó thì mọi bên đều có máy bắn đá tầm 12 và voi chiến,
    // nên một cái tháp đủ mạnh không còn là thứ định đoạt trận đánh nữa.
    TOWER_ATK: [1, 0.6, 0.7, 0.8, 0.9, 1],
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
    //   Thiên Triều → nỏ thần, voi chiến, quân kỳ (Xưởng thợ / Chuồng ngựa / Trại lính)
    //
    // RUỘNG DỜI TỪ ĐỒ ĐÁ LÊN ĐỒ ĐỒNG (Phase 3.27), và đây là nửa còn lại của cách
    // chữa "không ai đi hái quả". Hạ sản lượng ruộng thôi thì chưa đủ: một bộ lạc
    // vẫn dựng ruộng ở tick 200 và cả nghìn tick đầu vẫn không ai rời làng. Khoá
    // ruộng sau một cổng thời đại thì giai đoạn ĐỒ ĐÁ — 2.000 tick đầu của mọi kỷ
    // nguyên — chỉ còn đúng một nguồn lương: đi tới bụi quả. Nghĩa là bộ lạc buộc
    // phải HỌC BẢN ĐỒ trước khi được phép tự cung tự cấp, và vị trí bụi quả trở
    // thành một sự thật địa lý quyết định mở đầu ván chơi, đúng vai trò mà mỏ đá
    // đang giữ cho hậu kỳ.
    // `camp: 2` cùng bậc với chính đội hậu cần. Trại KHÔNG đi qua queueBuild nên
    // dòng này không gác cửa gì cả trong đường chạy thật — nó có mặt vì `unlockedBuild`
    // là một phép tra bảng có mặc định 1, và một loại công trình vắng mặt ở đây thì
    // lần sau ai đó gọi hàm ấy sẽ nhận về "mở từ Đồ Đá" mà không ai cố ý.
    // `wonder: 5` (Thiên Triều) từ Phase 3.34, trước là 4. Không phải một cú siết
    // cảm tính — đo 6 kỷ nguyên chinh phạt, tick mà bộ lạc ĐẦU TIÊN chạm mỗi đời:
    //     đời 3 ở 2.700-4.000 · đời 4 ở 3.740-5.700 · đời 5 ở 4.360-7.160
    //     (1/6 kỷ nguyên bế tắc hẳn ở đời 3, không ai lên nổi đời 4 — cả hai luật
    //      cũ và mới đều khoá Kỳ quan ở kỷ nguyên đó, nên bản này không làm mất gì)
    // Trong 5 kỷ nguyên còn lại, khoảng cách từ lúc đời 5 xuất hiện tới lúc ván ngã
    // ngũ là 2.000-10.000 tick, thừa cho 820 tick khởi công + 2.600 tick giữ. Nói
    // cách khác: luật mới dời Kỳ quan muộn khoảng 2.000 tick chứ không đẩy nó ra
    // ngoài kỷ nguyên — đúng ranh giới của bài học "nội dung để dành ở cấp cao nhất
    // là nội dung không tồn tại" (Phase 3.22), và lần này phép đo nói là chưa chạm.
    UNLOCK_BUILD: { town: 1, house: 1, farm: 2, depot: 1, barracks: 1, tower: 1, shrine: 1, heroHall: 1, workshop: 2, infirmary: 2, camp: 2, stable: 3, temple: 3, wonder: 5 },
    UNLOCK_UNIT:  { villager: 1, soldier: 1, hero: 1, archer: 2, medic: 2, quarter: 2, knight: 3, catapult: 3, horsearcher: 4,
                    ballista: 5, elephant: 5, standard: 5 },
    // ================================================================
    // THÁP CANH LÀ ĐIỀU KIỆN LÊN ĐỜI TỪ BẬC 3 — cổng thời đại đầu tiên đòi một
    // thứ KHÔNG PHẢI TÀI NGUYÊN
    // ================================================================
    // Bốn dòng trong COST đều là "gom đủ tiền rồi bấm". Đó là một cái cổng mà bộ
    // lạc đi qua bằng THỜI GIAN chứ không bằng quyết định: không có cách nào tiêu
    // sai, chỉ có tiêu chậm. Số tháp thì khác — nó là tài nguyên đã ĐÔNG CỨNG thành
    // một hình dạng trên bản đồ, không rút lại được, và nó nằm ở CHỖ nào đó cụ thể.
    //
    // Hệ quả dây chuyền là chỗ đáng giá: `towerTarget` từ một gen phòng thủ thuần
    // tuý trở thành một gen KINH TẾ — bộ lạc gen thấp vẫn buộc phải xây đủ tháp để
    // lên đời, tức là nó trả một khoản thuế mà bộ lạc gen cao đã trả sẵn từ trước.
    // Và vì tháp giờ tốn đá (xem BUILD.tower), cái cổng này cũng là một cái vòi tiêu
    // đá đều đặn từ giữa kỷ nguyên trở đi.
    //
    // Chỉ số = thời đại SẮP TỚI. NEED_TOWERS[3] = 2 nghĩa là muốn lên Đồ Sắt phải
    // có sẵn 2 tháp ĐÃ XÂY XONG.
    // ---- Phase 3.35: GẤP ĐÔI hạn ngạch ----
    // Đi kèm việc hạ sát thương tháp 40% (xem TOWER_ATK) và hai thứ phải đọc CÙNG
    // NHAU, vì tách ra thì mỗi cái đều sai: hạ sức mạnh mà giữ nguyên hạn ngạch là
    // biến tháp thành thuần thuế; gấp đôi hạn ngạch mà giữ nguyên sức mạnh là bắt
    // mọi bộ lạc dựng 14 khẩu pháo phòng thủ quanh nhà. Cùng nhau thì tháp đổi VAI:
    // từ "vũ khí" thành "hạ tầng" — thứ phải có nhiều, mỗi cái không quyết định gì,
    // và tổng của chúng vẽ ra hình dạng của một đế chế trên bản đồ.
    //
    // 14 cái để lên Thiên Triều là 1.190 gỗ + 630 đá đông cứng thành công trình.
    // Đá là thứ đắt nhất trong đó và cũng chính là thứ gác cửa Kỳ quan — nên đây là
    // một cái cổng THẬT, không phải một khoản phí. Nếu phép đo cho thấy Thiên Triều
    // biến mất khỏi các kỷ nguyên thì đây là con số phải xét lại trước tiên.
    NEED_TOWERS: [0, 0, 0, 4, 8, 14],
    // ================================================================
    // TRẦN DÂN THƯỜNG THEO THỜI ĐẠI — mắt xích còn thiếu của cả Phase 3.24
    // ================================================================
    // Cho `house.popByAge` sức chứa gấp ba mà quân đội KHÔNG đông thêm một người
    // nào. Đo 3 kỷ nguyên để tìm ra vì sao, đếm xem điều gì chặn lệnh tuyển quân
    // ở 3.898 nhịp bộ não:
    //     lương dưới mức dự trữ   40,3%
    //     quân đã đủ chỉ tiêu     23,1%
    //     chưa có trại lính       14,9%
    //     không đủ tiền           12,9%
    //     TRẦN DÂN SỐ ĐẦY          0,6%   <-- thứ tôi vừa đi nâng
    // Trần dân số gần như KHÔNG BAO GIỜ là thứ chặn. Nâng nó lên là nới một cái
    // cổng vốn đã mở sẵn — đúng cái lỗi "sửa mà không đổi được gì" đã ghi ở
    // BUILD_PENALTY, chỉ khác là lần này tôi tự gây ra rồi tự đo ra.
    //
    // Chụp trạng thái sáu bộ lạc ở tick 6.000 thì lộ ra thủ phạm thật: MỌI bộ lạc
    // đã phát triển đều đứng đúng ở 89-90 dân thường — cái trần VIẾT CỨNG `< 90`
    // trong tribeBrain — trong khi kho lương 2.214-7.336 và trần dân số còn thừa
    // 23-62 suất. Nền văn minh không thiếu chỗ ở và không thiếu ăn; nó bị cấm đẻ.
    //
    // Và đây mới là chỗ hai con số khoá vào nhau: `wantSoldiers` tính theo `s.pop`,
    // mà `pop` = dân thường + lính. Dân thường đụng trần thì `pop` đứng yên, nên
    // chỉ tiêu quân đội cũng đứng yên — quân đội bị chặn bởi trần DÂN, không phải
    // bởi trần nhà. Nới trần dân mà không nới `popByAge` thì lập tức đụng trần nhà;
    // nới trần nhà mà không nới trần dân thì không ai nhận ra có gì thay đổi. Phải
    // có cả hai, và đó là lý do khối này nằm cùng một bản với popByAge.
    VILLAGER_CAP: [0, 90, 112, 138, 168, 205]
  },

  BRAIN_INTERVAL: 20,     // mỗi N tick bộ não bộ lạc chạy 1 lần (quyết định xây/tuyển/tuyên chiến)
  WAR_MIN_ARMY: 10,       // dưới ngần này lính thì không đi đánh ai, chỉ thủ

  // ============================================================
  // MẤT KINH ĐÔ = ĐỒNG HỒ ĐẾM NGƯỢC (Phase 3.35)
  // ============================================================
  // Luật diệt vong cũ hỏi đúng một câu: "còn đơn vị nào không, và có đủ điều kiện
  // ra dân mới không". Một bộ lạc mất sạch nhà chính nhưng còn 40 người lính lang
  // thang thì hoàn toàn hợp lệ — và nó sống như thế tới hết kỷ nguyên. Đo 4 kỷ
  // nguyên: 10 lần một bộ lạc mất kinh đô, chỉ 5 lần dẫn tới diệt vong (sau
  // 103-299 tick, và chỉ vì họ mất luôn cả dân); kỷ nguyên 1 kết thúc với MỘT
  // TRONG BA bộ lạc còn sống đang không sở hữu một cái kinh đô nào.
  //
  // Vì sao đó là một lỗi thiết kế chứ không phải một kết cục hợp lệ: cả bàn cờ có
  // đúng một mục tiêu chiến lược mà ai cũng đồng ý là quyết định — kinh đô. Nếu san
  // phẳng nó KHÔNG kết thúc được gì, thì phần thưởng của cuộc công thành đắt nhất
  // trong game chỉ là "đối phương bất tiện hơn một chút", và người xem thấy một
  // đoàn quân thắng trận đứng giữa đống đổ nát mà không có gì xảy ra.
  //
  // Đồng hồ chứ không phải xử thua NGAY, vì bộ lạc CÓ đường gỡ thật: nhánh sống
  // còn trong tribeBrain dồn toàn lực dựng lại nhà chính ở chỗ người dân đầu tiên
  // tìm được. GRACE phải đủ dài để đường gỡ đó chạy được thật — 260 tick xây chia
  // 3 thợ ở nhịp 0,6 là ~145 tick, cộng quãng đi và quãng gom 250 gỗ — nhưng đủ
  // ngắn để một đạo quân thắng trận thấy được kết quả của việc mình vừa làm.
  // Đồng hồ ĐÓNG BĂNG nếu đã có móng nhà chính đang dựng: kẻ đang xây dở không
  // phải kẻ đang chạy rông, và phạt họ vì thợ đi chậm là phạt sai người.
  CAPITAL: {
    GRACE: 600,
    WARN_AT: 300,     // dưới mốc này thì đồng hồ chuyển sang cảnh báo đỏ trên bảng bộ lạc
    CAMERA_W: 14      // trọng số điểm nóng để camera đạo diễn quay về nơi sắp diệt vong
  },

  ERA: {
    MAX_TICKS: 30000,
    BANNER_FRAMES: 260,   // số frame hiện thẻ tổng kết "Kỷ nguyên kết thúc" trước khi tự sang kỷ nguyên mới
    POLICY_MUTATION: 0.12 // sigma khi nhân bản policy của bộ lạc thắng
  },

  GOD: {
    FAITH_MAX: 100,
    FAITH_START: 45,
    FAITH_REGEN_TICKS: 20,  // +1 Đức Tin mỗi N tick
    // ============================================================
    // QUYỀN NĂNG MẠNH DẦN THEO ĐỒNG HỒ KỶ NGUYÊN (Phase 3.34)
    // ============================================================
    // Cho tới bản này, năm quyền năng "thường" có đúng một bộ số cho cả kỷ nguyên,
    // trong khi thế giới dưới tay chúng thì không: một người lính Đồ Đá có 65 máu và
    // một người lính Thiên Triều đã có hơn 100 cộng ba cấp giáp, một cái kho đầu kỷ
    // nguyên có 300 lương còn cuối kỷ nguyên có hàng chục nghìn. Hệ quả không phải
    // "về sau hơi yếu" — nó là: MỌI quyền năng đều đáng bấm nhất ở tick 0 và trở
    // thành tiếng ồn về sau, nên nửa sau mỗi ván không còn quyết định nào để ra.
    // Đúng cái bẫy đã phải sửa cho Thiên Ma ở 3.33, chỉ khác là ở đó nó ẩn sau một
    // cái nút, còn ở đây nó nằm trên năm cái nút cùng lúc.
    //
    // MỘT hệ số, tuyến tính theo tick, kẹp hai đầu — cùng hình dạng với
    // WORLD_BOSS.RAMP và cùng lý do: người xem phải NHẨM ĐƯỢC nó. Cả hai đọc chung
    // một hàm `eraRamp` (xem 12-loop-era) chứ không chép công thức lần thứ hai.
    //
    //   0,70 ở tick 0        -> sét 53 sát thương, thiên ân 196 lương
    //   1,00 ở tick ~4.700   -> đúng bảng số cũ
    //   1,46 ở tick 10.000   -> quãng mà phần lớn ván đang ngã ngũ
    //   2,60 ở tick 25.000   -> sét 195, thiên ân 728 lương
    //
    // HAI LOẠI HIỆU LỰC, và ranh giới giữa chúng là cả nội dung của khối này:
    //   · SỐ TUYỆT ĐỐI (sát thương, tài nguyên) NHÂN THẲNG hệ số. Đây là loại mục
    //     ruỗng theo thời gian, vì cái nó so sánh với — máu, kho — thì lớn dần.
    //   · TỈ LỆ (Dịch Bệnh lấy % máu tối đa) KHÔNG nhân hệ số này. Một phân số đã
    //     tự leo theo thế giới rồi; nhân thêm lần nữa là leo hai lần. Nó có đường
    //     ramp riêng, hẹp hơn nhiều, nằm ngay tại chỗ dùng.
    //   · BÁN KÍNH nhân theo CĂN BẬC HAI của hệ số, không nhân thẳng. Diện tích đi
    //     theo bình phương bán kính, nên nhân thẳng 2,6 vào bán kính là nhân 6,8
    //     vào vùng ảnh hưởng — một cơn mưa cuối kỷ nguyên sẽ phủ gần trọn lãnh thổ
    //     một bộ lạc và cú click không còn phải NHẮM vào đâu nữa. Lấy căn thì diện
    //     tích lớn lên đúng bằng hệ số, và người xem vẫn phải chọn chỗ.
    RAMP: { START: 0.70, PEAK: 2.60, PEAK_TICK: 25000 },
    // Bộ số GỐC, tức là con số ở hệ số 1,0 (tick ~4.700). Đọc bảng này thay vì đọc
    // những con số nằm rải trong thân `apply` là điều kiện để cả ba chỗ — bảng hint,
    // dòng nhật ký, hiệu lực thật — không thể lệch nhau; ba chỗ ấy đã lệch một lần
    // rồi ở nút Thiên Ma ("5.200 máu" trong khi con quái có 9.000).
    STRIKE: { unit: 75, build: 220, r: 5 },
    // Thiên ân: 260/240/180/90 -> 280/240/200/120. Hai khoản được nâng, và cả hai
    // theo đúng chỗ thắt của bản đồ từ 3.30-3.33: ĐÁ là thứ bức tường mới biến thành
    // nút thắt thật, VÀNG là thứ gác cửa lên đời. Lương và gỗ giữ nguyên vì cả hai
    // đều có nguồn tái tạo trong lãnh thổ (ruộng, rừng), nên chúng là thứ một bộ lạc
    // tự xoay được — tặng thêm chỉ rút ngắn thời gian, không mở ra lựa chọn nào.
    GIFT: { food: 280, wood: 240, stone: 200, gold: 120 },
    // [đầu kỷ nguyên, ở PEAK_TICK]. Là TỈ LỆ nên đi đường riêng, không nhân RAMP —
    // lý do đầy đủ nằm ở chú thích `apply` của Dịch Bệnh.
    PLAGUE_FRAC: [0.30, 0.62]
  },

  // ============================================================
  // THIÊN MA — con quái do NGƯỜI XEM thả xuống (Phase 3.30)
  // ============================================================
  // Bốn quyền năng cũ đều là một phép CỘNG hoặc TRỪ vào bảng số của một bộ lạc:
  // thêm lương, bớt máu, mọc thêm cây. Chúng thay đổi ai đang thắng, nhưng không
  // thay đổi việc bốn bộ lạc đang làm gì — sau khi hiệu ứng trôi qua, bản đồ trở
  // lại đúng câu chuyện cũ. Thiên Ma khác ở đúng chỗ đó: nó là một VẬT THỂ, nó
  // đứng trên bản đồ, và mọi bộ lạc phải quyết định làm gì với nó.
  //
  // THƯỞNG VÀ PHẠT, và vì sao cả hai đều cần:
  //   · PHẠT là mặc định — nó hành quân tới bộ lạc đang DẪN ĐẦU (không phải bộ lạc
  //     gần nhất, không phải ngẫu nhiên) và đập nát mọi thứ trên đường. Nhắm kẻ
  //     dẫn đầu vì đó là cách duy nhất khiến quyền năng này là một CÔNG CỤ chứ
  //     không phải một cú tung xúc xắc: người xem biết trước nó sẽ đi đâu.
  //   · THƯỞNG thuộc về bộ lạc RA ĐÒN CUỐI. Không chia đều, không chia theo sát
  //     thương — vì "ai giết được nó" phải là một câu trả lời được, và một kho
  //     báu chia đều thì không ai có lý do đi tranh cú đánh cuối.
  // Nên một lần thả Thiên Ma là một canh bạc có hình dạng đọc được: nó chắc chắn
  // làm kẻ dẫn đầu chảy máu, nhưng nếu kẻ dẫn đầu hạ được nó thì chính hắn nhận
  // kho báu và bỏ xa hơn nữa.
  WORLD_BOSS: {
    // ============================================================
    // CỬA MỞ: PHẢI CÓ MỘT BỘ LẠC TỚI HOÀNG KIM (Phase 3.34)
    // ============================================================
    // Bản 3.33 cho con quái mạnh dần theo tick để "thả sớm" không còn là câu trả lời
    // duy nhất đúng. Nó chữa được một nửa vấn đề: sau bản đó, thả sớm vẫn LUÔN HỢP
    // LỆ, chỉ là được một con quái yếu hơn. Mà một con Thiên Ma cấp Sơ Giáng thả vào
    // tick 600 thì thế giới lúc ấy có bốn cụm nhà tranh và chưa bộ lạc nào có nổi
    // một trại lính — nó không phải một biến cố, nó là một cái nút xoá ván.
    //
    // Điều kiện là THỜI ĐẠI chứ không phải một mốc tick, và khác biệt đó là toàn bộ
    // lý do nó đáng có: một mốc tick chỉ bắt người xem chờ, còn một mốc thời đại
    // biến việc chờ thành một thứ ĐỌC ĐƯỢC TRÊN BẢN ĐỒ — mái nhà đổi vật liệu, tường
    // mọc lên, kỵ binh ra khỏi chuồng. Người xem không đếm ngược, họ nhìn thế giới
    // lớn lên rồi mới được quyền thả tai hoạ xuống nó.
    //
    // Đo 6 kỷ nguyên chinh phạt: bộ lạc đầu tiên chạm Hoàng Kim ở tick 3.740-5.700
    // (1/6 kỷ nguyên không ai chạm tới — kỷ nguyên đó bế tắc ở Đồ Sắt và Thiên Ma
    // khoá suốt ván, đúng như ý định). Hệ quả phụ đáng ghi: đầu dải RAMP (0,62 ở
    // tick 0) từ nay là vùng không với tới được, cú thả sớm nhất có thể rơi vào
    // khoảng hệ số 0,79. Không hạ START để bù — cái ramp ấy đo sức mạnh theo ĐỒNG
    // HỒ, còn cái cửa này đo theo THẾ GIỚI, và chồng hai thước đo lên nhau để giữ
    // một con số cũ thì chỉ được một con số, không được một luật.
    MIN_AGE: 4,
    // Hoàn lại Đức Tin khi nó chết: thả một con Thiên Ma tốn 75, hoàn 45. Người
    // xem chủ động thả boss vì thế KHÔNG bị phạt vĩnh viễn — chỉ mất 30 Đức Tin
    // ròng nếu thế giới giết được nó, và mất trọn 75 nếu nó sống mãi. Đó là cách
    // duy nhất để "thả boss" không phải một nút bấm chỉ ấn được một lần mỗi kỷ
    // nguyên rồi thôi.
    // 45 -> 60 ở 3.32: thả một con tốn 75, hoàn 60, nên nếu thế giới hạ được nó thì
    // Chúa Tể chỉ mất 15 Đức Tin ròng — năm phút hồi. Ở mức 45 cũ, một lần thả là
    // 30 ròng, tức là hai lần thả đã nuốt trọn một kỷ nguyên tiết kiệm; và vì phần
    // "phạt" của quyền năng này giáng lên kẻ DẪN ĐẦU chứ không lên người xem, cái
    // giá đó chỉ có tác dụng làm người xem thôi bấm nút.
    FAITH_REFUND: 60,
    // ============================================================
    // KHO BÁU — ba phần, và chỉ MỘT phần là tài nguyên
    // ============================================================
    // Bản 3.30 trả thưởng bằng đúng một thứ: một đống tài nguyên. Đo lại thì đó là
    // phần thưởng SAI LOẠI cho đúng bộ lạc nhận nó — kẻ ra đòn cuối vào một con
    // quái 9.000 máu gần như luôn là bộ lạc đang mạnh nhất khu vực đó, mà một bộ
    // lạc mạnh thì thứ nó thiếu không phải kho. 1.850 tài nguyên rơi vào một cái
    // kho đã đầy là một dòng nhật ký, không phải một biến cố.
    //
    // Ba phần, cố ý nằm trên ba trục khác nhau, để phần thưởng luôn CHẠM được vào
    // một thứ mà bộ lạc đó đang thiếu:
    //   · KHO — nhân đôi so với 3.30. Vẫn là phần dễ đọc nhất, và là phần duy nhất
    //     có ích cho một bộ lạc vừa cháy sạch sau trận đánh vừa rồi.
    //   · THÁNH VẬT CẤP III — món đồ mạnh nhất trong game (hệ số 5,2), thứ mà đường
    //     bình thường phải nung từ bốn món cấp 1. Nó về tay ANH HÙNG chứ không về
    //     kho, nên nó thưởng cho vòng tiến hoá thứ hai chứ không cho vòng thứ nhất.
    //   · MỘT CẤP NGHIÊN CỨU MIỄN PHÍ — xem grantBossSpoilUpgrade. Đây là phần duy
    //     nhất KHÔNG mất đi được: kho thì tiêu hết, thánh vật thì rơi theo người
    //     cầm, còn một cấp nâng cấp thì áp ngay cho cả đạo quân đang sống và ở lại
    //     tới hết kỷ nguyên.
    // Cấp Thánh vật KHÔNG có hằng số riêng ở đây: onMonsterDeath đọc thẳng
    // CONFIG.ITEM.MAX_LEVEL. Một con số thứ hai cùng nói "cấp cao nhất" sẽ đúng ở
    // lần viết rồi lệch ở lần đổi trần cấp tiếp theo, và cái lệch đó không báo lỗi.
    LOOT: { food: 1500, wood: 1100, stone: 900, gold: 650 },
    // Nhắm lại mục tiêu mỗi ngần này tick. Không nhắm mỗi tick: bộ lạc dẫn đầu
    // đổi chỗ liên tục ở khoảng giữa kỷ nguyên, và một con quái đổi hướng mỗi
    // tick là một con quái đi tại chỗ — đúng lỗi rung tại chỗ đã cắn ở hang ổ.
    RETARGET: 900,
    // ============================================================
    // THIÊN MA MẠNH DẦN THEO ĐỒNG HỒ KỶ NGUYÊN (Phase 3.33)
    // ============================================================
    // Cho tới bản này con quái có ĐÚNG một bộ chỉ số, bất kể thả ở tick 500 hay
    // tick 25.000. Hệ quả không phải "nó hơi dễ về cuối" — nó là: quyền năng đắt
    // nhất của Chúa Tể chỉ có MỘT thời điểm đúng để bấm, và thời điểm ấy là NGAY
    // KHI CÓ ĐỦ ĐỨC TIN. 9.000 máu là một tai hoạ ở Đồ Đá và là một con thú cảnh ở
    // Thiên Triều, khi kẻ dẫn đầu đã có 40 lính có giáp cấp 3 đứng sau tường men
    // ngọc. Một nút bấm mà câu trả lời tối ưu luôn giống nhau thì nó không phải một
    // quyết định — đúng cái bẫy "một lựa chọn không bao giờ thắng thì không phải
    // lựa chọn" đã ghi ở Phase 3.17, lần này ở chiều ngược lại.
    //
    // Hệ số tuyến tính theo tick, kẹp ở hai đầu. Tuyến tính chứ không phải một
    // đường cong đẹp: người xem phải NHẨM ĐƯỢC nó. "Đợi thêm một phần tư kỷ nguyên
    // thì con quái nặng thêm chừng một phần tư" là một câu tính nhẩm được; một hàm
    // mũ thì chỉ tính được bằng cách thử.
    //
    //   START 0,62 ở tick 0   -> 5.580 máu (đúng bằng bản 3.30, thời nó còn 5.200)
    //   1,00 ở tick ~8.400    -> 9.000 máu (đúng bảng TYPES, tức là bản 3.32)
    //   PEAK  1,75 ở tick 25.000 -> 15.750 máu, đòn 227
    //
    // PEAK_TICK 25.000 chứ không phải 30.000 (ERA.MAX_TICKS) là theo đúng yêu cầu,
    // và nó tình cờ đúng về thiết kế: 5.000 tick cuối kỷ nguyên là quãng mà mọi ván
    // đã ngã ngũ, nên một con quái chỉ đạt đỉnh ở phút chót là một con quái không
    // bao giờ ai gặp — lại đúng bài học "loài để dành ở hang cấp 3 là nội dung
    // không tồn tại" (Phase 3.22).
    //
    // KHO BÁU nhân theo CÙNG hệ số, và đó không phải để cho hào phóng: nếu phần
    // thưởng đứng yên trong khi rủi ro leo dốc thì đường tối ưu quay lại thành "thả
    // sớm nhất có thể", tức là cả cơ chế này chỉ đổi con số mà không đổi quyết định.
    // Đức Tin hoàn lại thì KHÔNG nhân — nó là giá của người xem, không phải phần
    // thưởng của bộ lạc, và một quyền năng tự trả tiền cho nó thì không còn giá.
    RAMP: { START: 0.62, PEAK: 1.75, PEAK_TICK: 25000 },
    // Bốn bậc TÊN, tra theo chính hệ số ở trên. Vì sao cần tên chứ không chỉ cần
    // con số: hệ số nằm trong nhật ký thì nó là một dòng thống kê, còn "THIÊN MA
    // (TẬN THẾ) giáng thế" là một câu kể. Đây cùng đúng lý do HERO_DYNASTIES tồn
    // tại — một chấm to hơn thì không ai nhớ, một cái tên thì có.
    // Ngưỡng là CẬN DƯỚI của bậc, đọc từ dưới lên.
    RANKS: [
      { at: 0,    name: 'Sơ Giáng' },
      { at: 0.95, name: 'Cuồng Nộ' },
      { at: 1.25, name: 'Huỷ Diệt' },
      { at: 1.55, name: 'Tận Thế'  }
    ]
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
const CONFIG = Object.assign({}, CONFIG_A, CONFIG_B, CONFIG_C, CONFIG_D, CONFIG_E);

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

