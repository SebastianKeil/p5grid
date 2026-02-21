// ---- Grid Configuration ----
const GRID_COLS = 3;
const GRID_ROWS = 3;
const TRANSITION_MS = 450;

// Map of "col,row" -> { name, sketchFn }
// sketchFn is a function(p) for p5 instance mode
const GRID_SKETCHES = {
  "0,0": { name: "mass_attraction",   sketchFn: massAttractionSketch },
  "1,0": { name: "moving_masses",     sketchFn: movingMassesSketch },
  "0,1": { name: "signal_rect",       sketchFn: signalRectSketch },
  "2,2": { name: "Pretty_curiosity",  sketchFn: prettyCuriositySketch },
};

// ---- State ----
let currentCol = 0;
let currentRow = 0;
let currentP5 = null;
let currentPanel = null;
let isTransitioning = false;

// ---- DOM refs ----
const container = document.getElementById("sketch-container");
const btnLeft   = document.getElementById("btn-left");
const btnRight  = document.getElementById("btn-right");
const btnUp     = document.getElementById("btn-up");
const btnDown   = document.getElementById("btn-down");
const posLabel  = document.getElementById("position-label");

// ---- Helpers ----
function canMove(col, row) {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
}

function updateButtons() {
  btnLeft.disabled  = !canMove(currentCol - 1, currentRow);
  btnRight.disabled = !canMove(currentCol + 1, currentRow);
  btnUp.disabled    = !canMove(currentCol, currentRow - 1);
  btnDown.disabled  = !canMove(currentCol, currentRow + 1);
}

function updateLabel() {
  const key = currentCol + "," + currentRow;
  const entry = GRID_SKETCHES[key];
  const name = entry ? entry.name : "empty";
  posLabel.textContent = currentCol + ", " + currentRow + " \u2014 " + name;
}

function createPanel() {
  const panel = document.createElement("div");
  panel.className = "sketch-panel";
  return panel;
}

function launchInto(panel) {
  const key = currentCol + "," + currentRow;
  const entry = GRID_SKETCHES[key];

  if (entry && typeof entry.sketchFn === "function") {
    currentP5 = new p5(entry.sketchFn, panel);
  } else {
    // Empty cell placeholder
    const div = document.createElement("div");
    div.style.cssText =
      "width:100%;height:100%;display:flex;align-items:center;justify-content:center;" +
      "color:#444;font-size:1.2rem;font-family:monospace;";
    div.textContent = "(" + currentCol + ", " + currentRow + ")";
    panel.appendChild(div);
  }
}

// ---- Navigation with slide transition ----
function navigateTo(col, row) {
  if (!canMove(col, row) || isTransitioning) return;

  const dx = col - currentCol;
  const dy = row - currentRow;

  isTransitioning = true;

  // Keep references to old content
  const oldPanel = currentPanel;
  const oldP5 = currentP5;
  currentP5 = null;

  // Create incoming panel, position it off-screen (no transition yet)
  const newPanel = createPanel();
  newPanel.style.transition = "none";
  if (dx > 0)      newPanel.style.transform = "translateX(100%)";
  else if (dx < 0) newPanel.style.transform = "translateX(-100%)";
  else if (dy > 0) newPanel.style.transform = "translateY(100%)";
  else              newPanel.style.transform = "translateY(-100%)";
  container.appendChild(newPanel);

  // Update state & launch sketch in the new panel
  currentCol = col;
  currentRow = row;
  currentPanel = newPanel;
  updateButtons();
  updateLabel();
  launchInto(newPanel);

  // Force reflow so the browser registers the starting position
  newPanel.offsetHeight;

  // Apply transition to both panels
  const ease = "transform " + TRANSITION_MS + "ms ease";
  oldPanel.style.transition = ease;
  newPanel.style.transition = ease;

  // Slide old panel out in the opposite direction
  if (dx > 0)      oldPanel.style.transform = "translateX(-100%)";
  else if (dx < 0) oldPanel.style.transform = "translateX(100%)";
  else if (dy > 0) oldPanel.style.transform = "translateY(-100%)";
  else              oldPanel.style.transform = "translateY(100%)";

  // Slide new panel into view
  newPanel.style.transform = "translate(0, 0)";

  // Clean up after animation finishes
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (oldP5) oldP5.remove();
    if (oldPanel.parentNode) oldPanel.parentNode.removeChild(oldPanel);
    isTransitioning = false;
  }
  newPanel.addEventListener("transitionend", cleanup, { once: true });
  // Safety timeout in case transitionend doesn't fire
  setTimeout(cleanup, TRANSITION_MS + 50);
}

// ---- Button listeners ----
btnLeft.addEventListener("click",  () => navigateTo(currentCol - 1, currentRow));
btnRight.addEventListener("click", () => navigateTo(currentCol + 1, currentRow));
btnUp.addEventListener("click",    () => navigateTo(currentCol, currentRow - 1));
btnDown.addEventListener("click",  () => navigateTo(currentCol, currentRow + 1));

// ---- Keyboard support ----
// Skip navigation when a slider or input inside the sketch has focus
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

  switch (e.key) {
    case "ArrowLeft":  navigateTo(currentCol - 1, currentRow); e.preventDefault(); break;
    case "ArrowRight": navigateTo(currentCol + 1, currentRow); e.preventDefault(); break;
    case "ArrowUp":    navigateTo(currentCol, currentRow - 1); e.preventDefault(); break;
    case "ArrowDown":  navigateTo(currentCol, currentRow + 1); e.preventDefault(); break;
  }
});

// ---- Boot ----
currentPanel = createPanel();
container.appendChild(currentPanel);
updateButtons();
updateLabel();
launchInto(currentPanel);
