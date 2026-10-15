type Viewer = {
  id: string;
  name: string;
  image: string | null;
  username: string | null;
  isAdmin: boolean;
};
type Comment = {
  id: string;
  parentId: string | null;
  bodyHtml: string;
  bodyMd?: string;
  createdAt: number;
  editedAt: number | null;
  deleted: boolean;
  author: { name: string; image: string | null; username: string | null };
  canEdit: boolean;
  canDelete: boolean;
};
type Payload = {
  viewer: Viewer | null;
  providers: ("github" | "twitter")[];
  comments: Comment[];
};

const PROVIDER_LABEL = { github: "GitHub", twitter: "X" } as const;
const ICON = {
  github:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  twitter:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.2h3.7l-8 9.2 9.4 12.4h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3Z"/></svg>',
};

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );

const fmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function mount(section: HTMLElement) {
  const slug = section.dataset.slug!;
  const root = section.querySelector<HTMLElement>(".comments-root")!;
  let state: Payload | null = null;
  let replyTo: string | null = null;
  let editing: string | null = null;

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(data.error ?? `Request failed (${res.status})`);
    return data;
  }

  async function load() {
    try {
      state = await api(`/api/comments?slug=${encodeURIComponent(slug)}`);
      render();
    } catch {
      root.innerHTML = `<p class="comments-muted">Comments are unavailable right now.</p>`;
    }
  }

  function avatar(a: { name: string; image: string | null }) {
    return a.image
      ? `<img class="c-avatar" src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="c-avatar" aria-hidden="true"></span>`;
  }

  function handle(username: string | null) {
    if (!username) return "";
    const [provider, name] = username.split(":");
    const href =
      provider === "github"
        ? `https://github.com/${name}`
        : `https://x.com/${name}`;
    return `<a class="c-meta" href="${esc(href)}" rel="nofollow noopener" target="_blank">@${esc(name)}</a>`;
  }

  function form(id: string, value = "", submitLabel = "Post comment") {
    return `<form class="c-form" data-form="${id}">
      <label class="sr-only" for="c-${id}">Your comment</label>
      <textarea id="c-${id}" name="body" maxlength="5000" required placeholder="Add to the conversation… (**bold**, *italic*, \`code\`, links)">${esc(value)}</textarea>
      <div class="c-form-row">
        <span class="c-error" role="alert"></span>
        <span style="display:flex;gap:.5rem">
          ${id !== "new" ? `<button type="button" class="c-btn" data-cancel>Cancel</button>` : ""}
          <button type="submit" class="c-btn" data-primary>${submitLabel}</button>
        </span>
      </div>
    </form>`;
  }

  function item(c: Comment, replies: Comment[] = []): string {
    const body = c.deleted
      ? `<p class="comments-muted">This comment was deleted.</p>`
      : editing === c.id
        ? form(`edit-${c.id}`, c.bodyMd ?? "", "Save")
        : `<div class="c-body">${c.bodyHtml}</div>`;
    const actions =
      c.deleted || editing === c.id
        ? ""
        : `<div class="c-actions">
            ${state?.viewer && !c.parentId ? `<button class="c-link" data-reply="${c.id}">Reply</button>` : ""}
            ${c.canEdit ? `<button class="c-link" data-edit="${c.id}">Edit</button>` : ""}
            ${c.canDelete ? `<button class="c-link" data-delete="${c.id}">Delete</button>` : ""}
          </div>`;
    return `<article class="c-item" id="comment-${c.id}">
      ${avatar(c.author)}
      <div>
        <header class="c-head">
          <span class="c-name">${esc(c.author.name)}</span>
          ${handle(c.author.username)}
          <a class="c-meta" href="#comment-${c.id}"><time datetime="${new Date(c.createdAt).toISOString()}">${fmt.format(c.createdAt)}</time></a>
          ${c.editedAt ? `<span class="c-meta">(edited)</span>` : ""}
        </header>
        ${body}
        ${actions}
        ${
          replies.length || replyTo === c.id
            ? `<div class="c-replies">${replies.map(r => item(r)).join("")}${replyTo === c.id ? form(`reply-${c.id}`, "", "Reply") : ""}</div>`
            : ""
        }
      </div>
    </article>`;
  }

  function render() {
    if (!state) return;
    const { viewer, providers, comments } = state;
    const roots = comments.filter(c => !c.parentId);
    const repliesOf = (id: string) => comments.filter(c => c.parentId === id);
    const callbackURL = `${location.pathname}#comments`;

    const top = viewer
      ? `<div class="c-form-row" style="margin-bottom:.6rem">
           <span class="c-viewer">${avatar(viewer)} Signed in as <strong>${esc(viewer.name)}</strong></span>
           <button class="c-link" data-signout>Sign out</button>
         </div>${form("new")}`
      : providers.length
        ? `<div class="comments-signin"><span>Sign in to join the conversation:</span>
             ${providers
               .map(
                 p =>
                   `<button class="c-btn" data-signin="${p}" data-callback="${esc(callbackURL)}">${ICON[p]} ${PROVIDER_LABEL[p]}</button>`
               )
               .join("")}
           </div>`
        : `<p class="comments-muted">Sign-in isn't configured yet.</p>`;

    root.innerHTML = `${top}
      <div class="c-list">
        ${roots.length ? roots.map(c => item(c, repliesOf(c.id))).join("") : `<p class="comments-muted">No comments yet.</p>`}
      </div>`;
  }

  root.addEventListener("click", async e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!t) return;
    if (t.dataset.signin) {
      t.setAttribute("disabled", "");
      try {
        const { url } = await api("/api/auth/sign-in/social", {
          method: "POST",
          body: JSON.stringify({
            provider: t.dataset.signin,
            callbackURL: t.dataset.callback,
          }),
        });
        location.href = url;
      } catch {
        t.removeAttribute("disabled");
      }
    } else if ("signout" in t.dataset) {
      await api("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(
        () => {}
      );
      await load();
    } else if (t.dataset.reply) {
      replyTo = t.dataset.reply;
      editing = null;
      render();
      root.querySelector<HTMLTextAreaElement>(`#c-reply-${replyTo}`)?.focus();
    } else if (t.dataset.edit) {
      editing = t.dataset.edit;
      replyTo = null;
      render();
      root.querySelector<HTMLTextAreaElement>(`#c-edit-${editing}`)?.focus();
    } else if (t.dataset.delete) {
      if (!confirm("Delete this comment?")) return;
      await api(`/api/comments/${t.dataset.delete}`, {
        method: "DELETE",
      }).catch(err => alert(err.message));
      await load();
    } else if ("cancel" in t.dataset) {
      replyTo = editing = null;
      render();
    }
  });

  root.addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const id = f.dataset.form!;
    const body = (f.elements.namedItem("body") as HTMLTextAreaElement).value;
    const btn = f.querySelector<HTMLButtonElement>("[type=submit]")!;
    const err = f.querySelector<HTMLElement>(".c-error")!;
    btn.disabled = true;
    err.textContent = "";
    try {
      if (id.startsWith("edit-")) {
        await api(`/api/comments/${id.slice(5)}`, {
          method: "PATCH",
          body: JSON.stringify({ body }),
        });
      } else {
        await api("/api/comments", {
          method: "POST",
          body: JSON.stringify({
            slug,
            body,
            parentId: id.startsWith("reply-") ? id.slice(6) : null,
          }),
        });
      }
      replyTo = editing = null;
      await load();
    } catch (error) {
      err.textContent = (error as Error).message;
      btn.disabled = false;
    }
  });

  load();
}
