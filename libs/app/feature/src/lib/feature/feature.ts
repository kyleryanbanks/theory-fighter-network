import { Component } from '@angular/core';
import { inject } from '@angular/core';
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

  activeDirectoryHandle: FileSystemDirectoryHandle | null = null;
  async openDirectory(): Promise<void> {
    const directoryHandle = await this.pickDirectoryHandle();

    if (!directoryHandle) {
      return;
    }

    this.activeDirectoryHandle = directoryHandle;
    this.facade.setDirectoryHandle(directoryHandle);
    this.facade.reloadDirectoryWorkspace();
  }

  async saveWorkspace(): Promise<void> {
    const directoryHandle =
      this.activeDirectoryHandle ??
      (await this.pickDirectoryHandle());

    if (!directoryHandle) {
      return;
    }

    this.activeDirectoryHandle = directoryHandle;

    await this.facade.saveWorkspaceToDirectory({
      directoryHandle,
    });
  }

  async onImportArchiveSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const archiveFile = input?.files?.[0];

    if (!archiveFile) {
      return;
    }

    await this.facade.importArchive(archiveFile);
    input.value = '';
  }

  async exportArchive(): Promise<void> {
    const result = await this.facade.exportArchive({
      fileName: 'tfn-guide-export.tfn',
    });

    if (result.status !== 'success') {
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

  private async pickDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    const picker = (globalThis as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;

    if (!picker) {
      return null;
    }

    return picker();
  }
}
