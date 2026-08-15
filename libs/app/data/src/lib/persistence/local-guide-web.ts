import {
  buildTfnArchive,
  parseTfnArchive,
} from '../guide/archive/index';
import type {
  type LocalGuideWorkspace,
} from '../guide/guide.types';

const GUIDE_FILE = 'guide.json';

const ENTITY_FILES: Record<keyof LocalGuideWorkspace['entities'], string> = {
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

export async function saveWorkspaceToDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle,
  workspace: LocalGuideWorkspace
): Promise<void> {
  await writeJsonFile(directoryHandle, GUIDE_FILE, workspace.guide);

  const entries = Object.entries(ENTITY_FILES) as Array<[
    keyof LocalGuideWorkspace['entities'],
    string,
  ]>;

  for (const [entityKey, fileName] of entries) {
    await writeJsonFile(
      directoryHandle,
      fileName,
      workspace.entities[entityKey]
    );
  }
}

export async function loadWorkspaceFromDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle
): Promise<LocalGuideWorkspace> {
  const guide = await readJsonFile(directoryHandle, GUIDE_FILE);

  const entities = {
    game: await readJsonFile(directoryHandle, ENTITY_FILES.game),
    stages: await readJsonFile(directoryHandle, ENTITY_FILES.stages),
    stageZones: await readJsonFile(directoryHandle, ENTITY_FILES.stageZones),
    characters: await readJsonFile(directoryHandle, ENTITY_FILES.characters),
    teams: await readJsonFile(directoryHandle, ENTITY_FILES.teams),
    moves: await readJsonFile(directoryHandle, ENTITY_FILES.moves),
    sequences: await readJsonFile(directoryHandle, ENTITY_FILES.sequences),
    projectiles: await readJsonFile(directoryHandle, ENTITY_FILES.projectiles),
    matchups: await readJsonFile(directoryHandle, ENTITY_FILES.matchups),
  };

  return {
    guide,
    entities,
  } as LocalGuideWorkspace;
}

export function buildArchiveBlob(workspace: LocalGuideWorkspace): Blob {
  const archive = buildTfnArchive(workspace);
  return new Blob([archive], { type: 'application/json' });
}

export async function parseArchiveBlob(
  archiveBlob: Blob
): Promise<LocalGuideWorkspace> {
  const rawArchive = await readBlobText(archiveBlob);
  const archive = parseTfnArchive(rawArchive);

  return {
    guide: archive.guide,
    entities: archive.entities,
  };
}

export function buildArchiveFile(
  workspace: LocalGuideWorkspace,
  fileName = 'guide.tfn'
): File {
  const archiveBlob = buildArchiveBlob(workspace);
  return new File([archiveBlob], fileName, {
    type: 'application/json',
  });
}

export async function parseArchiveFile(
  archiveFile: File
): Promise<LocalGuideWorkspace> {
  return parseArchiveBlob(archiveFile);
}

async function writeJsonFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  value: unknown
): Promise<void> {
  const fileHandle = await directoryHandle.getFileHandle(fileName, {
    create: true,
  });
  const writable = await fileHandle.createWritable();

  try {
    await writable.write(JSON.stringify(value, null, 2));
  } finally {
    await writable.close();
  }
}

async function readJsonFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<unknown> {
  const fileHandle = await directoryHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const raw = await file.text();
  return JSON.parse(raw);
}

async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }

  if (typeof blob.arrayBuffer === 'function') {
    const bytes = await blob.arrayBuffer();
    return new TextDecoder().decode(bytes);
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('Failed to read blob content.'));
    };
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.readAsText(blob);
  });
}