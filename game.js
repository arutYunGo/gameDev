const WORLD_W = 4800;
const WORLD_H = 900;

const GAME_W = Math.round(900 * (window.innerWidth / window.innerHeight));
const GAME_H = 900;

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#060610',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 900 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

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

// ── Preload ───────────────────────────────────────────────────────────────────
function preload() {
    this.load.spritesheet('slime_idle', 'sptrites/FreeSlime/slime_idle.png', { frameWidth:32, frameHeight:32 });
    this.load.spritesheet('slime_run',  'sptrites/FreeSlime/slime_run.png',  { frameWidth:32, frameHeight:32 });
    this.load.spritesheet('slime_die',  'sptrites/FreeSlime/slime_die.png',  { frameWidth:32, frameHeight:32 });

    this.load.spritesheet('goblin_idle', 'sptrites/free/free/idle.png', { frameWidth:200, frameHeight:200 });
    this.load.spritesheet('goblin_walk', 'sptrites/free/free/walk.png', { frameWidth:200, frameHeight:200 });
    this.load.spritesheet('goblin_run',  'sptrites/free/free/run.png',  { frameWidth:200, frameHeight:200 });
    this.load.image('goblin_dead_img', 'sptrites/free/free/die/die_0010.png');

    // Dungeon tileset 16x16
    this.load.spritesheet('dungeon',
        'sptrites/free/free/2D Dungeon Platformer Tileset/2D Dungeon Platformer Tileset/dungeontileset.png',
        { frameWidth:16, frameHeight:16 });

    // ── Canvas textures ───────────────────────────────────────────────────
    // Mossy dungeon floor tile
    this.textures.addCanvas('stone', makeCanvas(32, 32, function(ctx) {
        // Stone body
        ctx.fillStyle = '#1e1820'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#251d22'; ctx.fillRect(0, 5, 32, 27);
        // Brick mortar lines
        ctx.fillStyle = '#131018';
        ctx.fillRect(0, 14, 32, 2);
        ctx.fillRect(0, 26, 32, 2);
        ctx.fillRect(16, 5, 2, 9);
        ctx.fillRect(8,  16, 2, 10);
        ctx.fillRect(24, 16, 2, 10);
        // Top mossy surface
        ctx.fillStyle = '#2a3d18'; ctx.fillRect(0, 0, 32, 5);
        ctx.fillStyle = '#374d1f'; ctx.fillRect(0, 0, 32, 3);
        ctx.fillStyle = '#4a6828'; ctx.fillRect(0, 0, 32, 1);
        // Moss clumps
        ctx.fillStyle = '#5a7830';
        for (var i = 0; i < 4; i++) {
            ctx.fillRect(i * 8 + 1, 0, 3, 2);
            ctx.fillRect(i * 8 + 5, 0, 2, 1);
        }
    }));

    // Dark dungeon background wall
    this.textures.addCanvas('wall', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#0c0b14'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#10101c'; ctx.fillRect(2, 2, 28, 28);
        ctx.fillStyle = '#08080f';
        ctx.fillRect(0, 10, 32, 1);
        ctx.fillRect(0, 21, 32, 1);
        ctx.fillRect(16, 0, 1, 10);
        ctx.fillRect(8,  11, 1, 10);
        ctx.fillRect(24, 11, 1, 10);
        ctx.fillRect(16, 22, 1, 10);
        // Subtle purple shimmer
        ctx.fillStyle = 'rgba(80,60,120,0.07)';
        ctx.fillRect(2, 2, 3, 28);
    }));

    // Iron spikes
    this.textures.addCanvas('spikes', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#201828'; ctx.fillRect(0, 20, 32, 12);
        ctx.fillStyle = '#3a2a42'; ctx.fillRect(0, 20, 32, 4);
        ctx.fillStyle = '#7a7a90';
        for (var i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(i*8+4, 2); ctx.lineTo(i*8+1, 20); ctx.lineTo(i*8+7, 20);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(200,200,220,0.5)';
            ctx.fillRect(i*8+4, 2, 1, 12);
            ctx.fillStyle = '#7a7a90';
        }
    }));
}

// ── Анимации ──────────────────────────────────────────────────────────────────
function createAnims(scene) {
    scene.anims.create({ key:'slime-idle', frames:scene.anims.generateFrameNumbers('slime_idle',{start:0,end:3}), frameRate:6,  repeat:-1 });
    scene.anims.create({ key:'slime-run',  frames:scene.anims.generateFrameNumbers('slime_run', {start:0,end:5}), frameRate:10, repeat:-1 });
    scene.anims.create({ key:'goblin-idle', frames:scene.anims.generateFrameNumbers('goblin_idle',{start:0,end:8}), frameRate:8,  repeat:-1 });
    scene.anims.create({ key:'goblin-walk', frames:scene.anims.generateFrameNumbers('goblin_walk',{start:0,end:8}), frameRate:10, repeat:-1 });
    scene.anims.create({ key:'goblin-run',  frames:scene.anims.generateFrameNumbers('goblin_run', {start:0,end:8}), frameRate:12, repeat:-1 });
}

// ── Create ────────────────────────────────────────────────────────────────────
function create() {
    createAnims(this);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Deep dark background
    this.add.rectangle(WORLD_W/2, WORLD_H/2, WORLD_W, WORLD_H, 0x060610).setDepth(-10);

    // Background dungeon wall tiles
    for (var bx = 0; bx < WORLD_W; bx += 32) {
        for (var by = 0; by < WORLD_H; by += 32) {
            this.add.image(bx+16, by+16, 'wall').setDepth(-5);
        }
    }

    // ── CEILING BORDER ────────────────────────────────────────────────────
    for (var cx = 0; cx < WORLD_W; cx += 32) {
        this.add.image(cx+16, 16, 'stone').setFlipY(true).setDepth(-1);
    }
    // Side walls
    for (var wy = 0; wy < WORLD_H; wy += 32) {
        this.add.image(16, wy+16, 'wall').setDepth(-1);
        this.add.image(WORLD_W-16, wy+16, 'wall').setDepth(-1);
    }

    // ── STALACTITES ───────────────────────────────────────────────────────
    var stalDefs = [
        [160,55],[280,38],[420,70],[570,45],[730,62],[860,30],
        [1000,58],[1160,42],[1340,68],[1500,35],[1680,52],[1840,65],
        [2000,40],[2160,58],[2320,44],[2480,70],[2640,36],[2800,55],
        [2960,48],[3120,65],[3280,40],[3440,56],[3600,44],[3760,70],
        [3920,38],[4080,62],[4240,50],[4400,45],[4560,68],[4700,40]
    ];
    stalDefs.forEach(function(s) {
        var sx = s[0], sh = s[1];
        drawStalactite(this, sx, sh);
    }, this);

    // ── DUNGEON TILESET DECORATIONS (frame 0 = dark wall tile) ────────────
    // Use tileset tiles as ambient dungeon details on background
    var tileDecoPositions = [
        300,500,700,900,1100,1350,1550,1750,1950,2150,
        2350,2550,2750,2950,3150,3350,3550,3750,3950,4150,4350,4550
    ];
    tileDecoPositions.forEach(function(dx) {
        // Place a 2x2 cluster of dungeon tiles as wall decoration mid-height
        for (var ty = 0; ty < 3; ty++) {
            this.add.image(dx, 120 + ty*16, 'dungeon', 0).setDepth(-3).setAlpha(0.6);
            this.add.image(dx+16, 120 + ty*16, 'dungeon', 0).setDepth(-3).setAlpha(0.6);
        }
    }, this);

    // Hanging chain decorations
    var chainPositions = [380, 760, 1250, 1900, 2450, 3050, 3650, 4250];
    chainPositions.forEach(function(chx) {
        addChain(this, chx, 32, 80);
    }, this);

    // ── PLATFORMS ─────────────────────────────────────────────────────────
    platforms = this.physics.add.staticGroup();

    function floor(x1, x2) {
        for (var x = x1; x < x2; x += 32) {
            platforms.create(x+16, WORLD_H-16, 'stone');
        }
    }
    function shelf(x1, x2, y) {
        for (var x = x1; x < x2; x += 32) {
            platforms.create(x+16, y, 'stone');
        }
    }

    floor(32,   864);
    floor(1088, 2048);
    floor(2240, 3200);
    floor(3456, 4736);

    shelf(1200, 1600, WORLD_H-280);
    shelf(2400, 2800, WORLD_H-300);
    shelf(3600, 4000, WORLD_H-260);

    // Fill below platforms with wall tiles (visual depth)
    fillBelow(this, 32,   864,   WORLD_H-32, WORLD_H);
    fillBelow(this, 1088, 2048,  WORLD_H-32, WORLD_H);
    fillBelow(this, 2240, 3200,  WORLD_H-32, WORLD_H);
    fillBelow(this, 3456, 4736,  WORLD_H-32, WORLD_H);
    fillBelow(this, 1200, 1600,  WORLD_H-296, WORLD_H-264);
    fillBelow(this, 2400, 2800,  WORLD_H-316, WORLD_H-284);
    fillBelow(this, 3600, 4000,  WORLD_H-276, WORLD_H-244);

    // ── SPIKES ────────────────────────────────────────────────────────────
    traps = this.physics.add.staticGroup();
    for (var sx = 864;  sx < 1088; sx += 32) traps.create(sx+16, WORLD_H-48, 'spikes').refreshBody();
    for (var sx2 = 3200; sx2 < 3456; sx2 += 32) traps.create(sx2+16, WORLD_H-48, 'spikes').refreshBody();

    // Glow under spikes
    addSpikesGlow(this, 864, 1088);
    addSpikesGlow(this, 3200, 3456);

    // ── MUSHROOMS (glowing decoration) ────────────────────────────────────
    var mushPositions = [220, 680, 1160, 1800, 2480, 3100, 3780, 4450];
    mushPositions.forEach(function(mx) {
        addMushroom(this, mx, WORLD_H-32);
    }, this);
    // Mushrooms on shelves
    addMushroom(this, 1320, WORLD_H-296);
    addMushroom(this, 1480, WORLD_H-296);
    addMushroom(this, 2520, WORLD_H-316);
    addMushroom(this, 3700, WORLD_H-276);

    // ── TORCHES ───────────────────────────────────────────────────────────
    [[600,WORLD_H-55],[1400,WORLD_H-55],[2200,WORLD_H-55],[3000,WORLD_H-55],
     [3800,WORLD_H-55],[4400,WORLD_H-55],[1300,WORLD_H-295],[2500,WORLD_H-315]
    ].forEach(function(t) { addTorch(this, t[0], t[1]); }, this);

    // ── DEAD GOBLIN ───────────────────────────────────────────────────────
    deadMonstersGroup = this.physics.add.staticGroup();
    spawnDeadGoblin(this);

    liveMonsters = this.physics.add.group();

    // ── PLAYER ────────────────────────────────────────────────────────────
    player = this.physics.add.sprite(120, WORLD_H-200, 'slime_idle');
    player.setScale(3);
    player.setBounce(0.05);
    player.setCollideWorldBounds(true);
    player.setDragX(1400);
    player.setDepth(5);
    // Body aligned to bottom of sprite visual.
    // Display = 96x96 (32*3). Origin (0.5,0.5) → displayOrigin = 48.
    // body.bottom = sprite.y - 48 + offsetY + bodyH → set offsetY + bodyH = 96
    // Body = 56px wide, 40px tall, sits at visual bottom: offsetY = 56
    player.body.setSize(56, 40);
    player.body.setOffset(20, 56);
    player.anims.play('slime-idle');

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, traps, onSpike, null, this);

    this.cameras.main.startFollow(player, true, 0.09, 0.09);

    // ── UI ────────────────────────────────────────────────────────────────
    formText = this.add.text(16, 16, 'Форма: Слизень', {
        fontSize:'18px', fill:'#44ff66',
        backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20);

    formsBar = this.add.text(16, 48, '', {
        fontSize:'13px', fill:'#aaaaaa',
        backgroundColor:'#00000088', padding:{x:6,y:3}
    }).setScrollFactor(0).setDepth(20);

    hintText = this.add.text(GAME_W/2, GAME_H-20, '', {
        fontSize:'15px', fill:'#ffee44',
        backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20).setOrigin(0.5, 1);

    this.add.text(16, 72, 'A/D ← →   прыжок W/↑   E поглотить   TAB смена формы', {
        fontSize:'11px', fill:'#667777',
        backgroundColor:'#00000077', padding:{x:6,y:3}
    }).setScrollFactor(0).setDepth(20);

    hpText = this.add.text(GAME_W-16, 16, '♥ ♥ ♥', {
        fontSize:'22px', fill:'#ff4444',
        backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20).setOrigin(1, 0);

    this.add.text(120, WORLD_H-60, 'СТАРТ', {fontSize:'16px', fill:'#445544'}).setOrigin(0.5).setDepth(5);
    this.add.text(4680, WORLD_H-60, '[ ВЫХОД ]', {
        fontSize:'24px', fill:'#ffcc00', backgroundColor:'#00000099', padding:{x:10,y:5}
    }).setOrigin(0.5).setDepth(5);

    cursors = this.input.keyboard.createCursorKeys();
    eKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    wKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    aKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    dKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillBelow(scene, x1, x2, y1, y2) {
    for (var fx = x1; fx < x2; fx += 32) {
        for (var fy = y1; fy < y2; fy += 32) {
            scene.add.image(fx+16, fy+16, 'wall').setDepth(-4);
        }
    }
}

function drawStalactite(scene, x, h) {
    var g = scene.add.graphics().setDepth(-2);
    for (var y = 0; y < h; y++) {
        var t = y / h;
        var w = Math.max(2, Math.round((1 - t) * 10));
        var ox = (10 - w) / 2;
        var shade = Math.floor(22 + t * 8);
        g.fillStyle(Phaser.Display.Color.GetColor(shade, Math.floor(shade*0.85), shade + 5), 1);
        g.fillRect(x - 5 + ox, 32 + y, w, 1);
    }
    // Drip droplet
    g.fillStyle(0x1a1a3a, 0.8);
    g.fillCircle(x, 32 + h + 2, 2);
}

function addChain(scene, x, y1, y2) {
    var g = scene.add.graphics().setDepth(-2);
    for (var cy = y1; cy < y2; cy += 10) {
        var even = ((cy - y1) / 10) % 2 === 0;
        g.fillStyle(0x445566, 1);
        if (even) {
            g.fillRect(x-3, cy, 6, 4);
            g.fillStyle(0x3a4a55, 1);
            g.fillRect(x-3, cy+4, 6, 6);
        } else {
            g.fillRect(x-4, cy, 8, 3);
            g.fillStyle(0x3a4a55, 1);
            g.fillRect(x-4, cy+3, 8, 7);
        }
        g.fillStyle(0x667788, 0.4);
        g.fillRect(x-2, cy, 2, 2);
    }
}

function addMushroom(scene, x, floorY) {
    var g = scene.add.graphics().setDepth(2);
    // Stem
    g.fillStyle(0x3a2550, 1);
    g.fillRect(x-3, floorY-14, 6, 14);
    g.fillStyle(0x2a1a38, 1);
    g.fillRect(x-2, floorY-14, 2, 14);
    // Cap
    g.fillStyle(0x7030a0, 1);
    g.fillEllipse(x, floorY-16, 20, 14);
    g.fillStyle(0x9040c0, 1);
    g.fillEllipse(x, floorY-17, 17, 10);
    // Spots
    g.fillStyle(0xd090f0, 0.7);
    g.fillRect(x-5, floorY-19, 3, 3);
    g.fillRect(x+3, floorY-18, 2, 2);
    // Glow halo
    g.fillStyle(0x8020c0, 0.08);
    g.fillCircle(x, floorY-14, 22);

    scene.tweens.add({
        targets: g, alpha: {from: 0.75, to: 1.0},
        duration: 700 + Math.random()*500, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: Math.random()*600
    });
}

function addSpikesGlow(scene, x1, x2) {
    var g = scene.add.graphics().setDepth(1);
    g.fillStyle(0x4400aa, 0.07);
    g.fillRect(x1, WORLD_H-80, x2-x1, 60);
    g.fillStyle(0x2200aa, 0.04);
    g.fillRect(x1, WORLD_H-120, x2-x1, 50);
}

function addTorch(scene, x, y) {
    // Wall bracket
    var bracket = scene.add.graphics().setDepth(3);
    bracket.fillStyle(0x5a3a18, 1);
    bracket.fillRect(x-5, y-2, 10, 6);
    bracket.fillRect(x-3, y+4, 6, 10);
    bracket.fillStyle(0x6a4822, 1);
    bracket.fillRect(x-4, y-8, 8, 8);

    // Warm glow
    var glow = scene.add.graphics().setDepth(2);
    glow.fillStyle(0xff7700, 0.07);
    glow.fillCircle(x, y-12, 70);
    glow.fillStyle(0xff9900, 0.05);
    glow.fillCircle(x, y-12, 40);

    // Flame
    var g = scene.add.graphics().setDepth(4);
    g.fillStyle(0xff4400, 1); g.fillCircle(x, y-13, 6);
    g.fillStyle(0xff8800, 1); g.fillCircle(x, y-16, 4);
    g.fillStyle(0xffcc00, 0.9); g.fillCircle(x, y-18, 2.5);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(x, y-19, 1.2);

    scene.tweens.add({
        targets: g, alpha: {from:1, to:0.35}, scaleX:{from:1, to:0.85},
        duration: 90 + Math.random()*130, yoyo:true, repeat:-1,
        ease:'Sine.easeInOut', delay: Math.random()*800
    });
    scene.tweens.add({
        targets: glow, alpha: {from:0.8, to:0.3},
        duration: 200 + Math.random()*200, yoyo:true, repeat:-1,
        ease:'Sine.easeInOut', delay: Math.random()*400
    });
}

function spawnDeadGoblin(scene) {
    if (goblinAbsorbed) return;
    var dg = deadMonstersGroup.create(480, WORLD_H-32, 'goblin_dead_img');
    dg.setOrigin(0.5, 1);
    dg.setScale(0.9);
    dg.setFlipX(true);
    dg.setData('monsterType', 'goblin');
    dg.refreshBody();

    if (!goblinArrow) {
        goblinArrow = scene.add.text(480, WORLD_H-210, '▼', {
            fontSize:'32px', fill:'#44ff66'
        }).setOrigin(0.5).setDepth(6);
        scene.tweens.add({
            targets: goblinArrow, y: WORLD_H-195,
            duration:480, yoyo:true, repeat:-1, ease:'Sine.easeInOut'
        });
    }
}

function updateHpDisplay() {
    hpText.setText(('♥ '.repeat(Math.max(playerHP,0)) + '♡ '.repeat(Math.max(3-playerHP,0))).trim());
}

function updateFormsBar() {
    if (absorbedForms.length === 0) { formsBar.setText(''); return; }
    var names = { slime:'СЛИЗЕНЬ', goblin:'ГОБЛИН' };
    var all = ['slime'].concat(absorbedForms);
    formsBar.setText('TAB: ' + all.map(function(f) {
        var n = names[f] || f.toUpperCase();
        return f === playerForm ? '[ '+n+' ]' : n;
    }).join(' → '));
}

// ── Damage ────────────────────────────────────────────────────────────────────
function onSpike(p, spike) {
    var now = this.time.now;
    if (now - lastHit < 900) return;
    lastHit = now;
    playerHP--;
    updateHpDisplay();
    player.setVelocityY(-370);
    player.setVelocityX(player.x > spike.x ? 200 : -200);
    this.cameras.main.shake(180, 0.012);
    if (playerHP <= 0) respawn.call(this);
}

function respawn() {
    playerHP = 3;
    updateHpDisplay();
    player.setPosition(120, WORLD_H-200);
    player.setVelocity(0, 0);
    applyForm.call(this, 'slime');
    hintText.setText('Погибли. Формы сохранены — TAB для переключения.');
    this.time.delayedCall(2500, function() { hintText.setText(''); });
}

// ── Формы ─────────────────────────────────────────────────────────────────────
// Body bottom offset from sprite.y for each form (body.bottom = sprite.y + FOOT_OFFSET[form])
var FOOT_OFFSET = { slime: 48, goblin: 100 };

function applyForm(type) {
    // Save body bottom in world coords
    var footY = player.body.bottom;

    playerForm = type;
    player.setFlipX(false);

    if (type === 'slime') {
        player.setTexture('slime_idle');
        player.setScale(3);
        // Display 96x96, origin (0.5,0.5) → displayOriginY=48
        // body.bottom = sprite.y - 48 + 56 + 40 = sprite.y + 48
        player.body.setSize(56, 40);
        player.body.setOffset(20, 56);
        formText.setText('Форма: Слизень');
        formText.setStyle({ fill:'#44ff66', fontSize:'20px' });
        player.anims.play('slime-idle', true);

    } else if (type === 'goblin') {
        player.setTexture('goblin_idle');
        player.setScale(1.0);
        // Display 200x200, origin (0.5,0.5) → displayOriginY=100
        // body.bottom = sprite.y - 100 + 60 + 140 = sprite.y + 100
        player.body.setSize(80, 140);
        player.body.setOffset(60, 60);
        formText.setText('Форма: Гоблин');
        formText.setStyle({ fill:'#99ff55', fontSize:'20px' });
        player.anims.play('goblin-idle', true);
    }

    // Reposition sprite so foot stays at same world Y
    // footY = sprite.y + FOOT_OFFSET → sprite.y = footY - FOOT_OFFSET
    var newSpriteY = footY - FOOT_OFFSET[type];
    player.body.reset(player.x, newSpriteY);

    updateFormsBar();
}

function cycleForm() {
    var all = ['slime'].concat(absorbedForms);
    var next = all[(all.indexOf(playerForm) + 1) % all.length];
    applyForm.call(this, next);
}

// ── Поглощение ────────────────────────────────────────────────────────────────
function performAbsorb(scene, dead) {
    absorbAnimating = true;
    hintText.setText('Поглощение...');
    var s = player.scaleX;
    scene.tweens.add({
        targets: player, scaleX: s*1.7, scaleY: s*1.7,
        duration: 200, yoyo: true,
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
            scene.time.delayedCall(2500, function() { hintText.setText(''); });
        }
    });
}

// ── Update ────────────────────────────────────────────────────────────────────
function update() {
    var onGround = player.body.blocked.down;
    var speed   = playerForm === 'slime' ? 180 : 340;
    var jumpVel = playerForm === 'slime' ? -330 : -700;
    var moving  = false;

    if (!absorbAnimating) {
        if (cursors.left.isDown || aKey.isDown) {
            player.setVelocityX(-speed);
            player.setFlipX(true);
            moving = true;
        } else if (cursors.right.isDown || dKey.isDown) {
            player.setVelocityX(speed);
            player.setFlipX(false);
            moving = true;
        }
        if ((cursors.up.isDown || wKey.isDown) && onGround) {
            player.setVelocityY(jumpVel);
        }
    }

    if (!absorbAnimating) {
        if (playerForm === 'slime') {
            player.anims.play(moving ? 'slime-run' : 'slime-idle', true);
        } else if (playerForm === 'goblin') {
            var vx = Math.abs(player.body.velocity.x);
            if (vx > 200)     player.anims.play('goblin-run',  true);
            else if (vx > 20) player.anims.play('goblin-walk', true);
            else              player.anims.play('goblin-idle', true);
        }
    }

    if (Phaser.Input.Keyboard.JustDown(tabKey) && absorbedForms.length > 0 && !absorbAnimating) {
        cycleForm.call(this);
    }

    var nearDead = null;
    var nearDist = 85;
    deadMonstersGroup.getChildren().forEach(function(d) {
        if (!d.active) return;
        var dist = Phaser.Math.Distance.Between(player.x, player.y, d.x, d.y);
        if (dist < nearDist) { nearDist = dist; nearDead = d; }
    });

    if (nearDead && !absorbAnimating) {
        hintText.setText('[ E ]  Поглотить ' + nearDead.getData('monsterType'));
    } else if (!absorbAnimating && hintText.text.startsWith('[ E ]')) {
        hintText.setText('');
    }

    if (Phaser.Input.Keyboard.JustDown(eKey) && nearDead && !absorbAnimating) {
        performAbsorb(this, nearDead);
    }
}
