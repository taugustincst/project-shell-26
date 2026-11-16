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

- **Your sets (recordings library):** every set the player records is kept in the app, in the page's IndexedDB (database `pocketdecks`, store `recordings`: id, name, date, length, type, size, audio blob). Your sets lists them newest first, and each set can be played, renamed, deleted, saved as a file or shared. Caps: 20 sets and 50 MB in total; when a new set would go over, the game says so and still offers Save file and Share for that set. Reset progress does not delete sets. Nothing is uploaded.
- **Sharing beats:** in the Lab, Share beat turns the beat being edited, or the whole Lab (8 slots and the track), into a plain-text code (`PD1.<base64url JSON>.<checksum>`). The player copies it, saves it as a `.txt` file or hands it to the share sheet. Import beat takes a pasted code (surrounding text is fine) or opens a `.txt` file, checks the version and checksum, clamps every value like a saved beat, and either opens the beat in the Lab or replaces / fills the slots. A beat on a kit the player has not opened plays on Basement. Codes carry beats only: never progress, the unlock or anything about the player.

## Playtest switch (removed at packaging)

The design-time playtest switch (`pocketdecks.playtest`) was **removed for the Play build** (Folder, 2026-11-16 packaging, same as shells 21–25): the localStorage bypass, the header "Playtest" badge and the key constant are gone from `index.html`, `owned()` depends only on Play Billing, and the static test now asserts the switch's absence.

## Android wrapper notes

- Audio starts on the first tap (Web Audio needs a user gesture); the wrapper should allow media playback without a gesture or leave it as is.
- Recording uses `MediaRecorder` on the page's own audio. No microphone permission is needed or asked for.
- Saving a recording or a beat file uses a download link; the wrapper needs a download handler, or the Share buttons (Web Share with files or text) where the WebView supports it.
- Your sets needs IndexedDB in the WebView (on by default with DOM storage enabled). If it is missing, recording still works and the game offers Save file and Share for each set.
- Import beat opens a file with `<input type=file>`; the wrapper needs `onShowFileChooser`, or players paste the code instead.
- The page pauses a gig and stops sound when it is hidden.

## Left before a Play listing (owner and Folder)

1. Android wrapper with Play Billing wired to the bridge above, product `full_unlock` created in Play Console.
2. Decide the playtest switch.
3. Store listing: title, descriptions, icon, feature graphic, portrait screenshots (the Lab grid and a live gig with the crowd bar make good shots).
4. Content rating questionnaire (expected Everyone: no violence, gambling or mature themes; user-made music only, nothing shared from inside the app).
5. Data safety: no data collected or shared by the app; no network access; beats, sets and progress stay on the device. Players can export beats and sets themselves through the share sheet or a file.
6. Phone playtest on a real device for audio latency and speaker loudness.

## Play packaging (Folder, 2026-11-16)

Packaged for Google Play mirroring project-shell-05 / shells 23–25: `android/` WebView wrapper (applicationId `com.taugustincst.pocketdecks`, versionName 1.0.0 / versionCode 10000, WebViewAssetLoader offline load, no network permission, PlayBilling bridge per the contract above), `store/` pack (listing.md, icon-512, feature graphic, four real rendered 1080×1920 screenshots: home/title, Beat Lab playing a pattern, the live Bedroom Stream gig, Your sets with a recorded set), `icons/`, `privacy.html`, `site/` store page, `tools/` and the ci/android/release/pages workflows. Upload keystore created and the four `ANDROID_UPLOAD_*` secrets set on the repo; the Release workflow produces the signed bundle once it can run.
