// Role Based Access Control
context('Standard RBAC', () => {
  before(() => {
    // Start cypress server for intercepting & waiting on XHR calls
    cy.server();
    cy.visit('/');
  });

  after(() => {});

  describe('Endpoint Admin', function () {
    beforeEach(() => {
      cy.visit('/');
      cy.auth('frontend', 'admin', 'portainer');
    });

    afterEach(() => {
      // Cleanup remaining users and teams
      cy.apiDeleteUsers();
      cy.apiDeleteTeams();
      // Clean Tokens
      cy.clearUserTokens();
    });

    it('User assigned as endpoint-admin against an endpoint', function () {
      // Create and assign user as the administrator
      cy.createUser('frontend', 'adam', 'portainer');
      cy.createTeam('frontend', 'devs');
      cy.assignToTeam('adam', 'devs');
      cy.assignAccess('devs', 'team');
      cy.clearBrowserToken();

      // Login and create, read, update, delete resources as user
      cy.visit('/');
      cy.auth('frontend', 'adam', 'portainer');
      cy.selectEndpoint('local');

      // create resources
      cy.createResources('frontend');
      // modify resources
      // delete resources
      // cy.deleteResources();
    });
  });
});
