# `.tfn` Archive Format

## Purpose

A `.tfn` file is the portable, single-file representation of one Theory Fighter Network Guide. A Guide contains exactly one Game and its related entities.

The format is deterministic JSON so archives can be checksummed, validated, migrated, shared, and inspected without proprietary tooling.

## Current Version

- Archive format: `1`
- Guide schema: `1`
- Encoding: UTF-8 JSON
- MIME type: `application/json`

Archive format versions describe the envelope and serialization rules. Guide schema versions describe the stored Guide and entity data. They advance independently.

## Format 1 Envelope

```json
{
  "header": {
    "format": "TFN_ARCHIVE",
    "formatVersion": 1,
    "schemaVersion": 1,
    "createdAt": "2026-08-15T12:00:00.000Z",
    "entityOrder": [
      "game",
      "stages",
      "stageZones",
      "characters",
      "teams",
      "moves",
      "sequences",
      "projectiles",
      "matchups"
    ]
  },
  "guide": {},
  "entities": {},
  "checksum": "..."
}
```

All persisted `Date` values are ISO 8601 strings. Loading hydrates entity metadata timestamps back into `Date` instances.

## Canonical Entity Order

Format 1 requires this exact order:

1. `game`
2. `stages`
3. `stageZones`
4. `characters`
5. `teams`
6. `moves`
7. `sequences`
8. `projectiles`
9. `matchups`

`game` is one document. Every other entry is an array, including an empty array when no entities exist.

## Deterministic Serialization

Object keys are sorted recursively before serialization. Array order is preserved because it may carry domain meaning. Dates are converted to ISO strings before key sorting.

The checksum covers exactly:

```ts
{
  header,
  guide,
  entities,
}
```

The `checksum` property does not checksum itself.

## Load Sequence

Readers must process archives in this order:

1. Parse JSON.
2. Validate the archive marker and required sections.
3. Reject a format newer than the client with upgrade guidance.
4. Verify the checksum against the archive as received.
5. Apply registered format migrations sequentially.
6. Validate the current canonical entity order.
7. Validate the Guide schema version.
8. Hydrate entity metadata dates.

Checksum verification occurs before migration so migrations never legitimize corrupted input.

## Migration Policy

Migrations are forward-only and sequential. A migration registered for version `N` must produce version `N + 1`.

The current registry supports:

- Format `0` to `1`: adds the canonical `entityOrder` header field and recomputes the migrated envelope checksum.

If no migration is registered for an older version, loading fails without modifying the source archive. If an archive or Guide schema is newer than the client, loading fails with instructions to upgrade the application.

## Browser Export

The web application prompts the user for a destination and filename with the browser save-file picker when that API is available. TFN then builds and validates the complete archive in memory before writing the `File` to the selected handle.

Browsers without the save-file picker use a standard download. In that fallback, browser download settings control placement and replacement behavior.

## Compatibility Rules

- Writers always emit the current format and Guide schema.
- Readers may accept older formats only through registered migrations.
- Unknown envelope properties may be preserved by future migrations but must not change checksum interpretation for an existing format.
- Existing format semantics are immutable. Any envelope or checksum change requires a new `formatVersion`.
- Any persisted domain shape change requires a new Guide `schemaVersion` and registered schema migration before release.
