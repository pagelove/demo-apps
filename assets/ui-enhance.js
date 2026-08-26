/* ui-enhance.js — shared UI hardening for all demo pages.
   Deployed once to /assets/ui-enhance.js and referenced from every demo.

   Three things, all applied at runtime rather than in markup. That is
   deliberate: most of the toggle buttons live inside ShapeConstraint-governed
   regions, where an extra attribute in the source would have to be added to
   every permit or the next write 422s. Setting them from script keeps the
   constrained markup byte-identical to what app.js POSTs.

     1. aria-expanded on disclosure toggles, kept in sync with the panel.
     2. Focus moved into a panel when it opens and returned to the control that
        opened it when it closes.
     3. A short disable window on submit controls, so an accidental double-click
        cannot post the same item twice.
     4. aria-selected / aria-pressed mirrored from whatever app.js marks active,
        so the markup's state attributes never drift from what is on screen.
     5. Arrow-key navigation for the real tablists. Declaring role="tab" without
        it would promise an interaction the page does not honour.
*/
(() => {
  "use strict";

  const PANEL_SEL = ".new-comment, .contact-panel, .answer-panel";
  const TOGGLE_SEL = "[data-comment-toggle], [data-reply-toggle], [data-answer-toggle], [data-contact]";

  // ---------- 1 + 2. disclosure state and focus ----------

  // Only a panel that STARTS hidden is a disclosure. demo-08 uses .new-comment
  // for three always-visible inline composers; treating those as disclosures
  // meant Escape hid one of them permanently — verified live before this guard
  // existed.
  const panels = [...document.querySelectorAll(PANEL_SEL)].filter((p) => p.hidden);
  let lastTrigger = null;

  // Remember what opened a panel, so focus can go back there on close.
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest(TOGGLE_SEL);
    if (t) lastTrigger = t;
  }, true);

  function syncToggles(open) {
    document.querySelectorAll(TOGGLE_SEL).forEach((btn) => {
      // Only the control that opened the panel reads as expanded.
      btn.setAttribute("aria-expanded", String(Boolean(open) && btn === lastTrigger));
    });
  }
  syncToggles(false);

  function onPanelToggled(panel) {
    const open = !panel.hidden;
    syncToggles(open);
    if (open) {
      const field = panel.querySelector("textarea, input, select");
      if (field) {
        // Let the app finish populating the panel before taking focus.
        setTimeout(() => { try { field.focus(); } catch (e) { /* no-op */ } }, 0);
      }
    } else if (lastTrigger && document.contains(lastTrigger)) {
      const back = lastTrigger;
      setTimeout(() => { try { back.focus(); } catch (e) { /* no-op */ } }, 0);
    }
  }

  for (const panel of panels) {
    new MutationObserver(() => onPanelToggled(panel))
      .observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  }

  // Escape closes an open panel, which is what a keyboard user will try.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = panels.find((p) => !p.hidden);
    if (!open) return;
    const cancel = open.querySelector('[id$="-cancel"]');
    if (cancel) cancel.click(); else open.hidden = true;
  });

  // ---------- 3. double-submit guard ----------

  const HOLD_MS = 1500;
  const busy = new WeakSet();

  function hold(el) {
    if (!el || el.disabled) return;
    // Disabled on the next tick so the app's own handler still receives this
    // activation; the guard is only about the *second* one.
    setTimeout(() => {
      if (!el.isConnected) return;
      el.disabled = true;
      setTimeout(() => { el.disabled = false; }, HOLD_MS);
    }, 0);
  }

  // Disabling the button is not sufficient on its own: a form still submits on
  // Enter, and any path that dispatches the event bypasses the button. Measured
  // — with a button-only guard a second submit still posted a second row. The
  // event itself has to be stopped.
  function claim(key, e) {
    if (busy.has(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    busy.add(key);
    setTimeout(() => busy.delete(key), HOLD_MS);
    return true;
  }

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!claim(form, e)) return;
    hold(form.querySelector('button[type="submit"], button:not([type])'));
  }, true);

  // ---------- 4. keep state attributes in step with the active class ----------

  // app.js owns `is-active`; rather than teach five separate apps about ARIA,
  // mirror whatever they set. One source of truth, no drift.
  const STATEFUL = [
    ['[role="tab"]', "aria-selected"],
    [".filter-tab", "aria-pressed"],
    [".tag-filter", "aria-pressed"],
  ];

  function mirrorState() {
    for (const [sel, attr] of STATEFUL) {
      document.querySelectorAll(sel).forEach((el) => {
        el.setAttribute(attr, String(el.classList.contains("is-active")));
      });
    }
  }
  mirrorState();

  for (const [sel] of STATEFUL) {
    document.querySelectorAll(sel).forEach((el) => {
      new MutationObserver(mirrorState)
        .observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // ---------- 5. tablist arrow keys ----------

  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    if (tabs.length < 2) return;

    // Roving tabindex: one stop for the whole tablist, arrows move within it.
    const roving = () => tabs.forEach((t) => {
      t.tabIndex = t.classList.contains("is-active") ? 0 : -1;
    });
    roving();
    tabs.forEach((t) => new MutationObserver(roving)
      .observe(t, { attributes: true, attributeFilter: ["class"] }));

    list.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.click();          // follow-focus, the usual behaviour for these
    });
  });

  // Panels submit with a plain button rather than a form.
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(
      'button[id$="-submit"], button[id$="-send"], button[data-comment-submit], #pl-rsvp, #pl-submit-rating');
    if (!b) return;

    // Do not spend the guard on a click that cannot post anything. The apps
    // bail out on an empty field (`if (!body) return`), and guarding that
    // no-op locked the control for 1.5s — so a user who clicked, noticed the
    // empty box, typed, and clicked again was silently ignored.
    const composer = b.closest(".new-comment, .contact-panel, .answer-panel") ||
                     (b.dataset.commentSubmit ? b.parentElement : null);
    const field = composer && composer.querySelector("textarea, input[type='text']");
    if (field && !field.value.trim()) return;

    if (!claim(b, e)) return;
    hold(b);
  }, true);
})();

/* ---------- Compose affordance ----------
   The compose form now sits below the content it posts into, so the fold shows
   the community rather than an empty text box. This is the control that stands
   in its place: it scrolls the form into view and focuses its first field. */
(() => {
  "use strict";
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-jump-to]");
    if (!btn) return;
    const form = document.getElementById(btn.dataset.jumpTo);
    if (!form) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const field = form.querySelector("input, textarea, select");
    if (field) setTimeout(() => { try { field.focus({ preventScroll: true }); } catch (err) { /* no-op */ } }, reduce ? 0 : 260);
  });
})();

/* ---------- Masthead stats ----------
   Every masthead was a headline over a wide empty right column. These blocks
   fill it with something true: counts read from the page itself, so they stay
   correct after a write instead of drifting from the content they describe.

   Declared in markup, so each demo picks its own metrics:
     data-count="<sel>"                 how many match
     data-count="<sel>" data-unique="k" how many distinct el.dataset[k] values
     data-sum="<sel>"                   sum of the matched elements' numbers

   Seeded with the real values in the HTML, so a reader without JS still sees
   the truth rather than a dash. */
(() => {
  "use strict";
  const slots = [...document.querySelectorAll(".pl-stats [data-count], .pl-stats [data-sum]")];
  if (!slots.length) return;

  function value(el) {
    const sum = el.dataset.sum;
    if (sum) {
      let t = 0;
      for (const n of document.querySelectorAll(sum)) t += parseInt(n.textContent, 10) || 0;
      return t;
    }
    const found = [...document.querySelectorAll(el.dataset.count)];
    if (!el.dataset.unique) return found.length;
    return new Set(found.map((n) => n.dataset[el.dataset.unique]).filter(Boolean)).size;
  }

  function refresh() {
    for (const el of slots) el.textContent = String(value(el));
  }
  refresh();

  // Observe only the lists the app writes into. Watching an ancestor of the
  // stats block would re-fire on our own writes — that loop hung demo-07 hard
  // enough to stop the page rendering.
  const roots = new Set();
  for (const el of slots) {
    const m = /^#([\w-]+)/.exec(el.dataset.count || el.dataset.sum || "");
    if (m) roots.add(m[1]);
  }
  for (const id of roots) {
    const node = document.getElementById(id);
    if (node) {
      new MutationObserver(refresh)
        .observe(node, { subtree: true, childList: true, characterData: true });
    }
  }
})();

/* ---------- Hide a redundant compose affordance ----------
   Moving the form below the content leaves a button at the top that jumps to
   it. In a two-column layout that is wrong: demo-13 puts the form in a right
   sidebar where it is already on screen, and the button ended up 2000px down
   the page, offering to scroll up to something nobody lost. Decide from the
   rendered geometry rather than per demo. */
(() => {
  "use strict";
  const jumps = document.querySelectorAll(".compose-jump");
  if (!jumps.length) return;

  function settle() {
    for (const p of jumps) {
      const btn = p.querySelector("[data-jump-to]");
      const form = btn && document.getElementById(btn.dataset.jumpTo);
      if (!form) continue;
      const fr = form.getBoundingClientRect();
      const pr = p.getBoundingClientRect();
      // Redundant if the form is already on screen, or if the affordance sits
      // below the thing it points at.
      const onScreen = fr.top < window.innerHeight && fr.bottom > 0;
      const below = pr.top > fr.top;
      p.hidden = onScreen || below;
    }
  }
  settle();
  addEventListener("resize", settle);
})();
