// DevAgent Main Application JS

function getStoredUser() {
    try {
        const stored = localStorage.getItem('devagent_user') || localStorage.getItem('user');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {}
    return null;
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const user = getStoredUser();
    if (user && user.id) {
        headers['X-User-Id'] = user.id.toString();
        headers['Authorization'] = `Bearer ${user.id}`;
    }
    return headers;
}

function syncAuthState() {
    const localUser = getStoredUser();
    if (localUser) {
        updateNavbarForUser(localUser);
    }

    fetch('/api/auth/me', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.authenticated && data.user) {
                localStorage.setItem('devagent_user', JSON.stringify(data.user));
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', String(data.user.id));
                updateNavbarForUser(data.user);
            } else if (!localUser) {
                updateNavbarForGuest();
            }
        })
        .catch(() => {
            if (localUser) {
                updateNavbarForUser(localUser);
            }
        });
}

function updateNavbarForUser(user) {
    if (!user) return;
    const navLogo = document.getElementById('navLogo');
    if (navLogo) navLogo.href = '/dashboard';

    const navHomeItem = document.getElementById('navHomeItem');
    if (navHomeItem) navHomeItem.style.display = 'none';

    const guestMenu = document.getElementById('guestMenu');
    if (guestMenu) {
        guestMenu.style.setProperty('display', 'none', 'important');
    }

    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.style.setProperty('display', 'flex', 'important');
        const avatar = userMenu.querySelector('.profile-avatar');
        const nameEl = userMenu.querySelector('.username-display');
        const username = user.username || user.name || 'Developer';
        if (avatar) avatar.innerText = username.slice(0, 2).toUpperCase();
        if (nameEl) nameEl.innerText = username;
    }
}

function updateNavbarForGuest() {
    const navLogo = document.getElementById('navLogo');
    if (navLogo) navLogo.href = '/';

    const navHomeItem = document.getElementById('navHomeItem');
    if (navHomeItem) navHomeItem.style.display = '';

    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.style.setProperty('display', 'none', 'important');
    }

    const guestMenu = document.getElementById('guestMenu');
    if (guestMenu) {
        guestMenu.style.setProperty('display', 'flex', 'important');
    }
}

function handleSignOut(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('devagent_user');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() }).finally(() => {
        window.location.href = '/login';
    });
}

function fetchStats() {
    fetch('/api/dashboard/stats', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            if (document.getElementById('stat-total')) {
                document.getElementById('stat-total').innerText = data.total_projects;
            }
            if (document.getElementById('stat-active')) {
                document.getElementById('stat-active').innerText = data.active_projects;
            }
            if (document.getElementById('stat-passed')) {
                document.getElementById('stat-passed').innerText = data.tests_passed;
            }
            if (document.getElementById('stat-completed')) {
                document.getElementById('stat-completed').innerText = data.completed_projects;
            }
        })
        .catch(console.error);
}

function fetchProjects() {
    fetch('/api/projects', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#projectsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; padding: 2rem; color: #71717a;">
                            No projects found for your account. Click "Create New Project" to launch your autonomous agent.
                        </td>
                    </tr>
                `;
                return;
            }

            data.slice(0, 8).forEach(p => {
                const dateStr = p.created_at ? new Date(p.created_at.endsWith('Z') || p.created_at.includes('+') ? p.created_at : p.created_at + 'Z').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="font-weight: 600; color: #09090b;">${escapeHtml(p.name)}</div>
                            <div style="font-size: 0.75rem; color: #71717a; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${escapeHtml(p.description || 'No description provided')}
                            </div>
                        </td>
                        <td><span class="tech-tag">${escapeHtml(p.technology || 'Python')} / ${escapeHtml(p.framework || 'Flask')}</span></td>
                        <td><span class="badge status-${p.status.toLowerCase()}">${escapeHtml(p.status)}</span></td>
                        <td>${dateStr}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            <a href="/api/projects/${p.id}/export/zip" class="btn btn-outline btn-sm" style="margin-right: 0.4rem;" download title="Download ZIP Codebase"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 3px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>ZIP</a>
                            <a href="/projects/${p.id}" class="btn btn-secondary btn-sm">Open Workspace &rarr;</a>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(console.error);
}

function fetchProjectsFull() {
    fetch('/api/projects', { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#projectsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding: 2rem; color: #71717a;">
                            No projects found for your account. Click "Create New Project" to start.
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach(p => {
                const dateStr = p.created_at ? new Date(p.created_at.endsWith('Z') || p.created_at.includes('+') ? p.created_at : p.created_at + 'Z').toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
                tbody.innerHTML += `
                    <tr>
                        <td class="mono" style="font-weight: 600;">#${p.id}</td>
                        <td>
                            <div style="font-weight: 600; color: #09090b;">${escapeHtml(p.name)}</div>
                            <div style="font-size: 0.75rem; color: #71717a;">${escapeHtml(p.description || '')}</div>
                        </td>
                        <td>${escapeHtml(p.technology || 'Python')}</td>
                        <td>${escapeHtml(p.framework || 'Flask')}</td>
                        <td><span class="badge status-${p.status.toLowerCase()}">${escapeHtml(p.status)}</span></td>
                        <td>${dateStr}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            <a href="/api/projects/${p.id}/export/zip" class="btn btn-outline btn-sm" style="margin-right: 0.4rem;" download title="Download ZIP Codebase"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 3px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>ZIP</a>
                            <a href="/projects/${p.id}" class="btn btn-primary btn-sm">Open Workspace</a>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(console.error);
}

function filterProjects() {
    const input = document.getElementById('projectSearchInput');
    if (!input) return;
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#projectsTable tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

function filterProjectsFull() {
    const input = document.getElementById('projectsFullSearch');
    if (!input) return;
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#projectsTable tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Automatically sync auth state on DOM load
document.addEventListener('DOMContentLoaded', () => {
    syncAuthState();
});
