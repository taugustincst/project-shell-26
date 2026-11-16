'use strict';
// Static checks on index.html: fully offline, scripts parse, required screens exist.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.error('FAIL ' + name + '\n  ' + (e && e.message)); }
}

// the one allowed URL-looking string is the SVG namespace inside an xmlns attribute
const stripped = html.replace(/xmlns=(['"])http:\/\/www\.w3\.org\/2000\/svg\1/g, 'xmlns=$1$1');

test('no http:// or https:// anywhere (except the SVG xmlns value)', () => {
  assert.ok(!/http:\/\//i.test(stripped), 'found http://');
  assert.ok(!/https:\/\//i.test(stripped), 'found https://');
});
test('no protocol-relative or external src/href', () => {
  const re = /\b(src|href)\s*=\s*(["'])(.*?)\2/gi;
  let m;
  while ((m = re.exec(html))) {
    const v = m[3].trim();
    assert.ok(v.startsWith('#') || v.startsWith('data:'), m[1] + ' points outside the file: ' + v.slice(0, 60));
  }
  assert.ok(!/\b(src|href)\s*=\s*[^"'\s>]/i.test(html), 'unquoted src/href');
  assert.ok(!/\/\/[a-z0-9-]+\.[a-z]{2,}\//i.test(stripped.replace(/\/\*[\s\S]*?\*\//g, '')), 'protocol-relative URL');
});
test('no external stylesheets, imports, fetches or sockets', () => {
  assert.ok(!/<link[^>]+rel=["']?stylesheet/i.test(html), 'link rel=stylesheet');
  assert.ok(!/\bimport\s*\(/.test(html), 'dynamic import(');
  assert.ok(!/@import/i.test(html), '@import');
  assert.ok(!/\bfetch\s*\(/.test(html), 'fetch(');
  assert.ok(!/XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(html), 'network API');
  assert.ok(!/<script[^>]+src=/i.test(html), 'external script');
  // CSS url() may only point at data: or #fragments (script code such as URL.createObjectURL is not CSS)
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|\bstyle="([^"]*)"/gi)].map(m => m[1] || m[2] || '').join('\n');
  assert.ok(!/url\(\s*['"]?(?!data:|#)/i.test(css), 'css url() to a file');
});
test('every inline script parses', () => {
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) { new vm.Script(m[1], { filename: 'inline-' + n + '.js' }); n++; }
  assert.ok(n >= 2, 'expected the engine script and the UI script');
});
test('engine block is delimited exactly once', () => {
  assert.strictEqual(html.split('/* ENGINE:BEGIN */').length, 2);
  assert.strictEqual(html.split('/* ENGINE:END */').length, 2);
  assert.ok(html.indexOf('/* ENGINE:BEGIN */') < html.indexOf('/* ENGINE:END */'));
});
test('head: viewport, title, inline favicon', () => {
  assert.ok(html.includes('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'));
  assert.ok(/<title>Pocket Decks<\/title>/.test(html));
  assert.ok(/<link rel="icon" href="data:image\/svg\+xml,/.test(html));
});
function elementTag(id) {
  const m = html.match(new RegExp('<[a-z]+[^>]*\\bid="' + id + '"[^>]*>', 'i'));
  return m ? m[0] : null;
}
test('required elements exist', () => {
  for (const id of ['ladder', 'venueMap', 'rankPips', 'rankTitle', 'rankNext', 'home', 'btnStart', 'viewLab', 'pads', 'overview', 'kits', 'slots', 'chain',
    'viewDecks', 'xf', 'gigHud', 'crowd', 'goals', 'coach', 'fxEcho', 'fxRiser', 'btnRec', 'viewGigs', 'venues', 'tabs',
    'results', 'unlock', 'btnBuy', 'btnRestore', 'unlockWeb', 'settings', 'tSound', 'tMotion', 'tBig', 'btnReset', 'btnRestore2', 'pause', 'venueSheet', 'library', 'slotSheet', 'recSheet']) {
    assert.ok(elementTag(id), 'missing #' + id);
  }
});
test('the long-term ladder and venue road are visible on the first screen', () => {
  for (const id of ['ladder', 'venueMap', 'rankPips']) assert.ok(!/\shidden\b/.test(elementTag(id)), '#' + id + ' must not start hidden');
  const ladderAt = html.indexOf('id="ladder"'), firstSheet = html.indexOf('class="sheet"');
  assert.ok(ladderAt > 0 && ladderAt < firstSheet, 'ladder sits in the main layout, not inside a sheet');
});
test('overlay sheets start hidden', () => {
  for (const id of ['results', 'unlock', 'settings', 'pause', 'venueSheet', 'library', 'slotSheet', 'recSheet', 'gigHud']) assert.ok(/\shidden\b/.test(elementTag(id)), '#' + id + ' should start hidden');
});
test('monetization: one product, billing bridge contract, playtest switch, no ads', () => {
  assert.ok(html.includes("'full_unlock'"));
  const products = html.match(/productId|PRODUCT\s*=/g) || [];
  assert.ok(products.length >= 1);
  for (const k of ['window.AndroidBilling', 'window.__billingEvent', "'ready'", "'unavailable'", "'price'", "'owned'", "'purchased'", "'pending'", "'cancelled'", "'error'"]) assert.ok(html.includes(k), 'billing: ' + k);
  assert.ok(html.includes("GAME + '.playtest'") && html.includes("=== 'full'"), 'playtest switch');
  assert.ok(html.includes('The full game unlocks in the Google Play edition.'));
  assert.ok(!/[?&]dev\b|location\.search|location\.hash/.test(html), 'no URL bypass');
  assert.ok(!/\$\s?\d|\d+\.\d\d\s?(USD|usd)|€|£\d/.test(html), 'no hard-coded price in the game');
  assert.ok(!/\badvert|\bads?\s*sdk|admob|interstitial/i.test(html.replace(/No ads/gi, '')), 'no ad code');
});
test('accessibility basics: reduced motion honoured, text never below 14px', () => {
  assert.ok(html.includes('prefers-reduced-motion'));
  const px = [...html.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => +m[1]);
  for (const v of px) assert.ok(v >= 14, 'font-size ' + v + 'px');
  const rem = [...html.matchAll(/font-size:\s*([\d.]+)rem/g)].map(m => +m[1]);
  for (const v of rem) assert.ok(v * 16 >= 14 - 1e-9, 'font-size ' + v + 'rem');
  assert.ok(html.includes('visibilitychange'));
  assert.ok(html.includes('AugustInnovations'));
});

test('every sound is synthesized: no audio files or samples', () => {
  assert.ok(!/\.(mp3|wav|ogg|m4a|flac)['"]/i.test(html.replace(/\? 'ogg' :/g, '')), 'audio file reference');
  assert.ok(!/decodeAudioData|new Audio\(/.test(html), 'sample loading');
  assert.ok(html.includes('createOscillator') && html.includes('createBiquadFilter'), 'synth voices');
});
test('recordings are saved without building a link in markup', () => {
  assert.ok(html.includes("setAttribute('download'"));
  assert.ok(html.includes('MediaRecorder'));
});

console.log(`static tests: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
