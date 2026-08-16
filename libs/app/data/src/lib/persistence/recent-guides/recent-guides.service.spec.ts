import { TestBed } from '@angular/core/testing';
import {
  RECENT_GUIDE_STORAGE,
  RecentGuidePermissionError,
  RecentGuideUnavailableError,
  RecentGuidesService,
  type RecentFileHandle,
  type RecentGuideStorage,
} from './recent-guides.service';

describe('RecentGuidesService', () => {
  const metadata = new Map<string, string>();
  const handles = new Map<string, RecentFileHandle>();
  const snapshots = new Map<string, File>();
  const storage: RecentGuideStorage = {
    loadMetadata: async () => {
      const value = metadata.get('recent');
      return value ? JSON.parse(value) : [];
    },
    saveMetadata: async (guides) => {
      metadata.set('recent', JSON.stringify(guides));
    },
    loadHandle: async (id) => handles.get(id),
    saveHandle: async (id, handle) => {
      handles.set(id, handle);
    },
    loadSnapshot: async (id) => snapshots.get(id),
    saveSnapshot: async (id, file) => {
      snapshots.set(id, file);
    },
  };

  beforeEach(() => {
    metadata.clear();
    handles.clear();
    snapshots.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: RECENT_GUIDE_STORAGE, useValue: storage }],
    });
  });

  it('initializes recent metadata asynchronously from persistence', async () => {
    metadata.set(
      'recent',
      JSON.stringify([
        {
          id: 'stored-guide',
          gameName: 'Stored Fighter',
          fileName: 'stored.tfn',
          location: 'stored.tfn',
          lastOpenedAt: '2026-08-15T12:00:00.000Z',
          hasFileHandle: false,
          hasSnapshot: true,
        },
      ])
    );
    const service = TestBed.inject(RecentGuidesService);

    expect(service.initialized()).toBe(false);
    await service.initialize();

    expect(service.initialized()).toBe(true);
    expect(service.recentGuides()[0].gameName).toBe('Stored Fighter');
  });

  it('records recent metadata and a reopenable file handle', async () => {
    const service = TestBed.inject(RecentGuidesService);
    const file = new File(['guide'], 'locals.tfn', {
      lastModified: 123,
      type: 'application/json',
    });
    const handle: RecentFileHandle = { getFile: async () => file };

    await service.remember(file, 'Marvel Tokon', handle);

    expect(service.recentGuides()).toEqual([
      expect.objectContaining({
        gameName: 'Marvel Tokon',
        fileName: 'locals.tfn',
        location: 'locals.tfn',
        hasFileHandle: true,
        hasSnapshot: true,
      }),
    ]);
    expect(handles.size).toBe(1);
    expect(metadata.get('recent')).toContain('locals.tfn');
  });

  it('reopens a recent Guide and promotes it to the top', async () => {
    const service = TestBed.inject(RecentGuidesService);
    const file = new File(['guide'], 'locals.tfn', { lastModified: 123 });
    const handle: RecentFileHandle = { getFile: async () => file };
    await service.remember(file, 'Marvel Tokon', handle);
    const recent = service.recentGuides()[0];

    await expect(service.open(recent)).resolves.toBe(file);
    expect(service.recentGuides()[0].id).toBe(recent.id);
  });

  it('requests read permission when reopening after a refresh prompt', async () => {
    const service = TestBed.inject(RecentGuidesService);
    const file = new File(['guide'], 'locals.tfn', { lastModified: 123 });
    const handle: RecentFileHandle = {
      getFile: async () => file,
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'granted',
    };
    await service.remember(file, 'Marvel Tokon', handle);

    await expect(service.open(service.recentGuides()[0])).resolves.toBe(file);
  });

  it('uses a cached snapshot during a non-interactive refresh restore', async () => {
    const service = TestBed.inject(RecentGuidesService);
    const requestPermission = vi.fn(async () => 'granted' as const);
    const file = new File(['guide'], 'locals.tfn', { lastModified: 123 });
    const handle: RecentFileHandle = {
      getFile: async () => file,
      queryPermission: async () => 'prompt',
      requestPermission,
    };
    await service.remember(file, 'Marvel Tokon', handle);

    await expect(
      service.open(service.recentGuides()[0], {
        requestPermission: false,
        useSnapshot: true,
      })
    ).resolves.toBe(file);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('reports permission denial separately from a missing file', async () => {
    const service = TestBed.inject(RecentGuidesService);
    const file = new File(['guide'], 'locals.tfn', { lastModified: 123 });
    const handle: RecentFileHandle = {
      getFile: async () => file,
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'denied',
    };
    await service.remember(file, 'Marvel Tokon', handle);

    await expect(service.open(service.recentGuides()[0])).rejects.toBeInstanceOf(
      RecentGuidePermissionError
    );
  });

  it('reports an unavailable Guide when its handle cannot be resolved', async () => {
    const service = TestBed.inject(RecentGuidesService);
    const file = new File(['guide'], 'missing.tfn', { lastModified: 123 });
    await service.remember(file, 'Missing Game');

    await expect(service.open(service.recentGuides()[0])).rejects.toBeInstanceOf(
      RecentGuideUnavailableError
    );
  });
});
