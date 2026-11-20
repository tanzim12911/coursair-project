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
  autoPlayTimer: null
};

// DOM Elements
const currentCourseTitle = document.getElementById('current-course-title');
const curriculumList = document.getElementById('curriculum-list');
const progressCircle = document.getElementById('progress-circle');
const progressPercentText = document.getElementById('progress-percent-text');
const progressCountText = document.getElementById('progress-count-text');

// Player DOM
const videoPlayer = document.getElementById('main-video-player');
const subtitleTrack = document.getElementById('main-subtitle-track');
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

// Initialize Application
async function initApp() {
  setupEventListeners();
  await loadSystemFolders();
  await refreshCoursesList();
}

// Load System Folders
async function loadSystemFolders() {
  try {
    const res = await fetch('/api/system-folders');
    const data = await res.json();
    quickFolderChips.innerHTML = '';

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

    if (state.courses.length > 0) {
      // Pick last used or first course
      const targetCourse = state.courses[0];
      await selectCourse(targetCourse.id);
    } else {
      currentCourseTitle.textContent = 'No Courses Loaded — Click to Add';
      openCourseModal();
    }
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

function buildCourseFromFileItems(courseName, fileItems) {
  const subtitles = {};
  fileItems.forEach(item => {
    const ext = '.' + item.file.name.split('.').pop().toLowerCase();
    if (ext === '.srt' || ext === '.vtt') {
      const base = item.file.name.substring(0, item.file.name.lastIndexOf('.')).toLowerCase();
      subtitles[base] = item.file;
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
    const subFile = subtitles[baseName] || null;

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

  if (state.allLessonsFlat.length > 0) {
    loadLesson(state.allLessonsFlat[0], 0);
  }
}

// Select Active Course
async function selectCourse(courseId) {
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

    // Resume last watched or open first lesson
    if (state.progress.lastWatched && state.progress.lastWatched.path) {
      const found = state.allLessonsFlat.find(l => l.relPath === state.progress.lastWatched.path);
      if (found) {
        loadLesson(found, state.progress.lastWatched.time || 0);
        return;
      }
    }

    // Default to first video or lesson
    if (state.allLessonsFlat.length > 0) {
      loadLesson(state.allLessonsFlat[0], 0);
    }
  } catch (err) {
    console.error('Failed to load course details:', err);
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


    const itemEl = document.createElement('div');
    itemEl.className = `lesson-item${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`;
    itemEl.tabIndex = 0;
    itemEl.setAttribute('role', 'button');
    itemEl.innerHTML = `
      <span class="lesson-checkbox${isCompleted ? ' completed' : ''}" role="checkbox" aria-checked="${isCompleted}" title="${isCompleted ? 'Mark as incomplete' : 'Mark as complete'}">${isCompleted ? ICONS.check : ''}</span>
      <span class="lesson-body">
        <span class="lesson-title-text" title="${escapeHtml(lesson.fileName || lesson.title)}">${num ? num + '. ' : ''}${escapeHtml(lesson.title)}</span>
        <span class="lesson-meta">${getMediaIcon(lesson.type)}<span>${escapeHtml(lesson.sizeFormatted || '')}</span></span>
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

// Load Lesson into Stage
async function loadLesson(lesson, seekTime = 0) {
  state.activeLesson = lesson;
  cancelAutoplay();

  // Update Breadcrumbs
  breadcrumbSection.textContent = lesson.sectionName || 'Section';
  breadcrumbLesson.textContent = lesson.title;

  // Update Completion button state
  const isCompleted = !!(state.progress.completed && state.progress.completed[lesson.relPath]);
  updateCompleteButtonUI(isCompleted);

  // Update active highlighted class in tree
  renderCurriculum(lessonSearchInput.value);

  const fullPath = `${state.currentCourse.path}/${lesson.relPath}`;

  if (lesson.type === 'video' || lesson.type === 'audio') {
    documentContainer.classList.add('hidden');
    videoContainer.classList.remove('hidden');

    const streamUrl = lesson.fileObject
      ? URL.createObjectURL(lesson.fileObject)
      : `/api/stream?path=${encodeURIComponent(fullPath)}`;

    videoPlayer.src = streamUrl;
    videoPlayer.playbackRate = state.preferences.playbackSpeed || 1;

    // Handle Subtitles
    if (lesson.subFileObject) {
      subtitleTrack.src = URL.createObjectURL(lesson.subFileObject);
      subtitleTrack.mode = 'showing';
    } else if (lesson.subtitle) {
      const subPath = `${state.currentCourse.path}/${lesson.subtitle.relPath}`;
      subtitleTrack.src = `/api/subtitle?path=${encodeURIComponent(subPath)}`;
      subtitleTrack.mode = 'showing';
    } else {
      subtitleTrack.src = '';
      subtitleTrack.mode = 'disabled';
    }

    videoPlayer.onloadedmetadata = () => {
      durationTimeText.textContent = formatTime(videoPlayer.duration);
      if (seekTime > 0) {
        videoPlayer.currentTime = seekTime;
      }
      videoPlayer.play().catch(() => {});
    };
  } else if (lesson.type === 'document' && lesson.ext === '.pdf') {
    videoPlayer.pause();
    videoContainer.classList.add('hidden');
    documentContainer.classList.remove('hidden');
    docPdfFrame.classList.remove('hidden');
    docMarkdownContent.classList.add('hidden');

    docTitle.textContent = lesson.title;
    const fileUrl = lesson.fileObject
      ? URL.createObjectURL(lesson.fileObject)
      : `/api/file?path=${encodeURIComponent(fullPath)}`;
    docPdfFrame.src = fileUrl;
    docOpenExternalBtn.href = fileUrl;
  } else if (lesson.type === 'note' || lesson.ext === '.md' || lesson.ext === '.txt') {
    videoPlayer.pause();
    videoContainer.classList.add('hidden');
    documentContainer.classList.remove('hidden');
    docPdfFrame.classList.add('hidden');
    docMarkdownContent.classList.remove('hidden');

    docTitle.textContent = lesson.title;
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

  // Update Resources Tab for current folder
  updateResourcesTab();

  // Save last watched lesson
  saveLastWatched(0);
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

// Save Watch Timestamp
let lastSaveTick = 0;
function saveLastWatched(forceTime = null) {
  if (!state.currentCourse || !state.activeLesson) return;
  const now = Date.now();
  if (forceTime === null && now - lastSaveTick < 4000) return; // throttle every 4s
  lastSaveTick = now;

  const time = forceTime !== null ? forceTime : Math.floor(videoPlayer.currentTime || 0);
  const duration = Math.floor(videoPlayer.duration || 0);

  fetch(`/api/progress/${state.currentCourse.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lastWatched: {
        path: state.activeLesson.relPath,
        title: state.activeLesson.title,
        time,
        duration
      }
    })
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
    await refreshCoursesList();
    await selectCourse(data.course.id);
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
      selectCourse(c.id);
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
    saveLastWatched();
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
    if (subtitleTrack.mode === 'showing') {
      subtitleTrack.mode = 'hidden';
      subtitlesToggleBtn.classList.add('is-off');
    } else {
      subtitleTrack.mode = 'showing';
      subtitlesToggleBtn.classList.remove('is-off');
    }
  };

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
