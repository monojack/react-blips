import { when, } from './when'
import { isEmpty, } from './isEmpty'

function mergeType (type) {
  return function (acc, curr) {
    const obj = {
      [type]: {
        ...(acc[type] || {}),
        ...(curr[type] || {}),
      },
    }
    return when(isEmpty(obj[type]), {}, obj)
  }
}

export function mergeOperations (acc, curr) {
  const query = mergeType('query')(acc, curr)
  const mutation = mergeType('mutation')(acc, curr)
  const subscription = mergeType('subscription')(acc, curr)
  const fetch = mergeType('fetch')(acc, curr)
  return {
    ...acc,
    ...query,
    ...mutation,
    ...subscription,
    ...fetch,
  }
}
