import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GuideNav } from './guide-nav';

describe('GuideNav', () => {
  let fixture: ComponentFixture<GuideNav>;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [GuideNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GuideNav);
    fixture.detectChanges();
  });

  it('renders a nav link for each entity section', () => {
    const links = fixture.nativeElement.querySelectorAll('.nav-list a');
    expect(links).toHaveLength(8);
    expect(fixture.nativeElement.textContent).toContain('Game');
    expect(fixture.nativeElement.textContent).toContain('Stages');
    expect(fixture.nativeElement.textContent).toContain('Characters');
    expect(fixture.nativeElement.textContent).toContain('Moves');
    expect(fixture.nativeElement.textContent).toContain('Move Comparison');
    expect(fixture.nativeElement.textContent).toContain('Sequences');
    expect(fixture.nativeElement.textContent).toContain('Teams');
    expect(fixture.nativeElement.textContent).toContain('Matchups');
  });

  it('starts expanded showing icon and label', () => {
    expect(fixture.componentInstance.mode()).toBe('expanded');
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-nav-game"] .nav-label')
    ).not.toBeNull();
  });

  it('cycles expanded -> compact -> expanded on toggle clicks', () => {
    const toggle = () =>
      fixture.nativeElement
        .querySelector('[data-testid="guide-nav-toggle"]')
        ?.click();

    toggle();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('compact');
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-nav-game"] .nav-label')
    ).toBeNull();

    toggle();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('expanded');
    expect(
      fixture.nativeElement.querySelector('[data-testid="guide-nav-game"] .nav-label')
    ).not.toBeNull();
  });

  it('persists the selected mode across instances via localStorage', () => {
    fixture.nativeElement
      .querySelector('[data-testid="guide-nav-toggle"]')
      .click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('compact');

    const secondFixture = TestBed.createComponent(GuideNav);
    secondFixture.detectChanges();

    expect(secondFixture.componentInstance.mode()).toBe('compact');
  });
});
