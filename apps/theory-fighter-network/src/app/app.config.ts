import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { featureRoutes } from '@theory-fighter-network/feature';

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(featureRoutes)
  ]
};
