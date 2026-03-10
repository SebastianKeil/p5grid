import {
  SIM_TARGET_COLS,
  SIM_TARGET_ROWS,
  MIN_SIM_COLS,
  MIN_SIM_ROWS,
  STIFFNESS,
  VELOCITY_DAMPING,
  HEIGHT_DAMPING,
  EDGE_ABSORB_WIDTH,
  EDGE_ABSORB_STRENGTH,
} from "./constants.js";

export function createWaveSim(p) {
  let simCols = 0;
  let simRows = 0;
  let cellW = 1;
  let cellH = 1;
  let heightField = null;
  let nextHeightField = null;
  let velocityField = null;

  function idx(x, y) {
    return y * simCols + x;
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < simCols && y < simRows;
  }

  function clearFields() {
    heightField.fill(0);
    nextHeightField.fill(0);
    velocityField.fill(0);
  }

  function resetSimulationLayout() {
    const aspect = p.width / Math.max(1, p.height);
    if (aspect >= 1) {
      simCols = SIM_TARGET_COLS;
      simRows = Math.round(SIM_TARGET_COLS / aspect);
    } else {
      simRows = SIM_TARGET_ROWS;
      simCols = Math.round(SIM_TARGET_ROWS * aspect);
    }

    simCols = p.constrain(simCols, MIN_SIM_COLS, SIM_TARGET_COLS);
    simRows = p.constrain(simRows, MIN_SIM_ROWS, SIM_TARGET_ROWS);
    cellW = p.width / simCols;
    cellH = p.height / simRows;

    const count = simCols * simRows;
    heightField = new Float32Array(count);
    nextHeightField = new Float32Array(count);
    velocityField = new Float32Array(count);
  }

  function addImpulseByPixel(px, py, strength, radius) {
    const gx = Math.floor(px / cellW);
    const gy = Math.floor(py / cellH);
    if (!inBounds(gx, gy)) return;

    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        const x = gx + ox;
        const y = gy + oy;
        if (!inBounds(x, y)) continue;
        const c = idx(x, y);
        const d2 = ox * ox + oy * oy;
        const falloff = Math.exp(-d2 / (radius * radius + 1e-6));
        velocityField[c] += strength * falloff;
      }
    }
  }

  function snapPixelToCellCenter(px, py) {
    const gx = p.constrain(Math.floor(px / cellW), 0, simCols - 1);
    const gy = p.constrain(Math.floor(py / cellH), 0, simRows - 1);
    return {
      x: (gx + 0.5) * cellW,
      y: (gy + 0.5) * cellH,
    };
  }

  function edgeDampingFactor(x, y) {
    const dx = Math.min(x, simCols - 1 - x);
    const dy = Math.min(y, simRows - 1 - y);
    const distToEdge = Math.min(dx, dy);
    if (distToEdge >= EDGE_ABSORB_WIDTH) return 1;
    const t = 1 - distToEdge / EDGE_ABSORB_WIDTH;
    return 1 - EDGE_ABSORB_STRENGTH * t * t;
  }

  function updateWaveStep() {
    for (let y = 1; y < simRows - 1; y++) {
      const row = y * simCols;
      for (let x = 1; x < simCols - 1; x++) {
        const c = row + x;
        const center = heightField[c];
        const laplacian =
          heightField[c - 1] +
          heightField[c + 1] +
          heightField[c - simCols] +
          heightField[c + simCols] -
          4 * center;

        let velocity = velocityField[c] + laplacian * STIFFNESS;
        velocity *= VELOCITY_DAMPING;
        const edgeDamp = edgeDampingFactor(x, y);
        velocity *= edgeDamp;
        velocityField[c] = velocity;
        nextHeightField[c] = (center + velocity) * HEIGHT_DAMPING * edgeDamp;
      }
    }

    // Keep only the outer border fixed at zero; absorption happens smoothly before it.
    for (let x = 0; x < simCols; x++) {
      nextHeightField[idx(x, 0)] = 0;
      nextHeightField[idx(x, simRows - 1)] = 0;
      velocityField[idx(x, 0)] = 0;
      velocityField[idx(x, simRows - 1)] = 0;
    }
    for (let y = 0; y < simRows; y++) {
      nextHeightField[idx(0, y)] = 0;
      nextHeightField[idx(simCols - 1, y)] = 0;
      velocityField[idx(0, y)] = 0;
      velocityField[idx(simCols - 1, y)] = 0;
    }

    const swap = heightField;
    heightField = nextHeightField;
    nextHeightField = swap;
  }

  function renderField(target = p) {
    target.noStroke();
    for (let y = 0; y < simRows; y++) {
      for (let x = 0; x < simCols; x++) {
        const h = heightField[idx(x, y)];
        const alpha = p.constrain(Math.abs(h) * 380, 0, 170);
        if (alpha < 2) continue;
        if (h >= 0) target.fill(120, 210, 255, alpha);
        else target.fill(170, 140, 255, alpha);
        target.rect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  function sampleGradientByPixel(px, py) {
    const gx = Math.floor(px / cellW);
    const gy = Math.floor(py / cellH);
    if (gx <= 0 || gy <= 0 || gx >= simCols - 1 || gy >= simRows - 1) return null;
    const dhdx =
      (heightField[idx(gx + 1, gy)] - heightField[idx(gx - 1, gy)]) /
      (2 * Math.max(1e-6, cellW));
    const dhdy =
      (heightField[idx(gx, gy + 1)] - heightField[idx(gx, gy - 1)]) /
      (2 * Math.max(1e-6, cellH));
    return { dhdx, dhdy };
  }

  return {
    resetSimulationLayout,
    clearFields,
    addImpulseByPixel,
    snapPixelToCellCenter,
    updateWaveStep,
    renderField,
    sampleGradientByPixel,
  };
}
