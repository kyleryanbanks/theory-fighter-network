import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import {
  assertSupportedSchemaVersion,
  type GuideJson,
  type LocalGuideEntities,
  type LocalGuide,
} from '../guide';
import { hydrateEntityDates } from '../guide/archive/index';

const GUIDE_FILE = 'guide.json';

const ENTITY_FILES: Record<keyof LocalGuideEntities, string> = {
  game: 'game.json',
  stages: 'stages.json',
  stageZones: 'stage-zones.json',
  characters: 'characters.json',
  teams: 'teams.json',
  moves: 'moves.json',
  sequences: 'sequences.json',
  projectiles: 'projectiles.json',
  matchups: 'matchups.json',
};

export async function saveGuideToDirectory(
  directoryPath: string,
  guide: LocalGuide
): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
  assertSupportedSchemaVersion(guide.guide.schemaVersion);

  await writeJsonAtomic(
    join(directoryPath, GUIDE_FILE),
    guide.guide
  );

  const entries = Object.entries(ENTITY_FILES) as Array<[
    keyof LocalGuideEntities,
    string,
  ]>;

  for (const [entityKey, fileName] of entries) {
    await writeJsonAtomic(
      join(directoryPath, fileName),
      guide.entities[entityKey]
    );
  }
}

export async function loadGuideFromDirectory(
  directoryPath: string
): Promise<LocalGuide> {
  const guide = (await readJson(
    join(directoryPath, GUIDE_FILE)
  )) as GuideJson;

  assertSupportedSchemaVersion(guide.schemaVersion);

  const entities = {
    game: await readJson(join(directoryPath, ENTITY_FILES.game)),
    stages: await readJsonArray(
      join(directoryPath, ENTITY_FILES.stages)
    ),
    stageZones: await readJsonArray(
      join(directoryPath, ENTITY_FILES.stageZones)
    ),
    characters: await readJsonArray(
      join(directoryPath, ENTITY_FILES.characters)
    ),
    teams: await readJsonArray(
      join(directoryPath, ENTITY_FILES.teams)
    ),
    moves: await readJsonArray(
      join(directoryPath, ENTITY_FILES.moves)
    ),
    sequences: await readJsonArray(
      join(directoryPath, ENTITY_FILES.sequences)
    ),
    projectiles: await readJsonArray(
      join(directoryPath, ENTITY_FILES.projectiles)
    ),
    matchups: await readJsonArray(
      join(directoryPath, ENTITY_FILES.matchups)
    ),
  } as LocalGuideEntities;

  return {
    guide,
    entities: hydrateEntityDates(entities),
  };
}

async function readJson(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  const value = await readJson(filePath);
  if (!Array.isArray(value)) {
    throw new Error(`Expected array data in ${filePath}.`);
  }
  return value;
}

async function writeJsonAtomic(
  filePath: string,
  value: unknown
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  const serialized = JSON.stringify(value, null, 2);
  await writeFile(tempPath, serialized, 'utf8');
  await rename(tempPath, filePath);
}