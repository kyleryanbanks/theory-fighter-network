import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { FrameViewComponent } from './frame-view/frame-view.component';
import { FrameDirectionComponent } from './frame-direction/frame-direction.component';
import { FrameButtonsComponent } from './frame-buttons/frame-buttons.component';

@NgModule({
  declarations: [AppComponent, FrameViewComponent, FrameDirectionComponent, FrameButtonsComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
