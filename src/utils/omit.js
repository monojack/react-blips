// https://github.com/ramda/ramda/blob/master/source/omit.js
export function omit (keys, obj) {
  const result = {}
  const index = {}
  const len = keys.length
  let idx = 0

  while (idx < len) {
    index[keys[idx]] = 1
    idx += 1
  }

  for (const prop in obj) {
    if (!index.hasOwnProperty(prop)) {
      result[prop] = obj[prop]
    }
  }
  return result
}
