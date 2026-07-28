// ============================================================================
// TỪ ĐIỂN TIẾNG ANH — CHỮ TRONG LÚC CHƠI
// ----------------------------------------------------------------------------
// Ba tệp từ điển chia theo NƠI CHỮ XUẤT HIỆN, không theo chủ đề:
//   00-lang-en.js        — nhãn dữ liệu + khung giao diện (chữ tĩnh trong HTML)
//   00-lang-en-legend.js — riêng bài luật chơi ở khung trái
//   00-lang-en-game.js   — tệp này: mọi câu do mã sinh ra lúc chạy
//
// Chia thế vì ba nhóm này được sửa vì ba lý do khác nhau. Đổi một nhãn nút thì
// không ai phải cuộn qua hai vạn ký tự văn xuôi, và ngược lại.
//
// CÁCH TÌM VIỆC CÒN THIẾU: mở game, bấm sang tiếng Anh, chơi một lúc rồi gõ
// `I18N.report()` trong console — nó in ra đúng những câu đã bị hỏi mà chưa có
// mặt ở đây. Đó là cách danh sách này được dựng, chứ không phải đọc tay qua mã.
// ============================================================================

Object.assign(I18N.EN, {

  // ==========================================================================
  // NHẬT KÝ BIẾN CỐ + ĐIỂM NÓNG TRÊN BẢN ĐỒ
  // ==========================================================================
  'Kỷ nguyên {n} — bốn bộ lạc lập quốc': 'Era {n} — four tribes found their nations',
  '⚔ CHINH PHẠT — bốn bộ lạc tranh thiên hạ.': '⚔ CONQUEST — four tribes contend for the world.',
  '🛡 THỦ THÀNH — bốn bộ lạc ngừng đánh nhau, sóng quái bắt đầu tràn tới.':
    '🛡 SIEGE DEFENCE — the four tribes stop fighting; the monster waves begin.',
  '{tribe} xây xong {build}': '{tribe} finished a {build}',
  '{tribe} tiến lên thời đại {age}': '{tribe} advances to the {age}',
  '{tribe} lên {age}': '{tribe} reaches the {age}',
  '{tribe} dời đô về {x},{y}': '{tribe} moves its capital to {x},{y}',
  '{tribe} dựng lại nhà chính ở vùng đất mới': '{tribe} rebuilds a town centre on new ground',
  '{tribe} gắng gượng gây dựng lại từ đầu': '{tribe} struggles to rebuild from nothing',
  '{tribe} lui binh, tạm ngừng chinh phạt': '{tribe} pulls back and suspends its campaign',
  '{tribe} lâm vào NẠN ĐÓI': '{tribe} falls into FAMINE',
  '{tribe} bị phá Kỳ quan khi còn dang dở': '{tribe} lost its Wonder while still unfinished',
  '{tribe} cầu mãi không thấu — lời khẩn cầu tắt lịm': '{tribe} prayed unheard — the plea fades away',
  '{tribe} được ban phước': '{tribe} receives a blessing',
  '{tribe} dựng trại tiếp tế': '{tribe} pitches a supply camp',
  '{tribe} lập đô trên đất chiếm': '{tribe} founds a capital on conquered ground',
  '{tribe} mất kinh đô': '{tribe} has lost its capital',
  '{tribe} sắp diệt vong': '{tribe} is about to be wiped out',
  '☠ {tribe} DIỆT VONG': '☠ {tribe} IS WIPED OUT',
  '⏳ {tribe} MẤT KINH ĐÔ — {n} tick để dựng lại, hoặc diệt vong':
    '⏳ {tribe} HAS LOST ITS CAPITAL — {n} ticks to rebuild, or be wiped out',
  '⏳ {tribe} còn {n} tick để có lại kinh đô': '⏳ {tribe} has {n} ticks left to regain a capital',
  '🏯 {tribe} dựng xong kinh đô mới — thoát diệt vong':
    '🏯 {tribe} finished a new capital — saved from extinction',
  '🏯 {tribe} LẬP ĐÔ trên nền kinh đô cũ của {victim}':
    '🏯 {tribe} FOUNDS A CAPITAL on the ruins of {victim}’s',
  '🏯 {tribe} khởi công tháp canh tầng {lv}': '🏯 {tribe} begins watchtower storey {lv}',
  '🏯 {tribe} hoàn thành tháp canh tầng {lv}': '🏯 {tribe} completes watchtower storey {lv}',
  'Tháp canh tầng {lv}': 'Watchtower storey {lv}',
  '🏯 {tribe} bỏ dở tầng tháp — tháp cũ trở lại canh gác':
    '🏯 {tribe} abandons the extra storey — the old tower returns to watch',
  '🚧 {tribe} dỡ móng {build} bỏ hoang — hoàn lại vật liệu':
    '🚧 {tribe} clears the abandoned {build} foundation — materials refunded',
  '🏛 {tribe} khởi công KỲ QUAN': '🏛 {tribe} breaks ground on a WONDER',
  '🏛 {tribe} KHÁNH THÀNH KỲ QUAN! Giữ được {hold} tick nữa là thống nhất thiên hạ.':
    '🏛 {tribe} CONSECRATES ITS WONDER! Hold it {hold} more ticks to unify the world.',
  '🏛 KỲ QUAN của {tribe} ĐỔ NÁT — đồng hồ dừng lại.': '🏛 {tribe}’s WONDER IS IN RUINS — the clock stops.',
  'Kỳ quan của {tribe}': '{tribe}’s Wonder',
  '🛡 {tribe} triệu hồi toàn quân về giữ công trường Kỳ quan':
    '🛡 {tribe} recalls its whole army to guard the Wonder site',
  '🛡 {tribe} triệu hồi toàn quân về giữ Kỳ quan': '🛡 {tribe} recalls its whole army to guard the Wonder',
  '⚔ {tribe} kéo quân san phẳng công trường Kỳ quan của {victim}':
    '⚔ {tribe} marches to raze {victim}’s Wonder site',
  '⚔ {tribe} dốc toàn lực chặn Kỳ quan của {victim}':
    '⚔ {tribe} throws everything at stopping {victim}’s Wonder',
  '⚔ {tribe} tuyên chiến với {victim}': '⚔ {tribe} declares war on {victim}',
  '⚔ {tribe} chiêu mộ anh hùng {hero}': '⚔ {tribe} recruits the hero {hero}',
  'Anh hùng {hero} xuất thế': 'The hero {hero} arrives',
  '🕯 Anh hùng {hero} của {tribe} qua đời vì tuổi già': '🕯 {tribe}’s hero {hero} dies of old age',
  '💀 Anh hùng {hero} của {tribe} tử trận': '💀 {tribe}’s hero {hero} falls in battle',
  '{hero} ngã xuống': '{hero} has fallen',
  '🎁 {hero} thừa kế {n} món gia bảo của {tribe}': '🎁 {hero} inherits {n} heirlooms of {tribe}',
  '🎁 {kept} món của {hero} vào kho gia bảo {tribe} — người kế nhiệm nhận trọn bộ':
    '🎁 {kept} of {hero}’s items enter {tribe}’s heirloom vault — the successor gets the lot',
  '⚱ {hero} tử trận: {lost} món thất lạc tại chỗ, {kept} món về kho gia bảo':
    '⚱ {hero} fell in battle: {lost} items scattered on the spot, {kept} returned to the vault',
  '👑 {tribe} nhận THIÊN MỆNH — đã đủ chiến công để khởi công Kỳ quan':
    '👑 {tribe} receives the MANDATE — enough conquests to break ground on a Wonder',
  '🔥 {tribe} san phẳng KINH ĐÔ của {victim}!': '🔥 {tribe} RAZES {victim}’s CAPITAL!',
  '🔥 Quái vật san phẳng KINH ĐÔ của {victim}!': '🔥 Monsters raze {victim}’s CAPITAL!',
  '⛩ {tribe} PHÁ CỔNG THÀNH của {victim}!': '⛩ {tribe} BREAKS DOWN {victim}’s GATE!',
  '⛩ Quái vật PHÁ CỔNG THÀNH của {victim}!': '⛩ Monsters BREAK DOWN {victim}’s GATE!',
  '🧱 {tribe} chọc thủng tường thành {victim}!': '🧱 {tribe} breaches {victim}’s walls!',
  '🧱 Quái vật chọc thủng tường thành {victim}!': '🧱 Monsters breach {victim}’s walls!',
  'Cổng thành {tribe} vỡ': '{tribe}’s gate is breached',
  'Tường thành {tribe} vỡ': '{tribe}’s wall is breached',
  '{icon} {tribe} bắt đầu nghiên cứu {line} cấp {lv}': '{icon} {tribe} begins researching {line} level {lv}',
  '{icon} {tribe} hoàn thành {line} cấp {lv}': '{icon} {tribe} completes {line} level {lv}',
  '✖ {tribe} mất {line} cấp {lv} — {build} bị phá': '✖ {tribe} loses {line} level {lv} — its {build} was destroyed',
  '{icon} {tribe} khẩn cầu: {prayer} — {why}': '{icon} {tribe} prays: {prayer} — {why}',
  '{who} — {tribe} nhận {prayer} (x{mult})': '{who} — {tribe} receives {prayer} (×{mult})',
  '✨ Chúa Tể đoái thương kẻ thành tâm nhất': '✨ The Overlord favours the most devout',
  '🙏 Chúa Tể đáp lời': '🙏 The Overlord answers',
  'Chúa Tể đổi tiêu chí chọn lọc anh hùng: {mode}': 'The Overlord changes the hero selection criterion: {mode}',
  'vì bộ lạc': 'for the tribe',
  'cá nhân': 'individual',
  '★ Kỷ nguyên {era} kết thúc — {tribe} {reason}': '★ Era {era} ends — {tribe} {reason}',
  '★ Kỷ nguyên {era} kết thúc — cả bốn bộ lạc bị quét sạch ở tick {tick} (đợt {wave}). Trụ lâu nhất: {tribe}, {ticks} tick.':
    '★ Era {era} ends — all four tribes wiped out at tick {tick} (wave {wave}). Longest held: {tribe}, {ticks} ticks.',
  '🏅 Anh hùng lừng danh nhất: {hero} ({tribe}) — {kills} mạng, {razed} công trình, sống {life} tick':
    '🏅 Most renowned hero: {hero} ({tribe}) — {kills} kills, {razed} buildings, lived {life} ticks',

  // --- Lý do thắng + dòng dõi ---
  'trụ được {ticks} tick qua {waves} đợt': 'held {ticks} ticks through {waves} waves',
  'giữ vững KỲ QUAN': 'held the WONDER',
  'thống nhất thiên hạ': 'unified the world',
  'dẫn đầu khi hết kỷ nguyên': 'led when the era ran out',
  'khởi tổ': 'founder',
  'ngẫu nhiên': 'random',
  '{base} (nguyên bản)': '{base} (original)',
  '{base} (đột biến)': '{base} (mutated)',
  'dòng dõi': 'lineage',
  '{dynasty} đời {gen}': '{dynasty} gen. {gen}',
  'kẻ bại trận': 'the defeated',

  // --- Quái vật & hang ổ ---
  'Hang ổ lên {tier}': 'Lair grows into a {tier}',
  '👹 Một hang ổ đã hoá thành TỔ QUỶ — Chúa Hang thức giấc!':
    '👹 A lair has become a DEMON NEST — the Lair Lord awakens!',
  '🕳 Một hang ổ đã lớn thành {tier}': '🕳 A lair has grown into a {tier}',
  '🌤 Một hang ổ đã suy yếu, tụt về {tier}': '🌤 A lair has weakened, falling back to a {tier}',
  '🩸 {n} quái vật rời hang đi cướp {tribe}!': '🩸 {n} monsters leave the lair to raid {tribe}!',
  'Quái rời hang đi cướp': 'Monsters leave to raid',
  '⚔️ CHÚA HANG đã bị hạ gục!': '⚔️ The LAIR LORD has been slain!',
  'Chúa Hang gục ngã': 'The Lair Lord falls',
  'Hang ổ bị phá': 'Lair destroyed',
  '🏆 {tribe} phá huỷ một {tier} quái vật': '🏆 {tribe} destroys a monster {tier}',
  '🏆 Một {tier} quái vật bị phá huỷ': '🏆 A monster {tier} is destroyed',
  '⚗ {hero} hợp nhất hai {from} thành {to}': '⚗ {hero} fuses two {from} into a {to}',
  '{icon} {hero} nhặt được {item}': '{icon} {hero} picks up a {item}',
  '🌊 ĐỢT {wave} — {n} quái vật tràn vào {tribe} từ {dirs} hướng!':
    '🌊 WAVE {wave} — {n} monsters pour into {tribe} from {dirs} directions!',
  '🌊 ĐỢT {wave} — {n} quái vật tràn tới!': '🌊 WAVE {wave} — {n} monsters pour in!',
  'Đợt {wave} đổ bộ': 'Wave {wave} lands',
  'Kinh đô cố thủ': 'Capital holds out',
  'Tháp canh khai hoả': 'Watchtower opens fire',
  'Đánh hang ổ': 'Assaulting a lair',
  'hotspot.assaultWall': 'Assaulting the walls',
  'Vây thành {build}': 'Besieging a {build}',
  'Giao tranh': 'Fighting',
  'Kinh đô {tribe}': '{tribe} capital',

  // --- Thiên Ma ---
  'Đã có một Thiên Ma trên bản đồ rồi.': 'There is already a Heavenly Demon on the map.',
  '🐉 Thiên Ma đổi hướng — nó nhắm vào {tribe}': '🐉 The Heavenly Demon changes course — it targets {tribe}',
  'THIÊN MA {rank} giáng thế': 'The HEAVENLY DEMON descends — {rank}',
  'THIÊN MA gục ngã': 'The HEAVENLY DEMON falls',
  '🐉 THIÊN MA gục ngã — không bộ lạc nào nhận được kho báu.':
    '🐉 The HEAVENLY DEMON falls — no tribe claims the hoard.',
  '🐉 THIÊN MA — {rank}, {hp} máu — giáng thế giữa bản đồ, nó đi về phía {tribe}!':
    '🐉 HEAVENLY DEMON — {rank}, {hp} health — descends at the map’s centre, and it marches on {tribe}!',
  '🐉 THIÊN MA — {rank}, {hp} máu — giáng thế giữa bản đồ!':
    '🐉 HEAVENLY DEMON — {rank}, {hp} health — descends at the map’s centre!',
  '🐉 {tribe} HẠ ĐƯỢC THIÊN MA {rank} — {food} lương · {wood} gỗ · {stone} đá · {gold} vàng về tay họ!':
    '🐉 {tribe} SLAYS THE HEAVENLY DEMON {rank} — {food} food · {wood} wood · {stone} stone · {gold} gold to their name!',
  '{icon} Chiến lợi phẩm mở ra một bí thuật — {tribe} nhận ngay {line} cấp {lv}':
    '{icon} The spoils unlock a secret art — {tribe} immediately gains {line} level {lv}',

  // ==========================================================================
  // QUYỀN NĂNG CHÚA TỂ
  // ==========================================================================
  'đức tin': 'faith',
  'Đã thi triển. Chọn quyền năng khác nếu muốn.': 'Cast. Pick another power if you like.',
  'Đã huỷ quyền năng đang chọn.': 'Power deselected.',
  'Không có bộ lạc nào ở chỗ đó — click vào 1 quân hoặc 1 toà nhà.':
    'No tribe there — click a unit or a building.',
  'Chọn một quân/công trình trên bản đồ trước rồi bấm F để bám theo.':
    'Select a unit or building on the map first, then press F to follow it.',
  'Chế độ bám: hãy click một quân hoặc công trình để camera đi theo.':
    'Follow mode: click a unit or building for the camera to track.',
  'Chúa Tể tự động: sẽ tự đáp lời kẻ thành tâm nhất, và can thiệp khi Đức Tin vượt ngưỡng.':
    'Overlord on automatic: it will answer the most devout and intervene once Faith passes the threshold.',
  'Đã tắt tự động — Đức Tin chỉ tiêu khi bạn bấm.':
    'Automatic off — Faith is only spent when you click.',
  'Click 1 điểm: gây {unit} sát thương lên mọi quân và {build} lên nhà cửa trong bán kính {r} ô (không phân biệt phe). MẠNH DẦN THEO THỜI GIAN — hiện ×{pow}, đỉnh ×{peak} ở tick {peakTick}.':
    'Click a point: {unit} damage to every unit and {build} to buildings within {r} cells (friend and foe alike). GROWS WITH TIME — currently ×{pow}, peaking at ×{peak} on tick {peakTick}.',
  'Sét của Chúa Tể': 'The Overlord’s bolt',
  '⚡ Chúa Tể giáng sét (×{pow})': '⚡ The Overlord calls down lightning (×{pow})',
  'Click 1 điểm: mọi bụi quả và ô ruộng CÒN SỐNG trong bán kính {r} ô đầy lại tức thì. Ô đã bị hái CẠN thì đã biến mất khỏi bản đồ — mưa không gọi lại được, nên đây là quyền năng phải bấm TRƯỚC khi ruộng quả tàn. Bán kính mạnh dần theo thời gian (hiện ×{pow}).':
    'Click a point: every berry bush and farm cell STILL ALIVE within {r} cells refills instantly. A cell harvested DRY has already vanished from the map — rain cannot call it back, so this is a power you press BEFORE the fields run out. The radius grows with time (currently ×{pow}).',
  '🌧 Mưa lành hồi sinh {n} ô lương thực (+{gain} lương)':
    '🌧 Blessed rain revives {n} food cells (+{gain} food)',
  'Click 1 điểm: mọc thêm 1 khu rừng (gỗ mới, đồng thời chặn đường + chặn tầm nhìn) bán kính {r} ô. Mạnh dần theo thời gian (hiện ×{pow}) — về cuối kỷ nguyên đủ rộng để bịt một hướng tiến quân.':
    'Click a point: grow a new forest (fresh wood, and it blocks both movement and sight) with a radius of {r} cells. Grows with time (currently ×{pow}) — by late era it is wide enough to seal off an approach.',
  '🌲 Chúa Tể gieo {n} gốc cây': '🌲 The Overlord sows {n} trees',
  'Click 1 quân/nhà: bộ lạc đó nhận +{food} lương, +{wood} gỗ, +{stone} đá, +{gold} vàng. Mạnh dần theo thời gian (hiện ×{pow}) — một cái kho cuối kỷ nguyên lớn gấp hàng chục lần cái kho đầu kỷ nguyên, nên một món quà đứng yên là một món quà tan biến.':
    'Click a unit or building: that tribe receives +{food} food, +{wood} wood, +{stone} stone, +{gold} gold. Grows with time (currently ×{pow}) — a late-era treasury is dozens of times the size of an early one, so a gift that stands still is a gift that evaporates.',
  '✨ {tribe} nhận thiên ân (×{pow})': '✨ {tribe} receives divine favour (×{pow})',
  'Click 1 quân/nhà: mọi quân của bộ lạc đó mất {now}% máu tối đa. Nặng dần theo thời gian ({lo}% đầu kỷ nguyên → {hi}% ở tick {peakTick}).':
    'Click a unit or building: every unit of that tribe loses {now}% of its maximum health. Grows harsher with time ({lo}% early era → {hi}% by tick {peakTick}).',
  '☠ Dịch bệnh càn quét {tribe} ({n} người, −{pct}% máu)':
    '☠ Plague sweeps {tribe} ({n} people, −{pct}% health)',
  'Dịch bệnh giáng xuống {tribe}': 'Plague strikes {tribe}',
  'Mưa lành cho {tribe}': 'Blessed rain for {tribe}',
  'Thả một con THIÊN MA ở chính giữa bản đồ (click đâu cũng vậy). NÓ MẠNH DẦN THEO THỜI GIAN — thả lúc này: bậc {rank}, {hp} máu · đòn {atk} (đỉnh ở tick {peakTick}). Đập tường thành như một cỗ máy bắn đá, hành quân tới bộ lạc ĐANG DẪN ĐẦU. Bộ lạc nào ra đòn cuối nhận {food} lương · {wood} gỗ · {stone} đá · {gold} vàng, một THÁNH VẬT cấp {tier} và MỘT CẤP NGHIÊN CỨU miễn phí; Chúa Tể được hoàn {refund} Đức Tin. Chỉ một con trên bản đồ cùng lúc.':
    'Drop a HEAVENLY DEMON at the centre of the map (clicking anywhere does the same). IT GROWS STRONGER WITH TIME — dropped now: rank {rank}, {hp} health · {atk} attack (peaking at tick {peakTick}). It smashes walls like a catapult and marches on the LEADING tribe. Whoever lands the killing blow receives {food} food · {wood} wood · {stone} stone · {gold} gold, a tier-{tier} RELIC and ONE FREE RESEARCH LEVEL; the Overlord is refunded {refund} Faith. Only one may exist on the map at a time.',
  '🔒 CHƯA MỞ — Thiên Ma chỉ giáng thế khi thế giới đã đủ lớn để chịu nó: cần ít nhất MỘT bộ lạc tới {need}. Cao nhất hiện giờ là {best}.':
    '🔒 LOCKED — the Heavenly Demon descends only once the world is large enough to bear it: at least ONE tribe must reach the {need}. The highest right now is the {best}.',

  // ==========================================================================
  // BẢNG BIỂU — nhãn, cột, tooltip
  // ==========================================================================
  'chưa đủ dữ liệu để vẽ': 'not enough data to plot',
  '{n}  (🩸{raid} đi cướp)': '{n}  (🩸{raid} raiding)',
  '  · cấp cao nhất {tier}': '  · highest tier {tier}',
  ' ({n} Tổ Quỷ)': ' ({n} Demon Nests)',
  'Đáp lời': 'Answer',
  'đã dâng tế <b style="color:var(--gold)">{n}</b> lần · thành tâm {piety} · ban phước sẽ mạnh <b style="color:var(--gold)">×{mult}</b> · tắt sau {left} tick':
    'has made <b style="color:var(--gold)">{n}</b> offerings · devotion {piety} · a blessing would be <b style="color:var(--gold)">×{mult}</b> as strong · expires in {left} ticks',
  'đang mang {what}': 'carrying {what}',
  '— còn {n} tick': '— {n} ticks left',
  '{line} — {scope}. Mở ở {age}, nghiên cứu tại {build}.':
    '{line} — {scope}. Unlocked in the {age}, researched at the {build}.',
  'đang nghiên cứu {line} cấp {lv} — {pct}%': 'researching {line} level {lv} — {pct}%',
  'Chưa bộ lạc nào đủ dư dả để nghiên cứu. Nhánh đầu tiên ({icon} {line}) mở ngay từ {age}, nhưng cần {build} và kho lương trên mức dự trữ.':
    'No tribe can yet afford research. The first branch ({icon} {line}) unlocks in the {age}, but it needs a {build} and a granary above the reserve.',
  'thời đại 1-5': 'age 1-5',
  'Đại': 'Age',
  'Điểm': 'Score',
  'điểm bộ lạc': 'tribe score',
  '{n} điểm': '{n} points',
  'lương thực': 'food',
  'dân thường / quân đội / trần dân số — cùng MỘT cái trần, vì mỗi người lính được đổi ra từ một dân thường':
    'civilians / army / population cap — ONE shared cap, because every soldier is converted from a civilian',
  'dân thường / quân đội / trần dân số': 'civilians / army / population cap',
  'cơ cấu quân: bộ binh / cung thủ / kỵ binh + voi / máy bắn đá + nỏ thần':
    'army composition: infantry / archers / cavalry + elephants / catapults + ballistae',
  'cận/xa/ngựa/máy': 'melee/ranged/horse/machine',
  'đang chinh phạt': 'on campaign',
  'đang chinh phạt {victim}': 'campaigning against {victim}',
  'nạn đói': 'famine',
  'đang có Kỳ quan': 'holds a Wonder',
  'đã hạ {n} kinh đô địch — đủ Thiên mệnh để khởi công Kỳ quan':
    'has razed {n} enemy capitals — Mandate enough to break ground on a Wonder',
  'đủ Thiên mệnh — được khởi công Kỳ quan': 'has the Mandate — may break ground on a Wonder',
  'MẤT KINH ĐÔ — còn {n} tick để dựng lại nhà chính, hết giờ là diệt vong. Đồng hồ dừng lại trong lúc có thợ đang dựng.':
    'CAPITAL LOST — {n} ticks to rebuild a town centre; run out and the tribe is wiped out. The clock stops while builders are on site.',
  'đang khẩn cầu': 'praying',
  'đang khẩn cầu: {prayer}': 'praying: {prayer}',
  'đang mang phước lành': 'under a blessing',
  '{n} thầy lang đang theo quân': '{n} medics with the army',
  '{n} quân kỳ đang cổ vũ toàn quân': '{n} standard bearers rallying the army',
  '{n} đội hậu cần': '{n} quartermasters',
  ' · {n} trại tiếp tế đang đứng': ' · {n} supply camps standing',
  ' · chưa dựng trại nào': ' · no camp pitched yet',
  'chưa lên {age} được: {why}': 'cannot reach the {age}: {why}',
  'kỵ binh {a} · voi chiến {b}': 'knights {a} · war elephants {b}',
  'máy bắn đá {a} · nỏ thần {b}': 'catapults {a} · ballistae {b}',
  'Click để camera nhảy tới kinh đô': 'Click to jump the camera to the capital',
  '{age} — mái {mat}': '{age} — {mat} roofs',
  '{v} dân thường · {s} quân · trần {cap}': '{v} civilians · {s} army · cap {cap}',
  '{v} dân · {s} quân · trần {cap}': '{v} civ · {s} army · cap {cap}',
  'Chưa có biến cố nào.': 'Nothing has happened yet.',
  'roof.mat.1': 'thatch',
  'roof.mat.2': 'copper',
  'roof.mat.3': 'slate',
  'roof.mat.4': 'gilt',
  'roof.mat.5': 'celadon',

  // --- Lý do chặn cửa ---
  'không có ở chế độ Thủ Thành': 'not available in Siege Defence',
  'chưa tới {age}': 'not yet in the {age}',
  'chưa hạ đủ kinh đô địch ({have}/{need})': 'not enough enemy capitals razed ({have}/{need})',
  '{tribe} đang giữ Kỳ quan — phải phá đã': '{tribe} holds a Wonder — it must be destroyed first',
  'chưa đủ tháp canh ({have}/{need})': 'not enough watchtowers ({have}/{need})',

  // --- Bảng bộ gen ---
  ' · nhà vô địch kỳ trước: {v}': ' · last era’s champion: {v}',
  ' · khoảng cho phép {lo}–{hi}">': ' · allowed range {lo}–{hi}">',
  'GEN CHIẾN LƯỢC của {tribe}': 'STRATEGY GENES of {tribe}',
  'hiếu chiang': 'aggression',
  'hiếu chiến {agg} · lính {mil}% · lương {food} · gỗ {wood}':
    'aggression {agg} · army {mil}% · food {food} · wood {wood}',

  // --- Thẻ tổng kết kỷ nguyên ---
  'KỶ': 'ERA',
  'Kỷ nguyên {n}': 'Era {n}',
  'Kỷ nguyên {n} khép lại': 'Era {n} draws to a close',
  'dân số': 'population',
  'chiến công': 'conquests',
  'công trình': 'buildings',
  'điểm': 'score',
  'Gen chiến lược thắng cuộc': 'Winning strategy genes',
  ' — so với nhà vô địch kỳ trước': ' — against last era’s champion',
  'Bộ gen này sẽ được nhân bản + đột biến thành 3 bộ lạc của kỷ nguyên {n}…':
    'This genome will be cloned and mutated into 3 tribes of era {n}…',

  // --- Thanh trạng thái trên khung hình ---
  '🏆 KỶ NGUYÊN KẾT THÚC': '🏆 ERA ENDED',
  '⏸ TẠM DỪNG': '⏸ PAUSED',
  '⏳ quay chậm': '⏳ slow-mo',
  '⏭ tua': '⏭ fast',
  '{n} quân · {fps} fps': '{n} units · {fps} fps',
  '🏗 {tribe} ĐANG DỰNG KỲ QUAN — {pct}% · cả thiên hạ kéo tới chặn':
    '🏗 {tribe} IS BUILDING A WONDER — {pct}% · the whole world converges to stop it',
  '🏛 KỲ QUAN của {tribe} — còn {left} tick là thống nhất thiên hạ':
    '🏛 {tribe}’s WONDER — {left} ticks from unifying the world',

  // ==========================================================================
  // THẺ THÔNG TIN — nhãn hàng
  // ==========================================================================
  'Máu': 'Health', 'Máu ô này': 'Health of this cell', 'Công': 'Atk', 'Thủ': 'Def',
  'Công / Thủ': 'Atk / Def', 'Đập tường': 'Wall dmg', 'Thể lực': 'Stamina',
  'Trạng thái': 'Status', 'Vị trí': 'Position', 'Tuổi (tick)': 'Age (ticks)',
  'Mục tiêu': 'Target', 'Tầm bắn': 'Range', 'Nhịp đánh': 'Attack rate', 'Tốc độ': 'Speed',
  'Nghề': 'Trade', 'Đang làm': 'Doing', 'Đang gánh': 'Carrying', 'Chiến công': 'Conquests',
  'Hào quang': 'Aura', 'Ra lò': 'Trains', 'Đang nấu': 'In training', 'Tầng': 'Storey',
  'Sức đánh': 'Attack', 'Giá dựng lúc này': 'Current build cost', 'Chồng tầng {lv}': 'Stack storey {lv}',
  'Hạn ngạch lên đời': 'Age quota', 'Thợ tại công trường': 'Builders on site', 'Còn lại': 'Remaining',
  'Còn phải giữ': 'Must hold', 'Còn giữ': 'Hold left', 'Chữa tại chỗ': 'Heals on site',
  'Chỉ khi': 'Only when', 'Đang chữa': 'Treating', 'Đã chữa cả đời': 'Healed in total',
  'Tầm chữa': 'Heal reach', 'Đi tìm trong': 'Searches within', 'Tự băng bó': 'Self-dressing',
  'Trại đang dựng': 'Camp pitched', 'Sức trại': 'Camp strength', 'Tuổi thọ trại': 'Camp lifespan',
  'Giá một trại': 'Cost per camp', 'Quân lương': 'Supply', 'Đói': 'Starving',
  'Còn đứng': 'Time standing', 'Đang tiếp tế': 'Supplying', 'Nhịp': 'Rate',
  'Bậc': 'Tier', 'Bậc thành': 'Wall tier', 'Vành thành': 'Wall ring', 'Tự sửa': 'Self-repair',
  'Quái sống': 'Monsters alive', 'Quái đang sống': 'Monsters alive', 'Đã ăn': 'Devoured',
  'Đã ăn được': 'Devoured', 'Điểm nuôi': 'Feed points', 'Chuyến cướp sau': 'Next raid',
  'Bán kính lảng vảng': 'Roam radius', 'Đã nhả ra': 'Spawned', 'Nguy hiểm': 'Threat',
  'Mức nguy hiểm': 'Threat level', 'Hòm đồ': 'Chest', 'Gia bảo': 'Heirlooms',
  'người kế nhiệm thừa hưởng': 'the successor inherits',

  // --- Giá trị trạng thái ---
  'hoàn thành': 'complete', 'đang xây ': 'building ', 'đang lên tầng ': 'raising storey ',
  'đứng im — chưa ai tới': 'idle — nobody has come', 'lò rảnh': 'idle',
  'còn đứng': 'standing', 'rảnh': 'idle', 'đi tới mỏ': 'heading to a node', 'tới mỏ': 'to node',
  'thu hoạch': 'gathering', 'gánh về': 'hauling back', 'xây dựng': 'building', 'xây': 'building',
  ' (bỏ chạy!)': ' (fleeing!)', 'chờ lệnh': 'awaiting orders', 'giữ hàng': 'holding the line',
  'công thành': 'assaulting a building', 'giao chiến': 'engaging', 'phá tường': 'breaching the wall',
  'đợi máy bắn đá': 'waiting for the catapult', '· tường còn {n}%': '· wall at {n}%',
  'về trạm xá': 'to the infirmary', 'đang chiến': 'fighting', 'rút lui': 'withdrawing',
  'đang rút lui': 'withdrawing', ' (sóng)': ' (wave)',
  '↩ đang rút lui': '↩ withdrawing', '⚔ đang chiến': '⚔ fighting',
  'đang săn': 'hunting', 'giữ hang': 'guarding the lair', 'quanh quẩn giữ hang': 'loitering near the lair',
  'đi cướp': 'raiding', 'tràn sóng': 'in the wave', 'tràn theo sóng': 'riding the wave',
  'NẰM VÙI CHỜ MỒI': 'BURIED, WAITING', 'ĐI CƯỚP {tribe}': 'RAIDING {tribe}',
  'đang trên đất nhà — hồi lại': 'on home soil — recovering',
  'đang trong trại tiếp tế': 'inside a supply camp',
  'ngoài lãnh thổ — đang hao': 'outside territory — draining',
  'chưa có thương binh trong tầm': 'no wounded in reach',
  'chưa có — đang tìm chỗ': 'none — looking for a spot',
  'chờ {n} tick nữa mới dựng được': 'must wait {n} more ticks to pitch',
  'chưa dựng xong Tướng phủ': 'no Hero Hall finished yet',
  'không nuôi tướng (đầu tư anh hùng {v})': 'keeps no hero (hero investment {v})',
  'chưa đủ lương/vàng để chiêu mộ': 'not enough food/gold to recruit',
  'đang tìm người kế nhiệm — còn {n} tick': 'seeking a successor — {n} ticks left',
  'Chưa bộ lạc nào còn sống.': 'No tribe is still alive.',
  'chưa đủ cấp để đi cướp': 'not high enough tier to raid',
  'ĐÃ VỠ — lành lại sau {n} tick': 'BREACHED — heals in {n} ticks',
  '(cánh cổng {pct}%)': '(gate door {pct}%)',
  '(lầu cổng — dày như tường thường)': '(gatehouse — as thick as ordinary wall)',
  'Tháp góc': 'Corner tower', 'Cánh cổng': 'Gate door', 'Lầu cổng': 'Gatehouse',
  'Tường thành': 'City wall', 'Thân tường': 'Wall curtain', 'Cổng thành': 'Gate',
  'Tường thành {tribe} — {kind}': '{tribe}’s wall — {kind}',
  'Hang ổ cấp {n}': 'Lair, tier {n}',
  '{tier} — cấp {n}/3': '{tier} — tier {n}/3',
  '{name} (quái vật hoang dã)': '{name} (wild monster)',
  'Anh hùng (tối đa 1 người còn sống)': 'Heroes (max 1 alive)',
  'GEN RIÊNG của cá thể này — đời {gen} dòng {dynasty}':
    'THIS INDIVIDUAL’S OWN GENES — generation {gen} of the {dynasty} line',
  'tổ tiên tốt nhất: đời {gen}, điểm {score} — đời sau đột biến từ người này':
    'best ancestor: generation {gen}, score {score} — the next generation mutates from them',
  '· đã qua {n} đời': '· {n} generations so far',
  '· {hp}/{max} máu · công {atk} / thủ {def} · sống {life} tick · {kills} mạng, {razed} nhà':
    '· {hp}/{max} health · atk {atk} / def {def} · lived {life} ticks · {kills} kills, {razed} buildings',
  '{kills} mạng · {razed} công trình': '{kills} kills · {razed} buildings',
  '{kills} mạng · {razed} nhà': '{kills} kills · {razed} buildings',
  'bán kính {r} ô · x{mult}': 'radius {r} cells · ×{mult}',
  'NÂNG CẤP ĐANG HƯỞNG': 'UPGRADES IN EFFECT',
  'NGHIÊN CỨU TẠI ĐÂY': 'RESEARCHED HERE',
  'Chưa có nâng cấp nào áp dụng cho loại quân này.': 'No upgrade applies to this unit type yet.',
  'đang nghiên cứu cấp {lv} — còn {n} tick': 'researching level {lv} — {n} ticks left',
  'đã tới cấp trần': 'at maximum level', 'khoá tới {age}': 'locked until the {age}',
  'cấp {lv}: {cost}': 'level {lv}: {cost}',
  ' tầng {lv}': ' storey {lv}',
  '({line} +{pct}%)': '({line} +{pct}%)',
  ' — đang xây tầng trên, NGỪNG BẮN': ' — raising the next storey, NOT FIRING',
  '(gốc {n})': '(base {n})',
  '{v} mỗi {n} tick': '{v} every {n} ticks',
  '({pct}% bậc thời đại)': '({pct}% of the age tier)',
  'Tháp chỉ đạt {pct}% sức đánh ở {first} và bò lên 100% ở {last} — GIÁ của nó đi theo đúng đường cong này.':
    'A tower reaches only {pct}% attack in the {first} and climbs to 100% by the {last} — its PRICE follows exactly the same curve.',
  'Giá luôn đúng bằng tỉ lệ sức mạnh tháp đang có: rẻ khi còn yếu, đắt dần khi mạnh lên.':
    'The price always matches the tower’s current share of full strength: cheap while weak, dearer as it grows.',
  '×{n} sức mạnh': '×{n} strength',
  '{have}/{need} tháp cho {age}': '{have}/{need} towers for the {age}',
  '{unit} ({n} đang có)': '{unit} ({n} in service)',
  '+0,12 mỗi nhịp hồi': '+0.12 per regeneration tick',
  '{rate} máu/tick trong {r} ô': '{rate} health/tick within {r} cells',
  'không có địch trong {r} ô': 'no enemy within {r} cells',
  '{unit} · {hp}/{max} máu': '{unit} · {hp}/{max} health',
  '{rate} máu/tick khi rảnh tay': '{rate} health/tick when idle',
  '{n} người một lúc': '{n} at a time',
  'còn {n} tick · đang nuôi {a}/{b}': '{n} ticks left · feeding {a}/{b}',
  '{rate} lương/tick · {slots} suất · bán kính {r} ô': '{rate} food/tick · {slots} slots · radius {r} cells',
  '{rate} quân lương/tick · bán kính {r} ô': '{rate} supply/tick · radius {r} cells',
  '{a} / {b} suất': '{a} / {b} slots',
  '(theo thời đại)': '(by age)',
  '{food} lương · {wood} gỗ': '{food} food · {wood} wood',
  'sức đánh còn {pct}%': 'attack down to {pct}%',
  'sát thương mỗi đòn, đã tính nâng cấp và hào quang':
    'damage per hit, upgrades and auras included',
  'trừ thẳng vào mỗi đòn ăn vào người này (sàn {n}% đòn gốc)':
    'subtracted straight from each hit taken (floor: {n}% of the base hit)',
  'Vũ khí công thành: đánh vào công trình mạnh gấp {n} lần sức đánh thường.':
    'Siege weapon: hits buildings for {n}× its normal attack.',
  'Không phải vũ khí công thành: chỉ {n}% sức đánh chạm được vào tường. Muốn phá thành nhanh thì phải có máy bắn đá.':
    'Not a siege weapon: only {n}% of its attack lands on walls. To break a city quickly you need catapults.',
  '×{n} công thành': '×{n} siege',
  ' · ĐUỐI, trần {v} ô/tick': ' · SPENT, capped at {v} cells/tick',
  'Chỉ hao khi CHẠY dưới áp lực (đuổi · bỏ chạy · rút lui · đi săn). Đi lại bình thường và hành quân thì không hao. Cạn sạch thì tốc độ bị chặn ở {v} ô/tick, bất kể loài nào — một con ngựa mệt không còn là một con ngựa nhanh.':
    'Only drains while RUNNING under pressure (chasing · fleeing · withdrawing · hunting). Ordinary movement and marching cost nothing. Fully spent, speed is capped at {v} cells/tick for every species — a tired horse is no longer a fast horse.',
  '+{n} công': '+{n} atk', '+{n} thủ': '+{n} def', '+{n} máu': '+{n} health',
  '+{n} máu/tick': '+{n} health/tick', '+{n} bệnh nhân cùng lúc': '+{n} patients at once',
  '+{n} ô tầm chữa': '+{n} cells heal reach', '+{n} ô tầm tìm': '+{n} cells search range',
  'BAY qua rừng và hồ': 'FLIES over forest and water',
  'đánh tầm xa {n} ô': 'ranged attack, {n} cells',
  'nọc độc {dps}/tick × {ticks}': 'venom {dps}/tick × {ticks}',
  'sát thương lan {n} ô': 'splash damage {n} cells',
  'hào quang +{pct}% trong {r} ô': 'aura +{pct}% within {r} cells',
  'PHÂN ĐÔI khi chết → {n} con {pct}%': 'SPLITS on death → {n} spawn at {pct}%',
  'PHỤC KÍCH — vùi đất, đòn đầu ×{mult}': 'AMBUSH — buried, first hit ×{mult}',
  'cắn LÀM CHẬM ×{mult} trong {ticks} tick': 'bite SLOWS ×{mult} for {ticks} ticks',
  'HỒI {n} máu/{every} tick cho quái trong {r} ô': 'HEALS {n} health/{every} ticks to monsters within {r} cells',
  'CÔNG THÀNH ×{n} sát thương lên công trình': 'SIEGE ×{n} damage to buildings',
  'Không thuộc bộ lạc nào — tấn công tất cả. Ngoài chuyến đi cướp thì chỉ đuổi trong bán kính {n} ô quanh hang.':
    'Belongs to no tribe — attacks everyone. Outside a raid it only gives chase within {n} cells of its lair.',
  'Hang LỚN LÊN bằng thứ nó giết được (+ một dòng chảy chậm theo thời gian). Bỏ mặc thì nó nở rộng vòng nguy hiểm, đẻ ra loài dữ hơn, và từ cấp 2 nó tự cử quái đi cướp. Cấp 3 nuôi một <b>Chúa Hang</b>. Phá hang ra Thánh vật — Tổ Quỷ ra thêm một món nữa.':
    'A lair GROWS on what it kills (plus a slow trickle over time). Leave it be and it widens its danger ring, breeds nastier species, and from tier 2 sends monsters out to raid on its own. Tier 3 keeps a <b>Lair Lord</b>. Destroy a lair for a Relic — a Demon Nest drops one more.',
  ' + Chúa Hang': ' + Lair Lord',
  '{n} — đã đạt cấp cao nhất': '{n} — already at the highest tier',
  ' · đang đói': ' · starving',
  'còn {n} tick (đã đi {trips} chuyến)': '{n} ticks left ({trips} raids sent)',
  'Không do dân xây và <b>không xây lại được</b>: một <b>{unit}</b> cắm nó xuống trong một tick, giữa đất địch, rồi nó tự nhổ sau khi hết hạn. Chỉ {hp} máu và không giáp — đây là mục tiêu mềm nhất bản đồ, và phá nó là cắt đường tiếp tế của cả một chiến dịch.':
    'Not built by villagers and <b>cannot be rebuilt</b>: a <b>{unit}</b> pitches it in a single tick, deep in enemy ground, and it strikes itself once it expires. Only {hp} health and no armour — the softest target on the map, and destroying it severs a whole campaign’s supply line.',
  'Ra lò từ <b>{build}</b>. Không có vũ khí, không đánh trả — nó đi theo đạo quân và <b>dựng trại tiếp tế</b> ở nơi có ít nhất {n} người đang đói, <em>bên ngoài lãnh thổ nhà</em> (trong lãnh thổ thì đất nhà đã tiếp tế miễn phí rồi). Mỗi đội nuôi <b>một</b> cái trại một lúc; trại hết hạn thì phải chờ {cd} tick. Nhánh <b>{icon} {line}</b> ở chính {build} nâng cả ba con số của cái trại.':
    'Trained at the <b>{build}</b>. No weapon, no counterattack — it follows the army and <b>pitches a supply camp</b> wherever at least {n} people are going hungry, <em>outside home territory</em> (inside it, home soil already resupplies for free). Each quartermaster keeps <b>one</b> camp at a time; once a camp expires it must wait {cd} ticks. The <b>{icon} {line}</b> branch, at the {build} itself, raises all three of the camp’s numbers.',
  'Ra lò từ <b>{build}</b>. Không có vũ khí, không đánh trả — nó đi tìm thương binh nặng nhất quanh mình và vá lại ngay giữa trận. Có {unit} trong {r} ô thì lính bị thương <b>không rút về hậu phương nữa</b>: đó là chỗ đắt nhất của nó, và cũng là lý do bên kia nên đi tìm nó trước.':
    'Trained at the <b>{build}</b>. No weapon, no counterattack — it seeks out the worst-wounded nearby and patches them up mid-battle. With a {unit} within {r} cells, wounded soldiers <b>stop withdrawing to the rear</b>: that is the most valuable thing it buys, and also why the other side should hunt it first.',
  'Không ai xây, không ai đặt móng — nó <b>tự mọc</b> quanh kinh đô ngay từ {age}, rộng ra và <b>đổi hình</b> mỗi đời (5 bậc). Chặn <b>quân địch và quái vật</b>, không chặn quân nhà. <b>{span} ô giữa mỗi cạnh là cổng thành</b>: {door} ô <b>cánh cửa</b> ở giữa (chỉ {hp}% máu — chỗ mỏng nhất của cả vành) kẹp giữa <b>hai lầu cổng</b> cao vượt lên, dày như tường thường. Bộ binh gõ vào tường gần như vô hại (×{pen}); phá thành là việc của <b>máy bắn đá</b> (×{siege}). Thủng một ô là mở một cửa trong {rubble} tick. Vá tường <b>tốn đá</b>, và dưới {reserve} đá trong kho thì chỉ vá bằng {poor}% tốc độ.':
    'Nobody builds it, nobody lays a foundation — it <b>grows by itself</b> around the capital from the {age} onward, widening and <b>changing shape</b> each age (5 tiers). It stops <b>enemies and monsters</b>, never friendly troops. <b>{span} cells at the middle of each side form the gate</b>: {door} <b>door</b> cells in the centre (only {hp}% health — the thinnest point of the whole ring) flanked by <b>two gatehouses</b> rising above it, as thick as ordinary wall. Infantry punching a wall is nearly harmless (×{pen}); breaking cities is the job of <b>catapults</b> (×{siege}). A breached cell opens a doorway for {rubble} ticks. Repairs <b>cost stone</b>, and below {reserve} stone in store they run at only {poor}% speed.',

  // ==========================================================================
  // THƯ KHỐ
  // ==========================================================================
  'Quái vật là <b>phe thứ năm</b> — không thuộc bộ lạc nào và tấn công tất cả. Mỗi loài mang đúng <b>một động từ</b> mà những loài khác không có; bảng chỉ số chỉ là hệ quả. Hang ổ <b>lớn lên bằng thứ nó giết được</b>: bỏ mặc một cái hang là tự tay mở khoá những loài dữ hơn cho chính mình.':
    'Monsters are the <b>fifth faction</b> — they belong to no tribe and attack everyone. Each species carries exactly <b>one verb</b> the others lack; the stat table is merely the consequence. A lair <b>grows on what it kills</b>: leaving one alone is unlocking nastier species for yourself.',
  'Hang ổ — nguồn của tất cả': 'Lairs — the source of them all',
  'nguy hiểm {n}× · do CHÚA TỂ thả xuống, không ra từ hang':
    'threat {n}× · dropped by the OVERLORD, not born of a lair',
  'nguy hiểm {n}× · quái hoang dã': 'threat {n}× · wild monster',
  'máu <b>{n}</b>': 'health <b>{n}</b>',
  'máu <b>{lo}–{hi}</b>': 'health <b>{lo}–{hi}</b>',
  'đánh <b>{n}</b>': 'attack <b>{n}</b>',
  'đánh <b>{lo}–{hi}</b>': 'attack <b>{lo}–{hi}</b>',
  'giáp <b>{n}</b>': 'armour <b>{n}</b>',
  'tốc <b>{n}</b>': 'speed <b>{n}</b>',
  'tốc <b>{n}</b> ô/tick': 'speed <b>{n}</b> cells/tick',
  'nhịp <b>{n}</b> tick': 'every <b>{n}</b> ticks',
  'rơi đồ <b>{n}%</b>': 'drop rate <b>{n}%</b>',
  'tầm <b>{n}</b> ô': 'range <b>{n}</b> cells',
  'trần quái <b>{n}</b>': 'monster cap <b>{n}</b>',
  'lảng vảng <b>{n}</b> ô': 'roams <b>{n}</b> cells',
  'đi cướp mỗi <b>{n}</b> tick': 'raids every <b>{n}</b> ticks',
  'nhả ra: {list}': 'spawns: {list}',
  'cấp {n}': 'tier {n}',
  ' · lên cấp ở {n} điểm nuôi': ' · promotes at {n} feed points',
  ' · cấp cao nhất': ' · highest tier',
  '<b>BAY</b> — bỏ qua rừng, đi đường thẳng': '<b>FLIES</b> — ignores forest, travels in a straight line',
  '<b>BẮN XA</b> {r} ô (lùi ra khi bị áp sát dưới {min})':
    '<b>SHOOTS</b> {r} cells (backs off when closed to within {min})',
  '<b>ĐỘC</b> — {dps}/tick trong {ticks} tick sau khi cắn':
    '<b>VENOM</b> — {dps}/tick for {ticks} ticks after the bite',
  '<b>SÁT THƯƠNG LAN</b> {n} ô': '<b>SPLASH DAMAGE</b> {n} cells',
  '<b>HÀO QUANG</b> +{pct}% sát thương cho quái trong {r} ô':
    '<b>AURA</b> +{pct}% damage to monsters within {r} cells',
  '<b>PHÂN ĐÔI</b> — chết thì tách thành {n} con {pct}% (con nhỏ không tách nữa)':
    '<b>SPLITS</b> — on death it becomes {n} spawn at {pct}% (the spawn do not split again)',
  '<b>PHỤC KÍCH</b> — nằm vùi, không ai nhắm được, trồi lên trong {r} ô và đòn đầu ×{mult}':
    '<b>AMBUSH</b> — lies buried and untargetable, surfaces within {r} cells and its first hit is ×{mult}',
  '<b>LÀM CHẬM</b> — vết cắn cắt tốc độ ×{mult} trong {ticks} tick':
    '<b>SLOW</b> — the bite cuts speed to ×{mult} for {ticks} ticks',
  '<b>HỒI MÁU</b> {n} máu/{every} tick cho quái trong {r} ô':
    '<b>HEALS</b> {n} health/{every} ticks to monsters within {r} cells',
  '<b>CÔNG THÀNH</b> ×{n} sát thương lên công trình': '<b>SIEGE</b> ×{n} damage to buildings',
  '<b>ĐUỔI</b> — bám và cắn, không có mẹo nào khác':
    '<b>CHASE</b> — follow and bite, no other trick',
  '<b>MẠNH DẦN THEO THỜI GIAN</b> — thả càng muộn càng dữ, đỉnh ở tick {peak}: {loRank} {loHp} máu / đòn {loAtk} → {hiRank} {hiHp} máu / đòn {hiAtk}':
    '<b>GROWS WITH TIME</b> — the later it is dropped the fiercer it is, peaking at tick {peak}: {loRank} {loHp} health / {loAtk} attack → {hiRank} {hiHp} health / {hiAtk} attack',
  '<b>KHOÁ TỚI {AGE}</b> — Chúa Tể không thả được nó khi chưa bộ lạc nào tới đời {n}. Điều kiện là THỜI ĐẠI chứ không phải một mốc tick, nên nó đọc được thẳng trên bản đồ: mái nhà đổi vật liệu, tường mọc lên, kỵ binh ra chuồng':
    '<b>LOCKED UNTIL THE {AGE}</b> — the Overlord cannot drop it until some tribe has reached age {n}. The condition is an AGE, not a tick mark, so it can be read straight off the map: roofs change material, walls rise, knights leave the stable',
  '<b>SĂN KẺ DẪN ĐẦU</b> — hành quân thẳng tới bộ lạc đang đứng nhất bảng, nhắm lại mỗi {n} tick':
    '<b>HUNTS THE LEADER</b> — marches straight at the tribe topping the board, retargeting every {n} ticks',
  '<b>KHO BÁU</b> — bộ lạc ra đòn cuối nhận {food} lương · {wood} gỗ · {stone} đá · {gold} vàng ở bậc gốc, NHÂN theo đúng hệ số con quái (tới {peakFood} lương ở bậc đỉnh); Chúa Tể được hoàn {refund} Đức Tin':
    '<b>HOARD</b> — whoever lands the killing blow receives {food} food · {wood} wood · {stone} stone · {gold} gold at base rank, MULTIPLIED by the monster’s own factor (up to {peakFood} food at peak); the Overlord is refunded {refund} Faith',
  '<b>THÁNH VẬT CẤP {tier}</b> — con đường duy nhất tới món đồ mạnh nhất game mà không phải nung bốn món cấp 1 lại':
    '<b>TIER-{tier} RELIC</b> — the only route to the strongest item in the game without forging four tier-1 items together',
  '<b>MỘT CẤP NGHIÊN CỨU</b> — nhánh đang làm dở xong ngay, hoặc cộng thẳng một cấp vào nhánh đang cao nhất; áp tức thì cho cả đạo quân đang sống':
    '<b>ONE RESEARCH LEVEL</b> — the branch in progress completes instantly, or a level is added straight onto the highest branch; applied at once to the whole living army',

  // --- Tờ quân lính ---
  'Thời đại chỉ <b>MỞ KHOÁ</b> một loại quân — muốn có nó thật thì vẫn phải bỏ tài nguyên dựng đúng công trình ra lò. Vì thế hai bộ lạc cùng lên {age} vẫn có thể có hai đạo quân không giống nhau chút nào. Hình dưới đây vẽ ở <b>cấp nâng cấp 0</b>; giáp, vũ khí và mũ sẽ đổi hình theo năm nhánh nghiên cứu. <span class="cx-locked">(Chỉ số chưa nhân hệ số thời đại.)</span><br><br><b>ĐẬP TƯỜNG LÀ MỘT CHỈ SỐ RIÊNG.</b> Bộ binh, cung thủ, kỵ binh và cả anh hùng chỉ chạm được <b>{pen}%</b> sức đánh của mình vào công trình; <b>vũ khí công thành</b> thì ngược lại, đánh <b>{siege}×</b>. Một cỗ máy bắn đá đập tường bằng <b>60</b>, một kỵ sĩ bằng <b>2,6</b> — nhìn hai ô &ldquo;đánh&rdquo; (20 với 13) thì không đoán ra khoảng cách 23 lần đó. Muốn <b>phá thành</b> thì phải dựng Xưởng thợ; một đạo quân đông tới mấy cũng chỉ gặm được tường rất chậm.<br><br><b>THỂ LỰC — CHẠY THÌ HAO, ĐI THÌ KHÔNG.</b> Thể lực chỉ vơi khi đơn vị <b>chạy dưới áp lực</b>: đang đuổi ai, đang bỏ chạy khỏi ai, đang rút lui, đang đi săn. Đi làm, gánh hàng và <b>hành quân</b> thì không tốn một điểm nào — nên cơ chế này vô hình với cả nền kinh tế và với mọi trận đánh ngắn. Cạn sạch thì tốc độ bị chặn ở <b>{exhaust} ô/tick</b> — một cái <b>trần tuyệt đối</b>, không phải một hệ số nhân. Đó là điểm mấu chốt: <b>một con ngựa mệt không còn là một con ngựa nhanh</b>. Kỵ xạ chạy 1,65 ô/tick nhưng chỉ nước rút được <b>{ha} tick</b>, trong khi bộ binh bền <b>{sol} tick</b> — nên đuổi mãi thì bộ binh <b>bắt kịp</b> (đo trên mô hình: bắt kịp ở tick 97, sau khi khoảng cách đã nở ra 23 ô). Lợi thế tốc độ vẫn còn nguyên, nó chỉ không còn <b>vô hạn</b> nữa. Quái vật có <b>{mon} ô</b> — dồi dào tới mức gần như không bao giờ đuối; dân thường <b>{vil}</b>, thấp nhất bảng. Đơn vị đã đuối bốc <b>ba giọt mồ hôi</b> trên đầu.':
    'An age only <b>UNLOCKS</b> a unit type — actually having it still means spending resources on the right building. That is why two tribes both in the {age} can field armies with nothing in common. The drawings below are at <b>upgrade level 0</b>; armour, weapons and helmets change shape with the research branches. <span class="cx-locked">(Stats shown without the age multiplier.)</span><br><br><b>WALL DAMAGE IS A SEPARATE STAT.</b> Infantry, archers, cavalry and even heroes land only <b>{pen}%</b> of their attack on buildings; <b>siege weapons</b> are the reverse, hitting for <b>{siege}×</b>. A catapult hits a wall for <b>60</b>, a knight for <b>2.6</b> — looking at their two "attack" cells (20 and 13) you would never guess that 23-fold gap. To <b>break a city</b> you must build a Workshop; an army of any size will only gnaw at walls very slowly.<br><br><b>STAMINA — RUNNING COSTS, WALKING DOES NOT.</b> Stamina only drains while a unit is <b>running under pressure</b>: chasing someone, fleeing someone, withdrawing, hunting. Working, hauling and <b>marching</b> cost nothing at all — so the mechanic is invisible to the economy and to every short battle. Fully spent, speed is capped at <b>{exhaust} cells/tick</b> — an <b>absolute ceiling</b>, not a multiplier. That is the crux: <b>a tired horse is no longer a fast horse</b>. A horse archer runs 1.65 cells/tick but can only sprint <b>{ha} ticks</b>, while infantry lasts <b>{sol} ticks</b> — so in a long chase the infantry <b>catches up</b> (measured on the model: caught at tick 97, after the gap had opened to 23 cells). The speed advantage is entirely intact; it is simply no longer <b>unlimited</b>. Monsters have <b>{mon} cells</b> — so ample they practically never tire; villagers <b>{vil}</b>, the lowest on the board. A spent unit sweats <b>three drops</b> above its head.',
  '<b>không đánh</b>': '<b>no attack</b>',
  'đập tường <b style="color:{col}">{v}</b>': 'wall dmg <b style="color:{col}">{v}</b>',
  'thể lực <b>{n}</b> tick chạy': 'stamina <b>{n}</b> ticks of running',
  'giá {cost}': 'cost {cost}',
  '+ <b style="color:var(--gold)">1 dân thường</b>': '+ <b style="color:var(--gold)">1 villager</b>',
  'lò <b>{n}</b> tick': 'trains in <b>{n}</b> ticks',
  '<b>GIẪM ĐẠP</b> — gây <b>{dmg}</b> sát thương mỗi tick cho mọi kẻ địch trong <b>{r}</b> ô quanh mình, không cần nhắm và không có hồi chiêu. Đơn vị duy nhất trong game gây sát thương bằng việc <b>di chuyển</b>.':
    '<b>TRAMPLE</b> — deals <b>{dmg}</b> damage per tick to every enemy within <b>{r}</b> cells, with no aiming and no cooldown. The only unit in the game that deals damage by <b>moving</b>.',
  '<b>XUYÊN THẤU</b> — mũi lao đi hết <b>{n}</b> ô theo đường thẳng, mọi kẻ địch nằm trên đường đạn đều dính đòn (80% sát thương). Đội hình càng thẳng hàng càng thiệt.':
    '<b>PIERCE</b> — the bolt travels <b>{n}</b> cells in a straight line, hitting every enemy along its path (80% damage). The tidier the formation, the worse it suffers.',
  '<b>CỔ VŨ</b> — quân nhà trong <b>{r}</b> ô đánh mạnh thêm <b>{atk}%</b> và đi nhanh thêm <b>{spd}%</b>. Nhiều lá cờ <b>không cộng dồn</b>: chỉ lấy lá mạnh nhất.':
    '<b>RALLY</b> — friendly troops within <b>{r}</b> cells hit <b>{atk}%</b> harder and move <b>{spd}%</b> faster. Multiple banners <b>do not stack</b>: only the strongest counts.',
  '<b>CÔNG THÀNH</b> — miễn hình phạt đập nhà: chạm vào tường bằng <b>{mult}×</b> sức đánh thường, trong khi mọi loại khác chỉ còn {pen}%.':
    '<b>SIEGE</b> — exempt from the building penalty: hits walls for <b>{mult}×</b> its normal attack, while every other type is reduced to {pen}%.',
  'Hái quả, đốn gỗ, đào vàng, đục đá và xây mọi thứ. Thấy lính địch trong 7 ô là bỏ chạy — họ không phải quân.':
    'Picks berries, fells trees, digs gold, breaks stone and builds everything. Flees at the sight of an enemy soldier within 7 cells — they are not troops.',
  'Xương sống của mọi đạo quân. Rẻ, có giáp sẵn, và là loại duy nhất có mặt từ tick đầu tới tick cuối.':
    'The backbone of every army. Cheap, armoured from the start, and the only type present from the first tick to the last.',
  'Bắn trước khi bị chạm, nhưng 42 máu thì bị kỵ binh sát vào là tan. Chính tầm bắn tạo ra <b>đội hình</b>: có lý do để đứng sau.':
    'Shoots before being touched, but at 42 health a cavalry charge ends it. Range is exactly what creates a <b>formation</b>: a reason to stand behind.',
  'Không có ô sát thương. Đi tìm thương binh nặng nhất quanh mình và vá lại <b>ngay giữa trận</b> — đưa hậu phương ra tiền tuyến thay vì bắt thương binh đi bộ về.':
    'No attack stat. Seeks out the worst-wounded nearby and patches them up <b>mid-battle</b> — bringing the rear to the front instead of making the wounded walk home.',
  'Không có ô sát thương. Nó dựng <b>Trại tiếp tế</b> giữa đất địch — cái trại nuôi <b>{slots} suất</b> quân lương một lúc trong bán kính <b>{r} ô</b> rồi tự nhổ sau <b>{ttl} tick</b>. Là đơn vị hỗ trợ thứ ba, và ba đơn vị ấy nằm trên ba trục vuông góc: thầy lang mua <b>thời gian</b>, quân kỳ mua <b>cường độ</b>, hậu cần mua <b>khoảng cách</b>.':
    'No attack stat. It pitches a <b>Supply Camp</b> in enemy ground — the camp feeds <b>{slots} supply slots</b> at once within <b>{r} cells</b>, then strikes itself after <b>{ttl} ticks</b>. The third support unit, and the three sit on three perpendicular axes: medics buy <b>time</b>, standard bearers buy <b>intensity</b>, quartermasters buy <b>distance</b>.',
  'Nặng, nhanh, thắng dã chiến — nhưng đập tường rất chậm. Đắt gấp rưỡi mỗi suất và ăn lương gấp đôi.':
    'Heavy, fast, wins the open field — but very slow against walls. Half again as expensive per head and eats twice the food.',
  'Bắn trên lưng ngựa: giữ được khoảng cách với thứ đuổi mình. Loại quân mở khoá muộn nhất trong cả bảng.':
    'Shoots from the saddle: it can keep its distance from whatever chases it. The latest-unlocking unit on the board.',
  'Loại quân <b>duy nhất</b> được miễn hình phạt đập nhà — và đó là toàn bộ lý do nó tồn tại. Thua dã chiến, chậm, đắt; đổi lại nó là câu trả lời cho một câu hỏi mà không ai khác trả lời được.':
    'The <b>only</b> unit exempt from the building penalty — and that is its entire reason to exist. Loses the open field, slow, expensive; in exchange it answers a question nobody else can.',
  'Bắn một mũi lao <b>xuyên thẳng</b>, trúng mọi kẻ địch trên đường đạn. Máy bắn đá lan theo <b>hình tròn</b> nên né nó bằng cách đứng thưa; nỏ thần đi theo <b>đường thẳng</b> nên né nó bằng cách đứng lệch hàng — và một đạo quân không thể vừa thưa vừa lệch hàng. Bộ lạc kỷ luật cao xếp hàng đẹp, và chính vì thế ăn trọn một phát.':
    'Fires a bolt that <b>pierces straight through</b>, hitting every enemy along its path. Catapult splash is a <b>circle</b>, so you dodge it by spreading out; the ballista travels in a <b>line</b>, so you dodge it by standing off-file — and an army cannot be both spread out and off-file. A high-discipline tribe forms up beautifully, and takes the whole bolt for it.',
  'Gây sát thương cho mọi kẻ địch nó <b>đi ngang qua</b>, không cần lệnh, không có hồi chiêu. Mọi đơn vị khác gây sát thương bằng cách DỪNG LẠI và nhắm; voi gây sát thương bằng cách ĐI. Chặn đường nó bằng một khối quân đông thì chính sự đông đúc đó là thứ giết mình.':
    'Damages every enemy it <b>walks past</b>, with no order and no cooldown. Every other unit deals damage by STOPPING and aiming; the elephant deals damage by WALKING. Block its path with a dense mass of troops and that very density is what kills you.',
  'Không đánh ai. Đồng đội quanh nó đánh mạnh hơn và đi nhanh hơn. Là anh em đối xứng của Thầy lang: thầy lang mua <b>thời gian</b>, quân kỳ mua <b>cường độ</b>. Hào quang <b>không cộng dồn</b> — hai lá cờ đứng cạnh nhau chỉ bằng một, nên gom cờ không phải một chiến lược.':
    'Attacks nobody. Allies around it hit harder and move faster. The symmetric twin of the Medic: medics buy <b>time</b>, standard bearers buy <b>intensity</b>. The aura <b>does not stack</b> — two banners side by side are worth one, so massing banners is not a strategy.',
  'Mỗi bộ lạc nhiều nhất MỘT người còn sống, và là đơn vị <b>duy nhất có gen riêng của cá thể</b> — xem tờ Anh hùng.':
    'At most ONE alive per tribe, and the <b>only unit with genes of its own</b> — see the Heroes sheet.',

  // --- Tờ công trình ---
  'Công trình <b>không chặn đường đi</b> — quân đi xuyên qua nhà. Đó là một đánh đổi cố ý: chặn thì với cách tìm đường tham lam của trò chơi này, dân sẽ kẹt cứng quanh cụm nhà. Ngoại lệ duy nhất là <b>tường thành</b> ở cuối trang: nó chặn, nhưng chỉ chặn người của phe khác. Hình vẽ ở <b>{age}</b> trở lên, nên mái đã mang vật liệu của thời đại đó — lên đời thì cả <b>đường bao</b> của công trình đổi, không chỉ đổi màu.':
    'Buildings <b>do not block movement</b> — units walk through them. That is a deliberate trade: with this game’s greedy pathfinding, blocking would jam villagers solid around every cluster of houses. The one exception is the <b>city wall</b> at the foot of the page: it blocks, but only people of another faction. The drawings are from the <b>{age}</b> onward, so the roofs already carry that age’s material — advancing an age changes a building’s whole <b>silhouette</b>, not just its colour.',
  '{a}×{b} ô': '{a}×{b} cells',
  '+<b>{list}</b> dân theo đời': '+<b>{list}</b> population by age',
  '+<b>{n}</b> dân': '+<b>{n}</b> population',
  'bắn <b>{atk}</b> trong <b>{r}</b> ô': 'shoots <b>{atk}</b> within <b>{r}</b> cells',
  'giá theo đời {list}': 'cost by age {list}',
  '→ máu theo đời <b>{list}</b>': '→ health by age <b>{list}</b>',
  'xây <b>{n}</b> tick với đủ thợ': 'built in <b>{n}</b> ticks at full crew',
  'dựng <b style="color:var(--gold)">tức thì</b>, không cần thợ':
    'raised <b style="color:var(--gold)">instantly</b>, no builders needed',
  'sống <b>{n}</b> tick rồi tự nhổ': 'stands <b>{n}</b> ticks then strikes itself',
  '{age} trở lên · không ai xây, không ai đặt móng':
    '{age} onward · nobody builds it, nobody lays a foundation',
  'vành bán kính <b>{list}</b> ô theo đời': 'ring radius <b>{list}</b> cells by age',
  'máu mỗi ô <b>{list}</b>': 'health per cell <b>{list}</b>',
  'cổng <b>{span}</b> ô giữa mỗi cạnh: <b>{door}</b> ô cánh cửa (<b>{hp}%</b> máu) + <b>2</b> lầu cổng dày như thường':
    'gate <b>{span}</b> cells at each side’s midpoint: <b>{door}</b> door cells (<b>{hp}%</b> health) + <b>2</b> gatehouses of ordinary thickness',
  'tự sửa <b>{pct}%</b> máu/tick, tốn <b>{stone}</b> đá mỗi ô':
    'self-repairs <b>{pct}%</b> health/tick, costing <b>{stone}</b> stone per cell',
  'dưới <b>{n}</b> đá thì chỉ còn <b>{pct}%</b> tốc độ':
    'below <b>{n}</b> stone it drops to <b>{pct}%</b> speed',
  'thủng thì hở <b>{n}</b> tick': 'a breach stays open <b>{n}</b> ticks',
  'Vật cản <b>có phe</b> đầu tiên của trò chơi: quân nhà đi xuyên qua, <b>quân địch và quái vật</b> đứng lại. Nhờ vậy nó tạo ra thứ mà một dải rừng không tạo nổi — một <b>bên trong</b> và một <b>bên ngoài</b>. Nó <b>tự mọc</b> quanh mỗi kinh đô và <b>dựng lại cả vành</b> ở bán kính mới mỗi lần lên đời (không đắp thêm lớp thứ hai, nếu không sau bốn đời nó thành một mê cung).<br><b>Năm bậc, một bậc mỗi đời</b> — {tiers} — và mỗi bậc đổi cả <b>đường bao</b> lẫn vật liệu, không chỉ đổi màu: cả bức tường lên bậc cùng một lúc nên không bao giờ có mẫu cũ đứng cạnh để so màu. Bốn <b>góc</b> là tháp vuông cao hơn thân; {span} ô <b>chính giữa mỗi cạnh</b> là một <b>cổng thành</b> — {door} ô cánh cửa gỗ đóng đinh tán nằm dưới một vòm cuốn liền ba ô có <b>đá khoá đỉnh</b> màu bộ lạc, kẹp giữa <b>hai lầu cổng</b> có mái vát và lỗ châu mai. Đường bao của cả cụm chạy <em>thấp&#8202;·&#8202;CAO&#8202;·&#8202;thấp&#8202;·&#8202;CAO&#8202;·&#8202;thấp</em>, và chính cái nhịp ấy — chứ không phải màu — là thứ đọc được từ xa. Chỉ {door} ô cánh cửa là mỏng máu: nới cổng rộng ra <b>không</b> làm bức tường dễ vỡ hơn, nó chỉ làm chỗ vỡ đọc được hơn. Đó là lý do &ldquo;trận đánh ở cổng Nam&rdquo; là một câu kể được.<br>Nó <b>ăn đá</b> để tự lành: mỗi ô đang vá rút {stone} đá khỏi kho mỗi tick, và dưới ngưỡng {reserve} đá thì nó vẫn vá — chỉ chậm còn {poor}%, để bức tường không bao giờ ăn mất viên đá cuối cùng lẽ ra thành tháp canh hay Kỳ quan. Bộ binh đấm vào tường gần như vô hại (×{pen}) — phá thành là việc của <b>máy bắn đá</b> (×{siege}), và đó là <b>lý do thứ hai</b> để tồn tại một Xưởng thợ, sau Kỳ quan. Bộ lạc <b>bành trướng</b> rộng thì vĩnh viễn có nhà nằm ngoài tường: đó là cái giá đúng đắn, không phải một lỗi.<br>Quân <b>tầm xa nã tường TỪ XA</b>: chúng chỉ dừng lại khi bức tường thật sự <b>chắn đường đi của chính mình</b>, rồi đứng lùi về đúng tầm bắn mà bắn — máy bắn đá ở <b>11</b> ô, cung thủ ở <b>5</b> ô — thay vì bò vào <b>1</b> ô như trước. Nhờ vậy vòng vây tự xếp thành hai lớp: bộ binh ôm chân tường, quân bắn đứng ngoài tầm tháp canh. Đục thủng được ô trước mặt là chúng <b>đi tiếp ngay</b> qua lỗ ấy, không ở lại gặm nốt vành tường. Đạn <b>lan</b> của máy bắn đá nay chạm cả tường, nên một quả rơi đúng chỗ mở được cả một đoạn.<br><b>BINH PHÁP CÔNG THÀNH</b> — bên công cuối cùng cũng biết mình đang đứng trước cái gì. Hai luật, và cả hai đều <b>tính lại mỗi tick</b> từ ô tường đang chắn mặt, không ghi nhớ gì.<br><b>1 · TÌM CỔNG.</b> Đâm phải thân tường thì đi men theo tường tới <b>cánh cửa</b> của chính cạnh đó — chỗ chỉ có {gatehp}% máu — thay vì đứng đấm chỗ mình tình cờ chạm vào. Mỗi ô tường được gán sẵn đúng MỘT cái cổng của nó lúc dựng vành, nên một người lính đứng ở góc (chỗ cách đều hai cổng) không rung qua lại giữa hai lựa chọn. Cả máy bắn đá cũng đi: cỗ máy ngoài tầm cổng thì <b>kéo tới cổng</b> chứ không nã vào thân tường trước mặt. Đo trước bản này: <b>91%</b> sát thương lên tường đổ vào thân tường máu đầy, cánh cửa chỉ ăn <b>5,8%</b> — nghĩa là câu &ldquo;trận đánh ở cổng Nam&rdquo; chưa từng xảy ra lần nào. Sau: cánh cửa ăn <b>20%</b> sát thương và <b>58%</b> số lỗ thủng là ở cổng. Anh hùng đi từ <b>5%</b> lên <b>54%</b>.<br><b>2 · ĐỢI CỖ MÁY.</b> Bộ binh <b>không</b> đấm tường khi có máy bắn đá của nhà mình <b>đang bắn được vào đúng ô ấy</b> — chúng lùi ra <b>{hold}</b> ô, ngoài tầm tháp canh ({trange} ô), rồi tràn vào lúc tường sắp vỡ. Điều kiện dừng là <b>MÁU CỦA BỨC TƯỜNG</b> chứ không phải một cái đồng hồ: nhờ vậy bộ binh ập tới đúng lúc, và luật tự tắt ngay tick cỗ máy chết mà không cần một dòng dọn dẹp nào. Ngưỡng tràn do <b>kỷ luật</b> quyết định — kỷ luật 0 thì gần như không chờ (nguyên cách đánh cũ vẫn nằm trong dải gen), kỷ luật cao thì chờ tới sát lúc vỡ — và mỗi cấp nhánh <b>Công thành</b> cho chờ thêm. Đó là nhánh đầu tiên trong bảng mua <b>HÀNH VI</b> chứ không mua chỉ số.':
    'The game’s first obstacle <b>with a side</b>: friendly troops walk through, <b>enemies and monsters</b> stop. That gives it what a belt of forest never could — an <b>inside</b> and an <b>outside</b>. It <b>grows by itself</b> around every capital and <b>rebuilds the entire ring</b> at a new radius each time the tribe advances (never a second layer, or after four ages it would be a maze).<br><b>Five tiers, one per age</b> — {tiers} — and each tier changes both the <b>silhouette</b> and the material, not just the colour: the whole wall tiers up at once, so there is never an old sample standing beside it for comparison. The four <b>corners</b> are square towers taller than the curtain; {span} cells at the <b>middle of each side</b> form a <b>gate</b> — {door} studded wooden door cells beneath an arch spanning all three, with a <b>keystone</b> in the tribe colour, flanked by <b>two gatehouses</b> with sloping roofs and arrow slits. The outline of the whole cluster runs <em>low&#8202;·&#8202;HIGH&#8202;·&#8202;low&#8202;·&#8202;HIGH&#8202;·&#8202;low</em>, and it is that rhythm — not the colour — that reads from a distance. Only the {door} door cells are thin: widening the gate does <b>not</b> make the wall easier to break, it only makes the breaking point legible. That is why "the battle at the South gate" is a sentence you can tell.<br>It <b>eats stone</b> to heal: each repairing cell draws {stone} stone from the store per tick, and below {reserve} stone it still repairs — just slowed to {poor}%, so the wall never eats the last block that should have become a watchtower or a Wonder. Infantry punching a wall is nearly harmless (×{pen}) — breaking cities is the job of <b>catapults</b> (×{siege}), and that is the <b>second reason</b> a Workshop exists, after the Wonder. A tribe with wide <b>expansion</b> will permanently have buildings outside the wall: that is the correct price, not a bug.<br><b>Ranged units now shell walls FROM RANGE</b>: they stop only when a wall genuinely <b>blocks their own path</b>, then fall back to exactly their firing range and shoot — catapults at <b>11</b> cells, archers at <b>5</b> — instead of crawling to <b>1</b> cell as before. The siege therefore arranges itself in two layers: infantry hugging the wall, shooters standing outside watchtower range. Once the cell in front is breached they <b>move straight on</b> through the hole rather than staying to gnaw at the rest. Catapult <b>splash</b> now touches walls too, so one well-placed shot can open a whole stretch.<br><b>SIEGE DOCTRINE</b> — the attacker finally knows what it is standing in front of. Two rules, and both are <b>recomputed every tick</b> from whichever wall cell is blocking the unit; nothing is remembered.<br><b>1 · FIND THE GATE.</b> On bumping into curtain wall, walk along the wall to <b>the door of that very side</b> — the only cells at {gatehp}% health — instead of standing and punching wherever you happened to arrive. Every wall cell is assigned exactly ONE gate when the ring is raised, so a soldier standing at a corner (equidistant from two gates) cannot oscillate between them. Catapults go too: a machine with the gate out of range <b>marches to the gate</b> rather than shelling the curtain in front of it. Measured before this version: <b>91%</b> of all wall damage landed on full-health curtain and the door took just <b>5.8%</b> — meaning &ldquo;the battle at the South gate&rdquo; had never once happened. After: the door takes <b>20%</b> of the damage and <b>58%</b> of all breaches are at a gate. The Hero went from <b>5%</b> to <b>54%</b>.<br><b>2 · WAIT FOR THE MACHINE.</b> Infantry do <b>not</b> punch a wall while a friendly catapult <b>can actually shoot that exact cell</b> — they fall back <b>{hold}</b> cells, outside watchtower range ({trange} cells), and pour in as the wall is about to fall. The stopping condition is <b>THE WALL’S OWN HEALTH</b>, not a timer: that is what makes the infantry arrive at the right moment, and it makes the rule switch itself off the tick the machine dies, with no cleanup code anywhere. The pour-in threshold is set by <b>discipline</b> — discipline 0 barely waits at all (the old behaviour still lives at one end of the gene’s range), high discipline waits until the wall is nearly down — and each level of the <b>Siegecraft</b> branch buys more patience. It is the first branch in the table that buys <b>BEHAVIOUR</b> rather than a stat.',

  // --- Blurb công trình ---
  'Kinh đô. Ra dân, nhận hàng, tự bắn trả. Mất <b>sạch</b> kinh đô là một <b>đồng hồ đếm ngược {grace} tick</b> tới diệt vong — dựng lại được một cái trước khi hết giờ thì thoát, còn không thì bộ lạc bị xoá sổ dù quân vẫn còn sống. Đồng hồ <b>đứng yên</b> trong lúc đang có thợ dựng móng nhà chính, nên nó phạt kẻ <b>chạy rông</b> chứ không phạt kẻ đang gượng dậy. Sức bắn của kinh đô <b>không</b> bị hạ theo thời đại như tháp canh. <b>San phẳng kinh đô địch</b> thì được <b>quyền lập đô</b> trên chính nền đất đó — một bộ lạc có thể có tới <b>3</b> kinh đô, và biên giới chuyển chủ ngay tại chỗ vừa đánh xong. Quyền đó <b>hết hạn sau 5.000 tick</b>, và dám dùng hay không thì do gen <b>lập đô</b> quyết.':
    'The capital. Produces villagers, receives cargo, shoots back. Losing <b>every</b> capital starts a <b>{grace}-tick countdown</b> to extinction — rebuild one before it runs out and you escape; otherwise the tribe is erased even with its army intact. The clock <b>stops</b> while builders are working on a town centre foundation, so it punishes the tribe that <b>runs about</b>, not the one struggling back to its feet. A capital’s firepower is <b>not</b> scaled down by age the way a watchtower’s is. <b>Raze an enemy capital</b> and you earn the <b>right to found</b> one on that very ground — a tribe may hold up to <b>3</b> capitals, and the border changes hands right where the fighting just ended. That right <b>expires after 5,000 ticks</b>, and whether a tribe dares use it is decided by the <b>colonise</b> gene.',
  'Nới trần dân số. Không có nó thì mọi thứ khác đều vô nghĩa: không có chỗ ở là không tuyển được ai.':
    'Raises the population cap. Without it nothing else matters: no housing means nobody can be recruited.',
  'Đổi gỗ lấy một dòng lương thực <b>ổn định nhưng rất nhỏ</b>: 9 ô × 0,085 = <b>0,77 lương/tick</b>, thấp hơn cả mức MỘT người hái được. Nó là cái <b>đệm</b> giữ bộ lạc không chết đói giữa hai chuyến đi xa, không phải cái vòi — phần lớn lương thực vẫn phải đi kiếm về. Khoá tới <b>Đồ Đồng</b>, nên trọn giai đoạn Đồ Đá chỉ có một nguồn ăn: bụi quả ngoài kia.':
    'Trades wood for a <b>steady but very small</b> food stream: 9 cells × 0.085 = <b>0.77 food/tick</b>, less than ONE gatherer brings in. It is the <b>buffer</b> that keeps a tribe from starving between long trips, not a tap — most food must still be fetched. Locked until the <b>Bronze Age</b>, so the whole Stone Age has exactly one food source: the berries out there.',
  'Nơi nhận hàng thứ hai ngoài kinh đô. Mỏ nào cũng nằm ngoài vành 16 ô quanh nhà, nên quãng gánh mặc định là 22-35 ô mỗi chiều; một cái kho đặt đúng chỗ cắt nó xuống còn 3. Giá trị của nó nằm ở <b>vị trí</b>, không ở số lượng — hai cái kho cạnh kinh đô đúng bằng không có cái nào.':
    'A second drop-off point besides the capital. Every ore node lies outside the 16-cell ring around home, so the default haul is 22–35 cells each way; one depot in the right place cuts it to 3. Its value is in <b>position</b>, not in number — two depots next to the capital are worth exactly none.',
  'Ra bộ binh và quân kỳ. Cửa vào của gần như mọi thứ còn lại trong bảng này. Từ bản này <b>mỗi công trình là một cái lò riêng chạy song song</b> — cái trại thứ hai thật sự rút đôi thời gian ra quân, và đó là lý do gen <b>số lò quân</b> tồn tại.':
    'Trains infantry and standard bearers. The doorway to almost everything else on this page. <b>Each building is its own parallel production line</b> — a second barracks genuinely halves the time to field troops, and that is why the <b>garrison</b> gene exists.',
  'Cửa <b>duy nhất</b> ra Anh hùng — trước bản này anh hùng ra lò từ trại lính, tức là ai muốn đánh nhau đều tự động có tướng. Tách riêng thì "có nuôi tướng không" mới là một <b>quyết định</b>: 110 gỗ + 70 vàng bằng gần một trại lính thứ hai. Bộ lạc gen <b>đầu tư anh hùng</b> thấp đi hết kỷ nguyên không có tướng, và đó là một ván chơi hợp lệ. Phá được nó là cắt đứt dòng dõi của địch tới hết kỷ nguyên.':
    'The <b>only</b> source of Heroes — previously heroes came out of the barracks, which meant anyone who wanted to fight automatically had a general. Split off, "do we keep a hero at all" becomes a real <b>decision</b>: 110 wood + 70 gold is nearly a second barracks. A tribe with a low <b>hero investment</b> gene goes a whole era without a general, and that is a legitimate way to play. Destroy it and you cut the enemy bloodline for the rest of the era.',
  'Bắn trả trong <b>10</b> ô — xa hơn máy bắn đá (9), nên không còn bị phá miễn phí từ ngoài tầm với. Sức đánh <b>leo theo thời đại</b>: chỉ <b>60%</b> ở Đồ Đá rồi +10% mỗi bậc, về đúng <b>100%</b> ở Thiên Triều — nên một cái tháp không còn tự mình quyết định được trận đánh đầu tiên của kỷ nguyên, thứ đáng xem nhất. <b>Giá đi theo đúng đường cong ấy</b>: 60% sức đánh thì 60% giá, và cùng leo lên 100%. Rẻ lúc còn yếu, đắt dần khi mạnh lên — không mua rẻ được thứ mạnh, cũng không phải trả đủ cho thứ chưa mạnh. Một mảng số nuôi cả hai, nên chúng không thể lệch nhau. Xây chồng thì hai hệ số <b>nhân</b> nhau (bậc thời đại × 1,7 mỗi tầng), nên một cái tháp ba tầng thời Thiên Triều là công trình đắt nhất bảng. Cũng là <b>điều kiện lên đời</b>, và hạn ngạch đã <b>gấp đôi</b>: cần <b>4</b> tháp để lên Đồ Sắt, <b>8</b> cho Hoàng Kim, <b>14</b> cho Thiên Triều. Đơn giá đá hạ 45 → 23 để tổng lượng đá cho cả hạn ngạch không đổi — tháp là vòi tiêu đá chính, mà đá cũng gác cửa lên đời, nên nhân đôi cả hai là xiết một cái cổ đã nghẹn. Từ bản này còn <b>xây chồng được</b>: đặt một cái tháp lên chính cái tháp cũ, tối đa <b>3 tầng</b>, mỗi tầng ×<b>1,5</b> cả <b>máu · tầm bắn · sức đánh</b> — tầng 3 bắn xa <b>22,5</b> ô và cao gấp đôi trên bản đồ. Giá leo ×1,7 mỗi tầng nên xây chồng luôn <b>lỗ</b> nếu tính bằng sức mạnh trên mỗi đồng: cái nó mua là <b>sự tập trung</b>. Suốt lúc lên tầng thì tháp <b>ngừng bắn</b> và không tính vào hạn ngạch lên đời.':
    'Shoots back within <b>10</b> cells — further than a catapult (9), so it can no longer be dismantled for free from out of reach. Its attack <b>climbs with the age</b>: only <b>60%</b> in the Stone Age, +10% per tier, reaching exactly <b>100%</b> in the Celestial Age — so a single tower can no longer decide an era’s first battle, the most watchable thing in the game. <b>The price follows that same curve</b>: 60% attack means 60% cost, both climbing to 100%. Cheap while weak, dearer as it strengthens — you cannot buy strength cheaply, nor overpay for something not yet strong. One array feeds both, so they cannot drift apart. Stacking makes the two factors <b>multiply</b> (age tier × 1.7 per storey), so a three-storey tower in the Celestial Age is the most expensive structure on the board. It is also an <b>age requirement</b>, and the quota has <b>doubled</b>: <b>4</b> towers for the Iron Age, <b>8</b> for the Golden, <b>14</b> for the Celestial. The stone unit price dropped 45 → 23 so the total stone for the whole quota is unchanged — towers are the main stone sink, and stone also gates the ages, so doubling both would be tightening an already-choked throat. It can also be <b>stacked</b>: place a tower on top of the old one, up to <b>3 storeys</b>, each multiplying <b>health · range · attack</b> by <b>1.5</b> — a third storey shoots <b>22.5</b> cells and stands twice as tall on the map. Cost climbs ×1.7 per storey, so stacking is always a <b>loss</b> measured as power per coin: what it buys is <b>concentration</b>. While a storey is going up the tower <b>stops firing</b> and does not count toward the age quota.',
  'Mở nhánh tầm xa: cung thủ, rồi máy bắn đá. Một bộ lạc không xây nó thì vĩnh viễn chỉ có bộ binh.':
    'Opens the ranged branch: archers, then catapults. A tribe that never builds one has infantry and nothing else, forever.',
  'Mở nhánh kỵ binh. Cùng khuôn với xưởng thợ nhưng đọc gen KHÁC — nên cây công nghệ tách đôi theo hai hướng độc lập.':
    'Opens the cavalry branch. Built to the same template as the workshop but read by a DIFFERENT gene — so the tech tree forks into two independent directions.',
  'Vừa là bệnh viện hậu phương (hồi máu cho quân đứng quanh, chỉ khi sạch địch), vừa là lò ra <b>Thầy lang</b>. Phá được nó là cắt cả hai.':
    'Both a rear hospital (healing troops standing nearby, but only when the area is clear of enemies) and the source of <b>Medics</b>. Destroy it and you cut off both.',
  'Tín ngưỡng dân gian — rẻ, nhỏ, có ngay từ Đồ Đá. Sinh Đức Tin cho Chúa Tể. Từ Phase 3.33 nó còn là <b>lò ra Đội hậu cần</b> và là nhà chủ quản của nhánh <b>Quân nhu</b>: cái cổng rẻ nhất trong cả bảng, và cố tình thế — cơ chế quân lương chạy từ tick đầu tiên, nên cách chữa nó không được phép khoá sau nửa cây công nghệ.':
    'Folk worship — cheap, small, available from the Stone Age. Generates Faith for the Overlord. It is also the source of <b>Quartermasters</b> and the host of the <b>Logistics</b> branch: the cheapest gate on the whole board, and deliberately so — the supply mechanic runs from the first tick, so its remedy must not sit behind half a tech tree.',
  'Không do dân xây, không có móng, không cần thợ: một <b>Đội hậu cần</b> cắm nó xuống trong <b>một tick</b> giữa đất địch, và nó <b>tự nhổ</b> sau khi hết hạn. Đó là cả thiết kế — bỏ hạn dùng thì sau ba trận đánh cả bản đồ rải trại và cơ chế quân lương tắt ngóm. Mềm nhất bản đồ (130 máu, không giáp), nên phá nó là cắt đường tiếp tế của cả một chiến dịch.':
    'Not built by villagers, no foundation, no workers: a <b>Quartermaster</b> pitches it in <b>one tick</b> in enemy ground, and it <b>strikes itself</b> once it expires. That expiry is the whole design — remove it and after three battles the map is carpeted in camps and the supply mechanic is switched off. The softest thing on the map (130 health, no armour), so destroying it severs a whole campaign’s supply line.',
  'Quốc giáo. Tính bằng hai nhà cầu nguyện khi đếm nhịp dâng tế, và là nơi <b>cất thánh vật</b> để truyền cho anh hùng đời sau.':
    'The state religion. Counts as two shrines when timing offerings, and is where <b>relics are kept</b> to pass to the next generation of heroes.',
  'Đường thắng thứ hai của cả trò chơi: xây xong rồi <b>giữ</b> được nó đứng là thắng ngay, bất kể quân đội ai mạnh hơn. Nhưng tài nguyên <b>không đủ để được xây</b>: phải tới <b>Thiên Triều</b>, phải <b>san phẳng kinh đô của một bộ lạc khác</b> trước đã (Thiên mệnh), và cả bản đồ <b>chỉ được có một Kỳ quan</b> — ai đặt móng trước thì ba bên kia muốn xây phải phá cái đó xuống. Giá <b>gấp đôi</b> và thời gian dựng <b>gấp ba</b> (2.460 tick) là để có một thứ trước đây chưa từng tồn tại: một <b>cửa sổ</b>. Đo bản cũ, từ móng tới khánh thành chỉ <b>110-125 tick</b> — mười giây thật, ngắn hơn quãng đường đạo quân gần nhất đi tới đó. Và <b>ngay từ tick đặt móng</b>, cả bàn cờ đã biết: ba bộ lạc kia bỏ mọi mâu thuẫn để kéo tới công trường, còn chủ nhân thì triệu hồi toàn quân về giữ. Khởi công là một <b>lời tuyên bố</b>, không phải một bí mật.':
    'The game’s second path to victory: finish it, <b>hold</b> it standing, and you win outright no matter whose army is stronger. But resources are <b>not enough to be allowed to build it</b>: you must reach the <b>Celestial Age</b>, you must have <b>razed another tribe’s capital</b> first (the Mandate), and the whole map <b>may hold only one Wonder</b> — whoever lays a foundation first forces the other three to tear it down before they can build. The <b>doubled</b> cost and <b>tripled</b> build time (2,460 ticks) exist to create something that never existed before: a <b>window</b>. Measured on the old version, foundation to consecration took just <b>110–125 ticks</b> — ten real seconds, shorter than the march of the nearest army. And <b>from the tick the foundation is laid</b>, the whole board knows: the other three tribes drop every quarrel to converge on the site, while the owner recalls its entire army to defend. Breaking ground is a <b>declaration</b>, not a secret.',

  // --- Tờ anh hùng ---
  'Anh hùng là <b>vòng tiến hoá thứ hai</b>, lồng bên trong vòng tiến hoá của bộ lạc. Gen bộ lạc được chọn lọc qua từng <b>kỷ nguyên</b>; gen anh hùng chạy trọn một vòng <b>bên trong một kỷ nguyên</b> — người kế nhiệm luôn đột biến từ tổ tiên có điểm cao nhất, không phải từ người vừa chết. Vì thế anh hùng <b>chết già</b> là cơ chế, không phải hình phạt: chính cái chết là thứ khiến vòng tiến hoá kia quay.':
    'Heroes are the <b>second evolutionary loop</b>, nested inside the tribe’s. Tribal genes are selected once per <b>era</b>; hero genes run a whole cycle <b>within a single era</b> — the successor always mutates from the highest-scoring ancestor, not from whoever just died. That is why heroes <b>dying of old age</b> is a mechanism, not a punishment: death is precisely what keeps that loop turning.',
  'Năm gen của cá thể': 'The five individual genes',
  'khởi tạo {a}–{b} · giới hạn {c}–{d}': 'seeded {a}–{b} · bounds {c}–{d}',
  'Ngưỡng dám giao chiến khi đang ở thế yếu. Cao thì chết sớm nhưng để lại chiến công; thấp thì sống lâu mà không làm gì.':
    'The threshold for engaging while at a disadvantage. High dies early but leaves a record of conquests; low lives long and does nothing.',
  'Hào quang buff lính quanh mình <b>đổi lấy</b> sức đánh của chính mình. Một ông tướng hay một chiến binh — không thể cả hai.':
    'An aura buffing nearby troops <b>traded against</b> the hero’s own attack. A general or a warrior — never both.',
  'Thích công thành <b>đổi lấy</b> thích săn người. Quyết định anh hùng đi về phía nhà cửa hay về phía đám đông.':
    'A taste for sieges <b>traded against</b> a taste for hunting people. It decides whether the hero heads for the buildings or for the crowd.',
  'Máu dày <b>đổi lấy</b> nhanh nhẹn và đấm mạnh.': 'Thick health <b>traded against</b> agility and a harder punch.',
  'Chịu đi vòng bao xa để nhặt vật phẩm, và có dám bỏ đội hình đi săn quái không. Đánh đổi thuần tình huống.':
    'How far the hero will detour to pick up an item, and whether it dares leave formation to hunt monsters. A purely situational trade-off.',
  'Vật phẩm — nhặt trên xác quái và trong hang': 'Items — taken from monster corpses and lairs',
  'vật phẩm — chỉ anh hùng nhặt được': 'item — only a hero can pick it up',
  'đánh +<b>{n}</b>': 'attack +<b>{n}</b>',
  'máu +<b>{n}</b>': 'health +<b>{n}</b>',
  'tốc +<b>{n}</b>': 'speed +<b>{n}</b>',
  'bán kính hào quang +<b>{n}</b>': 'aura radius +<b>{n}</b>',
  'hào quang +<b>{n}%</b>': 'aura +<b>{n}%</b>',
  'cấp <b>{tier}</b> = ×<b>{mult}</b>': 'tier <b>{tier}</b> = ×<b>{mult}</b>',
  'Vật phẩm truyền lại hay không là do <b>CÁCH CHẾT</b> quyết định, không phải do loại đồ: <b>chết già</b> thì cả hòm vào kho <b>gia bảo</b> và người kế nhiệm nhận <b>trọn bộ</b>; <b>tử trận</b> thì <b>mất một nửa</b> — số ấy rơi vãi ngay chỗ ngã xuống cho bên nào tới trước nhặt, nửa còn lại vẫn về kho. Nên một dòng dõi biết lượng sức càng đánh càng giàu đồ, còn một dòng dõi hung hăng thì đời nào cũng phải gây dựng lại. Nhặt trúng đồ trùng thì hai món <b>hợp nhất</b> lên cấp, và đường cong cố ý vượt phép cộng: {levels}. Hòm chứa tối đa <b>{max}</b> món.':
    'Whether items are passed on is decided by <b>HOW THE HERO DIES</b>, not by the type of item: <b>old age</b> sends the whole chest into the <b>heirloom</b> vault and the successor receives <b>all of it</b>; <b>falling in battle</b> <b>loses half</b> — that half scatters where the hero fell for whoever arrives first, while the rest still reaches the vault. So a bloodline that knows its limits grows richer in gear with every fight, while a reckless one starts again every generation. Picking up a duplicate <b>fuses</b> the two into a higher tier, and the curve deliberately beats simple addition: {levels}. The chest holds at most <b>{max}</b> items.',
  'Luật của dòng dõi': 'Rules of the bloodline',
  'Một người một lúc': 'One at a time',
  'tuổi thọ <b>{n}</b> tick': 'lifespan <b>{n}</b> ticks',
  'hồi máu trên đất nhà <b>{n}</b>/tick': 'heals on home soil <b>{n}</b>/tick',
  'nuôi <b>{n}</b> lương/tick': 'upkeep <b>{n}</b> food/tick',
  'Mỗi bộ lạc nhiều nhất một anh hùng còn sống. Chết rồi thì trại lính chiêu mộ đời tiếp theo sau một quãng nghỉ.':
    'At most one living hero per tribe. Once one dies, the barracks recruits the next generation after a pause.',

  // --- Tờ nâng cấp ---
  'Mỗi nhánh gắn với <b>đúng một công trình</b>, và phá công trình đó giữa chừng là bộ lạc <b>mất trắng</b> nhánh đang nghiên cứu dở. Chỉ nghiên cứu được <b>một nhánh mỗi lúc</b> — nên bảng này không phải một danh sách để mua hết, nó là một <b>thứ tự</b>. Con số trên mỗi thẻ là mức <b>cộng dồn tới cấp trần của chính nhánh đó</b> và giá của <b>tất cả các cấp</b> (giá leo ×{steps} theo cấp). Gần hết là <b>ba cấp</b>; <b>{volley}</b> chỉ có <b>một</b>, và giá ba cấp đã gộp vào cấp ấy. Nâng cấp <b>cộng</b> chứ không nhân, nên nó có lợi tương đối nhiều nhất cho loại quân <b>rẻ nhất</b> — trừ <b>{masonry}</b>, vì máu công trình trải từ 150 tới 2.600, và trừ <b>{volley}</b>, nhánh duy nhất bán một nhân tử thật.':
    'Each branch is tied to <b>exactly one building</b>, and destroying that building mid-research makes the tribe <b>lose everything</b> invested in it. Only <b>one branch at a time</b> can be researched — so this table is not a shopping list, it is an <b>order</b>. The numbers on each card are the <b>cumulative total at that branch’s own cap</b> and the cost of <b>every level</b> (price climbs ×{steps} per level). Nearly all have <b>three levels</b>; <b>{volley}</b> has only <b>one</b>, with the price of three folded into it. Upgrades <b>add</b> rather than multiply, so they are relatively most valuable to the <b>cheapest</b> unit — except <b>{masonry}</b>, because building health ranges from 150 to 2,600, and except <b>{volley}</b>, the one branch that really does sell a multiplier.',
  '{n} cấp': '{n} levels',
  '1 cấp': '1 level',
  'áp cho <b>{scope}</b>': 'applies to <b>{scope}</b>',
  'trọn {lv} cấp: {cost}': 'all {lv} levels: {cost}',
  'cấp duy nhất: {cost}': 'its single level: {cost}',
  'bắn <b>{n}</b> mũi cùng lúc, mỗi mũi một mục tiêu': 'fires <b>{n}</b> arrows at once, one target each',
  'sát thương tháp +<b>{n}%</b>': 'tower damage +<b>{n}%</b>',
  'máu tháp +<b>{n}%</b>': 'tower health +<b>{n}%</b>',
  'Nhánh <b>một cấp duy nhất</b> của cả bảng, và <b>đắt nhất</b> — vì thứ nó bán là một <b>nhân tử</b>, không phải một số cộng: mũi tên thứ hai nhân đôi sản lượng của <b>mọi</b> tháp đang đứng, cùng một lúc, kể cả tháp xây từ Đồ Đá. Hai mũi bắn vào <b>hai mục tiêu khác nhau</b> chứ không dồn vào một, nên nó mạnh nhất đúng lúc đáng mạnh nhất: khi cả một đạo quân đang trèo tường. Cho nó ba cấp thì cấp 3 hoá ra bốn mũi tên và cơ chế công thành ngừng tồn tại — nên cái giá của ba cấp đã được <b>gộp vào một</b>. Muốn mua thì phải có <b>đá</b>, mà đá thì đã đi vào tường và tháp hết rồi: đây là chỗ gen <b>{fortify}</b> phải trả lời câu hỏi khó nhất của nó.':
    'The only <b>single-level</b> branch on the table, and the <b>priciest</b> — because what it sells is a <b>multiplier</b>, not an addend: the second arrow doubles the output of <b>every</b> tower standing, all at once, including ones raised back in the Stone Age. The two arrows go to <b>two different targets</b> rather than stacking on one, so it is strongest exactly when it should be: when a whole army is at the wall. Give it three levels and level 3 becomes four arrows, at which point siege warfare stops existing — so the price of three levels has been <b>folded into one</b>. Buying it takes <b>stone</b>, and stone has already gone into walls and towers: this is where the <b>{fortify}</b> gene has to answer its hardest question.',
  '<b>{n}</b> tick nghiên cứu': '<b>{n}</b> ticks of research',
  'đánh +<b>{n}</b>': 'attack +<b>{n}</b>',
  'giáp +<b>{n}</b>': 'armour +<b>{n}</b>',
  'máu công trình +<b>{n}%</b>': 'building health +<b>{n}%</b>',
  'chữa +<b>{n}</b>/tick': 'healing +<b>{n}</b>/tick',
  'chữa <b>{n}</b> người một lúc': 'heals <b>{n}</b> at a time',
  '{what} +<b>{n}</b> ô': '{what} +<b>{n}</b> cells',
  'bán kính trại': 'camp radius',
  'tầm chữa': 'heal reach',
  'tiếp tế +<b>{n}</b>/tick': 'supply +<b>{n}</b>/tick',
  'nuôi <b>{n}</b> suất một lúc': 'feeds <b>{n}</b> slots at once',
  'lan +<b>{n}</b> ô': 'splash +<b>{n}</b> cells',
  'tầm +<b>{n}</b> ô': 'range +<b>{n}</b> cells',
  'to +<b>{n}%</b>': 'size +<b>{n}%</b>',
  'Nhánh rẻ nhất và cũng là nhánh chạm tới nhiều người nhất — bộ binh là loại quân đông nhất mọi chiến trường.':
    'The cheapest branch and the one that touches the most people — infantry is the most numerous unit on any battlefield.',
  'Trừ THẲNG vào mỗi cú chạm, nên nó có lợi tương đối nhất cho quân rẻ: một cú đòn 7 mất 3 giáp là mất gần một nửa.':
    'Subtracted STRAIGHT from every hit, so it is relatively most valuable to cheap units: a 7-damage blow losing 3 to armour loses nearly half.',
  'Chỉ có nghĩa nếu bộ lạc đã có Xưởng thợ — nên nó là nhánh đầu tiên trong bảng đứng sau một quyết định xây dựng.':
    'Only meaningful once the tribe has a Workshop — making it the first branch on the board that sits behind a construction decision.',
  'Đắt, và chỉ chạm tới hai loại quân. Đổi lại nó cộng vào đúng thứ đã mạnh sẵn — kỵ binh là quân đắt nhất bảng.':
    'Expensive, and it touches only two unit types. In exchange it adds to what is already strong — cavalry is the priciest unit on the board.',
  'Không cộng một điểm sát thương nào. Nó nhân số máu mà thầy lang vá lại được giữa trận — thứ duy nhất trong bảng làm quân đã ra lò <b>quay lại được</b>.':
    'Adds not one point of damage. It multiplies the health a medic can patch back mid-battle — the only thing on the board that lets already-trained troops <b>come back</b>.',
  'Sát thương lan, tầm bắn, và cả KÍCH THƯỚC của cỗ máy trên màn hình — nhánh duy nhất chảy từ bảng nâng cấp ra tới hình vẽ. <b>+14% mỗi cấp</b>: một cỗ máy bắn đá cấp 3 rộng <b>3,05 ô</b>, vượt cả voi chiến (2,6) để thành hình lớn nhất nhóm quân — chỗ mà một cỗ máy vừa ra lò <em>chưa</em> có. Mỗi cấp còn đóng thêm một dấu vào hình bóng để đọc được cấp mà không cần đứng cạnh cái khác: <b>I</b> vành sắt ở bánh xe + đai sắt bọc sàn · <b>II</b> mộc chắn che kíp vận hành · <b>III</b> cờ đuôi nheo dựng ở đuôi xe.':
    'Splash damage, range, and the machine’s SIZE on screen — the only branch that flows out of the upgrade table and into the artwork. <b>+14% per level</b>: a level-3 catapult is <b>3.05 cells</b> across, larger even than a war elephant (2.6) and the biggest shape in the army — something a freshly built machine does <em>not</em> have. Each level also stamps another mark on the silhouette so the level reads without a reference object: <b>I</b> iron rims on the wheels + iron banding on the deck · <b>II</b> mantlets shielding the crew · <b>III</b> a swallow-tail pennant at the tail.',
  'Nhánh duy nhất mua <b>BÁN KÍNH HOẠT ĐỘNG</b>. Tám nhánh kia trả lời "đơn vị này mạnh tới đâu"; nhánh này trả lời "đạo quân này <b>đi được bao xa</b>". Ba con số của nó đúng là ba chỗ mà một Trại tiếp tế bị nghẽn: hồi <b>{r0}</b> → <b>{r1}</b> quân lương/tick, nuôi <b>{s0}</b> → <b>{s1}</b> suất cùng lúc, bán kính <b>{d0}</b> → <b>{d1}</b> ô. <b>Tuổi thọ</b> cái trại thì KHÔNG nằm ở đây — nó leo theo <b>thời đại</b>. Hai nguồn tiến bộ tách hẳn, để đọc được cái nào vừa đổi: lên đời thì trại đứng lâu hơn, nghiên cứu thì trại nuôi được nhiều người hơn.':
    'The only branch that buys <b>OPERATING RADIUS</b>. The other eight answer "how strong is this unit"; this one answers "<b>how far can this army go</b>". Its three numbers are exactly the three places a Supply Camp bottlenecks: recovery <b>{r0}</b> → <b>{r1}</b> supply/tick, feeding <b>{s0}</b> → <b>{s1}</b> slots at once, radius <b>{d0}</b> → <b>{d1}</b> cells. The camp’s <b>lifespan</b> is NOT here — that climbs with the <b>age</b>. The two sources of progress are kept strictly apart so you can read which one just changed: advancing an age makes camps stand longer, research makes them feed more people.',
  'Nhánh duy nhất <b>không chạm tới một người nào</b>: nó cộng phần trăm máu cho <b>mọi công trình</b>, kể cả tháp canh. Cũng là nhánh duy nhất có ích cho bộ lạc <b>đang thua</b> — sáu nhánh quân sự đều nhân với số quân đang cầm, nên kẻ vừa mất quân được thưởng ít nhất. Ở Kinh đô nên nó <b>không đứng sau cửa nào</b>. <b>Tường thành đã rời khỏi nhánh này</b> ở Phase 3.30: tường lên bậc theo <b>thời đại</b>, không theo nghiên cứu — trộn hai đồng hồ vào một con số thì người xem nhìn tường dày lên mà không biết vì sao.':
    'The only branch that <b>touches no person at all</b>: it adds a percentage of health to <b>every building</b>, watchtowers included. It is also the only branch useful to a tribe that is <b>losing</b> — the six military branches all multiply by the number of troops you hold, so whoever just lost an army is rewarded least. It sits at the Town Centre, so it stands <b>behind no gate</b>. <b>City walls have left this branch</b>: walls tier up by <b>age</b>, not by research — mixing two clocks into one number leaves the viewer watching a wall thicken with no idea why.',

  // ==========================================================================
  // ĐƠN VỊ ĐO + MẨU RỜI
  // ==========================================================================
  '{n} ô': '{n} cells', '{n} ô/tick': '{n} cells/tick', '{n} tick': '{n} ticks',
  '{n} máu': '{n} health', '{n} mạng': '{n} kills', '{n} người': '{n} people',
  '{n} con': '{n} spawned', '+{n} ô': '+{n} cells',
  'bán kính {n} ô quanh kinh đô': 'radius {n} cells around the capital',
  '{rate} máu/tick': '{rate} health/tick',
  'đang trả {n} đá/ô': 'paying {n} stone per cell',
  'thiếu đá, còn {pct}%': 'short of stone, down to {pct}%',
  'sau {n} tick không bị đánh': 'after {n} ticks without being hit',
  'mỗi {n} tick': 'every {n} ticks',
  ' · lan {n} ô': ' · splash {n} cells',
  '· cách {n} ô': '· {n} cells away',
  'Rơi từ: {list}': 'Dropped by: {list}',
  'Chỉ số chưa nhân hệ số thời đại.': 'Stats shown without the age multiplier.',
  'Cấp {tier} — hợp nhất từ {n} món · chỉ số ×{mult}':
    'Tier {tier} — fused from {n} items · stats ×{mult}',
  'Hòm đầy mà nhặt thêm thì hai món cùng loại cùng cấp tự hợp nhất lên cấp trên.':
    'Pick up another with a full chest and two items of the same type and tier fuse into the next tier.',
  'Sát thương': 'Damage', 'Máu tối đa': 'Max health', 'Tốc độ đi': 'Move speed',
  'Tầm hào quang': 'Aura radius', 'Lực hào quang': 'Aura strength'

});
