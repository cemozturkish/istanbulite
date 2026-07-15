// Copies the site's web files into www/, which Capacitor bundles into the
// native iOS app. Run via `npm run sync` before `npx cap sync ios`.
//
// Everything at the repo root ships EXCEPT the paths in EXCLUDE below —
// dev tooling, native projects, DB migrations, and docs have no place in
// the app bundle.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

const EXCLUDE = new Set([
  '.git',
  '.github',
  '.claude',
  'node_modules',
  'ios',
  'android',
  'www',
  'db',
  'scripts',
  'CLAUDE.md',
  'README.md',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  '.gitignore',
  'CNAME',
]);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const entry of fs.readdirSync(ROOT)) {
  if (EXCLUDE.has(entry)) continue;
  copyRecursive(path.join(ROOT, entry), path.join(OUT, entry));
}

console.log(`Synced web files into ${path.relative(ROOT, OUT)}/`);
