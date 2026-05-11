const WORLD_W = 4800;
const WORLD_H = 900;

const GAME_W = Math.round(900 * (window.innerWidth / window.innerHeight));
const GAME_H = 900;

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#0d0d1a',
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

// ── Глобальное состояние ──────────────────────────────────────────────────────
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

// ── Canvas helper ─────────────────────────────────────────────────────────────
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

    // Конкретный кадр (10-й) — гоблин лежит мёртвый
    this.load.image('goblin_dead_img', 'sptrites/free/free/die/die_0010.png');

    this.textures.addCanvas('stone', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#4a4a5a'; ctx.fillRect(0,0,32,32);
        ctx.strokeStyle = '#333344'; ctx.lineWidth=1; ctx.strokeRect(0.5,0.5,31,31);
        ctx.strokeStyle = 'rgba(100,100,120,0.3)';
        ctx.beginPath(); ctx.moveTo(0,11); ctx.lineTo(32,11); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(16,11); ctx.lineTo(16,32); ctx.stroke();
    }));
    this.textures.addCanvas('wall', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#1e1e28'; ctx.fillRect(0,0,32,32);
        ctx.strokeStyle = '#141420'; ctx.lineWidth=1; ctx.strokeRect(0.5,0.5,31,31);
    }));
    this.textures.addCanvas('spikes', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#555566'; ctx.fillRect(0,20,32,12);
        ctx.fillStyle = '#888899';
        for (var i=0;i<4;i++){
            ctx.beginPath();
            ctx.moveTo(i*8+4,0); ctx.lineTo(i*8,20); ctx.lineTo(i*8+8,20);
            ctx.closePath(); ctx.fill();
        }
    }));
}

// ── Анимации ──────────────────────────────────────────────────────────────────
function createAnims(scene) {
    scene.anims.create({ key:'slime-idle', frames:scene.anims.generateFrameNumbers('slime_idle',{start:0,end:3}), frameRate:6,  repeat:-1 });
    scene.anims.create({ key:'slime-run',  frames:scene.anims.generateFrameNumbers('slime_run', {start:0,end:5}), frameRate:10, repeat:-1 });

    // idle/walk/run — 3×3 сетка = 9 кадров (0-8)
    scene.anims.create({ key:'goblin-idle', frames:scene.anims.generateFrameNumbers('goblin_idle',{start:0,end:8}), frameRate:8,  repeat:-1 });
    scene.anims.create({ key:'goblin-walk', frames:scene.anims.generateFrameNumbers('goblin_walk',{start:0,end:8}), frameRate:10, repeat:-1 });
    scene.anims.create({ key:'goblin-run',  frames:scene.anims.generateFrameNumbers('goblin_run', {start:0,end:8}), frameRate:12, repeat:-1 });
}

// ── Create ────────────────────────────────────────────────────────────────────
function create() {
    createAnims(this);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.add.rectangle(WORLD_W/2, WORLD_H/2, WORLD_W, WORLD_H, 0x0a0a14).setDepth(-5);

    for (var cx=0; cx<WORLD_W; cx+=32)
        this.add.image(cx+16, 16, 'wall').setDepth(-1);
    for (var wy=0; wy<WORLD_H; wy+=32) {
        this.add.image(16, wy+16, 'wall').setDepth(-1);
        this.add.image(WORLD_W-16, wy+16, 'wall').setDepth(-1);
    }

    // ── Платформы ─────────────────────────────────────────────────────────
    platforms = this.physics.add.staticGroup();
    function floor(x1, x2) {
        for (var x=x1; x<x2; x+=32) platforms.create(x+16, WORLD_H-16, 'stone');
    }
    function shelf(x1, x2, y) {
        for (var x=x1; x<x2; x+=32) platforms.create(x+16, y, 'stone');
    }
    // Мир 4800×900: секции с ямами и полками
    floor(32,    864);           // старт
    // 864-1088: яма с шипами
    floor(1088,  2048);          // секция 2
    // 2048-2240: прыжковый пролёт
    floor(2240,  3200);          // секция 3
    // 3200-3456: яма с шипами
    floor(3456,  4736);          // финальная секция

    // Полки (только для гоблина — высоко)
    shelf(1200, 1600,  WORLD_H-280);
    shelf(2400, 2800,  WORLD_H-300);
    shelf(3600, 4000,  WORLD_H-260);

    // ── Шипы ──────────────────────────────────────────────────────────────
    traps = this.physics.add.staticGroup();
    for (var sx=864;  sx<1088; sx+=32) traps.create(sx+16,  WORLD_H-48, 'spikes').refreshBody();
    for (var sx2=3200; sx2<3456; sx2+=32) traps.create(sx2+16, WORLD_H-48, 'spikes').refreshBody();

    // ── Мёртвый гоблин ────────────────────────────────────────────────────
    deadMonstersGroup = this.physics.add.staticGroup();
    spawnDeadGoblin(this);

    liveMonsters = this.physics.add.group();

    // ── Игрок (слизень) ───────────────────────────────────────────────────
    player = this.physics.add.sprite(120, WORLD_H-120, 'slime_idle');
    player.setScale(3);
    player.setBounce(0.05);
    player.setCollideWorldBounds(true);
    player.setDragX(1400);
    player.setDepth(5);
    player.body.setSize(32, 32, true);
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

    hintText = this.add.text(GAME_W/2, GAME_H - 20, '', {
        fontSize:'15px', fill:'#ffee44',
        backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20).setOrigin(0.5, 1);

    this.add.text(16, 72, 'A/D ← →   прыжок W/↑   E поглотить   TAB смена формы', {
        fontSize:'11px', fill:'#667777',
        backgroundColor:'#00000077', padding:{x:6,y:3}
    }).setScrollFactor(0).setDepth(20);

    hpText = this.add.text(GAME_W - 16, 16, '♥ ♥ ♥', {
        fontSize:'22px', fill:'#ff4444',
        backgroundColor:'#00000099', padding:{x:8,y:4}
    }).setScrollFactor(0).setDepth(20).setOrigin(1,0);

    this.add.text(120, WORLD_H-60, 'СТАРТ', {fontSize:'16px', fill:'#445544'}).setOrigin(0.5).setDepth(5);
    this.add.text(4680, WORLD_H-60, '[ ВЫХОД ]', {
        fontSize:'24px', fill:'#ffcc00', backgroundColor:'#00000099', padding:{x:10,y:5}
    }).setOrigin(0.5).setDepth(5);

    // Факелы по всему новому миру
    [[600,WORLD_H-55],[1400,WORLD_H-55],[2200,WORLD_H-55],[3000,WORLD_H-55],
     [3800,WORLD_H-55],[4400,WORLD_H-55],[1300,WORLD_H-295],[2500,WORLD_H-315]
    ].forEach(function(t){ addTorch(this,t[0],t[1]); }, this);

    cursors = this.input.keyboard.createCursorKeys();
    eKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    wKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    aKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    dKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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


function addTorch(scene, x, y) {
    var g = scene.add.graphics().setDepth(3);
    g.fillStyle(0x887755,1); g.fillRect(-3,-10,6,10);
    g.fillStyle(0xff8800,1); g.fillCircle(0,-13,5);
    g.fillStyle(0xffdd00,0.35); g.fillCircle(0,-13,10);
    g.x=x; g.y=y;
    scene.tweens.add({
        targets:g, alpha:{from:1,to:0.45},
        duration:110+Math.random()*200, yoyo:true, repeat:-1,
        ease:'Sine.easeInOut', delay:Math.random()*700
    });
}

function updateHpDisplay() {
    hpText.setText(('♥ '.repeat(Math.max(playerHP,0))+'♡ '.repeat(Math.max(3-playerHP,0))).trim());
}

function updateFormsBar() {
    if (absorbedForms.length === 0) { formsBar.setText(''); return; }
    var names = { slime:'СЛИЗЕНЬ', goblin:'ГОБЛИН' };
    var all = ['slime'].concat(absorbedForms);
    formsBar.setText('TAB: ' + all.map(function(f){
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

function onBatTouch(p, bat) {
    var now = this.time.now;
    if (now - lastHit < 800) return;
    lastHit = now;
    playerHP--;
    updateHpDisplay();
    player.setVelocityX(player.x > bat.x ? 260 : -260);
    player.setVelocityY(-200);
    this.cameras.main.shake(140, 0.008);
    if (playerHP <= 0) respawn.call(this);
}

function respawn() {
    playerHP = 3;
    updateHpDisplay();
    player.setPosition(120, WORLD_H-120);
    player.setVelocity(0, 0);
    applyForm.call(this, 'slime');
    hintText.setText('Погибли. Формы сохранены — TAB для переключения.');
    this.time.delayedCall(2500, function(){ hintText.setText(''); });
}

// ── Формы ─────────────────────────────────────────────────────────────────────

function applyForm(type) {
    // Save foot position before any body resize to prevent sinking through floor
    var footY = player.y + player.body.halfHeight;

    playerForm = type;
    player.setFlipX(false);

    if (type === 'slime') {
        player.setTexture('slime_idle');
        player.setScale(3);
        player.body.setSize(32, 32, true);
        formText.setText('Форма: Слизень');
        formText.setStyle({ fill:'#44ff66', fontSize:'20px' });
        player.anims.play('slime-idle', true);

    } else if (type === 'goblin') {
        player.setTexture('goblin_idle');
        player.setScale(1.0);
        player.body.setSize(80, 140, true);
        formText.setText('Форма: Гоблин');
        formText.setStyle({ fill:'#99ff55', fontSize:'20px' });
        player.anims.play('goblin-idle', true);
    }

    // Restore foot to same world position so player doesn't sink
    player.body.reset(player.x, footY - player.body.halfHeight);

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
            scene.time.delayedCall(2500, function(){ hintText.setText(''); });
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
            player.setFlipX(true);   // оба спрайта смотрят вправо по умолчанию
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

    // ── Анимация ──────────────────────────────────────────────────────────
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

    // ── TAB — смена формы ─────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(tabKey) && absorbedForms.length > 0 && !absorbAnimating) {
        cycleForm.call(this);
    }

    // ── E — поглощение ────────────────────────────────────────────────────
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
