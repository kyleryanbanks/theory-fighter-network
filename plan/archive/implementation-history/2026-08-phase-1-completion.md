# Phase 1 Completion History — August 2026

This record preserves the completed implementation narrative removed from the active roadmap. The active roadmap keeps only current status, open work, and future phases.

## Phase 1 Status

Phase 1 core entity hierarchies reached substantial completion on 2026-08-18. Guide, Game, Stage, Character, Move, Sequence, Team, Matchup, Scenario, and Response CRUD workflows were implemented. The four Phase 1.7 foundational gaps were resolved: sequence step frame delays, move outcome effects and cancel groups, move preconditions, and game state management.

Phase 2.1 comparison pre-work also completed. Move comparison supports startup, active, and recovery phase selection through generic DataValue extraction and provides the initial comparison-mode controls.

## Supporting Implementation Work

- Created Nx `data`, `feature`, and `ui` libraries and replaced the generated application shell with the feature shell.
- Configured GitHub Pages deployment with a static Angular build, repository base path, SPA fallback, and deployment from `main`.
- Added `LocalGuideFacadeStore` for in-memory Guide lifecycle, creation, update, `.tfn` import/export, close, and empty/active shell transitions.
- Added colocated `createX` factories for persisted models and nested model types, with tested defaults and overrides.
- Separated Guide persistence from model definitions through the `guide/` domain and nested `guide/archive/` module, including checksum and serialization coverage.
- Added recent Guide metadata, IndexedDB file handles, reopen behavior, and refresh restoration behind the data library persistence boundary.
- Replaced the router-less shell with Angular Router routes for hierarchy sections and entity detail pages. Move and Sequence retain specialized detail components.
- Added and refined the reusable `GuideNav`, including compact/expanded modes, persistence, responsive behavior, sticky positioning, and stable icon layout.
- Standardized full-height routed editor layouts and fixed square Move-picker tiles.
- Added the reusable native-details-based expansion panel, projected panel actions, RouterLink-based `tfn-link`, and `EntityDetailShell`.
- Added shared metadata rendering and generic entity notes with feature-owned facade integration, address actions, and parent-owned routing decisions.
- Added the reusable destructive `DeleteButton` across notes, entities, zones, overrides, Matchups, and Scenarios.
- Added `DataValueEditor`, ordered Move phase CRUD, inherited Move editing, and outcome hit-stop/stun editors.
- Added the DOM-based `ComparisonAxis` with pointer and keyboard movement and persisted relative DataValues.

## Completed Component and Model Details

### TileGrid

The selection-mode focus ring was corrected so the selected yellow border is visible on the first click. Three tests cover the selected class, badge numbering, and disabled remaining tiles. The component then adopted a unified `TileUpdate { tile, selection }` output instead of the previous `Tile | Tile[]` union. Team, Cancel Groups, Matchup, and Move Preconditions consumers were updated to use the new contract.

### Cancel Groups

`CancelGroupsEditorComponent` was implemented for universal cancel-group authoring. It supports parent-group and phase-move modes, group membership, sparse true/false overrides, explicit-save output, nested expansion panels, and active move-list precedence. Feature tests cover override/group interaction and save gating.

### Agnostic State Model

`StateModel` changed from predefined categories to `Record<string, StateCollection>`. Suggested categories remain a UI-only onboarding constant, while new guides start with an empty model. Data-model examples, projectile documentation, game state execution examples, factories, and tests were updated accordingly.

### State Authoring

The state authoring pipeline was implemented across game, character, and move surfaces. It includes `StateCreateDialogComponent`, `GameStateManagerComponent`, character-specific state editing, `StatePatchEditorComponent`, move outcome state patches, and facade mutations for creating, deleting, and updating state data.

### Move Preconditions

`MovePreconditionEditorComponent` was added for player and opponent state conditions, boolean and numeric operators, follow-up and cancel-from move selections, and inline game/character state creation. The facade replaces the prior string-array shape with structured `MovePreconditions` data.

## Historical Deferred Work

The following items were intentionally left open for later phases:

- Team member reordering and assist/loadout scoping, pending schema design.
- Scenario-to-response tree navigation, parent-link cycle prevention, and complete note-to-scenario/response workflows.
- Additional comparison axes and range/damage analysis beyond the initial Move comparison surface.

For current ownership and priority, use [the active implementation roadmap](../../active/04-implementation.md), not this historical record.
