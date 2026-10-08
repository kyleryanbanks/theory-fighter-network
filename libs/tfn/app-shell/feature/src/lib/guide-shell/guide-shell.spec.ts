import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { FindingDialog } from '../finding-dialog/finding-dialog';
import { GuideShell } from './guide-shell';

describe('GuideShell', () => {
  let fixture: ComponentFixture<GuideShell>;
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockReset();
    await TestBed.configureTestingModule({
      imports: [GuideShell],
      providers: [provideRouter([])],
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();
    fixture = TestBed.createComponent(GuideShell);
    fixture.detectChanges();
  });

  it('opens the finding dialog from the shell action', () => {
    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[aria-label="Add a finding"]');

    expect(button).toBeTruthy();
    button?.click();
    expect(dialog.open).toHaveBeenCalledWith(
      FindingDialog,
      expect.objectContaining({ ariaLabel: 'Add a finding' }),
    );
  });
});
