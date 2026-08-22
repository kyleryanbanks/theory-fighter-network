import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TfnAppShellFeature } from './tfn-app-shell-feature';

describe('TfnAppShellFeature', () => {
  let component: TfnAppShellFeature;
  let fixture: ComponentFixture<TfnAppShellFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfnAppShellFeature],
    }).compileComponents();

    fixture = TestBed.createComponent(TfnAppShellFeature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
