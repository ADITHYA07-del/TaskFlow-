/**
 * AdminLayout — sidebar shell for admin-only pages.
 */
(function (global) {
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { id: 'tasks', label: 'Tasks', href: '/admin/tasks', icon: '📋' },
    { id: 'team', label: 'Team', href: '/admin/team', icon: '👥' },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: '⚙️' }
  ];

  function renderNav(activeId) {
    return NAV_ITEMS.map((item) => {
      const activeClass = item.id === activeId ? ' active' : '';
      return `<a href="${item.href}" class="sidebar-link${activeClass}"><span>${item.icon}</span><span>${item.label}</span></a>`;
    }).join('');
  }

  function bindMobileToggle(shell) {
    const sidebar = shell.querySelector('.sidebar');
    const overlay = shell.querySelector('.sidebar-overlay');
    const toggleBtn = shell.querySelector('.mobile-menu-btn');

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    }

    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    shell.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', closeSidebar);
    });
  }

  function init(options) {
    const { user, active = 'dashboard', contentSelector = '.layout-content' } = options;
    const shell = document.getElementById('app-shell');
    if (!shell) return;

    const userName = user?.name || 'Admin';
    const contentEl = shell.querySelector(contentSelector);

    shell.innerHTML = `
      <aside class="sidebar" id="adminSidebar">
        <div class="sidebar-brand">
          <span class="sidebar-brand-icon">✅</span>
          <span class="sidebar-brand-text">TaskFlow</span>
        </div>
        <div class="sidebar-role-badge admin">Admin</div>
        <nav class="sidebar-nav" aria-label="Admin navigation">
          ${renderNav(active)}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user" title="${userName}">${userName}</div>
          <button type="button" class="btn-sidebar-logout" id="adminLogoutBtn">Logout</button>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <div class="layout-main">
        <header class="layout-topbar">
          <button type="button" class="mobile-menu-btn" aria-label="Open menu">☰</button>
          <span class="sidebar-brand-text">TaskFlow Admin</span>
        </header>
        <div class="layout-content" id="layoutContent"></div>
      </div>
    `;

    const newContent = shell.querySelector('#layoutContent');
    if (contentEl && newContent) {
      while (contentEl.firstChild) {
        newContent.appendChild(contentEl.firstChild);
      }
    }

    shell.querySelector('#adminLogoutBtn').addEventListener('click', (event) => {
      global.TaskFlowAuth.logout(event);
    });

    bindMobileToggle(shell);
    shell.classList.add('visible');
    document.body.classList.add('layout-body');
  }

  global.AdminLayout = { init, NAV_ITEMS };
})(window);
