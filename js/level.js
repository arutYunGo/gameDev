// Простая сцена уровня: генерируем геометрию напрямую по эскизу (дизайн 1200x900)

function updateVisibility(scene) {
    if (!scene || !scene.cameras) return;
}

function create() {
    console.log('[GAME] create() start');
    createAnims(this);

    var w = 1200;
    var h = 900;

    this.cameras.main.setBounds(0, 0, w, h);
    this.physics.world.setBounds(0, 0, w, h + 200); // Позволяем падать чуть ниже экрана для триггера респауна

    // 1. ОБЩИЙ ЗАДНИЙ ФОН
    this.add.rectangle(w / 2, h / 2, w, h, 0x333333).setDepth(-10);

    // Группы физики
    platforms = this.physics.add.staticGroup();
    deadMonstersGroup = this.physics.add.staticGroup();
    liveMonsters = this.physics.add.group();
    traps = this.physics.add.staticGroup();

    // 4. ТРЕБОВАНИЯ К КОДУ: функция createPlatform
    function createPlatform(x, y, width, height, color) {
        var rect = this.add.rectangle(x, y, width, height, color).setOrigin(0, 0);
        this.physics.add.existing(rect, true);
        platforms.add(rect);
        return rect;
    }

    var solidColor = 0x1a1a1a;
    var stepColor = 0x2ecc71;

    // 3. ПОШАГОВАЯ ГЕОМЕТРИЯ УРОВНЯ
    // Верхняя стартовая платформа
    createPlatform.call(this, 0, 250, 400, 30, solidColor);

    // Верхнее продолжение (за обрывом)
    createPlatform.call(this, 650, 250, 550, 30, solidColor);

    // Лестница/Спуск вниз (салатовые платформы)
    createPlatform.call(this, 450, 380, 100, 20, stepColor);
    createPlatform.call(this, 550, 480, 100, 20, stepColor);
    createPlatform.call(this, 450, 580, 100, 20, stepColor);

    // Средний уровень (Нижний проход)
    // Путь НАЛЕВО
    createPlatform.call(this, 0, 600, 400, 30, solidColor);
    // Путь НАПРАВО
    createPlatform.call(this, 650, 600, 550, 30, solidColor);

    // Самый нижний пол (Дно)
    createPlatform.call(this, 0, 880, 1200, 40, solidColor);

    // 2. ТОЧКА НАЧАЛА (СПАВН)
    this.player = this.physics.add.sprite(100, 150, 'slime_idle');
    player = this.player;
    this.player.setOrigin(0.5, 1).setScale(3).setBounce(0.05).setCollideWorldBounds(false).setDragX(420).setDepth(5);
    this.player.body.setSize(20, 10).setOffset(6, 18);
    this.player.anims.play('slime-idle');

    // Настройка коллайдера
    this.physics.add.collider(this.player, platforms);

    // Респаун при падении
    this.events.on('update', function() {
        if (player.y > h + 100) {
            respawn.call(this);
        }
    }, this);

    // HUD элементы
    hpBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    formText = this.add.text(10, 30, 'Форма: Слизень', { fontSize: '14px', fill: '#44ff66' }).setScrollFactor(0).setDepth(20);
    formsBar = this.add.text(10, 48, '', { fontSize: '11px', fill:'#aaaaaa' }).setScrollFactor(0).setDepth(20);
    hintText = this.add.text(w / 2, 80, '', { fontSize: '15px', fill:'#ffee44' }).setScrollFactor(0).setDepth(21).setOrigin(0.5, 1);
    tabHint = this.add.text(w - 10, 40, '[TAB] — смена формы', { fontSize: '12px', fill:'#cccccc' }).setScrollFactor(0).setDepth(20).setOrigin(1, 1);
    
    if (typeof updateHpDisplay === 'function') updateHpDisplay();
    if (typeof updateFormsBar === 'function') updateFormsBar();

    // Камера: статичная, без следования
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(w / 2, h / 2);

    // Управление
    cursors = this.input.keyboard.createCursorKeys();
    aKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    dKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    wKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    eKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}
