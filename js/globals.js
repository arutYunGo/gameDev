// ── world & game constants ────────────────────────────────────────────────────
const WORLD_W = 1200;
const WORLD_H = 900;
const GAME_W  = 1200;
const GAME_H  = 900;
const CAM_ZOOM  = 1;             // No zoom needed for single screen
const FLOOR_Y   = 880;  // Match the new bottom floor y

// ── global state ──────────────────────────────────────────────────────────────
var player, platforms, deadMonstersGroup, liveMonsters, traps;
var playerMarker = null;
var cursors, eKey, wKey, aKey, dKey, tabKey, spaceKey;
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
        // Bounds are set in level.js create() based on map dimensions
        this.cam.setZoom(this.zoom);
        this.cam.setDeadzone(280, 160);
        this.cam.startFollow(this.target, true, this.lerp, this.lerp, 0, this.offsetY);
        this.cam.centerOn(this.target.x, this.target.y + this.offsetY);
    }
    update() {}
}
