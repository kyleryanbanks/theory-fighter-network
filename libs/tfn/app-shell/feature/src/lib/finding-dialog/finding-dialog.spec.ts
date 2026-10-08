import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore, type LocalGuide } from '@tfn/app-shell/data';
import { describe, expect, it, vi } from 'vitest';
import { FindingDialog } from './finding-dialog';

const guide = {
  guide: { gameKey: 'test-game' },
  entities: {
    game: { semanticKey: 'test-game', name: 'Test Fighter' },
    stages: [{ semanticKey: 'arena-stage', name: 'Arena' }],
    stageZones: [],
    characters: [{ semanticKey: 'ryu', name: 'Ryu' }],
    teams: [],
    moves: [{ semanticKey: 'hadoken', name: 'Hadoken' }],
    sequences: [],
    projectiles: [],
    matchups: [],
  },
} as unknown as LocalGuide;

describe('FindingDialog', () => {
  let fixture: ComponentFixture<FindingDialog>;
  const dialogRef = { close: vi.fn() };
  const facade = {
    guide: signal<LocalGuide | undefined>(guide),
    addEntityNote: vi.fn().mockResolvedValue({ status: 'success' }),
  };
  let router: Router;

  beforeEach(async () => {
    dialogRef.close.mockReset();
    facade.addEntityNote.mockReset();
    facade.addEntityNote.mockResolvedValue({ status: 'success' });

    await TestBed.configureTestingModule({
      imports: [FindingDialog],
      providers: [
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: LocalGuideFacadeStore, useValue: facade },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FindingDialog);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('routes an update to the selected Move detail', async () => {
    const updateMode: HTMLButtonElement | null =
      fixture.nativeElement.querySelector(
        '[data-testid="finding-mode-update"]',
      );
    expect(updateMode).toBeTruthy();
    updateMode?.click();
    fixture.detectChanges();

    select('[data-testid="finding-entity-type"]', 'move');
    select('[data-testid="finding-entity"]', 'hadoken');
    click('[data-testid="finding-continue"]');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/moves/hadoken');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('keeps a selected Stage as the update destination', () => {
    const updateMode: HTMLButtonElement | null =
      fixture.nativeElement.querySelector(
        '[data-testid="finding-mode-update"]',
      );
    updateMode?.click();
    fixture.detectChanges();
    select('[data-testid="finding-entity-type"]', 'stage');
    select('[data-testid="finding-entity"]', 'arena-stage');
    click('[data-testid="finding-continue"]');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/stages/arena-stage');
  });

  it('adds a quick note to the selected entity', async () => {
    const noteMode: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-testid="finding-mode-note"]');
    expect(noteMode).toBeTruthy();
    noteMode?.click();
    fixture.detectChanges();

    select('[data-testid="finding-entity-type"]', 'character');
    select('[data-testid="finding-entity"]', 'ryu');
    const note: HTMLTextAreaElement | null =
      fixture.nativeElement.querySelector('[data-testid="finding-note"]');
    expect(note).toBeTruthy();
    if (!note) return;
    note.value = 'Punish window confirmed';
    note.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click('[data-testid="finding-continue"]');

    await fixture.whenStable();
    expect(facade.addEntityNote).toHaveBeenCalledWith({
      entityType: 'character',
      entityKey: 'ryu',
      text: 'Punish window confirmed',
    });
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('does not allow an empty note to be submitted', () => {
    const noteMode: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-testid="finding-mode-note"]');
    noteMode?.click();
    fixture.detectChanges();
    select('[data-testid="finding-entity-type"]', 'character');
    select('[data-testid="finding-entity"]', 'ryu');

    const submitButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-testid="finding-continue"]');
    expect(submitButton?.disabled).toBe(true);
    expect(facade.addEntityNote).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows an error when note saving fails', async () => {
    facade.addEntityNote.mockResolvedValue({
      status: 'error',
      error: new Error('Guide is unavailable.'),
    });
    const noteMode: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-testid="finding-mode-note"]');
    noteMode?.click();
    fixture.detectChanges();
    select('[data-testid="finding-entity-type"]', 'character');
    select('[data-testid="finding-entity"]', 'ryu');

    const note: HTMLTextAreaElement | null =
      fixture.nativeElement.querySelector('[data-testid="finding-note"]');
    if (!note) return;
    note.value = 'Confirmed';
    note.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click('[data-testid="finding-continue"]');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.addEntityNote).toHaveBeenCalledWith({
      entityType: 'character',
      entityKey: 'ryu',
      text: 'Confirmed',
    });
    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('Guide is unavailable.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('keeps selected Character scope when opening Move creation', () => {
    select('[data-testid="finding-entity-type"]', 'move');
    select('[data-testid="finding-character-scope"]', 'ryu');
    click('[data-testid="finding-continue"]');

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/moves?characterKey=ryu',
    );
  });

  function select(selector: string, value: string): void {
    const element: HTMLSelectElement | null =
      fixture.nativeElement.querySelector(selector);
    expect(element).toBeTruthy();
    if (!element) return;
    element.value = value;
    element.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function click(selector: string): void {
    const element: HTMLButtonElement | null =
      fixture.nativeElement.querySelector(selector);
    expect(element).toBeTruthy();
    element?.click();
    fixture.detectChanges();
  }
});
