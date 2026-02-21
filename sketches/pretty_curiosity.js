// Pretty_curiosity – p5 instance-mode sketch
// Checkerboard pattern with dynamic canvas sizing
// Tiles are always square; grid adapts to portrait/landscape

function prettyCuriositySketch(p) {

  // ---- Sketch state ----
  let canvas_x, canvas_y;
  let x_tiles, y_tiles;
  let tile_size;                 // single size – every field is a square
  let checkerboard = [];
  let shadows = [];
  let slider, slider2;

  let color1, color2, color3, color4, color5, color6;

  // Ring boundaries (computed once in setup, centered on the grid)
  let mid_x0, mid_x1, mid_y0, mid_y1;   // middle ring
  let inn_x0, inn_x1, inn_y0, inn_y1;   // inner ring

  function computeRings() {
    // Centre of the grid in tile-coordinates
    let cx = x_tiles / 2;
    let cy = y_tiles / 2;

    // Middle ring: 15 tiles wide (same as 3..18 in the original 21-grid)
    mid_x0 = Math.floor(cx - 7.5);
    mid_x1 = Math.ceil(cx + 7.5);
    mid_y0 = Math.floor(cy - 7.5);
    mid_y1 = Math.ceil(cy + 7.5);

    // Clamp to grid bounds
    mid_x0 = Math.max(0, mid_x0);
    mid_x1 = Math.min(x_tiles, mid_x1);
    mid_y0 = Math.max(0, mid_y0);
    mid_y1 = Math.min(y_tiles, mid_y1);

    // Inner ring: 7 tiles wide (same as 7..14 in the original 21-grid)
    inn_x0 = Math.floor(cx - 3.5);
    inn_x1 = Math.ceil(cx + 3.5);
    inn_y0 = Math.floor(cy - 3.5);
    inn_y1 = Math.min(y_tiles, Math.ceil(cy + 3.5));

    inn_x0 = Math.max(0, inn_x0);
    inn_x1 = Math.min(x_tiles, inn_x1);
    inn_y0 = Math.max(0, inn_y0);
    inn_y1 = Math.min(y_tiles, inn_y1);
  }

  function fill_checkerboard() {
    color1 = p.color("#738ACF"); // violet
    color2 = p.color("#F2C3FA"); // bright pink
    color3 = p.color("#009DEB"); // blue
    color4 = p.color("#FAB5E6"); // bright pink
    color5 = p.color("#0C9788"); // green
    color6 = p.color("#FCD466"); // yellow

    // fill outer layer
    for (let i = 0; i < x_tiles; i++) {
      checkerboard[i] = [];
      for (let j = 0; j < y_tiles; j++) {
        checkerboard[i][j] = (i + j) % 2 === 0 ? color1 : color2;
      }
    }

    // fill middle layer (centered)
    for (let i = mid_x0; i < mid_x1; i++) {
      for (let j = mid_y0; j < mid_y1; j++) {
        checkerboard[i][j] = (i + j) % 2 === 0 ? color3 : color4;
      }
    }

    // fill inner layer (centered)
    for (let i = inn_x0; i < inn_x1; i++) {
      for (let j = inn_y0; j < inn_y1; j++) {
        checkerboard[i][j] = (i + j) % 2 === 0 ? color5 : color6;
      }
    }
  }

  function fill_shadows() {
    // fill outer layer
    for (let i = 0; i < x_tiles; i++) {
      shadows[i] = [];
      for (let j = 0; j < y_tiles; j++) {
        shadows[i][j] = (i + j) % 2 === 0 ? p.color("white") : p.color("black");
      }
    }

    // fill middle layer (centered)
    for (let i = mid_x0; i < mid_x1; i++) {
      for (let j = mid_y0; j < mid_y1; j++) {
        shadows[i][j] = (i + j) % 2 === 0 ? p.color("black") : p.color("white");
      }
    }

    // fill inner layer (centered)
    for (let i = inn_x0; i < inn_x1; i++) {
      for (let j = inn_y0; j < inn_y1; j++) {
        shadows[i][j] = (i + j) % 2 === 0 ? p.color("white") : p.color("black");
      }
    }
  }

  function draw_checkerboard() {
    for (let i = 0; i < x_tiles; i++) {
      for (let j = 0; j < y_tiles; j++) {
        p.fill(checkerboard[i][j]);
        p.noStroke();
        p.square(i * tile_size, j * tile_size, tile_size, tile_size / 8);
      }
    }
  }

  function draw_shadows() {
    for (let i = 0; i < x_tiles; i++) {
      for (let j = 0; j < y_tiles; j++) {
        p.fill(shadows[i][j]);
        p.circle(i * tile_size, j * tile_size, tile_size);
      }
    }
  }

  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;

    canvas_x = w;
    canvas_y = h;

    slider = p.createSlider(0, 255, 0);
    slider.position(30, 40);
    slider.size(80);
    slider.addClass("mySliders");

    slider2 = p.createSlider(0, 255, 0);
    slider2.position(120, 40);
    slider2.size(80);
    slider2.addClass("mySliders");

    p.createCanvas(canvas_x, canvas_y);

    // Tile size from the shorter dimension → ~21 tiles on the short side
    let min_dim = Math.min(canvas_x, canvas_y);
    tile_size = Math.floor(min_dim / 21);

    // Tile counts adapt to the actual canvas (more tiles on the longer axis)
    x_tiles = Math.ceil(canvas_x / tile_size) + 1;
    y_tiles = Math.ceil(canvas_y / tile_size) + 1;

    computeRings();
    fill_checkerboard();
    fill_shadows();
  };

  p.draw = function () {
    p.background(255);

    draw_shadows();
    draw_checkerboard();
  };
}
