import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { TheoryFighterNetwork } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(TheoryFighterNetwork, config, context);

export default bootstrap;
