import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TfnAppShellUi } from './tfn-app-shell-ui';

describe('TfnAppShellUi', () => {
  let component: TfnAppShellUi;
  let fixture: ComponentFixture<TfnAppShellUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfnAppShellUi],
    }).compileComponents();

    fixture = TestBed.createComponent(TfnAppShellUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
