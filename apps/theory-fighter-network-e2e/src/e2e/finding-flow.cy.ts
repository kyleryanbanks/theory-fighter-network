const createDestinations = [
  { type: 'character', path: '/characters', heading: '#characters-heading' },
  { type: 'move', path: '/moves', heading: '#moves-heading' },
  { type: 'stage', path: '/stages', heading: '#stages-heading' },
  { type: 'sequence', path: '/sequences', heading: '#sequences-heading' },
  { type: 'team', path: '/teams', heading: '#teams-heading' },
  { type: 'matchup', path: '/matchups', heading: '#matchups-heading' },
];

function openGuide(): void {
  cy.visit('/');

  cy.get('[data-testid="guide-empty-state"], [data-testid="guide-toolbar"]', {
    timeout: 10000,
  }).then(($state) => {
    if ($state.is('[data-testid="guide-toolbar"]')) {
      cy.get('[data-testid="close-guide"]').click({ force: true });
    }
  });

  cy.get('[data-testid="guide-empty-state"]', { timeout: 10000 }).should(
    'be.visible',
  );
  cy.get('.backdrop').should('not.exist');
  cy.get('[aria-label="Add a finding"]').should('not.exist');
  cy.get('[data-testid="create-guide"]').click({ force: true });
  cy.get('[data-testid="game-name"]').type('Finding Cypress Fighter');
  cy.get('[data-testid="game-version"]').type('1.0.0');
  cy.get('[data-testid="create-guide"]').click();
  cy.get('[data-testid="guide-toolbar"]').should('be.visible');
  cy.get('[data-testid="guide-nav-home"]').click();
  cy.get('#home-title').should('contain', 'Finding Cypress Fighter');
  cy.get('[aria-label="Add a finding"]').should('be.visible');
}

function openFinding(): void {
  cy.get('[aria-label="Add a finding"]').click();
  cy.get('h2[mat-dialog-title]').should('contain.text', 'What did you find?');
}

function createCharacter(name: string): void {
  openFinding();
  cy.get('[data-testid="finding-entity-type"]').select('character');
  cy.get('[data-testid="finding-continue"]').click();
  cy.get('[data-testid="character-name"]').type(name);
  cy.get('[data-testid="add-character"]').click();
  cy.contains('[data-testid="character-entry"]', name).should('be.visible');
}

describe('quick finding flow', () => {
  it('shows the FAB only in an active Guide and opens a cancelable dialog', () => {
    cy.visit('/');
    cy.get('[data-testid="guide-empty-state"]', { timeout: 10000 }).should(
      'be.visible',
    );
    cy.get('[aria-label="Add a finding"]').should('not.exist');

    openGuide();
    openFinding();
    cy.get('[data-testid="finding-mode-create"]').should('be.visible');
    cy.get('[data-testid="finding-mode-update"]').should('be.visible');
    cy.get('[data-testid="finding-mode-note"]').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.get('h2[mat-dialog-title]').should('not.exist');
  });

  it('hands off every supported entity type to its existing editor', () => {
    openGuide();

    for (const destination of createDestinations) {
      openFinding();
      cy.get('[data-testid="finding-entity-type"] option').should(
        'have.length',
        createDestinations.length,
      );
      cy.get('[data-testid="finding-entity-type"]').select(destination.type);
      cy.get('[data-testid="finding-continue"]').click();
      cy.location('pathname').should('eq', destination.path);
      cy.get(destination.heading).should('be.visible');
      cy.get('[data-testid="guide-nav-home"]').click();
      cy.get('#home-title').should('contain', 'Finding Cypress Fighter');
    }
  });

  it('preserves Character scope through Move and Sequence creation', () => {
    openGuide();
    createCharacter('Ryu');

    openFinding();
    cy.get('[data-testid="finding-entity-type"]').select('move');
    cy.get('[data-testid="finding-character-scope"]').select('Ryu');
    cy.get('[data-testid="finding-continue"]').click();
    cy.location('pathname').should('eq', '/moves');
    cy.location('search').should('contain', 'characterKey=');
    cy.get('[data-testid="move-scope"]').should('contain.text', 'Ryu');

    cy.get('[data-testid="move-name"]').type('Jab');
    cy.get('[data-testid="add-move"]').click();
    cy.contains('[data-testid="move-entry"]', 'Jab').should('be.visible');

    openFinding();
    cy.get('[data-testid="finding-entity-type"]').select('sequence');
    cy.get('[data-testid="finding-character-scope"]').select('Ryu');
    cy.get('[data-testid="finding-continue"]').click();
    cy.location('pathname').should('eq', '/sequences');
    cy.location('search').should('contain', 'characterKey=');
    cy.get('[data-testid="sequence-scope"]').should('contain.text', 'Ryu');
    cy.contains('[data-testid="move-tile"]', 'Jab').click();
    cy.get('[data-testid="add-sequence"]').click();
    cy.get('[data-testid="sequence-entry"]').should('have.length', 1);
  });

  it('updates a selected entity and saves a quick finding as its note', () => {
    openGuide();
    createCharacter('Ryu');

    openFinding();
    cy.get('[data-testid="finding-mode-note"]').click();
    cy.get('[data-testid="finding-entity-type"]').select('character');
    cy.get('[data-testid="finding-entity"]').select('Ryu');
    cy.get('[data-testid="finding-note"]').type(
      'Punish window confirmed in training mode.',
    );
    cy.get('[data-testid="finding-continue"]').click();
    cy.get('h2[mat-dialog-title]').should('not.exist');

    openFinding();
    cy.get('[data-testid="finding-mode-update"]').click();
    cy.get('[data-testid="finding-entity-type"]').select('character');
    cy.get('[data-testid="finding-entity"]').select('Ryu');
    cy.get('[data-testid="finding-continue"]').click();
    cy.location('pathname').should('match', /^\/characters\//);
    cy.contains('summary', 'Notes').click();
    cy.contains(
      '[data-testid="note-item"]',
      'Punish window confirmed in training mode.',
    ).should('be.visible');
  });

  it('keeps Add finding disabled until an entity and non-empty note are selected', () => {
    openGuide();
    createCharacter('Ryu');

    openFinding();
    cy.get('[data-testid="finding-mode-note"]').click();
    cy.get('[data-testid="finding-entity-type"]').select('character');
    cy.get('[data-testid="finding-continue"]').should('be.disabled');
    cy.get('[data-testid="finding-entity"]').select('Ryu');
    cy.get('[data-testid="finding-continue"]').should('be.disabled');
    cy.get('[data-testid="finding-note"]').type('Verified.');
    cy.get('[data-testid="finding-continue"]').should('be.enabled');
  });
});
