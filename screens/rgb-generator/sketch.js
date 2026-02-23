// rgb_generator – p5 instance-mode sketch (ES module)
// Generates random color themes on click. Displays a little landscape scene
// on a floating card so the grid background peeks around the edges.

export default function (p) {

  const MARGIN_RATIO = 0.04;   // card inset as fraction of shorter dimension
  const CORNER_R     = 16;     // card corner radius

  let r, g, b;       // base random colour channels
  let c1, c2, c3;    // derived palette

  // Card bounds (computed once in setup, reusable in draw)
  let mx, my, cw, ch;

  // ---- Setup ----
  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;
    p.createCanvas(w, h);

    const margin = Math.min(w, h) * MARGIN_RATIO;
    mx = margin;
    my = margin;
    cw = w - margin * 2;
    ch = h - margin * 2;

    randomisePalette();
  };

  // ---- Draw ----
  p.draw = function () {
    p.clear();

    // Derive palette colours
    c1 = p.color(r, g, b);
    c2 = p.color(g, b, r);
    c3 = p.color(255 - r, 255 - g, 255 - b);

    const unit = Math.min(cw, ch); // responsive base unit

    // ---- Card background (sky) ----
    p.noStroke();
    p.fill(c2);
    p.rect(mx, my, cw, ch, CORNER_R);

    // Clip everything inside the card
    p.drawingContext.save();
    roundRectPath(mx, my, cw, ch, CORNER_R);
    p.drawingContext.clip();

    // ---- Horizon ----
    const horizonY = my + ch * 0.58;

    // ---- Sun (follows mouse, clamped inside card) ----
    const sunX = p.constrain(p.mouseX, mx, mx + cw);
    const sunY = p.constrain(p.mouseY, my, my + ch * 0.55);
    const sunSize = unit * 0.22;

    // Sun glow
    p.noStroke();
    for (let i = 3; i >= 1; i--) {
      p.fill(255, 255, 220, 15);
      p.ellipse(sunX, sunY, sunSize + i * unit * 0.04);
    }
    p.fill(255, 255, 240);
    p.ellipse(sunX, sunY, sunSize);

    // ---- Land ----
    p.fill(c1);
    p.rect(mx, horizonY, cw, ch - (horizonY - my));

    // ---- Hills (two subtle ellipses like the original) ----
    const hillUnit = unit * 0.25;
    const darkLand = p.color(
      p.constrain(p.red(c1) - 15, 0, 255),
      p.constrain(p.green(c1) - 15, 0, 255),
      p.constrain(p.blue(c1) - 15, 0, 255)
    );
    p.fill(c1);
    p.ellipse(mx + cw * 0.65, horizonY + hillUnit * 0.4, hillUnit * 2.2, hillUnit);
    p.ellipse(mx + cw * 0.88, horizonY + hillUnit * 0.3, hillUnit * 2.8, hillUnit * 1.1);

    // ---- Tree position (slightly off center) ----
    const treeX     = mx + cw * 0.6;
    const treeBaseY = horizonY + unit * 0.3;
    const trunkH    = unit * 0.25;
    const trunkW    = unit * 0.02;
    const canopyR   = unit * 0.09;

    // ---- Shadow: stretches to card bottom, ellipse at tip moves with sun height ----
    const cardBottom = my + ch;

    // Sun height ratio: 0 = at horizon, 1 = at top of sky
    const sunRatio = p.constrain(p.map(sunY, horizonY, my, 0, 1), 0, 1);

    // Shadow endpoint Y: high sun → near tree base, low sun → card bottom
    //const shEndY = p.lerp(cardBottom, treeBaseY + unit * 0.2, sunRatio);
    const shEndY = cardBottom;

    // Horizontal offset based on sun position relative to tree
    const hOffsetRatio = p.constrain((treeX - sunX) / (cw * 0.5), -1, 1);
    const shEndX = treeX + hOffsetRatio * unit * 0.15;

    // Trapezoid widths
    const shNarrow = trunkW;
    const shWide   = trunkW * p.lerp(3, 1.5, sunRatio); // wider when sun is low

    // Shadow colour
    const shR = p.constrain(p.red(c1) - 40, 0, 255);
    const shG = p.constrain(p.green(c1) - 40, 0, 255);
    const shB = p.constrain(p.blue(c1) - 40, 0, 255);

    p.noStroke();
    p.fill(shR, shG, shB, 70);

    // Trapezoid body
    p.quad(
      treeX - shNarrow, treeBaseY,
      treeX + shNarrow, treeBaseY,
      shEndX + shWide,  shEndY,
      shEndX - shWide,  shEndY
    );

    // Elliptic shadow blob at the tip
    const ellipseW = shWide * 2;
    const ellipseH = unit * p.lerp(0.06, 0.025, sunRatio); // flatter when sun is high
    p.ellipse(shEndX, shEndY, ellipseW, ellipseH);

    // ---- Trunk (simple rectangle) ----
    const trunkCol = p.color(
      p.constrain(p.red(c3) * 0.5 + 40, 30, 120),
      p.constrain(p.green(c3) * 0.3 + 20, 20, 80),
      p.constrain(p.blue(c3) * 0.2 + 10, 10, 50)
    );
    p.fill(trunkCol);
    p.noStroke();
    p.rect(treeX - trunkW, treeBaseY - trunkH, trunkW * 2, trunkH);

    // ---- Canopy (single circle) ----
    p.fill(c3);
    p.ellipse(treeX, treeBaseY - trunkH - canopyR * 0.7, canopyR * 2);

    // ---- Info box: sky colour — placed in the sky area ----
    const ts   = Math.max(11, unit * 0.035);
    const boxW = cw * 0.18;
    const boxH = ts * 4.2;

    drawColourBox(
      mx + cw * 0.05, my + ch * 0.06,
      boxW, boxH, ts,
      c2, g, b, r
    );

    // ---- Info box: land colour — placed in the land area ----
    drawColourBox(
      mx + cw * 0.05, horizonY + ch * 0.06,
      boxW, boxH, ts,
      c1, r, g, b
    );

    // ---- Hint text ----
    p.noStroke();
    p.fill(255, 255, 255, 120);
    p.textSize(Math.max(10, ts * 0.75));
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('tap / click for a new palette', mx + cw / 2, my + ch - 12);

    // Restore clipping
    p.drawingContext.restore();
  };

  // ---- Compact glassmorphism info box ----
  function drawColourBox(bx, by, bw, bh, ts, col, rv, gv, bv) {
    // Frosted glass background
    p.noStroke();
    p.fill(255, 255, 255, 35);
    p.rect(bx, by, bw, bh, 10);

    // Subtle border
    p.noFill();
    p.stroke(255, 255, 255, 60);
    p.strokeWeight(1);
    p.rect(bx, by, bw, bh, 10);

    // Colour swatch dot
    p.noStroke();
    p.fill(col);
    p.ellipse(bx + bw - 12, by + 12, ts * 0.6);

    // RGB text
    p.fill(255, 255, 255, 220);
    p.textSize(ts);
    p.textAlign(p.LEFT, p.TOP);
    const pad = 10;
    const rowH = ts * 1.15;
    p.text('r: ' + Math.round(rv), bx + pad, by + pad);
    p.text('g: ' + Math.round(gv), bx + pad, by + pad + rowH);
    p.text('b: ' + Math.round(bv), bx + pad, by + pad + rowH * 2);
  }

  // ---- Click → new palette ----
  p.mousePressed = function () {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    randomisePalette();
  };

  // ---- Helpers ----
  function randomisePalette() {
    r = p.random(0, 255);
    g = p.random(0, 255);
    b = p.random(0, 255);
  }

  function roundRectPath(x, y, w, h, rad) {
    const ctx = p.drawingContext;
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
}
