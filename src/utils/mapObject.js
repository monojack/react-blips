export function mapObject (transform) {
  return function (obj) {
    return Object.entries(obj).reduce(
      (acc, [ key, value, ]) => ({
        ...acc,
        [key]: transform(value),
      }),
      {}
    )
  }
}
