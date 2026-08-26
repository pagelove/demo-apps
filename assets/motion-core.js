/* motion-core.js — shared entrance-motion guard for all demo pages.
   Deployed once to /assets/motion-core.js

   Why this exists: anime.js drives animation from requestAnimationFrame, which
   does not fire while document.hidden is true (background tab, restored
   session, non-compositing embed). If a stylesheet hides content and relies on
   the animation to reveal it, that content stays invisible — verified: anime
   commits the START value (opacity:0) and then stalls until the tab is shown.

   So this helper guarantees content becomes visible no matter what:
     1. If the page starts hidden, the hidden state is never applied at all;
        the entrance runs later, on first real view.
     2. A failsafe timer reveals everything if the animation never settles.
     3. Any throw inside the animation reveals everything immediately.
     4. The hiding class is dropped the moment the entrance settles. It has to
        be: these pages append new rows after load (a posted topic, a new
        comment), and those rows carry no inline opacity of their own. Leaving
        `.motion` on the root would hide every one of them.

   Usage from a demo's motion.js:
     PLMotion(".card, .hero-inner > *", (A, settled) => {
       A.animate(els, { opacity:[0,1], duration:800, onComplete: settled });
     });
*/
window.PLMotion = function (hideSelector, run) {
  "use strict";

  var A = window.anime;
  if (!A) return;                                                   // library missing → content visible
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // hard gate

  var root = document.documentElement;

  function revealNow() {
    root.classList.remove("motion");
    var els = document.querySelectorAll(hideSelector);
    for (var i = 0; i < els.length; i++) {
      els[i].style.opacity = "";
      els[i].style.transform = "";
    }
  }

  function begin() {
    root.classList.add("motion");
    var failsafe = setTimeout(revealNow, 2500);
    try {
      run(A, function settled() {
        clearTimeout(failsafe);
        // Drop the hiding class but keep the inline styles anime just wrote:
        // they hold the finished values, so nothing flickers on handoff.
        root.classList.remove("motion");
      });
    } catch (err) {
      clearTimeout(failsafe);
      revealNow();                                                  // never trap content behind a bug
    }
  }

  if (document.hidden) {
    // Do not hide what we cannot animate. Wait for the first real view.
    document.addEventListener("visibilitychange", function once() {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", once);
      begin();
    });
    return;
  }

  begin();
};
