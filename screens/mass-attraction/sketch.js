// mass_attraction – p5 instance-mode sketch (ES module)
// Particles flowing through a gravitational field of fixed attractors.
// Click to place attractors, particles reveal the field landscape.

export default function (p) {

  // ---- Physics constants ----
  const G = 80;
  const ORBITAL_SPEED_MULTIPLIER = 1.2;
  const DRAG = 1.0;    // no drag — pure Newtonian, stable orbits
  const TAIL_LEN = 80;
  const MAX_ATTRACTORS = 3;
  const MIN_MASS = 6;
  const MAX_MASS = 22;
  const FORCE_LINE_RANGE = 250;  // max distance for visible force lines

  // ---- Particle (unit-mass mover) ----
  class Particle {
    constructor(x, y, vel) {
      this.pos = p.createVector(x, y);
      this.vel = vel || p.createVector(0, 0);
      this.acc = p.createVector(0, 0);
      this.tail = [];
    }

    update() {
      this.vel.add(this.acc);
      this.vel.mult(DRAG);
      this.pos.add(this.vel);
      this.acc.set(0, 0);

      this.tail.push(this.pos.copy());
      if (this.tail.length > TAIL_LEN) this.tail.shift();
    }

    // True if the particle has escaped far beyond the visible canvas
    escaped() {
      const margin = Math.max(p.width, p.height) * 1.5;
      return (
        this.pos.x < -margin || this.pos.x > p.width + margin ||
        this.pos.y < -margin || this.pos.y > p.height + margin
      );
    }

    show() {
      // Fading trail (warm amber)
      if (this.tail.length > 1) {
        p.noFill();
        for (let i = 1; i < this.tail.length; i++) {
          const a = p.map(i, 0, this.tail.length, 0, 140);
          p.stroke(255, 170, 60, a);
          p.strokeWeight(3);
          p.line(this.tail[i - 1].x, this.tail[i - 1].y, this.tail[i].x, this.tail[i].y);
        }
      }

      // Head dot
      p.noStroke();
      p.fill(255, 190, 80);
      p.ellipse(this.pos.x, this.pos.y, 12);
    }
  }

  // ---- Attractor (fixed mass) ----
  class Attractor {
    constructor(x, y, mass) {
      this.pos = p.createVector(x, y);
      this.mass = mass;
      this.radius = mass * 2.5;
    }

    // Apply gravitational pull on a single particle
    attract(particle) {
      const force = p5.Vector.sub(this.pos, particle.pos);
      let dist = force.mag();

      // Softening — prevent infinite forces
      if (dist < this.radius) dist = this.radius;

      // F = G * M / r²  (particle is unit mass)
      const strength = (G * this.mass) / (dist * dist);
      force.setMag(strength);
      particle.acc.add(force);
    }

    // Draw force line to a particle (opacity by force strength)
    drawForceLine(particle) {
      const dist = p5.Vector.dist(this.pos, particle.pos);
      if (dist > FORCE_LINE_RANGE || dist < this.radius) return;

      const strength = (G * this.mass) / (dist * dist);
      // Map strength to opacity (stronger = more visible)
      const alpha = p.constrain(p.map(strength, 0, 0.05, 0, 40), 0, 40);
      if (alpha < 2) return;

      p.stroke(150, 200, 255, alpha * 2);
      p.strokeWeight(1);
      p.line(this.pos.x, this.pos.y, particle.pos.x, particle.pos.y);
    }

    show() {
      p.noStroke();
      // Glow layers
      for (let i = 4; i >= 1; i--) {
        const a = p.map(i, 4, 1, 8, 50);
        p.fill(130, 190, 255, a);
        p.ellipse(this.pos.x, this.pos.y, this.radius * 2 + i * 16);
      }
      // Core
      p.fill(160, 210, 255);
      p.ellipse(this.pos.x, this.pos.y, this.radius * 2);
    }
  }

  // ---- Spawn point (fixed, computed once in setup) ----
  let spawnX, spawnY, spawnVel;

  function initSpawnPoint() {
    // Spawn point: to the right of centre, between the attractors
    spawnX = p.width * 0.80;
    spawnY = p.height * 0.50;
    const pos = p.createVector(spawnX, spawnY);

    // Tangential velocity relative to the most massive attractor
    spawnVel = p.createVector(0, -1); // fallback
    if (attractors.length > 0) {
      let biggest = attractors[0];
      for (const att of attractors) {
        if (att.mass > biggest.mass) biggest = att;
      }
      const radial = p5.Vector.sub(pos, biggest.pos);
      const r = radial.mag();
      const orbitalSpeed = Math.sqrt(G * biggest.mass / Math.max(r, 30));
      const tangent = p.createVector(-radial.y, radial.x).normalize();
      spawnVel = tangent.mult(orbitalSpeed * ORBITAL_SPEED_MULTIPLIER);
    }
  }

  // All particles spawn at the same point with a tiny random perturbation
  function spawnOrbiting() {
    const vel = spawnVel.copy();
    // Small random nudge so particles diverge over time (chaos!)
    vel.add(p5.Vector.random2D().mult(p.random(0.01, 0.03)));
    return new Particle(spawnX, spawnY, vel);
  }

  // ---- Sketch state ----
  let particles = [];
  let attractors = [];
  let nextMass = 12;
  let particleSlider;

  // ---- Setup ----
  p.setup = function () {
    const w = p.select("#sketch-container").elt.clientWidth;
    const h = p.select("#sketch-container").elt.clientHeight;
    p.createCanvas(w, h);

    // Particle count slider (bottom-right)
    particleSlider = p.createSlider(1, 30, 5, 1);
    particleSlider.position(w - 165, h - 30);
    particleSlider.style("width", "110px");

    // Start with 3 attractors vertically aligned with slight offset, different sizes
    attractors.push(new Attractor(w * 0.45, h * 0.20, 8));
    attractors.push(new Attractor(w * 0.50, h * 0.50, 16));
    attractors.push(new Attractor(w * 0.55, h * 0.80, 11));

    initSpawnPoint();
  };

  // ---- Draw ----
  p.draw = function () {
    p.clear();

    const targetCount = particleSlider.value();

    // Spawn / remove particles to match slider
    while (particles.length < targetCount) {
      particles.push(spawnOrbiting());
    }
    while (particles.length > targetCount) {
      particles.shift();
    }

    // Force lines (draw first, behind everything)
    for (const att of attractors) {
      for (const part of particles) {
        att.drawForceLine(part);
      }
    }

    // Physics: attractors pull particles
    for (const att of attractors) {
      for (const part of particles) {
        att.attract(part);
      }
    }

    // Update & draw particles; respawn any that escaped
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      if (particles[i].escaped()) {
        particles[i] = spawnOrbiting();
      }
      particles[i].show();
    }

    // Draw attractors on top
    for (const att of attractors) {
      att.show();
    }

    // Preview next attractor at cursor
    showPreview();

    // +/- buttons
    showButtons();

    // Slider labels
    p.noStroke();
    p.fill(255, 255, 255, 90);
    p.textSize(10);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text("particles", p.width - 170, p.height - 22);
  };

  // ---- Click to place attractor ----
  p.mousePressed = function () {
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

    // Ignore clicks outside canvas
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

    // Place attractor (FIFO if over limit)
    attractors.push(new Attractor(p.mouseX, p.mouseY, nextMass));
    if (attractors.length > MAX_ATTRACTORS) {
      attractors.shift();
    }
  };

  // ---- Preview circle at cursor ----
  function showPreview() {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    const r = nextMass * 2.5;
    p.noStroke();
    p.fill(150, 200, 255, 50);
    p.ellipse(p.mouseX, p.mouseY, r * 2);
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
