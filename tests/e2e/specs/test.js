// https://docs.cypress.io/api/introduction/api.html

describe('Basic Tests', () => {
  it('Check stocks list', () => {
    cy.visit('/')
    cy.get('.stocks-list-box').should('be.visible').contains('IET')
    cy.get('.stocks-list-box').contains('Morissette Group')
    cy.get('.stocks-list-box').contains('R$')
  })
  it('Check stocks selection list', () => {
    cy.get('.selection-box').should('be.visible').contains('T')
    cy.get('.selection-box').contains('Todos')
    cy.get('.selection-box').contains('Nenhum')
  })
})
