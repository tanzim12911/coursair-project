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
const PORT = Number(process.env.PORT) || 3600;
// Only this computer can reach Coursair unless HOST is set (e.g. HOST=0.0.0.0 for your LAN).
const HOST = process.env.HOST || '127.0.0.1';
const LOCAL_BIND = ['127.0.0.1', 'localhost', '::1'].includes(HOST);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

app.disable('x-powered-by');

// Reject requests addressed to some other hostname (DNS rebinding) while bound locally.
app.use((req, res, next) => {
  if (!LOCAL_BIND) return next();
  const hostname = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) return next();
  res.status(403).send('Forbidden: unexpected Host header');
});

// Reject changes sent by other websites open in the same browser.
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch (e) {}
  res.status(403).json({ error: 'Cross-origin request blocked' });
});

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
app.param(['id', 'courseId'], (req, res, next, value) => {
  if (UNSAFE_KEYS.has(value)) return res.status(400).json({ error: 'Invalid id' });
  next();
});

// Database file for storing registered courses and user progress
const DATA_DIR = process.env.COURSAIR_DATA_DIR
  ? path.resolve(process.env.COURSAIR_DATA_DIR)
  : path.join(__dirname, 'data');
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
    // Keep the unreadable file so no progress is silently lost.
    const backup = DB_FILE.replace(/\.json$/, `.corrupt-${Date.now()}.json`);
    try { fs.copyFileSync(DB_FILE, backup); } catch (err) {}
    console.error(`Could not read ${DB_FILE}; a copy was saved to ${backup}. Starting with an empty library.`, e.message);
    return { courses: [], progress: {}, preferences: {} };
  }
}

function saveDB(data) {
  try {
    // Write to a temp file first so a crash mid-write can't corrupt the database.
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
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
  let firstVideo = null; // used to generate the course thumbnail

  function traverse(node) {
    if (!node) return;
    if (node.lessons) {
      for (const lesson of node.lessons) {
        totalLessons++;
        if (!firstVideo && lesson.type === 'video') firstVideo = lesson.relPath;
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
  return { totalLessons, totalVideos, totalDocs, totalResources, firstVideo };
}

// API Routes

// ---------- Course thumbnails ----------
// Priority: a frame captured from the course's first video (generated by the browser and
// cached in data/thumbnails), else cover art shipped in the course folder.
const THUMB_DIR = path.join(DATA_DIR, 'thumbnails');
const FOLDER_COVER_NAMES = ['cover', 'thumbnail', 'thumb', 'poster', 'folder'];
const FOLDER_COVER_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

const thumbFile = (courseId) => path.join(THUMB_DIR, `${String(courseId).replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`);

function findFolderCover(coursePath) {
  let entries;
  try { entries = fs.readdirSync(coursePath); } catch (e) { return null; }
  for (const name of FOLDER_COVER_NAMES) {
    const hit = entries.find(f => FOLDER_COVER_EXTS.includes(path.extname(f).toLowerCase()) && path.parse(f).name.toLowerCase() === name);
    if (hit) return path.join(coursePath, hit);
  }
  return null;
}

// Returns { file, version, source } or null
function getCourseThumbnail(course) {
  const cached = thumbFile(course.id);
  if (fs.existsSync(cached)) return { file: cached, version: Math.floor(fs.statSync(cached).mtimeMs), source: 'video' };
  const cover = fs.existsSync(course.path) ? findFolderCover(course.path) : null;
  if (cover) return { file: cover, version: Math.floor(fs.statSync(cover).mtimeMs), source: 'folder' };
  return null;
}

app.get('/api/courses/:id/thumbnail', (req, res) => {
  const course = loadDB().courses.find(c => c.id === req.params.id);
  const thumb = course && getCourseThumbnail(course);
  if (!thumb) return res.status(404).send('No thumbnail');
  res.setHeader('Content-Type', mime.lookup(thumb.file) || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable'); // URLs carry ?v=<mtime>
  fs.createReadStream(thumb.file).pipe(res);
});

app.post('/api/courses/:id/thumbnail', express.raw({ type: 'image/jpeg', limit: '3mb' }), (req, res) => {
  const course = loadDB().courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const buf = req.body;
  // Must be a real JPEG (FF D8 FF ... FF D9)
  if (!Buffer.isBuffer(buf) || buf.length < 100 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    return res.status(400).json({ error: 'Expected a JPEG image' });
  }
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  fs.writeFileSync(thumbFile(course.id), buf);
  const thumb = getCourseThumbnail(course);
  res.json({ success: true, thumbnailVersion: thumb.version });
});

app.delete('/api/courses/:id/thumbnail', (req, res) => {
  try { fs.unlinkSync(thumbFile(req.params.id)); } catch (e) {}
  res.json({ success: true });
});

// 1. Get all registered courses + global preferences
app.get('/api/courses', (req, res) => {
  const db = loadDB();
  const validCourses = [];
  let dbChanged = false;

  for (const c of db.courses) {
    const exists = fs.existsSync(c.path);
    const progress = db.progress[c.id] || { completed: {} };
    const completedCount = Object.values(progress.completed || {}).filter(Boolean).length;

    // Courses added before thumbnails existed: find their first video once
    if (exists && c.firstVideo === undefined) {
      const scan = scanCourseDirectory(c.path);
      c.firstVideo = scan ? calculateCourseStats(scan).firstVideo : null;
      dbChanged = true;
    }

    const thumb = getCourseThumbnail(c);
    validCourses.push({
      ...c,
      exists,
      completedCount,
      percent: c.totalLessons > 0 ? Math.round((completedCount / c.totalLessons) * 100) : 0,
      lastWatched: progress.lastWatched || null,
      thumbnailVersion: thumb ? thumb.version : null,
      thumbnailSource: thumb ? thumb.source : null
    });
  }

  if (dbChanged) saveDB(db);
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
  for (const [k, v] of Object.entries(p.completed || {})) if (v === true && !UNSAFE_KEYS.has(k)) out.completed[k] = true;
  for (const n of Array.isArray(p.notes) ? p.notes : []) {
    if (n && typeof n.id === 'string' && typeof n.text === 'string' && typeof n.lessonPath === 'string') {
      out.notes.push({ id: n.id, lessonPath: n.lessonPath, lessonTitle: String(n.lessonTitle || ''), time: Number(n.time) || 0, text: n.text, createdAt: n.createdAt || new Date().toISOString() });
    }
  }
  for (const [k, v] of Object.entries(p.positions || {})) {
    if (v && typeof v === 'object' && !UNSAFE_KEYS.has(k)) out.positions[k] = { time: Number(v.time) || 0, duration: Number(v.duration) || 0, updatedAt: v.updatedAt || new Date(0).toISOString() };
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
  try { fs.unlinkSync(thumbFile(id)); } catch (e) {}
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

// File routes only serve files that live inside a course in the library.
const comparablePath = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
function isInsideFolder(child, parent) {
  const rel = path.relative(comparablePath(parent), comparablePath(child));
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}
function resolveCourseFile(requested) {
  if (typeof requested !== 'string' || !requested) return null;
  const full = path.resolve(requested);
  const inLibrary = loadDB().courses.some(c => c.path && isInsideFolder(full, path.resolve(c.path)));
  if (!inLibrary) return null;
  try {
    return fs.statSync(full).isFile() ? full : null;
  } catch (e) {
    return null;
  }
}
function pipeFile(res, filePath, options) {
  const stream = fs.createReadStream(filePath, options);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).end();
    else res.destroy();
  });
  stream.pipe(res);
}

// 5. Video Range Streaming Endpoint (HTTP 206 Partial Content)
app.get('/api/stream', (req, res) => {
  const filePath = resolveCourseFile(req.query.path);
  if (!filePath) {
    return res.status(404).send('Media file not found');
  }

  const fileSize = fs.statSync(filePath).size;
  const contentType = mime.lookup(filePath) || 'video/mp4';
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');

  if (match && (match[1] || match[2])) {
    let start, end;
    if (match[1] === '') {
      // Suffix range: the last N bytes
      start = Math.max(0, fileSize - Number(match[2]));
      end = fileSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), fileSize - 1) : fileSize - 1;
    }
    if (start >= fileSize || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType
    });
    pipeFile(res, filePath, { start, end });
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    pipeFile(res, filePath);
  }
});

// 6. Subtitle serving endpoint with automatic SRT to VTT conversion
app.get('/api/subtitle', (req, res) => {
  const filePath = resolveCourseFile(req.query.path);
  if (!filePath) {
    return res.status(404).send('Subtitle file not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', 'text/vtt; charset=utf-8');

  if (ext === '.vtt') {
    pipeFile(res, filePath);
  } else if (ext === '.srt') {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.send(srtToVtt(content));
  } else {
    res.status(400).send('Unsupported subtitle format');
  }
});

// 7. General File Server (PDFs, Markdown, Downloads)
// Types a browser would run as a page; shown as plain text so course files can't script the app.
const ACTIVE_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml', 'image/svg+xml', 'text/xml', 'application/xml']);

app.get('/api/file', (req, res) => {
  const filePath = resolveCourseFile(req.query.path);
  const download = req.query.download === 'true';

  if (!filePath) {
    return res.status(404).send('File not found');
  }

  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (download) {
    res.setHeader('Content-Type', mimeType);
    res.attachment(path.basename(filePath));
  } else {
    res.setHeader('Content-Type', ACTIVE_CONTENT_TYPES.has(mimeType) ? 'text/plain; charset=utf-8' : mimeType);
    res.setHeader('Content-Disposition', 'inline');
  }

  pipeFile(res, filePath);
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
    if (typeof relPath === 'string' && relPath && !UNSAFE_KEYS.has(relPath)) {
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
  if (position && typeof position.relPath === 'string' && !UNSAFE_KEYS.has(position.relPath)) {
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
  if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
    db.preferences = { ...db.preferences, ...preferences };
  }

  saveDB(db);
  res.json({ success: true, progress: courseProg, preferences: db.preferences });
});

// Helper: Common quick folders on Windows
app.get('/api/system-folders', (req, res) => {
  const userHome = os.homedir();
  const folders = [
    { label: 'Downloads', path: path.join(userHome, 'Downloads') },
    { label: 'Videos', path: path.join(userHome, process.platform === 'darwin' ? 'Movies' : 'Videos') },
    { label: 'Documents', path: path.join(userHome, 'Documents') },
    { label: 'Desktop', path: path.join(userHome, 'Desktop') },
    ...(process.platform === 'win32' ? [{ label: 'C:\\ Drive', path: 'C:\\' }] : [])
  ].filter(f => fs.existsSync(f.path));

  res.json({ folders, samplePath: path.join(__dirname, 'sample-course') });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`\n  Coursair is running at http://localhost:${PORT}\n`);
  if (!LOCAL_BIND) {
    console.log(`  Listening on ${HOST}: other devices on your network can open your course files.`);
    console.log(`  Only do this on a network you trust.\n`);
  }
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other program or run with PORT=<another port>.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
