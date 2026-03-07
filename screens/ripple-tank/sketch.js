// ripple-tank - p5 instance-mode sketch (ES module)
// Coarse-grid ripple simulation with fish-triggered ripples.

import {
  FISH_LAYER_CSS_BLUR_PX,
  SIM_STEPS_PER_FRAME,
  WAVE_LAYER_CSS_BLUR_PX,
} from "./lib/constants.js";
import { createWaveSim } from "./lib/wave-sim.js";
import { createFoodSystem } from "./lib/food-system.js";
import { createFishSystem } from "./lib/fish-system.js";
import * as render from "./lib/render.js";

export default function (p) {
  const waveSim = createWaveSim(p);
  const foodSystem = createFoodSystem(p, waveSim.addImpulseByPixel);
  const fishSystem = createFishSystem(p, waveSim.addImpulseByPixel);
  let waveLayer = null;
  let fishLayer = null;

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
    if (!waveLayer) {
      waveLayer = p.createGraphics(w, h);
      waveLayer.pixelDensity(1);
      waveLayer.noSmooth();
    } else waveLayer.resizeCanvas(w, h);
    if (!fishLayer) {
      fishLayer = p.createGraphics(w, h);
      fishLayer.pixelDensity(1);
      fishLayer.noSmooth();
    } else fishLayer.resizeCanvas(w, h);

    const panelEl = p.canvas.parentElement;
    const waveCanvas = waveLayer.canvas;
    const fishCanvas = fishLayer.canvas;
    waveCanvas.classList.add("ripple-tank-wave-layer");
    fishCanvas.classList.add("ripple-tank-fish-layer");
    p.canvas.classList.add("ripple-tank-top-layer");
    // p5.Graphics canvases are created as hidden offscreen buffers by default.
    // We explicitly show both because they are used as visible underlay layers.
    waveCanvas.style.display = "block";
    waveCanvas.style.visibility = "visible";
    fishCanvas.style.display = "block";
    fishCanvas.style.visibility = "visible";

    const waveFilter =
      "blur(" + WAVE_LAYER_CSS_BLUR_PX + "px) saturate(1.1) brightness(1.05)";
    waveCanvas.style.filter = waveFilter;
    waveCanvas.style.webkitFilter = waveFilter;

    const fishFilter =
      "blur(" + FISH_LAYER_CSS_BLUR_PX + "px) saturate(1.35) brightness(1.15)";
    fishCanvas.style.filter = fishFilter;
    fishCanvas.style.webkitFilter = fishFilter;

    if (panelEl) {
      if (waveCanvas.parentElement !== panelEl) panelEl.insertBefore(waveCanvas, p.canvas);
      if (fishCanvas.parentElement !== panelEl) panelEl.insertBefore(fishCanvas, p.canvas);
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
    waveLayer.clear();
    fishLayer.clear();
    foodSystem.updateByWave(waveSim.sampleGradientByPixel);
    fishSystem.update(foods);
    simAccumulator += SIM_STEPS_PER_FRAME;
    while (simAccumulator >= 1) {
      waveSim.updateWaveStep();
      simAccumulator -= 1;
    }
    const hasSplitRender =
      typeof render.drawFishBodies === "function" &&
      typeof render.drawOverlayFoodAndPop === "function";
    if (hasSplitRender) {
      waveSim.renderField(waveLayer);
      render.drawFishBodies(p, fishLayer, fishes);
      render.drawOverlayFoodAndPop(p, foods, fishes);
    } else {
      // Compatibility fallback for deployments where render.js is still on old API.
      waveSim.renderField(p);
      if (typeof render.drawFoodAndFish === "function") {
        render.drawFoodAndFish(p, foods, fishes);
      }
    }
    if (typeof render.drawHint === "function") render.drawHint(p);
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
