import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DeleteButton } from './delete-button';

describe('DeleteButton', () => {
  let fixture: ComponentFixture<DeleteButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DeleteButton] }).compileComponents();
    fixture = TestBed.createComponent(DeleteButton);
    fixture.componentRef.setInput('ariaLabel', 'Delete note');
    fixture.detectChanges();
  });

  it('confirms before emitting delete', () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const deleteSpy = vi.fn();
    fixture.componentInstance.delete.subscribe(deleteSpy);

    fixture.nativeElement.querySelector('button').click();

    expect(confirmSpy).toHaveBeenCalledWith(
      'Delete note? This cannot be undone.'
    );
    expect(fixture.nativeElement.querySelector('button').getAttribute('title')).toBe(
      'Delete note'
    );
    expect(deleteSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does not emit when confirmation is cancelled', () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    const deleteSpy = vi.fn();
    fixture.componentInstance.delete.subscribe(deleteSpy);

    fixture.nativeElement.querySelector('button').click();

    expect(deleteSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
