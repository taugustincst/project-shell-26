# GAME BRIEF: Pocket Decks (project-shell-26)

Asked for by Tj on 2026-11-16 ("a music mixer phone DJ app where you can create your own beats"), written up by Folder in the suds-handoff log the same day, and confirmed by Tj to Claude ("Yes, build it"). Builder: Claude. Folder scores it blind against the 8.5 bar like shells 21 to 25. Nothing is packaged or submitted from this repo.

- **Title:** Pocket Decks
- **Package:** com.taugustincst.pocketdecks
- **Genre:** Music toy and rhythm game: beat maker plus two-deck DJ career
- **One line:** Make your own beats, mix them live on two decks, and play your way from a bedroom stream to the Main Stage.

## The brief (from Folder's write-up)

1. **Beat Lab:** a 16-step sequencer with drum lanes (kick, snare, clap, hats, percussion) and bass and melodic synth lanes, all synthesized with Web Audio. No samples. Tempo and swing, kit switching, pattern saves, chaining patterns into a full track.
2. **Decks:** two decks loaded with the player's own beats and built-in groove packs. Crossfader, tempo sync, cue points, beat loops, filter sweep, echo, stutter. Recording a set is a strong plus.
3. **Game layer (Tj's design standard):** a groove playing inside the first minute, one tap to an instant beat; gigs and venues that unlock kits, effects and lanes; sessions that end one step short of the next unlock; a crowd meter that reacts to transitions and drops.
4. **House rules:** one offline HTML file, Web Audio only, no network, no ads, no energy, loot boxes or consumables. One `full_unlock` through the standard billing bridge. Free tier generous: Beat Lab, the first kit and at least the first venue. Price is Tj's call at listing time. The unlock is never stored in the save.
5. **Deliverables:** repo and PR with this brief, PLAY.md, engine and static tests, and a sim that exercises the sequencer and timing.

## How the build meets it

- **First minute:** the home screen is one big "Drop the beat" pad. One tap and the Starter Groove plays in the Lab, with a note that every tap changes it as it plays.
- **Long-term goal on screen from the start:** the header shows the rank ladder (Bedroom DJ to Headliner) and the venue road, with the Main Stage crown at the end.
- **Layered goals:** each gig has a crowd bar to pass and three stars (drops, blends, energy, your own beats, a kit, echo throws, no clashes). Clearing a venue raises your rank and opens its rewards: Echo and two lanes, then Boom Bap and Stutter, then Neon House and the Lead lane, then Afterhours, then the Riser, then the Headliner title.
- **One step short:** results always name the closest missed star and by how much, and the header always says what the next clear opens.
- **The crowd:** a single beat alone holds the crowd about a third of the way up and tires as the crowd hears it. Clean blends, drops landed on the 1 and echo throws lift it. Two beats out of time clash and empty the floor.
- **Teaching:** the first gig coaches one move at a time: Sync and Play the second deck, slide across, hold the filter, let go on the 1.
- **Recording:** Rec captures the master output with MediaRecorder; the set can be saved as a file or shared through the phone's share sheet.
