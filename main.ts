// Solmar Heat — entry for the make.fun gta6-01 bounty (Node 22, no dependencies).
// The game lives in game/: static files a desktop browser opens with no network at all
// (index.html, ES modules under game/src/, and the vendored three.js under game/vendor/).
// Running this file assembles the submission: it copies game/ and screenshots/ into the
// output directory and writes dossier.json there, using the vendored make.fun library.
// Try it locally first: `node serve.ts`, then open http://localhost:8080.
// The grader runs this in its own container with /output as the target; outside that
// container, MAKEFUN_OUTPUT_DIR takes /output's place:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Caps from the scorer's reference (reference/gate.json). text_max_bytes is the only one
// that trims output; the rest reject an entry the scorer would reject outright: more than
// four screenshots, or one bigger than 256 KiB; more than 993 files inside game/, or
// 48 MiB of game files in total, or any game/ path longer than 1000 bytes. game/ is
// counted alongside /output's own 1000-entry ceiling, its screenshots/ and dossier.json.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(targetDir, { recursive: true });
cpSync(join(rootDir, 'game'), join(targetDir, 'game'), { recursive: true });
mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
const shotsDir = join(rootDir, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, join(targetDir, 'screenshots'), { recursive: true });
writeFileSync(join(targetDir, 'dossier.json'), buildDossier(targetDir, DOSSIER_LIMITS));
