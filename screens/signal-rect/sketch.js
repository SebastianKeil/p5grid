// signal_rect – p5 instance-mode sketch (ES module)
// Fourier series visualisation with epicircles & wave diagram
// Features: waveform selector, spectrum chart, sign-coloured orbits

export default function (p) {

  // ---- State ----
  let time = 0;
  let wave = [];
  let groundwave = [];

  // ---- Controls ----
  let speedSlider, harmonicsSlider;
  let waveformType = "square";
  let waveformBtns = [];
  const WAVEFORMS = ["square", "sawtooth", "triangle"];
  let baseBtnCSS = "";
  let activeBtnCSS = "";

  const PANEL_W = 330;
  const PANEL_H = 114;
  const PANEL_BG_ALPHA = 80; // 0..255 (lower = more transparent)
  const BTN_W = 92;
  const BTN_GAP = 8;

  // ---- Palette ----
  const COL_CORAL = [255, 107, 138];   // negative coefficient / full wave
  const COL_CYAN  = [91, 206, 250];    // positive coefficient / ground wave

  // ---- Layout ----
  let circlesCX, circlesCY;
  let waveTop, waveBottom, waveMidX;
  let waveFrameLeft, waveFrameRight;
  let maxWaveLen;

  function updateLayoutMetrics(w, h) {
    circlesCX = w / 2;
    circlesCY = h * 0.25;
    waveTop = h * 0.50;
    waveBottom = h - 15;
    waveMidX = w / 2;
    waveFrameLeft = 40;
    waveFrameRight = w - 40;
    maxWaveLen = waveBottom - waveTop;
  }

  function getControlPanelLayout() {
    const panelX = p.width * 0.5 - PANEL_W * 0.5;
    const panelY = p.height - PANEL_H - 14;
    const totalBtnW = WAVEFORMS.length * BTN_W + (WAVEFORMS.length - 1) * BTN_GAP;
    const btnStartX = panelX + (PANEL_W - totalBtnW) * 0.5;
    return {
      panelX,
      panelY,
      btnStartX,
      btnY: panelY + 10,
      sliderX: panelX + 95,
      speedY: panelY + 56,
      harmonicsY: panelY + 82,
      labelX: panelX + 88,
    };
  }

  function placeControls() {
    const layout = getControlPanelLayout();
    waveformBtns.forEach((btn, idx) => {
      btn.position(layout.btnStartX + idx * (BTN_W + BTN_GAP), layout.btnY);
    });
    if (speedSlider) speedSlider.position(layout.sliderX, layout.speedY);
    if (harmonicsSlider) harmonicsSlider.position(layout.sliderX, layout.harmonicsY);
  }

  // ========== Fourier coefficients per waveform ==========
  function getHarmonic(type, i) {
    switch (type) {
      case "square": {
        const n = i * 2 + 1;
        return { n, coeff: 4 / (n * Math.PI) };
      }
      case "sawtooth": {
        const n = i + 1;
        return { n, coeff: (2 * Math.pow(-1, n + 1)) / (n * Math.PI) };
      }
      case "triangle": {
        const n = i * 2 + 1;
        const sign = Math.pow(-1, (n - 1) / 2);
        return { n, coeff: (8 * sign) / (n * n * Math.PI * Math.PI) };
      }
    }
  }

  function clearWaves() {
    wave = [];
    groundwave = [];
  }

  // ========== Orbit colour by sign ==========
  // Positive coefficient → teal family, negative → coral family
  // Hue still shifts slightly per index for differentiation
  function orbitColorBySign(coeff, i, total) {
    if (coeff >= 0) {
      // Teal range (170 – 220)
      const hue = p.map(i, 0, Math.max(total - 1, 1), 170, 220);
      p.colorMode(p.HSB, 360, 100, 100, 255);
      const c = p.color(hue, 55, 90, 130);
      p.colorMode(p.RGB, 255);
      return c;
    } else {
      // Coral/pink range (330 – 360)
      const hue = p.map(i, 0, Math.max(total - 1, 1), 330, 360);
      p.colorMode(p.HSB, 360, 100, 100, 255);
      const c = p.color(hue, 55, 95, 130);
      p.colorMode(p.RGB, 255);
      return c;
    }
  }

  // ========== Spectrum bar chart ==========
  function drawSpectrum(harmonics, panel) {
    const barW = 6;
    const barGap = 2;
    const maxBarH = 28;
    // Reference amplitude for normalisation (fundamental of square wave = largest possible)
    const refAmp = (4 / Math.PI) * 100;

    const totalW = harmonics * (barW + barGap) - barGap;
    const baseX = panel.panelX + PANEL_W - totalW - 12;
    const baseY = panel.panelY + PANEL_H - 18;

    // Zero line
    p.stroke(36, 54, 88, 70);
    p.strokeWeight(1);
    p.line(baseX - 6, baseY, baseX + totalW + 6, baseY);

    for (let i = 0; i < harmonics; i++) {
      const harm = getHarmonic(waveformType, i);
      const amplitude = harm.coeff * 100;
      const barH = (amplitude / refAmp) * maxBarH;

      const bx = baseX + i * (barW + barGap);

      // Bar — positive goes up (teal), negative goes down (coral)
      p.noStroke();
      if (barH >= 0) {
        p.fill(COL_CYAN[0], COL_CYAN[1], COL_CYAN[2], 160);
        p.rect(bx, baseY - barH, barW, barH, 3);
      } else {
        p.fill(COL_CORAL[0], COL_CORAL[1], COL_CORAL[2], 160);
        p.rect(bx, baseY, barW, -barH, 3);
      }

      // Harmonic number label
      p.fill(36, 54, 88, 135);
      p.textSize(7);
      p.textAlign(p.CENTER, p.TOP);
      p.text(harm.n, bx + barW / 2, baseY + 4);
    }

    // Axis label
    p.fill(36, 54, 88, 170);
    p.textSize(8);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text("spectrum", baseX + totalW / 2, baseY - maxBarH - 4);
  }

  // ========== Setup ==========
  p.setup = function () {
    const w = p.select("#sketch-container").elt.clientWidth;
    const h = p.select("#sketch-container").elt.clientHeight;
    p.createCanvas(w, h);

    // Layout zones
    updateLayoutMetrics(w, h);

    const baseBtnCSSLocal =
      "background:rgba(255,255,255,0.14);border:1px solid rgba(36,54,88,0.45);color:rgba(36,54,88,0.9);" +
      "padding:4px 0;width:" + BTN_W + "px;border-radius:14px;font-size:11px;cursor:pointer;" +
      "font-family:inherit;text-align:center;transition:all .15s;";
    const activeBtnCSSLocal =
      baseBtnCSSLocal +
      "border-color:rgba(36,54,88,0.95);color:rgba(22,35,60,1);background:rgba(255,255,255,0.52);";
    baseBtnCSS = baseBtnCSSLocal;
    activeBtnCSS = activeBtnCSSLocal;

    WAVEFORMS.forEach((type, idx) => {
      const btn = p.createButton(type);
      btn.position(0, 0);
      btn.style(type === waveformType ? activeBtnCSS : baseBtnCSS);
      btn.mousePressed(() => {
        waveformType = type;
        clearWaves();
        waveformBtns.forEach((b, j) => {
          b.style(WAVEFORMS[j] === waveformType ? activeBtnCSS : baseBtnCSS);
        });
      });
      waveformBtns.push(btn);
    });

    // ---- Sliders (inside control panel) ----
    const sliderW = "128px";

    speedSlider = p.createSlider(1, 100, 51);
    speedSlider.style("width", sliderW);

    harmonicsSlider = p.createSlider(1, 10, 3);
    harmonicsSlider.style("width", sliderW);

    placeControls();
  };

  // ========== Draw ==========
  p.draw = function () {
    p.clear();

    const harmonics = harmonicsSlider.value();

    // ---------- Top half: epicircles ----------
    p.push();
    p.translate(circlesCX, circlesCY);

    let x = 0, y = 0;
    let x_0 = 0, y_0 = 0;

    for (let i = 0; i < harmonics; i++) {
      const harm = getHarmonic(waveformType, i);
      const rawR = harm.coeff * 100;

      const px = x, py = y;
      x += rawR * p.sin(harm.n * time);
      y += -rawR * p.cos(harm.n * time);

      // Orbit circle — coloured by coefficient sign
      const oc = orbitColorBySign(harm.coeff, i, harmonics);
      p.stroke(oc);
      p.strokeWeight(1.5);
      p.noFill();
      p.ellipse(px, py, Math.abs(rawR) * 2);

      // Arm line — tinted by sign
      if (harm.coeff >= 0) {
        p.stroke(COL_CYAN[0], COL_CYAN[1], COL_CYAN[2], 150);
      } else {
        p.stroke(COL_CORAL[0], COL_CORAL[1], COL_CORAL[2], 150);
      }
      p.strokeWeight(2);
      p.line(px, py, x, y);

      // Fundamental bookkeeping
      if (i === 0) {
        x_0 = x;
        y_0 = y;
        groundwave.unshift(x_0);
      }

      // Tip glow on last harmonic
      if (i === harmonics - 1) {
        p.noStroke();
        p.fill(255, 255, 255, 15);  p.ellipse(x, y, 28);
        p.fill(255, 255, 255, 30);  p.ellipse(x, y, 18);
        p.fill(255, 255, 255, 60);  p.ellipse(x, y, 10);
        p.fill(255);                 p.ellipse(x, y, 5);
      }
    }

    wave.unshift(x);
    p.pop();

    // ---------- Divider ----------
    p.stroke(255, 255, 255, 35);
    p.strokeWeight(1.5);
    p.line(0, waveTop - 10, p.width, waveTop - 10);

    // ---------- Connection lines ----------
    // Fundamental (cyan)
    p.stroke(COL_CYAN[0], COL_CYAN[1], COL_CYAN[2], 100);
    p.strokeWeight(1.5);
    p.line(circlesCX + x_0, circlesCY + y_0, circlesCX + x_0, waveTop);

    // Full wave (coral)
    p.stroke(COL_CORAL[0], COL_CORAL[1], COL_CORAL[2], 100);
    p.strokeWeight(1.5);
    p.line(circlesCX + x, circlesCY + y, circlesCX + x, waveTop);

    // ---------- Bottom half: wave diagram ----------
    // Frame
    p.stroke(255, 255, 255, 50);
    p.strokeWeight(1.5);
    p.noFill();
    p.rect(waveFrameLeft, waveTop, waveFrameRight - waveFrameLeft, waveBottom - waveTop);

    // Zero line
    p.stroke(255, 255, 255, 25);
    p.line(waveMidX, waveTop, waveMidX, waveBottom);

    p.push();
    p.translate(waveMidX, waveTop);

    // Groundwave trace (cyan, fading)
    p.noStroke();
    p.fill(COL_CYAN[0], COL_CYAN[1], COL_CYAN[2], 200);
    p.ellipse(x_0, 0, 6);

    p.noFill();
    for (let i = 1; i < groundwave.length; i++) {
      const a = p.map(i, 0, groundwave.length, 200, 0);
      p.stroke(COL_CYAN[0], COL_CYAN[1], COL_CYAN[2], a);
      p.strokeWeight(2.5);
      p.line(groundwave[i - 1], i - 1, groundwave[i], i);
    }

    // Full wave trace (coral, fading)
    p.noStroke();
    p.fill(COL_CORAL[0], COL_CORAL[1], COL_CORAL[2], 200);
    p.ellipse(x, 0, 6);

    p.noFill();
    for (let i = 1; i < wave.length; i++) {
      const a = p.map(i, 0, wave.length, 200, 0);
      p.stroke(COL_CORAL[0], COL_CORAL[1], COL_CORAL[2], a);
      p.strokeWeight(2.5);
      p.line(wave[i - 1], i - 1, wave[i], i);
    }

    p.pop();

    // ---------- Controls panel ----------
    const panel = getControlPanelLayout();
    p.noStroke();
    p.fill(242, 246, 255, PANEL_BG_ALPHA);
    p.rect(panel.panelX, panel.panelY, PANEL_W, PANEL_H, 10);
    drawSpectrum(harmonics, panel);

    // ---------- Slider labels ----------
    p.noStroke();
    p.fill(36, 54, 88, 220);
    p.textSize(10);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text("speed", panel.labelX, panel.speedY + 8);
    p.text("harmonics", panel.labelX, panel.harmonicsY + 8);

    // ---------- Trim arrays ----------
    if (groundwave.length >= maxWaveLen) groundwave.pop();
    if (wave.length >= maxWaveLen)       wave.pop();

    time -= 1 / (101 - speedSlider.value());
  };

  p.windowResized = function () {
    const w = p.select("#sketch-container").elt.clientWidth;
    const h = p.select("#sketch-container").elt.clientHeight;
    p.resizeCanvas(w, h);
    updateLayoutMetrics(w, h);
    placeControls();
  };
}
