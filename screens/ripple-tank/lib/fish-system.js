import {
  EAT_IMPULSE_STRENGTH,
  IMPULSE_RADIUS,
  MAX_FISH,
  MAX_FOOD,
  FISH_BASE_SPEED,
  FISH_SPEED_LERP,
  FISH_HEADING_LERP,
  FISH_MIN_TURN_RADIUS,
  FISH_TURN_SPEED_BOOST,
  FISH_LOG_CURVE_GAIN,
  FISH_LOG_CURVE_SCALE,
  SOFT_EDGE_MARGIN,
  FISH_SPAWN_MARGIN,
  FISH_REACH_DISTANCE,
  FISH_EAT_PAUSE_MS,
  TAIL_WAVE_DELAY_MS,
  FISH_PRE_EAT_SPEED_FACTOR,
  EAT_POP_HEAD_OFFSET_FACTOR,
  FISH_BLUR_PX,
  SEGMENT_COUNT,
  SEGMENT_SPACING,
  HEAD_SIZE,
  SHOULDER_SIZE,
} from "./constants.js";

export function createFishSystem(p, addImpulseByPixel) {
  let fishes = [];
  let pendingImpulses = [];

  function getFishes() {
    return fishes;
  }

  function reset() {
    fishes = [];
    pendingImpulses = [];
  }

  function scheduleImpulse(x, y, strength, radius, delayMs) {
    pendingImpulses.push({
      x,
      y,
      strength,
      radius,
      executeAtMs: p.millis() + delayMs,
    });
  }

  function processPendingImpulses() {
    const now = p.millis();
    for (let i = pendingImpulses.length - 1; i >= 0; i--) {
      const impulse = pendingImpulses[i];
      if (now < impulse.executeAtMs) continue;
      addImpulseByPixel(impulse.x, impulse.y, impulse.strength, impulse.radius);
      pendingImpulses.splice(i, 1);
    }
  }

  function onFoodPlaced(food, foods) {
    if (!food) return;

    if (fishes.length < MAX_FISH) {
      spawnFishOutside(food);
    }

    const allFoods = Array.isArray(foods) && foods.length > 0 ? foods : [food];
    for (let i = 0; i < fishes.length; i++) {
      const oneFish = fishes[i];
      // Keep pre-eat pause uninterrupted so bite animation and impulse stay coherent.
      if (oneFish.mode === "preEat") continue;
      assignNearestFoodTarget(oneFish, allFoods);
    }
  }

  function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function lerpAngle(from, to, amt) {
    return from + angleDelta(from, to) * amt;
  }

  function isInsideCanvas(x, y, pad = 0) {
    return x >= -pad && y >= -pad && x <= p.width + pad && y <= p.height + pad;
  }

  function isFishFarOutsideCanvas(oneFish) {
    if (!oneFish) return true;
    // Despawn only after the full body is clearly beyond canvas bounds.
    const despawnBuffer = SHOULDER_SIZE * 0.5 + FISH_BLUR_PX + SEGMENT_SPACING;
    for (let i = 0; i < oneFish.segments.length; i++) {
      const seg = oneFish.segments[i];
      if (isInsideCanvas(seg.x, seg.y, despawnBuffer)) return false;
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

  function getClosestFood(foods, x, y) {
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

  function assignNearestFoodTarget(oneFish, foods) {
    const nearest = getClosestFood(foods, oneFish.x, oneFish.y);
    if (!nearest) return null;
    oneFish.targetFoodId = nearest.id;
    if (oneFish.mode === "exit") {
      oneFish.mode = "hunt";
      oneFish.exitPoint = null;
    }
    return nearest;
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

  function updateSingleFish(oneFish, foods) {
    let target =
      oneFish.targetFoodId == null
        ? null
        : foods.find((food) => food.id === oneFish.targetFoodId) || null;

    if (!target && foods.length > 0) {
      target = assignNearestFoodTarget(oneFish, foods);
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
        scheduleImpulse(
          backWave.x,
          backWave.y,
          EAT_IMPULSE_STRENGTH,
          IMPULSE_RADIUS,
          TAIL_WAVE_DELAY_MS
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

  function update(foods) {
    processPendingImpulses();
    if (fishes.length > MAX_FISH) fishes.length = MAX_FISH;
    if (foods.length > MAX_FOOD) foods.splice(0, foods.length - MAX_FOOD);

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
      updateSingleFish(oneFish, foods);
      if (
        foods.length === 0 &&
        oneFish.mode === "exit" &&
        isFishFarOutsideCanvas(oneFish)
      ) {
        fishes.splice(i, 1);
      }
    }
  }

  return {
    getFishes,
    reset,
    onFoodPlaced,
    update,
  };
}
