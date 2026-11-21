# Contributing to Coursair

Thanks for helping out! Bug reports, ideas and pull requests are all welcome.

## Running it locally

```bash
git clone https://github.com/tanzim12911/coursair-project.git
cd coursair-project
npm install
npm start
```

Open http://localhost:3600. There is no build step: edit files in `public/` and refresh the browser. Restart `npm start` after changing `server.js`.

Your library and progress live in `data/` (ignored by git). To test with a clean library without touching yours, point Coursair at another folder:

```bash
COURSAIR_DATA_DIR=/tmp/coursair-test npm start          # macOS / Linux
$env:COURSAIR_DATA_DIR="$env:TEMP\coursair-test"; npm start   # Windows PowerShell
```

## Before opening a pull request

- Run `npm run check` and `npm test`.
- Try your change in the browser, in both light and dark mode if it touches the UI.
- Keep pull requests focused on one change, and describe how you tested it.
- For bigger changes, open an issue first so we can agree on the approach.

## Code layout

- `server.js`: Express server. Scans course folders, streams video, stores progress.
- `public/app.js`: the whole frontend, in plain JavaScript (no framework).
- `public/style.css`: styles. All colors come from theme tokens at the top of the file.
- `bin/coursair.js`: the `coursair` / `npx` command.
- `scripts/smoke-test.mjs`: API tests run by `npm test` and CI.

## Ground rules

- Coursair must keep working fully offline, with no accounts, tracking or network calls.
- File routes must only serve files from courses in the library.
