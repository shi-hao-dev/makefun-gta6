import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// Assemble only the two public asset trees; the helper is the unchanged kit library.
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
mkdirSync(destination, { recursive: true });
for (const tree of ['game', 'screenshots']) {
  const target = resolve(destination, tree);
  rmSync(target, { recursive: true, force: true });
  cpSync(new URL(`./${tree}`, import.meta.url), target, { recursive: true });
}
const caps = {
  game_max_bytes: 48 * 1024 * 1024,
  game_max_files: 993,
  game_path_max_bytes: 1000,
  text_max_bytes: 160 * 1024,
  screenshots: { max_bytes: 256 * 1024, max: 4 },
};
writeFileSync(resolve(destination, 'dossier.json'), buildDossier(destination, caps));
console.log(`Solmar Heat assembled in ${destination}`);
