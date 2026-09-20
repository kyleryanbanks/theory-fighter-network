import { bootstrapApplication } from '@angular/platform-browser';
import { TheoryFighterNetwork } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(TheoryFighterNetwork, appConfig).catch((err) =>
  console.error(err)
);
