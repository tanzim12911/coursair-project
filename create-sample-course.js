import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleDir = path.join(__dirname, 'sample-course');

const structure = [
  {
    folder: '01 - Getting Started',
    files: [
      {
        name: '01 - Welcome & Course Overview.mp4',
        type: 'video',
        title: 'Welcome & Overview',
        color: '#1e1b4b',
        duration: 12
      },
      {
        name: '01 - Welcome & Course Overview.srt',
        type: 'srt',
        content: `1
00:00:01,000 --> 00:00:04,500
Welcome to Coursair: Your offline course masterclass!

2
00:00:05,000 --> 00:00:09,000
In this series, we cover architecture, deep modules, and real code.

3
00:00:09,500 --> 00:00:12,000
Let's dive into setting up our local workspace!`
      },
      {
        name: '02 - Environment Setup & Tooling.mp4',
        type: 'video',
        title: 'Environment Setup',
        color: '#0f172a',
        duration: 10
      },
      {
        name: '03 - Roadmap & Core Milestones.mp4',
        type: 'video',
        title: 'Roadmap & Milestones',
        color: '#1e293b',
        duration: 8
      },
      {
        name: 'course-syllabus.md',
        type: 'text',
        content: `# Coursair Masterclass: Complete Syllabus

## Module 1: Foundation
- Welcome & Overview
- Dev Environment: Node 22, Git, VSCode/Antigravity
- Project Structure & Conventions

## Module 2: System Architecture
- State Machine design
- Natural-sort parsing algorithms
- Audio & Video HTTP Range streaming (RFC 7233)

## Module 3: Advanced Optimization
- Client-side cache persistence
- Markdown rendering & Timestamped notes
- Portable course packaging
`
      }
    ]
  },
  {
    folder: '02 - Core Architecture & Design Patterns',
    files: [
      {
        name: '01 - Reactive State Management.mp4',
        type: 'video',
        title: 'Reactive State Flow',
        color: '#064e3b',
        duration: 14
      },
      {
        name: '02 - HTTP 206 Partial Content Streaming.mp4',
        type: 'video',
        title: 'Video Range Streaming',
        color: '#134e4a',
        duration: 10
      },
      {
        name: '03 - Natural Sorting & File System Trees.mp4',
        type: 'video',
        title: 'Folder Tree Discovery',
        color: '#1e3a8a',
        duration: 11
      },
      {
        name: 'architecture-notes.md',
        type: 'text',
        content: `# Architecture Reference Notes

### Range Request Headers:
\`\`\`http
Range: bytes=0-1048575
\`\`\`
Response:
\`\`\`http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1048575/15894200
Content-Length: 1048576
Content-Type: video/mp4
\`\`\`

> **Key Rule**: Range headers allow browsers to seek forward instantly without buffering the entire multi-gigabyte video file.
`
      }
    ]
  },
  {
    folder: '03 - Advanced Mastery & Deployment',
    files: [
      {
        name: '01 - Timestamp Bookmarks & Note Taking.mp4',
        type: 'video',
        title: 'Bookmarks & Note Taking',
        color: '#4c1d95',
        duration: 9
      },
      {
        name: '02 - Production Checklist & Packaging.mp4',
        type: 'video',
        title: 'Production Packaging',
        color: '#31104b',
        duration: 12
      },
      {
        name: 'production-checklist.md',
        type: 'text',
        content: `# Production Ready Checklist

- [x] Natural numerical folder sorting
- [x] Zero-dependency JSON state store
- [x] Dynamic SRT to VTT subtitle track conversion
- [x] Speed memory (0.5x - 2.5x)
- [x] Keyboard shortcuts (Space, Arrow keys, F, M, N)
- [x] Auto-play next countdown
`
      }
    ]
  }
];

console.log('Generating rich sample course directory...');

for (const section of structure) {
  const targetFolder = path.join(sampleDir, section.folder);
  fs.mkdirSync(targetFolder, { recursive: true });

  for (const file of section.files) {
    const filePath = path.join(targetFolder, file.name);
    if (fs.existsSync(filePath)) {
      continue;
    }

    if (file.type === 'video') {
      try {
        console.log(`Generating sample video: ${file.name}`);
        // Create an elegant video with FFmpeg test source
        const cmd = `ffmpeg -y -f lavfi -i color=c=${file.color}:s=1280x720:d=${file.duration} -f lavfi -i sine=f=440:b=4:d=${file.duration} -vf "drawtext=text='${file.title}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2-30,drawtext=text='Coursair Sample Stream':fontcolor=0x94a3b8:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+40" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 64k -shortest "${filePath}"`;
        execSync(cmd, { stdio: 'ignore' });
      } catch (e) {
        // Fallback: minimal valid video if drawtext font issues occur
        try {
          const fallbackCmd = `ffmpeg -y -f lavfi -i color=c=${file.color}:s=1280x720:d=${file.duration} -f lavfi -i anullsrc=r=44100:cl=stereo -t ${file.duration} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${filePath}"`;
          execSync(fallbackCmd, { stdio: 'ignore' });
        } catch (err2) {
          console.error(`Failed to generate video ${file.name}:`, err2.message);
        }
      }
    } else if (file.type === 'text' || file.type === 'srt') {
      fs.writeFileSync(filePath, file.content, 'utf-8');
    }
  }
}

// Pre-seed sample course into coursair-db.json
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'coursair-db.json');
fs.mkdirSync(dataDir, { recursive: true });

let db = { courses: [], progress: {}, preferences: { playbackSpeed: 1, volume: 1 } };
if (fs.existsSync(dbFile)) {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  } catch (e) {}
}

const existingSample = db.courses.find(c => c.path.toLowerCase() === sampleDir.toLowerCase());
if (!existingSample) {
  db.courses.unshift({
    id: 'sample_course_fullstack',
    name: 'Full-Stack Modern Architecture (Sample Course)',
    path: sampleDir,
    totalLessons: 8,
    totalVideos: 6,
    totalDocs: 3,
    totalResources: 0,
    addedAt: new Date().toISOString(),
    lastScanned: new Date().toISOString()
  });
  // Add some initial progress so it feels alive
  db.progress['sample_course_fullstack'] = {
    completed: {
      '01 - Getting Started/01 - Welcome & Course Overview.mp4': true
    },
    lastWatched: {
      path: '01 - Getting Started/02 - Environment Setup & Tooling.mp4',
      title: 'Environment Setup & Tooling',
      time: 4,
      duration: 10
    },
    notes: [
      {
        id: 'note_demo_1',
        lessonPath: '01 - Getting Started/01 - Welcome & Course Overview.mp4',
        lessonTitle: 'Welcome & Overview',
        time: 5,
        text: 'Important concept: Course progress persists locally in JSON format!',
        createdAt: new Date().toISOString()
      }
    ]
  };
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8');
}

console.log('Sample course ready at:', sampleDir);
