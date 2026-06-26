/**
 * MemberLayout — sidebar shell for member-only pages.
 * Never includes Dashboard, Team, or admin controls.
 */
(function (global) {
  const NAV_ITEMS = [
    { id: 'tasks', label: 'Tasks', href: '/member/tasks', icon: '📋' },
    { id: 'settings', label: 'Settings', href: '/member/settings', icon: '⚙️' }
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
    const { user, active = 'tasks', contentSelector = '.layout-content' } = options;
    const shell = document.getElementById('app-shell');
    if (!shell) return;

    const userName = user?.name || 'Member';
    const contentEl = shell.querySelector(contentSelector);

    shell.innerHTML = `
      <aside class="sidebar" id="memberSidebar">
        <div class="sidebar-brand">
          <span class="sidebar-brand-icon">✅</span>
          <span class="sidebar-brand-text">TaskFlow</span>
        </div>
        <div class="sidebar-role-badge member">Member</div>
        <nav class="sidebar-nav" aria-label="Member navigation">
          ${renderNav(active)}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user" title="${userName}">${userName}</div>
          <button type="button" class="btn-sidebar-logout" id="memberLogoutBtn">Logout</button>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <div class="layout-main">
        <header class="layout-topbar">
          <button type="button" class="mobile-menu-btn" aria-label="Open menu">☰</button>
          <span class="sidebar-brand-text">TaskFlow</span>
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

    shell.querySelector('#memberLogoutBtn').addEventListener('click', (event) => {
      global.TaskFlowAuth.logout(event);
    });

    bindMobileToggle(shell);
    shell.classList.add('visible');
    document.body.classList.add('layout-body');
  }

  global.MemberLayout = { init, NAV_ITEMS };
})(window);
