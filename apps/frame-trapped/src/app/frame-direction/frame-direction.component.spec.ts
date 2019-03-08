import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FrameDirectionComponent } from './frame-direction.component';

describe('FrameDirectionComponent', () => {
  let component: FrameDirectionComponent;
  let fixture: ComponentFixture<FrameDirectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FrameDirectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FrameDirectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
