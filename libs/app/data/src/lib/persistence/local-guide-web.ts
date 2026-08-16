import {
  buildTfnArchive,
  parseTfnArchive,
} from '../guide/archive/index';
import type { LocalGuide } from '../guide/guide.types';

export function buildArchiveBlob(guide: LocalGuide): Blob {
  const archive = buildTfnArchive(guide);
  return new Blob([archive], { type: 'application/json' });
}

export async function parseArchiveBlob(
  archiveBlob: Blob
): Promise<LocalGuide> {
  const rawArchive = await readBlobText(archiveBlob);
  const archive = parseTfnArchive(rawArchive);

  return {
    guide: archive.guide,
    entities: archive.entities,
  };
}

export function buildArchiveFile(
  guide: LocalGuide,
  fileName = 'guide.tfn'
): File {
  const archiveBlob = buildArchiveBlob(guide);
  return new File([archiveBlob], fileName, {
    type: 'application/json',
  });
}

export async function parseArchiveFile(
  archiveFile: File
): Promise<LocalGuide> {
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