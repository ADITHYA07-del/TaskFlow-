/**
 * TaskFlow authentication — role is always fetched from the server, never cached.
 */
(function (global) {
  const USER_ID_KEY = 'taskflow_user_id';
  const ADMIN_ROLES = new Set(['manager', 'admin']);
  const MEMBER_ROLES = new Set(['employee']);
  let activeZone = null;

  function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
  }

  function isAdminRole(role) {
    return ADMIN_ROLES.has(normalizeRole(role));
  }

  function isMemberRole(role) {
    return MEMBER_ROLES.has(normalizeRole(role));
  }

  function getHomeForRole(role) {
    return isAdminRole(role) ? '/admin/dashboard' : '/member/tasks';
  }

  function getRouteZone(pathname) {
    const path = String(pathname || '').toLowerCase();
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/member')) return 'member';
    return 'public';
  }

  function redirect(url) {
    window.location.replace(url);
  }

  function clearAuth() {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem('taskflow_user');
    sessionStorage.removeItem('taskflow_user');
    localStorage.removeItem('edit_task_id');
  }

  function sanitizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const { password, ...safe } = user;
    return safe;
  }

  function getStoredUserId() {
    const legacyRaw = localStorage.getItem('taskflow_user') || sessionStorage.getItem('taskflow_user');
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.id) {
          localStorage.setItem(USER_ID_KEY, String(legacy.id));
          localStorage.removeItem('taskflow_user');
          sessionStorage.removeItem('taskflow_user');
          return String(legacy.id);
        }
      } catch {
        clearAuth();
      }
    }

    const id = localStorage.getItem(USER_ID_KEY);
    return id ? String(id) : null;
  }

  function saveUserId(userId) {
    if (!userId) return;
    localStorage.setItem(USER_ID_KEY, String(userId));
    localStorage.removeItem('taskflow_user');
    sessionStorage.removeItem('taskflow_user');
  }

  async function fetchFreshUser(userId) {
    const res = await fetch(`/auth/me?user_id=${encodeURIComponent(userId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error('Unable to verify session');
    }

    return sanitizeUser(await res.json());
  }

  function enforceZoneAccess(user, zone) {
    const role = normalizeRole(user.role);

    if (!isAdminRole(role) && !isMemberRole(role)) {
      clearAuth();
      redirect('/');
      return false;
    }

    if (zone === 'admin' && !isAdminRole(role)) {
      redirect('/member/tasks');
      return false;
    }

    if (zone === 'member' && !isMemberRole(role)) {
      redirect('/admin/dashboard');
      return false;
    }

    return true;
  }

  async function guardPage(zone) {
    const resolvedZone = zone || getRouteZone(window.location.pathname);
    activeZone = resolvedZone;

    if (resolvedZone === 'public') {
      return null;
    }

    const userId = getStoredUserId();
    if (!userId) {
      clearAuth();
      redirect('/');
      return null;
    }

    let fresh;
    try {
      fresh = await fetchFreshUser(userId);
    } catch (err) {
      console.error('Session validation failed:', err);
      clearAuth();
      redirect('/');
      return null;
    }

    if (!fresh) {
      clearAuth();
      redirect('/');
      return null;
    }

    if (fresh.status !== 'active') {
      clearAuth();
      redirect('/');
      return null;
    }

    saveUserId(fresh.id);

    if (!enforceZoneAccess(fresh, resolvedZone)) {
      return null;
    }

    return fresh;
  }

  async function restoreSessionOnLoginPage() {
    const userId = getStoredUserId();
    if (!userId) return;

    let fresh;
    try {
      fresh = await fetchFreshUser(userId);
    } catch {
      return;
    }

    if (!fresh || fresh.status !== 'active') {
      clearAuth();
      return;
    }

    saveUserId(fresh.id);
    redirect(getHomeForRole(fresh.role));
  }

  function saveLoginAndRedirect(user) {
    const safe = sanitizeUser(user);
    if (!safe?.id) {
      throw new Error('Invalid login response');
    }

    const role = normalizeRole(safe.role);
    if (!isAdminRole(role) && !isMemberRole(role)) {
      clearAuth();
      throw new Error('Unknown user role: ' + safe.role);
    }

    saveUserId(safe.id);
    redirect(getHomeForRole(role));
  }

  function logout(event) {
    if (event) event.preventDefault();
    clearAuth();
    redirect('/');
  }

  async function revalidateOnFocus() {
    if (!activeZone || activeZone === 'public') return;

    const userId = getStoredUserId();
    if (!userId) {
      clearAuth();
      redirect('/');
      return;
    }

    try {
      const fresh = await fetchFreshUser(userId);
      if (!fresh || fresh.status !== 'active') {
        clearAuth();
        redirect('/');
        return;
      }

      saveUserId(fresh.id);
      enforceZoneAccess(fresh, activeZone);
    } catch (err) {
      console.error('Session revalidation failed:', err);
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== USER_ID_KEY && event.key !== 'taskflow_user') return;
    if (!event.newValue) {
      redirect('/');
      return;
    }
    window.location.reload();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      revalidateOnFocus();
    }
  });

  global.TaskFlowAuth = {
    guardPage,
    restoreSessionOnLoginPage,
    saveLoginAndRedirect,
    logout,
    clearAuth,
    getStoredUserId,
    isAdminRole,
    isMemberRole,
    normalizeRole,
    getHomeForRole,
    getRouteZone
  };
})(window);
