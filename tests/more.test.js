// The "More from AugustInnovations" list: node tests/more.test.js
// This game ships as one offline file, so the shared catalog (js/more.js in the other
// games, byte for byte) and the icons (as data: URIs) are inlined in index.html between
// the MORE markers. This reads them from there.
const fs = require('fs'); const path = require('path'); const assert = require('assert'); const vm = require('vm');
const root = path.resolve(__dirname, '..'); const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const block = (b, e) => { const i = html.indexOf(b), j = html.indexOf(e); assert.ok(i >= 0 && j > i && html.indexOf(b, i + 1) < 0, 'expected one ' + b); return html.slice(i + b.length, j); };
const mod = { exports: {} }; vm.runInNewContext(block('/* MORE:BEGIN */', '/* MORE:END */'), { module: mod }); const M = mod.exports;
const win = {}; vm.runInNewContext(block('/* MORE-ICONS:BEGIN */', '/* MORE-ICONS:END */'), { window: win }); const ICONS = win.MORE_ICONS || {};
const gradle = fs.readFileSync(path.join(root, 'android/play/build.gradle'), 'utf8');
const self = (gradle.match(/applicationId\s+['"]com\.taugustincst\.([a-z0-9]+)['"]/) || [])[1];
let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
t('this game is in the catalog', () => assert.ok(M.CATALOG.some(x => x.id === self), 'no catalog entry for ' + self));
const list = M.listFor(self);
t('the list leaves this game out', () => assert.ok(list.length > 0 && !list.some(x => x.id === self)));
t('only live titles with a hook are listed', () => assert.ok(list.every(x => x.live && x.hook)));
t('no prices or promo words on the screen', () => list.forEach(x => assert.ok(!/[$£€¥]|\bfree\b|\bsale\b|\bdiscount\b|\bprice\b/i.test(x.title + ' ' + x.hook), x.id)));
t('hooks fit one line of 80 characters', () => list.forEach(x => assert.ok(x.hook.length <= 80, x.id)));
t('every link is a Play listing on our package', () => list.forEach(x => assert.strictEqual(M.url(x), 'https://play.google.com/store/apps/details?id=com.taugustincst.' + x.id)));
t('every catalog title has its icon inlined as a PNG data: URI', () => M.CATALOG.forEach(x => assert.ok(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(ICONS[x.id] || ''), x.id)));
t('nearest genre comes first', () => { const share = x => x.tags.filter(g => M.CATALOG.find(c => c.id === self).tags.includes(g)).length; for (let i = 1; i < list.length; i++) assert.ok(share(list[i - 1]) >= share(list[i])); });
t('the 16+ title is never cross-promoted', () => assert.ok(!M.CATALOG.some(x => x.id === 'nightshift')));
t('the game reads the inlined catalog and icons, with no fetch of its own', () => { const ui = html.replace(/<script>\/\* MORE:BEGIN \*\/[\s\S]*?\/\* MORE-ICONS:END \*\/<\/script>/, ''); assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new Image\b/.test(ui)); assert.ok(ui.includes('window.MoreGames') && ui.includes('window.MORE_ICONS')); });
console.log(`${n}/10 more-games checks passed`);
