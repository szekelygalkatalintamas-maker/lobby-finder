export type LfgUiLanguageId =
    | "en"
    | "pt"
    | "zh"
    | "ru"
    | "es"
    | "tr"
    | "uk"
    | "vi"
    | "it"
    | "fr"
    | "ar"
    | "ro"
    | "hu"
    | "pl"
    | "cs"
    | "de"
    | "hi"
    | "nl"
    | "ko"
    | "fil"
    | "th"
    | "id"
    | "ja"
    | "da";
export type LfgLanguageChoiceId = "any" | LfgUiLanguageId | "ta";

export type LfgLanguageOption = {
    id: LfgLanguageChoiceId;
    emoji: string;
    label: string;
    display: string;
};

export type LfgUiCopy = {
    startTitle: string;
    startBody: string;
    rulesTitle: string;
    rulesBody: string;
    createTitle: string;
    codeLabel: string;
    invalidCode: string;
    created: string;
    viewLobby: string;
    editHint: string;
    joinTitle: string;
    codeHeading: string;
    joinInstruction: string;
    joinDisclaimer: string;
    browseTitle: string;
    browseIntro: string;
    browseEmpty: string;
    browseFilter: string;
    openBoard: string;
    uiSaved: string;
};

export const LFG_LANGUAGE_OPTIONS: readonly LfgLanguageOption[] = [
    {id: "en", emoji: "🇬🇧", label: "English", display: "🇬🇧 English"},
    {id: "pt", emoji: "🇧🇷", label: "Português", display: "🇧🇷 Português"},
    {id: "zh", emoji: "🇨🇳", label: "中文", display: "🇨🇳 中文"},
    {id: "ru", emoji: "🇷🇺", label: "Русский", display: "🇷🇺 Русский"},
    {id: "es", emoji: "🇪🇸", label: "Español", display: "🇪🇸 Español"},
    {id: "tr", emoji: "🇹🇷", label: "Türkçe", display: "🇹🇷 Türkçe"},
    {id: "uk", emoji: "🇺🇦", label: "Українська", display: "🇺🇦 Українська"},
    {id: "vi", emoji: "🇻🇳", label: "Tiếng Việt", display: "🇻🇳 Tiếng Việt"},
    {id: "it", emoji: "🇮🇹", label: "Italiano", display: "🇮🇹 Italiano"},
    {id: "fr", emoji: "🇫🇷", label: "Français", display: "🇫🇷 Français"},
    {id: "ar", emoji: "🇸🇦", label: "العربية", display: "🇸🇦 العربية"},
    {id: "ro", emoji: "🇷🇴", label: "Română", display: "🇷🇴 Română"},
    {id: "hu", emoji: "🇭🇺", label: "Magyar", display: "🇭🇺 Magyar"},
    {id: "pl", emoji: "🇵🇱", label: "Polski", display: "🇵🇱 Polski"},
    {id: "cs", emoji: "🇨🇿", label: "Čeština", display: "🇨🇿 Čeština"},
    {id: "de", emoji: "🇩🇪", label: "Deutsch", display: "🇩🇪 Deutsch"},
    {id: "hi", emoji: "🇮🇳", label: "हिन्दी", display: "🇮🇳 हिन्दी"},
    {id: "nl", emoji: "🇳🇱", label: "Nederlands", display: "🇳🇱 Nederlands"},
    {id: "ko", emoji: "🇰🇷", label: "한국어", display: "🇰🇷 한국어"},
    {id: "fil", emoji: "🇵🇭", label: "Filipino", display: "🇵🇭 Filipino"},
    {id: "th", emoji: "🇹🇭", label: "ไทย", display: "🇹🇭 ไทย"},
    {id: "id", emoji: "🇮🇩", label: "Bahasa Indonesia", display: "🇮🇩 Bahasa Indonesia"},
    {id: "ja", emoji: "🇯🇵", label: "日本語", display: "🇯🇵 日本語"},
    {id: "da", emoji: "🇩🇰", label: "Dansk", display: "🇩🇰 Dansk"},
    {id: "ta", emoji: "🇮🇳", label: "தமிழ் / Tamil", display: "🇮🇳 தமிழ் / Tamil"}
] as const;

// "Any" is a browse/filter state, not an actual lobby language. Keeping it
// separate lets the Edit Lobby dropdown use all 25 Discord option slots for
// real languages without removing any existing language when Tamil is added.
const LFG_ANY_LANGUAGE_OPTION: LfgLanguageOption = {
    id: "any",
    emoji: "🌐",
    label: "Any / Other",
    display: "🌐 Any / Other"
};

export const LFG_UI_COPY: Record<LfgUiLanguageId, LfgUiCopy> = {
    en: {
        startTitle: "🎮 {game} Looking for Group",
        startBody:
            "**Hosting?** Press **Create Lobby** and enter the {codeLength}-character in-game Lobby Code.\n\n**Looking for a team?** Press **Browse Lobbies**, filter by lobby language, then open a lobby card. Use **Reveal Code** for the code and **Discussion** to coordinate.\n\nKeep one active lobby at a time. Use **Manage** to update lobby details; submitting changes resets the {expiry}-minute activity timer. Use **Team Full** when ready or **Close** when the room is no longer active.",
        rulesTitle: "📜 {game} LFG Rules",
        rulesBody:
            "• Use only a **current {codeLength}-character in-game Lobby Code**.\n• One active LFG post per host.\n• Keep **#find-a-team** for lobby cards; use **Discussion** for chat.\n• Lobby cards expire after {expiry} minutes without an update; **Manage → Submit** resets the timer.\n• Expired and manually closed cards are removed after 15 seconds.\n• Use **Team Full** when ready or **Close** when the room is no longer active.\n• No fake, spam or misleading lobby posts.\n• Never share passwords, login codes, API keys or other sensitive information.\n• Normal {game} Discord rules still apply.",
        createTitle: "Create {game} Lobby",
        codeLabel: "{codeLength}-character {game} Lobby Code",
        invalidCode: "❌ Use {codeLength} characters: letters, numbers, underscores or hyphens. Case is preserved.",
        created: "✅ Lobby created successfully.",
        viewLobby: "View your lobby",
        editHint:
            "Use **Manage** on your lobby card to set players needed, language, game mode and notes. Submitting changes also resets the {expiry}-minute timer.",
        joinTitle: "🎮 {game} Lobby",
        codeHeading: "🔑 Lobby Code",
        joinInstruction:
            "Use this code in your game's join or invite menu. Check Discussion for the host's instructions.",
        joinDisclaimer: "The code was provided by the host; Lobby-Finder cannot verify whether the room is still live.",
        browseTitle: "🔎 Browse {game} Lobbies",
        browseIntro: "Choose a lobby language below. Only currently open LFG posts are shown.",
        browseEmpty: "No matching open lobbies were found right now.",
        browseFilter: "Lobby language",
        openBoard: "Open full lobby board",
        uiSaved: "🌐 Interface language selected."
    },
    pt: {
        startTitle: "🎮 {game} Procurar Grupo",
        startBody:
            "**Vai criar uma sala?** Pressione **Create Lobby** e informe o código de {codeLength} caracteres mostrado no jogo.\n\n**Procura uma equipe?** Pressione **Browse Lobbies**, filtre pelo idioma e abra um lobby. Use **Reveal Code** para ver o código e **Discussion** para combinar com o grupo.\n\nMantenha apenas um lobby ativo. Atualize somente enquanto a sala estiver ativa e feche quando terminar.",
        rulesTitle: "📜 Regras de LFG do {game}",
        rulesBody:
            "• Use apenas um **Lobby Code atual de {codeLength} caracteres**.\n• Um post LFG ativo por host.\n• Use **#find-a-team** apenas para lobbies; converse em **Discussion**.\n• Atualize apenas salas ativas e feche salas concluídas/cheias.\n• Sem posts falsos, spam ou informações enganosas.\n• Nunca compartilhe senhas, códigos de login, chaves de API ou dados sensíveis.\n• As regras normais do Discord {game} continuam valendo.",
        createTitle: "Criar lobby {game}",
        codeLabel: "Lobby Code de {codeLength} caracteres",
        invalidCode: "❌ Digite exatamente {codeLength} letras/números, por exemplo: `ABC123`.",
        created: "✅ Lobby criado com sucesso.",
        viewLobby: "Ver seu lobby",
        editHint: "Use **Manage** no cartão do lobby para definir jogadores necessários, idioma, modo de jogo e notas.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Código do lobby",
        joinInstruction:
            "Use este código no menu de entrada ou convite do jogo. Veja as instruções do anfitrião em Discussion.",
        joinDisclaimer:
            "O código foi informado pelo host; o Lobby-Finder não consegue verificar se a sala ainda está ativa.",
        browseTitle: "🔎 Lobbies {game}",
        browseIntro: "Escolha o idioma do lobby abaixo. Apenas lobbies LFG abertos são exibidos.",
        browseEmpty: "Nenhum lobby aberto correspondente foi encontrado agora.",
        browseFilter: "Idioma do lobby",
        openBoard: "Abrir lista completa",
        uiSaved: "🌐 Idioma da interface selecionado."
    },
    zh: {
        startTitle: "🎮 {game} 寻找队友",
        startBody:
            "**创建房间？** 点击 **Create Lobby**，输入游戏内显示的 {codeLength} 位 Lobby Code。\n\n**寻找队伍？** 点击 **Browse Lobbies**，按语言筛选并打开房间卡片。用 **Reveal Code** 查看代码，用 **Discussion** 与队友沟通。\n\n每位房主只保留一个活动房间。房间仍有效时才刷新，结束后请关闭。",
        rulesTitle: "📜 {game} LFG 规则",
        rulesBody:
            "• 只使用**当前有效的 {codeLength} 位游戏内 Lobby Code**。\n• 每位房主只能有一个活动 LFG 帖子。\n• **#find-a-team** 只用于房间卡片；聊天请使用 **Discussion**。\n• 只刷新仍有效的房间；满员或结束后关闭。\n• 禁止虚假、刷屏或误导性房间帖。\n• 不要分享密码、登录验证码、API 密钥或其他敏感信息。\n• {game} Discord 的正常规则仍然适用。",
        createTitle: "创建 {game} 房间",
        codeLabel: "{codeLength} 位 {game} Lobby Code",
        invalidCode: "❌ 请输入正好 {codeLength} 个字母/数字，例如：`ABC123`。",
        created: "✅ 房间创建成功。",
        viewLobby: "查看你的房间",
        editHint: "使用房间卡片上的 **Manage** 设置所需玩家人数、语言、游戏模式和备注。",
        joinTitle: "🎮 {game} 房间",
        codeHeading: "🔑 Lobby Code",
        joinInstruction: "在游戏的加入或邀请菜单中使用此代码。请在 Discussion 中查看房主的说明。",
        joinDisclaimer: "代码由房主提供；Lobby-Finder 无法确认房间是否仍然有效。",
        browseTitle: "🔎 浏览 {game} 房间",
        browseIntro: "在下方选择房间语言。这里只显示当前开放的 LFG 房间。",
        browseEmpty: "目前没有找到符合条件的开放房间。",
        browseFilter: "房间语言",
        openBoard: "打开完整房间列表",
        uiSaved: "🌐 已选择界面语言。"
    },
    ru: {
        startTitle: "🎮 {game} Поиск группы",
        startBody:
            "**Создаёте лобби?** Нажмите **Create Lobby** и введите {codeLength}-значный код лобби из игры.\n\n**Ищете команду?** Нажмите **Browse Lobbies**, выберите язык и откройте карточку лобби. **Reveal Code** покажет код, а **Discussion** используется для общения.\n\nДержите только одно активное лобби. Обновляйте его только пока комната активна и закройте после завершения.",
        rulesTitle: "📜 Правила {game} LFG",
        rulesBody:
            "• Используйте только **актуальный {codeLength}-значный игровой код лобби**.\n• Один активный LFG-пост на хоста.\n• **#find-a-team** только для карточек лобби; общение — в **Discussion**.\n• Обновляйте только активные комнаты и закрывайте завершённые/полные.\n• Запрещены фальшивые, спамные и вводящие в заблуждение посты.\n• Не публикуйте пароли, коды входа, API-ключи и другие конфиденциальные данные.\n• Обычные правила Discord {game} также действуют.",
        createTitle: "Создать лобби {game}",
        codeLabel: "{codeLength}-значный код лобби {game}",
        invalidCode: "❌ Введите ровно {codeLength} букв/цифр, например: `ABC123`.",
        created: "✅ Лобби успешно создано.",
        viewLobby: "Открыть своё лобби",
        editHint:
            "Используйте **Manage** на карточке лобби, чтобы указать нужное число игроков, язык, режим игры и заметки.",
        joinTitle: "🎮 Лобби {game}",
        codeHeading: "🔑 Код лобби",
        joinInstruction: "Введите код в меню входа или приглашений игры. Инструкции организатора — в Discussion.",
        joinDisclaimer: "Код предоставлен хостом; Lobby-Finder не может проверить, активно ли лобби.",
        browseTitle: "🔎 Лобби {game}",
        browseIntro: "Выберите язык лобби ниже. Показываются только открытые LFG-посты.",
        browseEmpty: "Подходящих открытых лобби сейчас нет.",
        browseFilter: "Язык лобби",
        openBoard: "Открыть полный список",
        uiSaved: "🌐 Язык интерфейса выбран."
    },
    es: {
        startTitle: "🎮 {game} Buscar grupo",
        startBody:
            "**¿Vas a crear una sala?** Pulsa **Create Lobby** e introduce el código de {codeLength} caracteres que aparece en el juego.\n\n**¿Buscas equipo?** Pulsa **Browse Lobbies**, filtra por idioma y abre una sala. Usa **Reveal Code** para ver el código y **Discussion** para coordinarte.\n\nMantén solo una sala activa. Actualízala únicamente mientras siga activa y ciérrala cuando termines.",
        rulesTitle: "📜 Reglas LFG de {game}",
        rulesBody:
            "• Usa solo un **Lobby Code actual de {codeLength} caracteres**.\n• Un post LFG activo por anfitrión.\n• **#find-a-team** es solo para salas; conversa en **Discussion**.\n• Actualiza solo salas activas y cierra las terminadas/llenas.\n• No se permiten salas falsas, spam ni información engañosa.\n• Nunca compartas contraseñas, códigos de acceso, claves API u otros datos sensibles.\n• Las reglas normales del Discord de {game} siguen aplicándose.",
        createTitle: "Crear lobby de {game}",
        codeLabel: "Lobby Code de {codeLength} caracteres",
        invalidCode: "❌ Introduce exactamente {codeLength} letras/números, por ejemplo: `ABC123`.",
        created: "✅ Lobby creado correctamente.",
        viewLobby: "Ver tu lobby",
        editHint:
            "Usa **Manage** en la tarjeta del lobby para configurar jugadores necesarios, idioma, modo de juego y notas.",
        joinTitle: "🎮 Lobby de {game}",
        codeHeading: "🔑 Código del lobby",
        joinInstruction:
            "Usa este código en el menú de unirse o invitaciones del juego. Consulta las instrucciones del anfitrión en Discussion.",
        joinDisclaimer:
            "El código lo proporcionó el anfitrión; Lobby-Finder no puede comprobar si la sala sigue activa.",
        browseTitle: "🔎 Lobbies de {game}",
        browseIntro: "Elige el idioma del lobby. Solo se muestran publicaciones LFG abiertas.",
        browseEmpty: "Ahora mismo no hay lobbies abiertos que coincidan.",
        browseFilter: "Idioma del lobby",
        openBoard: "Abrir lista completa",
        uiSaved: "🌐 Idioma de interfaz seleccionado."
    },
    tr: {
        startTitle: "🎮 {game} Takım Bul",
        startBody:
            "**Lobi mi kuruyorsun?** **Create Lobby** düğmesine bas ve oyunda görünen {codeLength} karakterli Lobby Code'u gir.\n\n**Takım mı arıyorsun?** **Browse Lobbies** düğmesine bas, dile göre filtrele ve bir lobi kartı aç. Kod için **Reveal Code**, konuşmak için **Discussion** kullan.\n\nAynı anda yalnızca bir aktif lobin olsun. Oda aktifken yenile ve bitince kapat.",
        rulesTitle: "📜 {game} LFG Kuralları",
        rulesBody:
            "• Yalnızca **güncel {codeLength} karakterli oyun içi Lobby Code** kullan.\n• Her host için bir aktif LFG gönderisi.\n• **#find-a-team** yalnızca lobi kartları içindir; sohbet için **Discussion** kullan.\n• Sadece aktif odaları yenile; dolu/biten odaları kapat.\n• Sahte, spam veya yanıltıcı lobi gönderileri yasaktır.\n• Şifre, giriş kodu, API anahtarı veya hassas bilgi paylaşma.\n• Normal {game} Discord kuralları da geçerlidir.",
        createTitle: "{game} Lobisi Oluştur",
        codeLabel: "{codeLength} karakterli {game} Lobby Code",
        invalidCode: "❌ Tam olarak {codeLength} harf/rakam gir, örnek: `ABC123`.",
        created: "✅ Lobi başarıyla oluşturuldu.",
        viewLobby: "Lobini görüntüle",
        editHint:
            "Gerekli oyuncu sayısını, dili, oyun modunu ve notları ayarlamak için lobi kartındaki **Manage** düğmesini kullan.",
        joinTitle: "🎮 {game} Lobisi",
        codeHeading: "🔑 Lobi Kodu",
        joinInstruction:
            "Bu kodu oyunun katılma veya davet menüsünde kullanın. Kurucunun talimatları için Discussion bölümüne bakın.",
        joinDisclaimer: "Kod host tarafından verilmiştir; Lobby-Finder odanın hâlâ açık olduğunu doğrulayamaz.",
        browseTitle: "🔎 {game} Lobileri",
        browseIntro: "Aşağıdan lobi dilini seç. Yalnızca açık LFG gönderileri gösterilir.",
        browseEmpty: "Şu anda eşleşen açık lobi bulunamadı.",
        browseFilter: "Lobi dili",
        openBoard: "Tüm lobi listesini aç",
        uiSaved: "🌐 Arayüz dili seçildi."
    },
    uk: {
        startTitle: "🎮 {game} Пошук групи",
        startBody:
            "**Створюєте лобі?** Натисніть **Create Lobby** і введіть {codeLength}-символьний код лобі з гри.\n\n**Шукаєте команду?** Натисніть **Browse Lobbies**, відфільтруйте за мовою та відкрийте картку. **Reveal Code** покаже код, а **Discussion** використовуйте для спілкування.\n\nМайте лише одне активне лобі. Оновлюйте його тільки поки кімната активна та закрийте після завершення.",
        rulesTitle: "📜 Правила {game} LFG",
        rulesBody:
            "• Використовуйте лише **актуальний {codeLength}-символьний ігровий Lobby Code**.\n• Одне активне LFG-повідомлення на хоста.\n• **#find-a-team** лише для карток лобі; спілкуйтесь у **Discussion**.\n• Оновлюйте лише активні кімнати та закривайте завершені/повні.\n• Без фейкових, спамних або оманливих постів.\n• Не публікуйте паролі, коди входу, API-ключі чи інші приватні дані.\n• Звичайні правила Discord {game} також діють.",
        createTitle: "Створити лобі {game}",
        codeLabel: "{codeLength}-символьний Lobby Code {game}",
        invalidCode: "❌ Введіть рівно {codeLength} літер/цифр, наприклад: `ABC123`.",
        created: "✅ Лобі успішно створено.",
        viewLobby: "Відкрити своє лобі",
        editHint:
            "Використайте **Manage** на картці лобі, щоб вказати потрібну кількість гравців, мову, режим гри та нотатки.",
        joinTitle: "🎮 Лобі {game}",
        codeHeading: "🔑 Код лобі",
        joinInstruction: "Введіть код у меню приєднання або запрошень гри. Інструкції організатора — у Discussion.",
        joinDisclaimer: "Код наданий хостом; Lobby-Finder не може перевірити, чи кімната ще активна.",
        browseTitle: "🔎 Лобі {game}",
        browseIntro: "Оберіть мову лобі нижче. Показуються лише відкриті LFG-пости.",
        browseEmpty: "Зараз немає відповідних відкритих лобі.",
        browseFilter: "Мова лобі",
        openBoard: "Відкрити повний список",
        uiSaved: "🌐 Мову інтерфейсу вибрано."
    },
    vi: {
        startTitle: "🎮 {game} Tìm đội",
        startBody:
            "**Tạo phòng?** Nhấn **Create Lobby** và nhập Lobby Code {codeLength} ký tự hiển thị trong game.\n\n**Tìm đội?** Nhấn **Browse Lobbies**, lọc theo ngôn ngữ rồi mở thẻ phòng. Dùng **Reveal Code** để xem mã và **Discussion** để trao đổi.\n\nChỉ giữ một phòng đang hoạt động. Chỉ làm mới khi phòng còn mở và đóng khi xong.",
        rulesTitle: "📜 Luật LFG {game}",
        rulesBody:
            "• Chỉ dùng **Lobby Code {codeLength} ký tự đang còn hiệu lực trong game**.\n• Mỗi host chỉ có một bài LFG đang hoạt động.\n• **#find-a-team** chỉ dành cho thẻ phòng; trò chuyện trong **Discussion**.\n• Chỉ làm mới phòng đang hoạt động; đóng phòng đã đủ/xong.\n• Không đăng phòng giả, spam hoặc thông tin gây hiểu nhầm.\n• Không chia sẻ mật khẩu, mã đăng nhập, API key hoặc dữ liệu nhạy cảm.\n• Luật Discord {game} thông thường vẫn áp dụng.",
        createTitle: "Tạo phòng {game}",
        codeLabel: "Lobby Code {game} {codeLength} ký tự",
        invalidCode: "❌ Nhập đúng {codeLength} chữ cái/số, ví dụ: `ABC123`.",
        created: "✅ Đã tạo lobby thành công.",
        viewLobby: "Xem lobby của bạn",
        editHint: "Dùng **Manage** trên thẻ lobby để đặt số người cần, ngôn ngữ, chế độ chơi và ghi chú.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Mã Lobby",
        joinInstruction:
            "Dùng mã này trong menu tham gia hoặc mời của trò chơi. Xem hướng dẫn của chủ phòng trong Discussion.",
        joinDisclaimer: "Mã do host cung cấp; Lobby-Finder không thể xác minh phòng còn hoạt động hay không.",
        browseTitle: "🔎 Lobby {game}",
        browseIntro: "Chọn ngôn ngữ lobby bên dưới. Chỉ hiển thị các bài LFG đang mở.",
        browseEmpty: "Hiện không có lobby mở phù hợp.",
        browseFilter: "Ngôn ngữ lobby",
        openBoard: "Mở danh sách đầy đủ",
        uiSaved: "🌐 Đã chọn ngôn ngữ giao diện."
    },
    it: {
        startTitle: "🎮 {game} Trova gruppo",
        startBody:
            "**Stai creando una lobby?** Premi **Create Lobby** e inserisci il Lobby Code di {codeLength} caratteri mostrato nel gioco.\n\n**Cerchi una squadra?** Premi **Browse Lobbies**, filtra per lingua e apri una lobby. Usa **Reveal Code** per il codice e **Discussion** per coordinarti.\n\nMantieni una sola lobby attiva. Aggiornala solo mentre è attiva e chiudila quando hai finito.",
        rulesTitle: "📜 Regole LFG di {game}",
        rulesBody:
            "• Usa solo un **Lobby Code attuale di {codeLength} caratteri**.\n• Una sola lobby LFG attiva per host.\n• **#find-a-team** è solo per le lobby; usa **Discussion** per chattare.\n• Aggiorna solo lobby attive e chiudi quelle finite/piene.\n• Niente lobby false, spam o informazioni ingannevoli.\n• Non condividere password, codici di accesso, chiavi API o dati sensibili.\n• Le normali regole Discord di {game} restano valide.",
        createTitle: "Crea lobby {game}",
        codeLabel: "Lobby Code {game} di {codeLength} caratteri",
        invalidCode: "❌ Inserisci esattamente {codeLength} lettere/numeri, ad esempio: `ABC123`.",
        created: "✅ Lobby creata con successo.",
        viewLobby: "Visualizza la tua lobby",
        editHint:
            "Usa **Manage** sulla scheda della lobby per impostare giocatori necessari, lingua, modalità di gioco e note.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Codice Lobby",
        joinInstruction:
            "Usa questo codice nel menu per unirti o invitare del gioco. Leggi le istruzioni dell'host in Discussion.",
        joinDisclaimer:
            "Il codice è fornito dall'host; Lobby-Finder non può verificare se la stanza sia ancora attiva.",
        browseTitle: "🔎 Lobby {game}",
        browseIntro: "Scegli la lingua della lobby. Sono mostrate solo le lobby LFG aperte.",
        browseEmpty: "Al momento non ci sono lobby aperte corrispondenti.",
        browseFilter: "Lingua lobby",
        openBoard: "Apri elenco completo",
        uiSaved: "🌐 Lingua dell'interfaccia selezionata."
    },
    fr: {
        startTitle: "🎮 {game} Recherche de groupe",
        startBody:
            "**Vous créez un salon ?** Appuyez sur **Create Lobby** et entrez le Lobby Code à {codeLength} caractères affiché dans le jeu.\n\n**Vous cherchez une équipe ?** Appuyez sur **Browse Lobbies**, filtrez par langue puis ouvrez une carte. Utilisez **Reveal Code** pour le code et **Discussion** pour vous organiser.\n\nGardez un seul lobby actif. Actualisez-le seulement tant qu'il est actif et fermez-le quand vous avez terminé.",
        rulesTitle: "📜 Règles LFG {game}",
        rulesBody:
            "• Utilisez uniquement un **Lobby Code actuel de {codeLength} caractères**.\n• Un seul post LFG actif par hôte.\n• **#find-a-team** sert aux cartes de lobby ; discutez dans **Discussion**.\n• Actualisez seulement les salons actifs et fermez ceux terminés/pleins.\n• Pas de faux salons, spam ou informations trompeuses.\n• Ne partagez jamais mots de passe, codes de connexion, clés API ou données sensibles.\n• Les règles normales du Discord {game} s'appliquent aussi.",
        createTitle: "Créer un lobby {game}",
        codeLabel: "Lobby Code {game} à {codeLength} caractères",
        invalidCode: "❌ Entrez exactement {codeLength} lettres/chiffres, par exemple : `ABC123`.",
        created: "✅ Lobby créé avec succès.",
        viewLobby: "Voir votre lobby",
        editHint:
            "Utilisez **Manage** sur la carte du lobby pour définir les joueurs recherchés, la langue, le mode de jeu et les notes.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Code du lobby",
        joinInstruction:
            "Utilisez ce code dans le menu pour rejoindre ou inviter du jeu. Consultez les instructions de l'hôte dans Discussion.",
        joinDisclaimer: "Le code vient de l'hôte ; Lobby-Finder ne peut pas vérifier si le salon est toujours actif.",
        browseTitle: "🔎 Lobbies {game}",
        browseIntro: "Choisissez la langue du lobby ci-dessous. Seuls les LFG ouverts sont affichés.",
        browseEmpty: "Aucun lobby ouvert correspondant pour le moment.",
        browseFilter: "Langue du lobby",
        openBoard: "Ouvrir la liste complète",
        uiSaved: "🌐 Langue de l'interface sélectionnée."
    },
    ar: {
        startTitle: "🎮 {game} البحث عن فريق",
        startBody:
            "**تستضيف لوبي؟** اضغط **Create Lobby** وأدخل رمز اللوبي المكوّن من {codeLength} أحرف/أرقام الظاهر داخل اللعبة.\n\n**تبحث عن فريق؟** اضغط **Browse Lobbies** واختر اللغة ثم افتح بطاقة اللوبي. استخدم **Reveal Code** لرؤية الرمز و **Discussion** للتنسيق.\n\nاحتفظ بلوبي نشط واحد فقط. حدّثه فقط أثناء نشاطه وأغلقه عند الانتهاء.",
        rulesTitle: "📜 قواعد LFG في {game}",
        rulesBody:
            "• استخدم فقط **رمز لوبي حالي من {codeLength} أحرف/أرقام**.\n• منشور LFG نشط واحد لكل مضيف.\n• قناة **#find-a-team** لبطاقات اللوبي فقط؛ استخدم **Discussion** للدردشة.\n• حدّث الغرف النشطة فقط وأغلق الغرف الممتلئة أو المنتهية.\n• ممنوع اللوبيات الوهمية أو السبام أو المعلومات المضللة.\n• لا تشارك كلمات المرور أو رموز الدخول أو مفاتيح API أو المعلومات الحساسة.\n• قواعد سيرفر {game} العادية ما زالت سارية.",
        createTitle: "إنشاء لوبي {game}",
        codeLabel: "رمز لوبي {game} من {codeLength} خانات",
        invalidCode: "❌ أدخل {codeLength} أحرف/أرقام بالضبط، مثال: `ABC123`.",
        created: "✅ تم إنشاء اللوبي بنجاح.",
        viewLobby: "عرض اللوبي الخاص بك",
        editHint: "استخدم **Manage** في بطاقة اللوبي لتحديد عدد اللاعبين المطلوبين واللغة ونمط اللعب والملاحظات.",
        joinTitle: "🎮 لوبي {game}",
        codeHeading: "🔑 رمز اللوبي",
        joinInstruction: "استخدم هذا الرمز في قائمة الانضمام أو الدعوات في اللعبة. راجع تعليمات المضيف في Discussion.",
        joinDisclaimer: "الرمز مقدم من المضيف؛ لا يستطيع Lobby-Finder التحقق من أن الغرفة ما زالت نشطة.",
        browseTitle: "🔎 لوبيات {game}",
        browseIntro: "اختر لغة اللوبي أدناه. تظهر فقط منشورات LFG المفتوحة.",
        browseEmpty: "لا توجد لوبيات مفتوحة مطابقة حاليًا.",
        browseFilter: "لغة اللوبي",
        openBoard: "فتح قائمة اللوبيات كاملة",
        uiSaved: "🌐 تم اختيار لغة الواجهة."
    },
    ro: {
        startTitle: "🎮 {game} Caută echipă",
        startBody:
            "**Găzduiești un lobby?** Apasă **Create Lobby** și introdu codul de {codeLength} caractere afișat în joc.\n\n**Cauți echipă?** Apasă **Browse Lobbies**, filtrează după limbă și deschide un lobby. Folosește **Reveal Code** pentru cod și **Discussion** pentru coordonare.\n\nPăstrează un singur lobby activ. Reîmprospătează-l doar cât timp este activ și închide-l când ai terminat.",
        rulesTitle: "📜 Reguli LFG {game}",
        rulesBody:
            "• Folosește doar un **Lobby Code actual de {codeLength} caractere**.\n• Un singur post LFG activ per gazdă.\n• **#find-a-team** este doar pentru lobby-uri; discută în **Discussion**.\n• Reîmprospătează doar lobby-urile active și închide-le pe cele terminate/pline.\n• Fără lobby-uri false, spam sau informații înșelătoare.\n• Nu distribui parole, coduri de autentificare, chei API sau date sensibile.\n• Regulile normale ale Discordului {game} se aplică în continuare.",
        createTitle: "Creează lobby {game}",
        codeLabel: "Lobby Code {game} de {codeLength} caractere",
        invalidCode: "❌ Introdu exact {codeLength} litere/cifre, de exemplu: `ABC123`.",
        created: "✅ Lobby creat cu succes.",
        viewLobby: "Vezi lobby-ul tău",
        editHint:
            "Folosește **Manage** pe cardul lobby-ului pentru a seta jucătorii necesari, limba, modul de joc și notele.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Cod lobby",
        joinInstruction:
            "Folosește codul în meniul de alăturare sau invitații al jocului. Vezi instrucțiunile gazdei în Discussion.",
        joinDisclaimer: "Codul este oferit de gazdă; Lobby-Finder nu poate verifica dacă lobby-ul mai este activ.",
        browseTitle: "🔎 Lobby-uri {game}",
        browseIntro: "Alege limba lobby-ului. Sunt afișate doar postările LFG deschise.",
        browseEmpty: "Nu există lobby-uri deschise potrivite acum.",
        browseFilter: "Limba lobby-ului",
        openBoard: "Deschide lista completă",
        uiSaved: "🌐 Limba interfeței a fost selectată."
    },
    hu: {
        startTitle: "🎮 {game} Csapatkereső",
        startBody:
            "**Lobbyt indítasz?** Nyomd meg a **Create Lobby** gombot, és add meg a játékban látható {codeLength} karakteres Lobby Code-ot.\n\n**Csapatot keresel?** Nyomd meg a **Browse Lobbies** gombot, szűrj nyelvre, majd nyisd meg a lobby kártyáját. A **Reveal Code** megmutatja a kódot, a **Discussion** pedig a megbeszéléshez való.\n\nEgyszerre csak egy aktív lobbyd legyen. Csak addig frissítsd, amíg a szoba él, és zárd le, amikor végeztetek.",
        rulesTitle: "📜 {game} LFG szabályok",
        rulesBody:
            "• Csak **aktuális, {codeLength} karakteres játékon belüli Lobby Code-ot** használj.\n• Hostként egyszerre egy aktív LFG posztod lehet.\n• A **#find-a-team** csak lobby kártyákhoz való; beszélgetéshez használd a **Discussion** szálat.\n• Csak aktív szobát frissíts, a betelt/befejezett lobbyt zárd le.\n• Tilos a kamu, spam vagy félrevezető lobby poszt.\n• Ne ossz meg jelszót, belépési kódot, API-kulcsot vagy más érzékeny adatot.\n• A {game} Discord normál szabályai itt is érvényesek.",
        createTitle: "{game} lobby létrehozása",
        codeLabel: "{codeLength} karakteres {game} Lobby Code",
        invalidCode: "❌ Pontosan {codeLength} betűt/számot adj meg, például: `ABC123`.",
        created: "✅ A lobby sikeresen létrejött.",
        viewLobby: "Lobby megnyitása",
        editHint:
            "A lobbykártyán az **Manage** gombbal állíthatod be a szükséges játékosokat, a nyelvet, a játékmódot és a megjegyzést.",
        joinTitle: "🎮 {game} lobby",
        codeHeading: "🔑 Lobby kód",
        joinInstruction:
            "Használd a kódot a játék csatlakozási vagy meghívási menüjében. A házigazda útmutatását a Discussion alatt találod.",
        joinDisclaimer: "A kódot a host adta meg; a Lobby-Finder nem tudja ellenőrizni, hogy a szoba még él-e.",
        browseTitle: "🔎 {game} lobbyk",
        browseIntro: "Válaszd ki a lobby nyelvét. Csak a jelenleg nyitott LFG posztok jelennek meg.",
        browseEmpty: "Jelenleg nincs a szűrésnek megfelelő nyitott lobby.",
        browseFilter: "Lobby nyelve",
        openBoard: "Teljes lobby lista megnyitása",
        uiSaved: "🌐 A felület nyelve kiválasztva."
    },
    pl: {
        startTitle: "🎮 {game} Szukanie grupy",
        startBody:
            "**Tworzysz lobby?** Naciśnij **Create Lobby** i wpisz {codeLength}-znakowy kod widoczny w grze.\n\n**Szukasz drużyny?** Naciśnij **Browse Lobbies**, wybierz język i otwórz kartę lobby. **Reveal Code** pokazuje kod, a **Discussion** służy do ustaleń.\n\nMiej tylko jedno aktywne lobby. Odświeżaj je wyłącznie gdy nadal działa i zamknij po zakończeniu.",
        rulesTitle: "📜 Zasady {game} LFG",
        rulesBody:
            "• Używaj tylko **aktualnego {codeLength}-znakowego kodu lobby z gry**.\n• Jeden aktywny post LFG na hosta.\n• **#find-a-team** jest tylko dla kart lobby; rozmawiaj w **Discussion**.\n• Odświeżaj tylko aktywne pokoje i zamykaj zakończone/pełne.\n• Zakaz fałszywych, spamowych lub mylących postów.\n• Nie udostępniaj haseł, kodów logowania, kluczy API ani danych wrażliwych.\n• Normalne zasady Discorda {game} nadal obowiązują.",
        createTitle: "Utwórz lobby {game}",
        codeLabel: "{codeLength}-znakowy kod lobby {game}",
        invalidCode: "❌ Wpisz dokładnie {codeLength} liter/cyfr, np. `ABC123`.",
        created: "✅ Lobby utworzone pomyślnie.",
        viewLobby: "Zobacz swoje lobby",
        editHint: "Użyj **Manage** na karcie lobby, aby ustawić liczbę potrzebnych graczy, język, tryb gry i notatki.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Kod lobby",
        joinInstruction:
            "Użyj kodu w menu dołączania lub zaproszeń w grze. Instrukcje gospodarza znajdziesz w Discussion.",
        joinDisclaimer: "Kod podał host; Lobby-Finder nie może sprawdzić, czy pokój nadal działa.",
        browseTitle: "🔎 Lobby {game}",
        browseIntro: "Wybierz język lobby. Pokazywane są tylko otwarte posty LFG.",
        browseEmpty: "Brak pasujących otwartych lobby.",
        browseFilter: "Język lobby",
        openBoard: "Otwórz pełną listę",
        uiSaved: "🌐 Wybrano język interfejsu."
    },
    cs: {
        startTitle: "🎮 {game} Hledání týmu",
        startBody:
            "**Zakládáš lobby?** Klikni na **Create Lobby** a zadej {codeLength}znakový kód zobrazený ve hře.\n\n**Hledáš tým?** Klikni na **Browse Lobbies**, filtruj podle jazyka a otevři kartu lobby. **Reveal Code** ukáže kód a **Discussion** slouží k domluvě.\n\nMěj pouze jedno aktivní lobby. Obnovuj ho jen dokud je místnost aktivní a po skončení ho zavři.",
        rulesTitle: "📜 Pravidla {game} LFG",
        rulesBody:
            "• Používej jen **aktuální {codeLength}znakový herní Lobby Code**.\n• Jeden aktivní LFG příspěvek na hostitele.\n• **#find-a-team** je pouze pro karty lobby; chatuj v **Discussion**.\n• Obnovuj jen aktivní místnosti a hotové/plné zavři.\n• Žádné falešné, spamové nebo zavádějící příspěvky.\n• Nesdílej hesla, přihlašovací kódy, API klíče ani citlivé údaje.\n• Běžná pravidla Discordu {game} stále platí.",
        createTitle: "Vytvořit lobby {game}",
        codeLabel: "{codeLength}znakový Lobby Code {game}",
        invalidCode: "❌ Zadej přesně {codeLength} písmen/číslic, např. `ABC123`.",
        created: "✅ Lobby bylo úspěšně vytvořeno.",
        viewLobby: "Zobrazit své lobby",
        editHint:
            "Použij **Manage** na kartě lobby pro nastavení počtu hledaných hráčů, jazyka, herního režimu a poznámek.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Kód lobby",
        joinInstruction:
            "Použij tento kód v nabídce připojení nebo pozvánek ve hře. Pokyny hostitele najdeš v Discussion.",
        joinDisclaimer: "Kód zadal hostitel; Lobby-Finder nemůže ověřit, zda je místnost stále aktivní.",
        browseTitle: "🔎 Lobby {game}",
        browseIntro: "Vyber jazyk lobby. Zobrazují se pouze otevřené LFG příspěvky.",
        browseEmpty: "Momentálně nebylo nalezeno žádné odpovídající otevřené lobby.",
        browseFilter: "Jazyk lobby",
        openBoard: "Otevřít celý seznam",
        uiSaved: "🌐 Jazyk rozhraní byl vybrán."
    },
    de: {
        startTitle: "🎮 {game} Gruppe finden",
        startBody:
            "**Du hostest eine Lobby?** Drücke **Create Lobby** und gib den {codeLength}-stelligen Lobby Code aus dem Spiel ein.\n\n**Du suchst ein Team?** Drücke **Browse Lobbies**, filtere nach Sprache und öffne eine Lobby-Karte. **Reveal Code** zeigt den Code, **Discussion** ist für die Absprache.\n\nHalte nur eine Lobby aktiv. Aktualisiere sie nur solange sie noch offen ist und schließe sie danach.",
        rulesTitle: "📜 {game} LFG-Regeln",
        rulesBody:
            "• Verwende nur einen **aktuellen {codeLength}-stelligen Ingame-Lobby-Code**.\n• Eine aktive LFG-Anzeige pro Host.\n• **#find-a-team** ist nur für Lobby-Karten; chatte in **Discussion**.\n• Aktualisiere nur aktive Räume und schließe fertige/volle Lobbys.\n• Keine falschen, spamartigen oder irreführenden Beiträge.\n• Teile keine Passwörter, Login-Codes, API-Schlüssel oder sensiblen Daten.\n• Die normalen {game}-Discord-Regeln gelten weiterhin.",
        createTitle: "{game}-Lobby erstellen",
        codeLabel: "{codeLength}-stelliger {game} Lobby Code",
        invalidCode: "❌ Gib genau {codeLength} Buchstaben/Ziffern ein, z. B. `ABC123`.",
        created: "✅ Lobby erfolgreich erstellt.",
        viewLobby: "Deine Lobby öffnen",
        editHint:
            "Nutze **Manage** auf der Lobby-Karte, um benötigte Spieler, Sprache, Spielmodus und Notizen festzulegen.",
        joinTitle: "🎮 {game}-Lobby",
        codeHeading: "🔑 Lobby-Code",
        joinInstruction:
            "Nutze diesen Code im Beitritts- oder Einladungsmenü des Spiels. Hinweise des Hosts findest du in Discussion.",
        joinDisclaimer: "Der Code stammt vom Host; Lobby-Finder kann nicht prüfen, ob der Raum noch aktiv ist.",
        browseTitle: "🔎 {game}-Lobbys",
        browseIntro: "Wähle unten die Lobby-Sprache. Es werden nur offene LFG-Posts angezeigt.",
        browseEmpty: "Zurzeit wurden keine passenden offenen Lobbys gefunden.",
        browseFilter: "Lobby-Sprache",
        openBoard: "Komplette Lobby-Liste öffnen",
        uiSaved: "🌐 Interface-Sprache ausgewählt."
    },
    hi: {
        startTitle: "🎮 {game} टीम खोजें",
        startBody:
            "**लॉबी होस्ट कर रहे हैं?** **Create Lobby** दबाएँ और गेम में दिखने वाला {codeLength}-अक्षर का Lobby Code डालें।\n\n**टीम ढूँढ रहे हैं?** **Browse Lobbies** दबाएँ, भाषा से फ़िल्टर करें और लॉबी कार्ड खोलें। कोड के लिए **Reveal Code** और बात करने के लिए **Discussion** उपयोग करें।\n\nएक समय में केवल एक सक्रिय लॉबी रखें। कमरा सक्रिय हो तभी Manage → Submit करें और समाप्त होने पर Close करें।",
        rulesTitle: "📜 {game} LFG नियम",
        rulesBody:
            "• केवल **वर्तमान {codeLength}-अक्षर का इन-गेम Lobby Code** उपयोग करें।\n• प्रति होस्ट एक सक्रिय LFG पोस्ट।\n• **#find-a-team** केवल लॉबी कार्ड के लिए है; चैट के लिए **Discussion** उपयोग करें।\n• केवल सक्रिय कमरे Manage → Submit करें और भरे/समाप्त कमरे Close करें।\n• नकली, स्पैम या भ्रामक लॉबी पोस्ट नहीं।\n• पासवर्ड, लॉगिन कोड, API key या संवेदनशील जानकारी साझा न करें।\n• सामान्य {game} Discord नियम भी लागू हैं।",
        createTitle: "{game} लॉबी बनाएँ",
        codeLabel: "{codeLength}-अक्षर का {game} Lobby Code",
        invalidCode: "❌ ठीक {codeLength} अक्षर/अंक डालें, जैसे: `ABC123`.",
        created: "✅ लॉबी सफलतापूर्वक बनाई गई।",
        viewLobby: "अपनी लॉबी देखें",
        editHint: "ज़रूरी खिलाड़ी, भाषा, गेम मोड और नोट्स सेट करने के लिए लॉबी कार्ड पर **Manage** का उपयोग करें।",
        joinTitle: "🎮 {game} लॉबी",
        codeHeading: "🔑 लॉबी कोड",
        joinInstruction:
            "इस कोड का उपयोग गेम के जुड़ने या आमंत्रण मेनू में करें। होस्ट के निर्देश Discussion में देखें।",
        joinDisclaimer: "कोड होस्ट ने दिया है; Lobby-Finder यह सत्यापित नहीं कर सकता कि कमरा अभी भी सक्रिय है।",
        browseTitle: "🔎 {game} लॉबी",
        browseIntro: "नीचे लॉबी की भाषा चुनें। केवल खुले LFG पोस्ट दिखाए जाते हैं।",
        browseEmpty: "अभी कोई मेल खाती खुली लॉबी नहीं मिली।",
        browseFilter: "लॉबी भाषा",
        openBoard: "पूरी लॉबी सूची खोलें",
        uiSaved: "🌐 इंटरफ़ेस भाषा चुनी गई।"
    },
    nl: {
        startTitle: "🎮 {game} Groep zoeken",
        startBody:
            "**Host je een lobby?** Druk op **Create Lobby** en voer de {codeLength}-tekens Lobby Code uit het spel in.\n\n**Zoek je een team?** Druk op **Browse Lobbies**, filter op taal en open een lobbykaart. **Reveal Code** toont de code; **Discussion** is voor overleg.\n\nHoud maar één lobby actief. Vernieuw alleen zolang de kamer actief is en sluit hem wanneer je klaar bent.",
        rulesTitle: "📜 {game} LFG-regels",
        rulesBody:
            "• Gebruik alleen een **actuele {codeLength}-tekens Lobby Code uit het spel**.\n• Eén actieve LFG-post per host.\n• **#find-a-team** is alleen voor lobbykaarten; chat in **Discussion**.\n• Vernieuw alleen actieve kamers en sluit volle/afgeronde lobby's.\n• Geen nep-, spam- of misleidende lobbyposts.\n• Deel geen wachtwoorden, logincodes, API-sleutels of gevoelige informatie.\n• De normale {game}-Discordregels blijven gelden.",
        createTitle: "{game}-lobby maken",
        codeLabel: "{codeLength}-tekens {game} Lobby Code",
        invalidCode: "❌ Voer precies {codeLength} letters/cijfers in, bijvoorbeeld: `ABC123`.",
        created: "✅ Lobby succesvol aangemaakt.",
        viewLobby: "Je lobby bekijken",
        editHint:
            "Gebruik **Manage** op de lobbykaart om benodigde spelers, taal, spelmodus en notities in te stellen.",
        joinTitle: "🎮 {game}-lobby",
        codeHeading: "🔑 Lobbycode",
        joinInstruction:
            "Gebruik deze code in het deelname- of uitnodigingsmenu van het spel. Bekijk de instructies van de host in Discussion.",
        joinDisclaimer:
            "De code is door de host opgegeven; Lobby-Finder kan niet controleren of de kamer nog actief is.",
        browseTitle: "🔎 {game}-lobby's",
        browseIntro: "Kies hieronder de lobbytaal. Alleen open LFG-posts worden getoond.",
        browseEmpty: "Er zijn nu geen passende open lobby's.",
        browseFilter: "Lobbytaal",
        openBoard: "Volledige lobbylijst openen",
        uiSaved: "🌐 Interfacetaal geselecteerd."
    },
    ko: {
        startTitle: "🎮 {game} 팀 찾기",
        startBody:
            "**로비를 만들나요?** **Create Lobby**를 누르고 게임에 표시되는 {codeLength}자리 Lobby Code를 입력하세요.\n\n**팀을 찾나요?** **Browse Lobbies**를 누르고 언어로 필터링한 뒤 로비 카드를 여세요. 코드는 **Reveal Code**, 대화는 **Discussion**을 사용하세요.\n\n한 번에 하나의 활성 로비만 유지하세요. 방이 활성 상태일 때만 새로고침하고 끝나면 닫으세요.",
        rulesTitle: "📜 {game} LFG 규칙",
        rulesBody:
            "• **현재 사용 가능한 {codeLength}자리 게임 내 Lobby Code**만 사용하세요.\n• 호스트당 활성 LFG 게시물은 하나만 가능합니다.\n• **#find-a-team**은 로비 카드 전용이며 채팅은 **Discussion**을 사용하세요.\n• 활성 방만 새로고침하고 가득 찼거나 끝난 방은 닫으세요.\n• 가짜, 스팸, 오해를 부르는 로비 게시물은 금지됩니다.\n• 비밀번호, 로그인 코드, API 키 또는 민감한 정보를 공유하지 마세요.\n• 일반 {game} Discord 규칙도 적용됩니다.",
        createTitle: "{game} 로비 만들기",
        codeLabel: "{codeLength}자리 {game} Lobby Code",
        invalidCode: "❌ 정확히 {codeLength}개의 문자/숫자를 입력하세요. 예: `ABC123`.",
        created: "✅ 로비가 성공적으로 생성되었습니다.",
        viewLobby: "내 로비 보기",
        editHint: "로비 카드의 **Manage**을 사용해 필요한 플레이어 수, 언어, 게임 모드와 메모를 설정하세요.",
        joinTitle: "🎮 {game} 로비",
        codeHeading: "🔑 로비 코드",
        joinInstruction:
            "게임의 참가 또는 초대 메뉴에서 이 코드를 사용하세요. 호스트의 안내는 Discussion에서 확인하세요.",
        joinDisclaimer: "코드는 호스트가 제공했으며 Lobby-Finder는 방이 아직 활성인지 확인할 수 없습니다.",
        browseTitle: "🔎 {game} 로비",
        browseIntro: "아래에서 로비 언어를 선택하세요. 현재 열린 LFG 게시물만 표시됩니다.",
        browseEmpty: "현재 조건에 맞는 열린 로비가 없습니다.",
        browseFilter: "로비 언어",
        openBoard: "전체 로비 목록 열기",
        uiSaved: "🌐 인터페이스 언어가 선택되었습니다."
    },
    fil: {
        startTitle: "🎮 {game} Humanap ng Team",
        startBody:
            "**Magho-host ng lobby?** Pindutin ang **Create Lobby** at ilagay ang {codeLength}-character Lobby Code na makikita sa game.\n\n**Naghahanap ng team?** Pindutin ang **Browse Lobbies**, mag-filter ayon sa wika at buksan ang lobby card. Gamitin ang **Reveal Code** para sa code at **Discussion** para makipag-usap.\n\nIsang active lobby lang bawat oras. I-refresh lang habang active ang room at isara kapag tapos na.",
        rulesTitle: "📜 {game} LFG Rules",
        rulesBody:
            "• Gumamit lang ng **kasalukuyang {codeLength}-character in-game Lobby Code**.\n• Isang active LFG post bawat host.\n• Ang **#find-a-team** ay para lang sa lobby cards; gamitin ang **Discussion** para sa chat.\n• Active rooms lang ang i-refresh at isara ang puno/tapos na lobby.\n• Bawal ang fake, spam o misleading lobby posts.\n• Huwag mag-share ng password, login code, API key o sensitibong impormasyon.\n• Nalalapat pa rin ang normal na {game} Discord rules.",
        createTitle: "Gumawa ng {game} Lobby",
        codeLabel: "{codeLength}-character {game} Lobby Code",
        invalidCode: "❌ Maglagay ng eksaktong {codeLength} letra/numero, hal.: `ABC123`.",
        created: "✅ Matagumpay na nagawa ang lobby.",
        viewLobby: "Tingnan ang lobby mo",
        editHint: "Gamitin ang **Manage** sa lobby card para itakda ang players needed, language, game mode at notes.",
        joinTitle: "🎮 {game} Lobby",
        codeHeading: "🔑 Lobby Code",
        joinInstruction:
            "Gamitin ang code sa join o invite menu ng laro. Tingnan ang mga tagubilin ng host sa Discussion.",
        joinDisclaimer: "Ang code ay mula sa host; hindi mabe-verify ng Lobby-Finder kung active pa ang room.",
        browseTitle: "🔎 {game} Lobbies",
        browseIntro: "Piliin ang wika ng lobby sa ibaba. Open LFG posts lang ang ipinapakita.",
        browseEmpty: "Walang nakitang katugmang open lobby ngayon.",
        browseFilter: "Wika ng lobby",
        openBoard: "Buksan ang buong lobby list",
        uiSaved: "🌐 Napili ang interface language."
    },
    th: {
        startTitle: "🎮 {game} หาเพื่อนร่วมทีม",
        startBody:
            "**จะสร้างล็อบบี้?** กด **Create Lobby** แล้วใส่ Lobby Code {codeLength} ตัวที่แสดงในเกม\n\n**กำลังหาทีม?** กด **Browse Lobbies** กรองตามภาษาแล้วเปิดการ์ดล็อบบี้ ใช้ **Reveal Code** เพื่อดูโค้ด และ **Discussion** เพื่อพูดคุย\n\nให้มีล็อบบี้ที่เปิดอยู่เพียงหนึ่งรายการ รีเฟรชเฉพาะตอนห้องยังใช้งานอยู่และปิดเมื่อเสร็จแล้ว",
        rulesTitle: "📜 กฎ {game} LFG",
        rulesBody:
            "• ใช้เฉพาะ **Lobby Code ในเกม {codeLength} ตัวที่ยังใช้งานอยู่**\n• หนึ่งโพสต์ LFG ที่เปิดอยู่ต่อโฮสต์\n• **#find-a-team** ใช้สำหรับการ์ดล็อบบี้เท่านั้น; คุยใน **Discussion**\n• รีเฟรชเฉพาะห้องที่ยังเปิด และปิดห้องที่เต็ม/จบแล้ว\n• ห้ามโพสต์ล็อบบี้ปลอม สแปม หรือข้อมูลทำให้เข้าใจผิด\n• ห้ามแชร์รหัสผ่าน รหัสล็อกอิน API key หรือข้อมูลสำคัญ\n• กฎ Discord {game} ปกติยังมีผล",
        createTitle: "สร้างล็อบบี้ {game}",
        codeLabel: "{game} Lobby Code {codeLength} ตัว",
        invalidCode: "❌ ใส่ตัวอักษร/ตัวเลขให้ครบ {codeLength} ตัว เช่น `ABC123`",
        created: "✅ สร้างล็อบบี้สำเร็จ",
        viewLobby: "ดูล็อบบี้ของคุณ",
        editHint: "ใช้ **Manage** บนการ์ดล็อบบี้เพื่อตั้งค่าจำนวนผู้เล่นที่ต้องการ ภาษา โหมดเกม และโน้ต",
        joinTitle: "🎮 ล็อบบี้ {game}",
        codeHeading: "🔑 Lobby Code",
        joinInstruction: "ใช้รหัสนี้ในเมนูเข้าร่วมหรือเชิญของเกม ดูคำแนะนำของโฮสต์ใน Discussion",
        joinDisclaimer: "โค้ดมาจากโฮสต์; Lobby-Finder ไม่สามารถยืนยันได้ว่าห้องยังเปิดอยู่หรือไม่",
        browseTitle: "🔎 ล็อบบี้ {game}",
        browseIntro: "เลือกภาษาของล็อบบี้ด้านล่าง จะแสดงเฉพาะโพสต์ LFG ที่เปิดอยู่",
        browseEmpty: "ตอนนี้ไม่พบล็อบบี้ที่ตรงกับตัวกรอง",
        browseFilter: "ภาษาล็อบบี้",
        openBoard: "เปิดรายการล็อบบี้ทั้งหมด",
        uiSaved: "🌐 เลือกภาษาหน้าจอแล้ว"
    },
    id: {
        startTitle: "🎮 {game} Cari Tim",
        startBody:
            "**Membuat lobby?** Tekan **Create Lobby** dan masukkan Lobby Code {codeLength} karakter yang terlihat di game.\n\n**Mencari tim?** Tekan **Browse Lobbies**, filter berdasarkan bahasa lalu buka kartu lobby. Gunakan **Reveal Code** untuk melihat kode dan **Discussion** untuk koordinasi.\n\nHanya satu lobby aktif per host. Manage → Submit hanya saat room masih aktif dan tutup ketika selesai.",
        rulesTitle: "📜 Aturan LFG {game}",
        rulesBody:
            "• Gunakan hanya **Lobby Code {codeLength} karakter yang masih aktif di game**.\n• Satu post LFG aktif per host.\n• **#find-a-team** hanya untuk kartu lobby; gunakan **Discussion** untuk chat.\n• Manage → Submit hanya room aktif dan tutup lobby yang penuh/selesai.\n• Dilarang lobby palsu, spam atau informasi menyesatkan.\n• Jangan bagikan password, kode login, API key atau informasi sensitif.\n• Aturan Discord {game} biasa tetap berlaku.",
        createTitle: "Buat Lobby {game}",
        codeLabel: "Lobby Code {game} {codeLength} karakter",
        invalidCode: "❌ Masukkan tepat {codeLength} huruf/angka, contoh: `ABC123`.",
        created: "✅ Lobby berhasil dibuat.",
        viewLobby: "Lihat lobby kamu",
        editHint:
            "Gunakan **Manage** pada kartu lobby untuk mengatur pemain yang dibutuhkan, bahasa, mode game, dan catatan.",
        joinTitle: "🎮 Lobby {game}",
        codeHeading: "🔑 Lobby Code",
        joinInstruction:
            "Gunakan kode ini di menu bergabung atau undangan dalam game. Lihat petunjuk host di Discussion.",
        joinDisclaimer: "Kode diberikan oleh host; Lobby-Finder tidak dapat memastikan room masih aktif.",
        browseTitle: "🔎 Lobby {game}",
        browseIntro: "Pilih bahasa lobby di bawah. Hanya post LFG yang masih terbuka yang ditampilkan.",
        browseEmpty: "Tidak ada lobby terbuka yang cocok saat ini.",
        browseFilter: "Bahasa lobby",
        openBoard: "Buka daftar lobby lengkap",
        uiSaved: "🌐 Bahasa antarmuka dipilih."
    },
    ja: {
        startTitle: "🎮 {game} メンバー募集",
        startBody:
            "**ロビーを作る場合**：**Create Lobby** を押し、ゲーム内に表示される{codeLength}文字の Lobby Code を入力してください。\n\n**チームを探す場合**：**Browse Lobbies** を押し、言語で絞り込んでロビーカードを開きます。コードは **Reveal Code**、相談は **Discussion** を使います。\n\n同時に有効なロビーは1つだけにし、部屋が有効な間だけ Manage → Submit、終了したら Close してください。",
        rulesTitle: "📜 {game} LFG ルール",
        rulesBody:
            "• **現在有効なゲーム内{codeLength}文字 Lobby Code** のみ使用してください。\n• ホストごとに有効なLFG投稿は1つまで。\n• **#find-a-team** はロビーカード専用です。会話は **Discussion** で行ってください。\n• 有効な部屋だけ Manage → Submit し、満員/終了した部屋は Close。\n• 偽ロビー、スパム、誤解を招く投稿は禁止。\n• パスワード、ログインコード、APIキーなどの機密情報を共有しないでください。\n• 通常の {game} Discord ルールも適用されます。",
        createTitle: "{game} ロビー作成",
        codeLabel: "{codeLength}文字の {game} Lobby Code",
        invalidCode: "❌ {codeLength}文字の英数字を入力してください。例：`ABC123`。",
        created: "✅ ロビーを作成しました。",
        viewLobby: "自分のロビーを見る",
        editHint: "ロビーカードの **Manage** から、必要人数、言語、ゲームモード、メモを設定してください。",
        joinTitle: "🎮 {game} ロビー",
        codeHeading: "🔑 Lobby Code",
        joinInstruction:
            "ゲームの参加・招待メニューでこのコードを使ってください。ホストの案内は Discussion を確認してください。",
        joinDisclaimer: "コードはホストが提供したものです。Lobby-Finder は部屋が現在も有効か確認できません。",
        browseTitle: "🔎 {game} ロビー",
        browseIntro: "下でロビー言語を選んでください。現在開いているLFG投稿だけ表示します。",
        browseEmpty: "現在、条件に合う開いているロビーはありません。",
        browseFilter: "ロビー言語",
        openBoard: "全ロビー一覧を開く",
        uiSaved: "🌐 インターフェース言語を選択しました。"
    },
    da: {
        startTitle: "🎮 {game} Find gruppe",
        startBody:
            "**Opretter du en lobby?** Tryk **Create Lobby** og indtast den {codeLength}-tegns Lobby Code, der vises i spillet.\n\n**Leder du efter et hold?** Tryk **Browse Lobbies**, filtrer efter sprog og åbn et lobbykort. Brug **Reveal Code** til koden og **Discussion** til koordinering.\n\nHav kun én aktiv lobby. Opdater kun mens rummet er aktivt og luk det, når I er færdige.",
        rulesTitle: "📜 {game} LFG-regler",
        rulesBody:
            "• Brug kun en **aktuel {codeLength}-tegns Lobby Code fra spillet**.\n• Ét aktivt LFG-opslag pr. vært.\n• **#find-a-team** er kun til lobbykort; brug **Discussion** til chat.\n• Opdater kun aktive rum og luk fulde/afsluttede lobbyer.\n• Ingen falske, spam- eller vildledende lobbyopslag.\n• Del ikke adgangskoder, login-koder, API-nøgler eller følsomme oplysninger.\n• De normale {game}-Discordregler gælder stadig.",
        createTitle: "Opret {game}-lobby",
        codeLabel: "{codeLength}-tegns {game} Lobby Code",
        invalidCode: "❌ Indtast præcis {codeLength} bogstaver/tal, f.eks. `ABC123`.",
        created: "✅ Lobby oprettet.",
        viewLobby: "Se din lobby",
        editHint: "Brug **Manage** på lobbykortet til at vælge antal spillere, sprog, spiltilstand og noter.",
        joinTitle: "🎮 {game}-lobby",
        codeHeading: "🔑 Lobbykode",
        joinInstruction:
            "Brug koden i spillets menu til at deltage eller invitere. Se værtens vejledning i Discussion.",
        joinDisclaimer: "Koden kommer fra værten; Lobby-Finder kan ikke bekræfte, om rummet stadig er aktivt.",
        browseTitle: "🔎 {game}-lobbyer",
        browseIntro: "Vælg lobbysprog nedenfor. Kun åbne LFG-opslag vises.",
        browseEmpty: "Der er ingen matchende åbne lobbyer lige nu.",
        browseFilter: "Lobbysprog",
        openBoard: "Åbn hele lobbylisten",
        uiSaved: "🌐 Interfacesprog valgt."
    }
} as const;

const DISCORD_LOCALE_PREFIX_MAP: Record<string, LfgUiLanguageId> = {
    en: "en",
    pt: "pt",
    zh: "zh",
    ru: "ru",
    es: "es",
    tr: "tr",
    uk: "uk",
    vi: "vi",
    it: "it",
    fr: "fr",
    ar: "ar",
    ro: "ro",
    hu: "hu",
    pl: "pl",
    cs: "cs",
    de: "de",
    hi: "hi",
    nl: "nl",
    ko: "ko",
    fil: "fil",
    th: "th",
    id: "id",
    ja: "ja",
    da: "da"
};

export function uiLanguageFromDiscordLocale(locale: string | null | undefined): LfgUiLanguageId {
    if (!locale) return "en";
    const normalized = locale.toLowerCase();
    const exact = normalized === "pt-br" ? "pt" : normalized === "es-419" ? "es" : undefined;
    if (exact) return exact;
    const prefix = normalized.split("-")[0] ?? "en";
    return DISCORD_LOCALE_PREFIX_MAP[prefix] ?? "en";
}

export function uiLanguageFromChoice(choice: LfgLanguageChoiceId): LfgUiLanguageId {
    // Tamil is currently available as a lobby-language choice, not as a full
    // translated LFG interface. Fall back to English UI copy for Tamil.
    return choice === "any" || choice === "ta" ? "en" : choice;
}

export function getUiCopy(language: LfgUiLanguageId, game = "Any game", codeLength = "1–32", expiry = 30): LfgUiCopy {
    const copy = LFG_UI_COPY[language] ?? LFG_UI_COPY.en;
    return Object.fromEntries(
        Object.entries(copy).map(([key, value]) => [
            key,
            value
                .replaceAll("{game}", game)
                .replaceAll("{codeLength}", codeLength)
                .replaceAll("{expiry}", String(expiry))
        ])
    ) as LfgUiCopy;
}

export function isLanguageChoiceId(value: string): value is LfgLanguageChoiceId {
    return value === "any" || LFG_LANGUAGE_OPTIONS.some((entry) => entry.id === value);
}

export function getLanguageOption(id: LfgLanguageChoiceId): LfgLanguageOption {
    if (id === "any") return LFG_ANY_LANGUAGE_OPTION;
    return LFG_LANGUAGE_OPTIONS.find((entry) => entry.id === id) ?? LFG_ANY_LANGUAGE_OPTION;
}

export function lobbyLanguageDisplay(id: LfgLanguageChoiceId): string {
    return getLanguageOption(id).display;
}

export function inferLobbyLanguageId(value: string): LfgLanguageChoiceId | null {
    const normalized = value.trim().toLocaleLowerCase();
    if (!normalized || normalized === "not specified") return null;

    // Backward compatibility for older cards that stored Any / Other.
    if (
        normalized === LFG_ANY_LANGUAGE_OPTION.display.toLocaleLowerCase() ||
        normalized === LFG_ANY_LANGUAGE_OPTION.label.toLocaleLowerCase() ||
        normalized === "any language"
    ) {
        return "any";
    }

    for (const option of LFG_LANGUAGE_OPTIONS) {
        if (option.display.toLocaleLowerCase() === normalized || option.label.toLocaleLowerCase() === normalized) {
            return option.id;
        }
    }
    return null;
}
