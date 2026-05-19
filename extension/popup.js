const TOPTEAMTRACKER_URL = 'https://topteamtracker.id.vn';

document.getElementById('btn-open').addEventListener('click', () => {
  chrome.tabs.create({ url: TOPTEAMTRACKER_URL });
});
document.getElementById('btn-admin').addEventListener('click', () => {
  chrome.tabs.create({ url: `${TOPTEAMTRACKER_URL}/admin` });
});

async function getToken() {
  return new Promise(resolve => {
    chrome.storage.local.get('ttt_access_token', ({ ttt_access_token }) => {
      resolve(ttt_access_token ?? null);
    });
  });
}

async function loadUser() {
  const section = document.getElementById('user-section');
  const readyCard = document.getElementById('ready-card');

  try {
    const token = await getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${TOPTEAMTRACKER_URL}/api/extension/me`, { headers });
    const data = await res.json();
    const user = data?.user ?? null;

    if (user) {
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

// ── Reset Etsy cookies ────────────────────────────────────────────────────────
const btnReset = document.getElementById('btn-reset-etsy');
const confirmRow = document.getElementById('confirm-row');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

btnReset.addEventListener('click', () => {
  btnReset.classList.add('danger');
  btnReset.textContent = '⚠️ Sẽ đăng xuất Etsy. Chắc chắn xóa?';
  confirmRow.style.display = 'flex';
});

confirmNo.addEventListener('click', () => {
  btnReset.classList.remove('danger');
  btnReset.innerHTML = '🍪 Làm mới Etsy — Xóa cookie để spy sản phẩm mới';
  confirmRow.style.display = 'none';
});

confirmYes.addEventListener('click', async () => {
  confirmRow.style.display = 'none';
  btnReset.textContent = '⏳ Đang xóa...';
  btnReset.disabled = true;

  try {
    // Lấy tất cả cookie của etsy.com và www.etsy.com
    const domains = ['.etsy.com', 'www.etsy.com', 'etsy.com'];
    const allCookies = [];
    for (const domain of domains) {
      const cookies = await chrome.cookies.getAll({ domain });
      allCookies.push(...cookies);
    }

    // Xóa từng cookie
    const removals = allCookies.map(cookie => {
      const protocol = cookie.secure ? 'https' : 'http';
      const host = cookie.domain.startsWith('.') ? 'www.etsy.com' : cookie.domain;
      const url = `${protocol}://${host}${cookie.path}`;
      return chrome.cookies.remove({ url, name: cookie.name });
    });
    await Promise.allSettled(removals);

    // Reload tab Etsy đang mở (nếu có)
    const tabs = await chrome.tabs.query({ url: '*://*.etsy.com/*' });
    if (tabs.length > 0) {
      await chrome.tabs.reload(tabs[0].id);
    }

    btnReset.classList.remove('danger');
    btnReset.classList.add('success');
    btnReset.textContent = `✅ Đã xóa ${allCookies.length} cookies — Etsy đã được làm mới!`;
    btnReset.disabled = false;

    // Reset về trạng thái ban đầu sau 4 giây
    setTimeout(() => {
      btnReset.classList.remove('success');
      btnReset.innerHTML = '🍪 Làm mới Etsy — Xóa cookie để spy sản phẩm mới';
    }, 4000);
  } catch (err) {
    btnReset.classList.remove('danger');
    btnReset.textContent = '❌ Lỗi: ' + (err.message ?? 'Không xóa được');
    btnReset.disabled = false;
    setTimeout(() => {
      btnReset.innerHTML = '🍪 Làm mới Etsy — Xóa cookie để spy sản phẩm mới';
    }, 3000);
  }
});
