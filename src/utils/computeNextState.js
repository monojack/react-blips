import isNil from 'ramda/es/isNil'
import when from 'ramda/es/when'
import always from 'ramda/es/always'
import isEmpty from 'ramda/es/isEmpty'

import { mergeErrors, } from './mergeErrors'

export function computeNextState (list, { dataKey, queriesKey, mutationsKey, }) {
  let errorsObject = {}

  const update = list.reduce(
    (acc, { errors, data, ...res }) => {
      errors && (errorsObject = mergeErrors(errors)(errorsObject))
      return {
        ...acc,
        [dataKey]: {
          ...(acc[dataKey] || {}),
          ...when(isNil, always({}))(data),
        },
        [mutationsKey]: res[mutationsKey],
        [queriesKey]: res[queriesKey],
      }
    },
    { [dataKey]: { loading: false, }, }
  )
  !isEmpty(errorsObject) && (update[dataKey].errors = errorsObject)

  return update
}
