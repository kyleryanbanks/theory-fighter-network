import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResearchValuesStore } from '@tfn/app-shell/data';
import { describe, expect, it, vi } from 'vitest';
import { EstimateDialog, type EstimateDialogData } from './estimate-dialog';

describe('EstimateDialog', () => {
  let fixture: ComponentFixture<EstimateDialog>;
  const data: EstimateDialogData = {
    kind: 'characters',
    characters: [{ name: 'Ryu', semanticKey: 'character-ryu' }],
  };
  const dialogRef = { close: vi.fn() };
  const research = {
    setExpectedCount: vi.fn(async () => ({ status: 'success' as const })),
    setExpectedCharacterMoves: vi.fn(async () => ({
      status: 'success' as const,
    })),
  };

  beforeEach(async () => {
    data.kind = 'characters';
    data.expectedCount = undefined;
    dialogRef.close.mockClear();
    research.setExpectedCount.mockClear();
    research.setExpectedCharacterMoves.mockClear();

    await TestBed.configureTestingModule({
      imports: [EstimateDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ResearchValuesStore, useValue: research },
      ],
    })
      .overrideProvider(MatDialogRef, { useValue: dialogRef })
      .compileComponents();

    fixture = TestBed.createComponent(EstimateDialog);
    fixture.detectChanges();
  });

  it('saves an expected entity count and closes the dialog', async () => {
    setCount('5');
    submit();
    await fixture.whenStable();

    expect(research.setExpectedCount).toHaveBeenCalledWith({
      kind: 'characters',
      count: 5,
    });
    expect(dialogRef.close).toHaveBeenCalledOnce();
  });

  it('prefills the existing count when updating an estimate', () => {
    data.expectedCount = 7;
    const editFixture = TestBed.createComponent(EstimateDialog);
    editFixture.detectChanges();

    expect(editFixture.nativeElement.querySelector('input').value).toBe('7');
  });

  it('saves character-move estimates for the selected character', async () => {
    data.kind = 'characterMoves';
    fixture.detectChanges();
    setCount('12');
    submit();
    await fixture.whenStable();

    expect(research.setExpectedCharacterMoves).toHaveBeenCalledWith({
      characterKey: 'character-ryu',
      count: 12,
    });
    expect(dialogRef.close).toHaveBeenCalledOnce();
  });

  function setCount(value: string): void {
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
});
