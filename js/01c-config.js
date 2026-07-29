'use strict';
// ============================================================
// 01c-config.js
// ------------------------------------------------------------
// CONFIG (phần 3/5) — chế độ Thủ thành (DEFEND), vật phẩm (ITEM), xây
// dựng (BUILD), tường thành (WALL). Xem 01a-config.js.
// ============================================================
const CONFIG_C = {

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
    // ================================================================
    // ĐỢT SAU DỒN SÁT ĐỢT TRƯỚC — sửa cái ĐUÔI, không sửa phần đầu
    // ================================================================
    // Sau khi đã dựng dốc cả lượng lẫn chất, đo lại vẫn còn một cái đuôi rất dài:
    // ba bộ lạc sụp ở đợt 5-10, rồi bộ lạc cuối trụ thêm 10-18 đợt nữa. Nghi vấn
    // đầu tiên của tôi là quái không tới được nơi. ĐO RA THÌ NGƯỢC LẠI — chụp lúc
    // đợt 21, còn một bộ lạc, 110 quái của sóng còn sống:
    //     ngoài vùng trường 0 · đứng im 100 tick 3 · ĐANG CÓ MỤC TIÊU 106
    //     cách công trình gần nhất trung bình 38 ô · tuổi trung bình 1.755 tick
    // Không con nào kẹt. Đó là một cuộc CHIẾN TRANH TIÊU HAO ngay trước cửa thành,
    // và bên thủ thắng nó vì mỗi đợt là một NHỊP RỜI: đánh xong đợt này còn dư
    // ~500 tick yên tĩnh để ra lính bù trước khi đợt sau tới.
    //
    // Nên thứ phải sửa không phải sức của một đợt mà là KHOẢNG LẶNG giữa hai đợt.
    // Rút dần nhịp thì tới đợt 27 các đợt bắt đầu CHỒNG LÊN NHAU — bên thủ không
    // còn cửa sổ nào để hồi phục, và cái đuôi tự đóng lại. Phần đầu ván gần như
    // không đổi (đợt 5 vẫn 745 tick, so với 820).
    INTERVAL_TIGHTEN: 15,   // mỗi đợt rút ngắn ngần này tick
    INTERVAL_MIN: 420,      // sàn: dưới nữa thì hai đợt thành một dòng chảy liên tục
    BASE_COUNT: 3,
    COUNT_GROWTH: 1.7,      // số quái mỗi đợt = BASE + floor(đợt × GROWTH)
    // 0,11 -> 0,17 và 0,08 -> 0,12. Đây là nửa QUAN TRỌNG HƠN của bản sửa độ khó,
    // và nó chỉ lộ ra sau khi đo tỉ số trao đổi của từng đợt (nghĩa là: một đợt
    // sóng ĐỔI ĐƯỢC GÌ, chứ không phải nó ĐÔNG BAO NHIÊU):
    //     đợt  1..8   quái sinh 4→53 · quái chết 100% · bên thủ mất 0 lính, 0 nhà
    //     quân bên thủ sau mỗi đợt:  4→8, 10→23, 28→36, 46→62, 64→76, 94→103
    //     cả 18 đợt: 655 quái chết, đổi lại 114 lính = 0,17 lính mỗi con quái
    // Bên thủ đi XUYÊN QUA mọi đợt đầu mà quân số vẫn TĂNG. Sóng lúc đó không phải
    // một mối đe doạ, nó là một nguồn kinh nghiệm miễn phí.
    //
    // Và nó giải thích vì sao chỉ nới số lượng thì không đủ: nếu mỗi con quái chết
    // gần như không lấy đi gì, thì gấp ba số quái vẫn chỉ là gấp ba số xác — tốn
    // CPU, không tốn quân. Gốc rễ là hai đường cong khác BẬC: sức bên thủ nhân lên
    // (đông hơn × đời cao hơn × nâng cấp × tháp × anh hùng × thầy lang) còn quái
    // chỉ CỘNG thêm 11% máu mỗi đợt.
    // Vẫn giữ tuyến tính (không đổi sang luỹ thừa) vì luỹ thừa biến đợt 30 thành
    // một con số vô nghĩa và xoá luôn phần giữa của ván; chỉ dựng dốc lên.
    HP_GROWTH: 0.17,
    ATK_GROWTH: 0.12,
    // ================================================================
    // ÁP LỰC ĐỌC THEO BÊN THỦ — vì sao leo thang tuyến tính không đủ
    // ================================================================
    // Đo 5 ván với luật cũ: 6.140 · 20.237 · 29.251 tick (hai ván sau chạm gần
    // trần 30.000 tick, tức là "không bao giờ thua"). Ở ván 29.251:
    //     quân đỉnh của bốn bộ lạc   469        dân đỉnh   1.157
    //     quái của sóng đỉnh          204        đợt cuối   35 (mỗi đợt 62 con)
    // Số của sóng leo TUYẾN TÍNH (1,7 con/đợt), số của bên thủ leo theo cấp số của
    // một nền kinh tế đang mở rộng — cộng thời đại, cộng nâng cấp, cộng đội hình.
    // Hai đường cong khác BẬC thì mọi hằng số chọn hôm nay đều sai vào một lúc nào
    // đó: chỉnh cao lên thì đợt 3 xoá sổ cả bốn bộ lạc, chỉnh thấp xuống thì đợt 30
    // là một buổi diễu hành.
    //
    // Nên thêm một SÀN đọc thẳng quân số của bộ lạc đang bị nhắm. Đây cũng là câu
    // trả lời cho việc tụ quân giờ đã dễ (đội hình, cờ tập kết, báo động triệu hồi):
    // gom cả đạo quân về một chỗ vẫn là nước đi đúng, nhưng cái giá của nó là đợt
    // sau sẽ đông đúng theo số quân vừa gom được.
    //
    // SÀN chứ không phải THAY THẾ (max, không phải nhân vào): nếu sóng co lại theo
    // bên thủ thì một bộ lạc đang chết dần sẽ gặp những đợt càng lúc càng nhẹ — một
    // vòng phản hồi ÂM giữ ván chơi đứng yên vĩnh viễn. Nền tuyến tính cũ vẫn chạy
    // bên dưới và vẫn là thứ cuối cùng kết liễu mọi ván.
    PRESSURE: {
      START: 0.25,          // đợt 1: mỗi 4 lính bên thủ đổi lấy 1 con quái
      PER_WAVE: 0.03,       // mỗi đợt cộng thêm ngần này
      MAX: 0.9              // trần: không bao giờ đông hơn 0,9 con/lính
    },
    // 260 -> 420. Đo được sóng đã chạm 204 con còn sống ở ván dài, tức là trần cũ
    // sắp thành một cái cổng thật sự — và một trần "chỉ để chống treo trình duyệt"
    // mà lại âm thầm chặn phần leo thang thì nó chính là lỗi đã bắt được ở chú
    // thích DỌN QUÁI LANG THANG bên dưới, lần thứ hai. Với sàn áp lực mới thì trần
    // cũ chắc chắn bị chạm, nên phải nới TRƯỚC chứ không đợi nó cắn.
    MAX_ALIVE: 420,
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
                blurb: 'Món duy nhất mạnh cả ba mặt cùng lúc — đánh, máu và hào quang. Cũng là món đáng tiếc nhất khi một anh hùng tử trận.' }
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
    // ================================================================
    // PHASE 3.24 — SỨC CHỨA THEO THỜI ĐẠI (`popByAge`)
    // ================================================================
    // Từ Phase 3.14, lên thời đại ĐỔI SILHOUETTE của công trình: mái hiên thành
    // lỗ châu mai thành hai tầng có tháp nhọn. Nhìn ra màn hình thì một cái nhà ở
    // Hoàng Kim là một toà nhà khác hẳn cái lều Đồ Đá. Nhưng con số bên dưới thì
    // vẫn là `pop: 5`, y nguyên, ở cả bốn thời đại.
    //
    // Đó là một lời nói dối bằng hình ảnh, và nó là loại tệ nhất: người xem đọc
    // được một sự thay đổi mà mô phỏng không hề có. Cho `pop` leo theo thời đại là
    // làm cho cái mắt đã tin trở thành sự thật.
    //
    // Hệ quả dây chuyền mới là lý do chính đáng, chứ không phải chuyện "khớp hình
    // với số": trần dân số là thứ chặn `wantSoldiers` (xem tribeBrain — quân mục
    // tiêu tính theo `s.pop`). Trần đứng yên nghĩa là một bộ lạc lên tới Hoàng Kim
    // đánh nhau bằng đúng số quân của lúc nó còn ở Đồ Đá, chỉ mạnh hơn từng người.
    // Trần leo theo thời đại biến "lên đời" thành một quyết định có mặt trên CHIẾN
    // TRƯỜNG — đạo quân đông lên thấy được, không chỉ là một hệ số nhân vô hình.
    //
    // Nhà ở 5 -> 17 (gấp 3,4) còn kinh đô 8 -> 20 (gấp 2,5): nhà ở leo dốc hơn vì
    // nó là thứ bộ lạc XÂY THÊM ĐƯỢC, nên nó phải là chỗ mà quyết định "dồn gỗ vào
    // đâu" còn có sức nặng. Kinh đô thì chỉ có một cái, cho nó leo mạnh là phát
    // không cho mọi bộ lạc như nhau.
    //
    // Chỉ số 0 không dùng (thời đại đánh số từ 1) — giữ chỗ để `popByAge[age]` là
    // một phép tra thẳng, không phải `age - 1`.
    town:     { hp: 1300, size: 3, cost: { wood: 250 }, buildTicks: 260, pop: 8,  popByAge: [0, 8, 11, 15, 20, 26], label: 'Nhà chính', range: 7, attack: 9, cooldown: 18 },
    house:    { hp: 200, size: 2, cost: { wood: 35  }, buildTicks: 70,  pop: 5,  popByAge: [0, 5, 8, 12, 17, 23], label: 'Nhà ở' },
    farm:     { hp: 150, size: 2, cost: { wood: 65  }, buildTicks: 90,  pop: 0,  label: 'Ruộng' },
    // ================================================================
    // KHO HÀNG — công trình đầu tiên có công dụng thuần HẬU CẦN
    // ================================================================
    // Cho tới bản này, dân gánh hàng về CÔNG TRÌNH GẦN NHẤT, bất kể loại
    // (hàm tìm kho không hề lọc). Nghĩa là mọi cái nhà ở, mọi cái ruộng
    // đều âm thầm là một cái kho — nên khoảng cách gánh hàng chưa bao giờ là một
    // bài toán, và cũng chưa bao giờ có quyết định nào để ra.
    //
    // Từ bản này chỉ KINH ĐÔ và KHO HÀNG nhận hàng (xem DEPOT_TYPES). Cộng với
    // luật mọi mỏ đều nằm ngoài vành 16 ô (xem MAP.CLEAR_R), quãng gánh mặc định
    // giờ là 22-35 ô mỗi chiều — và đó là một khoản thuế thật, trả bằng thời gian
    // của mỗi người dân, mỗi chuyến, suốt cả kỷ nguyên.
    //
    // Kho hàng là cách mua lại khoản thuế đó: 90 gỗ đặt đúng chỗ cắt quãng gánh từ
    // 30 ô xuống 3 ô. Vì sao điều này đáng có mặt trong một trò chơi mà người xem
    // không điều khiển gì: nó biến `expansion` — gen quyết định bộ lạc rải công
    // trình xa tới đâu — từ một con số về hình dáng thành phố thành một con số về
    // NĂNG SUẤT. Bộ lạc bành trướng rộng tự nhiên đặt được kho gần mỏ; bộ lạc co
    // cụm thì giữ được đội hình phòng thủ chặt nhưng trả giá bằng quãng đường. Một
    // gen đã có, thêm một biểu hiện nữa — đúng cái luật đã viết cho máy bắn đá,
    // kỵ binh và thầy lang: đừng thêm gen thứ mười sáu, hãy cho gen cũ thêm việc.
    //
    // Rẻ (90 gỗ) và nhanh (100 tick) là có chủ ý: nó phải dựng được TỪ SỚM, lúc bộ
    // lạc còn nghèo, vì đó chính là lúc quãng đường gánh hàng bóp nghẹt nhất. Máu
    // thấp và không có giáp — một cái kho tiền tuyến là một mục tiêu mềm, và đó là
    // phần rủi ro của việc đặt hậu cần ra xa nhà.
    depot:    { hp: 260, size: 2, cost: { wood: 90 }, buildTicks: 100, pop: 0, label: 'Kho hàng' },
    barracks: { hp: 500, size: 3, cost: { wood: 140 }, buildTicks: 150, pop: 0,  label: 'Trại lính' },
    // ================================================================
    // TƯỚNG PHỦ (Phase 3.28) — anh hùng dọn ra khỏi Trại lính
    // ================================================================
    // Cho tới bản này anh hùng ra lò từ TRẠI LÍNH, tức là từ đúng cái công trình
    // mà mọi bộ lạc muốn đánh nhau đều đã có. Nghĩa là "có nuôi anh hùng không"
    // chưa bao giờ là một quyết định: nó là một thứ tự động bật lên khi đủ tiền.
    // Mà anh hùng là cả TẦNG TIẾN HOÁ THỨ HAI của trò chơi này — cái vòng lặp
    // đáng theo dõi nhất mà lại là cái không ai phải chọn.
    //
    // Tách ra thành một toà nhà riêng thì nó trở thành một ngã ba thật: 110 gỗ +
    // 70 vàng là gần đúng một cái trại lính thứ hai (xem gen `garrison`), hoặc
    // ba suất kỵ sĩ. Bộ lạc `heroDrive` thấp sẽ đi hết kỷ nguyên không có tướng —
    // và đó là một ván chơi hợp lệ, không phải một lỗi.
    //
    // Mở khoá ngay từ Đồ Đá, KHÔNG khoá sau một cổng thời đại nào. Bài học "hai
    // cái cổng thì xác suất NHÂN chứ không cộng" đã phải trả giá ba lần trong dự
    // án này (đền thờ, chuồng ngựa, trạm xá), và ở đây nó còn nặng hơn: khoá muộn
    // một bậc là xoá luôn nửa đầu mọi kỷ nguyên khỏi vòng tiến hoá anh hùng.
    //
    // Máu 420 và không giáp là có chủ ý: phá được Tướng phủ là cắt đứt dòng dõi
    // của địch tới hết kỷ nguyên (một bộ lạc chỉ được một anh hùng sống, và hàng
    // đợi bị huỷ khi mất lò). Đó là mục tiêu chiến lược mềm nhất trong cả bảng.
    heroHall: { hp: 420, size: 2, cost: { wood: 110, gold: 70 }, buildTicks: 140, pop: 0, label: 'Tướng phủ' },
    // ================================================================
    // THÁP CANH — Phase 3.27 nâng cả ba trục, và lý do nằm ở VAI TRÒ MỚI của nó
    // ================================================================
    // Từ bản này tháp là ĐIỀU KIỆN LÊN ĐỜI (xem AGE.NEED_TOWERS), nghĩa là mọi bộ
    // lạc muốn qua Đồ Sắt đều buộc phải xây — kể cả bộ lạc gen `towerTarget` thấp.
    // Một công trình BẮT BUỘC mà yếu thì nó không phải một cơ chế, nó là một khoản
    // thuế: người chơi trả tiền rồi quên nó đi. Nên nếu bắt xây thì phải đáng xây.
    //
    // Số cũ (máu 420, đòn 11, tầm 8, hồi 14) cho 0,79 sát thương/tick — thua một
    // người lính đứng yên (7/8 = 0,875) trong khi giá bằng gần ba suất lính. Số mới
    // cho 16/11 = 1,45/tick, tức là một cái tháp đáng giá đúng khoảng hai người lính
    // đứng gác vĩnh viễn, không ăn lương, không bỏ chạy. Đó mới là lý do để xây.
    //
    // Tầm 8 -> 10 là con số quan trọng nhất trong ba: nó vượt tầm máy bắn đá của
    // ĐỐI PHƯƠNG ở mức xấp xỉ (catapult range 9), nên một cái tháp không còn bị
    // phá miễn phí từ ngoài tầm với. Trước đây đó là cách mọi cái tháp chết.
    //
    // THÊM 30 ĐÁ vào giá, và đây là cái vòi tiêu đá đầu tiên có mặt NGAY TỪ ĐỒ ĐÁ.
    // Đo được 99,4% đá trên bản đồ chưa ai đụng tới, mà `stoneUse` nhân chìm 0,3
    // suốt thời đại 1 vì "ở thời đại đó không công trình nào cần đá" — câu đó vừa
    // hết đúng. Giờ bộ lạc có lý do đập đá từ tick đầu, và gen `stoneWeight` bắt
    // đầu có hậu quả sớm hơn cả nghìn tick.
    //
    // ---- Phase 3.29: BỎ VÀNG KHỎI GIÁ, và tháp XÂY CHỒNG ĐƯỢC LÊN THÁP CŨ ----
    //
    // Vàng là tài nguyên duy nhất trong bảng vừa khan hiếm vừa bị BA cửa khác tranh
    // (giá lên đời, sáu nhánh nghiên cứu, và mọi loại quân đắt tiền). Đặt nó vào giá
    // một công trình BẮT BUỘC là dựng một cái cổng thứ hai ngay sau cái cổng đã có:
    // bộ lạc muốn qua Đồ Sắt phải có 4 tháp, mà mỗi tháp lại đòi đúng thứ nó cần để
    // trả tiền lên đời. Hai cái cổng thì xác suất NHÂN chứ không cộng — bài học đã
    // trả giá năm lần trong dự án này. Giờ tháp chỉ ăn GỖ và ĐÁ, hai thứ mà bất kỳ
    // bộ lạc nào cũng tự kiếm được quanh nhà, nên hạn ngạch lên đời quay về đúng
    // nghĩa của nó: một khoản đầu tư vào HÌNH DẠNG bản đồ, không phải một khoản
    // thuế vàng.
    //
    // Bù lại, đá tăng 30 -> 45. Đây không phải bù cho cân bằng mà là để giữ tháp
    // đúng vai "cái vòi tiêu đá đầu tiên có mặt ngay từ Đồ Đá" — bỏ vàng mà không
    // nâng đá thì tháp thành thứ rẻ nhất bảng và gen `stoneWeight` mất luôn hậu quả
    // sớm mà chính dòng này vừa tạo ra cho nó ở bản trước.
    //
    // ---- Phase 3.35: ĐÁ 45 → 23, vì HẠN NGẠCH vừa gấp đôi ----
    //
    // Đây là hệ quả bắt buộc của NEED_TOWERS ×2, không phải một đợt hạ giá riêng.
    // Tháp là VÒI TIÊU ĐÁ chính của cả trò chơi, mà đá cũng là thứ gác cửa lên đời —
    // hai cái cổng cùng rút một cái ví. Nhân đôi số tháp mà giữ nguyên đơn giá là
    // nhân đôi khoản thuế đá đúng ở quãng đường mà bộ lạc phải dành 520 đá cho bậc
    // Thiên Triều.
    //
    // ĐO ĐƯỢC: với đơn giá cũ, trong 373 mẫu "một bộ lạc đã qua mọi cửa cứng và chỉ
    // còn chờ đủ tiền để lên đời", ĐÁ chặn 373 mẫu — một trăm phần trăm, trong khi
    // vàng và gỗ chặn 0. Bậc Thiên Triều gần như biến mất khỏi kỷ nguyên (không bộ
    // lạc nào tới nơi trong 28.000 tick), và vì Kỳ quan khoá sau bậc đó (Phase 3.34)
    // nên cả đường thắng bằng công trình chết theo, và kỷ nguyên chạm trần "hết giờ"
    // — đúng cái thế bí mà Kỳ quan sinh ra để phá.
    //
    // 23 giữ TỔNG lượng đá cho cả hạn ngạch gần như không đổi (7×45 = 315 → 14×23 =
    // 322), nên yêu cầu "gấp đôi số tháp" được thi hành đầy đủ trên BẢN ĐỒ — thứ
    // người xem nhìn thấy — mà không lặng lẽ nhân đôi một khoản thuế mà yêu cầu đó
    // không nói tới. GỖ giữ nguyên 85, tức là tổng gỗ CÓ gấp đôi thật: gỗ đo được
    // chặn 0/373 và bản đồ còn 425.000 đơn vị, nên nó gánh được sức nặng mới.
    //
    // ---- Vòng 2: HAI SỐ DƯỚI ĐÂY LÀ GIÁ Ở BẬC CAO NHẤT, không phải giá cố định ----
    //
    // Giá thật nhân với `AGE.TOWER_ATK` — CHÍNH mảng đang hạ sức đánh (xem
    // `towerAgeMult`). Nghĩa là 85 gỗ + 23 đá là giá của một cái tháp Thiên Triều
    // đánh đủ 100%; ở Đồ Đá nó chỉ tốn 51 gỗ + 14 đá và cũng chỉ đánh 60%.
    //
    // Vì sao đáng làm thay vì để giá phẳng: một công trình BẮT BUỘC mà vừa yếu vừa
    // đắt là một khoản thuế thuần — người chơi trả rồi quên nó đi, đúng cái mà cả
    // khối chú thích ở trên vừa cảnh báo. Buộc giá vào chính đường cong sức mạnh thì
    // hạn ngạch 4 cái đầu tiên (ở Đồ Đá/Đồ Đồng, lúc kho còn cạn nhất) rẻ đi 30-40%,
    // còn 6 cái cuối — dựng ở Hoàng Kim, lúc bộ lạc đã giàu — trả đủ giá.
    // Đường cong chi tiêu đi đúng đường cong khả năng chi trả, thay vì ngược lại.
    tower:    { hp: 640, size: 2, cost: { wood: 85, stone: 23 }, buildTicks: 130, pop: 0, label: 'Tháp canh', range: 10, attack: 16, cooldown: 11 },
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
    // TRẠI TIẾP TẾ — công trình đầu tiên trong game KHÔNG do dân xây và có HẠN DÙNG.
    //
    // `buildTicks: 0` + luôn dựng `instant`: nó không đi qua queueBuild, không có
    // móng, không cần thợ. Đội hậu cần cắm nó xuống trong một tick, giữa đất địch,
    // ở đúng chỗ đạo quân đang đứng — mà đó chính là chỗ mà đường ống xây dựng bình
    // thường (tìm chỗ trống quanh kinh đô, điều thợ tới) không bao giờ với tới.
    //
    // Máu 130, không giáp: mềm nhất bảng. Cố ý — nó là mục tiêu ĐÁNG PHÁ nhất của
    // bên phòng thủ, và trận đánh có thêm một chỗ để diễn ra ngoài chân tường thành.
    // `pop: 0` vì nó không phải chỗ ở, và cho nó sức chứa thì trần dân số của một bộ
    // lạc sẽ NHẤP NHÁY theo tuổi thọ của mấy cái lều — một con số quan trọng như thế
    // mà dao động vì lý do không ai đọc ra được là cách chắc chắn để mọi quyết định
    // tuyển quân phía sau nó trở nên khó hiểu.
    // GIÁ NẰM Ở ĐÂY, cùng chỗ với giá của mười ba công trình kia, và plantCamp đọc
    // thẳng `CONFIG.BUILD.camp.cost`. Bản nháp để giá trong SUPPLY.CAMP.COST cho
    // "gần chỗ luật" — nhưng thế là hai bảng giá cùng nói một sự thật, và Thư khố
    // thì in bảng này. Hai nguồn sự thật về giá đã cắn một lần ở `trainCost` (bộ não
    // xếp hàng những suất nó không trả nổi).
    camp:     { hp: 130, size: 2, cost: { food: 55, wood: 20 }, buildTicks: 0, pop: 0, label: 'Trại tiếp tế' },
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
    // ---- Phase 3.35: GIÁ GẤP ĐÔI, THỜI GIAN GẤP BA ----
    //
    // Đo 4 kỷ nguyên: từ lúc đặt móng tới lúc khánh thành là 110 / 122 / 125 tick.
    // Ở nhịp 12 tick/giây đó là MƯỜI GIÂY. Cả cơ chế "kẻ dẫn đầu buộc phải phơi
    // mình ra" viết ngay bên trên chưa từng xảy ra một lần nào: toà nhà mọc lên và
    // xong trước khi đạo quân gần nhất kịp đi hết nửa quãng đường tới đó.
    //
    // Thủ phạm không phải buildTicks mà là WONDER_BUILDERS = 8 (820 / 8 ≈ 103).
    // Vẫn giữ 8 thợ — hạ số thợ thì công trường lại đứng im như bản trước Phase 3.16
    // — và kéo dài chính cái đồng hồ: 2460 / 8 / 0,6 ≈ 512 tick. Cộng thêm việc từ
    // bản này MÓNG ĐÃ ĐỦ để cả bàn cờ tuyên chiến (xem updateWonderRace), 512 tick
    // là một cửa sổ thật để ba bộ lạc kia kéo tới.
    //
    // Giá gấp đôi là vế thứ hai, và nó nhắm vào thứ khác: 430 gỗ + 470 đá + 270 vàng
    // là khoản mà một bộ lạc đang dẫn đầu gom được gần như không cần hy sinh gì. Gấp
    // đôi thì nó phải NGỪNG tuyển quân một quãng để dồn kho — nghĩa là lúc cả bàn cờ
    // kéo tới cũng đúng là lúc nó yếu nhất. Đó mới là cái giá của một đường thắng.
    //
    // GIỮ ĐÚNG ×2 TRÊN CẢ BA DÒNG — sau khi một bản thử dời sức nặng sang đá/gỗ bị
    // chính phép đo bác bỏ. Bản thử đó dựa vào MỘT ảnh chụp kho của MỘT bộ lạc (đá
    // 3.290 · gỗ 2.235 · vàng 4) và kết luận vàng là thứ gác cửa. Đếm lại trên 373
    // mẫu "đã đủ điều kiện cứng, chỉ còn chờ tiền" thì ra ngược hẳn:
    //     ĐÁ chặn 373/373 (100%)   ·   lương 200/373   ·   vàng 0   ·   gỗ 0
    // Một ảnh chụp một bộ lạc ở một khoảnh khắc không phải một phép đo. Cái kho vàng
    // cạn kia là của một bộ lạc vừa dốc sạch vào quân đội trong một trận đánh, không
    // phải trạng thái chung. Đá mới là cổ hẹp — và dồn thêm 530 đá vào Kỳ quan là
    // xiết đúng cái cổ đang nghẹn.
    wonder:   { hp: 2600, size: 5, cost: { wood: 860, stone: 940, gold: 540 }, buildTicks: 2460, pop: 0, label: 'Kỳ quan' },
    // ================================================================
    // TỐC ĐỘ XÂY — hạ 1 → 0,6 (Phase 3.35)
    // ================================================================
    // Một căn nhà ở 70 tick chia cho 3 thợ là 23 tick — chưa tới hai giây thật. Ở
    // nhịp đó, quyết định xây dựng không có ĐỘ TRỄ, mà không có độ trễ thì nó cũng
    // không có rủi ro: bộ lạc không bao giờ phải trả lời câu "có kịp xong trước khi
    // địch tới không". Hạ xuống 0,6 làm mọi công trình mất thêm 2/3 thời gian, và
    // cái nó mua là cửa sổ tổn thương — công trường trở thành một thứ đứng trên bản
    // đồ đủ lâu để bị nhìn thấy, bị đánh, và bị bỏ dở.
    BUILD_RATE: 0.6,     // tiến độ/tick cho mỗi dân thường đang xây
    MAX_BUILDERS: 3,
    WONDER_BUILDERS: 8,  // Kỳ quan được huy động nhiều thợ hơn hẳn — nếu không, 2460 tick chia cho 3 thợ là quá dài để kịp xảy ra bất cứ chuyện gì
    // ================================================================
    // MÓNG PHẢI CÓ NGƯỜI — Phase 3.35
    // ================================================================
    // Trước bản này queueBuild trả tiền và đặt móng NGAY, rồi mới đi tìm thợ; tìm
    // không ra cũng không sao, móng vẫn nằm đó. Đo 42.000 tick: 21% thời gian-móng
    // là công trường KHÔNG CÓ MỘT NGƯỜI THỢ NÀO. Vì `bcount` đếm cả móng dở nên bộ
    // não tin là mình đã có công trình đó — tức là một khoản tài nguyên bốc hơi và
    // một quyết định xây dựng bị nuốt mất, cả hai đều im lặng.
    //
    // Hai cánh cửa, cố ý tách đôi vì chúng chặn hai chuyện khác nhau:
    //   · KHÔNG CÓ THỢ RẢNH thì không đặt móng, không trả tiền (queueBuild).
    //   · Đã đặt móng mà ABANDON_TICKS trôi qua vẫn 0% và không ai đứng đó thì DỠ
    //     MÓNG, HOÀN TIỀN. Đây là vế mà cơ chế cứu công trường (rescueOrphanSites)
    //     không làm được: nó cứu tối đa 5 lượt rồi bỏ mặc, và cái móng nằm lại vĩnh
    //     viễn khoá đúng một suất trong bcount.
    // Hoàn ĐỦ chứ không hoàn một phần: chưa có một tick lao động nào đổ vào đó, nên
    // trừ tiền là phạt bộ lạc vì một chỗ đặt móng mà chính bộ não đã chọn sai.
    ABANDON_TICKS: 420,

    // ================================================================
    // XÂY CHỒNG THÁP CANH (Phase 3.29) — cái tháp thứ hai đặt LÊN cái thứ nhất
    // ================================================================
    // Bảng công trình cho tới nay chỉ biết một động từ: THÊM MỘT CÁI NỮA. Muốn thủ
    // chắc hơn thì xây thêm tháp, muốn ra quân nhanh hơn thì xây thêm trại. Hệ quả
    // là mọi bộ lạc phòng thủ đều tiến hoá về cùng một hình dạng — một vành đai
    // tháp mỏng rải đều — bởi vì đó là hình dạng DUY NHẤT mà luật xây dựng cho phép.
    // Không có cách nào để nói "chỗ này quan trọng hơn chỗ kia".
    //
    // Xây chồng là động từ thứ hai: CÙNG CHỖ, MẠNH GẤP RƯỠI. Ba chỉ số cùng nhân
    // 1,5 mỗi cấp (máu · tầm bắn · sức đánh) nên một cái tháp cấp 3 mạnh 2,25 lần
    // và nhìn từ ngoài là một cái tháp CAO GẤP ĐÔI — thứ đọc được ngay ở mức zoom
    // xa nhất, đúng bài học "màu cần mẫu đối chứng, kích thước thì không" đã đo ở
    // Phase 3.14 và dùng lại cho nhánh Công thành.
    //
    // Vì sao NHÂN cả tầm bắn, chứ chỉ nhân máu và sát thương cho an toàn: tầm bắn
    // là con số duy nhất trong ba cái đổi được CỤC DIỆN chứ không chỉ đổi tốc độ
    // ăn thua. Tháp cấp 1 tầm 10 vừa đủ vượt máy bắn đá địch (tầm 9) — tức là hoà.
    // Cấp 2 tầm 15 thì cỗ máy phải vào tầm tháp trước khi tới được tầm của mình, và
    // đó là lần đầu tiên trong game một công trình phòng thủ THẮNG được vũ khí công
    // thành thay vì chỉ sống lâu hơn một chút.
    //
    // Giá leo 1,7^lv — dốc hơn hệ số sức mạnh 1,5, nên xây chồng luôn LỖ nếu tính
    // bằng tổng sức mạnh trên mỗi đồng. Cái nó mua là sự TẬP TRUNG: ba cái tháp rời
    // giữ được ba chỗ, một cái tháp cấp 3 giữ chết một chỗ. Bộ lạc chọn cái nào là
    // một câu hỏi về địa hình, không phải về số học — và đó chính là thứ mà một
    // động từ mới phải tạo ra để đáng được thêm vào.
    //
    // TRẦN 3 chứ không phải vô hạn: qua đó thì tầm bắn (10 → 15 → 22,5 → 33,75)
    // vượt cả tầm nhìn của người xem ở mức zoom thường, và một công trình bắn được
    // thứ không nhìn thấy trên màn hình thì với người xem nó không có mặt ở đó.
    TOWER_STACK: {
      MAX: 3,
      MULT: 1.5,        // nhân vào máu · tầm · sức đánh cho MỖI cấp trên 1
      COST_STEP: 1.7,   // nhân vào giá gốc cho mỗi cấp — dốc hơn MULT là có chủ ý
      TICK_STEP: 1.35   // xây chồng lâu hơn xây mới: tháp NGỪNG BẮN suốt thời gian đó
    }
  },

  // ============================================================
  // TƯỜNG THÀNH (Phase 3.29) — loại công trình đầu tiên KHÔNG ai xây
  // ============================================================
  // Mọi thứ trong bảng BUILD ở trên đều đi qua cùng một vòng đời: bộ não quyết
  // định, trả tài nguyên, đặt móng, dân tới xây. Tường thành không đi qua vòng đời
  // nào cả — nó TỰ MỌC quanh kinh đô, tự rộng ra theo thời đại, và tự lành lại.
  // Đó là chủ ý, và lý do nằm ở chỗ nó phải luôn có mặt: một bức tường mà bộ lạc
  // "quên xây" thì cơ chế công thành mà nó tạo ra chỉ tồn tại ở những ván may mắn,
  // đúng cái đã đo được ba lần với đền thờ, chuồng ngựa và trạm xá.
  //
  // NÓ LÀ VẬT CẢN CÓ PHE — thứ chưa từng có trong mô phỏng này. Cho tới bản này,
  // `blockedGrid` chỉ biết một câu hỏi: ô này đi qua được không. Câu trả lời giống
  // hệt nhau cho cả bốn bộ lạc và cho quái. Tường thì trả lời khác nhau tuỳ ai
  // hỏi — quân nhà và đồng minh đi xuyên qua, quân địch và quái đứng lại. Nhờ vậy
  // nó tạo ra được thứ mà một dải rừng không tạo ra nổi: một BÊN TRONG và một BÊN
  // NGOÀI.
  //
  // Và vì mỗi ô tường là một mục tiêu riêng có máu riêng, "phá thành" không phải
  // một trạng thái mà là một CHỖ: đạo quân dồn vào một ô, đục thủng nó, rồi cả
  // dòng người tràn qua đúng cái lỗ đó. Người xem đọc ra được mũi tiến công trên
  // bản đồ mà không cần một dòng chữ nào — đúng thước đo đã dùng cho lằn ranh lãnh
  // thổ và cho dòng thương binh lê về hậu phương.
  WALL: {
    // Thời đại nào bắt đầu có tường. TỪ ĐỜI 1 — đổi ở Phase 3.30 theo yêu cầu, và
    // đây là một đánh đổi có ý thức chứ không phải một con số nới ra cho tiện.
    // Bản trước để MIN_AGE 2 vì 2.000 tick đầu của mỗi kỷ nguyên là giai đoạn mà
    // KINH TẾ và VỊ TRÍ quyết định tất cả: bốn cụm nhà trần trụi trên bản đồ mở,
    // và cửa sổ "đánh úp khi địch còn hở" nằm đúng ở đó. Cho tường từ tick đầu
    // đóng cửa sổ ấy lại — mọi cuộc đụng độ sớm đều là công thành.
    //
    // Cái được đổi lại: bức tường không còn là một thứ XUẤT HIỆN giữa chừng mà là
    // một thứ LỚN LÊN. Năm bậc hình (rào gỗ → đất nện → đá → gạch mạ → men ngọc)
    // chỉ đọc ra được thành một cuộc tiến hoá nếu người xem nhìn thấy bậc đầu
    // tiên; bắt đầu ở bậc 2 thì "rào gỗ" là nội dung không tồn tại — đúng bài học
    // của loài quái để dành ở hang cấp 3 (Phase 3.22).
    MIN_AGE: 1,
    // Bán kính (Chebyshev) của vành tường, tra thẳng theo thời đại. Rộng ra mỗi
    // đời chính là "nâng cấp mở khoá dần" — và nó rộng ra bằng cách DỰNG LẠI cả
    // vành ở bán kính mới, không phải đắp thêm ra ngoài vành cũ. Giữ vành cũ thì
    // sau bốn đời bộ lạc có bốn lớp tường đồng tâm, và một đạo quân phải đục bốn
    // lần để vào tới nhà — không phải một thành trì, mà là một mê cung.
    //
    // GẤP ĐÔI so với bản trước (11/14/17/20 → 22/28/34/40). Bản cũ chọn theo quy
    // hoạch thật: findBuildSpot rải nhà trong bán kính `expansion` (kẹp 10..60,
    // trung vị khởi tạo ~22), nên vành 11 ô chỉ ôm được lõi làng. Ở bán kính gấp
    // đôi, vành Đồ Đá 18 ô đã ôm gần trọn một bộ lạc co cụm và vành Thiên Triều
    // 40 ô ôm cả vùng mỏ quanh đô. Hệ quả đáng chú ý nhất KHÔNG phải phòng thủ mà
    // là KINH TẾ: mỏ nằm trong vành là mỏ mà thợ địch không tới được, nên bức
    // tường lần đầu tiên tranh chấp TÀI NGUYÊN chứ không chỉ tranh chấp lối vào.
    RADIUS: [0, 18, 22, 28, 34, 40],
    // Máu MỘT Ô tường. Không ai phải phá cả bức tường; con số đáng cân là "một cỗ
    // máy bắn đá đục thủng một ô mất bao lâu", và với bộ binh (đập tường 20% sức)
    // thì mọi con số đều quy về một chữ: KHÔNG BAO GIỜ. Đó chính là điều đáng có —
    // tường thành là lý do thứ hai để tồn tại một Xưởng thợ, sau Kỳ quan.
    //
    // ĐƯỜNG CONG ĐỔI Ở PHASE 3.39 (theo yêu cầu: 900 ở đời đầu, 3.600 ở đời cuối).
    // Cái được sửa KHÔNG phải độ dày, mà là KHOẢNG CÁCH GIỮA HAI ĐỜI LIỀN NHAU:
    //
    //          đời 1   đời 2   đời 3   đời 4   đời 5    trải rộng   bước lớn nhất
    //   cũ       450     780    1260    1920    2700       6,00×      ×1,73
    //   mới      900    1275    1800    2550    3600       4,00×      ×1,42
    //
    // Bảng cũ có bước đầu ×1,73 rồi thuôn dần xuống ×1,41, nghĩa là cú nhảy đau
    // nhất rơi đúng vào lúc chênh lệch còn dễ quyết định ván đấu: một bộ lạc vừa
    // lên Đồ Đồng có tường dày gấp 1,73 lần hàng xóm còn ở Đồ Đá, mà ở giai đoạn
    // ấy chưa ai có đủ cỗ máy để bù. Bảng mới lấy TỈ LỆ HẰNG √2 cho cả bốn bước
    // (1,42 · 1,41 · 1,42 · 1,41) — chênh lệch giữa hai đời liền nhau nay ở đâu
    // cũng như nhau, và không chỗ nào đau bằng chỗ đau nhất của bảng cũ.
    //
    // Giá phải trả, nói thẳng: đây KHÔNG phải một phép đổi trung tính. Nâng sàn từ
    // 450 lên 900 là nhân đôi tường đời đầu, và trần 2.700 → 3.600 là +33%. Thứ
    // duy nhất rẻ đi là VIỆC ĐI SAU MỘT ĐỜI.
    //
    // NHƯNG "gấp đôi tường đời đầu" hoá ra gần như không ai cảm thấy, và đó là chỗ
    // phép đo bác một suy luận nghe rất hợp lý. Đo sát thương THẬT lên tường trong
    // ván đang chạy (effAttack × hệ số phá nhà, chia cho nhịp đánh):
    //     bộ binh Đồ Đồng   1,82/đòn  ->  5.604 tick cho MỘT ô  (cũ 3.429)
    //     bộ binh Thiên Triều 7,56    ->  3.808 tick             (cũ 2.856)
    //     máy bắn đá Thiên Triều 550  ->    301 tick             (cũ 226)
    // Bộ binh không phá nổi tường ở CẢ HAI bảng — 3.429 hay 5.604 thì đều dài hơn
    // một kỷ nguyên, nên nhân đôi một con số vốn đã là "không bao giờ" chẳng đổi
    // được lựa chọn nào. Mà máy bắn đá thì mở khoá ở ĐỜI 3 (UNLOCK_UNIT), tức là
    // ở đời 1–2 KHÔNG AI phá được tường bằng bất cứ giá nào. Sàn 900 vì thế là một
    // con số gần như chỉ tồn tại trên bảng.
    //
    // Chỗ nó thật sự đổi là QUÁI: đo 60 con đang sống, 8,4 sát thương mỗi đòn lên
    // tường -> một ô tường đời 1 nay cầm chân chúng 857 tick thay vì 429. Nghĩa là
    // thay đổi này rơi gần trọn vào thế cuộc THỦ THÀNH, nơi điểm số đo bằng số tick
    // trụ được. Vòng này KHÔNG chỉnh lại độ khó của thủ thành cho khớp — ghi ra đây
    // để lần sau ai thấy thủ thành dễ đi thì biết chỗ mà nhìn.
    //
    // ĐÃ ĐO, Phase 3.42 — và câu trả lời là KHÔNG. Sau khi Phase 3.41 cho nhánh Nề
    // đá cộng máu cho tường (tức là đúng cái làm "tường dày hơn" mà đoạn trên lo),
    // chạy A/B GHÉP CẶP 10 hạt giống, mỗi hạt giống qua cả hai nhánh từ cùng một bản
    // đồ, bật/tắt bằng đúng một hệ số trong `wallHpFor`:
    //     có Nề đá trên tường : trung bình 15.687 tick, trung vị 18.108
    //     không                : trung bình 15.846 tick, trung vị 18.803
    //     chênh lệch trung bình -159 tick (-1,0%), nhánh "có" thắng 3/10 hạt giống
    // Tường dày hơn KHÔNG làm thủ thành dễ đi — nếu có thì hơi ngược lại. Con số đáng
    // nhớ hơn cả kết luận: biên độ giữa các hạt giống trong CÙNG một nhánh là 15.987
    // tick, tức gấp một trăm lần hiệu ứng. Ba ván lẻ không ghép cặp (đúng thứ đã suýt
    // được báo cáo là "thủ thành dễ hẳn đi") không phân biệt nổi hai bảng này.
    HP: [0, 900, 1275, 1800, 2550, 3600],
    // CỔNG THÀNH — ba ô ở CHÍNH GIỮA mỗi cạnh, máu mỏng hơn hẳn.
    //
    // Vì sao một điểm yếu cố ý lại làm bức tường TỐT HƠN: không có cổng thì mọi ô
    // tường giống hệt nhau, nên chỗ bị đục là chỗ đạo quân tình cờ đi tới — một
    // thông tin không nói lên điều gì. Có cổng thì bản đồ có bốn CHỖ mà cả người
    // xem lẫn kẻ tấn công đều biết là chỗ nên đánh, và "trận đánh ở cổng Nam" là
    // một câu kể được. Đây cùng một luật với `hitTick` của tháp canh: giá trị nằm
    // ở chỗ nó biến một mặt phẳng đều thành một địa hình có chỗ.
    // 3 -> 5 ở Phase 3.33, và cái được mua KHÔNG phải "cổng rộng hơn" mà là một
    // CÔNG TRÌNH. Ở span 3 cái cổng có đúng một ô cánh cửa kẹp giữa hai ô sáng màu;
    // ở mọi mức thu phóng chơi thật nó đọc ra là "một chỗ tường hơi khác màu". Ở
    // span 5 nó có ba ô CÁNH CỬA ở giữa và hai ô LẦU CỔNG hai bên — tức là một
    // đường bao riêng (thấp · CAO · thấp · CAO · thấp), và đường bao mới là thứ mắt
    // đọc được từ xa. Cùng bài học đã trả giá ở Phase 3.14: màu chỉ đọc được khi có
    // mẫu đứng cạnh để so, hình bóng thì đọc được ngay.
    //
    // Vẫn LẺ, vì cần đúng một ô chính giữa để đặt trục đối xứng của vòm cửa.
    GATE_SPAN: 5,        // số ô mỗi cổng chiếm: 3 ô cánh cửa + 2 ô lầu cổng
    GATE_DOOR_SPAN: 3,   // trong số đó, mấy ô là CÁNH CỬA (phần mỏng máu). Cũng lẻ.
    // Máu CÁNH CỬA = 55% máu một ô tường thường cùng đời. Hai ô LẦU CỔNG thì KHÔNG
    // mỏng — chúng nhận máu tường đầy đủ.
    //
    // Nghĩa là span nới từ 3 lên 5 mà điểm yếu vẫn rộng đúng 3 ô như cũ: bản này
    // không làm bức tường dễ vỡ hơn, nó chỉ làm chỗ vỡ ĐỌC ĐƯỢC hơn. Nếu cho cả 5
    // ô cùng mỏng thì một thay đổi được yêu cầu vì lý do THẨM MỸ sẽ lặng lẽ nới
    // điểm yếu của mọi thành trì trong game thêm hai phần ba — đúng cái hình dạng
    // "một thay đổi hình ảnh hoá ra là một thay đổi luật chơi" đã cắn ba lần ở
    // Phase 3.8.
    GATE_HP: 0.55,
    // TỰ SỬA — đổi hẳn luật ở Phase 3.30: giờ nó ĂN ĐÁ.
    //
    // Bản trước sửa miễn phí, và chú thích cũ bảo vệ điều đó bằng lập luận "một
    // khoản chi KHÔNG AI QUYẾT ĐỊNH mà vẫn rút ví là một cái thuế ẩn". Lập luận
    // ấy vẫn đúng về hình thức, nhưng nó bỏ qua chuyện đá vừa trở thành tài
    // nguyên HỮU HẠN (Phase 3.25) và bức tường vừa to gấp đôi: một bức tường tự
    // lành miễn phí trên một bản đồ mà mọi thứ khác đều phải trả tiền là thứ duy
    // nhất trong game không có giá.
    //
    // Cách trả cho nó KHÔNG thành thuế ẩn: có một MỨC SÀN. Dưới REGEN_RESERVE đá
    // thì tường vẫn tự lành, chỉ chậm còn một phần tư — nghĩa là bộ lạc không bao
    // giờ bị bức tường ăn mất viên đá cuối cùng lẽ ra thành tháp canh hay Kỳ quan.
    // Thiếu cái sàn này thì cơ chế mới sẽ lặng lẽ khoá cơ chế cũ, đúng họ lỗi đã
    // cắn ở hạng mục no đủ của đá (Phase 3.27).
    REGEN_FRAC: 0.001,     // 0,1% máu tối đa mỗi tick khi đứng yên
    REGEN_STONE: 1,        // 1 đá cho MỖI Ô tường được vá trong tick đó
    REGEN_POOR: 0.25,      // hết đá (hoặc dưới sàn) thì chỉ còn 1/4 tốc độ
    REGEN_RESERVE: 120,    // sàn đá: dưới mức này thì vá chậm, không rút thêm nữa
    // Vừa ăn đòn thì KHÔNG vá. Thiếu độ trễ này thì mỗi ô tường có thêm một dòng
    // hồi máu ngay giữa lúc bị đánh, và cả phép tính "đục thủng mất bao lâu" ở trên
    // sai đi theo hướng khó đoán nhất — hai cỗ máy bắn đá thì thủng, một cỗ thì
    // không bao giờ, mà không có con số nào trên màn hình nói ra ngưỡng đó.
    REGEN_DELAY: 260,
    // ĐỤC THỦNG RỒI THÌ LỖ ĐÓ MỞ BAO LÂU. Đây là con số biến "phá thành" từ một
    // sự kiện thành một CỬA SỔ THỜI GIAN: phá được một ô là mở ra 900 tick để đổ
    // quân qua, sau đó lỗ tự bịt lại ở 30% máu và kẻ nào còn kẹt bên trong thì kẹt
    // luôn. Bên thủ vì thế có một nước đi thật — dồn quân bịt lỗ và cầm cự cho tới
    // khi tường tự lành — thay vì chỉ đứng nhìn.
    RUBBLE: 900,
    REBUILD_HP: 0.3,   // ô tường mọc lại ở mức máu này
    // MỖI KINH ĐÔ MỘT VÀNH, không phải một vành cho cả bộ lạc. Một bộ lạc có thể
    // có tới 3 kinh đô (xem COLONY), và một cái đô tiền tuyến vừa lập trên đất vừa
    // chiếm là thứ CẦN tường nhất trong cả bản đồ — nó nằm giữa lãnh thổ vừa mất
    // chủ, xa quân nhà. Cho nó một vành tường là cách duy nhất để "lập đô trên đất
    // chiếm" không chỉ là một dòng nhật ký rồi bị đạp phẳng ở nhịp phản công đầu.
    //
    // Trần cứng số ô tường của MỘT bộ lạc: vành bán kính 40 có 320 ô, ba vành là
    // 960. 1.100 chừa biên và vẫn chặn được trường hợp bệnh lý. Đây là một cái
    // phanh an toàn, không phải một luật chơi — nếu nó chạm thì có gì đó đã sai ở
    // chỗ khác.
    MAX_CELLS: 1100,
    // NĂM BẬC HÌNH, một bậc mỗi thời đại. Đây là "nâng cấp" của tường thành, và nó
    // KHÔNG đi qua bảng nghiên cứu — xem chú thích của nhánh Nề đá để biết vì sao
    // hai thứ đó phải tách ra. Mỗi bậc đổi cả VẬT LIỆU lẫn ĐƯỜNG BAO, không chỉ
    // đổi màu: cùng bài học đã rút ra ở Phase 3.14 với silhouette công trình —
    // màu chỉ đọc được khi có mẫu đứng cạnh để so, mà cả bức tường lên bậc một
    // lượt nên không bao giờ có mẫu để so.
    //   h    — chiều cao thân, tính theo cạnh ô
    //   face — mặt tường, top — mặt trên (nguồn sáng từ trên xuống)
    //   cap  — kiểu đỉnh: 'stake' cọc nhọn · 'flat' bằng · 'merlon' răng cưa
    //          'slit' răng cưa + lỗ châu mai · 'tile' mái ngói úp
    TIERS: [
      null,
      { name: 'Rào gỗ',       h: 0.46, face: '#7a5c3a', top: '#a2794a', cap: 'stake'  },
      { name: 'Tường đất',    h: 0.56, face: '#8a7757', top: '#a89578', cap: 'flat'   },
      { name: 'Tường đá',     h: 0.66, face: '#8d8375', top: '#c3b9a4', cap: 'merlon' },
      { name: 'Thành gạch',   h: 0.74, face: '#94836b', top: '#d8c79c', cap: 'slit'   },
      { name: 'Thành men ngọc', h: 0.82, face: '#7d8b83', top: '#bcd6c6', cap: 'tile' }
    ]
  },
};
