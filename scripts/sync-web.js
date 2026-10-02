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
  // The admin portal is ~7,000 lines that no member can reach -- nothing in
  // the app navigates to it. It stays served on the web (istanbulite.net/
  // admin.html), which is where it is actually used; shipping it inside the
  // App Store bundle only adds weight to every member's download.
  'admin.html',
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

// ── Version-drift guard ──
// Shared .js/.css carry a `?v=` query so a returning user never runs new HTML
// against a stale cached module (see CLAUDE.md convention 13). Two failure
// modes, both silent at runtime, so they are caught here instead:
//
//   1. A shared file referenced with no version at all -- the browser (and
//      WKWebView, harder still) is free to keep serving the old copy.
//   2. The SAME file spelled differently on two pages -- router.js's
//      loadScriptOnce matches on the exact `src` string, so one page saying
//      `i18n.js?v=3` while another says `i18n.js` makes a single swipe load
//      and re-execute that module a second time.
//
// Only local files are checked; CDN URLs are excluded by the pattern itself.
function checkAssetVersions() {
  const refs = new Map(); // asset -> Map(version -> [pages])
  const pattern = /(?:src|href)="([\w.\-/]+\.(?:js|css))(\?v=\d+)?"/g;
  for (const entry of fs.readdirSync(ROOT)) {
    if (!entry.endsWith('.html') || EXCLUDE.has(entry)) continue;
    const html = fs.readFileSync(path.join(ROOT, entry), 'utf8');
    for (const m of html.matchAll(pattern)) {
      const [, asset, version] = m;
      if (!refs.has(asset)) refs.set(asset, new Map());
      const versions = refs.get(asset);
      const key = version || '(none)';
      if (!versions.has(key)) versions.set(key, []);
      versions.get(key).push(entry);
    }
  }
  const problems = [];
  for (const [asset, versions] of refs) {
    if (versions.size > 1) {
      const spelled = [...versions].map(([v, pages]) => `${v} in ${pages.join(', ')}`);
      problems.push(`  ${asset} is spelled ${versions.size} ways: ${spelled.join(' | ')}`);
    } else if (versions.has('(none)')) {
      problems.push(`  ${asset} carries no ?v= (referenced by ${versions.get('(none)').join(', ')})`);
    }
  }
  if (problems.length) {
    console.error('Asset version check failed:\n' + problems.join('\n'));
    process.exit(1);
  }
}

checkAssetVersions();

console.log(`Synced web files into ${path.relative(ROOT, OUT)}/`);
