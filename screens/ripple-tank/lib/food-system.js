import {
  MAX_FOOD,
  FOOD_FINAL_SIZE,
  FOOD_LAND_IMPULSE_STRENGTH,
  FOOD_LAND_IMPULSE_RADIUS,
  FOOD_WAVE_PUSH,
  FOOD_DRAG,
  FOOD_MAX_SPEED,
} from "./constants.js";

export function createFoodSystem(p, addImpulseByPixel) {
  let foods = [];
  let nextFoodId = 1;

  function getFoods() {
    return foods;
  }

  function reset() {
    foods = [];
    nextFoodId = 1;
  }

  function placeFood(px, py) {
    if (px < 0 || py < 0 || px > p.width || py > p.height) return null;
    const food = {
      id: nextFoodId++,
      x: px,
      y: py,
      vx: 0,
      vy: 0,
    };
    foods.push(food);
    if (foods.length > MAX_FOOD) {
      foods.shift();
    }
    addImpulseByPixel(
      food.x,
      food.y,
      FOOD_LAND_IMPULSE_STRENGTH,
      FOOD_LAND_IMPULSE_RADIUS
    );
    return food;
  }

  function updateByWave(sampleGradientByPixel) {
    const r = FOOD_FINAL_SIZE * 0.5;
    for (let i = 0; i < foods.length; i++) {
      const food = foods[i];
      if (typeof food.vx !== "number") food.vx = 0;
      if (typeof food.vy !== "number") food.vy = 0;

      const grad = sampleGradientByPixel(food.x, food.y);
      if (grad) {
        // Move slightly along the local wave slope.
        food.vx += -grad.dhdx * FOOD_WAVE_PUSH;
        food.vy += -grad.dhdy * FOOD_WAVE_PUSH;
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

  return {
    getFoods,
    reset,
    placeFood,
    updateByWave,
  };
}
