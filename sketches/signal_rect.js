// signal_rect – p5 instance-mode sketch
// Fourier series / signal visualization
// Vertical layout: epicircles on top, wave diagram below
// Wave diagram rotated 90°: time ↓, amplitude →
// Epicircles rotated 90° so x = sin (square wave), connection drops straight down

function signalRectSketch(p) {

  // ---- Sketch state ----
  let time = 0;
  let wave = [];
  let groundwave = [];
  let speed;  // slider
  let slider; // harmonics slider

  // ---- Layout (computed in setup) ----
  let circlesCX, circlesCY;   // center of epicircle area
  let waveTop;                 // top edge of wave area
  let waveBottom;              // bottom edge of wave area
  let waveMidX;                // vertical zero-line X (= circlesCX)
  let waveFrameLeft;           // left edge of wave frame
  let waveFrameRight;          // right edge of wave frame
  let maxWaveLen;              // max samples (vertical pixels)

  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;
    p.createCanvas(w, h);

    speed = p.createSlider(1, 100, 50);
    speed.position(20, 20);
    slider = p.createSlider(1, 10, 1);
    slider.position(20, 50);

    circlesCX      = w / 2;
    circlesCY      = h * 0.25;
    waveTop        = h * 0.5;
    waveBottom     = h - 15;
    waveMidX       = w / 2;          // same as circlesCX
    waveFrameLeft  = 40;
    waveFrameRight = w - 40;
    maxWaveLen     = waveBottom - waveTop;
  };

  p.draw = function () {
    p.background(0);

    // ========== Top half: epicircles ==========
    p.push();
    p.translate(circlesCX, circlesCY);

    let radius;
    let x = 0;
    let y = 0;
    let y_0, x_0;

    for (let i = 0; i < slider.value(); i++) {
      let prevx = x;
      let prevy = y;
      let n = i * 2 + 1;

      radius = 100 * (4 / ((n - 1) * p.PI + p.PI));
      x += radius * p.sin(n * time);      // sin → horizontal (square wave)
      y += -radius * p.cos(n * time);     // -cos → vertical (90° rotation)

      p.stroke(50 * i, 50 * i / 2 + 50, 150 - 50 * i / 3);
      p.noFill();
      p.ellipse(prevx, prevy, radius * 2);

      p.fill(255);
      p.line(x, y, prevx, prevy);

      if (i === 0) {
        x_0 = x;
        y_0 = y;
        groundwave.unshift(x_0);   // record x-component (cos)
      }

      if (i === slider.value() - 1) {
        p.noStroke();
        p.fill(255, 0, 0);
        p.ellipse(x, y, 6);
      }
    }

    wave.unshift(x);                 // record x-component (cos)
    p.pop();

    // ========== Divider ==========
    p.stroke(250, 250, 250, 40);
    p.line(0, waveTop - 10, p.width, waveTop - 10);

    // ========== Connection lines — straight down from tip to wave ==========
    // The x-position of the tip matches the horizontal wave position exactly.

    // Groundwave (blue)
    p.stroke(0, 0, 200, 120);
    p.line(circlesCX + x_0, circlesCY + y_0, circlesCX + x_0, waveTop);

    // Full wave (red)
    p.stroke(200, 0, 0, 120);
    p.line(circlesCX + x, circlesCY + y, circlesCX + x, waveTop);

    // ========== Bottom half: wave diagram ==========
    // Frame
    p.stroke(250, 250, 250, 80);
    p.noFill();
    p.rect(waveFrameLeft, waveTop, waveFrameRight - waveFrameLeft, waveBottom - waveTop);

    // Zero line (vertical center)
    p.line(waveMidX, waveTop, waveMidX, waveBottom);

    p.push();
    p.translate(waveMidX, waveTop);
    // Now: x = amplitude (right = positive), y = time (down = forward)

    // Groundwave trace (blue)
    p.fill(0, 0, 200);
    p.ellipse(x_0, 0, 4);
    p.stroke(0, 0, 200);
    p.beginShape();
    p.noFill();
    for (let i = 0; i < groundwave.length; i++) {
      p.vertex(groundwave[i], i);
    }
    p.endShape();

    // Full wave trace (red)
    p.fill(200, 0, 0);
    p.ellipse(x, 0, 4);
    p.stroke(200, 0, 0);
    p.beginShape();
    p.noFill();
    for (let i = 0; i < wave.length; i++) {
      p.vertex(wave[i], i);
    }
    p.endShape();

    // RMS reference lines (vertical)
    let rms = p.max(wave) / p.sqrt(2);
    p.stroke(0, 200, 200);
    p.line(rms, 0, rms, maxWaveLen);
    p.stroke(200, 100, 200);
    p.line(x / p.sqrt(2), 0, x / p.sqrt(2), maxWaveLen);
    p.line(-p.max(groundwave) / p.sqrt(2), 0, -p.max(groundwave) / p.sqrt(2), maxWaveLen);

    p.pop();

    // Trim arrays to visible length
    if (groundwave.length >= maxWaveLen) {
      groundwave.pop();
    }
    if (wave.length >= maxWaveLen) {
      wave.pop();
    }

    time -= 1 / speed.value();
  };
}
