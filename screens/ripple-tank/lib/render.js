import {
  FOOD_FINAL_SIZE,
  FISH_BLUR_PX,
  HEAD_SIZE,
  SHOULDER_SIZE,
  FISH_EAT_PAUSE_MS,
  EAT_POP_HEAD_OFFSET_FACTOR,
} from "./constants.js";

function getEatPopCenter(oneFish) {
  const head = oneFish.segments[0];
  const offset = HEAD_SIZE * EAT_POP_HEAD_OFFSET_FACTOR;
  return {
    x: head.x + Math.cos(oneFish.heading) * offset,
    y: head.y + Math.sin(oneFish.heading) * offset,
  };
}

export function drawFoodAndFish(p, foods, fishes) {
  p.push();
  p.noStroke();

  // Draw food pellets first so fish layers render above them.
  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    p.fill(255, 230, 120, 200);
    p.circle(food.x, food.y, FOOD_FINAL_SIZE);
  }

  if (fishes.length > 0) {
    // Soft fish body rendering pass.
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
        } else {
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

    // Crisp pre-eat pop rendered after blur, so it stays sharp.
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
