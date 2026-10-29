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

@Component({
  imports: [ProgressMeter],
  template:
    '<tfn-progress-meter label="Team completion" [mappingPending]="true" />',
})
class MappingPendingHost {}

describe('ProgressMeter', () => {
  it('renders progress values, a percentage, and the estimate action', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    const fixture: ComponentFixture<TestHost> =
      TestBed.createComponent(TestHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 / 4');
    expect(fixture.nativeElement.textContent).toContain('50%');
    expect(
      fixture.nativeElement.querySelector('.estimate-link')?.textContent,
    ).toContain('Update estimate');

    const footer = fixture.nativeElement.querySelector('.meter-footer');
    expect(footer.querySelector('.estimate-link')).toBeTruthy();
    expect(footer.querySelector('small').textContent.trim()).toBe('50%');
    expect(getComputedStyle(footer).justifyContent).toBe('space-between');
  });

  it('renders the update estimate action when the total is missing', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(MissingTotalHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.estimate-link')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Update estimate');
  });

  it('renders a pending state instead of an estimate action while mapping is pending', async () => {
    await TestBed.configureTestingModule({
      imports: [MappingPendingHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(MappingPendingHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Progress mapping pending',
    );
    expect(
      fixture.nativeElement.querySelector('[role="progressbar"]'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.estimate-link')).toBeNull();
  });
});
