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

## Peer-to-peer guide sharing workflow

Users can share guides, combos, matchups, or scenarios with friends and teammates without publishing to the community guide. This enables local scene collaboration and private theory-crafting.

**Share flow:**

1. User selects one or more entities (combo, sequence, matchup scenario, or entire guide section) and chooses "Share with friend."
2. App generates a shareable `.tfn` file or text/link representation of the selected entities.
3. Options:
   - **Export to file**: Download `.tfn` file, send via email/messaging
   - **Copy as text**: Export move/combo definitions as readable text for pasting in Discord/chat
   - **Generate shareable link**: Create time-limited link for direct import (if backend supports)
4. Recipient imports the file/text:
   - **Merge or replace**: Choose whether to merge into existing guide or create new guide
   - **Conflict resolution**: If same entity exists locally, show side-by-side comparison (like inheritance flow)
   - **Accept or keep local**: For each conflicting entity, choose to import variant or keep existing version
5. Imported data retains `semanticKey` and `semanticFingerprint` for cross-referencing with community data.
   - If recipient later publishes, community can match it against other published versions with same fingerprint.
   - Enables community to discover independent confirmations of data (multiple people tested same thing).

**Why this matters:**
- Local FGC communities can collaborate without publishing to global database.
- Teammates share routing and theory without public visibility.
- Solo research can be peer-reviewed by friends before community publishing.
- Data remains usable in private guides even if community publishing feature isn't needed.

---

## MatchupScenario testing workflow

Users can create specific scenarios and use TFN to drive opponent actions deterministically, testing and tracking how their strategies respond.

**Scenario creation:**
1. User selects matchup (e.g., Ryu vs Zangief) and game state (round 1, mid-stage, neutral resources).
2. User specifies opening position and state (player at mid-range, standing, no meter).
3. User selects opponent action via `opponentOptionKey` (a move or sequence semanticKey):
   - Example: "Zangief Red Focus into Lariat" (sequence semanticKey)
   - App resolves the semanticKey to the actual move/sequence definition
4. User records their tested response action(s):
   - Input sequence they're testing (their combo, counter, tech attempt, etc.)
   - Expected outcome (-1: loses/gets hit/thrown, 0: neutral/blocks/escapes, +1: wins/hits/counter-hits)
5. Scenario is saved as MatchupScenario node with:
   - `opponentOptionKey` (deterministic opponent move reference)
   - `playerResponse` (their tested action or null for "what should I do here?")
   - `outcome` (result: -1/0/+1)
   - Child scenarios for follow-ups (e.g., if opponent does secondary action after the first)

**Testing with Web Controller API:**
1. User opens scenario and clicks "Test this scenario" or "Replay opponent action."
2. App uses Web Controller API to drive opponent character:
   - Inputs opponent move/sequence from semanticKey definition
   - Drives opponent through all input frames + frame timings
   - Opponent moves deterministically from the scenario's opening state
3. User can:
   - **Counter test**: Play their counter-action in real-time against AI opponent (Web Controller drives their test input)
   - **Observe**: Watch opponent move play out without responding (understand timing/positioning)
   - **Record outcome**: Save what happened vs expected outcome
4. Results update scenario node:
   - `testCount`: How many times this scenario has been tested
   - `outcomeMatches`: "Tested 5 times, outcome matched expected 4 times, failed 1 time"

**Scenario tree exploration:**
1. Scenarios form a tree: parent scenario → opponent does action → user responds → child scenarios branch from outcome.
2. Example tree structure:
   ```
   Ryu mid-range vs Zangief Red Focus+Lariat
   ├── If player responds with jab (loses) → child node: "How to handle Red Focus after counter-hit"
   ├── If player responds with throw tech (wins) → child node: "Zangief options after tech"
   └── If player responds with backdash (neutral) → child node: "Zangief followup from distance"
   ```
3. Users expand scenarios they want to explore further, creating a living game tree.
4. Communities can share scenario trees (peer-to-peer or published) to crowdsource matchup knowledge.
5. Shared scenarios retain semanticKey references, so opponent moves update automatically if community data changes.

**Why this matters:**
- Deterministic opponent actions (via semanticKey) enable reproducible testing.
- Users discover option coverage and gaps ("What beats this move in this position?").
- Web Controller API turns TFN into a testing partner, not just a knowledge repository.
- Communities can build scenario trees showing how to navigate complex positions.
- Data-driven exploration: track actual test results, not just theory.

---

### Identity link + merge notes

- Move identity is determined by semanticKey (game + input frames + preconditions), not user-defined move name.
- When publishing a move, the app compares its semanticKey against existing community moves to find potential matches.
- Move name is treated as variant display text only; identity matching uses semanticKey.
- When multiple users publish moves with the same semanticKey but different gameplay values (frame data, effects, etc.), they create different `semanticFingerprint` variants.
- The app displays variant counts: "3 people published this move; showing variant A (3 matches), variant B (1 match)."
- Users can inspect individual variants and choose which to import into their private guide.
- Sequences use `moveSemanticKey[]` (ordered semantic keys) for deterministic move references.
- Same ordered sequence of moveSemanticKeys = same sequence identity, even if multiple users published variants with different timing or extended combos.
- Timing-only differences (same moves, different delays) are stored as separate sequence variants.
- MatchupScenario trees use `opponentOptionKey` (move or sequence semanticKey) to reference opponent actions deterministically.

---

## Damage scaling helper workflow

Users capture per-hit damage in sequences, and TFN infers scaling patterns to help discover game configuration.

**Empirical data collection:**
1. User tests sequence in training mode and records damage of each hit:
   - "Ryu Jab → Hadoken → Kick combo"
   - Hit 1: Jab base damage 40 → observed 40 damage
   - Hit 2: Hadoken base damage 100 → observed 90 damage
   - Hit 3: Kick base damage 80 → observed 56 damage
2. User enters observed damage per hit in sequence UI
3. TFN calculates scaling factor for each hit:
   - Hit 1: `40 / 40 = 100%` (initial scaling)
   - Hit 2: `90 / 100 = 90%` (scaling reduced 10%)
   - Hit 3: `56 / 80 = 70%` (scaling reduced 20% from hit 2)

**Pattern discovery:**
1. TFN analyzes inferred scaling across multiple sequences:
   - "Damage scaling drops approximately 10% per hit"
   - "Lowest observed damage: 35 (70% of base 50)"
   - "Highest observed damage: 100 (matches base move damage)"
   - "Does scaling reset when meter-burn move is used?"
2. UI surfaces discoveries as hypotheses:
   - "Scaling hypothesis: `min: 25%, max: 100%, -10% per hit`"
   - "Reset hypothesis: meter-burn moves reset scaling to 100%"
3. User confirms/adjusts hypotheses based on testing

**Game configuration:**
1. User applies discovered bounds to game settings:
   - `game.states.resources.damage-scaling: { min: 25, max: 100, initialValue: 100 }`
2. User documents scaling modifiers on moves:
   - Regular moves: apply `-10% damage-scaling` effect
   - Meter-burn: apply `reset damage-scaling to 100%` effect
3. TFN validates against hypothesis:
   - New sequence at 5 hits: expected final scaling ~50%, move says 55% → note discrepancy

**Why this matters:**
- **Discovery-driven**: Users don't guess scaling formula; TFN helps them find it
- **Game-agnostic**: Works for any game with or without scaling
- **Data-backed**: Inferred from actual gameplay, not theory
- **Iterative refinement**: Users test edge cases (corner, resources, state changes) to refine bounds
- **Live validation**: Once configured, TFN flags anomalies in new sequences

---

## Mobile-guided data collection workflow

TFN helps users fill in missing move data and test sequences/scenarios using phone-optimized quick-entry interface, with real-time sync to desktop.

**Discovery and guidance:**
1. User opens guide on desktop; TFN identifies gaps:
   - Moves missing frame data (startup, active, recovery)
   - Moves missing hitstun/blockstun or frame advantage
   - Sequences or scenarios not yet tested
   - Moves marked as `{ relative: ... }` (approximate positioning) without `{ exact: ... }` confirmation
2. Desktop UI shows actionable checklist:
   - "Ryu Jab: Missing startup (estimated 4 frames)"
   - "Hadoken: Frame advantage unknown"
   - "Jab → Hadoken: Untested combo"
   - "Ryu vs Zangief mid-range: 3 untested scenarios"
3. User can click "Collect data" to start guided mobile session.

**Mobile-optimized entry UI:**
1. App opens on phone in **quick-entry mode**:
   - Large touch targets (buttons, sliders, number pads)
   - Minimal keyboard/mouse interaction
   - Fullscreen focused on one data point at a time
   - Progress bar showing data collection task completion
2. Phone displays prompt for current gap:
   - "Test: Can Jab combo into Hadoken?"
   - User taps: "Yes" / "No" / "Unknown"
   - Result saved immediately
3. Next gap automatically loads:
   - "Hadoken startup (current estimate: 10 frames)"
   - User taps "+ Frame" or "- Frame" or enters exact value
   - Or slides relative position on discovered bounds
4. For sequences/scenarios:
   - "Record: Does Jab → Hadoken combo connect?"
   - User performs input on game, taps outcome: "Yes" / "No" / "Blocked"
   - Frames opponent action if scenario testing

**Real-time sync (desktop ↔ phone):**
1. Desktop and phone maintain shared session (not Firestore):
   - Peer-to-peer sync via WebSocket, local network, or shared document store
   - When user enters data on phone, desktop updates immediately
   - Desktop shows live checklist with updated values
   - Example: User enters "Hadoken startup: 13" on phone → desktop shows "Hadoken: startup 13 (verified)"
2. User can:
   - Switch between devices mid-session (continue data entry on phone, review on desktop)
   - See desktop preview while on phone (if device supports split view)
   - Desktop acts as checklist/reference (move properties, combo definitions)
   - Phone acts as input device (testing lab, data entry)
3. Sync scope:
   - Only entities in current collection session
   - Session-local until user chooses to save/merge to guide
   - No Firestore dependency (internal app sync only)

**Workflow progression:**
1. Desktop: User selects moves/sequences/scenarios to fill gaps
2. Mobile: User collects data through guided prompts
3. Desktop: Live updates appear as user enters phone data
4. User can review, adjust, and save batch of changes
5. Option to immediately publish new data to community or keep private

**Why this matters:**
- **Lab partner paradigm**: Phone in one hand, controller in other; quick data entry without desktop
- **Commute documentation**: Test combos in training mode, record results on phone during break
- **Community momentum**: Gap identification accelerates data collection (don't guess what's missing)
- **Dual-screen efficiency**: Desktop shows what needs testing, phone captures results
- **No server dependency**: Local sync keeps it fast and offline-capable

---

## Viability simulation rules

- **Deterministic simulation** occurs when sufficient frame data and state values are known:
  - Frame data present: startup, active, recovery durations are exact values
  - Opponent stun (hitstun/blockstun) is known
  - Spacing information (hitbox position, range) is defined
  - Player and opponent positions in scenario are specified
  - Result: Combo can be verified or refuted deterministically (timing and spacing both check)
  
- **Exploratory simulation** occurs when data is incomplete:
  - Frame data uses relative positioning (DataValue.relative) instead of exact
  - Stun values are missing or approximate
  - Spacing is estimated from move descriptions
  - Result: Suggestions surface as "likely works if..." with reasoning shown to users
  
- **Known state values enable determinism**: If a game's state rules (invulnerability windows, hitstun modifiers, frame advantage rules) are documented, simulations using those states produce reproducible results.
- Suggestions and move breakdowns clearly surface data completeness: "Verified with exact frame data" vs "Estimated from relative positioning."

---

## Local file sync and crash safety

- Local guide file is the long-term source of truth.
- After import, app keeps an in-memory working copy plus a browser-local recovery snapshot.
- Every combo/game/character/move update writes an incremental recovery snapshot before mutating in-memory state.
- On restart after crash, user is prompted to recover unsaved changes from the snapshot.
- Recovery restores into the same guide draft.
- Export flow writes a fresh full guide file and records an export timestamp so the app can warn when in-memory changes are newer than disk.
- UI always shows save status: `synced to file` vs `unsaved local changes`.
- Guides track which game version they were last validated against via `meta.validatedVersion`.
- When a newer game version exists, the UI flags "Last tested on older version" and users can choose to re-test or archive the guide.
- Community views default to latest guide version and clearly display guide version labels.

## Local file format (locked)

```text
my-guide.tfn
├── header
├── guide
├── entities
│   ├── game
│   ├── stages
│   ├── stageZones
│   ├── characters
│   ├── teams
│   ├── moves
│   ├── sequences
│   ├── projectiles
│   └── matchups
└── checksum
```

- `.tfn` is the only user-facing save/load format.
- The `guide` section includes a required `schemaVersion` field for import/export compatibility.
- Imports support forward migration only: older guide files are migrated step-by-step to the current schema.
- Guides from a newer unknown schema version are rejected with a clear compatibility message rather than opened best-effort.
- Tags, assists, and similar team mechanics are modeled as moves with state/resource constraints rather than special file-layout cases.
- The complete format and checksum rules are defined in `05-tfn-format.md`.

---

## Community query/read policy (v1)

- **Curated read model**:
  - Default community queries return published moves/sequences grouped by `semanticKey` with variant counts.
  - Example: "Ryu Jab — 5 people published this move; showing most common variant (3 matches), alternate variants (2 others)"
  - Users can always inspect contradictory variants and switch which variant they pull into private guides.
  - Raw published values are preserved; aggregate views show variants with fingerprint counts instead of averaging.

- **Multi-character axis comparison**:
  - UI allows users to view moves from multiple characters on the same comparison axis (e.g., startup frames across Ryu, Chun-Li, Cammy jabs).
  - Each character's move can be positioned independently via DataValue (exact value, relative position on discovered bounds, or notes).
  - Users can adjust their own positioning without affecting other characters' data.
  - Bounds are discovered across community submissions; as more data arrives, relative positioning rescales automatically.

- **Variant navigation**:
  - Show fingerprint counts: "3 people agree on this frame data, 2 disagree (variant B)"
  - Users inspect specific variants and see who published them (contributor count, not confidence scores).
  - Variants serve as exploration points for disagreement discovery, not conflict resolution.

- **Deep history exploration**:
  - Version history is explicit (opt-in query path): users can inspect all published variants over time.
  - Not shown by default to keep community views uncluttered and focused on current convergence.
