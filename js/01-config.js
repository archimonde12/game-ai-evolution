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
    // Cây VẪN CHẶN ĐƯỜNG (xem addResource: `blockedCells.add`). Từ Phase 3.15 bỏ
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
                 cost: { food: 160, gold: 140, stone: 70 } },
      // ============================================================
      // Y THUẬT — nhánh thứ sáu, và nhánh đầu tiên KHÔNG cộng một điểm sát thương
      // nào cho ai
      // ============================================================
      // Năm nhánh trên đều là cùng một câu: đánh mạnh hơn hoặc chịu đòn giỏi hơn.
      // Nên "nghiên cứu cái nào trước" cho tới nay chỉ là một bài toán số học —
      // nhân hệ số với số quân đang cầm, cái nào lớn hơn thì chọn. Không có nhánh
      // nào đổi được CÁCH một trận đánh diễn ra.
      //
      // Y thuật đổi. Nó không làm một người lính mạnh lên; nó làm một người lính
      // ĐƯỢC ĐÁNH HAI TRẬN. Đó là một trục hoàn toàn khác — trục thời gian — và nó
      // chỉ có giá trị cho bộ lạc nào đã trả tiền dựng Nhà y tế và nuôi thầy lang,
      // tức là nó thưởng cho một quyết định đã lỡ làm chứ không phải cho ví tiền.
      //
      // BA CON SỐ, và mỗi con số gỡ đúng một nút thắt khác nhau của thầy lang:
      //   · `heal`  — vá nhanh hơn. Nút thắt: 0,45 máu/tick cố ý đặt dưới sát thương
      //     đều của một người lính, nên MỘT thầy lang không bao giờ giữ nổi một
      //     người trước một đối thủ. Cấp 3 đưa nó lên 0,90 — vừa đúng ngưỡng đó,
      //     và chỉ ở cấp 3, sau khi đã trả 3 lần tiền.
      //   · `heals` — vá được NHIỀU NGƯỜI một lúc. Nút thắt lớn nhất: một thầy lang
      //     chữa một người thì trong một trận 30 người nó là thứ vô hình. Đây là
      //     con số duy nhất trong nhánh làm đổi HÌNH ẢNH trên màn hình.
      //   · `reach`/`seek` — vá được XA hơn, và tìm xa hơn. Nút thắt: HEAL_R 2,6 ô
      //     nghĩa là thầy lang phải đứng lẫn vào hàng quân đang chém nhau, mà nó
      //     thì không đánh trả được. Tầm xa hơn = đứng sau lưng mà vẫn làm việc.
      //
      // Mở ở Đồ Đồng cùng bậc với chính Nhà y tế (không khoá lên Đồ Sắt): bài học
      // "hai cái cổng thì xác suất NHÂN chứ không cộng" đã phải trả giá ba lần
      // trong dự án này — đền thờ, chuồng ngựa, và chính trạm xá.
      medicine: { label: 'Y thuật',    short: 'Y thuật',  icon: '🌿', build: 'infirmary', age: 2,
                  atk: 0, def: 0, applies: ['medic'], scope: 'Chỉ Thầy lang',
                  heal: 0.15, heals: 1, reach: 1.5, seek: 8,
                  cost: { food: 120, wood: 70, gold: 55 } },
      // ============================================================
      // CÔNG THÀNH — nhánh thứ bảy, mở ở THIÊN TRIỀU, và là nhánh đầu tiên làm đổi
      // KÍCH THƯỚC của một đơn vị trên màn hình
      // ============================================================
      // Yêu cầu gốc là "nâng cấp cẩu đá to và mạnh hơn", và chữ TO là phần khó hơn
      // chữ MẠNH — không phải vì vẽ khó mà vì nó là chỗ dễ làm sai nhất trong dự án
      // này. Bài học Phase 3.19: BA thứ neo vào Ô LƯỚI cùng vỡ khi sprite tràn ra
      // khỏi ô (hộp bao để chọn chuột, thứ tự vẽ theo chiều sâu, và phép cắt ngoài
      // màn hình). Nên `scale` ở đây phải chảy vào spriteBox chứ không chỉ vào hàm vẽ.
      // — Ba dòng trên viết ở 3.27 và cái luật ấy KHÔNG BAO GIỜ ĐƯỢC THI HÀNH cho
      // tới 3.31: spriteBox tra một bảng hằng số và chưa từng nhân với effScale. Một
      // chú thích đòi sửa nằm đúng chỗ nhưng ở SAI FILE thì không sửa được gì cả, và
      // nó còn tệ hơn im lặng vì người đọc lại tin rằng việc đã xong.
      //
      // Vì sao chữ TO đáng làm, chứ không chỉ cộng thêm sát thương: Phase 3.14 đã đo
      // ra rằng MÀU không đọc được nếu không có mẫu đối chứng đứng cạnh — người xem
      // không nhớ hôm qua cái máy bắn đá màu gì. KÍCH THƯỚC thì đọc được ngay cả khi
      // chỉ có một cỗ máy trên màn hình, vì nó so với thứ luôn có mặt bên cạnh: người
      // lính đứng cạnh nó. Đó là lý do nhánh này cộng `scale` chứ không cộng màu.
      //
      // Áp cho CẢ nỏ thần: hai cỗ máy cùng ra lò từ Xưởng thợ, cùng một đội thợ, nên
      // một nhánh nghiên cứu chung là đúng về mặt kể chuyện. Nhưng KHÔNG áp cho cung
      // thủ/kỵ xạ — nhánh `ranged` đã lo phần đó, và để hai nhánh chồng lên cùng một
      // loại quân là chia đôi tín hiệu chọn lọc, đúng lý do đã viết ở máy bắn đá.
      //
      // `scale` 0,20 -> 0,26 (3.31) -> 0,14 (3.32), tức cấp 3 là +42% chứ không +78%.
      //
      // Vì sao cắt hơn một nửa: 3.31 nâng CẢ hai con số cùng lúc — cỡ nền của sprite
      // (2,75 ô) và hệ số cộng thêm mỗi cấp — mà chúng NHÂN với nhau. Kết quả là 4,89
      // ô, bằng trọn chân đế Kỳ quan, và ở mức thu phóng chơi thật thì cỗ máy che mất
      // chính bức tường nó đang bắn. Sai lầm không nằm ở một trong hai con số, nó nằm
      // ở chỗ hai lần phóng to được quyết định riêng rẽ như thể chúng cộng vào nhau.
      // Cỡ nền đã lùi về 2,15 (xem drawCatapult), nên nhánh này lùi theo để cả tích
      // giữ ở 3,05 ô — vẫn to hơn voi chiến (2,6), tức vẫn là sprite lớn nhất nhóm
      // quân, chỉ khác là nó phải ĂN ĐỦ BA CẤP mới giành được chỗ đó.
      //
      // Kích thước vẫn không phải tín hiệu duy nhất của cấp — và ở +42% thì phần
      // HÌNH BÓNG còn quan trọng hơn: từ 3.31 mỗi cấp thêm một nét (đai sắt · mộc
      // chắn · cờ đuôi nheo — xem drawSiegeRig). Lý do là bài học Phase 3.14 áp cho
      // chính nó: kích thước đọc được vì có người lính đứng cạnh làm mẫu đối chứng,
      // nhưng "to hơn cỗ máy cấp 2" thì lại KHÔNG có mẫu đối chứng nào — hai cỗ máy
      // cùng bộ lạc luôn cùng cấp, nên người xem không bao giờ thấy chúng cạnh nhau.
      siege:   { label: 'Công thành',  short: 'Công thành', icon: '🪨', build: 'workshop', age: 5,
                 atk: 6, def: 1, applies: ['catapult', 'ballista'], scope: 'Máy bắn đá · Nỏ thần',
                 splash: 0.45, range: 0.8, scale: 0.14,
                 cost: { wood: 220, gold: 190, stone: 150 } },
      // ============================================================
      // NỀ ĐÁ — nhánh thứ tám, và nhánh đầu tiên KHÔNG chạm vào một người nào
      // ============================================================
      // Bảy nhánh trên đều cộng vào một ĐƠN VỊ. Hệ quả là cả bảng nâng cấp chỉ trả
      // lời được một câu hỏi — "quân tôi mạnh tới đâu" — và một bộ lạc đang bị vây
      // không có một đồng nào để tiêu vào việc GIỮ ĐƯỢC cái đang có. Đo 3 kỷ nguyên
      // trước bản này: mọi nhánh được chọn đều nằm trong nhóm melee/armor/ranged,
      // vì điểm của một nhánh là SỐ QUÂN nó chạm tới, mà số quân thì luôn lớn hơn
      // mọi thứ khác trong bảng điểm.
      //
      // Nề đá cộng vào MÁU TỐI ĐA CỦA MỌI CÔNG TRÌNH, kể cả tháp canh và từng ô
      // tường thành. Ba lý do nó xứng đáng là một nhánh riêng chứ không phải một
      // chỉ số cộng thêm vào đâu đó:
      //
      //   · Nó là thứ duy nhất trong bảng có ích cho bộ lạc ĐANG THUA. Sáu nhánh
      //     quân sự đều nhân với số quân đang cầm, nên kẻ vừa mất quân được thưởng
      //     ít nhất — bảng nâng cấp cho tới nay khuếch đại chênh lệch thay vì cho
      //     kẻ yếu một nước đi. Máu công trình thì không nhân với gì cả.
      //   · Nó khoá vào tường thành, thứ cũng KHÔNG ai xây và KHÔNG ai trả tiền.
      //     Cộng lại thì phòng thủ có đúng một cái vòi tiêu tiền — và vì thế "đầu
      //     tư vào thành trì" lần đầu tiên là một quyết định đọc được, thay vì một
      //     hằng số trong config.
      //   · Nó ở KINH ĐÔ, công trình duy nhất mọi bộ lạc chắc chắn có từ tick đầu.
      //     Nghĩa là nhánh này không đứng sau cửa nào cả — cố ý, và đó là lần đầu
      //     tiên trong bảng. Bài học "hai cái cổng thì xác suất NHÂN chứ không cộng"
      //     đã trả giá năm lần; nhánh nào sinh ra để cứu kẻ yếu thì không được phép
      //     đòi kẻ yếu phải xây thêm gì trước.
      //
      // `bhp` là PHẦN TRĂM chứ không phải số máu cộng thẳng, và đây là ngoại lệ duy
      // nhất của luật "cộng chứ không nhân" đã viết ở đầu bảng. Luật đó tồn tại để
      // nâng cấp có lợi TƯƠNG ĐỐI nhiều nhất cho đơn vị rẻ nhất; ở đây thì bảng máu
      // công trình trải từ 150 (ruộng) tới 2600 (Kỳ quan) — cộng thẳng thì một con
      // số đủ để cứu Kỳ quan sẽ làm cái ruộng bất tử, còn con số đủ khiêm tốn cho
      // cái ruộng thì với Kỳ quan là làm tròn số. Trải 17 lần thì chỉ có phần trăm
      // mới nói được cùng một câu cho cả hai đầu.
      // TƯỜNG THÀNH ĐÃ RỜI KHỎI NHÁNH NÀY ở Phase 3.30, và đó là một quyết định về
      // chỗ đứng chứ không phải về con số. Tường không do ai xây, không do ai trả
      // tiền, và giờ nó lên bậc theo THỜI ĐẠI (xem WALL.TIERS) — cột mốc chung của
      // cả bộ lạc. Buộc nó vào một nhánh nghiên cứu ở nhà chính là trộn hai đồng
      // hồ khác nhau vào một con số: người xem nhìn bức tường dày lên mà không biết
      // nó dày lên vì bộ lạc vừa lên đời hay vì vừa nghiên cứu xong.
      //
      // Nhánh Nề đá mất đi 520 ô khách hàng lớn nhất của nó, nên nó cũng RẺ đi
      // tương ứng (110/90/60 → 90/70/50): một nhánh vẫn đáng mua cho 15-25 toà nhà
      // và cho tháp canh, không phải một nhánh vẫn giữ giá cũ với nửa tác dụng.
      masonry: { label: 'Nề đá',       short: 'Nề đá',    icon: '🧱', build: 'town', age: 1,
                 atk: 0, def: 0, applies: [], scope: 'Mọi công trình · Tháp canh',
                 bhp: 0.18,
                 cost: { wood: 90, stone: 70, food: 50 } },
      // ============================================================
      // QUÂN NHU — nhánh thứ chín, và nhánh duy nhất mua BÁN KÍNH
      // ============================================================
      // Tám nhánh trên đều trả lời "đơn vị này mạnh tới đâu" hoặc "toà nhà này dai
      // tới đâu". Quân nhu trả lời một câu chưa ai hỏi: "đạo quân này ĐI ĐƯỢC BAO XA".
      //
      // Ba con số, và chúng đúng ba con số mà một trại tiếp tế bị nghẽn ở:
      //   · `rate`  — hồi nhanh hơn. Nút thắt: 0,8/tick chỉ hơn mức hao (0,13) sáu
      //     lần, nghĩa là một người lính cạn sạch cần ~150 tick trong trại mới đầy
      //     lại — dài hơn cả một trận đánh. Cấp 3 đưa nó lên 1,7.
      //   · `slots` — tiếp tế nhiều người MỘT LÚC. Nút thắt lớn nhất, và là con số
      //     duy nhất trong nhánh làm đổi HÌNH ẢNH: 5 suất trong một đạo quân 40
      //     người thì bốn phần năm hàng quân đứng ngoài nhìn.
      //   · `reach` — bán kính. Nút thắt: 8 ô nghĩa là cái trại phải cắm giữa chỗ
      //     đang chém nhau, mà nó chỉ có 130 máu.
      // Ba nút thắt khác nhau, nên một bộ lạc nghiên cứu nhánh này KHÔNG chỉ nhận
      // "nhiều hơn một chút" — nó nhận một cái trại làm được việc khác hẳn.
      //
      // Đặt ở NHÀ CẦU NGUYỆN, mở từ ĐỒ ĐỒNG, cùng bậc với chính đơn vị hậu cần và
      // KHÔNG khoá cao hơn. Bài học "hai cái cổng thì xác suất NHÂN chứ không cộng"
      // đã phải trả giá năm lần ở đây (đền thờ, chuồng ngựa, trạm xá, nhà y tế, và
      // chính nhánh Y thuật); nhà cầu nguyện là công trình 75 gỗ mở từ Đồ Đá, tức là
      // cái cổng rẻ nhất trong cả bảng.
      //
      // Thời đại KHÔNG có mặt trong ba con số này — nó điều khiển TUỔI THỌ cái trại
      // (xem SUPPLY.CAMP.TTL_PER_AGE). Hai nguồn tiến bộ, hai thứ khác nhau, để
      // người xem đọc được cái nào vừa đổi: lên đời thì trại đứng lâu hơn, nghiên
      // cứu thì trại nuôi được nhiều người hơn.
      supplyline: { label: 'Quân nhu',  short: 'Quân nhu', icon: '🎒', build: 'shrine', age: 2,
                    atk: 0, def: 0, applies: [], scope: 'Trại tiếp tế · Đội hậu cần',
                    rate: 0.3, slots: 2, reach: 2.5,
                    cost: { food: 110, wood: 90, gold: 45 } }
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
      // Kho hàng 12: cao hơn nhà ở và ruộng rất nhiều dù rẻ hơn trại lính, vì mất
      // nó không mất một toà nhà mà mất cả NĂNG SUẤT của đội dân đang làm quanh đó
      // — họ lập tức phải gánh về kinh đô, xa gấp mười lần. Đây cũng là chỗ khiến
      // đánh vào hậu cần của địch trở thành một nước đi có nghĩa.
      workshop: 11, stable: 11, depot: 12, infirmary: 10, shrine: 6, house: 4, farm: 3,
      // Tướng phủ 15 — cao hơn cả trại lính dù rẻ hơn. Mất nó không mất một toà
      // nhà mà mất cả DÒNG DÕI: hàng đợi chiêu mộ bị huỷ, và bộ lạc không có
      // cửa nào khác để ra anh hùng. Đúng cùng lý lẽ đã viết cho Kho hàng.
      heroHall: 15,
      // TRẠI TIẾP TẾ 9 — dưới trạm xá, trên nhà cầu nguyện. Nhân với
      // RECALL_PER_WEIGHT thì bán kính triệu hồi ra ~32 ô: đủ để đạo quân đang đứng
      // quanh nó quay lại cứu, và KHÔNG đủ để kéo ai từ nửa kia bản đồ về một cái
      // lều sẽ tự biến mất sau 1.200 tick.
      //
      // Không để rơi vào DEFAULT_WEIGHT 8 dù hai con số gần bằng nhau: cái trại là
      // loại công trình DUY NHẤT đứng giữa đất địch, tức là "bán kính triệu hồi"
      // của nó lôi quân theo một hướng ngược hẳn với mọi công trình khác. Một con
      // số quan trọng như thế mà đến từ nhánh mặc định thì lần sau ai đổi
      // DEFAULT_WEIGHT sẽ đổi luôn hành vi hành quân mà không biết.
      camp: 9
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
    // 9 -> 16 hang: giữ nguyên MẬT ĐỘ trên bản đồ 1,93 lần rộng hơn. Không nhân lên
    // thì thế giới mới loãng đúng một nửa, và mọi con số đã tinh chỉnh của cơ chế
    // nuôi hang (nhịp ăn, ngưỡng lên cấp) đọc vào một thực tế khác hẳn.
    LAIRS: 16,             // số hang ổ rải trên bản đồ
    LAIR_HP: 700,
    // 34 -> 40: bộ khởi đầu tài nguyên (xem MAP.FAIR.KIT) đặt mỏ đá xa tới 38 ô,
    // và một cái hang mọc ngay trên mỏ đá được bảo đảm của một bộ lạc thì đúng bằng
    // việc không bảo đảm gì cả.
    // 40 -> 60: vùng bộ khởi đầu nay rộng tới 46 ô (MAP.FAIR.EXCLUSIVE_R), và một
    // cái hang mọc chồng lên mỏ được bảo đảm của một bộ lạc thì lời bảo đảm đó vô
    // nghĩa. Cộng biên cho cả mỏ đi kèm hang (LODE) khỏi thò vào vùng công bằng.
    LAIR_MIN_DIST_HOME: 60, // không đặt hang sát kinh đô — bộ lạc chết ngay từ tick 0 thì chẳng có gì để xem
    // ================================================================
    // SÂN HANG — vành đai KHÔNG CÂY quanh mỗi ổ quái
    // ================================================================
    // Cây là thứ DUY NHẤT còn chặn đường đi (xem blockedCells), và một cái hang mọc
    // giữa rừng biến ba cơ chế thành xổ số:
    //   · đàn quái ra khỏi ổ phải lách qua khe — cả bầy dồn vào một lối,
    //   · quân đi dọn hang tới nơi thành từng người lẻ chứ không thành đội hình,
    //   · MỎ CANH HANG (LODE, ngay dưới đây) nằm ở vành 7-16 ô, tức là đúng vùng
    //     mà đám thợ mỏ phải đi vào — và đó là con đường CHÍNH lên nửa sau cây
    //     công nghệ.
    // Đo trên 192 hang / 12 bản đồ trước khi thêm: mật độ cây toàn bản đồ 2,41%,
    // nhưng 16,7% số hang có trên 5% ô cây trong bán kính 6, cá biệt tới 27,4%.
    // Tức là cứ sáu cái hang thì có một cái nằm trong rừng — không phải chuyện
    // hiếm, mà là một trong sáu ván có một ổ "khó vào" vì lý do không ai đọc ra.
    //
    // 8 chứ không phải 6: bán kính này phải phủ được chỗ CẢ ĐÀN đứng dàn ra khi bị
    // đánh, không chỉ phủ cái ổ. Cũng vừa chạm mép trong của vành quặng (RING[0] = 7)
    // nên lối vào vỉa đầu tiên luôn quang.
    // CHỈ chặt CÂY, không đụng vàng/đá/quả: quặng không chặn ai, mà xoá nó đi thì
    // vành quặng canh hang — cả lý do tồn tại của cơ chế LODE — bị chính hàm dọn
    // đường ăn mất.
    LAIR_CLEAR_R: 8,
    // ================================================================
    // MỎ CANH HANG — vì sao vàng và đá lại mọc quanh ổ quái
    // ================================================================
    // Trước bản này, một cái hang là thứ CHỈ CÓ HẠI: bỏ mặc thì nó lớn lên và đi
    // cướp, dọn nó thì tốn quân và được một món đồ cho anh hùng. Không có lý do
    // nào để MUỐN có một cái hang gần mình, nên vị trí hang chỉ là một khoản xui.
    //
    // Đặt mỏ vàng và mỏ đá cạnh hang biến nó thành một câu hỏi thật: vạt đất giàu
    // nhất bản đồ cũng là vạt đất nguy hiểm nhất. Và nó khoá đúng vào hai luật vừa
    // thêm — mỏ hữu hạn (nên phải liên tục đi tìm mỏ mới) và kho hàng (muốn khai
    // thác mỏ xa thì phải dựng hậu cần ngay dưới mũi bầy quái).
    //
    // Vì sao là VÀNG và ĐÁ chứ không phải quả và gỗ: hai thứ này gác cửa thời đại,
    // nâng cấp và Kỳ quan, mà lại là hai thứ KHÔNG tái tạo. Quả và gỗ thì bộ lạc
    // nào cũng tự lo được quanh nhà. Nói cách khác, mỏ canh hang không phải phần
    // thưởng thêm — nó là con đường CHÍNH để đi tới nửa sau cây công nghệ, và con
    // đường đó bắt buộc phải đi qua một bầy quái.
    //
    // Bảo đảm ÍT NHẤT một mỏ mỗi loại cho mỗi hang, có thể hơn (xem spawnLairLodes).
    // Số cụm bốc trong [min, max] — bảo đảm ÍT NHẤT một mỗi loại, có thể hai.
    // Bản nháp để [1, 3] và đo ra ngay vì sao không được: 16 hang × 2 loại × trung
    // bình 2 cụm = 64 vỉa mọc thêm, trong khi cả bản đồ chỉ có 22 cụm vàng và 18
    // cụm đá nền. Tổng vàng nhảy lên 378.770 và tổng đá 599.820 — gấp 4,2 và 3,5
    // lần bản trước. Hai thứ gác cửa thời đại, nâng cấp và Kỳ quan bỗng thành đồ
    // cho không, tức là cả cây công nghệ mất cổng.
    //
    // Một cơ chế phụ mà lấn át nguồn chính thì nó không còn là cơ chế phụ. Chữa ở
    // BA chỗ cùng lúc thay vì chỉ hạ số cụm: ít cụm hơn, vỉa NHỎ hơn mỏ thường
    // (RADIUS_MULT), và số cụm nền hạ xuống để nhường chỗ.
    LODE: {
      GOLD: [1, 2],
      STONE: [1, 2],
      RING: [7, 16],      // đặt cách tâm hang ngần này ô — đủ gần để bị canh
      // VỈA, KHÔNG PHẢI MỎ. Bán kính 0,7 lần mỏ thường cho ~một nửa số ô: cái nằm
      // cạnh hang là một mạch quặng lộ thiên, không phải cả một cánh đồng đá. Cũng
      // đúng hơn về hình ảnh — bầy quái canh được một vạt nhỏ quanh ổ, không canh
      // nổi một vùng bằng nửa lãnh thổ một bộ lạc.
      RADIUS_MULT: 0.7,
      // Trữ lượng mỗi ô đậm hơn mỏ thường: đây là phần thưởng cho rủi ro, và nó
      // phải đủ lớn để một chuyến dọn hang đổi được một cái gì đó thật.
      RICH: 1.35
    },
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

      // ================================================================
      // PHASE 3.22 — NĂM LOÀI MỚI, NĂM ĐỘNG TỪ MỚI
      // ================================================================
      // Cùng một luật đã viết ở đầu khối này và nó vẫn là luật đắt nhất của cả
      // bảng: một loài mới chỉ được vào nếu nó mang một ĐỘNG TỪ chưa ai có. Bảy
      // loài cũ nói được: đuổi · độc · chịu đòn · bắn · bay · buff. Năm loài dưới
      // đây thêm: phân đôi · phục kích · làm chậm · hồi máu · công thành.
      //
      // Vì sao năm động từ NÀY chứ không phải năm bảng chỉ số nữa: mỗi cái phá
      // đúng MỘT giả định mà người xem đã coi là hiển nhiên sau bảy loài đầu.
      //   · "giết là hết"      -> Nhớt Quỷ chia đôi.
      //   · "thấy thì mới có"  -> Rết Cát nằm dưới đất, không ai thấy.
      //   · "chạy thì thoát"   -> Mãng Xà cắn một cái là hết chạy.
      //   · "bắn đủ là chết"   -> Thầy Mo vá lại phía sau.
      //   · "nhà là an toàn"   -> Cổ Thụ Quái sinh ra để đập nhà.

      // NHỚT QUỶ — động từ: PHÂN ĐÔI. Chết thì tách thành hai con nhỏ (45% chỉ số),
      // và hai con đó KHÔNG tách nữa (splitGen chặn ở đời 1). Ý nghĩa cơ chế: nó
      // là con quái đầu tiên mà thanh máu NÓI DỐI — một toán lính nhìn 90 máu rồi
      // đánh, xong lại phải đánh thêm hai lượt nữa. Chậm nhất bản đồ (0,65) nên nó
      // không bao giờ đuổi kịp ai; mối nguy của nó là THỜI GIAN, không phải sát
      // thương, và thời gian là thứ đắt nhất khi đang có chuyện khác phải làm.
      slime:  { hp: 90,  attack: 6,  speedMult: 0.65, cooldown: 14, drop: 0.04, threat: 0.9,
                split: { count: 2, scale: 0.45 },
                label: 'Nhớt Quỷ', color: '#6fae8f', dark: '#1e4436', size: 1.25, shape: 'blob' },

      // RẾT CÁT — động từ: PHỤC KÍCH. Nằm vùi dưới đất, KHÔNG di chuyển và KHÔNG
      // bị ai nhắm tới (findNearestEnemyUnit bỏ qua `buried`), tới khi có người
      // bước vào 3 ô thì trồi lên và đòn ĐẦU TIÊN nhân 2,4.
      //
      // Đây là loài duy nhất bẻ được cái phản xạ mà bảy loài cũ dạy cho người xem:
      // nhìn bản đồ, đếm chấm đỏ, rồi quyết đi hay tránh. Cán cân địch/ta của anh
      // hùng (heroLocalBalance) cũng đọc đúng cái bucket ấy — nên anh hùng sẽ tự
      // tin đi vào đúng chỗ có mai phục, và đó là ý đồ chứ không phải lỗi.
      // Máu thấp (70): trồi lên rồi thì nó phải chết nhanh, nếu không "bất ngờ"
      // biến thành "một con quái mạnh mà lại còn tàng hình".
      // Bán kính 4 chứ không phải 3: đo 5 kỷ nguyên ở bán kính 3 thì 55 con Rết
      // sinh ra chỉ nổ ra được 44 cú phục kích — chưa tới một lần mỗi đời, tức là
      // phần lớn số chúng sống trọn kiếp dưới đất mà không ai từng biết là có.
      // Nằm chờ thì được, nhưng chờ tới lúc chết già thì nó chiếm một suất trong
      // trần quân số của hang mà chẳng đóng góp gì cho ai xem.
      burrower: { hp: 70, attack: 16, speedMult: 1.35, cooldown: 14, drop: 0.08, threat: 1.2,
                ambush: { r: 4, mult: 2.4, rehide: 260 },
                label: 'Rết Cát',  color: '#c98f4a', dark: '#4a2c14', size: 1.3,  shape: 'burrower' },

      // MÃNG XÀ — động từ: LÀM CHẬM. Vết cắn cắt một nửa tốc độ trong 70 tick.
      // Đây là trạng thái đầu tiên trong game KHÔNG phải sát thương, và nó đánh
      // vào đúng thứ mà cả Phase 3.16 dựng lên để bán: tốc độ. Kỵ binh 1,7 ô/tick
      // bị cắn thì còn 0,85 — chậm hơn bộ binh. Dân thường bỏ chạy bị cắn thì
      // không còn là "bỏ chạy" nữa. Ai cũng dính, không phân biệt giáp hay thời đại.
      serpent:{ hp: 120, attack: 9,  defense: 1, speedMult: 1.2, cooldown: 11, drop: 0.12, threat: 1.4,
                slow: { ticks: 70, mult: 0.5 },
                label: 'Mãng Xà',  color: '#7e8f3f', dark: '#2b3b12', size: 1.45, shape: 'serpent' },

      // THẦY MO — động từ: HỒI MÁU cho đồng loại quanh nó. Bản thân yếu (95 máu,
      // đánh 5) và đứng xa 4 ô, nên nó không tự thắng được gì cả.
      //
      // Vì sao nó là loài đáng giá nhất trong năm: cho tới bản này, MỌI trận đánh
      // quái đều chỉ có một quyết định — đánh hay lui. Không có "đánh CÁI NÀO
      // TRƯỚC", vì mọi con quái đều là một bể máu độc lập. Một con biết vá máu
      // biến thứ tự mục tiêu thành câu hỏi có đáp án đúng và đáp án sai, mà cái
      // thang ưu tiên trong tickSoldier thì không hề biết điều đó — nên đây cũng
      // là con quái đầu tiên khai thác được một điểm mù của chính AI quân ta.
      shaman: { hp: 95,  attack: 5,  speedMult: 0.95, cooldown: 18, drop: 0.22, threat: 1.5,
                range: 4, minRange: 2, heal: { r: 6, amount: 2.4, every: 10 },
                label: 'Thầy Mo',  color: '#b06fae', dark: '#3d1440', size: 1.35, shape: 'shaman' },

      // CỔ THỤ QUÁI — động từ: CÔNG THÀNH. Sát thương lên CÔNG TRÌNH nhân thêm
      // 2,2 lần (trên nền BUILD_DMG sẵn có), đổi lại chậm nhất nhì bản đồ (0,45).
      //
      // Nó lấp đúng cái lỗ mà cơ chế đi cướp để lại: một chuyến cướp 5 con quái
      // thường đập một cái trại lính mất hàng trăm tick, nên phần lớn chuyến cướp
      // kết thúc bằng "giết vài người dân rồi hết hạn quay về". Có Cổ Thụ đi cùng
      // thì chuyến cướp để lại một CÁI HỐ trên bản đồ — hậu quả nhìn thấy được,
      // đúng thứ khiến người xem thấy việc bỏ mặc một cái hang là có giá.
      //
      // Chỉ số ĐÁNH NHAU cố tình yếu so với cỡ của nó (13 sát thương, chậm nhất
      // bản đồ): nó không phải một con quỷ đá to hơn. Toàn bộ sức mạnh nằm ở hệ
      // số 2,6 chỉ áp lên công trình, nên một toán lính chặn được nó khá dễ — cái
      // khó là chặn nó TRƯỚC KHI nó tới hàng rào, mà nó thì không đi tìm lính.
      ent:    { hp: 430, attack: 13, defense: 3, speedMult: 0.45, cooldown: 22, drop: 0.32, threat: 2.0,
                siege: 2.6,
                label: 'Cổ Thụ Quái', color: '#7d6a3f', dark: '#2e2413', size: 2.4, shape: 'ent' },

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
                label: 'Chúa Hang', color: '#b8362a', dark: '#1c0805', size: 2.7, shape: 'lord' },

      // ============================================================
      // THIÊN MA — con quái duy nhất KHÔNG ra từ một cái hang (Phase 3.30)
      // ============================================================
      // Nó chỉ tồn tại khi NGƯỜI XEM thả nó xuống (quyền năng 🐉 Thiên Ma). Mọi
      // thứ khác trong mô phỏng đều do mô phỏng tự sinh ra; đây là vật thể đầu
      // tiên mà nguồn gốc của nó nằm NGOÀI thế giới — và đó chính là điểm: nó là
      // câu trả lời cho "Chúa Tể có thể làm gì mà không phải cộng/trừ vào một
      // bảng số của một bộ lạc".
      //
      // `siege 3` nên nó đập tường thành và nhà cửa bằng đúng hệ số của một cỗ máy
      // bắn đá. Nghĩa là nó KHÔNG bị bức tường vừa to gấp đôi chặn lại — đây là
      // thứ duy nhất trên bản đồ mà một vành thành không mua nổi thời gian trước
      // nó, nên thả nó xuống là một quyết định thật sự có hậu quả.
      //
      // `aura` KHÔNG có: hào quang của Chúa Hang buff bầy quái quanh nó, mà Thiên
      // Ma đi một mình. Cho nó hào quang thì mọi con sói tình cờ đi ngang bỗng
      // mạnh lên 35% và người xem đọc ra một trận đánh mà họ không hiểu vì sao.
      //
      // BỘ SỐ NÀY LÀ BẢN THỨ HAI, và bản đầu bị chính phép đo bác bỏ. Bản đầu
      // (5.200 máu · đòn 62 mỗi 16 tick) đo 5 ván thì trung bình nó sống 753 tick,
      // giết 8,6 người, san 1,2 căn nhà, đục 0,8 ô tường — trong khi phần thưởng
      // là 1.850 tài nguyên cộng một Thánh vật cộng 45 Đức Tin hoàn lại. Nói cách
      // khác: quyền năng ĐẮT NHẤT của Chúa Tể là một món quà tặng cho bộ lạc nào
      // tình cờ đứng gần, và vế "phạt" trong "thưởng phạt" hoàn toàn không tồn tại.
      //
      // Thứ phải sửa là SÁT THƯƠNG ĐẦU RA, không phải máu. Cho thêm máu thì nó chỉ
      // sống lâu hơn mà vẫn không làm gì — đúng bài học "cho sóng ĐÔNG hơn không
      // đổi được gì cả" của Phase 3.26: phải đo một đợt ĐỔI ĐƯỢC GÌ, rồi chữa bằng
      // CHẤT. Đòn 130 mỗi 12 tick là 10,8 sát thương/tick (cũ: 3,9), và nhân 3
      // công thành thành 390 mỗi cú vào nhà — một kinh đô 1.300 máu đổ sau 4 cú.
      // Máu lên 9.000 để nó sống đủ lâu mà GÂY RA ngần ấy, không phải để nó dai.
      //
      // TỐC ĐỘ 0,9 -> 1,45 (3.32), và đây là con số đổi nhiều nhất trong bộ. 0,9
      // nghĩa là nó đi CHẬM HƠN một dân thường: bản đồ 480x300 nên quãng từ giữa
      // bản đồ tới kinh đô kẻ dẫn đầu thường hơn 150 ô, tức là hơn 160 tick chỉ để
      // ĐI — và trong ngần ấy thời gian bên bị nhắm kịp gọi cả đạo quân về. Một con
      // quái mà người ta luôn kịp chuẩn bị thì không phải một biến cố, nó là một
      // cuộc hẹn. 1,45 đặt nó ngay dưới kỵ sĩ (1,7): vẫn chạy được khỏi nó, nhưng
      // phải là bằng KỴ BINH — bộ binh (1,0) thì không.
      //
      // Cỡ 3,4 -> 4,2: nó là vật thể duy nhất trên bản đồ mà người xem phải TÌM
      // THẤY trong một khung hình chật kín quân, và nó cũng là thứ duy nhất do
      // chính họ thả xuống. Ở 3,4 nó chỉ nhỉnh hơn Chúa Hang (2,7) một quãng đọc
      // được khi hai con đứng cạnh nhau — mà chúng không bao giờ đứng cạnh nhau.
      worldboss: { hp: 9000, attack: 130, defense: 14, speedMult: 1.45, cooldown: 12,
                drop: 1.0, threat: 22, splash: 3.2, siege: 3, boss: true, worldBoss: true,
                // boxW/boxUp — hộp bấm, tính bằng bội của `size`. Loài duy nhất
                // phải khai vì loài duy nhất có thứ vươn ra ngoài mặc định 0,75·S:
                // sải cánh 0,96·S và lưỡi đuôi 1,02·S. Xem spriteBox.
                label: 'Thiên Ma', color: '#b783cc', dark: '#2a1038', size: 4.2, shape: 'worldboss',
                boxW: 1.08, boxUp: 1.15 }
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
      //
      // LADDER 3.22, VÀ MỘT PHÉP ĐO ĐÃ BẺ GÃY BẢN NHÁP ĐẦU TIÊN
      //
      // Bản nháp xếp Cổ Thụ Quái ở riêng cấp 3, với lý lẽ nghe rất hợp: một cỗ máy
      // phá thành từ tick 0 thì bộ lạc chưa kịp có gì để mất. Đo 5 kỷ nguyên trọn
      // vẹn (5.837 · 6.632 · 6.489 · 6.470 · 6.499 tick) thì cấp cao nhất mà BẤT KỲ
      // hang nào trên bản đồ chạm tới là 2 — không một lần lên cấp 3 nào, và loài
      // của cấp 2 mỗi loài chỉ sinh ra ĐÚNG 2 con trong suốt cả năm kỷ nguyên.
      // Nghĩa là loài đặt riêng ở cấp 3 (kể cả Chúa Hang có từ 3.7) là nội dung
      // KHÔNG TỒN TẠI với người xem.
      //
      // Đây đúng là bài học đã phải viết ra hai lần ở ngay file này — một lần cho
      // demoteLair (đúng từng dòng nhưng toán học bảo đảm không bao giờ được gọi),
      // một lần cho chính ladder 3.7 (bóng ma và phi long không ai thấy trong 4/6
      // kỷ nguyên). Luật rút ra lần đó vẫn đúng nguyên: mỗi ĐỘNG TỪ phải có mặt
      // sớm ít nhất một lần; thứ để dành cho leo thang là ĐỘ ĐẬM ĐẶC của nó.
      //
      // Nên: cả năm động từ mới đều xuất hiện từ cấp 1 hoặc 2, còn cấp 3 tăng mật
      // độ (Cổ Thụ có mặt hai ô trong bảy). Cấp 1 dùng 8 ô thay vì 7 — độ dài
      // ladder tự do (`% length`), và thêm một ô là cách duy nhất nhét thêm loài
      // mà không phải hất Bóng ma ra, mà Bóng ma nằm ở cấp 1 cũng vì đúng cái luật
      // đang bàn.
      //
      // Thước đo là THREAT TRUNG BÌNH MỖI CON, không phải tổng một vòng ladder:
      // trần quân số chặn theo SỐ CON, nên độ dài ladder không đổi áp lực, chỉ đổi
      // thành phần. Cũ -> mới:
      //   cấp 1: 1,157 -> 1,213 (+4,8%) · cấp 2: 1,671 -> 1,771 (+6,0%)
      //   cấp 3: 2,386 -> 2,329 (-2,4%)
      { name: 'Hang ổ',    cap: 4, roam: 22, hpBonus: 0,    interval: 260, statMult: 1.00, raidEvery: 0,
        ladder: ['wolf', 'slime', 'spider', 'burrower', 'bear', 'serpent', 'wisp', 'shaman'] },
      { name: 'Sào huyệt', cap: 6, roam: 28, hpBonus: 700,  interval: 210, statMult: 1.15, raidEvery: 2200,
        ladder: ['wolf', 'serpent', 'wisp', 'shaman', 'wyvern', 'ent', 'troll'] },
      { name: 'Tổ Quỷ',    cap: 7, roam: 34, hpBonus: 1600, interval: 165, statMult: 1.35, raidEvery: 1500,
        ladder: ['troll', 'ent', 'wyvern', 'shaman', 'troll', 'ent', 'wyvern'] }
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
    tower:    { hp: 640, size: 2, cost: { wood: 85, stone: 45 }, buildTicks: 130, pop: 0, label: 'Tháp canh', range: 10, attack: 16, cooldown: 11 },
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
    wonder:   { hp: 2600, size: 5, cost: { wood: 430, stone: 470, gold: 270 }, buildTicks: 820, pop: 0, label: 'Kỳ quan' },
    BUILD_RATE: 1,       // tiến độ/tick cho mỗi dân thường đang xây
    MAX_BUILDERS: 3,
    WONDER_BUILDERS: 8,  // Kỳ quan được huy động nhiều thợ hơn hẳn — nếu không, 820 tick chia cho 3 thợ là quá dài để kịp xảy ra bất cứ chuyện gì

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
  // `blockedCells` chỉ biết một câu hỏi: ô này đi qua được không. Câu trả lời giống
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
    // Máu MỘT Ô tường — GẤP ĐÔI bản trước. Không ai phải phá cả bức tường; con số
    // đáng cân là "một cỗ máy bắn đá đục thủng một ô mất bao lâu":
    //     Đồ Đá     300 máu / 60 sát thương mỗi 26 tick = ~130 tick
    //     Thiên Triều 1800 / 60                          = ~780 tick
    // và với bộ binh (đập tường 1,4) thì lần lượt là 5.500 và 23.000 tick — tức là
    // KHÔNG BAO GIỜ. Đó chính là điều đáng có: tường thành là lý do thứ hai để tồn
    // tại một Xưởng thợ, sau Kỳ quan. Trước bản này `BUILD_PENALTY` chỉ làm bộ binh
    // phá nhà chậm; giờ nó làm bộ binh phá thành BẤT KHẢ, và khoảng cách giữa hai
    // câu đó là toàn bộ giá trị của một cỗ máy.
    HP: [0, 300, 520, 840, 1280, 1800],
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
    NEED_TOWERS: [0, 0, 0, 2, 4, 7],
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

