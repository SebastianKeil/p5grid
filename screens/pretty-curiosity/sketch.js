// Pretty_curiosity – p5 instance-mode sketch (ES module)
// 32x32 checkerboard on a smaller square canvas, tilted via CSS 3D transforms
// Floats like a painting over the gradient background

export default function(p) {

  // ---- Constants ----
  const TILES = 24;

  // ---- Sketch state ----
  let tile_size;
  let boardSize;
  let checkerboard = [];
  let shadows = [];

  let color1, color2, color3, color4, color5, color6;

  // Ring boundaries (centered on the 32x32 grid)
  let mid_x0, mid_x1, mid_y0, mid_y1;
  let inn_x0, inn_x1, inn_y0, inn_y1;

  function computeRings() {
    let c = TILES / 2;

    // Middle ring: scaled from 15/21 → ~23 tiles wide
    let midHalf = 11.5;
    mid_x0 = Math.max(0, Math.floor(c - midHalf));
    mid_x1 = Math.min(TILES, Math.ceil(c + midHalf));
    mid_y0 = Math.max(0, Math.floor(c - midHalf));
    mid_y1 = Math.min(TILES, Math.ceil(c + midHalf));

    // Inner ring: scaled from 7/21 → ~11 tiles wide
    let innHalf = 5.5;
    inn_x0 = Math.max(0, Math.floor(c - innHalf));
    inn_x1 = Math.min(TILES, Math.ceil(c + innHalf));
    inn_y0 = Math.max(0, Math.floor(c - innHalf));
    inn_y1 = Math.min(TILES, Math.ceil(c + innHalf));
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
    for (let i = 0; i < TILES; i++) {
      for (let j = 0; j < TILES; j++) {
        p.fill(shadows[i][j]);
        p.circle(i * tile_size + tile_size / 2, j * tile_size + tile_size / 2, tile_size);
      }
    }
  }

  function draw_checkerboard() {
    for (let i = 0; i < TILES; i++) {
      for (let j = 0; j < TILES; j++) {
        p.fill(checkerboard[i][j]);
        p.square(i * tile_size, j * tile_size, tile_size, tile_size / 8);
      }
    }
  }

  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;

    // Square canvas sized to 60% of shorter dimension
    boardSize = Math.min(w, h) * 0.6;
    tile_size = boardSize / TILES;

    const cnv = p.createCanvas(boardSize, boardSize);

    // Center the canvas in the panel
    cnv.elt.style.position = "absolute";
    cnv.elt.style.left = "50%";
    cnv.elt.style.top = "50%";

    // CSS 3D tilt — the canvas becomes a floating painting
    cnv.elt.style.perspective = "900px";
    cnv.elt.style.transform =
      "translate(-50%, -50%) perspective(900px) rotateX(15deg) rotateY(-20deg)";
    cnv.elt.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.4)";
    cnv.elt.style.borderRadius = "4px";

    computeRings();
    fill_checkerboard();
    fill_shadows();

    // Static image — draw once, no animation loop needed
    p.noLoop();
  };

  p.draw = function () {
    p.clear();
    p.noStroke();

    draw_shadows();
    draw_checkerboard();
  };
}
