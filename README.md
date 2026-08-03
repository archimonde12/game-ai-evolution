# Chúa Tể — mô phỏng tiến hoá, chạy thẳng trong trình duyệt

Hai trò chơi mô phỏng viết bằng JavaScript thuần, **không build, không phụ thuộc, không cần server**.
Tải về rồi bấm đúp file `.html` là chạy. Giao diện **song ngữ Việt / English** — mặc định tiếng Việt,
đổi bằng phím <kbd>L</kbd>.

| File | Là gì |
|---|---|
| [`index.html`](index.html) | **Trang chọn trò** — cái kệ. Mở thư mục hay mở gốc máy chủ là rơi vào đây, rồi chọn một trong hai trò bên dưới. |
| [`civilization.html`](civilization.html) | **Chúa Tể** — trò chính. Mô phỏng văn minh kiểu AoE tự chơi lấy, người chơi là một vị thần chỉ ngồi xem và thi thoảng can thiệp. |
| [`evolution.html`](evolution.html) | **Tiến Hoá** — bản mô phỏng đầu tiên: thú ăn cỏ / thú ăn thịt, tiến hoá ở tầng **cá thể**. (Trước đây tệp này chính là `index.html`.) |

## Cái đang tiến hoá là gì

Trong `civilization.html`, đơn vị **không** tiến hoá theo cá thể. Có **hai vòng tiến hoá lồng nhau**:

1. **Tầng bộ lạc** — mỗi bộ lạc mang một bộ "gen chiến lược" (`POLICY_SPEC`): dồn dân vào gỗ hay lương,
   nuôi bao nhiêu lính, hiếu chiến tới đâu, có vội lên thời đại không, sùng đạo cỡ nào.
   Cuối mỗi kỷ nguyên, policy của bộ lạc **thắng** được nhân bản + đột biến thành 3 bộ lạc kỷ nguyên
   sau, cộng 1 bộ lạc ngẫu nhiên để giữ đa dạng. Đây là một genetic algorithm chạy ở tầng **chiến lược**.
2. **Tầng anh hùng** — mỗi bộ lạc có một anh hùng mang gen **cá nhân** (`HERO_GENE_SPEC`), chọn lọc theo
   một hàm fitness riêng, nằm *lồng bên trong* vòng thứ nhất.

Xem lâu sẽ thấy "các nền văn minh học được cách chơi" — và hai vòng chọn lọc đôi khi kéo về hai hướng
ngược nhau, đó mới là chỗ đáng xem.

Người chơi = **Chúa Tể**: không điều khiển ai cả. Tiêu Đức Tin (tự hồi) để giáng sét / ban mưa / gieo dịch,
hoặc đáp lại lời khẩn cầu của bộ lạc — tuỳ thích, không bắt buộc.

Có hai thế cuộc: **Chinh Phạt** (các bộ lạc đánh nhau, thắng bằng quân sự hoặc xây xong Kỳ quan) và
**Thủ Thành** (các bộ lạc thôi đánh nhau, cùng chống các đợt quái vật mỗi lúc một mạnh).

Kỳ quan **không mua được bằng kho**: phải lên tới **Thiên Triều** (đời 5), phải hạ được kinh đô của một
bộ lạc khác trước (*Thiên mệnh*), và cả bản đồ chỉ được có **một** Kỳ quan — kể cả đang xây dở. Nghĩa là
đường thắng bằng công trình đi *xuyên qua* chiến tranh chứ không vòng qua nó. Và **khởi công là một lời
tuyên bố, không phải một bí mật**: ngay từ tick đặt móng, ba bộ lạc kia bỏ mọi mâu thuẫn để kéo tới công
trường, còn chủ nhân thì triệu hồi toàn quân về giữ. Đo bản cũ, từ móng tới khánh thành chỉ **110–125
tick** — mười giây thật, ngắn hơn quãng đường đạo quân gần nhất đi tới đó, nên cửa sổ ấy chưa từng tồn tại.
Nay là **2.460 tick** (đo thật: 527 và 667 tick từ móng tới khánh thành).

Mất **sạch** kinh đô khởi động một **đồng hồ đếm ngược 600 tick** tới diệt vong — dựng lại được một cái
trước khi hết giờ thì thoát. Đồng hồ *đứng yên* trong lúc đang có thợ dựng móng nhà chính, nên nó chấm
dứt việc **chạy rông** chứ không phạt kẻ đang gượng dậy.

## Thể lực — chạy thì hao, đi thì không

Trước đây tốc độ là hằng số của loài, và hệ quả không phải "kỵ xạ mạnh" mà là: **một đơn vị nhanh hơn thì
không bao giờ bị bắt** — theo đúng nghĩa số học, vì khoảng cách giữa kẻ chạy và kẻ đuổi tăng đơn điệu.

Thể lực chỉ vơi khi đơn vị **chạy dưới áp lực** (đuổi ai · bỏ chạy khỏi ai · rút lui · đi săn). Đi làm,
gánh hàng và hành quân thì không tốn gì, nên cơ chế vô hình với cả nền kinh tế lẫn mọi trận đánh ngắn.
Cạn sạch thì tốc độ bị chặn ở **0,55 ô/tick** — một cái **trần tuyệt đối**, không phải hệ số nhân. Đó là
điểm mấu chốt: *một con ngựa mệt không còn là một con ngựa nhanh.* Bản đầu dùng hệ số nhân và bị chính
phép đo bác bỏ — nhân cùng một số vào cả hai bên thì tỉ số tốc độ giữ nguyên, khoảng cách nở ra 56,8 ô
rồi **đóng băng** ở đó mãi mãi.

Sức chứa đo bằng **giây chạy nước rút**, không bằng quãng đường: kỵ binh ~45 tick, bộ binh ~130, dân
thường ~45 (thấp nhất), quái vật 900 ô (gần như không bao giờ đuối). Nhờ vậy kẻ chạy nhanh kiệt sức
*trước* kẻ đuổi, và cuộc rượt kết thúc được — đo trên mô hình: kỵ xạ bỏ chạy khỏi bộ binh bị bắt kịp ở
tick 97 sau khi khoảng cách đã nở ra 23 ô.

Quyền năng của Chúa Tể **mạnh dần theo đồng hồ kỷ nguyên** — một cái kho cuối kỷ nguyên lớn gấp hàng chục
lần cái kho đầu kỷ nguyên, nên một quyền năng đứng yên là một quyền năng tan biến. Riêng **Thiên Ma** bị
khoá cho tới khi có ít nhất một bộ lạc lên đời 4: điều kiện là *thời đại* chứ không phải một mốc tick, nên
nó đọc được thẳng trên bản đồ.

## Cấu trúc mã nguồn

`civilization.html` từng là **một** file 12.711 dòng. Nay đã tách:

```
civilization.html      vỏ HTML + thứ tự nạp script
css/game.css           toàn bộ giao diện
js/00-i18n.js          bộ máy song ngữ: T()/TL(), vá nhãn trong dữ liệu, đổi ngôn ngữ
js/00-lang-en.js       từ điển Anh — nhãn dữ liệu + khung giao diện
js/00-lang-en-legend.js  từ điển Anh — riêng bài luật chơi ở khung trái
js/00-lang-en-game.js  từ điển Anh — chữ do mã sinh ra lúc chạy
js/01a-config.js       CONFIG phần 1/5 — bản đồ, kinh tế, thể lực, chỉ số đơn vị
js/01b-config.js       CONFIG phần 2/5 — nâng cấp, anh hùng, phòng thủ, quái vật
js/01c-config.js       CONFIG phần 3/5 — chế độ Thủ thành, vật phẩm, xây dựng, tường thành
js/01d-config.js       CONFIG phần 4/5 — công thành, thuộc địa, thầy lang, hậu cần, Kỳ quan, ruộng
js/01e-config.js       CONFIG phần 5/5 — đường cái, thời đại, kỷ nguyên, quyền năng, Thiên Ma;
                       ghép cả 5 phần bằng Object.assign(); rồi tới TRIBE_TEMPLATES
js/02-state-util.js    trạng thái toàn cục, tiện ích, sinh địa hình & bản đồ
js/03-territory.js     lãnh thổ theo ảnh hưởng công trình
js/04-genes.js         hai bộ gen: policy bộ lạc + gen anh hùng
js/05-entities.js      mở kỷ nguyên, bảng đơn vị, hệ nâng cấp, sinh/huỷ
js/06-movement.js      bước đi, flow field, đội hình, chọn mục tiêu phòng thủ
js/07-ai-villager.js   não dân thường
js/08-ai-combat.js     sát thương, chỉ số hiệu dụng, não lính
js/09-ai-hero.js       não anh hùng
js/10-monsters.js      hang ổ, quái, vật phẩm, sóng thủ thành
js/11-tribe-brain.js   não bộ lạc, kinh tế, thờ cúng
js/12-loop-era.js      vòng tick, kết/mở kỷ nguyên, thần lực
js/13-render-terrain.js       camera/toạ độ, địa hình, sprite tài nguyên
js/13b-render-buildings.js    vật liệu/mái theo thời đại, con dấu kinh đô, drawBuilding/drawRuin
js/13c-render-units.js        dụng cụ dân, gear đọc được, drawUnit, thầy lang, hậu cần
js/13d-render-cavalry-siege.js ngựa/kỵ binh, kíp vận hành, máy bắn đá, nỏ thần, voi chiến, quân kỳ
js/13e-render-monsters.js     bộ đồ nghề quái dùng chung + 12 silhouette loài
js/13f-render-roads-walls.js  mặt đường, tường thành, cổng
js/13g-render-frame.js        renderWorld()/renderMinimap() — điều phối MỘT khung hình
js/14-ui-panels.js     giao diện DOM ngoài canvas
js/15-input-boot.js    chuột/phím, camera đạo diễn, vòng rAF, boot
js/16-codex.js         Thư khố — sách tra quái/quân/công trình/anh hùng
js/17-i18n-boot.js     nối dây công tắc ngôn ngữ; chạy CUỐI vì phải quét mọi bảng
```

**Script cổ điển, không phải ES module** — và đó là lựa chọn có chủ ý: `<script type="module">` bị chặn
khi mở trang bằng `file://` (module nạp theo CORS, mà origin `file:` là opaque). Đo thật bằng Chrome
headless: `classic=1 module=0`. Dùng script thường thì mọi khai báo top-level vẫn nằm chung một global
scope như hồi còn một file, nên tách được mà không cần một dòng `import`/`export` nào — đổi lại,
**thứ tự thẻ `<script>` trong `civilization.html` là bắt buộc** (`01a`..`01e-config.js` phải chạy trước
mọi file khác — `01e` ghép `CONFIG_A..CONFIG_E` thành `CONFIG` thật ở dòng cuối, và có code top-level ở
các file sau đọc `CONFIG` ngay lúc tải; `13g-render-frame.js` phải chạy sau cả 6 file `13*.js` kia vì nó
gọi mọi hàm vẽ chúng định nghĩa).

## Song ngữ Việt / English

Mặc định **tiếng Việt**. Đổi bằng hai nút ở **trang bìa** (☰ Thế cuộc / phím <kbd>M</kbd> để mở lại),
hoặc phím <kbd>L</kbd> bất cứ lúc nào — kể cả giữa ván. Lúc đang chơi **không** còn nút ngôn ngữ nào
trên khung hình: nó là thứ người xem tìm đúng một lần rồi thôi, nhưng lại chiếm chỗ suốt cả ván.
Cùng lý do đó, Thư khố cũng chỉ mở từ trang bìa hoặc phím <kbd>B</kbd>.

Khoá tra cứu **chính là câu tiếng Việt**, không phải một mã như `tribe.destroyed`. Đó là lựa chọn về
rủi ro: gõ nhầm một mã thì màn hình hiện đúng cái mã đó, im lặng, không có lỗi nào trong console —
còn lấy chính câu tiếng Việt làm khoá thì chế độ mặc định là **hàm đồng nhất**, và thiếu một mục từ
điển chỉ làm một câu rơi về tiếng Việt chứ không làm hỏng giao diện.

Ba đường dịch, cho ba loại chữ khác hẳn nhau:

| Loại | Cách làm | Vì sao |
|---|---|---|
| Nhãn trong dữ liệu (`CONFIG.BUILD.town.label`) | **vá thẳng vào dữ liệu** lúc đổi ngôn ngữ | Bị đọc ở hàng trăm nơi; bọc từng chỗ đọc là sửa hàng trăm điểm. Vá vào nguồn thì mọi chỗ đọc giữ nguyên không sửa một ký tự. |
| Câu nội suy trong mã | `T('☠ {name} DIỆT VONG', {...})` | Dịch ngay lúc gọi, nên đổi ngôn ngữ là lần vẽ kế tiếp đã đúng. |
| Chữ được **cất đi rồi mới hiện** (nhật ký, điểm nóng) | `TL(...)` gói lại, `Tv(...)` mở ra lúc vẽ | Dịch lúc ghi thì mỗi dòng đông cứng ở ngôn ngữ của thời điểm nó xảy ra, và bấm đổi ngôn ngữ để lại một cuốn nhật ký nửa Việt nửa Anh — thứ không tự sửa được, vì quá khứ thì không viết lại. |

Tham số của `T()` được phép là **hàm**: `{ build: () => CONFIG.BUILD.depot.label }`. Đó không phải
tiện nghi cú pháp mà là cách duy nhất đúng cho nhật ký — truyền chuỗi thì cái nhãn đông cứng ngay lúc
ghi và cho ra câu lai *"Hoàng Kim finished a Kho hàng"*: khung câu dịch được, cái nhãn thì không.

**Tên riêng giữ nguyên** ở cả hai ngôn ngữ — bốn bộ lạc (Xích Long, Thanh Vân, Hoàng Kim, Tử Vi) và
tên dòng dõi anh hùng. Ngoài lý do chúng là danh từ riêng, việc đó còn né một va chạm thật: `Hoàng Kim`
vừa là tên một bộ lạc vừa là tên thời đại 4.

Tìm chỗ còn thiếu: mở game, bấm sang tiếng Anh, chơi một lúc rồi gõ `I18N.report()` trong console —
nó in ra đúng những câu đã bị hỏi mà chưa có bản dịch.

## Chạy

Bấm đúp `civilization.html`. Hết.

Không nhớ tên tệp thì bấm đúp `index.html` — trang chọn trò, có đường dẫn sang cả hai
(phím <kbd>1</kbd> / <kbd>2</kbd> chọn nhanh). Ngôn ngữ chọn ở đó đi thẳng sang Chúa Tể,
vì cả hai dùng chung khoá `localStorage['civ.lang']`.

Nếu muốn phục vụ qua HTTP (không bắt buộc):

```bash
python3 .claude/serve.py 8123
```

Dùng tệp này chứ **đừng** dùng `python3 -m http.server`: bản có sẵn của Python không gửi
`Cache-Control` nào cả, chỉ gửi `Last-Modified`. Trình duyệt gặp vậy thì **tự đoán** hạn dùng
(khoảng 10% tuổi tệp), nên một tệp sửa vài ngày trước được coi là còn tươi hàng chục giờ —
và trong ngần ấy thời gian nó phục vụ bản cũ mà không hỏi máy chủ lấy một lần. Sửa mã xong
mở trang thấy y như cũ là vì thế, không phải vì mã sai. `serve.py` chỉ khác đúng một chỗ: nó
gửi `Cache-Control: no-store`.

Lưu ý: `no-store` chỉ có tác dụng với những lần tải **sau**. Nếu trình duyệt đã trót nhớ bản
cũ thì phải nạp cứng **một lần** (`Cmd+Shift+R`) để đuổi nó đi.

## Giấy phép

Chưa chọn. Repo công khai mà không kèm giấy phép nghĩa là **mặc định giữ toàn quyền** —
người khác được xem, chưa được dùng lại.
