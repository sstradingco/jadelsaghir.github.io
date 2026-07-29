const progress = document.querySelector("[data-reading-progress]");
const railProgress = document.querySelector("[data-rail-progress]");
const intro = document.querySelector("[data-site-intro]");
const introCounter = document.querySelector("[data-intro-counter]");
const introLine = document.querySelector("[data-intro-line]");
const cursorDot = document.querySelector("[data-cursor-dot]");
const cursorRing = document.querySelector("[data-cursor-ring]");
const railLinks = [...document.querySelectorAll("[data-rail-link]")];
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const sections = [...document.querySelectorAll("main .panel[id]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const scrollToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

if (window.location.hash) {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

scrollToTop();
window.addEventListener("load", scrollToTop);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) scrollToTop();
});

const finishIntro = () => {
  document.body.classList.remove("is-introducing");
  document.body.classList.add("is-ready");
  if (!intro) return;
  intro.classList.add("is-exit");
  window.setTimeout(() => intro.remove(), 950);
};

const runIntro = () => {
  if (!intro || reduceMotion) {
    document.body.classList.remove("is-introducing");
    document.body.classList.add("is-ready");
    intro?.remove();
    return;
  }

  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const ratio = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - ratio, 3);
    if (introCounter) introCounter.textContent = String(Math.round(eased * 100));
    if (introLine) introLine.style.setProperty("--progress", `${eased}`);
    if (ratio < 1) {
      window.requestAnimationFrame(tick);
      return;
    }
    window.setTimeout(finishIntro, 180);
  };

  window.requestAnimationFrame(tick);
};

if (introLine) introLine.style.setProperty("--progress", "0");
runIntro();

const initCursor = () => {
  if (!canHover || reduceMotion || !cursorDot || !cursorRing) {
    document.body.classList.remove("has-custom-cursor");
    cursorDot?.remove();
    cursorRing?.remove();
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let visible = false;
  let running = false;
  let lastTime = performance.now();

  const render = (time) => {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    const ease = 1 - Math.exp(-14 * dt);
    cursorX += (mouseX - cursorX) * ease;
    cursorY += (mouseY - cursorY) * ease;
    const transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    cursorDot.style.transform = transform;
    cursorRing.style.transform = transform;

    if (Math.abs(mouseX - cursorX) > 0.15 || Math.abs(mouseY - cursorY) > 0.15) {
      window.requestAnimationFrame(render);
      return;
    }
    running = false;
  };

  const kick = () => {
    if (running) return;
    running = true;
    lastTime = performance.now();
    window.requestAnimationFrame(render);
  };

  window.addEventListener(
    "mousemove",
    (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (!visible) {
        visible = true;
        document.body.classList.add("is-cursor-ready");
      }
      kick();
    },
    { passive: true }
  );

  document.addEventListener("mousedown", () => document.body.classList.add("is-cursor-press"));
  document.addEventListener("mouseup", () => document.body.classList.remove("is-cursor-press"));

  document.querySelectorAll("a, button, summary").forEach((element) => {
    element.addEventListener("mouseenter", () => document.body.classList.add("is-cursor-hover"));
    element.addEventListener("mouseleave", () => document.body.classList.remove("is-cursor-hover"));
  });
};

const getMobileHeaderOffset = () => {
  const header = document.querySelector(".mobile-header");
  if (!header || window.getComputedStyle(header).display === "none") return 16;
  return header.getBoundingClientRect().height + 12;
};

const closeMenu = () => {
  if (!menuToggle || !mobileNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "Menu";
  mobileNav.hidden = true;
  document.body.classList.remove("menu-open");
};

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  menuToggle.textContent = open ? "Menu" : "Close";
  mobileNav.hidden = open;
  document.body.classList.toggle("menu-open", !open);
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeMenu();
});

const scrollToHash = (hash) => {
  const id = hash.replace("#", "");
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - getMobileHeaderOffset();
  window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
};

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    history.pushState(null, "", href === "#content" ? window.location.pathname : href);
    scrollToHash(href);
    closeMenu();
  });
});

initCursor();

const splitWords = document.querySelector("[data-split-words]");
if (splitWords) {
  splitWords.querySelectorAll(".title-line").forEach((line) => {
    line.innerHTML = `<span class="word">${line.textContent.trim()}</span>`;
  });
}

const revealTargets = document.querySelectorAll(
  ".hero-copy, .section-head, .role-card, .edu-card, .recognition-list, .course-group, .project-feature, .interest-block"
);

revealTargets.forEach((element, index) => {
  element.classList.add("motion-item");
  element.style.setProperty("--reveal-delay", `${(index % 3) * 40}ms`);
});

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
  );
  revealTargets.forEach((element) => revealObserver.observe(element));
}

let frameRequested = false;

const updateScrollDetails = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progressValue = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  progress?.style.setProperty("transform", `scaleX(${progressValue})`);
  railProgress?.style.setProperty("transform", `scaleY(${progressValue})`);

  let activeSection = sections[0];
  const activationLine = window.innerHeight * 0.35;
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= activationLine) activeSection = section;
  });

  railLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${activeSection?.id}`;
    link.classList.toggle("is-active", isActive);
  });

  frameRequested = false;
};

const requestScrollUpdate = () => {
  if (frameRequested) return;
  frameRequested = true;
  window.requestAnimationFrame(updateScrollDetails);
};

updateScrollDetails();
window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);
