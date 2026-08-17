import { Component } from '@angular/core';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComparisonAxis, ComparisonPin } from './comparison-axis';

@Component({
  imports: [ComparisonAxis],
  template: '<tfn-comparison-axis [pins]="pins()" (positionChange)="changes.push($event)" />',
})
class HostComponent {
  pins = signal<ComparisonPin[]>([
    { key: 'move-a', label: 'Move A', relative: 25 },
    { key: 'move-b', label: 'Move B', relative: 70 },
  ]);
  changes: Array<{ key: string; relative: number }> = [];
}

describe('ComparisonAxis', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders one accessible slider pin per comparison value', () => {
    const pins = fixture.nativeElement.querySelectorAll('[role="slider"]');
    const markers = fixture.nativeElement.querySelectorAll('.comparison-axis__marker');

    expect(pins).toHaveLength(2);
    expect(markers).toHaveLength(2);
    expect(markers[0].textContent).toContain('25');
    expect(pins[0].getAttribute('aria-valuenow')).toBe('25');
    expect(pins[0].getAttribute('aria-label')).toContain('Move A');
  });

  it('moves a pin with keyboard controls', () => {
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]');

    pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toEqual([{ key: 'move-a', relative: 26 }]);
  });

  it('clamps keyboard movement to the axis bounds', () => {
    fixture.componentInstance.changes = [];
    fixture.componentInstance.pins.set([{ key: 'move-a', label: 'Move A', relative: 0 }]);
    fixture.detectChanges();
    fixture.componentInstance.changes = [];
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]');

    pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(fixture.componentInstance.changes).toEqual([{ key: 'move-a', relative: 0 }]);
  });

  it('moves a pin with a pointer position on the track', () => {
    fixture.componentInstance.changes = [];
    const track = fixture.nativeElement.querySelector('.comparison-axis__track') as HTMLElement;
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 100 }),
    });
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]');

    pin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 25 }));
    track.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60 }));

    expect(fixture.componentInstance.changes.at(-1)).toEqual({ key: 'move-a', relative: 60 });
  });

  it('aligns a pin bottom with the pointer when dragged above the buffer', () => {
    const track = fixture.nativeElement.querySelector('.comparison-axis__track') as HTMLElement;
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 240 }),
    });
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]') as HTMLElement;

    pin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 25 }));
    track.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 90 }));
    fixture.detectChanges();

    expect(pin.style.top).toBe('58px');
  });

  it('places a pin above the 16px range-line buffer when dragged inside it', () => {
    const track = fixture.nativeElement.querySelector('.comparison-axis__track') as HTMLElement;
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 240 }),
    });
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]') as HTMLElement;

    pin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 25 }));
    track.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 110 }));
    fixture.detectChanges();

    expect(pin.style.top).toBe('70px');
  });

  it('places a pin below the 16px range-line buffer when dragged below the line', () => {
    const track = fixture.nativeElement.querySelector('.comparison-axis__track') as HTMLElement;
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 240 }),
    });
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]') as HTMLElement;

    pin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 25 }));
    track.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 130 }));
    fixture.detectChanges();

    expect(pin.style.top).toBe('138px');
  });

  it('keeps a pin at its pointer position when dragged below the buffer', () => {
    const track = fixture.nativeElement.querySelector('.comparison-axis__track') as HTMLElement;
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 240 }),
    });
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]') as HTMLElement;

    pin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 25 }));
    track.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 150 }));
    fixture.detectChanges();

    expect(pin.style.top).toBe('150px');
  });

  it('raises the active pin and its axis marker together', () => {
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]');
    pin.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(pin.classList.contains('comparison-axis__pin--active')).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.comparison-axis__marker--active')
    ).not.toBeNull();
  });

  it('clears the active pin when the user clicks away', () => {
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]');
    pin.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    document.dispatchEvent(new PointerEvent('pointerdown'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.comparison-axis__pin--active')).toBeNull();
  });

  it('clears the active pin on pointer release', () => {
    const pin = fixture.nativeElement.querySelector('[data-testid="axis-pin-move-a"]');
    pin.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.comparison-axis__pin--active')).not.toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.comparison-axis__pin--active')).toBeNull();
  });
});
