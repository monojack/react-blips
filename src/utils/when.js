export function when (predicate, transform, data) {
  return predicate(data)
    ? typeof transform === 'function' ? transform(data) : transform
    : data
}
