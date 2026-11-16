// Renders the store graphics with a headless Chromium: icons and launcher
// mipmaps from the game's favicon art (two decks, pink and cyan), the feature
// graphic, and the store screenshots from real gameplay states (a bot plays:
// the Lab with the starter beat running, the first gig live, and a recorded
// set landing in Your sets). Needs playwright-core and a Chromium build:
//   npm i -D playwright-core   (or set PW_EXE to a chrome-headless-shell)
//   node tools/make-icons.js
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const EXE = process.env.PW_EXE || (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell');
const ROOT = path.join(__dirname, '..');
const BG = '#12101c', BG2 = '#2a2145', FG = '#ffffff';
const FONT = "system-ui, sans-serif", WEIGHT = '800', NAME = 'Pocket Decks';
const TAGLINE = 'Make your own beats. Mix them live. Bedroom stream to Main Stage.';
const GLYPH = `<circle cx='22' cy='34' r='13' fill='none' stroke='#ff5fa2' stroke-width='5'/><circle cx='22' cy='34' r='3' fill='#ff5fa2'/><circle cx='44' cy='34' r='13' fill='none' stroke='#46d9ff' stroke-width='5'/><circle cx='44' cy='34' r='3' fill='#46d9ff'/><rect x='18' y='10' width='28' height='5' rx='2.5' fill='#ffd45a'/>`;
const iconSvg = (k, bg) => {
  const c = 32;
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    (bg ? `<rect width='64' height='64' fill='${BG}'/>` : '') +
    `<g transform='translate(${c - c * k} ${c - c * k}) scale(${k})'>${GLYPH}</g></svg>`;
};
const roundedSvg = () => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${BG}'/>${GLYPH}</svg>`;

async function render(page, html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style='margin:0;padding:0;background:transparent'>${html}</body></html>`);
  await page.waitForTimeout(60);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: true });
  console.log('wrote', path.relative(ROOT, out));
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const full = (size) => iconSvg(1, true).replace('<svg', `<svg width='${size}' height='${size}'`);
  const fgOnly = (size) => iconSvg(1.35, false).replace('<svg', `<svg width='${size}' height='${size}'`);
  await render(page, full(512), 512, 512, path.join(ROOT, 'icons/icon-512.png'));
  await render(page, full(192), 192, 192, path.join(ROOT, 'icons/icon-192.png'));
  await render(page, iconSvg(0.72, true).replace('<svg', `<svg width='512' height='512'`), 512, 512, path.join(ROOT, 'icons/maskable-512.png'));
  for (const [d, l, f] of [['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]]) {
    await render(page, full(l), l, l, path.join(ROOT, `android/play/src/main/res/mipmap-${d}/ic_launcher.png`));
    await render(page, fgOnly(f), f, f, path.join(ROOT, `android/play/src/main/res/mipmap-${d}/ic_launcher_foreground.png`));
  }
  const art = roundedSvg().replace('<svg', `<svg width='300' height='300'`);
  const html = `<div style='width:1024px;height:500px;background:linear-gradient(120deg, ${BG} 0%, ${BG2} 100%);display:flex;align-items:center;gap:44px;padding:0 64px;box-sizing:border-box'>
    <div style='flex:none'>${art}</div>
    <div>
      <div style="font-family:${FONT};font-weight:${WEIGHT};font-size:84px;line-height:1.05;color:${FG}">${NAME}</div>
      <div style="font-family:${FONT};font-size:34px;line-height:1.3;color:${FG};opacity:.85;margin-top:18px;max-width:560px">${TAGLINE}</div>
    </div></div>`;
  await render(page, html, 1024, 500, path.join(ROOT, 'store/feature-graphic-1024x500.png'));
  await page.close();

  // Store screenshots from real gameplay, plus the staged portrait icon shot.
  const game = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await game.goto('file://' + path.join(ROOT, 'index.html'));
  await game.waitForTimeout(1200);
  const shot = async (n) => { await game.screenshot({ path: path.join(ROOT, 'store', n) }); console.log('wrote store/' + n); };
  await shot('screenshot-01-title.png');
  // The Beat Lab: add a bass line to the starter beat, then play it.
  await game.click('#tabs button[data-tab="Lab"]'); await game.waitForTimeout(500);
  await game.evaluate(() => {
    const chip = [...document.querySelectorAll('#laneChips button')].find(b => b.textContent.trim() === 'Bass');
    if (chip) chip.click();
  });
  await game.waitForTimeout(300);
  await game.evaluate(() => {
    const pads = document.querySelectorAll('#pads .pad');
    for (const i of [0, 3, 6, 10, 14]) if (pads[i] && !pads[i].classList.contains('on')) pads[i].click();
  });
  await game.click('#labPlay'); await game.waitForTimeout(1100);
  await shot('screenshot-02-lab.png');
  // A live gig: open the first venue and start the set.
  await game.click('#tabs button[data-tab="Gigs"]'); await game.waitForTimeout(500);
  await game.evaluate(() => { const b = document.querySelector('#venues button'); if (b) b.click(); });
  await game.waitForTimeout(600);
  await game.click('#venueSheet button[data-a="go"]'); await game.waitForTimeout(3200);
  await shot('screenshot-03-gig.png');
  // Your sets: leave the gig, record a short practice set, open the library.
  await game.click('#btnPause'); await game.waitForTimeout(500);
  await game.click('#btnQuit'); await game.waitForTimeout(600);
  await game.click('#tabs button[data-tab="Decks"]'); await game.waitForTimeout(600);
  let setsShot = 'empty library (recording unavailable in this browser)';
  if (await game.isVisible('#btnRec')) {
    await game.click('#btnRec'); await game.waitForTimeout(4000);
    await game.click('#btnRec'); await game.waitForTimeout(1500);
    const recShown = await game.isVisible('#recSheet').catch(() => false);
    if (recShown) {
      await game.click('#recSheet button[data-a="sets"]'); await game.waitForTimeout(900);
      setsShot = 'the recorded set listed in Your sets';
    } else {
      await game.click('#btnSets'); await game.waitForTimeout(900);
    }
  } else {
    await game.click('#btnSets'); await game.waitForTimeout(900);
  }
  await shot('screenshot-04-sets.png');
  console.log('sets screenshot shows:', setsShot);
  // The manifest's portrait shot, at 720x1280.
  const small = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  await small.goto('file://' + path.join(ROOT, 'index.html'));
  await small.waitForTimeout(1000);
  await small.screenshot({ path: path.join(ROOT, 'icons/screenshot-portrait.png') });
  console.log('wrote icons/screenshot-portrait.png');
  await browser.close();
  console.log('icons, feature graphic and screenshots written');
})().catch(e => { console.error(e); process.exit(1); });
