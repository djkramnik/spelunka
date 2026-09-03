# Spelunky hearts and health HUD

Beads task: `spelunka-r54.36`

Each newly created player owns one `Health` trait. It starts at four hearts,
matching a normal Spelunky run, and clamps all damage and healing to the
inclusive range 0-99 used by Classic's level configuration. Invalid negative
or fractional adjustments are rejected instead of silently corrupting the
authoritative value.

Gameplay damage uses `Health.takeDamage`, which rejects overlapping hits while
its elapsed-time protection window is active. Direct `damage` remains the
unprotected health mutation for explicit systems and tests. Snake contact is
the first consumer: it removes one heart and requests one second of protection.
If that removes the final heart, the snake enters the terminal player-death
path; otherwise the player remains alive and controllable. The terminal body
stays in the level and the health display remains visible at zero hearts. See
the dedicated player-death note for launch, settling, and input rules.

The same Mario entity is moved between normal level scenes, so its hearts
persist across a level transition. Creating a replacement player entity, as a
future run restart or the existing benchmark restart does, creates a fresh
four-heart `Health` trait.

## HD sources

The validated local HD texture catalog identifies the relevant artwork as:

- `ANYLEVEL/playerhudPRO.png`: the cell at `(0,128)` contains a clean,
  transparent 32x32 player heart; and
- `ATSTART/hudicons.png`: 64x64 counter cells contain digits 0-3 across cells
  `(4,0)` through `(7,0)` and digits 4-9 across `(0,1)` through `(5,1)`.

The importer verifies both source-entry hashes and copies unchanged heart and
digit pixels into a deterministic ignored `hud.png`. The generated metadata
uses a 0.45 scale for the 32x32 heart and a 0.225 scale for the 64x64 counter
cells, giving both a 14.4x14.4 logical frame. The counter is therefore exactly
10% smaller than its original 16x16 presentation.
This preserves HD source pixels at the final 4x renderer output while exposing
the names `heart` and `digit-0` through `digit-9` to gameplay code.

The dashboard reads `Health.hearts` on every draw. It renders the heart at
logical `(8,4)` and the first counter glyph at `(24,4)`, advancing subsequent
digits by 14.4 logical pixels. The remaining World and Time regions retain their
current positions; the Mario name, score, and coin block has been removed from
the left side to make room for the Spelunky health presentation.
