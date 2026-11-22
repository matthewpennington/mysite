// ============ Footer year ============
document.getElementById("year").textContent = new Date().getFullYear();

// ============ Mobile nav toggle ============
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open);
});

// Close the menu when a link is clicked
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

// ============ Project filtering ============
const filterButtons = document.querySelectorAll(".filter-btn");
const projectCards = document.querySelectorAll(".project-card");

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.dataset.filter;
    projectCards.forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !show);
    });
  });
});

// ============ Reveal sections on scroll ============
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll(".section").forEach((s) => observer.observe(s));

// ============ 3D viewer on a local file ============
// Browsers block the viewer's scripts and model files when a page is opened
// straight from disk (file://), so say so instead of doing nothing.
if (location.protocol === "file:") {
  document.querySelectorAll(".model-viewer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.textContent = "3D view needs a web server — see README";
      btn.disabled = true;
    });
  });
}

// ============ Photo lightbox ============
// Click (or press Enter on) any project photo to see it full-screen.
// Arrows / swipe step through the other photos in the same gallery.
(() => {
  const photos = [...document.querySelectorAll(".project-figure img, img.pet-photo")]
    .filter((img) => !img.closest(".model-viewer"));
  if (!photos.length) return;

  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Photo viewer");
  box.innerHTML = `
    <button class="lightbox-btn lightbox-close" type="button" aria-label="Close">✕</button>
    <button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous photo">‹</button>
    <figure class="lightbox-figure">
      <img class="lightbox-img" alt="">
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button class="lightbox-btn lightbox-next" type="button" aria-label="Next photo">›</button>`;
  document.body.appendChild(box);

  const img = box.querySelector(".lightbox-img");
  const caption = box.querySelector(".lightbox-caption");
  const prevBtn = box.querySelector(".lightbox-prev");
  const nextBtn = box.querySelector(".lightbox-next");
  const closeBtn = box.querySelector(".lightbox-close");
  let group = [];
  let index = 0;
  let opener = null;

  const captionFor = (photo) => {
    const fc = photo.closest("figure")?.querySelector("figcaption");
    if (fc) return fc.textContent.trim();
    const card = photo.closest(".pet-card");
    return card?.querySelector("h3")?.textContent.trim() || "";
  };

  const show = (i) => {
    index = (i + group.length) % group.length;
    const photo = group[index];
    img.src = photo.currentSrc || photo.src;
    img.alt = photo.alt;
    const text = captionFor(photo);
    caption.textContent = group.length > 1 ? `${text}${text ? " · " : ""}${index + 1} / ${group.length}` : text;
    caption.hidden = !caption.textContent;
  };

  const open = (photo) => {
    const container = photo.closest(".gallery, .pet-grid");
    group = container ? photos.filter((p) => container.contains(p)) : [photo];
    const multi = group.length > 1;
    prevBtn.hidden = nextBtn.hidden = !multi;
    opener = photo;
    show(group.indexOf(photo));
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    closeBtn.focus();
  };

  const close = () => {
    box.hidden = true;
    img.removeAttribute("src");
    document.body.classList.remove("lightbox-open");
    opener?.focus();
  };

  photos.forEach((photo) => {
    photo.classList.add("zoomable");
    photo.tabIndex = 0;
    photo.setAttribute("role", "button");
    photo.setAttribute("aria-label", `View larger: ${photo.alt || "photo"}`);
    photo.addEventListener("click", () => open(photo));
    photo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(photo);
      }
    });
  });

  prevBtn.addEventListener("click", () => show(index - 1));
  nextBtn.addEventListener("click", () => show(index + 1));
  closeBtn.addEventListener("click", close);
  // Clicking the dark backdrop (anything but the photo or a button) closes it
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.classList.contains("lightbox-figure")) close();
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft" && group.length > 1) show(index - 1);
    else if (e.key === "ArrowRight" && group.length > 1) show(index + 1);
    else if (e.key === "Tab") {
      // Keep keyboard focus inside the viewer
      const focusable = [...box.querySelectorAll("button")].filter((b) => !b.hidden);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Swipe left/right on touch screens
  let touchX = null;
  box.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (touchX === null || group.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
