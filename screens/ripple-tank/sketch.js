// ripple-tank - p5 instance-mode sketch (ES module)
// Minimal version: user taps/clicks/drags to generate ripples.

export default function (p) {
  const CELL_SIZE = 56;
  const WAVE_SPEED = 0.12;
  const DEFAULT_DAMPING = 0.1;
  const EDGE_ABSORB_ENABLED = true;
  const EDGE_ABSORB_WIDTH = 8;
  const EDGE_ABSORB_STRENGTH = 0.025;
  const INJECT_RADIUS = 3;
  const INVERT_LENS_DIAMETER = 130;
  const WAVE_BLUR_PX = 14;
  const SIM_STEPS_PER_FRAME = 0.5;
  const LENS_SPRING = 0.01;
  const LENS_DAMPING = 0.7
  const LENS_WAVE_SCALE = 0.12;
  const LENS_WAVE_MAX = 1.25;

  let simCols = 0;
  let simRows = 0;
  let prevField = null;
  let currField = null;
  let nextField = null;
  let dampingValue = DEFAULT_DAMPING;
  let containerEl = null;
  let invertLensEl = null;
  let lensX = 0;
  let lensY = 0;
  let lensVX = 0;
  let lensVY = 0;
  let lensTargetX = 0;
  let lensTargetY = 0;
  let simAccumulator = 0;

  function idx(x, y) {
    return y * simCols + x;
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < simCols && y < simRows;
  }

  function clearFields() {
    prevField.fill(0);
    currField.fill(0);
    nextField.fill(0);
  }

  function resetSimulationLayout() {
    simCols = Math.max(24, Math.floor(p.width / CELL_SIZE));
    simRows = Math.max(18, Math.floor(p.height / CELL_SIZE));
    const count = simCols * simRows;
    prevField = new Float32Array(count);
    currField = new Float32Array(count);
    nextField = new Float32Array(count);
  }

  function addImpulse(gx, gy, strength, radius) {
    if (!inBounds(gx, gy)) return;
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        const x = gx + ox;
        const y = gy + oy;
        if (!inBounds(x, y)) continue;
        const cell = idx(x, y);
        const d2 = ox * ox + oy * oy;
        const falloff = Math.exp(-d2 / (radius * radius + 1e-6));
        currField[cell] += strength * falloff;
      }
    }
  }

  function sampleNeighbor(nx, ny, cx, cy) {
    if (!inBounds(nx, ny)) return currField[idx(cx, cy)];
    return currField[idx(nx, ny)];
  }

  function edgeAbsorbFactor(x, y) {
    if (!EDGE_ABSORB_ENABLED) return 1;
    const dx = Math.min(x, simCols - 1 - x);
    const dy = Math.min(y, simRows - 1 - y);
    const d = Math.min(dx, dy);
    if (d >= EDGE_ABSORB_WIDTH) return 1;
    const t = (EDGE_ABSORB_WIDTH - d) / EDGE_ABSORB_WIDTH;
    return 1 - EDGE_ABSORB_STRENGTH * t;
  }

  function updateWaveStep() {
    const damping = dampingValue;
    const sizeFactor = p.width < 760 ? 0.82 : 1;
    const waveSpeed = WAVE_SPEED * sizeFactor;

    for (let y = 1; y < simRows - 1; y++) {
      for (let x = 1; x < simCols - 1; x++) {
        const c = idx(x, y);
        const center = currField[c];
        const laplacian =
          sampleNeighbor(x - 1, y, x, y) +
          sampleNeighbor(x + 1, y, x, y) +
          sampleNeighbor(x, y - 1, x, y) +
          sampleNeighbor(x, y + 1, x, y) -
          4 * center;

        let value = 2 * center - prevField[c] + waveSpeed * laplacian;
        value *= (1 - damping);
        value *= edgeAbsorbFactor(x, y);
        nextField[c] = value;
      }
    }

    for (let x = 0; x < simCols; x++) {
      nextField[idx(x, 0)] = 0;
      nextField[idx(x, simRows - 1)] = 0;
    }
    for (let y = 0; y < simRows; y++) {
      nextField[idx(0, y)] = 0;
      nextField[idx(simCols - 1, y)] = 0;
    }

    const swap = prevField;
    prevField = currField;
    currField = nextField;
    nextField = swap;
  }

  function renderField() {
    p.noStroke();
    for (let y = 0; y < simRows; y++) {
      for (let x = 0; x < simCols; x++) {
        const h = currField[idx(x, y)];
        const alpha = p.constrain(Math.abs(h) * 520, 0, 190);
        if (alpha < 2) continue;
        if (h >= 0) {
          p.fill(120, 210, 255, alpha);
        } else {
          p.fill(170, 140, 255, alpha);
        }
        p.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  function addImpulseFromLens(strength) {
    const gx = Math.floor(lensX / CELL_SIZE);
    const gy = Math.floor(lensY / CELL_SIZE);
    addImpulse(gx, gy, strength, INJECT_RADIUS);
  }

  function drawHint() {
    p.push();
    p.noStroke();
    p.fill(0, 110);
    p.rect(12, 12, 304, 46, 8);
    p.fill(230, 230, 230, 220);
    p.textSize(12);
    p.textAlign(p.LEFT, p.TOP);
    p.text("Move cursor: gravity lens drives ripples", 20, 18);
    p.text("Damping: " + dampingValue.toFixed(3), 20, 36);
    p.pop();
  }

  function updateLensMotion() {
    let tx = lensTargetX;
    let ty = lensTargetY;

    if (p.touches.length > 0) {
      const touch = p.touches[0];
      if (touch.x >= 0 && touch.x <= p.width && touch.y >= 0 && touch.y <= p.height) {
        tx = touch.x;
        ty = touch.y;
      }
    } else if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
      tx = p.mouseX;
      ty = p.mouseY;
    }

    lensTargetX = tx;
    lensTargetY = ty;

    const ax = (lensTargetX - lensX) * LENS_SPRING;
    const ay = (lensTargetY - lensY) * LENS_SPRING;
    lensVX = (lensVX + ax) * LENS_DAMPING;
    lensVY = (lensVY + ay) * LENS_DAMPING;
    lensX = p.constrain(lensX + lensVX, 0, p.width);
    lensY = p.constrain(lensY + lensVY, 0, p.height);

    const speed = Math.hypot(lensVX, lensVY);
    const strength = p.constrain(speed * LENS_WAVE_SCALE, 0, LENS_WAVE_MAX);
    if (strength > 0.015) addImpulseFromLens(strength);
  }

  function ensureInversionLens() {
    if (invertLensEl || !containerEl) return;
    invertLensEl = document.createElement("div");
    invertLensEl.style.position = "absolute";
    invertLensEl.style.width = INVERT_LENS_DIAMETER + "px";
    invertLensEl.style.height = INVERT_LENS_DIAMETER + "px";
    invertLensEl.style.borderRadius = "50%";
    invertLensEl.style.pointerEvents = "none";
    invertLensEl.style.zIndex = "2";
    invertLensEl.style.backdropFilter = "invert(1)";
    invertLensEl.style.webkitBackdropFilter = "invert(1)";
    invertLensEl.style.border = "1px solid rgba(255,255,255,0.32)";
    invertLensEl.style.display = "none";
    const lensParent = p.canvas && p.canvas.parentElement ? p.canvas.parentElement : containerEl;
    lensParent.appendChild(invertLensEl);
  }

  function removeInversionLens() {
    if (!invertLensEl) return;
    if (invertLensEl.parentNode) invertLensEl.parentNode.removeChild(invertLensEl);
    invertLensEl = null;
  }

  function updateInversionLensPosition() {
    if (!invertLensEl) return;
    invertLensEl.style.display = "block";
    invertLensEl.style.left = lensX - INVERT_LENS_DIAMETER * 0.5 + "px";
    invertLensEl.style.top = lensY - INVERT_LENS_DIAMETER * 0.5 + "px";
  }

  p.setup = function () {
    const container = p.select("#sketch-container");
    containerEl = container ? container.elt : null;
    const w = containerEl ? containerEl.clientWidth : p.windowWidth;
    const h = containerEl ? containerEl.clientHeight : p.windowHeight;
    p.createCanvas(w, h);
    p.pixelDensity(1);
    p.noSmooth();
    ensureInversionLens();
    resetSimulationLayout();
    clearFields();
    lensX = w * 0.5;
    lensY = h * 0.5;
    lensTargetX = lensX;
    lensTargetY = lensY;
  };

  p.registerMethod("remove", removeInversionLens);

  p.draw = function () {
    p.clear();
    updateLensMotion();
    simAccumulator += SIM_STEPS_PER_FRAME;
    while (simAccumulator >= 1) {
      updateWaveStep();
      simAccumulator -= 1;
    }
    p.drawingContext.filter = "blur(" + WAVE_BLUR_PX + "px)";
    renderField();
    p.drawingContext.filter = "none";
    updateInversionLensPosition();
    drawHint();
  };

  p.mousePressed = function (event) {
    if (event && event.target !== p.canvas) return;
    return false;
  };

  p.mouseReleased = function (event) {
    if (event && event.target !== p.canvas) return;
    return false;
  };

  p.touchStarted = function (event) {
    if (event && event.target !== p.canvas) return;
    return false;
  };

  p.touchEnded = function (event) {
    if (event && event.target !== p.canvas) return;
    return false;
  };

  p.windowResized = function () {
    const container = p.select("#sketch-container");
    containerEl = container ? container.elt : null;
    const w = containerEl ? containerEl.clientWidth : p.windowWidth;
    const h = containerEl ? containerEl.clientHeight : p.windowHeight;
    p.resizeCanvas(w, h);
    ensureInversionLens();
    resetSimulationLayout();
    clearFields();
    lensX = w * 0.5;
    lensY = h * 0.5;
    lensTargetX = lensX;
    lensTargetY = lensY;
    lensVX = 0;
    lensVY = 0;
    simAccumulator = 0;
  };
}
