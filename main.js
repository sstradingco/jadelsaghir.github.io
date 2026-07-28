const progress = document.querySelector("[data-reading-progress]");
const intro = document.querySelector("[data-site-intro]");
const introCounter = document.querySelector("[data-intro-counter]");
const introLine = document.querySelector("[data-intro-line]");
const header = document.querySelector(".site-header");
const cursorDot = document.querySelector("[data-cursor-dot]");
const cursorRing = document.querySelector("[data-cursor-ring]");
const tabs = [...document.querySelectorAll(".tab[href^='#']")];
const sections = tabs
  .map((tab) => document.querySelector(tab.getAttribute("href")))
  .filter(Boolean);
const panels = [...document.querySelectorAll(".panel")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const finishIntro = () => {
  document.body.classList.remove("is-introducing");
  document.body.classList.add("is-ready");
  if (!intro) return;
  intro.classList.add("is-exit");
  window.setTimeout(() => {
    intro.remove();
  }, 950);
};

const runIntro = () => {
  if (!intro || reduceMotion) {
    document.body.classList.remove("is-introducing");
    document.body.classList.add("is-ready");
    intro?.remove();
    return;
  }

  const duration = 1600;
  const start = performance.now();

  const tick = (now) => {
    const ratio = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - ratio, 3);
    const value = Math.round(eased * 100);

    if (introCounter) introCounter.textContent = String(value);
    if (introLine) introLine.style.setProperty("--progress", `${eased}`);

    if (ratio < 1) {
      window.requestAnimationFrame(tick);
      return;
    }

    window.setTimeout(finishIntro, 220);
  };

  window.requestAnimationFrame(tick);
};

if (introLine) {
  introLine.style.setProperty("--progress", "0");
}

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
  let ringX = mouseX;
  let ringY = mouseY;
  let visible = false;

  const render = () => {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
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
    },
    { passive: true }
  );

  document.addEventListener("mousedown", () => {
    document.body.classList.add("is-cursor-press");
  });

  document.addEventListener("mouseup", () => {
    document.body.classList.remove("is-cursor-press");
  });

  document.querySelectorAll("a, button, summary, .tab, .course-card summary").forEach((element) => {
    element.addEventListener("mouseenter", () => {
      document.body.classList.add("is-cursor-hover");
    });
    element.addEventListener("mouseleave", () => {
      document.body.classList.remove("is-cursor-hover");
    });
  });

  window.requestAnimationFrame(render);
};

const initMagneticLinks = () => {
  if (!canHover || reduceMotion) return;

  document.querySelectorAll(".tab, .links a, .project-inquiry a, .asset-link a").forEach((element) => {
    element.addEventListener("mousemove", (event) => {
      const rect = element.getBoundingClientRect();
      const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
      element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    });

    element.addEventListener("mouseleave", () => {
      element.style.transform = "";
    });
  });
};

initCursor();
initMagneticLinks();

const splitWords = document.querySelector("[data-split-words]");
if (splitWords) {
  splitWords.querySelectorAll(".title-line").forEach((line) => {
    const text = line.textContent.trim();
    line.innerHTML = `<span class="word">${text}</span>`;
  });
}

const splitText = document.querySelector("[data-split-text]");
if (splitText && !reduceMotion) {
  const text = splitText.textContent;
  splitText.setAttribute("aria-label", text);
  splitText.innerHTML = [...text]
    .map((char, index) => {
      const content = char === " " ? "&nbsp;" : char;
      return `<span class="char" style="transition-delay:${index * 18}ms">${content}</span>`;
    })
    .join("");
}

const revealTargets = document.querySelectorAll(
  ".intro > p:not(.overline):not(.hero-kicker):not(.scroll-cue), .panel > h2, .panel > .section-intro, .panel > article, .panel > .recognition-list, .course-explorer > .course-group, .hero-kicker, .hero-footer"
);

revealTargets.forEach((element, index) => {
  element.classList.add("motion-item");
  element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
});

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
  panels.forEach((panel) => panel.classList.add("is-inview"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  revealTargets.forEach((element) => revealObserver.observe(element));

  const panelObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-inview", entry.isIntersecting);
      });
    },
    { threshold: 0.28 }
  );

  panels.forEach((panel) => panelObserver.observe(panel));
}

let frameRequested = false;

const updateScrollDetails = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progressValue = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  progress?.style.setProperty("transform", `scaleX(${progressValue})`);
  header?.classList.toggle("is-scrolled", window.scrollY > 8);

  let activeSection = sections[0];
  const activationLine = window.innerHeight * 0.35;

  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= activationLine) {
      activeSection = section;
    }
  });

  tabs.forEach((tab) => {
    const isActive = tab.getAttribute("href") === `#${activeSection?.id}`;
    tab.classList.toggle("is-active", isActive);
    if (isActive) {
      tab.setAttribute("aria-current", "location");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  if (!reduceMotion && window.innerWidth > 650) {
    panels.forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const distanceFromCenter = window.innerHeight / 2 - (rect.top + rect.height / 2);
      const shift = Math.max(-32, Math.min(32, distanceFromCenter * 0.05));
      panel.style.setProperty("--number-shift", `${shift}px`);
    });
  }

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
