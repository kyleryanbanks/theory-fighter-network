const { nxE2EPreset } = require('@nx/cypress/plugins/cypress-preset');
const { defineConfig } = require('cypress');
module.exports = defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      "cypressDir": "src",
      "webServerCommands": {
        "default": "npx nx run theory-fighter-network:serve",
        "production": "npx nx run theory-fighter-network:serve-static"
      },
      "ciWebServerCommand": "npx nx run theory-fighter-network:serve-static",
      "ciBaseUrl": "http://localhost:4200"
    }),
    baseUrl: 'http://localhost:4200',
  },
});
