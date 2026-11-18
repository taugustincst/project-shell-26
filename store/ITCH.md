# itch.io page — Pocket Decks

The free web demo. itch.io hosts the game in its own frame and takes a zip
with `index.html` at its root. In a plain browser the game plays the Beat Lab
in full and the first two gigs (Bedroom Stream and Rooftop Party), then says
the full game unlocks in the Google Play edition, so this page works as a free
demo that points to Play. Nothing on itch is for sale.

## Build the zip

    python3 /mnt/project-files/marketing/tools/itch_pack.py . pocketdecks-itch.zip

It holds `index.html`, the manifest, the icons and `privacy.html`; nothing from
`android/`, `store/`, `sim/`, `tests/` or `tools/`. The game is one offline
file and loads nothing from the network.

## Upload

1. https://itch.io/game/new (Taylor's own account).
2. **Kind of project:** HTML. Upload `pocketdecks-itch.zip` and tick
   **This file will be played in the browser**.
3. **Embed options:** viewport **360 × 640** (portrait); tick **Mobile
   friendly** and **Fullscreen button**. Orientation: *Portrait*.
   SharedArrayBuffer: off (not used).
4. **Pricing:** *No payments* (free web demo).
5. **Visibility:** *Draft* until the page below is filled, then *Public*.

## Page

**Title**

    Pocket Decks

**Short description or tagline**

    A DJ game and beat maker: build beats in a 16-step lab, mix them live on two decks, move the crowd.

**Classification:** Games · **Kind of project:** HTML · **Genre:** Rhythm
(also Simulation)

**Tags**

    Music, Rhythm, DJ, Beat Maker, Sequencer, Mixing, Casual, Touch-Friendly, Singleplayer, Offline

**Made with:** JavaScript, Web Audio (every sound is synthesized live; no samples)

**Inputs:** Touchscreen, Mouse

**Accessibility:** reduce-motion and larger-text settings.

**Description** (itch takes Markdown)

    **Make your own beats. Mix them live. Move the crowd.**

    Pocket Decks is a DJ game and beat maker in one. Build grooves in the Beat
    Lab, put them on two decks, and play gigs where the crowd reacts to every
    blend and drop.

    **The Beat Lab.** A 16-step sequencer with tempo and swing, eight save
    slots and chaining into a full track. Every sound is synthesized in the
    browser as it plays. Share beat turns a beat into a code you can send to a
    friend; Import beat brings it back.

    **The decks.** Play, sync, loop and cue on two decks, a spring-loaded
    filter, a crossfader and echo. Hold the filter to build tension and let go
    on the 1 for a drop; slide across for a clean blend.

    **The gigs.** Clean blends and drops on the 1 lift the crowd; clashing
    beats lose it. Each venue has three stars to earn, and clearing it opens
    new lanes and effects.

    **This web version is the free part of the game:** the full Beat Lab and
    the first two gigs, Bedroom Stream and Rooftop Party. The full game (four
    more venues up to the Main Stage, three more kits, the Lead lane, Stutter
    and Riser) is on Google Play:
    https://play.google.com/store/apps/details?id=com.taugustincst.pocketdecks

    No ads, no accounts. Your beats and progress save in this browser.

**Screenshots:** `store/play/play-01.png` to `play-05.png` (or the raw shots
`store/screenshot-01` to `-06`).

**Cover image:** `store/feature-graphic-1024x500.png` (itch crops to 630 × 500).
