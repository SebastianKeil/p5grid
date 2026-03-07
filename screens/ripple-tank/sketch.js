// ripple-tank - p5 instance-mode sketch (ES module)
// Coarse-grid ripple simulation with fish-triggered ripples.

import { SIM_STEPS_PER_FRAME, WAVE_BLUR_PX } from "./lib/constants.js";
import { createWaveSim } from "./lib/wave-sim.js";
import { createFoodSystem } from "./lib/food-system.js";
import { createFishSystem } from "./lib/fish-system.js";
import { drawFoodAndFish, drawHint } from "./lib/render.js";

export default function (p) {
  const waveSim = createWaveSim(p);
  const foodSystem = createFoodSystem(p, waveSim.addImpulseByPixel);
  const fishSystem = createFishSystem(p, waveSim.addImpulseByPixel);

  let simAccumulator = 0;

  function getCanvasSize() {
    const container = p.select("#sketch-container");
    return {
      w: container ? container.elt.clientWidth : p.windowWidth,
      h: container ? container.elt.clientHeight : p.windowHeight,
    };
  }

  function resetScene() {
    waveSim.resetSimulationLayout();
    waveSim.clearFields();
    foodSystem.reset();
    fishSystem.reset();
    simAccumulator = 0;
  }

  function placeFood(px, py) {
    const food = foodSystem.placeFood(px, py);
    if (food) fishSystem.onFoodPlaced(food, foodSystem.getFoods());
  }

  p.setup = function () {
    const { w, h } = getCanvasSize();
    p.createCanvas(w, h);
    p.pixelDensity(1);
    p.noSmooth();
    resetScene();
  };

  p.draw = function () {
    p.clear();
    foodSystem.updateByWave(waveSim.sampleGradientByPixel);
    fishSystem.update(foodSystem.getFoods());
    simAccumulator += SIM_STEPS_PER_FRAME;
    while (simAccumulator >= 1) {
      waveSim.updateWaveStep();
      simAccumulator -= 1;
    }
    p.drawingContext.filter = "blur(" + WAVE_BLUR_PX + "px)";
    waveSim.renderField();
    p.drawingContext.filter = "none";
    drawFoodAndFish(p, foodSystem.getFoods(), fishSystem.getFishes());
    drawHint(p);
  };

  p.mousePressed = function (event) {
    if (event && event.target !== p.canvas) return;
    placeFood(p.mouseX, p.mouseY);
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
    const { w, h } = getCanvasSize();
    p.resizeCanvas(w, h);
    resetScene();
  };
}
