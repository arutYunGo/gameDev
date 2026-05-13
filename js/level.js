// ── platform helpers ──────────────────────────────────────────────────────────
function makeFloor(x1, x2, y) {
    var fy = (typeof y === 'number') ? y : WORLD_H - 32;
    for (var x = x1; x < x2; x += 32) platforms.create(x + 16, fy, 'stone');
}
function makeFloorAt(x1, x2, y) { makeFloor(x1, x2, y); }
function makeShelf(x1, x2, yCenter) {
    for (var x = x1; x < x2; x += 32) platforms.create(x + 16, yCenter, 'stone');
}
function spikeRow(x1, x2, y) {
    for (var x = x1; x < x2; x += 32) traps.create(x + 16, y, 'spikes').refreshBody();
}
function makeRoomFloor(scene, room) { makeFloorAt(room.x1, room.x2, room.y); }
function addBranchMarker() {}   // no in-world labels

// ── visibility culling ────────────────────────────────────────────────────────
function updateVisibility(scene) {
    if (!scene.cameras.main || !platforms || !traps) return;
    var view   = scene.cameras.main.worldView;
    var margin = 96;
    var rect   = new Phaser.Geom.Rectangle(view.x - margin, view.y - margin, view.width + margin * 2, view.height + margin * 2);
    [platforms, traps, deadMonstersGroup].forEach(function(group) {
        if (!group) return;
        group.getChildren().forEach(function(obj) {
            obj.setVisible(Phaser.Geom.Rectangle.Overlaps(rect, obj.getBounds()));
        });
    });
}

// ── dead monster corpse ───────────────────────────────────────────────────────
function spawnDeadGoblin() {
    if (goblinAbsorbed) return;
    var dg = deadMonstersGroup.create(560, WORLD_H - 32, 'goblin_dead_img');
    dg.setOrigin(0.5, 1).setScale(0.65).setFlipX(true);
    dg.setData('monsterType', 'goblin');
    dg.setActive(true).setVisible(true).refreshBody();
}

// ── create (Phaser scene entry point) ─────────────────────────────────────────
function create() {
    createAnims(this);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Background
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x060610).setDepth(-10);
    buildBgPattern(this);

    // Top ceiling & side walls (visual)
    for (var cx = 0; cx < WORLD_W; cx += 32) this.add.image(cx + 16, 16, 'stone').setFlipY(true).setDepth(-1);
    for (var wy = 0; wy < WORLD_H; wy += 32) {
        this.add.image(16, wy + 16, 'wall').setDepth(-1);
        this.add.image(WORLD_W - 16, wy + 16, 'wall').setDepth(-1);
    }

    buildStalactites(this);
    buildStalagmites(this);
    buildCaveVines(this);
    buildWoodenShop(this);

    var floorY       = WORLD_H - 180;
    var midY         = floorY - 130;
    var highY        = floorY - 280;
    var branchY      = floorY - 220;
    var branchEntryY = floorY - 130;

    this.add.rectangle(WORLD_W / 2, floorY + 16, WORLD_W - 64, 32, 0x141321).setDepth(-3);
    this.add.rectangle(WORLD_W / 2, floorY + 4,  WORLD_W - 64,  8, 0x22303d).setDepth(-2);

    var fog = this.add.graphics().setDepth(-2).setAlpha(0.18);
    fog.fillStyle(0x09080f, 0.18); fog.fillRect(32, floorY + 24, WORLD_W - 64, 64);
    fog.fillStyle(0x140e2d, 0.12); fog.fillRect(32, floorY + 40, WORLD_W - 64, 48);

    // ── platforms ─────────────────────────────────────────────────────────────
    platforms = this.physics.add.staticGroup();
    traps     = this.physics.add.staticGroup();

    var rooms = [
        { name:'СТАРТ',       x1:  32, x2:  950, y: floorY },
        { name:'РАЗВИЛКА',    x1:1100, x2: 1680, y: floorY },
        { name:'ВЕТКА ВВЕРХ', x1:2050, x2: 2360, y: branchY },
        { name:'ПУТЬ ВПРАВО', x1:2050, x2: 2660, y: floorY },
        { name:'СХОЖДЕНИЕ',   x1:2700, x2: 3300, y: floorY },
        { name:'ФИНИШ',       x1:3300, x2: 4768, y: floorY }
    ];
    rooms.forEach(function(room) { makeRoomFloor(this, room); }, this);

    makeShelf(200,  420,  midY);  makeShelf(1200, 1480, midY);
    makeShelf(1800, 2000, midY);  makeShelf(2450, 2700, midY);
    makeShelf(3650, 3900, midY);  makeShelf(4150, 4400, midY);

    makeShelf(300,  550,  highY); makeShelf(1300, 1400, highY);
    makeShelf(2550, 2750, highY); makeShelf(3700, 3800, highY);

    makeShelf(1680, 1720, branchEntryY);
    makeShelf(1740, 1800, floorY - 190);
    makeShelf(1780, 1820, branchY);
    makeShelf(2040, 2140, branchY);
    makeShelf(2360, 2400, floorY - 120);

    makeShelf(950,  1050, midY);
    makeShelf(2200, 2280, midY);
    makeShelf(3380, 3470, midY);

    // ── spikes ────────────────────────────────────────────────────────────────
    traps = this.physics.add.staticGroup();
    var spikeY = WORLD_H - 100;
    spikeRow(950,  1100, spikeY);
    spikeRow(2050, 2300, spikeY);
    spikeRow(3200, 3500, spikeY);

    var self = this;
    [975, 2175, 3350].forEach(function(sx) {
        var g = self.add.graphics().setDepth(1).setAlpha(0.15);
        g.fillStyle(0x6600cc, 1); g.fillRect(sx - 75, spikeY - 80, 150, 80);
    });

    // ── torches ───────────────────────────────────────────────────────────────
    [
        [220,floorY],[550,floorY],[800,floorY],
        [250,midY],[450,midY],[350,highY],[500,highY],
        [1150,floorY],[1600,floorY],[2000,floorY],
        [1300,midY],[1850,midY],
        [2350,floorY],[2800,floorY],[3100,floorY],
        [2550,midY],[2700,midY],
        [3550,floorY],[3900,floorY],[4200,floorY],[4600,floorY],
        [3750,midY]
    ].forEach(function(t) { addTorch(self, t[0], t[1]); });

    // ── mushrooms ─────────────────────────────────────────────────────────────
    [150,450,750,1150,1500,1950,2400,2750,3600,3900,4200,4600].forEach(function(mx) {
        addMushroom(self, mx, floorY);
    });
    [320,400].forEach(function(mx) { addMushroom(self, mx, midY); });
    [1350,1850].forEach(function(mx) { addMushroom(self, mx, midY); });
    [2600,2700].forEach(function(mx) { addMushroom(self, mx, midY); });

    // ── bones ─────────────────────────────────────────────────────────────────
    [380,650,1350,2450,3650,4300].forEach(function(bx) {
        drawBones(self, bx, WORLD_H - 32);
    });

    // ── enemies & physics groups ───────────────────────────────────────────────
    deadMonstersGroup = this.physics.add.staticGroup();
    liveMonsters      = this.physics.add.group();
    this.physics.add.collider(liveMonsters, platforms);
    this.physics.add.collider(liveMonsters, traps, function(enemy) { enemy.setVelocityX(0); });

    // ── player ────────────────────────────────────────────────────────────────
    player = this.physics.add.sprite(120, floorY, 'slime_idle');
    player.setOrigin(0.5, 1).setScale(3).setBounce(0.05)
          .setCollideWorldBounds(true).setDragX(1200).setDepth(5);
    player.body.setSize(24, 24).setOffset(4, 8);
    player.anims.play('slime-idle');

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(player, liveMonsters, function() {}, null, this);
    this.physics.add.overlap(player, traps, onSpike, null, this);

    goblinFormTarget = spawnGoblinFormTarget(this, 560, floorY);
    spawnGoblinHunter(this, 3700, floorY);

    gameCamera = new GameCamera(this, player);

    // ── UI ────────────────────────────────────────────────────────────────────
    var Z = CAM_ZOOM;

    hpBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    updateHpDisplay();

    formText = this.add.text(10/Z, 30/Z, 'Форма: Слизень', {
        fontSize: Math.round(14/Z) + 'px', fill:'#44ff66',
        backgroundColor:'#00000099', padding:{x:Math.round(6/Z), y:Math.round(3/Z)}
    }).setScrollFactor(0).setDepth(20);

    formsBar = this.add.text(10/Z, 48/Z, '', {
        fontSize: Math.round(11/Z) + 'px', fill:'#aaaaaa',
        backgroundColor:'#00000088', padding:{x:Math.round(5/Z), y:Math.round(2/Z)}
    }).setScrollFactor(0).setDepth(20);

    tabHint = this.add.text((GAME_W - 10)/Z, (GAME_H - 10)/Z, '[TAB] — смена формы', {
        fontSize: Math.round(12/Z) + 'px', fill:'#cccccc',
        backgroundColor:'#00000099', padding:{x:Math.round(6/Z), y:Math.round(3/Z)}
    }).setScrollFactor(0).setDepth(20).setOrigin(1, 1);

    hintText = this.add.text(GAME_W / (2*Z), (GAME_H - 12)/Z, '', {
        fontSize: Math.round(15/Z) + 'px', fill:'#ffee44',
        backgroundColor:'#000000cc', padding:{x:Math.round(10/Z), y:Math.round(5/Z)},
        stroke:'#000000', strokeThickness: Math.max(1, Math.round(2/Z))
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5, 1);

    cursors = this.input.keyboard.createCursorKeys();
    eKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    wKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    aKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    dKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
}
