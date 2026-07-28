const progress = document.querySelector("[data-reading-progress]");
const intro = document.querySelector("[data-site-intro]");
const introCounter = document.querySelector("[data-intro-counter]");
const introLine = document.querySelector("[data-intro-line]");
const tabs = [...document.querySelectorAll(".tab[href^='#']")];
const sections = tabs
  .map((tab) => document.querySelector(tab.getAttribute("href")))
  .filter(Boolean);
const panels = [...document.querySelectorAll(".panel")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

const revealTargets = document.querySelectorAll(
  ".intro > h1, .intro > .lead, .intro > p:not(.overline), .panel > h2, .panel > .section-intro, .panel > article, .panel > .recognition-list, .course-explorer > .course-group"
);

revealTargets.forEach((element, index) => {
  element.classList.add("motion-item");
  element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
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
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  revealTargets.forEach((element) => revealObserver.observe(element));
}

let frameRequested = false;

const updateScrollDetails = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progressValue = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  progress?.style.setProperty("transform", `scaleX(${progressValue})`);

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
