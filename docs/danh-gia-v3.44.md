# Đánh giá Chúa Tể v3.44 và lộ trình phát triển

*Viết ngày 2026-09-02, tại commit `0a62943` (tag `v3.44`). Trục chính của bản đánh giá này là
**game để xem**: người xem ngồi trước màn hình có đọc được chuyện gì đang xảy ra không.*

## 1. Tóm tắt

Chúa Tể đã là một mô phỏng chạy đúng và chạy nhanh. Hai mươi hai gen chiến lược và năm gen anh
hùng đều có chỗ đọc thật, hiệu năng ở tốc độ xem chỉ tốn dưới 2% CPU, và phần lớn cơ chế lớn
đều có ít nhất một phép đo chứng minh nó chịu tải.

Điểm yếu nặng nhất không nằm ở luật chơi mà nằm ở **đoạn kết**. Lượt đo hôm nay cho **6 trên 8
kỷ nguyên chạm trần 30.000 tick**, tức người xem ngồi đủ **41,7 phút** rồi ván tắt vì hết giờ
chứ không vì ai thắng. Điểm yếu thứ hai là **quyền năng**: Chúa Tể tự động mặc định tắt, nên
người xem thụ động không thấy một quyền năng nào được thi triển suốt ván, và năm trong sáu
quyền năng ghi dòng sử không kèm cờ quan trọng nên cũng không có thông báo nổi.

Điểm yếu thứ ba đáng lo hơn cả hai cái trên, vì nó nói về chính cách dự án tự biết mình:
**lượt đo hôm nay không tái hiện được Phase 3.44**. Cùng một bản dựng, cùng chế độ, cùng số kỷ
nguyên, mà tần suất hạ kinh đô là 0,78 trên mỗi 10.000 tick so với 2,58 của tuần trước, chênh
3,3 lần. Phương sai giữa kỷ nguyên lớn tới mức một lượt tám kỷ nguyên không đủ để nói bất cứ
điều gì về cân bằng.

Hướng đi đề xuất: **đo trước, đừng vá**. Phase 1 đóng câu hỏi gốc của dự án bằng 30 kỷ nguyên
ghép cặp, và chính lượt chạy đó sinh dữ liệu cho ba phase sau mà không tốn thêm giờ máy nào.

## 2. Bản đánh giá này đo bằng gì

Ba nguồn, và mỗi con số trong tài liệu đều ghi nguồn ngay tại chỗ.

| Nguồn | Dạng trích dẫn | Ghi chú |
|---|---|---|
| 62 ghi chú memory của dự án | `(Phase 3.xx, memory …)` | Số cũ, ghi rõ đo ở phase nào |
| Mã nguồn tại commit `0a62943` | `(js/…:dòng)` | Số dòng lấy bằng `grep -n` ngày 2026-09-02 |
| Một lượt đo mới | `(lượt đo 2026-09-02, phụ lục)` | 8 kỷ nguyên chinh phạt, JSON nguyên văn ở mục 10 |

Tuyên bố nào không có số thì gắn nhãn **chưa đo**, và tài liệu này dùng nhãn ấy 20 lần. Đó
không phải sơ suất mà là kết quả chính của mục 3: phần lớn cơ chế phục vụ người xem chưa từng
được đo bằng thước nào ngoài kích thước pixel.

Một cảnh báo về phương pháp phải nói ngay, vì nó quyết định cách đọc mọi con số bên dưới.
Lượt đo hôm nay chạy đúng bản v3.44 mà Phase 3.44 đã đo tuần trước, cùng chế độ chinh phạt,
cùng `autoGod = false`, cùng tám kỷ nguyên nối tiếp. Kết quả lệch xa nhau:

| Chỉ số | Phase 3.44 (2026-08-30) | Lượt đo 2026-09-02 |
|---|---|---|
| Kinh đô bị hạ | 40 / 155.055 tick | 17 / 218.401 tick |
| Trên mỗi 10.000 tick | 2,58 | **0,78** |
| Kỷ nguyên thắng bằng Kỳ quan | 4/8 | 2/8 |
| Kỷ nguyên chạm trần 30.000 | 2/8 | **6/8** |
| Chặn Kỳ quan vì chưa tới Thiên Triều | 59,5% | 62,2% |

Chỉ có dòng cuối là ổn định. Ba dòng trên lệch từ 2 tới 3,3 lần, và cả hai lượt đều là tám kỷ
nguyên trên cùng một bản dựng. Vì vậy mọi tỉ lệ kết cục trong tài liệu này phải đọc là **một
mẫu**, không phải một hằng số của trò chơi. Đây cũng chính là lý do Phase 1 của lộ trình phải
là một phép đo ghép cặp chứ không phải một bản vá.

## 3. Game để xem

### 3a. Người xem có đọc được không

Câu hỏi chia làm ba: ai đang thắng, vì sao, và chuyện gì sắp xảy ra.

**Ai đang thắng.** Trên màn hình mặc định thì gần như không có câu trả lời. Tờ mở sẵn là
"Chúa Tể" chứ không phải bảng bộ lạc (js/14-ui-panels.js:143), bảng bộ lạc nổi trên khung
hình mặc định tắt (js/14-ui-panels.js:1334), nên thứ duy nhất tự đến với mắt là màu lãnh thổ
trên minimap, kinh đô vẽ trắng, và dòng sử. Bảng bộ lạc bên cột phải có đủ dân, quân, bốn kho
và điểm, nhưng người xem phải bấm sang tờ khác mới thấy.

Bảng ấy cũng chưa từng được kiểm xem nó có nói đúng không. Mọi phép đo về nó đến nay đều là
kích thước: 471px co về vừa khít 374px (Phase 3.30, memory project_phase3_30_walls_boss_fortify),
97% số lần dựng lại có nội dung khác thật (memory project_hover_flicker_bug). Không phép đo nào
hỏi "bộ lạc đứng đầu bảng ở giữa kỷ nguyên có phải bộ lạc thắng cuối cùng không" — **chưa đo**.

**Vì sao.** Đây là chỗ có một lỗ thủng đọc được thẳng từ mã. Hàm `wonderBlock()`
(js/11-tribe-brain.js:260) trả về lý do dạng chuỗi vì sao một bộ lạc chưa được xây Kỳ quan, và
chính hàm ấy sinh ra con số quan trọng nhất của Phase 3.44. Nhưng **không một tệp giao diện nào
gọi nó**: `grep wonderBlock` trên `js/13*`, `js/14`, `js/15`, `js/16` ra 0 kết quả, và chỗ dùng
duy nhất là `wonderAllowed` (js/11-tribe-brain.js:276). Người xem chỉ thấy huy hiệu 👑 khi bộ
lạc **đã** đủ Thiên Mệnh (js/14-ui-panels.js:383). Lý do chiếm 62,2% số ca, "chưa tới Thiên
Triều", không có chỗ hiển thị nào (lượt đo 2026-09-02, phụ lục).

Cùng hình dạng ấy lặp ở huy hiệu ⛯ báo chặn lên đời (js/14-ui-panels.js:420). Nó đọc từ
`ageBlock()`, mà hàm này cố ý không xét tài nguyên (js/11-tribe-brain.js:297), trong khi hai
vật cản nặng nhất từng đo lại chính là tài nguyên: lương chặn 100% trên 122 mẫu (Phase 3.16,
memory project_phase3_16_cavalry_upgrades) và đá chặn 373/373 mẫu (Phase 3.35, memory
project_phase3_35_stamina_capital_wonder). Nói cách khác, cái huy hiệu báo chặn đang báo đúng
cánh cửa ít chặn nhất.

**Chuyện gì sắp xảy ra.** Game có đúng ba cơ chế dự báo thật, và cả ba đều đọc được:

| Dự báo | Cơ chế | Số đo |
|---|---|---|
| Ai sắp thắng bằng Kỳ quan | Thanh đếm ngược trên đỉnh khung hình, bật từ lúc đặt móng | Ở 46,5% tiến độ, 3/3 bộ lạc địch đã quay sang nhắm chủ (Phase 3.35) |
| Ai sắp diệt vong | Đồng hồ mất kinh đô 600 tick, cảnh báo đỏ dưới 300, điểm nóng trọng số 14 kéo camera tới | Luật đo ở Phase 3.35; phần hiển thị **chưa đo** |
| Đợt quái kế tiếp (thủ thành) | Đếm ngược "Đợt sau còn n tick" | Từng báo một sự kiện không xảy ra: 0 con còn lại sau 200 tick, đã sửa (Phase 3.4) |

Ngoài ba cái đó, mọi thứ còn lại đều kể chuyện **đã** xảy ra. Toast "tuyên chiến" nghe như dự
báo, nhưng khoảng cách từ dòng ấy tới đòn đánh đầu tiên **chưa đo**.

**Camera đạo diễn là cơ chế đọc-hiểu được đo kỹ nhất**, và nó cũng cho thấy vì sao phải đo:
bốn lỗi liên tiếp đều vô hình nếu chỉ nhìn. Trọng số cảnh bị đóng băng ở 293 trong khi trận
lớn nhất thật chỉ 105; 64 trên 400 frame camera đang lia dở giữa đồng cỏ; cú máy trung bình
chỉ 0,95 giây. Sau khi sửa, cú máy dài 2,2 đến 7,5 giây và mục tiêu nằm trong nửa giữa khung
hình ở 99 đến 100% số frame (memory project_director_camera_bugs). Riêng nhãn 🎬 tên cảnh thì
đã **hai lần** được ghi nhận là chưa từng hiện ra: lần đầu vì `style.display = ''` thua luật
CSS, lần sau vì thiếu `z-index` (memory project_phase3_20_overlap). Số lần nó hiện ở v3.44 vẫn
**chưa đo**.

### 3b. Quyền năng có nghĩa không

Sáu quyền năng, giá Đức Tin lần lượt 24 · 16 · 12 · 42 · 34 · 75 (js/12-loop-era.js:563 và các
mục kế). Câu trả lời ngắn: với người xem thụ động thì chúng gần như không tồn tại, và với
người xem chủ động thì chỉ một cái có bằng chứng đổi được thế giới.

**Ba tầng im lặng, xếp chồng lên nhau.**

Tầng thứ nhất là `autoGod = false` (js/12-loop-era.js:991), và ô tick trên giao diện bị ghi đè
về `false` mỗi lần tải trang (js/15-input-boot.js:725). Ai mở game rồi ngồi xem sẽ không thấy
một quyền năng nào được bấm.

Tầng thứ hai là dòng sử. Năm trong sáu quyền năng ghi nhật ký **không kèm cờ quan trọng**
(js/12-loop-era.js:607, 641, 656, 671, 692), nên bấm Sét Trời hay Dịch Bệnh cũng không sinh
thông báo nổi giữa bản đồ và không kích hoạt quay chậm. Chỉ Thiên Ma được đánh dấu, ở cả ba dòng giáng thế, gục ngã và trao kho báu
(js/12-loop-era.js:862, 896, 912).

Tầng thứ ba là bằng chứng. Bảng dưới đây phân loại theo đúng chuẩn của dự án, tức có số đo
cho thấy bỏ đi thì hành vi đổi hay không:

| Quyền năng | Trạng thái | Bằng chứng |
|---|---|---|
| Thiên Ma | **chịu tải** | Một lần thả giết 17 người, san 6,4 nhà, đục 3,6 ô tường, phương sai 2 đến 47 mạng (Phase 3.30). Kho báu về tay ai đó ở 5/5 ván sau khi sửa `lastHitTribe` (Phase 3.30) |
| Mưa Lành | trang trí | Từng là mã chết hai bản liền vì duyệt danh sách chứa 0 trên 2.581 bụi quả; đã sửa, sau sửa **chưa đo** (Phase 3.34) |
| Sét Trời | trang trí | Mọi con số quanh nó là số học từ bảng máu, không phải số mạng đếm trong ván (js/01e-config.js:350) |
| Rừng Mọc | trang trí | Không ghi chú memory nào nhắc tới nó ngoài danh sách sáu quyền năng; lời hứa "bịt một hướng tiến quân" **chưa đo** |
| Ban Phước | trang trí | Chỉ có số học bảng giá: 35 Đức Tin đổi 750 tài nguyên, nên bị nâng lên 42 (Phase 3.30) |
| Dịch Bệnh | trang trí | Tuyên bố "khiến trận đánh kế tiếp thua" nằm trong chú thích, **chưa đo** |

Vòng thờ cúng thì ngược lại, nó chịu tải rõ ràng, vì ba lần đổi hằng số đều xuất phát từ phép
đo: Đức Tin mỗi lễ hạ từ 5 xuống 2 vì ở mức 5 thì Đức Tin dính trần 100 suốt bốn kỷ nguyên
liền; sàn dâng tế hạ từ 100% xuống 60% vì chênh 25 so với 125 lần tế mỗi kỷ nguyên; và tế phẩm
chuyển từ vàng sang lương vì 199 lần tế rút mất 4.000 vàng và khoá luôn Kỳ quan
(js/01e-config.js:542, Phase 3.6).

Còn một vế mang cùng hình dạng lỗi mà Phase 3.34 đã sửa cho Mưa Lành, nhưng vẫn còn nguyên ở
đường ban phước: `grantBlessing` loại mưa vẫn duyệt `regrowList` (js/11-tribe-brain.js:2070),
mà `BERRY_REGROW = 0` từ Phase 3.25 (js/01a-config.js:126) nên danh sách ấy không chứa bụi quả
nào. Phần cộng lương vào kho vẫn chạy; chỉ vế bụi quả là chết. Đây là **suy ra từ mã, chưa đo
lượng lương mất đi**.

### 3c. Nhịp ván

Đây là chỗ lượt đo hôm nay nói to nhất.

Ở tốc độ mặc định 12 tick mỗi giây (js/02-state-util.js:165), trần kỷ nguyên 30.000 tick
(js/01e-config.js:325) bằng **41,7 phút** đồng hồ thật. Tám kỷ nguyên của lượt đo hôm nay quy
ra phút như sau (lượt đo 2026-09-02, phụ lục):

| Kỷ nguyên | Tick | Phút thật | Kết thúc vì |
|---|---|---|---|
| 1 | 30.000 | 41,7 | hết giờ |
| 2 | 30.000 | 41,7 | hết giờ |
| 3 | 30.000 | 41,7 | hết giờ |
| 4 | 27.690 | 38,5 | Kỳ quan |
| 5 | 30.000 | 41,7 | hết giờ |
| 6 | 10.711 | 14,9 | Kỳ quan |
| 7 | 30.000 | 41,7 | hết giờ |
| 8 | 30.000 | 41,7 | hết giờ |

**Sáu trên tám kỷ nguyên hết giờ.** Với người xem, một ván hết giờ là 41,7 phút không có đoạn
kết: không ai thống nhất thiên hạ, không Kỳ quan nào khánh thành, chỉ có một bảng điểm khép
lại. Xem trọn tám kỷ nguyên tốn 5,1 giờ.

Con số này lệch xa Phase 3.44, vốn chỉ có 2/8 kỷ nguyên chạm trần, nên nó chưa phải kết luận.
Nhưng hai lượt cộng lại cho 8 trên 16 kỷ nguyên hết giờ, và đó là đủ để đặt nó thành một câu
hỏi phải đo, chứ không phải một chi tiết bỏ qua được.

Về mật độ sự kiện, mã có 63 lời gọi `logEvent` trải trên 8 tệp, trong đó 39 lời gọi luôn đánh
dấu quan trọng và 2 lời gọi đánh dấu có điều kiện (js/02-state-util.js:263 và các chỗ gọi).
Chỉ mục quan trọng mới sinh thông báo nổi và quay chậm 1,1 giây (js/02-state-util.js:285).
Nhưng **khoảng lặng dài nhất giữa hai sự kiện thì chưa đo**, vì `eventLog` bị cắt ở 200 mục
(js/01e-config.js:561) và bộ đo hiện tại không móc vào `logEvent`. Đây là con số phải có nếu
muốn nói bất cứ điều gì về nhịp.

Một chỉ số nữa từ lượt đo hôm nay đáng chú ý: tỉ lệ thời gian có quân địch trong 15 ô quanh một
kinh đô dao động từ **0% tới 13,1%** tuỳ kỷ nguyên, và kỷ nguyên số 5 có đúng 0% cùng với 0
kinh đô bị hạ và máu kinh đô thấp nhất vẫn là 100%. Nghĩa là trong ván ấy **chưa từng có một
cuộc vây thành nào** suốt 41,7 phút.

## 4. Học tư duy hệ thống

Mục này ngắn hơn mục 3 vì trục chính đã chọn, nhưng nó chứa phát hiện có giá trị nhất về lâu dài.

**Cơ chế nào chịu tải.** Rất nhiều, và đó là điểm mạnh thật của dự án. Vài ví dụ có số hai
đầu: trần thể lực tuyệt đối 0,55 ô mỗi tick, vì hệ số nhân làm khoảng cách nở ra 56,8 ô rồi
đóng băng (Phase 3.35); `blockedGrid` dạng `Uint8Array` đưa BFS từ 20,1ms xuống 3,01ms với
diff 0 ô trên 140.908 ô (Phase 3.42); ngưỡng cạn chung `RES_MIN` gỡ 274 ô kẹt (Phase 3.25);
tách `armyReserve` khỏi `reserve`, vì gộp chung bắt bộ lạc cần 596 lương mới dám đẻ một người
trong khi khởi đầu chỉ có 250 (Phase 3.33).

**Cơ chế nào trang trí hoặc đã chết.** Danh sách này mới là bài học, vì cả sáu ca đều được
phát hiện **tình cờ trong lúc làm việc khác**, không ca nào do một quy trình rà soát tìm ra:

| Cơ chế | Đo ra | Phase |
|---|---|---|
| Hợp nhất thánh vật khi hòm đầy | 0 trên 19 lần hợp nhất; hòm đầy chiếm 0,8% thời gian | 3.19 |
| Nhánh nghiên cứu Công thành | 1 trên 16 bộ lạc chọn; 0,0% thời gian có cỗ máy nâng cấp | 3.31 |
| Hoàn Đức Tin khi Thiên Ma bị từ chối | Mã chết bốn bản liền vì thiếu một `return`; Đức Tin 100 xuống 25 mà quái không sinh ra | 3.30 đến 3.34 |
| Gen `towerTarget` | Tương quan với số tháp chỉ 0,047, vì sàn cứng nuốt hết kiểu hình | 3.30 |
| Trần dân 300 | 0 tick chạm trần trong 8 ván | 3.30 |
| Nhà y tế hồi máu tại công trình | 224 máu trong 3 kỷ nguyên; thương binh ở cách 65,8 ô | 3.23 |

Ở v3.44 thì cả 27 gen đều có ít nhất một chỗ đọc, nên không gen nào là mã chết theo nghĩa
không bao giờ được hỏi tới. Nhưng **8 trong 22 gen chiến lược chỉ có đúng một dòng đọc** trong
logic mô phỏng: `foodWeight`, `woodWeight`, `goldWeight`, `houseBuffer`, `towerTarget`,
`stoneWeight`, `cityPlan`, `garrison`. Mỗi gen ấy treo trên một biểu thức, và một lỗi ở dòng đó
là gen tắt trong im lặng, đúng như `towerTarget` đã tắt.

**Câu hỏi lớn vẫn mở, và tôi không trả lời nó ở đây.** Bằng chứng duy nhất từng có về việc gen
bị kéo qua các thế hệ là độ dốc `braveness` +0,06 trên 2 tới 14 dòng dõi, tức nhiễu thuần
(Phase 3.2). Ở tầng bộ lạc chỉ có một tương phản đẹp là `aggression` 0,42 ở thủ thành so với
0,78 ở chinh phạt, giải thích được thẳng từ mã vì khối quyết định khai chiến bị bỏ qua ở thủ
thành nên gen không có kiểu hình (Phase 3.4). Đó là 4 so với 7 kỷ nguyên mẫu. Câu hỏi "chọn
lọc có thắng nổi nhiễu không" là Phase 1 của lộ trình, không phải kết luận của tài liệu này.

Có một chi tiết cấu trúc làm câu hỏi ấy khó hơn vẻ ngoài: gen `wonderDrive` chỉ được hỏi tới
khi `wonderAllowed` đúng, mà 62,2% mẫu bị chặn vì chưa tới Thiên Triều (lượt đo 2026-09-02).
Một gen không có kiểu hình trong phần lớn thời gian thì đường đi của nó là trôi dạt, và điều
này không phải lỗi mà là hệ quả của luật chơi.

## 5. Sức khoẻ mã

Quy mô và hình dạng, đo ngày 2026-09-02:

| | |
|---|---|
| Mã JavaScript | 26.661 dòng trong 31 tệp |
| CSS và HTML | 956 và 517 dòng |
| Thẻ `<script>` | 31, tất cả cổ điển, 0 thẻ `type="module"` |
| Chú thích | 12.040 dòng, tức 45,2% |
| Hàm | 481, trong đó 37 hàm dài hơn 100 dòng |
| Hàm dài nhất | `drawMonster` 1.073 dòng, `tribeBrain` 895 dòng |

Tỉ lệ chú thích 45,2% là đặc điểm của dự án chứ không phải lỗi: phần lớn chú thích ghi lại một
phép đo và lý do một hằng số mang giá trị hiện tại.

**Cái gì đang bảo vệ repo.** Chuẩn "mọi tuyên bố phải đo được" cộng 62 ghi chú memory là lớp
bảo vệ mạnh nhất, vì nó biến mỗi bài học thành một con số tra lại được. Thêm vào đó có
`.claude/serve.py` gửi `Cache-Control: no-store`, `.claude/measure-headless.js` để đo không cần
khung hình, và `I18N.report()` liệt kê khoá thiếu bản dịch lúc chạy, vốn từng tìm ra đúng 390
khoá mà đọc mã tĩnh không thấy (Phase 3.36).

**Cái gì chưa được bảo vệ.** Repo không có kiểm thử tự động, không có `package.json`, không có
CI và không có git hook nào hoạt động. Thứ tự bắt buộc của 31 thẻ script chỉ được bảo vệ bằng
văn xuôi trong `CLAUDE.md`, trong khi có 2 dòng top-level đọc `CONFIG` ngay lúc tải
(js/02-state-util.js:189 và js/05-entities.js:423) và `CONFIG` chỉ tồn tại sau dòng ghép ở
js/01e-config.js:563. Đảo nhầm một thẻ là vỡ, và vỡ im lặng.

Toàn bộ 26.661 dòng chỉ có 3 khối `try/catch`, đều nằm trong `js/00-i18n.js`, và không có
`window.onerror` nào. Một `ReferenceError` lúc nạp sẽ dừng tệp đó mà không để lại dấu vết nào
trong console của Browser pane, đúng cái bẫy đã trả giá ở Phase 3.8.

Năm tệp thiếu `'use strict'`: `00-i18n`, ba tệp từ điển và `17-i18n-boot`, trong khi ghi chú
tách file nêu rõ chỉ thị này không kế thừa giữa các thẻ script nên mỗi tệp phải tự khai (memory
project_file_split_15). Hệ quả cụ thể thì **chưa đo**.

Sáu hàm được định nghĩa mà grep ra đúng một kết quả trên toàn repo, tức không nơi nào gọi:
`Topt`, `wallAt`, `terrainAt`, `isStandard`, `monsterThreat`, `gearMat`. Tỉ lệ 1,2% trên 481
hàm là thấp, nên đây là ghi nhận chứ không phải vấn đề.

Tài liệu này **không đề xuất** ES module, bundler hay bất kỳ bước build nào. Ràng buộc ấy dựa
trên một phép đo thật, `classic=1 module=0` trong Chrome headless, và người chơi mở game bằng
cách bấm đúp tệp.

## 6. Ba quyết định đang treo

Tôi đề xuất, không chốt. Mỗi mục nêu điều gì đổi nếu chọn ngược lại.

**`fitness` — chế độ chọn lọc anh hùng mặc định.** Đề xuất giữ `personal`, nhưng đo trước khi
chốt. Lý do là toàn bộ số đo hiện có đều thuộc về `personal`: tử trận tăng từ 22% lên 46% sau
khi cho lính và tháp địch ưu tiên nhắm anh hùng, và trần tuổi thọ 1.800 tick giữ cho vòng
chọn lọc quay được (Phase 3.2). Chế độ `tribe` chưa có một con số nào. Nếu chọn ngược lại,
nghịch lý đáng xem nhất của dự án sẽ mất: dưới `personal` thì anh hùng nhát sống lâu hơn nhưng
đóng góp kém 23 lần, và chính sự căng ấy là bài học multi-level selection.

**`luusu` — lưu lịch sử kỷ nguyên xuống localStorage.** Đề xuất làm, và làm sớm hơn bạn nghĩ,
vì Phase 1 của lộ trình cần 30 kỷ nguyên nối tiếp trong khi `eraHistory` chỉ giữ 12 mục trong
RAM (js/12-loop-era.js:409). Nếu chọn ngược lại thì bộ đo phải tự giữ số liệu ngoài game, tức
là dựng một đường lưu trữ thứ hai chỉ để phục vụ phép đo.

**`giayphep` — giấy phép.** Không có phép đo nào cho mục này, và tôi không có cơ sở kỹ thuật để
đề xuất một chiều. Điều duy nhất đáng ghi là quyết định đã có hiệu lực thật: v3.44 đã phát hành
công khai mà không kèm giấy phép, nên hiện người khác được xem và chạy thử chứ chưa được dùng
lại mã.

## 7. Lộ trình

Năm phase, xếp theo một nguyên tắc: **không phase nào được sửa mã trước khi có phép đo chỉ ra
nút thắt**. Nguyên tắc ấy không phải khẩu hiệu mà là bài học đã trả giá ba lần, gần nhất là
chính Phase 3.44, nơi kế hoạch nới `NEED_TOWNS` bị chính phép đo loại vì 62,2% số ca bị chặn ở
chỗ khác.

### Phase A — Chọn lọc có thắng nổi nhiễu không

| | |
|---|---|
| **Mục tiêu** | Trả lời một câu cho hai tầng tiến hoá: gen `piety` ở tầng bộ lạc và `braveness` ở tầng anh hùng **trôi** hay **bị kéo**, dưới hai môi trường Chúa Tể tự động bật và tắt |
| **Phép đo nút thắt** | Đã có, và cả ba đều nói nút thắt còn nguyên: độ dốc `braveness` +0,06 trên 2–14 dòng dõi là nhiễu thuần (Phase 3.2); tương phản `aggression` 0,42 với 0,78 chỉ trên 4 so với 7 kỷ nguyên (Phase 3.4); và hai lượt tám kỷ nguyên của cùng bản dựng cho 2,58 với 0,78 kinh đô trên 10k tick (mục 2) |
| **Tiêu chí thành công** | 5 hạt giống × 2 nhánh × 30 kỷ nguyên **nối tiếp**, ghép cặp theo hạt giống, báo theo **từng cặp**. Kết luận "bị kéo" khi cùng dấu ở ≥ 4/5 cặp và độ dịch lớn hơn một bước đột biến σ = 0,12 × biên độ gen |
| **Điều kiện dừng** | Dừng ở 3 cặp nếu dấu của hiệu đã khác nhau giữa các cặp và độ lớn nhỏ hơn một phần ba độ lệch chuẩn. Kết quả "trôi" cũng là kết quả, và khi đó **không** chỉnh mutation để ép ra tín hiệu |
| **Cỡ việc** | Lớn về giờ máy, khoảng 300 kỷ nguyên. Nhỏ về mã: chỉ chạm `.claude/measure-headless.js`, không đụng `js/` |

Phase này phải đứng đầu vì nó là câu hỏi gốc của dự án, và vì **cùng một lượt chạy sinh dữ liệu
cho ba phase sau** mà không tốn thêm giờ máy nào.

Có một cạm bẫy đã biết phải tránh: bộ chạy ghép cặp luôn đo kỷ nguyên 1 với gen ngẫu nhiên,
mà kỷ nguyên 1 và kỷ nguyên đã tiến hoá là hai trò khác nhau, cụ thể là 25.809 tick với 2/6
thắng bằng Kỳ quan so với 14.301 tick với 7/7 (memory project_paired_seeded_ab). Phải chạy
chuỗi nối tiếp bằng `beginNextEra`, không phải 30 lần kỷ nguyên 1.

### Phase B — Ván phải có đoạn kết

| | |
|---|---|
| **Mục tiêu** | Giảm tỉ lệ kỷ nguyên kết thúc vì chạm trần 30.000 tick. Trước khi đổi bất kỳ hằng số nào, tách riêng các kỷ nguyên chạm trần và hỏi chính `wonderBlock()` cùng `ageBlock()` xem cái gì kẹt |
| **Phép đo nút thắt** | Đã có cho triệu chứng: 6/8 kỷ nguyên chạm trần hôm nay, 2/8 ở Phase 3.44, tổng 8/16. Mỗi ván chạm trần là 41,7 phút không có đoạn kết. Nguyên nhân thì **chưa đo** |
| **Tiêu chí thành công** | Tỉ lệ chạm trần tính trên ≥ 30 kỷ nguyên lấy từ dữ liệu Phase A, không cần ghép cặp vì đây là một tỉ lệ. Chỉ sửa khi trong nhóm chạm trần có một lý do chiếm ≥ 60% mẫu. Khi sửa thì ghép cặp 6 hạt giống, bật tắt bằng một hằng số `CONFIG` |
| **Điều kiện dừng** | Nếu tỉ lệ chạm trần trên 30 kỷ nguyên ≤ 10% thì con số 6/8 hôm nay là phương sai, đóng phase bằng số. Nếu không lý do nào đạt 60% thì không nới gì cả |
| **Cỡ việc** | Vừa. Bước đo cùng cỡ Phase 3.44; bước sửa nếu tới thì cùng cỡ một A/B ở Phase 3.42 |

Mục 3 hàng đợi NOW, "nới đường lên đời nếu muốn Kỳ quan dày hơn", nằm gọn trong phase này dưới
dạng một phép đo có điều kiện chứ không phải một bản vá.

### Phase C — Nói cho người xem biết cái gì đang chặn

| | |
|---|---|
| **Mục tiêu** | Đưa lý do bị chặn ra khung hình. Cụ thể là gọi `wonderBlock()` từ giao diện và cho huy hiệu ⛯ đọc cả tài nguyên, để hai cánh cửa chặn nhiều nhất không còn vô hình |
| **Phép đo nút thắt** | Đã có, và là số cứng: `wonderBlock()` có 0 lời gọi từ mọi tệp giao diện dù nó đã sinh ra con số chính của Phase 3.44; lý do chiếm 62,2% số ca không có chỗ hiển thị nào (lượt đo 2026-09-02). Huy hiệu ⛯ chỉ báo cửa tháp canh trong khi lương chặn 100% trên 122 mẫu và đá chặn 373/373 mẫu |
| **Tiêu chí thành công** | Không cần ghép cặp vì đây là chỉ số cơ chế: 100% số ca một bộ lạc bị chặn Kỳ quan hoặc chặn lên đời đều có một chuỗi lý do đọc được trên giao diện, kiểm trên ≥ 3.000 mẫu bộ-lạc-tick. Kèm một lượt kiểm chồng lấn HUD theo đúng ma trận Phase 3.20, đạt khi 0 cặp giao nhau |
| **Điều kiện dừng** | Bỏ nếu Phase B kết luận rằng cửa lên đời không phải nút thắt của các ván hết giờ, vì khi ấy lý do bị chặn là thông tin phụ chứ không phải thứ giải thích ván |
| **Cỡ việc** | Nhỏ. So với Phase 3.37 là dọn HUD, nhỏ hơn Phase 3.20 |

Đây là phase duy nhất trong lộ trình sửa mã giao diện, và nó được xếp sau Phase B có chủ đích:
nói cho người xem biết cái gì đang chặn chỉ đáng làm nếu cái chặn ấy thật sự quyết định ván.

### Phase D — Kiểm kê cơ chế và hàm tính điểm

| | |
|---|---|
| **Mục tiêu** | Gắn bộ đếm kích hoạt cho từng cơ chế lớn, chạy trên chính dữ liệu Phase A, rồi liệt kê cơ chế nào 0 lần chạy. Cùng phase, đo xem số hạng kho trong `tribeScore` có từng đổi người thắng không |
| **Phép đo nút thắt** | Đã có: sáu cơ chế đo ra chết hoặc gần chết, và **cả sáu đều được phát hiện tình cờ** chứ không do một quy trình rà soát (bảng ở mục 4). Riêng `tribeScore` cộng bốn kho chia 40 (js/12-loop-era.js:298), nên kho 37.000 lương cộng 37.000 gỗ từng đo ở Phase 3.27 quy ra 1.850 điểm, gấp sáu lần 300 điểm của cả năm bậc thời đại |
| **Tiêu chí thành công** | ≥ 30 kỷ nguyên từ dữ liệu Phase A, không cần ghép cặp. Một cơ chế là "trang trí" khi 0 lần kích hoạt trong 30 kỷ nguyên. Với `tribeScore`, chỉ sửa khi bỏ số hạng kho đổi người thắng hoặc á quân ở ≥ 5% số lần kết thúc |
| **Điều kiện dừng** | Nếu mọi cơ chế đều chạy ≥ 1 lần mỗi 10 kỷ nguyên và số hạng kho đổi thứ hạng dưới 5%, phase kết thúc bằng đúng một bảng và một dòng ghi chú, không sửa gì |
| **Cỡ việc** | Vừa. Cỡ Phase 3.44 nếu chỉ đo; lớn hơn nếu `tribeScore` phải đổi |

Mục 2 hàng đợi NOW nằm ở đây.

### Phase E — Lưới an toàn và dọn dẹp

| | |
|---|---|
| **Mục tiêu** | Một script kiểm tra mở `civilization.html` bằng `file://` trong Chrome headless, đúng đường người chơi bấm đúp, và thất bại thành tiếng khi có lỗi console, khi `typeof simulationTick !== 'function'`, hoặc khi 200 lượt `simulationTick()` ném lỗi. Kèm xoá hai nhánh remote đã merge |
| **Phép đo nút thắt** | Đã có: 0 tệp test, 0 CI, 0 git hook; thứ tự 31 thẻ script chỉ được bảo vệ bằng văn xuôi trong khi 2 dòng top-level đọc `CONFIG` lúc tải; 3 khối `try/catch` và 0 lưới bắt lỗi toàn cục trên 26.661 dòng |
| **Tiêu chí thành công** | Chỉ số xác định, không cần ghép cặp: script **đạt** trên `main` và **thất bại** trên ít nhất 3 lỗi cấy vào, gồm đảo `01e-config.js` lên trước `01a`, một tham chiếu top-level tới biến chưa khai báo, và một thẻ script bị xoá. Một mẫu phản chứng cho mỗi loại là đủ |
| **Điều kiện dừng** | Bỏ phần `file://` nếu Chrome headless trên máy này không mở được, khi đó chỉ giữ biến thể qua `.claude/serve.py` và ghi lại khe hở |
| **Cỡ việc** | Nhỏ. Không đổi một dòng nào trong `js/` |

Mục 4 hàng đợi NOW nằm ở đây.

**Mục hàng đợi bị loại khỏi lộ trình.** Mục 1, ngoại giao và liên minh giữa các bộ lạc, không
được xếp vào phase nào. Lý do là chưa có phép đo nào cho thấy việc thiếu liên minh là nút thắt
của bất cứ thứ gì; nó là nội dung mới, không phải bản sửa. Nó chuyển sang mục ngã ba bên dưới
kèm điều kiện đo được để chọn. Nửa còn lại của mục ấy, đấu tay đôi giữa hai anh hùng, cũng
chưa có số về tần suất hai anh hùng địch gặp nhau, nên cùng chuyển sang ngã ba.

## 8. Ngã ba lớn

Bốn hướng dài hạn. Mỗi hướng kèm điều kiện đo được để chọn và cái giá phải trả. Không xếp hạng,
không chọn.

**Gen mạng nơ-ron kiểu NEAT thay cho một phần bộ gen vô hướng.** Hướng này đã bị gạt ở Phase 2
khi dự án chọn "thành game thật" thay vì "thêm ML thật" (memory project_phase2_status). Điều
kiện để mở lại: Phase A kết luận **bị kéo** ở ≥ 4/5 cặp cho ít nhất ba gen. Lý lẽ của điều kiện
ấy là nếu 22 gen vô hướng còn chưa chứng minh được chọn lọc thắng nhiễu, thì một mạng có hàng
trăm trọng số chỉ làm tín hiệu loãng thêm. Cái giá: bộ gen mất tính đọc được, và bảng 22 gen
trên giao diện, vốn là thứ giải thích hành vi bốn bộ lạc cho người xem, sẽ không còn nghĩa.

**Ngoại giao và liên minh, kèm đấu tay đôi anh hùng.** Điều kiện: từ dữ liệu Phase A, ≥ 30% số
kỷ nguyên chạm trần là thế bí của ba bộ lạc trở lên mà mọi cặp đều dưới ngưỡng khai chiến
`strength ≥ 1,8 − aggression × 1,3` (js/11-tribe-brain.js:1712). Khi đó liên minh là lời giải
đúng cho một vấn đề đã đo, chứ không phải nội dung thêm cho vui. Với đấu tay đôi thì điều kiện
là trung vị số lần hai anh hùng địch cùng nằm trong 6 ô suốt ≥ 30 tick phải ≥ 1 mỗi kỷ nguyên.
Cái giá: hai gen mới và một nhánh mới trong thang ưu tiên mục tiêu, mà thang ấy đã là nơi lỗi
"mục tiêu dính chặt" cắn bốn lần.

**Người xem thành người chơi, tức Chúa Tể tự động bật mặc định.** Điều kiện: Phase A cho `piety`
**bị kéo** ở nhánh auto-god bật và **trôi** ở nhánh tắt. Khi đó Chúa Tể tự động chính là bề mặt
chọn lọc mà thiết kế đã hứa, và bật nó mặc định biến sáu quyền năng từ trang trí thành luật
chơi nhìn thấy được. Cái giá: mọi số đo cân bằng từ trước tới nay đều đo trong một thế giới
không có quyền năng nào, nên phải đo lại từ đầu.

**Số phận `evolution.html`.** Bản mô phỏng tiến hoá cũ vẫn tự chứa và không liên quan tới `js/`.
Điều kiện để đóng băng nó vĩnh viễn: script kiểm tra của Phase E nạp nó với 0 lỗi console và
dân số cân bằng vẫn nằm trong 160 đến 190 như mốc Phase 0. Khi đó nó là một hiện vật đã hoàn
thành nhiệm vụ và không cần chạm tới nữa. Điều kiện để hồi sinh nó: Phase A kết luận **trôi**
ở cả hai tầng của Chúa Tể, vì khi ấy `evolution.html` lại là nơi duy nhất trong repo có bằng
chứng chọn lọc thắng nhiễu thật, cụ thể là metabolism hội tụ đơn điệu về sàn 0,05 khi khan
hiếm và đứng phẳng ở 0,31 khi dư thừa (Phase 0).

## 9. Đề xuất cập nhật bảng NOW

| Thao tác | Mục | Lý do |
|---|---|---|
| Giữ | Việc đang làm: đo 30+ kỷ nguyên chọn lọc vs nhiễu | Không có số nào cho thấy nó hết là nút thắt; thành Phase A |
| Thêm | Ván không có đoạn kết: 6/8 kỷ nguyên chạm trần ở lượt đo 2026-09-02, 2/8 ở Phase 3.44 | Phát hiện mới, và là điểm yếu nặng nhất ở lăng kính người xem |
| Thêm | `wonderBlock()` có 0 lời gọi từ giao diện | Lỗ thủng đọc được thẳng từ mã, chưa từng ghi ở đâu |
| Thêm | Vế bụi quả của `grantBlessing` vẫn duyệt `regrowList` | Cùng hình dạng lỗi Phase 3.34 đã sửa cho Mưa Lành, còn nguyên ở đường ban phước |
| Thêm | Bộ đo chia khúc bằng `setTimeout` bị trình duyệt đóng băng khi pane ẩn lâu | Đã cắn trong chính lượt đo này; xem mục 10 |
| Sửa | Mục 3 hàng đợi, nới đường lên đời | Chuyển thành bước đo có điều kiện trong Phase B, không phải bản vá |
| Sửa | Mục 2 hàng đợi, `tribeScore` cộng kho | Gộp vào Phase D, kèm ngưỡng 5% để quyết có sửa hay không |
| Sửa | Mục 4 hàng đợi, xoá hai nhánh remote | Gộp vào Phase E |
| Chuyển | Mục 1 hàng đợi, ngoại giao và đấu tay đôi | Chuyển sang mục ngã ba kèm điều kiện đo được, vì chưa có số cho thấy nó là nút thắt |
| Sửa | Quyết định `luusu` | Nâng độ nóng: Phase A cần 30 kỷ nguyên trong khi `eraHistory` chỉ giữ 12 |
| Sửa | Ghi chú "55 ghi chú memory" trong `CLAUDE.md` | Thư mục hiện có 62 tệp |

## 10. Phụ lục

Lượt đo chạy ngày 2026-09-02, tại commit `0a62943` (tag `v3.44`), chế độ chinh phạt,
`autoGod = false`, tám kỷ nguyên nối tiếp, lấy mẫu mỗi 100 tick bằng chính `wonderBlock()` của
game. JSON nguyên văn:

```json
{
 "ngay": "2026-09-02T05:49:33.951Z",
 "commit": "0a62943 (v3.44)",
 "che_do": "conquest",
 "autoGod": false,
 "eras": 8,
 "tong_tick": 218401,
 "kinh_do_bi_ha": 17,
 "tren_10k_tick": 0.78,
 "eras_co_raze": 7,
 "eras_thang_bang_ky_quan": 2,
 "eras_cham_tran_30000": 6,
 "tung_ky_nguyen": [
  { "era": 1, "tick": 30000, "phut_that": 41.7, "ly_do": "lead",   "kinh_do_ha": 3, "so_bo_lac_co_thien_menh": 1, "thay_ky_quan": 0, "kinh_do_sap_tong": 6, "vay_kinh_do_pct": 2,    "mau_town_thap_nhat": 0.04 },
  { "era": 2, "tick": 30000, "phut_that": 41.7, "ly_do": "lead",   "kinh_do_ha": 5, "so_bo_lac_co_thien_menh": 1, "thay_ky_quan": 0, "kinh_do_sap_tong": 6, "vay_kinh_do_pct": 12.7, "mau_town_thap_nhat": 0.02 },
  { "era": 3, "tick": 30000, "phut_that": 41.7, "ly_do": "lead",   "kinh_do_ha": 1, "so_bo_lac_co_thien_menh": 1, "thay_ky_quan": 1, "kinh_do_sap_tong": 1, "vay_kinh_do_pct": 12.3, "mau_town_thap_nhat": 0.01 },
  { "era": 4, "tick": 27690, "phut_that": 38.5, "ly_do": "wonder", "kinh_do_ha": 2, "so_bo_lac_co_thien_menh": 2, "thay_ky_quan": 1, "kinh_do_sap_tong": 3, "vay_kinh_do_pct": 6.9,  "mau_town_thap_nhat": 0.03 },
  { "era": 5, "tick": 30000, "phut_that": 41.7, "ly_do": "lead",   "kinh_do_ha": 0, "so_bo_lac_co_thien_menh": 0, "thay_ky_quan": 0, "kinh_do_sap_tong": 0, "vay_kinh_do_pct": 0,    "mau_town_thap_nhat": 1 },
  { "era": 6, "tick": 10711, "phut_that": 14.9, "ly_do": "wonder", "kinh_do_ha": 1, "so_bo_lac_co_thien_menh": 1, "thay_ky_quan": 1, "kinh_do_sap_tong": 1, "vay_kinh_do_pct": 13.1, "mau_town_thap_nhat": 0.06 },
  { "era": 7, "tick": 30000, "phut_that": 41.7, "ly_do": "lead",   "kinh_do_ha": 2, "so_bo_lac_co_thien_menh": 1, "thay_ky_quan": 0, "kinh_do_sap_tong": 2, "vay_kinh_do_pct": 11.3, "mau_town_thap_nhat": 0.08 },
  { "era": 8, "tick": 30000, "phut_that": 41.7, "ly_do": "lead",   "kinh_do_ha": 3, "so_bo_lac_co_thien_menh": 2, "thay_ky_quan": 0, "kinh_do_sap_tong": 5, "vay_kinh_do_pct": 13,   "mau_town_thap_nhat": 0 }
 ],
 "chan_cua_ky_quan": [
  { "ly_do": "chưa tới Thiên Triều",            "so_mau": 4693, "pct": 62.2 },
  { "ly_do": "chưa hạ đủ kinh đô địch (0/1)",   "so_mau": 2275, "pct": 30.1 },
  { "ly_do": "(mở)",                            "so_mau": 578,  "pct": 7.7 }
 ],
 "tong_mau_bo_lac_tick": 7546
}
```

Một ghi chú về cách lượt đo này chạy, vì nó là một cái bẫy mới chưa có trong `CLAUDE.md`.
Bộ đo `.claude/measure-headless.js` nối các khúc 4.000 tick bằng `setTimeout`, và chuỗi ấy
**bị trình duyệt đóng băng** sau vài phút khi Browser pane bị ẩn: `bg.on` vẫn đúng, không lỗi
nào trong console, mà số khúc dừng ở 34 và tick đứng yên tại 18.310 suốt hai lần kiểm cách nhau
năm phút. Bốn kỷ nguyên đầu chạy bằng chuỗi `setTimeout`; bốn kỷ nguyên sau chạy bằng một vòng
lặp đồng bộ gọi thẳng `simulationTick()` theo từng khúc 10.000 tới 16.000 tick. Hai cách gọi
cùng một hàm mô phỏng với cùng nhịp lấy mẫu, nên số liệu đồng nhất; chỗ khác nhau chỉ là ai
đẩy vòng lặp.
