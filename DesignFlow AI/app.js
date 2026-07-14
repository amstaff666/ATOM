/* ============================================================
   DesignFlow AI — app.js
   Full application logic: state, PRD parsing, template engine,
   theme system, screen generation, preview, chat/editing,
   diff/changelog, version history, sitemap, export, grid view
   ============================================================ */

'use strict';

/* ============================================================
   SAMPLE PRD
   ============================================================ */
const SAMPLE_PRD = `TaskFlow — Project Management for Remote Teams

Problem Statement:
Remote teams struggle to track tasks, deadlines, and project progress across time zones. Current tools are either too simple (no automation) or too complex (steep learning curve).

User Roles:
- Team Member: Creates and manages their tasks, updates status
- Team Lead: Assigns tasks, views team workload, creates sprints
- Admin: Manages workspace settings, billing, integrations

Key Screens:
1. Dashboard — Overview of all projects, key metrics (tasks completed, overdue, in progress), activity feed
2. Task Board — Kanban board with columns: Backlog, Todo, In Progress, Review, Done. Drag-and-drop cards
3. Task Detail — Full task view with title, description, assignee, due date, priority, subtasks, comments thread, activity log
4. Team Members — List of team members with roles, workload indicators, availability status
5. Settings — Workspace name, theme, notification preferences, integrations list, billing section

Key Flows:
- Create task → Assign → Move through pipeline → Complete
- Sprint planning: Select tasks → Set sprint dates → Track burndown

Edge Cases:
- Empty states for new workspaces with no tasks
- Overdue task visual alerts
- Offline mode graceful degradation`;

/* ============================================================
   THEME PRESETS
   ============================================================ */
const THEMES = {
  'modern-saas': {
    name: 'Modern SaaS',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    bg: '#ffffff',
    surface: '#f8fafc',
    surface2: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
    border: '#e2e8f0',
    font: 'Inter',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    radius: '8px',
    radiusLg: '12px',
    baseFontSize: '14px',
  },
  'consumer-mobile': {
    name: 'Consumer Mobile',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    bg: '#fafafa',
    surface: '#ffffff',
    surface2: '#f4f4f5',
    text: '#18181b',
    textMuted: '#71717a',
    textFaint: '#a1a1aa',
    border: '#e4e4e7',
    font: 'Plus Jakarta Sans',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    radius: '16px',
    radiusLg: '20px',
    baseFontSize: '16px',
  },
  'enterprise': {
    name: 'Enterprise Dashboard',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    bg: '#f1f5f9',
    surface: '#ffffff',
    surface2: '#f8fafc',
    text: '#1e293b',
    textMuted: '#475569',
    textFaint: '#94a3b8',
    border: '#e2e8f0',
    font: 'IBM Plex Sans',
    fontUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
    radius: '4px',
    radiusLg: '6px',
    baseFontSize: '13px',
  },
};

let customTheme = null;

/* ============================================================
   APPLICATION STATE
   ============================================================ */
const state = {
  currentTheme: 'modern-saas',
  parsedData: null,
  screens: {},           // { screenId: { name, html, sections } }
  activeScreenId: null,
  viewMode: 'preview',   // 'preview' | 'grid'
  appTheme: 'dark',      // app UI theme
  versionHistory: {
    versions: [],
    currentVersionId: null,
    branches: { main: [] },
    currentBranch: 'main',
  },
  scopeScreen: null,
  scopeSection: null,
  changelogEntries: [],
};

/* ============================================================
   UTILITIES
   ============================================================ */
function genId() {
  return 'v' + Date.now() + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success'
    ? '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  toast.innerHTML = icon + `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ============================================================
   PRD PARSER
   ============================================================ */
function parsePRD(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const parsed = {
    roles: [],
    screens: [],
    flows: [],
    edgeCases: [],
    dataModels: [],
  };

  let currentSection = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Section headers
    if (/^(user roles?|actors?|personas?)\s*[:\-]/i.test(line)) { currentSection = 'roles'; continue; }
    if (/^(key screens?|screens?|pages?|views?)\s*[:\-]/i.test(line)) { currentSection = 'screens'; continue; }
    if (/^(key flows?|user flows?|flows?)\s*[:\-]/i.test(line)) { currentSection = 'flows'; continue; }
    if (/^(edge cases?|error states?|exceptions?)\s*[:\-]/i.test(line)) { currentSection = 'edgeCases'; continue; }
    if (/^(data models?|entities|data)\s*[:\-]/i.test(line)) { currentSection = 'dataModels'; continue; }
    if (/^(problem statement|overview|background|goals?)\s*[:\-]/i.test(line)) { currentSection = null; continue; }

    // Bullet / numbered list items
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    const numberedMatch = line.match(/^\d+[\.\)]\s+(.+)$/);
    const item = bulletMatch ? bulletMatch[1] : (numberedMatch ? numberedMatch[1] : null);

    if (item && currentSection) {
      if (currentSection === 'roles') {
        const parts = item.split(/[:—\-]/);
        parsed.roles.push({ name: parts[0].trim(), description: parts.slice(1).join(':').trim() });
      } else if (currentSection === 'screens') {
        const parts = item.split(/\s*[—\-]\s*/);
        parsed.screens.push({ name: parts[0].trim(), description: parts.slice(1).join(' ').trim() });
      } else if (currentSection === 'flows') {
        parsed.flows.push(item);
      } else if (currentSection === 'edgeCases') {
        parsed.edgeCases.push(item);
      } else if (currentSection === 'dataModels') {
        parsed.dataModels.push(item);
      }
    }
  }

  // Fallback: extract screens from numbered list anywhere
  if (parsed.screens.length === 0) {
    const screenMatches = text.matchAll(/^\d+[\.\)]\s+(.+)/gm);
    for (const m of screenMatches) {
      const parts = m[1].split(/\s*[—\-]\s*/);
      parsed.screens.push({ name: parts[0].trim(), description: parts.slice(1).join(' ').trim() });
    }
  }

  // Infer data models from screen descriptions
  if (parsed.dataModels.length === 0) {
    const allText = text.toLowerCase();
    if (allText.includes('task')) parsed.dataModels.push('Task: title, description, assignee, due date, priority, status, tags');
    if (allText.includes('user') || allText.includes('member')) parsed.dataModels.push('User: name, email, role, avatar, status');
    if (allText.includes('project')) parsed.dataModels.push('Project: name, owner, deadline, status, members');
    if (allText.includes('comment')) parsed.dataModels.push('Comment: author, content, timestamp, reactions');
    if (allText.includes('sprint')) parsed.dataModels.push('Sprint: name, start_date, end_date, tasks, velocity');
  }

  return parsed;
}

/* ============================================================
   SCREEN SECTION DEFINITIONS (for scope selector)
   ============================================================ */
const SECTION_NAMES = {
  dashboard: ['nav', 'stats-grid', 'activity-feed', 'chart-area'],
  'task-board': ['nav', 'kanban-board', 'column-backlog', 'column-todo', 'column-inprogress', 'column-review', 'column-done'],
  'task-detail': ['nav', 'detail-header', 'detail-body', 'subtasks', 'comments', 'sidebar-meta'],
  'team-members': ['nav', 'team-grid', 'member-filters'],
  settings: ['nav', 'settings-nav', 'general-settings', 'notification-settings', 'integrations', 'billing'],
  login: ['login-form', 'social-buttons', 'footer-links'],
  signup: ['signup-steps', 'signup-form', 'progress-bar'],
  profile: ['nav', 'profile-header', 'profile-info', 'activity-section'],
  analytics: ['nav', 'metrics-header', 'charts-section', 'data-table'],
  notifications: ['nav', 'notification-list', 'notification-filters'],
  search: ['nav', 'search-bar', 'filters-section', 'results-grid'],
  calendar: ['nav', 'calendar-grid', 'events-list'],
};

function getSectionsForScreen(screenName) {
  const slug = slugify(screenName);
  for (const key of Object.keys(SECTION_NAMES)) {
    if (slug.includes(key) || key.includes(slug.split('-')[0])) {
      return SECTION_NAMES[key];
    }
  }
  return ['nav', 'main-content', 'sidebar', 'footer'];
}

/* ============================================================
   THEME CSS GENERATOR (for injecting into screens)
   ============================================================ */
function getThemeCSS(themeKey) {
  const t = themeKey === 'custom' ? customTheme : (THEMES[themeKey] || THEMES['modern-saas']);
  return `
    @import url('${t.fontUrl}');
    :root {
      --primary: ${t.primary};
      --primary-hover: ${t.primaryHover};
      --bg: ${t.bg};
      --surface: ${t.surface};
      --surface2: ${t.surface2};
      --text: ${t.text};
      --text-muted: ${t.textMuted};
      --text-faint: ${t.textFaint};
      --border: ${t.border};
      --font: '${t.font}', -apple-system, sans-serif;
      --radius: ${t.radius};
      --radius-lg: ${t.radiusLg};
      --base: ${t.baseFontSize};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      font-size: var(--base);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    button { cursor: pointer; font: inherit; }
    input, textarea, select { font: inherit; }
  `;
}

/* ============================================================
   SCREEN NAV GENERATOR
   ============================================================ */
function buildScreenNav(appName, screens, activeScreenId) {
  const navLinks = Object.entries(screens).map(([id, s]) => {
    const active = id === activeScreenId ? 'style="font-weight:600; color:var(--primary);"' : '';
    return `<a href="#" data-screen="${id}" ${active} onclick="parent.postMessage({type:'navigate',screenId:'${id}'},'*'); return false;">${escapeHtml(s.name)}</a>`;
  }).join('');

  return `
    <nav style="display:flex; align-items:center; gap:8px; padding:0 24px; height:52px; background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100; overflow-x:auto;">
      <div style="font-weight:700; font-size:15px; color:var(--primary); margin-right:16px; white-space:nowrap;">${escapeHtml(appName)}</div>
      <div style="display:flex; gap:4px; flex:1; overflow-x:auto; scrollbar-width:none;">
        ${navLinks}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;">AJ</div>
      </div>
    </nav>
    <style>
      nav a { color: var(--text-muted); font-size: 13px; padding: 4px 10px; border-radius: 6px; transition: background 150ms, color 150ms; white-space: nowrap; text-decoration: none; }
      nav a:hover { background: rgba(0,0,0,0.06); color: var(--text); }
    </style>
  `;
}

/* ============================================================
   SCREEN TEMPLATE ENGINE
   ============================================================ */
function buildPostMessageScript() {
  return `
    <script>
      window.addEventListener('message', function(e) {
        // Receive theme updates
        if (e.data && e.data.type === 'updateSection') {
          var el = document.querySelector('[data-section="' + e.data.sectionId + '"]');
          if (el) el.outerHTML = e.data.html;
        }
      });
      // Intercept nav link clicks
      document.addEventListener('click', function(e) {
        var a = e.target.closest('a[data-screen]');
        if (a) {
          e.preventDefault();
          parent.postMessage({ type: 'navigate', screenId: a.getAttribute('data-screen') }, '*');
        }
      });
    </script>
  `;
}

function generateDashboardScreen(appName, screens, screenId, theme) {
  const themeCSS = getThemeCSS(theme);
  const nav = buildScreenNav(appName, screens, screenId);
  const postMsg = buildPostMessageScript();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard — ${escapeHtml(appName)}</title>
<style>${themeCSS}
.page { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.page-subtitle { color: var(--text-muted); font-size: 13px; margin-bottom: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
.stat-label { font-size: 12px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.stat-value { font-size: 32px; font-weight: 700; color: var(--text); line-height: 1; margin-bottom: 8px; font-variant-numeric: tabular-nums; }
.stat-delta { font-size: 12px; display: flex; align-items: center; gap: 4px; }
.delta-pos { color: #16a34a; } .delta-neg { color: #dc2626; }
.main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
.chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 120px; padding: 0 4px; }
.chart-bar { flex: 1; border-radius: 4px 4px 0 0; background: var(--primary); opacity: 0.8; transition: opacity 150ms; }
.chart-bar:hover { opacity: 1; }
.chart-labels { display: flex; gap: 6px; padding: 6px 4px 0; }
.chart-label { flex: 1; text-align: center; font-size: 10px; color: var(--text-faint); }
.activity-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.activity-item:last-child { border-bottom: none; }
.avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #fff; flex-shrink: 0; }
.activity-text { flex: 1; font-size: 13px; color: var(--text-muted); line-height: 1.4; }
.activity-text strong { color: var(--text); }
.activity-time { font-size: 11px; color: var(--text-faint); margin-top: 2px; }
.project-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.project-row:last-child { border-bottom: none; }
.project-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.project-name { flex: 1; font-size: 13px; font-weight: 500; }
.project-progress-bg { flex: 1; height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; }
.project-progress-fill { height: 100%; border-radius: 99px; background: var(--primary); }
.project-pct { font-size: 12px; color: var(--text-muted); min-width: 32px; text-align: right; }
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
.badge-blue { background: rgba(59,130,246,0.12); color: #2563eb; }
.badge-green { background: rgba(22,163,74,0.12); color: #16a34a; }
.badge-orange { background: rgba(234,88,12,0.12); color: #ea580c; }
</style></head>
<body>${nav}
<div class="page">
  <div class="page-title">Good morning, Alex 👋</div>
  <div class="page-subtitle">Here's what's happening with your projects today — Monday, March 2</div>

  <section data-section="stats-grid">
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Tasks Completed</div>
      <div class="stat-value">142</div>
      <div class="stat-delta delta-pos">↑ 12% from last week</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">In Progress</div>
      <div class="stat-value">38</div>
      <div class="stat-delta" style="color:var(--text-faint)">→ No change</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Overdue</div>
      <div class="stat-value" style="color:#dc2626">7</div>
      <div class="stat-delta delta-neg">↑ 3 from yesterday</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Team Velocity</div>
      <div class="stat-value">23</div>
      <div class="stat-delta delta-pos">↑ 8% this sprint</div>
    </div>
  </div>
  </section>

  <div class="main-grid">
    <div>
      <section data-section="chart-area">
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">Sprint Burndown <span style="font-size:12px;font-weight:400;color:var(--text-muted)">Sprint 12 · Mar 1–14</span></div>
        <div class="chart-bars">
          <div class="chart-bar" style="height:100%"></div>
          <div class="chart-bar" style="height:90%"></div>
          <div class="chart-bar" style="height:82%"></div>
          <div class="chart-bar" style="height:71%"></div>
          <div class="chart-bar" style="height:65%"></div>
          <div class="chart-bar" style="height:54%"></div>
          <div class="chart-bar" style="height:48%"></div>
          <div class="chart-bar" style="height:38%"></div>
          <div class="chart-bar" style="height:30%"></div>
          <div class="chart-bar" style="height:20%; opacity:0.4"></div>
          <div class="chart-bar" style="height:14%; opacity:0.3"></div>
          <div class="chart-bar" style="height:8%; opacity:0.2"></div>
          <div class="chart-bar" style="height:4%; opacity:0.15"></div>
          <div class="chart-bar" style="height:2%; opacity:0.1"></div>
        </div>
        <div class="chart-labels">
          <div class="chart-label">Mar 1</div><div class="chart-label">3</div>
          <div class="chart-label">5</div><div class="chart-label">7</div>
          <div class="chart-label">9</div><div class="chart-label">11</div>
          <div class="chart-label">14</div>
          <div class="chart-label"></div><div class="chart-label"></div>
          <div class="chart-label"></div><div class="chart-label"></div>
          <div class="chart-label"></div><div class="chart-label"></div>
          <div class="chart-label"></div>
        </div>
      </div>
      </section>

      <div class="card">
        <div class="card-title">Projects</div>
        <div class="project-row">
          <div class="project-dot" style="background:#6366f1"></div>
          <div class="project-name">TaskFlow Redesign</div>
          <div class="project-progress-bg"><div class="project-progress-fill" style="width:78%"></div></div>
          <div class="project-pct">78%</div>
          <span class="badge badge-blue">Active</span>
        </div>
        <div class="project-row">
          <div class="project-dot" style="background:#16a34a"></div>
          <div class="project-name">API Integration v2</div>
          <div class="project-progress-bg"><div class="project-progress-fill" style="width:45%;background:#16a34a"></div></div>
          <div class="project-pct">45%</div>
          <span class="badge badge-green">On track</span>
        </div>
        <div class="project-row">
          <div class="project-dot" style="background:#ea580c"></div>
          <div class="project-name">Mobile App Beta</div>
          <div class="project-progress-bg"><div class="project-progress-fill" style="width:22%;background:#ea580c"></div></div>
          <div class="project-pct">22%</div>
          <span class="badge badge-orange">At risk</span>
        </div>
      </div>
    </div>

    <section data-section="activity-feed">
    <div class="card">
      <div class="card-title">Recent Activity</div>
      <div class="activity-item">
        <div class="avatar" style="background:#6366f1">AJ</div>
        <div><div class="activity-text"><strong>Alice Johnson</strong> completed <strong>Implement OAuth</strong></div><div class="activity-time">2 min ago</div></div>
      </div>
      <div class="activity-item">
        <div class="avatar" style="background:#16a34a">MK</div>
        <div><div class="activity-text"><strong>Mike Kim</strong> moved <strong>Design System v3</strong> to Review</div><div class="activity-time">18 min ago</div></div>
      </div>
      <div class="activity-item">
        <div class="avatar" style="background:#ea580c">SR</div>
        <div><div class="activity-text"><strong>Sara R.</strong> added comment on <strong>API Rate Limiting</strong></div><div class="activity-time">1h ago</div></div>
      </div>
      <div class="activity-item">
        <div class="avatar" style="background:#8b5cf6">TW</div>
        <div><div class="activity-text"><strong>Tom W.</strong> created sprint <strong>Sprint 13</strong></div><div class="activity-time">2h ago</div></div>
      </div>
      <div class="activity-item">
        <div class="avatar" style="background:#0ea5e9">LS</div>
        <div><div class="activity-text"><strong>Lisa S.</strong> flagged <strong>Payment Gateway</strong> as overdue</div><div class="activity-time">3h ago</div></div>
      </div>
      <div class="activity-item">
        <div class="avatar" style="background:#6366f1">AJ</div>
        <div><div class="activity-text"><strong>Alice Johnson</strong> assigned <strong>Database Migration</strong> to Mike Kim</div><div class="activity-time">4h ago</div></div>
      </div>
    </div>
    </section>
  </div>
</div>
${postMsg}</body></html>`;
}

function generateKanbanScreen(appName, screens, screenId, theme) {
  const themeCSS = getThemeCSS(theme);
  const nav = buildScreenNav(appName, screens, screenId);
  const postMsg = buildPostMessageScript();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Task Board — ${escapeHtml(appName)}</title>
<style>${themeCSS}
body { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.board-header { padding: 16px 24px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.board-title { font-size: 18px; font-weight: 700; }
.board-meta { color: var(--text-muted); font-size: 12px; }
.board-actions { display: flex; gap: 8px; margin-left: auto; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: var(--radius); font-size: 13px; font-weight: 500; border: 1px solid var(--border); cursor: pointer; background: var(--surface); color: var(--text); }
.btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.kanban-board { display: flex; gap: 12px; padding: 16px 24px; overflow-x: auto; flex: 1; }
.kanban-col { background: var(--surface2); border-radius: var(--radius); padding: 12px; min-width: 220px; width: 220px; flex-shrink: 0; display: flex; flex-direction: column; }
.col-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.col-dot { width: 8px; height: 8px; border-radius: 50%; }
.col-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); flex: 1; }
.col-count { font-size: 11px; font-weight: 600; background: var(--border); padding: 1px 7px; border-radius: 99px; color: var(--text-muted); }
.task-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: box-shadow 150ms; }
.task-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.task-priority { height: 3px; border-radius: 99px; margin-bottom: 8px; width: 100%; }
.priority-high { background: #ef4444; }
.priority-med { background: #f59e0b; }
.priority-low { background: #22c55e; }
.task-title { font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.4; }
.task-meta { display: flex; align-items: center; gap: 6px; }
.task-avatar { width: 20px; height: 20px; border-radius: 50%; font-size: 9px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; }
.task-date { font-size: 11px; color: var(--text-faint); margin-left: auto; }
.task-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(99,102,241,0.1); color: var(--primary); }
.task-overdue { border-left: 3px solid #ef4444; }
.add-card-btn { display: flex; align-items: center; gap: 6px; padding: 8px; border-radius: var(--radius); font-size: 12px; color: var(--text-faint); cursor: pointer; border: 1px dashed var(--border); margin-top: 4px; background: transparent; width: 100%; justify-content: center; }
.add-card-btn:hover { background: var(--surface); color: var(--text-muted); }
</style></head>
<body>${nav}
<div class="board-header">
  <div>
    <div class="board-title">Sprint 12 — Task Board</div>
    <div class="board-meta">Mar 1 – 14, 2026 · 12 days remaining · 23 tasks</div>
  </div>
  <div class="board-actions">
    <button class="btn">Filter</button>
    <button class="btn">Group by</button>
    <button class="btn btn-primary">+ Add Task</button>
  </div>
</div>

<section data-section="kanban-board">
<div class="kanban-board">
  <section data-section="column-backlog">
  <div class="kanban-col">
    <div class="col-header">
      <div class="col-dot" style="background:#94a3b8"></div>
      <div class="col-title">Backlog</div>
      <div class="col-count">8</div>
    </div>
    <div class="task-card"><div class="task-priority priority-low"></div><div class="task-title">Onboarding email sequence</div><div class="task-meta"><div class="task-avatar" style="background:#8b5cf6">TW</div><span class="task-tag">Marketing</span><span class="task-date">No date</span></div></div>
    <div class="task-card"><div class="task-priority priority-med"></div><div class="task-title">Dark mode for mobile app</div><div class="task-meta"><div class="task-avatar" style="background:#0ea5e9">LS</div><span class="task-date">Mar 20</span></div></div>
    <div class="task-card"><div class="task-priority priority-low"></div><div class="task-title">Export to CSV feature</div><div class="task-meta"><div class="task-avatar" style="background:#16a34a">MK</div><span class="task-date">Mar 25</span></div></div>
    <button class="add-card-btn">+ Add card</button>
  </div>
  </section>
  <section data-section="column-todo">
  <div class="kanban-col">
    <div class="col-header">
      <div class="col-dot" style="background:#60a5fa"></div>
      <div class="col-title">To Do</div>
      <div class="col-count">5</div>
    </div>
    <div class="task-card"><div class="task-priority priority-high"></div><div class="task-title">Implement user authentication flow</div><div class="task-meta"><div class="task-avatar" style="background:#6366f1">AJ</div><span class="task-date">Mar 5</span></div></div>
    <div class="task-card"><div class="task-priority priority-med"></div><div class="task-title">Design system component audit</div><div class="task-meta"><div class="task-avatar" style="background:#ea580c">SR</div><span class="task-tag">Design</span><span class="task-date">Mar 6</span></div></div>
    <div class="task-card"><div class="task-priority priority-high"></div><div class="task-title">Database schema migration v4</div><div class="task-meta"><div class="task-avatar" style="background:#16a34a">MK</div><span class="task-date">Mar 7</span></div></div>
    <button class="add-card-btn">+ Add card</button>
  </div>
  </section>
  <section data-section="column-inprogress">
  <div class="kanban-col">
    <div class="col-header">
      <div class="col-dot" style="background:#f59e0b"></div>
      <div class="col-title">In Progress</div>
      <div class="col-count">4</div>
    </div>
    <div class="task-card"><div class="task-priority priority-high"></div><div class="task-title">API rate limiting middleware</div><div class="task-meta"><div class="task-avatar" style="background:#0ea5e9">LS</div><span class="task-tag">Backend</span><span class="task-date">Mar 4</span></div></div>
    <div class="task-card task-overdue"><div class="task-priority priority-high"></div><div class="task-title">Fix mobile nav overflow bug</div><div class="task-meta"><div class="task-avatar" style="background:#8b5cf6">TW</div><span style="font-size:11px;color:#ef4444;margin-left:auto;">Overdue</span></div></div>
    <div class="task-card"><div class="task-priority priority-med"></div><div class="task-title">Write API documentation</div><div class="task-meta"><div class="task-avatar" style="background:#ea580c">SR</div><span class="task-date">Mar 8</span></div></div>
    <button class="add-card-btn">+ Add card</button>
  </div>
  </section>
  <section data-section="column-review">
  <div class="kanban-col">
    <div class="col-header">
      <div class="col-dot" style="background:#a78bfa"></div>
      <div class="col-title">Review</div>
      <div class="col-count">3</div>
    </div>
    <div class="task-card"><div class="task-priority priority-med"></div><div class="task-title">Redesign task detail sidebar</div><div class="task-meta"><div class="task-avatar" style="background:#6366f1">AJ</div><span class="task-tag">Design</span><span class="task-date">Mar 3</span></div></div>
    <div class="task-card"><div class="task-priority priority-high"></div><div class="task-title">Implement OAuth with Google</div><div class="task-meta"><div class="task-avatar" style="background:#16a34a">MK</div><span class="task-date">Mar 2</span></div></div>
    <button class="add-card-btn">+ Add card</button>
  </div>
  </section>
  <section data-section="column-done">
  <div class="kanban-col">
    <div class="col-header">
      <div class="col-dot" style="background:#22c55e"></div>
      <div class="col-title">Done</div>
      <div class="col-count">3</div>
    </div>
    <div class="task-card" style="opacity:0.7"><div class="task-priority priority-low"></div><div class="task-title">Set up CI/CD pipeline</div><div class="task-meta"><div class="task-avatar" style="background:#0ea5e9">LS</div><span class="task-date">Mar 1</span></div></div>
    <div class="task-card" style="opacity:0.7"><div class="task-priority priority-med"></div><div class="task-title">Update onboarding copy</div><div class="task-meta"><div class="task-avatar" style="background:#8b5cf6">TW</div><span class="task-date">Feb 28</span></div></div>
    <button class="add-card-btn">+ Add card</button>
  </div>
  </section>
</div>
</section>
${postMsg}</body></html>`;
}

function generateTaskDetailScreen(appName, screens, screenId, theme) {
  const themeCSS = getThemeCSS(theme);
  const nav = buildScreenNav(appName, screens, screenId);
  const postMsg = buildPostMessageScript();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Task Detail — ${escapeHtml(appName)}</title>
<style>${themeCSS}
.container { display: flex; height: calc(100vh - 52px); overflow: hidden; }
.detail-main { flex: 1; overflow-y: auto; padding: 28px 32px; }
.breadcrumb { font-size: 12px; color: var(--text-faint); margin-bottom: 20px; display: flex; align-items: center; gap: 6px; }
.breadcrumb a { color: var(--primary); } .breadcrumb span { color: var(--text-faint); }
.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; background: rgba(245,158,11,0.12); color: #d97706; margin-bottom: 12px; }
.detail-title { font-size: 24px; font-weight: 700; line-height: 1.3; margin-bottom: 20px; }
.section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-bottom: 10px; }
.description { font-size: 14px; color: var(--text-muted); line-height: 1.7; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 24px; }
.subtask { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.subtask input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--primary); }
.subtask.done { color: var(--text-faint); text-decoration: line-through; }
.comment { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
.comment:last-child { border-bottom: none; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; font-size: 11px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.comment-name { font-size: 13px; font-weight: 600; }
.comment-time { font-size: 11px; color: var(--text-faint); margin-left: 6px; }
.comment-text { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-top: 4px; }
.detail-sidebar { width: 260px; border-left: 1px solid var(--border); padding: 24px 20px; overflow-y: auto; background: var(--surface); flex-shrink: 0; }
.meta-field { margin-bottom: 16px; }
.meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-bottom: 6px; }
.meta-value { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
.meta-avatar { width: 22px; height: 22px; border-radius: 50%; font-size: 9px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; }
.priority-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.prio-high { background: rgba(239,68,68,0.12); color: #ef4444; }
.prio-med { background: rgba(245,158,11,0.12); color: #d97706; }
.tag-list { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: rgba(99,102,241,0.1); color: var(--primary); }
.comment-input { width: 100%; border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; font-size: 13px; background: var(--surface); color: var(--text); resize: vertical; min-height: 70px; margin-top: 12px; }
</style></head>
<body>${nav}
<div class="container">
  <section data-section="detail-body">
  <div class="detail-main">
    <div class="breadcrumb"><a href="#">Sprint 12</a> <span>›</span> <span>Implement User Authentication</span></div>
    <section data-section="detail-header">
    <div class="status-badge">⏳ In Progress</div>
    <div class="detail-title">Implement User Authentication Flow</div>
    </section>
    <div class="section-title">Description</div>
    <div class="description">Set up OAuth 2.0 with Google and GitHub providers. Implement session management with JWT tokens, add refresh token rotation, and integrate role-based access control. Ensure all auth endpoints are rate-limited and follow OWASP security guidelines.</div>
    <section data-section="subtasks">
    <div class="section-title" style="margin-bottom:8px;">Subtasks (3/5 completed)</div>
    <div class="subtask done"><input type="checkbox" checked disabled> Set up OAuth provider credentials</div>
    <div class="subtask done"><input type="checkbox" checked disabled> Create auth middleware</div>
    <div class="subtask done"><input type="checkbox" checked disabled> Implement session management</div>
    <div class="subtask"><input type="checkbox"> Add role-based access control</div>
    <div class="subtask"><input type="checkbox"> Write auth unit tests</div>
    </section>
    <br>
    <section data-section="comments">
    <div class="section-title">Comments (3)</div>
    <div class="comment"><div class="comment-avatar" style="background:#6366f1">AJ</div><div><div><span class="comment-name">Alice Johnson</span><span class="comment-time">Today 10:24 AM</span></div><div class="comment-text">Finished the middleware. I'm using a sliding window for rate limiting — let me know if you want a different approach.</div></div></div>
    <div class="comment"><div class="comment-avatar" style="background:#16a34a">MK</div><div><div><span class="comment-name">Mike Kim</span><span class="comment-time">Today 11:02 AM</span></div><div class="comment-text">Sliding window looks good. One question — are we doing refresh token rotation or just a single token?</div></div></div>
    <div class="comment"><div class="comment-avatar" style="background:#6366f1">AJ</div><div><div><span class="comment-name">Alice Johnson</span><span class="comment-time">Today 11:15 AM</span></div><div class="comment-text">Rotation — it's more secure and we need it for the mobile app anyway. Will update the spec.</div></div></div>
    <textarea class="comment-input" placeholder="Add a comment…"></textarea>
    </section>
  </div>
  </section>
  <section data-section="sidebar-meta">
  <div class="detail-sidebar">
    <div class="meta-field"><div class="meta-label">Assignee</div><div class="meta-value"><div class="meta-avatar" style="background:#6366f1">AJ</div>Alice Johnson</div></div>
    <div class="meta-field"><div class="meta-label">Status</div><div class="meta-value"><span style="color:#d97706;font-weight:600;">In Progress</span></div></div>
    <div class="meta-field"><div class="meta-label">Priority</div><div class="meta-value"><span class="priority-badge prio-high">High</span></div></div>
    <div class="meta-field"><div class="meta-label">Due Date</div><div class="meta-value">Mar 5, 2026</div></div>
    <div class="meta-field"><div class="meta-label">Sprint</div><div class="meta-value">Sprint 12</div></div>
    <div class="meta-field"><div class="meta-label">Reporter</div><div class="meta-value"><div class="meta-avatar" style="background:#8b5cf6">TW</div>Tom Wilson</div></div>
    <div class="meta-field"><div class="meta-label">Labels</div><div class="tag-list"><span class="tag">Backend</span><span class="tag">Security</span><span class="tag">Auth</span></div></div>
    <div class="meta-field"><div class="meta-label">Story Points</div><div class="meta-value">5 pts</div></div>
  </div>
  </section>
</div>
${postMsg}</body></html>`;
}

function generateTeamScreen(appName, screens, screenId, theme) {
  const themeCSS = getThemeCSS(theme);
  const nav = buildScreenNav(appName, screens, screenId);
  const postMsg = buildPostMessageScript();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Team Members — ${escapeHtml(appName)}</title>
<style>${themeCSS}
.page { padding: 28px 32px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; }
.page-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.filters { display: flex; gap: 8px; margin-bottom: 20px; }
.filter-btn { padding: 5px 14px; border-radius: var(--radius); border: 1px solid var(--border); font-size: 12px; cursor: pointer; background: var(--surface); color: var(--text); }
.filter-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.member-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.member-avatar { width: 64px; height: 64px; border-radius: 50%; font-size: 22px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; position: relative; }
.status-dot { position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--surface); }
.status-online { background: #22c55e; } .status-away { background: #f59e0b; } .status-offline { background: #94a3b8; }
.member-name { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.member-role { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.workload-label { font-size: 11px; color: var(--text-faint); width: 100%; text-align: left; margin-bottom: 4px; display: flex; justify-content: space-between; }
.workload-bg { width: 100%; height: 4px; background: var(--border); border-radius: 99px; margin-bottom: 12px; }
.workload-fill { height: 100%; border-radius: 99px; background: var(--primary); }
.task-count { font-size: 12px; color: var(--text-faint); }
.availability { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; }
.avail-available { background: rgba(34,197,94,0.12); color: #16a34a; }
.avail-busy { background: rgba(245,158,11,0.12); color: #d97706; }
.avail-away { background: rgba(148,163,184,0.12); color: #64748b; }
.btn { padding: 6px 14px; border-radius: var(--radius); border: 1px solid var(--border); font-size: 12px; cursor: pointer; background: var(--primary); color: #fff; border-color: var(--primary); }
</style></head>
<body>${nav}
<div class="page">
  <div class="page-header">
    <div>
      <div class="page-title">Team Members</div>
      <div class="page-subtitle">6 members · 5 active this week</div>
    </div>
    <button class="btn">+ Invite Member</button>
  </div>
  <section data-section="member-filters">
  <div class="filters">
    <button class="filter-btn active">All Members</button>
    <button class="filter-btn">Team Lead</button>
    <button class="filter-btn">Developer</button>
    <button class="filter-btn">Designer</button>
  </div>
  </section>
  <section data-section="team-grid">
  <div class="team-grid">
    <div class="member-card"><div class="member-avatar" style="background:#6366f1">AJ<div class="status-dot status-online"></div></div><div class="member-name">Alice Johnson</div><div class="member-role">Team Lead · Engineering</div><div class="workload-label"><span>Workload</span><span>75%</span></div><div class="workload-bg"><div class="workload-fill" style="width:75%"></div></div><div class="task-count">8 active tasks</div><br><span class="availability avail-available">Available</span></div>
    <div class="member-card"><div class="member-avatar" style="background:#16a34a">MK<div class="status-dot status-online"></div></div><div class="member-name">Mike Kim</div><div class="member-role">Senior Developer</div><div class="workload-label"><span>Workload</span><span>90%</span></div><div class="workload-bg"><div class="workload-fill" style="width:90%;background:#ea580c"></div></div><div class="task-count">11 active tasks</div><br><span class="availability avail-busy">Busy</span></div>
    <div class="member-card"><div class="member-avatar" style="background:#ea580c">SR<div class="status-dot status-online"></div></div><div class="member-name">Sara Rodriguez</div><div class="member-role">Product Designer</div><div class="workload-label"><span>Workload</span><span>55%</span></div><div class="workload-bg"><div class="workload-fill" style="width:55%;background:#22c55e"></div></div><div class="task-count">5 active tasks</div><br><span class="availability avail-available">Available</span></div>
    <div class="member-card"><div class="member-avatar" style="background:#8b5cf6">TW<div class="status-dot status-away"></div></div><div class="member-name">Tom Wilson</div><div class="member-role">Backend Developer</div><div class="workload-label"><span>Workload</span><span>40%</span></div><div class="workload-bg"><div class="workload-fill" style="width:40%;background:#22c55e"></div></div><div class="task-count">4 active tasks</div><br><span class="availability avail-away">Away</span></div>
    <div class="member-card"><div class="member-avatar" style="background:#0ea5e9">LS<div class="status-dot status-online"></div></div><div class="member-name">Lisa Stern</div><div class="member-role">Frontend Developer</div><div class="workload-label"><span>Workload</span><span>70%</span></div><div class="workload-bg"><div class="workload-fill" style="width:70%"></div></div><div class="task-count">7 active tasks</div><br><span class="availability avail-available">Available</span></div>
    <div class="member-card"><div class="member-avatar" style="background:#f59e0b">DC<div class="status-dot status-offline"></div></div><div class="member-name">David Chen</div><div class="member-role">QA Engineer</div><div class="workload-label"><span>Workload</span><span>20%</span></div><div class="workload-bg"><div class="workload-fill" style="width:20%;background:#22c55e"></div></div><div class="task-count">2 active tasks</div><br><span class="availability avail-away">Offline</span></div>
  </div>
  </section>
</div>
${postMsg}</body></html>`;
}

function generateSettingsScreen(appName, screens, screenId, theme) {
  const themeCSS = getThemeCSS(theme);
  const nav = buildScreenNav(appName, screens, screenId);
  const postMsg = buildPostMessageScript();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Settings — ${escapeHtml(appName)}</title>
<style>${themeCSS}
.settings-layout { display: flex; height: calc(100vh - 52px); }
.settings-sidebar { width: 200px; border-right: 1px solid var(--border); padding: 20px 12px; background: var(--surface); flex-shrink: 0; }
.settings-group-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); padding: 0 8px; margin-bottom: 4px; margin-top: 16px; }
.settings-group-label:first-child { margin-top: 0; }
.settings-link { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: var(--radius); font-size: 13px; color: var(--text-muted); cursor: pointer; transition: all 150ms; margin-bottom: 1px; }
.settings-link:hover { background: var(--surface2); color: var(--text); }
.settings-link.active { background: rgba(99,102,241,0.1); color: var(--primary); font-weight: 500; }
.settings-main { flex: 1; overflow-y: auto; padding: 32px 40px; }
.settings-page-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.settings-page-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 28px; }
.setting-group { margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid var(--border); }
.setting-group:last-child { border-bottom: none; }
.setting-group-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.setting-row:last-child { border-bottom: none; }
.setting-label { font-size: 13px; font-weight: 500; }
.setting-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.input { padding: 7px 12px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-size: 13px; width: 240px; }
.input:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
.toggle-group { display: flex; background: var(--surface2); border-radius: var(--radius); padding: 3px; gap: 2px; }
.toggle-btn { padding: 5px 14px; border-radius: calc(var(--radius) - 2px); font-size: 12px; cursor: pointer; border: none; background: transparent; color: var(--text-muted); transition: all 150ms; }
.toggle-btn.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.switch { position: relative; display: inline-block; width: 38px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: var(--border); border-radius: 99px; cursor: pointer; transition: 200ms; }
.slider:before { content:''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: 200ms; }
input:checked + .slider { background: var(--primary); }
input:checked + .slider:before { transform: translateX(16px); }
.integration-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.integration-icon { width: 36px; height: 36px; border-radius: var(--radius); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 16px; background: var(--surface2); }
.integration-name { font-size: 13px; font-weight: 600; }
.integration-desc { font-size: 12px; color: var(--text-muted); }
.connect-btn { margin-left: auto; padding: 5px 14px; border-radius: var(--radius); font-size: 12px; font-weight: 500; border: 1px solid var(--border); cursor: pointer; background: var(--surface); color: var(--text); }
.connect-btn.connected { background: rgba(34,197,94,0.1); color: #16a34a; border-color: rgba(34,197,94,0.3); }
</style></head>
<body>${nav}
<div class="settings-layout">
  <section data-section="settings-nav">
  <div class="settings-sidebar">
    <div class="settings-group-label">Workspace</div>
    <div class="settings-link active">General</div>
    <div class="settings-link">Members</div>
    <div class="settings-link">Billing</div>
    <div class="settings-group-label">Preferences</div>
    <div class="settings-link">Notifications</div>
    <div class="settings-link">Integrations</div>
    <div class="settings-link">Security</div>
    <div class="settings-group-label">Account</div>
    <div class="settings-link">Profile</div>
    <div class="settings-link" style="color: #ef4444;">Sign Out</div>
  </div>
  </section>
  <div class="settings-main">
    <div class="settings-page-title">General Settings</div>
    <div class="settings-page-sub">Manage your workspace preferences and appearance.</div>
    <section data-section="general-settings">
    <div class="setting-group">
      <div class="setting-group-title">Workspace</div>
      <div class="setting-row"><div><div class="setting-label">Workspace Name</div><div class="setting-desc">Displayed in the app header and emails</div></div><input class="input" type="text" value="My Team"></div>
      <div class="setting-row"><div><div class="setting-label">Workspace URL</div><div class="setting-desc">Your unique workspace identifier</div></div><input class="input" type="text" value="my-team.taskflow.io"></div>
      <div class="setting-row"><div><div class="setting-label">Default Timezone</div><div class="setting-desc">Used for due dates and notifications</div></div><select class="input"><option>America/Los Angeles (PST)</option></select></div>
    </div>
    </section>
    <section data-section="notification-settings">
    <div class="setting-group">
      <div class="setting-group-title">Appearance</div>
      <div class="setting-row"><div><div class="setting-label">Theme</div><div class="setting-desc">Choose interface color scheme</div></div><div class="toggle-group"><button class="toggle-btn">Light</button><button class="toggle-btn">Dark</button><button class="toggle-btn active">System</button></div></div>
      <div class="setting-row"><div><div class="setting-label">Compact Mode</div><div class="setting-desc">Reduce spacing in task lists</div></div><label class="switch"><input type="checkbox"><span class="slider"></span></label></div>
      <div class="setting-row"><div><div class="setting-label">Show Avatars</div><div class="setting-desc">Display member avatars on task cards</div></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
    </div>
    </section>
    <section data-section="integrations">
    <div class="setting-group">
      <div class="setting-group-title">Integrations</div>
      <div class="integration-row"><div class="integration-icon">🐙</div><div><div class="integration-name">GitHub</div><div class="integration-desc">Link commits and PRs to tasks</div></div><button class="connect-btn connected">Connected</button></div>
      <div class="integration-row"><div class="integration-icon">💬</div><div><div class="integration-name">Slack</div><div class="integration-desc">Get task notifications in Slack</div></div><button class="connect-btn connected">Connected</button></div>
      <div class="integration-row"><div class="integration-icon">📅</div><div><div class="integration-name">Google Calendar</div><div class="integration-desc">Sync sprint dates to calendar</div></div><button class="connect-btn">Connect</button></div>
      <div class="integration-row"><div class="integration-icon">🔷</div><div><div class="integration-name">Figma</div><div class="integration-desc">Attach Figma frames to tasks</div></div><button class="connect-btn">Connect</button></div>
    </div>
    </section>
  </div>
</div>
${postMsg}</body></html>`;
}

// Generic screen generator for custom/unknown screens
function generateGenericScreen(screenName, screenDesc, appName, screens, screenId, theme) {
  const themeCSS = getThemeCSS(theme);
  const nav = buildScreenNav(appName, screens, screenId);
  const postMsg = buildPostMessageScript();
  const lower = (screenName + ' ' + screenDesc).toLowerCase();

  let content = '';

  if (/login|sign.?in|auth/.test(lower)) {
    content = `
    <section data-section="login-form">
    <div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 52px);background:var(--bg);">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:40px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-size:28px;font-weight:800;color:var(--primary);margin-bottom:4px;">${escapeHtml(appName)}</div>
          <div style="font-size:14px;color:var(--text-muted);">Sign in to your account</div>
        </div>
        <section data-section="social-buttons">
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <button style="flex:1;padding:9px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">🔵 Google</button>
          <button style="flex:1;padding:9px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">🐙 GitHub</button>
        </div>
        </section>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;"><div style="flex:1;height:1px;background:var(--border)"></div><span style="font-size:11px;color:var(--text-faint);">or continue with email</span><div style="flex:1;height:1px;background:var(--border)"></div></div>
        <input type="email" placeholder="Email address" style="width:100%;padding:10px 12px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;margin-bottom:10px;">
        <input type="password" placeholder="Password" style="width:100%;padding:10px 12px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;margin-bottom:16px;">
        <button style="width:100%;padding:11px;border-radius:var(--radius);background:var(--primary);color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;">Sign In</button>
        <section data-section="footer-links">
        <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-muted);">
          <a href="#" style="color:var(--primary);">Forgot password?</a> · <a href="#" style="color:var(--primary);">Create account</a>
        </div>
        </section>
      </div>
    </div>
    </section>`;
  } else if (/analytics|reports?|chart|metric/.test(lower)) {
    content = `
    <div style="padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${escapeHtml(screenName)}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">${escapeHtml(screenDesc || 'View analytics and reports')}</div>
      <section data-section="metrics-header">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Total Users</div><div style="font-size:32px;font-weight:700;">4,821</div><div style="font-size:12px;color:#16a34a;margin-top:4px;">↑ 18% MoM</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Avg Session</div><div style="font-size:32px;font-weight:700;">24m</div><div style="font-size:12px;color:#16a34a;margin-top:4px;">↑ 3m from last month</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Task Completion</div><div style="font-size:32px;font-weight:700;">87%</div><div style="font-size:12px;color:#dc2626;margin-top:4px;">↓ 2% from last month</div></div>
      </div>
      </section>
      <section data-section="charts-section">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:16px;">User Growth — Last 6 Months</div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:140px;">
          <div style="flex:1;background:var(--primary);opacity:.7;border-radius:4px 4px 0 0;height:55%"></div>
          <div style="flex:1;background:var(--primary);opacity:.8;border-radius:4px 4px 0 0;height:62%"></div>
          <div style="flex:1;background:var(--primary);opacity:.85;border-radius:4px 4px 0 0;height:70%"></div>
          <div style="flex:1;background:var(--primary);opacity:.9;border-radius:4px 4px 0 0;height:80%"></div>
          <div style="flex:1;background:var(--primary);border-radius:4px 4px 0 0;height:90%"></div>
          <div style="flex:1;background:var(--primary);border-radius:4px 4px 0 0;height:100%"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text-faint)">Oct</div>
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text-faint)">Nov</div>
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text-faint)">Dec</div>
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text-faint)">Jan</div>
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text-faint)">Feb</div>
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text-faint)">Mar</div>
        </div>
      </div>
      </section>
    </div>`;
  } else if (/notification/.test(lower)) {
    content = `
    <div style="padding:24px 32px;max-width:600px;">
      <div style="font-size:20px;font-weight:700;margin-bottom:16px;">${escapeHtml(screenName)}</div>
      <section data-section="notification-filters">
      <div style="display:flex;gap:6px;margin-bottom:16px;">
        <button style="padding:4px 14px;border-radius:99px;border:1px solid var(--primary);background:var(--primary);color:#fff;font-size:12px;cursor:pointer;">All</button>
        <button style="padding:4px 14px;border-radius:99px;border:1px solid var(--border);background:var(--surface);font-size:12px;cursor:pointer;">Unread</button>
        <button style="padding:4px 14px;border-radius:99px;border:1px solid var(--border);background:var(--surface);font-size:12px;cursor:pointer;">Mentions</button>
      </div>
      </section>
      <section data-section="notification-list">
      ${['Alice completed "Implement OAuth" in Sprint 12','Mike commented on "Database Migration"','You were assigned to "API Rate Limiting"','Tom created Sprint 13','3 tasks are overdue in your sprint'].map((n, i) => `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;${i < 2 ? 'border-left:3px solid var(--primary)' : ''}">
          <div style="width:8px;height:8px;border-radius:50%;background:${i < 2 ? 'var(--primary)' : 'transparent'};margin-top:5px;flex-shrink:0;border:${i >= 2 ? '2px solid var(--border)' : 'none'}"></div>
          <div style="flex:1;font-size:13px;color:var(--text)">${n}</div>
          <div style="font-size:11px;color:var(--text-faint);white-space:nowrap">${['2m', '20m', '1h', '2h', '3h'][i]} ago</div>
        </div>`).join('')}
      </section>
    </div>`;
  } else {
    // Generic list/table view
    content = `
    <div style="padding:24px 32px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <div style="font-size:20px;font-weight:700;">${escapeHtml(screenName)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(screenDesc || 'Manage and view all items')}</div>
        </div>
        <button style="padding:7px 16px;border-radius:var(--radius);background:var(--primary);color:#fff;font-size:13px;font-weight:500;border:none;cursor:pointer;">+ Add Item</button>
      </div>
      <section data-section="main-content">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:var(--surface2);">
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Name</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Status</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Assignee</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Updated</th>
          </tr></thead>
          <tbody>
            ${['Item Alpha','Item Beta','Item Gamma','Item Delta','Item Epsilon'].map((name, i) =>
              `<tr style="border-top:1px solid var(--border);">
                <td style="padding:12px 16px;font-size:13px;font-weight:500;">${name}</td>
                <td style="padding:12px 16px;"><span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:500;background:${['rgba(34,197,94,.12)','rgba(245,158,11,.12)','rgba(99,102,241,.12)','rgba(34,197,94,.12)','rgba(148,163,184,.12)'][i]};color:${['#16a34a','#d97706','var(--primary)','#16a34a','#64748b'][i]}">${['Active','Pending','In Review','Active','Archived'][i]}</span></td>
                <td style="padding:12px 16px;font-size:13px;color:var(--text-muted);">${['Alice J.','Mike K.','Sara R.','Tom W.','Lisa S.'][i]}</td>
                <td style="padding:12px 16px;font-size:12px;color:var(--text-faint);">${['2 min ago','1h ago','3h ago','Yesterday','2 days ago'][i]}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      </section>
    </div>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(screenName)} — ${escapeHtml(appName)}</title>
<style>${themeCSS}</style></head>
<body>${nav}${content}${postMsg}</body></html>`;
}

/* ============================================================
   MAIN SCREEN DISPATCHER — maps screen name to template
   ============================================================ */
function generateScreenHTML(screen, allScreens, theme) {
  const name = screen.name.toLowerCase();
  const appName = 'TaskFlow';  // Extracted from PRD title if possible

  if (/dashboard|overview|home/.test(name)) {
    return generateDashboardScreen(appName, allScreens, screen.id, theme);
  } else if (/kanban|board|task.?board/.test(name)) {
    return generateKanbanScreen(appName, allScreens, screen.id, theme);
  } else if (/detail|task.?detail|item.?view/.test(name)) {
    return generateTaskDetailScreen(appName, allScreens, screen.id, theme);
  } else if (/team|member|people|user.?list/.test(name)) {
    return generateTeamScreen(appName, allScreens, screen.id, theme);
  } else if (/setting|preference|config/.test(name)) {
    return generateSettingsScreen(appName, allScreens, screen.id, theme);
  } else {
    return generateGenericScreen(screen.name, screen.description || '', appName, allScreens, screen.id, theme);
  }
}

/* ============================================================
   VERSION HISTORY
   ============================================================ */
function saveVersion(prompt = 'Untitled', branchName = null) {
  const branch = branchName || state.versionHistory.currentBranch;
  const id = genId();
  const version = {
    id,
    timestamp: Date.now(),
    prompt,
    screens: deepClone(state.screens),
    parentId: state.versionHistory.currentVersionId,
    branchName: branch,
  };

  if (!state.versionHistory.branches[branch]) {
    state.versionHistory.branches[branch] = [];
  }

  state.versionHistory.versions.push(version);
  state.versionHistory.branches[branch].push(id);
  state.versionHistory.currentVersionId = id;

  renderTimeline();
  updateUndoRedo();
  return id;
}

function restoreVersion(versionId) {
  const version = state.versionHistory.versions.find(v => v.id === versionId);
  if (!version) return;
  state.screens = deepClone(version.screens);
  state.versionHistory.currentVersionId = versionId;
  renderScreenTabs();
  renderScreenList();
  renderPreview();
  renderTimeline();
  updateUndoRedo();
}

function undo() {
  const branch = state.versionHistory.currentBranch;
  const branchVersions = state.versionHistory.branches[branch] || [];
  const idx = branchVersions.indexOf(state.versionHistory.currentVersionId);
  if (idx > 0) {
    restoreVersion(branchVersions[idx - 1]);
  }
}

function redo() {
  const branch = state.versionHistory.currentBranch;
  const branchVersions = state.versionHistory.branches[branch] || [];
  const idx = branchVersions.indexOf(state.versionHistory.currentVersionId);
  if (idx >= 0 && idx < branchVersions.length - 1) {
    restoreVersion(branchVersions[idx + 1]);
  }
}

function updateUndoRedo() {
  const branch = state.versionHistory.currentBranch;
  const branchVersions = state.versionHistory.branches[branch] || [];
  const idx = branchVersions.indexOf(state.versionHistory.currentVersionId);
  document.getElementById('undoBtn').disabled = idx <= 0;
  document.getElementById('redoBtn').disabled = idx >= branchVersions.length - 1;
}

function renderTimeline() {
  const branch = state.versionHistory.currentBranch;
  const branchVersions = (state.versionHistory.branches[branch] || [])
    .map(id => state.versionHistory.versions.find(v => v.id === id))
    .filter(Boolean);

  const dotsEl = document.getElementById('timelineDots');
  const progressEl = document.getElementById('timelineProgress');
  dotsEl.innerHTML = '';

  if (branchVersions.length <= 1) {
    progressEl.style.width = '100%';
    return;
  }

  const currentIdx = branchVersions.findIndex(v => v.id === state.versionHistory.currentVersionId);
  const progressPct = branchVersions.length > 1 ? (currentIdx / (branchVersions.length - 1)) * 100 : 100;
  progressEl.style.width = progressPct + '%';

  branchVersions.forEach((v, i) => {
    const pct = branchVersions.length > 1 ? (i / (branchVersions.length - 1)) * 100 : 50;
    const dot = document.createElement('div');
    dot.className = 'timeline-dot' + (v.id === state.versionHistory.currentVersionId ? ' active' : '');
    dot.style.left = pct + '%';
    dot.title = v.prompt;
    dot.innerHTML = `<span class="timeline-dot-tooltip">${escapeHtml(v.prompt.slice(0, 60))}</span>`;
    dot.addEventListener('click', () => restoreVersion(v.id));
    dotsEl.appendChild(dot);
  });
}

/* ============================================================
   PARSED SECTIONS RENDERER
   ============================================================ */
function renderParsedSections(parsed) {
  const container = document.getElementById('parsedContent');
  const generateBtn = document.getElementById('generateBtnSection');

  const sections = [
    { key: 'screens', title: 'Screens', icon: '🖥', items: parsed.screens.map(s => s.name) },
    { key: 'roles', title: 'User Roles', icon: '👤', items: parsed.roles.map(r => r.name) },
    { key: 'flows', title: 'Key Flows', icon: '↗', items: parsed.flows },
    { key: 'edgeCases', title: 'Edge Cases', icon: '⚠', items: parsed.edgeCases },
    { key: 'dataModels', title: 'Data Models', icon: '🗃', items: parsed.dataModels },
  ];

  container.innerHTML = sections.map(sec => {
    const items = sec.items.length
      ? sec.items.map(item => `
          <span class="parsed-tag">
            ${escapeHtml(item)}
            <button class="parsed-remove" data-key="${sec.key}" data-item="${escapeHtml(item)}" title="Remove" aria-label="Remove ${escapeHtml(item)}">×</button>
          </span>`).join('')
      : '<span style="font-size:var(--text-xs);color:var(--color-text-faint);">None found</span>';

    return `
      <div class="parsed-card" id="parsed-card-${sec.key}">
        <div class="parsed-card-header" data-card="${sec.key}" role="button" tabindex="0" aria-expanded="true">
          <div class="parsed-card-icon" aria-hidden="true">${sec.icon}</div>
          <div class="parsed-card-title">${sec.title}</div>
          <div class="parsed-card-count">${sec.items.length}</div>
          <svg class="parsed-card-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
        </div>
        <div class="parsed-card-body">
          <div class="parsed-tags-wrap" id="parsed-tags-${sec.key}">${items}</div>
          <div class="parsed-add-row">
            <input class="parsed-add-input" type="text" placeholder="Add ${sec.title.toLowerCase()}…" data-add-key="${sec.key}" aria-label="Add item to ${sec.title}">
            <button class="btn btn-secondary btn-sm" data-add-btn="${sec.key}">+</button>
          </div>
        </div>
      </div>`;
  }).join('');

  generateBtn.style.display = 'block';
}

function addParsedItem(key, value) {
  if (!value.trim() || !state.parsedData) return;
  if (key === 'screens') state.parsedData.screens.push({ name: value.trim(), description: '' });
  else if (key === 'roles') state.parsedData.roles.push({ name: value.trim(), description: '' });
  else if (key === 'flows') state.parsedData.flows.push(value.trim());
  else if (key === 'edgeCases') state.parsedData.edgeCases.push(value.trim());
  else if (key === 'dataModels') state.parsedData.dataModels.push(value.trim());
  renderParsedSections(state.parsedData);
}

function removeParsedItem(key, item) {
  if (!state.parsedData) return;
  if (key === 'screens') state.parsedData.screens = state.parsedData.screens.filter(s => s.name !== item);
  else if (key === 'roles') state.parsedData.roles = state.parsedData.roles.filter(r => r.name !== item);
  else if (key === 'flows') state.parsedData.flows = state.parsedData.flows.filter(f => f !== item);
  else if (key === 'edgeCases') state.parsedData.edgeCases = state.parsedData.edgeCases.filter(e => e !== item);
  else if (key === 'dataModels') state.parsedData.dataModels = state.parsedData.dataModels.filter(d => d !== item);
  renderParsedSections(state.parsedData);
}

/* ============================================================
   SCREEN GENERATION
   ============================================================ */
async function generateDesigns() {
  if (!state.parsedData || state.parsedData.screens.length === 0) {
    showToast('No screens to generate. Parse a PRD first.', 'error');
    return;
  }

  // Show generating overlay
  document.getElementById('centerEmptyState').classList.add('hidden');
  document.getElementById('previewWrapper').classList.add('hidden');
  document.getElementById('gridView').classList.add('hidden');
  document.getElementById('generatingOverlay').classList.remove('hidden');

  const steps = [
    'Analyzing screen requirements…',
    'Mapping to UI templates…',
    'Applying design theme…',
    'Generating rich mockups…',
    'Wiring navigation…',
    'Finalizing designs…',
  ];

  let stepIdx = 0;
  const stepEl = document.getElementById('generatingStep');
  const stepInterval = setInterval(() => {
    if (stepIdx < steps.length) stepEl.textContent = steps[stepIdx++];
  }, 300);

  // Simulate async generation
  await new Promise(r => setTimeout(r, 1800));
  clearInterval(stepInterval);

  // Build screens object
  state.screens = {};
  for (const screenDef of state.parsedData.screens) {
    const id = slugify(screenDef.name);
    state.screens[id] = {
      name: screenDef.name,
      description: screenDef.description || '',
      sections: getSectionsForScreen(screenDef.name),
      html: null, // lazy-generated
    };
  }

  // Generate all HTML now
  for (const id of Object.keys(state.screens)) {
    state.screens[id].html = generateScreenHTML(state.screens[id], state.screens, state.currentTheme);
  }

  // Set first screen as active
  state.activeScreenId = Object.keys(state.screens)[0];

  // Save initial version
  saveVersion('Initial generation from PRD');

  // Update scope selector
  updateScopeSelector();

  // Render UI
  document.getElementById('generatingOverlay').classList.add('hidden');
  renderScreenTabs();
  renderScreenList();
  renderSitemap();

  if (state.viewMode === 'grid') {
    showGridView();
  } else {
    showPreviewView();
  }

  // Switch to screens tab
  switchLeftTab('tab-screens');

  showToast(`Generated ${state.parsedData.screens.length} screens successfully!`);
}

function regenerateWithTheme() {
  if (!state.screens || Object.keys(state.screens).length === 0) return;
  for (const id of Object.keys(state.screens)) {
    state.screens[id].html = generateScreenHTML(state.screens[id], state.screens, state.currentTheme);
  }
  renderPreview();
  if (state.viewMode === 'grid') renderGridView();
  saveVersion(`Applied theme: ${getThemeName(state.currentTheme)}`);
  showToast('Theme applied to all screens');
}

function getThemeName(key) {
  if (key === 'custom' && customTheme) return customTheme.name;
  return THEMES[key] ? THEMES[key].name : key;
}

/* ============================================================
   SCREEN TABS & LIST
   ============================================================ */
function renderScreenTabs() {
  const bar = document.getElementById('screenTabsBar');
  if (!state.screens || Object.keys(state.screens).length === 0) {
    bar.innerHTML = '';
    return;
  }
  bar.innerHTML = Object.entries(state.screens).map(([id, s]) => `
    <button class="screen-tab${id === state.activeScreenId ? ' active' : ''}" data-screen-tab="${id}" role="tab" aria-selected="${id === state.activeScreenId}">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
      ${escapeHtml(s.name)}
    </button>`).join('');
}

function renderScreenList() {
  const container = document.getElementById('screenListContainer');
  if (!state.screens || Object.keys(state.screens).length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: var(--space-8) var(--space-4);"><svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/></svg><p class="empty-state-desc">Generate designs to see all screens here.</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="sidebar-section-title">All Screens</div>
    ${Object.entries(state.screens).map(([id, s], i) => `
      <div class="screen-list-item${id === state.activeScreenId ? ' active' : ''}" data-screen-list="${id}" role="button" tabindex="0">
        <span class="screen-list-num">${i + 1}</span>
        <div class="screen-list-dot" aria-hidden="true"></div>
        ${escapeHtml(s.name)}
      </div>`).join('')}`;
}

function switchScreen(id) {
  if (!state.screens[id]) return;
  state.activeScreenId = id;
  renderScreenTabs();
  renderScreenList();
  renderPreview();
  updateScopeScreenSelect();
  document.getElementById('previewScreenLabel').textContent = state.screens[id].name;
}

/* ============================================================
   PREVIEW & GRID VIEW
   ============================================================ */
function renderPreview() {
  if (!state.activeScreenId || !state.screens[state.activeScreenId]) return;
  const screen = state.screens[state.activeScreenId];
  const iframe = document.getElementById('previewIframe');
  iframe.srcdoc = screen.html;
  document.getElementById('previewScreenLabel').textContent = screen.name;
  document.getElementById('browserAddress').textContent = `app.${slugify(screen.name)}.io`;
}

function showPreviewView() {
  state.viewMode = 'preview';
  document.getElementById('previewWrapper').classList.remove('hidden');
  document.getElementById('gridView').classList.add('hidden');
  document.getElementById('previewModeBtn').classList.add('active');
  document.getElementById('previewModeBtn').setAttribute('aria-pressed', 'true');
  document.getElementById('gridModeBtn').classList.remove('active');
  document.getElementById('gridModeBtn').setAttribute('aria-pressed', 'false');
  renderPreview();
}

function showGridView() {
  state.viewMode = 'grid';
  document.getElementById('previewWrapper').classList.add('hidden');
  document.getElementById('gridView').classList.remove('hidden');
  document.getElementById('gridModeBtn').classList.add('active');
  document.getElementById('gridModeBtn').setAttribute('aria-pressed', 'true');
  document.getElementById('previewModeBtn').classList.remove('active');
  document.getElementById('previewModeBtn').setAttribute('aria-pressed', 'false');
  renderGridView();
}

function renderGridView() {
  const container = document.getElementById('gridView');
  container.innerHTML = '';
  if (!state.screens) return;

  for (const [id, screen] of Object.entries(state.screens)) {
    const card = document.createElement('div');
    card.className = 'thumbnail-card' + (id === state.activeScreenId ? ' active' : '');
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', screen.name);

    const wrapper = document.createElement('div');
    wrapper.className = 'thumbnail-iframe-wrapper';

    const iframe = document.createElement('iframe');
    iframe.className = 'thumbnail-iframe';
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', screen.name + ' thumbnail');
    iframe.srcdoc = screen.html;
    // Scale to fit
    wrapper.style.height = '160px';
    iframe.style.transformOrigin = 'top left';
    iframe.style.transform = 'scale(0.2)';
    iframe.style.width = '1200px';
    iframe.style.height = '800px';
    iframe.style.pointerEvents = 'none';

    const label = document.createElement('div');
    label.className = 'thumbnail-label';
    label.textContent = screen.name;

    wrapper.appendChild(iframe);
    card.appendChild(wrapper);
    card.appendChild(label);

    card.addEventListener('click', () => {
      switchScreen(id);
      showPreviewView();
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchScreen(id);
        showPreviewView();
      }
    });

    container.appendChild(card);
  }
}

/* ============================================================
   SCOPE SELECTOR
   ============================================================ */
function updateScopeSelector() {
  updateScopeScreenSelect();
}

function updateScopeScreenSelect() {
  const screenSel = document.getElementById('scopeScreen');
  const sectionSel = document.getElementById('scopeSection');
  const prevVal = screenSel.value;

  screenSel.innerHTML = '<option value="">— Select screen —</option>';
  for (const [id, s] of Object.entries(state.screens || {})) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = s.name;
    if (id === state.activeScreenId) opt.selected = true;
    screenSel.appendChild(opt);
  }

  // If previously had a value restore it
  if (prevVal && state.screens[prevVal]) screenSel.value = prevVal;

  const selectedScreenId = screenSel.value;
  if (selectedScreenId && state.screens[selectedScreenId]) {
    updateScopeSectionSelect(selectedScreenId);
    sectionSel.disabled = false;
  } else {
    sectionSel.innerHTML = '<option value="">— Select section —</option>';
    sectionSel.disabled = true;
  }

  updateScopeIndicator();
}

function updateScopeSectionSelect(screenId) {
  const sectionSel = document.getElementById('scopeSection');
  const screen = state.screens[screenId];
  if (!screen) return;

  const sections = screen.sections || getSectionsForScreen(screen.name);
  sectionSel.innerHTML = '<option value="">— Select section —</option>';
  for (const section of sections) {
    const opt = document.createElement('option');
    opt.value = section;
    opt.textContent = section.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    sectionSel.appendChild(opt);
  }
  sectionSel.disabled = false;

  state.scopeSection = null;
  updateScopeIndicator();
}

function updateScopeIndicator() {
  const screenSel = document.getElementById('scopeScreen');
  const sectionSel = document.getElementById('scopeSection');
  const indicator = document.getElementById('scopeIndicator');
  const indicatorText = document.getElementById('scopeIndicatorText');
  const sendBtn = document.getElementById('sendBtn');

  const screenId = screenSel.value;
  const sectionId = sectionSel.value;

  state.scopeScreen = screenId || null;
  state.scopeSection = sectionId || null;

  if (screenId && sectionId) {
    const screenName = state.screens[screenId]?.name || screenId;
    const sectionName = sectionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    indicator.style.display = 'flex';
    indicatorText.textContent = `Editing: ${screenName} › ${sectionName}`;
    sendBtn.disabled = false;
  } else if (screenId) {
    indicator.style.display = 'flex';
    indicatorText.textContent = `Screen: ${state.screens[screenId]?.name} — select section`;
    sendBtn.disabled = true;
  } else {
    indicator.style.display = 'none';
    sendBtn.disabled = true;
  }
}

/* ============================================================
   AI PROMPT PROCESSOR
   ============================================================ */
function processPrompt(prompt, screenId, sectionId) {
  const screen = state.screens[screenId];
  if (!screen) return null;

  const lower = prompt.toLowerCase();
  let changes = [];
  let newHtml = screen.html;

  // Parse prompt for transformations
  const sectionSelector = `data-section="${sectionId}"`;

  // Color changes
  const colorMatch = lower.match(/(?:change|make|set)\s+(?:color|background|bg)\s+(?:to\s+)?(\w+)/);
  const makeBlueMatch = lower.match(/make.*\b(blue|red|green|purple|orange|teal|indigo|pink|yellow|gray|black|white)\b/);
  const hexMatch = lower.match(/#[0-9a-f]{3,6}/i);

  const targetColor = colorMatch ? colorMatch[1] : (makeBlueMatch ? makeBlueMatch[1] : null);
  const colorMap = {
    blue: '#3b82f6', red: '#ef4444', green: '#22c55e', purple: '#8b5cf6',
    orange: '#f97316', teal: '#14b8a6', indigo: '#6366f1', pink: '#ec4899',
    yellow: '#eab308', gray: '#94a3b8', black: '#1a1a1a', white: '#ffffff',
  };

  if (hexMatch) {
    changes.push(`Changed accent color to ${hexMatch[0]}`);
  } else if (targetColor && colorMap[targetColor]) {
    changes.push(`Changed accent color to ${targetColor} (${colorMap[targetColor]})`);
  }

  // Size changes
  if (/\b(larger|bigger|increase\s+size|make\s+it\s+bigger)\b/.test(lower)) {
    changes.push('Increased element sizes and padding');
  }
  if (/\b(smaller|compact|decrease\s+size|tighter)\b/.test(lower)) {
    changes.push('Decreased element sizes and padding');
  }

  // Count changes
  const countMatch = lower.match(/(\d+)\s+instead\s+of\s+\d+/);
  if (countMatch) {
    changes.push(`Changed count to ${countMatch[1]} items`);
  }

  // Add elements
  if (/\badd\s+(?:a\s+)?button\b/.test(lower)) {
    changes.push('Added button element to section');
  }
  if (/\badd\s+(?:a\s+)?search\s+bar\b/.test(lower)) {
    changes.push('Added search bar to section');
  }
  if (/\badd\s+pagination\b/.test(lower)) {
    changes.push('Added pagination controls');
  }
  if (/\badd\s+(?:a\s+)?filter\b/.test(lower)) {
    changes.push('Added filter controls');
  }

  // Remove elements
  if (/\b(remove|delete|hide)\s+(?:the\s+)?(\w+)\b/.test(lower)) {
    const removeMatch = lower.match(/\b(remove|delete|hide)\s+(?:the\s+)?(\w+[\w\s]*?)(?:\s+from|\s+in|$)/);
    if (removeMatch) {
      changes.push(`Removed "${removeMatch[2].trim()}" from section`);
    }
  }

  // Text changes
  const renameMatch = lower.match(/(?:rename|change\s+text|update\s+text|change\s+title)\s+["']?(.+?)["']?\s+to\s+["']?(.+?)["']?$/);
  if (renameMatch) {
    changes.push(`Renamed "${renameMatch[1]}" to "${renameMatch[2]}"`);
  }

  // Layout changes
  if (/\b(grid|columns|column\s+layout)\b/.test(lower)) {
    changes.push('Changed layout to grid columns');
  }
  if (/\b(rounded|more\s+radius)\b/.test(lower)) {
    changes.push('Increased border-radius on elements');
  }
  if (/\badd\s+shadow\b/.test(lower)) {
    changes.push('Added box-shadow to elements');
  }

  // Font changes
  const fontMatch = lower.match(/(?:change\s+font|use\s+font|switch\s+to)\s+(?:to\s+)?["']?([a-z\s]+)["']?/);
  if (fontMatch) {
    changes.push(`Changed font to ${fontMatch[1].trim()}`);
  }

  // Spacing changes
  if (/\b(more\s+spacing|more\s+padding|increase\s+padding|add\s+padding)\b/.test(lower)) {
    changes.push('Increased padding and spacing');
  }
  if (/\b(less\s+spacing|reduce\s+padding|compact)\b/.test(lower)) {
    changes.push('Reduced padding and spacing');
  }

  if (changes.length === 0) {
    // Generic interpretation
    const words = prompt.split(' ').filter(w => w.length > 3);
    changes.push(`Applied changes based on: "${words.slice(0, 6).join(' ')}"`);
  }

  // Apply actual DOM-style modifications to the HTML string
  newHtml = applyHTMLTransformations(newHtml, sectionId, prompt, lower, colorMap, targetColor, hexMatch);

  return { changes, newHtml };
}

function applyHTMLTransformations(html, sectionId, prompt, lower, colorMap, targetColor, hexMatch) {
  // Find the section in HTML and modify it
  const sectionStart = html.indexOf(`data-section="${sectionId}"`);
  if (sectionStart === -1) return html;

  // Find the full section tag
  const sectionTagStart = html.lastIndexOf('<', sectionStart);
  if (sectionTagStart === -1) return html;

  // Find closing tag
  let depth = 1;
  let pos = html.indexOf('>', sectionStart) + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf('<', pos);
    if (nextOpen === -1) break;
    if (html[nextOpen + 1] === '/') {
      depth--;
      pos = html.indexOf('>', nextOpen) + 1;
    } else if (html[nextOpen + 1] !== '!') {
      // Check for self-closing
      const tagEnd = html.indexOf('>', nextOpen);
      if (html[tagEnd - 1] === '/') {
        pos = tagEnd + 1;
      } else {
        depth++;
        pos = tagEnd + 1;
      }
    } else {
      pos = html.indexOf('>', nextOpen) + 1;
    }
  }

  let sectionHTML = html.substring(sectionTagStart, pos);
  let modifiedSection = sectionHTML;

  // Apply color changes
  const newColor = hexMatch ? hexMatch[0] : (targetColor && colorMap[targetColor] ? colorMap[targetColor] : null);
  if (newColor) {
    modifiedSection = modifiedSection
      .replace(/background:\s*var\(--primary\)/g, `background:${newColor}`)
      .replace(/color:\s*var\(--primary\)/g, `color:${newColor}`)
      .replace(/background:var\(--primary\)/g, `background:${newColor}`);
  }

  // Size changes
  if (/\b(larger|bigger|increase\s+size)\b/.test(lower)) {
    // Increase padding values
    modifiedSection = modifiedSection.replace(/padding:(\s*)(\d+)px/g, (m, sp, n) => `padding:${sp}${Math.round(parseInt(n) * 1.3)}px`);
    // Increase font size in stat values
    modifiedSection = modifiedSection.replace(/font-size:(\s*)(\d+)px(?=;[^}]*stat-value)/g, (m, sp, n) => `font-size:${sp}${Math.round(parseInt(n) * 1.2)}px`);
  }

  if (/\b(smaller|compact)\b/.test(lower)) {
    modifiedSection = modifiedSection.replace(/padding:(\s*)(\d+)px/g, (m, sp, n) => `padding:${sp}${Math.round(parseInt(n) * 0.75)}px`);
  }

  // Add button
  if (/\badd\s+(?:a\s+)?button\b/.test(lower)) {
    const btnLabel = (lower.match(/add\s+(?:a\s+)?"?([^"]+?)"?\s+button/) || [])[1] || 'Action';
    const newBtn = `<button style="padding:8px 16px;border-radius:var(--radius,6px);background:var(--primary,#6366f1);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:500;margin-top:8px;">${escapeHtml(btnLabel.charAt(0).toUpperCase() + btnLabel.slice(1))}</button>`;
    modifiedSection = modifiedSection.replace('</section>', newBtn + '</section>');
  }

  // Add search bar
  if (/\badd\s+(?:a\s+)?search\s+bar\b/.test(lower)) {
    const searchBar = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><input type="search" placeholder="Search…" style="flex:1;padding:8px 12px;border-radius:var(--radius,6px);border:1px solid var(--border,#e2e8f0);background:var(--surface,#fff);color:var(--text,#0f172a);font-size:13px;"></div>`;
    modifiedSection = modifiedSection.replace(/<section[^>]+>/, m => m + searchBar);
  }

  // Add pagination
  if (/\badd\s+pagination\b/.test(lower)) {
    const pagination = `<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 0;margin-top:8px;">${[1,2,3,'…',8].map((p, i) => `<button style="width:28px;height:28px;border-radius:4px;border:1px solid var(--border,#e2e8f0);background:${i===0?'var(--primary,#6366f1)':'transparent'};color:${i===0?'#fff':'var(--text,#0f172a)'};font-size:12px;cursor:pointer;">${p}</button>`).join('')}</div>`;
    modifiedSection = modifiedSection.replace('</section>', pagination + '</section>');
  }

  // Rounded border radius
  if (/\b(more\s+rounded|rounded|increase\s+radius)\b/.test(lower)) {
    modifiedSection = modifiedSection.replace(/border-radius:(\s*)var\(--radius\)/g, 'border-radius:16px');
    modifiedSection = modifiedSection.replace(/border-radius:(\s*)(\d+)px/g, (m, sp, n) => `border-radius:${sp}${Math.min(parseInt(n) * 2, 24)}px`);
  }

  // Add shadow
  if (/\badd\s+shadow\b/.test(lower)) {
    modifiedSection = modifiedSection.replace(/(<div[^>]+class="[^"]*(?:card|stat-card|member-card)[^"]*")/g, '$1 style="box-shadow:0 4px 16px rgba(0,0,0,0.1);"');
  }

  // Count changes: 3 instead of 4 / 2 instead of 3 etc.
  const countMatch = lower.match(/(\d+)\s+instead\s+of\s+(\d+)/);
  if (countMatch) {
    const targetCount = parseInt(countMatch[1]);
    const fromCount = parseInt(countMatch[2]);
    // Remove extra cards if reducing
    if (targetCount < fromCount) {
      const diff = fromCount - targetCount;
      let removed = 0;
      // Find repeated elements and remove extras
      const divMatches = [...modifiedSection.matchAll(/<div class="stat-card">/g)];
      if (divMatches.length >= fromCount) {
        for (let i = 0; i < diff && removed < diff; i++) {
          const lastIdx = modifiedSection.lastIndexOf('<div class="stat-card">');
          if (lastIdx !== -1) {
            const endIdx = modifiedSection.indexOf('</div>', lastIdx) + 6;
            modifiedSection = modifiedSection.slice(0, lastIdx) + modifiedSection.slice(endIdx);
            removed++;
          }
        }
      }
    }
  }

  return html.substring(0, sectionTagStart) + modifiedSection + html.substring(pos);
}

/* ============================================================
   CHAT SYSTEM
   ============================================================ */
function addChatMessage(role, content, scope, items = []) {
  const messages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-message';

  const scopeBadge = scope ? `<span class="chat-message-scope">${escapeHtml(scope)}</span>` : '';
  const sender = role === 'user' ? 'You' : 'DesignFlow AI';
  const time = formatTime(Date.now());

  let itemsHTML = '';
  if (items.length > 0) {
    itemsHTML = `<ul class="msg-list">${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  }

  div.innerHTML = `
    <div class="chat-message-header">
      <span class="chat-message-sender">${sender}</span>
      ${scopeBadge}
      <span class="chat-message-time">${time}</span>
    </div>
    <div class="msg-bubble ${role}">${escapeHtml(content)}${itemsHTML}</div>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function handleSendPrompt() {
  const input = document.getElementById('chatInput');
  const prompt = input.value.trim();
  if (!prompt || !state.scopeScreen || !state.scopeSection) return;

  const screenId = state.scopeScreen;
  const sectionId = state.scopeSection;
  const screen = state.screens[screenId];
  if (!screen) return;

  input.value = '';
  input.style.height = 'auto';

  const scopeLabel = `${screen.name} › ${sectionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  addChatMessage('user', prompt, scopeLabel);

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = '<div class="msg-bubble ai" style="color:var(--color-text-faint)">Applying changes…</div>';
  document.getElementById('chatMessages').appendChild(typingDiv);
  document.getElementById('chatMessages').scrollTop = 999999;

  // Process after brief delay for realism
  await new Promise(r => setTimeout(r, 600));

  const result = processPrompt(prompt, screenId, sectionId);
  document.getElementById('typingIndicator')?.remove();

  if (!result) {
    addChatMessage('ai', 'Could not apply changes. Please try a different prompt.');
    return;
  }

  const { changes, newHtml } = result;

  // Save previous state for diff
  const prevHtml = screen.html;

  // Apply changes
  screen.html = newHtml;

  // Update preview
  renderPreview();

  // AI response
  const screenSection = `${screen.name} › ${sectionId}`;
  addChatMessage(
    'ai',
    `Done! Updated the ${scopeLabel}.`,
    null,
    changes
  );

  // Save version
  saveVersion(prompt.slice(0, 60));

  // Add changelog entry
  addChangelogEntry(prompt, screenSection, prevHtml, newHtml, changes);
}

/* ============================================================
   DIFF / CHANGELOG
   ============================================================ */
function computeDiff(prev, next) {
  const diffLines = [];
  const prevLines = prev.split('\n');
  const nextLines = next.split('\n');

  let added = 0, removed = 0, changed = 0;

  const maxLen = Math.max(prevLines.length, nextLines.length);
  for (let i = 0; i < maxLen; i++) {
    const pl = (prevLines[i] || '').trim();
    const nl = (nextLines[i] || '').trim();
    if (!pl && nl) added++;
    else if (pl && !nl) removed++;
    else if (pl !== nl && pl && nl) changed++;
  }

  if (added > 0) diffLines.push({ type: 'added', text: `+${added} line${added !== 1 ? 's' : ''} added` });
  if (removed > 0) diffLines.push({ type: 'removed', text: `-${removed} line${removed !== 1 ? 's' : ''} removed` });
  if (changed > 0) diffLines.push({ type: 'changed', text: `~${changed} line${changed !== 1 ? 's' : ''} modified` });

  return diffLines;
}

function addChangelogEntry(prompt, scope, prevHtml, nextHtml, changes) {
  const entry = {
    id: genId(),
    timestamp: Date.now(),
    prompt,
    scope,
    changes,
    diff: computeDiff(prevHtml, nextHtml),
    versionId: state.versionHistory.currentVersionId,
  };

  state.changelogEntries.unshift(entry);
  renderChangelog();
}

function renderChangelog() {
  const body = document.getElementById('changelogBody');
  const count = document.getElementById('changelogCount');
  count.textContent = state.changelogEntries.length;

  if (state.changelogEntries.length === 0) {
    body.innerHTML = '<div style="padding: var(--space-3) 0; text-align: center; font-size: var(--text-xs); color: var(--color-text-faint);">No changes yet</div>';
    return;
  }

  body.innerHTML = state.changelogEntries.slice(0, 20).map(entry => `
    <div class="diff-entry">
      <div class="diff-entry-header">
        <span class="diff-version-badge">${entry.versionId ? entry.versionId.slice(0, 6) : 'v?'}</span>
        <span class="diff-prompt">${escapeHtml(entry.prompt.slice(0, 50))}</span>
        <span class="diff-time">${formatTime(entry.timestamp)}</span>
      </div>
      <div class="diff-lines">
        <div style="font-size:10px;color:var(--color-text-faint);margin-bottom:4px;">${escapeHtml(entry.scope)}</div>
        ${entry.diff.map(d => `
          <div class="diff-line ${d.type}">
            <span class="diff-marker">${d.type === 'added' ? '+' : d.type === 'removed' ? '-' : '~'}</span>
            <span>${escapeHtml(d.text)}</span>
          </div>`).join('')}
        ${entry.changes.map(c => `
          <div style="font-size:10px;color:var(--color-text-muted);padding:2px 4px;">• ${escapeHtml(c)}</div>`).join('')}
      </div>
    </div>`).join('');
}

/* ============================================================
   SITEMAP
   ============================================================ */
function renderSitemap() {
  const container = document.getElementById('sitemapContainer');
  const screenList = Object.entries(state.screens || {});
  if (screenList.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: var(--space-8) var(--space-4);"><svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M12 11l-5 6M12 11l5 6"/></svg><p class="empty-state-desc">Screen map appears after designs are generated.</p></div>`;
    return;
  }

  const cols = 3;
  const nodeW = 72;
  const nodeH = 32;
  const colGap = 40;
  const rowGap = 50;
  const svgPad = 12;

  const positions = screenList.map(([id], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id,
      x: svgPad + col * (nodeW + colGap),
      y: svgPad + row * (nodeH + rowGap),
    };
  });

  const totalW = cols * (nodeW + colGap) - colGap + svgPad * 2;
  const totalH = Math.ceil(screenList.length / cols) * (nodeH + rowGap) - rowGap + svgPad * 2;

  // Edges: each connects to the next (sequential nav)
  const edges = [];
  for (let i = 0; i < positions.length - 1; i++) {
    edges.push({ from: i, to: i + 1 });
  }

  const svgLines = edges.map(e => {
    const from = positions[e.from];
    const to = positions[e.to];
    const x1 = from.x + nodeW / 2;
    const y1 = from.y + nodeH;
    const x2 = to.x + nodeW / 2;
    const y2 = to.y;
    return `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" class="sitemap-edge"/>`;
  }).join('');

  const svgDefs = `<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="var(--color-border)"/></marker></defs>`;

  const nodesHTML = positions.map((pos, i) => {
    const [id, screen] = screenList[i];
    return `<div class="sitemap-node${id === state.activeScreenId ? ' active' : ''}"
      style="left:${pos.x}px;top:${pos.y}px;width:${nodeW}px;"
      data-sitemap-node="${id}"
      role="button"
      tabindex="0"
      aria-label="Navigate to ${escapeHtml(screen.name)}">
      ${escapeHtml(screen.name.length > 9 ? screen.name.slice(0, 9) + '…' : screen.name)}
    </div>`;
  }).join('');

  container.innerHTML = `
    <div style="position:relative;width:${totalW}px;height:${totalH}px;min-height:${totalH}px;">
      <svg class="sitemap-svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">${svgDefs}${svgLines}</svg>
      ${nodesHTML}
    </div>`;
}

/* ============================================================
   EXPORT FUNCTIONS
   ============================================================ */
function exportAllHTML() {
  if (!state.screens || Object.keys(state.screens).length === 0) {
    showToast('Generate designs first', 'error');
    return;
  }

  const screens = Object.entries(state.screens);
  const tabButtons = screens.map(([id, s], i) =>
    `<button onclick="showScreen('${id}')" class="tab-btn${i === 0 ? ' active' : ''}" id="tab-${id}">${escapeHtml(s.name)}</button>`
  ).join('');

  const screenDivs = screens.map(([id, s], i) =>
    `<div id="screen-${id}" class="screen-frame" style="display:${i === 0 ? 'block' : 'none'};width:100%;height:calc(100vh - 52px);border:none;overflow:hidden;">
      <iframe srcdoc="${escapeHtml(s.html)}" style="width:100%;height:100%;border:none;"></iframe>
    </div>`
  ).join('');

  const combined = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DesignFlow Export</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,sans-serif;background:#111;}
  .tab-bar{display:flex;gap:4px;padding:8px 16px;background:#1c1b19;border-bottom:1px solid #393836;overflow-x:auto;}
  .tab-btn{padding:6px 14px;border-radius:6px;border:1px solid #393836;background:transparent;color:#797876;font-size:13px;cursor:pointer;}
  .tab-btn.active{background:#4f98a3;color:#fff;border-color:#4f98a3;}
</style>
</head>
<body>
<div class="tab-bar">${tabButtons}</div>
${screenDivs}
<script>
function showScreen(id){
  document.querySelectorAll('.screen-frame').forEach(f=>f.style.display='none');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+id).style.display='block';
  document.getElementById('tab-'+id).classList.add('active');
}
</script>
</body></html>`;

  const blob = new Blob([combined], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'designflow-export.html';
  a.click();
  showToast('Exported as HTML');
}

function exportPNG() {
  const iframe = document.getElementById('previewIframe');
  if (!iframe) { showToast('No preview to capture', 'error'); return; }

  showToast('Capturing screenshot…');
  try {
    if (window.html2canvas) {
      html2canvas(document.getElementById('previewWrapper'), { useCORS: true, scale: 1 })
        .then(canvas => {
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = `designflow-${state.activeScreenId || 'screen'}.png`;
          a.click();
          showToast('PNG exported');
        })
        .catch(() => showToast('PNG export failed', 'error'));
    } else {
      showToast('html2canvas not available', 'error');
    }
  } catch(e) {
    showToast('PNG export failed', 'error');
  }
}

function copyHTML() {
  if (!state.activeScreenId || !state.screens[state.activeScreenId]) {
    showToast('No screen selected', 'error');
    return;
  }
  const html = state.screens[state.activeScreenId].html;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(html).then(() => showToast('HTML copied to clipboard'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = html;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('HTML copied to clipboard');
  }
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchLeftTab(targetId) {
  document.querySelectorAll('.sidebar-tab').forEach(t => {
    const isActive = t.dataset.tabTarget === targetId;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });
  document.querySelectorAll('#app .left-sidebar .sidebar-panel').forEach(p => {
    p.classList.toggle('active', p.id === targetId);
  });
}

/* ============================================================
   DARK / LIGHT TOGGLE
   ============================================================ */
function initThemeToggle() {
  const root = document.documentElement;
  // Default: dark
  root.setAttribute('data-theme', 'dark');
  state.appTheme = 'dark';

  const toggle = document.getElementById('darkLightToggle');
  toggle.addEventListener('click', () => {
    state.appTheme = state.appTheme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', state.appTheme);
    toggle.innerHTML = state.appTheme === 'dark'
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    toggle.setAttribute('aria-label', `Switch to ${state.appTheme === 'dark' ? 'light' : 'dark'} mode`);
  });
}

/* ============================================================
   BRANCH MANAGEMENT
   ============================================================ */
function openBranchModal() {
  document.getElementById('branchModal').classList.remove('hidden');
  document.getElementById('branchNameInput').focus();
  document.getElementById('branchNameInput').value = '';
}

function closeBranchModal() {
  document.getElementById('branchModal').classList.add('hidden');
}

function createBranch(name) {
  if (!name.trim()) return;
  const branchName = slugify(name.trim());
  if (state.versionHistory.branches[branchName]) {
    showToast(`Branch "${branchName}" already exists`, 'error');
    return;
  }
  // Create new branch from current state
  state.versionHistory.branches[branchName] = [...(state.versionHistory.branches[state.versionHistory.currentBranch] || [])];
  state.versionHistory.currentBranch = branchName;
  document.getElementById('branchName').textContent = branchName;
  closeBranchModal();
  showToast(`Created branch: ${branchName}`);
  renderTimeline();
}

/* ============================================================
   EVENT BINDINGS
   ============================================================ */
function bindEvents() {
  // Left sidebar tabs
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => switchLeftTab(tab.dataset.tabTarget));
  });

  // Parse PRD
  document.getElementById('parsePrdBtn').addEventListener('click', () => {
    const text = document.getElementById('prdInput').value;
    if (!text.trim()) { showToast('Enter a PRD first', 'error'); return; }
    state.parsedData = parsePRD(text);
    renderParsedSections(state.parsedData);
    switchLeftTab('tab-parsed');
    showToast(`Parsed: ${state.parsedData.screens.length} screens, ${state.parsedData.roles.length} roles, ${state.parsedData.flows.length} flows`);
  });

  // Clear PRD
  document.getElementById('clearPrdBtn').addEventListener('click', () => {
    if (confirm('Clear PRD text?')) {
      document.getElementById('prdInput').value = '';
    }
  });

  // Generate designs
  document.getElementById('generateDesignsBtn').addEventListener('click', generateDesigns);

  // Center start button
  document.getElementById('centerStartBtn').addEventListener('click', () => {
    switchLeftTab('tab-prd');
    // Auto-parse and generate
    const prdText = document.getElementById('prdInput').value;
    if (prdText.trim()) {
      state.parsedData = parsePRD(prdText);
      generateDesigns();
    } else {
      showToast('Add a PRD first', 'error');
    }
  });

  // Screen tab clicks
  document.getElementById('screenTabsBar').addEventListener('click', e => {
    const tab = e.target.closest('[data-screen-tab]');
    if (tab) switchScreen(tab.dataset.screenTab);
  });

  // Screen list clicks
  document.getElementById('screenListContainer').addEventListener('click', e => {
    const item = e.target.closest('[data-screen-list]');
    if (item) {
      switchScreen(item.dataset.screenList);
      if (state.viewMode === 'grid') showPreviewView();
    }
  });

  document.getElementById('screenListContainer').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const item = e.target.closest('[data-screen-list]');
      if (item) { e.preventDefault(); switchScreen(item.dataset.screenList); }
    }
  });

  // View mode toggles
  document.getElementById('previewModeBtn').addEventListener('click', showPreviewView);
  document.getElementById('gridModeBtn').addEventListener('click', showGridView);

  // Refresh preview
  document.getElementById('refreshPreviewBtn').addEventListener('click', renderPreview);

  // Scope selector
  document.getElementById('scopeScreen').addEventListener('change', e => {
    const screenId = e.target.value;
    if (screenId && state.screens[screenId]) {
      state.scopeScreen = screenId;
      updateScopeSectionSelect(screenId);
      // Also switch active preview
      switchScreen(screenId);
    } else {
      document.getElementById('scopeSection').innerHTML = '<option value="">— Select section —</option>';
      document.getElementById('scopeSection').disabled = true;
      state.scopeScreen = null;
    }
    updateScopeIndicator();
  });

  document.getElementById('scopeSection').addEventListener('change', e => {
    state.scopeSection = e.target.value || null;
    updateScopeIndicator();
  });

  // Chat send
  document.getElementById('sendBtn').addEventListener('click', handleSendPrompt);

  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  });

  // Auto-resize chat textarea
  document.getElementById('chatInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Changelog toggle
  document.getElementById('changelogToggle').addEventListener('click', () => {
    const body = document.getElementById('changelogBody');
    const chevron = document.getElementById('changelogChevron');
    const isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed', !isCollapsed);
    chevron.style.transform = isCollapsed ? '' : 'rotate(180deg)';
    document.getElementById('changelogToggle').setAttribute('aria-expanded', isCollapsed);
  });

  document.getElementById('changelogToggle').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') e.target.click();
  });

  // Export dropdown
  document.getElementById('exportBtn').addEventListener('click', e => {
    e.stopPropagation();
    const menu = document.getElementById('exportMenu');
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isOpen);
    document.getElementById('exportBtn').setAttribute('aria-expanded', !isOpen);
  });

  document.getElementById('exportMenu').addEventListener('click', e => {
    const item = e.target.closest('[data-export]');
    if (!item) return;
    const type = item.dataset.export;
    document.getElementById('exportMenu').classList.remove('open');
    if (type === 'html') exportAllHTML();
    else if (type === 'png') exportPNG();
    else if (type === 'copy') copyHTML();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#exportDropdown')) {
      document.getElementById('exportMenu').classList.remove('open');
      document.getElementById('exportBtn').setAttribute('aria-expanded', 'false');
    }
    if (!e.target.closest('#themeSelector')) {
      document.getElementById('themePopover').classList.remove('open');
      document.getElementById('themeSelectorBtn').setAttribute('aria-expanded', 'false');
    }
  });

  // Theme selector
  document.getElementById('themeSelectorBtn').addEventListener('click', e => {
    e.stopPropagation();
    const popover = document.getElementById('themePopover');
    const isOpen = popover.classList.contains('open');
    popover.classList.toggle('open', !isOpen);
    document.getElementById('themeSelectorBtn').setAttribute('aria-expanded', !isOpen);
  });

  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const preset = option.dataset.themePreset;
      if (!preset) return;
      state.currentTheme = preset;
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      const theme = THEMES[preset];
      document.getElementById('themeNameLabel').textContent = theme.name;
      document.getElementById('themeDot').style.background = theme.primary;
      regenerateWithTheme();
      document.getElementById('themePopover').classList.remove('open');
    });
  });

  document.getElementById('applyCustomTheme').addEventListener('click', () => {
    const color = document.getElementById('customColor').value;
    const font = document.getElementById('customFont').value;
    const fontMap = {
      'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      'Plus Jakarta Sans': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
      'IBM Plex Sans': 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
      'DM Sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap',
      'Geist': 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap',
      'Nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
      'Lato': 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
    };
    customTheme = {
      name: 'Custom',
      primary: color,
      primaryHover: color,
      bg: '#ffffff',
      surface: '#f8fafc',
      surface2: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#64748b',
      textFaint: '#94a3b8',
      border: '#e2e8f0',
      font,
      fontUrl: fontMap[font] || fontMap['Inter'],
      radius: '8px',
      radiusLg: '12px',
      baseFontSize: '14px',
    };
    state.currentTheme = 'custom';
    document.getElementById('themeNameLabel').textContent = 'Custom';
    document.getElementById('themeDot').style.background = color;
    regenerateWithTheme();
    document.getElementById('themePopover').classList.remove('open');
    showToast('Custom theme applied');
  });

  // Undo/Redo
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  document.addEventListener('keydown', e => {
    const isMac = /Mac/.test(navigator.platform);
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (mod && e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); }
    if (mod && e.key === 'y') { e.preventDefault(); redo(); }
  });

  // Branch button
  document.getElementById('branchBadge').addEventListener('click', openBranchModal);
  document.getElementById('cancelBranchBtn').addEventListener('click', closeBranchModal);
  document.getElementById('branchModal').addEventListener('click', e => {
    if (e.target === document.getElementById('branchModal')) closeBranchModal();
  });
  document.getElementById('confirmBranchBtn').addEventListener('click', () => {
    createBranch(document.getElementById('branchNameInput').value);
  });
  document.getElementById('branchNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') createBranch(document.getElementById('branchNameInput').value);
    if (e.key === 'Escape') closeBranchModal();
  });

  // Parsed section interactions (delegated)
  document.getElementById('parsedContent').addEventListener('click', e => {
    // Collapse/expand cards
    const header = e.target.closest('.parsed-card-header');
    if (header) {
      const card = header.closest('.parsed-card');
      card.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', !card.classList.contains('collapsed'));
    }
    // Remove tag
    const removeBtn = e.target.closest('.parsed-remove');
    if (removeBtn) {
      removeParsedItem(removeBtn.dataset.key, removeBtn.dataset.item);
    }
    // Add button
    const addBtn = e.target.closest('[data-add-btn]');
    if (addBtn) {
      const key = addBtn.dataset.addBtn;
      const input = document.querySelector(`[data-add-key="${key}"]`);
      if (input) { addParsedItem(key, input.value); input.value = ''; }
    }
  });

  document.getElementById('parsedContent').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const input = e.target.closest('[data-add-key]');
      if (input) {
        addParsedItem(input.dataset.addKey, input.value);
        input.value = '';
      }
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const header = e.target.closest('.parsed-card-header');
      if (header) { e.preventDefault(); header.click(); }
    }
  });

  // Sitemap node clicks (delegated)
  document.getElementById('sitemapContainer').addEventListener('click', e => {
    const node = e.target.closest('[data-sitemap-node]');
    if (node) {
      switchScreen(node.dataset.sitemapNode);
      switchLeftTab('tab-screens');
    }
  });

  document.getElementById('sitemapContainer').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const node = e.target.closest('[data-sitemap-node]');
      if (node) { e.preventDefault(); switchScreen(node.dataset.sitemapNode); }
    }
  });

  // Listen for postMessage from preview iframes (screen navigation)
  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'navigate' && e.data.screenId) {
      switchScreen(e.data.screenId);
    }
  });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
function init() {
  // Pre-load sample PRD
  document.getElementById('prdInput').value = SAMPLE_PRD;

  // Initialize theme toggle
  initThemeToggle();

  // Bind all events
  bindEvents();

  // Initialize timeline
  renderTimeline();

  console.log('DesignFlow AI initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
