import { concatAST, print as printAST, } from 'graphql'

import { createDocumentAST, } from './createDocumentAST'
import { getRequiredFragments, } from './getRequiredFragments'
import { hasDirectives, } from './hasDirectives'
import { filterDirectives, } from './filterDirectives'
import { getOperationType, } from './getOperationType'

export function makeExecutableOperation (operation, fragments) {
  const fnMap = {
    query: this.query,
    mutation: this.mutate,
    subscription: this.subscribe,
  }

  const fn = fnMap[getOperationType(operation)]

  const requiredFragments = getRequiredFragments(operation).map(name =>
    createDocumentAST(fragments[name])
  )

  const isForAPI = hasDirectives([ 'api', ], operation)

  const sanitizedOperation = isForAPI
    ? {
      ...operation,
      directives: filterDirectives([ 'api', ], operation),
    }
    : operation

  const source = printAST(
    concatAST([ ...requiredFragments, createDocumentAST(sanitizedOperation), ])
  )

  return isForAPI ? this.graphql(source) : fn(source)
}
