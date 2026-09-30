describe('guide home', () => {
  function openGuideHome(): void {
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
    cy.get('[data-testid="create-guide"]').click({ force: true });
    cy.get('[data-testid="game-name"]').type('Cypress Fighter');
    cy.get('[data-testid="game-version"]').type('1.0.0');
    cy.get('[data-testid="create-guide"]').click();
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

  it('replaces Next Evidence with Todos and can populate evidence TODOs', () => {
    openGuideHome();

    cy.get('.task-panel').should('not.exist');
    cy.get('[data-testid="populate-todos"]').click();
    cy.get('[data-testid="populate-todos"]').click();
    cy.get('[data-testid="guide-nav-todos"]').click();
    cy.get('.todo-row').should('have.length', 4);
  });

  it('updates an estimate from a tracked TODO and shows its maximum', () => {
    openGuideHome();

    cy.get('[data-testid="populate-todos"]').click();
    cy.get('[data-testid="guide-nav-todos"]').click();
    cy.contains('.todo-row', 'Add the expected Characters').as('trackedTodo');
    cy.get('@trackedTodo').find('.estimate-link').click();
    cy.get('dialog[open] input[type="number"]').type('4');
    cy.contains('dialog[open] button', 'Save estimate').click();
    cy.get('.todo-row')
      .filter(':has(.tracking-label)')
      .first()
      .find('.todo-tracking-progress strong')
      .should('have.text', '0 / 4');
    cy.get('[data-testid="guide-nav-home"]').click();
    cy.get('.todo-panel').should('contain', 'Working memory');
    cy.get('[data-testid="guide-nav-todos"]').click();
    cy.contains('.todo-row', 'Add the expected Characters')
      .find('.todo-tracking-progress strong')
      .should('have.text', '0 / 4');
  });

  it('uses a readable title color on Home and TODO pages', () => {
    openGuideHome();

    cy.get('#home-title').should('have.css', 'color', 'rgb(20, 43, 33)');
    cy.get('[data-testid="guide-nav-todos"]').click();
    cy.get('#todos-title').should('have.css', 'color', 'rgb(20, 43, 33)');
  });
});
