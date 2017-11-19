import isNil from 'ramda/es/isNil'
import when from 'ramda/es/when'
import always from 'ramda/es/always'
import isEmpty from 'ramda/es/isEmpty'
import omit from 'ramda/es/omit'

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
        ...when(isNil, always({}))(data),
      },
      [mutationsKey]: {
        ...(acc[mutationsKey] || {}),
        ...when(isNil, always({}))(res[mutationsKey]),
      },
      [queriesKey]: {
        ...(acc[queriesKey] || {}),
        ...when(isNil, always({}))(res[queriesKey]),
      },
    }
  }, base)

  if (!isEmpty(errorsObject)) {
    update[dataKey] = omit(Object.keys(errorsObject))(update[dataKey])
    update[dataKey]['errors'] = errorsObject
  }

  return update
}
