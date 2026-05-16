// Простая сцена уровня: генерируем геометрию напрямую по эскизу (дизайн 1400x900)

// Небольшая заглушка для совместимости — оригинальный проект использовал
// updateVisibility(scene) для видимости объектов. Здесь она безопасно ничего не делает.
function updateVisibility(scene) {
    if (!scene || !scene.cameras) return;
}
function create() {
    console.log('[GAME] create() start');
    createAnims(this);

    var w = this.scale.width;
    var h = this.scale.height;
    var levelW = w * 2;
    var levelH = h;

    this.cameras.main.setBounds(0, 0, levelW, levelH);
    this.physics.world.setBounds(0, 0, levelW, levelH * 2); // Allow falling below screen

    // фон
    this.add.rectangle(levelW / 2, levelH / 2, levelW, levelH, 0x333333).setDepth(-10);

    // группа статических платформ
    platforms = this.physics.add.staticGroup();
    // Создаём пустые группы, чтобы существующие вызовы update() не падали
    deadMonstersGroup = this.physics.add.staticGroup();
    liveMonsters = this.physics.add.group();
    traps = this.physics.add.staticGroup();

    // createPlatform(x, y, width, height, color) - using top-left origin to fix floor bugs
    function createPlatform(x, y, width, height, color) {
        var rect = this.add.rectangle(x, y, width, height, color).setOrigin(0, 0);
        this.physics.add.existing(rect, true);
        platforms.add(rect);
        return rect;
    }

    var solidColor = 0x1a1a1a;
    var greenColor = 0x2ecc71;
    var floorHeight = 40;

    // Главный пол: 70% длины уровня, внизу
    var mainFloorW = levelW * 0.7;
    createPlatform.call(this, 0, levelH - floorHeight, mainFloorW, floorHeight, solidColor);

    // Потолок коридора: 50% длины, на середине высоты
    var ceilingW = levelW * 0.5;
    var ceilingThickness = 40;
    var ceilingY = levelH / 2 - ceilingThickness / 2;
    createPlatform.call(this, 0, ceilingY, ceilingW, ceilingThickness, solidColor);

    // Правая стена: перекрывает проход в конце уровня
    var wallW = 40;
    createPlatform.call(this, levelW - wallW, 0, wallW, levelH, solidColor);

    // Светло-зеленые платформы (лесенкой)
    var platW = 120;
    var platH = 20;
    
    // 1-я чуть выше основного пола в высокой комнате (сразу после потолка коридора)
    var plat1X = levelW * 0.55 - platW / 2;
    var plat1Y = levelH - floorHeight - 80 - platH / 2;
    createPlatform.call(this, plat1X, plat1Y, platW, platH, greenColor);

    // 2-я посередине экрана, сдвинута правее
    var plat2X = levelW * 0.7 - platW / 2;
    var plat2Y = levelH / 2 + 40 - platH / 2;
    createPlatform.call(this, plat2X, plat2Y, platW, platH, greenColor);

    // 3-я еще выше и еще правее
    var plat3X = levelW * 0.85 - platW / 2;
    var plat3Y = levelH * 0.25 - platH / 2;
    createPlatform.call(this, plat3X, plat3Y, platW, platH, greenColor);

        // Спавн игрока в начале уровня на главном полу
    this.player = this.physics.add.sprite(80, levelH - floorHeight - 24, 'slime_idle');
    player = this.player; // для совместимости с остальным кодом
    this.player.setOrigin(0.5, 1).setScale(3).setBounce(0.05).setCollideWorldBounds(false).setDragX(420).setDepth(5);
        // Adjusting hitbox: slime is centered in 32x32, usually sits a bit higher than the bottom pixel.
    this.player.body.setSize(20, 10).setOffset(6, 18);
    this.player.anims.play('slime-idle');

    // Коллайдер между игроком и платформами
    this.physics.add.collider(this.player, platforms);

    // Смерть при падении в пропасть (ниже экрана)
    this.events.on('update', function() {
        if (player.y > levelH + 100) {
            respawn.call(this);
        }
    }, this);

    // --- Minimal HUD elements required by player.js to avoid undefined errors ---
    hpBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    formText = this.add.text(10, 30, 'Форма: Слизень', { fontSize: '14px', fill: '#44ff66' }).setScrollFactor(0).setDepth(20);
    formsBar = this.add.text(10, 48, '', { fontSize: '11px', fill:'#aaaaaa' }).setScrollFactor(0).setDepth(20);
    hintText = this.add.text(200, 48, '', { fontSize: '15px', fill:'#ffee44' }).setScrollFactor(0).setDepth(21).setOrigin(0.5,1);
    tabHint = this.add.text(600, 48, '[TAB] — смена формы', { fontSize: '12px', fill:'#cccccc' }).setScrollFactor(0).setDepth(20).setOrigin(1,1);
    updateHpDisplay(); updateFormsBar();

    console.log('[GAME] player at', this.player.x, this.player.y);

    // Камера и управление
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    
    cursors = this.input.keyboard.createCursorKeys();
    aKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    dKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    wKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    eKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}
