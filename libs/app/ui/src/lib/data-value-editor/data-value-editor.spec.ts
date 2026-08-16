import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DataValue } from '@theory-fighter-network/data';
import { DataValueEditor } from './data-value-editor';

@Component({
  imports: [DataValueEditor],
  template: '<tfn-data-value-editor [value]="value" (valueChange)="value = $event" />',
})
class HostComponent {
  value: DataValue = { exact: 12, relative: 64 };
}

describe('DataValueEditor', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('starts in relative mode and does not show the exact input', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Relative');
    expect(element.querySelector('input[type="range"]')).not.toBeNull();
    expect(element.querySelector('input[data-testid="relative-value"]')).not.toBeNull();
    expect(element.querySelector('input[matinput][type="number"]:not([data-testid="relative-value"])')).toBeNull();
  });

  it('swaps to exact mode without losing either stored value', () => {
    const host = fixture.componentInstance;
    const swap = fixture.nativeElement.querySelector('[data-testid="swap-mode"]');

    swap.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Exact');
    expect(fixture.nativeElement.querySelector('input[type="number"]')).not.toBeNull();
    expect(host.value).toEqual({ exact: 12, relative: 64 });
  });

  it('updates only the active value', () => {
    const host = fixture.componentInstance;
    const slider = fixture.nativeElement.querySelector('input[type="range"]');

    slider.value = '72';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.value).toEqual({ exact: 12, relative: 72 });
  });

  it('updates the relative value when the displayed number is edited', () => {
    const host = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector(
      'input[data-testid="relative-value"]'
    ) as HTMLInputElement;

    input.value = '84';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.value).toEqual({ exact: 12, relative: 84 });
  });
});
