// grid.js — core engine: config-driven grid, lazy loading, routing, transitions
// Requires grid-config.js to be loaded first (provides GRID_CONFIG)

const TRANSITION_MS = 450;

// ---- Build lookup maps from config ----
const screensByPos = {};   // "col,row" -> config entry
const screensBySlug = {};  // slug     -> config entry

for (const s of GRID_CONFIG.screens) {
  const key = s.col + "," + s.row;
  screensByPos[key] = s;
  screensBySlug[s.slug] = s;
}

// ---- State ----
let currentCol = 0;
let currentRow = 0;
let currentP5 = null;
let currentPanel = null;
let isTransitioning = false;

// ---- DOM refs ----
const container  = document.getElementById("sketch-container");
const btnLeft    = document.getElementById("btn-left");
const btnRight   = document.getElementById("btn-right");
const btnUp      = document.getElementById("btn-up");
const btnDown    = document.getElementById("btn-down");
const navTitle   = document.getElementById("nav-title");
const miniGridEl = document.getElementById("mini-grid");

// ---- Helpers ----
function canMove(col, row) {
  return col >= 0 && col < GRID_CONFIG.cols && row >= 0 && row < GRID_CONFIG.rows;
}

function updateBackground() {
  container.style.setProperty("--grid-cols", GRID_CONFIG.cols);
  container.style.setProperty("--grid-rows", GRID_CONFIG.rows);
  container.style.setProperty("--grid-col", currentCol);
  container.style.setProperty("--grid-row", currentRow);
}

function updateButtons() {
  btnLeft.disabled  = !canMove(currentCol - 1, currentRow);
  btnRight.disabled = !canMove(currentCol + 1, currentRow);
  btnUp.disabled    = !canMove(currentCol, currentRow - 1);
  btnDown.disabled  = !canMove(currentCol, currentRow + 1);
}

function updateTitle() {
  const key = currentCol + "," + currentRow;
  const entry = screensByPos[key];
  navTitle.textContent = entry ? entry.title : "\u00B7";
}

// ---- Mini grid map ----
const miniGridCells = {};  // "col,row" -> DOM element

function buildMiniGrid() {
  miniGridEl.style.gridTemplateColumns = "repeat(" + GRID_CONFIG.cols + ", 8px)";
  miniGridEl.style.gridTemplateRows    = "repeat(" + GRID_CONFIG.rows + ", 8px)";

  for (let r = 0; r < GRID_CONFIG.rows; r++) {
    for (let c = 0; c < GRID_CONFIG.cols; c++) {
      const cell = document.createElement("div");
      cell.className = "mg-cell";
      const key = c + "," + r;
      if (screensByPos[key]) cell.classList.add("has-screen");
      miniGridCells[key] = cell;
      miniGridEl.appendChild(cell);
    }
  }
}

function updateMiniGrid() {
  for (const key in miniGridCells) {
    miniGridCells[key].classList.remove("current");
  }
  const key = currentCol + "," + currentRow;
  if (miniGridCells[key]) {
    miniGridCells[key].classList.add("current");
  }
}

function createPanel() {
  const panel = document.createElement("div");
  panel.className = "sketch-panel";
  return panel;
}

// ---- URL routing ----
function currentSlug() {
  const key = currentCol + "," + currentRow;
  const entry = screensByPos[key];
  return entry ? entry.slug : null;
}

function pushURL() {
  const slug = currentSlug();
  const path = slug ? "/" + slug : "/";
  if (window.location.pathname !== path) {
    history.pushState({ col: currentCol, row: currentRow }, "", path);
  }
}

function resolveInitialRoute() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, ""); // trim slashes
  if (path && screensBySlug[path]) {
    const s = screensBySlug[path];
    currentCol = s.col;
    currentRow = s.row;
  }
  // Replace current history entry with state
  history.replaceState({ col: currentCol, row: currentRow }, "", window.location.pathname);
}

window.addEventListener("popstate", (e) => {
  if (e.state && typeof e.state.col === "number") {
    navigateTo(e.state.col, e.state.row, true);
  }
});

// ---- Lazy screen launcher ----
async function launchInto(panel) {
  const key = currentCol + "," + currentRow;
  const entry = screensByPos[key];

  if (!entry) {
    // Empty cell placeholder
    const div = document.createElement("div");
    div.style.cssText =
      "width:100%;height:100%;display:flex;align-items:center;justify-content:center;" +
      "color:#444;font-size:1.2rem;font-family:monospace;";
    div.textContent = "(" + currentCol + ", " + currentRow + ")";
    panel.appendChild(div);
    return;
  }

  if (entry.type === "p5") {
    try {
      const mod = await import("./screens/" + entry.slug + "/sketch.js?v=" + Date.now());
      // Only launch if this panel is still the current one (user may have navigated away)
      if (panel === currentPanel) {
        currentP5 = new p5(mod.default, panel);
      }
    } catch (err) {
      console.error("Failed to load sketch for " + entry.slug, err);
      panel.innerHTML = '<div style="color:#c44;padding:2rem;">Failed to load sketch: ' + entry.slug + '</div>';
    }
  } else if (entry.type === "html") {
    try {
      const res = await fetch("./screens/" + entry.slug + "/content.html");
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      const html = await res.text();
      if (panel === currentPanel) {
        const wrapper = document.createElement("div");
        wrapper.className = "content-panel";
        wrapper.innerHTML = html;
        panel.appendChild(wrapper);
      }
    } catch (err) {
      console.error("Failed to load content for " + entry.slug, err);
      panel.innerHTML = '<div style="color:#c44;padding:2rem;">Failed to load content: ' + entry.slug + '</div>';
    }
  }
}

// ---- Navigation with slide transition ----
// skipPush = true when triggered by popstate (don't push to history again)
function navigateTo(col, row, skipPush) {
  if (!canMove(col, row) || isTransitioning) return;
  if (col === currentCol && row === currentRow) return;

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

  // Update state & launch screen in the new panel
  currentCol = col;
  currentRow = row;
  currentPanel = newPanel;
  updateButtons();
  updateTitle();
  updateMiniGrid();
  updateBackground();
  if (!skipPush) pushURL();
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
  setTimeout(cleanup, TRANSITION_MS + 50);
}

// ---- Button listeners ----
btnLeft.addEventListener("click",  () => navigateTo(currentCol - 1, currentRow));
btnRight.addEventListener("click", () => navigateTo(currentCol + 1, currentRow));
btnUp.addEventListener("click",    () => navigateTo(currentCol, currentRow - 1));
btnDown.addEventListener("click",  () => navigateTo(currentCol, currentRow + 1));

// ---- Keyboard support ----
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
resolveInitialRoute();
buildMiniGrid();
currentPanel = createPanel();
container.appendChild(currentPanel);
updateButtons();
updateTitle();
updateMiniGrid();
updateBackground();
pushURL();
launchInto(currentPanel);
