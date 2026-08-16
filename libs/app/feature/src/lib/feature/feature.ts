import {
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  LocalGuideFacadeStore,
  normalizeGameName,
  RecentGuideUnavailableError,
  RecentGuidePermissionError,
  RecentGuidesService,
  type RecentFileHandle,
  type RecentGuide,
} from '@theory-fighter-network/data';
import { Ui } from '@theory-fighter-network/ui';
import { GameRoot } from '../game-root/game-root';

@Component({
  selector: 'tfn-feature',
  imports: [GameRoot, Ui],
  templateUrl: './feature.html',
  styleUrl: './feature.css',
})
export class Feature implements OnInit {
  private static readonly LOADING_DELAY_MS = 200;
  private static readonly LOADING_MINIMUM_MS = 400;
  private readonly platformId = inject(PLATFORM_ID);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly recentGuides = inject(RecentGuidesService);
  readonly isCreatingGuide = signal(false);
  readonly recentGuideError = signal('');
  readonly startupComplete = signal(false);
  readonly showStartupLoading = signal(false);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.initializeRecentGuides();
    }
  }

  private async initializeRecentGuides(): Promise<void> {
    let loadingShownAt: number | undefined;
    const loadingTimer = globalThis.setTimeout(() => {
      loadingShownAt = Date.now();
      this.showStartupLoading.set(true);
    }, Feature.LOADING_DELAY_MS);

    try {
      await this.recentGuides.initialize();
      const recentGuide = this.recentGuides.recentGuides()[0];

      if (
        !this.facade.hasGuide() &&
        (recentGuide?.hasFileHandle || recentGuide?.hasSnapshot)
      ) {
        await this.openRecentGuide(recentGuide, false, true);
      }
    } finally {
      globalThis.clearTimeout(loadingTimer);

      if (loadingShownAt !== undefined) {
        const elapsed = Date.now() - loadingShownAt;
        const remaining = Feature.LOADING_MINIMUM_MS - elapsed;
        if (remaining > 0) {
          await delay(remaining);
        }
      }

      this.startupComplete.set(true);
      this.showStartupLoading.set(false);
    }
  }

  createGuide(): void {
    this.isCreatingGuide.set(true);
  }

  cancelCreateGuide(): void {
    this.isCreatingGuide.set(false);
  }

  closeGuide(): void {
    this.facade.clearActiveGuide();
    this.isCreatingGuide.set(false);
  }

  async chooseTfn(fallbackInput: HTMLInputElement): Promise<void> {
    const openFilePicker = (globalThis as OpenFilePickerGlobal)
      .showOpenFilePicker;

    if (!openFilePicker) {
      fallbackInput.click();
      return;
    }

    try {
      const [handle] = await openFilePicker({
        multiple: false,
        types: [
          {
            description: 'Theory Fighter Network Guide',
            accept: { 'application/json': ['.tfn'] },
          },
        ],
      });
      if (!handle) {
        return;
      }

      await this.loadGuide(await handle.getFile(), handle);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      this.recentGuideError.set('The guide could not be opened.');
    }
  }

  async onTfnSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const archiveFile = input?.files?.[0];

    if (!archiveFile) {
      return;
    }

    await this.loadGuide(archiveFile);
    input.value = '';
  }

  async openRecentGuide(
    recentGuide: RecentGuide,
    requestPermission = true,
    useSnapshot = false
  ): Promise<void> {
    try {
      const file = await this.recentGuides.open(recentGuide, {
        requestPermission,
        useSnapshot,
      });
      const result = await this.facade.importArchive(file);

      if (result.status === 'success') {
        this.recentGuideError.set('');
        this.isCreatingGuide.set(false);
      }
    } catch (error) {
      if (error instanceof RecentGuidePermissionError && !requestPermission) {
        return;
      }

      this.recentGuideError.set(
        error instanceof RecentGuideUnavailableError ||
          error instanceof RecentGuidePermissionError
          ? error.message
          : 'The guide could not be opened.'
      );
    }
  }

  async saveTfn(): Promise<void> {
    const gameName = this.facade.guide()?.entities.game.name || 'Guide';
    const normalizedGameName = normalizeGameName(gameName);
    const fileName = `${normalizedGameName || 'guide'}.tfn`;
    const saveFilePicker = (globalThis as SaveFilePickerGlobal)
      .showSaveFilePicker;
    let fileHandle: SaveFileHandle | undefined;

    if (saveFilePicker) {
      try {
        fileHandle = await saveFilePicker({
          suggestedName: fileName,
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
      fileName,
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

      try {
        await this.recentGuides.remember(
          await fileHandle.getFile(),
          gameName,
          fileHandle
        );
      } catch {
        await this.recentGuides.remember(result.value, gameName);
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
    await this.recentGuides.remember(result.value, gameName);
  }

  private async loadGuide(
    file: File,
    handle?: RecentFileHandle
  ): Promise<void> {
    const result = await this.facade.importArchive(file);

    if (result.status === 'success') {
      const gameName =
        this.facade.guide()?.entities.game.name || file.name;
      await this.recentGuides.remember(file, gameName, handle);
      this.recentGuideError.set('');
      this.isCreatingGuide.set(false);
    }
  }
}

interface OpenFilePickerGlobal {
  showOpenFilePicker?: (
    options: OpenFilePickerOptions
  ) => Promise<RecentFileHandle[]>;
}

interface OpenFilePickerOptions {
  multiple: boolean;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
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

interface SaveFileHandle extends RecentFileHandle {
  createWritable(): Promise<SaveFileWritable>;
}

interface SaveFileWritable {
  write(data: File): Promise<void>;
  close(): Promise<void>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
