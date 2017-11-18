import { getOperationName, } from './getOperationName'

export function mergeOperations (fn) {
  return (acc, curr) => {
    return {
      ...acc,
      [getOperationName(curr)]: fn(curr),
    }
  }
}
