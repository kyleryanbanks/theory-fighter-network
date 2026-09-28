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

describe('TodoQuickAdd', () => {
  it('creates a todo from the entered text', async () => {
    const create = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [{ provide: TodoStore, useValue: { create } }],
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
});
