import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
        // Find matching subtitle if any
        const baseName = path.basename(entry.name, ext).toLowerCase();
        let matchedSub = null;
        for (const [subBase, subInfo] of Object.entries(subtitles)) {
          if (subBase === baseName || subBase.startsWith(baseName) || baseName.startsWith(subBase)) {
            matchedSub = subInfo;
            break;
          }
        }
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
app.post('/api/courses/add', (req, res) => {
  let { folderPath, name } = req.body;
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

  saveDB(db);
  res.json({ success: true, course: courseEntry });
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
  const { completed, lastWatched, note, deleteNoteId, preferences } = req.body;
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
