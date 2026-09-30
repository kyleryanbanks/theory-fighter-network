describe('guide home', () => {
  function openGuideHome(): void {
    cy.visit('/');

    cy.get('[data-testid="guide-empty-state"], [data-testid="guide-toolbar"]', {
      timeout: 10000,
    }).then(($state) => {
      if ($state.is('[data-testid="guide-empty-state"]')) {
        cy.get('[data-testid="create-guide"]').click();
        cy.get('[data-testid="game-name"]').type('Cypress Fighter');
        cy.get('[data-testid="game-version"]').type('1.0.0');
        cy.get('[data-testid="create-guide"]').click();
      }
    });

    cy.get('[data-testid="guide-toolbar"]').should('be.visible');
    cy.get('[data-testid="guide-nav-home"]').click();
    cy.get('#home-title').should('contain', 'Cypress Fighter');
  }

  it('opens the selected entity editor from the creation panel', () => {
    openGuideHome();

    cy.get('.create-panel select').first().select('matchup');
    cy.contains('button', 'Open matchup editor').click();

    cy.location('pathname').should('eq', '/matchups');
    cy.get('#matchups-heading').should('contain', 'Matchups');
  });

  it('shows character scope when creating a scoped entity', () => {
    openGuideHome();

    cy.get('.create-panel select').first().select('move');

    cy.contains('label', 'Character scope').should('be.visible');
    cy.get('.create-panel select').should('have.length', 2);
  });

  it('places working memory first and renders it as a block section', () => {
    openGuideHome();

    cy.get('.home-hero').next().should('have.class', 'todo-panel');
    cy.get('.todo-panel').should('have.css', 'display', 'block');
  });

  it('makes Next Evidence span the Home content width', () => {
    openGuideHome();

    cy.get('.task-panel').should('have.css', 'grid-column', '1 / -1');
  });

  it('uses a readable title color on Home and TODO pages', () => {
    openGuideHome();

    cy.get('#home-title').should('have.css', 'color', 'rgb(20, 43, 33)');
    cy.get('[data-testid="guide-nav-todos"]').click();
    cy.get('#todos-title').should('have.css', 'color', 'rgb(20, 43, 33)');
  });

  it('opens and closes the progress estimate dialog', () => {
    openGuideHome();

    cy.get('.estimate-link').first().click();
    cy.get('dialog[open]').should('be.visible');
    cy.get('dialog[open]')
      .should('have.css', 'position', 'fixed')
      .and('have.css', 'z-index', '1000');
    cy.get('dialog[open] h2').should('contain', 'How many');
    cy.contains('button', 'Cancel').click();
    cy.get('dialog[open]').should('not.exist');
  });
});
