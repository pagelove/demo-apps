(() => {
  "use strict";

  const FEED_PAGE = "/demo-04-accountability/feed.html";
  const MEMBERS = { alice: "Alice", ben: "Ben", carla: "Carla", dmitri: "Dmitri", elena: "Elena", farid: "Farid" };
  const PROGRESS_LABEL = { ahead: "Ahead of plan", "on-track": "On track", behind: "Behind, but showed up" };

  const identitySelect = document.getElementById("pl-identity");
  const form = document.getElementById("pl-checkin-form");
  const resultBox = document.getElementById("pl-result");
  const peekBtn = document.getElementById("pl-peek");
  const toasts = document.getElementById("pl-toasts");

  // Storage can throw outright -- Safari private mode, disabled storage, some
  // embedded webviews. It is read in the first few lines of this file, so an
  // uncaught throw here would take every listener below it down with it and
  // leave the page rendered but completely inert. Identity is a convenience,
  // never a requirement.
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* not fatal */ } },
  };

  const savedIdentity = store.get("pl-identity");
  if (savedIdentity && MEMBERS[savedIdentity]) identitySelect.value = savedIdentity;
  identitySelect.addEventListener("change", () => store.set("pl-identity", identitySelect.value));

  function currentIdentity() { return identitySelect.value; }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function toast(message, isError) {
    const el = document.createElement("div");
    el.className = "toast" + (isError ? " error" : "");
    el.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const author = currentIdentity();
    const progress = document.getElementById("ci-progress").value;
    const note = document.getElementById("ci-note").value.trim();
    const date = todayIso();
    const checkInKey = `${date}:${author}`;
    const createdAt = new Date().toISOString();
    const id = `checkin-${author}-${date}`;
    const fragment = `<li class="checkin" id="${id}" data-author="${author}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/CheckIn">
  <meta itemprop="checkInKey" content="${escapeHtml(checkInKey)}">
  <meta itemprop="author" content="${escapeHtml(author)}">
  <meta itemprop="date" content="${date}">
  <meta itemprop="goalProgress" content="${progress}">
  <meta itemprop="note" content="${escapeHtml(note)}">
  <meta itemprop="createdAt" content="${createdAt}">
</li>`;
    try {
      const res = await fetch(FEED_PAGE, {
        method: "POST",
        headers: { "Content-Type": "text/html", "Range": "selector=#pl-checkins" },
        body: fragment,
      });
      if (!res.ok) {
        if (res.status === 422) {
          const text = await res.text();
          if (/uniqueness/i.test(text)) throw new Error(`You've already checked in today as ${MEMBERS[author]}.`);
        }
        throw new Error(`${res.status} ${res.statusText}`);
      }
      resultBox.hidden = false;
      resultBox.innerHTML = `<p><strong>Checked in for ${date}</strong> — ${escapeHtml(PROGRESS_LABEL[progress])}</p>${note ? `<p>${escapeHtml(note)}</p>` : ""}<p class="result-note">Stored on the members-only feed — you (and any other signed-in member) could read it back there; anonymous visitors can't.</p>`;
      toast("Checked in.");
    } catch (err) {
      toast(`Couldn't check in: ${err.message}`, true);
    }
  });

  peekBtn.addEventListener("click", async () => {
    // Same class as the join.js defect: an unhandled rejection here left the
    // gate-probe button looking dead, with nothing to say the request never
    // reached the server.
    let res;
    try {
      res = await fetch(FEED_PAGE, { cache: "no-store" });
    } catch (err) {
      toast(`Couldn't reach the server to test the gate: ${err.message}`, true);
      return;
    }
    if (res.status === 401) {
      toast("Denied as expected: 401 Unauthorized — the feed really is members-only.");
    } else if (res.ok) {
      toast("Unexpected: anonymous read succeeded — this should not happen.", true);
    } else {
      toast(`Got ${res.status} instead of the expected 401 — worth a look.`, true);
    }
  });
})();
