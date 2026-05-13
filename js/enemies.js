function spawnGoblinHunter(scene, x, y) {
    var enemy = liveMonsters.create(x, y, 'goblin_idle');
    enemy.setOrigin(0.5, 1);
    enemy.setScale(0.7);
    enemy.setDepth(5);
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(0.02);
    enemy.body.setSize(80, 120);
    enemy.body.setOffset(60, 60);
    enemy.setData('hp', 2);
    enemy.setData('lastAttack', 0);
    enemy.setData('monsterType', 'goblin');
    enemy.setTint(0xdd3333);
    enemy.anims.play('goblin-idle', true);
    return enemy;
}

function spawnGoblinFormTarget(scene, x, y) {
    var target = scene.add.image(x, y, 'goblin_dead_img');
    target.setOrigin(0.5, 1);
    target.setScale(0.65);
    target.setDepth(5);
    scene.physics.add.existing(target, true);
    target.body.setSize(96, 56);
    target.body.setOffset(0, 0);
    target.setData('hp', 999);
    target.setData('monsterType', 'goblin');
    target.setData('isFormTarget', true);
    target.setTint(0x99ff99);

    goblinArrow = scene.add.text(x, y - 190, '▼', {
        fontSize: '26px', fill: '#44ff66'
    }).setOrigin(0.5).setDepth(6);
    scene.tweens.add({ targets: goblinArrow, y: y - 175, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    return target;
}

function becomeGoblin(scene, target) {
    if (!target || !target.active) return;
    target.destroy();
    goblinAbsorbed = true;
    if (goblinArrow) { goblinArrow.destroy(); goblinArrow = null; }
    if (absorbedForms.indexOf('goblin') === -1) absorbedForms.push('goblin');
    applyForm.call(scene, 'goblin');
    showAbilityHud(scene);
    hintText.setText('Вы стали гоблином!');
    scene.time.delayedCall(1800, function() {
        if (hintText && hintText.text === 'Вы стали гоблином!') hintText.setText('');
    });
}

function hurtPlayer(scene, sourceX) {
    var now = scene.time.now;
    if (now - lastHit < 900) return;
    lastHit = now;
    playerHP--;
    updateHpDisplay();
    // White flash → red
    player.setTint(0xffffff);
    scene.time.delayedCall(60, function() { if (player) player.setTint(0xff3333); });
    scene.time.delayedCall(220, function() { if (player) player.clearTint(); });
    // Knockback away from source
    player.setVelocityY(-300);
    player.setVelocityX(player.x > sourceX ? 260 : -260);
    scene.cameras.main.shake(180, 0.016);
    if (playerHP <= 0) respawn.call(scene);
}

function spawnDeathParticles(scene, x, y, color) {
    for (var i = 0; i < 5; i++) {
        var angle = (Math.PI * 2 / 5) * i + Math.random() * 0.5;
        var speed = 120 + Math.random() * 160;
        var px = x, py = y - 20;
        var tx = px + Math.cos(angle) * speed * 0.35;
        var ty = py + Math.sin(angle) * speed * 0.35 + 60;
        var sq = scene.add.rectangle(px, py, 7, 7, color).setDepth(10);
        scene.tweens.add({
            targets: sq,
            x: tx, y: ty,
            alpha: 0, scaleX: 0.1, scaleY: 0.1,
            duration: 320 + Math.random() * 180,
            ease: 'Quad.easeOut',
            // tween.targets[0] avoids the var-in-loop closure bug where all
            // 5 onComplete callbacks would share the same (last) `sq` reference.
            onComplete: function(tween) { tween.targets[0].destroy(); }
        });
    }
}

function attackEnemy(scene, enemy) {
    if (!enemy || !enemy.active) return;
    var hp = enemy.getData('hp') - 1;
    enemy.setData('hp', hp);
    var kbDir = enemy.x >= player.x ? 1 : -1;
    enemy.setVelocityX(340 * kbDir);
    enemy.setVelocityY(-220);
    scene.cameras.main.shake(55, 0.012);
    // White flash on hit
    enemy.setTint(0xffffff);
    scene.time.delayedCall(80, function() {
        if (!enemy || !enemy.active) return;
        enemy.setTint(0xff4444);
    });
    scene.time.delayedCall(220, function() { if (enemy && enemy.active) enemy.setTint(0xdd3333); });
    if (hp <= 0) {
        spawnDeathParticles(scene, enemy.x, enemy.y, 0x88ff44);
        enemy.destroy();
        hintText.setText('Враг повержен!');
        scene.time.delayedCall(1400, function() {
            if (hintText && hintText.text === 'Враг повержен!') hintText.setText('');
        });
    }
}

function updateEnemies(scene) {
    var nearEnemy = null;
    var nearest = 180;

    liveMonsters.getChildren().forEach(function(enemy) {
        if (!enemy.active) return;
        if (enemy.getData('isFormTarget')) return;

        var dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (dist < nearest) {
            nearest = dist;
            nearEnemy = enemy;
        }

        // Skip AI while attacking
        if (enemy.getData('isAttacking')) return;

        if (dist < 280) {
            var dir = player.x > enemy.x ? 1 : -1;
            enemy.setVelocityX(110 * dir);
            enemy.setFlipX(dir < 0);
            var anim = Math.abs(enemy.body.velocity.x) > 20 ? 'goblin-run' : 'goblin-idle';
            enemy.anims.play(anim, true);
        } else {
            enemy.setVelocityX(0);
            enemy.anims.play('goblin-idle', true);
        }

        // Melee attack with cooldown
        if (dist < 80) {
            var now = scene.time.now;
            if (now - (enemy.getData('lastAttack') || 0) > 1400) {
                enemy.setData('lastAttack', now);
                enemy.setData('isAttacking', true);
                enemy.setVelocityX(0);
                enemy.anims.play('goblin-attack', true);
                // Hit lands mid-animation (~430 ms)
                scene.time.delayedCall(430, function() {
                    if (!enemy || !enemy.active) return;
                    var d = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                    if (d < 110) hurtPlayer(scene, enemy.x);
                });
                // Release attack state after anim (~800 ms)
                scene.time.delayedCall(800, function() {
                    if (enemy && enemy.active) enemy.setData('isAttacking', false);
                });
            }
        }
    });

    return nearEnemy;
}
