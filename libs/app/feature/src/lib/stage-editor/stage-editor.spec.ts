import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { StageEditor } from './stage-editor';

function buildGuide(
  stages: Array<{ name: string; semanticKey: string }> = [],
  stageZones: Array<{
    name: string;
    semanticKey: string;
    stageKey?: string;
    inheritedFromZoneKey?: string;
  }> = []
) {
  return {
    entities: { stages, stageZones },
  };
}

describe('StageEditor', () => {
  let fixture: ComponentFixture<StageEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createStage: vi.fn(async () => ({ status: 'success' })),
    deleteStage: vi.fn(async () => ({ status: 'success' })),
    createStageZone: vi.fn(async () => ({ status: 'success' })),
    overrideStageZone: vi.fn(async () => ({ status: 'success' })),
    deleteStageZone: vi.fn(async () => ({ status: 'success' })),
    promoteStageZone: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [StageEditor],
      providers: [{ provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(StageEditor);
    fixture.detectChanges();
  });

  it('renders the active Guide Stages', () => {
    guide.set(
      buildGuide([
        { name: 'Training Room', semanticKey: 'stage-training' },
        { name: 'Metro City', semanticKey: 'stage-metro' },
      ])
    );
    fixture.detectChanges();

    const entries = fixture.nativeElement.querySelectorAll(
      '[data-testid="stage-entry"]'
    );
    expect(entries).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Training Room');
    expect(fixture.nativeElement.textContent).toContain('Metro City');
  });

  it('creates one Stage from the name field and clears the draft', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="stage-name"]'
    );
    input.value = 'Training Room';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="add-stage"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockStore.createStage).toHaveBeenCalledWith({
      name: 'Training Room',
    });
    expect(input.value).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Stage name is required.'
    );
  });

  it('shows a duplicate Stage error without clearing the draft', async () => {
    mockStore.createStage.mockResolvedValueOnce({
      status: 'error',
      error: new Error('Stage "Training Room" already exists.'),
    });
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="stage-name"]'
    );
    input.value = 'Training Room';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="add-stage"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Stage "Training Room" already exists.'
    );
    expect(input.value).toBe('Training Room');
  });

  it('deletes a Stage from its row action', async () => {
    guide.set(
      buildGuide([
        { name: 'Training Room', semanticKey: 'stage-training' },
      ])
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Stage Training Room"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.deleteStage).toHaveBeenCalledWith({
      stageKey: 'stage-training',
    });
  });

  it('creates a universal Zone from the zone name field', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="universal-zone-name"]'
    );
    input.value = 'Hazard Pit';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="add-universal-zone"]')
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockStore.createStageZone).toHaveBeenCalledWith({
      name: 'Hazard Pit',
    });
    expect(input.value).toBe('');
  });

  it('shows universal Zones as inherited (locked) for a Stage with an Override action', () => {
    guide.set(
      buildGuide(
        [{ name: 'Training Room', semanticKey: 'stage-training' }],
        [{ name: 'Hazard Pit', semanticKey: 'zone-hazard' }]
      )
    );
    fixture.detectChanges();

    const stageZoneEntries = fixture.nativeElement.querySelectorAll(
      '[data-testid="stage-zone-list"] [data-testid="zone-entry"]'
    );
    expect(stageZoneEntries).toHaveLength(1);
    expect(stageZoneEntries[0].textContent).toContain('Hazard Pit');
    expect(stageZoneEntries[0].textContent).toContain('Universal');

    fixture.nativeElement
      .querySelector('[aria-label="Override Hazard Pit for Training Room"]')
      .click();

    expect(mockStore.overrideStageZone).toHaveBeenCalledWith({
      stageKey: 'stage-training',
      universalZoneKey: 'zone-hazard',
    });
  });

  it('shows a Stage override with a Revert to Universal action instead of the locked entry', () => {
    guide.set(
      buildGuide(
        [{ name: 'Training Room', semanticKey: 'stage-training' }],
        [
          { name: 'Hazard Pit', semanticKey: 'zone-hazard' },
          {
            name: 'Hazard Pit',
            semanticKey: 'zone-hazard-override',
            stageKey: 'stage-training',
            inheritedFromZoneKey: 'zone-hazard',
          },
        ]
      )
    );
    fixture.detectChanges();

    const stageZoneEntries = fixture.nativeElement.querySelectorAll(
      '[data-testid="stage-zone-list"] [data-testid="zone-entry"]'
    );
    expect(stageZoneEntries).toHaveLength(1);
    expect(stageZoneEntries[0].textContent).toContain('Overrides zone-hazard');

    fixture.nativeElement
      .querySelector(
        '[aria-label="Revert Hazard Pit to Universal for Training Room"]'
      )
      .click();

    expect(mockStore.deleteStageZone).toHaveBeenCalledWith({
      stageZoneKey: 'zone-hazard-override',
    });
  });

  it('shows a Stage-only Zone with a plain Delete action', () => {
    guide.set(
      buildGuide(
        [{ name: 'Training Room', semanticKey: 'stage-training' }],
        [
          {
            name: 'Pit Trap',
            semanticKey: 'zone-pit-trap',
            stageKey: 'stage-training',
          },
        ]
      )
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Zone Pit Trap"]')
      .click();

    expect(mockStore.deleteStageZone).toHaveBeenCalledWith({
      stageZoneKey: 'zone-pit-trap',
    });
  });

  it('promotes a Stage-only Zone to universal from its row action', () => {
    guide.set(
      buildGuide(
        [{ name: 'Training Room', semanticKey: 'stage-training' }],
        [
          {
            name: 'Pit Trap',
            semanticKey: 'zone-pit-trap',
            stageKey: 'stage-training',
          },
        ]
      )
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Promote Pit Trap to Universal"]')
      .click();

    expect(mockStore.promoteStageZone).toHaveBeenCalledWith({
      stageZoneKey: 'zone-pit-trap',
    });
  });
});
