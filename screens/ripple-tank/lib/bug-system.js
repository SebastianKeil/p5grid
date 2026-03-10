import {
  BUG_BRAKE_RADIUS,
  BUG_LAND_RADIUS,
  BUG_MAX_ACTIVE,
  BUG_LOOP_ANCHOR_MAX_T,
  BUG_LOOP_ANCHOR_MIN_T,
  BUG_LOOP_PHASE_END_T,
  BUG_LOOP_PHASE_START_T,
  BUG_LOOP_RADIUS_MAX,
  BUG_LOOP_RADIUS_MIN,
  BUG_SPAWN_MAX_MS,
  BUG_SPAWN_MIN_MS,
  BUG_TARGET_AREA_HEIGHT_FACTOR,
  BUG_TARGET_AREA_WIDTH_FACTOR,
  BUG_TRAVEL_MAX_MS,
  BUG_TRAVEL_MIN_MS,
  FOOD_DRAG,
  FOOD_FINAL_SIZE,
  FOOD_MAX_SPEED,
  FOOD_WAVE_PUSH,
} from "./constants.js";

export function createBugSystem(p) {
  let bugs = [];
  let pendingLandings = [];
  let nextSpawnAtMs = 0;
  let nextBugId = 1;

  function getBugs() {
    return bugs;
  }

  function getLandedBugs() {
    return bugs.filter((oneBug) => oneBug.mode === "landed");
  }

  function removeBugById(id) {
    const idx = bugs.findIndex((oneBug) => oneBug.id === id);
    if (idx >= 0) bugs.splice(idx, 1);
  }

  function consumePendingLandings() {
    const landings = pendingLandings;
    pendingLandings = [];
    return landings;
  }

  function randomSpawnDelayMs() {
    return p.random(BUG_SPAWN_MIN_MS, BUG_SPAWN_MAX_MS);
  }

  function scheduleNextSpawn(fromNowMs = null) {
    const delay = typeof fromNowMs === "number" ? fromNowMs : randomSpawnDelayMs();
    nextSpawnAtMs = p.millis() + delay;
  }

  function reset() {
    bugs = [];
    pendingLandings = [];
    nextBugId = 1;
    scheduleNextSpawn(randomSpawnDelayMs() * 0.5);
  }

  function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function easeOutCubic(t) {
    const k = p.constrain(t, 0, 1);
    return 1 - Math.pow(1 - k, 3);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function getPathPoint(oneBug, travelT) {
    const t = p.constrain(travelT, 0, 1);
    const easedT = easeOutCubic(t);
    const loopStart = BUG_LOOP_PHASE_START_T;
    const loopEnd = BUG_LOOP_PHASE_END_T;
    const sx = oneBug.startX;
    const sy = oneBug.startY;
    const ax = oneBug.anchorX;
    const ay = oneBug.anchorY;
    const tx = oneBug.targetX;
    const ty = oneBug.targetY;

    if (easedT < loopStart) {
      const u = loopStart <= 0 ? 1 : easedT / loopStart;
      return {
        x: lerp(sx, ax, u),
        y: lerp(sy, ay, u),
      };
    }

    if (easedT <= loopEnd) {
      const denom = Math.max(1e-6, loopEnd - loopStart);
      const u = (easedT - loopStart) / denom;
      const theta = -p.HALF_PI + u * p.TWO_PI;
      const cx = ax + oneBug.perpX * oneBug.loopRadius;
      const cy = ay + oneBug.perpY * oneBug.loopRadius;
      const circleX =
        cx +
        oneBug.dirX * Math.cos(theta) * oneBug.loopRadius +
        oneBug.perpX * Math.sin(theta) * oneBug.loopRadius;
      const circleY =
        cy +
        oneBug.dirY * Math.cos(theta) * oneBug.loopRadius +
        oneBug.perpY * Math.sin(theta) * oneBug.loopRadius;
      return { x: circleX, y: circleY };
    }

    const u = (easedT - loopEnd) / Math.max(1e-6, 1 - loopEnd);
    return {
      x: lerp(ax, tx, u),
      y: lerp(ay, ty, u),
    };
  }

  function spawnBug() {
    const side = Math.floor(p.random(4));
    const spawnPad = 16;
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = -spawnPad;
      y = p.random(0, p.height);
    } else if (side === 1) {
      x = p.width + spawnPad;
      y = p.random(0, p.height);
    } else if (side === 2) {
      x = p.random(0, p.width);
      y = -spawnPad;
    } else {
      x = p.random(0, p.width);
      y = p.height + spawnPad;
    }

    const centerX = p.width * 0.5;
    const centerY = p.height * 0.5;
    const halfW = p.width * BUG_TARGET_AREA_WIDTH_FACTOR * 0.5;
    const halfH = p.height * BUG_TARGET_AREA_HEIGHT_FACTOR * 0.5;
    const tx = p.random(centerX - halfW, centerX + halfW);
    const ty = p.random(centerY - halfH, centerY + halfH);
    const heading = Math.atan2(ty - y, tx - x);
    const dist = Math.max(1e-6, Math.hypot(tx - x, ty - y));
    const dirX = (tx - x) / dist;
    const dirY = (ty - y) / dist;
    const perpX = -dirY;
    const perpY = dirX;
    const anchorT = p.random(BUG_LOOP_ANCHOR_MIN_T, BUG_LOOP_ANCHOR_MAX_T);
    const travelMs = p.random(BUG_TRAVEL_MIN_MS, BUG_TRAVEL_MAX_MS);
    bugs.push({
      id: "bug-" + nextBugId++,
      kind: "bug",
      x,
      y,
      prevX: x,
      prevY: y,
      vx: 0,
      vy: 0,
      heading,
      speed: 0,
      startX: x,
      startY: y,
      targetX: tx,
      targetY: ty,
      dirX,
      dirY,
      perpX,
      perpY,
      loopRadius: p.random(BUG_LOOP_RADIUS_MIN, BUG_LOOP_RADIUS_MAX),
      anchorX: lerp(x, tx, anchorT),
      anchorY: lerp(y, ty, anchorT),
      spawnedAtMs: p.millis(),
      travelMs,
      mode: "fly",
    });
  }

  function updateBug(oneBug) {
    if (oneBug.mode === "landed") return true;

    const elapsedMs = p.millis() - oneBug.spawnedAtMs;
    const travelT = p.constrain(
      elapsedMs / Math.max(1, oneBug.travelMs),
      0,
      1
    );
    const nextPos = getPathPoint(oneBug, travelT);
    const dx = nextPos.x - oneBug.x;
    const dy = nextPos.y - oneBug.y;
    const dist = Math.hypot(oneBug.targetX - oneBug.x, oneBug.targetY - oneBug.y);

    if (travelT >= 1 || dist <= BUG_LAND_RADIUS) {
      oneBug.vx = 0;
      oneBug.vy = 0;
      oneBug.speed = 0;
      oneBug.mode = "landed";
      pendingLandings.push(oneBug);
      return true;
    }

    if (Math.hypot(dx, dy) > 1e-4) {
      const desiredHeading = Math.atan2(dy, dx);
      oneBug.heading += angleDelta(oneBug.heading, desiredHeading) * 0.7;
    }
    const brakeProgress = p.constrain(1 - dist / BUG_BRAKE_RADIUS, 0, 1);
    const brakeFactor = 1 - brakeProgress; // linear 1-x braking profile
    oneBug.prevX = oneBug.x;
    oneBug.prevY = oneBug.y;
    oneBug.vx = dx * brakeFactor;
    oneBug.vy = dy * brakeFactor;
    oneBug.speed = Math.hypot(oneBug.vx, oneBug.vy);
    oneBug.x += oneBug.vx;
    oneBug.y += oneBug.vy;
    return true;
  }

  function update() {
    const now = p.millis();
    while (bugs.length < BUG_MAX_ACTIVE && now >= nextSpawnAtMs) {
      spawnBug();
      scheduleNextSpawn();
    }

    for (let i = bugs.length - 1; i >= 0; i--) {
      if (!updateBug(bugs[i])) {
        bugs.splice(i, 1);
      }
    }
  }

  function updateLandedByWave(sampleGradientByPixel) {
    const r = FOOD_FINAL_SIZE * 0.5;
    for (let i = 0; i < bugs.length; i++) {
      const oneBug = bugs[i];
      if (oneBug.mode !== "landed") continue;
      if (typeof oneBug.vx !== "number") oneBug.vx = 0;
      if (typeof oneBug.vy !== "number") oneBug.vy = 0;

      const grad = sampleGradientByPixel(oneBug.x, oneBug.y);
      if (grad) {
        oneBug.vx += -grad.dhdx * FOOD_WAVE_PUSH;
        oneBug.vy += -grad.dhdy * FOOD_WAVE_PUSH;
      }

      oneBug.vx *= FOOD_DRAG;
      oneBug.vy *= FOOD_DRAG;
      const speed = Math.hypot(oneBug.vx, oneBug.vy);
      if (speed > FOOD_MAX_SPEED) {
        const s = FOOD_MAX_SPEED / Math.max(1e-6, speed);
        oneBug.vx *= s;
        oneBug.vy *= s;
      }

      oneBug.x += oneBug.vx;
      oneBug.y += oneBug.vy;

      if (oneBug.x < r) {
        oneBug.x = r;
        oneBug.vx *= -0.3;
      } else if (oneBug.x > p.width - r) {
        oneBug.x = p.width - r;
        oneBug.vx *= -0.3;
      }
      if (oneBug.y < r) {
        oneBug.y = r;
        oneBug.vy *= -0.3;
      } else if (oneBug.y > p.height - r) {
        oneBug.y = p.height - r;
        oneBug.vy *= -0.3;
      }
    }
  }

  return {
    getBugs,
    getLandedBugs,
    removeBugById,
    consumePendingLandings,
    reset,
    update,
    updateLandedByWave,
  };
}
