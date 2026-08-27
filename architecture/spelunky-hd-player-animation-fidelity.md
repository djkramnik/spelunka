# Spelunky HD player animation fidelity

Beads task: `spelunka-erb.6`

This pass responds to play-test feedback that the first player prototype felt
cheaper than Spelunky HD because it sampled only a few frames from each source
record. The importer now retains every frame in each confidently identified
player record exercised by the default tutorial.

## Source records and runtime timing

The source metadata comes from the first section of
`Data/Animations/allanimations.wad`. Its frame lengths are measured in HD
engine ticks. Timed Spelunka states convert those values at 60 ticks per second.

| State | HD animation ID | Source frames | Source length | Spelunka behavior |
| --- | ---: | ---: | ---: | --- |
| idle | 0 | 0 | 1 tick | Static |
| walk/run | 1 | 1-8 | 4 ticks | All eight frames; 3 logical pixels per frame |
| rise | 2 | 108-111 | 3 ticks | 0.05 seconds per frame, non-looping |
| fall | 3 | 112-115 | 4 ticks | 1/15 second per frame, non-looping |
| throw | 8 | 54-58 | 4 ticks | 1/15 second per frame, non-looping |
| reaction | 9 | 9 | 1 tick | Shared stunned/dead fallback |
| skid | 18 | 36-43 | 4 ticks | 1/15 second per frame while reversing |

Movement animation remains distance-based because Spelunka supports gradual
acceleration and a separate turbo speed. Eight frames at 3 logical pixels each
preserve the previous 24-pixel gait cycle while replacing the sparse three- or
four-frame sampling. Turbo naturally advances the same source gait faster.

Rise, fall, skid, and throw use a visual-state clock. Changing visual state
resets its clock; non-looping records hold their terminal frame. The clock does
not gate movement, jumping, pickup, throwing, damage, or collision behavior.

## Intentional fallbacks

The numeric HD metadata does not provide semantic labels for every record.
Rather than guess, carrying continues to reuse the matching base poses:

- carry idle uses source frame 0;
- carry movement uses the complete source movement frames 1-8;
- carry rise and fall use terminal source frames 111 and 115; and
- stunned and dead both use the only confidently mapped reaction frame, 9.

Focused tests cover the complete 51-name frame catalogue, dense distance-based
movement, state-clock advancement, terminal-frame clamping, facing and pivot
stability, exact source-pixel preservation, deterministic repacking, and the
unchanged 14x16 player collider. Final visual quality remains a user play-review
decision; no local visual check was performed by Codex.
