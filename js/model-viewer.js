// ============ Interactive 3D model viewer ============
// Markup: <div class="model-viewer" data-model="models/part.step"> containing a
// poster <img> and a .model-viewer-btn. Supports .stl and .step/.stp files.
// Nothing heavy (three.js, the STEP reader) downloads until the button is
// clicked, or the page is opened with #3d in the URL.
//
// Optional attributes:
//   data-color="#c8956a"         color for STL files / STEP parts with no color
//   data-transparent="Plexiglass" parts whose name contains this text render
//                                 as clear acrylic (comma-separate several)
//   data-rotate="0,180,0"        starting rotation in degrees about X,Y,Z
//                                 (Y is vertical on screen, Z points at you)
//   data-camera="0.3,-0.3,1"     direction the camera looks from (default
//                                 "0.5,0.4,1": front, slightly above-right)
//   data-autoload                load the model as soon as it scrolls into
//                                 view, instead of waiting for the button

const OCCT_URL = "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/";
const DEFAULT_COLOR = "#c8956a";

document.querySelectorAll(".model-viewer[data-model]").forEach((viewer) => {
  const btn = viewer.querySelector(".model-viewer-btn");
  btn.addEventListener("click", () => startViewer(viewer, btn), { once: true });
  if (location.hash === "#3d") {
    startViewer(viewer, btn);
  } else if ("autoload" in viewer.dataset) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        startViewer(viewer, btn);
      }
    }, { rootMargin: "200px" });
    io.observe(viewer);
  }
});

async function startViewer(viewer, btn) {
  if (viewer.classList.contains("loading") || viewer.classList.contains("active")) return;
  viewer.classList.add("loading");
  btn.disabled = true;
  btn.textContent = "Loading 3D model…";

  try {
    const THREE = await import("three");
    const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");

    const url = viewer.dataset.model;
    const ext = url.split(".").pop().toLowerCase();
    const model = ext === "stl"
      ? await loadStl(THREE, url, viewer.dataset)
      : await loadStep(THREE, url, viewer.dataset);

    if (viewer.dataset.rotate) {
      const [x = 0, y = 0, z = 0] = viewer.dataset.rotate.split(",").map(Number);
      model.rotation.set(
        THREE.MathUtils.degToRad(x),
        THREE.MathUtils.degToRad(y),
        THREE.MathUtils.degToRad(z));
      model.updateMatrixWorld(true);
    }

    showScene(THREE, OrbitControls, viewer, model);
    viewer.classList.add("active");
  } catch (err) {
    console.error("3D viewer:", err);
    btn.disabled = false;
    btn.textContent = "Couldn't load model — retry";
    btn.addEventListener("click", () => startViewer(viewer, btn), { once: true });
  } finally {
    viewer.classList.remove("loading");
  }
}

// ---------- Loaders ----------

async function loadStl(THREE, url, opts) {
  const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
  const geometry = await new STLLoader().loadAsync(url);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, solidMaterial(THREE, opts.color || DEFAULT_COLOR));
}

async function loadStep(THREE, url, opts) {
  const occt = await getOcct();

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const result = occt.ReadStepFile(new Uint8Array(await response.arrayBuffer()), null);
  if (!result.success) throw new Error(`${url}: STEP import failed`);

  const clearParts = (opts.transparent || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  const group = new THREE.Group();
  for (const part of result.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",
      new THREE.Float32BufferAttribute(part.attributes.position.array, 3));
    if (part.attributes.normal) {
      geometry.setAttribute("normal",
        new THREE.Float32BufferAttribute(part.attributes.normal.array, 3));
    }
    geometry.setIndex(new THREE.Uint32BufferAttribute(part.index.array, 1));
    if (!part.attributes.normal) geometry.computeVertexNormals();

    const name = (part.name || "").toLowerCase();
    if (clearParts.some((p) => name.includes(p))) {
      group.add(new THREE.Mesh(geometry, acrylicMaterial(THREE)));
      continue;
    }

    // Faces can carry their own colors; split them into material groups.
    const partColor = part.color ? rgb(THREE, part.color) : (opts.color || DEFAULT_COLOR);
    const faces = part.brep_faces || [];
    if (faces.some((f) => f.color)) {
      const materials = [];
      const byColor = new Map();
      const materialIndex = (color) => {
        const key = color ? color.join() : "part";
        if (!byColor.has(key)) {
          byColor.set(key, materials.length);
          materials.push(solidMaterial(THREE, color ? rgb(THREE, color) : partColor));
        }
        return byColor.get(key);
      };
      for (const f of faces) {
        geometry.addGroup(f.first * 3, (f.last - f.first + 1) * 3, materialIndex(f.color));
      }
      group.add(new THREE.Mesh(geometry, materials));
    } else {
      group.add(new THREE.Mesh(geometry, solidMaterial(THREE, partColor)));
    }
  }
  return group;
}

// The STEP reader is shared, so several viewers on one page can load at once
let occtPromise = null;
function getOcct() {
  occtPromise ??= loadScript(OCCT_URL + "occt-import-js.js")
    .then(() => window.occtimportjs({ locateFile: (file) => OCCT_URL + file }));
  occtPromise.catch(() => { occtPromise = null; }); // allow a retry
  return occtPromise;
}

const scriptPromises = new Map();
function loadScript(src) {
  if (!scriptPromises.has(src)) {
    scriptPromises.set(src, new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => {
        scriptPromises.delete(src);
        s.remove();
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(s);
    }));
  }
  return scriptPromises.get(src);
}

// ---------- Materials ----------

// STEP colors arrive as 0–1 sRGB triplets
function rgb(THREE, [r, g, b]) {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

function solidMaterial(THREE, color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
}

function acrylicMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: 0xdde8f0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
}

// ---------- Scene ----------

function showScene(THREE, OrbitControls, viewer, model) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = "model-canvas";
  viewer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404850, 2.2));

  // Center the model at the origin and frame the camera around it
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  scene.add(model);
  const size = box.getSize(new THREE.Vector3()).length();

  const camera = new THREE.PerspectiveCamera(35, 1, size / 100, size * 20);
  const [cx, cy, cz] = (viewer.dataset.camera || "0.5,0.4,1").split(",").map(Number);
  camera.position.set(cx, cy, cz).setLength(size * 1.3);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(1, 2, 3);
  camera.add(keyLight); // light follows the camera so the model is never in shadow
  scene.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.autoRotateSpeed = 1.5;
  controls.minDistance = size * 0.3;
  controls.maxDistance = size * 4;
  controls.addEventListener("start", () => { controls.autoRotate = false; });

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(viewer);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}
