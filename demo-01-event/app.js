(() => {
  "use strict";

  const PAGE = "/demo-01-event/index.html";
  const MEMBERS = { alice: "Alice", ben: "Ben", carla: "Carla", dmitri: "Dmitri", elena: "Elena", farid: "Farid" };
  const CAPACITY = Number(document.querySelector('meta[itemprop="capacity"]').getAttribute("content"));

  const identitySelect = document.getElementById("pl-identity");
  const rsvpsList = document.getElementById("pl-rsvps");
  const attendeesList = document.getElementById("pl-attendees");
  const capacityLabel = document.getElementById("capacity-label");
  const rsvpBtn = document.getElementById("pl-rsvp");
  const cancelBtn = document.getElementById("pl-cancel-rsvp");
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
  identitySelect.addEventListener("change", () => { store.set("pl-identity", identitySelect.value); render(); });

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
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        if (/uniqueness/i.test(text)) message = "You've already RSVPed to this event.";
      } catch (_) { /* ignore */ }
      throw new Error(message);
    }
    return res;
  }

  function rsvps() {
    return [...rsvpsList.querySelectorAll("li[id^='rsvp-']")].map((li) => ({
      el: li,
      attendee: li.querySelector('meta[itemprop="attendee"]').content,
      status: li.querySelector('meta[itemprop="rsvpStatus"]').content,
    }));
  }

  function render() {
    const all = rsvps();
    const going = all.filter((r) => r.status === "going");
    const waitlist = all.filter((r) => r.status === "waitlist");
    const me = currentIdentity();
    const mine = all.find((r) => r.attendee === me);

    capacityLabel.textContent = `${going.length} / ${CAPACITY} spots filled${waitlist.length ? ` · ${waitlist.length} on waitlist` : ""}`;

    attendeesList.innerHTML = "";
    going.forEach((r) => {
      const li = document.createElement("li");
      li.className = "attendee-chip";
      li.id = `attendee-${r.attendee}`;
      li.textContent = MEMBERS[r.attendee];
      attendeesList.appendChild(li);
    });
    waitlist.forEach((r) => {
      const li = document.createElement("li");
      li.className = "attendee-chip is-waitlist";
      li.id = `attendee-${r.attendee}`;
      li.textContent = `${MEMBERS[r.attendee]} (waitlist)`;
      attendeesList.appendChild(li);
    });

    if (mine) {
      rsvpBtn.hidden = true;
      cancelBtn.hidden = false;
      cancelBtn.textContent = mine.status === "waitlist" ? "Leave waitlist" : "Cancel RSVP";
    } else {
      rsvpBtn.hidden = false;
      cancelBtn.hidden = true;
      rsvpBtn.textContent = going.length >= CAPACITY ? "Join waitlist" : "RSVP";
    }
  }

  rsvpBtn.addEventListener("click", async () => {
    const attendee = currentIdentity();
    const going = rsvps().filter((r) => r.status === "going").length;
    // Capacity check is client-computed, not server-enforced -- a
    // Trigger can't see the existing RSVP count to compare against
    // capacity server-side. See schema/event.html and BUILD-REFERENCE.md.
    const status = going >= CAPACITY ? "waitlist" : "going";
    const id = `rsvp-${attendee}`;
    const key = `event-fall-meetup:${attendee}`;
    const fragment = `<li id="${id}" itemscope itemtype="https://__PAGELOVE_HOST__/vocab/RSVP">
  <meta itemprop="rsvpKey" content="${escapeHtml(key)}">
  <meta itemprop="rsvpEventId" content="event-fall-meetup">
  <meta itemprop="attendee" content="${escapeHtml(attendee)}">
  <meta itemprop="rsvpStatus" content="${status}">
</li>`;
    try {
      await writeFragment({ method: "POST", selector: "#pl-rsvps", body: fragment });
      rsvpsList.insertAdjacentHTML("beforeend", fragment);
      render();
      toast(status === "waitlist" ? "Event is full — added to the waitlist." : "RSVPed, see you there.");
    } catch (err) {
      toast(`Couldn't RSVP: ${err.message}`, true);
    }
  });

  cancelBtn.addEventListener("click", async () => {
    const attendee = currentIdentity();
    const id = `rsvp-${attendee}`;
    const mine = rsvps().find((r) => r.attendee === attendee);
    const wasGoing = mine && mine.status === "going";
    try {
      await writeFragment({ method: "DELETE", selector: `#${id}` });
      document.getElementById(id).remove();
      // Automation substitute (Processor proved unreliable for this --
      // see BUILD-REFERENCE.md): promote the oldest waitlisted RSVP to
      // going, client-side, when a going RSVP is cancelled.
      if (wasGoing) {
        const waitlisted = rsvps().filter((r) => r.status === "waitlist");
        if (waitlisted.length) {
          const promote = waitlisted[0];
          // Compound descendant selector off the RSVP's own stable id --
          // no synthetic id needed, works against what's actually stored.
          const selector = `#${promote.el.id} meta[itemprop='rsvpStatus']`;
          try {
            await writeFragment({ method: "PUT", selector, body: `<meta itemprop="rsvpStatus" content="going">` });
            promote.el.querySelector('meta[itemprop="rsvpStatus"]').setAttribute("content", "going");
            toast(`Promoted ${MEMBERS[promote.attendee]} from the waitlist.`);
          } catch (err) {
            toast(`Couldn't auto-promote from waitlist: ${err.message}`, true);
          }
        }
      }
      render();
      toast("RSVP cancelled.");
    } catch (err) {
      toast(`Couldn't cancel: ${err.message}`, true);
    }
  });

  render();
})();
