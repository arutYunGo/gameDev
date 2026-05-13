// ── HUD: HP bar ───────────────────────────────────────────────────────────────
function updateHpDisplay() {
    if (!hpBar) return;
    var Z   = CAM_ZOOM;
    // Positions expressed in screen pixels, divided by zoom → world coords for scrollFactor(0)
    var x = 10/Z, y = 10/Z, w = 160/Z, h = 12/Z, r = 2/Z;
    var pct = Math.max(0, playerHP) / playerMaxHP;

    hpBar.clear();
    // Shadow
    hpBar.fillStyle(0x000000, 0.6);
    hpBar.fillRoundedRect(x - 1/Z, y - 1/Z, w + 2/Z, h + 2/Z, r);
    // Empty track
    hpBar.fillStyle(0x3a1414, 1);
    hpBar.fillRoundedRect(x, y, w, h, r);
    // Fill — green → orange → red
    var color = pct > 0.6 ? 0x44dd55 : pct > 0.3 ? 0xddaa33 : 0xdd3333;
    hpBar.fillStyle(color, 1);
    if (pct > 0) hpBar.fillRoundedRect(x, y, Math.max(1/Z, w * pct), h, r);
    // Border
    hpBar.lineStyle(1/Z, 0x000000, 1);
    hpBar.strokeRoundedRect(x, y, w, h, r);
}

// ── HUD: ability plates (appear after goblin absorbed) ───────────────────────
function showAbilityHud(scene) {
    if (abilityHudShown) return;
    abilityHudShown = true;

    if (tabHint) tabHint.setVisible(false); // replaced by plates

    var Z  = CAM_ZOOM;
    var by = (GAME_H - 12) / Z;   // bottom anchor (world units)
    var cx = GAME_W / (2 * Z);    // horizontal center
    var pw = 80 / Z;               // plate width
    var ph = 54 / Z;               // plate height
    var gap = 5 / Z;
    var r  = 5 / Z;

    // Move hintText above the plates so they don't overlap
    if (hintText) hintText.setY((GAME_H - 80) / Z);

    // ── backgrounds ──
    var bg = scene.add.graphics().setScrollFactor(0).setDepth(22);

    // TAB plate (left of center)
    var tx = cx - gap - pw;
    bg.fillStyle(0x0d0d20, 0.9);
    bg.fillRoundedRect(tx, by - ph, pw, ph, r);
    bg.lineStyle(1.5 / Z, 0x3a5eaa, 1);
    bg.strokeRoundedRect(tx, by - ph, pw, ph, r);

    // E plate (right of center)
    var ex = cx + gap;
    bg.fillStyle(0x100d0d, 0.9);
    bg.fillRoundedRect(ex, by - ph, pw, ph, r);
    bg.lineStyle(1.5 / Z, 0xaa7722, 1);
    bg.strokeRoundedRect(ex, by - ph, pw, ph, r);

    // ── TAB key label ──
    scene.add.text(tx + pw / 2, by - ph + 6 / Z, 'TAB', {
        fontSize: Math.round(14 / Z) + 'px', fontStyle: 'bold', fill: '#88ccff'
    }).setScrollFactor(0).setDepth(23).setOrigin(0.5, 0);

    tabPlate = scene.add.text(tx + pw / 2, by - ph + 26 / Z, 'Смена формы', {
        fontSize: Math.round(9 / Z) + 'px', fill: '#6699bb', align: 'center',
        wordWrap: { width: pw - 6 / Z }
    }).setScrollFactor(0).setDepth(23).setOrigin(0.5, 0);

    // ── E key label ──
    scene.add.text(ex + pw / 2, by - ph + 6 / Z, 'E', {
        fontSize: Math.round(14 / Z) + 'px', fontStyle: 'bold', fill: '#ffee44'
    }).setScrollFactor(0).setDepth(23).setOrigin(0.5, 0);

    ePlate = scene.add.text(ex + pw / 2, by - ph + 26 / Z, 'Атака', {
        fontSize: Math.round(9 / Z) + 'px', fill: '#bbaa44', align: 'center',
        wordWrap: { width: pw - 6 / Z }
    }).setScrollFactor(0).setDepth(23).setOrigin(0.5, 0);
}

function updateEPlate(label) {
    if (ePlate) ePlate.setText(label);
}

// ── HUD: forms bar (TAB cycling) ──────────────────────────────────────────────
function updateFormsBar() {
    if (!absorbedForms.length) { formsBar.setText(''); return; }
    var names = { slime: 'СЛИЗЕНЬ', goblin: 'ГОБЛИН' };
    var all   = ['slime'].concat(absorbedForms);
    formsBar.setText('TAB: ' + all.map(function(f) {
        var n = names[f] || f.toUpperCase();
        return f === playerForm ? '[' + n + ']' : n;
    }).join(' → '));
}
