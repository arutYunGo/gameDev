// ── platform helpers ──────────────────────────────────────────────────────────
function makeFloor(x1, x2, y) {
    var fy = (typeof y === 'number') ? y : WORLD_H - 32;
        for (var x = x1; x < x2; x += 64) {
            platforms.create(x + 32, fy, 'stone')
                .setDisplaySize(64, 64)
                .refreshBody();
        }
}
function makeFloorAt(x1, x2, y) { makeFloor(x1, x2, y); }
function makeShelf(x1, x2, yCenter) {
    for (var x = x1; x < x2; x += 64) {
        platforms.create(x + 32, yCenter, 'stone')
            .setDisplaySize(64, 64)
            .refreshBody();
    }
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
    var dg = deadMonstersGroup.create(560, WORLD_H - 64, 'goblin_dead_img');
    dg.setOrigin(0.5, 1).setScale(0.65).setFlipX(true);
    dg.setData('monsterType', 'goblin');
    dg.setActive(true).setVisible(true).refreshBody();
}

// ── create (Phaser scene entry point) ─────────────────────────────────────────
function create() {
    createAnims(this);
    var mapWidth = WORLD_W / 2;
    var floorY = WORLD_H - 32;
    var floorTop = floorY - 32;

    this.cameras.main.setBounds(0, 0, mapWidth, WORLD_H);
    this.physics.world.setBounds(0, 0, mapWidth, WORLD_H);

    // Background
    this.add.rectangle(mapWidth / 2, WORLD_H / 2, mapWidth, WORLD_H, 0x060610).setDepth(-10);
    for (var cx = 0; cx < mapWidth; cx += 32) this.add.image(cx + 16, 16, 'stone').setFlipY(true).setDepth(-1);
    for (var wy = 0; wy < WORLD_H; wy += 32) {
        this.add.image(16, wy + 16, 'wall').setDepth(-1);
        this.add.image(mapWidth - 16, wy + 16, 'wall').setDepth(-1);
    }

    platforms = this.physics.add.staticGroup();
    traps     = this.physics.add.staticGroup();

        makeFloor(32, mapWidth - 32, floorY);

    deadMonstersGroup = this.physics.add.staticGroup();
    liveMonsters      = this.physics.add.group();
    this.physics.add.collider(liveMonsters, platforms);
    this.physics.add.collider(liveMonsters, traps, function(enemy) { enemy.setVelocityX(0); });

        player = this.physics.add.sprite(120, floorTop, 'slime_idle');
    player.setOrigin(0.5, 1).setScale(3).setBounce(0.05)
          .setCollideWorldBounds(true).setDragX(420).setDepth(5); // 420 = slime drag
    player.body.setSize(24, 24).setOffset(4, 8);
    player.anims.play('slime-idle');

    playerMarker = this.add.text(player.x, player.y, '▼', {
        fontSize: '20px', fill: '#44ff88',
        stroke: '#003300', strokeThickness: 4
    }).setOrigin(0.5, 1).setDepth(10);

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(player, liveMonsters, function() {}, null, this);
    this.physics.add.overlap(player, traps, onSpike, null, this);

    goblinFormTarget = spawnGoblinFormTarget(this, 560, floorTop);
    spawnGoblinHunter(this, mapWidth - 600, floorTop);
    spawnGoblinHunter(this, mapWidth - 900, floorTop);
    spawnGoblinHunter(this, mapWidth - 300, floorTop);

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
    tabKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}
