import { isNil, } from './isNil'
import { when, } from './when'
import { isEmpty, } from './isEmpty'
import { omit, } from './omit'
import { removeEmptyOrNilProps, } from './removeEmptyOrNilProps'

import { mergeErrors, } from './mergeErrors'

export function computeNextState (
  list,
  { dataKey, queriesKey, mutationsKey, },
  base = {}
) {
  let errorsObject = {}

  let update = list.reduce((acc, { errors, data, ...res }) => {
    errors && (errorsObject = mergeErrors(errors)(errorsObject))
    return {
      ...acc,
      [dataKey]: {
        ...(acc[dataKey] || {}),
        ...when(isNil, {}, data),
      },
      [mutationsKey]: {
        ...(acc[mutationsKey] || {}),
        ...when(isNil, {}, res[mutationsKey]),
      },
      [queriesKey]: {
        ...(acc[queriesKey] || {}),
        ...when(isNil, {}, res[queriesKey]),
      },
    }
  }, base)

  if (!isEmpty(errorsObject)) {
    update[dataKey] = omit(Object.keys(errorsObject), update[dataKey])
    update[dataKey]['errors'] = errorsObject
  }

  return removeEmptyOrNilProps(update)
}
