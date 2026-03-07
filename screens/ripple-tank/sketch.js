// ripple-tank - p5 instance-mode sketch (ES module)
// Coarse-grid ripple simulation with fish-triggered ripples.

import { FISH_BLUR_PX, SIM_STEPS_PER_FRAME } from "./lib/constants.js";
import { createWaveSim } from "./lib/wave-sim.js";
import { createFoodSystem } from "./lib/food-system.js";
import { createFishSystem } from "./lib/fish-system.js";
import { drawFishBodies, drawOverlayFoodAndPop, drawHint } from "./lib/render.js";

export default function (p) {
  const waveSim = createWaveSim(p);
  const foodSystem = createFoodSystem(p, waveSim.addImpulseByPixel);
  const fishSystem = createFishSystem(p, waveSim.addImpulseByPixel);
  let blurLayer = null;

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

  function setupLayerCanvases(w, h) {
    if (!blurLayer) {
      blurLayer = p.createGraphics(w, h);
      blurLayer.pixelDensity(1);
      blurLayer.noSmooth();
    } else {
      blurLayer.resizeCanvas(w, h);
    }

    const panelEl = p.canvas.parentElement;
    const blurCanvas = blurLayer.canvas;
    blurCanvas.classList.add("ripple-tank-blur-layer");
    p.canvas.classList.add("ripple-tank-top-layer");
    blurCanvas.style.filter = "blur(" + FISH_BLUR_PX + "px)";
    blurCanvas.style.webkitFilter = "blur(" + FISH_BLUR_PX + "px)";
    if (panelEl && blurCanvas.parentElement !== panelEl) {
      panelEl.insertBefore(blurCanvas, p.canvas);
    }
  }

  p.setup = function () {
    const { w, h } = getCanvasSize();
    p.createCanvas(w, h);
    p.pixelDensity(1);
    p.noSmooth();
    setupLayerCanvases(w, h);
    resetScene();
  };

  p.draw = function () {
    const foods = foodSystem.getFoods();
    const fishes = fishSystem.getFishes();

    p.clear();
    blurLayer.clear();
    foodSystem.updateByWave(waveSim.sampleGradientByPixel);
    fishSystem.update(foods);
    simAccumulator += SIM_STEPS_PER_FRAME;
    while (simAccumulator >= 1) {
      waveSim.updateWaveStep();
      simAccumulator -= 1;
    }
    waveSim.renderField(blurLayer);
    drawFishBodies(p, blurLayer, fishes);
    drawOverlayFoodAndPop(p, foods, fishes);
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
    setupLayerCanvases(w, h);
    resetScene();
  };
}
