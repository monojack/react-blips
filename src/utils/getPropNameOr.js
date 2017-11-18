import isNil from 'ramda/es/isNil'

export function getPropNameOr (key) {
  return config => {
    let name = key

    if (!isNil(config.name)) {
      if (typeof config.name === 'object') {
        name = config.name[key] || key
      } else if (typeof config.name === 'string') {
        name = key === 'data' ? config.name : key
      }
    }

    return name
  }
}
