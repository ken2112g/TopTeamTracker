const TOPTEAMTRACKER_URL = 'http://localhost:3000';

document.getElementById('btn-open').addEventListener('click', () => {
  chrome.tabs.create({ url: TOPTEAMTRACKER_URL });
});
document.getElementById('btn-admin').addEventListener('click', () => {
  chrome.tabs.create({ url: `${TOPTEAMTRACKER_URL}/admin` });
});

// ── Load user info ────────────────────────────────────────────
async function loadUser() {
  const section = document.getElementById('user-section');
  const readyCard = document.getElementById('ready-card');

  try {
    const res = await fetch(`${TOPTEAMTRACKER_URL}/api/extension/me`, {
      credentials: 'include',
    });
    const data = await res.json();
    const user = data?.user ?? null;

    if (user) {
      // Build initials
      const initials = (user.name || 'U')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const roleLabel = user.isSuperAdmin ? 'Super Admin' : (user.role === 'owner' ? 'Owner' : user.role === 'admin' ? 'Admin' : 'Member');
      const badgeClass = user.isSuperAdmin ? 'user-badge super' : 'user-badge';

      const avatarHtml = user.avatarUrl
        ? `<img src="${user.avatarUrl}" alt="" />`
        : initials;

      section.innerHTML = `
        <div class="user-card">
          <div class="user-avatar">${avatarHtml}</div>
          <div class="user-info">
            <div class="user-name">${escHtml(user.name)}</div>
            <div class="user-meta">${escHtml(user.email)}${user.workspaceName ? ` · ${escHtml(user.workspaceName)}` : ''}</div>
          </div>
          <span class="${badgeClass}">${roleLabel}</span>
        </div>
      `;

      readyCard.style.display = '';
    } else {
      showNotLogged(section);
    }
  } catch {
    showNotLogged(section);
  }
}

function showNotLogged(section) {
  section.innerHTML = `
    <div class="not-logged">
      <div class="not-logged-row">
        <div class="dot-warn"></div>
        <div class="not-logged-title">Chưa đăng nhập</div>
      </div>
      <div class="not-logged-desc">
        Mở TopTeamTracker và đăng nhập để sử dụng extension.
      </div>
    </div>
  `;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadUser();
