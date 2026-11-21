#!/usr/bin/env node
// Command-line entry point: `npx github:tanzim12911/coursair-project` or `coursair` after a global install.
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));

const help = `Coursair ${version}: an offline course player for your downloaded video courses.

Usage: coursair [options]

Options:
  -p, --port <number>   Port to listen on (default: 3600, or $PORT)
      --host <address>  Address to listen on (default: 127.0.0.1, this computer only)
      --data <folder>   Where to keep your library and progress (default: ~/.coursair)
  -v, --version         Print the version
  -h, --help            Show this help
`;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const value = () => {
    const v = args[++i];
    if (!v) { console.error(`Missing value for ${arg}\n\n${help}`); process.exit(1); }
    return v;
  };
  if (arg === '-h' || arg === '--help') { console.log(help); process.exit(0); }
  else if (arg === '-v' || arg === '--version') { console.log(version); process.exit(0); }
  else if (arg === '-p' || arg === '--port') process.env.PORT = value();
  else if (arg === '--host') process.env.HOST = value();
  else if (arg === '--data') process.env.COURSAIR_DATA_DIR = path.resolve(value());
  else { console.error(`Unknown option: ${arg}\n\n${help}`); process.exit(1); }
}

// Keep data outside the install folder so it survives updates and npx cache cleanups.
if (!process.env.COURSAIR_DATA_DIR) {
  process.env.COURSAIR_DATA_DIR = path.join(os.homedir(), '.coursair');
}

await import('../server.js');
