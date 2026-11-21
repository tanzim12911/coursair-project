# Coursair

Coursair turns a folder of downloaded course videos into a course player that runs in your browser, similar to Udemy or Coursera. It runs on your own computer, so nothing is uploaded and no account is needed.

Point it at a course folder. It builds the curriculum from the folder structure, remembers where you stopped in every video, and tracks your progress across all your courses.

## Features

**Dashboard**
- A "My learning" home page shows every course with its progress, time left and when you last watched it.
- Continue where you left off with one click.
- Filter courses by in progress, not started or completed, or search by name.
- Each course card shows a frame from the course's first video as its thumbnail. If the course folder has its own cover image (`cover`, `thumbnail`, `poster` or `folder` as .jpg, .png or .webp), that is used instead.

**Course player**
- Builds sections and lessons from nested folders, in natural number order (`2 - …` comes before `10 - …`).
- Remembers your position in each video, and offers to resume when you come back.
- Streams large video files with instant seeking, without loading the whole file.
- Shows subtitles from `.srt` or `.vtt` files that sit next to the video, such as `Lesson.srt` or `Lesson.en.srt`.
- Lets you set the playback speed, use fullscreen or expanded view, and turn on autoplay for the next lesson.
- Opens PDFs and Markdown or text notes inside the player. Other files (code, archives) appear as lesson resources.

**Progress and notes**
- Mark lessons complete; a progress ring shows how far through the course you are.
- Add notes at a timestamp, and click a note to jump back to that moment.
- Export your notes for a course as Markdown.

**Comfort**
- Light and dark themes. It follows your system setting until you choose one.
- Keyboard shortcuts for everything (press <kbd>?</kbd> in the app to see them).

## Getting started

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/tanzim12911/coursair-project.git
cd coursair-project
npm install
npm start
```

Then open **http://localhost:3600**.

To use a different port, set the `PORT` environment variable:

```bash
PORT=4000 npm start          # macOS / Linux
$env:PORT=4000; npm start    # Windows PowerShell
```

### Adding a course

1. On the dashboard, click **Add course**.
2. Click **Choose a course folder** and pick the folder in your system's folder dialog, or paste the folder's path into the box.
3. The course appears on your dashboard and stays there after you restart.

The folder dialog works on Windows, macOS, and Linux. On Linux it needs `zenity` or `kdialog`. If neither is installed, paste the path instead.

**Open a folder for this session only** loads a course straight from the browser without saving it to your library. That's useful for a quick look. If you later add the same folder properly, the progress you made is carried over.

A sample course is included in [sample-course/](sample-course/) so you can try the app right away. You can add it from the empty dashboard.

## How a course folder should look

Coursair works with the folder layout most course downloads already use. Each top-level folder becomes a section, and each video, PDF or note becomes a lesson:

```
My Course/
├── cover.jpg                      (optional course thumbnail)
├── 01 - Getting Started/
│   ├── 01 - Welcome.mp4
│   ├── 01 - Welcome.en.srt        (subtitles for 01 - Welcome.mp4)
│   ├── 02 - Setup.mp4
│   └── slides.pdf
└── 02 - Building the App/
    ├── 01 - Project structure.mkv
    └── starter-code.zip           (shown as a resource)
```

Supported files:

| Kind | Extensions |
| --- | --- |
| Video | `.mp4` `.mkv` `.webm` `.mov` `.m4v` `.avi` `.ts` |
| Audio | `.mp3` `.wav` `.m4a` `.aac` `.flac` `.ogg` |
| Documents | `.pdf` |
| Notes | `.md` `.txt` |
| Subtitles | `.srt` `.vtt` |
| Archives (resources) | `.zip` `.rar` `.7z` `.tar` `.gz` |

Videos play in your browser, so playback depends on what the browser can decode. MP4 (H.264) and WebM work everywhere. Some `.mkv`, `.avi`, and HEVC files may not play; converting them to MP4 fixes that.

## Keyboard shortcuts

| Action | Key |
| --- | --- |
| Play / pause | <kbd>Space</kbd> |
| Seek 5s back / forward | <kbd>←</kbd> <kbd>→</kbd> |
| Seek 15s back / forward | <kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> |
| Mark lesson complete | <kbd>C</kbd> |
| Next / previous lesson | <kbd>Shift</kbd> + <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>P</kbd> |
| Fullscreen | <kbd>F</kbd> |
| Expanded view | <kbd>T</kbd> |
| Mute | <kbd>M</kbd> |
| Speed 1x / 1.25x / 1.5x / 2x | <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> |
| Light / dark mode | <kbd>D</kbd> |
| Show shortcuts | <kbd>?</kbd> |

## Where your data is stored

Everything stays on your computer, in the `data/` folder of the project:

- `data/coursair-db.json` holds your course library, completed lessons, notes and video positions.
- `data/thumbnails/` holds the generated course thumbnails.

Your course videos are never copied or changed. To start fresh, stop the server and delete `data/`. The folder is ignored by git, so your progress is never committed.

## Security note

Coursair is meant to run on your own machine for your own use. The server can read files from the folders you give it, so don't expose port 3600 to the internet or to networks you don't trust.

## Project structure

```
server.js                  Express server: course scanning, video streaming, progress API
public/index.html          App shell (dashboard and player)
public/app.js              Frontend logic (vanilla JavaScript, no build step)
public/style.css           Styles and light/dark theme
sample-course/             Small demo course
create-sample-course.js    Regenerates the sample course (needs ffmpeg)
```

There is no build step. Edit the files and refresh the browser; restart `npm start` after changing `server.js`.

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you'd like to change.
