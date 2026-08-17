import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

export interface ComparisonPin {
  key: string;
  label: string;
  relative?: number;
  exact?: number;
  visualY?: number;
}

@Component({
  selector: 'tfn-comparison-axis',
  templateUrl: './comparison-axis.html',
  styleUrl: './comparison-axis.css',
})
export class ComparisonAxis {
  readonly pins = input<ComparisonPin[]>([]);
  readonly positionChange = output<{ key: string; relative: number }>();
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly draggingKey = signal<string | null>(null);
  readonly activeKey = signal<string | null>(null);
  private readonly visualPositions = signal<Record<string, number>>({});

  startDrag(event: PointerEvent, key: string): void {
    event.preventDefault();
    this.activeKey.set(key);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.draggingKey.set(key);
  }

  moveDrag(event: PointerEvent): void {
    const key = this.draggingKey();
    if (!key) return;
    const axis = this.elementRef.nativeElement.querySelector('.comparison-axis__track');
    if (!axis) return;
    const bounds = axis.getBoundingClientRect();
    const relative = clamp(Math.round(((event.clientX - bounds.left) / bounds.width) * 100));
    const visualY = clampPixel(event.clientY - bounds.top, bounds.height);
    this.visualPositions.update(positions => ({ ...positions, [key]: visualY }));
    this.positionChange.emit({ key, relative });
  }

  endDrag(): void {
    this.draggingKey.set(null);
    this.activeKey.set(null);
  }

  @HostListener('document:pointerup')
  endDragOnDocumentPointerUp(): void {
    this.endDrag();
  }

  moveWithKeyboard(event: KeyboardEvent, pin: ComparisonPin): void {
    this.activeKey.set(pin.key);
    const step = event.shiftKey ? 5 : 1;
    let next = normalize(pin.relative);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= step;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    else return;
    event.preventDefault();
    this.positionChange.emit({ key: pin.key, relative: clamp(next) });
  }

  activate(key: string): void {
    this.activeKey.set(key);
  }

  @HostListener('document:pointerdown', ['$event'])
  clearActiveOnOutsidePointer(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest('.comparison-axis__pin')) {
      return;
    }
    this.activeKey.set(null);
  }

  pinTop(pin: ComparisonPin): number {
    return this.visualPositions()[pin.key] ?? pin.visualY ?? 12;
  }
}

function normalize(value: number | undefined): number {
  return clamp(Math.round(value ?? 50));
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function clampPixel(value: number, height: number): number {
  return Math.min(Math.max(value, 0), Math.max(height - 44, 0));
}
