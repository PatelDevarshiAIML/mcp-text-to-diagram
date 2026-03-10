import * as THREE from "./vendor/three.module.js";

const bgCanvas = document.getElementById("bg-canvas");
const textInput = document.getElementById("text-input");
const imageInput = document.getElementById("image-input");
const fileName = document.getElementById("file-name");
const renderBtn = document.getElementById("render-btn");
const statusEl = document.getElementById("status");
const modeBadge = document.getElementById("mode-badge");
const loaderWrap = document.getElementById("loader-wrap");
const diagramOutput = document.getElementById("diagram-output");
const cursorGlow = document.getElementById("cursor-glow");
const cursorRing = document.getElementById("cursor-ring");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleLabel = document.getElementById("theme-toggle-label");
const siteHeader = document.getElementById("site-header");
const headerTitle = document.getElementById("header-title");
const homeSection = document.getElementById("home");
const drawPath = document.querySelector(".draw");
const showcaseSection = document.getElementById("monogrid");

const navLinks = [...document.querySelectorAll(".site-nav a[data-nav]")];
const brandSections = [...document.querySelectorAll("[data-brand]")];
const slideshowRoot = document.getElementById("monogrid-slideshow");
const slideshowSlides = [...document.querySelectorAll(".showcase-slide")];
const slideshowDotsHost = document.getElementById("showcase-dots");
const homeScrollLayers = [...document.querySelectorAll("#home [data-home-speed]")];
const fxChips = [...document.querySelectorAll(".fx-chip")];
const cards = [
  ...document.querySelectorAll(".card, .form-section, .result-section, .team-card, .loader-wrap, .diagram-output")
];

let imageDataUrl = "";
let themeHue = 8;
const FRONTEND_RENDER_MS = 10000;
const THEME_KEY = "diagram-theme-v2";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowPerfDevice =
  (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 6) ||
  (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 6);
const reducedFx = prefersReducedMotion || lowPerfDevice;
const perfTuned = true;

const noopBgController = {
  triggerFx() {}
};

let bgController = noopBgController;
let loaderController = initCssLoaderController();

if (reducedFx) {
  document.documentElement.classList.add("reduced-fx");
}
if (perfTuned) {
  document.documentElement.classList.add("perf-tuned");
}

initTheme();
initDynamicTheme();
initBackdropPointerGlow();
initCursorFx();
initCardTilt();
initNavigation();
initScrollBranding();
initScrollPerformanceBoost();
initShowcaseEffects();
initShowcaseSlideshow();
initHomeScrollEffects();
wireEvents();
initThreeFeatures();

function initThreeFeatures() {
  if (!bgCanvas) return;

  try {
    bgController = initBackgroundScene();
    if (statusEl && statusEl.textContent !== "Ready.") {
      statusEl.textContent = "Ready.";
    }
  } catch (error) {
    console.error("Background scene failed:", error);
    if (statusEl) {
      statusEl.textContent = "3D effects unavailable. Basic interactions are active.";
    }
  }
}

function initTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
  setTheme(initialTheme);

  if (!themeToggle || !themeToggleLabel) return;
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current === "dark" ? "light" : "dark");
  });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  if (!themeToggleLabel) return;
  themeToggleLabel.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function initDynamicTheme() {
  const root = document.documentElement;
  const setHue = (hue) => {
    themeHue = ((hue % 360) + 360) % 360;
    root.style.setProperty("--theme-hue", themeHue.toFixed(2));
  };

  setHue(Math.random() * 360);
  let drift = 0.2 + Math.random() * 0.12;

  const intervalMs = reducedFx ? 480 : 320;
  window.setInterval(() => {
    if (document.hidden) return;
    setHue(themeHue + drift);
  }, intervalMs);

  window.addEventListener("pointerdown", () => {
    setHue(themeHue + 10 + Math.random() * 20);
    drift = 0.15 + Math.random() * 0.26;
  });
}

function initScrollPerformanceBoost() {
  let scrollTimerId = 0;
  const onScroll = () => {
    document.documentElement.classList.add("is-scrolling");
    if (scrollTimerId) window.clearTimeout(scrollTimerId);
    scrollTimerId = window.setTimeout(() => {
      document.documentElement.classList.remove("is-scrolling");
      scrollTimerId = 0;
    }, 120);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initNavigation() {
  if (navLinks.length === 0) return;

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initScrollBranding() {
  if (brandSections.length === 0) return;

  const setHeaderState = (section) => {
    const brand = section.dataset.brand || "MonoGrid";
    const id = section.id;

    if (headerTitle) headerTitle.textContent = brand;
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("is-active", href === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      setHeaderState(visible[0].target);
    },
    {
      threshold: [0.35, 0.55, 0.75],
      rootMargin: "-15% 0px -35% 0px"
    }
  );

  brandSections.forEach((section) => observer.observe(section));

  const onScroll = () => {
    if (!siteHeader) return;
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 40);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initShowcaseEffects() {
  let pathLength = 0;
  if (drawPath && typeof drawPath.getTotalLength === "function") {
    pathLength = drawPath.getTotalLength();
    drawPath.style.strokeDasharray = String(pathLength);
    drawPath.style.strokeDashoffset = String(pathLength);
  }

  let rafId = 0;

  const render = () => {
    rafId = 0;

    if (drawPath && showcaseSection && pathLength > 0) {
      const rect = showcaseSection.getBoundingClientRect();
      const start = window.innerHeight * 0.78;
      const end = -rect.height * 0.2;
      const progress = clamp((start - rect.top) / (start - end), 0, 1);
      drawPath.style.strokeDashoffset = String(pathLength * (1 - progress));
    }

  };

  const requestRender = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(render);
  };

  render();
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender);
}

function initShowcaseSlideshow() {
  if (!slideshowRoot || slideshowSlides.length === 0) return;

  let activeIndex = 0;
  const dots = [];

  const setActiveSlide = (nextIndex) => {
    activeIndex = (nextIndex + slideshowSlides.length) % slideshowSlides.length;
    slideshowSlides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeIndex);
    });
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
    });
  };

  if (slideshowDotsHost) {
    slideshowDotsHost.innerHTML = "";
    slideshowSlides.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "showcase-dot";
      if (index === 0) dot.classList.add("is-active");
      slideshowDotsHost.append(dot);
      dots.push(dot);
    });
  }

  let timerId = 0;
  const start = () => {
    if (timerId) return;
    timerId = window.setInterval(() => {
      setActiveSlide(activeIndex + 1);
    }, 2000);
  };
  const stop = () => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = 0;
  };

  setActiveSlide(0);
  start();

  slideshowRoot.addEventListener("mouseenter", () => {
    if (!reducedFx) stop();
  });
  slideshowRoot.addEventListener("mouseleave", () => {
    if (!reducedFx) start();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      return;
    }
    start();
  });
}

function initHomeScrollEffects() {
  if (!homeSection || homeScrollLayers.length === 0) return;
  let rafId = 0;
  const motionStrength = reducedFx ? 0.14 : 0.24;

  const update = () => {
    rafId = 0;
    const rect = homeSection.getBoundingClientRect();
    const scrollInsideSection = clamp(-rect.top, 0, rect.height * 1.2);

    homeScrollLayers.forEach((layer) => {
      const speed = Number.parseFloat(layer.dataset.homeSpeed || "1") || 1;
      const offsetY = (1 - speed) * scrollInsideSection * motionStrength;
      layer.style.transform = `translate3d(0, ${offsetY.toFixed(1)}px, 0)`;
    });
  };

  const requestUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

function initCssLoaderController() {
  let active = false;
  let startedAt = 0;

  return {
    start() {
      active = true;
      startedAt = performance.now();
      loaderWrap?.classList.add("is-running");
    },
    stop() {
      active = false;
      loaderWrap?.classList.remove("is-running");
    },
    async playSequence(totalMs = 3000) {
      if (!active) return;
      const start = startedAt || performance.now();
      while (active && performance.now() - start < totalMs) {
        await wait(140);
      }
    }
  };
}

function wireEvents() {
  if (imageInput && fileName) {
    imageInput.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      if (!file) {
        fileName.textContent = "No image selected";
        imageDataUrl = "";
        return;
      }

      fileName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        imageDataUrl = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  fxChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const fx = chip.dataset.fx || "pulse";
      fxChips.forEach((button) => button.classList.remove("is-active"));
      chip.classList.add("is-active");
      bgController.triggerFx(fx);
      themeHue = (themeHue + 22) % 360;
      document.documentElement.style.setProperty("--theme-hue", themeHue.toFixed(2));
      if (statusEl) statusEl.textContent = `Scene effect: ${fx}`;
      setTimeout(() => chip.classList.remove("is-active"), 420);
    });
  });

  if (!renderBtn || !textInput || !diagramOutput || !loaderWrap || !modeBadge || !statusEl) return;

  renderBtn.addEventListener("click", async () => {
    const text = textInput.value.trim();
    const hasText = text.length > 0;
    const hasImage = Boolean(imageDataUrl);

    const mode = hasText && hasImage ? "text + image" : hasText ? "text only" : hasImage ? "image only" : "demo";
    modeBadge.textContent = `Mode: ${mode}`;
    statusEl.textContent =
      mode === "demo"
        ? "No backend connected. Running frontend demo render..."
        : "Rendering with animated graph loader...";

    loaderWrap.classList.remove("hidden");
    diagramOutput.classList.add("hidden");
    renderBtn.disabled = true;
    renderBtn.textContent = "Rendering Graph...";
    bgController.triggerFx("warp");
    loaderController.start();
    await loaderController.playSequence(FRONTEND_RENDER_MS);

    const nodes = buildNodes(text, hasImage);
    drawDiagram(nodes, hasImage ? imageDataUrl : "");

    loaderController.stop();
    loaderWrap.classList.add("hidden");
    diagramOutput.classList.remove("hidden");
    renderBtn.disabled = false;
    renderBtn.textContent = "Render Graph";
    statusEl.textContent = "Graph rendered successfully (frontend mock).";
    bgController.triggerFx("pulse");
  });
}

function initCursorFx() {
  const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;
  if (!supportsFinePointer || !cursorGlow || !cursorRing || reducedFx) return;

  const target = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  const pos = { x: target.x, y: target.y };
  let hoveringInteractive = false;
  let rafId = 0;

  window.addEventListener("pointermove", (event) => {
    target.x = event.clientX;
    target.y = event.clientY;
    requestTick();
  }, { passive: true });

  window.addEventListener("pointerdown", () => {
    cursorGlow.style.width = "190px";
    cursorGlow.style.height = "190px";
    cursorRing.style.width = "18px";
    cursorRing.style.height = "18px";
    bgController.triggerFx("pulse");
    requestTick();
  });

  window.addEventListener("pointerup", () => {
    cursorGlow.style.width = hoveringInteractive ? "180px" : "140px";
    cursorGlow.style.height = hoveringInteractive ? "180px" : "140px";
    cursorRing.style.width = hoveringInteractive ? "40px" : "28px";
    cursorRing.style.height = hoveringInteractive ? "40px" : "28px";
    requestTick();
  });

  document.addEventListener("mouseover", (event) => {
    if (!(event.target instanceof Element)) return;
    const interactive = event.target.closest(
      "button, input, textarea, label, .card, .panel, .form-section, .result-section, .team-card, .diagram-output, a"
    );
    if (!interactive) return;
    hoveringInteractive = true;
    cursorGlow.style.width = "180px";
    cursorGlow.style.height = "180px";
    cursorRing.style.width = "40px";
    cursorRing.style.height = "40px";
    cursorRing.style.borderColor = "var(--accent)";
    requestTick();
  });

  document.addEventListener("mouseout", (event) => {
    if (!(event.target instanceof Element)) return;
    const interactive = event.target.closest(
      "button, input, textarea, label, .card, .panel, .form-section, .result-section, .team-card, .diagram-output, a"
    );
    if (!interactive) return;
    hoveringInteractive = false;
    cursorGlow.style.width = "140px";
    cursorGlow.style.height = "140px";
    cursorRing.style.width = "28px";
    cursorRing.style.height = "28px";
    cursorRing.style.borderColor = "var(--ring)";
    requestTick();
  });

  const tick = () => {
    rafId = 0;
    pos.x += (target.x - pos.x) * 0.22;
    pos.y += (target.y - pos.y) * 0.22;

    cursorGlow.style.left = `${pos.x}px`;
    cursorGlow.style.top = `${pos.y}px`;
    cursorRing.style.left = `${pos.x}px`;
    cursorRing.style.top = `${pos.y}px`;

    const delta = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y);
    if (delta > 0.25) {
      requestTick();
    }
  };

  const requestTick = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  };

  requestTick();
}

function initBackdropPointerGlow() {
  const updateVars = (clientX, clientY) => {
    const mx = (clientX / window.innerWidth) * 100;
    const my = (clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty("--mx", `${mx}%`);
    document.documentElement.style.setProperty("--my", `${my}%`);
  };

  let rafId = 0;
  let latestX = window.innerWidth * 0.5;
  let latestY = window.innerHeight * 0.5;
  window.addEventListener("pointermove", (event) => {
    latestX = event.clientX;
    latestY = event.clientY;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateVars(latestX, latestY);
    });
  }, { passive: true });
}

function initCardTilt() {
  if (reducedFx) return;
  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const tiltY = x * 4;
      const tiltX = y * -3;
      card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      card.style.borderColor = "var(--accent)";
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      card.style.borderColor = "var(--line)";
    });
  });
}

function initBackgroundScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070707, 6, 16);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({
    canvas: bgCanvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance"
  });
  let dynamicPixelRatio = Math.min(window.devicePixelRatio, reducedFx ? 0.85 : 1.1);
  renderer.setPixelRatio(dynamicPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const pointer = new THREE.Vector2(0, 0);
  const pointerWorldTarget = new THREE.Vector3(0, 0, 0);
  const pointerWorld = new THREE.Vector3(0, 0, 0);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const raycaster = new THREE.Raycaster();

  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const nodeGeometry = new THREE.SphereGeometry(0.045, reducedFx ? 5 : 7, reducedFx ? 5 : 7);
  const nodes = [];
  const nodeCount = reducedFx ? 22 : 40;
  for (let i = 0; i < nodeCount; i += 1) {
    const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
    const base = new THREE.Vector3(
      (Math.random() - 0.5) * 13,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 5
    );
    mesh.position.copy(base);
    nodes.push({
      mesh,
      base,
      scatter: new THREE.Vector3(),
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      phaseC: Math.random() * Math.PI * 2
    });
    scene.add(mesh);
  }

  const linePositions = new Float32Array(nodes.length * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2
  });
  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lineSegments);

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.22,
      transparent: true,
      opacity: 0.2
    })
  );
  scene.add(orb);

  const pulseRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.035, 12, 72),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.5 })
  );
  pulseRing.rotation.x = 1.15;
  scene.add(pulseRing);

  const keyLight = new THREE.PointLight(0xffffff, 1.15, 20);
  keyLight.position.set(2.2, 2.4, 4.3);
  scene.add(keyLight);

  const accentLight = new THREE.PointLight(0xff4747, 1.25, 22);
  accentLight.position.set(-1.5, 0, 3.4);
  scene.add(accentLight);

  let pulse = 0;
  let warp = 0;
  let scatter = 0;

  function triggerFx(type) {
    if (type === "pulse") pulse = 1;
    if (type === "warp") warp = 1;
    if (type === "scatter") {
      scatter = 1;
      nodes.forEach((node) => {
        node.scatter.set(
          (Math.random() - 0.5) * 2.4,
          (Math.random() - 0.5) * 2.4,
          (Math.random() - 0.5) * 1.4
        );
      });
    }
  }

  window.addEventListener("pointermove", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  window.addEventListener("pointerdown", () => triggerFx("pulse"));

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    dynamicPixelRatio = Math.min(window.devicePixelRatio, reducedFx ? 0.85 : 1.1);
    renderer.setPixelRatio(dynamicPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const timer = new THREE.Timer();
  timer.connect(document);
  let frameIndex = 0;
  let smoothedDelta = 8.3;

  const animate = (timestamp) => {
    requestAnimationFrame(animate);

    if (document.hidden) {
      return;
    }

    timer.update(timestamp);
    smoothedDelta = smoothedDelta * 0.94 + timer.getDelta() * 1000 * 0.06;
    if (!reducedFx && frameIndex % 18 === 0) {
      if (smoothedDelta > 11.2 && dynamicPixelRatio > 0.82) {
        dynamicPixelRatio = Math.max(0.82, dynamicPixelRatio - 0.05);
        renderer.setPixelRatio(dynamicPixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      } else if (smoothedDelta < 7.4 && dynamicPixelRatio < 1.1) {
        dynamicPixelRatio = Math.min(1.1, dynamicPixelRatio + 0.03);
        renderer.setPixelRatio(dynamicPixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      }
    }

    const t = timer.getElapsed();
    pulse *= 0.91;
    warp *= 0.94;
    scatter *= 0.96;

    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, pointerWorldTarget);
    pointerWorld.lerp(pointerWorldTarget, 0.13);

    camera.position.x += (pointer.x * 1.5 - camera.position.x) * 0.035;
    camera.position.y += (pointer.y * 1.1 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    orb.rotation.x = t * (0.18 + warp * 0.8);
    orb.rotation.y = t * (0.25 + warp * 1.05);
    orb.position.x += (pointerWorld.x * 0.25 - orb.position.x) * 0.06;
    orb.position.y += (pointerWorld.y * 0.18 - orb.position.y) * 0.06;
    orb.scale.setScalar(1 + pulse * 0.45 + warp * 0.16);

    pulseRing.position.x += (pointerWorld.x * 0.5 - pulseRing.position.x) * 0.12;
    pulseRing.position.y += (pointerWorld.y * 0.5 - pulseRing.position.y) * 0.12;
    pulseRing.rotation.z += 0.01 + warp * 0.08;
    pulseRing.scale.setScalar(1 + pulse * 0.85 + warp * 0.26);
    pulseRing.material.opacity = 0.24 + pulse * 0.6;

    accentLight.position.x = -1.6 + pointer.x * 3.4;
    accentLight.position.y = pointer.y * 2.2;
    accentLight.intensity = 1.2 + pulse * 1.9 + warp * 1.05;

    const shouldUpdateLines = frameIndex % 2 === 0;
    nodes.forEach((node, index) => {
      const swayX = Math.sin(t * 0.8 + node.phaseA) * 0.22;
      const swayY = Math.cos(t * 0.9 + node.phaseB) * 0.22;
      const swayZ = Math.sin(t * 0.65 + node.phaseC) * 0.1;

      const baseX = node.base.x + swayX;
      const baseY = node.base.y + swayY;
      const baseZ = node.base.z + swayZ;

      const dx = baseX - pointerWorld.x;
      const dy = baseY - pointerWorld.y;
      const dz = baseZ - pointerWorld.z;
      const dist = Math.hypot(dx, dy, dz);
      const repel = Math.max(0, 2.35 - dist) * (0.45 + pulse * 1.2);
      const safeDist = Math.max(dist, 0.001);

      const repelX = (dx / safeDist) * repel;
      const repelY = (dy / safeDist) * repel;
      const repelZ = (dz / safeDist) * repel * 0.6;

      const swirlX = Math.sin(t * 1.6 + node.phaseA) * warp * 0.25;
      const swirlY = Math.cos(t * 1.3 + node.phaseB) * warp * 0.25;

      const targetX = baseX + repelX + swirlX + node.scatter.x * scatter;
      const targetY = baseY + repelY + swirlY + node.scatter.y * scatter;
      const targetZ = baseZ + repelZ + node.scatter.z * scatter;

      node.mesh.position.x += (targetX - node.mesh.position.x) * 0.08;
      node.mesh.position.y += (targetY - node.mesh.position.y) * 0.08;
      node.mesh.position.z += (targetZ - node.mesh.position.z) * 0.08;

      const proximity = Math.max(0, 1.7 - dist);
      const scale = 1 + proximity * 1.6 + pulse * 0.4;
      node.mesh.scale.set(scale, scale, scale);

      if (shouldUpdateLines) {
        const idx = index * 6;
        if (dist < 2.8) {
          linePositions[idx] = node.mesh.position.x;
          linePositions[idx + 1] = node.mesh.position.y;
          linePositions[idx + 2] = node.mesh.position.z;
          linePositions[idx + 3] = pointerWorld.x + Math.sin(t * 4 + index) * 0.05;
          linePositions[idx + 4] = pointerWorld.y + Math.cos(t * 4 + index) * 0.05;
          linePositions[idx + 5] = pointerWorld.z;
        } else {
          linePositions[idx] = node.mesh.position.x;
          linePositions[idx + 1] = node.mesh.position.y;
          linePositions[idx + 2] = node.mesh.position.z;
          linePositions[idx + 3] = node.mesh.position.x;
          linePositions[idx + 4] = node.mesh.position.y;
          linePositions[idx + 5] = node.mesh.position.z;
        }
      }
    });

    if (shouldUpdateLines) {
      lineGeometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
    frameIndex += 1;
  };

  requestAnimationFrame(animate);
  return { triggerFx };
}

function buildNodes(text, includeImageNode) {
  const cleaned = text
    .split(/\n|->|=>/)
    .map((part) => part.trim())
    .filter(Boolean);
  const fallback = ["Input", "Transform", "Output"];
  const nodes = cleaned.length > 0 ? cleaned.slice(0, 5) : fallback;
  if (includeImageNode && !nodes.includes("Image Context")) nodes.unshift("Image Context");
  return nodes;
}

function drawDiagram(nodes, imageUrl) {
  if (!diagramOutput) return;

  const width = Math.max(diagramOutput.clientWidth - 16, 320);
  const height = Math.max(diagramOutput.clientHeight - 16, 280);
  const y = height * 0.55;
  const spacing = width / (nodes.length + 1);
  const boxWidth = Math.min(170, spacing * 0.8);
  const boxHeight = 58;

  const svg = [];
  svg.push(`<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`);
  svg.push(`<defs>
      <style>
        .node-rect { stroke: var(--line); }
        .node-text { fill: var(--ink); }
        .node-link { stroke: var(--muted); }
        .arrow-fill { fill: var(--muted); }
        .image-note { fill: var(--accent); }
      </style>
      <linearGradient id="nodeBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="var(--field)"/>
        <stop offset="100%" stop-color="var(--accent-soft)"/>
      </linearGradient>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
        <polygon class="arrow-fill" points="0 0, 7 3.5, 0 7"/>
      </marker>
    </defs>`);
  svg.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="transparent"/>`);

  const positions = nodes.map((_, index) => ({ x: spacing * (index + 1), y }));

  positions.forEach((pos, index) => {
    if (index === positions.length - 1) return;
    const next = positions[index + 1];
    svg.push(
      `<line class="node-link" x1="${pos.x + boxWidth / 2}" y1="${pos.y}" x2="${next.x - boxWidth / 2}" y2="${next.y}" stroke-width="2" marker-end="url(#arrow)" />`
    );
  });

  positions.forEach((pos, index) => {
    const label = escapeHtml(nodes[index]);
    const left = pos.x - boxWidth / 2;
    const top = pos.y - boxHeight / 2;
    svg.push(
      `<rect class="node-rect" x="${left}" y="${top}" rx="12" ry="12" width="${boxWidth}" height="${boxHeight}" fill="url(#nodeBg)" />`
    );
    svg.push(
      `<text class="node-text" x="${pos.x}" y="${pos.y + 6}" font-family="JetBrains Mono, monospace" text-anchor="middle" font-size="12">${label}</text>`
    );
  });

  if (imageUrl) {
    svg.push(`<rect x="16" y="16" width="130" height="96" rx="10" fill="var(--field)" stroke="var(--line)" />`);
    svg.push(
      `<text class="node-text" x="81" y="44" font-family="JetBrains Mono, monospace" text-anchor="middle" font-size="11">IMAGE INPUT</text>`
    );
    svg.push(
      `<text class="image-note" x="81" y="64" font-family="JetBrains Mono, monospace" text-anchor="middle" font-size="10">included in flow</text>`
    );
  }

  svg.push("</svg>");
  const preview = imageUrl ? `<img class="image-preview" alt="input preview" src="${imageUrl}"/>` : "";

  diagramOutput.innerHTML = `
    <div class="diagram-content">
      ${svg.join("")}
      ${preview}
    </div>
  `;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(input) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
