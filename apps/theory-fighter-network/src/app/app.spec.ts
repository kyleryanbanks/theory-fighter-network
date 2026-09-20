import { TestBed } from '@angular/core/testing';
import { TheoryFighterNetwork } from './app';

describe('TheoryFighterNetwork', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TheoryFighterNetwork],
    }).compileComponents();
  });

  it('should render the Guide feature shell through the router', async () => {
    const fixture = TestBed.createComponent(TheoryFighterNetwork);

    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('tfn-app-shell')).not.toBeNull();
  });
});
