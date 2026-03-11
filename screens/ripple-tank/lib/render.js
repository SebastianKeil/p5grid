import {
  FOOD_FINAL_SIZE,
  HEAD_SIZE,
  SHOULDER_SIZE,
  FISH_EAT_PAUSE_MS,
  EAT_POP_HEAD_OFFSET_FACTOR,
  BUG_BODY_SIZE,
  BUG_WING_ALPHA,
  BUG_WING_OFFSET,
  BUG_WING_SIZE,
} from "./constants.js";

function drawFishBodyPass(p, target, oneFish, sizeBoost, alphaScale) {
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
    } else {
      const tt = (i - 5) / 2;
      d = p.lerp(SHOULDER_SIZE, 20, tt);
    }
    const jitter = Math.sin(p.frameCount * 0.07 + i * 0.63) * 2.1;
    d += jitter + sizeBoost;

    const alpha = (i < 3 ? 185 : 145 - t * 50) * alphaScale;
    target.fill(p.red(koiCol), p.green(koiCol), p.blue(koiCol), alpha);
    target.ellipse(seg.x, seg.y, d, d * 0.72);
  }

  const eyeX = oneFish.segments[0].x + Math.cos(oneFish.heading) * 7;
  const eyeY = oneFish.segments[0].y + Math.sin(oneFish.heading) * 7;
  target.fill(255, 230 * alphaScale);
  target.circle(eyeX, eyeY, 3.2);
}

function getEatPopCenter(oneFish) {
  const head = oneFish.segments[0];
  const offset = HEAD_SIZE * EAT_POP_HEAD_OFFSET_FACTOR;
  return {
    x: head.x + Math.cos(oneFish.heading) * offset,
    y: head.y + Math.sin(oneFish.heading) * offset,
  };
}

function drawWaterLilyLeaf(p, x, y, size, rot) {
  p.push();
  p.translate(x, y);
  p.rotate(rot);
  p.noStroke();
  p.fill(62, 138, 84, 185);
  p.ellipse(0, 0, size, size * 0.85);
  p.fill(84, 170, 108, 120);
  p.ellipse(-size * 0.12, -size * 0.1, size * 0.5, size * 0.38);

  // Small notch so each leaf reads clearly as a lily pad.
  p.fill(26, 70, 48, 130);
  p.triangle(0, 0, size * 0.5, -size * 0.08, size * 0.5, size * 0.08);
  p.pop();
}

function drawWaterLilies(
  p,
  sampleGradientByPixel,
  sampleHeightByPixel
) {
  const baseX = p.width * 0.16;
  const baseY = p.height * 0.2;
  const t = p.millis() * 0.001;
  const leaves = [
    { x: 0, y: 0, s: 82, r: 0.2, phase: 0.1, amp: 0.07 },
    { x: 52, y: 18, s: 68, r: -0.25, phase: 0.7, amp: 0.08 },
    { x: 24, y: 58, s: 74, r: 0.48, phase: 1.2, amp: 0.06 },
    { x: 94, y: 54, s: 62, r: 0.06, phase: 1.8, amp: 0.08 },
    { x: 118, y: 2, s: 54, r: -0.38, phase: 2.3, amp: 0.09 },
    { x: 146, y: 36, s: 58, r: 0.14, phase: 2.9, amp: 0.08 },
    { x: 74, y: -24, s: 50, r: -0.12, phase: 3.3, amp: 0.07 },
    { x: -34, y: 34, s: 60, r: 0.3, phase: 3.8, amp: 0.08 },
    { x: 8, y: 94, s: 56, r: -0.34, phase: 4.2, amp: 0.09 },
    { x: 170, y: -10, s: 46, r: 0.22, phase: 4.9, amp: 0.08 },
    { x: 196, y: 26, s: 44, r: -0.18, phase: 5.4, amp: 0.07 },
    { x: 132, y: 82, s: 52, r: 0.36, phase: 5.9, amp: 0.08 },
  ];

  p.push();
  for (let i = 0; i < leaves.length; i++) {
    const oneLeaf = leaves[i];
    // Gentle procedural wiggle, intentionally independent from the wave simulation.
    const wiggleRot = Math.sin(t * 0.9 + oneLeaf.phase) * oneLeaf.amp;
    const wiggleX = Math.cos(t * 0.75 + oneLeaf.phase) * 1.4;
    const wiggleY = Math.sin(t * 0.62 + oneLeaf.phase) * 1.1;
    const baseLeafX = baseX + oneLeaf.x + wiggleX;
    const baseLeafY = baseY + oneLeaf.y + wiggleY;

    let rippleX = 0;
    let rippleY = 0;
    let rippleRot = 0;
    let bobY = 0;
    if (typeof sampleGradientByPixel === "function") {
      const grad = sampleGradientByPixel(baseLeafX, baseLeafY);
      if (grad) {
        // Strong coupling so ripple influence is clearly visible.
        rippleX = p.constrain(-grad.dhdx * 70, -16, 16);
        rippleY = p.constrain(-grad.dhdy * 70, -16, 16);
        rippleRot = p.constrain((grad.dhdx - grad.dhdy) * 1.8, -0.75, 0.75);
      }
    }
    if (typeof sampleHeightByPixel === "function") {
      const localHeight = sampleHeightByPixel(baseLeafX, baseLeafY);
      if (typeof localHeight === "number") {
        bobY = p.constrain(localHeight * 18, -8, 8);
      }
    }

    drawWaterLilyLeaf(
      p,
      baseLeafX + rippleX,
      baseLeafY + rippleY + bobY,
      oneLeaf.s,
      oneLeaf.r + wiggleRot + rippleRot
    );
  }
  p.pop();
}

export function drawFishBodies(p, target, fishes) {
  if (fishes.length === 0) return;
  target.push();
  target.noStroke();
  for (let f = 0; f < fishes.length; f++) {
    drawFishBodyPass(p, target, fishes[f], 0, 1);
  }
  target.pop();
}

export function drawBugs(p, bugs) {
  if (!bugs || bugs.length === 0) return;
  p.push();
  p.noStroke();
  for (let i = 0; i < bugs.length; i++) {
    const oneBug = bugs[i];
    const nx = -Math.sin(oneBug.heading);
    const ny = Math.cos(oneBug.heading);
    const wx = nx * BUG_WING_OFFSET;
    const wy = ny * BUG_WING_OFFSET;

    p.fill(255, BUG_WING_ALPHA);
    p.circle(oneBug.x + wx, oneBug.y + wy, BUG_WING_SIZE);
    p.circle(oneBug.x - wx, oneBug.y - wy, BUG_WING_SIZE);

    p.fill(18, 18, 18, 240);
    p.circle(oneBug.x, oneBug.y, BUG_BODY_SIZE);
  }
  p.pop();
}

export function drawOverlayFoodAndPop(
  p,
  foods,
  fishes,
  bugs,
  sampleGradientByPixel,
  sampleHeightByPixel
) {
  p.push();
  p.noStroke();

  drawWaterLilies(
    p,
    sampleGradientByPixel,
    sampleHeightByPixel
  );
  drawBugs(p, bugs);

  // Draw food pellets on crisp top layer.
  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    p.fill(255, 230, 120, 200);
    p.circle(food.x, food.y, FOOD_FINAL_SIZE);
  }

  if (fishes.length > 0) {
    // Crisp pre-eat pop rendered on top layer.
    for (let f = 0; f < fishes.length; f++) {
      const oneFish = fishes[f];
      if (oneFish.mode !== "preEat") continue;
      const duration = Math.max(1, FISH_EAT_PAUSE_MS);
      const t = p.constrain(1 - (oneFish.pauseUntilMs - p.millis()) / duration, 0, 1);
      const pulse = t < 0.5 ? t * 2 : (1 - t) * 2;
      const popSize = (HEAD_SIZE / 2) * pulse;
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

// Backward-compatible surface for older sketch integrations.
export function drawFoodAndFish(p, foods, fishes) {
  drawOverlayFoodAndPop(p, foods, fishes);
}

export function drawHint(p) {
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
