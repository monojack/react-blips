import { Kind, } from 'graphql'

export function createDocumentAST (ast) {
  if (!ast || ast.kind === Kind.DOCUMENT) {
    return ast
  }

  return {
    kind: 'Document',
    definitions: [ ast, ],
  }
}
