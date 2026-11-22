# Matt's Personal Site

A static website showcasing hobbies, projects, and interests.
No frameworks, no build step — just HTML, CSS, and a little JavaScript.

## Structure

```
index.html      — all page content (edit your text here)
css/style.css   — theme and layout (colors are CSS variables at the top)
js/main.js      — mobile menu, project filtering, scroll animations
```

## Editing content

Search `index.html` for `EDIT ME` comments — they mark every spot with
placeholder text: your bio, quick facts, project cards, interests, and
social links.

**To add a project:** copy one of the `<article class="project-card">`
blocks and set `data-category` to match a filter button (e.g. `fabrication`)
so the filter buttons work. Add a new `filter-btn` for a new category.

**To change the color scheme:** edit the `--accent` variable at the top of
`css/style.css` (suggestions are in the comment next to it).

## Previewing locally

Just double-click `index.html` — everything works from local files,
except the 3D model viewer (browsers block loading model files from disk).
To preview that, run a local server from this folder and open
http://localhost:8000/flymaster-case.html:

```
python -m http.server
```

## 3D model viewer

`js/model-viewer.js` shows an interactive model on a project page (see
`flymaster-case.html`). Put the model in `models/` and set `data-model` on the
`.model-viewer` div. STL and STEP (`.step`/`.stp`) both work. For STEP files,
`data-transparent="Plexiglass"` renders matching parts as clear acrylic.
`data-rotate="0,180,0"` sets the starting rotation in degrees about X,Y,Z
(Y is up on screen, Z points at the viewer). `data-camera="0.3,-0.3,1"` sets
the direction the camera looks from.

three.js is bundled in `js/vendor/three/` (MIT license). The STEP reader
(occt-import-js) loads from the jsDelivr CDN, only when a STEP model is opened.

## Publishing for free

Any of these work; no build step needed:

- **GitHub Pages** — push this folder to a GitHub repo, then enable Pages
  in repo Settings → Pages (deploy from branch, root folder).
- **Netlify / Cloudflare Pages** — drag-and-drop this folder onto their
  dashboard, or connect the GitHub repo.
