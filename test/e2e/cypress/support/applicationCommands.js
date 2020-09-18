import 'cypress-wait-until';

let LOCAL_STORAGE_MEMORY = {};
let USER_TOKENS = [];

Cypress.Commands.add('saveLocalStorage', () => {
  Object.keys(localStorage).forEach((key) => {
    LOCAL_STORAGE_MEMORY[key] = localStorage[key];
  });
});

Cypress.Commands.add('restoreLocalStorage', () => {
  Object.keys(LOCAL_STORAGE_MEMORY).forEach((key) => {
    localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key]);
  });
});

Cypress.Commands.add('saveUserToken', (username) => {
  USER_TOKENS[username] = localStorage.getItem('portainer.JWT').slice(1, -1);
});

Cypress.Commands.add('deleteUserToken', (username) => {
  delete USER_TOKENS[username];
});

Cypress.Commands.add('setBrowserToken', (username) => {
  localStorage.setItem('portainer.JWT', USER_TOKENS[username]);
});

Cypress.Commands.add('clearBrowserToken', () => {
  localStorage.removeItem('portainer.JWT');
});

Cypress.Commands.add('clearUserTokens', () => {
  USER_TOKENS = [];
});

Cypress.Commands.add('initAdmin', (username, password) => {
  cy.visit('/#/init/admin');
  // Wait text, meaning page has loaded
  cy.waitUntil(() => cy.contains('Please create the initial administrator user.'));

  if (username != 'admin') {
    cy.get('#username').clear().type(username);
  }
  cy.get('#password').type(password);
  cy.get('#confirm_password').type(password);
  cy.get('[type=submit]').click();
});

Cypress.Commands.add('initEndpoint', () => {
  cy.get('[for=1]').click();
  cy.get('[type=submit]').click();
});

Cypress.Commands.add('selectEndpoint', (Endpoint) => {
  cy.contains(Endpoint).click();
});

Cypress.Commands.add('auth', (location, username, password) => {
  if (location == 'frontend') {
    // Setup auth route to wait for response
    cy.visit('/#/auth');
    cy.get('#username').click();
    cy.get('#username').type(username);
    cy.get('#password').type(password);
    cy.waitUntil(() => cy.get('ng-transclude > .ng-scope:nth-child(1)')).click();
    // Wait until you hit the home screen
    cy.waitUntil(() => cy.contains('Home')).saveUserToken(username);
  } else {
    cy.request({
      method: 'POST',
      url: '/api/auth',
      body: {
        username: username,
        password: password,
      },
    })
      .its('body')
      .then((body) => {
        USER_TOKENS[username] = body.jwt;
      });
  }
});

Cypress.Commands.add('createUser', (location, username, password) => {
  // Setup team route to wait for response
  cy.route('POST', '**/users').as('users');

  if (location == 'frontend') {
    cy.visit('/#!/users');
    cy.waitUntil(() => cy.get('#username')).click();
    cy.get('#username').type(username);
    cy.get('#password').type(password);
    cy.get('#confirm_password').type(password);
    cy.get('.btn-primary').click();
    cy.wait('@users');
  } else {
    cy.request({
      method: 'POST',
      url: '/api/users',
      failOnStatusCode: false,
      auth: {
        bearer: USER_TOKENS['admin'],
      },
      body: {
        username: username,
        password: password,
        role: 2,
      },
    });
  }
});

Cypress.Commands.add('apiDeleteUser', (username) => {
  cy.request({
    method: 'GET',
    url: '/api/users',
    auth: {
      bearer: USER_TOKENS['admin'],
    },
  })
    .its('body')
    .then((response) => {
      let users = response;

      for (var key in users) {
        if (users[key].Username == username) {
          cy.request({
            method: 'DELETE',
            url: '/api/users/' + users[key].Id,
            auth: {
              bearer: USER_TOKENS['admin'],
            },
          });
        }
      }
    });
});

Cypress.Commands.add('apiDeleteUsers', () => {
  cy.request({
    method: 'GET',
    url: '/api/users',
    auth: {
      bearer: USER_TOKENS['admin'],
    },
  })
    .its('body')
    .then((response) => {
      let users = response;

      for (var key in users) {
        if (users[key].Id != 1) {
          cy.request({
            method: 'DELETE',
            url: '/api/users/' + users[key].Id,
            auth: {
              bearer: USER_TOKENS['admin'],
            },
          });
        }
      }
    });
});

Cypress.Commands.add('createTeam', (location, teamName) => {
  if (location == 'frontend') {
    // Setup team route to wait for response
    cy.route('POST', '**/teams').as('teams');

    cy.visit('/#!/teams');
    cy.get('#team_name').click().type(teamName);
    cy.get('.btn-primary').click();
    cy.wait('@teams');
  } else {
    cy.request({
      method: 'POST',
      url: '/api/teams',
      failOnStatusCode: false,
      auth: {
        bearer: USER_TOKENS['admin'],
      },
      body: {
        Name: teamName,
      },
    });
  }
});

Cypress.Commands.add('apiDeleteTeam', (teamName) => {
  cy.request({
    method: 'GET',
    url: '/api/teams',
    auth: {
      bearer: USER_TOKENS['admin'],
    },
  })
    .its('body')
    .then((response) => {
      let teams = response;

      for (var key in teams) {
        if (teams[key].Name == teamName) {
          cy.request({
            method: 'DELETE',
            url: '/api/teams/' + teams[key].Id,
            auth: {
              bearer: USER_TOKENS['admin'],
            },
          });
        }
      }
    });
});

Cypress.Commands.add('apiDeleteTeams', () => {
  cy.request({
    method: 'GET',
    url: '/api/teams',
    auth: {
      bearer: USER_TOKENS['admin'],
    },
  })
    .its('body')
    .then((response) => {
      let teams = response;

      for (var key in teams) {
        cy.request({
          method: 'DELETE',
          url: '/api/teams/' + teams[key].Id,
          auth: {
            bearer: USER_TOKENS['admin'],
          },
        });
      }
    });
});

// Navigate to teams view and assign a user to a team
Cypress.Commands.add('assignToTeam', (username, teamName) => {
  cy.visit('/#!/teams');

  // Click team to browse to related team details view
  cy.clickLink(teamName);

  // Get users table and execute within
  cy.waitUntil(() => cy.contains('.widget', 'Users')).within(() => {
    cy.contains('td', ' ' + username + ' ')
      .children('span')
      .click();
  });
});

// Navigate to the endpoints view and give the user/team access
Cypress.Commands.add('assignAccess', (entityName, entityType, role) => {
  cy.visit('/#!/endpoints');
  // Click Manage Access in endpoint row
  cy.clickLink('Manage access');
  // Click user/team dropdown
  cy.waitUntil(() => cy.get('.multiSelect > .ng-binding')).click();

  // Assign based on entity type
  var type;
  if (entityType == 'team') {
    type = 'fa-users';
  } else {
    type = 'fa-user';
  }
  cy.get('.' + type)
    .parent()
    .contains(entityName)
    .click();

  cy.get('.multiSelect > .ng-binding').click();
  // If a role is provided, click role dropdown and select role
  if (role) {
    cy.get('.form-control:nth-child(1)').select(role);
  }
  // Click Create access button
  cy.get('button[type=submit]').click();
});

Cypress.Commands.add('createStack', (location, endpointType, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/stacks/newstack');
    cy.waitUntil(() => cy.get('#stack_name'))
      .click()
      .type('stack');
    if (endpointType == 'swarm') {
      cy.get('.CodeMirror-scroll')
        .click({ force: true })
        .type("version: '3'")
        .type('{enter}')
        .type('services:')
        .type('{enter}')
        .type('  test:')
        .type('{enter}')
        .type('  image: nginx');
    } else {
      cy.get('.CodeMirror-scroll')
        .click({ force: true })
        .type("version: '2'")
        .type('{enter}')
        .type('services:')
        .type('{enter}')
        .type('  test:')
        .type('{enter}')
        .type('  image: nginx');
    }
    cy.contains('Deploy the stack').click();
    // Wait for redirection to stacks view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Stacks list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('createService', (location, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/services/new');
    cy.waitUntil(() => cy.get('#service_name'))
      .click()
      .type('service');
    cy.get('input[name=image_name]').type('nginx:alpine');
    cy.contains('Create the service').click();
    // Wait for redirection to services view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Service list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('createContainer', (location, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/containers/new');
    cy.waitUntil(() => cy.get('#container_name'))
      .click()
      .type('container');
    cy.get('input[name=image_name]').type('nginx:alpine');
    cy.contains('Deploy the container').click();
    // Wait for redirection to containers view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Container list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('createNetwork', (location, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/networks/new');
    cy.waitUntil(() => cy.get('#network_name'))
      .click()
      .type('network');
    cy.contains('Create the network').click();
    // Wait for redirection to networks view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Network list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('createVolume', (location, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/volumes/new');
    cy.waitUntil(() => cy.get('#volume_name'))
      .click()
      .type('volume');
    cy.contains('Create the volume').click();
    // Wait for redirection to volumes view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Volume list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('createConfig', (location, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/configs/new');
    cy.waitUntil(() => cy.get('#config_name'))
      .click()
      .type('config');
    cy.waitUntil(() => cy.get('.CodeMirror-scroll'))
      .click()
      .type('This is a config');
    cy.get('button').contains('Create config').click();
    // Wait for redirection to configs view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Configs list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('createSecret', (location, waitForRedirection = true) => {
  if (location == 'frontend') {
    cy.visit('/#!/1/docker/secrets/new');
    cy.waitUntil(() => cy.get('#secret_name'))
      .click()
      .type('secret');
    cy.waitUntil(() => cy.get('textarea'))
      .click()
      .type('This is a secret');
    cy.contains('Create the secret').click();
    // Wait for redirection to secrets view
    if (waitForRedirection) cy.waitUntil(() => cy.contains('Secrets list', { timeout: 120000 }));
  }
});

Cypress.Commands.add('modifyResource', (location, endpointType, method, resourceType) => {
  // Dynamically call a custom cypress method on a resource of type 'resourceType'
  cy[method + resourceType](location, endpointType);
});

Cypress.Commands.add('createResources', (location, endpointType) => {
  const requiredResources = {
    swarm: ['Stack', 'Service', 'Container', 'Network', 'Volume', 'Config', 'Secret'],
    standalone: ['Stack', 'Container', 'Network', 'Volume'],
    kubernetes: ['Application'],
  };

  for (var resource in requiredResources[endpointType]) {
    cy.modifyResource(location, endpointType, 'create', requiredResources[endpointType][resource]);
  }
});

Cypress.Commands.add('deleteResources', (location) => {
  cy.deleteStack(location, 'waitForRedirection');
  cy.deleteService(location, 'waitForRedirection');
  cy.deleteContainer(location, 'waitForRedirection');
  cy.deleteNetwork(location, 'waitForRedirection');
  cy.deleteVolume(location, 'waitForRedirection');
  cy.deleteConfig(location, 'waitForRedirection');
  cy.deleteSecret(location, 'waitForRedirection');
});

Cypress.Commands.add('clickLink', (label) => {
  cy.waitUntil(() => cy.contains('a', label)).click();
});
