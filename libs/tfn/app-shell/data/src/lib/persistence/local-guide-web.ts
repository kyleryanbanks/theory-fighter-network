import { buildTfnArchive, parseTfnArchive } from '../guide/archive/index';
import type { LocalGuide, TfnWorkspace } from '../guide/guide.types';

export function buildArchiveBlob(
  guide: LocalGuide,
  workspace: TfnWorkspace,
): Blob {
  const archive = buildTfnArchive({
    guide: guide.guide,
    entities: guide.entities,
    workspace,
  });
  return new Blob([archive], { type: 'application/json' });
}

export async function parseArchiveBlob(
  archiveBlob: Blob,
): Promise<{ guide: LocalGuide; workspace: TfnWorkspace }> {
  const rawArchive = await readBlobText(archiveBlob);
  const archive = parseTfnArchive(rawArchive);

  return {
    guide: {
      guide: archive.guide,
      entities: archive.entities,
    },
    workspace: archive.workspace,
  };
}

export function buildArchiveFile(
  guide: LocalGuide,
  workspace: TfnWorkspace,
  fileName = 'guide.tfn',
): File {
  const archiveBlob = buildArchiveBlob(guide, workspace);
  return new File([archiveBlob], fileName, {
    type: 'application/json',
  });
}

export async function parseArchiveFile(
  archiveFile: File,
): Promise<{ guide: LocalGuide; workspace: TfnWorkspace }> {
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
