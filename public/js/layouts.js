/**
 * Separate shell layouts for Admin and Member experiences.
 * Each role has its own navigation — never shared.
 */
(function (global) {
  const ADMIN_NAV = [
    { id: 'dashboard', href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks', href: '/admin/tasks', label: 'Tasks', icon: '📋' },
    { id: 'team', href: '/admin/team', label: 'Team', icon: '👥' },
    { id: 'settings', href: '/admin/settings', label: 'Settings', icon: '⚙️' }
  ];

  const MEMBER_NAV = [
    { id: 'tasks', href: '/member/tasks', label: 'Tasks', icon: '📋' },
    { id: 'settings', href: '/member/settings', label: 'Settings', icon: '⚙️' }
  ];

  function buildNavLinks(items, activeId) {
    return items.map((item) => `
      <a href="${item.href}" class="sidebar-link${item.id === activeId ? ' active' : ''}">
        <span aria-hidden="true">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `).join('');
  }

  function mountLayout(options) {
    const { type, active, user, contentEl } = options;
    const isAdmin = type === 'admin';
    const navItems = isAdmin ? ADMIN_NAV : MEMBER_NAV;
    const zoneLabel = isAdmin ? 'Admin Console' : 'Member Portal';

    const shell = document.createElement('div');
    shell.className = 'app-shell';
    shell.id = 'appShell';
    shell.innerHTML = `
      <button type="button" class="mobile-toggle" id="sidebarToggle" aria-label="Toggle menu">☰</button>
      <aside class="sidebar sidebar-${type}" id="appSidebar">
        <div class="sidebar-brand">
          <div class="logo-row">
            <span class="logo-icon">✅</span>
            <span class="logo-text">TaskFlow</span>
          </div>
          <div class="zone-label">${zoneLabel}</div>
        </div>
        <nav class="sidebar-nav" aria-label="${zoneLabel} navigation">
          ${buildNavLinks(navItems, active)}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <strong>${escapeHtml(user.name || 'User')}</strong>
            ${escapeHtml(user.email || '')}
          </div>
          <button type="button" class="btn-logout" onclick="TaskFlowAuth.logout(event)">Logout</button>
        </div>
      </aside>
      <div class="main-panel">
        <div class="main-content" id="layoutMainContent"></div>
      </div>
    `;

    document.body.insertBefore(shell, document.body.firstChild);
    const main = shell.querySelector('#layoutMainContent');

    if (contentEl) {
      contentEl.style.display = 'block';
      main.appendChild(contentEl);
    }

    const toggle = shell.querySelector('#sidebarToggle');
    const sidebar = shell.querySelector('#appSidebar');
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    return main;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  global.AdminLayout = {
    mount(active, user, contentEl) {
      return mountLayout({ type: 'admin', active, user, contentEl });
    }
  };

  global.MemberLayout = {
    mount(active, user, contentEl) {
      return mountLayout({ type: 'member', active, user, contentEl });
    }
  };
})(window);
