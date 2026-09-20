// Dependency-free checks used locally and by the Pages workflow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const source = name => fs.readFileSync(name, 'utf8');
for (const name of ['app.js', 'curriculum.js', 'progress.js', 'sw.js']) new vm.Script(source(name), { filename: name });
const context = vm.createContext({ window: {} });
vm.runInContext(source('curriculum.js'), context);
vm.runInContext(source('progress.js'), context);
const p = context.window.ProgressLogic;
assert.equal(p.nextStreak('', '2026-09-20', 0), 1);
assert.equal(p.nextStreak('2026-09-20', '2026-09-20', 4), 4);
assert.equal(p.nextStreak('2026-09-19', '2026-09-20', 4), 5);
assert.equal(p.nextStreak('2026-09-18', '2026-09-20', 4), 1);
assert.equal(p.nextStreak('2025-12-31', '2026-01-01', 4), 5);
assert.equal(p.nextStreak('2024-02-28', '2024-02-29', 4), 5);
assert.equal(p.currentStreak('2026-09-18', '2026-09-20', 4), 0);
assert.equal(p.currentStreak('2026-09-19', '2026-09-20', 4), 4);
assert.equal(p.currentStreak('', '2026-09-20', 4), 0);
const chars = context.REQUIRED_CHARACTERS;
assert.equal(new Set(chars).size, chars.length);
for (const char of chars) {
  const data = JSON.parse(source(`character-data/${char}.json`));
  assert(data.strokes.length > 0 && data.strokes.length === data.medians.length, `Invalid stroke data: ${char}`);
}
const manifest = JSON.parse(source('manifest.webmanifest'));
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const png = fs.readFileSync(icon.src);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
// Evaluate the real worker with a minimal event environment, including its import.
const worker = vm.createContext({
  self: { addEventListener() {} },
  importScripts(file) { vm.runInContext(source(file), worker); }
});
vm.runInContext(source('sw.js'), worker);
const shell = vm.runInContext('APP_SHELL', worker);
for (const file of shell) assert(fs.existsSync(decodeURIComponent(file)), `Missing offline asset: ${file}`);
assert.equal(shell.filter(file => file.includes('character-data/')).length, chars.length);
// A curriculum-only edit must change the worker's derived cache list.
const future = vm.createContext({
  self: { addEventListener() {} },
  importScripts(file) {
    vm.runInContext(source(file).replace('target: "妈妈"', 'target: "妈妈好"'), future);
  }
});
vm.runInContext(source('sw.js'), future);
assert(vm.runInContext('APP_SHELL', future).some(file => decodeURIComponent(file) === './character-data/好.json'));
console.log(`PASS: streaks, JavaScript syntax, manifest/icons, ${chars.length} character files, offline shell, single-source curriculum.`);
