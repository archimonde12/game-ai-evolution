'use strict';
// ============================================================
// 01-config.js
// ------------------------------------------------------------
// CONFIG (phần 1/5) — bản đồ, kinh tế, thể lực, chỉ số đơn vị (UNIT).
// CONFIG bị chia làm 5 file (Phase 3.43) vì nó là MỘT object literal duy
// nhất 3460 dòng — file cuối (01e) ghép cả 5 phần bằng Object.assign rồi
// mới có biến CONFIG thật. PHẢI nạp liền nhau và TRƯỚC 02+ (đọc CONFIG
// ngay lúc tải) — xem CLAUDE.md.
// ============================================================
const CONFIG_A = {
  // Bản đồ 340x220 = 74.800 ô, gấp đôi diện tích bản 240x160. Khung nhìn giữ
  // nguyên 150x100, nên bây giờ mắt chỉ thấy được ~20% thế giới cùng lúc: bản đồ
  // trở thành thứ phải KHÁM PHÁ chứ không còn liếc một cái là nắm hết. Đây là
  // điều kiện cần để quái vật và hang ổ có nghĩa — hiểm hoạ chỉ đáng sợ khi nó
  // nằm ở chỗ ta chưa nhìn tới.
  // PHASE 3.24 — 480x300 = 144.000 ô, gấp 1,93 lần bản 340x220. Khung nhìn vẫn
  // 150x100, nên mắt chỉ còn thấy 10,4% thế giới cùng lúc (trước là 20%).
  GRID_WIDTH: 480,
  GRID_HEIGHT: 300,
  VIEWPORT_WIDTH: 150,
  VIEWPORT_HEIGHT: 100,
  CELL_SIZE: 6,
  // 0,55 -> 0,40 để minimap giữ nguyên BỀ NGANG PIXEL (~192 px) chứ không giữ
  // nguyên tỉ lệ: nó là một ô cố định trên khung hình, nên khi bản đồ rộng ra thì
  // thứ phải co lại là tỉ lệ, không phải khung hình. Để nguyên 0,55 thì minimap
  // phình lên 264x165 và ăn mất một mảng góc màn hình.
  MINIMAP_SCALE: 0.40,
  CAMERA_PAN_SPEED: 1.5,

  // Lưới băm không gian cho tìm-gần-nhất. Nếu quét tuyến tính toàn bộ ~2500 ô
  // tài nguyên cho mỗi lần dân thường cần mục tiêu mới thì ở 60x speed sẽ nghẽn.
  BUCKET_SIZE: 12,

  // Số cụm tài nguyên nhân theo diện tích (~x1.95), giữ nguyên MẬT ĐỘ. Không
  // nhân lên thì bản đồ rộng gấp đôi hoá ra nghèo đi một nửa, và mọi cân bằng
  // kinh tế đã tinh chỉnh ở các bản trước sụp hết.
  MAP: {
    // ----------------------------------------------------------------
    // RỪNG DÀY HƠN — và vì sao "dày" ở đây là ĐỔI HÌNH DẠNG CỤM, không phải
    // đổ thêm cây vào cùng một cái khuôn.
    //
    // Cây VẪN CHẶN ĐƯỜNG (xem addResource: `blockedGrid`). Từ Phase 3.15 bỏ
    // nước thì rừng là vật cản DUY NHẤT còn lại trên bản đồ, nên mỗi điểm phần
    // trăm mật độ thêm vào là một điểm phần trăm rủi ro kẹt — đúng cái họ lỗi mà
    // ba phase liền đã phải đi dọn.
    //
    // Nên: bán kính cụm 11 -> 9 và bước rải 2 -> 1. Cùng một số cây thì cụm nhỏ
    // hơn ĐẶC hơn (17% -> 30% ô trong đĩa có cây) và mắt đọc ra "một khu rừng"
    // thay vì "một vạt cây thưa"; đồng thời KHOẢNG TRỐNG GIỮA các cụm rộng ra,
    // nên đường vòng vẫn còn. Mật độ 0,30 ở bước rải 1 cho ~76 cây mỗi cụm
    // (bước 2 × 0,55 cũ cho ~66), tức là đặc hơn 1,8 lần trên một diện tích nhỏ hơn.
    //
    // 30% là con số cố ý nằm DƯỚI ngưỡng thấm (percolation) của lưới 8 hướng:
    // ở mật độ ngẫu nhiên này gần như luôn tồn tại đường xuyên qua đám cây. Trên
    // ~40% thì cụm bắt đầu khép kín và đường đi tham lam hết cửa. Đó là trần thật
    // của cơ chế này, không phải một con số thẩm mỹ.
    //
    // Và vẫn ĐỤC LỐI (xem carveForestLanes): mật độ dưới ngưỡng chỉ bảo đảm "gần
    // như luôn có đường", còn 96 cụm chồng lấn nhau thì "gần như" là chưa đủ.
    FOREST_CLUSTERS: 78, FOREST_RADIUS: 8, TREE_SPACING: 1, TREE_DENSITY: 0.34, WOOD_PER_TREE: 150,
    // Mỗi cụm rừng bị xẻ ngần này đường xuyên tâm, mỗi đường rộng (2·HALF+1) ô.
    // Đục SAU KHI đã rải hết mọi cụm — đục trước thì cụm sinh sau lấp lại lối vừa mở.
    FOREST_LANES: 1, LANE_HALF: 1,
    // ================================================================
    // PHASE 3.25 — MỎ ĐẶC, MỎ CẠN, VÀ ĐẤT TRỐNG LẠI SAU LƯNG NGƯỜI KHAI THÁC
    // ================================================================
    // Ba luật mới nhập lại thành một vòng đời cho từng ô tài nguyên:
    //   1. KHÔNG xây được nhà lên ô còn tài nguyên (xem findBuildSpot),
    //   2. mỏ cạn thì BIẾN MẤT khỏi bản đồ và KHÔNG mọc lại,
    //   3. chỗ vừa cạn thành đất trống, xây nhà được.
    // Nên bản đồ không còn là một cái nền tĩnh: nó là thứ nền văn minh ĂN DẦN, và
    // hình dạng thành phố cuối kỷ nguyên là dấu vết của chỗ họ đã đào.
    //
    // ĐẬM ĐẶC nghĩa là ÍT CỤM HƠN nhưng mỗi cụm dày và giàu hơn, không phải rải
    // thêm. Lý do là luật 1 và 3 ở trên: một lớp mỏng rải khắp nơi thì vừa chặn chỗ
    // xây ở mọi chỗ, vừa cạn quá nhanh để đáng đi tới. Cụm đặc thì nó là một ĐỊA
    // ĐIỂM — đáng đi tới, đáng dựng kho bên cạnh, đáng tranh nhau, và khi cạn thì
    // để lại đúng một khoảnh đất trống đủ rộng để xây cả một khu.
    //
    // "Khai thác lâu hơn" đến từ TRỮ LƯỢNG MỖI Ô chứ không từ việc hạ tốc độ hái.
    // Hai thứ đó nghe giống nhau nhưng khác hẳn về hệ quả: nhịp hái quyết định sản
    // lượng mỗi giây (hạ nó là làm nghèo cả nền kinh tế), còn trữ lượng mỗi ô quyết
    // định một người dân đứng lại đó bao lâu trước khi phải đi tìm mỏ mới. Thứ cần
    // dài ra là cái thứ hai — vì chính nó làm cho việc dựng một cái kho cạnh mỏ trở
    // nên đáng, mà cái kho là cả nội dung của luật thứ tư (xem BUILD.depot).
    // Với CARRY_CAPACITY 15, một ô quả 430 nuôi ~29 chuyến gánh: đủ để cắm trại.
    // ================================================================
    // PHASE 3.27 — TRỮ LƯỢNG MỖI Ô XUỐNG, VÌ "KHAI THÁC QUÁ ÍT" LÀ MỘT PHÉP CHIA
    // ================================================================
    // Đo ở tick 9.000 sau khi đã chữa xong phía CẦU (ruộng yếu đi, một ô một người,
    // cả bốn tài nguyên đều biết no): số ô quả bị đụng tới tăng 8 -> 246, nhưng
    // trữ lượng còn lại vẫn là 96,7%. Hai con số đó không mâu thuẫn — chúng nói
    // rằng phía cầu đã đúng và phần còn lại là một bài toán KHÁC.
    //
    // Bản đồ có 2.562 ô quả × 430 = 1,10 TRIỆU lương, còn bốn bộ lạc trong trọn một
    // kỷ nguyên tiêu hết chừng 60 nghìn. Không có cách chỉnh nào ở phía cầu đưa
    // 60/1.100 lên thành một con số đọc được: dù dân có chăm tới đâu, tỉ lệ vẫn là
    // một phép chia mà MẪU SỐ mới là thứ sai. Cùng lý lẽ với đá: 179 nghìn đá trên
    // bản đồ, ngân sách đá thật của một bộ lạc cả kỷ nguyên là ~2.500.
    //
    // Nên hạ TRỮ LƯỢNG MỖI Ô, KHÔNG hạ số ô. Đây là hai thứ nghe giống nhau nhưng
    // ngược hẳn nhau về hệ quả, và Phase 3.25 đã viết ra đúng sự phân biệt này theo
    // chiều ngược lại (khi nó NÂNG trữ lượng lên): số Ô quyết định bản đồ có bao
    // nhiêu ĐỊA ĐIỂM đáng đi tới, còn trữ lượng mỗi ô quyết định một người đứng đó
    // bao lâu. Giữ nguyên số ô thì bản đồ vẫn có đủ chỗ cho luật một-ô-một-người
    // rải người ra; hạ trữ lượng thì mỗi vạt mỏ CẠN THẬT trong một kỷ nguyên — và
    // ô cạn thì biến mất, để lại đất trống xây được (luật Phase 3.25 mà cho tới
    // nay chưa từng chạy một lần nào cho đá).
    //
    // 430 -> 210: một ô quả nuôi ~14 chuyến gánh thay vì 29. Tổng lương hữu hạn của
    // bản đồ còn 538 nghìn — vẫn gấp chín lần mức tiêu thụ một kỷ nguyên, nên đây
    // KHÔNG phải một cú thắt lưng buộc bụng, chỉ là bỏ bớt phần thừa không ai chạm tới.
    BERRY_CLUSTERS: 38, BERRY_RADIUS: 5, BERRY_DENSITY: 0.88, FOOD_PER_BERRY: 210,
    // 0 — BỤI QUẢ KHÔNG CÒN MỌC LẠI, và đây là thay đổi nặng nhất của cả bản.
    //
    // Trước bản này quả là nguồn TÁI TẠO duy nhất, và nó lớn hơn nhu cầu rất nhiều:
    // ~3.169 ô × 0,035 = 111 lương/tick mọc lại trên toàn bản đồ, trong khi bốn bộ
    // lạc cộng lại chỉ tiêu ~20/tick tiền nuôi quân. Nghĩa là nạn đói thật sự không
    // tồn tại, và `farmTarget` — một gen hẳn hoi — gần như không có hậu quả nào.
    //
    // Bỏ mọc lại thì RUỘNG trở thành nguồn lương tái tạo DUY NHẤT (xem CONFIG.FARM),
    // tức là một gen vốn trang trí nay quyết định bộ lạc sống hay chết. Đổi lại,
    // trữ lượng mỗi bụi tăng gần bốn lần để tổng lương thực hữu hạn của bản đồ xấp
    // xỉ tổng lương thực HIỆU DỤNG của bản cũ (vốn + mọc lại trong một kỷ nguyên).
    BERRY_REGROW: 0,
    GOLD_CLUSTERS: 8, GOLD_RADIUS: 4, GOLD_DENSITY: 0.85, GOLD_PER_ORE: 170,
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
    // 240 -> 95, cùng phép tính đã viết ở FOOD_PER_BERRY. Đá là ca nặng nhất trong
    // bốn tài nguyên: 179 nghìn trên bản đồ, ~2.500 là toàn bộ ngân sách đá của một
    // bộ lạc cả kỷ nguyên (thời đại + tháp + đường + Kỳ quan). Ở trữ lượng cũ, bốn
    // bộ lạc khai thác HẾT SỨC cũng chỉ chạm tới 5,6% bản đồ — con số 99% còn lại
    // không phải triệu chứng của việc dân lười, nó là mẫu số.
    //
    // Giảm trữ lượng còn giữ một vai trò thứ hai mà số ô không giữ được: nó làm
    // "mỏ đá gần nhà" thành một lợi thế CÓ HẠN SỬ DỤNG. Ở 240/ô, một vạt đá cạnh
    // kinh đô nuôi một bộ lạc tới hết kỷ nguyên và địa lý ban đầu quyết định tất cả;
    // ở 95/ô, vạt đó cạn giữa chừng và bộ lạc buộc phải đi xa hơn — tức là phải
    // TRANH đất, đúng vai trò mà khối chú thích STONE_CLUSTERS ngay trên đặt ra cho
    // tài nguyên này ("rải cụm thì nó là lý do để đi chiếm đất") nhưng trữ lượng cũ
    // lại lặng lẽ vô hiệu hoá.
    STONE_CLUSTERS: 7, STONE_RADIUS: 4, STONE_DENSITY: 0.88, STONE_PER_ROCK: 95,

    // ================================================================
    // CHIA TÀI NGUYÊN BAN ĐẦU — bốc ngẫu nhiên toàn bản đồ là một cái xổ số
    // ================================================================
    // Cho tới bản này mọi cụm tài nguyên đều bốc `Math.random()` trên toàn bản đồ,
    // và bốn điểm xuất phát thì cố định ở bốn góc phần tư. Với 14 cụm đá trên
    // 74.800 ô, phương sai của một phép bốc đều là rất lớn: hoàn toàn có thể xảy ra
    // (và đã xảy ra) chuyện một bộ lạc có ba mỏ đá trong bán kính 20 ô còn bộ lạc
    // đối diện không có mỏ nào trong 90 ô. Mà đá gác cửa Đồ Sắt, Hoàng Kim và Kỳ
    // quan — nên kết cục của cả kỷ nguyên được quyết ở tick 0, trước khi một gen
    // nào kịp biểu hiện.
    //
    // Đó là hỏng ĐÚNG cái thứ dự án này tồn tại để xem: nếu thắng thua do xổ số bản
    // đồ thì tín hiệu chọn lọc lên policy bị nhiễu che mất, và bốn kỷ nguyên liền
    // "học" được bốn thứ khác nhau vì lý do không liên quan gì tới chiến lược.
    //
    // HAI TẦNG, và tầng thứ nhất mới là tầng quan trọng:
    //  1. BỘ KHỞI ĐẦU — mỗi bộ lạc được BẢO ĐẢM đúng ngần này cụm mỗi loại, đặt
    //     trong một vành đai quanh kinh đô của chính nó. Bảo đảm chứ không phải
    //     "trung bình thì có": đây là sàn, và sàn là thứ duy nhất xoá được cái ca
    //     xấu nhất.
    //  2. PHẦN CÒN LẠI chia ĐỀU cho bốn góc phần tư thay vì bốc trên toàn bản đồ.
    //     Giữ lại ngẫu nhiên bên trong mỗi góc — vẫn còn địa lý để khám phá, chỉ
    //     không còn chuyện một góc trắng trơn.
    //
    // ----------------------------------------------------------------
    // BỘ KHỞI ĐẦU DÙNG CHUNG MỘT KHUÔN, ĐẶT ĐỐI XỨNG GƯƠNG
    // ----------------------------------------------------------------
    // Bản đầu của khối FAIR chỉ ghim DẢI KHOẢNG CÁCH: mỗi bộ lạc được bảo đảm một
    // cụm đá đâu đó trong vành 20-38 ô. Nghe thì công bằng. Đo ra thì không, vì
    // vành đai mới là một trong BA thứ quyết định lợi thế, và hai thứ kia vẫn được
    // bốc lại độc lập cho từng bộ lạc:
    //   · bán kính thật trong vành (20 hay 38 — chênh gần gấp đôi quãng đường),
    //   · SỐ Ô của cụm (scatterCluster bốc từng ô theo xác suất, nên hai cụm cùng
    //     tham số vẫn ra 38 và 57 ô).
    // Đo 25 bản đồ × 4 bộ lạc, tổng tài nguyên trong bán kính 30 ô quanh kinh đô,
    // tỉ lệ giàu nhất / nghèo nhất:
    //     gỗ 1,68×  ·  quả 1,81×  ·  VÀNG 3,19× (xấu nhất 12,25×)
    //     ĐÁ 38× — và 13/100 bộ lạc KHÔNG CÓ MỘT VIÊN ĐÁ NÀO trong bán kính đó.
    // Vành đá 20-38 là thủ phạm trực tiếp của dòng cuối: tâm cụm ở 38 với bán kính
    // cụm 5 thì gần như cả cụm nằm NGOÀI vùng làm ăn giai đoạn đầu. Một bảo đảm
    // tính bằng thước đo mà người chơi không dùng thì không bảo đảm được gì.
    //
    // Bản này bảo đảm bằng XÂY DỰNG chứ không bằng xác suất: mỗi suất trong bộ
    // khởi đầu sinh ĐÚNG MỘT khuôn cụm (danh sách ô lệch), bốc ĐÚNG MỘT bán kính,
    // rồi đóng dấu khuôn đó cho cả bốn bộ lạc theo phép ĐỐI XỨNG GƯƠNG qua tâm bản
    // đồ. Bốn bộ lạc vì thế có cùng số ô, cùng trữ lượng, cùng khoảng cách — chỉ
    // khác HƯỚNG. Không còn gì để bốc trượt.
    //
    // Vì sao đối xứng gương chứ không phải cùng một góc: cùng góc thì cả bốn cụm
    // đá đều nằm về phía đông-bắc của chủ nó, tức là ba bộ lạc quay lưng vào nhau
    // còn một bộ lạc bị kẹp — bất đối xứng CHIẾN LƯỢC lại quay về. Gương qua tâm
    // thì thế đứng của bốn bên là ảnh của nhau, đúng nghĩa "ngang nhau".
    //
    // Vành đai đã kéo hết vào trong 30 ô (trừ bán kính cụm) để cả cụm nằm trong
    // vùng làm ăn thật. Đá vẫn là thứ ở XA NHẤT trong bốn loại — nó vẫn phải đi
    // mới có, chỉ là đi một quãng mà cả bốn bộ lạc đều đi như nhau.
    //
    // Đây CHỈ là cái sàn: phần còn lại của bản đồ vẫn bốc ngẫu nhiên theo góc phần
    // tư, nên vẫn có bộ lạc gặp may hơn. Cái bị xoá là ca "không có gì cả".
    // ĐẤT TRỐNG QUANH KINH ĐÔ — bán kính dọn sạch MỌI tài nguyên lúc lập quốc.
    //
    // Từ khi ô tài nguyên chặn chỗ xây, vành đai này không còn là chuyện thẩm mỹ mà
    // là ĐIỀU KIỆN SỐNG: bản đồ mới có cụm rất đặc, nên một kinh đô bốc trúng giữa
    // một vạt quả 88% sẽ không tìm nổi chỗ đặt cái nhà thứ hai. Trước bản này
    // clearArea chỉ chặt CÂY (thứ duy nhất chặn đường), giờ nó phải dọn cả bốn loại.
    //
    // 16 ô cho một khoảnh trống ~800 ô — đủ cho kinh đô, chục nhà ở, trại lính,
    // xưởng và đền mà vẫn còn chỗ thở. Đây là "đủ thoáng để phát triển ban đầu";
    // phần "khai thác dần ra để mở rộng" nằm ở việc mọi mỏ đều nằm NGOÀI vành này.
    CLEAR_R: 16,

    FAIR: {
      // Vành đai đã đẩy hẳn ra ngoài vùng dọn quang (16) cộng bán kính cụm, nếu
      // không thì chính clearArea sẽ xoá mất một phần bộ khởi đầu vừa đặt. Hệ quả
      // cố ý: từ bản này KHÔNG mỏ nào nằm sát nhà nữa — dân phải đi 22-35 ô mới tới
      // chỗ làm, và đó chính là bài toán mà Kho hàng sinh ra để giải.
      KIT: [
        { type: 'wood',  count: 2, ring: [26, 35] },
        { type: 'food',  count: 2, ring: [23, 31] },
        { type: 'gold',  count: 1, ring: [22, 30] },
        { type: 'stone', count: 1, ring: [25, 34] }
      ],
      // ----------------------------------------------------------------
      // VÙNG SÂN NHÀ CHỈ CÓ BỘ KHỞI ĐẦU
      // ----------------------------------------------------------------
      // Khuôn dùng chung đã làm cho phần ĐƯỢC BẢO ĐẢM bằng nhau tuyệt đối, nhưng
      // tầng rải ngẫu nhiên vẫn đổ thêm lên trên: đo 100 mẫu, tỉ lệ giàu/nghèo
      // trong bán kính 30 ô còn vàng 2,71× (xấu nhất 7,0×) và đá 2,26× (5,22×).
      // Cái sàn đã bằng nhau; cái TRẦN thì không, và ở giai đoạn đầu thì trần mới
      // là thứ quyết định ai lên đời trước.
      //
      // Nên: cụm ngẫu nhiên KHÔNG được rơi vào trong bán kính này quanh bất kỳ
      // kinh đô nào (tính cả bán kính cụm, nếu không thì một cụm tâm ở 31 ô vẫn
      // thò một nửa vào trong). Trong vùng đó chỉ còn đúng bộ khởi đầu — mà bộ
      // khởi đầu thì bốn bộ lạc giống hệt nhau.
      //
      // Ý nghĩa thật của con số này: nó là RANH GIỚI giữa thí nghiệm và thế giới.
      // Bên trong, mọi bộ lạc xuất phát từ cùng một điều kiện, nên chênh lệch về
      // sau đọc được là do GEN CHIẾN LƯỢC chứ không do bản đồ — đó là toàn bộ lý
      // do dự án này tồn tại. Bên ngoài, bản đồ lại hoang dã và bất công như cũ,
      // nên vẫn có chỗ để bành trướng, để tranh nhau, để địa lý kể chuyện.
      //
      // 46 ô: phải phủ trọn tầm với xa nhất của bộ khởi đầu (rừng ở vành 35 cộng
      // bán kính cụm 8 = 43) cộng biên. Hẹp hơn thì một cụm ngẫu nhiên có thể nằm
      // chồng lên cụm khởi đầu và lời bảo đảm "bốn bộ lạc như nhau" rò ra ở đúng
      // vành ngoài — mà vành ngoài mới là chỗ dân thật sự tới làm.
      EXCLUSIVE_R: 46
    }
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
    // 10 -> 9 px/ô, và đây là một ràng buộc BỘ NHỚ chứ không phải thẩm mỹ. Lớp nền
    // là một canvas GRID × LAYER_PX: ở 340x220 nó là 3400x2200 (~30 MB), ở 480x300
    // với 10 px/ô nó thành 4800x3000 = 14,4 triệu pixel (~58 MB) — vượt trần diện
    // tích canvas của một số trình duyệt (Safari kẹp quanh 16,7 triệu px và bắt đầu
    // trả về canvas TRẮNG chứ không báo lỗi). 9 px/ô cho 4320x2700 = 11,7 triệu px
    // (~47 MB), còn dư biên. Giá phải trả: ở zoom gần nhất (14 px/ô) lớp nền bị
    // phóng 1,56 lần thay vì 1,40 — nhoè thêm một chút, đổi lấy chuyện nó hiện ra.
    LAYER_PX: 9,           // độ phân giải lớp nền vẽ sẵn (px/ô); phóng to hơn thì scale mềm, không vẽ lại
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
    // ================================================================
    // NGƯỠNG "MỎ ĐÃ CẠN" — một con số, ba chỗ đọc
    // ================================================================
    // Trước bản này ba chỗ dùng BA ngưỡng khác nhau cho cùng một câu hỏi:
    //   · findNearestResource bỏ qua ô có `amount < 1`
    //   · nhánh 'gather' rời mỏ khi `amount < 1`
    //   · nhưng removeResource chỉ chạy khi `amount <= 0.01`
    // Nên mọi ô tài nguyên trên bản đồ đều KẾT THÚC ĐỜI trong khoảng (0,01 ; 1):
    // không ai thèm tới nữa (dưới 1), mà cũng không bao giờ bị xoá (trên 0,01).
    // Đo ở tick 7.000: 274 ô kẹt như vậy, ô thấp nhất còn 0,45, và số ô ĐƯỢC XOÁ
    // trong suốt cả kỷ nguyên là 0.
    //
    // Bao lâu nay lỗi này vô hình vì hai lý do vừa mất cả hai ở Phase 3.25: ô tài
    // nguyên không chặn chỗ xây (nên một ô ma nằm đó chẳng phiền ai), và bụi quả
    // mọc lại (nên chúng tự hồi khỏi vùng kẹt). Giờ thì nó giết đúng cơ chế vừa
    // thêm vào: "mỏ cạn thì biến mất, xây nhà được" không bao giờ chạy một lần nào.
    //
    // Chữa bằng cách cho cả ba chỗ đọc CHUNG một hằng số. Đây là dạng lỗi mà dự án
    // này đã gặp đủ nhiều lần để đáng ghi thành luật: hai ngưỡng "gần bằng nhau"
    // cho cùng một khái niệm thì khoảng hở giữa chúng luôn có thứ rơi vào — hình
    // vuông vs hình tròn ở kho hàng, tâm vs mép ở tầm bắn, và giờ là 0,01 vs 1.
    RES_MIN: 1,
    // ================================================================
    // MỘT Ô — MỘT NGƯỜI
    // ================================================================
    // Đo ở tick 4.117: 70 người đang hái, nhưng chỉ trên 30 Ô. Phân bố: 18 ô có
    // 1 người, 5 ô có 2, 3 ô có 3, một ô có 6, một ô có 7, HAI ô có 10 người.
    // Mỗi người trong số 10 đó ăn đủ nhịp hái riêng, nên một ô đơn lẻ đang gánh
    // sản lượng của mười ô — và cả 2.550 ô quả còn lại không có lý do gì để ai đi tới.
    //
    // Luật này là cái đòn bẩy thật của cả đợt cân bằng, mạnh hơn cả việc hạ REGROW:
    // hạ sản lượng mỗi ô thì dân vẫn chụm vào đúng chỗ cũ, chỉ nghèo đi. Ép mỗi ô
    // một người thì lao động BỊ RẢI RA — mà rải ra chính là thứ đưa người tới bụi
    // quả cách nhà 19 ô và tới mỏ đá cách nhà 27 ô.
    //
    // GIỮ CHỖ BẰNG DẤU THỜI GIAN, không bằng sổ đăng ký: ô ghi `worker` (id người)
    // và `workerTick` (lần cuối người đó thật sự đứng hái). Chỗ giữ tự hết hạn sau
    // CLAIM_TTL tick. Đây là chỗ cố ý KHÔNG dùng một danh sách phải dọn: người dân
    // chết giữa đường, đổi nghề, bị đuổi, hoặc bỏ mỏ vì kẹt — bốn đường thoát mà
    // một sổ đăng ký phải nhớ xoá ở cả bốn, và quên một đường là ô đó bị khoá vĩnh
    // viễn. Dấu thời gian thì không có đường nào để quên.
    WORKERS_PER_CELL: 1,
    CLAIM_TTL: 25,
    DEPOSIT_RANGE: 2,      // đứng cách nhà <= ngần này ô là trả được hàng
    // Chi phí nuôi quân/tick. Đây là thứ tạo SỨC CHỨA thật cho nền văn minh:
    // không có nó thì dân số chỉ bị chặn bởi số nhà, và mọi bộ lạc đều phình vô
    // hạn. Có nó thì bành trướng quá nhanh = chết đói (xem starvation ở tickTribeEconomy).
    UPKEEP_VILLAGER: 0.015,
    UPKEEP_SOLDIER: 0.06,
    // ============================================================
    // TRẦN DÂN SỐ CỨNG CỦA MỘT BỘ LẠC (Phase 3.30)
    // ============================================================
    // 300, và nó là một LUẬT CHƠI chứ không còn là một cái phanh an toàn. Bản
    // trước có số 420 gõ thẳng vào câu `if` quyết định xây thêm nhà; nghĩa là nó
    // chặn việc DỰNG THÊM SỨC CHỨA, không chặn sức chứa — một bộ lạc lập đô trên
    // đất chiếm (COLONY, tối đa 3 kinh đô) vẫn vượt qua nó mà không có gì cản, và
    // bảng bộ lạc thì hiện một con số "trần" mà chính bộ lạc đó đang đứng trên.
    //
    // Vì sao 300 chứ không cao hơn: từ 3.30, MỌI người lính đều được đổi ra từ một
    // dân thường (xem trainAtBuildings). Nghĩa là trần dân số giờ là trần của CẢ
    // nền kinh tế lẫn CẢ quân đội cộng lại — cùng một cái ví. Để nó ở 420 thì lựa
    // chọn "dân hay lính" gần như không phải trả giá gì trong phần lớn kỷ nguyên,
    // và cả cơ chế vừa thêm mất hết sức nặng.
    //
    // ĐO ĐƯỢC GÌ: 8 ván 14.000 tick, số tick mà MỘT bộ lạc bất kỳ chạm trần 300 là
    // ĐÚNG 0. Sức chứa cao nhất quan sát được là 266-274 (đủ nhà, nhưng chưa tới
    // 300), còn dân số thật cao nhất chỉ 117-184. Nghĩa là ở thế cân bằng hiện tại
    // con số này CHƯA phải thứ đang chặn ai — thứ đang chặn là cơ chế nhập ngũ cộng
    // với kinh tế. Ghi ra đây thay vì im lặng, vì một hằng số không bao giờ chạm
    // tới rất dễ bị lần sửa sau đọc nhầm thành "đã cân bằng ở mức này".
    POP_HARD_CAP: 300,
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

  // ============================================================
  // THỂ LỰC (Phase 3.35) — cái giá của việc DI CHUYỂN
  // ============================================================
  // Cho tới bản này, tốc độ là một hằng số của LOÀI: kỵ xạ 1,65 ô/tick từ tick đầu
  // tới tick cuối, sói 1,5, dân thường 1. Hệ quả không phải "kỵ xạ mạnh" mà là một
  // điều nặng hơn nhiều: **một đơn vị nhanh hơn thì KHÔNG BAO GIỜ bị bắt**. Không
  // phải khó bắt — là không thể, theo đúng nghĩa số học, vì khoảng cách giữa kẻ
  // chạy và kẻ đuổi tăng đơn điệu và không có gì trong mô phỏng làm nó giảm.
  //
  // ĐO ĐƯỢC (4 kỷ nguyên, 42.000 tick, 7.170 cuộc rượt dài ≥3 tick):
  //     trung vị            30 tick
  //     p90                 70 tick
  //     p99                284 tick
  //     DÀI NHẤT         1.206 tick   ← một phút rưỡi đồng hồ thật, một cuộc rượt
  //     kết thúc mà con mồi VẪN SỐNG      37,2%
  //     % thời gian lính đang rượt        13,2%
  // Một phần tám thời gian của cả quân đội đổ vào những cuộc rượt mà hơn một phần
  // ba không đi tới đâu. Đó không phải chiến đấu, đó là hai chấm màu chạy song song.
  //
  // CÁCH CHỮA: tiêu hao theo Ô ĐI ĐƯỢC, không theo tick. Đây là quyết định trung
  // tâm của cả cơ chế và nó tự động giải đúng bài toán trên — kẻ chạy nhanh gấp
  // 1,65 lần thì cũng đốt thể lực nhanh gấp 1,65 lần, nên lợi thế tốc độ có HẠN MỨC
  // tính bằng quãng đường chứ không phải vô hạn theo thời gian. Đuổi theo không còn
  // là "chạy nhanh hơn" mà là "bền hơn", và đó là một trục hoàn toàn mới.
  //
  // HỒI theo TỈ LỆ sức chứa, KHÔNG theo lượng tuyệt đối. Bài học đã trả giá ở
  // HERO.HEAL_RATE: hồi tuyệt đối thì kẻ có bể chứa lớn bị PHẠT (nằm hồi lâu hơn),
  // nên "quái vật dồi dào thể lực" sẽ tự biến thành "quái vật kiệt sức vĩnh viễn"
  // — đúng ngược điều muốn. Hồi theo tỉ lệ thì mọi loài mất cùng một KHOẢNG THỜI
  // GIAN (~135 tick từ cạn lên đầy), còn "dồi dào" giữ đúng nghĩa của nó: chạy xa
  // hơn, không phải hồi nhanh hơn.
  STAMINA: {
    // ================================================================
    // SỨC CHỨA ĐO BẰNG GIÂY CHẠY NƯỚC RÚT, KHÔNG BẰNG QUÃNG ĐƯỜNG
    // ================================================================
    // Bảng này bị viết lại một lần sau khi một thí nghiệm có kiểm soát bác bỏ bản
    // đầu. Bản đầu cho kẻ nhanh sức chứa LỚN HƠN (kỵ xạ 175 ô, bộ binh 130) theo
    // lối nghĩ "ngựa thì bền hơn người". Chạy mô hình thật: kỵ xạ bỏ chạy khỏi bộ
    // binh, khoảng cách nở ra 56,8 ô rồi ĐÓNG BĂNG ở đó tới vô tận — vì cả hai
    // cùng chạm sàn kiệt sức và từ đó đi đúng cùng một tốc độ. Cơ chế không bắt
    // được ai cả; nó chỉ dời cuộc rượt sang một khoảng cách cố định khác.
    //
    // Điều kiện để một cuộc rượt KẾT THÚC được, đọc thẳng ra từ mô hình: kẻ chạy
    // phải kiệt sức SỚM HƠN (tính bằng TICK) kẻ đuổi, và khoảng thời gian giữa hai
    // mốc kiệt sức phải đủ dài để nuốt hết khoảng cách đã nở ra. Sức chứa tính
    // bằng Ô thì kẻ nhanh tự động được nhiều tick hơn ở cùng một con số — nên bảng
    // phải nghĩ bằng GIÂY: mỗi dòng dưới đây là "chạy hết sức được bao nhiêu tick",
    // rồi mới nhân với tốc độ của loài đó.
    //
    //   kỵ binh ~45 tick · bộ binh ~130 tick · dân thường ~45 tick · cỗ máy ~55
    //
    // Đọc thành lời: **ngựa nước rút rất nhanh nhưng rất ngắn.** Lợi thế tốc độ
    // của kỵ binh còn nguyên trong mọi pha giao tranh bình thường (45 tick là dài
    // hơn 90% các cuộc rượt) — nó chỉ mất đi ở đúng cái đuôi dài, tức là đúng chỗ
    // yêu cầu gốc trỏ tới.
    //
    // ĐO LẠI TRÊN MÔ HÌNH (bắt kịp = khoảng cách về ≤1 ô):
    //     kỵ xạ 175 vs lính 130 (bản đầu)  KHÔNG BAO GIỜ, đỉnh 56,8 ô
    //     kỵ xạ  70 vs lính 130            bắt kịp ở tick 104, đỉnh 24,7 ô
    //     kỵ sĩ  77 vs lính 130            bắt kịp ở tick 115, đỉnh 26,8 ô
    //     lính  130 vs lính 130            không bao giờ — ĐÚNG, hai kẻ ngang sức
    //                                      thì không ai bắt được ai, đó không phải
    //                                      một cuộc chạy trốn mà là một thế hoà.
    // Và vì thế bộ binh KHÔNG được hạ xuống dưới 130: thử 110 thì kẻ đuổi kiệt sức
    // trước kẻ chạy và cả cơ chế lật ngược.
    CAP: {
      villager: 45,                 // thấp nhất bảng, đúng yêu cầu — và ngắn hơn hẳn cơn hoảng loạn (FLEE_TICKS)
      soldier: 130, archer: 120, medic: 100, quarter: 110, standard: 110,
      knight: 77, horsearcher: 70,  // ~45 tick nước rút — xem bảng đo ngay trên
      elephant: 70,                 // ~61 tick: voi không nước rút, nó đè
      catapult: 55, ballista: 55,   // cỗ máy: nặng, gần như không được phép chạy xa
      // Anh hùng 200 ô ở tốc ~1,35 là ~148 tick — DÀI HƠN bộ binh (130) một cách
      // có chủ ý, và đó là con số giữ cho cơ chế rút lui của anh hùng còn sống: cả
      // quyết định đánh-hay-lui giả định anh ta về được tới sân nhà. Cho anh hùng
      // kiệt sức trước kẻ truy đuổi là lặng lẽ xoá luôn một nửa cây quyết định đó.
      hero: 200,
      _default: 130
    },
    // Quái: "có thể lực nhưng rất dồi dào". 900 ô là ~4 lần một người lính, đủ để
    // cả một cuộc đi săn xuyên bản đồ (480 ô ngang) diễn ra ở tốc độ đầy đủ. Nghĩa
    // là thể lực của quái gần như chỉ hiện ra ở đúng một tình huống: con mồi chạy
    // vòng quanh mãi không chịu chết. Đó cũng đúng là tình huống nó cần hiện ra.
    MONSTER_CAP: 900,
    BOSS_CAP: 4000,
    DRAIN: 1,          // thể lực mất cho mỗi Ô đi được
    // HỒI NHANH LÀ CÓ CHỦ Ý — và con số này đã bị đo lại một lần rồi mới đúng.
    //
    // Bản đầu để 0,0075 (~135 tick từ cạn lên đầy) theo lối nghĩ "thể lực là một
    // khoản tài nguyên phải quản". Đo 1.200 tick thì người dân sống ở mức 58% sức
    // chứa và KIỆT SỨC 32,8% thời gian — không phải vì họ chạy nhiều (chỉ 29,7% số
    // tick là có bước chân) mà vì nhịp làm việc của họ toàn những quãng nghỉ 3
    // tick, quá ngắn để hồi kịp. Nghĩa là cơ chế đang đánh vào cả nền KINH TẾ,
    // trong khi thứ nó sinh ra để chạm tới là những cuộc rượt đuổi.
    //
    // 0,02 (~50 tick từ cạn lên đầy) đổi bản chất của cơ chế từ KẾ TOÁN sang TÍNH
    // LIÊN TỤC: quãng nghỉ nào cũng đủ để hồi gần đầy, nên đi làm, hành quân, đánh
    // trận đều không chạm tới nó. Thứ duy nhất không có quãng nghỉ nào là một cuộc
    // chạy trốn hoặc một cuộc rượt — và đó đúng là hai chữ trong yêu cầu gốc.
    // Nói cách khác: thể lực không đo bạn đã đi bao xa, nó đo bạn đã chạy bao lâu
    // MÀ KHÔNG DỪNG. Rẻ hơn, dễ đọc hơn, và chỉ hiện ra ở đúng cảnh cần nó hiện.
    REGEN_FRAC: 0.02,
    // Dưới ngưỡng này mới bắt đầu chậm lại. 0,35 chứ không phải 1,0 là chỗ giữ cho
    // cơ chế không đụng vào 90% các trận đánh: trung vị một cuộc rượt là 30 tick,
    // mà một người lính chạy được 130 ô trước khi chạm ngưỡng 0,35×130 = 45 ô còn
    // lại. Nghĩa là mọi cuộc rượt ngắn diễn ra y hệt như trước bản này; chỉ đúng
    // cái đuôi dài — thứ người xem thấy và gọi là "đuổi mãi không kịp" — mới đổi.
    TIRED: 0.35,
    // ================================================================
    // TỐC ĐỘ KHI KIỆT SỨC LÀ MỘT SỐ TUYỆT ĐỐI, KHÔNG PHẢI MỘT HỆ SỐ NHÂN
    // ================================================================
    // Bản đầu để `FLOOR: 0.5` nhân vào tốc độ cơ bản, và phép đo bác bỏ nó thẳng
    // thừng: 20.798 cuộc rượt, tỉ lệ thời gian rượt đuổi 13,2% → **27,7%**, p90 từ
    // 70 lên 93 tick, dài nhất từ 1.206 lên 2.232. Đúng ngược điều cần làm.
    //
    // Vì sao: nhân cùng một hệ số vào CẢ HAI bên thì tỉ số tốc độ giữ nguyên. Kỵ xạ
    // 1,65 kiệt sức còn 0,825, bộ binh 1,0 kiệt sức còn 0,5 — kẻ chạy vẫn nhanh gấp
    // 1,65 lần kẻ đuổi, y như lúc cả hai còn sung sức. Cơ chế không rút ngắn khoảng
    // cách, nó chỉ kéo dài thời gian. Một hệ số nhân KHÔNG BAO GIỜ đóng được một
    // khoảng cách tỉ lệ; chỉ một cái TRẦN mới làm được.
    //
    // 0,55 ô/tick là trần chung cho mọi loài đã kiệt sức. Đọc thành lời: **một con
    // ngựa mệt không còn là một con ngựa nhanh.** Kỵ xạ chạy trốn đủ lâu sẽ tụt về
    // 0,55 trong khi người lính vừa tới còn nguyên 1,0 — và đó là lần đầu tiên
    // trong mô phỏng này một đơn vị chậm hơn bắt kịp được một đơn vị nhanh hơn.
    // Lợi thế tốc độ vẫn còn nguyên, nó chỉ không còn VÔ HẠN nữa.
    EXHAUST_SPEED: 0.55
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
  // ------------------------------------------------------------------
  // PHASE 3.28 — `trainTicks` LEO DỐC HẲN THEO BẬC QUÂN
  // ------------------------------------------------------------------
  // Bảng cũ đã leo theo bậc, nhưng leo quá nông để có nghĩa: kỵ sĩ 90 tick so với
  // bộ binh 50 là gấp 1,8 lần, trong khi giá tiền gấp 2,2 và sức mạnh gấp 1,8.
  // Nghĩa là THỜI GIAN gần như không phải một khoản chi phí — bộ lạc chỉ cần đủ
  // tiền, và cái lò thì luôn rảnh.
  //
  // Và nó luôn rảnh vì một lý do tệ hơn hẳn: trước bản này vòng huấn luyện tìm
  // ĐÚNG MỘT công trình nguồn (`buildings.find`) rồi đếm giờ trên một cái đồng hồ
  // của BỘ LẠC. Xây cái trại lính thứ hai không rút ngắn một tick nào. Cả một
  // quyết định xây dựng — cái quyết định trực tiếp nhất mà một trò chơi kiểu này
  // có thể có — không tồn tại.
  //
  // Từ bản này mỗi CÔNG TRÌNH là một cái lò riêng, chạy song song (xem vòng huấn
  // luyện trong tickTribeEconomy). Nên `trainTicks` mới thật sự là một cái giá,
  // và nó phải đủ nặng ở bậc cao để câu trả lời "muốn ra quân nhanh hơn thì làm
  // gì" là XÂY THÊM LÒ chứ không phải chờ.
  //
  // Dân thường giữ nguyên 35: nó là động cơ kinh tế, và nhà chính thì chỉ có một.
  // Kéo dài lò dân là bóp nghẹt mọi thứ ở đằng sau, kể cả chính việc xây thêm lò.
  UNIT: {
    VILLAGER: { hp: 30, attack: 2, defense: 0, speed: 1, cost: { food: 45 }, trainTicks: 35 },
    SOLDIER:  { hp: 65, attack: 7, defense: 2, speed: 1, cost: { food: 55, gold: 20 }, trainTicks: 55 },
    // CUNG THỦ — mở khoá ở Đồ Đồng, huấn luyện tại Xưởng thợ.
    //
    // Vì sao đáng thêm, ngoài chuyện "một loại quân nữa": trước bản này mọi trận
    // đánh đều là hai đám chấm màu chạm nhau rồi trừ máu — không có ĐỘI HÌNH, vì
    // không có lý do gì để một đơn vị muốn đứng ở chỗ khác với đơn vị bên cạnh.
    // Tầm bắn tạo ra lý do đó: cung thủ giòn (42 máu, thua cả dân thường có giáp
    // thời đại) nên phải nấp sau lính cận chiến, và người xem NHÌN THẤY được điều
    // đó thành hình mà không cần ai giải thích.
    ARCHER:   { hp: 42, attack: 6, defense: 0, speed: 1, cost: { food: 40, wood: 45 }, trainTicks: 72,
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
                cost: { food: 80, gold: 50 }, trainTicks: 125 },

    // KỴ XẠ (Hoàng Kim) — bắn 5 ô rồi bỏ chạy. Đơn vị mạnh nhất của cả cây quân
    // sự và cố tình nằm ở bậc thời đại mà rất ít bộ lạc chạm tới: nó là PHẦN
    // THƯỞNG cho một ván chơi đi trọn cây công nghệ, không phải một nấc thang
    // bắt buộc. minRange 2 + tốc độ 1,65 nghĩa là nó tự lùi ra khỏi tầm với của
    // bộ binh trong khi vẫn bắn — thứ duy nhất trên bản đồ làm được điều đó.
    HORSEARCHER: { hp: 80, attack: 9, defense: 1, speed: 1, speedMult: 1.65,
                   cost: { food: 70, wood: 50, gold: 55 }, trainTicks: 145,
                   range: 5, cooldown: 18, minRange: 2 },
    // MÁY BẮN ĐÁ — mở khoá ở Đồ Sắt, huấn luyện tại Xưởng thợ.
    //
    // Vũ khí CÔNG THÀNH: sát thương lên công trình đã nhân 3 như mọi đơn vị, cộng
    // thêm sát thương lan quanh điểm rơi. Chậm, giòn khi bị áp sát, đắt — nên nó
    // là khoản đầu tư chỉ đáng khi ĐANG ĐỊNH PHÁ THÀNH, đúng nghĩa một lựa chọn
    // chiến lược chứ không phải "lính xịn hơn".
    // `siege: true` là thứ MIỄN cho nó khỏi hình phạt đập nhà (xem BUILD_PENALTY).
    // Cờ trên SPEC chứ không phải một danh sách tên viết cứng trong dealDamage:
    // loại công thành tiếp theo chỉ cần thêm đúng một từ ở đây là vào đúng nhóm,
    // không phải đi tìm mọi chỗ có chuỗi 'catapult'. Cùng lý do đã viết cho bảng
    // UNIT_SPEC và MILITARY_SET — thêm loại thứ N vào một chuỗi `===` thì loại mới
    // lặng lẽ rơi vào nhánh mặc định, mà nhánh mặc định ở đây là "bị phạt 80%".
    // PHASE 3.30 — TẦM 9→12, ĐÒN 20→30, MÁU 130→200. Ba con số này đi cùng nhau vì
    // chúng cùng trả lời một câu vừa đổi: tường thành giờ to gấp đôi và dày gấp đôi,
    // nên "phá thành là việc của máy bắn đá" chỉ còn đúng nếu cỗ máy thật sự làm
    // nổi việc đó trong một đời người.
    //
    // TẦM 12 là con số quan trọng nhất, và nó đảo một thế cân bằng đã ghi rõ ở
    // TOWER_STACK: tháp canh cấp 1 bắn 10 ô, tức là trước bản này cỗ máy (9 ô) phải
    // bước vào tầm tháp trước khi tới được tầm của mình. Giờ ngược lại — máy bắn đá
    // đứng ngoài tầm tháp cấp 1 mà vẫn với tới.
    //
    // BẢN NHÁP CỦA CHÚ THÍCH NÀY NÓI THÊM MỘT CÂU NỮA, và phép đo đã bác bỏ nó:
    // "nên bên thủ PHẢI xây chồng lên tầng 2 mới đuổi được nó ra". Đo A/B 4 seed
    // (buff vs bảng cũ) thì cấp tháp cuối ván gần như y hệt nhau — 16-21 cái tháp
    // và gần như TẤT CẢ đều đã ở tầng 3 ở CẢ HAI nhánh. Lý do đã đo được ở chỗ
    // khác trong cùng bản này: 72/77 tháp lên tầng 3 bất kể có mối đe doạ nào hay
    // không, vì bộ não xây chồng ngay khi đủ hạn ngạch. Một cỗ máy bắn xa hơn
    // không tạo ra được áp lực mới lên một quyết định vốn đã luôn được bấm.
    // Tổng số nhà bị phá cũng KHÔNG đổi theo hướng đọc được (60/22/28/20 so với
    // 8/23/32/21 — biến thiên giữa các seed lớn hơn hẳn biến thiên giữa hai nhánh).
    // Thứ buff này thật sự mua được là SỨC ĐÁNH MỘT CỖ MÁY (đòn 30 nhân 3 công
    // thành = 90 mỗi phát vào tường 520-1800 máu, so với 60 trước đây), tức là một
    // ô tường thủng nhanh hơn một phần ba. Nó không mua được một thế trận mới.
    //
    // MÁU 200 vì với tầm 12 nó đứng xa hơn, nhưng thứ giết nó chưa bao giờ là tháp
    // — mà là kỵ binh xông vào. 130 máu nghĩa là hai đòn kỵ sĩ; 200 cho nó kịp
    // bắn thêm một quả trước khi ngã, đủ để một kíp máy có hộ vệ là một quyết định
    // đáng, thay vì một khoản lỗ chắc chắn.
    CATAPULT: { hp: 200, attack: 30, defense: 1, speed: 1, cost: { wood: 150, gold: 80, stone: 70 }, trainTicks: 195,
                range: 12, cooldown: 46, minRange: 3, splash: 2.4, siege: true },
    // THẦY LANG — đơn vị đầu tiên trong game KHÔNG có ô sát thương.
    //
    // Vì sao phải là một ĐƠN VỊ chứ không phải thêm một hào quang nữa cho Nhà y tế:
    // đo thật 3 kỷ nguyên (10.831 tick) với trạm xá thuần công trình, tổng lượng
    // máu hồi được của cả bốn bộ lạc là 224 — chưa bằng bốn người lính. Không phải
    // vì hệ số quá thấp, mà vì KHOẢNG CÁCH: quãng đường trung bình từ một thương
    // binh về tới trạm xá gần nhất là 65,8 ô, còn trạm xá thì đứng yên ở kinh đô.
    // Một cơ chế hồi máu neo vào công trình chỉ hoạt động ở nơi không có ai bị
    // thương. Thầy lang đảo chiều bài toán: thay vì bắt thương binh đi 66 ô về
    // hậu phương, đưa hậu phương ra tiền tuyến.
    //
    // 0,45 máu/tick là con số cố ý đặt NGAY DƯỚI sát thương đều của một người lính
    // (7 sát thương / 8 tick hồi chiêu ≈ 0,875, còn một nửa sau khi trừ giáp). Trên
    // ngưỡng đó thì một thầy lang khiến một người lính bất tử trước một đối thủ, và
    // trận đánh không bao giờ kết thúc; dưới ngưỡng đó, thầy lang MUA THỜI GIAN chứ
    // không mua kết quả — vẫn phải có người đánh thắng.
    //
    // Không giáp, không vũ khí, 46 máu: yếu hơn cả dân thường có giáp thời đại. Đây
    // là phần trả giá, và nó phải nhìn thấy được — một đạo quân được vá máu liên tục
    // là một đạo quân có ĐIỂM YẾU ĐỨNG SAU LƯNG, và bên kia có quyền đi tìm nó.
    MEDIC:    { hp: 46, attack: 0, defense: 0, speed: 1, cost: { food: 60, gold: 25 }, trainTicks: 80 },

    // ĐỘI HẬU CẦN — đơn vị thứ ba trong game có ô sát thương bằng 0, và là đơn vị
    // đầu tiên mà thứ nó sản xuất ra KHÔNG phải máu, không phải sát thương, mà là
    // BÁN KÍNH HOẠT ĐỘNG của cả đạo quân.
    //
    // Ba đơn vị hỗ trợ giờ nằm trên ba trục vuông góc, và đó là điều kiện để đơn vị
    // thứ ba đáng tồn tại (luật đã đặt ra từ 12 loài quái ở Phase 3.22):
    //   · THẦY LANG — mua THỜI GIAN  (giữ người sống lâu hơn trong một trận)
    //   · QUÂN KỲ   — mua CƯỜNG ĐỘ   (đánh mạnh hơn trong đúng khoảng đó)
    //   · HẬU CẦN   — mua KHOẢNG CÁCH (đánh được ở nơi trước đây không tới nổi)
    // Một bộ lạc có cả ba không phải là "có ba lần cùng một thứ".
    //
    // Máu 70 — dai hơn thầy lang (46) và kém quân kỳ (95), giáp 1. Nó phải sống
    // được lâu hơn thầy lang vì nó đi ở ĐẦU đoàn quân chứ không ở cuối: chỗ đúng để
    // dựng trại là chỗ quân SẮP tới, không phải chỗ quân vừa rời. Nhưng vẫn không
    // đánh trả được — cùng lý do đã viết cho hai đơn vị kia: một đạo quân đi xa được
    // là một đạo quân có ĐIỂM YẾU ĐI CÙNG NÓ, và bên kia có quyền đi tìm cái yếu đó.
    //
    // Ra lò từ NHÀ CẦU NGUYỆN — xem TRAIN_SOURCE để biết vì sao không phải Đền thờ.
    QUARTER:  { hp: 70, attack: 0, defense: 1, speed: 1, cost: { food: 70, gold: 30 }, trainTicks: 95 },

    // ================================================================
    // BA BINH CHỦNG THIÊN TRIỀU (Phase 3.27) — mỗi loại MỘT ĐỘNG TỪ CHƯA AI CÓ
    // ================================================================
    // Luật tự đặt ra từ Phase 3.22 (12 loài quái) và trả giá đủ nhiều lần để tin:
    // một loại quân mới chỉ đáng tồn tại nếu nó LÀM ĐƯỢC MỘT VIỆC mà bảng hiện có
    // không làm được. Thêm "kỵ sĩ nhưng máu cao hơn" thì bảng chỉ số dài ra mà trận
    // đánh không đổi hình dạng — đó là thang bậc, không phải kéo-búa-bao, và cả khối
    // chú thích ở KNIGHT đã viết vì sao thang bậc là ngõ cụt.
    //
    // Ba động từ mới, và chúng cố ý nằm trên BA TRỤC KHÁC NHAU:
    //   · NỎ THẦN   — XUYÊN qua một hàng (trục hình học: đội hình dày thành điểm yếu)
    //   · VOI CHIẾN — GIẪM mọi thứ trên đường đi (trục di chuyển: đường đi là vũ khí)
    //   · QUÂN KỲ   — CỔ VŨ đồng đội quanh mình (trục hỗ trợ: không tự đánh, nhân sức)

    // NỎ THẦN — bắn một mũi tên XUYÊN THẲNG, trúng MỌI kẻ địch trên đường đạn.
    //
    // Vì sao đây là động từ mới chứ không phải "cung thủ mạnh hơn": sát thương lan
    // của máy bắn đá là một HÌNH TRÒN quanh điểm rơi, nên cách né nó là đứng thưa
    // ra. Mũi tên xuyên là một ĐOẠN THẲNG, nên cách né nó là đứng LỆCH HÀNG — hai
    // yêu cầu ngược nhau, và đó là lần đầu tiên đội hình của bên phòng thủ phải
    // chọn giữa hai thứ thay vì tối ưu một thứ. Bộ lạc `discipline` cao xếp hàng
    // đẹp (xem đội hình 3 hàng ở 06-movement) và chính vì thế ăn trọn một phát nỏ.
    //
    // Đắt hơn máy bắn đá về VÀNG nhưng rẻ hơn về gỗ/đá: nó là vũ khí chống QUÂN,
    // không phải chống thành (không có cờ `siege`, nên vẫn ăn phạt 80% khi đập nhà).
    // Hai cỗ máy cùng ra lò từ Xưởng thợ mà trả lời hai câu hỏi khác hẳn nhau.
    BALLISTA: { hp: 115, attack: 26, defense: 1, speed: 1, cost: { wood: 120, gold: 140, stone: 45 }, trainTicks: 210,
                range: 11, cooldown: 40, minRange: 3, pierce: 11, pierceWidth: 1.1 },

    // VOI CHIẾN — gây sát thương cho MỌI kẻ địch nó đi ngang qua, không cần lệnh.
    //
    // Động từ mới nằm ở chỗ nó KHÔNG PHẢI một đòn đánh: mọi đơn vị khác trong game
    // gây sát thương bằng cách DỪNG LẠI và nhắm vào một mục tiêu. Voi gây sát thương
    // bằng cách ĐI. Hệ quả trên màn hình là thứ chưa từng có: một khối quân đông
    // chặn đường voi thì chính sự đông đúc đó là thứ giết họ, và đạo quân phòng thủ
    // phải TÁCH RA để tránh — mà tách ra thì thua cận chiến. Không đơn vị nào khác
    // đặt ra được câu hỏi đó.
    //
    // Chậm (speedMult 1,15 — nhanh hơn bộ binh nhưng thua xa kỵ sĩ 1,7) và giòn hơn
    // vẻ ngoài (giáp 5 nhưng chỉ 330 máu cho cái giá đắt nhất bảng). Nó là một cái
    // BÚA, không phải một bức tường: đi thẳng qua thì tàn phá, bị vây lại thì chết.
    // `trample` = sát thương mỗi tick lên mọi địch trong bán kính `trampleR`.
    ELEPHANT: { hp: 330, attack: 21, defense: 5, speed: 1, speedMult: 1.15,
                cost: { food: 190, gold: 130, wood: 90 }, trainTicks: 240,
                trample: 3.2, trampleR: 1.9 },

    // QUÂN KỲ — không đánh ai. Đồng đội trong bán kính RALLY_R đánh mạnh hơn và đi
    // nhanh hơn.
    //
    // Đây là đơn vị thứ hai trong game có ô sát thương bằng 0, và nó cố ý là ANH EM
    // ĐỐI XỨNG của Thầy lang: thầy lang mua THỜI GIAN (giữ người sống lâu hơn), quân
    // kỳ mua CƯỜNG ĐỘ (làm mọi người đánh mạnh hơn trong đúng khoảng thời gian đó).
    // Hai đơn vị hỗ trợ trên hai trục vuông góc, nên một bộ lạc có cả hai không phải
    // là "có hai lần cùng một thứ" — nó là một đạo quân đánh nhanh hơn VÀ lâu hơn,
    // và cái giá là hai suất dân không cầm vũ khí.
    //
    // Hào quang KHÔNG CỘNG DỒN giữa nhiều lá cờ (xem rallyBonus): hai quân kỳ đứng
    // cạnh nhau chỉ bằng một. Không có luật đó thì chiến thuật tối ưu là gom mười lá
    // cờ vào một chỗ, và cả cơ chế biến thành một nút nhân sát thương — đúng cái bẫy
    // "một lựa chọn luôn có câu trả lời đúng thì không phải lựa chọn".
    STANDARD: { hp: 95, attack: 0, defense: 2, speed: 1, cost: { food: 110, gold: 95 }, trainTicks: 155,
                rallyR: 7.5, rallyAtk: 0.28, rallySpeed: 0.2 },
    // Anh hùng: mỗi bộ lạc nhiều nhất MỘT người còn sống. Đắt, dai, và là đơn vị
    // DUY NHẤT trong game có gen riêng của cá thể — xem HERO_GENE_SPEC.
    HERO:     { hp: 240, attack: 15, defense: 3, speed: 1, cost: { food: 130, gold: 60 }, trainTicks: 165 },
    ATTACK_COOLDOWN: 8,
    // ============================================================
    // ĐẬP NHÀ — hai hệ số, và khoảng cách giữa chúng LÀ cơ chế
    // ============================================================
    // BUILDING_DAMAGE_MULT giờ chỉ còn dành cho VŨ KHÍ CÔNG THÀNH (`siege: true`
    // trong spec). Mọi thứ khác — bộ binh, cung thủ, kỵ binh, và cả anh hùng —
    // đánh vào tường chỉ còn BUILD_PENALTY = 20% sức đánh thường của mình.
    //
    // Vì sao đáng đổi, và vì sao nó KHÔNG chỉ là "cân lại một con số": trước bản
    // này, máy bắn đá là một công trình phụ trong cây công nghệ, không phải một
    // câu trả lời cho câu hỏi nào. Đo 4 kỷ nguyên, phân bổ sát thương lên công
    // trình theo loại quân:
    //     bộ binh 55% · kỵ sĩ 24% · cung thủ 11% · anh hùng 9% · MÁY BẮN ĐÁ 2%
    // Cả một nhánh công nghệ đắt nhất bảng (150 gỗ + 80 vàng + 70 đá, 150 tick
    // lò) đóng góp đúng 2%. Nó tồn tại, nó chạy đúng, và bỏ nó đi thì gần như
    // không ai nhận ra — cùng đúng cái dạng "mã chết" đã bắt được ở hợp nhất-khi-
    // hòm-đầy (0/19 lần kích hoạt) và ở hang ổ cấp 3 (chưa từng đạt tới).
    //
    // Nguyên nhân không phải máy bắn đá yếu: nó đánh 20 so với 7 của bộ binh. Là
    // vì một đạo quân BA CHỤC người đấm tay không vào tường vẫn nhanh hơn ba cỗ
    // máy, nên chẳng có lý do gì phải mua máy. Muốn một loại quân chuyên dụng có
    // nghĩa thì thứ nó chuyên phải là thứ những loại khác KHÔNG làm được — không
    // phải thứ chúng làm chậm hơn một chút.
    //
    // 0,2 chứ không phải 0: tường vẫn phải đổ được bằng nắm đấm, chỉ là chậm tới
    // mức không ai chọn cách đó khi có lựa chọn khác. Bằng 0 thì một bộ lạc chưa
    // mở nổi Xưởng thợ sẽ VĨNH VIỄN không thắng nổi một kỷ nguyên nào — và cây
    // công nghệ vốn đã lọc rất nặng ở cổng thời đại (đo: chỉ 1/4 bộ lạc sống tới
    // Đồ Đồng), nên biến nó thành cổng THẮNG/THUA là đóng cửa ván chơi cho ba
    // phần tư người tham gia.
    BUILDING_DAMAGE_MULT: 3,  // chỉ vũ khí công thành — phá nhà nhanh hơn đánh người
    BUILD_PENALTY: 0.2,       // mọi loại khác: 20% sức đánh khi đập vào công trình
    // Sàn sát thương sau khi trừ giáp, tính theo % đòn gốc. Xem khối chú thích ở
    // đầu CONFIG.UNIT: không có sàn này thì giáp đủ dày = bất tử trước một loại quân.
    ARMOR_FLOOR: 0.25,
    FLEE_RANGE: 7,            // dân thường thấy lính địch trong tầm này là bỏ chạy
    FLEE_TICKS: 14,
    SOLDIER_VISION: 12,
    // BÁN KÍNH ĐI DỌN HANG thời bình — bậc cuối của thang ưu tiên lính, và là con
    // số đắt nhất trong cả thang. Trước là 55 viết cứng trong tickSoldier.
    //
    // Đo 9.000 tick trên bản 340x220: 33,4% số unit-tick của lính là KHÔNG CÓ VIỆC
    // GÌ LÀM, và 78,5% trong số đó rơi vào đúng một trạng thái — bộ lạc đang hoà
    // bình, không hang nào trong 55 ô. Tức là bậc cuối của thang, thứ sinh ra để
    // "một đạo quân đứng không là tài nguyên chết", chính là bậc im lặng nhất.
    // Cùng một lỗi bán kính đã bắt được khi con số này còn là 26 (khi đó KHÔNG
    // MỘT người lính nào từng nhìn thấy hang nào), chỉ nhẹ hơn một bậc.
    //
    // Nhưng KHÔNG nới thẳng lên cho thoáng, vì bán kính này có hai đầu và đầu kia
    // đắt hơn nhiều. Đo 3 kỷ nguyên mỗi mức, bản đồ 16 hang:
    //     R = 55 -> 2,0 hang bị phá/kỷ nguyên · còn 14 · cấp cao nhất 1,3
    //     R = 70 -> 5,0                        · còn 11 · cấp cao nhất 1,3
    //     R = 85 -> 8,3                        · còn 7,7 · cấp cao nhất 1,0
    // Ở 85, quân bốn bộ lạc dọn sạch HƠN MỘT NỬA số hang mỗi kỷ nguyên, và cột
    // cuối cho biết cái giá: KHÔNG hang nào còn kịp lên cấp 2 nữa. Cả trục leo
    // thang của Phase 3.7 — hang lớn lên, hang đi cướp, Chúa Hang — bị tắt ngóm,
    // không phải vì nó sai mà vì không cái hang nào sống đủ lâu để chạy nó. Đó
    // đúng là "cơ chế mới lặng lẽ khoá cơ chế cũ", lần thứ sáu.
    //
    // 70 là điểm cân: gấp 2,5 lần số hang bị dọn so với bán kính cũ (nên bậc cuối
    // của thang ưu tiên thật sự có việc để làm), mà vẫn còn 11 hang đứng và cấp 2
    // vẫn xảy ra. Một bán kính đi tìm việc thì phải đủ rộng để tìm thấy việc, và
    // đủ hẹp để ngày mai vẫn còn việc.
    LAIR_SEEK_R: 70
  },
};
