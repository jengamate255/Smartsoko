/**
 * SmartSoko Social Service
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for all social shopping features:
 *  • Posts (text/photo + tagged products)
 *  • Likes & comments
 *  • Follows (user → user, user → seller)
 *  • Wishlists / shoppable collections
 *  • 24h stories (with auto-expiry)
 *  • Direct messages (1-to-1)
 *  • Social user profiles (extends users collection)
 *
 * Depends on Firebase v9 modular SDK loaded via config/firebase-config.js
 * which sets window.db, window.auth, window.storage.
 *
 * Exposes: window.SocialService
 */
(function () {
  const FS_BASE = 'https://www.gstatic.com/firebasejs/9.22.0/';
  const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  let _fs = null; // cached firestore module
  let _storage = null;
  let _readyResolve;
  const _ready = new Promise((res) => (_readyResolve = res));
  let _bootStarted = false;

  // ── Boot ──────────────────────────────────────────────────────
  async function boot() {
    if (_bootStarted) return _ready;
    _bootStarted = true;

    try {
      _fs = await import(FS_BASE + 'firebase-firestore.js');
      _storage = await import(FS_BASE + 'firebase-storage.js');
    } catch (e) {
      console.error('[SocialService] Failed to load Firebase modules', e);
    }

    const tryReady = () => {
      if (window.db && window.auth && _fs) {
        _readyResolve();
      } else {
        setTimeout(tryReady, 120);
      }
    };

    if (window.db && window.auth) {
      tryReady();
    } else {
      document.addEventListener('firebase-initialized', tryReady, { once: true });
      setTimeout(tryReady, 400);
    }
    return _ready;
  }

  function ensureReady() { return boot(); }

  // ── Auth helpers ──────────────────────────────────────────────
  function getUser() {
    if (window.currentUser) return window.currentUser;
    const u = window.auth && window.auth.currentUser;
    if (!u) return null;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'You'),
      photoURL: u.photoURL || null,
    };
  }

  function requireUser() {
    const u = getUser();
    if (!u) throw new Error('AUTH_REQUIRED');
    return u;
  }

  function profileSnapshot(u) {
    return {
      authorId: u.uid,
      authorName: u.displayName || u.email || 'You',
      authorAvatar: u.photoURL || null,
    };
  }

  // ── Image upload to Firebase Storage ──────────────────────────
  async function uploadImage(file, folder = 'social') {
    await ensureReady();
    if (!file) return null;
    if (!window.storage) throw new Error('STORAGE_NOT_READY');

    const { ref, uploadBytes, getDownloadURL } = _storage;
    const u = requireUser();
    const safeName = (file.name || 'img').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `${folder}/${u.uid}/${Date.now()}_${safeName}`;
    const r = ref(window.storage, path);
    await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
    return await getDownloadURL(r);
  }

  // ── Profile (social fields on users/{uid}) ────────────────────
  async function getProfile(uid) {
    await ensureReady();
    const { doc, getDoc } = _fs;
    if (!uid) return null;
    try {
      const snap = await getDoc(doc(window.db, 'users', uid));
      if (!snap.exists()) return { id: uid, displayName: 'SmartSoko User' };
      return { id: snap.id, ...snap.data() };
    } catch (e) {
      console.warn('[SocialService] getProfile failed', e);
      return null;
    }
  }

  async function updateMyProfile(patch) {
    await ensureReady();
    const u = requireUser();
    const { doc, setDoc, serverTimestamp } = _fs;
    const ref = doc(window.db, 'users', u.uid);
    const data = {
      ...patch,
      uid: u.uid,
      email: patch.email || u.email || null,
      displayName: patch.displayName || u.displayName || u.email || 'SmartSoko User',
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, data, { merge: true });
    return data;
  }

  async function ensureSocialProfile() {
    await ensureReady();
    const u = getUser();
    if (!u) return null;
    const { doc, getDoc, setDoc, serverTimestamp } = _fs;
    const ref = doc(window.db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists() || !snap.data().username) {
      const username = ('soko' + (u.uid || '').slice(0, 6)).toLowerCase();
      await setDoc(ref, {
        uid: u.uid,
        email: u.email || null,
        displayName: u.displayName || u.email || 'SmartSoko User',
        avatarUrl: u.photoURL || null,
        username,
        bio: '',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    return await getProfile(u.uid);
  }

  async function searchProfiles(qstr, max = 12) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    const term = String(qstr || '').toLowerCase().trim();
    if (!term) return [];
    try {
      const q1 = query(
        collection(window.db, 'users'),
        where('isPublic', '==', true),
        orderBy('displayName'),
        limit(max)
      );
      const snap = await getDocs(q1);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u =>
          (u.displayName || '').toLowerCase().includes(term)
          || (u.username || '').toLowerCase().includes(term)
        );
    } catch (e) {
      console.warn('[SocialService] searchProfiles fallback', e);
      const { collection: c2, getDocs: g2, limit: l2, query: q2 } = _fs;
      const snap = await g2(q2(c2(window.db, 'users'), l2(50)));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u =>
          (u.displayName || '').toLowerCase().includes(term)
          || (u.username || '').toLowerCase().includes(term)
        )
        .slice(0, max);
    }
  }

  // ── Posts ─────────────────────────────────────────────────────
  async function createPost({ text, imageUrls = [], taggedProducts = [], taggedSellers = [], category = '', visibility = 'public' }) {
    await ensureReady();
    const u = requireUser();
    await ensureSocialProfile();
    const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = _fs;
    const post = {
      ...profileSnapshot(u),
      text: String(text || '').slice(0, 1200),
      imageUrls: imageUrls.filter(Boolean).slice(0, 6),
      taggedProducts: (taggedProducts || []).slice(0, 8).map(p => ({
        id: p.id || p.productId || '',
        name: p.name || '',
        price: Number(p.price) || 0,
        imageUrl: p.imageUrl || p.image || null,
        sellerId: p.sellerId || null,
        sellerName: p.sellerName || null,
      })),
      taggedSellers: (taggedSellers || []).slice(0, 4).map(s => ({
        id: s.id || s.sellerId || '',
        name: s.name || s.sellerName || '',
      })),
      category: String(category || '').toLowerCase(),
      visibility: ['public', 'followers', 'private'].includes(visibility) ? visibility : 'public',
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(window.db, 'posts'), post);
    try {
      await updateDoc(doc(window.db, 'users', u.uid), {
        postCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (_) { /* user doc might not allow increment yet */ }
    return { id: ref.id, ...post };
  }

  async function deletePost(postId) {
    await ensureReady();
    const u = requireUser();
    const { doc, deleteDoc, getDoc, updateDoc, increment, serverTimestamp } = _fs;
    const ref = doc(window.db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().authorId !== u.uid) throw new Error('NOT_OWNER');
    await deleteDoc(ref);
    try {
      await updateDoc(doc(window.db, 'users', u.uid), {
        postCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}
  }

  async function getPost(postId) {
    await ensureReady();
    const { doc, getDoc } = _fs;
    const snap = await getDoc(doc(window.db, 'posts', postId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  async function listFeed({ category = '', max = 30, sinceId = null } = {}) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs, startAfter, doc, getDoc } = _fs;
    try {
      let constraints = [where('visibility', '==', 'public')];
      if (category) constraints.unshift(where('category', '==', String(category).toLowerCase()));
      constraints.push(orderBy('createdAt', 'desc'));
      if (sinceId) {
        const startSnap = await getDoc(doc(window.db, 'posts', sinceId));
        if (startSnap.exists()) constraints.push(startAfter(startSnap));
      }
      constraints.push(limit(max));
      const q = query(collection(window.db, 'posts'), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listFeed failed, returning empty', e);
      return [];
    }
  }

  async function listUserPosts(uid, max = 50) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'posts'),
        where('authorId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listUserPosts failed', e);
      return [];
    }
  }

  function subscribeFeed({ category = '', max = 30 } = {}, cb) {
    let unsub = () => {};
    ensureReady().then(() => {
      const { collection, query, where, orderBy, limit, onSnapshot } = _fs;
      try {
        const constraints = [where('visibility', '==', 'public')];
        if (category) constraints.unshift(where('category', '==', String(category).toLowerCase()));
        constraints.push(orderBy('createdAt', 'desc'), limit(max));
        const q = query(collection(window.db, 'posts'), ...constraints);
        unsub = onSnapshot(q,
          (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          (err) => console.warn('[SocialService] feed listener', err)
        );
      } catch (e) { console.warn(e); }
    });
    return () => unsub();
  }

  // ── Likes ─────────────────────────────────────────────────────
  function likeId(postId, uid) { return `${postId}_${uid}`; }

  async function hasLiked(postId) {
    await ensureReady();
    const u = getUser(); if (!u) return false;
    const { doc, getDoc } = _fs;
    try {
      const snap = await getDoc(doc(window.db, 'post_likes', likeId(postId, u.uid)));
      return snap.exists();
    } catch (_) { return false; }
  }

  async function toggleLike(postId) {
    await ensureReady();
    const u = requireUser();
    const { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } = _fs;
    const id = likeId(postId, u.uid);
    const likeRef = doc(window.db, 'post_likes', id);
    const postRef = doc(window.db, 'posts', postId);
    const exists = (await getDoc(likeRef)).exists();
    if (exists) {
      await deleteDoc(likeRef);
      try { await updateDoc(postRef, { likeCount: increment(-1), updatedAt: serverTimestamp() }); } catch (_) {}
      return false;
    } else {
      await setDoc(likeRef, {
        postId, userId: u.uid, createdAt: serverTimestamp(),
      });
      try { await updateDoc(postRef, { likeCount: increment(1), updatedAt: serverTimestamp() }); } catch (_) {}
      return true;
    }
  }

  async function batchHasLiked(postIds = []) {
    await ensureReady();
    const u = getUser(); if (!u) return {};
    const { doc, getDoc } = _fs;
    const out = {};
    await Promise.all(postIds.map(async (pid) => {
      try {
        const snap = await getDoc(doc(window.db, 'post_likes', likeId(pid, u.uid)));
        out[pid] = snap.exists();
      } catch (_) { out[pid] = false; }
    }));
    return out;
  }

  // ── Comments ──────────────────────────────────────────────────
  async function addComment(postId, text) {
    await ensureReady();
    const u = requireUser();
    await ensureSocialProfile();
    const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = _fs;
    const txt = String(text || '').trim().slice(0, 500);
    if (!txt) throw new Error('EMPTY_COMMENT');
    const c = {
      postId,
      text: txt,
      ...profileSnapshot(u),
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(window.db, 'post_comments'), c);
    try {
      await updateDoc(doc(window.db, 'posts', postId), {
        commentCount: increment(1), updatedAt: serverTimestamp(),
      });
    } catch (_) {}
    return { id: ref.id, ...c };
  }

  async function listComments(postId, max = 50) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'post_comments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listComments failed', e);
      return [];
    }
  }

  function subscribeComments(postId, cb) {
    let unsub = () => {};
    ensureReady().then(() => {
      const { collection, query, where, orderBy, onSnapshot } = _fs;
      try {
        const q = query(
          collection(window.db, 'post_comments'),
          where('postId', '==', postId),
          orderBy('createdAt', 'asc')
        );
        unsub = onSnapshot(q,
          (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          () => {}
        );
      } catch (e) { console.warn(e); }
    });
    return () => unsub();
  }

  // ── Follows ───────────────────────────────────────────────────
  function followId(followerId, followingId) { return `${followerId}_${followingId}`; }

  async function isFollowing(followingId) {
    await ensureReady();
    const u = getUser(); if (!u) return false;
    if (u.uid === followingId) return false;
    const { doc, getDoc } = _fs;
    try {
      const snap = await getDoc(doc(window.db, 'follows', followId(u.uid, followingId)));
      return snap.exists();
    } catch (_) { return false; }
  }

  async function toggleFollow(followingId, followingType = 'user', extra = {}) {
    await ensureReady();
    const u = requireUser();
    if (u.uid === followingId) throw new Error('CANNOT_FOLLOW_SELF');
    const { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } = _fs;
    const id = followId(u.uid, followingId);
    const ref = doc(window.db, 'follows', id);
    const exists = (await getDoc(ref)).exists();
    if (exists) {
      await deleteDoc(ref);
      try { await updateDoc(doc(window.db, 'users', u.uid), { followingCount: increment(-1) }); } catch (_) {}
      if (followingType === 'user') {
        try { await updateDoc(doc(window.db, 'users', followingId), { followerCount: increment(-1) }); } catch (_) {}
      } else if (followingType === 'seller') {
        try { await updateDoc(doc(window.db, 'sellers', followingId), { followerCount: increment(-1) }); } catch (_) {}
      }
      return false;
    } else {
      await setDoc(ref, {
        followerId: u.uid,
        followingId,
        followingType,
        followingName: extra.name || null,
        followingAvatar: extra.avatar || null,
        createdAt: serverTimestamp(),
      });
      try { await updateDoc(doc(window.db, 'users', u.uid), { followingCount: increment(1) }); } catch (_) {}
      if (followingType === 'user') {
        try { await updateDoc(doc(window.db, 'users', followingId), { followerCount: increment(1) }); } catch (_) {}
      } else if (followingType === 'seller') {
        try { await updateDoc(doc(window.db, 'sellers', followingId), { followerCount: increment(1) }); } catch (_) {}
      }
      return true;
    }
  }

  async function listFollowing(uid, max = 100) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'follows'),
        where('followerId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listFollowing failed', e);
      return [];
    }
  }

  async function listFollowers(uid, max = 100) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'follows'),
        where('followingId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listFollowers failed', e);
      return [];
    }
  }

  // ── Wishlists / shoppable collections ─────────────────────────
  async function createWishlist({ title, description = '', isPublic = true, coverImage = null }) {
    await ensureReady();
    const u = requireUser();
    await ensureSocialProfile();
    const { collection, addDoc, serverTimestamp } = _fs;
    const w = {
      ownerId: u.uid,
      ownerName: u.displayName || u.email || 'You',
      ownerAvatar: u.photoURL || null,
      title: String(title || 'My Collection').slice(0, 80),
      description: String(description || '').slice(0, 400),
      coverImage: coverImage || null,
      isPublic: !!isPublic,
      items: [],
      itemCount: 0,
      followerCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(window.db, 'wishlists'), w);
    return { id: ref.id, ...w };
  }

  async function addToWishlist(wishlistId, product) {
    await ensureReady();
    const u = requireUser();
    const { doc, getDoc, updateDoc, serverTimestamp } = _fs;
    const ref = doc(window.db, 'wishlists', wishlistId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('NOT_FOUND');
    const data = snap.data();
    if (data.ownerId !== u.uid) throw new Error('NOT_OWNER');
    const items = Array.isArray(data.items) ? data.items.slice() : [];
    const exists = items.find(x => x.id === (product.id || product.productId));
    if (!exists) {
      items.push({
        id: product.id || product.productId || `${product.sellerId}_${product.name}`,
        name: product.name || '',
        price: Number(product.price) || 0,
        imageUrl: product.imageUrl || product.image || null,
        sellerId: product.sellerId || null,
        sellerName: product.sellerName || null,
        addedAt: Date.now(),
      });
    }
    const coverImage = data.coverImage || (items[0] && items[0].imageUrl) || null;
    await updateDoc(ref, {
      items,
      itemCount: items.length,
      coverImage,
      updatedAt: serverTimestamp(),
    });
    return items;
  }

  async function removeFromWishlist(wishlistId, productId) {
    await ensureReady();
    const u = requireUser();
    const { doc, getDoc, updateDoc, serverTimestamp } = _fs;
    const ref = doc(window.db, 'wishlists', wishlistId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('NOT_FOUND');
    const data = snap.data();
    if (data.ownerId !== u.uid) throw new Error('NOT_OWNER');
    const items = (data.items || []).filter(x => x.id !== productId);
    await updateDoc(ref, {
      items,
      itemCount: items.length,
      updatedAt: serverTimestamp(),
    });
    return items;
  }

  async function deleteWishlist(wishlistId) {
    await ensureReady();
    const u = requireUser();
    const { doc, getDoc, deleteDoc } = _fs;
    const ref = doc(window.db, 'wishlists', wishlistId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('NOT_FOUND');
    if (snap.data().ownerId !== u.uid) throw new Error('NOT_OWNER');
    await deleteDoc(ref);
  }

  async function listMyWishlists(max = 30) {
    await ensureReady();
    const u = getUser(); if (!u) return [];
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'wishlists'),
        where('ownerId', '==', u.uid),
        orderBy('updatedAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listMyWishlists failed', e);
      return [];
    }
  }

  async function listUserWishlists(uid, max = 30) {
    await ensureReady();
    const me = getUser();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const constraints = [where('ownerId', '==', uid)];
      if (!me || me.uid !== uid) constraints.unshift(where('isPublic', '==', true));
      constraints.push(orderBy('updatedAt', 'desc'), limit(max));
      const q = query(collection(window.db, 'wishlists'), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listUserWishlists failed', e);
      return [];
    }
  }

  async function listPublicWishlists(max = 30) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'wishlists'),
        where('isPublic', '==', true),
        orderBy('followerCount', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listPublicWishlists fallback', e);
      try {
        const { collection: c2, query: q2, where: w2, limit: l2, getDocs: g2 } = _fs;
        const snap = await g2(q2(c2(window.db, 'wishlists'), w2('isPublic', '==', true), l2(max)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (_) { return []; }
    }
  }

  async function getWishlist(wishlistId) {
    await ensureReady();
    const { doc, getDoc } = _fs;
    const snap = await getDoc(doc(window.db, 'wishlists', wishlistId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  // ── 24h Stories ───────────────────────────────────────────────
  async function postStory({ imageUrl, text = '', productId = null, authorType = 'user' }) {
    await ensureReady();
    const u = requireUser();
    await ensureSocialProfile();
    const { collection, addDoc, serverTimestamp, Timestamp } = _fs;
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + STORY_TTL_MS));
    const s = {
      ...profileSnapshot(u),
      authorType,
      imageUrl: imageUrl || null,
      text: String(text || '').slice(0, 200),
      productId: productId || null,
      viewCount: 0,
      viewedBy: [],
      createdAt: serverTimestamp(),
      expiresAt,
    };
    const ref = await addDoc(collection(window.db, 'stories'), s);
    return { id: ref.id, ...s };
  }

  async function listActiveStories(max = 50) {
    await ensureReady();
    const { collection, query, where, orderBy, limit, getDocs, Timestamp } = _fs;
    try {
      const q = query(
        collection(window.db, 'stories'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listActiveStories failed', e);
      return [];
    }
  }

  async function markStoryViewed(storyId) {
    await ensureReady();
    const u = getUser(); if (!u) return;
    const { doc, getDoc, updateDoc, arrayUnion, increment } = _fs;
    try {
      const ref = doc(window.db, 'stories', storyId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      if (Array.isArray(data.viewedBy) && data.viewedBy.includes(u.uid)) return;
      await updateDoc(ref, {
        viewCount: increment(1),
        viewedBy: arrayUnion(u.uid),
      });
    } catch (_) {}
  }

  // ── Direct Messages ───────────────────────────────────────────
  function conversationId(uid1, uid2) {
    return [uid1, uid2].sort().join('__');
  }

  async function ensureConversation(otherUid, otherInfo = {}) {
    await ensureReady();
    const u = requireUser();
    if (u.uid === otherUid) throw new Error('CANNOT_DM_SELF');
    const { doc, getDoc, setDoc, serverTimestamp } = _fs;
    const id = conversationId(u.uid, otherUid);
    const ref = doc(window.db, 'conversations', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [u.uid, otherUid],
        participantInfo: {
          [u.uid]: {
            name: u.displayName || u.email || 'You',
            avatar: u.photoURL || null,
          },
          [otherUid]: {
            name: otherInfo.name || 'SmartSoko User',
            avatar: otherInfo.avatar || null,
          },
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unread: { [u.uid]: 0, [otherUid]: 0 },
        createdAt: serverTimestamp(),
      });
    }
    return id;
  }

  async function sendMessage(otherUid, text, attachments = [], otherInfo = {}) {
    await ensureReady();
    const u = requireUser();
    const { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc, setDoc, increment } = _fs;
    const cid = await ensureConversation(otherUid, otherInfo);
    const txt = String(text || '').trim().slice(0, 2000);
    if (!txt && !attachments.length) throw new Error('EMPTY_MESSAGE');

    const msg = {
      conversationId: cid,
      senderId: u.uid,
      senderName: u.displayName || u.email || 'You',
      text: txt,
      attachments: (attachments || []).map(a => ({
        type: a.type || 'product',
        id: a.id || null,
        name: a.name || '',
        price: Number(a.price) || 0,
        imageUrl: a.imageUrl || null,
        sellerId: a.sellerId || null,
        sellerName: a.sellerName || null,
      })),
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(window.db, 'messages'), msg);

    try {
      const convRef = doc(window.db, 'conversations', cid);
      const convSnap = await getDoc(convRef);
      const unread = (convSnap.exists() && convSnap.data().unread) || {};
      unread[otherUid] = (Number(unread[otherUid]) || 0) + 1;
      unread[u.uid] = 0;
      await updateDoc(convRef, {
        lastMessage: txt || '[Product]',
        lastMessageAt: serverTimestamp(),
        unread,
      });
    } catch (e) { console.warn('[SocialService] update conv failed', e); }

    return { id: ref.id, ...msg };
  }

  async function listConversations(max = 50) {
    await ensureReady();
    const u = getUser(); if (!u) return [];
    const { collection, query, where, orderBy, limit, getDocs } = _fs;
    try {
      const q = query(
        collection(window.db, 'conversations'),
        where('participants', 'array-contains', u.uid),
        orderBy('lastMessageAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[SocialService] listConversations failed', e);
      return [];
    }
  }

  function subscribeConversations(cb) {
    let unsub = () => {};
    ensureReady().then(() => {
      const u = getUser(); if (!u) return;
      const { collection, query, where, orderBy, onSnapshot } = _fs;
      try {
        const q = query(
          collection(window.db, 'conversations'),
          where('participants', 'array-contains', u.uid),
          orderBy('lastMessageAt', 'desc')
        );
        unsub = onSnapshot(q,
          (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          (err) => console.warn('[SocialService] conv listener', err)
        );
      } catch (e) { console.warn(e); }
    });
    return () => unsub();
  }

  function subscribeMessages(cid, cb) {
    let unsub = () => {};
    ensureReady().then(() => {
      const { collection, query, where, orderBy, onSnapshot } = _fs;
      try {
        const q = query(
          collection(window.db, 'messages'),
          where('conversationId', '==', cid),
          orderBy('createdAt', 'asc')
        );
        unsub = onSnapshot(q,
          (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          (err) => console.warn('[SocialService] msg listener', err)
        );
      } catch (e) { console.warn(e); }
    });
    return () => unsub();
  }

  async function markRead(cid) {
    await ensureReady();
    const u = getUser(); if (!u) return;
    const { doc, getDoc, updateDoc } = _fs;
    try {
      const ref = doc(window.db, 'conversations', cid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const unread = snap.data().unread || {};
      if ((unread[u.uid] || 0) === 0) return;
      unread[u.uid] = 0;
      await updateDoc(ref, { unread });
    } catch (_) {}
  }

  // ── Utilities ─────────────────────────────────────────────────
  function formatRelative(ts) {
    if (!ts) return '';
    const ms = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
    const diff = Date.now() - ms;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm';
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h';
    if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + 'd';
    const d = new Date(ms);
    return d.toLocaleDateString();
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function toast(msg, kind = 'info') {
    if (window.SokoToast && SokoToast.show) return SokoToast.show(msg, kind);
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:999px;
      font:600 13px 'Plus Jakarta Sans',sans-serif;z-index:9999;
      box-shadow:0 10px 30px rgba(0,0,0,0.3)`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // ── Public API ────────────────────────────────────────────────
  boot();
  const API = {
    ready: ensureReady,
    getUser, requireUser,
    uploadImage,

    // Profiles
    getProfile, updateMyProfile, ensureSocialProfile, searchProfiles,

    // Posts
    createPost, deletePost, getPost, listFeed, listUserPosts, subscribeFeed,

    // Likes
    hasLiked, toggleLike, batchHasLiked,

    // Comments
    addComment, listComments, subscribeComments,

    // Follows
    isFollowing, toggleFollow, listFollowing, listFollowers,

    // Wishlists
    createWishlist, addToWishlist, removeFromWishlist, deleteWishlist,
    listMyWishlists, listUserWishlists, listPublicWishlists, getWishlist,

    // Stories
    postStory, listActiveStories, markStoryViewed,

    // DMs
    conversationId, ensureConversation, sendMessage,
    listConversations, subscribeConversations, subscribeMessages, markRead,

    // Helpers
    formatRelative, escapeHtml, toast,
  };

  window.SocialService = API;
  document.dispatchEvent(new CustomEvent('social-service-ready', { detail: API }));
})();
