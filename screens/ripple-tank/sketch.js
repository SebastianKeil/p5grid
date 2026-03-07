// ripple-tank - p5 instance-mode sketch (ES module)
// Coarse-grid ripple simulation with fish-triggered ripples.

export default function (p) {
  const SIM_TARGET_COLS = 60;
  const SIM_TARGET_ROWS = 37;
  const MIN_SIM_COLS = 36;
  const MIN_SIM_ROWS = 24;

  const STIFFNESS = 0.16;
  const VELOCITY_DAMPING = 0.94;
  const HEIGHT_DAMPING = 0.995;
  const EDGE_ABSORB_WIDTH = 10;
  const EDGE_ABSORB_STRENGTH = 0.32;

  const EAT_IMPULSE_STRENGTH = 1.8;
  const IMPULSE_RADIUS = 1;
  const MAX_FOOD = 5;
  const MAX_FISH = 1;
  const FOOD_FINAL_SIZE = 10;
  const FOOD_LAND_IMPULSE_STRENGTH = 0.35;
  const FOOD_LAND_IMPULSE_RADIUS = 1;
  const FOOD_WAVE_PUSH = 85;
  const FOOD_DRAG = 0.9;
  const FOOD_MAX_SPEED = 2.4;

  const FISH_BASE_SPEED = 10.5;
  const FISH_SPEED_LERP = 0.12;
  const FISH_HEADING_LERP = 0.09;
  const FISH_MIN_TURN_RADIUS = 155; //was 135
  const FISH_TURN_SPEED_BOOST = 0.35;
  const FISH_LOG_CURVE_GAIN = 0.18;
  const FISH_LOG_CURVE_SCALE = 260;
  const SOFT_EDGE_MARGIN = 100;
  const FISH_SPAWN_MARGIN = 280;
  const FISH_REACH_DISTANCE = 80;
  const FISH_EAT_PAUSE_MS = 500;
  const FISH_PRE_EAT_SPEED_FACTOR = 0.18;
  const EAT_POP_HEAD_OFFSET_FACTOR = 0.26;
  const FISH_BLUR_PX = 25.4;
  const SEGMENT_COUNT = 12;
  const SEGMENT_SPACING = 50;
  const HEAD_SIZE = 62.5;
  const SHOULDER_SIZE = 100;
  const TAIL_WAG_AMP = 20;
  const TAIL_WAG_SPEED = 0.32;

  const SIM_STEPS_PER_FRAME = 1;
  const WAVE_BLUR_PX = 0.4;

  let simCols = 0;
  let simRows = 0;
  let cellW = 1;
  let cellH = 1;
  let heightField = null;
  let nextHeightField = null;
  let velocityField = null;
  let simAccumulator = 0;

  let foods = [];
  let fishes = [];
  let nextFoodId = 1;

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

  function renderField() {
    p.noStroke();
    for (let y = 0; y < simRows; y++) {
      for (let x = 0; x < simCols; x++) {
        const h = heightField[idx(x, y)];
        const alpha = p.constrain(Math.abs(h) * 380, 0, 170);
        if (alpha < 2) continue;
        if (h >= 0) p.fill(120, 210, 255, alpha);
        else p.fill(170, 140, 255, alpha);
        p.rect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  function placeFood(px, py) {
    if (px < 0 || py < 0 || px > p.width || py > p.height) return;
    const food = {
      id: nextFoodId++,
      x: px,
      y: py,
      vx: 0,
      vy: 0,
    };
    foods.push(food);
    if (foods.length > MAX_FOOD) foods.shift();
    addImpulseByPixel(
      food.x,
      food.y,
      FOOD_LAND_IMPULSE_STRENGTH,
      FOOD_LAND_IMPULSE_RADIUS
    );

    // Keep a single fish responsive: if one is leaving, redirect it to the new food.
    if (fishes.length > 0) {
      const oneFish = fishes[0];
      oneFish.targetFoodId = food.id;
      oneFish.mode = "hunt";
      oneFish.exitPoint = null;
    }
  }

  function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function updateFoodByWave() {
    const r = FOOD_FINAL_SIZE * 0.5;
    for (let i = 0; i < foods.length; i++) {
      const food = foods[i];
      if (typeof food.vx !== "number") food.vx = 0;
      if (typeof food.vy !== "number") food.vy = 0;

      const gx = Math.floor(food.x / cellW);
      const gy = Math.floor(food.y / cellH);
      if (gx > 0 && gy > 0 && gx < simCols - 1 && gy < simRows - 1) {
        const dhdx =
          (heightField[idx(gx + 1, gy)] - heightField[idx(gx - 1, gy)]) /
          (2 * Math.max(1e-6, cellW));
        const dhdy =
          (heightField[idx(gx, gy + 1)] - heightField[idx(gx, gy - 1)]) /
          (2 * Math.max(1e-6, cellH));

        // Move slightly along the local wave slope.
        food.vx += -dhdx * FOOD_WAVE_PUSH;
        food.vy += -dhdy * FOOD_WAVE_PUSH;
      }

      food.vx *= FOOD_DRAG;
      food.vy *= FOOD_DRAG;
      const speed = Math.hypot(food.vx, food.vy);
      if (speed > FOOD_MAX_SPEED) {
        const s = FOOD_MAX_SPEED / Math.max(1e-6, speed);
        food.vx *= s;
        food.vy *= s;
      }

      food.x += food.vx;
      food.y += food.vy;

      if (food.x < r) {
        food.x = r;
        food.vx *= -0.3;
      } else if (food.x > p.width - r) {
        food.x = p.width - r;
        food.vx *= -0.3;
      }
      if (food.y < r) {
        food.y = r;
        food.vy *= -0.3;
      } else if (food.y > p.height - r) {
        food.y = p.height - r;
        food.vy *= -0.3;
      }
    }
  }

  function lerpAngle(from, to, amt) {
    return from + angleDelta(from, to) * amt;
  }

  function isInsideCanvas(x, y, pad = 0) {
    return x >= -pad && y >= -pad && x <= p.width + pad && y <= p.height + pad;
  }

  function isFishFullyOutOfCanvas(oneFish) {
    if (!oneFish) return true;
    // Keep fish alive while any blurred body segment can still be visible.
    const visiblePad = SHOULDER_SIZE * 0.5 + FISH_BLUR_PX + TAIL_WAG_AMP;
    for (let i = 0; i < oneFish.segments.length; i++) {
      const seg = oneFish.segments[i];
      if (isInsideCanvas(seg.x, seg.y, visiblePad)) return false;
    }
    return true;
  }

  function getEatPopCenter(oneFish) {
    const head = oneFish.segments[0];
    const offset = HEAD_SIZE * EAT_POP_HEAD_OFFSET_FACTOR;
    return {
      x: head.x + Math.cos(oneFish.heading) * offset,
      y: head.y + Math.sin(oneFish.heading) * offset,
    };
  }

  function getBackWaveCenter(oneFish) {
    const midIdx = Math.floor((oneFish.segments.length - 1) * 0.5);
    const back = oneFish.segments[midIdx];
    return {
      x: back.x,
      y: back.y,
    };
  }

  function getClosestFood(x, y) {
    let closest = null;
    let bestD2 = Infinity;
    for (let i = 0; i < foods.length; i++) {
      const food = foods[i];
      const dx = food.x - x;
      const dy = food.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        closest = food;
      }
    }
    return closest;
  }

  function spawnFishOutside(targetFood) {
    if (!targetFood || fishes.length >= MAX_FISH) return null;
    const centerX = p.width * 0.5;
    const centerY = p.height * 0.5;
    const spawnRing = Math.hypot(p.width, p.height) * 0.62 + FISH_SPAWN_MARGIN;
    const spawnAngle = p.random(p.TWO_PI);
    const sx = centerX + Math.cos(spawnAngle) * spawnRing;
    const sy = centerY + Math.sin(spawnAngle) * spawnRing;
    const curveSign = p.random() < 0.5 ? -1 : 1;
    const toFood = Math.atan2(targetFood.y - sy, targetFood.x - sx);
    const heading = toFood + curveSign * p.random(0.25, 0.65);
    const segments = [];
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      segments.push({
        x: sx - Math.cos(heading) * i * SEGMENT_SPACING,
        y: sy - Math.sin(heading) * i * SEGMENT_SPACING,
      });
    }
    const oneFish = {
      x: sx,
      y: sy,
      vx: Math.cos(heading) * FISH_BASE_SPEED,
      vy: Math.sin(heading) * FISH_BASE_SPEED,
      heading,
      speed: FISH_BASE_SPEED,
      tailPhase: p.random(p.TWO_PI),
      mode: "enter",
      curveSign,
      curveStrength: p.random(0.85, 1.15),
      exitPoint: null,
      pauseUntilMs: 0,
      targetFoodId: targetFood.id,
      segments,
    };
    fishes.push(oneFish);
    return oneFish;
  }

  function assignExitPath(oneFish) {
    if (!oneFish) return;
    const exitDist = Math.hypot(p.width, p.height) * 0.7 + FISH_SPAWN_MARGIN;
    const exitHeading = oneFish.heading + oneFish.curveSign * p.random(0.4, 0.9);
    oneFish.exitPoint = {
      x: oneFish.x + Math.cos(exitHeading) * exitDist,
      y: oneFish.y + Math.sin(exitHeading) * exitDist,
    };
    oneFish.targetFoodId = null;
    oneFish.mode = "exit";
  }

  function updateSingleFish(oneFish) {
    let target =
      oneFish.targetFoodId == null
        ? null
        : foods.find((food) => food.id === oneFish.targetFoodId) || null;

    if (!target && foods.length > 0) {
      target = getClosestFood(oneFish.x, oneFish.y);
      if (target) {
        oneFish.targetFoodId = target.id;
        if (oneFish.mode === "exit") {
          oneFish.mode = "hunt";
          oneFish.exitPoint = null;
        }
      }
    }

    if (oneFish.mode !== "exit" && !target) assignExitPath(oneFish);
    if (oneFish.mode === "enter" && isInsideCanvas(oneFish.x, oneFish.y, 10)) {
      oneFish.mode = "hunt";
    }

    let targetAngle = oneFish.heading;
    let targetDistance = Infinity;

    if (oneFish.mode === "exit" && oneFish.exitPoint) {
      const dx = oneFish.exitPoint.x - oneFish.x;
      const dy = oneFish.exitPoint.y - oneFish.y;
      const dist = Math.max(1e-6, Math.hypot(dx, dy));
      const exitAngle = Math.atan2(dy, dx);
      const curveAmp =
        FISH_LOG_CURVE_GAIN *
        oneFish.curveStrength *
        Math.log1p(dist / FISH_LOG_CURVE_SCALE) *
        0.95;
      const curvedExitAngle = exitAngle + oneFish.curveSign * curveAmp;
      targetAngle = lerpAngle(targetAngle, curvedExitAngle, 0.7);
    } else if (target) {
      const dx = target.x - oneFish.x;
      const dy = target.y - oneFish.y;
      const dist = Math.max(1e-6, Math.hypot(dx, dy));
      targetDistance = dist;
      const foodAngle = Math.atan2(dy, dx);
      const curveAmp =
        FISH_LOG_CURVE_GAIN *
        oneFish.curveStrength *
        Math.log1p(dist / FISH_LOG_CURVE_SCALE) *
        (oneFish.mode === "enter" ? 1.1 : 0.75);
      const curvedFoodAngle = foodAngle + oneFish.curveSign * curveAmp;
      const approachBlend = oneFish.mode === "enter" ? 0.52 : 0.66;
      targetAngle = lerpAngle(targetAngle, curvedFoodAngle, approachBlend);
    } else {
      const centerAngle = Math.atan2(
        p.height * 0.5 - oneFish.y,
        p.width * 0.5 - oneFish.x
      );
      targetAngle = lerpAngle(targetAngle, centerAngle, 0.3);
    }

    if (oneFish.mode !== "exit") {
      const centerX = p.width * 0.5;
      const centerY = p.height * 0.5;
      let edgeSteerX = 0;
      let edgeSteerY = 0;
      if (oneFish.x < SOFT_EDGE_MARGIN) {
        edgeSteerX += (SOFT_EDGE_MARGIN - oneFish.x) / SOFT_EDGE_MARGIN;
      } else if (oneFish.x > p.width - SOFT_EDGE_MARGIN) {
        edgeSteerX -=
          (oneFish.x - (p.width - SOFT_EDGE_MARGIN)) / SOFT_EDGE_MARGIN;
      }
      if (oneFish.y < SOFT_EDGE_MARGIN) {
        edgeSteerY += (SOFT_EDGE_MARGIN - oneFish.y) / SOFT_EDGE_MARGIN;
      } else if (oneFish.y > p.height - SOFT_EDGE_MARGIN) {
        edgeSteerY -=
          (oneFish.y - (p.height - SOFT_EDGE_MARGIN)) / SOFT_EDGE_MARGIN;
      }
      if (edgeSteerX !== 0 || edgeSteerY !== 0) {
        const centerAngle = Math.atan2(centerY - oneFish.y, centerX - oneFish.x);
        const edgeAmount = p.constrain(Math.hypot(edgeSteerX, edgeSteerY), 0, 1);
        targetAngle = lerpAngle(targetAngle, centerAngle, 0.35 + edgeAmount * 0.5);
      }
    }

    const targetDelta = angleDelta(oneFish.heading, targetAngle);
    const desiredTurnStep = targetDelta * FISH_HEADING_LERP;
    const maxTurnStep = Math.max(0.001, oneFish.speed / FISH_MIN_TURN_RADIUS);
    const appliedTurnStep = p.constrain(desiredTurnStep, -maxTurnStep, maxTurnStep);
    oneFish.heading += appliedTurnStep;
    const turnDelta = Math.abs(appliedTurnStep);

    const turnFactor = p.constrain(turnDelta / (p.PI * 0.8), 0, 1);
    let desiredSpeed = FISH_BASE_SPEED * (1 + turnFactor * FISH_TURN_SPEED_BOOST);
    if (target && oneFish.mode !== "exit") {
      // Gentle braking as the fish approaches food.
      const brakeT = p.constrain(targetDistance / 240, 0.28, 1);
      desiredSpeed *= brakeT;
    }
    if (oneFish.mode === "preEat") {
      desiredSpeed *= FISH_PRE_EAT_SPEED_FACTOR;
    }
    oneFish.speed += (desiredSpeed - oneFish.speed) * FISH_SPEED_LERP;

    oneFish.vx = Math.cos(oneFish.heading) * oneFish.speed;
    oneFish.vy = Math.sin(oneFish.heading) * oneFish.speed;
    oneFish.x += oneFish.vx;
    oneFish.y += oneFish.vy;
    oneFish.tailPhase += TAIL_WAG_SPEED;

    const head = oneFish.segments[0];
    head.x = oneFish.x;
    head.y = oneFish.y;
    const neck = oneFish.segments[1];
    if (neck) {
      const neckTargetX = oneFish.x - Math.cos(oneFish.heading) * SEGMENT_SPACING;
      const neckTargetY = oneFish.y - Math.sin(oneFish.heading) * SEGMENT_SPACING;
      neck.x += (neckTargetX - neck.x) * 0.28;
      neck.y += (neckTargetY - neck.y) * 0.28;
    }
    for (let i = 1; i < oneFish.segments.length; i++) {
      const prev = oneFish.segments[i - 1];
      const seg = oneFish.segments[i];
      const dx = seg.x - prev.x;
      const dy = seg.y - prev.y;
      const d = Math.max(1e-6, Math.hypot(dx, dy));
      // Fixed spacing constraint keeps a solid spine-like body bend.
      seg.x = prev.x + (dx / d) * SEGMENT_SPACING;
      seg.y = prev.y + (dy / d) * SEGMENT_SPACING;
    }

    if (!target || oneFish.mode === "exit") return;

    if (oneFish.mode === "preEat") {
      if (p.millis() >= oneFish.pauseUntilMs) {
        const eatIdx = foods.findIndex((food) => food.id === target.id);
        if (eatIdx >= 0) foods.splice(eatIdx, 1);
        const popCenter = getEatPopCenter(oneFish);
        addImpulseByPixel(
          popCenter.x,
          popCenter.y,
          EAT_IMPULSE_STRENGTH,
          IMPULSE_RADIUS
        );
        const backWave = getBackWaveCenter(oneFish);
        addImpulseByPixel(
          backWave.x,
          backWave.y,
          EAT_IMPULSE_STRENGTH,
          IMPULSE_RADIUS
        );
        assignExitPath(oneFish);
      }
      return;
    }

    const tx = target.x - oneFish.x;
    const ty = target.y - oneFish.y;
    if (Math.hypot(tx, ty) <= FISH_REACH_DISTANCE) {
      oneFish.mode = "preEat";
      oneFish.pauseUntilMs = p.millis() + FISH_EAT_PAUSE_MS;
      oneFish.exitPoint = null;
    }
  }

  function updateFish() {
    if (fishes.length > MAX_FISH) fishes.length = MAX_FISH;
    if (foods.length > MAX_FOOD) foods = foods.slice(-MAX_FOOD);

    const assignedFoodIds = new Set();
    for (let i = 0; i < fishes.length; i++) {
      const oneFish = fishes[i];
      if (oneFish.mode === "exit" || oneFish.targetFoodId == null) continue;
      assignedFoodIds.add(oneFish.targetFoodId);
    }

    for (let i = 0; i < foods.length && fishes.length < MAX_FISH; i++) {
      const food = foods[i];
      if (!assignedFoodIds.has(food.id)) {
        const spawned = spawnFishOutside(food);
        if (spawned) assignedFoodIds.add(food.id);
      }
    }

    for (let i = fishes.length - 1; i >= 0; i--) {
      const oneFish = fishes[i];
      updateSingleFish(oneFish);
      if (
        foods.length === 0 &&
        oneFish.mode === "exit" &&
        isFishFullyOutOfCanvas(oneFish)
      ) {
        fishes.splice(i, 1);
      }
    }
  }

  function drawFoodAndFish() {
    p.push();
    p.noStroke();

    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      p.fill(255, 230, 120, 200);
      p.circle(f.x, f.y, FOOD_FINAL_SIZE);
    }

    if (fishes.length > 0) {
      p.drawingContext.filter = "blur(" + FISH_BLUR_PX + "px)";
      for (let f = 0; f < fishes.length; f++) {
        const oneFish = fishes[f];
        const koiCol = p.color(255, 80, 0);
        const drawSegCount = Math.min(oneFish.segments.length, 8);

        for (let i = 0; i < drawSegCount; i++) {
          const seg = oneFish.segments[i];
          const t = i / Math.max(1, drawSegCount - 1);
          let d;
          if (i === 0) d = HEAD_SIZE;
          else if (i <= 4) {
            const tt = (i - 1) / 3;
            d = p.lerp(HEAD_SIZE, SHOULDER_SIZE, tt);
          } else if (i <= 7) {
            const tt = (i - 5) / 2;
            d = p.lerp(SHOULDER_SIZE, 20, tt);
          }
          const jitter = Math.sin(p.frameCount * 0.07 + i * 0.63) * 2.1;
          d += jitter;

          const alpha = i < 3 ? 185 : 145 - t * 50;
          p.fill(p.red(koiCol), p.green(koiCol), p.blue(koiCol), alpha);
          p.ellipse(seg.x, seg.y, d, d * 0.72);
        }

        const eyeX = oneFish.segments[0].x + Math.cos(oneFish.heading) * 7;
        const eyeY = oneFish.segments[0].y + Math.sin(oneFish.heading) * 7;
        p.fill(255, 230);
        p.circle(eyeX, eyeY, 3.2);

      }
      p.drawingContext.filter = "none";

      for (let f = 0; f < fishes.length; f++) {
        const oneFish = fishes[f];
        if (oneFish.mode !== "preEat") continue;
        const duration = Math.max(1, FISH_EAT_PAUSE_MS);
        const t = p.constrain(1 - (oneFish.pauseUntilMs - p.millis()) / duration, 0, 1);
        const pulse = t < 0.5 ? t * 2 : (1 - t) * 2;
        const popSize = HEAD_SIZE / 2 * pulse;
        const popCenter = getEatPopCenter(oneFish);
        p.fill(255, 80, 0, 205);
        p.push();
        p.translate(popCenter.x, popCenter.y);
        p.rotate(oneFish.heading + p.HALF_PI);
        p.ellipse(0, 0, popSize, popSize * 0.72);
        p.pop();
      }
    }

    p.pop();
  }

  function drawHint() {
    p.push();
    p.noStroke();
    p.fill(0, 110);
    p.rect(12, 12, 350, 46, 8);
    p.fill(230, 230, 230, 220);
    p.textSize(12);
    p.textAlign(p.LEFT, p.TOP);
    p.text("Click / tap to place food in the water", 20, 18);
    p.text("Fish eats food and creates ripples", 20, 36);
    p.pop();
  }

  p.setup = function () {
    const container = p.select("#sketch-container");
    const w = container ? container.elt.clientWidth : p.windowWidth;
    const h = container ? container.elt.clientHeight : p.windowHeight;
    p.createCanvas(w, h);
    p.pixelDensity(1);
    p.noSmooth();
    resetSimulationLayout();
    clearFields();
    foods = [];
    fishes = [];
    nextFoodId = 1;
    simAccumulator = 0;
  };

  p.draw = function () {
    p.clear();
    updateFoodByWave();
    updateFish();
    simAccumulator += SIM_STEPS_PER_FRAME;
    while (simAccumulator >= 1) {
      updateWaveStep();
      simAccumulator -= 1;
    }
    p.drawingContext.filter = "blur(" + WAVE_BLUR_PX + "px)";
    renderField();
    p.drawingContext.filter = "none";
    drawFoodAndFish();
    drawHint();
  };

  p.mousePressed = function (event) {
    if (event && event.target !== p.canvas) return;
    placeFood(p.mouseX, p.mouseY);
    return false;
  };

  p.mouseDragged = function () {
    return false;
  };

  p.touchStarted = function (event) {
    if (event && event.target !== p.canvas) return;
    const touch = p.touches[0];
    if (touch) placeFood(touch.x, touch.y);
    return false;
  };

  p.touchMoved = function () {
    return false;
  };

  p.windowResized = function () {
    const container = p.select("#sketch-container");
    const w = container ? container.elt.clientWidth : p.windowWidth;
    const h = container ? container.elt.clientHeight : p.windowHeight;
    p.resizeCanvas(w, h);
    resetSimulationLayout();
    clearFields();
    foods = [];
    fishes = [];
    nextFoodId = 1;
    simAccumulator = 0;
  };
}
