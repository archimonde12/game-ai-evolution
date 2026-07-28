'use strict';
// ============================================================
// 04-genes.js
// ------------------------------------------------------------
// HAI vòng tiến hoá lồng nhau: POLICY_SPEC = gen chiến lược của BỘ LẠC (chọn
// lọc cuối mỗi kỷ nguyên) và HERO_GENE_SPEC = gen CÁ NHÂN của anh hùng.
// Tách cơ học từ civilization.html một-file, dòng 2611–2824.
// Script CỔ ĐIỂN (không phải ES module): mọi khai báo top-level nằm chung
// một global scope như khi còn một file — nên không cần import/export. Đổi
// lại, THỨ TỰ thẻ <script> trong civilization.html là bắt buộc.
// ============================================================
// ============================================================
// Gen chiến lược của bộ lạc (thứ DUY NHẤT tiến hoá qua các kỷ nguyên)
// ============================================================
const POLICY_SPEC = {
  foodWeight:    { range: [0.5, 2.5], bounds: [0.1, 4] },   // ưu tiên dồn dân vào lương thực
  woodWeight:    { range: [0.5, 2.0], bounds: [0.1, 4] },   // ...vào gỗ
  goldWeight:    { range: [0.2, 1.2], bounds: [0.05, 4] },  // ...vào vàng
  militaryRatio: { range: [0.1, 0.45], bounds: [0, 0.8] },  // tỉ lệ lính mục tiêu trên tổng dân
  aggression:    { range: [0.15, 0.85], bounds: [0, 1] },   // ngưỡng dám tuyên chiến
  expansion:     { range: [32, 88], bounds: [12, 140] },    // bán kính dám đi kiếm ăn/xây nhà quanh nhà chính (nới theo bản đồ 340x220)
  houseBuffer:   { range: [1, 5], bounds: [0, 10] },        // giữ bao nhiêu chỗ trống trong giới hạn dân trước khi xây nhà
  farmTarget:    { range: [1, 6], bounds: [0, 12] },        // số ruộng muốn có
  towerTarget:   { range: [0, 3], bounds: [0, 8] },         // số tháp canh muốn có
  ageRush:       { range: [0.2, 0.9], bounds: [0, 1] },     // càng cao càng nhịn ăn để lên thời đại sớm

  // --- Ba gen của Phase 3.6, đều gắn với cây công nghệ mới ---
  // Ưu tiên dồn dân vào ĐÁ. Đánh đổi sắc nhất trong cả bộ gen: đá hoàn toàn vô
  // dụng ở Đồ Đá (không công trình nào thời đầu cần đến nó), nên stoneWeight cao
  // là ném thẳng công sức xuống sông trong 2.000 tick đầu — nhưng thấp quá thì
  // không bao giờ mở nổi Xưởng thợ, và cả nhánh cung thủ/công thành/Kỳ quan biến
  // mất khỏi ván chơi. Một gen "sai lúc này, đúng lúc kia".
  stoneWeight:   { range: [0.15, 1.0], bounds: [0.02, 3] },
  // Tỉ lệ quân tầm xa trong đạo quân. Đánh đổi thật, không do một con số cố định
  // nào trong code phán: cung thủ bắn 6 ô nên hạ được đối phương trước khi bị
  // chạm, nhưng 42 máu thì bị kỵ sát vào là tan. Giá trị tốt nhất phụ thuộc vào
  // đối thủ đang chơi kiểu gì — tức là nó tiến hoá TRONG một môi trường tự nó
  // cũng đang tiến hoá. Đây là gen đáng theo dõi nhất của bản này.
  rangedRatio:   { range: [0.15, 0.6], bounds: [0, 0.9] },
  // Mức khao khát Kỳ quan: quyết định có dám dồn 680 đá + 620 gỗ + 380 vàng vào
  // một toà nhà KHÔNG đánh nhau được hay không. Xây được là thắng ngay; xây dở
  // dang thì vừa mất kho vừa dựng sẵn một tấm bia cho cả ba bộ lạc còn lại.
  wonderDrive:   { range: [0.1, 0.7], bounds: [0, 1] },
  // THÀNH TÂM: quyết định có xây Đền thờ không, và dâng tế dày hay thưa. Gen duy
  // nhất trong cả bộ mà mức lời/lỗ KHÔNG do một con số nào trong code định đoạt —
  // nó do người đang xem quyết định. Xem CONFIG.WORSHIP.
  piety:         { range: [0.1, 0.7], bounds: [0, 1] },

  // --- Hai gen của Phase 3.17, và cả hai đều nói về TRẬT TỰ ---

  // KỶ LUẬT ĐỘI HÌNH. Cho tới bản này mỗi người lính là một tác nhân độc lập
  // tuyệt đối: tự chọn mục tiêu, tự tìm đường, tự quyết đánh hay lui. Kết quả là
  // một đạo quân không bao giờ TỒN TẠI như một đạo quân — nó là bốn chục cá thể
  // tình cờ cùng đi một hướng, và trận đánh diễn ra thành một chuỗi tay đôi rải
  // dọc nửa bản đồ vì kẻ nhanh chân tới trước chết trước khi kẻ chậm kịp tới.
  //
  // Gen này quyết định một người lính chịu ĐỢI đồng đội tới mức nào (xem
  // marchWithFormation) và đứng vào hàng chặt tới đâu lúc nghỉ. Đánh đổi thật,
  // không do con số nào trong code phán:
  //   · kỷ luật cao — cả khối tới nơi cùng lúc, tập trung hoả lực, nhưng CHẬM: kẻ
  //     nhanh nhất bị ghìm lại theo kẻ chậm nhất, và một khối đông đứng sát nhau
  //     là mồi ngon cho sát thương lan của máy bắn đá.
  //   · kỷ luật thấp — tới rải rác nên không bao giờ dồn đủ lực phá thành, nhưng
  //     phản ứng nhanh, phủ rộng, và không bao giờ mất cả đạo quân trong một cú.
  // Giá trị tốt nhất phụ thuộc vào đối phương đang chơi kiểu gì — tức là nó tiến
  // hoá trong một môi trường tự nó cũng đang tiến hoá, cùng họ với `rangedRatio`.
  discipline:    { range: [0.2, 0.8], bounds: [0, 1] },

  // QUY HOẠCH. Chỗ đặt nhà cho tới nay bốc hoàn toàn ngẫu nhiên trên một vòng
  // xoắn ốc quanh kinh đô, nên mọi bộ lạc ở mọi kỷ nguyên đều mọc ra cùng một thứ:
  // một đám nhà rải như nấm. Bốn nền văn minh trông giống hệt nhau về mặt QUY
  // HOẠCH, và quy hoạch lại là thứ dễ nhìn ra nhất trên một bản đồ nhìn từ trên
  // xuống — nên đó là một trục biểu hiện bị bỏ phí hoàn toàn.
  //
  // Gen này kéo chỗ đặt nhà về một LƯỚI neo ở kinh đô. Đánh đổi có thật chứ không
  // chỉ là thẩm mỹ: bắt lưới thì nhà thẳng hàng, đường đi giữa các nhà ngắn và
  // thông (dân đi làm nhanh hơn), nhưng ô lưới nào bị rừng/đá chiếm là mất luôn
  // — bộ lạc quy hoạch chặt mọc chậm hơn hẳn ở địa hình xấu, trong khi kẻ mọc
  // như nấm nhét được nhà vào mọi kẽ hở.
  cityPlan:      { range: [0.15, 0.85], bounds: [0, 1] },

  // ============================================================
  // BỐN GEN CỦA PHASE 3.28 — mỗi gen trả lời MỘT cơ chế mới của cùng bản này
  // ============================================================
  // Luật tự đặt ra từ Phase 3.6 và nhắc lại ba lần trong tribeBrain — "đừng thêm
  // gen thứ mười sáu, hãy cho gen cũ thêm việc" — vẫn đúng, và bốn gen dưới đây
  // không vi phạm nó: chúng không chia lại một quyết định đã có chủ, chúng nhận
  // bốn quyết định VỪA MỚI TỒN TẠI. Trước bản này không có gì để chọn về số lò
  // quân (xây cái thứ hai không nhanh thêm một tick nào), về cấp đường (đường chỉ
  // có một cấp), về đất chiếm được (không làm gì được với nó), và về anh hùng
  // (ai có trại lính là có tướng). Bốn cơ chế mới, bốn ngã ba mới.
  //
  // Điều kiện để một gen được vào bảng này vẫn không đổi: phải có ĐÁNH ĐỔI mà
  // KHÔNG con số nào trong code phán được bên nào đúng. Nếu tồn tại một giá trị
  // luôn tốt hơn, chọn lọc sẽ đẩy nó lên trần trong hai kỷ nguyên rồi đứng im, và
  // đường trôi của nó trên biểu đồ chẳng nói lên điều gì.

  // SỐ LÒ QUÂN. Nhân vào số trại lính / xưởng thợ / chuồng ngựa mà bộ lạc muốn có
  // (xem khối `forgeScale` trong tribeBrain). Từ bản này mỗi công trình là một cái
  // lò chạy song song, nên đây là cái van duy nhất điều khiển TỐC ĐỘ RA QUÂN —
  // tách hẳn khỏi `militaryRatio`, vốn chỉ nói quân đội nên TO tới đâu.
  //
  // Đánh đổi thật, và nó nằm ở chỗ dễ bỏ sót: 140 gỗ một trại lính là bốn căn nhà
  // ở, tức là 20-68 suất dân số tuỳ thời đại. Bộ lạc `garrison` cao hồi quân sau
  // một trận thua trong vài trăm tick thay vì vài nghìn, nhưng trần dân số của nó
  // thấp hơn — nên đạo quân nó hồi nhanh lại là một đạo quân NHỎ HƠN. Bộ lạc
  // `garrison` thấp nuôi được đạo quân to nhất bản đồ và mất nó vĩnh viễn trong
  // một buổi chiều. Giá trị tốt nhất phụ thuộc vào việc bản đồ này có bao nhiêu
  // trận đánh — thứ do ba bộ lạc kia quyết định.
  garrison:      { range: [0.5, 1.5], bounds: [0.2, 2.6] },

  // ƯU TIÊN ĐƯỜNG CÁI. Quyết định bao nhiêu phần ngân sách ĐÁ chảy vào mặt đường:
  // trần số ô được lát, nhịp lát, và mức đá giữ lại trước khi động thổ.
  //
  // Đá là tài nguyên duy nhất trong game bị ba thứ cùng đòi và cả ba đều gấp:
  // tháp canh (điều kiện lên đời từ bậc 3), Kỳ quan (đường thắng thứ hai), và
  // đường cái. Từ Phase 3.25 nó lại còn HỮU HẠN — mỏ cạn thì biến mất. Nên gen
  // này không mua tốc độ, nó mua tốc độ BẰNG CÁCH hoãn một trong hai thứ kia.
  //
  // Vì sao đây là đánh đổi chứ không phải một thang bậc: đường cái trả lời bằng
  // NĂNG SUẤT DÀN ĐỀU (mọi chuyến gánh, mọi đợt hành quân, suốt phần đời còn lại
  // của bộ lạc), còn tháp và Kỳ quan trả lời bằng những cú NHẢY RỜI RẠC. Một nền
  // kinh tế nhanh hơn 15% suốt 8.000 tick và một cái cổng thời đại mở sớm 2.000
  // tick là hai thứ không quy đổi được cho nhau — và cái nào lời hơn phụ thuộc
  // vào bản đồ này rộng bao nhiêu và mỏ nằm ở đâu.
  roadDrive:     { range: [0.15, 0.8], bounds: [0, 1] },

  // DÁM LẬP ĐÔ TRÊN ĐẤT VỪA CHIẾM. Xem CONFIG.COLONY.
  //
  // Đánh đổi thuần TÌNH HUỐNG — họ hàng gần nhất của `greed` bên bộ gen anh hùng,
  // và cùng lý do: không có con số nào trong code nói nó tốt hay xấu. Một kinh đô
  // tiền tuyến kéo biên giới sang đất địch, rút ngắn quãng gánh của cả một vùng
  // mỏ mới, và nâng trần dân số — nhưng nó đứng một mình giữa nơi vừa đánh nhau
  // xong, cách quân nhà nửa bản đồ, và nó là toà nhà đắt nhất mà bộ lạc có thể
  // đặt móng đúng vào lúc kho vừa cạn vì chiến tranh.
  //
  // Bộ lạc `colonize` cao mà `garrison` thấp là một đế chế trải dài không giữ nổi
  // hai đầu; cao cả hai là một cỗ máy chinh phạt thật. Đó là loại tương tác GIỮA
  // hai gen mà bộ gen này còn thiếu.
  colonize:      { range: [0.15, 0.75], bounds: [0, 1] },

  // ĐẦU TƯ VÀO ANH HÙNG. Có dựng Tướng phủ không, và chiêu mộ người kế nhiệm sốt
  // sắng tới đâu sau khi tướng cũ ngã xuống.
  //
  // Gen này có một tính chất mà không gen nào khác trong bảng có: nó điều khiển
  // TỐC ĐỘ QUAY của vòng tiến hoá thứ hai. Anh hùng là đơn vị duy nhất mang gen
  // cá thể, và một đời anh hùng là một thế hệ của vòng đó. Bộ lạc `heroDrive` cao
  // chạy vòng lặp ấy nhanh hơn — nhiều đời hơn, chọn lọc gắt hơn, nhưng mỗi đời
  // là 130 lương + 60 vàng cộng với cái Tướng phủ, tiền lẽ ra thành quân.
  //
  // Đánh đổi thật vì anh hùng KHÔNG phải một khoản đầu tư luôn lời: hào quang chỉ
  // huy chỉ đáng tiền khi có quân đứng quanh, mà bộ lạc dồn tiền cho tướng thì
  // đúng là bộ lạc có ít quân nhất. Ở đầu kia, `heroDrive` gần 0 nghĩa là cả tầng
  // tiến hoá thứ hai không tồn tại với bộ lạc đó — và nếu đó là bộ lạc thắng kỷ
  // nguyên, gen ấy được nhân bản, và cả biểu đồ dòng dõi tắt dần. Đó là một kết
  // cục hợp lệ và đáng xem, không phải một lỗi cần chặn.
  heroDrive:     { range: [0.2, 0.8], bounds: [0, 1] },

  // ============================================================
  // PHÒNG THỦ (Phase 3.30) — bao nhiêu phần nền văn minh đổ vào ĐÁ và vào
  // những thứ đứng yên
  // ============================================================
  // Gen này ra đời cùng lúc với hai thay đổi làm nó có nghĩa: tường thành to gấp
  // đôi và TỰ SỬA BẰNG ĐÁ (CONFIG.WALL.REGEN_STONE). Trước đó "thích phòng thủ"
  // không phải một chiến lược, nó chỉ là `towerTarget` — một con số đếm nhà.
  //
  // Nó điều khiển đúng ba thứ, và cả ba đều đi qua ĐÁ:
  //   · trọng số nghề đập đá trong pickJob, và mức đá bộ lạc coi là "đủ" — đây là
  //     vế NẶNG NHẤT, và đo được là nó gần như một công tắc chứ không phải một núm:
  //     hoán gen 0->1 trên cùng một trạng thái sống thì tỉ lệ chọn nghề đá đi từ
  //     0,1-0,4% lên 14,9-39,9%. Đặt `fortify` về 0 thì nghề đập đá gần như không
  //     tồn tại — vì chọn nghề là phép so TƯƠNG ĐỐI và đá là dòng duy nhất biết no
  //     (bài học Phase 3.27);
  //   · số tháp canh muốn có — CỘNG LÊN TRÊN sàn hạn ngạch NEED_TOWERS, không nằm
  //     trong `max()` với nó (xem `towerWant` bên 11-tribe-brain, nơi ghi lại phép
  //     đo đã bác bỏ công thức cũ: sàn thắng 7.817/7.817 mẫu từ Đồ Đồng trở đi);
  //   · nhịp gia cố — bộ lạc `fortify` cao chịu xây chồng tháp sớm hơn. Vế YẾU NHẤT
  //     và đã đo: quãng nguội chỉ đổi được kết cục ở 1,3% trong 7.195 nhịp vào nhánh
  //     xây chồng, vì 64,3% số nhịp không có tháp nào đủ điều kiện lên tầng. Nút
  //     thắt nằm ở ứng viên, không nằm ở quãng nguội — đừng chỉnh con số 600/240 mà
  //     tưởng là đang chỉnh gen.
  //
  // ĐÁNH ĐỔI THẬT, và nó gắt hơn mọi gen kinh tế khác vì đá là tài nguyên HỮU HẠN
  // (Phase 3.25): mỗi người thợ đứng ở mỏ đá là một người không hái lương, không
  // đốn gỗ, không đãi vàng — mà lương là quân, gỗ là nhà, vàng là cổng thời đại.
  // Bộ lạc `fortify` cao đứng sau một vành thành dày trong một thành phố nhỏ, lên
  // đời chậm, và tới trận đánh quyết định với đạo quân bé nhất bản đồ. Bộ lạc
  // `fortify` thấp có quân đông nhất và một vành thành mà chỉ cần thủng một lần
  // là không bao giờ vá lại nổi.
  //
  // Cái nó KHÔNG làm, có chủ ý: nó không đụng tới `aggression`. Một bộ lạc vừa
  // hiếu chiến vừa cố thủ là một tổ hợp hợp lệ và đáng xem (đánh xong rút về sau
  // tường), và ép hai gen thành hai đầu của một trục là xoá mất tổ hợp đó.
  fortify:       { range: [0.15, 0.7], bounds: [0, 1] },

  // ============================================================
  // VIỄN CHINH (Phase 3.33) — gen thứ hai mươi hai, và nó nhận một quyết định
  // VỪA MỚI TỒN TẠI
  // ============================================================
  // Luật "đừng thêm gen thứ mười sáu, hãy cho gen cũ thêm việc" vẫn đứng, và gen
  // này không vi phạm nó — vì trước bản này KHÔNG CÓ GÌ để chọn về chuyện hành quân
  // xa. Một đạo quân đi mười ô và một đạo quân đi hai trăm ô là hai đạo quân giống
  // hệt nhau lúc chạm trán (xem CONFIG.SUPPLY). Quân lương vừa tạo ra ngã ba ấy.
  //
  // Nó điều khiển đúng ba thứ, và cả ba đều đi qua LƯƠNG THỰC:
  //   · trần quân lương mỗi người lính mang ra khỏi cổng (70..130 — xem unitMaxSupply);
  //   · số ĐỘI HẬU CẦN muốn nuôi, và mức sốt sắng dựng trại tiếp tế;
  //   · mức lương DỰ TRỮ mà bộ lạc từ chối tiêu (xem `reserve` trong tribeBrain).
  //
  // ĐÁNH ĐỔI THẬT, và nó nằm ở vế thứ ba — vế dễ bỏ sót nhất. Hai vế đầu trông như
  // toàn mặt lợi, nhưng lương thực giữ trong kho là lương thực KHÔNG thành lính:
  // `reserve` là ngưỡng mà cả thang tuyển quân lẫn lệnh lên đời đều phải vượt qua.
  // Bộ lạc viễn chinh cao đánh được tới góc xa nhất bản đồ với một đạo quân NHỎ HƠN
  // và lên đời CHẬM HƠN; bộ lạc viễn chinh thấp nuôi đạo quân to nhất bản đồ và mất
  // một nửa sức đánh của nó ngay khi bước qua đường biên.
  //
  // Cái nào lời hơn KHÔNG có trong code: nó phụ thuộc kinh đô địch nằm cách bao xa
  // trên bản đồ này, và ba bộ lạc kia có định đến tận nhà mình hay không. Đúng cùng
  // họ với `rangedRatio` và `discipline` — tiến hoá trong một môi trường tự nó cũng
  // đang tiến hoá.
  expedition:    { range: [0.15, 0.75], bounds: [0, 1] }
};

function randomPolicy() {
  const p = {};
  for (const k in POLICY_SPEC) p[k] = randRange(POLICY_SPEC[k].range[0], POLICY_SPEC[k].range[1]);
  return p;
}

function mutatePolicy(parent) {
  const p = {};
  for (const k in POLICY_SPEC) {
    const spec = POLICY_SPEC[k];
    const span = spec.range[1] - spec.range[0];
    p[k] = clamp(parent[k] + gauss(CONFIG.ERA.POLICY_MUTATION * span), spec.bounds[0], spec.bounds[1]);
  }
  return p;
}

// ============================================================
// Gen ANH HÙNG — thứ duy nhất trong game thuộc về một CÁ THỂ
// ============================================================
// Mỗi gen phải có ĐÁNH ĐỔI thật, nếu không thì chọn lọc vô nghĩa: một gen chỉ
// toàn mặt lợi sẽ bị đẩy lên trần trong vài đời rồi đứng yên, và biểu đồ chẳng
// nói lên điều gì. Đánh đổi cụ thể xem trong heroStatsFromGenes().
const HERO_GENE_SPEC = {
  braveness: { range: [0.25, 0.75], bounds: [0, 1] },  // ngưỡng dám giao chiến khi ở thế yếu
  command:   { range: [0.25, 0.75], bounds: [0, 1] },  // hào quang buff lính quanh mình <-> sức đánh của chính mình
  ambition:  { range: [0.25, 0.75], bounds: [0, 1] },  // thích công thành <-> thích săn người
  vigor:     { range: [0.35, 0.65], bounds: [0, 1] },  // máu dày <-> nhanh nhẹn + đấm mạnh
  // Tham lam: chịu đi vòng bao xa để nhặt vật phẩm, và có dám bỏ đội hình đi săn
  // quái không. Đánh đổi thuần TÌNH HUỐNG, không có con số nào trong code quyết
  // định nó tốt hay xấu: đồ tốt thì mạnh lên thật, nhưng đường đi lấy đồ chạy
  // ngang hang quái và xa quân nhà. Chính vì thế nó là gen đáng theo dõi nhất.
  greed:     { range: [0.25, 0.75], bounds: [0, 1] }
};

const HERO_GENE_LABELS = {
  braveness: 'dũng cảm', command: 'chỉ huy', ambition: 'tham vọng', vigor: 'lực lưỡng', greed: 'tham lam'
};

// Tên dòng dõi: mỗi bộ lạc mỗi kỷ nguyên bốc một cái, các đời sau nối "đời N".
// Có tên riêng thì người xem mới nhớ được "à, cái ông hay bỏ chạy đó" — không có
// tên thì anh hùng chỉ là một chấm to hơn.
const HERO_DYNASTIES = [
  'Lôi Vân', 'Bạch Hổ', 'Trấn Sơn', 'Hoả Long', 'Thiết Ưng', 'Huyền Vũ',
  'Kim Đao', 'Phá Quân', 'Tuyết Ảnh', 'Cuồng Phong', 'Thương Lang', 'Địa Chấn'
];

function randomHeroGenes() {
  const g = {};
  for (const k in HERO_GENE_SPEC) g[k] = randRange(HERO_GENE_SPEC[k].range[0], HERO_GENE_SPEC[k].range[1]);
  return g;
}

function mutateHeroGenes(parent) {
  const g = {};
  for (const k in HERO_GENE_SPEC) {
    const spec = HERO_GENE_SPEC[k];
    const span = spec.range[1] - spec.range[0];
    g[k] = clamp(parent[k] + gauss(CONFIG.HERO.MUTATION * span), spec.bounds[0], spec.bounds[1]);
  }
  return g;
}

// Gen -> chỉ số. TẤT CẢ đánh đổi nằm ở đây, đọc một chỗ là hiểu hết luật chơi:
//  vigor   cao: máu dày nhưng đi chậm và đấm nhẹ (lực sĩ nặng nề)
//  command cao: hào quang rộng, buff lính mạnh, nhưng chính mình đánh yếu đi
//               (làm tướng thì bớt làm đấu sĩ)
//  braveness / ambition: không đổi chỉ số, chỉ đổi HÀNH VI — nên chúng là hai gen
//               mà chọn lọc "nói" rõ nhất, vì lợi/hại của chúng hoàn toàn do môi
//               trường quyết định chứ không do một con số cố định trong code.
function heroStatsFromGenes(g, ageBonus) {
  const base = CONFIG.UNIT.HERO;
  return {
    maxHp: Math.round(base.hp * (0.55 + g.vigor * 0.95) * ageBonus.hp),
    attack: base.attack * (1.3 - g.vigor * 0.6) * (1.25 - g.command * 0.5) * ageBonus.atk,
    speedMult: 1.45 - g.vigor * 0.6,
    auraR: 2 + g.command * (CONFIG.HERO.MAX_AURA_R - 2),
    auraMult: 1 + g.command * 0.55
  };
}

// Hệ số chỉ số theo cấp món đồ. Kẹp ở hai đầu để một giá trị lạ (đọc từ một bản
// lưu cũ, hay một chỗ nào đó quên gán `lv`) không bao giờ ra `undefined` rồi thành
// NaN — cùng con lỗi đã xoá sạch biên giới lãnh thổ ở Phase 3.6.
function itemLevelMult(lv) {
  const MULT = CONFIG.ITEM.LEVEL_MULT;
  return MULT[clamp(Math.round(lv || 1), 1, CONFIG.ITEM.MAX_LEVEL)];
}

// Chỉ số cuối = GEN (cố định cả đời) + VẬT PHẨM (thay đổi trong đời). Tính lại
// từ đầu mỗi lần nhặt đồ thay vì cộng dồn vào chỉ số hiện tại: cộng dồn thì chỉ
// cần một lần gọi thừa là chỉ số phình vĩnh viễn, mà lỗi kiểu đó không bao giờ
// lộ ra ngay — nó chỉ hiện thành "sao anh hùng đời này mạnh vô lý".
function recomputeHeroStats(u) {
  const b = u.ageBonus;
  const st = heroStatsFromGenes(u.genes, b);
  let attack = st.attack, maxHp = st.maxHp, speedMult = st.speedMult;
  let auraR = st.auraR, auraMult = st.auraMult;
  // `u.items` là mảng {key, lv}. Cấp nhân thẳng vào MỌI chỉ số của món đó — không
  // có món nào "chỉ lên cấp một nửa", vì một bảng ngoại lệ ở đây thì không đọc được
  // từ ngoài màn hình và người xem sẽ không bao giờ suy ra được luật.
  for (const it of u.items) {
    const spec = CONFIG.ITEM.TYPES[it.key];
    if (!spec) continue;                       // loại đồ đã bị xoá khỏi game
    const m = itemLevelMult(it.lv);
    if (spec.attack) attack += spec.attack * m * b.atk;
    if (spec.maxHp) maxHp += spec.maxHp * m * b.hp;
    if (spec.speedMult) speedMult += spec.speedMult * m;
    if (spec.auraR) auraR += spec.auraR * m;
    if (spec.auraMult) auraMult += spec.auraMult * m;
  }
  // Nhánh nghiên cứu "Binh thư" cộng vào MÁU TỐI ĐA ở đây, và CHỈ máu. Sát thương
  // và giáp của nó đi qua effAttack/effDefense như mọi nâng cấp khác — cộng thêm
  // một lần nữa ở đây là tính đúp, mà tính đúp trên một chỉ số được recompute mỗi
  // lần nhặt đồ thì con số sẽ phình thêm sau mỗi món vật phẩm.
  //
  // Cũng KHÔNG nhân với ageBonus.hp: giá trị đó là ảnh chụp thời đại lúc anh hùng
  // ra đời, còn nâng cấp thì áp dụng ngay cho người đang sống — nhân hai thứ khác
  // trục thời gian với nhau là cách chắc chắn để một đời anh hùng mạnh vô lý.
  if (u.tribeId >= 0) {
    const t = tribes[u.tribeId];
    if (t && t.upBonus && t.upBonus.hero) maxHp += t.upBonus.hero.hp;
    // NGỰA CHIẾN cộng thẳng vào tốc độ. Đặt ở đây chứ không trong bảng `upBonus`
    // vì tốc độ của anh hùng không đi qua effAttack/effDefense — nó là một trường
    // riêng được nhân ra `u.speed` mỗi tick (xem tickHero).
    //
    // Điều kiện là THỜI ĐẠI HIỆN TẠI của bộ lạc, không phải `u.ageBonus` chụp lúc
    // sinh ra: con ngựa là tài sản của bộ lạc, nên một anh hùng ra đời ở Đồ Đồng
    // vẫn được lên ngựa ngay khi bộ lạc chạm Đồ Sắt (xem khối lên thời đại trong
    // tribeBrain — nó gọi lại recomputeHeroStats đúng vì lý do này).
    if (t && t.age >= CONFIG.HERO.MOUNT_AGE) speedMult += CONFIG.HERO.MOUNT_SPEED;
  }
  const gained = Math.round(maxHp) - (u.maxHp || 0);
  u.maxHp = Math.round(maxHp);
  u.attack = attack;
  u.speedMult = speedMult;
  u.auraR = Math.min(auraR, CONFIG.HERO.MAX_AURA_R + 4);
  u.commandMult = auraMult;
  // Nhặt giáp thì máu HIỆN TẠI cũng tăng đúng phần vừa thêm, không phải chỉ nới
  // trần rỗng: một anh hùng sắp chết mà nhặt được giáp phải thấy mình sống lại.
  if (gained > 0 && u.hp) u.hp = Math.min(u.maxHp, u.hp + gained);
  if (u.hp > u.maxHp) u.hp = u.maxHp;
}

