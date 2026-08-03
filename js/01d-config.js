'use strict';
// ============================================================
// 01d-config.js
// ------------------------------------------------------------
// CONFIG (phần 4/5) — công thành (SIEGE), chiều cao công trình, thuộc
// địa, thầy lang, đội hậu cần, Kỳ quan (WONDER), ruộng (FARM). Xem
// 01a-config.js.
// ============================================================
const CONFIG_D = {

  // ================================================================
  // BINH PHÁP CÔNG THÀNH (Phase 3.41) — bên CÔNG cuối cùng cũng biết mình
  // đang đứng trước cái gì
  // ================================================================
  // Tường thành có mặt từ Phase 3.29 và đã có đủ mọi thứ TRỪ một bên công biết
  // cách đánh nó. Đo một kỷ nguyên chinh phạt 16.923 tick, ba con số nói hết:
  //
  //   · 91,0% sát thương lên tường rơi vào THÂN TƯỜNG (máu đầy), chỉ 5,8% vào
  //     CÁNH CỬA — đúng ba ô mà cả cơ chế cổng thành sinh ra để làm chỗ vỡ.
  //     6.315 đòn vào thân, 583 đòn vào cửa. Câu "trận đánh ở cổng Nam" mà chú
  //     thích GATE_SPAN hứa hẹn chưa từng xảy ra một lần nào.
  //   · 96,5 sát thương mỗi đòn của máy bắn đá, 2,43 của bộ binh — gấp 40 lần.
  //     Bộ binh + cung thủ + kỵ binh đánh 73,7% tổng số đòn và gây 15,7% tổng sát
  //     thương. Ba phần tư số đòn là ba phần tư số người đứng trong tầm tháp canh
  //     để làm một việc gần như không có tác dụng.
  //   · 36,3% TỔNG SỐ CÁI CHẾT của cả bản đồ xảy ra trong 8 ô quanh một bức tường
  //     địch. Hơn một phần ba quân đội chết ở chân thành.
  //
  // Nguyên nhân KHÔNG phải các con số cân bằng — chúng đúng, và chú thích HP đã
  // tính sẵn "bộ binh không bao giờ phá nổi tường" như một ĐẶC TÍNH. Nguyên nhân
  // là bên công không có một dòng nào nói cho nó biết hai điều mà bất kỳ ai nhìn
  // bản đồ cũng thấy: cổng thì mỏng hơn thân tường, và cỗ máy thì phá được còn
  // nắm đấm thì không.
  //
  // Hai luật dưới đây, cả hai đều KHÔNG NHỚ GÌ (tính lại mỗi tick từ ô tường đang
  // chắn mặt) — bài học "mục tiêu dính chặt" đã cắn năm lần và lần nào cũng là một
  // trạng thái được ghi nhớ qua nhiều tick.
  SIEGE: {
    // ---- LUẬT 1: TÌM CỔNG ----
    // Đâm phải thân tường thì đi men theo tường tới CÁNH CỬA của chính cạnh đó,
    // thay vì đứng đấm chỗ mình tình cờ chạm vào. Ô cổng được gán sẵn cho từng ô
    // tường lúc dựng vành (`gx`/`gy` trong ensureWalls) chứ không dò lại ở đây:
    // gán sẵn thì mỗi ô có ĐÚNG MỘT cái cổng của nó, nên một người lính đứng ở góc
    // — chỗ cách đều hai cổng — không thể rung qua lại giữa hai lựa chọn. Đó là
    // cùng một lý do đã viết cho `corner`/`dir`/`gp`: hình học tính một lần, ở nơi
    // duy nhất biết kinh đô nằm ở đâu.
    //
    // 40 = bán kính vành lớn nhất (RADIUS đời 5), tức là kể cả người lính đứng
    // đúng ô góc — chỗ xa cổng nhất có thể — vẫn đi tới được. Đặt thấp hơn thì
    // luật này tự tắt ở đúng những bộ lạc có thành to nhất, tức là ở đúng chỗ nó
    // cần nhất.
    GATE_SEEK_R: 40,
    // Cửa đã yếu hơn ngần này thì THÔI tìm cổng — cứ đục chỗ đang đứng. Không có
    // vế này thì một đạo quân đang đứng trước một ô thân tường sắp thủng vẫn bỏ đi
    // vòng nửa vành để tới cổng, tức là phí sạch công đã đánh. Cùng đúng cái ngoại
    // lệ FINISH_HP_FRAC mà thang ưu tiên đã dùng ba chỗ.
    FINISH_WALL_HP: 0.35,

    // ---- LUẬT 2: ĐỢI CỖ MÁY ----
    // Bộ binh KHÔNG đấm tường khi bộ lạc mình đang có máy bắn đá làm việc đó —
    // đứng lùi ra ngoài tầm tháp canh chờ, rồi tràn vào lúc tường sắp vỡ.
    //
    // ĐIỀU KIỆN DỪNG KHÔNG PHẢI MỘT CÁI ĐỒNG HỒ, mà là MÁU CỦA CHÍNH BỨC TƯỜNG
    // (POUR_HP). Đây là chỗ dễ viết sai nhất của cả khối: một bộ đếm "chờ tối đa N
    // tick" cần một trường nhớ trên từng người lính, mà trường nhớ ấy phải được xoá
    // ở đúng mọi nhánh thoát — đúng hình dạng đã sinh ra lỗi "mục tiêu dính chặt"
    // lần thứ tư. Đo bằng máu tường thì luật KHÔNG NHỚ GÌ CẢ: mỗi tick hỏi lại
    // "tường còn dày không, máy còn sống không", và cả hai câu trả lời đều nằm sẵn
    // trên bản đồ. Máy chết -> hết điều kiện -> bộ binh đục như cũ, ngay tick sau,
    // không cần một dòng dọn dẹp nào.
    //
    // Hệ quả phụ đáng giá: vì ngưỡng đo bằng máu tường chứ bằng thời gian, bộ binh
    // ập tới ĐÚNG LÚC tường sắp thủng chứ không phải sau một khoảng chờ cố định.
    WAIT: {
      // TRẦN của bán kính "đáng chờ". Điều kiện thật chặt hơn con số này rất nhiều
      // và nằm trong shouldWaitForSiege: cỗ máy phải ở trong TẦM BẮN CỦA CHÍNH NÓ
      // tính tới đúng ô tường ấy, tức là đang bắn được ngay bây giờ. 34 chỉ còn là
      // cái kẹp trần cho trường hợp một binh chủng tương lai có tầm rất xa.
      //
      // Vì sao phải siết: bản đầu dùng thẳng 34 ô và phép đo ghép cặp bác bỏ nó —
      // -22% số lỗ thủng, -32% số công trình bị hạ, số người chết không giảm. Chờ
      // một cỗ máy "ở gần đâu đó" không phải là chờ một cỗ máy đang phá tường.
      ESCORT_R: 34,
      // Đứng lùi ra ngần này ô. Tháp canh bắn 10 ô (BUILD.tower.range), nên 13 là
      // đứng ngoài tầm nó — cái mà cả luật này mua được. Không lùi xa hơn: quãng
      // đường từ chỗ chờ tới chỗ vỡ là quãng mà bên thủ được tự do bịt lỗ.
      HOLD_R: 13,
      // Tường tụt xuống dưới ngần này máu thì THÔI chờ, tràn vào. Đây là con số mà
      // hai trục điều khiển (kỷ luật + nhánh Công thành) kéo lên xuống — xem
      // pourThreshold trong 08-ai-combat.
      //
      // 0,45 -> 0,6 ở vòng hai, cùng lý do với ESCORT_R: ở 0,45 thì một bộ lạc kỷ
      // luật trung bình đứng chờ tới khi tường còn 68% máu, và với nhịp bắn của một
      // cỗ máy duy nhất thì quãng đó dài hơn nhiều so với thứ nó mua được.
      POUR_HP: 0.6,
      // Kỷ luật 0 kéo ngưỡng tràn lên gần 1 (gần như không chờ, tức là NGUYÊN hành
      // vi cũ vẫn nằm trong dải gen), kỷ luật 1 kéo xuống POUR_HP. Bản này không
      // XOÁ cách đánh cũ, nó biến cách đánh cũ thành một đầu của một trục tiến hoá
      // — cùng đúng khuôn đã dùng cho `lead` của marchWithFormation.
      POUR_UNDISCIPLINED: 0.92,
      // Mỗi cấp nhánh Công thành hạ thêm ngưỡng tràn ngần này: một bộ lạc đã học
      // công thành thì bộ binh của nó biết đợi lâu hơn. Đây là vế "thông minh lên"
      // của nhánh — bảy nhánh kia mua CHỈ SỐ, nhánh này bắt đầu mua cả HÀNH VI.
      POUR_PER_SIEGE_LV: 0.06,
      // Có lỗ thủng trong ngần này ô thì thôi chờ — tràn qua lỗ. Lỗ mở ra 900 tick
      // (WALL.RUBBLE) và đó là toàn bộ cửa sổ mà bên công mua được bằng cả cuộc vây.
      BREACH_R: 14
    }
  },

  // Hệ số chiều cao khi VẼ, không đụng gì tới luật chơi. 1 = đúng như bản phẳng cũ.
  // Nhà cao lên thì che khuất quân nhiều hơn, nên đây là đánh đổi giữa chiều sâu và
  // khả năng theo dõi trận đánh — bù lại bằng silhouette xuyên tường trong renderWorld.
  // Ruộng để 1 vì nó vẽ như mảnh đất cày, không có thân nhà (xem buildingSpriteHeight).
  BUILD_HEIGHT: { town: 1.5, house: 1.35, farm: 1, depot: 1.1, barracks: 1.4, tower: 1.85,
                  workshop: 1.3, stable: 1.15, infirmary: 1.25, shrine: 1.6, temple: 1.9, wonder: 2.5,
                  // Trại tiếp tế THẤP NHẤT bảng (0,85, dưới cả ruộng nếu ruộng có
                  // thân). Đó là cả thông tin: một cái lều vải giữa đồng phải đọc ra
                  // ngay là thứ KHÔNG thuộc về chỗ nó đang đứng, và chiều cao là
                  // tín hiệu rẻ nhất, đọc được ở mọi mức thu phóng.
                  camp: 0.85,
                  // Tướng phủ 1,7: cao gần bằng tháp canh dù footprint chỉ 2 ô. Cố ý —
                  // hai cây cột cờ soái vượt lên trên mái là thứ phải nhìn thấy từ xa,
                  // và nó là công trình DUY NHẤT có đường bao "hai cột + xà ngang".
                  heroHall: 1.7 },

  // ================================================================
  // LẬP ĐÔ TRÊN ĐẤT VỪA CHIẾM (Phase 3.28)
  // ================================================================
  // Cho tới bản này, hạ được kinh đô địch cho ra ĐÚNG hai thứ: một dòng nhật ký,
  // và một điểm đếm vào điều kiện Kỳ quan (WONDER.NEED_TOWNS). Trên bản đồ thì
  // không đổi gì cả — quân đứng trên một vạt phế tích rồi quay về nhà. Chiến
  // thắng lớn nhất mà một đạo quân có thể giành được lại là chiến thắng không
  // để lại dấu vết nào.
  //
  // Từ bản này, san phẳng một kinh đô cho kẻ chiến thắng QUYỀN LẬP ĐÔ trên nền
  // đất đó. Một kinh đô thứ hai không phải là "thêm một toà nhà": nó là điểm trút
  // hàng (DEPOT_TYPES), là lò ra dân, là trần dân số, là tháp phòng thủ, và nó có
  // trọng số ảnh hưởng lãnh thổ cao nhất bảng — nghĩa là biên giới CHUYỂN CHỦ
  // ngay tại chỗ vừa đánh xong. Người xem đọc ra được cuộc chinh phạt trên bản đồ
  // mà không cần một dòng chữ nào.
  //
  // Đánh đổi có thật, và đó là lý do nó xứng đáng có một gen riêng (`colonize`):
  // một kinh đô tiền tuyến nằm CÁCH XA quân nhà, giữa lãnh thổ vừa mất chủ, và nó
  // đắt (250 gỗ) đúng vào lúc bộ lạc vừa trả giá cho một cuộc chiến. Bộ lạc tham
  // lam sẽ có một đế chế trải dài mà không giữ nổi hai đầu.
  COLONY: {
    MAX_TOWNS: 3,      // trần tuyệt đối: bản đồ có 4 bộ lạc, hơn 3 đô là một bên nuốt tất
    TTL: 5000,         // phế tích nguội sau ngần này tick — quyền lập đô hết hạn
    SPOT_R: 12,        // chỉ được đặt trong ngần này ô quanh nền cũ, nếu không nó
                       // chỉ là một cái nhà chính bình thường xây ở đâu đó
    MIN_DRIVE: 0.3     // gen `colonize` dưới ngưỡng này thì không bao giờ lập đô
  },

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
    //
    // Đo thật 3 kỷ nguyên: điều kiện này chưa từng chặn một lần nào (0/10.831
    // tick). Giữ lại chứ không xoá, và lý do đã đổi: trước đây nó im lặng vì
    // KHÔNG AI VỀ TỚI trạm xá; từ bản này lính thật sự rút về (xem thang ưu tiên
    // trong tickSoldier), nên nó mới bắt đầu có việc để làm. Nó cũng là thứ chia
    // đôi hai nửa của cùng một hệ thống: trạm xá là bệnh viện hậu phương AN TOÀN,
    // thầy lang là bàn mổ dã chiến — chữa được giữa trận, và trả giá bằng mạng.
    SAFE_R: 8
  },

  // THẦY LANG — nửa cơ động của hệ thống y tế.
  //
  // Ba con số dưới đây là toàn bộ hành vi: tìm thương binh trong SEEK_R, đi tới,
  // chữa khi đã vào HEAL_R. Không có thang ưu tiên riêng, không có trạng thái nào
  // ngoài "đang chữa ai".
  //
  // SEEK_R 30 chứ không phải bằng tầm nhìn lính (12): thầy lang không đi tìm địch,
  // nó đi tìm NGƯỜI NHÀ, và người nhà thì không cần nhìn thấy mới biết ở đâu. Để
  // bằng 12 thì một thầy lang đứng ở điểm tập kết sẽ không bao giờ biết là cách đó
  // 20 ô đang có một trận đánh — cùng đúng cái lỗi bán kính đã bắt được ở "lính
  // không bao giờ thấy hang ổ nào" (bán kính 26 trên bản đồ 340x220).
  //
  // MIN_WOUND 0,92: dưới 92% máu là đã đáng chữa. Cố tình rộng — một thầy lang
  // đứng không thì không ai đọc ra nó làm nghề gì.
  HEALER: {
    SEEK_R: 30,        // bán kính đi tìm thương binh
    HEAL_R: 2.6,       // phải tới gần ngần này mới chữa được
    RATE: 0.45,        // máu/tick, MỘT người một lúc (xem chú thích CONFIG.UNIT.MEDIC)
    MIN_WOUND: 0.92,   // trên ngần này thì coi như lành, không đáng đi
    // Máu của chính thầy lang tụt dưới ngần này thì bỏ trận về trạm xá tự chữa.
    // Cao (0,55) vì nó không đánh trả được: một thầy lang cố nán lại thêm mười
    // tick là một thầy lang chết, và chết thì cả đạo quân mất luôn phần vá máu.
    FLEE_HP: 0.55,
    // ================================================================
    // TỰ BĂNG BÓ — thứ đáng lẽ phải có từ đầu, và cái giá của việc không có nó
    // ================================================================
    // `pickPatients` bỏ qua `o === u` từ bản đầu, nên thầy lang là đơn vị duy nhất
    // trên bản đồ mang một khả năng mà chính nó không dùng được. Đường hồi phục
    // duy nhất của nó là bỏ trận đi bộ về trạm xá — tức là đúng cái bẫy 65,8 ô mà
    // cả cơ chế thầy lang sinh ra để thoát khỏi, chỉ khác là lần này nạn nhân là
    // chính người thầy thuốc.
    //
    // CHẬM HƠN chữa cho người khác (0,26 so với 0,45) và chỉ chạy khi KHÔNG có
    // bệnh nhân nào. Cả hai vế đều cố ý: một thầy lang tự vá nhanh bằng vá người
    // khác là một đơn vị 46 máu không giáp nhưng bất tử trước sát thương lẻ, và
    // "đi tìm thầy lang trước" — thứ đắt nhất mà bên kia phải làm — sẽ hết nghĩa.
    // Ưu tiên bệnh nhân trước bản thân cũng là cách duy nhất giữ đúng câu chuyện:
    // nó là hậu phương ra tiền tuyến, không phải một đơn vị tự nuôi mình.
    SELF_RATE: 0.26,
    // Còn dưới ngần này máu thì tự vá NGAY cả khi vẫn còn bệnh nhân — dưới FLEE_HP
    // nữa thì nó bỏ trận về trạm xá (xem tickMedic). Không có bậc này thì giữa hai
    // trạng thái "còn khoẻ, lo cho người khác" và "kiệt sức, bỏ chạy" không có gì
    // cả, và mọi thầy lang đều đi thẳng từ cái thứ nhất sang cái thứ hai.
    SELF_URGENT: 0.75,
    // Lính bị thương KHÔNG rút về hậu phương nếu có thầy lang trong bán kính này.
    // Đây là khớp nối giữa hai nửa của hệ thống, và là lý do chúng không dẫm chân
    // nhau: có thầy lang thì tiền tuyến giữ nguyên quân số, không có thì mới phải
    // trả giá bằng quãng đường về. Cùng một vết thương, hai kết cục — đó mới là
    // thứ khiến việc xây Nhà y tế là một QUYẾT ĐỊNH.
    COVER_R: 14,
    PER_INFIRMARY: 2,  // mỗi trạm xá nuôi ngần này thầy lang
    MAX: 5
  },

  // ================================================================
  // QUÂN LƯƠNG — cái giá của KHOẢNG CÁCH, lần đầu tiên phải trả bằng máu
  // ================================================================
  // Cho tới bản này, một đạo quân đi mười ô và một đạo quân đi hai trăm ô là hai
  // đạo quân GIỐNG HỆT NHAU lúc chạm trán. Bản đồ 480x300 vì thế chỉ có đúng một
  // tác dụng: làm mọi thứ chậm đều như nhau — đúng cái câu đã viết ở KNIGHT khi
  // thêm kỵ binh ("khoảng cách là một hằng số mà KHÔNG AI thay đổi được"), chỉ lần
  // này nó nói về CHIẾN LƯỢC chứ không về tốc độ. Hệ quả đọc được trên màn hình:
  // kinh đô nằm ở góc xa nhất bản đồ cũng an toàn ngang kinh đô nằm sát biên giới.
  //
  // Luật mới, và nó cố ý chỉ có MỘT vế:
  //     đứng trên đất NHÀ  -> no, và hồi lại
  //     đứng ngoài         -> hao, và đói thì đánh yếu đi
  // "Đất nhà" đọc thẳng từ LÃNH THỔ đã có (territoryOwner) chứ không phải một bán
  // kính mới quanh kinh đô. Đây là quyết định quan trọng nhất của cả cơ chế: mảng
  // màu trên bản đồ — thứ tới nay thuần trang trí — TỪ BẢN NÀY LÀ MỘT LUẬT CHƠI.
  // Người xem không phải học một con số nào cả; họ nhìn thấy đạo quân bước qua
  // đường biên và biết cái đồng hồ vừa bắt đầu chạy. Một bán kính vô hình quanh
  // kinh đô thì đúng y hệt về mặt số học và vô hình hoàn toàn về mặt hình ảnh.
  //
  // Vì sao dân thường được MIỄN (xem needsSupply): họ làm việc trong bán kính
  // `expansion` quanh nhà, tức là gần như luôn đứng trên đất nhà — cho họ một cái
  // đồng hồ nữa chỉ thêm chi phí mà không thêm quyết định nào. Và ở đúng những lúc
  // họ ra xa (mỏ đá ngoài vành), bắt họ đói là bóp nghẹt nền kinh tế bằng một cơ
  // chế sinh ra để nói về CHIẾN TRANH.
  SUPPLY: {
    // Vạch gốc. Trần THẬT của một người lính = MAX × (0,7 + expedition × 0,6), tức
    // 70..130 tuỳ gen — xem unitMaxSupply. Bộ lạc viễn chinh cao phát nhiều lương
    // khô hơn cho mỗi người ra khỏi cổng.
    MAX: 100,
    // 0,13/tick nghĩa là một người lính bình thường (trần 100) trụ được ~770 tick
    // ngoài đất địch. Con số đó được chọn theo THANG THỜI GIAN CỦA MỘT CHIẾN DỊCH,
    // không phải theo cảm giác: hành quân nửa bản đồ mất 200-300 tick, một trận
    // công thành mất 300-800 tick nữa. Nên 770 tick = "đủ cho MỘT chiến dịch, không
    // đủ cho hai". Đó chính là chỗ cơ chế có nghĩa — đạo quân phải VỀ, hoặc phải
    // mang hậu cần đi theo.
    //
    // Chậm hơn nữa (2.000 tick như bản nháp đầu) thì cả cơ chế im lặng: mọi cuộc
    // chiến kết thúc trước khi vạch chạm đáy, và đây đúng là hình dạng "mã chết" đã
    // bắt được ở hợp nhất-khi-hòm-đầy (0/19 lần kích hoạt) và ở hang ổ cấp 3.
    DRAIN: 0.13,
    // Hồi trên đất nhà nhanh gấp 7 lần lúc hao: về tới nhà là ~110 tick đầy lại.
    // Cố ý dứt khoát — "về nhà tiếp tế" phải là MỘT chuyến, đi và về, đúng cùng lý
    // do đã viết cho khoảng cách SEEK_HP/LEAVE_HP của trạm xá.
    REFILL: 0.9,
    // Dưới 45% thì bắt đầu yếu đi, cạn sạch thì còn 50% sức đánh. Hai con số này là
    // toàn bộ phần "trừng phạt", và chúng cố ý KHÔNG chạm vào máu hay tốc độ:
    //   · máu   — đã có cơ chế đói của bộ lạc (ECON.STARVE_DAMAGE) rút máu rồi, và
    //     hai đường rút máu khác nguồn thì người xem không đọc ra cái nào đang chạy.
    //   · tốc độ — đạo quân đói mà đi chậm thì nó KHÔNG BAO GIỜ VỀ ĐƯỢC tới đất nhà,
    //     tức là cơ chế tự khoá lối thoát duy nhất của chính nó. Đây là hình dạng
    //     "cơ chế mới lặng lẽ khoá cơ chế cũ" đã cắn sáu lần trong dự án này, và
    //     lần này nó lộ ra ngay trên giấy nên không phải trả giá để học lại.
    // Còn 50% chứ không phải 20%: một đạo quân đói phải THUA một đạo quân no ngang
    // cỡ, chứ không được biến mất khỏi trận đánh. Ở 20% thì cả trận công thành
    // thành một phép cộng — bên nào có trại tiếp tế là bên đó thắng, và không còn
    // gì để xem.
    HUNGRY: 0.45,
    MIN_MULT: 0.5,
    // ============================================================
    // TRẠI TIẾP TẾ — hậu phương ra tiền tuyến, lần thứ hai
    // ============================================================
    // Cùng đúng bài toán mà Thầy lang đã giải ở Phase 3.23 và cùng lời giải: đo
    // được là một cơ chế neo vào CÔNG TRÌNH chỉ chạy ở nơi không có ai cần nó
    // (quãng đường trung bình từ thương binh về trạm xá gần nhất: 65,8 ô). Nên
    // "tiếp tế" không thể là một toà nhà ở kinh đô — nó phải là một ĐƠN VỊ đi cùng
    // đạo quân và dựng trại tại chỗ.
    //
    // TTL ngắn là phần khiến nó KHÔNG phải một cái kho hàng thứ hai: một cái trại
    // sống 1.200 tick rồi biến mất, nên nó không lấn dần thành lãnh thổ, không tích
    // luỹ qua nhiều chiến dịch, và mỗi lần muốn có nó lại phải trả tiền. Bỏ TTL thì
    // sau ba trận đánh cả bản đồ rải trại và cơ chế quân lương tắt ngóm.
    CAMP: {
      TTL: 1200,          // tick sống của một cái trại ở Đồ Đồng
      TTL_PER_AGE: 0.18,  // mỗi bậc thời đại sau Đồ Đồng cộng thêm ngần này phần
      R: 8,               // bán kính tiếp tế (gốc)
      SLOTS: 5,           // số lính được tiếp tế CÙNG LÚC (gốc) — đúng yêu cầu
      RATE: 0.8,          // quân lương/tick cho mỗi suất
      // Giá KHÔNG ở đây — xem CONFIG.BUILD.camp.cost, cùng chỗ với giá mọi công
      // trình khác. Một bảng giá thứ hai đặt "cho gần luật" là một bảng giá sẽ lệch.
      // Nhịp giữa hai lần một đội hậu cần dựng trại. Không có nó thì đúng cái tick
      // sau khi trại cũ hết hạn, nó dựng ngay cái mới — và TTL trở thành trang trí.
      COOLDOWN: 260,
      // Ngưỡng dựng trại: quanh đây phải có ít nhất ngần này người đang VƠI lương.
      // Một cái trại dựng cho một người là 55 lương đổ xuống sông, mà ngân sách ấy
      // là quân — nhưng 55 lương cũng chỉ đúng bằng giá một suất bộ binh, nên cái
      // sàn này không được đặt cao đến mức cơ chế không bao giờ chạy.
      //
      // 3 -> 2 sau khi đo 18.000 tick mỗi mức. Phần CƠ CHẾ nhích rõ:
      //     trại đứng trung bình trên bản đồ   2,11 -> 3,08
      //     % nhịp đội hậu cần đang nuôi trại  36,0 -> 58,2
      //     % thời gian lính đang trong trại   2,81 -> 4,25
      // và nó nhích ĐÚNG CHIỀU dù ván đo ở mức 2 tình cờ ít chiến tranh hơn hẳn
      // (thời gian quân ở ngoài lãnh thổ 58,1% -> 39,2%), tức là ít cơ hội dựng hơn
      // mà vẫn dựng được nhiều hơn.
      //
      // Cột KẾT QUẢ (tỉ lệ đói, mất sức đánh) thì KHÔNG so được giữa hai lần đo này
      // và tôi cố ý không dùng nó để biện minh: hai ván khác nhau, cường độ chiến
      // tranh khác nhau gần một nửa, nên chênh lệch ở đó là nhiễu chứ không phải
      // hiệu ứng. Ghi ra đây thay vì lặng lẽ trích một nửa bảng số.
      NEED_HUNGRY: 2,
      // ============================================================
      // "VƠI" LÀ 75%, KHÔNG PHẢI 45% — trại dựng TRƯỚC cơn đói
      // ============================================================
      // Bản đầu đếm người đã ĐÓI (dưới HUNGRY 45%, tức đã bắt đầu mất sức đánh). Đo
      // 18.000 tick: ở những nhịp đội hậu cần rảnh tay và đứng ngoài đất nhà, số
      // người đói quanh nó trung bình chỉ 0,71 — không bao giờ đủ 3, nên cả cơ chế
      // gần như không bao giờ kích hoạt (0% số nhịp đủ điều kiện dựng).
      //
      // Nguyên nhân là một lỗi về DOCTRINE chứ không về con số: một kho quân nhu
      // được dựng khi đoàn quân đi ngang qua, không phải sau khi lính đã ngã. Đếm
      // theo mốc "đã ngã" thì cái trại luôn tới sau cuộc khủng hoảng nó sinh ra để
      // ngăn — và vì hồi phục mất ~150 tick, tới sau nghĩa là tới vô ích.
      //
      // 0,75 chứ không phải 1,0: đếm mọi người chưa đầy bình thì ngưỡng vô nghĩa
      // (ai vừa bước qua biên giới cũng tính), và đội hậu cần sẽ cắm trại ngay bên
      // kia đường biên rồi đứng đó hết đời.
      PLANT_AT: 0.75,
      // ============================================================
      // 22 -> 60, và con số này là kết quả ĐO chứ không phải cảm tính
      // ============================================================
      // Đo 9.000 tick, đếm điều gì chặn lệnh dựng trại ở 34.400 nhịp của đội hậu cần:
      //     đang có trại rồi              38,2%
      //     đứng trên ĐẤT NHÀ             53,9%
      //     ngoài đất nhà, ÍT NGƯỜI ĐÓI    7,8%
      //     hết nhịp chờ / không đủ tiền     0%
      // và con số giết chết cả cơ chế nằm ở dòng thứ ba: ở đúng những nhịp nó rảnh
      // tay và đứng ngoài đất nhà, số người đói quanh nó trung bình là **0,03**.
      // Trong khi cùng lúc đó, 41% thời gian-ở-ngoài của cả đạo quân là thời gian
      // đói. Hai con số ấy nói một câu: đội hậu cần KHÔNG ĐỨNG Ở NƠI CÓ NGƯỜI ĐÓI.
      //
      // Đây đúng là cái bẫy 65,8 ô của Phase 3.23 ("một cơ chế hồi máu neo vào công
      // trình chỉ hoạt động ở nơi không có ai bị thương"), lần thứ hai, và lần này
      // thứ neo nó lại là BÁN KÍNH TÌM. Thầy lang tìm trong 30 ô trên bản đồ 340x220
      // và chú thích ở đó đã ghi vì sao 12 là quá hẹp; 22 trên bản đồ 480x300, với
      // đạo quân hành quân 150 ô mỗi chiến dịch, còn hẹp hơn thế nhiều lần.
      //
      // 60 chứ không phải vô hạn: quá rộng thì một đội hậu cần bỏ đạo quân đang
      // đánh trước cổng thành để đi tới một người lính lạc ở nửa kia bản đồ — cùng
      // cái ngưỡng "đủ rộng để tìm thấy việc, đủ hẹp để việc còn ở gần" đã cân cho
      // LAIR_SEEK_R (70).
      SEEK_R: 60
    }
  },

  // ================================================================
  // KỲ QUAN — từ bản này là một PHẦN THƯỞNG CHO CHINH PHẠT, không còn là
  // một khoản mua bằng kho
  // ================================================================
  // Đo 8 kỷ nguyên với luật cũ (đủ tài nguyên + đời 4 + còn quân là xây):
  //     thắng bằng Kỳ quan            5/8 kỷ nguyên (63%)
  //     lúc khởi công, địch còn sống  2,43 trên 3
  //     lúc khởi công, kinh đô địch còn đứng nguyên   2,00
  //     khởi công mà CHƯA hạ nổi một kinh đô địch nào 4/7 lượt
  //     hai bộ lạc cùng xây Kỳ quan một lúc          2/8 kỷ nguyên
  // Nghĩa là con đường thắng MẠNH NHẤT của trò chơi lại là con đường KHÔNG cần
  // đánh ai: bộ lạc nào kinh tế tốt nhất cứ ngồi nhà tích đá rồi thắng, trong khi
  // ba láng giềng vẫn còn nguyên vẹn. Đánh nhau trở thành phần phụ của một game
  // vốn có cả một cây công nghệ quân sự.
  //
  // Hai luật mới, và chúng sửa hai chuyện khác nhau:
  //   1. NEED_TOWNS — phải HẠ ĐƯỢC kinh đô địch trước đã. Đây là chỗ "ép phải đi
  //      chinh phạt": tài nguyên vẫn cần, nhưng tài nguyên không còn ĐỦ.
  //   2. ĐỘC NHẤT — cả bản đồ chỉ được có một Kỳ quan (kể cả đang xây dở). Ai đặt
  //      móng trước thì ba bên kia muốn xây phải đập cái đó xuống đã. Không có
  //      luật này thì hai ba bộ lạc cùng chạy đua song song và Kỳ quan lại thành
  //      một cuộc đua kinh tế, chỉ là đắt hơn.
  // Không đặt UNIQUE thành một cờ bật/tắt: nó là LUẬT CHƠI, không phải nút chỉnh.
  // Một hằng số mà mọi giá trị ngoài `true` đều làm hỏng thiết kế thì để nó trong
  // CONFIG chỉ mời người sau vặn nhầm.
  WONDER: {
    HOLD_TICKS: 2600,     // giữ được ngần này tick sau khi xây XONG là thắng
    HEAL: 0.5,            // tự hồi máu/tick — không có thì một máy bắn đá lẻ cũng gặm chết nó lúc không ai để ý
    // 1 chứ không phải 2, và con số này là kết quả đo chứ không phải cảm tính:
    // đếm trên 8 kỷ nguyên luật cũ, số kinh đô địch bị hạ TRONG CẢ KỶ NGUYÊN có
    // trung vị 2 nhưng phân bố rất lệch — nhiều kỷ nguyên chỉ có đúng 1. Đặt 2 thì
    // ở những ván đó Kỳ quan biến mất khỏi trò chơi, mà "một cơ chế chỉ kẻ đang
    // thắng đậm mới với tới được thì nó không đổi được kết cục của ván nào" là bài
    // học đã phải trả giá ba lần ở đây (đền thờ khoá ở Đồ Sắt, chuồng ngựa ngưỡng
    // 0,22, nhà y tế ngưỡng 0,30).
    NEED_TOWNS: 1
  },

  // Ruộng = 5 ô "thức ăn" quanh công trình, tái tạo nhanh hơn bụi quả nhiều lần.
  // Chuyển gỗ -> dòng lương thực ỔN ĐỊNH nhưng CÓ TRẦN (0.5 food/tick/ruộng nếu
  // thu hoạch liên tục). Bụi quả thì ngược lại: kho to nhưng hữu hạn + ở xa.
  // ================================================================
  // RUỘNG — từ Phase 3.25 là NGUỒN LƯƠNG TÁI TẠO DUY NHẤT của cả thế giới
  // ================================================================
  // Bụi quả không mọc lại nữa (xem MAP.BERRY_REGROW), nên toàn bộ dòng lương thực
  // vô hạn của bản đồ dồn hết vào công trình này. Đo sau khi bỏ mọc lại, đếm cái gì
  // chặn lệnh tuyển quân ở 4.117 nhịp bộ não:
  //     LƯƠNG DƯỚI MỨC DỰ TRỮ  62,7%   (trước Phase 3.25: 40,3%)
  //     chưa có trại lính      17,7%
  //     quân đã đủ chỉ tiêu    13,5%
  // Quân trung bình rơi từ 71,8 xuống 34,7 — đúng một nửa. Không phải vì bản đồ
  // nghèo đi (tổng lương hữu hạn 1,10 triệu xấp xỉ tổng HIỆU DỤNG của bản cũ) mà vì
  // dòng chảy đều đặn biến mất, và một nền kinh tế sống bằng dòng chảy chứ không
  // sống bằng kho.
  //
  // Neo con số mới vào chính thứ vừa bị xoá, chứ không mò: bản cũ có ~3.169 ô quả
  // × 0,035 = 111 lương/tick mọc lại trên toàn bản đồ. Ruộng mới cho 9 × 0,30 =
  // 2,7 lương/tick mỗi cái; bốn bộ lạc × ~10 ruộng = 108/tick. Gần như đúng bằng
  // dòng cũ — chỉ khác là giờ nó KHÔNG MIỄN PHÍ: phải bỏ gỗ ra xây, phải giữ được
  // đất, và số ruộng do gen `farmTarget` quyết định.
  //
  // Đó chính là chỗ đáng giá của cả thay đổi này: `farmTarget` từ một gen gần như
  // không có hậu quả (vì quả mọc lại nhiều hơn mọi nhu cầu cộng lại) trở thành gen
  // quyết định bộ lạc sống hay chết. Một gen chỉ tiến hoá được khi nó có giá.
  // ================================================================
  // PHASE 3.27 — RUỘNG TỰ HỒI NHANH HƠN MỌI NHU CẦU, VÀ ĐÓ LÀ LÝ DO CẢ BẢN ĐỒ
  // KHÔNG AI ĐỘNG TỚI
  // ================================================================
  // Đo 4.117 tick, một kỷ nguyên conquest bình thường, đếm từng ô tài nguyên:
  //     BỤI QUẢ   2.580 ô · còn 100,0% trữ lượng · 8 ô từng bị đụng tới  (0,3%)
  //     ĐÁ          624 ô · còn  99,4% trữ lượng · 13 ô từng bị đụng tới (2,1%)
  //     RUỘNG       261 ô · đang ĐẦY 90,4% sức chứa
  //     nghề của dân: 59 lương / 26 gỗ / 24 vàng / 5 đá  (114 dân)
  // 1,1 TRIỆU lương thực nằm trong bụi quả và cả nền văn minh ăn hết 525 đơn vị.
  //
  // Hai dòng cuối là chẩn đoán, và chúng đọc ngược với trực giác: 52% dân số đang
  // làm nghề lương thực, mà tổng lương thực trên bản đồ vẫn TĂNG. Không phải "quả
  // ở xa quá" (dân tìm ra quả thật, 8 ô bị đụng chứng minh điều đó) và cũng không
  // phải "hái chậm quá". Nguyên nhân là NHU CẦU ĐÃ ĐƯỢC THOẢ MÃN TRƯỚC KHI AI KỊP
  // ĐI: ruộng nằm ngay cạnh nhà, mỗi cái đẻ 9 × 0,30 = 2,7 lương/tick, và 26 cái
  // ruộng cho 70 lương/tick trong khi cả bộ lạc chỉ tiêu ~4. Ô ruộng đầy 90% nghĩa
  // là ngay cả người đứng NGAY TRÊN ruộng cũng không hái kịp phần nó tự mọc.
  //
  // Nên "quả và đá bị khai thác quá ít" KHÔNG phải hai lỗi cân bằng riêng — nó là
  // MỘT lỗi: nguồn lương tại nhà quá rẻ nên không ai phải đi đâu, và không có chỗ
  // nào tiêu đá nên không ai phải đập đá. Chữa nguồn thì cả hai tự khỏi. Đây đúng
  // là hình dạng đã gặp ở TRẦN DÂN SỐ (nới một cái cổng vốn đã mở) — chỉ khác
  // chiều: lần này cái cổng không mở, nó bị một cơ chế khác bịt kín từ phía sau.
  //
  // BA CON SỐ ĐỔI, mỗi con số một nút thắt:
  //   · REGROW 0,30 -> 0,085. Ruộng thành 9 × 0,085 = 0,77 lương/tick — DƯỚI mức
  //     một người hái được (GATHER_FOOD 0,5 × 1 người trên 1 ô, xem WORKERS_PER_CELL).
  //     Từ đây ruộng là cái ĐỆM, không phải cái vòi: nó giữ bộ lạc không chết đói
  //     giữa hai chuyến đi xa, còn phần lớn lương thực phải KIẾM VỀ.
  //   · AMOUNT 130 -> 60. Trữ lượng mỗi ô là thứ quyết định một người đứng đó bao
  //     lâu; 60 với nhịp hái 0,5 là 120 tick rồi phải đi chỗ khác. Trước là 260 tick.
  //   · WORKERS_PER_CELL 1 — mỗi ô đúng MỘT người. Đo được 10 người cùng đứng trên
  //     một ô, mỗi người ăn đủ nhịp hái: một ô ruộng đang gánh sản lượng của mười.
  //     Luật này áp cho MỌI ô tài nguyên chứ không riêng ruộng (bụi quả cũng đo
  //     được chồng 7-10 người), vì nó là cùng một câu hỏi.
  FARM: { CELLS: 9, AMOUNT: 60, REGROW: 0.085 },
};
