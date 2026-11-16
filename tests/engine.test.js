'use strict';
// Engine rules tests. Node built-ins only: node tests/engine.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\* ENGINE:BEGIN \*\/([\s\S]*?)\/\* ENGINE:END \*\//);
assert(m, 'ENGINE block not found');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[1] + '\nthis.Engine = Engine;', ctx);
const E = ctx.Engine;
const J = (o) => JSON.parse(JSON.stringify(o));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.error('FAIL ' + name + '\n  ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n  ') : e)); }
}
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (msg || '') + ' ' + a + ' vs ' + b);
function tick(g, secs, dt) { dt = dt || 1 / 60; const ev = []; for (let t = 0; t < secs - 1e-9 && !g.done; t += dt) ev.push(...E.tickGig(g, dt)); return ev; }
function runTo(g, i, pred, max) { const ev = []; for (let t = 0; t < (max || 10) && !pred(); t += 1 / 120) ev.push(...E.tickGig(g, 1 / 120)); return ev; }
function gigWith(vi, a, b) {
  const g = E.createGig(vi, 1);
  E.loadDeck(g.decks[0], E.packTrack(a || 'first-light'));
  E.loadDeck(g.decks[1], E.packTrack(b || 'dust-shuffle'));
  E.setPlaying(g.decks[0], true, null);
  return g;
}

// ---------- content ----------
test('six venues, ranks for each clear, two free venues', () => {
  assert.strictEqual(E.VENUES.length, 6);
  assert.strictEqual(E.RANKS.length, E.VENUES.length + 1);
  assert.strictEqual(E.FREE_VENUES, 2);
  for (const v of E.VENUES) { assert.strictEqual(v.goals.length, 3); assert.strictEqual(v.decks.length, 2); }
});
test('every pack is a crowd-ready groove and uses a known kit', () => {
  for (const p of E.PACKS) {
    assert.ok(E.kitById(p.kit), p.id);
    assert.ok(E.rateGroove(p).ready, p.id + ' groove ' + E.rateGroove(p).score);
  }
});
test('every kit, lane and effect names the venue that opens it', () => {
  for (const k of E.KITS) assert.ok(k.free || (k.venue >= 0 && k.venue < E.VENUES.length), k.id);
  for (const r of E.REWARDS) for (const it of r.items) if (it.kind !== 'title') assert.strictEqual(E.itemState(E.newProgress(), true, it.kind, it.id), 'earn', it.id);
});

// ---------- patterns ----------
test('toggleStep: drums on/off, melodic lanes take a note and toggle off on the same note', () => {
  const p = E.emptyPattern('basement', 96);
  assert.strictEqual(E.toggleStep(p, 'kick', 0), 1);
  assert.strictEqual(E.toggleStep(p, 'kick', 0), 0);
  assert.strictEqual(E.toggleStep(p, 'bass', 3, 5), 5);
  assert.strictEqual(E.toggleStep(p, 'bass', 3, 2), 2, 'another note replaces');
  assert.strictEqual(E.toggleStep(p, 'bass', 3, 2), 0, 'same note clears');
  assert.strictEqual(E.toggleStep(p, 'bass', 4, 99), E.NOTES, 'clamped');
  assert.strictEqual(E.toggleStep(p, 'nope', 0), 0);
  assert.strictEqual(E.toggleStep(p, 'kick', 16), 0);
});
test('normalizePattern repairs garbage from a save', () => {
  const p = E.normalizePattern({ kit: 'bogus', bpm: 9999, swing: -3, name: 42, lanes: { kick: [1, 'x', 0, 5], bass: [9, -1], lead: 'nope' } });
  assert.ok(E.kitById(p.kit));
  assert.ok(p.bpm >= 70 && p.bpm <= 160);
  assert.ok(p.swing >= 0 && p.swing <= 0.6);
  assert.strictEqual(typeof p.name, 'string');
  for (const L of E.LANES) assert.strictEqual(p.lanes[L.id].length, E.STEPS);
  assert.strictEqual(p.lanes.kick[3], 1);
  assert.strictEqual(p.lanes.bass[0], E.NOTES);
  const q = E.normalizePattern(null); assert.strictEqual(E.hitCount(q), 0);
});
test('rateGroove: empty is low, a kick alone is not ready, the starter is ready, and tips point the way', () => {
  const e = E.emptyPattern('basement', 96);
  assert.ok(E.rateGroove(e).score < 0.2);
  assert.ok(E.rateGroove(e).tip.length > 0);
  for (const s of [0, 4, 8, 12]) E.toggleStep(e, 'kick', s);
  assert.strictEqual(E.rateGroove(e).ready, false);
  assert.ok(E.rateGroove(E.packById('starter')).ready);
});
test('clonePattern is deep', () => {
  const a = E.packById('starter'), b = E.clonePattern(a);
  E.toggleStep(b, 'kick', 1);
  assert.notStrictEqual(a.lanes.kick[1], b.lanes.kick[1]);
});
test('tracks chain patterns bar after bar', () => {
  const a = E.packById('first-light'), b = E.packById('dust-shuffle');
  const t = E.makeTrack([a, b], 'Mine');
  assert.strictEqual(E.trackLength(t), 32);
  assert.strictEqual(t.bpm, a.bpm);
  const hitsB = E.trackHits(t, 16 + 4).map(h => h.lane).sort();
  const want = E.LANES.filter(L => b.lanes[L.id][4]).map(L => L.id).sort();
  assert.deepStrictEqual(J(hitsB), J(want));
  assert.ok(E.trackHasKick(t, 0));
});

// ---------- timing ----------
test('16th steps: 120 bpm is 8 steps a second; swing delays odd steps only', () => {
  near(E.stepsPerSecond(120), 8);
  assert.strictEqual(E.swingDelay(0, 120, 0.5), 0);
  near(E.swingDelay(1, 120, 0.5), 0.5 * 0.5 / 8);
});

// ---------- decks ----------
test('a deck advances only while playing', () => {
  const d = E.createDeck(); E.loadDeck(d, E.packTrack('first-light'));
  E.advanceDeck(d, 1); assert.strictEqual(d.clock, 0);
  E.setPlaying(d, true, null); E.advanceDeck(d, 1); near(d.clock, E.stepsPerSecond(d.bpm));
});
test('sync matches tempo and lines up the bar with the other deck', () => {
  const a = E.createDeck(), b = E.createDeck();
  E.loadDeck(a, E.packTrack('first-light')); E.loadDeck(b, E.packTrack('golden-hour'));
  E.setPlaying(a, true, null); E.advanceDeck(a, 1.37);
  b.clock = 3.71; E.setPlaying(b, true, null);
  assert.ok(!E.inSync(a, b));
  assert.ok(E.syncDeck(b, a));
  assert.strictEqual(b.bpm, a.bpm);
  assert.ok(E.inSync(a, b));
  near(E.deckBarPos(a), E.deckBarPos(b), 1e-6, 'same place in the bar');
  for (let i = 0; i < 300; i++) { E.advanceDeck(a, 1 / 60); E.advanceDeck(b, 1 / 60); }
  assert.ok(E.inSync(a, b), 'stays in sync');
});
test('starting a deck while the other plays drops it in on the same beat of the bar', () => {
  const a = E.createDeck(), b = E.createDeck();
  E.loadDeck(a, E.packTrack('first-light')); E.loadDeck(b, E.packTrack('dust-shuffle'));
  E.setPlaying(a, true, null); E.advanceDeck(a, 2.2);
  b.bpm = a.bpm; E.setPlaying(b, true, a);
  near(E.deckBarPos(a), E.deckBarPos(b), 1e-6);
});
test('a tempo nudge drifts the decks apart; sync brings them back', () => {
  const a = E.createDeck(), b = E.createDeck();
  E.loadDeck(a, E.packTrack('first-light')); E.loadDeck(b, E.packTrack('first-light'));
  E.setPlaying(a, true, null); E.setPlaying(b, true, a); E.syncDeck(b, a);
  E.nudgeBpm(b, 3);
  for (let i = 0; i < 120; i++) { E.advanceDeck(a, 1 / 60); E.advanceDeck(b, 1 / 60); }
  assert.ok(!E.inSync(a, b));
  E.syncDeck(b, a); assert.ok(E.inSync(a, b));
});
test('loop repeats a beat, and ending it carries on from where the loop is', () => {
  const d = E.createDeck(); E.loadDeck(d, E.packTrack('first-light')); E.setPlaying(d, true, null);
  d.clock = 5.3; E.setLoop(d, 4);
  const seen = new Set(); for (let c = 5; c < 30; c++) seen.add(E.deckStepAt(d, c));
  assert.deepStrictEqual([...seen].sort((x, y) => x - y), [4, 5, 6, 7]);
  d.clock = 9.5; const at = E.deckPos(d);
  E.setLoop(d, 0); assert.strictEqual(E.deckPos(d), at);
  assert.strictEqual(E.deckStepAt(d, 10), at + 1);
});
test('stutter repeats an eighth while held and lets go without losing the beat', () => {
  const d = E.createDeck(); E.loadDeck(d, E.packTrack('first-light')); E.setPlaying(d, true, null);
  d.clock = 6.2; E.setStutter(d, true);
  const seen = new Set(); for (let c = 6; c < 20; c++) seen.add(E.deckStepAt(d, c));
  assert.deepStrictEqual([...seen].sort((x, y) => x - y), [6, 7]);
  E.setStutter(d, false); assert.strictEqual(E.deckStepAt(d, 20), 20 % E.trackLength(d.track));
});
test('cue: set on the beat, jump back on the next beat', () => {
  const d = E.createDeck(); E.loadDeck(d, E.packTrack('first-light')); E.setPlaying(d, true, null);
  d.clock = 9.4; E.setCue(d); assert.strictEqual(d.cue, 8);
  d.clock = 13.2; E.cueJump(d);
  assert.strictEqual(E.deckStepAt(d, 16), 8);
});

// ---------- gigs ----------
test('a gig ends after its set length with one end event', () => {
  const g = gigWith(0);
  const ev = tick(g, E.VENUES[0].secs + 1, 1 / 30);
  assert.ok(g.done);
  assert.strictEqual(ev.filter(e => e.type === 'end').length, 1);
});
test('a drop lands when the tension is let go on the 1, and lifts the crowd', () => {
  const g = gigWith(0); tick(g, 6);
  E.setFilter(g, 0, 0.8);
  runTo(g, 0, () => g.build[0] >= E.BUILD_BEATS && E.deckBarPos(g.decks[0]) > 15.6, 10);
  const before = g.energy;
  E.setFilter(g, 0, 0);
  const ev = tick(g, 1 / 60);
  assert.ok(ev.some(e => e.type === 'drop'), J(ev));
  assert.strictEqual(g.drops, 1);
  assert.ok(g.energy > before);
});
test('letting go mid-bar is an early drop and earns nothing', () => {
  const g = gigWith(0); tick(g, 6);
  E.setFilter(g, 0, -0.8);
  runTo(g, 0, () => g.build[0] >= E.BUILD_BEATS && Math.abs(E.deckBarPos(g.decks[0]) - 8) < 0.3, 10);
  E.setFilter(g, 0, 0);
  const ev = tick(g, 1 / 60);
  assert.ok(ev.some(e => e.type === 'miss-drop'));
  assert.strictEqual(g.drops, 0);
});
test('a quick twist is not a drop: the tension has to build', () => {
  const g = gigWith(0); tick(g, 6);
  runTo(g, 0, () => E.deckBarPos(g.decks[0]) > 15.2, 10);
  E.setFilter(g, 0, 0.9); tick(g, 0.05); E.setFilter(g, 0, 0); tick(g, 0.1);
  assert.strictEqual(g.drops, 0);
});
test('a synced blend counts; the crossfader must go all the way across', () => {
  const g = gigWith(0); tick(g, 4);
  E.syncDeck(g.decks[1], g.decks[0]); E.setPlaying(g.decks[1], true, g.decks[0]);
  let ev = [];
  for (let k = 0; k <= 60; k++) { E.setCrossfader(g, k / 60 * 0.8); ev.push(...tick(g, 1 / 30)); }
  assert.strictEqual(g.blends, 0, 'not across yet');
  for (let k = 0; k <= 20; k++) { E.setCrossfader(g, 0.8 + k / 20 * 0.2); ev.push(...tick(g, 1 / 30)); }
  assert.strictEqual(g.blends, 1);
  assert.ok(ev.some(e => e.type === 'blend'));
});
test('a slam is a rough blend', () => {
  const g = gigWith(0); tick(g, 4);
  E.syncDeck(g.decks[1], g.decks[0]); E.setPlaying(g.decks[1], true, g.decks[0]);
  E.setCrossfader(g, 0.5); let ev = tick(g, 0.2); E.setCrossfader(g, 1); ev = ev.concat(tick(g, 1 / 30));
  assert.strictEqual(g.blends, 0);
  assert.ok(ev.some(e => e.type === 'rough-blend'));
});
test('two unsynced beats both audible clash and the crowd drops fast', () => {
  const g = gigWith(0, 'first-light', 'golden-hour'); tick(g, 10);
  const before = g.energy;
  E.setPlaying(g.decks[1], true, g.decks[0]); E.setCrossfader(g, 0.5);
  const ev = tick(g, 3);
  assert.ok(ev.some(e => e.type === 'clash'));
  assert.ok(g.clashes >= 1);
  assert.ok(g.energy < before, g.energy + ' < ' + before);
});
test('an echo throw counts only on the 1', () => {
  const g = gigWith(3, 'boardwalk', 'neon-lights'); tick(g, 3);
  runTo(g, 0, () => Math.abs(E.deckBarPos(g.decks[0]) - 7) < 0.2, 10);
  E.setEcho(g, true); E.setEcho(g, false); assert.strictEqual(g.echoThrows, 0);
  runTo(g, 0, () => E.deckBarPos(g.decks[0]) < 0.5, 10);
  const ev = E.setEcho(g, true);
  assert.strictEqual(g.echoThrows, 1); assert.ok(ev.some(e => e.type === 'echo'));
});
test('a track heard too long tires the crowd; a fresh one wins it back', () => {
  const g = gigWith(1, 'dust-shuffle', 'golden-hour');
  tick(g, 20); const fresh = g.energy;
  tick(g, 70, 1 / 30); assert.ok(g.energy < fresh - 5, g.energy + ' vs ' + fresh);
});
test('silence empties the floor', () => {
  const g = gigWith(0); tick(g, 15); const e = g.energy;
  g.decks[0].playing = false; tick(g, 3);
  assert.ok(g.energy < e - 20);
});
test('the venue likes its tempo range', () => {
  const v = E.VENUES[2];
  assert.ok(E.venueTaste(v, 124) > E.venueTaste(v, 90));
});
test('gigResult: rating is the average crowd, pass against the venue bar, stars only from met goals', () => {
  const g = gigWith(0); tick(g, E.VENUES[0].secs + 1, 1 / 30);
  const r = E.gigResult(g, E.newProgress(), false);
  assert.strictEqual(r.rating, E.crowdRating(g));
  assert.strictEqual(r.pass, r.rating >= E.VENUES[0].pass);
  assert.ok(r.stars >= 0 && r.stars <= 3);
});

test('each clash costs the rating, up to a cap', () => {
  const g = gigWith(0); tick(g, 20);
  const clean = E.crowdRating(g);
  g.clashes = 2; assert.strictEqual(E.crowdRating(g), Math.max(0, clean - 2 * E.CLASH_COST));
  g.clashes = 50; assert.ok(E.crowdRating(g) >= Math.max(0, clean - 12));
});
test('no stars for a set where the player never acted', () => {
  const g = gigWith(2, 'neon-lights', 'night-bus'); tick(g, E.VENUES[2].secs + 1, 1 / 30);
  assert.ok(!E.playerActed(g));
  assert.deepStrictEqual(J(E.goalsMet(g)), [false, false, false]);
  assert.strictEqual(E.gigResult(g, E.newProgress(), true).stars, 0);
  g.blends = 1; assert.ok(E.goalsMet(g).some(Boolean), 'the clean set and kit time count once a blend happened');
});

// ---------- progress and the free/full road ----------
test('only Bedroom Stream is open at the start; each clear opens the next', () => {
  const p = E.newProgress();
  assert.ok(E.venueOpen(p, false, 0));
  for (let i = 1; i < 6; i++) assert.ok(!E.venueOpen(p, true, i));
  p.cleared.push(0); assert.ok(E.venueOpen(p, false, 1));
});
test('the gate: Warehouse and on need the unlock, and the reason says so', () => {
  const p = E.newProgress(); p.cleared = [0, 1];
  assert.strictEqual(E.venueOpen(p, false, 2), false);
  assert.strictEqual(E.venueLockReason(p, false, 2), 'unlock');
  assert.ok(E.venueOpen(p, true, 2));
  assert.strictEqual(E.venueLockReason(E.newProgress(), false, 3), 'clear');
});
test('applyResult: a pass clears the venue and keeps the best stars; a fail keeps nothing but the best rating', () => {
  const p = E.newProgress();
  E.applyResult(p, { venue: 0, pass: false, rating: 30, met: [true, true, false], stars: 2, drops: 1, blends: 1 });
  assert.strictEqual(E.venueCleared(p, 0), false); assert.strictEqual(p.stars[0], 0); assert.strictEqual(p.bestEnergy[0], 30);
  E.applyResult(p, { venue: 0, pass: true, rating: 50, met: [true, false, false], stars: 1, drops: 1, blends: 0 });
  E.applyResult(p, { venue: 0, pass: true, rating: 45, met: [false, true, false], stars: 1, drops: 0, blends: 1 });
  assert.ok(E.venueCleared(p, 0)); assert.strictEqual(p.stars[0], 2, 'stars add up across runs'); assert.strictEqual(p.bestEnergy[0], 50);
  assert.strictEqual(E.rankIndex(p), 1);
});
test('normalizeProgress repairs a damaged save', () => {
  const p = E.normalizeProgress({ cleared: [0, 0, 9, 'x', 1], stars: [5, -1], goalsMet: 'bad' });
  assert.deepStrictEqual(J(p.cleared), [0, 1]);
  assert.strictEqual(p.stars.length, 6); assert.ok(p.stars.every(s => s >= 0 && s <= 3));
  assert.strictEqual(p.goalsMet.length, 6);
  assert.deepStrictEqual(J(E.normalizeProgress(null)), J(E.newProgress()));
});
test('nextUnlock walks the reward road and flags the paid part', () => {
  const p = E.newProgress();
  assert.strictEqual(E.nextUnlock(p, false).venue, 0);
  p.cleared = [0, 1];
  const n = E.nextUnlock(p, false); assert.strictEqual(n.venue, 2); assert.ok(n.needsUnlock);
  assert.strictEqual(E.nextUnlock(p, true).needsUnlock, false);
  p.cleared = [0, 1, 2, 3, 4, 5]; assert.strictEqual(E.nextUnlock(p, true), null);
});
test('library: your own beats always, packs locked by kit', () => {
  const lib = E.library(E.newProgress(), false, [{ ref: 'lab', name: 'Lab' }]);
  assert.strictEqual(lib[0].ref, 'lab');
  assert.ok(lib.some(x => x.ref === 'pack:first-light' && x.state === 'open'));
  assert.ok(lib.some(x => x.ref === 'pack:cypher' && x.state !== 'open'));
  assert.ok(!lib.some(x => x.ref === 'pack:starter'));
});
test('own beats count toward the own-beat star', () => {
  const g = E.createGig(1, 1);
  const p = E.clonePattern(E.packById('starter')); E.toggleStep(p, 'kick', 10); p.own = true;
  E.loadDeck(g.decks[0], E.makeTrack([p], 'Mine')); E.loadDeck(g.decks[1], E.packTrack('golden-hour'));
  E.setPlaying(g.decks[0], true, null); tick(g, 21);
  assert.ok(g.ownSecs >= 20); assert.ok(E.goalsMet(g)[0]);
});
test('a gig in progress survives a JSON save and resumes exactly', () => {
  const g = gigWith(1); tick(g, 12);
  const back = E.restoreGig(J(g));
  assert.ok(back);
  assert.strictEqual(back.t, g.t); assert.strictEqual(back.energy, g.energy);
  assert.strictEqual(back.decks[0].track.name, g.decks[0].track.name);
  tick(g, 5); tick(back, 5);
  near(back.energy, g.energy, 1e-6); near(back.decks[0].clock, g.decks[0].clock, 1e-6);
  assert.strictEqual(E.restoreGig({ venue: 99 }), null);
  assert.strictEqual(E.restoreGig(null), null);
  const done = gigWith(0); tick(done, 80, 1 / 30); assert.strictEqual(E.restoreGig(J(done)), null, 'a finished gig is not resumed');
});

console.log(`engine tests: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
