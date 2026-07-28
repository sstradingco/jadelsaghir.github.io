const progress = document.querySelector("[data-reading-progress]");
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

let smoothScroll = null;

const getScrollMax = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const scrollToTop = () => {
  if (smoothScroll) {
    smoothScroll.set(0, true);
    return;
  }
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

  const duration = 1600;
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
    window.setTimeout(finishIntro, 220);
  };

  window.requestAnimationFrame(tick);
};

if (introLine) introLine.style.setProperty("--progress", "0");
runIntro();

const initSmoothScroll = () => {
  if (reduceMotion || !canHover) return null;

  document.documentElement.classList.add("is-smooth-scrolling");

  let current = window.scrollY;
  let target = window.scrollY;
  let frameId = 0;

  const clampTarget = () => {
    target = Math.max(0, Math.min(target, getScrollMax()));
  };

  const render = () => {
    clampTarget();
    current += (target - current) * 0.085;
    if (Math.abs(target - current) < 0.15) current = target;
    window.scrollTo(0, current);
    frameId = current === target ? 0 : window.requestAnimationFrame(render);
  };

  const kick = () => {
    if (!frameId) frameId = window.requestAnimationFrame(render);
  };

  const set = (value, instant = false) => {
    target = value;
    clampTarget();
    if (instant) {
      current = target;
      window.scrollTo(0, current);
      frameId = 0;
      return;
    }
    kick();
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const nestedScroll = path.find(
        (node) =>
          node instanceof HTMLElement &&
          node !== document.body &&
          node !== document.documentElement &&
          node.scrollHeight > node.clientHeight + 1 &&
          /(auto|scroll)/.test(getComputedStyle(node).overflowY)
      );
      if (nestedScroll) return;

      event.preventDefault();
      target += event.deltaY;
      clampTarget();
      kick();
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    clampTarget();
    kick();
  });

  return { set, kick };
};

smoothScroll = initSmoothScroll();

const initCursor = () => {
  if (!canHover || reduceMotion || !cursorDot || !cursorRing) {
    document.body.classList.remove("has-custom-cursor");
    cursorDot?.remove();
    cursorRing?.remove();
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let dotX = mouseX;
  let dotY = mouseY;
  let ringX = mouseX;
  let ringY = mouseY;
  let visible = false;

  const render = () => {
    dotX += (mouseX - dotX) * 0.35;
    dotY += (mouseY - dotY) * 0.35;
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    cursorDot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
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

  document.addEventListener("mousedown", () => document.body.classList.add("is-cursor-press"));
  document.addEventListener("mouseup", () => document.body.classList.remove("is-cursor-press"));

  document.querySelectorAll("a, button, summary").forEach((element) => {
    element.addEventListener("mouseenter", () => document.body.classList.add("is-cursor-hover"));
    element.addEventListener("mouseleave", () => document.body.classList.remove("is-cursor-hover"));
  });

  window.requestAnimationFrame(render);
};

const initMagneticLinks = () => {
  if (!canHover || reduceMotion) return;
  document.querySelectorAll(".hero-links a, .project-inquiry a, .rail-brand").forEach((element) => {
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

const closeMenu = () => {
  if (!menuToggle || !mobileNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  mobileNav.hidden = true;
};

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mobileNav.hidden = open;
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

const scrollToHash = (hash) => {
  const id = hash.replace("#", "");
  const target = document.getElementById(id);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 16;
  if (smoothScroll) {
    smoothScroll.set(top);
    return;
  }
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
initMagneticLinks();

const splitWords = document.querySelector("[data-split-words]");
if (splitWords) {
  splitWords.querySelectorAll(".title-line").forEach((line) => {
    line.innerHTML = `<span class="word">${line.textContent.trim()}</span>`;
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
  ".hero-copy, .section-head, .role-card, .edu-card, .recognition-list, .course-group, .project-feature, .interest-block"
);

revealTargets.forEach((element, index) => {
  element.classList.add("motion-item");
  element.style.setProperty("--reveal-delay", `${(index % 4) * 80}ms`);
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
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
  );
  revealTargets.forEach((element) => revealObserver.observe(element));
}

let frameRequested = false;

const updateScrollDetails = () => {
  const scrollable = getScrollMax();
  const progressValue = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  progress?.style.setProperty("transform", `scaleX(${progressValue})`);

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
