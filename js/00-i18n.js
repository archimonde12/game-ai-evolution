// ============================================================================
// SONG NGỮ — bộ máy dịch (Phase 3.36)
// ----------------------------------------------------------------------------
// Trò chơi được viết trọn vẹn bằng tiếng Việt: 15 tệp mã nguồn, hơn 27.000 dòng,
// và tiếng Việt nằm rải khắp — nhãn trong CONFIG, câu chữ nội suy trong template
// literal, và cả một bài luật chơi dài trong civilization.html.
//
// KHOÁ TRA CỨU CHÍNH LÀ CÂU TIẾNG VIỆT, không phải một mã như `tribe.destroyed`.
// Lý do là rủi ro, không phải thẩm mỹ: đổi 1.500 chỗ sang mã tra cứu nghĩa là
// 1.500 cơ hội gõ nhầm một mã, mà gõ nhầm mã thì màn hình hiện đúng cái mã đó —
// im lặng, không có lỗi nào trong console. Lấy chính câu tiếng Việt làm khoá thì
// chế độ mặc định (vi) là HÀM ĐỒNG NHẤT: T('Tạm dừng') trả về 'Tạm dừng' kể cả
// khi từ điển trống rỗng. Nghĩa là bản tiếng Việt không thể vỡ vì việc thêm
// tiếng Anh, và thiếu một mục từ điển chỉ làm một câu rơi về tiếng Việt chứ
// không làm hỏng giao diện.
//
// HAI ĐƯỜNG DỊCH, vì có hai loại chữ khác hẳn nhau:
//
//   1. CHỮ CHẠY QUA HÀM  — câu nội suy trong mã: T('☠ {name} DIỆT VONG', {...}).
//      Dịch ngay lúc gọi, nên đổi ngôn ngữ là lần vẽ kế tiếp đã đúng. Phần lớn
//      bảng biểu được dựng lại vài lần mỗi giây nên không cần làm gì thêm.
//
//   2. NHÃN NẰM TRONG DỮ LIỆU — CONFIG.BUILD.town.label, UNIT_LABEL, AGE.NAMES…
//      Những chỗ này bị ĐỌC ở hàng trăm nơi (`CONFIG.BUILD[k].label`), nên bọc
//      từng chỗ đọc là sửa hàng trăm điểm. Thay vào đó ta VÁ THẲNG VÀO DỮ LIỆU:
//      chụp lại bản tiếng Việt một lần lúc khởi động, rồi mỗi lần đổi ngôn ngữ
//      thì ghi đè tại chỗ. Mọi chỗ đọc giữ nguyên không sửa một ký tự.
//
// TÊN RIÊNG KHÔNG DỊCH: Xích Long, Thanh Vân, Hoàng Kim, Tử Vi là tên bốn bộ lạc
// (và cũng là bốn sắc khoáng của bảng màu sơn mài — xem Phase 3.9). Chúng đứng
// ngoài từ điển, nên cơ chế vá dữ liệu tự bỏ qua: không có mục từ điển thì giữ
// nguyên. Đây cũng là lý do `tribe.name` bị đông cứng vào state lúc gieo kỷ
// nguyên mà vẫn không sao.
// ============================================================================

const I18N = {
  lang: 'vi',
  // EN[câu tiếng Việt] = câu tiếng Anh. Nạp từ js/00-lang-en.js.
  EN: {},
  // Những khoá bị hỏi mà không có trong từ điển. Chỉ dùng để soi lúc phát triển:
  // gõ `I18N.report()` trong console là ra danh sách câu còn thiếu bản tiếng Anh.
  missing: Object.create(null),
  // Ba danh sách đăng ký, điền lúc init() rồi dùng lại mỗi lần đổi ngôn ngữ.
  _fields: [],   // { obj, key, vi }  — nhãn nằm trong dữ liệu
  _nodes: [],    // { el, kind, key, vi } — chữ nằm trong DOM
  _hooks: [],    // hàm chạy lại sau mỗi lần đổi ngôn ngữ
  _ready: false
};

// Những tên trường được coi là "chữ cho người đọc". Danh sách này cố tình HẸP:
// đi rộng hơn thì cơ chế vá sẽ chạm vào những trường mang ý nghĩa mã (`type`,
// `id`, `kind`, `shape`) và một bản dịch trùng chữ sẽ lặng lẽ đổi luật chơi.
const I18N_TEXT_FIELDS = [
  'label', 'short', 'scope', 'blurb', 'name', 'desc', 'sub', 'hint', 'title', 'rank', 'verb'
];

// ----------------------------------------------------------------------------
// T(vi, params) — dịch một câu.
//
// `vi` vừa là khoá tra cứu vừa là bản dự phòng, nên hàm này không bao giờ trả về
// undefined và không bao giờ trả về một mã tra cứu trần trụi.
//
// Chỗ giữ chỗ viết bằng {ngoặc nhọn}: T('còn {n} tick', {n: 42}). Cố ý KHÔNG
// dùng cú pháp ${} của JS — nếu trùng cú pháp thì một câu quên bọc T() vẫn chạy
// đúng ở tiếng Việt và chỉ sai khi đổi sang tiếng Anh, tức là lỗi nấp kỹ nhất.
// ----------------------------------------------------------------------------
function T(vi, params) {
  let out = vi;
  if (I18N.lang !== 'vi') {
    const hit = I18N.EN[vi];
    if (hit !== undefined) out = hit;
    else I18N.missing[vi] = (I18N.missing[vi] || 0) + 1;
  }
  return fillParams(out, params);
}

// ----------------------------------------------------------------------------
// Thay chỗ giữ chỗ {tên} bằng giá trị.
//
// Một tham số được phép là HÀM, và đó không phải tiện nghi cú pháp — nó là cách
// duy nhất đúng cho chữ bị cất đi rồi mới hiện (xem TL bên dưới). Nhật ký ghi
// "{tribe} xây xong {build}" lúc tick 500; nếu `build` là một chuỗi thì nó đã
// đông cứng thành 'Kho hàng' ngay lúc ấy, và đổi ngôn ngữ về sau cho ra câu lai
// "Hoàng Kim finished a Kho hàng" — khung câu dịch được, cái nhãn thì không.
// Truyền `() => CONFIG.BUILD.depot.label` thì nhãn được đọc lại ở đúng lúc vẽ,
// tức là sau khi bộ vá dữ liệu đã đổi nó sang tiếng Anh.
//
// Cố ý KHÔNG dịch bừa mọi tham số chuỗi: tên bộ lạc 'Hoàng Kim' trùng nguyên văn
// với tên thời đại 4, nên một phép dịch tự động sẽ đổi tên một bộ lạc thành
// "Golden Age" ngay giữa dòng nhật ký. Hàm là chỗ khai báo RÕ cái nào dịch được.
// ----------------------------------------------------------------------------
function fillParams(s, params) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    let v = params[k];
    if (typeof v === 'function') v = v();
    return (v !== undefined && v !== null) ? v : m;
  });
}

// Dịch một chuỗi có thể là undefined/null mà không biến nó thành chữ "undefined".
function Topt(vi, params) { return vi ? T(vi, params) : vi; }

// ----------------------------------------------------------------------------
// Tc(key, vi, params) — dịch CÓ NGỮ CẢNH.
//
// Dùng khi cùng một câu tiếng Việt mang hai nghĩa khác nhau ở hai chỗ, nên không
// thể chung một mục từ điển. Ca đã có thật: 'Công thành' vừa là tên nhánh nghiên
// cứu (Siegecraft) vừa là nhãn điểm nóng lúc quân đang đục tường (assaulting the
// walls) — dịch chung thì bản đồ hiện chữ "Siegecraft" ở giữa một trận đánh.
//
// Cách chữa thẳng tay là sửa một trong hai câu tiếng Việt cho khác đi, nhưng thế
// là để việc thêm tiếng Anh đi sửa bản tiếng Việt — cái giá sai chỗ. Ở đây `vi`
// vẫn là nguyên văn và vẫn là thứ hiện ra ở chế độ tiếng Việt; chỉ riêng đường
// TRA CỨU là đi bằng mã.
// ----------------------------------------------------------------------------
function Tc(key, vi, params) {
  if (I18N.lang === 'vi') return params ? T(vi, params) : vi;
  const hit = I18N.EN[key];
  if (hit === undefined) { I18N.missing[key + '  (ngữ cảnh của: ' + vi + ')'] = 1; return T(vi, params); }
  return fillParams(hit, params);
}

// Số có phân cách hàng nghìn theo đúng quy ước của ngôn ngữ đang bật: 15.750 ở
// tiếng Việt, 15,750 ở tiếng Anh. Đây không phải chuyện thẩm mỹ — "15.750" đọc
// bằng mắt người nói tiếng Anh ra mười lăm phẩy bảy lăm, sai đúng một nghìn lần.
function locNum(n) {
  return Number(n).toLocaleString(I18N.lang === 'en' ? 'en-US' : 'vi-VN');
}

// ----------------------------------------------------------------------------
// TL / Tv — DỊCH HOÃN LẠI, cho chữ được CẤT ĐI rồi mới hiện ra
//
// Nhật ký biến cố giữ 14 dòng gần nhất, điểm nóng giữ nhãn cho camera Đạo diễn.
// Cả hai đều VIẾT một lúc và ĐỌC lúc khác. Nếu dịch ngay lúc viết thì mỗi dòng
// đông cứng ở ngôn ngữ của thời điểm nó xảy ra, và bấm đổi ngôn ngữ giữa ván để
// lại một cuốn nhật ký nửa Việt nửa Anh — thứ không tự sửa được, vì quá khứ thì
// không viết lại.
//
// TL() không dịch gì cả: nó gói câu gốc + tham số lại thành một mẩu dữ liệu.
// Tv() mở gói ra và dịch, ở đúng lúc vẽ. Chỗ gọi chỉ đổi T thành TL.
//
// Tv() cũng nhận thẳng một chuỗi và trả về nguyên si, nên những chỗ gọi cũ
// (logEvent với chữ dựng sẵn) vẫn chạy mà không phải sửa.
// ----------------------------------------------------------------------------
function TL(vi, params) { return { __t: vi, __p: params || null }; }
// Bản hoãn lại của Tc() — cùng lý do, cho chữ có ngữ cảnh mà cũng bị cất đi.
function TLc(key, vi, params) { return { __t: vi, __p: params || null, __k: key }; }
function Tv(v) {
  if (!v || v.__t === undefined) return v;
  return v.__k ? Tc(v.__k, v.__t, v.__p) : T(v.__t, v.__p);
}

// ----------------------------------------------------------------------------
// HAI CÁI TÊN GHÉP TỪ MẢNH — không dịch được bằng cách tra một chuỗi
//
// Cả hai đều có phần TÊN RIÊNG (không dịch) ghép với phần MÔ TẢ (phải dịch), nên
// nếu ghép sẵn rồi cất vào state thì cả cụm đông cứng ở ngôn ngữ lúc gieo. Giữ
// riêng từng mảnh rồi ghép lúc hiển thị thì đổi ngôn ngữ giữa ván vẫn đúng.
// ----------------------------------------------------------------------------

// "Thương Lang đời 3" — tên dòng dõi là danh từ riêng, "đời N" thì dịch.
function heroDisplayName(u) {
  return T('{dynasty} đời {gen}', { dynasty: u.dynasty, gen: u.heroGen });
}

// LÝ DO THẮNG của một kỷ nguyên. Cất trong eraHistory dưới dạng {kind, …} nên
// bảng Biên niên sử dựng lại câu chữ bằng ngôn ngữ ĐANG BẬT, kể cả với những kỷ
// nguyên đã khép lại từ lâu.
function reasonText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;   // dung thứ cho dữ liệu kiểu cũ
  if (r.kind === 'survive') return T('trụ được {ticks} tick qua {waves} đợt', { ticks: r.ticks, waves: r.waves });
  if (r.kind === 'wonder') return T('giữ vững KỲ QUAN');
  if (r.kind === 'unify') return T('thống nhất thiên hạ');
  return T('dẫn đầu khi hết kỷ nguyên');
}

// "K3·Xích Long (đột biến)" — `base` là nhãn kỷ nguyên + tên bộ lạc, giữ nguyên.
function lineageText(lin) {
  if (!lin) return T('khởi tổ');
  // Ván cũ (hoặc mã cũ) có thể còn cất một chuỗi trần ở đây; trả thẳng ra chứ
  // đừng ném lỗi — một cái nhãn sai ngôn ngữ vẫn hơn một bảng trống.
  if (typeof lin === 'string') return lin;
  if (lin.kind === 'founder') return T('khởi tổ');
  if (lin.kind === 'rand') return T('ngẫu nhiên');
  return T(lin.kind === 'orig' ? '{base} (nguyên bản)' : '{base} (đột biến)', { base: lin.base });
}

// ----------------------------------------------------------------------------
// ĐĂNG KÝ NHÃN NẰM TRONG DỮ LIỆU
// ----------------------------------------------------------------------------

// Đi sâu vào một cây object/array, ghi lại mọi trường chữ để vá được về sau.
// `seen` chặn vòng lặp tham chiếu — CONFIG có vài chỗ trỏ chéo nhau.
function i18nScan(root, seen) {
  seen = seen || new Set();
  if (!root || typeof root !== 'object' || seen.has(root)) return;
  seen.add(root);

  if (Array.isArray(root)) {
    for (const v of root) if (v && typeof v === 'object') i18nScan(v, seen);
    return;
  }
  for (const k of Object.keys(root)) {
    const v = root[k];
    if (typeof v === 'string') {
      // Chỉ ghi nhận trường có tên nằm trong danh sách hẹp, và chỉ khi câu đó
      // THẬT SỰ có mục tiếng Anh. Nhờ vế sau, tên riêng (Xích Long…) và mọi
      // chuỗi mã trùng tên trường tự động đứng ngoài — không cần danh sách trừ.
      if (I18N_TEXT_FIELDS.indexOf(k) >= 0 && I18N.EN[v] !== undefined) {
        I18N._fields.push({ obj: root, key: k, vi: v });
      }
    } else if (v && typeof v === 'object') {
      i18nScan(v, seen);
    }
  }
}

// Mảng chữ thuần (AGE.NAMES = ['—','Đồ Đá',…]) không có tên trường để bắt, nên
// phải khai báo tay từng cái.
function i18nScanArray(arr) {
  if (!Array.isArray(arr)) return;
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] === 'string' && I18N.EN[arr[i]] !== undefined) {
      I18N._fields.push({ obj: arr, key: i, vi: arr[i] });
    }
  }
}

// Bảng tra phẳng dạng { mã: 'nhãn' } — UNIT_LABEL và họ hàng. Khác i18nScan ở
// chỗ dịch MỌI giá trị chữ bất kể tên khoá, vì ở đây khoá là mã còn giá trị
// luôn luôn là nhãn.
function i18nScanLabelMap(map) {
  if (!map) return;
  for (const k of Object.keys(map)) {
    if (typeof map[k] === 'string' && I18N.EN[map[k]] !== undefined) {
      I18N._fields.push({ obj: map, key: k, vi: map[k] });
    }
  }
}

// ----------------------------------------------------------------------------
// ĐĂNG KÝ CHỮ NẰM TRONG DOM
//
// Không cần đặt tên khoá cho từng chỗ: chữ tiếng Việt ĐANG có trong tệp HTML
// chính là khoá. Lúc init ta chụp lại nguyên văn, nên đổi qua đổi lại giữa hai
// ngôn ngữ luôn quay về đúng bản gốc.
//
//   data-i18n            → dịch innerHTML (khoá = innerHTML lúc khởi động)
//   data-i18n="mã.riêng" → dịch innerHTML nhưng tra bằng mã (dùng cho khối dài,
//                          nơi lấy cả đoạn văn làm khoá thì quá mong manh)
//   data-i18n-text       → dịch textContent (khi bên trong không có thẻ con)
//
// Thuộc tính `title`, `placeholder`, `aria-label` được QUÉT TỰ ĐỘNG trên toàn
// trang — không phải đánh dấu tay chỗ nào. Có gần trăm cái tooltip; bắt tay
// từng cái thì chắc chắn sót, mà một tooltip sót lại là lỗi im lặng: nó chỉ
// hiện ra khi rê chuột đúng chỗ đó.
// ----------------------------------------------------------------------------
const I18N_ATTRS = ['title', 'placeholder', 'aria-label'];

function i18nScanDOM() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    I18N._nodes.push({ el, kind: 'html', key: key || el.innerHTML.trim(), vi: el.innerHTML });
  }
  for (const el of document.querySelectorAll('[data-i18n-text]')) {
    const key = el.getAttribute('data-i18n-text');
    I18N._nodes.push({ el, kind: 'text', key: key || el.textContent.trim(), vi: el.textContent });
  }
  for (const attr of I18N_ATTRS) {
    for (const el of document.querySelectorAll('[' + attr + ']')) {
      const vi = el.getAttribute(attr);
      if (vi && I18N.EN[vi] !== undefined) {
        I18N._nodes.push({ el, kind: 'attr', attr, key: vi, vi });
      }
    }
  }
}

// ----------------------------------------------------------------------------
// ĐỔI NGÔN NGỮ
// ----------------------------------------------------------------------------
function i18nApply() {
  const en = I18N.lang === 'en';

  for (const f of I18N._fields) {
    f.obj[f.key] = en ? (I18N.EN[f.vi] !== undefined ? I18N.EN[f.vi] : f.vi) : f.vi;
  }

  for (const n of I18N._nodes) {
    const val = en ? (I18N.EN[n.key] !== undefined ? I18N.EN[n.key] : n.vi) : n.vi;
    if (n.kind === 'html') n.el.innerHTML = val;
    else if (n.kind === 'text') n.el.textContent = val;
    else n.el.setAttribute(n.attr, val);
  }

  document.documentElement.setAttribute('lang', I18N.lang);
  document.documentElement.setAttribute('data-lang', I18N.lang);

  for (const h of I18N._hooks) {
    // Một hook hỏng không được phép chặn những hook còn lại: đổi ngôn ngữ mà
    // dừng giữa chừng thì màn hình còn lại một nửa tiếng Việt một nửa tiếng Anh,
    // trạng thái khó đoán hơn hẳn so với một chỗ không dịch.
    try { h(); } catch (e) { console.warn('[i18n] hook lỗi:', e); }
  }
}

function setLang(lang) {
  const next = (lang === 'en') ? 'en' : 'vi';
  if (next === I18N.lang && I18N._ready) return;
  I18N.lang = next;
  // localStorage có thể bị chặn khi mở bằng file:// (origin rỗng). Trò chơi phải
  // chạy được bằng cách bấm đúp tệp — xem js/15-input-boot.js — nên việc ghi nhớ
  // lựa chọn là phần THÊM, không được phép làm vỡ việc đổi ngôn ngữ.
  try { localStorage.setItem('civ.lang', next); } catch (e) { /* bỏ qua */ }
  if (I18N._ready) i18nApply();
}

function onLangChange(fn) { I18N._hooks.push(fn); }

// ----------------------------------------------------------------------------
// KHỞI ĐỘNG — gọi một lần từ js/17-i18n-boot.js, sau khi mọi tệp đã nạp.
// ----------------------------------------------------------------------------
function i18nInit() {
  i18nScan(CONFIG);
  i18nScanArray(CONFIG.AGE.NAMES);
  i18nScanArray(CONFIG.ITEM.LEVEL_TAG);
  if (typeof GOD_POWERS !== 'undefined') i18nScan(GOD_POWERS);
  if (typeof PRAYERS !== 'undefined') i18nScan(PRAYERS);
  // Bảng tra phẳng: khoá là mã, giá trị luôn là nhãn.
  if (typeof UNIT_LABEL !== 'undefined') i18nScanLabelMap(UNIT_LABEL);
  if (typeof GENE_LABELS !== 'undefined') i18nScanLabelMap(GENE_LABELS);
  if (typeof HERO_GENE_LABELS !== 'undefined') i18nScanLabelMap(HERO_GENE_LABELS);
  if (typeof RES_LABEL !== 'undefined') i18nScanLabelMap(RES_LABEL);
  if (typeof CODEX_TABS !== 'undefined') i18nScan(CODEX_TABS);

  i18nScanDOM();

  let saved = null;
  try { saved = localStorage.getItem('civ.lang'); } catch (e) { /* bỏ qua */ }
  I18N.lang = (saved === 'en') ? 'en' : 'vi';
  I18N._ready = true;
  i18nApply();
}

// Soi lúc phát triển: liệt kê những câu đã bị hỏi mà chưa có bản tiếng Anh.
I18N.report = function () {
  const keys = Object.keys(I18N.missing).sort();
  console.log('[i18n] thiếu ' + keys.length + ' câu:');
  for (const k of keys) console.log('  ' + JSON.stringify(k) + ',');
  return keys;
};
