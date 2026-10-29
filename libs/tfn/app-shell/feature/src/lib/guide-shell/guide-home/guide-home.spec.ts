import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import {
  GuideProgressStore,
  LocalGuideFacadeStore,
  TodoStore,
} from '@tfn/app-shell/data';
import { describe, expect, it, vi } from 'vitest';
import { EstimateDialog } from './estimate-dialog';
import { GuideHome } from './guide-home';

describe('GuideHome', () => {
  let fixture: ComponentFixture<GuideHome>;
  const dialog = { open: vi.fn() };
  const guide = signal({
    entities: {
      game: { name: 'Test Game', version: '1.0' },
      characters: [{ name: 'Ryu', semanticKey: 'character-ryu' }],
      moves: [],
      stages: [],
      matchups: [],
    },
  });
  const taskProgress = signal([
    {
      key: 'roster',
      title: 'Document the character roster',
      steps: [
        {
          key: 'character-count',
          title: 'Add the expected Characters',
          progress: { completed: 0, total: 7 },
        },
        {
          key: 'character-move-count',
          title: "Add each Character's expected Moves",
          progress: { completed: 0, total: undefined },
        },
      ],
    },
  ]);

  beforeEach(async () => {
    dialog.open.mockClear();
    guide.set({
      entities: {
        game: { name: 'Test Game', version: '1.0' },
        characters: [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        moves: [],
        stages: [],
        matchups: [],
      },
    });
    taskProgress.set([
      {
        key: 'roster',
        title: 'Document the character roster',
        steps: [
          {
            key: 'character-count',
            title: 'Add the expected Characters',
            progress: { completed: 0, total: 7 },
          },
          {
            key: 'character-move-count',
            title: "Add each Character's expected Moves",
            progress: { completed: 0, total: undefined },
          },
        ],
      },
    ]);
    await TestBed.configureTestingModule({
      imports: [GuideHome],
      providers: [
        provideRouter([]),
        { provide: LocalGuideFacadeStore, useValue: { guide } },
        { provide: GuideProgressStore, useValue: { taskProgress } },
        {
          provide: TodoStore,
          useValue: { create: vi.fn(), createTracked: vi.fn() },
        },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();

    fixture = TestBed.createComponent(GuideHome);
    fixture.detectChanges();
  });

  it('opens the estimate form with Angular Material MatDialog', () => {
    fixture.nativeElement.querySelector('.estimate-link').click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledOnce();
    expect(dialog.open).toHaveBeenCalledWith(
      EstimateDialog,
      expect.objectContaining({
        data: {
          kind: 'characters',
          characters: [{ name: 'Ryu', semanticKey: 'character-ryu' }],
          expectedCount: 7,
        },
        ariaModal: true,
        ariaLabelledBy: 'estimate-title',
        width: 'min(28rem, calc(100vw - 2rem))',
      }),
    );
  });
});
