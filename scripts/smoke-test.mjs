// Starts Coursair with a throwaway data folder and checks the main API paths.
// Run with `npm test`.
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert/strict';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coursair-test-'));
const port = 3900 + Math.floor(Math.random() * 500);
const base = `http://localhost:${port}`;

const server = spawn(process.execPath, [path.join(root, 'server.js')], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', COURSAIR_DATA_DIR: dataDir },
  stdio: ['ignore', 'pipe', 'inherit']
});

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`  ok    ${name}`);
  } catch (e) {
    results.push(false);
    console.log(`  FAIL  ${name}\n        ${e.message}`);
  }
}

const json = (url, options) => fetch(base + url, options).then(r => r.json());
const postJson = (url, body, headers = {}) => fetch(base + url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body)
});

try {
  // Wait for the server to come up
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    try { up = (await fetch(base + '/')).ok; } catch (e) { await new Promise(r => setTimeout(r, 200)); }
  }
  assert.ok(up, 'server did not start');

  const samplePath = path.join(root, 'sample-course');
  let course;

  await test('starts with an empty library', async () => {
    const { courses } = await json('/api/courses');
    assert.deepEqual(courses, []);
  });

  await test('adds the sample course', async () => {
    const res = await postJson('/api/courses/add', { folderPath: samplePath });
    assert.equal(res.status, 200);
    course = (await res.json()).course;
    assert.ok(course.totalVideos > 0, 'no videos found');
    assert.ok(course.firstVideo, 'firstVideo missing');
  });

  await test('returns the curriculum', async () => {
    const { curriculum } = await json(`/api/courses/${course.id}/curriculum`);
    assert.ok(Array.isArray(curriculum.sections) && curriculum.sections.length > 0);
  });

  const videoUrl = () => `/api/stream?path=${encodeURIComponent(path.join(samplePath, course.firstVideo))}`;

  await test('streams video byte ranges', async () => {
    const res = await fetch(base + videoUrl(), { headers: { Range: 'bytes=0-99' } });
    assert.equal(res.status, 206);
    assert.equal((await res.arrayBuffer()).byteLength, 100);
  });

  await test('rejects a range past the end of the file', async () => {
    const res = await fetch(base + videoUrl(), { headers: { Range: 'bytes=999999999-' } });
    assert.equal(res.status, 416);
  });

  await test('converts .srt subtitles to WebVTT', async () => {
    const srt = fs.readdirSync(samplePath, { recursive: true }).find(f => String(f).endsWith('.srt'));
    const res = await fetch(`${base}/api/subtitle?path=${encodeURIComponent(path.join(samplePath, srt))}`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /^WEBVTT/);
  });

  await test('refuses files outside the library', async () => {
    for (const p of [path.join(root, 'package.json'), path.join(samplePath, '..', 'server.js')]) {
      const res = await fetch(`${base}/api/file?path=${encodeURIComponent(p)}`);
      assert.equal(res.status, 404, p);
    }
  });

  await test('refuses requests for another hostname', async () => {
    // fetch() won't let us set Host, so use a raw HTTP request
    const http = await import('http');
    const status = await new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: '/api/courses', headers: { Host: 'evil.example' } }, r => resolve(r.statusCode)).on('error', reject);
    });
    assert.equal(status, 403);
  });

  await test('refuses changes from other websites', async () => {
    const res = await postJson(`/api/progress/${course.id}`, {}, { Origin: 'https://evil.example' });
    assert.equal(res.status, 403);
  });

  await test('saves progress and resume positions', async () => {
    const relPath = course.firstVideo;
    await postJson(`/api/progress/${course.id}`, { completed: { relPath, status: true } });
    await postJson(`/api/progress/${course.id}`, { position: { relPath, time: 42, duration: 100 } });
    const progress = await json(`/api/progress/${course.id}`);
    assert.equal(progress.completed[relPath], true);
    assert.equal(progress.positions[relPath].time, 42);
  });

  await test('removes the course', async () => {
    await fetch(`${base}/api/courses/${course.id}`, { method: 'DELETE' });
    const { courses } = await json('/api/courses');
    assert.equal(courses.length, 0);
  });
} catch (e) {
  results.push(false);
  console.error(e);
} finally {
  server.kill();
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) {}
}

const failed = results.filter(r => !r).length;
console.log(failed ? `\n${failed} test(s) failed` : `\nAll ${results.length} tests passed`);
process.exit(failed ? 1 : 0);
