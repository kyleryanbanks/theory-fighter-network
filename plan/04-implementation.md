# Implementation Plan — Priority-Ordered Roadmap

## Overview

This roadmap restructures development around agreed priority order. The work is organized into **5 priority tiers**, each containing concrete phases with clear scope and dependencies.

**Current State**: Models are mature and documented. Data structures for all entities (GameDocument, MoveDocument, CharacterDocument, etc.) are defined with semantic keying, resource scaling, and community metadata already in place.

**Approach**: Phases are grouped by priority tier. Within each tier, phases are ordered by dependency (foundations first). Each phase lists concrete deliverables and validation criteria.

---

## Current Implementation Status (2026-08-15)

Commit history since this roadmap was last updated confirms the following:

- **Phase 1.1 is complete.** The local Guide metadata model, schema-version validation, unsaved/synced tracking, and Guide lifecycle UI are implemented. The app opens to a centered empty state where users create a Guide or load an existing `.tfn`; active Guides expose load, save, and close actions in the header toolbar.
- **Phase 1.3 is complete.** The v1 JSON `.tfn` format is specified and validated, timestamps round-trip exactly, verified legacy archives migrate forward, newer formats require a client upgrade, and browser exports build a complete validated `File`. Supported browsers prompt for destination and filename; other browsers use a standard download.
- **Phase 1.2 is complete.** Game creation, validation, semantic identity, metadata editing, and one-at-a-time input vocabulary authoring are implemented with Angular Material and Signal Forms.
- **Phase 1.4 is partially complete.** Stage identity, validation, Guide-level create/delete mutations, duplicate protection, unsaved tracking, `.tfn` round-trip, and a Material/Signal Forms Stage editor are implemented. Universal Stage Zones, inheritance, and universal sequences remain.
- **Phases 1.5-1.6 are complete; Phase 1.7 has Matchup and Scenario CRUD (2026-08-16).** Matchup creation/deletion validates both Characters exist in-game, permits mirror matches, derives identity from game + attacker + defender only, rejects duplicate attacker/defender identity, and maintains bidirectional `Game.hierarchy.matchupKeys` linkage. Scenarios can be added or removed under a Matchup, reference an existing Move or Sequence, optionally scope to a Stage, and support parent-scenario links. The routed Material `MatchupEditor` is at `/matchups`. Response CRUD, counter-scenario tree validation/navigation, and note-to-Scenario completion remain.

### Completed Supporting Work Not Previously Captured Here

- Nx `data`, `feature`, and `ui` libraries were created, and the application now hosts the feature shell instead of the generated welcome screen.
- GitHub Pages deployment is configured through GitHub Actions with a static Angular build, repository base path, SPA fallback, and automatic production deployment from `main`.
- `LocalGuideFacadeStore` provides in-memory Guide lifecycle orchestration, including creation, update, `.tfn` import/export, and close. The feature shell exposes an empty state, creation flow, active Guide toolbar, and return-to-empty-state flow.
- Primary persisted models and direct nested model types now have colocated `createX` factories with tested defaults and override behavior.
- Guide persistence was separated from model definitions into a `guide/` domain with a nested `guide/archive/` module. Guide factory/mutation, archive service, checksum, and serialization behavior each have focused unit coverage.
- Recent Guide metadata, IndexedDB file handles, reopen behavior, and refresh restoration live in the data library's `persistence/recent-guides` boundary; Feature only renders and invokes that API.
- Angular Router replaces the previously router-less Feature shell: `featureRoutes` (owned by the `feature` lib's `lib.routes.ts`) defines a `Feature` parent route with child routes per hierarchy section (`game`, `stages`, `characters`, `moves`, `sequences`, `teams`, `matchups`, redirecting `''` to `game`), plus parameterized detail routes `moves/:moveKey` and `sequences/:sequenceKey`. The app shell just imports `featureRoutes` and calls `provideRouter(featureRoutes)` directly in `app.config.ts` with no wrapper function. Parameterized detail routes use client rendering in `app.routes.server.ts`; the static section routes remain prerendered.
- `GuideNav` (`libs/app/ui/src/lib/guide-nav/`) is a vertical sidebar next to `<router-outlet />`, listing icon+label links to each hierarchy section with `routerLinkActive` highlighting. It has two modes, `expanded` (icons + labels) and `compact` (icons only, toggled via a button whose width-changing CSS transition is what previously caused a scrollbar/icon-jump flash); the chosen mode persists in `localStorage` (SSR-guarded via `isPlatformBrowser`) so it's remembered across reloads. Below the `640px` breakpoint the nav width is forced to icons-only and the mode toggle button is hidden (`display: none`) since it would have no visible effect there, which also removes it from the accessibility tree so mobile keyboard/screen-reader users don't land on a dead control. The nav band stretches to the full height of its `.guide-layout` flex row (`align-items: stretch`), while its inner `.nav-sticky` wrapper (holding the toggle + link list) uses `position: sticky` so those controls stay pinned in the viewport while long section content scrolls past; `overflow-x: hidden` on that wrapper prevents a browser quirk where setting only `overflow-y` implicitly makes the x-axis `auto` too, which otherwise flashed a horizontal scrollbar during the width transition. The nav icon column has a fixed width (`flex: 0 0 auto`) so icons stay anchored at a constant offset instead of jumping when `justify-content` differs between modes.
- `GuideNav` was moved from the `feature` lib to the `ui` lib (2026-08-16) after a DDD/file-home audit: it's the only routed-shell component with zero dependency on `LocalGuideFacadeStore`, so it belongs with `ui`'s presentational components rather than `feature`'s business-logic-owning editors; every other editor (`CharacterEditor`, `MoveEditor`, `SequenceEditor`, `StageEditor`, `TeamEditor`, `MatchupEditor`, `GameRoot`, `Feature`) injects the facade and correctly stays in `feature`.
- Each routed editor's host element and root `<section>` now stretch to `height: 100%` (via `.guide-content` becoming a flex column with its routed child set to `flex: 1`), so the visible white card fills the same vertical height as the side-nav even when the nav is taller than the editor's own content (previously only the invisible wrapper `div` stretched, leaving a gap below short cards). The Sequence editor's Move-picker tiles (`.move-tile`) were also updated to a fixed `aspect-ratio: 1` square, matching the Team editor's `.character-tile` sizing convention.
- Entity list rows now use the reusable `tfn-expansion-panel` from `libs/app/ui/src/lib/exp-panel/`, built on native `<details>/<summary>` semantics. Panels take required `header`, optional `subheader`, and independent `secondary`/`subsection` boolean inputs; `secondary` controls palette, while `subsection` controls compact/edge-to-edge spacing and can be combined with `secondary`. The old projected `tfnExpansionPanelSummary` API was removed. Entity summaries contain semantic identity, while expanded bodies contain Notes, Metadata, child entities, and actions. Nested categories such as Matchup Scenarios, Stage Zones, Notes, and Metadata use `subsection secondary` panels; primary entity panels have no variant attributes. Detail pages use primary panels and place Metadata last.
- `EntityMetadataView` (`libs/app/ui/src/lib/entity-metadata/`) renders shared metadata fields such as label, created time, last-updated time, and validated version inside Metadata panels; notes remain in the separate Notes panel rather than being duplicated in metadata display.
- Entity notes are generic: `EntityMetadata.notes` is a list of reusable `NoteEntry` values (`id`, `text`, `createdAt`, optional `promotedToKey`) rather than a single string, so every entity gets the same scratchpad model without entity-specific note types. The data facade exposes generic `addEntityNote`, `removeEntityNote`, and `promoteEntityNote` mutations keyed by `EntityType` + entity key. `NotesList` lives in `libs/app/ui/src/lib/notes-list/` as a presentational component with add/remove/address outputs; `EntityNotes` lives in `libs/app/feature/src/lib/entity-notes/` as the shared facade-aware wrapper that owns add/remove/error handling and emits an Address event to its parent editor. Address actions use destination-aware `aria-label`/`title` text; they can also render RouterLink URLs for direct destinations, while draft workflows remain parent-owned event handlers. Direct Address paths currently include Matchup→Scenario, Stage→Zone, Character→Move, and Team→Sequence; Game, Move, Sequence, Stage Zone, and Projectile notes are marked `notAddressable` until a clear destination is defined. A future entity selector should be considered for Game notes (Stage, Character, Move, Sequence, Team, or Matchup), Move notes (phase/effect/connection targets), Sequence notes (future combo/analysis targets), Stage Zone notes (future mechanic sub-entities), and Projectile notes (future projectile behavior sub-entities). The selector should be introduced only when one parent genuinely has multiple valid target types; it is deliberately not part of the current notes workflow. Addressing remains parent-editor owned and preserves the original note via `promotedToKey`.
- `EntityMetadataView` (`libs/app/ui/src/lib/entity-metadata/`) renders shared metadata fields such as label, created time, last-updated time, and validated version inside Metadata panels; notes remain in the separate Notes panel rather than being duplicated in metadata display. `DeleteButton` (`libs/app/ui/src/lib/delete-button/`) centralizes destructive red styling, confirmation prompts, contextual `aria-label`/`title` attributes, and delete event emission across notes, entities, zones, overrides, Matchups, and Scenarios; visible button text remains the fixed `Delete` label.

---

## Priority 1: Local-First Core + Hierarchy

These phases establish the offline foundation. All features are local-only; no network/community features.

### Phase 1.1: Local Guide Foundation
**Status: Complete (2026-08-15).**
**Scope**: Build the Guide metadata layer and browser `.tfn` import/export pipeline.

**Deliverables**:
- Guide metadata schema: gameKey, schemaVersion, lastModified, localChanges[], syncedChanges[], unsavedStatus per entity
- `.tfn` save format with version header and integrity validation
- Browser import/export: Load one `.tfn` file into the in-memory Guide; save the active Guide as one `.tfn` file
- Empty state: Offer Create new guide and Load existing guide without mounting the Game editor prematurely
- Creation transition: Open the Game editor only after Create new guide; allow cancellation back to the empty state
- Active Guide toolbar: Show Guide identity/status with Load `.tfn`, Save `.tfn`, and Close guide actions
- Stable header layout: Reserve one responsive Guide action-bar slot in pending, empty, creating, and active states so toolbar insertion never shifts the content below it
- Close workflow: Clear only the in-memory Guide and return to the empty state without modifying a saved `.tfn`
- Recent Guides: Register successful `.tfn` loads and saves; use IndexedDB as the single browser source of truth for Game/file metadata, reopenable file handles, and validated `.tfn` snapshots
- Recent recovery: Request read permission on explicit recent-item clicks, distinguish permission denial from missing files, and keep the empty state active with an inline recovery message when reopening fails
- Refresh restore: Keep a startup gate active through IndexedDB initialization and automatic `.tfn` import; render a stable blank shell for fast restores, show loading only after 200ms, and keep an displayed loader visible for at least 400ms so neither the empty state nor loading text flashes
- Unsaved/synced tracking: Mark entities as `unsaved` after edits, `synced` after save
- Schema version registration and forward-compatibility checks

**Validation**: Initial load shows only create/load choices; create opens the Game editor; load/save round-trip preserves all data; close returns to the empty state; schema version mismatch is caught with a clear error message

---

### Phase 1.2: Game Creation Root (Local CRUD + Validation)
**Status: Complete (2026-08-15).** Game creation derives a deterministic semantic key from normalized name and major-version family, validates required fields and duplicate input values, and supports local metadata updates that preserve identity and mark the guide unsaved. The Angular Material/Signal Forms editor adds directions and buttons one item at a time, displays each entry separately, supports removal, and persists the complete typed `Inputs` value. Game name and version are immutable after Guide creation so semantic identity cannot be changed without a future explicit migration workflow.
**Scope**: Build GameDocument local CRUD operations and validation rules.

**Deliverables**:
- GameDocument creation: Initialize with name, version, frameRate, is3d, teamSize, inputs
- GameDocument validation: Semantic key integrity, required fields, input vocabulary uniqueness
- GameDocument local edits: Update metadata, frameRate, dimensions, inputs
- Semantic key generation: Hash(normalizedGameName + versionFamily) for canonical identity
- Version family detection: Extract from version string (e.g., "1.0" → "1.x" family)

**Validation**: Create game → verify semanticKey stability; update game metadata → semanticKey unchanged; invalid inputs rejected

**Depends on**: Phase 1.1

---

### Phase 1.3: .tfn Save/Load Pipeline (Locked Structure + Migration)
**Status: Complete (2026-08-15).** The v1 archive header, canonical entity order, deterministic checksum, exact date serialization/hydration, format-0 to format-1 migration, future-version rejection, browser `File` import/export, native save-location selection with download fallback, dedicated web persistence tests, and formal format specification are implemented and tested.
**Scope**: Build the locked file format and forward-only migration system.

**Deliverables**:
- `.tfn` format specification: Binary or JSON with version header, checksums, entity order
- Save pipeline: GameDocument → complete validated `.tfn` `File`; prompt for destination where supported, otherwise use browser download
- Save filename: Suggest a Unicode-normalized, lowercase slug of the Game name with the `.tfn` extension
- Load pipeline: `.tfn` → validate header + schema version → deserialize entities
- Forward-only migration: Accept registered older formats such as format 0 → 1; reject format 2 files in a format 1 client
- Unknown schema rejection: If schemaVersion > current client version, fail with instruction to upgrade
- Integrity validation: Checksums verify file not corrupted between saves

**Validation**: Save → Load → Compare == original; forward-migration works; downgrade attempt fails gracefully

**Pre-release policy**: Keep Guide schema version `1` while the product is unreleased and models are still changing. Begin schema-version bumps and Guide-data migrations with the first official release; archive-envelope migrations remain separately versioned.

**Depends on**: Phase 1.1, 1.2

---

### Phase 1.4: Entity Hierarchy Foundation (Stages + Zone Inheritance)
**Status: Stage CRUD + Zone CRUD complete (2026-08-16).** Stage creation, deletion, and unsaved tracking are implemented. Stage-scoped zone CRUD mutations update parent `Stage.hierarchy.zoneKeys` bidirectionally. Zone semantic keys derive from game + stage + name. Zone inheritance/override UI is deferred to Phase 1.4.1 so hierarchy work can proceed to characters and moves.
**Scope**: Build hierarchy starting from game downward: universal stage zones, stages, zone inheritance, and zone overrides.

**Deliverables**:
- Universal stage zones: StageZoneDocument with `stageKey: null` (game-level, inherited by all stages)
- Stage creation/CRUD: StageDocument with gameKey, name, semanticKey
- Stage-scoped zones: StageZoneDocument with `stageKey: <stageId>` (stage-specific override)
- Inherited zones: Optional `inheritedFromZoneKey` tracking when stage zone overrides game zone
- Inheritance UI: Show inherited fields with lock/override UI; changes to parent propagate to unlocked children *(moved to Phase 1.4.1)*

**Validation**: Game zones visible to all stages; stage zones override game zones where applicable

**Ownership convention**: Child documents remain separate entities with their own `semanticKey` and parent scope key. Parent documents store ordered arrays of those existing child semantic keys (`Game.stageKeys`, `Stage.zoneKeys`, `Character.moveKeys`, etc.). Guide validation requires both directions to agree.

**Depends on**: Phase 1.2

---

### Phase 1.4.1: Zone Inheritance/Override UI (Deferred)
**Status: Complete (2026-08-16).** The facade's `createStageZone` mutation now supports both universal (game-level) and stage-scoped creation directly (previously it required a `stageKey`, so universal Zone creation had no UI path); a new `overrideStageZone` mutation clones a universal Zone's name and `mechanicStateKeys` into a Stage-scoped Zone with `inheritedFromZoneKey` set, rejecting a duplicate override of the same universal Zone for the same Stage. The Stage editor now has a "Universal Stage Zones" management section (create/delete) plus, per Stage, a merged Zone list: universal Zones show a lock icon, a "Universal" tag, and an "Override" action; Stage-scoped overrides show what they override and a "Revert to Universal" action (implemented as deleting the override, since the universal Zone is a separate persisted entity); plain Stage-only Zones (no `inheritedFromZoneKey`) show a normal Delete action. Field-level override indicators beyond name/`mechanicStateKeys` are deferred until Zones gain more editable fields worth diffing.
**Scope**: Build the stage editor UI to display and manage zone inheritance.

**Deliverables**:
- Zone list in stage editor: Show universal (game-level) zones alongside stage-scoped zones
- Inherited zone display: Show inherited fields read-only with a lock icon
- Override action: Let a user create a stage-scoped zone that shadows a universal zone, setting `inheritedFromZoneKey`
- Revert-to-inherited action: Remove a stage-scoped override and fall back to the universal zone
- Field-level override indicators: Highlight which zone fields differ from the inherited parent *(deferred — no substantive editable Zone fields beyond name/mechanicStateKeys yet)*

**Validation**: Universal zones appear on every stage; creating an override does not delete the universal zone; reverting an override removes only the stage-scoped copy

**Depends on**: Phase 1.4

---

### Phase 1.5: Character Branch (Characters, Moves)
**Status: Complete (2026-08-16).** Character creation/deletion mutations derive a semantic key from game + normalized name, reject duplicates, block deletion while moves/sequences/projectiles reference the character, and mark the guide unsaved. Move creation/deletion supports both universal (game-level, `characterKey` omitted) and character-scoped moves, deriving a semantic key from game + optional character + normalized name, rejecting duplicates within a scope, and maintaining bidirectional linkage (`Character.hierarchy.moveKeys` or `Game.universal.moveKeys`). Material/Signal Forms Character and Move editors are wired into the feature shell. Move phase/effect/precondition editing and input-sequence parsing remain for Phase 3.1.
**Scope**: Build character entity hierarchy: character creation, character-scoped moves.

**Deliverables**:
- CharacterDocument creation: Initialize with gameKey, name, archetypes, states (inherit from game)
- Character-scoped moves: MoveDocument with gameKey + characterKey; inherit game-level moves
- Move CRUD: Create, edit, delete moves; validate preconditions and phases
- Move input parsing: Convert button/direction sequences to canonical input representation
- Inheritance chains: Show parent game moves; highlight character-scoped overrides

**Validation**: Character inherits game moves; local overrides don't affect parent; semanticKeys stable across edits

---

### Phase 1.5.1: Sequence Authoring (Universal + Scoped)
**Status: Complete (2026-08-16).** Sequence creation/deletion supports universal (game-level), character-scoped, and team-scoped sequences, deriving a semantic key from game + scope + a canonical (order-preserving, per-step-sorted) serialization of the Move-reference steps, rejecting duplicates within a scope, and rejecting a sequence scoped to both a Character and a Team. Bidirectional linkage updates `Character.hierarchy.sequenceKeys`, `Team.hierarchy.sequenceKeys`, or `Game.universal.sequenceKeys`. A Material Sequence editor lets users pick a scope, add existing Moves in that scope to an ordered draft, and submit/delete sequences. Team-scoped sequence authoring is fully unblocked now that Team CRUD exists (Phase 1.6). Promote-to-inherited workflow remains for Phase 3.3.
**Scope**: Build sequence entities across scopes after moves are defined.

**Deliverables**:
- Universal sequences: SequenceDocument with `characterKey: null, teamKey: null` (game-level, inherited by all)
- Character-scoped sequences: SequenceDocument with gameKey + characterKey
- Team-scoped sequences: SequenceDocument with gameKey + teamKey
- Sequence CRUD: Create, edit, delete sequences; validate move references
- Inheritance UI: Show inherited sequences; allow character/team override or promotion to universal
- Promote-to-inherited workflow: Move character-scoped sequence → game-scoped (if applicable)

**Validation**: All referenced moves exist in scope; sequences inherit correctly; promotion preserves semantics

**Depends on**: Phase 1.2, 1.4, 1.5

---

### Phase 1.6: Team Branch (Teams)
**Status: Team CRUD complete (2026-08-16).** Team creation/deletion derives a semantic key from game + the ordered list of member Character semantic keys (order-preserving, so reordering members changes identity), validates every referenced Character exists in the Guide, rejects duplicate Character orderings, and blocks deletion while local Sequences still reference the Team. Team creation also enforces the Game's `config.teamSize`: rejected entirely when `teamSize <= 1`, and rejected when more Characters are given than `teamSize` allows; subsets smaller than `teamSize` are allowed for combo-tracking purposes. Bidirectional linkage updates `Game.hierarchy.teamKeys`. A Material Team editor lets users add Characters to an ordered draft and submit/delete Teams. This also unblocks full authoring for the team-scoped Sequences added in Phase 1.5.1. Reordering an existing Team's members (as an edit rather than delete+recreate) and assist/loadout scoping remain open — assists are modeled as ordinary Moves per [plan/03-workflows.md](../plan/03-workflows.md), so "assist/loadout scoping" needs a concrete schema (e.g. team-level references to specific Move/Character assist selections) before it can be implemented; deferred to a future pass once that design is settled.
**Scope**: Build team entity hierarchy: team creation.

**Deliverables**:
- TeamDocument creation: Select ordered list of CharacterDocuments; compute semanticKey from character order
- Team CRUD: Create, edit, delete teams; reorder members
- Assist/loadout scoping: Team-level values for assist/loadout selection *(deferred — needs schema design; assists are modeled as Moves per [03-workflows.md](../plan/03-workflows.md))*
- Team validation: All characters must exist in game; order preserved in semanticKey; Team Size must be greater than 1; a Team cannot exceed the Game's Team Size (smaller subsets are allowed)

**Validation**: Create team → verify all characters exist; reorder team → semanticKey updates; team creation is rejected when `teamSize <= 1` or when the Character count exceeds `teamSize`

**Depends on**: Phase 1.5, 1.5.1

---

### Phase 1.7: Matchup Branch (Matchups + Scenario/Response Trees)
**Status: Matchup and Scenario CRUD complete (2026-08-16).** Matchup creation/deletion derives a semantic key from game + attacker + defender, permits mirror matches, validates both Characters, rejects duplicate attacker/defender identity, and maintains bidirectional `Game.hierarchy.matchupKeys` linkage. Scenario creation/deletion derives identity from Matchup + opponent Move/Sequence + optional Stage/state/positions, validates referenced options and stages, and supports parent-scenario links. The Material `MatchupEditor` is routed at `/matchups`; it includes generic Matchup notes and Address-to-Scenario workflow without deleting the original note. Move and Sequence detail views are available at `/moves/:moveKey` and `/sequences/:sequenceKey`. Response CRUD, response-tree validation/navigation, and Scenario-note-to-Response addressing remain.
**Scope**: Build matchup entities and scenario/response decision trees.

**Deliverables**:
- MatchupDocument creation: Pair character1/character2 from same game
- Scenario definition: GameStateContext (players' states, resources) + test conditions
- Response tree: Branch decision tree where each node represents opponent state → user's available moves
- Scenario/response CRUD: Create, edit delete scenarios and response paths
- Navigation: Query matchup → select scenario → explore response tree
- Scenario validation: GameStateContext is valid for associated characters

**Validation**: Matchup requires both characters; scenarios have consistent game version; response tree is acyclic

**Depends on**: Phase 1.6, 1.5.1

---

## Priority 2: Highest-Priority Advanced Feature

### Phase 2.1: Comparative Property Ordering + Inferred-Bound Engine
**Scope**: Build the data analysis engine for property ordering and bound inference.

**Deliverables**:
- Comparative property ordering: Rank moves by properties (damage, startup, range) using DataValue.relative
- UI: Full-screen multi-move range comparison; set DataValue.relative for each move
- Inferred-bound engine: Analyze per-hit damage sequences → infer scaling factors → suggest scaling bounds
- Bound validation: Check suggested bounds against move effects; highlight conflicts
- Damage scaling discovery: User enters per-hit damage → TFN extracts % reduction per hit → suggests bounds
- Scaling curve visualization: Graph showing inferred damage reduction over sequence

**Validation**: Comparative ordering produces consistent rankings; inferred bounds match empirical data within tolerance

**Depends on**: Phase 1.5 (moves must exist)

---

## Priority 3: Included Local Authoring/Analysis Features

### Phase 3.1: Move Connectivity Editor
**Scope**: Build comprehensive move effects and connectivity UI.

**Deliverables**:
- Move phase editor: Create/edit/delete phases with duration, startup, active, recovery FrameStages
- Collision box editor: Visual/numeric editor for hitBoxes, hurtBoxes, collisionBoxes, throwBoxes (Region objects)
- Move outcome effects: Define effects on hit, block, guard (opponent stun, damage, resources, positional)
- Resource effect UI: Select resource → choose modification mode (delta/multiply/exact/amount) → set value
- Cancel window UI: Define cancels from this move; set windowStartFrame/windowEndFrame on target moves
- Precondition UI: Set required/forbidden player state, required opponent state, cancel/follow-up restrictions
- Effect validation: Highlight resources defined in game config; warn on undefined resources

**Validation**: All phases have duration; collision boxes are valid; effects reference defined resources

**Depends on**: Phase 1.5, 2.1

---

### Phase 3.2: Full-Screen Multi-Move Range Comparison
**Scope**: Build visual comparison tool for move ranges with relative positioning.

**Deliverables**:
- Range profile UI: Display multiple moves side-by-side; show hitBox/hurtBox/collisionBox visually
- Relative positioning: Set DataValue.relative for each move's range properties
- Visual range bands: Highlight range bands (close, mid, far) for quick comparison
- Transition edges: Show which moves connect at different ranges
- Scaling visualization: Show how range changes with game-level zone modifiers (if applicable)

**Validation**: Visual and numeric representations match; relative values normalize to 0-100%

**Depends on**: Phase 3.1

---

### Phase 3.3: Promote-to-Inherited Workflow (Moves/Zones)
**Status: Core promote/override implemented ahead of schedule (2026-08-16).** `promoteMove`/`promoteStageZone` mutations convert a Character Move or Stage Zone into a universal one (rejecting promotion of an entity that is itself an override, and rejecting a name collision with an existing universal entity); promoting a Move rewrites every Sequence Step that referenced its old key to the new universal key, since Sequences store direct Move references. `overrideMove`/`overrideStageZone` create a scoped entity that live-inherits its parent's data fields (`sequence`/`preconditions`/`phases` for Moves, `mechanicStateKeys` for Zones) via `resolveEffectiveMove`/`resolveEffectiveStageZone`: any field the override hasn't explicitly set keeps following the parent's current value, so later edits to the universal entity continue propagating to overrides that never customized that field — this replaces the originally-planned `fieldOverrides`/`parentOverrides` tracking arrays (removed as dead code), since field-presence itself (`undefined` = inherit) is sufficient once overrides are lazily merged rather than snapshot-copied. The Stage editor and Move editor both expose Promote/Override/Revert-to-Universal actions inline. Conflict detection (duplicate moves across characters), a dedicated undo/rollback beyond delete-based revert, and impact-analysis UI remain open.
**Scope**: Build UI for promoting character-scoped entities to game-scoped.

**Deliverables**:
- Promote move: Character move → game move; update all character references to inherit
- Promote zone: Stage zone → game zone; update all stage references to inherit
- Conflict detection: Warn if multiple characters have identical moves (candidate for promotion) *(not yet implemented)*
- Undo/rollback: Revert promotion; restore character-scoped versions *(revert-by-delete exists for overrides; promotion itself has no dedicated undo yet)*
- Impact analysis: Show which entities will be affected by promotion *(not yet implemented)*

**Validation**: Promoted entity becomes game-level; character references update; no data loss

**Depends on**: Phase 1.4, 1.5

---

### Phase 3.4: Scoped Combo Editor with Scaling Validation
**Scope**: Build combo authoring UI with real-time scaling and feasibility checks.

**Deliverables**:
- Combo creation: Select moves in sequence (universal, character, or team scope)
- Real-time validation: Apply move1 effects → resolve resources → check move2 timing and spacing
- Scaling visualization: "After move 1, hitstun = X frames; move 2 needs Y startup"
- Hitstun tracking: Show scaled hitstun after each move; highlight when hitstun ≤ next move startup
- Spacing validation: Show positions after each move; warn if spacing exceeds next move's range
- Difficulty inference: Suggest difficulty based on scaling tightness and window sizes
- Scope selector: Edit at universal (game), character, or team level; visualize inheritance

**Validation**: Combos pass feasibility checks at current game state; infeasible combos flagged with reasons

**Depends on**: Phase 1.7, 3.1, 2.1

---

### Phase 3.5: Automated Exploration Assistant
**Scope**: Build intelligent suggestions for missing/incomplete data.

**Deliverables**:
- Coverage analysis: Scan game → identify missing moves, moves with incomplete data, untested sequences
- Phase-aware suggestions: "You have 3 hit combos; try X-hit combos" based on observed patterns
- Damage scaling discovery: "You've entered per-hit damage for 3 sequences; scaling appears to be -10%"
- Bound suggestions: "Set damage-scaling bounds to 25-100% based on data"
- Mobile data collection hints: "Next move to test: X (you have 5 test results for move Y)"
- Priority ranking: Suggest highest-impact data (missing core moves before optional properties)
- Learning curve: Remember user's previous inputs; suggest compatible properties next time

**Validation**: Suggestions are actionable; coverage analysis accurately counts missing/incomplete data

**Depends on**: Phase 2.1, 3.1

---

### Phase 3.6: Matchup/Counter-Option Graph Model + Editor
**Scope**: Build matchup decision trees and counter-option visualization.

**Deliverables**:
- Graph model: Nodes = game states; edges = available moves → outcomes
- Scenario trees: Navigate scenario → opponent state → available moves → outcomes
- Counter graph: Highlight move chains that beat opponent options
- Visual graph editor: Drag-drop nodes, connect edges, label transitions
- Graph queries: "What beats this opponent string?" → highlight counter-moves
- Convergence view: Compare user's graph against community graphs; show differences
- Graph validation: Ensure no contradictory edges; warn on incomplete scenarios

**Validation**: Graph is acyclic for turn-based; counter-queries return correct moves; queries complete in <100ms

**Depends on**: Phase 1.7, 3.1

---

### Phase 3.7: Scenario Testing with Web Controller API
**Scope**: Build UI for testing scenarios against simulated/real opponents.

**Deliverables**:
- Web Controller API integration: Send scenario + user's combo → simulate opponent reaction
- Test scenario creation: Define opponent's starting state and respond patterns
- Test result recording: Compare expected vs. actual outcome; record video/frames for analysis
- Batch testing: Queue multiple scenarios; run tests in background
- Result visualization: Show pass/fail breakdown; highlight failure patterns
- Determinism verification: Run same scenario twice → verify identical outcomes

**Validation**: Test results are repeatable; API calls succeed and return expected data format

**Depends on**: Phase 3.4

---

### Phase 3.8: Local Recovery Snapshot + Crash-Restore UX
**Scope**: Build auto-save and crash recovery features.

**Deliverables**:
- Auto-snapshot: Periodic browser-local snapshots of the in-memory Guide (e.g., every 5 minutes)
- Snapshot versioning: Store 10 most recent snapshots with timestamps
- Crash detection: On startup, check for incomplete save from previous session
- Restore UI: "Last save crashed. Restore from backup?" with timestamp selection
- Diff viewer: Show what would be restored; allow selective restoration
- Explicit save: Build and validate the complete `.tfn` file before starting the browser download

**Validation**: Snapshots are valid; restored state matches snapshot; atomic saves don't partially corrupt files

**Depends on**: Phase 1.3

---

## Priority 4: Included Sharing/Community Foundation

### Phase 4.1: Peer-to-Peer Sharing Workflow
**Scope**: Build local peer-to-peer export/import for sharing game data.

**Deliverables**:
- Export for sharing: Bundle game + selected entities into portable `.tfn` file with user metadata
- Share metadata: Include author name, version notes, date shared
- Import from peer: Load peer's `.tfn` → merge with local guide using semantic keys
- Duplicate detection: Identify identical entities (same semanticKey) across peer copies
- Merge conflict UI: When peer has different version of same entity, show diff and allow selection
- Trust model: Mark peer-imported entities with source author and import date

**Validation**: Exported guide is valid and complete; imported guide merges without corrupting local state

**Depends on**: Phase 1.3, 1.7

---

### Phase 4.2: Local/Community Compare-Merge Workflow
**Scope**: Build UI for comparing and merging local vs. community variants.

**Deliverables**:
- Compare view: Side-by-side local vs. community entity (same semanticKey)
- Diff highlighting: Show which fields differ; highlight significant changes (move startup, damage) vs. minor (notes)
- Merge options: Keep local, accept community, or manual field-by-field merge
- Variant tracking: Store merge history; mark merged entities as "convergent" if no local changes remain
- Batch merge: Apply merge strategy to multiple entities at once
- Convergence detector: Highlight when local and community versions align

**Validation**: Merges preserve both versions if needed; convergence detection is accurate; no data loss

**Depends on**: Phase 4.1

---

### Phase 4.3: Safe Serializable State Behaviors (FEEL Migration)
**Scope**: Replace temporary raw JavaScript state behavior execution with serializable FEEL expressions before behavior data can enter Firestore or other untrusted sharing paths.

**Current temporary implementation**:
- `StateDocument.behavior` stores JavaScript function bodies as strings.
- `StateBehaviorRegistry` executes those strings with the JavaScript `Function` constructor.
- This path is intentionally trusted-user/local-only and is not a security boundary.
- Imported or community-provided JavaScript behavior must not execute automatically.

**Deliverables**:
- FEEL integration: Add the maintained `feelin` parser/interpreter and remove `Function`-constructor execution.
- Serializable expressions: Store `onUpdate` and `onFrameAdvance` FEEL expressions directly in state documents.
- Restricted evaluation context: Expose only plain JSON state and incoming effect data; expose no DOM, network, storage, or application functions.
- Patch result contract: Require expressions to return `RuntimeStatePatch`-compatible data rather than a complete mutable context.
- Patch validation: Reject unknown categories, unknown state keys, invalid value types, prototype-related keys, and non-JSON values before applying results.
- Deterministic application: Preserve preferred state execution order and pass each validated result into the next registered frame behavior.
- Error reporting: Convert FEEL parser and evaluation warnings into field-level authoring feedback and actionable runtime errors.
- Performance benchmark: Measure 10, 50, and 100 frame behaviors over representative simulation lengths in browser and SSR environments.
- Performance mitigation: Cache behavior registration metadata and determine whether repeated FEEL parsing meets frame simulation targets; isolate or replace the evaluator if it does not.
- Migration: Convert existing trusted JavaScript examples and local behavior documents to FEEL expressions, including the Tokon style-scaling behavior.
- Trust handling: Preserve unknown or invalid behavior expressions without executing them, and require explicit user review after import.

**Validation**: Tokon style scaling and representative frame/update behaviors produce validated patches; expressions cannot access browser/application globals; malformed or invalid patches are rejected; deterministic execution tests remain green; benchmark results meet the agreed simulation budget.

**Depends on**: Phase 4.1, 4.2 and the local simulation behavior implemented in Phases 3.4 and 3.7

---

## Priority 5: Included Firestore/Community Work

### Phase 5.1: Auth + Opt-In Firestore Sync/Community Browsing
**Scope**: Build authentication and cloud sync infrastructure.

**Deliverables**:
- Firebase auth: Email/password or OAuth login
- Opt-in sync: User toggle to enable/disable Firestore sync
- Sync strategy: Push local entities → Firestore; pull community entities on demand
- Cloud guide index: Firestore collection of published guide.json references
- Community browser UI: Search games, characters, moves; browse published guides
- Sync status: Show which entities are synced vs. local-only
- Offline mode: App works fully offline; sync happens when connection available

**Validation**: Auth works across sessions; sync is optional; app functions offline; community browser displays correct data

**Depends on**: Phase 4.1, 4.2, 4.3

---

### Phase 5.2: Convergence/Variant UX
**Scope**: Build UI for displaying convergence and variants in community context.

**Deliverables**:
- Convergence indicator: Show when local/community entities are aligned
- Variant browsing: Display different community versions of same move/combo (e.g., multiple interpretations)
- Version timeline: Show how community entity evolved over time
- Variant merging: Merge multiple community variants into synthesis
- Conflict labeling: Mark contradictory data in community (e.g., two different damage values)
- Trust scoring: Sort variants by community consensus or author reputation

**Validation**: Convergence detection aligns with manual inspection; variants display correctly; merges are sensible

**Depends on**: Phase 5.1

---

### Phase 5.3: Curated Community Read Model + Indexes/Security Rules
**Scope**: Build Firestore indexes and security rules for community browsing and curation.

**Deliverables**:
- Read model schema: Optimized Firestore collections for community browsing (games → moves, characters, combos)
- Indexes: Composite indexes for common queries (game + character, game + move, damage range)
- Security rules: Users can read published entities; write only to own entities; curators can promote variants
- Curator role: Designated users can flag variants as "canonical" or "common alternative"
- Unpublish rules: Users can unpublish own entities; curators can remove harmful content
- Audit log: Track publish/unpublish/curation actions for transparency

**Validation**: Indexes enable queries to complete in <1s; security rules prevent unauthorized writes; audit log records all actions

**Depends on**: Phase 5.1

---

### Phase 5.4: Granular Publish Workflow
**Scope**: Build fine-grained entity publishing and community discovery.

**Deliverables**:
- Publish options: Publish individual entities or entire guides at specific scope
- Publish scoping: Entity can be published as universal (game-level), character-scoped, or team-scoped
- Versioning: Published entities retain gameVersion and schema version
- Unpublish: Remove entity from community (mark as deprecated with reason)
- Publish history: Track publish/unpublish timeline for version recovery
- Discovery: Featured guides, trending moves, recent publications
- Notification: Users notified when their entities receive community feedback/variants

**Validation**: Published entities appear in community browser within 5s; unpublish removes them; history is auditable

**Depends on**: Phase 5.2, 5.3



---

## Implementation Strategy

1. **Local-first approach** (Priorities 1-3): Build complete offline functionality first. No network dependencies; all features work without internet.
2. **Dependency ordering within tiers**: Earlier phases provide foundations for later phases. Phases can be parallelized within a tier if dependencies are met.
3. **Validation-first design**: Each phase includes clear validation criteria to ensure completeness before moving forward.
4. **Iterative community features** (Priorities 4-5): Once local features are solid, add community/cloud incrementally with opt-in toggles.
5. **Backward compatibility**: Forward-only migration ensures users can load old files; clients never downgrade schema versions.
