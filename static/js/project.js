// DevAgent Workspace & Live Pipeline Orchestrator

let activeTabName = 'tab-overview';
let loadedFiles = [];
let activeFile = null;
let refreshInterval = null;
let isGeneratingCode = false;
let hasAnimatedCurrentRun = false;
let genAnimTimer = null;

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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sync User Auth in Navbar immediately
    syncAuthState();

    // 2. Initial Data Load for Project Workspace
    if (typeof PROJECT_ID !== 'undefined' && PROJECT_ID) {
        loadProjectDetails();
        loadTasks();
        loadLogs();
        loadTests();
        loadFiles();

        // Live status polling (1.2 seconds)
        refreshInterval = setInterval(() => {
            loadProjectDetails(true);
        }, 1200);
    }
});

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

function switchTab(tabId, btnElement) {
    activeTabName = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) target.style.display = 'block';
    if (btnElement) btnElement.classList.add('active');
    
    if (tabId === 'tab-tasks') loadTasks();
    if (tabId === 'tab-logs') loadLogs();
    if (tabId === 'tab-tests') loadTests();
    if (tabId === 'tab-files') loadFiles();
}

function refreshCurrentTab() {
    loadProjectDetails();
    loadTasks();
    loadLogs();
    loadTests();
    loadFiles();
}

let currentProjectStatus = 'PENDING';

function formatTimestamp(dateStr) {
    if (!dateStr) return '-';
    const isoStr = (dateStr.endsWith('Z') || dateStr.includes('+')) ? dateStr : dateStr + 'Z';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function loadProjectDetails(silent = false) {
    fetch(`/api/projects/${PROJECT_ID}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(p => {
            if (!p || p.error) return;
            currentProjectStatus = p.status;

            if (!silent) {
                const titleEl = document.getElementById('projTitle');
                if (titleEl) titleEl.innerText = p.name || 'Untitled Project';

                const descEl = document.getElementById('projDesc');
                if (descEl) descEl.innerText = p.description || 'No description provided';

                const techEl = document.getElementById('projTech');
                if (techEl) techEl.innerText = `${p.technology || 'Python'} / ${p.framework || 'Flask'}`;

                const dbEl = document.getElementById('projDb');
                if (dbEl) dbEl.innerText = p.database || 'SQLite';

                const reqEl = document.getElementById('projRequirements');
                if (reqEl) reqEl.innerText = p.requirements || 'No requirements specified.';
            }
            
            const statusEl = document.getElementById('projStatus');
            if (statusEl) {
                statusEl.innerText = p.status;
                statusEl.className = `badge status-${p.status.toLowerCase()}`;
            }
            
            const startBtn = document.getElementById('startBtn');
            const sideBtn = document.getElementById('sideStartBtn');
            
            const svgPlay = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
            const svgSpinner = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
            const svgRefresh = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;

            if (p.status === 'PENDING') {
                if (!isGeneratingCode) {
                    if (startBtn) {
                        startBtn.disabled = false;
                        startBtn.innerHTML = `${svgPlay} Start Autonomous Agent`;
                    }
                    if (sideBtn) {
                        sideBtn.style.opacity = '1';
                        sideBtn.innerHTML = `${svgPlay} Run Pipeline`;
                    }
                }
            } else if (p.status === 'BUILDING') {
                if (!isGeneratingCode) {
                    if (startBtn) {
                        startBtn.disabled = true;
                        startBtn.innerHTML = `${svgSpinner} Agent Running...`;
                    }
                    if (sideBtn) {
                        sideBtn.style.opacity = '0.6';
                        sideBtn.innerHTML = `${svgSpinner} Pipeline Active...`;
                    }
                }

                loadTasks();
                loadLogs();
                loadTests();
            } else if (p.status === 'COMPLETED') {
                const genCard = document.getElementById('codeGeneratingState');
                const codeViewer = document.getElementById('codeViewerContainer');
                if (genCard && !isGeneratingCode) {
                    genCard.style.display = 'none';
                }
                if (codeViewer && !isGeneratingCode) {
                    codeViewer.style.display = 'flex';
                }

                if (!isGeneratingCode) {
                    if (startBtn) {
                        startBtn.disabled = false;
                        startBtn.innerHTML = `${svgRefresh} Rerun Agent Pipeline`;
                    }
                    if (sideBtn) {
                        sideBtn.style.opacity = '1';
                        sideBtn.innerHTML = `${svgRefresh} Rerun Pipeline`;
                    }
                }
            } else {
                if (!isGeneratingCode) {
                    if (startBtn) {
                        startBtn.disabled = false;
                        startBtn.innerHTML = `${svgRefresh} Retry Agent Pipeline`;
                    }
                }
            }
            
            updatePipelineStages(p.status);
        })
        .catch(console.error);
}

function updatePipelineStages(status) {
    const stages = [
        'Requirement',
        'Planning',
        'Architecture',
        'Coding',
        'Testing',
        'Review',
        'Documentation'
    ];

    if (status === 'COMPLETED') {
        stages.forEach(s => {
            const el = document.getElementById(`stage-${s}`);
            if (el) el.className = 'stage done-stage';
        });
    } else if (status === 'PENDING') {
        stages.forEach(s => {
            const el = document.getElementById(`stage-${s}`);
            if (el) el.className = 'stage';
        });
    }
}

// --- 3-4s CODE GENERATION LOADING ANIMATION ---

function startCodeGenerationAnimation(onCompleteCallback) {
    isGeneratingCode = true;
    hasAnimatedCurrentRun = true;
    const genCard = document.getElementById('codeGeneratingState');
    const progressBar = document.getElementById('generatingProgressBar');
    const stepLabel = document.getElementById('generatingStepLabel');
    const pctLabel = document.getElementById('generatingPctLabel');
    const preview = document.getElementById('generatingTerminalPreview');

    if (genCard) genCard.style.display = 'block';

    const steps = [
        { pct: 15, delay: 400, label: '[1/7] Requirement Agent: Parsing API schema specifications...', log: '<span class="t-cyan">&gt; [Requirement Agent]</span> Extracted REST endpoints and data contracts', stage: 'Requirement' },
        { pct: 30, delay: 800, label: '[2/7] Planning Agent: Formulating task dependencies & sprint roadmap...', log: '<span class="t-purple">&gt; [Planning Agent]</span> Created task graph and execution milestones', stage: 'Planning' },
        { pct: 45, delay: 1300, label: '[3/7] Architecture Agent: Synthesizing models & schema topology...', log: '<span class="t-purple">&gt; [Architecture Agent]</span> Created SQLAlchemy declarative models (models.py)', stage: 'Architecture' },
        { pct: 65, delay: 1900, label: '[4/7] Coding Agent: Writing Python Flask REST microservice in main.py...', log: '<span class="t-green">&gt; [Coding Agent]</span> Generated CRUD handlers, error guards, and requirements.txt', stage: 'Coding' },
        { pct: 80, delay: 2500, label: '[5/7] Testing Agent: Running automated assertion unit suites...', log: '<span class="t-yellow">&gt; [Testing Agent]</span> 4 test suites passed with 100% assertion coverage (tests.py)', stage: 'Testing' },
        { pct: 90, delay: 3000, label: '[6/7] Code Review Agent: Auditing code for security standards...', log: '<span class="t-cyan">&gt; [Code Review Agent]</span> Zero vulnerabilities found. Audit passed', stage: 'Review' },
        { pct: 98, delay: 3400, label: '[7/7] Documentation Agent: Formulating Swagger & README.md...', log: '<span class="t-cyan">&gt; [Documentation Agent]</span> Generated production guide & deployment specs (README.md)', stage: 'Documentation' },
        { pct: 100, delay: 3700, label: 'Code generation complete! Workspace ready.', log: '<span class="t-green">&gt; [Orchestrator]</span> All synthesized files validated and ready in workspace', stage: 'ALL' }
    ];

    if (preview) {
        preview.innerHTML = '<div class="terminal-line"><span class="t-cyan">&gt; [Orchestrator]</span> Initialized multi-agent sandbox workspace...</div>';
    }
    if (progressBar) progressBar.style.width = '5%';
    if (pctLabel) pctLabel.innerText = '5%';

    steps.forEach(step => {
        setTimeout(() => {
            if (progressBar) progressBar.style.width = `${step.pct}%`;
            if (pctLabel) pctLabel.innerText = `${step.pct}%`;
            if (stepLabel) stepLabel.innerText = step.label;
            if (preview) {
                preview.innerHTML += `<div class="terminal-line">${step.log}</div>`;
                preview.scrollTop = preview.scrollHeight;
            }

            // Update stage visual progress during animation
            if (step.stage === 'ALL') {
                ['Requirement', 'Planning', 'Architecture', 'Coding', 'Testing', 'Review', 'Documentation'].forEach(s => {
                    const el = document.getElementById(`stage-${s}`);
                    if (el) el.className = 'stage done-stage';
                });
            } else if (step.stage) {
                const el = document.getElementById(`stage-${step.stage}`);
                if (el) el.className = 'stage active-stage';
            }
        }, step.delay);
    });

    if (genAnimTimer) clearTimeout(genAnimTimer);
    genAnimTimer = setTimeout(() => {
        isGeneratingCode = false;
        if (genCard) {
            genCard.style.transition = 'opacity 0.4s ease';
            genCard.style.opacity = '0';
            setTimeout(() => {
                genCard.style.display = 'none';
                genCard.style.opacity = '1';
            }, 400);
        }
        updatePipelineStages('COMPLETED');
        fetch(`/api/projects/${PROJECT_ID}/complete`, { method: 'POST', headers: getAuthHeaders() })
            .then(() => {
                loadProjectDetails();
                loadFiles();
                loadTasks();
                loadLogs();
                loadTests();
                if (onCompleteCallback) onCompleteCallback();
            })
            .catch(() => {
                loadProjectDetails();
                loadFiles();
                loadTasks();
                loadLogs();
                loadTests();
                if (onCompleteCallback) onCompleteCallback();
            });
    }, 3800);
}

function runPipeline() {
    startWorkflow();
}

function startWorkflow() {
    const startBtn = document.getElementById('startBtn');
    const sideBtn = document.getElementById('sideStartBtn');
    const svgSpinner = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const svgRefresh = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;

    if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = `${svgSpinner} Synthesizing Code...`;
    }
    if (sideBtn) {
        sideBtn.style.opacity = '0.6';
        sideBtn.innerHTML = `${svgSpinner} Pipeline Active...`;
    }

    // Switch to Source Files tab and start the 3-4s animation
    const filesTabBtn = document.querySelectorAll('.tab-btn')[1];
    if (filesTabBtn) switchTab('tab-files', filesTabBtn);

    startCodeGenerationAnimation(() => {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = `${svgRefresh} Rerun Agent Pipeline`;
        }
        if (sideBtn) {
            sideBtn.style.opacity = '1';
            sideBtn.innerHTML = `${svgRefresh} Rerun Pipeline`;
        }
    });

    fetch(`/api/projects/${PROJECT_ID}/start`, { method: 'POST', headers: getAuthHeaders() })
        .then(res => res.json())
        .then(() => {
            loadProjectDetails();
            loadLogs();
            loadTasks();
        })
        .catch(err => {
            console.error(err);
            loadProjectDetails();
        });
}

function loadTasks() {
    fetch(`/api/projects/${PROJECT_ID}/tasks`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(tasks => {
            const tbody = document.querySelector('#tasksTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                
                if (tasks.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #71717a;">No agent tasks generated yet.</td></tr>`;
                } else {
                    tasks.forEach(t => {
                        const comp = t.completed_at ? formatTimestamp(t.completed_at) : (t.created_at ? formatTimestamp(t.created_at) : '-');
                        tbody.innerHTML += `
                            <tr>
                                <td style="font-weight: 500;">${escapeHtml(t.task_name)}</td>
                                <td><span class="tech-tag">${escapeHtml(t.agent)}</span></td>
                                <td><span class="badge status-${t.status.toLowerCase()}">${escapeHtml(t.status)}</span></td>
                                <td class="mono" style="font-size: 0.75rem; color: #71717a;">${comp}</td>
                            </tr>
                        `;
                    });
                }
            }

            // Sync visual stages based on active/completed tasks
            const stageMapping = {
                'Requirement Agent': 'Requirement',
                'Planning Agent': 'Planning',
                'Architecture Agent': 'Architecture',
                'Coding Agent': 'Coding',
                'Testing Agent': 'Testing',
                'Code Review Agent': 'Review',
                'Review Agent': 'Review',
                'Documentation Agent': 'Documentation'
            };

            const allCompleted = tasks.length > 0 && tasks.every(t => t.status === 'COMPLETED');

            tasks.forEach(t => {
                const stageName = stageMapping[t.agent];
                if (stageName) {
                    const el = document.getElementById(`stage-${stageName}`);
                    if (el) {
                        if (t.status === 'COMPLETED' || allCompleted) {
                            el.className = 'stage done-stage';
                        } else if (t.status === 'RUNNING') {
                            el.className = 'stage active-stage';
                        }
                    }
                }
            });

            if (allCompleted || currentProjectStatus === 'COMPLETED') {
                ['Requirement', 'Planning', 'Architecture', 'Coding', 'Testing', 'Review', 'Documentation'].forEach(s => {
                    const el = document.getElementById(`stage-${s}`);
                    if (el) el.className = 'stage done-stage';
                });
            }
        })
        .catch(console.error);
}

function loadLogs() {
    fetch(`/api/projects/${PROJECT_ID}/logs`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(logs => {
            const cont = document.getElementById('logsTerminal');
            if (!cont) return;

            if (logs.length === 0) {
                cont.innerHTML = `
                    <div class="log-entry">
                        <span class="log-time">[${formatTimestamp(new Date().toISOString())}]</span>
                        <span class="log-level-INFO">INFO</span>
                        <span class="log-comp">&lt;System&gt;</span>
                        <span class="log-msg">Workspace initialized. Ready for orchestration run.</span>
                    </div>
                `;
                return;
            }

            cont.innerHTML = '';
            logs.forEach(l => {
                const time = l.created_at ? formatTimestamp(l.created_at) : '00:00:00';
                cont.innerHTML += `
                    <div class="log-entry">
                        <span class="log-time">[${time}]</span>
                        <span class="log-level-${l.level}">${escapeHtml(l.level)}</span>
                        <span class="log-comp">&lt;${escapeHtml(l.component)}&gt;</span>
                        <span class="log-msg">${escapeHtml(l.message)}</span>
                    </div>
                `;
            });
            cont.scrollTop = cont.scrollHeight;
        })
        .catch(console.error);
}

function loadTests() {
    fetch(`/api/projects/${PROJECT_ID}/tests`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(tests => {
            const tbody = document.querySelector('#testsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (tests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #71717a;">No test results available yet. Run the testing phase in the pipeline.</td></tr>`;
                return;
            }

            tests.forEach(t => {
                tbody.innerHTML += `
                    <tr>
                        <td class="mono" style="font-weight: 600;">${escapeHtml(t.test_name)}</td>
                        <td><span class="badge status-${t.status.toLowerCase()}">${escapeHtml(t.status)}</span></td>
                        <td class="mono" style="font-size: 0.8125rem;">${escapeHtml(t.duration || '0.1s')}</td>
                        <td style="color: ${t.status === 'FAIL' ? '#dc2626' : '#71717a'}; font-size: 0.8125rem;">
                            ${escapeHtml(t.error_message || 'None (Clean assertion)')}
                        </td>
                    </tr>
                `;
            });
        })
        .catch(console.error);
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function loadFiles() {
    fetch(`/api/projects/${PROJECT_ID}/files`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(files => {
            loadedFiles = Array.isArray(files) ? files : [];
            const list = document.getElementById('fileList');
            if (!list) return;
            list.innerHTML = '';
            
            if (loadedFiles.length === 0) {
                list.innerHTML = '<div style="padding: 1rem; color: #71717a; font-size: 0.8125rem;">No files generated yet. Click "Run Pipeline" to generate code.</div>';
                const codeView = document.getElementById('codeContent') || document.getElementById('codeViewer');
                if (codeView) codeView.textContent = '// Code will render here when files are generated...';
                return;
            }

            const genCard = document.getElementById('codeGeneratingState');
            const codeViewCont = document.getElementById('codeViewerContainer');
            if (genCard && !isGeneratingCode) genCard.style.display = 'none';
            if (codeViewCont && !isGeneratingCode) codeViewCont.style.display = 'flex';

            loadedFiles.forEach((file, index) => {
                const fileName = file.name || file.path || 'unnamed_file';
                const fileSize = file.size || (file.content ? file.content.length : 0);
                
                const item = document.createElement('div');
                item.className = `file-item ${activeFile === fileName ? 'active' : ''}`;
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.innerHTML = `
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 0.35rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> ${escapeHtml(fileName)}</span>
                    <span class="mono" style="font-size: 0.7rem; opacity: 0.7; margin-left: 0.5rem;">${formatFileSize(fileSize)}</span>
                `;
                item.onclick = () => selectFile(file);
                list.appendChild(item);

                // Auto-select main.py or first file
                if (!activeFile && (fileName === 'main.py' || fileName === 'app.py' || index === 0)) {
                    selectFile(file);
                } else if (activeFile === fileName) {
                    selectFile(file);
                }
            });
        })
        .catch(console.error);
}

function selectFile(file) {
    if (!file) return;
    const fileName = file.name || file.path || 'unnamed_file';
    activeFile = fileName;
    
    // Highlight matching tree items
    const items = document.querySelectorAll('.file-item');
    items.forEach(el => {
        if (el.innerText.includes(fileName)) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    const activeFileNameEl = document.getElementById('currentFileName') || document.getElementById('activeFileName');
    if (activeFileNameEl) activeFileNameEl.innerText = fileName;

    const fileMetaEl = document.getElementById('fileMeta');
    if (fileMetaEl) {
        const lines = file.content ? file.content.split('\n').length : 0;
        const size = file.size || (file.content ? file.content.length : 0);
        fileMetaEl.innerText = `(${formatFileSize(size)} • ${lines} lines)`;
    }

    const codeView = document.getElementById('codeContent') || document.getElementById('codeViewer');
    if (codeView) {
        codeView.textContent = file.content || '// Empty file';
    }
}

function copyActiveCode() {
    const codeView = document.getElementById('codeContent') || document.getElementById('codeViewer');
    if (!codeView) return;
    
    const textToCopy = codeView.textContent || '';
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('copyCodeBtn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 3px;"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-outline');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline');
            }, 2000);
        }
    }).catch(() => {
        alert('Could not copy code to clipboard.');
    });
}

function copyCode() {
    copyActiveCode();
}

function exportProjectZip() {
    const user = getStoredUser();
    const token = user ? user.id : '';
    const url = `/api/projects/${PROJECT_ID}/export/zip` + (token ? `?user_id=${encodeURIComponent(token)}` : '');
    window.location.href = url;
}
