// moving_masses – p5 instance-mode sketch
// Merges: sketch.js, mover.js, sun.js

function movingMassesSketch(p) {

  // ---- Helper classes ----

  class Mover {
    constructor(x, y, m, c, g) {
      this.pos = p.createVector(x, y);
      this.vel = p.createVector(10, 10);
      this.acc = p.createVector(10, 10);
      this.m = m;
      this.color = c;
      this.tail = [];
      this.g = g;
    }

    applyForceTo(movers) {
      for (let mover of movers) {
        let force = p5.Vector.sub(this.pos, mover.pos);
        let dist = p5.Vector.dist(mover.pos, this.pos);
        if (dist < 100 && this.m > mover.m) {
          force.normalize().mult(this.m * 180 * g_s.value());
          mover.applyForce(force.div(dist * distMult.value()));
        }
      }
    }

    applyForce(force) {
      this.acc.add(force.mult(1.3));
      this.acc.limit(30 + this.m);
    }

    move() {
      this.vel.add(this.acc);
      this.vel.limit(p.map(this.m, 3, 20, 4, 13));
      this.pos.add(this.vel);

      var pos = p.createVector(this.pos.x, this.pos.y);
      this.tail.push(pos);
      if (this.tail.length > 200) {
        this.tail.shift();
      }
    }

    show() {
      p.noStroke();
      p.fill(this.color);
      p.ellipse(this.pos.x, this.pos.y, this.m * 4);
    }

    showTail() {
      p.stroke(150, 90);
      p.strokeWeight(this.m);
      for (let i = 0; i < this.tail.length - 4; i = i + 3) {
        p.line(this.tail[i].x, this.tail[i].y, this.tail[i + 1].x, this.tail[i + 1].y);
      }
    }
  }

  class Sun {
    constructor(x, y, m, c, g) {
      this.pos = p.createVector(x, y);
      this.vel = p.createVector(10, 10);
      this.acc = p.createVector(10, 10);
      this.m = m;
      this.color = c;
      this.tail = [];
      this.g = g;
    }

    applyForceTo(movers) {
      for (let mover of movers) {
        let force = p5.Vector.sub(this.pos, mover.pos);
        let dist = p5.Vector.dist(mover.pos, this.pos);
        if (dist > 0) {
          force.normalize().mult(this.m * 180 * this.g);
          mover.applyForce(force.div(dist * distMult.value()));
        }
      }
    }

    applyForce(force) {
      this.acc.add(force.mult(1.3));
      this.acc.limit(30);
    }

    move() {
      this.vel.add(this.acc);
      this.vel.limit(p.map(this.m, 3, 20, 4, 9));
      this.pos.add(this.vel);

      var pos = p.createVector(this.pos.x, this.pos.y);
      this.tail.push(pos);
      if (this.tail.length > 200) {
        this.tail.shift();
      }
    }

    show() {
      p.noStroke();
      p.fill(this.color);
      p.ellipse(this.pos.x, this.pos.y, this.m * 4);
    }

    showTail() {
      p.stroke(150, 90);
      p.strokeWeight(this.m);
      for (let i = 0; i < this.tail.length - 4; i = i + 3) {
        p.line(this.tail[i].x, this.tail[i].y, this.tail[i + 1].x, this.tail[i + 1].y);
      }
    }
  }

  // ---- Sketch state ----
  let movers = [];
  let sun;
  let m;
  let distMult; // slider
  let g_s;      // slider

  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;

    distMult = p.createSlider(50, 150, 120, 1);
    distMult.position(75, h - 50);
    g_s = p.createSlider(1, 5, 1);
    g_s.position(75, 75);

    p.createCanvas(w, h);
    let sunColor = p.color(230, 205, 50);
    sun = new Sun(w / 2, h / 2, 50, sunColor, 1);
    m = p.random(3, 7);
  };

  p.draw = function () {
    p.background(220);
    sun.applyForceTo(movers);
    sun.show();

    for (let mover of movers) {
      mover.applyForceTo(movers);
      mover.move();
      mover.show();
      mover.showTail();
    }

    showNext();
    showButtons();
  };

  p.mousePressed = function () {
    let mouse = p.createVector(p.mouseX, p.mouseY);
    let d1 = p5.Vector.dist(mouse, p.createVector(100, 150));
    let d2 = p5.Vector.dist(mouse, p.createVector(200, 150));
    if (d1 < 50) {
      m = m + 2;
    } else if (d2 < 30) {
      m = m - 2;
    } else if (p.mouseY < p.height - 50 && p.mouseY > 100) {
      let c = p.color(m * 10 * 2 + 100, 100, 150);
      movers.push(new Mover(p.mouseX, p.mouseY, m, c, g_s.value()));
    }
  };

  function showNext() {
    p.noStroke();
    p.fill(255, 100, 100, 80);
    p.ellipse(p.mouseX, p.mouseY, m * 4);
  }

  function showButtons() {
    p.noFill();
    p.stroke(250, 0, 0);
    p.strokeWeight(3);
    p.ellipse(100, 150, 50);
    p.line(80, 150, 120, 150);
    p.line(100, 130, 100, 170);

    p.ellipse(200, 150, 50);
    p.line(185, 150, 215, 150);
  }
}
