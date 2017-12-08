import { isNil, } from './isNil'
import { isEmpty, } from './isEmpty'

export function removeEmptyOrNilProps (obj) {
  return Object.entries(obj).reduce((acc, [ key, value, ]) => {
    if (isEmpty(value) || isNil(value)) return acc
    return {
      ...acc,
      [key]: value,
    }
  }, {})
}
