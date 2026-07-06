/**
 * SmartSoko Messages Page Logic
 * Inbox + 1-to-1 thread view
 */
(function () {
  const state = {
    me: null,
    convs: [],
    activeOther: null,
    activeCid: null,
    unsubConvs: null,
    unsubMsgs: null,
  };

  async function boot() {
    await SocialService.ready();
    state.me = SocialService.getUser();
    if (!state.me) {
      window.location.href = '/login?reason=messages';
      return;
    }
    await SocialService.ensureSocialProfile().catch(() => {});

    const params = new URLSearchParams(location.search);
    const to = params.get('to');
    const name = params.get('name');
    const avatar = params.get('avatar');

    if (to && to !== state.me.uid) {
      await openThread(to, { name: name || 'User', avatar: avatar || null });
    } else {
      showInbox();
    }

    state.unsubConvs = SocialService.subscribeConversations((convs) => {
      state.convs = convs;
      renderInbox();
    });
  }

  function showInbox() {
    document.getElementById('inboxView').style.display = '';
    document.getElementById('threadView').style.display = 'none';
    document.getElementById('pageTitle').textContent = 'Messages';
    document.getElementById('backBtn').style.display = 'none';
    state.activeOther = null;
    state.activeCid = null;
    state.unsubMsgs?.();
    history.replaceState(null, '', '/messages');
  }

  function renderInbox() {
    const list = document.getElementById('convList');
    if (state.convs.length === 0) {
      list.innerHTML = `<div class="soc-empty">
        <span class="material-symbols-outlined">forum</span>
        <h3>No conversations yet</h3>
        <p>Start chatting with shoppers and sellers from the social feed.</p>
        <a href="/social" class="soc-btn soc-btn-primary">Browse social feed</a>
      </div>`;
      return;
    }
    list.innerHTML = state.convs.map(c => {
      const otherUid = (c.participants || []).find(p => p !== state.me.uid);
      const info = c.participantInfo?.[otherUid] || {};
      const initial = ((info.name || 'U')[0]).toUpperCase();
      const unread = c.unread?.[state.me.uid] || 0;
      return `
        <div class="soc-conv" onclick="window.MessagesPage.openConv('${otherUid}','${esc(info.name || '')}','${esc(info.avatar || '')}')">
          <div class="soc-avatar">
            ${info.avatar ? `<img src="${esc(info.avatar)}" alt="">` : `<span>${initial}</span>`}
          </div>
          <div class="info">
            <div class="name">${escHtml(info.name || 'User')} ${unread ? `<span style="background:#E63946;color:#fff;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800;">${unread > 9 ? '9+' : unread}</span>` : ''}</div>
            <div class="preview">${escHtml((c.lastMessage || '').slice(0, 60))}</div>
          </div>
          <div class="meta">${SocialService.formatRelative(c.lastMessageAt)}</div>
        </div>
      `;
    }).join('');
  }

  async function openConv(uid, name, avatar) {
    await openThread(uid, { name, avatar });
  }

  async function openThread(otherUid, info) {
    state.activeOther = { uid: otherUid, ...info };

    document.getElementById('inboxView').style.display = 'none';
    document.getElementById('threadView').style.display = '';
    document.getElementById('backBtn').style.display = 'inline-flex';
    document.getElementById('pageTitle').textContent = 'Chat';

    const ta = document.getElementById('threadAvatar');
    const initial = ((info.name || 'U')[0]).toUpperCase();
    ta.innerHTML = info.avatar ? `<img src="${esc(info.avatar)}" alt="">` : `<span>${initial}</span>`;
    document.getElementById('threadName').textContent = info.name || 'User';
    document.getElementById('threadName').href = `/social-profile?uid=${encodeURIComponent(otherUid)}`;

    state.activeCid = await SocialService.ensureConversation(otherUid, info);
    await SocialService.markRead(state.activeCid);

    state.unsubMsgs?.();
    state.unsubMsgs = SocialService.subscribeMessages(state.activeCid, (msgs) => {
      renderMessages(msgs);
      SocialService.markRead(state.activeCid);
    });

    document.getElementById('msgInput').focus();
    document.getElementById('backBtn').onclick = (e) => {
      e.preventDefault();
      showInbox();
    };
  }

  function renderMessages(msgs) {
    const body = document.getElementById('threadBody');
    if (msgs.length === 0) {
      body.innerHTML = `<div class="soc-empty"><span class="material-symbols-outlined">waving_hand</span><p>Say hi to ${escHtml(state.activeOther.name)}!</p></div>`;
      return;
    }
    body.innerHTML = msgs.map(m => {
      const mine = m.senderId === state.me.uid;
      const attach = (m.attachments || []).map(a => `
        <a href="${a.sellerId ? `/store?sellerId=${encodeURIComponent(a.sellerId)}` : '#'}" class="soc-bubble-product">
          ${a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="">` : `<div style="width:48px;height:48px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="color:#10b981;">shopping_bag</span></div>`}
          <div class="p-info">
            <h5>${escHtml(a.name)}</h5>
            <div class="pp">TZS ${Number(a.price || 0).toLocaleString()}</div>
          </div>
        </a>
      `).join('');
      return `
        <div class="soc-bubble ${mine ? 'mine' : 'theirs'}">
          ${m.text ? linkify(escHtml(m.text)) : ''}
          ${attach}
          <span class="soc-bubble-time">${SocialService.formatRelative(m.createdAt)}</span>
        </div>
      `;
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  async function send(e) {
    e.preventDefault();
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text || !state.activeOther) return;
    input.value = '';
    try {
      await SocialService.sendMessage(state.activeOther.uid, text, [], {
        name: state.activeOther.name,
        avatar: state.activeOther.avatar,
      });
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to send', 'error');
      input.value = text;
    }
  }

  // ── New conversation ──────────────────────────────────────────
  function openNew() {
    document.getElementById('newModal').style.display = 'flex';
    document.getElementById('userSearch').value = '';
    document.getElementById('userSearch').focus();
    document.getElementById('userResults').innerHTML = `<div class="soc-empty"><p>Type a name to search</p></div>`;
    document.getElementById('userSearch').oninput = debounce(async (e) => {
      const term = e.target.value.trim();
      if (term.length < 2) {
        document.getElementById('userResults').innerHTML = `<div class="soc-empty"><p>Keep typing...</p></div>`;
        return;
      }
      const users = await SocialService.searchProfiles(term, 12);
      const filtered = users.filter(u => u.id !== state.me.uid);
      if (filtered.length === 0) {
        document.getElementById('userResults').innerHTML = `<div class="soc-empty"><span class="material-symbols-outlined">person_search</span><p>No users found</p></div>`;
        return;
      }
      document.getElementById('userResults').innerHTML = filtered.map(u => {
        const initial = ((u.displayName || 'U')[0]).toUpperCase();
        return `
          <div class="soc-suggest-row" onclick="window.MessagesPage.startWith('${u.id}','${esc(u.displayName || '')}','${esc(u.avatarUrl || u.photoURL || '')}')">
            <div class="soc-avatar">
              ${u.avatarUrl || u.photoURL ? `<img src="${esc(u.avatarUrl || u.photoURL)}" alt="">` : `<span>${initial}</span>`}
            </div>
            <div class="info">
              <div class="name">${escHtml(u.displayName || 'User')}</div>
              <div class="sub">@${escHtml(u.username || u.id.slice(0, 6))}</div>
            </div>
            <span class="material-symbols-outlined" style="color:var(--soc-text-dim);">chat</span>
          </div>`;
      }).join('');
    }, 200);
  }

  async function startWith(uid, name, avatar) {
    document.getElementById('newModal').style.display = 'none';
    history.replaceState(null, '', `/messages?to=${encodeURIComponent(uid)}`);
    await openThread(uid, { name, avatar });
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function escHtml(s) { return SocialService.escapeHtml(s); }
  function esc(s) { return SocialService.escapeHtml(s); }
  function linkify(s) {
    return String(s).replace(/(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">$1</a>');
  }

  window.MessagesPage = { openConv, openNew, startWith, send };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
