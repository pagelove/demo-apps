(() => {
  "use strict";

  const PAGE = "/demo-02-show-and-tell/index.html";
  const MEMBERS = { alice: "Alice", ben: "Ben", carla: "Carla", dmitri: "Dmitri", elena: "Elena", farid: "Farid" };

  const identitySelect = document.getElementById("pl-identity");
  const grid = document.getElementById("pl-grid");
  const reactionsList = document.getElementById("pl-reactions");
  const newSubmissionForm = document.getElementById("pl-new-submission");
  const commentPanel = document.getElementById("pl-comment-panel");
  const commentLabel = document.getElementById("pl-comment-target-label");
  const commentText = document.getElementById("pl-comment-text");
  const commentSubmit = document.getElementById("pl-comment-submit");
  const commentCancel = document.getElementById("pl-comment-cancel");
  const toasts = document.getElementById("pl-toasts");

  let commentTarget = null;

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
  identitySelect.addEventListener("change", () => { store.set("pl-identity", identitySelect.value); recomputeReactions(); });

  function currentIdentity() { return identitySelect.value; }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function toast(message, isError) {
    const el = document.createElement("div");
    el.className = "toast" + (isError ? " error" : "");
    el.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 4000);
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
        if (/uniqueness/i.test(text)) message = "You've already reacted to this.";
      } catch (_) { /* ignore */ }
      throw new Error(message);
    }
    return res;
  }

  function slugify(text, prefix) {
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30);
    return `${prefix}-${base || "post"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  // --- reactions ---
  function recomputeReactions() {
    const counts = {};
    reactionsList.querySelectorAll("li[data-submission]").forEach((r) => {
      counts[r.dataset.submission] = (counts[r.dataset.submission] || 0) + 1;
    });
    const me = currentIdentity();
    grid.querySelectorAll(".card").forEach((card) => {
      const n = counts[card.id] || 0;
      const label = card.querySelector(`[data-count-for="${card.id}"]`);
      if (label) label.textContent = n;
      const btn = card.querySelector(`[data-react-for="${card.id}"]`);
      if (btn) btn.classList.toggle("is-reacted", !!reactionsList.querySelector(`meta[itemprop="reactionKey"][content="${CSS.escape(`${card.id}:${me}`)}"]`));
    });
  }

  grid.addEventListener("click", async (e) => {
    const reactBtn = e.target.closest("[data-react-for]");
    const commentBtn = e.target.closest("[data-comment-toggle]");

    if (reactBtn) {
      const submissionId = reactBtn.dataset.reactFor;
      const voter = currentIdentity();
      const key = `${submissionId}:${voter}`;
      if (reactionsList.querySelector(`meta[itemprop="reactionKey"][content="${CSS.escape(key)}"]`)) {
        toast("You've already reacted to this.", true);
        return;
      }
      const id = `reaction-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const fragment = `<li id="${id}" data-submission="${submissionId}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/ShowReaction">
  <meta itemprop="reactionKey" content="${escapeHtml(key)}">
  <meta itemprop="submissionId" content="${escapeHtml(submissionId)}">
  <meta itemprop="voter" content="${escapeHtml(voter)}">
</li>`;
      try {
        await writeFragment({ method: "POST", selector: "#pl-reactions", body: fragment });
        reactionsList.insertAdjacentHTML("beforeend", fragment);
        recomputeReactions();
        toast("Reaction added.");
      } catch (err) {
        toast(`Couldn't react: ${err.message}`, true);
      }
      return;
    }

    if (commentBtn) {
      const card = commentBtn.closest(".card");
      openCommentPanel(commentBtn.dataset.commentToggle, card.querySelector(".card-title").textContent);
    }
  });

  function openCommentPanel(commentsListId, title) {
    commentTarget = commentsListId;
    commentLabel.textContent = `Commenting on: ${title}`;
    commentPanel.hidden = false;
    commentText.value = "";
    commentText.focus();
  }

  commentCancel.addEventListener("click", () => { commentPanel.hidden = true; commentTarget = null; });

  commentSubmit.addEventListener("click", async () => {
    const body = commentText.value.trim();
    if (!body || !commentTarget) return;
    const author = currentIdentity();
    const submissionId = commentTarget.replace(/^comments-/, "");
    const id = `comment-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();
    const fragment = `<li class="comment" id="${id}" data-author="${author}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/ShowComment">
  <meta itemprop="submissionId" content="${escapeHtml(submissionId)}">
  <p class="comment-meta"><strong itemprop="author">${escapeHtml(MEMBERS[author])}</strong> <time itemprop="createdAt" datetime="${createdAt}"></time></p>
  <p class="comment-body" itemprop="body">${escapeHtml(body)}</p>
</li>`;
    try {
      await writeFragment({ method: "POST", selector: `#${commentTarget}`, body: fragment });
      document.getElementById(commentTarget).insertAdjacentHTML("beforeend", fragment);
      commentPanel.hidden = true;
      commentTarget = null;
      toast("Comment posted.");
    } catch (err) {
      toast(`Couldn't post comment: ${err.message}`, true);
    }
  });

  // --- new submission ---
  newSubmissionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("ns-title").value.trim();
    const emoji = document.getElementById("ns-emoji").value.trim() || "🛠️";
    const desc = document.getElementById("ns-desc").value.trim();
    const tagsRaw = document.getElementById("ns-tags").value.trim();
    if (!title || !desc) return;
    const author = currentIdentity();
    const id = slugify(title, "submission");
    const commentsId = `comments-${id}`;
    const createdAt = new Date().toISOString();
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const tagsHtml = tags.map((t) => `<li class="tag" itemprop="tags">${escapeHtml(t)}</li>`).join("");
    const fragment = `<li class="card" id="${id}" data-author="${author}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/ShowSubmission">
  <div class="card-thumb" aria-hidden="true">${escapeHtml(emoji)}</div>
  <div class="card-body">
    <h2 class="card-title" itemprop="title">${escapeHtml(title)}</h2>
    <p class="card-desc" itemprop="description">${escapeHtml(desc)}</p>
    <ul class="tags">${tagsHtml}</ul>
    <p class="card-meta">by <strong itemprop="author">${escapeHtml(MEMBERS[author])}</strong> <time itemprop="createdAt" datetime="${createdAt}"></time></p>
    <div class="card-foot">
      <span class="reaction-count" data-count-for="${id}">0</span>
      <button type="button" class="btn-react" data-react-for="${id}">👍 React</button>
      <button type="button" class="btn-ghost" data-comment-toggle="${commentsId}">💬 Comment</button>
    </div>
    <ul class="comments" id="${commentsId}" aria-label="Comments" data-submission="${id}"></ul>
  </div>
</li>`;
    try {
      await writeFragment({ method: "POST", selector: "#pl-grid", body: fragment });
      grid.insertAdjacentHTML("beforeend", fragment);
      newSubmissionForm.reset();
      document.getElementById("ns-emoji").value = "🛠️";
      toast("Project posted.");
    } catch (err) {
      toast(`Couldn't post: ${err.message}`, true);
    }
  });

  recomputeReactions();
})();
