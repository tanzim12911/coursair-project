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
  switch (type) {
    case 'video': return '🎬';
    case 'audio': return '🎧';
    case 'document': return '📄';
    case 'note': return '📝';
    case 'code': return '💻';
    case 'archive': return '📦';
    default: return '📁';
  }
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
      sampleChip.className = 'quick-chip-btn';
      sampleChip.style.borderColor = 'var(--primary)';
      sampleChip.style.color = '#a5b4fc';
      sampleChip.innerHTML = '✨ Load Sample Course';
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
  if (node.supplementaryFiles) {
    node.supplementaryFiles.forEach(f => {
      state.allLessonsFlat.push({ ...f, sectionName: currentTitle });
    });
  }
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

// Render Curriculum Tree
function renderCurriculum(filterQuery = '') {
  curriculumList.innerHTML = '';
  const query = filterQuery.toLowerCase().trim();

  if (!state.curriculum) return;

  // Render top-level root lessons if any
  if (state.curriculum.lessons && state.curriculum.lessons.length > 0) {
    const rootNode = {
      title: 'Course Overview & Notes',
      folderName: '',
      relPath: '',
      lessons: state.curriculum.lessons,
      supplementaryFiles: state.curriculum.supplementaryFiles || [],
      sections: []
    };
    const rootEl = createSectionElement(rootNode, query, 0, true);
    if (rootEl) curriculumList.appendChild(rootEl);
  }

  // Render sections
  if (state.curriculum.sections) {
    state.curriculum.sections.forEach((section, idx) => {
      const containsActive = containsActiveLesson(section);
      const isExpanded = containsActive || (idx === 0 && !state.activeLesson);
      const secEl = createSectionElement(section, query, 0, isExpanded);
      if (secEl) curriculumList.appendChild(secEl);
    });
  }
}

function createSectionElement(sectionNode, query = '', depth = 0, defaultExpanded = false) {
  if (query && !nodeMatchesQuery(sectionNode, query)) {
    return null; // hide section if no match
  }

  const { total: totalLessons, completed: completedLessons } = getSubtreeLessonCounts(sectionNode);
  const isAllDone = totalLessons > 0 && completedLessons === totalLessons;
  const hasActive = containsActiveLesson(sectionNode);
  const isExpanded = defaultExpanded || hasActive || (query !== '');

  const sectionDiv = document.createElement('div');
  sectionDiv.className = `curriculum-section depth-${depth} ${isExpanded ? 'expanded' : ''}`;

  const headerDiv = document.createElement('div');
  headerDiv.className = `section-header ${depth > 0 ? 'subfolder-header' : ''}`;
  headerDiv.innerHTML = `
    <div class="section-header-left">
      <svg class="section-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      ${depth > 0 ? '<svg class="folder-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' : ''}
      <span class="section-name" title="${sectionNode.title}">${sectionNode.title}</span>
    </div>
    <span class="section-progress-badge ${isAllDone ? 'all-done' : ''}">${completedLessons}/${totalLessons}</span>
  `;

  headerDiv.onclick = (e) => {
    e.stopPropagation();
    sectionDiv.classList.toggle('expanded');
  };

  const lessonsListDiv = document.createElement('div');
  lessonsListDiv.className = 'section-lessons-list';

  // 1. Direct lessons in this section
  if (sectionNode.lessons) {
    const filteredLessons = sectionNode.lessons.filter(l => !query || l.title.toLowerCase().includes(query) || l.fileName.toLowerCase().includes(query));
    filteredLessons.forEach(lesson => {
      const isCompleted = !!(state.progress.completed && state.progress.completed[lesson.relPath]);
      const isActive = state.activeLesson && state.activeLesson.relPath === lesson.relPath;

      const itemEl = document.createElement('div');
      itemEl.className = `lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
      itemEl.innerHTML = `
        <div class="lesson-item-left">
          <div class="lesson-checkbox ${isCompleted ? 'completed' : ''}" title="Mark completed">
            ${isCompleted ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
          <span class="lesson-icon">${getMediaIcon(lesson.type)}</span>
          <span class="lesson-title-text" title="${lesson.title}">${lesson.title}</span>
        </div>
        <span class="lesson-meta">${lesson.sizeFormatted || ''}</span>
      `;

      // Click checkbox
      const checkEl = itemEl.querySelector('.lesson-checkbox');
      checkEl.onclick = (e) => {
        e.stopPropagation();
        toggleLessonComplete(lesson.relPath);
      };

      // Click item to load
      itemEl.onclick = () => {
        loadLesson(lesson);
      };

      lessonsListDiv.appendChild(itemEl);
    });
  }

  // 2. Direct supplementary files if any
  if (sectionNode.supplementaryFiles && sectionNode.supplementaryFiles.length > 0) {
    const filteredFiles = sectionNode.supplementaryFiles.filter(f => !query || f.title.toLowerCase().includes(query) || f.fileName.toLowerCase().includes(query));
    filteredFiles.forEach(file => {
      const suppEl = document.createElement('div');
      suppEl.className = 'lesson-item supplementary-item';
      suppEl.innerHTML = `
        <div class="lesson-item-left">
          <span class="supplementary-bullet">📦</span>
          <span class="lesson-icon">${getMediaIcon(file.type)}</span>
          <span class="lesson-title-text" title="${file.fileName}">${file.fileName}</span>
        </div>
        <span class="lesson-meta">${file.sizeFormatted || ''}</span>
      `;
      suppEl.onclick = () => {
        loadLesson(file);
      };
      lessonsListDiv.appendChild(suppEl);
    });
  }

  // 3. Child subfolders nested directly inside!
  if (sectionNode.sections && sectionNode.sections.length > 0) {
    sectionNode.sections.forEach(subSection => {
      const subHasActive = containsActiveLesson(subSection);
      const subEl = createSectionElement(subSection, query, depth + 1, subHasActive || isExpanded);
      if (subEl) {
        lessonsListDiv.appendChild(subEl);
      }
    });
  }

  sectionDiv.appendChild(headerDiv);
  sectionDiv.appendChild(lessonsListDiv);
  return sectionDiv;
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
    completeBtnText.textContent = 'Completed ✓';
  } else {
    toggleCompleteBtn.classList.remove('completed');
    completeBtnText.textContent = 'Mark Complete';
  }
}

// Progress Ring & Stats Calculation
function updateProgressRing() {
  const total = state.allLessonsFlat.length;
  const completed = Object.values(state.progress.completed || {}).filter(Boolean).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  progressPercentText.textContent = `${percent}%`;
  progressCountText.textContent = `${completed} of ${total} completed`;

  // Circumference = 2 * PI * 23 = 144.51
  const circumference = 144.5;
  const offset = circumference - (percent / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
}

function updateStatsTab() {
  if (!state.currentCourse) return;
  const completed = Object.values(state.progress.completed || {}).filter(Boolean).length;
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
    notesList.innerHTML = '<div class="empty-state">No notes added yet for this course.</div>';
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
          <span class="note-lesson-tag">${n.lessonTitle || ''}</span>
        </div>
        <div class="note-text">${escapeHtml(n.text)}</div>
      </div>
      <button class="note-delete-btn" title="Delete note">&times;</button>
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
    resourcesList.innerHTML = '<div class="empty-state">No supplementary files found in this section.</div>';
    return;
  }

  resourcesList.innerHTML = '';
  foundResources.forEach(res => {
    const card = document.createElement('a');
    card.className = 'resource-card';
    if (res.fileObject) {
      card.href = URL.createObjectURL(res.fileObject);
      card.target = '_blank';
    } else {
      const fullPath = `${state.currentCourse.path}/${res.relPath}`;
      card.href = `/api/file?path=${encodeURIComponent(fullPath)}&download=true`;
    }
    card.download = res.fileName;
    card.innerHTML = `
      <div class="resource-info">
        <div class="resource-name">${getMediaIcon(res.type)} ${res.fileName}</div>
        <div class="resource-meta">${res.sizeFormatted} • Click to download</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
  submitAddCourseBtn.textContent = 'Discovering...';

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
    submitAddCourseBtn.textContent = 'Discover';
  }
}

// Render Modal Courses List
function renderModalCourseList() {
  modalCoursesList.innerHTML = '';
  if (state.courses.length === 0) {
    modalCoursesList.innerHTML = '<div class="empty-state">No course libraries registered yet.</div>';
    return;
  }

  state.courses.forEach(c => {
    const item = document.createElement('div');
    item.className = 'modal-course-item';
    item.innerHTML = `
      <div class="modal-course-info">
        <div class="modal-course-title">📁 ${c.name}</div>
        <div class="modal-course-path">${c.path}</div>
      </div>
      <div class="modal-course-progress">${c.percent}%</div>
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
  };
  videoPlayer.onpause = () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    saveLastWatched();
  };

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

  theaterBtn.onclick = () => {
    document.querySelector('.media-stage-wrapper').classList.toggle('theater-mode');
  };

  // Subtitles Toggle
  subtitlesToggleBtn.onclick = () => {
    if (subtitleTrack.mode === 'showing') {
      subtitleTrack.mode = 'hidden';
      subtitlesToggleBtn.style.opacity = '0.5';
    } else {
      subtitleTrack.mode = 'showing';
      subtitlesToggleBtn.style.opacity = '1';
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
    else if (e.code === 'Escape') {
      courseModal.classList.add('hidden');
      shortcutsModal.classList.add('hidden');
    }
  };
}

// Start
initApp();
