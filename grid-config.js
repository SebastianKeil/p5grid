// Grid configuration — edit this file to add/remove/move screens.
// Each screen needs a folder under screens/ with either sketch.js (p5) or content.html (html).

const GRID_CONFIG = {
  cols: 3,
  rows: 3,
  screens: [
    { col: 0, row: 0, slug: "landing",          title: "Welcome",          type: "html" },
    { col: 1, row: 0, slug: "moving-masses",    title: "Moving Masses",    type: "p5" },
    { col: 2, row: 0, slug: "mass-attraction",  title: "Mass Attraction",  type: "p5" },
    { col: 0, row: 1, slug: "signal-rect",      title: "Signal Rect",      type: "p5" },
    { col: 2, row: 2, slug: "pretty-curiosity", title: "Pretty Curiosity", type: "p5" },
  ]
};
