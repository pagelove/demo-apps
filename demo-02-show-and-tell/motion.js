/* 01 — Midnight Gallery · motion + WebGL hero
   Content is fully visible without this file. Everything below is enhancement.
   Visibility guarantees live in /assets/motion-core.js (PLMotion). */
(() => {
  "use strict";
  if (!window.PLMotion) return;

  PLMotion(".card, .hero-inner > *", (A, settled) => {
    const { animate, stagger } = A;

    const heroBits = document.querySelectorAll(".hero-inner > *");
    if (heroBits.length) {
      animate(heroBits, {
        opacity: [0, 1], translateY: [18, 0],
        duration: 900, delay: stagger(90), ease: "out(3)",
      });
    }

    const cards = document.querySelectorAll(".card");
    if (cards.length) {
      animate(cards, {
        opacity: [0, 1], translateY: [22, 0], scale: [0.96, 1],
        duration: 800, delay: stagger(45, { start: 220 }), ease: "out(3)",
        onComplete: settled,          // clears the failsafe once the reveal lands
      });
    } else {
      settled();
    }

    // Reaction pop — near-critical, no visible overshoot.
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-react");
      if (btn) animate(btn, { scale: [1, 1.14, 1], duration: 420, ease: "out(4)" });
    });
  });

  // The hero's CSS treatment is intentionally the only visual dependency here.
  // It works without a missing or separately licensed WebGL library, keeps the
  // strict same-origin CSP small, and leaves the content usable on every device.
})();
