// ── texture builder ───────────────────────────────────────────────────────────
function makeCanvas(w, h, fn) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'));
    return c;
}

// ── background ────────────────────────────────────────────────────────────────
function buildBgPattern(scene) {
    var g = scene.add.graphics().setDepth(-6);
    for (var x = 32; x < WORLD_W - 32; x += 64) {
        for (var y = 32; y < WORLD_H - 32; y += 40) {
            var shade = ((x + y) % 128 < 64) ? 0x10101d : 0x141523;
            g.fillStyle(shade, 1);
            g.fillRect(x, y, 62, 38);
            if (((x / 64 + y / 40) % 5) === 0) {
                g.fillStyle(0x243a1d, 0.18);
                g.fillRect(x + 10, y + 10, 16, 8);
            }
            if (((x / 32 + y / 20) % 7) === 0) {
                g.fillStyle(0x2c4f21, 0.1);
                g.fillCircle(x + 44, y + 26, 6);
            }
        }
    }
}

// ── stalactites (ceiling) ─────────────────────────────────────────────────────
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
        var sx = defs[i], sh = defs[i + 1];
        g.fillStyle(0x1b1725, 1);
        g.fillTriangle(sx - 8, 32, sx + 8, 32, sx, 32 + sh);
        g.fillStyle(0x2d2c44, 1);
        g.fillTriangle(sx - 3, 32, sx + 3, 32, sx, 32 + sh);
        g.fillStyle(0x394b78, 0.55);
        g.fillCircle(sx, 32 + sh + 2, 2.5);
        g.fillStyle(0x0f1017, 0.16);
        g.fillRect(sx - 10, 32 + sh - 6, 20, 7);
    }
}

// ── stalagmites (floor) ───────────────────────────────────────────────────────
function buildStalagmites(scene) {
    var defs = [
        120,40, 260,58, 420,30, 640,50, 780,36,
        940,48, 1120,38, 1280,56, 1460,44, 1640,30,
        1820,54, 2000,42, 2180,60, 2360,34, 2540,48,
        2720,38, 2900,62, 3080,40, 3260,50, 3440,34,
        3620,58, 3800,46, 3980,36, 4160,60, 4340,42, 4520,32
    ];
    var g = scene.add.graphics().setDepth(-2);
    var baseY = WORLD_H - 32;
    for (var i = 0; i < defs.length; i += 2) {
        var sx = defs[i], sh = defs[i + 1];
        g.fillStyle(0x141221, 1);
        g.fillTriangle(sx - 8, baseY, sx + 8, baseY, sx, baseY - sh);
        g.fillStyle(0x242441, 1);
        g.fillTriangle(sx - 3, baseY, sx + 3, baseY, sx, baseY - sh);
        g.fillStyle(0x2f4370, 0.48);
        g.fillCircle(sx, baseY - sh + 4, 2.5);
    }
}

// ── hanging vines ─────────────────────────────────────────────────────────────
function buildCaveVines(scene) {
    var vines = [
        [140,48,90], [320,42,100], [540,60,82], [780,38,110], [1010,52,88],
        [1620,46,94], [1980,40,98], [2360,52,84], [2740,56,92], [3120,44,80]
    ];
    vines.forEach(function(v) {
        var x = v[0], y = v[1], len = v[2];
        var g = scene.add.graphics().setDepth(-1);
        g.lineStyle(2, 0x244924, 1);
        for (var i = 0; i <= len; i += 6) {
            var px = x + Math.sin(i * 0.18) * 3, py = y + i;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        g.fillStyle(0x2f5e29, 0.45);
        g.fillCircle(x, y + len - 6, 5);
    });
}

// ── wooden shop structure ─────────────────────────────────────────────────────
function buildWoodenShop(scene) {
    var shopX = 1750, shopY = WORLD_H - 420, shopW = 300, shopH = 180;
    var g = scene.add.graphics().setDepth(-3);
    g.fillStyle(0x3d2a18, 1); g.fillRect(shopX, shopY, shopW, shopH);
    g.fillStyle(0x5b3f25, 1);
    g.fillRect(shopX + 10, shopY + 18, shopW - 20, 18);
    g.fillRect(shopX + 10, shopY + shopH - 28, shopW - 20, 12);
    g.fillStyle(0x4f3826, 1);
    for (var px = shopX + 16; px < shopX + shopW - 16; px += 28)
        g.fillRect(px, shopY + 20, 16, shopH - 42);

    var shelf = scene.add.graphics().setDepth(-2);
    shelf.fillStyle(0x6b4d34, 1);
    shelf.fillRect(shopX + 32, shopY + 42, 236, 10);
    shelf.fillRect(shopX + 32, shopY + 74, 236, 10);
    shelf.fillRect(shopX + 32, shopY + 106, 236, 10);

    var coin = scene.add.graphics().setDepth(-1);
    coin.fillStyle(0xffd04e, 1); coin.fillCircle(shopX + 58, shopY + 30, 8);
    coin.fillStyle(0xffffff, 0.8); coin.fillRect(shopX + 54, shopY + 28, 8, 3);

    var npc = scene.add.graphics().setDepth(-1);
    npc.fillStyle(0x8f6f4b, 1); npc.fillCircle(shopX + 72, shopY + shopH - 70, 18);
    npc.fillStyle(0x513d2c, 1); npc.fillRect(shopX + 66, shopY + shopH - 54, 12, 28);

    var item = scene.add.graphics().setDepth(-1);
    item.fillStyle(0xc0a67f, 1); item.fillRect(shopX + 146, shopY + 44, 22, 12);
    item.fillStyle(0xdddddd, 1); item.fillRect(shopX + 204, shopY + 44, 38, 8);
    item.fillStyle(0x3f2c21, 1); item.fillRect(shopX + 248, shopY + 54, 24, 10);
}

// ── torch ─────────────────────────────────────────────────────────────────────
function addTorch(scene, x, y) {
    var b = scene.add.graphics().setDepth(3);
    b.fillStyle(0x5c3c1a, 1);
    b.fillRect(x - 3, y - 14, 6, 10);
    b.fillRect(x - 7, y - 6, 14, 3);
    b.fillStyle(0x3a2610, 1);
    b.fillRect(x - 4, y - 4, 8, 6);

    var glow = scene.add.graphics().setDepth(2);
    glow.fillStyle(0xff8800, 0.09); glow.fillCircle(x, y - 14, 80);
    glow.fillStyle(0xff6000, 0.07); glow.fillCircle(x, y - 14, 45);

    var fl = scene.add.graphics().setDepth(4);
    fl.fillStyle(0xff2200, 1); fl.fillCircle(x, y - 17, 7);
    fl.fillStyle(0xff7700, 1); fl.fillCircle(x, y - 21, 5);
    fl.fillStyle(0xffcc00, 1); fl.fillCircle(x, y - 24, 3);
    fl.fillStyle(0xffffff, 0.7); fl.fillCircle(x, y - 26, 1.5);

    scene.tweens.add({ targets: fl, alpha:{from:1,to:0.35}, scaleX:{from:1,to:0.88}, scaleY:{from:1,to:1.12},
        duration: 80 + Math.floor(Math.random() * 130), yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay: Math.floor(Math.random() * 900) });
    scene.tweens.add({ targets: glow, alpha:{from:0.7,to:0.2},
        duration: 200 + Math.floor(Math.random() * 200), yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay: Math.floor(Math.random() * 500) });
}

// ── mushroom ──────────────────────────────────────────────────────────────────
function addMushroom(scene, x, floorY) {
    var g = scene.add.graphics().setDepth(2);
    g.fillStyle(0x3a2055, 1); g.fillRect(x - 3, floorY - 15, 6, 15);
    g.fillStyle(0x6020a0, 1); g.fillEllipse(x, floorY - 17, 24, 14);
    g.fillStyle(0x9040c8, 1); g.fillEllipse(x, floorY - 19, 19, 10);
    g.fillStyle(0xb860e0, 1); g.fillEllipse(x, floorY - 20, 13, 6);
    g.fillStyle(0xeec0ff, 0.75);
    g.fillRect(x - 5, floorY - 22, 3, 3); g.fillRect(x + 3, floorY - 21, 2, 2);
    g.fillStyle(0x8010c0, 0.08); g.fillCircle(x, floorY - 12, 26);
    scene.tweens.add({ targets: g, alpha:{from:0.65,to:1},
        duration: 700 + Math.floor(Math.random() * 600), yoyo:true, repeat:-1,
        ease:'Sine.easeInOut', delay: Math.floor(Math.random() * 800) });
}

// ── bone pile ─────────────────────────────────────────────────────────────────
function drawBones(scene, x, floorY) {
    var g = scene.add.graphics().setDepth(2);
    g.fillStyle(0xb0a884, 0.55); g.fillEllipse(x, floorY - 9, 14, 11);
    g.fillStyle(0x060610, 1);
    g.fillRect(x - 4, floorY - 10, 3, 3);
    g.fillRect(x + 1,  floorY - 10, 3, 3);
    g.fillStyle(0xa09870, 0.45);
    g.fillRect(x + 9,  floorY - 4, 18, 4);
    g.fillRect(x - 22, floorY - 3, 15, 3);
    g.fillRect(x - 5,  floorY - 2,  9, 2);
}
