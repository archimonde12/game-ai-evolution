# Chúa Tể — ràng buộc khi sửa mã

`civilization.html` (trò chính) + `css/game.css` + `js/00..17` — 31 thẻ script, ~26.600 dòng JS.
`01-config.js` và `13-render-world.js` (file nặng nhất, ~410KB/7202 dòng) bị chia nhỏ ở Phase 3.43 —
xem `01a..01e-config.js` và `13`/`13b..13g-render-*.js` trong bảng file ở `README.md`.
`evolution.html` là bản mô phỏng cũ (trước đây tên là `index.html`), **vẫn single-file tự chứa**,
không liên quan tới `js/`. `index.html` nay là **trang chọn trò** — cũng tự chứa, và cố ý KHÔNG
`<link>` sang `css/game.css`: `body { display:flex; height:100vh; overflow:hidden }` của game sẽ
đè lên bố cục trang đó. Nó ghi `localStorage['civ.lang']`, cùng khoá `js/00-i18n.js` đọc.
Bản đồ file đầy đủ + giải thích thiết kế: `README.md`.

## Ba điều không được vi phạm (vỡ là vỡ IM LẶNG)

1. **Chỉ `<script>` CỔ ĐIỂN.** `type="module"` bị chặn khi mở bằng `file://` (module nạp theo
   CORS, origin `file:` là opaque) — đã đo: `classic=1 module=0`. Người chơi chạy game bằng cách
   bấm đúp, nên dùng module = game không mở được, và **không có lỗi nào trong console** để lần.
   Hệ quả: mọi khai báo top-level nằm chung một global scope, không `import`/`export`.

2. **Thứ tự thẻ script là BẮT BUỘC**, vì không có module thì không có dependency graph:
   `00-i18n` + 3 tệp từ điển → `01a..01e-config` → `02..12` → `13`,`13b..13g-render-*` →
   `14..15` → `16-codex` → `17-i18n-boot`.
   - `00-i18n` phải **đầu**: `T()` được gọi cả ở code top-level (cụm dựng nút quyền năng).
   - `01a..01e-config` phải trước `02+`, và **theo đúng thứ tự đó với nhau**: mỗi phần chỉ định
     nghĩa một phần của `CONFIG` (`CONFIG_A`..`CONFIG_E`); `01e` ghép cả 5 bằng `Object.assign()`
     ở dòng cuối, thành biến `CONFIG` thật — file nào đọc `CONFIG` ngay lúc tải cũng cần `01e`
     đã chạy xong trước nó.
   - `13g-render-frame.js` (chứa `renderWorld()`) phải chạy **sau** cả 6 file `13*.js` kia (nó gọi
     mọi hàm vẽ chúng định nghĩa); thứ tự NỘI BỘ giữa `13`,`13b`..`13f` với nhau không quan trọng
     (không file nào trong số đó gọi hàm của file khác ở top-level, chỉ bên trong thân hàm — xem
     lúc chạy, không phải lúc định nghĩa).
   - `16-codex` sau nhóm `13*` (mượn `withCanvas` + hàm vẽ) và sau `15` (dùng `UNIT_LABEL`, `el`).
   - `17-i18n-boot` phải **cuối**: nó quét `CONFIG`/`UNIT_LABEL`/`GOD_POWERS`/`PRAYERS` — gọi sớm
     một tệp là quét trúng một nửa bảng, và nửa còn lại vĩnh viễn không đổi ngôn ngữ.

3. **Tên 4 bộ lạc là DANH TỪ RIÊNG — không dịch, không thêm vào từ điển.**
   Xích Long · Thanh Vân · Hoàng Kim · Tử Vi. `Hoàng Kim` trùng nguyên văn tên thời đại 4, nên
   một mục từ điển cho nó sẽ đổi tên một bộ lạc thành "Golden Age" ngay giữa dòng nhật ký.
   Cùng lý do với tên dòng dõi anh hùng (Lôi Vân, Bạch Hổ…).

## Chạy & verify

- **Người chơi:** bấm đúp `civilization.html`, hoặc `Chơi Chúa Tể.webloc`. Không cần server.
- **Claude verify:** `.claude/launch.json` → Browser pane. Hai bẫy đã trả giá, đừng trả lại:
  - `rAF` **không chạy** khi pane bị ẩn → `tick` đứng yên dù `running=true`. Muốn chạy mô phỏng
    thì gọi `simulationTick()` trong vòng lặp qua `javascript_tool`.
  - Sửa `.js` mà hành vi không đổi → **cache**, không phải logic. Chẩn đoán 1 lượt:
    `renderX.toString().includes('<chuỗi vừa thêm>')`.
    **Nghi lễ "đổi cổng" đã bỏ từ Phase 3.40** — máy chủ nay là `.claude/serve.py`, gửi
    `Cache-Control: no-store`. Đo trên một cổng sạch: sửa `01a-config.js` → nạp lại thường
    (KHÔNG đổi cổng) → giá trị mới có mặt. Nguyên nhân cũ là `python3 -m http.server` gửi
    **đúng một** header về đệm là `Last-Modified`, không có `Cache-Control` — trình duyệt
    khi đó tự đoán hạn dùng (RFC 9111, thường 10% tuổi tệp), nên một tệp sửa 6 ngày trước
    được coi là còn tươi ~14 giờ và **không hỏi máy chủ lấy một lần**.
  - **`no-store` KHÔNG xoá được thứ đã nằm sẵn trong đệm.** Một origin từng nạp dưới máy
    chủ cũ vẫn trả bản cũ mãi. Đã đo tận mắt: cổng 8123 chạy `serve.py` mới, `curl` ra tệp
    đúng, mà trang vẫn nạp `01-config.js` cũ tới mức **chưa có cả nhánh `volley`**, trong
    khi `fetch()` cùng lúc lấy về đúng bản mới. Với origin bẩn thì vẫn phải nạp cứng
    (`Cmd+Shift+R`) hoặc đổi cổng — và `Cmd+Shift+R` gửi qua `computer` **không ăn** trong
    Browser pane, nên cách chắc chắn ở đây vẫn là một cổng chưa dùng bao giờ.
- **Song ngữ:** mặc định tiếng Việt, đổi bằng phím `L`. `I18N.report()` in ra mọi khoá còn thiếu
  bản dịch — dùng nó thay vì đọc mã đi tìm.

## Chuẩn của dự án

Mọi tuyên bố về hành vi phải **đo được**, không phỏng đoán. Đây không phải khẩu hiệu: 55 ghi chú
trong `~/.claude/projects/-Users-hoanluu-Projects-local-game-ai-evolution/memory/` gần như mục nào
cũng gắn một con số đo thật, và nhiều mục ghi lại đúng những lần một giả thuyết nghe hợp lý bị
chính phép đo bác bỏ. Khi sửa cân bằng game hay hiệu năng: đo trước, sửa sau, đo lại, nói ra số.
