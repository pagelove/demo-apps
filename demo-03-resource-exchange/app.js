(() => {
  "use strict";

  const PAGE = "/demo-03-resource-exchange/index.html";
  const MEMBERS = { alice: "Alice", ben: "Ben", carla: "Carla", dmitri: "Dmitri", elena: "Elena", farid: "Farid" };
  const TYPE_LABEL = { need: "Need", have: "Have" };

  const identitySelect = document.getElementById("pl-identity");
  const listingsGrid = document.getElementById("pl-listings");
  const newListingForm = document.getElementById("pl-new-listing");
  const filterTabs = document.querySelectorAll(".filter-tab");
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

  function slugify(text, prefix) {
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30);
    return `${prefix}-${base || "post"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  async function writeFragment({ method, selector, body }) {
    const res = await fetch(PAGE, {
      method,
      headers: body ? { "Content-Type": "text/html", "Range": `selector=${selector}` } : { "Range": `selector=${selector}` },
      body,
    });
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        if (/uniqueness/i.test(text)) message = "Someone already claimed this — you were a moment too late.";
        else if (/transition/i.test(text)) message = "That listing already changed state — someone beat you to it.";
      } catch (_) { /* ignore */ }
      throw new Error(message);
    }
    return res;
  }

  // --- render action buttons for a listing based on its LIVE stored
  // status, never a separately-tracked attribute (see #3's data-status
  // drift bug in BUILD-REFERENCE.md) ---
  function renderActions(listingEl) {
    const id = listingEl.id;
    const statusEl = document.getElementById(`status-${id}`);
    const status = statusEl.textContent.trim();
    const actions = listingEl.querySelector(".listing-actions");
    actions.innerHTML = "";

    if (status === "open") {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn"; btn.textContent = "Claim";
      btn.addEventListener("click", () => claim(id));
      actions.appendChild(btn);
    } else if (status === "claimed") {
      const complete = document.createElement("button");
      complete.type = "button"; complete.className = "btn"; complete.textContent = "Mark completed";
      complete.addEventListener("click", () => markCompleted(id));
      const release = document.createElement("button");
      release.type = "button"; release.className = "btn-ghost"; release.textContent = "Release claim";
      release.addEventListener("click", () => release_(id));
      actions.append(complete, release);
    }
  }

  async function transition(listingId, to) {
    const statusId = `status-${listingId}`;
    const fragment = `<span class="status-tag" id="${statusId}" data-status="${to}" itemprop="status">${to}</span>`;
    await writeFragment({ method: "PUT", selector: `#${statusId}`, body: fragment });
    // The fragment sent to the server carries data-status; the local element has
    // to be updated the same way or the two drift. The stamp colour is keyed off
    // the attribute, not the text, so setting textContent alone left a "claimed"
    // stamp still rendering in the green of "open" until the next reload.
    const localTag = document.getElementById(statusId);
    localTag.textContent = to;
    localTag.dataset.status = to;
    renderActions(document.getElementById(listingId));
  }

  // The real double-claimant guard: a Claim record keyed uniquely on
  // listingId. Two different claimants racing on the same listing both
  // set status to the same value "claimed" -- which the platform treats
  // as a no-op, not a rejected transition (verified) -- so the Claim
  // record's uniqueness is what actually rejects the second one.
  async function claim(listingId) {
    const claimant = currentIdentity();
    const claimId = `claim-${listingId}`;
    const claimedAt = new Date().toISOString();
    const fragment = `<li class="claim" id="${claimId}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/Claim">
  <meta itemprop="listingId" content="${listingId}">
  <meta itemprop="claimant" content="${claimant}">
  <meta itemprop="claimedAt" content="${claimedAt}">
</li>`;
    try {
      await writeFragment({ method: "POST", selector: "#pl-claims", body: fragment });
      await transition(listingId, "claimed");
      toast("Claimed.");
    } catch (err) {
      toast(`Couldn't claim: ${err.message}`, true);
      renderActions(document.getElementById(listingId));
    }
  }

  async function release_(listingId) {
    const claimId = `claim-${listingId}`;
    try {
      await writeFragment({ method: "DELETE", selector: `#${claimId}` });
      await transition(listingId, "open");
      toast("Claim released.");
    } catch (err) {
      toast(`Couldn't release: ${err.message}`, true);
      renderActions(document.getElementById(listingId));
    }
  }

  async function markCompleted(listingId) {
    try {
      await transition(listingId, "completed");
      toast("Marked completed.");
    } catch (err) {
      toast(`Couldn't update: ${err.message}`, true);
      renderActions(document.getElementById(listingId));
    }
  }

  // --- filters ---
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const filter = tab.dataset.filter;
      listingsGrid.querySelectorAll(".listing").forEach((l) => {
        l.hidden = filter !== "all" && l.dataset.type !== filter;
      });
    });
  });

  // --- new listing ---
  newListingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("nl-type").value;
    const title = document.getElementById("nl-title").value.trim();
    const desc = document.getElementById("nl-desc").value.trim();
    if (!title || !desc) return;
    const author = currentIdentity();
    const id = slugify(title, "listing");
    const statusId = `status-${id}`;
    const fragment = `<li class="listing" id="${id}" data-author="${author}" data-type="${type}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/Listing">
  <meta itemprop="listingId" content="${id}">
  <span class="listing-type" data-type="${type}" itemprop="listingType">${TYPE_LABEL[type]}</span>
  <h2 class="listing-title" itemprop="title">${escapeHtml(title)}</h2>
  <p class="listing-desc" itemprop="description">${escapeHtml(desc)}</p>
  <p class="listing-meta">by <strong itemprop="author">${escapeHtml(MEMBERS[author])}</strong> · <span class="status-tag" id="${statusId}" data-status="open" itemprop="status">open</span></p>
  <div class="listing-actions" data-listing="${id}"></div>
</li>`;
    try {
      await writeFragment({ method: "POST", selector: "#pl-listings", body: fragment });
      listingsGrid.insertAdjacentHTML("beforeend", fragment);
      const newEl = document.getElementById(id);
      renderActions(newEl);
      const activeFilter = document.querySelector(".filter-tab.is-active").dataset.filter;
      newEl.hidden = activeFilter !== "all" && type !== activeFilter;
      newListingForm.reset();
      toast("Listing posted.");
    } catch (err) {
      toast(`Couldn't post: ${err.message}`, true);
    }
  });

  document.querySelectorAll(".listing").forEach(renderActions);
})();
