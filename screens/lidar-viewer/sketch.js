// lidar-viewer – p5 instance-mode sketch (ES module)
// Orbit around a LiDAR point cloud; tap/click toggles sine-wave deformation.

export default function(p) {
  let rawLines = [];
  let points = [];
  let motionEnabled = false;
  let basePointSize = 5;

  p.preload = function() {
    rawLines = p.loadStrings("./screens/lidar-viewer/Elektrotrash_ascii_sampled.asc");
  };

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    p.pixelDensity(1);
    parseAndNormalizePoints(rawLines);
  };

  function parseAndNormalizePoints(lines) {
    const widthRef = Math.max(320, p.windowWidth);
    const isSmallScreen = widthRef < 900;
    const stride = isSmallScreen ? 2 : 1;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    const parsed = [];

    for (let i = 0; i < lines.length; i += stride) {
      const vals = lines[i].trim().split(/\s+/);
      if (vals.length < 6) continue;

      const x = Number(vals[0]);
      const y = Number(vals[1]);
      const z = Number(vals[2]);
      const r = Number(vals[3]);
      const g = Number(vals[4]);
      const b = Number(vals[5]);

      if (
        !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) ||
        !Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)
      ) continue;

      parsed.push({ x, y, z, r, g, b });

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6);
    const targetSpan = Math.min(p.width, p.height) * 0.9;
    const scale = targetSpan / span;

    points = parsed.map(pt => ({
      x: (pt.x - cx) * scale,
      y: (pt.y - cy) * scale,
      z: (pt.z - cz) * scale,
      r: pt.r,
      g: pt.g,
      b: pt.b
    }));
  }

  p.draw = function() {
    p.clear();
    p.orbitControl(1.2, 1.2, 0.8);

    // Make "up" feel more natural for scan data orientation.
    p.rotateX(p.PI);
    // Flip object horizontally.
    p.scale(-1, 1, 1);

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const offset = motionEnabled
        ? p.sin(p.frameCount * 0.05 + pt.x * 0.1) * 10
        : 0;
      p.stroke(pt.r, pt.g, pt.b, 230);
      p.strokeWeight(basePointSize);
      p.point(pt.x, pt.y + offset, pt.z);
    }

    drawHint();
  };

  function drawHint() {
    p.push();
    p.resetMatrix();
    p.translate(-p.width / 2, -p.height / 2);
    p.noStroke();
    p.fill(255, 255, 255, 150);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.textSize(12);
    p.text(
      motionEnabled ? "tap / click: wave on" : "tap / click: wave off",
      p.width / 2,
      p.height - 10
    );
    p.pop();
  }

  p.mousePressed = function(event) {
    if (event && event.target !== p.canvas) return;
    motionEnabled = !motionEnabled;
  };

  p.touchStarted = function(event) {
    if (event && event.target !== p.canvas) return;
    motionEnabled = !motionEnabled;
    return false;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    parseAndNormalizePoints(rawLines);
  };
}
