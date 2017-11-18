import { visit, } from 'graphql'

export function convertSubscriptionToQuery (ast) {
  return visit(ast, {
    leave (node, key, parent, path, ancestors) {
      return node.kind === 'OperationDefinition' &&
        node.operation === 'subscription'
        ? {
          ...node,
          operation: 'query',
          name: {
            ...node.name,
            value: (node.name.value || '').replace('Subscription', 'Query'),
          },
        }
        : node
    },
  })
}
