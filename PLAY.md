# Pocket Decks: Play edition notes

- **Package:** `com.taugustincst.pocketdecks`
- **Monetization:** free to install, one paid unlock. No ads, no energy or timers, no loot boxes, no consumables, no second product.

## Free and paid

| | Free | Full unlock |
|---|---|---|
| Beat Lab | everything: 16 steps, 8 slots, chaining, tempo and swing, naming | same |
| Kits | Basement | + Boom Bap, Neon House, Afterhours (each opens as you clear its venue) |
| Lanes | Kick, Snare, Clap, Hi-hat, Bass, then Open hat and Perc after the first gig | + Lead |
| Effects | Filter, Echo | + Stutter, Riser |
| Venues | Bedroom Stream, Rooftop Party | + Warehouse, Pier Festival, Midnight Club, Main Stage |
| Decks | both decks, crossfader, sync, cue, loops, recording a set | same |
| Rank | Bedroom DJ to Rooftop Resident | up to Headliner |

The gate lands right after the Rooftop Party, the free tier's showcase gig (your own beat on the decks, two blends, a crowd held high). Its rewards (Boom Bap and Stutter) are earned there and shown as "ready in the full game". Free venues stay replayable and the Lab stays fully open.

- **In-app product:** `full_unlock`, non-consumable. **Price: Tj's call at listing.** Claude's suggestion, going by Folder's value-audit ladder: $2.99 (six gigs of two to three minutes each, plus the open-ended Lab).

## Billing bridge (same contract as the owner's other games)

In the Play app the page receives `window.AndroidBilling` with `start(productId)`, `buy(productId)`, `restore(productId)`. Play answers by calling `window.__billingEvent(json)` with `{type, product, ...}`, where `type` is one of `ready`, `unavailable`, `price` (`price` string), `owned` (`owned` bool, `pending` bool), `purchased`, `pending`, `cancelled`, `error` (`message`). The game calls `start` on load. Ownership is cached in localStorage so the game opens unlocked offline; Play's answer always wins. In a plain browser the unlock sheet shows "The full game unlocks in the Google Play edition." and no Buy or Restore button.

## Saved data (localStorage, this device only)

- `pocketdecks.save`: `{ v: 1, progress, lab, run }`. `progress` holds cleared venues, stars, best ratings. `lab` holds the beat being edited, the eight slots and the track chain. `run` is the gig in progress (saved every couple of seconds, on pause and on page hide) so a reload offers "Resume your gig". The unlock is never in this object.
- `pocketdecks.settings`: sound, reduce motion, larger text.
- `pocketdecks.unlock`: `'1'` when Play has confirmed the purchase (cache only).
- `pocketdecks.playtest`: see below.

Recordings are never stored by the game; the player saves or shares each one.

## Playtest switch (decide before packaging)

`localStorage.setItem('pocketdecks.playtest', 'full')` treats the unlock as owned and shows a small "Playtest" badge in the header. It is the only bypass (no URL flags, nothing in saves). **Owner/Folder decision:** remove it, or keep it, before the Play build.

## Android wrapper notes

- Audio starts on the first tap (Web Audio needs a user gesture); the wrapper should allow media playback without a gesture or leave it as is.
- Recording uses `MediaRecorder` on the page's own audio. No microphone permission is needed or asked for.
- Saving a recording uses a download link; the wrapper needs a download handler, or the Share button (Web Share with files) where the WebView supports it.
- The page pauses a gig and stops sound when it is hidden.

## Left before a Play listing (owner and Folder)

1. Android wrapper with Play Billing wired to the bridge above, product `full_unlock` created in Play Console.
2. Decide the playtest switch.
3. Store listing: title, descriptions, icon, feature graphic, portrait screenshots (the Lab grid and a live gig with the crowd bar make good shots).
4. Content rating questionnaire (expected Everyone: no violence, gambling or mature themes; user-made music only, nothing shared from inside the app).
5. Data safety: no data collected or shared; no network access; beats and progress stay on the device.
6. Phone playtest on a real device for audio latency and speaker loudness.
