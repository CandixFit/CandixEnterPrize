document.addEventListener("DOMContentLoaded", () => {
  console.log("Boot ok");

  /* ===== Voting ===== */
  const votes = document.querySelectorAll(".vote-container");
  votes.forEach(container => {
    const key = container.getAttribute("data-vote-key");
    const up = container.querySelector(".upvote");
    const down = container.querySelector(".downvote");
    const out = container.querySelector(".vote-count");
    if (!key || !up || !down || !out) return;

    let count = Number(localStorage.getItem(`votes:${key}`) || 0);
    out.textContent = count;

    const update = (delta) => {
      count += delta;
      out.textContent = count;
      localStorage.setItem(`votes:${key}`, String(count));
    };

    up.addEventListener("click", (e) => { e.preventDefault(); update(+1); });
    down.addEventListener("click", (e) => { e.preventDefault(); update(-1); });
  });

  /* ===== Comments Bottom-Sheet ===== */
  const sheet = document.getElementById("commentsSheet");
  const backdrop = document.getElementById("sheetBackdrop");
  const listEl = document.getElementById("commentsList");
  const formEl = document.getElementById("commentForm");
  const inputEl = document.getElementById("commentInput");
  const closeBtn = sheet?.querySelector(".sheet__close");

  let currentThread = null;

  const commentsDB = JSON.parse(localStorage.getItem("commentsDB") || "{}");
  const commentLikes = JSON.parse(localStorage.getItem("commentLikes") || "{}");
  const saveDB = () => localStorage.setItem("commentsDB", JSON.stringify(commentsDB));
  const saveLikes = () => localStorage.setItem("commentLikes", JSON.stringify(commentLikes));

  function renderComments(threadId) {
    listEl.innerHTML = "";
    const list = commentsDB[threadId] || [];
    if (!list.length) {
      const p = document.createElement("p");
      p.style.opacity = "0.8";
      p.textContent = "Noch keine Kommentare – sei der Erste!";
      listEl.appendChild(p);
      return;
    }
    for (const c of list) {
      const wrap = document.createElement("div");
      wrap.className = "comment";
      wrap.dataset.commentId = c.id;

      const meta = document.createElement("div");
      meta.className = "comment__meta";
      meta.textContent = `${c.user || "Gast"} • ${new Date(c.ts).toLocaleString()}`;

      const actions = document.createElement("div");
      actions.className = "comment__actions";

      const likeBtn = document.createElement("button");
      likeBtn.className = "like-btn";
      likeBtn.type = "button";
      likeBtn.textContent = "♥";
      if (commentLikes[c.id]) likeBtn.classList.add("liked");

      const likeCount = document.createElement("span");
      likeCount.className = "like-count";
      likeCount.textContent = String(c.likes || 0);

      const replyBtn = document.createElement("button");
      replyBtn.className = "reply-btn";
      replyBtn.type = "button";
      replyBtn.textContent = "Antworten";

      const text = document.createElement("div");
      text.className = "comment__text";
      text.textContent = c.text;

      actions.append(likeBtn, likeCount, replyBtn);
      wrap.append(meta, actions, text);
      listEl.appendChild(wrap);

      likeBtn.addEventListener("click", () => {
        if (!commentLikes[c.id]) {
          c.likes = (c.likes || 0) + 1;
          commentLikes[c.id] = true;
          likeBtn.classList.add("liked");
        } else {
          c.likes = Math.max(0, (c.likes || 0) - 1);
          delete commentLikes[c.id];
          likeBtn.classList.remove("liked");
        }
        likeCount.textContent = String(c.likes || 0);
        saveLikes(); saveDB();
      });

      replyBtn.addEventListener("click", () => {
        // alte Reply-Form entfernen
        wrap.querySelector(".reply-form")?.remove();
        const rf = document.createElement("form");
        rf.className = "reply-form";
        rf.innerHTML = `
          <input type="text" placeholder="Antwort schreiben…" maxlength="250" required>
          <button class="btn secondary" type="submit">Senden</button>
        `;
        wrap.appendChild(rf);
        const rfInput = rf.querySelector("input");
        rfInput.value = `@${(c.user || "Gast")}: `;
        rfInput.focus();

        rf.addEventListener("submit", (e) => {
          e.preventDefault();
          const val = rfInput.value.trim();
          if (!val) return;
          c.replies = Array.isArray(c.replies) ? c.replies : [];
          const reply = { id: crypto.randomUUID(), user: "Gast", text: val, ts: Date.now(), likes: 0 };
          c.replies.push(reply);
          saveDB();
          renderComments(threadId);
        });
      });

      // vorhandene Replies rendern
      if (Array.isArray(c.replies)) {
        for (const r of c.replies) {
          const rWrap = document.createElement("div");
          rWrap.className = "comment"; rWrap.style.marginLeft = "28px";
          const rMeta = document.createElement("div");
          rMeta.className = "comment__meta";
          rMeta.textContent = `${r.user || "Gast"} • ${new Date(r.ts).toLocaleString()}`;
          const rActions = document.createElement("div");
          rActions.className = "comment__actions";
          const rLike = document.createElement("button");
          rLike.className = "like-btn"; rLike.type = "button"; rLike.textContent = "♥";
          if (commentLikes[r.id]) rLike.classList.add("liked");
          const rCount = document.createElement("span");
          rCount.className = "like-count"; rCount.textContent = String(r.likes || 0);
          const rText = document.createElement("div");
          rText.className = "comment__text"; rText.textContent = r.text;
          rActions.append(rLike, rCount);
          rWrap.append(rMeta, rActions, rText);
          listEl.appendChild(rWrap);

          rLike.addEventListener("click", () => {
            if (!commentLikes[r.id]) {
              r.likes = (r.likes || 0) + 1;
              commentLikes[r.id] = true;
              rLike.classList.add("liked");
            } else {
              r.likes = Math.max(0, (r.likes || 0) - 1);
              delete commentLikes[r.id];
              rLike.classList.remove("liked");
            }
            rCount.textContent = String(r.likes || 0);
            saveLikes(); saveDB();
          });
        }
      }
    }
  }

  function openSheet(threadId) {
    document.body.classList.add("sheet-open");
    sheet.classList.add("is-open");
    backdrop.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    currentThread = threadId;
    renderComments(threadId);
    inputEl.value = "";
    setTimeout(() => inputEl.focus(), 50);
  }
  function closeSheet() {
    sheet.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("sheet-open");
    sheet.setAttribute("aria-hidden", "true");
    currentThread = null;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".comment-btn");
    if (btn) {
      e.preventDefault();
      const thread = btn.getAttribute("data-thread");
      if (thread) openSheet(thread);
    }
  });
  backdrop?.addEventListener("click", closeSheet);
  sheet?.querySelector(".sheet__close")?.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet.classList.contains("is-open")) closeSheet(); });

  formEl?.addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = inputEl.value.trim();
    if (!txt || !currentThread) return;
    const entry = { id: crypto.randomUUID(), user: "Gast", text: txt, ts: Date.now(), likes: 0, replies: [] };
    commentsDB[currentThread] = commentsDB[currentThread] || [];
    commentsDB[currentThread].unshift(entry);
    localStorage.setItem("commentsDB", JSON.stringify(commentsDB));
    inputEl.value = "";
    renderComments(currentThread);
  });
});
