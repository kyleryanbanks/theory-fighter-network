# Runtime Workflows & Policies

Detailed workflows for move inheritance, difficulty computation, file sync, and community convergence.

## Promote character move to inherited workflow

When a user created a move at the character level and later realizes it is actually a universal game move, they must explicitly link it via a "promote to inherited" flow. This cannot be automated because the app cannot safely distinguish intentional overrides from values entered before the game-level move existed.

**Flow:**
1. User selects a character move and chooses "Link to universal move."
2. App presents a side-by-side field comparison: character move values vs. the selected game-level move values.
3. For each differing field, user chooses:
   - **Accept global** — clears the local value; field resolves from game-level move going forward.
   - **Keep as override** — adds the field to `fieldOverrides`; character retains its local value.
4. On confirm: `inheritedFromMoveId` is set, `fieldOverrides` is populated with any kept exceptions, and accepted fields are cleared from the character move.
5. UI marks any kept overrides with a visible indicator so future users know this character breaks the universal rule.

---

## Promote stage zone to inherited workflow

Stages use the same inheritance behavior as moves: game-level universal stage zones define defaults, and stage-level zones can override specific fields.

**Flow:**
1. User selects a stage zone and chooses "Link to universal stage zone."
2. App presents a side-by-side field comparison: local stage zone values vs. selected game-level zone values.
3. For each differing field, user chooses:
   - **Accept global** — clears the local value so it resolves from the universal zone.
   - **Keep as override** — keeps the local value and records that field in `fieldOverrides`.
4. On confirm: `inheritedFromZoneId` is set, `fieldOverrides` is updated, and accepted fields are cleared.
5. UI marks overridden fields so users can quickly identify stage-local behavior.

---

## Community submission (publish) workflow

Users can selectively publish entities (games, characters, moves, combos, teams, stages, matchups) to the community guide. Publishing is granular: users can publish a character without publishing all its moves, or publish specific combos without pushing the rest of the guide.

**Publish flow:**

1. User clicks "Publish to community" from their private guide.
2. App scans all entities in the guide and displays a tree view:
   - Games (with count of publishable children)
   - Characters (with count of publishable moves/combos)
   - Moves (grouped by character or game-universal)
   - Combos (grouped by scope: universal, character, team)
   - Teams
   - Stages
   - Matchups
3. Tree is pre-populated based on **smart preselection**:
   - Only entities that have **never been published** or have been **modified since last publish** (`updatedAt > lastPublishedAt`) are pre-checked.
   - Entities already pushed with no local changes are left unchecked to avoid unnecessary writes.
   - Each pre-checked entity includes a clear "new" or "modified" indicator.
4. User can add/remove entities from the selection before submitting this push.
5. On submit:
   - Only selected entities with new or modified local data are written to community collections.
   - First-time pushes create the community record and initialize convergence linking.
   - Future pushes reuse the same `communityId` and update the existing community submission rather than creating a second published copy.
   - `lastPublishedAt` is set to current time on each entity that was actually pushed.
   - UI shows a success summary: "Published X games, Y characters, Z moves."

**Timestamp logic:**
- `updatedAt`: Updated on any local entity modification.
- `lastPublishedAt`: Set/updated only when entity is explicitly published.
- **Out-of-date detection**: If `updatedAt > lastPublishedAt` and entity has a `communityId`, show "Local changes not yet published" in the UI.
- **Write minimization**: If `updatedAt <= lastPublishedAt`, skip that entity during publish so unchanged data is not sent again.

---

### Identity link + merge notes


- Programmatic exploration is powered by transition edges, sequence patterns, range profiles, and coverage metrics.
- Move identity is determined by trigger plus preconditions, not by the user-defined move name.
- When a game uses universal context rules such as close/far proximity, those distinctions must be represented through game-defined states consumed by move preconditions.
- UI should explain that publishing a move compares trigger + preconditions to determine whether it aligns with an existing community move record; the move name is treated as variant display text only.
- Combo arrays are handled atomically for identity/merge; same ordered move sequence = same base combo identity.
- Timing-only differences for same move sequence are stored as separate combo variants rather than partial array edits.

---

## Difficulty computation rules (v1)

`computedDifficulty.score` is derived from:

1. **Combo length**: more steps => harder.
2. **Timing strictness**: tighter `delayAfterStepFrames` windows => harder.
3. **Input complexity**: sum of move motion complexity weights.
4. **Game buffer leniency**: generous buffer reduces effective difficulty.

No manual difficulty override in v1.
Recompute trigger: only when a combo is created or updated.

## Viability simulation rules (v1)

- Dual-mode simulation:
  - Deterministic simulation when sufficient frame/scaling/range/state data is present.
  - Observational simulation when data is incomplete.
- Suggestions and route flags must surface evidence level (`observed` | `measured` | `verified`).

---

## Local file sync and crash safety

- Local guide file is the long-term source of truth.
- After import, app keeps an in-memory working copy plus a browser-local recovery snapshot.
- Every combo/game/character/move update writes an incremental recovery snapshot before mutating in-memory state.
- On restart after crash, user is prompted to recover unsaved changes from the snapshot.
- Recovery restores into the same guide-version draft.
- Export flow writes a fresh full guide file and records an export timestamp/version so the app can warn when in-memory changes are newer than disk.
- UI always shows save status: `synced to file` vs `unsaved local changes`.
- Guides default to `targetVersion: "latest"` and can optionally be duplicated into version-locked guides for older patches.
- `latest` behaves as a moving alias to a concrete game version; guides store the resolved version they currently reflect.
- Guide versions keep prior work accessible without requiring full duplicated community snapshots for every patch.
- Community views default to latest guide version and clearly display guide version labels.
- When a newer game version exists, local guides can be flagged as out-of-date and users can choose to refresh toward latest or version-lock their current research.

## Local file format (locked)

```text
my-guide.tfn-workspace/
├── guide.json
└── games/
    └── {gameKey}/
        ├── game.json
        ├── universal-stage-zones.jsonl
        ├── stages/
        │   └── {stageKey}/
        │       ├── stage.json
        │       └── zones.jsonl
        ├── combos.jsonl
        ├── characters/
        │   └── {characterKey}/
        │       ├── character.json
        │       ├── moves.jsonl
        │       └── combos.jsonl
        └── teams/
            └── {teamKey}/
                ├── team.json
                └── combos.jsonl
```

- `.tfn` export/import is a compressed archive of this workspace structure.
- `guide.json` includes a required `schemaVersion` field for import/export compatibility.
- Imports support forward migration only: older guide files are migrated step-by-step to the current schema.
- Guides from a newer unknown schema version are rejected with a clear compatibility message rather than opened best-effort.
- Tags, assists, and similar team mechanics are modeled as moves with state/resource constraints rather than special file-layout cases.
- JSONL is used for large entity lists to minimize corruption scope and reduce merge noise.

---

## Community query/read policy (v1)

- Curated read model:
  - Default community queries return the latest version's most-aligned exact variant plus contributor counts.
  - Users can always inspect contradictory variants and switch which variant they pull into private guides.
  - Comparative slider submissions use axis-level tolerance (default +/-5% on normalized 0-100 scales) when determining whether entries align.
  - Raw submitted slider values are preserved; aggregate views show central tendency and spread instead of overwriting nearby values.
  - Deep history/version exploration is explicit (opt-in query path), not default.
- This policy is required for free-tier cost control and predictable query volume.
