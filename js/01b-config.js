'use strict';
// ============================================================
// 01b-config.js
// ------------------------------------------------------------
// CONFIG (phần 2/5) — nâng cấp (UPGRADE), anh hùng (HERO), phòng thủ
// (DEFENSE), quái vật (MONSTER). Xem 01a-config.js.
// ============================================================
const CONFIG_B = {

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
      // TƯỜNG THÀNH QUAY LẠI NHÁNH NÀY ở Phase 3.41, sau khi đã bị lấy ra ở 3.30.
      // Lập luận cũ — "buộc tường vào một nhánh nghiên cứu là trộn hai đồng hồ vào
      // một con số, người xem nhìn tường dày lên mà không biết vì sao" — vẫn đúng
      // về hình thức và đã được trả lời chứ không phải bị bỏ qua: HAI ĐỒNG HỒ NAY
      // ĐỌC Ở HAI CHỖ KHÁC NHAU.
      //   · ĐƯỜNG BAO vẫn hoàn toàn theo THỜI ĐẠI (WALL.TIERS: rào gỗ → đất nện →
      //     đá → gạch mạ → men ngọc). Nhìn hình bức tường là biết bộ lạc ở đời nào,
      //     y nguyên như trước, không một pixel nào đổi theo nghiên cứu.
      //   · CON SỐ MÁU theo nghiên cứu, và thẻ thông tin của ô tường ghi thẳng ra
      //     "(Nề đá +N%)" — đúng dòng mà thẻ công trình đã ghi từ 3.30.
      // Tức là cái trộn vào nhau ở bản cũ là do CẢ HAI cùng nói bằng độ dày; tách
      // ra thành hình-bóng vs con-số thì mỗi đồng hồ có một mặt đồng hồ riêng.
      //
      // Vì sao đáng lấy lại: 520 ô tường là khách hàng lớn nhất mà nhánh này từng
      // có, và mất chúng thì lý do tồn tại số một của nhánh — "thứ duy nhất trong
      // bảng có ích cho bộ lạc ĐANG THUA" — mất theo, vì kẻ đang thua là kẻ đang
      // bị vây. Một nhánh cứu kẻ yếu mà không chạm được vào bức tường đang bị đục
      // là một nhánh nói một đằng làm một nẻo.
      //
      // Giá quay lại đúng mức cũ (90/70/50 → 110/90/60), vì tác dụng cũng quay lại.
      masonry: { label: 'Nề đá',       short: 'Nề đá',    icon: '🧱', build: 'town', age: 1,
                 atk: 0, def: 0, applies: [], scope: 'Mọi công trình · Tháp canh · Tường thành',
                 bhp: 0.18,
                 cost: { wood: 110, stone: 90, food: 60 } },
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
                    cost: { food: 110, wood: 90, gold: 45 } },
      // ============================================================
      // NỎ LIÊN CHÂU (Phase 3.38) — nhánh thứ mười, mở ở THIÊN TRIỀU, và là nhánh
      // đầu tiên có một hiệu ứng KHÔNG PHẢI một đường cong
      // ============================================================
      // Chín nhánh trên đều cùng một hình dạng: mỗi cấp cộng thêm một ít vào một
      // con số. Liên châu có ba trường và đúng một trong ba KHÔNG lên theo cấp:
      //   · `shots` — tháp bắn HAI mũi tên vào HAI mục tiêu khác nhau. Mở ở cấp 1
      //     và ĐỨNG YÊN ở đó. Đây là quyết định, không phải chỗ quên: mỗi mũi tên
      //     là một nhân tử, nên 3-4 mũi ở cấp 2-3 sẽ nhân với +40%/+60% sát thương
      //     thành 4,2x-6,4x hoả lực gốc — tức là tháp canh một mình xoá sổ mọi đạo
      //     quân trên bản đồ, và cả cơ chế công thành ngừng tồn tại. Một cánh cửa
      //     mở một lần thì mở một lần.
      //   · `tatk` +20%/cấp và `thp` +50%/cấp — hai vế lên theo cấp, để nhánh vẫn
      //     có một dải liên tục cho bộ não leo, đúng lý do đã viết cho `cityPlan`:
      //     một ngưỡng bật/tắt thì mọi giá trị trên ngưỡng cho ra cùng một kết quả
      //     và không còn gradient nào để chọn lọc đọc.
      //
      // VÌ SAO ĐẮT ĐẾN THẾ, và vì sao đắt bằng ĐÁ: yêu cầu gốc gọi đúng tên vấn đề
      // ("khá imba nên cần một lượng lớn đá"). Với COST_STEP [1 · 1,85 · 3,1] thì ba
      // cấp tốn 300 + 555 + 930 = 1.785 đá, trong khi kho đá một bộ lạc Thiên Triều
      // đo được là ~600-700. Nghĩa là nhánh này KHÔNG mua được bằng tiền đang có; nó
      // phải mua bằng một quyết định đã làm từ trước — kéo người ra mỏ đá — và đó
      // đúng là thứ mà gen `fortify` điều khiển (xem POLICY_SPEC.fortify, nơi phép
      // đo cho thấy `fortify` gần như là toàn bộ lý do nghề đập đá tồn tại). Một
      // nhánh nghiên cứu nối vào một gen sẵn có thì tín hiệu chọn lọc lên gen ấy
      // MẠNH thêm; một nhánh nối vào ví tiền thì ai cũng mua được như nhau.
      //
      // Cùng vòng với máu tường +50% và với việc tháp dời ra vành tường, và ba thứ
      // đó là MỘT thay đổi chứ không phải ba: tường dày hơn chỉ kéo dài thời gian
      // chờ nếu bên thủ không bắn trả được; tháp bắn mạnh hơn chỉ là số nếu nó đứng
      // giữa làng ngoài tầm trận đánh.
      // MỘT CẤP DUY NHẤT (`maxLv: 1`, đổi ở Phase 3.40 theo yêu cầu) — nhánh đầu
      // tiên trong game không có ba cấp, nên đáng nói vì sao nó KHÔNG nên có.
      //
      // Phần thưởng thật của nhánh này là mũi tên THỨ HAI, và mũi tên là một NHÂN
      // TỬ: nó nhân đôi sản lượng của mọi cái tháp cùng lúc. Bảy nhánh kia cộng
      // vào một con số nên cấp 2 và cấp 3 chỉ là "thêm chút nữa"; ở đây cấp 2 phải
      // chọn giữa hai điều tệ ngang nhau — hoặc thêm mũi tên nữa (cấp 3 thành 4
      // mũi, tức 4 lần hoả lực gốc, và cơ chế công thành ngừng tồn tại), hoặc chỉ
      // cộng thêm % lên một thứ đã nhân đôi, tức là hai cấp sau bán một thứ nhạt
      // hơn hẳn cấp đầu với giá đắt gấp đôi rồi gấp ba. Cả hai đều là một lựa chọn
      // tồi giả trang thành nội dung.
      //
      // GIÁ GỘP LẠI LÀM MỘT. Đây là phần dễ làm sai nhất của việc cắt ba cấp xuống
      // một: giữ nguyên bảng giá cũ thì nhánh này lặng lẽ RẺ ĐI 5,95 lần (tổng ba
      // cấp cũ = 300 × [1 + 1,85 + 3,1] = 1.785 đá, cấp 1 chỉ 300), mà lý do nó đắt
      // là vì nó mạnh — cắt số cấp không làm nó yếu đi tí nào. 850 đá ≈ nửa tổng
      // giá cũ, đổi lấy đúng phần hiệu lực mà cấp 1 vốn đã chở (75% sát thương của
      // cấp 3 cũ, và trọn vẹn mũi tên thứ hai).
      volley:     { label: 'Nỏ liên châu', short: 'Liên châu', icon: '🏯', build: 'tower', age: 5,
                    atk: 0, def: 0, applies: [], scope: 'Chỉ Tháp canh',
                    maxLv: 1, shots: 1, tatk: 0.20, thp: 0.50,
                    cost: { stone: 850, gold: 470, wood: 300 } }
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
    // Cây là thứ DUY NHẤT còn chặn đường đi (xem blockedGrid), và một cái hang mọc
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
};
