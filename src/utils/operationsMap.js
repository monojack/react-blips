import { concatAST, } from 'graphql'
import { createDocumentAST, } from './createDocumentAST'
import { isOperationDefinition, } from './isOperationDefinition'
import { isFragmentDefinition, } from './isFragmentDefinition'
import { getOperationName, } from './getOperationName'
import { getOperationType, } from './getOperationType'
import { getRequiredFragments, } from './getRequiredFragments'
import { mapObject, } from './mapObject'
import { isNil, } from './isNil'
import { hasDirectives, } from './hasDirectives'
import { rejectDirectives, } from './rejectDirectives'

const operationsCache = new Map()

function getExecutableOperation (fragments) {
  return function (def) {
    return concatAST([
      createDocumentAST(def),
      ...getRequiredFragments(def).map(f => createDocumentAST(fragments[f])),
    ])
  }
}

export function operationsMap (document) {
  let operations = operationsCache.get(document)
  if (!operations) {
    const { fragment, ...definitionsObject } = document.definitions.reduce(
      (acc, node) => {
        let sanitizedNode
        const [ key, name, ] = isOperationDefinition(node)
          ? hasDirectives([ 'fetch', ], node)
            ? ((sanitizedNode = {
              ...node,
              directives: rejectDirectives([ 'fetch', ], node),
            }),
              [ 'fetch', getOperationName(node), ])
            : [ getOperationType(node), getOperationName(node), ]
          : isFragmentDefinition(node)
            ? [ 'fragment', getOperationName(node), ]
            : [ null, null, ]

        if (isNil(key) || isNil(name)) return acc

        return {
          ...acc,
          [key]: {
            ...(acc[key] || {}),
            [name]: sanitizedNode || node,
          },
        }
      },
      {}
    )

    operations = mapObject(mapObject(getExecutableOperation(fragment)))(
      definitionsObject
    )

    operationsCache.set(document, operations)
  }

  return operations
}
