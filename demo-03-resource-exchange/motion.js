/* 09 — Workshop Ticket · tickets deal onto the bench; status stamps thump down. */
(() => {
  "use strict";
  if (!window.PLMotion) return;

  PLMotion(".listing", (A, settled) => {
    const { animate, stagger, createTimeline } = A;

    const cards = document.querySelectorAll(".listing");
    if (!cards.length) return settled();

    const tl = createTimeline();

    tl.add(cards, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 480,
      delay: stagger(60),
      ease: "out(3)",
    });

    // Each stamp lands hard, then settles back to its resting tilt.
    const stamps = document.querySelectorAll(".status-tag");
    if (stamps.length) {
      tl.add(stamps, {
        scale: [1.9, 1],
        opacity: [0, 0.86],
        rotate: ["-14deg", "-3.5deg"],
        duration: 380,
        delay: stagger(60),
        ease: "out(4)",
      }, "-=260");
    }

    tl.then(settled);
  });

  // A stamp re-thumps whenever app.js rewrites a listing's status.
  const grid = document.getElementById("pl-listings");
  if (!grid || !window.anime) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  new MutationObserver((records) => {
    const hit = new Set();
    for (const r of records) {
      const tag = (r.target.closest && r.target.closest(".status-tag")) ||
                  (r.target.parentElement && r.target.parentElement.closest(".status-tag"));
      if (tag) hit.add(tag);
    }
    hit.forEach((tag) => {
      window.anime.animate(tag, {
        scale: [1.6, 1],
        rotate: ["-11deg", "-3.5deg"],
        duration: 340,
        ease: "out(4)",
      });
    });
  }).observe(grid, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ["data-status"],
  });
})();
