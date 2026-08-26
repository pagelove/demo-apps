(() => {
  "use strict";

  const PAGE = "/demo-05-professional/index.html";
  const MEMBERS = { alice: "Alice", ben: "Ben", carla: "Carla", dmitri: "Dmitri", elena: "Elena", farid: "Farid" };

  const identitySelect = document.getElementById("pl-identity");
  const tabs = document.querySelectorAll(".tab");
  const membersGrid = document.getElementById("pl-members");
  const activityPanel = document.getElementById("pl-activity");
  const activityTitle = document.getElementById("pl-activity-title");
  const activityBody = document.getElementById("pl-activity-body");
  const topicsList = document.getElementById("pl-topics");
  const resourcesList = document.getElementById("pl-resources");
  const newTopicForm = document.getElementById("pl-new-topic");
  const newResourceForm = document.getElementById("pl-new-resource");
  const replyPanel = document.getElementById("pl-reply-panel");
  const replyLabel = document.getElementById("pl-reply-target-label");
  const replyText = document.getElementById("pl-reply-text");
  const replySubmit = document.getElementById("pl-reply-submit");
  const replyCancel = document.getElementById("pl-reply-cancel");
  const toasts = document.getElementById("pl-toasts");

  let replyTarget = null;

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

  async function writeFragment({ method, selector, body }) {
    const res = await fetch(PAGE, {
      method,
      headers: body ? { "Content-Type": "text/html", "Range": `selector=${selector}` } : { "Range": `selector=${selector}` },
      body,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  }

  function slugify(text, prefix) {
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30);
    return `${prefix}-${base || "post"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  // --- tabs ---
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.querySelectorAll(".tab-panel").forEach((p) => { p.hidden = true; });
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });

  // Progressive enhancement: the panels ship visible in the markup, so a reader
  // with scripting off gets every tab's content stacked rather than only the
  // first. Collapse to one-at-a-time now that the tab behaviour exists.
  (() => {
    const active = document.querySelector(".tab.is-active");
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.hidden = !active || p.id !== `panel-${active.dataset.tab}`;
    });
  })();

  // --- cross-collection member activity (mechanic showcase: substitutes
  // Liquid composition, which proved unreliable on this platform -- see
  // BUILD-REFERENCE.md -- with the verified-working client-JS pattern) ---
  // The cards carry role="button" and tabindex="0", so they have to answer to
  // Enter and Space the way a real button would.
  membersGrid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".member-card");
    if (!card) return;
    e.preventDefault();
    card.click();
  });

  membersGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".member-card");
    if (!card) return;
    membersGrid.querySelectorAll(".member-card").forEach((c) => c.classList.remove("is-selected"));
    card.classList.add("is-selected");
    const username = card.dataset.username;

    const topics = [...topicsList.querySelectorAll(".topic")].filter((t) => t.dataset.author === username);
    const resources = [...resourcesList.querySelectorAll(".resource")].filter((r) => r.dataset.author === username);

    activityTitle.textContent = `${MEMBERS[username]}'s activity`;
    let html = "";
    if (topics.length) {
      html += `<p><strong>Discussion posts</strong></p><ul>${topics.map((t) => `<li>${escapeHtml(t.querySelector(".topic-title").textContent)}</li>`).join("")}</ul>`;
    }
    if (resources.length) {
      html += `<p><strong>Shared resources</strong></p><ul>${resources.map((r) => `<li>${escapeHtml(r.querySelector(".resource-title").textContent)}</li>`).join("")}</ul>`;
    }
    if (!html) html = "<p>No discussion posts or shared resources yet.</p>";
    activityBody.innerHTML = html;
    activityPanel.hidden = false;
  });

  // --- topics + replies ---
  newTopicForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("nt-title").value.trim();
    const body = document.getElementById("nt-body").value.trim();
    if (!title || !body) return;
    const author = currentIdentity();
    const id = slugify(title, "topic");
    const repliesId = `replies-${id}`;
    const createdAt = new Date().toISOString();
    const fragment = `<li class="topic" id="${id}" data-author="${author}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/ProTopic">
  <h2 class="topic-title" itemprop="title">${escapeHtml(title)}</h2>
  <p itemprop="body">${escapeHtml(body)}</p>
  <p class="topic-meta">by <strong itemprop="author">${escapeHtml(MEMBERS[author])}</strong> <time itemprop="createdAt" datetime="${createdAt}"></time></p>
  <button type="button" class="btn-ghost" data-reply-toggle="${repliesId}">💬 Reply</button>
  <ul class="replies" id="${repliesId}" aria-label="Replies"></ul>
</li>`;
    try {
      await writeFragment({ method: "POST", selector: "#pl-topics", body: fragment });
      topicsList.insertAdjacentHTML("beforeend", fragment);
      newTopicForm.reset();
      toast("Topic posted.");
    } catch (err) {
      toast(`Couldn't post topic: ${err.message}`, true);
    }
  });

  topicsList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reply-toggle]");
    if (!btn) return;
    const title = btn.closest(".topic").querySelector(".topic-title").textContent;
    replyTarget = btn.dataset.replyToggle;
    replyLabel.textContent = `Replying to: ${title}`;
    replyPanel.hidden = false;
    replyText.value = "";
    replyText.focus();
  });

  replyCancel.addEventListener("click", () => { replyPanel.hidden = true; replyTarget = null; });

  replySubmit.addEventListener("click", async () => {
    const body = replyText.value.trim();
    if (!body || !replyTarget) return;
    const author = currentIdentity();
    const topicId = replyTarget.replace(/^replies-/, "");
    const id = `reply-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();
    const fragment = `<li class="reply" id="${id}" data-author="${author}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/ProReply">
  <meta itemprop="topicId" content="${escapeHtml(topicId)}">
  <p class="reply-meta"><strong itemprop="author">${escapeHtml(MEMBERS[author])}</strong> <time itemprop="createdAt" datetime="${createdAt}"></time></p>
  <p class="reply-body" itemprop="body">${escapeHtml(body)}</p>
</li>`;
    try {
      await writeFragment({ method: "POST", selector: `#${replyTarget}`, body: fragment });
      document.getElementById(replyTarget).insertAdjacentHTML("beforeend", fragment);
      replyPanel.hidden = true;
      replyTarget = null;
      toast("Reply posted.");
    } catch (err) {
      toast(`Couldn't post reply: ${err.message}`, true);
    }
  });

  // --- resources ---
  newResourceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("nr-title").value.trim();
    const url = document.getElementById("nr-url").value.trim();
    const desc = document.getElementById("nr-desc").value.trim();
    if (!title || !url || !desc) return;
    const author = currentIdentity();
    const id = slugify(title, "resource");
    const createdAt = new Date().toISOString();
    const fragment = `<li class="resource" id="${id}" data-author="${author}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/ProResource">
  <meta itemprop="title" content="${escapeHtml(title)}">
  <h2 class="resource-title"><a itemprop="url" href="${escapeHtml(url)}">${escapeHtml(title)}</a></h2>
  <p itemprop="description">${escapeHtml(desc)}</p>
  <p class="resource-meta">shared by <strong itemprop="submittedBy">${escapeHtml(MEMBERS[author])}</strong> <time itemprop="createdAt" datetime="${createdAt}"></time></p>
</li>`;
    try {
      await writeFragment({ method: "POST", selector: "#pl-resources", body: fragment });
      resourcesList.insertAdjacentHTML("beforeend", fragment);
      newResourceForm.reset();
      toast("Resource shared.");
    } catch (err) {
      toast(`Couldn't share: ${err.message}`, true);
    }
  });
})();
