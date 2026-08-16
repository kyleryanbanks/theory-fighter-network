import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
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
  const addMovePhase = vi.fn(async () => ({ status: 'success' }));
  const removeMovePhase = vi.fn(async () => ({ status: 'success' }));

  beforeEach(async () => {
    updateMovePhaseDuration.mockClear();
    updateMoveOutcomeDataValue.mockClear();
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
          useValue: { guide: () => ({ entities: { moves: [move] } }), updateMovePhaseDuration, updateMoveOutcomeDataValue, addMovePhase, removeMovePhase },
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
});
