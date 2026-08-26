/* 05 — Quiet Metrics · ring sweep + count-up. Enhancement only. */
(() => {
  "use strict";
  if (!window.PLMotion) return;

  PLMotion(".stat, .checkin-form", (A, settled) => {
    const { animate, stagger } = A;

    const tiles = document.querySelectorAll(".stat, .checkin-form");
    if (!tiles.length) return settled();
    animate(tiles, {
      opacity: [0, 1], translateY: [14, 0],
      duration: 700, delay: stagger(80), ease: "out(3)",
      onComplete: settled,
    });

    // Streak ring sweeps from empty to its value.
    const ring = document.querySelector(".ring .value");
    if (ring && ring.getTotalLength) {
      const len = ring.getTotalLength();
      const pct = Number(ring.dataset.pct || 0) / 100;
      ring.style.strokeDasharray = String(len);
      ring.style.strokeDashoffset = String(len);
      animate(ring, {
        strokeDashoffset: [len, len * (1 - pct)],
        duration: 1100, ease: "out(3)",
      });
    }

    // Numerals tick up in sync with the ring.
    document.querySelectorAll("[data-count]").forEach((el) => {
      const to = Number(el.dataset.count || 0);
      const o = { v: 0 };
      animate(o, {
        v: to, duration: 1100, ease: "out(3)",
        onUpdate: () => { el.textContent = String(Math.round(o.v)); },
      });
    });
  });
})();

/* Paint the hundred cells. 63 done, day 64 is today — matching the tiles. */
(() => {
  "use strict";
  const grid = document.getElementById("pl-hundred");
  if (!grid) return;
  const DONE = 63;
  for (let d = 1; d <= 100; d++) {
    const cell = document.createElement("i");
    if (d <= DONE) cell.className = "done";
    else if (d === DONE + 1) cell.className = "today";
    grid.appendChild(cell);
  }
  if (!window.anime || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Fill sweeps left to right so the streak reads as accumulated, not given.
  window.anime.animate(grid.querySelectorAll("i.done"), {
    opacity: [0.25, 1], scale: [0.7, 1],
    duration: 420, delay: window.anime.stagger(9), ease: "out(3)",
  });
})();
