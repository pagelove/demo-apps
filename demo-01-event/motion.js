/* 11 — Trail Pass · countdown fills in, sessions tear off one at a time. */
(() => {
  "use strict";

  // --- Countdown. Runs regardless of motion preference: it is information,
  // not decoration. Reads the event's own <time datetime> so it never drifts
  // from the data. ---
  const stamp = document.querySelector('[itemprop="eventDate"]');
  const box = document.getElementById("pl-countdown");
  const sr = document.getElementById("pl-countdown-text");

  function renderCountdown() {
    if (!stamp || !box) return null;
    const when = new Date(stamp.getAttribute("datetime"));
    if (isNaN(when)) return null;
    const ms = Math.max(0, when - Date.now());
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const parts = { days, hours, minutes };
    box.querySelectorAll("[data-unit]").forEach((el) => {
      el.textContent = String(parts[el.dataset.unit]);
    });
    if (sr) sr.textContent = `Starts in ${days} days, ${hours} hours, ${minutes} minutes.`;
    return parts;
  }

  const target = renderCountdown();
  setInterval(renderCountdown, 30000);

  if (!window.PLMotion) return;

  PLMotion(".session, .countdown-unit", (A, settled) => {
    const { animate, stagger, createTimeline } = A;
    const tl = createTimeline();

    const units = document.querySelectorAll(".countdown-unit");
    if (units.length) {
      tl.add(units, {
        opacity: [0, 1], translateY: [10, 0],
        duration: 420, delay: stagger(70), ease: "out(3)",
      });

      // Numerals roll up to the real figures the countdown just wrote.
      if (target) {
        document.querySelectorAll(".countdown-value").forEach((el) => {
          const to = target[el.dataset.unit];
          const o = { v: 0 };
          animate(o, {
            v: to, duration: 900, ease: "out(3)",
            onUpdate: () => { el.textContent = String(Math.round(o.v)); },
            onComplete: () => { el.textContent = String(to); },
          });
        });
      }
    }

    const rows = document.querySelectorAll(".session");
    if (rows.length) {
      tl.add(rows, {
        opacity: [0, 1], translateX: [-14, 0],
        duration: 460, delay: stagger(80), ease: "out(3)",
      }, units.length ? "-=180" : 0);
    }

    tl.then(settled);
  });
})();
