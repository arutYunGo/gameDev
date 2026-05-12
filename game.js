const WORLD_W = 4800;
const WORLD_H = 900;
const GAME_W  = Math.round(900 * (window.innerWidth / window.innerHeight));
const GAME_H  = 900;

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#060610',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
    physics: { default: 'arcade', arcade: { gravity: { y: 800 }, debug: false } },
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);

// ── globals ───────────────────────────────────────────────────────────────────
var player, platforms, deadMonstersGroup, liveMonsters, traps;
var cursors, eKey, wKey, aKey, dKey, tabKey;
var playerForm = 'slime';
var absorbedForms = [];
var formText, hintText, hpText, formsBar;
var absorbAnimating = false;
var playerHP = 3;
var lastHit = 0;
var goblinArrow = null;
var goblinAbsorbed = false;

function makeCanvas(w, h, fn) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'));
    return c;
}

// ── preload ───────────────────────────────────────────────────────────────────
function preload() {
    this.load.spritesheet('slime_idle', 'sptrites/FreeSlime/slime_idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('slime_run',  'sptrites/FreeSlime/slime_run.png',  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('goblin_idle', 'sptrites/free/free/idle.png', { frameWidth: 200, frameHeight: 200 });
    this.load.spritesheet('goblin_walk', 'sptrites/free/free/walk.png', { frameWidth: 200, frameHeight: 200 });
    this.load.spritesheet('goblin_run',  'sptrites/free/free/run.png',  { frameWidth: 200, frameHeight: 200 });
    this.load.image('goblin_dead_img', 'sptrites/free/free/die/die_0010.png');

    // Mossy stone floor tile
    this.textures.addCanvas('stone', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#1c1828'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#241e30'; ctx.fillRect(0, 6, 32, 26);
        ctx.fillStyle = '#100f1a';
        ctx.fillRect(0, 15, 32, 1); ctx.fillRect(0, 26, 32, 1);
        ctx.fillRect(16, 6, 1, 9); ctx.fillRect(8, 16, 1, 10); ctx.fillRect(24, 16, 1, 10);
        // Mossy top
        ctx.fillStyle = '#284520'; ctx.fillRect(0, 0, 32, 6);
        ctx.fillStyle = '#3c6028'; ctx.fillRect(0, 0, 32, 3);
        ctx.fillStyle = '#4e7830'; ctx.fillRect(0, 0, 32, 1);
        ctx.fillStyle = '#62902f';
        ctx.fillRect(1,0,4,2); ctx.fillRect(8,0,2,1); ctx.fillRect(12,0,3,2);
        ctx.fillRect(19,0,2,1); ctx.fillRect(23,0,4,2); ctx.fillRect(29,0,2,1);
    }));

    // Dark stone wall
    this.textures.addCanvas('wall', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#0d0c18'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#131222'; ctx.fillRect(2, 2, 28, 28);
        ctx.fillStyle = '#080812';
        ctx.fillRect(0,11,32,1); ctx.fillRect(0,22,32,1);
        ctx.fillRect(16,0,1,11); ctx.fillRect(8,12,1,10); ctx.fillRect(24,12,1,10); ctx.fillRect(16,23,1,9);
    }));

    // Spikes
    this.textures.addCanvas('spikes', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#1a1430'; ctx.fillRect(0, 22, 32, 10);
        ctx.fillStyle = '#2e2448'; ctx.fillRect(0, 22, 32, 3);
        for (var i = 0; i < 4; i++) {
            ctx.fillStyle = '#888098';
            ctx.beginPath(); ctx.moveTo(i*8+4,1); ctx.lineTo(i*8,22); ctx.lineTo(i*8+8,22); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(210,200,230,0.4)';
            ctx.fillRect(i*8+4, 1, 1, 14);
        }
    }));
}

// ── anims ─────────────────────────────────────────────────────────────────────
function createAnims(scene) {
    scene.anims.create({ key:'slime-idle', frames: scene.anims.generateFrameNumbers('slime_idle',{start:0,end:3}), frameRate:6,  repeat:-1 });
    scene.anims.create({ key:'slime-run',  frames: scene.anims.generateFrameNumbers('slime_run', {start:0,end:5}), frameRate:10, repeat:-1 });
    scene.anims.create({ key:'goblin-idle', frames: scene.anims.generateFrameNumbers('goblin_idle',{start:0,end:8}), frameRate:8,  repeat:-1 });
    scene.anims.create({ key:'goblin-walk', frames: scene.anims.generateFrameNumbers('goblin_walk',{start:0,end:8}), frameRate:10, repeat:-1 });
    scene.anims.create({ key:'goblin-run',  frames: scene.anims.generateFrameNumbers('goblin_run', {start:0,end:8}), frameRate:12, repeat:-1 });
}

// ── create ────────────────────────────────────────────────────────────────────
function create() {
    createAnims(this);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Background
    this.add.rectangle(WORLD_W/2, WORLD_H/2, WORLD_W, WORLD_H, 0x060610).setDepth(-10);
    buildBgPattern(this);

    // Top ceiling & side walls (visual only)
    for (var cx = 0; cx < WORLD_W; cx += 32) this.add.image(cx+16, 16, 'stone').setFlipY(true).setDepth(-1);
    for (var wy = 0; wy < WORLD_H; wy += 32) {
        this.add.image(16, wy+16, 'wall').setDepth(-1);
        this.add.image(WORLD_W-16, wy+16, 'wall').setDepth(-1);
    }

    // Stalactites
    buildStalactites(this);

    // Ambient ground fog
    var fog = this.add.graphics().setDepth(1).setAlpha(0.22);
    fog.fillStyle(0x1a14a0, 1); fog.fillRect(32, WORLD_H-96, WORLD_W-64, 96);
    fog.fillStyle(0x0e0c70, 1); fog.fillRect(32, WORLD_H-60, WORLD_W-64, 60);

    // ── platforms ─────────────────────────────────────────────────────────────
    platforms = this.physics.add.staticGroup();

    // Main floors — high up, plenty of space
    var floorY = WORLD_H - 180;
    
    makeFloor(32,   950);          // Room 1 main floor
    makeFloor(1100, 2050);         // Room 2 main floor
    makeFloor(2300, 3200);         // Room 3 main floor
    makeFloor(3500, 4768);         // Room 4 main floor (exit)

    // Mid platforms — optional challenge (130px above main floor)
    var midY = floorY - 130;
    makeShelf(200,  420,  midY);   // Room 1 mid
    makeShelf(1200, 1480, midY);   // Room 2 mid-left
    makeShelf(1800, 2000, midY);   // Room 2 mid-right
    makeShelf(2450, 2700, midY);   // Room 3 mid
    makeShelf(3650, 3900, midY);   // Room 4 mid
    makeShelf(4150, 4400, midY);   // Room 4 far

    // High platforms — goblin challenge (280px above main floor)
    var highY = floorY - 280;
    makeShelf(300,  550,  highY);  // Room 1 high
    makeShelf(1300, 1400, highY);  // Room 2 high (narrow)
    makeShelf(2550, 2750, highY);  // Room 3 high
    makeShelf(3700, 3800, highY);  // Room 4 high (narrow)

    // Stepping stones over big gaps (at mid height)
    makeShelf(950,  1050, midY);   // over gap 1 (950-1100)
    makeShelf(2200, 2280, midY);   // over gap 2 (2050-2300)
    makeShelf(3380, 3470, midY);   // over gap 3 (3200-3500)

    // ── spikes ────────────────────────────────────────────────────────────────
    traps = this.physics.add.staticGroup();
    var spikeY = WORLD_H - 100;  // Deep pits
    spikeRow(950,  1100, spikeY);
    spikeRow(2050, 2300, spikeY);
    spikeRow(3200, 3500, spikeY);

    // Spike glow
    [975, 2175, 3350].forEach(function(sx) {
        var g = this.add.graphics().setDepth(1).setAlpha(0.15);
        g.fillStyle(0x6600cc, 1); g.fillRect(sx-75, spikeY-80, 150, 80);
    }, this);

    // ── torches ───────────────────────────────────────────────────────────────
    [
        [220, floorY], [550, floorY], [800, floorY],
        [250, midY], [450, midY],                      // on mid shelf
        [350, highY], [500, highY],                    // on high shelf
        [1150, floorY], [1600, floorY], [2000, floorY],
        [1300, midY], [1850, midY],
        [2350, floorY], [2800, floorY], [3100, floorY],
        [2550, midY], [2700, midY],
        [3550, floorY], [3900, floorY], [4200, floorY], [4600, floorY],
        [3750, midY]
    ].forEach(function(t) { addTorch(this, t[0], t[1]); }, this);

    // ── mushrooms ─────────────────────────────────────────────────────────────
    [150, 450, 750, 1150, 1500, 1950, 2400, 2750, 3600, 3900, 4200, 4600].forEach(function(mx) {
        addMushroom(this, mx, floorY);
    }, this);
    // On mid shelves
    [320, 400].forEach(function(mx) { addMushroom(this, mx, midY); }, this);
    [1350, 1850].forEach(function(mx) { addMushroom(this, mx, midY); }, this);
    [2600, 2700].forEach(function(mx) { addMushroom(this, mx, midY); }, this);

    // ── skull/bone decorations ────────────────────────────────────────────────
    [380, 650, 1350, 2450, 3650, 4300].forEach(function(bx) {
        drawBones(this, bx, WORLD_H-32);
    }, this);

    // ── dead goblin ───────────────────────────────────────────────────────────
    deadMonstersGroup = this.physics.add.staticGroup();
    spawnDeadGoblin(this);
    liveMonsters = this.physics.add.group();

    // ── PLAYER ────────────────────────────────────────────────────────────────────
    // origin(0.5, 1) → sprite.y = visual bottom.
    player = this.physics.add.sprite(120, WORLD_H-32, 'slime_idle');
    player.setOrigin(0.5, 1);
    player.setScale(3);
    player.setBounce(0.05);
    player.setCollideWorldBounds(true);
    player.setDragX(1400);
    player.setDepth(5);
    player.body.setSize(24, 24);
    player.body.setOffset(4, 8);
    player.anims.play('slime-idle');

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, traps, onSpike, null, this);

    this.cameras.main.startFollow(player, true, 0.09, 0.09);

    // ── UI ────────────────────────────────────────────────────────────────────
    formText = this.add.text(16, 16, 'Форма: Слизень', {
        fontSize:'18px', fill:'#44ff66', backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20);

    formsBar = this.add.text(16, 48, '', {
        fontSize:'13px', fill:'#aaaaaa', backgroundColor:'#00000088', padding:{x:6,y:3}
    }).setScrollFactor(0).setDepth(20);

    hintText = this.add.text(GAME_W/2, GAME_H-20, '', {
        fontSize:'15px', fill:'#ffee44', backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20).setOrigin(0.5, 1);

    this.add.text(16, 72, 'A/D — движение   W/↑ — прыжок   E — поглотить   TAB — смена формы', {
        fontSize:'11px', fill:'#667777', backgroundColor:'#00000077', padding:{x:6,y:3}
    }).setScrollFactor(0).setDepth(20);

    hpText = this.add.text(GAME_W-16, 16, '♥ ♥ ♥', {
        fontSize:'22px', fill:'#ff4444', backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20).setOrigin(1, 0);

    this.add.text(120, WORLD_H-55, '— СТАРТ —', { fontSize:'14px', fill:'#338833' }).setOrigin(0.5).setDepth(5);
    this.add.text(4700, WORLD_H-55, '[ ВЫХОД ]', {
        fontSize:'22px', fill:'#ffcc00', backgroundColor:'#00000099', padding:{x:10,y:5}
    }).setOrigin(0.5).setDepth(5);

    cursors = this.input.keyboard.createCursorKeys();
    eKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    wKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    aKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    dKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
}

// ── level helpers ─────────────────────────────────────────────────────────────

function makeFloor(x1, x2) {
    for (var x = x1; x < x2; x += 32) platforms.create(x+16, WORLD_H-32, 'stone');
}
function makeShelf(x1, x2, yCenter) {
    for (var x = x1; x < x2; x += 32) platforms.create(x+16, yCenter, 'stone');
}
function spikeRow(x1, x2, y) {
    for (var x = x1; x < x2; x += 32) traps.create(x+16, y, 'spikes').refreshBody();
}

// ── visual helpers ────────────────────────────────────────────────────────────

function buildBgPattern(scene) {
    // Single Graphics object — one draw call for the whole background stone pattern
    var g = scene.add.graphics().setDepth(-6);
    for (var x = 32; x < WORLD_W-32; x += 64) {
        for (var y = 32; y < WORLD_H-32; y += 40) {
            var shade = ((x + y) % 128 < 64) ? 0x0c0b18 : 0x0f0e1e;
            g.fillStyle(shade, 1);
            g.fillRect(x, y, 62, 38);
        }
    }
}

function buildStalactites(scene) {
    var defs = [
        180,50, 340,35, 500,65, 660,40, 820,70,
        980,38, 1150,58, 1320,42, 1500,72, 1680,36,
        1850,55, 2030,68, 2200,44, 2370,62, 2550,38,
        2720,74, 2900,50, 3070,40, 3250,66, 3430,48,
        3600,58, 3780,35, 3960,70, 4140,44, 4320,60, 4500,38, 4680,55
    ];
    var g = scene.add.graphics().setDepth(-2);
    for (var i = 0; i < defs.length; i += 2) {
        var sx = defs[i], sh = defs[i+1];
        // Main body
        g.fillStyle(0x18162a, 1);
        g.fillTriangle(sx-7, 32, sx+7, 32, sx, 32+sh);
        // Lighter central strip
        g.fillStyle(0x28244a, 1);
        g.fillTriangle(sx-2, 32, sx+2, 32, sx, 32+sh);
        // Water drip
        g.fillStyle(0x2233aa, 0.6);
        g.fillCircle(sx, 32+sh+3, 2.5);
    }
}

function addTorch(scene, x, y) {
    var b = scene.add.graphics().setDepth(3);
    b.fillStyle(0x5c3c1a, 1);
    b.fillRect(x-3, y-14, 6, 10);   // torch body
    b.fillRect(x-7, y-6,  14, 3);   // wall bracket
    b.fillStyle(0x3a2610, 1);
    b.fillRect(x-4, y-4,  8, 6);    // mount base

    var glow = scene.add.graphics().setDepth(2);
    glow.fillStyle(0xff8800, 0.09); glow.fillCircle(x, y-14, 80);
    glow.fillStyle(0xff6000, 0.07); glow.fillCircle(x, y-14, 45);

    var fl = scene.add.graphics().setDepth(4);
    fl.fillStyle(0xff2200, 1); fl.fillCircle(x, y-17, 7);
    fl.fillStyle(0xff7700, 1); fl.fillCircle(x, y-21, 5);
    fl.fillStyle(0xffcc00, 1); fl.fillCircle(x, y-24, 3);
    fl.fillStyle(0xffffff, 0.7); fl.fillCircle(x, y-26, 1.5);

    scene.tweens.add({ targets: fl, alpha:{from:1,to:0.35}, scaleX:{from:1,to:0.88}, scaleY:{from:1,to:1.12},
        duration: 80+Math.floor(Math.random()*130), yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay:Math.floor(Math.random()*900) });
    scene.tweens.add({ targets: glow, alpha:{from:0.7,to:0.2},
        duration: 200+Math.floor(Math.random()*200), yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay:Math.floor(Math.random()*500) });
}

function addMushroom(scene, x, floorY) {
    var g = scene.add.graphics().setDepth(2);
    g.fillStyle(0x3a2055, 1); g.fillRect(x-3, floorY-15, 6, 15);
    g.fillStyle(0x6020a0, 1); g.fillEllipse(x, floorY-17, 24, 14);
    g.fillStyle(0x9040c8, 1); g.fillEllipse(x, floorY-19, 19, 10);
    g.fillStyle(0xb860e0, 1); g.fillEllipse(x, floorY-20, 13, 6);
    g.fillStyle(0xeec0ff, 0.75);
    g.fillRect(x-5, floorY-22, 3, 3); g.fillRect(x+3, floorY-21, 2, 2);
    g.fillStyle(0x8010c0, 0.08); g.fillCircle(x, floorY-12, 26);
    scene.tweens.add({ targets:g, alpha:{from:0.65,to:1},
        duration:700+Math.floor(Math.random()*600), yoyo:true, repeat:-1,
        ease:'Sine.easeInOut', delay:Math.floor(Math.random()*800) });
}

function drawBones(scene, x, floorY) {
    var g = scene.add.graphics().setDepth(2);
    g.fillStyle(0xb0a884, 0.55);
    g.fillEllipse(x, floorY-9, 14, 11);        // skull
    g.fillStyle(0x060610, 1);
    g.fillRect(x-4, floorY-10, 3, 3);          // left eye
    g.fillRect(x+1, floorY-10, 3, 3);          // right eye
    g.fillStyle(0xa09870, 0.45);
    g.fillRect(x+9,  floorY-4, 18, 4);
    g.fillRect(x-22, floorY-3, 15, 3);
    g.fillRect(x-5,  floorY-2, 9,  2);
}

function spawnDeadGoblin(scene) {
    if (goblinAbsorbed) return;
    var dg = deadMonstersGroup.create(560, WORLD_H-32, 'goblin_dead_img');
    dg.setOrigin(0.5, 1);
    dg.setScale(0.65);
    dg.setFlipX(true);
    dg.setData('monsterType', 'goblin');
    dg.refreshBody();

    if (!goblinArrow) {
        goblinArrow = scene.add.text(560, WORLD_H-230, '▼', {
            fontSize:'26px', fill:'#44ff66'
        }).setOrigin(0.5).setDepth(6);
        scene.tweens.add({ targets:goblinArrow, y:WORLD_H-215, duration:450, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    }
}

function updateHpDisplay() {
    hpText.setText(('♥ '.repeat(Math.max(playerHP,0)) + '♡ '.repeat(Math.max(3-playerHP,0))).trim());
}
function updateFormsBar() {
    if (!absorbedForms.length) { formsBar.setText(''); return; }
    var names = { slime:'СЛИЗЕНЬ', goblin:'ГОБЛИН' };
    var all = ['slime'].concat(absorbedForms);
    formsBar.setText('TAB: ' + all.map(function(f){
        var n = names[f] || f.toUpperCase();
        return f === playerForm ? '['+n+']' : n;
    }).join(' → '));
}

// ── damage ────────────────────────────────────────────────────────────────────
function onSpike(p, spike) {
    var now = this.time.now;
    if (now - lastHit < 900) return;
    lastHit = now;
    playerHP--;
    updateHpDisplay();
    player.setVelocityY(-380);
    player.setVelocityX(player.x > spike.x ? 200 : -200);
    this.cameras.main.shake(180, 0.012);
    if (playerHP <= 0) respawn.call(this);
}

function respawn() {
    playerHP = 3;
    updateHpDisplay();
    // origin(0.5,1) → y = visual bottom = floor top
    player.setPosition(120, WORLD_H-32);
    player.setVelocity(0, 0);
    applyForm.call(this, 'slime');
    hintText.setText('Погибли. Формы сохранены — TAB для переключения.');
    this.time.delayedCall(2500, function(){ hintText.setText(''); });
}

// ── form system ───────────────────────────────────────────────────────────────
function applyForm(type) {
    // With origin(0.5,1): sprite.y = visual bottom.
    // Save current position BEFORE changing texture/scale
    var footY = player.y;

    playerForm = type;
    player.setFlipX(false);

    if (type === 'slime') {
        player.setTexture('slime_idle');
        player.setOrigin(0.5, 1);
        player.setScale(3);
        // 32×32 frame. At scale 3 = 96×96 world pixels
        // Body height 24 at scale 3 = 72px. Offset 4 means 4px from left in frame.
        // Offset Y=8 means 24px down from top of frame (8px in frame × 3 = 24px world)
        // Body bottom = sprite.y - displayOriginY + offsetY + bodyH
        //            = sprite.y - 96 + 24 + 72 = sprite.y ✓
        player.body.setSize(24, 24);
        player.body.setOffset(4, 8);
        formText.setText('Форма: Слизень');
        formText.setStyle({ fill:'#44ff66', fontSize:'20px' });
        player.anims.play('slime-idle', true);

    } else if (type === 'goblin') {
        player.setTexture('goblin_idle');
        player.setOrigin(0.5, 1);
        player.setScale(0.7);
        // 200×200 frame. At scale 0.7 = 140×140 world pixels
        // Body size 80×120 at scale 0.7 = 56×84 world pixels
        // Offset (60, 60) in frame = (42, 42) world pixels
        player.body.setSize(80, 120);
        player.body.setOffset(60, 60);
        formText.setText('Форма: Гоблин');
        formText.setStyle({ fill:'#99ff55', fontSize:'20px' });
        player.anims.play('goblin-idle', true);
    }

    // Reset body with same foot position
    player.body.reset(player.x, footY);
    updateFormsBar();
}

function cycleForm() {
    var all = ['slime'].concat(absorbedForms);
    applyForm.call(this, all[(all.indexOf(playerForm)+1) % all.length]);
}

function performAbsorb(scene, dead) {
    absorbAnimating = true;
    hintText.setText('Поглощение...');
    var s = player.scaleX;
    scene.tweens.add({
        targets: player, scaleX: s*1.7, scaleY: s*1.7, duration: 200, yoyo: true,
        onComplete: function() {
            var type = dead.getData('monsterType');
            dead.destroy();
            if (type === 'goblin') {
                goblinAbsorbed = true;
                if (goblinArrow) { goblinArrow.destroy(); goblinArrow = null; }
            }
            if (absorbedForms.indexOf(type) === -1) absorbedForms.push(type);
            applyForm.call(scene, type);
            absorbAnimating = false;
            hintText.setText('Поглощён ' + type + '!  TAB — смена формы.');
            scene.time.delayedCall(2500, function(){ hintText.setText(''); });
        }
    });
}

// ── update ────────────────────────────────────────────────────────────────────
function update() {
    var onGround = player.body.blocked.down;
    var speed    = playerForm === 'slime' ? 200 : 360;
    var jumpVel  = playerForm === 'slime' ? -430 : -720;
    var moving   = false;

    if (!absorbAnimating) {
        if (cursors.left.isDown  || aKey.isDown) { player.setVelocityX(-speed); player.setFlipX(true);  moving = true; }
        else if (cursors.right.isDown || dKey.isDown) { player.setVelocityX(speed);  player.setFlipX(false); moving = true; }
        if ((cursors.up.isDown || wKey.isDown) && onGround) player.setVelocityY(jumpVel);
    }

    if (!absorbAnimating) {
        if (playerForm === 'slime') {
            player.anims.play(moving ? 'slime-run' : 'slime-idle', true);
        } else if (playerForm === 'goblin') {
            var vx = Math.abs(player.body.velocity.x);
            player.anims.play(vx > 200 ? 'goblin-run' : vx > 20 ? 'goblin-walk' : 'goblin-idle', true);
        }
    }

    if (Phaser.Input.Keyboard.JustDown(tabKey) && absorbedForms.length && !absorbAnimating) cycleForm.call(this);

    var nearDead = null, nearDist = 100;
    deadMonstersGroup.getChildren().forEach(function(d) {
        if (!d.active) return;
        var dist = Phaser.Math.Distance.Between(player.x, player.y, d.x, d.y);
        if (dist < nearDist) { nearDist = dist; nearDead = d; }
    });

    if (nearDead && !absorbAnimating) {
        hintText.setText('[ E ] — Поглотить ' + nearDead.getData('monsterType'));
    } else if (!absorbAnimating && hintText.text.startsWith('[ E ]')) {
        hintText.setText('');
    }

    if (Phaser.Input.Keyboard.JustDown(eKey) && nearDead && !absorbAnimating) performAbsorb(this, nearDead);
}
