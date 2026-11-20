import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import os from 'os';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3600;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database file for storing registered courses and user progress
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'coursair-db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      courses: [],
      progress: {}, // { [coursePath]: { completed: { [relPath]: true }, lastWatched: { path, time, duration }, notes: [{ id, lessonPath, time, text, createdAt }] } }
      preferences: { playbackSpeed: 1, volume: 1 }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading DB, resetting to fallback:', e);
    return { courses: [], progress: {}, preferences: {} };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

// Natural Sort comparator for filenames like "01.", "2.", "10."
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
function naturalSort(a, b) {
  return collator.compare(a, b);
}

// Media file classifications
const EXT_MAP = {
  video: ['.mp4', '.mkv', '.webm', '.mov', '.m4v', '.avi', '.ts'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'],
  document: ['.pdf'],
  note: ['.md', '.txt'],
  code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json', '.java', '.cpp', '.c', '.go', '.rs', '.sql', '.sh'],
  archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  subtitle: ['.vtt', '.srt']
};

function getFileType(ext) {
  ext = ext.toLowerCase();
  for (const [type, exts] of Object.entries(EXT_MAP)) {
    if (exts.includes(ext)) return type;
  }
  return 'other';
}

// Format file size
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Recursive scanner that builds a clean curriculum hierarchy
function scanCourseDirectory(rootPath, currentDir = '', depth = 0) {
  const fullPath = currentDir ? path.join(rootPath, currentDir) : rootPath;
  if (!fs.existsSync(fullPath)) return null;

  let entries;
  try {
    entries = fs.readdirSync(fullPath, { withFileTypes: true });
  } catch (err) {
    console.error(`Cannot read directory: ${fullPath}`, err);
    return null;
  }

  // Sort natural order
  entries.sort((a, b) => naturalSort(a.name, b.name));

  const sections = [];
  const lessons = [];
  const supplementaryFiles = [];
  const subtitles = {};

  // First pass: identify subtitles to associate with videos
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.vtt' || ext === '.srt') {
        const base = path.basename(entry.name, ext).toLowerCase();
        subtitles[base] = {
          name: entry.name,
          relPath: currentDir ? path.join(currentDir, entry.name).replace(/\\/g, '/') : entry.name,
          ext
        };
      }
    }
  }

  for (const entry of entries) {
    // Skip hidden files/directories (e.g., .git, .DS_Store, node_modules)
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const relPath = currentDir ? path.join(currentDir, entry.name).replace(/\\/g, '/') : entry.name;
    const entryFullPath = path.join(fullPath, entry.name);

    if (entry.isDirectory()) {
      const subTree = scanCourseDirectory(rootPath, relPath, depth + 1);
      if (subTree && (subTree.lessons.length > 0 || subTree.sections.length > 0 || subTree.supplementaryFiles.length > 0)) {
        sections.push({
          title: cleanTitle(entry.name, false),
          folderName: entry.name,
          relPath,
          ...subTree
        });
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const type = getFileType(ext);
      let stats = null;
      try {
        stats = fs.statSync(entryFullPath);
      } catch (e) {}

      const fileItem = {
        title: cleanTitle(entry.name, true),
        fileName: entry.name,
        relPath,
        ext,
        type,
        sizeBytes: stats ? stats.size : 0,
        sizeFormatted: stats ? formatBytes(stats.size) : '0 B',
        modified: stats ? stats.mtime : null
      };

      if (type === 'video' || type === 'audio') {
        // Find the matching subtitle in the same folder (exact name, or name + language tag)
        const baseName = path.basename(entry.name, ext).toLowerCase();
        const matchedSub = findSubtitleFor(baseName, subtitles);
        if (matchedSub) {
          fileItem.subtitle = matchedSub;
        }
        lessons.push(fileItem);
      } else if (type === 'document' || type === 'note') {
        // Can be a lesson item or supplementary material
        lessons.push(fileItem);
      } else if (type !== 'subtitle') {
        // Supplementary resources (code, zip, data)
        supplementaryFiles.push(fileItem);
      }
    }
  }

  return { sections, lessons, supplementaryFiles };
}

// Match "Lesson 1.srt", "Lesson 1.en.srt", "Lesson 1_en.srt", "Lesson 1 - en-US.srt" to "Lesson 1.mp4",
// but never "Lesson 10.srt". Exact matches win over language-tagged ones.
const LANG_SUFFIX = /^[._\s-]+[a-z]{2,3}([-_][a-z]{2,4})?$/i;
function findSubtitleFor(videoBase, subtitles) {
  if (subtitles[videoBase]) return subtitles[videoBase];
  for (const [subBase, subInfo] of Object.entries(subtitles)) {
    if (subBase.startsWith(videoBase) && LANG_SUFFIX.test(subBase.slice(videoBase.length))) {
      return subInfo;
    }
  }
  return null;
}

// Strip leading numbers/formatting for clean display (handles folders with dots)
function cleanTitle(name, isFile = false) {
  let baseName = name;
  if (isFile) {
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0) baseName = name.substring(0, lastDot);
  }
  const cleaned = baseName
    .replace(/^[\d\s._\-]+/, '') // Strip leading digits and separators
    .replace(/_/g, ' ')
    .trim();
  return cleaned || baseName;
}

// Convert SRT to VTT subtitle format on the fly
function srtToVtt(srtContent) {
  let vtt = 'WEBVTT\n\n' + srtContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return vtt;
}

// Count total lessons and duration in a course tree
function calculateCourseStats(scanData) {
  let totalLessons = 0;
  let totalVideos = 0;
  let totalDocs = 0;
  let totalResources = 0;

  function traverse(node) {
    if (!node) return;
    if (node.lessons) {
      for (const lesson of node.lessons) {
        totalLessons++;
        if (lesson.type === 'video' || lesson.type === 'audio') totalVideos++;
        if (lesson.type === 'document' || lesson.type === 'note') totalDocs++;
      }
    }
    if (node.supplementaryFiles) {
      totalResources += node.supplementaryFiles.length;
    }
    if (node.sections) {
      for (const section of node.sections) {
        traverse(section);
      }
    }
  }

  traverse(scanData);
  return { totalLessons, totalVideos, totalDocs, totalResources };
}

// API Routes

// 1. Get all registered courses + global preferences
app.get('/api/courses', (req, res) => {
  const db = loadDB();
  const validCourses = [];

  for (const c of db.courses) {
    const exists = fs.existsSync(c.path);
    const progress = db.progress[c.id] || { completed: {} };
    const completedCount = Object.values(progress.completed || {}).filter(Boolean).length;

    validCourses.push({
      ...c,
      exists,
      completedCount,
      percent: c.totalLessons > 0 ? Math.round((completedCount / c.totalLessons) * 100) : 0,
      lastWatched: progress.lastWatched || null
    });
  }

  res.json({ courses: validCourses, preferences: db.preferences || {} });
});

// 2. Add a new course folder
// ---------- Native folder dialog ----------
// Browsers never reveal a picked folder's real path, so a course chosen in the browser
// can't be saved. The server runs on the user's own machine, so it opens the OS dialog
// instead and gets the real path.

function isLoopbackRequest(req) {
  const addr = req.socket.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

const WINDOWS_PICKER_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.FolderBrowserDialog
$dlg.Description = 'Choose a course folder for Coursair'
$dlg.ShowNewFolderButton = $false
$start = $env:COURSAIR_PICK_START
if ($start -and (Test-Path -LiteralPath $start)) { $dlg.SelectedPath = $start }
# An invisible always-on-top owner keeps the dialog in front of the browser
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
if ($dlg.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dlg.SelectedPath }
$owner.Dispose()
`;

function runPicker(cmd, args, env) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout: 10 * 60 * 1000, env: { ...process.env, ...env } }, (err, stdout) => {
      if (err && err.code === 'ENOENT') return reject(Object.assign(new Error(`${cmd} not found`), { unsupported: true }));
      // A non-zero exit from these dialogs means the user cancelled
      if (err) return resolve(null);
      const picked = String(stdout).trim();
      resolve(picked || null);
    });
  });
}

async function openNativeFolderDialog(startDir) {
  if (process.platform === 'win32') {
    const encoded = Buffer.from(WINDOWS_PICKER_SCRIPT, 'utf16le').toString('base64');
    return runPicker('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encoded], { COURSAIR_PICK_START: startDir });
  }
  if (process.platform === 'darwin') {
    const p = await runPicker('osascript', ['-e', 'POSIX path of (choose folder with prompt "Choose a course folder for Coursair")'], {});
    return p ? p.replace(/\/$/, '') : null;
  }
  try {
    return await runPicker('zenity', ['--file-selection', '--directory', '--title=Choose a course folder for Coursair', `--filename=${startDir}/`], {});
  } catch (e) {
    if (!e.unsupported) throw e;
    return runPicker('kdialog', ['--getexistingdirectory', startDir, '--title', 'Choose a course folder for Coursair'], {});
  }
}

let folderDialogOpen = false;
app.post('/api/pick-folder', async (req, res) => {
  if (!isLoopbackRequest(req)) {
    return res.status(403).json({ error: 'The folder dialog can only be opened on the computer running Coursair.', unsupported: true });
  }
  if (folderDialogOpen) {
    return res.status(409).json({ error: 'A folder dialog is already open. Check your taskbar.' });
  }
  folderDialogOpen = true;
  try {
    const videos = path.join(os.homedir(), 'Videos');
    const picked = await openNativeFolderDialog(fs.existsSync(videos) ? videos : os.homedir());
    res.json(picked ? { path: picked } : { cancelled: true });
  } catch (err) {
    res.status(501).json({ error: `Could not open a folder dialog: ${err.message}`, unsupported: true });
  } finally {
    folderDialogOpen = false;
  }
});

// ---------- Progress merging (carry over progress from browser-only sessions) ----------
function sanitizeProgress(p) {
  if (!p || typeof p !== 'object') return null;
  const out = { completed: {}, notes: [], positions: {}, lastWatched: null };
  for (const [k, v] of Object.entries(p.completed || {})) if (v === true) out.completed[k] = true;
  for (const n of Array.isArray(p.notes) ? p.notes : []) {
    if (n && typeof n.id === 'string' && typeof n.text === 'string' && typeof n.lessonPath === 'string') {
      out.notes.push({ id: n.id, lessonPath: n.lessonPath, lessonTitle: String(n.lessonTitle || ''), time: Number(n.time) || 0, text: n.text, createdAt: n.createdAt || new Date().toISOString() });
    }
  }
  for (const [k, v] of Object.entries(p.positions || {})) {
    if (v && typeof v === 'object') out.positions[k] = { time: Number(v.time) || 0, duration: Number(v.duration) || 0, updatedAt: v.updatedAt || new Date(0).toISOString() };
  }
  const lw = p.lastWatched;
  if (lw && typeof lw.path === 'string') out.lastWatched = { path: lw.path, title: String(lw.title || ''), time: Number(lw.time) || 0, duration: Number(lw.duration) || 0, updatedAt: lw.updatedAt || new Date(0).toISOString() };
  return out;
}

const newer = (a, b) => Date.parse((a && a.updatedAt) || 0) > Date.parse((b && b.updatedAt) || 0);

function mergeProgress(target, src) {
  if (!src) return target;
  target.completed = { ...(src.completed || {}), ...(target.completed || {}) };
  const noteIds = new Set((target.notes || []).map(n => n.id));
  target.notes = [...(target.notes || []), ...(src.notes || []).filter(n => !noteIds.has(n.id))];
  target.positions = target.positions || {};
  for (const [k, v] of Object.entries(src.positions || {})) {
    if (!target.positions[k] || newer(v, target.positions[k])) target.positions[k] = v;
  }
  if (src.lastWatched && (!target.lastWatched || newer(src.lastWatched, target.lastWatched))) {
    target.lastWatched = src.lastWatched;
  }
  return target;
}

// Id the browser-only picker used for a folder name (must match app.js)
const browserOnlyCourseId = (folderName) => 'local_' + folderName.replace(/[^a-zA-Z0-9_]/g, '_');

app.post('/api/courses/add', (req, res) => {
  let { folderPath, name, importProgress } = req.body;
  if (!folderPath || typeof folderPath !== 'string') {
    return res.status(400).json({ error: 'Folder path is required' });
  }

  folderPath = path.resolve(folderPath.trim());
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: `Directory does not exist: "${folderPath}"` });
  }

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'Specified path is a file, not a folder' });
  }

  const courseName = name && name.trim() ? name.trim() : path.basename(folderPath);
  const scan = scanCourseDirectory(folderPath);
  if (!scan) {
    return res.status(500).json({ error: 'Failed to scan directory' });
  }

  const stats = calculateCourseStats(scan);
  const db = loadDB();

  // Check if course already added
  const existing = db.courses.find(c => c.path.toLowerCase() === folderPath.toLowerCase());
  const courseId = existing ? existing.id : 'course_' + Date.now();

  const courseEntry = {
    id: courseId,
    name: courseName,
    path: folderPath,
    ...stats,
    addedAt: existing ? existing.addedAt : new Date().toISOString(),
    lastScanned: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, courseEntry);
  } else {
    db.courses.push(courseEntry);
  }

  // Carry over progress from earlier browser-only sessions of this folder
  const localId = browserOnlyCourseId(path.basename(folderPath));
  if (!db.progress[courseId]) db.progress[courseId] = { completed: {}, lastWatched: null, notes: [] };
  let importedProgress = false;
  if (localId !== courseId && db.progress[localId]) {
    mergeProgress(db.progress[courseId], sanitizeProgress(db.progress[localId]));
    delete db.progress[localId];
    importedProgress = true;
  }
  const fromBrowser = sanitizeProgress(importProgress);
  if (fromBrowser) {
    mergeProgress(db.progress[courseId], fromBrowser);
    importedProgress = true;
  }

  saveDB(db);
  res.json({ success: true, course: courseEntry, importedProgress, browserOnlyId: localId });
});

// 3. Remove a course from the library
app.delete('/api/courses/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  db.courses = db.courses.filter(c => c.id !== id);
  delete db.progress[id];
  saveDB(db);
  res.json({ success: true });
});

// 4. Scan a course and return full curriculum tree
app.get('/api/courses/:id/curriculum', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const course = db.courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (!fs.existsSync(course.path)) {
    return res.status(404).json({ error: `Folder no longer exists at ${course.path}` });
  }

  const curriculum = scanCourseDirectory(course.path);
  const stats = calculateCourseStats(curriculum);

  // Update stats in DB
  course.totalLessons = stats.totalLessons;
  course.totalVideos = stats.totalVideos;
  course.totalDocs = stats.totalDocs;
  course.totalResources = stats.totalResources;
  saveDB(db);

  const progress = db.progress[id] || { completed: {}, lastWatched: null, notes: [] };

  res.json({
    course,
    curriculum,
    stats,
    progress
  });
});

// 5. Video Range Streaming Endpoint (HTTP 206 Partial Content)
app.get('/api/stream', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Media file not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = mime.lookup(filePath) || 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 6. Subtitle serving endpoint with automatic SRT to VTT conversion
app.get('/api/subtitle', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Subtitle file not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', 'text/vtt; charset=utf-8');

  if (ext === '.vtt') {
    fs.createReadStream(filePath).pipe(res);
  } else if (ext === '.srt') {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.send(srtToVtt(content));
  } else {
    res.status(400).send('Unsupported subtitle format');
  }
});

// 7. General File Server (PDFs, Markdown, Downloads)
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  const download = req.query.download === 'true';

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);

  if (download) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }

  fs.createReadStream(filePath).pipe(res);
});

// 8. Progress & Notes API
app.get('/api/progress/:courseId', (req, res) => {
  const { courseId } = req.params;
  const db = loadDB();
  res.json(db.progress[courseId] || { completed: {}, lastWatched: null, notes: [] });
});

app.post('/api/progress/:courseId', (req, res) => {
  const { courseId } = req.params;
  const { completed, lastWatched, position, note, deleteNoteId, preferences } = req.body;
  const db = loadDB();

  if (!db.progress[courseId]) {
    db.progress[courseId] = { completed: {}, lastWatched: null, notes: [] };
  }

  const courseProg = db.progress[courseId];

  // Update completion toggle
  if (completed) {
    const { relPath, status } = completed;
    if (relPath) {
      if (status) {
        courseProg.completed[relPath] = true;
      } else {
        delete courseProg.completed[relPath];
      }
    }
  }

  // Update last watched timestamp
  if (lastWatched) {
    courseProg.lastWatched = {
      ...courseProg.lastWatched,
      ...lastWatched,
      updatedAt: new Date().toISOString()
    };
  }

  // Per-video resume position
  if (position && typeof position.relPath === 'string') {
    if (!courseProg.positions) courseProg.positions = {};
    courseProg.positions[position.relPath] = {
      time: Math.max(0, Math.floor(Number(position.time) || 0)),
      duration: Math.max(0, Math.floor(Number(position.duration) || 0)),
      updatedAt: new Date().toISOString()
    };
  }

  // Add a timestamped note
  if (note) {
    if (!courseProg.notes) courseProg.notes = [];
    courseProg.notes.push({
      id: 'note_' + Date.now(),
      lessonPath: note.lessonPath,
      lessonTitle: note.lessonTitle,
      time: note.time || 0,
      text: note.text,
      createdAt: new Date().toISOString()
    });
  }

  // Delete note
  if (deleteNoteId && courseProg.notes) {
    courseProg.notes = courseProg.notes.filter(n => n.id !== deleteNoteId);
  }

  // Update global preferences (e.g. speed, volume)
  if (preferences) {
    db.preferences = { ...db.preferences, ...preferences };
  }

  saveDB(db);
  res.json({ success: true, progress: courseProg, preferences: db.preferences });
});

// Helper: Common quick folders on Windows
app.get('/api/system-folders', (req, res) => {
  const userHome = process.env.USERPROFILE || process.env.HOME || 'C:\\';
  const folders = [
    { label: 'Downloads', path: path.join(userHome, 'Downloads') },
    { label: 'Videos', path: path.join(userHome, 'Videos') },
    { label: 'Documents', path: path.join(userHome, 'Documents') },
    { label: 'Desktop', path: path.join(userHome, 'Desktop') },
    { label: 'C:\\ Drive', path: 'C:\\' }
  ].filter(f => fs.existsSync(f.path));

  res.json({ folders, samplePath: path.join(__dirname, 'sample-course') });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` Coursair is flying high!`);
  console.log(` Local Dashboard: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
