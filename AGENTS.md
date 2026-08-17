# Project task tracking

- Track project work in Beads (`bd`).
- Keep the task hierarchy to one level: root epics with tasks directly beneath them.
- Every task beneath an epic must carry one `epic-<short-slug>` label identifying its parent. Add the label when creating or reparenting the task, and remove the old parent label when reparenting.
- Use these labels for the current epics:
  - `epic-codebase-review` for `spelunka-a0k`
  - `epic-typescript-conversion` for `spelunka-v0j`
  - `epic-performance-evaluation` for `spelunka-b2u`
  - `epic-performance-measures` for `spelunka-b2u.2`
  - `epic-performance-enhancements` for `spelunka-clu`
  - `epic-complete-level-roadmap` for `spelunka-48u`
  - `epic-spelunky-conversion` for `spelunka-r54`
  - `epic-hotfix` for `spelunka-ncf`
- Track every hotfix ticket as a direct child of the `Hotfix` epic (`spelunka-ncf`) and apply the `epic-hotfix` label.

## Database conventions

- Use singular, lowercase `snake_case` names for every physical database table, such as `performance_session` and `performance_sample`.
- Apply this convention to all databases and migrations maintained by this project.
- A `performance_session` is one measured run of the game. Each `performance_sample` is a measurement window belonging to one session.
- Preserve existing records when renaming database objects; use in-place migrations instead of dropping and recreating tables.
