import {
  buildTfnArchive,
  parseTfnArchive,
} from '../guide/archive/index';
import type { LocalGuideWorkspace } from '../guide/guide.types';

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