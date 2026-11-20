// Coursair - Offline Course Dashboard & Player
// State Management
const state = {
  currentCourse: null,
  curriculum: null,
  activeLesson: null,
  progress: { completed: {}, lastWatched: null, notes: [] },
  preferences: { playbackSpeed: 1, volume: 1 },
  courses: [],
  allLessonsFlat: [],
  autoPlayTimer: null,
  mediaReady: false,   // true once the current video's metadata loaded and any resume seek happened
  playerUrls: [],      // object URLs to revoke on the next lesson load
  subtitlesOn: true,
  samplePath: null,
  dashFilter: 'all',
  dashQuery: '',
  dashNotice: null
};

// DOM Elements
const currentCourseTitle = document.getElementById('current-course-title');
const curriculumList = document.getElementById('curriculum-list');
const progressCircle = document.getElementById('progress-circle');
const progressPercentText = document.getElementById('progress-percent-text');
const progressCountText = document.getElementById('progress-count-text');

// Player DOM
const videoPlayer = document.getElementById('main-video-player');
let subtitleTrack = document.getElementById('main-subtitle-track');
const videoContainer = document.getElementById('video-container');
const documentContainer = document.getElementById('document-container');
const docTitle = document.getElementById('doc-title');
const docPdfFrame = document.getElementById('doc-pdf-frame');
const docMarkdownContent = document.getElementById('doc-markdown-content');
const docOpenExternalBtn = document.getElementById('doc-open-external-btn');

// Video Controls DOM
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const videoSeekBar = document.getElementById('video-seek-bar');
const seekProgressFill = document.getElementById('seek-progress-fill');
const currentTimeText = document.getElementById('current-time-text');
const durationTimeText = document.getElementById('duration-time-text');
const speedButtons = document.querySelectorAll('.speed-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const theaterBtn = document.getElementById('theater-btn');
const subtitlesToggleBtn = document.getElementById('subtitles-toggle-btn');

// Breadcrumbs & Lesson bar
const breadcrumbSection = document.getElementById('breadcrumb-section');
const breadcrumbLesson = document.getElementById('breadcrumb-lesson');
const toggleCompleteBtn = document.getElementById('toggle-complete-btn');
const completeBtnText = document.getElementById('complete-btn-text');
const prevLessonBtn = document.getElementById('prev-lesson-btn');
const nextLessonBtn = document.getElementById('next-lesson-btn');

// Autoplay Overlay
const autoplayOverlay = document.getElementById('autoplay-next-overlay');
const autoplayLessonTitle = document.getElementById('autoplay-lesson-title');
const cancelAutoplayBtn = document.getElementById('cancel-autoplay-btn');
const playNextNowBtn = document.getElementById('play-next-now-btn');

// Notes & Panels
const noteCurrentTimeLabel = document.getElementById('note-current-time-label');
const newNoteInput = document.getElementById('new-note-input');
const addNoteBtn = document.getElementById('add-note-btn');
const notesList = document.getElementById('notes-list');
const notesBadgeCount = document.getElementById('notes-badge-count');
const resourcesBadgeCount = document.getElementById('resources-badge-count');
const resourcesList = document.getElementById('resources-list');
const exportNotesBtn = document.getElementById('export-notes-btn');
const panelTabButtons = document.querySelectorAll('.panel-tab-btn');

// Stats tab
const statTotalLessons = document.getElementById('stat-total-lessons');
const statTotalVideos = document.getElementById('stat-total-videos');
const statTotalDocs = document.getElementById('stat-total-docs');
const statCompletedLessons = document.getElementById('stat-completed-lessons');
const statCoursePath = document.getElementById('stat-course-path');

// Search & Modals
const lessonSearchInput = document.getElementById('lesson-search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const courseSelectorBtn = document.getElementById('course-selector-btn');
const courseModal = document.getElementById('course-modal');
const closeCourseModalBtn = document.getElementById('close-course-modal-btn');
const addCourseNavBtn = document.getElementById('add-course-nav-btn');
const coursePathInput = document.getElementById('course-path-input');
const submitAddCourseBtn = document.getElementById('submit-add-course-btn');
const browseFolderDialogBtn = document.getElementById('browse-folder-dialog-btn');
const browseBtnText = document.getElementById('browse-btn-text');
const browserFolderInput = document.getElementById('browser-folder-input');
const quickFolderChips = document.getElementById('quick-folder-chips');
const modalCoursesList = document.getElementById('modal-courses-list');
const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeShortcutsModalBtn = document.getElementById('close-shortcuts-modal-btn');
const expandAllBtn = document.getElementById('expand-all-btn');
const collapseAllBtn = document.getElementById('collapse-all-btn');

// Layout, theme & extra player controls
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const stagePrevBtn = document.getElementById('stage-prev-btn');
const stageNextBtn = document.getElementById('stage-next-btn');
const volumeBtn = document.getElementById('volume-btn');
const volumeOnIcon = document.getElementById('volume-on-icon');
const volumeOffIcon = document.getElementById('volume-off-icon');
const resumeToast = document.getElementById('resume-toast');
const resumeToastText = document.getElementById('resume-toast-text');
const resumeStartOverBtn = document.getElementById('resume-start-over-btn');

// ---------- Theme (light / dark) ----------
const THEME_KEY = 'coursair-theme';
const systemDarkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function getSavedTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch (e) {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
}

// Follow the OS setting until the user picks a theme explicitly.
if (systemDarkQuery && systemDarkQuery.addEventListener) {
  systemDarkQuery.addEventListener('change', (e) => {
    if (!getSavedTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });
}

// ---------- Icons ----------
const ICONS = {
  video: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>',
  audio: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>',
  document: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  note: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  code: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  archive: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
  file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
  folder: '<svg class="folder-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  paperclip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  chevronDown: '<svg class="section-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
};

// Helper: Format seconds to mm:ss or hh:mm:ss
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Media Icon Picker
function getMediaIcon(type) {
  return ICONS[type] || ICONS.file;
}

// Simple Markdown to HTML Parser
function renderMarkdown(md) {
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/```([a-z]*)\n([\s\S]*?)```/gm, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
    .replace(/^- \[(x| )\] (.*$)/gim, (match, checked, text) => {
      const isChecked = checked.toLowerCase() === 'x' ? 'checked disabled' : 'disabled';
      return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;"><input type="checkbox" ${isChecked}> <span>${text}</span></div>`;
    })
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '<p></p>')
    .replace(/\n/gim, '<br>');
  return html;
}

// ---------- Routing: #/ = dashboard, #/course/<id> = player ----------
function currentRoute() {
  const m = location.hash.match(/^#\/course\/(.+)$/);
  return m ? { view: 'course', id: decodeURIComponent(m[1]) } : { view: 'dashboard' };
}

function courseHash(id) {
  return '#/course/' + encodeURIComponent(id);
}

// Navigate to a course; re-runs the route even if the hash is already that course
function openCourse(id) {
  const target = courseHash(id);
  if (location.hash === target) handleRoute();
  else location.hash = target;
}

function goDashboard() {
  if (location.hash === '#/' || location.hash === '') handleRoute();
  else location.hash = '#/';
}

function showView(view) {
  document.body.classList.toggle('view-dashboard', view === 'dashboard');
  document.body.classList.toggle('view-player', view === 'player');
  document.title = view === 'player' && state.currentCourse ? `${state.currentCourse.name} · Coursair` : 'My learning · Coursair';
}

// Stop playback and save the spot when leaving the player
function leavePlayer() {
  if (!document.body.classList.contains('view-player')) return;
  flushPosition();
  videoPlayer.pause();
  cancelAutoplay();
  hideResumeToast();
}

async function handleRoute() {
  const route = currentRoute();
  if (route.view === 'course') {
    const loaded = state.currentCourse && state.currentCourse.id === route.id;
    // Browser-picked courses live only in memory: keep them as they are
    if (loaded && state.currentCourse.isLocalFiles) {
      showView('player');
      return;
    }
    showView('player');
    const ok = await selectCourse(route.id);
    if (!ok) {
      state.dashNotice = route.id.startsWith('local_')
        ? 'Courses opened with "Choose a course folder" have to be picked again after the page reloads.'
        : 'That course could not be opened. Its folder may have been moved, renamed or deleted.';
      goDashboard();
      return;
    }
    showView('player');
  } else {
    leavePlayer();
    showView('dashboard');
    await refreshCoursesList();
    renderDashboard();
    window.scrollTo(0, 0);
  }
}

// ---------- Dashboard ----------
const dashGreeting = document.getElementById('dash-greeting');
const dashNotice = document.getElementById('dash-notice');
const dashContent = document.getElementById('dash-content');
const dashStats = document.getElementById('dash-stats');
const dashContinue = document.getElementById('dash-continue');
const dashGrid = document.getElementById('dash-grid');
const dashEmpty = document.getElementById('dash-empty');
const dashSearchInput = document.getElementById('dash-search-input');
const dashFilterButtons = document.querySelectorAll('.dash-filter');
const dashAddBtn = document.getElementById('dash-add-btn');
const dashEmptyAddBtn = document.getElementById('dash-empty-add-btn');
const dashSampleBtn = document.getElementById('dash-sample-btn');

const PLAY_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4"/></svg>';
const DOTS_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';

function courseStats(c) {
  const total = c.totalLessons || 0;
  const done = Math.min(c.completedCount || 0, total);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const started = done > 0 || !!(c.lastWatched && c.lastWatched.path);
  const status = total > 0 && done >= total ? 'done' : started ? 'progress' : 'new';
  const lastActivity = c.lastWatched && c.lastWatched.updatedAt ? Date.parse(c.lastWatched.updatedAt) || 0 : 0;
  return { total, done, pct, status, lastActivity };
}

// Deterministic cover colours from the course name
function coverStyle(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return `background: linear-gradient(135deg, hsl(${hue} 58% 44%), hsl(${(hue + 50) % 360} 62% 30%));`;
}

function courseInitials(name) {
  const words = String(name).replace(/\(.*?\)/g, ' ').split(/[^A-Za-z0-9]+/).filter(w => w.length > 1 || /\d/.test(w));
  const letters = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return letters || '?';
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60, h = m / 60, d = h / 24;
  if (m < 60) return `${Math.floor(m)} min ago`;
  if (h < 24) return `${Math.floor(h)} h ago`;
  if (d < 2) return 'yesterday';
  if (d < 30) return `${Math.floor(d)} days ago`;
  return new Date(ts).toLocaleDateString();
}

function progressBlock(s) {
  return `
    <div class="course-progress${s.status === 'done' ? ' done' : ''}">
      <div class="course-progress-bar"><span style="width:${s.pct}%"></span></div>
      <div class="course-progress-label"><span>${s.done} of ${s.total} lessons</span><strong>${s.status === 'done' ? 'Completed' : s.pct + '%'}</strong></div>
    </div>`;
}

function renderDashboard() {
  const items = state.courses.map(c => ({ c, s: courseStats(c) }));

  if (state.dashNotice) {
    dashNotice.textContent = state.dashNotice;
    dashNotice.classList.remove('hidden');
    state.dashNotice = null;
  } else {
    dashNotice.classList.add('hidden');
  }

  const isEmpty = items.length === 0;
  dashEmpty.classList.toggle('hidden', !isEmpty);
  dashContent.classList.toggle('hidden', isEmpty);
  dashSampleBtn.classList.toggle('hidden', !state.samplePath);
  if (isEmpty) {
    dashGreeting.textContent = 'Turn your downloaded courses into a learning dashboard.';
    return;
  }

  // Summary numbers
  const inProgress = items.filter(i => i.s.status === 'progress').length;
  const completed = items.filter(i => i.s.status === 'done').length;
  const lessonsDone = items.reduce((n, i) => n + i.s.done, 0);
  const lessonsTotal = items.reduce((n, i) => n + i.s.total, 0);
  dashGreeting.textContent = inProgress
    ? `You have ${inProgress} course${inProgress === 1 ? '' : 's'} in progress. Pick up where you left off.`
    : 'Start a course to begin tracking your progress.';
  dashStats.innerHTML = `
    <div class="dash-stat"><dt>Courses</dt><dd>${items.length}</dd></div>
    <div class="dash-stat"><dt>In progress</dt><dd>${inProgress}</dd></div>
    <div class="dash-stat"><dt>Completed</dt><dd>${completed}</dd></div>
    <div class="dash-stat"><dt>Lessons done</dt><dd>${lessonsDone} <small>/ ${lessonsTotal}</small></dd></div>
  `;

  // Continue learning: most recently watched, unfinished, folder still present
  const recent = items
    .filter(i => i.c.exists !== false && i.s.lastActivity && i.s.status !== 'done')
    .sort((a, b) => b.s.lastActivity - a.s.lastActivity)[0];
  if (recent) {
    const { c, s } = recent;
    const lw = c.lastWatched || {};
    const at = lw.time > 0 ? ` · ${formatTime(lw.time)} in` : '';
    dashContinue.innerHTML = `
      <a class="course-card-link" href="${courseHash(c.id)}" tabindex="-1" aria-hidden="true">
        <div class="course-cover" style="${coverStyle(c.name)}">
          <span class="course-cover-initials">${escapeHtml(courseInitials(c.name))}</span>
        </div>
      </a>
      <div class="continue-body">
        <div class="continue-eyebrow">Continue learning</div>
        <div class="continue-course">${escapeHtml(c.name)}</div>
        <div class="continue-lesson">${escapeHtml(lw.title || 'Next lesson')}${at} · ${escapeHtml(timeAgo(s.lastActivity))}</div>
        <div class="continue-foot">
          ${progressBlock(s)}
          <a class="btn btn-primary" href="${courseHash(c.id)}">${PLAY_SVG.replace('22', '16').replace('22', '16')}<span>Resume</span></a>
        </div>
      </div>
    `;
    dashContinue.classList.remove('hidden');
  } else {
    dashContinue.classList.add('hidden');
  }

  // Filter counts
  const counts = { all: items.length, progress: inProgress, new: items.filter(i => i.s.status === 'new').length, done: completed };
  dashFilterButtons.forEach(btn => {
    const f = btn.dataset.filter;
    btn.classList.toggle('active', f === state.dashFilter);
    btn.setAttribute('aria-selected', String(f === state.dashFilter));
    const label = btn.textContent.replace(/\s*\d+$/, '');
    btn.innerHTML = `${escapeHtml(label)}<span class="count">${counts[f]}</span>`;
  });

  // Grid
  const q = state.dashQuery.trim().toLowerCase();
  const shown = items
    .filter(i => state.dashFilter === 'all' || i.s.status === state.dashFilter)
    .filter(i => !q || i.c.name.toLowerCase().includes(q) || (i.c.path || '').toLowerCase().includes(q))
    .sort((a, b) => (b.s.lastActivity - a.s.lastActivity) || (Date.parse(b.c.addedAt || 0) - Date.parse(a.c.addedAt || 0)));

  dashGrid.innerHTML = '';
  shown.forEach(({ c, s }) => dashGrid.appendChild(createCourseCard(c, s)));

  if (shown.length === 0) {
    dashGrid.innerHTML = `<div class="empty-state grid-empty">No courses match ${q ? 'your search' : 'this filter'}.</div>`;
  } else if (state.dashFilter === 'all' && !q) {
    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'add-course-card';
    addCard.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add a course</span>`;
    addCard.onclick = openCourseModal;
    dashGrid.appendChild(addCard);
  }
}

function createCourseCard(c, s) {
  const missing = c.exists === false;
  const card = document.createElement('article');
  card.className = `course-card${missing ? ' is-missing' : ''}`;

  const lw = c.lastWatched;
  const lastLine = missing
    ? `<div class="course-card-missing" title="${escapeHtml(c.path)}">Folder not found</div>`
    : lw && lw.title
      ? `<div class="course-card-last" title="${escapeHtml(lw.title)}">Last: ${escapeHtml(lw.title)} · ${escapeHtml(timeAgo(s.lastActivity))}</div>`
      : `<div class="course-card-last">Not started yet</div>`;

  const cover = `
    <div class="course-cover" style="${coverStyle(c.name)}">
      <span class="course-cover-initials">${escapeHtml(courseInitials(c.name))}</span>
      <span class="course-cover-badge">${c.totalVideos || 0} video${c.totalVideos === 1 ? '' : 's'}</span>
      ${missing ? '' : `<span class="course-cover-play"><span>${PLAY_SVG}</span></span>`}
    </div>`;
  const title = `<h3 class="course-card-title" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h3>`;
  const href = courseHash(c.id);

  card.innerHTML = `
    ${missing ? cover : `<a class="course-card-link" href="${href}" tabindex="-1" aria-hidden="true">${cover}</a>`}
    <button type="button" class="course-card-menu-btn" aria-label="Course options" aria-haspopup="true">${DOTS_SVG}</button>
    <div class="course-card-body">
      ${missing ? title : `<a class="course-card-link" href="${href}">${title}</a>`}
      <div class="course-card-meta">${c.totalLessons || 0} lessons · ${c.totalVideos || 0} videos · ${c.totalDocs || 0} docs</div>
      ${lastLine}
      ${progressBlock(s)}
    </div>
  `;

  const menuBtn = card.querySelector('.course-card-menu-btn');
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = card.classList.contains('menu-open');
    closeCourseMenus();
    if (wasOpen) return;
    card.classList.add('menu-open');
    const menu = document.createElement('div');
    menu.className = 'course-card-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      ${missing ? '' : '<button type="button" data-act="open" role="menuitem">Open course</button>'}
      <button type="button" data-act="copy" role="menuitem">Copy folder path</button>
      <button type="button" data-act="remove" class="danger" role="menuitem">Remove from library</button>
    `;
    menu.onclick = async (ev) => {
      ev.stopPropagation();
      const act = ev.target.closest('button') && ev.target.closest('button').dataset.act;
      closeCourseMenus();
      if (act === 'open') openCourse(c.id);
      if (act === 'copy') { try { await navigator.clipboard.writeText(c.path); } catch (err) {} }
      if (act === 'remove') removeCourse(c);
    };
    card.appendChild(menu);
  };
  return card;
}

function closeCourseMenus() {
  document.querySelectorAll('.course-card.menu-open').forEach(card => {
    card.classList.remove('menu-open');
    const menu = card.querySelector('.course-card-menu');
    if (menu) menu.remove();
  });
}

async function removeCourse(c) {
  const ok = window.confirm(`Remove "${c.name}" from your library?\n\nYour progress and notes for this course will be deleted. The course files on your disk are not touched.`);
  if (!ok) return;
  try {
    const res = await fetch(`/api/courses/${encodeURIComponent(c.id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (state.currentCourse && state.currentCourse.id === c.id) state.currentCourse = null;
  } catch (err) {
    state.dashNotice = `Could not remove the course: ${err.message}`;
  }
  await refreshCoursesList();
  renderDashboard();
}

function setupDashboardListeners() {
  dashAddBtn.onclick = openCourseModal;
  dashEmptyAddBtn.onclick = openCourseModal;
  dashSampleBtn.onclick = () => {
    if (state.samplePath) addCourse(state.samplePath, 'Full-Stack Modern Architecture (Sample Course)');
  };
  dashFilterButtons.forEach(btn => {
    btn.onclick = () => {
      state.dashFilter = btn.dataset.filter;
      renderDashboard();
    };
  });
  dashSearchInput.oninput = () => {
    state.dashQuery = dashSearchInput.value;
    renderDashboard();
  };
  document.addEventListener('click', closeCourseMenus);
  window.addEventListener('hashchange', handleRoute);
}

// Initialize Application
async function initApp() {
  setupEventListeners();
  setupDashboardListeners();
  await loadSystemFolders();
  await handleRoute();
}

// Load System Folders
async function loadSystemFolders() {
  try {
    const res = await fetch('/api/system-folders');
    const data = await res.json();
    quickFolderChips.innerHTML = '';

    state.samplePath = data.samplePath || null;
    if (data.samplePath) {
      const sampleChip = document.createElement('button');
      sampleChip.className = 'quick-chip-btn featured';
      sampleChip.textContent = 'Load sample course';
      sampleChip.onclick = () => {
        coursePathInput.value = data.samplePath;
        addCourse(data.samplePath, 'Full-Stack Modern Architecture (Sample Course)');
      };
      quickFolderChips.appendChild(sampleChip);
    }

    data.folders.forEach(f => {
      const chip = document.createElement('button');
      chip.className = 'quick-chip-btn';
      chip.textContent = f.label;
      chip.onclick = () => {
        coursePathInput.value = f.path;
      };
      quickFolderChips.appendChild(chip);
    });
  } catch (err) {
    console.error('Failed to load system folders', err);
  }
}

// Fetch Courses List
async function refreshCoursesList() {
  try {
    const res = await fetch('/api/courses');
    const data = await res.json();
    state.courses = data.courses;
    state.preferences = data.preferences || state.preferences;

    // Apply saved preferences
    if (state.preferences.playbackSpeed) {
      setPlaybackSpeed(state.preferences.playbackSpeed);
    }

    renderModalCourseList();
  } catch (err) {
    console.error('Error fetching courses:', err);
  }
}

// Browser Directory Picker (File System Access API & webkitdirectory)
async function openBrowserFolderPicker() {
  if (window.showDirectoryPicker) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await processDirectoryHandle(dirHandle);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User closed picker
      console.warn('showDirectoryPicker failed, falling back to input:', err);
    }
  }

  // Fallback to standard directory input
  if (browserFolderInput) {
    browserFolderInput.value = '';
    browserFolderInput.click();
  }
}

async function processDirectoryHandle(dirHandle) {
  const fileItems = [];
  async function scanHandle(handle, currentPath = '') {
    for await (const entry of handle.values()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        fileItems.push({ file, relPath });
      } else if (entry.kind === 'directory') {
        await scanHandle(entry, relPath);
      }
    }
  }
  await scanHandle(dirHandle);
  buildCourseFromFileItems(dirHandle.name, fileItems);
}

const EXT_MAP = {
  video: ['.mp4', '.mkv', '.webm', '.mov', '.m4v', '.avi'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'],
  document: ['.pdf'],
  note: ['.md', '.txt'],
  code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json'],
  archive: ['.zip', '.rar', '.7z'],
  subtitle: ['.vtt', '.srt']
};

function getFileTypeByExt(ext) {
  ext = (ext || '').toLowerCase();
  for (const [type, exts] of Object.entries(EXT_MAP)) {
    if (exts.includes(ext)) return type;
  }
  return 'other';
}

function naturalSortCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function cleanTitleText(str, isFile = false) {
  let base = str;
  if (isFile) {
    const lastDot = str.lastIndexOf('.');
    if (lastDot > 0) base = str.substring(0, lastDot);
  }
  const cleaned = base
    .replace(/^[\d\s._\-]+/, '') // Strip leading digits and separators
    .replace(/_/g, ' ')
    .trim();
  return cleaned || base;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Same rule as the server: exact name, or name + language tag ("Intro.en.srt"), same folder only
const SUB_LANG_SUFFIX = /^[._\s-]+[a-z]{2,3}([-_][a-z]{2,4})?$/i;
function findSubtitleFor(videoBase, subtitlesInFolder) {
  if (!subtitlesInFolder) return null;
  if (subtitlesInFolder[videoBase]) return subtitlesInFolder[videoBase];
  for (const [subBase, file] of Object.entries(subtitlesInFolder)) {
    if (subBase.startsWith(videoBase) && SUB_LANG_SUFFIX.test(subBase.slice(videoBase.length))) return file;
  }
  return null;
}

function buildCourseFromFileItems(courseName, fileItems) {
  flushPosition();
  state.activeLesson = null;

  // Subtitles grouped by folder so "01 - Intro.srt" in one section never attaches to another section's video
  const subtitlesByFolder = {};
  fileItems.forEach(item => {
    const ext = '.' + item.file.name.split('.').pop().toLowerCase();
    if (ext === '.srt' || ext === '.vtt') {
      const parts = item.relPath.replace(/\\/g, '/').split('/');
      parts.pop();
      const folder = parts.join('/');
      const base = item.file.name.substring(0, item.file.name.lastIndexOf('.')).toLowerCase();
      (subtitlesByFolder[folder] = subtitlesByFolder[folder] || {})[base] = item.file;
    }
  });

  // Build recursive node tree matching actual local folders and subfolders
  const rootNode = {
    title: courseName,
    folderName: '',
    relPath: '',
    sections: [],
    lessons: [],
    supplementaryFiles: []
  };

  const folderMap = { '': rootNode };

  function getOrCreateFolder(folderPath) {
    if (folderMap[folderPath]) return folderMap[folderPath];
    const parts = folderPath.split('/');
    const currentName = parts.pop();
    const parentPath = parts.join('/');
    const parentNode = getOrCreateFolder(parentPath);

    const folderNode = {
      title: cleanTitleText(currentName, false),
      folderName: currentName,
      relPath: folderPath,
      sections: [],
      lessons: [],
      supplementaryFiles: []
    };

    folderMap[folderPath] = folderNode;
    parentNode.sections.push(folderNode);
    return folderNode;
  }

  fileItems.forEach(item => {
    const normalizedPath = item.relPath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const fileName = parts.pop();
    const folderPath = parts.join('/');
    const ext = '.' + fileName.split('.').pop().toLowerCase();
    const type = getFileTypeByExt(ext);
    if (type === 'subtitle') return;

    const baseName = fileName.substring(0, fileName.lastIndexOf('.')).toLowerCase();
    const subFile = findSubtitleFor(baseName, subtitlesByFolder[folderPath]);

    const targetFolder = getOrCreateFolder(folderPath);

    const lessonObj = {
      title: cleanTitleText(fileName, true),
      fileName,
      relPath: item.relPath,
      ext,
      type,
      sizeFormatted: formatBytes(item.file.size),
      fileObject: item.file,
      subFileObject: subFile,
      sectionName: targetFolder.title || 'General'
    };

    if (type === 'video' || type === 'audio' || type === 'document' || type === 'note') {
      targetFolder.lessons.push(lessonObj);
    } else {
      targetFolder.supplementaryFiles.push(lessonObj);
    }
  });

  // Sort sections and lessons naturally at all depths
  function sortRecursively(node) {
    node.sections.sort((a, b) => naturalSortCompare(a.folderName, b.folderName));
    node.lessons.sort((a, b) => naturalSortCompare(a.fileName, b.fileName));
    node.sections.forEach(s => sortRecursively(s));
  }
  sortRecursively(rootNode);

  const courseId = 'local_' + courseName.replace(/[^a-zA-Z0-9_]/g, '_');
  const storedProgressKey = `coursair_prog_${courseId}`;
  let savedProgress = { completed: {}, lastWatched: null, notes: [] };
  try {
    const raw = localStorage.getItem(storedProgressKey);
    if (raw) savedProgress = JSON.parse(raw);
  } catch (e) {}

  state.currentCourse = {
    id: courseId,
    name: courseName,
    path: courseName + ' (Selected from PC)',
    isLocalFiles: true
  };
  state.curriculum = rootNode;
  state.progress = savedProgress;

  currentCourseTitle.textContent = courseName;
  closeCourseModal();

  state.allLessonsFlat = [];
  flattenLessons(state.curriculum);

  renderCurriculum();
  updateProgressRing();
  updateStatsTab();
  renderNotesTab();

  resumeCourse();
  const target = courseHash(courseId);
  if (location.hash === target) showView('player');
  else location.hash = target;
}

// Open the last lesson the user had open in this course (its video resumes by itself)
function resumeCourse() {
  const lw = state.progress.lastWatched;
  const found = lw && lw.path ? state.allLessonsFlat.find(l => l.relPath === lw.path) : null;
  const target = found || state.allLessonsFlat[0];
  if (target) loadLesson(target);
}

// Select Active Course
async function selectCourse(courseId) {
  flushPosition();
  state.activeLesson = null;
  try {
    const res = await fetch(`/api/courses/${courseId}/curriculum`);
    if (!res.ok) throw new Error('Failed to load curriculum');
    const data = await res.json();

    state.currentCourse = data.course;
    state.curriculum = data.curriculum;
    state.progress = data.progress || { completed: {}, lastWatched: null, notes: [] };

    currentCourseTitle.textContent = state.currentCourse.name;
    closeCourseModal();

    // Flatten all lessons for easy Prev/Next navigation
    state.allLessonsFlat = [];
    flattenLessons(state.curriculum);

    // Render tree and progress
    renderCurriculum();
    updateProgressRing();
    updateStatsTab();
    renderNotesTab();

    resumeCourse();
    return true;
  } catch (err) {
    console.error('Failed to load course details:', err);
    return false;
  }
}

function flattenLessons(node, sectionName = 'General') {
  if (!node) return;
  const currentTitle = node.title || sectionName;
  if (node.lessons) {
    node.lessons.forEach(l => {
      state.allLessonsFlat.push({ ...l, sectionName: currentTitle });
    });
  }
  // Supplementary files (code, archives) are not lessons: they are listed in the tree
  // and Resources tab, but excluded here so progress can reach 100% and Next/Prev
  // never lands on a file the player cannot show.
  if (node.sections) {
    node.sections.forEach(s => {
      flattenLessons(s, s.title || currentTitle);
    });
  }
}

function nodeMatchesQuery(node, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (node.title && node.title.toLowerCase().includes(q)) return true;
  if (node.folderName && node.folderName.toLowerCase().includes(q)) return true;
  if (node.lessons && node.lessons.some(l => (l.title && l.title.toLowerCase().includes(q)) || (l.fileName && l.fileName.toLowerCase().includes(q)))) return true;
  if (node.supplementaryFiles && node.supplementaryFiles.some(f => (f.title && f.title.toLowerCase().includes(q)) || (f.fileName && f.fileName.toLowerCase().includes(q)))) return true;
  if (node.sections && node.sections.some(s => nodeMatchesQuery(s, q))) return true;
  return false;
}

function getSubtreeLessonCounts(node) {
  let total = node.lessons ? node.lessons.length : 0;
  let completed = 0;
  if (node.lessons && state.progress.completed) {
    node.lessons.forEach(l => {
      if (state.progress.completed[l.relPath]) completed++;
    });
  }
  if (node.sections) {
    node.sections.forEach(sub => {
      const subCounts = getSubtreeLessonCounts(sub);
      total += subCounts.total;
      completed += subCounts.completed;
    });
  }
  return { total, completed };
}

function containsActiveLesson(node) {
  if (!state.activeLesson) return false;
  if (node.lessons && node.lessons.some(l => l.relPath === state.activeLesson.relPath)) return true;
  if (node.supplementaryFiles && node.supplementaryFiles.some(f => f.relPath === state.activeLesson.relPath)) return true;
  if (node.sections && node.sections.some(s => containsActiveLesson(s))) return true;
  return false;
}

// Number lessons in tree order (1, 2, 3…) so numbering stays stable while filtering.
function computeLessonNumbers() {
  const numbers = {};
  let n = 0;
  (function walk(node) {
    if (!node) return;
    (node.lessons || []).forEach(l => { numbers[l.relPath] = ++n; });
    (node.sections || []).forEach(walk);
  })(state.curriculum);
  return numbers;
}

// Render Curriculum Tree
function renderCurriculum(filterQuery = '') {
  curriculumList.innerHTML = '';
  const query = filterQuery.toLowerCase().trim();

  if (!state.curriculum) return;
  const ctx = { query, numbers: computeLessonNumbers() };

  // Top-level files that are not inside any folder
  const rootLessons = state.curriculum.lessons || [];
  const rootFiles = state.curriculum.supplementaryFiles || [];
  if (rootLessons.length > 0 || rootFiles.length > 0) {
    const rootNode = {
      title: 'Introduction',
      folderName: '',
      relPath: '',
      lessons: rootLessons,
      supplementaryFiles: rootFiles,
      sections: []
    };
    const rootEl = createSectionElement(rootNode, ctx, 0, true, null);
    if (rootEl) curriculumList.appendChild(rootEl);
  }

  (state.curriculum.sections || []).forEach((section, idx) => {
    const isExpanded = containsActiveLesson(section) || (idx === 0 && !state.activeLesson);
    const secEl = createSectionElement(section, ctx, 0, isExpanded, idx + 1);
    if (secEl) curriculumList.appendChild(secEl);
  });

  if (!curriculumList.children.length) {
    curriculumList.innerHTML = `<div class="empty-state">${query ? 'No lessons match your search.' : 'This course has no lessons yet.'}</div>`;
  }
}

function matchesQuery(item, query) {
  return !query
    || (item.title && item.title.toLowerCase().includes(query))
    || (item.fileName && item.fileName.toLowerCase().includes(query));
}

function createSectionElement(sectionNode, ctx, depth = 0, defaultExpanded = false, sectionNumber = null) {
  const { query } = ctx;
  if (query && !nodeMatchesQuery(sectionNode, query)) return null;

  const { total, completed } = getSubtreeLessonCounts(sectionNode);
  const isAllDone = total > 0 && completed === total;
  const isExpanded = defaultExpanded || containsActiveLesson(sectionNode) || query !== '';

  const sectionDiv = document.createElement('div');
  sectionDiv.className = `curriculum-section depth-${depth}${isExpanded ? ' expanded' : ''}`;

  const headerBtn = document.createElement('button');
  headerBtn.type = 'button';
  headerBtn.className = `section-header${depth > 0 ? ' subfolder-header' : ''}`;
  headerBtn.setAttribute('aria-expanded', String(isExpanded));
  const label = depth === 0 && sectionNumber ? `Section ${sectionNumber}: ${sectionNode.title}` : sectionNode.title;
  const fileCount = (sectionNode.supplementaryFiles || []).length;
  headerBtn.innerHTML = `
    <span class="section-header-text">
      <span class="section-name" title="${escapeHtml(sectionNode.title)}">${depth > 0 ? ICONS.folder : ''}${escapeHtml(label)}</span>
      <span class="section-sub"><span class="${isAllDone ? 'all-done' : ''}">${completed} / ${total}</span>${fileCount ? ` | ${fileCount} resource${fileCount === 1 ? '' : 's'}` : ''}</span>
    </span>
    ${ICONS.chevronDown}
  `;
  headerBtn.onclick = (e) => {
    e.stopPropagation();
    const open = sectionDiv.classList.toggle('expanded');
    headerBtn.setAttribute('aria-expanded', String(open));
  };

  const listDiv = document.createElement('div');
  listDiv.className = 'section-lessons-list';

  // 1. Lessons
  (sectionNode.lessons || []).filter(l => matchesQuery(l, query)).forEach(lesson => {
    const isCompleted = !!(state.progress.completed && state.progress.completed[lesson.relPath]);
    const isActive = state.activeLesson && state.activeLesson.relPath === lesson.relPath;
    const num = ctx.numbers[lesson.relPath];

    // Partly watched: show a thin bar and time left
    let watchMeta = '';
    let watchBar = '';
    const resumeAt = isCompleted ? 0 : getResumeTime(lesson);
    const saved = resumeAt ? getSavedPosition(lesson) : null;
    if (saved && saved.duration) {
      const pct = Math.min(100, Math.round((saved.time / saved.duration) * 100));
      const minsLeft = Math.max(1, Math.round((saved.duration - saved.time) / 60));
      watchMeta = ` · ${minsLeft} min left`;
      watchBar = `<span class="lesson-watch-bar"><span style="width:${pct}%"></span></span>`;
    }

    const itemEl = document.createElement('div');
    itemEl.className = `lesson-item${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`;
    itemEl.tabIndex = 0;
    itemEl.setAttribute('role', 'button');
    itemEl.innerHTML = `
      <span class="lesson-checkbox${isCompleted ? ' completed' : ''}" role="checkbox" aria-checked="${isCompleted}" title="${isCompleted ? 'Mark as incomplete' : 'Mark as complete'}">${isCompleted ? ICONS.check : ''}</span>
      <span class="lesson-body">
        <span class="lesson-title-text" title="${escapeHtml(lesson.fileName || lesson.title)}">${num ? num + '. ' : ''}${escapeHtml(lesson.title)}</span>
        <span class="lesson-meta">${getMediaIcon(lesson.type)}<span>${escapeHtml(lesson.sizeFormatted || '')}${watchMeta}</span></span>
        ${watchBar}
      </span>
    `;

    itemEl.querySelector('.lesson-checkbox').onclick = (e) => {
      e.stopPropagation();
      toggleLessonComplete(lesson.relPath);
    };
    itemEl.onclick = () => loadLesson(lesson);
    itemEl.onkeydown = (e) => {
      if (e.key === 'Enter') loadLesson(lesson);
    };
    listDiv.appendChild(itemEl);
  });

  // 2. Supplementary files (download in a new tab via the Resources logic)
  (sectionNode.supplementaryFiles || []).filter(f => matchesQuery(f, query)).forEach(file => {
    const fileEl = document.createElement('a');
    fileEl.className = 'lesson-item supplementary-item';
    fileEl.href = getFileUrl(file, true);
    fileEl.download = file.fileName;
    fileEl.innerHTML = `
      <span class="supplementary-spacer">${ICONS.paperclip}</span>
      <span class="lesson-body">
        <span class="lesson-title-text" title="${escapeHtml(file.fileName)}">${escapeHtml(file.fileName)}</span>
        <span class="lesson-meta">${getMediaIcon(file.type)}<span>Resource · ${escapeHtml(file.sizeFormatted || '')}</span></span>
      </span>
    `;
    listDiv.appendChild(fileEl);
  });

  // 3. Nested subfolders
  (sectionNode.sections || []).forEach(sub => {
    const subEl = createSectionElement(sub, ctx, depth + 1, containsActiveLesson(sub), null);
    if (subEl) listDiv.appendChild(subEl);
  });

  sectionDiv.appendChild(headerBtn);
  sectionDiv.appendChild(listDiv);
  return sectionDiv;
}

// URL for a server-scanned file, or an object URL for a browser-picked file
function getFileUrl(file, download = false) {
  if (file.fileObject) {
    if (!file._objectUrl) file._objectUrl = URL.createObjectURL(file.fileObject);
    return file._objectUrl;
  }
  const fullPath = `${state.currentCourse.path}/${file.relPath}`;
  return `/api/file?path=${encodeURIComponent(fullPath)}${download ? '&download=true' : ''}`;
}

// ---------- Resume positions ----------
function isMediaLesson(lesson) {
  return !!lesson && (lesson.type === 'video' || lesson.type === 'audio');
}

function getSavedPosition(lesson) {
  if (!lesson) return null;
  const positions = state.progress.positions || {};
  if (positions[lesson.relPath]) return positions[lesson.relPath];
  // Older data only stored the course's last-watched lesson
  const lw = state.progress.lastWatched;
  return lw && lw.path === lesson.relPath ? lw : null;
}

// Where to start a video: its saved spot, unless it is barely started or already finished
function getResumeTime(lesson) {
  if (!isMediaLesson(lesson)) return 0;
  const p = getSavedPosition(lesson);
  if (!p || !p.time || p.time < 5) return 0;
  // Treat the last 5% (at most 10s, e.g. end credits) as finished: start those from the beginning
  if (p.duration && p.duration - p.time <= Math.min(10, p.duration * 0.05)) return 0;
  return p.time;
}

// Save the current video's spot right now (before switching lesson/course or closing the tab)
function flushPosition() {
  if (state.mediaReady && isMediaLesson(state.activeLesson)) saveLastWatched(true);
}

// Object URLs created for the player (browser-picked courses); revoked on the next load
function playerObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  state.playerUrls.push(url);
  return url;
}
function revokePlayerUrls() {
  state.playerUrls.forEach(u => URL.revokeObjectURL(u));
  state.playerUrls = [];
}

// ---------- Subtitles ----------
// Use a brand-new <track> element per lesson (or none): changing src on an existing track
// keeps the previous video's cues on screen.
function setSubtitleSource(src) {
  if (subtitleTrack && subtitleTrack.isConnected) subtitleTrack.remove();
  const fresh = document.createElement('track');
  fresh.id = 'main-subtitle-track';
  fresh.kind = 'subtitles';
  fresh.srclang = 'en';
  fresh.label = 'Subtitles';
  subtitleTrack = fresh;
  if (src) {
    fresh.src = src;
    fresh.default = state.subtitlesOn;
    videoPlayer.appendChild(fresh);
    fresh.track.mode = state.subtitlesOn ? 'showing' : 'hidden';
  }

  subtitlesToggleBtn.disabled = !src;
  subtitlesToggleBtn.title = src ? 'Subtitles' : 'No subtitles for this lesson';
  subtitlesToggleBtn.classList.toggle('is-off', !!src && !state.subtitlesOn);
}

// ---------- Resume toast ----------
let resumeToastTimer = null;
function showResumeToast(time) {
  resumeToastText.textContent = `Resumed at ${formatTime(time)}`;
  resumeToast.classList.remove('hidden');
  clearTimeout(resumeToastTimer);
  resumeToastTimer = setTimeout(hideResumeToast, 6000);
}
function hideResumeToast() {
  clearTimeout(resumeToastTimer);
  resumeToast.classList.add('hidden');
}

// Load Lesson into Stage. seekTime: null = resume where the user left off.
async function loadLesson(lesson, seekTime = null) {
  flushPosition();
  state.mediaReady = false;
  revokePlayerUrls();
  hideResumeToast();

  state.activeLesson = lesson;
  cancelAutoplay();

  breadcrumbSection.textContent = lesson.sectionName || 'Section';
  breadcrumbLesson.textContent = lesson.title;

  const isCompleted = !!(state.progress.completed && state.progress.completed[lesson.relPath]);
  updateCompleteButtonUI(isCompleted);

  renderCurriculum(lessonSearchInput.value);

  const fullPath = `${state.currentCourse.path}/${lesson.relPath}`;
  const isResume = seekTime === null;
  const startTime = isResume ? getResumeTime(lesson) : seekTime;

  if (isMediaLesson(lesson)) {
    documentContainer.classList.add('hidden');
    videoContainer.classList.remove('hidden');

    if (lesson.subFileObject) {
      setSubtitleSource(playerObjectUrl(lesson.subFileObject));
    } else if (lesson.subtitle) {
      const subPath = `${state.currentCourse.path}/${lesson.subtitle.relPath}`;
      setSubtitleSource(`/api/subtitle?path=${encodeURIComponent(subPath)}`);
    } else {
      setSubtitleSource(null);
    }

    videoPlayer.src = lesson.fileObject
      ? playerObjectUrl(lesson.fileObject)
      : `/api/stream?path=${encodeURIComponent(fullPath)}`;
    videoPlayer.playbackRate = state.preferences.playbackSpeed || 1;

    videoPlayer.onloadedmetadata = () => {
      durationTimeText.textContent = formatTime(videoPlayer.duration);
      videoPlayer.playbackRate = state.preferences.playbackSpeed || 1;
      if (startTime > 0 && startTime < videoPlayer.duration) {
        videoPlayer.currentTime = startTime;
        if (isResume) showResumeToast(startTime);
      }
      state.mediaReady = true;
      saveLastWatched(true);
      videoPlayer.play().catch(() => {});
    };
  } else {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    setSubtitleSource(null);
    videoContainer.classList.add('hidden');
    documentContainer.classList.remove('hidden');
    docTitle.textContent = lesson.title;

    if (lesson.type === 'document' && lesson.ext === '.pdf') {
      docPdfFrame.classList.remove('hidden');
      docMarkdownContent.classList.add('hidden');
      const fileUrl = lesson.fileObject
        ? playerObjectUrl(lesson.fileObject)
        : `/api/file?path=${encodeURIComponent(fullPath)}`;
      docPdfFrame.src = fileUrl;
      docOpenExternalBtn.href = fileUrl;
    } else {
      docPdfFrame.classList.add('hidden');
      docPdfFrame.removeAttribute('src');
      docMarkdownContent.classList.remove('hidden');
      if (lesson.fileObject) {
        docOpenExternalBtn.href = '#';
        lesson.fileObject.text().then(text => {
          docMarkdownContent.innerHTML = renderMarkdown(text);
        }).catch(() => {
          docMarkdownContent.textContent = 'Error reading file content.';
        });
      } else {
        const fileUrl = `/api/file?path=${encodeURIComponent(fullPath)}`;
        docOpenExternalBtn.href = fileUrl;
        fetch(fileUrl)
          .then(res => res.text())
          .then(text => { docMarkdownContent.innerHTML = renderMarkdown(text); })
          .catch(() => { docMarkdownContent.textContent = 'Error loading text document.'; });
      }
    }
    // Documents have no position; just remember this was the last lesson opened
    saveLastWatched(true);
  }

  updateResourcesTab();
}

// Toggle Lesson Completion
async function toggleLessonComplete(relPath) {
  if (!state.currentCourse) return;
  const currentStatus = !!(state.progress.completed && state.progress.completed[relPath]);
  const newStatus = !currentStatus;

  if (!state.progress.completed) state.progress.completed = {};
  if (newStatus) {
    state.progress.completed[relPath] = true;
  } else {
    delete state.progress.completed[relPath];
  }

  // Update UI immediately
  renderCurriculum(lessonSearchInput.value);
  updateProgressRing();
  updateStatsTab();

  if (state.activeLesson && state.activeLesson.relPath === relPath) {
    updateCompleteButtonUI(newStatus);
  }

  // If local files, persist to localStorage
  if (state.currentCourse.isLocalFiles) {
    localStorage.setItem(`coursair_prog_${state.currentCourse.id}`, JSON.stringify(state.progress));
    return;
  }

  // Post to server
  try {
    await fetch(`/api/progress/${state.currentCourse.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: { relPath, status: newStatus }
      })
    });
  } catch (err) {
    console.error('Failed to sync progress:', err);
  }
}

function updateCompleteButtonUI(isCompleted) {
  if (isCompleted) {
    toggleCompleteBtn.classList.add('completed');
    completeBtnText.textContent = 'Completed';
  } else {
    toggleCompleteBtn.classList.remove('completed');
    completeBtnText.textContent = 'Mark as complete';
  }
}

// Progress Ring & Stats Calculation
function updateProgressRing() {
  const total = state.allLessonsFlat.length;
  const completed = countCompletedLessons();
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  progressPercentText.textContent = `${percent}%`;
  progressCountText.textContent = `${completed} of ${total} complete`;

  const r = parseFloat(progressCircle.getAttribute('r')) || 15;
  const circumference = 2 * Math.PI * r;
  progressCircle.style.strokeDasharray = circumference;
  const offset = circumference - (percent / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
}

// Only count completions that belong to lessons in the current course
function countCompletedLessons() {
  const done = state.progress.completed || {};
  return state.allLessonsFlat.filter(l => done[l.relPath]).length;
}

function updateStatsTab() {
  if (!state.currentCourse) return;
  const completed = countCompletedLessons();
  statTotalLessons.textContent = state.allLessonsFlat.length;
  statTotalVideos.textContent = state.allLessonsFlat.filter(l => l.type === 'video' || l.type === 'audio').length;
  statTotalDocs.textContent = state.allLessonsFlat.filter(l => l.type === 'document' || l.type === 'note').length;
  statCompletedLessons.textContent = `${completed} (${state.allLessonsFlat.length > 0 ? Math.round((completed / state.allLessonsFlat.length) * 100) : 0}%)`;
  statCoursePath.textContent = state.currentCourse.path;
}

// Previous & Next Lesson
function navigateLesson(delta) {
  if (!state.activeLesson || state.allLessonsFlat.length === 0) return;
  const currentIndex = state.allLessonsFlat.findIndex(l => l.relPath === state.activeLesson.relPath);
  const nextIndex = currentIndex + delta;

  if (nextIndex >= 0 && nextIndex < state.allLessonsFlat.length) {
    loadLesson(state.allLessonsFlat[nextIndex]);
  }
}

// Autoplay Next Lesson Trigger
function triggerAutoPlayNext() {
  if (!state.activeLesson) return;
  const currentIndex = state.allLessonsFlat.findIndex(l => l.relPath === state.activeLesson.relPath);
  const nextLesson = state.allLessonsFlat[currentIndex + 1];

  if (!nextLesson) return; // Course complete!

  // Auto mark current lesson complete
  if (!state.progress.completed[state.activeLesson.relPath]) {
    toggleLessonComplete(state.activeLesson.relPath);
  }

  autoplayLessonTitle.textContent = nextLesson.title;
  autoplayOverlay.classList.remove('hidden');

  let secondsLeft = 5;
  state.autoPlayTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      cancelAutoplay();
      loadLesson(nextLesson);
    }
  }, 1000);
}

function cancelAutoplay() {
  if (state.autoPlayTimer) {
    clearInterval(state.autoPlayTimer);
    state.autoPlayTimer = null;
  }
  autoplayOverlay.classList.add('hidden');
}

// Notes & Bookmarks Management
async function addNoteAtCurrentTime() {
  if (!state.currentCourse || !state.activeLesson) return;
  const text = newNoteInput.value.trim();
  if (!text) return;

  const time = Math.floor(videoPlayer.currentTime || 0);

  const noteData = {
    id: 'note_' + Date.now(),
    lessonPath: state.activeLesson.relPath,
    lessonTitle: state.activeLesson.title,
    time,
    text,
    createdAt: new Date().toISOString()
  };

  if (state.currentCourse.isLocalFiles) {
    if (!state.progress.notes) state.progress.notes = [];
    state.progress.notes.push(noteData);
    localStorage.setItem(`coursair_prog_${state.currentCourse.id}`, JSON.stringify(state.progress));
    newNoteInput.value = '';
    renderNotesTab();
    return;
  }

  try {
    const res = await fetch(`/api/progress/${state.currentCourse.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteData })
    });
    const result = await res.json();
    state.progress = result.progress;
    newNoteInput.value = '';
    renderNotesTab();
  } catch (err) {
    console.error('Failed to add note:', err);
  }
}

async function deleteNote(noteId) {
  if (!state.currentCourse) return;

  if (state.currentCourse.isLocalFiles) {
    if (state.progress.notes) {
      state.progress.notes = state.progress.notes.filter(n => n.id !== noteId);
      localStorage.setItem(`coursair_prog_${state.currentCourse.id}`, JSON.stringify(state.progress));
      renderNotesTab();
    }
    return;
  }

  try {
    const res = await fetch(`/api/progress/${state.currentCourse.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteNoteId: noteId })
    });
    const result = await res.json();
    state.progress = result.progress;
    renderNotesTab();
  } catch (err) {
    console.error('Failed to delete note:', err);
  }
}

function renderNotesTab() {
  const notes = (state.progress && state.progress.notes) || [];
  notesBadgeCount.textContent = notes.length;

  if (notes.length === 0) {
    notesList.innerHTML = '<div class="empty-state">No notes yet for this course.</div>';
    return;
  }

  notesList.innerHTML = '';
  notes.slice().reverse().forEach(n => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-item-main">
        <div class="note-item-meta">
          <button class="note-timestamp-pill" title="Jump to this position">${formatTime(n.time)}</button>
          <span class="note-lesson-tag">${escapeHtml(n.lessonTitle || '')}</span>
        </div>
        <div class="note-text">${escapeHtml(n.text)}</div>
      </div>
      <button class="note-delete-btn" title="Delete note" aria-label="Delete note">&times;</button>
    `;

    // Jump to timestamp
    item.querySelector('.note-timestamp-pill').onclick = () => {
      const targetLesson = state.allLessonsFlat.find(l => l.relPath === n.lessonPath);
      if (targetLesson) {
        if (!state.activeLesson || state.activeLesson.relPath !== targetLesson.relPath) {
          loadLesson(targetLesson, n.time);
        } else {
          videoPlayer.currentTime = n.time;
          videoPlayer.play().catch(() => {});
        }
      }
    };

    // Delete note
    item.querySelector('.note-delete-btn').onclick = () => {
      deleteNote(n.id);
    };

    notesList.appendChild(item);
  });
}

function exportNotesAsMarkdown() {
  const notes = (state.progress && state.progress.notes) || [];
  if (notes.length === 0) {
    alert('No notes to export.');
    return;
  }

  let md = `# Notes for ${state.currentCourse ? state.currentCourse.name : 'Course'}\n\n`;
  notes.forEach(n => {
    md += `### ${n.lessonTitle} (${formatTime(n.time)})\n`;
    md += `${n.text}\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(state.currentCourse ? state.currentCourse.name : 'course')}-notes.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Resources Tab
function updateResourcesTab() {
  if (!state.curriculum || !state.activeLesson) return;
  // Find supplementary files in the same section
  let foundResources = [];

  function searchNode(node) {
    if (!node) return;
    if (node.lessons && node.lessons.some(l => l.relPath === state.activeLesson.relPath)) {
      if (node.supplementaryFiles) foundResources = node.supplementaryFiles;
    }
    if (node.sections) {
      node.sections.forEach(s => searchNode(s));
    }
  }

  searchNode(state.curriculum);
  resourcesBadgeCount.textContent = foundResources.length;

  if (foundResources.length === 0) {
    resourcesList.innerHTML = '<div class="empty-state">No resources in this section.</div>';
    return;
  }

  resourcesList.innerHTML = '';
  foundResources.forEach(res => {
    const card = document.createElement('a');
    card.className = 'resource-card';
    card.href = getFileUrl(res, true);
    card.download = res.fileName;
    card.innerHTML = `
      <span class="resource-icon">${getMediaIcon(res.type)}</span>
      <div class="resource-info">
        <div class="resource-name" title="${escapeHtml(res.fileName)}">${escapeHtml(res.fileName)}</div>
        <div class="resource-meta">${escapeHtml(res.sizeFormatted || '')} · Download</div>
      </div>
      ${ICONS.download}
    `;
    resourcesList.appendChild(card);
  });
}

// Save where the user is: the course's last-opened lesson and, for videos, the per-video spot.
let lastSaveTick = 0;
function saveLastWatched(force = false) {
  const lesson = state.activeLesson;
  if (!state.currentCourse || !lesson) return;
  const media = isMediaLesson(lesson);
  if (media && !state.mediaReady) return; // don't overwrite a saved spot while the video loads

  const now = Date.now();
  if (!force && now - lastSaveTick < 4000) return;
  lastSaveTick = now;

  const time = media ? Math.floor(videoPlayer.currentTime || 0) : 0;
  const duration = media ? Math.floor(videoPlayer.duration || 0) : 0;
  const updatedAt = new Date().toISOString();

  state.progress.lastWatched = { path: lesson.relPath, title: lesson.title, time, duration, updatedAt };
  if (media) {
    if (!state.progress.positions) state.progress.positions = {};
    state.progress.positions[lesson.relPath] = { time, duration, updatedAt };
  }

  if (state.currentCourse.isLocalFiles) {
    try {
      localStorage.setItem(`coursair_prog_${state.currentCourse.id}`, JSON.stringify(state.progress));
    } catch (e) {}
    return;
  }

  const body = { lastWatched: { path: lesson.relPath, title: lesson.title, time, duration } };
  if (media) body.position = { relPath: lesson.relPath, time, duration };

  fetch(`/api/progress/${state.currentCourse.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true // lets the save finish when the tab is closing
  }).catch(() => {});
}

// Set Playback Speed
function setPlaybackSpeed(speed) {
  state.preferences.playbackSpeed = speed;
  videoPlayer.playbackRate = speed;
  speedButtons.forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
  });

  if (state.currentCourse) {
    fetch(`/api/progress/${state.currentCourse.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: { playbackSpeed: speed } })
    }).catch(() => {});
  }
}

// Add Course Path
async function addCourse(folderPath, name = '') {
  if (!folderPath) return;
  submitAddCourseBtn.disabled = true;
  submitAddCourseBtn.textContent = 'Scanning…';

  try {
    const res = await fetch('/api/courses/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath, name })
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Failed to add course folder');
      return;
    }

    coursePathInput.value = '';
    closeCourseModal();
    await refreshCoursesList();
    openCourse(data.course.id);
  } catch (err) {
    alert('Network error adding course folder: ' + err.message);
  } finally {
    submitAddCourseBtn.disabled = false;
    submitAddCourseBtn.textContent = 'Add';
  }
}

// Render Modal Courses List
function renderModalCourseList() {
  modalCoursesList.innerHTML = '';
  if (state.courses.length === 0) {
    modalCoursesList.innerHTML = '<div class="empty-state">No courses yet. Add a folder below to get started.</div>';
    return;
  }

  state.courses.forEach(c => {
    const item = document.createElement('div');
    const isCurrent = state.currentCourse && state.currentCourse.id === c.id;
    const pct = Math.max(0, Math.min(100, Number(c.percent) || 0));
    item.className = `modal-course-item${isCurrent ? ' current' : ''}`;
    item.innerHTML = `
      <div class="modal-course-info">
        <div class="modal-course-title" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
        <div class="modal-course-path" title="${escapeHtml(c.path)}">${escapeHtml(c.path)}</div>
      </div>
      <div class="modal-course-progress">${pct}% complete<div class="mini-bar"><span style="width:${pct}%"></span></div></div>
    `;
    item.onclick = () => {
      closeCourseModal();
      openCourse(c.id);
    };
    modalCoursesList.appendChild(item);
  });
}

function openCourseModal() {
  courseModal.classList.remove('hidden');
  renderModalCourseList();
}
function closeCourseModal() {
  courseModal.classList.add('hidden');
}

// Escape HTML utility
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  text = String(text);
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Event Listeners Setup
function setupEventListeners() {
  // Video Player Play/Pause
  const togglePlay = () => {
    if (videoPlayer.paused) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  };
  playPauseBtn.onclick = togglePlay;
  videoPlayer.onclick = togglePlay;

  videoPlayer.onplay = () => {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    videoContainer.classList.remove('is-paused');
  };
  videoPlayer.onpause = () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    videoContainer.classList.add('is-paused');
    saveLastWatched(true);
  };

  // Mute
  const syncVolumeIcon = () => {
    volumeOnIcon.classList.toggle('hidden', videoPlayer.muted);
    volumeOffIcon.classList.toggle('hidden', !videoPlayer.muted);
  };
  volumeBtn.onclick = () => { videoPlayer.muted = !videoPlayer.muted; };
  videoPlayer.onvolumechange = syncVolumeIcon;

  // Prev / next arrows on the video stage
  stagePrevBtn.onclick = () => navigateLesson(-1);
  stageNextBtn.onclick = () => navigateLesson(1);

  // Theme
  themeToggleBtn.onclick = toggleTheme;

  // Video Progress & Time Scrubbing
  videoPlayer.ontimeupdate = () => {
    if (videoPlayer.duration) {
      const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100;
      videoSeekBar.value = pct;
      seekProgressFill.style.width = `${pct}%`;
      currentTimeText.textContent = formatTime(videoPlayer.currentTime);
      noteCurrentTimeLabel.textContent = formatTime(videoPlayer.currentTime);
      saveLastWatched();
    }
  };

  videoSeekBar.oninput = () => {
    if (videoPlayer.duration) {
      const seekTo = (videoSeekBar.value / 100) * videoPlayer.duration;
      videoPlayer.currentTime = seekTo;
      seekProgressFill.style.width = `${videoSeekBar.value}%`;
    }
  };

  // Skip Rewind/Forward 5s
  rewindBtn.onclick = () => {
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 5);
  };
  forwardBtn.onclick = () => {
    videoPlayer.currentTime = Math.min(videoPlayer.duration || 0, videoPlayer.currentTime + 5);
  };

  // Video End -> Autoplay Next
  videoPlayer.onended = () => {
    saveLastWatched(true);
    triggerAutoPlayNext();
  };
  cancelAutoplayBtn.onclick = cancelAutoplay;
  playNextNowBtn.onclick = () => {
    cancelAutoplay();
    navigateLesson(1);
  };

  // Speed Buttons
  speedButtons.forEach(btn => {
    btn.onclick = () => {
      setPlaybackSpeed(parseFloat(btn.dataset.speed));
    };
  });

  // Fullscreen & Theater
  fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Expanded view = hide the course content sidebar (like standard course players)
  const setSidebarCollapsed = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    try { localStorage.setItem('coursair-sidebar-collapsed', collapsed ? '1' : '0'); } catch (e) {}
  };
  theaterBtn.onclick = () => setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  closeSidebarBtn.onclick = () => setSidebarCollapsed(true);
  openSidebarBtn.onclick = () => setSidebarCollapsed(false);
  try {
    if (localStorage.getItem('coursair-sidebar-collapsed') === '1') document.body.classList.add('sidebar-collapsed');
  } catch (e) {}

  // Subtitles Toggle
  subtitlesToggleBtn.onclick = () => {
    state.subtitlesOn = !state.subtitlesOn;
    if (subtitleTrack.track && subtitleTrack.getAttribute('src')) {
      subtitleTrack.track.mode = state.subtitlesOn ? 'showing' : 'hidden';
    }
    subtitlesToggleBtn.classList.toggle('is-off', !state.subtitlesOn);
  };

  // Resume toast
  resumeStartOverBtn.onclick = () => {
    videoPlayer.currentTime = 0;
    hideResumeToast();
    saveLastWatched(true);
  };

  // Save the current spot when the tab is hidden or closed
  window.addEventListener('pagehide', flushPosition);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPosition();
  });

  // Lesson Nav Buttons
  prevLessonBtn.onclick = () => navigateLesson(-1);
  nextLessonBtn.onclick = () => navigateLesson(1);

  // Complete Button
  toggleCompleteBtn.onclick = () => {
    if (state.activeLesson) {
      toggleLessonComplete(state.activeLesson.relPath);
    }
  };

  // Notes
  addNoteBtn.onclick = addNoteAtCurrentTime;
  newNoteInput.onkeydown = (e) => {
    if (e.key === 'Enter') addNoteAtCurrentTime();
  };
  exportNotesBtn.onclick = exportNotesAsMarkdown;

  // Tabs switching
  panelTabButtons.forEach(btn => {
    btn.onclick = () => {
      panelTabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) targetPanel.classList.remove('hidden');
    };
  });

  // Search
  lessonSearchInput.oninput = (e) => {
    const val = e.target.value;
    searchClearBtn.classList.toggle('hidden', !val);
    renderCurriculum(val);
  };
  searchClearBtn.onclick = () => {
    lessonSearchInput.value = '';
    searchClearBtn.classList.add('hidden');
    renderCurriculum('');
  };

  // Expand / Collapse All
  expandAllBtn.onclick = () => {
    document.querySelectorAll('.curriculum-section').forEach(s => s.classList.add('expanded'));
  };
  collapseAllBtn.onclick = () => {
    document.querySelectorAll('.curriculum-section').forEach(s => s.classList.remove('expanded'));
  };

  // Modals
  courseSelectorBtn.onclick = openCourseModal;
  addCourseNavBtn.onclick = openCourseModal;
  closeCourseModalBtn.onclick = closeCourseModal;

  // Native Browser Folder Picker
  if (browseFolderDialogBtn) {
    browseFolderDialogBtn.onclick = openBrowserFolderPicker;
  }
  if (browserFolderInput) {
    browserFolderInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (!files || files.length === 0) return;
      const rootName = files[0].webkitRelativePath.split('/')[0] || 'Selected Course';
      const fileItems = files.map(file => {
        const parts = file.webkitRelativePath.split('/');
        parts.shift();
        return { file, relPath: parts.join('/') };
      });
      buildCourseFromFileItems(rootName, fileItems);
    };
  }

  shortcutsBtn.onclick = () => shortcutsModal.classList.remove('hidden');
  closeShortcutsModalBtn.onclick = () => shortcutsModal.classList.add('hidden');

  // Submit Add Course
  submitAddCourseBtn.onclick = () => {
    addCourse(coursePathInput.value);
  };
  coursePathInput.onkeydown = (e) => {
    if (e.key === 'Enter') addCourse(coursePathInput.value);
  };

  // Keyboard Shortcuts
  window.onkeydown = (e) => {
    // If typing in input, don't trigger media shortcuts
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (document.body.classList.contains('view-dashboard')) {
      if (e.key === '?') shortcutsBtn.click();
      else if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleTheme();
      else if (e.code === 'Escape') {
        courseModal.classList.add('hidden');
        shortcutsModal.classList.add('hidden');
        closeCourseMenus();
      }
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - (e.shiftKey ? 15 : 5));
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      videoPlayer.currentTime = Math.min(videoPlayer.duration || 0, videoPlayer.currentTime + (e.shiftKey ? 15 : 5));
    } else if (e.code === 'KeyF') {
      fullscreenBtn.click();
    } else if (e.code === 'KeyT') {
      theaterBtn.click();
    } else if (e.code === 'KeyM') {
      videoPlayer.muted = !videoPlayer.muted;
    } else if (e.code === 'KeyC') {
      if (state.activeLesson) toggleLessonComplete(state.activeLesson.relPath);
    } else if (e.code === 'KeyN' && e.shiftKey) {
      navigateLesson(1);
    } else if (e.code === 'KeyP' && e.shiftKey) {
      navigateLesson(-1);
    } else if (e.key === '1') setPlaybackSpeed(1);
    else if (e.key === '2') setPlaybackSpeed(1.25);
    else if (e.key === '3') setPlaybackSpeed(1.5);
    else if (e.key === '4') setPlaybackSpeed(2);
    else if (e.key === '?') shortcutsBtn.click();
    else if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleTheme();
    else if (e.code === 'Escape') {
      courseModal.classList.add('hidden');
      shortcutsModal.classList.add('hidden');
    }
  };
}

// Start
initApp();
