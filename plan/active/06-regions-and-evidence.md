# Game-Agnostic Regions and Evidence

Build region authoring around a generic, identifiable region construct whose meaning comes from user-defined game state, not fixed TFN hit/hurt/throw rules. Keep character baseline and move-phase ownership, support still-image overlays with explicit optional calibration, and keep media bytes outside the core `.tfn` JSON. The first slice is 2D region/evidence authoring; per-frame tracking, recording, and sequence simulation remain later phases.

## Steps

1. **Domain model and compatibility:** Extend `Region` from geometry-only data to a stable region instance with a discriminator/ID, explicit coordinate-space metadata, optional display metadata, and references/conditions based on the guide's user-defined `StateModel`. Do not hard-code a closed list of collision/hit/hurt/throw semantics. Keep character neutral geometry owned by `CharacterDocument` and action geometry owned by move phase stages. Start with phase-stage geometry, not frame-by-frame tracks. Add a Guide schema migration that preserves existing named region arrays and their labels as editable legacy data; keep this distinct from `.tfn` archive-format migration.
2. **Evidence and calibration model:** Add a media manifest with stable asset IDs, source dimensions/type, entity and region references, timestamps/provenance, and optional calibration metadata. Store image annotations in normalized source-image coordinates. Preserve calibration as a separate transform and confidence/status: allow known game-space references, manual screen-bound selection/rectification for monitor photos, and baseline-plus-height normalization for character-only photos. Treat uncalibrated geometry as visual evidence, not comparable world-space data. Keep image/video binaries in a dedicated IndexedDB media store, not JSON guide snapshots.
3. **Region/evidence authoring UI:** Add a reusable 2D overlay editor in the shared feature layer and integrate it into the character editor and move-detail phase editor. Support import of still images (including mobile camera/file-picker input), draw/select/move/resize/delete regions, attach user-defined state references, edit numeric geometry, choose calibration anchors, and show uncertainty/source context. Keep the sequence editor out of this slice.
4. **Persistence and portability:** Add facade mutations for region/state/evidence changes that update only the owning entity or workspace manifest and mark it unsaved. Export/import a research bundle or sidecar containing the manifest and binaries with checksums and entity references; retain graceful missing-asset behavior. Preserve existing move inheritance resolution. Update archive-format documentation if checksum coverage is changed or clarified.
5. **Follow-on: animation and capture:** Add per-frame/keyframe region samples associated with video frames only after the phase-level model and editor are validated. Integrate the existing roadmap's browser screen capture and `MediaRecorder` workflow as a separate phase; keep source video intact and use timestamp/trim metadata. Mobile direct camera capture can build on image import and be evaluated separately.
6. **Follow-on: user-configurable simulation:** Design a sequence timeline and simulation runtime that consumes calibrated geometry, frame samples, and user-authored state/rule definitions. Do not assume fighter-specific collision, throw, knockback, or movement semantics; provide configurable interactions and outcomes, with any unsupported/unknown rule surfaced as such. This is explicitly outside the first region/evidence implementation slice.

## Relevant Files

- `libs/tfn/app-shell/data/src/lib/models/region.ts` — geometry shapes and current region model.
- `libs/tfn/app-shell/data/src/lib/models/character.ts` and `move.ts` — neutral character ownership, phase-stage region ownership, and move outcome/state patterns.
- `libs/tfn/app-shell/data/src/lib/models/state.ts` — user-defined state categories, preconditions, and patches to reference rather than invent fixed game rules.
- `libs/tfn/app-shell/data/src/lib/models/sequence.ts` — current ordered steps; future simulation timeline boundary.
- `libs/tfn/app-shell/data/src/lib/guide/guide.types.ts`, `guide.constants.ts`, and `guide.mutations.ts` — workspace manifest and Guide schema-version support (currently only schema v1 is registered).
- `libs/tfn/app-shell/data/src/lib/guide/archive/archive.service.ts` and `archive.migrations.ts` — checksummed `.tfn` import/export and archive-format migrations; Guide schema migration is a distinct concern.
- `libs/tfn/app-shell/data/src/lib/facades/local-guide.facade.store.ts` — immutable mutations and unsaved tracking.
- `libs/tfn/shared/feature` — home for a reusable region/evidence editor if it follows existing shared-feature conventions.
- `libs/tfn/character/feature/src/lib/character-editor/character-editor.ts` and `character-editor.html` — character authoring integration.
- `libs/tfn/move/feature/src/lib/move-detail/move-detail.ts` and `move-detail.html` — phase-stage authoring integration.
- `plan/active/02-data-model.md`, `04-implementation.md`, and `05-tfn-format.md` — align existing region concepts, Phase 3.9 media capture, and archive/checksum contract.

## Verification

1. Add data tests for region identity, 2D geometry, state references, coordinate-space/calibration metadata, and migration from existing v1 region arrays without data loss.
2. Test `.tfn` import/export round trips for migrated guides and research-bundle manifest/binary references, including missing assets and checksum failures.
3. Test facade updates mark the correct owner/workspace unsaved and do not break `resolveEffectiveMove` inheritance.
4. Test editor interactions for region creation/edit/removal, state association, image overlay persistence, and calibrated versus uncalibrated display.
5. Run Nx tests and lint for app-shell data, shared feature, character feature, and move feature; manually verify screenshot, monitor-photo, and character-only calibration flows at desktop and mobile widths.
6. Confirm core `.tfn` JSON contains metadata/references only, not image or video bytes; validate archive compatibility with existing schema-v1 guides.

## Decisions

- Region meaning is user-defined through game state/rules; TFN must not bake in a fighter-specific taxonomy or interaction rules. Existing legacy labels should be preserved and editable during migration.
- Initial geometry is 2D and phase-stage-level. 3D regions, per-frame animation tracks, browser recording, and simulation runtime are deferred follow-ons.
- Image resolution alone does not establish game-space scale. Store source-image coordinates and optional calibration separately; unknown calibration remains explicitly unknown.
- Still-image import/overlay is the first evidence workflow. Screen/video capture is already planned in Phase 3.9 and should follow separately; binaries belong in IndexedDB and a portable research bundle/sidecar, not the core JSON archive.
- Sequence knockback/spacing simulation is a later architecture phase, enabled by calibrated geometry, frame samples, and user-authored rules/state. No empirical or physics model should be silently assumed in the first slice.