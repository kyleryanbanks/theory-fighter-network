import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { appShellRoutes } from '@tfn/app-shell/feature';

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration(withEventReplay()),
  provideBrowserGlobalErrorListeners(),
  provideRouter(appShellRoutes)
  ]
};
