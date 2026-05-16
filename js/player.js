// ── animations ────────────────────────────────────────────────────────────────
function createAnims(scene) {
    var a = scene.anims;
    if (!a.exists('slime-idle'))    a.create({ key:'slime-idle',    frames: a.generateFrameNumbers('slime_idle',   {start:0,end:3}),  frameRate:6,  repeat:-1 });
    if (!a.exists('slime-run'))     a.create({ key:'slime-run',     frames: a.generateFrameNumbers('slime_run',    {start:0,end:5}),  frameRate:10, repeat:-1 });
    if (!a.exists('goblin-idle'))   a.create({ key:'goblin-idle',   frames: a.generateFrameNumbers('goblin_idle',  {start:0,end:8}),  frameRate:8,  repeat:-1 });
    if (!a.exists('goblin-walk'))   a.create({ key:'goblin-walk',   frames: a.generateFrameNumbers('goblin_walk',  {start:0,end:8}),  frameRate:10, repeat:-1 });
    if (!a.exists('goblin-run'))    a.create({ key:'goblin-run',    frames: a.generateFrameNumbers('goblin_run',   {start:0,end:8}),  frameRate:12, repeat:-1 });
    if (!a.exists('goblin-attack')) a.create({ key:'goblin-attack', frames: a.generateFrameNumbers('goblin_attack',{start:0,end:10}), frameRate:14, repeat:0  });
}

// ── preload (Phaser scene entry point) ────────────────────────────────────────
function preload() {
    console.log('[GAME] preload() start');
    // Removed Tiled map/tileset loading — level now generated procedurally

    this.load.spritesheet('slime_idle',    'sptrites/FreeSlime/slime_idle.png', { frameWidth:32,  frameHeight:32  });
    this.load.spritesheet('slime_run',     'sptrites/FreeSlime/slime_run.png',  { frameWidth:32,  frameHeight:32  });
    this.load.spritesheet('goblin_idle',   'sptrites/free/free/idle.png',       { frameWidth:200, frameHeight:200 });
    this.load.spritesheet('goblin_walk',   'sptrites/free/free/walk.png',       { frameWidth:200, frameHeight:200 });
    this.load.spritesheet('goblin_run',    'sptrites/free/free/run.png',        { frameWidth:200, frameHeight:200 });
    this.load.spritesheet('goblin_attack', 'sptrites/free/free/attack1.png',    { frameWidth:200, frameHeight:200 });
    this.load.image('goblin_dead_img',     'sptrites/free/free/die/die_0010.png');

    this.textures.addCanvas('stone', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#1c1828'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#241e30'; ctx.fillRect(0, 6, 32, 26);
        ctx.fillStyle = '#100f1a';
        ctx.fillRect(0,15,32,1); ctx.fillRect(0,26,32,1);
        ctx.fillRect(16,6,1,9); ctx.fillRect(8,16,1,10); ctx.fillRect(24,16,1,10);
        ctx.fillStyle = '#284520'; ctx.fillRect(0, 0, 32, 6);
        ctx.fillStyle = '#3c6028'; ctx.fillRect(0, 0, 32, 3);
        ctx.fillStyle = '#4e7830'; ctx.fillRect(0, 0, 32, 1);
        ctx.fillStyle = '#62902f';
        ctx.fillRect(1,0,4,2); ctx.fillRect(8,0,2,1); ctx.fillRect(12,0,3,2);
        ctx.fillRect(19,0,2,1); ctx.fillRect(23,0,4,2); ctx.fillRect(29,0,2,1);
    }));

    this.textures.addCanvas('wall', makeCanvas(32, 32, function(ctx) {
        ctx.fillStyle = '#0d0c18'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#131222'; ctx.fillRect(2, 2, 28, 28);
        ctx.fillStyle = '#080812';
        ctx.fillRect(0,11,32,1); ctx.fillRect(0,22,32,1);
        ctx.fillRect(16,0,1,11); ctx.fillRect(8,12,1,10); ctx.fillRect(24,12,1,10); ctx.fillRect(16,23,1,9);
    }));

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

// ── form system ───────────────────────────────────────────────────────────────
function applyForm(type) {
    var footY = player.y;
    playerForm = type;
    player.setFlipX(false);







        if (type === 'slime') {
            player.setTexture('slime_idle').setOrigin(0.5, 1).setScale(2.4);
            // Making the hitbox very thin and pushing it slightly BEYOND the 32px frame
            // to compensate for empty space in the sprite.
            player.body.setSize(20, 6);
            player.body.setOffset(6, 28);
            player.setDragX(420); // slippery
        formText.setText('Форма: Слизень');
        formText.setStyle({ fill:'#44ff66', fontSize: Math.round(14 / CAM_ZOOM) + 'px' });
        player.anims.play('slime-idle', true);
    } else if (type === 'goblin') {
        player.setTexture('goblin_idle').setOrigin(0.5, 1).setScale(0.7);
        player.body.setSize(80, 120).setOffset(60, 60);
        player.setDragX(1100);
        formText.setText('Форма: Гоблин');
        formText.setStyle({ fill:'#99ff55', fontSize: Math.round(14 / CAM_ZOOM) + 'px' });
        player.anims.play('goblin-idle', true);
    }

    player.body.reset(player.x, footY);
    updateFormsBar();
}

function cycleForm() {
    var all = ['slime'].concat(absorbedForms);
    applyForm.call(this, all[(all.indexOf(playerForm) + 1) % all.length]);
}

function performAbsorb(scene, dead) {
    absorbAnimating = true;
    hintText.setText('Поглощение...');
    // Impact: camera shake + hitstop
    scene.cameras.main.shake(120, 0.018);
    scene.physics.world.pause();
    scene.time.delayedCall(160, function() { scene.physics.world.resume(); });
    var s = player.scaleX;
    scene.tweens.add({
        targets: player, scaleX: s * 1.7, scaleY: s * 1.7, duration: 200, yoyo: true,
        onComplete: function() {
            var type = dead.getData('monsterType');
            dead.destroy();
            if (type === 'goblin') {
                goblinAbsorbed = true;
                if (goblinArrow) { goblinArrow.destroy(); goblinArrow = null; }
                showAbilityHud(scene);
            }
            if (absorbedForms.indexOf(type) === -1) absorbedForms.push(type);
            applyForm.call(scene, type);
            absorbAnimating = false;
            hintText.setText('Поглощён ' + type + '!  TAB — смена формы.');
            scene.time.delayedCall(2500, function() { hintText.setText(''); });
        }
    });
}

// ── damage & respawn ──────────────────────────────────────────────────────────
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
    playerHP       = playerMaxHP;
    lastHit        = 0;
    playerForm     = 'slime';
    absorbedForms  = [];
    goblinAbsorbed = false;
    goblinFormTarget = null;
    playerMarker   = null;
    abilityHudShown = false;
    ePlate  = null;
    tabPlate = null;
    this.scene.restart();
}

// ── attack ────────────────────────────────────────────────────────────────────
function playerAttack(scene, enemy) {
    if (playerAttacking || playerForm !== 'goblin') return;
    playerAttacking = true;
    player.anims.play('goblin-attack', true);

    // Hit check at ~frame 6 (430 ms @ 14 fps)
    scene.time.delayedCall(430, function() {
        if (!enemy || !enemy.active) return;
        var dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (dist > 110) return;
        var inFront = player.flipX ? (enemy.x <= player.x + 20) : (enemy.x >= player.x - 20);
        if (!inFront) return;
        attackEnemy(scene, enemy);
    });

    // Release lock after anim (800 ms)
    scene.time.delayedCall(800, function() {
        playerAttacking = false;
        if (playerForm === 'goblin') player.anims.play('goblin-idle', true);
    });
}

// ── update (Phaser scene entry point) ─────────────────────────────────────────
function update() {
    // trace every few seconds to ensure update runs
    if (Math.floor(this.time.now / 2000) % 5 === 0 && this._lastTrace !== Math.floor(this.time.now / 2000)) {
        this._lastTrace = Math.floor(this.time.now / 2000);
        console.log('[GAME] update tick, player exists?', !!player);
    }
    var onGround = player.body.blocked.down;
    var speed    = playerForm === 'slime' ? 220 : 360;
    var jumpVel  = playerForm === 'slime' ? -520 : -620;
    var moving   = false;

    if (onGround) canWallJump = true;

    if (!absorbAnimating) {
        if (cursors.left.isDown  || aKey.isDown) { player.setVelocityX(-speed); player.setFlipX(true);  moving = true; }
        else if (cursors.right.isDown || dKey.isDown) { player.setVelocityX(speed); player.setFlipX(false); moving = true; }
        if ((cursors.up.isDown || wKey.isDown) && onGround) player.setVelocityY(jumpVel);

        // Wall jump — slime only, single use per air time
        if (playerForm === 'slime' && !onGround && canWallJump) {
            var jumpJustDown = Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(wKey);
            var onWallLeft   = player.body.blocked.left;
            var onWallRight  = player.body.blocked.right;
            if (jumpJustDown && (onWallLeft || onWallRight)) {
                player.setVelocityY(-500);
                player.setVelocityX(onWallLeft ? 300 : -300);
                canWallJump = false;
            }
        }
    }

    if (!absorbAnimating && !playerAttacking) {
        if (playerForm === 'slime') {
            player.anims.play(moving ? 'slime-run' : 'slime-idle', true);
        } else if (playerForm === 'goblin') {
            var vx = Math.abs(player.body.velocity.x);
            player.anims.play(vx > 200 ? 'goblin-run' : vx > 20 ? 'goblin-walk' : 'goblin-idle', true);
        }
    }

    if (playerMarker) {
        var bob = Math.sin(this.time.now / 280) * 5;
        playerMarker.setPosition(player.x, player.y - player.displayHeight - 6 + bob);
    }

    if (gameCamera) gameCamera.update();
    updateVisibility(this);

    if (Phaser.Input.Keyboard.JustDown(tabKey) && absorbedForms.length && !absorbAnimating) cycleForm.call(this);

    var nearDead = null, nearDist = 180;
    deadMonstersGroup.getChildren().forEach(function(d) {
        if (!d.active || !d.visible) return;
        var dist = Phaser.Math.Distance.Between(player.x, player.y, d.x, d.y);
        if (dist <= nearDist) { nearDist = dist; nearDead = d; }
    });

    var nearEnemy = updateEnemies(this);
    var nearFormTarget = null;
    if (goblinFormTarget && goblinFormTarget.active) {
        var dist = Phaser.Math.Distance.Between(player.x, player.y, goblinFormTarget.x, goblinFormTarget.y);
        if (dist <= 160) nearFormTarget = goblinFormTarget;
    }

    var canBecomeGoblin = nearFormTarget && playerForm === 'slime';
    var canGoblinAttack = playerForm === 'goblin';

    // Update E plate label dynamically (plates visible after goblin absorbed)
    if (abilityHudShown) {
        if (canBecomeGoblin)        updateEPlate('Стать\nгоблином');
        else if (canGoblinAttack)   updateEPlate('Атака');
        else if (nearDead)          updateEPlate('Поглотить');
        else                        updateEPlate('Атака');
    } else {
        // Before goblin absorbed — use hintText as before
        if (canBecomeGoblin && !absorbAnimating) {
            hintText.setText('[ E ] — Стать гоблином');
        } else if (nearDead && !absorbAnimating) {
            hintText.setText('[ E ] — Поглотить');
        } else if (!absorbAnimating && hintText.text.startsWith('[ E ]')) {
            hintText.setText('');
        }
    }

    var eDown     = Phaser.Input.Keyboard.JustDown(eKey);
    var spaceDown = Phaser.Input.Keyboard.JustDown(spaceKey);
    if (eDown && canBecomeGoblin && !absorbAnimating) {
        becomeGoblin(this, nearFormTarget);
    } else if ((eDown || spaceDown) && canGoblinAttack && !absorbAnimating && !playerAttacking) {
        playerAttack(this, nearEnemy);
    } else if (eDown && nearDead && !absorbAnimating) {
        performAbsorb(this, nearDead);
    }
}
