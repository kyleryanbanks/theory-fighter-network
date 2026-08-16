import { Component, inject, signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { Ui } from '@theory-fighter-network/ui';
import { GameRoot } from '../game-root/game-root';

@Component({
  selector: 'tfn-feature',
  imports: [GameRoot, Ui],
  templateUrl: './feature.html',
  styleUrl: './feature.css',
})
export class Feature {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly isCreatingGuide = signal(false);

  createGuide(): void {
    this.isCreatingGuide.set(true);
  }

  cancelCreateGuide(): void {
    this.isCreatingGuide.set(false);
  }

  closeGuide(): void {
    this.facade.clearActiveWorkspace();
    this.isCreatingGuide.set(false);
  }

  async onTfnSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const archiveFile = input?.files?.[0];

    if (!archiveFile) {
      return;
    }

    await this.facade.importArchive(archiveFile);
    input.value = '';
  }

  async saveTfn(): Promise<void> {
    const saveFilePicker = (globalThis as SaveFilePickerGlobal)
      .showSaveFilePicker;
    let fileHandle: SaveFileHandle | undefined;

    if (saveFilePicker) {
      try {
        fileHandle = await saveFilePicker({
          suggestedName: 'tfn-guide-export.tfn',
          types: [
            {
              description: 'Theory Fighter Network Guide',
              accept: { 'application/json': ['.tfn'] },
            },
          ],
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        throw error;
      }
    }

    const result = await this.facade.exportArchive({
      fileName: 'tfn-guide-export.tfn',
    });

    if (result.status !== 'success') {
      return;
    }

    if (fileHandle) {
      const writable = await fileHandle.createWritable();

      try {
        await writable.write(result.value);
      } finally {
        await writable.close();
      }

      return;
    }

    if (
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const objectUrl = URL.createObjectURL(result.value);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = result.value.name;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
}

interface SaveFilePickerGlobal {
  showSaveFilePicker?: (
    options: SaveFilePickerOptions
  ) => Promise<SaveFileHandle>;
}

interface SaveFilePickerOptions {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface SaveFileHandle {
  createWritable(): Promise<SaveFileWritable>;
}

interface SaveFileWritable {
  write(data: File): Promise<void>;
  close(): Promise<void>;
}
