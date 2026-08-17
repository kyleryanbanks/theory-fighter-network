import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import type { PhaseCancelRule } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { MoveDetail } from './move-detail';

describe('MoveDetail', () => {
  let fixture: ComponentFixture<MoveDetail>;
  const move = {
    gameKey: 'game-1',
    semanticKey: 'move-hadoken',
    name: 'Hadoken',
    preconditions: {},
    community: { ownerId: 'local-user' },
    meta: { createdAt: new Date(), lastUpdatedAt: new Date() },
    phases: [{}],
  };
  const updateMovePhaseDuration = vi.fn(async () => ({ status: 'success' }));
  const updateMoveOutcomeDataValue = vi.fn(async () => ({ status: 'success' }));
  const updateMoveOutcomeCancels = vi.fn(async () => ({ status: 'success' }));
  const addMovePhase = vi.fn(async () => ({ status: 'success' }));
  const removeMovePhase = vi.fn(async () => ({ status: 'success' }));

  beforeEach(async () => {
    updateMovePhaseDuration.mockClear();
    updateMoveOutcomeDataValue.mockClear();
    updateMoveOutcomeCancels.mockClear();
    await TestBed.configureTestingModule({
      imports: [MoveDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'move-hadoken' } } },
        },
        {
          provide: LocalGuideFacadeStore,
          useValue: { guide: () => ({ entities: { moves: [move] } }), updateMovePhaseDuration, updateMoveOutcomeDataValue, updateMoveOutcomeCancels, addMovePhase, removeMovePhase },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MoveDetail);
    fixture.detectChanges();
  });

  it('renders editors for startup, active, and recovery durations', () => {
    expect(fixture.nativeElement.querySelectorAll('tfn-data-value-editor')).toHaveLength(13);
    expect(fixture.nativeElement.textContent).toContain('Startup');
    expect(fixture.nativeElement.textContent).toContain('Active');
    expect(fixture.nativeElement.textContent).toContain('Recovery');
    expect(fixture.nativeElement.textContent).toContain('On Hit');
    expect(fixture.nativeElement.textContent).toContain('On Block');
    expect(fixture.nativeElement.textContent).toContain('On Counter Hit');
    expect(fixture.nativeElement.textContent).toContain('On Whiff');
    expect(fixture.nativeElement.textContent).toContain('On Secondary Trigger');
  });

  it('renders "Cancel rules" section header for each outcome', () => {
    expect(fixture.nativeElement.textContent).toContain('Cancel rules');
  });

  it('renders add cancel rule button for each outcome', () => {
    // Check that at least one "Add cancel rule" button text is present
    expect(fixture.nativeElement.textContent).toContain('Add cancel rule');
  });

  it('returns empty array when outcome cancels do not exist', () => {
    const component = fixture.componentInstance;
    const cancels = component.outcomeCancels(0, 'onHit');
    expect(cancels).toEqual([]);
  });

  it('calls updateMoveOutcomeCancels when updating outcome cancels', async () => {
    const component = fixture.componentInstance;
    const cancels = [
      { startFrame: 2, endFrame: 5, allowedMoveKeys: ['hadoken', 'shoryuken'] },
    ] as PhaseCancelRule[];
    
    await component.updateOutcomeCancels(0, 'onHit', cancels);
    
    expect(updateMoveOutcomeCancels).toHaveBeenCalledWith({
      moveKey: 'move-hadoken',
      phaseIndex: 0,
      outcome: 'onHit',
      cancels,
    });
  });
});

describe('MoveDetail with outcome cancels', () => {
  let fixture: ComponentFixture<MoveDetail>;
  const moveWithCancels = {
    gameKey: 'game-1',
    semanticKey: 'move-jab',
    name: 'Jab',
    preconditions: {},
    community: { ownerId: 'local-user' },
    meta: { createdAt: new Date(), lastUpdatedAt: new Date() },
    phases: [
      {
        effects: {
          onHit: {
            cancels: [
              { startFrame: 2, endFrame: 5, allowedMoveKeys: ['hadoken'] },
            ] as PhaseCancelRule[],
          },
        },
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'move-jab' } } },
        },
        {
          provide: LocalGuideFacadeStore,
          useValue: {
            guide: () => ({ entities: { moves: [moveWithCancels] } }),
            updateMovePhaseDuration: vi.fn(async () => ({ status: 'success' })),
            updateMoveOutcomeDataValue: vi.fn(async () => ({ status: 'success' })),
            updateMoveOutcomeCancels: vi.fn(async () => ({ status: 'success' })),
            addMovePhase: vi.fn(async () => ({ status: 'success' })),
            removeMovePhase: vi.fn(async () => ({ status: 'success' })),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MoveDetail);
    fixture.detectChanges();
  });

  it('returns outcome cancels when they exist', () => {
    const component = fixture.componentInstance;
    const cancels = component.outcomeCancels(0, 'onHit');
    expect(cancels).toHaveLength(1);
    expect(cancels[0]).toEqual({ startFrame: 2, endFrame: 5, allowedMoveKeys: ['hadoken'] });
  });

  it('adds a new cancel rule to outcome', async () => {
    const component = fixture.componentInstance;
    const updateMoveOutcomeCancels = TestBed.inject(LocalGuideFacadeStore).updateMoveOutcomeCancels as ReturnType<typeof vi.fn>;
    
    const newCancel = { startFrame: 7, endFrame: 10, allowedMoveKeys: ['shoryuken'] } as PhaseCancelRule;
    await component.addOutcomeCancel(0, 'onHit', newCancel);
    
    expect(updateMoveOutcomeCancels).toHaveBeenCalledWith({
      moveKey: 'move-jab',
      phaseIndex: 0,
      outcome: 'onHit',
      cancels: [
        { startFrame: 2, endFrame: 5, allowedMoveKeys: ['hadoken'] },
        { startFrame: 7, endFrame: 10, allowedMoveKeys: ['shoryuken'] },
      ],
    });
  });

  it('removes a cancel rule from outcome', async () => {
    const component = fixture.componentInstance;
    const updateMoveOutcomeCancels = TestBed.inject(LocalGuideFacadeStore).updateMoveOutcomeCancels as ReturnType<typeof vi.fn>;
    
    await component.removeOutcomeCancel(0, 'onHit', 0);
    
    expect(updateMoveOutcomeCancels).toHaveBeenCalledWith({
      moveKey: 'move-jab',
      phaseIndex: 0,
      outcome: 'onHit',
      cancels: [],
    });
  });

  it('updates a cancel rule in outcome', async () => {
    const component = fixture.componentInstance;
    const updateMoveOutcomeCancels = TestBed.inject(LocalGuideFacadeStore).updateMoveOutcomeCancels as ReturnType<typeof vi.fn>;
    
    const updatedCancel = { startFrame: 3, endFrame: 6, allowedMoveKeys: ['hadoken', 'ryu-punch'] } as PhaseCancelRule;
    await component.updateOutcomeCancel(0, 'onHit', 0, updatedCancel);
    
    expect(updateMoveOutcomeCancels).toHaveBeenCalledWith({
      moveKey: 'move-jab',
      phaseIndex: 0,
      outcome: 'onHit',
      cancels: [updatedCancel],
    });
  });

  it('renders existing cancel rules for outcomes', () => {
    fixture.detectChanges();
    const cancelInputs = fixture.nativeElement.querySelectorAll('input[placeholder="Start frame"]');
    expect(cancelInputs.length).toBeGreaterThan(0);
  });

  it('renders delete button for each cancel rule', () => {
    fixture.detectChanges();
    const deleteButtons = fixture.nativeElement.querySelectorAll('tfn-delete-button');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });
});
