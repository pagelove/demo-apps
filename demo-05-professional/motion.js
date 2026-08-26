/* 07 — Operations Console · rows boot in like a panel coming online. */
(() => {
  "use strict";
  if (!window.PLMotion) return;

  const SEL = ".member-card, .topic, .resource";

  PLMotion(SEL, (A, settled) => {
    const { animate, stagger } = A;

    // Only the visible panel animates; hidden panels reveal instantly on tab switch.
    const visible = [...document.querySelectorAll(SEL)].filter(
      (el) => !el.closest(".tab-panel[hidden]")
    );
    const hidden = [...document.querySelectorAll(SEL)].filter(
      (el) => el.closest(".tab-panel[hidden]")
    );
    hidden.forEach((el) => { el.style.opacity = "1"; });

    if (!visible.length) return settled();

    animate(visible, {
      opacity: [0, 1],
      translateX: [-10, 0],
      duration: 520,
      delay: stagger(45),
      ease: "out(3)",
      onComplete: settled,
    });
  });
})();

/* Telemetry. Counts are read from the DOM rather than hard-coded, so the strip
   stays true after a write instead of drifting from the page it describes. */
(() => {
  "use strict";
  const strip = document.querySelector(".console-strip");
  if (!strip) return;

  const MEMBERS = ["alice", "ben", "carla", "dmitri", "elena", "farid"];

  function tally() {
    const topics = [...document.querySelectorAll("#pl-topics .topic")];
    const replies = document.querySelectorAll("#pl-topics .reply").length;
    const resources = [...document.querySelectorAll("#pl-resources .resource")];

    const set = (k, v) => {
      const el = strip.querySelector(`[data-metric="${k}"]`);
      if (el) el.textContent = v;
    };
    set("members", MEMBERS.length);
    set("topics", topics.length);
    set("replies", replies);
    set("resources", resources.length);

    const per = {};
    for (const u of MEMBERS) per[u] = 0;
    for (const el of [...topics, ...resources, ...document.querySelectorAll("#pl-topics .reply")]) {
      const u = el.dataset.author;
      if (u in per) per[u] += 1;
    }
    const max = Math.max(1, ...Object.values(per));
    const spark = strip.querySelector('[data-metric="spark"]');
    if (spark) {
      spark.innerHTML = "";
      for (const u of MEMBERS) {
        const bar = document.createElement("span");
        bar.style.height = `${Math.max(8, Math.round((per[u] / max) * 100))}%`;
        bar.dataset.who = u.slice(0, 3);
        spark.appendChild(bar);
      }
    }
    for (const u of MEMBERS) {
      const slot = document.querySelector(`[data-activity-for="${u}"]`);
      if (slot) slot.innerHTML = `<b>${per[u]}</b> contribution${per[u] === 1 ? "" : "s"}`;
    }
  }

  tally();

  // Observe only the two lists app.js writes into. Watching the whole .wrap
  // was an infinite loop: tally() writes the per-member counts back into
  // .member-activity, which is inside .wrap, which re-fired the observer —
  // enough to hang the page outright.
  for (const id of ["pl-topics", "pl-resources"]) {
    const list = document.getElementById(id);
    if (list) new MutationObserver(tally).observe(list, { subtree: true, childList: true });
  }
})();

/* Open the activity panel on load with the first member selected. The Directory
   tab was six cards over an empty screen; this both fills the fold and shows
   the cross-collection lookup without requiring a click to discover it. */
(() => {
  "use strict";
  const first = document.querySelector(".member-card");
  if (!first || !document.getElementById("pl-activity")) return;
  // after app.js has bound its click handler
  setTimeout(() => { try { first.click(); } catch (e) { /* no-op */ } }, 0);
})();
