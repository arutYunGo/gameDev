// ── Phaser game entry point ───────────────────────────────────────────────────
// Loaded last so all functions from other files are already defined.

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#060610',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:  GAME_W,
        height: GAME_H
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
