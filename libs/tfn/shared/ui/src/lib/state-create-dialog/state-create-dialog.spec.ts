import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  StateCreateDialogComponent,
  StateCreateDialogData,
} from './state-create-dialog';

describe('StateCreateDialogComponent', () => {
  let fixture: ComponentFixture<StateCreateDialogComponent>;
  let loader: HarnessLoader;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  const data: StateCreateDialogData = {
    existingStates: {
      Character: { 'on-ground': { name: 'On Ground', type: 'boolean' } },
    },
    defaultCategory: '',
    defaultName: '',
  };

  beforeEach(async () => {
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [StateCreateDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StateCreateDialogComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('renders a close icon button in the dialog title', () => {
    const closeButton = fixture.nativeElement.querySelector(
      '[mat-dialog-title] button[aria-label="Close dialog"]'
    );
    expect(closeButton).toBeTruthy();
  });

  it('save button is disabled when category and name are empty', async () => {
    const saveButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Save' })
    );
    expect(await saveButton.isDisabled()).toBe(true);
  });

  it('save button enables when category and name are both filled', async () => {
    fixture.componentInstance.model.update((m) => ({ ...m, category: 'Attack', name: 'Armor' }));
    fixture.detectChanges();

    const saveButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Save' })
    );
    expect(await saveButton.isDisabled()).toBe(false);
  });

  it('save button stays disabled when name would be a duplicate', async () => {
    fixture.componentInstance.model.update((m) => ({ ...m, category: 'Character', name: 'On Ground' }));
    fixture.detectChanges();

    const saveButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Save' })
    );
    expect(await saveButton.isDisabled()).toBe(true);
  });

  it('selectCategory updates the model category', () => {
    fixture.componentInstance.selectCategory('Character');
    fixture.detectChanges();

    expect(fixture.componentInstance.model().category).toBe('Character');
  });

  it('form is valid when both fields are filled and name is not a duplicate', () => {
    fixture.componentInstance.model.update((m) => ({ ...m, category: 'Attack', name: 'Armor Crush' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.stateForm().invalid()).toBe(false);
  });

  it('cancel closes the dialog with undefined', () => {
    fixture.componentInstance.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});


