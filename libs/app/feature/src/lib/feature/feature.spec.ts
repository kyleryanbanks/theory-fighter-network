import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  LocalGuideFacadeStore,
  RecentGuideUnavailableError,
  RecentGuidePermissionError,
  RecentGuidesService,
  type RecentGuide,
} from '@theory-fighter-network/data';
import { Feature } from './feature';

describe('Feature', () => {
  let component: Feature;
  let fixture: ComponentFixture<Feature>;
  const recentGuides = signal<RecentGuide[]>([]);
  const mockRecentGuides = {
    recentGuides,
    initialized: signal(true),
    initialize: vi.fn<() => Promise<void>>(async () => undefined),
    remember: vi.fn(async () => undefined),
    open: vi.fn(async () => new File(['{}'], 'recent.tfn')),
  };
  const mockStore = {
    hasGuide: signal(false),
    guide: signal<
      {
        entities: {
          game: {
            name: string;
            version: string;
            frameRate: number;
            is3d: boolean;
            teamSize: number;
            inputs: { directions: []; buttons: [] };
          };
        };
      } | undefined
    >(undefined),
    isBusy: signal(false),
    clearActiveGuide: vi.fn(() => {
      mockStore.hasGuide.set(false);
      mockStore.guide.set(undefined);
    }),
    importArchive: vi.fn(async () => ({ status: 'success' })),
    exportArchive: vi.fn(async () => ({
      status: 'success',
      value: new File(['{}'], 'guide.tfn', {
        type: 'application/json',
      }),
    })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mockStore.hasGuide.set(false);
    mockStore.guide.set(undefined);
    recentGuides.set([]);
    mockRecentGuides.initialized.set(true);

    await TestBed.configureTestingModule({
      imports: [Feature],
      providers: [
        provideRouter([]),
        {
          provide: LocalGuideFacadeStore,
          useValue: mockStore,
        },
        {
          provide: RecentGuidesService,
          useValue: mockRecentGuides,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Feature);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows create and load choices when no Guide is active', () => {
    const headerSlot: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="guide-header-slot"]'
    );
    const emptyState: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="guide-empty-state"]'
    );

    expect(headerSlot).toBeTruthy();
    expect(headerSlot.nextElementSibling).toBe(emptyState);
    expect(emptyState).toBeTruthy();
    expect(
      emptyState.querySelector('[data-testid="create-guide"]')
    ).toBeTruthy();
    expect(
      emptyState.querySelector('[data-testid="import-archive"]')
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('tfn-game-root')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-toolbar"]')
    ).toBeNull();
  });

  it('shows startup loading only after a delay and keeps it visible briefly', async () => {
    vi.useFakeTimers();
    try {
      fixture.destroy();
      mockRecentGuides.initialized.set(false);
      let finishInitialization: (() => void) | undefined;
      mockRecentGuides.initialize.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishInitialization = () => {
              mockRecentGuides.initialized.set(true);
              resolve();
            };
          })
      );

      fixture = TestBed.createComponent(Feature);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="recent-guides-loading"]')
      ).toBeNull();
      expect(
        fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
      ).toBeNull();

      await vi.advanceTimersByTimeAsync(200);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('[data-testid="recent-guides-loading"]')
      ).toBeTruthy();

      finishInitialization?.();
      await vi.advanceTimersByTimeAsync(399);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('[data-testid="recent-guides-loading"]')
      ).toBeTruthy();

      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
      ).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('automatically reopens the most recent Guide on initialization', async () => {
    const recentGuide: RecentGuide = {
      id: 'auto-guide',
      gameName: 'Auto Fighter',
      fileName: 'auto-fighter.tfn',
      location: 'auto-fighter.tfn',
      lastOpenedAt: '2026-08-15T12:00:00.000Z',
      hasFileHandle: true,
      hasSnapshot: true,
    };
    const file = new File(['{}'], 'auto-fighter.tfn');
    fixture.destroy();
    recentGuides.set([recentGuide]);
    mockRecentGuides.open.mockResolvedValueOnce(file);
    mockStore.importArchive.mockImplementationOnce(async () => {
      mockStore.hasGuide.set(true);
      return { status: 'success' };
    });

    fixture = TestBed.createComponent(Feature);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockRecentGuides.open).toHaveBeenCalledWith(recentGuide, {
      requestPermission: false,
      useSnapshot: true,
    });
    expect(mockStore.importArchive).toHaveBeenCalledWith(file);
    expect(fixture.nativeElement.querySelector('tfn-guide-nav')).toBeTruthy();
  });

  it('does not flash the empty state while automatic restore is in progress', async () => {
    const recentGuide: RecentGuide = {
      id: 'slow-guide',
      gameName: 'Slow Fighter',
      fileName: 'slow-fighter.tfn',
      location: 'slow-fighter.tfn',
      lastOpenedAt: '2026-08-15T12:00:00.000Z',
      hasFileHandle: true,
      hasSnapshot: true,
    };
    const file = new File(['{}'], 'slow-fighter.tfn');
    let finishOpen: (() => void) | undefined;
    fixture.destroy();
    recentGuides.set([recentGuide]);
    mockRecentGuides.open.mockImplementationOnce(
      () =>
        new Promise<File>((resolve) => {
          finishOpen = () => resolve(file);
        })
    );

    fixture = TestBed.createComponent(Feature);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="recent-guides-loading"]')
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
    ).toBeNull();

    finishOpen?.();
    await fixture.whenStable();
  });

  it('keeps the empty state when automatic recent restoration fails', async () => {
    const recentGuide: RecentGuide = {
      id: 'missing-auto-guide',
      gameName: 'Missing Fighter',
      fileName: 'missing-fighter.tfn',
      location: 'missing-fighter.tfn',
      lastOpenedAt: '2026-08-15T12:00:00.000Z',
      hasFileHandle: true,
      hasSnapshot: false,
    };
    fixture.destroy();
    recentGuides.set([recentGuide]);
    mockRecentGuides.open.mockRejectedValueOnce(
      new RecentGuideUnavailableError('missing-fighter.tfn')
    );

    fixture = TestBed.createComponent(Feature);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="recent-guide-error"]')
        .textContent
    ).toContain('missing-fighter.tfn is no longer available');
  });

  it('does not show an error when refresh restore needs a user permission gesture', async () => {
    const recentGuide: RecentGuide = {
      id: 'permission-guide',
      gameName: 'Permission Fighter',
      fileName: 'permission-fighter.tfn',
      location: 'permission-fighter.tfn',
      lastOpenedAt: '2026-08-15T12:00:00.000Z',
      hasFileHandle: true,
      hasSnapshot: false,
    };
    fixture.destroy();
    recentGuides.set([recentGuide]);
    mockRecentGuides.open.mockRejectedValueOnce(
      new RecentGuidePermissionError('permission-fighter.tfn')
    );

    fixture = TestBed.createComponent(Feature);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockRecentGuides.open).toHaveBeenCalledWith(recentGuide, {
      requestPermission: false,
      useSnapshot: true,
    });
    expect(
      fixture.nativeElement.querySelector('[data-testid="recent-guide-error"]')
    ).toBeNull();
  });

  it('does not auto-open a recent Guide without a persisted handle', async () => {
    fixture.destroy();
    recentGuides.set([
      {
        id: 'download-only',
        gameName: 'Download Fighter',
        fileName: 'download-fighter.tfn',
        location: 'download-fighter.tfn',
        lastOpenedAt: '2026-08-15T12:00:00.000Z',
        hasFileHandle: false,
        hasSnapshot: false,
      },
    ]);

    fixture = TestBed.createComponent(Feature);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockRecentGuides.open).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
    ).toBeTruthy();
  });

  it('opens the Game editor when creating a new Guide', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="create-guide"]'
    );

    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tfn-game-root')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
    ).toBeNull();
  });

  it('places active Guide status and file actions below the title', () => {
    mockStore.hasGuide.set(true);
    fixture.detectChanges();
    const toolbar: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="guide-toolbar"]'
    );
    const headerSlot: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="guide-header-slot"]'
    );

    expect(toolbar).toBeTruthy();
    expect(headerSlot.contains(toolbar)).toBe(true);
    expect(toolbar.querySelector('[data-testid="guide-key"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="busy-status"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="import-archive"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="export-archive"]')).toBeTruthy();
    expect(headerSlot.nextElementSibling?.classList.contains('guide-layout')).toBe(
      true
    );
    expect(fixture.nativeElement.querySelector('tfn-guide-nav')).toBeTruthy();
  });

  it('loads a .tfn file when selected', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="import-archive"]'
    );
    const file = new File(['{}'], 'import.tfn', {
      type: 'application/json',
    });

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(mockStore.importArchive).toHaveBeenCalledWith(file);
    expect(mockRecentGuides.remember).toHaveBeenCalledWith(
      file,
      'import.tfn',
      undefined
    );
    expect(input.accept).toBe('.tfn');
  });

  it('records the native file handle when loading with the open picker', async () => {
    const file = new File(['{}'], 'native.tfn', {
      type: 'application/json',
    });
    const handle = { getFile: vi.fn(async () => file) };
    const showOpenFilePicker = vi.fn(async () => [handle]);
    vi.stubGlobal('showOpenFilePicker', showOpenFilePicker);
    const fallbackInput: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="import-archive"]'
    );

    await component.chooseTfn(fallbackInput);

    expect(mockStore.importArchive).toHaveBeenCalledWith(file);
    expect(mockRecentGuides.remember).toHaveBeenCalledWith(
      file,
      'native.tfn',
      handle
    );
  });

  it('shows recent Guides and reopens one from its stored handle', async () => {
    const recentGuide: RecentGuide = {
      id: 'guide-1',
      gameName: 'Marvel Tokon',
      fileName: 'locals.tfn',
      location: 'locals.tfn',
      lastOpenedAt: '2026-08-15T12:00:00.000Z',
      hasFileHandle: true,
      hasSnapshot: true,
    };
    recentGuides.set([recentGuide]);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="recent-guide-guide-1"]'
    );
    button.click();
    await fixture.whenStable();

    expect(mockRecentGuides.open).toHaveBeenCalledWith(recentGuide, {
      requestPermission: true,
      useSnapshot: false,
    });
    expect(mockStore.importArchive).toHaveBeenCalledWith(expect.any(File));
    const recentButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="recent-guide-guide-1"]'
    );
    expect(recentButton.textContent).toContain('Marvel Tokon');
    expect(recentButton.textContent).toContain('locals.tfn');
  });

  it('shows a graceful error when a recent Guide is unavailable', async () => {
    const recentGuide: RecentGuide = {
      id: 'guide-missing',
      gameName: 'Missing Fighter',
      fileName: 'missing.tfn',
      location: 'missing.tfn',
      lastOpenedAt: '2026-08-15T12:00:00.000Z',
      hasFileHandle: true,
      hasSnapshot: true,
    };
    recentGuides.set([recentGuide]);
    mockRecentGuides.open.mockRejectedValueOnce(
      new RecentGuideUnavailableError('missing.tfn')
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="recent-guide-guide-missing"]')
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    const error: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="recent-guide-error"]'
    );
    expect(error.textContent).toContain(
      'missing.tfn is no longer available. Load it again to update this entry.'
    );
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
    ).toBeTruthy();
  });

  it('saves the active guide as a .tfn file', async () => {
    const write = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const createWritable = vi.fn(async () => ({ write, close }));
    const savedFile = new File(['saved'], 'custom-tokon-name.tfn', {
      type: 'application/json',
    });
    const getFile = vi.fn(async () => savedFile);
    const fileHandle = { createWritable, getFile };
    const showSaveFilePicker = vi.fn(async () => fileHandle);
    vi.stubGlobal('showSaveFilePicker', showSaveFilePicker);
    mockStore.hasGuide.set(true);
    mockStore.guide.set({
      entities: {
        game: {
          name: 'MARVEL Tōkon: Fighting Souls',
          version: '1.0.0',
          frameRate: 60,
          is3d: false,
          teamSize: 1,
          inputs: { directions: [], buttons: [] },
        },
      },
    });
    fixture.detectChanges();

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector(
        '[data-testid="export-archive"]'
      );

    button.click();
    await fixture.whenStable();

    expect(mockStore.exportArchive).toHaveBeenCalledWith({
      fileName: 'marvel-tokon-fighting-souls.tfn',
    });
    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'marvel-tokon-fighting-souls.tfn',
      types: [
        {
          description: 'Theory Fighter Network Guide',
          accept: { 'application/json': ['.tfn'] },
        },
      ],
    });
    expect(write).toHaveBeenCalledWith(expect.any(File));
    expect(close).toHaveBeenCalledTimes(1);
    expect(mockRecentGuides.remember).toHaveBeenCalledWith(
      savedFile,
      'MARVEL Tōkon: Fighting Souls',
      fileHandle
    );
  });

  it('closes the active Guide and returns to the empty state', () => {
    mockStore.hasGuide.set(true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="close-guide"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockStore.clearActiveGuide).toHaveBeenCalledTimes(1);
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-empty-state"]')
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('tfn-game-root')).toBeNull();
  });

  it('does not expose directory persistence actions', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="open-directory"]')
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="save-directory"]')
    ).toBeNull();
  });
});
