// ripple-tank - p5 instance-mode sketch (ES module)
// Coarse-grid ripple simulation with fish-triggered ripples.

import {
  FISH_LAYER_CSS_BLUR_PX,
  FOOD_LAND_IMPULSE_RADIUS,
  FOOD_LAND_IMPULSE_STRENGTH,
  SIM_STEPS_PER_FRAME,
  WAVE_LAYER_CSS_BLUR_PX,
} from "./lib/constants.js";
import { createWaveSim } from "./lib/wave-sim.js";
import { createFoodSystem } from "./lib/food-system.js";
import { createFishSystem } from "./lib/fish-system.js";
import { createBugSystem } from "./lib/bug-system.js";
import * as render from "./lib/render.js";

export default function (p) {
  const waveSim = createWaveSim(p);
  const foodSystem = createFoodSystem(p, waveSim.addImpulseByPixel);
  const bugSystem = createBugSystem(p);
  const fishSystem = createFishSystem(p, waveSim.addImpulseByPixel, {
    onTargetEaten(target) {
      if (!target) return;
      if (target.kind === "bug") {
        bugSystem.removeBugById(target.id);
      } else {
        foodSystem.removeFoodById(target.id);
      }
    },
  });
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
    bugSystem.reset();
    simAccumulator = 0;
  }

  function placeFood(px, py) {
    const food = foodSystem.placeFood(px, py);
    if (food) fishSystem.onFoodPlaced(food, getBaits());
  }

  function getBaits() {
    return foodSystem.getFoods().concat(bugSystem.getLandedBugs());
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
    const fishes = fishSystem.getFishes();
    const bugs = bugSystem.getBugs();

    p.clear();
    waveLayer.clear();
    fishLayer.clear();
    bugSystem.update();
    const landings = bugSystem.consumePendingLandings();
    for (let i = 0; i < landings.length; i++) {
      waveSim.addImpulseByPixel(
        landings[i].x,
        landings[i].y,
        FOOD_LAND_IMPULSE_STRENGTH,
        FOOD_LAND_IMPULSE_RADIUS
      );
      fishSystem.onFoodPlaced(landings[i], getBaits());
    }
    const foods = foodSystem.getFoods();
    foodSystem.updateByWave(waveSim.sampleGradientByPixel);
    bugSystem.updateLandedByWave(waveSim.sampleGradientByPixel);
    fishSystem.update(getBaits());
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
      render.drawOverlayFoodAndPop(
        p,
        foods,
        fishes,
        bugs,
        waveSim.sampleGradientByPixel,
        waveSim.sampleHeightByPixel
      );
    } else {
      // Compatibility fallback for deployments where render.js is still on old API.
      waveSim.renderField(p);
      if (typeof render.drawFoodAndFish === "function") {
        render.drawFoodAndFish(p, foods, fishes);
      }
    }
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
