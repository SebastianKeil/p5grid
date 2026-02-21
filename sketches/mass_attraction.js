// mass_attraction – p5 instance-mode sketch
// Merges: sketch.js, mover.js, mass.js

function massAttractionSketch(p) {

  // ---- Helper classes (use p for all p5 calls) ----

  class Mover {
    constructor(x, y) {
      this.pos = p.createVector(x, y);
      this.vel = p.createVector(0, 0);
      this.acc = p.createVector(0, 0);
      this.tail = [];
    }

    applyForce(force) {
      this.acc.add(force.mult(1.1));
      this.acc.limit(100);
    }

    move() {
      this.vel.add(this.acc);
      this.vel.limit(9);

      let pos = p.createVector(this.pos.x, this.pos.y);
      this.tail.push(pos);
      if (this.tail.length > 20) {
        this.tail.shift();
      }

      this.pos.add(this.vel.mult(p.random(0.95, 1.05)));
    }

    show() {
      p.noStroke();
      p.fill(255, 160, 50);
      p.ellipse(this.pos.x, this.pos.y, 30);

      for (let i = 0; i < this.tail.length; i++) {
        p.noStroke();
        p.fill(170, 180, 50, 5 * i);
        p.ellipse(this.tail[i].x, this.tail[i].y, 30);
      }
    }
  }

  class Mass {
    constructor(x, y, m) {
      this.pos = p.createVector(x, y);
      this.m = m;
    }

    show() {
      p.noStroke();
      p.fill(150, 200, 250);
      p.ellipse(this.pos.x, this.pos.y, this.m * 7);
    }

    showLast() {
      p.stroke(100);
      p.strokeWeight(3);
      p.fill(150, 200, 250);
      p.ellipse(this.pos.x, this.pos.y, this.m * 7);
    }

    applyForceTo(movers) {
      for (let mover of movers) {
        let force = p5.Vector.sub(this.pos, mover.pos);
        let dist = p5.Vector.dist(mover.pos, this.pos);

        force.normalize();
        force.mult(this.m * 100);
        mover.applyForce(force.div(dist * 10));
      }
    }

    drawRope(mover, mag) {
      let antiRed = this.magToRed(mag);
      p.stroke(255 - antiRed, 100, 100);
      p.strokeWeight(this.m * 2);
      p.line(mover.pos.x, mover.pos.y, this.pos.x, this.pos.y);
    }

    magToRed(mag) {
      return -p.map(mag, 10, 20, 100, 255);
    }
  }

  // ---- Sketch state ----
  let movers = [];
  let masses = [];
  let mass = 15;
  let n; // slider

  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;
    p.createCanvas(w, h);

    n = p.createSlider(1, 20, 2, 1);
    n.position(20, 50);

    masses.push(new Mass(w / 4, h / 2, 10));
    masses.push(new Mass(w / 2, h / 2, 12));
    masses.push(new Mass(w * 3 / 4, h / 2, 12));
  };

  p.draw = function () {
    p.background(120);

    if (movers.length < n.value()) {
      movers.push(new Mover(p.width / 2 + 100, p.height / 4));
    }
    if (movers.length > n.value()) {
      movers.splice(0, 1);
    }

    let j = 0;
    for (let m of masses) {
      if (j === 0) {
        m.showLast();
      } else {
        m.show();
      }
      m.applyForceTo(movers);
      j++;
    }

    for (let mover of movers) {
      mover.move();
      mover.show();
    }

    p.noStroke();
    p.fill(150, 200, 250, 80);
    p.ellipse(p.mouseX, p.mouseY, mass * 7);
  };

  p.mousePressed = function () {
    if (p.mouseY > 90 && p.mouseX < p.width - 10) {
      masses.push(new Mass(p.mouseX, p.mouseY, mass));
      if (mass < 25) {
        mass = p.random(10, 17);
      }
      if (masses.length > 3) {
        masses.splice(0, 1);
      }
    }
  };
}
