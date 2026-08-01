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

let lenis = null;

const finishIntro = () => {
  document.body.classList.remove("is-introducing");
  document.body.classList.add("is-ready");
  lenis?.start();
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
  const offset = -getMobileHeaderOffset();
  if (lenis) {
    lenis.scrollTo(target, {
      offset,
      immediate: reduceMotion,
      duration: 1.15,
    });
    return;
  }
  const top = target.getBoundingClientRect().top + window.scrollY + offset;
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
const driftItems = [...document.querySelectorAll("[data-drift]")];
const scrubSections = [...document.querySelectorAll("[data-scrub]")];
const horizontalChapter = document.querySelector("[data-h-chapter]");
const horizontalTrack = document.querySelector("[data-h-track]");
const horizontalProgress = document.querySelector("[data-h-progress]");
let horizontalTravel = 0;

const measureHorizontalChapter = () => {
  if (!horizontalChapter || !horizontalTrack) return;
  if (horizontalChapter.classList.contains("is-static")) {
    horizontalChapter.style.height = "";
    horizontalTrack.style.transform = "";
    horizontalTravel = 0;
    return;
  }

  horizontalTravel = Math.max(horizontalTrack.scrollWidth - window.innerWidth, 0);
  horizontalChapter.style.height = `${window.innerHeight + horizontalTravel}px`;
};

const updateHorizontalChapter = () => {
  if (!horizontalChapter || !horizontalTrack || horizontalChapter.classList.contains("is-static")) {
    return;
  }

  const rect = horizontalChapter.getBoundingClientRect();
  const maxScroll = Math.max(horizontalChapter.offsetHeight - window.innerHeight, 1);
  const scrolled = Math.min(Math.max(-rect.top, 0), maxScroll);
  const progress = scrolled / maxScroll;
  horizontalTrack.style.transform = `translate3d(${(-progress * horizontalTravel).toFixed(2)}px, 0, 0)`;
  horizontalProgress?.style.setProperty("transform", `scaleX(${progress})`);
  horizontalChapter.classList.toggle("is-pinning", progress > 0 && progress < 1);
  horizontalChapter.classList.toggle("has-started", progress > 0.02);
};

const initHorizontalChapter = () => {
  if (!horizontalChapter || !horizontalTrack) return;

  if (reduceMotion) {
    horizontalChapter.classList.add("is-static");
    return;
  }

  measureHorizontalChapter();
  updateHorizontalChapter();
};

const updateScrollMotion = () => {
  if (reduceMotion) return;

  const vh = window.innerHeight || 1;

  driftItems.forEach((element) => {
    if (element.classList.contains("motion-item") && !element.classList.contains("is-visible")) {
      return;
    }
    const speed = Number(element.dataset.drift) || 0.12;
    const rect = element.getBoundingClientRect();
    const progress = (rect.top + rect.height * 0.5 - vh * 0.5) / vh;
    const shift = progress * speed * -100;
    element.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
  });

  scrubSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const start = vh * 0.9;
    const end = vh * 0.28;
    const raw = (start - rect.top) / (start - end);
    const scrub = Math.max(0, Math.min(1, raw));
    section.style.setProperty("--scrub", scrub.toFixed(3));
    section.classList.toggle("is-scrub-active", scrub > 0.5);
  });

  updateHorizontalChapter();
};

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

  updateScrollMotion();
  frameRequested = false;
};

const requestScrollUpdate = () => {
  if (frameRequested) return;
  frameRequested = true;
  window.requestAnimationFrame(updateScrollDetails);
};

const initLenis = () => {
  if (reduceMotion || typeof Lenis !== "function") return null;

  const instance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.15,
  });

  if (document.body.classList.contains("is-introducing")) {
    instance.stop();
  }

  instance.on("scroll", requestScrollUpdate);

  const raf = (time) => {
    instance.raf(time);
    window.requestAnimationFrame(raf);
  };
  window.requestAnimationFrame(raf);
  return instance;
};

lenis = initLenis();

initHorizontalChapter();
updateScrollDetails();
window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", () => {
  measureHorizontalChapter();
  requestScrollUpdate();
});
window.addEventListener("load", () => {
  measureHorizontalChapter();
  requestScrollUpdate();
});

const initSmoothDetails = () => {
  document.querySelectorAll("details").forEach((details) => {
    const summary = details.querySelector("summary");
    if (!summary) return;

    let panel = details.querySelector(":scope > .course-panel, :scope > .details-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "details-panel";
      const leftovers = [];
      let node = summary.nextSibling;
      while (node) {
        const next = node.nextSibling;
        leftovers.push(node);
        node = next;
      }
      leftovers.forEach((item) => panel.appendChild(item));
      details.appendChild(panel);
    }

    details.classList.add("js-smooth");
    let animating = false;
    let endTimer = 0;

    const measureHeight = () => {
      const previous = panel.style.height;
      panel.style.height = "auto";
      const height = panel.scrollHeight;
      panel.style.height = previous;
      return height;
    };

    const afterHeightTransition = (callback) => {
      let done = false;
      const finish = (event) => {
        if (event && event.target !== panel) return;
        if (event && event.propertyName && event.propertyName !== "height") return;
        if (done) return;
        done = true;
        panel.removeEventListener("transitionend", finish);
        window.clearTimeout(endTimer);
        callback();
      };
      panel.addEventListener("transitionend", finish);
      endTimer = window.setTimeout(() => finish(), 500);
    };

    const openDetails = () => {
      if (animating || details.classList.contains("is-open")) return;
      animating = true;
      details.open = true;
      details.classList.add("is-open");
      panel.style.height = "0px";
      const fullHeight = measureHeight();
      panel.getBoundingClientRect();
      window.requestAnimationFrame(() => {
        panel.style.height = `${fullHeight}px`;
      });
      afterHeightTransition(() => {
        panel.style.height = "auto";
        animating = false;
      });
    };

    const closeDetails = () => {
      if (animating || !details.classList.contains("is-open")) return;
      animating = true;
      panel.style.height = `${measureHeight()}px`;
      panel.getBoundingClientRect();
      details.classList.remove("is-open");
      window.requestAnimationFrame(() => {
        panel.style.height = "0px";
      });
      afterHeightTransition(() => {
        details.open = false;
        panel.style.height = "";
        animating = false;
      });
    };

    if (details.open) {
      details.classList.add("is-open");
      panel.style.height = "auto";
    }

    summary.addEventListener("click", (event) => {
      if (reduceMotion) return;
      event.preventDefault();
      if (details.classList.contains("is-open")) closeDetails();
      else openDetails();
    });
  });
};

initSmoothDetails();
