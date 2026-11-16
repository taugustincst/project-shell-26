# HANDOFF — project-shell-26

## Status: Pocket Decks v1 built, in review (PR from `claude/pocket-decks`)

This repository was a shell created 2026-11-10 by Folder (Muse) at Tj's direction. On 2026-11-16 it became **Pocket Decks**, a phone DJ app where you make your own beats (see GAME-BRIEF.md and PLAY.md).

## What this shell is for

- This file is the project's handoff: the living record that any Claude session (or Folder) picks up to learn where the project stands.

## How work here is coordinated

- **Tj decides.** Scope, names, spending, submissions, and anything irreversible are his calls. Everything else, the working agent owns end to end.
- **Entries are dated and appended** under the log below, newest last: what changed, what was decided and by whom, what is blocked, and the next step.
- **Verify before asserting.** Check the live state (repo contents, URLs, consoles) before claiming something is done, broken, or blocked.
- **No prices on marketing websites** (standing rule for Tj's public sites); prices live only in store/procurement documents.
- **Passwords are always user-set** through secure forms — never set, collected, or stored in this repo.
- When a decision is Tj's, mark the entry **FOR TJ** and stop there.

## Log

- **2026-11-10** — Shell created (README.md, HANDOFF.md, placeholder index.html, .github/workflows/pages.yml) by the shell-bench restock watch. Awaiting project assignment from Tj.
- **2026-11-16** — Project assigned: Tj asked for "a music mixer phone DJ app where you can create your own beats" (Folder's write-up in the suds-handoff log) and confirmed to Claude "Yes, build it". Claude took this shell as the next free one after 25. Built Pocket Decks v1 on branch `claude/pocket-decks`: one offline `index.html` (Beat Lab, two decks, six venues, recording), GAME-BRIEF.md, PLAY.md, engine tests, static checks and a play-through sim. `npm test` passes locally (GitHub Actions minutes are used up, so no CI run and no Pages deploy until the budget resets). Free = Lab, Basement kit, Bedroom Stream and Rooftop Party; `full_unlock` opens the rest. Nothing sent to Google Play.
  - **FOR TJ:** merge the PR (your approval is the review); set the `full_unlock` price at listing (Claude suggests $2.99, PLAY.md); decide the playtest switch with Folder.
  - **Next:** Folder's blind score against the 8.5 bar; lift anything that scores short before it ships.
