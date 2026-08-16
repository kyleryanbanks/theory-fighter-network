import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { featureRoutes } from '@theory-fighter-network/feature';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(featureRoutes)],
    }).compileComponents();
  });

  it('should render the Guide feature shell through the router', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('tfn-feature')).not.toBeNull();
  });
});
