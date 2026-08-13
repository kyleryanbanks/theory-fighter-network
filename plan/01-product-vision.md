# Product Vision & Domain Clarifications

## Product Direction

Theory Fighter Network is:

- **Angular web app** for collaborative fighting-game research and documentation.
- **Private work is local-first and file-based** by default. Users own their guides as `.tfn` workspace archives on their own devices.
- **Community/cloud is opt-in via Firestore** to control free-tier cost. Users choose to publish or merge community data when beneficial.
- **Progressive enhancement stays central**: use observed/comparative knowledge first, replace with measured values over time. Incomplete data is valuable data.
- **Community merge flow is one-way**: users pull community data into their own private guides. They never push to shared collections—convergence happens through independent submission and alignment.
- **Automated exploration and suggestions are a first-level requirement**: schema and features must preserve programmatic analysis capability. The app suggests unexplored combos, range bands, transitions, and blockstrings based on game mechanics.

## Domain Clarifications (Locked)

These 16 items represent foundational decisions about how fighting game mechanics are modeled. They prevent schema churn during implementation.

### Frame Data & Knowledge Progression

1. **All games have exact frame behavior in reality; some games just do not publish it.**
   - Every game has deterministic timing. If frame data is missing, it's unknown, not nonexistent.
   - Schema tracks knowledge status: `observed` → `measured` → `verified`.

2. **Relative/comparative values are a temporary knowledge state until exact values are measured.**
   - "Move A is faster than Move B" is valid knowledge even without frame counts.
   - Users enter comparative relationships early; exact values replace them later.
   - Both can coexist: comparative constraints guide exploration, exact values verify.
   - Comparative slider inputs are normalized to a shared 0-100 scale so community alignment can tolerate small subjective differences.

### Combo Modeling

3. **`onBlock` and `onHit` outcomes must be modeled separately, including meaty timing effects.**
   - Same move has different outcomes depending on opponent state (standing, crouching, wall-splat, etc.).
   - `onBlock` includes frame advantage/disadvantage and potential special interactions.
   - `onHit` tracks hitstun value and scaling effects. Meaty timing can grant bonus frame advantage.
   - FrameOutcomeWindow captures base, min, max, and meatyAdvantageGain separately.

4. **Combo base shape is an ordered move array.**
   - A combo is fundamentally: [Move1, Move2, Move3, …]
   - Frame delays between steps are optional metadata, not required.
   - State-dependent move outputs (same trigger with different opponent states) are separate move records, not modifiers.

5. **Optional exact frame delays between combo steps can be attached when known.**
   - Delays capture timing windows: "2-6 frames of delay before next input allowed" or "no delay, links immediately".
   - Useful for explaining why a combo works or fails under specific conditions.

6. **Combo difficulty is computed on combo create/update, not manually set.**
   - System calculates combo difficulty from motion types, hitstun scaling, and move properties.
   - Difficulty is deterministic and auditable, not subjective or crowd-sourced.

### Team & Scope Modeling

7. **Team games must track character composition and order, but a valid combo can use only a subset of the team.**
   - Marvel Tokon and MvC all play teams of 3. A combo may be 1-character or 2-character within that team.
   - Combos are scoped to teams, but apply to subsets of the team roster.
   - Allow for per-slot selections: assist choices, loadouts, mechanics available only on certain team compositions.

8. **Core records are context-scoped, and stage data is modeled as its own entity with inheritance.**
   - Universal, character, and team contexts determine where moves/combos are defined and applied.
   - Stages are not embedded in the game document; they are separate records linked to the game.
   - Stage zones/elements can inherit universal game defaults and apply stage-local overrides.
   - Context determines which records are available in a given scenario.

### Community & Convergence

9. **Community exact data is represented by contributor-aligned variants, not confidence labels or voting.**
   - No upvotes, downvotes, or reputation systems.
   - Community views show how many distinct users submitted the same value set for a record.
   - Contradictory variants remain visible and are explicitly marked so users can reconcile their guides.
   - Convergence happens per game + version pair. Stale data (after a patch) is tracked separately.

10. **Context-dependent outputs from the same trigger family are stored as distinct move records per state variant, not one move with modifiers.**
    - Example: Loki in Marvel Tokon has tap L vs. hold L. These are two separate MoveDocuments linked by `actionFamilyKey`.
    - Same trigger (L button) produces different moves depending on player state or input timing.
    - Avoids feature creep: one move record = one outcome. Cleaner for analysis, suggestions, and combos.

### Game State & Route Viability

11. **Game state modeling must support availability constraints, follow-up-only moves, and cancel/follow-up chains.**
    - Moves have availability tags: required player state (neutral, active, airborne, blockstun, hitstun) plus game-specific states.
    - Moves can be `followUpOnlyFromMoveIds` (only after move X) or `cancelFromMoveIds` (cancellable from move X).
    - This prevents invalid transitions and enables combo validation.

12. **The app must model route viability by range band, state, timing, and post-move positioning, with deterministic outcome guarantees.**
    - Moves can change either the attacker's position or the opponent's position.
    - Same move may connect or whiff depending on resulting distance after those positional changes.
    - Suggestions use move ranges plus both characters' resulting positions to identify viable follow-ups.
    - **Determinism guarantee**: Semantic keys are immutable to gameplay values and changes in metadata. Resolving a move by `moveSemanticKey` + consistent `gameStateContext` always produces the same outcome. This enables reproducible combo feasibility checks, scenario simulation, and peer-to-peer online multiplayer.

### Scaling & Balance

13. **The app must model combo/hitstun scaling rules at game level and move-level interactions with those rules to analyze realistic combo limits.**
    - Games have global scaling rules: "hitstun decreases 1 frame per hit" or "combo damage capped at 30%".
    - Individual moves can have custom interactions: "prevents scaling decay", "grants bonus hitstun", "resets scaling counter".
    - System computes maximum combo damage and hitstun length based on scaling rules + move interactions.

### Versioning & Patches

14. **Guides default to targeting the latest known game version, but users can create version-locked guides for older patches when needed.**
    - When a game updates, guides can stay on `'latest'` (moving alias) or lock to a specific version (e.g., `'1.2.0'`).
    - `'latest'` automatically reflects new patches; locked guides remain stable.

15. **Community convergence only occurs between guides for the same game and exact same target version.**
    - Guides for MvC2 1.0 do NOT merge with MvC2 2.0 guides, even if both target the same game.
    - Convergence key is `${gameCanonicalKey}@${resolvedGameVersion}`.

### Knowledge Layers

16. **Community exact facts and exploratory/comparative research must remain separate knowledge layers.**
    - Exact data: frame counts, confirmed mechanics, verified by frame data.
    - Exploratory data: comparative constraints, slider estimates, player theories (tagged `private-exploratory` or `shared-exploratory`).
    - UI separates these layers. Exploratory data never auto-promotes to exact; users must explicitly verify.

---

## How These Clarifications Guide Implementation

- **Schema design** tracks knowledge progression (`observed | measured | verified`) and keeps exploratory data separate from exact facts.
- **Inheritance** remains central: universal records provide defaults, scoped records override where needed.
- **Validation and suggestions** rely on state constraints, ranges, and positional outcomes to reject invalid routes and suggest unexplored viable ones.
- **Community data** is presented as aligned and contradictory variants with contributor counts, scoped by game + version.
- **Local-first operation** with version-awareness and crash recovery protects user-owned research.
