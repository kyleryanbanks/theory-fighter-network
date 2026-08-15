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
    status: signal('idle'),
    createWorkspace: vi.fn(async () => ({ status: 'success' })),
    setDirectoryHandle: vi.fn(),
    reloadDirectoryWorkspace: vi.fn(),
    saveWorkspaceToDirectory: vi.fn(async () => ({ status: 'success' })),
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

  it('creates a workspace when create button is clicked', async () => {
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector(
        '[data-testid="create-workspace"]'
      );

    button.click();
    await fixture.whenStable();

    expect(mockStore.createWorkspace).toHaveBeenCalledTimes(1);
  });

  it('saves workspace when save button is clicked and a directory handle exists', async () => {
    component.activeDirectoryHandle =
      {} as unknown as FileSystemDirectoryHandle;
    fixture.detectChanges();

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector(
        '[data-testid="save-workspace"]'
      );

    button.click();
    await fixture.whenStable();

    expect(mockStore.saveWorkspaceToDirectory).toHaveBeenCalledTimes(1);
  });

  it('imports archive when a file is selected', async () => {
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
  });

  it('exports archive when export button is clicked', async () => {
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector(
        '[data-testid="export-archive"]'
      );

    button.click();
    await fixture.whenStable();

    expect(mockStore.exportArchive).toHaveBeenCalledTimes(1);
  });
});
