import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { Feature } from './feature';

describe('Feature', () => {
  let component: Feature;
  let fixture: ComponentFixture<Feature>;
  const mockStore = {
    hasWorkspace: signal(false),
    workspace: signal(undefined),
    isBusy: signal(false),
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
    mockStore.hasWorkspace.set(false);

    await TestBed.configureTestingModule({
      imports: [Feature],
      providers: [
        {
          provide: LocalGuideFacadeStore,
          useValue: mockStore,
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

  it('places Guide status and file actions together below the title', () => {
    const toolbar: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="guide-toolbar"]'
    );

    expect(toolbar).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="workspace-key"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="busy-status"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="import-archive"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-testid="export-archive"]')).toBeTruthy();
    expect(toolbar.nextElementSibling?.tagName).toBe('TFN-GAME-ROOT');
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
    expect(input.accept).toBe('.tfn');
  });

  it('saves the active guide as a .tfn file', async () => {
    const write = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const createWritable = vi.fn(async () => ({ write, close }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    vi.stubGlobal('showSaveFilePicker', showSaveFilePicker);
    mockStore.hasWorkspace.set(true);
    fixture.detectChanges();

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector(
        '[data-testid="export-archive"]'
      );

    button.click();
    await fixture.whenStable();

    expect(mockStore.exportArchive).toHaveBeenCalledTimes(1);
    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'tfn-guide-export.tfn',
      types: [
        {
          description: 'Theory Fighter Network Guide',
          accept: { 'application/json': ['.tfn'] },
        },
      ],
    });
    expect(write).toHaveBeenCalledWith(expect.any(File));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not expose directory persistence actions', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="open-directory"]')
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="save-workspace"]')
    ).toBeNull();
  });
});
