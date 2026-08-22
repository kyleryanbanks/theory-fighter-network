import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { MoveComparison } from './move-comparison';

describe('MoveComparison', () => {
  let fixture: ComponentFixture<MoveComparison>;
  const moveA = {
    gameKey: 'game-1',
    semanticKey: 'move-a',
    name: 'Move A',
    preconditions: {},
    community: { ownerId: 'local-user' },
    meta: { createdAt: new Date(), lastUpdatedAt: new Date() },
    phases: [
      {
        startup: { duration: { relative: 20 } },
        effects: { onHit: { hitStop: { relative: 40 }, stun: { relative: 60 } } },
      },
      {
        startup: { duration: { relative: 80 } },
      },
    ],
  };
  const updateMovePhaseDuration = vi.fn(async () => ({ status: 'success' }));
  const updateMoveOutcomeDataValue = vi.fn(async () => ({ status: 'success' }));

  beforeEach(async () => {
    updateMovePhaseDuration.mockClear();
    updateMoveOutcomeDataValue.mockClear();
    await TestBed.configureTestingModule({
      imports: [MoveComparison],
      providers: [
        provideRouter([]),
        {
          provide: LocalGuideFacadeStore,
          useValue: {
            guide: () => ({ entities: { moves: [moveA] } }),
            updateMovePhaseDuration,
            updateMoveOutcomeDataValue,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MoveComparison);
    fixture.detectChanges();
    fixture.componentInstance.toggleMove('move-a');
    fixture.detectChanges();
  });

  it('defaults to comparing startup duration on the first phase', () => {
    const [pin] = fixture.componentInstance.pins();
    expect(pin.relative).toBe(20);
  });

  it('lists frame data and hit property fields grouped for selection', () => {
    const groupLabels = fixture.componentInstance.fieldGroups.map((group) => group.label);
    expect(groupLabels).toEqual(['Frame Data', 'Hit Properties']);

    const frameFieldIds = fixture.componentInstance.fieldGroups[0].fields.map((field) => field.id);
    expect(frameFieldIds).toContain('startup.duration');

    const hitFieldIds = fixture.componentInstance.fieldGroups[1].fields.map((field) => field.id);
    expect(hitFieldIds).toContain('effects.onHit.hitStop');
  });

  it('switches the compared field to a hit property and reads its value', () => {
    fixture.componentInstance.setComparisonField('effects.onHit.hitStop');
    fixture.detectChanges();

    const [pin] = fixture.componentInstance.pins();
    expect(pin.relative).toBe(40);
  });

  it('switches the compared phase index and reads that phase value', () => {
    fixture.componentInstance.setPhaseIndex(1);
    fixture.detectChanges();

    const [pin] = fixture.componentInstance.pins();
    expect(pin.relative).toBe(80);
  });

  it('writes duration changes through updateMovePhaseDuration', async () => {
    await fixture.componentInstance.updatePosition({ key: 'move-a', relative: 55 });

    expect(updateMovePhaseDuration).toHaveBeenCalledWith({
      moveKey: 'move-a',
      phase: 'startup',
      duration: { relative: 55 },
      phaseIndex: 0,
    });
  });

  it('writes hit property changes through updateMoveOutcomeDataValue', async () => {
    fixture.componentInstance.setComparisonField('effects.onHit.hitStop');
    fixture.detectChanges();

    await fixture.componentInstance.updatePosition({ key: 'move-a', relative: 55 });

    expect(updateMoveOutcomeDataValue).toHaveBeenCalledWith({
      moveKey: 'move-a',
      outcome: 'onHit',
      field: 'hitStop',
      value: { relative: 55 },
      phaseIndex: 0,
    });
  });
});
