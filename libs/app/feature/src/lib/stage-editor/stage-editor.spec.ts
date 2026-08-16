import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { StageEditor } from './stage-editor';

function buildGuide(stages: Array<{ name: string; semanticKey: string }> = []) {
  return {
    entities: { stages },
  };
}

describe('StageEditor', () => {
  let fixture: ComponentFixture<StageEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createStage: vi.fn(async () => ({ status: 'success' })),
    deleteStage: vi.fn(async () => ({ status: 'success' })),
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
});
