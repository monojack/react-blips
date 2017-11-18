import path from 'ramda/es/path'

export const getOperationName = path([ 'definitions', 0, 'name', 'value', ])
