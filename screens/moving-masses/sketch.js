// moving_masses – N-body gravitational simulation (p5 instance-mode, ES module)
// Click to add planets that orbit the sun and attract each other.
// Small bodies near large planets can be captured as moons.

export default function (p) {

  // ---- Physics constants (tuned for screen-scale) ----
  const G = 0.4;
  const SUN_MASS = 800;
  const TAIL_LEN = 300;
  const MIN_MASS = 1;
  const MAX_MASS = 30;
  const DT = 1;           // time-step per frame (keep at 1 for simplicity)

  // ---- Unified Body class ----
  class Body {
    constructor(x, y, mass, col, fixed) {
      this.pos = p.createVector(x, y);
      this.vel = p.createVector(0, 0);
      this.acc = p.createVector(0, 0);
      this.mass = mass;
      this.col = col;
      this.fixed = fixed || false;  // sun is fixed
      this.tail = [];
      this.radius = this.fixed ? mass * 0.06 : Math.max(3, Math.pow(mass, 0.5) * 2.5);
    }

    // Add gravitational pull FROM this body ON another body
    attract(other) {
      if (other === this) return;
      const force = p5.Vector.sub(this.pos, other.pos);
      let dist = force.mag();

      // Softening — prevent insane forces at close range
      const minDist = this.radius + other.radius;
      if (dist < minDist) dist = minDist;

      // F = G * m1 * m2 / r²   (direction: toward this body)
      const strength = (G * this.mass * other.mass) / (dist * dist);
      force.setMag(strength);

      // a = F / m  →  apply to the other body
      other.acc.add(force.div(other.mass));
    }

    update() {
      if (this.fixed) return;

      this.vel.add(p5.Vector.mult(this.acc, DT));
      this.pos.add(p5.Vector.mult(this.vel, DT));

      // Record trail
      this.tail.push(this.pos.copy());
      if (this.tail.length > TAIL_LEN) this.tail.shift();

      // Reset acceleration for next frame
      this.acc.set(0, 0);
    }

    show() {
      p.noStroke();

      if (this.fixed) {
        // Sun glow
        for (let i = 4; i >= 1; i--) {
          const a = p.map(i, 4, 1, 15, 80);
          p.fill(255, 210, 60, a);
          p.ellipse(this.pos.x, this.pos.y, this.radius * 2 + i * 14);
        }
        // Sun core
        p.fill(this.col);
        p.ellipse(this.pos.x, this.pos.y, this.radius * 2);
      } else {
        p.fill(this.col);
        p.ellipse(this.pos.x, this.pos.y, this.radius * 2);
      }
    }

    showTail() {
      if (this.tail.length < 2) return;
      p.noFill();
      const tw = Math.max(1, this.radius * 0.4);

      for (let i = 1; i < this.tail.length; i++) {
        const alpha = p.map(i, 0, this.tail.length, 0, 120);
        p.stroke(p.red(this.col), p.green(this.col), p.blue(this.col), alpha);
        p.strokeWeight(tw);
        p.line(this.tail[i - 1].x, this.tail[i - 1].y, this.tail[i].x, this.tail[i].y);
      }
    }
  }

  // ---- Sketch state ----
  let bodies = [];   // includes sun at index 0
  let sun;
  let nextMass = 5;  // mass of the next planet to place
  let cx, cy;        // canvas center (sun position)

  // ---- Color from mass ----
  function massColor(m) {
    // Small → cool blue/teal,  large → warm orange/red
    const t = p.constrain(p.map(m, MIN_MASS, MAX_MASS, 0, 1), 0, 1);
    const r = p.lerp(80, 255, t);
    const g = p.lerp(180, 100, t);
    const b = p.lerp(255, 60, t);
    return p.color(r, g, b);
  }

  // ---- Setup ----
  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;
    p.createCanvas(w, h);

    cx = w / 2;
    cy = h / 2;

    // Create the sun (fixed)
    sun = new Body(cx, cy, SUN_MASS, p.color(255, 220, 60), true);
    bodies.push(sun);
  };

  // ---- Draw loop ----
  p.draw = function () {
    p.clear();

    // --- N-body gravity: every body attracts every other ---
    for (let i = 0; i < bodies.length; i++) {
      for (let j = 0; j < bodies.length; j++) {
        if (i !== j) {
          bodies[i].attract(bodies[j]);
        }
      }
    }

    // --- Update & draw ---
    // Draw trails first (behind bodies)
    for (const b of bodies) b.showTail();
    // Update positions then draw bodies on top
    for (const b of bodies) b.update();
    for (const b of bodies) b.show();

    // --- Preview of next planet at cursor ---
    showPreview();

    // --- +/- mass buttons ---
    showButtons();
  };

  // ---- Click to spawn planet ----
  p.mousePressed = function () {
    // Check if click is on +/- buttons (top-left area)
    const mouse = p.createVector(p.mouseX, p.mouseY);

    // + button (bottom-left)
    if (p5.Vector.dist(mouse, p.createVector(30, p.height - 30)) < 22) {
      nextMass = p.min(nextMass + 2, MAX_MASS);
      return;
    }
    // − button (bottom-left)
    if (p5.Vector.dist(mouse, p.createVector(80, p.height - 30)) < 22) {
      nextMass = p.max(nextMass - 2, MIN_MASS);
      return;
    }

    // Ignore clicks too close to the sun
    const distToSun = p5.Vector.dist(mouse, sun.pos);
    if (distToSun < sun.radius * 3) return;

    // Ignore clicks outside canvas
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

    // Create planet with tangential velocity for ~circular orbit
    const planet = new Body(p.mouseX, p.mouseY, nextMass, massColor(nextMass), false);

    // Direction from sun to click point
    const radial = p5.Vector.sub(planet.pos, sun.pos);
    const r = radial.mag();

    // Orbital speed for circular orbit: v = sqrt(G * M / r)
    const orbitalSpeed = Math.sqrt(G * SUN_MASS / r);

    // Tangential direction (perpendicular to radial, counter-clockwise)
    const tangent = p.createVector(-radial.y, radial.x).normalize();
    planet.vel = tangent.mult(orbitalSpeed);

    bodies.push(planet);
  };

  // ---- Preview circle at cursor ----
  function showPreview() {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    const previewR = Math.max(3, Math.pow(nextMass, 0.5) * 2.5);
    const col = massColor(nextMass);
    p.noStroke();
    p.fill(p.red(col), p.green(col), p.blue(col), 70);
    p.ellipse(p.mouseX, p.mouseY, previewR * 2);
  }

  // ---- +/- buttons (bottom-left) ----
  function showButtons() {
    const by = p.height - 30;

    // + button
    p.noFill();
    p.stroke(255, 255, 255, 140);
    p.strokeWeight(2);
    p.ellipse(30, by, 36);
    p.line(18, by, 42, by);
    p.line(30, by - 12, 30, by + 12);

    // − button
    p.ellipse(80, by, 36);
    p.line(68, by, 92, by);

    // Mass label
    p.noStroke();
    p.fill(255, 255, 255, 160);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(11);
    p.text("mass: " + nextMass.toFixed(0), 55, by - 26);
  }
}
