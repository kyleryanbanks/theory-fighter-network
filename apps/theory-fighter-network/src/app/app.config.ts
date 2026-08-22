import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { featureRoutes } from '@tfn/app-shell/feature';

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(featureRoutes)
  ]
};
