import { getOperationName, } from './getOperationName'

export function mergeOperations (fn) {
  return (acc, curr) => {
    const name = getOperationName(curr)
    return {
      ...acc,
      [name]: fn(name),
    }
  }
}
