# Chúa Tể — mô phỏng tiến hoá, chạy thẳng trong trình duyệt

Hai trò chơi mô phỏng viết bằng JavaScript thuần, **không build, không phụ thuộc, không cần server**.
Tải về rồi bấm đúp file `.html` là chạy.

| File | Là gì |
|---|---|
| [`civilization.html`](civilization.html) | **Chúa Tể** — trò chính. Mô phỏng văn minh kiểu AoE tự chơi lấy, người chơi là một vị thần chỉ ngồi xem và thi thoảng can thiệp. |
| [`index.html`](index.html) | Bản mô phỏng tiến hoá đầu tiên — thú ăn cỏ / thú ăn thịt, tiến hoá ở tầng **cá thể**. |

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

Kỳ quan **không mua được bằng kho**: muốn khởi công thì phải hạ được kinh đô của một bộ lạc khác trước
(*Thiên mệnh*), và cả bản đồ chỉ được có **một** Kỳ quan — kể cả đang xây dở. Nghĩa là đường thắng bằng
công trình đi *xuyên qua* chiến tranh chứ không vòng qua nó.

## Cấu trúc mã nguồn

`civilization.html` từng là **một** file 12.711 dòng. Nay đã tách:

```
civilization.html      vỏ HTML + thứ tự nạp script
css/game.css           toàn bộ giao diện
js/01-config.js        mọi con số của trò chơi (CONFIG, mẫu bộ lạc)
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
js/13-render-world.js  toàn bộ phần vẽ khung hình
js/14-ui-panels.js     giao diện DOM ngoài canvas
js/15-input-boot.js    chuột/phím, camera đạo diễn, vòng rAF, boot
js/16-codex.js         Thư khố — sách tra quái/quân/công trình/anh hùng
```

**Script cổ điển, không phải ES module** — và đó là lựa chọn có chủ ý: `<script type="module">` bị chặn
khi mở trang bằng `file://` (module nạp theo CORS, mà origin `file:` là opaque). Đo thật bằng Chrome
headless: `classic=1 module=0`. Dùng script thường thì mọi khai báo top-level vẫn nằm chung một global
scope như hồi còn một file, nên tách được mà không cần một dòng `import`/`export` nào — đổi lại,
**thứ tự thẻ `<script>` trong `civilization.html` là bắt buộc** (`01-config.js` phải chạy trước, vì có
code top-level đọc `CONFIG` ngay lúc tải).

## Chạy

Bấm đúp `civilization.html`. Hết.

Nếu muốn phục vụ qua HTTP (không bắt buộc):

```bash
python3 -m http.server 8123
```

## Giấy phép

Chưa chọn. Repo công khai mà không kèm giấy phép nghĩa là **mặc định giữ toàn quyền** —
người khác được xem, chưa được dùng lại.
