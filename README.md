# p5grid

A lightweight personal website that displays p5.js sketches and HTML content pages in a navigable grid. No build step, no bundler, no CMS.

## Project structure

```
p5grid/
  index.html            Single-page shell (rarely needs editing)
  style.css             Global styles
  grid.js               Navigation engine, transitions, lazy loading, routing
  grid-config.js        THE file to edit when adding/removing/moving screens
  nginx.conf            Example server config for deployment
  screens/
    mass-attraction/
      sketch.js         p5 instance-mode sketch (ES module)
    moving-masses/
      sketch.js
    signal-rect/
      sketch.js
    pretty-curiosity/
      sketch.js
    about/              (example HTML screen)
      content.html      HTML fragment
      photo.jpg          Assets live next to their content
```

## Running locally

Any static file server works. The simplest option:

```bash
cd p5grid
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

> Deep-link URLs (e.g. `/mass-attraction`) require SPA fallback routing, which the Python dev server doesn't support. Use the root URL for local testing. In production, nginx handles this (see below).

## Adding a new screen

### 1. Create a folder

```bash
mkdir screens/my-new-thing
```

### 2. Add content

**For a p5.js sketch**, create `screens/my-new-thing/sketch.js`:

```javascript
export default function(p) {
  p.setup = function () {
    const w = p.select('#sketch-container').elt.clientWidth;
    const h = p.select('#sketch-container').elt.clientHeight;
    p.createCanvas(w, h);
  };

  p.draw = function () {
    p.background(30);
    p.fill(255);
    p.ellipse(p.width / 2, p.height / 2, 100);
  };
};
```

Key points:
- Must be an ES module with a `default export` function that takes `p` (the p5 instance).
- Use `p.` for all p5 calls (instance mode).
- Size the canvas from `#sketch-container` dimensions so it fills the viewport.
- p5 sliders/elements created with `p.createSlider()` etc. are automatically cleaned up when the user navigates away.

**For an HTML page** (text, images, video), create `screens/my-new-thing/content.html`:

```html
<h1>My New Thing</h1>
<p>Some text about this project.</p>
<img src="./screens/my-new-thing/photo.jpg" alt="Photo">
<video src="./screens/my-new-thing/demo.mp4" controls></video>
```

Key points:
- Write a plain HTML fragment (no `<html>`, `<head>`, or `<body>` tags).
- Reference local assets with paths relative to the site root: `./screens/slug/filename`.
- The content gets wrapped in a `.content-panel` div that provides readable typography, max-width, and scroll.

### 3. Register it in grid-config.js

Open `grid-config.js` and add one line to the `screens` array:

```javascript
{ col: 3, row: 0, slug: "my-new-thing", title: "My New Thing", type: "p5" }
```

| Field   | Description                                                        |
|---------|--------------------------------------------------------------------|
| `col`   | Horizontal position in the grid (0-based, left to right)          |
| `row`   | Vertical position in the grid (0-based, top to bottom)            |
| `slug`  | Folder name under `screens/` and the URL path (e.g. `/my-new-thing`) |
| `title` | Display name shown in the navbar                                   |
| `type`  | `"p5"` for sketches, `"html"` for content pages                   |

Adjust `cols` and `rows` at the top if the grid needs to grow.

That's it. No other files need editing.

## Removing a screen

1. Delete the line from `grid-config.js`.
2. Optionally delete the `screens/slug/` folder.

## Moving a screen

Change the `col` and `row` values in `grid-config.js`.

## Navigation

- **Arrow buttons** at the bottom of the screen.
- **Arrow keys** on keyboard.
- **Mini grid map** in the bottom-right corner shows your position. Filled dots are screens, the blue dot is "you are here".
- **URL routing**: each screen has a shareable URL like `my-website.de/mass-attraction`. Browser back/forward works.

## Deploying to a Linux server

1. Copy the entire `p5grid/` directory to your server (e.g. `/var/www/p5grid`).

2. Configure nginx using the included `nginx.conf` as a reference:

```nginx
server {
    listen 80;
    server_name my-website.de;
    root /var/www/p5grid;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The `try_files` fallback is essential — it makes deep-link URLs work by routing all paths to `index.html`, where the JS router resolves the slug.

3. Reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## How it works

- `grid-config.js` defines the grid layout and screen metadata.
- `grid.js` reads the config, builds lookup maps, and handles:
  - **Lazy loading**: sketches are loaded via `import()` and HTML pages via `fetch()` only when navigated to.
  - **Lifecycle**: p5 instances are created on enter and `remove()`d on leave (freeing memory).
  - **Transitions**: screens slide in/out horizontally or vertically.
  - **Routing**: URLs update via the History API; `popstate` handles back/forward.
- `index.html` loads p5.js from CDN, the config, and the engine. No per-screen script tags.
