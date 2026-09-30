import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TodoStore } from '@tfn/app-shell/data';
import { TodoQuickAdd } from './todo-quick-add';

@Component({
  imports: [TodoQuickAdd],
  template: '<tfn-todo-quick-add />',
})
class TestHost {}

@Component({
  imports: [TodoQuickAdd],
  template:
    '<tfn-todo-quick-add [characters]="characters" [entities]="entities" />',
})
class TrackingHost {
  characters = [{ semanticKey: 'char-ryu', name: 'Ryu' }];
  entities = [
    {
      entityType: 'character' as const,
      entityKey: 'char-ryu',
      label: 'Character · Ryu',
    },
  ];
}

describe('TodoQuickAdd', () => {
  it('creates a todo from the entered text', async () => {
    const create = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        { provide: TodoStore, useValue: { create, createTracked: create } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<TestHost> =
      TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    input.value = '  Check frame data  ';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('button').click();

    expect(create).toHaveBeenCalledWith('Check frame data');
  });

  it('passes an explicit estimated-count tracking target', async () => {
    const create = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TrackingHost],
      providers: [
        { provide: TodoStore, useValue: { create, createTracked: create } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<TrackingHost> =
      TestBed.createComponent(TrackingHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'Document Ryu moves';
    input.dispatchEvent(new Event('input'));
    const trackingType = fixture.nativeElement.querySelector(
      '[data-testid="todo-tracking-type"]',
    );
    trackingType.value = 'estimated-count';
    trackingType.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const estimate = fixture.nativeElement.querySelector(
      '[data-testid="todo-estimate-key"]',
    );
    estimate.value = 'character-move-count';
    estimate.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const scope = fixture.nativeElement.querySelector(
      '[data-testid="todo-estimate-scope"]',
    );
    scope.value = 'char-ryu';
    scope.dispatchEvent(new Event('change'));
    fixture.nativeElement.querySelector('button').click();

    expect(create).toHaveBeenCalledWith({
      text: 'Document Ryu moves',
      tracking: {
        type: 'estimated-count',
        key: 'character-move-count',
        scopeKey: 'char-ryu',
      },
    });
  });

  it('passes an explicit entity completion target', async () => {
    const create = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TrackingHost],
      providers: [
        { provide: TodoStore, useValue: { create, createTracked: create } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<TrackingHost> =
      TestBed.createComponent(TrackingHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'Review Ryu data';
    input.dispatchEvent(new Event('input'));
    const trackingType = fixture.nativeElement.querySelector(
      '[data-testid="todo-tracking-type"]',
    );
    trackingType.value = 'entity';
    trackingType.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const entity = fixture.nativeElement.querySelector(
      '[data-testid="todo-entity-key"]',
    );
    entity.value = 'character:char-ryu';
    entity.dispatchEvent(new Event('change'));
    fixture.nativeElement.querySelector('button').click();

    expect(create).toHaveBeenCalledWith({
      text: 'Review Ryu data',
      tracking: {
        type: 'entity',
        entityType: 'character',
        entityKey: 'char-ryu',
      },
    });
  });

  it('shows an empty state when no entities are available to track', async () => {
    const create = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        { provide: TodoStore, useValue: { create, createTracked: create } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<TestHost> =
      TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const trackingType = fixture.nativeElement.querySelector(
      '[data-testid="todo-tracking-type"]',
    );
    trackingType.value = 'entity';
    trackingType.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="todo-entity-empty"]'),
    ).toBeTruthy();
  });
});
