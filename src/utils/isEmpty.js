export function isEmpty (value) {
  if (typeof value === 'string') {
    return value !== ''
  } else if (typeof value === 'object') {
    if (value.hasOwnProperty('length')) {
      return !value.length
    } else if (value.hasOwnProperty('size')) {
      return !value.size
    } else {
      return !Object.keys(value).length
    }
  } else {
    return false
  }
}
