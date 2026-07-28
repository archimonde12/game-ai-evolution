// ============================================================================
// TỪ ĐIỂN TIẾNG ANH — I18N.EN[câu tiếng Việt] = câu tiếng Anh
// ----------------------------------------------------------------------------
// Xem js/00-i18n.js để biết vì sao khoá là chính câu tiếng Việt.
//
// BA QUY TẮC KHI THÊM MỤC MỚI:
//
//  1. Chép NGUYÊN VĂN câu tiếng Việt làm khoá, kể cả biểu tượng và dấu cách.
//     Lệch một ký tự là câu đó lặng lẽ rơi về tiếng Việt. Gõ I18N.report()
//     trong console để xem những câu đã bị hỏi mà chưa có ở đây.
//
//  2. Chỗ giữ chỗ {ngoặc nhọn} phải còn ĐỦ ở bản tiếng Anh — thiếu một cái là
//     mất một con số trên màn hình. Thứ tự thì được phép đảo thoải mái; đó
//     chính là lý do dùng {tên} chứ không dùng %s.
//
//  3. KHÔNG thêm mục cho những chuỗi mang ý nghĩa mã. Bộ vá dữ liệu trong
//     00-i18n.js quyết định "có dịch hay không" bằng đúng một câu hỏi: câu này
//     có mặt trong từ điển không? Nên một mục thừa ở đây có thể lặng lẽ đổi một
//     giá trị mà mã đang so sánh. Ví dụ đang tránh: AGE_MAT[].name ('đồng',
//     'đá phiến'…) là tên vật liệu mái NỘI BỘ, không bao giờ hiện ra màn hình —
//     thêm chúng vào đây thì không được lợi gì mà lại mở đường cho lỗi đó.
//
// TÊN RIÊNG GIỮ NGUYÊN: bốn bộ lạc (Xích Long, Thanh Vân, Hoàng Kim, Tử Vi) và
// tên dòng dõi anh hùng (Lôi Vân, Bạch Hổ…) không có mặt trong từ điển. Chúng là
// danh từ riêng, và giữ nguyên còn né được một va chạm thật: 'Hoàng Kim' vừa là
// tên một bộ lạc vừa là tên thời đại 4. Thời đại được dịch qua mảng AGE.NAMES
// (khai báo tay), còn TRIBE_TEMPLATES thì nằm ngoài tầm quét — nên cùng một
// chuỗi mà chỉ một trong hai chỗ đổi.
// ============================================================================

Object.assign(I18N.EN, {

  // ==========================================================================
  // NHÃN DỮ LIỆU — vá thẳng vào CONFIG, mọi chỗ đọc giữ nguyên
  // ==========================================================================

  // --- Thời đại ---
  'Đồ Đá': 'Stone Age',
  'Đồ Đồng': 'Bronze Age',
  'Đồ Sắt': 'Iron Age',
  'Hoàng Kim': 'Golden Age',
  'Thiên Triều': 'Celestial Age',
  'Thời Đồ Đá': 'The Stone Age',

  // --- Tám nhánh nghiên cứu ---
  'Rèn binh khí': 'Weaponsmithing',
  'Binh khí': 'Weapons',
  'Bộ binh · Kỵ sĩ': 'Infantry · Knights',
  'Giáp trụ': 'Armoursmithing',
  'Giáp': 'Armour',
  'Toàn quân · kể cả Anh hùng': 'The whole army · Heroes included',
  'Cung nỏ': 'Archery',
  'Cung thủ · Máy bắn đá · Kỵ xạ': 'Archers · Catapults · Horse archers',
  'Mã thuật': 'Horsemanship',
  'Kỵ sĩ · Kỵ xạ': 'Knights · Horse archers',
  'Binh thư': 'War Manuals',
  'Chỉ Anh hùng': 'Heroes only',
  'Y thuật': 'Medicine',
  'Chỉ Thầy lang': 'Medics only',
  'Công thành': 'Siegecraft',
  'Máy bắn đá · Nỏ thần': 'Catapults · Ballistae',
  'Nề đá': 'Masonry',
  'Mọi công trình · Tháp canh · Tường thành': 'Every building · Watchtowers · City walls',
  'Quân nhu': 'Logistics',
  'Trại tiếp tế · Đội hậu cần': 'Supply camps · Quartermasters',
  'Nỏ liên châu': 'Repeating Crossbow',
  'Liên châu': 'Repeater',
  'Chỉ Tháp canh': 'Watchtowers only',

  // --- Quái vật ---
  'Sói': 'Wolf',
  'Nhện độc': 'Venom Spider',
  'Gấu': 'Bear',
  'Bóng ma': 'Phantom',
  'Quỷ đá': 'Stone Troll',
  'Nhớt Quỷ': 'Demon Ooze',
  'Rết Cát': 'Sand Centipede',
  'Mãng Xà': 'Great Serpent',
  'Thầy Mo': 'Witch Doctor',
  'Cổ Thụ Quái': 'Ancient Ent',
  'Chúa Hang': 'Lair Lord',
  'Thiên Ma': 'Heavenly Demon',
  'Quái vật': 'Monsters',

  // --- Ba bậc hang ổ ---
  'Hang ổ': 'Lair',
  'Sào huyệt': 'Warren',
  'Tổ Quỷ': 'Demon Nest',

  // --- Vật phẩm của anh hùng ---
  'Đại đao': 'Greatsword',
  'Lưỡi thép dài. Món thuần tấn công — hợp với anh hùng đã dày máu sẵn.':
    'A long steel blade. Pure offence — best on a hero who already has health to spare.',
  'Giáp sắt': 'Iron Armour',
  'Nhặt lên là hồi ngay đúng phần máu vừa thêm — kể cả khi đang thoi thóp.':
    'Picking it up immediately heals exactly the health it adds — even at death’s door.',
  'Giày gió': 'Windboots',
  'Không thêm một điểm sát thương nào, nhưng quyết định có kịp rút khỏi trận thua hay không.':
    'Adds not one point of damage, but decides whether you get out of a losing fight alive.',
  'Cờ lệnh': 'War Banner',
  'Buff QUÂN ĐỨNG QUANH chứ không buff người cầm. Vô dụng nếu anh hùng đánh lẻ.':
    'Buffs the TROOPS AROUND it, not the bearer. Worthless on a hero who fights alone.',
  'Thánh vật': 'Relic',
  'Món duy nhất mạnh cả ba mặt cùng lúc — đánh, máu và hào quang. Cũng là món đáng tiếc nhất khi một anh hùng tử trận.':
    'The only item strong on all three axes at once — attack, health and aura. Also the most painful thing to lose when a hero falls.',

  // --- Công trình ---
  'Nhà chính': 'Town Centre',
  'Nhà ở': 'House',
  'Ruộng': 'Farm',
  'Kho hàng': 'Depot',
  'Trại lính': 'Barracks',
  'Tướng phủ': 'Hero Hall',
  'Tháp canh': 'Watchtower',
  'Xưởng thợ': 'Workshop',
  'Chuồng ngựa': 'Stable',
  'Nhà y tế': 'Infirmary',
  'Nhà cầu nguyện': 'Shrine',
  'Trại tiếp tế': 'Supply Camp',
  'Đền thờ': 'Temple',
  'Kỳ quan': 'Wonder',

  // --- Năm bậc tường thành ---
  'Rào gỗ': 'Palisade',
  'Tường đất': 'Earthen Rampart',
  'Tường đá': 'Stone Wall',
  'Thành gạch': 'Brick Bastion',
  'Thành men ngọc': 'Celadon Bastion',

  // --- Bốn bậc sức mạnh của Thiên Ma ---
  'Sơ Giáng': 'First Descent',
  'Cuồng Nộ': 'Wrath',
  'Huỷ Diệt': 'Annihilation',
  'Tận Thế': 'Apocalypse',

  // --- Lời khẩn cầu ---
  'Xin ban mưa': 'Pray for Rain',
  'kho lương đang cạn': 'granary running dry',
  'Xin che chở': 'Pray for Shelter',
  'đang bị vây đánh': 'under siege at home',
  'Xin ban sức mạnh': 'Pray for Strength',
  'đang lâm trận sinh tử': 'in a fight to the death',
  'Xin ban trí tuệ': 'Pray for Wisdom',
  'muốn tiến lên thời đại mới': 'reaching for the next age',
  'phước lành': 'a blessing',

  // --- Sáu quyền năng ---
  '⚡ Sét Trời': '⚡ Heaven’s Bolt',
  'Sét Trời': 'Heaven’s Bolt',
  '🌧 Mưa Lành': '🌧 Blessed Rain',
  'Mưa Lành': 'Blessed Rain',
  '🌲 Rừng Mọc': '🌲 Forest Growth',
  'Rừng Mọc': 'Forest Growth',
  '✨ Ban Phước': '✨ Bestow Blessing',
  'Ban Phước': 'Bestow Blessing',
  '☠ Dịch Bệnh': '☠ Plague',
  'Dịch Bệnh': 'Plague',
  '🐉 Thiên Ma': '🐉 Heavenly Demon',

  // --- Tên đơn vị (UNIT_LABEL) ---
  'Dân thường': 'Villager',
  'Lính': 'Soldier',
  'Cung thủ': 'Archer',
  'Máy bắn đá': 'Catapult',
  'Kỵ sĩ': 'Knight',
  'Kỵ xạ': 'Horse Archer',
  'Anh hùng': 'Hero',
  'Thầy lang': 'Medic',
  'Nỏ thần': 'Ballista',
  'Voi chiến': 'War Elephant',
  'Quân kỳ': 'Standard Bearer',
  'Đội hậu cần': 'Quartermaster',

  // --- Tài nguyên (RES_LABEL) ---
  'lương': 'food',
  'gỗ': 'wood',
  'vàng': 'gold',
  'đá': 'stone',

  // --- Gen chiến lược (GENE_LABELS) ---
  'ưu tiên lương': 'food priority',
  'ưu tiên gỗ': 'wood priority',
  'ưu tiên vàng': 'gold priority',
  'tỉ lệ lính': 'army ratio',
  'độ hiếu chiến': 'aggression',
  'bành trướng': 'expansion',
  'đệm chỗ ở': 'housing buffer',
  'số ruộng': 'farm target',
  'số tháp': 'tower target',
  'vội lên đời': 'age rush',
  'ưu tiên đá': 'stone priority',
  'quân tầm xa': 'ranged ratio',
  'khao khát Kỳ quan': 'wonder drive',
  'thành tâm': 'piety',
  'kỷ luật': 'discipline',
  'quy hoạch': 'city planning',
  'số lò quân': 'garrison',
  'đường cái': 'roads',
  'lập đô': 'colonise',
  'đầu tư tướng': 'hero investment',
  'phòng thủ': 'fortify',
  'viễn chinh': 'expedition',

  // --- Gen anh hùng (HERO_GENE_LABELS) ---
  'dũng cảm': 'braveness',
  'chỉ huy': 'command',
  'tham vọng': 'ambition',
  'lực lưỡng': 'vigour',
  'tham lam': 'greed',

  // --- Tờ Thư khố ---
  'Quân lính': 'Troops',
  'Công trình': 'Buildings',
  'Nâng cấp': 'Upgrades',
  'Anh hùng & Thánh vật': 'Heroes & Relics',

  // ==========================================================================
  // TRANG BÌA
  // ==========================================================================
  'Chúa Tể — Civilization Sim (máy tự chơi)': 'Overlord — Civilization Sim (self-playing)',
  '‹ Trở lại ván đang chơi': '‹ Back to the game in progress',
  'Biên niên sử của một vị Chúa Tể': 'Chronicle of an Overlord',
  'Chúa Tể': 'Overlord',
  'menu.sub': 'You command no one — you sit and watch a world run itself and evolve era by era. Pick a <b>scenario</b> to begin.',
  'Chinh phạt': 'Conquest',
  'Bốn bộ lạc tranh thiên hạ': 'Four tribes contend for the world',
  'menu.conquest.desc': 'Xích Long, Thanh Vân, Hoàng Kim and Tử Vi fight until one capital is left standing — or a Wonder is consecrated. Era by era, selection drags tribal genes towards aggression.',
  'Vào thế cuộc →': 'Enter scenario →',
  'Thủ thành': 'Siege Defence',
  'Cùng sống sót trước sóng quái': 'Survive the monster waves together',
  'menu.defend.desc': 'The four tribes stop fighting each other and face waves of monsters that grow steadily fiercer. Score is the number of ticks survived. The same genome, a completely different environment — aggression drifts instead of being selected.',
  '📖 Thư khố — tra quái vật, quân lính, công trình, anh hùng':
    '📖 Codex — look up monsters, troops, buildings, heroes',
  'menu.foot': 'Open this file directly and it runs — no server needed. · <kbd>M</kbd> reopen the menu · <kbd>Space</kbd> pause',

  // ==========================================================================
  // THƯ KHỐ
  // ==========================================================================
  'Sách tra của người chép sử': 'The chronicler’s reference book',
  'Thư khố': 'Codex',
  'Đóng (Esc)': 'Close (Esc)',

  // ==========================================================================
  // KHUNG HÌNH — chip, bảng điều khiển, dải đang chọn
  // ==========================================================================
  '📋 Bộ lạc': '📋 Tribes',
  '📜 Nhật ký': '📜 Log',
  '☰ Thế cuộc': '☰ Scenario',
  '↻ Kỷ mới': '↻ New era',
  'Tạm dừng': 'Pause',
  'Tiếp tục': 'Resume',
  '⛰ Toàn cảnh': '⛰ Panorama',
  '⛰ Thường': '⛰ Normal',
  '⛰ Gần': '⛰ Close',
  '⛰ Rất gần': '⛰ Very close',
  '🎬 Đạo diễn': '🎬 Director',
  '🎯 Bám quân': '🎯 Follow unit',
  '✥ Tự do': '✥ Free',
  'Tự sang kỷ': 'Auto next era',
  'Quay chậm': 'Slow-mo',
  'inspect.empty': '<b>Click</b> a unit, building or lair on the map to inspect it here · <b>F</b> to make the camera follow it',
  'Hướng dẫn &amp; luật chơi': 'Guide &amp; rules',

  'Click/kéo để camera nhảy tới khu vực đó': 'Click or drag to jump the camera to that area',
  'Hiện/ẩn bảng bộ lạc ngay trên khung hình': 'Show/hide the tribe board over the viewport',
  'Hiện/ẩn nhật ký biến cố ngay trên khung hình': 'Show/hide the event log over the viewport',
  'Chạy đúng MỘT tick rồi dừng lại': 'Run exactly ONE tick, then stop',
  'Bỏ kỷ nguyên đang chạy, gieo lại bản đồ và bắt đầu kỷ nguyên mới':
    'Abandon the running era, reseed the map and start a new one',
  'Tốc độ mô phỏng, đo bằng TICK MỖI GIÂY THẬT. 12 là nhịp xem thường, 600+ là tua để xem chọn lọc qua nhiều kỷ nguyên. Phím [ và ] để đổi nhanh.':
    'Simulation speed, measured in TICKS PER REAL SECOND. 12 is the normal watching pace; 600+ fast-forwards to watch selection work across many eras. Keys [ and ] to change quickly.',
  'Thu phóng khung nhìn. Phím Z và X.': 'Viewport zoom. Keys Z and X.',
  'Camera đạo diễn tự bám theo nơi đang có biến cố. Phím C.':
    'The director camera follows wherever something is happening. Key C.',
  'Trình đơn — đổi thế cuộc (Chinh phạt / Thủ thành). Phím M.':
    'Menu — change scenario (Conquest / Siege Defence). Key M.',
  'Hết kỷ nguyên thì tự gieo kỷ nguyên tiếp theo từ gen của bộ lạc thắng.':
    'When an era ends, automatically seed the next one from the winning tribe’s genes.',
  'Mỗi biến cố lớn (kinh đô thất thủ, Kỳ quan khánh thành, một bộ lạc diệt vong) hạ tốc độ xuống một nhịp trong hơn một giây.':
    'Every major event (a capital falling, a Wonder completed, a tribe wiped out) drops the speed one notch for a little over a second.',
  'Bỏ chọn': 'Deselect',

  'hotkeys': '<b>Hotkeys:</b> <kbd>Space</kbd> pause · <kbd>[</kbd> <kbd>]</kbd> slower/faster · <kbd>F</kbd> follow selection ·\n    <kbd>C</kbd> change camera · <kbd>Z</kbd> <kbd>X</kbd> zoom out/in · <kbd>WASD</kbd> pan · <kbd>Esc</kbd> cancel power ·\n    <kbd>1</kbd>…<kbd>5</kbd> switch right-column sheet · <kbd>B</kbd> open the Codex · <kbd>M</kbd> menu · <kbd>L</kbd> switch language',

  // ==========================================================================
  // CỘT DỮ LIỆU — năm tờ
  // ==========================================================================
  'Các tờ số liệu': 'Data sheets',
  // KHOÁ Ở ĐÂY LÀ BẢN ĐÃ GIẢI MÃ THỰC THỂ, không phải nguyên văn trong tệp HTML.
  // Tệp viết `title="… &amp; …"` nhưng bộ quét đọc bằng getAttribute(), thứ trả về
  // dấu & thật. Chép y nguyên chuỗi trong HTML vào đây thì mục từ điển không bao
  // giờ khớp — và nó hỏng IM LẶNG: cái tooltip đó chỉ hiện khi rê chuột đúng chỗ.
  // Khác hẳn `data-i18n`, nơi khoá đi qua innerHTML nên GIỮ NGUYÊN thực thể (xem
  // 'Hướng dẫn &amp; luật chơi' ngay trên).
  'Quyền năng & lời khẩn cầu — phím 1': 'Powers & prayers — key 1',
  'Thế giới, bảng bộ lạc, nâng cấp — phím 2': 'World, tribe board, upgrades — key 2',
  'Dòng dõi anh hùng — phím 3': 'Hero bloodline — key 3',
  'Nhật ký, biên niên sử, đồ thị — phím 4': 'Log, chronicle, charts — key 4',
  'Tham số chỉnh tay — phím 5': 'Manual parameters — key 5',

  'Đức Tin': 'Faith',
  'Bộ lạc': 'Tribes',
  'Biên niên': 'Chronicle',
  'Thời Đồ Đá': 'The Stone Age',

  // --- Tờ 1: Chúa Tể ---
  'Quyền năng chúa tể': 'Powers of the Overlord',
  'Chọn 1 quyền năng rồi click lên bản đồ. Bỏ chọn: bấm lại nút đó hoặc phím Esc.':
    'Pick a power, then click the map. To cancel: press the same button again, or Esc.',
  'god.auto': 'The Overlord acts <b style="color:var(--gold)">automatically</b> — answering prayers &amp; intervening at a threshold',
  'Ngưỡng Đức Tin để can thiệp': 'Faith threshold for intervening',
  'god.auto.priority': 'Priority: ① answer the <b>most devout</b> · ② send plague on the leader when it is &gt;2.2× ahead\n          · ③ save whoever is about to starve. Turning this on or off turns a whole <b>selection pressure</b> on the piety gene on or off.',
  'Lời khẩn cầu': 'Prayers',
  'prayer.hint': 'Tribes with a Temple make offerings and pray when in danger. Answer them and the effect is multiplied by their own <b>devotion</b>.',

  // --- Tờ 2: Bộ lạc ---
  'defend.record': 'ticks survived · record <span id="defendRecord" style="color:var(--bone-2)">0</span>',
  'Đợt hiện tại': 'Current wave',
  'Đợt sau còn': 'Next wave in',
  'Quái đang tràn': 'Monsters attacking',
  'Bộ lạc trụ được': 'Tribes holding',
  'defend.hint': 'The four tribes <strong>do not fight each other</strong> in this mode — what selection rewards across eras shifts from "winning fights" to "<strong>living long</strong>". Watch the gene chart on the <b>Chronicle</b> sheet to see which genes the new environment pulls up.\n        <br>Waves spawn from <strong>living lairs</strong>; destroy them all and monsters must start from the map edge — that does not stop the waves, but it buys a great deal of time.',
  'Thế giới': 'World',
  'Bộ lạc còn sống': 'Tribes alive',
  'Tổng dân': 'Total population',
  'stat.monsters': 'Monsters',
  'Hang ổ còn lại': 'Lairs remaining',
  'Bảng bộ lạc': 'Tribe board',
  'Bộ gen chiến lược': 'Strategy genome',
  'genome.hint': 'Genes only change at the <strong>turn of an era</strong>. The <span style="color:var(--gold)">▏</span> tick marks <strong>last era’s champion</strong>: distance from it is the <em>mutation step</em>, and how far the four bars spread is the <em>diversity</em> selection has to work with.',
  'Nâng cấp quân sự': 'Military upgrades',
  'upgrade.hint': 'Unlike an <strong>age</strong> (where only units trained AFTERWARDS get the new stats), an upgrade applies <strong style="color:var(--gold)">immediately to the whole living army</strong> — including soldiers standing in the middle of a battle.\n        Each tribe researches <strong>one branch at a time</strong>, and loses everything if the host building is razed mid-research.\n        Click a unit on the map to see its own <strong>attack/defence</strong> and what the upgrades contributed.',

  // --- Tờ 3: Anh hùng ---
  'Anh hùng — tiến hoá cấp cá thể': 'Heroes — evolution at the individual level',
  'hero.fitness': 'Each generation is cloned from the highest-scoring ancestor. Score by:',
  'Cá nhân — ai SỐNG LÂU nhất': 'Individual — who LIVES LONGEST',
  'Vì bộ lạc — ai lập nhiều CHIẾN CÔNG nhất': 'For the tribe — who RAZES the most',
  'gen "dũng cảm" qua các đời': 'the "braveness" gene across generations',
  'hero.hint': 'This is the <strong>fast</strong> evolutionary loop nested inside the slow one: a tribe’s policy is selected once per era, while the hero bloodline is selected every time a hero dies.\n        Leave it on <strong>Individual</strong> and watch the "braveness" line — what is good for one individual and what is good for the collective do not necessarily point the same way.',

  // --- Tờ 4: Biên niên ---
  'Nhật ký': 'Log',
  'Biên niên sử': 'Chronicle',
  'Chưa có kỷ nguyên nào khép lại. Nhà vô địch đầu tiên sẽ được ghi tên ở đây.':
    'No era has closed yet. The first champion will be named here.',
  'Dân số theo bộ lạc': 'Population by tribe',
  'dân số (cùng trục)': 'population (shared axis)',
  'tổng thức ăn tồn kho': 'total food in store',
  'Gen thắng cuộc qua các kỷ nguyên': 'Winning genes across eras',
  'genechart.hint': 'Each line = one strategy gene of the champion, normalised to 0–1. A line rising steadily across many eras = selection genuinely favours that gene in this world.',

  // --- Tờ 5: Tham số ---
  'Tham số (live)': 'Parameters (live)',
  'Độ dài kỷ nguyên (tick)': 'Era length (ticks)',
  'kỷ nguyên kết thúc khi chỉ còn 1 bộ lạc HOẶC chạm mốc này':
    'an era ends when only 1 tribe is left OR this mark is reached',
  'Mutation chiến lược': 'Strategy mutation',
  'độ lệch chuẩn khi "gen chiến lược" của bộ lạc thắng được nhân bản sang kỷ nguyên sau':
    'standard deviation when the winning tribe’s "strategy genes" are cloned into the next era',
  'Hệ số nuôi quân': 'Upkeep multiplier',
  'nhân với chi phí thức ăn/tick cho mỗi quân — cao thì đông dân là gánh nặng, thấp thì bùng nổ dân số vô hạn':
    'multiplies the food/tick cost of each soldier — high makes a big population a burden, low means unbounded growth',
  'Hệ số thu hoạch': 'Gather multiplier',
  'nhân với tốc độ thu hoạch của mọi dân thường': 'multiplies the gathering rate of every villager'

});
