'use strict';
// Play-through simulation: bots of different skill play every venue through the real engine.
// Checks that the first gig is passable by a casual player, that skill is rewarded, that doing nothing
// fails, that clashing is punished, and that the free/full gate and unlock road never soft-lock.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/\/\* ENGINE:BEGIN \*\/([\s\S]*?)\/\* ENGINE:END \*\//)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(src + '\nthis.Engine = Engine;', ctx);
const E = ctx.Engine;
const VERBOSE = process.argv.includes('-v');

// a beat the player made: the starter groove with a few edits (marks it as theirs)
function ownTrack(kit) {
  const p = E.clonePattern(E.packById('starter'));
  if (kit) p.kit = kit;
  E.toggleStep(p, 'kick', 10, 1); E.toggleStep(p, 'bass', 6, 3); E.toggleStep(p, 'bass', 11, 5);
  p.own = true; p.name = 'My beat 1';
  return E.makeTrack([p], p.name, 'slot:0');
}
function packsFor(progress, owned) {
  return E.PACKS.filter(p => p.id !== 'starter' && E.canUse(progress, owned, 'kit', p.kit)).map(p => p.id);
}

// skill: reaction jitter (s) on drop releases, how often it blends, whether it chases goals
const BOTS = {
  idle:     { idle: true },
  clasher:  { blendEvery: 20, sync: false, jitter: 0.2, dropEvery: 0 },
  casual:   { blendEvery: 26, sync: true, jitter: 0.22, dropEvery: 24, chase: false, xfTime: 3 },
  good:     { blendEvery: 17, sync: true, jitter: 0.05, dropEvery: 13, chase: true, xfTime: 2 }
};

function play(vi, botName, seed, progress, owned) {
  const bot = BOTS[botName];
  const v = E.VENUES[vi];
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const g = E.createGig(vi, seed);
  E.loadDeck(g.decks[0], E.packTrack(v.decks[0].slice(5)));
  E.loadDeck(g.decks[1], E.packTrack(v.decks[1].slice(5)));
  E.setPlaying(g.decks[0], true, null);
  const dt = 1 / 30;
  const pool = packsFor(progress, owned);
  const goalTypes = v.goals.map(x => x.type);
  let live = 0, nextBlend = 8 + rnd() * 4, nextDrop = 5 + rnd() * 3, xfMove = null, drop = null, packI = 0;
  let echoOff = -1, nextEcho = 6;
  while (!g.done) {
    const t = g.t;
    if (!bot.idle) {
      // blends: cue a fresh track on the idle deck, sync it, start it, slide across
      if (!xfMove && !drop && t >= nextBlend && g.t < g.secs - 6) {
        const nd = 1 - live, d = g.decks[nd];
        let ref;
        if (bot.chase && goalTypes.includes('own') && g.ownSecs < 45) ref = 'own';
        else if (bot.chase && goalTypes.includes('kit')) { const kitGoal = v.goals.find(x => x.type === 'kit'); const pk = E.PACKS.find(p => p.kit === kitGoal.kit && p.id !== d.track.ref); ref = pk ? pk.id : pool[packI++ % pool.length]; }
        else ref = pool[packI++ % pool.length];
        d.playing = false;
        E.loadDeck(d, ref === 'own' ? ownTrack(null) : E.packTrack(ref));
        if (bot.sync) E.syncDeck(d, g.decks[live]); else E.nudgeBpm(d, 6);
        E.setPlaying(d, true, g.decks[live]);
        xfMove = { from: g.xf, to: nd === 1 ? 1 : 0, t0: t + 0.6, dur: bot.xfTime || 3, to_deck: nd };
      }
      if (xfMove && t >= xfMove.t0) {
        const k = Math.min(1, (t - xfMove.t0) / xfMove.dur);
        E.setCrossfader(g, xfMove.from + (xfMove.to - xfMove.from) * k);
        if (k >= 1) { live = xfMove.to_deck; g.decks[1 - live].playing = false; xfMove = null; nextBlend = t + bot.blendEvery * (0.8 + rnd() * 0.4); }
      }
      // drops: twist the filter on the live deck, hold it, let go on the 1 (with the bot's reaction time)
      if (bot.dropEvery && !xfMove && !drop && t >= nextDrop) { drop = { deck: live, t0: t }; E.setFilter(g, live, rnd() < 0.5 ? -0.8 : 0.8); }
      if (drop) {
        const d = g.decks[drop.deck];
        const beats = (t - drop.t0) * d.bpm / 60;
        const pos = E.deckBarPos(d);
        if (beats >= E.BUILD_BEATS + 0.3 && !drop.aim && pos > 13 && pos < 14) drop.aim = t + (16 - pos) / E.stepsPerSecond(d.bpm) + (rnd() * 2 - 1) * bot.jitter;
        if (drop.aim && t >= drop.aim) { E.setFilter(g, drop.deck, 0); drop = null; nextDrop = t + bot.dropEvery * (0.8 + rnd() * 0.4); }
      }
      // echo throws on the 1 when the venue asks for them
      if (bot.chase && goalTypes.includes('echo') && !xfMove && !drop && t >= nextEcho && E.canUse(progress, owned, 'effect', 'echo')) {
        const pos = E.deckBarPos(g.decks[live]);
        if (pos > 15.75 || pos < 0.4) { E.setEcho(g, true); echoOff = t + 1.2; nextEcho = t + 9; }
      }
      if (echoOff > 0 && t >= echoOff) { E.setEcho(g, false); echoOff = -1; }
    }
    E.tickGig(g, dt);
  }
  return E.gigResult(g, progress, owned);
}

let pass = 0, fail = 0;
function check(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + '\n  ' + e.message); } }
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// progress as a player who has cleared everything before venue vi
function before(vi) { const p = E.newProgress(); for (let i = 0; i < vi; i++) p.cleared.push(i); return p; }
const table = {};
for (const bot of Object.keys(BOTS)) {
  table[bot] = E.VENUES.map((v, vi) => {
    const rs = SEEDS.map(s => play(vi, bot, s, before(vi), true));
    return { rating: Math.round(rs.reduce((a, x) => a + x.rating, 0) / rs.length), passRate: rs.filter(x => x.pass).length / rs.length,
      stars: rs.reduce((a, x) => a + x.stars, 0) / rs.length, clashes: rs.reduce((a, x) => a + x.clashes, 0) / rs.length };
  });
}
if (VERBOSE) for (const bot in table) console.log(bot.padEnd(8), table[bot].map((x, i) => E.VENUES[i].id + ' ' + x.rating + '% pass ' + Math.round(x.passRate * 100) + '% ' + x.stars.toFixed(1) + '★').join(' | '));

check('a casual player passes the first gig nearly every time', () => assert.ok(table.casual[0].passRate >= 0.9, 'casual bedroom pass ' + table.casual[0].passRate));
check('a casual player passes the free Rooftop most of the time', () => assert.ok(table.casual[1].passRate >= 0.6, 'casual rooftop pass ' + table.casual[1].passRate));
check('a good player passes every venue', () => table.good.forEach((x, i) => assert.ok(x.passRate >= 0.9, E.VENUES[i].id + ' good pass ' + x.passRate)));
check('a good player earns most stars', () => table.good.forEach((x, i) => assert.ok(x.stars >= 2.5, E.VENUES[i].id + ' good stars ' + x.stars)));
check('the later venues are harder: casual players do not cruise the Main Stage', () => assert.ok(table.casual[5].passRate <= 0.5, 'casual main stage pass ' + table.casual[5].passRate));
check('doing nothing fails every venue', () => table.idle.forEach((x, i) => assert.ok(x.passRate === 0, E.VENUES[i].id + ' idle pass ' + x.passRate)));
check('clashing beats are punished: the clasher scores well below the casual player', () => table.clasher.forEach((x, i) => assert.ok(x.rating < table.casual[i].rating - 5, E.VENUES[i].id + ' clasher ' + x.rating + ' vs casual ' + table.casual[i].rating)));
check('skill shows in the score: good beats casual at every venue', () => table.good.forEach((x, i) => assert.ok(x.rating > table.casual[i].rating + 4, E.VENUES[i].id)));

// the free/full gate and the unlock road
check('free players can reach and clear venues 1 and 2, and the gate is the third venue', () => {
  const p = E.newProgress();
  assert.ok(E.venueOpen(p, false, 0)); assert.ok(!E.venueOpen(p, false, 1));
  const r0 = play(0, 'good', 3, p, false); assert.ok(r0.pass); E.applyResult(p, r0);
  assert.ok(E.venueOpen(p, false, 1));
  const r1 = play(1, 'good', 3, p, false); assert.ok(r1.pass, 'rooftop on the free road: ' + r1.rating); E.applyResult(p, r1);
  assert.strictEqual(E.venueOpen(p, false, 2), false); assert.strictEqual(E.venueLockReason(p, false, 2), 'unlock');
  assert.ok(E.venueOpen(p, true, 2), 'the unlock opens the Warehouse straight away');
});
check('rewards earned on the free road are kept and open on unlock', () => {
  const p = E.newProgress(); p.cleared = [0, 1, 2];
  assert.strictEqual(E.canUse(p, false, 'kit', 'neon'), false);
  assert.strictEqual(E.canUse(p, true, 'kit', 'neon'), true);
  assert.strictEqual(E.itemState(p, false, 'kit', 'boombap'), 'unlock', 'Boom Bap is earned on the free road and waits for the unlock');
  assert.strictEqual(E.canUse(p, false, 'effect', 'echo'), true, 'Echo is free');
});
check('no soft lock: every venue a full-game player can open has an openable goal set and loadable kit', () => {
  for (let vi = 0; vi < E.VENUES.length; vi++) {
    const p = before(vi);
    assert.ok(E.venueOpen(p, true, vi));
    // a kit star is always playable: that kit's packs are already on the venue's decks
    for (const gl of E.VENUES[vi].goals) if (gl.type === 'kit') assert.ok(E.VENUES[vi].decks.some(ref => E.packById(ref.slice(5)).kit === gl.kit), E.VENUES[vi].id + ' needs ' + gl.kit);
    for (const ref of E.VENUES[vi].decks) assert.ok(E.packTrack(ref.slice(5)), ref);
  }
});
check('a full run from scratch reaches Headliner with the good bot', () => {
  const p = E.newProgress();
  for (let vi = 0; vi < E.VENUES.length; vi++) { const r = play(vi, 'good', 5 + vi, p, true); assert.ok(r.pass, E.VENUES[vi].id + ' ' + r.rating); E.applyResult(p, r); }
  assert.strictEqual(E.RANKS[E.rankIndex(p)], 'Headliner');
});

console.log(`sim: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
