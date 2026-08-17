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
  private readonly draggingPinHeight = signal(DEFAULT_PIN_HEIGHT);
  readonly activeKey = signal<string | null>(null);
  private readonly visualPositions = signal<Record<string, number>>({});

  startDrag(event: PointerEvent, key: string): void {
    event.preventDefault();
    this.activeKey.set(key);
    const pin = event.currentTarget as HTMLElement;
    pin.setPointerCapture?.(event.pointerId);
    this.draggingPinHeight.set(pin.getBoundingClientRect().height || DEFAULT_PIN_HEIGHT);
    this.draggingKey.set(key);
  }

  moveDrag(event: PointerEvent): void {
    const key = this.draggingKey();
    if (!key) return;
    const axis = this.elementRef.nativeElement.querySelector('.comparison-axis__track');
    if (!axis) return;
    const bounds = axis.getBoundingClientRect();
    const relative = clamp(Math.round(((event.clientX - bounds.left) / bounds.width) * 100));
    const line = axis.querySelector('.comparison-axis__line');
    const lineBounds = line?.getBoundingClientRect();
    const lineTop = lineBounds?.height ? lineBounds.top - bounds.top : bounds.height / 2 - 2;
    const lineHeight = lineBounds?.height || DEFAULT_LINE_HEIGHT;
    const pointerY = event.clientY - bounds.top;
    const withinRangeLineBuffer = pointerY >= lineTop - RANGE_LINE_BUFFER
      && pointerY <= lineTop + lineHeight + RANGE_LINE_BUFFER;
    const visualY = withinRangeLineBuffer
      ? pointerY < lineTop + lineHeight / 2
        ? lineTop - RANGE_LINE_BUFFER - this.draggingPinHeight()
        : lineTop + lineHeight + RANGE_LINE_BUFFER
      : pointerY;
    this.visualPositions.update(positions => ({
      ...positions,
      [key]: clampPixel(visualY, bounds.height),
    }));
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

const RANGE_LINE_BUFFER = 16;
const DEFAULT_PIN_HEIGHT = 32;
const DEFAULT_LINE_HEIGHT = 4;

function clampPixel(value: number, height: number): number {
  return Math.min(Math.max(value, 0), Math.max(height - 44, 0));
}
