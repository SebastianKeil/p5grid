// Pretty_curiosity – p5 instance-mode sketch (ES module)
// 24x24 checkerboard on a smaller square canvas, tilted via CSS 3D transforms
// Tilt follows the mouse for an interactive parallax effect

export default function(p) {

  // ---- Constants ----
  const TILES = 24;
  const MAX_TILT = 25; // max degrees of rotation in each axis

  // ---- Sketch state ----
  let tile_size;
  let boardSize;
  let checkerboard = [];
  let shadows = [];
  let cnv;         // p5 canvas wrapper
  let parentEl;    // the sketch-container element

  let color1, color2, color3, color4, color5, color6;

  // Ring boundaries (centered on the 24x24 grid)
  let mid_x0, mid_x1, mid_y0, mid_y1;
  let inn_x0, inn_x1, inn_y0, inn_y1;

  // Current tilt (smoothed)
  let targetRotX = 15;
  let targetRotY = -20;
  let currentRotX = 15;
  let currentRotY = -20;

  function computeRings() {
    // 16x16 centered inside 24x24 → starts at 4, ends at 20
    mid_x0 = 4;  mid_x1 = 20;
    mid_y0 = 4;  mid_y1 = 20;

    // 8x8 centered inside 24x24 → starts at 8, ends at 16
    inn_x0 = 8;  inn_x1 = 16;
    inn_y0 = 8;  inn_y1 = 16;
  }

  function fill_checkerboard() {
    color1 = p.color("#738ACF");
    color2 = p.color("#F2C3FA");
    color3 = p.color("#009DEB");
    color4 = p.color("#FAB5E6");
    color5 = p.color("#0C9788");
    color6 = p.color("#FCD466");

    for (let i = 0; i < TILES; i++) {
      checkerboard[i] = [];
      for (let j = 0; j < TILES; j++) {
        checkerboard[i][j] = (i + j) % 2 === 0 ? color1 : color2;
      }
    }

    for (let i = mid_x0; i < mid_x1; i++) {
      for (let j = mid_y0; j < mid_y1; j++) {
        checkerboard[i][j] = (i + j) % 2 === 0 ? color3 : color4;
      }
    }

    for (let i = inn_x0; i < inn_x1; i++) {
      for (let j = inn_y0; j < inn_y1; j++) {
        checkerboard[i][j] = (i + j) % 2 === 0 ? color5 : color6;
      }
    }
  }

  function fill_shadows() {
    for (let i = 0; i < TILES; i++) {
      shadows[i] = [];
      for (let j = 0; j < TILES; j++) {
        shadows[i][j] = (i + j) % 2 === 0 ? p.color("white") : p.color("black");
      }
    }

    for (let i = mid_x0; i < mid_x1; i++) {
      for (let j = mid_y0; j < mid_y1; j++) {
        shadows[i][j] = (i + j) % 2 === 0 ? p.color("black") : p.color("white");
      }
    }

    for (let i = inn_x0; i < inn_x1; i++) {
      for (let j = inn_y0; j < inn_y1; j++) {
        shadows[i][j] = (i + j) % 2 === 0 ? p.color("white") : p.color("black");
      }
    }
  }

  function draw_shadows() {
    // Circles at tile CORNERS (grid intersections) — creates the optical illusion
    for (let i = 0; i < TILES; i++) {
      for (let j = 0; j < TILES; j++) {
        p.fill(shadows[i][j]);
        p.circle(i * tile_size, j * tile_size, tile_size);
      }
    }
  }

  function draw_checkerboard() {
    for (let i = 0; i < TILES; i++) {
      for (let j = 0; j < TILES; j++) {
        p.fill(checkerboard[i][j]);
        p.square(i * tile_size, j * tile_size, tile_size, tile_size / 6);
      }
    }
  }

  function updateTransform() {
    // Smooth interpolation toward target
    currentRotX += (targetRotX - currentRotX) * 0.08;
    currentRotY += (targetRotY - currentRotY) * 0.08;

    // Dynamic box shadow shifts with tilt for realism
    const shadowX = -currentRotY * 0.8;
    const shadowY = currentRotX * 0.8 + 10;

    cnv.elt.style.transform =
      "translate(-50%, -50%) perspective(900px) rotateX(" +
      currentRotX.toFixed(2) + "deg) rotateY(" +
      currentRotY.toFixed(2) + "deg)";
    cnv.elt.style.boxShadow =
      shadowX.toFixed(1) + "px " + shadowY.toFixed(1) + "px 60px rgba(0, 0, 0, 0.4)";
  }

  // Mouse move handler — maps cursor position to tilt angles
  function onMouseMove(e) {
    const rect = parentEl.getBoundingClientRect();
    // Normalise cursor position to -1 … +1
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    // Map to tilt: moving mouse right → rotateY positive, mouse down → rotateX negative
    targetRotY = nx * MAX_TILT;
    targetRotX = -ny * MAX_TILT;
  }

  // When mouse leaves the container, ease back to a neutral-ish tilt
  function onMouseLeave() {
    targetRotX = 10;
    targetRotY = -10;
  }

  p.setup = function () {
    parentEl = p.select('#sketch-container').elt;
    const w = parentEl.clientWidth;
    const h = parentEl.clientHeight;

    // Square canvas sized to 60% of shorter dimension
    boardSize = Math.min(w, h) * 0.6;
    tile_size = boardSize / TILES;

    cnv = p.createCanvas(boardSize, boardSize);

    // Center the canvas in the panel
    cnv.elt.style.position = "absolute";
    cnv.elt.style.left = "50%";
    cnv.elt.style.top = "50%";
    cnv.elt.style.borderRadius = "4px";
    cnv.elt.style.willChange = "transform"; // hint for GPU acceleration
    cnv.elt.style.transition = "none";       // no CSS transition — we animate in draw()

    computeRings();
    fill_checkerboard();
    fill_shadows();

    // Draw the static checkerboard once
    p.background(255);
    p.noStroke();
    draw_shadows();
    draw_checkerboard();

    // Attach mouse listeners to the parent container
    parentEl.addEventListener("mousemove", onMouseMove);
    parentEl.addEventListener("mouseleave", onMouseLeave);

    // Set initial transform
    updateTransform();

    // Use a low frame rate — we only need to update the CSS tilt, not redraw the canvas
    p.frameRate(30);
  };

  p.draw = function () {
    // Don't redraw the checkerboard — just update the CSS 3D tilt
    updateTransform();
  };

  // Clean up event listeners when sketch is removed
  p.remove = (function(originalRemove) {
    return function() {
      if (parentEl) {
        parentEl.removeEventListener("mousemove", onMouseMove);
        parentEl.removeEventListener("mouseleave", onMouseLeave);
      }
      originalRemove.call(p);
    };
  })(p.remove);
}
