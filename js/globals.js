// ── world & game constants ────────────────────────────────────────────────────
const WORLD_W = 4800;
const WORLD_H = 900;
const GAME_W  = Math.round(900 * (window.innerWidth / window.innerHeight));
const GAME_H  = 900;
const CAM_ZOOM  = 1.8;             // must match GameCamera.zoom
const FLOOR_Y   = WORLD_H - 180;  // y-center of main floor tiles

// ── global state ──────────────────────────────────────────────────────────────
var player, platforms, deadMonstersGroup, liveMonsters, traps;
var cursors, eKey, wKey, aKey, dKey, tabKey;
var playerForm = 'slime';
var absorbedForms = [];
var formText, hintText, hpBar, formsBar, tabHint;
var ePlate = null, tabPlate = null, abilityHudShown = false;
var absorbAnimating  = false;
var playerAttacking  = false;
var canWallJump      = true;
var playerMaxHP = 5;
var playerHP    = playerMaxHP;
var lastHit     = 0;
var goblinArrow     = null;
var goblinAbsorbed  = false;
var goblinFormTarget = null;
var gameCamera  = null;

// ── camera controller ─────────────────────────────────────────────────────────
class GameCamera {
    constructor(scene, target) {
        this.scene  = scene;
        this.target = target;
        this.cam    = scene.cameras.main;
        this.zoom   = CAM_ZOOM;
        this.lerp   = 0.14;
        this.offsetY = -24;
        this.cam.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cam.setZoom(this.zoom);
        this.cam.setDeadzone(280, 160);
        this.cam.startFollow(this.target, true, this.lerp, this.lerp, 0, this.offsetY);
        this.cam.centerOn(this.target.x, this.target.y + this.offsetY);
    }
    update() {}
}
