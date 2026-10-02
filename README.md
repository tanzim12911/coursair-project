# Coursair 🚀
### Modern Offline Course Dashboard & Media Player

Coursair transforms any nested folder of offline courses on your PC into a rich LMS dashboard with natural curriculum sorting, instant video seeking, progression tracking, timestamped notes, and PDF viewing.

---

## 🌟 Key Features

1. **Intelligent Curriculum Scanner**:
   - Recursively discovers nested modules, submodules, and lessons.
   - Natural numerical sorting (e.g. `01. ...`, `2. ...`, `10. ...` instead of alphabetical sorting).
   - Detects videos (`.mp4`, `.mkv`, `.webm`), slides/PDFs (`.pdf`), notes (`.md`), code files, and archives.
   - On-the-fly `.srt` to `.vtt` subtitle conversion for browser `<track>` playback.

2. **Hardware-Accelerated Video Player**:
   - HTTP 206 Partial Content (Range streaming) for instant seeking without buffering whole multi-GB videos.
   - Playback speed memory: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x.
   - Theater mode, Fullscreen, and Subtitles toggle.
   - Auto-advance to the next lesson with countdown overlay.

3. **Progress & Note Taking**:
   - Checkbox progress tracking with circular progress completion ring.
   - Saves last-watched lesson and playback timestamp for seamless auto-resume.
   - Add notes at exact timestamps with 1-click jump back to that point in the lesson.
   - One-click export of notes to Markdown (`course-notes.md`).

4. **Multi-Course Library**:
   - Add any local folder directory on your machine (`C:\...`, `D:\...`).
   - Switch between multiple courses with the course switcher.

---

## 🏃 Running Coursair

The server is currently running at:
👉 **http://localhost:3600**

To run it anytime manually:
```bash
cd C:\Workspace\coursair-project
npm start
```
