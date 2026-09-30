import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ProgressMeter } from './progress-meter';

@Component({
  imports: [ProgressMeter],
  template:
    '<tfn-progress-meter [completed]="2" [total]="4" label="Characters" />',
})
class TestHost {}

@Component({
  imports: [ProgressMeter],
  template: '<tfn-progress-meter [completed]="2" label="Characters" />',
})
class MissingTotalHost {}

describe('ProgressMeter', () => {
  it('renders progress values and a percentage', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    const fixture: ComponentFixture<TestHost> =
      TestBed.createComponent(TestHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 / 4');
    expect(fixture.nativeElement.textContent).toContain('50%');
  });

  it('renders an estimate action when the total is missing', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(MissingTotalHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.estimate-link')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Estimate needed');
  });
});
