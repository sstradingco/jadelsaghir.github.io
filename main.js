const progress = document.querySelector("[data-scroll-progress]");
const tabs = [...document.querySelectorAll(".tab[href^='#']")];
const sections = tabs
  .map((tab) => document.querySelector(tab.getAttribute("href")))
  .filter(Boolean);

let ticking = false;

const updatePageDetails = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  progress?.style.setProperty("transform", `scaleX(${ratio})`);

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

  ticking = false;
};

const requestUpdate = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(updatePageDetails);
};

updatePageDetails();
window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
