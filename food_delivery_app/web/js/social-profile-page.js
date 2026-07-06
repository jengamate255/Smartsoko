/**
 * SmartSoko Social Profile Page Logic
 * Drives social-profile.html
 */
(function () {
  const state = {
    me: null,
    profile: null,
    targetUid: null,
    isMe: false,
    isFollowing: false,
    activeTab: 'posts',
    editAvatarFile: null,
  };

  async function boot() {
    await SocialService.ready();
    state.me = SocialService.getUser();

    const params = new URLSearchParams(location.search);
    state.targetUid = params.get('uid') || state.me?.uid;
    if (!state.targetUid) {
      window.location.href = '/login?reason=social_profile';
      return;
    }

    state.isMe = state.me && state.me.uid === state.targetUid;
    state.profile = await SocialService.getProfile(state.targetUid);
    if (!state.profile) {
      document.getElementById('profileHead').innerHTML = `
        <div class="soc-empty">
          <span class="material-symbols-outlined">person_off</span>
          <h3>Profile not found</h3>
          <p>This user doesn't have a SmartSoko profile.</p>
          <a href="/social" class="soc-btn soc-btn-primary">Back to feed</a>
        </div>`;
      return;
    }

    if (state.me && !state.isMe) {
      state.isFollowing = await SocialService.isFollowing(state.targetUid);
    }

    renderHead();
    setupTabs();
    loadTab('posts');
  }

  function renderHead() {
    const p = state.profile;
    const initial = ((p.displayName || p.email || 'U')[0]).toUpperCase();
    const head = document.getElementById('profileHead');

    const actions = state.isMe
      ? `<button class="soc-btn soc-btn-outline" onclick="window.SocialProfilePage.openEdit()">
           <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit profile
         </button>`
      : `<button class="soc-btn ${state.isFollowing ? 'soc-btn-outline' : 'soc-btn-primary'}" id="followBtn" onclick="window.SocialProfilePage.toggleFollow()">
           <span class="material-symbols-outlined" style="font-size:16px;">${state.isFollowing ? 'check' : 'person_add'}</span>
           ${state.isFollowing ? 'Following' : 'Follow'}
         </button>
         <button class="soc-btn soc-btn-outline" onclick="window.SocialProfilePage.messageUser()">
           <span class="material-symbols-outlined" style="font-size:16px;">chat</span>
           Message
         </button>`;

    head.innerHTML = `
      <div class="soc-profile-cover">
        ${p.coverUrl ? `<img src="${esc(p.coverUrl)}" alt="">` : ''}
      </div>
      <div class="soc-profile-head">
        <div class="soc-profile-avatar-wrap">
          <div class="soc-profile-avatar">
            ${p.avatarUrl || p.photoURL ? `<img src="${esc(p.avatarUrl || p.photoURL)}" alt="">` : `<span>${initial}</span>`}
          </div>
          <div class="soc-profile-actions">${actions}</div>
        </div>
        <h2 class="soc-profile-name">${escHtml(p.displayName || 'SmartSoko User')}</h2>
        <p class="soc-profile-handle">@${escHtml(p.username || (p.uid || '').slice(0, 6))}</p>
        ${p.bio ? `<p class="soc-profile-bio">${escHtml(p.bio)}</p>` : ''}
        <div class="soc-profile-stats">
          <div class="stat">
            <b>${p.postCount || 0}</b>
            <span class="lbl">Posts</span>
          </div>
          <div class="stat" onclick="window.SocialProfilePage.switchTab('following')">
            <b>${p.followingCount || 0}</b>
            <span class="lbl">Following</span>
          </div>
          <div class="stat">
            <b>${p.followerCount || 0}</b>
            <span class="lbl">Followers</span>
          </div>
        </div>
      </div>
    `;
    document.getElementById('profileTabs').style.display = 'flex';
  }

  function setupTabs() {
    document.querySelectorAll('#profileTabs .soc-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#profileTabs .soc-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        state.activeTab = t.dataset.tab;
        loadTab(state.activeTab);
      });
    });
  }

  function switchTab(name) {
    const btn = document.querySelector(`#profileTabs .soc-tab[data-tab="${name}"]`);
    btn?.click();
  }

  async function loadTab(name) {
    const wrap = document.getElementById('tabContent');
    wrap.innerHTML = `<div class="soc-post"><div class="soc-skeleton" style="height:200px;"></div></div>`;

    if (name === 'posts') {
      const posts = await SocialService.listUserPosts(state.targetUid, 50);
      if (posts.length === 0) {
        wrap.innerHTML = `<div class="soc-empty">
          <span class="material-symbols-outlined">photo_camera</span>
          <h3>${state.isMe ? 'You have no posts yet' : 'No posts yet'}</h3>
          <p>${state.isMe ? 'Share what you\'re shopping for!' : 'Check back later.'}</p>
          ${state.isMe ? '<a href="/social" class="soc-btn soc-btn-primary">Create your first post</a>' : ''}
        </div>`;
        return;
      }
      wrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
        ${posts.map(p => {
          const cover = p.imageUrls?.[0];
          return `
          <a href="/social#post-${p.id}" style="aspect-ratio:1/1;background:var(--soc-surface-2);position:relative;overflow:hidden;display:block;text-decoration:none;">
            ${cover
              ? `<img src="${esc(cover)}" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--soko-grad);color:#fff;padding:8px;font-size:11px;font-weight:600;text-align:center;">${escHtml((p.text || '').slice(0, 60))}</div>`}
            ${(p.likeCount || p.commentCount) ? `
              <div style="position:absolute;bottom:0;left:0;right:0;padding:6px;background:linear-gradient(0deg,rgba(0,0,0,0.7),transparent);color:#fff;font-size:11px;font-weight:700;display:flex;gap:8px;">
                ${p.likeCount ? `<span><span class="material-symbols-outlined" style="font-size:12px;vertical-align:-2px;">favorite</span> ${p.likeCount}</span>` : ''}
                ${p.commentCount ? `<span><span class="material-symbols-outlined" style="font-size:12px;vertical-align:-2px;">mode_comment</span> ${p.commentCount}</span>` : ''}
              </div>` : ''}
            ${p.taggedProducts?.length ? `<div style="position:absolute;top:6px;right:6px;background:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;color:#064e3b;">shopping_bag</span></div>` : ''}
          </a>`;
        }).join('')}
      </div>`;
      return;
    }

    if (name === 'wishlists') {
      const wls = await SocialService.listUserWishlists(state.targetUid, 30);
      if (wls.length === 0) {
        wrap.innerHTML = `<div class="soc-empty">
          <span class="material-symbols-outlined">collections_bookmark</span>
          <h3>No collections yet</h3>
          ${state.isMe ? '<a href="/wishlists" class="soc-btn soc-btn-primary">Create a collection</a>' : ''}
        </div>`;
        return;
      }
      wrap.innerHTML = `<div class="soc-wl-grid">
        ${wls.map(w => `
          <a href="/wishlists?id=${encodeURIComponent(w.id)}" class="soc-wl-card">
            <div class="soc-wl-cover">
              ${w.coverImage ? `<img src="${esc(w.coverImage)}" alt="">` : `<span class="material-symbols-outlined" style="font-size:48px;">collections_bookmark</span>`}
              <span class="count"><span class="material-symbols-outlined" style="font-size:12px;">shopping_bag</span> ${w.itemCount || 0}</span>
            </div>
            <div class="soc-wl-card-body">
              <h3>${escHtml(w.title)}</h3>
              ${w.description ? `<p>${escHtml(w.description.slice(0, 60))}</p>` : ''}
              <div class="soc-wl-card-meta">
                ${w.isPublic ? '🌍 Public' : '🔒 Private'} · ${w.followerCount || 0} followers
              </div>
            </div>
          </a>
        `).join('')}
      </div>`;
      return;
    }

    if (name === 'following') {
      const list = await SocialService.listFollowing(state.targetUid, 100);
      if (list.length === 0) {
        wrap.innerHTML = `<div class="soc-empty">
          <span class="material-symbols-outlined">group</span>
          <h3>Not following anyone yet</h3>
        </div>`;
        return;
      }
      // Fetch profile data per following
      const detailed = await Promise.all(list.map(async f => {
        if (f.followingType === 'user') {
          const p = await SocialService.getProfile(f.followingId);
          return { ...f, _profile: p };
        }
        return f;
      }));
      wrap.innerHTML = `<div class="soc-suggest">
        ${detailed.map(f => {
          const name = f._profile?.displayName || f.followingName || 'SmartSoko User';
          const avatar = f._profile?.avatarUrl || f.followingAvatar;
          const initial = (name[0] || 'U').toUpperCase();
          const href = f.followingType === 'seller'
            ? `/store?sellerId=${encodeURIComponent(f.followingId)}`
            : `/social-profile?uid=${encodeURIComponent(f.followingId)}`;
          return `
            <a href="${href}" class="soc-suggest-row" style="text-decoration:none;color:inherit;">
              <div class="soc-avatar">
                ${avatar ? `<img src="${esc(avatar)}" alt="">` : `<span>${initial}</span>`}
              </div>
              <div class="info">
                <div class="name">${escHtml(name)}</div>
                <div class="sub">${f.followingType === 'seller' ? '🏪 Store' : '👤 Shopper'}</div>
              </div>
              <span class="material-symbols-outlined" style="color:var(--soc-text-dim);">chevron_right</span>
            </a>`;
        }).join('')}
      </div>`;
      return;
    }
  }

  // ── Follow ────────────────────────────────────────────────────
  async function toggleFollow() {
    if (!state.me) { window.location.href = '/login?reason=follow'; return; }
    const btn = document.getElementById('followBtn');
    btn.disabled = true;
    try {
      const now = await SocialService.toggleFollow(state.targetUid, 'user', {
        name: state.profile.displayName,
        avatar: state.profile.avatarUrl || state.profile.photoURL,
      });
      state.isFollowing = now;
      state.profile.followerCount = (state.profile.followerCount || 0) + (now ? 1 : -1);
      renderHead();
      SocialService.toast(now ? `Following ${state.profile.displayName}` : 'Unfollowed', 'success');
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to follow', 'error');
    }
  }

  function messageUser() {
    if (!state.me) { window.location.href = '/login?reason=dm'; return; }
    const p = state.profile;
    window.location.href = `/messages?to=${encodeURIComponent(state.targetUid)}&name=${encodeURIComponent(p.displayName || '')}&avatar=${encodeURIComponent(p.avatarUrl || p.photoURL || '')}`;
  }

  // ── Edit profile ──────────────────────────────────────────────
  function openEdit() {
    const p = state.profile;
    document.getElementById('editName').value = p.displayName || '';
    document.getElementById('editUsername').value = p.username || '';
    document.getElementById('editBio').value = p.bio || '';
    document.getElementById('editPublic').checked = p.isPublic !== false;
    const ea = document.getElementById('editAvatar');
    const init = ((p.displayName || 'U')[0]).toUpperCase();
    ea.innerHTML = p.avatarUrl || p.photoURL
      ? `<img src="${esc(p.avatarUrl || p.photoURL)}" alt="">`
      : `<span>${init}</span>`;
    state.editAvatarFile = null;
    document.getElementById('editModal').style.display = 'flex';
  }

  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    state.editAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('editAvatar').innerHTML = `<img src="${reader.result}" alt="">`;
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    const patch = {
      displayName: document.getElementById('editName').value.trim() || 'SmartSoko User',
      username: document.getElementById('editUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      bio: document.getElementById('editBio').value.trim(),
      isPublic: document.getElementById('editPublic').checked,
    };
    try {
      if (state.editAvatarFile) {
        const url = await SocialService.uploadImage(state.editAvatarFile, 'social/avatars').catch(() => null);
        if (url) { patch.avatarUrl = url; patch.photoURL = url; }
      }
      await SocialService.updateMyProfile(patch);
      state.profile = { ...state.profile, ...patch };
      renderHead();
      document.getElementById('editModal').style.display = 'none';
      SocialService.toast('Profile updated', 'success');
    } catch (e) {
      console.error(e);
      SocialService.toast('Failed to update', 'error');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function escHtml(s) { return SocialService.escapeHtml(s); }
  function esc(s) { return SocialService.escapeHtml(s); }

  window.SocialProfilePage = {
    switchTab, toggleFollow, messageUser,
    openEdit, handleAvatarFile, saveProfile,
  };
  ['saveProfile', 'handleAvatarFile'].forEach(n => { if (!window[n]) window[n] = window.SocialProfilePage[n]; });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
