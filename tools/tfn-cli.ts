#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  buildTfnArchive,
  parseTfnArchive,
  loadWorkspaceFromDirectory,
  saveWorkspaceToDirectory,
} from '@theory-fighter-network/app/data';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'export-folder': {
      const [workspaceDir, archiveFile] = args;
      requireArgs(command, [workspaceDir, archiveFile]);

      const workspace = await loadWorkspaceFromDirectory(
        resolve(workspaceDir)
      );
      const archive = buildTfnArchive(workspace);

      await writeFile(resolve(archiveFile), archive, 'utf8');
      log(
        `Exported ${workspace.guide.gameKey} to ${resolve(archiveFile)}`
      );
      return;
    }

    case 'import-archive': {
      const [archiveFile, workspaceDir] = args;
      requireArgs(command, [archiveFile, workspaceDir]);

      const rawArchive = await readFile(resolve(archiveFile), 'utf8');
      const archive = parseTfnArchive(rawArchive);

      await saveWorkspaceToDirectory(resolve(workspaceDir), {
        guide: archive.guide,
        entities: archive.entities,
      });

      log(
        `Imported ${archive.guide.gameKey} to ${resolve(workspaceDir)}`
      );
      return;
    }

    case 'validate-archive': {
      const [archiveFile] = args;
      requireArgs(command, [archiveFile]);

      const rawArchive = await readFile(resolve(archiveFile), 'utf8');
      const archive = parseTfnArchive(rawArchive);
      log(
        `Archive OK: gameKey=${archive.guide.gameKey}, schemaVersion=${archive.header.schemaVersion}`
      );
      return;
    }

    default:
      printUsage();
      process.exitCode = command ? 1 : 0;
  }
}

function requireArgs(
  command: string,
  values: Array<string | undefined>
): void {
  if (values.some((value) => !value)) {
    throw new Error(`Missing arguments for command: ${command}`);
  }
}

function printUsage(): void {
  log('TFN CLI');
  log('Usage:');
  log('  tfn export-folder <workspaceDir> <archiveFile>');
  log('  tfn import-archive <archiveFile> <workspaceDir>');
  log('  tfn validate-archive <archiveFile>');
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown CLI error.';
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});