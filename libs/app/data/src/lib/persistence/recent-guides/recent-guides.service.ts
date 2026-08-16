import { Injectable, InjectionToken, inject, signal } from '@angular/core';

const DATABASE_NAME = 'theory-fighter-network';
const METADATA_STORE = 'recent-guide-metadata';
const HANDLE_STORE = 'recent-guide-handles';
const SNAPSHOT_STORE = 'recent-guide-snapshots';
const METADATA_KEY = 'recent-guides';
const MAX_RECENT_GUIDES = 6;

export interface RecentGuide {
  id: string;
  gameName: string;
  fileName: string;
  location: string;
  lastOpenedAt: string;
  hasFileHandle: boolean;
  hasSnapshot: boolean;
}

export interface RecentFileHandle {
  getFile(): Promise<File>;
  queryPermission?: (
    descriptor?: RecentFilePermissionDescriptor
  ) => Promise<RecentFilePermissionState>;
  requestPermission?: (
    descriptor?: RecentFilePermissionDescriptor
  ) => Promise<RecentFilePermissionState>;
}

export interface RecentFileOpenOptions {
  requestPermission?: boolean;
  useSnapshot?: boolean;
}

type RecentFilePermissionState = 'granted' | 'denied' | 'prompt';

interface RecentFilePermissionDescriptor {
  mode: 'read';
}

export interface RecentGuideStorage {
  loadMetadata(): Promise<RecentGuide[]>;
  saveMetadata(guides: RecentGuide[]): Promise<void>;
  loadHandle(id: string): Promise<RecentFileHandle | undefined>;
  saveHandle(id: string, handle: RecentFileHandle): Promise<void>;
  loadSnapshot(id: string): Promise<File | undefined>;
  saveSnapshot(id: string, file: File): Promise<void>;
}

export const RECENT_GUIDE_STORAGE = new InjectionToken<RecentGuideStorage>(
  'RECENT_GUIDE_STORAGE',
  { factory: () => new BrowserRecentGuideStorage() }
);

export class RecentGuideUnavailableError extends Error {
  constructor(fileName: string) {
    super(
      `${fileName} is no longer available. Load it again to update this entry.`
    );
    this.name = 'RecentGuideUnavailableError';
  }
}

export class RecentGuidePermissionError extends Error {
  constructor(fileName: string) {
    super(`Permission is required to open ${fileName}. Select it to continue.`);
    this.name = 'RecentGuidePermissionError';
  }
}

@Injectable({ providedIn: 'root' })
export class RecentGuidesService {
  private readonly storage = inject(RECENT_GUIDE_STORAGE);
  private initialization?: Promise<void>;
  readonly recentGuides = signal<RecentGuide[]>([]);
  readonly initialized = signal(false);

  initialize(): Promise<void> {
    this.initialization ??= this.loadMetadata();
    return this.initialization;
  }

  async remember(
    file: File,
    gameName: string,
    handle?: RecentFileHandle
  ): Promise<void> {
    await this.initialize();
    const id = createRecentGuideId(file);
    let hasFileHandle = false;
    let hasSnapshot = false;

    if (handle) {
      try {
        await this.storage.saveHandle(id, handle);
        hasFileHandle = true;
      } catch {
        hasFileHandle = false;
      }
    }

    try {
      await this.storage.saveSnapshot(id, file);
      hasSnapshot = true;
    } catch {
      hasSnapshot = false;
    }

    const recentGuide: RecentGuide = {
      id,
      gameName,
      fileName: file.name,
      location: file.name,
      lastOpenedAt: new Date().toISOString(),
      hasFileHandle,
      hasSnapshot,
    };
    const recentGuides = [
      recentGuide,
      ...this.recentGuides().filter((guide) => guide.id !== id),
    ].slice(0, MAX_RECENT_GUIDES);

    this.recentGuides.set(recentGuides);
    await this.storage.saveMetadata(recentGuides);
  }

  async open(
    recentGuide: RecentGuide,
    options: RecentFileOpenOptions = {}
  ): Promise<File> {
    await this.initialize();
    if (!recentGuide.hasFileHandle) {
      if (options.useSnapshot && recentGuide.hasSnapshot) {
        return this.openSnapshot(recentGuide);
      }

      throw new RecentGuideUnavailableError(recentGuide.fileName);
    }

    try {
      const handle = await this.storage.loadHandle(recentGuide.id);

      if (!handle) {
        throw new RecentGuideUnavailableError(recentGuide.fileName);
      }

      try {
        await ensureReadPermission(
          handle,
          recentGuide.fileName,
          options.requestPermission !== false
        );
      } catch (error) {
        if (
          error instanceof RecentGuidePermissionError &&
          options.useSnapshot &&
          recentGuide.hasSnapshot
        ) {
          return this.openSnapshot(recentGuide);
        }

        throw error;
      }

      const file = await handle.getFile();
      const recentGuides = [
        { ...recentGuide, lastOpenedAt: new Date().toISOString() },
        ...this.recentGuides().filter((guide) => guide.id !== recentGuide.id),
      ];
      this.recentGuides.set(recentGuides);
      await this.storage.saveMetadata(recentGuides);
      return file;
    } catch (error) {
      if (error instanceof RecentGuideUnavailableError) {
        throw error;
      }

      if (error instanceof RecentGuidePermissionError) {
        throw error;
      }

      if (isPermissionError(error)) {
        throw new RecentGuidePermissionError(recentGuide.fileName);
      }

      throw new RecentGuideUnavailableError(recentGuide.fileName);
    }
  }

  private async openSnapshot(recentGuide: RecentGuide): Promise<File> {
    const snapshot = await this.storage.loadSnapshot(recentGuide.id);
    if (!snapshot) {
      throw new RecentGuideUnavailableError(recentGuide.fileName);
    }

    return snapshot;
  }

  private async loadMetadata(): Promise<void> {
    try {
      this.recentGuides.set(await this.storage.loadMetadata());
    } catch {
      this.recentGuides.set([]);
    } finally {
      this.initialized.set(true);
    }
  }
}

async function ensureReadPermission(
  handle: RecentFileHandle,
  fileName: string,
  requestPermission: boolean
): Promise<void> {
  if (!handle.queryPermission) {
    return;
  }

  const descriptor: RecentFilePermissionDescriptor = { mode: 'read' };
  const permission = await handle.queryPermission(descriptor);
  if (permission === 'granted') {
    return;
  }

  if (!requestPermission || !handle.requestPermission) {
    throw new RecentGuidePermissionError(fileName);
  }

  const requestedPermission = await handle.requestPermission(descriptor);
  if (requestedPermission !== 'granted') {
    throw new RecentGuidePermissionError(fileName);
  }
}

function isPermissionError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  );
}

class BrowserRecentGuideStorage implements RecentGuideStorage {
  async loadMetadata(): Promise<RecentGuide[]> {
    const database = await openHandleDatabase();
    if (!database) {
      return [];
    }

    const stored = await getStoredValue<unknown[]>(
      database,
      METADATA_STORE,
      METADATA_KEY
    );
    return Array.isArray(stored)
      ? stored.map(normalizeRecentGuide).filter(isRecentGuide)
      : [];
  }

  async saveMetadata(guides: RecentGuide[]): Promise<void> {
    const database = await openHandleDatabase();
    if (!database) {
      throw new Error('IndexedDB is unavailable.');
    }

    await putStoredValue(database, METADATA_STORE, METADATA_KEY, guides);
  }

  async loadHandle(id: string): Promise<RecentFileHandle | undefined> {
    const database = await openHandleDatabase();
    if (!database) {
      return undefined;
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE, 'readonly');
      const request = transaction.objectStore(HANDLE_STORE).get(id);
      request.onsuccess = () => resolve(request.result as RecentFileHandle);
      request.onerror = () => reject(request.error);
    });
  }

  async saveHandle(id: string, handle: RecentFileHandle): Promise<void> {
    const database = await openHandleDatabase();
    if (!database) {
      throw new Error('IndexedDB is unavailable.');
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE, 'readwrite');
      transaction.objectStore(HANDLE_STORE).put(handle, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async loadSnapshot(id: string): Promise<File | undefined> {
    const database = await openHandleDatabase();
    if (!database) {
      return undefined;
    }

    return getStoredValue<File>(database, SNAPSHOT_STORE, id);
  }

  async saveSnapshot(id: string, file: File): Promise<void> {
    const database = await openHandleDatabase();
    if (!database) {
      throw new Error('IndexedDB is unavailable.');
    }

    await putStoredValue(database, SNAPSHOT_STORE, id, file);
  }
}

function openHandleDatabase(): Promise<IDBDatabase | undefined> {
  if (!globalThis.indexedDB) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(METADATA_STORE)) {
        request.result.createObjectStore(METADATA_STORE);
      }
      if (!request.result.objectStoreNames.contains(HANDLE_STORE)) {
        request.result.createObjectStore(HANDLE_STORE);
      }
      if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) {
        request.result.createObjectStore(SNAPSHOT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getStoredValue<T>(
  database: IDBDatabase,
  storeName: string,
  id: string
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function putStoredValue<T>(
  database: IDBDatabase,
  storeName: string,
  id: string,
  value: T
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function createRecentGuideId(file: File): string {
  const identity = `${file.name}:${file.size}:${file.lastModified}`;
  let hash = 2166136261;

  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `guide-${(hash >>> 0).toString(16)}`;
}

function isRecentGuide(value: unknown): value is RecentGuide {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const guide = value as Record<string, unknown>;
  return (
    typeof guide['id'] === 'string' &&
    typeof guide['gameName'] === 'string' &&
    typeof guide['fileName'] === 'string' &&
    typeof guide['location'] === 'string' &&
    typeof guide['lastOpenedAt'] === 'string' &&
    typeof guide['hasFileHandle'] === 'boolean' &&
    typeof guide['hasSnapshot'] === 'boolean'
  );
}

function normalizeRecentGuide(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const guide = value as Record<string, unknown>;
  const legacyName = typeof guide['name'] === 'string' ? guide['name'] : '';
  return {
    ...guide,
    gameName:
      typeof guide['gameName'] === 'string'
        ? guide['gameName']
        : legacyName,
    fileName:
      typeof guide['fileName'] === 'string'
        ? guide['fileName']
        : legacyName,
    hasSnapshot:
      typeof guide['hasSnapshot'] === 'boolean'
        ? guide['hasSnapshot']
        : false,
  };
}
