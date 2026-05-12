function spawnGoblinHunter(scene, x, y) {
    var enemy = liveMonsters.create(x, y, 'goblin_idle');
    enemy.setOrigin(0.5, 1);
    enemy.setScale(0.7);
    enemy.setDepth(5);
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(0.02);
    enemy.body.setSize(80, 120);
    enemy.body.setOffset(60, 60);
    enemy.setData('hp', 4);
    enemy.setData('lastAttack', 0);
    enemy.setData('monsterType', 'goblin');
    enemy.anims.play('goblin-idle', true);
    return enemy;
}

function spawnGoblinFormTarget(scene, x, y) {
    var target = liveMonsters.create(x, y, 'goblin_idle');
    target.setOrigin(0.5, 1);
    target.setScale(0.7);
    target.setDepth(5);
    target.setCollideWorldBounds(true);
    target.body.setSize(80, 120);
    target.body.setOffset(60, 60);
    target.setData('hp', 999);
    target.setData('monsterType', 'goblin');
    target.setData('isFormTarget', true);
    target.setImmovable(true);
    target.body.allowGravity = true;
    target.body.moves = false;
    target.anims.play('goblin-idle', true);

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
    player.setVelocityY(-300);
    player.setVelocityX(player.x > sourceX ? 220 : -220);
    scene.cameras.main.shake(180, 0.016);
    if (playerHP <= 0) respawn.call(scene);
}

function attackEnemy(scene, enemy) {
    if (!enemy || !enemy.active) return;
    var hp = enemy.getData('hp') - 1;
    enemy.setData('hp', hp);
    scene.cameras.main.shake(60, 0.01);
    enemy.setTint(0xff9999);
    scene.time.delayedCall(120, function() {
        if (enemy && enemy.clearTint) enemy.clearTint();
    });
    if (hp <= 0) {
        var corpse = scene.add.rectangle(enemy.x, enemy.y - 40, 48, 24, 0x551a1a, 0.85).setDepth(4);
        scene.time.delayedCall(400, function() { if (corpse) corpse.destroy(); });
        enemy.destroy();
        hintText.setText('Враг повержен!');
        scene.time.delayedCall(1400, function() {
            if (hintText && hintText.text === 'Враг повержен!') hintText.setText('');
        });
    }
}

function updateEnemies(scene) {
    var nearEnemy = null;
    var nearest = 120;

    liveMonsters.getChildren().forEach(function(enemy) {
        if (!enemy.active) return;

        var dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (dist < nearest) {
            nearest = dist;
            nearEnemy = enemy;
        }

        if (enemy.getData('isFormTarget')) {
            enemy.setVelocityX(0);
            enemy.anims.play('goblin-idle', true);
            return;
        }

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

        if (dist < 80) {
            hurtPlayer(scene, enemy.x);
        }
    });

    return nearEnemy;
}
