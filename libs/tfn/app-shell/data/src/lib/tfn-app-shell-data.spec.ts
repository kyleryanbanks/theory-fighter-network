import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TfnAppShellData } from './tfn-app-shell-data';

describe('TfnAppShellData', () => {
  let component: TfnAppShellData;
  let fixture: ComponentFixture<TfnAppShellData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfnAppShellData],
    }).compileComponents();

    fixture = TestBed.createComponent(TfnAppShellData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
