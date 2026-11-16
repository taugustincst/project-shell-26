# Pocket Decks

Make your own beats, mix them live on two decks, and play your way from a bedroom stream to the Main Stage.

- **Lab:** a 16-step sequencer with eight lanes (kick, snare, clap, hi-hat, open hat, perc, bass, lead), four synthesized kits, tempo and swing, eight save slots, chaining beats into a full track, and Share beat / Import beat to move a beat or the whole Lab to another phone as a code or file. Every sound is made on the phone with Web Audio: no samples.
- **Decks:** two decks with play, sync, loop, stutter, cue (tap to jump back, hold to set), a spring-loaded filter, a crossfader, echo and a riser. Record your set; every set is kept in Your sets on the phone, where you can play, rename, delete, save or share it.
- **Gigs:** six venues, each with a crowd to win and three stars. Clean blends and drops landed on the 1 lift the crowd; a tired track or two clashing beats lose it. Clearing venues opens kits, lanes and effects and climbs the ranks from Bedroom DJ to Headliner.

## Play

Open `index.html` in a browser. Everything is in that one file and it runs fully offline. Tap "Drop the beat" to start. Space plays and stops the Lab beat on a keyboard; Escape pauses a gig.

## Test

```
npm test
```

This runs the engine rules tests, the static offline and structure checks, and the play-through simulation (bots of different skill play every venue and assert the design standard and the free/full road). Node 22, no dependencies. `node sim/sim.js -v` prints the balance table.

Owner: Tj (Taylor Augustin) / AugustInnovations LLC. Made by AugustInnovations.
